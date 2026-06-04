// ═══════════════════════════════════════════════════
//  NEXUS WebRTC Voice Call Engine — World Class UI
//  Glassmorphism + iPhone-style animations
// ═══════════════════════════════════════════════════

const NexusCall = (() => {

    let pc = null, localStream = null, callDocRef = null;
    let callUnsub = null, callTimerInterval = null, callSeconds = 0;
    let isMuted = false, isSpeaker = false, callRole = null;

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

    async function getMic() {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: { ideal: true },
                    noiseSuppression: { ideal: true },
                    autoGainControl: { ideal: true },
                    channelCount: 1,
                },
                video: false
            });
        } catch(e) {
            return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }
    }

    function setupAudio(stream) {
        let a = document.getElementById('nexus-remote-audio');
        if (!a) {
            a = document.createElement('audio');
            a.id = 'nexus-remote-audio';
            a.autoplay = true;
            a.playsInline = true;
            document.body.appendChild(a);
        }
        a.srcObject = stream;
        a.play().catch(() => {});
    }

    function listenCandidates(sub) {
        callDocRef.collection(sub).onSnapshot(snap => {
            snap.docChanges().forEach(async change => {
                if (change.type === 'added' && pc) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(change.doc.data())); } catch(e) {}
                }
            });
        });
    }

    // ══════════════════════════════════════════════
    //  CALLER
    // ══════════════════════════════════════════════
    async function startCall(calleeId) {
        const myId = getMyId();
        if (!myId) return;
        callRole = 'caller';
        const callId = [myId, calleeId].sort().join('__') + '_call';
        callDocRef = getDB().collection('nexusCalls').doc(callId);
        try { await callDocRef.update({ status: 'ended' }); } catch(e) {}

        showCallUI({
            name: document.getElementById('chat-header-name')?.textContent || calleeId,
            avatar: document.getElementById('chat-header-avatar')?.src || '',
            status: 'Calling...', isCaller: true
        });

        try {
            localStream = await getMic();
            pc = new RTCPeerConnection(iceConfig);
            localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
            pc.ontrack = e => setupAudio(e.streams[0]);
            pc.onicecandidate = e => {
                if (e.candidate) callDocRef.collection('callerCandidates').add(e.candidate.toJSON());
            };
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') { updateCallStatus('Connected', true); startCallTimer(); }
                else if (['failed','disconnected'].includes(pc.connectionState)) endCallCleanup('Call Ended');
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await callDocRef.set({
                callerId: myId, calleeId,
                offer: { type: offer.type, sdp: offer.sdp },
                status: 'ringing', createdAt: Date.now()
            });

            callUnsub = callDocRef.onSnapshot(async snap => {
                const data = snap.data();
                if (!data) return;
                if (data.answer && !pc.currentRemoteDescription) {
                    try { await pc.setRemoteDescription(new RTCSessionDescription(data.answer)); listenCandidates('calleeCandidates'); } catch(e) {}
                }
                if (data.status === 'declined') endCallCleanup('Declined');
                if (data.status === 'ended') endCallCleanup();
            });

            setTimeout(() => {
                if (callRole !== 'caller' || !callDocRef) return;
                callDocRef.get().then(s => {
                    if (s.exists && s.data()?.status === 'ringing') {
                        callDocRef.update({ status: 'missed' });
                        endCallCleanup('No Answer');
                    }
                });
            }, 45000);

        } catch(err) {
            endCallCleanup(err.name === 'NotAllowedError' ? 'Mic Denied' : 'Call Failed');
        }
    }

    // ══════════════════════════════════════════════
    //  CALLEE
    // ══════════════════════════════════════════════
    async function answerCall(docId, callerName, callerAvatar) {
        callRole = 'callee';
        callDocRef = getDB().collection('nexusCalls').doc(docId);
        hideIncomingCallUI();
        showCallUI({ name: callerName, avatar: callerAvatar, status: 'Connecting...', isCaller: false });

        try {
            localStream = await getMic();
            pc = new RTCPeerConnection(iceConfig);
            localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
            pc.ontrack = e => setupAudio(e.streams[0]);
            pc.onicecandidate = e => {
                if (e.candidate) callDocRef.collection('calleeCandidates').add(e.candidate.toJSON());
            };
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') { updateCallStatus('Connected', true); startCallTimer(); }
                else if (['failed','disconnected'].includes(pc.connectionState)) endCallCleanup('Call Ended');
            };

            const callData = (await callDocRef.get()).data();
            if (!callData) { endCallCleanup('Not Found'); return; }
            await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
            listenCandidates('callerCandidates');

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await callDocRef.update({ answer: { type: answer.type, sdp: answer.sdp }, status: 'answered' });

            callUnsub = callDocRef.onSnapshot(snap => {
                if (snap.data()?.status === 'ended') endCallCleanup();
            });
        } catch(err) {
            endCallCleanup('Answer Failed');
        }
    }

    // ══════════════════════════════════════════════
    //  INCOMING CALLS LISTENER
    // ══════════════════════════════════════════════
    function listenForIncomingCalls() {
        const myId = getMyId();
        if (!myId) return;
        getDB().collection('nexusCalls')
            .where('calleeId', '==', myId)
            .where('status', '==', 'ringing')
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        if (Date.now() - data.createdAt < 60000) {
                            showIncomingCallUI({ callerId: data.callerId, docId: change.doc.id });
                        }
                    }
                });
            });
    }

    function declineCall(docId) {
        getDB().collection('nexusCalls').doc(docId).update({ status: 'declined' }).catch(() => {});
        hideIncomingCallUI();
    }

    function hangUp() {
        if (callDocRef) callDocRef.update({ status: 'ended' }).catch(() => {});
        endCallCleanup();
    }

    function endCallCleanup(msg) {
        if (callUnsub) { callUnsub(); callUnsub = null; }
        if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
        if (pc) { pc.close(); pc = null; }
        const a = document.getElementById('nexus-remote-audio');
        if (a) a.remove();
        stopCallTimer();
        callDocRef = null; callRole = null;
        if (msg) updateCallStatus(msg);
        setTimeout(() => hideCallUI(), msg ? 2000 : 0);
    }

    // ══════════════════════════════════════════════
    //  UI — INCOMING CALL (iPhone Style)
    // ══════════════════════════════════════════════
    function showIncomingCallUI({ callerId, docId }) {
        if (document.getElementById('nexus-active-call') || document.getElementById('nexus-incoming-call')) return;

        getDB().collection('users').doc(callerId).get().then(doc => {
            const name = doc.exists ? (doc.data().fullName || doc.data().username || callerId) : callerId;
            const avatar = doc.exists && doc.data().userProfilePic
                ? doc.data().userProfilePic
                : `https://api.dicebear.com/7.x/bottts/svg?seed=${callerId}`;

            injectCSS();
            const el = document.createElement('div');
            el.id = 'nexus-incoming-call';
            el.innerHTML = `
            <div class="nexus-incoming-wrap">

                <!-- Blurred avatar background -->
                <div class="nexus-bg-blur" style="background-image:url('${avatar}')"></div>
                <div class="nexus-bg-overlay"></div>

                <!-- Top section -->
                <div class="nexus-incoming-top">
                    <div class="nexus-incoming-label">Incoming Call</div>
                    <div class="nexus-incoming-name">${name}</div>
                    <div class="nexus-incoming-sub">Nexus · Audio Call</div>
                </div>

                <!-- Avatar with rings -->
                <div class="nexus-avatar-rings">
                    <div class="nexus-ring nexus-ring-3"></div>
                    <div class="nexus-ring nexus-ring-2"></div>
                    <div class="nexus-ring nexus-ring-1"></div>
                    <div class="nexus-avatar-circle">
                        <img src="${avatar}" alt="${name}">
                    </div>
                </div>

                <!-- Action buttons -->
                <div class="nexus-incoming-actions">
                    <!-- Decline -->
                    <div class="nexus-action-wrap">
                        <div class="nexus-action-btn nexus-decline" onclick="NexusCall.declineCall('${docId}')">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                                <line x1="1" y1="1" x2="23" y2="23"/>
                                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                            </svg>
                        </div>
                        <div class="nexus-action-label">Decline</div>
                    </div>

                    <!-- Remind me -->
                    <div class="nexus-action-wrap">
                        <div class="nexus-action-btn nexus-remind" onclick="NexusCall.declineCall('${docId}')">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                        </div>
                        <div class="nexus-action-label">Remind</div>
                    </div>

                    <!-- Accept -->
                    <div class="nexus-action-wrap">
                        <div class="nexus-action-btn nexus-accept" onclick="NexusCall.answerCall('${docId}','${name}','${avatar}')">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.79a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                        </div>
                        <div class="nexus-action-label" style="color:#34c759;">Accept</div>
                    </div>
                </div>
            </div>`;
            document.body.appendChild(el);
            playRingtone();

            getDB().collection('nexusCalls').doc(docId).onSnapshot(snap => {
                const d = snap.data();
                if (d && ['missed','ended','declined'].includes(d.status)) hideIncomingCallUI();
            });
        });
    }

    function hideIncomingCallUI() {
        const el = document.getElementById('nexus-incoming-call');
        if (el) {
            el.style.animation = 'slideDown 0.4s ease forwards';
            setTimeout(() => el.remove(), 400);
        }
        stopRingtone();
    }

    // ══════════════════════════════════════════════
    //  UI — ACTIVE CALL (World Class Glassmorphism)
    // ══════════════════════════════════════════════
    function showCallUI({ name, avatar, status, isCaller }) {
        if (document.getElementById('nexus-active-call')) return;
        injectCSS();

        const el = document.createElement('div');
        el.id = 'nexus-active-call';
        el.innerHTML = `
        <div class="nexus-call-wrap">

            <!-- Blurred avatar background -->
            <div class="nexus-bg-blur" style="background-image:url('${avatar}')"></div>
            <div class="nexus-bg-overlay"></div>

            <!-- Top bar -->
            <div class="nexus-call-topbar">
                <div class="nexus-call-type-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.79a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Audio
                </div>
                <div id="nexus-call-timer" class="nexus-timer" style="display:none;">00:00</div>
            </div>

            <!-- Center — Avatar + Name -->
            <div class="nexus-call-center">
                <div class="nexus-call-avatar-wrap">
                    <div class="nexus-call-ring r1"></div>
                    <div class="nexus-call-ring r2"></div>
                    <div class="nexus-call-avatar">
                        <img src="${avatar}" alt="${name}">
                    </div>
                </div>
                <div class="nexus-call-name">${name}</div>
                <div id="nexus-call-status" class="nexus-call-status">${status}</div>

                <!-- Waveform -->
                <div class="nexus-waveform" id="nexus-waveform">
                    ${Array.from({length:20},(_,i)=>`
                        <div class="nexus-wave-bar" style="animation-delay:${i*0.07}s;height:${Math.floor(Math.random()*28+6)}px;"></div>
                    `).join('')}
                </div>
            </div>

            <!-- Bottom Controls — Glassmorphism -->
            <div class="nexus-call-controls">
                <!-- Glass panel -->
                <div class="nexus-glass-panel">

                    <!-- Row 1: Mute + Speaker -->
                    <div class="nexus-controls-row">
                        <div class="nexus-ctrl-item">
                            <div class="nexus-ctrl-btn" id="nexus-mute-btn" onclick="NexusCall.toggleMute()">
                                <svg class="mute-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                            </div>
                            <span class="nexus-ctrl-label">Mute</span>
                        </div>

                        <div class="nexus-ctrl-item">
                            <div class="nexus-ctrl-btn" id="nexus-speaker-btn" onclick="NexusCall.toggleSpeaker()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                </svg>
                            </div>
                            <span class="nexus-ctrl-label">Speaker</span>
                        </div>

                        <div class="nexus-ctrl-item">
                            <div class="nexus-ctrl-btn" onclick="NexusCall.addNote()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="12" y1="18" x2="12" y2="12"/>
                                    <line x1="9" y1="15" x2="15" y2="15"/>
                                </svg>
                            </div>
                            <span class="nexus-ctrl-label">Note</span>
                        </div>
                    </div>

                    <!-- End call -->
                    <div class="nexus-end-row">
                        <div class="nexus-end-btn" onclick="NexusCall.hangUp()">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                                <line x1="1" y1="1" x2="23" y2="23"/>
                                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.03 18.81a16.18 16.18 0 0 0 7.94 0"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(el);
    }

    function updateCallStatus(text, showTimer = false) {
        const s = document.getElementById('nexus-call-status');
        const t = document.getElementById('nexus-call-timer');
        const w = document.getElementById('nexus-waveform');
        if (s) s.textContent = text;
        if (t) t.style.display = showTimer ? 'block' : 'none';
        if (showTimer && s) s.style.display = 'none';
        if (showTimer && w) w.style.opacity = '1';
    }

    function hideCallUI() {
        const el = document.getElementById('nexus-active-call');
        if (el) {
            el.style.animation = 'slideDown 0.4s ease forwards';
            setTimeout(() => el.remove(), 400);
        }
        isMuted = false; isSpeaker = false;
    }

    function toggleMute() {
        if (!localStream) return;
        isMuted = !isMuted;
        localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
        const btn = document.getElementById('nexus-mute-btn');
        if (btn) {
            btn.classList.toggle('nexus-ctrl-active', isMuted);
            btn.querySelector('.mute-icon').innerHTML = isMuted
                ? '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><line x1="1" y1="1" x2="23" y2="23" stroke-width="2"/>'
                : '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>';
        }
    }

    function toggleSpeaker() {
        isSpeaker = !isSpeaker;
        const btn = document.getElementById('nexus-speaker-btn');
        if (btn) btn.classList.toggle('nexus-ctrl-active', isSpeaker);
    }

    function addNote() {
        // Future feature placeholder
    }

    function startCallTimer() {
        stopCallTimer();
        callSeconds = 0;
        callTimerInterval = setInterval(() => {
            callSeconds++;
            const m = String(Math.floor(callSeconds/60)).padStart(2,'0');
            const s = String(callSeconds%60).padStart(2,'0');
            const el = document.getElementById('nexus-call-timer');
            if (el) el.textContent = `${m}:${s}`;
        }, 1000);
    }

    function stopCallTimer() {
        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    }

    // ══════════════════════════════════════════════
    //  CSS — Full World Class Design
    // ══════════════════════════════════════════════
    function injectCSS() {
        if (document.getElementById('nexus-call-css')) return;
        const style = document.createElement('style');
        style.id = 'nexus-call-css';
        style.textContent = `
            /* ── Base ── */
            .nexus-incoming-wrap,
            .nexus-call-wrap {
                position: fixed; inset: 0; z-index: 99999;
                display: flex; flex-direction: column;
                align-items: center; justify-content: space-between;
                overflow: hidden;
                animation: nexusSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            /* ── Background blur ── */
            .nexus-bg-blur {
                position: absolute; inset: -20px;
                background-size: cover; background-position: center;
                filter: blur(40px) saturate(1.8) brightness(0.35);
                transform: scale(1.1);
                z-index: 0;
            }
            .nexus-bg-overlay {
                position: absolute; inset: 0;
                background: linear-gradient(
                    180deg,
                    rgba(0,0,0,0.3) 0%,
                    rgba(0,0,0,0.1) 30%,
                    rgba(0,0,0,0.1) 60%,
                    rgba(0,0,0,0.7) 100%
                );
                z-index: 1;
            }

            /* ── Incoming — Top ── */
            .nexus-incoming-top {
                position: relative; z-index: 2;
                text-align: center;
                padding-top: 60px;
            }
            .nexus-incoming-label {
                font-size: 13px;
                color: rgba(255,255,255,0.6);
                letter-spacing: 3px;
                text-transform: uppercase;
                margin-bottom: 10px;
                font-family: -apple-system, sans-serif;
            }
            .nexus-incoming-name {
                font-size: 36px;
                font-weight: 700;
                color: #fff;
                letter-spacing: -1px;
                font-family: -apple-system, sans-serif;
                text-shadow: 0 2px 20px rgba(0,0,0,0.5);
            }
            .nexus-incoming-sub {
                font-size: 14px;
                color: rgba(255,255,255,0.5);
                margin-top: 6px;
                font-family: -apple-system, sans-serif;
            }

            /* ── Avatar rings ── */
            .nexus-avatar-rings {
                position: relative; z-index: 2;
                width: 140px; height: 140px;
                display: flex; align-items: center; justify-content: center;
            }
            .nexus-ring {
                position: absolute; border-radius: 50%;
                border: 1.5px solid rgba(255,255,255,0.2);
            }
            .nexus-ring-1 { width: 140px; height: 140px; animation: ringPulse 2s ease-in-out infinite; }
            .nexus-ring-2 { width: 170px; height: 170px; animation: ringPulse 2s ease-in-out infinite 0.4s; }
            .nexus-ring-3 { width: 200px; height: 200px; animation: ringPulse 2s ease-in-out infinite 0.8s; }
            .nexus-avatar-circle {
                width: 120px; height: 120px; border-radius: 50%;
                overflow: hidden;
                border: 3px solid rgba(255,255,255,0.4);
                box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 20px 60px rgba(0,0,0,0.5);
                position: relative; z-index: 3;
            }
            .nexus-avatar-circle img { width: 100%; height: 100%; object-fit: cover; }

            /* ── Incoming Actions ── */
            .nexus-incoming-actions {
                position: relative; z-index: 2;
                display: flex; justify-content: space-around;
                width: 100%; padding: 0 30px 60px;
                gap: 10px;
            }
            .nexus-action-wrap { text-align: center; }
            .nexus-action-btn {
                width: 72px; height: 72px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; margin: 0 auto 10px;
                transition: transform 0.15s, box-shadow 0.15s;
                backdrop-filter: blur(20px);
            }
            .nexus-action-btn:active { transform: scale(0.92); }
            .nexus-decline {
                background: rgba(255,59,48,0.85);
                box-shadow: 0 8px 30px rgba(255,59,48,0.5);
            }
            .nexus-remind {
                background: rgba(255,255,255,0.15);
                border: 1px solid rgba(255,255,255,0.2);
                box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            }
            .nexus-accept {
                background: rgba(52,199,89,0.85);
                box-shadow: 0 8px 30px rgba(52,199,89,0.5);
                animation: acceptPulse 1.5s ease-in-out infinite;
            }
            .nexus-action-label {
                font-size: 12px; color: rgba(255,255,255,0.7);
                font-family: -apple-system, sans-serif;
                font-weight: 500;
            }

            /* ── Active Call — Top bar ── */
            .nexus-call-topbar {
                position: relative; z-index: 2;
                width: 100%; padding: 55px 20px 0;
                display: flex; align-items: center; justify-content: space-between;
            }
            .nexus-call-type-badge {
                display: flex; align-items: center; gap: 6px;
                background: rgba(255,255,255,0.12);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 20px; padding: 6px 14px;
                font-size: 12px; color: rgba(255,255,255,0.8);
                font-family: -apple-system, sans-serif;
            }
            .nexus-timer {
                font-size: 16px; font-weight: 600; color: #fff;
                font-family: -apple-system, sans-serif;
                letter-spacing: 1px;
            }

            /* ── Active Call — Center ── */
            .nexus-call-center {
                position: relative; z-index: 2;
                text-align: center;
                display: flex; flex-direction: column; align-items: center;
                gap: 8px;
            }
            .nexus-call-avatar-wrap {
                position: relative;
                width: 130px; height: 130px;
                display: flex; align-items: center; justify-content: center;
                margin-bottom: 8px;
            }
            .nexus-call-ring {
                position: absolute; border-radius: 50%;
                border: 1px solid rgba(255,255,255,0.15);
            }
            .nexus-call-ring.r1 { width: 130px; height: 130px; animation: ringPulse 2.5s ease-in-out infinite; }
            .nexus-call-ring.r2 { width: 160px; height: 160px; animation: ringPulse 2.5s ease-in-out infinite 0.6s; }
            .nexus-call-avatar {
                width: 110px; height: 110px; border-radius: 50%;
                overflow: hidden;
                border: 2.5px solid rgba(255,255,255,0.35);
                box-shadow: 0 20px 60px rgba(0,0,0,0.4);
                position: relative; z-index: 2;
            }
            .nexus-call-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .nexus-call-name {
                font-size: 30px; font-weight: 700; color: #fff;
                letter-spacing: -0.8px;
                font-family: -apple-system, sans-serif;
                text-shadow: 0 2px 20px rgba(0,0,0,0.4);
            }
            .nexus-call-status {
                font-size: 15px; color: rgba(255,255,255,0.6);
                font-family: -apple-system, sans-serif;
            }

            /* ── Waveform ── */
            .nexus-waveform {
                display: flex; align-items: center; gap: 3px;
                height: 40px; opacity: 0;
                transition: opacity 0.5s;
                margin-top: 8px;
            }
            .nexus-wave-bar {
                width: 3px; border-radius: 3px;
                background: rgba(255,255,255,0.7);
                animation: waveAnim 1.3s ease-in-out infinite;
            }

            /* ── Controls — Glassmorphism ── */
            .nexus-call-controls {
                position: relative; z-index: 2;
                width: 100%; padding: 0 16px 40px;
            }
            .nexus-glass-panel {
                background: rgba(255,255,255,0.08);
                backdrop-filter: blur(30px);
                -webkit-backdrop-filter: blur(30px);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 28px;
                padding: 20px 16px;
                box-shadow: 0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
            }
            .nexus-controls-row {
                display: flex; justify-content: space-around;
                margin-bottom: 20px;
            }
            .nexus-ctrl-item { text-align: center; }
            .nexus-ctrl-btn {
                width: 58px; height: 58px; border-radius: 50%;
                background: rgba(255,255,255,0.12);
                border: 1px solid rgba(255,255,255,0.15);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; margin: 0 auto 8px;
                transition: all 0.2s;
                backdrop-filter: blur(10px);
            }
            .nexus-ctrl-btn:active { transform: scale(0.9); }
            .nexus-ctrl-btn.nexus-ctrl-active {
                background: rgba(255,255,255,0.25);
                border-color: rgba(255,255,255,0.4);
                box-shadow: 0 0 20px rgba(255,255,255,0.1);
            }
            .nexus-ctrl-label {
                font-size: 11px; color: rgba(255,255,255,0.6);
                font-family: -apple-system, sans-serif;
                font-weight: 500;
            }
            .nexus-end-row { display: flex; justify-content: center; }
            .nexus-end-btn {
                width: 70px; height: 70px; border-radius: 50%;
                background: #ff3b30;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer;
                box-shadow: 0 8px 30px rgba(255,59,48,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
                transition: transform 0.15s, box-shadow 0.15s;
            }
            .nexus-end-btn:active {
                transform: scale(0.92);
                box-shadow: 0 4px 15px rgba(255,59,48,0.4);
            }

            /* ── Animations ── */
            @keyframes nexusSlideUp {
                from { opacity: 0; transform: translateY(100%); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideDown {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(100%); }
            }
            @keyframes ringPulse {
                0%,100% { transform: scale(1); opacity: 0.4; }
                50% { transform: scale(1.08); opacity: 0.1; }
            }
            @keyframes acceptPulse {
                0%,100% { box-shadow: 0 8px 30px rgba(52,199,89,0.5); }
                50% { box-shadow: 0 8px 50px rgba(52,199,89,0.8), 0 0 0 10px rgba(52,199,89,0.1); }
            }
            @keyframes waveAnim {
                0%,100% { transform: scaleY(0.3); opacity: 0.5; }
                50% { transform: scaleY(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    /* ── Ringtone ── */
    let ringtoneCtx = null, ringtoneInterval = null;

    function playRingtone() {
        try {
            ringtoneCtx = new (window.AudioContext || window.webkitAudioContext)();
            const beep = () => {
                [0, 0.35].forEach(delay => {
                    const osc = ringtoneCtx.createOscillator();
                    const gain = ringtoneCtx.createGain();
                    osc.connect(gain); gain.connect(ringtoneCtx.destination);
                    osc.frequency.value = 480; osc.type = 'sine';
                    const t = ringtoneCtx.currentTime + delay;
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
                    gain.gain.linearRampToValueAtTime(0, t + 0.25);
                    osc.start(t); osc.stop(t + 0.3);
                });
            };
            beep();
            ringtoneInterval = setInterval(beep, 2200);
        } catch(e) {}
    }

    function stopRingtone() {
        if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
        if (ringtoneCtx) { ringtoneCtx.close().catch(()=>{}); ringtoneCtx = null; }
    }

    return {
        init: listenForIncomingCalls,
        startCall, answerCall, declineCall, hangUp,
        toggleMute, toggleSpeaker, addNote
    };

})();

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && localStorage.getItem('nexus_user_session')) {
        NexusCall.init();
    }
});
