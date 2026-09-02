/* ============================================================
   shop.js — page logic for shop.html, extracted out of the page
   so the SPA router (router.js) can load and (re)run it whenever
   someone navigates to shop.html without a full page reload.
   ============================================================ */
(function(){

/* ---------- Compat SDK init (Realtime Database, used by the
   My Business dashboard below). Runs once — firebase.apps stays
   populated across SPA navigations, so the guard keeps this safe
   to load more than once if shop.js is ever re-included. ---------- */
        const firebaseConfigCompat = {
            apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
            authDomain: "oryzon-50ea4.firebaseapp.com",
            databaseURL: "https://oryzon-50ea4-default-rtdb.firebaseio.com",
            projectId: "oryzon-50ea4",
            storageBucket: "oryzon-50ea4.firebasestorage.app",
            messagingSenderId: "782106742622",
            appId: "1:782106742622:web:902d512bfe42dd4cf289cf"
        };
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfigCompat); }


/* ---------- Marketplace (top of page: search, verticals, product
   grid, near-me). Wrapped in an async function so it can be re-run
   as this page's init() every time the router navigates back here,
   and so the Firestore modular SDK can be dynamic-import()'d (this
   is a plain script, not type="module", which is what router.js's
   loadScriptOnce() requires). ---------- */
let shopPageUnsubscribes = [];
let _shopFbApp = null, _shopDb = null;

async function bootShopMarketplace() {
    shopPageUnsubscribes.forEach(fn => { try { fn(); } catch (e) {} });
    shopPageUnsubscribes = [];
    try {

        const _withTimeout = (p, ms) => Promise.race([
            p,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms))
        ]);
        const { initializeApp, getApps, getApp } = await _withTimeout(import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js"), 8000);
        const { getFirestore, collection, query, orderBy, onSnapshot, where, getDocs, limit } = await _withTimeout(import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js"), 8000);
        const firebaseConfig = {
            apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
            authDomain: "oryzon-50ea4.firebaseapp.com",
            projectId: "oryzon-50ea4",
            storageBucket: "oryzon-50ea4.firebasestorage.app",
            messagingSenderId: "782106742622",
            appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
            measurementId: "G-K5085DLL2W"
        };

        // initializeApp() throws "app/duplicate-app" if a default app already
        // exists — which can happen either because shop.js itself already
        // booted once this session, OR because another page (nexus-core.js
        // on social.html/videos.html/me.html/etc.) already initialized the
        // same default app before the user ever navigated here. Checking
        // getApps() (global, not just our own local flag) covers both cases.
        if (!_shopFbApp) {
            _shopFbApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
            _shopDb = getFirestore(_shopFbApp);
        }
        const db = _shopDb;
        const marketGrid = document.getElementById('marketGrid');
        const fabHeader = document.getElementById('fabNearMe');
        const fabFloat = document.getElementById('fabNearMeFloat');
        const nearMeControls = [fabHeader, fabFloat];
        const filterBarSlot = document.getElementById('filterBarSlot');

        function setNearMeState(state, on) {
            nearMeControls.forEach(el => el && el.classList.toggle(state, on));
        }

        /* ---------- 1. NEURAL MENU: vertical marketplace dropdown ---------- */
        // This page belongs to the "fashion" vertical. Duplicate this file for each
        // new vertical (fabrics.html, birds.html, ...) and just change CURRENT_VERTICAL.
        const CURRENT_VERTICAL = 'fashion';

        const VERTICALS = [
            { id: 'fashion',     label: 'Fashion',      href: 'shop.html',
              icon: '<circle cx="12" cy="5" r="1.5"/><path d="M12 6.5v2M4 20h16M4 20l7.3-7.1a1 1 0 0 1 1.4 0L20 20"/>' },
            { id: 'fabrics',     label: 'Fabrics',      href: 'fabrics.html',
              icon: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M8 7v10M13 7v10"/>' },
            { id: 'birds',       label: 'Birds & Pets', href: 'birds.html',
              icon: '<circle cx="17" cy="8" r="1.7"/><path d="M3 16c4-7 11-7 15-3M17 6l3-1.5-1 3"/>' },
            { id: 'electronics', label: 'Electronics',  href: 'electronics.html',
              icon: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/>' },
            { id: 'vehicles',    label: 'Vehicles',     href: 'vehicles.html',
              icon: '<path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7" cy="17" r="1.4"/><circle cx="17" cy="17" r="1.4"/>' },
            { id: 'home',        label: 'Home & Living', href: 'home.html',
              icon: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>' },
            { id: 'poultry',     label: 'Poultry Market', href: 'poultry.html',
              icon: '<path d="M9 8c0-2 1.5-3 3-3s3 1 3 3c0 1-.5 2-1.5 2.5A4 4 0 0 1 16 14a4 4 0 0 1-8 0 4 4 0 0 1 2.5-3.5C9.5 10 9 9 9 8z"/><path d="M10 20l.5-3M14 20l-.5-3M5.5 11.5L8 12"/>' },
            { id: 'used-market', label: 'Used Market',  href: 'used-market.html',
              icon: '<path d="M20.5 12.5l-8-8H4v8.5l8 8a2 2 0 0 0 2.8 0l5.7-5.7a2 2 0 0 0 0-2.8z"/><circle cx="8.5" cy="8.5" r="1.5"/>' },
        ];

        const trigger = document.getElementById('verticalTrigger');
        const triggerIcon = document.getElementById('triggerIcon');
        const currentLabel = document.getElementById('currentVerticalLabel');
        const overlay = document.getElementById('dropdownOverlay');
        const dropdown = document.getElementById('verticalDropdown');
        const dropdownList = document.getElementById('dropdownList');
        let menuOpen = false;

        function initTriggerAndMenu() {
            const current = VERTICALS.find(v => v.id === CURRENT_VERTICAL) || VERTICALS[0];
            triggerIcon.innerHTML = current.icon;
            currentLabel.textContent = current.label;

            dropdownList.innerHTML = VERTICALS.map((v, i) => `
                <div class="drop-item ${v.id === CURRENT_VERTICAL ? 'active' : ''}" data-index="${i}">
                    <div class="drop-node">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${v.icon}</svg>
                    </div>
                    <span class="drop-label">${v.label}</span>
                    <div class="drop-pulse"></div>
                </div>
            `).join('');

            dropdownList.querySelectorAll('.drop-item').forEach((el, i) => {
                el.style.transitionDelay = (i * 45) + 'ms';
                el.addEventListener('click', () => {
                    const target = VERTICALS[i];
                    closeMenu();
                    if (target.id === CURRENT_VERTICAL) return;
                    setTimeout(() => { NexusRouter.navigateTo(target.href); }, 200);
                });
            });
        }
        initTriggerAndMenu();

        function openMenu() {
            menuOpen = true;
            trigger.classList.add('open');
            overlay.classList.add('open');
            dropdown.classList.add('open');
        }
        function closeMenu() {
            menuOpen = false;
            trigger.classList.remove('open');
            overlay.classList.remove('open');
            dropdown.classList.remove('open');
        }
        trigger.addEventListener('click', () => { menuOpen ? closeMenu() : openMenu(); });
        overlay.addEventListener('click', closeMenu);

        /* ---------- 2. TOAST ---------- */
        function showToast(message, duration = 3000) {
            const el = document.createElement('div');
            el.className = 'toast';
            el.textContent = message;
            document.body.appendChild(el);
            requestAnimationFrame(() => el.classList.add('show'));
            setTimeout(() => {
                el.classList.remove('show');
                setTimeout(() => el.remove(), 350);
            }, duration);
        }

        /* ---------- 3. PRODUCT DATA + RENDERING ---------- */
        // Default products (used when Firestore is empty/unreachable). Includes
        // approximate city coordinates so "Near Me" works out of the box for demos.
        const defaultProducts = [
            { id: "def1", name: "Hot pant and Bra set", price: "₦27,000", location: "Kano", lat: 12.0022, lng: 8.5920, image: "https://via.placeholder.com/300/111/00F2FF?text=Item+1" },
            { id: "def2", name: "Ambassador Fabric", price: "₦40,000", location: "Kano", lat: 12.0022, lng: 8.5920, image: "https://via.placeholder.com/300/111/50FA7B?text=Item+2" },
            { id: "def3", name: "Cyber Suit v2.0 Limited", price: "₦45,000", location: "Lagos", lat: 6.5244, lng: 3.3792, image: "https://via.placeholder.com/300/111/ffffff?text=Item+3" },
            { id: "def4", name: "Master AI Access Key", price: "₦10,000", location: "Abuja", lat: 9.0765, lng: 7.3986, image: "https://via.placeholder.com/300/111/FFD700?text=Item+4" },
            { id: "def5", name: "Core X Processor", price: "₦85,000", location: "Kano", lat: 12.0022, lng: 8.5920, image: "https://via.placeholder.com/300/111/FF5555?text=Item+5" },
            { id: "def6", name: "Premium Bra Set", price: "₦4,000", location: "Kano", lat: 12.0022, lng: 8.5920, image: "https://via.placeholder.com/300/111/BD93F9?text=Item+6" },
            { id: "def7", name: "Sheer Lace Set", price: "₦12,000", location: "Kaduna", lat: 10.5222, lng: 7.4383, image: "https://via.placeholder.com/300/111/50FA7B?text=Item+7" },
            { id: "def8", name: "Lexis Brocade White", price: "₦18,000", location: "Zaria", lat: 11.0804, lng: 7.7076, image: "https://via.placeholder.com/300/111/00F2FF?text=Item+8" }
        ];

        let allProducts = [];
        let nearMeActive = false;

        function goToProduct(product) {
            recordProductView(product);
            openProductsPageOverlay(product.id);
        }
        window.goToProduct = goToProduct;

        function renderProducts(list, opts = {}) {
            marketGrid.innerHTML = "";
            if (!list.length) {
                marketGrid.innerHTML = `<div class="empty-state">Nothing here yet.<br>Be the first to sell!</div>`;
                return;
            }
            list.forEach((product) => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.onclick = () => goToProduct(product);

                const distanceBadge = (opts.showDistance && product._distance != null)
                    ? `<div class="distance-badge">${product._distance < 1 ? Math.round(product._distance * 1000) + 'm' : product._distance.toFixed(1) + 'km'}</div>`
                    : '';

                card.innerHTML = `
                    <div class="image-container">
                        <img src="${product.image}" class="product-image" loading="lazy">
                        <div class="price-badge">${product.price}</div>
                        ${distanceBadge}
                    </div>
                    <div class="product-footer">
                        <span class="product-name">${product.name}</span>
                        <span class="product-location">${product.location}</span>
                    </div>
                `;
                marketGrid.appendChild(card);
            });
        }

        /* ---------- SEARCH OVERLAY (full page) ---------- */
        const searchFullOverlay = document.getElementById('searchFullOverlay');
        const searchOverlayInput = document.getElementById('searchOverlayInput');
        const searchOverlayResults = document.getElementById('searchOverlayResults');

        const RECENT_SEARCH_KEY = 'nexus_recent_searches';
        const BROWSING_HISTORY_KEY = 'nexus_browsing_history';

        function getRecentSearches() {
            try { return JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY)) || []; }
            catch (e) { return []; }
        }
        function saveRecentSearch(term) {
            term = (term || '').trim();
            if (!term) return;
            let list = getRecentSearches().filter(t => t.toLowerCase() !== term.toLowerCase());
            list.unshift(term);
            localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(list.slice(0, 8)));
        }
        window.clearRecentSearches = function () {
            localStorage.removeItem(RECENT_SEARCH_KEY);
            renderSearchLanding();
        };

        function getBrowsingHistory() {
            try { return JSON.parse(localStorage.getItem(BROWSING_HISTORY_KEY)) || []; }
            catch (e) { return []; }
        }
        function recordProductView(product) {
            let list = getBrowsingHistory().filter(p => p.id !== product.id);
            list.unshift({ id: product.id, name: product.name, price: product.price, image: product.image, location: product.location });
            localStorage.setItem(BROWSING_HISTORY_KEY, JSON.stringify(list.slice(0, 10)));
        }

        function productCardHTML(p) {
            return `
                <div class="product-card" onclick='goToProduct(${JSON.stringify(p)})'>
                    <div class="image-container">
                        <img src="${p.image}" class="product-image" loading="lazy">
                        <div class="price-badge">${p.price}</div>
                    </div>
                    <div class="product-footer">
                        <span class="product-name">${p.name}</span>
                        <span class="product-location">${p.location}</span>
                    </div>
                </div>`;
        }

        function browsingStripCardHTML(p) {
            return `
                <div class="product-card" onclick="openBrowsingHistoryOverlay()">
                    <div class="image-container">
                        <img src="${p.image}" class="product-image" loading="lazy">
                        <div class="price-badge">${p.price}</div>
                    </div>
                    <div class="product-footer">
                        <span class="product-name">${p.name}</span>
                        <span class="product-location">${p.location}</span>
                    </div>
                </div>`;
        }

        function renderSearchLanding() {
            const recents = getRecentSearches();
            const history = getBrowsingHistory();

            if (!recents.length) {
                searchOverlayResults.innerHTML = `
                    <div class="so-empty-state">
                        <div class="so-empty-icon">🔍📄</div>
                        <div class="so-empty-text">You don't have any saved searches. Try searching for something new.</div>
                    </div>`;
                return;
            }

            let html = `
                <div class="so-section-head">
                    <div class="so-section-title">Recently searched</div>
                    <button class="so-clear-all" onclick="clearRecentSearches()">🗑️</button>
                </div>
                <div class="so-recent-row">
                    ${recents.map(t => `<div class="so-recent-pill" onclick="selectRecentSearch(${JSON.stringify(t)})">${t}</div>`).join('')}
                </div>`;

            if (history.length) {
                html += `
                    <div class="so-section-head">
                        <div class="so-section-title">Browsing history</div>
                    </div>
                    <div class="so-browsing-strip">
                        ${history.map(browsingStripCardHTML).join('')}
                    </div>`;
            }
            searchOverlayResults.innerHTML = html;
        }

        window.selectRecentSearch = function (term) {
            searchOverlayInput.value = term;
            commitOverlaySearch(term);
        };

        window.commitOverlaySearch = function (value) {
            const q = value.trim().toLowerCase();
            const marketMatch = VERTICALS.find(v => v.label.toLowerCase() === q);
            if (marketMatch) {
                NexusRouter.navigateTo(marketMatch.href);
                return;
            }
            saveRecentSearch(value);
            const matches = allProducts.filter(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.location || '').toLowerCase().includes(q)
            );
            if (!matches.length) {
                searchOverlayResults.innerHTML = `<div class="search-overlay-hint">No results found for "${value}".</div>`;
                return;
            }
            searchOverlayResults.innerHTML = `<div class="market-grid" style="padding:0;">${matches.map(productCardHTML).join('')}</div>`;
        };

        window.openSearchOverlay = function () {
            searchFullOverlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            renderSearchLanding();
            setTimeout(() => searchOverlayInput.focus(), 200);
        };

        window.closeSearchOverlay = function () {
            searchFullOverlay.classList.remove('open');
            document.body.style.overflow = '';
            searchOverlayInput.value = '';
        };

        function renderBrowsingHistoryFull() {
            const history = getBrowsingHistory();
            const container = document.getElementById('browsingHistoryResults');
            if (!history.length) {
                container.innerHTML = `<div class="search-overlay-hint">No browsing history yet.</div>`;
                return;
            }
            container.innerHTML = `<div class="market-grid" style="padding:0;">${history.map(productCardHTML).join('')}</div>`;
        }

        window.openBrowsingHistoryOverlay = function () {
            document.getElementById('browsingHistoryOverlay').classList.add('open');
            document.body.style.overflow = 'hidden';
            renderBrowsingHistoryFull();
        };

        window.closeBrowsingHistoryOverlay = function () {
            document.getElementById('browsingHistoryOverlay').classList.remove('open');
            document.body.style.overflow = '';
        };

        function buildSuggestions(q) {
            const pool = new Set();
            allProducts.forEach(p => {
                if ((p.name || '').toLowerCase().includes(q)) pool.add(p.name);
                if ((p.location || '').toLowerCase().includes(q)) pool.add(p.location);
            });
            VERTICALS.forEach(v => { if (v.label.toLowerCase().includes(q)) pool.add(v.label); });
            return Array.from(pool).slice(0, 8);
        }

        function suggestionRowHTML(term, q) {
            const idx = term.toLowerCase().indexOf(q);
            const display = idx === 0
                ? `${term.slice(0, q.length)}<strong>${term.slice(q.length)}</strong>`
                : term;
            return `
              <div class="so-suggestion-item" onclick='selectRecentSearch(${JSON.stringify(term)})'>  
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span>${display}</span>
                </div>`;
        }

        window.handleOverlaySearch = function (value) {
            const q = value.trim().toLowerCase();
            if (!q) {
                renderSearchLanding();
                return;
            }
            const suggestions = buildSuggestions(q);
            if (!suggestions.length) {
                searchOverlayResults.innerHTML = `<div class="search-overlay-hint">No results found for "${value}".</div>`;
                return;
            }
            searchOverlayResults.innerHTML = suggestions.map(s => suggestionRowHTML(s, q)).join('');
        };
        searchFullOverlay.addEventListener('click', (e) => {
            if (e.target === searchFullOverlay) closeSearchOverlay();
        });

        function listenToMarketplace() {
            try {
                const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
                shopPageUnsubscribes.push(onSnapshot(q, (snapshot) => {
                    const liveProducts = [];
                    snapshot.forEach((doc) => liveProducts.push({ id: doc.id, ...doc.data() }));
                    allProducts = liveProducts.length ? liveProducts : defaultProducts;
                    if (!nearMeActive) renderProducts(allProducts);
                }, (error) => {
                    console.warn("Firebase listener blocked, showing defaults:", error);
                    allProducts = defaultProducts;
                    if (!nearMeActive) renderProducts(allProducts);
                }));
            } catch (error) {
                console.warn("Firebase init failed, showing defaults:", error);
                allProducts = defaultProducts;
                renderProducts(allProducts);
            }
        }
        listenToMarketplace();

        /* ---------- SELL ⇄ MY BUSINESS ----------
           A user becomes a vendor the first time they post a product.
           Since sell.html's exact field name isn't visible to me, this checks
           every common naming convention for the seller identifier so it
           works regardless of which one sell.html actually uses. If none of
           these match your real field name, tell me the exact field name
           sell.html writes and I'll narrow this to just that one. */
        async function checkVendorStatus() {
            const username = localStorage.getItem("nexus_user_session");
            const pill = document.getElementById('sellPill');
            const label = document.getElementById('sellPillText');
            if (!username || !pill || !label) return;

            const candidateFields = ['sellerUsername', 'seller', 'sellerId', 'vendorUsername', 'vendorId', 'ownerUsername', 'username'];
            try {
                const checks = candidateFields.map(field =>
                    getDocs(query(collection(db, "products"), where(field, "==", username), limit(1)))
                        .then(snap => !snap.empty)
                        .catch(() => false)
                );
                const results = await Promise.all(checks);
                const isVendor = results.some(Boolean);

                if (isVendor) {
                    label.textContent = 'My Business';
                    pill.onclick = () => { if (typeof openMyBusinessDashboard === 'function') openMyBusinessDashboard(); };
                } else {
                    label.textContent = 'Sell';
                    pill.onclick = () => { NexusRouter.navigateTo('sell.html'); };
                }
            } catch (err) {
                console.warn('Could not check vendor status:', err.message);
            }
        }
        checkVendorStatus();

        /* ---------- 4. NEAR ME (geolocation + escalating radius search) ---------- */
        const RADIUS_STEPS_KM = [2, 5, 10, 20, 50, 100];

        function getDistanceKm(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        function getUserLocation() {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) { reject(new Error('unsupported')); return; }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    (err) => reject(err),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                );
            });
        }

        function showFilterBar(radiusKm, count) {
            filterBarSlot.innerHTML = `
                <div class="nearme-filterbar">
                    <span>📍 ${count} abu a cikin ${radiusKm}km daga wurin ka</span>
                    <button id="clearNearMe">Share</button>
                </div>
            `;
            document.getElementById('clearNearMe').addEventListener('click', deactivateNearMe);
        }
        function hideFilterBar() { filterBarSlot.innerHTML = ''; }

        function pulseFabSuccess() {
            setNearMeState('flash', true);
            setTimeout(() => setNearMeState('flash', false), 650);
        }

        window.toggleNearMe = async function () {
            if (nearMeActive) { deactivateNearMe(); return; }

            setNearMeState('loading', true);
            let userCoords;
            try {
                userCoords = await getUserLocation();
            } catch (err) {
                setNearMeState('loading', false);
                showToast("Ba a samu izinin wurin ka ba. Ka bude Settings ka kunna Location.");
                return;
            }

            const geoTagged = allProducts.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
            let found = [];
            let usedRadius = null;

            for (const radius of RADIUS_STEPS_KM) {
                found = geoTagged
                    .map(p => ({ ...p, _distance: getDistanceKm(userCoords.lat, userCoords.lng, p.lat, p.lng) }))
                    .filter(p => p._distance <= radius)
                    .sort((a, b) => a._distance - b._distance);
                if (found.length) { usedRadius = radius; break; }
            }

            setNearMeState('loading', false);

            if (!found.length) {
                showToast(`Babu wani abu a kusa da kai har zuwa ${RADIUS_STEPS_KM[RADIUS_STEPS_KM.length - 1]}km.`);
                return;
            }

            nearMeActive = true;
            setNearMeState('active', true);
            pulseFabSuccess();
            showFilterBar(usedRadius, found.length);
            renderProducts(found, { showDistance: true });
        };

        function deactivateNearMe() {
            nearMeActive = false;
            setNearMeState('active', false);
            hideFilterBar();
            renderProducts(allProducts);
        }
    } catch (err) {
        console.error('bootShopMarketplace failed:', err);
    }
}

function destroyShopMarketplace() {
    shopPageUnsubscribes.forEach(fn => { try { fn(); } catch (e) {} });
    shopPageUnsubscribes = [];
    closeProductsPageOverlay();
    closeStoreFrontOverlay();
}

        function moveSwitch(dest) {
            document.body.className = 'pos-' + dest;
            setTimeout(() => {
                if (dest === 'social') NexusRouter.navigateTo('social.html');
                if (dest === 'shop') NexusRouter.navigateTo('shop.html');
                if (dest === 'earn') NexusRouter.navigateTo('earn.html');
            }, 300);
        }

/* ---------- MY BUSINESS DASHBOARD (ported verbatim from services.html) ----------
   Pure function/data declarations (no immediate DOM queries at load time),
   so — unlike the marketplace block above — this doesn't need to be re-run
   on every SPA visit; it only springs into action when its own buttons
   (inside #page-content) are clicked. ---------- */
        /* ===== MY BUSINESS DASHBOARD — ported verbatim from services.html =====
           Runs on the classic firebase.* (compat) API against Realtime Database
           at providers/{username}/... — same Firebase project as the rest of Nexus. */
