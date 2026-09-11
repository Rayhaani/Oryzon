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
        { id: 'none',     label: 'Original', css: 'none',                                                  premium: false },
        { id: 'bw',       label: 'Mono',     css: 'grayscale(1) contrast(1.1)',                             premium: false },
        { id: 'vivid',    label: 'Vivid',    css: 'saturate(1.6) contrast(1.15)',                           premium: false },
        { id: 'warm',     label: 'Warm',     css: 'sepia(0.25) saturate(1.3) brightness(1.05)',             premium: false },
        { id: 'cool',     label: 'Cool',     css: 'hue-rotate(180deg) saturate(1.2)',                       premium: true  },
        { id: 'noir',     label: 'Noir',     css: 'grayscale(1) contrast(1.4) brightness(0.9)',             premium: true  },
        { id: 'cine',     label: 'Cinema',   css: 'contrast(1.2) saturate(0.85) sepia(0.15) brightness(0.95)', premium: true },
        { id: 'dream',    label: 'Dream',    css: 'blur(0.4px) brightness(1.1) saturate(1.4) contrast(0.9)',   premium: true },
        { id: 'infrared', label: 'Infrared', css: 'invert(1) hue-rotate(180deg)',                           premium: true  },
        { id: 'vintage',  label: 'Vintage',  css: 'sepia(0.5) contrast(0.9) brightness(1.1) saturate(0.75)',   premium: true },
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
