/* ============================================================
   NEXUS SPA ROUTER — router.js  (v1.0)
   ------------------------------------------------------------
   Hybrid/incremental SPA navigation layer.

   HOW EACH PAGE MUST BE STRUCTURED:
     1) Wrap the page's main body content (everything except
        footer-placeholder / persistent shell elements) inside:
          <main id="page-content"> ... </main>

     2) Include this file ONCE in the shell (or in every page,
        it will only initialize once):
          <script src="router.js"></script>

     3) Each page registers itself so the router knows how to
        init/destroy it when navigated to/away from:

          NexusRouter.registerPage('social.html', {
            init: function () { /* start listeners, render, etc */ },
            destroy: function () { /* remove listeners, timers */ }
          });

     4) Any page-specific <script src="social.js"></script> tag
        should be placed OUTSIDE #page-content (so it survives
        swaps) OR be listed in PAGE_SCRIPTS below so the router
        loads it once, on first visit, before calling init().

   HOW NAVIGATION WORKS:
     - NexusRouter.navigateTo(url) fetches the target HTML,
       extracts its #page-content, swaps it into the current
       #page-content, updates <title>, pushes history state,
       loads the target page's script bundle if not already
       loaded, then calls destroy() on the outgoing page and
       init() on the incoming page.
     - Clicking any element with [data-spa-link] (footer icons
       use this) triggers navigateTo() instead of a full reload.
     - Browser back/forward (popstate) is handled the same way.
     - If fetch fails, or the target page has no #page-content
       (i.e. it's not SPA-ready yet), the router falls back to
       a normal full-page navigation automatically.
   ============================================================ */

(function () {
    "use strict";

    if (window.NexusRouter) return; // prevent double-init if included twice

    // ------------------------------------------------------------
    // 1) CONFIG — map each route to its page-specific script file.
    //    Add an entry here whenever a page gets its own JS module.
    //    Leave it out if the page has no dedicated script yet.
    // ------------------------------------------------------------
    const PAGE_SCRIPTS = {
        // 'social.html': 'social.js',
        // 'services.html': 'services.js',
        // 'chats.html': 'chats.js',
        // 'videos.html': 'videos.js',
        // 'shop.html': 'shop.js',
        // 'me.html': 'me.js',
    };

    const CONTENT_SELECTOR = '#page-content';
    const loadedScripts = new Set();
    const registeredPages = {}; // path -> { init, destroy }
    let currentPath = normalizePath(window.location.pathname);
    let isNavigating = false;

    // ------------------------------------------------------------
    // 2) Public API
    // ------------------------------------------------------------
    window.NexusRouter = {
        registerPage: function (path, handlers) {
            registeredPages[normalizePath(path)] = handlers || {};
        },
        navigateTo: navigateTo,
        getCurrentPath: function () { return currentPath; }
    };

    // ------------------------------------------------------------
    // 3) Helpers
    // ------------------------------------------------------------
    function normalizePath(path) {
        let p = path.split('/').pop();
        if (!p) p = 'social.html';
        return p.split('?')[0].split('#')[0];
    }

    function loadScriptOnce(src) {
        return new Promise(function (resolve, reject) {
            if (!src || loadedScripts.has(src)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = function () {
                loadedScripts.add(src);
                resolve();
            };
            script.onerror = function () {
                reject(new Error('Failed to load script: ' + src));
            };
            document.body.appendChild(script);
        });
    }

    function runDestroy(path) {
        const page = registeredPages[path];
        if (page && typeof page.destroy === 'function') {
            try { page.destroy(); } catch (e) { console.error('Router destroy() error for', path, e); }
        }
    }

    function runInit(path) {
        const page = registeredPages[path];
        if (page && typeof page.init === 'function') {
            try { page.init(); } catch (e) { console.error('Router init() error for', path, e); }
        }
    }

    function fullReload(url) {
        window.location.href = url;
    }

    // ------------------------------------------------------------
    // 4) Core navigation
    // ------------------------------------------------------------
    async function navigateTo(url, options) {
        options = options || {};
        const pushHistory = options.pushHistory !== false;

        if (isNavigating) return;

        const targetPath = normalizePath(new URL(url, window.location.href).pathname);

        // Same page tapped again — do nothing.
        if (targetPath === currentPath && pushHistory) return;

        isNavigating = true;

        try {
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Fetch failed with status ' + response.status);

            const html = await response.text();
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(html, 'text/html');

            const newContent = newDoc.querySelector(CONTENT_SELECTOR);
            const currentContentEl = document.querySelector(CONTENT_SELECTOR);

            if (!newContent || !currentContentEl) {
                // Target page isn't SPA-ready yet — fall back safely.
                fullReload(url);
                return;
            }

            // Lifecycle: tear down outgoing page.
            runDestroy(currentPath);

            // Swap content + title.
            currentContentEl.innerHTML = newContent.innerHTML;
            if (newDoc.title) document.title = newDoc.title;

            // Update history + internal state.
            if (pushHistory) {
                window.history.pushState({ nexusRoute: targetPath }, '', url);
            }
            currentPath = targetPath;

            // Load the page's script bundle (once), then init it.
            const scriptSrc = PAGE_SCRIPTS[targetPath];
            await loadScriptOnce(scriptSrc);

            // Let the footer (and any other page listener) know the route changed.
            document.dispatchEvent(new CustomEvent('nexus:routechange', { detail: { path: targetPath } }));

            runInit(targetPath);
        } catch (err) {
            console.error('Router navigation error, falling back to full reload:', err);
            fullReload(url);
        } finally {
            isNavigating = false;
        }
    }

    // ------------------------------------------------------------
    // 5) Link interception — any element with [data-spa-link]
    //    or [data-page] (footer icons already use data-page).
    // ------------------------------------------------------------
    function onDocumentClick(e) {
        const el = e.target.closest('[data-spa-link], [data-page]');
        if (!el) return;

        const url = el.getAttribute('data-spa-link') || el.getAttribute('data-page');
        if (!url) return;

        e.preventDefault();
        navigateTo(url);
    }

    // ------------------------------------------------------------
    // 6) Back/forward button support.
    // ------------------------------------------------------------
    window.addEventListener('popstate', function (e) {
        const path = (e.state && e.state.nexusRoute) || normalizePath(window.location.pathname);
        navigateTo(path, { pushHistory: false });
    });

    // ------------------------------------------------------------
    // 7) Init.
    // ------------------------------------------------------------
    document.addEventListener('click', onDocumentClick);

    // Register initial page's history state so popstate works from the start.
    window.history.replaceState({ nexusRoute: currentPath }, '', window.location.href);
})();
          
