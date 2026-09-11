// ═══════════════════════════════════════════════════
//  NEXUS Video Background Engine — Blur / Replace
//  Google MediaPipe Selfie Segmentation (kyauta, browser-side).
//  Kamar Filters, ana "baking" sakamakon a canvas sannan a
//  replaceTrack domin DAYAN BANGAREN MA ya gani.
// ═══════════════════════════════════════════════════
const NexusVideoBackground = (() => {

    let canvas = null, ctx = null;
    let segmenter = null;
    let sourceVideoEl = null;
    let outputStream = null;
    let currentMode = 'none';      // 'none' | 'blur' | 'image'
    let currentBgImage = null;     // HTMLImageElement idan mode === 'image'
    let currentBlurAmount = 8;
    let running = false;
    let mediapipeLoaded = false;

    // Free: blur x2. Premium: presets + custom upload.
    // Maye gurbin 'url' din kasa da AINIHIN B2 URL din hotunanka.
    const BACKGROUNDS = [
        { id: 'blur-light', label: 'Blur Light',  type: 'blur',     amount: 6,  premium: false },
        { id: 'blur-heavy', label: 'Blur Heavy',  type: 'blur',     amount: 16, premium: true  },
        { id: 'gold',       label: 'Gold Luxe',    type: 'gradient', colors: ['#f7971e', '#ffd200'], premium: true },
        { id: 'midnight',   label: 'Midnight',     type: 'gradient', colors: ['#0f2027', '#203a43', '#2c5364'], premium: true },
        { id: 'emerald',    label: 'Emerald',      type: 'gradient', colors: ['#134e13', '#0a2f0a'], premium: true },
        { id: 'sunset',     label: 'Sunset',       type: 'gradient', colors: ['#ff512f', '#dd2476'], premium: true },
        { id: 'ocean',      label: 'Ocean',        type: 'gradient', colors: ['#2193b0', '#6dd5ed'], premium: true },
        { id: 'royal',      label: 'Royal Purple', type: 'gradient', colors: ['#654ea3', '#301b5c'], premium: true },
        { id: 'carbon',     label: 'Carbon',       type: 'gradient', colors: ['#232526', '#0d0e0f'], premium: true },
        { id: 'rosegold',   label: 'Rose Gold',    type: 'gradient', colors: ['#b76e79', '#e8c4c4'], premium: true },
        { id: 'custom',     label: 'Upload naka',  type: 'custom',   premium: true },
    ];

    function isPremium() {
        return !!(window.NexusUser && window.NexusUser.isPremium) || localStorage.getItem('nexus_is_premium') === 'true';
    }
    function getBackgrounds() { return BACKGROUNDS; }

    function loadMediapipe() {
        if (mediapipeLoaded && typeof SelfieSegmentation !== 'undefined') return Promise.resolve();
        return new Promise((resolve, reject) => {
            if (document.querySelector('script[data-nexus-mp]')) { mediapipeLoaded = true; resolve(); return; }
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
            s.dataset.nexusMp = '1';
            s.onload = () => { mediapipeLoaded = true; resolve(); };
            s.onerror = () => reject(new Error('MediaPipe ta kasa loda — duba internet dinka'));
            document.body.appendChild(s);
        });
    }

    async function startProcessing(videoEl) {
        await loadMediapipe();
        sourceVideoEl = videoEl;
        canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        ctx = canvas.getContext('2d');

        segmenter = new SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });
        segmenter.setOptions({ modelSelection: 1 });
        segmenter.onResults(onSegmentationResults);

        outputStream = canvas.captureStream(30);
        running = true;
        sendFrameLoop();
        return outputStream;
    }

    async function sendFrameLoop() {
        if (!running || !sourceVideoEl) return;
        if (sourceVideoEl.readyState >= 2) {
            await segmenter.send({ image: sourceVideoEl });
        }
        requestAnimationFrame(sendFrameLoop);
    }

    function onSegmentationResults(results) {
        if (!canvas) return;
        if (results.image.videoWidth && canvas.width !== results.image.videoWidth) {
            canvas.width = results.image.videoWidth;
            canvas.height = results.image.videoHeight;
        }
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1) Zana mutum kadai (bisa mask din)
        ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        // 2) Zana background a BAYAN mutumin
        ctx.globalCompositeOperation = 'destination-over';
        if (currentMode === 'blur') {
            ctx.filter = `blur(${currentBlurAmount}px)`;
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
        } else if (currentMode === 'gradient' && currentGradientColors) {
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            const step = 1 / (currentGradientColors.length - 1 || 1);
            currentGradientColors.forEach((c, i) => grad.addColorStop(i * step, c));
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (currentMode === 'image' && currentBgImage) {
            ctx.drawImage(currentBgImage, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height); // 'none' = ainihin baya
        }
        ctx.restore();
    }

    function preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Ba a iya loda background image ba'));
            img.src = url;
        });
    }

    let currentGradientColors = null;

    async function applyBackground(bgId, pc) {
        const bg = BACKGROUNDS.find(b => b.id === bgId) || { id: 'none', type: 'none' };
        if (bg.premium && !isPremium()) return 'premium_locked';

        if (bg.type === 'blur') {
            currentMode = 'blur';
            currentBlurAmount = bg.amount;
        } else if (bg.type === 'gradient') {
            currentMode = 'gradient';
            currentGradientColors = bg.colors;
        } else if (bg.type === 'custom') {
            return 'needs_file_picker'; // UI din zai bude file picker, sannan ya kira applyCustomImage
        } else {
            currentMode = 'none';
        }

        if (pc && outputStream) {
            const newTrack = outputStream.getVideoTracks()[0];
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) await sender.replaceTrack(newTrack);
        }
        localStorage.setItem('nexus_last_video_bg', bgId);
        return true;
    }

    // Damar upload-naka-kanka (Premium)
    async function applyCustomImage(file, pc) {
        if (!isPremium()) return 'premium_locked';
        const url = URL.createObjectURL(file);
        try { currentBgImage = await preloadImage(url); currentMode = 'image'; }
        catch (err) { return 'load_failed'; }
        if (pc && outputStream) {
            const newTrack = outputStream.getVideoTracks()[0];
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) await sender.replaceTrack(newTrack);
        }
        return true;
    }

    function stopProcessing() {
        running = false; sourceVideoEl = null; canvas = null; ctx = null;
        outputStream = null; currentMode = 'none'; currentBgImage = null;
    }

    return { getBackgrounds, startProcessing, stopProcessing, applyBackground, applyCustomImage, isPremium };

})();
