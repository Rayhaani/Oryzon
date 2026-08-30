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
    const currentProductId = new URLSearchParams(window.location.search).get('id') || 'default';
localStorage.setItem('vc_sent', currentProductId);

    // Je vendor-chat.html
    setTimeout(() => {
        NexusRouter.navigateTo('vendor-chat.html');
    }, 400);
}

// Duba state da page ta buɗe — idan an riga an aika
(function checkVendorState() {
    const currentProductId = new URLSearchParams(window.location.search).get('id') || 'default';
if (localStorage.getItem('vc_sent') === currentProductId) {
        const before = document.getElementById('cv-before');
        const after  = document.getElementById('cv-after');
        if (before) before.style.display = 'none';
        if (after)  after.style.display  = 'block';
    }
})();


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

const firebaseConfig = {
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
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js");
    const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
    _pp_app = initializeApp(firebaseConfig);
    _pp_db = getFirestore(_pp_app);
    _pp_doc = doc;
    _pp_getDoc = getDoc;
}

function goBackToStore() {
    if (document.referrer && document.referrer.includes('store-front.html')) {
        history.back();
    } else if (window.currentVendorId) {
        NexusRouter.navigateTo(`store-front.html?vendor=${encodeURIComponent(window.currentVendorId)}`);
    } else {
        history.back();
    }
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
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
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
                    visitShopLink.href = `store-front.html?vendor=${encodeURIComponent(window.currentVendorId)}`;
                    visitShopLink.setAttribute('data-spa-link', visitShopLink.href);
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
    // 1. Hotuna duka su canza lokaci guda
    document.getElementById('dynamic-img').src = img;
    
    document.querySelectorAll('.holo-img').forEach(el => el.src = img);
    document.querySelectorAll('#vp-grid .stack-img').forEach(el => el.src = img);

    // 1b. Extra gallery images (fiye da guda 3) — "See all" kawai ya bayyana idan akwai su
    const extraGrid = document.getElementById('vp-extra-grid');
    const seeAllWrap = document.getElementById('vp-seeall-wrap');
    if (extraGrid && seeAllWrap) {
        if (extraImages.length > 0) {
            extraGrid.innerHTML = extraImages.map((url, i) =>
                `<img src="${url}" class="stack-img vp-stack-img" onclick="openVisualProofFS(${3 + i})">`
            ).join('');
            extraGrid.style.display = 'none';
            seeAllWrap.style.display = 'block';
        } else {
            extraGrid.innerHTML = '';
            extraGrid.style.display = 'none';
            seeAllWrap.style.display = 'none';
        }
    }

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

/* ---------- SPA registration ---------- */
function bootProductsPage() {
    checkVendorState();
    loadProduct();
}

function destroyProductsPage() {
    clearInterval(popTimer);
}

if (window.NexusRouter) {
    NexusRouter.registerPage('products-page.html', {
        init: bootProductsPage,
        destroy: destroyProductsPage
    });
}

/* Boot once for this script's own load — see the matching comment in
   shop.js for why the readyState check is needed. */
if (document.readyState !== 'complete') {
    bootProductsPage();
}
