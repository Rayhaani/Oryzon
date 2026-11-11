/* nx-chat-room.js — ONE shared business-chat-room engine (warm iframe overlay, virtual history, first-visit welcome, prefetch).
   Usage: var room = NxChatRoom.create({ id, z, url(w,v,pid), alive(), welcomeKey(me,w), onClose() });  room.open(w,v,pid) / room.prewarm(w,v,pid) / room.close()
   Any page (Services today, Marketplace next) mounts it with its own tiny config — a fix here fixes every vertical. */
(function () {
  'use strict';
  if (window.NxChatRoom) return;
  var me = function () { return localStorage.getItem('nexus_user_session') || ''; };
  window.NxChatRoom = { create: function (cfg) {
  var cur = null, swallow = false, warm = new Map();
  var key = cfg.key || function (u) { return u; };   /* room identity (marketplace: url without &product=) */

  /* ── overlay (same mechanism as the marketplace: warm iframe, kept alive, instant re-entry) ── */
  function go(ov) { ov.__go = true; try { var f = ov.querySelector('iframe'); f && f.contentWindow && f.contentWindow.postMessage({ nxMkChat: 'go' }, location.origin); } catch (e) {} }
  function build(url, label, hidden) {
    var ov = document.createElement('div'); ov.id = cfg.id;
    ov.style.cssText = 'position:fixed;inset:0;z-index:' + (cfg.z || 20000) + ';background:#050505;' + (hidden ? 'visibility:hidden;pointer-events:none;' : '');
    var nm = String(label || '').replace(/[<>&"]/g, '');
    ov.innerHTML = '<div class="nxr-sk" style="position:absolute;inset:0;z-index:2;background:#050505;transition:opacity .18s"><div style="display:flex;align-items:center;gap:14px;padding:calc(env(safe-area-inset-top,0px) + 14px) 14px 14px">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="cursor:pointer" data-nxr-back><path d="M11 17l-5-5 5-5M18 12H6"/></svg>' +
      '<div style="width:42px;height:42px;border-radius:50%;background:#262626"></div>' +
      '<div style="font:700 16px -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#fff;text-transform:capitalize">' + nm + '</div></div></div>' +
      '<iframe title="Chat" style="position:absolute;inset:0;width:100%;height:100%;border:0;background:#050505" allow="microphone;camera;clipboard-write"></iframe>';
    var fr = ov.querySelector('iframe'), sk = ov.querySelector('.nxr-sk');
    fr.addEventListener('load', function () { if (ov.__go) go(ov); setTimeout(function () { sk.style.opacity = '0'; setTimeout(function () { sk.remove(); }, 200); }, 120); });
    ov.querySelector('[data-nxr-back]').onclick = function () { close(true); };
    fr.src = url; document.body.appendChild(ov);
    return { url: url, ov: ov, depth: 0 };
  }
  function keep(c) {
    warm.set(key(c.url), c);
    while (warm.size > 3) { var k = warm.keys().next().value, o = warm.get(k); warm.delete(k); if (o === cur) { warm.set(k, o); continue; } try { o.ov.remove(); } catch (e) {} }
  }
  function prewarmChat(w, v, pid) {
    try { if (!me() || !w || String(w).toLowerCase() === me().toLowerCase()) return; var u = cfg.url(w, v, pid); if (warm.has(key(u)) || (cur && cur.open)) return; keep(build(u, w, true)); } catch (e) {}
  }
  /* first-visit welcome — identical to the marketplace one */
function welcome(vendor, onDone) {
    const RTDB = 'https://oryzon-50ea4-default-rtdb.firebaseio.com';
    const el = document.createElement('div'); el.id = 'mk-welcome';
    if (!document.getElementById('mk-welcome-css')) {
        const st = document.createElement('style'); st.id = 'mk-welcome-css';
        st.textContent =
            '#mk-welcome{position:fixed;inset:0;z-index:40100;background:#050505;display:flex;align-items:center;justify-content:center;text-align:center;transition:opacity .35s ease}' +
            '#mk-welcome.out{opacity:0;pointer-events:none}' +
            '#mk-welcome .g{position:absolute;inset:0;background:radial-gradient(circle at 70% 25%,#7a4a1c 0,#2a1a0b 38%,#0a0705 75%)}' +
            '#mk-welcome .gb{position:absolute;left:-13.3%;top:11.1%;width:80%;height:55.5%;border-radius:50% 50% 40% 60%;background:linear-gradient(150deg,#c98f4a,#5a2f12);filter:blur(34px);opacity:.55;animation:mkwB 3.1s ease-out forwards}' +
            '#mk-welcome .gv{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,5,5,.15),rgba(5,5,5,.92) 70%)}' +
            '#mk-welcome .c{position:relative;padding:0 28px;width:100%}' +
            '#mk-welcome .ln{overflow:hidden;line-height:1.12}' +
            '#mk-welcome .ln>div{transform:translateY(110%);opacity:0}' +
            '#mk-welcome .l1>div{font:italic 400 clamp(46px,15vw,64px)/1.12 Georgia,"Times New Roman",serif;color:#fff;animation:mkwUp .7s cubic-bezier(.2,.8,.2,1) .35s forwards}' +
            '#mk-welcome .l2>div{font:700 clamp(26px,8.4vw,36px)/1.2 Georgia,"Times New Roman",serif;background:linear-gradient(135deg,#fde08d,#b8860b);-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:4px;animation:mkwUp .7s cubic-bezier(.2,.8,.2,1) 1.0s forwards}' +
            '#mk-welcome .rule{height:1px;width:120px;margin:22px auto 0;background:#E3C48D;transform:scaleX(0);animation:mkwR .6s ease 1.65s forwards}' +
            '#mk-welcome .tag{margin-top:16px;font:500 12px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#d8d8d8;opacity:0;animation:mkwF .5s ease 1.95s forwards}' +
            '#mk-welcome .sub{margin-top:18px;font:400 13.5px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#8c8c8c;opacity:0;animation:mkwF .5s ease 1.95s forwards}' +
            '@keyframes mkwUp{to{transform:none;opacity:1}}@keyframes mkwR{to{transform:scaleX(1)}}@keyframes mkwF{to{opacity:1}}@keyframes mkwB{to{transform:translate(13.3%,-5.5%)}}';
        document.head.appendChild(st);
    }
    el.innerHTML = '<div class="g"></div><div class="gb"></div><div class="gv"></div><div class="c"><div class="ln l1"><div>Welcome</div></div><div class="ln l2"><div>Glad you\u2019re here.</div></div><div class="rule"></div><div class="sub">Ask us anything \u2014 we reply fast.</div></div>';
    document.body.appendChild(el);
    let done = false;
    const finish = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => { el.remove(); try { onDone && onDone(); } catch (e) {} }, 380); };
    el.addEventListener('click', finish);
    setTimeout(finish, 2750);                                   // ≈3 s in total, then the chat is there
}
  function openChat(w, v, pid) {
    var m = me();
    if (!m) { window.location.href = 'login.html'; return; }
    if (!w || String(w).toLowerCase() === m.toLowerCase()) return;
    var u = cfg.url(w, v || w, pid);
    cur = warm.get(key(u)) || null;
    if (cur && cur.url !== u) { try { cur.ov.remove(); } catch (e) {} warm.delete(key(u)); cur = null; }   /* same room, different product card → fresh iframe */
    if (!cur) { cur = build(u, w, false); keep(cur); }
    else { cur.ov.style.visibility = ''; cur.ov.style.pointerEvents = ''; }
    cur.open = true;
    try { cfg.onOpen && cfg.onOpen(); } catch (e) {}
    try { cur.ov.querySelector('iframe').contentWindow.postMessage({ nxMkShow: 1 }, location.origin); } catch (e) {}
    var c0 = cur, wk = cfg.welcomeKey(m, w);
    try {
      if (String(v || w) === String(w) && !localStorage.getItem(wk)) { localStorage.setItem(wk, '1'); welcome(w, function () { go(c0.ov); }); }
      else go(cur.ov);
    } catch (e) { go(cur.ov); }
    try { history.pushState({ nxRoom: cfg.id }, '', location.href); cur.pushed = true; } catch (e) {}
    document.body.style.overflow = 'hidden';
  }
    function close(viaUI) {
    var c = cur; if (!c) return; cur = null; c.open = false;
    try { c.ov.querySelector('iframe').contentWindow.postMessage({ nxMkHide: 1 }, location.origin); } catch (e) {}
    c.ov.style.visibility = 'hidden'; c.ov.style.pointerEvents = 'none';
    try { cfg.onHide && cfg.onHide(); } catch (e) {}
    if (cfg.canUnlock ? cfg.canUnlock() : !document.documentElement.classList.contains('np-lock')) document.body.style.overflow = '';
    if (viaUI && c.pushed) { swallow = true; try { history.back(); } catch (e) { swallow = false; } }
    setTimeout(function () { try { cfg.onClose && cfg.onClose(); } catch (e) {} }, 60);
  }
  (function () {
    var NO = window.NexusOverlay = window.NexusOverlay || {};
    if (NO['__nxr_' + cfg.id]) return; NO['__nxr_' + cfg.id] = true; var prev = NO.isOpen;
    NO.isOpen = function () { if ((cur && cur.open) || swallow) return true; return typeof prev === 'function' ? prev.apply(NO, arguments) : false; };
  })();
  window.addEventListener('popstate', function (e) {
    if (swallow) { swallow = false; e.stopImmediatePropagation(); return; }
    if (cur && cur.open) {
      e.stopImmediatePropagation();
      if (cur.depth > 0) {                       // an inner screen (photo caption / viewer / gallery) is open: Back closes only that
        try { history.pushState({ nxRoom: cfg.id }, '', location.href); } catch (er) {}
        try { cur.ov.querySelector('iframe').contentWindow.postMessage({ nxMkBack: 1 }, location.origin); } catch (er) {}
        return;
      }
      cur.pushed = false; close(false);
    }
  }, true);
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.nxMkChat === 'close' && cur && cur.open) close(true);
    if (typeof e.data.nxMkDepth === 'number') warm.forEach(function (c) { try { if (c.ov.querySelector('iframe').contentWindow === e.source) c.depth = e.data.nxMkDepth; } catch (er) {} });
  });
  /* leaving Services (SPA navigation) → free the warmed chat iframes so other pages stay fast */
  setInterval(function () { if (warm.size && !cfg.alive()) { warm.forEach(function (x) { try { x.ov.remove(); } catch (e) {} }); warm.clear(); cur = null; } }, 3000);
  /* cold load of chat-interior is the slow part (20 s on a weak phone): put all its files in the browser cache while the browser is idle, so the first room opens fast too */
  (function () {
    var go = function () {
      if (!me() || window.__nxRoomCached) return; window.__nxRoomCached = 1;
      fetch('chat-interior.html', { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (h) {
        var d = new DOMParser().parseFromString(h, 'text/html'), seen = {};
        d.querySelectorAll('script[src],link[rel="stylesheet"][href]').forEach(function (n) {
          var u = n.getAttribute('src') || n.getAttribute('href'); if (!u || seen[u]) return; seen[u] = 1;
          var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u; if (n.tagName === 'SCRIPT') l.as = 'script'; else l.as = 'style'; document.head.appendChild(l);
        });
      }).catch(function () {});
    };
    if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 6000 }); else setTimeout(go, 4000);
  })();
  return { open: openChat, prewarm: prewarmChat, close: close, isOpen: function () { return !!(cur && cur.open); } };
  } };
})();
