/* nx-geo.js — shared location helpers (Nigerian states + 774 LGAs from data/ng-lgas.json).
   Used by the marketplace for: Sell (State/LGA pickers), Near me, Near-you recommendations, nearest-first search. */
(function (G) {
  'use strict';
  var NXGeo = G.NXGeo = {}, DATA = null, P = null;
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(local government area|local government|lga|state|council|area|district)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim(); }
  NXGeo.norm = norm;
  NXGeo.load = function () {
    if (DATA) return Promise.resolve(DATA);
    if (P) return P;
    var url; try { url = new URL('data/ng-lgas.json', document.baseURI).href; } catch (e) { url = 'data/ng-lgas.json'; }
    P = fetch(url, { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { DATA = (j && (j.states || j)) || null; return DATA; }).catch(function () { P = null; return null; });
    return P;
  };
  NXGeo.states = function () { return DATA ? Object.keys(DATA).sort() : []; };
  NXGeo.lgas = function (state) { return (DATA && DATA[state]) || []; };          // [[name, lat, lng], …]
  NXGeo.lga = function (state, name) { return NXGeo.lgas(state).filter(function (l) { return l[0] === name; })[0] || null; };
  NXGeo.km = function (a, b, c, d) {
    var R = 6371, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };
  NXGeo.nearest = function (lat, lng) {            // closest LGA to a GPS point → {state,lga,lat,lng,d}
    if (!DATA) return null; var best = null;
    Object.keys(DATA).forEach(function (st) { DATA[st].forEach(function (l) { var d = NXGeo.km(lat, lng, l[1], l[2]); if (!best || d < best.d) best = { state: st, lga: l[0], lat: l[1], lng: l[2], d: d }; }); });
    return best;
  };
  /* free-text location ("Nassarawa, Kano" / "Ungogo" / "Kano") → {lat,lng} using the LGA table (needs NXGeo.load() done) */
  NXGeo.fromText = function (text) {
    if (!DATA || !text) return null;
    var parts = String(text).split(/[,\-\/|]/).map(norm).filter(Boolean), stateHit = null, lgaHit = null;
    Object.keys(DATA).forEach(function (st) { var n = norm(st); if (n === 'federal capital territory') n = 'fct'; if (parts.indexOf(n) > -1 || (n === 'fct' && parts.indexOf('abuja') > -1)) stateHit = st; });
    parts.forEach(function (p) {
      Object.keys(DATA).forEach(function (st) {
        if (stateHit && st !== stateHit) return;
        DATA[st].forEach(function (l) { if (norm(l[0]) === p && (!lgaHit || st === stateHit)) lgaHit = { lat: l[1], lng: l[2] }; });
      });
    });
    if (lgaHit) return lgaHit;
    if (stateHit) { var L = DATA[stateHit], s = L.reduce(function (a, l) { return [a[0] + l[1], a[1] + l[2]]; }, [0, 0]); return { lat: s[0] / L.length, lng: s[1] / L.length }; }
    return null;
  };

  /* ───────── Global places search (GeoNames cities + Nigerian LGAs) — data/places.json, lazy-loaded ───────── */
  var PL = null, PP = null, IDX = null;
  var REGION = null; try { REGION = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) {}
  NXGeo.ready = function () { return !!IDX; };
  NXGeo.countryName = function (cc) { try { return (REGION && REGION.of(cc)) || cc; } catch (e) { return cc; } };
  NXGeo.loadPlaces = function () {
    if (IDX) return Promise.resolve(IDX);
    if (PP) return PP;
    var url; try { url = new URL('data/places.json', document.baseURI).href; } catch (e) { url = 'data/places.json'; }
    PP = fetch(url, { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
      var arr = [];
      Object.keys(j.c).forEach(function (cc) { var regs = j.r[cc] || []; j.c[cc].forEach(function (x) { arr.push({ n: x[0], k: norm(x[0]), cc: cc, st: regs[x[1]] || '', lat: x[2], lng: x[3], lga: x[4] === 1 }); }); });
      IDX = arr; return IDX;
    }).catch(function () { PP = null; return null; });
    return PP;
  };
  NXGeo.placeLabel = function (p) { return [p.n, p.st && p.st !== p.n ? p.st : '', NXGeo.countryName(p.cc)].filter(Boolean).join(', '); };
  /* search(query, {cc: preferred country code, near:[lat,lng]}) → up to 8 places, best first */
  NXGeo.search = function (q, o) {
    o = o || {}; if (!IDX) return [];
    var nq = norm(q).replace(/\s+/g, ' '); if (nq.length < 2) return [];
    var first = nq.split(' ')[0], res = [];
    for (var i = 0; i < IDX.length; i++) {
      var p = IDX[i], k = p.k, sc = -1;
      if (k === nq) sc = 100; else if (k.indexOf(nq) === 0) sc = 70; else if (k.indexOf(' ' + nq) > -1) sc = 40; else if (nq.length >= 4 && k.indexOf(first) === 0) sc = 20;
      if (sc < 0) continue;
      if (o.cc && p.cc === o.cc) sc += 25;
      if (o.near) { var d = NXGeo.km(o.near[0], o.near[1], p.lat, p.lng); sc += Math.max(0, 30 - d / 40); }
      if (p.lga) sc += 4;
      res.push([sc - k.length * 0.05, p]);
    }
    res.sort(function (a, b) { return b[0] - a[0]; });
    var out = [], seen = {};
    for (var j = 0; j < res.length && out.length < 8; j++) { var p2 = res[j][1], key = p2.cc + '|' + p2.st + '|' + p2.k; if (seen[key]) continue; seen[key] = 1; out.push(p2); }
    return out;
  };
  /* GPS point → nearest known place (works worldwide, fully offline) */
  NXGeo.reverse = function (lat, lng) {
    if (!IDX) return null; var best = null, bd = 1e9;
    for (var i = 0; i < IDX.length; i++) { var p = IDX[i], dl = p.lat - lat, dg = (p.lng - lng) * Math.cos(lat * Math.PI / 180), d = dl * dl + dg * dg; if (d < bd && !p.lga) { bd = d; best = p; } }
    return best ? { place: best, d: NXGeo.km(lat, lng, best.lat, best.lng) } : null;
  };
  /* free text ("Kano", "London, UK") → {lat,lng} via the global index; used when a product has no coordinates */
  NXGeo.fromTextGlobal = function (text) {
    if (!IDX || !text) return null; var parts = String(text).split(/[,\-\/|]/).map(norm).filter(Boolean); if (!parts.length) return null;
    var r = NXGeo.search(parts[0], {}); return r.length ? { lat: r[0].lat, lng: r[0].lng } : null;
  };
  NXGeo.load();
})(window);
