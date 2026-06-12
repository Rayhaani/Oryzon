/* ============================================================
   POST CARD TEMPLATE - SHARED SOURCE OF TRUTH
   Ko'ina da aka canja wannan fayil, duka homepage da
   profile timeline za su karba canjin kai tsaye.
   ============================================================ */

// 1. INJECT SHARED CSS - Duk CSS na post card yana nan kadai
(function injectPostCardStyles() {
    if (document.getElementById('post-card-shared-styles')) return; // Kar a saka sau biyu

    const style = document.createElement('style');
    style.id = 'post-card-shared-styles';
    style.textContent = `
        /* ===== SYNERGY POST CARD - MASTER STYLES ===== */
        :root {
            --premium-gold: #fde08d;
            --deep-gold: #b8860b;
            --gold-glow: 0 0 15px rgba(253, 224, 141, 0.3);
            --post-bg: rgba(20, 20, 20, 0.95);
            --post-border: #fde08d;
            --post-radius: 20px;
            --neon: #00f2fe;
            --bg: #050505;
        }

        /* ===== THE POST CARD ITSELF ===== */
        .post-card {
            background: var(--bg) !important;
            backdrop-filter: none !important;
            border: 1px solid var(--post-border) !important;
            border-radius: var(--post-radius) !important;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
            position: relative !important;
            overflow: hidden !important;
            box-shadow: var(--gold-glow) !important;
            transition: none !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }

        /* Gold shimmer line a saman katin */
        .post-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 2px;
            background: linear-gradient(90deg, transparent, var(--premium-gold), transparent);
            animation: post-card-slide-glow 3s infinite;
            z-index: 5;
        }

        @keyframes post-card-slide-glow {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        /* ===== POST HEADER ===== */
        .post-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0 15px 0 48px !important;
            height: 46px !important;
            position: relative !important;
            
            /* === Kawai wannan biyu aka canza === */
            background: rgba(245, 245, 247, 0.35) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
            
            margin-bottom: 0 !important;
        }

        /* ===== AVATAR ===== */
        .post-avatar {
            position: absolute !important;
            left: 0px !important;
            top: 0px !important;
            transform: none !important;
            width: 42px !important;
            height: 42px !important;
            border-radius: 50% !important;
            border: 1px solid var(--premium-gold) !important;
            object-fit: cover !important;
            z-index: 10 !important;
        }

        /* ===== USERNAME + BADGE ROW ===== */
        
        /* ===== VERIFIED BADGE ===== */
        .post-verified-badge {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 13px !important;
            height: 13px !important;
            background-color: #1d9bf0 !important;
            clip-path: polygon(
                50% 0%, 61% 5%, 72% 0%,
                80% 9%, 91% 9%, 91% 20%,
                100% 28%, 95% 39%, 100% 50%,
                95% 61%, 100% 72%, 91% 80%,
                91% 91%, 80% 91%, 72% 100%,
                61% 95%, 50% 100%, 39% 95%,
                28% 100%, 20% 91%, 9% 91%,
                9% 80%, 0% 72%, 5% 61%,
                0% 50%, 5% 39%, 0% 28%,
                9% 20%, 9% 9%, 20% 9%,
                28% 0%, 39% 5%
            ) !important;
            flex-shrink: 0 !important;
            margin-left: 2px !important;
        }

        .post-verified-badge i {
            font-size: 9px !important;
            color: #ffffff !important;
            font-weight: 900 !important;
        }

        /* ===== TIMESTAMP ===== */
        .post-time {
            font-size: 10px !important;
            color: rgba(255, 255, 255, 0.45) !important;
            display: block !important;
            margin-top: 1px !important;
            font-family: 'Inter', sans-serif !important;
        }

        /* ===== POST CONTENT TEXT ===== */
        .post-content {
            padding: 10px 14px 8px 14px !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
            color: #efefef !important;
            text-align: justify !important;
            text-justify: inter-word !important;
        }

        /* ===== MEDIA (IMAGE & VIDEO) ===== */
        .post-media {
            width: 100% !important;
            height: auto !important;
            display: block !important;
            object-fit: cover !important;
            border-radius: 0 !important;
            border: none !important;
            margin: 0 !important;
            background: #1a1a1a !important;
            min-height: 150px !important;
            transition: all 0.3s ease !important;
        }

        /* ===== MUTE TOGGLE ===== */
        .post-mute-toggle {
            position: absolute !important;
            bottom: 60px !important;
            right: 12px !important;
            width: 32px !important;
            height: 32px !important;
            background: rgba(0, 0, 0, 0.65) !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: white !important;
            z-index: 50 !important;
            cursor: pointer !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        .post-mute-toggle i {
            font-size: 13px !important;
        }

      
      

        /* ===== INTERACTION BAR ===== */
.post-interaction-bar, .interaction-bar {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 6px 8px !important;
    
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    width: 100% !important;
    box-sizing: border-box !important;
    z-index: 20 !important;

    /* ✅ SOLUTION 3 — Fully transparent bar */
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border-top: none !important;
}
        
        
        .post-action-capsules, .action-capsules {
            display: flex !important;
            gap: 6px !important;
            flex: 1 !important;
        }

        /* ===== CAPSULE BUTTONS ===== */
        .post-capsule, .capsule {
            background: rgba(255, 255, 255, 0.07) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 50px !important;
            padding: 6px 13px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            min-width: 48px !important;
            height: 33px !important;
            cursor: pointer !important;
            transition: all 0.25s ease !important;
            color: #ffffff !important;
        }

        .post-capsule:active, .capsule:active {
            transform: scale(0.93) !important;
        }

        .post-capsule i, .capsule i {
            color: var(--premium-gold) !important;
            font-size: 15px !important;
            display: inline-block !important;
        }

        .post-capsule span, .capsule span {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #ccc !important;
        }

        /* Like active state */
        .post-capsule.liked i, .capsule.liked i {
            color: #ff4d6d !important;
        }

        /* Save capsule - rightmost */
        .post-save-capsule, .save-capsule {
            margin-left: auto !important;
        }

        .post-save-capsule .post-capsule, .save-capsule .capsule {
            min-width: 68px !important;
        }

        /* ===== FULL SCREEN / IMMERSIVE MODE ===== */
        .post-card.immersive-mode {
    position: fixed !important;
    top: 0 !important; left: 0 !important;
    width: 100vw !important; height: 100dvh !important;
    z-index: 5000 !important;
    border-radius: 0 !important;
    margin: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: flex-end !important;
    background: #000 !important;
}

        .immersive-mode .post-media {
            position: absolute !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
            max-height: none !important;
            object-fit: cover !important;
            border-radius: 0 !important;
            z-index: -1 !important;
        }

       .immersive-mode .post-header,
        .immersive-mode .post-content,
        .immersive-mode .post-interaction-bar,
        .immersive-mode .interaction-bar {
            position: relative !important;
            z-index: 5001 !important;
            background: linear-gradient(transparent, rgba(0,0,0,0.85)) !important;
        }

        .immersive-mode .post-content,
        .immersive-mode .post-interaction-bar,
        .immersive-mode .interaction-bar {
            padding: 10px 20px !important;
        }

 
        
        /* ===== HIDE NATIVE VIDEO CONTROLS ===== */
        video::-webkit-media-controls { display: none !important; }
        video::-webkit-media-controls-start-playback-button { display: none !important; }

        /* ===== HAKKUNAN MAGANCE MATSALAR BLACK SPACE ===== */
        body:has(video[style*="position: fixed"]) {
            overflow: hidden !important;
            height: 100vh !important;
            max-height: 100vh !important;
        }


           /* ===== CAPSULE BUTTONS — Clean inside pill ===== */
.post-capsule, .capsule {
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    padding: 5px 12px !important;
    border-radius: 20px !important;

    /* ✅ Transparent inside — pill container handles the glass */
     /* Pill container → dark */
.post-action-capsules, .action-capsules,
.post-save-capsule, .save-capsule {
    background: rgba(0, 0, 0, 0.55) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
}



    color: #ffffff !important;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6) !important;
    transition: all 0.2s ease !important;
    min-width: 44px !important;
    height: 30px !important;
    cursor: pointer !important;
}

.post-capsule:active, .capsule:active {
    background: rgba(255, 255, 255, 0.12) !important;
    transform: scale(0.95) !important;
}

.post-capsule i, .capsule i {
    color: var(--premium-gold) !important;
    font-size: 14px !important;
}

.post-capsule span, .capsule span {
    font-size: 11px !important;
    font-weight: 600 !important;
    color: rgba(255, 255, 255, 0.9) !important;
}
             


    /* ===== ACTION CAPSULES WRAPPER — Pill Container ===== */
.post-action-capsules, .action-capsules {
    display: flex !important;
    gap: 4px !important;
    flex: 1 !important;

    /* ✅ SOLUTION 3 — Frosted pill wraps ALL buttons together */
    background: rgba(255, 255, 255, 0.08) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-radius: 30px !important;
    padding: 3px !important;
}

/* Save capsule wrapper — nata pill daban */
.post-save-capsule, .save-capsule {
    background: rgba(255, 255, 255, 0.08) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-radius: 30px !important;
    padding: 3px !important;
    margin-left: 6px !important;
}


/* ===== FORCE BLACK CAPSULES ===== */
.post-action-capsules, .action-capsules,
.post-save-capsule, .save-capsule {
    background: rgba(0, 0, 0, 0.6) !important;
    border-radius: 30px !important;
    padding: 3px !important;
}


/* ===== SPLIT-VIEW COMMENT SYSTEM ===== */
.sv-overlay {
    position: fixed;
    inset: 0;
    z-index: 8000;
    display: flex;
    flex-direction: column;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.35s ease;
}
.sv-overlay.sv-open {
    pointer-events: all;
    opacity: 1;
}
.sv-video-half {
    flex: 0 0 42%;
    position: relative;
    background: #000;
    overflow: hidden;
}
.sv-video-half video,
.sv-video-half img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}
.sv-mini-info {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 10px 14px;
    background: linear-gradient(transparent, rgba(0,0,0,0.75));
    display: flex;
    align-items: center;
    gap: 8px;
}
.sv-mini-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 1.5px solid #fde08d;
    object-fit: cover;
}
.sv-mini-username {
    color: #fff;
    font-size: 12px;
    font-weight: 700;
}
.sv-close-half {
    position: absolute;
    top: 10px; left: 12px;
    width: 30px; height: 30px;
    background: rgba(0,0,0,0.55);
    border: none;
    border-radius: 50%;
    color: #fff;
    font-size: 15px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    backdrop-filter: blur(8px);
    z-index: 10;
}
.sv-comments-half {
    flex: 1;
    background: rgba(10,10,18,0.97);
    backdrop-filter: blur(24px);
    display: flex;
    flex-direction: column;
    border-top: 1px solid rgba(253,224,141,0.15);
    transform: translateY(100%);
    transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
}
.sv-overlay.sv-open .sv-comments-half {
    transform: translateY(0);
}
.sv-comments-header {
    padding: 10px 16px 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sv-comments-title {
    color: #fff;
    font-family: 'Orbitron', sans-serif;
    font-size: 12px;
    display: flex; align-items: center; gap: 8px;
}
.sv-count-badge {
    background: rgba(253,224,141,0.15);
    color: #fde08d;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
    border: 1px solid rgba(253,224,141,0.3);
}
.sv-sort-row {
    display: flex;
    gap: 7px;
    padding: 8px 16px;
    flex-shrink: 0;
}
.sv-sort-btn {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 4px 13px;
    color: rgba(255,255,255,0.5);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
}
.sv-sort-btn.active {
    background: rgba(253,224,141,0.15);
    border-color: rgba(253,224,141,0.4);
    color: #fde08d;
}
.sv-comments-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 14px 8px;
    scrollbar-width: none;
}
.sv-comment-row {
    display: flex;
    gap: 9px;
    margin-bottom: 16px;
    align-items: flex-start;
}
.sv-c-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg,#fde08d,#b8860b);
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; flex-shrink: 0;
    border: 1.5px solid rgba(253,224,141,0.25);
    object-fit: cover;
}
.sv-c-name {
    color: #fff; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; gap: 4px;
}
.sv-c-verified {
    font-size: 10px;
}
.sv-c-time {
    color: rgba(255,255,255,0.35);
    font-size: 10px;
    margin-left: 4px;
}
.sv-c-text {
    color: rgba(255,255,255,0.82);
    font-size: 13px;
    line-height: 1.4;
    margin-top: 3px;
}
.sv-c-actions {
    display: flex;
    gap: 14px;
    margin-top: 6px;
    align-items: center;
}
.sv-c-reply-btn, .sv-c-like-btn {
    background: none; border: none;
    color: rgba(255,255,255,0.38);
    font-size: 11px; font-weight: 600;
    cursor: pointer; padding: 0;
    display: flex; align-items: center; gap: 3px;
}
.sv-reactions-bar {
    display: flex;
    gap: 7px;
    padding: 6px 14px;
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;
    border-top: 1px solid rgba(255,255,255,0.05);
}
.sv-react-btn {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 4px 9px;
    font-size: 17px;
    cursor: pointer;
    flex-shrink: 0;
}
.sv-input-row {
    display: flex;
    gap: 8px;
    padding: 8px 12px 20px;
    align-items: center;
    flex-shrink: 0;
    background: rgba(10,10,18,0.98);
}
.sv-my-avatar {
    width: 30px; height: 30px;
    border-radius: 50%;
    object-fit: cover;
    border: 1.5px solid rgba(253,224,141,0.4);
    flex-shrink: 0;
}
.sv-input-wrap {
    flex: 1;
    display: flex;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px;
    overflow: hidden;
    align-items: center;
}
.sv-input {
    flex: 1; background: none; border: none; outline: none;
    color: #fff; font-size: 13px;
    padding: 9px 13px;
    caret-color: #fde08d;
    font-family: 'Inter', sans-serif;
}
.sv-input::placeholder { color: rgba(255,255,255,0.35); }
.sv-send-btn {
    background: linear-gradient(135deg,#fde08d,#b8860b);
    border: none; border-radius: 50%;
    width: 30px; height: 30px;
    margin: 4px;
    cursor: pointer;
    color: #000;
    font-size: 15px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}

@keyframes sv-float {
    0%   { opacity:1; transform:translateX(-50%) scale(.5); }
    50%  { opacity:1; transform:translateX(-50%) scale(1.35) translateY(-18px); }
    100% { opacity:0; transform:translateX(-50%) scale(1) translateY(-55px); }
}

       /* ===== IMMERSIVE BACK BUTTON ===== */
.immersive-back-btn {
    position: fixed;
    top: 15px; left: 15px;
    width: 36px; height: 36px;
    background: rgba(0,0,0,0.6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    z-index: 9999;
    cursor: pointer;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.3);
}

/* ===== POST MEDIA — FULL PORTRAIT ===== */
.post-media {
    min-height: 600px !important;
    aspect-ratio: 9/16 !important;
    object-fit: cover !important;
    background-color: #0b0b0b !important;
}

/* ===== MUTE TOGGLE — UNIFIED ===== */
.mute-toggle, .post-mute-toggle {
    position: absolute !important;
    bottom: 60px !important;
    right: 12px !important;
    width: 32px !important;
    height: 32px !important;
    background: rgba(0,0,0,0.65) !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: white !important;
    z-index: 50 !important;
    cursor: pointer !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
}

.mute-toggle i, .post-mute-toggle i {
    font-size: 13px !important;
} 


        .header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
        
        /* ===== FOLLOW BUTTON ===== */
           .follow-text-link {
            position: relative;
            padding: 6px 18px;
            font-family: 'Montserrat', sans-serif;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 2.5px;
            text-transform: uppercase;
            color: #fde08d;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01));
            border: 1.5px solid #fde08d;
            border-radius: 50px; 
            cursor: pointer;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .follow-text-link::after {
            content: '';
            position: absolute;
            top: -50%; left: -50%; width: 200%; height: 200%;
            background: radial-gradient(circle, rgba(253, 224, 141, 0.2) 0%, transparent 70%);
            opacity: 0; transition: 0.8s;
        }

        .follow-text-link:hover {
            color: #111; background: #fde08d; transform: scale(1.05);
            box-shadow: 0 0 30px rgba(253, 224, 141, 0.6); letter-spacing: 4px;
        }

        .follow-text-link:hover::after { opacity: 1; transform: scale(1); }


        /* ===== GIFT BUTTON ===== */

.gift-btn-nexus {
            display: flex; align-items: center; gap: 5px;
            background: linear-gradient(145deg, #1a1a1a, #0d0d0d); 
            border: 1px solid rgba(253, 224, 141, 0.2); 
            padding: 0 10px; height: 28px; border-radius: 8px; cursor: pointer;
            transition: all 0.3s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }

        .gift-btn-nexus:active { transform: scale(0.92); }
        .gift-emoji { font-size: 14px; filter: drop-shadow(0 0 4px rgba(253, 224, 141, 0.5)); animation: giftWobble 4s infinite; }
        .gift-btn-nexus span:last-child { font-size: 10px; color: #ffffff; font-weight: 600; letter-spacing: 0.2px; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }

        @keyframes giftWobble {
            0%, 90%, 100% { transform: rotate(0deg); }
            92% { transform: rotate(15deg); }
            95% { transform: rotate(-15deg); }
            98% { transform: rotate(15deg); }
        }

        .gift-btn-nexus span { white-space: nowrap; }
        .post-username {
    font-size: 15px !important;
    font-weight: 700 !important;
    color: #fff !important;
    margin-top: 4px !important;
    display: block !important;
        }

        /* ===== FORCE CAPSULE COLORS — FINAL OVERRIDE ===== */
.post-card .post-capsule i,
.post-card .capsule i {
    color: #ffffff !important;
    font-size: 15px !important;
}

.post-card .post-capsule span,
.post-card .capsule span {
    color: #ffffff !important;
    font-weight: 600 !important;
    font-size: 11px !important;
}

.post-card .post-capsule.liked i,
.post-card .capsule.liked i {
    color: #ff4d6d !important;
}


        .post-header { 
            display: flex; 
            align-items: center; 
            gap: 10px; 
            padding: 15px 15px 10px 15px; 
            margin: 0 0 10px 0;
            background: linear-gradient(180deg, rgba(253, 224, 141, 0.12) 0%, transparent 100%);
            border-bottom-left-radius: 40px 15px; 
            border-bottom-right-radius: 40px 15px;
            border-bottom: 1px solid rgba(253, 224, 141, 0.2);
            position: relative;
        }
        

        /* ===== FEED CONTAINER ===== */
        #timeline-area,
        .feed-container {
            padding: 0 10px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
    `;
    document.head.appendChild(style);
})();


