/* mk-overlays.js — marketplace Sell + Categories overlays (no page reloads). Loaded after shop.js. */
(function () {
  'use strict';
  if (window.__mk_overlays_js_ran) return; window.__mk_overlays_js_ran = true;
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
    var cn = o.querySelector('#mk-s2-cnt'); if (cn) cn.textContent = sellState.photos.length + '/5'; box.innerHTML = html; box.style.display = sellState.photos.length ? '' : 'none';
    var others = sellState.photos.filter(function (_, i) { return i !== sellState.hero; });
    o.querySelectorAll('.mk-s3-t').forEach(function (t, i) { var ph = others[i]; t.style.backgroundImage = ph ? 'url(' + ph + ')' : ''; t.classList.toggle('has', !!ph); });
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
    try { window.NXGeo.loadPlaces(); } catch (e) {}
    sellState.photos = []; sellState.hero = 0; sellState.lat = sellState.lng = null; sellState.place = null;
    
    b.dataset.built = 1;
    b.innerHTML = '<div class="mk-s2">' +
      '<div class="mk-lock" id="mk-s2-lock" style="margin-top:6px"></div>' +
      '<div class="mk-mpick" id="mk-s2-pick"><div class="mk-mpick-t">SWITCH MARKETPLACE</div>' + MARKETS.map(function (x) { return '<button data-m="' + x.id + '" class="' + (x.id === sellState.market ? 'cur' : '') + '">' + x.label + '</button>'; }).join('') + '</div>' +
      '<div class="mk-s3"><div class="mk-s2-hero" id="mk-s2-hero" role="button" aria-label="Take photo"><i class="fa-solid fa-camera ic"></i></div><div class="mk-s3-side"><div class="mk-s3-t" data-g="1" role="button" aria-label="Add from gallery"><i class="fa-solid fa-plus"></i></div><div class="mk-s3-t" data-g="1" role="button" aria-label="Add from gallery"><i class="fa-solid fa-plus"></i></div></div></div>' +
      '<input id="mk-s2-cam" type="file" accept="image/*" capture="environment" hidden><input id="mk-s2-gal" type="file" accept="image/*" multiple hidden>' +
      '<div class="mk-s3-tip"><i class="fa-solid fa-lightbulb"></i><span>Bright daylight and a plain background sell 3× faster. <b id="mk-s2-cnt">0/5</b> photos — tap one to make it the cover.</span></div><div class="mk-s2-slots" id="mk-s2-slots"></div>' +
      '<div class="mk-s2-f">' +
      '<div><label class="mk-lab">Title</label><div class="mk-fld"><input id="mk-s2-name" maxlength="80" placeholder="What are you selling?"></div></div>' +
      '<div class="mk-r2 mk-pc"><div><label class="mk-lab">Price</label><div class="mk-fld" style="gap:4px"><select id="mk-s2-cur" class="mk-cur">' + CURS.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '</select><input id="mk-s2-price" type="number" inputmode="decimal" placeholder="0"></div></div><div><label class="mk-lab">Condition</label><div class="mk-fld"><select id="mk-s2-cond"><option>New</option><option>Fairly used</option></select></div></div></div>' +
      '<div><label class="mk-lab">Category</label><div class="mk-fld"><select id="mk-s2-cat"></select></div></div>' +
      '<div><label class="mk-lab">Description</label><div class="mk-fld" style="align-items:flex-start"><textarea id="mk-s2-desc" rows="2" placeholder="Colour, size, what\'s included…"></textarea></div></div>' +
      '<div style="position:relative"><label class="mk-lab" style="display:flex;justify-content:space-between;align-items:center">Location <button class="gps" id="mk-s2-gps" style="float:none;color:#E3C48D;font-weight:700;font-size:12.5px;background:none;border:0;cursor:pointer"><i class="fa-solid fa-location-crosshairs"></i> Use my location</button></label><div class="mk-fld"><input id="mk-s2-loc" autocomplete="off" placeholder="Search city, town or area"></div><div id="mk-s2-sug" class="mk-sug"></div><div class="mk-fld" style="margin-top:8px"><input id="mk-s2-area" placeholder="Street / landmark (optional)"></div>' +
      '<div id="mk-s2-hintloc" class="mk-s2-hint" style="margin:8px 2px 0">Buyers nearby see your product first.</div></div></div>' +
      '<div class="mk-s2-pub"><button class="mk-pub" id="mk-s2-pub">Publish</button></div></div>';
    if (sellState.market === 'fairly-used') b.querySelector('#mk-s2-cond').value = 'Fairly used';
    b.querySelectorAll('#mk-s2-pick button').forEach(function (btn) { btn.onclick = function () { window.mkOpenSell(btn.dataset.m); }; });
    var cond = b.querySelector('#mk-s2-cond'); cond.onchange = function () { paintLock(o); paintCats(o); };
    var locIn = b.querySelector('#mk-s2-loc'), sug = b.querySelector('#mk-s2-sug'), curSel = b.querySelector('#mk-s2-cur'), hint = b.querySelector('#mk-s2-hintloc');
    function pick(pl, exact) {
      sellState.place = pl; sellState.lat = pl.lat; sellState.lng = pl.lng; sellState.exact = !!exact;
      locIn.value = window.NXGeo.placeLabel(pl); sug.classList.remove('on');
      hint.textContent = (exact ? 'Precise location saved · ' : 'Location set · ') + window.NXGeo.placeLabel(pl) + ' ✓';
    }
    var tmr; locIn.oninput = function () {
      sellState.place = null; sellState.lat = sellState.lng = null; clearTimeout(tmr);
      tmr = setTimeout(function () {
        if (!window.NXGeo.ready()) { window.NXGeo.loadPlaces().then(function () { if (locIn.value) locIn.oninput(); }); sug.innerHTML = '<div style="padding:14px;color:#838383;font-size:13px">Loading places…</div>'; sug.classList.add('on'); return; }
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
    b.querySelector('#mk-s2-hero').onclick = function () { b.querySelector('#mk-s2-cam').click(); };
    b.querySelectorAll('.mk-s3-t').forEach(function (t) { t.onclick = function () { b.querySelector('#mk-s2-gal').click(); }; });
    ['#mk-s2-gal', '#mk-s2-cam'].forEach(function (sel) {
      var inp = b.querySelector(sel);
      inp.onchange = async function () { for (var i = 0; i < inp.files.length && sellState.photos.length < 5; i++) sellState.photos.push(await resize(inp.files[i])); inp.value = ''; paintSlots(o); };
    });
    b.querySelector('#mk-s2-pub').onclick = publish;
    function fitCur() { curSel.style.width = (curSel.selectedOptions[0].text.length * 10 + 30) + 'px'; }
    curSel.onchange = fitCur; curSel.value = '$'; fitCur();
    paintLock(o); paintCats(o); paintSlots(o);
    // one-store-one-marketplace rule — checked in the background so the form opens instantly
    if (sellState.market !== 'fairly-used') {
      var chk = window.__mkEnrolled ? Promise.resolve(window.__mkEnrolled) : vendorMarkets().then(function (e) { window.__mkEnrolled = e; return e; });
      chk.then(function (enrolled) { if (o.classList.contains('on') && enrolled.length && enrolled.indexOf(sellState.market) < 0) gateScreen(o, sellState.market, enrolled); }).catch(function () {});
    }
  };
  async function publish() {
    var o = document.getElementById('mk-sell'), g = function (i) { return (o.querySelector(i).value || '').trim(); };
    var name = g('#mk-s2-name'), price = g('#mk-s2-price'), sym = g('#mk-s2-cur') || '$', pl = sellState.place;
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
      toast('Your product is live'); closeOv('mk-sell'); setTimeout(function () { mkBoostSheet(ref.id, name); }, 600); try { window.dispatchEvent(new Event('mk-listed')); } catch (e) {}
      if (window.mkSwitchVertical) window.mkSwitchVertical(eff);
    } catch (e) { toast('Could not publish: ' + e.message); btn.disabled = false; btn.textContent = 'Publish'; }
  }

  /* ---------------- ADS / SPONSORED (shared helpers) ---------------- */
  window.mkIsSponsored = window.mkIsSponsored || function (p) {
    if (!p || !p.promoted) return false;
    var u = p.promotedUntil; if (!u) return true;
    var t = u && u.toMillis ? u.toMillis() : (u && u.seconds ? u.seconds * 1000 : +new Date(u));
    return !t || t > Date.now();
  };
  window.mkAdOrder = window.mkAdOrder || function (list) {
    var s = [], o = []; list.forEach(function (p) { (window.mkIsSponsored(p) ? s : o).push(p); }); return s.concat(o);
  };
  window.mkSpTag = function (p) { return window.mkIsSponsored(p) ? '<div class="sp-tag">Sponsored</div>' : ''; };
  function mkCardHTML(p) {
    return '<div class="product-card" data-id="' + p.id + '"><div class="image-container"><img src="' + esc(p.image || '') + '" class="product-image" loading="lazy">' + window.mkSpTag(p) + '<div class="price-badge">' + esc(p.price) + '</div></div><div class="product-footer"><span class="product-name">' + esc(p.name) + '</span><span class="product-location">' + esc(p.location || '') + '</span></div></div>';
  }
  window.mkCardHTML = mkCardHTML;
  function allProds() { return (window.__mkCtx && window.__mkCtx.all && window.__mkCtx.all()) || []; }
  function inMarket(p, id) { return window.mkMarketOf ? window.mkMarketOf(p) === id : true; }
  function openProd(id) { if (window.openProductsPageOverlay) window.openProductsPageOverlay(id); }


  /* ---------------- BOOST THIS LISTING (post-publish) ---------------- */
  function mkBoostSheet(pid, name) {
    var old = document.getElementById('mk-boost'); if (old) old.remove();
    var o = document.createElement('div'); o.id = 'mk-boost'; o.className = 'mkb-bg';
    o.innerHTML = '<div class="mkb"><div class="mkb-h"></div><div class="mkb-t">Boost this listing</div><div class="mkb-s">Show "' + esc(name) + '" at the top as Sponsored and reach more buyers near you.</div>' +
      '<div class="mkb-opts">' + [3, 7, 14].map(function (d, i) { return '<button type="button" class="' + (i === 1 ? 'on' : '') + '" data-d="' + d + '"><b>' + d + ' days</b><span>' + (i === 1 ? 'Most popular' : (i ? 'Best reach' : 'Quick boost')) + '</span></button>'; }).join('') + '</div>' +
      '<button type="button" class="mk-primary" id="mkb-go">Request boost</button><button type="button" class="mkb-skip" id="mkb-skip">Not now</button></div>';
    document.body.appendChild(o); var days = 7;
    o.querySelectorAll('.mkb-opts button').forEach(function (b) { b.onclick = function () { o.querySelectorAll('.mkb-opts button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); days = +b.dataset.d; }; });
    o.querySelector('#mkb-skip').onclick = function () { o.remove(); };
    o.onclick = function (e) { if (e.target === o) o.remove(); };
    o.querySelector('#mkb-go').onclick = async function () {
      try { var F = await window.mkGetFs(), m = F.m; await m.addDoc(m.collection(F.db, 'adRequests'), { productId: pid, vendorId: me(), days: days, status: 'pending', createdAt: m.serverTimestamp() }); toast('Boost requested — we will confirm shortly'); }
      catch (e) { toast('Could not send the request'); }
      o.remove();
    };
  }
  window.mkBoostSheet = mkBoostSheet;

  /* ---------------- CATEGORIES (cx02) ---------------- */
  var cat = { cur: null, items: [], unsub: null };
  var CATICON = { Women: 'fa-person-dress', Men: 'fa-person', Kids: 'fa-child', Shoes: 'fa-shoe-prints', Bags: 'fa-bag-shopping', Accessories: 'fa-glasses', Beauty: 'fa-spa', Birds: 'fa-dove', Dogs: 'fa-dog', Cats: 'fa-cat', Fish: 'fa-fish', Phones: 'fa-mobile-screen', Laptops: 'fa-laptop', TVs: 'fa-tv', Audio: 'fa-headphones', Gaming: 'fa-gamepad', Appliances: 'fa-blender', Cars: 'fa-car', Motorcycles: 'fa-motorcycle', Trucks: 'fa-truck', Furniture: 'fa-couch', Kitchen: 'fa-utensils', Decor: 'fa-palette', Bedding: 'fa-bed', Lighting: 'fa-lightbulb', Tools: 'fa-screwdriver-wrench', Chickens: 'fa-drumstick-bite', Eggs: 'fa-egg', Feed: 'fa-wheat-awn', Turkeys: 'fa-feather', Ducks: 'fa-feather-pointed' };
  window.mkOpenCategories = function () {
    var o = mkOverlay('mk-cats', 'Categories'), b = o.querySelector('.mk-ov-body');
    var market = curMarket();
    var M = MARKETS.filter(function (x) { return x.id === market; })[0] || MARKETS[0];
    o.querySelector('.mk-ov-t').textContent = M.label; cat.cur = null;
    b.innerHTML = '<div class="cx-wrap"><div class="cx-rail" id="cx-rail"></div><div class="cx-main" id="cx-main"><div class="cx-h">Shop by category</div><div class="cx-circ" id="cx-circ"></div><div class="cx-div"></div><div class="cx-h cx-fh">Featured</div><div class="cx-grid" id="cx-grid"></div></div></div>';
    var rail = b.querySelector('#cx-rail'), circ = b.querySelector('#cx-circ'), grid = b.querySelector('#cx-grid');
    function catsAll() {
      var known = M.cats.map(function (c) { return c.toLowerCase(); }), extra = [];
      cat.items.forEach(function (p) { var c = String(p.category || '').trim(); if (c && known.indexOf(c.toLowerCase()) < 0 && extra.indexOf(c) < 0) extra.push(c); });
      return M.cats.concat(extra);
    }
    function ofCat(c) { return cat.items.filter(function (p) { return String(p.category || '').toLowerCase() === c.toLowerCase(); }); }
    function thumb(c) {
      var l = window.mkAdOrder(ofCat(c)), p = l[0];
      return p && p.image ? '<img loading="lazy" src="' + esc(p.image) + '">' : '<i class="fa-solid ' + (CATICON[c] || 'fa-tag') + '"></i>';
    }
    function draw() {
      var cs = catsAll();
      rail.innerHTML = ['All'].concat(cs).map(function (c, i) {
        var on = i ? cat.cur === c : !cat.cur;
        return '<button class="' + (on ? 'on' : '') + '" data-c="' + (i ? esc(c) : '') + '"><span class="cx-rt">' + (i ? thumb(c) : '<i class="fa-solid fa-border-all"></i>') + '</span><span class="cx-rl">' + esc(c) + '</span></button>';
      }).join('');
      circ.innerHTML = cs.map(function (c) {
        return '<button class="' + (cat.cur === c ? 'on' : '') + '" data-c="' + esc(c) + '"><span class="cx-ct">' + thumb(c) + '</span><span class="cx-cl">' + esc(c) + '</span></button>';
      }).join('');
      var l = window.mkAdOrder(cat.cur ? ofCat(cat.cur) : cat.items);
      grid.innerHTML = l.length ? l.map(mkCardHTML).join('') : '<div class="mk-empty-line" style="grid-column:1/-1">No products in this category yet.</div>';
      grid.querySelectorAll('.product-card').forEach(function (e) { e.onclick = function () { openProd(e.dataset.id); }; });
    }
    function pick(e) { var t = e.target.closest('button'); if (!t) return; var c = t.dataset.c || null; cat.cur = (c && cat.cur === c && t.parentNode === circ) ? null : c; draw(); }
    rail.onclick = pick; circ.onclick = pick;
    cat.items = allProds().filter(function (p) { return inMarket(p, market); }); draw();
    openOv('mk-cats');
    window.mkGetFs().then(function (F) {
      var m = F.m; if (cat.unsub) cat.unsub();
      cat.unsub = m.onSnapshot(m.query(m.collection(F.db, 'products'), m.orderBy('createdAt', 'desc')), function (s) {
        cat.items = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (p) { return inMarket(p, market); });
        draw();
      });
    }).catch(function () {});
  };

  /* ---------------- MARKETPLACES OVERLAY (ov05: wide hero + 2-col tiles) ---------------- */
  var BSVG = {
    'fairly-used': '<path d="M20.5 12.5l-8-8H4v8.5l8 8a2 2 0 0 0 2.8 0l5.7-5.7a2 2 0 0 0 0-2.8z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
    fashion: '<path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3c-1 2-4 2-8 0z"/>',
    fabrics: '<path d="M4 6l8-3 8 3-8 3z"/><path d="M4 12l8 3 8-3"/><path d="M4 17l8 3 8-3"/>',
    birds: '<path d="M3 17c4 0 5-3 6-6 1-3 4-4 7-3l4 2-3 2c0 5-4 9-10 8"/><circle cx="15" cy="8" r=".8"/>',
    electronics: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    vehicles: '<path d="M4 15l2-6c.3-1 1-1.5 2-1.5h8c1 0 1.7.5 2 1.5l2 6v4h-3v-2H7v2H4z"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    poultry: '<path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z"/>'
  };
  var BORDER = ['fairly-used', 'fashion', 'fabrics', 'birds', 'electronics', 'vehicles', 'home', 'poultry'];
  var BSHORT = { birds: 'Birds', home: 'Home', poultry: 'Poultry' };
  window.mkOpenMarkets = function () {
    var o = mkOverlay('mk-markets', 'Marketplaces'), b = o.querySelector('.mk-ov-body');
    var items = allProds();
    var tiles = BORDER.map(function (id, i) {
      var m = MARKETS.filter(function (x) { return x.id === id; })[0]; if (!m) return '';
      var l = window.mkAdOrder(items.filter(function (p) { return inMarket(p, id); })), p = l[0];
      var photo = p && p.image ? ' style="background-image:linear-gradient(180deg,rgba(0,0,0,.05) 35%,rgba(0,0,0,.78)),url(\'' + esc(p.image).replace(/'/g, '%27') + '\')"' : '';
      var ic = p && p.image ? '' : '<span class="bt-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E3C48D" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + BSVG[id] + '</svg></span>';
      return '<button type="button" class="bt' + (i === 0 ? ' bt-hero' : '') + (photo ? ' ph' : '') + '" data-m="' + id + '"' + photo + '>' + ic + '<span class="bt-n">' + esc(BSHORT[id] || m.label) + '</span></button>';
    }).join('');
    b.innerHTML = '<div class="bt-sub">Choose where you want to shop.</div><div class="bt-grid">' + tiles + '</div>';
    b.querySelectorAll('.bt').forEach(function (t) { t.onclick = function () { closeOv('mk-markets'); if (window.mkSwitchVertical) window.mkSwitchVertical(t.dataset.m); if (window.mkPaintMRow) window.mkPaintMRow(t.dataset.m); }; });
    openOv('mk-markets');
  };
  /* ---------------- MARKETPLACES ROW (main page) ---------------- */
  var MICON = { fashion: ['fa-shirt', '#7c3aed,#3b0f8c'], fabrics: ['fa-swatchbook', '#db2777,#7a0f3f'], birds: ['fa-dove', '#0891b2,#0b4a5c'], electronics: ['fa-mobile-screen', '#2563eb,#12296b'], vehicles: ['fa-car', '#dc2626,#6e1111'], home: ['fa-couch', '#d97706,#6b3a05'], poultry: ['fa-egg', '#ca8a04,#5a4204'], 'fairly-used': ['fa-recycle', '#16a34a,#0a4a22'] };
  window.mkPaintMRow = function (cur) {
    var el = document.getElementById('mk-mrow-s'); if (!el) return;
    cur = cur || curMarket();
    var items = allProds();
    el.innerHTML = ['fashion','fabrics','birds','electronics','vehicles','home','poultry','fairly-used'].map(function (id) {
      var m = MARKETS.filter(function (x) { return x.id === id; })[0]; if (!m) return '';
      var l = window.mkAdOrder(items.filter(function (p) { return inMarket(p, id); })), p = l[0];
      var photo = p && p.image ? ' style="background-image:linear-gradient(180deg,rgba(0,0,0,.05) 35%,rgba(0,0,0,.78)),url(\'' + esc(p.image).replace(/'/g, '%27') + '\')"' : '';
      var ic = p && p.image ? '' : '<span class="bt-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E3C48D" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + BSVG[id] + '</svg></span>';
      return '<button type="button" class="bt mk-mt' + (id === cur ? ' on' : '') + (photo ? ' ph' : '') + '" data-m="' + id + '"' + photo + '>' + ic + '<span class="bt-n">' + esc(BSHORT[id] || m.label) + '</span></button>';
    }).join('');
    el.querySelectorAll('.mk-mt').forEach(function (b) { b.onclick = function () { if (window.mkSwitchVertical) window.mkSwitchVertical(b.dataset.m); window.mkPaintMRow(b.dataset.m); }; });
  };
  window.mkPaintMRow();

  /* ---------------- FOOTER GUARD: the site footer must never show on top of overlays ---------------- */
  (function () {
    var hidden = [], on = false;
    function shown(el) { if (!el) return false; var cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden'; }
    function overlayOpen() {
      if (document.querySelector('.mk-ov.on')) return true;
      if (['products-page-overlay', 'store-front-overlay', 'vendor-chat-overlay'].some(function (id) { var e = document.getElementById(id); return e && e.classList.contains('active'); })) return true;
      if (['my-business-overlay', 'reviews-overlay', 'inbox-overlay'].some(function (id) { return shown(document.getElementById(id)); })) return true;
      // any other full-screen fixed layer (My Business, store-front, search…) counts as an overlay
      return Array.prototype.some.call(document.body.children, function (el) {
        if (el.id === 'footer-placeholder' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return false;
        var cs = getComputedStyle(el); if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
        var r = el.getBoundingClientRect(); return r.width >= innerWidth * 0.95 && r.height >= innerHeight * 0.9 && r.top <= 2;
      });
    }
    function footers() {
      var out = [], ph = document.getElementById('footer-placeholder');
      if (ph) Array.prototype.forEach.call(ph.children, function (c) { out.push(c); });
      Array.prototype.forEach.call(document.body.children, function (el) {
        var id = el.id || '', cl = String(el.className || '');
        if (/^mk-|toast|page-content/.test(id) || /mk-|toast|bottom-nav/.test(cl) || /^(SCRIPT|STYLE|LINK)$/.test(el.tagName)) return;
        var cs = getComputedStyle(el); if (cs.position !== 'fixed') return;
        var r = el.getBoundingClientRect();
        if (r.width >= innerWidth * 0.7 && r.height > 28 && r.height < 120 && r.bottom >= innerHeight - 40 && el.querySelectorAll('i,svg,img,a,button').length >= 3) out.push(el);
      });
      return out;
    }
    function apply() {
      var want = overlayOpen();
      document.body.classList.toggle('mk-ov-open', want);
      if (want && !on) { hidden = footers(); hidden.forEach(function (e) { e.dataset.mkPrev = e.style.display || ''; e.style.setProperty('display', 'none', 'important'); }); on = true; }
      else if (want && on) { footers().forEach(function (e) { if (hidden.indexOf(e) < 0) { hidden.push(e); e.dataset.mkPrev = e.style.display || ''; e.style.setProperty('display', 'none', 'important'); } }); }
      else if (!want && on) { hidden.forEach(function (e) { e.style.removeProperty('display'); if (e.dataset.mkPrev) e.style.display = e.dataset.mkPrev; }); hidden = []; on = false; }
    }
    var raf = 0; function sched() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; try { apply(); } catch (e) {} }); }
    new MutationObserver(sched).observe(document.body, { attributes: true, attributeFilter: ['class', 'style'], subtree: true, childList: true });
    setInterval(sched, 700); sched();
  })();
  // warm the "which marketplaces does this store sell in" answer so Sell opens with no wait
  setTimeout(function () { if (me() && !window.__mkEnrolled) vendorMarkets().then(function (e) { window.__mkEnrolled = e; }).catch(function () {}); }, 3500);
})();
