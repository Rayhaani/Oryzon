/* NXQ — read-only measuring tool. Changes NOTHING in your files. Paste in eruda console once, then use the app normally. */
(function () {
  if (window.__NXQ) { console.log('[NXQ] already on'); return; } window.__NXQ = 1;
  var L = [], T0 = performance.now();
  function log(s) { var l = '[NXQ] ' + new Date().toISOString().slice(11, 23) + ' ' + s; L.push(l); console.log(l); try { localStorage.setItem('nxq_log', L.slice(-400).join('\n')); } catch (e) {} }
  function short(u) { u = String(u || ''); return u.indexOf('data:') === 0 ? 'data:BLANK/inline(' + u.length + ')' : (u.length > 90 ? u.slice(0, 45) + '…' + u.slice(-40) : u); }

  /* ---------- A) chat-interior: first-open timeline ---------- */
  var chatRun = null;
  function startChat() {
    if (chatRun) return; var t0 = performance.now(), n = 0, last = '', av = null, q;
    var w = ''; try { w = new URLSearchParams(location.search).get('with') || ''; } catch (e) {}
    var cache = null; try { cache = localStorage.getItem('nx_peer_' + w); } catch (e) {}
    var urlAv = ''; try { urlAv = new URLSearchParams(location.search).get('avatar') || ''; } catch (e) {}
    var roomKeys = []; try { Object.keys(localStorage).forEach(function (k) { if (/^nx_(chat|msg|room)/i.test(k) && k.indexOf(w) > -1) roomKeys.push(k); }); } catch (e) {}
    log('CHAT OPEN with=' + w + ' · url ?avatar=' + (urlAv ? 'YES ' + short(urlAv) : 'NO') + ' · nx_peer cache=' + (cache ? 'YES ' + short(cache) : 'NO') + ' · saved-message keys=' + (roomKeys.length ? roomKeys.join(',') : 'NONE'));
    chatRun = setInterval(function () {
      n++; var ms = Math.round(performance.now() - t0), cf = document.getElementById('chat-flow'), a = document.getElementById('chat-header-avatar'), nm = document.getElementById('chat-header-name');
      var rows = cf ? cf.querySelectorAll('.message-row').length : -1, spin = document.querySelector('#chat-flow .nx-ph-spin,#chat-flow [class*=spin],#chat-flow [class*=skeleton]') ? 'YES' : 'no';
      var s = 'name="' + (nm && nm.textContent) + '" · avatar=' + short(a && a.src) + ' · message rows=' + rows + ' · spinner/skeleton=' + spin;
      if (s !== last) { log('chat +' + ms + 'ms · ' + s); last = s; }
      if (n > 80) { clearInterval(chatRun); chatRun = null; log('chat timeline end (8s)'); }
    }, 100);
  }

  /* ---------- B) channel / page / group: image timeline ---------- */
  function imgReport(tag, doc, win, tOpen) {
    try {
      var imgs = Array.prototype.slice.call(doc.querySelectorAll('img')).filter(function (i) { return i.src && i.src.indexOf('data:') !== 0; });
      var vh = win.innerHeight, rt = win.performance.getEntriesByType('resource').filter(function (e) { return e.initiatorType === 'img' || /\.(jpe?g|png|webp|gif|avif)|firebasestorage|googleusercontent/i.test(e.name); });
      var done = imgs.filter(function (i) { return i.complete && i.naturalWidth > 0; }).length;
      var lazy = imgs.filter(function (i) { return i.getAttribute('loading') === 'lazy'; }).length;
      var inView = imgs.filter(function (i) { var r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < vh; }).length;
      log(tag + ' +' + Math.round(performance.now() - tOpen) + 'ms · <img> in DOM=' + imgs.length + ' · loaded=' + done + ' · loading=lazy: ' + lazy + ' · in viewport=' + inView + ' · image requests seen=' + rt.length);
      return rt;
    } catch (e) { log(tag + ' report failed: ' + e.message); return []; }
  }
  function watchHost(kind, host) {
    var t = performance.now(), fr = host.querySelector('iframe');
    var doc = fr ? fr.contentDocument : document, win = fr ? fr.contentWindow : window;
    log(kind.toUpperCase() + ' OPEN · via ' + (fr ? 'overlay iframe' : 'page'));
    [300, 1000, 2500, 5000, 8000, 12000, 16000].forEach(function (ms, i, a) {
      setTimeout(function () {
        var rt = imgReport(kind, doc, win, t);
        if (i === a.length - 1 || ms === 12000) rt.slice(0, 8).forEach(function (e) {
          log('   ' + short(e.name) + ' · request started at +' + Math.round(e.startTime) + 'ms (iframe clock) · first byte at +' + Math.round(e.responseStart) + 'ms · finished at +' + Math.round(e.responseEnd) + 'ms · download took ' + Math.round(e.duration) + 'ms · size ' + Math.round((e.encodedBodySize || 0) / 1024) + 'KB' + (e.transferSize === 0 ? ' · FROM CACHE' : ''));
        });
      }, ms);
    });
  }
  ['group', 'page', 'channel'].forEach(function (k) {
    var host = document.getElementById('nx-ov-' + k), was = false; if (!host) return;
    new MutationObserver(function () { var o = host.style.display !== 'none' && host.style.display !== ''; if (o && !was) watchHost(k, host); was = o; }).observe(host, { attributes: true, attributeFilter: ['style'] });
  });
  /* chat-interior detection (SPA or native) */
  function tick() { if (document.getElementById('chat-flow') && document.getElementById('chat-header-bar')) startChat(); else if (chatRun === null) { /* wait */ } }
  setInterval(function () { var is = !!document.getElementById('chat-flow'); if (is && !window.__nxqIn) { window.__nxqIn = 1; startChat(); } if (!is) window.__nxqIn = 0; }, 150);
  /* native channels.html / pages.html (not overlay) */
  if (/channels\.html|pages\.html/.test(location.pathname)) watchHost(/channels/.test(location.pathname) ? 'channel' : 'page', { querySelector: function () { return null; } });

  /* ---------- C) which files are really running ---------- */
  setTimeout(function () {
    var src = Array.prototype.map.call(document.scripts, function (x) { return (x.src || '').split('/').pop(); }).filter(function (x) { return /chats|group|pages|channels|nx-overlay|router|chat-interior/.test(x); });
    log('FILES RUNNING: ' + src.join(' | ') + ' · placeholders-code(chats_30+)=' + (window.__nxComm && window.__nxComm.placeholder ? 'YES' : 'NO'));
  }, 1500);
  /* ---------- D) "No pages/channels yet" flash: who showed it, and when ---------- */
  function watchEmpty() {
    ['groups', 'pages', 'channels'].forEach(function (id) {
      var r = document.getElementById(id); if (!r || r.__nxq) return; r.__nxq = 1;
      new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (n.nodeType === 1 && (n.classList.contains('nx-empty') || /No (pages|channels|groups) yet/i.test(n.textContent || ''))) {
          var C = window.__nxComm || {}, rows = r.querySelectorAll('[data-nx-row]').length, ph = r.querySelector('[data-nx-ph-state]');
          log('EMPTY-MESSAGE SHOWN in #' + id + ' · rows now=' + rows + ' · server-confirmed=' + JSON.stringify(C.confirmed || 'n/a') + ' · saved list=' + (function () { try { var u = localStorage.getItem('nx_list_' + (id === 'groups' ? 'group' : id === 'pages' ? 'page' : 'channel') + '_' + (window.myId || '')); return u ? 'YES' : 'NO'; } catch (e) { return '?'; } })() + ' · placeholder=' + (ph ? ph.getAttribute('data-nx-ph-state') : 'none') + ' · text="' + (n.textContent || '').trim().slice(0, 40) + '"');
        }
      }); }); }).observe(r, { childList: true, subtree: true });
    });
  }
  setInterval(watchEmpty, 400);
  /* ---------- E) overlays: blank vs spinner vs content ---------- */
  ['group', 'page', 'channel'].forEach(function (k) {
    var host = document.getElementById('nx-ov-' + k), was = false; if (!host) return;
    new MutationObserver(function () { var o = host.style.display !== 'none' && host.style.display !== ''; if (o && !was) {
      var fr = host.querySelector('iframe'), t = performance.now();
      [100, 300, 700, 1500, 3000].forEach(function (ms) { setTimeout(function () { try {
        var d = fr.contentDocument, b = d.body;
        log(k + ' overlay +' + Math.round(performance.now() - t) + 'ms · text length=' + b.innerText.length + ' · spinner/skeleton elements=' + d.querySelectorAll('[class*=spin],[class*=skeleton],[class*=shimmer],.pg-sk,.ch-sk').length + ' · saved snapshot shown=' + !!d.getElementById('np-snap') + ' · "' + b.innerText.replace(/\s+/g, ' ').trim().slice(0, 70) + '"');
      } catch (e) { log(k + ' overlay peek failed: ' + e.message); } }, ms); });
    } was = o; }).observe(host, { attributes: true, attributeFilter: ['style'] });
  });
  window.NXQ = { report: function () { var t = L.join('\n'); console.log(t); return t; }, saved: function () { var t = localStorage.getItem('nxq_log') || ''; console.log(t); return t; } };
  console.log('[NXQ] ON. Now: (1) open a chat you have NEVER opened (or clear it first), (2) open a channel for the first time. Then type NXQ.report() and send me the text. (After a reload: NXQ.saved())');
})();
