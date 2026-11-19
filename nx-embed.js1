/* ============================================================
   nx-embed.js — iframe side of the instant profile overlays
   (Pages, Channels). Same mechanism as me.html's embed mode:
   the page is loaded ONCE (warm) inside a hidden iframe owned by
   nexus-core.js (NPOv); opening another page/channel only re-runs
   the page script — no reload, no black page.

   Normal (non-embed) load: this file just writes <script src="router.js">
   so the page behaves exactly as before.
   ============================================================ */
(function () {
    if (location.search.indexOf('embed=1') === -1) {
        document.write('<script src="router.js"><\/script>');
        window.nxEmbedMain = function () { return false; };
        return;
    }
    var PAGE = location.pathname.split('/').pop();
    window.__nxEmbed = true;
    window.__go = function (u) {
        try { if (window.parent.NexusRouter) { window.parent.NexusRouter.navigateTo(u); return; } } catch (e) {}
        window.top.location.href = u;
    };
    window.NexusRouter = {
        navigateTo: function (u) { window.__go(u); },
        registerPage: function (p, h) { window.__nxHandlers = h; },
        getCurrentPath: function () { return PAGE; },
        loadScriptOnce: function () { return Promise.resolve(); }
    };
    function closeOverlay() { try { history.back(); } catch (e) {} }

    document.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target : null;
        if (!t) return;
        // header back arrow of the page → close the overlay (same as browser back)
        var back = t.closest('.back-trigger, [data-act="goBack"]');
        if (back) { e.preventDefault(); e.stopImmediatePropagation(); closeOverlay(); return; }
        var own = t.closest('a[data-nx-ov]');
        if (own) { e.preventDefault(); e.stopImmediatePropagation(); return; }
        var el = t.closest('[data-spa-link], [data-page], a[href]');
        if (!el) return;
        var u = el.getAttribute('data-spa-link') || el.getAttribute('data-page') || el.getAttribute('href');
        if (!u || u.charAt(0) === '#' || u.indexOf('http') === 0 || u.indexOf('javascript:') === 0 || !/\.html/.test(u)) return;
        e.preventDefault(); e.stopImmediatePropagation();
        window.__go(u);
    }, true);

    var RESERVED = { 'if':1, 'for':1, 'while':1, 'switch':1, 'return':1, 'function':1, 'catch':1, 'typeof':1, 'new':1, 'await':1, 'async':1, 'with':1, 'do':1, 'else':1, 'in':1, 'of':1, 'void':1, 'delete':1, 'throw':1, 'try':1, 'var':1, 'let':1, 'const':1, 'class':1, 'this':1, 'super':1, 'yield':1 };
    var warm = location.search.indexOf('warm=1') > -1;

    window.nxEmbedMain = function (file) {
        var root = document.getElementById('page-content');
        var pristine = root.innerHTML.replace(/(?:window\.)?location\.href\s*=(?!=)\s*('[^']*'(?:\+[\w.()]+)?)/g, '__go($1)');
        var baseKids = Array.prototype.slice.call(document.body.children);
        var code = null;

        function run() {
            var src = code.replace(/window\.location\.href\s*=(?!=)\s*([^;\n]+);/g, '__go($1);');
            var names = {};
            (pristine + src).replace(/on[a-z]+\s*=\s*\\?["']([^"']*)/g, function (m, body) {
                body.replace(/([A-Za-z_$][\w$]*)\s*\(/g, function (mm, n) { if (!RESERVED[n]) names[n] = 1; return mm; });
                return m;
            });
            var exp = Object.keys(names).map(function (n) {
                return 'try{if(typeof ' + n + "==='function')window." + n + '=' + n + ';}catch(e){}';
            }).join('\n');
            var s = document.createElement('script');
            s.text = '(function(){\n' + src + '\n' + exp + '\n})();';
            document.body.appendChild(s);
            document.body.removeChild(s);
        }
        function start() {
            if (code !== null) { run(); return; }
            fetch(file).then(function (r) { return r.text(); }).then(function (t) { code = t; run(); });
        }
        window.nxClose = function () {
            try { if (window.__nxHandlers && window.__nxHandlers.destroy) window.__nxHandlers.destroy(); } catch (e) {}
            window.__nxHandlers = null;
            // remove anything the page script appended to <body> (sheets, viewers…)
            Array.prototype.slice.call(document.body.children).forEach(function (n) {
                if (baseKids.indexOf(n) === -1 && n.tagName !== 'SCRIPT') { try { document.body.removeChild(n); } catch (e) {} }
            });
            document.documentElement.classList.remove('pg-loading');
            root.innerHTML = pristine;
        };
        window.nxOpen = function (search) {
            window.nxClose();
            history.replaceState(null, '', location.pathname + search);
            start();
        };
        window.addEventListener('load', function () { window.__nxReady = true; });
        if (warm) {
            fetch(file).then(function (r) { return r.text(); }).then(function (t) { code = t; });
        } else {
            start();
        }
        return true;
    };
})();
