// ══════════════════════════════════════════════
//  FIREBASE INIT
// ══════════════════════════════════════════════
// `var` (ba `const`/`let` ba) da guard din `!firebase.apps.length` da gara:
// a zangon SPA guda, wannan fayil da chats.js/social.js/services.js na iya
// zama a loda su DUKA a document guda — top-level `const db` a nan zai
// jefar da SyntaxError (redeclaration) da zaran an loda wani script din da
// yake da nasa `const db`. `var` yana amintacce ya sake-bayyana ba tare da
// matsala ba, kuma guard din yana hana `initializeApp` na biyu ya fashe.
var firebaseConfig = firebaseConfig || {
    apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
    authDomain: "oryzon-50ea4.firebaseapp.com",
    projectId: "oryzon-50ea4",
    storageBucket: "oryzon-50ea4.firebasestorage.app",
    messagingSenderId: "782106742622",
    appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
    measurementId: "G-K5085DLL2W"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
var db = firebase.firestore();
if (!window.__nexusFirestorePersistenceEnabled) {
    window.__nexusFirestorePersistenceEnabled = true;
    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        // 'failed-precondition' = wani tab din ya rigaya ya bude persistence (fine, yana
        // aiki can); 'unimplemented' = browser bai goyi bayan IndexedDB ba. Ko wanne ba
        // laifi ba ne — kawai za a rasa cache-instant-render din, ba za a break app ba.
        console.warn('Firestore persistence not enabled:', err.code);
    });
}

// Jiran Firebase Auth ya "farfaɗo" session kafin a bar sending
var ciAuthReadyResolve;
var ciAuthReadyPromise = window.__ciAuthReadyPromise || new Promise((resolve) => { ciAuthReadyResolve = resolve; });
firebase.auth().onAuthStateChanged((user) => {
    if (ciAuthReadyResolve) ciAuthReadyResolve(user);
});

// ══════════════════════════════════════════════
//  SETUP
// ══════════════════════════════════════════════
// chatWith/myId/chatRoomId suna canzawa duk lokacin da mutum ya bude wani
// SABON chat (SPA navigation ta iya kaiwa nan sau da yawa a rayuwar
// document guda, ba wai sau daya kawai kamar native page load ba), don
// haka sun zama `let` a nan sannan a KAWAI ainihin sanya musu daraja a
// cikin NexusChatInterior_init() kasa — dukkan functions da ke amfani da
// su a fadin wannan fayil suna karanta ainihin daraja ta yanzu ta hanyar
// closure, ba tare da bukatar canza su daban-daban ba.
let chatWith = null;
let myId = null;
let chatRoomId = null;
if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }

function getChatRoomId(a, b) { return [a, b].sort().join('__'); }
// Every personal room carries an immutable, sorted list of the two account uids (memberUids).
// Firestore security rules use it to decide who may read/write the room.
async function ensureRoom(roomId, myName, peerName) {
    await ciAuthReadyPromise;
    const me = firebase.auth().currentUser;
    if (!me) throw new Error('Not signed in');
    const peerDoc = await db.collection('users').doc(peerName).get();
    const peerUid = peerDoc.exists ? peerDoc.data().uid : null;
    if (!peerUid) throw new Error('Peer has no account uid');
    await db.collection('personalChats').doc(roomId).set({
        members: [myName, peerName].sort(),
        memberUids: [me.uid, peerUid].sort()
    }, { merge: true });
}
// ══════════════════════════════════════════════
//  END-TO-END ENCRYPTION (sakonnin rubutu kawai a wannan zangon)
//  ECDH (P-256) key exchange + AES-GCM 256. Kowane na'ura yana da nasa
//  private key (baya taɓa barin na'urar) — ana buga public key kawai zuwa
//  Firestore users/{uid}.e2ePublicKey. Shared key ana samun ta ne ta hanyar
//  ECDH tsakanin private key na wannan na'urar da public key na dayan bangaren,
//  kuma AN TABBATA cewa dukkan bangarorin biyu za su iya samo shi ba tare da
//  taba turawa a matsayin plaintext ba.
//  IYAKANCEWA da aka bayyana wa mai amfani: hoto/bidiyo/murya ba a boye su a
//  wannan zangon — kawai sakonnin rubutu.
// ══════════════════════════════════════════════
function b64encode(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(binary);
}
function b64decode(str) {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}
let myE2EKeyPair = null;
let e2eSharedKey = null;
let e2eInitPromise = null;

async function getOrCreateMyKeyPair() {
    const storedPriv = localStorage.getItem('nexus_e2e_priv_' + myId);
    const storedPub = localStorage.getItem('nexus_e2e_pub_' + myId);
    if (storedPriv && storedPub) {
        const privJwk = JSON.parse(storedPriv);
        const privateKey = await crypto.subtle.importKey('jwk', privJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
        return { privateKey };
    }
    const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
    const privJwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
    localStorage.setItem('nexus_e2e_priv_' + myId, JSON.stringify(privJwk));
    localStorage.setItem('nexus_e2e_pub_' + myId, JSON.stringify(pubJwk));
    await db.collection('users').doc(myId).set({ e2ePublicKey: pubJwk }, { merge: true });
    return { privateKey: kp.privateKey };
}
async function fetchPeerPublicKey(peerId) {
    const doc = await db.collection('users').doc(peerId).get();
    const d = doc.data();
    if (!d || !d.e2ePublicKey) return null;
    return crypto.subtle.importKey('jwk', d.e2ePublicKey, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}
async function initE2E() {
    return; // E2E an kashe shi na dan lokaci — duba dalili a sama; sabbin sakonni za su tafi plaintext
    try {
        myE2EKeyPair = await getOrCreateMyKeyPair();
        // Idan chatWith din bai buga public key dinsa ba tukuna (misali har yanzu yana
        // amfani da tsohuwar version na app din), sakonni za su tafi a matsayin plaintext
        // har sai shi ma ya bude sabon version din aka publish masa key din.
        const peerPubKey = await fetchPeerPublicKey(chatWith);
        if (!peerPubKey) { console.warn('Nexus E2E: peer public key ba ta samu ba tukuna.'); return; }
        e2eSharedKey = await crypto.subtle.deriveKey(
            { name: 'ECDH', public: peerPubKey }, myE2EKeyPair.privateKey,
            { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        );
        renderChatFlow(); // bude duk wani sako da ke jiran decryption
    } catch (e) {
        console.error('Nexus E2E init error:', e);
    }
}
function ensureE2EReady() {
    if (!e2eInitPromise) e2eInitPromise = initE2E();
    return e2eInitPromise;
}
async function encryptForPeer(text) {
    if (!e2eSharedKey) return null;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, e2eSharedKey, new TextEncoder().encode(text));
    return { iv: b64encode(iv), ciphertext: b64encode(new Uint8Array(ctBuf)) };
}
async function decryptFromPeer(d) {
    if (!e2eSharedKey) throw new Error('e2e key not ready');
    const iv = b64decode(d.iv);
    const ctBytes = b64decode(d.ciphertext);
    const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, e2eSharedKey, ctBytes);
    const jsonStr = new TextDecoder().decode(ptBuf);
    try { return JSON.parse(jsonStr); }
    catch (e) { return { text: jsonStr, replySnippet: null }; } // tsohon tsari (kafin a fara boye reply snippet)
}
let decryptedCache = {};
let _renderChatFlowScheduled = false;
function scheduleRenderChatFlow() {
    if (_renderChatFlowScheduled) return;
    _renderChatFlowScheduled = true;
    setTimeout(() => { _renderChatFlowScheduled = false; renderChatFlow(); }, 0);
}
function ensureDecrypted(doc, d) {
    if (!d.encrypted || decryptedCache[doc.id] !== undefined) return;
    if (!e2eSharedKey) return; // tukuna ana initializing / peer bai buga public key ba
    decryptedCache[doc.id] = null; // sanya alama "ana aiki" domin kada mu sake fara decryption sau biyu
    decryptFromPeer(d).then(parsed => { decryptedCache[doc.id] = parsed; scheduleRenderChatFlow(); })
      .catch(() => { decryptedCache[doc.id] = { text: '🔒 [Could not decrypt this message]', replySnippet: null }; scheduleRenderChatFlow(); });
}

// ── Ɓoye MEDIA (hoto/bidiyo/murya): ana ɓoye ainihin bytes ɗin fayil kafin ya bar
// na'urar, ana turawa backend a matsayin blob mai duhu (opaque), ana buɗe shi ne
// kawai a bangaren mai karɓa bayan an sauke shi. IYAKA: an rasa progressive video
// streaming — dole a sauke sannan a buɗe fayil ɗin gaba ɗaya kafin a iya kunna shi.
async function encryptFileForUpload(file) {
    await Promise.race([ensureE2EReady(), new Promise((res) => setTimeout(res, 3000))]);
    if (!e2eSharedKey) return { file, iv: null, mimeType: file.type, encrypted: false };
    const buf = await file.arrayBuffer();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, e2eSharedKey, buf);
    // Suna na bazata (ba sunan fayil na asali ba, ba '.enc' ba) — domin URL/storage key
    // dinsa bai bayyana ko wane irin fayil ne ba (hoto/bidiyo/murya) ko ko an boye shi.
    // '.bin' na gama-gari ne kawai, baya bayyana komai — ainihin mimetype yana ajiye a
    // Firestore (mimeType field), ba a bukatar extension din URL don buɗe fayil ɗin daga baya.
    const randomName = 'm' + Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b => b.toString(16).padStart(2, '0')).join('') + '.bin';
    const encFile = new File([ctBuf], randomName, { type: 'application/octet-stream' });
    return { file: encFile, iv: b64encode(iv), mimeType: file.type, encrypted: true };
}
let decryptedMediaCache = {};
async function decryptMediaToBlobUrl(url, iv, mimeType) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Could not download file');
    const ctBuf = await resp.arrayBuffer();
    const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64decode(iv) }, e2eSharedKey, ctBuf);
    return URL.createObjectURL(new Blob([ptBuf], { type: mimeType || 'application/octet-stream' }));
}
function ensureMediaDecrypted(cacheKey, mediaUrl, iv, mimeType, onReady) {
    if (decryptedMediaCache[cacheKey] !== undefined) {
        if (decryptedMediaCache[cacheKey] && decryptedMediaCache[cacheKey] !== 'error') onReady(decryptedMediaCache[cacheKey]);
        return;
    }
    if (!e2eSharedKey) return; // tukuna ana jiran key exchange
    decryptedMediaCache[cacheKey] = null;
    decryptMediaToBlobUrl(mediaUrl, iv, mimeType).then(blobUrl => {
        decryptedMediaCache[cacheKey] = blobUrl;
        onReady(blobUrl);
    }).catch(err => {
        console.error('Media decrypt error:', err);
        decryptedMediaCache[cacheKey] = 'error';
        scheduleRenderChatFlow();
    });
}
// Dawo da URL da za a yi amfani da ita YANZU (cached blob idan an riga an buɗe, ko d.mediaUrl
// idan ba a ɓoye ba); a lokaci guda tana fara aikin buɗewa a bango idan har yanzu ba a yi ba.
function resolveMediaSrc(cacheKey, url, iv, mimeType, elId) {
    if (!iv) return url;
    const cached = decryptedMediaCache[cacheKey];
    if (cached && cached !== 'error') return cached;
    ensureMediaDecrypted(cacheKey, url, iv, mimeType, (blobUrl) => {
        const el = document.getElementById(elId);
        if (el) { el.src = blobUrl; el.classList.add('media-loaded'); }
    });
    return '';
}

const NX_BLANK_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23262626'/%3E%3C/svg%3E";
// Load header info
function populateChatHeaderInfo() {
    document.getElementById('chat-header-name').textContent = chatWith;
    { const _av = document.getElementById('chat-header-avatar'); _av.onerror = () => { _av.onerror = null; _av.src = NX_BLANK_AVATAR; }; _av.src = NX_BLANK_AVATAR; }

    db.collection('users').doc(chatWith).get().then(doc => {
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('chat-header-name').textContent = d.username || chatWith;
            if (d.userProfilePic) document.getElementById('chat-header-avatar').src = d.userProfilePic;
        }
    });
}

// ── Voice Call Button ──────────────────────────
function handleVoiceCall() {
    if (typeof NexusCall !== 'undefined') {
        NexusCall.startCall(chatWith);
    } else {
        alert('Call engine is loading...');
    }
}

function handleVideoCall() {
    if (typeof NexusVideo !== 'undefined') {
        NexusVideo.startVideoCall(chatWith);
    }
   }

function openChatInfo() {
    document.getElementById('chatInfoName').textContent = document.getElementById('chat-header-name').textContent;
    document.getElementById('chatInfoAvatar').src = document.getElementById('chat-header-avatar').src;
    document.getElementById('chatInfoStatus').textContent = document.getElementById('chat-status-line').textContent;
    document.getElementById('chatInfoCreateGroupLabel').textContent = 'Create group with ' + document.getElementById('chat-header-name').textContent;
    db.collection('personalChats').doc(chatRoomId).get().then(doc => {
        const d = doc.data() || {};
        const muted = !!(d.mutedBy && d.mutedBy[myId]);
        document.getElementById('chatInfoMuteState').textContent = muted ? 'On' : 'Off';
        const disap = d.disappearing && d.disappearing[myId];
        document.getElementById('chatInfoDisappearState').textContent = disap ? disap + 'h' : 'Off';
        const advPriv = !!(d.advancedPrivacy && d.advancedPrivacy[myId]);
        document.getElementById('chatInfoAdvPrivState').textContent = advPriv ? 'On' : 'Off';
    }).catch(() => {});
    db.collection('users').doc(myId).get().then(doc => {
        const dd = doc.data() || {};
        const blocked = (dd.blocked || []).includes(chatWith);
        document.getElementById('chatInfoBlockLabel').textContent = blocked ? 'Unblock' : 'Block';
        const fav = (dd.favourites || []).includes(chatWith);
        document.getElementById('chatInfoFavLabel').textContent = fav ? 'Remove from Favourites' : 'Add to Favourites';
    }).catch(() => {});
    document.getElementById('chatInfoMediaVisState').textContent = localStorage.getItem('nexus_mediavis_' + chatRoomId) === 'off' ? 'Off' : 'On';
    document.getElementById('chatInfoLockState').textContent = localStorage.getItem('nexus_chatlock_' + chatRoomId) === 'on' ? 'On' : 'Off';
    document.getElementById('chatInfoTranslateState').textContent = localStorage.getItem('nexus_translate_' + chatRoomId) === 'on' ? 'On' : 'Off';
    document.getElementById('chatInfoThemeState').textContent = localStorage.getItem('nexus_theme_' + myId) || 'Nexus';
    loadRecentMediaForOverlay();
    loadOverlayCounts();
    loadGroupsInCommon();
    { const av = document.getElementById('chatInfoAvatar'); av.onerror = () => { av.onerror = null; av.src = NX_BLANK_AVATAR; }; if (!av.getAttribute('src')) av.src = NX_BLANK_AVATAR; }
    document.getElementById('chatInfoOverlay').style.display = 'flex';
    document.getElementById('chatInfoOverlay').scrollTop = 0;
    document.body.classList.add('ci-info-open');
    nxScreenshotGuard(true);
    if (!nxOvHas('info')) nxOvPush('info', nxHideChatInfo);
}
function nxHideChatInfo() {
    document.getElementById('chatInfoOverlay').style.display = 'none';
    document.body.classList.remove('ci-info-open');
    nxScreenshotGuard(false);
}
function closeChatInfo() { if (nxOvHas('info')) nxOvBack(); else nxHideChatInfo(); }
// ── Screenshot guard for the contact-info page ──
// A web page cannot truly stop a phone's own screenshot; that needs the native shell (Android FLAG_SECURE).
// We do everything a page can: tell the native shell to secure the window (if there is one), react to
// desktop screenshot shortcuts, block save/long-press on the photo and hide the page when printing.
let nxShotOn = false, nxShotTimer = null;
function nxShowShotBlock() {
    let el = document.getElementById('nxShotBlock');
    if (!el) { el = document.createElement('div'); el.id = 'nxShotBlock'; el.textContent = "Sorry, can't take screenshot of this page."; document.body.appendChild(el); }
    el.classList.add('show');
    clearTimeout(nxShotTimer);
    nxShotTimer = setTimeout(() => el.classList.remove('show'), 2200);
    try { if (navigator.clipboard) navigator.clipboard.writeText(' ').catch(() => {}); } catch (e) {}
}
function nxShotKey(e) {
    const k = (e.key || '').toLowerCase();
    const combo = k === 'printscreen' || (e.metaKey && e.shiftKey && ['3','4','5','s'].includes(k)) || (e.ctrlKey && e.shiftKey && k === 's') || (e.ctrlKey && k === 'p');
    if (combo) { e.preventDefault(); nxShowShotBlock(); }
}
function nxShotCtx(e) { if (e.target && e.target.closest && e.target.closest('#chatInfoOverlay')) e.preventDefault(); }
function nxScreenshotGuard(on) {
    try { if (window.NexusNative && typeof NexusNative.setSecure === 'function') NexusNative.setSecure(!!on); } catch (e) {}
    try { if (window.Android && typeof Android.setSecure === 'function') Android.setSecure(!!on); } catch (e) {}
    if (on && !nxShotOn) { nxShotOn = true; window.addEventListener('keydown', nxShotKey, true); window.addEventListener('keyup', nxShotKey, true); document.addEventListener('contextmenu', nxShotCtx, true); }
    if (!on && nxShotOn) { nxShotOn = false; window.removeEventListener('keydown', nxShotKey, true); window.removeEventListener('keyup', nxShotKey, true); document.removeEventListener('contextmenu', nxShotCtx, true); }
}



function openStarredMessages() {
    db.collection('personalChats').doc(chatRoomId).collection('messages')
      .where('starredBy.' + myId, '==', true).get().then(snap => {
          if (snap.empty) { alert('No starred messages in this chat yet.'); return; }
          let list = [];
          snap.forEach(doc => { const d = doc.data(); list.push(d.text || (d.type ? '[' + d.type + ']' : '[sako]')); });
          alert('Starred messages:\n\n' + list.join('\n---\n'));
      }).catch(() => alert('Failed to load.'));
}
function openSearchInChat() {
    if (!nxOvHas('search')) nxOvPush('search', nxHideSearchInChat);
    document.getElementById('chatSearchOverlay').style.display = 'flex';
    document.getElementById('chatSearchInput').value = '';
    document.getElementById('chatSearchResults').innerHTML = '';
    document.getElementById('chatSearchInput').focus();
}
function nxHideSearchInChat() { document.getElementById('chatSearchOverlay').style.display = 'none'; }
function closeSearchInChat() { if (nxOvHas('search')) nxOvBack(); else nxHideSearchInChat(); }
function runChatSearch(query) {
    const resultsEl = document.getElementById('chatSearchResults');
    if (!query || query.length < 2 || !latestMsgSnapshot) { resultsEl.innerHTML = ''; return; }
    const q = query.toLowerCase();
    let matches = [];
    latestMsgSnapshot.forEach(doc => {
        const d = doc.data();
        const decrypted = decryptedCache[doc.id];
        const text = d.encrypted ? (decrypted && decrypted.text) : d.text;
        if (text && text.toLowerCase().includes(q)) matches.push({ text, time: new Date(d.timestamp).toLocaleString() });
    });
    resultsEl.innerHTML = matches.length
        ? matches.map(m => `<div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);"><div style="color:#fff;font-size:13px;">${m.text}</div><div style="color:rgba(255,255,255,0.35);font-size:10.5px;margin-top:4px;">${m.time}</div></div>`).join('')
        : '<div style="padding:20px;color:rgba(255,255,255,0.3);text-align:center;font-size:12.5px;">No results</div>';
}
function toggleMediaVisibility() {
    const key = 'nexus_mediavis_' + chatRoomId;
    const isOff = localStorage.getItem(key) === 'off';
    localStorage.setItem(key, isOff ? 'on' : 'off');
    document.getElementById('chatInfoMediaVisState').textContent = isOff ? 'On' : 'Off';
    document.getElementById('chat-flow').classList.toggle('hide-media', !isOff);
}
function toggleChatTheme() {
    const themes = ['Nexus', 'Midnight', 'Rose'];
    const current = localStorage.getItem('nexus_theme_' + myId) || 'Nexus';
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    localStorage.setItem('nexus_theme_' + myId, next);
    document.getElementById('chatInfoThemeState').textContent = next;
    applyChatTheme(next);
}
function applyChatTheme(theme) {
    const root = document.getElementById('page-content');
    const map = {
        Nexus: { user: 'linear-gradient(135deg, #b8963a 0%, #a3812c 100%)', cyan: '#00F2FF' },
        Midnight: { user: 'linear-gradient(135deg, #2c3e91 0%, #1a1f4d 100%)', cyan: '#5b8cff' },
        Rose: { user: 'linear-gradient(135deg, #c23a6b 0%, #8a1f4a 100%)', cyan: '#ff5c8a' }
    };
    const t = map[theme] || map.Nexus;
    if (root) { root.style.setProperty('--user-bubble', t.user); root.style.setProperty('--cyan-neon', t.cyan); }
}
function toggleDisappearingMessages() {
    const hoursStr = prompt('After how many hours should messages disappear for you? (0 = off)');
    if (hoursStr === null) return;
    const hours = parseInt(hoursStr, 10) || 0;
    db.collection('personalChats').doc(chatRoomId).set({
        disappearing: { [myId]: hours || firebase.firestore.FieldValue.delete() }
    }, { merge: true }).then(() => {
        document.getElementById('chatInfoDisappearState').textContent = hours ? hours + 'h' : 'Off';
    }).catch(() => alert('Failed to update.'));
}
function toggleChatLock() {
    const key = 'nexus_chatlock_' + chatRoomId;
    const isOn = localStorage.getItem(key) === 'on';
    if (!isOn) {
        const pin = prompt('Set a PIN to lock this chat on your device:');
        if (!pin) return;
        localStorage.setItem(key, 'on');
        localStorage.setItem(key + '_pin', pin);
    } else {
        const pin = prompt('Enter PIN to unlock:');
        if (pin !== localStorage.getItem(key + '_pin')) { alert('Incorrect PIN.'); return; }
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_pin');
    }
    document.getElementById('chatInfoLockState').textContent = !isOn ? 'On' : 'Off';
}
function toggleAdvancedPrivacy() {
    db.collection('personalChats').doc(chatRoomId).get().then(doc => {
        const d = doc.data() || {};
        const current = !!(d.advancedPrivacy && d.advancedPrivacy[myId]);
        return db.collection('personalChats').doc(chatRoomId).set({
            advancedPrivacy: { [myId]: !current }
        }, { merge: true }).then(() => {
            document.getElementById('chatInfoAdvPrivState').textContent = !current ? 'On' : 'Off';
        });
    }).catch(() => alert('Failed to update.'));
}
function toggleTranslateMessages() {
    const key = 'nexus_translate_' + chatRoomId;
    const isOn = localStorage.getItem(key) === 'on';
    localStorage.setItem(key, isOn ? 'off' : 'on');
    document.getElementById('chatInfoTranslateState').textContent = isOn ? 'Off' : 'On';
    if (!isOn) alert('Translate turned on. Note: no translation API is wired into this codebase yet, so messages will not actually be translated until a backend translation service is connected.');
}
function loadGroupsInCommon() {
    const listEl = document.getElementById('chatInfoGroupsList');
    const labelEl = document.getElementById('chatInfoGroupsLabel');
    listEl.innerHTML = '';
    db.collection('groups').where('members', 'array-contains', myId).get().then(snap => {
        const common = [];
        snap.forEach(doc => {
            const d = doc.data();
            if ((d.members || []).includes(chatWith)) common.push(d.groupName || 'Group');
        });
        labelEl.textContent = common.length ? common.length + ' Group in common' : 'No groups in common';
        listEl.innerHTML = common.map(name => `<div class="ci-row" style="cursor:default;"><i class="fa-solid fa-users" style="width:20px;color:rgba(255,255,255,0.5);"></i><span style="color:#fff;font-size:13px;">${name}</span></div>`).join('');
    }).catch(() => { labelEl.textContent = 'Groups in common'; });
}
function createGroupWithPeer() {
    if (window.NexusRouter && typeof NexusRouter.navigateTo === 'function') {
        NexusRouter.navigateTo(`group.html?create=1&with=${encodeURIComponent(chatWith)}`);
    } else {
        window.location.href = `group.html?create=1&with=${encodeURIComponent(chatWith)}`;
    }
}
function addPeerToGroup() {
    if (window.NexusRouter && typeof NexusRouter.navigateTo === 'function') {
        NexusRouter.navigateTo(`group.html?addMember=${encodeURIComponent(chatWith)}`);
    } else {
        window.location.href = `group.html?addMember=${encodeURIComponent(chatWith)}`;
    }
}
function toggleFavourite() {
    db.collection('users').doc(myId).get().then(doc => {
        const fav = ((doc.data() || {}).favourites || []).includes(chatWith);
        const op = fav ? firebase.firestore.FieldValue.arrayRemove(chatWith) : firebase.firestore.FieldValue.arrayUnion(chatWith);
        return db.collection('users').doc(myId).set({ favourites: op }, { merge: true }).then(() => {
            document.getElementById('chatInfoFavLabel').textContent = fav ? 'Add to Favourites' : 'Remove from Favourites';
        });
    }).catch(() => alert('Failed to update.'));
}
async function exportChatHistory() {
    try {
        const snap = await db.collection('personalChats').doc(chatRoomId).collection('messages').orderBy('timestamp', 'asc').get();
        let lines = [];
        for (const doc of snap.docs) {
            const d = doc.data();
            const who = d.senderId === myId ? 'Ni' : chatWith;
            const when = new Date(d.timestamp).toLocaleString();
            let text = d.text || ('[' + (d.type || 'sako') + ']');
            if (d.encrypted) {
                try { const parsed = await decryptFromPeer(d); text = parsed.text; } catch (e) { text = '🔒 [could not decrypt]'; }
            }
            lines.push(`[${when}] ${who}: ${text}`);
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `chat-${chatWith}-${Date.now()}.txt`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('Failed to export chat: ' + e.message);
    }
}

function toggleMuteChat() {
    db.collection('personalChats').doc(chatRoomId).get().then(doc => {
        const d = doc.data() || {};
        const currentlyMuted = !!(d.mutedBy && d.mutedBy[myId]);
        return db.collection('personalChats').doc(chatRoomId).set({
            mutedBy: { [myId]: !currentlyMuted }
        }, { merge: true }).then(() => {
            document.getElementById('chatInfoMuteState').textContent = !currentlyMuted ? 'On' : 'Off';
        });
    }).catch(() => alert('Failed to change mute setting: try again.'));
}
function blockPeerUser() {
    const label = document.getElementById('chatInfoBlockLabel');
    const willBlock = label.textContent === 'Block';
    if (!confirm(willBlock ? `Tabbatar ka toshe ${chatWith}?` : `Cire toshi daga ${chatWith}?`)) return;
    const op = willBlock ? firebase.firestore.FieldValue.arrayUnion(chatWith) : firebase.firestore.FieldValue.arrayRemove(chatWith);
    db.collection('users').doc(myId).set({ blocked: op }, { merge: true }).then(() => {
        label.textContent = willBlock ? 'Unblock' : 'Block';
    }).catch(() => alert('Failed to complete action: try again.'));
}
function reportPeerUser() {
    const reason = prompt(`Me ya sa kake son ba da rahoton ${chatWith}?`);
    if (!reason) return;
    db.collection('reports').add({
        reporterId: myId, reportedId: chatWith, reason, timestamp: Date.now()
    }).then(() => alert('Report sent. Thank you.'))
      .catch(() => alert('Failed to send report: try again.'));
}
let myClearedAt = null;
function clearChatHistory() {
    if (!confirm('Are you sure you want to clear this whole chat on your device?')) return;
    const now = Date.now();
    db.collection('personalChats').doc(chatRoomId).set({
        clearedAt: { [myId]: now }
    }, { merge: true }).then(() => {
        myClearedAt = now;
        closeChatInfo();
        renderChatFlow();
    }).catch(() => alert('Failed to clear chat: try again.'));
}



// ══════════════════════════════════════════════
//  MESSAGING
// ══════════════════════════════════════════════
function wireMessagingUI() {
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');

    msgInput.addEventListener('focus', () => {
        // 'dvh' + resizes-content yana rage layout din nan take, amma mu tabbata
        // chat din ya kasance a kasa domin sabon sako baya boyewa a bayan keyboard.
        const cf = document.getElementById('chat-flow');
        requestAnimationFrame(() => { if (cf) cf.scrollTop = cf.scrollHeight; });
        setTimeout(() => { if (cf) cf.scrollTop = cf.scrollHeight; }, 150);
    });
    msgInput.addEventListener('input', function() {
        autoExpand(this);
        toggleButtons();
        notifyTyping();
    });
    msgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendNeuralMessage();
        }
    });
    sendBtn.addEventListener('click', sendNeuralMessage);

    // Lura: an cire tsohuwar JS na 'keyboard offset' (visualViewport) a nan — yanzu
    // muna amfani da <meta viewport interactive-widget=resizes-content> + 100dvh don
    // browser din kansa ya rage layout din daidai lokacin da keyboard ya bude, ba tare
    // da JS hack ba. Wancan JS din shine ainihin abin da ke haddasa "bar din ba ta
    // bayyana ba a farko" da "tsalle zuwa hoto na sama" — yana fafitika da resize na
    // browser din kansa, yana sanya double-offset.

   listenToNexusMessages();
    ensureE2EReady();
    // NexusCall.init()/NexusVideo.init() BA A SAKE kiran su a nan — call.js
    // da video-call.js sun rigaya suna kiran wannan KANSU sau daya kadai a
    // duk zangon SPA (duba bootNexusCall/bootNexusVideo a karshen su). Sake
    // kiransu duk lokacin da aka bude chat yana ninka listeners din
    // (nan ne dalilin call din yake lalacewa bayan yin amfani da app na wani lokaci).
} 