const CURRENCIES = [
    { code: "AED", symbol: "د.إ", label: "UAE Dirham", flag: "🇦🇪" },
    { code: "AFN", symbol: "؋", label: "Afghan Afghani", flag: "🇦🇫" },
    { code: "ALL", symbol: "L", label: "Albanian Lek", flag: "🇦🇱" },
    { code: "AMD", symbol: "֏", label: "Armenian Dram", flag: "🇦🇲" },
    { code: "ANG", symbol: "ƒ", label: "Netherlands Antillean Guilder", flag: "🇨🇼" },
    { code: "AOA", symbol: "Kz", label: "Angolan Kwanza", flag: "🇦🇴" },
    { code: "ARS", symbol: "$", label: "Argentine Peso", flag: "🇦🇷" },
    { code: "AUD", symbol: "$", label: "Australian Dollar", flag: "🇦🇺" },
    { code: "AWG", symbol: "ƒ", label: "Aruban Florin", flag: "🇦🇼" },
    { code: "AZN", symbol: "₼", label: "Azerbaijani Manat", flag: "🇦🇿" },
    { code: "BAM", symbol: "KM", label: "Bosnia-Herzegovina Mark", flag: "🇧🇦" },
    { code: "BBD", symbol: "$", label: "Barbadian Dollar", flag: "🇧🇧" },
    { code: "BDT", symbol: "৳", label: "Bangladeshi Taka", flag: "🇧🇩" },
    { code: "BGN", symbol: "лв", label: "Bulgarian Lev", flag: "🇧🇬" },
    { code: "BHD", symbol: ".د.ب", label: "Bahraini Dinar", flag: "🇧🇭" },
    { code: "BIF", symbol: "FBu", label: "Burundian Franc", flag: "🇧🇮" },
    { code: "BMD", symbol: "$", label: "Bermudan Dollar", flag: "🇧🇲" },
    { code: "BND", symbol: "$", label: "Brunei Dollar", flag: "🇧🇳" },
    { code: "BOB", symbol: "Bs.", label: "Bolivian Boliviano", flag: "🇧🇴" },
    { code: "BRL", symbol: "R$", label: "Brazilian Real", flag: "🇧🇷" },
    { code: "BSD", symbol: "$", label: "Bahamian Dollar", flag: "🇧🇸" },
    { code: "BTN", symbol: "Nu.", label: "Bhutanese Ngultrum", flag: "🇧🇹" },
    { code: "BWP", symbol: "P", label: "Botswanan Pula", flag: "🇧🇼" },
    { code: "BYN", symbol: "Br", label: "Belarusian Ruble", flag: "🇧🇾" },
    { code: "BZD", symbol: "$", label: "Belize Dollar", flag: "🇧🇿" },
    { code: "CAD", symbol: "$", label: "Canadian Dollar", flag: "🇨🇦" },
    { code: "CDF", symbol: "FC", label: "Congolese Franc", flag: "🇨🇩" },
    { code: "CHF", symbol: "Fr", label: "Swiss Franc", flag: "🇨🇭" },
    { code: "CLP", symbol: "$", label: "Chilean Peso", flag: "🇨🇱" },
    { code: "CNY", symbol: "¥", label: "Chinese Yuan", flag: "🇨🇳" },
    { code: "COP", symbol: "$", label: "Colombian Peso", flag: "🇨🇴" },
    { code: "CRC", symbol: "₡", label: "Costa Rican Colón", flag: "🇨🇷" },
    { code: "CUP", symbol: "$", label: "Cuban Peso", flag: "🇨🇺" },
    { code: "CVE", symbol: "$", label: "Cape Verdean Escudo", flag: "🇨🇻" },
    { code: "CZK", symbol: "Kč", label: "Czech Koruna", flag: "🇨🇿" },
    { code: "DJF", symbol: "Fdj", label: "Djiboutian Franc", flag: "🇩🇯" },
    { code: "DKK", symbol: "kr", label: "Danish Krone", flag: "🇩🇰" },
    { code: "DOP", symbol: "$", label: "Dominican Peso", flag: "🇩🇴" },
    { code: "DZD", symbol: "دج", label: "Algerian Dinar", flag: "🇩🇿" },
    { code: "EGP", symbol: "£", label: "Egyptian Pound", flag: "🇪🇬" },
    { code: "ERN", symbol: "Nfk", label: "Eritrean Nakfa", flag: "🇪🇷" },
    { code: "ETB", symbol: "Br", label: "Ethiopian Birr", flag: "🇪🇹" },
    { code: "EUR", symbol: "€", label: "Euro", flag: "🇪🇺" },
    { code: "FJD", symbol: "$", label: "Fijian Dollar", flag: "🇫🇯" },
    { code: "GBP", symbol: "£", label: "British Pound", flag: "🇬🇧" },
    { code: "GEL", symbol: "₾", label: "Georgian Lari", flag: "🇬🇪" },
    { code: "GHS", symbol: "₵", label: "Ghanaian Cedi", flag: "🇬🇭" },
    { code: "GMD", symbol: "D", label: "Gambian Dalasi", flag: "🇬🇲" },
    { code: "GNF", symbol: "FG", label: "Guinean Franc", flag: "🇬🇳" },
    { code: "GTQ", symbol: "Q", label: "Guatemalan Quetzal", flag: "🇬🇹" },
    { code: "GYD", symbol: "$", label: "Guyanaese Dollar", flag: "🇬🇾" },
    { code: "HKD", symbol: "$", label: "Hong Kong Dollar", flag: "🇭🇰" },
    { code: "HNL", symbol: "L", label: "Honduran Lempira", flag: "🇭🇳" },
    { code: "HRK", symbol: "kn", label: "Croatian Kuna", flag: "🇭🇷" },
    { code: "HTG", symbol: "G", label: "Haitian Gourde", flag: "🇭🇹" },
    { code: "HUF", symbol: "Ft", label: "Hungarian Forint", flag: "🇭🇺" },
    { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah", flag: "🇮🇩" },
    { code: "ILS", symbol: "₪", label: "Israeli New Shekel", flag: "🇮🇱" },
    { code: "INR", symbol: "₹", label: "Indian Rupee", flag: "🇮🇳" },
    { code: "IQD", symbol: "ع.د", label: "Iraqi Dinar", flag: "🇮🇶" },
    { code: "IRR", symbol: "﷼", label: "Iranian Rial", flag: "🇮🇷" },
    { code: "ISK", symbol: "kr", label: "Icelandic Króna", flag: "🇮🇸" },
    { code: "JMD", symbol: "$", label: "Jamaican Dollar", flag: "🇯🇲" },
    { code: "JOD", symbol: "د.ا", label: "Jordanian Dinar", flag: "🇯🇴" },
    { code: "JPY", symbol: "¥", label: "Japanese Yen", flag: "🇯🇵" },
    { code: "KES", symbol: "KSh", label: "Kenyan Shilling", flag: "🇰🇪" },
    { code: "KGS", symbol: "с", label: "Kyrgystani Som", flag: "🇰🇬" },
    { code: "KHR", symbol: "៛", label: "Cambodian Riel", flag: "🇰🇭" },
    { code: "KMF", symbol: "CF", label: "Comorian Franc", flag: "🇰🇲" },
    { code: "KRW", symbol: "₩", label: "South Korean Won", flag: "🇰🇷" },
    { code: "KWD", symbol: "د.ك", label: "Kuwaiti Dinar", flag: "🇰🇼" },
    { code: "KZT", symbol: "₸", label: "Kazakhstani Tenge", flag: "🇰🇿" },
    { code: "LAK", symbol: "₭", label: "Laotian Kip", flag: "🇱🇦" },
    { code: "LBP", symbol: "ل.ل", label: "Lebanese Pound", flag: "🇱🇧" },
    { code: "LKR", symbol: "Rs", label: "Sri Lankan Rupee", flag: "🇱🇰" },
    { code: "LRD", symbol: "$", label: "Liberian Dollar", flag: "🇱🇷" },
    { code: "LSL", symbol: "L", label: "Lesotho Loti", flag: "🇱🇸" },
    { code: "LYD", symbol: "ل.د", label: "Libyan Dinar", flag: "🇱🇾" },
    { code: "MAD", symbol: "د.م.", label: "Moroccan Dirham", flag: "🇲🇦" },
    { code: "MDL", symbol: "L", label: "Moldovan Leu", flag: "🇲🇩" },
    { code: "MGA", symbol: "Ar", label: "Malagasy Ariary", flag: "🇲🇬" },
    { code: "MKD", symbol: "ден", label: "Macedonian Denar", flag: "🇲🇰" },
    { code: "MMK", symbol: "K", label: "Myanmar Kyat", flag: "🇲🇲" },
    { code: "MNT", symbol: "₮", label: "Mongolian Tugrik", flag: "🇲🇳" },
    { code: "MOP", symbol: "MOP$", label: "Macanese Pataca", flag: "🇲🇴" },
    { code: "MRU", symbol: "UM", label: "Mauritanian Ouguiya", flag: "🇲🇷" },
    { code: "MUR", symbol: "₨", label: "Mauritian Rupee", flag: "🇲🇺" },
    { code: "MVR", symbol: "Rf", label: "Maldivian Rufiyaa", flag: "🇲🇻" },
    { code: "MWK", symbol: "MK", label: "Malawian Kwacha", flag: "🇲🇼" },
    { code: "MXN", symbol: "$", label: "Mexican Peso", flag: "🇲🇽" },
    { code: "MYR", symbol: "RM", label: "Malaysian Ringgit", flag: "🇲🇾" },
    { code: "MZN", symbol: "MT", label: "Mozambican Metical", flag: "🇲🇿" },
    { code: "NAD", symbol: "$", label: "Namibian Dollar", flag: "🇳🇦" },
    { code: "NGN", symbol: "₦", label: "Nigerian Naira", flag: "🇳🇬" },
    { code: "NIO", symbol: "C$", label: "Nicaraguan Córdoba", flag: "🇳🇮" },
    { code: "NOK", symbol: "kr", label: "Norwegian Krone", flag: "🇳🇴" },
    { code: "NPR", symbol: "₨", label: "Nepalese Rupee", flag: "🇳🇵" },
    { code: "NZD", symbol: "$", label: "New Zealand Dollar", flag: "🇳🇿" },
    { code: "OMR", symbol: "ر.ع.", label: "Omani Rial", flag: "🇴🇲" },
    { code: "PAB", symbol: "B/.", label: "Panamanian Balboa", flag: "🇵🇦" },
    { code: "PEN", symbol: "S/.", label: "Peruvian Sol", flag: "🇵🇪" },
    { code: "PGK", symbol: "K", label: "Papua New Guinean Kina", flag: "🇵🇬" },
    { code: "PHP", symbol: "₱", label: "Philippine Peso", flag: "🇵🇭" },
    { code: "PKR", symbol: "₨", label: "Pakistani Rupee", flag: "🇵🇰" },
    { code: "PLN", symbol: "zł", label: "Polish Złoty", flag: "🇵🇱" },
    { code: "PYG", symbol: "₲", label: "Paraguayan Guarani", flag: "🇵🇾" },
    { code: "QAR", symbol: "ر.ق", label: "Qatari Rial", flag: "🇶🇦" },
    { code: "RON", symbol: "lei", label: "Romanian Leu", flag: "🇷🇴" },
    { code: "RSD", symbol: "дин.", label: "Serbian Dinar", flag: "🇷🇸" },
    { code: "RUB", symbol: "₽", label: "Russian Ruble", flag: "🇷🇺" },
    { code: "RWF", symbol: "FRw", label: "Rwandan Franc", flag: "🇷🇼" },
    { code: "SAR", symbol: "ر.س", label: "Saudi Riyal", flag: "🇸🇦" },
    { code: "SBD", symbol: "$", label: "Solomon Islands Dollar", flag: "🇸🇧" },
    { code: "SCR", symbol: "₨", label: "Seychellois Rupee", flag: "🇸🇨" },
    { code: "SDG", symbol: "ج.س.", label: "Sudanese Pound", flag: "🇸🇩" },
    { code: "SEK", symbol: "kr", label: "Swedish Krona", flag: "🇸🇪" },
    { code: "SGD", symbol: "$", label: "Singapore Dollar", flag: "🇸🇬" },
    { code: "SLL", symbol: "Le", label: "Sierra Leonean Leone", flag: "🇸🇱" },
    { code: "SOS", symbol: "Sh", label: "Somali Shilling", flag: "🇸🇴" },
    { code: "SRD", symbol: "$", label: "Surinamese Dollar", flag: "🇸🇷" },
    { code: "SSP", symbol: "£", label: "South Sudanese Pound", flag: "🇸🇸" },
    { code: "STN", symbol: "Db", label: "São Tomé & Príncipe Dobra", flag: "🇸🇹" },
    { code: "SYP", symbol: "£", label: "Syrian Pound", flag: "🇸🇾" },
    { code: "SZL", symbol: "L", label: "Swazi Lilangeni", flag: "🇸🇿" },
    { code: "THB", symbol: "฿", label: "Thai Baht", flag: "🇹🇭" },
    { code: "TJS", symbol: "SM", label: "Tajikistani Somoni", flag: "🇹🇯" },
    { code: "TMT", symbol: "m", label: "Turkmenistani Manat", flag: "🇹🇲" },
    { code: "TND", symbol: "د.ت", label: "Tunisian Dinar", flag: "🇹🇳" },
    { code: "TOP", symbol: "T$", label: "Tongan Paʻanga", flag: "🇹🇴" },
    { code: "TRY", symbol: "₺", label: "Turkish Lira", flag: "🇹🇷" },
    { code: "TTD", symbol: "$", label: "Trinidad & Tobago Dollar", flag: "🇹🇹" },
    { code: "TWD", symbol: "$", label: "New Taiwan Dollar", flag: "🇹🇼" },
    { code: "TZS", symbol: "Sh", label: "Tanzanian Shilling", flag: "🇹🇿" },
    { code: "UAH", symbol: "₴", label: "Ukrainian Hryvnia", flag: "🇺🇦" },
    { code: "UGX", symbol: "USh", label: "Ugandan Shilling", flag: "🇺🇬" },
    { code: "USD", symbol: "$", label: "US Dollar", flag: "🇺🇸" },
    { code: "UYU", symbol: "$U", label: "Uruguayan Peso", flag: "🇺🇾" },
    { code: "UZS", symbol: "so'm", label: "Uzbekistan Som", flag: "🇺🇿" },
    { code: "VES", symbol: "Bs.S", label: "Venezuelan Bolívar", flag: "🇻🇪" },
    { code: "VND", symbol: "₫", label: "Vietnamese Dong", flag: "🇻🇳" },
    { code: "VUV", symbol: "VT", label: "Vanuatu Vatu", flag: "🇻🇺" },
    { code: "WST", symbol: "WS$", label: "Samoan Tala", flag: "🇼🇸" },
    { code: "XAF", symbol: "FCFA", label: "Central African CFA", flag: "🌍" },
    { code: "XCD", symbol: "$", label: "East Caribbean Dollar", flag: "🌍" },
    { code: "XOF", symbol: "CFA", label: "West African CFA", flag: "🌍" },
    { code: "YER", symbol: "﷼", label: "Yemeni Rial", flag: "🇾🇪" },
    { code: "ZAR", symbol: "R", label: "South African Rand", flag: "🇿🇦" },
    { code: "ZMW", symbol: "ZK", label: "Zambian Kwacha", flag: "🇿🇲" },
    { code: "ZWL", symbol: "$", label: "Zimbabwean Dollar", flag: "🇿🇼" }
];
        
function getCurrencySymbol(code) {
    const found = CURRENCIES.find(c => c.code === code);
    return found ? found.symbol : ""; // babu default — idan babu code, babu symbol
        }

function formatPrice(amount, currencyCode) {
    const symbol = getCurrencySymbol(currencyCode);
    const num = typeof amount === "number" ? amount : parseInt(amount) || 0;
    return `${symbol}${num.toLocaleString()}`;
}
function showGlobalToast(message) {
    const existing = document.getElementById('global-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%;
        transform: translateX(-50%);
        background: rgba(15,23,42,0.97);
        border: 1px solid rgba(255,255,255,0.12);
        color: #fff;
        padding: 10px 22px;
        border-radius: 50px;
        font-size: 13px;
        font-weight: 600;
        z-index: 99999;
        backdrop-filter: blur(20px);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        white-space: nowrap;
        pointer-events: none;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
function mbRenderMenuItem(item, idx) {
    return `
    <div class="nxfm-item-card-grid" onclick="mbOpenEditItem(${idx})">
        <div class="nxfm-grid-thumb">
            ${item.image ? `<img src="${item.image}">` : (item.icon || '🍽️')}
        </div>
        <div class="nxfm-grid-info">
            <div class="nxfm-grid-name">${item.name}</div>
            <div class="nxfm-grid-desc">${item.desc || ''}</div>
            <div class="nxfm-grid-bottom-row">
                <div class="nxfm-grid-price">${item.pricingType === 'tiered' ? 'From ' + formatPrice(Math.min(...item.tiers.map(t=>t.price)), item.currency) : formatPrice(item.price, item.currency)}</div>
                <button class="nxfm-grid-add-btn" onclick="event.stopPropagation();mbOpenItemMenu(${idx})">⋮</button>
            </div>
        </div>
    </div>`;
}
let mbCurrentCategory = null;
let mbAllItems = [];

async function openMyBusinessDashboard() {
    const username = localStorage.getItem("nexus_user_session");
    if (!username) { showGlobalToast('⚠️ Please login again.'); return; }

    document.getElementById('my-business-overlay').style.display = 'flex';
    mbSwitchTab('overview');

    try {
        const snap = await firebase.database().ref('providers/' + username).once('value');
        const data = snap.val();
        if (!data) { showGlobalToast('❌ Business profile not found.'); return; }

        document.getElementById('mb-business-name').textContent = data.businessName || data.categoryLabel || 'My Business';
        const headerPublishBtn = document.getElementById('mb-header-publish-btn');
        if (data.color && headerPublishBtn) headerPublishBtn.style.borderColor = data.color;
        mbAllItems = [];
        const categories = data.categories || {};
        Object.keys(categories).forEach(catKey => {
            const catItems = categories[catKey].items || {};
            Object.keys(catItems).forEach(itemKey => {
                mbAllItems.push({ id: itemKey, category: catKey, ...catItems[itemKey] });
            });
        });
       mbRenderCategoryPills(Object.keys(categories));
        mbRenderMenuList();
        mbRenderOverview(data); 
    } catch (err) {
        showGlobalToast('❌ Failed to load menu: ' + err.message);
    }
}

function closeMyBusinessDashboard() {
    document.getElementById('my-business-overlay').style.display = 'none';
}

function mbSwitchTab(tabName) {
['overview','menu','orders','sales','bookings','customers','insights','reviews'].forEach(t => {
        document.getElementById('mb-tab-' + t).classList.toggle('active', t === tabName);
        document.getElementById('mb-panel-' + t).style.display = (t === tabName) ? 'block' : 'none';
    });
    if (tabName === 'orders') mbLoadOrders();
    if (tabName === 'sales') mbLoadSales();
    if (tabName === 'bookings') mbRenderBookingsTab();
    if (tabName === 'customers') mbRenderCustomersTab();
    if (tabName === 'insights') mbRenderInsightsTab();
    if (tabName === 'reviews') mbRenderReviewsTab();
    }
let mbBookingsAll = [];

async function mbRenderBookingsTab() {
    const username = localStorage.getItem("nexus_user_session");
    const list = document.getElementById('mb-bookings-list');
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Loading delivery requests...</div>`;
    try {
        const snap = await firebase.database().ref('providers/' + username + '/requests').once('value');
        const data = snap.val() || {};
        mbBookingsAll = Object.entries(data)
            .map(([id, r]) => ({ id, ...r }))
            .filter(r => r.status !== 'declined' && r.status !== 'cancelled')
            .sort((a, b) => (a.dateNeeded || '9999-99-99').localeCompare(b.dateNeeded || '9999-99-99'));
        mbRenderBookingsList();
    } catch (err) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Failed to load delivery requests</div>`;   
    }
}

function mbBookingUrgency(dateStr) {
    if (!dateStr) return { label: 'No date', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(dateStr + 'T00:00:00');
    const diffDays = Math.round((target - today) / 86400000);
    if (diffDays < 0) return { label: 'Overdue', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' };
    if (diffDays === 0) return { label: 'Today', color: '#ea580c', bg: 'rgba(234,88,12,0.1)' };
    if (diffDays === 1) return { label: 'Tomorrow', color: '#d97706', bg: 'rgba(217,119,6,0.1)' };
    if (diffDays <= 7) return { label: 'This Week', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' };
    return { label: 'Upcoming', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' };
}

function mbRenderBookingsList() {
    const list = document.getElementById('mb-bookings-list');
    if (mbBookingsAll.length === 0) {
        list.innerHTML = `
        <div style="text-align:center;padding:50px 20px;color:rgba(255,255,255,0.5);">
            <div style="font-size:36px;margin-bottom:10px;">📅</div>
        <div style="font-weight:800;font-size:14px;color:#ffffff;margin-bottom:4px;">No delivery requests yet</div>
            <div style="font-size:12px;">Job requests from customers will appear here so you never miss one.</div>
        </div>`;
        return;
    }
    list.innerHTML = mbBookingsAll.map(b => {
        const urgency = mbBookingUrgency(b.dateNeeded);
        const dateLabel = b.dateNeeded
            ? new Date(b.dateNeeded + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
            : 'No date specified';
        const budgetLabel = b.budgetUnit === 'negotiable' || !b.budget
            ? 'Negotiable'
            : `${formatPrice(b.budget, b.currency)} ${b.budgetUnit || ''}`;
        return `
        <div style="background:#262626 !important;border:1.5px solid ${urgency.color}22;border-left:4px solid ${urgency.color};border-radius:14px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <div style="font-size:11px;font-weight:800;color:${urgency.color};background:${urgency.bg};padding:3px 9px;border-radius:8px;">${urgency.label.toUpperCase()}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);font-weight:700;">${dateLabel}</div>
            </div>
            <div style="font-size:13.5px;color:#ffffff;font-weight:600;line-height:1.4;margin-bottom:8px;">${(b.jobDescription || '').replace(/</g,'&lt;')}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:12px;color:rgba(255,255,255,0.55);">👤 ${b.customerUsername || 'Customer'}</div>
                <div style="font-size:12.5px;font-weight:800;color:#ffffff;">${budgetLabel}</div>
            </div>
        </div>`;
    }).join('');
    }

let mbCustomersAll = [];

async function mbRenderCustomersTab() {
    const username = localStorage.getItem("nexus_user_session");
    const list = document.getElementById('mb-customers-list');
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Loading customers...</div>`;
    try {
        const [ordersSnap, requestsSnap, currencySnap] = await Promise.all([
            firebase.database().ref('providers/' + username + '/orders').once('value'),
            firebase.database().ref('providers/' + username + '/requests').once('value'),
            firebase.database().ref('providers/' + username + '/currency').once('value')
        ]);
        const ordersData = ordersSnap.val() || {};
        const requestsData = requestsSnap.val() || {};
        const proCurrency = currencySnap.val() || '';
        const customerMap = {};

        Object.values(ordersData).forEach(o => {
            const cust = o.customerUsername;
            if (!cust) return;
            if (!customerMap[cust]) customerMap[cust] = { username: cust, orders: 0, bookings: 0, totalSpent: 0, lastActive: 0 };
            customerMap[cust].orders++;
            customerMap[cust].totalSpent += (Number(o.itemPrice) || 0) * (Number(o.quantity) || 1);
            customerMap[cust].lastActive = Math.max(customerMap[cust].lastActive, o.createdAt || 0);
        });

        Object.values(requestsData).forEach(r => {
            const cust = r.customerUsername;
            if (!cust) return;
            if (!customerMap[cust]) customerMap[cust] = { username: cust, orders: 0, bookings: 0, totalSpent: 0, lastActive: 0 };
            customerMap[cust].bookings++;
            customerMap[cust].lastActive = Math.max(customerMap[cust].lastActive, r.createdAt || 0);
        });

        mbCustomersAll = Object.values(customerMap)
            .map(c => ({ ...c, currency: proCurrency }))
            .sort((a, b) => b.lastActive - a.lastActive);
        mbRenderCustomersList();
    } catch (err) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Failed to load customers</div>`;
    }
}

function mbRenderCustomersList() {
    const list = document.getElementById('mb-customers-list');
    if (mbCustomersAll.length === 0) {
        list.innerHTML = `
        <div style="text-align:center;padding:50px 20px;color:rgba(255,255,255,0.5);">
            <div style="font-size:36px;margin-bottom:10px;">👥</div>
            <div style="font-weight:800;font-size:14px;color:#ffffff;margin-bottom:4px;">No customers yet</div>
            <div style="font-size:12px;">Everyone who orders or books you will show up here.</div>
        </div>`;
        return;
    }
    list.innerHTML = mbCustomersAll.map(c => {
        const isRepeat = (c.orders + c.bookings) > 1;
        const lastActiveLabel = c.lastActive ? new Date(c.lastActive).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
        const spentLabel = c.totalSpent > 0 ? formatPrice(c.totalSpent, c.currency) : '—';
        return `
        <div style="background:#262626 !important;border-radius:14px;padding:14px;display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;border-radius:50%;background:rgba(99,102,241,0.18);color:#818cf8;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex-shrink:0;">${(c.username || '?').charAt(0).toUpperCase()}</div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <div style="font-size:13.5px;font-weight:800;color:#ffffff;">${c.username}</div>
                    ${isRepeat ? `<span style="font-size:9.5px;font-weight:800;color:#4ade80;background:rgba(22,163,74,0.15);padding:2px 6px;border-radius:6px;">REPEAT</span>` : ''}
                </div>
     <div style="font-size:11.5px;color:rgba(255,255,255,0.55);margin-top:2px;">${c.orders} order${c.orders===1?'':'s'} · ${c.bookings} delivery request${c.bookings===1?'':'s'} · Last: ${lastActiveLabel}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:12.5px;font-weight:800;color:#ffffff;">${spentLabel}</div>
                <div style="font-size:9.5px;color:rgba(255,255,255,0.5);">spent</div>
            </div>
        </div>`;
    }).join('');
    }
async function mbRenderInsightsTab() {
    const username = localStorage.getItem("nexus_user_session");
    try {
        const [viewsSnap, ordersSnap, requestsSnap] = await Promise.all([
            firebase.database().ref('providers/' + username + '/analytics/views').once('value'),
            firebase.database().ref('providers/' + username + '/orders').once('value'),
            firebase.database().ref('providers/' + username + '/requests').once('value')
        ]);
        const viewsData = viewsSnap.val() || {};
        const ordersData = ordersSnap.val() || {};
        const requestsData = requestsSnap.val() || {};

        const todayKey = new Date().toISOString().slice(0,10);
        const viewsToday = viewsData[todayKey] || 0;
        const totalViews = Object.values(viewsData).reduce((a, b) => a + b, 0);

        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0,10);
            last7.push({ count: viewsData[key] || 0, label: d.toLocaleDateString('en-GB', { weekday: 'short' }) });
        }
        const maxViews = Math.max(1, ...last7.map(d => d.count));

        const totalEngagements = Object.keys(ordersData).length + Object.keys(requestsData).length;
        const conversionRate = totalViews > 0 ? Math.round((totalEngagements / totalViews) * 100) : 0;

        document.getElementById('mb-insights-views-today').textContent = viewsToday;
        document.getElementById('mb-insights-total-views').textContent = totalViews;
        document.getElementById('mb-insights-conversion').textContent = conversionRate + '%';

        document.getElementById('mb-insights-chart').innerHTML = last7.map(d => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                <div style="font-size:10px;font-weight:800;color:#334155;">${d.count}</div>
                <div style="width:100%;max-width:28px;height:${Math.max(6, (d.count / maxViews) * 80)}px;background:linear-gradient(180deg,#3b82f6,#2563eb);border-radius:6px 6px 2px 2px;"></div>
                <div style="font-size:9.5px;color:#94a3b8;">${d.label}</div>
            </div>`).join('');
    } catch (err) {
        console.warn('Insights unavailable:', err.message);
    }
}
let mbReviewsAll = [];

async function mbRenderReviewsTab() {
    const username = localStorage.getItem("nexus_user_session");
    const list = document.getElementById('mb-reviews-list');
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Loading reviews...</div>`;
    try {
        const snap = await firebase.database().ref('reviews/' + username).once('value');
        const data = snap.val() || {};
        mbReviewsAll = Object.entries(data).map(([id, r]) => ({ id, ...r })).sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

        const avgEl = document.getElementById('mb-reviews-avg');
        const starsEl = document.getElementById('mb-reviews-avg-stars');
        const countEl = document.getElementById('mb-reviews-count');
        const breakdownEl = document.getElementById('mb-reviews-breakdown');

        if (mbReviewsAll.length === 0) {
            avgEl.textContent = '—';
            starsEl.textContent = '☆☆☆☆☆';
            countEl.textContent = '0 reviews';
            breakdownEl.innerHTML = '';
            list.innerHTML = `
            <div style="text-align:center;padding:50px 20px;color:rgba(255,255,255,0.5);">
                <div style="font-size:36px;margin-bottom:10px;">⭐</div>
                <div style="font-weight:800;font-size:14px;color:#ffffff;margin-bottom:4px;">No reviews yet</div>
         <div style="font-size:12px;">Customer reviews will appear here after their first order or delivery request.</div>
            </div>`;
            return;
        }

        const total = mbReviewsAll.length;
        const avg = mbReviewsAll.reduce((sum, r) => sum + (Number(r.rating)||0), 0) / total;
        avgEl.textContent = avg.toFixed(1);
        const fullStars = Math.round(avg);
        starsEl.textContent = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
        countEl.textContent = `${total} review${total === 1 ? '' : 's'}`;

        const counts = [5,4,3,2,1].map(star => mbReviewsAll.filter(r => Math.round(Number(r.rating)) === star).length);
        breakdownEl.innerHTML = [5,4,3,2,1].map((star, i) => {
            const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
            return `
            <div style="display:flex;align-items:center;gap:6px;">
                <div style="font-size:10.5px;color:rgba(255,255,255,0.55);width:10px;">${star}</div>
                <div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:#f59e0b;"></div>
                </div>
                <div style="font-size:10px;color:rgba(255,255,255,0.5);width:22px;text-align:right;">${counts[i]}</div>
            </div>`;
        }).join('');

        list.innerHTML = mbReviewsAll.map(r => {
            const stars = '★'.repeat(Math.round(Number(r.rating)||0)) + '☆'.repeat(5 - Math.round(Number(r.rating)||0));
            return `
            <div style="background:#262626 !important;border-radius:16px;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="width:34px;height:34px;border-radius:50%;background:${r.reviewerColor || '#6366f1'};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px;flex-shrink:0;">${r.reviewerInitials || '?'}</div>
                        <div>
                            <div style="font-size:13px;font-weight:800;color:#ffffff;">${r.customerName || 'Customer'}</div>
                            <div style="color:#f59e0b;font-size:11px;">${stars}</div>
                        </div>
                    </div>
                    <div style="font-size:10.5px;color:rgba(255,255,255,0.5);flex-shrink:0;">${r.date || ''}</div>
                </div>
                <div style="font-size:12.5px;color:rgba(255,255,255,0.85);line-height:1.5;">${(r.comment || '').replace(/</g,'&lt;')}</div>
                ${r.verifiedOrder ? `<div style="font-size:10px;color:#4ade80;font-weight:700;margin-top:8px;">✓ ${r.verifiedOrder}</div>` : ''}
            </div>`;
        }).join('');
    } catch (err) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.5);font-size:12px;">Failed to load reviews</div>`;
    }
    }
async function mbRenderGalleryTab() {
    const username = localStorage.getItem("nexus_user_session");
    const grid = document.getElementById('mb-gallery-grid');
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Loading gallery...</div>`;
    try {
        const snap = await firebase.database().ref('providers/' + username + '/portfolio').once('value');
        const data = snap.val() || [];
        const photos = Array.isArray(data) ? data : Object.values(data);

        if (photos.length === 0) {
            grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:rgba(255,255,255,0.5);">
                <div style="font-size:36px;margin-bottom:10px;">🖼️</div>
                <div style="font-weight:800;font-size:14px;color:#ffffff;margin-bottom:4px;">No photos yet</div>
                <div style="font-size:12px;">Upload photos to show customers your work.</div>
            </div>`;
            return;
        }

        grid.innerHTML = photos.map((p, i) => {
            const url = typeof p === 'string' ? p : (p && p.url) || '';
            return `
            <div style="position:relative;border-radius:12px;overflow:hidden;aspect-ratio:1;background:#262626;">
                <img src="${url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                <button onclick="mbDeleteGalleryPhoto(${i})" style="position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;font-size:12px;cursor:pointer;">✕</button>
            </div>`;
        }).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:rgba(255,255,255,0.5);font-size:12px;">Failed to load gallery</div>`;
    }
    }

async function mbUploadGalleryPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const username = localStorage.getItem("nexus_user_session");
    showGlobalToast('⏳ Uploading photo...');
    try {
        if (typeof guaranteeAuth === 'function') await guaranteeAuth();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'portfolio');
        formData.append('username', username);
        const res = await fetch('https://oryzon-backend-ed1q.onrender.com/upload', { method: 'POST', body: formData });
        const uploadData = await res.json();

        const snap = await firebase.database().ref('providers/' + username + '/portfolio').once('value');
        const existing = snap.val() || [];
        const photos = Array.isArray(existing) ? existing : Object.values(existing);
        photos.push(uploadData.url);
        await firebase.database().ref('providers/' + username + '/portfolio').set(photos);

        showGlobalToast('✅ Photo added to gallery');
        mbRenderGalleryTab();
    } catch (err) {
        showGlobalToast('❌ Upload failed: ' + err.message);
    }
}

