/* Marketplace chat (market=1) — runs BEFORE chat-interior.js, so the page opens at its normal native speed.
   The page's own init uses the personal room id (a__b); here every Firestore access to THAT id is redirected to the
   business room (a~biz~b). No waiting for any other script, nothing in chat-interior.js is touched. */
(function () {
  var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (q.get('market') !== '1') return;
  var me = null; try { me = localStorage.getItem('nexus_user_session'); } catch (e) {}
  var peer = q.get('with'); if (!me || !peer) return;
  var s = [me, peer].sort(), pid = s.join('__'), bid = s.join('~biz~');
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
    window.__nxMktRedirect = 1; window.__nxMktBooted = true;       // native init runs by itself, on the business room
  } catch (e) {
    /* fallback (never expected): hold the native init and let chat-market.js start it on the business room */
    window.__nxMktTrapped = 1;
    try { Object.defineProperty(document, 'readyState', { configurable: true, get: function () { return 'complete'; } }); } catch (e2) {}
    setTimeout(function () { if (!window.__nxMktBooted) { window.__nxMktBooted = true; try { delete document.readyState; } catch (e3) {} try { NexusChatInterior_init(); } catch (e4) {} } }, 8000);
  }
})();