// 2. SHARED HELPER - Toggle video sound
window.postCard_toggleVideoSound = function(event, element) {
    event.stopPropagation();
    const video = element.previousElementSibling;
    if (video && video.tagName === 'VIDEO') {
        video.muted = !video.muted;
        element.innerHTML = video.muted
            ? '<i class="fa-solid fa-volume-xmark"></i>'
            : '<i class="fa-solid fa-volume-high"></i>';
    }
};

// 3. SHARED HELPER - Toggle like
window.postCard_toggleLike = function(event, postId) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    const countEl = btn.querySelector('span');

    const liked = btn.classList.toggle('liked');
    icon.style.color = liked ? '#ff4d6d' : 'var(--premium-gold)';

    let count = parseInt(countEl.textContent.replace(/,/g, '')) || 0;
    countEl.textContent = liked ? (count + 1).toLocaleString() : Math.max(0, count - 1).toLocaleString();

    // Sync to Firestore if db is available
    if (typeof db !== 'undefined' && postId) {
        const myUsername = localStorage.getItem('nexus_user_session');
        if (!myUsername) return;
        if (liked) {
            db.collection('likes').doc(`${postId}_${myUsername}`).set({
                postId, user: myUsername,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            db.collection('likes').doc(`${postId}_${myUsername}`).delete();
        }
    }
};


// SHARED HELPER - Restore likes bayan page load
window.postCard_restoreLikes = function(container) {
    const myUsername = localStorage.getItem('nexus_user_session');
    if (!myUsername || typeof db === 'undefined') return;

    db.collection('likes').where('user', '==', myUsername).get().then(snap => {
        snap.forEach(likeDoc => {
            const postId = likeDoc.data().postId;
            const card = container.querySelector(`.post-card[data-post-id="${postId}"]`);
            if (!card) return;

            const allBtns = card.querySelectorAll('.post-capsule, .capsule');
            allBtns.forEach(btn => {
                const icon = btn.querySelector('i');
                if (icon && icon.classList.contains('fa-heart')) {
                    btn.classList.add('liked');
                    icon.className = 'fa-solid fa-heart';
                    icon.style.color = '#ff4d6d';

                    db.collection('likes').where('postId', '==', postId).get().then(countSnap => {
                        const countEl = btn.querySelector('span');
                        if (countEl) countEl.textContent = countSnap.size > 0 ? countSnap.size : '0';
                    });
                }
            });
        });
    });
};

// 4. SHARED HELPER - Toggle save
window.postCard_toggleSave = function(event, postId) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    const countEl = btn.querySelector('span');

    const saved = btn.classList.toggle('saved');
    icon.style.color = saved ? '#fde08d' : 'var(--premium-gold)';
    if (countEl) countEl.textContent = saved ? 'Saved' : 'Save';
};