async function mbDeleteGalleryPhoto(index) {
    if (!confirm('Remove this photo from your gallery?')) return;
    const username = localStorage.getItem("nexus_user_session");
    try {
        const snap = await firebase.database().ref('providers/' + username + '/portfolio').once('value');
        const existing = snap.val() || [];
        const photos = Array.isArray(existing) ? existing : Object.values(existing);
        photos.splice(index, 1);
        await firebase.database().ref('providers/' + username + '/portfolio').set(photos);
        showGlobalToast('✅ Photo removed');
        mbRenderGalleryTab();
    } catch (err) {
        showGlobalToast('❌ Failed to remove photo: ' + err.message);
    }
}

function mbRenderCategoryPills(categoryKeys) {
    const wrap = document.getElementById('mb-category-pills');
    wrap.innerHTML = `<div class="nxfm-tab ${mbCurrentCategory===null?'active':''}" onclick="mbFilterCategory(null)">All</div>` +
        categoryKeys.map(cat => `<div class="nxfm-tab ${mbCurrentCategory===cat?'active':''}" onclick="mbFilterCategory('${cat}')">${cat}</div>`).join('');
    }

function mbFilterCategory(cat) {
    mbCurrentCategory = cat;
    mbRenderCategoryPills([...new Set(mbAllItems.map(i => i.category))]);
    mbRenderMenuList();
}

function mbRenderMenuList() {
    const list = document.getElementById('mb-menu-list');
    const items = mbCurrentCategory ? mbAllItems.filter(i => i.category === mbCurrentCategory) : mbAllItems;
    if (items.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#94a3b8;font-size:13px;">No items yet. Tap "Add Item" below to get started.</div>`;
        return;
    }
    list.innerHTML = items.map((item, idx) => mbRenderMenuItem(item, idx)).join('');
    }
let mbEditingIndex = null;
let mbPricingType = 'flat';
let mbTierCount = 0;

function mbShareMenuLink() {
    const username = localStorage.getItem("nexus_user_session");
    if (!username) { showGlobalToast('⚠️ Please login again.'); return; }
    const shareUrl = `https://oryzon-backend-ed1q.onrender.com/share/${username}`;
    const shareTitle = 'Check out my profile on Nexus';
    if (navigator.share) {
        navigator.share({ title: shareTitle, url: shareUrl }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showGlobalToast('🔗 Link copied! Share it with your customers.');
        }).catch(() => {
            showGlobalToast('⚠️ Failed to copy link.');
        });
    }
}

function mbOpenAddItem() {
    mbEditingIndex = null;
    mbPricingType = 'flat';
    mbTierCount = 0;
    document.getElementById('mb-form-title').textContent = 'Add Item';
    document.getElementById('mb-inp-name').value = '';
    document.getElementById('mb-inp-desc').value = '';
    document.getElementById('mb-inp-category').value = mbCurrentCategory || '';
    document.getElementById('mb-inp-icon').value = '';
    document.getElementById('mb-inp-price').value = '';
    document.getElementById('mb-tiers-inputs').innerHTML = '';
    mbSetPricingType('flat');
    document.getElementById('mb-item-form-overlay').style.display = 'flex';
}

let mbActionsItemIdx = null;
function mbOpenItemMenu(idx) {
    mbActionsItemIdx = idx;
    document.getElementById('mb-item-actions-sheet').style.display = 'flex';
}
function mbCloseItemActions() {
    document.getElementById('mb-item-actions-sheet').style.display = 'none';
    mbActionsItemIdx = null;
}
function mbActionsDelete() {
    const idx = mbActionsItemIdx;
    mbCloseItemActions();
    mbDeleteItem(idx);
    }

function mbOpenEditItem(idx) {
    const items = mbCurrentCategory ? mbAllItems.filter(i => i.category === mbCurrentCategory) : mbAllItems;
    const item = items[idx];
    if (!item) return;
    mbEditingIndex = mbAllItems.indexOf(item);
    document.getElementById('mb-form-title').textContent = 'Edit Item';
    document.getElementById('mb-inp-name').value = item.name || '';
    document.getElementById('mb-inp-desc').value = item.desc || '';
    document.getElementById('mb-inp-category').value = item.category || '';
    document.getElementById('mb-inp-icon').value = item.icon || '';
    document.getElementById('mb-tiers-inputs').innerHTML = '';
    mbTierCount = 0;
    if (item.pricingType === 'tiered') {
        mbSetPricingType('tiered');
        (item.tiers || []).forEach(t => mbAddTierRow(t));
    } else {
        mbSetPricingType('flat');
        document.getElementById('mb-inp-price').value = item.price || '';
    }
    document.getElementById('mb-item-form-overlay').style.display = 'flex';
}

function mbCloseItemForm() {
    document.getElementById('mb-item-form-overlay').style.display = 'none';
}

function mbSetPricingType(type) {
    mbPricingType = type;
    const flatBtn = document.getElementById('mb-price-type-flat');
    const tierBtn = document.getElementById('mb-price-type-tiered');
    flatBtn.style.background = type === 'flat' ? '#fff7ed' : '#ffffff';
    flatBtn.style.borderColor = type === 'flat' ? '#ea580c' : '#e2e8f0';
    flatBtn.style.color = type === 'flat' ? '#ea580c' : '#334155';
    tierBtn.style.background = type === 'tiered' ? '#fff7ed' : '#ffffff';
    tierBtn.style.borderColor = type === 'tiered' ? '#ea580c' : '#e2e8f0';
    tierBtn.style.color = type === 'tiered' ? '#ea580c' : '#334155';
    document.getElementById('mb-flat-price-block').style.display = type === 'flat' ? 'block' : 'none';
    document.getElementById('mb-tiers-block').style.display = type === 'tiered' ? 'flex' : 'none';
    if (type === 'tiered' && mbTierCount === 0) { mbAddTierRow(); mbAddTierRow(); mbAddTierRow(); }
}

function mbAddTierRow(prefill) {
    const id = mbTierCount++;
    const wrap = document.getElementById('mb-tiers-inputs');
    const row = document.createElement('div');
    row.id = 'mb-tier-row-' + id;
    row.style = 'display:flex;gap:6px;margin-bottom:8px;';
    row.innerHTML = `
        <input class="mb-tier-name" placeholder="Tier name" value="${prefill?.name || ''}" style="flex:1;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 10px;font-size:12px;outline:none;">
        <input class="mb-tier-price" type="number" placeholder="Price" value="${prefill?.price || ''}" style="width:80px;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 10px;font-size:12px;outline:none;">        
        <input class="mb-tier-delivery" placeholder="Delivery" value="${prefill?.delivery || ''}" style="width:90px;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 10px;font-size:12px;outline:none;">
        <button onclick="document.getElementById('mb-tier-row-${id}').remove()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:10px;width:32px;cursor:pointer;">✕</button>`;
    wrap.appendChild(row);
}

async function mbSaveItem() {
    const username = localStorage.getItem("nexus_user_session");
    const name = document.getElementById('mb-inp-name').value.trim();
    const category = document.getElementById('mb-inp-category').value.trim();
    if (!name || !category) { showGlobalToast('⚠️ Name and category are required.'); return; }

    const item = {
        name,
        desc: document.getElementById('mb-inp-desc').value.trim(),
        icon: document.getElementById('mb-inp-icon').value.trim() || '🍽️',
        category,
        pricingType: mbPricingType
    };

    if (mbPricingType === 'flat') {
        item.price = Number(document.getElementById('mb-inp-price').value) || 0;
    } else {
        const rows = document.querySelectorAll('#mb-tiers-inputs > div');
        item.tiers = Array.from(rows).map(r => ({
            name: r.querySelector('.mb-tier-name').value.trim(),
            price: Number(r.querySelector('.mb-tier-price').value) || 0,
            delivery: r.querySelector('.mb-tier-delivery').value.trim(),
            includes: []
        })).filter(t => t.name && t.price);
        if (item.tiers.length === 0) { showGlobalToast('⚠️ Add at least one tier.'); return; }
    }

    try {
        const ref = firebase.database().ref('providers/' + username + '/categories/' + category + '/items');
        if (mbEditingIndex !== null) {
            const existing = mbAllItems[mbEditingIndex];
            await ref.child(existing.id).set(item);
        } else {
            await ref.push(item);
        }
        showGlobalToast('✅ Item saved');
        mbCloseItemForm();
        openMyBusinessDashboard();
    } catch (err) {
        showGlobalToast('❌ Save failed: ' + err.message);
    }
}

async function mbDeleteItem(idx) {
    const username = localStorage.getItem("nexus_user_session");
    const items = mbCurrentCategory ? mbAllItems.filter(i => i.category === mbCurrentCategory) : mbAllItems;
    const item = items[idx];
    if (!item) return;
    try {
        await firebase.database().ref('providers/' + username + '/categories/' + item.category + '/items/' + item.id).remove();
        showGlobalToast('🗑️ Item deleted');
        openMyBusinessDashboard();
    } catch (err) {
        showGlobalToast('❌ Delete failed: ' + err.message);
    }
}

// ── RENDER 7-DAY TREND CHART (Orders vs Delivery Requests) ──
function mbRenderTrendChart(ordersByDay, bookingsByDay, dayLabels) {
    const svg = document.getElementById('mb-trend-svg');
    const labelsWrap = document.getElementById('mb-trend-labels');
    if (!svg || !labelsWrap) return;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const W = 300, padX = 15, topY = 14, baseY = 92;
    const maxVal = Math.max(1, ...ordersByDay, ...bookingsByDay);
    const stepX = (W - padX * 2) / (ordersByDay.length - 1);
    const pointsFor = (arr) => arr.map((v, i) => {
        const x = padX + i * stepX;
        const y = baseY - (v / maxVal) * (baseY - topY);
        return { x, y };
    });
    const makeEl = (tag, attrs) => {
        const el = document.createElementNS(SVG_NS, tag);
        Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
        return el;
    };
    const baseline = makeEl('line', { x1: padX, y1: baseY, x2: W - padX, y2: baseY, stroke: 'rgba(255,255,255,0.12)', 'stroke-width': 1 });
    svg.appendChild(baseline);
    const addSeries = (pts, color, dashed) => {
        const lineAttrs = { points: pts.map(p => `${p.x},${p.y}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
        if (dashed) lineAttrs['stroke-dasharray'] = '4,3';
        svg.appendChild(makeEl('polyline', lineAttrs));
        pts.forEach(p => svg.appendChild(makeEl('circle', { cx: p.x, cy: p.y, r: 2.8, fill: color })));
    };
    addSeries(pointsFor(ordersByDay), '#38bdf8', false);
    addSeries(pointsFor(bookingsByDay), '#f472b6', true);
    labelsWrap.innerHTML = dayLabels.map(d => `<span>${d}</span>`).join('');
    }

const MB_ANNOUNCEMENTS = [
    { tag: 'NEW', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', icon: '📅', title: 'Delivery Requests & Insights are here', body: 'Track every delivery request and see how many people view your profile — all in one place.' },
    { tag: 'NEW', gradient: 'linear-gradient(135deg,#10b981,#059669)', icon: '👥', title: 'Meet your Customers tab', body: 'See everyone who has ordered or booked you, and spot your repeat customers instantly.' },
    { tag: 'TIP', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '✨', title: 'Boost your Profile Health', body: 'Complete your setup checklist to get more visibility and delivery requests from customers.' }
];

function mbRenderAnnouncements() {
    const track = document.getElementById('mb-announce-track');
    const dots = document.getElementById('mb-announce-dots');
    if (!track || !dots) return;
    track.innerHTML = MB_ANNOUNCEMENTS.map(a => `
        <div class="mb-announce-slide" style="background:#ffffff;">
            <div style="height:4px;background:${a.gradient};"></div>
            <div style="padding:16px;display:flex;gap:12px;align-items:flex-start;">
                <div style="width:40px;height:40px;border-radius:12px;background:${a.gradient};display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;">${a.icon}</div>
                <div style="flex:1;min-width:0;">
                    <span style="font-size:9.5px;font-weight:800;color:#ea580c;background:rgba(234,88,12,0.12);padding:2px 7px;border-radius:6px;">${a.tag}</span>
                    <div class="mb-heading-brand" style="font-size:14px;font-weight:800;color:#1e293b;margin-top:6px;">${a.title}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:3px;line-height:1.4;">${a.body}</div>
                </div>
            </div>
        </div>`).join('');
    dots.innerHTML = MB_ANNOUNCEMENTS.map((_, i) => `<div class="mb-announce-dot${i === 0 ? ' active' : ''}"></div>`).join('');
    let ticking = false;
    track.onscroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const idx = Math.round(track.scrollLeft / track.clientWidth);
            [...dots.children].forEach((d, i) => d.classList.toggle('active', i === idx));
            ticking = false;
        });
    };
}

async function mbRenderOverview(data) {
    const username = localStorage.getItem("nexus_user_session");
    mbRenderAnnouncements();
    const businessName = data.businessName || data.categoryLabel || username;
    const isFoodCategory = ['chef', 'snacks', 'beverages'].includes(data.category);  
    document.getElementById('mb-greeting').textContent = `Good morning, ${businessName}`;
    document.getElementById('mb-greeting-sub').textContent = `Here's how ${businessName} is doing today`;

    const isPublished = data.published === true;
    document.getElementById('mb-publish-banner').style.display = isPublished ? 'none' : 'flex';

   const todayKey = new Date().toISOString().slice(0,10);
    const last7Keys = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0,10); });
    const last7Labels = last7Keys.map(k => new Date(k + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }));
    const ordersByDay = last7Keys.map(() => 0);
    const bookingsByDay = last7Keys.map(() => 0);
    let salesToday = 0, ordersToday = 0, pendingCount = 0, salesTodayCurrency = '', completedCount = 0, cancelledCount = 0, totalOrdersCount = 0;   
    try {
        const ordersSnap = await firebase.database().ref('providers/' + username + '/orders').once('value');
        ordersSnap.forEach(child => {
            const o = child.val();
            const orderDate = new Date(o.createdAt || 0).toISOString().slice(0,10);
            const lineTotal = (Number(o.itemPrice) || 0) * (Number(o.quantity) || 1);
            if (orderDate === todayKey) {
                ordersToday++;
                if (o.status === 'completed') { salesToday += lineTotal; if (!salesTodayCurrency) salesTodayCurrency = o.currency || ''; }
            }
            const orderDayIdx = last7Keys.indexOf(orderDate);
            if (orderDayIdx !== -1) ordersByDay[orderDayIdx]++;
          if (o.status === 'pending') pendingCount++;
            if (o.status === 'completed') completedCount++;
            if (o.status === 'cancelled') cancelledCount++;
            totalOrdersCount++;
        });
    } catch (err) { console.warn('Orders stats unavailable:', err.message); }
    let avgRating = null, reviewCount = 0;
    try {
        const reviewsSnap = await firebase.database().ref('reviews/' + username).once('value');
        let ratingSum = 0;
        reviewsSnap.forEach(child => {
            const r = child.val();
            if (typeof r.rating === 'number') { ratingSum += r.rating; reviewCount++; }
        });
        if (reviewCount > 0) avgRating = (ratingSum / reviewCount).toFixed(1);
    } catch (err) { console.warn('Reviews stats unavailable:', err.message); }

    const completionRate = (completedCount + cancelledCount) > 0
        ? Math.round((completedCount / (completedCount + cancelledCount)) * 100)
        : 100;

    try {
        const reqSnap = await firebase.database().ref('providers/' + username + '/requests').once('value');
        const reqData = reqSnap.val() || {};
       const bookingsToday = Object.values(reqData).filter(r => new Date(r.createdAt || 0).toISOString().slice(0,10) === todayKey).length;
        document.getElementById('mb-stat-bookings-today').textContent = bookingsToday;
        document.getElementById('mb-stat-total-bookings').textContent = Object.keys(reqData).length;
        Object.values(reqData).forEach(r => {
            const reqDate = new Date(r.createdAt || 0).toISOString().slice(0,10);
            const reqDayIdx = last7Keys.indexOf(reqDate);
            if (reqDayIdx !== -1) bookingsByDay[reqDayIdx]++;
        });
        const upcoming = Object.values(reqData).filter(r => r.status !== 'declined' && r.status !== 'cancelled' && r.status !== 'completed');
        const banner = document.getElementById('mb-bookings-banner');
        if (upcoming.length > 0) {
            banner.style.display = 'flex';
            document.getElementById('mb-bookings-count').textContent = upcoming.length;
            document.getElementById('mb-bookings-plural').textContent = upcoming.length === 1 ? '' : 's';
            const hasUrgent = upcoming.some(r => mbBookingUrgency(r.dateNeeded).label === 'Today' || mbBookingUrgency(r.dateNeeded).label === 'Overdue');
            document.getElementById('mb-bookings-urgent-tip').textContent = hasUrgent ? '⚠️ Some need your attention today' : 'Tap to review delivery requests';
        } else {
            banner.style.display = 'none';
        }
   } catch (err) { console.warn('Delivery requests banner unavailable:', err.message); }

    mbRenderTrendChart(ordersByDay, bookingsByDay, last7Labels); 
    try {
        const viewsSnap = await firebase.database().ref(`providers/${username}/analytics/views/${todayKey}`).once('value');
        document.getElementById('mb-stat-visitors').textContent = viewsSnap.val() || 0;
    } catch (err) { console.warn('Visitors stat unavailable:', err.message); }

    document.getElementById('mb-stat-orders').textContent = ordersToday;
    document.getElementById('mb-stat-pending-orders').textContent = pendingCount;
    document.getElementById('mb-badge-rating').textContent = avgRating ? `${avgRating}` : '—';
    document.getElementById('mb-badge-completion').textContent = completionRate + '%';
    document.getElementById('mb-stat-total-orders').textContent = totalOrdersCount;                                                                 const categories = data.categories || {};
    const totalItems = Object.values(categories).reduce((sum, c) => sum + Object.keys(c.items || {}).length, 0);
    const checklist = [
        { label: 'Complete business info', done: !!(data.businessName && data.bio && data.location) },
        { label: 'Add your first menu item', done: totalItems > 0 },
        { label: 'Add payment method', done: false },
        { label: 'Publish your menu', done: isPublished },
        { label: 'Upgrade to Premium', done: false, onClick: 'mbOpenUpgradeModal()' },
    ];
    const healthDone = checklist.filter(s => s.done).length;
    const healthPct = Math.round((healthDone / checklist.length) * 100);
    const healthColor = healthPct >= 80 ? 'var(--np-green,#10b981)' : healthPct >= 40 ? 'var(--np-amber,#f59e0b)' : 'var(--np-red,#ef4444)';
    const healthTip = healthPct >= 80 ? 'Great! Your profile is fully optimized' : healthPct >= 40 ? 'Almost there — finish the steps below' : 'Complete your setup to boost visibility';
    document.getElementById('mb-health-ring').style.background = `conic-gradient(${healthColor} ${healthPct * 3.6}deg, rgba(255,255,255,0.1) 0deg)`;
    document.getElementById('mb-health-score').textContent = healthPct + '%';
    document.getElementById('mb-health-score').style.color = healthColor;
    document.getElementById('mb-health-tip').textContent = healthTip;
    document.getElementById('mb-setup-checklist').innerHTML = checklist.map(step => `
        <div class="mb-glass-card mb-check-card" onclick="${step.onClick || ''}" style="${step.onClick ? 'cursor:pointer;' : ''}${step.done ? '' : 'border-left:3px solid var(--np-cyan,#06b6d4);'}">
            <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${step.done ? 'var(--np-green,#10b981)' : 'rgba(255,255,255,0.35)'};background:${step.done ? 'var(--np-green,#10b981)' : 'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:12px;">${step.done ? '✓' : ''}</div>
            <div style="flex:1;font-size:13px;font-weight:600;color:${step.done ? 'rgba(255,255,255,0.55)' : '#ffffff'};${step.done ? 'text-decoration:line-through;' : ''}">${step.label}</div>
        </div>`).join('');
    }
