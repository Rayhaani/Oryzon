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
        { id: 'none',      label: 'None',     premium: false },
        { id: 'catears',   label: 'Cat Ears', premium: false },
        { id: 'bunnyears', label: 'Bunny',    premium: false },
        { id: 'glasses',   label: 'Glasses',  premium: false },
        { id: 'hearts',    label: 'Hearts',   premium: false },
        { id: 'halo',      label: 'Halo',     premium: false },
        { id: 'fireflies', label: 'Fireflies', premium: false },
        { id: 'confetti',  label: 'Confetti', premium: false },
        { id: 'robot',     label: 'Robot',    premium: false },
        { id: 'blush',     label: 'Blush',    premium: false },
        { id: 'stareyes',  label: 'Star Eyes', premium: false },
        { id: 'crown',     label: 'Crown',    premium: false },
        { id: 'mustache',  label: 'Mustache', premium: false },
        { id: 'freckles',  label: 'Freckles', premium: false },
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

  let hiddenVideo = null, startToken = 0, lastLandmarks = null;

async function startProcessing(videoEl, rawStream) {
    const token = ++startToken;
    const src = rawStream || videoEl.srcObject;
    await loadMediapipe();
    if (token !== startToken) return null;

    if (!faceLandmarker) {
        const { FaceLandmarker, FilesetResolver } = window.__NexusFaceLandmarkerLib;
        const fs = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const make = (delegate) => FaceLandmarker.createFromOptions(fs, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate
            },
            outputFaceBlendshapes: false, runningMode: "VIDEO", numFaces: 1
        });
        try { faceLandmarker = await make("GPU"); } catch (e) { faceLandmarker = await make("CPU"); }
        if (token !== startToken) return null;
    }

    const hv = document.createElement('video');
    hv.muted = true; hv.playsInline = true;
    hv.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    hv.srcObject = src;
    document.body.appendChild(hv);
    hiddenVideo = hv;
    await hv.play().catch(() => {});
    if (token !== startToken) { hv.remove(); return null; }

    sourceVideoEl = hv; lastLandmarks = null; lastVideoTime = -1;
    canvas = document.createElement('canvas');
    canvas.width = hv.videoWidth || 640; canvas.height = hv.videoHeight || 480;
    ctx = canvas.getContext('2d');
    outputStream = canvas.captureStream(30);
    drawLoop();
    return outputStream;
}

