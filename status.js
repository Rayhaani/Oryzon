/* status.js — extracted from status.html for SPA navigation (router.js). */

/* =====================================================================
   NEXUS STORY MATRIX ENGINE — real Firebase Auth + Firestore, duk nau'in
   status (image/video/text/music/poll), viewer tracking, reactions,
   ghost mode na gaskiya, delete, time-capsule, AI enhance, duet, rooms.
===================================================================== */

const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;
let db, storage, auth;
let myUsername = null;       // ainihin identity — daga localStorage, kamar sauran app
const BACKEND_URL = 'https://oryzon-backend-ed1q.onrender.com'; // Backblaze upload endpoint dinka
let myFullName = '', myProfileImg = '';
let myFriendsSet = new Set();
let storyFeed = [];          // [{ userId, username, avatar, isMe, slides:[...] }]
let currentActiveUser = null;
let currentMediaIndex = 0;
let hudTimerClock;
let trackingProgress = 0;
let matrixStepDuration = 6000;
let isGhostModeActive = false;
let mediaTypeTimers = { image: 6000, text: 6000, music: 12000, poll: 8000 };
let mainContainer;
let friendGraphUnsub = null;

// router.js ya riga ya loda dukkan firebase compat SDKs (duba PAGE_SCRIPTS
// a router.js) KAFIN wannan script din status.js ya fara gudana, don haka
// babu bukatar loda su da hannu a nan kamar da — mun kira onFirebaseReady()
// kai tsaye nan take a kasa (duba layin karshe na wannan file).
let authReadyResolve;
const authReadyPromise = new Promise(resolve => { authReadyResolve = resolve; });

function onFirebaseReady() {
    const firebaseConfig = {
      apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
      authDomain: "oryzon-50ea4.firebaseapp.com",
      projectId: "oryzon-50ea4",
      storageBucket: "oryzon-50ea4.firebasestorage.app",
      messagingSenderId: "782106742622",
      appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
      measurementId: "G-K5085DLL2W"
    };
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    storage = firebase.storage();
    auth = firebase.auth();

    // request.auth != null shine kadai abinda rules ke bukata daga Auth —
    // ainihin IDENTITY shine localStorage 'nexus_user_session'.
    auth.onAuthStateChanged((user) => {
        if (!user) { auth.signInAnonymously().catch(err => console.error('Auth error:', err)); return; }
        myUsername = localStorage.getItem('nexus_user_session');
        if (!myUsername) { window.location.href = 'login.html'; return; }
        db.collection('users').doc(myUsername).get().then(doc => {
            const d = doc.exists ? doc.data() : {};
            myFullName = d.fullName || myUsername;
            myProfileImg = d.userProfilePic || ("https://api.dicebear.com/7.x/bottts/svg?seed=" + myUsername);
        }).catch(() => {});
        authReadyResolve();
    });
}

/* ===================== FRIEND GRAPH (collection "friends" da app dinka ke kula dashi) ===================== */

function subscribeToFriendGraph() {
    return db.collection('friends').where('users', 'array-contains', myUsername).onSnapshot(snap => {
        const set = new Set();
        snap.docs.forEach(d => (d.data().users || []).forEach(u => { if (u !== myUsername) set.add(u); }));
        myFriendsSet = set;
    });
}

function isVisibleToMe(slide) {
    if (!myUsername) return false;
    if (slide.userId === myUsername) return true;
    if (!myFriendsSet.has(slide.userId)) return false;
    const vis = slide.visibility || 'friends';
    if (vis === 'friends') return true;
    if (vis === 'closeFriends') return (slide.closeFriendsList || []).includes(myUsername);
    if (vis === 'except') return !(slide.exceptList || []).includes(myUsername);
    return true;
}

/* ===================== LOAD STORY FEED ===================== */

