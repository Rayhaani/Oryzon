/* ============================================================
   health-telehealth.js — per-visit telehealth (load AFTER health-upgrade.js)
   • doctors set their own fee, visit length and "accepting requests" in the Doctor Desk
   • patients see the doctor's fee on the card and in the booking summary (USD)
   • patients can cancel a request that has not happened yet
   Nobody is charged in this version: the fee is shown and recorded on the request so prices are clear today and the history is clean
   the day payments open. Requests go to /telehealth/* on the backend (nexus-telehealth-routes.js).
   ============================================================ */
(function () {
  'use strict';
  if (window.__nxTele) return; window.__nxTele = 1;
  var BACKEND = 'https://oryzon-backend-ed1q.onrender.com';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toast = function (m) { try { window.showToast(m); } catch (e) {} };
  var fmt = function (n) { n = Number(n) || 0; return n > 0 ? '$' + n.toFixed(2).replace(/\.00$/, '') : 'Free'; };

  async function api(path, body) {
    var u = await window._authReadyPromise; if (!u) throw new Error('login');
    var t = await u.getIdToken();
    var r = await fetch(BACKEND + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body || {}) });
    var j = await r.json().catch(function () { return {}; }); if (!r.ok) { var e = new Error(j.error || 'failed'); e.status = r.status; throw e; } return j;
  }
  var ERR = { login: 'Please log in first.', bad_fee: 'Enter a fee between 0 and 500.', bad_duration: 'Choose a visit length.', not_a_doctor: 'Only verified doctors can change these settings.', cannot_cancel: 'This request can no longer be cancelled.', already_past: 'That time has passed.' };
  var errText = function (e) { return ERR[e.message] || 'Something went wrong. Please try again.'; };
  var realDoc = function (d) { return d && d.sample === false; };
  var currentDoc = function () { try { return NEXA_DOCTORS.find(function (x) { return x.id === nexaBooking.doctorId; }); } catch (e) { return null; } };

  /* ----- doctor card: show the doctor's own fee instead of the sample "£" price ----- */
  var _card = window.renderDoctorCard;
  if (typeof _card === 'function') window.renderDoctorCard = function (doc) {
    var h = _card.apply(this, arguments);
    if (realDoc(doc)) h = h.replace(/£\d+(\.\d+)*/, function () { return fmt(doc.price); });   // function form: a "$" in the replacement text must stay literal
    return h;
  };

  /* ----- booking summary (step 3): show the fee and say plainly that nothing is charged yet ----- */
  var _s3 = window.renderNexaStep3;
  if (typeof _s3 === 'function') window.renderNexaStep3 = function () {
    var h = _s3.apply(this, arguments), d = currentDoc();
    if (realDoc(d)) {
      var fee = Number(d.price) || 0;
      if (fee > 0) h = h.replace('No payment is taken in this version.', 'You are not charged now. The doctor’s fee is shown so you know the price before you ask.');
      var row = '<div class="nexa-summary-row"><div class="label">Fee</div><div class="value">' + esc(fmt(fee)) + ' per visit' + (d.duration ? ' · ' + esc(d.duration) + ' min' : '') + '</div></div><p class="text-[12px] text-gray-500 mb-4">';
      h = h.replace('<p class="text-[12px] text-gray-500 mb-4">', function () { return row; });
    }
    return h;
  };

  /* ----- patient: cancel ----- */
  window.nxCancelConsult = async function (id) {
    if (!window.confirm('Cancel this consultation request?')) return;
    try { await api('/telehealth/cancel', { id: id }); toast('Request cancelled.'); if (typeof window.openTelehealth === 'function') window.openTelehealth(); }
    catch (e) { toast(errText(e)); }
  };

  /* ----- doctor: settings card at the top of the Doctor Desk ----- */
  async function paintSettings() {
    var inner = document.querySelector('#nxDocDeskModal .nx-modal-inner'), list = $('nxDeskList'); if (!inner || !list) return;
    if (!$('nxTeleSet')) {
      list.insertAdjacentHTML('beforebegin', '<div class="nexa-panel" id="nxTeleSet"><div class="nexa-panel-title" style="font-size:14px;">My consultation settings</div><div class="nexa-panel-sub">Patients see your fee before they send a request. They are not charged yet; online payment opens later.</div>' +
        '<label class="text-[12px] text-gray-500 uppercase">Fee per visit (USD, 0 = free)</label><input id="nxTeleFee" class="nx-field" type="number" inputmode="decimal" min="0" max="500" step="0.5" placeholder="0">' +
        '<label class="text-[12px] text-gray-500 uppercase">Visit length</label><select id="nxTeleDur" class="nx-field"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select>' +
        '<label class="nx-list-item" style="cursor:pointer"><span class="text-[13px]">I am taking new requests</span><input type="checkbox" id="nxTeleAcc" checked></label>' +
        '<button type="button" id="nxTeleSave" class="btn-nexus w-full mt-2" onclick="nxTeleSave()">Save settings</button></div>');
    }
    try {
      var u = await window._authReadyPromise; if (!u) return;
      var s = await firebase.firestore().collection('doctors').doc(u.uid).get(); if (!s.exists) return; var x = s.data();
      $('nxTeleFee').value = x.price > 0 ? x.price : ''; $('nxTeleDur').value = String(x.duration || 30); $('nxTeleAcc').checked = x.accepting !== false;
    } catch (e) {}
  }
  window.nxTeleSave = async function () {
    var b = $('nxTeleSave'); if (b) b.disabled = true;
    try {
      var r = await api('/telehealth/doctor/settings', { fee: Number($('nxTeleFee').value || 0), duration: Number($('nxTeleDur').value), accepting: $('nxTeleAcc').checked });
      toast('Saved. Your fee is ' + fmt(r.price) + '.');
    } catch (e) { toast(errText(e)); }
    if (b) b.disabled = false;
  };
  var _desk = window.nxOpenDesk;
  if (typeof _desk === 'function') window.nxOpenDesk = function () { var r = _desk.apply(this, arguments); paintSettings(); return r; };
})();
