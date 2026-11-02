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

  /* ---------------- SELL (design 2) ---------------- */
  var sellState = { photos: [], hero: 0, market: 'fashion', lat: null, lng: null, state: '', lga: '' };
  function resize(file) {
    return new Promise(function (res) {
      var r = new FileReader();
      r.onload = function (e) {
        var im = new Image();
        im.onload = function () {
          var s = Math.min(1, 800 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', .7));
        };
        im.src = e.target.result;
      };
      r.readAsDataURL(file);
    });
  }
  function mOf(id) { return MARKETS.filter(function (x) { return x.id === id; })[0] || MARKETS[0]; }
  function curMarket() { return (window.__mkCtx && window.__mkCtx.market && window.__mkCtx.market()) || 'fashion'; }
  async function vendorMarkets() {
    var F = await window.mkGetFs(), m = F.m, u = me(), out = null;
    try {
      var vs = await m.getDoc(m.doc(F.db, 'vendors', u));
      if (vs.exists() && vs.data().markets && vs.data().markets.length) out = vs.data().markets.slice();
    } catch (e) {}
    if (!out) {   // older stores: derive from what they already sell
      try {
        var ps = await m.getDocs(m.query(m.collection(F.db, 'products'), m.where('vendorId', '==', u)));
        var set = {}; ps.docs.forEach(function (d) { var mk = window.mkMarketOf ? window.mkMarketOf(d.data()) : 'fashion'; if (mk !== 'fairly-used') set[mk] = 1; });
        out = Object.keys(set);
      } catch (e) { out = []; }
    }
    return out;
  }
  function paintSlots(o) {
    var box = o.querySelector('#mk-s2-slots'), hero = o.querySelector('#mk-s2-hero');
    var h = sellState.photos[sellState.hero];
    hero.querySelector('img') && hero.querySelector('img').remove();
    if (h) { var im = document.createElement('img'); im.src = h; hero.insertBefore(im, hero.firstChild); hero.querySelector('.ic').style.display = 'none'; } else hero.querySelector('.ic').style.display = '';
    var html = sellState.photos.map(function (p, i) { return '<div class="mk-s2-slot' + (i === sellState.hero ? ' on' : '') + '" data-i="' + i + '"><img src="' + p + '"><button data-x="' + i + '">×</button></div>'; }).join('');
    for (var k = sellState.photos.length; k < 5; k++) html += '<div class="mk-s2-slot" data-add="1"><i class="fa-solid fa-plus"></i></div>';
    box.innerHTML = html;
    box.querySelectorAll('[data-i]').forEach(function (e) { e.onclick = function (ev) { if (ev.target.dataset.x != null) return; sellState.hero = +e.dataset.i; paintSlots(o); }; });
    box.querySelectorAll('[data-x]').forEach(function (e) { e.onclick = function (ev) { ev.stopPropagation(); sellState.photos.splice(+e.dataset.x, 1); sellState.hero = 0; paintSlots(o); }; });
    box.querySelectorAll('[data-add]').forEach(function (e) { e.onclick = function () { o.querySelector('#mk-s2-gal').click(); }; });
  }
  function paintCats(o) {
    var eff = effMarket(o);
    o.querySelector('#mk-s2-cat').innerHTML = mOf(eff).cats.map(function (c) { return '<option>' + c + '</option>'; }).join('');
  }
  var CURS = [['₦','NGN'],['$','USD'],['£','GBP'],['€','EUR'],['GH₵','GHS'],['KSh','KES'],['R','ZAR'],['E£','EGP'],['AED','AED'],['SAR','SAR'],['₹','INR'],['CA$','CAD'],['A$','AUD'],['¥','CNY'],['₺','TRY'],['R$','BRL']];
  var CUR_CC = { NG:'₦', GH:'GH₵', KE:'KSh', ZA:'R', EG:'E£', GB:'£', US:'$', CA:'CA$', AE:'AED', SA:'SAR', IN:'₹', AU:'A$', CN:'¥', TR:'₺', BR:'R$', DE:'€', FR:'€', ES:'€', IT:'€', NL:'€', IE:'€', PT:'€', BE:'€', AT:'€', GR:'€', FI:'€' };
  var userCC = ''; try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '', TZ = { Lagos: 'NG', Accra: 'GH', Nairobi: 'KE', Johannesburg: 'ZA', Cairo: 'EG', London: 'GB', Dubai: 'AE', Riyadh: 'SA', Kolkata: 'IN', Karachi: 'PK', Toronto: 'CA', Sydney: 'AU', Paris: 'FR', Berlin: 'DE', Istanbul: 'TR', Addis_Ababa: 'ET', Dar_es_Salaam: 'TZ', Kampala: 'UG', Dakar: 'SN', Douala: 'CM', Niamey: 'NE', Ndjamena: 'TD', Casablanca: 'MA', Algiers: 'DZ' }; Object.keys(TZ).some(function (k) { if (tz.indexOf('/' + k) > -1) { userCC = TZ[k]; return true; } }); if (!userCC) userCC = ((navigator.language || '').split('-')[1] || '').toUpperCase(); } catch (e) {}
  function effMarket(o) { var c = o.querySelector('#mk-s2-cond'); return (c && c.value === 'Fairly used') ? 'fairly-used' : sellState.market; }
  function paintLock(o) {
    var eff = effMarket(o), lab = mOf(eff).label;
    o.querySelector('#mk-s2-lock').innerHTML = '<i class="fa-solid fa-lock"></i><span>Listing in <b>' + lab + '</b>' + (eff === 'fairly-used' && sellState.market !== 'fairly-used' ? ' · used items go here automatically' : '') + '</span><button id="mk-s2-switch">Switch marketplace</button>';
    o.querySelector('#mk-s2-switch').onclick = function () { o.querySelector('#mk-s2-pick').classList.toggle('on'); };
  }
  function gateScreen(o, mk, enrolled) {
    var b = o.querySelector('.mk-ov-body'); b.dataset.built = '';
    var names = enrolled.map(function (x) { return mOf(x).label; }).join(', ');
    b.innerHTML = '<div class="mk-gate"><i class="fa-solid fa-store big"></i><h2>This is a ' + mOf(mk).label + ' listing</h2><p>Your store sells in <b>' + names + '</b>. To keep every marketplace trustworthy, a store can list only in its own marketplace. Used items can always go to Fairly Used.</p><button class="mk-pub" id="mk-gate-go">Go to ' + mOf(enrolled[0]).label + '</button></div>';
    b.querySelector('#mk-gate-go').onclick = function () { closeOv('mk-sell'); if (window.mkSwitchVertical) window.mkSwitchVertical(enrolled[0]); };
  }
  window.mkOpenSell = async function (market) {
    if (!me()) { toast('Please sign in to sell'); return; }
    var o = mkOverlay('mk-sell', 'Sell'), b = o.querySelector('.mk-ov-body');
    sellState.market = (market && MARKETS.some(function (x) { return x.id === market; })) ? market : curMarket();
    o.querySelector('.mk-ov-t').textContent = 'New listing';
    openOv('mk-sell');
    // one-store-one-marketplace rule (Fairly Used is open to everyone)
    if (sellState.market !== 'fairly-used') {
      b.innerHTML = '<div class="mk-ib-empty" style="padding:80px 0;text-align:center;color:#838383">Checking your store…</div>';
      var enrolled = []; try { enrolled = await vendorMarkets(); } catch (e) {}
      if (enrolled.length && enrolled.indexOf(sellState.market) < 0) { gateScreen(o, sellState.market, enrolled); return; }
    }
    try { await window.NXGeo.loadPlaces(); } catch (e) {}
    sellState.photos = []; sellState.hero = 0; sellState.lat = sellState.lng = null; sellState.place = null;
    
    b.dataset.built = 1;
    b.innerHTML = '<div class="mk-s2">' +
      '<div class="mk-lock" id="mk-s2-lock" style="margin-top:6px"></div>' +
      '<div class="mk-mpick" id="mk-s2-pick"><div class="mk-mpick-t">SWITCH MARKETPLACE</div>' + MARKETS.map(function (x) { return '<button data-m="' + x.id + '" class="' + (x.id === sellState.market ? 'cur' : '') + '">' + x.label + '</button>'; }).join('') + '</div>' +
      '<div class="mk-s2-hero" id="mk-s2-hero"><i class="fa-solid fa-camera ic"></i><div class="bar"><label><i class="fa-solid fa-camera"></i> Camera<input id="mk-s2-cam" type="file" accept="image/*" capture="environment" hidden></label><label><i class="fa-solid fa-image"></i> Gallery<input id="mk-s2-gal" type="file" accept="image/*" multiple hidden></label></div></div>' +
      '<div class="mk-s2-hint">Add up to 5 photos. The first one is your cover — tap a photo to make it the cover.</div><div class="mk-s2-slots" id="mk-s2-slots"></div>' +
      '<div class="mk-s2-f">' +
      '<div class="mk-fld"><small>Title</small><input id="mk-s2-name" maxlength="80" placeholder="What are you selling?"></div>' +
      '<div class="mk-r2"><div class="mk-fld"><small>Price</small><div style="display:flex;gap:6px"><select id="mk-s2-cur" style="max-width:84px">' + CURS.map(function (c) { return '<option value="' + c[0] + '">' + c[0] + ' ' + c[1] + '</option>'; }).join('') + '</select><input id="mk-s2-price" type="number" inputmode="decimal" placeholder="0"></div></div><div class="mk-fld"><small>Condition</small><select id="mk-s2-cond"><option>New</option><option>Fairly used</option></select></div></div>' +
      '<div class="mk-fld"><small>Category</small><select id="mk-s2-cat"></select></div>' +
      '<div class="mk-fld"><small>Description</small><textarea id="mk-s2-desc" rows="3" placeholder="Colour, size, what\'s included…"></textarea></div>' +
      '<div class="mk-fld" style="position:relative"><small>Location <button class="gps" id="mk-s2-gps"><i class="fa-solid fa-location-crosshairs"></i> Use my location</button></small><div style="display:flex;align-items:center;gap:8px;margin-top:6px"><i class="fa-solid fa-location-dot" style="color:#838383"></i><input id="mk-s2-loc" autocomplete="off" placeholder="Search city, town or area" style="margin:0"></div><div id="mk-s2-sug" class="mk-sug"></div><input id="mk-s2-area" placeholder="Street / landmark (optional)" style="margin-top:8px;border-top:1px solid #232323;padding-top:10px"></div>' +
      '<div id="mk-s2-hintloc" class="mk-s2-hint" style="margin:0 2px">Buyers nearby see your product first.</div></div>' +
      '<div class="mk-s2-pub"><button class="mk-pub" id="mk-s2-pub">Publish</button></div></div>';
    if (sellState.market === 'fairly-used') b.querySelector('#mk-s2-cond').value = 'Fairly used';
    b.querySelectorAll('#mk-s2-pick button').forEach(function (btn) { btn.onclick = function () { window.mkOpenSell(btn.dataset.m); }; });
    var cond = b.querySelector('#mk-s2-cond'); cond.onchange = function () { paintLock(o); paintCats(o); };
    var locIn = b.querySelector('#mk-s2-loc'), sug = b.querySelector('#mk-s2-sug'), curSel = b.querySelector('#mk-s2-cur'), hint = b.querySelector('#mk-s2-hintloc');
    function pick(pl, exact) {
      sellState.place = pl; sellState.lat = pl.lat; sellState.lng = pl.lng; sellState.exact = !!exact;
      locIn.value = window.NXGeo.placeLabel(pl); sug.classList.remove('on');
      if (CUR_CC[pl.cc]) curSel.value = CUR_CC[pl.cc];
      hint.textContent = (exact ? 'Precise location saved · ' : 'Location set · ') + window.NXGeo.placeLabel(pl) + ' ✓';
    }
    var tmr; locIn.oninput = function () {
      sellState.place = null; sellState.lat = sellState.lng = null; clearTimeout(tmr);
      tmr = setTimeout(function () {
        var r = window.NXGeo.search(locIn.value, { cc: userCC, near: sellState.gps || (window.mkUserGeo && window.mkUserGeo.lat != null ? [window.mkUserGeo.lat, window.mkUserGeo.lng] : null) });
        sug.innerHTML = r.map(function (x, i) { return '<button type="button" data-i="' + i + '"><i class="fa-solid fa-location-dot"></i><span><b>' + esc(x.n) + '</b><small>' + esc([x.st && x.st !== x.n ? x.st : '', window.NXGeo.countryName(x.cc)].filter(Boolean).join(', ')) + (x.lga ? ' · LGA' : '') + '</small></span></button>'; }).join('');
        sug.classList.toggle('on', !!r.length);
        sug.querySelectorAll('button').forEach(function (bt) { bt.onclick = function () { pick(r[+bt.dataset.i]); }; });
      }, 120);
    };
    b.querySelector('#mk-s2-gps').onclick = function () {
      if (!navigator.geolocation) return toast('Location is not supported on this device');
      hint.textContent = 'Getting your location…';
      navigator.geolocation.getCurrentPosition(function (p) {
        sellState.gps = [p.coords.latitude, p.coords.longitude];
        var r = window.NXGeo.reverse(p.coords.latitude, p.coords.longitude);
        if (r) { var pl = Object.assign({}, r.place, { lat: p.coords.latitude, lng: p.coords.longitude }); pick(pl, true); }
        else { sellState.lat = p.coords.latitude; sellState.lng = p.coords.longitude; sellState.exact = true; hint.textContent = 'Precise location saved ✓'; }
      }, function () { hint.textContent = 'Location permission denied — search your city or town instead.'; }, { enableHighAccuracy: true, timeout: 12000 });
    };
    ['#mk-s2-gal', '#mk-s2-cam'].forEach(function (sel) {
      var inp = b.querySelector(sel);
      inp.onchange = async function () { for (var i = 0; i < inp.files.length && sellState.photos.length < 5; i++) sellState.photos.push(await resize(inp.files[i])); inp.value = ''; paintSlots(o); };
    });
    b.querySelector('#mk-s2-pub').onclick = publish;
    paintLock(o); paintCats(o); paintSlots(o);
  };
  async function publish() {
    var o = document.getElementById('mk-sell'), g = function (i) { return (o.querySelector(i).value || '').trim(); };
    var name = g('#mk-s2-name'), price = g('#mk-s2-price'), sym = g('#mk-s2-cur') || '₦', pl = sellState.place;
    if (!sellState.photos.length) return toast('Add at least one photo');
    if (!name || !price) return toast('Enter the product name and price');
    if (!pl && sellState.lat == null) return toast('Choose your location from the list, or tap Use my location');
    var btn = o.querySelector('#mk-s2-pub'); btn.disabled = true; btn.textContent = 'Publishing…';
    try {
      var F = await window.mkGetFs(), m = F.m, u = me(), eff = effMarket(o);
      var lat = sellState.lat, lng = sellState.lng, cn = pl ? window.NXGeo.countryName(pl.cc) : '', stt = pl ? (pl.st || '') : '', city = pl ? pl.n : '', lg = pl && pl.lga ? pl.n : '', st = stt;
      var imgs = sellState.photos.slice(); var cover = imgs.splice(sellState.hero, 1)[0]; imgs.unshift(cover);
      var area = g('#mk-s2-area');
      var data = {
        name: name, price: sym + Number(price).toLocaleString(), description: g('#mk-s2-desc'), category: g('#mk-s2-cat'), market: eff, condition: g('#mk-s2-cond'), status: 'In stock',
        country: cn, countryCode: pl ? pl.cc : '', city: city, state: st, lga: lg, location: [area, city, st && st !== city ? st : '', cn].filter(Boolean).join(', '), image: imgs[0], images: imgs, createdAt: m.serverTimestamp(), vendorId: u
      };
      if (lat != null) { data.lat = lat; data.lng = lng; data.geoExact = !!sellState.exact; }
      var ref = await m.addDoc(m.collection(F.db, 'products'), data);
      try {
        var vr = m.doc(F.db, 'vendors', u), vs = await m.getDoc(vr), patch = { state: st, lga: lg, country: cn, city: city };
        if (!vs.exists() || !vs.data().storeName) { patch.storeName = u.charAt(0).toUpperCase() + u.slice(1); patch.createdAt = m.serverTimestamp(); }
        if (lat != null) { patch.lat = lat; patch.lng = lng; }
        if (eff !== 'fairly-used') { var cur = (vs.exists() && vs.data().markets) || []; if (cur.indexOf(eff) < 0) patch.markets = cur.concat([eff]); }
        await m.setDoc(vr, patch, { merge: true });
      } catch (e) {}
      try { await m.addDoc(m.collection(F.db, 'posts'), { username: u, content: name, mediaUrl: imgs[0], mediaType: 'image', category: 'business', productId: ref.id, likesCount: 0, commentsCount: 0, timestamp: m.serverTimestamp() }); } catch (e) {}
      sellState.photos = []; o.querySelector('.mk-ov-body').dataset.built = '';
      toast('Your product is live'); closeOv('mk-sell'); try { window.dispatchEvent(new Event('mk-listed')); } catch (e) {}
      if (window.mkSwitchVertical) window.mkSwitchVertical(eff);
    } catch (e) { toast('Could not publish: ' + e.message); btn.disabled = false; btn.textContent = 'Publish'; }
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
        var known = M.cats.map(function (c) { return c.toLowerCase(); }), extra = [];
        cat.items.forEach(function (p) { var c = String(p.category || '').trim(); if (c && known.indexOf(c.toLowerCase()) < 0 && extra.indexOf(c) < 0) extra.push(c); });
        if (extra.length) side.innerHTML = ['All'].concat(M.cats, extra).map(function (c, i) { return '<button class="' + (!cat.cur && !i || cat.cur === c ? 'on' : '') + '" data-c="' + (i ? esc(c) : '') + '">' + esc(c) + '</button>'; }).join('');
        draw();
      });
    });
  };
})();