function loadStoryFeed() {
    const cutoff = Date.now() - STATUS_LIFETIME_MS;
    db.collection('statusData').where('timestamp', '>', cutoff).get().then((snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(isVisibleToMe);
        const groups = {};
        docs.forEach(slide => {
            if (!groups[slide.userId]) {
                groups[slide.userId] = {
                    userId: slide.userId, username: slide.username,
                    avatar: slide.profileImg || 'https://placehold.co/40x40/222/fff',
                    isMe: myUsername && slide.userId === myUsername,
                    isBoosted: !!slide.isBoosted, slides: []
                };
            }
            groups[slide.userId].slides.push(slide);
        });
        Object.values(groups).forEach(g => g.slides.sort((a, b) => a.timestamp - b.timestamp));

        const me = Object.values(groups).find(g => g.isMe);
        const others = Object.values(groups).filter(g => !g.isMe);
        others.sort((a, b) => {
            if (!!a.isBoosted !== !!b.isBoosted) return a.isBoosted ? -1 : 1;
            return b.slides[0].timestamp - a.slides[0].timestamp; // latest-first, kamar reel
        });
        storyFeed = me ? [me, ...others] : others;

        if (!storyFeed.length) { showLoadError('No status updates to show right now.'); return; }

        const params = new URLSearchParams(window.location.search);
        const targetUser = params.get('user');
        const requestedIdx = parseInt(params.get('idx'), 10);
        const targetIndex = storyFeed.findIndex(g => g.userId === targetUser || (targetUser === 'my-status' && g.isMe));

        if (targetUser && targetIndex < 0) {
            showLoadError(`Could not find that status. It may have expired or been deleted.`);
            return;
        }

        currentActiveUser = targetIndex >= 0 ? targetIndex : 0;
        const activeSlideCount = storyFeed[currentActiveUser].slides.length;
        currentMediaIndex = (!isNaN(requestedIdx) && requestedIdx >= 0 && requestedIdx < activeSlideCount) ? requestedIdx : 0;

        loadMatrixNode();
    }).catch(err => {
        console.error('Load feed error:', err);
        showLoadError('Something went wrong loading this status: ' + err.message);
    });
}

// Maimakon shiru muka bar page din blank, muna nuna sako a fili tare
// da maballin "Go back" — wannan yana taimaka mana mu gano ainihin
// matsala nan take idan ta sake faruwa, maimakon zato kawai.
function showLoadError(msg) {
    document.getElementById('hudUsername').innerText = 'Unable to load';
    document.getElementById('hudTimeLabel').innerText = '';
    const canvas = document.getElementById('viewportCanvas');
    canvas.querySelectorAll('.dynamic-slide-content').forEach(el => el.remove());
    const img = document.getElementById('matrixMedia');
    if (img) img.style.display = 'none';
    const div = document.createElement('div');
    div.className = 'capsule-lock-view dynamic-slide-content';
    div.innerHTML = `<div class="lock-icon">⚠️</div><div>${msg}</div>
        <div style="margin-top:14px;padding:10px 20px;background:rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;" onclick="disconnectMatrix()">Go back</div>`;
    canvas.appendChild(div);
}

/* ===================== RENDER CURRENT SLIDE ===================== */

function loadMatrixNode() {
    clearInterval(hudTimerClock);
    const profile = storyFeed[currentActiveUser];
    if (!profile) { disconnectMatrix(); return; }
    const slide = profile.slides[currentMediaIndex];

    document.getElementById('hudUsername').innerText = profile.username + (slide.isVerified ? ' ✓' : '');
    document.getElementById('hudTimeLabel').innerText = timeAgo(slide.timestamp);
    document.getElementById('hudAvatar').src = profile.avatar;
    document.getElementById('ownerDeleteBtn').style.display = profile.isMe ? 'flex' : 'none';

    const timeline = document.getElementById('hudTimeline');
    timeline.innerHTML = '';
    profile.slides.forEach((_, idx) => {
        const bar = document.createElement('div'); bar.className = 'hud-bar';
        const fill = document.createElement('div'); fill.className = 'hud-fill';
        if (idx < currentMediaIndex) fill.style.width = '100%';
        bar.appendChild(fill); timeline.appendChild(bar);
    });

    renderSlideContent(slide, profile);
    updateViewersStrip(profile);

    if (isCapsuleLocked(slide)) {
        matrixStepDuration = 3500; // ba a bincika lokaci sosai a kan wanda aka kulle
    } else {
        recordView(slide, profile);
        matrixStepDuration = mediaTypeTimers[slide.type] || 6000;
    }

    beginTimelineSweep();
}

function isCapsuleLocked(slide) { return !!slide.unlockAt && slide.unlockAt > Date.now(); }

