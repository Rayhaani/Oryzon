/* services-chat.js — Services vertical: marketplace-style business chat room, inbox rows and filter buttons.
   Additive: loaded AFTER services.js; nothing in services.js / chat-interior.js is edited.
   Room  : chat-interior.html?with=<other>&svc=1&embed=1&vendor=<provider>  → business room  a~svc~b  (iframe overlay, kept warm)
   Bot   : chat-services.js reads the provider's whole "My Business" page (RTDB providers/<username>). */
(function () {
  'use strict';
  if (window.__svcChatLoaded) return; window.__svcChatLoaded = true;
  var me = function () { return localStorage.getItem('nexus_user_session') || ''; };
  var enc = encodeURIComponent;
  var chatURL = function (w, v) { return 'chat-interior.html?with=' + enc(w) + '&svc=1&embed=1&vendor=' + enc(v); };
  var cur = null, swallow = false, warm = new Map();
  var key = function (u) { return u; };

  /* ── overlay (same mechanism as the marketplace: warm iframe, kept alive, instant re-entry) ── */
  function go(ov) { ov.__go = true; try { var f = ov.querySelector('iframe'); f && f.contentWindow && f.contentWindow.postMessage({ nxMkChat: 'go' }, location.origin); } catch (e) {} }
  function build(url, label, hidden) {
    var ov = document.createElement('div'); ov.id = 'svc-chat-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:20000;background:#050505;' + (hidden ? 'visibility:hidden;pointer-events:none;' : '');
    var nm = String(label || '').replace(/[<>&"]/g, '');
    ov.innerHTML = '<div class="svc-sk" style="position:absolute;inset:0;z-index:2;background:#050505;transition:opacity .18s"><div style="display:flex;align-items:center;gap:14px;padding:calc(env(safe-area-inset-top,0px) + 14px) 14px 14px">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="cursor:pointer" data-svc-back><path d="M11 17l-5-5 5-5M18 12H6"/></svg>' +
      '<div style="width:42px;height:42px;border-radius:50%;background:#262626"></div>' +
      '<div style="font:700 16px -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#fff;text-transform:capitalize">' + nm + '</div></div></div>' +
      '<iframe title="Chat" style="position:absolute;inset:0;width:100%;height:100%;border:0;background:#050505" allow="microphone;camera;clipboard-write"></iframe>';
    var fr = ov.querySelector('iframe'), sk = ov.querySelector('.svc-sk');
    fr.addEventListener('load', function () { if (ov.__go) go(ov); setTimeout(function () { sk.style.opacity = '0'; setTimeout(function () { sk.remove(); }, 200); }, 120); });
    ov.querySelector('[data-svc-back]').onclick = function () { close(true); };
    fr.src = url; document.body.appendChild(ov);
    return { url: url, ov: ov, depth: 0 };
  }
  function keep(c) {
    warm.set(key(c.url), c);
    while (warm.size > 3) { var k = warm.keys().next().value, o = warm.get(k); warm.delete(k); if (o === cur) { warm.set(k, o); continue; } try { o.ov.remove(); } catch (e) {} }
  }
  function prewarmChat(w, v) {
    try { if (!me() || !w || w === me()) return; var u = chatURL(w, v); if (warm.has(key(u)) || (cur && cur.open)) return; keep(build(u, w, true)); } catch (e) {}
  }
  /* first-visit welcome — identical to the marketplace one */
function svcWelcome(vendor, onDone) {
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
  function openChat(w, v) {
    var m = me();
    if (!m) { window.location.href = 'login.html'; return; }
    if (!w || String(w).toLowerCase() === m.toLowerCase()) return;
    var u = chatURL(w, v || w);
    cur = warm.get(key(u)) || null;
    if (!cur) { cur = build(u, w, false); keep(cur); }
    else { cur.ov.style.visibility = ''; cur.ov.style.pointerEvents = ''; }
    cur.open = true;
    try { cur.ov.querySelector('iframe').contentWindow.postMessage({ nxMkShow: 1 }, location.origin); } catch (e) {}
    var c0 = cur, wk = 'nx_welcomed_svc_' + m + '_' + w;
    try {
      if (String(v || w) === String(w) && !localStorage.getItem(wk)) { localStorage.setItem(wk, '1'); svcWelcome(w, function () { go(c0.ov); }); }
      else go(cur.ov);
    } catch (e) { go(cur.ov); }
    try { history.pushState({ svcChat: 1 }, '', location.href); cur.pushed = true; } catch (e) {}
    document.body.style.overflow = 'hidden';
  }
  function repaint() { try { var x = X(), t = x.inbox().tab; if (t) x.render(t); } catch (e) {} }
  function close(viaUI) {
    var c = cur; if (!c) return; cur = null; c.open = false;
    try { c.ov.querySelector('iframe').contentWindow.postMessage({ nxMkHide: 1 }, location.origin); } catch (e) {}
    c.ov.style.visibility = 'hidden'; c.ov.style.pointerEvents = 'none';
    if (!document.documentElement.classList.contains('np-lock')) document.body.style.overflow = '';
    if (viaUI && c.pushed) { swallow = true; try { history.back(); } catch (e) { swallow = false; } }
    setTimeout(repaint, 60);
  }
  (function () {
    var NO = window.NexusOverlay = window.NexusOverlay || {};
    if (NO.__svcWrapped) return; NO.__svcWrapped = true; var prev = NO.isOpen;
    NO.isOpen = function () { if ((cur && cur.open) || swallow) return true; return typeof prev === 'function' ? prev.apply(NO, arguments) : false; };
  })();
  window.addEventListener('popstate', function (e) {
    if (swallow) { swallow = false; e.stopImmediatePropagation(); return; }
    if (cur && cur.open) {
      e.stopImmediatePropagation();
      if (cur.depth > 0) {                       // an inner screen (photo caption / viewer / gallery) is open: Back closes only that
        try { history.pushState({ svcChat: 1 }, '', location.href); } catch (er) {}
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
  setInterval(function () { if (warm.size && !document.getElementById('post-service-btn-label')) { warm.forEach(function (x) { try { x.ov.remove(); } catch (e) {} }); warm.clear(); cur = null; } }, 3000);
  /* cold load of chat-interior is the slow part (20 s on a weak phone): put all its files in the browser cache while the browser is idle, so the first room opens fast too */
  (function () {
    var go = function () {
      if (!me() || window.__svcChatCached) return; window.__svcChatCached = 1;
      fetch('chat-interior.html').then(function (r) { return r.text(); }).then(function (h) {
        var d = new DOMParser().parseFromString(h, 'text/html'), seen = {};
        d.querySelectorAll('script[src],link[rel="stylesheet"][href]').forEach(function (n) {
          var u = n.getAttribute('src') || n.getAttribute('href'); if (!u || seen[u]) return; seen[u] = 1;
          var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u; if (n.tagName === 'SCRIPT') l.as = 'script'; else l.as = 'style'; document.head.appendChild(l);
        });
      }).catch(function () {});
    };
    if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 6000 }); else setTimeout(go, 4000);
  })();
  window.svcChatOpen = openChat; window.svcChatPrewarm = prewarmChat;

  /* ── every chat entry point of the Services vertical opens the business room ── */
  var origInboxOpen = window.inboxOpenChat;
  window.inboxOpenChat = function (u) {
    try {
      var q = new URL(u, location.href).searchParams, w, v;
      if (q.get('admin') === '1') { w = q.get('customer'); v = q.get('vendorId') || me(); } else { w = q.get('with'); v = w; }
      if (w && me() && w !== me()) { openChat(w, v); return false; }
    } catch (e) {}
    return origInboxOpen ? origInboxOpen(u) : false;
  };
  var X = function () { return window.__svcCtx || null; };
  function curPro() {                                         // the provider whose profile is open
    var id = window.__svcProId || null;
    try { var x = X(); id = id || (x && x.pro()); } catch (e) {}
    if (!id) { try { var el = document.getElementById('profile-expert-name'), nm = el && (el.innerText || el.textContent || '').trim(), p = nm && X().pros().find(function (q) { return String(q.name).trim() === nm; }); if (p) id = p.id; } catch (e) {} }
    return id ? String(id) : null;
  }
  (function () {                                             // outermost wrapper: remember which provider's profile was opened last
    var o = window.openProfileSheet;
    if (typeof o === 'function' && !o.__svc) { window.openProfileSheet = function (id) { window.__svcProId = id; var r = o.apply(this, arguments); setTimeout(function () { prewarmChat(String(id), String(id)); }, 350); return r; };  /* the chat room warms up while the profile is being read */ window.openProfileSheet.__svc = 1; }
  })();
  window.openSecureChat = function () {                      // "Chat" button on a provider's profile
    var u = me();
    if (!u) { try { showGlobalToast('⚠️ Please login first to start a chat!'); } catch (e) {} setTimeout(function () { window.location.href = 'login.html'; }, 1500); return; }
    var pid = curPro();
    if (!pid) { try { showGlobalToast('⚠️ Could not identify provider! (svc)'); } catch (e) {} try { console.warn('svc: provider id missing', typeof currentProfileProId !== 'undefined' ? currentProfileProId : 'n/a', window.__svcProId); } catch (e) {} return; }
    openChat(String(pid), String(pid));
  };
  window.emergencyContactPro = function (proUid) {           // emergency "Contact Pro" → business room too
    var u = me();
    if (!u) { try { showGlobalToast('⚠️ Please login first!'); } catch (e) {} setTimeout(function () { window.location.href = 'login.html'; }, 1500); return; }
    try { var sh = document.getElementById('emergency-sheet-overlay'); if (sh) sh.style.display = 'none'; } catch (e) {}
    if (proUid) openChat(String(proUid), String(proUid));
  };
  window.submitHireChatFirst = function () {                 // "Chat first" in the hire sheet
    var u = me();
    if (!u) { try { showGlobalToast('⚠️ Please login first to start a chat!'); } catch (e) {} setTimeout(function () { window.location.href = 'login.html'; }, 1500); return; }
    try { closeHireSheet(); } catch (e) {}
    var pid = null; try { pid = X().hire().proId; } catch (e) {} pid = pid || curPro();
    if (pid) openChat(String(pid), String(pid));
  };

  /* ── Business Chat inbox: business rooms (personalChats ~svc~) next to the old threads ── */
  var rooms = { buying: [], selling: [] }, names = {}, started = false;
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function nameFor(kind, id, t) {
    if (names[id]) { t.displayName = names[id].n; t.avatarUrl = names[id].a; return; }
    t.displayName = cap(id); t.avatarUrl = null;
    var d; try { d = firebase.firestore(); } catch (e) { return; }
    var p = null; try { p = kind === 'buying' ? X().pros().find(function (x) { return String(x.id) === String(id); }) : null; } catch (e) {}
    if (p && p.name) { names[id] = { n: p.name, a: null }; t.displayName = p.name; return; }
    names[id] = { n: cap(id), a: null };
    d.collection('users').doc(id).get().then(function (u) {
      if (!u.exists) return; var x = u.data(), fn = x.fullName || x.name || x.username;
      names[id] = { n: fn ? String(fn).split(' ').map(cap).join(' ') : cap(id), a: x.userProfilePic || null };
      repaint();
    }).catch(function () {});
  }
  function startRooms() {
    if (started || !me()) return; started = true;
    inboxWaitForAuth().then(function () {
      var u = me();
      firebase.firestore().collection('personalChats').where('members', 'array-contains', u).onSnapshot(function (snap) {
        var b = [], s = [];
        snap.forEach(function (doc) {
          var x = doc.data();
          if (String(doc.id).indexOf('~svc~') < 0 || x.source !== 'services' || !x.marketVendor || !x.marketBuyer || x.marketVendor === x.marketBuyer || !x.lastMessageTime) return;
          var buyer = x.marketBuyer === u, other = buyer ? x.marketVendor : x.marketBuyer;
          var t = { chatDocId: doc.id, vendorId: x.marketVendor, customerId: x.marketBuyer, otherId: other, source: 'services', _svc: true,
            lastActive: +x.lastMessageTime || 0, lastText: x.lastMessage || '', botActive: x.botActive,
            lastMsg: { type: 'text', text: x.lastMessage || '', caption: x.lastMessage || '', role: x.lastSenderId === x.marketBuyer ? 'mine' : 'theirs' } };
          nameFor(buyer ? 'buying' : 'selling', other, t);
          if (buyer) b.push(t); else s.push(t);
        });
        rooms.buying = b; rooms.selling = s;
        s.concat(b).slice(0, 3).forEach(function (t, i) { setTimeout(function () { prewarmChat(t.otherId, t.vendorId); }, 400 + i * 700); });
        try {
          var ib = X().inbox();
          if (!ib.picked && ib.tab === 'buying' && s.length && !ib.sellingLen) { X().order(true); window.inboxSwitchMainTab('selling', true); }
        } catch (e) {}
        repaint();
      }, function (e) { console.warn('Services rooms listener:', e && (e.code || e.message)); });
    });
  }
  var origOpenInbox = window.openInboxOverlay;
  window.openInboxOverlay = function () { startRooms(); return origOpenInbox ? origOpenInbox.apply(this, arguments) : undefined; };
  if (me()) setTimeout(startRooms, 1500);

  /* services.js calls this from renderInboxList: business rooms first, old threads of the same person dropped */
  window.svcInboxMerge = function (tab, legacy) {
    var mine = rooms[tab] || [], taken = {}; mine.forEach(function (t) { taken[t.otherId] = 1; });
    var all = mine.concat((legacy || []).filter(function (t) { return !taken[t.otherId]; })).sort(function (a, b) { return (b.lastActive || 0) - (a.lastActive || 0); });
    all.slice(0, 2).forEach(function (t, i) { setTimeout(function () { prewarmChat(t.otherId, tab === 'selling' ? me() : t.otherId); }, 300 + i * 600); });
    return all;
  };

  /* ── Tools tab (Services): a provider sees the performance numbers; everyone else sees "Offer a service" only ── */
  var prevTools = window.nxInboxToolsData, onSvc = function () { return !!document.getElementById('post-service-btn-label'); };
  window.nxInboxToolsData = async function () {
    if (!onSvc() && prevTools) return prevTools.apply(this, arguments);
    var u = me(), out = { seller: false, chats: 0, views: null, orders: null };
    if (!u) return out;
    try { await inboxWaitForAuth(); } catch (e) {}
    try { var c = await firebase.database().ref('providers/' + u + '/category').once('value'); if (c.exists()) out.seller = true; } catch (e) {}
    var since = Date.now() - 7 * 86400000;
    try {
      var sn = await firebase.firestore().collection('vendorChats').where('vendorId', '==', u).get();
      sn.forEach(function (d) { var t = d.data().lastActive; t = t && t.toMillis ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : +t || 0); if (t >= since) out.chats++; });
    } catch (e) {}
    out.chats += (rooms.selling || []).filter(function (t) { return t.lastActive >= since; }).length;
    return out;
  };
  function relabel() {
    if (!onSvc()) return;
    var t = document.querySelector('#biz-tools-pane .biz-start-title'), s = document.querySelector('#biz-tools-pane .biz-start-sub');
    if (t) t.textContent = 'Offer your services';
    if (s) s.textContent = 'Get hired by customers near you, take bookings and manage every chat from one place.';
  }
  if (window.NXShared && NXShared.inboxToolsTab && !NXShared.inboxToolsTab.__svc) { var oT = NXShared.inboxToolsTab; NXShared.inboxToolsTab = function () { var r = oT.apply(this, arguments); relabel(); return r; }; NXShared.inboxToolsTab.__svc = 1; }
  setInterval(relabel, 1500);
  document.addEventListener('click', function (e) {          // "Offer a service" → the post-service flow, right here (no page reload)
    var a = onSvc() && e.target.closest && e.target.closest('#biz-tools-pane .biz-start-btn-alt'); if (!a) return;
    e.preventDefault(); e.stopPropagation();
    try { closeInboxOverlay(); } catch (er) {}
    setTimeout(function () { try { handlePostServiceBtnClick(); } catch (er) {} }, 120);
  }, true);

  /* ── filter buttons = the exact Report / Chat / Follow buttons (same as the marketplace) ── */
  function skin() {
    var sf = document.getElementById('inbox-selling-subfilters'); if (!sf) return;
    if (!sf.classList.contains('nx-actions')) sf.classList.add('nx-actions');
    sf.querySelectorAll('.inbox-subfilter-pill').forEach(function (p) { if (!p.classList.contains('btn-slim')) { p.classList.add('btn-slim'); p.classList.toggle('btn-gold', p.classList.contains('active')); } });
  }
  /* the overlay is (re)built lazily / after SPA swaps: re-skin whenever fresh pills appear */
  try { new MutationObserver(function () { var sf = document.getElementById('inbox-selling-subfilters'); if (sf && (!sf.classList.contains('nx-actions') || sf.querySelector('.inbox-subfilter-pill:not(.btn-slim)'))) skin(); }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  var st = document.createElement('style');
  st.textContent =
    '#inbox-selling-subfilters.nx-actions{background:none!important;box-shadow:none!important;border:0!important;gap:12px!important;padding:14px 12px 6px!important}' +
    '#inbox-selling-subfilters.nx-actions .btn-slim{flex:0 0 auto;height:34px;padding:0 14px!important;font-size:12.5px!important}' +
    '#inbox-selling-subfilters.nx-actions .btn-slim.active:not(.btn-gold){background:#121212!important}' +
    /* Services Tools card: only "Offer a service" (primary look) */
    '#page-content:has(#post-service-btn-label) #biz-tools-pane .biz-start-btn:not(.biz-start-btn-alt){display:none!important}' +
    '#page-content:has(#post-service-btn-label) #biz-tools-pane .biz-start-btn-alt{margin-top:0!important;background:linear-gradient(135deg,#fde08d,#ff2d92)!important;border:none!important;color:#111827!important}';
  document.head.appendChild(st);
  var origSub = window.inboxSwitchSubFilter;
  window.inboxSwitchSubFilter = function (f, el) {
    if (origSub) origSub(f, el);
    document.querySelectorAll('#inbox-selling-subfilters .inbox-subfilter-pill').forEach(function (p) { p.classList.remove('btn-gold'); });
    if (el) el.classList.add('btn-gold');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', skin); else skin();
  setTimeout(skin, 800);
})();
