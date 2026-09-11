// ═══════════════════════════════════════════════════
//  NEXUS Video Effects Engine — Filters (lazy-loaded)
//  Ana "baking" filter din cikin canvas sannan a maye
//  gurbin outgoing video track, don haka DAYAN BANGAREN
//  MA yana ganin filter din — ba local-only kamar CSS kadai ba.
// ═══════════════════════════════════════════════════
const NexusVideoEffects = (() => {

    let canvas = null, ctx = null, rafId = null;
    let currentFilterCss = 'none';
    let sourceVideoEl = null;
    let outputStream = null;

    const FILTERS = [
        // ── FREE (6) ──
        { id: 'none',    label: 'Original', css: 'none',                                        swatch: 'linear-gradient(135deg,#666,#999)',              premium: false },
        { id: 'bw',      label: 'Mono',     css: 'grayscale(1) contrast(1.1)',                   swatch: 'linear-gradient(135deg,#111,#eee)',               premium: false },
        { id: 'vivid',   label: 'Vivid',    css: 'saturate(1.6) contrast(1.15)',                 swatch: 'linear-gradient(135deg,#ff2d55,#ffcc00,#00d9ff)', premium: false },
        { id: 'warm',    label: 'Warm',     css: 'sepia(0.25) saturate(1.3) brightness(1.05)',   swatch: 'linear-gradient(135deg,#ff9500,#ffcc80)',         premium: false },
        { id: 'bright',  label: 'Bright',   css: 'brightness(1.2) contrast(1.05)',               swatch: 'linear-gradient(135deg,#fff8e1,#ffe082)',         premium: false },
        { id: 'soft',    label: 'Soft',     css: 'brightness(1.05) contrast(0.92) saturate(0.9)', swatch: 'linear-gradient(135deg,#f8bbd0,#e1bee7)',        premium: false },

        // ── PREMIUM (10) ──
        { id: 'cool',     label: 'Cool',      css: 'hue-rotate(180deg) saturate(1.2)',                             swatch: 'linear-gradient(135deg,#00c6ff,#0072ff)',        premium: true },
        { id: 'noir',     label: 'Noir',      css: 'grayscale(1) contrast(1.4) brightness(0.9)',                   swatch: 'linear-gradient(135deg,#000,#b71c1c)',           premium: true },
        { id: 'cine',     label: 'Cinema',    css: 'contrast(1.2) saturate(0.85) sepia(0.15) brightness(0.95)',    swatch: 'linear-gradient(135deg,#004d40,#ff7043)',        premium: true },
        { id: 'dream',    label: 'Dream',     css: 'blur(0.4px) brightness(1.1) saturate(1.4) contrast(0.9)',     swatch: 'linear-gradient(135deg,#d1c4e9,#f8bbd0)',        premium: true },
        { id: 'infrared', label: 'Infrared',  css: 'invert(1) hue-rotate(180deg)',                                 swatch: 'linear-gradient(135deg,#ff00c8,#7b00ff)',        premium: true },
        { id: 'vintage',  label: 'Vintage',   css: 'sepia(0.5) contrast(0.9) brightness(1.1) saturate(0.75)',     swatch: 'linear-gradient(135deg,#8d6e63,#d7ccc8)',        premium: true },
        { id: 'golden',   label: 'Golden Hr', css: 'sepia(0.35) saturate(1.4) brightness(1.1) hue-rotate(-10deg)', swatch: 'linear-gradient(135deg,#ff6f00,#ffd54f)',        premium: true },
        { id: 'matte',    label: 'Matte',     css: 'contrast(0.85) saturate(0.8) brightness(1.05)',                swatch: 'linear-gradient(135deg,#90a4ae,#cfd8dc)',        premium: true },
        { id: 'moody',    label: 'Moody',     css: 'contrast(1.3) brightness(0.85) saturate(0.7)',                 swatch: 'linear-gradient(135deg,#1a237e,#000)',           premium: true },
        { id: 'neon',     label: 'Neon',      css: 'saturate(2) contrast(1.3) hue-rotate(30deg)',                  swatch: 'linear-gradient(135deg,#39ff14,#00e5ff,#ff00ff)', premium: true },
    ];

    // TODO: maye gurbin wannan da ainihin binciken Firestore
    // users/{myId}.isPremium/subscriptionTier idan an gina tsarin premium.
    function isPremium() {
        return !!(window.NexusUser && window.NexusUser.isPremium) || localStorage.getItem('nexus_is_premium') === 'true';
    }

    function getFilters() { return FILTERS; }

    function startProcessing(videoEl) {
        sourceVideoEl = videoEl;
        canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        ctx = canvas.getContext('2d');
        outputStream = canvas.captureStream(30);
        drawLoop();
        return outputStream;
    }

    function drawLoop() {
        if (!canvas) return;
        if (!sourceVideoEl || sourceVideoEl.readyState < 2) { rafId = requestAnimationFrame(drawLoop); return; }
        if (sourceVideoEl.videoWidth && canvas.width !== sourceVideoEl.videoWidth) {
            canvas.width = sourceVideoEl.videoWidth;
            canvas.height = sourceVideoEl.videoHeight;
        }
        ctx.filter = currentFilterCss;
        ctx.drawImage(sourceVideoEl, 0, 0, canvas.width, canvas.height);
        rafId = requestAnimationFrame(drawLoop);
    }

    function stopProcessing() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null; sourceVideoEl = null; canvas = null; ctx = null; outputStream = null;
        currentFilterCss = 'none';
    }

    async function applyFilter(filterId, pc, localVideoEl) {
        const f = FILTERS.find(x => x.id === filterId);
        if (!f) return false;
        if (f.premium && !isPremium()) return 'premium_locked';
        currentFilterCss = f.css;
        if (localVideoEl) localVideoEl.style.filter = f.css; // WYSIWYG preview na gida
        if (pc && outputStream) {
            const newTrack = outputStream.getVideoTracks()[0];
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) await sender.replaceTrack(newTrack);
        }
        localStorage.setItem('nexus_last_video_filter', filterId);
        return true;
    }

    return { getFilters, startProcessing, stopProcessing, applyFilter, isPremium };

})();