function renderSlideContent(slide, profile) {
    const canvas = document.getElementById('viewportCanvas');
    canvas.querySelectorAll('.dynamic-slide-content').forEach(el => el.remove());
    const img = document.getElementById('matrixMedia');
    const video = document.getElementById('matrixVideo');
    img.style.display = 'none';
    if (video) video.style.display = 'none';

    if (isCapsuleLocked(slide)) {
        document.getElementById('ambientProjector').style.backgroundImage = 'none';
        const div = document.createElement('div');
        div.className = 'capsule-lock-view dynamic-slide-content';
        div.innerHTML = `<div class="lock-icon">⏳</div><div>Time-Capsule Status</div>
            <div class="lock-countdown" id="capsuleCountdown"></div>
            <div style="font-size:12px;color:var(--text-dim)">This will unlock automatically</div>`;
        canvas.appendChild(div);
        startCapsuleCountdown(slide.unlockAt);
        return;
    }

    document.getElementById('ambientProjector').style.backgroundImage =
        slide.previewImg ? `url('${slide.previewImg}')` : 'none';

    if (slide.type === 'text') {
        const div = document.createElement('div');
        div.className = 'text-status-card dynamic-slide-content';
        div.style.background = slide.bgGradient || 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)';
        div.textContent = slide.textContent || slide.caption || '';
        canvas.appendChild(div);
    } else if (slide.type === 'music') {
        const div = document.createElement('div');
        div.className = 'music-status-card dynamic-slide-content';
        div.innerHTML = `
            <img class="music-art" src="${slide.previewImg || 'https://placehold.co/180x180/111/fff?text=🎵'}">
            <div class="music-waveform">${Array.from({length:14}).map((_,i)=>`<span style="animation-delay:${i*0.07}s"></span>`).join('')}</div>
            <div style="font-size:14px;font-weight:600">${slide.caption || 'Now Playing'}</div>
            <audio id="matrixAudio" src="${slide.audioUrl || ''}" autoplay loop></audio>`;
        canvas.appendChild(div);
    } else if (slide.type === 'poll') {
        const div = document.createElement('div');
        div.className = 'poll-status-card dynamic-slide-content';
        const opts = slide.pollOptions || ['Yes', 'No'];
        const votes = slide.pollVotes || {};
        const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
        div.innerHTML = `<h3 style="margin-bottom:8px">${slide.caption || 'Poll'}</h3>` + opts.map((o, i) => {
            const pct = Math.round(((votes[i] || 0) / total) * 100);
            return `<div class="poll-option" onclick="voteOnPoll('${slide.id}', ${i})"><div class="poll-fill" style="width:${pct}%"></div><span>${o} — ${pct}%</span></div>`;
        }).join('');
        canvas.appendChild(div);
    } else if (slide.type === 'video') {
        if (!video) {
            const v = document.createElement('video');
            v.id = 'matrixVideo'; v.className = 'matrix-media-frame';
            v.autoplay = true; v.playsInline = true; v.muted = false;
            canvas.insertBefore(v, canvas.firstChild);
        }
        const vEl = document.getElementById('matrixVideo');
        vEl.src = slide.previewImg; vEl.style.display = 'block';
        vEl.onloadedmetadata = () => { matrixStepDuration = (vEl.duration * 1000) || 6000; };
        vEl.play().catch(() => {});
    } else {
        img.src = slide.previewImg; img.style.display = 'block';
    }
}

function startCapsuleCountdown(unlockAt) {
    const el = document.getElementById('capsuleCountdown');
    if (!el) return;
    const tick = () => {
        const diff = unlockAt - Date.now();
        if (diff <= 0) { el.textContent = 'Unlocking...'; loadMatrixNode(); return; }
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
        el.textContent = `${h}h ${m}m`;
    };
    tick();
}

/* ===================== TIMELINE SWEEP / NAVIGATION ===================== */

function beginTimelineSweep() {
    trackingProgress = 0;
    const fills = document.querySelectorAll('.hud-fill');
    const targetFill = fills[currentMediaIndex];
    hudTimerClock = setInterval(() => {
        trackingProgress += (100 / (matrixStepDuration / 40));
        if (targetFill) targetFill.style.width = `${trackingProgress}%`;
        if (trackingProgress >= 100) { clearInterval(hudTimerClock); triggerNavigationPipeline(1); }
    }, 40);
}

function triggerNavigationPipeline(direction) {
    const profile = storyFeed[currentActiveUser];
    if (direction === 1) {
        if (currentMediaIndex < profile.slides.length - 1) { currentMediaIndex++; loadMatrixNode(); }
        else if (currentActiveUser < storyFeed.length - 1) { currentActiveUser++; currentMediaIndex = 0; loadMatrixNode(); }
        else disconnectMatrix();
    } else {
        if (currentMediaIndex > 0) { currentMediaIndex--; loadMatrixNode(); }
        else if (currentActiveUser > 0) { currentActiveUser--; currentMediaIndex = storyFeed[currentActiveUser].slides.length - 1; loadMatrixNode(); }
    }
}

