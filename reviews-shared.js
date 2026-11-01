/* reviews-shared.js — one review UI (summary, filter chips, sort, cards) shared by marketplace store-front + product reviews.
   Markup and CSS classes are identical to the services Ratings page (rf6 / np-review*). Use: NXReviews.mount(el, reviews[, opts]) */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stars(r, size) {
    var h = ''; for (var i = 1; i <= 5; i++) {
      if (i <= Math.floor(r)) h += '<span class="np-review-star" style="font-size:' + size + 'px;">★</span>';
      else if (i - r < 1 && i - r > 0) h += '<span class="np-review-star" style="font-size:' + size + 'px;opacity:0.4;">★</span>';
      else h += '<span class="np-review-star" style="font-size:' + size + 'px;color:#e2e8f0;">★</span>';
    } return h;
  }
  function summary(rv) {
    var total = rv.length, counts = [0, 0, 0, 0, 0], sum = 0;
    rv.forEach(function (r) { var v = Number(r.rating) || 0; sum += v; var i = Math.round(v) - 1; if (i >= 0 && i < 5) counts[i]++; });
    var avg = total ? sum / total : 0;
    var bars = [5, 4, 3, 2, 1].map(function (n) {
      var pct = total ? counts[n - 1] / total * 100 : 0;
      return '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.75);width:10px;text-align:right;">' + n + '</span><div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:10px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:#f59e0b;border-radius:10px;"></div></div><span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);width:22px;text-align:right;">' + counts[n - 1] + '</span></div>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:20px;margin-bottom:8px;"><div style="text-align:center;flex-shrink:0;"><div class="np-rating-score">' + avg.toFixed(1) + '</div><div style="margin:6px 0 4px;">' + stars(avg, 13) + '</div><div class="np-rating-count">' + total + (total === 1 ? ' review' : ' reviews') + '</div></div><div style="flex:1;display:flex;flex-direction:column;gap:6px;">' + bars + '</div></div>';
  }
  function cards(list) {
    return list.map(function (r) {
      var nm = r.reviewerName || r.customerName || r.username || 'Customer';
      return '<div class="np-review-card"><div class="np-review-top"><div class="np-reviewer-left"><div class="np-reviewer-avatar" style="position:relative;display:grid;place-items:center;">' + esc(nm.charAt(0).toUpperCase()) +
        (r.verified ? '<div style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;background:#10b981;border-radius:50%;border:2px solid #050505;display:flex;align-items:center;justify-content:center;"><span style="font-size:7px;color:#fff;">✓</span></div>' : '') +
        '</div><div><div class="np-reviewer-name">' + esc(nm) + '</div><div class="np-reviewer-meta">' + stars(r.rating, 12) + '<span class="np-reviewer-date">' + esc(r.date || '') + '</span></div></div></div></div><div class="np-review-comment">' + esc(r.comment || r.text || '') + '</div></div>';
    }).join('');
  }
  function norm(r) {
    var t = r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : (r.createdAt || r.time || r.timestamp || 0);
    if (t && t.toMillis) t = t.toMillis();
    return Object.assign({}, r, { _t: Number(t) || 0, date: r.date || (t ? new Date(Number(t)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '') });
  }
  window.NXReviews = {
    esc: esc, stars: stars, summary: summary, cards: cards,
    mount: function (el, reviews, opts) {
      opts = opts || {};
      var all = (reviews || []).map(norm), sort = 'relevant', sent = null;
      el.classList.add('nxrv');
      el.innerHTML = '<div id="rf-summary" class="rf6-sum"></div><div class="rf6-row" style="margin-top:12px;"><button type="button" class="rf6-chip" data-s="positive">Positive</button><button type="button" class="rf6-chip" data-s="negative">Critical</button></div>' +
        '<div class="rf6-row" style="margin-top:10px;">' + [['relevant', 'Most relevant'], ['newest', 'Newest'], ['high', 'Highest'], ['low', 'Lowest']].map(function (k) { return '<button type="button" class="rf6-chip' + (k[0] === 'relevant' ? ' on' : '') + '" data-k="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>' +
        '<div class="nxrv-list" style="margin-top:18px;display:flex;flex-direction:column;gap:12px;"></div>';
      var sumEl = el.querySelector('.rf6-sum'), list = el.querySelector('.nxrv-list');
      sumEl.innerHTML = all.length ? summary(all) : '<div class="rf6-empty">No reviews yet</div>';
      if (!all.length) { el.querySelectorAll('.rf6-row').forEach(function (x) { x.style.display = 'none'; }); list.innerHTML = ''; return; }
      function draw() {
        var l = all.slice();
        if (sent === 'positive') l = l.filter(function (r) { return r.rating >= 4; });
        if (sent === 'negative') l = l.filter(function (r) { return r.rating <= 2; });
        if (sort === 'newest') l.sort(function (a, b) { return b._t - a._t; });
        else if (sort === 'high') l.sort(function (a, b) { return b.rating - a.rating; });
        else if (sort === 'low') l.sort(function (a, b) { return a.rating - b.rating; });
        else l.sort(function (a, b) { return ((b.helpfulCount || 0) - (a.helpfulCount || 0)) || (String(b.comment || '').length - String(a.comment || '').length); });
        list.innerHTML = l.length ? cards(l) : '<div style="text-align:center;padding:40px 20px;color:#94a3b8;font-size:13px;">No matching reviews</div>';
      }
      el.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { sent = sent === b.dataset.s ? null : b.dataset.s; el.querySelectorAll('[data-s]').forEach(function (x) { x.classList.toggle('on', x.dataset.s === sent); }); draw(); }; });
      el.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { sort = b.dataset.k; el.querySelectorAll('[data-k]').forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); }; });
      draw();
    }
  };
})();
