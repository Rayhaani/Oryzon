/* ============================================================
   NEXUS OVERLAY ROUTER — overlay-router.js (v1.0 — PHASE 1)
   ------------------------------------------------------------
   DOM-caching overlay system. Pages listed in OVERLAY_PAGES open
   as a cached, reusable overlay ON TOP of whichever page you're
   on (chats.html), instead of router.js's normal fetch + full
   #page-content swap.

   - 1st open of a given "?group=slug" -> fetch once, build the
     DOM, load its scripts/styles once, cache it in memory.
   - Reopening it later (or switching to a DIFFERENT cached
     group) -> instant show, ZERO network requests.

   Why detach-and-reattach instead of just display:none —
   group.js uses document.getElementById(...) everywhere (not
   scoped queries). If two cached group overlays stayed in the
   DOM at once, they'd have DUPLICATE ids and getElementById
   would grab the wrong one. So the INACTIVE overlay is fully
   .remove()'d from the document (but kept alive in the `cache`
   Map, so its state/DOM never gets rebuilt) and the one being
   opened is simply re-appended — still zero network, zero
   re-parsing, only its init() JS logic re-runs (same lifecycle
   contract group.js already has today).

   Does NOT edit router.js's existing logic — only reads 4 small
   helper functions that router.js exposes additively (see the
   router.js patch). Click/back interception happens in the
   CAPTURE phase, BEFORE router.js's own (bubble-phase) listeners
   ever see the event, so router.js's normal SPA nav is 100%
   untouched for every other page.

   Direct/native loads of group.html (no chats.html involved) are
   completely unaffected — group.js's own registerPage()/
   initPage() keeps working exactly as it does today.

   ⚠ KNOWN GAP (Phase 1 scope): avatar-tap "Message"/"Info"
   buttons (apvMessageAction/apvInfoAction in chats.js) call
   window.NexusRouter.navigateTo() directly, not via a click on
   [data-spa-link] — so they still use the OLD full-swap path for
   now. Can be folded into the overlay system in Phase 1b if
   needed.

   ⚠ THING TO WATCH IN TESTING: chats.html natively loads Firebase
   compat 9.23.0, while group.html natively loads 10.12.2. Today
   they never coexist (group.html is always a separate page load).
   With this overlay, BOTH are on the same document for the first
   time. Watch the console for "Firebase already defined" or any
   firebase.* errors the first time you open a group overlay.
   ============================================================ */
