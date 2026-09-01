/* ============================================================
   NEXUS SPA ROUTER — router.js  (v1.3)
   ------------------------------------------------------------
   Hybrid/incremental SPA navigation layer.

   v1.3 CHANGES:
   - SABON sashe #8 (Idle-time prefetching): bayan window 'load' +
     idle time, router yana duban footer icons dinka (duk element
     mai [data-spa-link]/[data-page] a screen) sannan yana loda HTML
     + scripts + CSS na wadancan pages a BACKGROUND (pageCache da
     <link rel="prefetch">) — ba tare da gudanar da su ba. Ta haka,
     lokacin da mutum ya danna icon din, navigateTo() zai iske komai
     a cache tun kafin ya danna, don haka page din ya bude cikin
     kankanin lokaci maimakon jira fetch+script+CSS network round
     trip. An iyakance shi ga kawai pages din footer (ba dukkan
     PAGE_SCRIPTS/PAGE_STYLES routes 15+ ba) domin kada a cinye data
     na mutum akan pages da ba za a bude su nan take ba. Yana kuma
     girmama Data Saver / 2G (navigator.connection) — baya prefetch
     idan mutum yana kan slow/limited connection.

   v1.2 CHANGES:
   - PAGE_SCRIPTS['services.html'] ya koma array (a baya ya kasance
     'services.js' kadai a matsayin string) domin ya sake dauke da
     html2canvas + nearme-engine.js (wadanda suka bata a wani sabon
     tsari), tare da SABON 'currency-data.js' a matsayin farko —
     CURRENCIES array (kasashe 150+) da currency helper functions
     (getCurrencySymbol/formatPrice/currency picker) an fitar da su
     daga services.js zuwa currency-data.js domin services.js ya
     zama karami kuma cikin sauri gudu. currency-data.js ana loda
     shi kamar nexus-core.js — script tag na al'ada a services.html,
     KAFIN html2canvas/nearme-engine.js/services.js.

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

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch((err) => {
                console.error('SW registration failed:', err);
            });
        });
    }

    // ------------------------------------------------------------
    // 1) CONFIG — map each route to its page-specific script file.
    //    Add an entry here whenever a page gets its own JS module.
    //    Leave it out if the page has no dedicated script yet.
    // ------------------------------------------------------------
    // Kowace entry na iya zama string guda daya, KO array na strings
    // (misali services.html yana bukatar currency-data.js + html2canvas +
    // nearme-engine.js su loda KAFIN services.js, domin services.js
    // yana amfani da su nan take a init).
    const PAGE_SCRIPTS = {
        // social.html (shafin farko) yana loda wadannan firebase 10.7.1
        // scripts a NATIVE (duba <script> tags a karshen social.html) —
        // an lissafa su a nan domin router ya san sun rigaya sun loda,
        // don haka wata page (misali health.html) da take bukatar
        // wadannan firebase URLs iri daya BA ZA TA sake dora su ba
        // (wanda ke haddasa jinkiri idan ba a lissafa su ba).
        'social.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js',
            'nexus-core.js', 'post-card-template.js', 'social.js'
        ],
        // services.html yana bukatar currency-data.js (CURRENCIES array +
        // getCurrencySymbol/formatPrice/currency picker) su gama loda
        // KAFIN html2canvas + nearme-engine.js, wadanda su ma dole su
        // gama loda KAFIN services.js — domin services.js yana amfani
        // da dukkansu nan take a init.
        'services.html': [
            'currency-data.js',
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'nearme-engine.js',
            'services.js'
        ],
           'chats.html': [
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
            'chats.js'
        ],
        // group.html yana bukatar firebase compat SDKs + post-card-template.js
        // su gama loda KAFIN group.js ya fara gudana (yana amfani da su nan
        // take a top-level, ba a cikin wani listener ba).
        'group.html': [
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
            'post-card-template.js',
            'group.js'
        ],
        // pages.html (na "Pages", ba na kowace group tab a chats.html ba) —
        // dogaro iri daya da group.html: firebase compat SDKs + post-card-
        // template.js su gama loda KAFIN pages.js.
        'pages.html': [
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
            'post-card-template.js',
            'pages.js'
        ],
        'channels.html': [
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
            'channels.js'
        ],
        // status.html yana amfani da firebase 9.22.0 (ba 10.12.2 ba kamar
        // sauran pages) domin haka ne ainihin file dinsa ya kasance tun
        // farko — an bar shi haka don kaucewa canza halayyar da ba a
        // bukata ba.
        'status.html': [
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js',
            'status.js'
        ],
        // MUHIMMI: videos.html/me.html/nexus-feed.html YANZU suna
        // amfani da nexus-core.js (iri daya da social.html) domin
        // firebase.initializeApp()/db/storage/analytics/currentUser —
        // videos.js/me.js/nexus-feed.js BA SA sake yin firebase.
        // initializeApp() na kansu kuma. An daidaita duk uku zuwa
        // EXACT SAME firebase 10.7.1 URLs (kalma-da-kalma iri daya da
        // na social.html a sama) domin loadedScripts Set (wanda ke
        // dedup ta hanyar URL string) ya gane su a matsayin "an riga
        // an loda" ko ta wace page ce user ya fara — ba tare da bukatar
        // sake dora firebase sau biyu (wanda ke haifar da "Firebase
        // already defined in global scope" / "firebase.storage is not
        // a function" / router ya koma full-reload) ba.
        'videos.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js',
            'nexus-core.js', 'videos.js'
        ],
        'me.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js',
            'nexus-core.js', 'post-card-template.js', 'me.js'
        ],
        'nexus-feed.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js',
            'nexus-core.js', 'nexus-feed.js', 'post-card-template.js', 'grid-immersive-scroll.js'
        ],
        'shop.html': [
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'shop.js'
        ],
        'products-page.html': [
            'https://cdn.tailwindcss.com',
            'products-page.js'
        ],
        'store-front.html': [
            'https://cdn.tailwindcss.com',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
            'store-front.js'
        ],
        'vendor-chat.html': [
            'https://cdn.tailwindcss.com',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'vendor-chat.js'
        ],
        // health.html yana bukatar tailwind (CDN) + pdf.js/marked/
        // dompurify (AI triage document analysis) + firebase 10.7.1
        // compat SDKs, DUK KAFIN health.js ya fara gudana (health.js
        // ne ke dauke da firebase.initializeApp + pdfjsLib worker
        // config, wadanda a da suke a <head> a matsayin inline script
        // kuma BA SU TABA gudana ba lokacin SPA navigation).
        'health.html': [
            'https://cdn.tailwindcss.com',
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.2/marked.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
            'health.js'
        ],
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
    'chats.html': [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Orbitron:wght@600;700&display=swap',
        'chats.css'
    ],
    'group.html': [
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Orbitron:wght@600;800&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
        'group.css'
    ],
    'pages.html': [
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Orbitron:wght@600;800&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
        'pages.css'
    ],
    'channels.html': [
        'channels.css'
    ],
    'status.html': [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap',
        'status.css'
    ],
    'shop.html': [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Orbitron:wght@700&family=Montserrat:wght@600&display=swap',
        'shop.css'
    ],
    'products-page.html': [
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
        'products-page.css'
    ],
    'store-front.html': [
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
        'store-front.css'
    ],
    'vendor-chat.html': [
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
        'vendor-chat.css'
    ],
    'videos.html': [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Orbitron:wght@700&family=Montserrat:wght@600&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
        'videos.css'
    ],
    'me.html': [
        'https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
        'me.css'
    ],
    'nexus-feed.html': [
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
        'nexus-feed.css'
    ],
    'health.html': [
        'https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Outfit:wght@100;300;400;600&family=Orbitron:wght@400;900&family=Space+Grotesk:wght@300;700&family=Inter:wght@300;400;700&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
        'health.css'
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
    // Preload sauran pages' SHARED assets kadai (fonts, fontawesome, da
    // sauransu) a background tun farko — OWN CSS file na kowace page (item
    // na KARSHE a jerinta a PAGE_STYLES) BA A preload shi nan take ba.
    // Dalili: idan aka preload OWN CSS na wata page (misali social.css)
    // NAN TAKE lokacin da mutum ke bude chats.html, class-names dinta
    // (misali .header-top, .smart-btn-group, wadanda sunayensu iri daya
    // ne a pages daban-daban) sukan yi karo da chats.css KAFIN ko da an
    // yi SPA navigation zuwa wancan page — shi ne ainihin abin da ke
    // haddasa header/tabs squish din, ba tare da alaka da refresh ko
    // cache ba. Own CSS din kowace page yana loda ne KAWAI a lokacin da
    // aka ainihin koma zuwa ita, ta hanyar loadStylesheetsAll() a cikin
    // navigateTo() kasa, sannan a unload ta ta hanyar unloadPageOwnCss()
    // idan an bar ta.
    Object.keys(PAGE_STYLES).forEach(function (p) {
    if (p === currentPath) return;
    const list = Array.isArray(PAGE_STYLES[p]) ? PAGE_STYLES[p] : [PAGE_STYLES[p]];
    list.slice(0, -1).forEach(loadStylesheetOnce);
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
            script.async = false;
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

   // Kowace shigarwa a PAGE_STYLES tana da nata CSS file a matsayin
   // ITEM NA KARSHE a array (misali 'social.css', 'chats.css'). Sauran
   // items (Google Fonts, FontAwesome, da sauransu) ana ajiye su domin
   // shared ne tsakanin pages. Wannan function tana cire (unload) NA
   // KARSHEN CSS file kadai na `path` da aka bayar daga <head>, domin
   // bayan mun bar wata page, class-names dinta na CSS (misali .header,
   // .tab-view, wadanda sunayensu na iya zama iri daya a wata page)
   // kada su ci gaba da rinjayar layout na sabuwar page da aka koma.
   function unloadPageOwnCss(path) {
    const styles = PAGE_STYLES[path];
    if (!styles) return;
    const list = Array.isArray(styles) ? styles : [styles];
    const ownHref = list[list.length - 1];
    if (!ownHref) return;
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
        // endsWith (ba indexOf ba) domin kaucewa kuskuren cire wata page
        // wadda sunanta CSS ke dauke da wannan a matsayin substring kadai
        // (misali 'shop.css' a cikin 'workshop.css' idan aka kara irin
        // wannan page nan gaba) — endsWith yana tabbatar da CIKAKKEN
        // sunan file ne kadai, ba wani bangare na wani suna daban ba.
        if (link.href.endsWith(ownHref)) {
            link.parentNode.removeChild(link);
            loadedStyles.delete(ownHref);
        }
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
    let pendingNav = null;

    async function navigateTo(url, options) {
        options = options || {};
        const pushHistory = options.pushHistory !== false;

        if (isNavigating) {
            // Wani navigation yana ci gaba a yanzu (misali health.html
            // yana loda scripts dinsa). Maimakon a WATSAR da wannan
            // request kai tsaye (wanda ke haddasa history desync idan
            // an danna back yayin ana loda — back button na browser YA
            // RIGA YA MATSA a hakika koda mun watsar da shi a nan), sai
            // mu ajiye shi mu aiwatar da shi nan take bayan na yanzu
            // ya gama, a cikin 'finally' block kasa.
            pendingNav = { url: url, options: options };
            return;
        }

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

            // Ana JIRAN target page CSS ta gama loda KAFIN a canza
            // content (yawanci nan take ne domin an rigaya an preload
            // ta a cache, duba layi 92-95 sama). Wannan yana hana
            // "unstyled flash" inda cards/layout suka bayyana ba tare
            // da CSS na target page ba na wani lokaci kafin ta iso.
            //
            // Idan entry na FARKO a PAGE_SCRIPTS na wannan page shine
            // Tailwind CDN (misali health.html, products-page.html,
            // store-front.html), shi ma dole ya gama loda KAFIN swap —
            // Tailwind wani "style provider" ne (JIT compiler), ba
            // kawai wani logic script ba, don haka idan an bar shi ya
            // loda BAYAN content ya bayyana (kamar sauran scripts),
            // sai a ga rubutu/buttons ba tare da salo ba na dan lokaci
            // (flash) kafin ya kama su. An cire shi daga jerin da ke
            // loda bayan swap, a loda shi tare da CSS, KAFIN swap.
            const rawScripts = PAGE_SCRIPTS[targetPath];
            const scriptList = rawScripts ? (Array.isArray(rawScripts) ? rawScripts.slice() : [rawScripts]) : [];
            let preloadScript = null;
            if (scriptList[0] === 'https://cdn.tailwindcss.com') {
                preloadScript = scriptList.shift();
            }

            runDestroy(currentPath);
            await Promise.all([
                loadStylesheetsAll(PAGE_STYLES[targetPath]),
                preloadScript ? loadScriptOnce(preloadScript) : Promise.resolve()
            ]).catch(e => console.error(e));
            currentContentEl.innerHTML = newContent.innerHTML;
            unloadPageOwnCss(currentPath);
            window.scrollTo(0, 0);
            if (newDoc.title) document.title = newDoc.title;

            // Update history + internal state.
            if (pushHistory) {
                window.history.pushState({ nexusRoute: targetPath }, '', url);
            }
            currentPath = targetPath;

            // Load the page's script bundle (once), then init it.
            await loadScriptsInOrder(scriptList.length ? scriptList : null);

            // Let the footer (and any other page listener) know the route changed.
            document.dispatchEvent(new CustomEvent('nexus:routechange', { detail: { path: targetPath } }));

            runInit(targetPath);
        } catch (err) {
            console.error('Router navigation error, falling back to full reload:', err);
            fullReload(url);
        } finally {
            isNavigating = false;
            if (pendingNav) {
                const next = pendingNav;
                pendingNav = null;
                navigateTo(next.url, next.options);
            }
        }
    }

    // ------------------------------------------------------------
    // 5) Idle-time prefetching — warm the HTML + script + CSS cache
    //    for whichever pages the footer icons point to, WHILE the
    //    person is doing nothing (after window 'load' + idle time),
    //    so that by the time they actually tap an icon, navigateTo()
    //    finds everything already sitting in cache and the swap
    //    happens in a single frame instead of waiting on a fetch +
    //    script/CSS network round-trip.
    //
    //    Deliberately scoped to ONLY the pages reachable from the
    //    footer (the [data-spa-link]/[data-page] icons actually
    //    present on screen) — NOT every route in PAGE_SCRIPTS/
    //    PAGE_STYLES. Prefetching all ~15 pages on every single
    //    load would burn mobile data for no benefit, since most of
    //    them (group.html, channels.html, health.html, vendor-chat,
    //    da sauransu) are reached through deeper navigation, not a
    //    one-tap footer icon.
    //
    //    Scripts/CSS are warmed with <link rel="prefetch"> — this
    //    only downloads the BYTES into the browser's HTTP cache, it
    //    NEVER executes a script or applies a stylesheet early. That
    //    matters here specifically because several page scripts run
    //    firebase.initializeApp() and other top-level side effects
    //    at parse time — executing them ahead of time (e.g. via a
    //    real <script> tag) would double-init firebase or touch DOM
    //    elements that don't exist yet on the current page and
    //    throw. Prefetch avoids all of that; loadScriptOnce() at
    //    actual navigation time still does the real, safe execution
    //    — it just resolves instantly because the bytes are already
    //    local.
    // ------------------------------------------------------------
    function prefetchConnectionIsOk() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return true;
        if (conn.saveData) return false; // mutum ya kunna Data Saver — kada mu sace masa MB
        if (conn.effectiveType && /2g/.test(conn.effectiveType)) return false;
        return true;
    }

    function prefetchResourceOnce(url, as) {
        if (!url || typeof url !== 'string') return;
        if (document.querySelector('link[rel="prefetch"][href="' + url + '"]')) return;
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        if (as) link.as = as;
        document.head.appendChild(link);
    }

    function getFooterLinkedPages() {
        const pages = new Set();
        document.querySelectorAll('[data-spa-link], [data-page]').forEach(function (el) {
            const url = el.getAttribute('data-spa-link') || el.getAttribute('data-page');
            if (!url) return;
            const p = normalizePath(url);
            if (p !== currentPath) pages.add(p);
        });
        return Array.from(pages);
    }

    function prefetchPagesAssets(pages) {
        pages.forEach(function (p) {
            const scripts = PAGE_SCRIPTS[p];
            (Array.isArray(scripts) ? scripts : (scripts ? [scripts] : [])).forEach(function (src) {
                if (!loadedScripts.has(src)) prefetchResourceOnce(src, 'script');
            });
            const styles = PAGE_STYLES[p];
            (Array.isArray(styles) ? styles : (styles ? [styles] : [])).forEach(function (href) {
                if (!loadedStyles.has(href)) prefetchResourceOnce(href, 'style');
            });
        });
    }

    function prefetchPagesHtml(pages) {
        let idx = 0;
        function fetchNext() {
            if (idx >= pages.length) return;
            const p = pages[idx++];
            const promise = (!pageCache.has(p))
                ? fetch(p, { credentials: 'same-origin' })
                    .then(function (res) { return res.ok ? res.text() : null; })
                    .then(function (html) { if (html) pageCache.set(p, html); })
                    .catch(function () {})
                : Promise.resolve();
            promise.then(function () { scheduleIdle(fetchNext); });
        }
        fetchNext();
    }

    function scheduleIdle(fn) {
        if (window.requestIdleCallback) {
            requestIdleCallback(fn, { timeout: 2000 });
        } else {
            setTimeout(fn, 300);
        }
    }

    function startFooterPrefetch(retriesLeft) {
        const pages = getFooterLinkedPages();
        if (pages.length === 0) {
            // footer.js na iya dora footer icons a background bayan
            // window 'load' (misali ta fetch/innerHTML) — mu sake
            // gwadawa 'yan lokuta kadan kafin mu daina.
            if (retriesLeft > 0) {
                setTimeout(function () { startFooterPrefetch(retriesLeft - 1); }, 800);
            }
            return;
        }
        scheduleIdle(function () {
            prefetchPagesAssets(pages);
            prefetchPagesHtml(pages);
        });
    }

    if (prefetchConnectionIsOk()) {
        if (document.readyState === 'complete') {
            scheduleIdle(function () { startFooterPrefetch(5); });
        } else {
            window.addEventListener('load', function () {
                scheduleIdle(function () { startFooterPrefetch(5); });
            });
        }
    }

    // ------------------------------------------------------------
    // 6) Link interception — any element with [data-spa-link]
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
    // 7) Back/forward button support.
    // ------------------------------------------------------------
   window.addEventListener('popstate', function (e) {
        const path = (e.state && e.state.nexusRoute) || normalizePath(window.location.pathname);
        navigateTo(path, { pushHistory: false });
    });

    // ------------------------------------------------------------
    // 8) Init.
    // ------------------------------------------------------------
   document.addEventListener('click', onDocumentClick);
  // Register initial page's history state so popstate works from the start.
    window.history.replaceState({ nexusRoute: currentPath }, '', window.location.href);
 })();
    
