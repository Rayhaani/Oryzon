// ═══════════════════════════════════════════════════
//  NEXUS WebRTC Voice Call Engine v3
//  Trickle ICE + Echo Cancellation + Setup Audio Fix
// ═══════════════════════════════════════════════════

const NexusCall = (() => {

    let pc = null;
    let localStream = null;
    let callDocRef = null;
    let callUnsub = null;
    let callTimerInterval = null;
    let callSeconds = 0;
    let isMuted = false;
    let isSpeaker = false;
    let callRole = null;
    let currentCallId = null;

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

    // ─── Audio setup tare da echo cancellation ────
    function setupAudio(stream) {
        let audio = document.getElementById('nexus-remote-audio');
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = 'nexus-remote-audio';
            audio.autoplay = true;
            audio.playsInline = true;
            document.body.appendChild(audio);
        }
        audio.srcObject = stream;
        audio.play().catch(() => {});
    }

    // ─── Mic tare da echo/noise cancellation ─────
    async function getMic() {
        return navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: false
        });
    }

    // ─── Trickle ICE - saurari candidates ─────────
    function listenCandidates(subcollection) {
        callDocRef.collection(subcollection).onSnapshot(snap => {
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
    //  CALLER - Fara Kira
    // ══════════════════════════════════════════════
    async function startCall(calleeId) {
        const myId = getMyId();
        if (!myId) return;

        callRole = 'caller';
        currentCallId = [myId, calleeId].sort().join('__') + '_call';
        callDocRef = getDB().collection('nexusCalls').doc(currentCallId);

        // Tsaftace tsohon kira
        try { await callDocRef.update({ status: 'ended' }); } catch(e) {}

        showCallUI({
            name: document.getElementById('chat-header-name')?.textContent || calleeId,
            avatar: document.getElementById('chat-header-avatar')?.src || '',
            status: 'Calling...',
            isCaller: true
        });

        try {
            localStream = await getMic();
            pc = new RTCPeerConnection(iceConfig);
            localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

            pc.ontrack = e => setupAudio(e.streams[0]);

            // Trickle ICE - aika kowace candidate nan da nan
            pc.onicecandidate = e => {
                if (e.candidate) {
                    callDocRef.collection('callerCandidates').add(e.candidate.toJSON());
                }
            };

            // Watch connection state
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') {
                    updateCallStatus('Connected', true);
                    startCallTimer();
                } else if (['failed','disconnected'].includes(pc.connectionState)) {
                    endCallCleanup('Call Ended');
                }
            };

            // Create & aika offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await callDocRef.set({
                callerId: myId,
                calleeId: calleeId,
                offer: { type: offer.type, sdp: offer.sdp },
                status: 'ringing',
                createdAt: Date.now()
            });

            // Jira answer + saurari status changes
            callUnsub = callDocRef.onSnapshot(async snap => {
                const data = snap.data();
                if (!data) return;

                if (data.answer && !pc.currentRemoteDescription) {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                        listenCandidates('calleeCandidates');
                    } catch(e) { console.error(e); }
                }

                if (data.status === 'declined') endCallCleanup('Declined');
                if (data.status === 'ended') endCallCleanup();
            });

            // Timeout 45s
            setTimeout(() => {
                if (callRole !== 'caller' || !callDocRef) return;
                callDocRef.get().then(s => {
                    if (s.exists && s.data()?.status === 'ringing') {
                        callDocRef.update({ status: 'missed' });
                        endCallCleanup('No Answer');
                    }
                });
            }, 45000);

        } catch (err) {
            console.error('startCall:', err);
            endCallCleanup(err.name === 'NotAllowedError' ? 'Mic Permission Denied' : 'Call Failed');
        }
    }

    // ══════════════════════════════════════════════
    //  CALLEE - Amsa Kira
    // ══════════════════════════════════════════════
    async function answerCall(docId, callerName, callerAvatar) {
        callRole = 'callee';
        currentCallId = docId;
        callDocRef = getDB().collection('nexusCalls').doc(docId);

        hideIncomingCallUI();
        showCallUI({
            name: callerName,
            avatar: callerAvatar,
            status: 'Connecting...',
            isCaller: false
        });

        try {
            localStream = await getMic();
            pc = new RTCPeerConnection(iceConfig);
            localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

            pc.ontrack = e => setupAudio(e.streams[0]);

            // Trickle ICE
            pc.onicecandidate = e => {
                if (e.candidate) {
                    callDocRef.collection('calleeCandidates').add(e.candidate.toJSON());
                }
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') {
                    updateCallStatus('Connected', true);
                    startCallTimer();
                } else if (['failed','disconnected'].includes(pc.connectionState)) {
                    endCallCleanup('Call Ended');
                }
            };

            // Karbi offer
            const callData = (await callDocRef.get()).data();
            if (!callData) { endCallCleanup('Call Not Found'); return; }

            await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

            // Saurari caller candidates
            listenCandidates('callerCandidates');

            // Create & aika answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await callDocRef.update({
                answer: { type: answer.type, sdp: answer.sdp },
                status: 'answered'
            });

            // Saurari hang up
            callUnsub = callDocRef.onSnapshot(snap => {
                if (snap.data()?.status === 'ended') endCallCleanup();
            });

        } catch (err) {
            console.error('answerCall:', err);
            endCallCleanup('Answer Failed');
        }
    }

    // ══════════════════════════════════════════════
    //  LISTEN FOR INCOMING CALLS
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
                            showIncomingCallUI({
                                callerId: data.callerId,
                                docId: change.doc.id
                            });
                        }
                    }
                });
            });
    }

    // ══════════════════════════════════════════════
    //  DECLINE / HANG UP
    // ══════════════════════════════════════════════
    function declineCall(docId) {
        getDB().collection('nexusCalls').doc(docId)
            .update({ status: 'declined' }).catch(() => {});
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
        const audio = document.getElementById('nexus-remote-audio');
        if (audio) audio.remove();
        stopCallTimer();
        callDocRef = null;
        callRole = null;
        if (msg) updateCallStatus(msg);
        setTimeout(() => hideCallUI(), msg ? 2000 : 0);
    }

    // ══════════════════════════════════════════════
    //  UI - INCOMING CALL
    // ══════════════════════════════════════════════
    function showIncomingCallUI({ callerId, docId }) {
        if (document.getElementById('nexus-active-call')) return;
        if (document.getElementById('nexus-incoming-call')) return;

        getDB().collection('users').doc(callerId).get().then(doc => {
            const name = doc.exists
                ? (doc.data().fullName || doc.data().username || callerId)
                : callerId;
            const avatar = doc.exists && doc.data().userProfilePic
                ? doc.data().userProfilePic
                : `https://api.dicebear.com/7.x/bottts/svg?seed=${callerId}`;

            injectCallCSS();
            const el = document.createElement('div');
            el.id = 'nexus-incoming-call';
            el.innerHTML = `
                <div style="
                    position:fixed;inset:0;z-index:99999;
                    background:rgba(0,0,0,0.92);
                    backdrop-filter:blur(24px);
                    display:flex;flex-direction:column;
                    align-items:center;justify-content:center;
                    gap:20px;animation:fadeInUp 0.3s ease;
                ">
                    <div style="
                        width:100px;height:100px;border-radius:50%;
                        border:3px solid #00F2FF;overflow:hidden;
                        animation:pulse-ring 1.5s ease-in-out infinite;
                        box-shadow:0 0 40px rgba(0,242,255,0.3);
                    ">
                        <img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:#fff;font-family:'Inter',sans-serif;">${name}</div>
                        <div style="font-size:12px;color:#00F2FF;margin-top:6px;letter-spacing:3px;text-transform:uppercase;">Incoming Call</div>
                    </div>
                    <div style="display:flex;gap:50px;margin-top:16px;">
                        <div style="text-align:center;">
                            <div onclick="NexusCall.declineCall('${docId}')" style="
                                width:68px;height:68px;border-radius:50%;
                                background:linear-gradient(135deg,#ff4444,#cc0000);
                                display:flex;align-items:center;justify-content:center;
                                cursor:pointer;margin:0 auto 8px;
                                box-shadow:0 4px 20px rgba(255,68,68,0.5);
                                transition:transform 0.15s;
                            " onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                                </svg>
                            </div>
                            <div style="color:#aaa;font-size:12px;">Decline</div>
                        </div>
                        <div style="text-align:center;">
                            <div onclick="NexusCall.answerCall('${docId}','${name}','${avatar}')" style="
                                width:68px;height:68px;border-radius:50%;
                                background:linear-gradient(135deg,#00F2FF,#0072FF);
                                display:flex;align-items:center;justify-content:center;
                                cursor:pointer;margin:0 auto 8px;
                                box-shadow:0 4px 20px rgba(0,242,255,0.5);
                                transition:transform 0.15s;
                                animation:bounce-accept 1s ease-in-out infinite;
                            " onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.79a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                            </div>
                            <div style="color:#00F2FF;font-size:12px;">Accept</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(el);
            playRingtone();

            // Auto-dismiss idan kiran ya ƙare
            getDB().collection('nexusCalls').doc(docId).onSnapshot(snap => {
                const d = snap.data();
                if (d && ['missed','ended','declined'].includes(d.status)) {
                    hideIncomingCallUI();
                }
            });
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
        if (document.getElementById('nexus-active-call')) return;
        injectCallCSS();

        const bars = Array.from({length: 14}, (_, i) => `
            <div style="
                width:3px;border-radius:3px;
                background:rgba(0,242,255,0.6);
                animation:wave-bar 1.4s ease-in-out infinite;
                animation-delay:${i * 0.09}s;
                height:${Math.floor(Math.random() * 28 + 10)}px;
            "></div>
        `).join('');

        const el = document.createElement('div');
        el.id = 'nexus-active-call';
        el.innerHTML = `
            <div style="
                position:fixed;inset:0;z-index:99998;
                background:linear-gradient(180deg,#0a1628 0%,#050505 100%);
                display:flex;flex-direction:column;
                align-items:center;justify-content:space-between;
                padding:70px 20px 55px;
                animation:fadeInUp 0.3s ease;
            ">
                <div style="text-align:center;">
                    <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:4px;text-transform:uppercase;margin-bottom:24px;">
                        ${isCaller ? '📞 Calling' : '🎙️ Audio Call'}
                    </div>
                    <div style="position:relative;width:120px;height:120px;margin:0 auto 20px;">
                        <div style="position:absolute;inset:-14px;border-radius:50%;border:2px solid rgba(0,242,255,0.15);animation:voice-pulse 2s ease-in-out infinite;"></div>
                        <div style="position:absolute;inset:-7px;border-radius:50%;border:2px solid rgba(0,242,255,0.25);animation:voice-pulse 2s ease-in-out infinite 0.6s;"></div>
                        <div style="width:120px;height:120px;border-radius:50%;border:3px solid rgba(0,242,255,0.6);overflow:hidden;box-shadow:0 0 30px rgba(0,242,255,0.2);">
                            <img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">
                        </div>
                    </div>
                    <div style="font-size:26px;font-weight:700;color:#fff;margin-bottom:10px;">${name}</div>
                    <div id="nexus-call-status" style="font-size:14px;color:#00F2FF;">${status}</div>
                    <div id="nexus-call-timer" style="
                        font-size:20px;color:#fff;margin-top:10px;
                        font-family:'Orbitron',monospace;letter-spacing:3px;display:none;
                    ">00:00</div>
                </div>

                <div style="display:flex;align-items:center;gap:5px;height:44px;">${bars}</div>

                <div style="width:100%;max-width:300px;">
                    <div style="display:flex;justify-content:space-around;margin-bottom:36px;">
                        <div style="text-align:center;">
                            <div id="nexus-mute-btn" onclick="NexusCall.toggleMute()" style="
                                width:60px;height:60px;border-radius:50%;
                                background:rgba(255,255,255,0.1);
                                border:1px solid rgba(255,255,255,0.15);
                                display:flex;align-items:center;justify-content:center;
                                cursor:pointer;margin:0 auto 8px;transition:background 0.2s;
                            ">
                                <svg class="mute-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                            </div>
                            <div style="color:#888;font-size:11px;">Mute</div>
                        </div>
                        <div style="text-align:center;">
                            <div id="nexus-speaker-btn" onclick="NexusCall.toggleSpeaker()" style="
                                width:60px;height:60px;border-radius:50%;
                                background:rgba(255,255,255,0.1);
                                border:1px solid rgba(255,255,255,0.15);
                                display:flex;align-items:center;justify-content:center;
                                cursor:pointer;margin:0 auto 8px;transition:background 0.2s;
                            ">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                </svg>
                            </div>
                            <div style="color:#888;font-size:11px;">Speaker</div>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:center;">
                        <div onclick="NexusCall.hangUp()" style="
                            width:76px;height:76px;border-radius:50%;
                            background:linear-gradient(135deg,#ff4444,#cc0000);
                            display:flex;align-items:center;justify-content:center;
                            cursor:pointer;
                            box-shadow:0 6px 30px rgba(255,68,68,0.5);
                            transition:transform 0.15s;
                        " onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                                <line x1="1" y1="1" x2="23" y2="23"/>
                                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.03 18.81a16.18 16.18 0 0 0 7.94 0"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
    }

    function updateCallStatus(text, showTimer = false) {
        const s = document.getElementById('nexus-call-status');
        const t = document.getElementById('nexus-call-timer');
        if (s) s.textContent = text;
        if (t) t.style.display = showTimer ? 'block' : 'none';
    }

    function hideCallUI() {
        const el = document.getElementById('nexus-active-call');
        if (el) el.remove();
        isMuted = false;
        isSpeaker = false;
    }

    // ══════════════════════════════════════════════
    //  CONTROLS
    // ══════════════════════════════════════════════
    function toggleMute() {
        if (!localStream) return;
        isMuted = !isMuted;
        localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
        const btn = document.getElementById('nexus-mute-btn');
        if (btn) {
            btn.style.background = isMuted ? 'rgba(255,80,80,0.25)' : 'rgba(255,255,255,0.1)';
            btn.querySelector('.mute-icon').innerHTML = isMuted
                ? '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="#ff5050"/><line x1="1" y1="1" x2="23" y2="23" stroke="#ff5050" stroke-width="2"/>'
                : '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>';
        }
    }

    function toggleSpeaker() {
        isSpeaker = !isSpeaker;
        const btn = document.getElementById('nexus-speaker-btn');
        if (btn) btn.style.background = isSpeaker ? 'rgba(0,242,255,0.2)' : 'rgba(255,255,255,0.1)';
    }

    function startCallTimer() {
        stopCallTimer();
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

    // ══════════════════════════════════════════════
    //  CSS
    // ══════════════════════════════════════════════
    function injectCallCSS() {
        if (document.getElementById('nexus-call-css')) return;
        const style = document.createElement('style');
        style.id = 'nexus-call-css';
        style.textContent = `
            @keyframes fadeInUp {
                from { opacity:0; transform:translateY(40px); }
                to { opacity:1; transform:translateY(0); }
            }
            @keyframes pulse-ring {
                0%,100% { box-shadow:0 0 0 0 rgba(0,242,255,0.5),0 0 30px rgba(0,242,255,0.3); }
                50% { box-shadow:0 0 0 18px rgba(0,242,255,0),0 0 20px rgba(0,242,255,0.1); }
            }
            @keyframes bounce-accept {
                0%,100% { transform:scale(1); }
                50% { transform:scale(1.1); }
            }
            @keyframes wave-bar {
                0%,100% { transform:scaleY(0.3); opacity:0.4; }
                50% { transform:scaleY(1); opacity:1; }
            }
            @keyframes voice-pulse {
                0%,100% { transform:scale(1); opacity:0.5; }
                50% { transform:scale(1.2); opacity:0; }
            }
        `;
        document.head.appendChild(style);
    }

    // ══════════════════════════════════════════════
    //  RINGTONE
    // ══════════════════════════════════════════════
    let ringtoneCtx = null;
    let ringtoneInterval = null;

    function playRingtone() {
        try {
            ringtoneCtx = new (window.AudioContext || window.webkitAudioContext)();
            const beep = () => {
                [0, 0.35].forEach(delay => {
                    const osc = ringtoneCtx.createOscillator();
                    const gain = ringtoneCtx.createGain();
                    osc.connect(gain);
                    gain.connect(ringtoneCtx.destination);
                    osc.frequency.value = 480;
                    osc.type = 'sine';
                    const t = ringtoneCtx.currentTime + delay;
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
                    gain.gain.linearRampToValueAtTime(0, t + 0.25);
                    osc.start(t);
                    osc.stop(t + 0.3);
                });
            };
            beep();
            ringtoneInterval = setInterval(beep, 2200);
        } catch(e) {}
    }

    function stopRingtone() {
        if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
        if (ringtoneCtx) { ringtoneCtx.close().catch(() => {}); ringtoneCtx = null; }
    }

    // ══════════════════════════════════════════════
    //  PUBLIC API
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

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && localStorage.getItem('nexus_user_session')) {
        NexusCall.init();
    }
});
