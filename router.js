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
    // (misali services.html yana bukatar html2canvas + nearme-engine.js
    // su loda KAFIN services.js, domin services.js yana amfani da su
    // nan take a init).
    // Kowace entry na iya zama string guda daya, KO array na strings
    // (misali services.html yana bukatar html2canvas + nearme-engine.js
    // su loda KAFIN services.js, domin services.js yana amfani da su
    // nan take a init).
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
            'nexus-core.js', 'post-card-template.js', 'social.js', 'nexus-algorithm.js'
        ],
        // services.html yana bukatar firebase compat SDKs + nexus-core.js
        // (domin db/firebase/currentUser/storage/analytics globals) +
        // currency-data.js, DUK KAFIN services.js — services.js da kansa
        // ya bayyana wannan dogaro a sharhin sa amma a da PAGE_SCRIPTS
        // yana loda 'services.js' KADAI, shi ya haddasa initServicesPage()
        // ya fadi da ReferenceError (an kama a try/catch, shiru) duk
        // lokacin SPA navigation zuwa services.html — content baya
        // nunawa sai an yi full refresh (wanda ke loda komai daidai
        // order daga <script> tags na asali).
        'services.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js',
            'nexus-core.js', 'currency-data.js', 'services.js'
        ],
        'chats.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'overlay-router.js?v=2',
            'footer.js?v=4',
            'chats.js?v=1'
        ],
        // chat-interior.html yana bukatar firebase compat SDKs (iri daya
        // da chats.html, 10.7.1, domin kaucewa "Firebase already defined"
        // idan an SPA-nav zuwa nan ba tare da an taba bude chats.html
        // tukuna ba) + call/video-call engines, DUK KAFIN chat-interior.js.
        // ffmpeg.wasm BA A NAN — chat-interior.js na lazy-load shi da kansa
        // (getFFmpeg()) kawai idan an fara tura bidiyo, domin kada ya jinkirta
        // bayyanar chat history a duk lokacin da aka bude wannan chat.
        'chat-interior.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'call.js',
            'video-call.js',
            'chat-interior.js'
        ],
        // group.html yana bukatar firebase compat SDKs + post-card-template.js
        // su gama loda KAFIN group.js ya fara gudana (yana amfani da su nan
        // take a top-level, ba a cikin wani listener ba).
        'group.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'post-card-template.js',
            'group.js'
        ],
        // pages.html (na "Pages", ba na kowace group tab a chats.html ba) —
        // dogaro iri daya da group.html: firebase compat SDKs + post-card-
        // template.js su gama loda KAFIN pages.js.
        'pages.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'post-card-template.js',
            'pages.js'
        ],
        'channels.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'channels.js'
        ],
        // status.html yana amfani da firebase 9.22.0 (ba 10.12.2 ba kamar
        // sauran pages) domin haka ne ainihin file dinsa ya kasance tun
        // farko — an bar shi haka don kaucewa canza halayyar da ba a
        // bukata ba.
        'status.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
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
            'nexus-core.js', 'post-card-template.js', 'videos.js'
        ],
        'me.html': [
            'https://cdn.tailwindcss.com',
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
            'https://cdn.tailwindcss.com',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'shop.js'
        ],
        'products-page.html': [
            'https://cdn.tailwindcss.com',
            'products-page.js'
        ],
        'store-front.html': [
            'https://cdn.tailwindcss.com',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
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
        'notifications.html': [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'nexus-core.js', 'notifications.js'
        ],
        'health.html': [
            'https://cdn.tailwindcss.com',
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.2/marked.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'health.js',
            'footer.js' 
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
        'chats.css?v=3'
    ],
    'chat-interior.html': [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Orbitron:wght@700&family=Montserrat:wght@600&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
        'chat-interior.css'
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
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
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
   'notifications.html': [
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
            'notifications.css'
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
        getCurrentPath: function () { return currentPath; },
        loadScriptOnce: loadScriptOnce,
        loadStylesheetOnce: loadStylesheetOnce,
        runPageInit: runInit,
        runPageDestroy: runDestroy
    };
    // ------------------------------------------------------------
    // 3) Helpers
    // ------------------------------------------------------------
    function normalizePath(path) {
        let p = path.split('/').pop();
        if (!p) p = 'social.html';
        return p.split('?')[0].split('#')[0];
    }

      let navProgressEl = null;
    function showNavProgress() {
        if (!navProgressEl) {
            navProgressEl = document.createElement('div');
            navProgressEl.id = 'nexus-nav-progress';
            navProgressEl.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:0%;background:#3b82f6;z-index:99999;transition:width .3s ease;';
            document.body.appendChild(navProgressEl);
        }
        navProgressEl.style.width = '0%';
        navProgressEl.style.opacity = '1';
        requestAnimationFrame(() => { navProgressEl.style.width = '70%'; });
    }
    function hideNavProgress() {
        if (!navProgressEl) return;
        navProgressEl.style.width = '100%';
        setTimeout(() => { navProgressEl.style.opacity = '0'; }, 200);
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
                console.error('Script ya kasa loda (an tsallake, sauran ba za su tsaya ba):', src);
                resolve();
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
        if (link.href.indexOf(ownHref) !== -1) {
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
        showNavProgress();

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

            // Ajiye reference din immersive card (idan akwai) YANZU, amma
            // KADA A KIRA exitImmersive() nan take — mun jinkirta shi zuwa
            // BAYAN innerHTML swap kasa, domin kaucewa "flash" na gani
            // (card ya koma post-card mode, ya bar space) kafin mu bar page.
            const _immersiveCard = document.querySelector('.post-card.immersive-mode');

            const _storyDeck = document.getElementById('story-overlay-deck');
            if (_storyDeck && _storyDeck.style.display !== 'none' && typeof window.closeStoryDeck === 'function') {
                window.closeStoryDeck();
            }
           
            await Promise.all([
                loadStylesheetsAll(PAGE_STYLES[targetPath]),
                preloadScript ? loadScriptOnce(preloadScript) : Promise.resolve()
            ]).catch(e => console.error(e));
           unloadPageOwnCss(currentPath);
currentContentEl.innerHTML = newContent.innerHTML; 

            // YANZU ne muke fita daga immersive-mode — card/video na
            // immersive-mode YA RIGA YA BACE daga DOM (an maye gurbinsa da
            // sabon content a layin sama) kafin exitImmersive() ya taba
            // gudana, don haka BABU wani flash na gani. exitImmersive()
            // har yanzu dole ya gudana domin cleanup dinsa (cire
            // .immersive-back-btn daga <body>, dakatar da bidiyo/
            // observers/listeners) — babu ko daya daga cikinsu da yake
            // bukatar card din ya kasance a DOM domin ya yi aiki daidai.
            if (_immersiveCard && typeof window.exitImmersive === 'function') {
                window.exitImmersive(_immersiveCard);
            }

           // Force INSTANT scroll — kada mu bari ko wace CSS
           // "scroll-behavior: smooth" a wani global stylesheet ta
           // sanya wannan ya yi animate/pulling-down effect lokacin
           // da muke fita daga babban scroll offset na immersive video.
           window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            if (newDoc.title) document.title = newDoc.title;

            // Update history + internal state.
            if (pushHistory) {
                // Instagram-style shallow stack: kawai lokacin da muke
                // SHIGA ko FITA daga home (social.html) ne muke PUSH sabon
                // entry. Tsakanin sauran pages guda biyu DABAN da home
                // (misali shop -> services kai tsaye) muna REPLACE, domin
                // history bata yin zurfi — ta yadda back (daga koda ina)
                // ya koma home ta hanya daya kadai, ba sarkar sauran
                // pages da aka ziyarta ba.
                const isHomeTransition = (currentPath === 'social.html' || targetPath === 'social.html');
                if (isHomeTransition) {
                    window.history.pushState({ nexusRoute: targetPath }, '', url);
                } else {
                    window.history.replaceState({ nexusRoute: targetPath }, '', url);
                }
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
            hideNavProgress();
            if (pendingNav) {
                const next = pendingNav;
                pendingNav = null;
                navigateTo(next.url, next.options);
            }
        }
    }

    // ------------------------------------------------------------
    // 4.5) PREFETCH-ON-TOUCH — domin SPA nav ya ji "instant".
    //    Da zaran yatsan mai amfani ya TAƁA (ko linzamin kwamfuta
    //    ya SHIGO) wani [data-spa-link]/[data-page] link, mu FARA
    //    (a) fetch HTML dinsa mu ajiye a pageCache, da (b) <link
    //    rel="prefetch"> domin CSS/JS dinsa su shiga HTTP cache na
    //    browser — DUKA BABU KUNNA su a wannan lokacin (ba mu saka
    //    su a matsayin live <link>/<script> ba tukuna, domin kada
    //    CSS/JS na sabuwar page su fara rinjayar page da muke kai
    //    tsaye a ciki YANZU). Ainihin kunna su (loadStylesheetOnce/
    //    loadScriptOnce) yana faruwa daga baya, a lokacin ainihin
    //    navigateTo() — sai dai a wannan karon sun riga sun kasance
    //    a HTTP cache, don haka suna zuwa nan take, babu network.
    // ------------------------------------------------------------
    const prefetchedPaths = new Set();

    function prefetchPage(targetPath) {
        if (!targetPath || targetPath === currentPath || prefetchedPaths.has(targetPath)) return;

        // Girmama Data Saver / hanyar sadarwa mai jinkiri — kada mu
        // batar da bandwidth din mai amfani idan yana kan slow/limited
        // connection ko ya kunna Data Saver.
        const conn = navigator.connection;
        if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;

        prefetchedPaths.add(targetPath);

        if (!pageCache.has(targetPath)) {
            fetch(targetPath, { credentials: 'same-origin' })
                .then(function (res) { return res.ok ? res.text() : null; })
                .then(function (html) { if (html) pageCache.set(targetPath, html); })
                .catch(function () { prefetchedPaths.delete(targetPath); });
        }

        const assets = [].concat(PAGE_SCRIPTS[targetPath] || [], PAGE_STYLES[targetPath] || []);
        assets.forEach(function (url) {
            if (!url || loadedScripts.has(url) || loadedStyles.has(url)) return;
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
        });
    }

    function onLinkWarm(e) {
        if (!e.target || typeof e.target.closest !== 'function') return;
        const el = e.target.closest('[data-spa-link], [data-page]');
        if (!el) return;
        const url = el.getAttribute('data-spa-link') || el.getAttribute('data-page');
        if (!url) return;
        prefetchPage(normalizePath(new URL(url, window.location.href).pathname));
    }

    document.addEventListener('touchstart', onLinkWarm, { passive: true });
    document.addEventListener('mouseenter', onLinkWarm, true); // capture — mouseenter baya "bubble"

    // ------------------------------------------------------------
    // 5) Link interception — any element with [data-spa-link]
    //    or [data-page] (footer icons already use data-page).
    // ------------------------------------------------------------
    function onDocumentClick(e) {
        if (!e.target || typeof e.target.closest !== 'function') return;
        const el = e.target.closest('[data-spa-link], [data-page]');
        if (!el) return;

        const url = el.getAttribute('data-spa-link') || el.getAttribute('data-page');
        if (!url) return;

        e.preventDefault();

        // Home icon: KOWACE click ya kamata ya "refresh" feed, koda
        // muna can tuni (wanda a al'ada navigateTo ke watsi da shi domin
        // "same page tapped again"). Idan muna can tuni, mu kira refresh
        // kai tsaye; idan a'a, navigateTo na yau da kullum zai kai mu can
        // sannan initSocialPage() DA KANSA zai riga ya bayar da sabon feed.
        const targetPath = normalizePath(new URL(url, window.location.href).pathname);
        if (targetPath === 'social.html' && currentPath === 'social.html') {
            if (typeof window.refreshSocialFeed === 'function') window.refreshSocialFeed();
            return;
        }

        navigateTo(url);
    }

    // ------------------------------------------------------------
    // 6) Back/forward button support — Instagram-style:
    //    * Daga KOWACE page (ba home ba), back = koma home kai tsaye.
    //    * A home: press na FARKO = refresh feed + "Tap again to exit"
    //      toast. Press na BIYU (cikin ~2.2s) = tafi login.html.
    // ------------------------------------------------------------
    let _homeBackArmed = false;
    let _homeBackTimer = null;

    function _showTapAgainToast() {
        let toast = document.getElementById('nx-tap-again-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'nx-tap-again-toast';
            toast.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);' +
                'background:rgba(30,30,30,0.95);color:#fff;padding:10px 22px;border-radius:24px;' +
                'font-size:14px;z-index:99999;box-shadow:0 2px 12px rgba(0,0,0,0.35);opacity:0;' +
                'transition:opacity 0.2s ease;pointer-events:none;';
            document.body.appendChild(toast);
        }
        toast.textContent = 'Tap again to exit';
        toast.style.opacity = '1';
        clearTimeout(toast._nxHideTimer);
        toast._nxHideTimer = setTimeout(function () { toast.style.opacity = '0'; }, 2000);
    }

    function _armHomeBackBuffer() {
        // Sa extra dummy entry domin popstate na gaba (yayin muna home)
        // ya kama mu, maimakon ya bar app din/tab din ya fita/rufe.
        window.history.pushState({ nexusRoute: 'social.html', _homeBuffer: true }, '', window.location.href);
    }

    window.addEventListener('popstate', function (e) {
        if (window.__npProfileOverlay) { window.__npProfileOverlay = false; return; }
        if (window.NexusOverlay && window.NexusOverlay.isOpen && window.NexusOverlay.isOpen()) return;

        const poppedPath = (e.state && e.state.nexusRoute) || normalizePath(window.location.pathname);
        const wasOnHome = (currentPath === 'social.html');

        if (poppedPath !== 'social.html') {
            // Ko da menene aka samu a history state, Instagram-style back
            // koyaushe ya kai mutum HOME — ba jerin sauran pages ba.
            navigateTo('social.html', { pushHistory: false }).then(function () {
                _armHomeBackBuffer();
            });
            return;
        }

        if (wasOnHome) {
            // An riga an kasance a home — wannan press din back NE YAYIN
            // MUNA CAN, ba "isowa home" ba.
            if (!_homeBackArmed) {
                _homeBackArmed = true;
                if (typeof window.refreshSocialFeed === 'function') window.refreshSocialFeed();
                _showTapAgainToast();
                _armHomeBackBuffer();
                clearTimeout(_homeBackTimer);
                _homeBackTimer = setTimeout(function () { _homeBackArmed = false; }, 2200);
            } else {
                clearTimeout(_homeBackTimer);
                _homeBackArmed = false;
                window.location.href = 'login.html';
            }
        } else {
            // Isowa home daga wata page (via back) — navigateTo na yau da
            // kullum, initSocialPage() da kansa zai bayar da sabon feed.
            navigateTo('social.html', { pushHistory: false }).then(function () {
                _armHomeBackBuffer();
            });
        }
    });
    // ------------------------------------------------------------
    // 7) Init.
    // ------------------------------------------------------------
   document.addEventListener('click', onDocumentClick);
  // Register initial page's history state so popstate works from the start.
    window.history.replaceState({ nexusRoute: currentPath }, '', window.location.href);
    if (currentPath === 'social.html') { _armHomeBackBuffer(); }
// Proactively warm manyan pages (social, shop) tun farko, STAGGERED
    // (400ms tazara) don kaucewa cunkoson bandwidth — zero-second nav.
    ['social.html', 'shop.html', 'videos.html']
        .filter(function (p) { return p !== currentPath; })
        .forEach(function (p, i) {
            setTimeout(function () { prefetchPage(p); }, i * 400);
        });

    // shop.js yana amfani da dynamic import() na firebase 11 (ESM) wanda
    // PAGE_SCRIPTS/prefetchPage BA SU SANI BA — sa modulepreload domin
    // wadannan ma su fara download tun farko, ba jiran click ba.
    if (currentPath !== 'shop.html') {
        ['https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js',
         'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js'
        ].forEach(function (u) {
            const link = document.createElement('link');
            link.rel = 'modulepreload';
            link.href = u;
            document.head.appendChild(link);
        });
    }
 })();
