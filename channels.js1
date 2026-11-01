/* ============================================================
   CHANNELS.JS — Nexus Channels (SPA: router.js loads this once, then calls init/destroy)
   ------------------------------------------------------------
   Everything lives inside ONE closure, so nothing here can collide with the global names
   of other page scripts (chats.js declares `let authReadyResolve`, `const db` ... — a
   top-level declaration of the same name in this file would kill it after navigating from
   chats.html). All clicks go through ONE delegated handler (data-act="...").

   DATA MODEL (unchanged, so chats.html keeps working)
     channels/{id}                 name, initials, avatarUrl, description, category, privacy,
                                   link, subscriberCount, verified, creatorUsername, adminUsernames[]
     channels/{id}/posts/{postId}  type, content, image, video, views, timestamp, status, publishAt,
                                   reactions{}, reactedBy{}, pinned, edited, poll, groupbuy, unlock, ...
     channels/{id}/subscribers/{me}   subscribedAt, muted
     users/{me}/mySubscriptions/{id}  (index read by chats.html)
     users/{me}/savedPosts/{id__postId}

   FEED: every published post of a PUBLIC channel is mirrored to the top-level `posts`
   collection (doc id ch_<channelId>_<postId>) in the same shape groups and pages use,
   so it appears in the social feed automatically.
   ============================================================ */
