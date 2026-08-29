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
    // Kowace entry na iya zama string guda daya, KO array na strings
    // (misali services.html yana bukatar html2canvas + nearme-engine.js
    // su loda KAFIN services.js, domin services.js yana amfani da su
    // nan take a init).
    // Kowace entry na iya zama string guda daya, KO array na strings
    // (misali services.html yana bukatar html2canvas + nearme-engine.js
    // su loda KAFIN services.js, domin services.js yana amfani da su
    // nan take a init).
    const PAGE_SCRIPTS = {
        'social.html': 'social.js',
        'services.html': 'services.js',
        // 'chats.html': 'chats.js',
        // 'videos.html': 'videos.js',
        // 'shop.html': 'shop.js',
        // 'me.html': 'me.js',
    };

    // CSS na kowace page (an fitar daga <style> na <head> zuwa .css
    // daban). #page-content innerHTML swap BAI TABA</main> ba, don
    // haka wannan shine kadai hanyar da CSS din target page zai loda
    // idan mutum bai bude wannan page ta native ba tun farko.
   const PAGE_STYLES = {
    'social.html': [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Orbitron:wght@700&family=Montserrat:wght@600&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
        'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap',
        'https://fonts.googleapis.com/css2?family=Syncopate:wght@700&display=swap',
        'social.css'
    ],
    'services.html': [
        'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap',
        'services.css'
    ],
}; 
    const loadedStyles = new Set();

    const CONTENT_SELECTOR = '#page-content';
    const loadedScripts = new Set();
    const registeredPages = {}; // path -> { init, destroy }
    let currentPath = normalizePath(window.location.pathname);
    let isNavigating = false;
    const pageCache = new Map();

    // A page's own <script src="social.js"> tag (native full load) already
    // executes it once via a normal <script> tag, NOT via loadScriptOnce().
    // Mark the CURRENT page's script as already-loaded so a same-page
    // re-entry (e.g. user navigates away then back) doesn't insert a
    // second <script> tag and re-run top-level side effects twice.
    if (PAGE_SCRIPTS[currentPath]) {
        const initial = PAGE_SCRIPTS[currentPath];
        (Array.isArray(initial) ? initial : [initial]).forEach(src => loadedScripts.add(src));
    }
    if (PAGE_STYLES[currentPath]) {
    (Array.isArray(PAGE_STYLES[currentPath]) ? PAGE_STYLES[currentPath] : [PAGE_STYLES[currentPath]]).forEach(h => loadedStyles.add(h));
    }
    // Preload duk sauran page CSS a background tun farko, domin
    // await loadStylesheetOnce() a navigateTo() ya samu su a cache
    // dinsa nan take, ba tare da jira network ba.
    Object.keys(PAGE_STYLES).forEach(function (p) {
    if (p === currentPath) return;
    (Array.isArray(PAGE_STYLES[p]) ? PAGE_STYLES[p] : [PAGE_STYLES[p]]).forEach(loadStylesheetOnce);
});
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

    // Yana loda array na scripts a JERE (daya bayan daya, ba layi
    // daya ba), domin misali html2canvas/nearme-engine.js dole su
    // gama loda KAFIN services.js ya fara gudana.
    async function loadScriptsInOrder(list) {
        if (!list) return;
        const scripts = Array.isArray(list) ? list : [list];
        const last = scripts[scripts.length - 1];
        await Promise.all(scripts.slice(0, -1).map(loadScriptOnce));
        await loadScriptOnce(last);
    }

    function loadStylesheetOnce(href) {
        return new Promise(function (resolve, reject) {
            if (!href || loadedStyles.has(href)) {
                resolve();
                return;
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = function () {
                loadedStyles.add(href);
                resolve();
            };
            link.onerror = function () {
                reject(new Error('Failed to load stylesheet: ' + href));
            };
            document.head.appendChild(link);
        });
    }

   function loadStylesheetsAll(list) {
    if (!list) return Promise.resolve();
    return Promise.all((Array.isArray(list) ? list : [list]).map(loadStylesheetOnce));
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
            let html = pageCache.get(targetPath);
            if (!html) {
                const response = await fetch(url, { credentials: 'same-origin' });
                if (!response.ok) throw new Error('Fetch failed with status ' + response.status);
                html = await response.text();
                pageCache.set(targetPath, html);
            }
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(html, 'text/html');

            const newContent = newDoc.querySelector(CONTENT_SELECTOR);
            const currentContentEl = document.querySelector(CONTENT_SELECTOR);

            if (!newContent || !currentContentEl) {
                // Target page isn't SPA-ready yet — fall back safely.
                fullReload(url);
                return;
            }

            // Fara loda CSS a BACKGROUND (ba a JIRA shi ba) — content
            // zai canza NAN TAKE, CSS zai iya biyowa cikin ‘yan
            // milliseconds na baya (yawanci baya jin dadewa domin
            // browser cache ke rikewa bayan ziyara ta farko).
            runDestroy(currentPath);
            try { await loadStylesheetsAll(PAGE_STYLES[targetPath]); } catch (e) { console.error(e); }
            currentContentEl.innerHTML = newContent.innerHTML;
            window.scrollTo(0, 0);
            if (newDoc.title) document.title = newDoc.title;

            // Update history + internal state.
            if (pushHistory) {
                window.history.pushState({ nexusRoute: targetPath }, '', url);
            }
            currentPath = targetPath;

            // Load the page's script bundle (once), then init it.
            await loadScriptsInOrder(PAGE_SCRIPTS[targetPath]);

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
