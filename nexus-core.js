/* ============================================================
   NEXUS CORE — nexus-core.js  (v1.1)
   ------------------------------------------------------------
   SHARED, APP-WIDE bootstrap. Ana lodawa shi a KOWACE page a matsayin
   script na al'ada (<script src="nexus-core.js">), A WAJEN
   <main id="page-content">, daidai matsayin router.js/footer.js.

   MUHIMMI: wannan file NA'URAR "GUDA DAYA KACAL" ce — YANA GUDANA
   SAU DAYA KAWAI a duk tsawon rayuwar app din a browser tab, domin
   NexusRouter (fetch + innerHTML swap na #page-content) BAI TABA
   sake loda ko gudanar da wani abu da yake WAJEN #page-content ba
   yayin SPA navigation. Wannan shine dalilin da ya sa firebase.
   initializeApp() ba ya sake gudana sau biyu ko da user ya ratsa
   ta pages da yawa.

   GYARA v1.1: idan wata page ta yi kuskuren sake loda wannan file
   sau biyu a jere (misali ta hanyar PAGE_SCRIPTS mismatch a
   router.js), tsohon amfani da `const`/`let` yana haifar da
   "SyntaxError: Identifier ... has already been declared" wanda ke
   karya DUK code na page din gaba daya. An sauya zuwa `var` (wanda
   ba ya kuskure idan aka sake ayyana shi) kuma an nade sassan da ke
   da side-effects (firebase.initializeApp, auth listener) a cikin
   `window.__nexusCoreBooted` guard domin su GUDU SAU DAYA KACAL
   koda file din ya sake gudana.

   DUK page-specific scripts (social.js, chats.js, da sauransu) su
   dogara ne akan GLOBALS din da wannan file ke kafawa:
     - window.BACKEND_URL
     - window.currentUser
     - window.db / window.storage / window.analytics
   Kada su sake ayyana firebase.initializeApp() ko sake ayyana
   const db/storage/analytics — su YI AMFANI da wadanda ke nan
   kawai.
   ============================================================ */

var BACKEND_URL = 'https://oryzon-backend-ed1q.onrender.com';

var currentUser = localStorage.getItem("nexus_user_session");
if (!currentUser) {
    window.location.href = "login.html";
}

var firebaseConfig = {
    apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
    authDomain: "oryzon-50ea4.firebaseapp.com",
    databaseURL: "https://oryzon-50ea4-default-rtdb.firebaseio.com",
    projectId: "oryzon-50ea4",
    storageBucket: "oryzon-50ea4.firebasestorage.app",
    messagingSenderId: "782106742622",
    appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
    measurementId: "G-K5085DLL2W"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}


var db = firebase.firestore();
db.settings({
    experimentalForceLongPolling: true,
    useFetchStreams: false,
    merge: true
});
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    console.warn('[Firestore Persistence]', err.code);
});
var storage = firebase.storage();
var analytics = firebase.analytics();
// GYARA: an nade wannan a cikin guard domin kada listener din ya
// taru (kowace sake-gudana za ta kara wani sabon onAuthStateChanged
// listener, wanda ke haifar da "Auth ready" log da yawa da kuma
// listenNotifBadgeCount() subscriptions da yawa a jere).
if (!window.__nexusCoreBooted) {
    window.__nexusCoreBooted = true;

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log("Auth ready, uid:", user.uid);
            listenNotifBadgeCount();
        } else {
            window.location.href = "login.html";
        }
    });
}

// ============================================================
// NOTIFICATION BELL BADGE (real-time, kamar Facebook)
// Amfani da query mai filter guda ɗaya kawai (babu buƙatar
// composite index a Firestore), sannan a ƙidaya unread a JS.
// Wannan yana zaune a CORE domin bell icon din yana kan header
// din DUK pages, ba social.html kadai ba — kuma yana amfani da
// "fresh document.getElementById kowane lokaci" don haka babu
// bukatar sake yin subscribe a kowace SPA navigation.
// ============================================================
function listenNotifBadgeCount() {
    if (!currentUser) return;
    db.collection('notifications')
        .where('to', '==', currentUser)
        .onSnapshot(snapshot => {
            const badge = document.getElementById('notifBadgeCount');
            if (!badge) return;
            let count = 0;
            snapshot.forEach(doc => { if (doc.data().read === false) count++; });
            badge.textContent = count > 9 ? '9+' : count;
            badge.classList.toggle('show', count > 0);
        }, err => console.error('Notif badge error:', err));
}
