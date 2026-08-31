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

async function bootStoreFront() {
    storeFrontUnsubscribes.forEach(fn => { try { fn(); } catch (e) {} });
    storeFrontUnsubscribes = [];
    try {

        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js");
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

        // initializeApp() throws "app/duplicate-app" if called more than once
        // for the same default app — which happens every time someone
        // navigates back to store-front.html in the same SPA session.
        // Cache it once at module scope and reuse it on every re-run.
        if (!_sfFbApp) {
            _sfFbApp = initializeApp(firebaseConfig);
            _sfDb = getFirestore(_sfFbApp);
        }
        const db = _sfDb;

        // 1. Karanto vendor username daga URL (misali: store-front.html?vendor=wolay_underwear)
        const urlParams = new URLSearchParams(window.location.search);
        const vendorUsername = urlParams.get('vendor');

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
            NexusRouter.navigateTo(`products-page.html?id=${encodeURIComponent(productId)}`);
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
            document.body.style.overflow = 'hidden';
            loadReviews();
        };

        window.closeReviewsOverlay = function () {
            document.getElementById('reviews-overlay').style.display = 'none';
            document.body.style.overflow = '';
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
            NexusRouter.navigateTo('vendor-chat.html?vendorId=' + encodeURIComponent(vendorUsername || ''));
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

            NexusRouter.navigateTo('vendor-chat.html?vendorId=' + encodeURIComponent(vendorUsername || ''));
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
        console.error('bootStoreFront failed:', err);
    }
}

function destroyStoreFront() {
    storeFrontUnsubscribes.forEach(fn => { try { fn(); } catch (e) {} });
    storeFrontUnsubscribes = [];
}

/* ---------- SPA registration ---------- */
if (window.NexusRouter) {
    NexusRouter.registerPage('store-front.html', {
        init: bootStoreFront,
        destroy: destroyStoreFront
    });
}

/* Boot once for this script's own load — see the matching comment in
   shop.js for why the readyState check is needed. */
if (document.readyState !== 'complete') {
    bootStoreFront();
}