// ============================================================
// 5. MASTER generatePostHTML() — SINGLE SOURCE OF TRUTH
//    Duka homepage da profile timeline suna amfani da wannan
// ============================================================

window.generatePostHTML = function(post) {
    const postId = post.id || '';

    
       // --- Avatar ---
const rawPic = post.userProfilePic || "https://api.dicebear.com/7.x/bottts/svg?seed=" + (post.username || 'user');
        const avatarUrl = rawPic.includes('cloudinary.com')
        ? rawPic.replace('/upload/', '/upload/f_auto,q_auto,w_100,h_100,c_fill/')
        : rawPic;

    // --- Media ---
    let mediaWrapperHTML = '';
    if (post.mediaUrl) {
        const fastUrl = post.mediaUrl.includes('cloudinary.com')
            ? post.mediaUrl.replace('/upload/', '/upload/f_auto,q_auto,w_700/')
            : post.mediaUrl;

        if (post.mediaType === 'video') {
            mediaWrapperHTML = `
                <div style="position:relative;">
                    <video src="${fastUrl}"
                        class="post-media"
                        loop playsinline autoplay muted preload="metadata">
                    </video>
                    <div class="post-mute-toggle"
                         onclick="postCard_toggleVideoSound(event, this)">
                        <i class="fa-solid fa-volume-xmark"></i>
                    </div>
                </div>`;
        } else {
            mediaWrapperHTML = `<img src="${fastUrl}" class="post-media" loading="lazy" alt="post image">`;
        }
    }

    // --- Timestamp ---
    let timeStr = '';
    if (post.timestamp) {
        const ts = post.timestamp.toDate ? post.timestamp.toDate() : new Date(post.timestamp);
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60)          timeStr = diff + ' seconds ago';
        else if (diff < 120)    timeStr = '1 minute ago';
        else if (diff < 3600)   timeStr = Math.floor(diff/60) + ' minutes ago';
        else if (diff < 7200)   timeStr = '1 hour ago';
        else if (diff < 86400)  timeStr = Math.floor(diff/3600) + ' hours ago';
        else if (diff < 172800) timeStr = '1 day ago';
        else if (diff < 518400) timeStr = Math.floor(diff/86400) + ' days ago';
        else {
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const day = ts.getDate();
            const suffix = day===1||day===21||day===31?'st':day===2||day===22?'nd':day===3||day===23?'rd':'th';
            timeStr = day + suffix + ' ' + months[ts.getMonth()];
        }
    }

    // --- Like count ---
    const likes = post.likesCount || post.likes || 0;
    const comments = post.commentsCount || post.comments || 0;

    return `
    <div class="post-card" data-post-id="${postId}" onclick="
        const media = this.querySelector('.post-media');
        if(media && media.tagName === 'VIDEO' && typeof toggleImmersive === 'function') toggleImmersive(this);
    ">

                  <div class="post-header">
            <a href="me.html?user=${encodeURIComponent(post.username || '')}"
               style="position:absolute; left:0; top:0; width:54px; height:54px; display:block; z-index:20; text-decoration:none;">
                <img src="${avatarUrl}"
                     class="post-avatar"
                     loading="lazy"
                     alt="${post.username}">
            </a>

                       <div class="post-username-row" style="display: flex !important; flex-direction: column !important; justify-content: center !important; flex: 1 !important; background: none !important; border: none !important; padding: 0 !important; margin: 0 0 0 2px !important;">
                <div>
                    <!-- Username an kara masa girma da 2px (Ya koma 18px) -->
                    <div style="display:flex; align-items:center; gap:5px; line-height:1.2;">
                        <span class="post-username" style="font-size:15px !important; font-weight:800; color:#fff; display:block;">${post.username || 'unknown'}</span>

                       
                       <span class="post-verified-badge" style="margin-left: 5px; display: inline-flex; align-items: center; vertical-align: middle;">
    <!-- Asalin SVG verified badge mai tudu 11 da checkmark daidai da na hoton 1000995375.jpg -->
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
        <!-- Wannan shi ne asalin shape mai tudu 11 na Instagram/Twitter mai launin blue (#1d9bf0) -->
        <path d="M12 2C10.74 2 9.53 2.62 8.78 3.67L8.2 4.49C7.84 5 7.28 5.33 6.66 5.39L5.67 5.48C4.31 5.61 3.24 6.68 3.11 8.04L3.02 9.03C2.96 9.65 2.63 10.21 2.12 10.57L1.3 11.15C0.25 11.9 0.25 13.47 1.3 14.22L2.12 14.8C2.63 15.16 2.96 15.72 3.02 16.34L3.11 17.33C3.24 18.69 4.31 19.76 5.67 19.89L6.66 19.98C7.28 20.04 7.84 20.37 8.2 20.88L8.78 21.7C9.53 22.75 11.08 22.75 11.83 21.7L12.41 20.88C12.77 20.37 13.33 20.04 13.95 19.98L14.94 19.89C16.3 19.76 17.37 18.69 17.5 17.33L17.59 16.34C17.65 15.72 17.98 15.16 18.49 14.8L19.31 14.22C20.36 13.47 20.36 11.9 19.31 11.15L18.49 10.57C17.98 10.21 17.65 9.65 17.59 9.03L17.5 8.04C17.37 6.68 16.3 5.61 14.94 5.48L13.95 5.39C13.33 5.33 12.77 5 12.41 4.49L11.83 3.67C11.23 2.82 10.45 2 12 2Z" fill="#1d9bf0"/>
        <!-- Checkmark na ciki fari/baƙi mai kauri daidai ka'ida -->
        <path d="M9.5 12L11 13.5L15 9.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
</span> 

                    
                    </div>
                    
                    
                                        ${timeStr ? (() => {
                        // 1. Goge th, nd, st, rd da alamun sassaƙi
                        let cleanTime = timeStr.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1').replace(/,/g, '');
                        
                        // 2. Mayar da komai zuwa small letters gaba ɗaya da farko
                        cleanTime = cleanTime.toLowerCase();
                        
                        // 3. Raba salon CSS text-transform ya danganta da 'ago'
                        // Idan babu 'ago', muna so harafin farko na Month ya zama babban harafi (Capitalize)
                        // Idan da 'ago', muna so ya zama completely small letters (lowercase)
                        let transformStyle = !cleanTime.includes('ago') ? 'capitalize' : 'lowercase';
                        
                        return `<span class="post-time" style="font-size:9px !important; font-weight: 700 !important; color:rgba(255,255,255,0.45); margin-top:3px; display:block; line-height:1; white-space: nowrap !important; text-transform: ${transformStyle} !important;">${cleanTime}</span>`;
                    })() : ''}
                    
                    
                </div>
            </div>
            
            
                        
                <div class="header-actions" onclick="stopProp(event)" style="display: flex; align-items: center; gap: 12px;">
    <div class="gift-btn-nexus follow-btn-nexus" 
         onclick="handleFollowBtn(this)"
         style="cursor: pointer;">
        <span style="font-size: 10px; font-weight: 600; color: #ffffff;">Follow</span>
    </div>
    

                
                <div class="gift-btn-nexus" onclick="openGiftPanel('${post.username}')">
                    <span class="gift-emoji">🎁</span>
                    <span style="font-size: 10px;">Gift</span>
                </div>
            </div>
            
            <div onclick="event.stopPropagation()"
                 style="font-size: 18px; cursor: pointer; padding: 0 4px; display: flex; align-items: center; gap: 3px;">
                <span class="dot-item" style="color: #000000; font-weight: 900; display: inline-block; animation: dotSequence 1.5s infinite ease-in-out;">•</span>
                <span class="dot-item" style="color: #000000; font-weight: 900; display: inline-block; animation: dotSequence 1.5s infinite ease-in-out; animation-delay: 0.3s;">•</span>
                <span class="dot-item" style="color: #000000; font-weight: 900; display: inline-block; animation: dotSequence 1.5s infinite ease-in-out; animation-delay: 0.6s;">•</span>
            </div>

            <style>
                @keyframes dotSequence {
                    0%, 100% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.4); opacity: 1; }
                }
            </style>
            
   
            
        </div>
        ${post.content ? `<div class="post-content">${post.content}</div>` : ''}

            <div style="position:relative;" ondblclick="
            const btn = this.closest('.post-card').querySelector('.post-capsule, .capsule');
            const icon = btn.querySelector('i');  
            if(btn.classList.contains('liked')){
                // UNLIKE
                btn.classList.remove('liked');
                icon.className = 'fa-regular fa-heart';
                icon.removeAttribute('style');
                let c = parseInt(btn.querySelector('span').textContent) || 0;
                btn.querySelector('span').textContent = Math.max(0, c - 1);
                if(typeof db !== 'undefined'){
                    const u = localStorage.getItem('nexus_user_session');
                    const pid = btn.closest('.post-card').dataset.postId;
                    if(u && pid) db.collection('likes').doc(pid + '_' + u).delete();
                }
            } else {
                // LIKE
                btn.classList.add('liked');
                icon.className = 'fa-solid fa-heart';
                icon.style.color = '#ff4d6d';
                let c = parseInt(btn.querySelector('span').textContent) || 0;
                btn.querySelector('span').textContent = c + 1;
                if(typeof db !== 'undefined'){
                    const u = localStorage.getItem('nexus_user_session');
                    const pid = btn.closest('.post-card').dataset.postId;
                    if(u && pid) db.collection('likes').doc(pid + '_' + u).set({
                        postId: pid, user: u,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            const colors = ['#f953c6','#f7971e','#ff416c','#a18cd1','#00c6ff','#ff4b2b','#ffd200','#b91d73'];
            const col = colors[Math.floor(Math.random() * colors.length)];
            const heart = document.createElement('i');
            heart.className = 'fa-solid fa-heart';
            heart.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);font-size:90px;color:' + col + ';filter:drop-shadow(0 0 12px ' + col + ');z-index:99;pointer-events:none;opacity:1;transition:transform 0.2s cubic-bezier(0.175,0.885,0.32,1.275),opacity 0.3s ease;';
            this.appendChild(heart);
            setTimeout(function(){ heart.style.transform = 'translate(-50%,-50%) scale(1.2)'; }, 10);
            setTimeout(function(){ heart.style.transform = 'translate(-50%,-50%) scale(0.9)'; }, 200);
            setTimeout(function(){ heart.style.transform = 'translate(-50%,-50%) scale(1)'; }, 300);
            setTimeout(function(){ heart.style.opacity = '0'; heart.style.transform = 'translate(-50%,-50%) scale(1.1)'; }, 700);
            setTimeout(function(){ heart.remove(); }, 1000);
        ">${mediaWrapperHTML}</div>

        <div class="post-interaction-bar" onclick="stopProp(event)">
            <div class="post-action-capsules">
               
                <div class="post-capsule" onclick="
                    const btn = this;
                    const icon = btn.querySelector('i');
                    if(btn.classList.contains('liked')){
                        btn.classList.remove('liked');
                        icon.className = 'fa-regular fa-heart';
                        icon.removeAttribute('style');
                        let c = parseInt(btn.querySelector('span').textContent) || 0;
                        btn.querySelector('span').textContent = Math.max(0, c - 1);
                    } else {
                        btn.classList.add('liked');
                        icon.className = 'fa-solid fa-heart';
                        icon.style.color = '#ff4d6d';
                        let c = parseInt(btn.querySelector('span').textContent) || 0;
                        btn.querySelector('span').textContent = c + 1;
                    }
                ">
                    <i class="fa-regular fa-heart"></i>
                    <span>${likes}</span>
                </div>
               
                    <div class="post-capsule" onclick="event.stopPropagation(); handleCommentBtn('${post.id}', event)" id="comment-btn-${post.id}">
                     <i class="fa-regular fa-comment"></i>
                    <span id="comment-count-${post.id}">${comments}</span>
                </div>

               <div class="post-capsule"><i class="fa-solid fa-arrows-rotate"></i><span>5</span></div>
                <div class="post-capsule"><i class="fa-regular fa-paper-plane"></i></div>
            </div>
            
                
            <div class="post-action-capsules post-save-capsule">
                <div class="post-capsule" onclick="toggleSave(this, '${post.id}')">
                    <i class="fa-regular fa-bookmark"></i>
                    <span>Save</span>
                </div>
            </div>
        </div>
        </div>`;
};


