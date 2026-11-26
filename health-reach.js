/* ============================================================
   health-reach.js — "Reach" round (additive; load AFTER health-care.js, health-upgrade.js)
   1. Nigeria NPI vaccine schedule (selectable next to the generic WHO one)
   2. Endemic-disease questions + advice in the offline symptom check (malaria, Lassa, typhoid pattern, cholera, dengue)
   3. Hausa (and French) for the symptom check, advice and emergency screen; Hausa/French/Simple style for the AI chat
   4. Read-aloud and voice input (uses the phone's own voices; if there is none for a language it says so)
   5. Local Food Guide (qualitative, no invented numbers)
   6. Health Passport "Share link" (read-only FHIR snapshot, expires, can be revoked)
   CLINICAL / LANGUAGE STATUS: every Hausa and French sentence and every food and endemic-disease rule below is a DRAFT written by Nexus.
   Nothing here has been reviewed by a clinician, a dietitian or an independent native speaker. Set HA_REVIEWED = true only after that review.
   Needs the small exports added to health-care.js (S, ADVICE, state, passportData, getInc). Without them it does nothing and logs one warning.
   ============================================================ */
(function () {
  'use strict';
  if (window.__nxReach) return; window.__nxReach = 1;
  var HA_REVIEWED = false;                       // flip to true after a native Hausa speaker AND a clinician have reviewed the strings
  var BASE = 'https://oryzon-backend-ed1q.onrender.com';
  var $ = function (id) { return document.getElementById(id); };
  var lsGet = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toast = function (m) { try { window.showToast(m); } catch (e) {} };
  var C = window.nxCare;
  if (!C || !C.S || !C.ADVICE || !C.state || !C.passportData || !C.getInc) { try { console.warn('[nxReach] health-care.js exports missing: add the small export edit (S, ADVICE, state, passportData, getInc).'); } catch (e) {} return; }

  var LANG_KEY = 'nexusHomeLang';   // the key the HOMEPAGE language list saves to (change this one word if yours differs). This file has no language picker of its own.
  var LK = 'nexusReachLang', SK = 'nexusSimple', VK = 'nexusVaxSched';
  var LABEL = { en: 'English', ha: 'Hausa', fr: 'Français' };
  var syncLang = function () { var h = lsGet(LANG_KEY, ''); var l = LABEL[h] ? h : 'en'; if (lsGet(LK, '') !== l) lsSet(LK, l); };
  var rlang = function () { syncLang(); var l = lsGet(LK, ''); return LABEL[l] ? l : 'en'; };
  var simple = function () { return lsGet(SK, '') === '1'; };

  /* ═════════ 3. LANGUAGE DATA (Hausa drafts: impersonal wording so it fits men and women) ═════════ */
  C.S.ha = {
    t: 'Binciken Alamomi (ba sai da intanet ba)', sub: 'Yana aiki ba tare da intanet ba. Ba ganewar cuta ba ne.', who: 'Ga wane ne?', adult: 'Babba', child: 'Yaro (wata 2 – shekara 5)', infant: 'Jariri ƙasa da wata 2', preg: 'Mace mai ciki',
    cat: 'Babbar matsala', fever: 'Zazzaɓi', cough: 'Tari / numfashi', gi: 'Gudawa / amai', head: 'Ciwon kai', belly: 'Ciwon ciki', other: 'Wani abu daban', ask: 'Zaɓi duk abin da ya shafa yanzu', go: 'Duba shawara', back: 'Koma baya', again: 'Sake farawa',
    E: 'GAGGAWA: a nemi kulawar lafiya yanzu', U: 'A je asibiti ko wajen likita YAU', O: 'A ga ma’aikacin lafiya cikin kwana 1 zuwa 2', H: 'A kula a gida, kuma a lura sosai', because: 'Saboda an ce:',
    watch: 'A je asibiti nan take idan: numfashi ya yi wuya, an yi farfaɗiya (jiki yana girgiza), ba a iya tashe mutum ko ba ya iya sha, ciwo ya tsananta, ko abubuwa sun ƙara muni.',
    call: 'Kira gaggawa', ai: 'Tambayi Nexus Intelligence', none: 'Ba a ambaci alamar haɗari ba.', disc: 'Wannan kayan aiki yana ba da shawara ta gaba ɗaya bisa alamomin gargaɗi. Ba zai iya gano cuta ba. Idan akwai damuwa, a nemi kulawar lafiya.'
  };
  var QHA = {
    u1: 'Numfashi yana wuya, yana da sauri sosai, ƙirji yana shiga ciki, ko leɓɓa/fuska sun yi shuɗi?', u2: 'An yi farfaɗiya (jiki yana girgiza) yanzu ko a lokacin wannan rashin lafiya?', u3: 'Ya suma, yana da wuyar tashewa, ko kuma ya ruɗe farat ɗaya?',
    u4: 'Jini mai yawa yana fita kuma ba ya tsayawa?', u5: 'Ciwon ƙirji mai tsanani ko matsewar ƙirji?', u6: 'Ba ya iya sha ko shan nono, ko yana amai duk abin da ya ci?', i1: 'Jariri yana da zazzaɓi, jikinsa ya yi sanyi sosai, yana barci ƙwarai/yana laushi, ko ba ya shan nono sosai?',
    f1: 'Wuya ta yi tauri, ko akwai kuraje da ba sa bacewa idan an danna su?', f2: 'Idanu sun yi rawaya ko fitsari ya yi duhu sosai?', f3: 'Zazzaɓi na kwana 3 ko fiye?', f4: 'Ya yi rauni har ba ya iya tsayawa ko tafiya?',
    c1: 'Yana tari da jini?', c2: 'Tari na makonni 2 ko fiye?', c3: 'Numfashi yana ƙugi kuma ba ya iya magana cikakkiyar jimla?', g1: 'Jini a bayan gida ko a amai?', g2: 'Alamun rashin ruwa a jiki: ƙishi sosai, idanu sun shige, ba fitsari tun awa 8, barci ƙwarai?',
    g3: 'Gudawa na kwana 14 ko fiye?', g4: 'Bayan gida baƙi, ko amai da jini?', h1: 'Ciwon kai farat ɗaya, mafi muni a rayuwa?', h2: 'Ciwon kai tare da rauni a fuska/hannu/ƙafa, magana ta yi wuya, ko gani ya ɓace?', h3: 'Ciwon kai bayan an buge kai?',
    b1: 'Ciwon ciki mai tsanani, na kullum, ko ciki ya yi tauri?', b3: 'Ciwon ciki tare da amai akai-akai, kuma ba a iya yin bayan gida ko fitar da iska?', p1: 'Jini yana fita daga al’aura?', p2: 'Ruwa yana zuba daga al’aura?',
    p3: 'Jariri a ciki yana motsi ƙasa da yadda ya saba (bayan makonni 28)?', p4: 'Ciwon kai mai tsanani, gani ya yi dishi-dishi, ko fuska/hannuwa sun kumbura farat ɗaya?', p5: 'Zazzaɓi ko ciwon ciki mai tsanani a lokacin ciki?'
  };
  C.Q.forEach(function (q) { if (QHA[q.id]) q.t.ha = QHA[q.id]; });

  /* ═════════ 2. ENDEMIC-DISEASE QUESTIONS (appended in place; nothing existing is changed) ═════════ */
  var NEWQ = [
    ['f5', 2, 'cp', 'fever', 'In a malaria area: fever in a child under 5 or a pregnant woman? (needs a malaria test the same day)', 'En zone de paludisme : fièvre chez un enfant de moins de 5 ans ou une femme enceinte ? (test de paludisme le jour même)', 'A yankin da maleriya (zazzaɓin cizon sauro) ta zama ruwan dare: yaro ƙasa da shekara 5 ko mace mai ciki na da zazzaɓi? (a yi gwajin maleriya a ranar)'],
    ['f6', 2, 'acip', 'fever', 'Fever with sore throat, vomiting, diarrhoea or facial swelling, after contact with rats or their droppings/urine, or with a person who has Lassa fever?', 'Fièvre avec mal de gorge, vomissements, diarrhée ou gonflement du visage, après contact avec des rats ou leurs excréments/urines, ou avec une personne atteinte de fièvre de Lassa ?', 'Zazzaɓi tare da ciwon makogwaro, amai, gudawa ko kumburin fuska, bayan hulɗa da beraye ko najasarsu/fitsarinsu, ko da mai zazzaɓin Lassa?'],
    ['f7', 3, 'acip', 'fever', 'Fever with bleeding from the gums, nose or other places?', 'Fièvre avec saignement des gencives, du nez ou d’ailleurs ?', 'Zazzaɓi tare da zubar jini daga haƙora, hanci ko wasu wurare?'],
    ['f8', 1, 'acip', 'fever', 'Fever that rises day by day, with headache, belly pain, and constipation or loose stool?', 'Fièvre qui monte de jour en jour, avec mal de tête, douleur au ventre, et constipation ou selles molles ?', 'Zazzaɓi da ke ƙaruwa kowace rana, tare da ciwon kai, ciwon ciki, da ƙeƙashewar ciki ko gudawa?'],
    ['f9', 2, 'acp', 'fever', 'Fever with very bad pain behind the eyes, in the joints or muscles, and a rash?', 'Fièvre avec forte douleur derrière les yeux, dans les articulations ou les muscles, et éruption ?', 'Zazzaɓi tare da ciwo mai tsanani a bayan idanu, gaɓoɓi ko tsoka, da kuraje a fata?'],
    ['g5', 2, 'acip', 'gi', 'Very watery diarrhoea like rice water, many times, where cholera is going around?', 'Diarrhée très liquide « eau de riz », très fréquente, là où le choléra circule ?', 'Gudawa mai ruwa-ruwa kamar ruwan shinkafa, sau da yawa, a wurin da ake fama da kwalara?']
  ];
  NEWQ.forEach(function (r) { if (!C.Q.some(function (q) { return q.id === r[0]; })) C.Q.push({ id: r[0], lvl: r[1], who: r[2], cat: r[3], t: { en: r[4], fr: r[5], ha: r[6] } }); });

  var ADVA = { fever: 'ha', cough: 'ha', gi: 'ha', head: 'ha', belly: 'ha', other: 'ha' };
  var ADHA = {
    fever: 'Idan ana zaune ko an yi tafiya a yankin da maleriya take, a yi gwajin maleriya cikin gaggawa a asibiti ko kantin magani a ranar. A sha ruwa a huta. A guji shan maganin ƙwayoyin cuta (antibiotic) ba tare da shawarar ma’aikacin lafiya ba.',
    cough: 'A huta a sha ruwan ɗumi. Idan tari ya kai makonni 2 ko fiye, a tambayi asibitin gwamnati game da gwajin tarin fuka (TB).',
    gi: 'A ba da ORS (gishiri da sukari na shan ruwa) a ƙananan shaye-shaye akai-akai, a ci gaba da ciyarwa ko shayarwa. Ga yara, a tambayi ma’aikacin lafiya game da zinc.',
    head: 'A huta, a sha ruwa. A nemi kulawa idan ya ƙara tsananta ko bai sauƙa ba.', belly: 'A guji abinci mai nauyi, a sha ruwa kaɗan-kaɗan. A nemi kulawa idan ciwon ya ƙaru.', other: 'A je a duba lafiya a wurin ma’aikacin lafiya.'
  };
  Object.keys(ADVA).forEach(function (k) { if (C.ADVICE[k]) C.ADVICE[k].ha = ADHA[k]; });

  /* extra, question-specific advice shown under the result */
  var XADV = {
    f5: { en: 'Ask for a rapid malaria test (RDT) today. Children under 5 and pregnant women can get worse quickly. Do not wait for the fever to pass.', fr: 'Demandez un test rapide du paludisme aujourd’hui. Les enfants de moins de 5 ans et les femmes enceintes peuvent s’aggraver vite. N’attendez pas que la fièvre passe.', ha: 'A nemi gwajin maleriya cikin gaggawa a yau. Yara ƙasa da shekara 5 da masu ciki na iya tsananta da sauri. A guji jiran zazzaɓi ya wuce.' },
    f6: { en: 'This could be Lassa fever. Go to the nearest health facility and tell them about the contact with rats or a sick person. Do not touch the blood, vomit or urine of a sick person without gloves. In Nigeria you can call the NCDC toll-free line 0800-970000-10 or 6232 (check that these numbers are still current).', fr: 'Cela peut être la fièvre de Lassa. Allez à l’établissement de santé le plus proche et parlez du contact avec des rats ou une personne malade. Ne touchez pas le sang, les vomissures ou l’urine d’un malade sans gants. Au Nigeria : ligne gratuite NCDC 0800-970000-10 ou 6232 (vérifiez que ces numéros sont à jour).', ha: 'Wannan na iya zama zazzaɓin Lassa. A je ma’aikatar lafiya mafi kusa a faɗa musu game da hulɗa da beraye ko mara lafiya. A guji taɓa jini, amai ko fitsarin mara lafiya ba tare da safar hannu ba. A Najeriya za a iya kiran layin NCDC kyauta 0800-970000-10 ko 6232 (a tabbatar lambobin suna aiki).' },
    f7: { en: 'Bleeding together with fever is serious. Go to a hospital now.', fr: 'Un saignement avec de la fièvre est grave. Allez à l’hôpital maintenant.', ha: 'Zubar jini tare da zazzaɓi abu ne mai tsanani. A je asibiti yanzu.' },
    f8: { en: 'Ask the clinic whether a typhoid test is needed. Drink only safe (boiled or treated) water and wash hands. Do not start antibiotics on your own.', fr: 'Demandez à la clinique si un test de typhoïde est nécessaire. Buvez de l’eau sûre (bouillie ou traitée) et lavez-vous les mains. Ne commencez pas d’antibiotiques seul.', ha: 'A tambayi asibiti ko ana buƙatar gwajin taifod. A sha ruwa mai tsabta (tafasasshe ko wanda aka tsarkake), a wanke hannu. A guji fara shan maganin ƙwayoyin cuta ba tare da shawara ba.' },
    f9: { en: 'Rest and drink plenty of fluids. Do not take aspirin or ibuprofen for this kind of fever unless a doctor says so. Get checked today.', fr: 'Reposez-vous et buvez beaucoup. Pas d’aspirine ni d’ibuprofène pour ce type de fièvre sauf avis médical. Consultez aujourd’hui.', ha: 'A huta a sha ruwa sosai. A guji shan asfirin ko ibuprofen don irin wannan zazzaɓi sai likita ya ce. A je a duba yau.' },
    g5: { en: 'Give ORS in small sips all the way to the clinic. Cholera can cause severe dehydration within hours. Wash hands with soap and use safe water.', fr: 'Donnez du SRO par petites gorgées jusqu’à la clinique. Le choléra peut déshydrater gravement en quelques heures. Lavez-vous les mains au savon, eau sûre.', ha: 'A riƙa ba da ORS a ƙananan shaye-shaye har zuwa asibiti. Kwalara na iya haddasa rashin ruwa mai tsanani cikin awanni. A wanke hannu da sabulu, a yi amfani da ruwa mai tsabta.' }
  };

  /* emergency screen strings (needs the one-line change in health-upgrade.js: tr() reads window.nxT) */
  window.nxT = window.nxT || {};
  window.nxT.ha = { call: 'Kira', amb: 'Motar asibiti / gaggawar lafiya', pol: '’Yan sanda', fire: 'Masu kashe gobara', pick: 'Zaɓi ƙasarka don ganin lambobin da suka dace', fallback: 'Kira 112 (yana aiki a mafi yawan layukan waya) ko lambar gaggawa ta yankinku.' };

  function setLang(l) { if (!LABEL[l]) l = 'en'; lsSet(LK, l); try { var cur = C.state().step; if ($('nxCareTriage') && !$('nxCareTriage').classList.contains('hidden') && cur < 3) C.step(cur); } catch (e) {} paintStrip(); if (typeof window.nxEmgRender === 'function') { try { window.nxEmgRender(); } catch (e) {} } }

  /* ═════════ 4. READ-ALOUD + VOICE INPUT ═════════ */
  var SYNTH = 'speechSynthesis' in window;
  var NOVOICE = { en: 'No voice for this language on this phone. Install a text-to-speech voice in your phone settings.', fr: 'Aucune voix pour cette langue sur ce téléphone. Installez une voix dans les réglages.', ha: 'Wayar nan ba ta da muryar Hausa. A saka muryar karatu a saitunan waya. | No Hausa voice on this phone.' };
  function voices() { try { return SYNTH ? speechSynthesis.getVoices() : []; } catch (e) { return []; } }
  if (SYNTH) { try { speechSynthesis.addEventListener('voiceschanged', function () {}); voices(); } catch (e) {} }
  function pickVoice(l) { var v = voices(), m = null; for (var i = 0; i < v.length; i++) { if (String(v[i].lang).toLowerCase().replace('_', '-').indexOf(l) === 0) { m = v[i]; break; } } return m; }
  function chunks(t) { var out = [], cur = ''; String(t).replace(/\s+/g, ' ').split(/(?<=[.!?؟])\s+/).forEach(function (s) { if ((cur + ' ' + s).length > 180 && cur) { out.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s; }); if (cur) out.push(cur); return out; }
  function speak(text, l) {
    l = l || rlang();
    if (!SYNTH) { toast(NOVOICE[l] || NOVOICE.en); return false; }
    var v = pickVoice(l);
    if (!v && l === 'ha') { toast(NOVOICE.ha); return false; }       // never read Hausa with an English voice: it would be gibberish
    try { speechSynthesis.cancel(); } catch (e) {}
    chunks(text).forEach(function (c) { var u = new SpeechSynthesisUtterance(c); u.lang = v ? v.lang : ({ en: 'en-US', fr: 'fr-FR' }[l] || l); if (v) u.voice = v; u.rate = simple() ? 0.9 : 1; speechSynthesis.speak(u); });
    return true;
  }
  var recog = null;
  function listen(btn) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('Voice input is not supported in this browser. Please type.'); return; }
    if (recog) { try { recog.stop(); } catch (e) {} return; }
    var l = rlang(), r = new SR(); recog = r; r.lang = { ha: 'ha-NG', fr: 'fr-FR', en: navigator.language || 'en-US' }[l]; r.interimResults = false; r.maxAlternatives = 1;
    var done = function () { recog = null; if (btn) btn.classList.remove('nxr-on'); };
    r.onresult = function (e) { var t = e.results[0][0].transcript, inp = target(); if (inp) { inp.value = (inp.value ? inp.value + ' ' : '') + t; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); } };
    r.onerror = function (e) { done(); toast(e && e.error === 'language-not-supported' ? 'Voice input does not support this language on this phone. Please type.' : e && e.error === 'not-allowed' ? 'Allow the microphone to use voice input.' : 'Could not hear. Try again or type.'); };
    r.onend = done; if (btn) btn.classList.add('nxr-on'); try { r.start(); } catch (e) { done(); }
  }
  function target() { var a = $('aiTextInput'); if (a && a.offsetParent !== null) return a; var b = document.querySelector('[data-nx-composer-bar="chat"] textarea, [data-nx-composer-bar="chat"] input[type="text"]'); return b || a; }

  /* AI chat: language + simple style are added to the text the server receives (the chat log still shows what the person typed) */
  function wrapAsk() {
    var o = window.askNexusAI; if (typeof o !== 'function' || o.__reach) return;
    var w = function (text, img, lang) {
      var l = rlang(), ex = [];
      if (l === 'ha') ex.push('Reply in Hausa (Latin script) using plain everyday words.'); else if (l === 'fr') ex.push('Reply in French.');
      if (simple()) ex.push('Write for a person with no schooling: very simple words, at most 5 short sentences, say clearly what to do now and when to go to a clinic or hospital. No lists, no medical jargon.');
      if (ex.length && typeof text === 'string') text = text + '\n\n[Style instructions, do not mention them: ' + ex.join(' ') + ' Keep every safety warning and emergency advice.]';
      return o.call(this, text, img, lang);
    };
    w.__reach = 1; window.askNexusAI = w;
  }

  /* ═════════ 1. NIGERIA NPI SCHEDULE ═════════ */
  var WHO_VAX = C.VAX.map(function (r) { return r.slice(); });
  var NPI = [   // NPHCDA Immunization FHIR IG (draft v0.9.0): confirm against the clinic card before relying on it
    ['bcg', 'BCG (tuberculosis)', { w: 0 }], ['hepb0', 'Hepatitis B (birth dose)', { w: 0 }], ['opv0', 'Oral polio, birth dose (OPV0)', { w: 0 }],
    ['penta1', 'Pentavalent 1', { w: 6 }], ['pcv1', 'Pneumococcal (PCV) 1', { w: 6 }], ['opv1', 'Oral polio 1', { w: 6 }], ['rota1', 'Rotavirus 1', { w: 6 }], ['ipv1', 'Inactivated polio (IPV) 1', { w: 6 }],
    ['penta2', 'Pentavalent 2', { w: 10 }], ['pcv2', 'Pneumococcal (PCV) 2', { w: 10 }], ['opv2', 'Oral polio 2', { w: 10 }], ['rota2', 'Rotavirus 2', { w: 10 }],
    ['penta3', 'Pentavalent 3', { w: 14 }], ['pcv3', 'Pneumococcal (PCV) 3', { w: 14 }], ['opv3', 'Oral polio 3', { w: 14 }], ['ipv', 'Inactivated polio (IPV) 2', { w: 14 }], ['rota3', 'Rotavirus 3', { w: 14 }],
    ['mal1', 'Malaria vaccine, dose 1', { m: 5 }], ['mal2', 'Malaria vaccine, dose 2', { m: 6 }], ['mal3', 'Malaria vaccine, dose 3', { m: 7 }],
    ['va1', 'Vitamin A (6 months)', { m: 6 }], ['mcv1', 'Measles (MCV1)', { m: 9 }], ['yf', 'Yellow fever', { m: 9 }], ['men', 'Meningitis vaccine', { m: 9 }],
    ['va2', 'Vitamin A (12 months)', { m: 12 }], ['mcv2', 'Measles (MCV2)', { m: 15 }], ['mal4', 'Malaria vaccine, dose 4', { m: 15 }], ['hpv', 'HPV (girls, 9 years)', { m: 108 }]
  ];
  function applyVax(which) { var src = which === 'ng' ? NPI : WHO_VAX; C.VAX.length = 0; src.forEach(function (r) { C.VAX.push(r.slice()); }); }
  applyVax(lsGet(VK, 'who'));

  /* ═════════ 5. LOCAL FOOD GUIDE (qualitative; no calories, grams or invented numbers) ═════════ */
  var FOOD = [
    { id: 'preg', ic: 'fa-person-pregnant', t: { en: 'Pregnancy', ha: 'Lokacin ciki' }, items: {
      en: ['Eat iron-rich foods often: beans (wake), green leaves (alayyahu, zogale/moringa, ugu), liver (hanta), eggs (ƙwai), fish (kifi), dates (dabino).', 'Eat a fruit rich in vitamin C (orange/lemu, guava, pawpaw) with a meal: it helps the body use iron from plants.', 'Add groundnuts (gyaɗa), milk or yoghurt (nono, madara) and eggs for protein.', 'Avoid alcohol and raw or unpasteurised milk. Take the iron/folic acid tablets your antenatal clinic gives you.'],
      ha: ['A riƙa cin abinci mai ƙarfe: wake, ganyaye (alayyahu, zogale, ugu), hanta, ƙwai, kifi, dabino.', 'A ci ‘ya’yan itace masu bitamin C (lemu, gwaiba, gwanda) tare da abinci: yana taimakawa jiki ya yi amfani da ƙarfen shuke-shuke.', 'A ƙara gyaɗa, nono ko madara, da ƙwai don furotin.', 'A guji giya da nono ɗanye wanda ba a tafasa ba. A sha kwayoyin ƙarfe/folic acid da asibitin awo ke bayarwa.'] } },
    { id: 'wean', ic: 'fa-baby', t: { en: 'Baby food (6 months and older)', ha: 'Abincin jariri (daga wata 6)' }, items: {
      en: ['Breastfeed on demand up to 2 years or beyond; start soft foods at 6 months, not before.', 'Enrich pap (ogi/koko/kunu) with mashed groundnut, soya, egg, or fish powder. Plain pap alone is too thin.', 'Give mashed beans, mashed vegetables, pumpkin, banana, and mashed liver or fish. Increase how often and how thick as the baby grows.', 'Wash hands, use clean water, and do not add sugar or salt. If the child is losing weight or refuses food, see a health worker.'],
      ha: ['A shayar da nono idan jariri ya buƙata har zuwa shekara 2 ko fiye; a fara abinci mai laushi a wata 6, ba kafin haka ba.', 'A wadata koko/kunu/ogi da gyaɗa da aka niƙa, waken suya, ƙwai ko garin kifi. Koko kaɗai ya yi ruwa sosai.', 'A ba da wake da aka dame, kayan lambu da aka dame, kabewa, ayaba, da hanta ko kifi da aka dame. A ƙara yawan ci da kauri yayin da jariri ke girma.', 'A wanke hannu, a yi amfani da ruwa mai tsabta, kar a ƙara suga ko gishiri. Idan yaro yana rama ko ya ƙi ci, a ga ma’aikacin lafiya.'] } },
    { id: 'anae', ic: 'fa-droplet', t: { en: 'Tired and pale (low blood)', ha: 'Gajiya da kodewa (ƙarancin jini)' }, items: {
      en: ['Pale inner eyelids, tiredness or breathlessness need a blood test: see a clinic. Food helps but is not a replacement for care.', 'Iron-rich foods: liver, red meat, fish, beans, green leaves, dates.', 'Take vitamin C fruit with meals; avoid tea or coffee at the same meal because they reduce iron absorption.'],
      ha: ['Idan cikin fatar ido ya yi fari, ko akwai gajiya da ƙarancin numfashi, a yi gwajin jini a asibiti. Abinci yana taimakawa amma ba ya maye gurbin magani.', 'Abinci mai ƙarfe: hanta, nama, kifi, wake, ganyaye, dabino.', 'A ci ‘ya’yan itace masu bitamin C tare da abinci; a guji shayi ko kofi a lokacin cin abinci domin suna rage shan ƙarfe.'] } },
    { id: 'sugar', ic: 'fa-cubes', t: { en: 'Sugar (diabetes) care', ha: 'Kula da ciwon sukari' }, items: {
      en: ['Eat smaller portions of white rice, tuwo, garri, bread and yam; fill more of the plate with vegetables and beans.', 'Prefer whole grains such as millet (gero), sorghum (dawa) and unpolished foods.', 'Avoid sugary drinks, sweetened pap and sweets. Water, zobo without sugar and kunun without sugar are better.', 'Food does not replace medicine. Keep taking prescribed medicine and checking your sugar as your doctor advised.'],
      ha: ['A rage yawan shinkafa fara, tuwo, garri, burodi da doya; a ƙara kayan lambu da wake a faranti.', 'A fi cin hatsi marasa tsarkakewa kamar gero, dawa.', 'A guji abin sha mai suga, kunu mai suga da alawa. Ruwa, zoɓo ko kunu marar suga sun fi.', 'Abinci ba ya maye gurbin magani. A ci gaba da shan magani da duba suga kamar yadda likita ya ce.'] } },
    { id: 'bp', ic: 'fa-heart-pulse', t: { en: 'High blood pressure', ha: 'Hawan jini' }, items: {
      en: ['Use less salt and fewer seasoning cubes (Maggi, Knorr): they are very salty. Flavour with onion, pepper, ginger, garlic and herbs.', 'Eat less salted or heavily smoked fish and meat, and fewer fried snacks.', 'Eat more vegetables, leaves, beans and fruit (bananas, oranges). If you have kidney disease, ask your doctor before eating more potassium-rich foods.', 'Food does not replace medicine. Keep taking your tablets.'],
      ha: ['A rage gishiri da kubewa (Maggi, Knorr): suna da gishiri sosai. A yi amfani da albasa, barkono, citta, tafarnuwa da ganyen ƙamshi.', 'A rage cin kifi ko nama mai gishiri ko wanda aka hayaƙe sosai, da soyayyun abinci.', 'A ƙara cin kayan lambu, ganyaye, wake da ‘ya’yan itace (ayaba, lemu). Idan akwai ciwon koda, a tambayi likita kafin a ƙara cin abinci mai potassium.', 'Abinci ba ya maye gurbin magani. A ci gaba da shan magani.'] } },
    { id: 'diar', ic: 'fa-glass-water', t: { en: 'Diarrhoea and vomiting', ha: 'Gudawa da amai' }, items: {
      en: ['Give ORS in small, frequent sips. Keep feeding and breastfeeding.', 'Soft foods such as pap, rice, banana and mashed potato are fine once the person can eat.', 'Use clean or boiled water; wash hands with soap before eating and after the toilet.', 'See a clinic if there is blood, high fever, signs of dehydration, or it lasts more than a few days.'],
      ha: ['A ba da ORS a ƙananan shaye-shaye akai-akai. A ci gaba da ciyarwa da shayarwa.', 'Abinci mai laushi kamar koko, shinkafa, ayaba da dankalin da aka dame ba matsala bane idan mutum zai iya ci.', 'A yi amfani da ruwa mai tsabta ko tafasasshe; a wanke hannu da sabulu kafin cin abinci da bayan bayan gida.', 'A je asibiti idan akwai jini, zazzaɓi mai tsanani, alamun rashin ruwa, ko ya wuce kwana kaɗan.'] } }
  ];
  var FOODNOTE = { en: 'A starter guide written by the Nexus team for West African foods. It has not been checked by a dietitian yet. It gives general ideas, not a diet plan: your doctor or dietitian knows your situation.', ha: 'Jagora na farko da ƙungiyar Nexus ta rubuta don abincin Afirka ta Yamma. Likitan abinci (dietitian) bai duba shi ba tukuna. Shawarwari ne na gaba ɗaya, ba tsarin abinci ba: likitanka ya fi sanin halinka.' };
  var UI = {
    foodT: { en: 'Food guide', ha: 'Jagoran abinci' }, foodS: { en: 'Local foods for common needs', ha: 'Abincin gida don buƙatu daban-daban' }, back: { en: 'Back', ha: 'Koma' },
    listen: { en: 'Read aloud', ha: 'Karanta' }, simple: { en: 'Simple', ha: 'Sauƙi' }, mic: { en: 'Speak', ha: 'Magana' }
  };
  var u = function (k) { var l = rlang(); return (UI[k] && (UI[k][l] || UI[k].en)) || k; };
  function foodRender() {
    var b = $('nxFoodBody'); if (!b) return; var l = rlang() === 'ha' ? 'ha' : 'en';
    $('nxFoodT').textContent = u('foodT'); $('nxFoodS').textContent = u('foodS');
    b.innerHTML = barHtml() + FOOD.map(function (f) {
      return '<div class="nexa-panel"><div class="nexa-panel-title" style="font-size:14px;"><i class="fa-solid ' + f.ic + ' text-cyan-400"></i>' + esc(f.t[l] || f.t.en) + '</div><ul class="nx-list text-[13px] text-gray-300" style="padding-left:18px;list-style:disc;">' +
        (f.items[l] || f.items.en).map(function (x) { return '<li style="margin:6px 0;">' + esc(x) + '</li>'; }).join('') + '</ul><button type="button" class="nx-link" data-nxr-say="' + f.id + '"><i class="fa-solid fa-volume-high"></i> ' + esc(u('listen')) + '</button></div>';
    }).join('') + '<p class="text-[12px] text-gray-500 mt-3">' + esc(FOODNOTE[l]) + '</p>';
  }
  var FMODAL = '<div id="nxFood" class="nx-modal hidden" role="dialog" aria-modal="true"><div class="nx-modal-inner"><header class="nxh-bar"><button type="button" class="back-trigger" aria-label="Back" onclick="nxReach.closeFood()"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 4L7 12l10 8"/></svg></button><div class="header-left-dock"><div class="header-details"><div class="group-title-row"><span class="group-title" id="nxFoodT">Food guide</span></div><div class="group-subtitle" id="nxFoodS"></div></div></div></header><div id="nxFoodBody" style="padding:12px;"></div></div></div>';

  /* ═════════ shared UI bits (language bar, styles) ═════════ */
  var CSS = '.nxr-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px}.nxr-pill{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e5e7eb;border-radius:999px;padding:6px 12px;font-size:12px;min-height:32px;cursor:pointer}.nxr-pill.nxr-sel,.nxr-pill.nxr-on{background:rgba(253,224,141,.16);border-color:#fde08d;color:#fde08d}.nxr-note{font-size:11px;color:#9ca3af;margin:0 0 8px}.nxr-say{margin-top:8px;display:inline-flex;gap:6px;align-items:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e5e7eb;border-radius:999px;padding:8px 14px;font-size:13px;min-height:40px;cursor:pointer}.nxr-box{border:1px solid rgba(253,224,141,.3);background:rgba(253,224,141,.06);border-radius:14px;padding:12px;margin-top:12px;font-size:13px;color:#e5e7eb}.nxr-box code{word-break:break-all;font-size:11px;color:#fde08d}';
  function ensureCss() { if ($('nxrCss')) return; var s = document.createElement('style'); s.id = 'nxrCss'; s.textContent = CSS; document.head.appendChild(s); }
  function barHtml() {
    var l = rlang();
    return '<div data-reach-bar="1"><div class="nxr-bar" role="group" aria-label="Style">' +
      '<button type="button" class="nxr-pill' + (simple() ? ' nxr-on' : '') + '" data-nxr-simple="1" aria-pressed="' + simple() + '">' + esc(u('simple')) + '</button></div>' +
      (l === 'ha' && !HA_REVIEWED ? '<p class="nxr-note">Hausa: rubutun farko ne, ana jiran dubawar mai magana da harshen. · Hausa is a first draft awaiting native-speaker review.</p>' : '') + '</div>';
  }
  function paintStrip() { document.querySelectorAll('[data-reach-bar]').forEach(function (n) { n.outerHTML = barHtml(); }); var f = $('nxFood'); if (f && !f.classList.contains('hidden')) foodRender(); chatStrip(true); }

  /* ═════════ DOM wiring (observer: the page can be injected later by the SPA router) ═════════ */
  function triExtras() {
    var body = $('nxTrBody'); if (!body) return;
    if (!body.querySelector('[data-reach-bar]') && !body.querySelector('.nx-level')) body.insertAdjacentHTML('afterbegin', barHtml());
    var res = body.querySelector('.nx-level');
    if (res && !body.querySelector('[data-reach-x]')) {
      var st = C.state(), l = rlang(), yes = st.yes || [], h = '';
      yes.forEach(function (id) { if (XADV[id]) h += '<p style="margin:6px 0;">' + esc(XADV[id][l] || XADV[id].en) + '</p>'; });
      var txt = (res.textContent || '') + '. ' + h.replace(/<[^>]+>/g, ' ') + ' ' + (((C.ADVICE[st.cat] || C.ADVICE.other)[l]) || (C.ADVICE[st.cat] || C.ADVICE.other).en);
      body.insertAdjacentHTML('beforeend', '<div data-reach-x="1">' + (h ? '<div class="nxr-box">' + h + '</div>' : '') + '<button type="button" class="nxr-say" data-nxr-speak="1"><i class="fa-solid fa-volume-high"></i> ' + esc(u('listen')) + '</button></div>');
      body.querySelector('[data-nxr-speak]').__txt = txt;
    }
  }
  function mchExtras() {
    var body = $('nxMchBody'); if (!body) return;
    if (!body.querySelector('[data-reach-sched]')) {
      var cur = lsGet(VK, 'who');
      body.insertAdjacentHTML('afterbegin', '<div data-reach-sched="1" class="nexa-panel"><div class="nexa-panel-sub">Vaccine schedule</div><div class="nxr-bar" style="margin:6px 0 0"><button type="button" class="nxr-pill' + (cur === 'who' ? ' nxr-sel' : '') + '" data-nxr-sched="who">WHO generic</button><button type="button" class="nxr-pill' + (cur === 'ng' ? ' nxr-sel' : '') + '" data-nxr-sched="ng">Nigeria (NPI)</button></div>' +
        (cur === 'ng' ? '<p class="nxr-note" style="margin-top:8px">Nigeria schedule from the NPHCDA immunization guide (a draft). Always confirm with the card your clinic gave you; ticks are yours and are not verified.</p>' : '') + '</div>');
    }
  }
  var chatBusy = false;
  function chatStrip(force) {
    var host = $('nxhTypingHost'); if (!host) return;
    var old = host.querySelector('[data-reach-chat]');
    if (old && !force) return; if (old) old.remove();
    var l = rlang(), disc = host.querySelector('.nxh-disc'); chatBusy = true;
    var h = '<div data-reach-chat="1" class="nxr-bar" style="padding:0 8px 6px" role="group" aria-label="Style and voice">' +
      '<button type="button" class="nxr-pill' + (simple() ? ' nxr-on' : '') + '" data-nxr-simple="1" aria-pressed="' + simple() + '">' + esc(u('simple')) + '</button><button type="button" class="nxr-pill" data-nxr-mic="1" aria-label="' + esc(u('mic')) + '"><i class="fa-solid fa-microphone"></i> ' + esc(u('mic')) + '</button></div>';
    if (disc) disc.insertAdjacentHTML('beforebegin', h); else host.insertAdjacentHTML('beforeend', h);
    chatBusy = false;
  }
  function chatSpeakers() {
    var log = $('aiChatLog'); if (!log) return;
    log.querySelectorAll('.row-incoming').forEach(function (row) {
      if (row.__nxr || !row.querySelector('.ai-markdown-body')) return; row.__nxr = 1;
      var b = row.querySelector('.msg-body'); if (!b) return;
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'nxr-say'; btn.setAttribute('data-nxr-speak', 'msg'); btn.setAttribute('aria-label', u('listen')); btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      btn.__src = row.querySelector('.ai-markdown-body'); b.appendChild(btn);
    });
  }
  function foodTile() {
    var pc = $('page-content'); if (pc && !$('nxFood')) pc.insertAdjacentHTML('beforeend', FMODAL);
    var grid = document.querySelector('#nxtP-me .nxt-grid');
    if (grid && !grid.querySelector('[data-nx-food]')) grid.insertAdjacentHTML('beforeend', '<button type="button" data-nx-food="1" class="nxt-card nxt-tile" onclick="nxReach.openFood()"><span class="nxt-well"><i class="fa-solid fa-bowl-food"></i></span><span class="nxt-tt"><b>Food guide</b><span class="nxt-ts">Local foods, by need</span></span></button>');
  }

  /* ═════════ 6. SHARE LINK (Open API) ═════════ */
  var SHARE_TXT = { en: { h: 'Share a read-only copy', d: 'Creates a private link to a FHIR copy of what is ticked above. Anyone with the link can read it until it expires or you stop it. Nothing is shared unless you press the button.', b: 'Create share link', h1: '1 hour', h24: '24 hours', h72: '3 days', login: 'Sign in first to create a link.', fail: 'Could not create the link. Check your connection and try again.', copied: 'Link copied', stop: 'Stop sharing', active: 'Active links', none: 'No active links', exp: 'expires', views: 'opened' },
    ha: { h: 'Raba kwafin karantawa kaɗai', d: 'Yana ƙirƙirar hanyar sirri zuwa kwafin FHIR na abin da aka zaɓa a sama. Duk mai hanyar zai iya karantawa har sai ta ƙare ko ka dakatar. Ba a raba komai sai ka danna maɓallin.', b: 'Ƙirƙiri hanyar rabawa', h1: 'Awa 1', h24: 'Awa 24', h72: 'Kwana 3', login: 'A shiga asusu tukuna.', fail: 'Ba a iya ƙirƙirar hanyar ba. A duba intanet a sake gwadawa.', copied: 'An kwafi hanyar', stop: 'Dakatar da rabawa', active: 'Hanyoyin da ke aiki', none: 'Babu hanyar da ke aiki', exp: 'za ta ƙare', views: 'an buɗe' } };
  var st = function (k) { var l = rlang() === 'ha' ? 'ha' : 'en'; return SHARE_TXT[l][k]; };
  function token() { return Promise.resolve(window._authReadyPromise).then(function (usr) { if (!usr) throw new Error('login'); return usr.getIdToken(); }); }
  function api(path, opt) { return token().then(function (t) { opt = opt || {}; opt.headers = Object.assign({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, opt.headers || {}); return fetch(BASE + path, opt); }); }
  function passExtras() {
    var body = $('nxPassBody'); if (!body || body.querySelector('[data-reach-share]')) return;
    body.insertAdjacentHTML('beforeend', '<div data-reach-share="1" class="nxr-box"><b>' + esc(st('h')) + '</b><p class="text-[12px] text-gray-400" style="margin:6px 0">' + esc(st('d')) + '</p><div class="nxr-bar"><select id="nxrTtl" class="nx-field" style="max-width:140px"><option value="1">' + esc(st('h1')) + '</option><option value="24" selected>' + esc(st('h24')) + '</option><option value="72">' + esc(st('h72')) + '</option></select><button type="button" class="btn-nexus" data-nxr-share="1">' + esc(st('b')) + '</button></div><div id="nxrShareOut"></div><div id="nxrShareList"></div></div>');
    shareList();
  }
  function fmtDate(ms) { try { return new Date(ms).toLocaleString(); } catch (e) { return ''; } }
  function shareList() {
    var out = $('nxrShareList'); if (!out) return;
    api('/share/mine').then(function (r) { return r.json(); }).then(function (d) {
      var items = (d && d.items) || [];
      out.innerHTML = '<p class="text-[12px] text-gray-500 uppercase" style="margin:12px 0 4px">' + esc(st('active')) + '</p>' + (items.length ? items.map(function (x) { return '<div class="nx-list-item" style="gap:8px"><div class="text-[12px] text-gray-300">' + esc(st('exp')) + ' ' + esc(fmtDate(x.expiresAt)) + ' · ' + (x.accessCount || 0) + ' ' + esc(st('views')) + '</div><button type="button" class="nx-link" data-nxr-revoke="' + esc(x.id) + '">' + esc(st('stop')) + '</button></div>'; }).join('') : '<p class="text-[12px] text-gray-500">' + esc(st('none')) + '</p>');
    }).catch(function () { out.innerHTML = ''; });
  }
  function createShare(btn) {
    var inc = C.getInc(), bundle = C.fhir(C.passportData(), inc), ttl = parseInt(($('nxrTtl') || {}).value, 10) || 24; btn.disabled = true;
    api('/share/create', { method: 'POST', body: JSON.stringify({ bundle: bundle, ttlHours: ttl }) }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }).then(function (x) {
      btn.disabled = false; if (!x.ok || !x.d.url) { toast(x.d && x.d.error === 'too_many_links' ? 'Maximum 5 active links. Stop one first.' : st('fail')); return; }
      $('nxrShareOut').innerHTML = '<p class="text-[12px] text-gray-300" style="margin:10px 0 4px">' + esc(st('exp')) + ' ' + esc(fmtDate(x.d.expiresAt)) + '</p><code>' + esc(x.d.url) + '</code><div><button type="button" class="nxr-say" data-nxr-copy="' + esc(x.d.url) + '"><i class="fa-solid fa-copy"></i> Copy</button></div>';
      shareList();
    }).catch(function (e) { btn.disabled = false; toast(e && e.message === 'login' ? st('login') : st('fail')); });
  }

  /* ═════════ events (one delegated listener) ═════════ */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-nxr-lang],[data-nxr-simple],[data-nxr-sched],[data-nxr-speak],[data-nxr-say],[data-nxr-mic],[data-nxr-share],[data-nxr-revoke],[data-nxr-copy]'); if (!t) return;
    if (t.hasAttribute('data-nxr-lang')) { setLang(t.getAttribute('data-nxr-lang')); }
    else if (t.hasAttribute('data-nxr-simple')) { lsSet(SK, simple() ? '' : '1'); paintStrip(); }
    else if (t.hasAttribute('data-nxr-sched')) { var w = t.getAttribute('data-nxr-sched'); lsSet(VK, w); applyVax(w); try { C.openMch(); } catch (x) {} var s = $('nxMchBody'); if (s) { var o = s.querySelector('[data-reach-sched]'); if (o) o.remove(); mchExtras(); } fixMchFootnote(); }
    else if (t.hasAttribute('data-nxr-speak')) { var v = t.getAttribute('data-nxr-speak'); speak(v === 'msg' ? ((t.__src && t.__src.innerText) || '') : (t.__txt || ''), rlang()); }
    else if (t.hasAttribute('data-nxr-say')) { var f = FOOD.filter(function (z) { return z.id === t.getAttribute('data-nxr-say'); })[0]; if (f) { var l = rlang() === 'ha' ? 'ha' : 'en'; speak((f.t[l] || f.t.en) + '. ' + (f.items[l] || f.items.en).join(' '), l === 'ha' ? 'ha' : rlang()); } }
    else if (t.hasAttribute('data-nxr-mic')) { listen(t); }
    else if (t.hasAttribute('data-nxr-share')) { createShare(t); }
    else if (t.hasAttribute('data-nxr-revoke')) { api('/share/revoke', { method: 'POST', body: JSON.stringify({ id: t.getAttribute('data-nxr-revoke') }) }).then(function () { shareList(); $('nxrShareOut') && ($('nxrShareOut').innerHTML = ''); }).catch(function () { toast(st('fail')); }); }
    else if (t.hasAttribute('data-nxr-copy')) { var url = t.getAttribute('data-nxr-copy'); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast(st('copied')); }, function () { toast(url); }); }
  });
  function fixMchFootnote() {
    var b = $('nxMchBody'); if (!b || lsGet(VK, 'who') !== 'ng') return;
    b.querySelectorAll('p').forEach(function (p) { if (p.textContent.indexOf('Generic WHO routine schedule') === 0) p.textContent = 'Nigeria NPI schedule (draft from the NPHCDA guide). The card from your clinic is authoritative. You tick vaccines yourself; Nexus does not verify them. Everything stays on this device.'; });
  }

  var raf = 0;
  function sweep() { raf = 0; try { ensureCss(); wrapAsk(); foodTile(); triExtras(); mchExtras(); fixMchFootnote(); passExtras(); chatStrip(false); chatSpeakers(); } catch (e) { try { console.warn('[nxReach]', e); } catch (x) {} } }
  var queue = function () { if (!raf) raf = (window.requestAnimationFrame || setTimeout)(sweep); };
  try { new MutationObserver(function () { if (!chatBusy) queue(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  sweep();

  ['openTriage', 'openMch', 'openPass'].forEach(function (n) { var o = C[n]; if (typeof o === 'function') C[n] = function () { syncLang(); return o.apply(this, arguments); }; });
  window.nxReach = {
    openFood: function () { foodTile(); foodRender(); var m = $('nxFood'); if (m) m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; },
    closeFood: function () { var m = $('nxFood'); if (m) m.classList.add('hidden'); document.body.style.overflow = 'auto'; },
    setLang: setLang, speak: speak, applyVax: applyVax, NPI: NPI, XADV: XADV, FOOD: FOOD
  };
})();
