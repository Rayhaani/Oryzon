/* ============================================================
   NEXUS CORE — nexus-core.js  (v1.1)
   ------------------------------------------------------------
   SHARED, APP-WIDE bootstrap. Ana lodawa shi a KOWACE page a matsayin
   script na al'ada (<script src="nexus-core.js">), A WAJEN
   <main id="page-content">, daidai matsayin router.js/footer.js.

   MUHIMMI: wannan file NA'URAR "GUDA DAYA KACAL" ce — YANA GUDANA
   SAU DAYA KAWAI a duk tsawon rayuwar app din a browser tab, domin
   NexusRouter (fetch + innerHTML swap na #page-content) BAI TABA
   sake loda ko gudanar da wani abu da yake WAJEN #page-content ba
   yayin SPA navigation. Wannan shine dalilin da ya sa firebase.
   initializeApp() ba ya sake gudana sau biyu ko da user ya ratsa
   ta pages da yawa.

   GYARA v1.1: idan wata page ta yi kuskuren sake loda wannan file
   sau biyu a jere (misali ta hanyar PAGE_SCRIPTS mismatch a
   router.js), tsohon amfani da `const`/`let` yana haifar da
   "SyntaxError: Identifier ... has already been declared" wanda ke
   karya DUK code na page din gaba daya. An sauya zuwa `var` (wanda
   ba ya kuskure idan aka sake ayyana shi) kuma an nade sassan da ke
   da side-effects (firebase.initializeApp, auth listener) a cikin
   `window.__nexusCoreBooted` guard domin su GUDU SAU DAYA KACAL
   koda file din ya sake gudana.

   DUK page-specific scripts (social.js, chats.js, da sauransu) su
   dogara ne akan GLOBALS din da wannan file ke kafawa:
     - window.BACKEND_URL
     - window.currentUser
     - window.db / window.storage / window.analytics
   Kada su sake ayyana firebase.initializeApp() ko sake ayyana
   const db/storage/analytics — su YI AMFANI da wadanda ke nan
   kawai.
   ============================================================ */

var BACKEND_URL = 'https://oryzon-backend-ed1q.onrender.com';

var currentUser = localStorage.getItem("nexus_user_session");
if (!currentUser) {
    window.location.href = "login.html";
}

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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

try {
var db = firebase.firestore();
try { db.settings({ experimentalForceLongPolling: true }); } catch (e) { console.warn('[Firestore settings]', e.code || e); }
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    console.warn('[Firestore Persistence]', err.code);
});
var storage = firebase.storage();
var analytics = null; try { analytics = firebase.analytics(); } catch (e) {}
// GYARA: an nade wannan a cikin guard domin kada listener din ya
// taru (kowace sake-gudana za ta kara wani sabon onAuthStateChanged
// listener, wanda ke haifar da "Auth ready" log da yawa da kuma
// listenNotifBadgeCount() subscriptions da yawa a jere).
if (!window.__nexusCoreBooted) {
    window.__nexusCoreBooted = true;

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log("Auth ready, uid:", user.uid);
            listenNotifBadgeCount();
        } else {
            if (!localStorage.getItem('nexus_user_session')) window.location.href = "login.html";
        }
    });
}
} catch (e) { console.warn('[nexus-core init]', e); }
// ============================================================
// NOTIFICATION BELL BADGE (real-time, kamar Facebook)
// Amfani da query mai filter guda ɗaya kawai (babu buƙatar
// composite index a Firestore), sannan a ƙidaya unread a JS.
// Wannan yana zaune a CORE domin bell icon din yana kan header
// din DUK pages, ba social.html kadai ba — kuma yana amfani da
// "fresh document.getElementById kowane lokaci" don haka babu
// bukatar sake yin subscribe a kowace SPA navigation.
// ============================================================
function listenNotifBadgeCount() {
    if (!currentUser) return;
    if (window._nxNotifUnsub) { window._nxNotifUnsub(); window._nxNotifUnsub = null; }
    window._nxNotifUnsub = db.collection('notifications')
        .where('to', '==', currentUser)
        .where('read', '==', false)
        .limit(10)
        .onSnapshot(snapshot => {
            const badge = document.getElementById('notifBadgeCount');
            if (!badge) return;
            const count = snapshot.size;
            badge.textContent = count > 9 ? '9+' : count;
            badge.classList.toggle('show', count > 0);
        }, err => console.error('Notif badge error:', err));
                    }

/* ============================================================
   NPMe — global pre-warmed profile overlay (me.html in an iframe).
   Yana aiki a KOWANE page (feed, services, da sauransu) ba tare da
   sake loda page ba. Ana loda me.html a bango sau daya.
   ============================================================ */
