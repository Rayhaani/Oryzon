/* ============================================================
   NEXUS CORE — nexus-core.js  (v1.0)
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

   DUK page-specific scripts (social.js, chats.js, da sauransu) su
   dogara ne akan GLOBALS din da wannan file ke kafawa:
     - window.BACKEND_URL
     - window.currentUser
     - window.db / window.storage / window.analytics
   Kada su sake ayyana firebase.initializeApp() ko sake ayyana
   const db/storage/analytics — su YI AMFANI da wadanda ke nan
   kawai.
   ============================================================ */

const BACKEND_URL = 'https://oryzon-backend-ed1q.onrender.com';

const currentUser = localStorage.getItem("nexus_user_session");
if (!currentUser) {
    window.location.href = "login.html";
}

const firebaseConfig = {
    apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
    authDomain: "oryzon-50ea4.firebaseapp.com",
    projectId: "oryzon-50ea4",
    storageBucket: "oryzon-50ea4.firebasestorage.app",
    messagingSenderId: "782106742622",
    appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
    measurementId: "G-K5085DLL2W"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const analytics = firebase.analytics();

// Firebase Auth: yana gudana ne KAWAI SAU DAYA, domin ba a son sake
// tara listeners iri daya kowace SPA re-entry. listenNotifBadgeCount()
// mai aminci ne ga SPA domin yana neman #notifBadgeCount daga karkashin
// onSnapshot callback din sa (fresh document.getElementById kowane lokaci),
// don haka bai bukatar sake yin subscribe kowane visit.
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log("Auth ready, uid:", user.uid);
        listenNotifBadgeCount();
    } else {
        window.location.href = "login.html";
    }
});

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