// ============================================================
// 6. CONVEYOR STORIES — Auto-sliding belt
// ============================================================
(function initConveyorStories() {

    const SPEED = 22; // px per second — slow and smooth
    let beltOffset = 0;
    let lastTime = null;
    let animFrame;
    let isPaused = false;
    let totalWidth = 0;

    function startConveyor() {
        const belt = document.getElementById('conveyorBelt');
        if (!belt) return;

        // Count cards for total width
        const cards = belt.querySelectorAll('.s-card');
        const CARD_W = 80; // card width + gap
        const originalCount = cards.length;
        totalWidth = originalCount * CARD_W;

        // Clone cards 2x for seamless loop
        cards.forEach(card => {
            belt.appendChild(card.cloneNode(true));
            belt.appendChild(card.cloneNode(true));
        });

        // Re-attach click events after cloning
        belt.querySelectorAll('.s-card').forEach(card => {
            card.addEventListener('click', () => {
                const username = card.dataset.username;
                if (username) openStoryByUsername(username);
            });
        });

        // Pause on touch
        belt.addEventListener('touchstart', () => { isPaused = true; }, { passive: true });
        belt.addEventListener('touchend',   () => { isPaused = false; lastTime = null; });

        cancelAnimationFrame(animFrame);
        animFrame = requestAnimationFrame(animate);
    }



   // SHARED - Follow button handler
window.handleFollowBtn = function(btn) {
    const span = btn.querySelector('span');
    const isFollowing = span.textContent.trim() === 'Following';

    if (isFollowing) {
        // Unfollow — dawo exact asali
        span.textContent = 'Follow';
        btn.classList.remove('following');
    } else {
        // Follow — expand kaɗan
        span.textContent = 'Following';
        btn.classList.add('following');
    }

    if (navigator.vibrate) navigator.vibrate(10);
};




   // ===== NEXUS SPLIT-VIEW COMMENTS ENGINE =====
let svCurrentPostId = null;
let svUnsub = null;

function openSplitView(postId, event) {
    if (event) event.stopPropagation();

    svCurrentPostId = postId;
    const overlay = document.getElementById('svOverlay');
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (!card) return;

    // Sanya media (video ko image) a cikin split view
    const mediaSlot = document.getElementById('svMediaSlot');
    mediaSlot.innerHTML = '';
    const origVideo = card.querySelector('video');
    const origImg = card.querySelector('img.post-media');

    if (origVideo) {
        const cloneVid = document.createElement('video');
        cloneVid.src = origVideo.src || origVideo.currentSrc;
        cloneVid.autoplay = true;
        cloneVid.loop = true;
        cloneVid.muted = false;
        cloneVid.playsInline = true;
        cloneVid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        mediaSlot.appendChild(cloneVid);
        cloneVid.play().catch(()=>{});
    } else if (origImg) {
        const cloneImg = document.createElement('img');
        cloneImg.src = origImg.src;
        cloneImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        mediaSlot.appendChild(cloneImg);
    }

    // Avatar da username
    const avatarEl = card.querySelector('.post-avatar') || card.querySelector('.avatar');
    const usernameEl = card.querySelector('.post-username') || card.querySelector('.username');
    document.getElementById('svMiniAvatar').src = avatarEl ? avatarEl.src : '';
    document.getElementById('svMiniUsername').textContent = usernameEl ? usernameEl.textContent.trim() : '';

    // Avatar na mai rubutu comment
    const myPic = localStorage.getItem('userProfilePic') || 'https://api.dicebear.com/7.x/bottts/svg?seed=me';
    document.getElementById('svMyAvatar').src = myPic;

    // Show/hide send button
    const svInput = document.getElementById('svInput');
    const svSendBtn = document.getElementById('svSendBtn');
    svInput.addEventListener('input', () => {
        svSendBtn.style.display = svInput.value.trim() ? 'flex' : 'none';
    });

    // Bude overlay
    overlay.classList.add('sv-open');
    document.body.style.overflow = 'hidden';
    document.getElementById('instaFooter').classList.add('footer-hidden');

    // Load comments daga Firestore
    svLoadComments(postId);
    if (navigator.vibrate) navigator.vibrate([15, 10, 15]);
}

function closeSplitView() {
    document.getElementById('svOverlay').classList.remove('sv-open');
    document.body.style.overflow = '';
    document.getElementById('instaFooter').classList.remove('footer-hidden');
    
    // Stop cloned video
    const vid = document.querySelector('#svMediaSlot video');
    if (vid) { vid.pause(); vid.src = ''; }

    if (svUnsub) { svUnsub(); svUnsub = null; }
    svCurrentPostId = null;
}

function svLoadComments(postId) {
    const list = document.getElementById('svCommentsList');
    list.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:20px;font-size:13px;">Loading...</div>';

    if (svUnsub) svUnsub();

    svUnsub = db.collection('nexus_contributions')
        .where('postId', '==', postId)
        .where('parentId', '==', null)
        .orderBy('timestamp', 'desc')
        .onSnapshot(snap => {
            document.getElementById('svCommentCount').textContent = snap.size;
            if (snap.empty) {
                list.innerHTML = '<div style="color:rgba(255,255,255,0.25);text-align:center;padding:30px;font-size:13px;">No comments yet.<br>Be the first! 💬</div>';
                return;
            }
            list.innerHTML = '';
            snap.forEach(doc => {
                const c = doc.data();
                const row = document.createElement('div');
                row.className = 'sv-comment-row';
                row.innerHTML = `
                    <div class="sv-c-avatar">${c.userAvatar ? `<img src="${c.userAvatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : '👤'}</div>
                    <div style="flex:1">
                        <div class="sv-c-name">
                            ${c.username || 'User'}
                            <span class="sv-c-verified">✅</span>
                            <span class="sv-c-time">${svTimeAgo(c.timestamp)}</span>
                        </div>
                        <div class="sv-c-text">${c.text || ''}</div>
                        <div class="sv-c-actions">
                            <button class="sv-c-reply-btn">↩ Reply</button>
                            <button class="sv-c-like-btn">🤍 ${c.likes || 0}</button>
                        </div>
                    </div>
                `;
                list.appendChild(row);
            });
        }, err => {
            list.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:20px;font-size:12px;">Could not load comments.</div>';
        });
}

async function svSubmitComment() {
    const input = document.getElementById('svInput');
    const text = input.value.trim();
    if (!text || !svCurrentPostId) return;

    const myUser = localStorage.getItem('nexus_user_session') || 'anonymous';
    const myPic = localStorage.getItem('userProfilePic') || '';

    input.value = '';
    document.getElementById('svSendBtn').style.display = 'none';

    try {
        await db.collection('nexus_contributions').add({
            postId: svCurrentPostId,
            parentId: null,
            username: myUser,
            userAvatar: myPic,
            text: text,
            likes: 0,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update comment count a kan post
        await db.collection('posts').doc(svCurrentPostId).update({
            commentCount: firebase.firestore.FieldValue.increment(1)
        });
    } catch(e) {
        console.error('Comment error:', e);
    }
}

function svSendReaction(emoji) {
    const half = document.getElementById('svVideoHalf');
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.cssText = `position:absolute;bottom:30%;left:50%;font-size:52px;
        animation:sv-float 0.9s ease-out forwards;pointer-events:none;z-index:99;`;
    half.appendChild(el);
    setTimeout(() => el.remove(), 950);
}

function svTimeAgo(ts) {
    if (!ts) return 'now';
    const secs = Math.floor((Date.now() - ts.toMillis()) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return Math.floor(secs/60) + 'm';
    if (secs < 86400) return Math.floor(secs/3600) + 'h';
    return Math.floor(secs/86400) + 'd';
}


   
    function animate(ts) {
        if (!lastTime) lastTime = ts;
        const dt = (ts - lastTime) / 1000;
        lastTime = ts;

        if (!isPaused) {
            beltOffset -= SPEED * dt;
            if (Math.abs(beltOffset) >= totalWidth) {
                beltOffset += totalWidth; // seamless reset
            }
            const belt = document.getElementById('conveyorBelt');
            if (belt) belt.style.transform = `translateX(${beltOffset}px)`;
        }

        animFrame = requestAnimationFrame(animate);
    }

    // Wait for DOM then start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startConveyor);
    } else {
        setTimeout(startConveyor, 300);
    }

    window.stopConveyor = () => cancelAnimationFrame(animFrame);
    window.resumeConveyor = () => {
        lastTime = null;
        animFrame = requestAnimationFrame(animate);
    };

})();



window.handleCommentBtn = function(postId, event) {
    if (event) event.stopPropagation();
    
    // Duba ko muna immersive mode
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const isImmersive = card && card.classList.contains('immersive-mode');
    
    if (!isImmersive) {
        // NORMAL MODE → je comments.html kamar yadda yake
        window.location.href = `comments.html?postId=${postId}`;
        return;
    }
    
    // IMMERSIVE MODE → buɗe split-view tare da ainihin comments.html content
    openImmersiveSplitComments(postId, card);
};

window.openImmersiveSplitComments = function(postId, card) {
    const existing = document.getElementById('nexusSplitView');
    if (existing) { existing.remove(); return; }

    const splitDiv = document.createElement('div');
    splitDiv.id = 'nexusSplitView';
    splitDiv.style.cssText = `
        position:fixed; inset:0; z-index:9000;
        display:flex; flex-direction:column; background:#000;
    `;

    // ===== VIDEO HALF (42%) =====
    const videoHalf = document.createElement('div');
    videoHalf.style.cssText = `flex:0 0 42%; position:relative; background:#000; overflow:hidden;`;

    const origVideo = card.querySelector('video');
    const origImg = card.querySelector('img.post-media');

    if (origVideo) {
        const vid = document.createElement('video');
        vid.src = origVideo.src || origVideo.currentSrc;
        vid.autoplay = true; vid.loop = true;
        vid.muted = false; vid.playsInline = true;
        vid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        videoHalf.appendChild(vid);
        vid.play().catch(()=>{});

     vid.onclick = () => {
    splitDiv.remove();
    document.body.style.overflow = '';
};
    
    } else if (origImg) {
        const img = document.createElement('img');
        img.src = origImg.src;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        videoHalf.appendChild(img);
       img.onclick = () => {
    splitDiv.remove();
    document.body.style.overflow = '';
};
    }  // ← wannan closing brace na else if block

    
    // Mini info a kasan video
    const avatarEl = card.querySelector('.post-avatar');
    const usernameEl = card.querySelector('.post-username');
    const miniInfo = document.createElement('div');
    miniInfo.style.cssText = `
        position:absolute; bottom:0; left:0; right:0;
        padding:10px 14px;
        background:linear-gradient(transparent,rgba(0,0,0,0.85));
        display:flex; align-items:center; gap:8px;
    `;
    miniInfo.innerHTML = `
        <img src="${avatarEl ? avatarEl.src : ''}" 
            style="width:28px;height:28px;border-radius:50%;border:1.5px solid #fde08d;object-fit:cover;">
        <span style="color:#fff;font-size:13px;font-weight:700;">
            ${usernameEl ? usernameEl.textContent.trim() : ''}
        </span>
    `;
    videoHalf.appendChild(miniInfo);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&#8249;';
    closeBtn.style.cssText = `
        position:absolute; top:10px; left:12px;
        width:32px; height:32px; border-radius:50%;
        background:rgba(0,0,0,0.6); border:none;
        color:#fff; font-size:22px; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        z-index:10; backdrop-filter:blur(8px);
        border:1px solid rgba(255,255,255,0.2);
    `;
    closeBtn.onclick = () => {
    splitDiv.remove();
    document.body.style.overflow = '';
    // Kar a taɓa footer ko menu — immersive mode yana nan har sai an danna back button na immersive
    // Boye footer da menu sake domin immersive yana nan
    document.getElementById('instaFooter').classList.add('footer-hidden');
    document.getElementById('cyberMenu').style.display = 'none';
};

    videoHalf.appendChild(closeBtn);

    // ===== COMMENTS HALF (58%) — IFRAME na ainihin comments.html =====
    const commentsHalf = document.createElement('div');
    commentsHalf.style.cssText = `
        flex:1; position:relative; overflow:hidden;
        border-top:1px solid rgba(253,224,141,0.2);
    `;

    // IFRAME — loda ainihin comments.html ɗinka
    const iframe = document.createElement('iframe');
    iframe.src = `comments.html?postId=${postId}`;
    iframe.style.cssText = `
        width:100%; height:100%;
        border:none; display:block;
        background:#000;
    `;
    commentsHalf.appendChild(iframe);
   let startY = 0;
let isDragging = false;

commentsHalf.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    isDragging = true;
}, { passive: true });

commentsHalf.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    const endY = e.changedTouches[0].clientY;
    const swipeUp = startY - endY;
    
    if (swipeUp > 60) {
        // Faɗaɗa iframe ya cika screen
        videoHalf.style.transition = 'flex 0.3s ease';
        videoHalf.style.flex = '0 0 0%';
        videoHalf.style.overflow = 'hidden';
        commentsHalf.style.transition = 'flex 0.3s ease';
        commentsHalf.style.flex = '1';

        // Chevron-down don koma split-view
        const backToSplit = document.createElement('button');
        backToSplit.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
        backToSplit.style.cssText = `
            position:absolute; top:10px; left:12px;
            width:32px; height:32px; border-radius:50%;
            background:rgba(0,0,0,0.5); border:none;
            color:#fde08d; font-size:14px; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
            z-index:999; backdrop-filter:blur(8px);
        `;
        backToSplit.onclick = () => {
            videoHalf.style.flex = '0 0 42%';
            videoHalf.style.overflow = 'hidden';
            commentsHalf.style.flex = '1';
            backToSplit.remove();
        };
        commentsHalf.appendChild(backToSplit);
    }
    isDragging = false;
}, { passive: true });
   

    splitDiv.appendChild(videoHalf);
    splitDiv.appendChild(commentsHalf);
    document.body.appendChild(splitDiv);
document.body.style.overflow = 'hidden';
   // Boye footer da header
document.getElementById('instaFooter').classList.add('footer-hidden');
document.getElementById('cyberMenu').style.display = 'none';
document.getElementById('CyberDropdown').classList.remove('Active');

    if (navigator.vibrate) navigator.vibrate([15,10,15]);
};
    

 // ============================================================
// 7. SHARED toggleImmersive — Don dukkan pages su iya amfani
// ============================================================
window.toggleImmersive = function(card) {
    if (event && event.target.closest('.interaction-bar')) return;
    if (event && event.target.closest('.post-interaction-bar')) return;
    if (event && event.target.closest('.header-actions')) return;
    if (event && event.target.closest('.follow-text-link')) return;
    if (event && event.target.closest('.gift-btn-nexus')) return;
    if (event && event.target.closest('a')) return;

    const video = card.querySelector('video');
    const footer = document.getElementById('instaFooter');

    if (!card.classList.contains('immersive-mode')) {
        card.style.minHeight = card.offsetHeight + 'px';
        card._savedScrollTop = window.scrollY || window.pageYOffset;
        card.classList.add('immersive-mode');

        if (footer) footer.classList.add('footer-hidden');

        if (video) {
            video.style.cssText = `
                position: fixed !important;
                top: 0 !important; left: 0 !important;
                width: 100vw !important; height: 100vh !important;
                max-height: none !important; min-height: unset !important;
                object-fit: cover !important; border-radius: 0 !important;
                z-index: 4999 !important; background: #000 !important; margin: 0 !important;
            `;
            video.muted = false;
            video.onclick = function(e) {
                e.stopPropagation();
                if (video.paused) { video.play(); } else { video.pause(); }
            };
        }

        if (!card.querySelector('.immersive-back-btn')) {
            const backBtn = document.createElement('div');
            backBtn.className = 'immersive-back-btn';
            backBtn.innerHTML = `<i class="fa-solid fa-chevron-left"></i>`;
            backBtn.style.cssText = `
                position: fixed; top: 15px; left: 15px;
                width: 36px; height: 36px;
                background: rgba(0,0,0,0.6); border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 16px;
                z-index: 9999; cursor: pointer;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.3);
            `;
            backBtn.onclick = function(e) { e.stopPropagation(); window.exitImmersive(card); };
            document.body.appendChild(backBtn);
        }

        // ← WANNAN NE AKA ƘARA — Fara immersive scroll idan video ne
        if (video && typeof window.nexusImmersiveStart === 'function') {
            window.nexusImmersiveStart(card);
        }

        history.pushState({ immersive: true }, '');
        window.onpopstate = function() {
            const sv = document.getElementById('nexusSplitView');
            if (sv) {
                sv.remove();
                document.body.style.overflow = '';
                if (footer) footer.classList.add('footer-hidden');
                history.pushState({ immersive: true }, '');
                return;
            }
            window.exitImmersive(card);
        };

    } else {
        window.exitImmersive(card);
    }
};


window.exitImmersive = function(card) {
    const video = card.querySelector('video');
    const footer = document.getElementById('instaFooter');

    card.classList.remove('immersive-mode');
    if (footer) footer.classList.remove('footer-hidden');

    if (typeof window.nexusImmersiveStop === 'function') {
        window.nexusImmersiveStop();
    }
    
    if (card._immersiveScrollHandler) {
        document.removeEventListener('touchmove', card._immersiveScrollHandler);
        card._immersiveScrollHandler = null;
    }
    if (card._immersiveTouchStartHandler) {
        document.removeEventListener('touchstart', card._immersiveTouchStartHandler);
        card._immersiveTouchStartHandler = null;
    }
    if (card._immersiveTouchEndHandler) {
        document.removeEventListener('touchend', card._immersiveTouchEndHandler);
        card._immersiveTouchEndHandler = null;
    }

    // Cire swipe overlay
    const overlay = document.getElementById('nexus-swipe-overlay');
    if (overlay) overlay.remove();

    const backBtn = document.querySelector('.immersive-back-btn');
    if (backBtn) backBtn.remove();

    if (video) {
        video.style.cssText = '';
        video.onclick = null;
    }

    card.style.minHeight = '';

    if (card._savedScrollTop !== undefined) {
        window.scrollTo({ top: card._savedScrollTop, behavior: 'auto' });
    }

    window.onpopstate = null;
};

// ============================================================
// 8. VIDEO OBSERVER & SOUND CONTROL — Central Command
// ============================================================

window.nexusVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const vid = entry.target;
        const card = vid.closest('.post-card');
        if (entry.isIntersecting) {
            if (window.nexusCurrentVideo && window.nexusCurrentVideo !== vid) {
                window.nexusCurrentVideo.pause();
                window.nexusCurrentVideo.muted = true;
                window.nexusCurrentVideo.currentTime = 0;
                const prevCard = window.nexusCurrentVideo.closest('.post-card');
                if (prevCard) {
                    const prevIcon = prevCard.querySelector('.post-mute-toggle i');
                    if (prevIcon) prevIcon.className = 'fa-solid fa-volume-xmark';
                }
            }
            vid.muted = !window.nexusGlobalSound;
            vid.play().catch(() => {});
            window.nexusCurrentVideo = vid;
            if (card) {
                const icon = card.querySelector('.post-mute-toggle i');
                if (icon) icon.className = window.nexusGlobalSound
                    ? 'fa-solid fa-volume-high'
                    : 'fa-solid fa-volume-xmark';
            }
        } else {
            vid.pause(); vid.muted = true; vid.currentTime = 0;
            if (card) {
                const icon = card.querySelector('.post-mute-toggle i');
                if (icon) icon.className = 'fa-solid fa-volume-xmark';
            }
            if (window.nexusCurrentVideo === vid) window.nexusCurrentVideo = null;
        }
    });
}, { threshold: [0, 0.1] });

