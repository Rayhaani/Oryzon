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

        try { await callDocRef.update({ status: 'ended' }); } catch(e) {}

        const name = document.getElementById('chat-header-name')?.textContent || calleeId;
        const avatar = document.getElementById('chat-header-avatar')?.src || '';

        showCallingUI({ name, avatar });

        try {
            localStream = await getMedia('user');
            showVideoCallUI({ name, avatar, isCaller: true });
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
                        endVideoCleanup('No Answer');
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
                    background:rgba(0,0,0,0.6);
                    display:flex;flex-direction:column;
                    align-items:center;justify-content:center;gap:16px;
                    z-index:2;
                ">
                    <div style="width:90px;height:90px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,0.3);">
                        <img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">
                    </div>
                    <div style="font-size:22px;font-weight:600;color:#fff;">${name}</div>
                    <div id="nexus-video-status" style="font-size:14px;color:rgba(255,255,255,0.6);">
                        ${isCaller ? 'Calling...' : 'Connecting...'}
                    </div>
                </div>

                <!-- Local Video (PiP - Picture in Picture) -->
                <div id="nexus-pip-container" style="
                    position:absolute;
                    top:16px;right:16px;
                    width:110px;height:160px;
                    border-radius:18px;
                    overflow:hidden;
                    border:2.5px solid rgba(255,255,255,0.25);
                    box-shadow:0 8px 32px rgba(0,0,0,0.6);
                    z-index:10;
                    cursor:move;
                    transition:box-shadow 0.2s;
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
                    padding:50px 20px 20px;
                    background:linear-gradient(180deg,rgba(0,0,0,0.7) 0%,transparent 100%);
                    display:flex;align-items:center;justify-content:space-between;
                    z-index:10;
                    transition:opacity 0.3s;
                ">
                    <div>
                        <div style="font-size:17px;font-weight:600;color:#fff;">${name}</div>
                        <div id="nexus-video-timer" style="font-size:13px;color:rgba(255,255,255,0.7);display:none;">00:00</div>
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
                            width:58px;height:58px;border-radius:50%;
                            background:rgba(255,255,255,0.2);
                            backdrop-filter:blur(10px);
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                            border:1px solid rgba(255,255,255,0.2);
                            transition:background 0.2s;
                        ">
                            <svg class="vid-mute-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                            width:72px;height:72px;border-radius:50%;
                            background:#ff3b30;
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                            box-shadow:0 8px 30px rgba(255,59,48,0.6);
                            transition:transform 0.15s;
                        " onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                                <line x1="1" y1="1" x2="23" y2="23"/>
                                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.03 18.81a16.18 16.18 0 0 0 7.94 0"/>
                            </svg>
                        </div>
                        <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:500;">End</div>
                    </div>

                    <!-- Camera Toggle -->
                    <div style="text-align:center;">
                        <div id="nexus-vid-cam-btn" onclick="event.stopPropagation();NexusVideo.toggleCamera()" style="
                            width:58px;height:58px;border-radius:50%;
                            background:rgba(255,255,255,0.2);
                            backdrop-filter:blur(10px);
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                            border:1px solid rgba(255,255,255,0.2);
                            transition:background 0.2s;
                        ">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.362a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                            </svg>
                        </div>
                        <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:500;">Camera</div>
                    </div>

                    <!-- Flip Camera -->
                    <div style="text-align:center;">
                        <div onclick="event.stopPropagation();NexusVideo.flipCamera()" style="
                            width:58px;height:58px;border-radius:50%;
                            background:rgba(255,255,255,0.2);
                            backdrop-filter:blur(10px);
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;margin:0 auto 8px;
                            border:1px solid rgba(255,255,255,0.2);
                            transition:background 0.2s;
                        ">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 4v6h6M23 20v-6h-6"/>
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                            </svg>
                        </div>
                        <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:500;">Flip</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(el);

        // Auto-hide controls after 4s
        scheduleHideControls();

        // Draggable PiP
        makeDraggable(document.getElementById('nexus-pip-container'));
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

    // ── Draggable PiP ─────────────────────────────
    function makeDraggable(el) {
        if (!el) return;
        let startX, startY, startLeft, startTop;

        el.addEventListener('touchstart', e => {
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            startLeft = el.offsetLeft;
            startTop = el.offsetTop;
            e.preventDefault();
        }, { passive: false });

        el.addEventListener('touchmove', e => {
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

        if (statusEl) statusEl.textContent = text;
        if (showTimer && connectingEl) {
            connectingEl.style.opacity = '0';
            setTimeout(() => { if(connectingEl) connectingEl.style.display = 'none'; }, 500);
        }
        if (timerEl) timerEl.style.display = showTimer ? 'block' : 'none';
    }

    function hideVideoCallUI() {
        const el = document.getElementById('nexus-video-call');
        if (el) el.remove();
        hideCallingUI();
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
        toggleControls
    };

})();

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && localStorage.getItem('nexus_user_session')) {
        NexusVideo.init();
    }
});