// Muna bibiyar ko mai amfani YANA a kasan chat din da kansa (ta hanyar scroll na gaskiya),
// maimakon mu auna scrollHeight bayan kowane render — domin hotuna/bidiyo da basu
// gama loading ba tukuna suna bada karyar height wanda ke sanya app din ta yi
// auto-scroll ba dole ba yayin da mutum yake duban tsofaffin hotuna.
let isUserNearBottom = true;
let unseenWhileScrolledUp = 0;
function updateScrollToBottomBtn() {
    const btn = document.getElementById('scrollToBottomBtn');
    if (!btn) return;
    if (isUserNearBottom) {
        btn.style.display = 'none';
        unseenWhileScrolledUp = 0;
    } else {
        btn.style.display = 'flex';
    }
    const badge = document.getElementById('scrollToBottomBadge');
    if (badge) {
        if (unseenWhileScrolledUp > 0) { badge.style.display = 'flex'; badge.textContent = unseenWhileScrolledUp > 9 ? '9+' : String(unseenWhileScrolledUp); }
        else badge.style.display = 'none';
    }
}
function scrollChatToBottom() {
    const cf = document.getElementById('chat-flow');
    if (!cf) return;
    isUserNearBottom = true;
    unseenWhileScrolledUp = 0;
    cf.scrollTo({ top: cf.scrollHeight, behavior: 'smooth' });
    updateScrollToBottomBtn();
}
function wireScrollTracking() {
    const cf = document.getElementById('chat-flow');
    if (!cf) return;
    cf.addEventListener('scroll', () => {
        const near = (cf.scrollHeight - cf.scrollTop - cf.clientHeight) < 80;
        if (near !== isUserNearBottom) { isUserNearBottom = near; updateScrollToBottomBtn(); }
    });
}
window.addEventListener('pageshow', (e) => {
    const cf = document.getElementById('chat-flow');
    if (!cf) return;
    isUserNearBottom = true;
    requestAnimationFrame(() => { cf.scrollTop = cf.scrollHeight; });
    setTimeout(() => { cf.scrollTop = cf.scrollHeight; }, 300);
});
let latestMsgSnapshot = null;
let pendingMessages = []; // {id, kind, file, url, progress, status: 'uploading'|'failed'}

let msgUnsubscribe = null;
let typingUnsubscribe = null;

function listenToNexusMessages() {
    // Idan aka riga aka saurara (misali init() ya sake gudana ba tare da
    // destroy() tsakani ba), fara rufe tsofaffin listeners kafin sabbin.
    if (msgUnsubscribe) { msgUnsubscribe(); msgUnsubscribe = null; }
    if (typingUnsubscribe) { typingUnsubscribe(); typingUnsubscribe = null; }

    db.collection('personalChats').doc(chatRoomId).set({
        unreadCount: { [myId]: 0 }
    }, { merge: true }).catch(err => console.error('Reset unread error:', err));

    msgUnsubscribe = db.collection('personalChats').doc(chatRoomId).collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
          if (latestMsgSnapshot && !isUserNearBottom) {
              snapshot.docChanges().forEach(ch => {
                  if (ch.type === 'added' && ch.doc.data().senderId !== myId) unseenWhileScrolledUp++;
              });
          }
          latestMsgSnapshot = snapshot;
          renderChatFlow();
          updateScrollToBottomBtn();
      });

    // ── Typing indicator: bibiyar filin typing.{chatWith} akan doc na dakin chat ──
    typingUnsubscribe = db.collection('personalChats').doc(chatRoomId).onSnapshot((doc) => {
        const d = doc.data();
        peerIsTyping = !!(d && d.typing && d.typing[chatWith]);
        updateStatusLine();
    });

    listenToPeerPresence();
    startMyPresenceHeartbeat();
}

// ══════════════════════════════════════════════
//  PRESENCE (real online/typing/last-seen — ba hardcoded ba)
// ══════════════════════════════════════════════
let peerPresenceUnsubscribe = null;
let peerIsTyping = false;
let peerIsOnline = false;
let peerLastSeen = null;
let myPresenceInterval = null;
const PRESENCE_STALE_MS = 60000; // idan lastSeen ya wuce minti 1 ba a sabunta ba, a nuna a matsayin offline

function updateStatusLine() {
    const statusEl = document.getElementById('chat-status-line');
    if (!statusEl) return;
    if (peerIsTyping) {
        statusEl.textContent = 'yana rubutu...';
        statusEl.style.color = 'var(--cyan-neon)';
    } else if (peerIsOnline) {
        statusEl.textContent = '● Active now';
        statusEl.style.color = '';
    } else if (peerLastSeen) {
        statusEl.textContent = 'last seen ' + formatLastSeen(peerLastSeen);
        statusEl.style.color = 'rgba(255,255,255,0.45)';
    } else {
        statusEl.textContent = '';
    }
}
function formatLastSeen(ts) {
    const d = ts && ts.toDate ? ts.toDate() : new Date(ts);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    return d.toLocaleDateString();
}
function listenToPeerPresence() {
    if (peerPresenceUnsubscribe) { peerPresenceUnsubscribe(); peerPresenceUnsubscribe = null; }
    peerPresenceUnsubscribe = db.collection('users').doc(chatWith).onSnapshot((doc) => {
        const d = doc.data();
        const stale = d && d.lastSeen && (Date.now() - d.lastSeen.toMillis()) > PRESENCE_STALE_MS;
        peerIsOnline = !!(d && d.online) && !stale;
        peerLastSeen = (d && d.lastSeen) || null;
        updateStatusLine();
    });
}
function writeMyPresence(online) {
    if (!myId) return;
    db.collection('users').doc(myId).set({
        online: online,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
}
function startMyPresenceHeartbeat() {
    stopMyPresenceHeartbeat();
    writeMyPresence(true);
    myPresenceInterval = setInterval(() => writeMyPresence(true), 15000);
    document.addEventListener('visibilitychange', handleVisibilityForPresence);
    window.addEventListener('pagehide', handlePageHideForPresence);
}
function stopMyPresenceHeartbeat() {
    if (myPresenceInterval) { clearInterval(myPresenceInterval); myPresenceInterval = null; }
    document.removeEventListener('visibilitychange', handleVisibilityForPresence);
    window.removeEventListener('pagehide', handlePageHideForPresence);
}
function handleVisibilityForPresence() {
    writeMyPresence(document.visibilityState === 'visible');
}
function handlePageHideForPresence() {
    writeMyPresence(false);
}

function stopListeningToNexusMessages() {
    if (msgUnsubscribe) { msgUnsubscribe(); msgUnsubscribe = null; }
    if (typingUnsubscribe) { typingUnsubscribe(); typingUnsubscribe = null; }
    if (peerPresenceUnsubscribe) { peerPresenceUnsubscribe(); peerPresenceUnsubscribe = null; }
}

// ── Rubuta filin typing.{myId} lokacin da nake buga rubutu ──
let typingOffTimer = null;
function setTypingState(isTyping) {
    db.collection('personalChats').doc(chatRoomId).set({
        typing: { [myId]: isTyping }
    }, { merge: true }).catch(() => {});
}
function notifyTyping() {
    if (captionModeActive) return; // rubuta caption ba "typing to peer" ba ne har sai an tura
    setTypingState(true);
    clearTimeout(typingOffTimer);
    typingOffTimer = setTimeout(() => setTypingState(false), 2500);
}

// ── chat surface: SAME markup + classes as group.html (chat-shared.css) ──
function nxEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function nxClock(ts) {
    const dt = ts ? new Date(ts) : new Date();
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}
function nxDayLabel(ts) {
    const d = new Date(ts);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const y = new Date(today); y.setDate(y.getDate() - 1);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    if (dd.getTime() === today.getTime()) return 'Today';
    if (dd.getTime() === y.getTime()) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}
const NX_TICK_SVG = '<svg viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5.2l3 3L10.3 1.4M6 7.8l1 1L14.3 1.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function nxTicksHTML(d, isMe) {
    if (!isMe) return '';
    return `<span class="msg-ticks ${d && d.seenAt ? 'read' : ''}">${NX_TICK_SVG}</span>`;
}
function nxStarFlag(d) { return (d.starredBy && d.starredBy[myId]) ? '<i class="fa-solid fa-star msg-star-flag"></i>' : ''; }
function nxReactionsHTML(d) {
    if (!d.reactions || !Object.keys(d.reactions).length) return '';
    const counts = {};
    Object.values(d.reactions).forEach(e => { counts[e] = (counts[e] || 0) + 1; });
    return `<div class="msg-reactions">${Object.entries(counts).map(([e, c]) => `<span class="msg-reaction-pill">${e} ${c}</span>`).join('')}</div>`;
}
function nxReplyQuoteHTML(d, snippet) {
    if (!d.replyTo) return '';
    const mine = d.replyTo.senderId === myId;
    const rid = d.replyTo.id ? `onclick="event.stopPropagation(); nxJumpToMessage('${nxEsc(d.replyTo.id)}')"` : '';
    return `<div class="msg-reply-quote" ${rid}><span class="rq-main"><span class="rq-name">${mine ? 'You' : nxEsc(chatWith)}</span><span class="rq-text">${nxEsc(snippet || '')}</span></span></div>`;
}
function nxJumpToMessage(id) {
    const el = document.querySelector(`#chat-flow [data-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const card = el.querySelector('.msg-card');
    if (card) { card.style.transition = 'box-shadow .3s'; card.style.boxShadow = '0 0 0 2px var(--neon-cyan)'; setTimeout(() => { card.style.boxShadow = ''; }, 900); }
}
function nxPeerAvatarHTML(grouped) {
    const img = document.getElementById('chat-header-avatar');
    const src = img && img.getAttribute('src') && !/dicebear\.com/i.test(img.getAttribute('src')) ? img.getAttribute('src') : '';
    return src ? `<img class="msg-avatar" src="${nxEsc(src)}" alt="">` : `<span class="msg-avatar msg-avatar-empty"></span>`;
}
// body of a message (everything inside .msg-body) + whether the card is a media card
function nxMessageBody(doc, d, isMe, time, ticks) {
    const timeInline = `<span class="msg-time-inline">${time}${ticks}</span>`;
    let mediaCard = false, body = '', transparent = false;
    if ((d.type === 'image' || d.type === 'video') && d.viewOnce) {
        const opened = !!d.viewOnceOpenedAt;
        const label = opened ? 'Opened' : (d.type === 'video' ? 'Video' : 'Photo');
        const clickable = (!isMe && !opened) ? `onclick="openViewOnceMedia('${doc.id}')"` : '';
        body = `<div class="vo-tile ${opened ? 'vo-dead' : ''}" ${clickable}><span class="vo-ico">1</span><span class="vo-label">${label}</span><span class="vo-time">${time}${ticks}</span></div>`;
    } else if (d.type === 'image' || d.type === 'video') {
        mediaCard = true;
        const isVid = d.type === 'video';
        const elId = (isVid ? 'vid_' : 'img_') + doc.id;
        const src = resolveMediaSrc(doc.id, d.mediaUrl, d.iv, d.mimeType, elId);
        const lockBadge = (d.iv && !src) ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(0,0,0,0.35);">🔒</div>' : '';
        const openUrl = d.iv ? (decryptedMediaCache[doc.id] || '') : d.mediaUrl;
        const capText = resolveCaption(doc, d);
        const overlay = capText ? '' : mediaTimeOverlay(time, ticks);
        const el = isVid
            ? `<video id="${elId}" src="${src}" preload="metadata" muted playsinline style="pointer-events:none;" onloadeddata="this.classList.add('media-loaded')"></video>${videoIndicator()}`
            : `<img id="${elId}" src="${src}" onload="this.classList.add('media-loaded')">`;
        body = `<div class="media-wrap" onclick="${isVid ? 'openVideoViewer' : 'openImageViewer'}('${openUrl}')">${el}${lockBadge}${overlay}</div>`
             + (capText ? `<div class="media-caption">${nxEsc(capText)}${timeInline}</div>` : '');
    } else if (d.type === 'imageGroup') {
        mediaCard = true;
        body = buildImageGrid(d.mediaArr || [], time, doc.id, ticks);
    } else if (d.type === 'videoNote') {
        const vnId = 'vidnote_' + doc.id;
        const src = resolveMediaSrc(doc.id, d.mediaUrl, d.iv, d.mimeType, vnId);
        transparent = true;
        body = `<div style="width:180px;height:180px;border-radius:50%;overflow:hidden;background:#111;position:relative;cursor:pointer;" onclick="${src ? `document.getElementById('${vnId}').paused ? document.getElementById('${vnId}').play() : document.getElementById('${vnId}').pause()` : ''}">`
             + (src ? `<video id="${vnId}" src="${src}" playsinline loop style="width:100%;height:100%;object-fit:cover;"></video>` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;">🔒</div>`)
             + `</div><span class="msg-time-inline" style="float:none;display:block;text-align:${isMe ? 'right' : 'left'};margin-top:2px;">${time}${ticks}</span>`;
    } else if (d.type === 'audio') {
        const audioId = 'audio_' + doc.id;
        const src = resolveMediaSrc(doc.id, d.mediaUrl, d.iv, d.mimeType, audioId);
        body = `<div class="voice-card">
                    <button class="play-btn" onclick="toggleAudioPlay('${audioId}', this)"><i class="fa-solid fa-play play-icon"></i></button>
                    <div class="waveform">${[8,16,12,20,10,14,6,18,9].map(h => `<bar style="height:${h}px"></bar>`).join('')}</div>
                    <span class="speed-btn" onclick="nxCycleAudioSpeed('${audioId}', this)">1x</span>
                </div>
                <audio id="${audioId}" src="${src}" style="display:none;"></audio>${d.iv && !src ? '🔒' : ''}${timeInline}`;
    } else if (d.type === 'location') {
        const mapUrl = `https://maps.google.com/?q=${d.lat},${d.lng}`;
        body = `<a href="${mapUrl}" target="_blank" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;min-width:180px;">
                    <div style="width:40px;height:40px;border-radius:10px;background:rgba(52,199,89,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-location-dot" style="color:#34c759;"></i></div>
                    <div style="min-width:0;"><div style="font-weight:700;font-size:12.5px;">Location</div><div style="font-size:10.5px;color:rgba(255,255,255,0.5);">Tap to open in maps</div></div>
                </a>${timeInline}`;
    } else if (d.type === 'contact') {
        body = `<div style="display:flex;align-items:center;gap:10px;min-width:180px;">
                    <div style="width:40px;height:40px;border-radius:50%;background:rgba(0,180,255,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-user" style="color:#0ab4ff;"></i></div>
                    <div style="min-width:0;"><div style="font-weight:700;font-size:12.5px;">${nxEsc(d.contactName || 'Contact')}</div><div style="font-size:10.5px;color:rgba(255,255,255,0.5);">${nxEsc(d.contactPhone || '')}</div></div>
                </div>${timeInline}`;
    } else if (d.type === 'poll') {
        const options = (d.options || []).map(opt => `<div style="padding:6px 10px;border:1px solid rgba(255,255,255,0.12);border-radius:8px;font-size:12px;margin-top:5px;">☐ ${nxEsc(opt)}</div>`).join('');
        body = `<div style="min-width:180px;"><div style="font-weight:700;font-size:12.5px;"><i class="fa-solid fa-square-poll-vertical" style="color:#ff9f0a;"></i> ${nxEsc(d.question || 'Poll')}</div>${options}</div>${timeInline}`;
    } else if (d.type === 'event') {
        body = `<div style="display:flex;align-items:center;gap:10px;min-width:180px;">
                    <div style="width:40px;height:40px;border-radius:10px;background:rgba(255,45,85,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-calendar-days" style="color:#ff2d55;"></i></div>
                    <div style="min-width:0;"><div style="font-weight:700;font-size:12.5px;">${nxEsc(d.eventTitle || 'Event')}</div><div style="font-size:10.5px;color:rgba(255,255,255,0.5);">${nxEsc(d.eventDate || '')}</div></div>
                </div>${timeInline}`;
    } else if (d.type === 'document') {
        body = `<a href="${nxEsc(d.mediaUrl)}" target="_blank" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;min-width:180px;">
                    <div style="width:40px;height:40px;border-radius:10px;background:rgba(175,82,222,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-file-lines" style="color:#af52de;"></i></div>
                    <div style="min-width:0;overflow:hidden;"><div style="font-weight:700;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nxEsc(d.fileName || 'File')}</div><div style="font-size:10.5px;color:rgba(255,255,255,0.5);">${nxEsc(d.fileSize || '')}</div></div>
                </a>${timeInline}`;
    } else {
        let bodyText, quoteSnippet;
        if (d.encrypted) {
            ensureDecrypted(doc, d);
            const cached = decryptedCache[doc.id];
            bodyText = cached ? cached.text : '🔒 …';
            quoteSnippet = d.replyTo ? (cached ? (cached.replySnippet || '') : '🔒 …') : null;
        } else {
            bodyText = d.text;
            quoteSnippet = d.replyTo ? d.replyTo.snippet : null;
        }
        body = `${nxReplyQuoteHTML(d, quoteSnippet)}${nxEsc(bodyText)}${timeInline}`;
    }
    return { body, mediaCard, transparent };
}
function nxBuildMessageRow(doc, d, ctx) {
    const isMe = ctx.isMe;
    const time = d.timestamp ? nxClock(d.timestamp) : nxClock();
    const ticks = nxTicksHTML(d, isMe);
    const r = nxMessageBody(doc, d, isMe, time, ticks);
    const pos = ctx.grouped ? (ctx.nextGrouped ? 'middle' : 'last') : (ctx.nextGrouped ? 'first' : 'single');
    const row = document.createElement('div');
    row.className = `message-row ${isMe ? 'row-outgoing' : 'row-incoming'} ${ctx.spacingClass}`;
    row.setAttribute('data-id', doc.id);
    row.innerHTML = `<div class="msg-row ${isMe ? 'outgoing' : 'incoming'} ${ctx.grouped ? 'grouped-follow' : ''} pos-${pos}" style="position:relative;">
        <div class="msg-card ${r.mediaCard ? 'media-card' : ''}"${r.transparent ? ' style="background:transparent;box-shadow:none;padding:0;"' : ''}>
            ${nxStarFlag(d)}
            <div class="msg-body">${r.body}</div>
            ${nxReactionsHTML(d)}
        </div>
    </div>`;
    return { row, card: row.querySelector('.msg-card') };
}

// ── Keyed incremental renderer ──────────────────────────────────────────────
// Only rows whose content really changed are rebuilt; everything else stays in the DOM untouched,
// so scrolling never jumps, media never reloads and long-press / swipe state is not lost.
const NX_E2E_NOTICE = `<i class="fa-solid fa-lock"></i> Messages and calls are end-to-end encrypted. No one outside this chat, not even Nexus, can read or listen to them.`;
function nxMsgSig(doc, d, grouped, nextGrouped) {
    const c = decryptedCache[doc.id], cc = decryptedCache[doc.id + '_cap'];
    let s;
    try { s = JSON.stringify(d); } catch (e) { s = String(Math.random()); }
    return s + '|' + (grouped ? 1 : 0) + (nextGrouped ? 1 : 0) + '|' + (c ? c.text : (c === null ? 'p' : '')) + '|' + (cc ? cc.text : '');
}
function renderChatFlow() {
    const chatFlow = document.getElementById('chat-flow');
    if (!chatFlow) return;
    const wasNearBottom = isUserNearBottom;

    // remember where the user is looking so nothing can move under their finger
    let anchorEl = null, anchorTop = 0;
    if (!wasNearBottom) {
        const top = chatFlow.getBoundingClientRect().top;
        for (const ch of chatFlow.children) {
            const r = ch.getBoundingClientRect();
            if (r.bottom > top + 1) { anchorEl = ch; anchorTop = r.top; break; }
        }
    }

    const desired = [];   // {key, sig, build}
    desired.push({ key: 'e2e', sig: '1', build: () => { const n = document.createElement('div'); n.className = 'e2e-notice'; n.innerHTML = NX_E2E_NOTICE; return { el: n }; } });
    let lastIsMe = null;
    if (latestMsgSnapshot) {
        const items = [];
        latestMsgSnapshot.forEach((doc) => {
            const d = doc.data();
            if (myClearedAt && d.timestamp && d.timestamp < myClearedAt) return; // an goge tattaunawar kafin wannan lokacin
            items.push({ doc, d, isMe: d.senderId === myId, day: d.timestamp ? nxDayLabel(d.timestamp) : 'Today' });
        });
        let lastDay = null, lastSender = null;
        items.forEach((it, i) => {
            const { doc, d, isMe } = it;
            lastIsMe = isMe;
            if (!isMe && !d.seenAt && !seenMarkedIds.has(doc.id)) {
                seenMarkedIds.add(doc.id);
                db.collection('personalChats').doc(chatRoomId).collection('messages').doc(doc.id)
                  .update({ seenAt: Date.now() }).catch(() => {});
            }
            if (it.day !== lastDay) {
                const label = it.day;
                desired.push({ key: 'day:' + label + ':' + doc.id, sig: label, build: () => {
                    const divider = document.createElement('div');
                    divider.className = 'day-divider';
                    divider.innerHTML = `<span>${label}</span>`;
                    return { el: divider };
                } });
                lastDay = it.day; lastSender = null;
            }
            const grouped = lastSender === isMe && !d.replyTo;
            const nx = items[i + 1];
            const nextGrouped = !!nx && nx.isMe === isMe && !nx.d.replyTo && nx.day === it.day;
            lastSender = isMe;
            desired.push({
                key: 'm:' + doc.id,
                sig: nxMsgSig(doc, d, grouped, nextGrouped),
                build: () => {
                    const built = nxBuildMessageRow(doc, d, { isMe, grouped, nextGrouped, spacingClass: grouped ? 'msg-grouped' : '' });
                    attachLongPress(built.card, doc.id, d);
                    if (selectedMessages.has(doc.id)) built.row.classList.add('selected-highlight');
                    built.card.querySelectorAll('img, video').forEach(el => {
                        const evt = el.tagName === 'VIDEO' ? 'loadedmetadata' : 'load';
                        el.addEventListener(evt, () => { if (isUserNearBottom) chatFlow.scrollTop = chatFlow.scrollHeight; }, { once: true });
                    });
                    return { el: built.row };
                }
            });
        });
    }
    pendingMessages.forEach((pm) => {
        const spacingClass = lastIsMe === true ? 'msg-grouped' : '';
        lastIsMe = true;
        desired.push({ key: 'p:' + pm.id, sig: pm.status + '|' + pm.kind + '|' + spacingClass, build: () => ({ el: buildPendingRow(pm, spacingClass) }) });
    });

    // reconcile
    const existing = new Map();
    for (const ch of Array.from(chatFlow.children)) if (ch.dataset && ch.dataset.key) existing.set(ch.dataset.key, ch);
    const used = new Set();
    let cur = chatFlow.firstChild;
    desired.forEach(item => {
        let node = existing.get(item.key);
        if (!node || node.dataset.sig !== item.sig) {
            node = item.build().el;
            node.dataset.key = item.key;
            node.dataset.sig = item.sig;
        }
        used.add(node);
        if (node === cur) cur = cur.nextSibling;
        else chatFlow.insertBefore(node, cur);
    });
    Array.from(chatFlow.children).forEach(ch => { if (!used.has(ch)) ch.remove(); });

    const hasNewOutgoing = (latestMsgSnapshot && latestMsgSnapshot.docs.length && latestMsgSnapshot.docs[latestMsgSnapshot.docs.length - 1].data().senderId === myId) || pendingMessages.length > 0;
    if (wasNearBottom || (hasNewOutgoing && nxLastRenderedCount !== desired.length)) {
        isUserNearBottom = true;
        requestAnimationFrame(() => { chatFlow.scrollTop = chatFlow.scrollHeight; });
        setTimeout(() => { if (isUserNearBottom) chatFlow.scrollTop = chatFlow.scrollHeight; }, 60);
        setTimeout(() => { if (isUserNearBottom) chatFlow.scrollTop = chatFlow.scrollHeight; }, 500);
    } else if (anchorEl && anchorEl.isConnected) {
        const delta = anchorEl.getBoundingClientRect().top - anchorTop;
        if (Math.abs(delta) > 0.5) chatFlow.scrollTop += delta;
    }
    nxLastRenderedCount = desired.length;
}
let nxLastRenderedCount = 0;

