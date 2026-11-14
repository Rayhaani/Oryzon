/* ============================================================
   health-care.js — Phase 3A (additive; load AFTER health-upgrade.js)
   • Offline-first (service worker + offline banner)
   • Offline Symptom Check: structured triage interview (rule-based, WHO-style
     danger signs, no probabilities, no diagnosis). en / fr
   • Mother & Child: pregnancy dates + WHO 8-contact antenatal schedule,
     child immunisation tracker (generic WHO schedule)
   • Health Passport: emergency QR (human-readable) + HL7 FHIR R4 export
   CLINICAL STATUS: rules are conservative drafts, NOT yet clinically reviewed.
   ============================================================ */
(function () {
  'use strict';
  if (window.__nxCare) return; window.__nxCare = 1;

  var $ = function (id) { return document.getElementById(id); };
  var lsGet = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var jget = function (k, d) { try { return JSON.parse(lsGet(k, '')) || d; } catch (e) { return d; } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toast = function (m) { try { window.showToast(m); } catch (e) {} };
  var lang = function () { var l = lsGet('nexusLang', 'en'); return l === 'fr' ? l : 'en'; };
  var pid = function () { try { return getActiveProfileId(); } catch (e) { return 'self'; } };
  var bump = function (k) { var m = jget('nexusImpact', {}); m[k] = (m[k] || 0) + 1; lsSet('nexusImpact', JSON.stringify(m)); };   // local, anonymous counters
  var DAY = 86400000;

  /* ───────────────────────── i18n (safety-critical text only; pending clinical-language review) ───────────────────────── */
  var S = {
    en: { t: 'Offline Symptom Check', sub: 'Works without internet. Not a diagnosis.', who: 'Who is this for?', adult: 'Adult', child: 'Child (2 months – 5 years)', infant: 'Baby under 2 months', preg: 'Pregnant woman', cat: 'Main problem', fever: 'Fever', cough: 'Cough / breathing', gi: 'Diarrhoea / vomiting', head: 'Headache', belly: 'Belly pain', other: 'Something else', ask: 'Tick everything that applies now', go: 'See advice', back: 'Back', again: 'Start again', E: 'EMERGENCY: get care now', U: 'See a doctor or clinic TODAY', O: 'See a health worker within 1–2 days', H: 'Care at home, and watch closely', because: 'Because you reported:', watch: 'Go to hospital immediately if: breathing is hard, a fit happens, the person cannot be woken or cannot drink, pain becomes severe, or things get worse.', call: 'Call emergency services', ai: 'Ask Nexus Intelligence', none: 'No danger signs reported.', disc: 'This tool gives general guidance based on warning signs. It cannot diagnose. If you are worried, seek care.' },
    fr: { t: 'Vérification hors ligne', sub: 'Fonctionne sans internet. Ce n’est pas un diagnostic.', who: 'Pour qui ?', adult: 'Adulte', child: 'Enfant (2 mois – 5 ans)', infant: 'Bébé de moins de 2 mois', preg: 'Femme enceinte', cat: 'Problème principal', fever: 'Fièvre', cough: 'Toux / respiration', gi: 'Diarrhée / vomissements', head: 'Mal de tête', belly: 'Douleur au ventre', other: 'Autre chose', ask: 'Cochez tout ce qui s’applique maintenant', go: 'Voir les conseils', back: 'Retour', again: 'Recommencer', E: 'URGENCE : soins immédiats', U: 'Consultez un médecin ou une clinique AUJOURD’HUI', O: 'Voyez un agent de santé sous 1 à 2 jours', H: 'Soins à domicile, surveillez de près', because: 'Parce que vous avez indiqué :', watch: 'Allez immédiatement à l’hôpital si : respiration difficile, convulsions, impossible de réveiller ou de boire, douleur intense, ou aggravation.', call: 'Appeler les urgences', ai: 'Demander à Nexus Intelligence', none: 'Aucun signe de danger signalé.', disc: 'Cet outil donne des conseils généraux basés sur des signes d’alerte. Il ne peut pas diagnostiquer. En cas de doute, consultez.' }
  };
  var tx = function (k) { return S[lang()][k] || S.en[k]; };

  /* ───────────────────────── triage rules ─────────────────────────
     level: 3 emergency, 2 urgent (today), 1 soon (1–2 days), 0 home.
     who: a=adult c=child i=infant p=pregnant ; cat: '*' = always */
  var Q = [
    ['u1', 3, 'aci p', '*', 'Breathing is hard, very fast, chest pulling in, or lips/face look blue?', 'Respiration difficile, très rapide, creux thoracique, ou lèvres/visage bleutés ?'],
    ['u2', 3, 'aci p', '*', 'A fit/convulsion (body jerking) now or during this illness?', 'Convulsions (secousses du corps) maintenant ou pendant cette maladie ?'],
    ['u3', 3, 'aci p', '*', 'Unconscious, very hard to wake, or suddenly confused?', 'Inconscient, très difficile à réveiller, ou soudainement confus ?'],
    ['u4', 3, 'aci p', '*', 'Heavy bleeding that will not stop?', 'Saignement abondant qui ne s’arrête pas ?'],
    ['u5', 3, 'a p', '*', 'Severe chest pain or pressure?', 'Douleur ou oppression thoracique intense ?'],
    ['u6', 3, 'c i', '*', 'Cannot drink or breastfeed, or vomits everything?', 'Ne peut pas boire/téter, ou vomit tout ?'],
    ['i1', 3, 'i', '*', 'Baby has fever, feels too cold, is very sleepy/limp, or feeds poorly?', 'Bébé a de la fièvre, est trop froid, très somnolent/mou, ou tète mal ?'],
    ['f1', 3, 'aci p', 'fever', 'Stiff neck, or a rash that does not fade when pressed?', 'Raideur de la nuque, ou éruption qui ne disparaît pas à la pression ?'],
    ['f2', 2, 'aci p', 'fever', 'Yellow eyes or very dark urine?', 'Yeux jaunes ou urines très foncées ?'],
    ['f3', 2, 'aci p', 'fever', 'Fever for 3 days or more?', 'Fièvre depuis 3 jours ou plus ?'],
    ['f4', 2, 'a', 'fever', 'Too weak to stand or walk?', 'Trop faible pour se tenir debout ou marcher ?'],
    ['c1', 2, 'ac p', 'cough', 'Coughing up blood?', 'Crache du sang ?'],
    ['c2', 1, 'aci p', 'cough', 'Cough for 2 weeks or more?', 'Toux depuis 2 semaines ou plus ?'],
    ['c3', 3, 'ac p', 'cough', 'Wheezing and cannot speak in full sentences?', 'Respiration sifflante, ne peut pas parler en phrases complètes ?'],
    ['g1', 2, 'aci p', 'gi', 'Blood in stool or vomit?', 'Sang dans les selles ou les vomissements ?'],
    ['g2', 2, 'aci p', 'gi', 'Signs of dehydration: very thirsty, sunken eyes, no urine for 8 hours, drowsy?', 'Signes de déshydratation : très soif, yeux enfoncés, pas d’urine depuis 8 h, somnolent ?'],
    ['g3', 1, 'aci p', 'gi', 'Diarrhoea for 14 days or more?', 'Diarrhée depuis 14 jours ou plus ?'],
    ['g4', 3, 'a c p', 'gi', 'Black stool, or vomiting blood?', 'Selles noires, ou vomit de sang ?'],
    ['h1', 3, 'a p', 'head', 'Sudden, the worst headache of your life?', 'Mal de tête soudain, le pire de votre vie ?'],
    ['h2', 3, 'a p', 'head', 'Headache with weak face/arm/leg, slurred speech or loss of vision?', 'Mal de tête avec faiblesse du visage/bras/jambe, difficulté à parler ou perte de vision ?'],
    ['h3', 2, 'aci p', 'head', 'Headache after a blow to the head?', 'Mal de tête après un coup à la tête ?'],
    ['b1', 2, 'aci p', 'belly', 'Severe, constant belly pain, or a hard belly?', 'Douleur abdominale intense et constante, ou ventre dur ?'],
    ['b3', 2, 'aci p', 'belly', 'Belly pain with repeated vomiting and cannot pass stool or gas?', 'Douleur abdominale avec vomissements répétés, ni selles ni gaz ?'],
    ['p1', 3, 'p', '*', 'Vaginal bleeding?', 'Saignement vaginal ?'],
    ['p2', 2, 'p', '*', 'Water leaking from the vagina?', 'Perte de liquide vaginal ?'],
    ['p3', 2, 'p', '*', 'Baby moving much less than usual (after 28 weeks)?', 'Bébé bouge beaucoup moins (après 28 semaines) ?'],
    ['p4', 3, 'p', '*', 'Severe headache, blurred vision, or sudden swelling of face/hands?', 'Maux de tête sévères, vision floue, ou gonflement soudain du visage/mains ?'],
    ['p5', 2, 'p', '*', 'Fever or severe belly pain while pregnant?', 'Fièvre ou douleur abdominale intense pendant la grossesse ?']
  ].map(function (r) { return { id: r[0], lvl: r[1], who: r[2].split(' ').join(''), cat: r[3], t: { en: r[4], fr: r[5] } }; });
  var DEFAULT = { fever: 1, cough: 0, gi: 0, head: 0, belly: 1, other: 1 };
  var ADVICE = {
    fever: { en: 'If you live in, or travelled to, a malaria area, get a rapid malaria test at a clinic or pharmacy the same day. Drink fluids and rest. Do not take antibiotics without a health worker’s advice.', fr: 'Si vous vivez ou avez voyagé en zone de paludisme, faites un test rapide le jour même. Buvez et reposez-vous. Pas d’antibiotiques sans avis d’un agent de santé.' },
    cough: { en: 'Rest and drink warm fluids. If the cough lasts 2 weeks or more, ask a public clinic about TB testing.', fr: 'Reposez-vous et buvez chaud. Si la toux dure 2 semaines ou plus, demandez un test de tuberculose en clinique publique.' },
    gi: { en: 'Give ORS (oral rehydration salts) in small, frequent sips and keep feeding or breastfeeding. For children, ask a health worker about zinc.', fr: 'Donnez du SRO par petites gorgées fréquentes et continuez l’alimentation/allaitement. Pour un enfant, demandez au sujet du zinc.' },
    head: { en: 'Rest, drink water and avoid bright screens. Seek care if it gets worse or does not improve.', fr: 'Reposez-vous, buvez de l’eau. Consultez si cela s’aggrave ou ne passe pas.' },
    belly: { en: 'Avoid heavy food and take small sips of water. Seek care if the pain gets worse.', fr: 'Évitez les repas lourds, buvez par petites gorgées. Consultez si la douleur augmente.' },
    other: { en: 'Please be checked by a health worker.', fr: 'Faites-vous examiner par un agent de santé.' }
  };
  /* pure engine (exposed for testing) */
  function evaluate(who, cat, yes) {
    var lvl = DEFAULT[cat] || 0, why = [];
    if (who === 'i') lvl = Math.max(lvl, 2);
    if (who === 'p') lvl = Math.max(lvl, 1);
    if (who === 'c' && cat === 'gi') lvl = Math.max(lvl, 1);
    Q.forEach(function (q) { if (yes.indexOf(q.id) > -1 && q.who.indexOf(who) > -1) { why.push(q); lvl = Math.max(lvl, q.lvl); } });
    return { level: lvl, why: why };
  }
  function qsFor(who, cat) { return Q.filter(function (q) { return q.who.indexOf(who) > -1 && (q.cat === '*' || q.cat === cat); }); }

  /* ───────────────────────── Mother & Child engines ───────────────────────── */
  var CONTACT_WEEKS = [12, 20, 26, 30, 34, 36, 38, 40];                  // WHO 2016 ANC model: 8 contacts
  function pregnancy(lmpISO, now) {
    now = now || new Date(); var lmp = new Date(lmpISO + 'T00:00:00'); if (isNaN(lmp)) return null;
    var days = Math.floor((now - lmp) / DAY); if (days < 0 || days > 300) return { invalid: true };
    var edd = new Date(lmp.getTime() + 280 * DAY), wk = Math.floor(days / 7);
    return { weeks: wk, days: days % 7, edd: edd, tri: wk < 14 ? 1 : wk < 28 ? 2 : 3,
      contacts: CONTACT_WEEKS.map(function (w) { var d = new Date(lmp.getTime() + w * 7 * DAY); return { week: w, date: d, past: d < new Date(now.getFullYear(), now.getMonth(), now.getDate()) }; }) };
  }
  var VAX = [  // [id, label, due: {w:weeks} | {m:months}]  — generic WHO routine schedule; national schedules differ
    ['bcg', 'BCG (tuberculosis)', { w: 0 }], ['hepb0', 'Hepatitis B (birth dose)', { w: 0 }], ['opv0', 'Oral polio (birth dose, where recommended)', { w: 0 }],
    ['penta1', 'Pentavalent / DTP-HepB-Hib 1', { w: 6 }], ['opv1', 'Polio 1', { w: 6 }], ['pcv1', 'Pneumococcal (PCV) 1', { w: 6 }], ['rota1', 'Rotavirus 1', { w: 6 }],
    ['penta2', 'Pentavalent 2', { w: 10 }], ['opv2', 'Polio 2', { w: 10 }], ['pcv2', 'Pneumococcal (PCV) 2', { w: 10 }], ['rota2', 'Rotavirus 2', { w: 10 }],
    ['penta3', 'Pentavalent 3', { w: 14 }], ['opv3', 'Polio 3', { w: 14 }], ['pcv3', 'Pneumococcal (PCV) 3', { w: 14 }], ['ipv', 'Inactivated polio (IPV)', { w: 14 }],
    ['mcv1', 'Measles (MCV1)', { m: 9 }], ['yf', 'Yellow fever (in endemic countries)', { m: 9 }], ['mcv2', 'Measles (MCV2)', { m: 15 }]
  ];
  function vaxDue(dobISO, due) { var d = new Date(dobISO + 'T00:00:00'); if (due.w != null) return new Date(d.getTime() + due.w * 7 * DAY); var x = new Date(d); x.setMonth(x.getMonth() + due.m); return x; }
  function vaxStatus(dueDate, given, now) { if (given) return 'given'; var t = new Date(now.getFullYear(), now.getMonth(), now.getDate()), diff = Math.floor((dueDate - t) / DAY); return diff < -14 ? 'overdue' : diff <= 14 ? 'due' : 'upcoming'; }

  /* ───────────────────────── Health Passport (text + FHIR R4) ───────────────────────── */
  function passportData() {
    var id = {}; try { id = getMedicalId(); } catch (e) {}
    var prof = {}; try { prof = getFamilyProfiles().find(function (p) { return p.id === pid(); }) || {}; } catch (e) {}
    var meds = jget('nexusMeds', []), v = jget('nexusVitals', []);
    return { name: prof.name || 'Me', dob: prof.dob || '', bt: id.bloodType || '', allergies: id.allergies || '', conditions: id.conditions || '', ecName: id.emergencyName || '', ecPhone: id.emergencyPhone || '', meds: meds.map(function (m) { return m.name + ' (' + m.freq + ')'; }), vitals: v.length ? v[v.length - 1] : null };
  }
  function passportText(d, inc) {
    var L = ['NEXUS EMERGENCY ID'];
    if (inc.name) L.push('Name: ' + d.name);
    if (inc.bt && d.bt) L.push('Blood group: ' + d.bt);
    if (inc.al && d.allergies) L.push('ALLERGIES: ' + d.allergies);
    if (inc.cd && d.conditions) L.push('Conditions: ' + d.conditions);
    if (inc.md && d.meds.length) L.push('Medicines: ' + d.meds.join('; '));
    if (inc.ec && (d.ecName || d.ecPhone)) L.push('Contact: ' + d.ecName + ' ' + d.ecPhone);
    return L.join('\n');
  }
  function fhir(d, inc) {
    var uid = function () { return 'urn:uuid:' + ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) { return (c ^ (Math.random() * 16 >> c / 4)).toString(16); }); };
    var pRef = uid(), entries = [];
    var patient = { resourceType: 'Patient', name: [{ text: d.name }] }; if (d.dob) patient.birthDate = d.dob;
    if (inc.ec && d.ecPhone) patient.contact = [{ name: { text: d.ecName || 'Emergency contact' }, telecom: [{ system: 'phone', value: d.ecPhone }] }];
    entries.push({ fullUrl: pRef, resource: patient });
    if (inc.bt && d.bt) entries.push({ fullUrl: uid(), resource: { resourceType: 'Observation', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '882-1', display: 'ABO and Rh group [Type] in Blood' }] }, subject: { reference: pRef }, valueString: d.bt } });
    if (inc.al && d.allergies) d.allergies.split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (a) { entries.push({ fullUrl: uid(), resource: { resourceType: 'AllergyIntolerance', patient: { reference: pRef }, code: { text: a } } }); });
    if (inc.cd && d.conditions) d.conditions.split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (c) { entries.push({ fullUrl: uid(), resource: { resourceType: 'Condition', subject: { reference: pRef }, code: { text: c } } }); });
    if (inc.md) d.meds.forEach(function (m) { entries.push({ fullUrl: uid(), resource: { resourceType: 'MedicationStatement', status: 'active', subject: { reference: pRef }, medicationCodeableConcept: { text: m } } }); });
    if (inc.vt && d.vitals) {
      var v = d.vitals, when = v.date, obs = function (code, disp, val, unit, ucum) { entries.push({ fullUrl: uid(), resource: { resourceType: 'Observation', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: code, display: disp }] }, subject: { reference: pRef }, effectiveDateTime: when, valueQuantity: { value: +val, unit: unit, system: 'http://unitsofmeasure.org', code: ucum } } }); };
      if (v.hr) obs('8867-4', 'Heart rate', v.hr, 'beats/min', '/min');
      if (v.glucose) obs('2339-0', 'Glucose [Mass/volume] in Blood', v.glucose, 'mg/dL', 'mg/dL');
      if (v.weight) obs('29463-7', 'Body weight', v.weight, 'kg', 'kg');
      var bp = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(v.bp || '');
      if (bp) entries.push({ fullUrl: uid(), resource: { resourceType: 'Observation', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }] }, subject: { reference: pRef }, effectiveDateTime: when, component: [{ code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] }, valueQuantity: { value: +bp[1], unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } }, { code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] }, valueQuantity: { value: +bp[2], unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } }] } });
    }
    return { resourceType: 'Bundle', type: 'collection', timestamp: new Date().toISOString(), entry: entries };
  }

  /* ───────────────────────── UI (injected into #page-content; survives SPA re-render) ───────────────────────── */
  var MODALS =
    '<div id="nxCareTriage" class="nx-modal hidden" role="dialog" aria-modal="true"><div class="nx-modal-inner"><header class="nxh-bar"><button type="button" class="back-trigger" aria-label="Back" onclick="nxCare.closeTriage()"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 4L7 12l10 8"/></svg></button><div class="header-left-dock"><div class="header-details"><div class="group-title-row"><span class="group-title" id="nxTrT"></span></div><div class="group-subtitle" id="nxTrS"></div></div></div></header><div id="nxTrBody"></div></div></div>' +
    '<div id="nxCareMch" class="nx-modal hidden" role="dialog" aria-modal="true"><div class="nx-modal-inner"><header class="nxh-bar"><button type="button" class="back-trigger" aria-label="Back" onclick="nxCare.closeMch()"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 4L7 12l10 8"/></svg></button><div class="header-left-dock"><div class="header-details"><div class="group-title-row"><span class="group-title">Mother &amp; Child</span></div><div class="group-subtitle">Antenatal visits &amp; vaccinations</div></div></div></header><div id="nxMchBody"></div></div></div>' +
    '<div id="nxCarePass" class="nx-modal hidden" role="dialog" aria-modal="true"><div class="nx-modal-inner"><header class="nxh-bar"><button type="button" class="back-trigger" aria-label="Back" onclick="nxCare.closePass()"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 4L7 12l10 8"/></svg></button><div class="header-left-dock"><div class="header-details"><div class="group-title-row"><span class="group-title">Health Passport</span></div><div class="group-subtitle">You choose what is shared</div></div></div></header><div id="nxPassBody"></div></div></div>' +
    '<div id="nxOfflineBar" class="nx-offline hidden" role="status"><i class="fa-solid fa-wifi"></i> You are offline. <button type="button" onclick="nxCare.openTriage()">Offline Symptom Check</button></div>';
  var CARDS = [
    ['nxCare.openTriage()', 'fa-stethoscope', 'Offline Symptom Check', 'Works without internet'],
    ['nxCare.openMch()', 'fa-baby-carriage', 'Mother &amp; Child', 'Antenatal visits &amp; vaccines'],
    ['nxCare.openPass()', 'fa-passport', 'Health Passport', 'Emergency QR &amp; FHIR export']
  ];
  function ensureUI() {
    var pc = $('page-content'); if (!pc) return;
    if (!$('nxCareTriage')) pc.insertAdjacentHTML('beforeend', MODALS);
    var anchor = document.querySelector('.feature-card[onclick*="openProfiles"]');
    if (anchor && !document.querySelector('[data-nx-care]')) CARDS.forEach(function (c) {
      anchor.insertAdjacentHTML('beforebegin', '<div class="feature-card" data-nx-care="1" style="--card-accent:#fde08d;" onclick="' + c[0] + '" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\')' + c[0] + '"><div class="fi-box"><i class="fa-solid ' + c[1] + '" style="color:#fde08d"></i></div><h3 class="futuristic-font text-[13px] font-bold">' + c[2] + '</h3><p class="text-[12px] text-gray-500 mt-1">' + c[3] + '</p></div>');
    });
    offlineBar(); mchBadge();
  }
  function lock(on) { document.body.style.overflow = on ? 'hidden' : 'auto'; }
  function offlineBar() { var b = $('nxOfflineBar'); if (b) b.classList.toggle('hidden', navigator.onLine !== false); }
  window.addEventListener('online', offlineBar); window.addEventListener('offline', offlineBar);

  /* — triage UI — */
  var st = { who: '', cat: '', yes: [], step: 0 };
  function trRender() {
    var b = $('nxTrBody'); if (!b) return; $('nxTrT').textContent = tx('t'); $('nxTrS').textContent = tx('sub');
    var opt = function (k, v, act) { return '<button type="button" class="nx-opt" onclick="' + act + '">' + esc(tx(k)) + '</button>'; };
    if (st.step === 0) b.innerHTML = '<p class="text-[14px] text-gray-300 mb-3">' + esc(tx('who')) + '</p>' + ['adult', 'child', 'infant', 'preg'].map(function (k) { return opt(k, k, "nxCare.pick('who','" + { adult: 'a', child: 'c', infant: 'i', preg: 'p' }[k] + "')"); }).join('') + '<p class="text-[12px] text-gray-500 mt-4">' + esc(tx('disc')) + '</p>';
    else if (st.step === 1) b.innerHTML = '<p class="text-[14px] text-gray-300 mb-3">' + esc(tx('cat')) + '</p>' + ['fever', 'cough', 'gi', 'head', 'belly', 'other'].map(function (k) { return opt(k, k, "nxCare.pick('cat','" + k + "')"); }).join('') + '<button type="button" class="nx-link" onclick="nxCare.step(0)">' + esc(tx('back')) + '</button>';
    else if (st.step === 2) {
      var l = lang();
      b.innerHTML = '<p class="text-[14px] text-gray-300 mb-3">' + esc(tx('ask')) + '</p>' + qsFor(st.who, st.cat).map(function (q) { return '<label class="nx-check"><input type="checkbox" value="' + q.id + '"' + (st.yes.indexOf(q.id) > -1 ? ' checked' : '') + ' onchange="nxCare.tick(this)"><span>' + esc(q.t[l] || q.t.en) + '</span></label>'; }).join('') + '<button type="button" class="btn-nexus w-full mt-4" onclick="nxCare.step(3)">' + esc(tx('go')) + '</button><button type="button" class="nx-link" onclick="nxCare.step(1)">' + esc(tx('back')) + '</button>';
    } else {
      var r = evaluate(st.who, st.cat, st.yes), key = ['H', 'O', 'U', 'E'][r.level], l2 = lang();
      var why = r.why.length ? '<p class="text-[12px] text-gray-500 uppercase mt-4 mb-1">' + esc(tx('because')) + '</p><ul class="nx-list text-[13px] text-gray-300">' + r.why.map(function (q) { return '<li>' + esc(q.t[l2] || q.t.en) + '</li>'; }).join('') + '</ul>' : '<p class="text-[13px] text-gray-400 mt-3">' + esc(tx('none')) + '</p>';
      var adv = (ADVICE[st.cat] || ADVICE.other); var advTxt = adv[l2] || adv.en;
      b.innerHTML = '<div class="nx-level nx-lv' + r.level + '" role="alert">' + esc(tx(key)) + '</div>' + (r.level >= 2 ? '<button type="button" class="nx-emg-big" style="width:100%" onclick="nxOpenEmergency()"><i class="fa-solid fa-phone"></i><span>' + esc(tx('call')) + '</span></button>' : '') + why + (r.level < 3 ? '<p class="text-[14px] text-gray-300 mt-4 leading-relaxed">' + esc(advTxt) + '</p>' : '') + '<div class="nx-notice mt-4"><i class="fa-solid fa-triangle-exclamation"></i><div>' + esc(tx('watch')) + '</div></div>' + '<button type="button" class="btn-nexus w-full mb-3" onclick="nxCare.closeTriage();openAiTriage()">' + esc(tx('ai')) + '</button><button type="button" class="nx-link" onclick="nxCare.restart()">' + esc(tx('again')) + '</button><p class="text-[12px] text-gray-500 mt-3">' + esc(tx('disc')) + '</p>';
      bump('triageDone'); if (r.level === 3) bump('emergencyAdvised');
      var h = jget('nexusTriageLog', []); h.push({ t: Date.now(), who: st.who, cat: st.cat, level: r.level }); lsSet('nexusTriageLog', JSON.stringify(h.slice(-50)));   // no free text, no identity
    }
  }

  /* — Mother & Child UI — */
  var fmt = function (d) { return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
  var PREG_KEY = function () { return 'nexusMCHpreg_' + pid(); }, KIDS_KEY = function () { return 'nexusMCHkids_' + pid(); };
  var DANGER = ['Vaginal bleeding', 'Severe headache, blurred vision or swelling of face/hands', 'Fits (convulsions)', 'Fever', 'Severe belly pain', 'Baby moving much less (after 28 weeks)', 'Water leaking before labour', 'Difficulty breathing'];
  /* — reminders (local only): vaccines due/overdue + next antenatal contact — */
  function mchDue() {
    var out = [], now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var lmp = lsGet(PREG_KEY(), ''), p = lmp ? pregnancy(lmp) : null;
    if (p && !p.invalid) {
      for (var i = 0; i < p.contacts.length; i++) {
        var c = p.contacts[i]; if (c.past) continue;
        var diff = Math.floor((c.date - t0) / DAY);
        if (diff <= 14) out.push({ t: 'Antenatal visit (week ' + c.week + ')', d: c.date, s: diff <= 0 ? 'due' : 'soon' });
        break;
      }
    }
    jget(KIDS_KEY(), []).forEach(function (k) {
      VAX.forEach(function (v) {
        var due = vaxDue(k.dob, v[2]), s = vaxStatus(due, !!(k.given && k.given[v[0]]), now);
        if (s === 'overdue' || s === 'due') out.push({ t: k.name + ': ' + v[1], d: due, s: s });
      });
    });
    return out;
  }
  function mchBadge() {
    var sub = document.querySelector('button[onclick="nxCare.openMch()"] .nxt-ts'); if (!sub) return;
    var n = mchDue().length;
    sub.textContent = n ? n + ' due' : 'Visits & vaccines';
    sub.style.color = n ? '#fde08d' : '';
    if (n && lsGet('nexusMchToast', '') !== new Date().toDateString()) { lsSet('nexusMchToast', new Date().toDateString()); toast(n + ' mother & child reminder' + (n > 1 ? 's' : '') + ' due'); }
  }
  /* — growth log (trend only; no percentiles, no diagnosis) — */
  function growthHtml(k, ki) {
    var g = (k.growth || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var today = new Date().toISOString().slice(0, 10), h = '<div class="text-[12px] text-gray-500 uppercase mt-4 mb-2">Growth log</div>';
    if (g.length) {
      var last = g[g.length - 1], prev = g[g.length - 2];
      var ws = g.filter(function (x) { return x.w; });
      if (ws.length >= 2) {
        var mn = Math.min.apply(null, ws.map(function (x) { return x.w; })), mx = Math.max.apply(null, ws.map(function (x) { return x.w; })), span = (mx - mn) || 1;
        var pts = ws.map(function (x, i) { return (6 + i * (188 / (ws.length - 1))).toFixed(1) + ',' + (34 - (x.w - mn) / span * 28).toFixed(1); }).join(' ');
        h += '<svg viewBox="0 0 200 40" width="100%" height="40" role="img" aria-label="Weight trend"><polyline points="' + pts + '" fill="none" stroke="#fde08d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }
      h += g.slice(-5).reverse().map(function (x) {
        var gi = (k.growth || []).indexOf(k.growth.filter(function (y) { return y.d === x.d && y.w === x.w && y.h === x.h && y.c === x.c; })[0]);
        return '<div class="nx-list-item"><div><div class="text-[13px] font-bold text-white">' + esc(fmt(new Date(x.d + 'T00:00:00'))) + '</div><div class="text-[12px] text-gray-500">' + [x.w ? x.w + ' kg' : '', x.h ? x.h + ' cm' : '', x.c ? 'head ' + x.c + ' cm' : ''].filter(Boolean).join(' · ') + '</div></div><button type="button" class="nx-link" style="margin:0" onclick="nxCare.delGrowth(' + ki + ',' + gi + ')">Remove</button></div>';
      }).join('');
      var pw = prev && prev.w && last.w ? (last.w - prev.w) / prev.w : 0;
      if (prev && last.w && prev.w && pw <= -0.05) h += '<div class="nx-notice mt-3"><i class="fa-solid fa-triangle-exclamation"></i><div>Weight is ' + Math.abs(Math.round(pw * 100)) + '% lower than the last measurement. Please have your child checked by a health worker.</div></div>';
    }
    h += '<div class="grid grid-cols-2 gap-2 mt-3"><input id="nxGd' + ki + '" type="date" class="nx-field" value="' + today + '" max="' + today + '" min="' + esc(k.dob) + '" aria-label="Date"><input id="nxGw' + ki + '" type="number" step="0.01" inputmode="decimal" class="nx-field" placeholder="Weight (kg)" aria-label="Weight in kg"><input id="nxGh' + ki + '" type="number" step="0.1" inputmode="decimal" class="nx-field" placeholder="Length / height (cm)" aria-label="Length or height in cm"><input id="nxGc' + ki + '" type="number" step="0.1" inputmode="decimal" class="nx-field" placeholder="Head (cm, optional)" aria-label="Head circumference in cm"></div><button type="button" class="btn-nexus w-full" onclick="nxCare.addGrowth(' + ki + ')">Add measurement</button>';
    h += '<p class="text-[12px] text-gray-500 mt-2">This log shows the trend only. Compare each measurement with the WHO growth chart in your child’s health card; your clinic decides if growth is on track.</p>';
    return h;
  }
  function mchRender() {
    var b = $('nxMchBody'); if (!b) return;
    var lmp = lsGet(PREG_KEY(), ''), p = lmp ? pregnancy(lmp) : null, h = '';
    var due = mchDue();
    if (due.length) h += '<div class="nexa-panel"><div class="nexa-panel-title" style="font-size:14px;"><i class="fa-solid fa-bell text-cyan-400"></i>Coming up</div>' + due.slice(0, 6).map(function (x) { return '<div class="nx-list-item"><div><div class="text-[13px] font-bold text-white">' + esc(x.t) + '</div><div class="text-[12px] text-gray-500">' + fmt(x.d) + '</div></div><span class="nx-sample-tag">' + { overdue: 'Overdue', due: 'Due now', soon: 'Soon' }[x.s] + '</span></div>'; }).join('') + (due.length > 6 ? '<p class="text-[12px] text-gray-500">+ ' + (due.length - 6) + ' more below</p>' : '') + '<p class="text-[12px] text-gray-500 mt-2">Tick vaccines that were already given so this list stays accurate.</p></div>';
    h += '<div class="nexa-panel"><div class="nexa-panel-title" style="font-size:14px;"><i class="fa-solid fa-person-pregnant text-cyan-400"></i>Pregnancy</div>';
    if (!p || p.invalid) h += '<div class="nexa-panel-sub">' + (p && p.invalid ? 'That date does not look right. ' : '') + 'First day of your last period:</div><input id="nxLmp" type="date" class="nx-field" max="' + new Date().toISOString().slice(0, 10) + '"><button class="btn-nexus w-full" onclick="nxCare.saveLmp()">Calculate</button>';
    else {
      h += '<div class="nexa-summary-row"><div class="label">Pregnancy</div><div class="value">' + p.weeks + ' weeks ' + p.days + ' days (trimester ' + p.tri + ')</div></div><div class="nexa-summary-row"><div class="label">Estimated due date</div><div class="value">' + fmt(p.edd) + '</div></div>';
      h += '<div class="text-[12px] text-gray-500 uppercase mt-4 mb-2">WHO antenatal contacts (8)</div>' + p.contacts.map(function (c) { return '<div class="nx-list-item"><div><div class="text-[13px] font-bold text-white">Week ' + c.week + '</div><div class="text-[12px] text-gray-500">' + fmt(c.date) + '</div></div><span class="nx-sample-tag">' + (c.past ? 'Past' : 'Upcoming') + '</span></div>'; }).join('');
      h += '<div class="nx-notice mt-3"><i class="fa-solid fa-triangle-exclamation"></i><div><b>Go to hospital now if:</b> ' + DANGER.join('; ') + '.</div></div><button class="nx-link" onclick="nxCare.clearLmp()">Change date / remove</button>';
    }
    h += '<p class="text-[12px] text-gray-500 mt-2">Dates are estimates from your last period. Your clinic’s dating (e.g. ultrasound) is authoritative.</p></div>';
    var kids = jget(KIDS_KEY(), []);
    h += '<div class="nexa-panel"><div class="nexa-panel-title" style="font-size:14px;"><i class="fa-solid fa-baby text-cyan-400"></i>Child vaccinations</div>';
    kids.forEach(function (k, ki) {
      h += '<div class="text-[14px] font-bold text-white mt-3">' + esc(k.name) + ' <span class="text-[12px] text-gray-500">born ' + esc(k.dob) + '</span></div>';
      var now = new Date(); h += VAX.map(function (v) {
        var due = vaxDue(k.dob, v[2]), s = vaxStatus(due, !!(k.given && k.given[v[0]]), now);
        return '<label class="nx-check nx-vx ' + s + '"><input type="checkbox"' + (s === 'given' ? ' checked' : '') + ' onchange="nxCare.vax(' + ki + ',\'' + v[0] + '\',this.checked)"><span>' + esc(v[1]) + '<small>' + fmt(due) + ' · ' + { given: 'given', overdue: 'overdue', due: 'due now', upcoming: 'upcoming' }[s] + '</small></span></label>';
      }).join('') + growthHtml(k, ki) + '<button class="nx-link" onclick="nxCare.delKid(' + ki + ')">Remove ' + esc(k.name) + '</button>';
    });
    h += '<div class="nexa-panel-sub mt-3">Add a child</div><input id="nxKidName" class="nx-field" placeholder="Child’s name" maxlength="40"><input id="nxKidDob" type="date" class="nx-field" max="' + new Date().toISOString().slice(0, 10) + '"><button class="btn-nexus w-full" onclick="nxCare.addKid()">Add child</button>';
    h += '<p class="text-[12px] text-gray-500 mt-2">Generic WHO routine schedule. National schedules differ by country: the card from your clinic is authoritative. You tick vaccines yourself; Nexus does not verify them. Everything stays on this device.</p></div>';
    b.innerHTML = h; mchBadge();
  }

  /* — Health Passport UI — */
  var inc = { name: true, bt: true, al: true, cd: true, md: true, ec: true, vt: false };
  function passRender() {
    var b = $('nxPassBody'); if (!b) return; var d = passportData();
    var row = function (k, label) { return '<label class="nx-check"><input type="checkbox"' + (inc[k] ? ' checked' : '') + ' onchange="nxCare.inc(\'' + k + '\',this.checked)"><span>' + label + '</span></label>'; };
    b.innerHTML = '<div class="nx-notice"><i class="fa-solid fa-user-shield"></i><div>Anyone who scans the QR can read what you include. Share only what you are comfortable with. Fill in Medical ID first (blood group, allergies, contact).</div></div>' +
      row('name', 'Name') + row('bt', 'Blood group') + row('al', 'Allergies') + row('cd', 'Conditions') + row('md', 'Current medicines') + row('ec', 'Emergency contact') + row('vt', 'Latest vitals (FHIR file only)') +
      '<div id="nxQr" class="nx-qr"></div><pre id="nxPassTxt" class="nx-pre"></pre>' +
      '<button class="btn-nexus w-full mb-3" onclick="openMedId()">Edit Medical ID</button><button class="btn-nexus w-full mb-3" onclick="nxCare.exportFhir()">Download as FHIR R4 (JSON)</button><button class="btn-nexus w-full" onclick="nxCare.copyPass()">Copy text</button>' +
      '<p class="text-[12px] text-gray-500 mt-3">HL7 FHIR R4 Bundle: readable by hospital systems that support FHIR. Nexus is not a certified medical record and does not send this anywhere.</p>';
    var txt = passportText(d, inc); $('nxPassTxt').textContent = txt;
    var q = $('nxQr'); loadQr().then(function () { try { qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']; var c = qrcode(0, 'L'); c.addData(txt); c.make(); q.innerHTML = c.createSvgTag(4, 2); } catch (e) { q.innerHTML = '<p class="text-[12px] text-gray-500">Too much text for a QR. Turn some items off.</p>'; } }).catch(function () { q.innerHTML = '<p class="text-[12px] text-gray-500">The QR needs internet once to load. You can still copy the text or download the FHIR file.</p>'; });
  }
  function loadQr() { return new Promise(function (res, rej) { if (window.qrcode) return res(); var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

  /* ───────────────────────── public API ───────────────────────── */
  window.nxCare = {
    evaluate: evaluate, pregnancy: pregnancy, vaxDue: vaxDue, vaxStatus: vaxStatus, passportText: passportText, fhir: fhir, Q: Q, VAX: VAX,
    openTriage: function () { ensureUI(); st = { who: '', cat: '', yes: [], step: 0 }; trRender(); $('nxCareTriage').classList.remove('hidden'); lock(true); },
    closeTriage: function () { var m = $('nxCareTriage'); if (m) m.classList.add('hidden'); lock(false); },
    pick: function (k, v) { st[k] = v; st.step = k === 'who' ? 1 : 2; st.yes = []; trRender(); },
    tick: function (el) { var i = st.yes.indexOf(el.value); if (el.checked && i < 0) st.yes.push(el.value); if (!el.checked && i > -1) st.yes.splice(i, 1); },
    step: function (n) { st.step = n; trRender(); }, restart: function () { st = { who: '', cat: '', yes: [], step: 0 }; trRender(); },
    openMch: function () { ensureUI(); mchRender(); $('nxCareMch').classList.remove('hidden'); lock(true); }, closeMch: function () { var m = $('nxCareMch'); if (m) m.classList.add('hidden'); lock(false); },
    saveLmp: function () { var v = ($('nxLmp') || {}).value; if (!v) { toast('Choose a date'); return; } var p = pregnancy(v); if (!p || p.invalid) { toast('That date does not look right'); return; } lsSet(PREG_KEY(), v); bump('pregnanciesTracked'); mchRender(); },
    clearLmp: function () { try { localStorage.removeItem(PREG_KEY()); } catch (e) {} mchRender(); },
    addKid: function () { var n = ($('nxKidName').value || '').trim(), d = $('nxKidDob').value; if (!n || !d) { toast('Add a name and date of birth'); return; } if (new Date(d) > new Date()) { toast('Date of birth cannot be in the future'); return; } var k = jget(KIDS_KEY(), []); k.push({ name: n.slice(0, 40), dob: d, given: {} }); lsSet(KIDS_KEY(), JSON.stringify(k)); bump('childrenTracked'); mchRender(); },
    addGrowth: function (i) {
      var k = jget(KIDS_KEY(), []); if (!k[i]) return;
      var v = function (id) { var e = $(id + i); return e ? parseFloat(e.value) : NaN; }, d = ($('nxGd' + i) || {}).value;
      var w = v('nxGw'), h = v('nxGh'), c = v('nxGc');
      if (!d || new Date(d) > new Date() || new Date(d) < new Date(k[i].dob + 'T00:00:00')) { toast('Check the date'); return; }
      if (isNaN(w) && isNaN(h)) { toast('Add a weight or a length'); return; }
      if (!isNaN(w) && (w < 0.5 || w > 40)) { toast('Weight should be 0.5–40 kg'); return; }
      if (!isNaN(h) && (h < 30 || h > 130)) { toast('Length should be 30–130 cm'); return; }
      if (!isNaN(c) && (c < 25 || c > 60)) { toast('Head size should be 25–60 cm'); return; }
      k[i].growth = k[i].growth || []; k[i].growth.push({ d: d, w: isNaN(w) ? 0 : w, h: isNaN(h) ? 0 : h, c: isNaN(c) ? 0 : c });
      k[i].growth = k[i].growth.slice(-60); lsSet(KIDS_KEY(), JSON.stringify(k)); bump('growthMeasures'); mchRender();
    },
    delGrowth: function (i, gi) { var k = jget(KIDS_KEY(), []); if (!k[i] || !k[i].growth) return; k[i].growth.splice(gi, 1); lsSet(KIDS_KEY(), JSON.stringify(k)); mchRender(); },
    delKid: function (i) { var k = jget(KIDS_KEY(), []); k.splice(i, 1); lsSet(KIDS_KEY(), JSON.stringify(k)); mchRender(); },
    vax: function (i, id, on) { var k = jget(KIDS_KEY(), []); if (!k[i]) return; k[i].given = k[i].given || {}; if (on) k[i].given[id] = new Date().toISOString().slice(0, 10); else delete k[i].given[id]; lsSet(KIDS_KEY(), JSON.stringify(k)); mchRender(); },
    openPass: function () { ensureUI(); passRender(); $('nxCarePass').classList.remove('hidden'); lock(true); }, closePass: function () { var m = $('nxCarePass'); if (m) m.classList.add('hidden'); lock(false); },
    inc: function (k, v) { inc[k] = v; passRender(); },
    copyPass: function () { var t = passportText(passportData(), inc); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Copied'); }, function () { toast('Copy not available'); }); },
    exportFhir: function () { var b = new Blob([JSON.stringify(fhir(passportData(), inc), null, 2)], { type: 'application/fhir+json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'nexus-health-passport.fhir.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); bump('fhirExports'); }
  };

  /* ───────────────────────── offline-first ───────────────────────── */
  /* Offline caching: the site already registers ./sw.js (router). A second worker on the same scope would REPLACE it,
     so health-sw.js is NOT registered here: add  importScripts('health-sw.js');  as line 1 of sw.js instead. */

  ensureUI();
  try { new MutationObserver(function () { if ($('page-content') && !$('nxCareTriage')) ensureUI(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();

/* ============================================================
   NEXUS HOME (Soft Raised Gold) — additive. Ring = what the person did today
   (all local, nothing sent anywhere). Composer + body map open the existing AI chat.
   ============================================================ */
(function () {
  'use strict';
  if (window.__nxHome) return; window.__nxHome = 1;
  var $ = function (id) { return document.getElementById(id); };
  var lsGet = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var jget = function (k, d) { try { return JSON.parse(lsGet(k, '')) || d; } catch (e) { return d; } };
  var toast = function (m) { try { window.showToast(m); } catch (e) {} };
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var dayKey = function (d) { d = d || new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  var C = [52, 41.8, 31.6].map(function (r) { return 2 * Math.PI * r; });

  function takenIds() { var o = jget('nexusMedTaken', {}); return o.d === dayKey() ? (o.ids || []) : []; }
  function meds() { try { return getMeds(); } catch (e) { return []; } }
  function vitalsToday() { try { return getVitals().some(function (v) { var d = new Date(v.date); return !isNaN(d) && dayKey(d) === dayKey(); }); } catch (e) { return false; } }
  function checkinToday() {
    if (lsGet('nexusCheckinDay', '') === dayKey()) return true;
    return jget('nexusTriageLog', []).some(function (h) { return h && h.t && dayKey(new Date(h.t)) === dayKey(); });
  }
  function ring(i, f) { var c = $('nxhR' + i); if (!c) return; c.style.strokeDasharray = C[i]; c.style.strokeDashoffset = C[i] * (1 - f); c.style.opacity = f > 0 ? 1 : 0; }

  function paint() {
    if (!$('nxHome')) return;
    var m = meds(), ids = takenIds(), taken = m.filter(function (x) { return ids.indexOf(x.id) > -1; }).length;
    var mf = m.length ? taken / m.length : 0, vOk = vitalsToday(), cOk = checkinToday();
    ring(0, cOk ? 1 : 0); ring(1, vOk ? 1 : 0); ring(2, mf);
    var done = (m.length && taken === m.length ? 1 : 0) + (vOk ? 1 : 0) + (cOk ? 1 : 0), den = (m.length ? 1 : 0) + 2;
    var n = $('nxhCount'); if (n) n.textContent = done + '/' + den;
    var set = function (i, t) { var e = $('nxhLg' + i); if (e) e.textContent = t; };
    set(0, cOk ? 'Done' : 'Pending');
    set(1, vOk ? 'Done' : 'Not logged');
    set(2, m.length ? (taken === m.length ? 'Done' : taken + ' of ' + m.length + ' taken') : 'None set');
    (function () {
      var NS = 'http://www.w3.org/2000/svg';
      var PATH = 'M22 2H28A14 14 0 0 1 42 16V38A14 14 0 0 1 28 52H16A14 14 0 0 1 2 38V16A14 14 0 0 1 16 2Z';
      function dayPct(d) { return ((d.getHours() * 60 + d.getMinutes()) * 60 + d.getSeconds()) / 864; }
      function paint(wk) {
        var p = wk.querySelector('.nxt-dr .p'); if (!p) return;
        p.setAttribute('stroke-dasharray', dayPct(new Date()).toFixed(2) + ' 100');
      }
      function render() {
        var d = new Date(), hr = d.getHours();
        var g = $('nxtGreet'); if (g) g.textContent = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
        var dt = $('nxtDate'); if (dt) dt.textContent = d.toLocaleDateString('en-US', { weekday: 'long' }) + ', ' + d.getDate() + ' ' + d.toLocaleDateString('en-US', { month: 'long' });
        var wk = $('nxtWeek'); if (!wk) return;
        var mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        var L = ['M', 'T', 'W', 'T', 'F', 'S', 'S'], html = '';
        for (var i = 0; i < 7; i++) {
          var x = new Date(mon); x.setDate(mon.getDate() + i);
          var on = x.toDateString() === d.toDateString();
          html += '<div class="nxt-dy' + (on ? ' on' : '') + '"' + (on ? ' aria-current="date"' : '') + '>' +
            (on ? '<svg class="nxt-dr" viewBox="0 0 44 54" aria-hidden="true"><defs><linearGradient id="nxtRg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="54"><stop offset="0" stop-color="#fde08d" stop-opacity="0"/><stop offset=".5" stop-color="#fde08d" stop-opacity=".95"/><stop offset="1" stop-color="#fde08d" stop-opacity="0"/></linearGradient></defs><path class="t" d="' + PATH + '" pathLength="100"/><path class="p" d="' + PATH + '" pathLength="100" stroke-dasharray="0 100"/></svg>' : '') +
            '<small>' + L[i] + '</small><b>' + x.getDate() + '</b></div>';
        }
        wk.innerHTML = html; wk.setAttribute('data-day', d.toDateString());
        paint(wk);
      }
      render();
      if (!window.__nxtDayTimer) {
        window.__nxtDayTimer = setInterval(function () {
          var wk = document.getElementById('nxtWeek');
          if (!wk) return;
          if (wk.getAttribute('data-day') !== new Date().toDateString()) render(); else paint(wk);
        }, 30000);
        document.addEventListener('visibilitychange', function () {
          var wk = document.getElementById('nxtWeek');
          if (document.hidden || !wk) return;
          if (wk.getAttribute('data-day') !== new Date().toDateString()) render(); else paint(wk);
        });
      }
    })();
    var e = $('nxhEmgNum'), num = ''; try { num = window.nxEmgNumber ? window.nxEmgNumber() : ''; } catch (x) {}
    if (e) e.textContent = num ? ' · ' + num : '';
  }

  /* open the existing AI chat and put text in it (waits for the chat to finish loading) */
  function openChatWith(text, send) {
    var n = 0, seenConsent = false;
    try { openAiTriage(); } catch (e) { toast('Chat is not available right now.'); return; }
    var t = setInterval(function () {
      n++;
      var ov = $('aiTriageOverlay'), log = $('aiChatLog'), cm = $('aiConsentModal');
      var consentOpen = cm && !cm.classList.contains('hidden');
      if (consentOpen) seenConsent = true;
      var open = ov && !ov.classList.contains('hidden');
      if (open && log && log.children.length) {
        clearInterval(t);
        var ta = $('aiTextInput'); if (!ta) return;
        if (text) { ta.value = text; try { autoResizeAiTextarea(); } catch (e) {} }
        if (send && text) { try { sendAiTriageMessage(); } catch (e) {} }
        else { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {} }
      } else if ((seenConsent && !consentOpen && !open) || n > 400) clearInterval(t);   // consent declined / gave up
    }, 150);
  }

  var REG = {
    head: ['Head', ['Headache', 'Dizziness', 'Head injury', 'Eye or ear pain']],
    chest: ['Chest', ['Chest pain', 'Cough', 'Fast heartbeat', 'Trouble breathing']],
    abdomen: ['Abdomen', ['Stomach pain', 'Vomiting', 'Diarrhoea', 'Bloating']],
    arms: ['Arms', ['Pain', 'Swelling', 'Injury', 'Numbness']],
    legs: ['Legs', ['Pain', 'Swelling', 'Injury', 'Cramps']]
  };
  var cur = '', chip = '';
  var lock = function (on) { document.body.style.overflow = on ? 'hidden' : 'auto'; };

  window.nxHome = {
    paint: paint,
    ask: function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); var i = $('nxhInput'), v = i ? i.value.trim() : ''; if (i) i.value = ''; openChatWith(v, true); return false; },
    focus: function () { nxHome.tab('care'); var i = $('nxhInput'); if (i) { try { i.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} i.focus(); } },
    photo: function (inp) {
      var f = inp.files && inp.files[0]; if (!f) return;
      openAiTriage();
      var n = 0, t = setInterval(function () {
        n++; var ov = $('aiTriageOverlay'), ai = $('aiImageInput');
        if (ov && !ov.classList.contains('hidden') && ai) {
          clearInterval(t);
          try { var dt = new DataTransfer(); dt.items.add(f); ai.files = dt.files; handleAiImageUpload(ai); }
          catch (e) { toast('Tap the camera inside the chat to add your photo.'); }
          inp.value = '';
        } else if (n > 400) clearInterval(t);
      }, 150);
    },
    tab: function (t) {
      ['care', 'me', 'find'].forEach(function (k) {
        var b = $('nxtT-' + k), p = $('nxtP-' + k), on = k === t;
        if (b) { b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
        if (p) { if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', ''); }
      });
    },
    region: function (r) { nxHome.openBody(); nxHome.pick(r); },
    openBody: function () { var m = $('nxBodyModal'); if (!m) return; m.classList.remove('hidden'); lock(true); },
    closeBody: function () { var m = $('nxBodyModal'); if (m) m.classList.add('hidden'); lock(false); },
    pick: function (r) {
      if (!REG[r]) return; cur = r; chip = '';
      document.querySelectorAll('#nxBodySvg .nxh-hot').forEach(function (g) { g.classList.toggle('on', g.getAttribute('data-r') === r); });
      $('nxBodyRegion').textContent = REG[r][0];
      $('nxBodyChips').innerHTML = REG[r][1].map(function (c) { return '<button type="button" class="nxh-chip" onclick="nxHome.chip(this)">' + c + '</button>'; }).join('');
      $('nxBodyPanel').classList.remove('hidden'); $('nxBodyText').value = '';
      try { $('nxBodyPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    },
    chip: function (b) { var on = b.classList.contains('on'); document.querySelectorAll('#nxBodyChips .nxh-chip').forEach(function (x) { x.classList.remove('on'); }); if (!on) b.classList.add('on'); chip = on ? '' : b.textContent; },
    askBody: function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      var free = $('nxBodyText').value.trim();
      if (!cur || (!chip && !free)) { toast('Pick a symptom or describe it.'); return false; }
      var msg = 'Problem area: ' + REG[cur][0] + '. ' + [chip, free].filter(Boolean).join(' — ');
      nxHome.closeBody(); openChatWith(msg, true); return false;
    },
    taken: function (id) {
      var ids = takenIds(), i = ids.indexOf(id); if (i > -1) ids.splice(i, 1); else ids.push(id);
      lsSet('nexusMedTaken', JSON.stringify({ d: dayKey(), ids: ids }));
      try { renderMedsList(); } catch (e) { paint(); }
    }
  };

  /* wrappers (same pattern as the other layers) */
  var wrap = function (name, after) { var o = window[name]; if (typeof o !== 'function' || o.__nxh) return; var w = function () { var r = o.apply(this, arguments); try { after.apply(this, arguments); } catch (e) {} return r; }; w.__nxh = 1; window[name] = w; };
  wrap('renderMedsList', function () {
    var ids = takenIds();
    document.querySelectorAll('#medsList .nx-list-item').forEach(function (row) {
      var del = row.querySelector('button[onclick^="deleteMedReminder"]'); if (!del || row.querySelector('.nxh-taken')) return;
      var m = /\((\d+)\)/.exec(del.getAttribute('onclick') || ''); if (!m) return; var id = +m[1], on = ids.indexOf(id) > -1;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nxh-taken' + (on ? ' on' : ''); b.textContent = on ? 'Taken ✓' : 'Mark taken';
      b.setAttribute('onclick', 'nxHome.taken(' + id + ')'); del.parentNode.insertBefore(b, del);
    });
    paint();
  });
  wrap('renderVitalsHistory', paint);
  var oSend = window.sendAiTriageMessage;
  if (typeof oSend === 'function' && !oSend.__nxh) {
    var w2 = function () { var t = ($('aiTextInput') || {}).value; var r = oSend.apply(this, arguments); if (t && t.trim()) { lsSet('nexusCheckinDay', dayKey()); paint(); } return r; };
    w2.__nxh = 1; window.sendAiTriageMessage = w2;
  }
  try { if (window.nxCare && !window.nxCare.closeTriage.__nxh) { var oc = window.nxCare.closeTriage; window.nxCare.closeTriage = function () { var r = oc.apply(this, arguments); paint(); return r; }; window.nxCare.closeTriage.__nxh = 1; } } catch (e) {}

  /* the footer must never sit on top of an overlay: html.nx-ovl hides it while any health overlay is open */
  var OVL = '.nx-modal:not(.hidden),#aiTriageOverlay:not(.hidden),#checkupWizard:not(.hidden),#aiConsentModal:not(.hidden),#nexaTriageGateModal:not(.hidden),.nu-modal.open', raf = 0;
  function syncFooter() { raf = 0; document.documentElement.classList.toggle('nx-ovl', !!document.querySelector(OVL)); }
  function queueFooter() { if (!raf) raf = requestAnimationFrame(syncFooter); }
  try { new MutationObserver(queueFooter).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true }); } catch (e) {}
  syncFooter();

  paint();
  document.addEventListener('visibilitychange', paint);
  try { new MutationObserver(function () { var h = $('nxHome'); if (h && !h.__nxp) { h.__nxp = 1; paint(); } }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();

/* ===== Typing bar: uses the shared chat-composer.js ("chat" preset) =====
   Markup comes from NxComposer; only the ids/handlers are re-pointed to the health AI chat. */
(function () {
  'use strict';
  var tries = 0;
  function $(i) { return document.getElementById(i); }
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }
  function wire() {
    var dock = $('nxhDock'); if (!dock || dock.classList.contains('nxh-on')) return true;
    if (!window.NxComposer) return false;
    var ph = dock.querySelector('[data-nx-composer-bar]');
    if (ph) NxComposer.mountAll(dock);
    var ta = dock.querySelector('.composer-input'); if (!ta) return false;
    var fb = $('nxhFallback'); if (fb && fb.parentNode) fb.parentNode.removeChild(fb);
    ta.id = 'aiTextInput'; ta.setAttribute('aria-label', 'Describe your symptom');
    ta.setAttribute('autocomplete', 'off'); ta.setAttribute('spellcheck', 'false');
    var btns = dock.querySelectorAll('.composer-attach-btn');
    var plus = btns[0], mic = btns[1];
    var send = dock.querySelector('#sendBtn'), like = dock.querySelector('#voiceBtn');
    [plus, mic, send, like].forEach(function (b) { if (b) b.removeAttribute('onclick'); });
    if (like) like.style.display = 'none';          /* same as chat-interior: send stays visible */
    if (send) send.id = 'nxhSendBtn';
    if (plus) { plus.setAttribute('aria-label', 'Add photo'); plus.addEventListener('click', function () { var f = $('aiImageInput'); if (f) f.click(); }); }
    if (mic) { mic.setAttribute('aria-label', 'Voice triage'); mic.addEventListener('click', function () {
      var c = document.querySelector('.nu-card[data-m="nuM1"]'); if (c) { if (typeof closeAiTriage === 'function') closeAiTriage(); setTimeout(function () { c.click(); }, 200); }
      else if (typeof showToast === 'function') showToast('Voice triage is on the home page');
    }); }
    if (send) send.addEventListener('click', function () { if (typeof sendAiTriageMessage === 'function') sendAiTriageMessage(); });
    ta.addEventListener('input', function () { grow(ta); });
    ta.addEventListener('keypress', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (typeof sendAiTriageMessage === 'function') sendAiTriageMessage(); } });
    dock.classList.add('nxh-on');
    return true;
  }
  function boot() {
    if (wire()) return;
    if (!window.NxComposer && !document.getElementById('nxComposerJs')) {
      var s = document.createElement('script'); s.id = 'nxComposerJs'; s.src = 'chat-composer.js'; s.onload = function () { wire(); }; document.head.appendChild(s);
    }
    var t = setInterval(function () { if (wire() || ++tries > 60) clearInterval(t); }, 250);
  }
  boot();
  document.addEventListener('nexus:routechange', function () { setTimeout(boot, 0); });
  try { new MutationObserver(function () { var d = $('nxhDock'); if (d && !d.classList.contains('nxh-on')) boot(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();


/* ===== AI chat overlay: stay put when the keyboard opens (no jumping, no vanishing messages) =====
   The overlay is sized to the visible area (visualViewport) so the typing bar sits right above the keyboard
   and the conversation stays visible. */
(function () {
  'use strict';
  var vv = window.visualViewport; if (!vv) return;
  function fit() {
    var o = document.getElementById('aiTriageOverlay'); if (!o) return;
    if (o.classList.contains('hidden')) { if (o.style.height) { o.style.removeProperty('height'); o.style.removeProperty('top'); o.style.removeProperty('bottom'); } return; }
    o.style.top = vv.offsetTop + 'px'; o.style.bottom = 'auto'; o.style.height = vv.height + 'px';
    var a = document.activeElement, l = document.getElementById('aiChatLog');
    if (l && a && a.id === 'aiTextInput') l.scrollTop = l.scrollHeight;
  }
  vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
  try { new MutationObserver(fit).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] }); } catch (e) {}
  document.addEventListener('focusin', function (e) { if (e.target && e.target.id === 'aiTextInput') setTimeout(fit, 50); });
})();


/* ============================================================
   COMMUNITY HEALTH WORKER (CHW) MODE — offline-first, store-and-forward sync
   • Records live on the phone first (works with no network).
   • When online + signed in, unsent records are sent to the Nexus backend (/health/chw/sync); the server stores them
     under the worker's own account only. Deleting a person sends a tombstone that wipes the personal data on the server.
   • Screening flags are simple thresholds for REFERRAL, never a diagnosis. Thresholds are pending clinical review.
   ============================================================ */
(function () {
  'use strict';
  if (window.nxChw) return;
  var BASE = 'https://oryzon-backend-ed1q.onrender.com/health';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toast = function (m) { try { window.showToast(m); } catch (e) {} };
  var ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
  var uidNow = function () { try { var u = firebase.auth().currentUser; return u ? u.uid : ''; } catch (e) { return ''; } };
  var KEY = function () { return 'nexusChw_v1_' + (uidNow() || 'local'); };
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY())); return o && Array.isArray(o.recs) ? o : { recs: [] }; } catch (e) { return { recs: [] }; } }
  function save(o) { try { localStorage.setItem(KEY(), JSON.stringify(o)); } catch (e) { toast('Storage is full. Export and delete old records.'); } }
  function mergeLocalIntoUser() {            // records made before sign-in (key "local") join the signed-in account
    var u = uidNow(); if (!u) return;
    try { var l = JSON.parse(localStorage.getItem('nexusChw_v1_local')); if (!l || !l.recs || !l.recs.length) return; var o = load(); var have = {}; o.recs.forEach(function (r) { have[r.id] = 1; });
      l.recs.forEach(function (r) { if (!have[r.id]) o.recs.push(r); }); save(o); localStorage.removeItem('nexusChw_v1_local'); } catch (e) {}
  }
  var nid = function (p) { return p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  var st = { v: 'list', pid: '', q: '', busy: false, msg: '' };
  var fmtD = function (t) { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
  var numv = function (id, lo, hi) { var e = $(id); if (!e || e.value === '') return null; var v = parseFloat(e.value); return isFinite(v) && v >= lo && v <= hi ? v : NaN; };

  /* ---- screening thresholds (referral flags only) ---- */
  function flags(v, p) {
    var f = [], preg = p && p.pregnant;
    if (v.sys != null && v.dia != null) {
      if (preg && (v.sys >= 140 || v.dia >= 90)) f.push([3, 'Pregnant with high blood pressure: refer to a clinic today.']);
      else if (v.sys >= 180 || v.dia >= 120) f.push([3, 'Very high blood pressure: send to a clinic today. Chest pain, severe headache, weakness or speech/vision problems: emergency.']);
      else if (v.sys >= 140 || v.dia >= 90) f.push([2, 'High blood pressure reading: rest and repeat; refer for confirmation by a clinician.']);
      else if (v.sys < 90 || v.dia < 60) f.push([1, 'Low reading: ask about dizziness or fainting; refer if present.']);
    }
    if (v.glu != null) {
      if (v.glu < 70) f.push([3, 'Low blood sugar: give sugar if the person can swallow, recheck, and get care.']);
      else if (v.gluType === 'fasting' && v.glu >= 126) f.push([2, 'Fasting sugar is high: refer for testing.']);
      else if (v.gluType !== 'fasting' && v.glu >= 200) f.push([2, 'Random sugar is high: refer for testing.']);
      else if (v.gluType === 'fasting' && v.glu >= 100) f.push([1, 'Fasting sugar is above normal: advise a clinic check.']);
    }
    if (v.temp != null) { if (v.temp >= 38) f.push([2, 'Fever: refer for assessment today or tomorrow.']); else if (v.temp < 35) f.push([2, 'Low body temperature: keep warm and refer.']); }
    return f;
  }
  var top = function (fl) { return fl.reduce(function (m, x) { return Math.max(m, x[0]); }, 0); };
  var TAG = ['OK', 'Check', 'Refer', 'Urgent'];

  /* ---- data helpers ---- */
  function people(o) { return o.recs.filter(function (r) { return r.type === 'person' && !r.deleted; }); }
  function visitsOf(o, pid) { return o.recs.filter(function (r) { return r.type === 'visit' && r.pid === pid && !r.deleted; }).sort(function (a, b) { return b.created - a.created; }); }
  function pending(o) { return o.recs.filter(function (r) { return !r.sy; }); }

  /* ---- sync (store-and-forward) ---- */
  function syncNow(manual) {
    if (st.busy) return Promise.resolve();
    if (navigator.onLine === false) { if (manual) toast('You are offline. Records are safe on this phone.'); return Promise.resolve(); }
    var u; try { u = firebase.auth().currentUser; } catch (e) {}
    if (!u) { if (manual) toast('Sign in to sync your records.'); return Promise.resolve(); }
    mergeLocalIntoUser();
    st.busy = true; chrome();
    var round = function () {
      var o = load(), batch = pending(o).slice(0, 100); if (!batch.length) return Promise.resolve();
      return u.getIdToken().then(function (tok) {
        return fetch(BASE + '/chw/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ records: batch.map(function (r) { var c = {}; Object.keys(r).forEach(function (k) { if (k !== 'sy') c[k] = r[k]; }); return c; }) }) });
      }).then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.json(); }).then(function (j) {
        var o2 = load(), ok = {}, bad = {}; (j.saved || []).forEach(function (i) { ok[i] = 1; }); (j.rejected || []).forEach(function (i) { bad[i] = 1; });
        o2.recs.forEach(function (r) { if (ok[r.id]) r.sy = 1; else if (bad[r.id]) r.sy = 2; });
        save(o2); return pending(o2).length ? round() : null;
      });
    };
    return round().then(function () { if (manual) toast('Synced'); }, function () { if (manual) toast('Could not sync now. Will retry when online.'); }).then(function () { st.busy = false; chrome(); });
  }
  function restore() {
    var u; try { u = firebase.auth().currentUser; } catch (e) {} if (!u) { toast('Sign in first.'); return; } if (navigator.onLine === false) { toast('You are offline.'); return; }
    u.getIdToken().then(function (tok) { return fetch(BASE + '/chw/list', { headers: { Authorization: 'Bearer ' + tok } }); }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      var o = load(), have = {}; o.recs.forEach(function (r) { have[r.id] = 1; }); var n = 0;
      (j.records || []).forEach(function (r) { if (r && ID_RE.test(r.id || '') && !have[r.id]) { r.sy = 1; o.recs.push(r); n++; } });
      save(o); toast(n ? n + ' records restored' : 'Nothing new to restore'); render();
    }).catch(function () { toast('Could not restore right now.'); });
  }

  /* ---- UI ---- */
  var MODAL = '<div id="nxChw" class="nx-modal hidden" role="dialog" aria-modal="true"><div class="nx-modal-inner"><header class="nxh-bar"><button type="button" class="back-trigger" aria-label="Back" onclick="nxChw.back()"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 4L7 12l10 8"/></svg></button><div class="header-left-dock"><div class="header-details"><div class="group-title-row"><span class="group-title" id="nxChwT">Health worker</span></div><div class="group-subtitle" id="nxChwS">Works offline</div></div></div></header><div id="nxChwStatus"></div><div id="nxChwBody"></div></div></div>';
  function ensure() {
    var pc = $('page-content'); if (pc && !$('nxChw')) pc.insertAdjacentHTML('beforeend', MODAL);
    var grid = document.querySelector('#nxtP-me .nxt-grid');
    if (grid && !grid.querySelector('[data-nx-chw]')) grid.insertAdjacentHTML('beforeend', '<button type="button" data-nx-chw="1" class="nxt-card nxt-tile" onclick="nxChw.open()"><span class="nxt-well"><i class="fa-solid fa-notes-medical"></i></span><span class="nxt-tt"><b>Health worker</b><span class="nxt-ts">Register &amp; screen, offline</span></span></button>');
  }
  function chrome() {
    var s = $('nxChwStatus'); if (!s) return; var o = load(), n = pending(o).length, off = navigator.onLine === false;
    s.innerHTML = '<div class="nx-notice" style="margin-bottom:12px"><i class="fa-solid ' + (off ? 'fa-wifi' : 'fa-cloud') + '"></i><div>' + (off ? 'Offline. Everything is saved on this phone.' : (n ? n + ' record' + (n > 1 ? 's' : '') + ' waiting to sync.' : 'All records are synced.')) + (!off && n && !st.busy ? ' <button type="button" class="nx-link" style="display:inline;margin:0 0 0 6px" onclick="nxChw.sync()">Sync now</button>' : '') + (st.busy ? ' Syncing…' : '') + '</div></div>';
  }
  function render() {
    var b = $('nxChwBody'); if (!b) return; var o = load(), h = '';
    chrome();
    if (st.v === 'add') {
      $('nxChwT').textContent = 'Register a person'; $('nxChwS').textContent = 'With their agreement';
      h += '<input id="nxCwName" class="nx-field" placeholder="Name (or initials)" maxlength="80" autocomplete="off"><input id="nxCwYob" class="nx-field" type="number" inputmode="numeric" placeholder="Year of birth (e.g. 1985)"><select id="nxCwSex" class="nx-field"><option value="">Sex (optional)</option><option value="f">Female</option><option value="m">Male</option><option value="o">Other</option></select><input id="nxCwArea" class="nx-field" placeholder="Village / area (optional)" maxlength="80">' +
        '<label class="nx-check"><input type="checkbox" id="nxCwPreg"><span>Currently pregnant</span></label><label class="nx-check"><input type="checkbox" id="nxCwCons"><span>This person agreed to have their details recorded.<small>You cannot save without their agreement.</small></span></label><button type="button" class="btn-nexus w-full mt-3" onclick="nxChw.savePerson()">Save person</button>';
    } else if (st.v === 'person') {
      var p = o.recs.filter(function (r) { return r.id === st.pid && !r.deleted; })[0]; if (!p) { st.v = 'list'; return render(); }
      $('nxChwT').textContent = p.name || 'Person'; $('nxChwS').textContent = [p.yob ? 'b. ' + p.yob : '', p.sex === 'f' ? 'Female' : p.sex === 'm' ? 'Male' : '', p.area].filter(Boolean).join(' · ') || 'Visits';
      h += '<div class="nexa-panel"><div class="nexa-panel-title" style="font-size:14px">New visit</div><div class="grid grid-cols-2 gap-2"><input id="nxCvS" class="nx-field" type="number" inputmode="numeric" placeholder="BP top (mmHg)"><input id="nxCvD" class="nx-field" type="number" inputmode="numeric" placeholder="BP bottom (mmHg)"><input id="nxCvG" class="nx-field" type="number" inputmode="decimal" placeholder="Sugar (mg/dL)"><select id="nxCvGt" class="nx-field"><option value="random">Random</option><option value="fasting">Fasting</option></select><input id="nxCvW" class="nx-field" type="number" step="0.1" inputmode="decimal" placeholder="Weight (kg)"><input id="nxCvT" class="nx-field" type="number" step="0.1" inputmode="decimal" placeholder="Temp (°C)"></div><input id="nxCvN" class="nx-field" placeholder="Note (optional)" maxlength="300"><button type="button" class="btn-nexus w-full" onclick="nxChw.saveVisit()">Save visit</button></div>';
      var vs = visitsOf(o, p.id);
      h += vs.length ? vs.slice(0, 20).map(function (v) {
        var fl = flags(v, p), lv = top(fl);
        return '<div class="nx-list-item" style="flex-direction:column;align-items:stretch;gap:6px"><div style="display:flex;justify-content:space-between"><b class="text-[13px] text-white">' + esc(fmtD(v.created)) + '</b><span class="nx-sample-tag">' + TAG[lv] + '</span></div><div class="text-[12px] text-gray-500">' + [v.sys != null ? 'BP ' + v.sys + '/' + v.dia : '', v.glu != null ? 'Sugar ' + v.glu + ' (' + v.gluType + ')' : '', v.wt != null ? v.wt + ' kg' : '', v.temp != null ? v.temp + ' °C' : ''].filter(Boolean).join(' · ') + '</div>' + fl.map(function (x) { return '<div class="text-[12px] text-gray-300">• ' + esc(x[1]) + '</div>'; }).join('') + (v.note ? '<div class="text-[12px] text-gray-500">' + esc(v.note) + '</div>' : '') + '</div>';
      }).join('') : '<p class="text-[13px] text-gray-500">No visits yet.</p>';
      h += '<p class="text-[12px] text-gray-500 mt-3">Flags are screening reminders to refer a person, not a diagnosis. A clinician decides what the reading means.</p><button type="button" class="nx-link" onclick="nxChw.delPerson(\'' + p.id + '\')">Delete this person and their visits</button>';
    } else {
      $('nxChwT').textContent = 'Health worker'; $('nxChwS').textContent = 'Works offline';
      var q = st.q.toLowerCase(), ps = people(o).filter(function (p) { return !q || (p.name || '').toLowerCase().indexOf(q) > -1 || (p.area || '').toLowerCase().indexOf(q) > -1; }).sort(function (a, b) { return b.created - a.created; });
      var nv = o.recs.filter(function (r) { return r.type === 'visit' && !r.deleted; }).length;
      h += '<div class="nx-notice" style="margin-bottom:12px"><i class="fa-solid fa-user-shield"></i><div>Only record people who agreed. Their details stay on this phone and in your own account. Nobody else can read them.</div></div>' +
        '<div class="text-[13px] text-gray-400 mb-2">' + people(o).length + ' people · ' + nv + ' visits</div><button type="button" class="btn-nexus w-full mb-3" onclick="nxChw.add()">Register a person</button>' +
        (people(o).length > 5 ? '<input class="nx-field" placeholder="Search name or area" value="' + esc(st.q) + '" oninput="nxChw.search(this.value)">' : '');
      h += ps.length ? ps.map(function (p) { var vs = visitsOf(o, p.id), lv = vs.length ? top(flags(vs[0], p)) : -1;
        return '<div class="nx-list-item" role="button" tabindex="0" onclick="nxChw.view(\'' + p.id + '\')" onkeydown="if(event.key===\'Enter\')nxChw.view(\'' + p.id + '\')"><div><div class="text-[14px] font-bold text-white">' + esc(p.name || 'Unnamed') + (p.pregnant ? ' <span class="text-[11px] text-gray-500">pregnant</span>' : '') + '</div><div class="text-[12px] text-gray-500">' + [p.yob ? 'b. ' + p.yob : '', p.area, vs.length ? 'last visit ' + fmtD(vs[0].created) : 'no visits'].filter(Boolean).map(esc).join(' · ') + '</div></div>' + (lv >= 0 ? '<span class="nx-sample-tag">' + TAG[lv] + '</span>' : '') + '</div>'; }).join('') : '<p class="text-[13px] text-gray-500">No people yet.</p>';
      h += '<div style="margin-top:18px"><button type="button" class="nx-link" onclick="nxChw.exportCsv()">Export CSV</button><button type="button" class="nx-link" onclick="nxChw.restore()">Restore from my account</button><button type="button" class="nx-link" onclick="nxChw.wipe()">Delete all records</button></div>';
    }
    b.innerHTML = h;
  }
  function openM() { ensure(); mergeLocalIntoUser(); st = { v: 'list', pid: '', q: '', busy: st.busy, msg: '' }; render(); $('nxChw').classList.remove('hidden'); try { document.body.style.overflow = 'hidden'; } catch (e) {} syncNow(false); }
  function closeM() { var m = $('nxChw'); if (m) m.classList.add('hidden'); try { document.body.style.overflow = 'auto'; } catch (e) {} }
  function csvCell(v) { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }

  window.nxChw = {
    flags: flags, cleanLocal: load,
    open: openM,
    back: function () { if (st.v === 'list') closeM(); else { st.v = 'list'; render(); } },
    add: function () { st.v = 'add'; render(); },
    view: function (id) { if (!ID_RE.test(id)) return; st.v = 'person'; st.pid = id; render(); },
    search: function (q) { st.q = q; var b = $('nxChwBody'); var pos = q.length; render(); var i = b && b.querySelector('input[oninput]'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) {} } },
    sync: function () { syncNow(true); },
    restore: restore,
    savePerson: function () {
      var name = ($('nxCwName').value || '').trim(), yob = numv('nxCwYob', 1900, new Date().getFullYear());
      if (!name) { toast('Add a name or initials'); return; } if (yob !== null && isNaN(yob)) { toast('Check the year of birth'); return; }
      if (!$('nxCwCons').checked) { toast('The person must agree first'); return; }
      var o = load(), r = { id: nid('p'), type: 'person', name: name.slice(0, 80), yob: yob, sex: $('nxCwSex').value, area: ($('nxCwArea').value || '').trim().slice(0, 80), pregnant: $('nxCwPreg').checked, consent: true, created: Date.now(), deleted: false, sy: 0 };
      o.recs.push(r); save(o); st.v = 'person'; st.pid = r.id; render(); syncNow(false);
    },
    saveVisit: function () {
      var s = numv('nxCvS', 50, 300), d = numv('nxCvD', 30, 200), g = numv('nxCvG', 10, 900), w = numv('nxCvW', 1, 300), t = numv('nxCvT', 30, 45);
      if ([s, d, g, w, t].some(function (x) { return x !== null && isNaN(x); })) { toast('One of the numbers is out of range'); return; }
      if ((s === null) !== (d === null)) { toast('Enter both BP numbers'); return; } if (s !== null && s <= d) { toast('BP top must be higher than bottom'); return; }
      if (s === null && g === null && w === null && t === null) { toast('Add at least one measurement'); return; }
      var o = load(); o.recs.push({ id: nid('v'), type: 'visit', pid: st.pid, sys: s, dia: d, glu: g, gluType: $('nxCvGt').value, wt: w, temp: t, note: ($('nxCvN').value || '').trim().slice(0, 300), created: Date.now(), deleted: false, sy: 0 });
      save(o); render(); syncNow(false);
    },
    delPerson: function (id) {
      if (!ID_RE.test(id) || !window.confirm('Delete this person and all their visits? This also removes them from your account.')) return;
      var o = load(); o.recs.forEach(function (r) { if (r.id === id || (r.type === 'visit' && r.pid === id)) { var c = { id: r.id, type: r.type, created: r.created, deleted: true, sy: 0 }; Object.keys(r).forEach(function (k) { delete r[k]; }); Object.assign(r, c); } });
      save(o); st.v = 'list'; render(); syncNow(false);
    },
    wipe: function () {
      if (!window.confirm('Delete ALL people and visits? This also removes them from your account.')) return;
      var o = load(); o.recs = o.recs.map(function (r) { return { id: r.id, type: r.type, created: r.created, deleted: true, sy: 0 }; }); save(o); render(); syncNow(false);
    },
    exportCsv: function () {
      var o = load(), rows = [['Name', 'Year of birth', 'Sex', 'Area', 'Pregnant', 'Visit date', 'BP top', 'BP bottom', 'Sugar mg/dL', 'Sugar type', 'Weight kg', 'Temp C', 'Flags', 'Note']];
      people(o).forEach(function (p) { var vs = visitsOf(o, p.id); if (!vs.length) rows.push([p.name, p.yob, p.sex, p.area, p.pregnant ? 'yes' : 'no']); vs.forEach(function (v) { rows.push([p.name, p.yob, p.sex, p.area, p.pregnant ? 'yes' : 'no', new Date(v.created).toISOString().slice(0, 10), v.sys, v.dia, v.glu, v.gluType, v.wt, v.temp, flags(v, p).map(function (x) { return x[1]; }).join(' | '), v.note]); }); });
      var blob = new Blob(['﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'nexus-chw-records.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
  };
  ensure();
  window.addEventListener('online', function () { chrome(); syncNow(false); }); window.addEventListener('offline', chrome);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) syncNow(false); });
  try { new MutationObserver(function () { if ($('page-content') && ($('nxtP-me') && !document.querySelector('[data-nx-chw]') || !$('nxChw'))) ensure(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  setTimeout(function () { syncNow(false); }, 4000);
})();


/* ============================================================
   OPTIONAL ENCRYPTED BACKUP — off by default.
   The phone encrypts a copy of the user's health info with a passphrase only they know (PBKDF2-SHA256 → AES-256-GCM),
   then stores the ciphertext in their account. The server cannot read it; a forgotten passphrase cannot be recovered.
   Not included: documents in Records (files can be large) and CHW records (they have their own sync).
   ============================================================ */
(function () {
  'use strict';
  if (window.nxBackup) return;
  var BASE = 'https://oryzon-backend-ed1q.onrender.com/health/backup';
  var IT = 600000, MAX_B64 = 880000;
  var $ = function (id) { return document.getElementById(id); };
  var toast = function (m) { try { window.showToast(m); } catch (e) {} };
  var EXACT = ['nexusMeds', 'nexusVitals', 'nexusProfiles', 'nexusAppointments', 'nexusPrescriptions', 'nexusSelfReferrals'];
  var PREFIX = ['nexusMedicalId_', 'nexusMCHpreg_', 'nexusMCHkids_'];
  var wanted = function (k) { return EXACT.indexOf(k) > -1 || PREFIX.some(function (p) { return k.indexOf(p) === 0; }); };
  var enc = new TextEncoder(), dec = new TextDecoder();
  var b64 = function (u8) { var s = ''; for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  var unb64 = function (s) { var r = atob(s), u = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u; };
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var busy = false;

  function collect() {
    var d = {}; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (wanted(k)) d[k] = localStorage.getItem(k); } } catch (e) {}
    return d;
  }
  function deriveKey(pass, salt, it) {
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: it, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function seal(pass, plain) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(pass, salt, IT).then(function (k) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, enc.encode(plain)); })
      .then(function (ct) { return { v: 1, it: IT, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) }; });
  }
  function open(pass, o) {
    return deriveKey(pass, unb64(o.salt), o.it).then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, k, unb64(o.ct)); }).then(function (pt) { return dec.decode(pt); });
  }
  function tok() { var u; try { u = firebase.auth().currentUser; } catch (e) {} return u ? u.getIdToken() : Promise.reject(new Error('signin')); }
  function say(m) { var e = $('nxBkMsg'); if (e) e.textContent = m || ''; }
  function setBusy(b) { busy = b; var x = $('nxBackup'); if (x) x.querySelectorAll('button').forEach(function (e) { if (e.id !== 'nxBkBack') e.disabled = b; }); }
  function fail(e) { setBusy(false); say(e && e.message === 'signin' ? 'Please sign in first.' : navigator.onLine === false ? 'You are offline. Try again when you are online.' : (e && e.message) || 'Something went wrong. Nothing was changed.'); }
  function stamp() { var t = parseInt(lsGet('nexusBackupAt'), 10); return t ? 'Last backup: ' + new Date(t).toLocaleString() : 'No backup yet on this phone.'; }

  var MODAL = '<div id="nxBackup" class="nx-modal hidden" role="dialog" aria-modal="true"><div class="nx-modal-inner"><header class="nxh-bar"><button type="button" id="nxBkBack" class="back-trigger" aria-label="Back" onclick="nxBackup.close()"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 4L7 12l10 8"/></svg></button><div class="header-left-dock"><div class="header-details"><div class="group-title-row"><span class="group-title">Private backup</span></div><div class="group-subtitle">Optional · only you can open it</div></div></div></header><div id="nxBkBody"></div></div></div>';
  function paint() {
    var b = $('nxBkBody'); if (!b) return;
    b.innerHTML = '<div class="nx-notice" style="margin-bottom:12px"><i class="fa-solid fa-lock"></i><div>Off unless you use it. Your health info is locked on this phone with a passphrase only you know, then saved in your account. <b>Nexus cannot read it, and cannot recover it if you forget the passphrase.</b></div></div>' +
      '<p class="text-[13px] text-gray-400 mb-2">Included: medicines, vitals, profiles, appointments, medical ID, mother &amp; child, prescriptions. Not included: documents in Records.</p><p class="text-[12px] text-gray-500 mb-3" id="nxBkStamp">' + stamp() + '</p>' +
      '<input id="nxBkPass" type="password" class="nx-field" placeholder="Passphrase (at least 10 characters)" autocomplete="new-password" aria-label="Passphrase"><input id="nxBkPass2" type="password" class="nx-field" placeholder="Repeat passphrase (when backing up)" autocomplete="new-password" aria-label="Repeat passphrase">' +
      '<button type="button" class="btn-nexus w-full mb-3" onclick="nxBackup.backup()">Back up now</button><button type="button" class="btn-nexus w-full mb-3" onclick="nxBackup.restore()">Restore from my backup</button><button type="button" class="nx-link" onclick="nxBackup.remove()">Delete my backup</button><p id="nxBkMsg" class="text-[13px] text-gray-300 mt-3" role="status"></p>';
  }
  function ensure() {
    var pc = $('page-content'); if (pc && !$('nxBackup')) pc.insertAdjacentHTML('beforeend', MODAL);
    var grid = document.querySelector('#nxtP-me .nxt-grid');
    if (grid && !grid.querySelector('[data-nx-backup]')) grid.insertAdjacentHTML('beforeend', '<button type="button" data-nx-backup="1" class="nxt-card nxt-tile" onclick="nxBackup.open()"><span class="nxt-well"><i class="fa-solid fa-cloud-arrow-up"></i></span><span class="nxt-tt"><b>Backup</b><span class="nxt-ts">Optional &amp; private</span></span></button>');
  }

  window.nxBackup = {
    open: function () { ensure(); paint(); $('nxBackup').classList.remove('hidden'); try { document.body.style.overflow = 'hidden'; } catch (e) {} },
    close: function () { var m = $('nxBackup'); if (m) m.classList.add('hidden'); try { document.body.style.overflow = 'auto'; } catch (e) {} },
    backup: function () {
      if (busy) return; var p = $('nxBkPass').value, p2 = $('nxBkPass2').value;
      if (!window.crypto || !crypto.subtle) { say('This browser cannot encrypt. Use a newer browser.'); return; }
      if (p.length < 10) { say('Use a passphrase of at least 10 characters.'); return; } if (p !== p2) { say('The two passphrases do not match.'); return; }
      var data = collect(); if (!Object.keys(data).length) { say('There is nothing to back up yet.'); return; }
      setBusy(true); say('Locking and saving…');
      seal(p, JSON.stringify({ v: 1, t: Date.now(), d: data })).then(function (o) {
        if (o.ct.length > MAX_B64) throw new Error('Your data is too large to back up.');
        return tok().then(function (t) { return fetch(BASE, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(o) }); });
      }).then(function (r) { if (!r.ok) throw new Error('The server did not accept the backup (' + r.status + ').'); lsSet('nexusBackupAt', String(Date.now())); setBusy(false); paint(); say('Backed up. Remember your passphrase: nobody can recover it for you.'); }).catch(fail);
    },
    restore: function () {
      if (busy) return; var p = $('nxBkPass').value; if (!p) { say('Enter your passphrase.'); return; }
      if (!window.crypto || !crypto.subtle) { say('This browser cannot decrypt. Use a newer browser.'); return; }
      setBusy(true); say('Checking your backup…');
      tok().then(function (t) { return fetch(BASE, { headers: { Authorization: 'Bearer ' + t } }); }).then(function (r) { if (!r.ok) throw new Error('Could not reach your backup (' + r.status + ').'); return r.json(); }).then(function (o) {
        if (!o.exists) throw new Error('You have no backup yet.');
        return open(p, o).then(function (txt) { return { txt: txt, at: o.updatedAt }; }, function () { throw new Error('Wrong passphrase, or the backup is damaged. Nothing was changed.'); });
      }).then(function (x) {
        var j = JSON.parse(x.txt), d = j && j.d; if (!d || typeof d !== 'object') throw new Error('The backup is not readable.');
        if (!window.confirm('Replace the health info on this phone with the backup from ' + new Date(x.at || j.t).toLocaleString() + '?')) { setBusy(false); say('Cancelled.'); return; }
        lsSet('nexusPreRestore', JSON.stringify({ t: Date.now(), d: collect() }));          // one-step safety copy of what was here
        Object.keys(d).forEach(function (k) { if (wanted(k) && typeof d[k] === 'string') lsSet(k, d[k]); });
        setBusy(false); say('Restored. Reloading…'); setTimeout(function () { location.reload(); }, 700);
      }).catch(fail);
    },
    remove: function () {
      if (busy || !window.confirm('Delete your backup from your account? Your data on this phone stays.')) return; setBusy(true);
      tok().then(function (t) { return fetch(BASE + '/delete', { method: 'POST', headers: { Authorization: 'Bearer ' + t } }); }).then(function (r) { if (!r.ok) throw new Error('Could not delete right now.'); try { localStorage.removeItem('nexusBackupAt'); } catch (e) {} setBusy(false); paint(); say('Your backup was deleted.'); }).catch(fail);
    },
    _test: { seal: seal, open: open, collect: collect }
  };
  ensure();
  try { new MutationObserver(function () { if ($('page-content') && ($('nxtP-me') && !document.querySelector('[data-nx-backup]') || !$('nxBackup'))) ensure(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();
