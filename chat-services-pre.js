/* Services chat (svc=1) — runs BEFORE chat-interior.js, so the page opens at its normal native speed.
   The page's own init uses the personal room id (a__b); here every Firestore access to THAT id is redirected to the
   business room (a~svc~b). No waiting for any other script, nothing in chat-interior.js is touched. */
(function () {
  var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (q.get('svc') !== '1') return;
  var me = null; try { me = localStorage.getItem('nexus_user_session'); } catch (e) {}
  var peer = q.get('with'); if (!me || !peer) return;
  var s = [me, peer].sort(), pid = s.join('__'), bid = s.join('~svc~');
  try {
    var F = firebase.firestore, CR = F.CollectionReference, FS = F.Firestore, od = CR.prototype.doc;
    CR.prototype.doc = function (id) {
      if (arguments.length && id === pid && this.path === 'personalChats') arguments[0] = bid;
      return od.apply(this, arguments);
    };
    if (FS && FS.prototype && FS.prototype.doc) {
      var fd = FS.prototype.doc;
      FS.prototype.doc = function (p) {
        if (typeof p === 'string') p = p.replace('personalChats/' + pid, 'personalChats/' + bid);
        arguments[0] = p; return fd.apply(this, arguments);
      };
    }
    window.__nxSvcRedirect = 1; window.__nxSvcBooted = true;       // native init runs by itself, on the business room
  } catch (e) {
    /* fallback (never expected): hold the native init and let chat-market.js start it on the business room */
    window.__nxSvcTrapped = 1;
    try { Object.defineProperty(document, 'readyState', { configurable: true, get: function () { return 'complete'; } }); } catch (e2) {}
    setTimeout(function () { if (!window.__nxSvcBooted) { window.__nxSvcBooted = true; try { delete document.readyState; } catch (e3) {} try { NexusChatInterior_init(); } catch (e4) {} } }, 8000);
  }
})();

/* ── Embedded (iframe overlay) only: the chat page keeps its own VIRTUAL back-stack. ──
   chat-interior.js pushes/pops history for the photo caption screen, viewer, gallery …; inside an iframe those entries
   live in the SAME session history as the parent page, so one extra back() threw the user out to the feed.
   Here pushState/back/go never touch the real history; the parent reports the phone's Back press to us instead. */
(function () {
  var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (q.get('svc') !== '1' || q.get('embed') !== '1' || window.parent === window) return;
  var st = [], H = window.history, rep = H.replaceState.bind(H);
  function depth() { try { window.parent.postMessage({ nxMkDepth: st.length }, location.origin); } catch (e) {} }
  function fire(state) {
    window.__nxSvcVirt = 1;
    try { window.dispatchEvent(new PopStateEvent('popstate', { state: state })); } catch (e) {}
    setTimeout(function () { window.__nxSvcVirt = 0; }, 0);
  }
  H.pushState = function (state) { st.push(state == null ? null : state); depth(); };
  H.replaceState = function (state) { if (st.length) st[st.length - 1] = state; };
  function pop(n) {
    n = Math.min(Math.max(n | 0, 1), st.length); if (!n) return;
    st.length -= n; depth();
    setTimeout(function () { fire(st.length ? st[st.length - 1] : null); }, 0);
  }
  H.back = function () { pop(1); };
  H.go = function (n) { if (n < 0) pop(-n); };
  H.forward = function () {};
  window.addEventListener('message', function (e) {
    if (e.origin === location.origin && e.data && e.data.nxMkBack) pop(1);
  });
  var prevOpen; (function hook() {
    var NO = window.NexusOverlay = window.NexusOverlay || {};
    if (NO.__nxSvcVirtWrap) return; NO.__nxSvcVirtWrap = 1; prevOpen = NO.isOpen;
    NO.isOpen = function () { if (window.__nxSvcVirt) return true; return typeof prevOpen === 'function' ? prevOpen.apply(NO, arguments) : false; };
  })();
  /* router.js / chat-interior.js reassign NexusOverlay.isOpen later — re-wrap once the page has loaded */
  window.addEventListener('load', function () {
    var NO = window.NexusOverlay = window.NexusOverlay || {}, cur = NO.isOpen;
    if (cur && cur.__v) return;
    NO.isOpen = function () { if (window.__nxSvcVirt) return true; return typeof cur === 'function' ? cur.apply(NO, arguments) : false; };
    NO.isOpen.__v = 1;
  });
})();