// Global sound state
window.nexusGlobalSound = false;
window.nexusCurrentVideo = null;

// Toggle sound — ana kiran sa daga post card mute button
window.postCard_toggleVideoSound = function(event, element) {
    event.stopPropagation();
    const video = element.previousElementSibling;
    if (!video || video.tagName !== 'VIDEO') return;

    const card = element.closest('.post-card');
    const icon = element.querySelector('i');
    window.nexusGlobalSound = !window.nexusGlobalSound;

    if (window.nexusGlobalSound) {
        // Mute duk sauran videos
        document.querySelectorAll('video').forEach(other => {
            if (other !== video) {
                other.muted = true;
                const otherIcon = other.closest('.post-card')?.querySelector('.post-mute-toggle i');
                if (otherIcon) otherIcon.className = 'fa-solid fa-volume-xmark';
            }
        });
        video.muted = false;
        if (icon) icon.className = 'fa-solid fa-volume-high';
    } else {
        video.muted = true;
        if (icon) icon.className = 'fa-solid fa-volume-xmark';
    }
};

// Observe videos bayan an render posts
window.postCard_observeVideos = function() {
    window.nexusVideoObserver.disconnect();
    document.querySelectorAll('video.post-media, video').forEach(vid => {
        vid.muted = true;
        window.nexusVideoObserver.observe(vid);
    });
};

