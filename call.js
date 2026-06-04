// ═══════════════════════════════════════════════════
//  NEXUS WebRTC Voice Call Engine
//  Works with Firebase Firestore for signaling
// ═══════════════════════════════════════════════════

const NexusCall = (() => {

    // ── State ──────────────────────────────────────
    let pc = null;               // RTCPeerConnection
    let localStream = null;      // Microphone stream
    let callDocRef = null;       // Firestore signal doc
    let callTimerInterval = null;
    let callSeconds = 0;
    let isMuted = false;
    let isSpeaker = false;
    let callRole = null;         // 'caller' | 'callee'
    let currentCallId = null;
    let incomingUnsubscribe = null;

    // ── STUN/TURN servers (Google free STUN) ──────
    const iceConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ]
    };

    // ── UI Elements ───────────────────────────────
    function getDB() { return firebase.firestore(); }
    function getMyId() { return localStorage.getItem('nexus_user_session'); }

    // ══════════════════════════════════════════════
    //  INITIATE CALL (Caller Side)
    // ══════════════════════════════════════════════
    async function startCall(calleeId) {
        const myId = getMyId();
        if (!myId) return;

        callRole = 'caller';
        currentCallId = [myId, calleeId].sort().join('__') + '_call';

        // Show calling UI
        showCallUI({
            name: document.getElementById('chat-header-name')?.textContent || calleeId,
            avatar: document.getElementById('chat-header-avatar')?.src || '',
            status: 'Calling...',
            isCaller: true
        });

        try {
            // Get microphone
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            // Create peer connection
            pc = new RTCPeerConnection(iceConfig);
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

            // Handle incoming audio
            pc.ontrack = (e) => {
                let remoteAudio = document.getElementById('nexus-remote-audio');
                if (!remoteAudio) {
                    remoteAudio = document.createElement('audio');
                    remoteAudio.id = 'nexus-remote-audio';
                    remoteAudio.autoplay = true;
                    document.body.appendChild(remoteAudio);
                }
                remoteAudio.srcObject = e.streams[0];
            };

            // Firestore signaling doc
            callDocRef = getDB().collection('nexusCalls').doc(currentCallId);

            // Collect ICE candidates
            const callerCandidates = [];
            pc.onicecandidate = (e) => {
                if (e.candidate) callerCandidates.push(e.candidate.toJSON());
            };

            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Wait for ICE gathering
            await waitForICE(pc);

            // Write to Firestore
            await callDocRef.set({
                callerId: myId,
                calleeId: calleeId,
                offer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
                callerCandidates: callerCandidates,
                status: 'ringing',
                createdAt: Date.now()
            });

            // Listen for answer
            callDocRef.onSnapshot(async (snap) => {
                const data = snap.data();
                if (!data) return;

                if (data.status === 'answered' && data.answer && !pc.currentRemoteDescription) {
                    const answer = new RTCSessionDescription(data.answer);
                    await pc.setRemoteDescription(answer);

                    // Add callee ICE candidates
                    if (data.calleeCandidates) {
                        for (const c of data.calleeCandidates) {
                            await pc.addIceCandidate(new RTCIceCandidate(c));
                        }
                    }
                    updateCallStatus('Connected', true);
                    startCallTimer();
                }

                if (data.status === 'declined' || data.status === 'ended') {
                    endCallCleanup();
                }
            });

            // Timeout - idan bai amsa ba cikin 45s
            setTimeout(() => {
                if (callDocRef && callRole === 'caller') {
                    callDocRef.get().then(s => {
                        if (s.exists && s.data().status === 'ringing') {
                            callDocRef.update({ status: 'missed' });
                            endCallCleanup('No Answer');
                        }
                    });
                }
            }, 45000);

        } catch (err) {
            console.error('Call error:', err);
            endCallCleanup('Failed');
        }
    }

    // ══════════════════════════════════════════════
    //  LISTEN FOR INCOMING CALLS (Must run always)
    // ══════════════════════════════════════════════
    function listenForIncomingCalls() {
        const myId = getMyId();
        if (!myId) return;

        incomingUnsubscribe = getDB().collection('nexusCalls')
            .where('calleeId', '==', myId)
            .where('status', '==', 'ringing')
            .onSnapshot((snap) => {
                snap.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const docId = change.doc.id;

                        // Show incoming call UI
                        showIncomingCallUI({
                            callerId: data.callerId,
                            docId: docId,
                            offer: data.offer,
                            callerCandidates: data.callerCandidates || []
                        });
                    }
                });
            });
    }

    // ══════════════════════════════════════════════
    //  ANSWER CALL (Callee Side)
    // ══════════════════════════════════════════════
    async function answerCall(docId, callerName, callerAvatar) {
        callRole = 'callee';
        currentCallId = docId;

        hideIncomingCallUI();
        showCallUI({
            name: callerName,
            avatar: callerAvatar,
            status: 'Connecting...',
            isCaller: false
        });

        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            pc = new RTCPeerConnection(iceConfig);
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

            pc.ontrack = (e) => {
                let remoteAudio = document.getElementById('nexus-remote-audio');
                if (!remoteAudio) {
                    remoteAudio = document.createElement('audio');
                    remoteAudio.id = 'nexus-remote-audio';
                    remoteAudio.autoplay = true;
                    document.body.appendChild(remoteAudio);
                }
                remoteAudio.srcObject = e.streams[0];
            };

            callDocRef = getDB().collection('nexusCalls').doc(docId);
            const callData = (await callDocRef.get()).data();

            // Set remote description (offer)
            await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

            // Add caller ICE candidates
            for (const c of (callData.callerCandidates || [])) {
                await pc.addIceCandidate(new RTCIceCandidate(c));
            }

            // Collect callee ICE candidates
            const calleeCandidates = [];
            pc.onicecandidate = (e) => {
                if (e.candidate) calleeCandidates.push(e.candidate.toJSON());
            };

            // Create answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await waitForICE(pc);

            // Update Firestore with answer
            await callDocRef.update({
                answer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
                calleeCandidates: calleeCandidates,
                status: 'answered'
            });

            updateCallStatus('Connected', true);
            startCallTimer();

            // Listen for end
            callDocRef.onSnapshot((snap) => {
                const data = snap.data();
                if (data && data.status === 'ended') {
                    endCallCleanup();
                }
            });

        } catch (err) {
            console.error('Answer error:', err);
            endCallCleanup('Failed');
        }
    }

    // ══════════════════════════════════════════════
    //  DECLINE / END CALL
    // ══════════════════════════════════════════════
    function declineCall(docId) {
        getDB().collection('nexusCalls').doc(docId).update({ status: 'declined' }).catch(() => {});
        hideIncomingCallUI();
    }

    function hangUp() {
        if (callDocRef) {
            callDocRef.update({ status: 'ended' }).catch(() => {});
        }
        endCallCleanup();
    }

    function endCallCleanup(msg) {
        if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
        if (pc) { pc.close(); pc = null; }
        const remoteAudio = document.getElementById('nexus-remote-audio');
        if (remoteAudio) remoteAudio.remove();
        stopCallTimer();
        callDocRef = null;
        callRole = null;

        if (msg) updateCallStatus(msg);
        setTimeout(() => hideCallUI(), msg ? 1500 : 0);
    }

    // ══════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════
    function waitForICE(pc) {
        return new Promise((resolve) => {
            if (pc.iceGatheringState === 'complete') { resolve(); return; }
            const check = () => {
                if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', check); resolve(); }
            };
            pc.addEventListener('icegatheringstatechange', check);
            setTimeout(resolve, 3000); // Max 3s wait
        });
    }

    function startCallTimer() {
        callSeconds = 0;
        callTimerInterval = setInterval(() => {
            callSeconds++;
            const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
            const s = String(callSeconds % 60).padStart(2, '0');
            const el = document.getElementById('nexus-call-timer');
            if (el) el.textContent = `${m}:${s}`;
        }, 1000);
    }

    function stopCallTimer() {
        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    }

    function toggleMute() {
        if (!localStream) return;
        isMuted = !isMuted;
        localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
        const btn = document.getElementById('nexus-mute-btn');
        if (btn) {
            btn.style.background = isMuted ? 'rgba(255,80,80,0.3)' : 'rgba(255,255,255,0.12)';
            btn.querySelector('.mute-icon').innerHTML = isMuted
                ? `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="#ff5050"/><line x1="1" y1="1" x2="23" y2="23" stroke="#ff5050" stroke-width="2"/>`
                : `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>`;
        }
    }

    function toggleSpeaker() {
        isSpeaker = !isSpeaker;
        const audio = document.getElementById('nexus-remote-audio');
        if (audio) {
            // On mobile, try setSinkId (speaker vs earpiece)
            if (audio.setSinkId) {
                audio.setSinkId(isSpeaker ? 'default' : '').catch(() => {});
            }
        }
        const btn = document.getElementById('nexus-speaker-btn');
        if (btn) {
            btn.style.background = isSpeaker ? 'rgba(0,242,255,0.2)' : 'rgba(255,255,255,0.12)';
        }
    }

    // ══════════════════════════════════════════════
    //  UI - INCOMING CALL SCREEN
    // ══════════════════════════════════════════════
    let incomingCallData = {};

    function showIncomingCallUI({ callerId, docId, offer, callerCandidates }) {
        incomingCallData = { callerId, docId, offer, callerCandidates };

        // Get caller info from Firestore
        firebase.firestore().collection('users').doc(callerId).get().then(doc => {
            const callerName = doc.exists ? (doc.data().fullName || doc.data().username || callerId) : callerId;
            const callerAvatar = doc.exists && doc.data().userProfilePic
                ? doc.data().userProfilePic
                : `https://api.dicebear.com/7.x/bottts/svg?seed=${callerId}`;

            incomingCallData.callerName = callerName;
            incomingCallData.callerAvatar = callerAvatar;

            const el = document.createElement('div');
            el.id = 'nexus-incoming-call';
            el.innerHTML = `
                <div style="
                    position: fixed; inset: 0; z-index: 99999;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(20px);
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    gap: 16px;
                    animation: fadeInUp 0.3s ease;
                ">
                    <div style="
                        width: 90px; height: 90px; border-radius: 50%;
                        border: 3px solid #00F2FF;
                        box-shadow: 0 0 30px rgba(0,242,255,0.4);
                        overflow: hidden;
                        animation: pulse-ring 1.5s ease-in-out infinite;
                    ">
                        <img src="${callerAvatar}" style="width:100%;height:100%;object-fit:cover;">
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:22px;font-weight:700;color:#fff;font-family:'Inter',sans-serif;">${callerName}</div>
                        <div style="font-size:13px;color:#00F2FF;margin-top:6px;letter-spacing:2px;text-transform:uppercase;">Incoming Call</div>
                    </div>
                    <div style="
                        display: flex; gap: 40px; margin-top: 20px;
                    ">
                        <!-- Decline -->
                        <div style="text-align:center;">
                            <div onclick="NexusCall.declineCall('${docId}')" style="
                                width: 64px; height: 64px; border-radius: 50%;
                                background: linear-gradient(135deg, #ff4444, #cc0000);
                                display: flex; align-items: center; justify-content: center;
                                cursor: pointer;
                                box-shadow: 0 4px 20px rgba(255,68,68,0.4);
                                transition: transform 0.15s;
                            " onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                                    <path d="M18.36 6.64a9 9 0 0 1 0 10.72M6.64 6.64a9 9 0 0 0 0 10.72M12 12h.01"/>
                                    <line x1="1" y1="1" x2="23" y2="23" stroke="white" stroke-width="2.5"/>
                                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.03 18.81a16.18 16.18 0 0 0 7.94 0"/>
                                </svg>
                            </div>
                            <div style="color:#aaa;font-size:11px;margin-top:6px;">Decline</div>
                        </div>
                        <!-- Accept -->
                        <div style="text-align:center;">
                            <div onclick="NexusCall.answerCall('${docId}', '${callerName}', '${callerAvatar}')" style="
                                width: 64px; height: 64px; border-radius: 50%;
                                background: linear-gradient(135deg, #00F2FF, #0072FF);
                                display: flex; align-items: center; justify-content: center;
                                cursor: pointer;
                                box-shadow: 0 4px 20px rgba(0,242,255,0.4);
                                transition: transform 0.15s;
                                animation: bounce-accept 1s ease-in-out infinite;
                            " onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.79a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                            </div>
                            <div style="color:#00F2FF;font-size:11px;margin-top:6px;">Accept</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(el);
            injectCallCSS();

            // Ringtone
            playRingtone();
        });
    }

    function hideIncomingCallUI() {
        const el = document.getElementById('nexus-incoming-call');
        if (el) el.remove();
        stopRingtone();
    }

    // ══════════════════════════════════════════════
    //  UI - ACTIVE CALL SCREEN
    // ══════════════════════════════════════════════
    function showCallUI({ name, avatar, status, isCaller }) {
        const el = document.createElement('div');
        el.id = 'nexus-active-call';
        el.innerHTML = `
            <div style="
                position: fixed; inset: 0; z-index: 99998;
                background: linear-gradient(180deg, #0a1628 0%, #050505 100%);
                display: flex; flex-direction: column;
                align-items: center; justify-content: space-between;
                padding: 60px 20px 50px;
                animation: fadeInUp 0.3s ease;
            ">
                <!-- Top -->
                <div style="text-align:center;">
                    <div style="font-size:13px;color:rgba(255,255,255,0.5);letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">
                        ${isCaller ? 'Calling' : 'Audio Call'}
                    </div>
                    <div style="
                        width: 110px; height: 110px; border-radius: 50%;
                        border: 3px solid rgba(0,242,255,0.5);
                        box-shadow: 0 0 40px rgba(0,242,255,0.2);
                        overflow: hidden; margin: 0 auto 20px;
                        position: relative;
                    ">
                        <img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">
                        <div id="nexus-voice-ring" style="
                            position:absolute;inset:-8px;
                            border-radius:50%;
                            border: 2px solid rgba(0,242,255,0.3);
                            animation: voice-pulse 1.5s ease-in-out infinite;
                        "></div>
                    </div>
                    <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:8px;">${name}</div>
                    <div id="nexus-call-status" style="font-size:13px;color:#00F2FF;">${status}</div>
                    <div id="nexus-call-timer" style="
                        font-size:18px; color:#fff; margin-top:8px;
                        font-family:'Orbitron',monospace; letter-spacing:2px;
                        display:none;
                    ">00:00</div>
                </div>

                <!-- Waveform -->
                <div id="nexus-waveform" style="
                    display: flex; align-items: center; gap: 4px; height: 40px;
                ">
                    ${Array.from({length: 12}, (_, i) => `
                        <div style="
                            width: 3px; border-radius: 2px;
                            background: rgba(0,242,255,0.6);
                            animation: wave-bar 1.2s ease-in-out infinite;
                            animation-delay: ${i * 0.1}s;
                            height: ${Math.random() * 30 + 10}px;
                        "></div>
                    `).join('')}
                </div>

                <!-- Controls -->
                <div style="width:100%;max-width:320px;">
                    <!-- Top row -->
                    <div style="display:flex;justify-content:space-around;margin-bottom:30px;">
                        <!-- Mute -->
                        <div style="text-align:center;">
                            <div id="nexus-mute-btn" onclick="NexusCall.toggleMute()" style="
                                width: 56px; height: 56px; border-radius: 50%;
                                background: rgba(255,255,255,0.12);
                                display: flex; align-items: center; justify-content: center;
                                cursor: pointer; margin: 0 auto 8px;
                                transition: background 0.2s;
                                border: 1px solid rgba(255,255,255,0.15);
                            ">
                                <svg class="mute-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                            </div>
                            <div style="color:#aaa;font-size:11px;">Mute</div>
                        </div>
                        <!-- Speaker -->
                        <div style="text-align:center;">
                            <div id="nexus-speaker-btn" onclick="NexusCall.toggleSpeaker()" style="
                                width: 56px; height: 56px; border-radius: 50%;
                                background: rgba(255,255,255,0.12);
                                display: flex; align-items: center; justify-content: center;
                                cursor: pointer; margin: 0 auto 8px;
                                transition: background 0.2s;
                                border: 1px solid rgba(255,255,255,0.15);
                            ">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                </svg>
                            </div>
                            <div style="color:#aaa;font-size:11px;">Speaker</div>
                        </div>
                    </div>

                    <!-- End Call Button -->
                    <div style="display:flex;justify-content:center;">
                        <div onclick="NexusCall.hangUp()" style="
                            width: 72px; height: 72px; border-radius: 50%;
                            background: linear-gradient(135deg, #ff4444, #cc0000);
                            display: flex; align-items: center; justify-content: center;
                            cursor: pointer;
                            box-shadow: 0 4px 25px rgba(255,68,68,0.5);
                            transition: transform 0.15s;
                        " onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.69 12"/>
                                <line x1="1" y1="1" x2="23" y2="23" stroke="white" stroke-width="2.5"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        injectCallCSS();
    }

    function updateCallStatus(text, showTimer = false) {
        const statusEl = document.getElementById('nexus-call-status');
        const timerEl = document.getElementById('nexus-call-timer');
        if (statusEl) statusEl.textContent = text;
        if (timerEl) timerEl.style.display = showTimer ? 'block' : 'none';
    }

    function hideCallUI() {
        const el = document.getElementById('nexus-active-call');
        if (el) el.remove();
        isMuted = false;
        isSpeaker = false;
    }

    // ══════════════════════════════════════════════
    //  CSS Animations
    // ══════════════════════════════════════════════
    function injectCallCSS() {
        if (document.getElementById('nexus-call-css')) return;
        const style = document.createElement('style');
        style.id = 'nexus-call-css';
        style.textContent = `
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse-ring {
                0%, 100% { box-shadow: 0 0 0 0 rgba(0,242,255,0.4), 0 0 30px rgba(0,242,255,0.4); }
                50% { box-shadow: 0 0 0 15px rgba(0,242,255,0), 0 0 30px rgba(0,242,255,0.2); }
            }
            @keyframes bounce-accept {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.08); }
            }
            @keyframes wave-bar {
                0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
                50% { transform: scaleY(1); opacity: 1; }
            }
            @keyframes voice-pulse {
                0%, 100% { transform: scale(1); opacity: 0.6; }
                50% { transform: scale(1.15); opacity: 0.1; }
            }
        `;
        document.head.appendChild(style);
    }

    // ══════════════════════════════════════════════
    //  Ringtone (Web Audio API)
    // ══════════════════════════════════════════════
    let ringtoneCtx = null;
    let ringtoneInterval = null;

    function playRingtone() {
        try {
            ringtoneCtx = new (window.AudioContext || window.webkitAudioContext)();
            const playBeep = () => {
                const osc = ringtoneCtx.createOscillator();
                const gain = ringtoneCtx.createGain();
                osc.connect(gain); gain.connect(ringtoneCtx.destination);
                osc.frequency.value = 440;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.3, ringtoneCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ringtoneCtx.currentTime + 0.4);
                osc.start();
                osc.stop(ringtoneCtx.currentTime + 0.4);
            };
            playBeep();
            ringtoneInterval = setInterval(playBeep, 1200);
        } catch (e) {}
    }

    function stopRingtone() {
        if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
        if (ringtoneCtx) { ringtoneCtx.close().catch(() => {}); ringtoneCtx = null; }
    }

    // ══════════════════════════════════════════════
    //  Public API
    // ══════════════════════════════════════════════
    return {
        init: listenForIncomingCalls,
        startCall,
        answerCall,
        declineCall,
        hangUp,
        toggleMute,
        toggleSpeaker
    };

})();

// Auto-init when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && localStorage.getItem('nexus_user_session')) {
        NexusCall.init();
    }
});
