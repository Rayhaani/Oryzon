/* ============================================================
   PAGES.JS — Nexus Pages (SPA: router.js loads this once, then calls init/destroy)
   ------------------------------------------------------------
   Everything lives inside ONE closure, so nothing here can collide with the global
   names of other page scripts (chats.js declares `let authReadyResolve` — a global
   `var` of the same name used to kill this whole file after navigating from chats.html,
   which is why the 3 dots and scrolling were dead until a refresh).
   All clicks inside the page go through ONE delegated handler (data-act="…").
   Only the names the untouched header uses (openModal, openMenuSheet) and the ones the
   shared post card calls (showToast, openNeuralMenu) are put on window — on every
   entry, and restored on exit.
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
    // post-card-template.js reads a global `db` (likes restore). Provide one on a direct load; when another page's script already declared it, leave it alone.
    try { if (new Function('return typeof db')() === 'undefined') window.db = db; } catch (e) {}

    // ---------- state (reset on every entry) ----------
    var me = null, slug = null, page = null, isOwner = false;
    var editShortcutDone = false;
    var following = false, saved = false, blocked = false, notifPref = 'All';
    var posts = [], postsLoaded = false, reviews = [], reviewsLoaded = false, products = [], events = [], schedCount = 0;
    var tab = 'posts', bioOpen = false, media = { photo: [], video: [], hl: [] };
    var unsubs = [], authUnsub = null, authReady = null, viewTracked = false, booted = false;
    var prevGlobals = null, ovStack = [], sheetState = {}, busy = {}, gated = '';

    var BLANK = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2790%27 height=%2790%27%3E%3C/svg%3E';

    // ---------- helpers ----------
    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function ms(t) { if (!t) return 0; if (t.toMillis) return t.toMillis(); if (t.seconds) return t.seconds * 1000; var d = new Date(t).getTime(); return isNaN(d) ? 0 : d; }
    function fmt(n) { n = n || 0; if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'; return String(n); }
    function ago(t) { var d = Date.now() - ms(t); if (d < 6e4) return 'Just now'; if (d < 36e5) return Math.floor(d / 6e4) + 'm ago'; if (d < 864e5) return Math.floor(d / 36e5) + 'h ago'; if (d < 6048e5) return Math.floor(d / 864e5) + 'd ago'; return new Date(ms(t)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
    function pageRef() { return db.collection('pages').doc(slug); }
    function myPageDoc() { return db.collection('users').doc(me).collection('myPages').doc(slug); }
    function pageUrl() { return location.origin + location.pathname.replace(/[^\/]*$/, '') + 'pages.html?page=' + encodeURIComponent(slug || ''); }
    var toastT = null;
    function toast(msg) { var t = $('pgToast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2300); }
    function sub(unsub) { unsubs.push(unsub); }
    function whenAuth() { return authReady || Promise.resolve(auth.currentUser); }
    function url(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : (u ? 'https://' + u : ''); }

    // ---------- overlay history: phone Back closes only the top overlay ----------
    function ovPush(name, closeFn) { ovStack.push({ name: name, closeFn: closeFn }); try { history.pushState({ pgOv: name }, '', location.href); } catch (e) {} }
    function ovHas(n) { return ovStack.some(function (o) { return o.name === n; }); }
    function ovBack() { if (!ovStack.length) return; try { history.back(); } catch (e) { var t = ovStack.pop(); try { t.closeFn(); } catch (e2) {} } }
    function onPop(e) { if (!ovStack.length) return; e.stopImmediatePropagation(); var t = ovStack.pop(); try { t.closeFn(); } catch (err) { console.error(err); } }
    (function () {
        var NO = window.NexusOverlay = window.NexusOverlay || {};
        if (NO.__pgWrapped) return; NO.__pgWrapped = true;
        var prev = NO.isOpen;
        NO.isOpen = function () { if (ovStack.length) return true; return typeof prev === 'function' ? prev.apply(NO, arguments) : false; };
    })();

    // ---------- bottom sheet ----------
    function openSheet(html) {
        var w = $('pgSheetWrap'); if (!w) return;
        $('pgSheet').innerHTML = '<div class="pg-grab"></div>' + html;
        w.style.display = 'block'; $('pgSheet').scrollTop = 0;
        if (!ovHas('sheet')) ovPush('sheet', function () { w.style.display = 'none'; });
    }
    function closeSheet() { if (ovHas('sheet')) ovBack(); }
    function afterSheet(fn) { closeSheet(); var t0 = Date.now(); (function w() { if (!ovHas('sheet') || Date.now() - t0 > 900) fn(); else setTimeout(w, 20); })(); }
    function row(icon, title, subt, act, a, cls) { return '<div class="pg-row ' + (cls || '') + '" data-act="' + act + '"' + (a != null ? ' data-a="' + esc(a) + '"' : '') + '><i class="' + icon + '"></i><div class="t">' + title + (subt ? '<small>' + subt + '</small>' : '') + '</div></div>'; }
    function radio(title, subt, on, act, a) { return '<div class="pg-row" data-act="' + act + '" data-a="' + esc(a) + '"><div class="t">' + title + (subt ? '<small>' + subt + '</small>' : '') + '</div><span class="pg-dot' + (on ? ' on' : '') + '"></span></div>'; }
    function field(label, id, val, ph, type) { return '<div class="pg-field"><label>' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"></div>'; }
    function area(label, id, val, ph, rows) { return '<div class="pg-field"><label>' + label + '</label><textarea id="' + id + '" rows="' + (rows || 4) + '" placeholder="' + esc(ph || '') + '">' + esc(val || '') + '</textarea></div>'; }
    function btns() { return '<div class="pg-sh-btns">' + Array.prototype.join.call(arguments, '') + '</div>'; }
    function btn(label, act, kind, a) { return '<button class="pg-btn ' + (kind || 'sec') + '" data-act="' + act + '"' + (a != null ? ' data-a="' + esc(a) + '"' : '') + '>' + label + '</button>'; }
    function confirmSheet(title, msg, label, kind, onYes) {
        sheetState.yes = onYes;
        openSheet('<div class="pg-sh-t">' + title + '</div><div class="pg-sh-m">' + msg + '</div>' + btns(btn(label, 'yes', kind), btn('Cancel', 'closeSheet', 'sec')));
    }

    // ============================================================
    // RENDER — hero
    // ============================================================
    function ratingInfo() {
        if (!reviews.length) return null;
        var sum = 0, cnt = [0, 0, 0, 0, 0]; reviews.forEach(function (r) { var s = Math.max(1, Math.min(5, r.rating | 0)); sum += s; cnt[s - 1]++; });
        return { avg: sum / reviews.length, n: reviews.length, cnt: cnt };
    }
    function stars(n) { var r = Math.round(n), s = ''; for (var i = 1; i <= 5; i++) s += i <= r ? '★' : '☆'; return s; }

    // Material icons used in the info block (same family as the reference design)
    var MI = {
        phone: '<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
        globe: '<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>',
        pin: '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
        clock: '<svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/></svg>'
    };
    var PLUS_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-act="createPost" aria-label="Create post"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    var PEN_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-act="editPage" aria-label="Edit page"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
    function renderHeaderIcons() { var o = $('pgHdrOwner'); if (o) o.innerHTML = isOwner ? PLUS_SVG + PEN_SVG : ''; }
    function renderHero() {
        if (!page) return;
        var name = page.name || 'Page', v = !!page.verified;
        var cover = $('pageCoverImg'); if (page.coverUrl) { cover.src = page.coverUrl; cover.style.display = ''; } else { cover.style.display = 'none'; }
        var av = $('pageAvatarImg'); av.onerror = function () { av.onerror = null; av.src = BLANK; }; av.src = page.avatarUrl || BLANK;
        $('pageNameTitle').textContent = name;
        $('pgVerified').innerHTML = (v ? '<svg class="nx-vf" width="14" height="14" viewBox="0 0 24 24" fill="#fde08d"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.97-.81-4.08s-2.49-1.46-4.08-1.27c-.66-1.1-1.91-1.81-3.17-1.81s-2.51.71-3.17 1.81c-1.58-.19-3.07.16-4.08 1.27s-1.27 2.69-.81 4.08c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.97.81 4.08s2.49 1.46 4.08 1.27c.66 1.1 1.91 1.81 3.17 1.81s2.51-.71 3.17-1.81c1.58.19 3.07-.16 4.08-1.27s1.27-2.69.81-4.08c1.31-.67 2.19-1.91 2.19-3.34z"/><path d="M10.54 16.25L6.85 12.5l1.44-1.44 2.25 2.25 5.27-5.27 1.44 1.44-6.71 6.77z" fill="#050505"/></svg>' : '') + (page.trustScore ? '<span class="pg-trust"><i class="fa-solid fa-shield-halved"></i> Trust ' + esc(page.trustScore) + '</span>' : '');
        var ht = $('headerTitleText'); if (ht && ht.childNodes[0]) ht.childNodes[0].textContent = name + ' ';
        var hv = $('headerVerifiedIcon'); if (hv) hv.style.display = v ? '' : 'none';

        var bio = (page.description || '').trim(), long = bio.length > 150 || bio.split('\n').length > 3;
        $('pgBioWrap').innerHTML = bio ? '<div class="pg-bio' + (long && !bioOpen ? ' clamp' : '') + '">' + esc(bio) + '</div>' + (long ? '<span class="pg-more" data-act="bio">' + (bioOpen ? 'Show less' : 'more') + '</span>' : '') : '';

        var f = [], loc = page.address || page.location, web = page.website;
        if (page.contactPhone) f.push('<div class="pg-fact">' + MI.phone + '<a href="tel:' + esc(page.contactPhone) + '">' + esc(page.contactPhone) + '</a></div>');
        if (web) f.push('<div class="pg-fact">' + MI.globe + '<a href="' + esc(url(web)) + '" target="_blank" rel="noopener">' + esc(String(web).replace(/^https?:\/\//i, '').replace(/\/$/, '')) + '</a></div>');
        if (loc) f.push('<div class="pg-fact">' + MI.pin + '<span>' + esc(loc) + '</span></div>');
        var hs = hoursState(); if (hs) f.push('<div class="pg-fact">' + MI.clock + '<span class="' + (hs.open ? 'open' : 'closed') + '">' + (hs.open ? 'Open now' : 'Closed') + '</span><span class="hrs">· ' + esc(hs.text) + '</span></div>');
        $('pgFacts').innerHTML = f.join('');
        $('pgFacts').style.display = f.length ? '' : 'none';
        $('pgCat').innerHTML = page.category ? '<span class="bx"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg></span><span>' + esc(page.category) + '</span>' : '';
        renderFollowedBy();

        var bn = $('pgBanner');
        if (bn) { var s0 = status(); if (isOwner && s0 !== 'published') { bn.style.display = ''; bn.innerHTML = '<i class="fa-solid fa-eye-slash"></i><span>' + (s0 === 'archived' ? 'Archived' : 'Unpublished') + ' — only admins can see this page.</span><b data-act="stStatus">Change</b>'; } else bn.style.display = 'none'; }
        renderStats(); renderActions(); renderHighlights(); renderHeaderIcons();
    }
    function hhmm(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }
    function t12(t) { var m = hhmm(t); if (m == null) return ''; var h = Math.floor(m / 60), mi = m % 60, ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + (mi < 10 ? '0' : '') + mi + ' ' + ap; }
    // opening hours: page.hours = { open:'09:00', close:'21:00' }, compared with the viewer's clock
    function hoursState() {
        var h = page && page.hours, o = h && hhmm(h.open), c = h && hhmm(h.close); if (o == null || c == null) return null;
        var d = new Date(), n = d.getHours() * 60 + d.getMinutes(), open = o <= c ? (n >= o && n < c) : (n >= o || n < c);
        return { open: open, text: open ? 'Closes ' + t12(h.close) : 'Opens ' + t12(h.open) };
    }
    function renderStats() {
        var el = $('pageMetaRow'); if (!el || !page) return;
        var n = page.followerCount || 0; el.textContent = fmt(n) + (n === 1 ? ' follower' : ' followers');
        var r = ratingInfo(), rt = $('pgRating'); if (!rt) return;
        rt.innerHTML = r ? '<span class="st">' + stars(r.avg).replace(/☆/g, '<span style="opacity:.35">★</span>') + '</span><b>' + r.avg.toFixed(1) + '</b><span class="rv">' + fmt(r.n) + (r.n === 1 ? ' review' : ' reviews') + '</span>' : '';
        rt.setAttribute('data-act', 'tab'); rt.setAttribute('data-a', 'reviews');
    }
    // "Followed by" = people I'm friends with who follow this page
    var fby = null, fbyFor = null;
    function renderFollowedBy() {
        var el = $('pgFollowedBy'); if (!el) return;
        if (!fby || !fby.length) { el.innerHTML = ''; return; }
        var n = fby.length, nm = function (u) { return '<b>' + esc(u.name) + '</b>'; };
        var txt = n === 1 ? nm(fby[0]) : n === 2 ? nm(fby[0]) + ' and ' + nm(fby[1]) : nm(fby[0]) + ', ' + nm(fby[1]) + ' and ' + (fbyTotal - 2) + (fbyTotal - 2 === 1 ? ' other' : ' others');
        el.innerHTML = '<div class="avs">' + fby.slice(0, 2).map(function (u) { return '<img src="' + esc(u.pic || BLANK) + '" alt="" onerror="this.onerror=null;this.src=\'' + BLANK + '\'">'; }).join('') + '</div><div>Followed by ' + txt + '</div>';
    }
    var fbyTotal = 0;
    async function loadFollowedBy() {
        if (!me || !slug || fbyFor === slug) return; fbyFor = slug;
        try {
            var fr = await db.collection('friends').where('users', 'array-contains', me).limit(300).get(), mine = {};
            fr.docs.forEach(function (d) { (d.data().users || []).forEach(function (u) { if (u !== me) mine[u] = 1; }); });
            var names = Object.keys(mine); if (!names.length) return;
            var hits = [];
            for (var i = 0; i < names.length && hits.length < 40; i += 10) {
                var chunk = names.slice(i, i + 10).map(function (u) { return pageRef().collection('followers').doc(u).get().catch(function () { return null; }); });
                var res = await Promise.all(chunk);
                res.forEach(function (d, k) { if (d && d.exists) hits.push(names[i + k]); });
            }
            if (!hits.length) return; fbyTotal = hits.length;
            var docs = await Promise.all(hits.slice(0, 2).map(function (u) { return db.collection('users').doc(u).get().catch(function () { return null; }); }));
            fby = docs.map(function (d, k) { var x = (d && d.exists && d.data()) || {}; return { name: x.fullName || x.username || hits[k], pic: x.userProfilePic || x.profilePic || '' }; });
            renderFollowedBy();
        } catch (e) { console.warn('followedBy', e); }
    }
    function renderActions() {
        var h = '';
        if (isOwner) {
            h = '<button class="btn-slim btn-gold" data-act="studio">Page Studio</button>';
        } else {
            h = following ? '<button class="btn-slim btn-grey on" data-act="follow">Following</button>' : '<button class="btn-slim btn-gold" data-act="follow">Follow</button>';
            if (page && page.creatorUsername && page.creatorUsername !== me) h += '<button class="btn-slim btn-grey" data-act="message">Chat</button>';
            if (page && page.cta && page.cta.url && page.cta.label) h += '<a class="btn-slim btn-grey" data-cta="1" href="' + esc(url(page.cta.url)) + '" target="_blank" rel="noopener">' + esc(page.cta.label) + '</a>';
            if (following) h += '<button class="btn-slim btn-grey btn-ico" data-act="notifSheet" aria-label="Notifications"><i class="fa-regular fa-bell"></i></button>';
        }
        $('pgActions').innerHTML = h;
    }
    function renderHighlights() {
        var hl = (page && Array.isArray(page.highlights)) ? page.highlights.filter(function (x) { return x && x.img; }) : [];
        media.hl = hl.map(function (x) { return { url: x.img, type: x.type === 'video' ? 'video' : 'image', cap: x.label || '' }; });
        var wrap = $('pgHlWrap'), el = $('pgHighlights'); wrap.style.display = (hl.length || isOwner) ? '' : 'none';
        el.innerHTML = hl.map(function (x, i) { return '<div class="highlight-item" data-act="light" data-k="hl" data-i="' + i + '"><div class="highlight-ring">' + (x.type === 'video' ? '<video src="' + esc(x.img) + '#t=0.1" muted playsinline preload="metadata"></video>' : '<img src="' + esc(x.img) + '" alt="" loading="lazy">') + '</div><div class="highlight-label">' + esc(x.label || '') + '</div></div>'; }).join('') +
            (isOwner && hl.length < 10 ? '<div class="highlight-item" data-act="hlManager"><div class="highlight-add-ring"><i class="fa-solid fa-plus"></i></div><div class="highlight-label">New</div></div>' : '');
    }

    // ============================================================
    // RENDER — tabs + panels
    // ============================================================
    function tabList() {
        var t = [['posts', 'Posts'], ['photos', 'Photos'], ['videos', 'Videos'], ['reviews', 'Reviews']];
        if (products.length) t.splice(3, 0, ['shop', 'Shop']);
        if (events.length) t.splice(t.length, 0, ['events', 'Events']);
        t.push(['about', 'About']); return t;
    }
    function renderTabs() {
        var t = tabList(); if (!t.some(function (x) { return x[0] === tab; })) tab = 'posts';
        var box = $('pageTabs'), had = !!box.querySelector('.ptab');
        box.innerHTML = '<span class="pg-ind" id="pgInd"></span>' + t.map(function (x) { return '<div class="ptab' + (x[0] === tab ? ' active' : '') + '" data-act="tab" data-a="' + x[0] + '">' + x[1] + '</div>'; }).join('');
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + tab); });
        moveInd(!had);
    }
    var indPrev = null;
    function moveInd(instant) {
        var ind = $('pgInd'), act = document.querySelector('#pageTabs .ptab.active'); if (!ind || !act) return;
        ind.classList.toggle('nt', !!instant || !indPrev);
        ind.style.width = act.offsetWidth + 'px'; ind.style.transform = 'translateX(' + act.offsetLeft + 'px)'; indPrev = true;
        var bx = $('pageTabs'); if (bx && act.offsetLeft + act.offsetWidth > bx.scrollLeft + bx.clientWidth || act.offsetLeft < bx.scrollLeft) bx.scrollTo({ left: Math.max(0, act.offsetLeft - 20), behavior: 'smooth' });
        if (instant) setTimeout(function () { ind.classList.remove('nt'); }, 60);
    }
    function empty(icon, title, text, cta) { return '<div class="pg-empty"><div class="ei"><i class="' + icon + '"></i></div><b>' + title + '</b><p>' + text + '</p>' + (cta || '') + '</div>'; }
    function blockedCard() { return '<div class="pg-blocked">You blocked this page, so its posts are hidden.<br><button class="pg-btn sec" data-act="unblock">Unblock</button></div>'; }

    function gateHtml() {
        var s = (page && page.status) || 'published';
        if (s === 'published') return '';
        if (s === 'deleted' && page.creatorUsername === me) return '<div class="pg-blocked">This page was deleted.<br>Only you can see this. Restoring brings it back as unpublished.<br><button class="pg-btn pri" data-act="restore">Restore page</button></div>';
        if (s !== 'deleted' && isOwner) return '';
        return empty('fa-regular fa-circle-question', 'This page isn’t available', 'It may have been removed or hidden by its owner.');
    }
    function renderPosts() {
        var c = $('timeline-area'); if (!c) return;
        if (gated) { c.innerHTML = gated; return; }
        if (blocked) { c.innerHTML = blockedCard(); return; }
        if (!slug) { c.innerHTML = empty('fa-regular fa-file-lines', 'No page selected', 'Open a page from Chats or search to see it here.'); return; }
        if (!page && !postsLoaded) { c.innerHTML = '<div class="pg-sk"></div><div class="pg-sk"></div>'; return; }
        var composer = '';
        if (!postsLoaded) { c.innerHTML = composer + '<div class="pg-sk"></div><div class="pg-sk"></div>'; return; }
        if (postsErr && !posts.length) { c.innerHTML = empty('fa-solid fa-triangle-exclamation', 'Couldn’t load posts', 'Check your connection and try again.', '<button class="pg-btn sec" data-act="retryPosts">Retry</button>'); return; }
        if (!posts.length) { c.innerHTML = composer + empty('fa-regular fa-newspaper', 'No posts yet', isOwner ? 'Share your first update with your followers.' : 'When this page shares something, it will show up here.', isOwner ? '<button class="pg-btn pri" data-act="createPost">Create post</button>' : ''); return; }
        c.innerHTML = posts.map(function (p) { return window.generatePostHTML(p); }).join('');
        if (typeof window.postCard_observeVideos === 'function') window.postCard_observeVideos();
        if (typeof window.postCard_restoreLikes === 'function') window.postCard_restoreLikes(c);
        if (typeof window.postCard_initLockedCountdowns === 'function') window.postCard_initLockedCountdowns();
    }
    function buildMedia() {
        media.photo = []; media.video = [];
        posts.forEach(function (p) {
            if (p.locked) return;
            (window.postCard_normalizeMediaItems ? window.postCard_normalizeMediaItems(p) : []).forEach(function (m) {
                var o = { url: m.url, type: m.type === 'video' ? 'video' : 'image', cap: (p.content || '').slice(0, 140) };
                (o.type === 'video' ? media.video : media.photo).push(o);
            });
        });
    }
    function renderGrids() {
        var ph = $('photosGrid'), vd = $('videosGrid'); if (!ph) return;
        if (blocked) { ph.innerHTML = vd.innerHTML = blockedCard(); return; }
        ph.style.display = media.photo.length ? '' : 'block';
        vd.style.display = media.video.length ? '' : 'block';
        ph.innerHTML = media.photo.length ? media.photo.map(function (m, i) { return '<div class="gitem" data-act="light" data-k="photo" data-i="' + i + '"><img src="' + esc(m.url) + '" alt="" loading="lazy"></div>'; }).join('') : empty('fa-regular fa-image', 'No photos yet', 'Photos from this page’s posts appear here.');
        vd.innerHTML = media.video.length ? media.video.map(function (m, i) { return '<div class="gitem" data-act="light" data-k="video" data-i="' + i + '"><video src="' + esc(m.url) + '#t=0.1" preload="metadata" muted playsinline></video><i class="fa-solid fa-play playicon"></i></div>'; }).join('') : empty('fa-solid fa-film', 'No videos yet', 'Videos from this page’s posts appear here.');
    }
    function renderReviews() {
        var b = $('reviewsBox'); if (!b) return;
        var r = ratingInfo(), mine = reviews.filter(function (x) { return x.id === me; })[0], h = '';
        if (r) {
            h += '<div class="pg-rv-sum"><div class="pg-rv-big"><b>' + r.avg.toFixed(1) + '</b><div class="pg-stars">' + stars(r.avg) + '</div><small>' + fmt(r.n) + (r.n === 1 ? ' review' : ' reviews') + '</small></div><div class="pg-rv-bars">';
            for (var s = 5; s >= 1; s--) h += '<div class="pg-rv-bar"><span>' + s + '</span><i><s style="width:' + Math.round(r.cnt[s - 1] / r.n * 100) + '%"></s></i></div>';
            h += '</div></div>';
        }
        if (!isOwner) h += '<div class="pg-rv-cta"><button class="pg-btn ' + (mine ? 'sec' : 'pri') + '" data-act="review">' + (mine ? 'Edit your review' : 'Write a review') + '</button></div>';
        if (!reviews.length) h += empty('fa-regular fa-star', 'No reviews yet', isOwner ? 'Reviews from your followers will appear here.' : 'Be the first to share your experience.');
        else h += reviews.map(function (x) { return '<div class="pg-rv"><div class="pg-rv-h"><div class="pg-rv-av">' + esc((x.author || '?').charAt(0)) + '</div><div><div class="pg-rv-n">' + esc(x.author || 'Member') + '</div><div class="pg-rv-d"><span class="pg-stars">' + stars(x.rating) + '</span> · ' + ago(x.timestamp) + '</div></div></div>' + (x.text ? '<div class="pg-rv-t">' + esc(x.text) + '</div>' : '') + (x.reply && x.reply.text ? '<div class="pg-rv-reply"><b>Response from ' + esc((page && page.name) || 'the page') + '</b><span>' + esc(x.reply.text) + '</span></div>' : '') + '</div>'; }).join('');
        b.innerHTML = h;
    }
    function aboutRow(icon, val, label, href) { return '<' + (href ? 'a href="' + esc(href) + '" target="_blank" rel="noopener"' : 'div') + ' class="pg-ab-row"><i class="' + icon + '"></i><div><b>' + esc(val) + '</b><small>' + label + '</small></div></' + (href ? 'a' : 'div') + '>'; }
    function renderAbout() {
        var b = $('aboutBox'); if (!b || !page) { if (b) b.innerHTML = ''; return; }
        var h = '';
        if (page.description) h += '<h3>About</h3><p>' + esc(page.description) + '</p>';
        var d = '';
        if (page.category) d += aboutRow('fa-solid fa-tag', page.category, 'Category');
        if (page.address || page.location) d += aboutRow('fa-solid fa-location-dot', page.address || page.location, 'Location');
        if (page.website) d += aboutRow('fa-solid fa-link', String(page.website).replace(/^https?:\/\//i, ''), 'Website', url(page.website));
        if (page.contactPhone) d += aboutRow('fa-solid fa-phone', page.contactPhone, 'Phone', 'tel:' + page.contactPhone);
        if (page.contactEmail) d += aboutRow('fa-regular fa-envelope', page.contactEmail, 'Email', 'mailto:' + page.contactEmail);
        if (d) h += '<h3>Details</h3>' + d;
        var created = ms(page.createdAt || page.timestamp), admins = 1 + (page.adminUsernames || []).length;
        h += '<h3>Page transparency</h3>' +
            (created ? aboutRow('fa-regular fa-calendar', new Date(created).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }), 'Page created') : '') +
            aboutRow('fa-regular fa-user', page.creatorUsername || '—', 'Page owner') +
            aboutRow('fa-solid fa-user-shield', admins + (admins === 1 ? ' admin' : ' admins'), 'Managed by');
        b.innerHTML = h;
    }
    function renderShopEvents() {
        $('shopGrid').innerHTML = products.map(function (p) { var inner = '<img src="' + esc(p.imageUrl || p.img || BLANK) + '" alt="" loading="lazy"><div class="pinfo"><div class="ptitle">' + esc(p.name || '') + '</div>' + (p.price ? '<div class="pprice">' + esc(p.price) + '</div>' : '') + '</div>'; return p.url ? '<a class="product-card" href="' + esc(url(p.url)) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<div class="product-card">' + inner + '</div>'; }).join('');
        $('eventsList').innerHTML = events.map(function (e) { var d = e.date ? new Date(ms(e.date) || e.date) : null, ok = d && !isNaN(d); return '<div class="event-card"><div class="event-date-box"><div class="mon">' + (ok ? d.toLocaleString(undefined, { month: 'short' }) : '') + '</div><div class="day">' + (ok ? d.getDate() : '') + '</div></div><div class="event-info"><div class="etitle">' + esc(e.title || '') + '</div><div class="emeta">' + esc(e.location || '') + '</div></div></div>'; }).join('');
    }
    function renderAll() { renderHero(); renderTabs(); renderPosts(); renderGrids(); renderReviews(); renderAbout(); renderShopEvents(); }

    // ============================================================
    // DATA
    // ============================================================
    function boot() {
        if (!slug) { $('pageNameTitle').textContent = ''; var ht = $('headerTitleText'); if (ht && ht.childNodes[0]) ht.childNodes[0].textContent = 'Page '; var hv = $('headerVerifiedIcon'); if (hv) hv.style.display = 'none'; renderAll(); return; }
        renderPosts();
        sub(pageRef().onSnapshot(function (doc) {
            document.documentElement.classList.remove('pg-loading');
            if (!doc.exists) { page = null; $('timeline-area').innerHTML = empty('fa-regular fa-circle-question', 'Page not found', 'This page doesn’t exist or was removed.'); return; }
            page = doc.data();
            isOwner = !!(me && (page.creatorUsername === me || (page.adminUsernames || []).indexOf(me) > -1));
            gated = gateHtml();
            $('pageView').classList.toggle('pg-off', !!gated);
            if (gated) { $('timeline-area').innerHTML = gated; var hv0 = $('headerVerifiedIcon'); if (hv0) hv0.style.display = 'none'; if (ovHas('studio')) ovBack(); return; }
            if (!viewTracked && !isOwner) { viewTracked = true; track('views'); }
            if (isOwner) refreshSched();
            renderAll(); studioRefresh();
            if (!booted) { booted = true; loadSecondary(); }
            // Opened from the menu's pencil badge (pages.html?page=ID&edit=1): open edit mode once.
            if (isOwner && !editShortcutDone) {
                var _qs = new URLSearchParams(window.location.search);
                if (_qs.get('edit') === '1') {
                    editShortcutDone = true; _qs.delete('edit');
                    try { history.replaceState(history.state, '', window.location.pathname + (_qs.toString() ? '?' + _qs.toString() : '')); } catch (e) {}
                    A.editPage();
                }
            }
        }, function (err) { console.error('page listener error:', err); }));
        sub(db.collection('posts').where('pageId', '==', slug).onSnapshot(function (snap) {
            // no orderBy here on purpose: where()+orderBy() needs a composite index, and without it the listener fails and the tab shows empty.
            var now = Date.now(), out = [];
            snap.docs.forEach(function (d) {
                var data = d.data();
                if (data.visible === false) { var at = ms(data.publishAt); if (at && at <= now) db.collection('posts').doc(d.id).update({ visible: true }).catch(function () {}); return; }
                out.push(Object.assign({}, data, { id: d.id, username: page ? page.name : data.username, userProfilePic: page ? page.avatarUrl : data.userProfilePic, pageCategory: page ? (page.category || '') : (data.pageCategory || ''), isAdmin: isOwner }));
            });
            out.sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.timestamp ? ms(b.timestamp) : Date.now()) - (a.timestamp ? ms(a.timestamp) : Date.now()); });
            postsErr = false; srvPosts = out; mergePend(); postsLoaded = true; buildMedia(); renderPosts(); renderGrids(); renderStats(); studioRefresh();
        }, function (err) { console.error('posts listener error:', err); postsLoaded = true; postsErr = true; renderPosts(); }));
        if (me) {
            loadFollowedBy();
            sub(pageRef().collection('followers').doc(me).onSnapshot(function (doc) { following = doc.exists; renderActions(); }));
            myPageDoc().get().then(function (d) { notifPref = (d.exists && d.data().notifPref) || 'All'; }).catch(function () {});
            db.collection('users').doc(me).collection('savedPages').doc(slug).get().then(function (d) { saved = d.exists; }).catch(function () {});
            db.collection('users').doc(me).collection('blockedPages').doc(slug).get().then(function (d) { if (d.exists) { blocked = true; renderPosts(); renderGrids(); } }).catch(function () {});
        }
    }
    function loadSecondary() {
        sub(pageRef().collection('reviews').orderBy('timestamp', 'desc').limit(100).onSnapshot(function (snap) {
            reviews = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); reviewsLoaded = true; renderReviews(); renderStats(); studioRefresh();
        }, function () { reviewsLoaded = true; }));
        pageRef().collection('products').limit(40).get().then(function (s) { products = s.docs.map(function (d) { return d.data(); }); renderShopEvents(); renderTabs(); }).catch(function () {});
        pageRef().collection('events').limit(40).get().then(function (s) { events = s.docs.map(function (d) { return d.data(); }); renderShopEvents(); renderTabs(); }).catch(function () {});
    }
    function track(field) { if (!slug) return; var u = {}; u[field] = FV.increment(1); pageRef().collection('analyticsDaily').doc(new Date().toISOString().slice(0, 10)).set(u, { merge: true }).catch(function () {}); }
    function refreshSched() { if (!isOwner) return; db.collection('posts').where('pageId', '==', slug).where('visible', '==', false).get().then(function (s) { schedCount = s.size; }).catch(function () {}); }

    // ============================================================
    // ACTIONS (data-act)
    // ============================================================
    var A = {};
    A.back = function () { ovBack(); };
    A.retryPosts = function () { initPage(); };
    // header arrow: return to the Pages list in Chats when we came from there, otherwise normal history back
    A.goBack = function () {
        var from = ''; try { from = sessionStorage.getItem('nx_prev_route') || ''; } catch (e) {}
        if (from === 'chats.html' && window.NexusRouter && NexusRouter.navigateTo) {
            try { localStorage.setItem('nexus_active_tab', 'pages'); } catch (e) {}
            NexusRouter.navigateTo('chats.html', { pushHistory: false }); return;
        }
        history.back();
    };
    A.closeSheet = function () { closeSheet(); };
    A.yes = function () { var f = sheetState.yes; afterSheet(function () { if (f) f(); }); };
    window.addEventListener('resize', function () { moveInd(true); });
    A.bio = function () { bioOpen = !bioOpen; renderHero(); };
    A.tab = function (el) { setTab(el.getAttribute('data-a')); };
    function setTab(k) {
        tab = k; renderTabs();
        var hero = document.querySelector('.pg-hero'), y = (hero ? hero.offsetHeight : 0) + 18 - 56;
        if (window.scrollY > y) window.scrollTo(0, y);
    }
    A.follow = async function () {
        if (busy.follow) return; busy.follow = true;
        try {
            var u = await whenAuth(); if (!u) { toast('You need to be signed in'); return; }
            var fRef = pageRef().collection('followers').doc(me), mRef = myPageDoc(), was = following;
            await db.runTransaction(async function (t) {
                var d = await t.get(fRef);
                if (d.exists) { t.delete(fRef); t.delete(mRef); t.update(pageRef(), { followerCount: FV.increment(-1) }); }
                else { t.set(fRef, { followedAt: FV.serverTimestamp() }); t.set(mRef, { followedAt: FV.serverTimestamp() }); t.update(pageRef(), { followerCount: FV.increment(1) }); }
            });
            track(was ? 'unfollows' : 'follows'); toast(was ? 'Unfollowed' : 'You’re following this page');
        } catch (e) { console.error(e); toast('Could not update. Try again.'); }
        finally { busy.follow = false; }
    };
    A.message = function () {
        var to = page && page.creatorUsername; if (!to) return;
        var u = 'chat-interior.html?with=' + encodeURIComponent(to);
        if (window.NexusRouter && NexusRouter.navigateTo) NexusRouter.navigateTo(u); else location.href = u;
    };
    A.notifSheet = function () {
        openSheet('<div class="pg-sh-t">Notifications</div><div class="pg-sh-m">Choose what you get from this page.</div>' +
            radio('All posts', 'Every new post', notifPref === 'All', 'setNotif', 'All') + radio('Highlights only', 'Only the important updates', notifPref === 'Highlights', 'setNotif', 'Highlights') + radio('Off', 'No notifications', notifPref === 'Off', 'setNotif', 'Off'));
    };
    A.setNotif = function (el) {
        notifPref = el.getAttribute('data-a');
        myPageDoc().set({ notifPref: notifPref }, { merge: true }).catch(function () {});
        closeSheet(); toast(notifPref === 'Off' ? 'Notifications are off' : 'Notifications: ' + (notifPref === 'All' ? 'all posts' : 'highlights only'));
    };
    A.createPost = function () { if (isOwner) afterOrNow(openCreate); };
    function afterOrNow(fn) { if (ovHas('sheet')) afterSheet(fn); else fn(); }

    // ----- menu (3 dots)
    function openMenu() {
        var h = '<div class="pg-sh-head"><img src="' + esc((page && page.avatarUrl) || BLANK) + '" alt=""><div><div class="pg-sh-t">' + esc((page && page.name) || 'Page') + '</div><div class="pg-sh-m">' + esc(page ? [page.category, fmt(page.followerCount || 0) + ' followers'].filter(Boolean).join(' · ') : '') + '</div></div></div>';
        h += row('fa-solid fa-share-nodes', 'Share page', '', 'share') + row('fa-solid fa-link', 'Copy link', '', 'copyLink') + row(saved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark', saved ? 'Saved' : 'Save page', '', 'save');
        if (!isOwner && following) h += row('fa-regular fa-bell', 'Notifications', notifPref === 'All' ? 'All posts' : notifPref === 'Off' ? 'Off' : 'Highlights only', 'notifSheetMenu');
        if (isOwner) h += '<div class="pg-sep"></div>' + row('fa-solid fa-chart-line', 'Page Studio', 'Insights, content, inbox and growth', 'studio') + row('fa-solid fa-pen', 'Edit page info', '', 'editPage') + row('fa-solid fa-user-group', 'Page roles', (1 + ((page && page.adminUsernames) || []).length) + ' admin(s)', 'roles');
        if (!isOwner) h += '<div class="pg-sep"></div>' + row('fa-regular fa-flag', 'Report page', '', 'report', null, 'danger') + row('fa-solid fa-ban', blocked ? 'Unblock page' : 'Block page', '', blocked ? 'unblock' : 'blockAsk', null, 'danger');
        openSheet(h);
    }
    A.notifSheetMenu = function () { afterSheet(A.notifSheet); };
    A.share = function () {
        track('shares');
        var u = pageUrl(), t = (page && page.name) || 'Nexus page';
        if (navigator.share) { closeSheet(); navigator.share({ title: t, url: u }).catch(function () {}); return; }
        afterSheet(function () {
            var e = encodeURIComponent(u), tt = encodeURIComponent(t);
            openSheet('<div class="pg-sh-t">Share page</div>' +
                row('fa-brands fa-whatsapp', 'WhatsApp', '', 'out', 'https://wa.me/?text=' + tt + '%20' + e) + row('fa-brands fa-telegram', 'Telegram', '', 'out', 'https://t.me/share/url?url=' + e + '&text=' + tt) +
                row('fa-brands fa-x-twitter', 'X', '', 'out', 'https://twitter.com/intent/tweet?url=' + e + '&text=' + tt) + row('fa-regular fa-envelope', 'Email', '', 'out', 'mailto:?subject=' + tt + '&body=' + e) + row('fa-solid fa-link', 'Copy link', '', 'copyLink'));
        });
    };
    A.out = function (el) { window.open(el.getAttribute('data-a'), '_blank', 'noopener'); };
    A.copyLink = function () { track('shares'); var u = pageUrl(); closeSheet(); try { navigator.clipboard.writeText(u).then(function () { toast('Link copied'); }, function () { toast('Could not copy'); }); } catch (e) { toast('Could not copy'); } };
    A.save = function () {
        saved = !saved; closeSheet();
        if (me && slug) { var r = db.collection('users').doc(me).collection('savedPages').doc(slug); (saved ? r.set({ savedAt: FV.serverTimestamp() }) : r.delete()).catch(function () {}); }
        toast(saved ? 'Page saved' : 'Removed from saved');
    };

    // ----- report / block
    var REASONS = [['Misleading or false information', 'Claims that are untrue'], ['Scam or fraud', 'Asking for money or personal details'], ['Hate speech or harassment', 'Attacks on people or groups'], ['Inappropriate content', 'Sexual, violent or disturbing'], ['Impersonation', 'Pretending to be someone else'], ['Something else', '']];
    function reportSheet(target, id) {
        sheetState.rep = { target: target, id: id, reason: null };
        openSheet('<div class="pg-sh-t">Report</div><div class="pg-sh-m">Choose a reason. Your report goes to Nexus and the page isn’t told who sent it.</div>' +
            REASONS.map(function (r, i) { return radio(r[0], r[1], false, 'pickReason', i); }).join('') + btns(btn('Send report', 'sendReport', 'pri'), btn('Cancel', 'closeSheet', 'sec')));
    }
    A.report = function () { afterSheet(function () { reportSheet('page', slug); }); };
    A.pickReason = function (el) {
        var i = +el.getAttribute('data-a'); sheetState.rep.reason = REASONS[i][0];
        document.querySelectorAll('#pgSheet [data-act="pickReason"] .pg-dot').forEach(function (d, k) { d.classList.toggle('on', k === i); });
    };
    A.sendReport = function () {
        var r = sheetState.rep; if (!r || !r.reason) { toast('Choose a reason first'); return; }
        db.collection('reports').add({ targetType: r.target, targetId: r.id, pageId: slug, reason: r.reason, reporterUsername: me || null, timestamp: FV.serverTimestamp() })
            .then(function () { toast('Report sent. Thank you.'); }).catch(function () { toast('Could not send the report'); });
        closeSheet();
    };
    A.blockAsk = function () { afterSheet(function () { confirmSheet('Block ' + esc((page && page.name) || 'this page') + '?', 'You won’t see its posts, and you’ll stop following it.', 'Block', 'danger', doBlock); }); };
    async function doBlock() {
        try {
            await db.collection('users').doc(me).collection('blockedPages').doc(slug).set({ blockedAt: FV.serverTimestamp() });
            if (following) { await pageRef().collection('followers').doc(me).delete().catch(function () {}); await myPageDoc().delete().catch(function () {}); }
            blocked = true; renderPosts(); renderGrids(); toast('Page blocked');
        } catch (e) { toast('Could not block. Try again.'); }
    }
    A.unblock = async function () {
        closeSheet();
        await db.collection('users').doc(me).collection('blockedPages').doc(slug).delete().catch(function () {});
        blocked = false; renderPosts(); renderGrids(); toast('Page unblocked');
    };

    // ----- create post
    function openCreate() {
        sheetState.timing = 'now'; sheetState.file = null;
        openSheet('<div class="pg-sh-t">Create post</div><div class="pg-sh-m">Publishes to this page’s timeline.</div>' + area('', 'cp_text', '', 'Write something…', 4) +
            '<div class="pg-field"><label>Photo or video</label><div class="pg-up"><div class="pg-file" id="cp_fn">No file chosen</div><button class="pg-chip-btn" data-act="pickMedia">Choose</button></div></div>' + field('Or paste an image link', 'cp_img', '', 'https://…', 'url') +
            '<div class="pg-seg" id="cp_seg"><div class="on" data-act="timing" data-a="now">Now</div><div data-act="timing" data-a="scheduled">Schedule</div><div data-act="timing" data-a="capsule">Time capsule</div></div>' +
            '<div class="pg-field" id="cp_datef" style="display:none"><label id="cp_datel">Publish at</label><input id="cp_date" type="datetime-local"></div>' + btns(btn('Publish', 'publish', 'pri')));
    }
    A.timing = function (el) {
        var t = el.getAttribute('data-a'); sheetState.timing = t;
        document.querySelectorAll('#cp_seg div').forEach(function (d) { d.classList.toggle('on', d === el); });
        $('cp_datef').style.display = t === 'now' ? 'none' : ''; $('cp_datel').textContent = t === 'capsule' ? 'Unlocks at' : 'Publish at';
    };
    // Optimistic: the sheet closes at once, the post shows on the timeline immediately, upload/save finish in the background.
    var pend = {}, srvPosts = [], postsErr = false;
    function fakeTs() { var t = Date.now(); return { seconds: Math.floor(t / 1000), nanoseconds: 0, toDate: function () { return new Date(t); }, toMillis: function () { return t; } }; }
    function mergePend() {
        var ids = {}; srvPosts.forEach(function (p) { ids[p.id] = 1; });
        Object.keys(pend).forEach(function (k) { if (ids[k]) delete pend[k]; });
        var extra = Object.keys(pend).map(function (k) { return pend[k]; });
        posts = extra.concat(srvPosts).sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });
    }
    A.publish = function () {
        if (busy.pub) return;
        var text = $('cp_text').value.trim(), img = $('cp_img').value.trim(), timing = sheetState.timing, dv = $('cp_date').value, file = sheetState.file;
        if (!text && !img && !file) { toast('Write something or add a photo'); return; }
        if (timing !== 'now' && !dv) { toast('Choose a date and time'); return; }
        if (!auth.currentUser && !me) { toast('You need to be signed in'); return; }
        var ref = db.collection('posts').doc(), id = ref.id, localUrl = file ? URL.createObjectURL(file) : null;
        var mType = file ? (file.type.indexOf('video') === 0 ? 'video' : 'image') : (img ? 'image' : null);
        var base = { pageId: slug, username: page ? page.name : me, userProfilePic: page ? (page.avatarUrl || '') : '', content: text, likesCount: 0, commentsCount: 0, pinned: false, authorUsername: me, pageCategory: page ? (page.category || '') : '' };
        if (timing === 'scheduled') { base.visible = false; base.publishAt = new Date(dv).toISOString(); }
        else if (timing === 'capsule') { base.visible = true; base.locked = true; base.unlockAt = new Date(dv).toISOString(); base.lockedSubtitle = 'Time-Capsule Post'; }
        else base.visible = true;
        st.sched = null; closeSheet();
        toast(timing === 'now' ? 'Publishing…' : timing === 'capsule' ? 'Creating time capsule…' : 'Scheduling…');
        if (base.visible) {
            pend[id] = Object.assign({}, base, { id: id, mediaUrl: localUrl || img || null, mediaType: mType, timestamp: fakeTs(), isAdmin: isOwner });
            mergePend(); tab = 'posts'; renderTabs(); buildMedia(); renderPosts(); renderGrids(); renderStats();
        }
        (async function () {
            try {
                var mUrl = img || null;
                if (file) { var lt = setTimeout(function () { toast('Uploading…'); }, 900); try { mUrl = await uploadFile(file); } finally { clearTimeout(lt); } }
                var doc = Object.assign({}, base, { mediaUrl: mUrl, mediaType: mUrl ? mType : null, timestamp: FV.serverTimestamp() });
                await ref.set(doc);
                if (pend[id]) { pend[id].mediaUrl = mUrl; }
                log(timing === 'now' ? 'Published a post' : timing === 'capsule' ? 'Created a time-capsule post' : 'Scheduled a post', text.slice(0, 60));
                toast(timing === 'now' ? 'Post published' : timing === 'capsule' ? 'Time-capsule post created' : 'Post scheduled');
                if (timing === 'scheduled') refreshSched(); studioRefresh();
            } catch (e) {
                console.error(e); delete pend[id]; mergePend(); renderPosts(); renderGrids(); toast(file ? 'Upload failed. Post was not published.' : 'Could not publish. Try again.');
            }
        })();
    };

    // ----- edit page
    A.editPage = function () { if (!isOwner || !page) return; afterOrNow(function () {
        openSheet('<div class="pg-sh-t">Edit page info</div><div class="pg-sh-m">Visible to everyone who views this page.</div>' +
            field('Name', 'ep_name', page.name) + field('Category', 'ep_cat', page.category) + area('Bio', 'ep_desc', page.description, '', 4) + field('Website', 'ep_web', page.website, 'example.com') + field('Phone', 'ep_phone', page.contactPhone, '', 'tel') + field('Email', 'ep_email', page.contactEmail, '', 'email') + field('Address', 'ep_addr', page.address || page.location) + '<div class="pg-field"><label>Opening hours (optional)</label><div class="pg-up"><input id="ep_ho" type="time" value="' + esc((page.hours && page.hours.open) || '') + '"><input id="ep_hc" type="time" value="' + esc((page.hours && page.hours.close) || '') + '"></div></div>' + upField('Cover image', 'ep_cover', page.coverUrl) + upField('Profile image', 'ep_av', page.avatarUrl) + btns(btn('Save changes', 'saveEdit', 'pri')));
    }); };
    A.saveEdit = async function () {
        var name = $('ep_name').value.trim(); if (!name) { toast('Page name is required'); return; }
        try {
            await pageRef().update({ name: name, category: $('ep_cat').value.trim(), description: $('ep_desc').value.trim(), website: $('ep_web').value.trim(), contactPhone: $('ep_phone').value.trim(), contactEmail: $('ep_email').value.trim(), address: $('ep_addr').value.trim(), hours: ($('ep_ho').value && $('ep_hc').value) ? { open: $('ep_ho').value, close: $('ep_hc').value } : FV.delete(), coverUrl: $('ep_cover').value.trim(), avatarUrl: $('ep_av').value.trim() });
            closeSheet(); toast('Page updated'); log('Edited page info');
        } catch (e) { console.error(e); toast('Could not save. Try again.'); }
    };

    // ----- roles
    A.roles = function () { if (!isOwner || !page) return; afterOrNow(rolesSheet); };
    function rolesSheet() {
        var admins = page.adminUsernames || [];
        var h = '<div class="pg-sh-t">Page roles</div><div class="pg-sh-m">Admins can edit the page, manage roles and post as the page.</div><div class="pg-admin"><i class="fa-solid fa-crown" style="color:#f5b942"></i><span>' + esc(page.creatorUsername) + '<small>Owner</small></span></div>';
        admins.forEach(function (u) { h += '<div class="pg-admin"><i class="fa-solid fa-user-shield" style="color:#9aa0ab"></i><span>' + esc(u) + '<small>Admin</small></span>' + (u !== me ? '<button class="pg-chip-btn danger" data-act="rmAdmin" data-a="' + esc(u) + '">Remove</button>' : '') + '</div>'; });
        h += '<div style="height:10px"></div>' + field('Add admin (username)', 'ad_user', '', 'username') + btns(btn('Add admin', 'addAdmin', 'pri'));
        openSheet(h);
    }
    A.addAdmin = async function () {
        var u = $('ad_user').value.trim(); if (!u) return;
        try { await pageRef().update({ adminUsernames: FV.arrayUnion(u) }); log('Added an admin', u); toast(u + ' is now an admin'); setTimeout(function () { if (ovHas('sheet') && page) rolesSheet(); }, 350); } catch (e) { toast('Could not add admin'); }
    };
    A.rmAdmin = async function (el) {
        var u = el.getAttribute('data-a');
        try { await pageRef().update({ adminUsernames: FV.arrayRemove(u) }); log('Removed an admin', u); toast(u + ' removed'); setTimeout(function () { if (ovHas('sheet') && page) rolesSheet(); }, 350); } catch (e) { toast('Could not remove admin'); }
    };

    // ----- reviews
    A.review = function () {
        if (isOwner) return; var mine = reviews.filter(function (x) { return x.id === me; })[0]; sheetState.stars = mine ? mine.rating : 0;
        openSheet('<div class="pg-sh-t">' + (mine ? 'Edit your review' : 'Write a review') + '</div><div class="pg-sh-m">Share your experience with ' + esc((page && page.name) || 'this page') + '.</div><div class="pg-stars-in" id="rv_st">' + [1, 2, 3, 4, 5].map(function (n) { return '<i class="fa-solid fa-star' + (n <= sheetState.stars ? ' on' : '') + '" data-act="rate" data-a="' + n + '"></i>'; }).join('') + '</div>' + area('', 'rv_text', mine ? mine.text : '', 'Tell people what you liked (optional)', 4) + btns(btn('Post review', 'postReview', 'pri'), mine ? btn('Delete review', 'delReview', 'sec') : ''));
    };
    A.rate = function (el) { var n = +el.getAttribute('data-a'); sheetState.stars = n; document.querySelectorAll('#rv_st i').forEach(function (s, k) { s.classList.toggle('on', k < n); }); };
    A.postReview = async function () {
        if (!sheetState.stars) { toast('Tap a star to rate'); return; }
        try { var u = await whenAuth(); if (!u) { toast('You need to be signed in'); return; } await pageRef().collection('reviews').doc(me).set({ rating: sheetState.stars, text: $('rv_text').value.trim(), author: me, timestamp: FV.serverTimestamp() }); closeSheet(); toast('Thanks for your review'); }
        catch (e) { console.error(e); toast('Could not post your review'); }
    };
    A.delReview = async function () { try { await pageRef().collection('reviews').doc(me).delete(); closeSheet(); toast('Review deleted'); } catch (e) { toast('Could not delete'); } };

    // ----- per-post menu (the "⋯" on every post card)
    function postMenu(postId) {
        var p = posts.filter(function (x) { return x.id === postId; })[0];
        var h = row('fa-solid fa-link', 'Copy link', '', 'copyPost', postId) + row('fa-regular fa-flag', 'Report post', '', 'reportPost', postId, 'danger');
        if (isOwner) h += row('fa-regular fa-trash-can', 'Delete post', '', 'delPostAsk', postId, 'danger');
        openSheet(h);
    }
    A.copyPost = function (el) { var u = pageUrl() + '#' + el.getAttribute('data-a'); closeSheet(); try { navigator.clipboard.writeText(u).then(function () { toast('Link copied'); }); } catch (e) {} };
    A.reportPost = function (el) { var id = el.getAttribute('data-a'); afterSheet(function () { reportSheet('post', id); }); };
    A.delPostAsk = function (el) { var id = el.getAttribute('data-a'); afterSheet(function () { confirmSheet('Delete this post?', 'This can’t be undone.', 'Delete', 'danger', function () { db.collection('posts').doc(id).delete().then(function () { toast('Post deleted'); log('Deleted a post'); st.sched = null; studioRefresh(); }).catch(function () { toast('Could not delete'); }); }); }); };

    // ----- search overlay (header magnifier)
    function openSearch() {
        var o = $('pgSearch'); if (!o) return; o.style.display = 'flex'; $('pgSearchInput').value = ''; runSearch('');
        if (!ovHas('search')) ovPush('search', function () { o.style.display = 'none'; $('pgSearchInput').blur(); });
        setTimeout(function () { try { $('pgSearchInput').focus(); } catch (e) {} }, 120);
    }
    function runSearch(q) {
        var b = $('pgSearchBody'); q = q.trim().toLowerCase();
        if (!q) { b.innerHTML = empty('fa-solid fa-magnifying-glass', 'Search this page', 'Find posts by what they say.'); return; }
        var hits = posts.filter(function (p) { return (p.content || '').toLowerCase().indexOf(q) > -1; }).slice(0, 30);
        b.innerHTML = hits.length ? '<div style="height:10px"></div>' + hits.map(function (p) { return window.generatePostHTML(p); }).join('') : empty('fa-regular fa-face-frown', 'No results', 'Nothing on this page matches “' + esc(q) + '”.');
        if (hits.length && typeof window.postCard_observeVideos === 'function') window.postCard_observeVideos();
    }

    // ----- lightbox (photos, videos, highlights)
    A.light = function (el) {
        var k = el.getAttribute('data-k'), i = +el.getAttribute('data-i'), list = media[k] || []; if (!list.length) return;
        var o = $('pgLight');
        o.innerHTML = '<div class="lt"><i class="fa-solid fa-xmark" data-act="back"></i><span id="lt_n"></span><span></span></div><div class="strip" id="lt_strip">' +
            list.map(function (m) { return '<div class="slide">' + (m.type === 'video' ? '<video src="' + esc(m.url) + '" controls playsinline></video>' : '<img src="' + esc(m.url) + '" alt="">') + '</div>'; }).join('') + '</div><div class="cap" id="lt_cap"></div>';
        o.style.display = 'flex';
        var strip = $('lt_strip'), upd = function () { var w = strip.clientWidth || 1, j = Math.round(strip.scrollLeft / w); $('lt_n').textContent = (j + 1) + ' / ' + list.length; $('lt_cap').textContent = list[j] ? list[j].cap : ''; $('lt_cap').style.display = list[j] && list[j].cap ? '' : 'none'; strip.querySelectorAll('video').forEach(function (v, n) { if (n !== j) { try { v.pause(); } catch (e) {} } }); };
        strip.addEventListener('scroll', function () { clearTimeout(strip._t); strip._t = setTimeout(upd, 80); });
        strip.scrollLeft = i * (strip.clientWidth || window.innerWidth); upd();
        if (!ovHas('light')) ovPush('light', function () { o.style.display = 'none'; o.innerHTML = ''; });
    };

    // ============================================================
    // PAGE STUDIO  (owner / admin workspace)
    // ============================================================
    var UPLOAD_URL = 'https://oryzon-backend-ed1q.onrender.com/upload';
    var CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'AED', 'SAR', 'TRY', 'EGP', 'NGN', 'GHS', 'KES', 'ZAR', 'INR', 'CNY', 'JPY'];
    var CTA_LABELS = ['Learn more', 'Shop now', 'Contact us', 'Book now', 'Sign up', 'Call now', 'Order now', 'Donate'];
    var st = newStudioState();
    function newStudioState() { return { tab: 'overview', range: 7, filter: 'all', inbox: 'reviews', ins: {}, sched: null, fol: null }; }
    function status() { return (page && page.status) || 'published'; }
    function isCreator() { return !!(page && me && page.creatorUsername === me); }
    function ymd(d) { return d.toISOString().slice(0, 10); }
    function log(action, detail) { if (!slug || !me) return; pageRef().collection('activity').add({ actor: me, action: action, detail: detail || '', timestamp: FV.serverTimestamp() }).catch(function () {}); }
    function sel(label, id, opts, val) {
        return '<div class="pg-field"><label>' + label + '</label><select id="' + id + '">' + opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>';
    }
    var hlType = 'image';
    function upField(label, id, val, vid) {
        return '<div class="pg-field"><label>' + label + '</label><div class="pg-up"><input id="' + id + '" type="url" value="' + esc(val || '') + '" placeholder="https://…"><button class="pg-chip-btn" data-act="pickInto" data-v="' + (vid ? 1 : 0) + '" data-a="' + id + '">Upload</button></div></div>';
    }

    // ----- upload (same endpoint the channels use)
    async function uploadFile(file) {
        var u = auth.currentUser || await whenAuth(); if (!u) throw new Error('auth');
        var tok = await u.getIdToken(), fd = new FormData();
        fd.append('file', file); fd.append('type', 'posts'); fd.append('username', me);
        var r = await fetch(UPLOAD_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: fd });
        if (!r.ok) throw new Error('upload ' + r.status);
        var j = await r.json(), link = j.url || j.mediaUrl || j.secure_url; if (!link) throw new Error('no url');
        return link;
    }
    function pickFile(accept) {
        return new Promise(function (res) { var i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = function () { res((i.files && i.files[0]) || null); }; i.click(); });
    }
    A.pickInto = async function (el) {
        var id = el.getAttribute('data-a'), vid = el.getAttribute('data-v') === '1', f = await pickFile(vid ? 'image/*,video/*' : 'image/*'); if (!f) return;
        if (vid) hlType = f.type.indexOf('video') === 0 ? 'video' : 'image';
        if (f.size > 25 * 1024 * 1024) { toast('Image is too large (max 25 MB)'); return; }
        toast('Uploading…');
        try { var link = await uploadFile(f), inp = $(id); if (inp) inp.value = link; toast('Uploaded'); } catch (e) { console.error(e); toast('Upload failed. Try again.'); }
    };
    A.pickMedia = async function () {
        var f = await pickFile('image/*,video/*'); if (!f) return;
        if (f.size > 100 * 1024 * 1024) { toast('File is too large (max 100 MB)'); return; }
        sheetState.file = f; var n = $('cp_fn'); if (n) { n.textContent = f.name; n.classList.add('has'); }
    };

    // ----- open / shell
    function openStudio(tabName) {
        if (!isOwner || !page) return;
        afterOrNow(function () {
            var o = $('pgStudio'); if (!o) return;
            if (tabName) st.tab = tabName;
            st.ins = {}; st.sched = null; st.fol = null;
            o.style.display = 'flex';
            if (!ovHas('studio')) ovPush('studio', function () { o.style.display = 'none'; });
            renderStudio(false);
        });
    }
    A.studio = function () { openStudio(); };
    A.stTab = function (el) { st.tab = el.getAttribute('data-a'); renderStudio(false); };
    function studioRefresh() { if (ovHas('studio')) renderStudio(true); }

    var ST_TABS = [['overview', 'Overview'], ['insights', 'Insights'], ['content', 'Content'], ['inbox', 'Inbox'], ['growth', 'Growth']];
    function renderStudio(keep) {
        var o = $('pgStudio'); if (!o || !page) return;
        if (!$('stBody')) {
            o.innerHTML = '<div class="pg-ov-top pg-st-top"><div class="bk" data-act="back"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M11 17l-5-5 5-5M18 12H6"/></svg></div>' +
                '<div class="pg-st-t"><b>Page Studio</b><small id="stName"></small></div><div class="bk" data-act="stMenu" aria-label="Manage page"><i class="fa-solid fa-ellipsis" style="font-size: var(--nx-fs-l)"></i></div></div>' +
                '<nav class="pg-st-tabs" id="stTabs"></nav><div class="pg-ov-body" id="stBody"></div>';
        }
        $('stName').textContent = page.name || '';
        $('stTabs').innerHTML = ST_TABS.map(function (t) { return '<div class="pg-st-tab' + (t[0] === st.tab ? ' on' : '') + '" data-act="stTab" data-a="' + t[0] + '">' + t[1] + '</div>'; }).join('');
        var b = $('stBody'), y = keep ? b.scrollTop : 0;
        var fn = { overview: stOverview, insights: stInsights, content: stContent, inbox: stInbox, growth: stGrowth }[st.tab] || stOverview;
        b.innerHTML = fn(); b.scrollTop = y;
    }

    // ----- analytics loader (cached per range while the Studio is open)
    function insData(r) {
        var c = st.ins[r]; if (c && c !== 'loading') return c;
        if (!c) loadIns(r);
        return null;
    }
    function loadIns(r) {
        st.ins[r] = 'loading';
        var days = [], i; for (i = r - 1; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); days.push({ d: d, k: ymd(d), views: 0, follows: 0, unfollows: 0, shares: 0, cta: 0 }); }
        var FP = firebase.firestore.FieldPath;
        pageRef().collection('analyticsDaily').where(FP.documentId(), '>=', days[0].k).where(FP.documentId(), '<=', days[days.length - 1].k).get().then(function (s) {
            var m = {}; s.docs.forEach(function (x) { m[x.id] = x.data(); });
            days.forEach(function (x) { var v = m[x.k] || {}; x.views = v.views || 0; x.follows = v.follows || 0; x.unfollows = v.unfollows || 0; x.shares = v.shares || 0; x.cta = v.ctaClicks || 0; });
        }).catch(function () {}).then(function () {
            var t = { days: days, views: 0, net: 0, gained: 0, shares: 0, cta: 0 };
            days.forEach(function (x) { t.views += x.views; t.gained += x.follows; t.net += x.follows - x.unfollows; t.shares += x.shares; t.cta += x.cta; });
            st.ins[r] = t; studioRefresh();
        });
    }
    function interactions() { var n = 0; posts.forEach(function (p) { n += (p.likesCount || 0) + (p.commentsCount || 0); }); return n; }
    function signed(n) { return (n > 0 ? '+' : '') + fmt(n); }
    function skel() { return '<div class="pg-sk s"></div><div class="pg-sk s"></div>'; }
    function bars(vals, labels, dense) {
        var max = Math.max(1, Math.max.apply(null, vals));
        return '<div class="pg-chart' + (dense ? ' dense' : '') + '">' + vals.map(function (v, i) { return '<div><i style="height:' + Math.max(4, v / max * 100) + '%"></i>' + (labels && labels[i] != null ? '<small>' + labels[i] + '</small>' : '') + '</div>'; }).join('') + '</div>';
    }

    // ----- Overview
    function stOverview() {
        var d = insData(7), s = status(), h = '';
        if (s !== 'published') h += '<div class="pg-banner in"><i class="fa-solid fa-eye-slash"></i><span>' + (s === 'archived' ? 'Archived' : 'Unpublished') + ' — only admins can see this page.</span><b data-act="stStatus">Change</b></div>';
        h += '<div class="pg-st-grid">' +
            '<div class="pg-st-stat"><b>' + fmt(page.followerCount || 0) + '</b><small>Followers</small></div>' +
            '<div class="pg-st-stat"><b>' + (d ? fmt(d.views) : '…') + '</b><small>Page views · 7 days</small></div>' +
            '<div class="pg-st-stat"><b>' + fmt(interactions()) + '</b><small>Likes and comments</small></div>' +
            '<div class="pg-st-stat"><b>' + (d ? signed(d.net) : '…') + '</b><small>Net followers · 7 days</small></div></div>';
        h += '<div class="pg-qa"><div data-act="createPost"><i class="fa-solid fa-plus"></i><span>Post</span></div><div data-act="editPage"><i class="fa-solid fa-pen"></i><span>Edit</span></div><div data-act="share"><i class="fa-solid fa-share-nodes"></i><span>Invite</span></div><div data-act="boost"><i class="fa-solid fa-rocket"></i><span>Boost</span></div></div>';
        var hl = hlList().length, items = [
            ['Add a profile photo', !!page.avatarUrl, 'editPage'], ['Add a cover photo', !!page.coverUrl, 'editPage'],
            ['Write a bio (30+ characters)', (page.description || '').trim().length >= 30, 'editPage'], ['Choose a category', !!page.category, 'editPage'],
            ['Add contact details', !!(page.website || page.contactPhone || page.contactEmail), 'editPage'], ['Add an action button', !!(page.cta && page.cta.url), 'ctaSheet'],
            ['Add a highlight', hl > 0, 'hlManager'], ['Publish your first post', posts.length > 0, 'createPost']];
        var done = items.filter(function (x) { return x[1]; }).length, pct = Math.round(done / items.length * 100);
        h += '<div class="pg-card"><div class="pg-card-h"><b>Profile strength</b><span>' + pct + '%</span></div><div class="pg-prog"><i style="width:' + pct + '%"></i></div>' +
            (done === items.length ? '<div class="pg-card-m">Your page is fully set up.</div>' : items.map(function (x) { return x[1] ? '' : '<div class="pg-todo" data-act="' + x[2] + '"><i class="fa-regular fa-circle"></i><span>' + x[0] + '</span><i class="fa-solid fa-chevron-right"></i></div>'; }).join('')) + '</div>';
        if (!d) h += skel();
        return h;
    }

    // ----- Insights
    function stInsights() {
        var r = st.range, d = insData(r);
        var h = '<div style="height:14px"></div><div class="pg-seg">' + [7, 28, 90].map(function (n) { return '<div class="' + (n === r ? 'on' : '') + '" data-act="stRange" data-a="' + n + '">' + n + ' days</div>'; }).join('') + '</div>';
        if (!d) return h + skel();
        var dense = r > 7, labels = d.days.map(function (x) { return dense ? null : x.d.toLocaleDateString(undefined, { weekday: 'narrow' }); });
        var range = d.days[0].d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' – ' + d.days[d.days.length - 1].d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        h += '<div class="pg-ins"><div><b>' + fmt(d.views) + '</b><small>Page views</small></div><div><b>' + signed(d.net) + '</b><small>Net followers</small></div><div><b>' + fmt(d.shares) + '</b><small>Shares</small></div><div><b>' + fmt(d.cta) + '</b><small>Button clicks</small></div></div>';
        h += '<div class="pg-sh-m" style="padding-top:16px">Page views · ' + range + '</div>' + bars(d.days.map(function (x) { return x.views; }), labels, dense);
        h += '<div class="pg-sh-m" style="padding-top:20px">New followers · ' + fmt(d.gained) + ' gained</div>' + bars(d.days.map(function (x) { return x.follows; }), labels, dense);
        var top = posts.slice().sort(function (a, b) { return ((b.likesCount || 0) + (b.commentsCount || 0)) - ((a.likesCount || 0) + (a.commentsCount || 0)); }).filter(function (p) { return (p.likesCount || 0) + (p.commentsCount || 0) > 0; }).slice(0, 5);
        h += '<div class="pg-st-h">Top posts</div>' + (top.length ? top.map(function (p) { return postRow(p, true); }).join('') : '<div class="pg-sh-m">Posts with likes or comments will show up here.</div>');
        return h + '<div style="height:20px"></div>';
    }
    A.stRange = function (el) { st.range = +el.getAttribute('data-a'); renderStudio(true); };

    // ----- Content
    function thumbOf(p) {
        var m = null; try { m = (window.postCard_normalizeMediaItems ? window.postCard_normalizeMediaItems(p) : [])[0]; } catch (e) {}
        if (!m && p.mediaUrl) m = { url: p.mediaUrl, type: p.mediaType };
        if (!m || !m.url) return '<div class="th"><i class="fa-regular fa-file-lines"></i></div>';
        return m.type === 'video' ? '<div class="th"><i class="fa-solid fa-play"></i></div>' : '<div class="th"><img src="' + esc(m.url) + '" alt="" loading="lazy"></div>';
    }
    function postKind(p) { return p.visible === false ? 'sched' : p.locked ? 'cap' : 'pub'; }
    function postRow(p, noMenu) {
        var k = postKind(p), meta = '';
        if (k === 'sched') meta = '<i class="fa-regular fa-clock"></i> Scheduled · ' + (p.publishAt ? new Date(p.publishAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
        else if (k === 'cap') meta = '<i class="fa-solid fa-lock"></i> Unlocks ' + (p.unlockAt ? new Date(p.unlockAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
        else meta = ago(p.timestamp) + ' · <i class="fa-regular fa-heart"></i> ' + fmt(p.likesCount || 0) + ' · <i class="fa-regular fa-comment"></i> ' + fmt(p.commentsCount || 0);
        return '<div class="pg-item"' + (noMenu ? '' : ' data-act="stPost" data-a="' + esc(p.id) + '"') + '>' + thumbOf(p) + '<div class="tx"><div class="t">' + (p.pinned ? '<i class="fa-solid fa-thumbtack"></i> ' : '') + esc((p.content || (p.mediaUrl ? 'Media post' : 'Post')).slice(0, 90)) + '</div><div class="m">' + meta + '</div></div>' + (noMenu ? '' : '<i class="fa-solid fa-ellipsis ell"></i>') + '</div>';
    }
    function contentList() {
        var sc = Array.isArray(st.sched) ? st.sched : [], f = st.filter;
        var pub = posts.filter(function (p) { return !p.locked; }), cap = posts.filter(function (p) { return p.locked; });
        if (f === 'published') return pub; if (f === 'scheduled') return sc; if (f === 'capsule') return cap;
        return pub.concat(cap, sc).sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || ms(b.timestamp) - ms(a.timestamp); });
    }
    function loadSched() {
        st.sched = 'loading';
        db.collection('posts').where('pageId', '==', slug).where('visible', '==', false).get().then(function (s) {
            st.sched = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return ms(a.publishAt) - ms(b.publishAt); }); schedCount = st.sched.length;
        }).catch(function () { st.sched = []; }).then(studioRefresh);
    }
    function stContent() {
        if (st.sched === null) loadSched();
        var F = [['all', 'All'], ['published', 'Published'], ['scheduled', 'Scheduled'], ['capsule', 'Time capsule']];
        var h = '<div class="pg-st-bar"><button class="pg-btn pri" data-act="createPost"><i class="fa-solid fa-plus"></i> Create post</button></div><div class="pg-chips">' + F.map(function (x) { return '<span class="' + (x[0] === st.filter ? 'on' : '') + '" data-act="stFilter" data-a="' + x[0] + '">' + x[1] + '</span>'; }).join('') + '</div>';
        var l = contentList();
        if (!l.length) {
            if ((st.filter === 'scheduled' || st.filter === 'all') && st.sched === 'loading') return h + skel();
            return h + empty('fa-regular fa-newspaper', st.filter === 'scheduled' ? 'Nothing scheduled' : st.filter === 'capsule' ? 'No time capsules' : 'No posts yet', 'Posts you create will be managed here.');
        }
        return h + l.map(function (p) { return postRow(p); }).join('') + '<div style="height:20px"></div>';
    }
    A.stFilter = function (el) { st.filter = el.getAttribute('data-a'); renderStudio(true); };
    function findPost(id) { return posts.concat(Array.isArray(st.sched) ? st.sched : []).filter(function (p) { return p.id === id; })[0]; }
    A.stPost = function (el) {
        var id = el.getAttribute('data-a'), p = findPost(id); if (!p) return;
        var k = postKind(p), h = '<div class="pg-sh-t">Manage post</div><div class="pg-sh-m">' + esc((p.content || 'Media post').slice(0, 80)) + '</div>';
        if (k === 'pub') h += row('fa-solid fa-thumbtack', p.pinned ? 'Unpin from top' : 'Pin to top', '', 'stPin', id);
        h += row('fa-solid fa-pen', 'Edit text', '', 'stEditPost', id) + row('fa-regular fa-trash-can', k === 'sched' ? 'Cancel and delete' : 'Delete post', '', 'delPostAsk', id, 'danger');
        openSheet(h);
    };
    A.stPin = function (el) {
        var id = el.getAttribute('data-a'), p = findPost(id); if (!p) return; closeSheet();
        db.collection('posts').doc(id).update({ pinned: !p.pinned }).then(function () { toast(p.pinned ? 'Unpinned' : 'Pinned to top'); log(p.pinned ? 'Unpinned a post' : 'Pinned a post', (p.content || '').slice(0, 60)); }).catch(function () { toast('Could not update'); });
    };
    A.stEditPost = function (el) {
        var id = el.getAttribute('data-a'), p = findPost(id); if (!p) return; sheetState.pid = id;
        afterSheet(function () { openSheet('<div class="pg-sh-t">Edit text</div>' + area('', 'ed_text', p.content, 'Write something…', 6) + btns(btn('Save', 'stSavePost', 'pri'))); });
    };
    A.stSavePost = function () {
        var id = sheetState.pid, t = $('ed_text').value.trim(), p = findPost(id); if (!p) return;
        if (!t && !p.mediaUrl) { toast('Add some text'); return; }
        db.collection('posts').doc(id).update({ content: t }).then(function () { if (Array.isArray(st.sched)) st.sched.forEach(function (x) { if (x.id === id) x.content = t; }); closeSheet(); toast('Post updated'); log('Edited a post', t.slice(0, 60)); studioRefresh(); }).catch(function () { toast('Could not save'); });
    };

    // ----- Inbox
    function loadFol() {
        st.fol = 'loading';
        pageRef().collection('followers').orderBy('followedAt', 'desc').limit(20).get().then(function (s) {
            return Promise.all(s.docs.map(function (d) {
                var at = d.data().followedAt;
                return db.collection('users').doc(d.id).get().then(function (u) { var x = u.exists ? u.data() : {}; return { id: d.id, name: x.fullName || d.id, pic: x.userProfilePic || '', at: at }; }).catch(function () { return { id: d.id, name: d.id, pic: '', at: at }; });
            }));
        }).then(function (l) { st.fol = l; }).catch(function () { st.fol = []; }).then(studioRefresh);
    }
    function stInbox() {
        var h = '<div style="height:14px"></div><div class="pg-seg"><div class="' + (st.inbox === 'reviews' ? 'on' : '') + '" data-act="stInbox" data-a="reviews">Reviews' + (reviews.length ? ' · ' + reviews.length : '') + '</div><div class="' + (st.inbox === 'followers' ? 'on' : '') + '" data-act="stInbox" data-a="followers">New followers</div></div>';
        if (st.inbox === 'followers') {
            if (st.fol === null) loadFol();
            if (!Array.isArray(st.fol)) return h + skel();
            if (!st.fol.length) return h + empty('fa-regular fa-user', 'No followers yet', 'Share your page to get your first followers.', '<button class="pg-btn pri" data-act="share">Share page</button>');
            return h + st.fol.map(function (f) { return '<div class="pg-item"><div class="th round">' + (f.pic ? '<img src="' + esc(f.pic) + '" alt="" loading="lazy">' : esc(String(f.name).charAt(0).toUpperCase())) + '</div><div class="tx"><div class="t">' + esc(f.name) + '</div><div class="m">@' + esc(f.id) + ' · ' + ago(f.at) + '</div></div></div>'; }).join('');
        }
        if (!reviews.length) return h + empty('fa-regular fa-star', 'No reviews yet', 'Reviews from your followers will appear here.');
        return h + reviews.map(function (x) {
            return '<div class="pg-rv in"><div class="pg-rv-h"><div class="pg-rv-av">' + esc((x.author || '?').charAt(0)) + '</div><div><div class="pg-rv-n">' + esc(x.author || 'Member') + '</div><div class="pg-rv-d"><span class="pg-stars">' + stars(x.rating) + '</span> · ' + ago(x.timestamp) + '</div></div></div>' +
                (x.text ? '<div class="pg-rv-t">' + esc(x.text) + '</div>' : '') +
                (x.reply && x.reply.text ? '<div class="pg-rv-reply"><b>Your reply</b><span>' + esc(x.reply.text) + '</span></div>' : '') +
                '<div class="pg-rv-act"><button class="pg-chip-btn" data-act="stReply" data-a="' + esc(x.id) + '">' + (x.reply && x.reply.text ? 'Edit reply' : 'Reply') + '</button></div></div>';
        }).join('') + '<div style="height:20px"></div>';
    }
    A.stInbox = function (el) { st.inbox = el.getAttribute('data-a'); renderStudio(false); };
    A.stReply = function (el) {
        var id = el.getAttribute('data-a'), x = reviews.filter(function (r) { return r.id === id; })[0]; if (!x) return; sheetState.rid = id;
        openSheet('<div class="pg-sh-t">Reply to ' + esc(x.author || 'review') + '</div><div class="pg-sh-m">' + stars(x.rating) + (x.text ? ' · “' + esc(x.text.slice(0, 100)) + '”' : '') + '</div>' + area('', 'rp_text', x.reply && x.reply.text, 'Write a public reply…', 4) + btns(btn('Post reply', 'stSendReply', 'pri'), x.reply && x.reply.text ? btn('Delete reply', 'stDelReply', 'sec') : ''));
    };
    A.stSendReply = function () {
        var t = $('rp_text').value.trim(), id = sheetState.rid; if (!t) { toast('Write a reply first'); return; }
        pageRef().collection('reviews').doc(id).update({ reply: { text: t, by: me, at: FV.serverTimestamp() } }).then(function () { toast('Reply posted'); log('Replied to a review', id); }).catch(function () { toast('Could not post the reply'); });
        closeSheet();
    };
    A.stDelReply = function () {
        pageRef().collection('reviews').doc(sheetState.rid).update({ reply: FV.delete() }).then(function () { toast('Reply deleted'); }).catch(function () { toast('Could not delete'); });
        closeSheet();
    };

    // ----- Growth
    function activeIdent() { try { var o = JSON.parse(localStorage.getItem('nx_active_identity') || 'null'); return !!(o && o.type === 'page' && o.id === slug && o.owner === me); } catch (e) { return false; } }
    function stGrowth() {
        var c = page.cta && page.cta.url ? page.cta.label : 'Not set';
        return '<div class="pg-st-h">Grow your audience</div>' +
            row('fa-solid fa-share-nodes', 'Share your page', 'Send it to friends and groups', 'share') + row('fa-solid fa-link', 'Copy page link', '', 'copyLink') + row('fa-solid fa-rocket', 'Boost your page', 'Reach more people with a promotion', 'boost') +
            '<div class="pg-st-h">Turn visitors into customers</div>' +
            row('fa-solid fa-arrow-pointer', 'Action button', esc(c), 'ctaSheet') + row('fa-regular fa-circle-play', 'Highlights', hlList().length + ' pinned', 'hlManager') +
            '<div class="pg-st-h">Trust and identity</div>' +
            (page.verified ? row('fa-solid fa-circle-check', 'Verified page', 'Your page has the verified badge', 'noop') : row('fa-solid fa-circle-check', 'Get verified', 'Show people your page is authentic', 'getVerified')) +
            row('fa-solid fa-user-astronaut', activeIdent() ? 'Switch back to your personal account' : 'Use Nexus as this page', activeIdent() ? 'You are posting as this page' : 'Post and comment as this page', 'useAsPage') +
            '<div class="pg-st-h">Help</div>' + row('fa-regular fa-life-ring', 'Help and support', 'Talk to the Nexus team about this page', 'support') + '<div style="height:20px"></div>';
    }
    A.noop = function () {};
    A.getVerified = function () {
        var u = 'get-verified.html';
        if (typeof window.openPageOverlay === 'function') { window.openPageOverlay(u); return; }
        if (window.NexusRouter && NexusRouter.navigateTo) NexusRouter.navigateTo(u); else location.href = u;
    };
    A.useAsPage = function () {
        var on = activeIdent();
        try {
            if (on) localStorage.removeItem('nx_active_identity');
            else localStorage.setItem('nx_active_identity', JSON.stringify({ type: 'page', id: slug, name: page.name, avatar: page.avatarUrl || '', owner: me }));
            window.dispatchEvent(new CustomEvent('nexus:identitychange', { detail: on ? null : { type: 'page', id: slug, name: page.name, avatar: page.avatarUrl || '', owner: me } }));
        } catch (e) {}
        toast(on ? 'You are back on your personal account' : 'You are now using Nexus as ' + (page.name || 'this page')); renderStudio(true);
    };

    // ----- action button
    A.ctaSheet = function () { if (!isOwner || !page) return; afterOrNow(function () {
        var c = page.cta || {};
        openSheet('<div class="pg-sh-t">Action button</div><div class="pg-sh-m">Shown next to the main button on your page.</div>' + sel('Button text', 'cta_l', CTA_LABELS, c.label || 'Learn more') + field('Link', 'cta_u', c.url, 'https://…', 'url') + btns(btn('Save', 'ctaSave', 'pri'), c.url ? btn('Remove button', 'ctaRemove', 'sec') : ''));
    }); };
    A.ctaSave = async function () {
        var u = url($('cta_u').value), l = $('cta_l').value; if (!u) { toast('Add a link for the button'); return; }
        try { await pageRef().update({ cta: { label: l, url: u } }); closeSheet(); toast('Button saved'); log('Updated the action button', l); } catch (e) { toast('Could not save'); }
    };
    A.ctaRemove = async function () { try { await pageRef().update({ cta: FV.delete() }); closeSheet(); toast('Button removed'); log('Removed the action button'); } catch (e) { toast('Could not remove'); } };

    // ----- highlights manager
    function hlList() { return (page && Array.isArray(page.highlights)) ? page.highlights.filter(function (x) { return x && x.img; }) : []; }
    A.hlManager = function () { if (!isOwner || !page) return; afterOrNow(hlSheet); };
    function hlSheet() {
        var l = hlList(), h = '<div class="pg-sh-t">Highlights</div><div class="pg-sh-m">Stories pinned under your bio. Up to 10.</div>';
        l.forEach(function (x, i) { h += '<div class="pg-admin">' + (x.type === 'video' ? '<video class="pg-hl-th" src="' + esc(x.img) + '#t=0.1" muted playsinline preload="metadata"></video>' : '<img class="pg-hl-th" src="' + esc(x.img) + '" alt="">') + '<span>' + esc(x.label || 'Untitled') + '</span><button class="pg-chip-btn danger" data-act="hlRemove" data-a="' + i + '">Remove</button></div>'; });
        if (l.length < 10) h += '<div style="height:8px"></div>' + field('Label', 'hl_label', '', 'e.g. Menu') + upField('Image or video', 'hl_img', '', true) + btns(btn('Add highlight', 'hlAdd', 'pri'));
        openSheet(h);
    }
    async function hlSave(arr, msg, logMsg) {
        try { await pageRef().update({ highlights: arr }); page.highlights = arr; toast(msg); log(logMsg); renderHighlights(); hlSheet(); studioRefresh(); } catch (e) { console.error(e); toast('Could not save'); }
    }
    A.hlAdd = function () {
        var img = url($('hl_img').value), label = $('hl_label').value.trim(); if (!img) { toast('Add an image'); return; }
        hlSave(hlList().concat([{ img: img, label: label, type: (hlType === 'video' || /\.(mp4|mov|webm)(\?|$)/i.test(img)) ? 'video' : 'image' }]), 'Highlight added', 'Added a highlight'); hlType = 'image';
    };
    A.hlRemove = function (el) { var l = hlList(); l.splice(+el.getAttribute('data-a'), 1); hlSave(l, 'Highlight removed', 'Removed a highlight'); };

    // ----- boost request (record only: no payment is taken here)
    A.boost = function () { if (!isOwner || !page) return; afterOrNow(function () {
        openSheet('<div class="pg-sh-t">Boost your page</div><div class="pg-sh-m">Tell us what you want to achieve. Nothing is charged now — the Nexus team reviews your request and gets back to you.</div>' +
            sel('Goal', 'bo_goal', ['More followers', 'More profile visits', 'More link clicks', 'Promote a post'], '') + field('Budget', 'bo_budget', '', '50', 'number') + sel('Currency', 'bo_cur', CURRENCIES, 'USD') + sel('Duration', 'bo_days', [['3', '3 days'], ['7', '7 days'], ['14', '14 days'], ['30', '30 days']], '7') + btns(btn('Send request', 'boostSend', 'pri')));
    }); };
    A.boostSend = async function () {
        var b = parseFloat($('bo_budget').value); if (!(b > 0)) { toast('Enter a budget'); return; }
        if (busy.boost) return; busy.boost = true;
        var goal = $('bo_goal').value;
        try {
            await db.collection('pageBoostRequests').add({ pageId: slug, pageName: page.name || '', requestedBy: me, goal: goal, budget: b, currency: $('bo_cur').value, days: +$('bo_days').value, status: 'pending', timestamp: FV.serverTimestamp() });
            closeSheet(); toast('Request sent. We’ll be in touch.'); log('Requested a boost', goal);
        } catch (e) { console.error(e); toast('Could not send the request'); }
        finally { busy.boost = false; }
    };

    // ----- support
    A.support = function () { afterOrNow(function () {
        openSheet('<div class="pg-sh-t">Help and support</div><div class="pg-sh-m">Describe the problem or question about ' + esc((page && page.name) || 'your page') + '.</div>' + sel('Topic', 'su_topic', ['Something isn’t working', 'Verification', 'Account or roles', 'Report abuse', 'Other'], '') + area('', 'su_text', '', 'How can we help?', 5) + btns(btn('Send', 'supportSend', 'pri')));
    }); };
    A.supportSend = async function () {
        var t = $('su_text').value.trim(); if (!t) { toast('Write your message first'); return; }
        try { await db.collection('supportRequests').add({ source: 'page', pageId: slug, pageName: page.name || '', from: me, topic: $('su_topic').value, message: t, status: 'open', timestamp: FV.serverTimestamp() }); closeSheet(); toast('Message sent. Thank you.'); }
        catch (e) { toast('Could not send your message'); }
    };

    // ----- page status, archive, delete, restore
    A.stStatus = function () { if (!isOwner || !page) return; afterOrNow(function () {
        var s = status();
        openSheet('<div class="pg-sh-t">Page status</div><div class="pg-sh-m">Control who can see this page.</div>' +
            radio('Published', 'Visible to everyone', s === 'published', 'setStatus', 'published') + radio('Unpublished', 'Only admins can see it. Followers keep following.', s === 'unpublished', 'setStatus', 'unpublished') + radio('Archived', 'Hidden and kept for your records. Restore any time.', s === 'archived', 'setStatus', 'archived'));
    }); };
    A.setStatus = async function (el) {
        var s = el.getAttribute('data-a'); if (s === status()) { closeSheet(); return; }
        try { await pageRef().update({ status: s }); page.status = s; closeSheet(); toast(s === 'published' ? 'Page is published' : s === 'archived' ? 'Page archived' : 'Page unpublished'); log('Changed page status', s); renderHero(); studioRefresh(); }
        catch (e) { toast('Could not change the status'); }
    };
    A.stDelete = function () {
        if (!isCreator()) { toast('Only the page owner can delete the page'); return; }
        afterSheet(function () { confirmSheet('Delete this page?', 'It disappears for everyone, including its followers. Only you can restore it later from the page link.', 'Delete page', 'danger', async function () {
            try { await pageRef().update({ status: 'deleted', deletedAt: FV.serverTimestamp() }); log('Deleted the page'); toast('Page deleted'); } catch (e) { toast('Could not delete the page'); }
        }); });
    };
    A.restore = async function () {
        try { await pageRef().update({ status: 'unpublished', deletedAt: FV.delete() }); log('Restored the page'); toast('Page restored as unpublished'); } catch (e) { toast('Could not restore'); }
    };

    // ----- activity log
    A.stLog = function () { afterSheet(function () {
        openSheet('<div class="pg-sh-t">Activity log</div><div class="pg-sh-m">What admins changed on this page.</div><div id="lg_list">' + skel() + '</div>');
        pageRef().collection('activity').orderBy('timestamp', 'desc').limit(40).get().then(function (s) {
            var l = $('lg_list'); if (!l) return;
            l.innerHTML = s.empty ? empty('fa-regular fa-clock', 'No activity yet', 'Changes made by admins show up here.') : s.docs.map(function (d) { var x = d.data(); return '<div class="pg-admin"><span><b style="font-weight: var(--nx-fw)">' + esc(x.actor) + '</b> ' + esc((x.action || '').toLowerCase()) + '<small style="margin:2px 0 0;display:block">' + (x.detail ? esc(x.detail) + ' · ' : '') + ago(x.timestamp) + '</small></span></div>'; }).join('');
        }).catch(function () { var l = $('lg_list'); if (l) l.innerHTML = '<div class="pg-sh-m">Could not load the activity log.</div>'; });
    }); };

    // ----- manage menu (⋯ in the Studio header)
    A.stMenu = function () {
        var s = status();
        var h = '<div class="pg-sh-head"><img src="' + esc(page.avatarUrl || BLANK) + '" alt=""><div><div class="pg-sh-t">' + esc(page.name || 'Page') + '</div><div class="pg-sh-m">Manage this page</div></div></div>' +
            row('fa-solid fa-pen', 'Edit page info', '', 'editPage') + row('fa-solid fa-user-group', 'Page roles', (1 + (page.adminUsernames || []).length) + ' admin(s)', 'roles') +
            row('fa-regular fa-eye', 'Page status', s === 'published' ? 'Published' : s === 'archived' ? 'Archived' : 'Unpublished', 'stStatus') + row('fa-regular fa-circle-play', 'Highlights', '', 'hlManager') +
            row('fa-regular fa-clock', 'Activity log', '', 'stLog') + row('fa-regular fa-life-ring', 'Help and support', '', 'support');
        if (isCreator()) h += '<div class="pg-sep"></div>' + row('fa-solid fa-box-archive', s === 'archived' ? 'Restore from archive' : 'Archive page', 'Hide it without losing anything', 'stArchive') + row('fa-regular fa-trash-can', 'Delete page', '', 'stDelete', null, 'danger');
        openSheet(h);
    };
    A.stArchive = async function () {
        var back = status() === 'archived', s = back ? 'published' : 'archived';
        try { await pageRef().update({ status: s }); page.status = s; closeSheet(); toast(back ? 'Page restored' : 'Page archived'); log('Changed page status', s); renderHero(); studioRefresh(); } catch (e) { toast('Could not update'); }
    };

    // ============================================================
    // GLOBAL WIRING + LIFECYCLE
    // ============================================================
    function onClick(e) {
        var bg = e.target; if (bg && bg.id === 'pgSheetBg') { closeSheet(); return; }
        var cta = e.target.closest ? e.target.closest('[data-cta]') : null; if (cta && !isOwner) track('ctaClicks');
        var el = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!el || !el.closest('#page-content')) return;
        var fn = A[el.getAttribute('data-act')]; if (fn) { e.preventDefault(); fn(el, e); }
    }
    function onScrollHeaderNX() {
        var header = document.querySelector('header'); if (!header) return;
        if (window.scrollY > 140) header.classList.add('header-scrolled'); else header.classList.remove('header-scrolled');
    }
    function onSearchInput(e) { runSearch(e.target.value); }

    function initPage() {
        teardown();   // idempotent: init can be called twice (router + direct load)
        me = localStorage.getItem('nexus_user_session');
        if (!me) { window.location.href = 'login.html'; return; }
        slug = new URLSearchParams(window.location.search).get('page');
        document.documentElement.classList.toggle('pg-loading', !!slug);
        page = null; isOwner = false; following = false; saved = false; blocked = false; notifPref = 'All'; posts = []; postsLoaded = false; reviews = []; reviewsLoaded = false; products = []; events = []; schedCount = 0;
        editShortcutDone = false; gated = ''; st = newStudioState();
        tab = 'posts'; bioOpen = false; viewTracked = false; booted = false; ovStack = []; busy = {};
        pend = {}; srvPosts = []; postsErr = false; fby = null; fbyFor = null; fbyTotal = 0; indPrev = null;

        // a previous page may have left scrolling locked — Pages must always scroll
        try { document.body.style.removeProperty('overflow'); document.body.style.removeProperty('position'); document.documentElement.style.removeProperty('overflow'); } catch (e) {}

        prevGlobals = { showToast: window.showToast, openNeuralMenu: window.openNeuralMenu, openModal: window.openModal, openMenuSheet: window.openMenuSheet, switchTab: window.switchTab };
        window.showToast = toast;
        window.openNeuralMenu = function (postId) { postMenu(postId); };
        window.openModal = function (id) { if (id === 'searchModal') openSearch(); };
        window.openMenuSheet = openMenu;
        window.switchTab = setTab;

        authReady = new Promise(function (resolve) { authUnsub = auth.onAuthStateChanged(function (u) { resolve(u); }); });
        document.addEventListener('click', onClick);
        window.addEventListener('popstate', onPop, true);
        window.addEventListener('scroll', onScrollHeaderNX, { passive: true });
        var si = $('pgSearchInput'); if (si) si.addEventListener('input', onSearchInput);

        boot();
        onScrollHeaderNX();
    }

    function teardown() {
        unsubs.forEach(function (u) { try { u(); } catch (e) {} }); unsubs = [];
        if (authUnsub) { try { authUnsub(); } catch (e) {} authUnsub = null; }
        document.removeEventListener('click', onClick);
        window.removeEventListener('popstate', onPop, true);
        window.removeEventListener('scroll', onScrollHeaderNX);
        ovStack = [];
        if (prevGlobals) { Object.keys(prevGlobals).forEach(function (k) { if (prevGlobals[k] === undefined) delete window[k]; else window[k] = prevGlobals[k]; }); prevGlobals = null; }
    }
    function destroyPage() { teardown(); document.documentElement.classList.remove('pg-loading'); }

    window.NexusRouter.registerPage('pages.html', { init: initPage, destroy: destroyPage });
    if (window.NexusRouter.getCurrentPath() === 'pages.html') initPage();
})();