async function mbPublish() {
    const username = localStorage.getItem("nexus_user_session");
    try {
        showGlobalToast('⏳ Publishing menu...');
        const snap = await firebase.database().ref('providers/' + username).once('value');
        const data = snap.val() || {};
        await mbGenerateAndUploadFlyer(username, data);
        await firebase.database().ref('providers/' + username).update({ published: true });
        showGlobalToast('✅ Menu published!');
        openMyBusinessDashboard();
    } catch (err) { showGlobalToast('❌ Publish failed: ' + err.message); }
    }

let mbOrdersAll = [], mbOrdersFilter = 'all', mbProCurrency = '';

async function mbLoadOrders() {
    const username = localStorage.getItem("nexus_user_session");
    const list = document.getElementById('mb-orders-list');
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Loading orders...</div>`;
    try {
        const [ordersSnap, currencySnap] = await Promise.all([
            firebase.database().ref('providers/' + username + '/orders').once('value'),
            firebase.database().ref('providers/' + username + '/currency').once('value')
        ]);
        const data = ordersSnap.val() || {};
        mbProCurrency = currencySnap.val() || '';
        mbOrdersAll = Object.entries(data).map(([id, o]) => ({ id, ...o })).sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
        mbRenderOrders();
    } catch (err) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Failed to load orders</div>`;
    }
    }

function mbFilterOrders(status) {
    mbOrdersFilter = status;
    document.querySelectorAll('.mb-order-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    mbRenderOrders();
    }
function mbRenderOrders() {
    const list = document.getElementById('mb-orders-list');
   const searchTerm = (document.getElementById('mb-orders-search')?.value || '').trim().toLowerCase();
    let orders = mbOrdersFilter === 'all' ? mbOrdersAll : mbOrdersAll.filter(o => (o.status||'pending') === mbOrdersFilter);
    if (searchTerm) {
        orders = orders.filter(o => (o.itemName||'').toLowerCase().includes(searchTerm) || (o.customerUsername||'').toLowerCase().includes(searchTerm));
    } 
    if (orders.length === 0) {
        list.innerHTML = `
        <div style="text-align:center;padding:50px 20px;color:#94a3b8;">
            <div style="font-size:36px;margin-bottom:10px;">📋</div>
            <div style="font-weight:800;font-size:14px;color:#334155;margin-bottom:4px;">No ${mbOrdersFilter === 'all' ? '' : mbOrdersFilter + ' '}orders</div>
            <div style="font-size:12px;">Orders will appear here when customers place them through your menu.</div>
        </div>`;
        return;
    }

    const statusMeta = {
        pending:   { label: 'PENDING',   bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
        confirmed: { label: 'CONFIRMED', bg: 'rgba(16,185,129,0.1)', color: '#059669' },
        completed: { label: 'COMPLETED', bg: 'rgba(59,130,246,0.1)', color: '#2563eb' },
        cancelled: { label: 'CANCELLED', bg: 'rgba(239,68,68,0.1)',  color: '#dc2626' },
    };

    list.innerHTML = orders.map(o => {
        const meta = statusMeta[o.status] || statusMeta.pending;
        const lineTotal = (Number(o.itemPrice)||0) * (Number(o.quantity)||1);
        let actions = '';
        if (o.status === 'pending' || !o.status) {
            actions = `
                <button onclick="mbUpdateOrderStatus('${o.id}','confirmed')" style="flex:1;padding:10px;background:#16a34a;border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;">✓ Confirm</button>
                <button onclick="mbUpdateOrderStatus('${o.id}','cancelled')" style="flex:1;padding:10px;background:#fee2e2;border:1px solid #fecaca;border-radius:10px;color:#dc2626;font-size:12px;font-weight:800;cursor:pointer;">✕ Decline</button>`;
        } else if (o.status === 'confirmed') {
            actions = `<button onclick="mbUpdateOrderStatus('${o.id}','completed')" style="flex:1;padding:10px;background:#2563eb;border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;">✓ Mark Completed</button>`;
        }
        return `
        <div style="background:#ffffff;border-radius:16px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                <div>
                    <div style="font-weight:800;font-size:14px;color:#1e293b;">${o.itemName || '—'}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">@${o.customerUsername || 'customer'} · Qty: ${o.quantity || 1}</div>
                </div>
                <span style="background:${meta.bg};color:${meta.color};border-radius:8px;padding:4px 10px;font-size:10px;font-weight:800;flex-shrink:0;">${meta.label}</span>
            </div>
            <div style="font-size:12px;color:#64748b;margin-bottom:2px;">📍 ${o.fulfillmentMethod === 'pickup' ? 'Self Pickup' : (o.address || '—')}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:10px;">📞 ${o.phone || '—'}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f1f5f9;padding-top:10px;">
               <div style="font-weight:800;font-size:14px;color:#ea580c;">${formatPrice(lineTotal, mbProCurrency)}</div>
                <div style="font-size:11px;color:#94a3b8;">${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : ''}</div>
            </div>
            ${actions ? `<div style="display:flex;gap:8px;margin-top:10px;">${actions}</div>` : ''}
        </div>`;
    }).join('');
}

async function mbUpdateOrderStatus(orderId, newStatus) {
    const username = localStorage.getItem("nexus_user_session");
    try {
        await firebase.database().ref('providers/' + username + '/orders/' + orderId + '/status').set(newStatus);
        showGlobalToast(`✅ Order marked ${newStatus}`);
        mbLoadOrders();
    } catch (err) {
        showGlobalToast('❌ Failed to update order: ' + err.message);
    }
}
       async function mbLoadSales() {
    const username = localStorage.getItem("nexus_user_session");
    const rangeDays = Number(document.getElementById('mb-sales-range').value);
    const [planSnap, currencySnap] = await Promise.all([
        firebase.database().ref('providers/' + username + '/plan').once('value'),
        firebase.database().ref('providers/' + username + '/currency').once('value')
    ]);
    const currentPlan = planSnap.val() || 'free';
    const proCurrency = currencySnap.val() || '';
    const isPaid = currentPlan === 'pro' || currentPlan === 'max';
    const badge = document.getElementById('mb-plan-badge');
    if (badge) {
        badge.textContent = currentPlan.toUpperCase();
        badge.style.background = isPaid ? '#dcfce7' : '#e0f2fe';
        badge.style.color = isPaid ? '#15803d' : '#0369a1';
    }
        const cutoff = rangeDays === 0 ? 0 : Date.now() - (rangeDays * 86400000);

    try {
        const snap = await firebase.database().ref('providers/' + username + '/orders').once('value');
        const data = snap.val() || {};
        const allOrders = Object.entries(data).map(([id, o]) => ({ id, ...o }));
        const orders = allOrders.filter(o => (o.createdAt || 0) >= cutoff);

        const completed = orders.filter(o => o.status === 'completed');
        const inProgress = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
        const cancelled = orders.filter(o => o.status === 'cancelled');

        
        const lineTotal = o => (Number(o.itemPrice) || 0) * (Number(o.quantity) || 1);
        const totalSales = completed.reduce((sum, o) => sum + lineTotal(o), 0);
        const totalSalesCurrency = proCurrency;

        document.getElementById('mb-sales-total').textContent = formatPrice(totalSales, totalSalesCurrency);                                                            document.getElementById('mb-sales-total-sub').textContent = `${completed.length} completed order${completed.length === 1 ? '' : 's'}`;        
        document.getElementById('mb-sales-total-orders').textContent = orders.length;
        document.getElementById('mb-sales-completed').textContent = completed.length;
        document.getElementById('mb-sales-progress').textContent = inProgress.length;
        document.getElementById('mb-sales-cancelled').textContent = cancelled.length;

        // Revenue trend chart — last 14 days
        const chartDays = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setHours(0,0,0,0);
            d.setDate(d.getDate() - i);
            const dayStart = d.getTime();
            const dayEnd = dayStart + 86400000;
            const dayRevenue = allOrders
                .filter(o => o.status === 'completed' && (o.createdAt||0) >= dayStart && (o.createdAt||0) < dayEnd)
                .reduce((sum, o) => sum + lineTotal(o), 0);
            chartDays.push({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), revenue: dayRevenue });
        }
        const maxRevenue = Math.max(1, ...chartDays.map(d => d.revenue));
        const chartEl = document.getElementById('mb-sales-chart');
        const chartLockEl = document.getElementById('mb-sales-chart-lock');
        if (!isPaid) {
            chartEl.style.filter = 'blur(4px)';
            chartEl.style.pointerEvents = 'none';
            chartLockEl.style.display = 'flex';
            chartLockEl.innerHTML = mbLockOverlayHTML();
        } else {
            chartEl.style.filter = 'none';
            chartEl.style.pointerEvents = 'auto';
            chartLockEl.style.display = 'none';
        }
        chartEl.innerHTML = chartDays.map(d => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                <div style="width:100%;max-width:16px;height:${Math.max(4, (d.revenue / maxRevenue) * 90)}px;background:linear-gradient(180deg,#3b82f6,#1d4ed8);border-radius:4px 4px 1px 1px;"></div>
                <div style="font-size:8px;color:#94a3b8;writing-mode:vertical-rl;transform:rotate(180deg);height:32px;">${d.label}</div>
            </div>`).join('');

        // Top selling items (by qty, among completed orders)
        const itemStats = {};
        completed.forEach(o => {
            const key = o.itemName || 'Unknown';
            if (!itemStats[key]) itemStats[key] = { qty: 0, revenue: 0, currency: '' };
            itemStats[key].qty += Number(o.quantity) || 1;
            itemStats[key].revenue += lineTotal(o);
            if (!itemStats[key].currency) itemStats[key].currency = proCurrency; 
        });
        const topItems = Object.entries(itemStats).sort((a,b) => b[1].qty - a[1].qty).slice(0, 5);

        const topItemsEl = document.getElementById('mb-top-items');
        const topLockEl = document.getElementById('mb-top-items-lock');
        if (!isPaid) {
            topItemsEl.style.filter = 'blur(4px)';
            topItemsEl.style.pointerEvents = 'none';
            topLockEl.style.display = 'flex';
            topLockEl.innerHTML = mbLockOverlayHTML();
        } else {
            topItemsEl.style.filter = 'none';
            topItemsEl.style.pointerEvents = 'auto';
            topLockEl.style.display = 'none';
        }
        topItemsEl.innerHTML = topItems.length === 0
            ? `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">No completed sales yet</div>`
            : topItems.map(([name, stat], i) => `
                <div style="background:#ffffff;border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                    <div style="width:26px;height:26px;border-radius:50%;background:#fff7ed;color:#ea580c;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">${i+1}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:13px;color:#1e293b;">${name}</div>
                        <div style="font-size:11px;color:#64748b;">${stat.qty} sold</div>
                    </div>
                   <div style="font-weight:800;font-size:13px;color:#ea580c;flex-shrink:0;">${formatPrice(stat.revenue, stat.currency)}</div>                 
                </div>`).join('');

        // Recent transactions (completed, most recent first)
        const recent = completed.sort((a,b) => (b.createdAt||0) - (a.createdAt||0)).slice(0, 10);
        const recentEl = document.getElementById('mb-recent-transactions');
        const recentLockEl = document.getElementById('mb-recent-tx-lock');
        if (!isPaid) {
            recentEl.style.filter = 'blur(4px)';
            recentEl.style.pointerEvents = 'none';
            recentLockEl.style.display = 'flex';
            recentLockEl.innerHTML = mbLockOverlayHTML();
        } else {
            recentEl.style.filter = 'none';
            recentEl.style.pointerEvents = 'auto';
            recentLockEl.style.display = 'none';
        }
        recentEl.innerHTML = recent.length === 0
            ? `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">No transactions yet</div>`
            : recent.map(o => `
                <div style="background:#ffffff;border-radius:14px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                    <div>
                        <div style="font-weight:700;font-size:13px;color:#1e293b;">${o.itemName || '—'}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:2px;">@${o.customerUsername || 'customer'} · ${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : ''}</div>
                    </div>
                    <div style="font-weight:800;font-size:13px;color:#16a34a;">+${formatPrice(lineTotal(o), o.currency)}</div>
                </div>`).join('');

    } catch (err) {
        showGlobalToast('❌ Failed to load sales: ' + err.message);
    }
}
let mbApprovedProviderData = null;

function mbLockOverlayHTML() {
    return `
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(255,255,255,0.4);backdrop-filter:blur(2px);border-radius:14px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#0f172a;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;">🔒</div>
            <button onclick="mbOpenUpgradeModal()" style="background:#0f172a;color:#ffffff;border:none;border-radius:20px;padding:9px 18px;font-size:12px;font-weight:800;cursor:pointer;">Upgrade to unlock</button>
        </div>`;
}

const MB_PLANS = [
    {
        id: 'free', name: 'Free', price: 0, tagline: 'Get online in minutes',
        features: ['Unlimited menu items', 'Order management', 'Basic sales overview', 'Customer chat'],
        locked: ['Top Selling Items', 'Recent Transactions', 'Revenue Chart']
    },
    {
        id: 'pro', name: 'Pro', price: 9, badge: 'Most Popular', tagline: 'For growing businesses',
        features: ['Everything in Free', 'Top Selling Items', 'Recent Transactions', 'Revenue Chart', 'Priority support'],
        locked: []
    },
    {
        id: 'max', name: 'Max', price: 19, badge: 'Best Value', tagline: 'For established businesses',
        features: ['Everything in Pro', 'Multi-category dashboard', 'Advanced customer insights', 'Featured placement in search', 'Dedicated account manager'],
        locked: []
    },
];

let mbBillingPeriod = 'monthly';
let mbCachedCurrentPlan = 'free';

function mbPeriodPrice(monthlyPrice, period) {
    if (monthlyPrice === 0) return { perMonth: 0, billedNote: 'Free forever' };
    if (period === 'quarterly') {
        const perMonth = monthlyPrice * 0.9;
        return { perMonth, billedNote: `Billed $${(perMonth * 3).toFixed(2).replace(/\.00$/, '')} every 3 months` };
    }
    if (period === 'yearly') {
        const perMonth = monthlyPrice * 0.6;
        return { perMonth, billedNote: `Billed $${(perMonth * 12).toFixed(2).replace(/\.00$/, '')} yearly` };
    }
    return { perMonth: monthlyPrice, billedNote: `Billed $${monthlyPrice.toFixed(2).replace(/\.00$/, '')} monthly` };
}

function mbRenderCurrentPlanCard(currentPlan) {
    const plan = MB_PLANS.find(p => p.id === currentPlan) || MB_PLANS[0];
    document.getElementById('mb-current-plan-card').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;">Current Plan</span>
            <span style="background:rgba(16,185,129,0.12);color:var(--np-green,#10b981);font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;">● Active</span>
        </div>
        <div style="font-size:19px;font-weight:900;color:#ffffff;margin-bottom:8px;">${plan.name}</div>
        <div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:8px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;color:rgba(255,255,255,0.45);font-weight:700;">Status</span>
            <span style="font-size:12px;color:#ffffff;font-weight:700;">${plan.id === 'free' ? 'No renewal (Free plan)' : 'Renews ' + mbBillingPeriod}</span>
        </div>`;
}

function mbRenderPlanCards() {
    document.querySelectorAll('.mb-billing-toggle-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.period === mbBillingPeriod));

    document.getElementById('mb-plan-cards').innerHTML = MB_PLANS.map(plan => {
        const isCurrent = plan.id === mbCachedCurrentPlan;
        const isFree = plan.id === 'free';
        const { perMonth, billedNote } = mbPeriodPrice(plan.price, mbBillingPeriod);
        const priceLabel = plan.price === 0 ? 'Free' : '$' + perMonth.toFixed(2).replace(/\.00$/, '');
        return `
        <div class="mb-glass-card" style="border-radius:20px;padding:22px;position:relative;${plan.badge ? 'border-color:var(--np-amber,#f59e0b) !important;' : ''}">
            ${plan.badge ? `<div style="position:absolute;top:-11px;left:20px;background:var(--np-amber,#f59e0b);color:#0f172a;font-size:10px;font-weight:900;padding:4px 12px;border-radius:20px;letter-spacing:0.3px;">${plan.badge.toUpperCase()}</div>` : ''}
            <div style="font-size:17px;font-weight:900;color:#ffffff;">${plan.name}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:14px;">${plan.tagline}</div>
            <div style="font-size:28px;font-weight:900;color:#ffffff;">${priceLabel}<span style="font-size:12px;color:rgba(255,255,255,0.4);font-weight:600;"> ${plan.price === 0 ? '' : '/mo'}</span></div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:16px;">${billedNote}</div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
                ${plan.features.map(f => `<div style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:rgba(255,255,255,0.8);"><span style="color:var(--np-green,#10b981);flex-shrink:0;">✓</span>${f}</div>`).join('')}
            </div>
            <button ${isCurrent ? 'disabled' : ''} onclick="mbSelectPlan('${plan.id}', ${perMonth})"
                style="width:100%;padding:13px;border-radius:12px;border:none;font-weight:800;font-size:13px;cursor:${isCurrent ? 'default' : 'pointer'};background:${isCurrent ? 'rgba(255,255,255,0.1)' : (plan.badge ? 'var(--np-amber,#f59e0b)' : '#ffffff')};color:${isCurrent ? 'rgba(255,255,255,0.5)' : '#0f172a'};">
                ${isCurrent ? 'Current Plan' : (isFree ? 'Downgrade' : 'Upgrade to ' + plan.name)}
            </button>
        </div>`;
    }).join('');
}

function mbSetBillingPeriod(period) {
    mbBillingPeriod = period;
    mbRenderPlanCards();
    mbRenderCurrentPlanCard(mbCachedCurrentPlan);
}

async function mbOpenUpgradeModal() {
    const username = localStorage.getItem("nexus_user_session");
    const snap = await firebase.database().ref('providers/' + username + '/plan').once('value');
    mbCachedCurrentPlan = snap.val() || 'free';
    mbBillingPeriod = 'monthly';

    mbRenderCurrentPlanCard(mbCachedCurrentPlan);
    mbRenderPlanCards();

    document.getElementById('mb-upgrade-page').style.display = 'flex';
}

function mbCloseUpgradeModal() {
    document.getElementById('mb-upgrade-page').style.display = 'none';
    }

function mbSelectPlan(planId, price) {
    if (planId === 'free') {
        mbConfirmPlanChange('free');
        return;
    }
    showGlobalToast('⚠️ Payment gateway not connected yet.');
}

async function mbConfirmPlanChange(planId) {
    const username = localStorage.getItem("nexus_user_session");
    try {
        await firebase.database().ref('providers/' + username + '/plan').set(planId);
        showGlobalToast('✅ Plan updated to ' + planId.toUpperCase());
        mbCloseUpgradeModal();
        mbLoadSales();
    } catch (err) {
        showGlobalToast('❌ Failed: ' + err.message);
    }
}

async function mbGenerateAndUploadFlyer(username, data) {
    const categories = data.categories || {};
    const allItems = [];
    Object.keys(categories).forEach(cat => {
        const items = categories[cat].items || {};
        Object.keys(items).forEach(id => allItems.push(items[id]));
    });
    if (allItems.length === 0) return null;

    document.getElementById('mb-flyer-avatar').textContent = (data.businessName || username).charAt(0).toUpperCase();
    document.getElementById('mb-flyer-business-name').textContent = data.businessName || username;
    document.getElementById('mb-flyer-category').textContent = data.categoryLabel || '';

    const gridItems = allItems.slice(0, 6);
    document.getElementById('mb-flyer-grid').innerHTML = gridItems.map(item => {
    const priceLabel = item.pricingType === 'tiered'
            ? 'From ' + formatPrice(Math.min(...item.tiers.map(t => t.price)), item.currency)
            : formatPrice(Number(item.price || 0), item.currency);   
    return `
        <div style="background:#fff7ed;border-radius:20px;padding:20px;text-align:center;">
            <div style="font-size:56px;margin-bottom:10px;">${item.icon || '🍽️'}</div>
            <div style="font-size:18px;font-weight:800;color:#78350f;margin-bottom:4px;">${item.name}</div>
            <div style="font-size:20px;font-weight:900;color:#ea580c;">${priceLabel}</div>
        </div>`;
    }).join('');

    const captureEl = document.getElementById('mb-flyer-capture');
    const canvas = await html2canvas(captureEl, { scale: 2, useCORS: true, backgroundColor: null });
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));

    const formData = new FormData();
    formData.append('file', blob, username + '_flyer.png');
    formData.append('type', 'menu_flyers');
    formData.append('username', username);

    const uploadRes = await fetch('https://oryzon-backend-ed1q.onrender.com/upload', {
        method: 'POST',
        body: formData
    });
    const uploadData = await uploadRes.json();
    if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');

    await firebase.database().ref('providers/' + username).update({
        menuImageUrl: uploadData.url,
        menuImageUpdatedAt: Date.now()
    });

    return uploadData.url;
}

async function mbRefreshCategoriesData() {
    const username = localStorage.getItem("nexus_user_session");
    const snap = await firebase.database().ref('providers/' + username + '/categories').once('value');
    const categories = snap.val() || {};
    mbAllItems = [];
    Object.keys(categories).forEach(catKey => {
        const catItems = categories[catKey].items || {};
        Object.keys(catItems).forEach(itemKey => {
            mbAllItems.push({ id: itemKey, category: catKey, ...catItems[itemKey] });
        });
    });
    mbRenderCategoryPills(Object.keys(categories));
    mbRenderMenuList();
}

function mbOpenCategoryManager() {
    document.getElementById('mb-category-manager-overlay').style.display = 'flex';
    mbRenderCategoryManagerList();
}

function mbCloseCategoryManager() {
    document.getElementById('mb-category-manager-overlay').style.display = 'none';
}

function mbRenderCategoryManagerList() {
    const list = document.getElementById('mb-category-manager-list');
    const categories = [...new Set(mbAllItems.map(i => i.category))];
    if (categories.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.5);font-size:12px;">No categories yet. Add an item to create one.</div>`;
        return;
    }
    list.innerHTML = categories.map(cat => {
        const count = mbAllItems.filter(i => i.category === cat).length;
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.11);border-radius:12px;padding:12px 14px;margin-bottom:8px;">
            <div>
                <div style="font-size:13.5px;font-weight:700;color:#ffffff;">${cat}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">${count} item${count === 1 ? '' : 's'}</div>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="mbRenameCategoryAction('${cat}')" style="width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.1);color:#ffffff;font-size:14px;cursor:pointer;">✏️</button>
                <button onclick="mbDeleteCategoryAction('${cat}')" style="width:32px;height:32px;border-radius:9px;border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.12);color:#f87171;font-size:14px;cursor:pointer;">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

async function mbRenameCategoryAction(oldName) {
    const newName = prompt('Rename category:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const trimmed = newName.trim();
    const username = localStorage.getItem("nexus_user_session");
    try {
        const oldRef = firebase.database().ref('providers/' + username + '/categories/' + oldName + '/items');
        const snap = await oldRef.once('value');
        const items = snap.val() || {};
        const newRef = firebase.database().ref('providers/' + username + '/categories/' + trimmed + '/items');
        for (const [itemId, itemData] of Object.entries(items)) {
            await newRef.child(itemId).set(itemData);
        }
        await firebase.database().ref('providers/' + username + '/categories/' + oldName).remove();
        showGlobalToast('✅ Category renamed');
        await mbRefreshCategoriesData();
        mbRenderCategoryManagerList();
    } catch (err) {
        showGlobalToast('❌ Rename failed: ' + err.message);
    }
}

async function mbDeleteCategoryAction(name) {
    const count = mbAllItems.filter(i => i.category === name).length;
    if (!confirm(`Delete "${name}" and all ${count} item(s) inside it? This cannot be undone.`)) return;
    const username = localStorage.getItem("nexus_user_session");
    try {
        await firebase.database().ref('providers/' + username + '/categories/' + name).remove();
        showGlobalToast('✅ Category deleted');
        await mbRefreshCategoriesData();
        mbRenderCategoryManagerList();
    } catch (err) {
        showGlobalToast('❌ Delete failed: ' + err.message);
    }
}
const MB_THEME_COLORS = ['#64748b', '#1e3a8a', '#0ea5e9', '#166534', '#65780a', '#f59e0b', '#ea580c', '#a855f7', '#312e81', '#be185d', '#eab308', '#b91c1c', '#92400e', '#0d9488', '#1d4ed8', '#22c55e'];
async function mbOpenCustomizeModal() {
    const username = localStorage.getItem("nexus_user_session");
    const snap = await firebase.database().ref('providers/' + username).once('value');
    const data = snap.val() || {};
    const currentColor = data.color || MB_THEME_COLORS[0];

    const isCustom = !MB_THEME_COLORS.includes(currentColor);
    document.getElementById('mb-customize-swatches').innerHTML = MB_THEME_COLORS.map(c => `
        <button onclick="mbSelectThemeColor('${c}')" style="width:38px;height:38px;border-radius:50%;background:${c};border:${c === currentColor ? '3px solid #0f172a' : '3px solid transparent'};box-shadow:0 0 0 1.5px ${c === currentColor ? c : 'transparent'};cursor:pointer;"></button>
    `).join('') + `
        <button onclick="document.getElementById('mb-native-color-input').click()" style="width:38px;height:38px;border-radius:50%;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);border:${isCustom ? '3px solid #0f172a' : '3px solid transparent'};box-shadow:0 0 0 1.5px ${isCustom ? currentColor : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <span style="background:#ffffff;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#334155;font-weight:900;">+</span>
        </button>
        <input type="color" id="mb-native-color-input" value="${isCustom ? currentColor : '#1d4ed8'}" oninput="mbSelectThemeColor(this.value)" style="position:absolute;width:0;height:0;opacity:0;pointer-events:none;">
    `;

    const preview = document.getElementById('mb-customize-cover-preview');
    if (data.coverImageUrl) {
        preview.style.backgroundImage = `url('${data.coverImageUrl}')`;
        preview.textContent = '';
    } else {
        preview.style.backgroundImage = '';
        preview.textContent = 'No cover photo set';
    }

    document.getElementById('mb-customize-overlay').style.display = 'flex';
}

function mbCloseCustomizeModal() {
    document.getElementById('mb-customize-overlay').style.display = 'none';
}

async function mbSelectThemeColor(hex) {
    const username = localStorage.getItem("nexus_user_session");
    try {
        if (typeof guaranteeAuth === 'function') await guaranteeAuth();
        await firebase.database().ref('providers/' + username + '/color').set(hex);
        showGlobalToast('✅ Accent color updated');
        mbOpenCustomizeModal();
    } catch (err) {
        showGlobalToast('❌ Failed: ' + err.message);
    }
}

async function mbUploadCoverPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const username = localStorage.getItem("nexus_user_session");
    showGlobalToast('⏳ Uploading cover photo...');
    try {
        if (typeof guaranteeAuth === 'function') await guaranteeAuth();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'cover_photos');
        formData.append('username', username);
        const res = await fetch('https://oryzon-backend-ed1q.onrender.com/upload', { method: 'POST', body: formData });
        const data = await res.json();
        await firebase.database().ref('providers/' + username + '/coverImageUrl').set(data.url);
        showGlobalToast('✅ Cover photo updated');
        mbOpenCustomizeModal();
    } catch (err) {
        showGlobalToast('❌ Upload failed: ' + err.message);
    }
    }