function buildPendingRow(pm, spacingClass) {
    const row = document.createElement('div');
    row.className = `message-row row-outgoing ${spacingClass}`;
    row.id = 'pending-row-' + pm.id;
    let inner;
    if (pm.kind === 'audio') {
        inner = `<div class="msg-card"><div class="msg-body">
            <div class="pending-audio-row">
                <div style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">🎤</div>
                <div class="pending-audio-track"><div class="pending-audio-fill" id="pending-fill-${pm.id}" style="width:${pm.progress}%;"></div></div>
                <span id="pending-pct-${pm.id}" style="font-size:9.5px;color:rgba(255,255,255,0.6);">${pm.status === 'failed' ? '!' : pm.progress + '%'}</span>
            </div></div></div>`;
    } else {
        const mediaTag = pm.kind === 'video'
            ? `<video src="${pm.url}" muted playsinline class="media-loaded"></video>`
            : `<img src="${pm.url}" class="media-loaded">`;
        const overlay = pm.status === 'failed'
            ? `<div class="media-sending media-failed" style="cursor:pointer;" onclick="retryPendingUpload('${pm.id}')">Failed — tap to retry</div>`
            : `<div class="media-sending"><div class="media-spinner"></div><span class="pending-pct" id="pending-pct-${pm.id}">${pm.progress}%</span></div>`;
        inner = `<div class="msg-card media-card"><div class="msg-body"><div class="media-wrap">${mediaTag}${overlay}</div></div></div>`;
    }
    row.innerHTML = `<div class="msg-row outgoing pos-single" style="position:relative;">${inner}</div>`;
    return row;
}

function addPendingMessage(pm) {
    pendingMessages.push(pm);
    renderChatFlow();
}
function removePendingMessage(id) {
    pendingMessages = pendingMessages.filter(p => p.id !== id);
    renderChatFlow();
}
function updatePendingProgress(id, pct) {
    const pm = pendingMessages.find(p => p.id === id);
    if (pm) pm.progress = pct;
    // Lokaci-lokaci kawai ake update -- kada mu sake gina dukkan chat, mu dinga canza rubutu/faɗi kai tsaye don sauri
    const pctEl = document.getElementById('pending-pct-' + id);
    if (pctEl) pctEl.textContent = pct + '%';
    const fillEl = document.getElementById('pending-fill-' + id);
    if (fillEl) fillEl.style.width = pct + '%';
}
function markPendingFailed(id) {
    const pm = pendingMessages.find(p => p.id === id);
    if (pm) pm.status = 'failed';
    renderChatFlow();
}

// Ainihin rubutawa Firestore — ana amfani da ita duka don sakon kai-tsaye da wanda ke fita daga offline queue
function sendQuickLike() {
    sendNeuralMessageDirect('👍', null);
}

// ══════════════════════════════════════════════
//  VIDEO NOTE (gajeriyar bidiyo mai zagaye) — real recorder
// ══════════════════════════════════════════════
let videoNoteStream = null;
let videoNoteRecorder = null;
let videoNoteChunks = [];
let videoNoteBlob = null;
let videoNoteTimerInterval = null;
let videoNoteSeconds = 0;
const VIDEO_NOTE_MAX_SECONDS = 30;

async function openVideoNoteRecorder() {
    document.getElementById('videoNoteOverlay').style.display = 'flex';
    document.getElementById('videoNoteLive').style.display = 'block';
    document.getElementById('videoNotePreview').style.display = 'none';
    document.getElementById('videoNoteControls').style.display = 'flex';
    document.getElementById('videoNotePreviewControls').style.display = 'none';
    document.getElementById('videoNoteTimer').textContent = '0:00';
    videoNoteBlob = null;
    try {
        videoNoteStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
        document.getElementById('videoNoteLive').srcObject = videoNoteStream;
    } catch (err) {
        alert('Could not access camera/microphone: ' + err.message);
        closeVideoNoteRecorder();
    }
}
function closeVideoNoteRecorder() {
    if (videoNoteRecorder && videoNoteRecorder.state === 'recording') videoNoteRecorder.stop();
    if (videoNoteStream) { videoNoteStream.getTracks().forEach(t => t.stop()); videoNoteStream = null; }
    if (videoNoteTimerInterval) { clearInterval(videoNoteTimerInterval); videoNoteTimerInterval = null; }
    videoNoteChunks = [];
    videoNoteBlob = null;
    videoNoteSeconds = 0;
    document.getElementById('videoNoteOverlay').style.display = 'none';
}
function toggleVideoNoteRecording() {
    if (!videoNoteStream) return;
    if (videoNoteRecorder && videoNoteRecorder.state === 'recording') {
        videoNoteRecorder.stop();
        return;
    }
    videoNoteChunks = [];
    videoNoteSeconds = 0;
    videoNoteRecorder = new MediaRecorder(videoNoteStream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm' });
    videoNoteRecorder.ondataavailable = (e) => { if (e.data.size > 0) videoNoteChunks.push(e.data); };
    videoNoteRecorder.onstop = () => {
        videoNoteBlob = new Blob(videoNoteChunks, { type: 'video/webm' });
        videoNoteStream.getTracks().forEach(t => t.stop());
        videoNoteStream = null;
        clearInterval(videoNoteTimerInterval);
        const url = URL.createObjectURL(videoNoteBlob);
        const previewEl = document.getElementById('videoNotePreview');
        previewEl.src = url;
        document.getElementById('videoNoteLive').style.display = 'none';
        previewEl.style.display = 'block';
        document.getElementById('videoNoteControls').style.display = 'none';
        document.getElementById('videoNotePreviewControls').style.display = 'flex';
    };
    videoNoteRecorder.start();
    document.getElementById('videoNoteRecordBtn').style.background = '#fff';
    videoNoteTimerInterval = setInterval(() => {
        videoNoteSeconds++;
        const m = Math.floor(videoNoteSeconds / 60), s = videoNoteSeconds % 60;
        document.getElementById('videoNoteTimer').textContent = `${m}:${String(s).padStart(2, '0')}`;
        if (videoNoteSeconds >= VIDEO_NOTE_MAX_SECONDS) videoNoteRecorder.stop();
    }, 1000);
}
function discardVideoNote() {
    videoNoteBlob = null;
    closeVideoNoteRecorder();
}
async function sendVideoNote() {
    if (!videoNoteBlob) return;
    await ciAuthReadyPromise;
    if (!firebase.auth().currentUser) { alert('Could not verify sign-in. Please log in again and retry.'); return; }
    try {
        const token = await firebase.auth().currentUser.getIdToken();
        const formData = new FormData();
        formData.append('file', videoNoteBlob, `videonote_${Date.now()}.webm`);
        formData.append('type', 'chatMedia');
        formData.append('username', chatRoomId);
        const res = await fetch('https://oryzon-backend-ed1q.onrender.com/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');
        await sendStructuredMessage('videoNote', { mediaUrl: data.url, mimeType: 'video/webm' }, '🎥 Video note');
        closeVideoNoteRecorder();
    } catch (err) {
        alert('Failed to send video note: ' + err.message);
    }
}

async function sendNeuralMessageDirect(text, replyPayload) {
    await ciAuthReadyPromise;
    if (!firebase.auth().currentUser) throw new Error('Not signed in (session missing)');

    // Jira E2E key ta shirya, amma kada mu tsayar da sakon har abada idan ta dauki lokaci
    // (misali peer din bai buga public key dinsa ba tukuna) — bayan dan lokaci mu ci gaba,
    // idan har yanzu babu key sai a tura plaintext (fallback mai aminci, ba ya toshe app din).
    await Promise.race([ensureE2EReady(), new Promise((res) => setTimeout(res, 3000))]);

    const payload = { senderId: myId, receiverId: chatWith, timestamp: Date.now() };
    const envelope = JSON.stringify({ text, replySnippet: replyPayload ? replyPayload.snippet : null });
    const enc = await encryptForPeer(envelope);
    if (enc) {
        payload.encrypted = true;
        payload.iv = enc.iv;
        payload.ciphertext = enc.ciphertext;
        payload.replyTo = replyPayload ? { id: replyPayload.id, senderId: replyPayload.senderId } : null; // babu snippet a bayyane
    } else {
        payload.encrypted = false;
        payload.text = text;
        payload.replyTo = replyPayload || null;
    }

    await db.collection('personalChats').doc(chatRoomId).collection('messages').add(payload);
    await db.collection('personalChats').doc(chatRoomId).set({
        lastMessage: enc ? '🔒 Message' : text.substring(0, 60),
        lastMessageEnc: enc ? { iv: enc.iv, ciphertext: enc.ciphertext } : null,
        lastMessageTime: Date.now(),
        members: [myId, chatWith],
        unreadCount: { [chatWith]: firebase.firestore.FieldValue.increment(1) }
    }, { merge: true });
}

async function sendNeuralMessage() {
    if (captionModeActive) { confirmCaptionSend(); return; }
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text) return;

    // Share input nan take (optimistic) — kada mai amfani ya jira network
    const replyPayload = activeReply ? { ...activeReply, snippet: document.getElementById('replyPreviewText').textContent } : null;
    cancelReply();
    input.value = '';
    autoExpand(input);
    toggleButtons();
    clearTimeout(typingOffTimer);
    setTypingState(false);

    // Babu Intanet? Ajiye sakon a layi (offline queue), za a tura da zarar an dawo
    if (!navigator.onLine) {
        queueOfflineTextMessage(text, replyPayload);
        return;
    }

    try {
        await sendNeuralMessageDirect(text, replyPayload);
    } catch (err) {
        console.error('Nexus send error:', err);
        alert('Message failed to send: ' + err.message);
        // Dawo da rubutun domin kada ya ɓace idan an kasa turawa
        input.value = text;
        autoExpand(input);
        toggleButtons();
    }
}

// ══════════════════════════════════════════════
//  OFFLINE QUEUE — sakonni na rubutu suna jira a localStorage har sai Intanet ya dawo
// ══════════════════════════════════════════════
function offlineQueueKey() { return 'nexus_offline_queue_' + chatRoomId; }
function queueOfflineTextMessage(text, replyPayload) {
    const queue = JSON.parse(localStorage.getItem(offlineQueueKey()) || '[]');
    queue.push({ text, replyPayload, ts: Date.now() });
    localStorage.setItem(offlineQueueKey(), JSON.stringify(queue));
    renderOfflineBanner();
}
async function flushOfflineQueue() {
    if (!navigator.onLine) return;
    const key = offlineQueueKey();
    const queue = JSON.parse(localStorage.getItem(key) || '[]');
    if (!queue.length) return;
    localStorage.removeItem(key);
    for (const item of queue) {
        try { await sendNeuralMessageDirect(item.text, item.replyPayload); }
        catch (e) { queueOfflineTextMessage(item.text, item.replyPayload); }
    }
    renderOfflineBanner();
}
function renderOfflineBanner() {
    let banner = document.getElementById('offlineBanner');
    const queueLen = JSON.parse(localStorage.getItem(offlineQueueKey()) || '[]').length;
    if (!navigator.onLine || queueLen > 0) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'offlineBanner';
            banner.style.cssText = 'position:fixed;top:56px;left:0;width:100%;background:#3a2a00;color:#ffd479;font-size:11px;text-align:center;padding:5px;z-index:9998;font-family:Inter,sans-serif;';
            document.body.appendChild(banner);
        }
        banner.textContent = !navigator.onLine
            ? '📴 Ba Intanet — sakonni za su tura da zarar an dawo'
            : `⏳ Ana tura sakonni ${queueLen} da suka jira...`;
    } else if (banner) {
        banner.remove();
    }
}
window.addEventListener('offline', renderOfflineBanner);
window.addEventListener('online', () => {
    renderOfflineBanner();
    flushOfflineQueue();
    pendingMessages.filter(p => p.status === 'failed').forEach(p => retryPendingUpload(p.id));
});
function wireOfflineHandling() {
    renderOfflineBanner();
    flushOfflineQueue();
}

function autoExpand(el) {
    if (!el.value) { el.style.height = ''; return; }   // empty -> back to the original one-line height
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function toggleButtons() {
    // Send icon din dole ya kasance koyaushe — bai kamata ya canza zuwa 👍 (voiceBtn)
    // a kowane lokaci, ko da rubutu babu shi.
    document.getElementById('voiceBtn').style.display = 'none';
    document.getElementById('sendBtn').style.display = 'flex';
}

// ══════════════════════════════════════════════
//  MEDIA UPLOAD (Camera / Gallery / Voice)
// ══════════════════════════════════════════════
// Matsa girman hoto kafin upload (canvas resize + JPEG quality) — babban dalilin
// jinkirin 20-second din da aka fara ambata shine girman fayil, ba cold-start kadai ba.
function compressImageFile(file, maxDim = 1600, quality = 0.75) {
    return new Promise((resolve) => {
        if (!file.type || !file.type.startsWith('image/') || file.type === 'image/gif') { resolve(file); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
                    else { width = Math.round(width * maxDim / height); height = maxDim; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (!blob || blob.size >= file.size) { resolve(file); return; }
                    resolve(new File([blob], file.name.replace(/\.(png|jpe?g|webp)$/i, '.jpg'), { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}
// ── Matsa girman bidiyo kafin upload (ffmpeg.wasm) ──
// An lazy-load ffmpeg.wasm ne kawai idan an fara tura bidiyo — domin kada mu dora
// nauyin ~30MB na wasm a duk lokacin da mutum ya bude chat idan ba ya tura bidiyo.
// ffmpeg.js/util UMD wrappers dinsu ma yanzu ana lazy-load su nan, ba a
// PAGE_SCRIPTS/native <script> ba, domin kada su toshe chat-interior.js
// daga gudana da wuri (shi ke haddasa "delay" kafin chat history ya bayyana).
let ffmpegInstance = null;
let ffmpegLoadPromise = null;
let ffmpegLibsPromise = null;
function loadFFmpegLibs() {
    if (window.FFmpegWASM && window.FFmpegUtil) return Promise.resolve();
    if (!ffmpegLibsPromise) {
        ffmpegLibsPromise = Promise.all([
            loadExternalScriptOnce('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js'),
            loadExternalScriptOnce('https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js')
        ]);
    }
    return ffmpegLibsPromise;
}
function loadExternalScriptOnce(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Failed to load: ' + src));
        document.body.appendChild(s);
    });
}
async function getFFmpeg() {
    if (ffmpegInstance) return ffmpegInstance;
    if (!ffmpegLoadPromise) {
        ffmpegLoadPromise = (async () => {
            await loadFFmpegLibs();
            const { FFmpeg } = FFmpegWASM;
            const { toBlobURL } = FFmpegUtil;
            const ffmpeg = new FFmpeg();
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            ffmpegInstance = ffmpeg;
            return ffmpeg;
        })();
    }
    return ffmpegLoadPromise;
}
async function compressVideoFile(file, onProgress, hdMode) {
    // Kada mu dagula karamin fayil (misali <2.5MB) — riga ya isa girmansa.
    if (file.size < 2.5 * 1024 * 1024) return file;
    try {
        const ffmpeg = await getFFmpeg();
        const { fetchFile } = FFmpegUtil;
        const stamp = Date.now();
        const inputName = 'in_' + stamp + (file.name.match(/\.\w+$/)?.[0] || '.mp4');
        const outputName = 'out_' + stamp + '.mp4';
        const progressHandler = ({ progress }) => { if (onProgress) onProgress(Math.max(0, Math.min(99, Math.round(progress * 100)))); };
        ffmpeg.on('progress', progressHandler);
        await ffmpeg.writeFile(inputName, await fetchFile(file));
        // Rage zuwa max 720px (ko 1080px a HD mode) a gefen da ya fi girma, H.264, audio AAC —
        // daidaito mai kyau tsakanin girman fayil da inganci.
        const maxDim = hdMode ? 1080 : 720;
        const crf = hdMode ? 22 : 28;
        await ffmpeg.exec([
            '-i', inputName,
            '-vf', `scale='min(${maxDim},iw)':'min(${maxDim},ih)':force_original_aspect_ratio=decrease`,
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf),
            '-c:a', 'aac', '-b:a', hdMode ? '160k' : '96k',
            '-movflags', '+faststart',
            outputName
        ]);
        ffmpeg.off('progress', progressHandler);
        const data = await ffmpeg.readFile(outputName);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        await ffmpeg.deleteFile(inputName).catch(() => {});
        await ffmpeg.deleteFile(outputName).catch(() => {});
        if (!blob.size || blob.size >= file.size) return file; // idan bai taimaka ba, mu yi amfani da na asali
        return new File([blob], file.name.replace(/\.\w+$/, '.mp4'), { type: 'video/mp4' });
    } catch (err) {
        console.error('Video compression error, ana amfani da fayil na asali:', err);
        return file; // kada compression ya toshe aika sakon idan ya kasa
    }
}
async function xhrUploadFile(file, roomId, onProgress) {
    // Backend din yanzu yana buƙatar requireAuth akan /upload — mu tura Firebase ID token
    // a matsayin Authorization header, in ba haka ba za a samu 401.
    const token = await firebase.auth().currentUser.getIdToken();
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'chatMedia');
        formData.append('username', roomId);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://oryzon-backend-ed1q.onrender.com/upload');
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                // Mu tsaya a 99% har sai an tabbata an gama, domin server na iya ɗaukar ɗan lokaci
                // yana processing bayan an gama karɓar bytes ɗin (misali cold-start na Render).
                onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
            }
        };
        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && data.success) resolve({ url: data.url, key: data.key });
                else reject(new Error(data.error || 'Upload failed'));
            } catch (e) {
                reject(new Error('Amsa mara inganci daga server'));
            }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
    });
}
async function deleteFromBackend(key) {
    if (!key) return;
    try {
        const token = await firebase.auth().currentUser.getIdToken();
        await fetch('https://oryzon-backend-ed1q.onrender.com/delete', {
            method: 'DELETE', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ key })
        });
    } catch (e) { console.warn('Backend delete error:', e); }
}

async function uploadAndSendMedia(file, kind, existingPendingId, caption, options) {
    options = options || {};
    const hdMode = !!options.hd;
    const viewOnce = !!options.viewOnce;
    await ciAuthReadyPromise;
    if (!firebase.auth().currentUser) {
        alert('Could not verify sign-in. Please log in again and retry.');
        return;
    }

    let pm;
    if (existingPendingId) {
        pm = pendingMessages.find(p => p.id === existingPendingId);
        if (!pm) return;
        pm.status = 'uploading';
        pm.progress = 0;
        renderChatFlow();
    } else {
        const id = 'p' + Date.now() + Math.random().toString(36).slice(2, 7);
        pm = { id, kind, file, caption: caption || '', url: (kind === 'image' || kind === 'video') ? URL.createObjectURL(file) : null, progress: 0, status: 'uploading' };
        addPendingMessage(pm);
    }

    try {
        // Preview ɗin fayil na asali ya riga ya bayyana nan take — compression tana gudana a bango,
        // sannan a ɓoye fayil ɗin (AES-GCM) kafin upload zuwa backend. HD toggle yana canja
        // ƙimar compression (girma/quality) — ba ya taɓa encryption.
        let uploadFile = pm.file;
        if (kind === 'image') {
            uploadFile = hdMode ? await compressImageFile(uploadFile, 2560, 0.9) : await compressImageFile(uploadFile);
        } else if (kind === 'video') {
            uploadFile = await compressVideoFile(uploadFile, (pct) => updatePendingProgress(pm.id, Math.min(30, Math.round(pct * 0.3))), hdMode);
        }

        // Bidiyo manya-manya (bayan compression) ba mu ɓoye su ba — domin kada mai
        // karɓa ya jira ya sauke fayil mai girma gaba ɗaya kafin ya iya kunna shi.
        const VIDEO_ENCRYPT_MAX = 15 * 1024 * 1024; // 15MB
        let encResult = (kind === 'video' && uploadFile.size > VIDEO_ENCRYPT_MAX)
            ? { file: uploadFile, iv: null, mimeType: uploadFile.type, encrypted: false }
            : await encryptFileForUpload(uploadFile);

        const progressCb = (pct) => {
            const base = kind === 'video' ? 30 : 0;
            updatePendingProgress(pm.id, base + Math.round(pct * (kind === 'video' ? 0.7 : 1)));
        };
        let uploaded;
        try {
            uploaded = await xhrUploadFile(encResult.file, chatRoomId, progressCb);
        } catch (uploadErr) {
            if (encResult.encrypted) {
                // Backend din ya ki wannan encrypted blob (misali yana bincika mimetype/hoto) —
                // koma zuwa fayil na asali ba tare da encryption ba maimakon kasa aika sakon gaba daya.
                console.warn('Encrypted upload failed, retrying without encryption:', uploadErr);
                uploaded = await xhrUploadFile(uploadFile, chatRoomId, progressCb);
                encResult = { file: uploadFile, iv: null, mimeType: uploadFile.type, encrypted: false };
            } else {
                throw uploadErr;
            }
        }
        updatePendingProgress(pm.id, 100);

        const lastLabel = kind === 'image' ? '📷 Photo' : kind === 'video' ? '🎥 Video' : '🎤 Voice message';
        const msgDoc = { senderId: myId, receiverId: chatWith, type: kind, mediaUrl: uploaded.url, storageKey: uploaded.key || null, timestamp: Date.now(), mimeType: encResult.mimeType };
        if (encResult.encrypted) { msgDoc.encrypted = true; msgDoc.iv = encResult.iv; }
        if (viewOnce) msgDoc.viewOnce = true;
        if (pm.caption) {
            const capEnc = await encryptForPeer(pm.caption);
            if (capEnc) { msgDoc.captionEncrypted = true; msgDoc.captionIv = capEnc.iv; msgDoc.captionCiphertext = capEnc.ciphertext; }
            else { msgDoc.caption = pm.caption; }
        }
        // Cire pending bubble KAFIN mu rubuta ainihin sako zuwa Firestore — in ba haka ba,
        // onSnapshot listener na iya nuna ainihin sako (real-time) KAFIN mu cire pending din,
        // sai a ga hoto/bidiyo ɗin sau BIYU na wani ɗan lokaci a 100%.
        if (pm.url) URL.revokeObjectURL(pm.url);
        removePendingMessage(pm.id);
        await db.collection('personalChats').doc(chatRoomId).collection('messages').add(msgDoc);
        await db.collection('personalChats').doc(chatRoomId).set({
            lastMessage: viewOnce ? '📷 View once photo' : (encResult.encrypted ? `🔒 ${lastLabel}` : lastLabel), lastMessageTime: Date.now(), members: [myId, chatWith],
            unreadCount: { [chatWith]: firebase.firestore.FieldValue.increment(1) }
        }, { merge: true });
    } catch (err) {
        console.error('Media upload error:', err);
        markPendingFailed(pm.id);
    }
}

function retryPendingUpload(id) {
    const pm = pendingMessages.find(p => p.id === id);
    if (!pm) return;
    uploadAndSendMedia(pm.file, pm.kind, id);
}

// ══════════════════════════════════════════════
//  CAPTION MODAL — irin na WhatsApp: nuna preview + damar rubuta caption
//  kafin a tura hoto/bidiyo guda ɗaya.
//  MUHIMMI: BA MU ƙirƙiri wani bar/textarea na daban ba don caption — muna DAGA
//  ainihin .input-area/#msgInput (wanda ke ƙasan chat) sama da wannan overlay ta
//  hanyar z-index. Gallery/camera/emoji suna ci gaba da aiki (ba a kashe su ba)
//  domin mai amfani ya iya canja hoto ko ƙara emoji kafin ya tura, kamar WhatsApp.
//
//  HOTO: capCanvas shine "source of truth" — rotate/text/sticker/draw duk ana
//  zana su kai-tsaye a kansa (nan take, babu ffmpeg da ake bukata).
//  BIDIYO: ba za a iya zana kai-tsaye a kan frame-frame na bidiyo a browser ba,
//  don haka muna amfani da capVideoOverlay — wani transparent canvas da ke zaune
//  a SAMAN video preview ɗin. Rotate/text/sticker/draw duk suna zuwa can. A
//  lokacin turawa (idan akwai wani abu a overlay ɗin, ko an juya bidiyon),
//  ffmpeg.wasm (wanda muke amfani da shi don compression tuni) yana "toya"
//  (bake) overlay ɗin da rotation ɗin cikin ainihin bidiyon kafin upload.
// ══════════════════════════════════════════════
let pendingCaptionFile = null;
let pendingCaptionKind = null;
let captionModeActive = false;
let savedDraftText = '';
let capCanvas = null;         // hoto: babban canvas (source of truth)
let capVideoOverlay = null;   // bidiyo: transparent overlay canvas (text/sticker/draw)
let capVideoEl = null;
let capRotation = 0;          // 0/90/180/270 — ana amfani da shi ga hoto DA bidiyo
let capHdMode = false;
let capViewOnce = false;
let capDrawMode = false;
let capDrawing = false;
let capLastPt = null;
let capOverlayUsed = false;   // bidiyo kawai: an zana wani abu a overlay?
let capVideoCrop = null;      // bidiyo: {x,y,w,h} a native pixel coords, null = babu crop
let capCropMode = false;

function openCaptionModal(file, kind) {
    const reopening = captionModeActive; // gallery/camera na iya canja fayil yayin da muke ciki tuni
    if (!reopening) { history.pushState({ captionOpen: true }, ''); captionHistoryPushed = true; }
    pendingCaptionFile = file;
    pendingCaptionKind = kind;
    capRotation = 0; capOverlayUsed = false; capVideoEl = null; capVideoCrop = null;
    cleanupAllSubModes(); // cire duk wani cropBox/drawToolBar/textToolOverlay da ya rage
    closeStickerPicker();

    const area = document.getElementById('captionPreviewArea');
    area.innerHTML = '';
    document.getElementById('captionOverlay').classList.add('show');
    document.getElementById('captionOverlay').style.transform = '';

    if (kind === 'image') {
        const img = new Image();
        img.onload = () => {
            capCanvas = document.createElement('canvas');
            capCanvas.width = img.naturalWidth; capCanvas.height = img.naturalHeight;
            capCanvas.getContext('2d').drawImage(img, 0, 0);
            area.innerHTML = '';
            area.appendChild(capCanvas);
            attachCapDrawHandlers(capCanvas, () => capCanvas);
        };
        img.src = URL.createObjectURL(file);
    } else {
        capCanvas = null;
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;max-width:100%;max-height:100%;display:flex;';
        capVideoEl = document.createElement('video');
        capVideoEl.src = URL.createObjectURL(file);
        capVideoEl.muted = true; capVideoEl.autoplay = true; capVideoEl.loop = true; capVideoEl.playsInline = true;
        capVideoEl.style.cssText = 'max-width:100%;max-height:100%;display:block;';
        wrap.appendChild(capVideoEl);
        area.innerHTML = '';
        area.appendChild(wrap);
        capVideoEl.addEventListener('loadedmetadata', () => {
            capVideoOverlay = document.createElement('canvas');
            capVideoOverlay.width = capVideoEl.videoWidth || 720;
            capVideoOverlay.height = capVideoEl.videoHeight || 1280;
            capVideoOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
            wrap.appendChild(capVideoOverlay);
            attachCapDrawHandlers(capVideoOverlay, () => capVideoOverlay, true);
        });
    }

    const recipName = document.getElementById('chat-header-name').textContent || chatWith;
    document.getElementById('captionRecipientPill').textContent = recipName;

    if (!reopening) {
        const msgInput = document.getElementById('msgInput');
        savedDraftText = msgInput.value; // adana duk wani draft da mai amfani yake rubutawa a chat
        msgInput.value = '';
        msgInput.placeholder = 'Add a caption…';
        autoExpand(msgInput);
        captionModeActive = true;
        toggleButtons();
        document.querySelector('.input-area').classList.add('caption-active');
        insertViewOnceBtn();
        setTimeout(() => msgInput.focus(), 50);
    }
}
function insertViewOnceBtn() {
    if (document.getElementById('viewOnceBtn')) return;
    capViewOnce = false;
    const btn = document.createElement('button');
    btn.id = 'viewOnceBtn';
    btn.className = 'action-trigger';
    btn.style.cssText = 'flex-shrink:0;width:34px;height:34px;margin-left:8px;background:rgba(255,255,255,0.14);';
    btn.title = 'View once';
    btn.innerHTML = '<span style="font-size:12px;font-weight:800;color:#fff;">1×</span>';
    btn.onclick = () => {
        capViewOnce = !capViewOnce;
        btn.style.background = capViewOnce ? 'var(--cyan-neon)' : 'rgba(255,255,255,0.14)';
        btn.querySelector('span').style.color = capViewOnce ? '#000' : '#fff';
    };
    const voiceBtn = document.getElementById('voiceBtn');
    voiceBtn.parentNode.insertBefore(btn, voiceBtn);
}
function removeViewOnceBtn() {
    const btn = document.getElementById('viewOnceBtn');
    if (btn) btn.remove();
}
function exitCaptionMode() {
    captionModeActive = false;
    document.querySelector('.input-area').classList.remove('caption-active');
    removeViewOnceBtn();
    const msgInput = document.getElementById('msgInput');
    msgInput.placeholder = 'Message...';
    msgInput.value = savedDraftText; // mayar da draft din chat da ya kasance kafin caption
    autoExpand(msgInput);
    toggleButtons();
}
function confirmDiscardPhoto() {
    document.getElementById('discardDialogBackdrop').classList.add('show');
}
// Idan an danna back button na wayar/browser yayin da caption editor ke bude, kada mu
// bar shafin ya fice — mu nuna discard dialog daidai kamar dannawa akan X.
// (An mayar da wannan — an rasa shi lokacin da aka raba fayil zuwa SPA, shi ya sa
// danna crop/draw/text sai ya "fitar" mu daga page din: babu abin da ke toshe
// popstate, don haka router.js ya rinjaye ya yi cikakken SPA navigation.)
window.addEventListener('popstate', () => {
    if (!captionHistoryPushed || !document.getElementById('captionOverlay').classList.contains('show')) return;
    history.pushState({ captionOpen: true }, ''); // sake "toshe" back din, mu yanke shawara a nan
    if (capCropMode) { cancelCropMode(); return; }
    if (capDrawMode) { toggleDrawMode(); return; }
    if (document.getElementById('textToolOverlay')) { cancelTextTool(); return; }
    confirmDiscardPhoto();
});