// Priority — video mafi kusa da tsakiyar screen ya yi play
window.postCard_handleVideoPriority = function() {
    const videos = document.querySelectorAll('.post-media');
    let focusVideo = null;
    let minDistance = Infinity;
    const screenCenter = window.innerHeight / 2;

    videos.forEach(video => {
        if (video.tagName !== 'VIDEO') return;
        const rect = video.getBoundingClientRect();
        const videoCenter = rect.top + rect.height / 2;
        const distance = Math.abs(screenCenter - videoCenter);
        if (rect.top < window.innerHeight && rect.bottom > 0 && distance < minDistance) {
            minDistance = distance;
            focusVideo = video;
        }
        if (video !== focusVideo) video.pause();
    });

    if (focusVideo) focusVideo.play().catch(() => {});
};

window.stopProp = function(e) { e.stopPropagation(); };

window.triggerPulse = function(btn, e) {
    if (e) e.stopPropagation();
    const icon = btn.querySelector('i');
    const tokenDisplay = document.getElementById('token-count');
    if (icon.classList.contains('fa-regular')) {
        icon.classList.replace('fa-regular', 'fa-solid');
        icon.style.color = "#ff4757";
        if (navigator.vibrate) navigator.vibrate(50);
        if (tokenDisplay) {
            let t = parseFloat(tokenDisplay.innerText) || 0;
            t += 0.0005;
            tokenDisplay.innerText = t.toFixed(4) + " NT";
        }
    } else {
        icon.classList.replace('fa-solid', 'fa-regular');
        icon.style.color = "#fff";
    }
};

