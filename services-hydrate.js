/* services-hydrate.js — makes the inline  <script>document.write(NXShared…)</script>  blocks of services.html work after SPA navigation.
   (innerHTML swaps never run inline scripts, so the Business Chat inbox shell and the My Business shell were missing / unstyled until a full refresh.)
   Idempotent: a block whose markup already exists on the page is skipped, so a normal full load is unaffected. */
(function () {
  'use strict';
  if (window.__nxHydrate) return; window.__nxHydrate = 1;
  function run() {
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
      if (first && document.getElementById(first.id)) continue;          // already on the page
      s.insertAdjacentHTML('beforebegin', out);
    }
  }
  run();
  var pend = 0;
  new MutationObserver(function () { if (pend) return; pend = 1; Promise.resolve().then(function () { pend = 0; run(); }); })
    .observe(document.documentElement, { childList: true, subtree: true });
})();
