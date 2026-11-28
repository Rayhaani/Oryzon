/* ============================================================
   google-auth.js — "Continue with Google" for the Nexus home page (additive; load at the END of home.html).
   Uses the SAME Firebase project and the SAME data layout as index.html / login.html:
     users/{username} (Firestore)  +  usernames/{username} = uid (Realtime DB)  +  localStorage nexus_user_session / nexus_user_uid / nexus_token_pending
   Flow
     1. Google popup -> Firebase Auth user.
     2. If a profile already has this uid  -> same steps as login.html, then social.html / onboarding.html.
     3. If not (first time)               -> a short form asks only what Google cannot give: username, date of birth (16+), country, town, phone (optional).
        The profile is created only after the form is submitted. Closing the form signs the person out again.
   Firebase SDK is loaded in the background after the page is idle, so the landing page stays light.
   ============================================================ */
(function () {
  'use strict';
  if (window.__nxGoogle) return; window.__nxGoogle = 1;
  var CFG = { apiKey: 'AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc', authDomain: 'oryzon-50ea4.firebaseapp.com', databaseURL: 'https://oryzon-50ea4-default-rtdb.firebaseio.com', projectId: 'oryzon-50ea4', storageBucket: 'oryzon-50ea4.firebasestorage.app', messagingSenderId: '782106742622', appId: '1:782106742622:web:902d512bfe42dd4cf289cf' };
  var V = '9.23.0', BASE = 'https://www.gstatic.com/firebasejs/' + V + '/firebase-';
  var BLACK = ['rayhaani', 'rayhaan', 'ahmad', 'nexus', 'sadiq', 'kanomart', 'admin', 'support'];
  var COUNTRIES = 'Afghanistan,Albania,Algeria,Angola,Argentina,Australia,Austria,Azerbaijan,Bahrain,Bangladesh,Belgium,Benin,Bolivia,Bosnia and Herzegovina,Brazil,Burkina Faso,Cameroon,Canada,Chad,Chile,China,Colombia,Congo,Côte d\'Ivoire,DR Congo,Egypt,Ethiopia,France,Gabon,Gambia,Germany,Ghana,Guinea,India,Indonesia,Iran,Iraq,Italy,Japan,Jordan,Kazakhstan,Kenya,Kuwait,Lebanon,Libya,Malaysia,Mali,Mauritania,Mexico,Morocco,Mozambique,Myanmar,Netherlands,Niger,Nigeria,Norway,Oman,Pakistan,Palestine,Peru,Philippines,Poland,Portugal,Qatar,Romania,Russia,Saudi Arabia,Senegal,Sierra Leone,Somalia,South Africa,South Sudan,Spain,Sri Lanka,Sudan,Sweden,Switzerland,Syria,Tanzania,Thailand,Togo,Tunisia,Turkey,Uganda,Ukraine,United Arab Emirates,United Kingdom,United States,Uzbekistan,Venezuela,Vietnam,Yemen,Zambia,Zimbabwe,Other'.split(',');
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ls = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  /* ── SDK loader ── */
  var fb = null, loading = null;
  function script(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('sdk')); }; document.head.appendChild(s); }); }
  function load() {
    if (fb) return Promise.resolve(fb); if (loading) return loading;
    var base = (window.firebase && firebase.auth) ? Promise.resolve() : script(BASE + 'app-compat.js').then(function () { return Promise.all(['auth', 'database', 'firestore'].map(function (n) { return script(BASE + n + '-compat.js'); })); });
    loading = base.then(function () { if (!firebase.apps.length) firebase.initializeApp(CFG); fb = { auth: firebase.auth(), db: firebase.firestore(), rtdb: firebase.database() }; return fb; }).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 2000); };
  window.addEventListener('load', function () { idle(function () { load().catch(function () {}); }); });

  /* ── tiny UI helpers ── */
  var toastT;
  function toast(m) { var t = $('nxgToast'); if (!t) { t = document.createElement('div'); t.id = 'nxgToast'; t.setAttribute('role', 'alert'); t.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 24px);transform:translateX(-50%);max-width:min(92vw,420px);background:#1a1717;border:1px solid rgba(253,224,141,.35);color:#fff;font:500 13px Inter,system-ui,sans-serif;padding:12px 16px;border-radius:12px;z-index:100;text-align:center;line-height:1.45'; document.body.appendChild(t); } t.textContent = m; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(function () { t.style.display = 'none'; }, 6000); }
  function btnBusy(on) { document.querySelectorAll('.btn-google').forEach(function (b) { b.disabled = !!on; b.style.opacity = on ? '.6' : ''; }); }
  function errText(e) {
    var c = e && e.code;
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
    if (c === 'auth/popup-blocked') return 'Your browser blocked the Google window. Allow pop-ups for this site and tap again.';
    if (c === 'auth/account-exists-with-different-credential') return 'This email already has a Nexus account created with a password. Log in with your username and password instead.';
    if (c === 'auth/network-request-failed' || (e && e.message === 'sdk')) return 'No connection. Check your internet and try again.';
    if (c === 'auth/unauthorized-domain') return 'This website address is not yet authorised for Google sign-in (Firebase, Authorized domains).';
    if (c === 'auth/operation-not-allowed') return 'Google sign-in is not turned on yet (Firebase, Sign-in method).';
    if (c === 'auth/user-disabled') return 'This account has been disabled. Contact support.';
    if (c === 'permission-denied' || c === 'firestore/permission-denied') return 'Sign-in was blocked by the server rules. Please contact support.';
    return 'Google sign-in failed' + (c ? ' (' + c + ')' : '') + '. Please try again, or use email.';
  }

  /* ── returning user: same steps as login.html ── */
  function enter(f, user, docSnap) {
    var d = docSnap.data() || {}, username = d.username || docSnap.id;
    if (!user.emailVerified) { return f.auth.signOut().then(function () { toast('Your Google email is not verified. Use email sign-up instead.'); }); }
    return Promise.all([docSnap.ref.update({ isOnline: true, emailVerified: true }), f.rtdb.ref('usernames/' + username).set(user.uid)]).then(function () {
      ls('nexus_token_pending', '1'); ls('nexus_user_session', username); ls('nexus_user_uid', user.uid);
      location.href = d.onboardingComplete === true ? 'social.html' : 'onboarding.html';
    });
  }

  /* ── first-time user: short form ── */
  var CSS = '#nxgOv{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);z-index:60;display:flex;align-items:flex-end;justify-content:center}#nxgOv .nxg-sheet{width:100%;max-width:480px;max-height:92dvh;overflow:auto;background:linear-gradient(135deg,#1e1c1c,#0b0b0b);border:1px solid rgba(253,224,141,.2);border-radius:22px 22px 0 0;padding:18px 16px calc(env(safe-area-inset-bottom) + 20px);color:#fff;font-family:Inter,system-ui,sans-serif}#nxgOv h2{font-family:Orbitron,sans-serif;font-size:15px;letter-spacing:1px;margin:0 0 4px}#nxgOv p.s{font-size:12px;color:rgba(255,255,255,.55);margin:0 0 12px}#nxgOv label{display:block;font-size:12px;color:rgba(255,255,255,.65);margin:10px 0 4px}#nxgOv input,#nxgOv select{width:100%;background:#0d0d0f;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px 14px;font-size:14px;color:#fff;outline:none;font-family:inherit}#nxgOv input:focus,#nxgOv select:focus{border-color:#fde08d}#nxgOv .m{font-size:11px;min-height:14px;margin-top:4px}#nxgOv .bad{color:#ff3b30}#nxgOv .ok{color:#34c759}#nxgOv .row{display:flex;gap:10px;margin-top:16px}#nxgOv button{flex:1;height:46px;border-radius:14px;font:600 14px Inter,sans-serif;cursor:pointer;border:1px solid rgba(255,255,255,.14);background:#0a0a0a;color:#fff}#nxgOv button.go{background:#fde08d;color:#1b1205;border:0}#nxgOv button:disabled{opacity:.5;cursor:not-allowed}';
  var uOk = false, uT = null;
  function setup(f, user) {
    if ($('nxgOv')) return;
    var st = document.createElement('style'); st.id = 'nxgCss'; st.textContent = CSS; document.head.appendChild(st);
    var ov = document.createElement('div'); ov.id = 'nxgOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="nxg-sheet"><h2>ALMOST THERE</h2><p class="s">' + esc(user.email || '') + ' is verified by Google. Tell us a few things to finish your Nexus account.</p>' +
      '<label for="nxgName">Full name</label><input id="nxgName" maxlength="60" autocomplete="name" value="' + esc(user.displayName || '') + '">' +
      '<label for="nxgUser">Choose username</label><input id="nxgUser" maxlength="30" autocomplete="off" autocapitalize="none" placeholder="letters, numbers, . or _"><div class="m" id="nxgUm"></div>' +
      '<label for="nxgDob">Date of birth</label><input id="nxgDob" type="date"><div class="m bad" id="nxgDm"></div>' +
      '<label for="nxgCountry">Country</label><select id="nxgCountry"><option value="" disabled selected>Select your country</option>' + COUNTRIES.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<label for="nxgTown">Town / State</label><input id="nxgTown" maxlength="60" autocomplete="off">' +
      '<label for="nxgPhone">Phone (optional)</label><input id="nxgPhone" type="tel" maxlength="20" autocomplete="tel" placeholder="e.g. 08012345678">' +
      '<div class="m bad" id="nxgErr"></div><div class="row"><button type="button" id="nxgCancel">Cancel</button><button type="button" class="go" id="nxgGo">Create account</button></div></div>';
    document.body.appendChild(ov); uOk = false;
    var un = $('nxgUser'), um = $('nxgUm'), err = $('nxgErr');
    un.addEventListener('input', function () {
      var v = un.value.toLowerCase().replace(/[^a-z0-9._]/g, ''); un.value = v; uOk = false; um.className = 'm'; um.textContent = ''; clearTimeout(uT);
      if (v.length < 3) { if (v.length) { um.className = 'm bad'; um.textContent = 'At least 3 characters.'; } return; }
      if (BLACK.indexOf(v) > -1) { um.className = 'm bad'; um.textContent = 'Username not available.'; return; }
      uT = setTimeout(function () { f.db.collection('users').doc(v).get().then(function (s) { if (un.value !== v) return; if (s.exists) { um.className = 'm bad'; um.textContent = 'Username not available.'; } else { uOk = true; um.className = 'm ok'; um.textContent = '✓ Username available'; } }).catch(function () { um.className = 'm bad'; um.textContent = 'Could not check username. Try again.'; }); }, 400);
    });
    $('nxgCancel').onclick = function () { close(); f.auth.signOut().catch(function () {}); };
    $('nxgGo').onclick = function () { submit(f, user); };
    un.focus();
  }
  function close() { var o = $('nxgOv'); if (o) o.remove(); var s = $('nxgCss'); if (s) s.remove(); btnBusy(false); }
  function age(dobStr) { var b = new Date(dobStr); if (isNaN(b)) return -1; var t = new Date(), a = t.getFullYear() - b.getFullYear(), m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; }
  function submit(f, user) {
    var err = $('nxgErr'), go = $('nxgGo'); err.textContent = ''; $('nxgDm').textContent = '';
    var name = $('nxgName').value.trim(), username = $('nxgUser').value.trim().toLowerCase(), dob = $('nxgDob').value, country = $('nxgCountry').value, town = $('nxgTown').value.trim(), phone = $('nxgPhone').value.trim();
    if (!name) { err.textContent = 'Enter your full name.'; return; }
    if (username.length < 3 || !uOk) { err.textContent = 'Choose an available username.'; return; }
    var a = age(dob); if (a < 0) { $('nxgDm').textContent = 'Enter your date of birth.'; return; } if (a < 16) { $('nxgDm').textContent = 'Access Denied: You must be at least 16 years old.'; return; }
    if (!country) { err.textContent = 'Select your country.'; return; } if (!town) { err.textContent = 'Enter your town or state.'; return; }
    go.disabled = true; go.textContent = 'Creating…';
    var ref = f.db.collection('users').doc(username);
    f.db.runTransaction(function (tx) { return tx.get(ref).then(function (s) { if (s.exists) throw { code: 'custom/taken' }; tx.set(ref, { uid: user.uid, username: username, fullName: name, dateOfBirth: dob, email: user.email, phone: phone || null, country: country, town: town, isOnline: true, emailVerified: !!user.emailVerified, authProvider: 'google', registrationTimestamp: Date.now() }); }); })
      .then(function () { return f.rtdb.ref('usernames/' + username).set(user.uid); })
      .then(function () { ls('nexus_token_pending', '1'); ls('nexus_user_session', username); ls('nexus_user_uid', user.uid); location.href = 'onboarding.html'; })
      .catch(function (e) { go.disabled = false; go.textContent = 'Create account'; if (e && e.code === 'custom/taken') { uOk = false; $('nxgUm').className = 'm bad'; $('nxgUm').textContent = 'Username not available.'; err.textContent = 'That username was just taken. Choose another.'; } else err.textContent = errText(e) || 'Could not create the account. Try again.'; });
  }

  /* ── entry point (replaces the placeholder on the button) ── */
  var running = false;
  window.continueWithGoogle = function () {
    if (running) return; running = true; btnBusy(true);
    load().then(function (f) {
      var p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
      return f.auth.signInWithPopup(p).then(function (cred) {
        var user = cred.user;
        return f.db.collection('users').where('uid', '==', user.uid).limit(1).get().then(function (q) { return q.empty ? setup(f, user) : enter(f, user, q.docs[0]); });
      });
    }).catch(function (e) { var m = errText(e); if (m) toast(m); try { console.error('[google-auth]', e); } catch (x) {} if (!$('nxgOv')) btnBusy(false); }).then(function () { running = false; });
  };
})();