window.openGiftPanel = function(username) {
    alert("Congratulations, you have successfully gifted" + username);
};


window.toggleSave = async function(btn, postId) {
    const icon = btn.querySelector('i');
    const text = btn.querySelector('span');
    icon.classList.toggle('fa-solid');
    icon.classList.toggle('fa-regular');

    const myUser = localStorage.getItem('nexus_user_session') || 'Sadiq_Alhassan';

    if (icon.classList.contains('fa-solid')) {
        text.innerText = "Saved";
        btn.style.color = "var(--premium-gold)";
        if (typeof db !== 'undefined') {
            try {
                await db.collection("saved_posts").doc(`${myUser}_${postId}`).set({
                    userId: myUser, postId: postId,
                    savedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch(e) { console.error("Error saving:", e); }
        }
    } else {
        text.innerText = "Save";
        btn.style.color = "#fff";
        if (typeof db !== 'undefined') {
            try {
                await db.collection("saved_posts").doc(`${myUser}_${postId}`).delete();
            } catch(e) { console.error("Error removing:", e); }
        }
    }
};

// ============================================================
// IMMERSIVE VIDEO SCROLL ENGINE
// ============================================================
(function() {
    const S = {
        oldestCursor: null,
        newestCursor: null,
        isFetchingOld: false,
        isFetchingNew: false,
        hasMoreOld: true,
        seenIds: new Set(),
        BATCH: 5,
    };

    window.nexusImmersiveStart = function(card) {
        const allCards = Array.from(
            document.querySelectorAll('.post-card[data-post-id]')
        ).filter(c => c.querySelector('video'));

        S.seenIds.clear();
        allCards.forEach(c => S.seenIds.add(c.dataset.postId));

        const ids = allCards.map(c => c.dataset.postId);
        if (ids.length > 0) {
            S.newestCursor = ids[0];
            S.oldestCursor = ids[ids.length - 1];
        }

        let touchStartY = 0;
        let touchLastY = 0;

        function onTouchStart(e) {
            touchStartY = e.touches[0].clientY;
            touchLastY = touchStartY;
        }

       
    function onTouchMove(e) {
            if (!card.classList.contains('immersive-mode')) return;
            const currentY = e.touches[0].clientY;
            const direction = currentY > touchLastY ? 'up' : 'down';
            touchLastY = currentY;
            const totalSwipe = currentY - touchStartY;


       // Gyara: Swipe UP (Motsa yatsa sama) = Next Video (Kasa a Feed)
if (totalSwipe < -80 && !S._swiping) {
    S._swiping = true;
    goToNextVideo(card);
    setTimeout(() => { S._swiping = false; }, 600);
}

// Gyara: Swipe DOWN (Motsa yatsa kasa) = Previous Video (Sama a Feed)
if (totalSwipe > 80 && !S._swiping) {
    S._swiping = true;
    goToPreviousVideo(card);
    setTimeout(() => { S._swiping = false; }, 600);
} 
        }

       
        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: true });

        card._immersiveScrollHandler = onTouchMove;
        card._immersiveTouchStartHandler = onTouchStart;

        // Sanya transparent overlay a saman video don catch swipes
        let swipeOverlay = document.getElementById('nexus-swipe-overlay');
        if (!swipeOverlay) {
            swipeOverlay = document.createElement('div');
            swipeOverlay.id = 'nexus-swipe-overlay';
            swipeOverlay.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100vw; height: 100vh;
                z-index: 6000;
                background: transparent;
            `;
            document.body.appendChild(swipeOverlay);
        }

        swipeOverlay.addEventListener('touchstart', onTouchStart, { passive: true });
        swipeOverlay.addEventListener('touchmove', onTouchMove, { passive: true });
        card._swipeOverlay = swipeOverlay;

        function onTouchEnd() {
            touchStartY = 0;
            touchLastY = 0;
        }

        document.addEventListener('touchend', onTouchEnd, { passive: true });
        swipeOverlay.addEventListener('touchend', onTouchEnd, { passive: true });
        card._immersiveTouchEndHandler = onTouchEnd;

    };  // ← RUFE nexusImmersiveStart
   
    window.nexusImmersiveStop = function() {
        S.isFetchingOld = false;
        S.isFetchingNew = false;
    };
   

   
 function goToNextVideo(currentCard) {
    const cards = Array.from(
        document.querySelectorAll('.post-card[data-post-id]')
    ).filter(c => c.querySelector('video'));

    // Nemo ta postId — mafi aminci
    const currentPostId = currentCard.dataset.postId;
    const currentIndex = cards.findIndex(c => c.dataset.postId === currentPostId);

    if (currentIndex === -1) return;

    const nextCard = cards[currentIndex + 1];

    if (!nextCard) {
        fetchOlderVideos().then(() => {
            const updated = Array.from(
                document.querySelectorAll('.post-card[data-post-id]')
            ).filter(c => c.querySelector('video'));
            const newNext = updated[currentIndex + 1];
            if (newNext) swapImmersiveVideo(currentCard, newNext);
        });
        return;
    }
    swapImmersiveVideo(currentCard, nextCard);
}


    function goToPreviousVideo(currentCard) {
        const cards = Array.from(
            document.querySelectorAll('.post-card[data-post-id]')
        ).filter(c => c.querySelector('video'));

        const currentPostId = currentCard.dataset.postId;
        const currentIndex = cards.findIndex(c => c.dataset.postId === currentPostId);

        if (currentIndex <= 0) return; 
        const prevCard = cards[currentIndex - 1];

        if (prevCard) {
            swapImmersiveVideo(currentCard, prevCard);
        }
    }

    function swapImmersiveVideo(oldCard, newCard) {
        window.exitImmersive(oldCard);
        setTimeout(() => {
            window.toggleImmersive(newCard);
        }, 50);
    }

    async function fetchOlderVideos() {
        if (S.isFetchingOld || !S.hasMoreOld || typeof db === 'undefined') return;
        S.isFetchingOld = true;
        try {
            const lastDoc = await db.collection('posts').doc(S.oldestCursor).get();
            const snap = await db.collection('posts')
                .orderBy('timestamp', 'desc')
                .startAfter(lastDoc)
                .limit(S.BATCH)
                .get();

            if (snap.empty) {
                S.hasMoreOld = false;
                return;
            }
            const container = document.getElementById('timeline-area') || document.querySelector('.feed-container');
            if (!container) return;

            snap.forEach(doc => {
                const postData = doc.data();
                postData.id = doc.id;
                if (!S.seenIds.has(doc.id)) {
                    S.seenIds.add(doc.id);
                    if (postData.mediaType === 'video') {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = window.generatePostHTML(postData);
                        container.appendChild(tempDiv.firstElementChild);
                    }
                }
            });
            const updatedCards = Array.from(container.querySelectorAll('.post-card[data-post-id]'));
            if (updatedCards.length > 0) {
                S.oldestCursor = updatedCards[updatedCards.length - 1].dataset.postId;
            }
            window.postCard_observeVideos();
        } catch(e) {
            console.error("Error loading older videos:", e);
        } {
            S.isFetchingOld = false;
        }
    }

    async function fetchNewerVideos() {
        if (S.isFetchingNew || typeof db === 'undefined') return;
        S.isFetchingNew = true;
        try {
            const firstDoc = await db.collection('posts').doc(S.newestCursor).get();
            const snap = await db.collection('posts')
                .orderBy('timestamp', 'desc')
                .endBefore(firstDoc)
                .get();

            if (snap.empty) return;
            const container = document.getElementById('timeline-area') || document.querySelector('.feed-container');
            if (!container) return;

            snap.forEach(doc => {
                const postData = doc.data();
                postData.id = doc.id;
                if (!S.seenIds.has(doc.id)) {
                    S.seenIds.add(doc.id);
                    if (postData.mediaType === 'video') {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = window.generatePostHTML(postData);
                        container.insertBefore(tempDiv.firstElementChild, container.firstChild);
                    }
                }
            });
            const updatedCards = Array.from(container.querySelectorAll('.post-card[data-post-id]'));
            if (updatedCards.length > 0) {
                S.newestCursor = updatedCards[0].dataset.postId;
            }
            window.postCard_observeVideos();
        } catch(e) {
            console.error("Error loading newer videos:", e);
        } {
            S.isFetchingNew = false;
        }
    }
})(); // Wannan shi ne rufe baki dayan babban block din
           
  
       
console.log('[PostCard] Shared template loaded ✓');
