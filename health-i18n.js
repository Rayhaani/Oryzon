/* ============================================================
   health-i18n.js — translation layer for Nexus Medical City (additive; load AFTER health-reach.js).
   It does NOT edit any existing file. It reads the English text the page draws (static HTML and text drawn later by JS),
   looks it up in a language pack, and swaps it. Anything without a translation stays in English.

   Languages: English plus every pack file that exists (health-i18n-<code>.js). There is NO picker here: the home page list is the only picker.
   The language is read from nexusHomeLang (the key the home page saves to) and copied to nexusReachLang for health-reach.js / health-care.js.
   Arabic turns the health page right-to-left (the page container only; layout mirroring is partial, see notes).

   HOW TO FINISH THE JOB PROFESSIONALLY
   1. Use the app in a language, open every screen.   2. In the console run  nxI18n.dump()  : it lists every English text that had no translation.
   3. Send that list to the translator; add the answers to the pack as  "English text": "Translation".   Patterns with numbers use {0}, {1}.
   Safety-critical packs must be signed off by a clinician who speaks the language before HA_REVIEWED-style notices are removed.
   ============================================================ */
(function () {
  'use strict';
  if (window.nxI18n) return;
  var LS_R = 'nexusReachLang', LS_H = 'nexusHomeLang', LS_M = 'nexusI18nMissing';
  var NAMES = { en: 'English', ha: 'Hausa', fr: 'Français', sw: 'Kiswahili', es: 'Español', pt: 'Português', ar: 'العربية' };
  var AVAILABLE = ['en', 'ha'];   // add a code here when its health-i18n-<code>.js file is delivered (fr, sw, es, pt, ar are next)
  var RTL = { ar: 1 };
  var EXCLUDE = 'script,style,textarea,code,pre,svg,noscript,input,option,[translate="no"],.notranslate,#aiChatLog,[data-nx-noi18n]';
  var lsGet = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  var scriptBase = (function () { try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[^\/]*$/, ''); } catch (e) {} return ''; })();
  var switching = false, PACKS = {}, pending = {}, cur = 'en', dict = {}, pats = [], missing = {}, rtlSet = false, busy = false, obs = null, raf = 0;
  var norm = function (s) { return String(s).replace(/\s+/g, ' ').trim(); };
  var hasLetters = function (s) { return /[A-Za-z]{3}/.test(s); };
  var isHealth = function () { return !!(document.getElementById('nxhTypingHost') || document.getElementById('aiTriageOverlay')); };
  var root = function () { return document.getElementById('page-content') || document.body; };

  function buildDict(l) {
    dict = {}; pats = []; var p = PACKS[l] || {};
    Object.keys(p).forEach(function (k) {
      if (k.indexOf('{') > -1 && /\{\d+\}/.test(k)) { var parts = k.split(/\{\d+\}/), order = (k.match(/\{(\d+)\}/g) || []).map(function (m) { return +m.slice(1, -1); });
        pats.push({ re: new RegExp('^' + parts.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('(.+?)') + '$'), order: order, out: p[k] }); }
      else dict[k] = p[k];
    });
  }
  function lookup(key) {
    if (cur === 'en') return null;
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    for (var i = 0; i < pats.length; i++) { var m = pats[i].re.exec(key); if (m) { var out = pats[i].out; pats[i].order.forEach(function (n, j) { out = out.split('{' + n + '}').join(m[j + 1]); }); return out; } }
    return null;
  }
  function note(key, node) {
    if (cur === 'en' || !hasLetters(key) || key.length > 400) return;
    var el = node && (node.nodeType === 3 ? node.parentElement : node); if (el && el.closest && el.closest('option')) return;
    if (el && el.closest && cur !== 'en' && (cur === 'ha' || cur === 'fr') && el.closest('#nxCareTriage')) return;
    if (!missing[key]) { missing[key] = 1; }
  }

  /* — elements that mix text and <b>/<strong>/<em>: translated as one sentence — */
  function mixedParents(r) {
    var set = [], seen = new Set();
    r.querySelectorAll('b,strong,em').forEach(function (b) { var p = b.parentElement; if (!p || seen.has(p) || p.closest(EXCLUDE)) return; seen.add(p);
      var h = p.innerHTML; var stripped = h.replace(/<\/?(b|strong|em)(\s[^>]*)?>/g, '').replace(/<br\s*\/?>/g, ' ');
      if (/<[a-z]/i.test(stripped)) return; var hasText = Array.prototype.some.call(p.childNodes, function (n) { return n.nodeType === 3 && hasLetters(n.textContent); }); if (hasText) set.push(p); });
    return set;
  }
  function mixedKey(p) { var tags = []; var h = p.innerHTML.replace(/<(b|strong|em)(\s[^>]*)?>/g, function (m, t) { tags.push(m); return '<' + t + '>'; }); return { key: norm(h), tags: tags }; }
  function applyMixed(p) {
    var st = p.__nxM;
    if (st && p.innerHTML === st.out) { if (cur === 'en') { p.innerHTML = st.orig; p.__nxM = null; } else if (st.lang !== cur) { var o = st.origKey; var t2 = lookup(o.key); if (t2 == null) { p.innerHTML = st.orig; p.__nxM = null; } else setMixed(p, st.orig, o, t2); } return; }
    p.__nxM = null; var mk = mixedKey(p); if (cur === 'en') return; var t = lookup(mk.key);
    if (t == null) { note(mk.key, p); return; }
    setMixed(p, p.innerHTML, mk, t);
  }
  function setMixed(p, orig, mk, t) {
    var i = 0, out = t.replace(/<(b|strong|em)>/g, function (m) { var x = mk.tags[i++]; return x || m; });
    p.innerHTML = out; p.__nxM = { orig: orig, out: p.innerHTML, origKey: mk, lang: cur }; p.setAttribute('data-nx-mixed', '1');
  }

  /* — single text nodes — */
  function applyText(n) {
    var st = n.__nxT, now = n.nodeValue;
    if (st && now === st.out) {                                    // we wrote this; re-translate only if the language changed
      if (cur === 'en') { n.nodeValue = st.orig; n.__nxT = null; return; }
      if (st.lang === cur) return; var t0 = lookup(norm(st.orig)); if (t0 == null) { n.nodeValue = st.orig; n.__nxT = null; note(norm(st.orig), n); return; } write(n, st.orig, t0); return;
    }
    n.__nxT = null; if (cur === 'en') return;                      // new or changed by the app: treat as fresh English
    var key = norm(now); if (!hasLetters(key)) return; var t = lookup(key); if (t == null) { note(key, n); return; } write(n, now, t);
  }
  function write(n, orig, t) { var lead = /^\s*/.exec(orig)[0], trail = /\s*$/.exec(orig)[0]; var out = lead + t + trail; n.nodeValue = out; n.__nxT = { orig: orig, out: out, lang: cur }; }

  /* — attributes — */
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  function applyAttrs(r) {
    r.querySelectorAll('[placeholder],[aria-label],[title],[alt]').forEach(function (el) { if (el.closest(EXCLUDE.replace(',input', ''))) return;
      ATTRS.forEach(function (a) { var v = el.getAttribute(a); if (v == null) return; var st = el['__nxA_' + a];
        if (st && v === st.out) { if (cur === 'en') { el.setAttribute(a, st.orig); el['__nxA_' + a] = null; } else if (st.lang !== cur) { var t1 = lookup('@' + a + ':' + norm(st.orig)); if (t1 == null) { el.setAttribute(a, st.orig); el['__nxA_' + a] = null; } else { el.setAttribute(a, t1); el['__nxA_' + a] = { orig: st.orig, out: t1, lang: cur }; } } return; }
        el['__nxA_' + a] = null; if (cur === 'en' || !hasLetters(v)) return; var k = '@' + a + ':' + norm(v), t = lookup(k); if (t == null) { note(k, el); return; } el.setAttribute(a, t); el['__nxA_' + a] = { orig: v, out: t, lang: cur }; });
    });
  }

  function direction(on) {
    var r = document.getElementById('page-content'); if (!r) return;
    if (on && RTL[cur]) { r.setAttribute('dir', 'rtl'); r.setAttribute('lang', cur); rtlSet = true; }
    else if (rtlSet || r.getAttribute('data-nx-i18n')) { r.removeAttribute('dir'); r.removeAttribute('lang'); rtlSet = false; }
    if (on && cur !== 'en') { r.setAttribute('data-nx-i18n', cur); if (!RTL[cur]) r.setAttribute('lang', cur); } else r.removeAttribute('data-nx-i18n');
  }

  function sweep() {
    raf = 0; if (busy) return; busy = true;
    try {
      var h = lsGet(LS_H, ''); if (h && h !== cur && AVAILABLE.indexOf(h) > -1 && !switching) { switching = true; api.setLang(h).then(function () { switching = false; }, function () { switching = false; }); busy = false; return; }
      var health = isHealth(); direction(health);
      if (health) {
        var r = root(); mixedParents(r).forEach(applyMixed);
        var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { var p = n.parentElement; if (!p || p.closest(EXCLUDE) || p.closest('[data-nx-mixed]')) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; } });
        var nodes = [], n; while ((n = w.nextNode())) nodes.push(n); nodes.forEach(applyText);
        applyAttrs(r);
      }
    } catch (e) { try { console.warn('[nxI18n]', e); } catch (x) {} }
    if (obs) obs.takeRecords(); busy = false;
  }
  var queue = function () { if (!raf && !busy) raf = (window.requestAnimationFrame || setTimeout)(sweep); };

  function activate(l) { cur = l; buildDict(l); lsSet(LS_R, l); lsSet(LS_H, l); queue(); try { window.dispatchEvent(new CustomEvent('nxlangchange', { detail: { lang: l } })); } catch (e) {} }
  function loadPack(l) {
    if (PACKS[l] || l === 'en') return Promise.resolve();
    if (pending[l]) return pending[l];
    pending[l] = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = scriptBase + 'health-i18n-' + l + '.js'; s.onload = res; s.onerror = function () { rej(new Error('pack')); }; document.head.appendChild(s); });
    pending[l].catch(function () { pending[l] = null; }); return pending[l];
  }

  var api = window.nxI18n = {
    names: NAMES, available: function () { return AVAILABLE.slice(); }, lang: function () { return cur; },
    register: function (l, pack) { PACKS[l] = Object.assign(PACKS[l] || {}, pack); if (l === cur) { buildDict(l); queue(); } },
    setLang: function (l) { if (AVAILABLE.indexOf(l) < 0) l = 'en'; return loadPack(l).then(function () { activate(l); }, function () { activate('en'); try { window.showToast('Language file could not be loaded. Check your connection.'); } catch (e) {} }); },
    t: function (en) { var r = lookup(norm(en)); return r == null ? en : r; },
    missing: function () { return Object.keys(missing); },
    dump: function () { var out = JSON.stringify({ lang: cur, missing: Object.keys(missing) }, null, 1); lsSet(LS_M, out.slice(0, 200000)); try { console.log(out); } catch (e) {} try { navigator.clipboard && navigator.clipboard.writeText(out); } catch (e) {} return out; },
    refresh: queue
  };

  /* start: remembered language (reach key first, then the home page key) */
  var saved = lsGet(LS_H, '') || 'en'; if (AVAILABLE.indexOf(saved) < 0) saved = 'en';
  window.addEventListener('storage', function (e) { if (e.key === LS_H) queue(); });
  try { obs = new MutationObserver(function () { if (!busy) queue(); }); obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title', 'alt'] }); } catch (e) {}
  if (saved !== 'en') loadPack(saved).then(function () { activate(saved); }, function () { activate('en'); }); else { activate('en'); }
})();