const MB_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const MB_DAY_LABELS = {monday:'Monday',tuesday:'Tuesday',wednesday:'Wednesday',thursday:'Thursday',friday:'Friday',saturday:'Saturday',sunday:'Sunday'};

function mbTimeOptions(selected) {
    let opts = '';
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const val = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
            const label = new Date(2000,0,1,h,m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            opts += '<option value="' + val + '" ' + (val === selected ? 'selected' : '') + '>' + label + '</option>';
        }
    }
    return opts;
}

function mbRenderOperatingHoursRows(hoursData) {
    const list = document.getElementById('bs-hours-list');
    list.innerHTML = MB_DAYS.map(function(day) {
        const d = hoursData[day] || { enabled: true, open: '08:00', close: '18:00' };
        return '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid #f1f5f9;">' +
            '<input type="checkbox" id="bs-hours-enabled-' + day + '" ' + (d.enabled ? 'checked' : '') + ' style="width:18px;height:18px;flex-shrink:0;">' +
            '<div style="width:78px;font-size:12.5px;font-weight:700;color:#334155;flex-shrink:0;">' + MB_DAY_LABELS[day] + '</div>' +
            '<select id="bs-hours-open-' + day + '" style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:7px 6px;font-size:12px;">' + mbTimeOptions(d.open) + '</select>' +
            '<span style="font-size:11px;color:#94a3b8;">to</span>' +
            '<select id="bs-hours-close-' + day + '" style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:7px 6px;font-size:12px;">' + mbTimeOptions(d.close) + '</select>' +
            '</div>';
    }).join('');
}

async function mbOpenBusinessSettings() {
    const username = localStorage.getItem("nexus_user_session");
    if (!username) { showGlobalToast('⚠️ Please login again.'); return; }
    document.getElementById('my-business-overlay').style.display = 'none';
    document.getElementById('mb-business-settings-overlay').style.display = 'flex';

    const snap = await firebase.database().ref('providers/' + username).once('value');
    const data = snap.val() || {};

    document.getElementById('bs-phone').value = data.phone || '';
    document.getElementById('bs-email').value = data.email || '';
    document.getElementById('bs-website').value = data.website || '';
    document.getElementById('bs-country').value = data.country || '';
    document.getElementById('bs-state').value = data.state || '';
    document.getElementById('bs-city').value = data.city || '';
    document.getElementById('bs-address').value = data.address || '';

    const currBtn = document.getElementById('bs-currency');
    currBtn.dataset.currency = data.currency || '';
    currBtn.innerHTML = data.currency
        ? (getCurrencySymbol(data.currency) + ' ' + data.currency + ' <span style="float:right;opacity:0.5;">▾</span>')
        : '🌍 Select Currency <span style="float:right;opacity:0.5;">▾</span>';

    mbRenderOperatingHoursRows(data.operatingHours || {});

    const socials = data.socials || {};
    document.getElementById('bs-whatsapp').value = socials.whatsapp || '';
    document.getElementById('bs-instagram').value = socials.instagram || '';
    document.getElementById('bs-facebook').value = socials.facebook || '';
    document.getElementById('bs-twitter').value = socials.twitter || '';
    document.getElementById('bs-youtube').value = socials.youtube || '';
    document.getElementById('bs-linkedin').value = socials.linkedin || '';
    document.getElementById('bs-tiktok').value = socials.tiktok || '';
}

function mbCloseBusinessSettings() {
    document.getElementById('mb-business-settings-overlay').style.display = 'none';
    document.getElementById('my-business-overlay').style.display = 'flex';
}

async function mbSaveBusinessSettings() {
    const username = localStorage.getItem("nexus_user_session");
    const btn = document.getElementById('bs-save-btn');
    btn.textContent = '⏳ Saving...';
    btn.disabled = true;

    const operatingHours = {};
    MB_DAYS.forEach(function(day) {
        operatingHours[day] = {
            enabled: document.getElementById('bs-hours-enabled-' + day).checked,
            open: document.getElementById('bs-hours-open-' + day).value,
            close: document.getElementById('bs-hours-close-' + day).value
        };
    });

    const payload = {
        phone: document.getElementById('bs-phone').value.trim(),
        email: document.getElementById('bs-email').value.trim(),
        website: document.getElementById('bs-website').value.trim(),
        country: document.getElementById('bs-country').value.trim(),
        state: document.getElementById('bs-state').value.trim(),
        city: document.getElementById('bs-city').value.trim(),
        address: document.getElementById('bs-address').value.trim(),
        currency: document.getElementById('bs-currency').dataset.currency || '',
        operatingHours: operatingHours,
        socials: {
            whatsapp: document.getElementById('bs-whatsapp').value.trim(),
            instagram: document.getElementById('bs-instagram').value.trim(),
            facebook: document.getElementById('bs-facebook').value.trim(),
            twitter: document.getElementById('bs-twitter').value.trim(),
            youtube: document.getElementById('bs-youtube').value.trim(),
            linkedin: document.getElementById('bs-linkedin').value.trim(),
            tiktok: document.getElementById('bs-tiktok').value.trim()
        }
    };

    try {
        if (typeof guaranteeAuth === 'function') await guaranteeAuth();
        await firebase.database().ref('providers/' + username).update(payload);
        showGlobalToast('✅ Business settings saved');
        mbCloseBusinessSettings();
    } catch (err) {
        showGlobalToast('❌ Save failed: ' + err.message);
    } finally {
        btn.textContent = 'Save All Changes';
        btn.disabled = false;
    }
    }
const MB_FAQS = [
    { q: 'How do I get paid for orders?', a: 'Customers pay you directly based on the contact method you set up. Nexus does not process payments on your behalf yet — coordinate payment details with each customer directly.' },
    { q: 'How do I make my profile visible to customers?', a: 'Go to Overview and tap "Publish" on the orange banner, or use the Publish button at the top of your dashboard. Your profile stays hidden from customers until you publish it.' },
    { q: 'What is the difference between Orders and Delivery Requests?', a: 'Orders come from your Shop/Place Order flow — usually immediate purchases. Delivery Requests come from customers requesting delivery for a specific date.' },
    { q: 'How do I change my currency?', a: 'Open Business (Quick Actions) → Location & Currency → tap the Currency field to select your preferred currency.' },
    { q: 'Why is my Profile Health score low?', a: 'Complete each item in the "Complete Your Setup" checklist on your Overview tab — business info, menu items, payment method, and publishing your menu.' },
    { q: 'How do repeat customers work?', a: 'Open the Customers tab to see everyone who has ordered from you or requested delivery. Anyone with more than one order or delivery request is tagged "REPEAT".' }
];

function mbOpenHelpModal() {
    const list = document.getElementById('mb-faq-list');
    list.innerHTML = MB_FAQS.map((f, i) => `
        <div style="background:#ffffff;border-radius:14px;margin-bottom:8px;overflow:hidden;">
            <button onclick="mbToggleFaq(${i})" style="width:100%;text-align:left;background:none;border:none;padding:14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-family:inherit;">
                <span style="font-size:12.5px;font-weight:700;color:#1e293b;">${f.q}</span>
                <span id="mb-faq-arrow-${i}" style="font-size:11px;color:#94a3b8;transition:transform 0.2s ease;flex-shrink:0;margin-left:8px;">▾</span>
            </button>
            <div id="mb-faq-answer-${i}" style="display:none;padding:0 14px 14px;font-size:12px;color:#64748b;line-height:1.5;">${f.a}</div>
        </div>`).join('');
    document.getElementById('mb-help-overlay').style.display = 'flex';
}

