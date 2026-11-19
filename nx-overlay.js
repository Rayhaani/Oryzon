/* ============================================================
   nx-overlay.js — instant Group / Page / Channel overlays, everywhere.
   ------------------------------------------------------------
   group.html, pages.html and channels.html are loaded ONCE, hidden, in an
   iframe each (embed mode — see nx-embed.js). Opening a group / page /
   channel only shows that warm iframe and re-runs the page script:
   no page reload, no black page. Back (or the page's own back arrow)
   closes the overlay and leaves the page underneath exactly as it was.

   It is loaded by router.js on every page, and catches every way the app
   opens one of these three pages:
     - NexusRouter.navigateTo('group.html?group=…')   (chats, feed, profile…)
     - clicks on [data-spa-link] / [data-page] / <a href> pointing at them
   Anything else (other pages) goes through the normal router untouched.

   Kill switch: localStorage.setItem('nx_overlay_off','1') turns this file
   off completely (the normal router navigation is used instead).
   ============================================================ */
(function () {
    "use strict";
    if (window.NXOverlay || window.self !== window.top) return;
    try { if (localStorage.getItem('nx_overlay_off') === '1') return; } catch (e) {}

    var KINDS = {
        group:   { file: 'group.html',    param: 'group',   snap: 'nx_ov_g_', prefix: 'nx-ov-group' },
        page:    { file: 'pages.html',    param: 'page',    snap: 'nx_ov_p_', prefix: 'nx-ov-page' },
        channel: { file: 'channels.html', param: 'channel', snap: 'nx_ov_c_', prefix: 'nx-ov-channel' }
    };
    var FILE2KIND = { 'group.html': 'group', 'pages.html': 'page', 'channels.html': 'channel' };
    var st = {}, seq = 0, warmed = {};
    Object.keys(KINDS).forEach(function (k) { st[k] = { open: false, id: 0, ref: '', url: '', t: 0 }; });

    // ---------- helpers ----------
    function parse(url) {
        if (!url || typeof url !== 'string') return null;
        if (/^(https?:)?\/\//i.test(url) || url.charAt(0) === '#' || url.indexOf('javascript:') === 0) return null;
        var u;
        try { u = new URL(url, window.location.href); } catch (e) { return null; }
        var k = FILE2KIND[u.pathname.split('/').pop()];
        if (!k) return null;
        var ref = u.searchParams.get(KINDS[k].param);
        if (!ref) return null;
        u.searchParams.delete('embed'); u.searchParams.delete('warm');
        return { k: k, ref: ref, search: u.search };
    }
    function ovId(k) { return KINDS[k].prefix; }
    function snapKey(k, r) { return KINDS[k].snap + String(r).toLowerCase(); }
    function anyOpen() { return Object.keys(st).some(function (k) { return st[k].open; }); }

    function rootOf(k) {
        var fr = document.querySelector('#' + ovId(k) + ' iframe');
        try { return fr && fr.contentDocument && fr.contentDocument.getElementById('page-content'); } catch (e) { return null; }
    }
    function saveSnap(k, r) {
        try {
            var el = rootOf(k);
            if (!el || !r) return;
            var h = el.innerHTML;
            if (el.textContent.trim().length < 60 || h.length > 200000) return;
            h = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\sid="[^"]*"/g, '');
            localStorage.setItem(snapKey(k, r), JSON.stringify({ t: Date.now(), h: h }));
            var ix = KINDS[k].snap + 'idx';
            var idx = JSON.parse(localStorage.getItem(ix) || '[]').filter(function (x) { return x !== r; });
            idx.push(r);
            while (idx.length > 8) localStorage.removeItem(snapKey(k, idx.shift()));
            localStorage.setItem(ix, JSON.stringify(idx));
        } catch (e) {}
    }
    function showSnap(k, fr, r) {
        try {
            var raw = localStorage.getItem(snapKey(k, r)), d = fr.contentDocument;
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

    // ---------- DOM ----------
    function ensure(k) {
        var id = ovId(k), ov = document.getElementById(id);
        if (ov) return ov;
        if (!document.getElementById('nx-ov-style')) {
            var s = document.createElement('style');
            s.id = 'nx-ov-style';
            s.textContent = '@keyframes nxovspin{to{transform:rotate(360deg)}}';
            document.head.appendChild(s);
        }
        ov = document.createElement('div');
        ov.id = id;
        ov.style.cssText = 'display:none;position:fixed;inset:0;background:#050505;';
        ov.innerHTML =
            '<iframe title="' + k + '" allow="microphone; camera; clipboard-write; fullscreen; autoplay" allowfullscreen style="width:100%;height:100%;border:0;background:#050505;"></iframe>' +
            '<div class="nx-ov-spin" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;pointer-events:none;">' +
            '<div style="width:34px;height:34px;border:3px solid rgba(255,255,255,0.15);border-top-color:#fde08d;border-radius:50%;animation:nxovspin 0.8s linear infinite;"></div></div>';
        document.body.appendChild(ov);
        return ov;
    }
    function frame(k) {
        var fr = ensure(k).querySelector('iframe');
        if (!fr.getAttribute('src')) fr.src = KINDS[k].file + '?embed=1&warm=1';
        return fr;
    }
    function whenReady(fr, fn) {
        if (fr.contentWindow && fr.contentWindow.__nxReady) fn();
        else fr.addEventListener('load', fn, { once: true });
    }

    // The keyboard must shrink the page (so the typing bar stays above it) while an overlay is open.
    var vpMeta = null, vpPrev = null;
    function keyboardOn() {
        try {
            vpMeta = document.querySelector('meta[name="viewport"]');
            if (!vpMeta || vpPrev !== null) return;
            vpPrev = vpMeta.getAttribute('content') || '';
            if (!/interactive-widget/.test(vpPrev)) vpMeta.setAttribute('content', vpPrev + ', interactive-widget=resizes-content');
        } catch (e) {}
    }
    function keyboardOff() {
        try { if (vpMeta && vpPrev !== null) vpMeta.setAttribute('content', vpPrev); } catch (e) {}
        vpPrev = null;
    }

    function show(k) {
        var ov = ensure(k);
        ov.style.zIndex = String(2147483000 + (++seq));
        ov.style.display = 'block';
        if (st[k].open) return;
        st[k].open = true;
        st[k].id = seq;
        history.pushState({ nxOv: k, nxovId: st[k].id }, '', window.location.href);
        document.documentElement.style.overflow = 'hidden';
        keyboardOn();
    }
    function hide(k) {
        if (!st[k].open) return;
        st[k].open = false;
        var ov = document.getElementById(ovId(k));
        if (ov) {
            ov.style.display = 'none';
            saveSnap(k, st[k].ref);
            try { ov.querySelector('iframe').contentWindow.nxClose(); } catch (e) {}
        }
        st[k].ref = ''; st[k].url = '';
        if (!anyOpen()) { document.documentElement.style.overflow = ''; keyboardOff(); }
    }

    // ---------- public ----------
    var origNavigate = null;
    function fallback(url) {
        // the overlay could not start — use the normal router so the user is never stuck
        Object.keys(st).forEach(hide);
        if (origNavigate) origNavigate(url); else window.location.href = url;
    }
    function open(url) {
        var p = parse(url);
        if (!p) return false;
        var k = p.k;
        var q = p.search ? p.search + '&embed=1' : '?' + KINDS[k].param + '=' + encodeURIComponent(p.ref) + '&embed=1';
        var fr = frame(k);
        var sp = ensure(k).querySelector('.nx-ov-spin');
        var ready = !!(fr.contentWindow && fr.contentWindow.__nxReady);
        var token = ++seq;
        st[k].t = token;
        var go = function () {
            if (!st[k].open || st[k].t !== token) return;
            showSnap(k, fr, p.ref);
            try { fr.contentWindow.nxOpen(q); }
            catch (e) { try { fr.contentWindow.location.replace(KINDS[k].file + q); } catch (e2) { fallback(url); return; } }
            if (sp) setTimeout(function () { sp.style.display = 'none'; }, 700);
        };
        if (sp && !ready) sp.style.display = 'flex';
        show(k);
        st[k].ref = p.ref; st[k].url = url;
        whenReady(fr, go);
        // safety net: if the embedded page never reports ready, fall back to normal navigation
        setTimeout(function () {
            if (st[k].open && st[k].t === token) {
                var w = fr.contentWindow;
                if (!(w && w.__nxReady)) fallback(url);
            }
        }, 25000);
        setTimeout(function () { if (st[k].open && st[k].ref === p.ref) saveSnap(k, p.ref); }, 3500);
        return true;
    }
    function close() {
        var k = Object.keys(st).filter(function (x) { return st[x].open; }).pop();
        if (k) history.back();
    }

    // ---------- interception ----------
    // 1) NexusRouter.navigateTo('group.html?…') — used by chats.js, social.js, post cards, profile, …
    function patchRouter() {
        var NR = window.NexusRouter;
        if (!NR || NR.__nxOvPatched) return !!NR;
        NR.__nxOvPatched = true;
        origNavigate = NR.navigateTo;
        NR.navigateTo = function (url, opts) {
            if (!(opts && opts.pushHistory === false) && parse(url)) { open(url); return Promise.resolve(); }
            return origNavigate.apply(NR, arguments);
        };
        return true;
    }
    patchRouter();

    // 2) clicks on links / [data-spa-link] / [data-page] that point at the three pages
    document.addEventListener('click', function (e) {
        if (!e.target || typeof e.target.closest !== 'function' || e.defaultPrevented) return;
        var el = e.target.closest('[data-spa-link], [data-page], a[href]');
        if (!el) return;
        var inner = e.target.closest('[onclick]');
        if (inner && inner !== el && el.contains(inner)) return;     // e.g. an avatar with its own tap handler
        var url = el.getAttribute('data-spa-link') || el.getAttribute('data-page') || el.getAttribute('href');
        if (!parse(url)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        open(url);
    }, true);

    // 3) Back / forward
    window.addEventListener('popstate', function () {
        Object.keys(st).forEach(function (k) {
            if (!st[k].open) return;
            var s = history.state;
            if (!(s && s.nxOv && s.nxovId >= st[k].id)) hide(k);
        });
    });
    // leaving for a normal page closes everything
    document.addEventListener('nexus:routechange', function () { Object.keys(st).forEach(hide); });

    // ---------- warming ----------
    function scan() {
        try {
            if (navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''))) return;
            Object.keys(KINDS).forEach(function (k) {
                if (warmed[k]) return;
                var f = KINDS[k].file, sel = 'a[href*="' + f + '?"],[data-spa-link*="' + f + '?"],[data-chat-href*="' + f + '?"]';
                var els = document.querySelectorAll(sel);
                for (var i = 0; i < els.length; i++) {
                    if (els[i].offsetParent === null) continue;       // hidden tab / not displayed
                    var r = els[i].getBoundingClientRect();
                    if (r.bottom < -300 || r.top > window.innerHeight + 600) continue;
                    warmed[k] = 1; frame(k); break;
                }
            });
        } catch (e) {}
    }
    var _t = 0;
    function later() { clearTimeout(_t); _t = setTimeout(scan, 700); }
    window.addEventListener('scroll', later, { passive: true, capture: true });
    document.addEventListener('click', later, true);
    document.addEventListener('nexus:routechange', function () { setTimeout(scan, 900); });
    function boot() { setTimeout(scan, 2500); }
    if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);

    // the router asks this before treating a popstate as "leave the page"
    window.NexusOverlay = window.NexusOverlay || {};
    window.NexusOverlay.isOpen = function () { return anyOpen(); };
    window.NexusOverlay.open = open;
    window.NexusOverlay.close = close;

    window.NXOverlay = { open: open, close: close, scan: scan, isOpen: anyOpen };
})();
