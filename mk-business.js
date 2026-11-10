/* mk-business.js — marketplace Inbox + My Business.
   Markup, CSS classes and reusable logic come from nx-shared.js / nx-shared.css (the SAME files services.html uses).
   This file only supplies marketplace DATA (Firestore: vendors, products, vendorChats). */
(function () {
  'use strict';
  if (window.__mk_business_js_ran) return; window.__mk_business_js_ran = true;
  var NX = window.NXShared, esc = NX.esc, toast = function (t) { (window.mkToast || function () {})(t); };
  var me = function () { return localStorage.getItem('nexus_user_session') || ''; };
  var FS = function () { return window.mkGetFs(); };
  function userPic(un) { return FS().then(function (F) { return F.m.getDoc(F.m.doc(F.db, 'users', un)); }).then(function (d) { return d.exists() ? (d.data().userProfilePic || '') : ''; }); }

  /* ═════════════ INBOX (same UI/logic as services; data = marketplace chats only) ═════════════ */
  var buying = [], selling = [], tab = null, sub = 'all', picked = false;
  function ensureInbox() {
    var o = document.getElementById('inbox-overlay');
    if (o) return o;
    o = document.createElement('div'); o.id = 'inbox-overlay';
    o.style.cssText = 'display:none;position:fixed;inset:0;z-index:9050;background:#050505;flex-direction:column;';
    o.innerHTML = NX.inboxOverlayInner({ title: 'Business Chat' });
    document.body.appendChild(o);
    /* filter buttons (All / Needs Reply / Bot Handling / Taken Over) = the exact Report / Chat / Follow buttons of the product page (.nx-actions .btn-slim, active = .btn-gold) */
    var sf = o.querySelector('#inbox-selling-subfilters'); if (sf) { sf.classList.add('nx-actions'); sf.querySelectorAll('.inbox-subfilter-pill').forEach(function (p) { p.classList.add('btn-slim'); p.classList.toggle('btn-gold', p.classList.contains('active')); }); }
    if (window.NX && NX.inboxToolsWrap) NX.inboxToolsWrap();
    var tp = o.querySelector('#biz-tools-pane'); if (tp) tp.classList.add('mk-tools');   // marketplace Tools card: "Sell products" only
    return o;
  }
  /* Tools tab data (same numbers as chats.html: active chats in the last 7 days; views/orders only if tracked) */
  window.nxInboxToolsData = async function () {
    var F = await FS(), m = F.m, u = me(), out = { seller: false, chats: 0, views: null, orders: null };
    try { var vs = await m.getDoc(m.doc(F.db, 'vendors', u)); out.seller = vs.exists() && !!vs.data().storeName; } catch (e) {}
    try {
      var sn = await m.getDocs(m.query(m.collection(F.db, 'vendorChats'), m.where('vendorId', '==', u))), since = Date.now() - 7 * 86400000;
      sn.forEach(function (d) { var t = d.data().lastActive; t = t && t.toMillis ? t.toMillis() : (t && t.seconds ? t.seconds * 1000 : +t || 0); if (t >= since) out.chats++; });
      if (sn.size) out.seller = true;
    } catch (e) {}
    return out;
  };
  /* read the real last message of an E2E-encrypted room (same ECDH/AES-GCM scheme as chat-interior.js; key stays on this device) */
  function b64d(t) { var b = atob(t), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  async function decPreview(F, t) {
    var raw = String(t.lastText || '');
    if (raw.indexOf('\uD83D\uDD12') !== 0) return raw;                       // plain text — nothing to do
    var rest = raw.replace(/^\uD83D\uDD12\s*/, '');
    if (rest && rest !== 'Message') return rest;                                // "🔒 📷 Photo" → "📷 Photo"
    try {
      var priv = localStorage.getItem('nexus_e2e_priv_' + me()); if (!priv || !t._enc) return 'Message';
      var us = await F.m.getDoc(F.m.doc(F.db, 'users', t.otherId || (t.customerId === me() ? t.vendorId : t.customerId)));
      var pub = us.exists() && us.data().e2ePublicKey; if (!pub) return 'Message';
      var C = { name: 'ECDH', namedCurve: 'P-256' };
      var pk = await crypto.subtle.importKey('jwk', JSON.parse(priv), C, true, ['deriveKey', 'deriveBits']);
      var pp = await crypto.subtle.importKey('jwk', pub, C, true, []);
      var key = await crypto.subtle.deriveKey({ name: 'ECDH', public: pp }, pk, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(t._enc.iv) }, key, b64d(t._enc.ciphertext));
      var js = new TextDecoder().decode(pt); try { return JSON.parse(js).text || 'Message'; } catch (e) { return js; }
    } catch (e) { return 'Message'; }
  }
  async function loadThreads(kind) {
    var F = await FS(), m = F.m, u = me(), mine = kind === 'buying' ? 'customerId' : 'vendorId', other = kind === 'buying' ? 'vendorId' : 'customerId';
    var snap = await m.getDocs(m.query(m.collection(F.db, 'vendorChats'), m.where(mine, '==', u)));
    var ts = []; snap.forEach(function (d) { var x = d.data(); if (x[other] && x.source === 'market') ts.push(Object.assign({ chatDocId: d.id }, x)); });
    /* marketplace chats now live in the shared chat-interior rooms (personalChats, flagged source:'market') */
    try {
      var ps = await m.getDocs(m.query(m.collection(F.db, 'personalChats'), m.where('members', 'array-contains', u)));
      ps.forEach(function (d) {
        var x = d.data(); if (String(d.id).indexOf('~biz~') < 0 || x.source !== 'market' || !x.marketVendor || !x.marketBuyer || !x.lastMessageTime) return;
        if (kind === 'buying' ? x.marketBuyer !== u : x.marketVendor !== u) return;
        ts.push({ chatDocId: d.id, customerId: x.marketBuyer, vendorId: x.marketVendor, source: 'market', lastActive: +x.lastMessageTime || 0, lastType: 'text', lastText: x.lastMessage || '', lastRole: (x.lastSenderId && x.lastSenderId === x.marketBuyer) ? 'mine' : '', botActive: x.botActive, _pc: true, _enc: x.lastMessageEnc || null });
      });
    } catch (e) {}
    (function () { var best = {}; ts.forEach(function (t) { var k = t[other]; if (!best[k] || (t.lastActive || 0) > (best[k].lastActive || 0)) best[k] = t; }); ts = Object.keys(best).map(function (k) { return best[k]; }); })();
    ts.sort(function (a, b) { return (b.lastActive || 0) - (a.lastActive || 0); });
    return Promise.all(ts.map(async function (t) {
      var lastMsg = t.lastType ? { type: t.lastType, text: t.lastText, caption: t.lastText, role: t.lastRole } : null;
      if (!lastMsg) { try { var ms = await m.getDocs(m.query(m.collection(F.db, 'vendorChats', t.chatDocId, 'messages'), m.orderBy('time', 'desc'), m.limit(1))); if (!ms.empty) lastMsg = ms.docs[0].data(); } catch (e) {} }
      var id = t[other], name = id.charAt(0).toUpperCase() + id.slice(1), av = null;
      if (t._pc) { t.otherId = id; try { var pv = await decPreview(F, t); lastMsg = { type: 'text', text: pv, caption: pv, role: t.lastRole || '' }; } catch (e) {} }
      try {
        if (kind === 'buying') { var v = await m.getDoc(m.doc(F.db, 'vendors', id)); if (v.exists()) { var d = v.data(); name = d.storeName || d.businessName || d.name || name; av = d.logoUrl || d.photoURL || null; } }
        else { var us = await m.getDoc(m.doc(F.db, 'users', id)); if (us.exists()) { var ud = us.data(), fn = ud.fullName || ud.name || ud.username; if (fn) name = fn.split(' ').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); av = ud.userProfilePic || null; } }
      } catch (e) {}
      return Object.assign({}, t, { lastMsg: lastMsg, displayName: name, avatarUrl: av, otherId: id });
    }));
  }
  function render(which) {
    var c = document.getElementById('inbox-list-' + which); if (!c) return;
    var th = which === 'buying' ? buying : selling;
    if (which === 'selling') th = NX.inboxFilterSelling(th, sub);
    if (!th.length) { c.innerHTML = '<div class="inbox-empty-state">No chats yet</div>'; return; }
    c.innerHTML = th.map(function (t) { return NX.inboxItemHTML(t, which, '#' + which + ':' + encodeURIComponent(t.otherId), 'mkInboxOpen', null); }).join('');
    NX.fillAvatars(c, userPic);
  }
  async function refresh(which) {
    var c = document.getElementById('inbox-list-' + which); var arr = which === 'buying' ? buying : selling;
    if (!arr.length) c.innerHTML = '<div class="inbox-empty-state">Loading...</div>';
    try { var r = await loadThreads(which); if (which === 'buying') buying = r; else selling = r; render(which); }
    catch (e) { if (!arr.length) c.innerHTML = '<div class="inbox-empty-state">Could not load chats. (' + (e.code || e.message || 'error') + ')</div>'; }
  }
  window.mkInboxOpen = function (href) {
    var p = String(href).replace('#', '').split(':'), which = p[0], other = decodeURIComponent(p[1] || '');
    if (which === 'selling') window.__mkAdminWith = other;
    if (window.openVendorChatOverlay) window.openVendorChatOverlay(which === 'selling' ? me() : other);
    return false;
  };
  window.inboxSwitchMainTab = function (t, auto) {
    if (!auto) picked = true;
    var up = t === 'updates'; if (!up) tab = t;
    ['buying', 'selling', 'updates'].forEach(function (k) { document.getElementById('inbox-tab-' + k).classList.toggle('active', t === k); });
    document.getElementById('inbox-selling-subfilters').style.display = t === 'selling' ? 'flex' : 'none';
    document.getElementById('inbox-list-wrap').style.display = up ? 'none' : 'block';
    document.getElementById('inbox-updates-pane').style.display = up ? 'flex' : 'none';
    document.getElementById('inbox-list-buying').style.display = t === 'buying' ? 'block' : 'none';
    document.getElementById('inbox-list-selling').style.display = t === 'selling' ? 'block' : 'none';
    if (up) { var fr = document.getElementById('inbox-updates-frame'); if (!fr.getAttribute('src')) fr.src = 'updates.html?embed=1'; return; }
    var arr = t === 'buying' ? buying : selling;
    if (arr.length) render(t); else refresh(t);
  };
  window.inboxSwitchSubFilter = function (f, el) {
    sub = f; document.querySelectorAll('#inbox-selling-subfilters .inbox-subfilter-pill').forEach(function (p) { p.classList.remove('active', 'btn-gold'); }); el.classList.add('active', 'btn-gold'); render('selling');
  };
  window.toggleInboxSearchBar = function () {
    var bar = document.getElementById('inbox-search-bar'), inp = document.getElementById('inbox-search-input');
    bar.classList.toggle('active'); if (bar.classList.contains('active')) inp.focus(); else { inp.value = ''; window.performInboxSearch(''); }
  };
  window.performInboxSearch = function (q) {
    q = q.toLowerCase();
    document.querySelectorAll('#inbox-list-' + tab + ' .inbox-chat-item').forEach(function (i) { var n = i.querySelector('.inbox-chat-name'); i.style.display = (n ? n.textContent.toLowerCase() : '').indexOf(q) > -1 ? 'flex' : 'none'; });
  };
  window.closeInboxOverlay = function () { var o = document.getElementById('inbox-overlay'); if (o) o.style.display = 'none'; if (!document.querySelector('.mk-ov.on') && !document.getElementById('products-page-overlay').classList.contains('active')) document.body.style.overflow = ''; };
  window.mkOpenInbox = async function (startTab) {
    if (!me()) { toast('Please sign in to view messages'); return; }
    var o = ensureInbox(); o.style.display = 'flex'; document.body.style.overflow = 'hidden';
    picked = false; buying = []; selling = [];
    // providers land on Selling first, like services
    var isSeller = false; try { var F = await FS(); var vs = await F.m.getDoc(F.m.doc(F.db, 'vendors', me())); isSeller = vs.exists() && !!vs.data().storeName; } catch (e) {}
    var pg = document.getElementById('inbox-pill-group'), s = document.getElementById('inbox-tab-selling'), b = document.getElementById('inbox-tab-buying');
    if (isSeller) pg.insertBefore(s, b); else pg.insertBefore(b, s);
    window.inboxSwitchMainTab(startTab || (isSeller ? 'selling' : 'buying'), true);
    var other = (startTab || (isSeller ? 'selling' : 'buying')) === 'selling' ? 'buying' : 'selling'; refresh(other);
  };

  /* ═════════════ MY BUSINESS (same shell + panels as services) ═════════════ */
  var bz = { tab: 'overview', v: {}, products: [], reviews: [], chats: [], q: '' };
  var TABS = [['overview', 'Overview'], ['products', 'Products'], ['customers', 'Customers'], ['insights', 'Earnings'], ['reviews', 'Reviews'], ['gallery', 'Gallery']];
  function priceNum(p) { return parseFloat(String(p.price || '0').replace(/[^0-9.]/g, '')) || 0; }
  function ensureBiz() {
    var o = document.getElementById('my-business-overlay'); if (o) return o;
    o = document.createElement('div'); o.id = 'my-business-overlay';
    o.style.cssText = 'position:fixed;inset:0;background-color:#050505;color:#fff;z-index:9000;display:none;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;';
    o.innerHTML = NX.mbShellHTML({ tabs: TABS, back: 'closeMyBusinessDashboard()', settings: 'mbOpenStoreEdit()', add: 'mbOpenAddItem()', switchTab: 'mbSwitchTab', online: 'mbToggleOnline()', completionLabel: 'profile complete' }) +
      '<div style="flex:1;overflow-y:auto;"><div id="mb-body" style="padding:16px;"></div></div>';
    document.body.appendChild(o); return o;
  }
  async function loadBiz() {
    var F = await FS(), m = F.m, u = me();
    var vs = await m.getDoc(m.doc(F.db, 'vendors', u)); bz.v = vs.exists() ? vs.data() : {};
    var ps = await m.getDocs(m.query(m.collection(F.db, 'products'), m.where('vendorId', '==', u)));
    bz.products = ps.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0); });
    try { var rs = await m.getDocs(m.collection(F.db, 'vendors', u, 'reviews')); bz.reviews = rs.docs.map(function (d) { return Object.assign({ id: d.id, verified: true }, d.data()); }); } catch (e) { bz.reviews = []; }
    try { bz.chats = await loadThreads('selling'); } catch (e) { bz.chats = []; }
  }
  function health() {
    var v = bz.v, items = [
      [!!v.logoUrl, 'Add a store logo', 'Shops with a logo get more taps', 'mbOpenStoreEdit()'],
      [!!(v.storeName && v.storeName.toLowerCase() !== me().toLowerCase()), 'Choose a store name', 'Make it easy to remember', 'mbOpenStoreEdit()'],
      [!!v.bio, 'Write a short store bio', 'Tell buyers what you sell', 'mbOpenStoreEdit()'],
      [bz.products.length > 0, 'List your first product', 'Buyers can only find what is listed', 'mbOpenAddItem()'],
      [bz.products.some(function (p) { return (p.images || []).length >= 3; }), 'Add 3+ photos to a product', 'More photos build trust', 'mbOpenAddItem()'],
      [typeof v.lat === 'number', 'Set your location', 'Needed to appear in “near you”', 'mbOpenAddItem()'],
      [bz.reviews.length > 0, 'Get your first review', 'Ask happy buyers to rate you', null]
    ];
    return { items: items, pct: Math.round(items.filter(function (i) { return i[0]; }).length / items.length * 100) };
  }
  function drawBiz() {
    var o = document.getElementById('my-business-overlay'), body = o.querySelector('#mb-body'), v = bz.v, name = v.storeName || me();
    document.getElementById('mb-business-name').textContent = name;
    document.getElementById('mb6-sub').textContent = bz.products.length + ' product' + (bz.products.length === 1 ? '' : 's') + ' · Marketplace';
    var slot = document.getElementById('mb6-av-slot'); slot.innerHTML = NX.avatar({ url: v.logoUrl || '', size: 40, un: v.logoUrl ? '' : me() }); NX.fillAvatars(slot, userPic);
    var avg = bz.reviews.length ? (bz.reviews.reduce(function (a, r) { return a + (Number(r.rating) || 0); }, 0) / bz.reviews.length).toFixed(1) : '—';
    document.getElementById('mb-badge-rating').textContent = avg;
    var H = health(); document.getElementById('mb-badge-completion').textContent = H.pct + '%';
    var on = v.online !== false; var ob = document.getElementById('mb6-online'); ob.classList.toggle('on', on); ob.setAttribute('aria-pressed', on); document.getElementById('mb6-online-t').textContent = on ? 'Online' : 'Offline';
    o.querySelectorAll('.mb6-tab').forEach(function (t) { t.classList.toggle('active', t.id === 'mb-tab-' + bz.tab); });
    PANELS[bz.tab](body, H);
  }
  var ICO = {
    box: NX.svg('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
    chat: NX.svg('<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>'),
    users: NX.svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    check: NX.svg('<path d="M20 6L9 17l-5-5"/>')
  };
  var PANELS = {
    overview: function (b, H) {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var live = bz.products.filter(function (p) { return p.status !== 'Sold'; }).length, sold = bz.products.filter(function (p) { return p.status === 'Sold'; }).length;
      var msgToday = bz.chats.filter(function (c) { return (c.lastActive || 0) >= today.getTime(); }).length;
      var needs = bz.chats.filter(function (c) { return c.lastMsg && c.lastMsg.role === 'mine'; }).length;
      var days = [], msgs = [], lists = [], ms = 86400000;
      for (var i = 6; i >= 0; i--) { var d0 = today.getTime() - i * ms; days.push(new Date(d0).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3));
        msgs.push(bz.chats.filter(function (c) { return (c.lastActive || 0) >= d0 && (c.lastActive || 0) < d0 + ms; }).length);
        lists.push(bz.products.filter(function (p) { var t = (p.createdAt && p.createdAt.seconds || 0) * 1000; return t >= d0 && t < d0 + ms; }).length); }
      b.innerHTML = (needs ? '<div class="mb-glass-card" style="margin-top:16px;border-radius:16px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-left:3px solid #ffffff;cursor:pointer;" onclick="mkOpenInbox(\'selling\')"><div><div style="font-weight:800;font-size:14px;color:#ffffff;">' + needs + ' customer' + (needs === 1 ? '' : 's') + ' waiting for a reply</div><div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:3px;">Tap to open your inbox</div></div><div style="color:rgba(255,255,255,0.5);font-size:18px;">→</div></div>' : '') +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px;">' + NX.statCard(ICO.box, 'mb-s1', 'Live Products') + NX.statCard(ICO.chat, 'mb-s2', 'Chats Today') + NX.statCard(ICO.users, 'mb-s3', 'Followers') + NX.statCard(ICO.check, 'mb-s4', 'Items Sold') + '</div>' +
        '<div style="display:flex;gap:10px;margin-top:14px;"><div class="mb-glass-card" style="flex:1;border-radius:14px;padding:14px;text-align:center;"><div style="font-size:18px;font-weight:800;color:#fff;">' + bz.products.length + '</div><div style="font-size:10.5px;color:rgba(255,255,255,0.5);margin-top:3px;">Total Listings</div></div><div class="mb-glass-card" style="flex:1;border-radius:14px;padding:14px;text-align:center;"><div style="font-size:18px;font-weight:800;color:#fff;">' + bz.chats.length + '</div><div style="font-size:10.5px;color:rgba(255,255,255,0.5);margin-top:3px;">Total Chats</div></div></div>' +
        '<div class="mb-glass-card" style="margin-top:18px;border-radius:16px;padding:16px;"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"><div style="font-size:13px;font-weight:800;color:#fff;">Last 7 Days</div><div style="display:flex;gap:12px;"><div style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:rgba(255,255,255,0.6);"><span style="width:8px;height:8px;border-radius:50%;background:#ffffff;display:inline-block;"></span>Chats</div><div style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:rgba(255,255,255,0.6);"><span style="width:8px;height:8px;border-radius:50%;background:#838383;display:inline-block;"></span>Listings</div></div></div><svg id="mb-trend-svg" viewBox="0 0 300 110" style="width:100%;height:110px;display:block;" preserveAspectRatio="none"></svg><div id="mb-trend-labels" style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;"></div></div>' +
        '<div class="mb6-sect" style="margin-top:22px;">Quick actions</div><div class="mb6-qa">' +
        NX.quickAction('mbOpenAddItem()', '<path d="M12 5v14M5 12h14"/>', 'Add') + NX.quickAction("mkOpenInbox('selling')", '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>', 'Inbox') +
        NX.quickAction('mbViewStore()', '<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>', 'My store') + NX.quickAction('mbShareStore()', '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>', 'Share link') +
        NX.quickAction('mbOpenStoreEdit()', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', 'Edit store') +
        NX.quickAction("mbSwitchTab('reviews')", '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>', 'Reviews') + NX.quickAction("mbSwitchTab('insights')", '<path d="M3 3v18h18M7 14l4-4 4 4 5-6"/>', 'Earnings') + NX.quickAction("mbSwitchTab('gallery')", '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>', 'Gallery') + '</div>' +
        NX.healthCard() + '<div class="mb6-sect">Complete your setup</div><div id="mb-setup-checklist" style="display:flex;flex-direction:column;gap:8px;">' + H.items.map(function (i) { return NX.checkItem(i[0], i[1], i[2], i[3]); }).join('') + '</div>';
      document.getElementById('mb-s1').textContent = live; document.getElementById('mb-s2').textContent = msgToday; document.getElementById('mb-s3').textContent = bz.v.followers || 0; document.getElementById('mb-s4').textContent = sold;
      NX.trendSVG(document.getElementById('mb-trend-svg'), document.getElementById('mb-trend-labels'), msgs, days, lists);
      NX.setHealth(H.pct, H.pct === 100 ? 'Your store is fully set up' : 'Complete your setup to boost visibility');
    },
    products: function (b) {
      var l = bz.products.filter(function (p) { return !bz.q || String(p.name).toLowerCase().indexOf(bz.q) > -1; });
      b.innerHTML = '<input type="text" id="mb-pq" value="' + esc(bz.q) + '" placeholder="🔍 Search your products..." style="width:100%;background:#0f0f0f !important;border:1.5px solid rgba(255,255,255,0.12);color:#ffffff;border-radius:12px;padding:10px 14px;font-size:13px;margin-bottom:12px;box-sizing:border-box;">' +
        '<div style="display:flex;flex-direction:column;gap:10px;">' + (l.length ? l.map(function (p) {
          var sold = p.status === 'Sold';
          return '<div class="mb-glass-card" style="border-radius:16px;padding:10px;display:flex;gap:12px;align-items:center;"><img src="' + esc(p.image || '') + '" style="width:62px;height:62px;border-radius:12px;object-fit:cover;background:#1a1a1a;flex:none"><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.name) + '</div><div style="font-size:13px;font-weight:800;color:#fde08d;margin-top:2px">' + esc(p.price) + '</div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">' + (sold ? 'Sold' : esc(p.status || 'In stock')) + ' · ' + esc(String(p.market || '').replace('-', ' ')) + '</div></div><div style="display:flex;gap:6px">' + (sold ? '' : '<button class="mb6-ic" data-sold="' + p.id + '" title="Mark sold"><i class="fa-solid fa-check"></i></button>') + '<button class="mb6-ic" data-del="' + p.id + '" title="Delete" style="color:#ef4444"><i class="fa-solid fa-trash"></i></button></div></div>';
        }).join('') : '<div class="inbox-empty-state">No products yet</div>') + '</div>';
      b.querySelector('#mb-pq').oninput = function (e) { bz.q = e.target.value.toLowerCase(); var pos = e.target.selectionStart; PANELS.products(b); var n = b.querySelector('#mb-pq'); n.focus(); n.setSelectionRange(pos, pos); };
      b.querySelectorAll('[data-del]').forEach(function (x) { x.onclick = async function () { if (!confirm('Delete this product?')) return; var F = await FS(); await F.m.deleteDoc(F.m.doc(F.db, 'products', x.dataset.del)); bz.products = bz.products.filter(function (p) { return p.id !== x.dataset.del; }); drawBiz(); toast('Product deleted'); }; });
      b.querySelectorAll('[data-sold]').forEach(function (x) { x.onclick = async function () { var F = await FS(); await F.m.updateDoc(F.m.doc(F.db, 'products', x.dataset.sold), { status: 'Sold' }); var n = (bz.v.sold || 0) + 1; await F.m.setDoc(F.m.doc(F.db, 'vendors', me()), { sold: n }, { merge: true }); bz.v.sold = n; bz.products.forEach(function (p) { if (p.id === x.dataset.sold) p.status = 'Sold'; }); drawBiz(); toast('Marked as sold'); }; });
    },
    customers: function (b) {
      b.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;">' + (bz.chats.length ? bz.chats.map(function (t) { return '<div class="mb-glass-card" style="border-radius:16px;overflow:hidden;">' + NX.inboxItemHTML(t, 'selling', '#selling:' + encodeURIComponent(t.otherId), 'mkInboxOpen', null) + '</div>'; }).join('') : '<div class="inbox-empty-state">No customers yet</div>') + '</div>';
      NX.fillAvatars(b, userPic);
    },
    insights: function (b) {
      var sold = bz.products.filter(function (p) { return p.status === 'Sold'; }), total = sold.reduce(function (a, p) { return a + priceNum(p); }, 0), live = bz.products.filter(function (p) { return p.status !== 'Sold'; });
      var worth = live.reduce(function (a, p) { return a + priceNum(p); }, 0), sym = ((live[0] && String(live[0].price || '').match(/^[^0-9.\s]+/)) || ['$'])[0], fmt = function (n) { return sym + Math.round(n).toLocaleString(); };
      b.innerHTML = '<div style="margin-bottom:16px;"><div style="font-size:19px;font-weight:800;color:#ffffff;">Earnings</div><div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:2px;">Sales you marked as sold and the value of your stock</div></div>' +
        '<div style="background:#0f0f0f !important;border-radius:16px;padding:18px;margin-bottom:12px;"><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.5px;">Total earnings</div><div style="font-size:26px;font-weight:800;color:#ffffff;margin-top:4px;">' + fmt(total) + '</div><div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:2px;">' + sold.length + ' item' + (sold.length === 1 ? '' : 's') + ' sold</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div style="background:#0f0f0f !important;border-radius:16px;padding:16px;"><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;">Stock value</div><div style="font-size:20px;font-weight:800;color:#ffffff;margin-top:4px;">' + fmt(worth) + '</div></div><div style="background:#0f0f0f !important;border-radius:16px;padding:16px;"><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;">Live items</div><div style="font-size:20px;font-weight:800;color:#16a34a;margin-top:4px;">' + live.length + '</div></div></div>';
    },
    reviews: function (b) { var box = document.createElement('div'); b.innerHTML = ''; b.appendChild(box); NX.mountReviews(box, bz.reviews, { avatar: function (r, tick) { return NX.avatar({ un: r.customerUsername, size: 40, inner: tick }); } }); NX.fillAvatars(box, userPic); },
    gallery: function (b) {
      var imgs = []; bz.products.forEach(function (p) { (p.images && p.images.length ? p.images : [p.image]).forEach(function (u) { if (u) imgs.push(u); }); });
      b.innerHTML = imgs.length ? '<div class="nxh-gallery-grid" style="padding:0">' + imgs.map(function (u) { return '<div class="nxh-gallery-card nxh-gallery-has-img" style="background-image:url(\'' + u.replace(/'/g, '%27') + '\')"></div>'; }).join('') + '</div>' : '<div class="inbox-empty-state">No photos yet</div>';
    }
  };
  function greet() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  window.mbSwitchTab = function (t) { bz.tab = t; drawBiz(); var o = document.getElementById('my-business-overlay'); o.scrollTop = 0; var a = document.getElementById('mb-tab-' + t); if (a && a.scrollIntoView) a.scrollIntoView({ inline: 'center', block: 'nearest' }); };
  window.mbOpenAddItem = function () { window.mkOpenSell && window.mkOpenSell(); };
  window.mbViewStore = function () { if (window.openStoreFrontOverlay) window.openStoreFrontOverlay(me()); };
  window.mbShareStore = function () { var url = location.origin + location.pathname + '?store=' + encodeURIComponent(me()); if (navigator.share) navigator.share({ title: (bz.v.storeName || me()) + ' on Nexus', url: url }).catch(function () {}); else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Store link copied'); }); };
  window.mbToggleOnline = async function () { var F = await FS(); bz.v.online = bz.v.online === false; await F.m.setDoc(F.m.doc(F.db, 'vendors', me()), { online: bz.v.online }, { merge: true }); drawBiz(); };
  window.closeMyBusinessDashboard = function () { var o = document.getElementById('my-business-overlay'); if (o) o.style.display = 'none'; if (!document.querySelector('.mk-ov.on')) document.body.style.overflow = ''; };
  /* edit store: name · bio · logo */
  window.mbOpenStoreEdit = function () {
    var id = 'mk-store-edit', el = document.getElementById(id); if (el) el.remove();
    el = document.createElement('div'); el.id = id; el.className = 'mk-ov on'; el.style.zIndex = 9200;
    el.innerHTML = '<div class="mk-ov-head"><button class="mk-ov-x" id="se-x"><i class="fa-solid fa-chevron-left"></i></button><div class="mk-ov-t">Edit store</div></div><div class="mk-ov-body"><div class="mk-s2"><div class="mk-s2-f" style="padding-top:16px"><div style="display:flex;align-items:center;gap:14px;margin-bottom:6px"><div id="se-av"></div><label class="chip2" style="padding:9px 14px;border-radius:99px;background:#272727;font-size:12.5px;font-weight:700;cursor:pointer"><i class="fa-solid fa-camera"></i> Change logo<input id="se-logo" type="file" accept="image/*" hidden></label></div><div class="mk-fld"><small>Store name</small><input id="se-name" maxlength="40"></div><div class="mk-fld"><small>Bio</small><textarea id="se-bio" rows="3" maxlength="200" placeholder="Tell buyers what you sell"></textarea></div></div><div class="mk-s2-pub"><button class="mk-pub" id="se-save">Save</button></div></div></div>';
    document.body.appendChild(el);
    var logo = bz.v.logoUrl || ''; var paint = function () { el.querySelector('#se-av').innerHTML = NX.avatar({ url: logo, size: 64, un: logo ? '' : me() }); }; paint();
    el.querySelector('#se-name').value = bz.v.storeName || ''; el.querySelector('#se-bio').value = bz.v.bio || '';
    el.querySelector('#se-x').onclick = function () { el.remove(); };
    el.querySelector('#se-logo').onchange = function (e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function (ev) { var im = new Image(); im.onload = function () { var c = document.createElement('canvas'), s = Math.min(1, 256 / Math.max(im.width, im.height)); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); logo = c.toDataURL('image/jpeg', .8); paint(); }; im.src = ev.target.result; }; r.readAsDataURL(f); };
    el.querySelector('#se-save').onclick = async function () {
      var F = await FS(), patch = { storeName: el.querySelector('#se-name').value.trim() || me(), bio: el.querySelector('#se-bio').value.trim() }; if (logo) patch.logoUrl = logo;
      await F.m.setDoc(F.m.doc(F.db, 'vendors', me()), patch, { merge: true }); Object.assign(bz.v, patch); el.remove(); drawBiz(); toast('Store updated');
    };
  };
  window.openMyBusinessDashboard = async function () {
    if (!me()) { toast('Please sign in'); return; }
    var o = ensureBiz(); o.style.display = 'flex'; document.body.style.overflow = 'hidden'; bz.tab = 'overview'; bz.q = '';
    o.querySelector('#mb-body').innerHTML = '<div class="inbox-empty-state">Loading...</div>';
    try { await loadBiz(); drawBiz(); } catch (e) { o.querySelector('#mb-body').innerHTML = '<div class="inbox-empty-state">Could not load your store. (' + (e.code || e.message) + ')</div>'; }
  };
  /* keep the dashboard fresh after a new listing */
  window.addEventListener('mk-listed', function () { var o = document.getElementById('my-business-overlay'); if (o && o.style.display !== 'none') window.openMyBusinessDashboard(); });
})();
