/* nx-shared.js — SINGLE SOURCE of markup + pure logic shared by services.html and shop.html (marketplace).
   Pair file: nx-shared.css. Change a template/function here and both sections change together.
   Host pages supply only DATA (loaders) and page-specific actions. */
(function (G) {
  'use strict';
  var NX = G.NXShared = G.NXShared || {};

  /* ───────────── helpers ───────────── */
  NX.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var BLANK = 'data:image/svg+xml;utf8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 48 48%27%3E%3Crect width=%2748%27 height=%2748%27 fill=%27%23262626%27/%3E%3C/svg%3E';
  NX.avatar = function (o) {            // identical markup to services npAv(); hosts may override NX.avatar
    o = o || {}; var size = Number(o.size) || 48, st = size === 48 ? '' : ' style="--nx-av:' + size + 'px"';
    return '<div class="nx-av"' + (o.id ? ' id="' + o.id + '"' : '') + st + (o.un ? ' data-av-un="' + NX.esc(o.un) + '"' : '') + (o.attrs ? ' ' + o.attrs : '') + '>' +
      '<img src="' + (o.url || BLANK) + '" alt="">' + (o.inner || '') + '</div>';
  };

  /* ───────────── REVIEWS (summary · cards · filter page) ───────────── */
  NX.stars = function (rating, size) {
    size = size || 14; var h = '';
    for (var i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) h += '<span class="np-review-star" style="font-size:' + size + 'px;">★</span>';
      else if (i - rating < 1 && i - rating > 0) h += '<span class="np-review-star" style="font-size:' + size + 'px;opacity:0.4;">★</span>';
      else h += '<span class="np-review-star" style="font-size:' + size + 'px;color:#e2e8f0;">★</span>';
    } return h;
  };
  NX.reviewSummary = function (reviews) {
    var total = reviews.length, counts = [0, 0, 0, 0, 0], sum = 0;
    reviews.forEach(function (r) { var v = Number(r.rating) || 0; sum += v; var i = Math.round(v) - 1; if (i >= 0 && i < 5) counts[i]++; });
    var avg = total ? sum / total : 0;
    var bars = [5, 4, 3, 2, 1].map(function (n) {
      var pct = total ? (counts[n - 1] / total) * 100 : 0;
      return '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.75);width:10px;text-align:right;">' + n + '</span><div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:10px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:#f59e0b;border-radius:10px;"></div></div><span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);width:22px;text-align:right;">' + counts[n - 1] + '</span></div>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:20px;margin-bottom:8px;"><div style="text-align:center;flex-shrink:0;"><div class="np-rating-score">' + avg.toFixed(1) + '</div><div style="margin:6px 0 4px;">' + NX.stars(avg, 13) + '</div><div class="np-rating-count">' + total + ' ' + (total === 1 ? 'review' : 'reviews') + '</div></div><div style="flex:1;display:flex;flex-direction:column;gap:6px;">' + bars + '</div></div>';
  };
  /* opts.avatar(r) → avatar html · opts.identityFn → name of global fn for the Verified button */
  NX.reviewCards = function (reviews, opts) {
    opts = opts || {}; if (!reviews || !reviews.length) return '';
    var tick = '<div style="position:absolute;bottom:-2px;right:-2px;z-index:4;width:14px;height:14px;background:#10b981;border-radius:50%;border:2px solid #050505;display:flex;align-items:center;justify-content:center;"><span style="font-size:7px;color:#fff;">✓</span></div>';
    var cards = reviews.map(function (r) {
      var av = opts.avatar ? opts.avatar(r, r.verified ? tick : '') : NX.avatar({ un: r.customerUsername, size: 40, inner: r.verified ? tick : '' });
      var idFn = opts.identityFn || 'openIdentityOverlay';
      return '<div class="np-review-card"><div class="np-review-top"><div class="np-reviewer-left">' + av + '<div><div class="np-reviewer-name">' + NX.esc(r.reviewerName) + '</div><div class="np-reviewer-meta">' + NX.stars(r.rating, 12) + '<span class="np-reviewer-date">' + NX.esc(r.date) + '</span></div></div></div>' +
        (r.verified ? '<button class="np-verified-badge" onclick="' + idFn + '(\'' + NX.esc(r.id) + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.4-4.2-4.2 1.4-1.4 2.8 2.8 5.2-5.2 1.4 1.4-6.6 6.6z"/></svg>Verified Purchase</button>' : '') +
        '</div><div class="np-review-comment">' + NX.esc(r.comment) + '</div><div class="np-helpful-row"><div class="np-helpful-text">Was this review helpful?</div><div class="np-helpful-btns"><button class="np-helpful-btn" onclick="handleNPHelpful(this, \'' + r.id + '\', true)">Yes · ' + (r.helpfulCount || 0) + '</button><button class="np-helpful-btn" onclick="handleNPHelpful(this, \'' + r.id + '\', false)">No</button></div></div></div>';
    }).join('');
    return '<div class="np-reviews-section" style="margin-top:4px;">' + cards + '</div>';
  };
  if (typeof G.handleNPHelpful !== 'function') G.handleNPHelpful = function (btn) {
    var row = btn.closest('.np-helpful-btns');
    row.querySelectorAll('.np-helpful-btn').forEach(function (b) { b.style.background = 'transparent'; b.style.color = 'rgba(255,255,255,0.75)'; b.style.borderColor = 'rgba(255,255,255,0.12)'; });
    btn.style.color = '#00F2FF'; btn.style.borderColor = '#00F2FF'; if (navigator.vibrate) navigator.vibrate(10);
  };
  /* Full ratings page body (summary · positive/critical · sort · list). Same markup as services' ratings page. */
  NX.mountReviews = function (el, reviews, opts) {
    opts = opts || {};
    var all = (reviews || []).map(function (r) {
      var t = r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : (r.createdAt || r.time || r.timestamp || 0);
      return Object.assign({}, r, { createdAt: Number(t) || 0, reviewerName: r.reviewerName || r.customerName || r.username || 'Customer',
        date: r.date || (t ? new Date(Number(t)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''), comment: r.comment || r.text || '', helpfulCount: r.helpfulCount || 0, customerUsername: r.customerUsername || r.username || '' });
    });
    var sort = 'relevant', sent = null;
    el.innerHTML = '<div id="rf-summary" class="rf6-sum"></div><div class="rf6-row" style="margin-top:12px;"><button type="button" class="rf6-chip" data-s="positive">Positive</button><button type="button" class="rf6-chip" data-s="negative">Critical</button></div><div id="rf-sort" class="rf6-row" style="margin-top:10px;">' +
      [['relevant', 'Most relevant'], ['newest', 'Newest'], ['high', 'Highest'], ['low', 'Lowest']].map(function (k) { return '<button type="button" data-k="' + k[0] + '" class="rf6-chip' + (k[0] === 'relevant' ? ' on' : '') + '">' + k[1] + '</button>'; }).join('') +
      '</div><div class="nx-rv-list" style="margin-top:18px;display:flex;flex-direction:column;gap:12px;"></div>';
    var sum = el.querySelector('#rf-summary'), list = el.querySelector('.nx-rv-list');
    sum.innerHTML = all.length ? NX.reviewSummary(all) : '<div class="rf6-empty">No reviews yet</div>';
    if (!all.length) { el.querySelectorAll('.rf6-row').forEach(function (x) { x.style.display = 'none'; }); return; }
    function draw() {
      var l = all.slice();
      if (sent === 'positive') l = l.filter(function (r) { return r.rating >= 4; });
      if (sent === 'negative') l = l.filter(function (r) { return r.rating <= 2; });
      if (sort === 'newest') l.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      else if (sort === 'high') l.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
      else if (sort === 'low') l.sort(function (a, b) { return (a.rating || 0) - (b.rating || 0); });
      else l.sort(function (a, b) { return ((b.helpfulCount || 0) - (a.helpfulCount || 0)) || ((b.comment || '').length - (a.comment || '').length); });
      list.innerHTML = l.length ? NX.reviewCards(l, opts) : '<div style="text-align:center;padding:40px 20px;color:#94a3b8;font-size:13px;">No matching reviews</div>';
    }
    el.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { sent = sent === b.dataset.s ? null : b.dataset.s; el.querySelectorAll('[data-s]').forEach(function (x) { x.classList.toggle('on', x.dataset.s === sent); }); draw(); }; });
    el.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { sort = b.dataset.k; el.querySelectorAll('[data-k]').forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); }; });
    draw();
  };

  /* ───────────── INBOX ───────────── */
  NX.inboxFormatTime = function (ts) {
    if (!ts) return '';
    var now = new Date(), d = new Date(ts), diffMin = (now - d) / 60000;
    if (diffMin < 1) return 'Now';
    if (now.toDateString() === d.toDateString()) { var h = d.getHours(), m = ('0' + d.getMinutes()).slice(-2), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h ? h : 12; return h + ':' + m + ' ' + ap; }
    var s0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()), s1 = new Date(d.getFullYear(), d.getMonth(), d.getDate()), dd = Math.round((s0 - s1) / 86400000);
    if (dd === 1) return 'Yesterday';
    if (dd >= 2 && dd <= 6) return d.toLocaleDateString('en-US', { weekday: 'long' });
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
  };
  NX.inboxPreviewText = function (msg) {
    if (!msg) return 'Tap to open chat';
    if (msg.type === 'text') return msg.text || '';
    if (msg.type === 'image' || msg.type === 'imageGroup') return msg.caption || '📷 Photo';
    if (msg.type === 'video') return msg.caption || '🎥 Video';
    if (msg.type === 'voice') return '🎤 Voice message';
    return 'Tap to open chat';
  };
  NX.inboxFilterSelling = function (threads, filter) {
    if (filter === 'all') return threads;
    return threads.filter(function (t) {
      var lastRole = t.lastMsg ? t.lastMsg.role : null, bot = t.botActive !== false;
      if (filter === 'needsReply') return lastRole === 'mine'; if (filter === 'bot') return bot; if (filter === 'takenOver') return !bot; return true;
    });
  };
  /* one row; host supplies href + click handler names so each section opens chats its own way */
  NX.inboxItemHTML = function (t, tab, href, clickFn, avTapFn) {
    var avAttr = avTapFn ? ' onclick="return ' + avTapFn + '(event, \'' + encodeURIComponent(t.otherId) + '\', \'' + tab + '\')"' : '';
    return '<a href="' + href + '" class="inbox-chat-item" onclick="return ' + clickFn + '(this.getAttribute(\'href\'))">' +
      NX.avatar({ url: t.avatarUrl, un: t.avatarUrl ? '' : t.otherId, attrs: avAttr.trim() }) +
      '<div class="inbox-chat-details"><span class="inbox-chat-name">' + NX.esc(t.displayName) + '</span><p class="inbox-chat-preview">' + NX.esc(NX.inboxPreviewText(t.lastMsg)) + '</p></div>' +
      '<div class="inbox-chat-meta"><span class="inbox-chat-time">' + NX.inboxFormatTime(t.lastActive) + '</span></div></a>';
  };
  NX.inboxOverlayInner = function (o) {
    o = o || {};
    return '<div style="position:relative;margin:12px 12px 0;"><div id="inbox-search-bar" class="search-bar-wrap" style="margin:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input id="inbox-search-input" type="text" placeholder="Search chats..." oninput="performInboxSearch(this.value)"><button onclick="toggleInboxSearchBar()" style="background:none;border:none;color:#fde08d;cursor:pointer;padding:0;display:flex;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
      '<div id="inbox-title-row" style="position:absolute;inset:0;background:#050505;display:flex;align-items:center;justify-content:center;transition:opacity 0.2s;"><button onclick="closeInboxOverlay()" style="position:absolute;left:0;background:none;border:none;color:#fff;cursor:pointer;padding:4px;display:flex;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M15 18l-6-6 6-6"/></svg></button><h1 style="font-size:20px;font-weight:600;color:#fff;margin:0;">' + (o.title || 'Business Chat') + '</h1><button onclick="toggleInboxSearchBar()" style="position:absolute;right:0;background:none;border:none;color:#fff;cursor:pointer;padding:4px;display:flex;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button></div></div>' +
      '<div style="padding:14px 12px 0;"><div id="inbox-pill-group" style="display:flex;background:rgba(255,255,255,0.04);border-radius:999px;padding:3px;"><button id="inbox-tab-buying" class="inbox-main-tab" onclick="inboxSwitchMainTab(\'buying\')">Buying</button><button id="inbox-tab-selling" class="inbox-main-tab" onclick="inboxSwitchMainTab(\'selling\')">Selling</button><button id="inbox-tab-updates" class="inbox-main-tab" onclick="inboxSwitchMainTab(\'updates\')">Updates</button></div></div>' +
      '<div id="inbox-selling-subfilters" style="display:none;gap:8px;padding:12px 12px 0;overflow-x:auto;scrollbar-width:none;"><div class="inbox-subfilter-pill active" onclick="inboxSwitchSubFilter(\'all\', this)">All</div><div class="inbox-subfilter-pill" onclick="inboxSwitchSubFilter(\'needsReply\', this)">Needs Reply</div><div class="inbox-subfilter-pill" onclick="inboxSwitchSubFilter(\'bot\', this)">Bot Handling</div><div class="inbox-subfilter-pill" onclick="inboxSwitchSubFilter(\'takenOver\', this)">Taken Over by You</div></div>' +
      '<div id="inbox-list-wrap" style="flex:1;overflow-y:auto;margin-top:2px;"><div id="inbox-list-buying" style="display:none;"></div><div id="inbox-list-selling" style="display:none;"></div></div>' +
      '<div id="inbox-updates-pane" style="display:none;flex:1;min-height:0;margin-top:12px;"><iframe id="inbox-updates-frame" title="Updates" style="width:100%;height:100%;border:0;background:#050505;"></iframe></div>';
  };

  /* ───────────── MY BUSINESS shell (header · rating strip · tabs) ───────────── */
  var ICO_BACK = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  var ICO_GEAR = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  var ICO_PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  NX.ICO = { back: ICO_BACK, gear: ICO_GEAR, plus: ICO_PLUS };
  /* o = {tabs:[[key,label],…], back:'fnName()', settings:'fnName()'|null, add:'fnName()', switchTab:'fnName', online:'fnName()'|null, completionLabel:'completion'} */
  NX.mbShellHTML = function (o) {
    var tabs = o.tabs.map(function (t, i) { return '<button class="mb6-tab' + (i === 0 ? ' active' : '') + '" onclick="' + o.switchTab + '(\'' + t[0] + '\')" id="mb-tab-' + t[0] + '">' + t[1] + '</button>'; }).join('');
    return '<div class="mb6-top"><div class="mb6-head"><button class="mb6-back" onclick="' + o.back + '" aria-label="Back">' + ICO_BACK + '</button><span id="mb6-av-slot" style="display:flex;"></span>' +
      '<div class="mb6-id"><div class="mb6-name-row"><div class="mb6-name" id="mb-business-name">My Business</div><span id="mb-plan-badge" class="mb6-plan">FREE</span></div><div class="mb6-sub" id="mb6-sub">Your business</div></div>' +
      (o.settings ? '<button class="mb6-ic" onclick="' + o.settings + '" aria-label="Settings">' + ICO_GEAR + '</button>' : '') +
      '<button id="mb-header-publish-btn" class="mb6-ic" onclick="' + o.add + '" aria-label="Add">' + ICO_PLUS + '</button></div>' +
      '<div class="mb6-strip"><div class="mb6-stats"><span><span class="mb6-star">★</span> <span id="mb-badge-rating">—</span></span><i></i><span><span id="mb-badge-completion">0%</span> ' + (o.completionLabel || 'completion') + '</span></div>' +
      '<button id="mb6-online" class="mb6-online" onclick="' + (o.online || '') + '" aria-pressed="false"><i></i><span id="mb6-online-t">Offline</span></button></div>' +
      '<div class="mb6-tabs" id="mb6-tabs">' + tabs + '</div></div>';
  };
  NX.statCard = function (icon, idAttr, label) {
    return '<div class="mb-glass-card mb-stat-card"><div class="mb-stat-icon">' + icon + '</div><div><div style="font-size:20px;font-weight:800;color:#ffffff;line-height:1.1;" id="' + idAttr + '">0</div><div style="font-size:11.5px;color:rgba(255,255,255,0.55);margin-top:3px;">' + label + '</div></div></div>';
  };
  NX.svg = function (d) { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  NX.quickAction = function (onclick, d, label) { return '<button onclick="' + onclick + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>' + label + '</button>'; };
  NX.healthCard = function () {
    return '<div class="mb-glass-card" style="margin-top:22px;border-radius:16px;padding:16px;display:flex;align-items:center;gap:14px;"><div id="mb-health-ring" style="width:56px;height:56px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--np-green,#10b981) 0deg,rgba(255,255,255,0.1) 0deg);transition:background 0.4s ease;"><div style="width:44px;height:44px;border-radius:50%;background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#ffffff;" id="mb-health-score">0%</div></div><div style="flex:1;"><div style="font-size:13px;font-weight:800;color:#ffffff;">Profile Health</div><div style="font-size:11.5px;color:rgba(255,255,255,0.55);margin-top:2px;" id="mb-health-tip">Complete your setup to boost visibility</div></div></div>';
  };
  NX.setHealth = function (pct, tip) {
    var r = document.getElementById('mb-health-ring'), s = document.getElementById('mb-health-score'), t = document.getElementById('mb-health-tip');
    if (r) r.style.background = 'conic-gradient(var(--np-green,#10b981) ' + (pct * 3.6) + 'deg,rgba(255,255,255,0.1) 0deg)';
    if (s) s.textContent = pct + '%'; if (t && tip) t.textContent = tip;
  };
  NX.checkItem = function (done, title, sub, onclick) {
    return '<div class="mb-glass-card mb-check-card"' + (onclick ? ' onclick="' + onclick + '" style="cursor:pointer"' : '') + '><div style="width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:' + (done ? '#10b981' : 'transparent') + ';border:2px solid ' + (done ? '#10b981' : 'rgba(255,255,255,0.25)') + ';color:#fff;font-size:12px;">' + (done ? '✓' : '') + '</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:#fff;">' + title + '</div><div style="font-size:11.5px;color:rgba(255,255,255,0.55);margin-top:2px;">' + sub + '</div></div></div>';
  };
  NX.trendSVG = function (svgEl, labelsEl, series, labels, series2) {   // "Last 7 Days" chart: white line (+ optional grey line)
    var w = 300, h = 110, max = Math.max.apply(null, series.concat(series2 || [], [1]));
    function pts(a) { return a.map(function (v, i) { return [i * (w / (a.length - 1)), h - 10 - (v / max) * (h - 24)]; }); }
    function draw(a, col) { var p = pts(a); return '<polyline fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="' + p.map(function (q) { return q.join(','); }).join(' ') + '"/>' + p.map(function (q) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3" fill="' + col + '"/>'; }).join(''); }
    svgEl.innerHTML = (series2 ? draw(series2, '#838383') : '') + draw(series, '#ffffff');
    labelsEl.innerHTML = labels.map(function (l) { return '<span>' + l + '</span>'; }).join('');
  };
  /* profile pictures for .nx-av[data-av-un] (hosts that already have their own filler may skip this) */
  NX.fillAvatars = async function (root, getUserDoc) {
    var els = (root || document).querySelectorAll('.nx-av[data-av-un]:not([data-av-done])');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        el.setAttribute('data-av-done', '1'); var un = el.getAttribute('data-av-un'); if (!un) return;
        Promise.resolve(getUserDoc(un)).then(function (url) { if (url) { var im = el.querySelector('img'); if (im) im.src = url; } }).catch(function () {});
      })(els[i]);
    }
  };
})(window);