function disconnectMatrix() { window.location.href = 'updates.html'; }

/* ===================== VIEWER TRACKING (Ghost Mode aware) ===================== */

function recordView(slide, profile) {
    if (!myUsername || profile.isMe || isGhostModeActive) return;
    db.collection('statusData').doc(slide.id).update({
        viewerIds: firebase.firestore.FieldValue.arrayUnion(myUsername),
        viewerDetails: firebase.firestore.FieldValue.arrayUnion({
            uid: myUsername,
            name: myFullName || myUsername,
            photo: myProfileImg || '',
            viewedAt: Date.now()
        })
    }).catch(() => {});
}

function updateViewersStrip(profile) {
    const strip = document.getElementById('viewersStrip');
    if (!profile.isMe) { strip.style.display = 'none'; return; }
    const slide = profile.slides[currentMediaIndex];
    const viewers = slide.viewerDetails || [];
    strip.style.display = viewers.length ? 'flex' : 'none';
    document.getElementById('viewersStripCount').textContent = `${viewers.length} view${viewers.length === 1 ? '' : 's'}`;
    document.getElementById('viewersStripAvatars').innerHTML = viewers.slice(0, 3)
        .map(v => `<img src="${v.photo || 'https://placehold.co/22x22/222/fff?text=U'}">`).join('');
}

function openViewersSheet() {
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];
    const viewers = slide.viewerDetails || [];
    document.getElementById('vsheetTitle').textContent = `Viewed by ${viewers.length}`;
    document.getElementById('vsheetBody').innerHTML = viewers.length
        ? viewers.sort((a,b)=>b.viewedAt-a.viewedAt).map(v => `
            <div class="vsheet-row"><img src="${v.photo || 'https://placehold.co/34x34/222/fff?text=U'}">
            <span class="vs-name">${v.name}</span><span class="vs-time">${timeAgo(v.viewedAt)}</span></div>`).join('')
        : `<div class="vsheet-empty">No one has viewed this status yet 👀</div>`;
    clearInterval(hudTimerClock);
    document.getElementById('viewersSheetOverlay').classList.add('active');
}
function closeViewersSheet() {
    document.getElementById('viewersSheetOverlay').classList.remove('active');
    beginTimelineSweep();
}

/* ===================== REACTIONS (double-tap + strip) ===================== */

let lastTapTime = 0;
function onCanvasClick(e) {
    const now = Date.now();
    if (now - lastTapTime < 300) { sendReaction('❤️'); popHeart(); }
    lastTapTime = now;
}

function popHeart() {
    const heart = document.getElementById('doubleTapHeart');
    heart.classList.remove('pop'); void heart.offsetWidth; heart.classList.add('pop');
}

function toggleReactionStrip() { document.getElementById('reactionStrip').classList.toggle('show'); }

function sendReaction(emoji) {
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];
    if (!myUsername || profile.isMe) return;
    db.collection('statusData').doc(slide.id).collection('reactions').doc(myUsername).set({
        emoji, name: myFullName || myUsername, at: Date.now()
    }).then(() => showStatusToast(`${emoji} Reaction sent!`));
    document.getElementById('reactionStrip').classList.remove('show');
}

/* ===================== REPLY / TIP / SHARE / DOWNLOAD / DELETE ===================== */

function onReplyKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReplyMessage(); }
}

function sendReplyMessage() {
    const input = document.getElementById('replyInput');
    const text = input.value.trim();
    if (!text || !myUsername) return;
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];

    db.collection('personalChats').add({
        from: myUsername,
        to: profile.userId,
        text,
        statusReplyTo: slide.id,
        statusReplyPreview: slide.previewImg || '',
        timestamp: Date.now(),
        read: false
    }).then(() => { showStatusToast('Reply sent! 💬'); input.value = ''; })
      .catch(() => showStatusToast('Something went wrong sending your reply.'));
}

function triggerSynergyTip() {
    const profile = storyFeed[currentActiveUser];
    const amount = prompt('How much SYNERGY would you like to tip? (e.g. 0.5)', '0.5');
    if (!amount || isNaN(amount)) return;
    db.collection('tips').add({
        from: myUsername, to: profile.userId,
        amount: parseFloat(amount), timestamp: Date.now(), status: 'pending'
    }).then(() => showStatusToast(`⚡ ${amount} SYNERGY sent to ${profile.username}.`));
}

