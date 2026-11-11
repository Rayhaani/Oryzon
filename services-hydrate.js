/* services-hydrate.js — makes services.html complete after SPA navigation (called by services.js at the start of initServicesPage).
   1) inline  <script>document.write(NXShared…)</script>  blocks never run when the router swaps innerHTML → rebuild them here
      (Business Chat inbox shell, My Business shell). Idempotent: a block whose markup already exists is skipped.
   2) nx-shared.css / nx-btn.css are linked in services.html's <head> but the router only loads services.css → add them AFTER services.css
      (same cascade order as a normal page load). They stay loaded, exactly like they do after a normal page load. No observers, no timers. */
(function () {
  'use strict';
  if (window.__nxHydrate) return;
  function blocks() {
    if (!window.NXShared) return;
    var root = document.getElementById('page-content'); if (!root) return;
    var list = root.querySelectorAll('script:not([src])');
    for (var i = 0; i < list.length; i++) {
      var s = list[i], t = s.textContent || '';
      if (s.__nxH || !/document\.write\(\s*NXShared\./.test(t)) continue;
      s.__nxH = 1;
      var out = '', dw = document.write;
      try { document.write = function (h) { out += h; }; (0, eval)(t); } catch (e) { out = ''; } finally { document.write = dw; }
      if (!out) continue;
      var tpl = document.createElement('template'); tpl.innerHTML = out;
      var first = tpl.content.querySelector('[id]');
      if (first && document.getElementById(first.id)) continue;
      s.insertAdjacentHTML('beforebegin', out);
    }
  }
  function css() {
    var links = [].slice.call(document.querySelectorAll('link[rel="stylesheet"]'));
    var idx = function (n) { for (var i = links.length - 1; i >= 0; i--) if ((links[i].getAttribute('href') || '').indexOf(n) > -1) return i; return -1; };
    var own = idx('services.css'); if (own < 0) return;
    ['nx-shared.css', 'nx-btn.css'].forEach(function (n) {
      if (idx(n) > own) return;                                   // already after services.css
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = n; l.setAttribute('data-nx-keep', n);
      l.onload = function () { document.querySelectorAll('link[data-nx-keep="' + n + '"]').forEach(function (o) { if (o !== l) o.remove(); }); };
      document.head.appendChild(l);
    });
  }
  window.__nxHydrate = function () { css(); blocks(); };
})();