(function () {
    if (window.NPMe || window.self !== window.top) return;

    var ID = 'np-me-overlay';
    var st = { open: false, token: 0, id: 0 };
    var seen = {};
   var SNAPK = 'np_me_snap_';
    function snapKey(u) { return SNAPK + String(u).toLowerCase(); }

    function saveSnap(u) {
        try {
            var fr = document.querySelector('#' + ID + ' iframe');
            var root = fr && fr.contentDocument && fr.contentDocument.getElementById('page-content');
            if (!root || !u) return;
            var h = root.innerHTML;
            if (root.textContent.trim().length < 60 || h.length > 200000) return;
            h = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\sid="[^"]*"/g, '');
            localStorage.setItem(snapKey(u), JSON.stringify({ t: Date.now(), h: h }));
            var idx = JSON.parse(localStorage.getItem(SNAPK + 'idx') || '[]').filter(function (x) { return x !== u; });
            idx.push(u);
            while (idx.length > 15) { localStorage.removeItem(snapKey(idx.shift())); }
            localStorage.setItem(SNAPK + 'idx', JSON.stringify(idx));
        } catch (e) {}
    }

    function showSnap(fr, u) {
        try {
            var raw = localStorage.getItem(snapKey(u));
            var d = fr.contentDocument;
            if (!raw || !d || !d.body) return;
            var old = d.getElementById('np-snap');
            if (old && old.parentNode) old.parentNode.removeChild(old);
            var s = d.createElement('div');
            s.id = 'np-snap';
            s.style.cssText = 'position:absolute;top:0;left:0;right:0;min-height:100%;background:#050505;z-index:99999;pointer-events:none;transition:opacity .25s;';
            s.innerHTML = JSON.parse(raw).h;
            d.body.appendChild(s);
            setTimeout(function () {
                s.style.opacity = '0';
                setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 300);
            }, 1200);
        } catch (e) {}
    }

    function ensure() {
        var ov = document.getElementById(ID);
        if (ov) return ov;
        if (!document.getElementById('np-me-style')) {
            var s = document.createElement('style');
            s.id = 'np-me-style';
            s.textContent = '@keyframes npmespin{to{transform:rotate(360deg)}}';
            document.head.appendChild(s);
        }
        ov = document.createElement('div');
        ov.id = ID;
        ov.style.cssText = 'display:none;position:fixed;inset:0;background:#050505;';
        ov.innerHTML =
            '<iframe id="np-me-frame" title="Profile" allow="microphone; camera" style="width:100%;height:100%;border:0;background:#050505;"></iframe>' +
            '<div id="np-me-spin" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;pointer-events:none;">' +
            '<div style="width:34px;height:34px;border:3px solid rgba(255,255,255,0.15);border-top-color:#fde08d;border-radius:50%;animation:npmespin 0.8s linear infinite;"></div></div>';
        document.body.appendChild(ov);
        return ov;
    }

   function hookFrame(fr) {
        try {
            var d = fr.contentDocument;
            if (!d || d.__npHooked) return;
            d.__npHooked = true;
            d.addEventListener('click', function (e) {
                var b = e.target && e.target.closest && e.target.closest('[onclick*="social.html"]');
                if (!b) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                close();
            }, true);
        } catch (e) {}
   }
    function frame() {
        var fr = ensure().querySelector('iframe');
        if (!fr.getAttribute('src')) { fr.addEventListener('load', function () { hookFrame(fr); }); fr.src = 'me.html?embed=1&warm=1'; }
        return fr;
    }

    function whenReady(fr, fn) {
        if (fr.contentWindow && fr.contentWindow.__meReady) fn();
        else fr.addEventListener('load', fn, { once: true });
    }

    function show() {
        var ov = ensure();
        ov.style.zIndex = window.inboxOpenChat ? '10785' : '2147483000';
        ov.style.display = 'block';
        if (st.open) return;
        st.open = true;
        st.id = ++st.token;
        window.__npProfileOverlay = true;
        var d = (typeof window.npStackDepth === 'function') ? window.npStackDepth() : 0;
        history.pushState({ npOverlay: 'npme', npme: st.id, d: d }, '', '');
        document.documentElement.style.overflow = 'hidden';
        var f = document.getElementById('instaFooter');
        if (f) { f.__npDisp = f.style.display; f.style.display = 'none'; }
    }

    function hide() {
        if (!st.open) return;
        st.open = false;
        var ov = document.getElementById(ID);
        if (ov) {
            ov.style.display = 'none';
           saveSnap(st.user);
            try { ov.querySelector('iframe').contentWindow.meClose(); } catch (e) {}
        }
        document.documentElement.style.overflow = '';
        var f = document.getElementById('instaFooter');
        if (f && f.__npDisp !== undefined) { f.style.display = f.__npDisp; f.__npDisp = undefined; }
    }

    function open(username) {
        if (!username) return;
        var q = '?user=' + encodeURIComponent(username) + '&embed=1';
        var fr = frame();
        var sp = document.getElementById('np-me-spin');
        var ready = !!(fr.contentWindow && fr.contentWindow.__meReady);
        var go = function () {
           showSnap(fr, username);
            try { fr.contentWindow.meOpen(q); }
            catch (e) { try { fr.contentWindow.location.replace('me.html' + q); } catch (e2) {} }
            if (sp) setTimeout(function () { sp.style.display = 'none'; }, 700);
        };
        if (sp && !ready) sp.style.display = 'flex';
        whenReady(fr, go);
        show();
       st.user = username;
        setTimeout(function () { if (st.open && st.user === username) saveSnap(username); }, 3000);
       var t0 = Date.now();
        var tick = setInterval(function () {
            try {
                var d = fr.contentDocument, root = d && d.getElementById('page-content');
                var imgs = root ? root.querySelectorAll('img') : [];
                var done = [].filter.call(imgs, function (i) { return i.complete && i.naturalWidth; }).length;
                console.log('[NPMe]', Date.now() - t0, 'ms | ready:', !!(fr.contentWindow && fr.contentWindow.__meReady), '| text:', root ? root.textContent.trim().length : 0, '| imgs:', done + '/' + imgs.length);
            } catch (e) {}
            if (Date.now() - t0 > 8000) clearInterval(tick);
        }, 500);
    }

    function close() {
        if (!st.open) return;
        window.__npProfileOverlay = true;
        history.back();
    }

    function pre(u) {
        if (u && typeof u === 'string' && u.indexOf('data:') !== 0) { var i = new Image(); i.src = u; }
    }

    function prefetchOne(w, n) {
        try {
            var d = w.db;
            if (!d) { w.mePrefetch(n); return; }
            d.collection('users').doc(n).get().then(function (s) { if (s.exists) pre((s.data() || {}).userProfilePic); }).catch(function () {});
            d.collection('posts').where('username', '==', n).get().then(function (qs) {
                var c = 0;
                qs.forEach(function (x) { var p = x.data(); if (c < 9 && p.category === 'business' && p.mediaUrl) { c++; pre(p.mediaUrl); } });
            }).catch(function () {});
        } catch (e) {}
    }
    function prefetch(names) {
        try {
            if (!names || !names.length) return;
            var fr = document.querySelector('#' + ID + ' iframe');
            if (!fr || !fr.getAttribute('src')) return;
            whenReady(fr, function () {
                names.forEach(function (n) { prefetchOne(fr.contentWindow, n); });
            });
        } catch (e) {}
    }

    function scan() {
        try {
            var els = document.querySelectorAll('a[href*="me.html?user="]');
            var names = [];
            for (var i = 0; i < els.length && names.length < 8; i++) {
                var r = els[i].getBoundingClientRect();
                if (r.bottom < -300 || r.top > window.innerHeight + 600) continue;
                var m = /user=([^&#]+)/.exec(els[i].getAttribute('href') || '');
                if (!m) continue;
                var n = decodeURIComponent(m[1]);
                if (seen[n]) continue;
                seen[n] = 1;
                names.push(n);
            }
            prefetch(names);
        } catch (e) {}
    }

    function warm() {
        if (navigator.connection && navigator.connection.saveData) return;
        if (/(^|\/)me\.html$/.test(location.pathname)) return;
        frame();
        prefetch([localStorage.getItem('nexus_user_session')]);
        setTimeout(scan, 1500);
    }

    window.addEventListener('popstate', function () {
        if (!st.open) return;
        var s = history.state;
        if (!(s && s.npme === st.id)) hide();
    });
    document.addEventListener('nexus:routechange', function () { hide(); });

    document.addEventListener('click', function (e) {
        if (!e.target || !e.target.closest || e.defaultPrevented) return;
        var u = null;
        var a = e.target.closest('a[href]');
        if (a) {
            var m = /^(?:\.\/)?me\.html\?(?:[^#]*&)?user=([^&#]+)/.exec(a.getAttribute('href') || '');
            if (m) u = decodeURIComponent(m[1]);
        }
        if (!u) {
            var h = e.target.closest('.header-icon-link[data-page="me.html"]');
            if (h) u = localStorage.getItem('nexus_user_session');
        }
        if (!u) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        open(u);
    }, true);

    var _t = 0;
    window.addEventListener('scroll', function () {
        var now = Date.now();
        if (now - _t < 1500) return;
        _t = now;
        scan();
    }, { passive: true, capture: true });

    if (document.readyState === 'complete') setTimeout(warm, 20000);
    else window.addEventListener('load', function () { setTimeout(warm, 20000); });

    window.NPMe = {
        open: open,
        close: close,
        prefetch: prefetch,
        warm: warm,
        isOpen: function () { return st.open; }
    };
})();