function shareToMyStatus() {
    clearInterval(hudTimerClock);
    mainContainer.classList.add('paused');
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];
    const caption = prompt('Write a caption:');
    if (caption !== null && myUsername) {
        db.collection('statusData').add({
            userId: myUsername, username: myFullName || myUsername,
            profileImg: myProfileImg || '', previewImg: slide.previewImg,
            type: slide.type || 'image', caption, timestamp: Date.now(),
            visibility: 'friends', sharedFromId: slide.id, viewerIds: []
        }).then(() => showStatusToast('🚀 Reshared to My Status!'));
    }
    beginTimelineSweep();
    mainContainer.classList.remove('paused');
}

function executeMediaDownload() {
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];
    if (!slide.previewImg) { showStatusToast('No media to download.'); return; }
    fetch(slide.previewImg).then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `nexus-status-${slide.id}`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showStatusToast('📥 Status downloaded!');
    }).catch(() => window.open(slide.previewImg, '_blank'));
}

function deleteCurrentSlide() {
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];
    if (!profile.isMe) return;
    if (!confirm('Are you sure you want to delete this status?')) return;
    db.collection('statusData').doc(slide.id).delete().then(() => {
        showStatusToast('Status deleted.');
        profile.slides.splice(currentMediaIndex, 1);
        if (!profile.slides.length) { storyFeed.splice(currentActiveUser, 1); }
        if (currentMediaIndex >= profile.slides.length) currentMediaIndex = Math.max(0, profile.slides.length - 1);
        if (!storyFeed.length) { disconnectMatrix(); return; }
        loadMatrixNode();
    });
}

/* ===================== GHOST MODE (view anonymously — real) ===================== */

function toggleGhostInfiltration() {
    isGhostModeActive = !isGhostModeActive;
    const node = document.getElementById('ghostNode');
    node.classList.toggle('ghost-active', isGhostModeActive);
    showStatusToast(isGhostModeActive
        ? '👁️ Ghost Mode: viewing without appearing in the Viewers list.'
        : 'Ghost Mode: off.');
}

/* ===================== NOVEL FEATURE 2: AI STORY ENHANCER ===================== */
// TODO ga Samuel: haɗa wannan da Node/Groq backend dinka (Render) domin
// ainihin AI enhancement (auto-caption, cinematic grading). A yanzu
// mun sanya wani client-side visual boost na gaggawa domin ya zama
// functional yayin da ake shirya backend endpoint din.
function enhanceWithAI() {
    const img = document.getElementById('matrixMedia');
    if (img.style.display === 'none') { showStatusToast('AI Enhancer currently works on photos only.'); return; }
    showStatusToast('✨ Enhancing photo with AI...');
    img.style.transition = 'filter 0.6s';
    img.style.filter = 'contrast(1.15) saturate(1.3) brightness(1.05)';
    // fetch('https://<render-backend>/ai/enhance', { method:'POST', body: JSON.stringify({url: img.src}) })
}

/* ===================== NOVEL FEATURE 3: STORY DUET (video reply) ===================== */

let duetRecorder, duetChunks = [];
function startDuetRecording() {
    if (!navigator.mediaDevices) { showStatusToast("This device doesn't support recording."); return; }
    clearInterval(hudTimerClock);
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        duetChunks = [];
        duetRecorder = new MediaRecorder(stream);
        duetRecorder.ondataavailable = e => duetChunks.push(e.data);
        duetRecorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            uploadDuetClip(new Blob(duetChunks, { type: 'video/webm' }));
        };
        duetRecorder.start();
        showStatusToast('🎬 Recording your Duet... tap the button again to stop.');
        document.getElementById('duetBtn').onclick = () => duetRecorder.stop();
    }).catch(() => showStatusToast('Could not get camera/microphone permission.'));
}

function uploadDuetClip(blob) {
    if (!myUsername) return;
    const profile = storyFeed[currentActiveUser];
    const originalSlide = profile.slides[currentMediaIndex];
    showStatusToast('Uploading your Duet...');

    const formData = new FormData();
    formData.append('file', blob, `duet_${myUsername}_${Date.now()}.webm`);
    formData.append('type', 'duet');
    formData.append('username', myUsername);

    fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Upload failed');
            return db.collection('statusData').add({
                userId: myUsername, username: myFullName || myUsername,
                profileImg: myProfileImg || '', previewImg: data.url, type: 'video',
                timestamp: Date.now(), visibility: 'friends', duetOfId: originalSlide.id, viewerIds: []
            });
        })
        .then(() => { showStatusToast('🎬 Your Duet has been posted!'); document.getElementById('duetBtn').onclick = startDuetRecording; })
        .catch((error) => {
            console.error('Duet upload error:', error);
            showStatusToast('Something went wrong while uploading your Duet.');
            document.getElementById('duetBtn').onclick = startDuetRecording;
        });
}