let captionHistoryPushed = false;
function hideDiscardDialog() {
    document.getElementById('discardDialogBackdrop').classList.remove('show');
    }
function closeCaptionModal() {
    document.getElementById('discardDialogBackdrop').classList.remove('show');
    document.getElementById('captionOverlay').classList.remove('show');
    document.getElementById('captionPreviewArea').innerHTML = '';
    pendingCaptionFile = null;
    pendingCaptionKind = null;
    capCanvas = null; capVideoOverlay = null; capVideoEl = null;
    closeStickerPicker();
    cleanupAllSubModes();
    exitCaptionMode();
    if (captionHistoryPushed) { captionHistoryPushed = false; history.back(); } // share state din da muka tura
    document.getElementById('galleryInput').click(); // mayar da mai amfani zuwa gallery, ba waje ba
}
async function confirmCaptionSend() {
    if (!pendingCaptionFile) return;
    const caption = document.getElementById('msgInput').value.trim();
    const file = pendingCaptionFile;
    const kind = pendingCaptionKind, hd = capHdMode, viewOnce = capViewOnce;
    const finish = (f) => {
        document.getElementById('captionOverlay').classList.remove('show');
        document.getElementById('captionPreviewArea').innerHTML = '';
        pendingCaptionFile = null; pendingCaptionKind = null; capCanvas = null; capVideoOverlay = null; capVideoEl = null;
        closeStickerPicker();
        cleanupAllSubModes();
        exitCaptionMode();
        if (captionHistoryPushed) { captionHistoryPushed = false; history.back(); }
        uploadAndSendMedia(f, kind, null, caption, { hd, viewOnce });
    };

    if (kind === 'image' && capCanvas) {
        capCanvas.toBlob((blob) => {
            finish(blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file);
        }, 'image/jpeg', 0.95);
        return;
    }

    if (kind === 'video' && (capRotation !== 0 || capOverlayUsed || capVideoCrop)) {
        try {
            const baked = await bakeVideoEdits(file, capRotation, capOverlayUsed ? capVideoOverlay : null, capVideoCrop);
            finish(baked || file); // idan baking ya kasa, mu tura fayil na asali maimakon mu toshe sending
        } catch (e) {
            console.error('Video bake error, ana tura fayil na asali:', e);
            finish(file);
        }
        return;
    }

    finish(file);
}
// ── Baking (rotate + overlay) na bidiyo ta amfani da ffmpeg.wasm — irin wannan
// muke amfani da shi don compression tuni, don haka babu ƙarin nauyi da za a dora. ──
async function bakeVideoEdits(file, rotation, overlayCanvas, cropRect) {
    const ffmpeg = await getFFmpeg();
    const { fetchFile } = FFmpegUtil;
    const stamp = Date.now();
    const inputName = 'edin_' + stamp + '.mp4';
    const outputName = 'edout_' + stamp + '.mp4';
    const overlayName = 'ovl_' + stamp + '.png';
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const filters = [];
    let lastLabel = '0:v';
    if (overlayCanvas) {
        const pngBlob = await new Promise((res) => overlayCanvas.toBlob(res, 'image/png'));
        await ffmpeg.writeFile(overlayName, await fetchFile(pngBlob));
        filters.push(`[${lastLabel}][1:v]overlay=0:0[ov]`);
        lastLabel = 'ov';
    }
    if (cropRect) {
        filters.push(`[${lastLabel}]crop=${Math.round(cropRect.w)}:${Math.round(cropRect.h)}:${Math.round(cropRect.x)}:${Math.round(cropRect.y)}[cr]`);
        lastLabel = 'cr';
    }
    if (rotation === 90) filters.push(`[${lastLabel}]transpose=1[rot]`);
    else if (rotation === 180) filters.push(`[${lastLabel}]transpose=1,transpose=1[rot]`);
    else if (rotation === 270) filters.push(`[${lastLabel}]transpose=2[rot]`);
    if (rotation !== 0) lastLabel = 'rot';

    const args = ['-i', inputName];
    if (overlayCanvas) args.push('-i', overlayName);
    args.push('-filter_complex', filters.join(';'), '-map', `[${lastLabel}]`, '-map', '0:a?', '-c:a', 'copy', outputName);

    await ffmpeg.exec(args);
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
    if (overlayCanvas) await ffmpeg.deleteFile(overlayName).catch(() => {});
    return new File([blob], 'video.mp4', { type: 'video/mp4' });
}

// ── Top-bar editing tools (hoto DA bidiyo) ──
function toggleHdMode() {
    capHdMode = !capHdMode;
    document.getElementById('hdToggleBtn').classList.toggle('active', capHdMode);
}
function downloadCaptionMedia() {
    if (!pendingCaptionFile) return;
    const a = document.createElement('a');
    a.href = capCanvas ? capCanvas.toDataURL('image/jpeg', 0.95) : URL.createObjectURL(pendingCaptionFile);
    a.download = pendingCaptionKind === 'video' ? 'video.mp4' : 'photo.jpg';
    document.body.appendChild(a); a.click(); a.remove();
}
function rotateCaptionMedia() {
    if (capCanvas) {
        // HOTO — ana juyawa nan take ta hanyar sake zana pixels (babu bukatar ffmpeg).
        // Muna amfani da replaceChild (BA innerHTML='' ba) domin kada mu goge cropBox
        // (wanda ke zaune a wuri guda a cikin #captionPreviewArea) — wannan shine ainihin
        // dalilin "shaking" din da aka gani a baya: destroy+recreate na cropBox.
        const src = capCanvas;
        const rotated = document.createElement('canvas');
        rotated.width = src.height; rotated.height = src.width;
        const ctx = rotated.getContext('2d');
        ctx.translate(rotated.width / 2, rotated.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(src, -src.width / 2, -src.height / 2);
        if (src.parentNode) src.parentNode.replaceChild(rotated, src);
        else document.getElementById('captionPreviewArea').appendChild(rotated);
        capCanvas = rotated;
        attachCapDrawHandlers(capCanvas, () => capCanvas);
    } else if (capVideoEl) {
        // BIDIYO — mu juya PREVIEW ɗin kawai a nan (CSS) domin mai amfani ya gani nan take;
        // ainihin juyawar bidiyon (ffmpeg) yana faruwa ne kawai a lokacin turawa (confirmCaptionSend).
        capRotation = (capRotation + 90) % 360;
        const wrap = capVideoEl.parentElement;
        wrap.style.transform = `rotate(${capRotation}deg)`;
        wrap.style.transformOrigin = 'center center';
    }
}
// ── Fullscreen sub-mode helper: yayin crop/draw/text, ana ɓoye chat chrome
// (top icons na caption da ainihin typing bar) — suna dawowa ne kawai bayan
// an fita daga sub-mode din, kamar yadda aka bukata. ──
function enterFullscreenSubMode() {
    document.querySelector('.input-area').style.display = 'none';
    document.getElementById('captionTopBar').style.display = 'none';
    document.getElementById('captionRecipientPill').style.display = 'none';
}
function exitFullscreenSubMode() {
    document.querySelector('.input-area').style.display = 'flex';
    document.getElementById('captionTopBar').style.display = 'flex';
    document.getElementById('captionRecipientPill').style.display = 'block';
}
function cleanupAllSubModes() {
    const box = document.getElementById('cropBox'); if (box) { if (box._cleanup) box._cleanup(); box.remove(); }
    const cbar = document.getElementById('cropBottomBar'); if (cbar) cbar.remove();
    const dbar = document.getElementById('drawToolBar'); if (dbar) dbar.remove();
    const sw = document.getElementById('colorSliderWrap'); if (sw) sw.remove();
    const tov = document.getElementById('textToolOverlay'); if (tov) tov.remove();
    capCropMode = false; capDrawMode = false;
    const cb = document.getElementById('cropBtnCap'); if (cb) cb.classList.remove('active');
    const db = document.getElementById('drawBtnCap'); if (db) db.classList.remove('active');
    exitFullscreenSubMode();
}

// ── CROP — fullscreen, kamar WhatsApp/native: dukkan kusurwoyi HUDU suna
// aiki (ba guda daya kawai ba), Cancel/Rotate/Done duk a kasa. Hoto: ana
// yankewa nan take (canvas). Bidiyo: ana ajiye rect, ffmpeg ke yankewa a
// lokacin turawa (bakeVideoEdits). ──
function toggleCropMode() {
    if (capCropMode) return;
    if (capDrawMode) toggleDrawMode(); // fita daga draw mode idan yana aiki
    const mediaEl = capCanvas || capVideoEl;
    if (!mediaEl) return;
    capCropMode = true;
    document.getElementById('cropBtnCap').classList.add('active');
    enterFullscreenSubMode();
    buildCropUI(mediaEl);
}
function buildCropUI(mediaEl) {
    const area = document.getElementById('captionPreviewArea');
    const oldBox = document.getElementById('cropBox');
    if (oldBox) { if (oldBox._cleanup) oldBox._cleanup(); oldBox.remove(); }
    const rect = mediaEl.getBoundingClientRect();
    const areaRect = area.getBoundingClientRect();
    const box = document.createElement('div');
    box.id = 'cropBox';
    const margin = 0; // crop box na farawa da CIKA hoto/bidiyo gaba daya (kamar native tool)
    const left = (rect.left - areaRect.left) + rect.width * margin;
    const top = (rect.top - areaRect.top) + rect.height * margin;
    const w = rect.width * (1 - margin * 2), h = rect.height * (1 - margin * 2);
    box.style.left = left + 'px'; box.style.top = top + 'px';
    box.style.width = w + 'px'; box.style.height = h + 'px';
    box.innerHTML = `<div class="crop-grid"></div>
        <div class="crop-edge ce-top"></div><div class="crop-edge ce-bottom"></div>
        <div class="crop-edge ce-left"></div><div class="crop-edge ce-right"></div>
        <div class="crop-handle ch-tl"></div><div class="crop-handle ch-tr"></div>
        <div class="crop-handle ch-bl"></div><div class="crop-handle ch-br"></div>`;
    area.appendChild(box);
    if (!document.getElementById('cropBottomBar')) {
        const bar = document.createElement('div');
        bar.id = 'cropBottomBar';
        bar.innerHTML = `
            <span class="crop-text-btn" onclick="cancelCropMode()">Cancel</span>
            <div class="cap-icon-btn" onclick="rotateInCropMode()"><i class="fa-solid fa-arrow-rotate-left"></i></div>
            <span class="crop-text-btn" onclick="doneCropMode()">Done</span>`;
        document.getElementById('captionOverlay').appendChild(bar);
    }
    attachCropDragHandlers(box, mediaEl);
}
function rotateInCropMode() {
    rotateCaptionMedia();
    requestAnimationFrame(() => requestAnimationFrame(() => buildCropUI(capCanvas || capVideoEl)));
}
// Kowace kusurwa 4 (tl/tr/bl/br) tana iya resize daga wancan gefen, ba guda daya kawai ba —
// kuma jawo akwatin kansa (ba kan handle ba) yana move shi (kamar WhatsApp).
function attachCropDragHandlers(box, mediaEl) {
    let mode = null, corner = null, startX = 0, startY = 0, startBox = null;
    let pendingGeom = null, rafScheduled = false;
    const MIN = 40;
    const bounds = () => mediaEl.getBoundingClientRect();
    const areaBounds = () => document.getElementById('captionPreviewArea').getBoundingClientRect();
    const pt = (e) => { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; };
    const curBox = () => ({ left: parseFloat(box.style.left), top: parseFloat(box.style.top), w: parseFloat(box.style.width), h: parseFloat(box.style.height) });
    // rAF-throttle: mu tara sabon geometry a wani variable, mu aikata rubutun DOM sau
    // guda kawai a kowace frame — wannan shine ke gyara "jerky/shaking" da aka bayar rahoto,
    // wanda ke faruwa idan aka rubuta style akan KOWACE taɓawa event (suna iya zuwa da
    // sauri fiye da yadda browser ke iya zana su).
    const scheduleApply = () => {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(() => {
            rafScheduled = false;
            if (!pendingGeom) return;
            box.style.left = pendingGeom.left + 'px'; box.style.top = pendingGeom.top + 'px';
            box.style.width = pendingGeom.w + 'px'; box.style.height = pendingGeom.h + 'px';
        });
    };

    const onMove = (e) => {
        if (!mode) return;
        e.preventDefault();
        const p = pt(e);
        const dx = p.x - startX, dy = p.y - startY;
        const mb = bounds(), ab = areaBounds();
        const minX = mb.left - ab.left, minY = mb.top - ab.top;
        const maxX = minX + mb.width, maxY = minY + mb.height;
        let { left, top, w, h } = startBox;
        if (mode === 'move') {
            left = Math.max(minX, Math.min(startBox.left + dx, maxX - w));
            top = Math.max(minY, Math.min(startBox.top + dy, maxY - h));
        } else if (mode === 'resize') {
            if (corner === 'br') {
                w = Math.max(MIN, Math.min(startBox.w + dx, maxX - left));
                h = Math.max(MIN, Math.min(startBox.h + dy, maxY - top));
            } else if (corner === 'tl') {
                const nl = Math.max(minX, startBox.left + dx), nt = Math.max(minY, startBox.top + dy);
                const rw = startBox.left + startBox.w - nl, rh = startBox.top + startBox.h - nt;
                if (rw >= MIN) { left = nl; w = rw; } else { w = MIN; left = startBox.left + startBox.w - MIN; }
                if (rh >= MIN) { top = nt; h = rh; } else { h = MIN; top = startBox.top + startBox.h - MIN; }
            } else if (corner === 'tr') {
                const nt = Math.max(minY, startBox.top + dy);
                w = Math.max(MIN, Math.min(startBox.w + dx, maxX - left));
                const rh = startBox.top + startBox.h - nt;
                if (rh >= MIN) { top = nt; h = rh; } else { h = MIN; top = startBox.top + startBox.h - MIN; }
            } else if (corner === 'bl') {
                const nl = Math.max(minX, startBox.left + dx);
                h = Math.max(MIN, Math.min(startBox.h + dy, maxY - top));
                const rw = startBox.left + startBox.w - nl;
                if (rw >= MIN) { left = nl; w = rw; } else { w = MIN; left = startBox.left + startBox.w - MIN; }
            }
        } else if (mode === 'edge') {
            if (corner === 'top') {
                const nt = Math.max(minY, startBox.top + dy);
                const rh = startBox.top + startBox.h - nt;
                if (rh >= MIN) { top = nt; h = rh; } else { h = MIN; top = startBox.top + startBox.h - MIN; }
            } else if (corner === 'bottom') {
                h = Math.max(MIN, Math.min(startBox.h + dy, maxY - top));
            } else if (corner === 'left') {
                const nl = Math.max(minX, startBox.left + dx);
                const rw = startBox.left + startBox.w - nl;
                if (rw >= MIN) { left = nl; w = rw; } else { w = MIN; left = startBox.left + startBox.w - MIN; }
            } else if (corner === 'right') {
                w = Math.max(MIN, Math.min(startBox.w + dx, maxX - left));
            }
        }
        pendingGeom = { left, top, w, h };
        scheduleApply();
    };
    const onEnd = () => { mode = null; corner = null; };
    const startMove = (e) => { mode = 'move'; const p = pt(e); startX = p.x; startY = p.y; startBox = curBox(); };
    const startResize = (c) => (e) => { e.stopPropagation(); mode = 'resize'; corner = c; const p = pt(e); startX = p.x; startY = p.y; startBox = curBox(); };
    // Edge din (gefe): jawo ko'ina a jikin border din (sama/kasa/hagu/dama) yana resize
    // daga wancan gefen KAWAI — kamar yadda WhatsApp/native tool ke yi, ba dole sai corners ba.
    const startEdge = (edgeName) => (e) => { e.stopPropagation(); mode = 'edge'; corner = edgeName; const p = pt(e); startX = p.x; startY = p.y; startBox = curBox(); };

    box.addEventListener('mousedown', startMove);
    box.addEventListener('touchstart', startMove, { passive: true });
    ['tl', 'tr', 'bl', 'br'].forEach(c => {
        const h = box.querySelector('.ch-' + c);
        h.addEventListener('mousedown', startResize(c));
        h.addEventListener('touchstart', startResize(c), { passive: false });
    });
    [['top', 'ce-top'], ['bottom', 'ce-bottom'], ['left', 'ce-left'], ['right', 'ce-right']].forEach(([name, cls]) => {
        const el = box.querySelector('.' + cls);
        el.addEventListener('mousedown', startEdge(name));
        el.addEventListener('touchstart', startEdge(name), { passive: false });
    });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    box._cleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchend', onEnd);
    };
}
function cancelCropMode() {
    capCropMode = false;
    document.getElementById('cropBtnCap').classList.remove('active');
    const box = document.getElementById('cropBox');
    if (box) { if (box._cleanup) box._cleanup(); box.remove(); }
    const bar = document.getElementById('cropBottomBar');
    if (bar) bar.remove();
    exitFullscreenSubMode();
}
function doneCropMode() {
    const box = document.getElementById('cropBox');
    const mediaEl = capCanvas || capVideoEl;
    if (!box || !mediaEl) { cancelCropMode(); return; }
    const mb = mediaEl.getBoundingClientRect();
    const bb = box.getBoundingClientRect();
    // Canja daga pixels na screen (CSS) zuwa ainihin pixels na hoto/bidiyo (native resolution)
    const nativeW = capCanvas ? capCanvas.width : capVideoEl.videoWidth;
    const nativeH = capCanvas ? capCanvas.height : capVideoEl.videoHeight;
    const scaleX = nativeW / mb.width, scaleY = nativeH / mb.height;
    const cx = Math.max(0, (bb.left - mb.left) * scaleX);
    const cy = Math.max(0, (bb.top - mb.top) * scaleY);
    const cw = Math.min(bb.width * scaleX, nativeW - cx);
    const ch = Math.min(bb.height * scaleY, nativeH - cy);

    if (capCanvas) {
        const cropped = document.createElement('canvas');
        cropped.width = cw; cropped.height = ch;
        cropped.getContext('2d').drawImage(capCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
        capCanvas = cropped;
        const area = document.getElementById('captionPreviewArea');
        cancelCropMode();
        area.innerHTML = '';
        area.appendChild(capCanvas);
        attachCapDrawHandlers(capCanvas, () => capCanvas);
        return;
    }
    // Bidiyo — ba mu iya yankewa nan take a browser ba, mu ajiye rect ɗin kawai;
    // ffmpeg zai yi ainihin crop ɗin a lokacin turawa (bakeVideoEdits).
    capVideoCrop = { x: cx, y: cy, w: cw, h: ch };
    cancelCropMode();
}

// ── TEXT TOOL — fullscreen, kamar WhatsApp: babban "Add text" a tsakiya,
// Cancel/Done a sama, jerin salo-salo (Aa) a kasa, ana zaɓar salo LIVE
// (WYSIWYG) kafin a "toya" a cikin hoto/bidiyo. ──
// ── TEXT TOOL — fullscreen, kamar WhatsApp: hoto/bidiyo yana CI GABA DA GANI
// (an ɗan duhunta shi kaɗan), rubutun yana zuwa a wani ƙaramin akwati mai
// auto-width (yana "hugging" rubutun kawai, BA duk shafin ba — wannan shine
// gyaran babban bug ɗin da ke sanya shafin ya zama fari/baƙar fanko), akwati
// ɗin draggable ne (za a iya ja shi zuwa ko'ina). Icon guda biyu a sama:
// alignment (hagu/tsakiya/dama) da salon akwati (A+, zaɓuɓɓuka 4). Launi
// yana fitowa ne daga SAME color slider ɗin da draw mode ke amfani da shi. ──
let capTextAlign = 'center';   // 'left' | 'center' | 'right'
let capTextBoxStyle = 0;       // 0=plain 1=solid-bg 2=outline 3=translucent-dark
let capTextPos = { x: 0.5, y: 0.5 }; // fraction dangane da girman AININHIN media (hoto/bidiyo)

// 8 presets guda daya-daya danna kai tsaye — daidai adadin da WhatsApp ke nunawa —
// kowanne yana hade da salon akwati (0-3) TARE da wani launi na musamman, don sauri.
// Color slider din yana nan ma don fine-tune bayan an zabi preset.
const TEXT_PRESETS = [
    { style: 0, color: '#ffffff' }, { style: 0, color: '#000000' },
    { style: 1, color: '#ffffff' }, { style: 1, color: '#000000' },
    { style: 1, color: '#ff3b30' }, { style: 1, color: '#33cc55' },
    { style: 3, color: '#ffffff' }, { style: 2, color: '#00e5ff' }
];
function startTextOverlay() {
    const target = capCanvas || capVideoOverlay;
    const mediaEl = capCanvas || capVideoEl;
    if (!target || !mediaEl) return;
    if (capDrawMode) toggleDrawMode();
    if (capCropMode) cancelCropMode();
    enterFullscreenSubMode();
    capTextAlign = 'center'; capTextBoxStyle = 0; capTextPos = { x: 0.5, y: 0.5 };

    const ov = document.createElement('div');
    ov.id = 'textToolOverlay';
    ov.innerHTML = `
        <div id="textToolTop">
            <span class="crop-text-btn" onclick="cancelTextTool()">Cancel</span>
            <div style="display:flex;gap:14px;">
                <div class="cap-icon-btn" onclick="cycleTextAlign()"><i class="fa-solid fa-align-center" id="textAlignIcon"></i></div>
                <div class="cap-icon-btn" onclick="cycleTextBoxStyle()">A+</div>
            </div>
            <span class="crop-text-btn" onclick="finishTextTool()">Done</span>
        </div>
        <div id="textToolDim"></div>
        <div id="textToolInputWrap">
            <div id="textToolInput" contenteditable="true" data-placeholder="Add text"></div>
        </div>
        <div id="textStyleRow"></div>`;
    document.getElementById('captionOverlay').appendChild(ov);
    const row = ov.querySelector('#textStyleRow');
    TEXT_PRESETS.forEach((p, i) => {
        const sw = document.createElement('div');
        sw.className = 'text-style-swatch';
        if (p.style === 1) { sw.style.background = p.color; sw.style.color = contrastColor(p.color); }
        else if (p.style === 2) { sw.style.background = 'transparent'; sw.style.border = `2px solid ${p.color}`; sw.style.color = p.color; }
        else if (p.style === 3) { sw.style.background = 'rgba(0,0,0,0.5)'; sw.style.color = p.color; }
        else { sw.style.background = 'rgba(255,255,255,0.08)'; sw.style.color = p.color; }
        sw.textContent = 'Aa';
        sw.onclick = () => {
            capTextBoxStyle = p.style; capDrawColor = p.color;
            const dot = document.getElementById('colorSliderDot'); if (dot) dot.style.background = p.color;
            applyLiveTextBoxStyle();
            row.querySelectorAll('.text-style-swatch').forEach(x => x.classList.remove('active'));
            sw.classList.add('active');
        };
        row.appendChild(sw);
    });
    applyTextBoxPosition();
    applyLiveTextBoxStyle();
    buildColorSlider();
    setupTextDrag(document.getElementById('textToolInputWrap'), document.getElementById('textToolInput'), mediaEl);
    setTimeout(() => document.getElementById('textToolInput').focus(), 80);
}
function applyTextBoxPosition() {
    const wrap = document.getElementById('textToolInputWrap');
    const mediaEl = capCanvas || capVideoEl;
    const ov = document.getElementById('textToolOverlay');
    if (!wrap || !mediaEl || !ov) return;
    const mb = mediaEl.getBoundingClientRect();
    const ob = ov.getBoundingClientRect();
    wrap.style.left = ((mb.left - ob.left) + capTextPos.x * mb.width) + 'px';
    wrap.style.top = ((mb.top - ob.top) + capTextPos.y * mb.height) + 'px';
}
function cycleTextAlign() {
    capTextAlign = capTextAlign === 'left' ? 'center' : capTextAlign === 'center' ? 'right' : 'left';
    const input = document.getElementById('textToolInput');
    if (input) input.style.textAlign = capTextAlign;
    const icon = document.getElementById('textAlignIcon');
    if (icon) icon.className = 'fa-solid ' + (capTextAlign === 'left' ? 'fa-align-left' : capTextAlign === 'right' ? 'fa-align-right' : 'fa-align-center');
    // Wannan yana matsar da AKWATIN kansa zuwa hagu/tsakiya/dama akan hoton (ba kawai
    // text-align cikin akwatin ba, wanda ba shi da tasiri a bayyane akan gajeren rubutu
    // guda layi) — kamar yadda aka bukata.
    capTextPos.x = capTextAlign === 'left' ? 0.22 : capTextAlign === 'right' ? 0.78 : 0.5;
    applyTextBoxPosition();
}
function cycleTextBoxStyle() {
    capTextBoxStyle = (capTextBoxStyle + 1) % 4;
    applyLiveTextBoxStyle();
}
// Salon akwati guda 4 — kawai AKWATIN da ke kewaye da rubutun ne ke canjawa (auto-width,
// BA fullscreen background ba) — wannan yake gyara bug din "page ya koma fari/baki".
function applyLiveTextBoxStyle() {
    const input = document.getElementById('textToolInput');
    if (!input) return;
    input.style.textAlign = capTextAlign;
    if (capTextBoxStyle === 1) { // Solid box
        input.style.background = capDrawColor; input.style.color = contrastColor(capDrawColor);
        input.style.borderRadius = '10px'; input.style.border = 'none'; input.style.textShadow = 'none';
    } else if (capTextBoxStyle === 2) { // Outline box
        input.style.background = 'transparent'; input.style.color = capDrawColor;
        input.style.borderRadius = '10px'; input.style.border = `2px solid ${capDrawColor}`; input.style.textShadow = 'none';
    } else if (capTextBoxStyle === 3) { // Translucent dark box
        input.style.background = 'rgba(0,0,0,0.5)'; input.style.color = capDrawColor;
        input.style.borderRadius = '10px'; input.style.border = 'none'; input.style.textShadow = 'none';
    } else { // Plain, babu akwati
        input.style.background = 'transparent'; input.style.color = capDrawColor;
        input.style.border = 'none'; input.style.textShadow = '0 1px 3px rgba(0,0,0,0.7)';
    }
}
// Draggable: tap kadan (ba motsi ba) = fara rubutu; ja (drag) = motsa akwatin. rAF-throttle
// (kamar crop) domin akwatin ya kasance daidai girmansa yayin motsi — ba ya "girma/ragewa"
// kamar da, wanda ya faru ne saboda ana rubuta position akan KOWACE taɓawa event kai-tsaye.
function setupTextDrag(wrap, input, mediaEl) {
    let startX = 0, startY = 0, startFracX = 0, startFracY = 0, moved = false, dragging = false;
    let rafScheduled = false;
    const mRect = () => mediaEl.getBoundingClientRect();
    const pt = (e) => { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; };
    const scheduleApply = () => {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(() => { rafScheduled = false; applyTextBoxPosition(); });
    };
    const down = (e) => {
        moved = false; dragging = true;
        const p = pt(e); startX = p.x; startY = p.y;
        startFracX = capTextPos.x; startFracY = capTextPos.y;
    };
    const move = (e) => {
        if (!dragging) return;
        const p = pt(e);
        const dx = p.x - startX, dy = p.y - startY;
        if (!moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) moved = true;
        if (!moved) return;
        e.preventDefault();
        const mb = mRect();
        capTextPos.x = Math.max(0.05, Math.min(0.95, startFracX + dx / mb.width));
        capTextPos.y = Math.max(0.05, Math.min(0.95, startFracY + dy / mb.height));
        scheduleApply();
    };
    const up = () => { dragging = false; if (!moved) input.focus(); };
    wrap.addEventListener('mousedown', down);
    wrap.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
}
function cancelTextTool() {
    const ov = document.getElementById('textToolOverlay');
    if (ov) ov.remove();
    removeColorSlider();
    exitFullscreenSubMode();
}
function finishTextTool() {
    const input = document.getElementById('textToolInput');
    const txt = input ? input.innerText.trim() : '';
    const target = capCanvas || capVideoOverlay;
    if (txt && target) {
        const ctx = target.getContext('2d');
        const fontSize = Math.round(target.width / 14);
        ctx.font = `700 ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = capTextAlign; ctx.textBaseline = 'middle';
        const lines = txt.split('\n');
        const lineHeight = fontSize * 1.3;
        const totalH = lines.length * lineHeight;
        const cx = capTextPos.x * target.width, cy = capTextPos.y * target.height;
        lines.forEach((line, i) => {
            const ly = cy - totalH / 2 + lineHeight * i + lineHeight / 2;
            const m = ctx.measureText(line);
            let boxCenterX = cx;
            if (capTextAlign === 'left') boxCenterX = cx + m.width / 2;
            else if (capTextAlign === 'right') boxCenterX = cx - m.width / 2;
            const padX = fontSize * 0.35, padY = fontSize * 0.2;
            if (capTextBoxStyle === 1) {
                ctx.fillStyle = capDrawColor;
                roundRectPath(ctx, boxCenterX - m.width / 2 - padX, ly - fontSize / 2 - padY, m.width + padX * 2, fontSize + padY * 2, 10);
                ctx.fill();
                ctx.fillStyle = contrastColor(capDrawColor);
            } else if (capTextBoxStyle === 2) {
                ctx.strokeStyle = capDrawColor; ctx.lineWidth = 3;
                roundRectPath(ctx, boxCenterX - m.width / 2 - padX, ly - fontSize / 2 - padY, m.width + padX * 2, fontSize + padY * 2, 10);
                ctx.stroke();
                ctx.fillStyle = capDrawColor;
            } else if (capTextBoxStyle === 3) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                roundRectPath(ctx, boxCenterX - m.width / 2 - padX, ly - fontSize / 2 - padY, m.width + padX * 2, fontSize + padY * 2, 10);
                ctx.fill();
                ctx.fillStyle = capDrawColor;
            } else {
                ctx.lineWidth = fontSize / 12; ctx.strokeStyle = 'rgba(0,0,0,0.65)';
                ctx.strokeText(line, boxCenterX, ly);
                ctx.fillStyle = capDrawColor;
            }
            ctx.fillText(line, boxCenterX, ly);
        });
        if (target === capVideoOverlay) capOverlayUsed = true;
    }
    const ov = document.getElementById('textToolOverlay');
    if (ov) ov.remove();
    removeColorSlider();
    exitFullscreenSubMode();
}
function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
function contrastColor(colorStr) {
    let r, g, b;
    const rgbM = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(colorStr || '');
    if (rgbM) { r = +rgbM[1]; g = +rgbM[2]; b = +rgbM[3]; }
    else if (/^#[0-9a-fA-F]{6}$/.test(colorStr || '')) {
        const v = parseInt(colorStr.slice(1), 16);
        r = (v >> 16) & 255; g = (v >> 8) & 255; b = v & 255;
    } else return '#000';
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#000' : '#fff';
}
function hexToRgbStr(hex) {
    const v = parseInt(hex.slice(1), 16);
    return `rgb(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255})`;
}

// ── Sticker: ƙaramin zaɓi na emoji, ana "stamp" a tsakiyar hoto/bidiyo ──
function toggleStickerPicker() {
    const existing = document.getElementById('stickerPicker');
    if (existing) { existing.remove(); return; }
    const target = capCanvas || capVideoOverlay;
    if (!target) return;
    const picker = document.createElement('div');
    picker.id = 'stickerPicker';
    picker.style.cssText = 'position:absolute;top:64px;left:50%;transform:translateX(-50%);background:#151515;border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:8px 12px;display:flex;gap:10px;z-index:6;font-size:26px;';
    ['❤️', '😂', '🔥', '👍', '😮', '😢', '🎉', '⭐'].forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.style.cursor = 'pointer';
        span.onclick = () => { stampSticker(emoji); closeStickerPicker(); };
        picker.appendChild(span);
    });
    document.getElementById('captionOverlay').appendChild(picker);
}
function closeStickerPicker() {
    const p = document.getElementById('stickerPicker');
    if (p) p.remove();
}
function stampSticker(emoji) {
    const target = capCanvas || capVideoOverlay;
    if (!target) return;
    const ctx = target.getContext('2d');
    const size = Math.round(target.width / 5);
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, target.width / 2, target.height / 2);
    if (target === capVideoOverlay) capOverlayUsed = true;
}

// ── DRAW — fullscreen, kamar WhatsApp/native: zaɓin pen guda 4 (pen/marker/
// highlighter/eraser — eraser bidiyo kawai, babu shi ga hoto domin babu
// "layer" da za a share) + dogon rainbow color slider a gefen dama. ──
let capDrawColor = '#ff3b30';
let capDrawTool = 'pen';
function toggleDrawMode() {
    if (capDrawMode) {
        capDrawMode = false;
        document.getElementById('drawBtnCap').classList.remove('active');
        const bar = document.getElementById('drawToolBar'); if (bar) bar.remove();
        removeColorSlider();
        exitFullscreenSubMode();
        return;
    }
    if (capCropMode) cancelCropMode();
    const target = capCanvas || capVideoOverlay;
    if (!target) return;
    capDrawMode = true;
    document.getElementById('drawBtnCap').classList.add('active');
    enterFullscreenSubMode();
    buildDrawToolbar();
}
function buildDrawToolbar() {
    const isImg = !!capCanvas;
    const bar = document.createElement('div');
    bar.id = 'drawToolBar';
    bar.innerHTML = `
        <div id="drawToolTopRow"><span class="crop-text-btn" onclick="toggleDrawMode()">Done</span></div>
        <div id="drawBrushRow">
            <div class="brush-opt active" onclick="setDrawTool('pen', this)"><i class="fa-solid fa-pen" style="color:#fff;font-size:13px;"></i></div>
            <div class="brush-opt" onclick="setDrawTool('marker', this)"><i class="fa-solid fa-marker" style="color:#fff;font-size:13px;"></i></div>
            <div class="brush-opt" onclick="setDrawTool('highlighter', this)"><i class="fa-solid fa-highlighter" style="color:#fff;font-size:13px;"></i></div>
            ${isImg ? '' : '<div class="brush-opt" onclick="setDrawTool(\'eraser\', this)"><i class="fa-solid fa-eraser" style="color:#fff;font-size:13px;"></i></div>'}
        </div>`;
    document.getElementById('captionOverlay').appendChild(bar);
    capDrawTool = 'pen';
    buildColorSlider();
}
function setDrawTool(tool, el) {
    capDrawTool = tool;
    document.querySelectorAll('.brush-opt').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}
// ── Color slider (rainbow, vertical) — RABABBEN tsakanin draw mode DA text tool,
// wannan shine yake gyara "me yasa babu color slider a text tool" da aka bayar rahoto. ──
function buildColorSlider() {
    if (document.getElementById('colorSliderWrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'colorSliderWrap';
    wrap.innerHTML = `<div id="colorSlider"></div><div id="colorSliderDot" style="top:0;background:${capDrawColor};"></div>`;
    document.getElementById('captionOverlay').appendChild(wrap);
    attachColorSliderHandlers();
}
function removeColorSlider() {
    const sw = document.getElementById('colorSliderWrap');
    if (sw) sw.remove();
}
function attachColorSliderHandlers() {
    const wrap = document.getElementById('colorSliderWrap');
    const dot = document.getElementById('colorSliderDot');
    const pick = (e) => {
        const rect = wrap.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        let frac = (t.clientY - rect.top) / rect.height;
        frac = Math.max(0, Math.min(1, frac));
        capDrawColor = colorFromFraction(frac);
        dot.style.top = (frac * 100) + '%';
        dot.style.background = capDrawColor;
        if (document.getElementById('textToolOverlay')) applyLiveTextBoxStyle();
    };
    wrap.addEventListener('mousedown', (e) => {
        pick(e);
        const mv = (e2) => pick(e2);
        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    });
    wrap.addEventListener('touchstart', pick, { passive: true });
    wrap.addEventListener('touchmove', pick, { passive: true });
}
function colorFromFraction(frac) {
    const stops = [[0, '#ffffff'], [0.08, '#ff0000'], [0.22, '#ff9900'], [0.36, '#ffee00'], [0.5, '#33ff33'], [0.62, '#00e5ff'], [0.75, '#3366ff'], [0.88, '#a020f0'], [1, '#ff2fb0']];
    for (let i = 0; i < stops.length - 1; i++) {
        if (frac >= stops[i][0] && frac <= stops[i + 1][0]) {
            const t = (frac - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
            return lerpHex(stops[i][1], stops[i + 1][1], t);
        }
    }
    return stops[stops.length - 1][1];
}
function lerpHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
    const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
    const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${bl})`;
}
function capTargetPoint(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
}
// getCanvas(): function domin mu koyaushe mu sami sabon reference (misali bayan rotate ya
// maye gurbin capCanvas da wani sabon canvas), isVideoOverlay: alama ta mark capOverlayUsed
function attachCapDrawHandlers(canvasEl, getCanvas, isVideoOverlay) {
    const start = (e) => {
        if (!capDrawMode) return;
        capDrawing = true;
        capLastPt = capTargetPoint(getCanvas(), e);
    };
    const move = (e) => {
        if (!capDrawMode || !capDrawing) return;
        e.preventDefault();
        const canvas = getCanvas();
        const pt = capTargetPoint(canvas, e);
        const ctx = canvas.getContext('2d');
        if (capDrawTool === 'eraser') {
            if (!isVideoOverlay) { capLastPt = pt; return; } // eraser baya aiki a hoto (babu transparent layer)
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = Math.max(10, canvas.width / 60);
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = capDrawColor;
            ctx.globalAlpha = capDrawTool === 'highlighter' ? 0.4 : 1;
            ctx.lineWidth = capDrawTool === 'pen' ? Math.max(4, canvas.width / 150) : Math.max(10, canvas.width / 60);
        }
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(capLastPt.x, capLastPt.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        capLastPt = pt;
        if (isVideoOverlay) capOverlayUsed = true;
    };
    const end = () => { capDrawing = false; capLastPt = null; };
    canvasEl.addEventListener('mousedown', start);
    canvasEl.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvasEl.addEventListener('touchstart', start, { passive: true });
    canvasEl.addEventListener('touchmove', move, { passive: false });
    canvasEl.addEventListener('touchend', end);
}



function wireMediaInputs() {
    document.getElementById('cameraInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) openCaptionModal(file, 'image');
        e.target.value = '';
    });
    document.getElementById('galleryInput').addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) { e.target.value = ''; return; }
        if (files.length === 1 || captionModeActive) {
            // Idan muna cikin caption mode tuni, ko da an zaɓi da yawa, mu ɗauki na farko
            // kawai domin kada mu watsar da caption modal ba tare da gargaɗi ba.
            openCaptionModal(files[0], files[0].type.startsWith('video') ? 'video' : 'image');
        } else {
            uploadAndSendMediaGroup(files);
        }
        e.target.value = '';
    });
    document.getElementById('documentInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        await ciAuthReadyPromise;
        if (!firebase.auth().currentUser) { alert('Could not verify sign-in. Please log in again and retry.'); return; }
        try {
            const token = await firebase.auth().currentUser.getIdToken();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'chatMedia');
            formData.append('username', chatRoomId);
            const res = await fetch('https://oryzon-backend-ed1q.onrender.com/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');
            await sendStructuredMessage('document', {
                mediaUrl: data.url, fileName: file.name,
                fileSize: (file.size / 1024).toFixed(0) + ' KB'
            }, '📄 ' + file.name);
        } catch (err) {
            alert('Failed to send file: ' + err.message);
        }
    });
}