(function () {
    "use strict";
    if (window.NexusOverlay) return;

    // ------------------------------------------------------------
    // Config: which pages open as an overlay, and what THEY need
    // (mirrors router.js's PAGE_SCRIPTS/PAGE_STYLES for group.html,
    // minus router.js itself since chats.html already loaded it).
    // ------------------------------------------------------------
    const OVERLAY_PAGES = {
        'group.html': {
            selector: '#page-content',
            scripts: [
                'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
                'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
                'post-card-template.js',
                'group.js'
            ],
            styles: [
                'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Orbitron:wght@600;800&display=swap',
                'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
                'group.css'
            ]
        }
        // Phase 2: 'channels.html' ..., Phase 3: 'pages.html' ... za su kara nan.
    };

    const IDLE_DESTROY_MS = 10 * 60 * 1000; // 'yanta memory na overlay bayan minti 10 ba a amfani da shi ba
    const cache = new Map();   // fullPath ("group.html?group=x") -> { key, filename, el, lastHidden }
    let overlayRoot = null;
    let activeKey = null;
    let sweepTimer = null;

    // ------------------------------------------------------------
    // Injected CSS — full-screen overlay layer above chats.html.
    // ------------------------------------------------------------
    (function injectBaseStyles() {
        const style = document.createElement('style');
        style.textContent =
            '#nexus-overlay-root{position:fixed;inset:0;z-index:5000;pointer-events:none;}' +
            '.nexus-overlay-view{position:fixed;inset:0;z-index:5000;background:#000;overflow:hidden;pointer-events:auto;}' +
            'body.nexus-overlay-open{overflow:hidden;}';
        document.head.appendChild(style);
    })();

    function ensureRoot() {
        if (overlayRoot) return overlayRoot;
        overlayRoot = document.getElementById('nexus-overlay-root');
        if (!overlayRoot) {
            overlayRoot = document.createElement('div');
            overlayRoot.id = 'nexus-overlay-root';
            document.body.appendChild(overlayRoot);
        }
        return overlayRoot;
    }

    function fullPathOf(url) {
        const u = new URL(url, window.location.href);
        return u.pathname.split('/').pop() + u.search;
    }
    function filenameOf(url) {
        return new URL(url, window.location.href).pathname.split('/').pop();
    }

    // Reuse router.js's own loadScriptOnce/loadStylesheetOnce (exposed
    // additively — see router.js patch) so assets are never fetched
    // twice between the normal SPA nav and this overlay system.
    function loadScript(src) {
        if (window.NexusRouter && window.NexusRouter.loadScriptOnce) return window.NexusRouter.loadScriptOnce(src);
        return new Promise(function (resolve) {
            const s = document.createElement('script');
            s.src = src; s.async = false;
            s.onload = resolve; s.onerror = resolve;
            document.body.appendChild(s);
        });
    }
    function loadStyle(href) {
        if (window.NexusRouter && window.NexusRouter.loadStylesheetOnce) return window.NexusRouter.loadStylesheetOnce(href);
        return new Promise(function (resolve) {
            const l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = href;
            l.onload = resolve; l.onerror = resolve;
            document.head.appendChild(l);
        });
    }

    async function buildOverlay(filename, url, key) {
        const cfg = OVERLAY_PAGES[filename];
        const res = await fetch(url, { credentials: 'same-origin' });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const contentEl = doc.querySelector(cfg.selector);

        const wrap = document.createElement('div');
        wrap.className = 'nexus-overlay-view';
        wrap.dataset.overlayKey = key;
        if (contentEl) wrap.appendChild(contentEl);

        await Promise.all(cfg.styles.map(loadStyle));
        // scripts load IN ORDER (group.js depends on the ones before it)
        await cfg.scripts.reduce(function (p, src) {
            return p.then(function () { return loadScript(src); });
        }, Promise.resolve());

        return { key: key, filename: filename, el: wrap, lastHidden: null };
    }

    function currentEntry() {
        return activeKey ? cache.get(activeKey) : null;
    }

    async function open(url) {
        const filename = filenameOf(url);
        if (!OVERLAY_PAGES[filename]) return false;

        const key = fullPathOf(url);
        if (key === activeKey) return true; // already open — no-op, matches router.js's own guard

        const prev = currentEntry();
        if (prev) {
            if (window.NexusRouter && window.NexusRouter.runPageDestroy) window.NexusRouter.runPageDestroy(prev.filename);
            prev.el.remove();
            prev.lastHidden = Date.now();
        }

        let entry = cache.get(key);
        if (!entry) {
            entry = await buildOverlay(filename, url, key);
            cache.set(key, entry);
        }
        ensureRoot().appendChild(entry.el); // re-attach (or first attach) — zero network either way after 1st fetch
        entry.lastHidden = null;
        activeKey = key;
        document.body.classList.add('nexus-overlay-open');

        // group.js already registers { init: initPage, destroy: destroyPage }
        // via NexusRouter.registerPage('group.html', ...) — we reuse that
        // exact same lifecycle so Firestore listeners / mode / feed state
        // re-derive correctly from window.location.search every open.
        if (window.NexusRouter && window.NexusRouter.runPageInit) window.NexusRouter.runPageInit(filename);

        window.history.pushState({ nexusOverlayKey: key }, '', url);
        scheduleSweep();
        return true;
    }

    function close() {
        const entry = currentEntry();
        if (!entry) return;
        if (window.NexusRouter && window.NexusRouter.runPageDestroy) window.NexusRouter.runPageDestroy(entry.filename);
        entry.el.remove();
        entry.lastHidden = Date.now();
        activeKey = null;
        document.body.classList.remove('nexus-overlay-open');
    }

    function scheduleSweep() {
        if (sweepTimer) return;
        sweepTimer = setInterval(function () {
            const now = Date.now();
            cache.forEach(function (entry, key) {
                if (key === activeKey) return;
                if (entry.lastHidden && (now - entry.lastHidden) > IDLE_DESTROY_MS) {
                    cache.delete(key);
                }
            });
        }, 60 * 1000);
    }

    // ------------------------------------------------------------
    // Click interception — CAPTURE phase, fires BEFORE router.js's
    // own (bubble-phase) document click handler, so router.js
    // never sees clicks on overlay-managed links at all.
    // ------------------------------------------------------------
    document.addEventListener('click', function (e) {
        if (!e.target || typeof e.target.closest !== 'function') return;
        const el = e.target.closest('[data-spa-link], [data-page]');
        if (!el) return;
        const url = el.getAttribute('data-spa-link') || el.getAttribute('data-page');
        if (!url || !OVERLAY_PAGES[filenameOf(url)]) return;

        e.preventDefault();
        e.stopPropagation();
        open(url);
    }, true);

    // ------------------------------------------------------------
    // Back button — CAPTURE phase, fires BEFORE router.js's own
    // popstate handler. If an overlay is open we just hide it
    // (chats.html underneath never left the DOM) and swallow the
    // event so router.js doesn't ALSO try to navigate.
    // ------------------------------------------------------------
    window.addEventListener('popstate', function (e) {
        if (activeKey) {
            e.stopImmediatePropagation();
            close();
        }
    }, true);

    window.NexusOverlay = { open: open, close: close };
})();