function mbToggleFaq(i) {
    const answer = document.getElementById('mb-faq-answer-' + i);
    const arrow = document.getElementById('mb-faq-arrow-' + i);
    const isOpen = answer.style.display === 'block';
    answer.style.display = isOpen ? 'none' : 'block';
    arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

const MB_WHATS_NEW = [
    { date: 'August 2026', tag: 'NEW', title: 'Reviews & Gallery tabs', body: 'Monitor all your customer reviews in one place, and manage your portfolio photos directly from your dashboard.' },
    { date: 'August 2026', tag: 'NEW', title: 'Business Settings', body: 'Set your contact details, operating hours, location, currency, and social media links — all in one dedicated page.' },
    { date: 'August 2026', tag: 'IMPROVED', title: 'Sales & Orders upgrades', body: 'Sales now shows a 14-day revenue trend chart. Orders now has search so you can find any order instantly.' },
    { date: 'August 2026', tag: 'NEW', title: 'Delivery Requests & Insights', body: 'Track delivery requests with due dates so you never miss one, and see how many people are viewing your profile.' },
    { date: 'July 2026', tag: 'NEW', title: 'Customer profiles', body: 'See everyone who has ordered or booked you, with repeat-customer badges and total spend.' }
];

function mbOpenWhatsNewModal() {
    const list = document.getElementById('mb-whatsnew-list');
    list.innerHTML = MB_WHATS_NEW.map(item => {
        const tagColor = item.tag === 'NEW' ? '#16a34a' : '#2563eb';
        return `
        <div style="display:flex;gap:12px;margin-bottom:18px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${tagColor};margin-top:6px;flex-shrink:0;"></div>
            <div style="flex:1;">
                <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${item.date}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                    <span style="font-size:9px;font-weight:800;color:${tagColor};background:${tagColor}1a;padding:2px 7px;border-radius:6px;">${item.tag}</span>
                    <div class="mb-heading-brand" style="font-size:13.5px;font-weight:800;color:#1e293b;">${item.title}</div>
                </div>
                <div style="font-size:12px;color:#64748b;line-height:1.5;">${item.body}</div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('mb-whatsnew-overlay').style.display = 'flex';
}

function mbOpenAddCategory() {
    document.getElementById('mb-inp-new-category').value = '';
    document.getElementById('mb-add-category-overlay').style.display = 'flex';
}
function mbCloseAddCategory() {
    document.getElementById('mb-add-category-overlay').style.display = 'none';
}
function mbSaveNewCategory() {
    const name = document.getElementById('mb-inp-new-category').value.trim();
    if (!name) return;
    mbCloseAddCategory();
    document.getElementById('mb-inp-category').value = name;
    mbOpenAddItem();
    document.getElementById('mb-inp-category').value = name;
    }

/* ============================================================
   PRODUCTS PAGE OVERLAY LOGIC (merged from products-page.js)
   ============================================================ */
/* ============================================================
   products-page.js — page logic for products-page.html,
   extracted out of the page so the SPA router (router.js) can
   load and (re)run it whenever someone navigates here without a
   full page reload.
   ============================================================ */


let qty = 1;
let selectedColor = null;
let popTimer;
let selectedStars = 0;
let currentUser = { name: "Sadiq Developer" };
// Product currently shown — set by bootProductsPage(). Falls back to the
// ?id= URL param for the standalone products-page.html; set explicitly
// when this runs as an overlay inside shop.html (no URL change there).
let activeProductId = null;

function updateQty(change) {
    qty += change;
    if (qty < 1) qty = 1;
    document.getElementById('qty-display').innerText = qty;
}

    function sendVendorMsg() {
    const input = document.getElementById('vendorMsgInput');
    const msg = input.value.trim();
    if (!msg) return;

    // Samu product info don tag
    const productName  = document.querySelector('.floating-card h1')?.innerText || '';
    const productPrice = document.getElementById('main-price')?.innerText || '';
    const productImg   = document.getElementById('dynamic-img')?.src || '';

    // Adana a localStorage don vendor-chat.html ya karba
    localStorage.setItem('vc_msg',   msg);
    localStorage.setItem('vc_name',  productName);
    localStorage.setItem('vc_price', productPrice);
    localStorage.setItem('vc_img',   productImg);

    // Nuna "See Conversation" state
    document.getElementById('cv-before').style.display = 'none';
    document.getElementById('cv-after').style.display  = 'block';

    // Adana a localStorage don page ta tuna state
    const currentProductId = activeProductId || 'default';
localStorage.setItem('vc_sent', currentProductId);

    // Bude vendor-chat.html
    setTimeout(() => {
        openVendorChatOverlay(window.currentVendorId);
    }, 400);
}

// Duba state da page ta buɗe — idan an riga an aika
function checkVendorState() {
    const currentProductId = activeProductId || 'default';
if (localStorage.getItem('vc_sent') === currentProductId) {
        const before = document.getElementById('cv-before');
        const after  = document.getElementById('cv-after');
        if (before) before.style.display = 'none';
        if (after)  after.style.display  = 'block';
    }
}


        // Saka selected pill a cikin input
function selectQuickMsg(pill) {
    document.getElementById('vendorMsgInput').value = pill.innerText.trim();
    document.querySelectorAll('.quick-pill').forEach(p => {
        p.style.background = 'rgba(255,255,255,0.07)';
        p.style.border = '1px solid rgba(255,255,255,0.12)';
        p.style.color = '#F5F5DC';
    });
    pill.style.background = 'rgba(253,224,141,0.15)';
    pill.style.border = '1.5px solid rgba(253,224,141,0.5)';
    pill.style.color = '#fde08d';
}


    

function expandVisualProof(e) {
    if (e) e.stopPropagation();
    document.getElementById('vp-extra-grid').style.display = 'flex';
    document.getElementById('vp-seeall-wrap').style.display = 'none';
}

function openFS(imgs) {
    const s = document.getElementById('fsSlider');
    s.innerHTML = imgs.map(i => `<img src="${i}" ondblclick="this.classList.toggle('zoomed')">`).join('');
    document.getElementById('fullscreen-viewer').style.display = 'block';

    const dotsWrap = document.getElementById('fsDots');
    const counter = document.getElementById('fsCounter');
    dotsWrap.innerHTML = imgs.map((_, idx) => `<span class="${idx === 0 ? 'active' : ''}"></span>`).join('');
    counter.innerText = `1/${imgs.length}`;

    s.onscroll = () => {
        const idx = Math.round(s.scrollLeft / window.innerWidth);
        counter.innerText = `${idx + 1}/${imgs.length}`;
        [...dotsWrap.children].forEach((dot, i) => dot.classList.toggle('active', i === idx));
    };

    // Double-tap-to-zoom don touch devices (wanda ba sa harba 'dblclick' koyaushe)
    if (!s.dataset.zoomBound) {
        let lastTap = 0;
        s.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTap < 300 && e.target.tagName === 'IMG') {
                e.preventDefault();
                e.target.classList.toggle('zoomed');
            }
            lastTap = now;
        });
        s.dataset.zoomBound = '1';
    }
}
function closeFS() { document.getElementById('fullscreen-viewer').style.display = 'none'; }

/* ---------- Hero slider (main product image area) ---------- */
let heroImages = [];
function initHeroSlider(images) {
    heroImages = images;
    const slider = document.getElementById('main-slider');
    const counter = document.getElementById('hero-counter');
    if (!slider || images.length === 0) return;

    slider.innerHTML = images.map((u, i) =>
        `<img src="${u}" onclick="openHeroFS(${i})">`
    ).join('');

    if (counter) {
        counter.style.display = images.length > 1 ? 'block' : 'none';
        counter.innerText = `1/${images.length}`;
    }

    slider.onscroll = () => {
        if (!counter || images.length <= 1) return;
        const idx = Math.round(slider.scrollLeft / slider.clientWidth);
        counter.innerText = `${idx + 1}/${images.length}`;
    };
}

function openHeroFS(index) {
    if (heroImages.length === 0) return;
    openFS(heroImages);
    setTimeout(() => {
        document.getElementById('fsSlider').scrollTo({ left: window.innerWidth * index, behavior: "instant" });
    }, 50);
}

function openVisualProofFS(startIndex) {
    const images = document.querySelectorAll('.stack-img');
    const imageUrls = Array.from(images).map(img => img.src).filter(src => src && src.trim() !== "");
    if(imageUrls.length === 0) return;
    openFS(imageUrls);
    setTimeout(() => {
        document.getElementById('fsSlider').scrollTo({ left: window.innerWidth * startIndex, behavior: "instant" });
    }, 50);
}

function checkSelection() {
    const currentImg = document.getElementById('dynamic-img').src;
    NexusRouter.navigateTo(`checkout.html?qty=${qty}&img=${encodeURIComponent(currentImg)}`);
}

function openChat() { NexusRouter.navigateTo('chat-room.html'); }

function openInf() {
    const img = document.getElementById('dynamic-img').src;
    document.getElementById('magic-atamfa-display').src = img;
    document.getElementById('magic-atamfa-display').classList.add('active');
    document.getElementById('infinity-overlay').style.display = 'flex';
}
function closeInf() { document.getElementById('infinity-overlay').style.display = 'none'; }

function selectColor(name, hex, el) {
    selectedColor = name;
    document.querySelectorAll('.item-card-mini').forEach(c => c.classList.remove('active-node'));
    el.classList.add('active-node');

    // Live preview — tint the floating product image toward the chosen color
    const preview = document.getElementById('magic-atamfa-display');
    preview.style.filter = `saturate(1.3) drop-shadow(0 10px 25px ${hex}66)`;
    preview.style.boxShadow = `0 0 40px ${hex}55`;
    preview.style.border = `3px solid ${hex}`;

    const btn = document.getElementById('inf-action');
    btn.disabled = false;
    btn.classList.add('active');
    btn.querySelector('span').innerText = `Add ${name} to Cart`;
}

function infProceed() {
    if (!selectedColor) return;
    addToCartFunction(selectedColor);
    closeInf();
}

function addToCartFunction(color) {
    const currentImg = document.getElementById('dynamic-img').src;
    const currentName = document.querySelector('.floating-card h1').innerText;
    const currentPrice = document.getElementById('main-price').innerText.replace(/[^\d]/g, '');
    
    let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    cart.push({ name: currentName, price: currentPrice, img: currentImg, color: color || null });
    localStorage.setItem('cartItems', JSON.stringify(cart));
    openModal();
}

function openModal() {
    const modal = document.getElementById('cart-modal');
    const prog = document.getElementById('progress');
    const num = document.getElementById('num');
    const cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    const promoGrid = document.querySelector('.promo-grid');
    
    if (promoGrid && cart.length > 0) {
        promoGrid.innerHTML = cart.slice(-12).reverse().map(item => `
            <div class="promo-item">
                <div class="item-box"><img src="${item.img}"></div>
                <div class="stock-label">In Cart</div>
                <div class="price-label">₦${Number(item.price).toLocaleString()}</div>
            </div>
        `).join('');
    }
    const checkoutBtn = document.querySelector('.btn-checkout');
    if (checkoutBtn) checkoutBtn.innerText = `Check out these items (${cart.length})`;
    modal.classList.add('active');
    
    clearInterval(popTimer);
    let time = 5;
    if(prog) prog.style.strokeDashoffset = 88;
    const runTimer = () => {
        if(num) num.innerText = time + 's';
        if(prog) prog.style.strokeDashoffset = 88 - (88 * (5 - time) / 5);
        if(time <= 0) { clearInterval(popTimer); closeModal(); }
        time--;
    };
    runTimer();
    popTimer = setInterval(runTimer, 1000);
}

function closeModal() {
    clearInterval(popTimer);
    document.getElementById('cart-modal').classList.remove('active');
}

function rate(n) {
    selectedStars = n;
    const stars = document.querySelectorAll('#star-box span');
    stars.forEach((s, index) => { s.style.color = index < n ? '#FFB800' : '#e0e0e0'; });
    const btn = document.getElementById('submit-review');
    btn.disabled = false;
    btn.style.background = '#1A0F0D';
    btn.style.cursor = 'pointer';
}

function postReview() {
    const text = document.getElementById('review-text').value;
    if(!text) return;
    const feed = document.getElementById('reviews-feed');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const reviewHTML = `
        <div style="border-bottom:1px solid rgba(255,255,255,0.08);padding:15px;margin:0 15px;font-family:'Quicksand';">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#F5F5DC;">${currentUser.name[0]}</div>
                <div style="flex-grow:1;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <h4 style="font-size:12px;font-weight:800;margin:0;color:#F5F5DC;">${currentUser.name}</h4>
                        <span style="font-size:10px;color:rgba(245,245,220,0.4);">${dateStr}</span>
                    </div>
                    <div style="color:#FFB800;font-size:8px;">${"★".repeat(selectedStars)}</div>
                </div>
            </div>
            <p style="font-size:12px;color:rgba(245,245,220,0.7);line-height:1.4;margin-left:42px;">${text}</p>
        </div>`;
    feed.insertAdjacentHTML('afterbegin', reviewHTML);
    document.getElementById('review-text').value = "";
    selectedStars = 0; rate(0);
    const btn = document.getElementById('submit-review');
    btn.disabled = true;
    btn.style.background = '#ccc';
}

const pp_firebaseConfig = {
    apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
    authDomain: "oryzon-50ea4.firebaseapp.com",
    projectId: "oryzon-50ea4",
    storageBucket: "oryzon-50ea4.firebasestorage.app",
    messagingSenderId: "782106742622",
    appId: "1:782106742622:web:902d512bfe42dd4cf289cf"
};

let _pp_app, _pp_db, _pp_doc, _pp_getDoc;
async function ensureProductsPageFirebase() {
    if (_pp_db) return;
    const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js");
    const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
    // Reuse an already-initialized default app (e.g. from nexus-core.js on
    // whichever page the user came from) instead of blindly calling
    // initializeApp() again, which throws "app/duplicate-app" if one exists.
    _pp_app = getApps().length ? getApp() : initializeApp(pp_firebaseConfig);
    _pp_db = getFirestore(_pp_app);
    _pp_doc = doc;
    _pp_getDoc = getDoc;
}

function goBackToStore() {
    history.back();
}

async function loadSellerInfo(vendorId) {
    try {
        await ensureProductsPageFirebase();
        const vSnap = await _pp_getDoc(_pp_doc(_pp_db, "vendors", vendorId));
        const v = vSnap.exists() ? vSnap.data() : {};

        const nameEl = document.getElementById('seller-name');
        const avatarEl = document.getElementById('seller-avatar');
        const joinedEl = document.getElementById('seller-joined');

        if (nameEl) nameEl.textContent = v.storeName || vendorId;
        if (avatarEl) avatarEl.src = v.logoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(vendorId)}`;
        if (joinedEl) {
            if (v.joinedAt) {
                const year = new Date(v.joinedAt).getFullYear();
                joinedEl.textContent = `Joined ${year}`;
            } else {
                joinedEl.textContent = 'Verified Seller';
            }
        }
    } catch (err) {
        console.warn('Could not load seller info:', err.message);
    }
}

async function loadProduct() {
    const productId = activeProductId;

    if (!productId) {
        console.warn("⚠️ Babu Product ID a cikin URL. Ana duba localStorage...");
        const backup = localStorage.getItem('selectedProduct');
        if(backup) {
            const p = JSON.parse(backup);
            applyProductData(p.name, p.price, p.img);
        }
        return;
    }

    try {
        await ensureProductsPageFirebase();
        const docRef = _pp_doc(_pp_db, "products", productId);
        const docSnap = await _pp_getDoc(docRef);

        if (docSnap.exists()) {
            const p = docSnap.data();
            const imgUrl = p.image || p.img || "";
            const priceVal = p.price || "0";
            const nameVal = p.name || "Signature Fabric";
            const descVal = p.description || "";
            const galleryVal = Array.isArray(p.gallery) ? p.gallery : (Array.isArray(p.images) ? p.images : []);

            window.currentVendorId = p.vendorId || p.vendor || p.sellerId || '';
            const sellerLink = document.getElementById('seller-details-link');
            const visitShopLink = document.getElementById('visit-shop-link');
            if (window.currentVendorId) {
                if (sellerLink) {
                    sellerLink.href = `me.html?user=${encodeURIComponent(window.currentVendorId)}`;
                    sellerLink.setAttribute('data-spa-link', sellerLink.href);
                }
                if (visitShopLink) {
                    visitShopLink.removeAttribute('data-spa-link');
                    visitShopLink.href = 'javascript:void(0)';
                    visitShopLink.onclick = (e) => {
                        e.preventDefault();
                        openStoreFrontOverlay(window.currentVendorId);
                    };
                }
                loadSellerInfo(window.currentVendorId);
            }
applyProductData(nameVal, priceVal, imgUrl, descVal, galleryVal);
            
            // Adana shi don kariya
            localStorage.setItem('selectedProduct', JSON.stringify({ name: nameVal, price: priceVal, img: imgUrl }));
            console.log("✅ Successfully loaded from Firebase:", nameVal);
        } else {
            console.error("❌ Babu wannan ID din a database!");
        }
    } catch (err) {
        console.error("❌ Firebase Retrieval Error:", err);
    }
}



function toggleSave(btn) {
    const icon = document.getElementById('save-icon');
    const saved = icon.classList.contains('fa-solid');
    if (saved) {
        icon.classList.replace('fa-solid', 'fa-regular');
        icon.style.color = '#1A0F0D';
        btn.style.background = 'white';
    } else {
        icon.classList.replace('fa-regular', 'fa-solid');
        icon.style.color = '#1A0F0D';
        btn.style.background = '#f0f0f0';
    }
    if (navigator.vibrate) navigator.vibrate(10);
}

function toggleFollow(btn) {
    const icon = document.getElementById('follow-icon');
    const text = document.getElementById('follow-text');
    const isFollowing = text.textContent === 'Following';
    if (isFollowing) {
        icon.className = 'fa-solid fa-plus';
        icon.style.fontSize = '10px';
        text.textContent = 'Follow';
        btn.style.background = '#1A0F0D';
        btn.style.color = 'white';
    } else {
        icon.className = 'fa-solid fa-check';
        icon.style.fontSize = '10px';
        text.textContent = 'Following';
        btn.style.background = 'white';
        btn.style.color = '#1A0F0D';
        btn.style.border = '1px solid rgba(0,0,0,0.1)';
    }
    if (navigator.vibrate) navigator.vibrate(10);
}
    


    
function applyProductData(name, price, img, desc, extraImages) {
    extraImages = extraImages || [];
    // 1. Hade duk hotunan cikin jeri daya, cire duk wani kwafi (idan gallery ta sake dauke da main image)
    const allImages = [img, ...extraImages].filter(u => u && u.trim() !== "");
    const uniqueImages = [...new Set(allImages)];

    initHeroSlider(uniqueImages);
    document.querySelectorAll('.holo-img').forEach(el => el.src = img);
    renderVisualProof(uniqueImages);

    // 2. Sanya suna
    const nameEl = document.querySelector('.floating-card h1');
    if (nameEl) { nameEl.innerHTML = name; nameEl.classList.remove('skeleton'); }

    // 3. Gyara farashi ya fito radau da Alamar Naira
    const priceEl = document.getElementById('main-price');
    if (priceEl) {
        let cleanPrice = price.toString().replace(/[^\d]/g, '');
        priceEl.innerText = "₦" + Number(cleanPrice).toLocaleString();
        priceEl.classList.remove('skeleton');
    }
   const descEl = document.getElementById('product-description');
  if (descEl && desc) descEl.innerText = desc;
  }

/* ---------- Visual proof (dynamic, matches the real photo count) ---------- */
function renderVisualProof(images) {
    const grid = document.getElementById('vp-grid');
    const extraGrid = document.getElementById('vp-extra-grid');
    if (!grid) return;

    if (images.length === 0) {
        grid.innerHTML = '';
        if (extraGrid) { extraGrid.innerHTML = ''; extraGrid.style.display = 'none'; }
        return;
    }

    const visible = images.slice(0, 3);
    const extra = images.slice(3);
    const hasMore = extra.length > 0;

    let html = visible.slice(0, visible.length - 1).map((u, i) =>
        `<img src="${u}" class="stack-img vp-stack-img" onclick="openVisualProofFS(${i})">`
    ).join('');

    if (visible.length >= 1) {
        const lastImg = visible[visible.length - 1];
        const lastIndex = visible.length - 1;
        html += `
            <div id="vp-last-wrap" style="position:relative;">
                <img src="${lastImg}" class="stack-img vp-stack-img" onclick="openVisualProofFS(${lastIndex})">
                <div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(to bottom, transparent 0%, #050505 100%);pointer-events:none;"></div>
                ${hasMore ? `
                <div id="vp-seeall-wrap" onclick="expandVisualProof(event)" style="display:block;position:absolute;bottom:14px;left:0;width:100%;text-align:center;cursor:pointer;">
                    <div style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;">
                        <span style="font-size:12px;font-weight:800;color:#F5F5DC;text-transform:uppercase;">See all</span>
                        <i class="fa-solid fa-chevron-down" style="font-size:10px;color:#F5F5DC;"></i>
                    </div>
                </div>` : ''}
            </div>`;
    }
    grid.innerHTML = html;

    if (extraGrid) {
        if (hasMore) {
            extraGrid.innerHTML = extra.map((u, i) =>
                `<img src="${u}" class="stack-img vp-stack-img" onclick="openVisualProofFS(${3 + i})">`
            ).join('');
        } else {
            extraGrid.innerHTML = '';
        }
        extraGrid.style.display = 'none';
    }
}

/* ---------- Boot / destroy ---------- */
function bootProductsPage(productId) {
    activeProductId = productId || new URLSearchParams(window.location.search).get('id') || null;
    try {
        checkVendorState();
    } catch (err) {
        console.error('checkVendorState failed:', err);
    }
    loadProduct();
}

function destroyProductsPage() {
    clearInterval(popTimer);
}


/* ============================================================
   STORE FRONT OVERLAY LOGIC (merged from store-front.js)
   ============================================================ */
/* ============================================================
   store-front.js — page logic for store-front.html, extracted
   out of the page so the SPA router (router.js) can load and
   (re)run it whenever someone navigates here without a full
   page reload.
   ============================================================ */

/* ---------- Compat SDK init (Realtime Database). Runs once at
   script-load time — safe across SPA navigations since the
   firebase.* globals persist. ---------- */
        const firebaseConfig = {
            apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
            authDomain: "oryzon-50ea4.firebaseapp.com",
            databaseURL: "https://oryzon-50ea4-default-rtdb.firebaseio.com",
            projectId: "oryzon-50ea4",
            storageBucket: "oryzon-50ea4.firebasestorage.app",
            messagingSenderId: "782106742622",
            appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
            measurementId: "G-K5085DLL2W"
        };
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
        const database = firebase.database();

let storeFrontUnsubscribes = [];
let _sfFbApp = null, _sfDb = null;

async function bootStoreFront(vendorUsernameOverride) {
    storeFrontUnsubscribes.forEach(fn => { try { fn(); } catch (e) {} });
    storeFrontUnsubscribes = [];
    try {

        const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js");
        const { getFirestore, collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc, updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");

        const firebaseConfig = {
            apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
            authDomain: "oryzon-50ea4.firebaseapp.com",
            projectId: "oryzon-50ea4",
            storageBucket: "oryzon-50ea4.firebasestorage.app",
            messagingSenderId: "782106742622",
            appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
            measurementId: "G-K5085DLL2W"
        };

        // initializeApp() throws "app/duplicate-app" if a default app already
        // exists — which can happen either because store-front.js itself
        // already booted once this session, OR because another page
        // (nexus-core.js on social.html/videos.html/me.html/etc.) already
        // initialized the same default app before the user navigated here.
        // Checking getApps() (global, not just our own local flag) covers
        // both cases.
        if (!_sfFbApp) {
            _sfFbApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
            _sfDb = getFirestore(_sfFbApp);
        }
        const db = _sfDb;

        // 1. Karanto vendor username daga URL (misali: store-front.html?vendor=wolay_underwear)
        const urlParams = new URLSearchParams(window.location.search);
        const vendorUsername = vendorUsernameOverride || urlParams.get('vendor');

        const grid = document.getElementById('vendor-grid');
        let currentItems = [];
        let viewMode = 'grid';

        function productCardHTML(p) {
            const isVideo = p.isVideo || (p.image || '').endsWith('.mp4');
            return `
                <div class="grid-item" onclick="goToProductDetails('${p.id}')">
                    ${isVideo ? `<video src="${p.image}" muted loop autoplay class="w-full h-full object-cover"></video>` : `<img src="${p.image}" loading="lazy">`}
                    <div class="price-style-1">₦${p.price}</div>
                </div>`;
        }

        function listItemHTML(p) {
            const isVideo = p.isVideo || (p.image || '').endsWith('.mp4');
            return `
                <div class="list-item-card" onclick="goToProductDetails('${p.id}')">
                    <div class="list-item-thumb">
                        ${isVideo ? `<video src="${p.image}" muted loop autoplay></video>` : `<img src="${p.image}" loading="lazy">`}
                    </div>
                    <div class="list-item-details">
                        <div>
                            <div class="list-item-price">₦${p.price}</div>
                            ${p.name ? `<div class="list-item-name">${p.name}</div>` : ''}
                        </div>
                        <div class="vendor-msg-bar" onclick="event.stopPropagation()">
                            <input id="vendorMsgInput_${p.id}" type="text" value="Is this still available? 😊"
                                onkeydown="if(event.key==='Enter') sendListItemMsg('${p.id}','${p.image}','${p.price}')">
                            <button onclick="sendListItemMsg('${p.id}','${p.image}','${p.price}')">
                                <i class="fa-solid fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
        }

        let displayedItems = [];

        function renderItems() {
            displayedItems = currentItems;
            document.getElementById('statItems').textContent = currentItems.length;
            renderDisplayedItems();
        }

        function renderDisplayedItems() {
            if (!displayedItems.length) {
                grid.className = viewMode === 'grid' ? 'product-grid' : 'product-list';
                grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#888;padding:60px 20px;">${currentItems.length ? 'No matching products.' : 'This vendor has no products yet.'}</div>`;
                return;
            }
            if (viewMode === 'grid') {
                grid.className = 'product-grid';
                grid.innerHTML = displayedItems.map(productCardHTML).join('');
            } else {
                grid.className = 'product-list';
                grid.innerHTML = displayedItems.map(listItemHTML).join('');
            }
        }

        window.goToProductDetails = function (productId) {
            openProductsPageOverlay(productId);
        };

        window.toggleStoreSearch = function () {
            const bar = document.getElementById('storeSearchBar');
            const isHidden = bar.style.display === 'none';
            bar.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                document.getElementById('storeSearchInput').focus();
            } else {
                document.getElementById('storeSearchInput').value = '';
                displayedItems = currentItems;
                renderDisplayedItems();
            }
        };

        window.filterStoreItems = function (q) {
            const term = q.trim().toLowerCase();
            displayedItems = !term ? currentItems : currentItems.filter(p =>
                (p.name || '').toLowerCase().includes(term) || String(p.price || '').includes(term)
            );
            renderDisplayedItems();
        };

        window.shareStore = function () {
            const shareData = {
                title: document.getElementById('storeName').textContent,
                text: `Check out ${document.getElementById('storeName').textContent} on Nexus`,
                url: window.location.href
            };
            if (navigator.share) {
                navigator.share(shareData).catch(() => {});
            } else {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('Store link copied to clipboard!');
                }).catch(() => {});
            }
        };

        function renderVendorProfile(v) {
            document.getElementById('storeName').textContent = v.storeName || vendorUsername;
            document.getElementById('statFollowers').textContent = (v.followers || 0).toLocaleString();
            document.getElementById('statSold').textContent = (v.sold || 0).toLocaleString();

            const avatarEl = document.getElementById('storeAvatar');
            if (v.logoUrl) {
                avatarEl.innerHTML = `<img src="${v.logoUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                const initials = (v.storeName || vendorUsername || '?').trim().slice(0, 2).toUpperCase();
                avatarEl.innerHTML = `<span class="wolay-logo-text" style="font-size:22px;">${initials}</span>`;
            }
        }

        if (vendorUsername) {
            // 2. Products: sell.html's exact seller-field name isn't confirmed yet,
            // so (same as shop.html) we listen on every common naming convention
            // and merge results by product id.
            const candidateFields = ['sellerUsername', 'seller', 'sellerId', 'vendorUsername', 'vendorId', 'ownerUsername', 'username'];
            const seen = new Map();
            candidateFields.forEach(field => {
                const q = query(collection(db, "products"), where(field, "==", vendorUsername));
                storeFrontUnsubscribes.push(onSnapshot(q, (snapshot) => {
                    snapshot.forEach(docSnap => seen.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
                    currentItems = Array.from(seen.values());
                    renderItems();
                }, () => {}));
            });

            // 3. Vendor store profile (suna, logo, followers, sold) — collection "vendors", doc id = username
            getDoc(doc(db, "vendors", vendorUsername)).then(snap => {
                renderVendorProfile(snap.exists() ? snap.data() : {});
            }).catch(() => {
                renderVendorProfile({});
            });
        } else {
            grid.innerHTML = `<p style="color:#888;padding:20px;grid-column:1/-1;">No vendor specified in URL.</p>`;
            document.getElementById('storeName').textContent = 'No vendor specified';
        }

        // Catalogue / Message / Follow segmented control
        window.openReviewsOverlay = function () {
            document.getElementById('reviews-overlay').style.display = 'block';
            loadReviews();
        };

        window.closeReviewsOverlay = function () {
            document.getElementById('reviews-overlay').style.display = 'none';
        };

        async function loadReviews() {
            const list = document.getElementById('reviews-list');
            list.innerHTML = `<div style="color:#888;text-align:center;padding:40px 0;">Loading reviews...</div>`;
            try {
                const q = query(collection(db, "vendors", vendorUsername, "reviews"), orderBy("time", "desc"));
                const snap = await getDocs(q);
                if (snap.empty) {
                    list.innerHTML = `<div style="color:#888;text-align:center;padding:40px 0;">No reviews yet.</div>`;
                    return;
                }
                list.innerHTML = snap.docs.map(d => {
                    const r = d.data();
                    const stars = '★'.repeat(Math.round(r.rating || 0)) + '☆'.repeat(5 - Math.round(r.rating || 0));
                    return `
                        <div style="border-bottom:1px solid rgba(255,255,255,0.08);padding:14px 0;">
                            <div style="color:#fde08d;font-size:14px;letter-spacing:2px;">${stars}</div>
                            <div style="color:#fff;font-weight:700;font-size:13px;margin-top:4px;">${r.reviewerName || 'Anonymous'}</div>
                            <div style="color:#ccc;font-size:13px;margin-top:4px;">${r.comment || ''}</div>
                        </div>`;
                }).join('');
            } catch (err) {
                list.innerHTML = `<div style="color:#888;text-align:center;padding:40px 0;">No reviews yet.</div>`;
            }
        }

        window.goToVendorInbox = function () {
            openVendorChatOverlay(vendorUsername || '');
        };

        window.toggleFollowStore = function () {
            const btn = document.getElementById('seg-follow-btn');
            const isNowFollowing = btn.classList.toggle('active');
            btn.textContent = isNowFollowing ? 'Following' : 'Follow';
            if (!vendorUsername) return;
            updateDoc(doc(db, "vendors", vendorUsername), {
                followers: increment(isNowFollowing ? 1 : -1)
            }).catch(() => {});
        };

        // Per-product "Is this still available?" bar — same pattern as products-page.html's sendVendorMsg
        window.sendListItemMsg = function (productId, img, price) {
            const input = document.getElementById('vendorMsgInput_' + productId);
            const msg = (input ? input.value : '').trim();
            if (!msg) return;

            localStorage.setItem('vc_msg', msg);
            localStorage.setItem('vc_name', vendorUsername || '');
            localStorage.setItem('vc_price', price || '');
            localStorage.setItem('vc_img', img || '');
            localStorage.setItem('vc_sent', productId);

            openVendorChatOverlay(vendorUsername || '');
        };

        window.toggleViewMode = function () {
            viewMode = viewMode === 'grid' ? 'list' : 'grid';
            document.getElementById('view-toggle-icon').className = viewMode === 'grid' ? 'fa-solid fa-table-cells' : 'fa-solid fa-bars';
            renderDisplayedItems();
        };

        window.openFull = function (src, isVideo) {
            const modal = document.getElementById('full-modal');
            const content = document.getElementById('modal-content');
            modal.style.display = 'flex';
            if (isVideo) {
                content.innerHTML = `<video src="${src}" autoplay loop playsinline controls class="w-full h-full object-cover"></video>`;
            } else {
                content.innerHTML = `<img src="${src}" class="w-full h-full object-cover">`;
            }
        };

        window.closeFull = function () {
            const modal = document.getElementById('full-modal');
            document.getElementById('modal-content').innerHTML = '';
            modal.style.display = 'none';
        };
    } catch (err) {
        document.getElementById('storeName').textContent = 'ERROR: ' + err.message;
        console.error('bootStoreFront failed:', err);
    }
}

function destroyStoreFront() {
    storeFrontUnsubscribes.forEach(fn => { try { fn(); } catch (e) {} });
    storeFrontUnsubscribes = [];
}


/* ============================================================
   VENDOR CHAT OVERLAY LOGIC (merged from vendor-chat.js)
   ============================================================ */
/* ============================================================
   vendor-chat.js — page logic for vendor-chat.html, extracted
   out of the page so the SPA router (router.js) can load and
   (re)run it whenever someone navigates here without a full
   page reload.
   ============================================================ */

    const vc_firebaseConfig = {
        apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
        authDomain: "oryzon-50ea4.firebaseapp.com",
        projectId: "oryzon-50ea4",
        storageBucket: "oryzon-50ea4.firebasestorage.app",
        messagingSenderId: "782106742622",
        appId: "1:782106742622:web:902d512bfe42dd4cf289cf"
    };
    if (!firebase.apps.length) firebase.initializeApp(vc_firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    function getChatRoomId(a, b) { return [a, b].sort().join('__'); }

    // The block below used to run once at script-load time, reading
    // ?vendorId= straight off the page's own URL. Now that this can also
    // run as an overlay inside shop.html (no URL change when it opens),
    // it's resolved by vcResolveSessionState() from bootVendorChat()
    // instead — every other reference to these variables below this point
    // is unchanged.
    let params, vendorId, isAdmin, storeName, myUsername, chatDocId;
    let vc_authReadyResolve, vc_authReady, vc_authUnsub = null;

    // Real Oryzon account identity — same pattern as chat-interior.html.
    // A customer must be logged into their real Oryzon account to chat, exactly like
    // messaging a business on Instagram/Facebook requires being logged into your own
    // real account there. This is what makes chat history permanent across any device.
    function vcResolveSessionState(vendorIdOverride) {
        params = new URLSearchParams(window.location.search);
        vendorId = vendorIdOverride || params.get('vendorId') || params.get('with') || 'default';
        isAdmin = params.get('admin') === '1';
        storeName = params.get('name') || "";

        myUsername = localStorage.getItem('nexus_user_session');
        chatDocId = getChatRoomId(vendorId, myUsername);

        // Firebase Auth restores the persisted login session from IndexedDB asynchronously —
        // every Firestore read/write below must wait for this to resolve, or request.auth
        // will be null even though the person is really logged in.
        if (vc_authUnsub) { try { vc_authUnsub(); } catch (e) {} }
        vc_authReady = new Promise(res => { vc_authReadyResolve = res; });
        vc_authUnsub = auth.onAuthStateChanged(user => {
            if (!user) {
                console.warn('No active Firebase Auth session — Firestore writes will fail permission checks.');
            }
            vc_authReadyResolve(user);
        });
    }

    let chatHistory = [];
    let renderedMessages = [];
    let isSending = false;
    let replyingTo = null;
    let editingId = null;
    let pendingMedia = [];
    let mcActiveIndex = 0;
    let botActive = true; // whether the AI bot is currently allowed to auto-reply in this chat

    let mediaRecorder = null, audioChunks = [], isRecording = false, isPaused = false, recSeconds = 0, recTimerHandle = null;
    let finalAudioDataUrl = null;
    let audioCtx = null, analyser = null, waveDataArr = null, waveAnimId = null;
    let recordedStream = null;
    let previewSpeed = 1;
    let isScrubbingCompose = false;
    let currentlyPlayingBubbleId = null;

    // ================= FLOATING AVATAR =================
    function makeDraggable(el) {
        let startX, startY, origX, origY, dragging = false, moved = false;
        el.addEventListener('pointerdown', (e) => {
            dragging = true; moved = false;
            startX = e.clientX; startY = e.clientY;
            const rect = el.getBoundingClientRect();
            origX = rect.left; origY = rect.top;
            el.setPointerCapture(e.pointerId);
        });
        el.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX, dy = e.clientY - startY;
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
            let nx = Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 4, origX + dx));
            let ny = Math.max(4, Math.min(window.innerHeight - el.offsetHeight - 4, origY + dy));
            el.style.left = nx + 'px'; el.style.top = ny + 'px';
        });
        el.addEventListener('pointerup', () => {
            dragging = false;
            const rect = el.getBoundingClientRect();
            localStorage.setItem('il_avatar_pos_' + vendorId, JSON.stringify({ x: rect.left, y: rect.top }));
            if (!moved) handleAvatarTap();
        });
    }
    function restoreAvatarPosition() {
        const el = document.getElementById('floatingAvatar');
        const saved = localStorage.getItem('il_avatar_pos_' + vendorId);
        if (saved) {
            try { const { x, y } = JSON.parse(saved); el.style.left = x + 'px'; el.style.top = y + 'px'; return; } catch(e) {}
        }
        el.style.left = '10px';
        el.style.top = '10px';
    }
    function handleAvatarTap() {
        if (isAdmin) document.getElementById('avatarUploadInput').click();
        else NexusRouter.navigateTo(`me.html?user=${vendorId}`);
    }
    function bindAvatarUploadListener() {
        document.getElementById('avatarUploadInput').addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            document.getElementById('avatarCircle').innerHTML = `<img src="${e.target.result}">`;
            try { await db.collection('vendors').doc(vendorId).set({ photoURL: e.target.result }, { merge: true }); showToast('Profile photo updated'); }
            catch(err) { showToast('Could not save photo'); }
        };
        reader.readAsDataURL(file);
    });
    }

    async function loadVendorAvatarAndStatus() {
        try {
            const doc = await db.collection('vendors').doc(vendorId).get();
            const d = doc.exists ? doc.data() : {};
            if (d.photoURL) document.getElementById('avatarCircle').innerHTML = `<img src="${d.photoURL}">`;
            if (d.name) { storeName = d.name; }
            updateStatusDot(d.lastActive);
        } catch(e) { console.warn('vendor status load failed', e); }
    }
    function updateStatusDot(lastActive) {
        const dot = document.getElementById('avatarStatusDot');
        const online = lastActive && (Date.now() - lastActive < 90000);
        dot.classList.toggle('online', !!online);
        dot.classList.toggle('offline', !online);
    }
    let vcStatusIntervalId = null;
    function startVendorStatusPolling() {
        if (vcStatusIntervalId) { clearInterval(vcStatusIntervalId); vcStatusIntervalId = null; }
        if (isAdmin) {
            vcStatusIntervalId = setInterval(() => { db.collection('vendors').doc(vendorId).set({ lastActive: Date.now() }, { merge: true }).catch(()=>{}); }, 20000);
            db.collection('vendors').doc(vendorId).set({ lastActive: Date.now() }, { merge: true }).catch(()=>{});
        } else {
            vcStatusIntervalId = setInterval(async () => {
                try { const doc = await db.collection('vendors').doc(vendorId).get(); updateStatusDot(doc.exists ? doc.data().lastActive : null); } catch(e) {}
            }, 30000);
        }
    }

    // ================= BOT ACTIVE/PAUSED TOGGLE (admin only) =================
    function updateBotToggleUI() {
        if (!isAdmin) return;
        document.getElementById('botToggleBar').classList.add('visible');
        document.getElementById('botToggleDot').className = `bot-toggle-dot ${botActive ? 'on' : 'off'}`;
        document.getElementById('botToggleText').textContent = `Bot: ${botActive ? 'Active' : 'Paused'}`;
    }
    async function toggleBot(e) {
        if (e) e.preventDefault();
        botActive = !botActive;
        try {
            await db.collection('vendorChats').doc(chatDocId).set({ botActive }, { merge: true });
        } catch(err) {}
        updateBotToggleUI();
        showToast(botActive ? 'Bot ya farka' : 'Bot ya tsaya — kai ne kake magana yanzu');
    }
    async function loadBotStatus() {
        try {
            const chatDoc = await db.collection('vendorChats').doc(chatDocId).get();
            botActive = !chatDoc.exists || chatDoc.data().botActive !== false;
        } catch(e) { botActive = true; }
        updateBotToggleUI();
    }

    // ================= WELCOME SPLASH =================
    function playWelcomeSplash() {
        const splash = document.getElementById('welcomeSplash');
        document.getElementById('splashTitle').textContent = storeName ? `Welcome to ${storeName}` : 'Welcome to our page';
        splash.style.display = 'flex';
        splash.classList.remove('hide');
        splash.classList.add('show');
        setTimeout(() => {
            splash.classList.add('hide');
            setTimeout(() => { splash.style.display = 'none'; splash.classList.remove('show'); }, 600);
        }, 1600);
    }

    // ================= FIRESTORE CHAT =================
    async function loadMessagesFromFirestore() {
        try {
            const snap = await db.collection('vendorChats').doc(chatDocId).collection('messages').orderBy('time','asc').get();
            const msgs = [];
            snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
            return msgs;
        } catch (e) { console.error('Firestore load error', e); return []; }
    }
    function localId() { return 'm' + Date.now() + Math.random().toString(36).slice(2,8); }

    async function saveMessageToFirestore(m) {
        try {
            // customerId ana rubuta shi KAWAI daga bangaren customer (ba admin/vendor ba),
            // domin idan vendor ya buɗe wannan chat ɗin, myUsername nasa zai zama account
            // ɗin VENDOR, ba na customer ba — merge:true yana kiyaye tsohon customerId
            // idan wannan write ɗin bai kunshi shi ba.
            const chatMeta = { vendorId, lastActive: Date.now() };
            if (!isAdmin) chatMeta.customerId = myUsername;
            await db.collection('vendorChats').doc(chatDocId).set(chatMeta, { merge: true });
            const ref = await db.collection('vendorChats').doc(chatDocId).collection('messages').add(m);
            return ref.id;
        } catch (e) {
            console.error('Firestore save error', e);
            showToast('⚠️ Sync failed: ' + (e.code || e.message || 'unknown'));
            return 'local' + Date.now() + Math.random().toString(36).slice(2,6);
        }
    }
    async function updateMessageInFirestore(id, patch) {
        try { await db.collection('vendorChats').doc(chatDocId).collection('messages').doc(id).update(patch); } catch(e) {}
    }
    async function deleteMessageInFirestore(id) {
        try { await db.collection('vendorChats').doc(chatDocId).collection('messages').doc(id).delete(); } catch(e) {}
    }
async function clearChatMessages() {
        try {
            const snap = await db.collection('vendorChats').doc(chatDocId).collection('messages').get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } catch(e) { console.warn('clear chat failed', e); }
}
    async function beginSession() {
        playWelcomeSplash();
        if (params.get('reset') === '1') { await clearChatMessages(); }
        const saved = await loadMessagesFromFirestore();
        if (saved.length > 0) {
            renderedMessages = saved;
            saved.forEach(m => renderMessage(m, false));
            chatHistory = saved.filter(m => m.type === 'text').map(m => ({ role: m.role === 'mine' ? 'user' : 'assistant', content: m.text }));
        } else {
            const greeting = {
                role: 'theirs', type: 'text',
                text: `Welcome to ${storeName} 👑 I'm here to help you find exactly what you're looking for. What can I show you today?`,
                time: Date.now()
            };
            const id = await saveMessageToFirestore(greeting);
            greeting.id = id;
            renderedMessages.push(greeting);
            renderMessage(greeting, true);
        }
        await loadBotStatus();

        // Idan aka zo daga store-front.html/products-page.html tare da wani
        // pre-filled message (misali "Is this still available?"), a tura shi
        // nan take a matsayin sakon customer — TARE DA hoton product ɗin da
        // aka tagged (kamar tsarin pick()) domin vendor ya san akan wane kaya
        // ake magana — sannan a share localStorage domin kada ya sake tura ta.
        const pendingMsg = localStorage.getItem('vc_msg');
        const pendingImg = localStorage.getItem('vc_img');
        if (pendingMsg && !isAdmin) {
            if (pendingImg) {
                const m = { role: 'mine', type: 'image', media: pendingImg, caption: pendingMsg, time: Date.now() };
                const id = await saveMessageToFirestore(m);
                m.id = id;
                renderedMessages.push(m);
                renderMessage(m, true);
                if (botActive) await triggerAIReply(pendingMsg, [{ type: 'image_url', image_url: { url: pendingImg } }]);
            } else {
                const input = document.getElementById('userInput');
                input.value = pendingMsg;
                await sendMessage();
            }
            localStorage.removeItem('vc_msg');
            localStorage.removeItem('vc_name');
            localStorage.removeItem('vc_price');
            localStorage.removeItem('vc_img');
            localStorage.removeItem('vc_sent');

            // Splash screen dinmu na daukar ~2.2s kafin ya boye gaba daya;
            // idan chat din bai cika bayyana ba tukuna, scrollTop na farko
            // baya daidai. Mun sake scroll bayan splash ya kare domin
            // tabbatar da cewa sabon message ya bayyana a kasan page.
            setTimeout(() => {
                const chat = document.getElementById('chat');
                if (chat) chat.scrollTop = chat.scrollHeight;
            }, 2300);
        }
    }

    // ================= TOAST =================
    function showToast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._hideTimer);
        t._hideTimer = setTimeout(() => t.classList.remove('show'), 1800);
    }

    // ================= RENDERING =================
    function timeStr(ts) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str || ''; return div.innerHTML; }
    function findMsg(id) { return renderedMessages.find(m => m.id === id); }
    function rebuildChatHistory() {
        chatHistory = renderedMessages.filter(m => m.type === 'text').map(m => ({ role: m.role === 'mine' ? 'user' : 'assistant', content: m.text }));
    }

    function renderImageGrid(mediaArr) {
        const n = mediaArr.length;
        const cls = n === 1 ? 'n1' : n === 2 ? 'n2' : n === 3 ? 'n3' : 'n4plus';
        const shown = cls === 'n4plus' ? mediaArr.slice(0, 4) : mediaArr;
        const extra = n > 4 ? n - 4 : 0;
        return `<div class="img-grid ${cls}">${shown.map((item, i) => {
            const isLast = extra > 0 && i === 3;
            const el = item.type === 'video' ? `<video src="${item.url}"></video>` : `<img src="${item.url}">`;
            return `<div class="gi">${el}${isLast ? `<div class="more-overlay">+${extra}</div>` : ''}</div>`;
        }).join('')}</div>`;
    }

    function bubbleInner(m) {
        let quote = '';
        if (m.replyTo) quote = `<div class="reply-quote"><span class="rq-who">${m.replyTo.role === 'mine' ? 'You' : storeName}</span>${escapeHtml(m.replyTo.snippet)}</div>`;
        const spacerHtml = `<span class="time-spacer">${m.edited ? 'edited ' : ''}${timeStr(m.time)}</span>`;
        let body = '';
        if (m.type === 'imageGroup') body = renderImageGrid(m.mediaArr);
        else if (m.type === 'image') body = `<img class="chat-img" src="${m.media}">`;
        else if (m.type === 'video') body = `<video class="chat-video" src="${m.media}" controls></video>`;
        else if (m.type === 'voice') body = `<div class="voice-note" data-vn-id="${m.id}">
            <div class="vn-play-btn" id="vn-btn-${m.id}" onclick="toggleBubbleAudio('${m.id}')"><i class="fa-solid fa-play" id="vn-icon-${m.id}"></i></div>
            <div class="vn-track" onpointerdown="startBubbleScrub(event,'${m.id}')">
                <div class="vn-track-line"><div class="vn-fill" id="vn-fill-${m.id}"></div><div class="vn-dot" id="vn-dot-${m.id}"></div></div>
            </div>
            <span class="vn-time" id="vn-time-${m.id}">0:00</span>
            <audio id="vn-audio-${m.id}" src="${m.media}" preload="metadata" style="display:none" oncontextmenu="return false"></audio>
        </div>`;
        else body = escapeHtml(m.text) + spacerHtml;
        if (m.caption) body += `<div style="margin-top:6px;">${escapeHtml(m.caption)}${spacerHtml}</div>`;
        return quote + body;
    }

    function renderMessage(m, animate) {
        const chat = document.getElementById('chat');
        const row = document.createElement('div');
        row.className = `msg-row ${m.role === 'mine' ? 'mine' : 'theirs'}${m.type === 'voice' ? ' voice-row' : ''}`;
        row.id = `row-${m.id}`;
        row.dataset.id = m.id;
        if (!animate) row.style.animation = 'none';
        const bubbleClass = m.role === 'mine' ? 'u-bubble' : 'v-bubble';
        const isMedia = ['image','video','voice','imageGroup'].includes(m.type);
        const isVoice = m.type === 'voice';
        row.innerHTML = `<div class="bubble ${bubbleClass}${isMedia ? ' media-bubble' : ''}${isVoice ? ' voice-bubble' : ''}">${bubbleInner(m)}<span class="msg-time-inline">${m.edited ? '<span class="edited-tag">edited</span>' : ''}${timeStr(m.time)}</span></div>`;
        const bubbleEl = row.querySelector('.bubble');
        attachLongPress(bubbleEl, m.id);
        chat.appendChild(row);
        chat.scrollTop = chat.scrollHeight;
        if (m.type === 'voice') wireBubbleAudio(m.id);
    }

    function showTyping() {
        const chat = document.getElementById('chat');
        const row = document.createElement('div');
        row.className = 'msg-row theirs';
        row.id = 'typing-row';
        row.innerHTML = `<div class="bubble v-bubble typing-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
        chat.appendChild(row);
        chat.scrollTop = chat.scrollHeight;
    }
    function hideTyping() { const r = document.getElementById('typing-row'); if (r) r.remove(); }

    // ================= LONG PRESS CONTEXT MENU =================
    function attachLongPress(el, id) {
        let timer = null;
        const start = (e) => { timer = setTimeout(() => openCtxMenu(id, el), 420); };
        const cancel = () => clearTimeout(timer);
        el.addEventListener('touchstart', start, { passive: true });
        el.addEventListener('touchend', cancel);
        el.addEventListener('touchmove', cancel);
        el.addEventListener('contextmenu', (e) => e.preventDefault());
        el.addEventListener('mousedown', start);
        el.addEventListener('mouseup', cancel);
        el.addEventListener('mouseleave', cancel);
    }
    function openCtxMenu(id, el) {
        const m = findMsg(id);
        if (!m) return;
        if (navigator.vibrate) navigator.vibrate(12);
        el.classList.add('selected-for-menu');
        const menu = document.getElementById('ctxMenu');
        let items = `<div class="ctx-item" onclick="ctxReply('${id}')"><i class="fa-solid fa-reply"></i> Reply</div>`;
        items += `<div class="ctx-item" onclick="ctxCopy('${id}')"><i class="fa-regular fa-copy"></i> Copy</div>
            <div class="ctx-item" onclick="ctxShare('${id}')"><i class="fa-solid fa-share-nodes"></i> Share</div>`;
        if (m.role === 'mine' && m.type === 'text') items += `<div class="ctx-item" onclick="ctxEdit('${id}')"><i class="fa-solid fa-pen"></i> Edit</div>`;
        items += `<div class="ctx-item danger" onclick="ctxDelete('${id}')"><i class="fa-solid fa-trash"></i> Delete</div>`;
        menu.innerHTML = items;
        const rect = el.getBoundingClientRect();
        menu.style.top = Math.min(rect.bottom + 6, window.innerHeight - 220) + 'px';
        menu.style.left = (m.role === 'mine' ? Math.max(rect.right - 180, 10) : rect.left) + 'px';
        menu.classList.add('show');
        document.getElementById('ctxBackdrop').classList.add('show');
        menu._targetEl = el;
    }
    function closeCtxMenu() {
        const menu = document.getElementById('ctxMenu');
        if (menu._targetEl) menu._targetEl.classList.remove('selected-for-menu');
        menu.classList.remove('show');
        document.getElementById('ctxBackdrop').classList.remove('show');
    }
    function snippetOf(m) {
        if (m.type === 'text') return m.text.slice(0, 60);
        if (m.type === 'image') return '📷 Photo';
        if (m.type === 'video') return '🎬 Video';
        if (m.type === 'voice') return '🎤 Voice note';
        return '';
    }
    function ctxReply(id) {
        const m = findMsg(id); closeCtxMenu();
        replyingTo = { id: m.id, role: m.role, snippet: snippetOf(m) };
        document.getElementById('cbLabel').textContent = `Replying to ${m.role === 'mine' ? 'You' : storeName}`;
        document.getElementById('cbText').textContent = replyingTo.snippet;
        document.getElementById('contextBar').classList.add('show');
        document.getElementById('userInput').focus();
    }
    function ctxCopy(id) {
        const m = findMsg(id); closeCtxMenu();
        navigator.clipboard.writeText(m.type === 'text' ? m.text : snippetOf(m)).then(()=>showToast('Copied'));
    }
    function ctxShare(id) {
        const m = findMsg(id); closeCtxMenu();
        const text = m.type === 'text' ? m.text : snippetOf(m);
        if (navigator.share) navigator.share({ text }).catch(()=>{});
        else navigator.clipboard.writeText(text).then(()=>showToast('Copied'));
    }
    function ctxEdit(id) {
        const m = findMsg(id); closeCtxMenu();
        if (m.type !== 'text') return;
        editingId = id;
        document.getElementById('cbLabel').textContent = 'Editing message';
        document.getElementById('cbText').textContent = m.text;
        document.getElementById('contextBar').classList.add('show');
        const input = document.getElementById('userInput');
        input.value = m.text;
        toggleInputUI(input);
        input.focus();
    }
    function ctxDelete(id) {
        closeCtxMenu();
        if (!confirm('Delete this message?')) return;
        renderedMessages = renderedMessages.filter(m => m.id !== id);
        const row = document.getElementById(`row-${id}`);
        if (row) row.remove();
        deleteMessageInFirestore(id);
    }
    function cancelContextBar() {
        const wasEditing = editingId;
        replyingTo = null; editingId = null;
        document.getElementById('contextBar').classList.remove('show');
        if (wasEditing) { const input = document.getElementById('userInput'); input.value = ''; toggleInputUI(input); }
    }

    // ================= PRODUCT SLIDER =================
    let productCatalog = []; // [{name, img, price}]

    async function loadFirestoreProducts() {
        const track = document.getElementById('product-slider');
        try {
            let snapshot;
            if (vendorId && vendorId !== 'default') {
                snapshot = await db.collection('products').where('vendorId', '==', vendorId).get();
                if (snapshot.empty) snapshot = await db.collection('products').where('vendor', '==', vendorId).get();
                if (snapshot.empty) snapshot = await db.collection('products').where('sellerId', '==', vendorId).get();
            } else {
                snapshot = await db.collection('products').limit(10).get();
            }
            let list = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                const imgUrl = d.image || d.img || d.imageUrl || '';
                const name = d.name || d.title || 'Product';
                if (imgUrl) list.push({ img: imgUrl, name, price: d.price || '?' });
            });
            productCatalog = list;
            if (list.length > 0) {
                track.innerHTML = [...list, ...list].map(p => `
                    <div class="slide-card" onclick="pick('${p.name.replace(/'/g,"\\'")}','${p.img}')">
                        <img src="${p.img}" onerror="this.parentElement.style.display='none'">
                        <div class="tag">${p.name}</div>
                    </div>`).join('');
            }
        } catch(err) { console.error('Firebase error:', err); }
    }

    async function pick(name, img) {
        const caption = `Tell me more about ${name}, and how I can place an order.`;
        const m = { role: 'mine', type: 'image', media: img, caption, time: Date.now() };
        const id = await saveMessageToFirestore(m);
        m.id = id;
        renderedMessages.push(m);
        renderMessage(m, true);
        if (botActive) await triggerAIReply(caption, [{ type: 'image_url', image_url: { url: img } }]);
    }

    // ================= INPUT BAR =================
    function toggleInputUI(el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
        updateActionIcon();
    }
    function openCamera() { document.getElementById('cameraInput').click(); }

    // ---------- full-screen media compose ----------
    function handleMediaSelect(input) {
        const files = Array.from(input.files || []);
        if (!files.length) return;
        pendingMedia = [];
        let remaining = files.length;
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                pendingMedia.push({ type: file.type.startsWith('video') ? 'video' : 'image', dataUrl: e.target.result, mime: file.type, rotation: 0 });
                remaining--;
                if (remaining === 0) openMediaCompose();
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    }
    function openMediaCompose() {
        mcActiveIndex = 0;
        document.getElementById('mcCaption').value = '';
        renderMediaComposeViewport();
        renderMediaComposeThumbs();
        document.getElementById('mediaCompose').classList.add('show');
    }
    function renderMediaComposeViewport() {
        const item = pendingMedia[mcActiveIndex];
        const vp = document.getElementById('mcViewport');
        vp.innerHTML = item.type === 'video'
            ? `<video src="${item.dataUrl}" controls style="transform: rotate(${item.rotation}deg)"></video>`
            : `<img src="${item.dataUrl}" style="transform: rotate(${item.rotation}deg)">`;
    }
    function renderMediaComposeThumbs() {
        const strip = document.getElementById('mcThumbs');
        if (pendingMedia.length < 2) { strip.innerHTML = ''; return; }
        strip.innerHTML = pendingMedia.map((m, i) => `
            <div class="mc-thumb ${i === mcActiveIndex ? 'active' : ''}" onclick="setMcActive(${i})">
                ${m.type === 'video' ? `<video src="${m.dataUrl}"></video>` : `<img src="${m.dataUrl}">`}
            </div>`).join('');
    }
    function setMcActive(i) { mcActiveIndex = i; renderMediaComposeViewport(); renderMediaComposeThumbs(); }
    function rotateActiveMedia() {
        pendingMedia[mcActiveIndex].rotation = (pendingMedia[mcActiveIndex].rotation + 90) % 360;
        renderMediaComposeViewport();
    }
    function cancelMediaCompose() {
        pendingMedia = [];
        document.getElementById('mediaCompose').classList.remove('show');
    }
    function rotateImageDataUrl(dataUrl, degrees) {
        return new Promise((resolve) => {
            if (!degrees) { resolve(dataUrl); return; }
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const swap = degrees % 180 !== 0;
                canvas.width = swap ? img.height : img.width;
                canvas.height = swap ? img.width : img.height;
                const ctx = canvas.getContext('2d');
                ctx.translate(canvas.width/2, canvas.height/2);
                ctx.rotate(degrees * Math.PI / 180);
                ctx.drawImage(img, -img.width/2, -img.height/2);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = dataUrl;
        });
    }
    async function sendMediaCompose() {
        if (!pendingMedia.length) return;
        const caption = document.getElementById('mcCaption').value.trim();
        const items = [...pendingMedia];
        cancelMediaCompose();

        const finalItems = [];
        for (const it of items) {
            let finalUrl = it.dataUrl;
            if (it.type === 'image' && it.rotation) finalUrl = await rotateImageDataUrl(it.dataUrl, it.rotation);
            finalItems.push({ type: it.type, url: finalUrl });
        }
        const imageContentParts = finalItems.filter(i => i.type === 'image').map(i => ({ type: 'image_url', image_url: { url: i.url } }));

        let m;
        if (finalItems.length === 1) {
            m = { role: isAdmin ? 'theirs' : 'mine', type: finalItems[0].type, media: finalItems[0].url, time: Date.now(), caption: caption || null };
        } else {
            m = { role: isAdmin ? 'theirs' : 'mine', type: 'imageGroup', mediaArr: finalItems, time: Date.now(), caption: caption || null };
        }
        const id = await saveMessageToFirestore(m);
        m.id = id;
        renderedMessages.push(m);
        renderMessage(m, true);

        if (isAdmin) {
            // Vendor sent media directly to customer — pause bot, no AI call
            await db.collection('vendorChats').doc(chatDocId).set({ botActive: false }, { merge: true });
            botActive = false;
            updateBotToggleUI();
            return;
        }

        if (!botActive) return; // bot paused, vendor is handling this chat manually

        const videoNote = finalItems.some(i => i.type === 'video') ? "[Customer also sent a video attachment]" : "";
        await triggerAIReply(caption || videoNote || "Please take a look at what I sent.", imageContentParts);
    }

    // ================= VOICE COMPOSE — WhatsApp-style recording/pause/scrub/send =================
    function formatTime(sec) {
        sec = Math.max(0, Math.floor(sec || 0));
        const mm = Math.floor(sec/60), ss = sec%60;
        return `${mm}:${ss.toString().padStart(2,'0')}`;
    }
    function buildWaveBars() {
        document.getElementById('vcWave').innerHTML = Array.from({length: 24}).map(() => `<span></span>`).join('');
    }
    function startWaveVisualizer(stream) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        waveDataArr = new Uint8Array(analyser.frequencyBinCount);
        const bars = document.querySelectorAll('#vcWave span');
        function draw() {
            if (!isRecording || isPaused) return;
            analyser.getByteFrequencyData(waveDataArr);
            bars.forEach((bar, i) => { bar.style.height = Math.max(12, (waveDataArr[i % waveDataArr.length] / 255) * 100) + '%'; });
            waveAnimId = requestAnimationFrame(draw);
        }
        draw();
    }
    function stopWaveVisualizer() {
        if (waveAnimId) cancelAnimationFrame(waveAnimId);
        if (audioCtx) { audioCtx.close().catch(()=>{}); audioCtx = null; }
    }

    function showRecordingRow() {
        document.getElementById('vcTopRowRecording').style.display = 'flex';
        document.getElementById('vcTopRowPreview').style.display = 'none';
        document.getElementById('vcPauseIcon').className = 'fa-solid fa-pause';
        document.getElementById('vcPauseLabel').textContent = 'Pause';
    }
    function showPreviewRow() {
        document.getElementById('vcTopRowRecording').style.display = 'none';
        document.getElementById('vcTopRowPreview').style.display = 'flex';
        document.getElementById('vcPauseIcon').className = 'fa-solid fa-microphone';
        document.getElementById('vcPauseLabel').textContent = 'Resume';
        document.getElementById('vcPreviewTime').textContent = formatTime(recSeconds);
        document.getElementById('vcTrackFill').style.width = '0%';
        document.getElementById('vcTrackDot').style.left = '0%';
        document.getElementById('vcScrubPlayIcon').className = 'fa-solid fa-play vc-scrub-play';
    }

    function updateActionIcon() {
        const input = document.getElementById('userInput');
        const icon = document.getElementById('actionIcon');
        if (isRecording) { icon.className = 'fa-solid fa-paper-plane'; return; }
        icon.className = input.value.trim() !== '' ? 'fa-solid fa-paper-plane' : 'fa-solid fa-microphone';
    }

    async function toggleRecording() {
        if (isRecording) return; // already composing a voice note
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recordedStream = stream;
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                stopWaveVisualizer();
                stream.getTracks().forEach(t => t.stop());
                if (mediaRecorder._cancelled) return;
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                    finalAudioDataUrl = reader.result;
                    if (mediaRecorder._pendingSend) finalizeSendVoice();
                };
                reader.readAsDataURL(blob);
            };
            mediaRecorder.start();
            isRecording = true; isPaused = false; recSeconds = 0;
            previewSpeed = 1;
            document.getElementById('vcSpeedBadge').textContent = '1x';
            buildWaveBars();
            startWaveVisualizer(stream);
            showRecordingRow();
            document.getElementById('voiceCompose').classList.add('show');
            updateActionIcon();
            recTimerHandle = setInterval(() => {
                if (isPaused) return;
                recSeconds++;
                document.getElementById('vcTimer').textContent = formatTime(recSeconds);
            }, 1000);
        } catch(e) { showToast('Microphone access denied'); }
    }

    function togglePauseResume() {
        if (!isRecording) return;
        if (!isPaused) {
            // PAUSE — build a preview from what's recorded so far
            isPaused = true;
            mediaRecorder.pause();
            stopWaveVisualizer();
            try { mediaRecorder.requestData(); } catch(e) {}
            setTimeout(() => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const previewAudio = document.getElementById('vcPreviewAudio');
                previewAudio.src = url;
                previewAudio.playbackRate = previewSpeed;
                showPreviewRow();
            }, 120);
        } else {
            // RESUME recording
            isPaused = false;
            const previewAudio = document.getElementById('vcPreviewAudio');
            previewAudio.pause();
            mediaRecorder.resume();
            startWaveVisualizer(recordedStream);
            showRecordingRow();
        }
    }

    function togglePreviewPlayback() {
        const previewAudio = document.getElementById('vcPreviewAudio');
        const icon = document.getElementById('vcScrubPlayIcon');
        if (previewAudio.paused) {
            previewAudio.play();
            icon.className = 'fa-solid fa-pause vc-scrub-play';
        } else {
            previewAudio.pause();
            icon.className = 'fa-solid fa-play vc-scrub-play';
        }
    }
    function bindPreviewAudioListeners() {
        const previewAudio = document.getElementById('vcPreviewAudio');
        if (!previewAudio) return;
        previewAudio.addEventListener('timeupdate', () => {
            if (!previewAudio.duration || isScrubbingCompose) return;
            const pct = (previewAudio.currentTime / previewAudio.duration) * 100;
            document.getElementById('vcTrackFill').style.width = pct + '%';
            document.getElementById('vcTrackDot').style.left = pct + '%';
            document.getElementById('vcPreviewTime').textContent = formatTime(previewAudio.currentTime);
        });
        previewAudio.addEventListener('ended', () => {
            document.getElementById('vcScrubPlayIcon').className = 'fa-solid fa-play vc-scrub-play';
            document.getElementById('vcPreviewTime').textContent = formatTime(recSeconds);
        });
    }
    function scrubComposeToClientX(clientX) {
        const track = document.getElementById('vcTrack');
        const rect = track.getBoundingClientRect();
        let pct = (clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        const previewAudio = document.getElementById('vcPreviewAudio');
        if (previewAudio.duration) previewAudio.currentTime = pct * previewAudio.duration;
        document.getElementById('vcTrackFill').style.width = (pct*100) + '%';
        document.getElementById('vcTrackDot').style.left = (pct*100) + '%';
    }
    function startScrub(e) {
        if (!isPaused) return;
        isScrubbingCompose = true;
        scrubComposeToClientX(e.clientX);
        const move = (ev) => scrubComposeToClientX(ev.clientX);
        const up = () => {
            isScrubbingCompose = false;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }
    function cycleSpeed() {
        const speeds = [1, 1.5, 2];
        const idx = speeds.indexOf(previewSpeed);
        previewSpeed = speeds[(idx + 1) % speeds.length];
        document.getElementById('vcSpeedBadge').textContent = previewSpeed + 'x';
        document.getElementById('vcPreviewAudio').playbackRate = previewSpeed;
    }

    function cancelRecording() {
        if (!isRecording) return;
        isRecording = false; isPaused = false; clearInterval(recTimerHandle);
        stopWaveVisualizer();
        const previewAudio = document.getElementById('vcPreviewAudio');
        previewAudio.pause(); previewAudio.src = '';
        mediaRecorder._cancelled = true;
        try { mediaRecorder.stop(); } catch(e) {}
        document.getElementById('voiceCompose').classList.remove('show');
        updateActionIcon();
    }

    function sendVoiceCompose() {
        if (!isRecording) return;
        document.getElementById('voiceCompose').classList.remove('show');
        const wasPaused = isPaused;
        isRecording = false; isPaused = false; clearInterval(recTimerHandle);
        stopWaveVisualizer();
        const previewAudio = document.getElementById('vcPreviewAudio');
        previewAudio.pause(); previewAudio.src = '';
        mediaRecorder._pendingSend = true;
        if (wasPaused) {
            // recorder is already paused/stopped state-wise — just stop to flush final blob
            try { mediaRecorder.stop(); } catch(e) { finalizeSendVoice(); }
        } else {
            try { mediaRecorder.stop(); } catch(e) { finalizeSendVoice(); }
        }
        updateActionIcon();
    }

    async function finalizeSendVoice() {
        if (!finalAudioDataUrl) return;
        const dataUrl = finalAudioDataUrl;
        finalAudioDataUrl = null;
        const m = { role: isAdmin ? 'theirs' : 'mine', type: 'voice', media: dataUrl, time: Date.now() };
        const id = await saveMessageToFirestore(m);
        m.id = id;
        renderedMessages.push(m);
        renderMessage(m, true);

        if (isAdmin) {
            await db.collection('vendorChats').doc(chatDocId).set({ botActive: false }, { merge: true });
            botActive = false;
            updateBotToggleUI();
            return;
        }
        if (!botActive) return;
        await triggerAIReply("I just sent a voice note. Since you can't listen to audio yet, kindly ask me to type out what I need.", []);
    }

    function handleAction() {
        if (isRecording) { sendVoiceCompose(); return; }
        const icon = document.getElementById('actionIcon');
        if (icon.classList.contains('fa-paper-plane')) sendMessage(); else toggleRecording();
    }

    // ================= CUSTOM PLAYER FOR SENT VOICE BUBBLES (no native menu, WhatsApp-style) =================
    function wireBubbleAudio(id) {
        const audio = document.getElementById(`vn-audio-${id}`);
        if (!audio || audio.dataset.wired) return;
        audio.dataset.wired = '1';
        audio.addEventListener('loadedmetadata', () => {
            const timeEl = document.getElementById(`vn-time-${id}`);
            if (timeEl && audio.duration && isFinite(audio.duration)) timeEl.textContent = formatTime(audio.duration);
        });
        audio.addEventListener('timeupdate', () => {
            if (!audio.duration || !isFinite(audio.duration)) return;
            const pct = (audio.currentTime / audio.duration) * 100;
            const fill = document.getElementById(`vn-fill-${id}`);
            const dot = document.getElementById(`vn-dot-${id}`);
            const timeEl = document.getElementById(`vn-time-${id}`);
            if (fill) fill.style.width = pct + '%';
            if (dot) dot.style.left = pct + '%';
            if (timeEl) timeEl.textContent = formatTime(audio.currentTime);
        });
        audio.addEventListener('ended', () => {
            const icon = document.getElementById(`vn-icon-${id}`);
            if (icon) icon.className = 'fa-solid fa-play';
            const timeEl = document.getElementById(`vn-time-${id}`);
            if (timeEl && audio.duration) timeEl.textContent = formatTime(audio.duration);
            if (currentlyPlayingBubbleId === id) currentlyPlayingBubbleId = null;
        });
    }
    function toggleBubbleAudio(id) {
        const audio = document.getElementById(`vn-audio-${id}`);
        if (!audio) return;
        // pause whichever bubble is currently playing (WhatsApp-style single playback)
        if (currentlyPlayingBubbleId && currentlyPlayingBubbleId !== id) {
            const prevAudio = document.getElementById(`vn-audio-${currentlyPlayingBubbleId}`);
            const prevIcon = document.getElementById(`vn-icon-${currentlyPlayingBubbleId}`);
            if (prevAudio) prevAudio.pause();
            if (prevIcon) prevIcon.className = 'fa-solid fa-play';
        }
        const icon = document.getElementById(`vn-icon-${id}`);
        if (audio.paused) {
            audio.play();
            if (icon) icon.className = 'fa-solid fa-pause';
            currentlyPlayingBubbleId = id;
        } else {
            audio.pause();
            if (icon) icon.className = 'fa-solid fa-play';
            currentlyPlayingBubbleId = null;
        }
    }
    function startBubbleScrub(e, id) {
        const audio = document.getElementById(`vn-audio-${id}`);
        if (!audio || !audio.duration || !isFinite(audio.duration)) return;
        const track = e.currentTarget;
        const scrubTo = (clientX) => {
            const rect = track.getBoundingClientRect();
            let pct = (clientX - rect.left) / rect.width;
            pct = Math.max(0, Math.min(1, pct));
            audio.currentTime = pct * audio.duration;
        };
        scrubTo(e.clientX);
        const move = (ev) => scrubTo(ev.clientX);
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }

    // ================= SEND TEXT / AI REPLY =================
    async function sendMessage() {
        if (isSending) return;
        const input = document.getElementById('userInput');
        const text = input.value.trim();
        if (!text) return;

        if (editingId) {
            const idx = renderedMessages.findIndex(x => x.id === editingId);
            const m = idx !== -1 ? renderedMessages[idx] : findMsg(editingId);
            if (m) {
                // If a bot reply immediately followed this message, it answered the OLD text —
                // remove it so the bot can respond fresh to the edited version instead.
                const nextMsg = idx !== -1 ? renderedMessages[idx + 1] : null;
                const staleReply = (nextMsg && nextMsg.role === 'theirs' && nextMsg.type === 'text') ? nextMsg : null;
                if (staleReply) {
                    const staleRow = document.getElementById(`row-${staleReply.id}`);
                    if (staleRow) staleRow.remove();
                    deleteMessageInFirestore(staleReply.id);
                }

                m.text = text; m.edited = true;
                const row = document.getElementById(`row-${editingId}`);
                if (row) row.remove();
                renderedMessages = renderedMessages.filter(x => x.id !== editingId && (!staleReply || x.id !== staleReply.id));
                renderedMessages.push(m);
                renderMessage(m, false);
                updateMessageInFirestore(editingId, { text, edited: true });
                rebuildChatHistory();
            }
            editingId = null;
            cancelContextBar();
            input.value = ''; toggleInputUI(input);

            if (botActive) await triggerAIReply(text, []);
            return;
        }

        const replyPayload = replyingTo;
        cancelContextBar();
        input.value = ''; toggleInputUI(input);

        // ---- VENDOR (admin) SENDING DIRECTLY TO CUSTOMER ----
        if (isAdmin) {
            const m = { role: 'theirs', type: 'text', text, time: Date.now(), replyTo: replyPayload };
            const id = await saveMessageToFirestore(m);
            m.id = id;
            renderedMessages.push(m);
            renderMessage(m, true);
            chatHistory.push({ role: 'assistant', content: text });

            // Pause the bot immediately — vendor is now handling this chat
            await db.collection('vendorChats').doc(chatDocId).set({ botActive: false }, { merge: true });
            botActive = false;
            updateBotToggleUI();

            // Save this as a learning example so the bot improves for next time
            const lastCustomerMsg = [...renderedMessages].reverse().find(x => x.role === 'mine' && x.type === 'text' && x.id !== m.id);
            if (lastCustomerMsg) {
                db.collection('vendors').doc(vendorId).collection('learningExamples').add({
                    customerMsg: lastCustomerMsg.text,
                    vendorReply: text,
                    time: Date.now()
                }).catch(()=>{});
            }
            return;
        }

        // ---- CUSTOMER SENDING TO VENDOR/BOT ----
        const m = { role: 'mine', type: 'text', text, time: Date.now(), replyTo: replyPayload };
        const id = await saveMessageToFirestore(m);
        m.id = id;
        renderedMessages.push(m);
        renderMessage(m, true);

        if (!botActive) return; // vendor has taken over this chat manually — bot stays silent

        await triggerAIReply(text, []);
    }

    async function triggerAIReply(text, extraImageParts) {
        isSending = true;
        showTyping();

        let productList = "No products listed yet.";
        try {
            const snap = await db.collection('products').limit(30).get();
            let items = [];
            snap.forEach(doc => {
                const d = doc.data();
               const cleanPrice = String(d.price || '?').replace(/₦/g, '').trim();
                items.push(`- ${d.name || d.title || 'Item'}: ₦${cleanPrice} | ${d.description || d.desc || ''}`); 
            });
            if (items.length > 0) productList = items.join('\n');
        } catch(e) {}

        // ---- VENDOR-SPECIFIC BUSINESS PROFILE ----
        let vendorInfo = "";
        let businessType = "shago na gama-gari";
        try {
            const vDoc = await db.collection('vendors').doc(vendorId).get();
            if (vDoc.exists) {
                const v = vDoc.data();
                businessType = v.businessType || businessType;
                vendorInfo = `
IRIN KASUWANCIN: ${businessType}
SA'O'IN AIKI: ${v.businessHours || 'Ba a saita ba'}
MANUFOFIN DAWO DA KAYA/SERVICE: ${v.returnPolicy || 'Babu dawowa sai an tabbatar da lahani'}
WURI: ${v.location || 'Ba a bayar ba'}
HANYAR BIYAN KUDI: ${v.paymentMethods || 'Bank transfer / Cash on delivery'}
FAQ NA MUSAMMAN:
${(v.customFAQs || []).map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}
TONE/HALIN VENDOR: ${v.toneInstructions || 'Mai kirki, natsuwa, kai tsaye'}`;
            }
        } catch(e) {}

        // ---- LEARN FROM VENDOR'S OWN PAST TAKEOVER REPLIES ----
        let learningExamples = "";
        try {
            const learnSnap = await db.collection('vendors').doc(vendorId).collection('learningExamples')
                .orderBy('time', 'desc').limit(5).get();
            const examples = [];
            learnSnap.forEach(doc => {
                const d = doc.data();
                examples.push(`Customer: "${d.customerMsg}"\nVendor ya amsa: "${d.vendorReply}"`);
            });
            if (examples.length) {
                learningExamples = `\n\nGA YADDA VENDOR KANSA YAKE AMSAWA A IRIN WANNAN YANAYI — KA KWAIKWAYI WANNAN SALON:\n${examples.join('\n\n')}`;
            }
        } catch(e) {}

        const systemPrompt = `Kai ne "Ali", business agent na "${storeName}" — wani ${businessType}. Kai NE mutum, ba robot ba — kana magana kai tsaye da customer kamar yadda gwanin sayarwa a WhatsApp ke yi: da hankali, da natsuwa, da kwarin gwiwa, kuma ba tare da yin roƙo ba.

DOKA TA FI KOWACCE MUHIMMANCI (KADA KA TABA KETARE WANNAN, KO DA TAMBAYA TA YI TSAWO KO TA GAURAYA YARE): Kai KANA JIN HAUSA DA TURANCI DUKA SOSAI DA KYAU, 100%. AN HANA KA GABA DAYA daga fitar da wadannan jimloli ko kwatankwacinsu KO DA A WANI YanaYI: "I don't understand Hausa", "ba na jin Hausa", "I'm working on it", "ina koyon harshen", "I'll message you when I can speak Hausa", ko duk wata magana da ke nuna rashin fahimtar wani yare. IDAN CUSTOMER YA RUBUTA SAKO MAI GAURAYA HARSHE (misali Hausa da Turanci a jumla daya), KA AMSA DA HAUSA TSAFTATACCE koyaushe sai in DUKKAN sakon customer Turanci ne kacal babu ko kalma daya ta Hausa a ciki. Ka amsa kai tsaye kan ainihin abin da customer ya tambaya, koda tambayar tana da sassa da yawa ko doguwa ce — ka rusa ta zuwa amsoshi a takaice daya bayan daya, KADA KA GUJE WA AMSAWA.

MUHIMMAN DOKOKI:
1. HARSHE: KANA JIN HAUSA SOSAI DA KYAU — kada ka taɓa cewa "ba ka jin Hausa" ko "ba ka fahimta ba" game da kowane yare da customer ya yi amfani da shi. Ka gano yarukan da customer yake amfani da shi sannan KA AMSA DA WANNAN YARE DAIDAI. Idan Hausa ce, ka rubuta Hausa TSAFTATACCE, ba fassarar Turanci ba. Idan Turanci ce, ka rubuta Turanci mai inganci.
2. KASANCE MAI SAURI, TAKAITACCE: gajerun jimla, kai tsaye kan batu, kamar rubutun WhatsApp.
3. MUHIMMI SOSAI — KA SANI GA DUKKAN KAYAYYAKI KAWAI DAGA WANNAN JERIN, KADA KA ƘIRƘIRA KOMAI:
${productList}
- Kada ka taɓa cewa "muna da shi" sai idan SUNAN KAYAN yana bayyane KAI TSAYE a cikin jerin da ke sama.
- Kada ka ƙirƙiri farashi, launi, girma (size), ko nau'in kaya (misali "cotton", "lace", "shadda") da BABU SHI a rubuce a jerin — ko da customer ya ambaci wannan kalmar a tambayarsa.
- Idan customer ya tambayi wani abu da BAI BAYYANA A SARARI ba a jerin (misali wani launi ko nau'i na musamman), ka amsa da gaskiya: "Ba mu da wannan a yanzu, amma ga abin da muke da shi: [jera abin da AKWAI a jerin]" — KADA KA CE EE MUNA DA SHI face in yana can a zahiri.
4. IDAN AN AIKA HOTO: ka duba hoton da kyau, ka bayyana abinda kake gani, ka danganta shi da kayayyakinka idan akwai kama a jerin.
5. IDAN CUSTOMER YA TAMBAYI GANIN HOTON KAYA (misali "ina son ganin panties dinku", "what do you have", "hotuna"), KADA KA TURA HOTO NAN TAKE — ka amsa da bayanin kayan a rubuce sannan ka TAMBAYE SHI a fili: "Kana son na tura maka hotuna?"
6. KAR KA TABA TURA HOTO SAI CUSTOMER YA TABBATAR A SARARI (misali ya ce "ee", "eh", "go ahead", "tura", "yes") BAYAN KA TAMBAYE SHI. Idan bai bada izini ba tukuna, KAR KA SAKA [TURA_HOTO] KWATA-KWATA.
7. IDAN CUSTOMER YA TABBATAR (bayan ka tambaya, ya ce ee/go ahead/tura), a KARSHEN sakonka, ka RUBUTA layi na daban KAI TSAYE haka: [TURA_HOTO: Sunan Kaya Daidai Kamar Yadda Yake A Jerin]. Kar ka rubuta wani abu bayan wannan tag din.
8. KASANCE MAI RUFE SAYARWA: bayan bayanin kaya, KA TAMBAYE customer kai tsaye idan yana son ya yi oda.
9. DON KAMMALA ODA: ka tambaya (1) cikakken suna, (2) lambar waya, (3) adireshi, (4) yawan kaya — TAMBAYA DAYA A LOKACI.
10. Ka kasance mai kirki, mai godiya, kuma mai kwarin gwiwa. Kada ka taba fadin karya game da samuwar kaya.
11. IDAN CUSTOMER: (a) ya nemi magana da mutum a fili, (b) yana korafi/fushi, (c) yana neman rangwamen farashi fiye da abin da ka iya bayarwa, (d) tambayarsa ta wuce iyakar abin da ka sani — KADA KA CI GABA DA AMSAWA. A maimakon haka, ka rubuta KAWAI: "Zan tuntubi shugaban shago don taimaka maka nan take." sannan a KARSHEN sakonka ka rubuta layi na daban: [ESCALATE]

MUHIMMI: Kai KAWAI wakilin "${storeName}" ne, wani ${businessType}. Kada ka taɓa yin magana kamar wani nau'in kasuwanci daban — misali idan wannan shago ne na turare, kar ka yi magana kamar kana sayar da na'urorin gida; idan wannan chef ne, kar ka yi magana kamar kana sayar da kaya, sai dai ka karɓi oda na abinci; idan wannan mechanic ne, kai tsaye ka mayar da hankali kan yin booking/tantance matsalar mota, ba tallace-tallacen kaya ba.
${vendorInfo}${learningExamples}`;

        let userContent = [];
        if (extraImageParts && extraImageParts.length) userContent.push(...extraImageParts);
        if (text) userContent.push({ type: 'text', text });
        chatHistory.push({ role: 'user', content: userContent.length === 1 && userContent[0].type === 'text' ? text : userContent });

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);
            const res = await fetch('https://oryzon-backend-ed1q.onrender.com/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    systemPrompt,
                    messages: chatHistory
                })
            });

            clearTimeout(timeoutId);
            const data = await res.json();
            let reply = data.choices?.[0]?.message?.content;
            if (!reply) {
                console.error('API Error:', data.error?.message || JSON.stringify(data).slice(0,200));
                reply = "Sorry, I'm having a small hiccup on my end. Please try again in a moment, or send your message once more.";
                    }
            // ---- fitar da [TURA_HOTO: ...] tag din kafin nuna wa customer ----
            let imageRequest = null;
            const tagMatch = reply.match(/\[TURA_HOTO:\s*(.+?)\]/i);
            if (tagMatch) {
                imageRequest = tagMatch[1].trim();
                reply = reply.replace(/\[TURA_HOTO:.+?\]/i, '').trim();
            }

            // ---- fitar da [ESCALATE] tag din ----
            const escalateMatch = reply.match(/\[ESCALATE\]/i);
            if (escalateMatch) {
                reply = reply.replace(/\[ESCALATE\]/i, '').trim();
            }

            chatHistory.push({ role: 'assistant', content: reply });

            hideTyping();
            const bm = { role: 'theirs', type: 'text', text: reply, time: Date.now() };
            const id = await saveMessageToFirestore(bm);
            bm.id = id;
            renderedMessages.push(bm);
            renderMessage(bm, true);

            if (imageRequest) {
                const sent = await sendSpecificProductImage(imageRequest);
                if (!sent) {
                    const fallbackMsg = { role: 'theirs', type: 'text', text: "Sorry, I couldn't pull up that photo right now — let me know if you'd like to see something else from what we have in stock.", time: Date.now() };
                    const fid = await saveMessageToFirestore(fallbackMsg);
                    fallbackMsg.id = fid;
                    renderedMessages.push(fallbackMsg);
                    renderMessage(fallbackMsg, true);
                }
            }

            if (escalateMatch) {
                await db.collection('vendorChats').doc(chatDocId).set({ botActive: false }, { merge: true });
                botActive = false;
                updateBotToggleUI();
                fetch('https://oryzon-backend-ed1q.onrender.com/send-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: vendorId,
                        title: '⚠️ Customer yana bukatar ka',
                        body: text.slice(0, 80),
                        data: { url: window.location.href }
                    })
                }).catch(()=>{});
            }
        } catch(e) {
            hideTyping();
            console.error('AI request failed:', e.name, e.message);
            const errMsg = "Sorry, I'm having a small hiccup on my end. Please try again in a moment, or send your message once more.";
            const bm = { role: 'theirs', type: 'text', text: errMsg, time: Date.now() };
            renderedMessages.push(bm);
            renderMessage(bm, true);
    }
        isSending = false;
    }

    async function sendSpecificProductImage(productName) {
        if (!productCatalog.length) {
            console.warn('sendSpecificProductImage: product catalog is empty, requested:', productName);
            return false;
        }
        const match = productCatalog.find(p => p.name.toLowerCase().includes(productName.toLowerCase()))
            || productCatalog.find(p => productName.toLowerCase().includes(p.name.toLowerCase()));
        if (!match) {
            console.warn('sendSpecificProductImage: no matching product found for:', productName, '— available:', productCatalog.map(p => p.name));
            return false;
        }
        const m = { role: 'theirs', type: 'image', media: match.img, caption: `${match.name} — ₦${match.price}`, time: Date.now() };
        const id = await saveMessageToFirestore(m);
        m.id = id;
        renderedMessages.push(m);
        renderMessage(m, true);
        return true;
            }

    // ================= INIT =================
    async function bootVendorChat(vendorIdOverride) {
        vcResolveSessionState(vendorIdOverride);
        if (!myUsername) {
            NexusRouter.navigateTo(`login.html?next=${encodeURIComponent(window.location.href)}`);
            return;
        }
        bindAvatarUploadListener();
        bindPreviewAudioListeners();
        startVendorStatusPolling();
        await vc_authReady;
        loadFirestoreProducts();
        makeDraggable(document.getElementById('floatingAvatar'));
        restoreAvatarPosition();
        await loadVendorAvatarAndStatus();
        beginSession();
    }

    function destroyVendorChat() {
        if (vcStatusIntervalId) { clearInterval(vcStatusIntervalId); vcStatusIntervalId = null; }
        if (recTimerHandle) { clearInterval(recTimerHandle); recTimerHandle = null; }
        if (waveAnimId) { cancelAnimationFrame(waveAnimId); waveAnimId = null; }
        if (recordedStream) { try { recordedStream.getTracks().forEach(t => t.stop()); } catch(e) {} recordedStream = null; }
        if (vc_authUnsub) { try { vc_authUnsub(); } catch(e) {} vc_authUnsub = null; }
    }