// ══════════════════════════════════════════════
//  ATTACH MENU (Location / Contact / Poll / Event / AI images) — item 7
// ══════════════════════════════════════════════
function toggleAttachMenu() {
    document.getElementById('attachMenu').classList.toggle('open');
    document.getElementById('attachBackdrop').classList.toggle('open');
}
function closeAttachMenu() {
    document.getElementById('attachMenu').classList.remove('open');
    document.getElementById('attachBackdrop').classList.remove('open');
}
async function sendStructuredMessage(type, extra, previewLabel) {
    await ciAuthReadyPromise;
    const payload = Object.assign({ senderId: myId, receiverId: chatWith, timestamp: Date.now(), type }, extra);
    await db.collection('personalChats').doc(chatRoomId).collection('messages').add(payload);
    await db.collection('personalChats').doc(chatRoomId).set({
        lastMessage: previewLabel, lastMessageTime: Date.now(), members: [myId, chatWith],
        unreadCount: { [chatWith]: firebase.firestore.FieldValue.increment(1) }
    }, { merge: true });
}
function shareLiveLocation() {
    if (!navigator.geolocation) { alert('Your device does not support location sharing.'); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
        sendStructuredMessage('location', { lat: pos.coords.latitude, lng: pos.coords.longitude }, '📍 Location');
    }, () => alert('Could not get your location. Check location permission.'));
}
async function shareContactCard() {
    if ('contacts' in navigator && 'ContactsManager' in window) {
        try {
            const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
            if (!contacts.length) return;
            const c = contacts[0];
            sendStructuredMessage('contact', {
                contactName: (c.name && c.name[0]) || 'Contact',
                contactPhone: (c.tel && c.tel[0]) || ''
            }, '👤 Contact');
        } catch (e) { /* mutum ya soke */ }
        return;
    }
    const name = prompt("Contact's name:");
    if (!name) return;
    const phone = prompt('Their phone number:') || '';
    sendStructuredMessage('contact', { contactName: name, contactPhone: phone }, '👤 Contact');
}
function createPollMessage() {
    const question = prompt('Write the poll question:');
    if (!question) return;
    const optionsRaw = prompt('Write the options, separated by commas (,):');
    if (!optionsRaw) return;
    const options = optionsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (options.length < 2) { alert('At least 2 options are required.'); return; }
    sendStructuredMessage('poll', { question, options }, '📊 ' + question);
}
function createEventMessage() {
    const eventTitle = prompt('Event name:');
    if (!eventTitle) return;
    const eventDate = prompt('Date and time (e.g. 12 Sep, 4pm):') || '';
    sendStructuredMessage('event', { eventTitle, eventDate }, '📅 ' + eventTitle);
}
function openAiImagePrompt() {
    const prompt_ = prompt('Describe the image you want AI to create:');
    if (!prompt_) return;
    // Babu AI image-generation backend a wannan codebase tukuna — mun tabbatar
    // wannan bawon "Active" ne (yana karɓar input, yana aiki), amma ainihin
    // ƙirƙirar hoton yana bukatar backend API da ba a haɗa ba tukuna.
    sendStructuredMessage('text', { text: `🎨 [AI Image request]: ${prompt_}` }, '🎨 AI Image request')
        .catch(() => {});
    alert('Your request was received. AI image generation needs a backend — until an API is connected, an actual image cannot be created yet.');
}


// ══════════════════════════════════════════════
//  VOICE RECORDING
// ══════════════════════════════════════════════
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let isPaused = false;
let recordingSeconds = 0;
let recordingTimerInterval = null;
let recordingStream = null;
let waveformBars = [];

function tickRecordingTimer() {
    recordingSeconds++;
    const m = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const s = String(recordingSeconds % 60).padStart(2, '0');
    document.getElementById('recordingTimerLabel').textContent = `${m}:${s}`;
    waveformBars.push(5 + Math.random() * 15);
    if (waveformBars.length > 45) waveformBars.shift();
    renderWaveform();
}

function renderWaveform() {
    const wrap = document.getElementById('recWaveform');
    if (!wrap) return;
    wrap.innerHTML = waveformBars.map(h =>
        `<div style="width:2.5px;flex-shrink:0;border-radius:2px;background:${isPaused ? 'rgba(255,255,255,0.35)' : '#eab308'};height:${h}px;"></div>`
    ).join('');
    wrap.scrollLeft = wrap.scrollWidth;
}

function setPauseUI(paused) {
    document.getElementById('pauseIcon').style.display = paused ? 'none' : 'block';
    document.getElementById('resumeIcon').style.display = paused ? 'block' : 'none';
    document.getElementById('pauseResumeBtn').title = paused ? 'Resume' : 'Pause';
    const dot = document.getElementById('recPulseDot');
    dot.style.animationPlayState = paused ? 'paused' : 'running';
    dot.style.opacity = paused ? '0.35' : '1';
}

async function toggleVoiceRecording() {
    if (isRecording) return;
    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        alert('Could not get microphone permission.');
        return;
    }
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(recordingStream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.start();
    isRecording = true;
    isPaused = false;
    recordingSeconds = 0;
    waveformBars = [];
    document.getElementById('normalInputRow').style.display = 'none';
    document.getElementById('recordingRow').style.display = 'flex';
    document.getElementById('recordingTimerLabel').textContent = '00:00';
    setPauseUI(false);
    renderWaveform();
    recordingTimerInterval = setInterval(tickRecordingTimer, 1000);
}

function togglePauseRecording() {
    if (!isRecording || !mediaRecorder) return;
    if (!isPaused) {
        mediaRecorder.pause();
        isPaused = true;
        clearInterval(recordingTimerInterval);
        setPauseUI(true);
    } else {
        mediaRecorder.resume();
        isPaused = false;
        setPauseUI(false);
        recordingTimerInterval = setInterval(tickRecordingTimer, 1000);
    }
}

function stopRecording(shouldSend) {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    isPaused = false;
    clearInterval(recordingTimerInterval);
    mediaRecorder.onstop = async () => {
        recordingStream.getTracks().forEach(t => t.stop());
        document.getElementById('normalInputRow').style.display = 'flex';
        document.getElementById('recordingRow').style.display = 'none';
        if (shouldSend && recordedChunks.length > 0) {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
            await uploadAndSendMedia(file, 'audio');
        }
    };
    mediaRecorder.stop();
}

function toggleAudioPlay(audioId, btnEl) {
    const audio = document.getElementById(audioId);
    const icon = btnEl.querySelector('.play-icon');
    const setIcon = (playing) => { if (icon) { icon.classList.toggle('fa-pause', playing); icon.classList.toggle('fa-play', !playing); } };
    if (audio.paused) {
        document.querySelectorAll('#chat-flow audio').forEach(a => { if (a.id !== audioId) a.pause(); });
        document.querySelectorAll('#chat-flow .play-icon').forEach(i => { i.classList.remove('fa-pause'); i.classList.add('fa-play'); });
        audio.play();
        setIcon(true);
    } else {
        audio.pause();
        setIcon(false);
    }
    audio.onended = () => setIcon(false);
}
function nxCycleAudioSpeed(audioId, el) {
    const audio = document.getElementById(audioId);
    const next = el.textContent === '1x' ? '1.5x' : el.textContent === '1.5x' ? '2x' : '1x';
    el.textContent = next;
    if (audio) audio.playbackRate = parseFloat(next);
}

    window.addEventListener('resize', () => {
    const cf = document.getElementById('chat-flow');
    if (cf && isUserNearBottom) setTimeout(() => { cf.scrollTop = cf.scrollHeight; }, 100);
});

// ══════════════════════════════════════════════
//  EMOJI PANEL
// ══════════════════════════════════════════════
const emojiCategories = {
    '😂': ['😂','😭','🥺','😍','🥰','😊','🤣','😅','😩','😤','🙏','💪','👀','🔥','💯','❤️','✅','🎉','😎','🤔','😱','🤦','🤷','💀','😴','🤗','😋','🫡','🥳','😇'],
    '😀': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','💫','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡'],
    '👍': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃'],
    '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟'],
    '🎉': ['🎉','🎊','🎈','🎁','🎀','🏆','🥇','🥈','🥉','🏅','🎖️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🥁','🪘','🎷','🎺','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮'],
    '🔥': ['🔥','💯','✅','❌','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','⭐','🌟','💫','✨','⚡','🌈','☀️','🌤️','⛅','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️']
};

let currentCategory = '😂';

function buildEmojiPanel() {
    const tabs = document.getElementById('emojiTabs');
    const grid = document.getElementById('emojiGrid');
    if (!tabs.children.length) {
        Object.keys(emojiCategories).forEach(cat => {
            const tab = document.createElement('div');
            tab.textContent = cat;
            tab.style.cssText = `font-size:20px;padding:4px 8px;cursor:pointer;border-radius:8px;flex-shrink:0;opacity:${cat===currentCategory?'1':'0.4'};background:${cat===currentCategory?'rgba(255,255,255,0.1)':'transparent'};`;
            tab.onclick = () => loadEmojiCategory(cat);
            tabs.appendChild(tab);
        });
    }
    loadEmojiCategory(currentCategory);
}

function loadEmojiCategory(cat) {
    currentCategory = cat;
    const grid = document.getElementById('emojiGrid');
    const tabs = document.getElementById('emojiTabs');
    Array.from(tabs.children).forEach((tab, i) => {
        const c = Object.keys(emojiCategories)[i];
        tab.style.opacity = c === cat ? '1' : '0.4';
        tab.style.background = c === cat ? 'rgba(255,255,255,0.1)' : 'transparent';
    });
    grid.innerHTML = '';
    emojiCategories[cat].forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.style.cssText = `font-size:26px;padding:6px;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center;width:42px;height:42px;transition:background 0.15s;`;
        span.onmouseenter = () => span.style.background = 'rgba(255,255,255,0.1)';
        span.onmouseleave = () => span.style.background = 'transparent';
        span.onclick = () => insertEmoji(emoji);
        grid.appendChild(span);
    });
    grid.scrollTop = 0;
}

function insertEmoji(emoji) {
    const input = document.getElementById('msgInput');
    const pos = input.selectionStart;
    input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
    input.selectionStart = input.selectionEnd = pos + emoji.length;
    input.focus();
    toggleButtons();
}

function toggleEmojiPanel() {
    const panel = document.getElementById('emojiPanel');
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'flex';
        buildEmojiPanel();
        document.getElementById('msgInput').blur();
    } else {
        panel.style.display = 'none';
        document.getElementById('msgInput').focus();
    }
}