function drawLoop() {
    if (!canvas || !sourceVideoEl) return;
    if (sourceVideoEl.readyState < 2) { rafId = requestAnimationFrame(drawLoop); return; }
    const vw = sourceVideoEl.videoWidth, vh = sourceVideoEl.videoHeight;
    if (vw && (canvas.width !== vw || canvas.height !== vh)) { canvas.width = vw; canvas.height = vh; }
    ctx.drawImage(sourceVideoEl, 0, 0, canvas.width, canvas.height);

    if (currentEffectId !== 'none' && faceLandmarker) {
        if (sourceVideoEl.currentTime !== lastVideoTime) {
            lastVideoTime = sourceVideoEl.currentTime;
            try {
                const r = faceLandmarker.detectForVideo(sourceVideoEl, performance.now());
                lastLandmarks = (r.faceLandmarks && r.faceLandmarks.length) ? r.faceLandmarks[0] : null;
            } catch (e) { lastLandmarks = null; }
        }
        if (lastLandmarks) drawEffect(lastLandmarks); // ana zana a kowane frame — babu kiftawa
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
            const top = lm(landmarks, 10);
            drawEar(top.x - faceWidth * 0.3, top.y - faceWidth * 0.25 + wobble, faceWidth * 0.28, '#3a2a20', '#e8a0a0');
            drawEar(top.x + faceWidth * 0.3, top.y - faceWidth * 0.25 - wobble, faceWidth * 0.28, '#3a2a20', '#e8a0a0');
        } else if (currentEffectId === 'bunnyears') {
            const top = lm(landmarks, 10);
            drawLongEar(top.x - faceWidth * 0.22, top.y - faceWidth * 0.1, faceWidth * 0.16, faceWidth * 0.55, wobble);
            drawLongEar(top.x + faceWidth * 0.22, top.y - faceWidth * 0.1, faceWidth * 0.16, faceWidth * 0.55, -wobble);
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
        } else if (currentEffectId === 'blush') {
            const leftCheek = lm(landmarks, 234), rightCheek = lm(landmarks, 454);
            drawBlush(leftCheek.x + faceWidth * 0.15, leftCheek.y + faceWidth * 0.15, faceWidth * 0.12);
            drawBlush(rightCheek.x - faceWidth * 0.15, rightCheek.y + faceWidth * 0.15, faceWidth * 0.12);
        } else if (currentEffectId === 'stareyes') {
    [468, 473].forEach(i => drawEmojiAt('⭐', lm(landmarks, i), faceWidth * 0.22));
} else if (currentEffectId === 'crown') {
    const top = lm(landmarks, 10);
    drawEmojiAt('👑', { x: top.x, y: top.y - faceWidth * 0.3 + wobble }, faceWidth * 0.5);       
        } else if (currentEffectId === 'mustache') {
            const nose = lm(landmarks, 4);
            drawMustache(nose.x, nose.y + faceWidth * 0.12, faceWidth * 0.4);
        } else if (currentEffectId === 'freckles') {
            const nose = lm(landmarks, 4);
            drawFreckles(nose.x, nose.y, faceWidth * 0.45);
        }
    }

    function drawEar(x, y, r, outerColor, innerColor) {
            ctx.save();
        ctx.fillStyle = outerColor;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = innerColor;
        ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function drawLongEar(x, y, w, h, tilt) {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(tilt * 0.02);
        ctx.fillStyle = '#f3e5e5';
        ctx.beginPath(); ctx.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8a0b0';
        ctx.beginPath(); ctx.ellipse(0, -h / 2, w * 0.28, h * 0.38, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function drawBlush(x, y, r) {
        ctx.save();
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(255,120,150,0.55)');
        grad.addColorStop(1, 'rgba(255,120,150,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function drawMustache(x, y, w) {
        ctx.save();
        ctx.fillStyle = '#2b1a12';
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.quadraticCurveTo(x - w / 4, y - w * 0.18, x, y - w * 0.03);
        ctx.quadraticCurveTo(x + w / 4, y - w * 0.18, x + w / 2, y);
        ctx.quadraticCurveTo(x + w / 4, y + w * 0.08, x, y + w * 0.02);
        ctx.quadraticCurveTo(x - w / 4, y + w * 0.08, x - w / 2, y);
        ctx.fill();
        ctx.restore();
    }

    function drawFreckles(x, y, spread) {
        ctx.save();
        ctx.fillStyle = 'rgba(150,90,60,0.6)';
        const dots = [[-0.5,-0.1],[-0.3,0.05],[-0.15,-0.15],[0.15,-0.15],[0.3,0.05],[0.5,-0.1],[-0.4,0.15],[0.4,0.15]];
        dots.forEach(([dx, dy]) => {
            ctx.beginPath(); ctx.arc(x + dx * spread, y + dy * spread, spread * 0.025, 0, Math.PI * 2); ctx.fill();
        });
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

    function drawFloatingShapes(emoji, spread, origin, orbit = false, count = 5) {
        ctx.save();
        ctx.font = `${Math.max(16, spread * 0.12)}px sans-serif`;
        ctx.textAlign = 'center';
        for (let i = 0; i < count; i++) {
            const t = particleTick / 20 + i * 1.3;
            const ox = orbit ? Math.cos(t) * spread * 0.55 : (i - 2) * spread * 0.22;
            const oy = orbit ? Math.sin(t) * spread * 0.35 - spread * 0.15 : -spread * 0.3 - (particleTick % 60) * (spread * 0.006) + i * 6;
            ctx.fillText(emoji, origin.x + ox, origin.y + oy);
        }
        ctx.restore();
    }
function drawEmojiAt(emoji, p, size) {
    ctx.save();
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, p.x, p.y);
    ctx.restore();
}
    function stopProcessing() {
    startToken++;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (hiddenVideo) { hiddenVideo.srcObject = null; hiddenVideo.remove(); hiddenVideo = null; }
    sourceVideoEl = null; canvas = null; ctx = null;
    outputStream = null; currentEffectId = 'none'; lastVideoTime = -1; lastLandmarks = null;
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
