// ═══════════════════════════════════════════════════
//  NEXUS AR Effects Engine — Face-tracking (lazy-loaded)
//  MediaPipe FaceLandmarker (Google, kyauta, browser-side).
//  Kamar Filters/Background, ana "baking" overlay a canvas
//  sannan a replaceTrack domin DAYAN BANGAREN MA ya gani.
// ═══════════════════════════════════════════════════
const NexusVideoAR = (() => {

    let canvas = null, ctx = null, rafId = null;
    let sourceVideoEl = null;
    let outputStream = null;
    let faceLandmarker = null;
    let mediapipeLoaded = false;
    let currentEffectId = 'none';
    let lastVideoTime = -1;
    let particleTick = 0;

    const EFFECTS = [
        { id: 'none',      label: 'None',    premium: false },
        { id: 'catears',   label: 'Cat Ears', premium: false },
        { id: 'glasses',   label: 'Glasses', premium: false },
        { id: 'hearts',    label: 'Hearts',  premium: false },
        { id: 'halo',      label: 'Halo',    premium: true  },
        { id: 'fireflies', label: 'Fireflies', premium: true },
        { id: 'confetti',  label: 'Confetti', premium: true },
        { id: 'robot',     label: 'Robot',   premium: true  },
    ];

    function isPremium() {
        return !!(window.NexusUser && window.NexusUser.isPremium) || localStorage.getItem('nexus_is_premium') === 'true';
    }
    function getEffects() { return EFFECTS; }

    function loadMediapipe() {
        if (mediapipeLoaded && typeof FaceLandmarker !== 'undefined') return Promise.resolve();
        return new Promise((resolve, reject) => {
            if (document.querySelector('script[data-nexus-ar-mp]')) { mediapipeLoaded = true; resolve(); return; }
            const s = document.createElement('script');
            s.type = 'module';
            s.dataset.nexusArMp = '1';
            s.textContent = `
                import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
                window.__NexusFaceLandmarkerLib = { FaceLandmarker, FilesetResolver };
                window.dispatchEvent(new Event('nexus-ar-mp-ready'));
            `;
            document.body.appendChild(s);
            window.addEventListener('nexus-ar-mp-ready', () => { mediapipeLoaded = true; resolve(); }, { once: true });
            setTimeout(() => { if (!mediapipeLoaded) reject(new Error('MediaPipe FaceLandmarker timeout')); }, 10000);
        });
    }

    async function startProcessing(videoEl) {
        await loadMediapipe();
        sourceVideoEl = videoEl;
        canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        ctx = canvas.getContext('2d');

        if (!faceLandmarker) {
            const { FaceLandmarker, FilesetResolver } = window.__NexusFaceLandmarkerLib;
            const filesetResolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
            );
            faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                outputFaceBlendshapes: false,
                runningMode: "VIDEO",
                numFaces: 1
            });
        }

        outputStream = canvas.captureStream(30);
        drawLoop();
        return outputStream;
    }

    function drawLoop() {
        if (!canvas || !sourceVideoEl) return;
        if (sourceVideoEl.readyState < 2) { rafId = requestAnimationFrame(drawLoop); return; }
        if (sourceVideoEl.videoWidth && canvas.width !== sourceVideoEl.videoWidth) {
            canvas.width = sourceVideoEl.videoWidth;
            canvas.height = sourceVideoEl.videoHeight;
        }
        ctx.drawImage(sourceVideoEl, 0, 0, canvas.width, canvas.height);

        if (currentEffectId !== 'none' && faceLandmarker && sourceVideoEl.currentTime !== lastVideoTime) {
            lastVideoTime = sourceVideoEl.currentTime;
            const result = faceLandmarker.detectForVideo(sourceVideoEl, performance.now());
            if (result.faceLandmarks && result.faceLandmarks.length) {
                drawEffect(result.faceLandmarks[0]);
            }
        }
        particleTick++;
        rafId = requestAnimationFrame(drawLoop);
    }

    // Landmark indices masu amfani: 10=goshi/sama, 234=kunnen hagu,
    // 454=kunnen dama, 168=tsakiyar idanu (glasses bridge), 4=hanci
    function lm(landmarks, i) {
        return { x: landmarks[i].x * canvas.width, y: landmarks[i].y * canvas.height };
    }

    function drawEffect(landmarks) {
        const faceWidth = Math.hypot(
            lm(landmarks, 454).x - lm(landmarks, 234).x,
            lm(landmarks, 454).y - lm(landmarks, 234).y
        );
        const wobble = Math.sin(particleTick / 12) * (faceWidth * 0.02); // physics-based motion mai sauki

        if (currentEffectId === 'catears') {
            const left = lm(landmarks, 234), right = lm(landmarks, 454), top = lm(landmarks, 10);
            drawEar(top.x - faceWidth * 0.3, top.y - faceWidth * 0.25 + wobble, faceWidth * 0.28);
            drawEar(top.x + faceWidth * 0.3, top.y - faceWidth * 0.25 - wobble, faceWidth * 0.28);
        } else if (currentEffectId === 'glasses') {
            const bridge = lm(landmarks, 168);
            const leftEye = lm(landmarks, 234), rightEye = lm(landmarks, 454);
            drawGlasses(bridge.x, bridge.y, faceWidth * 0.9, Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x));
        } else if (currentEffectId === 'hearts') {
            drawFloatingShapes('💕', faceWidth, lm(landmarks, 10));
        } else if (currentEffectId === 'halo') {
            const top = lm(landmarks, 10);
            drawHalo(top.x, top.y - faceWidth * 0.55 + wobble, faceWidth * 0.55);
        } else if (currentEffectId === 'fireflies') {
            drawFloatingShapes('✨', faceWidth * 1.4, lm(landmarks, 168), true);
        } else if (currentEffectId === 'confetti') {
            drawFloatingShapes('🎉', faceWidth * 1.6, lm(landmarks, 10), true);
        } else if (currentEffectId === 'robot') {
            const bridge = lm(landmarks, 168);
            drawGlasses(bridge.x, bridge.y, faceWidth * 0.95, 0, '#00e5ff');
        }
    }

    function drawEar(x, y, r) {
        ctx.save();
        ctx.fillStyle = '#3a2a20';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8a0a0';
        ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function drawGlasses(cx, cy, w, angle, color = 'rgba(20,20,20,0.85)') {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(angle);
        ctx.strokeStyle = color; ctx.lineWidth = w * 0.045; ctx.lineCap = 'round';
        const lensR = w * 0.22;
        ctx.beginPath(); ctx.arc(-w * 0.27, 0, lensR, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(w * 0.27, 0, lensR, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-w * 0.05, 0); ctx.lineTo(w * 0.05, 0); ctx.stroke();
        ctx.restore();
    }

    function drawHalo(cx, cy, r) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,230,150,0.9)';
        ctx.lineWidth = r * 0.08;
        ctx.shadowColor = '#ffe696'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    function drawFloatingShapes(emoji, spread, origin, orbit = false) {
        ctx.save();
        ctx.font = `${Math.max(16, spread * 0.12)}px sans-serif`;
        ctx.textAlign = 'center';
        for (let i = 0; i < 5; i++) {
            const t = particleTick / 20 + i * 1.3;
            const ox = orbit ? Math.cos(t) * spread * 0.55 : (i - 2) * spread * 0.22;
            const oy = orbit ? Math.sin(t) * spread * 0.35 - spread * 0.15 : -spread * 0.3 - (particleTick % 60) * (spread * 0.006) + i * 6;
            ctx.fillText(emoji, origin.x + ox, origin.y + oy);
        }
        ctx.restore();
    }

    function stopProcessing() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null; sourceVideoEl = null; canvas = null; ctx = null;
        outputStream = null; currentEffectId = 'none'; lastVideoTime = -1;
    }

    async function applyEffect(effectId, pc) {
        const eff = EFFECTS.find(e => e.id === effectId);
        if (!eff) return false;
        if (eff.premium && !isPremium()) return 'premium_locked';
        currentEffectId = effectId;
        if (pc && outputStream) {
            const newTrack = outputStream.getVideoTracks()[0];
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) await sender.replaceTrack(newTrack);
        }
        localStorage.setItem('nexus_last_video_ar', effectId);
        return true;
    }

    return { getEffects, startProcessing, stopProcessing, applyEffect, isPremium };

})();