document.addEventListener('click', (e) => {
    const panel = document.getElementById('emojiPanel');
    const btn = document.getElementById('emojiToggleBtn');
    if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
        panel.style.display = 'none';
    }
});
// Selection mode: tapping ANYWHERE on a message row (beside the bubble, any text/media/voice message) toggles it — like WhatsApp.
document.addEventListener('click', (e) => {
    if (selectedMessages.size === 0) return;
    const flow = e.target.closest ? e.target.closest('#chat-flow') : null;
    if (!flow) return;
    let row = e.target.closest('.message-row');
    if (!row) {
        const rows = flow.querySelectorAll('.message-row');
        for (const r of rows) { const b = r.getBoundingClientRect(); if (e.clientY >= b.top && e.clientY <= b.bottom) { row = r; break; } }
    }
    if (!row || !row._nx || row._nx.bubble.contains(e.target)) return;
    toggleMessageSelection(row._nx.docId, row._nx.data, row);
});
async function openViewOnceMedia(docId) {
    if (!latestMsgSnapshot) return;
    const docSnap = latestMsgSnapshot.docs.find(x => x.id === docId);
    if (!docSnap) return;
    const d = docSnap.data();
    if (d.viewOnceOpenedAt) return; // an riga an buɗe ta, kar a sake
    try {
        const url = d.iv ? await decryptMediaToBlobUrl(d.mediaUrl, d.iv, d.mimeType) : d.mediaUrl;
        if (d.type === 'video') openVideoViewer(url); else openImageViewer(url);
        // Alama an buɗe SAI mu share ainihin bayanan a Firestore da backend — bayan wannan,
        // babu wanda zai iya sake buɗe wannan hoto/bidiyo, koda mai turawa da kansa.
        await db.collection('personalChats').doc(chatRoomId).collection('messages').doc(docId).update({
            viewOnceOpenedAt: Date.now(),
            mediaUrl: firebase.firestore.FieldValue.delete(),
            iv: firebase.firestore.FieldValue.delete()
        });
        deleteFromBackend(d.storageKey);
    } catch (e) {
        console.error('View-once open error:', e);
        alert('Could not open this photo/video.');
    }
}
function mediaTimeOverlay(time, ticks) {
    return `<span class="media-time-overlay">${time}${ticks || ''}</span>`;
}
// ── Caption na hoto/bidiyo/murya (ana ɓoye ta ta amfani da tsarin decryptedCache
// iri ɗaya da rubutu, ta hanyar "synthetic doc id" domin mu sake amfani da code ɗin) ──
function resolveCaption(doc, d) {
    if (d.captionEncrypted) {
        const synDoc = { id: doc.id + '_cap' };
        const synD = { encrypted: true, iv: d.captionIv, ciphertext: d.captionCiphertext };
        ensureDecrypted(synDoc, synD);
        const cached = decryptedCache[synDoc.id];
        return cached ? cached.text : '🔒 …';
    }
    return d.caption || '';
}
// ── Read-receipt ticks: ✓ = an tura, ✓✓ mai launi = an gani ──
const seenMarkedIds = new Set();
function toggleReactionPicker() {
    if (!singleSelected()) return; // React yana aiki ne kawai da sako guda daya
    const existing = document.getElementById('reactionPicker');
    if (existing) { existing.remove(); return; }
    const picker = document.createElement('div');
    picker.id = 'reactionPicker';
    picker.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);background:#151515;border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:8px 14px;display:flex;gap:12px;z-index:10002;font-size:22px;';
    ['❤️', '😂', '👍', '😮', '😢', '🙏'].forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.style.cursor = 'pointer';
        span.onclick = () => setReaction(emoji);
        picker.appendChild(span);
    });
    document.body.appendChild(picker);
}
function setReaction(emoji) {
    const sel = singleSelected();
    if (!sel) return;
    db.collection('personalChats').doc(chatRoomId).collection('messages').doc(sel.docId)
      .set({ reactions: { [myId]: emoji } }, { merge: true }).catch(() => {});
    const picker = document.getElementById('reactionPicker');
    if (picker) picker.remove();
    cancelSelection();
}
function videoIndicator() {
    return `<span class="video-indicator"><i class="fa-solid fa-video"></i></span>`;
}
function buildImageGrid(mediaArr, time, msgId, ticks) {
    const n = mediaArr.length;
    const cls = n === 1 ? 'n1' : n === 2 ? 'n2' : n === 3 ? 'n3' : 'n4plus';
    const shown = cls === 'n4plus' ? mediaArr.slice(0, 4) : mediaArr;
    const extra = n > 4 ? n - 4 : 0;
    const cells = shown.map((item, i) => {
        const isLast = extra > 0 && i === 3;
        const isVideo = item.type === 'video';
        const itemKey = msgId + '_' + i;
        const elId = 'gi_' + itemKey;
        const src = resolveMediaSrc(itemKey, item.mediaUrl, item.iv, item.mimeType, elId);
        const el = isVideo
            ? `<video id="${elId}" src="${src}" preload="metadata" muted playsinline style="pointer-events:none;"></video>`
            : `<img id="${elId}" src="${src}">`;
        const badge = isVideo ? videoIndicator() : '';
        const lockBadge = (item.iv && !src) ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(0,0,0,0.35);">🔒</div>` : '';
        const overlay = isLast ? `<div class="more-overlay">+${extra}</div>` : '';
        const openUrl = item.iv ? (decryptedMediaCache[itemKey] || '') : item.mediaUrl;
        const openFn = isVideo ? `openVideoViewer('${openUrl}')` : `openImageViewer('${openUrl}')`;
        return `<div class="gi" onclick="${openFn}">${el}${badge}${lockBadge}${overlay}</div>`;
    }).join('');
    return `<div class="img-grid ${cls}">${cells}${mediaTimeOverlay(time, ticks)}</div>`;
}

// ══════════════════════════════════════════════
//  MESSAGE SELECTION (long-press) + REPLY
// ══════════════════════════════════════════════
// ── Selection: Map<docId, data> — yana bada damar zaɓar sakonni da yawa lokaci
// guda (kamar WhatsApp). Dannawa akan sakon da aka riga aka zaɓa yana cire shi.
let selectedMessages = new Map();
let activeReply = null;
let longPressTimer = null;
let longPressFired = false;

