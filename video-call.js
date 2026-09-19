// ═══════════════════════════════════════════════════
//  NEXUS WebRTC Video Call Engine v1
//  FaceTime Style — World Class UI
// ═══════════════════════════════════════════════════

const NexusVideo = (() => {

    let pc = null;
    let localStream = null;
    let callDocRef = null;
    let callUnsub = null;
    let callTimerInterval = null;
    let callSeconds = 0;
    let isMuted = false;
    let isCameraOff = false;
    let isFrontCamera = true;
    let callRole = null;
    let controlsTimeout = null;
    let controlsVisible = true;
    let topbarStatusTimeout = null;
    let effectsLoaded = false;
    let bgLoaded = false;
    let activeBgId = 'none';
    let activeFilterId = 'none';
    let fxPanelOpen = false;
    let activeFxTab = 'filters';
    let lastCalleeId = null;
    let lastCallName = '';
    let lastCallAvatar = '';

    const iceConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' },
        ]
    };

    const getDB = () => firebase.firestore();
    const getMyId = () => localStorage.getItem('nexus_user_session');

    // ─── Media ────────────────────────────────────
    async function getMedia(facingMode = 'user') {
        return navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: { ideal: true },
                noiseSuppression: { ideal: true },
                autoGainControl: { ideal: true },
            },
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 },
            }
        });
    }

    // ─── Setup remote video ───────────────────────
    function setupRemoteVideo(stream) {
        const video = document.getElementById('nexus-remote-video');
        if (video) {
            video.srcObject = stream;
            video.play().catch(() => {});
        }
    }

    // ─── Setup local video (PiP) ──────────────────
    function setupLocalVideo(stream) {
        const video = document.getElementById('nexus-local-video');
        if (video) {
            video.srcObject = stream;
            video.play().catch(() => {});
        }
    }

    // ─── Trickle ICE ─────────────────────────────
    function listenCandidates(sub) {
        callDocRef.collection(sub).onSnapshot(snap => {
            snap.docChanges().forEach(async change => {
                if (change.type === 'added' && pc) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                    } catch(e) {}
                }
            });
        });
    }

    // ══════════════════════════════════════════════
    //  CALLER — Start Video Call
    // ══════════════════════════════════════════════
    async function startVideoCall(calleeId) {
        const myId = getMyId();
        if (!myId) return;

        callRole = 'caller';
        const callId = [myId, calleeId].sort().join('__') + '_videocall';
        callDocRef = getDB().collection('nexusVideoCalls').doc(callId);

        const name = document.getElementById('chat-header-name')?.textContent || calleeId;
        const avatar = document.getElementById('chat-header-avatar')?.src || '';
        lastCalleeId = calleeId; lastCallName = name; lastCallAvatar = avatar;

        showVideoCallUI({ name, avatar, isCaller: true });
        callDocRef.update({ status: 'ended' }).catch(() => {}); // ba mu JIRA wannan ba — yana gudana a baya, ba ya toshe camera

        try {
            localStream = await getMedia('user');
            setupLocalVideo(localStream);
            pc = new RTCPeerConnection(iceConfig);
            localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

            pc.ontrack = e => setupRemoteVideo(e.streams[0]);

            pc.onicecandidate = e => {
                if (e.candidate) callDocRef.collection('callerCandidates').add(e.candidate.toJSON());
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') {
                    updateVideoStatus('Connected', true);
                    startCallTimer();
                    hideCallingUI();
                } else if (['failed','disconnected'].includes(pc.connectionState)) {
                    endVideoCleanup('Call Ended');
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await callDocRef.set({
                callerId: myId,
                calleeId,
                offer: { type: offer.type, sdp: offer.sdp },
                status: 'ringing',
                createdAt: Date.now()
            });

            callUnsub = callDocRef.onSnapshot(async snap => {
                const data = snap.data();
                if (!data) return;
                if (data.answer && !pc.currentRemoteDescription) {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                        listenCandidates('calleeCandidates');
                    } catch(e) {}
                }
                if (data.status === 'declined') endVideoCleanup('Declined');
                if (data.status === 'ended') endVideoCleanup();
            });

           setTimeout(() => {
                if (callRole !== 'caller' || !callDocRef) return;
                callDocRef.get().then(s => {
                    if (s.exists && s.data()?.status === 'ringing') {
                        callDocRef.update({ status: 'missed' });
                        endVideoCleanup();
                        showUnavailableScreen();
                    }
                });
            }, 45000); 

        } catch(err) {
            console.error(err);
            endVideoCleanup(err.name === 'NotAllowedError' ? 'Camera/Mic Denied' : 'Call Failed');
        }
    }

    // ══════════════════════════════════════════════
    //  CALLEE — Answer Video Call
    // ══════════════════════════════════════════════
    async function answerVideoCall(docId, callerName, callerAvatar) {
        callRole = 'callee';
        callDocRef = getDB().collection('nexusVideoCalls').doc(docId);

        hideIncomingVideoUI();
        showVideoCallUI({ name: callerName, avatar: callerAvatar, isCaller: false });

        try {
            localStream = await getMedia('user');
            setupLocalVideo(localStream);

            pc = new RTCPeerConnection(iceConfig);
            localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

            pc.ontrack = e => setupRemoteVideo(e.streams[0]);

            pc.onicecandidate = e => {
                if (e.candidate) callDocRef.collection('calleeCandidates').add(e.candidate.toJSON());
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') {
                    updateVideoStatus('Connected', true);
                    startCallTimer();
                } else if (['failed','disconnected'].includes(pc.connectionState)) {
                    endVideoCleanup('Call Ended');
                }
            };

            const callData = (await callDocRef.get()).data();
            if (!callData) { endVideoCleanup('Not Found'); return; }

            await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
            listenCandidates('callerCandidates');

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await callDocRef.update({
                answer: { type: answer.type, sdp: answer.sdp },
                status: 'answered'
            });

            callUnsub = callDocRef.onSnapshot(snap => {
                if (snap.data()?.status === 'ended') endVideoCleanup();
            });

        } catch(err) {
            console.error(err);
            endVideoCleanup('Answer Failed');
        }
    }

    // ══════════════════════════════════════════════
    //  LISTEN FOR INCOMING VIDEO CALLS
    // ══════════════════════════════════════════════
    function listenForIncomingVideoCalls() {
        const myId = getMyId();
        if (!myId) return;

        getDB().collection('nexusVideoCalls')
            .where('calleeId', '==', myId)
            .where('status', '==', 'ringing')
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        if (Date.now() - data.createdAt < 60000) {
                            showIncomingVideoUI({ callerId: data.callerId, docId: change.doc.id });
                        }
                    }
                });
            });
    }

    function declineVideoCall(docId) {
        getDB().collection('nexusVideoCalls').doc(docId).update({ status: 'declined' }).catch(() => {});
        hideIncomingVideoUI();
    }

    function hangUpVideo() {
        if (callDocRef) callDocRef.update({ status: 'ended' }).catch(() => {});
        endVideoCleanup();
    }

    function endVideoCleanup(msg) {
        if (callUnsub) { callUnsub(); callUnsub = null; }
        if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
        if (pc) { pc.close(); pc = null; }
        stopCallTimer();
        if (controlsTimeout) clearTimeout(controlsTimeout);
        if (typeof NexusVideoEffects !== 'undefined') NexusVideoEffects.stopProcessing();
        activeFilterId = 'none';
        const filterTrack = document.getElementById('nexus-filter-track');
        if (filterTrack) filterTrack.dataset.built = '';
       if (typeof NexusVideoBackground !== 'undefined') NexusVideoBackground.stopProcessing();
        activeBgId = 'none';
        const bgTrack = document.getElementById('nexus-bg-track');
        if (bgTrack) bgTrack.dataset.built = '';
        if (typeof NexusVideoAR !== 'undefined') NexusVideoAR.stopProcessing();
        activeArId = 'none';
        const arTrack = document.getElementById('nexus-ar-track');
        if (arTrack) arTrack.dataset.built = ''; 
        fxPanelOpen = false; activeFxTab = 'filters';
        callDocRef = null; callRole = null;
        isMuted = false; isCameraOff = false; isFrontCamera = true;
        if (msg) {
            updateVideoStatus(msg);
            setTimeout(() => hideVideoCallUI(), 2000);
        } else {
            hideVideoCallUI();
        }
    }

    // ══════════════════════════════════════════════
    //  UI — Calling Screen (before answer)
    // ══════════════════════════════════════════════
    function showCallingUI({ name, avatar }) {
        if (document.getElementById('nexus-calling-overlay')) return;
        injectVideoCSS();
        const el = document.createElement('div');
        el.id = 'nexus-calling-overlay';
        el.innerHTML = `
            <div style="
                position:fixed;inset:0;z-index:99997;
                background:rgba(0,0,0,0.7);
                backdrop-filter:blur(10px);
                display:flex;flex-direction:column;
                align-items:center;justify-content:center;gap:16px;
                animation:fadeInUp 0.3s ease;
            ">
                <div style="width:90px;height:90px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,0.3);">
                    <img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">
                </div>
                <div style="font-size:22px;font-weight:700;color:#fff;">${name}</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:2px;">
                    Video Calling<span id="nexus-calling-dots">...</span>
                </div>
            </div>
        `;
        document.body.appendChild(el);

        // Animated dots
        let dots = 0;
        const dotsInterval = setInterval(() => {
            dots = (dots + 1) % 4;
            const el = document.getElementById('nexus-calling-dots');
            if (el) el.textContent = '.'.repeat(dots);
            else clearInterval(dotsInterval);
        }, 500);
    }

    function hideCallingUI() {
        const el = document.getElementById('nexus-calling-overlay');
        if (el) el.remove();
    }

    // ══════════════════════════════════════════════
    //  UI — Incoming Video Call
    // ══════════════════════════════════════════════
    function showIncomingVideoUI({ callerId, docId }) {
        if (document.getElementById('nexus-incoming-video')) return;

        getDB().collection('users').doc(callerId).get().then(doc => {
            const name = doc.exists ? (doc.data().fullName || doc.data().username || callerId) : callerId;
            const avatar = doc.exists && doc.data().userProfilePic
                ? doc.data().userProfilePic
                : `https://api.dicebear.com/7.x/bottts/svg?seed=${callerId}`;

            injectVideoCSS();
            const el = document.createElement('div');
            el.id = 'nexus-incoming-video';
            el.innerHTML = `
                <div style="
                    position:fixed;inset:0;z-index:99999;
                    background:linear-gradient(180deg,#0d1f3c 0%,#050505 100%);
                    display:flex;flex-direction:column;
                    align-items:center;justify-content:space-between;
                    padding:80px 30px 70px;
                    animation:fadeInUp 0.3s ease;
                ">
                    <!-- Top info -->
                    <div style="text-align:center;">
                        <div style="font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">Incoming Video Call</div>
                        <div style="position:relative;width:130px;height:130px;margin:0 auto 20px;">
                            <div style="position:absolute;inset:-16px;border-radius:50%;border:2px solid rgba(255,255,255,0.1);animation:voice-pulse 2s ease-in-out infinite;"></div>
                            <div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid rgba(255,255,255,0.2);animation:voice-pulse 2s ease-in-out infinite 0.5s;"></div>
                            <div style="width:130px;height:130px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,0.4);box-shadow:0 0 40px rgba(255,255,255,0.1);">
                                <img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">
                            </div>
                        </div>
                        <div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;">${name}</div>
                        <div style="
                            display:inline-flex;align-items:center;gap:6px;
                            background:rgba(255,255,255,0.1);
                            border-radius:20px;padding:6px 14px;margin-top:10px;
                        ">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.362a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/></svg>
                            <span style="font-size:12px;color:rgba(255,255,255,0.8);">Video</span>
                        </div>
                    </div>

                    <!-- Buttons -->
                    <div style="display:flex;gap:60px;align-items:center;">
                        <!-- Decline -->
                        <div style="text-align:center;">
                            <div onclick="NexusVideo.declineVideoCall('${docId}')" style="
                                width:72px;height:72px;border-radius:50%;
                                background:#ff3b30;
                                display:flex;align-items:center;justify-content:center;
                                cursor:pointer;margin:0 auto 10px;
                                box-shadow:0 8px 25px rgba(255,59,48,0.5);
                                transition:transform 0.15s;
                            " onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                                </svg>
                            </div>
                            <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:500;">Decline</div>
                        </div>

                        <!-- Accept -->
                        <div style="text-align:center;">
                            <div onclick="NexusVideo.answerVideoCall('${docId}','${name}','${avatar}')" style="
                                width:72px;height:72px;border-radius:50%;
                                background:#34c759;
                                display:flex;align-items:center;justify-content:center;
                                cursor:pointer;margin:0 auto 10px;
                                box-shadow:0 8px 25px rgba(52,199,89,0.5);
                                transition:transform 0.15s;
                                animation:bounce-accept 1.2s ease-in-out infinite;
                            " onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.362a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                                </svg>
                            </div>
                            <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:500;">Accept</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(el);
            playVideoRingtone();

            getDB().collection('nexusVideoCalls').doc(docId).onSnapshot(snap => {
                const d = snap.data();
                if (d && ['missed','ended','declined'].includes(d.status)) hideIncomingVideoUI();
            });
        });
    }

    function hideIncomingVideoUI() {
        const el = document.getElementById('nexus-incoming-video');
        if (el) el.remove();
        stopVideoRingtone();
    }

    // ══════════════════════════════════════════════
    //  UI — Active Video Call (FaceTime Style)
    // ══════════════════════════════════════════════
    function showVideoCallUI({ name, avatar, isCaller }) {
        if (document.getElementById('nexus-video-call')) return;
        injectVideoCSS();

        const el = document.createElement('div');
        el.id = 'nexus-video-call';
        el.innerHTML = `
            <div style="
                position:fixed;inset:0;z-index:99998;
                background:#000;
                overflow:hidden;
            " onclick="NexusVideo.toggleControls()">

                <!-- Remote Video (Full Screen) -->
                <video id="nexus-remote-video"
                    autoplay playsinline
                    style="
                        position:absolute;inset:0;
                        width:100%;height:100%;
                        object-fit:cover;
                        background:#111;
                    ">
                </video>

                
<!-- Connecting overlay -->
               <div id="nexus-video-connecting" style="
                    position:absolute;inset:0;
                    display:none;
                    flex-direction:column;
                    align-items:center;justify-content:center;
                    z-index:2;
                "> 
                    <div id="nexus-video-status" style="font-family:'Roboto','Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#fff;background:rgba(0,0,0,0.6);padding:10px 20px;border-radius:20px;">
                    </div>
                </div>
                
                <!-- Local Video: FULL SCREEN yayin Calling/Connecting, sai ya koma karamin PiP (dama) bayan an hada call -->
                <div id="nexus-pip-container" style="
                    position:absolute;
                    inset:0;
                    width:100%;height:100%;
                    border-radius:0;
                    overflow:hidden;
                    border:none;
                    box-shadow:none;
                    z-index:1;
                    cursor:move;
                    transition:all 0.4s ease;
                ">
                    <video id="nexus-local-video"
                        autoplay playsinline muted
                        style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1);">
                    </video>
                    <!-- Camera off overlay -->
                    <div id="nexus-cam-off-overlay" style="
                        display:none;
                        position:absolute;inset:0;
                        background:#1a1a1a;
                        align-items:center;justify-content:center;
                    ">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5">
                            <line x1="1" y1="1" x2="23" y2="23"/>
                            <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.362a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8m5 5v3a2 2 0 0 1-2 2H5"/>
                        </svg>
                    </div>
                </div>

                <!-- Top Bar -->
                <div id="nexus-video-topbar" style="
                    position:absolute;top:0;left:0;right:0;
                    min-height:110px;
                    background:linear-gradient(180deg,rgba(0,0,0,0.7) 0%,transparent 100%);
                    z-index:10;
                    transition:opacity 0.3s;
                ">
                    <div style="position:absolute;left:0;right:0;top:50px;text-align:center;pointer-events:none;">
                        <div style="font-family:'Roboto','Segoe UI',Helvetica,Arial,sans-serif;font-size:21px;font-weight:600;color:#fff;letter-spacing:0.1px;">${name}</div>
                        <div id="nexus-video-topbar-status" style="font-family:'Roboto','Segoe UI',Helvetica,Arial,sans-serif;font-size:13.5px;color:rgba(255,255,255,0.82);margin-top:4px;display:flex;align-items:center;justify-content:center;gap:5px;">
                            <svg id="nexus-video-topbar-lock" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.82)"><path d="M12 1a5 5 0 0 0-5 5v3H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 0 1 6 0v3z"/></svg>
                            <span id="nexus-video-topbar-status-text">End-to-end encrypted</span>
                        </div>
                        <div id="nexus-video-timer" style="font-family:'Roboto','Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.75);margin-top:2px;display:none;">00:00</div>
                    </div>
                    <div style="position:absolute;top:50px;right:20px;display:flex;flex-direction:column;align-items:center;gap:12px;"> 
                            <div id="nexus-vid-fx-btn" onclick="event.stopPropagation();NexusVideo.toggleFxPanel()" style="
                            width:38px;height:38px;border-radius:50%;
                            background:rgba(255,255,255,0.15);
                            backdrop-filter:blur(10px);
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;
                            border:1px solid rgba(255,255,255,0.2);
                        ">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
                                <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z"/>
                                <path d="M19 13l.9 2.7L22.5 17l-2.6.8L19 20.5l-.9-2.7L15.5 17l2.6-.8L19 13z"/>
                            </svg>
                        </div>
                        <div style="
                            background:rgba(255,255,255,0.15);
                            backdrop-filter:blur(10px);
                            border-radius:20px;
                            padding:6px 12px;
                            font-size:12px;color:#fff;
                            display:flex;align-items:center;gap:5px;
                        ">
                            <div style="width:6px;height:6px;border-radius:50%;background:#34c759;animation:blink 1.5s infinite;"></div>
                            Live
                        </div>
                    </div>
                </div>

                <!-- Bottom Controls -->
                <div id="nexus-video-controls" style="
                    position:absolute;bottom:0;left:0;right:0;
                    padding:20px 20px 50px;
                    background:linear-gradient(0deg,rgba(0,0,0,0.8) 0%,transparent 100%);
                    display:flex;align-items:center;justify-content:space-around;
                    z-index:10;
                    transition:opacity 0.3s;
                ">
                    

                    <!-- Mute -->
                    <div style="text-align:center;">
                        <div id="nexus-vid-mute-btn" onclick="event.stopPropagation();NexusVideo.toggleVideoMute()" style="
                            width:52px;height:52px;border-radius:50%;
                            background:rgba(255,255,255,0.2);
                            backdrop-filter:blur(10px);
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                            border:1px solid rgba(255,255,255,0.2);
                            transition:background 0.2s;
                        ">
                            <svg class="vid-mute-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                <line x1="12" y1="19" x2="12" y2="23"/>
                                <line x1="8" y1="23" x2="16" y2="23"/>
                            </svg>
                        </div>
                        <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:500;">Mute</div>
                    </div>

                    <!-- End Call -->
                    <div style="text-align:center;">
                        <div onclick="event.stopPropagation();NexusVideo.hangUpVideo()" style="
                            width:52px;height:52px;border-radius:50%;
                            background:#ff3b30;
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                            box-shadow:0 8px 30px rgba(255,59,48,0.6);
                            transition:transform 0.15s;
                        " onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                                <line x1="1" y1="1" x2="23" y2="23"/>
                                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.03 18.81a16.18 16.18 0 0 0 7.94 0"/>
                            </svg>
                        </div>
                        <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:500;">End</div>
                    </div>

                    <!-- Camera Toggle -->
                    <div style="text-align:center;">
                        <div id="nexus-vid-cam-btn" onclick="event.stopPropagation();NexusVideo.toggleCamera()" style="
                            width:52px;height:52px;border-radius:50%;
                            background:rgba(255,255,255,0.2);
                            backdrop-filter:blur(10px);
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                            border:1px solid rgba(255,255,255,0.2);
                            transition:background 0.2s;
                        ">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.362a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                            </svg>
                        </div>
                      <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:500;">Camera</div>
                    </div>

                    <!-- Flip Camera -->
                    <div style="text-align:center;">
                        <div onclick="event.stopPropagation();NexusVideo.flipCamera()" style="
                            width:52px;height:52px;border-radius:50%;
                            background:rgba(255,255,255,0.2);
                            backdrop-filter:blur(10px);
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                            border:1px solid rgba(255,255,255,0.2);
                            transition:background 0.2s;
                        ">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 4v6h6M23 20v-6h-6"/>
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                            </svg>
                        </div>
                        <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:500;">Flip</div>
                    </div>
                </div>

                <!-- Unified FX Panel: Filters | Background (tabs, kamar WhatsApp) -->
                <div id="nexus-fx-panel" style="
                    position:absolute;bottom:0;left:0;right:0;
                    padding:14px 20px 50px;
                    background:linear-gradient(0deg,rgba(0,0,0,0.85) 0%,transparent 100%);
                    display:none;
                    flex-direction:column;
                    opacity:0;
                    transition:opacity 0.25s ease;
                    z-index:10;
                " onclick="event.stopPropagation()">
                   <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                        <div style="display:flex;gap:20px;">
                            <div id="nexus-fx-tab-filters" onclick="event.stopPropagation();NexusVideo.switchFxTab('filters')" style="color:#fff;font-size:14px;font-weight:700;cursor:pointer;padding-bottom:4px;border-bottom:2px solid #fff;">Filters</div>
                            <div id="nexus-fx-tab-bg" onclick="event.stopPropagation();NexusVideo.switchFxTab('bg')" style="color:rgba(255,255,255,0.5);font-size:14px;font-weight:700;cursor:pointer;padding-bottom:4px;border-bottom:2px solid transparent;">Background</div>
                            <div id="nexus-fx-tab-ar" onclick="event.stopPropagation();NexusVideo.switchFxTab('ar')" style="color:rgba(255,255,255,0.5);font-size:14px;font-weight:700;cursor:pointer;padding-bottom:4px;border-bottom:2px solid transparent;">Effects</div>
                        </div>
                        <div onclick="event.stopPropagation();NexusVideo.toggleFxPanel()" style="
                            color:#fff;font-size:13px;font-weight:600;
                            background:rgba(255,255,255,0.15);
                            padding:6px 16px;border-radius:16px;cursor:pointer;
                        ">Done</div>
                    </div>
                    <div id="nexus-filter-track" style="display:flex;gap:14px;overflow-x:auto;padding-bottom:4px;"></div>
                    <div id="nexus-bg-track" style="display:none;gap:14px;overflow-x:auto;padding-bottom:4px;"></div>
                    <div id="nexus-ar-track" style="display:none;gap:14px;overflow-x:auto;padding-bottom:4px;"></div>
                    <input type="file" id="nexus-bg-file-input" accept="image/*" style="display:none;" onchange="NexusVideo.handleCustomBgUpload(this)">
                </div> 
            </div>
        `; 
        document.body.appendChild(el);
        // Auto-hide controls after 4s
        scheduleHideControls();

        // Draggable PiP
        makeDraggable(document.getElementById('nexus-pip-container'));

        // Bayan 3.5s, "End-to-end encrypted" ya koma Calling/Connecting (kamar WhatsApp)
        topbarStatusTimeout = setTimeout(() => {
            const txt = document.getElementById('nexus-video-topbar-status-text');
            const lock = document.getElementById('nexus-video-topbar-lock');
            if (txt) txt.textContent = isCaller ? 'Calling...' : 'Connecting...';
            if (lock) lock.style.display = 'none';
        }, 3500);
    }
    // ── Controls auto-hide ────────────────────────
    function scheduleHideControls() {
        if (controlsTimeout) clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            const topbar = document.getElementById('nexus-video-topbar');
            const controls = document.getElementById('nexus-video-controls');
            if (topbar) topbar.style.opacity = '0';
            if (controls) controls.style.opacity = '0';
            controlsVisible = false;
        }, 4000);
    }

    function toggleControls() {
        const topbar = document.getElementById('nexus-video-topbar');
        const controls = document.getElementById('nexus-video-controls');
        if (!topbar || !controls) return;
        if (!controlsVisible) {
            topbar.style.opacity = '1';
            controls.style.opacity = '1';
            controlsVisible = true;
            scheduleHideControls();
        }
    }

    // ══════════════════════════════════════════════
    //  FILTERS / EFFECTS (lazy-loaded engine)
    // ══════════════════════════════════════════════
    let effectsLoadPromise = null;
    function loadEffectsEngine() {
        if (typeof NexusVideoEffects !== 'undefined') { effectsLoaded = true; return Promise.resolve(); }
        if (effectsLoadPromise) return effectsLoadPromise;
        effectsLoadPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'video-call-effects.js';
            s.onload = () => { effectsLoaded = true; resolve(); };
            s.onerror = () => { effectsLoadPromise = null; reject(new Error('Failed to load video-call-effects.js')); };
            document.body.appendChild(s);
        });
        return effectsLoadPromise;
    }

    async function restoreRawTrack() {
    if (!pc || !localStream) return;
    const raw = localStream.getVideoTracks()[0];
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
    if (raw && sender && sender.track !== raw) { try { await sender.replaceTrack(raw); } catch (e) {} }
    }
    
   async function toggleFxPanel() {
        const panel = document.getElementById('nexus-fx-panel');
        const controls = document.getElementById('nexus-video-controls');
        if (!panel) return;
        fxPanelOpen = !fxPanelOpen;
        if (fxPanelOpen) {
            if (controls) controls.style.display = 'none';
            panel.style.display = 'flex';
            requestAnimationFrame(() => { panel.style.opacity = '1'; });
            if (controlsTimeout) clearTimeout(controlsTimeout);
            await switchFxTab(activeFxTab, true);
        } else {
            panel.style.opacity = '0';
            setTimeout(() => { panel.style.display = 'none'; }, 250);
            if (controls) controls.style.display = 'flex';
            if (typeof NexusVideoEffects !== 'undefined') NexusVideoEffects.stopProcessing();
            if (typeof NexusVideoBackground !== 'undefined') NexusVideoBackground.stopProcessing();
            if (typeof NexusVideoAR !== 'undefined') NexusVideoAR.stopProcessing();
            if (localStream) { const lv = document.getElementById('nexus-local-video'); if (lv) lv.srcObject = localStream; }
            restoreRawTrack();
            scheduleHideControls();
        }
    }

    async function switchFxTab(tab, forceReload) {
        if (!forceReload && tab === activeFxTab) return;
        activeFxTab = tab;
        restoreRawTrack();
        const tabFilters = document.getElementById('nexus-fx-tab-filters');
        const tabBg = document.getElementById('nexus-fx-tab-bg');
        const tabAr = document.getElementById('nexus-fx-tab-ar');
        const filterTrack = document.getElementById('nexus-filter-track');
        const bgTrack = document.getElementById('nexus-bg-track');
        const arTrack = document.getElementById('nexus-ar-track');
        const localVideoEl = document.getElementById('nexus-local-video');
        const activeCss = 'color:#fff;font-size:14px;font-weight:700;cursor:pointer;padding-bottom:4px;border-bottom:2px solid #fff;';
        const inactiveCss = 'color:rgba(255,255,255,0.5);font-size:14px;font-weight:700;cursor:pointer;padding-bottom:4px;border-bottom:2px solid transparent;';

       if (tab === 'filters') {
            if (tabFilters) tabFilters.style.cssText = activeCss;
            if (tabBg) tabBg.style.cssText = inactiveCss;
            if (tabAr) tabAr.style.cssText = inactiveCss;
            if (filterTrack) filterTrack.style.display = 'flex';
            if (bgTrack) bgTrack.style.display = 'none';
            if (arTrack) arTrack.style.display = 'none';
            if (typeof NexusVideoBackground !== 'undefined') NexusVideoBackground.stopProcessing();
            if (typeof NexusVideoAR !== 'undefined') NexusVideoAR.stopProcessing();
            if (localVideoEl && localStream) localVideoEl.srcObject = localStream; // koma raw camera — Filters CSS ne kadai
            try { await loadEffectsEngine(); } catch (err) { alert('Filter engine ta kasa loda: ' + err.message); return; }
            buildFilterPanel();
            if (localVideoEl && localStream) NexusVideoEffects.startProcessing(localVideoEl);
        } else if (tab === 'bg') {
            if (tabBg) tabBg.style.cssText = activeCss;
            if (tabFilters) tabFilters.style.cssText = inactiveCss;
            if (tabAr) tabAr.style.cssText = inactiveCss;
            if (bgTrack) bgTrack.style.display = 'flex';
            if (filterTrack) filterTrack.style.display = 'none';
            if (arTrack) arTrack.style.display = 'none';
            if (typeof NexusVideoEffects !== 'undefined') NexusVideoEffects.stopProcessing();
            if (typeof NexusVideoAR !== 'undefined') NexusVideoAR.stopProcessing();
            try { await loadBgEngine(); } catch (err) { alert('Background engine ta kasa loda: ' + err.message); return; }
            buildBgPanel();
            if (localVideoEl && localStream) {
                try {
                    const bgStream = await NexusVideoBackground.startProcessing(localVideoEl, localStream);
                    if (bgStream) localVideoEl.srcObject = bgStream; // nuna processed canvas a LOCAL preview ma
                } catch (err) {
                    alert('Background ta kasa farawa: ' + err.message);
                }
            }
            
        } else {
            if (tabAr) tabAr.style.cssText = activeCss;
            if (tabFilters) tabFilters.style.cssText = inactiveCss;
            if (tabBg) tabBg.style.cssText = inactiveCss;
            if (arTrack) arTrack.style.display = 'flex';
            if (filterTrack) filterTrack.style.display = 'none';
            if (bgTrack) bgTrack.style.display = 'none';
            if (typeof NexusVideoEffects !== 'undefined') NexusVideoEffects.stopProcessing();
            if (typeof NexusVideoBackground !== 'undefined') NexusVideoBackground.stopProcessing();
            try { await loadArEngine(); } catch (err) { alert('AR engine ta kasa loda: ' + err.message); return; }
            buildArPanel();
            if (localVideoEl && localStream) {
                try {
                    const arStream = await NexusVideoAR.startProcessing(localVideoEl, localStream);
                    if (arStream) localVideoEl.srcObject = arStream; // nuna processed canvas (kunnuwan zaki, dss) a LOCAL preview ma
                } catch (err) {
                    alert('Effects ta kasa farawa: ' + err.message);
                }
            }
        }
                                                      } 

    function buildFilterPanel() {
        const track = document.getElementById('nexus-filter-track');
        if (!track || track.dataset.built) return;
        let filters, isPrem;
        try {
            filters = NexusVideoEffects.getFilters();
            isPrem = NexusVideoEffects.isPremium();
        } catch (err) {
            alert('buildFilterPanel error: ' + err.message);
            return;
        }
        if (!Array.isArray(filters) || !filters.length) {
            alert('NexusVideoEffects.getFilters() babu abinda ta dawo — duba video-call-effects.js');
            return;
        }
        track.dataset.built = '1';
        track.innerHTML = filters.map(f => `
    <div class="nexus-filter-chip" data-filter="${f.id}" onclick="NexusVideo.selectFilter('${f.id}')" style="text-align:center;flex-shrink:0;">
                  <div style="
                    width:56px;height:56px;border-radius:50%;
                    background:${f.swatch};
                    box-shadow:0 4px 14px rgba(0,0,0,0.35);
                    border:2px solid ${f.id === activeFilterId ? '#fff' : 'transparent'};
                    display:flex;align-items:center;justify-content:center;
                    margin:0 auto 6px;position:relative;
                ">
                    ${f.premium && !isPrem ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));"><path d="M12 1a5 5 0 0 0-5 5v3H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 0 1 6 0v3z"/></svg>' : ''}
                </div>
                <div style="font-size:10px;color:rgba(255,255,255,0.75);">${f.label}</div>
            </div>
        `).join('');
    }

    async function selectFilter(filterId) {
        const localVideoEl = document.getElementById('nexus-local-video');
        const result = await NexusVideoEffects.applyFilter(filterId, pc, localVideoEl);
        if (result === 'premium_locked') {
            if (typeof NexusPremium !== 'undefined' && NexusPremium.showUpgradePrompt) {
                NexusPremium.showUpgradePrompt('video_filters');
            } else {
                alert('Wannan filter Premium ne kadai — ka yi upgrade domin amfani da shi.');
            }
            return;
        }
       activeFilterId = filterId;
        document.querySelectorAll('.nexus-filter-chip').forEach(chip => {
            const inner = chip.querySelector('div');
            inner.style.border = chip.dataset.filter === activeFilterId ? '2px solid #fff' : '2px solid transparent';
        });
    }

    // ══════════════════════════════════════════════
    //  BACKGROUND (lazy-loaded engine)
    // ══════════════════════════════════════════════
    let bgLoadPromise = null;
    function loadBgEngine() {
        if (typeof NexusVideoBackground !== 'undefined') { bgLoaded = true; return Promise.resolve(); }
        if (bgLoadPromise) return bgLoadPromise;
        bgLoadPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'video-call-bg.js';
            s.onload = () => { bgLoaded = true; resolve(); };
            s.onerror = () => { bgLoadPromise = null; reject(new Error('Failed to load video-call-bg.js')); };
            document.body.appendChild(s);
        });
        return bgLoadPromise;
    }

    function buildBgPanel() {
        const track = document.getElementById('nexus-bg-track');
        if (!track || track.dataset.built) return;
        let bgs, isPrem;
        try {
            bgs = NexusVideoBackground.getBackgrounds();
            isPrem = NexusVideoBackground.isPremium();
        } catch (err) {
            alert('buildBgPanel error: ' + err.message);
            return;
        }
        if (!Array.isArray(bgs) || !bgs.length) {
            alert('NexusVideoBackground.getBackgrounds() babu abinda ta dawo — duba video-call-bg.js');
            return;
        }
        track.dataset.built = '1';
        track.innerHTML = bgs.map(b => {
            const swatch = b.type === 'gradient' ? `linear-gradient(135deg,${b.colors.join(',')})`
                : b.type === 'blur' ? 'rgba(255,255,255,0.15)'
                : 'rgba(255,255,255,0.1)';
            const icon = b.type === 'blur'
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/></svg>'
                : b.type === 'custom'
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
                : '';
            return `
                <div class="nexus-bg-chip" data-bg="${b.id}" onclick="NexusVideo.selectBackground('${b.id}')" style="text-align:center;flex-shrink:0;">
                    <div style="
                        width:56px;height:56px;border-radius:14px;
                        background:${swatch};
                        box-shadow:0 4px 14px rgba(0,0,0,0.35);
                        border:2px solid ${b.id === activeBgId ? '#fff' : 'transparent'};
                        display:flex;align-items:center;justify-content:center;
                        margin:0 auto 6px;position:relative;
                    ">
                        ${icon}
                        ${b.premium && !isPrem ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="position:absolute;bottom:-4px;right:-4px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));"><path d="M12 1a5 5 0 0 0-5 5v3H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 0 1 6 0v3z"/></svg>' : ''}
                    </div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.75);">${b.label}</div>
                </div>
            `;
        }).join('');
    }

    function refreshBgSelection() {
        document.querySelectorAll('.nexus-bg-chip').forEach(chip => {
            const inner = chip.querySelector('div');
            inner.style.border = chip.dataset.bg === activeBgId ? '2px solid #fff' : '2px solid transparent';
        });
    }

    async function selectBackground(bgId) {
        if (bgId === 'custom') {
            if (!NexusVideoBackground.isPremium()) {
                if (typeof NexusPremium !== 'undefined' && NexusPremium.showUpgradePrompt) {
                    NexusPremium.showUpgradePrompt('video_background');
                } else {
                    alert('Wannan fasali Premium ne kadai — ka yi upgrade domin amfani da shi.');
                }
                return;
            }
            const input = document.getElementById('nexus-bg-file-input');
            if (input) input.click();
            return;
        }
        const result = await NexusVideoBackground.applyBackground(bgId, pc);
        if (result === 'premium_locked') {
            if (typeof NexusPremium !== 'undefined' && NexusPremium.showUpgradePrompt) {
                NexusPremium.showUpgradePrompt('video_background');
            } else {
                alert('Wannan background Premium ne kadai — ka yi upgrade domin amfani da shi.');
            }
            return;
        }
        if (result === 'load_failed') { alert('Ba a iya loda background din ba, ka sake gwadawa.'); return; }
        activeBgId = bgId;
        refreshBgSelection();
    }

    async function handleCustomBgUpload(fileInput) {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const result = await NexusVideoBackground.applyCustomImage(file, pc);
        if (result === 'premium_locked') { alert('Wannan fasali Premium ne kadai — ka yi upgrade domin amfani da shi.'); return; }
        if (result === 'load_failed') { alert('Ba a iya loda hoton ba, ka sake gwadawa.'); return; }
        activeBgId = 'custom';
        refreshBgSelection();
       fileInput.value = '';
    }

    // ══════════════════════════════════════════════
    //  AR EFFECTS (lazy-loaded engine)
    // ══════════════════════════════════════════════
    let arLoaded = false;
    let activeArId = 'none';

    let arLoadPromise = null;
    function loadArEngine() {
        if (typeof NexusVideoAR !== 'undefined') { arLoaded = true; return Promise.resolve(); }
        if (arLoadPromise) return arLoadPromise;
        arLoadPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'video-call-ar.js';
            s.onload = () => { arLoaded = true; resolve(); };
            s.onerror = () => { arLoadPromise = null; reject(new Error('Failed to load video-call-ar.js')); };
            document.body.appendChild(s);
        });
        return arLoadPromise;
    }

    function buildArPanel() {
        const track = document.getElementById('nexus-ar-track');
        if (!track || track.dataset.built) return;
        let effects, isPrem;
        try {
            effects = NexusVideoAR.getEffects();
            isPrem = NexusVideoAR.isPremium();
        } catch (err) {
            alert('buildArPanel error: ' + err.message);
            return;
        }
        if (!Array.isArray(effects) || !effects.length) {
            alert('NexusVideoAR.getEffects() babu abinda ta dawo — duba video-call-ar.js');
            return;
        }
        track.dataset.built = '1';
        track.innerHTML = effects.map(e => `
            <div class="nexus-ar-chip" data-ar="${e.id}" onclick="NexusVideo.selectAREffect('${e.id}')" style="text-align:center;flex-shrink:0;">
                <div style="
                    width:56px;height:56px;border-radius:50%;
                    background:rgba(255,255,255,0.12);
                    box-shadow:0 4px 14px rgba(0,0,0,0.35);
                    border:2px solid ${e.id === activeArId ? '#fff' : 'transparent'};
                    display:flex;align-items:center;justify-content:center;
                    margin:0 auto 6px;position:relative;
                    font-size:24px;
                ">
                    ${{none:'🚫',catears:'🐱',bunnyears:'🐰',glasses:'😎',hearts:'💕',halo:'😇',fireflies:'✨',confetti:'🎉',robot:'🤖',blush:'☺️',stareyes:'🤩',crown:'👑',mustache:'🥸',freckles:'🍯'}[e.id] || '✨'}
                    ${e.premium && !isPrem ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="position:absolute;bottom:-4px;right:-4px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));"><path d="M12 1a5 5 0 0 0-5 5v3H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 0 1 6 0v3z"/></svg>' : ''}
                </div>
                <div style="font-size:10px;color:rgba(255,255,255,0.75);">${e.label}</div>
            </div>
        `).join('');
    }

    async function selectAREffect(effectId) {
        const result = await NexusVideoAR.applyEffect(effectId, pc);
        if (result === 'premium_locked') {
            if (typeof NexusPremium !== 'undefined' && NexusPremium.showUpgradePrompt) {
                NexusPremium.showUpgradePrompt('video_ar');
            } else {
                alert('Wannan effect Premium ne kadai — ka yi upgrade domin amfani da shi.');
            }
            return;
        }
        activeArId = effectId;
        document.querySelectorAll('.nexus-ar-chip').forEach(chip => {
            const inner = chip.querySelector('div');
            inner.style.border = chip.dataset.ar === activeArId ? '2px solid #fff' : '2px solid transparent';
        });
    }

    // ── Draggable PiP ───────────────────────────── 
        function makeDraggable(el) {
        if (!el) return;
        let startX, startY, startLeft, startTop;

        el.addEventListener('touchstart', e => {
            if (!el.dataset.corner) return; // full-screen tukuna — kar a toshe click/toggleControls
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            startLeft = el.offsetLeft;
            startTop = el.offsetTop;
            e.preventDefault();
        }, { passive: false });

        el.addEventListener('touchmove', e => {
            if (!el.dataset.corner) return; // full-screen tukuna — kar a toshe click/toggleControls
            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            const newLeft = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, startLeft + dx));
            const newTop = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, startTop + dy));
            el.style.left = newLeft + 'px';
            el.style.top = newTop + 'px';
            el.style.right = 'auto';
            e.preventDefault();
        }, { passive: false });
       } 

    // ══════════════════════════════════════════════
    //  CONTROLS
    // ══════════════════════════════════════════════
    function toggleVideoMute() {
        if (!localStream) return;
        isMuted = !isMuted;
        localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
        const btn = document.getElementById('nexus-vid-mute-btn');
        if (btn) {
            btn.style.background = isMuted ? 'rgba(255,59,48,0.6)' : 'rgba(255,255,255,0.2)';
            btn.querySelector('.vid-mute-icon').innerHTML = isMuted
                ? '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="white"/><line x1="1" y1="1" x2="23" y2="23" stroke="white" stroke-width="2"/>'
                : '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>';
        }
        scheduleHideControls();
    }

    function toggleCamera() {
        if (!localStream) return;
        isCameraOff = !isCameraOff;
        localStream.getVideoTracks().forEach(t => t.enabled = !isCameraOff);
        const btn = document.getElementById('nexus-vid-cam-btn');
        const overlay = document.getElementById('nexus-cam-off-overlay');
        if (btn) btn.style.background = isCameraOff ? 'rgba(255,59,48,0.6)' : 'rgba(255,255,255,0.2)';
        if (overlay) overlay.style.display = isCameraOff ? 'flex' : 'none';
        scheduleHideControls();
    }

    async function flipCamera() {
        if (!localStream || !pc) return;
        isFrontCamera = !isFrontCamera;
        const facingMode = isFrontCamera ? 'user' : 'environment';

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false
            });

            const newVideoTrack = newStream.getVideoTracks()[0];
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) await sender.replaceTrack(newVideoTrack);

            // Replace local video track
            const oldVideoTrack = localStream.getVideoTracks()[0];
            if (oldVideoTrack) { oldVideoTrack.stop(); localStream.removeTrack(oldVideoTrack); }
            localStream.addTrack(newVideoTrack);

            setupLocalVideo(localStream);
        } catch(e) { console.error('flipCamera:', e); }
        scheduleHideControls();
    }

   function updateVideoStatus(text, showTimer = false) {
        const statusEl = document.getElementById('nexus-video-status');
        const connectingEl = document.getElementById('nexus-video-connecting');
        const timerEl = document.getElementById('nexus-video-timer');
        const topbarStatus = document.getElementById('nexus-video-topbar-status');

        if (statusEl) statusEl.textContent = text;
        if (showTimer && connectingEl) {
            connectingEl.style.opacity = '0';
            setTimeout(() => { if(connectingEl) connectingEl.style.display = 'none'; }, 500);
        }
        if (timerEl) timerEl.style.display = showTimer ? 'block' : 'none';
        if (showTimer) {
            if (topbarStatusTimeout) { clearTimeout(topbarStatusTimeout); topbarStatusTimeout = null; }
            if (topbarStatus) topbarStatus.style.display = 'none';
            const pip = document.getElementById('nexus-pip-container');
            if (pip && !pip.dataset.corner) {
                pip.dataset.corner = '1';
                pip.style.inset = 'auto';
                pip.style.top = '150px';
                pip.style.right = '16px';
                pip.style.width = '110px';
                pip.style.height = '160px';
                pip.style.borderRadius = '18px';
                pip.style.border = '2.5px solid rgba(255,255,255,0.25)';
                pip.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6)';
                pip.style.zIndex = '10';
            }
        }
   } 

    function hideVideoCallUI() {
        const el = document.getElementById('nexus-video-call');
        if (el) el.remove();
        hideCallingUI();
    }

    // ══════════════════════════════════════════════
    //  UI — Unavailable (No Answer) Screen
    // ══════════════════════════════════════════════
    function showUnavailableScreen() {
        if (document.getElementById('nexus-video-unavailable')) return;
        const el = document.createElement('div');
        el.id = 'nexus-video-unavailable';
        el.innerHTML = `
            <div style="
                position:fixed;inset:0;z-index:99998;
                background:#1a1a1a;
                display:flex;flex-direction:column;
                align-items:center;
                overflow:hidden;
            ">
                <div style="position:absolute;top:0;left:0;right:0;padding:60px 20px 20px;text-align:center;">
                    <div style="font-family:'Roboto','Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:600;color:#fff;">${lastCallName}</div>
                    <div style="font-family:'Roboto','Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:rgba(255,255,255,0.6);margin-top:6px;">Unavailable</div>
                </div>
                <div style="width:110px;height:110px;border-radius:50%;overflow:hidden;margin-top:170px;border:2px solid rgba(255,255,255,0.15);">
                    <img src="${lastCallAvatar}" style="width:100%;height:100%;object-fit:cover;">
                </div>
                <div style="position:absolute;bottom:0;left:0;right:0;padding:24px 30px 50px;display:flex;align-items:center;justify-content:space-around;">
                    <div style="text-align:center;">
                        <div onclick="NexusVideo.hideUnavailableScreen()" style="
                            width:58px;height:58px;border-radius:50%;
                            background:#fff;
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                        ">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </div>
                        <div style="color:rgba(255,255,255,0.7);font-size:12px;">Cancel</div>
                    </div>
                    <div style="text-align:center;">
                        <div onclick="NexusVideo.hideUnavailableScreen(); if (typeof openVideoNoteRecorder === 'function') openVideoNoteRecorder();" style="
                            width:58px;height:58px;border-radius:50%;
                            background:rgba(255,255,255,0.15);
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                        ">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="14" height="12" rx="2"/><path d="M22 8.5v7l-4-2.5v-2z"/></svg>
                        </div>
                        <div style="color:rgba(255,255,255,0.7);font-size:12px;">Record video note</div>
                    </div>
                    <div style="text-align:center;">
                        <div onclick="NexusVideo.hideUnavailableScreen(); if (lastCalleeIdForRetry) NexusVideo.startVideoCall(lastCalleeIdForRetry);" style="
                            width:58px;height:58px;border-radius:50%;
                            background:#34c759;
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                        ">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                        </div>
                        <div style="color:rgba(255,255,255,0.7);font-size:12px;">Call again</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        window.lastCalleeIdForRetry = lastCalleeId;
    }

    function hideUnavailableScreen() {
        const el = document.getElementById('nexus-video-unavailable');
        if (el) el.remove();
    }

    function startCallTimer() {
        stopCallTimer();
        callSeconds = 0;
        callTimerInterval = setInterval(() => {
            callSeconds++;
            const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
            const s = String(callSeconds % 60).padStart(2, '0');
            const el = document.getElementById('nexus-video-timer');
            if (el) el.textContent = `${m}:${s}`;
        }, 1000);
    }

    function stopCallTimer() {
        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    }

    // ══════════════════════════════════════════════
    //  CSS
    // ══════════════════════════════════════════════
    function injectVideoCSS() {
        if (document.getElementById('nexus-video-css')) return;
        const style = document.createElement('style');
        style.id = 'nexus-video-css';
        style.textContent = `
            @keyframes fadeInUp {
                from { opacity:0; transform:translateY(30px); }
                to { opacity:1; transform:translateY(0); }
            }
            @keyframes bounce-accept {
                0%,100% { transform:scale(1); }
                50% { transform:scale(1.1); }
            }
            @keyframes voice-pulse {
                0%,100% { transform:scale(1); opacity:0.5; }
                50% { transform:scale(1.2); opacity:0; }
            }
            @keyframes blink {
                0%,100% { opacity:1; }
                50% { opacity:0.3; }
            }
        `;
        document.head.appendChild(style);
    }

    // ══════════════════════════════════════════════
    //  RINGTONE
    // ══════════════════════════════════════════════
    let videoRingtoneCtx = null;
    let videoRingtoneInterval = null;

    function playVideoRingtone() {
        try {
            videoRingtoneCtx = new (window.AudioContext || window.webkitAudioContext)();
            const beep = () => {
                [0, 0.35].forEach(delay => {
                    const osc = videoRingtoneCtx.createOscillator();
                    const gain = videoRingtoneCtx.createGain();
                    osc.connect(gain); gain.connect(videoRingtoneCtx.destination);
                    osc.frequency.value = 520; osc.type = 'sine';
                    const t = videoRingtoneCtx.currentTime + delay;
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
                    gain.gain.linearRampToValueAtTime(0, t + 0.25);
                    osc.start(t); osc.stop(t + 0.3);
                });
            };
            beep();
            videoRingtoneInterval = setInterval(beep, 2200);
        } catch(e) {}
    }

    function stopVideoRingtone() {
        if (videoRingtoneInterval) { clearInterval(videoRingtoneInterval); videoRingtoneInterval = null; }
        if (videoRingtoneCtx) { videoRingtoneCtx.close().catch(() => {}); videoRingtoneCtx = null; }
    }

    // ══════════════════════════════════════════════
    //  PUBLIC API
    // ══════════════════════════════════════════════
    return {
        init: listenForIncomingVideoCalls,
        startVideoCall,
        answerVideoCall,
        declineVideoCall,
        hangUpVideo,
        toggleVideoMute,
        toggleCamera,
        flipCamera,
        toggleControls,
        toggleFxPanel,
        showUnavailableScreen,
        hideUnavailableScreen,
        switchFxTab,
        selectFilter,
        selectBackground,
        handleCustomBgUpload,
        selectAREffect
    };
})();

(function bootNexusVideo() {
    // BUGFIX: same as call.js — DOMContentLoaded never fires again once this
    // script is injected by the SPA router, so NexusVideo.init() never ran.
    // Run it immediately; firebase is already loaded by this point.
    if (typeof firebase !== 'undefined' && localStorage.getItem('nexus_user_session')) {
        NexusVideo.init();
    }
})();
