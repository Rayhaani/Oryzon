/* ============================================================
   NEXUS SPA ROUTER — router.js  (v1.1)
   ------------------------------------------------------------
   Hybrid/incremental SPA navigation layer.

   v1.1 CHANGES:
   - PAGE_SCRIPTS['social.html'] = 'social.js' yanzu YANA nan.
     Wannan shine karo na farko wani page ya sami dedicated
     script bundle — kafin haka DUK page logic (init/destroy/
     registerPage) yana zaune a WAJEN #page-content a matsayin
     inline <script>, wanda BAI TABA gudana ba lokacin SPA
     navigation (fetch + innerHTML swap baya gudanar da <script>
     tags, kuma abin da ke WAJEN #page-content ma baya cikin
     extracted content dinsa tun farko). Sauran pages (chats,
     services, videos, shop, me) suna bukatar irin wannan
     magani — kowanne zai kara layin sa a nan lokacin da aka
     fitar da nasa logic zuwa external .js file.
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
        'social.html': 'social.js',
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

    // A page's own <script src="social.js"> tag (native full load) already
    // executes it once via a normal <script> tag, NOT via loadScriptOnce().
    // Mark the CURRENT page's script as already-loaded so a same-page
    // re-entry (e.g. user navigates away then back) doesn't insert a
    // second <script> tag and re-run top-level side effects twice.
    if (PAGE_SCRIPTS[currentPath]) {
        loadedScripts.add(PAGE_SCRIPTS[currentPath]);
    }

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