/* ---------- Shared overlay scroll-lock helper (products-page,
   store-front, vendor-chat can nest inside one another) ---------- */
function anyNexusOverlayActive() {
    return ['products-page-overlay', 'store-front-overlay', 'vendor-chat-overlay'].some(id => {
        const el = document.getElementById(id);
        return el && el.classList.contains('active');
    });
}

/* ---------- Products page overlay: open/close ---------- */
function openProductsPageOverlay(productId) {
    const overlay = document.getElementById('products-page-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    overlay.scrollTop = 0;
    bootProductsPage(productId);
}

function closeProductsPageOverlay() {
    const overlay = document.getElementById('products-page-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    destroyProductsPage();
    if (!anyNexusOverlayActive()) {
        document.body.style.overflow = '';
    }
}
window.openProductsPageOverlay = openProductsPageOverlay;
window.closeProductsPageOverlay = closeProductsPageOverlay;

/* ---------- Store front overlay: open/close ---------- */
function openStoreFrontOverlay(vendorUsername) {
    const overlay = document.getElementById('store-front-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    overlay.scrollTop = 0;
    bootStoreFront(vendorUsername);
}

function closeStoreFrontOverlay() {
    const overlay = document.getElementById('store-front-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    destroyStoreFront();
    if (!anyNexusOverlayActive()) {
        document.body.style.overflow = '';
    }
}
window.openStoreFrontOverlay = openStoreFrontOverlay;
window.closeStoreFrontOverlay = closeStoreFrontOverlay;

/* ---------- Vendor chat overlay: open/close ---------- */
function openVendorChatOverlay(vendorId) {
    const overlay = document.getElementById('vendor-chat-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    bootVendorChat(vendorId);
}

function closeVendorChatOverlay() {
    const overlay = document.getElementById('vendor-chat-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    destroyVendorChat();
    if (!anyNexusOverlayActive()) {
        document.body.style.overflow = '';
    }
}
window.openVendorChatOverlay = openVendorChatOverlay;
window.closeVendorChatOverlay = closeVendorChatOverlay;

window.ctxCopy = ctxCopy;
window.ctxDelete = ctxDelete;
window.ctxEdit = ctxEdit;
window.ctxReply = ctxReply;
window.ctxShare = ctxShare;
window.expandVisualProof = expandVisualProof;
window.mbDeleteCategoryAction = mbDeleteCategoryAction;
window.mbDeleteGalleryPhoto = mbDeleteGalleryPhoto;
window.mbFilterCategory = mbFilterCategory;
window.mbOpenEditItem = mbOpenEditItem;
window.mbOpenUpgradeModal = mbOpenUpgradeModal;
window.mbRenameCategoryAction = mbRenameCategoryAction;
window.mbSelectPlan = mbSelectPlan;
window.mbSelectThemeColor = mbSelectThemeColor;
window.mbToggleFaq = mbToggleFaq;
window.mbUpdateOrderStatus = mbUpdateOrderStatus;
window.openHeroFS = openHeroFS;
window.openVisualProofFS = openVisualProofFS;
window.pick = pick;
window.setMcActive = setMcActive;
window.toggleBubbleAudio = toggleBubbleAudio;
window.bootShopMarketplace = bootShopMarketplace;
/* ---------- SPA registration ---------- */
if (window.NexusRouter) {
    NexusRouter.registerPage('shop.html', {
        init: function () {
            bootShopMarketplace();
        },
        destroy: function () {
            destroyShopMarketplace();
        }
    });
}

/* Boot once for this script's own load. On a normal (non-SPA) full page
   load, shop.html's own <script src="shop.js"> tag runs before the page
   is "complete" and router.navigateTo() is never called for that first
   load, so nothing else would trigger init() — boot directly. On a SPA
   navigation into shop.html, this script is injected by the router after
   the page has already finished loading (readyState is "complete"), and
   router.js calls registerPage's init() itself right after — so skip the
   direct boot here to avoid running it twice. */
if (document.readyState !== 'complete') {
    bootShopMarketplace();
}

})();
