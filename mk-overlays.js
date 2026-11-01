/* mk-overlays.js — marketplace Sell + Categories overlays (no page reloads). Loaded after shop.js. */
(function () {
  'use strict';
  var CFG = { apiKey:"AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc", authDomain:"oryzon-50ea4.firebaseapp.com", projectId:"oryzon-50ea4", storageBucket:"oryzon-50ea4.firebasestorage.app", messagingSenderId:"782106742622", appId:"1:782106742622:web:902d512bfe42dd4cf289cf" };
  var MARKETS = [
    { id:'fashion', label:'Fashion', cats:['Women','Men','Kids','Shoes','Bags','Accessories','Beauty'] },
    { id:'fabrics', label:'Fabrics', cats:['Lace','Ankara','Atiku','Brocade','Cotton','Silk','Other fabrics'] },
    { id:'birds', label:'Birds & Pets', cats:['Birds','Dogs','Cats','Fish','Pet food','Pet accessories'] },
    { id:'electronics', label:'Electronics', cats:['Phones','Laptops','TVs','Audio','Gaming','Appliances','Accessories'] },
    { id:'vehicles', label:'Vehicles', cats:['Cars','Motorcycles','Trucks','Tricycles','Spare parts'] },
    { id:'home', label:'Home & Living', cats:['Furniture','Kitchen','Decor','Bedding','Lighting','Tools'] },
    { id:'poultry', label:'Poultry Market', cats:['Chickens','Eggs','Feed','Equipment','Turkeys','Ducks'] },
    { id:'fairly-used', label:'Fairly Used', cats:['Phones','Laptops','Vehicles','Furniture','Clothing','Other'] }
  ];
  window.MK_MARKETS = MARKETS;
  var me = function () { return localStorage.getItem('nexus_user_session') || ''; };
  var fs = null;
  function getFs() {
    if (fs) return fs;
    fs = Promise.all([import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js"), import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js")]).then(function (m) {
      var app = m[0].getApps().length ? m[0].getApp() : m[0].initializeApp(CFG);
      return { m: m[1], db: m[1].getFirestore(app) };
    });
    return fs;
  }
  window.mkGetFs = getFs;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }
  function toast(t) { var d = document.createElement('div'); d.className = 'mk-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
  function mkOverlay(id, title) {
    var o = document.getElementById(id); if (o) return o;
    o = document.createElement('div'); o.id = id; o.className = 'mk-ov';
    o.innerHTML = '<div class="mk-ov-head"><button class="mk-ov-x" aria-label="Back"><i class="fa-solid fa-chevron-left"></i></button><div class="mk-ov-t">' + title + '</div><div class="mk-ov-r"></div></div><div class="mk-ov-body"></div>';
    document.body.appendChild(o);
    o.querySelector('.mk-ov-x').onclick = function () { closeOv(id); };
    return o;
  }
  function openOv(id) { var o = document.getElementById(id); o.classList.add('on'); document.body.style.overflow = 'hidden'; }
  function closeOv(id) { var o = document.getElementById(id); if (o) o.classList.remove('on'); if (!document.querySelector('.mk-ov.on')) document.body.style.overflow = ''; }
  window.mkCloseOv = closeOv; window.mkMkOverlay = mkOverlay; window.mkOpenOv = openOv; window.mkEsc = esc; window.mkToast = toast;

  /* ---------------- SELL ---------------- */
  var sellState = { photos: [], market: 'fashion', lat: null, lng: null };
  function resize(file) {
    return new Promise(function (res) {
      var r = new FileReader();
      r.onload = function (e) {
        var im = new Image();
        im.onload = function () {
          var s = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', .72));
        };
        im.src = e.target.result;
      };
      r.readAsDataURL(file);
    });
  }
  function paintPhotos(o) {
    var box = o.querySelector('#mk-sl-ph');
    box.innerHTML = sellState.photos.map(function (p, i) { return '<div class="mk-ph"><img src="' + p + '"><button data-i="' + i + '">×</button></div>'; }).join('') +
      (sellState.photos.length < 5 ? '<label class="mk-ph add"><i class="fa-solid fa-camera"></i><span>Add photo</span><input type="file" accept="image/*" multiple hidden></label>' : '');
    box.querySelectorAll('button').forEach(function (b) { b.onclick = function () { sellState.photos.splice(+b.dataset.i, 1); paintPhotos(o); }; });
    var inp = box.querySelector('input');
    if (inp) inp.onchange = async function () {
      for (var i = 0; i < inp.files.length && sellState.photos.length < 5; i++) sellState.photos.push(await resize(inp.files[i]));
      paintPhotos(o);
    };
  }
  function paintCats(o) {
    var m = MARKETS.filter(function (x) { return x.id === sellState.market; })[0];
    o.querySelector('#mk-sl-cat').innerHTML = m.cats.map(function (c) { return '<option>' + c + '</option>'; }).join('');
  }
  window.mkOpenSell = function (market) {
    if (!me()) { toast('Please sign in to sell'); return; }
    var o = mkOverlay('mk-sell', 'Sell a product');
    if (market && MARKETS.some(function (x) { return x.id === market; })) sellState.market = market;
    else if (window.__mkCtx && window.__mkCtx.market) sellState.market = window.__mkCtx.market();
    var b = o.querySelector('.mk-ov-body');
    if (!b.dataset.built) {
      b.dataset.built = 1;
      b.innerHTML =
        '<div class="mk-fm"><div class="mk-fm-intro"><b>List your product</b><span>Reach buyers near you. It takes less than a minute.</span></div>' +
        '<div class="mk-fs"><div class="mk-fh">Photos</div><div class="mk-phs" id="mk-sl-ph"></div></div>' +
        '<div class="mk-fs"><div class="mk-fh">Marketplace</div><div class="mk-chipsel" id="mk-sl-mk">' + MARKETS.map(function (x) { return '<button data-m="' + x.id + '">' + x.label + '</button>'; }).join('') + '</div></div>' +
        '<div class="mk-fs"><div class="mk-fh">Details</div>' +
        '<input class="mk-in" id="mk-sl-name" placeholder="Product name" maxlength="80">' +
        '<div class="mk-row2"><select class="mk-in" id="mk-sl-cat"></select><input class="mk-in" id="mk-sl-price" type="number" inputmode="decimal" placeholder="Price (₦)"></div>' +
        '<select class="mk-in" id="mk-sl-cond"><option>New</option><option>Fairly used</option><option>Refurbished</option></select>' +
        '<textarea class="mk-in" id="mk-sl-desc" rows="4" placeholder="Describe your product: size, colour, condition, what is included…"></textarea></div>' +
        '<div class="mk-fs"><div class="mk-fh">Location</div><div class="mk-loc"><input class="mk-in" id="mk-sl-loc" placeholder="City, State"><button id="mk-sl-gps"><i class="fa-solid fa-location-crosshairs"></i></button></div><div class="mk-hint" id="mk-sl-hint">Buyers nearby will see your product first.</div></div>' +
        '<div class="mk-fs"><div class="mk-fh">Availability</div><select class="mk-in" id="mk-sl-stock"><option>In stock</option><option>Single item</option><option>Made to order</option></select></div>' +
        '<button class="mk-pub" id="mk-sl-pub">Publish listing</button></div>';
      b.querySelectorAll('#mk-sl-mk button').forEach(function (btn) {
        btn.onclick = function () { sellState.market = btn.dataset.m; sync(); };
      });
      b.querySelector('#mk-sl-gps').onclick = function () {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(function (p) {
          sellState.lat = p.coords.latitude; sellState.lng = p.coords.longitude;
          b.querySelector('#mk-sl-hint').textContent = 'Precise location saved ✓';
          fetch('https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=' + p.coords.latitude + '&lon=' + p.coords.longitude).then(function (r) { return r.json(); }).then(function (j) {
            var a = j.address || {}; var c = a.city || a.town || a.county || '', s = a.state || '';
            var inp = b.querySelector('#mk-sl-loc'); if (!inp.value && (c || s)) inp.value = [c, s].filter(Boolean).join(', ');
          }).catch(function () {});
        }, function () { b.querySelector('#mk-sl-hint').textContent = 'Location permission denied. Type your city instead.'; });
      };
      b.querySelector('#mk-sl-pub').onclick = publish;
      paintPhotos(o);
    }
    function sync() {
      b.querySelectorAll('#mk-sl-mk button').forEach(function (x) { x.classList.toggle('on', x.dataset.m === sellState.market); });
      paintCats(o);
      if (sellState.market === 'fairly-used') b.querySelector('#mk-sl-cond').value = 'Fairly used';
    }
    sync(); openOv('mk-sell');
  };
  async function publish() {
    var o = document.getElementById('mk-sell'), g = function (i) { return o.querySelector(i).value.trim(); };
    var name = g('#mk-sl-name'), price = g('#mk-sl-price');
    if (!sellState.photos.length) return toast('Add at least one photo');
    if (!name || !price) return toast('Enter the product name and price');
    var btn = o.querySelector('#mk-sl-pub'); btn.disabled = true; btn.textContent = 'Publishing…';
    try {
      var F = await window.mkGetFs(), m = F.m, u = me();
      var data = {
        name: name, price: '₦' + Number(price).toLocaleString(), location: g('#mk-sl-loc') || 'Nigeria', description: g('#mk-sl-desc'),
        category: g('#mk-sl-cat'), market: sellState.market, condition: g('#mk-sl-cond'), status: g('#mk-sl-stock'),
        image: sellState.photos[0], images: sellState.photos, createdAt: m.serverTimestamp(), vendorId: u
      };
      if (sellState.lat != null) { data.lat = sellState.lat; data.lng = sellState.lng; }
      var ref = await m.addDoc(m.collection(F.db, 'products'), data);
      try {
        var vr = m.doc(F.db, 'vendors', u), vs = await m.getDoc(vr);
        if (!vs.exists() || !vs.data().storeName) await m.setDoc(vr, { storeName: u.charAt(0).toUpperCase() + u.slice(1), createdAt: m.serverTimestamp() }, { merge: true });
        if (sellState.lat != null) await m.setDoc(vr, { lat: sellState.lat, lng: sellState.lng }, { merge: true });
      } catch (e) {}
      try { await m.addDoc(m.collection(F.db, 'posts'), { username: u, content: name, mediaUrl: sellState.photos[0], mediaType: 'image', category: 'business', productId: ref.id, likesCount: 0, commentsCount: 0, timestamp: m.serverTimestamp() }); } catch (e) {}
      sellState.photos = []; o.querySelector('.mk-ov-body').dataset.built = '';
      toast('Your product is live'); closeOv('mk-sell');
      if (window.mkSwitchVertical) window.mkSwitchVertical(data.market);
    } catch (e) { toast('Could not publish: ' + e.message); btn.disabled = false; btn.textContent = 'Publish listing'; }
  }

  /* ---------------- CATEGORIES ---------------- */
  var cat = { cur: null, items: [], q: '', asc: false, unsub: null };
  window.mkOpenCategories = function () {
    var o = mkOverlay('mk-cats', 'Categories'), b = o.querySelector('.mk-ov-body');
    var market = window.__mkCtx && window.__mkCtx.market ? window.__mkCtx.market() : 'fashion';
    var M = MARKETS.filter(function (x) { return x.id === market; })[0] || MARKETS[0];
    o.querySelector('.mk-ov-t').textContent = M.label + ' categories'; cat.cur = null;
    b.innerHTML = '<div class="mk-cat-search"><i class="fa-solid fa-magnifying-glass"></i><input id="mk-cat-q" placeholder="Search in ' + esc(M.label) + '"></div><div class="mk-cat-wrap"><div class="mk-cat-side" id="mk-cat-side"></div><div class="mk-cat-main"><div class="mk-cat-sort"><span id="mk-cat-title">All items</span><button id="mk-cat-sort">Price <i class="fa-solid fa-arrow-down"></i></button></div><div class="mk-cat-grid" id="mk-cat-grid"><div class="mk-empty-line">Loading…</div></div></div></div>';
    var side = b.querySelector('#mk-cat-side');
    side.innerHTML = ['All'].concat(M.cats).map(function (c, i) { return '<button class="' + (i ? '' : 'on') + '" data-c="' + (i ? esc(c) : '') + '">' + esc(c) + '</button>'; }).join('');
    function draw() {
      var l = cat.items.filter(function (p) { return (!cat.cur || String(p.category || '').toLowerCase() === cat.cur.toLowerCase()) && (!cat.q || String(p.name || '').toLowerCase().indexOf(cat.q) > -1); });
      var n = function (p) { return parseFloat(String(p.price || '0').replace(/[^0-9.]/g, '')) || 0; };
      if (cat.sorted) l.sort(function (a, c) { return cat.asc ? n(a) - n(c) : n(c) - n(a); });
      b.querySelector('#mk-cat-title').textContent = cat.cur || 'All items';
      b.querySelector('#mk-cat-grid').innerHTML = l.length ? l.map(function (p) {
        return '<div class="mk-ct" data-id="' + p.id + '"><div class="mk-ct-i"><img loading="lazy" src="' + esc(p.image || '') + '"></div><div class="mk-ct-n">' + esc(p.name) + '</div><div class="mk-ct-p">' + esc(p.price) + '</div></div>';
      }).join('') : '<div class="mk-empty-line">No products in this category yet.</div>';
      b.querySelectorAll('.mk-ct').forEach(function (e) { e.onclick = function () { if (window.openProductsPageOverlay) window.openProductsPageOverlay(e.dataset.id); }; });
    }
    side.onclick = function (e) { var t = e.target.closest('button'); if (!t) return; side.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); t.classList.add('on'); cat.cur = t.dataset.c || null; draw(); };
    b.querySelector('#mk-cat-q').oninput = function (e) { cat.q = e.target.value.toLowerCase().trim(); draw(); };
    b.querySelector('#mk-cat-sort').onclick = function () { cat.sorted = true; cat.asc = !cat.asc; this.querySelector('i').className = 'fa-solid fa-arrow-' + (cat.asc ? 'up' : 'down'); draw(); };
    openOv('mk-cats');
    window.mkGetFs().then(function (F) {
      var m = F.m; if (cat.unsub) cat.unsub();
      cat.unsub = m.onSnapshot(m.query(m.collection(F.db, 'products'), m.orderBy('createdAt', 'desc')), function (s) {
        cat.items = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (p) { return window.mkMarketOf ? window.mkMarketOf(p) === market : true; });
        draw();
      });
    });
  };
})();