function attachLongPress(bubbleEl, docId, data) {
    const rowEl = bubbleEl.closest('.message-row');
    const start = () => {
        longPressFired = false;
        longPressTimer = setTimeout(() => {
            longPressFired = true;
            if (selectedMessages.size > 0) toggleMessageSelection(docId, data, rowEl);
            else openMsgTray(docId, data, rowEl);
            if (navigator.vibrate) navigator.vibrate(12);
        }, 450);
    };
    const cancelTimer = () => clearTimeout(longPressTimer);
    bubbleEl.addEventListener('touchstart', start, { passive: true });
    bubbleEl.addEventListener('touchend', cancelTimer);
    bubbleEl.addEventListener('touchmove', cancelTimer);
    bubbleEl.addEventListener('mousedown', start);
    bubbleEl.addEventListener('mouseup', cancelTimer);
    bubbleEl.addEventListener('mouseleave', cancelTimer);
    bubbleEl.addEventListener('contextmenu', (e) => e.preventDefault());
    // capture:true — mu tsayar da (misali) inline onclick na openImageViewer kafin ya kunna,
    // don a lokacin da muke cikin "selection mode" dannawa akan wani sako yana ƙara/cire
    // shi daga zaɓi maimakon ya buɗe hoto/bidiyo. Haka kuma mun gano DOUBLE-TAP a nan
    // domin heart-react cikin sauri (irin Instagram/WhatsApp).
    let lastTapTime = 0;
    bubbleEl.addEventListener('click', (e) => {
        if (longPressFired) { e.stopPropagation(); e.preventDefault(); longPressFired = false; return; }
        if (selectedMessages.size > 0) {
            e.stopPropagation(); e.preventDefault();
            toggleMessageSelection(docId, data, rowEl);
            return;
        }
        const now = Date.now();
        if (now - lastTapTime < 300) {
            e.stopPropagation(); e.preventDefault();
            lastTapTime = 0;
            quickHeartReact(docId, bubbleEl);
            return;
        }
        lastTapTime = now;
    }, true);
    rowEl._nx = { docId: docId, data: data, bubble: bubbleEl };   // used by the row-tap handler below

    // ── Swipe-to-reply (dama) — irin na WhatsApp ──
    let swipeStartX = null, swipeStartY = null, swipeActive = false;
    bubbleEl.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeActive = false;
    }, { passive: true });
    bubbleEl.addEventListener('touchmove', (e) => {
        if (swipeStartX === null || selectedMessages.size > 0 || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - swipeStartX;
        const dy = e.touches[0].clientY - swipeStartY;
        if (!swipeActive && dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) swipeActive = true;
        if (swipeActive) {
            const clamped = Math.max(0, Math.min(70, dx));
            rowEl.style.transition = 'none';
            rowEl.style.transform = `translateX(${clamped}px)`;
        }
    }, { passive: true });
    bubbleEl.addEventListener('touchend', () => {
        if (swipeActive) {
            const m = /translateX\(([\d.]+)px\)/.exec(rowEl.style.transform || '');
            const dx = m ? parseFloat(m[1]) : 0;
            rowEl.style.transition = 'transform 0.2s';
            rowEl.style.transform = 'translateX(0)';
            if (dx > 55) { startReplyTo(docId, data); if (navigator.vibrate) navigator.vibrate(10); }
        }
        swipeStartX = null;
        swipeActive = false;
    });
}
// ── Long-press tray (identical to group's) ──
let trayCtx = null;
function openMsgTray(docId, data, rowEl) {
    trayCtx = { docId, data, rowEl };
    document.getElementById('trayEmojiRow').innerHTML = ['👍','❤️','😂','😮','😢','🙏']
        .map(e => `<span onclick="trayReact('${e}')">${e}</span>`).join('');
    document.getElementById('trayStarLabel').textContent = (data.starredBy && data.starredBy[myId]) ? 'Unstar' : 'Star';
    document.getElementById('trayPinLabel').textContent = data.pinned ? 'Unpin' : 'Pin';
    document.getElementById('msgActionTray').classList.add('active');
    document.getElementById('msgActionBackdrop').classList.add('active');
}
function closeMsgTray() {
    document.getElementById('msgActionTray').classList.remove('active');
    document.getElementById('msgActionBackdrop').classList.remove('active');
}
function trayTake() {   // make the tray message the only selected one, then reuse the existing *Selected actions
    if (!trayCtx) return false;
    selectedMessages.clear();
    selectedMessages.set(trayCtx.docId, trayCtx.data);
    closeMsgTray();
    return true;
}
function trayReact(emoji) {
    if (!trayCtx) return;
    db.collection('personalChats').doc(chatRoomId).collection('messages').doc(trayCtx.docId)
      .set({ reactions: { [myId]: emoji } }, { merge: true }).catch(() => {});
    closeMsgTray();
}
function trayReply() { if (trayTake()) replySelected(); }
function trayForward() { if (trayTake()) forwardSelected(); }
function trayStar() { if (trayTake()) starSelected(); }
function trayPin() { if (trayTake()) pinSelected(); }
function trayDelete() { if (trayTake()) deleteSelected(); }
function trayCopy() {
    if (!trayCtx) return;
    const { docId, data } = trayCtx;
    const c = decryptedCache[docId];
    const txt = (c && c.text) || data.text || data.caption || '';
    closeMsgTray();
    if (txt && navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
}
function traySelect() {
    if (!trayCtx) return;
    const { docId, data, rowEl } = trayCtx;
    closeMsgTray();
    toggleMessageSelection(docId, data, rowEl);
}
window.openMsgTray = openMsgTray; window.closeMsgTray = closeMsgTray; window.trayReact = trayReact;
window.trayReply = trayReply; window.trayForward = trayForward; window.trayStar = trayStar;
window.trayPin = trayPin; window.trayDelete = trayDelete; window.trayCopy = trayCopy; window.traySelect = traySelect;

function quickHeartReact(docId, bubbleEl) {
    db.collection('personalChats').doc(chatRoomId).collection('messages').doc(docId)
      .set({ reactions: { [myId]: '❤️' } }, { merge: true }).catch(() => {});
    const heart = document.createElement('div');
    heart.textContent = '❤️';
    heart.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(0.5);font-size:42px;pointer-events:none;z-index:50;opacity:1;transition:transform .4s ease-out, opacity .4s ease-out;';
    if (!bubbleEl.style.position) bubbleEl.style.position = 'relative';
    bubbleEl.appendChild(heart);
    requestAnimationFrame(() => { heart.style.transform = 'translate(-50%,-50%) scale(1.3)'; heart.style.opacity = '0'; });
    setTimeout(() => heart.remove(), 450);
    if (navigator.vibrate) navigator.vibrate(8);
}

function toggleMessageSelection(docId, data, rowEl) {
    if (selectedMessages.has(docId)) {
        selectedMessages.delete(docId);
        if (rowEl) rowEl.classList.remove('selected-highlight');
    } else {
        selectedMessages.set(docId, data);
        if (rowEl) rowEl.classList.add('selected-highlight');
    }
    if (selectedMessages.size === 0) exitSelectionMode();
    else updateSelectionBar();
}
function updateSelectionBar() {
    document.getElementById('chat-header-bar').style.display = 'none';
    document.getElementById('selectionActionBar').style.display = 'flex';
    document.getElementById('selectionCount').textContent = String(selectedMessages.size);
    // Reply/React suna aiki ne kawai akan sako guda ɗaya a lokaci guda (kamar WhatsApp)
    const multi = selectedMessages.size > 1;
    ['selReplyIcon', 'selReactIcon'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.opacity = multi ? '0.3' : '1'; el.style.pointerEvents = multi ? 'none' : 'auto'; }
    });
}
function exitSelectionMode() {
    document.querySelectorAll('.message-row.selected-highlight').forEach(el => el.classList.remove('selected-highlight'));
    document.getElementById('chat-header-bar').style.display = 'flex';
    document.getElementById('selectionActionBar').style.display = 'none';
    selectedMessages.clear();
}
function cancelSelection() { exitSelectionMode(); }
// Dawo da {docId, data} idan sako GUDA DAYA kaɗai aka zaɓa, in ba haka ba null.
function singleSelected() {
    if (selectedMessages.size !== 1) return null;
    const [docId, data] = [...selectedMessages.entries()][0];
    return { docId, data };
}
function formatDuration(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
function replySelected() {
    const sel = singleSelected();
    if (!sel) return; // Reply yana aiki ne kawai da sako guda ɗaya
    cancelSelection();
    startReplyTo(sel.docId, sel.data);
}
function startReplyTo(docId, data, noFocus) {
    const isMe = data.senderId === myId;

    const nameEl = document.getElementById('replyPreviewName');
    nameEl.textContent = isMe ? 'You' : chatWith;


    const textEl = document.getElementById('replyPreviewText');

    if (!data.type) {
        textEl.textContent = data.encrypted ? (decryptedCache[docId] ? decryptedCache[docId].text : '🔒 …') : data.text;
    } else if (data.type === 'image') {
        const thumbSrc = data.iv ? (decryptedMediaCache[docId] || '') : data.mediaUrl;
        textEl.textContent = data.caption ? data.caption : '🖼 Photo';

    } else if (data.type === 'video') {
        const thumbSrc = data.iv ? (decryptedMediaCache[docId] || '') : data.mediaUrl;
        textEl.textContent = data.caption ? data.caption : '🎥 Video';

    } else if (data.type === 'imageGroup') {
        textEl.textContent = `🖼 ${data.mediaArr ? data.mediaArr.length : 0} Photos`;
    } else if (data.type === 'audio') {
        textEl.textContent = '🎤 Voice message';
        const audioSrc = data.iv ? decryptedMediaCache[docId] : data.mediaUrl;
        if (audioSrc) {
            const aEl = new Audio(audioSrc);
            aEl.addEventListener('loadedmetadata', () => {
                if (aEl.duration && isFinite(aEl.duration)) textEl.textContent = `🎤 Voice message (${formatDuration(aEl.duration)})`;
            });
        }
    }

    activeReply = { id: docId, senderId: data.senderId };
    document.getElementById('replyPreviewBar').classList.add('active');
    if (!noFocus) document.getElementById('msgInput').focus();
}
function cancelReply() {
    activeReply = null;
    document.getElementById('replyPreviewBar').classList.remove('active');
}
// Bayan mun goge sako(ni), sabunta lastMessage/lastMessageTime na dakin chat don ya
// nuna ainihin sabon sako na ƙarshe da ya rage — ba lokacin sakon da aka goge ba.
async function refreshLastMessagePreview() {
    try {
        const snap = await db.collection('personalChats').doc(chatRoomId).collection('messages')
            .orderBy('timestamp', 'desc').limit(1).get();
        if (snap.empty) {
            await db.collection('personalChats').doc(chatRoomId).set({ lastMessage: '', lastMessageTime: null }, { merge: true });
            return;
        }
        const d = snap.docs[0].data();
        let label;
        if (d.type === 'image') label = d.encrypted ? '🔒 📷 Photo' : '📷 Photo';
        else if (d.type === 'video') label = d.encrypted ? '🔒 🎥 Video' : '🎥 Video';
        else if (d.type === 'imageGroup') label = '🖼 Photos';
        else if (d.type === 'audio') label = d.encrypted ? '🔒 🎤 Voice message' : '🎤 Voice message';
        else if (d.type === 'location') label = '📍 Location';
        else if (d.type === 'contact') label = '👤 Contact';
        else if (d.type === 'poll') label = '📊 Poll';
        else if (d.type === 'event') label = '📅 Event';
        else if (d.type === 'document') label = '📄 ' + (d.fileName || 'Document');
        else if (d.type === 'videoNote') label = '🎥 Video note';
        else label = d.encrypted ? '🔒 Sako' : (d.text || '').substring(0, 60);
        await db.collection('personalChats').doc(chatRoomId).set({ lastMessage: label, lastMessageTime: d.timestamp }, { merge: true });
    } catch (e) {
        console.error('refreshLastMessagePreview error:', e);
    }
}
async function deleteSelected() {
    if (selectedMessages.size === 0) return;
    const ids = [...selectedMessages.keys()];
    const msg = ids.length > 1 ? `Share sakonni ${ids.length}?` : 'Share wannan sakon?';
    if (!confirm(msg)) { cancelSelection(); return; }
    try {
        const batch = db.batch();
        ids.forEach(id => batch.delete(db.collection('personalChats').doc(chatRoomId).collection('messages').doc(id)));
        await batch.commit();
        await refreshLastMessagePreview();
    } catch (e) {
        alert('Failed to delete messages: ' + e.message);
    }
    cancelSelection();
}
// Star/Favourite — real toggle (multi-capable): ana ajiye {starredBy: {[myId]: true}} akan
// kowane sako da aka zaɓa. Idan DUKA da aka zaɓa an riga an star su, dannawa yana un-star su.
async function starSelected() {
    if (selectedMessages.size === 0) return;
    const entries = [...selectedMessages.entries()];
    const allStarred = entries.every(([, d]) => d.starredBy && d.starredBy[myId]);
    try {
        const batch = db.batch();
        entries.forEach(([id]) => {
            const ref = db.collection('personalChats').doc(chatRoomId).collection('messages').doc(id);
            batch.set(ref, { starredBy: { [myId]: allStarred ? firebase.firestore.FieldValue.delete() : true } }, { merge: true });
        });
        await batch.commit();
    } catch (e) {
        console.error('Star error:', e);
    }
    cancelSelection();
}
// Pin — real toggle (multi-capable): ana ajiye {pinned: true/false} akan sako.
async function pinSelected() {
    if (selectedMessages.size === 0) return;
    const entries = [...selectedMessages.entries()];
    const allPinned = entries.every(([, d]) => d.pinned);
    try {
        const batch = db.batch();
        entries.forEach(([id]) => {
            const ref = db.collection('personalChats').doc(chatRoomId).collection('messages').doc(id);
            batch.set(ref, { pinned: !allPinned }, { merge: true });
        });
        await batch.commit();
    } catch (e) {
        console.error('Pin error:', e);
    }
    cancelSelection();
}

// ══════════════════════════════════════════════
//  FORWARD — zaɓi wani chat, aika kwafin sako(ni) da aka zaɓa zuwa can.
//  Domin E2E ta kasance daidai, BA MA sake amfani da ciphertext na wannan
//  chat ɗin ba — muna ɗaukar PLAINTEXT ɗin da muke gani a wannan na'urar
//  (bayan an riga an buɗe shi) sannan mu sake ɓoye shi da SABON key na
//  wanda za a turawa (kowace tattaunawa tana da nata shared key daban).
// ══════════════════════════════════════════════
async function deriveSharedKeyFor(peerId) {
    if (!myE2EKeyPair) return null;
    const peerPubKey = await fetchPeerPublicKey(peerId);
    if (!peerPubKey) return null;
    return crypto.subtle.deriveKey(
        { name: 'ECDH', public: peerPubKey }, myE2EKeyPair.privateKey,
        { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
}
async function encryptWithKey(key, text) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
    return { iv: b64encode(iv), ciphertext: b64encode(new Uint8Array(ctBuf)) };
}
function forwardSelected() {
    if (selectedMessages.size === 0) return;
    openForwardModal();
}
// ── Forward picker (extended): My status (+audience sheet) + recent chats + groups + friends + global search ──
let fwdItems = [];            // everything we can forward to (people, groups, status)
let fwdGlobal = [];           // search hits from ALL Nexus users (not only friends/chats)
let fwdSelected = new Map();  // key ('u:name' | 'g:slug' | 'status') -> item
let fwdFriendIds = new Set();
let fwdSearchSeq = 0, fwdSearchTimer = null;
let fwdAudience = { vis: 'friends', except: [] };   // status audience: friends | closeFriends | except
let fwdAllowReshare = true, fwdToFeed = false, fwdAudView = 'main';
function fwdLoadPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem('nx_fwd_status_prefs') || 'null');
        if (p) { fwdAudience = p.aud || fwdAudience; fwdAllowReshare = p.reshare !== false; fwdToFeed = !!p.feed; }
    } catch (e) {}
}
function fwdSavePrefs() {
    try { localStorage.setItem('nx_fwd_status_prefs', JSON.stringify({ aud: fwdAudience, reshare: fwdAllowReshare, feed: fwdToFeed })); } catch (e) {}
}
function fwdEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fwdToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#1c1c1c;color:#fff;padding:10px 16px;border-radius:20px;font-size:13px;z-index:100001;border:1px solid rgba(255,255,255,0.12);';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
}
function fwdQuery() { return ((document.getElementById('fwdSearchInput') || {}).value || '').trim().toLowerCase(); }
function fwdUserItem(id, pd, section, extra) {
    pd = pd || {};
    return Object.assign({
        key: 'u:' + id, kind: 'user', id: id, section: section, time: 0, sub: '',
        name: pd.fullName || pd.username || id,
        handle: pd.username || id,
        avatar: pd.userProfilePic || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(id))
    }, extra || {});
}
function fwdAudienceLabel() {
    if (fwdAudience.vis === 'closeFriends') return 'Close friends';
    if (fwdAudience.vis === 'except') return 'Friends except ' + fwdAudience.except.length;
    return 'My friends';
}
// What is being forwarded (the card at the bottom). Same layout for 1 or many photos/videos.
function fwdMsgInfo() {
    const msgs = [...selectedMessages.entries()];
    const media = [], texts = [];
    let allPlainMedia = msgs.length > 0;
    msgs.forEach(([id, d]) => {
        if (d.type === 'image' || d.type === 'video') {
            const src = d.iv ? (decryptedMediaCache[id] && decryptedMediaCache[id] !== 'error' ? decryptedMediaCache[id] : '') : d.mediaUrl;
            const html = !src ? '<i class="fa-solid fa-' + (d.type === 'video' ? 'video' : 'image') + '"></i>'
                : d.type === 'video'
                    ? `<video src="${fwdEsc(src)}#t=0.1" muted playsinline preload="metadata"></video><i class="fa-solid fa-play fwd-thumb-play"></i>`
                    : `<img src="${fwdEsc(src)}" alt="">`;
            media.push({ html: html });
            if (d.iv) allPlainMedia = false;
        } else if (d.type === 'audio') {
            media.push({ html: '<i class="fa-solid fa-microphone"></i>' });
            allPlainMedia = false;
        } else {
            texts.push(d.encrypted ? (decryptedCache[id] ? decryptedCache[id].text : '🔒 Message') : (d.text || ''));
            allPlainMedia = false;
        }
    });
    const only = msgs.length === 1 ? msgs[0][1] : null;
    const editable = !!(only && (only.type === 'image' || only.type === 'video') && !only.iv);
    let readText = texts.length ? texts[0] + (texts.length > 1 ? '  +' + (texts.length - 1) : '') : '';
    return { media, editable, readText, caption: editable ? (only.caption || '') : '', allPlainMedia };
}
async function openForwardModal() {
    await ensureE2EReady();
    fwdSelected = new Map(); fwdItems = []; fwdGlobal = []; fwdAudView = 'main';
    fwdLoadPrefs();
    // Keep the message-action icons (delete, star, pin…) out of this screen.
    document.getElementById('selectionActionBar').style.display = 'none';
    document.getElementById('forwardOverlay').style.display = 'flex';
    fwdCloseAudience();
    fwdCloseSearch();
    const info = fwdMsgInfo();
    const note = document.getElementById('fwdNote');
    note.value = info.caption;
    note.oninput = fwdUpdateDivider;
    fwdRenderBottom();
    const listEl = document.getElementById('forwardList');
    listEl.onclick = e => {
        if (e.target.closest('[data-aud]')) { fwdOpenAudience(); return; }
        const r = e.target.closest('.fwd-row');
        if (r) fwdToggle(r.dataset.key);
    };
    document.getElementById('fwdChips').onclick = e => { const c = e.target.closest('[data-rm]'); if (c) fwdToggle(c.dataset.rm); };
    listEl.innerHTML = '<div class="fwd-empty">Loading…</div>';
    try {
        await ciAuthReadyPromise;
        const uid = firebase.auth().currentUser && firebase.auth().currentUser.uid;
        const [chatSnap, friendSnap, groupIdSnap, meDoc] = await Promise.all([
            uid ? db.collection('personalChats').where('memberUids', 'array-contains', uid).limit(50).get() : Promise.resolve({ docs: [] }),
            db.collection('friends').where('users', 'array-contains', myId).get(),
            db.collection('users').doc(myId).collection('myGroups').get().catch(() => ({ docs: [] })),
            db.collection('users').doc(myId).get().catch(() => null)
        ]);
        const people = new Map();
        fwdFriendIds = new Set();
        chatSnap.docs.forEach(d => {
            const x = d.data();
            const other = (x.members || []).find(m => m !== myId);
            if (other) people.set(other, { section: 'recent', time: x.lastMessageTime || 0, sub: x.lastMessageEnc ? '🔒 Message' : (x.lastMessage || '') });
        });
        friendSnap.docs.forEach(d => {
            const other = (d.data().users || []).find(u => u !== myId);
            if (!other) return;
            fwdFriendIds.add(other);
            if (!people.has(other)) people.set(other, { section: 'friends', time: 0, sub: '' });
        });
        const ids = [...people.keys()];
        const [profiles, groupDocs] = await Promise.all([
            Promise.all(ids.map(id => db.collection('users').doc(id).get().catch(() => null))),
            Promise.all(groupIdSnap.docs.map(d => db.collection('groups').doc(d.id).get().catch(() => null)))
        ]);
        const items = ids.map((id, i) => fwdUserItem(id, profiles[i] && profiles[i].exists ? profiles[i].data() : {}, people.get(id).section, { time: people.get(id).time, sub: people.get(id).sub }));
        groupDocs.filter(g => g && g.exists).forEach(g => {
            const gd = g.data();
            items.push({
                key: 'g:' + g.id, kind: 'group', id: g.id, section: 'groups', time: 0,
                name: gd.name || 'Group', handle: gd.name || g.id,
                sub: (gd.privacy === 'private' ? 'Private group' : 'Public group') + ' · ' + (gd.memberCount || 0) + ' members',
                avatar: gd.avatarUrl || ('https://via.placeholder.com/46/00F2FF/000?text=' + encodeURIComponent((gd.name || 'G')[0]))
            });
        });
        const md = meDoc && meDoc.exists ? meDoc.data() : {};
        items.push({
            key: 'status', kind: 'status', id: 'status', section: 'status', time: 0,
            name: 'My status', handle: 'my status', sub: '',
            avatar: md.userProfilePic || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(myId))
        });
        fwdItems = items;
        fwdRender();
    } catch (e) {
        console.error('Forward list error:', e);
        listEl.innerHTML = '<div class="fwd-empty">Kuskure wajen loda jerin chats.</div>';
    }
}
function fwdRender() {
    const listEl = document.getElementById('forwardList');
    const q = fwdQuery().replace(/^@/, '');
    const canStatus = fwdMsgInfo().allPlainMedia;
    const match = p => !q || p.name.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q);
    const pick = s => fwdItems.filter(p => p.section === s && match(p));
    const status = canStatus ? pick('status') : [];
    const recent = pick('recent').sort((a, b) => b.time - a.time);
    const groups = pick('groups').sort((a, b) => a.name.localeCompare(b.name));
    const friends = pick('friends').sort((a, b) => a.name.localeCompare(b.name));
    const globals = q ? fwdGlobal : [];
    const row = p => `
        <div class="fwd-row" data-key="${fwdEsc(p.key)}">
            <div class="fwd-av${p.kind === 'status' ? ' ring' : ''}"><img src="${fwdEsc(p.avatar)}" alt=""></div>
            <div class="fwd-main"><span class="fwd-name">${fwdEsc(p.name)}</span>${(p.kind === 'status' ? fwdAudienceLabel() : p.sub) ? `<span class="fwd-sub">${fwdEsc(p.kind === 'status' ? fwdAudienceLabel() : p.sub)}</span>` : ''}</div>
            ${p.kind === 'status' ? '<i class="fa-solid fa-ellipsis fwd-dots" data-aud="1"></i>' : ''}
            <div class="fwd-check${fwdSelected.has(p.key) ? ' on' : ''}"><i class="fa-solid fa-check"></i></div>
        </div>`;
    const sec = (title, arr) => arr.length ? '<div class="fwd-section">' + title + '</div>' + arr.map(row).join('') : '';
    const html = status.map(row).join('') + sec('Recent chats', recent) + sec('Groups', groups) + sec('Friends', friends) + sec('People on Nexus', globals);
    listEl.innerHTML = html || '<div class="fwd-empty">' + (q ? 'No results.' : 'No chats yet.') + '</div>';
}
function fwdToggle(key) {
    const it = fwdItems.find(x => x.key === key) || fwdGlobal.find(x => x.key === key) || fwdSelected.get(key);
    if (!it) return;
    if (fwdSelected.has(key)) fwdSelected.delete(key); else fwdSelected.set(key, it);
    const listEl = document.getElementById('forwardList');
    const st = listEl.scrollTop;
    fwdRender();
    listEl.scrollTop = st;
    fwdRenderBottom();
}
function fwdUpdateDivider() {
    const info = fwdMsgInfo();
    const hasText = info.editable ? !!document.getElementById('fwdNote').value.trim() : !!info.readText;
    document.getElementById('fwdDiv').style.display = (info.media.length && hasText) ? 'block' : 'none';
}
function fwdRenderBottom() {
    const info = fwdMsgInfo();
    const thumbs = document.getElementById('fwdThumbs');
    thumbs.innerHTML = info.media.map(m => '<div class="fwd-thumb">' + m.html + '</div>').join('');
    thumbs.style.display = info.media.length ? 'flex' : 'none';
    const note = document.getElementById('fwdNote'), txt = document.getElementById('fwdCardText');
    note.style.display = info.editable ? 'block' : 'none';
    const showTxt = !info.editable && !!info.readText;
    txt.style.display = showTxt ? '-webkit-box' : 'none';
    txt.textContent = info.readText;
    fwdUpdateDivider();
    const items = [...fwdSelected.values()];
    document.getElementById('fwdSelRow').style.display = items.length ? 'flex' : 'none';
    document.getElementById('fwdChips').innerHTML = items.map(it =>
        `<div class="fwd-chip" data-rm="${fwdEsc(it.key)}"><img src="${fwdEsc(it.avatar)}" alt=""><span>${fwdEsc(it.name)}</span></div>`).join('');
    document.getElementById('fwdSendBtn').style.display = items.length ? 'flex' : 'none';
}
// ── Status audience sheet ──
function fwdOpenAudience() {
    fwdAudView = 'main';
    fwdRenderAudience();
    document.getElementById('fwdAudBack').style.display = 'block';
    document.getElementById('fwdAud').style.display = 'block';
}
function fwdCloseAudience() {
    document.getElementById('fwdAudBack').style.display = 'none';
    document.getElementById('fwdAud').style.display = 'none';
    fwdSavePrefs();
    if (fwdItems.length) fwdRender();
}
function fwdRenderAudience() {
    const box = document.getElementById('fwdAud');
    const person = (id) => (fwdItems.find(i => i.kind === 'user' && i.id === id) || { name: id });
    if (fwdAudView === 'except') {
        const friends = fwdItems.filter(i => i.kind === 'user' && fwdFriendIds.has(i.id)).sort((a, b) => a.name.localeCompare(b.name));
        box.innerHTML = `
            <div class="fwd-aud-grab"></div>
            <div class="fwd-aud-title">Friends except…</div>
            <div class="fwd-aud-scroll">${friends.length ? friends.map(f => `
                <div class="fwd-row" data-ex="${fwdEsc(f.id)}">
                    <div class="fwd-av"><img src="${fwdEsc(f.avatar)}" alt=""></div>
                    <div class="fwd-main"><span class="fwd-name">${fwdEsc(f.name)}</span></div>
                    <div class="fwd-check${fwdAudience.except.includes(f.id) ? ' on' : ''}"><i class="fa-solid fa-check"></i></div>
                </div>`).join('') : '<div class="fwd-empty">No friends yet.</div>'}</div>
            <div class="fwd-aud-actions"><button class="fwd-done" data-act="back">Done</button></div>`;
        return;
    }
    const opt = (vis, icon, label, extra) => `
        <div class="fwd-aud-opt" data-vis="${vis}">
            <div class="fwd-aud-ico"><i class="fa-solid ${icon}"></i></div>
            <div class="fwd-main"><span class="fwd-name">${label}</span>${extra || ''}</div>
            <div class="fwd-radio${fwdAudience.vis === vis ? ' on' : ''}"></div>
        </div>`;
    box.innerHTML = `
        <div class="fwd-aud-grab"></div>
        <div class="fwd-aud-title">Choose audience</div>
        ${opt('friends', 'fa-user-group', 'My friends')}
        ${opt('closeFriends', 'fa-star', 'Close friends')}
        ${opt('except', 'fa-user-xmark', 'My friends except…', `<span class="fwd-aud-edit" data-act="edit">${fwdAudience.except.length} excluded · Edit ›</span>`)}
        <div class="fwd-aud-note">${fwdAllowReshare ? 'Your audience can share your status' : 'Your audience can’t share your status'}${fwdToFeed ? '<br>Also posted to your feed' : ''}</div>
        <div class="fwd-aud-actions">
            <div class="fwd-aud-tog${fwdAllowReshare ? ' on' : ''}" data-tog="reshare" title="Allow sharing"><i class="fa-solid fa-retweet"></i></div>
            <div class="fwd-aud-tog${fwdToFeed ? ' on' : ''}" data-tog="feed" title="Also post to feed"><i class="fa-solid fa-newspaper"></i></div>
            <button class="fwd-done" data-act="done">Done</button>
        </div>`;
}
function fwdAudienceClick(e) {
    const ex = e.target.closest('[data-ex]');
    if (ex) {
        const id = ex.dataset.ex, i = fwdAudience.except.indexOf(id);
        if (i >= 0) fwdAudience.except.splice(i, 1); else fwdAudience.except.push(id);
        fwdAudience.vis = 'except';
        fwdRenderAudience();
        return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
        if (act.dataset.act === 'edit') { fwdAudView = 'except'; fwdRenderAudience(); }
        else if (act.dataset.act === 'back') { fwdAudView = 'main'; fwdRenderAudience(); }
        else if (act.dataset.act === 'done') fwdCloseAudience();
        return;
    }
    const tog = e.target.closest('[data-tog]');
    if (tog) {
        if (tog.dataset.tog === 'reshare') fwdAllowReshare = !fwdAllowReshare; else fwdToFeed = !fwdToFeed;
        fwdRenderAudience();
        return;
    }
    const opt = e.target.closest('[data-vis]');
    if (opt) { fwdAudience.vis = opt.dataset.vis; fwdRenderAudience(); }
}
function fwdOpenSearch() {
    document.getElementById('fwdHeader').style.display = 'none';
    document.getElementById('fwdSearchBar').style.display = 'flex';
    document.getElementById('fwdSearchInput').focus();
}
function fwdCloseSearch() {
    const inp = document.getElementById('fwdSearchInput');
    if (inp) inp.value = '';
    fwdGlobal = []; fwdSearchSeq++;
    document.getElementById('fwdSearchBar').style.display = 'none';
    document.getElementById('fwdHeader').style.display = 'flex';
    if (fwdItems.length) fwdRender();
}
// Search: filters your chats/groups/friends instantly AND looks up any Nexus username (no separate screen needed).
function fwdOnSearchInput() {
    fwdRender();
    clearTimeout(fwdSearchTimer);
    const q = fwdQuery().replace(/^@/, '');
    if (q.length < 2) { fwdGlobal = []; fwdRender(); return; }
    const seq = ++fwdSearchSeq;
    fwdSearchTimer = setTimeout(async () => {
        try {
            const fp = firebase.firestore.FieldPath.documentId();
            const snap = await db.collection('users').where(fp, '>=', q).where(fp, '<=', q + '\uf8ff').limit(8).get();
            if (seq !== fwdSearchSeq) return;
            const known = new Set(fwdItems.filter(i => i.kind === 'user').map(i => i.id));
            fwdGlobal = snap.docs.filter(d => d.id !== myId && !known.has(d.id)).map(d => fwdUserItem(d.id, d.data(), 'global'));
            fwdRender();
        } catch (e) { console.warn('Forward global search:', e); }
    }, 300);
}
function closeForwardModal() {
    document.getElementById('forwardOverlay').style.display = 'none';
    fwdCloseAudience();
    fwdCloseSearch();
    if (selectedMessages.size > 0) document.getElementById('selectionActionBar').style.display = 'flex';
}
async function sendForward() {
    if (!fwdSelected.size) return;
    const info = fwdMsgInfo();
    const note = info.editable ? document.getElementById('fwdNote').value.trim() : null;   // edited caption (single photo/video only)
    const entries = [...selectedMessages.entries()];
    const targets = [...fwdSelected.values()];
    const opts = { vis: fwdAudience.vis, except: fwdAudience.except.slice(), reshare: fwdAllowReshare, feed: fwdToFeed };
    cancelSelection();
    closeForwardModal();
    for (const t of targets) {
        if (t.kind === 'user') await forwardEntriesToPeer(t.id, entries, note);
        else if (t.kind === 'group') await forwardEntriesToGroup(t.id, entries, note);
        else if (t.kind === 'status') await forwardEntriesToStatus(entries, note, opts);
    }
    fwdToast('Forwarded ✓');
}
// Groups: same message shape group.html itself writes (senderUsername + timestamp + text/image/video).
async function forwardEntriesToGroup(groupId, entries, note) {
    const col = db.collection('groups').doc(groupId).collection('messages');
    for (const [docId, data] of entries) {
        try {
            const base = { senderUsername: myId, timestamp: firebase.firestore.FieldValue.serverTimestamp(), replyTo: null, forwarded: true };
            if (!data.type) {
                const text = data.encrypted ? (decryptedCache[docId] ? decryptedCache[docId].text : null) : data.text;
                if (text == null) continue;
                await col.add(Object.assign(base, { text: text }));
            } else if ((data.type === 'image' || data.type === 'video') && !data.iv) {
                const cap = (note !== null && note !== undefined) ? note : (data.caption || '');
                await col.add(Object.assign(base, { text: cap, [data.type]: data.mediaUrl }));
            } else {
                console.warn('Forward to group: this message type is not supported yet:', data.type);
            }
        } catch (e) { console.error('Forward to group error', docId, e); }
    }
}
// Status (+ optional feed post): photo/video only. Same fields chats.js writes when posting a status.
async function forwardEntriesToStatus(entries, note, opts) {
    try {
        const meDoc = await db.collection('users').doc(myId).get();
        const d = meDoc.exists ? meDoc.data() : {};
        const pic = d.userProfilePic || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(myId));
        for (const [docId, data] of entries) {
            if ((data.type !== 'image' && data.type !== 'video') || data.iv) continue;
            const cap = (note !== null && note !== undefined) ? note : (data.caption || '');
            const doc = {
                userId: myId,
                username: d.fullName || myId,
                profileImg: pic,
                previewImg: data.mediaUrl,
                caption: cap,
                type: data.type,
                timestamp: Date.now(),
                visibility: opts.vis,
                closeFriendsList: d.closeFriends || [],
                allowReshare: opts.reshare !== false,
                isVerified: false,
                isBoosted: false,
                viewerIds: []
            };
            if (opts.vis === 'except') doc.exceptList = opts.except;
            await db.collection('statusData').add(doc);
            if (opts.feed) {
                await db.collection('posts').add({
                    username: myId, authorUsername: myId, fullName: d.fullName || myId, userProfilePic: d.userProfilePic || '',
                    content: cap, mediaUrl: data.mediaUrl, mediaType: data.type,
                    likesCount: 0, commentsCount: 0, pinned: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    } catch (e) { console.error('Forward to status error:', e); }
}
async function forwardEntriesToPeer(peerId, entries, note) {
    const key = await deriveSharedKeyFor(peerId);
    const targetRoomId = getChatRoomId(myId, peerId);
try { await ensureRoom(targetRoomId, myId, peerId); } catch (e) { console.error('ensureRoom (forward):', e); return; }
    for (const [docId, data] of entries) {
        try {
            if (!data.type) {
                // Sakon RUBUTU
                let plaintext;
                if (data.encrypted) {
                    const cached = decryptedCache[docId];
                    plaintext = cached ? cached.text : null;
                    if (plaintext === null) { console.warn('Skip forward: sako bai buɗe ba tukuna'); continue; }
                } else {
                    plaintext = data.text;
                }
                const payload = { senderId: myId, receiverId: peerId, timestamp: Date.now(), replyTo: null, forwarded: true };
                if (key) {
                    const enc = await encryptWithKey(key, JSON.stringify({ text: plaintext, replySnippet: null }));
                    payload.encrypted = true; payload.iv = enc.iv; payload.ciphertext = enc.ciphertext;
                } else {
                    payload.encrypted = false; payload.text = plaintext;
                }
                await db.collection('personalChats').doc(targetRoomId).collection('messages').add(payload);
                await db.collection('personalChats').doc(targetRoomId).set({
                    lastMessage: key ? '🔒 Sako' : plaintext.substring(0, 60), lastMessageTime: Date.now(), members: [myId, peerId],
                    unreadCount: { [peerId]: firebase.firestore.FieldValue.increment(1) }
                }, { merge: true });
            } else if (data.type === 'image' || data.type === 'video' || data.type === 'audio') {
                // Sakon MEDIA — samo blob da aka buɗe (ko a buɗe yanzu), sake ɓoye da sabon key, sake upload.
                let blob;
                if (data.iv) {
                    const cachedUrl = decryptedMediaCache[docId];
                    const sourceUrl = (cachedUrl && cachedUrl !== 'error') ? cachedUrl : await decryptMediaToBlobUrl(data.mediaUrl, data.iv, data.mimeType);
                    blob = await (await fetch(sourceUrl)).blob();
                } else {
                    blob = await (await fetch(data.mediaUrl)).blob();
                }
                const origFile = new File([blob], 'forward', { type: data.mimeType || blob.type });
                let uploadFile = origFile, iv = null, encrypted = false;
                if (key) {
                    const buf = await origFile.arrayBuffer();
                    const ivBytes = crypto.getRandomValues(new Uint8Array(12));
                    const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, key, buf);
                    const randomName = 'm' + Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b => b.toString(16).padStart(2, '0')).join('') + '.bin';
                    uploadFile = new File([ctBuf], randomName, { type: 'application/octet-stream' });
                    iv = b64encode(ivBytes); encrypted = true;
                }
                const uploaded = await xhrUploadFile(uploadFile, targetRoomId, () => {});
                const msgDoc = { senderId: myId, receiverId: peerId, type: data.type, mediaUrl: uploaded.url, storageKey: uploaded.key || null, timestamp: Date.now(), mimeType: data.mimeType || origFile.type, forwarded: true };
                if (encrypted) { msgDoc.encrypted = true; msgDoc.iv = iv; }
                const capOut = (note !== null && note !== undefined) ? note : (data.caption || '');
                if (capOut && !encrypted) msgDoc.caption = capOut;
                await db.collection('personalChats').doc(targetRoomId).collection('messages').add(msgDoc);
                const lbl = data.type === 'image' ? '📷 Photo' : data.type === 'video' ? '🎥 Video' : '🎤 Voice message';
                await db.collection('personalChats').doc(targetRoomId).set({
                    lastMessage: encrypted ? `🔒 ${lbl}` : lbl, lastMessageTime: Date.now(), members: [myId, peerId],
                    [`unreadCount.${peerId}`]: firebase.firestore.FieldValue.increment(1)
                }, { merge: true });
            } else {
                console.warn("Forward: nau'in sako da ba a goyi bayan forward dinsa ba tukuna:", data.type);
            }
        } catch (e) {
            console.error('Forward error for message', docId, e);
        }
    }
}

// ── In-app fullscreen viewer (baya buɗe wani external page kamar Backblaze) ──
function formatViewerTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
function openFullAvatarPhoto() {
    const src = document.getElementById('chatInfoAvatar').src;
    if (src) openImageViewer(src);
}


const viewerSpeeds = [1, 1.5, 2];
function viewerCycleSpeed() {
    const vid = document.getElementById('viewerVideo');
    if (!vid) return;
    let idx = viewerSpeeds.indexOf(vid.playbackRate);
    idx = (idx + 1) % viewerSpeeds.length;
    vid.playbackRate = viewerSpeeds[idx];
    document.getElementById('viewerSpeedBadge').textContent = viewerSpeeds[idx].toFixed(1) + 'x';
}
function viewerStartScrub(e) {
    const vid = document.getElementById('viewerVideo');
    const track = document.getElementById('viewerTrack');
    if (!vid || !vid.duration || !isFinite(vid.duration)) return;
    const scrubTo = (clientX) => {
        const rect = track.getBoundingClientRect();
        let pct = (clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        vid.currentTime = pct * vid.duration;
    };
    scrubTo(e.clientX);
    const move = (ev) => scrubTo(ev.clientX);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
}
function closeMediaViewer() {
    const overlay = document.getElementById('mediaViewerOverlay');
    document.getElementById('mediaViewerContent').innerHTML = ''; // ya tsayar da bidiyo daga playing a baya
    overlay.classList.remove('show');
}
async function uploadAndSendMediaGroup(files) {
    await ciAuthReadyPromise;
    if (!firebase.auth().currentUser) {
        alert('Could not verify sign-in. Please log in again and retry.');
        return;
    }
    try {
        const uploaded = [];
        for (let file of files) {
            if (file.type.startsWith('image/')) file = await compressImageFile(file);
            let encResult = await encryptFileForUpload(file);
            const doUpload = async (fileToSend) => {
                const token = await firebase.auth().currentUser.getIdToken();
                const formData = new FormData();
                formData.append('file', fileToSend);
                formData.append('type', 'chatMedia');
                formData.append('username', chatRoomId);
                const res = await fetch('https://oryzon-backend-ed1q.onrender.com/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');
                return data.url;
            };
            let url;
            try {
                url = await doUpload(encResult.file);
            } catch (uploadErr) {
                if (encResult.encrypted) {
                    console.warn('Encrypted group upload failed, retrying without encryption:', uploadErr);
                    url = await doUpload(file);
                    encResult = { file, iv: null, mimeType: file.type, encrypted: false };
                } else {
                    throw uploadErr;
                }
            }
            const item = { type: file.type.startsWith('video') ? 'video' : 'image', mediaUrl: url, mimeType: encResult.mimeType };
            if (encResult.encrypted) item.iv = encResult.iv;
            uploaded.push(item);
        }
        await db.collection('personalChats').doc(chatRoomId).collection('messages').add({
            senderId: myId, receiverId: chatWith, type: 'imageGroup', mediaArr: uploaded, timestamp: Date.now()
        });
        await db.collection('personalChats').doc(chatRoomId).set({
            lastMessage: `📷 ${uploaded.length} Photos`, lastMessageTime: Date.now(), members: [myId, chatWith],
            unreadCount: { [chatWith]: firebase.firestore.FieldValue.increment(1) }
        }, { merge: true });
    } catch (err) {
        console.error('Group media upload error:', err);
        alert('Failed to send files: ' + err.message);
    }
    }

// ══════════════════════════════════════════════
//  SPA LIFECYCLE (router.js integration)
// ══════════════════════════════════════════════
function NexusChatInterior_init() {
    // Sabon chat — sake karanta ainihin wanda ake magana da shi daga URL,
    // domin duk sauran functions a wannan fayil (wadanda ke amfani da
    // chatWith/myId/chatRoomId ta hanyar closure) su ga sabon daraja.
    const urlParams = new URLSearchParams(window.location.search);
    chatWith = urlParams.get('with') || 'Unknown User';
    myId = localStorage.getItem('nexus_user_session');
    if (!myId) { window.location.href = 'login.html'; return; }
    chatRoomId = getChatRoomId(myId, chatWith);
    console.log('DEBUG →', 'myId=', myId, '| chatWith=', chatWith, '| chatRoomId=', chatRoomId);

    if (localStorage.getItem('nexus_chatlock_' + chatRoomId) === 'on') {
        const pin = prompt('This chat is locked. Enter PIN:');
        if (pin !== localStorage.getItem('nexus_chatlock_' + chatRoomId + '_pin')) {
            alert('Incorrect PIN.');
            window.location.href = 'chats.html';
            return;
        }
    }
    if (localStorage.getItem('nexus_mediavis_' + chatRoomId) === 'off') {
        document.getElementById('chat-flow').classList.add('hide-media');
    }
    applyChatTheme(localStorage.getItem('nexus_theme_' + myId) || 'Nexus');

    // Sake saita duk wani per-chat state zuwa tsohon farawa, domin ragowar
    // wani tsohon chat (E2E key, decrypted cache, unread badge, da sauransu)
    // kada su bi mu zuwa sabon chat din.
    myE2EKeyPair = null;
    e2eSharedKey = null;
    e2eInitPromise = null;
    decryptedCache = {};
    decryptedMediaCache = {};
    latestMsgSnapshot = null;
    pendingMessages = [];
    isUserNearBottom = true;
    unseenWhileScrolledUp = 0;
    { const _cf = document.getElementById('chat-flow'); if (_cf) _cf.innerHTML = ''; nxLastRenderedCount = 0; }
    peerIsTyping = false;
    peerIsOnline = false;
    peerLastSeen = null;
    myClearedAt = null;
ensureRoom(chatRoomId, myId, chatWith).catch(e => console.warn('ensureRoom:', e)).then(() => db.collection('personalChats').doc(chatRoomId).get()).then(doc => {
        const d = doc.data() || {};
        myClearedAt = (d.clearedAt && d.clearedAt[myId]) || null;
        renderChatFlow();
    }).catch(() => {});

    populateChatHeaderInfo();
    wireMessagingUI();
    wireScrollTracking();
    wireOfflineHandling();
 wireMediaInputs();

    // Dole ne wannan ya kasance A CIKIN init() — #captionOverlay yana
    // sake-halitta a kowane shigowa ta SPA (innerHTML swap), don haka
    // sai an sake daure listener din a KOWANE shigowa, ba sau daya kawai
    // a saman fayil ba (wanda ke daure wa tsohon, element din da ya bace).
    document.getElementById('captionOverlay').addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// ══════════════════════════════════════════════════════════════════
//  OVERLAY HISTORY — every overlay pushes one history entry, so the phone's
//  Back button (and our own back arrows) close ONLY the top overlay:
//  viewer -> media gallery -> contact info -> chat. Never the whole page.
// ══════════════════════════════════════════════════════════════════
var nxOvStack = [];
function nxOvPush(name, closeFn) {
    nxOvStack.push({ name: name, closeFn: closeFn });
    try { history.pushState({ nxOv: name }, '', location.href); } catch (e) {}
}
function nxOvHas(name) { return nxOvStack.some(function (o) { return o.name === name; }); }
function nxOvBack() {
    if (!nxOvStack.length) return;
    try { history.back(); } catch (e) { var t = nxOvStack.pop(); try { t.closeFn(); } catch (e2) {} }
}
function nxOvCloseAll() {
    var n = nxOvStack.length; if (!n) return;
    while (nxOvStack.length) { var t = nxOvStack.pop(); try { t.closeFn(); } catch (e) {} }
    window.__nxOvSkip = true;
    try { history.go(-n); } catch (e) { window.__nxOvSkip = false; }
    setTimeout(function () { window.__nxOvSkip = false; }, 700);
}
if (!window.__nxOvBound) {
    window.__nxOvBound = true;
    window.addEventListener('popstate', function (e) {
        if (window.__nxOvSkip) { window.__nxOvSkip = false; e.stopImmediatePropagation(); return; }
        if (!nxOvStack.length) return;
        e.stopImmediatePropagation();
        var top = nxOvStack.pop();
        try { top.closeFn(); } catch (err) { console.error(err); }
    }, true);
}

// ══════════════════════════════════════════════════════════════════
//  MEDIA INDEX — built from the live message snapshot (ALL messages, no limit)
// ══════════════════════════════════════════════════════════════════
function nxTsMs(t) {
    if (!t) return 0;
    if (typeof t === 'number') return t;
    if (t.toMillis) return t.toMillis();
    var n = new Date(t).getTime();
    return isNaN(n) ? 0 : n;
}
function nxMediaIndex() {
    var out = { media: [], docs: [], links: [], starred: 0 };
    if (!latestMsgSnapshot) return out;
    latestMsgSnapshot.forEach(function (doc) {
        var d = doc.data();
        var ts = nxTsMs(d.timestamp);
        if (myClearedAt && ts && ts < nxTsMs(myClearedAt)) return;
        if (d.starredBy && d.starredBy[myId]) out.starred++;
        if ((d.type === 'image' || d.type === 'video') && !d.viewOnce) {
            out.media.push({ key: doc.id, msgId: doc.id, idx: 0, type: d.type, url: d.mediaUrl, iv: d.iv, mime: d.mimeType, ts: ts, from: d.senderId, d: d });
        } else if (d.type === 'imageGroup' && Array.isArray(d.mediaArr)) {
            d.mediaArr.forEach(function (m, i) {
                out.media.push({ key: doc.id + '_' + i, msgId: doc.id, idx: i, type: m.type || 'image', url: m.mediaUrl, iv: m.iv, mime: m.mimeType, ts: ts, from: d.senderId, d: d });
            });
        } else if (d.type === 'document') {
            out.docs.push({ msgId: doc.id, name: d.fileName || 'File', size: d.fileSize || '', url: d.mediaUrl, ts: ts, from: d.senderId });
        }
        var text = d.encrypted ? (decryptedCache[doc.id] && decryptedCache[doc.id].text) : d.text;
        if (text) {
            var m = String(text).match(/https?:\/\/[^\s<>"']+/gi);
            if (m) m.forEach(function (u) { out.links.push({ msgId: doc.id, url: u, text: String(text), ts: ts, from: d.senderId }); });
        }
    });
    out.media.sort(function (a, b) { return (b.ts - a.ts) || (a.idx - b.idx); });
    out.docs.sort(function (a, b) { return b.ts - a.ts; });
    out.links.sort(function (a, b) { return b.ts - a.ts; });
    return out;
}
function nxMediaSrc(it) {
    if (it.tmpSrc) return it.tmpSrc;
    if (it.iv) { var c = decryptedMediaCache[it.key]; return (c && c !== 'error') ? c : ''; }
    return it.url || '';
}
function nxFmtDur(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function nxEmptyHTML(icon, text) { return '<div class="mg-empty"><i class="fa-solid ' + icon + '"></i><div>' + text + '</div></div>'; }

// ══════════════════════════════════════════════════════════════════
//  CONTACT-INFO helpers (strip + counts come from the same index; no extra reads)
// ══════════════════════════════════════════════════════════════════
var nxInfoList = [];
function loadRecentMediaForOverlay() {
    var strip = document.getElementById('chatInfoMediaStrip');
    var idx = nxMediaIndex();
    nxInfoList = idx.media;
    if (!idx.media.length) { strip.innerHTML = '<span class="ci-media-empty" style="padding-left:16px;">No media yet</span>'; return; }
    strip.innerHTML = idx.media.slice(0, 40).map(function (it, i) {
        var elId = 'cim_' + it.key;
        var src = it.iv ? resolveMediaSrc(it.key, it.url, it.iv, it.mime, elId) : it.url;
        var isVideo = it.type === 'video';
        var inner = isVideo
            ? '<video id="' + elId + '" src="' + (src || '') + '" preload="metadata" muted playsinline></video><i class="fa-solid fa-play ci-play"></i>'
            : '<img id="' + elId + '" src="' + (src || '') + '" alt="" loading="lazy">';
        return '<div class="ci-thumb" onclick="nxOpenInfoMedia(' + i + ')">' + inner + '</div>';
    }).join('');
}
function nxOpenInfoMedia(i) { if (nxInfoList.length) nxViewerOpen(nxInfoList, i); }
window.nxOpenInfoMedia = nxOpenInfoMedia;
function loadOverlayCounts() {
    var idx = nxMediaIndex();
    document.getElementById('chatInfoMediaCount').textContent = (idx.media.length + idx.docs.length + idx.links.length).toLocaleString();
    document.getElementById('chatInfoStarredCount').textContent = idx.starred.toLocaleString();
}

// ══════════════════════════════════════════════════════════════════
//  MEDIA / DOCS / LINKS overlay
// ══════════════════════════════════════════════════════════════════
var mgState = null;
function mgPeriod(ts) {
    var now = new Date(), day = 864e5;
    var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (ts >= startToday) return 'Today';
    if (ts >= startToday - day) return 'Yesterday';
    if (ts >= startToday - 6 * day) return 'This week';
    var d = new Date(ts);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return 'This month';
    return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
}
function openMediaLinksDocs() {
    var ov = document.getElementById('mediaGalleryOverlay');
    var idx = nxMediaIndex();
    mgState = { idx: idx, shown: 0, lastSec: null, grid: null, io: null, sio: null };
    document.getElementById('mgTitle').textContent = document.getElementById('chat-header-name').textContent;
    var total = idx.media.length + idx.docs.length + idx.links.length;
    document.getElementById('mgSub').textContent = total.toLocaleString() + (total === 1 ? ' item' : ' items');
    document.getElementById('mgCntMedia').textContent = idx.media.length ? idx.media.length.toLocaleString() : '';
    document.getElementById('mgCntDocs').textContent = idx.docs.length ? idx.docs.length.toLocaleString() : '';
    document.getElementById('mgCntLinks').textContent = idx.links.length ? idx.links.length.toLocaleString() : '';
    ov.style.display = 'flex';
    mgRenderMedia(); mgRenderDocs(); mgRenderLinks();
    var panes = document.getElementById('mgPanes');
    if (!panes._nxBound) {
        panes._nxBound = true;
        var raf = 0;
        panes.addEventListener('scroll', function () {
            if (raf) return;
            raf = requestAnimationFrame(function () {
                raf = 0;
                var w = panes.clientWidth || 1, p = panes.scrollLeft / w;
                document.getElementById('mgInd').style.transform = 'translateX(' + (p * 100) + '%)';
                var a = Math.round(p);
                document.querySelectorAll('#mgTabs .mg-tab').forEach(function (t, i) { t.classList.toggle('active', i === a); });
            });
        }, { passive: true });
    }
    panes.scrollLeft = 0;
    document.getElementById('mgInd').style.transform = 'translateX(0)';
    document.querySelectorAll('#mgTabs .mg-tab').forEach(function (t, i) { t.classList.toggle('active', i === 0); });
    if (!nxOvHas('gallery')) nxOvPush('gallery', nxHideGallery);
}
function nxHideGallery() {
    var ov = document.getElementById('mediaGalleryOverlay');
    if (ov) ov.style.display = 'none';
    if (mgState) { if (mgState.io) mgState.io.disconnect(); if (mgState.sio) mgState.sio.disconnect(); }
    mgState = null;
}
function closeMediaGallery() { if (nxOvHas('gallery')) nxOvBack(); else nxHideGallery(); }
function mgSwitch(i) {
    var panes = document.getElementById('mgPanes');
    panes.scrollTo({ left: i * panes.clientWidth, behavior: 'smooth' });
}
function mgRenderMedia() {
    var pane = document.getElementById('mgPaneMedia');
    pane.innerHTML = '';
    var list = mgState.idx.media;
    if (!list.length) { pane.innerHTML = nxEmptyHTML('fa-images', 'No photos or videos yet'); return; }
    mgState.io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { mgLoadTile(en.target); mgState.io.unobserve(en.target); } });
    }, { root: pane, rootMargin: '700px 0px' });
    var sentinel = document.createElement('div');
    sentinel.id = 'mgSentinel'; sentinel.style.cssText = 'height:2px;';
    pane.appendChild(sentinel);
    mgState.sio = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) mgAppendMedia(pane, 120);
    }, { root: pane, rootMargin: '1200px 0px' });
    mgAppendMedia(pane, 150);
    mgState.sio.observe(sentinel);
}
function mgAppendMedia(pane, n) {
    if (!mgState) return;
    var list = mgState.idx.media, end = Math.min(list.length, mgState.shown + n);
    var sentinel = document.getElementById('mgSentinel');
    for (var i = mgState.shown; i < end; i++) {
        var it = list[i], label = mgPeriod(it.ts);
        if (label !== mgState.lastSec) {
            var sec = document.createElement('div'); sec.className = 'mg-sec'; sec.textContent = label;
            var grid = document.createElement('div'); grid.className = 'mg-grid';
            pane.insertBefore(sec, sentinel); pane.insertBefore(grid, sentinel);
            mgState.lastSec = label; mgState.grid = grid;
        }
        var tile = document.createElement('div');
        tile.className = 'mg-tile'; tile.dataset.i = i;
        tile.onclick = (function (k) { return function () { mgOpen(k); }; })(i);
        if (it.type === 'video') tile.innerHTML = '<div class="mg-vid"><i class="fa-solid fa-video"></i><span></span></div>';
        mgState.grid.appendChild(tile);
        mgState.io.observe(tile);
    }
    mgState.shown = end;
    if (end >= list.length && mgState.sio) mgState.sio.disconnect();
}
function mgLoadTile(tile) {
    if (!mgState) return;
    var it = mgState.idx.media[+tile.dataset.i]; if (!it || tile.querySelector('img,video')) return;
    var elId = 'mgt_' + it.key;
    var isVid = it.type === 'video';
    var el = document.createElement(isVid ? 'video' : 'img');
    el.id = elId;
    if (isVid) {
        el.preload = 'metadata'; el.muted = true; el.setAttribute('playsinline', '');
        el.addEventListener('loadedmetadata', function () {
            el.classList.add('ready');
            var sp = tile.querySelector('.mg-vid span'); if (sp && isFinite(el.duration)) sp.textContent = nxFmtDur(el.duration);
        });
    } else {
        el.alt = ''; el.decoding = 'async';
        el.addEventListener('load', function () { el.classList.add('ready'); });
    }
    tile.insertBefore(el, tile.firstChild);
    if (it.iv) {
        var s = resolveMediaSrc(it.key, it.url, it.iv, it.mime, elId);
        if (s) el.src = s;
    } else {
        el.src = isVid ? (it.url + '#t=0.1') : it.url;
    }
}
function mgOpen(i) { if (mgState) nxViewerOpen(mgState.idx.media, i); }
function mgRenderDocs() {
    var pane = document.getElementById('mgPaneDocs'), docs = mgState.idx.docs;
    if (!docs.length) { pane.innerHTML = nxEmptyHTML('fa-file-lines', 'No documents yet'); return; }
    var colors = { pdf: '#e5484d', doc: '#2f6fe4', docx: '#2f6fe4', xls: '#1f9d55', xlsx: '#1f9d55', ppt: '#e8742c', pptx: '#e8742c', zip: '#7a8594', txt: '#6b7280' };
    var html = '', last = null;
    docs.forEach(function (d, i) {
        var lab = mgPeriod(d.ts);
        if (lab !== last) { html += '<div class="mg-sec">' + nxEsc(lab) + '</div>'; last = lab; }
        var ext = (String(d.name).split('.').pop() || '').toLowerCase();
        if (ext === String(d.name).toLowerCase()) ext = '';
        var when = new Date(d.ts).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
        html += '<div class="mg-row" onclick="mgOpenDoc(' + i + ')"><div class="mg-ico" style="background:' + (colors[ext] || '#5b6573') + ';">' + nxEsc((ext || 'FILE').slice(0, 4).toUpperCase()) + '</div>'
              + '<div class="mg-rt"><div class="mg-rn">' + nxEsc(d.name) + '</div><div class="mg-rm">' + nxEsc(d.size ? d.size + ' · ' + when : when) + '</div></div></div>';
    });
    pane.innerHTML = html;
}
function mgOpenDoc(i) { var d = mgState && mgState.idx.docs[i]; if (d && d.url) window.open(d.url, '_blank', 'noopener'); }
function mgRenderLinks() {
    var pane = document.getElementById('mgPaneLinks'), links = mgState.idx.links;
    if (!links.length) { pane.innerHTML = nxEmptyHTML('fa-link', 'No links yet'); return; }
    var html = '', last = null;
    links.forEach(function (l, i) {
        var lab = mgPeriod(l.ts);
        if (lab !== last) { html += '<div class="mg-sec">' + nxEsc(lab) + '</div>'; last = lab; }
        var host = l.url; try { host = new URL(l.url).hostname.replace(/^www\./, ''); } catch (e) {}
        html += '<div class="mg-row" onclick="mgOpenLink(' + i + ')"><div class="mg-ico" style="background:#26303b;"><i class="fa-solid fa-link" style="font-size:16px;"></i></div>'
              + '<div class="mg-rt"><div class="mg-rn">' + nxEsc(host) + '</div><div class="mg-rm">' + nxEsc(l.url) + '</div>'
              + (l.text.trim() !== l.url ? '<div class="mg-rs">' + nxEsc(l.text) + '</div>' : '') + '</div></div>';
    });
    pane.innerHTML = html;
}
function mgOpenLink(i) { var l = mgState && mgState.idx.links[i]; if (l) window.open(l.url, '_blank', 'noopener'); }
window.mgSwitch = mgSwitch; window.mgOpen = mgOpen; window.mgOpenDoc = mgOpenDoc; window.mgOpenLink = mgOpenLink;