/* ===================== NOVEL FEATURE 4: STORY ROOMS (collaborative) ===================== */
// Ana kira wannan daga updates.html ko wani UI na "Create Room" (za a
// haɗa button a can). Anan mun sanya function din join+contribute domin
// idan an bude status.html tare da ?room=ID, za a nuna slides din room.
function joinCollabRoom(roomId, mediaUrl, mediaType) {
    if (!myUsername) return;
    db.collection('statusData').doc(roomId).set({
        isRoom: true,
        roomSlides: firebase.firestore.FieldValue.arrayUnion({
            userId: myUsername, username: myFullName || myUsername,
            url: mediaUrl, type: mediaType || 'image', at: Date.now()
        }),
        contributorIds: firebase.firestore.FieldValue.arrayUnion(myUsername)
    }, { merge: true }).then(() => showStatusToast('Your contribution was added to the Room! 🎉'));
}

/* ===================== POLL VOTE ===================== */

function voteOnPoll(slideId, optionIndex) {
    if (!myUsername) return;
    db.collection('statusData').doc(slideId).set({
        pollVotes: { [optionIndex]: firebase.firestore.FieldValue.increment(1) },
        pollVoters: { [myUsername]: optionIndex }
    }, { merge: true }).then(() => showStatusToast('Your vote has been recorded! 🗳️'));
}

/* ===================== TOUCH / PAUSE HANDLING ===================== */

function onTouchLeftClick() { triggerNavigationPipeline(-1); }
function onTouchRightClick() { triggerNavigationPipeline(1); }
function onWindowTouchStart(e) {
    if (['grid-left', 'grid-right'].includes(e.target.className)) {
        clearInterval(hudTimerClock);
        mainContainer.classList.add('paused', 'hud-hidden');
    }
}
function onWindowTouchEnd(e) {
    if (['grid-left', 'grid-right'].includes(e.target.className)) {
        beginTimelineSweep();
        mainContainer.classList.remove('paused', 'hud-hidden');
    }
}

function attachStatusDomListeners() {
    const canvas = document.getElementById('viewportCanvas');
    if (canvas) canvas.addEventListener('click', onCanvasClick);
    const input = document.getElementById('replyInput');
    if (input) input.addEventListener('keydown', onReplyKeydown);
    const touchLeft = document.getElementById('touchLeft');
    if (touchLeft) touchLeft.addEventListener('click', onTouchLeftClick);
    const touchRight = document.getElementById('touchRight');
    if (touchRight) touchRight.addEventListener('click', onTouchRightClick);
    window.addEventListener('touchstart', onWindowTouchStart);
    window.addEventListener('touchend', onWindowTouchEnd);
}

function detachStatusDomListeners() {
    window.removeEventListener('touchstart', onWindowTouchStart);
    window.removeEventListener('touchend', onWindowTouchEnd);
}

/* ===================== HELPERS ===================== */

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function showStatusToast(msg) {
    const t = document.getElementById('nxToastStatus');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}


/* ============================================================
   SPA WIRING — hukuncin router.js (kamar chats.html/channels.html).
   ============================================================ */
async function enterStoryMatrix() {
    mainContainer = document.getElementById('matrixContainer');
    if (friendGraphUnsub) friendGraphUnsub();
    friendGraphUnsub = subscribeToFriendGraph();
    loadStoryFeed();
    attachStatusDomListeners();
}

async function init() {
    await authReadyPromise;
    if (!myUsername) return; // an riga an fara redirect zuwa login
    enterStoryMatrix();
}

function destroy() {
    clearInterval(hudTimerClock);
    if (friendGraphUnsub) { friendGraphUnsub(); friendGraphUnsub = null; }
    detachStatusDomListeners();
}

onFirebaseReady();

if (window.NexusRouter) {
    window.NexusRouter.registerPage('status.html', { init: init, destroy: destroy });
}
// Native/direct page load: router.js's bootstrap already ran BEFORE this
// script existed, so it never called init() for us. document.readyState
// is still "loading" only during that first synchronous parse — for any
// later SPA navigation (which runs long after the document finished
// loading) it's "complete", and router.js calls init() itself in that case.
if (document.readyState === 'loading') {
    init();
}
