/* ============================================================
   NEXUS OVERLAY ROUTER — overlay-router.js (v1.5 — PHASE 1, FIX)
   ------------------------------------------------------------
   v1.5: stopped reacting to console errors one at a time. Did a
   full, systematic diff of every top-level `let`/`const`/`var`/
   `function` name in group.js against chats.js. Found FOUR real
   collisions total (not two): authReadyResolve, authReadyPromise,
   firebaseConfig, pressTimer — all now in the rename map at once.
   (showToast also collides, but it's a `function` not `let/const`
   so it won't throw a SyntaxError — and group.html's own markup
   calls it via onclick="showToast(...)" directly, so renaming it
   would break those buttons. Left as-is for now; see note below.)

   v1.4: v1.3's "hide every child of body" approach (fix #6) broke
   the back button (page came back garbled). Reverted THAT one
   piece back to v1.2's specific header/footer-placeholder hiding,
   which was proven fine for the back button.

   v1.3 had added 2 fixes on top of v1.2's four:

   5) "Identifier 'firebaseConfig' has already been declared" —
      same root cause as the authReadyResolve collision, different
      name: chats.js and group.js BOTH also declare a top-level
      `firebaseConfig`. Added to the rename map. (If a NEW
      "Identifier '...' has already been declared" error shows up
      for a different name later, add that name to renameMap too —
      same fix, just a new name each time.)

   6) [REVERTED in v1.4 — broke the back button] chats.html's
      footer was bleeding through even with header/#footer-placeholder
      hidden. Tried hiding every direct child of <body> instead of
      guessing selectors — but that broke back-button restoration.
      Back to the v1.2 approach; footer bleed-through still open.

   v1.2 adds one more fix on top of v1.1's three:

   4) group.js's own document.getElementById(...) calls were
      returning null because its DOM wasn't attached to the real
      document yet at the moment group.js executed — it was still
      sitting in a detached wrapper. That silently killed the rest
      of group.js's top-level code (including real Firestore data
      loading and button wiring), even though the static HTML/CSS
      still rendered fine on its own (which is why you saw the
      group header but hardcoded data and dead buttons).
      Fix: attach the wrapper to the document (hidden) BEFORE
      loading group.js, not after.

   v1.1 fixes 3 real bugs found in testing (v1.0):

   1) "Identifier 'authReadyResolve' has already been declared"
      — group.js and chats.js BOTH declare a top-level
      `let authReadyResolve`. They never used to share a page, so
      this never collided before. Now that group.js loads INSIDE
      chats.html, it does — and that SyntaxError kills group.js's
      ENTIRE script (nothing in it runs, not even registerPage()).
      Fix: fetch group.js as TEXT, rename ONLY that one identifier
      before executing it (still runs in the global scope exactly
      like a normal <script>, so all its onclick-referenced global
      functions still work) — zero changes to the actual group.js
      file on disk.

   2) Firebase "already defined in global scope" warning — we were
      loading Firebase 10.12.2 on top of chats.html's own 9.23.0.
      Fix: skip loading Firebase scripts entirely if window.firebase
      already exists (chats.html already loaded it).

   3) chats.html's own header + bottom footer stayed visible/
      interactive UNDER the overlay (that's why everything looked
      merged, and why a stray tap could trigger chats.html's own
      "Add Friends" overlay while our overlay was covering things).
      Fix: explicitly hide chats.html's own <header> and
      #footer-placeholder while the overlay is open, and disable
      pointer-events on chats.html's own #page-content — belt and
      suspenders alongside a much higher z-index.
   ============================================================ */
