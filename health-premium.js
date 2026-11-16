/* ============================================================
   health-premium.js — Nexus Health+ (v2; load AFTER health-care.js)
   One tile on the Health home opens a hub:
     Nutrition · AI Coach · Health insights · Doctor report · Women's health · Programs
   The server (/premium/*) decides who may use what. Prices, limits and plan
   contents are read from the server, nothing is hard-coded here.
   Health data (vitals, cycle, programs) stays on the device, like the rest of Nexus Health.
   Styling follows the Nexus "soft raised" system (nx-btn.css / nx-shared.css): dark, gold accent.
   ============================================================ */
(function () {
  'use strict';
  if (window.__nxPremium) return; window.__nxPremium = 1;

  var BACKEND = 'https://oryzon-backend-ed1q.onrender.com';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toast = function (m) { try { window.showToast(m); } catch (e) {} };
  var p2 = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { d = d || new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  var parseYmd = function (s) { var a = String(s).split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); };
  var addDays = function (s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  var diffDays = function (a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); };
  var nice = function (s) { return parseYmd(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
  var money = function (n) { return '$' + (Math.round(n * 100) / 100).toString(); };
  var lget = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  var lset = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var today = function () { return ymd(); };

  var S = { view: 'hub', st: null, err: null, day: null, fast: null, scan: null, chat: [], busy: false, ins: null, range: 7, prog: null, lesson: null, rep: { meds: true, vitals: true, mid: true, food: false } };

  /* ---------- styles ---------- */
  var CSS =
    '#nxPrem .nxp-card{background:#121212;border-radius:20px;padding:16px;margin-bottom:12px;box-shadow:6px 6px 14px #000,-4px -4px 10px #1b1b1b}' +
    '#nxPrem .nxp-h{font-size:16px;font-weight:700;color:#fff;margin:0 0 4px}#nxPrem .nxp-p{font-size:13px;line-height:1.55;color:rgba(255,255,255,.62);margin:0}' +
    '#nxPrem .nxp-pill{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fde08d;border:1px solid rgba(253,224,141,.4);border-radius:99px;padding:3px 9px}' +
    '#nxPrem .nxp-lk{color:#fde08d;font-weight:800;font-size:10px;letter-spacing:.08em}' +
    '#nxPrem .nxp-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:13px;color:rgba(255,255,255,.85)}#nxPrem .nxp-row:last-child{border:0}' +
    '#nxPrem .nxp-k{color:rgba(255,255,255,.5)}' +
    '#nxPrem .nxp-btn{position:relative;display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:42px;margin-top:10px;padding:0 12px;border:0;border-radius:14px;background:#121212;color:#d8d8d8;box-shadow:6px 6px 14px #000,-4px -4px 10px #1b1b1b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;font-weight:600;cursor:pointer}' +
    '#nxPrem .nxp-btn.pri{color:#fde08d}#nxPrem .nxp-btn:active{box-shadow:inset 4px 4px 9px #000,inset -3px -3px 8px #1b1b1b}#nxPrem .nxp-btn[disabled]{opacity:.55;pointer-events:none}' +
    '#nxPrem .nxp-seg{display:flex;background:rgba(255,255,255,.04);border-radius:999px;padding:3px;margin:0 0 14px}#nxPrem .nxp-seg button{flex:1 1 0;border:0;background:transparent;color:rgba(255,255,255,.5);font-size:13px;font-weight:700;padding:9px 0;border-radius:999px;cursor:pointer;font-family:inherit}#nxPrem .nxp-seg button.on{background:rgba(255,255,255,.1);color:#fff}' +
    '#nxPrem .nxp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}#nxPrem .nxp-chip{padding:8px 13px;border-radius:99px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:rgba(255,255,255,.65);font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit}#nxPrem .nxp-chip.on{color:#fde08d;border-color:rgba(253,224,141,.5);background:rgba(253,224,141,.08)}' +
    '#nxPrem .nxp-bar{height:8px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:8px}#nxPrem .nxp-bar i{display:block;height:100%;background:#fde08d;border-radius:9px}' +
    '#nxPrem .nxp-big{font-size:28px;font-weight:800;color:#fff;line-height:1.1}#nxPrem .nxp-sub{font-size:12px;color:rgba(255,255,255,.5);line-height:1.5}' +
    '#nxPrem .nxp-bub{font-size:14px;line-height:1.5;padding:10px 13px;border-radius:18px;margin-bottom:8px;max-width:88%;white-space:pre-wrap}#nxPrem .nxp-u{background:rgba(253,224,141,.12);margin-left:auto;color:#fff}#nxPrem .nxp-a{background:rgba(255,255,255,.05);color:rgba(255,255,255,.9)}' +
    '#nxPrem .nxp-in{display:flex;gap:8px;margin-top:10px;align-items:flex-start}#nxPrem .nxp-in .nxp-btn{width:90px;margin:0;flex:none}' +
    '#nxPrem .nxp-g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}#nxPrem .nxp-g2>*,#nxPrem .nxp-in>*{min-width:0}#nxPrem .nx-field{box-sizing:border-box;width:100%}' +
    '#nxPrem .nxp-warn{font-size:11px;color:rgba(255,255,255,.42);margin-top:10px;line-height:1.5}' +
    '#nxPrem .nxp-tbl{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;align-items:center;font-size:12.5px}#nxPrem .nxp-tbl>div{padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.8)}#nxPrem .nxp-tbl .th{font-weight:800;text-align:center;color:#fff;border-bottom:1px solid rgba(255,255,255,.14)}#nxPrem .nxp-tbl .th small{display:block;font-weight:600;color:rgba(255,255,255,.5);font-size:10.5px}#nxPrem .nxp-tbl .c{text-align:center}#nxPrem .nxp-tbl .cur{color:#fde08d}#nxPrem .nxp-tbl .no{color:rgba(255,255,255,.25)}' +
    '#nxPrem .nxp-spark{display:flex;align-items:flex-end;gap:5px;height:56px;margin:10px 0 4px}#nxPrem .nxp-spark i{flex:1;background:#fde08d;opacity:.75;border-radius:5px;min-height:4px}' +
    '#nxPrem .nxt-tile{min-height:116px}#nxPrem .nxp-chk{display:flex;align-items:center;gap:10px;padding:9px 0;font-size:13.5px;color:rgba(255,255,255,.85)}#nxPrem .nxp-chk input{width:18px;height:18px;accent-color:#fde08d}';
  function injectCss() { if ($('nxpCss')) return; var s = document.createElement('style'); s.id = 'nxpCss'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- backend ---------- */
  async function api(path, method, body) {
    var u = await window._authReadyPromise; if (!u) throw Object.assign(new Error('login'), { status: 401 });
    var t = await u.getIdToken();
    var r = await fetch(BACKEND + path, { method: method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: body ? JSON.stringify(body) : undefined });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) { var e = new Error(j.error || 'failed'); e.status = r.status; e.data = j; throw e; }
    return j;
  }
  var ERR = { login: 'Please log in first.', limit_reached: 'You have used all of this month\'s uses of this feature.', plan_required: 'This feature is part of Nexus Health+ Plus.', ai_unavailable: 'The AI is busy right now. Please try again in a moment.', could_not_read_meal: 'We could not read that photo. Try a clearer photo of the food.', image_too_large: 'That photo is too large.', bad_image: 'Please choose a photo (JPG, PNG or WebP).', trial_used: 'Your free trial was already used.', missing_name: 'Please enter a name.' };
  var errMsg = function (e) { return ERR[e.message] || 'Something went wrong. Please try again.'; };

  /* ---------- shell ---------- */
  var SHELL = '<div id="nxPrem" class="nx-modal hidden" role="dialog" aria-modal="true"><div class="nx-modal-inner"><header class="nxh-bar"><button type="button" class="back-trigger" aria-label="Back" onclick="nxPremium.back()"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 4L7 12l10 8"/></svg></button><div class="header-left-dock"><div class="header-details"><div class="group-title-row"><span class="group-title" id="nxpTitle">Nexus Health+</span></div><div class="group-subtitle" id="nxpSub"></div></div></div></header><div id="nxpBody"></div></div></div>';
  function ensureUI() {
    var pc = $('page-content'); if (!pc) return; injectCss();
    if (!$('nxPrem')) pc.insertAdjacentHTML('beforeend', SHELL);
    var anchor = document.querySelector('.nxt-tile[onclick*="openTriage"]') || document.querySelector('.nxt-tile');
    if (anchor && !document.querySelector('[data-nx-prem]')) anchor.insertAdjacentHTML('beforebegin', '<button type="button" class="nxt-card nxt-tile" data-nx-prem="1" style="grid-column:1/-1" onclick="nxPremium.open()"><span class="nxt-well"><i class="fa-solid fa-gem" style="color:#fde08d"></i></span><span class="nxt-tt"><b>Nexus Health+</b><span class="nxt-ts">Nutrition, Meal Scan, AI Coach, insights &amp; more</span></span></button>');
  }

  /* ---------- helpers ---------- */
  var can = function (f) { return !!(S.st && S.st.features && S.st.features[f]); };
  var planName = function (p) { return p === 'plus' ? 'Plus' : p === 'premium' ? 'Premium' : 'Free'; };
  function trialBtn() { return S.st && S.st.trialAvailable ? '<button class="nxp-btn pri" id="nxpTrial" onclick="nxPremium.trial()">Try Plus free for ' + S.st.trialDays + ' days</button>' : ''; }
  function lockPanel(title, text) {
    return '<div class="nxp-card"><span class="nxp-pill">Plus</span><h3 class="nxp-h" style="margin-top:10px">' + esc(title) + ' is part of Plus</h3><p class="nxp-p">' + esc(text) + '</p>' + trialBtn() + '<button class="nxp-btn" onclick="nxPremium.go(\'plans\')">Compare plans</button></div>';
  }
  function ring(pct, big, small) {
    var r = 36, c = 2 * Math.PI * r, o = c * (1 - Math.max(0, Math.min(1, pct)));
    return '<div style="position:relative;width:96px;height:96px;flex:none"><svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="' + r + '" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="9"/><circle cx="48" cy="48" r="' + r + '" fill="none" stroke="#fde08d" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + o.toFixed(1) + '" transform="rotate(-90 48 48)"/></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><b style="font-size:17px;color:#fff">' + big + '</b><span style="font-size:10px;color:rgba(255,255,255,.5)">' + small + '</span></div></div>';
  }

  /* ---------- views ---------- */
  var TITLES = { hub: 'Nexus Health+', plans: 'Compare plans', nutrition: 'Nutrition', coach: 'AI Coach', insights: 'Health insights', report: 'Doctor report', women: 'Women\'s health', programs: 'Programs' };
  function render() {
    var t = TITLES[S.view] || 'Nexus Health+'; if (S.view === 'programs' && S.prog) t = S.prog.title;
    $('nxpTitle').textContent = t;
    $('nxpSub').textContent = S.st ? planName(S.st.plan) + (S.st.status === 'trialing' ? ' · trial' : '') : '';
    var body = $('nxpBody');
    if (!S.st) { body.innerHTML = S.err ? '<div class="nxp-card"><p class="nxp-p">Could not load Nexus Health+ (' + esc(S.err) + ').</p><button class="nxp-btn pri" onclick="nxPremium.open()">Try again</button></div>' : '<p class="nxp-sub">Loading…</p>'; return; }
    ({ hub: hub, plans: plans, nutrition: nutrition, coach: coach, insights: insights, report: report, women: women, programs: programs }[S.view] || hub)(body);
  }

  /* ----- Hub ----- */
  function hub(b) {
    var st = S.st, h = '', until = st.renewsAt ? new Date(st.renewsAt).toLocaleDateString() : null;
    h += '<div class="nxp-card"><div style="display:flex;justify-content:space-between;align-items:center"><span class="nxp-h">Your plan: ' + planName(st.plan) + '</span><span class="nxp-pill">' + (st.status === 'trialing' ? 'Free trial' : st.plan === 'free' ? 'Free' : 'Active') + '</span></div>';
    if (st.status === 'trialing') h += '<p class="nxp-p" style="margin-top:8px">Everything in Plus is unlocked for you until <b style="color:#fff">' + esc(until) + '</b>. After that you go back to Free automatically. Nothing is charged.</p>';
    else if (st.plan === 'free' && st.status === 'expired') h += '<p class="nxp-p" style="margin-top:8px">Your trial has ended, so you are on Free. Subscriptions are opening soon.</p>';
    else if (st.plan === 'free') h += '<p class="nxp-p" style="margin-top:8px">Free gives you medication reminders, backup, emergency info, the doctor directory, meal logging and a few AI uses. Plus unlocks the rest. Try it free for ' + st.trialDays + ' days, no payment needed.</p>';
    else h += '<p class="nxp-p" style="margin-top:8px">' + (until ? 'Access until ' + esc(until) + '.' : 'No end date.') + '</p>';
    h += trialBtn() + '<button class="nxp-btn" onclick="nxPremium.go(\'plans\')">Compare Free, Plus &amp; Premium</button></div>';
    var T = [['nutrition', 'fa-utensils', 'Nutrition', 'Log meals free · Scan a meal with AI', null], ['coach', 'fa-comments', 'AI Coach', 'Ask about meals, sleep and routines', null], ['insights', 'fa-chart-line', 'Health insights', 'Blood pressure, sleep, weight trends', 'insights'], ['report', 'fa-file-medical', 'Doctor report', 'One page to show your doctor', 'report'], ['women', 'fa-venus', 'Women\'s health', 'Cycle and symptoms', 'cycle'], ['programs', 'fa-seedling', 'Programs', '7-day guided programs', 'programs']];
    h += '<div class="nxt-grid">' + T.map(function (t) { return '<button type="button" class="nxt-card nxt-tile" onclick="nxPremium.go(\'' + t[0] + '\')"><span class="nxt-well"><i class="fa-solid ' + t[1] + '"></i></span><span class="nxt-tt"><b>' + t[2] + '</b><span class="nxt-ts">' + t[3] + '</span>' + (t[4] && !can(t[4]) ? '<span class="nxp-lk">PLUS</span>' : '') + '</span></button>'; }).join('') + '</div>';
    h += '<p class="nxp-warn">Your health records stay on this device. Wellness tools give general guidance, not a diagnosis.</p>';
    b.innerHTML = h;
  }

  /* ----- Compare plans ----- */
  function plans(b) {
    var st = S.st, pf = st.planFeatures || {}, pc = st.planCaps || {}, pr = st.prices || {}, order = ['free', 'plus', 'premium'];
    var cell = function (v, plan) { var cls = 'c' + (plan === st.plan ? ' cur' : ''); if (v === true) return '<div class="' + cls + '">✓</div>'; if (v === false) return '<div class="c no">–</div>'; return '<div class="' + cls + '">' + esc(v) + '</div>'; };
    var rows = [
      ['Meal logging &amp; calories', function (p) { return pf[p] && pf[p].logging; }],
      ['Meal Scan (AI photo)', function (p) { return pc[p] ? pc[p].mealScan + '/mo' : ''; }],
      ['Macros &amp; goals', function (p) { return pf[p] && pf[p].macros; }],
      ['Fasting timer', function (p) { return pf[p] && pf[p].fasting; }],
      ['AI Coach', function (p) { return pc[p] ? pc[p].coach + '/mo' : ''; }],
      ['Health insights', function (p) { return pf[p] && pf[p].insights; }],
      ['Doctor report', function (p) { return pf[p] && pf[p].report; }],
      ['Cycle tracker', function (p) { return pf[p] && pf[p].cycle; }],
      ['Programs', function (p) { return pf[p] && pf[p].programs; }],
      ['Medical photo AI', function (p) { return pf[p] && pf[p].photoAI; }],
      ['No ads', function (p) { return pf[p] && pf[p].noAds; }]
    ];
    var h = '<div class="nxp-card"><div class="nxp-tbl"><div></div>' + order.map(function (p) { return '<div class="th' + (p === st.plan ? ' cur' : '') + '">' + planName(p) + '<small>' + (pr[p] ? money(pr[p].month) + '/mo' : 'Free') + '</small></div>'; }).join('');
    rows.forEach(function (r) { h += '<div>' + r[0] + '</div>' + order.map(function (p) { return cell(r[1](p), p); }).join(''); });
    h += '</div></div>';
    h += '<div class="nxp-card"><p class="nxp-p">Free is always yours: medication reminders, backup, emergency info and the doctor directory. Yearly is cheaper: Plus ' + (pr.plus ? money(pr.plus.year) : '') + ' and Premium ' + (pr.premium ? money(pr.premium.year) : '') + ' a year.</p>' + trialBtn() + (st.paymentsEnabled ? '' : '<p class="nxp-warn">Payments are not switched on yet, so nobody is charged.</p>') + '</div>';
    b.innerHTML = h;
  }

  /* ----- Nutrition ----- */
  async function loadDay() { try { S.day = await api('/premium/nutrition/day?date=' + today()); } catch (e) { S.day = { entries: [], totals: { kcal: 0 }, goals: {}, macrosLocked: true, err: 1 }; } }
  function nutrition(b) {
    var st = S.st, d = S.day; if (!d) { b.innerHTML = '<p class="nxp-sub">Loading…</p>'; loadDay().then(function () { if (S.view === 'nutrition') render(); }); return; }
    var f = st.features, t = d.totals || {}, g = d.goals || {}, kc = Math.round(t.kcal || 0), h = '';
    h += '<div class="nxp-card"><div style="display:flex;gap:16px;align-items:center">' + ring(g.kcal ? kc / g.kcal : 0, kc, 'kcal today') + '<div style="flex:1;min-width:0">' + (g.kcal ? '<div class="nxp-sub">Daily goal</div><div class="nxp-big" style="font-size:22px">' + g.kcal + '</div>' : '<div class="nxp-sub">Set a daily goal below to fill the ring.</div>') + '</div></div>';
    if (f.macros) h += '<div style="margin-top:8px"><div class="nxp-row"><span class="nxp-k">Protein</span><span>' + Math.round(t.protein || 0) + (g.protein ? ' / ' + g.protein : '') + ' g</span></div><div class="nxp-row"><span class="nxp-k">Carbs</span><span>' + Math.round(t.carbs || 0) + (g.carbs ? ' / ' + g.carbs : '') + ' g</span></div><div class="nxp-row"><span class="nxp-k">Fat</span><span>' + Math.round(t.fat || 0) + (g.fat ? ' / ' + g.fat : '') + ' g</span></div></div>';
    else h += '<div class="nxp-row" style="margin-top:6px"><span class="nxp-k">Protein, carbs &amp; fat</span><span class="nxp-lk">PLUS</span></div>';
    h += '</div>';
    var left = Math.max(0, st.caps.mealScan - st.usage.mealScan);
    h += '<input id="nxpFile" type="file" accept="image/*" capture="environment" style="display:none" onchange="nxPremium.pick(this)"><button class="nxp-btn pri" style="height:48px" onclick="document.getElementById(\'nxpFile\').click()"' + (S.busy ? ' disabled' : '') + '><i class="fa-solid fa-camera"></i> ' + (S.busy ? 'Reading your meal…' : 'Scan a meal') + ' · ' + left + ' left this month</button>';
    if (S.scan) h += scanCard(S.scan);
    h += '<div class="nxp-card" style="margin-top:12px"><div class="nxp-sub" style="margin-bottom:8px">Add manually</div><input id="nxpName" class="nx-field" placeholder="Food or drink" maxlength="80"><div class="nxp-g2" style="margin-top:8px"><input id="nxpKcal" class="nx-field" type="number" inputmode="decimal" placeholder="kcal">' + (f.macros ? '<input id="nxpPro" class="nx-field" type="number" inputmode="decimal" placeholder="Protein g">' : '<span></span>') + '</div>' + (f.macros ? '<div class="nxp-g2" style="margin-top:8px"><input id="nxpCarb" class="nx-field" type="number" inputmode="decimal" placeholder="Carbs g"><input id="nxpFat" class="nx-field" type="number" inputmode="decimal" placeholder="Fat g"></div>' : '') + '<button class="nxp-btn" onclick="nxPremium.addManual()">Add</button></div>';
    if (d.entries.length) h += '<div class="nxp-card"><div class="nxp-sub" style="margin-bottom:4px">Today</div>' + d.entries.map(function (e) { return '<div class="nxp-row"><span>' + esc(e.name) + (e.source === 'scan' ? ' <span class="nxp-k">· scan</span>' : '') + '</span><span>' + Math.round(e.kcal) + ' kcal <button type="button" class="nxp-k" style="background:none;border:0;margin-left:8px;font-size:12px;text-decoration:underline" onclick="nxPremium.del(\'' + esc(e.id) + '\')">remove</button></span></div>'; }).join('') + '</div>';
    h += '<div class="nxp-card"><div class="nxp-sub" style="margin-bottom:8px">Daily goal</div><div class="nxp-g2"><input id="nxpGk" class="nx-field" type="number" inputmode="numeric" placeholder="kcal" value="' + esc(g.kcal || '') + '">' + (f.macros ? '<input id="nxpGp" class="nx-field" type="number" inputmode="numeric" placeholder="Protein g" value="' + esc(g.protein || '') + '">' : '<span class="nxp-lk" style="align-self:center">MACRO GOALS · PLUS</span>') + '</div>' + (f.macros ? '<div class="nxp-g2" style="margin-top:8px"><input id="nxpGc" class="nx-field" type="number" inputmode="numeric" placeholder="Carbs g" value="' + esc(g.carbs || '') + '"><input id="nxpGf" class="nx-field" type="number" inputmode="numeric" placeholder="Fat g" value="' + esc(g.fat || '') + '"></div>' : '') + '<button class="nxp-btn" onclick="nxPremium.saveGoals()">Save goal</button></div>';
    h += fastCard(f);
    h += '<p class="nxp-warn">Calories and nutrients from photos are estimates, not exact measurements. Not medical advice.</p>';
    b.innerHTML = h;
  }
  function scanCard(sc) {
    return '<div class="nxp-card" style="margin-top:12px"><div style="display:flex;justify-content:space-between"><b style="color:#fff">We found</b><span class="nxp-pill">' + esc(sc.confidence) + ' confidence</span></div>' +
      sc.items.map(function (i) { return '<div class="nxp-row"><span>' + esc(i.name) + ' <span class="nxp-k">~' + Math.round(i.grams) + ' g</span></span><span>' + Math.round(i.kcal) + ' kcal</span></div>'; }).join('') +
      '<div class="nxp-row"><b>Total (estimate)</b><b>' + Math.round(sc.total.kcal) + ' kcal</b></div>' + (sc.notes ? '<div class="nxp-sub">' + esc(sc.notes) + '</div>' : '') +
      (sc.items.length ? '<button class="nxp-btn pri" onclick="nxPremium.saveScan()">Add to today</button>' : '') + '<button class="nxp-btn" onclick="nxPremium.dropScan()">Discard</button></div>';
  }
  function fastCard(f) {
    if (!f.fasting) return '<div class="nxp-card"><div class="nxp-row" style="border:0"><span>Intermittent fasting timer</span><span class="nxp-lk">PLUS</span></div></div>';
    var x = S.fast;
    if (!x) { api('/premium/fasting').then(function (r) { S.fast = r; if (S.view === 'nutrition') render(); }).catch(function () { S.fast = { fast: null }; }); return '<div class="nxp-card"><div class="nxp-sub">Loading fasting…</div></div>'; }
    if (x.fast) { var left = Math.max(0, x.fast.endsAt - Date.now()), hh = Math.floor(left / 3600000), mm = Math.floor(left % 3600000 / 60000); return '<div class="nxp-card"><b style="color:#fff">Fasting ' + x.fast.hours + ' h</b><div class="nxp-big" style="margin-top:6px">' + (left ? hh + 'h ' + mm + 'm left' : 'Done!') + '</div><div class="nxp-bar"><i style="width:' + Math.min(100, Math.round((1 - left / (x.fast.hours * 3600000)) * 100)) + '%"></i></div><button class="nxp-btn" onclick="nxPremium.fastStop()">End fast</button></div>'; }
    return '<div class="nxp-card"><b style="color:#fff">Intermittent fasting</b><div class="nxp-g2" style="margin-top:10px">' + [12, 14, 16, 18].map(function (n) { return '<button class="nxp-btn" style="margin:0" onclick="nxPremium.fastStart(' + n + ')">' + n + ' hours</button>'; }).join('') + '</div></div>';
  }

  /* ----- Coach ----- */
  function coach(b) {
    var st = S.st, cap = st.caps.coach, used = st.usage.coach, h = '';
    h += '<div class="nxp-card"><div class="nxp-sub">AI usage this month</div><div class="nxp-bar"><i style="width:' + Math.min(100, Math.round(used / Math.max(1, cap) * 100)) + '%"></i></div><div class="nxp-row" style="border:0;padding-bottom:0"><span>' + used + ' of ' + cap + ' messages</span>' + (st.plan === 'premium' ? '' : '<span class="nxp-lk">MORE WITH A PLAN</span>') + '</div></div>';
    h += '<div id="nxpChat">' + (S.chat.length ? S.chat.map(function (m) { return '<div class="nxp-bub ' + (m.role === 'user' ? 'nxp-u' : 'nxp-a') + '">' + esc(m.content) + '</div>'; }).join('') : '<p class="nxp-sub">Ask about meals, routines, sleep habits or motivation. For symptoms, use the Health assistant.</p>') + (S.busy ? '<div class="nxp-bub nxp-a">…</div>' : '') + '</div>';
    h += '<div class="nxp-in"><input id="nxpMsg" class="nx-field" maxlength="800" placeholder="Message your coach" onkeydown="if(event.key===\'Enter\')nxPremium.send()"><button class="nxp-btn pri" onclick="nxPremium.send()"' + (S.busy ? ' disabled' : '') + '>Send</button></div>';
    h += '<p class="nxp-warn">General wellness guidance, not a diagnosis. In an emergency call your local emergency number.</p>';
    b.innerHTML = h;
  }

  /* ----- Insights (vitals are on the device) ----- */
  var BPRE = /(\d{2,3})\s*[\/\\-]\s*(\d{2,3})/;
  function vitalsIn(days) { var since = Date.now() - days * 86400000; return (lget('nexusVitals', []) || []).filter(function (v) { return v && new Date(v.date).getTime() >= since; }); }
  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }
  function metric(title, vals, unit, dec) {
    if (!vals.length) return '';
    var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), last = vals[vals.length - 1], rng = (mx - mn) || 1;
    var f = function (n) { return dec ? n.toFixed(dec) : Math.round(n); };
    return '<div class="nxp-card"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="color:#fff">' + title + '</b><span class="nxp-sub">' + vals.length + ' entr' + (vals.length === 1 ? 'y' : 'ies') + '</span></div><div class="nxp-spark">' + vals.slice(-12).map(function (v) { return '<i style="height:' + (mx === mn ? 60 : 25 + Math.round((v - mn) / rng * 75)) + '%"></i>'; }).join('') + '</div><div class="nxp-row" style="border:0;padding:4px 0 0"><span class="nxp-k">Latest ' + f(last) + ' ' + unit + '</span><span class="nxp-k">Average ' + f(avg(vals)) + ' ' + unit + '</span></div></div>';
  }
  function insights(b) {
    if (!can('insights')) { b.innerHTML = lockPanel('Health insights', 'See trends in your blood pressure, heart rate, glucose, sleep, steps and weight, plus your nutrition, in one place.'); return; }
    var days = S.range, vs = vitalsIn(days), h = '';
    h += '<div class="nxp-seg"><button class="' + (days === 7 ? 'on' : '') + '" onclick="nxPremium.range(7)">7 days</button><button class="' + (days === 30 ? 'on' : '') + '" onclick="nxPremium.range(30)">30 days</button></div>';
    var bp = vs.map(function (v) { var m = BPRE.exec(String(v.bp || '')); return m ? { s: +m[1], d: +m[2] } : null; }).filter(Boolean);
    if (bp.length) { var sys = bp.map(function (x) { return x.s; }), dia = bp.map(function (x) { return x.d; }); h += metric('Blood pressure (top number)', sys, 'mmHg', 0).replace('Average ' + Math.round(avg(sys)) + ' mmHg', 'Average ' + Math.round(avg(sys)) + '/' + Math.round(avg(dia)) + ' mmHg').replace('Latest ' + Math.round(sys[sys.length - 1]) + ' mmHg', 'Latest ' + bp[bp.length - 1].s + '/' + bp[bp.length - 1].d); }
    var num = function (k) { return vs.map(function (v) { return parseFloat(v[k]); }).filter(function (n) { return isFinite(n) && n > 0; }); };
    h += metric('Heart rate', num('hr'), 'bpm') + metric('Glucose', num('glucose'), 'mg/dL') + metric('Sleep', num('sleep'), 'h', 1) + metric('Steps', num('steps'), '') + metric('Weight', num('weight'), 'kg', 1);
    if (!vs.length) h += '<div class="nxp-card"><p class="nxp-p">No vitals in the last ' + days + ' days. Log them in Health, then Vitals, and your trends will appear here.</p></div>';
    var meds = lget('nexusMeds', []) || [], dow = new Date().getDay(), taken = (lget('nexusMedTaken', {}) || {}), tIds = taken.d === ymd() ? (taken.ids || []) : [];
    var due = meds.filter(function (m) { var dd = Array.isArray(m.days) && m.days.length ? m.days : (m.freq === 'Weekly' ? [new Date(m.id).getDay()] : null); return !dd || dd.indexOf(dow) >= 0; });
    if (meds.length) h += '<div class="nxp-card"><b style="color:#fff">Medicines today</b><div class="nxp-big" style="margin-top:6px">' + due.filter(function (m) { return tIds.indexOf(m.id) >= 0 || tIds.indexOf(String(m.id)) >= 0; }).length + ' of ' + due.length + '</div><div class="nxp-sub">marked as taken</div></div>';
    h += '<div id="nxpNutIns">' + (S.ins && S.ins.range === days ? nutIns(S.ins) : '<p class="nxp-sub">Loading nutrition…</p>') + '</div>';
    if (!S.ins || S.ins.range !== days) api('/premium/insights?days=' + days).then(function (r) { r.range = days; S.ins = r; var e = $('nxpNutIns'); if (e && S.view === 'insights' && S.range === days) e.innerHTML = nutIns(r); }).catch(function () { var e = $('nxpNutIns'); if (e) e.innerHTML = ''; });
    h += '<button class="nxp-btn pri" onclick="nxPremium.go(\'report\')"><i class="fa-solid fa-file-medical"></i> Make a doctor report</button><p class="nxp-warn">Trends are for your information. Talk to a clinician about readings that worry you.</p>';
    b.innerHTML = h;
  }
  function nutIns(r) {
    var mx = Math.max.apply(null, r.days.map(function (d) { return d.kcal; }).concat([1]));
    return '<div class="nxp-card"><b style="color:#fff">Nutrition</b><div class="nxp-spark">' + r.days.slice(-30).map(function (d) { return '<i style="height:' + Math.max(6, Math.round(d.kcal / mx * 100)) + '%;opacity:' + (d.logged ? .8 : .15) + '"></i>'; }).join('') + '</div><div class="nxp-sub">' + (r.daysLogged ? 'On days you logged: ' + r.average.kcal + ' kcal · ' + r.average.protein + ' g protein on average' : 'Log meals to see your trend.') + '</div></div>';
  }

  /* ----- Doctor report (built on the device, printed / saved as PDF) ----- */
  function report(b) {
    if (!can('report')) { b.innerHTML = lockPanel('The doctor report', 'Create a one-page summary of your medicines, vitals and medical ID that you can show or send to your doctor.'); return; }
    var pf = (lget('nexusProfiles', []) || []), aid = (function () { try { return localStorage.getItem('nexusActiveProfile') || 'self'; } catch (e) { return 'self'; } })(), me = pf.filter(function (p) { return p.id === aid; })[0] || {};
    var chk = function (k, label) { return '<label class="nxp-chk"><input type="checkbox" ' + (S.rep[k] ? 'checked' : '') + ' onchange="nxPremium.rep(\'' + k + '\',this.checked)">' + label + '</label>'; };
    b.innerHTML = '<div class="nxp-card"><p class="nxp-p">Choose what to include. The report is made on your phone and nothing is uploaded.</p><div style="margin-top:8px">' + chk('meds', 'My medicines') + chk('vitals', 'Vitals from the last 30 days') + chk('mid', 'Medical ID (blood type, allergies, conditions)') + chk('food', 'Nutrition summary (last 7 days)') + '</div><input id="nxpRepName" class="nx-field" style="margin-top:6px" maxlength="60" placeholder="Name on the report" value="' + esc(me.name || '') + '"><button class="nxp-btn pri" onclick="nxPremium.makeReport()"><i class="fa-solid fa-print"></i> Create report</button><p class="nxp-warn">On the print screen choose "Save as PDF" to keep or share it.</p></div>';
  }
  async function makeReport() {
    var name = (($('nxpRepName') || {}).value || '').trim(), rows = '', R = S.rep;
    var sec = function (t, inner) { return '<h2>' + esc(t) + '</h2>' + inner; };
    if (R.meds) { var ms = lget('nexusMeds', []) || []; rows += sec('Medicines', ms.length ? '<table>' + ms.map(function (m) { var tms = (Array.isArray(m.times) && m.times.length ? m.times : [m.time]).join(', '); var dd = Array.isArray(m.days) && m.days.length ? ' · ' + m.days.map(function (x) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x]; }).join(', ') : ''; return '<tr><td>' + esc(m.name) + '</td><td>' + esc(m.freq) + dd + ' · ' + esc(tms) + '</td></tr>'; }).join('') + '</table>' : '<p>None recorded.</p>'); }
    if (R.vitals) { var vs = vitalsIn(30); rows += sec('Vitals (last 30 days)', vs.length ? '<table><tr><th>Date</th><th>BP</th><th>HR</th><th>Glucose</th><th>Sleep</th><th>Steps</th><th>Weight</th></tr>' + vs.map(function (v) { return '<tr><td>' + esc(new Date(v.date).toLocaleDateString()) + '</td><td>' + esc(v.bp || '–') + '</td><td>' + esc(v.hr || '–') + '</td><td>' + esc(v.glucose || '–') + '</td><td>' + esc(v.sleep || '–') + '</td><td>' + esc(v.steps || '–') + '</td><td>' + esc(v.weight || '–') + '</td></tr>'; }).join('') + '</table>' : '<p>No vitals recorded.</p>'); }
    if (R.mid) { var id = lget('nexusMedicalId_' + (localStorage.getItem('nexusActiveProfile') || 'self'), {}) || {}; rows += sec('Medical ID', '<table><tr><td>Blood type</td><td>' + esc(id.bloodType || '–') + '</td></tr><tr><td>Allergies</td><td>' + esc(id.allergies || '–') + '</td></tr><tr><td>Conditions</td><td>' + esc(id.conditions || '–') + '</td></tr></table>'); }
    if (R.food) { try { var r = await api('/premium/insights?days=7'); rows += sec('Nutrition (last 7 days)', r.daysLogged ? '<p>Average on logged days: ' + r.average.kcal + ' kcal, ' + r.average.protein + ' g protein, ' + r.average.carbs + ' g carbs, ' + r.average.fat + ' g fat. Estimates.</p>' : '<p>No meals logged.</p>'); } catch (e) { toast(errMsg(e)); } }
    var doc = '<!doctype html><html><head><meta charset="utf-8"><title>Health summary</title><style>body{font-family:Arial,sans-serif;color:#111;padding:24px;font-size:13px}h1{font-size:20px;margin:0 0 2px}h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:5px 7px;text-align:left;vertical-align:top}small{color:#666}</style></head><body><h1>Health summary' + (name ? ' · ' + esc(name) : '') + '</h1><small>Created ' + esc(new Date().toLocaleDateString()) + ' with Nexus Health. Self-reported information, not a medical record.</small>' + rows + '</body></html>';
    var fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.appendChild(fr);
    fr.contentDocument.open(); fr.contentDocument.write(doc); fr.contentDocument.close();
    setTimeout(function () { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { toast('Could not open the print screen.'); } setTimeout(function () { if (fr.parentNode) fr.parentNode.removeChild(fr); }, 60000); }, 300);
  }

  /* ----- Women's health (cycle data stays on the device) ----- */
  var SYMS = ['Cramps', 'Headache', 'Bloating', 'Mood swings', 'Fatigue', 'Acne', 'Tender breasts', 'Nausea', 'Back pain', 'Good energy'];
  function cyc() { var c = lget('nexusCycle', null); if (!c || typeof c !== 'object') c = { starts: [], logs: {} }; c.starts = (c.starts || []).filter(function (s) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }).sort(); c.logs = c.logs || {}; return c; }
  function cycLen(c) { var d = []; for (var i = Math.max(1, c.starts.length - 6); i < c.starts.length; i++) { var n = diffDays(c.starts[i - 1], c.starts[i]); if (n >= 18 && n <= 60) d.push(n); } return d.length ? Math.round(avg(d)) : 28; }
  function women(b) {
    if (!can('cycle')) { b.innerHTML = lockPanel('The cycle tracker', 'Log your periods, get an estimate of your next period and fertile window, and see your symptom patterns. It all stays on your phone.') + preg(); return; }
    var c = cyc(), t = today(), h = '';
    if (!c.starts.length) h += '<div class="nxp-card"><h3 class="nxp-h">Start tracking</h3><p class="nxp-p">When did your last period start?</p><input id="nxpCycDate" class="nx-field" type="date" max="' + t + '" value="' + t + '" style="margin-top:10px"><button class="nxp-btn pri" onclick="nxPremium.cycAdd(document.getElementById(\'nxpCycDate\').value)">Save</button></div>';
    else {
      var last = c.starts[c.starts.length - 1], L = cycLen(c), day = diffDays(last, t) + 1, next = addDays(last, L), ov = addDays(next, -14);
      h += '<div class="nxp-card"><div style="display:flex;gap:16px;align-items:center">' + ring(Math.min(1, day / L), 'Day ' + day, 'of ~' + L) + '<div style="flex:1;min-width:0"><div class="nxp-sub">Next period (estimate)</div><div class="nxp-big" style="font-size:22px">' + nice(next) + '</div><div class="nxp-sub" style="margin-top:6px">Fertile window (estimate): ' + nice(addDays(ov, -5)) + ' to ' + nice(addDays(ov, 1)) + '</div></div></div><p class="nxp-warn">These are estimates from your own entries. They are not a safe way to prevent or plan a pregnancy.</p></div>';
      h += '<div class="nxp-card"><button class="nxp-btn pri" style="margin-top:0" onclick="nxPremium.cycAdd(\'' + t + '\')">My period started today</button><div class="nxp-g2" style="margin-top:10px"><input id="nxpCycDate" class="nx-field" type="date" max="' + t + '"><button class="nxp-btn" style="margin:0" onclick="nxPremium.cycAdd(document.getElementById(\'nxpCycDate\').value)">Add past date</button></div><div class="nxp-sub" style="margin-top:10px">Logged periods: ' + c.starts.slice(-6).map(nice).join(', ') + ' · <button type="button" style="background:none;border:0;color:#fde08d;font-size:12px;text-decoration:underline" onclick="nxPremium.cycUndo()">remove the last</button></div></div>';
    }
    var todayTags = c.logs[t] || [];
    h += '<div class="nxp-card"><b style="color:#fff">How do you feel today?</b><div class="nxp-chips">' + SYMS.map(function (s) { return '<button type="button" class="nxp-chip' + (todayTags.indexOf(s) >= 0 ? ' on' : '') + '" onclick="nxPremium.sym(\'' + s + '\')">' + s + '</button>'; }).join('') + '</div></div>';
    var cnt = {}, since = addDays(t, -90); Object.keys(c.logs).forEach(function (d) { if (d >= since) (c.logs[d] || []).forEach(function (s) { cnt[s] = (cnt[s] || 0) + 1; }); });
    var top = Object.keys(cnt).sort(function (a, z) { return cnt[z] - cnt[a]; }).slice(0, 4);
    if (top.length) h += '<div class="nxp-card"><b style="color:#fff">Your patterns (last 90 days)</b>' + top.map(function (s) { return '<div class="nxp-row"><span>' + esc(s) + '</span><span class="nxp-k">' + cnt[s] + ' day' + (cnt[s] === 1 ? '' : 's') + '</span></div>'; }).join('') + '</div>';
    h += preg() + '<p class="nxp-warn">Your cycle data stays on this device. If your periods change suddenly, are very painful or very heavy, speak with a clinician.</p>';
    b.innerHTML = h;
  }
  function preg() { return '<div class="nxp-card"><b style="color:#fff">Pregnancy</b><p class="nxp-p" style="margin-top:4px">Antenatal visit reminders, vaccines and danger-sign checks are in Mother &amp; Child. They are always free.</p><button class="nxp-btn" onclick="nxPremium.close();if(window.nxCare&&nxCare.openMch)nxCare.openMch()">Open Mother &amp; Child</button></div>'; }

  /* ----- Programs (7-day guided; progress stays on the device) ----- */
  var PROGS = [
    { id: 'sleep', icon: 'fa-moon', title: 'Better sleep', sub: 'Seven small habits for steadier nights', days: [
      ['A steady wake-up time', 'Pick a wake-up time you can keep every day, even on weekends. A regular wake time is one of the strongest cues for your body clock.', 'Set an alarm for tomorrow at the time you want to wake every day.'],
      ['Morning light', 'Daylight in the first hour after waking helps set your body clock, which makes it easier to feel sleepy at night.', 'Spend 10 minutes outside or next to a bright window this morning.'],
      ['Mind the caffeine', 'Caffeine can stay in your body for many hours. Many people sleep better if they stop caffeine by early afternoon.', 'Choose a caffeine cut-off time, for example 2 pm, and keep to it today.'],
      ['Wind down', 'Your body needs a signal that the day is ending. Calm activities like a warm shower or light reading help.', 'Dim the lights and put screens away 30 minutes before bed.'],
      ['A better bedroom', 'A cool, dark and quiet room supports sleep. Cover bright lights and reduce noise where you can.', 'Make one change to your bedroom tonight.'],
      ['A busy mind', 'If thoughts keep you awake, try writing tomorrow\'s to-do list earlier in the evening, or slow breathing: in for 4, out for 6.', 'Do two minutes of slow breathing in bed.'],
      ['Review', 'Look back at the week. Which habit helped most? Keep that one. If you have trouble sleeping for several weeks or feel very sleepy in the day, speak with a doctor.', 'Choose two habits to keep.']] },
    { id: 'eat', icon: 'fa-bowl-food', title: 'Eat well', sub: 'Simple changes to everyday meals', days: [
      ['Build a balanced plate', 'A simple plate: about half vegetables or fruit, a quarter protein, and a quarter whole grains or starchy foods.', 'Build one meal today in this way.'],
      ['Protein at breakfast', 'Protein such as eggs, beans, fish or yoghurt can keep you full for longer in the morning.', 'Add a protein food to your breakfast.'],
      ['Water first', 'Plain water is a good everyday drink. Keeping a bottle near you makes it easier to drink.', 'Swap one sugary drink for water today.'],
      ['Add fibre', 'Beans, lentils, vegetables, fruit and whole grains give you fibre, which helps you feel full and supports digestion.', 'Add one fibre-rich food to a meal.'],
      ['Slow down', 'Eating slowly and without screens helps you notice when you are full.', 'Eat one meal today without your phone.'],
      ['Plan ahead', 'Deciding tomorrow\'s meals tonight helps you avoid rushed choices.', 'Write down tomorrow\'s three meals.'],
      ['Review', 'Which change was easiest? Keep it. If you have a medical condition such as diabetes, or take regular medicines, ask your clinician or a dietitian before making big changes to your diet.', 'Choose two changes to keep.']] },
    { id: 'calm', icon: 'fa-spa', title: 'Stress & mindfulness', sub: 'Short daily practices for a calmer mind', days: [
      ['Slow breathing', 'Slow breaths with a longer out-breath can help your body settle. Breathe in for 4 counts and out for 6.', 'Do two minutes of slow breathing now.'],
      ['Name the feeling', 'Putting a feeling into words can make it easier to handle.', 'Write one sentence about how you feel right now.'],
      ['Body scan', 'Notice each part of your body in turn, from your feet up to your head, without trying to change anything.', 'Spend three minutes on a body scan.'],
      ['Mindful walk', 'Walking while paying attention to what you see, hear and feel brings you into the present.', 'Walk for 10 minutes and notice five things around you.'],
      ['Less scrolling', 'Constant news and scrolling can keep your mind on alert.', 'Take a 30-minute break from news and social media.'],
      ['Reach out', 'Talking to someone you trust can lighten a load.', 'Message or call someone you trust today.'],
      ['Review', 'Which practice helped most? Keep it in your day. If stress or low mood lasts for weeks or affects daily life, please talk to a health professional.', 'Choose one practice to repeat daily.']] },
    { id: 'move', icon: 'fa-person-walking', title: 'Move more', sub: 'Build a simple activity habit', days: [
      ['Where you are now', 'Knowing your starting point makes progress easier to see.', 'Note roughly how much you moved today.'],
      ['A 10-minute walk', 'A short walk counts. Ten minutes a day is a good start.', 'Take a 10-minute walk.'],
      ['Stretch', 'Gentle stretching can help you feel looser.', 'Stretch for five minutes.'],
      ['Little bursts', 'Short bursts of activity through the day add up: stairs, a brisk walk, carrying shopping.', 'Add three short bursts of movement today.'],
      ['Strength basics', 'Simple bodyweight moves such as sit-to-stands or wall push-ups help keep muscles strong.', 'Do two rounds of 8 sit-to-stands and 8 wall push-ups.'],
      ['Move with someone', 'Moving with a friend makes it easier to keep going.', 'Invite someone for a walk.'],
      ['Review', 'Choose the activity you enjoyed most and give it a regular time. If you have a heart condition, pain, or have been inactive for a long time, check with a clinician before increasing activity.', 'Set a weekly activity goal.']] }
  ];
  var pstate = function () { return lget('nexusPrograms', {}) || {}; };
  function programs(b) {
    if (!can('programs')) { b.innerHTML = lockPanel('Programs', 'Guided 7-day programs for sleep, eating, stress and movement, with one short lesson and one small action a day.') + '<div class="nxp-card"><p class="nxp-sub" style="margin-bottom:6px">Programs in Plus</p>' + PROGS.map(function (p) { return '<div class="nxp-row"><span>' + p.title + '</span><span class="nxp-k">7 days</span></div>'; }).join('') + '</div>'; return; }
    var ps = pstate();
    if (S.prog && S.lesson != null) {
      var P = S.prog, i = S.lesson, d = P.days[i], done = (ps[P.id] && ps[P.id].done) || [], isDone = done.indexOf(i) >= 0;
      b.innerHTML = '<div class="nxp-card"><span class="nxp-pill">Day ' + (i + 1) + ' of 7</span><h3 class="nxp-h" style="margin-top:10px">' + esc(d[0]) + '</h3><p class="nxp-p">' + esc(d[1]) + '</p><div class="nxp-card" style="margin:14px 0 0;box-shadow:inset 3px 3px 7px #000,inset -2px -2px 6px #1b1b1b"><div class="nxp-sub">Today\'s action</div><p class="nxp-p" style="color:#fff;margin-top:4px">' + esc(d[2]) + '</p></div>' + (isDone ? '<button class="nxp-btn" onclick="nxPremium.lessonDone(' + i + ',false)">Done · tap to undo</button>' : '<button class="nxp-btn pri" onclick="nxPremium.lessonDone(' + i + ',true)">Mark day ' + (i + 1) + ' as done</button>') + '</div><p class="nxp-warn">General wellness information, not medical advice.</p>';
      return;
    }
    if (S.prog) {
      var P2 = S.prog, dn = (ps[P2.id] && ps[P2.id].done) || [];
      b.innerHTML = '<div class="nxp-card"><div class="nxp-sub">' + dn.length + ' of 7 days done</div><div class="nxp-bar"><i style="width:' + Math.round(dn.length / 7 * 100) + '%"></i></div></div><div class="nxp-card">' + P2.days.map(function (d, i) { return '<button type="button" class="nxp-row" style="width:100%;background:none;border:0;text-align:left;cursor:pointer;font-family:inherit" onclick="nxPremium.lesson(' + i + ')"><span>Day ' + (i + 1) + ' · ' + esc(d[0]) + '</span><span class="nxp-lk">' + (dn.indexOf(i) >= 0 ? 'DONE' : '') + '</span></button>'; }).join('') + '</div>';
      return;
    }
    b.innerHTML = PROGS.map(function (p) { var dn = (ps[p.id] && ps[p.id].done) || []; return '<button type="button" class="nxt-card nxp-card" style="display:block;width:100%;text-align:left;border:0" onclick="nxPremium.prog(\'' + p.id + '\')"><div style="display:flex;gap:14px;align-items:center"><span class="nxt-well"><i class="fa-solid ' + p.icon + '"></i></span><span style="flex:1;min-width:0"><b style="display:block;color:#fff;font-size:15px">' + p.title + '</b><span class="nxp-sub">' + p.sub + '</span></span></div><div class="nxp-bar"><i style="width:' + Math.round(dn.length / 7 * 100) + '%"></i></div><div class="nxp-sub" style="margin-top:6px">' + dn.length + ' of 7 days</div></button>'; }).join('');
  }

  /* ---------- image helper ---------- */
  function shrink(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () { var m = 1024, r = Math.min(1, m / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.8)); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('bad_image')); }; img.src = url;
    });
  }

  /* ---------- actions ---------- */
  async function refresh() { S.err = null; try { S.st = await api('/premium/status'); } catch (e) { if (e.status === 401) toast(ERR.login); S.err = e.status ? ('error ' + e.status) : 'no connection'; } render(); }
  function view(v) { S.view = v; S.prog = null; S.lesson = null; if (v === 'nutrition') { S.day = null; S.fast = null; } if (v === 'insights') S.ins = null; render(); var m = document.querySelector('#nxPrem .nx-modal-inner'); if (m) m.scrollTop = 0; }
  window.nxPremium = {
    open: async function () { ensureUI(); $('nxPrem').classList.remove('hidden'); document.body.style.overflow = 'hidden'; S.view = 'hub'; S.prog = null; S.lesson = null; render(); await refresh(); },
    close: function () { var m = $('nxPrem'); if (m) m.classList.add('hidden'); document.body.style.overflow = 'auto'; },
    back: function () { if (S.view === 'programs' && S.lesson != null) { S.lesson = null; render(); } else if (S.view === 'programs' && S.prog) { S.prog = null; render(); } else if (S.view === 'report') view('insights'); else if (S.view !== 'hub') view('hub'); else nxPremium.close(); },
    go: view,
    trial: async function () { var b = $('nxpTrial'); if (b) b.disabled = true; try { await api('/premium/trial', 'POST', {}); toast('Your free trial has started.'); S.day = null; await refresh(); } catch (e) { toast(errMsg(e)); if (b) b.disabled = false; } },
    pick: async function (inp) {
      var f = inp.files && inp.files[0]; inp.value = ''; if (!f || S.busy) return; S.busy = true; S.scan = null; render();
      try { var img = await shrink(f); var r = await api('/premium/meal-scan', 'POST', { image: img }); S.scan = r; if (!r.items.length) toast('No food found in that photo.'); }
      catch (e) { toast(errMsg(e)); }
      S.busy = false; await refresh();
    },
    dropScan: function () { S.scan = null; render(); },
    saveScan: async function () {
      var sc = S.scan; if (!sc) return;
      try { for (var i = 0; i < sc.items.length; i++) { var x = sc.items[i]; await api('/premium/nutrition/log', 'POST', { date: today(), name: x.name, kcal: x.kcal, protein: x.protein, carbs: x.carbs, fat: x.fat, source: 'scan' }); } S.scan = null; S.day = null; S.ins = null; toast('Added to today.'); render(); }
      catch (e) { toast(errMsg(e)); }
    },
    addManual: async function () {
      var v = function (id) { var e = $(id); return e ? e.value : ''; };
      try { await api('/premium/nutrition/log', 'POST', { date: today(), name: v('nxpName'), kcal: v('nxpKcal'), protein: v('nxpPro'), carbs: v('nxpCarb'), fat: v('nxpFat'), source: 'manual' }); S.day = null; S.ins = null; render(); }
      catch (e) { toast(errMsg(e)); }
    },
    del: async function (id) { try { await api('/premium/nutrition/log/' + today() + '/' + encodeURIComponent(id), 'DELETE'); S.day = null; S.ins = null; render(); } catch (e) { toast(errMsg(e)); } },
    saveGoals: async function () {
      var v = function (id) { var e = $(id); return e ? e.value : ''; };
      try { await api('/premium/nutrition/goals', 'POST', { kcal: v('nxpGk'), protein: v('nxpGp'), carbs: v('nxpGc'), fat: v('nxpGf') }); S.day = null; toast('Goal saved.'); render(); }
      catch (e) { toast(errMsg(e)); }
    },
    fastStart: async function (h) { try { var r = await api('/premium/fasting/start', 'POST', { hours: h }); S.fast = r; render(); } catch (e) { toast(errMsg(e)); } },
    fastStop: async function () { try { await api('/premium/fasting/stop', 'POST', {}); S.fast = { fast: null }; render(); } catch (e) { toast(errMsg(e)); } },
    send: async function () {
      var i = $('nxpMsg'), m = i && i.value.trim(); if (!m || S.busy) return; i.value = ''; S.chat.push({ role: 'user', content: m }); S.busy = true; render();
      try {
        var r = await api('/premium/coach', 'POST', { message: m, history: S.chat.slice(0, -1).slice(-8) });
        S.chat.push({ role: 'assistant', content: r.reply }); if (r.usage) S.st.usage.coach = r.usage.used;
      } catch (e) { S.chat.push({ role: 'assistant', content: e.message === 'limit_reached' ? 'You have used all of this month\'s coach messages.' : errMsg(e) }); }
      S.busy = false; render();
    },
    range: function (n) { S.range = n; render(); },
    rep: function (k, v) { S.rep[k] = !!v; },
    makeReport: makeReport,
    cycAdd: function (d) { if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '') || d > today()) { toast('Choose a date that is not in the future.'); return; } var c = cyc(); if (c.starts.some(function (s) { return Math.abs(diffDays(s, d)) < 10; })) { toast('A period is already logged around that date.'); return; } c.starts.push(d); c.starts.sort(); lset('nexusCycle', c); render(); },
    cycUndo: function () { var c = cyc(); c.starts.pop(); lset('nexusCycle', c); render(); },
    sym: function (s) { var c = cyc(), t = today(), a = c.logs[t] || [], i = a.indexOf(s); if (i >= 0) a.splice(i, 1); else a.push(s); c.logs[t] = a; if (!a.length) delete c.logs[t]; lset('nexusCycle', c); render(); },
    prog: function (id) { S.prog = PROGS.filter(function (p) { return p.id === id; })[0] || null; S.lesson = null; render(); },
    lesson: function (i) { S.lesson = i; render(); },
    lessonDone: function (i, on) { var ps = pstate(), id = S.prog.id; ps[id] = ps[id] || { done: [] }; var a = ps[id].done, k = a.indexOf(i); if (on && k < 0) a.push(i); if (!on && k >= 0) a.splice(k, 1); lset('nexusPrograms', ps); S.lesson = null; render(); toast(on ? 'Well done!' : 'Updated.'); }
  };

  ensureUI();
  try { new MutationObserver(function () { if ($('page-content') && !$('nxPrem')) ensureUI(); else if ($('page-content') && !document.querySelector('[data-nx-prem]')) ensureUI(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();
