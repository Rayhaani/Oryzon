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
      '<div style="width:42px;height:42px;border-radius:50%;background:#262626;border:2px solid #E3C48D"></div>' +
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
    go(cur.ov);
    try { history.pushState({ svcChat: 1 }, '', location.href); cur.pushed = true; } catch (e) {}
    document.body.style.overflow = 'hidden';
  }
  function close(viaUI) {
    var c = cur; if (!c) return; cur = null; c.open = false;
    try { c.ov.querySelector('iframe').contentWindow.postMessage({ nxMkHide: 1 }, location.origin); } catch (e) {}
    c.ov.style.visibility = 'hidden'; c.ov.style.pointerEvents = 'none';
    if (!document.documentElement.classList.contains('np-lock')) document.body.style.overflow = '';
    if (viaUI && c.pushed) { swallow = true; try { history.back(); } catch (e) { swallow = false; } }
    setTimeout(function () { try { if (typeof inboxCurrentMainTab !== 'undefined' && inboxCurrentMainTab) renderInboxList(inboxCurrentMainTab); } catch (e) {} }, 60);
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
  function curPro() {                                         // the provider whose profile is open (several code paths open it)
    var id = null;
    try { id = (typeof currentProfileProId !== 'undefined' && currentProfileProId) || (typeof currentEditProId !== 'undefined' && currentEditProId) || null; } catch (e) {}
    if (!id) { try { var el = document.getElementById('profile-expert-name'), nm = el && (el.innerText || el.textContent || '').trim(); var p = nm && PROS.find(function (x) { return String(x.name).trim() === nm; }); if (p) id = p.id; } catch (e) {} }
    return id ? String(id) : null;
  }
  window.openSecureChat = function () {                      // "Chat" button on a provider's profile
    var u = me();
    if (!u) { try { showGlobalToast('⚠️ Please login first to start a chat!'); } catch (e) {} setTimeout(function () { window.location.href = 'login.html'; }, 1500); return; }
    var pid = curPro();
    if (!pid) { try { showGlobalToast('⚠️ Could not identify provider!'); } catch (e) {} return; }
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
    var pid = (typeof hireState !== 'undefined' && hireState && hireState.proId) ? hireState.proId : curPro();
    if (pid) openChat(String(pid), String(pid));
  };

  /* ── Business Chat inbox: business rooms (personalChats ~svc~) next to the old threads ── */
  var rooms = { buying: [], selling: [] }, names = {}, started = false;
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function nameFor(kind, id, t) {
    if (names[id]) { t.displayName = names[id].n; t.avatarUrl = names[id].a; return; }
    t.displayName = cap(id); t.avatarUrl = null;
    var d; try { d = firebase.firestore(); } catch (e) { return; }
    var p = kind === 'buying' ? (typeof PROS !== 'undefined' ? PROS.find(function (x) { return String(x.id) === String(id); }) : null) : null;
    if (p && p.name) { names[id] = { n: p.name, a: null }; t.displayName = p.name; return; }
    names[id] = { n: cap(id), a: null };
    d.collection('users').doc(id).get().then(function (u) {
      if (!u.exists) return; var x = u.data(), fn = x.fullName || x.name || x.username;
      names[id] = { n: fn ? String(fn).split(' ').map(cap).join(' ') : cap(id), a: x.userProfilePic || null };
      try { if (typeof inboxCurrentMainTab !== 'undefined') renderInboxList(inboxCurrentMainTab); } catch (e) {}
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
        var top = (s[0] || b[0]); if (top) setTimeout(function () { prewarmChat(top.otherId, top.vendorId); }, 400);
        try {
          if (!inboxUserPicked && inboxCurrentMainTab === 'buying' && s.length && !inboxSellingThreads.length) { inboxOrderPills(true); inboxSwitchMainTab('selling', true); }
          if (inboxCurrentMainTab) renderInboxList(inboxCurrentMainTab);
        } catch (e) {}
      }, function (e) { console.warn('Services rooms listener:', e && (e.code || e.message)); });
    });
  }
  var origOpenInbox = window.openInboxOverlay;
  window.openInboxOverlay = function () { startRooms(); return origOpenInbox ? origOpenInbox.apply(this, arguments) : undefined; };
  if (me()) setTimeout(startRooms, 1500);

  var origRender = window.renderInboxList;
  window.renderInboxList = function (tab) {
    var myUsername = me(), container = document.getElementById('inbox-list-' + tab); if (!container) return;
    var legacy = tab === 'buying' ? inboxBuyingThreads : inboxSellingThreads, mine = rooms[tab] || [];
    var taken = {}; mine.forEach(function (t) { taken[t.otherId] = 1; });
    var threads = mine.concat(legacy.filter(function (t) { return !taken[t.otherId]; }));
    threads.sort(function (a, b) { return (b.lastActive || 0) - (a.lastActive || 0); });
    if (tab === 'selling') threads = NXShared.inboxFilterSelling(threads, inboxCurrentSubFilter);
    if (!threads.length) { container.innerHTML = '<div class="inbox-empty-state">No chats yet</div>'; return; }
    container.innerHTML = threads.map(function (t) {
      var href = tab === 'buying'
        ? 'vendor-chat.html?with=' + enc(t.otherId) + '&name=' + enc(t.displayName)
        : 'vendor-chat.html?vendorId=' + enc(myUsername) + '&admin=1&customer=' + enc(t.otherId) + '&name=' + enc(t.displayName);
      return NXShared.inboxItemHTML(t, tab, href, 'inboxOpenChat', 'inboxAvatarTap');
    }).join('');
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
  document.addEventListener('click', function (e) {          // "Offer a service" → the post-service flow, right here (no page reload)
    var a = onSvc() && e.target.closest && e.target.closest('#biz-tools-pane .biz-start-btn-alt'); if (!a) return;
    e.preventDefault(); e.stopPropagation();
    try { closeInboxOverlay(); } catch (er) {}
    setTimeout(function () { try { handlePostServiceBtnClick(); } catch (er) {} }, 120);
  }, true);

  /* ── filter buttons = the exact Report / Chat / Follow buttons (same as the marketplace) ── */
  function skin() {
    var sf = document.getElementById('inbox-selling-subfilters'); if (!sf || sf.__svcSkin) return; sf.__svcSkin = 1;
    sf.classList.add('nx-actions');
    sf.querySelectorAll('.inbox-subfilter-pill').forEach(function (p) { p.classList.add('btn-slim'); p.classList.toggle('btn-gold', p.classList.contains('active')); });
  }
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
