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
  if (!window.NxChatRoom) { try { var x = new XMLHttpRequest(); x.open('GET', 'nx-chat-room.js', false); x.send(); if (x.status === 200) (0, eval)(x.responseText); } catch (e) {} }
  var room = NxChatRoom.create({
    id: 'svc-chat-ov', z: 20000,
    url: function (w, v) { return chatURL(w, v); },
    alive: function () { return !!document.getElementById('post-service-btn-label'); },
    welcomeKey: function (m, w) { return 'nx_welcomed_svc_' + m + '_' + w; },
    onClose: function () { try { var x = X(), t = x.inbox().tab; if (t) x.render(t); } catch (e) {} }
  });
  var openChat = room.open, prewarmChat = room.prewarm;
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