// ══════════════════════════════════════════════════════════════════
//  IMMERSIVE MEDIA VIEWER — same structure, icons and behaviour as group.html's #mediaViewer
// ══════════════════════════════════════════════════════════════════
var nxvState = null;
function nxViewerHide() {
    var st = nxvState; if (!st) return;
    st.closing = true;
    try { if (st.v._fs) document.removeEventListener('fullscreenchange', st.v._fs); } catch (e) {}
    var dock = document.querySelector('.input-area');
    if (st.dockHome && dock) {
        dock.classList.remove('in-viewer');
        dock.style.bottom = '';
        if (st.vvFn && window.visualViewport) { window.visualViewport.removeEventListener('resize', st.vvFn); window.visualViewport.removeEventListener('scroll', st.vvFn); }
        st.dockHome.insertBefore(dock, st.dockNext && st.dockNext.parentNode === st.dockHome ? st.dockNext : null);
        var inp = document.getElementById('msgInput'); if (inp) inp.placeholder = st.ph || 'Message...';
        if (st.autoReply) cancelReply();
    }
    st.v.querySelectorAll('video').forEach(function (x) { try { x.pause(); } catch (e) {} });
    st.v.remove();
    nxvState = null;
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
}
function nxViewerClose() { if (nxOvHas('viewer')) nxOvBack(); else nxViewerHide(); }
function nxViewerOpen(list, idx) {
    if (!list || !list.length) return;
    if (nxvState) nxViewerHide();
    idx = Math.max(0, Math.min(list.length - 1, idx || 0));
    var vo = !!list[0].vo;
    var v = document.createElement('div');
    v.id = 'mediaViewer';
    v.style.cssText = 'position:fixed;inset:0;width:100%;z-index:100070;background:#000;font-family:Inter,sans-serif;overflow:hidden;';
    var iconCss = 'width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;cursor:pointer;';
    v.innerHTML =
        '<div id="mvBar" style="position:absolute;top:0;left:0;right:0;z-index:4;display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top, 0px) + 8px) 12px 22px;background:linear-gradient(180deg,rgba(0,0,0,0.75),transparent);color:#fff;">'
      + '<button id="mvBack" type="button" aria-label="Back" style="flex:0 0 32px;width:32px;height:40px;padding:0;border:0;background:transparent;color:#fff;display:flex;align-items:center;justify-content:center;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg></button>'
      + '<div style="flex:1;min-width:0;"><div id="mvWho" style="font-size:17px;font-weight:600;"></div><div id="mvWhen" style="font-size:13px;opacity:0.75;margin-top:2px;"></div></div>'
      + (vo ? '' :
          '<div style="' + iconCss + '" id="mvDownload"><i class="fa-solid fa-download"></i></div>'
        + '<div style="' + iconCss + '" id="mvForward"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-1a6 6 0 0 1 6-6h6"/><path d="M14 6l5 5-5 5"/><path d="M18 6l4 5-4 5"/></svg></div>'
        + '<div style="' + iconCss + '" id="mvStatus"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="3.5"/><path d="M20 2v6M17 5h6"/></svg></div>'
        + '<div style="' + iconCss + '" id="mvMore"><i class="fa-solid fa-ellipsis-vertical"></i></div>')
      + '</div>'
      + '<div id="mvStrip" style="position:absolute;inset:0;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;">'
      + list.map(function (it, i) { return '<div class="nxv-slide" data-i="' + i + '" style="flex:0 0 100%;width:100%;height:100%;scroll-snap-align:center;scroll-snap-stop:always;display:flex;align-items:center;justify-content:center;"></div>'; }).join('')
      + '</div>'
      + '<div id="mvCaption" style="display:none;position:absolute;left:0;right:0;bottom:' + (vo ? 0 : 74) + 'px;z-index:3;padding:36px 18px 10px;color:#fff;font-size:15px;line-height:1.35;text-align:left;background:linear-gradient(0deg,rgba(0,0,0,0.7),transparent);"><div id="mvCapText" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;white-space:pre-wrap;"></div><span id="mvCapMore" style="display:none;position:absolute;right:18px;bottom:10px;font-weight:700;padding-left:30px;background:linear-gradient(90deg,transparent,rgba(0,0,0,0.85) 40%);">Read more</span></div>';
    document.body.appendChild(v);
    var st = nxvState = { v: v, list: list, cur: -1, vo: vo, closing: false };
    var strip = v.querySelector('#mvStrip');
    var W = function () { return strip.clientWidth || window.innerWidth || 1; };
    strip.scrollLeft = idx * W();

    var toast = function (msg) {
        var old = v.querySelector('#mvToast'); if (old) old.remove();
        var t = document.createElement('div'); t.id = 'mvToast'; t.textContent = msg;
        t.style.cssText = 'position:absolute;left:50%;bottom:90px;transform:translateX(-50%);z-index:10;background:rgba(235,235,240,0.96);color:#111;font:500 14px Inter,sans-serif;padding:10px 20px;border-radius:999px;white-space:nowrap;pointer-events:none;';
        v.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
    };
    var fill = function (i) {
        v.querySelectorAll('.nxv-slide').forEach(function (s) {
            var j = +s.dataset.i, near = Math.abs(j - i) <= 1;
            if (!near) { if (s.firstChild) { var vv = s.querySelector('video'); if (vv) { try { vv.pause(); } catch (e) {} } s.innerHTML = ''; } return; }
            if (s.firstChild) return;
            var it = list[j], src = nxMediaSrc(it), elId = 'nxv_' + it.key + '_' + j;
            var common = 'max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;background:#000;';
            s.innerHTML = it.type === 'video'
                ? '<video id="' + elId + '"' + (src ? ' src="' + src + '"' : '') + ' ' + (vo ? 'controlsList="nodownload noplaybackrate" disablePictureInPicture ' : '') + 'controls playsinline style="' + common + '"></video>'
                : '<img id="' + elId + '"' + (src ? ' src="' + src + '"' : '') + ' alt="" style="' + common + '">';
            if (!src && it.iv) resolveMediaSrc(it.key, it.url, it.iv, it.mime, elId);
        });
    };
    var sync = function (i) {
        var it = list[i]; if (!it) return;
        st.cur = i;
        var who = it.from == null ? '' : (it.from === myId ? 'You' : (document.getElementById('chat-header-name').textContent || chatWith));
        v.querySelector('#mvWho').textContent = who;
        var d = new Date(it.ts || Date.now());
        v.querySelector('#mvWhen').textContent = it.ts ? d.toLocaleDateString([], { day: 'numeric', month: 'long' }) + ', ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase() : '';
        var cap = '';
        if (it.d && it.msgId) { try { cap = resolveCaption({ id: it.msgId }, it.d) || ''; } catch (e) {} if (!cap && it.d.type !== 'imageGroup' && it.d.caption) cap = it.d.caption; }
        var capEl = v.querySelector('#mvCaption'), ct = v.querySelector('#mvCapText'), more = v.querySelector('#mvCapMore');
        ct.textContent = cap; capEl.style.display = cap ? 'block' : 'none';
        ct.style.webkitLineClamp = '3'; ct.style.display = '-webkit-box'; ct.style.maxHeight = ''; ct.style.overflowY = 'hidden'; more.style.display = 'none'; capEl.onclick = null; capEl.style.cursor = '';
        if (cap && ct.scrollHeight > ct.clientHeight + 1) {
            more.style.display = 'block'; capEl.style.cursor = 'pointer';
            capEl.onclick = function () { ct.style.webkitLineClamp = 'unset'; ct.style.display = 'block'; ct.style.maxHeight = '38vh'; ct.style.overflowY = 'auto'; more.style.display = 'none'; };
        }
        fill(i);
        v.querySelectorAll('.nxv-slide video').forEach(function (x) { try { x.pause(); } catch (e) {} });
        var cv = v.querySelector('.nxv-slide[data-i="' + i + '"] video');
        if (cv) { var p = cv.play(); if (p && p.catch) p.catch(function () {}); }
        if (st.dockHome && it.d && it.msgId) { startReplyTo(it.msgId, it.d, true); st.autoReply = true; }
    };

    // dock (typing bar) moves into the viewer as "Reply", exactly like group
    if (!vo && !captionModeActive && list[idx].d) {
        var dock = document.querySelector('.input-area'), inp = document.getElementById('msgInput');
        if (dock) {
            st.dockHome = dock.parentNode; st.dockNext = dock.nextSibling; st.ph = inp ? inp.placeholder : '';
            v.appendChild(dock); dock.classList.add('in-viewer');
            if (inp) inp.placeholder = 'Reply';
            if (window.visualViewport) {
                st.vvFn = function () { var vv = window.visualViewport; var off = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); dock.style.bottom = off + 'px'; var c = v.querySelector('#mvCaption'); if (c) c.style.bottom = (74 + off) + 'px'; };
                window.visualViewport.addEventListener('resize', st.vvFn);
                window.visualViewport.addEventListener('scroll', st.vvFn);
            }
        }
    }
    sync(idx);

    var raf = 0;
    strip.addEventListener('scroll', function () {
        if (raf) return;
        raf = requestAnimationFrame(function () {
            raf = 0;
            var i = Math.max(0, Math.min(list.length - 1, Math.round(strip.scrollLeft / W())));
            if (i !== st.cur) sync(i);
        });
    }, { passive: true });
    strip.addEventListener('click', function (e) {
        if (e.target.tagName === 'VIDEO') return;
        var bar = v.querySelector('#mvBar'); if (bar) bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
    });
    v.querySelector('#mvBack').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); nxViewerClose(); });

    var item = function () { return list[st.cur]; };
    var dl = v.querySelector('#mvDownload');
    if (dl) dl.onclick = async function () {
        var it = item(), src = nxMediaSrc(it); if (!src) return;
        var name = (it.type === 'video' ? 'video_' : 'photo_') + Date.now() + (it.type === 'video' ? '.mp4' : '.jpg');
        var trigger = function (href) { var a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
        try {
            var blob = await (await fetch(src, { cache: 'no-store', mode: 'cors' })).blob();
            var u = URL.createObjectURL(blob); trigger(u); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
            toast('Saved to gallery');
        } catch (e) { trigger(src); toast('Download started'); }
    };
    var fw = v.querySelector('#mvForward');
    if (fw) fw.onclick = function () {
        var it = item(); if (!it.d) return;
        selectedMessages.clear(); selectedMessages.set(it.msgId, it.d);
        nxOvBack();
        setTimeout(function () { forwardSelected(); }, 150);
    };
    var stBtn = v.querySelector('#mvStatus');
    if (stBtn) stBtn.onclick = function () { toast('Status sharing coming soon'); };
    var mm = v.querySelector('#mvMore');
    if (mm) mm.onclick = function () {
        var oldMenu = v.querySelector('#mvMenu');
        if (oldMenu) { oldMenu.remove(); var ob = v.querySelector('#mvMenuBg'); if (ob) ob.remove(); return; }
        var it = item(); var starred = !!(it.d && it.d.starredBy && it.d.starredBy[myId]);
        var bg = document.createElement('div'); bg.id = 'mvMenuBg'; bg.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:8;';
        var menu = document.createElement('div'); menu.id = 'mvMenu'; menu.className = 'nxv-menu';
        menu.innerHTML = '<div class="nxv-item" data-act="share"><i class="fa-solid fa-share-nodes"></i> Share</div>'
            + '<div class="nxv-item" data-act="star"><i class="fa-solid fa-star"></i> ' + (starred ? 'Unstar' : 'Star') + '</div>'
            + '<div class="nxv-item" data-act="show"><i class="fa-solid fa-message"></i> Show in chat</div>'
            + '<div class="nxv-div"></div>'
            + '<div class="nxv-item danger" data-act="delete"><i class="fa-solid fa-trash"></i> Delete</div>'
            + '<div class="nxv-item danger" data-act="report"><i class="fa-solid fa-flag"></i> Report</div>';
        var closeMenu = function () { menu.remove(); bg.remove(); };
        bg.onclick = closeMenu;
        menu.onclick = async function (e) {
            var row = e.target.closest('[data-act]'); if (!row) return;
            var act = row.dataset.act; closeMenu();
            var cur = item();
            if (act === 'share') {
                var src = nxMediaSrc(cur);
                try {
                    var blob = await (await fetch(src)).blob();
                    var file = new File([blob], (cur.type === 'video' ? 'video.mp4' : 'photo.jpg'), { type: blob.type || (cur.type === 'video' ? 'video/mp4' : 'image/jpeg') });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
                } catch (e2) {}
                if (navigator.share && !cur.iv) navigator.share({ url: cur.url }).catch(function () {});
                else if (!cur.iv) { try { navigator.clipboard.writeText(cur.url); } catch (e3) {} toast('Link copied'); }
                else toast('Use Download to save this file');
            } else if (act === 'star') {
                if (!cur.d) return;
                var now = !(cur.d.starredBy && cur.d.starredBy[myId]);
                cur.d.starredBy = Object.assign({}, cur.d.starredBy || {}); if (now) cur.d.starredBy[myId] = true; else delete cur.d.starredBy[myId];
                db.collection('personalChats').doc(chatRoomId).collection('messages').doc(cur.msgId)
                  .set({ starredBy: { [myId]: now ? true : firebase.firestore.FieldValue.delete() } }, { merge: true }).catch(function () {});
                toast(now ? 'Starred' : 'Removed from starred');
            } else if (act === 'show') {
                var mid = cur.msgId; nxOvCloseAll(); setTimeout(function () { nxJumpToMessage(mid); }, 250);
            } else if (act === 'delete') {
                if (!cur.msgId || !confirm('Delete this message?')) return;
                try { await db.collection('personalChats').doc(chatRoomId).collection('messages').doc(cur.msgId).delete(); await refreshLastMessagePreview(); } catch (e4) { toast('Could not delete'); return; }
                nxOvBack();
            } else if (act === 'report') { toast('Report sent'); }
        };
        v.appendChild(bg); v.appendChild(menu);
    };

    try { if (v.requestFullscreen) v.requestFullscreen().catch(function () {}); } catch (e) {}
    v._fs = function () { if (!nxvState || nxvState.closing) return; if (!document.fullscreenElement) { nxvState.closing = true; nxOvBack(); } };
    document.addEventListener('fullscreenchange', v._fs);
    nxOvPush('viewer', nxViewerHide);
}
function nxOpenViewerByUrl(url, isVideo) {
    if (!url) return;
    var all = nxMediaIndex().media, i = -1;
    for (var k = 0; k < all.length; k++) { if (nxMediaSrc(all[k]) === url) { i = k; break; } }
    if (i < 0) { nxViewerOpen([{ key: 'u' + Date.now(), msgId: null, type: isVideo ? 'video' : 'image', tmpSrc: url, ts: 0, from: null, d: null, vo: true }], 0); return; }
    var mid = all[i].msgId, grp = all.filter(function (x) { return x.msgId === mid; });
    nxViewerOpen(grp, grp.indexOf(all[i]));
}
function openImageViewer(url) { nxOpenViewerByUrl(url, false); }
function openVideoViewer(url) { nxOpenViewerByUrl(url, true); }
window.nxViewerOpen = nxViewerOpen;

function NexusChatInterior_destroy() {
    try { while (nxOvStack.length) { var _t = nxOvStack.pop(); try { _t.closeFn(); } catch (e) {} } } catch (e) {}
    document.body.classList.remove('ci-info-open');
    nxScreenshotGuard(false);
    stopListeningToNexusMessages();
    stopMyPresenceHeartbeat();
    if (recordingTimerInterval) { clearInterval(recordingTimerInterval); recordingTimerInterval = null; }
    if (isRecording && recordingStream) {
        try { recordingStream.getTracks().forEach(t => t.stop()); } catch (e) {}
    }
    isRecording = false;
    isPaused = false;
    Object.values(decryptedMediaCache).forEach(v => {
        if (v && v !== 'error' && typeof v === 'string' && v.startsWith('blob:')) URL.revokeObjectURL(v);
    });
}

if (window.NexusRouter && typeof NexusRouter.registerPage === 'function') {
    NexusRouter.registerPage('chat-interior.html', { init: NexusChatInterior_init, destroy: NexusChatInterior_destroy });
}

// Native/farko load (ba SPA ba) — babu wanda zai kira init() saboda mu ba
// mun shigo ta router.navigateTo() ba, don haka mu kira shi da kanmu nan.
// BUGFIX: a baya ana kiran wannan KOYAUSHE, koda mun shigo ta SPA nav —
// wanda ke haddasa NexusChatInterior_init() ya gudana SAU BIYU nan take
// (daya a nan, daya ta router.runInit() bayan wannan script ya gama loda),
// yana ninka Firestore reads/listeners da DOM wiring, wanda ke taimakawa
// jinkirin farko wajen bayyanar sakonnin. document.readyState har yanzu
// 'loading'/'interactive' ne a native load (wannan script din defer ne),
// amma ya rigaya 'complete' idan router ya sanya wannan script bayan an
// SPA-navigate — shi muke amfani da shi domin bambanta su.
if (document.readyState !== 'complete') {
    NexusChatInterior_init();
}
