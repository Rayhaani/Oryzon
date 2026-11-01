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
    var following = false, saved = false, blocked = false, notifPref = 'All';
    var posts = [], postsLoaded = false, reviews = [], reviewsLoaded = false, products = [], events = [], schedCount = 0;
    var tab = 'posts', bioOpen = false, media = { photo: [], video: [], hl: [] };
    var unsubs = [], authUnsub = null, authReady = null, viewTracked = false, booted = false;
    var prevGlobals = null, ovStack = [], sheetState = {}, busy = {};

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

    function renderHero() {
        if (!page) return;
        var name = page.name || 'Page', v = !!page.verified;
        var cover = $('pageCoverImg'); if (page.coverUrl) { cover.src = page.coverUrl; cover.style.display = ''; } else { cover.style.display = 'none'; }
        var av = $('pageAvatarImg'); av.onerror = function () { av.onerror = null; av.src = BLANK; }; av.src = page.avatarUrl || BLANK;
        $('pageNameTitle').innerHTML = esc(name) + (v ? '<i class="fa-solid fa-circle-check verified-badge"></i>' : '') + (page.trustScore ? '<span class="pg-trust"><i class="fa-solid fa-shield-halved"></i> Trust ' + esc(page.trustScore) + '</span>' : '');
        var ht = $('headerTitleText'); if (ht && ht.childNodes[0]) ht.childNodes[0].textContent = name + ' ';
        var hv = $('headerVerifiedIcon'); if (hv) hv.style.display = v ? '' : 'none';
        $('pageMetaRow').textContent = [page.category, fmt(page.followerCount || 0) + ' followers'].filter(Boolean).join(' · ');

        var bio = (page.description || '').trim(), long = bio.length > 150 || bio.split('\n').length > 3;
        $('pgBioWrap').innerHTML = bio ? '<div class="pg-bio' + (long && !bioOpen ? ' clamp' : '') + '">' + esc(bio) + '</div>' + (long ? '<span class="pg-more" data-act="bio">' + (bioOpen ? 'Show less' : 'more') + '</span>' : '') : '';

        var f = [], loc = page.address || page.location, web = page.website;
        if (loc) f.push('<div class="pg-fact"><i class="fa-solid fa-location-dot"></i><span>' + esc(loc) + '</span></div>');
        if (web) f.push('<div class="pg-fact"><i class="fa-solid fa-link"></i><a href="' + esc(url(web)) + '" target="_blank" rel="noopener">' + esc(String(web).replace(/^https?:\/\//i, '').replace(/\/$/, '')) + '</a></div>');
        if (page.contactPhone) f.push('<div class="pg-fact"><i class="fa-solid fa-phone"></i><a href="tel:' + esc(page.contactPhone) + '">' + esc(page.contactPhone) + '</a></div>');
        $('pgFacts').innerHTML = f.join('');
        $('pgFacts').style.display = f.length ? '' : 'none';

        renderStats(); renderActions(); renderHighlights();
    }
    function renderStats() {
        var r = ratingInfo();
        $('pgStats').innerHTML =
            '<div class="pg-stat"><b>' + fmt(page ? page.followerCount : 0) + '</b><small>Followers</small></div>' +
            '<div class="pg-stat"><b>' + fmt(posts.length) + '</b><small>Posts</small></div>' +
            '<div class="pg-stat tap" data-act="tab" data-a="reviews"><b>' + (r ? r.avg.toFixed(1) + ' <span style="color:#f5b942;font-size:14px">★</span>' : '—') + '</b><small>' + (r ? fmt(r.n) + (r.n === 1 ? ' review' : ' reviews') : 'No reviews') + '</small></div>';
    }
    function renderActions() {
        var h = '';
        if (isOwner) {
            h = '<button class="pg-btn pri" data-act="createPost"><i class="fa-solid fa-plus"></i> Create post</button>' +
                '<button class="pg-btn ico" data-act="editPage" aria-label="Edit page"><i class="fa-solid fa-pen"></i></button>' +
                '<button class="pg-btn ico" data-act="insights" aria-label="Insights"><i class="fa-solid fa-chart-simple"></i></button>';
        } else {
            h = following ? '<button class="pg-btn sec" data-act="follow"><i class="fa-solid fa-check"></i> Following</button>' : '<button class="pg-btn pri" data-act="follow">Follow</button>';
            if (page && page.creatorUsername && page.creatorUsername !== me) h += '<button class="pg-btn ico" data-act="message" aria-label="Message"><i class="fa-regular fa-comment-dots"></i></button>';
            if (following) h += '<button class="pg-btn ico" data-act="notifSheet" aria-label="Notifications"><i class="fa-regular fa-bell"></i></button>';
        }
        if (page && page.cta && page.cta.url && page.cta.label) h = h.replace('<button class="pg-btn ico"', '<a class="pg-btn sec" href="' + esc(url(page.cta.url)) + '" target="_blank" rel="noopener">' + esc(page.cta.label) + '</a><button class="pg-btn ico"');
        $('pgActions').innerHTML = h;
    }
    function renderHighlights() {
        var hl = (page && Array.isArray(page.highlights)) ? page.highlights.filter(function (x) { return x && x.img; }) : [];
        media.hl = hl.map(function (x) { return { url: x.img, type: 'image', cap: x.label || '' }; });
        var el = $('pgHighlights'); el.style.display = hl.length ? '' : 'none';
        el.innerHTML = hl.map(function (x, i) { return '<div class="pg-hl-item" data-act="light" data-k="hl" data-i="' + i + '"><div class="pg-hl-ring"><img src="' + esc(x.img) + '" alt="" loading="lazy"></div><small>' + esc(x.label || '') + '</small></div>'; }).join('');
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
        $('pageTabs').innerHTML = t.map(function (x) { return '<div class="ptab' + (x[0] === tab ? ' active' : '') + '" data-act="tab" data-a="' + x[0] + '">' + x[1] + '</div>'; }).join('');
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + tab); });
    }
    function empty(icon, title, text, cta) { return '<div class="pg-empty"><div class="ei"><i class="' + icon + '"></i></div><b>' + title + '</b><p>' + text + '</p>' + (cta || '') + '</div>'; }
    function blockedCard() { return '<div class="pg-blocked">You blocked this page, so its posts are hidden.<br><button class="pg-btn sec" data-act="unblock">Unblock</button></div>'; }

    function renderPosts() {
        var c = $('timeline-area'); if (!c) return;
        if (blocked) { c.innerHTML = blockedCard(); return; }
        if (!slug) { c.innerHTML = empty('fa-regular fa-file-lines', 'No page selected', 'Open a page from Chats or search to see it here.'); return; }
        if (!page && !postsLoaded) { c.innerHTML = '<div class="pg-sk"></div><div class="pg-sk"></div>'; return; }
        var composer = isOwner ? '<div class="pg-composer" data-act="createPost"><img class="cav" src="' + esc((page && page.avatarUrl) || BLANK) + '" alt=""><span>Write something…</span><i class="fa-regular fa-image"></i></div>' : '';
        if (!postsLoaded) { c.innerHTML = composer + '<div class="pg-sk"></div><div class="pg-sk"></div>'; return; }
        if (!posts.length) { c.innerHTML = composer + empty('fa-regular fa-newspaper', 'No posts yet', isOwner ? 'Share your first update with your followers.' : 'When this page shares something, it will show up here.', isOwner ? '<button class="pg-btn pri" data-act="createPost">Create post</button>' : ''); return; }
        c.innerHTML = composer + '<div style="height:6px"></div>' + posts.map(function (p) { return window.generatePostHTML(p); }).join('');
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
        else h += reviews.map(function (x) { return '<div class="pg-rv"><div class="pg-rv-h"><div class="pg-rv-av">' + esc((x.author || '?').charAt(0)) + '</div><div><div class="pg-rv-n">' + esc(x.author || 'Member') + '</div><div class="pg-rv-d"><span class="pg-stars">' + stars(x.rating) + '</span> · ' + ago(x.timestamp) + '</div></div></div>' + (x.text ? '<div class="pg-rv-t">' + esc(x.text) + '</div>' : '') + '</div>'; }).join('');
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
            if (!viewTracked) { viewTracked = true; track('views'); }
            if (isOwner) refreshSched();
            renderAll();
            if (!booted) { booted = true; loadSecondary(); }
        }, function (err) { console.error('page listener error:', err); }));
        sub(db.collection('posts').where('pageId', '==', slug).orderBy('timestamp', 'desc').onSnapshot(function (snap) {
            var now = Date.now(), out = [];
            snap.docs.forEach(function (d) {
                var data = d.data();
                if (data.visible === false) { var at = ms(data.publishAt); if (at && at <= now) db.collection('posts').doc(d.id).update({ visible: true }).catch(function () {}); return; }
                out.push(Object.assign({}, data, { id: d.id, username: page ? page.name : data.username, userProfilePic: page ? page.avatarUrl : data.userProfilePic, isAdmin: isOwner }));
            });
            out.sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });
            posts = out; postsLoaded = true; buildMedia(); renderPosts(); renderGrids(); renderStats();
        }, function (err) { console.error('posts listener error:', err); postsLoaded = true; renderPosts(); }));
        if (me) {
            sub(pageRef().collection('followers').doc(me).onSnapshot(function (doc) { following = doc.exists; renderActions(); }));
            myPageDoc().get().then(function (d) { notifPref = (d.exists && d.data().notifPref) || 'All'; }).catch(function () {});
            db.collection('users').doc(me).collection('savedPages').doc(slug).get().then(function (d) { saved = d.exists; }).catch(function () {});
            db.collection('users').doc(me).collection('blockedPages').doc(slug).get().then(function (d) { if (d.exists) { blocked = true; renderPosts(); renderGrids(); } }).catch(function () {});
        }
    }
    function loadSecondary() {
        sub(pageRef().collection('reviews').orderBy('timestamp', 'desc').limit(100).onSnapshot(function (snap) {
            reviews = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); reviewsLoaded = true; renderReviews(); renderStats();
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
    A.closeSheet = function () { closeSheet(); };
    A.yes = function () { var f = sheetState.yes; afterSheet(function () { if (f) f(); }); };
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
        if (isOwner) h += '<div class="pg-sep"></div>' + row('fa-solid fa-pen', 'Edit page info', '', 'editPage') + row('fa-solid fa-user-group', 'Page roles', (1 + ((page && page.adminUsernames) || []).length) + ' admin(s)', 'roles') + row('fa-solid fa-chart-simple', 'Insights', '', 'insights') + row('fa-regular fa-clock', 'Scheduled posts', schedCount + ' scheduled', 'scheduled');
        if (!isOwner) h += '<div class="pg-sep"></div>' + row('fa-regular fa-flag', 'Report page', '', 'report', null, 'danger') + row('fa-solid fa-ban', blocked ? 'Unblock page' : 'Block page', '', blocked ? 'unblock' : 'blockAsk', null, 'danger');
        openSheet(h);
    }
    A.notifSheetMenu = function () { afterSheet(A.notifSheet); };
    A.share = function () {
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
    A.copyLink = function () { var u = pageUrl(); closeSheet(); try { navigator.clipboard.writeText(u).then(function () { toast('Link copied'); }, function () { toast('Could not copy'); }); } catch (e) { toast('Could not copy'); } };
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
        sheetState.timing = 'now';
        openSheet('<div class="pg-sh-t">Create post</div><div class="pg-sh-m">Publishes to this page’s timeline.</div>' + area('', 'cp_text', '', 'Write something…', 4) + field('Image URL (optional)', 'cp_img', '', 'https://…', 'url') +
            '<div class="pg-seg" id="cp_seg"><div class="on" data-act="timing" data-a="now">Now</div><div data-act="timing" data-a="scheduled">Schedule</div><div data-act="timing" data-a="capsule">Time capsule</div></div>' +
            '<div class="pg-field" id="cp_datef" style="display:none"><label id="cp_datel">Publish at</label><input id="cp_date" type="datetime-local"></div>' + btns(btn('Publish', 'publish', 'pri')));
    }
    A.timing = function (el) {
        var t = el.getAttribute('data-a'); sheetState.timing = t;
        document.querySelectorAll('#cp_seg div').forEach(function (d) { d.classList.toggle('on', d === el); });
        $('cp_datef').style.display = t === 'now' ? 'none' : ''; $('cp_datel').textContent = t === 'capsule' ? 'Unlocks at' : 'Publish at';
    };
    A.publish = async function () {
        if (busy.pub) return;
        var text = $('cp_text').value.trim(), img = $('cp_img').value.trim(), timing = sheetState.timing, dv = $('cp_date').value;
        if (!text && !img) { toast('Write something or add an image'); return; }
        if (timing !== 'now' && !dv) { toast('Choose a date and time'); return; }
        busy.pub = true;
        try {
            var u = await whenAuth(); if (!u) { toast('You need to be signed in'); return; }
            var doc = { pageId: slug, username: page ? page.name : me, userProfilePic: page ? (page.avatarUrl || '') : '', content: text, mediaUrl: img || null, mediaType: img ? 'image' : null, likesCount: 0, commentsCount: 0, pinned: false, authorUsername: me, timestamp: FV.serverTimestamp() };
            if (timing === 'scheduled') { doc.visible = false; doc.publishAt = new Date(dv).toISOString(); }
            else if (timing === 'capsule') { doc.visible = true; doc.locked = true; doc.unlockAt = new Date(dv).toISOString(); doc.lockedSubtitle = 'Time-Capsule Post'; }
            else doc.visible = true;
            await db.collection('posts').add(doc);
            closeSheet(); toast(timing === 'now' ? 'Post published' : timing === 'capsule' ? 'Time-capsule post created' : 'Post scheduled'); if (timing === 'scheduled') refreshSched();
        } catch (e) { console.error(e); toast('Could not publish. Try again.'); }
        finally { busy.pub = false; }
    };

    // ----- edit page
    A.editPage = function () { if (!isOwner || !page) return; afterOrNow(function () {
        openSheet('<div class="pg-sh-t">Edit page info</div><div class="pg-sh-m">Visible to everyone who views this page.</div>' +
            field('Name', 'ep_name', page.name) + field('Category', 'ep_cat', page.category) + area('Bio', 'ep_desc', page.description, '', 4) + field('Website', 'ep_web', page.website, 'example.com') + field('Phone', 'ep_phone', page.contactPhone, '', 'tel') + field('Email', 'ep_email', page.contactEmail, '', 'email') + field('Address', 'ep_addr', page.address || page.location) + field('Cover image URL', 'ep_cover', page.coverUrl, 'https://…', 'url') + field('Profile image URL', 'ep_av', page.avatarUrl, 'https://…', 'url') + btns(btn('Save changes', 'saveEdit', 'pri')));
    }); };
    A.saveEdit = async function () {
        var name = $('ep_name').value.trim(); if (!name) { toast('Page name is required'); return; }
        try {
            await pageRef().update({ name: name, category: $('ep_cat').value.trim(), description: $('ep_desc').value.trim(), website: $('ep_web').value.trim(), contactPhone: $('ep_phone').value.trim(), contactEmail: $('ep_email').value.trim(), address: $('ep_addr').value.trim(), coverUrl: $('ep_cover').value.trim(), avatarUrl: $('ep_av').value.trim() });
            closeSheet(); toast('Page updated');
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
        try { await pageRef().update({ adminUsernames: FV.arrayUnion(u) }); toast(u + ' is now an admin'); setTimeout(function () { if (ovHas('sheet') && page) rolesSheet(); }, 350); } catch (e) { toast('Could not add admin'); }
    };
    A.rmAdmin = async function (el) {
        var u = el.getAttribute('data-a');
        try { await pageRef().update({ adminUsernames: FV.arrayRemove(u) }); toast(u + ' removed'); setTimeout(function () { if (ovHas('sheet') && page) rolesSheet(); }, 350); } catch (e) { toast('Could not remove admin'); }
    };

    // ----- scheduled posts
    A.scheduled = function () { if (!isOwner) return; afterOrNow(function () {
        openSheet('<div class="pg-sh-t">Scheduled posts</div><div class="pg-sh-m">Hidden from the timeline until their time arrives.</div><div id="sc_list"><div class="pg-sk s"></div></div>');
        db.collection('posts').where('pageId', '==', slug).where('visible', '==', false).get().then(function (s) {
            schedCount = s.size; var l = $('sc_list'); if (!l) return;
            if (s.empty) { l.innerHTML = empty('fa-regular fa-clock', 'Nothing scheduled', 'Posts you schedule will wait here.'); return; }
            l.innerHTML = s.docs.map(function (d) { var p = d.data(); return '<div class="pg-admin"><span>' + esc((p.content || 'Media post').slice(0, 56)) + '<small>' + (p.publishAt ? new Date(p.publishAt).toLocaleString() : '') + '</small></span><button class="pg-chip-btn danger" data-act="cancelSched" data-a="' + d.id + '">Cancel</button></div>'; }).join('');
        }).catch(function () { var l = $('sc_list'); if (l) l.innerHTML = '<div class="pg-sh-m">Could not load scheduled posts.</div>'; });
    }); };
    A.cancelSched = function (el) {
        var id = el.getAttribute('data-a');
        afterSheet(function () { confirmSheet('Cancel this scheduled post?', 'It will be deleted and will not be published.', 'Delete post', 'danger', function () { db.collection('posts').doc(id).delete().then(function () { toast('Scheduled post cancelled'); refreshSched(); }).catch(function () { toast('Could not cancel'); }); }); });
    };

    // ----- insights
    A.insights = function () { if (!isOwner) return; afterOrNow(async function () {
        openSheet('<div class="pg-sh-t">Insights</div><div class="pg-sh-m">Last 7 days</div><div id="in_body"><div class="pg-sk s"></div><div class="pg-sk s"></div></div>');
        var days = [], i; for (i = 6; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
        var views = [], net = 0, eng = 0, top = null;
        try {
            var docs = await Promise.all(days.map(function (d) { return pageRef().collection('analyticsDaily').doc(d.toISOString().slice(0, 10)).get(); }));
            docs.forEach(function (d) { var x = d.exists ? d.data() : {}; views.push(x.views || 0); net += (x.follows || 0) - (x.unfollows || 0); });
        } catch (e) { views = [0, 0, 0, 0, 0, 0, 0]; }
        posts.forEach(function (p) { var n = (p.likesCount || 0) + (p.commentsCount || 0); eng += n; if (!top || n > top.n) top = { n: n, t: p.content || '' }; });
        var max = Math.max(1, Math.max.apply(null, views)), b = $('in_body'); if (!b) return;
        b.innerHTML = '<div class="pg-ins"><div><b>' + fmt(page.followerCount || 0) + '</b><small>Followers</small></div><div><b>' + fmt(views.reduce(function (a, c) { return a + c; }, 0)) + '</b><small>Page views</small></div><div><b>' + fmt(eng) + '</b><small>Likes and comments</small></div><div><b>' + (net >= 0 ? '+' : '') + net + '</b><small>Net followers</small></div></div>' +
            '<div class="pg-sh-m" style="padding-top:14px">Page views</div><div class="pg-chart">' + views.map(function (v, k) { return '<div><i style="height:' + Math.max(6, v / max * 100) + '%"></i><small>' + days[k].toLocaleDateString(undefined, { weekday: 'narrow' }) + '</small></div>'; }).join('') + '</div>' +
            (top && top.n > 0 ? '<div class="pg-sh-m" style="padding-top:18px">Top post · ' + top.n + ' interactions<br><span style="color:#fff">“' + esc(top.t.slice(0, 90)) + '”</span></div>' : '');
    }); };

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
    A.delPostAsk = function (el) { var id = el.getAttribute('data-a'); afterSheet(function () { confirmSheet('Delete this post?', 'This can’t be undone.', 'Delete', 'danger', function () { db.collection('posts').doc(id).delete().then(function () { toast('Post deleted'); }).catch(function () { toast('Could not delete'); }); }); }); };

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
    // GLOBAL WIRING + LIFECYCLE
    // ============================================================
    function onClick(e) {
        var bg = e.target; if (bg && bg.id === 'pgSheetBg') { closeSheet(); return; }
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
        tab = 'posts'; bioOpen = false; viewTracked = false; booted = false; ovStack = []; busy = {};

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