(function () {
    'use strict';

    var firebaseConfig = {
        apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
        authDomain: "oryzon-50ea4.firebaseapp.com",
        databaseURL: "https://oryzon-50ea4-default-rtdb.firebaseio.com",
        projectId: "oryzon-50ea4",
        storageBucket: "oryzon-50ea4.firebasestorage.app",
        messagingSenderId: "782106742622",
        appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
        measurementId: "G-K5085DLL2W"
    };
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var auth = firebase.auth();
    var db = firebase.firestore();
    var FV = firebase.firestore.FieldValue;
    var TS = firebase.firestore.Timestamp;

    var UPLOAD_URL = 'https://oryzon-backend-ed1q.onrender.com/upload';
    var EMOJIS = ['❤️', '🔥', '😂', '👍'];
    var PAGE_SIZE = 100;
    var STARTERS = {
        'tech-pulse': { name: 'Tech Pulse Hub', category: 'Technology', welcome: 'Welcome to Tech Pulse Hub.' },
        'kano-market-news': { name: 'Kano Market Broadcast', category: 'Business', welcome: 'Welcome to Kano Market Broadcast.' },
        'urban-vision': { name: 'Urban Vision 2050', category: 'Design', welcome: 'Welcome to Urban Vision 2050.' }
    };
    var BLANK = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2790%27 height=%2790%27%3E%3C/svg%3E';

    // ---------- state (reset on every entry) ----------
    var me = null, cid = null, ch = null, chMissing = false, chError = null;
    var isAdmin = false, member = false, memberKnown = false, muted = false;
    var posts = [], loaded = false, limit = PAGE_SIZE, hasMore = false, savedIds = {};
    var unsubs = [], postsUnsub = null, authUnsub = null, authReady = null;
    var pending = { media: null, schedule: null };
    var sheetState = {}, busy = {}, ovStack = [], barMode = '';
    var firstRender = true, stick = false, keepAnchor = null, prevIds = {}, unread = 0, jumpPost = null;
    var io = null, viewTimers = {}, dueBusy = {}, dueTimer = null, backfilled = false, scrollT = null;

    // ---------- helpers ----------
    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function ms(t) { if (!t) return 0; if (t.toMillis) return t.toMillis(); if (t.seconds) return t.seconds * 1000; if (typeof t === 'number') return t; var d = new Date(t).getTime(); return isNaN(d) ? 0 : d; }
    function fmt(n) { n = n || 0; if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'; return String(n); }
    function clock(t) { var d = new Date(t), h = d.getHours(), m = ('0' + d.getMinutes()).slice(-2), ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + ':' + m + ' ' + ap; }
    function dayLabel(t) {
        var d = new Date(t), n = new Date(), y = new Date(); y.setDate(n.getDate() - 1);
        if (d.toDateString() === n.toDateString()) return 'Today';
        if (d.toDateString() === y.toDateString()) return 'Yesterday';
        return d.toLocaleDateString(undefined, d.getFullYear() === n.getFullYear() ? { weekday: 'short', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
    }
    function dt(t) { return new Date(t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
    function money(n) { return (n || 0).toLocaleString(); }
    function linkify(s) {
        return esc(s).replace(/(https?:\/\/[^\s<]+)/g, function (m) {
            var tail = ''; var t = m.match(/[.,;:!?)\]]+$/); if (t) { tail = t[0]; m = m.slice(0, -tail.length); }
            return '<a href="' + m + '" target="_blank" rel="noopener noreferrer nofollow">' + m + '</a>' + tail;
        });
    }
    function sub(u) { unsubs.push(u); }
    function whenAuth() { return authReady || Promise.resolve(auth.currentUser); }
    function chRef() { return db.collection('channels').doc(cid); }
    function postsRef() { return chRef().collection('posts'); }
    function subRef() { return chRef().collection('subscribers').doc(me); }
    function mySubRef() { return db.collection('users').doc(me).collection('mySubscriptions').doc(cid); }
    function channelUrl(postId) { return location.origin + location.pathname.replace(/[^\/]*$/, '') + 'channels.html?channel=' + encodeURIComponent(cid || '') + (postId ? '&post=' + encodeURIComponent(postId) : ''); }
    var toastT = null;
    function toast(msg) { var t = $('chToast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2300); }
    function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

    // ---------- icons ----------
    var P = {
        plus: '<path d="M12 5v14M5 12h14"/>', send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>', bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
        bellOff: '<path d="M13.7 21a2 2 0 0 1-3.4 0"/><path d="M18.6 13A17 17 0 0 1 18 8a6 6 0 0 0-9.3-5"/><path d="M6.3 6.3A6 6 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M1 1l22 22"/>',
        pin: '<path d="M12 17v5"/><path d="M9 3h6l-1 7 3 3H7l3-3z"/>', bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
        eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
        check: '<path d="M20 6L9 17l-5-5"/>', copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>', flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
        edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
        users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
        image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>', video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="M22 8l-6 4 6 4z"/>',
        poll: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>', cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
        box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', unlock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
        lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>', link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
        x: '<path d="M18 6L6 18M6 6l12 12"/>', down: '<path d="M6 9l6 6 6-6"/>', out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>', smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', mega: '<path d="M3 11l18-8v18L3 13z"/><path d="M11 13v6a2 2 0 0 1-4 0v-4"/>', play: '<path d="M6 4l14 8-14 8z"/>'
    };
    function ic(n, s, extra) { s = s || 20; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + (P[n] || '') + '</svg>'; }
    var VERIFIED = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#E3C48D"><path d="M12 2l2.4 2.4 3.4-.5.5 3.4L21 9.6 18.7 12 21 14.4l-2.7 1.7-.5 3.4-3.4-.5L12 22l-2.4-2.4-3.4.5-.5-3.4L3 14.4 5.3 12 3 9.6l2.7-1.7.5-3.4 3.4.5z"/><path d="M9 12l2 2 4-4" stroke="#050505" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    // ---------- overlay history: phone Back closes only the top overlay ----------
    function ovPush(name, closeFn) { ovStack.push({ name: name, closeFn: closeFn }); try { history.pushState({ chOv: name }, '', location.href); } catch (e) {} }
    function ovHas(n) { return ovStack.some(function (o) { return o.name === n; }); }
    function ovBack() { if (!ovStack.length) return; try { history.back(); } catch (e) { var t = ovStack.pop(); try { t.closeFn(); } catch (e2) {} } }
    function onPop(e) { if (!ovStack.length) return; e.stopImmediatePropagation(); var t = ovStack.pop(); try { t.closeFn(); } catch (err) { console.error(err); } }
    function afterClose(name, fn) { if (ovHas(name)) ovBack(); var t0 = Date.now(); (function w() { if (!ovHas(name) || Date.now() - t0 > 900) fn(); else setTimeout(w, 20); })(); }
    (function () {
        var NO = window.NexusOverlay = window.NexusOverlay || {};
        if (NO.__chWrapped) return; NO.__chWrapped = true;
        var prev = NO.isOpen;
        NO.isOpen = function () { if (ovStack.length) return true; return typeof prev === 'function' ? prev.apply(NO, arguments) : false; };
    })();

    // ---------- bottom sheet ----------
    function openSheet(html) {
        var w = $('chSheetWrap'); if (!w) return;
        $('chSheet').innerHTML = '<div class="ch-grab"></div>' + html;
        w.style.display = 'block'; $('chSheet').scrollTop = 0;
        if (!ovHas('sheet')) ovPush('sheet', function () { w.style.display = 'none'; });
    }
    function closeSheet() { if (ovHas('sheet')) ovBack(); }
    function afterSheet(fn) { afterClose('sheet', fn); }
    function row(icon, title, subt, act, a, cls) { return '<div class="ch-row ' + (cls || '') + '" data-act="' + act + '"' + (a != null ? ' data-a="' + esc(a) + '"' : '') + '>' + ic(icon, 22) + '<div class="t">' + title + (subt ? '<small>' + subt + '</small>' : '') + '</div></div>'; }
    function radio(title, subt, on, act, a) { return '<div class="ch-row" data-act="' + act + '" data-a="' + esc(a) + '"><div class="t">' + title + (subt ? '<small>' + subt + '</small>' : '') + '</div><span class="ch-dot' + (on ? ' on' : '') + '"></span></div>'; }
    function field(label, id, val, ph, type, extra) { return '<div class="ch-field"><label>' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph || '') + '" ' + (extra || '') + '></div>'; }
    function area(label, id, val, ph, rows) { return '<div class="ch-field"><label>' + label + '</label><textarea id="' + id + '" rows="' + (rows || 4) + '" placeholder="' + esc(ph || '') + '">' + esc(val || '') + '</textarea></div>'; }
    function btns() { return '<div class="ch-sh-btns">' + Array.prototype.join.call(arguments, '') + '</div>'; }
    function btn(label, act, kind, a) { return '<button class="ch-btn ' + (kind || 'sec') + '" data-act="' + act + '"' + (a != null ? ' data-a="' + esc(a) + '"' : '') + '>' + label + '</button>'; }
    function confirmSheet(title, msg, label, kind, onYes) {
        sheetState.yes = onYes;
        openSheet('<div class="ch-sh-t">' + title + '</div><div class="ch-sh-m">' + msg + '</div>' + btns(btn(label, 'yes', kind), btn('Cancel', 'closeSheet', 'sec')));
    }
    function empty(icon, title, msg, extra) { return '<div class="ch-empty"><div class="ic">' + ic(icon, 28) + '</div><h3>' + title + '</h3><p>' + msg + '</p>' + (extra || '') + '</div>'; }

    // ============================================================
    // BOOT
    // ============================================================
    function boot() {
        if (!cid) { $('feedContainer').innerHTML = empty('mega', 'No channel selected', 'Open a channel from your chats.', '<button class="ch-btn pri" data-spa-link="chats.html">Back to chats</button>'); return; }
        renderHeader(); renderFeed();
        ensureStarter().catch(function () {}).then(function () {
            if (!cid) return;
            sub(chRef().onSnapshot(onChannel, function (err) { chError = err; renderFeed(); }));
            sub(subRef().onSnapshot(function (d) {
                var x = (d && d.data && d.data()) || {};
                member = !!x.subscribedAt; muted = !!x.muted; memberKnown = true;
                renderHeader(); renderBar(); syncPosts();
            }, function () { memberKnown = true; syncPosts(); }));
            sub(db.collection('users').doc(me).collection('savedPosts').where('channelId', '==', cid).onSnapshot(function (s) {
                savedIds = {}; s.forEach(function (d) { var x = d.data(); if (x && x.postId) savedIds[x.postId] = 1; }); renderFeed();
            }, function () {}));
        });
        dueTimer = setInterval(publishDue, 30000);
    }

    async function ensureStarter() {
        var s = STARTERS[cid]; if (!s) return;
        var snap = await chRef().get(); if (snap.exists) return;
        await chRef().set({ name: s.name, initials: s.name.slice(0, 2).toUpperCase(), description: '', category: s.category, privacy: 'public', link: 'nexus.app/c/' + cid, subscriberCount: 0, verified: false, creatorUsername: 'nexus', adminUsernames: ['nexus'], createdAt: FV.serverTimestamp() });
        await postsRef().add({ type: 'text', content: s.welcome, image: null, video: null, poster: null, views: 0, timestamp: FV.serverTimestamp(), reactions: {}, reactedBy: {}, pinned: true, edited: false, status: 'published', authorUsername: 'nexus' });
    }

    function onChannel(doc) {
        if (!doc.exists) { chMissing = true; ch = null; renderHeader(); renderFeed(); renderBar(); return; }
        chMissing = false; chError = null;
        var d = doc.data();
        ch = {
            name: d.name || 'Channel', initials: d.initials || (d.name || '#').slice(0, 2).toUpperCase(), avatarUrl: d.avatarUrl || '', description: d.description || '', category: d.category || '',
            privacy: d.privacy || 'public', link: d.link || ('nexus.app/c/' + cid), subscriberCount: Math.max(0, d.subscriberCount || 0), verified: !!d.verified, creatorUsername: d.creatorUsername || '', adminUsernames: d.adminUsernames || []
        };
        isAdmin = !!(me && (ch.creatorUsername === me || ch.adminUsernames.indexOf(me) > -1));
        renderHeader(); renderBar(); syncPosts();
    }

    function locked() { return !!(ch && ch.privacy === 'private' && !isAdmin && !member); }

    // (re)start or stop the posts listener depending on who is looking
    function syncPosts() {
        if (!ch || !memberKnown) return;
        if (locked()) { if (postsUnsub) { postsUnsub(); postsUnsub = null; } posts = []; loaded = true; renderFeed(); renderPin(); return; }
        if (postsUnsub) { renderFeed(); return; }
        startPosts();
    }
    function startPosts() {
        if (postsUnsub) { postsUnsub(); postsUnsub = null; }
        postsUnsub = postsRef().orderBy('timestamp', 'desc').limit(limit).onSnapshot(function (snap) {
            var arr = snap.docs.map(function (d) { var x = d.data({ serverTimestamps: 'estimate' }); return Object.assign({ id: d.id }, x, { timestamp: ms(x.timestamp) || Date.now() }); });
            arr.reverse(); posts = arr; hasMore = snap.size >= limit; loaded = true;
            renderFeed(); renderPin();
            if (isAdmin) { publishDue(); backfillFeed(); }
        }, function (err) { chError = err; loaded = true; renderFeed(); });
    }

    // ============================================================
    // RENDER — header / pinned / bar
    // ============================================================
    function renderHeader() {
        var av = $('headerAvatar'), nm = $('headerName'), sc = $('headerSubCount'); if (!av) return;
        if (!ch) { av.innerHTML = ''; nm.innerHTML = '<span class="nm">' + (chMissing ? 'Channel' : '&nbsp;') + '</span>'; sc.innerHTML = '&nbsp;'; return; }
        av.innerHTML = ch.avatarUrl ? '<img src="' + esc(ch.avatarUrl) + '" alt="">' : esc(ch.initials);
        var im = av.querySelector('img'); if (im) im.onerror = function () { av.innerHTML = esc(ch.initials); };
        nm.innerHTML = '<span class="nm">' + esc(ch.name) + '</span>' + (ch.verified ? VERIFIED : '');
        sc.innerHTML = fmt(ch.subscriberCount) + (ch.subscriberCount === 1 ? ' subscriber' : ' subscribers') + (muted ? ' · ' + ic('bellOff', 12) + ' Muted' : '');
        document.title = ch.name + ' - Nexus';
    }
    function visible() { var now = Date.now(); return posts.filter(function (p) { return isAdmin || (p.status !== 'scheduled' && p.timestamp <= now + 120000); }); }
    function snippet(p) { if (p.type === 'poll') return '📊 ' + ((p.poll && p.poll.question) || p.content || 'Poll'); var t = (p.content || '').replace(/\s+/g, ' ').trim(); return t || (p.type === 'video' ? '🎬 Video' : p.image ? '🖼️ Photo' : 'Message'); }
    function renderPin() {
        var bar = $('pinBar'); if (!bar) return;
        var pins = visible().filter(function (p) { return p.pinned && p.status !== 'scheduled'; });
        if (!pins.length) { bar.hidden = true; bar.innerHTML = ''; return; }
        var p = pins[pins.length - 1]; bar.hidden = false; bar.setAttribute('data-a', p.id);
        bar.innerHTML = '<div class="pt"><b>Pinned message</b><span>' + esc(snippet(p)) + '</span></div>' + ic('pin', 18);
    }
    function renderBar() {
        var bar = $('bottomBar'); if (!bar) return;
        var mode = !ch ? 'none' : isAdmin ? 'admin' : locked() ? 'none' : !member ? 'join' : 'mute';
        if (mode === 'mute') { /* label depends on muted */ }
        if (mode !== barMode || mode === 'mute' || mode === 'join') {
            if (mode === 'admin' && barMode === 'admin') return;
            barMode = mode;
            if (mode === 'admin') {
                bar.innerHTML = '<div class="ch-bar"><div class="ch-bar-in"><div class="ch-chips" id="chChips"></div><div class="ch-comp">' +
                    '<button class="ib" data-act="attach" aria-label="Attach">' + ic('plus', 22) + '</button>' +
                    '<textarea id="chInput" rows="1" placeholder="Broadcast a message…" enterkeyhint="send"></textarea>' +
                    '<button class="ch-send dis" id="chSend" data-act="send" aria-label="Send">' + ic('send', 19, ' style="color:#fff"') + '</button></div></div></div>';
                var t = $('chInput'); t.addEventListener('input', onComposerInput); t.addEventListener('keydown', onComposerKey);
                renderChips();
            } else if (mode === 'join') {
                bar.innerHTML = '<div class="ch-bar"><div class="ch-bar-in"><button class="ch-btn pri block" data-act="subscribe">Subscribe</button></div></div>';
            } else if (mode === 'mute') {
                bar.innerHTML = '<div class="ch-bar"><div class="ch-bar-in"><button class="ch-mute" data-act="toggleMute">' + ic(muted ? 'bell' : 'bellOff', 19) + (muted ? 'Unmute' : 'Mute') + '</button></div></div>';
            } else bar.innerHTML = '';
        }
        fit();
    }
    function fit() {
        var b = document.querySelector('#bottomBar .ch-bar'), h = b ? b.offsetHeight : 0, f = $('feedContainer'), l = $('toLatest');
        if (f) f.style.paddingBottom = (h + 28) + 'px';
        if (l) l.style.bottom = (h + 16) + 'px';
        var t = $('chToast'); if (t) t.style.bottom = (h + 18) + 'px';
    }

    // ============================================================
    // RENDER — feed
    // ============================================================
    function reactHTML(p) {
        var my = p.reactedBy && p.reactedBy[me], r = p.reactions || {}, anyZero = false;
        var pills = EMOJIS.map(function (e) {
            var c = r[e] || 0, on = my === e; if (!c && !on) anyZero = true;
            return '<button class="ch-pill' + (on ? ' on' : '') + (!c && !on ? ' zero' : '') + '" data-act="react" data-a="' + p.id + '" data-e="' + e + '">' + e + (c ? ' ' + c : '') + '</button>';
        }).join('');
        return '<div class="ch-react">' + pills + (anyZero ? '<button class="ch-pill add" data-act="reactPick" aria-label="Add reaction">' + ic('smile', 16) + '</button>' : '') + '</div>';
    }
    function pollEnded(p) { var e = ms(p.poll && p.poll.endsAt); return !!e && e < Date.now(); }
    function blockHTML(p) {
        var t = p.type, id = p.id, sched = p.status === 'scheduled', h = '';
        if (t === 'poll' && p.poll) {
            var o = p.poll.options || [], total = o.reduce(function (s, x) { return s + (x.votes || 0); }, 0), mine = p.pollVotedBy && p.pollVotedBy[me], voted = mine !== undefined && mine !== null, ended = pollEnded(p), show = voted || ended || isAdmin;
            h += '<div class="ch-block"><div class="ch-poll-q">' + esc(p.poll.question || p.content) + '</div>' + o.map(function (x, i) {
                var pct = total ? Math.round((x.votes || 0) / total * 100) : 0;
                return '<div class="ch-opt' + (mine === i ? ' mine' : '') + '" data-act="vote" data-a="' + id + '" data-i="' + i + '"><div class="fill" style="width:' + (show ? pct : 0) + '%"></div><div class="row"><b style="font-weight:500">' + esc(x.text) + '</b><span>' + (show ? pct + '%' : '') + '</span></div></div>';
            }).join('') + '<div class="ch-poll-meta">' + fmt(total) + (total === 1 ? ' vote' : ' votes') + ' · ' + (ended ? 'Poll ended' : (p.poll.endsAt ? 'Ends ' + dt(ms(p.poll.endsAt)) : 'Open')) + '</div></div>';
        } else if (t === 'groupbuy' && p.groupbuy) {
            var g = p.groupbuy, cur = g.currency || '$', pc = Math.min(100, Math.round((g.joined || 0) / Math.max(1, g.target || 1) * 100)), joined = !!(p.groupBuyJoinedBy && p.groupBuyJoinedBy[me]), done = (g.joined || 0) >= (g.target || 1);
            h += '<div class="ch-block"><div class="ch-card"><h4>' + ic('cart', 16) + 'Group deal' + (done ? ' · Target reached' : '') + '</h4><div class="ch-track"><i style="width:' + pc + '%"></i></div><div class="ch-info"><span><b>' + (g.joined || 0) + '</b> / ' + (g.target || 0) + ' joined</span><span>' + (g.originalPrice ? '<s>' + cur + money(g.originalPrice) + '</s>' : '') + '<b>' + cur + money(g.dropPrice) + '</b></span></div>' +
                '<button class="ch-btn ' + (joined ? 'sec' : 'pri') + ' block" data-act="join" data-a="' + id + '"' + (sched ? ' disabled' : '') + '>' + (joined ? ic('check', 16) + ' You joined' : 'Join this deal') + '</button></div></div>';
        } else if (t === 'unlock' && p.unlock) {
            var u = p.unlock, up = Math.min(100, Math.round((u.current || 0) / Math.max(1, u.needed || 1) * 100)), boosted = !!(p.unlockBoostedBy && p.unlockBoostedBy[me]);
            if (u.unlocked) h += '<div class="ch-block"><div class="ch-card"><h4>' + ic('unlock', 16) + 'Unlocked by the community</h4>' + (u.reveal ? '<div class="ch-reveal">' + linkify(u.reveal) + '</div>' : '<div class="ch-info" style="margin:0"><span>This post reached its goal.</span></div>') + '</div></div>';
            else h += '<div class="ch-block"><div class="ch-card"><h4>' + ic('lock', 16) + 'Community unlock</h4><div class="ch-track"><i style="width:' + up + '%"></i></div><div class="ch-info"><span><b>' + (u.current || 0) + '</b> / ' + (u.needed || 0) + ' needed</span><span>' + up + '%</span></div>' +
                '<button class="ch-btn ' + (boosted ? 'sec' : 'pri') + ' block" data-act="boost" data-a="' + id + '"' + (sched ? ' disabled' : '') + '>' + (boosted ? ic('check', 16) + ' You helped unlock this' : 'Help unlock') + '</button></div></div>';
        }
        return h;
    }
    function postHTML(p) {
        var id = esc(p.id), t = p.type || 'text', sched = p.status === 'scheduled', media = '', tag = '';
        if ((t === 'image' || t === 'delivery') && p.image) media = '<div class="ch-media"><img src="' + esc(p.image) + '" alt="" loading="lazy" data-act="light" data-a="' + id + '"></div>';
        else if (t === 'video' && p.video) media = '<div class="ch-media"><video src="' + esc(p.video) + '" preload="metadata" controls playsinline' + (p.poster ? ' poster="' + esc(p.poster) + '"' : '') + '></video></div>';
        if (sched) tag = '<div class="ch-tag">' + ic('clock', 14) + 'Scheduled · ' + dt(ms(p.publishAt) || p.timestamp) + '</div>';
        else if (t === 'delivery') tag = '<div class="ch-tag ok">' + ic('box', 14) + 'Delivery proof</div>';
        var text = t === 'poll' ? '' : linkify(p.content);
        var saved = savedIds[p.id];
        return '<article class="ch-msg" data-id="' + id + '"><div class="ch-bubble' + (sched ? ' sched' : '') + '">' + tag + media +
            (text ? '<div class="ch-body"><div class="ch-text">' + text + '</div></div>' : (t === 'poll' || t === 'groupbuy' || t === 'unlock' ? '' : '')) +
            blockHTML(p) + (sched ? '' : reactHTML(p)) +
            '<div class="ch-meta"><span class="sp"></span>' + (p.pinned ? ic('pin', 13) : '') + (saved ? ic('bookmark', 13) : '') +
            (sched ? '' : '<span class="vw">' + ic('eye', 14) + '<b class="vn" style="font-weight:600">' + fmt(p.views) + '</b></span>') + (p.edited ? '<span>edited</span>' : '') + '<span>' + clock(p.timestamp) + '</span>' +
            '<button class="ch-more" data-act="postMenu" data-a="' + id + '" aria-label="More">' + ic('more', 18) + '</button></div></div></article>';
    }
    function sigOf(p) {
        var i = me;
        return JSON.stringify([p.content, p.edited, p.pinned, p.reactions, p.reactedBy && p.reactedBy[i], p.poll, p.pollVotedBy && p.pollVotedBy[i], pollEnded(p), p.groupbuy, p.groupBuyJoinedBy && p.groupBuyJoinedBy[i], p.unlock, p.unlockBoostedBy && p.unlockBoostedBy[i], p.image, p.video, p.status, p.publishAt, !!savedIds[p.id], isAdmin, p.timestamp]);
    }
    function mkNode(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
    function reconcile(box, items) {
        var want = {}; items.forEach(function (it) { want[it.key] = 1; });
        Array.prototype.slice.call(box.children).forEach(function (c) { if (!c._key || !want[c._key]) box.removeChild(c); });
        var existing = {}; Array.prototype.forEach.call(box.children, function (c) { existing[c._key] = c; });
        var cursor = box.firstElementChild;
        items.forEach(function (it) {
            var node = existing[it.key];
            if (node && node._sig !== it.sig) { var nn = mkNode(it.html); nn._key = it.key; nn._sig = it.sig; var wasCur = cursor === node; box.replaceChild(nn, node); existing[it.key] = nn; node = nn; if (wasCur) cursor = nn; }
            if (!node) { node = mkNode(it.html); node._key = it.key; node._sig = it.sig; existing[it.key] = node; }
            if (node === cursor) { cursor = cursor.nextElementSibling; }
            else box.insertBefore(node, cursor);
            var vn = node.querySelector && node.querySelector('.vn'); if (vn && it.views != null) vn.textContent = it.views;
        });
    }
    function nearBottom() { var de = document.documentElement; return de.scrollHeight - window.scrollY - window.innerHeight < 220; }
    function jumpBottom(smooth) { var de = document.documentElement; window.scrollTo({ top: de.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }

    function renderFeed() {
        var box = $('feedContainer'); if (!box) return;
        if (chError) {
            var denied = chError.code === 'permission-denied';
            box.innerHTML = empty('shield', 'Could not load this channel', denied ? 'Firestore rules do not allow this read yet.' : 'Check your connection and try again.', '<button class="ch-btn sec" data-act="retry">Try again</button>'); delete box.firstElementChild._key; return;
        }
        if (chMissing) { box.innerHTML = empty('mega', 'Channel not found', 'This channel does not exist or was removed.', '<button class="ch-btn pri" data-spa-link="chats.html">Back to chats</button>'); return; }
        if (!ch || !loaded) { if (!box.querySelector('.ch-sk')) box.innerHTML = '<div class="ch-sk t"></div><div class="ch-sk"></div><div class="ch-sk"></div>'; return; }
        if (locked()) { box.innerHTML = empty('lock', 'Private channel', 'Only members can read this channel. Ask an admin to invite you.'); return; }
        var list = visible(), items = [];
        if (!list.length) { box.innerHTML = empty('mega', 'No posts yet', isAdmin ? 'Send your first broadcast from the box below.' : 'Posts from this channel will appear here.'); return; }
        if (hasMore) items.push({ key: 'more', sig: 'more' + limit, html: '<div style="text-align:center;padding:4px 0 10px"><button class="ch-btn sec sm" data-act="older">Load earlier messages</button></div>' });
        var last = null;
        list.forEach(function (p) {
            var dk = new Date(p.timestamp).toDateString();
            if (dk !== last) { items.push({ key: 'd:' + dk, sig: dayLabel(p.timestamp), html: '<div class="ch-sep"><span>' + esc(dayLabel(p.timestamp)) + '</span></div>' }); last = dk; }
            items.push({ key: 'p:' + p.id, sig: sigOf(p), html: postHTML(p), views: fmt(p.views) });
        });
        var wasNear = nearBottom(), h0 = document.documentElement.scrollHeight;
        reconcile(box, items);
        observeViews(); fit();
        var fresh = list.filter(function (p) { return !prevIds[p.id]; }); var firstOnes = firstRender;
        list.forEach(function (p) { prevIds[p.id] = 1; });
        if (firstOnes) {
            firstRender = false;
            if (jumpPost) { var jp = jumpPost; jumpPost = null; setTimeout(function () { gotoPost(jp); }, 60); } else jumpBottom();
        } else if (keepAnchor) { window.scrollTo(0, keepAnchor.y + (document.documentElement.scrollHeight - keepAnchor.h)); keepAnchor = null; }
        else if (stick) { stick = false; jumpBottom(true); }
        else if (fresh.length) { if (wasNear) jumpBottom(true); else { unread += fresh.filter(function (p) { return p.authorUsername !== me; }).length; updateLatest(); } }
    }
    function updateLatest() {
        var b = $('toLatest'), n = $('toLatestN'); if (!b) return;
        var show = !nearBottom() && visible().length > 4; b.classList.toggle('show', show || unread > 0 && !nearBottom());
        n.textContent = unread > 99 ? '99+' : unread; n.classList.toggle('on', unread > 0);
        if (nearBottom()) { unread = 0; n.classList.remove('on'); }
    }
    function onScroll() { clearTimeout(scrollT); scrollT = setTimeout(updateLatest, 60); }

    // ---------- unique-ish view counting: a post counts once per device, after 1s on screen ----------
    function viewedSet() { try { return JSON.parse(store('nx_ch_v_' + cid) || '[]'); } catch (e) { return []; } }
    function observeViews() {
        if (!('IntersectionObserver' in window)) return;
        if (!io) io = new IntersectionObserver(function (es) {
            es.forEach(function (en) {
                var id = en.target.getAttribute('data-id');
                if (en.isIntersecting) { if (!viewTimers[id]) viewTimers[id] = setTimeout(function () { countView(id); }, 1000); }
                else { clearTimeout(viewTimers[id]); viewTimers[id] = null; }
            });
        }, { threshold: 0.55 });
        Array.prototype.forEach.call(document.querySelectorAll('#feedContainer .ch-msg:not([data-o])'), function (n) { n.setAttribute('data-o', '1'); io.observe(n); });
    }
    function countView(id) {
        var p = posts.filter(function (x) { return x.id === id; })[0]; if (!p || p.status === 'scheduled') return;
        var v = viewedSet(); if (v.indexOf(id) > -1) return; v.push(id); if (v.length > 600) v = v.slice(-600); store('nx_ch_v_' + cid, JSON.stringify(v));
        postsRef().doc(id).update({ views: FV.increment(1) }).catch(function () {});
    }

    function gotoPost(id) {
        var el = document.querySelector('#feedContainer .ch-msg[data-id="' + id + '"]');
        if (!el) { toast('Load earlier messages to see this post'); return; }
        el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 1500);
    }

    // ============================================================
    // ACTIONS
    // ============================================================
    var A = {};
    function pid(el) { return el.getAttribute('data-a'); }
    function find(id) { return posts.filter(function (p) { return p.id === id; })[0]; }

    A.back = function () { ovBack(); };
    A.closeSheet = function () { closeSheet(); };
    A.yes = function () { var f = sheetState.yes; sheetState.yes = null; closeSheet(); if (f) f(); };
    A.retry = function () { chError = null; syncPosts(); renderFeed(); };
    A.older = function () { keepAnchor = { y: window.scrollY, h: document.documentElement.scrollHeight }; limit += PAGE_SIZE; startPosts(); };
    A.toLatest = function () { unread = 0; jumpBottom(true); updateLatest(); };
    A.gotoPin = function (el) { gotoPost(el.getAttribute('data-a')); };
    A.light = function (el) {
        var p = find(pid(el)); if (!p || !p.image) return; var o = $('chLight');
        o.innerHTML = '<div class="x" data-act="back" aria-label="Close">' + ic('x', 22) + '</div><img src="' + esc(p.image) + '" alt="">'; o.style.display = 'flex';
        if (!ovHas('light')) ovPush('light', function () { o.style.display = 'none'; o.innerHTML = ''; });
    };
    A.reactPick = function (el) { var r = el.closest('.ch-react'); if (r) { r.classList.toggle('open'); el.style.display = 'none'; } };

    // ----- reactions (optimistic, then transaction)
    A.react = async function (el) {
        var id = pid(el), e = el.getAttribute('data-e'), p = find(id); if (!p || busy['r' + id]) return;
        busy['r' + id] = 1;
        var oldR = p.reactions, oldB = p.reactedBy;
        var r = Object.assign({}, p.reactions), b = Object.assign({}, p.reactedBy), cur = b[me];
        if (cur === e) { r[e] = Math.max(0, (r[e] || 0) - 1); delete b[me]; } else { if (cur) r[cur] = Math.max(0, (r[cur] || 0) - 1); r[e] = (r[e] || 0) + 1; b[me] = e; }
        p.reactions = r; p.reactedBy = b; renderFeed();
        try {
            await db.runTransaction(async function (t) {
                var ref = postsRef().doc(id), doc = await t.get(ref); if (!doc.exists) return;
                var d = doc.data(), rr = Object.assign({}, d.reactions), bb = Object.assign({}, d.reactedBy), c = bb[me];
                if (c === e) { rr[e] = Math.max(0, (rr[e] || 0) - 1); delete bb[me]; } else { if (c) rr[c] = Math.max(0, (rr[c] || 0) - 1); rr[e] = (rr[e] || 0) + 1; bb[me] = e; }
                t.update(ref, { reactions: rr, reactedBy: bb });
            });
        } catch (err) { p.reactions = oldR; p.reactedBy = oldB; renderFeed(); toast('Could not save your reaction'); }
        finally { delete busy['r' + id]; }
    };

    // ----- poll / deal / unlock interactions
    A.vote = async function (el) {
        var id = pid(el), i = +el.getAttribute('data-i'), p = find(id); if (!p || !p.poll || busy['v' + id]) return;
        if (p.status === 'scheduled') return; if (pollEnded(p)) { toast('This poll has ended'); return; }
        if (p.pollVotedBy && p.pollVotedBy[me] !== undefined) { toast('You already voted'); return; }
        busy['v' + id] = 1;
        try {
            await db.runTransaction(async function (t) {
                var ref = postsRef().doc(id), doc = await t.get(ref); if (!doc.exists) return; var d = doc.data();
                if (d.pollVotedBy && d.pollVotedBy[me] !== undefined) return;
                var o = (d.poll.options || []).slice(); o[i] = Object.assign({}, o[i], { votes: ((o[i] && o[i].votes) || 0) + 1 });
                var up = { 'poll.options': o }; up['pollVotedBy.' + me] = i; t.update(ref, up);
            });
        } catch (e) { toast('Could not record your vote'); } finally { delete busy['v' + id]; }
    };
    A.join = async function (el) {
        var id = pid(el); if (busy['j' + id]) return; busy['j' + id] = 1;
        try {
            await db.runTransaction(async function (t) {
                var ref = postsRef().doc(id), doc = await t.get(ref); if (!doc.exists) return; var d = doc.data(), has = d.groupBuyJoinedBy && d.groupBuyJoinedBy[me], up = {};
                up['groupbuy.joined'] = FV.increment(has ? -1 : 1); up['groupBuyJoinedBy.' + me] = has ? FV.delete() : true; t.update(ref, up);
            });
        } catch (e) { toast('Could not update. Try again.'); } finally { delete busy['j' + id]; }
    };
    A.boost = async function (el) {
        var id = pid(el); if (busy['b' + id]) return; busy['b' + id] = 1;
        try {
            await db.runTransaction(async function (t) {
                var ref = postsRef().doc(id), doc = await t.get(ref); if (!doc.exists) return; var d = doc.data(); if (!d.unlock || d.unlock.unlocked) return; if (d.unlockBoostedBy && d.unlockBoostedBy[me]) return;
                var n = Math.min(d.unlock.needed, (d.unlock.current || 0) + 1), up = { 'unlock.current': n, 'unlock.unlocked': n >= d.unlock.needed }; up['unlockBoostedBy.' + me] = true; t.update(ref, up);
            });
        } catch (e) { toast('Could not register your boost'); } finally { delete busy['b' + id]; }
    };

    // ----- subscribe / mute / leave
    A.subscribe = async function () {
        if (busy.sub || member) return; busy.sub = true;
        try {
            var u = await whenAuth(); if (!u) { toast('You need to be signed in'); return; }
            await subRef().set({ subscribedAt: FV.serverTimestamp(), muted: false }, { merge: true });
            await mySubRef().set({ subscribedAt: FV.serverTimestamp() });
            await chRef().update({ subscriberCount: FV.increment(1) });
            closeSheet(); toast('Subscribed to ' + ch.name);
        } catch (e) { console.error(e); toast('Could not subscribe. Try again.'); } finally { busy.sub = false; }
    };
    A.toggleMute = async function () {
        if (busy.mute) return; busy.mute = true;
        try { await subRef().set({ muted: !muted }, { merge: true }); toast(!muted ? 'Notifications muted' : 'Notifications on'); } catch (e) { toast('Could not update. Try again.'); } finally { busy.mute = false; }
    };
    A.muteRow = function () { afterSheet(A.toggleMute); };
    A.leaveAsk = function () { afterSheet(function () { confirmSheet('Leave ' + esc(ch.name) + '?', 'You will stop receiving its posts.', 'Leave channel', 'danger', async function () {
        try { await subRef().delete(); await mySubRef().delete(); await chRef().update({ subscriberCount: FV.increment(-1) }); toast('You left the channel'); } catch (e) { toast('Could not leave. Try again.'); }
    }); }); };

    // ----- info / menu sheets
    A.info = function () { if (!ch) return; afterOrNow(infoSheet); };
    function afterOrNow(fn) { if (ovHas('sheet')) afterSheet(fn); else fn(); }
    function infoSheet() {
        var s = fmt(ch.subscriberCount) + (ch.subscriberCount === 1 ? ' subscriber' : ' subscribers');
        openSheet('<div class="ch-prof"><div class="av">' + (ch.avatarUrl ? '<img src="' + esc(ch.avatarUrl) + '" alt="">' : esc(ch.initials)) + '</div><h2>' + esc(ch.name) + (ch.verified ? VERIFIED.replace('width="16" height="16"', 'width="20" height="20"') : '') + '</h2>' +
            '<div class="sub">' + [ch.category, s, ch.privacy === 'private' ? 'Private' : 'Public channel'].filter(Boolean).join(' · ') + '</div>' + (ch.description ? '<div class="desc">' + linkify(ch.description) + '</div>' : '') +
            '<div class="acts">' + (isAdmin ? btn(ic('edit', 16) + ' Edit', 'editCh', 'sec') : !member ? btn('Subscribe', 'subscribe', 'pri') : btn(ic(muted ? 'bell' : 'bellOff', 16) + (muted ? ' Unmute' : ' Mute'), 'muteRow', 'sec')) + btn(ic('share', 16) + ' Share', 'share', 'sec') + '</div></div>' +
            '<div style="height:8px"></div>' + row('link', esc(ch.link), 'Channel link', 'copyLink'));
    }
    A.menu = function () {
        if (!ch) return;
        var h = '<div class="ch-sh-t" style="padding-bottom:10px">' + esc(ch.name) + '</div>' + row('info', 'Channel info', '', 'infoRow');
        if (member || isAdmin) h += row(muted ? 'bell' : 'bellOff', muted ? 'Unmute notifications' : 'Mute notifications', '', 'muteRow');
        h += row('bookmark', 'Saved messages', Object.keys(savedIds).length + ' saved', 'savedList') + row('share', 'Share channel', '', 'share') + row('link', 'Copy link', '', 'copyLink');
        if (isAdmin) h += '<div class="ch-sep-l"></div>' + row('edit', 'Edit channel', '', 'editCh') + row('clock', 'Scheduled posts', '', 'scheduled') + row('chart', 'Insights', '', 'insights') + row('users', 'Admins', (1 + ch.adminUsernames.filter(function (u) { return u !== ch.creatorUsername; }).length) + ' admin(s)', 'admins');
        else h += '<div class="ch-sep-l"></div>' + row('flag', 'Report channel', '', 'reportCh', null, 'danger') + (member ? row('out', 'Leave channel', '', 'leaveAsk', null, 'danger') : '');
        openSheet(h);
    };
    A.infoRow = function () { afterSheet(infoSheet); };
    A.copyLink = function () { var u = channelUrl(); closeSheet(); copyText(u, 'Link copied'); };
    function copyText(t, msg) { try { navigator.clipboard.writeText(t).then(function () { toast(msg || 'Copied'); }, function () { toast('Could not copy'); }); } catch (e) { toast('Could not copy'); } }
    A.share = function () { shareUrl(channelUrl(), ch ? ch.name : 'Channel'); };
    function shareUrl(u, title) {
        if (navigator.share) { closeSheet(); navigator.share({ title: title, url: u }).catch(function () {}); return; }
        afterOrNow(function () {
            var e = encodeURIComponent(u), tt = encodeURIComponent(title);
            openSheet('<div class="ch-sh-t">Share</div><div style="height:6px"></div>' + row('send', 'WhatsApp', '', 'out', 'https://wa.me/?text=' + tt + '%20' + e) + row('send', 'Telegram', '', 'out', 'https://t.me/share/url?url=' + e + '&text=' + tt) + row('send', 'X', '', 'out', 'https://twitter.com/intent/tweet?url=' + e + '&text=' + tt) + row('copy', 'Copy link', '', 'copyLink'));
        });
    }
    A.out = function (el) { window.open(el.getAttribute('data-a'), '_blank', 'noopener'); };

    // ----- saved messages
    A.savedList = function () {
        afterSheet(function () {
            var s = posts.filter(function (p) { return savedIds[p.id]; }).reverse();
            openSheet('<div class="ch-sh-t">Saved messages</div>' + (s.length ? '<div style="height:6px"></div>' + s.map(function (p) { return '<div class="ch-row" data-act="hit" data-a="' + esc(p.id) + '"><div class="t">' + esc(snippet(p).slice(0, 90)) + '<small>' + esc(dayLabel(p.timestamp) + ' · ' + clock(p.timestamp)) + '</small></div></div>'; }).join('') : '<div class="ch-sh-m">Nothing saved yet. Use ⋯ on a post to save it.</div>'));
        });
    };
    A.hit = function (el) { var id = pid(el); if (ovHas('search')) afterClose('search', function () { gotoPost(id); }); else afterSheet(function () { gotoPost(id); }); };

    // ----- per-post menu
    A.postMenu = function (el) {
        var id = pid(el), p = find(id); if (!p) return; var sv = savedIds[id], sched = p.status === 'scheduled';
        var h = '<div class="ch-sh-t" style="padding-bottom:10px">Message</div>' + (p.content ? row('copy', 'Copy text', '', 'copyPost', id) : '') + (!sched ? row('bookmark', sv ? 'Remove from saved' : 'Save message', '', 'savePost', id) + row('share', 'Share', '', 'sharePost', id) : '');
        if (isAdmin) h += '<div class="ch-sep-l"></div>' + (!sched ? row('pin', p.pinned ? 'Unpin' : 'Pin to top', '', 'pinPost', id) : '') + ((p.type === 'poll' ? false : true) ? row('edit', 'Edit', '', 'editPost', id) : '') + row('trash', 'Delete', '', 'delPost', id, 'danger');
        else h += '<div class="ch-sep-l"></div>' + row('flag', 'Report', '', 'reportPost', id, 'danger');
        openSheet(h);
    };
    A.copyPost = function (el) { var p = find(pid(el)); closeSheet(); if (p) copyText(p.content || '', 'Copied'); };
    A.sharePost = function (el) { shareUrl(channelUrl(pid(el)), ch.name); };
    A.savePost = function (el) {
        var id = pid(el), ref = db.collection('users').doc(me).collection('savedPosts').doc(cid + '__' + id); closeSheet();
        if (savedIds[id]) { delete savedIds[id]; renderFeed(); ref.delete().catch(function () {}); toast('Removed from saved'); }
        else { savedIds[id] = 1; renderFeed(); ref.set({ channelId: cid, postId: id, savedAt: FV.serverTimestamp() }).catch(function () {}); toast('Saved'); }
    };
    A.pinPost = async function (el) {
        var id = pid(el), p = find(id); closeSheet(); if (!p) return;
        try {
            if (p.pinned) await postsRef().doc(id).update({ pinned: false });
            else { await Promise.all(posts.filter(function (x) { return x.pinned; }).map(function (x) { return postsRef().doc(x.id).update({ pinned: false }); })); await postsRef().doc(id).update({ pinned: true }); }
            toast(p.pinned ? 'Unpinned' : 'Pinned');
        } catch (e) { toast('Could not update. Try again.'); }
    };
    A.editPost = function (el) {
        var id = pid(el), p = find(id); if (!p) return; sheetState.editId = id;
        afterSheet(function () { openSheet('<div class="ch-sh-t">Edit message</div>' + area('', 'ep_text', p.content, 'Message', 5) + btns(btn('Save changes', 'saveEditPost', 'pri'), btn('Cancel', 'closeSheet', 'sec'))); });
    };
    A.saveEditPost = async function () {
        var id = sheetState.editId, text = $('ep_text').value.trim(), p = find(id); if (!p) return;
        if (!text && !p.image && !p.video) { toast('A message cannot be empty'); return; }
        try { await postsRef().doc(id).update({ content: text, edited: true }); if (p.status !== 'scheduled') db.collection('posts').doc('ch_' + cid + '_' + id).update({ content: text }).catch(function () {}); closeSheet(); toast('Message updated'); }
        catch (e) { toast('Could not save. Try again.'); }
    };
    A.delPost = function (el) {
        var id = pid(el); afterSheet(function () { confirmSheet('Delete this message?', 'It will be removed for every subscriber and from the feed. This can’t be undone.', 'Delete', 'danger', async function () {
            try { await postsRef().doc(id).delete(); db.collection('posts').doc('ch_' + cid + '_' + id).delete().catch(function () {}); toast('Message deleted'); } catch (e) { toast('Could not delete. Try again.'); }
        }); });
    };

    // ----- report
    var REASONS = [['Misleading or false information', 'Claims that are untrue'], ['Scam or fraud', 'Asking for money or personal details'], ['Hate speech or harassment', 'Attacks on people or groups'], ['Inappropriate content', 'Sexual, violent or disturbing'], ['Impersonation', 'Pretending to be someone else'], ['Something else', '']];
    function reportSheet(target, id) {
        sheetState.rep = { target: target, id: id, reason: null };
        openSheet('<div class="ch-sh-t">Report</div><div class="ch-sh-m">Choose a reason. Your report goes to Nexus and the channel isn’t told who sent it.</div>' + REASONS.map(function (r, i) { return radio(r[0], r[1], false, 'pickReason', i); }).join('') + btns(btn('Send report', 'sendReport', 'pri'), btn('Cancel', 'closeSheet', 'sec')));
    }
    A.reportCh = function () { afterSheet(function () { reportSheet('channel', cid); }); };
    A.reportPost = function (el) { var id = pid(el); afterSheet(function () { reportSheet('channelPost', id); }); };
    A.pickReason = function (el) { var i = +pid(el); sheetState.rep.reason = REASONS[i][0]; Array.prototype.forEach.call(document.querySelectorAll('#chSheet [data-act="pickReason"] .ch-dot'), function (d, k) { d.classList.toggle('on', k === i); }); };
    A.sendReport = function () {
        var r = sheetState.rep; if (!r || !r.reason) { toast('Choose a reason first'); return; }
        db.collection('reports').add({ targetType: r.target, targetId: r.id, channelId: cid, reason: r.reason, reporterUsername: me || null, timestamp: FV.serverTimestamp() }).then(function () { toast('Report sent. Thank you.'); }).catch(function () { toast('Could not send the report'); });
        closeSheet();
    };

    // ----- search
    A.search = function () {
        if (!ch || locked()) return; var o = $('chSearch'); if (!o || ovHas('search')) return;
        o.style.display = 'flex'; ovPush('search', function () { o.style.display = 'none'; }); $('chSearchInput').value = ''; runSearch('');
        setTimeout(function () { try { $('chSearchInput').focus(); } catch (e) {} }, 60);
    };
    function runSearch(q) {
        var b = $('chSearchBody'); q = q.trim().toLowerCase();
        if (!q) { b.innerHTML = empty('search', 'Search this channel', 'Find messages by what they say.'); return; }
        var hits = visible().filter(function (p) { return (snippet(p) + ' ' + (p.poll ? (p.poll.options || []).map(function (o) { return o.text; }).join(' ') : '')).toLowerCase().indexOf(q) > -1; }).reverse().slice(0, 50);
        var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
        b.innerHTML = (hits.length ? hits.map(function (p) { return '<div class="ch-hit" data-act="hit" data-a="' + esc(p.id) + '"><small>' + esc(dayLabel(p.timestamp) + ' · ' + clock(p.timestamp)) + '</small><div>' + esc(snippet(p).slice(0, 160)).replace(re, '<mark>$1</mark>') + '</div></div>'; }).join('') : empty('search', 'No results', 'Nothing matches “' + esc(q) + '”.')) +
            (hasMore ? '<div style="text-align:center;padding:16px"><button class="ch-btn sec sm" data-act="olderSearch">Search earlier messages</button></div>' : '');
    }
    A.olderSearch = function () { limit += PAGE_SIZE; startPosts(); toast('Loading earlier messages…'); setTimeout(function () { runSearch($('chSearchInput').value); }, 900); };

    // ============================================================
    // COMPOSER (admins)
    // ============================================================
    function onComposerInput() { var t = $('chInput'); t.style.height = '42px'; t.style.height = Math.min(t.scrollHeight, 130) + 'px'; composerState(); fit(); }
    function onComposerKey(e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); A.send(); } }
    function composerState() {
        var t = $('chInput'), s = $('chSend'); if (!t || !s) return;
        var m = pending.media, has = t.value.trim().length > 0 || (m && m.url);
        s.classList.toggle('dis', !has || !!(m && m.uploading) || !!busy.pub);
    }
    function renderChips() {
        var c = $('chChips'); if (!c) return; var h = '', m = pending.media;
        if (m) h += '<div class="ch-chip"><div class="th"' + (m.type === 'image' && m.local ? ' style="background-image:url(' + m.local + ')"' : '') + '>' + (m.type === 'video' ? ic('play', 18) : '') + '</div><div class="tx">' + esc(m.name || (m.type === 'video' ? 'Video' : 'Photo')) + '<small>' + (m.uploading ? 'Uploading ' + (m.progress || 0) + '%' : (m.error ? 'Upload failed' : 'Ready')) + '</small>' + (m.uploading ? '<div class="ch-prog"><i style="width:' + (m.progress || 0) + '%"></i></div>' : '') + '</div><button class="x" data-act="rmMedia" aria-label="Remove">' + ic('x', 16) + '</button></div>';
        if (pending.schedule) h += '<div class="ch-chip sch">' + ic('clock', 15) + '<div class="tx">Scheduled · ' + esc(dt(pending.schedule)) + '</div><button class="x" data-act="rmSched" aria-label="Remove">' + ic('x', 16) + '</button></div>';
        c.innerHTML = h; composerState(); fit();
    }
    A.rmMedia = function () { var m = pending.media; if (m) { if (m.xhr) try { m.xhr.abort(); } catch (e) {} if (m.local) try { URL.revokeObjectURL(m.local); } catch (e) {} } pending.media = null; renderChips(); };
    A.rmSched = function () { pending.schedule = null; renderChips(); };
    A.attach = function () {
        openSheet('<div class="ch-sh-t">Add to your broadcast</div><div class="ch-grid">' +
            [['image', 'Photo', 'pickPhoto'], ['video', 'Video', 'pickVideo'], ['poll', 'Poll', 'pollSheet'], ['cart', 'Group deal', 'dealSheet'], ['box', 'Delivery proof', 'proofSheet'], ['unlock', 'Community unlock', 'unlockSheet'], ['clock', pending.schedule ? 'Reschedule' : 'Schedule', 'schedSheet']].map(function (x) { return '<div class="g" data-act="' + x[2] + '"><i>' + ic(x[0], 22) + '</i>' + x[1] + '</div>'; }).join('') + '</div>');
    };
    A.pickPhoto = function () { filePick('image/*'); };
    A.pickVideo = function () { filePick('video/*'); };
    function filePick(accept) { closeSheet(); var f = $('chFile'); f.value = ''; f.accept = accept; setTimeout(function () { f.click(); }, 60); }
    function uploadFile(file, onProg, holder) {
        return new Promise(function (resolve, reject) {
            whenAuth().then(function (u) {
                if (!u) { reject(new Error('You need to be signed in')); return; }
                return u.getIdToken().then(function (tok) {
                    var fd = new FormData(); fd.append('file', file); fd.append('type', 'posts'); fd.append('username', me);
                    var x = new XMLHttpRequest(); if (holder) holder.xhr = x;
                    x.open('POST', UPLOAD_URL); x.setRequestHeader('Authorization', 'Bearer ' + tok);
                    x.upload.onprogress = function (e) { if (e.lengthComputable && onProg) onProg(Math.round(e.loaded / e.total * 100)); };
                    x.onerror = function () { reject(new Error('Network error')); }; x.onabort = function () { reject(new Error('cancelled')); };
                    x.onload = function () {
                        var d; try { d = JSON.parse(x.responseText); } catch (e) { reject(new Error('Server returned an invalid response')); return; }
                        var url = d && (d.url || d.mediaUrl || d.secure_url);
                        if (x.status >= 200 && x.status < 300 && d.success !== false && url) resolve(url); else reject(new Error((d && d.error) || 'Upload failed'));
                    };
                    x.send(fd);
                });
            }).catch(reject);
        });
    }
    function onFile(e) {
        var f = e.target.files && e.target.files[0]; if (!f) return;
        var isV = f.type.indexOf('video/') === 0, isI = f.type.indexOf('image/') === 0; if (!isV && !isI) { toast('Choose a photo or a video'); return; }
        if (pending.media) A.rmMedia();
        var m = pending.media = { type: isV ? 'video' : 'image', name: f.name, uploading: true, progress: 0, local: isI ? URL.createObjectURL(f) : null, url: null };
        renderChips();
        uploadFile(f, function (n) { m.progress = n; if (pending.media === m) renderChips(); }, m).then(function (url) { m.url = url; m.uploading = false; if (pending.media === m) renderChips(); })
            .catch(function (err) { if (pending.media !== m) return; if (err.message !== 'cancelled') toast('Upload failed: ' + err.message); pending.media = null; if (m.local) try { URL.revokeObjectURL(m.local); } catch (x) {} renderChips(); });
    }
    A.send = async function () {
        var t = $('chInput'); if (!t || busy.pub) return; var text = t.value.trim(), m = pending.media;
        if (m && m.uploading) { toast('Wait for the upload to finish'); return; }
        if (!text && !(m && m.url)) return;
        var f = { type: m ? m.type : 'text', content: text, image: m && m.type === 'image' ? m.url : null, video: m && m.type === 'video' ? m.url : null };
        var ok = await createPost(f);
        if (ok) { t.value = ''; t.style.height = '42px'; if (pending.media) { if (pending.media.local) try { URL.revokeObjectURL(pending.media.local); } catch (e) {} pending.media = null; } renderChips(); }
    };

    async function createPost(fields) {
        if (busy.pub) return false; busy.pub = true; composerState();
        try {
            var u = await whenAuth(); if (!u) { toast('You need to be signed in'); return false; }
            var sched = pending.schedule && pending.schedule > Date.now() + 20000;
            var doc = Object.assign({ type: 'text', content: '', image: null, video: null, poster: null, views: 0, reactions: {}, reactedBy: {}, pinned: false, edited: false, authorUsername: me, status: sched ? 'scheduled' : 'published' }, fields);
            doc.timestamp = sched ? TS.fromMillis(pending.schedule) : FV.serverTimestamp();
            if (sched) doc.publishAt = pending.schedule;
            var ref = await postsRef().add(doc);
            if (!sched) mirror(ref.id, doc, null);
            stick = true; var when = pending.schedule; pending.schedule = null; renderChips();
            toast(sched ? 'Scheduled for ' + dt(when) : 'Sent to ' + fmt(ch.subscriberCount) + (ch.subscriberCount === 1 ? ' subscriber' : ' subscribers'));
            return true;
        } catch (e) { console.error(e); toast('Could not send. Try again.'); return false; }
        finally { busy.pub = false; composerState(); }
    }

    // ----- post → social feed (public channels only)
    function mirror(id, p, ts) {
        if (!ch || ch.privacy === 'private') return Promise.resolve();
        var d = {
            channelId: cid, channelPostId: id, channelPostType: p.type || 'text', channelName: ch.name, username: ch.name, fullName: ch.name, userProfilePic: ch.avatarUrl || BLANK,
            content: p.content || '', mediaUrl: p.image || p.video || null, mediaType: p.image ? 'image' : (p.video ? 'video' : null),
            likesCount: 0, commentsCount: 0, pinned: false, authorUsername: me, visible: true, source: 'channel', timestamp: ts || FV.serverTimestamp()
        };
        return db.collection('posts').doc('ch_' + cid + '_' + id).set(d).catch(function (e) { console.warn('Feed mirror failed:', e); });
    }
    function publishDue() {
        if (!isAdmin) return; var now = Date.now();
        posts.filter(function (p) { return p.status === 'scheduled' && (ms(p.publishAt) || p.timestamp) <= now && !dueBusy[p.id]; }).forEach(function (p) {
            dueBusy[p.id] = 1;
            postsRef().doc(p.id).update({ status: 'published', timestamp: FV.serverTimestamp() }).then(function () { return mirror(p.id, p, null); }).catch(function () { delete dueBusy[p.id]; });
        });
    }
    // posts made before the feed integration existed: add the newest ones once, with their original dates
    function backfillFeed() {
        if (backfilled || !isAdmin || !ch || ch.privacy === 'private') return; backfilled = true;
        var recent = posts.filter(function (p) { return p.status !== 'scheduled' && p.timestamp <= Date.now(); }).slice(-20);
        recent.forEach(function (p) {
            var ref = db.collection('posts').doc('ch_' + cid + '_' + p.id);
            ref.get().then(function (s) { if (!s.exists) mirror(p.id, p, TS.fromMillis(p.timestamp)); }).catch(function () {});
        });
    }

    // ----- poll
    A.pollSheet = function () {
        sheetState.dur = 24;
        afterSheet(function () {
            openSheet('<div class="ch-sh-t">Create a poll</div>' + field('Question', 'pl_q', '', 'Ask something…') + '<div id="pl_opts">' + field('Option 1', 'pl_o0', '', '') + field('Option 2', 'pl_o1', '', '') + '</div>' +
                '<div class="ch-sh-btns" style="padding-top:0;padding-bottom:12px">' + btn(ic('plus', 16) + ' Add option', 'addOpt', 'sec') + '</div><div class="ch-sh-m" style="padding-bottom:6px">Poll length</div>' +
                '<div class="ch-seg" id="pl_seg"><div class="on" data-act="dur" data-a="24">24 hours</div><div data-act="dur" data-a="72">3 days</div><div data-act="dur" data-a="168">7 days</div></div>' + btns(btn('Publish poll', 'mkPoll', 'pri')));
        });
    };
    A.addOpt = function () { var w = $('pl_opts'), n = w.querySelectorAll('input').length; if (n >= 6) { toast('A poll can have up to 6 options'); return; } w.insertAdjacentHTML('beforeend', field('Option ' + (n + 1), 'pl_o' + n, '', '')); };
    A.dur = function (el) { sheetState.dur = +pid(el); Array.prototype.forEach.call(document.querySelectorAll('#pl_seg div'), function (d) { d.classList.toggle('on', d === el); }); };
    A.mkPoll = async function () {
        var q = $('pl_q').value.trim(), o = Array.prototype.map.call($('pl_opts').querySelectorAll('input'), function (i) { return i.value.trim(); }).filter(Boolean);
        if (!q || o.length < 2) { toast('Add a question and at least 2 options'); return; }
        var ok = await createPost({ type: 'poll', content: q, poll: { question: q, options: o.map(function (t) { return { text: t, votes: 0 }; }), endsAt: Date.now() + sheetState.dur * 3600000 }, pollVotedBy: {} });
        if (ok) closeSheet();
    };

    // ----- group deal
    A.dealSheet = function () {
        afterSheet(function () {
            openSheet('<div class="ch-sh-t">Start a group deal</div><div class="ch-sh-m">The price drops for everyone once enough people join.</div>' + area('Describe the deal', 'gb_t', '', 'What are you selling?', 3) +
                '<div class="ch-two">' + field('Buyers needed', 'gb_n', '', 'e.g. 50', 'number', 'inputmode="numeric" min="2"') + '<div class="ch-field"><label>Currency</label><select id="gb_c"><option>₦</option><option>$</option><option>£</option><option>€</option></select></div></div>' +
                '<div class="ch-two">' + field('Regular price', 'gb_o', '', '0', 'number', 'inputmode="decimal" min="0"') + field('Group price', 'gb_d', '', '0', 'number', 'inputmode="decimal" min="0"') + '</div>' + btns(btn('Publish deal', 'mkDeal', 'pri')));
        });
    };
    A.mkDeal = async function () {
        var t = $('gb_t').value.trim(), n = parseInt($('gb_n').value, 10), o = parseFloat($('gb_o').value) || 0, d = parseFloat($('gb_d').value);
        if (!t) { toast('Describe the deal first'); return; } if (!n || n < 2) { toast('Set how many buyers are needed'); return; } if (isNaN(d) || d <= 0) { toast('Enter the group price'); return; } if (o && d >= o) { toast('The group price should be lower'); return; }
        var ok = await createPost({ type: 'groupbuy', content: t, groupbuy: { target: n, joined: 0, originalPrice: o, dropPrice: d, currency: $('gb_c').value }, groupBuyJoinedBy: {} });
        if (ok) closeSheet();
    };

    // ----- delivery proof
    A.proofSheet = function () {
        afterSheet(function () {
            var m = pending.media, ok = m && m.type === 'image';
            openSheet('<div class="ch-sh-t">Post a delivery proof</div><div class="ch-sh-m">' + (ok ? 'Your attached photo will be used as proof.' : 'Tip: attach a Photo first so buyers can see the delivery.') + '</div>' + area('', 'dp_t', '', 'e.g. Order #123 delivered to the customer.', 3) + btns(btn('Publish proof', 'mkProof', 'pri')));
        });
    };
    A.mkProof = async function () {
        var t = $('dp_t').value.trim(), m = pending.media; if (!t) { toast('Add a short description'); return; } if (m && m.uploading) { toast('Wait for the upload to finish'); return; }
        var ok = await createPost({ type: 'delivery', content: t, image: m && m.type === 'image' ? m.url : null });
        if (ok) { if (pending.media) { pending.media = null; renderChips(); } closeSheet(); }
    };

    // ----- crowd unlock
    A.unlockSheet = function () {
        afterSheet(function () {
            openSheet('<div class="ch-sh-t">Community unlock</div><div class="ch-sh-m">Subscribers tap “Help unlock”. When the goal is reached, the hidden message is revealed.</div>' + area('Teaser', 'ul_t', '', 'What will they unlock?', 3) + field('Taps needed', 'ul_n', '', 'e.g. 200', 'number', 'inputmode="numeric" min="2"') + area('Hidden message (optional)', 'ul_r', '', 'Shown to everyone once unlocked', 3) + btns(btn('Publish', 'mkUnlock', 'pri')));
        });
    };
    A.mkUnlock = async function () {
        var t = $('ul_t').value.trim(), n = parseInt($('ul_n').value, 10), r = $('ul_r').value.trim();
        if (!t) { toast('Describe what will be unlocked'); return; } if (!n || n < 2) { toast('Set how many taps are needed'); return; }
        var ok = await createPost({ type: 'unlock', content: t, unlock: { needed: n, current: 0, unlocked: false, reveal: r || null }, unlockBoostedBy: {} });
        if (ok) closeSheet();
    };

    // ----- schedule
    A.schedSheet = function () {
        afterSheet(function () {
            openSheet('<div class="ch-sh-t">Schedule</div><div class="ch-sh-m">Your next broadcast will be published at this time.</div>' + field('Date and time', 'sc_dt', '', '', 'datetime-local') + btns(btn('Confirm time', 'mkSched', 'pri'), pending.schedule ? btn('Remove schedule', 'rmSchedSheet', 'sec') : ''));
        });
    };
    A.mkSched = function () {
        var v = $('sc_dt').value; if (!v) { toast('Pick a date and time'); return; } var t = new Date(v).getTime();
        if (!t || t < Date.now() + 60000) { toast('Choose a time in the future'); return; }
        pending.schedule = t; closeSheet(); renderChips(); toast('Next broadcast scheduled for ' + dt(t));
    };
    A.rmSchedSheet = function () { pending.schedule = null; closeSheet(); renderChips(); };
    A.scheduled = function () {
        afterSheet(function () {
            var s = posts.filter(function (p) { return p.status === 'scheduled'; });
            openSheet('<div class="ch-sh-t">Scheduled posts</div><div class="ch-sh-m">Hidden from subscribers until their time arrives. Posts publish while an admin has this channel open.</div>' + (s.length ? s.map(function (p) { return '<div class="ch-adm"><span>' + esc(snippet(p).slice(0, 56)) + '<small>' + esc(dt(ms(p.publishAt) || p.timestamp)) + '</small></span><button class="ch-chipbtn" data-act="pubNow" data-a="' + esc(p.id) + '">Post now</button><button class="ch-chipbtn danger" data-act="delPost" data-a="' + esc(p.id) + '">Delete</button></div>'; }).join('') : empty('clock', 'Nothing scheduled', 'Posts you schedule will wait here.')));
        });
    };
    A.pubNow = function (el) { var id = pid(el), p = find(id); if (!p) return; closeSheet(); dueBusy[id] = 1; postsRef().doc(id).update({ status: 'published', timestamp: FV.serverTimestamp() }).then(function () { mirror(id, p, null); toast('Published'); }).catch(function () { delete dueBusy[id]; toast('Could not publish'); }); };

    // ============================================================
    // ADMIN — edit channel, admins, insights
    // ============================================================
    A.editCh = function () {
        if (!isAdmin || !ch) return;
        afterOrNow(function () {
            sheetState.avatar = ch.avatarUrl || ''; sheetState.privacy = ch.privacy;
            openSheet('<div class="ch-sh-t">Edit channel</div><div class="ch-editav"><div class="av" id="ed_av">' + (ch.avatarUrl ? '<img src="' + esc(ch.avatarUrl) + '" alt="">' : esc(ch.initials)) + '</div>' + btn('Change photo', 'pickAvatar', 'sec sm') + '</div>' +
                field('Name', 'ed_name', ch.name) + field('Category', 'ed_cat', ch.category) + area('Description', 'ed_desc', ch.description, 'What is this channel about?', 4) +
                '<div class="ch-sh-m" style="padding-bottom:6px">Visibility</div><div class="ch-seg" id="ed_seg"><div class="' + (ch.privacy !== 'private' ? 'on' : '') + '" data-act="priv" data-a="public">Public</div><div class="' + (ch.privacy === 'private' ? 'on' : '') + '" data-act="priv" data-a="private">Private</div></div>' +
                '<div class="ch-sh-m" id="ed_pm">' + (ch.privacy === 'private' ? 'Only invited members can read it. Posts stay out of the Nexus feed.' : 'Anyone can read it, and new posts appear in the Nexus feed.') + '</div>' + btns(btn('Save changes', 'saveCh', 'pri')));
        });
    };
    A.priv = function (el) { sheetState.privacy = pid(el); Array.prototype.forEach.call(document.querySelectorAll('#ed_seg div'), function (d) { d.classList.toggle('on', d === el); }); $('ed_pm').textContent = sheetState.privacy === 'private' ? 'Only invited members can read it. Posts stay out of the Nexus feed.' : 'Anyone can read it, and new posts appear in the Nexus feed.'; };
    A.pickAvatar = function () { var f = $('chFile'); f.value = ''; f.accept = 'image/*'; f.setAttribute('data-for', 'avatar'); setTimeout(function () { f.click(); }, 30); };
    function onAvatarFile(f) {
        if (!f || f.type.indexOf('image/') !== 0) { toast('Choose a photo'); return; }
        var av = $('ed_av'); if (av) av.style.opacity = '.5'; toast('Uploading photo…');
        uploadFile(f, null).then(function (u) { sheetState.avatar = u; var a = $('ed_av'); if (a) { a.innerHTML = '<img src="' + esc(u) + '" alt="">'; a.style.opacity = ''; } })
            .catch(function (e) { var a = $('ed_av'); if (a) a.style.opacity = ''; toast('Upload failed: ' + e.message); });
    }
    A.saveCh = async function () {
        var name = $('ed_name').value.trim(); if (!name) { toast('Channel name is required'); return; }
        var was = ch.privacy, now = sheetState.privacy || 'public';
        try {
            await chRef().update({ name: name, initials: name.slice(0, 2).toUpperCase(), category: $('ed_cat').value.trim(), description: $('ed_desc').value.trim(), avatarUrl: sheetState.avatar || '', privacy: now });
            if (was !== 'private' && now === 'private') {
                db.collection('posts').where('channelId', '==', cid).get().then(function (s) { s.forEach(function (d) { d.ref.delete().catch(function () {}); }); }).catch(function () {});
            } else if (was === 'private' && now !== 'private') { backfilled = false; setTimeout(backfillFeed, 800); }
            closeSheet(); toast('Channel updated');
        } catch (e) { console.error(e); toast('Could not save. Try again.'); }
    };
    A.admins = function () { if (isAdmin) afterOrNow(adminsSheet); };
    function adminsSheet() {
        var admins = ch.adminUsernames.filter(function (u) { return u !== ch.creatorUsername; }), isOwner = ch.creatorUsername === me;
        var h = '<div class="ch-sh-t">Admins</div><div class="ch-sh-m">Admins can post, edit the channel and manage other admins.</div><div class="ch-adm">' + ic('shield', 20) + '<span>' + esc(ch.creatorUsername || '—') + '<small>Owner</small></span></div>';
        admins.forEach(function (u) { h += '<div class="ch-adm">' + ic('users', 20) + '<span>' + esc(u) + '<small>Admin</small></span>' + (isOwner && u !== me ? '<button class="ch-chipbtn danger" data-act="rmAdmin" data-a="' + esc(u) + '">Remove</button>' : '') + '</div>'; });
        if (isOwner) h += '<div style="height:10px"></div>' + field('Add admin (username)', 'ad_u', '', 'username', 'text', 'autocapitalize="none" autocomplete="off"') + btns(btn('Add admin', 'addAdmin', 'pri'));
        openSheet(h);
    }
    A.addAdmin = async function () {
        var u = $('ad_u').value.trim(); if (!u) return;
        try { var s = await db.collection('users').doc(u).get(); if (!s.exists) { toast('No user named “' + u + '”'); return; } await chRef().update({ adminUsernames: FV.arrayUnion(u) }); toast(u + ' is now an admin'); setTimeout(function () { if (ovHas('sheet') && ch) adminsSheet(); }, 400); } catch (e) { toast('Could not add admin'); }
    };
    A.rmAdmin = async function (el) { var u = pid(el); try { await chRef().update({ adminUsernames: FV.arrayRemove(u) }); toast(u + ' removed'); setTimeout(function () { if (ovHas('sheet') && ch) adminsSheet(); }, 400); } catch (e) { toast('Could not remove admin'); } };
    A.insights = function () {
        if (!isAdmin) return;
        afterOrNow(function () {
            var list = posts.filter(function (p) { return p.status !== 'scheduled'; }), views = 0, reacts = 0;
            list.forEach(function (p) { views += p.views || 0; reacts += Object.keys(p.reactions || {}).reduce(function (s, k) { return s + (p.reactions[k] || 0); }, 0); });
            var avg = list.length ? Math.round(views / list.length) : 0, eng = views ? Math.round(reacts / views * 1000) / 10 : 0;
            var top = list.slice().sort(function (a, b) { return (b.views || 0) - (a.views || 0); }).slice(0, 3);
            openSheet('<div class="ch-sh-t">Insights</div><div class="ch-sh-m">Based on the ' + list.length + ' most recent posts' + (hasMore ? ' loaded' : '') + '.</div><div class="ch-ins"><div><b>' + fmt(ch.subscriberCount) + '</b><small>Subscribers</small></div><div><b>' + fmt(views) + '</b><small>Total views</small></div><div><b>' + fmt(avg) + '</b><small>Avg. views per post</small></div><div><b>' + eng + '%</b><small>Reactions per view</small></div></div>' +
                (top.length && views ? '<div class="ch-sh-m" style="padding-top:18px">Top posts</div><div class="ch-top">' + top.map(function (p) { return '<div class="it"><span>' + esc(snippet(p).slice(0, 60)) + '</span><b>' + fmt(p.views) + ' views</b></div>'; }).join('') + '</div>' : ''));
        });
    };

    // ============================================================
    // GLOBAL WIRING + LIFECYCLE
    // ============================================================
    function onClick(e) {
        if (e.target && e.target.id === 'chSheetBg') { closeSheet(); return; }
        var el = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!el || !el.closest('#page-content')) return;
        var fn = A[el.getAttribute('data-act')]; if (fn) { e.preventDefault(); fn(el, e); }
    }
    function onSearchInput(e) { runSearch(e.target.value); }
    function onFileChange(e) {
        var f = e.target; if (f.getAttribute('data-for') === 'avatar') { f.removeAttribute('data-for'); onAvatarFile(f.files && f.files[0]); return; }
        onFile(e);
    }
    function onImgLoad(e) { if (e.target && e.target.tagName === 'IMG' && e.target.closest('.ch-media')) e.target.classList.add('loaded'); }

    function initPage() {
        teardown();   // idempotent: init can be called twice (router + direct load)
        me = localStorage.getItem('nexus_user_session');
        if (!me) { window.location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname + location.search); return; }
        var q = new URLSearchParams(window.location.search);
        cid = q.get('channel') || q.get('id') || null; jumpPost = q.get('post');
        ch = null; chMissing = false; chError = null; isAdmin = false; member = false; memberKnown = false; muted = false;
        posts = []; loaded = false; limit = PAGE_SIZE; hasMore = false; savedIds = {}; pending = { media: null, schedule: null };
        sheetState = {}; busy = {}; ovStack = []; barMode = ''; firstRender = true; stick = false; keepAnchor = null; prevIds = {}; unread = 0; viewTimers = {}; dueBusy = {}; backfilled = false;

        // a previous page may have left scrolling locked — Channels must always scroll
        try { document.body.style.removeProperty('overflow'); document.body.style.removeProperty('position'); document.documentElement.style.removeProperty('overflow'); } catch (e) {}

        authReady = new Promise(function (resolve) { authUnsub = auth.onAuthStateChanged(function (u) { if (!u) window.location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname + location.search); resolve(u); }); });
        document.addEventListener('click', onClick);
        window.addEventListener('popstate', onPop, true);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', fit);
        document.addEventListener('load', onImgLoad, true);
        var si = $('chSearchInput'); if (si) si.addEventListener('input', onSearchInput);
        var fi = $('chFile'); if (fi) fi.addEventListener('change', onFileChange);
        boot();
    }

    function teardown() {
        unsubs.forEach(function (u) { try { u(); } catch (e) {} }); unsubs = [];
        if (postsUnsub) { try { postsUnsub(); } catch (e) {} postsUnsub = null; }
        if (authUnsub) { try { authUnsub(); } catch (e) {} authUnsub = null; }
        if (dueTimer) { clearInterval(dueTimer); dueTimer = null; }
        if (io) { try { io.disconnect(); } catch (e) {} io = null; }
        Object.keys(viewTimers).forEach(function (k) { clearTimeout(viewTimers[k]); }); viewTimers = {};
        if (pending && pending.media) { if (pending.media.xhr) try { pending.media.xhr.abort(); } catch (e) {} if (pending.media.local) try { URL.revokeObjectURL(pending.media.local); } catch (e) {} }
        pending = { media: null, schedule: null };
        document.removeEventListener('click', onClick);
        window.removeEventListener('popstate', onPop, true);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', fit);
        document.removeEventListener('load', onImgLoad, true);
        clearTimeout(toastT); clearTimeout(scrollT);
        ovStack = []; barMode = '';
    }
    function destroyPage() { teardown(); }

    window.NexusRouter.registerPage('channels.html', { init: initPage, destroy: destroyPage });
    if (window.NexusRouter.getCurrentPath() === 'channels.html') initPage();
})();
