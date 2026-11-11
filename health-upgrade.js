/* ============================================================
   health-upgrade.js  — additive layer on top of health.js
   (load AFTER health.js). Nothing here edits health.js logic;
   it wraps / extends it. Idempotent: safe on SPA revisits.
   ============================================================ */
(function () {
  'use strict';
  if (window.__nxHealthUp) return; window.__nxHealthUp = 1;

  var $ = function (id) { return document.getElementById(id); };
  var lsGet = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toast = function (m) { try { window.showToast(m); } catch (e) {} };

  /* ───────────── 1. EMERGENCY NUMBERS (national numbers; "112" fallback) ───────────── */
  // [country name, ambulance/general, police, fire]  — from public national listings (written from knowledge, NOT live-checked): re-verify before launch. Always shown with a "may change" notice.
  var EMG = {
    NG: ['Nigeria', '112', '112', '112'], GH: ['Ghana', '112', '112', '112'], KE: ['Kenya', '999', '999', '999'],
    ZA: ['South Africa', '10177', '10111', '10177'], EG: ['Egypt', '123', '122', '180'], TZ: ['Tanzania', '112', '112', '112'],
    UG: ['Uganda', '999', '999', '999'], ET: ['Ethiopia', '907', '991', '939'], CM: ['Cameroon', '112', '117', '118'],
    SN: ['Senegal', '1515', '17', '18'], US: ['United States', '911', '911', '911'], CA: ['Canada', '911', '911', '911'],
    GB: ['United Kingdom', '999', '999', '999'], IE: ['Ireland', '112', '112', '112'], DE: ['Germany', '112', '110', '112'],
    FR: ['France', '15', '17', '18'], ES: ['Spain', '112', '112', '112'], IT: ['Italy', '112', '112', '112'],
    PT: ['Portugal', '112', '112', '112'], NL: ['Netherlands', '112', '112', '112'], TR: ['Türkiye', '112', '155', '110'],
    SA: ['Saudi Arabia', '997', '999', '998'], AE: ['United Arab Emirates', '998', '999', '997'], IN: ['India', '112', '112', '112'],
    PK: ['Pakistan', '1122', '15', '16'], BD: ['Bangladesh', '999', '999', '999'], ID: ['Indonesia', '112', '110', '113'],
    PH: ['Philippines', '911', '911', '911'], CN: ['China', '120', '110', '119'], JP: ['Japan', '119', '110', '119'],
    AU: ['Australia', '000', '000', '000'], NZ: ['New Zealand', '111', '111', '111'], BR: ['Brazil', '192', '190', '193'],
    MX: ['Mexico', '911', '911', '911']
  };
  var EMG_ORDER = Object.keys(EMG).sort(function (a, b) { return EMG[a][0] < EMG[b][0] ? -1 : 1; });
  function guessCountry() {
    var saved = lsGet('nexusCountry', ''); if (saved && EMG[saved]) return saved;
    var l = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    var m = /[-_]([A-Za-z]{2})$/.exec(l); var cc = m ? m[1].toUpperCase() : '';
    return EMG[cc] ? cc : '';
  }

  /* i18n for the safety-critical strings (everything else stays English) */
  var LANGS = { en: 'English', ha: 'Hausa', yo: 'Yorùbá', ig: 'Igbo', fr: 'Français', ar: 'العربية', sw: 'Kiswahili', es: 'Español', pt: 'Português' };
  var T = {
    en: { call: 'Call', amb: 'Ambulance / medical', pol: 'Police', fire: 'Fire', pick: 'Choose your country to see the right numbers', fallback: 'Call 112 (works on most mobile networks) or your local emergency number.' },
    ha: { call: 'Kira', amb: 'Motar asibiti / lafiya', pol: 'Ƴan sanda', fire: 'Kashe gobara', pick: 'Zaɓi ƙasarka don ganin lambobin da suka dace', fallback: 'Kira 112 (yana aiki a mafi yawan hanyoyin sadarwa) ko lambar gaggawa ta yankinka.' },
    fr: { call: 'Appeler', amb: 'Ambulance / urgences médicales', pol: 'Police', fire: 'Pompiers', pick: 'Choisissez votre pays pour voir les bons numéros', fallback: 'Appelez le 112 (fonctionne sur la plupart des réseaux mobiles) ou votre numéro d’urgence local.' }
  };
  var tr = function (k) { var l = lsGet('nexusLang', 'en'); return (T[l] && T[l][k]) || T.en[k]; };

  window.nxEmgRender = function () {
    var sel = $('nxEmgCountry'), body = $('nxEmgBody'); if (!sel || !body) return;
    var cc = sel.value; if (cc) lsSet('nexusCountry', cc);
    if (!cc || !EMG[cc]) {
      body.innerHTML = '<p class="text-[12px] text-gray-300 mb-3">' + esc(tr('pick')) + '</p><a class="nx-emg-big" href="tel:112"><i class="fa-solid fa-phone"></i><span>' + esc(tr('call')) + ' 112</span></a><p class="text-[10px] text-gray-500 mt-2">' + esc(tr('fallback')) + '</p>';
      return;
    }
    var e = EMG[cc];
    var row = function (label, num, big) { return '<a class="' + (big ? 'nx-emg-big' : 'nx-emg-row') + '" href="tel:' + esc(num) + '"><i class="fa-solid fa-phone"></i><span>' + esc(label) + '</span><b>' + esc(num) + '</b></a>'; };
    var h = row(tr('call') + ' · ' + tr('amb'), e[1], true);
    if (e[2] !== e[1]) h += row(tr('pol'), e[2]); if (e[3] !== e[1] && e[3] !== e[2]) h += row(tr('fire'), e[3]);
    body.innerHTML = h;
  };
  window.nxOpenEmergency = function () {
    var sel = $('nxEmgCountry'); if (!sel) return;
    if (!sel.options.length) sel.innerHTML = '<option value="">—</option>' + EMG_ORDER.map(function (k) { return '<option value="' + k + '">' + esc(EMG[k][0]) + '</option>'; }).join('');
    sel.value = guessCountry(); nxEmgRender();
    $('nxEmgModal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
  };
  window.nxCloseEmergency = function () { var m = $('nxEmgModal'); if (m) m.classList.add('hidden'); document.body.style.overflow = 'auto'; };

  /* SOS button → emergency sheet first (AI chat stays one tap away) */
  var _open = window.openAiTriage;
  if (typeof _open === 'function') window.openAiTriage = function (ctx) {
    if (ctx === 'EMERGENCY TRAUMA') return nxOpenEmergency();
    if (ctx === 'EMERGENCY TRAUMA_AI') ctx = 'EMERGENCY TRAUMA';
    return _open.apply(this, arguments.length ? [ctx] : []);
  };

  /* ───────────── 2. RED FLAGS: more conditions, more languages ───────────── */
  try {
    var F = window.AI_RED_FLAGS || (typeof AI_RED_FLAGS !== 'undefined' ? AI_RED_FLAGS : null);
    if (F && !F.__nx) {
      F.__nx = 1;
      F.push(
        { match: ['ciwon kirji', 'douleur thoracique', 'douleur à la poitrine', 'dolor de pecho', 'ألم في الصدر', 'irora àyà'], msg: 'Chest pain can be a sign of a heart attack. Call emergency services now.' },
        { match: ['wahalar numfashi', 'ba zan iya numfashi', "can't catch my breath", 'difficulté à respirer', 'dificultad para respirar', 'ضيق في التنفس'], msg: 'Difficulty breathing is an emergency. Call emergency services now.' },
        { match: ['face drooping', 'face is drooping', 'slurred speech', 'sudden weakness', 'one side of my body', 'sudden numbness', 'worst headache', 'sudden confusion'], msg: 'These can be signs of a stroke. Every minute matters: call emergency services now.' },
        { match: ['swollen tongue', 'swelling of the face', 'throat closing', 'throat is closing', 'anaphylaxis'], msg: 'A severe allergic reaction can be life-threatening. Call emergency services now; use an adrenaline auto-injector if you have one.' },
        { match: ['seizure', 'convulsion'], msg: 'A seizure that lasts more than 5 minutes, or repeats, is an emergency. Call emergency services.' },
        { match: ['suma', 'ya suma', 'unresponsive', 'inconscient'], msg: 'A person who cannot be woken needs emergency care immediately.' },
        { match: ['zubar jini mai yawa', 'saignement abondant', 'sangrado abundante', 'coughing blood', 'vomiting blood', 'blood in vomit'], msg: 'Heavy bleeding or coughing/vomiting blood needs emergency care now.' },
        { match: ['baby has a fever', 'newborn fever', 'infant fever', 'baby not feeding', 'baby is limp'], msg: 'In a newborn or young baby, fever or poor feeding can be serious. See a doctor or hospital today, now if the baby is limp or very sleepy.' },
        { match: ['swallowed poison', 'overdose', 'took too many', 'poisoned'], msg: 'Possible poisoning or overdose is an emergency. Call emergency services or your local poison centre now.' },
        { match: ['kill myself', 'want to die', 'end my life', 'suicide', 'suicidal', 'hurt myself', 'kashe kaina', 'me suicider', 'quitarme la vida'], msg: 'You matter and help is available. Please call your local emergency number now or contact a helpline (findahelpline.com). If you can, tell someone near you.', crisis: true }
      );
    }
  } catch (e) {}

  /* ───────────── 3. LANGUAGE for Nexus Intelligence ───────────── */
  function fillLang(sel) { if (!sel) return; var cur = lsGet('nexusLang', 'en'); sel.innerHTML = Object.keys(LANGS).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + LANGS[k] + '</option>'; }).join(''); }
  window.nxSetLang = function (l) {
    if (!LANGS[l]) l = 'en'; lsSet('nexusLang', l);
    try { window.aiLang = l; } catch (e) {}
    try { aiLang = l; } catch (e) {}                 // health.js keeps it as a top-level `let`
    ['nxLang', 'nxLangPriv'].forEach(function (id) { var s = $(id); if (s) s.value = l; });
    var o = $('aiTriageOverlay'); if (o) o.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    toast(LANGS[l]);
  };
  function initLang() { fillLang($('nxLang')); fillLang($('nxLangPriv')); var l = lsGet('nexusLang', 'en'); try { aiLang = l; } catch (e) {} var o = $('aiTriageOverlay'); if (o) o.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr'); }

  /* ───────────── 4. HONEST DOCTOR DIRECTORY / BOOKING (no fake payment, no fake reviews) ───────────── */
  try {
    if (typeof NEXA_DOCTORS !== 'undefined') NEXA_DOCTORS.forEach(function (d) { d.sample = true; d.verified = false; d.rating = 0; d.reviews = 0; });
  } catch (e) {}
  var _card = window.renderDoctorCard;
  if (typeof _card === 'function') window.renderDoctorCard = function () {
    var h = _card.apply(this, arguments);
    h = h.replace('Book Consultation', 'Request consultation')
         .replace(/<div><div class="text-\[9px\] text-gray-500 uppercase">From<\/div>[\s\S]*?<\/div><\/div>/, '<div><span class="nx-sample-tag"><i class="fa-solid fa-flask"></i> Sample profile</span></div>');
    return h;
  };
  var _s3 = window.renderNexaStep3;
  if (typeof _s3 === 'function') window.renderNexaStep3 = function () {
    var h = _s3.apply(this, arguments);
    return h.replace(/Your doctor and time are locked in[^<]*/, 'Doctors are not live yet. This saves a consultation request on this device only. No payment is taken and no doctor is booked.')
            .replace(/Pay [^<]*? and confirm booking/, 'Save request (no payment)')
            .replace('<div>Total</div>', '<div>Estimated price (sample)</div>');
  };
  window.confirmNexaBooking = function () {
    var doc = NEXA_DOCTORS.find(function (d) { return d.id === nexaBooking.doctorId; });
    var ct = NEXA_CONSULT_TYPES.find(function (c) { return c.id === nexaBooking.consultTypeId; });
    var slot = new Date(nexaBooking.date), t = String(nexaBooking.time).split(':').map(Number); slot.setHours(t[0], t[1], 0, 0);
    var a = getAppointments(); a.push({ doctor: doc.name, spec: doc.specialty, mode: ct.label, time: slot.toISOString(), notes: nexaBooking.notes, status: 'request' });
    localStorage.setItem('nexusAppointments', JSON.stringify(a));
    closeDoctorBookingWizard(); renderAppointments();
    toast('Request saved on this device. Doctors are not live yet; nothing was paid.');
  };
  var _ra = window.renderAppointments;
  if (typeof _ra === 'function') window.renderAppointments = function () {
    _ra.apply(this, arguments);
    var w = $('appointmentList'); if (!w) return;
    w.innerHTML = w.innerHTML.replace(/fa-circle-check text-cyan-400/g, 'fa-hourglass-half text-yellow-300').replace(/(<div class="text-\[9px\] text-gray-500">)([^<]*)/g, '$1Request · $2');
  };

  /* ───────────── 5. COMMUNITY: no invented member counts ───────────── */
  var _rc = window.renderCommunityGroups;
  if (typeof _rc === 'function') window.renderCommunityGroups = function () {
    _rc.apply(this, arguments);
    var w = $('communityGroups'); if (!w) return;
    w.innerHTML = w.innerHTML.replace(/<div class="text-\[9px\] text-gray-500">[^<]*members<\/div>/g, '<div class="text-[9px] text-gray-500">Moderated groups opening soon</div>')
      .replace(/>Join<\/button>/g, '>Notify me</button>').replace(/Joined<\/span>/g, 'On the list</span>');
  };
  window.joinCommunity = function (name) {
    var j = getJoinedGroups(); if (j.indexOf(name) < 0) j.push(name);
    localStorage.setItem('nexusCommunities', JSON.stringify(j)); renderCommunityGroups();
    toast('Saved on this device. Groups are not open yet.');
  };

  /* ───────────── 6. PRIVACY & DATA: export / delete ───────────── */
  window.nxOpenPrivacy = function () { initLang(); var s = $('nxPrivStatus'); if (s) s.textContent = ''; $('nxPrivacyModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; };
  window.nxClosePrivacy = function () { var m = $('nxPrivacyModal'); if (m) m.classList.add('hidden'); document.body.style.overflow = 'auto'; };
  var say = function (m) { var s = $('nxPrivStatus'); if (s) s.textContent = m; };
  function localKeys() { var k = []; try { for (var i = 0; i < localStorage.length; i++) { var n = localStorage.key(i); if (/^nexus(?!_user_session)/i.test(n) || /^nuRadar$/.test(n)) k.push(n); } } catch (e) {} return k; }
  window.nxExportData = async function () {
    var out = { exportedAt: new Date().toISOString(), device: {}, account: {} };
    localKeys().forEach(function (k) { try { out.device[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { out.device[k] = localStorage.getItem(k); } });
    try {
      var u = await window._authReadyPromise;
      if (u) { var s = await firebase.database().ref('users/' + u.uid + '/aiChatHistory').once('value'); out.account.aiChatHistory = s.val() || {}; }
    } catch (e) { out.account.error = 'Could not read account chat history'; }
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nexus-health-data.json';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    say('Your data was exported.');
  };
  window.nxDeleteChats = async function () {
    if (!confirm('Delete all your Nexus Intelligence chats from your account? This cannot be undone.')) return;
    try {
      var u = await window._authReadyPromise; if (!u) { say('Please log in first.'); return; }
      await firebase.database().ref('users/' + u.uid + '/aiChatHistory').remove();
      var log = $('aiChatLog'); if (log) log.innerHTML = ''; try { aiConversationHistory = []; } catch (e) {}
      say('AI chat history deleted.');
    } catch (e) { say('Could not delete right now. Please try again.'); }
  };
  window.nxDeleteLocal = function () {
    if (!confirm('Delete vitals, medications, records, medical ID, profiles and appointments from this device? This cannot be undone.')) return false;
    localKeys().forEach(function (k) { if (k !== 'nexusLang' && k !== 'nexusCountry') try { localStorage.removeItem(k); } catch (e) {} });
    ['renderMedsList', 'renderVitalsHistory', 'renderRecordsList', 'renderAppointments', 'renderProfilesList'].forEach(function (f) { try { window[f] && window[f](); } catch (e) {} });
    say('Health data on this device was deleted.'); return true;
  };

  /* ───────────── init / SPA lifecycle ───────────── */
  function init() { initLang(); }
  /* SPA revisits swap #page-content (new, empty selects): refill them when they appear */
  try { new MutationObserver(function () { var s = $('nxLang'); if (s && !s.options.length) init(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  init();
})();

/* ============================================================
   PHASE 2 — records in IndexedDB, working reminders, governance
   ============================================================ */
(function () {
  'use strict';
  if (window.__nxHealthUp2) return; window.__nxHealthUp2 = 1;
  var $ = function (id) { return document.getElementById(id); };
  var toast = function (m) { try { window.showToast(m); } catch (e) {} };
  var SAFETY_EMAIL = '';   // ← put a real safety-reporting address here; the button appears automatically

  /* ── governance modal ── */
  window.nxOpenGov = function () {
    var b = $('nxReportBtn'), n = $('nxReportNone');
    if (b && SAFETY_EMAIL) { b.href = 'mailto:' + SAFETY_EMAIL + '?subject=Nexus%20Medical%20City%20safety%20concern'; b.style.display = ''; if (n) n.style.display = 'none'; }
    $('nxGovModal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
  };
  window.nxCloseGov = function () { var m = $('nxGovModal'); if (m) m.classList.add('hidden'); document.body.style.overflow = 'auto'; };

  /* ── health records: IndexedDB (no 4 MB / localStorage-quota limit) ── */
  var DB = 'nexusHealthRecords', ST = 'records', cache = [], ready = null;
  function openDB() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no idb'));
      var q = indexedDB.open(DB, 1);
      q.onupgradeneeded = function () { q.result.createObjectStore(ST, { keyPath: 'id' }); };
      q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); };
    });
  }
  function tx(mode, fn) { return openDB().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction(ST, mode), s = t.objectStore(ST), r = fn(s); t.oncomplete = function () { db.close(); res(r && r.result); }; t.onerror = function () { rej(t.error); }; }); }); }
  function loadAll() {
    return tx('readonly', function (s) { return s.getAll(); }).then(function (all) { cache = (all || []).sort(function (a, b) { return a.id - b.id; }); });
  }
  function migrate() {
    var old = []; try { old = JSON.parse(localStorage.getItem('nexusRecords') || '[]'); } catch (e) {}
    if (!old.length) return Promise.resolve();
    return openDB().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction(ST, 'readwrite'), s = t.objectStore(ST); old.forEach(function (r) { s.put(r); }); t.oncomplete = function () { db.close(); try { localStorage.removeItem('nexusRecords'); } catch (e) {} res(); }; t.onerror = function () { rej(t.error); }; }); });
  }
  function boot() { ready = migrate().then(loadAll).catch(function () { cache = null; }); return ready; }   // cache===null → fall back to health.js (localStorage)
  boot();

  var _get = window.getRecords, _up = window.uploadRecord, _del = window.deleteRecord, _openR = window.openRecords;
  window.getRecords = function () { return cache === null ? _get() : cache.slice(); };
  window.openRecords = function () { (ready || Promise.resolve()).then(function () { _openR(); }); };
  window.uploadRecord = function (input) {
    if (cache === null) return _up(input);
    var f = input.files && input.files[0]; if (!f) return;
    if (f.size > 25 * 1024 * 1024) { toast('File too large — please use a file under 25MB.'); input.value = ''; return; }
    var rd = new FileReader();
    rd.onload = function (e) {
      var rec = { id: Date.now(), name: f.name, type: f.type, data: e.target.result, date: new Date().toISOString() };
      tx('readwrite', function (s) { return s.put(rec); }).then(function () { cache.push(rec); renderRecordsList(); toast('Document saved to your vault (on this device)'); })
        .catch(function () { toast('Could not save. Your device storage may be full.'); });
    };
    rd.readAsDataURL(f); input.value = '';
  };
  window.deleteRecord = function (id) {
    if (cache === null) return _del(id);
    tx('readwrite', function (s) { return s.delete(id); }).then(function () { cache = cache.filter(function (r) { return r.id !== id; }); renderRecordsList(); });
  };
  /* file names are user text: escape them while the list is rendered (health.js builds it with innerHTML) */
  var _rl = window.renderRecordsList, escing = false;
  var _g2 = window.getRecords;
  window.getRecords = function () {
    var a = _g2();
    return escing ? a.map(function (r) { return Object.assign({}, r, { name: String(r.name).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }) }); }) : a;
  };
  window.renderRecordsList = function () { escing = true; try { return _rl.apply(this, arguments); } finally { escing = false; } };
  /* export + wipe must now include the vault */
  var _exp = window.nxExportData, _wipe = window.nxDeleteLocal;
  if (_exp) window.nxExportData = async function () { await (ready || 0); var keep = window.getRecords(); await _exp(); /* records are exported as a second file */
    if (keep.length) { var b = new Blob([JSON.stringify(keep.map(function (r) { return { name: r.name, type: r.type, date: r.date, dataUrl: r.data }; }))], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'nexus-health-records.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); } };
  if (_wipe) window.nxDeleteLocal = function () {
    if (_wipe() === false) return;   // user cancelled
    if (cache !== null) tx('readwrite', function (st) { return st.clear(); }).then(function () { cache = []; try { renderRecordsList(); } catch (e) {} });
  };

  /* ── medication reminders that actually ring (while Nexus is open) ── */
  window.nxEnableNotif = function () {
    if (!('Notification' in window)) { toast('Notifications are not supported on this browser.'); return; }
    Notification.requestPermission().then(function (p) { toast(p === 'granted' ? 'Notifications allowed' : 'Notifications not allowed'); });
  };
  function offsets(freq) { return freq === 'Twice daily' ? [0, 720] : freq === 'Three times daily' ? [0, 480, 960] : [0]; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var meds; try { meds = JSON.parse(localStorage.getItem('nexusMeds') || '[]'); } catch (e) { return; }
    if (!meds.length) return;
    var now = new Date(), day = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()), mins = now.getHours() * 60 + now.getMinutes();
    var fired; try { fired = JSON.parse(localStorage.getItem('nexusMedFired') || '{}'); } catch (e) { fired = {}; }
    Object.keys(fired).forEach(function (k) { if (k.indexOf(day) !== 0) delete fired[k]; });
    meds.forEach(function (m) {
      var p = String(m.time || '').split(':'); if (p.length < 2) return; var base = (+p[0]) * 60 + (+p[1]);
      if (m.freq === 'Weekly' && new Date(m.id).getDay() !== now.getDay()) return;
      offsets(m.freq).forEach(function (off, i) {
        var due = (base + off) % 1440, key = day + '|' + m.id + '|' + i;
        if (!fired[key] && mins >= due && mins - due <= 30) {      // due now (30-min grace if the app was just opened)
          fired[key] = 1; ring(m, pad(Math.floor(due / 60)) + ':' + pad(due % 60));
        }
      });
    });
    try { localStorage.setItem('nexusMedFired', JSON.stringify(fired)); } catch (e) {}
  }
  function ring(m, t) {
    var msg = 'Time to take ' + m.name + ' (' + t + ')';
    toast(msg); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Nexus Medical City', { body: msg, tag: 'med-' + m.id }); } catch (e) {}
  }
  window.__nxMedTick = tick;
  if (!window.__nxMedTimer) window.__nxMedTimer = setInterval(tick, 20000);
  setTimeout(tick, 1500);
  /* the reminders note must not lie after permission is granted */
  var _om = window.openMeds;
  if (_om) window.openMeds = function () { _om.apply(this, arguments); var n = $('nxRemNote'); if (n && 'Notification' in window && Notification.permission === 'granted') n.textContent = 'Reminders ring while Nexus is open in your browser. Notifications are allowed.'; };
})();
