/* mk-business.js — marketplace Inbox + My Business overlays (Firestore data model). Loaded after mk-overlays.js. */
(function () {
  'use strict';
  var esc = window.mkEsc, toast = window.mkToast;
  var me = function () { return localStorage.getItem('nexus_user_session') || ''; };
  function ago(t) {
    if (!t) return ''; var s = (Date.now() - t) / 1000;
    if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 604800) return Math.floor(s / 86400) + 'd'; return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  var BACK = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';

  /* ================= INBOX ================= */
  var ib = { tab: 'buying', sub: 'all', q: '', data: { buying: null, selling: null } };
  function lastMsgText(m) {
    if (!m) return 'No messages yet';
    if (m.type === 'voice') return '🎤 Voice message';
    if (m.type === 'image' || m.type === 'imageGroup') return '📷 Photo' + (m.caption ? ' · ' + m.caption : '');
    return m.text || m.caption || 'Message';
  }
  async function loadThreads(kind) {
    var F = await window.mkGetFs(), m = F.m, u = me();
    var field = kind === 'buying' ? 'customerId' : 'vendorId';
    var snap = await m.getDocs(m.query(m.collection(F.db, 'vendorChats'), m.where(field, '==', u)));
    var out = await Promise.all(snap.docs.map(async function (d) {
      var c = d.data(), other = kind === 'buying' ? c.vendorId : c.customerId, last = null;
      try {
        var ms = await m.getDocs(m.query(m.collection(F.db, 'vendorChats', d.id, 'messages'), m.orderBy('time', 'desc'), m.limit(1)));
        if (!ms.empty) last = ms.docs[0].data();
      } catch (e) {}
      var av = ''; try { var vd = await m.getDoc(m.doc(F.db, 'vendors', other)); if (vd.exists()) { av = vd.data().logoUrl || ''; c._store = vd.data().storeName; } } catch (e) {}
      return { id: d.id, other: other, name: c._store || other || 'User', av: av, last: last, t: (last && last.time) || c.lastActive || 0, bot: c.botActive !== false };
    }));
    out.sort(function (a, b) { return b.t - a.t; });
    return out;
  }
  function drawInbox() {
    var o = document.getElementById('mk-inbox'), list = o.querySelector('#mk-ib-list');
    var d = ib.data[ib.tab];
    if (d === null) { list.innerHTML = '<div class="mk-ib-empty">Loading…</div>'; return; }
    var l = d.filter(function (t) { return !ib.q || (t.name + ' ' + lastMsgText(t.last)).toLowerCase().indexOf(ib.q) > -1; });
    if (ib.tab === 'selling') {
      l = l.filter(function (t) {
        if (ib.sub === 'needsReply') return t.last && t.last.role === 'mine';
        if (ib.sub === 'bot') return t.bot; if (ib.sub === 'takenOver') return !t.bot; return true;
      });
    }
    if (!l.length) { list.innerHTML = '<div class="mk-ib-empty">' + (ib.tab === 'buying' ? 'No conversations yet.<br>Message a seller from any product to start chatting.' : 'No customer messages yet.<br>When buyers message your store they appear here.') + '</div>'; return; }
    list.innerHTML = l.map(function (t) {
      var tag = ib.tab === 'selling' ? (t.last && t.last.role === 'mine' ? '<span class="mk-ib-tag warn">Needs reply</span>' : '') + (t.bot ? '' : '<span class="mk-ib-tag">You</span>') : '';
      return '<div class="mk-ib-row" data-id="' + esc(t.other) + '"><div class="mk-ib-av">' + (t.av ? '<img src="' + esc(t.av) + '">' : esc(String(t.name).charAt(0).toUpperCase())) + '</div><div class="mk-ib-b"><div class="mk-ib-n"><span>' + esc(t.name) + '</span><small>' + ago(t.t) + '</small></div><div class="mk-ib-l">' + tag + esc(lastMsgText(t.last)) + '</div></div></div>';
    }).join('');
    list.querySelectorAll('.mk-ib-row').forEach(function (r) {
      r.onclick = function () {
        if (ib.tab === 'selling') window.__mkAdminWith = r.dataset.id;
        window.openVendorChatOverlay(ib.tab === 'selling' ? me() : r.dataset.id);
      };
    });
  }
  function switchTab(t) {
    ib.tab = t; var o = document.getElementById('mk-inbox');
    o.querySelectorAll('.mk-ib-pills button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
    o.querySelector('.mk-ib-sub').classList.toggle('on', t === 'selling');
    var fr = o.querySelector('#mk-ib-upd'), list = o.querySelector('#mk-ib-list');
    fr.style.display = t === 'updates' ? 'block' : 'none'; list.style.display = t === 'updates' ? 'none' : 'block';
    o.querySelector('.mk-ib-top input').parentNode.style.display = t === 'updates' ? 'none' : 'flex';
    if (t === 'updates') { if (!fr.getAttribute('src')) fr.src = 'updates.html?embed=1'; return; }
    if (ib.data[t] === null) { drawInbox(); loadThreads(t).then(function (d) { ib.data[t] = d; drawInbox(); }).catch(function () { ib.data[t] = []; drawInbox(); }); }
    else drawInbox();
  }
  window.mkOpenInbox = function () {
    if (!me()) { toast('Please sign in to view messages'); return; }
    var o = window.mkMkOverlay('mk-inbox', 'Inbox'), b = o.querySelector('.mk-ov-body');
    if (!b.dataset.built) {
      b.dataset.built = 1; b.style.display = 'flex'; b.style.flexDirection = 'column';
      b.innerHTML = '<div class="mk-ib-top"><div class="mk-cat-search" style="margin:0"><i class="fa-solid fa-magnifying-glass"></i><input placeholder="Search chats..."></div>' +
        '<div class="mk-ib-pills"><button data-t="buying">Buying</button><button data-t="selling">Selling</button><button data-t="updates">Updates</button></div></div>' +
        '<div class="mk-ib-sub"><button data-f="all" class="on">All</button><button data-f="needsReply">Needs Reply</button><button data-f="bot">Bot Handling</button><button data-f="takenOver">Taken Over by You</button></div>' +
        '<div id="mk-ib-list" style="flex:1;overflow-y:auto;margin-top:6px"></div><iframe id="mk-ib-upd" title="Updates" style="display:none;flex:1;border:0;background:#050505;width:100%"></iframe>';
      b.querySelector('input').oninput = function (e) { ib.q = e.target.value.toLowerCase().trim(); drawInbox(); };
      b.querySelectorAll('.mk-ib-pills button').forEach(function (x) { x.onclick = function () { switchTab(x.dataset.t); }; });
      b.querySelectorAll('.mk-ib-sub button').forEach(function (x) { x.onclick = function () { ib.sub = x.dataset.f; b.querySelectorAll('.mk-ib-sub button').forEach(function (y) { y.classList.toggle('on', y === x); }); drawInbox(); }; });
    }
    ib.data = { buying: null, selling: null };
    window.mkOpenOv('mk-inbox'); switchTab(ib.tab);
  };

  /* ================= MY BUSINESS ================= */
  var bz = { tab: 'overview', v: {}, products: [], rating: null };
  async function loadBiz() {
    var F = await window.mkGetFs(), m = F.m, u = me();
    var vs = await m.getDoc(m.doc(F.db, 'vendors', u)); bz.v = vs.exists() ? vs.data() : {};
    var ps = await m.getDocs(m.query(m.collection(F.db, 'products'), m.where('vendorId', '==', u)));
    bz.products = ps.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0); });
    try {
      var rs = await m.getDocs(m.collection(F.db, 'vendors', u, 'reviews'));
      bz.reviews = rs.docs.map(function (d) { return Object.assign({ id: d.id, verified: true }, d.data()); });
    } catch (e) { bz.reviews = []; }
    bz.rating = bz.reviews.length ? (bz.reviews.reduce(function (a, r) { return a + (Number(r.rating) || 0); }, 0) / bz.reviews.length).toFixed(1) : '—';
  }
  function greet() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  function drawBiz() {
    var o = document.getElementById('mk-biz'), body = o.querySelector('#mk-bz-body'), v = bz.v, name = v.storeName || me();
    o.querySelector('#mk-bz-name').textContent = name;
    o.querySelector('#mk-bz-sub').textContent = bz.products.length + ' product' + (bz.products.length === 1 ? '' : 's') + ' listed';
    o.querySelector('#mk-bz-rt').textContent = bz.rating;
    var av = o.querySelector('#mk-bz-av'); av.innerHTML = v.logoUrl ? '<img src="' + esc(v.logoUrl) + '" style="width:100%;height:100%;object-fit:cover">' : esc(name.charAt(0).toUpperCase());
    o.querySelectorAll('.mb6-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.t === bz.tab); });
    if (bz.tab === 'overview') {
      var live = bz.products.filter(function (p) { return p.status !== 'Sold'; }).length;
      body.innerHTML = '<div class="mb6-greet">' + greet() + '</div><div class="mb6-greet-sub">Here\'s how your store is doing</div>' +
        '<div class="mk-bz-grid" style="margin-top:18px"><div class="mk-bz-card"><b>' + live + '</b><span>Live products</span></div><div class="mk-bz-card"><b>' + (v.followers || 0) + '</b><span>Followers</span></div><div class="mk-bz-card"><b>' + (v.sold || 0) + '</b><span>Items sold</span></div><div class="mk-bz-card"><b>' + bz.rating + '</b><span>Rating (' + bz.reviews.length + ')</span></div></div>' +
        '<div class="mb6-sect">Quick actions</div><div class="mb6-qa"><button data-a="add"><i class="fa-solid fa-plus"></i>Add product</button><button data-a="inbox"><i class="fa-solid fa-comment-dots"></i>Messages</button><button data-a="store"><i class="fa-solid fa-store"></i>View store</button><button data-a="share"><i class="fa-solid fa-share-nodes"></i>Share</button></div>' +
        (bz.products.length ? '' : '<div class="mk-bz-card" style="margin-top:20px;text-align:center"><b style="font-size:15px">List your first product</b><span>Stores with 5+ photos-rich listings get more messages.</span></div>');
      body.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { act(b.dataset.a); }; });
    } else if (bz.tab === 'products') {
      body.innerHTML = '<button class="mk-pub" id="mk-bz-add" style="margin-bottom:14px">Add product</button>' + (bz.products.length ? bz.products.map(function (p) {
        return '<div class="mk-bz-prod"><img src="' + esc(p.image || '') + '"><div class="mk-bz-pb"><div class="mk-bz-pn">' + esc(p.name) + '</div><div class="mk-bz-pp">' + esc(p.price) + '</div><div style="font-size:11px;color:#838383;margin-top:2px">' + esc(p.status || '') + '</div></div><div class="mk-bz-pa"><button data-sold="' + p.id + '" title="Mark sold"><i class="fa-solid fa-check"></i></button><button class="danger" data-del="' + p.id + '" title="Delete"><i class="fa-solid fa-trash"></i></button></div></div>';
      }).join('') : '<div class="mk-ib-empty">No products yet.</div>');
      body.querySelector('#mk-bz-add').onclick = function () { act('add'); };
      body.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = async function () { if (!confirm('Delete this product?')) return; var F = await window.mkGetFs(); await F.m.deleteDoc(F.m.doc(F.db, 'products', b.dataset.del)); bz.products = bz.products.filter(function (p) { return p.id !== b.dataset.del; }); drawBiz(); toast('Product deleted'); }; });
      body.querySelectorAll('[data-sold]').forEach(function (b) { b.onclick = async function () { var F = await window.mkGetFs(); await F.m.updateDoc(F.m.doc(F.db, 'products', b.dataset.sold), { status: 'Sold' }); await F.m.setDoc(F.m.doc(F.db, 'vendors', me()), { sold: (bz.v.sold || 0) + 1 }, { merge: true }); bz.v.sold = (bz.v.sold || 0) + 1; bz.products.forEach(function (p) { if (p.id === b.dataset.sold) p.status = 'Sold'; }); drawBiz(); toast('Marked as sold'); }; });
    } else if (bz.tab === 'messages') {
      body.innerHTML = '<div class="mk-ib-empty">Open your inbox to reply to customers.<br><br><button class="mk-pub" style="max-width:240px" id="mk-bz-ib">Open inbox</button></div>';
      body.querySelector('#mk-bz-ib').onclick = function () { act('inbox'); };
    } else if (bz.tab === 'reviews') {
      var box = document.createElement('div'); box.style.padding = '0 0 30px'; body.innerHTML = ''; body.appendChild(box);
      window.NXReviews.mount(box, bz.reviews);
    }
  }
  function act(a) {
    if (a === 'add') window.mkOpenSell();
    else if (a === 'inbox') { switchSellingInbox(); }
    else if (a === 'store') { if (window.openStoreFrontOverlay) window.openStoreFrontOverlay(me()); }
    else if (a === 'share') { var url = location.origin + location.pathname + '?store=' + encodeURIComponent(me()); if (navigator.share) navigator.share({ title: (bz.v.storeName || me()) + ' on Nexus', url: url }).catch(function () {}); else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Store link copied'); }); }
  }
  function switchSellingInbox() { ib.tab = 'selling'; window.mkOpenInbox(); }
  window.openMyBusinessDashboard = async function () {
    if (!me()) { toast('Please sign in'); return; }
    var o = document.getElementById('mk-biz');
    if (!o) {
      o = document.createElement('div'); o.id = 'mk-biz'; o.className = 'mk-ov';
      o.innerHTML = '<div class="mb6-top"><div class="mb6-head"><button class="mb6-back" id="mk-bz-x" aria-label="Back">' + BACK + '</button><span style="display:flex"><div id="mk-bz-av" class="mk-ib-av" style="width:40px;height:40px;font-size:15px"></div></span><div class="mb6-id"><div class="mb6-name-row"><div class="mb6-name" id="mk-bz-name">My Business</div><span class="mb6-plan">FREE</span></div><div class="mb6-sub" id="mk-bz-sub"></div></div><button class="mb6-ic" id="mk-bz-plus" aria-label="Add"><i class="fa-solid fa-plus"></i></button></div>' +
        '<div class="mb6-strip"><div class="mb6-stats"><span><span class="mb6-star">★</span> <span id="mk-bz-rt">—</span></span></div></div>' +
        '<div class="mb6-tabs"><button class="mb6-tab" data-t="overview">Overview</button><button class="mb6-tab" data-t="products">Products</button><button class="mb6-tab" data-t="messages">Messages</button><button class="mb6-tab" data-t="reviews">Reviews</button></div></div><div id="mk-bz-body" class="mk-bz-pad" style="flex:1;overflow-y:auto"></div>';
      document.body.appendChild(o);
      o.querySelector('#mk-bz-x').onclick = function () { window.mkCloseOv('mk-biz'); };
      o.querySelector('#mk-bz-plus').onclick = function () { act('add'); };
      o.querySelectorAll('.mb6-tab').forEach(function (t) { t.onclick = function () { bz.tab = t.dataset.t; drawBiz(); }; });
    }
    bz.tab = 'overview'; window.mkOpenOv('mk-biz');
    o.querySelector('#mk-bz-body').innerHTML = '<div class="mk-ib-empty">Loading…</div>';
    try { await loadBiz(); drawBiz(); } catch (e) { o.querySelector('#mk-bz-body').innerHTML = '<div class="mk-ib-empty">Could not load your store.</div>'; }
  };
  /* refresh business after a new listing */
  var _pub = window.mkSwitchVertical;
})();