(function () {
    "use strict";
    if (window.NexusOverlay) return;

    const OVERLAY_PAGES = {
        'group.html': {
            selector: '#page-content',
            firebaseScripts: [
                'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
                'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
            ],
            scripts: [
                'post-card-template.js'
            ],
            isolatedScript: {
                src: 'group.js',
                renameMap: {
                    authReadyResolve: 'authReadyResolve_group',
                    authReadyPromise: 'authReadyPromise_group',
                    firebaseConfig: 'firebaseConfig_group',
                    pressTimer: 'pressTimer_group'
                }
            },
            styles: [
                'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Orbitron:wght@600;800&display=swap',
                'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
                'group.css'
            ]
        }
    };

    const IDLE_DESTROY_MS = 10 * 60 * 1000;
    const cache = new Map();
    let overlayRoot = null;
    let activeKey = null;
    let sweepTimer = null;
    let hiddenChrome = null;

    // v1.6 FIX — THE ACTUAL ROOT CAUSE OF THE "HARDCODED DATA UNTIL
    // REFRESH" BUG:
    // window.NexusRouter.runPageInit()/runPageDestroy() (called below)
    // rely on router.js's OWN internal "what page am I on" tracking.
    // The overlay never goes through router.js's normal SPA navigation —
    // we push to browser history ourselves (see window.history.pushState
    // below) — so router.js's internal state never says "group.html",
    // and runPageInit('group.html') silently does nothing.
    // That means group.js's initPage() — the function that actually
    // subscribes to Firestore and swaps the hardcoded demo name/count
    // for real data — NEVER runs on an SPA click. Every group you open
    // just sits on the raw hardcoded HTML forever. Only a real browser
    // refresh works, because group.js has its own fallback at the
    // bottom of the file that calls initPage() directly on native load
    // (bypassing router.js entirely) — which is why refresh "fixes" it.
    // FIX: capture the {init, destroy} functions group.js hands to
    // registerPage() ourselves, and call them directly — no dependency
    // on router.js's path-tracking at all.
    const pageHooks = new Map();
    function capturePageHooks() {
        if (!window.NexusRouter) window.NexusRouter = {};
        if (window.NexusRouter.__nexusOverlayHooked) return;
        window.NexusRouter.__nexusOverlayHooked = true;
        const originalRegister = window.NexusRouter.registerPage;
        window.NexusRouter.registerPage = function (name, hooks) {
            pageHooks.set(name, hooks);
            if (typeof originalRegister === 'function') {
                return originalRegister.apply(this, arguments);
            }
        };
    }
    function runInit(filename) {
        const hooks = pageHooks.get(filename);
        if (hooks && typeof hooks.init === 'function') hooks.init();
    }
    function runDestroy(filename) {
        const hooks = pageHooks.get(filename);
        if (hooks && typeof hooks.destroy === 'function') hooks.destroy();
    }
    capturePageHooks();

    (function injectBaseStyles() {
        const style = document.createElement('style');
        style.textContent =
         '#nexus-overlay-root{position:fixed;inset:0;z-index:2147483647;pointer-events:none;}' +
'.nexus-overlay-view{position:fixed;inset:0;z-index:2147483647;background:#000;overflow:hidden;pointer-events:auto;}' +
'body.nexus-overlay-open{overflow:hidden;}' +
'body.nexus-overlay-open #footer-placeholder,body.nexus-overlay-open #footer-placeholder *{visibility:hidden!important;pointer-events:none!important;}';      
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

   function loadOverlayStyle(href, overlayKey) {
    return new Promise(function (resolve) {
        const existing = document.querySelector(
            'link[data-nexus-overlay-style="' + overlayKey + '"][href="' + href + '"]'
        );

        if (existing) {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.nexusOverlayStyle = overlayKey;

        link.onload = resolve;
        link.onerror = resolve;

        document.head.appendChild(link);
    });
}

function removeOverlayStyles(overlayKey) {
    document.querySelectorAll(
        'link[data-nexus-overlay-style="' + overlayKey + '"]'
    ).forEach(function (link) {
        link.remove();
    });
}
    const loadedRenamedScripts = new Set();
    async function loadRenamedScript(src, renameMap) {
        if (loadedRenamedScripts.has(src)) return;
        const res = await fetch(src, { credentials: 'same-origin' });
        let text = await res.text();
        Object.keys(renameMap).forEach(function (from) {
            const to = renameMap[from];
            text = text.replace(new RegExp('\\b' + from + '\\b', 'g'), to);
        });
        const s = document.createElement('script');
        s.textContent = text;
        document.body.appendChild(s);
        loadedRenamedScripts.add(src);
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
        wrap.style.display = 'none';
        if (contentEl) wrap.appendChild(contentEl);

        ensureRoot().appendChild(wrap);

        await Promise.all(
    cfg.styles.map(function (href) {
        return loadOverlayStyle(href, key);
    })
);
       
        const firebaseScripts = window.firebase ? [] : (cfg.firebaseScripts || []);
        const orderedPlain = firebaseScripts.concat(cfg.scripts || []);
        await orderedPlain.reduce(function (p, src) {
            return p.then(function () { return loadScript(src); });
        }, Promise.resolve());

        if (cfg.isolatedScript) {
            await loadRenamedScript(cfg.isolatedScript.src, cfg.isolatedScript.renameMap);
        }

        return { key: key, filename: filename, el: wrap, lastHidden: null };
    }

    function currentEntry() {
        return activeKey ? cache.get(activeKey) : null;
    }
function hideHostChrome() {
        if (hiddenChrome) return;
        const headerEl = document.querySelector('main#page-content > header');
        const footerEl = document.getElementById('footer-placeholder');
        const pageContentEl = document.getElementById('page-content');
        hiddenChrome = {
            headerEl: headerEl, headerPrevVisibility: headerEl ? headerEl.style.visibility : '',
            footerEl: footerEl, footerPrevVisibility: footerEl ? footerEl.style.visibility : '',
            pageContentEl: pageContentEl, pageContentPrevPointerEvents: pageContentEl ? pageContentEl.style.pointerEvents : ''
        };
        // visibility:hidden a maimakon display:none — header/footer suna
        // 'position:sticky', don haka display:none yana tura content sama
        // (layout reflow), shi ne ke haddasa tsalle/hargitsi. visibility
        // baya taba layout, sai dai ya boye ganuwa + toshe taba.
        if (headerEl) { headerEl.style.visibility = 'hidden'; headerEl.style.pointerEvents = 'none'; }
        if (footerEl) { footerEl.style.visibility = 'hidden'; footerEl.style.pointerEvents = 'none'; }
        if (pageContentEl) pageContentEl.style.pointerEvents = 'none';

        const addFriends = document.getElementById('addFriendsOverlay');
        const newMsg = document.getElementById('newMessageOverlay');
        if (addFriends) addFriends.classList.remove('nmo-open');
        if (newMsg) newMsg.classList.remove('nmo-open');
        document.querySelectorAll('.friend-status-filter-menu.open, .nmo-filter-menu.open')
            .forEach(el => el.classList.remove('open'));
}
    
    function restoreHostChrome() {
        if (!hiddenChrome) return;
        if (hiddenChrome.headerEl) { hiddenChrome.headerEl.style.visibility = hiddenChrome.headerPrevVisibility; hiddenChrome.headerEl.style.pointerEvents = ''; }
        if (hiddenChrome.footerEl) { hiddenChrome.footerEl.style.visibility = hiddenChrome.footerPrevVisibility; hiddenChrome.footerEl.style.pointerEvents = ''; }
        if (hiddenChrome.pageContentEl) hiddenChrome.pageContentEl.style.pointerEvents = hiddenChrome.pageContentPrevPointerEvents;
        hiddenChrome = null;
    }

    async function open(url) {
        const filename = filenameOf(url);
        if (!OVERLAY_PAGES[filename]) return false;

        const key = fullPathOf(url);
        if (key === activeKey) return true;

        const prev = currentEntry();

if (prev) {
    runDestroy(prev.filename);

    prev.el.remove();

    // Remove CSS belonging to the previous overlay.
    removeOverlayStyles(prev.key);

    prev.lastHidden = Date.now();
}
       
        let entry = cache.get(key);

if (!entry) {
    entry = await buildOverlay(filename, url, key);
    cache.set(key, entry);
} else {
    await Promise.all(
        OVERLAY_PAGES[filename].styles.map(function (href) {
            return loadOverlayStyle(href, key);
        })
    );
}
      ensureRoot().appendChild(entry.el);

entry.lastHidden = null;
activeKey = key;

document.body.classList.add('nexus-overlay-open');

hideHostChrome();

requestAnimationFrame(function () {
    entry.el.style.display = 'block';
});

        window.history.pushState({ nexusOverlayKey: key }, '', url);

        runInit(filename);
       scheduleSweep();
        return true;
    }

    function close() {
    const entry = currentEntry();
    if (!entry) return;

    runDestroy(entry.filename);

    entry.el.remove();

    // IMPORTANT:
    // Remove all styles owned by this overlay.
    removeOverlayStyles(entry.key);

    entry.lastHidden = Date.now();
    activeKey = null;

    document.body.classList.remove('nexus-overlay-open');

    restoreHostChrome();

    // Return host page scrolling/layout to normal.
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
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

    document.addEventListener('click', function (e) {
        if (!e.target || typeof e.target.closest !== 'function') return;
        const el = e.target.closest('[data-spa-link], [data-page]');
        if (!el) return;
        const url = el.getAttribute('data-spa-link') || el.getAttribute('data-page');
        if (!url || !OVERLAY_PAGES[filenameOf(url)]) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        open(url);
    }, true);

    window.addEventListener('popstate', function (e) {
        if (activeKey) {
            e.stopImmediatePropagation();
            close();
        }
    }, true);

    window.NexusOverlay = { open: open, close: close, isOpen: function () { return !!activeKey; } };
})();
