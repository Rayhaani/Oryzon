/* mk-loc.js — Location & filters sheet (two-pane, real map).
   Map: MapLibre GL + OpenStreetMap-based dark tiles. Data: NXGeo (Nigerian states + 774 LGAs). */
(function (G) {
  'use strict';
  if (G.mkLocOpen) return;
  var DEF = { cc: '', bb: null, state: '', lga: '', lat: null, lng: null, km: 0, pin: false, min: '', max: '', cond: '', seller: '', sort: '' };
  var APPLIED = Object.assign({}, DEF), T = null, root = null, tab = 'loc', M = null, mk = null, mapOK = false, pop = null;
  var ML_JS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js', ML_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
  var NG = { lat: 9.08, lng: 8.68 };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nm(s) { return G.NXGeo && G.NXGeo.norm ? G.NXGeo.norm(s) : String(s || '').toLowerCase(); }
  function active(f) { return !!(f.cc || f.state || f.lat != null || f.min !== '' || f.max !== '' || f.cond || f.seller || (f.sort && f.sort !== 'new')); }
  function priceOf(p) { if (typeof p.priceValue === 'number') return p.priceValue; var n = parseFloat(String(p.price || '').replace(/[^\d.]/g, '')); return isNaN(n) ? null : n; }
  function dist(f, p) { var g = G.mkProductGeo && G.mkProductGeo(p); if (!g) return null; return G.NXGeo.km(f.lat, f.lng, g.lat, g.lng); }

  function filterList(list, f) {
    var out = list.filter(function (p) {
      if (f.lat != null && f.km > 0) { var d = dist(f, p); if (d == null || d > f.km) return false; p._distance = d; }
      else if (f.cc && !f.state) { if (!inCountry(p, f.cc)) return false; }
      else if (f.state) {
        if (f.cc && !inCountry(p, f.cc)) return false;
        var s = nm(f.state), loc = nm(p.location || ''), okS = nm(p.state || '') === s || (' ' + loc + ' ').indexOf(' ' + s + ' ') > -1;
        if (!okS) return false;
        if (f.lga) { var l = nm(f.lga); if (!(nm(p.lga || '') === l || (' ' + loc + ' ').indexOf(' ' + l + ' ') > -1)) return false; }
      }
      if (f.min !== '' || f.max !== '') { var pv = priceOf(p); if (pv == null) return false; if (f.min !== '' && pv < +f.min) return false; if (f.max !== '' && pv > +f.max) return false; }
      if (f.cond) { var c = p.condition || ((p.market === 'fairly-used' || p.market === 'used-market') ? 'Fairly used' : 'New'); if (c !== f.cond) return false; }
      if (f.seller) { var vid = G.__mkc && G.__mkc.vid(p), v = vid && G.__mkc.cache[vid]; if (!v || !v[f.seller]) return false; }
      return true;
    });
    if (f.sort === 'low') out.sort(function (a, b) { return (priceOf(a) || 0) - (priceOf(b) || 0); });
    else if (f.sort === 'high') out.sort(function (a, b) { return (priceOf(b) || 0) - (priceOf(a) || 0); });
    else if (f.sort === 'near' && f.lat != null) out.sort(function (a, b) { var x = dist(f, a), y = dist(f, b); return (x == null ? 1e9 : x) - (y == null ? 1e9 : y); });
    return out;
  }
  function cname(cc) { return (G.NXGeo && G.NXGeo.countryName(cc)) || cc; }
  function inCountry(p, cc) { if (p.countryCode) return p.countryCode === cc; var n = nm(cname(cc)); return nm(p.country || '') === n || (' ' + nm(p.location || '') + ' ').indexOf(' ' + n + ' ') > -1; }
  G.mkLocApply = function (list) { return active(APPLIED) ? filterList(list, APPLIED) : list; };
  G.mkLocState = function () { return Object.assign({}, APPLIED); };
  function base() { return (G.mkBaseProducts && G.mkBaseProducts()) || []; }

  /* ---------- map ---------- */
  function loadMapLib() {
    if (G.maplibregl) return Promise.resolve();
    return new Promise(function (res, rej) {
      if (!document.querySelector('link[href="' + ML_CSS + '"]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = ML_CSS; document.head.appendChild(l); }
      var s = document.createElement('script'); s.src = ML_JS; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function circle(lat, lng, km) {
    var pts = [], dLat = km / 111.32, dLng = km / (111.32 * Math.cos(lat * Math.PI / 180));
    for (var i = 0; i <= 64; i++) { var a = i / 64 * 2 * Math.PI; pts.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]); }
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] } };
  }
  function initMap() {
    var el = root.querySelector('.ml-map-c'); if (!el) return;
    loadMapLib().then(function () {
      if (M) { M.resize(); paintMap(true); return; }
      M = new G.maplibregl.Map({
        container: el, center: [NG.lng, NG.lat], zoom: 4.6, attributionControl: false, pitchWithRotate: false, dragRotate: false,
        style: { version: 8, sources: { b: { type: 'raster', tiles: ['a', 'b', 'c', 'd'].map(function (x) { return 'https://' + x + '.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'; }), tileSize: 256, attribution: '© OpenStreetMap contributors © CARTO' } }, layers: [{ id: 'b', type: 'raster', source: 'b' }] }
      });
      M.addControl(new G.maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      M.on('load', function () {
        mapOK = true;
        M.addSource('rad', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        M.addSource('pts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        M.addLayer({ id: 'rad-f', type: 'fill', source: 'rad', paint: { 'fill-color': '#E3C48D', 'fill-opacity': 0.12 } });
        M.addLayer({ id: 'rad-l', type: 'line', source: 'rad', paint: { 'line-color': '#E3C48D', 'line-width': 1.6, 'line-dasharray': [2, 2] } });
        M.addLayer({ id: 'pts', type: 'circle', source: 'pts', paint: { 'circle-radius': 4.5, 'circle-color': '#E3C48D', 'circle-stroke-color': '#050505', 'circle-stroke-width': 1.5 } });
        var d = document.createElement('div'); d.className = 'ml-pin'; mk = new G.maplibregl.Marker({ element: d });
        M.on('click', function (e) { T.lat = e.lngLat.lat; T.lng = e.lngLat.lng; T.pin = true; T.state = ''; T.lga = ''; T.bb = null; if (!T.km) T.km = 25; render(true); });
        paintMap(true);
      });
    }).catch(function () { var c = root.querySelector('.ml-map-c'); if (c) c.innerHTML = '<div class="ml-nomap">Map could not load. Filters still work.</div>'; });
  }
  function paintMap(fit) {
    if (!M || !mapOK) return;
    var has = T.lat != null;
    M.getSource('rad').setData({ type: 'FeatureCollection', features: has && T.km > 0 ? [circle(T.lat, T.lng, T.km)] : [] });
    var res = filterList(base(), T), feats = [];
    res.forEach(function (p) { var g = G.mkProductGeo && G.mkProductGeo(p); if (g) feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [g.lng, g.lat] } }); });
    M.getSource('pts').setData({ type: 'FeatureCollection', features: feats });
    if (has) { mk.setLngLat([T.lng, T.lat]).addTo(M); } else if (mk) mk.remove();
    if (!fit) return;
    if (!has) { M.flyTo({ center: [NG.lng, NG.lat], zoom: 4.6, duration: 600 }); return; }
    if (T.bb && !T.state && !(T.km > 0)) { M.fitBounds([[T.bb[0], T.bb[1]], [T.bb[2], T.bb[3]]], { padding: 24, duration: 600, maxZoom: 7 }); return; }
    if (T.km > 0) { var dLat = T.km / 111.32, dLng = T.km / (111.32 * Math.cos(T.lat * Math.PI / 180)); M.fitBounds([[T.lng - dLng, T.lat - dLat], [T.lng + dLng, T.lat + dLat]], { padding: 28, duration: 600, maxZoom: 14 }); }
    else M.flyTo({ center: [T.lng, T.lat], zoom: T.lga ? 11 : 7, duration: 600 });
  }

  /* ---------- data helpers ---------- */
  var CI = null;
  function buildCI() {
    if (CI) return CI; var idx = G.NXGeo && G.NXGeo.index && G.NXGeo.index(); if (!idx) return null;
    CI = {}; idx.forEach(function (p) { var c = CI[p.cc] || (CI[p.cc] = {}); (c[p.st || ''] = c[p.st || ''] || []).push(p); }); return CI;
  }
  function countries() {
    var ci = buildCI(); if (!ci) return [['NG', cname('NG')]];
    var a = Object.keys(ci).map(function (c) { return [c, cname(c)]; }).sort(function (x, y) { return x[1] < y[1] ? -1 : 1; });
    return a.filter(function (x) { return x[0] === 'NG'; }).concat(a.filter(function (x) { return x[0] !== 'NG'; }));
  }
  function statesOf(cc) {
    if (cc === 'NG') return states();
    var ci = buildCI(); return ci && ci[cc] ? Object.keys(ci[cc]).filter(Boolean).sort() : [];
  }
  function areasOf(cc, st) {
    if (cc === 'NG') return lgas(st);
    var ci = buildCI(), seen = {}, out = [];
    ((ci && ci[cc] && ci[cc][st]) || []).forEach(function (p) { if (!seen[p.n]) { seen[p.n] = 1; out.push(p.n); } });
    return out.sort();
  }
  function mean(arr) { var la = 0, ln = 0; arr.forEach(function (p) { la += p.lat; ln += p.lng; }); return { lat: la / arr.length, lng: ln / arr.length }; }
  function setCountry(cc) {
    T.cc = cc; T.state = ''; T.lga = ''; T.pin = false; T.bb = null; T.lat = null; T.lng = null;
    if (!cc) return;
    var ci = buildCI(), all = []; if (ci && ci[cc]) Object.keys(ci[cc]).forEach(function (k) { all = all.concat(ci[cc][k]); });
    if (!all.length) return;
    var la = all.map(function (p) { return p.lat; }).sort(function (a, b) { return a - b; }), ln = all.map(function (p) { return p.lng; }).sort(function (a, b) { return a - b; });
    var lo = Math.floor(all.length * 0.05), hi = Math.max(lo, Math.ceil(all.length * 0.95) - 1);
    T.bb = [ln[lo], la[lo], ln[hi], la[hi]]; T.lat = (la[lo] + la[hi]) / 2; T.lng = (ln[lo] + ln[hi]) / 2;
  }
  function states() { return (G.NXGeo && G.NXGeo.states()) || []; }
  function lgas(s) { return ((G.NXGeo && G.NXGeo.lgas(s)) || []).map(function (l) { return l[0]; }).sort(); }
  function setState(s) {
    T.state = s; T.lga = ''; T.pin = false; T.bb = null;
    if (!s) { setCountry(T.cc); return; }
    var c = null;
    if (T.cc === 'NG') c = G.NXGeo.fromText(s);
    else { var ci = buildCI(), arr = ci && ci[T.cc] && ci[T.cc][s]; if (arr && arr.length) c = mean(arr); }
    T.lat = c ? c.lat : null; T.lng = c ? c.lng : null;
  }
  function setLga(n) {
    T.lga = n; T.pin = false;
    if (!n) { setState(T.state); return; }
    if (T.cc === 'NG') { var l = G.NXGeo.lga(T.state, n); if (l) { T.lat = l[1]; T.lng = l[2]; } }
    else { var ci = buildCI(), arr = ((ci && ci[T.cc] && ci[T.cc][T.state]) || []).filter(function (p) { return p.n === n; }); if (arr.length) { T.lat = arr[0].lat; T.lng = arr[0].lng; } }
  }
  function useMine() {
    if (!navigator.geolocation) { toast('Location is not supported on this device.'); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      T.lat = pos.coords.latitude; T.lng = pos.coords.longitude; T.pin = false; G.mkUserGeo = { lat: T.lat, lng: T.lng };
      var n = G.NXGeo && G.NXGeo.nearest(T.lat, T.lng), rv = G.NXGeo && G.NXGeo.reverse && G.NXGeo.reverse(T.lat, T.lng);
      T.bb = null;
      if (n && n.d < 120) { T.cc = 'NG'; T.state = n.state; T.lga = n.lga; }
      else if (rv && rv.d < 150 && rv.place.st) { T.cc = rv.place.cc; T.state = rv.place.st; T.lga = ''; }
      else { T.state = ''; T.lga = ''; T.pin = true; }
      if (!T.km) T.km = 25; render(true);
    }, function () { toast('Location is off. Allow location access in your browser settings.'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }
  function toast(m) { try { G.showToast ? G.showToast(m) : alert(m); } catch (e) {} }

  /* ---------- UI ---------- */
  function label() {
    var a = T.pin ? 'Pinned location' : (T.lga ? T.lga + ', ' + T.state : (T.state ? T.state + ', ' + cname(T.cc) : (T.cc ? cname(T.cc) : 'All countries')));
    return a + (T.lat != null && T.km > 0 ? ' · ' + T.km + ' km' : '');
  }
  function paneHTML() {
    if (tab === 'loc') {
      var hasC = T.lat != null, kmTxt = !hasC ? '—' : (T.km > 0 ? T.km + ' km' : (T.lga ? 'Any distance' : 'Whole state'));
      return '<div class="ml-lb">Country</div><button type="button" class="ml-dd' + (T.cc ? ' v' : '') + '" data-a="pcc"><span>' + esc(T.cc ? cname(T.cc) : 'All countries') + '</span><i class="fa-solid fa-chevron-down"></i></button>' +
        '<div class="ml-lb">State / Region</div><button type="button" class="ml-dd' + (T.state ? ' v' : '') + (T.cc ? '' : ' dis') + '" data-a="pst"><span>' + esc(T.pin ? 'Pinned on map' : (T.state || (T.cc ? 'All states' : 'Choose a country first'))) + '</span><i class="fa-solid fa-chevron-down"></i></button>' +
        '<div class="ml-lb">City / Area</div><button type="button" class="ml-dd' + (T.lga ? ' v' : '') + (T.state ? '' : ' dis') + '" data-a="plg"><span>' + esc(T.lga || (T.state ? 'All areas' : 'Choose a state first')) + '</span><i class="fa-solid fa-chevron-down"></i></button>' +
        '<button type="button" class="ml-me" data-a="me"><i class="fa-solid fa-location-crosshairs"></i> Use my location</button>' +
        '<div class="ml-lb">Distance from centre</div><div class="ml-km"><b>' + kmTxt + '</b><span>Any – 100 km</span></div>' +
        '<input type="range" class="ml-rg" min="0" max="100" step="1" value="' + T.km + '"' + (hasC ? '' : ' disabled') + ' data-a="rg">' +
        '<div class="ml-ch">' + [[0, 'Any'], [5, '5 km'], [10, '10 km'], [25, '25 km'], [50, '50 km']].map(function (c) { return '<button type="button" class="' + (T.km === c[0] ? 'on' : '') + '" data-a="km" data-v="' + c[0] + '"' + (hasC ? '' : ' disabled') + '>' + c[1] + '</button>'; }).join('') + '</div>' +
        (hasC ? '' : '<div class="ml-hint">Pick a country, use your location, or tap the map to set a centre.</div>');
    }
    if (tab === 'price') return '<div class="ml-lb">Min price</div><input class="ml-in" type="number" inputmode="decimal" placeholder="0" value="' + esc(T.min) + '" data-a="min"><div class="ml-lb">Max price</div><input class="ml-in" type="number" inputmode="decimal" placeholder="No limit" value="' + esc(T.max) + '" data-a="max">';
    if (tab === 'cond') return '<div class="ml-lb">Condition</div><div class="ml-ch">' + [['', 'Any'], ['New', 'New'], ['Fairly used', 'Fairly used']].map(function (c) { return '<button type="button" class="' + (T.cond === c[0] ? 'on' : '') + '" data-a="cond" data-v="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'seller') return '<div class="ml-lb">Seller type</div><div class="ml-ch">' + [['', 'Any'], ['verified', 'Verified'], ['enterprise', 'Enterprise']].map(function (c) { return '<button type="button" class="' + (T.seller === c[0] ? 'on' : '') + '" data-a="seller" data-v="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
    return '<div class="ml-lb">Sort by</div><div class="ml-so">' + [['', 'Newest'], ['near', 'Nearest first'], ['low', 'Price: low to high'], ['high', 'Price: high to low']].map(function (c) { return '<button type="button" class="' + ((T.sort || '') === c[0] ? 'on' : '') + (c[0] === 'near' && T.lat == null ? ' dis' : '') + '" data-a="sort" data-v="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
  }
  function render(fit) {
    if (!root) return;
    root.querySelector('.ml-pane').innerHTML = paneHTML();
    root.querySelectorAll('.ml-rail button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === tab); });
    root.querySelector('.ml-pill').textContent = label();
    paintMap(fit !== false); count();
  }
  function count() {
    var n = filterList(base(), T).length;
    root.querySelector('.ml-n').textContent = n.toLocaleString() + ' result' + (n === 1 ? '' : 's');
    root.querySelector('[data-a="apply"]').textContent = 'Show ' + n.toLocaleString() + ' result' + (n === 1 ? '' : 's');
  }
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function openPop(items, cur, allLabel, cb) {
    closePop();
    pop = document.createElement('div'); pop.className = 'ml-pop';
    pop.innerHTML = '<div class="ml-ps"><i class="fa-solid fa-magnifying-glass"></i><input type="text" placeholder="Search…"></div><div class="ml-pl"></div>';
    root.querySelector('.ml-pane').appendChild(pop);
    var inp = pop.querySelector('input'), lst = pop.querySelector('.ml-pl');
    function paint() {
      var q = nm(inp.value), arr = [['', allLabel]].concat(items.map(function (x) { return typeof x === 'string' ? [x, x] : x; })).filter(function (x) { return !x[0] || !q || nm(x[1]).indexOf(q) > -1; }), more = arr.length > 250;
      lst.innerHTML = arr.slice(0, 250).map(function (x) { return '<button type="button" class="' + (x[0] === cur ? 'on' : '') + '" data-v="' + esc(x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + (more ? '<div class="ml-hint" style="padding:6px 14px">Type to narrow the list…</div>' : '');
    }
    inp.oninput = paint; paint();
    lst.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; closePop(); cb(b.dataset.v); render(true); };
    setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
  }
  function build() {
    root = document.createElement('div'); root.id = 'mk-loc';
    root.innerHTML = '<div class="ml-hd"><button type="button" class="ml-x" data-a="close"><i class="fa-solid fa-xmark"></i></button><b>Location &amp; filters</b><span class="ml-n"></span></div>' +
      '<div class="ml-map"><div class="ml-map-c"></div><div class="ml-pill"></div></div>' +
      '<div class="ml-body"><div class="ml-rail">' + [['loc', 'Location'], ['price', 'Price'], ['cond', 'Condition'], ['seller', 'Seller'], ['sort', 'Sort by']].map(function (t) { return '<button type="button" data-t="' + t[0] + '" data-a="tab">' + t[1] + '</button>'; }).join('') + '</div><div class="ml-pane"></div></div>' +
      '<div class="ml-ft"><button type="button" class="ml-r" data-a="reset">Reset</button><button type="button" class="ml-ap" data-a="apply">Show results</button></div>';
    document.body.appendChild(root);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) { if (pop && !e.target.closest('.ml-pop')) closePop(); return; }
      var a = b.dataset.a, v = b.dataset.v;
      if (a === 'close') close();
      else if (a === 'tab') { tab = b.dataset.t; closePop(); render(false); if (tab === 'seller' && G.__mkc) G.__mkc.load(base()).then(function () { count(); }); }
      else if (a === 'pcc') openPop(countries(), T.cc, 'All countries', function (c) { setCountry(c); });
      else if (a === 'pst') { if (T.cc) openPop(statesOf(T.cc), T.state, 'All states', function (s) { setState(s); }); }
      else if (a === 'plg') { if (T.state) openPop(areasOf(T.cc, T.state), T.lga, 'All areas', function (n) { setLga(n); }); }
      else if (a === 'me') useMine();
      else if (a === 'km') { T.km = +v; render(true); }
      else if (a === 'cond') { T.cond = v; render(false); }
      else if (a === 'seller') { T.seller = v; render(false); }
      else if (a === 'sort') { if (!b.classList.contains('dis')) { T.sort = v; render(false); } }
      else if (a === 'reset') { T = Object.assign({}, DEF); closePop(); render(true); }
      else if (a === 'apply') { APPLIED = Object.assign({}, T); close(); paintBtn(); if (G.mkRefreshGrid) G.mkRefreshGrid(); }
    });
    root.addEventListener('input', function (e) {
      var a = e.target.dataset.a;
      if (a === 'rg') { T.km = +e.target.value; root.querySelector('.ml-km b').textContent = T.km > 0 ? T.km + ' km' : (T.lga ? 'Any distance' : 'Whole state'); root.querySelectorAll('.ml-ch button').forEach(function (x) { x.classList.toggle('on', +x.dataset.v === T.km); }); root.querySelector('.ml-pill').textContent = label(); clearTimeout(build._t); build._t = setTimeout(function () { paintMap(true); count(); }, 120); }
      else if (a === 'min' || a === 'max') { T[a] = e.target.value; count(); paintMap(false); }
    });
  }
  function paintBtn() { var b = document.getElementById('mkLocBtn'); if (b) b.classList.toggle('on', active(APPLIED)); }
  function close() { closePop(); if (root) root.classList.remove('on'); document.documentElement.classList.remove('ml-lock'); }
  G.mkLocOpen = function () {
    if (!root) build();
    T = Object.assign({}, APPLIED); tab = 'loc';
    root.classList.add('on'); document.documentElement.classList.add('ml-lock');
    var go = function () { render(true); initMap(); };
    if (G.NXGeo && !states().length) G.NXGeo.load().then(go); else go();
    if (G.NXGeo && G.NXGeo.loadPlaces) G.NXGeo.loadPlaces().then(function () { if (root.classList.contains('on')) render(false); });
    if (G.__mkc) G.__mkc.load(base());
  };
  G.mkLocClose = close;
  G.mkLocActive = function () { return active(APPLIED); };
  G.mkLocReset = function () { APPLIED = Object.assign({}, DEF); paintBtn(); if (G.mkRefreshGrid) G.mkRefreshGrid(); };
  setTimeout(paintBtn, 0);
})(window);
