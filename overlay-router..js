/* ============================================================
   NEXUS OVERLAY ROUTER — overlay-router.js (v1.3 — PHASE 1, FIX)
   ------------------------------------------------------------
   v1.3 adds 2 more fixes on top of v1.2's four:

   5) "Identifier 'firebaseConfig' has already been declared" —
      same root cause as the authReadyResolve collision, different
      name: chats.js and group.js BOTH also declare a top-level
      `firebaseConfig`. Added to the rename map. (If a NEW
      "Identifier '...' has already been declared" error shows up
      for a different name later, add that name to renameMap too —
      same fix, just a new name each time.)

   6) chats.html's footer was still bleeding through even with its
      own <header>/#footer-placeholder hidden — footer.js likely
      builds it under a different id/structure than assumed.
      Fix: instead of guessing selectors, hide EVERY direct child
      of <body> except our own overlay root while the overlay is
      open, and restore their original display on close. Covers
      header, footer, and anything else, however it's structured.

   v1.2 adds one more fix on top of v1.1's four:

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
            // Loaded via fetch+rename instead of a plain <script src>
            // — see loadRenamedScript() below.
            isolatedScript: { src: 'group.js', renameMap: { authReadyResolve: 'authReadyResolve_group', firebaseConfig: 'firebaseConfig_group' } },
            styles: [
                'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Orbitron:wght@600;800&display=swap',
                'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
                'group.css'
            ]
        }
        // Phase 2: 'channels.html' ..., Phase 3: 'pages.html' ... za su kara nan.
        // Idan sun sha irin wannan "already declared" karo, za su bukaci
        // nasu renameMap kamar yadda aka yi wa group.js.
    };

    const IDLE_DESTROY_MS = 10 * 60 * 1000;
    const cache = new Map();
    let overlayRoot = null;
    let activeKey = null;
    let sweepTimer = null;
    let hiddenChrome = null;

    (function injectBaseStyles() {
        const style = document.createElement('style');
        style.textContent =
            '#nexus-overlay-root{position:fixed;inset:0;z-index:2147483647;pointer-events:none;}' +
            '.nexus-overlay-view{position:fixed;inset:0;z-index:2147483647;background:#000;overflow:hidden;pointer-events:auto;}' +
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

        await Promise.all(cfg.styles.map(loadStyle));

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
        hiddenChrome = [];
        Array.prototype.forEach.call(document.body.children, function (child) {
            if (child.id === 'nexus-overlay-root') return;
            hiddenChrome.push({ el: child, prevDisplay: child.style.display });
            child.style.display = 'none';
        });
    }

    function restoreHostChrome() {
        if (!hiddenChrome) return;
        hiddenChrome.forEach(function (item) {
            item.el.style.display = item.prevDisplay;
        });
        hiddenChrome = null;
    }

    async function open(url) {
        const filename = filenameOf(url);
        if (!OVERLAY_PAGES[filename]) return false;

        const key = fullPathOf(url);
        if (key === activeKey) return true;

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
        ensureRoot().appendChild(entry.el);
        entry.el.style.display = 'block';
        entry.lastHidden = null;
        activeKey = key;
        document.body.classList.add('nexus-overlay-open');
        hideHostChrome();

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
        restoreHostChrome();
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
        e.stopPropagation();
        open(url);
    }, true);

    window.addEventListener('popstate', function (e) {
        if (activeKey) {
            e.stopImmediatePropagation();
            close();
        }
    }, true);

    window.NexusOverlay = { open: open, close: close };
})();
