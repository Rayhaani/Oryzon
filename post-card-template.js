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
       
       /* ===== PINNED TAG (NEW) — karamin pin-icon kadai, a top-right corner ===== */  
        .post-pinned-tag {
            position: absolute !important;
            top: 0px !important;
            right: 0px !important;
            z-index: 11 !important;
            width: 18px !important;
            height: 18px !important;
            border-radius: 50% !important;
            background: var(--premium-gold) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.45) !important;
            padding: 0 !important;
            font-size: 0 !important;
            gap: 0 !important;
        }
        .post-pinned-tag i {
            color: #1e1e1e !important;
            font-size: 10.5px !important;
            transform: rotate(35deg) !important;
        }
        /* ===== SPONSORED / BOOST TAG (NEW) ===== */
        .post-boost-tag {
            position: absolute !important;
            top: 10px !important;
            left: 10px !important;
            background: rgba(0,0,0,0.55) !important;
            backdrop-filter: blur(6px) !important;
            color: var(--premium-gold) !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            padding: 4px 9px !important;
            border-radius: 20px !important;
            border: 1px solid rgba(253,224,141,0.35) !important;
            z-index: 6 !important;
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
        }

        /* ===== LIVE TRANSLATE LINK (NEW) ===== */
        .post-translate-link {
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            margin: 0 14px 6px 14px !important;
            font-size: 11.5px !important;
            font-weight: 700 !important;
            color: #4fb0ff !important;
            cursor: pointer !important;
        }

        /* ===== LOCKED / TIME-CAPSULE BOX (NEW) ===== */
        .post-locked-box {
            margin: 10px 14px 14px 14px !important;
            border-radius: 14px !important;
            overflow: hidden !important;
            position: relative !important;
            background: linear-gradient(135deg, rgba(99,102,241,0.16), rgba(236,72,153,0.1)) !important;
            border: 1px solid rgba(167,139,250,0.35) !important;
            padding: 22px 16px !important;
            text-align: center !important;
        }
        .post-locked-icon { font-size: 26px !important; color: #a78bfa !important; margin-bottom: 8px !important; display: block !important; }
        .post-locked-title { font-size: 13.5px !important; font-weight: 800 !important; color: #fff !important; }
        .post-locked-subtitle { font-size: 11.5px !important; color: rgba(255,255,255,0.55) !important; margin-top: 4px !important; }
        .post-locked-countdown { margin-top: 10px !important; display: inline-flex !important; gap: 6px !important; }
        .post-locked-countdown span { background: rgba(0,0,0,0.35) !important; padding: 5px 8px !important; border-radius: 8px !important; font-size: 12px !important; font-weight: 800 !important; color: #fde08d !important; font-family: 'Orbitron', 'Plus Jakarta Sans', sans-serif !important; }

        /* ===== POST HEADER ===== */
        .post-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0 15px 0 48px !important;
            height: 46px !important;
            position: relative !important;
            
            /* === Kawai wannan biyu aka canza === */
            background: rgba(245, 245, 247, 0.22) !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;          
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

    /* ✅ Bar din kansa babu background — capsules ne kadai ke da bayyanannen background */
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

        /* ===== REACTION PICKER (NEW) ===== */
        .post-reaction-picker {
            position: absolute !important;
            bottom: 100% !important;
            left: 0 !important;
            margin-bottom: 8px !important;
            background: #14151d !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            border-radius: 30px !important;
            display: none;
            align-items: center !important;
            gap: 4px !important;
            padding: 6px 8px !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
            z-index: 60 !important;
        }
        .post-reaction-picker.open { display: flex !important; }
        .post-reaction-picker span {
            font-size: 21px !important;
            cursor: pointer !important;
            transition: transform 0.15s ease !important;
            display: inline-block !important;
        }
        .post-reaction-picker span:active { transform: scale(1.4) !important; }

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
            display: flex; align-items: center; gap: 4px;
            background: linear-gradient(145deg, #1a1a1a, #0d0d0d); 
            border: 1px solid rgba(253, 224, 141, 0.2); 
            padding: 0 8px; height: 26px; border-radius: 8px; cursor: pointer;
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
    display: inline-block !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
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

// 4b. SHARED HELPER — Live translate a single post (NEW)
window.postCard_toggleTranslate = function(event, postId) {
    event.stopPropagation();
    const textEl = document.querySelector(`.post-card[data-post-id="${postId}"] .post-content`);
    const linkEl = document.querySelector(`.post-card[data-post-id="${postId}"] .post-translate-link span`);
    if (!textEl || !linkEl) return;

    if (!textEl.dataset.original) textEl.dataset.original = textEl.textContent;

    const translated = textEl.dataset.translated === '1';
    if (translated) {
        textEl.textContent = textEl.dataset.original;
        textEl.dataset.translated = '0';
        linkEl.textContent = 'See translation';
    } else {
        textEl.textContent = textEl.dataset.original + ' [Auto-translated ✨]';
        textEl.dataset.translated = '1';
        linkEl.textContent = 'See original';
    }
};

// 4d. SHARED HELPER — Locked / Time-Capsule countdown (NEW)
// Drives every `.post-locked-countdown[data-unlock]` element on the page
// from a single interval, however many locked posts are rendered.
window.postCard_initLockedCountdowns = function() {
    function tick() {
        document.querySelectorAll('.post-locked-countdown[data-unlock]').forEach(el => {
            const target = parseInt(el.dataset.unlock, 10);
            if (!target) return;
            const diff = Math.max(0, target - Date.now());
            const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
            const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
            el.innerHTML = `<span>${h}</span><span>${m}</span><span>${s}</span>`;
        });
    }
    tick();
    if (window.__postCardLockedCountdownInterval) clearInterval(window.__postCardLockedCountdownInterval);
    window.__postCardLockedCountdownInterval = setInterval(tick, 1000);
};

// 4c. SHARED HELPER — Multi-reaction picker (NEW, layers on top of the
//     existing single-heart like button without changing its Firestore sync)
window.POST_REACTIONS = [
    { key: 'like', emoji: '👍' },
    { key: 'love', emoji: '❤️' },
    { key: 'care', emoji: '🥰' },
    { key: 'haha', emoji: '😂' },
    { key: 'wow',  emoji: '😮' },
    { key: 'sad',  emoji: '😢' }
];
let postCard_longPressTimer = null;
window.postCard_startLongPress = function(postId) {
    postCard_longPressTimer = setTimeout(() => window.postCard_openReactionPicker(postId), 380);
};
window.postCard_endLongPress = function() {
    clearTimeout(postCard_longPressTimer);
};
window.postCard_openReactionPicker = function(postId) {
    document.querySelectorAll('.post-reaction-picker').forEach(p => p.classList.remove('open'));
    const picker = document.getElementById(`reactpicker-${postId}`);
    if (picker) picker.classList.add('open');
};
window.postCard_pickReaction = function(event, postId, emoji) {
    event.stopPropagation();
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const likeBtn = card ? card.querySelector('.post-capsule, .capsule') : null;
    if (likeBtn) {
        likeBtn.classList.add('liked');
        const icon = likeBtn.querySelector('i');
        if (icon) icon.outerHTML = `<span style="font-size:14px;line-height:1;">${emoji}</span>`;
    }
    const picker = document.getElementById(`reactpicker-${postId}`);
    if (picker) picker.classList.remove('open');
};
document.addEventListener('click', function (e) {
    if (!e.target.closest('.post-capsule, .capsule')) {
        document.querySelectorAll('.post-reaction-picker').forEach(p => p.classList.remove('open'));
    }
});


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

        const boostTagHTML = post.boosted
            ? `<div class="post-boost-tag"><i class="fa-solid fa-rocket"></i> Sponsored</div>`
            : '';

        if (post.mediaType === 'video') {
            mediaWrapperHTML = `
                <div style="position:relative;">
                    ${boostTagHTML}
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
            mediaWrapperHTML = `<div style="position:relative;">${boostTagHTML}<img src="${fastUrl}" class="post-media" loading="lazy" alt="post image"></div>`;
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
  
   // --- Is the current viewer the person who made this post? (NEW) ---
    // Follow & Gift buttons should only show to OTHER members, never to the poster themself.
    const currentViewer = (typeof localStorage !== 'undefined') ? localStorage.getItem('nexus_user_session') : null;
    const normalizeName = (s) => (s || '').toString().trim().toLowerCase();
    const isOwnPost = !!(
        (currentViewer && post.username && normalizeName(currentViewer) === normalizeName(post.username))
        || (typeof window !== 'undefined' && window.CURRENT_PAGE_OWNER && normalizeName(window.CURRENT_PAGE_OWNER) === normalizeName(post.username))
    );
    const followButtonHTML = isOwnPost
        ? ''
        : `<div class="gift-btn-nexus follow-btn-nexus" onclick="handleFollowBtn(this)" style="cursor: pointer;">
        <span style="font-size: 10px; font-weight: 600; color: #ffffff;">Follow</span>
    </div>`;
    const giftButtonHTML = isOwnPost
        ? ''
        : `<div class="gift-btn-nexus" onclick="openGiftPanel('${post.username}')">
                    <span class="gift-emoji">🎁</span>
                    <span style="font-size: 10px;">Gift</span>
                </div>`;
   
   // --- Pinned tag (NEW) ---
    const pinnedTagHTML = post.pinned
        ? `<div class="post-pinned-tag"><i class="fa-solid fa-thumbtack"></i> Pinned post</div>`
        : '';

    // --- Locked / Time-Capsule box (NEW) — replaces content+media when post.locked is true ---
    const lockedBoxHTML = post.locked
        ? `<div class="post-locked-box">
            <i class="fa-solid fa-box-archive post-locked-icon"></i>
            <div class="post-locked-title">${post.lockedTitle || 'A message unlocks for followers soon'}</div>
            <div class="post-locked-subtitle">${post.lockedSubtitle || 'Time-Capsule Post'}</div>
            ${post.unlockAt ? `<div class="post-locked-countdown" data-unlock="${new Date(post.unlockAt).getTime()}"></div>` : ''}
        </div>`
        : '';

    // --- Reaction picker markup (NEW, sits on the existing like capsule) ---
    const reactionPickerHTML = `
        <div class="post-reaction-picker" id="reactpicker-${postId}">
            ${window.POST_REACTIONS.map(r => `<span onclick="postCard_pickReaction(event,'${postId}','${r.emoji}')">${r.emoji}</span>`).join('')}
        </div>`;

    return `
    <div class="post-card" data-post-id="${postId}" onclick="
        const media = this.querySelector('.post-media');
        if(media && media.tagName === 'VIDEO' && typeof toggleImmersive === 'function') toggleImmersive(this);
    ">
        ${pinnedTagHTML}
                  <div class="post-header">
            <a href="me.html?user=${encodeURIComponent(post.username || '')}"
               style="position:absolute; left:0; top:0; width:54px; height:54px; display:block; z-index:20; text-decoration:none;">
                <img src="${avatarUrl}"
                     class="post-avatar"
                     loading="lazy"
                     alt="${post.username}">
            </a>

                       <div class="post-username-row" style="display: flex !important; flex-direction: column !important; justify-content: center !important; flex: 1 !important; min-width: 0 !important; background: none !important; border: none !important; padding: 0 !important; margin: 0 0 0 2px !important;">
                <div>
                    <!-- Username an kara masa girma da 2px (Ya koma 18px) -->
                    <div style="display:flex; align-items:center; gap:5px; line-height:1.2; min-width:0;">
                      <span class="post-username" style="font-size:15px !important; font-weight:800; color:#fff; display:inline-block; flex:1 1 auto; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${post.username || 'unknown'}</span>                 
                       <span class="post-verified-badge" style="margin-left: 5px; display: inline-flex; align-items: center; vertical-align: middle; flex-shrink: 0;">
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
                        return `<span class="post-time" style="font-size:11px !important; font-weight: 700 !important; color:rgba(255,255,255,0.45); margin-top:4px; display:block; line-height:1; white-space: nowrap !important; text-transform: ${transformStyle} !important;">${cleanTime}</span>`;
                          })() : ''}
                    
                    
                </div>
            </div>
            
            
                        
                <div class="header-actions" onclick="stopProp(event)" style="display: flex; align-items: center; gap: 8px;">
    ${followButtonHTML}

                
                ${giftButtonHTML}
            </div> 
            
            <div onclick="event.stopPropagation(); openNeuralMenu();"
                 style="font-size: 16px; cursor: pointer; padding: 0 2px; display: flex; align-items: center; gap: 2px;">
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
        ${post.locked ? lockedBoxHTML : `
        ${post.content ? `<div class="post-content">${post.content}</div>` : ''}
        ${post.translatable ? `<div class="post-translate-link" onclick="postCard_toggleTranslate(event,'${postId}')"><i class="fa-solid fa-language"></i> <span>See translation</span></div>` : ''}

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
        `}

        <div class="post-interaction-bar" onclick="stopProp(event)">
            <div class="post-action-capsules">
               
                <div class="post-capsule"
                    onclick="
                    const btn = this;
                    const icon = btn.querySelector('i');
                    if(!icon){ return; }
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
                "
                    oncontextmenu="event.preventDefault(); postCard_openReactionPicker('${postId}')"
                    ontouchstart="postCard_startLongPress('${postId}')"
                    ontouchend="postCard_endLongPress()"
                >
                    <i class="fa-regular fa-heart"></i>
                    <span>${likes}</span>
                    ${reactionPickerHTML}
                </div>
               
                    <div class="post-capsule" onclick="event.stopPropagation(); handleCommentBtn('${post.id}', event)" id="comment-btn-${post.id}">
                     <i class="fa-regular fa-comment"></i>
                    <span id="comment-count-${post.id}">${comments}</span>
                </div>

               <div class="post-capsule"><i class="fa-solid fa-arrows-rotate"></i><span>5</span></div>
                <div class="post-capsule"><i class="fa-regular fa-paper-plane"></i></div>
                ${post.isAdmin ? `<div class="post-capsule" onclick="event.stopPropagation(); if(typeof openModal==='function') openModal('boostModal'); else showToast && showToast('🚀 Boost this post')"><i class="fa-solid fa-rocket"></i><span>Boost</span></div>` : ''}
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


// IMMERSIVE VIDEO SCROLL ENGINE - UP/DOWN SWIPE AUTOMATION
(function() {
    const S = { _swiping: false };

    window.nexusImmersiveStart = function(card) {
        let touchStartY = 0;
        function onTouchStart(e) { touchStartY = e.touches[0].clientY; }
       
        function onTouchMove(e) {
            if (!card.classList.contains('immersive-mode')) return;
            const currentY = e.touches[0].clientY;
            const totalSwipe = currentY - touchStartY;

            if (totalSwipe < -80 && !S._swiping) {
                S._swiping = true;
                goToNextVideo(card);
                setTimeout(() => { S._swiping = false; }, 600);
            }
            if (totalSwipe > 80 && !S._swiping) {
                S._swiping = true;
                goToPreviousVideo(card);
                setTimeout(() => { S._swiping = false; }, 600);
            } 
        }

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: true });
    };

    function goToNextVideo(currentCard) {
        const cards = Array.from(document.querySelectorAll('.post-card')).filter(c => c.querySelector('video'));
        const currentIndex = cards.indexOf(currentCard);
        
        if (currentIndex !== -1 && cards[currentIndex + 1]) {
            // 1. Kashe bidiyon yanzu kafin a tsallaka
            const currentVid = currentCard.querySelector('video');
            if (currentVid) {
                currentVid.pause();
                currentVid.muted = true;
            }
            
            window.exitImmersive(currentCard);
            window.toggleImmersive(cards[currentIndex + 1]);
        }
    }

    function goToPreviousVideo(currentCard) {
        const cards = Array.from(document.querySelectorAll('.post-card')).filter(c => c.querySelector('video'));
        const currentIndex = cards.indexOf(currentCard);
        
        if (currentIndex > 0) {
            // 1. Kashe bidiyon yanzu kafin a koma baya
            const currentVid = currentCard.querySelector('video');
            if (currentVid) {
                currentVid.pause();
                currentVid.muted = true;
            }
            
            window.exitImmersive(currentCard);
            window.toggleImmersive(cards[currentIndex - 1]);
        }
    }
})();

// ============================================================
// 9. NEXUS COMMENT OVERLAY — Cikakken tsarin comments na cikin
//    gida (NATIVE, ba iframe ba, ba window.location.href ba).
//
//    Ana amfani da shi DUKA a NORMAL mode (bottom-sheet cikakke)
//    da IMMERSIVE mode (split-view: video 42% + comments 58%).
//    Yana amfani da `db` din da page (social.html/me.html) ya
//    riga ya kirkira — BABU sake yin firebase.initializeApp.
//
//    Firestore schema: nexus_contributions
//      { author, text, postId, parentId, timestamp, likes }
//    (Daidai da tsohon comments.html domin comments da suka
//     riga suka wanzu su nuna daidai)
// ============================================================
(function () {

    let nexcmBuilt = false;
    let nexcmCurrentPostId = null;
    let nexcmUnsub = null;
    let nexcmMode = 'normal';
    let nexcmTargetReplyId = null;
    let nexcmActiveReplyUser = '';
    let nexcmCurrentOverlayTargetId = '';
    let nexcmOverlayActiveUser = '';

    function nexcmCurrentUsername() {
        return localStorage.getItem('nexus_user_session') || 'Anonymous';
    }
    function nexcmCurrentAvatarUrl() {
        const u = nexcmCurrentUsername();
        return localStorage.getItem('userProfilePic') || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(u));
    }

    function injectNexcmStyles() {
        if (document.getElementById('nexcm-styles')) return;
        const style = document.createElement('style');
        style.id = 'nexcm-styles';
        style.textContent = `
            .nexcm-overlay {
                position: fixed; inset: 0; z-index: 9000;
                display: none; flex-direction: column;
                background: rgba(0,0,0,0.75);
            }
            .nexcm-overlay.nexcm-open { display: flex; }

            .nexcm-video-half {
                display: none;
                flex: 0 0 42%;
                position: relative;
                background: #000;
                overflow: hidden;
            }
            .nexcm-overlay.nexcm-immersive .nexcm-video-half { display: block; }

            #nexcmMediaSlot { width: 100%; height: 100%; }
            #nexcmMediaSlot video, #nexcmMediaSlot img { width: 100%; height: 100%; object-fit: cover; display: block; }

            .nexcm-video-close {
                position: absolute; top: 10px; left: 12px;
                width: 32px; height: 32px; border-radius: 50%;
                background: rgba(0,0,0,0.6); border: none; color: #fff;
                font-size: 15px; cursor: pointer; display: flex;
                align-items: center; justify-content: center;
                z-index: 10; backdrop-filter: blur(8px);
                border: 1px solid rgba(255,255,255,0.2);
            }

            .nexcm-mini-info {
                position: absolute; bottom: 0; left: 0; right: 0;
                padding: 10px 14px;
                background: linear-gradient(transparent, rgba(0,0,0,0.85));
                display: flex; align-items: center; gap: 8px;
            }
            .nexcm-mini-avatar { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid #fde08d; object-fit: cover; }
            .nexcm-mini-username { color: #fff; font-size: 13px; font-weight: 700; }

            .nexcm-panel {
                flex: 1; min-height: 0;
                background-color: #050505 !important;
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                border-top: 1px solid rgba(253,224,141,0.15);
                border-radius: 22px 22px 0 0;
                display: flex; flex-direction: column;
                position: relative; overflow: hidden;
                transform: translateY(100%);
                transition: transform 0.35s cubic-bezier(0.165,0.84,0.44,1);
                max-height: 100%;
            }
            .nexcm-overlay.nexcm-open .nexcm-panel { transform: translateY(0); }

            .nexcm-node-header {
                display: flex; align-items: center; justify-content: center;
                padding: 10px 10px 6px; position: relative; flex-shrink: 0;
            }
            .nexcm-node-header::before {
                content: ''; position: absolute; top: 5px;
                width: 35px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px;
            }
            .nexcm-back-btn { background: transparent; border: none; color: #00f2fe; font-size: 16px; cursor: pointer; }
            .nexcm-node-header .nexcm-back-btn { position: absolute; left: 10px; }
            .nexcm-node-title { font-family: 'Montserrat', sans-serif; font-size: 15px; font-weight: 600; color: #f5f5f7; margin-top: 6px; }

            .nexcm-matrix-feed { flex-grow: 1; overflow-y: auto; padding: 0 14px 10px; scrollbar-width: none; }
            .nexcm-matrix-feed::-webkit-scrollbar { display: none; }

            .nexcm-comment-card {
           position: relative; padding: 6px 12px 4px; border-radius: 16px;
           margin-bottom: 9px; background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.04);
            }
            .nexcm-comment-card.positive { background: rgba(80,250,123,0.15); border-right: 3px solid #50fa7b; }
            .nexcm-matrix-feed > .nexcm-comment-card {
                background: transparent !important;
                border: none !important;
                border-radius: 0 !important;
                padding-left: 0; padding-right: 0;
                padding-top: 3px; padding-bottom: 3px;
                margin-bottom: 5px;
            }

            .nexcm-core-layout { display: flex; gap: 12px; position: relative; }
            .nexcm-avatar-frame { position: relative; width: 36px; height: 36px; flex-shrink: 0; }
            .nexcm-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 1.5px solid #00f2fe; padding: 1px; }
            .nexcm-body-cluster { flex-grow: 1; display: flex; flex-direction: column; position: relative; }
            .nexcm-meta-layer { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
            .nexcm-identity-badge { display: flex; align-items: center; gap: 6px; }
            .nexcm-user-name { font-size: 12px; font-weight: 600; color: #fff; font-family: 'Montserrat', sans-serif; }
            .nexcm-author-tag { font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 500; background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85); padding: 1px 6px; border-radius: 10px; }
            .nexcm-text-wrap { position: relative; display: block; padding-bottom: 3px; }
            .nexcm-text-payload { font-size: 12.5px; line-height: 1.5; color: rgba(255,255,255,0.9); text-align: justify; display: inline-block; width: 100%; word-break: break-word; }
            .nexcm-timestamp { font-size: 9px; color: rgba(255,255,255,0.6); position: absolute; bottom: -2px; right: 0; line-height: 1; }
            .nexcm-capsule-bar { display: flex; align-items: center; gap: 12px; margin-top: 2px; }
            .nexcm-action-trigger { background: transparent; border: none; color: rgba(255,255,255,0.6); font-size: 11px; display: flex; align-items: center; gap: 4px; cursor: pointer; }
            .nexcm-action-trigger.liked i { color: #ff4757; }
            .nexcm-nested-replies { margin-top: 10px; padding-left: 14px; border-left: 1px dashed rgba(253,224,141,0.2); display: none; }
            .nexcm-nested-replies:empty { margin-top: 0; }
            .nexcm-nested-replies.show { display: block; }
            .nexcm-view-more-btn { font-size: 11px; color: #00f2fe; background: transparent; border: none; cursor: pointer; margin-top: 8px; display: none; font-weight: 500; }

            .nexcm-replies-overlay {
                position: absolute; inset: 0; background: #000; z-index: 200; padding: 10px;
                display: none; flex-direction: column;
            }
            .nexcm-replies-overlay.active { display: flex; }
            .nexcm-replies-header { display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; padding-bottom: 10px; margin-bottom: 15px; flex-shrink: 0; }
            .nexcm-overlay-feed-body { flex-grow: 1; overflow-y: auto; scrollbar-width: none; padding-bottom: 20px; }
            .nexcm-overlay-replies-holder { position: relative; margin-top: 10px; }
            .nexcm-overlay-feed-body .nexcm-overlay-replies-holder .nexcm-comment-card { margin-left: 35px; width: calc(100% - 35px); display: block !important; margin-bottom: 8px; }
            .nexcm-overlay-feed-body .nexcm-nested-replies, .nexcm-overlay-feed-body .nexcm-view-more-btn { display: none !important; }

            .nexcm-input-harness {
                background: rgba(255,255,255,0.03); border: 1px solid rgba(253,224,141,0.15);
                border-radius: 16px; padding: 8px 12px; display: flex; align-items: center; gap: 10px;
                flex-shrink: 0; margin: 6px 14px 10px; position: relative;
            }
            .nexcm-current-avatar { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #fde08d; object-fit: cover; }
            .nexcm-text-field { flex-grow: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 12.5px; font-family: 'Inter', sans-serif; resize: none; max-height: 110px; overflow-y: auto; line-height: 1.5; padding: 4px 0; scrollbar-width: none; }
            .nexcm-text-field::placeholder { color: rgba(255,255,255,0.3); }
            .nexcm-input-actions { display: flex; align-items: center; gap: 8px; }
            .nexcm-utility-btn { background: transparent; border: none; color: rgba(255,255,255,0.6); font-size: 13px; cursor: pointer; }
            .nexcm-send-btn { background: linear-gradient(135deg,#fde08d,#b8860b); border: none; width: 28px; height: 28px; border-radius: 50%; color: #000; font-size: 11px; display: flex; align-items: center; justify-content: center; cursor: pointer; }

            .nexcm-ai-popup { position: absolute; bottom: 56px; right: 26px; background: rgba(15,20,35,0.95); border: 1px solid #00f2fe; border-radius: 12px; padding: 6px; display: none; flex-direction: column; gap: 4px; z-index: 50; }
            .nexcm-ai-popup.visible { display: flex; }
            .nexcm-ai-option { background: transparent; border: none; color: #fff; font-size: 11.5px; padding: 6px 12px; text-align: left; cursor: pointer; border-radius: 6px; white-space: nowrap; }
            .nexcm-ai-option:hover { background: rgba(0,242,254,0.15); color: #00f2fe; }
            .nexcm-mention-tag { color: #0095f6 !important; font-weight: 600; }
        `;
        document.head.appendChild(style);
    }

    function buildNexcmOverlay() {
        if (nexcmBuilt) return;
        injectNexcmStyles();

        const overlay = document.createElement('div');
        overlay.id = 'nexcmOverlay';
        overlay.className = 'nexcm-overlay';
        overlay.innerHTML = `
            <div id="nexcmVideoHalf" class="nexcm-video-half">
                <div id="nexcmMediaSlot"></div>
                <button class="nexcm-video-close" onclick="closeNexusComments()"><i class="fa-solid fa-chevron-left"></i></button>
                <div class="nexcm-mini-info">
                    <img id="nexcmMiniAvatar" class="nexcm-mini-avatar" alt="">
                    <span id="nexcmMiniUsername" class="nexcm-mini-username"></span>
                </div>
            </div>
            <div id="nexcmPanel" class="nexcm-panel">
                <div class="nexcm-node-header">
                    <button class="nexcm-back-btn" onclick="closeNexusComments()"><i class="fa-solid fa-chevron-down"></i></button>
                    <div class="nexcm-node-title">Comments</div>
                </div>
                <div class="nexcm-matrix-feed" id="nexcmMatrixFeed">
                    <p style="text-align:center;color:#555;padding:20px;font-size:13px;">Loading comments...</p>
                </div>
                <div class="nexcm-replies-overlay" id="nexcmRepliesPanel">
                    <div class="nexcm-replies-header">
                        <button class="nexcm-back-btn" onclick="closeNexcmFullscreenReplies()"><i class="fa-solid fa-arrow-left"></i></button>
                        <div class="nexcm-node-title" style="margin-top:0;">Replies</div>
                    </div>
                    <div class="nexcm-overlay-feed-body" id="nexcmOverlayFeedBody"></div>
                    <div class="nexcm-input-harness" style="margin-top:auto;">
                        <img id="nexcmOverlayAvatar" class="nexcm-current-avatar" src="" alt="">
                        <textarea class="nexcm-text-field" id="nexcmOverlayInput" rows="1" placeholder="Write a reply..."></textarea>
                        <div class="nexcm-input-actions">
                            <button class="nexcm-utility-btn" onclick="toggleNexcmAiMenu('overlay')"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
                            <button class="nexcm-send-btn" onclick="injectNexcmOverlayReply()"><i class="fa-solid fa-paper-plane"></i></button>
                        </div>
                    </div>
                </div>
                <div class="nexcm-ai-popup" id="nexcmAiMenu">
                    <button class="nexcm-ai-option" onclick="applyNexcmAiFeature('optimize')"><i class="fa-solid fa-wand-magic-sparkles"></i> Optimize Text</button>
                    <button class="nexcm-ai-option" onclick="applyNexcmAiFeature('translate')"><i class="fa-solid fa-language"></i> Translate to English</button>
                    <button class="nexcm-ai-option" onclick="applyNexcmAiFeature('clear')"><i class="fa-solid fa-trash-can"></i> Clear Text</button>
                </div>
                <div class="nexcm-input-harness">
                    <img id="nexcmMainAvatar" class="nexcm-current-avatar" src="" alt="">
                    <textarea class="nexcm-text-field" id="nexcmMainInput" rows="1" placeholder="Add a comment..."></textarea>
                    <div class="nexcm-input-actions">
                        <button class="nexcm-utility-btn" id="nexcmAiTriggerBtn" onclick="toggleNexcmAiMenu('main')"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
                        <button class="nexcm-send-btn" onclick="injectNexcmComment()"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) window.closeNexusComments();
        });

        const mainInput = document.getElementById('nexcmMainInput');
        mainInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
            if (nexcmTargetReplyId && !this.value.startsWith(`@${nexcmActiveReplyUser}`)) {
                nexcmTargetReplyId = null; nexcmActiveReplyUser = '';
            }
        });
        mainInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.injectNexcmComment(); }
        });

        document.addEventListener('click', function (e) {
            const menu = document.getElementById('nexcmAiMenu');
            const mainBtn = document.getElementById('nexcmAiTriggerBtn');
            if (!menu || !menu.classList.contains('visible')) return;
            if (!menu.contains(e.target) && !(mainBtn && mainBtn.contains(e.target))) {
                menu.classList.remove('visible');
            }
        });

        nexcmBuilt = true;
    }

    // ============================================================
    // ENTRY POINT — Ana kiran wannan daga comment button na kowane
    // post-card (duka normal da immersive mode)
    // ============================================================
    window.handleCommentBtn = function (postId, event) {
        if (event) event.stopPropagation();
        const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        window.openNexusComments(postId, card);
    };

    window.openNexusComments = function (postId, card) {
        buildNexcmOverlay();

        nexcmCurrentPostId = postId;
        nexcmTargetReplyId = null;
        nexcmActiveReplyUser = '';

        const overlay = document.getElementById('nexcmOverlay');
        const isImmersive = !!(card && card.classList.contains('immersive-mode'));
        nexcmMode = isImmersive ? 'immersive' : 'normal';

        if (isImmersive) {
            overlay.classList.add('nexcm-immersive');
            const mediaSlot = document.getElementById('nexcmMediaSlot');
            mediaSlot.innerHTML = '';
            const origVideo = card.querySelector('video');
            const origImg = card.querySelector('img.post-media');
            if (origVideo) {
                const vid = document.createElement('video');
                vid.src = origVideo.src || origVideo.currentSrc;
                vid.autoplay = true; vid.loop = true; vid.muted = false; vid.playsInline = true;
                mediaSlot.appendChild(vid);
                vid.play().catch(() => {});
            } else if (origImg) {
                const img = document.createElement('img');
                img.src = origImg.src;
                mediaSlot.appendChild(img);
            }
            const avatarEl = card.querySelector('.post-avatar');
            const usernameEl = card.querySelector('.post-username');
            document.getElementById('nexcmMiniAvatar').src = avatarEl ? avatarEl.src : '';
            document.getElementById('nexcmMiniUsername').textContent = usernameEl ? usernameEl.textContent.trim() : '';
        } else {
            overlay.classList.remove('nexcm-immersive');
        }

        document.getElementById('nexcmMainAvatar').src = nexcmCurrentAvatarUrl();
        document.getElementById('nexcmOverlayAvatar').src = nexcmCurrentAvatarUrl();
        document.getElementById('nexcmMainInput').value = '';
        document.getElementById('nexcmRepliesPanel').classList.remove('active');

        overlay.classList.add('nexcm-open');
        document.body.style.overflow = 'hidden';
        const footer = document.getElementById('instaFooter');
        if (footer) footer.classList.add('footer-hidden');
        const cyberMenu = document.getElementById('cyberMenu');
        if (cyberMenu) cyberMenu.style.display = 'none';
        const cyberDropdown = document.getElementById('CyberDropdown');
        if (cyberDropdown) cyberDropdown.classList.remove('Active');

        nexcmLoadComments(postId);
        if (navigator.vibrate) navigator.vibrate([15, 10, 15]);
    };

    window.closeNexusComments = function () {
        const overlay = document.getElementById('nexcmOverlay');
        if (!overlay) return;
        overlay.classList.remove('nexcm-open');
        document.body.style.overflow = '';

        const vid = document.querySelector('#nexcmMediaSlot video');
        if (vid) { vid.pause(); vid.src = ''; }

        // Idan immersive ne, an bar footer/menu a boye — immersive mode
        // yana nan har sai an danna immersive back button don a fita gaba daya
        if (nexcmMode !== 'immersive') {
            const footer = document.getElementById('instaFooter');
            if (footer) footer.classList.remove('footer-hidden');
            const cyberMenu = document.getElementById('cyberMenu');
            if (cyberMenu) cyberMenu.style.display = '';
        }

        if (nexcmUnsub) { nexcmUnsub(); nexcmUnsub = null; }
        nexcmCurrentPostId = null;
    };

    // ============================================================
    // LODA COMMENTS NA WANNAN POST KAWAI (LIVE)
    // ============================================================
    function nexcmLoadComments(postId) {
        const feedContainer = document.getElementById('nexcmMatrixFeed');
        feedContainer.innerHTML = '<p style="text-align:center;color:#555;padding:20px;font-size:13px;">Loading comments...</p>';

        if (nexcmUnsub) nexcmUnsub();

        if (typeof db === 'undefined') {
            feedContainer.innerHTML = '<p style="text-align:center;color:#555;padding:20px;font-size:13px;">Could not load comments.</p>';
            return;
        }

        const currentUser = nexcmCurrentUsername();

        nexcmUnsub = db.collection('nexus_contributions')
            .where('postId', '==', postId)
            .onSnapshot((snapshot) => {
                feedContainer.innerHTML = '';

                let mainComments = [];
                let repliesMap = {};

                snapshot.forEach((doc) => {
                    let data = doc.data();
                    data.id = doc.id;
                    if (data.parentId) {
                        if (!repliesMap[data.parentId]) repliesMap[data.parentId] = [];
                        repliesMap[data.parentId].push(data);
                    } else {
                        mainComments.push(data);
                    }
                });
               mainComments.sort((a, b) => {
                    const ta = a.timestamp && a.timestamp.toMillis ? a.timestamp.toMillis() : Infinity;
                    const tb = b.timestamp && b.timestamp.toMillis ? b.timestamp.toMillis() : Infinity;
                    return tb - ta;
                });

                // Sabuntawa lambar comments a kan post-card (idan yana nan a DOM)
                const countEl = document.getElementById(`comment-count-${postId}`);
                if (countEl) countEl.textContent = mainComments.length;

                if (mainComments.length === 0) {
                    feedContainer.innerHTML = '<p style="text-align:center;color:#555;padding:30px;font-size:13px;">Babu comments tukuna. Ka zama na farko! 💬</p>';
                    return;
                }

                mainComments.forEach((comment) => {
                    let sentimentClass = '';
                    if (comment.text && (comment.text.includes('murna') || comment.text.includes('kyau') || comment.text.includes('santsi'))) {
                        sentimentClass = 'positive';
                    }

                    let commentHTML = `
                        <div class="nexcm-comment-card ${sentimentClass}" id="nexcmCard-${comment.id}">
                            <div class="nexcm-core-layout">
                                <div class="nexcm-avatar-frame">
                                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(comment.author)}" class="nexcm-avatar">
                                </div>
                                <div class="nexcm-body-cluster">
                                    <div class="nexcm-meta-layer">
                                        <div class="nexcm-identity-badge">
                                            <span class="nexcm-user-name">${comment.author}</span>
                                            ${comment.author === currentUser ? '<span class="nexcm-author-tag">Author</span>' : ''}
                                        </div>
                                        <span class="nexcm-timestamp" style="position:static;font-size:10px;">${nexcmFormatTimestamp(comment.timestamp)}</span>
                                    </div>
                                    <div class="nexcm-text-wrap">
                                        <p class="nexcm-text-payload">${nexcmFormatMentions(comment.text)}</p>
                                    </div>
                                    <div class="nexcm-capsule-bar">
                                        <button class="nexcm-action-trigger" onclick="nexcmPulseLike(this)">
                                            <i class="fa-regular fa-heart"></i> <span class="count">${comment.likes || 0}</span>
                                        </button>
                                        <button class="nexcm-action-trigger" onclick="nexcmTriggerReply('${comment.author}', '${comment.id}')">
                                            <i class="fa-regular fa-comment-dots"></i> <span>Reply</span>
                                        </button>
                                        ${comment.author === currentUser ? `<button class="nexcm-action-trigger" style="color:#ff4757;margin-left:10px;" onclick="nexcmRequestDestruction('${comment.id}')"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="nexcm-nested-replies show" id="${comment.id}" style="margin-left:48px;"></div>
                            <button class="nexcm-view-more-btn" id="nexcmViewMoreBtn-${comment.id}" onclick="nexcmLaunchReplies('${comment.id}')" style="margin-left:48px;">View more replies</button>
                        </div>`;

                    feedContainer.insertAdjacentHTML('beforeend', commentHTML);

                     const replyContainer = document.getElementById(comment.id);
                    if (repliesMap[comment.id]) {
                        repliesMap[comment.id].sort((a, b) => {
                            const ta = a.timestamp && a.timestamp.toMillis ? a.timestamp.toMillis() : Infinity;
                            const tb = b.timestamp && b.timestamp.toMillis ? b.timestamp.toMillis() : Infinity;
                            return tb - ta;
                        });
                        repliesMap[comment.id].forEach((reply) => {                           let replyHTML = `
                                <div class="nexcm-comment-card">
                                    <div class="nexcm-core-layout">
                                        <div class="nexcm-avatar-frame" style="width:26px;height:26px;">
                                            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(reply.author)}" class="nexcm-avatar">
                                        </div>
                                        <div class="nexcm-body-cluster">
                                            <div class="nexcm-meta-layer">
                                                <div class="nexcm-identity-badge">
                                                    <span class="nexcm-user-name" style="font-size:11px;">${reply.author}</span>
                                                    ${reply.author === currentUser ? '<span class="nexcm-author-tag" style="font-size:7.5px;">Author</span>' : ''}
                                                </div>
                                            </div>
                                            <div class="nexcm-text-wrap">
                                                <p class="nexcm-text-payload" style="font-size:11.5px;">${nexcmFormatMentions(reply.text)}</p>
                                            </div>
                                            <div class="nexcm-capsule-bar">
                                                <button class="nexcm-action-trigger" onclick="nexcmPulseLike(this)">
                                                    <i class="fa-regular fa-heart"></i> <span class="count">0</span>
                                                </button>
                                                <button class="nexcm-action-trigger" onclick="nexcmTriggerReply('${reply.author}', '${comment.id}')">
                                                    <i class="fa-regular fa-comment-dots"></i> <span>Reply</span>
                                                </button>
                                                ${reply.author === currentUser ? `<button class="nexcm-action-trigger" style="color:#ff4757;" onclick="nexcmRequestDestruction('${reply.id}')"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                                                <span class="nexcm-timestamp" style="font-size:9px;margin-left:auto;position:static;">${nexcmFormatTimestamp(reply.timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
                            replyContainer.insertAdjacentHTML('beforeend', replyHTML);
                        });
                    }

                    nexcmHandleVisibility(replyContainer);
                    nexcmCheckReplyCount(comment.id);
                });

                feedContainer.scrollTop = 0;
            }, () => {
                feedContainer.innerHTML = '<p style="text-align:center;color:#555;padding:20px;font-size:12px;">Could not load comments.</p>';
            });
    }

    // ============================================================
    // AIKA SABON COMMENT
    // ============================================================
    window.injectNexcmComment = function () {
        const commentInput = document.getElementById('nexcmMainInput');
        const commentText = commentInput.value.trim();
        if (!commentText || !nexcmCurrentPostId || typeof db === 'undefined') return;

        const currentUser = nexcmCurrentUsername();

        const newContribution = {
            author: currentUser,
            text: commentText,
            postId: nexcmCurrentPostId,
            parentId: nexcmTargetReplyId || null,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0
        };

        db.collection('nexus_contributions').add(newContribution).then(() => {
            commentInput.value = nexcmTargetReplyId ? `@${nexcmActiveReplyUser} ` : '';
            commentInput.style.height = 'auto';
            if (navigator.vibrate) navigator.vibrate(30);
        }).catch((error) => { console.error('Kuskure: ', error); });
    };

    window.nexcmTriggerReply = function (username, replyFeedId) {
        nexcmTargetReplyId = replyFeedId;
        nexcmActiveReplyUser = username;
        const commentInput = document.getElementById('nexcmMainInput');
        commentInput.value = `@${username} `;
        commentInput.focus();
        commentInput.style.height = 'auto';
        commentInput.style.height = commentInput.scrollHeight + 'px';
        const replyContainer = document.getElementById(replyFeedId);
        if (replyContainer && !replyContainer.classList.contains('show')) {
            replyContainer.classList.add('show');
        }
        if (navigator.vibrate) navigator.vibrate(15);
    };

    window.nexcmLaunchReplies = function (containerId) {
        nexcmCurrentOverlayTargetId = containerId;
        const sourceContainer = document.getElementById(containerId);
        const parentCard = sourceContainer.closest('.nexcm-comment-card');
        const overlay = document.getElementById('nexcmRepliesPanel');
        const overlayBody = document.getElementById('nexcmOverlayFeedBody');

        const parentAvatar = parentCard.querySelector('.nexcm-avatar').src;
        const parentName = parentCard.querySelector('.nexcm-user-name').innerText;
        const parentText = parentCard.querySelector('.nexcm-text-payload').innerText;
        const parentTime = parentCard.querySelector('.nexcm-timestamp').innerText;
        const isPositive = parentCard.classList.contains('positive') ? 'positive' : '';

        let overlayHTML = `
            <div class="nexcm-comment-card ${isPositive}">
                <div class="nexcm-core-layout">
                    <div class="nexcm-avatar-frame">
                        <img src="${parentAvatar}" class="nexcm-avatar">
                    </div>
                    <div class="nexcm-body-cluster">
                        <div class="nexcm-meta-layer">
                            <div class="nexcm-identity-badge">
                                <span class="nexcm-user-name">${parentName}</span>
                            </div>
                            <span class="nexcm-timestamp" style="position:static;font-size:10px;">${parentTime}</span>
                        </div>
                        <div class="nexcm-text-wrap">
                            <p class="nexcm-text-payload">${parentText}</p>
                        </div>
                        <div class="nexcm-capsule-bar">
                            <button class="nexcm-action-trigger" onclick="nexcmPulseLike(this)">
                                <i class="fa-regular fa-heart"></i> <span class="count">0</span>
                            </button>
                            <button class="nexcm-action-trigger" onclick="nexcmTriggerOverlayReply('${parentName}')">
                                <i class="fa-regular fa-comment-dots"></i> <span>Reply</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="nexcm-overlay-replies-holder" id="nexcmOverlayRepliesContainer">`;

        const replies = sourceContainer.querySelectorAll('.nexcm-comment-card');
        replies.forEach(reply => {
            overlayHTML += `<div class="nexcm-comment-card">${reply.innerHTML}</div>`;
        });

        overlayHTML += `</div>`;
        overlayBody.innerHTML = overlayHTML;

        const overlayReplyButtons = overlayBody.querySelectorAll('.nexcm-overlay-replies-holder .nexcm-action-trigger');
        overlayReplyButtons.forEach(btn => {
            if (btn.querySelector('.fa-comment-dots')) {
                const card = btn.closest('.nexcm-comment-card');
                const rName = card.querySelector('.nexcm-user-name').innerText;
                btn.setAttribute('onclick', `nexcmTriggerOverlayReply('${rName}')`);
            }
        });

        overlay.classList.add('active');
        const overlayInput = document.getElementById('nexcmOverlayInput');
        overlayInput.value = '';
        if (navigator.vibrate) navigator.vibrate(25);
    };

    window.nexcmTriggerOverlayReply = function (username) {
        const overlayInput = document.getElementById('nexcmOverlayInput');
        nexcmOverlayActiveUser = username;
        overlayInput.value = `@${username} `;
        overlayInput.focus();
    };

    window.closeNexcmFullscreenReplies = function () {
        document.getElementById('nexcmRepliesPanel').classList.remove('active');
        if (navigator.vibrate) navigator.vibrate(15);
    };

    window.injectNexcmOverlayReply = function () {
        const overlayInput = document.getElementById('nexcmOverlayInput');
        const replyText = overlayInput.value.trim();
        if (!replyText || !nexcmCurrentPostId || typeof db === 'undefined') return;

        const currentUser = nexcmCurrentUsername();
        const savedPic = nexcmCurrentAvatarUrl();

        const overlayRepliesContainer = document.getElementById('nexcmOverlayRepliesContainer');
        const realFeedContainer = document.getElementById(nexcmCurrentOverlayTargetId);

        const replyHTML = `
            <div class="nexcm-comment-card">
                <div class="nexcm-core-layout">
                    <div class="nexcm-avatar-frame" style="width:26px;height:26px;">
                        <img src="${savedPic}" class="nexcm-avatar">
                    </div>
                    <div class="nexcm-body-cluster">
                        <div class="nexcm-meta-layer">
                            <div class="nexcm-identity-badge">
                                <span class="nexcm-user-name" style="font-size:11px;">${currentUser}</span>
                                <span class="nexcm-author-tag" style="font-size:7.5px;">Author</span>
                            </div>
                        </div>
                        <div class="nexcm-text-wrap">
                            <p class="nexcm-text-payload" style="font-size:11.5px;">${replyText}</p>
                        </div>
                        <div class="nexcm-capsule-bar">
                            <button class="nexcm-action-trigger" onclick="nexcmPulseLike(this)">
                                <i class="fa-regular fa-heart"></i> <span class="count">0</span>
                            </button>
                            <button class="nexcm-action-trigger" onclick="nexcmTriggerOverlayReply('${currentUser}')">
                                <i class="fa-regular fa-comment-dots"></i> <span>Reply</span>
                            </button>
                            <span class="nexcm-timestamp" style="font-size:9px;margin-left:auto;position:static;">Just now</span>
                        </div>
                    </div>
                </div>
            </div>`;

    overlayRepliesContainer.insertAdjacentHTML('beforeend', replyHTML);

        db.collection('nexus_contributions').add({
            author: currentUser,
            text: replyText,
            postId: nexcmCurrentPostId,
            parentId: nexcmCurrentOverlayTargetId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0
        });

        if (realFeedContainer) {
            realFeedContainer.insertAdjacentHTML('beforeend', replyHTML);
            nexcmHandleVisibility(realFeedContainer);
            nexcmCheckReplyCount(nexcmCurrentOverlayTargetId);
        }

        overlayInput.value = `@${nexcmOverlayActiveUser} `;
        document.getElementById('nexcmOverlayFeedBody').scrollTop = document.getElementById('nexcmOverlayFeedBody').scrollHeight;
        if (navigator.vibrate) navigator.vibrate(30);
    };

    function nexcmCheckReplyCount(containerId) {
        const container = document.getElementById(containerId);
        const viewMoreBtn = document.getElementById(`nexcmViewMoreBtn-${containerId}`);
        if (!container || !viewMoreBtn) return;
        const cardsCount = container.querySelectorAll('.nexcm-comment-card').length;
        if (cardsCount >= 5) {
            viewMoreBtn.style.setProperty('display', 'block', 'important');
        } else {
            viewMoreBtn.style.setProperty('display', 'none', 'important');
        }
    }

    function nexcmHandleVisibility(container) {
        if (!container) return;
        const cards = container.querySelectorAll('.nexcm-comment-card');
        container.style.setProperty('max-height', '260px', 'important');
        container.style.setProperty('overflow-y', 'auto', 'important');
        container.style.setProperty('display', 'block', 'important');
        cards.forEach((card, index) => {
            if (index < 5) {
                card.style.setProperty('display', 'block', 'important');
                card.style.opacity = '1';
                card.style.visibility = 'visible';
            } else {
                card.style.setProperty('display', 'none', 'important');
            }
        });
    }

    window.toggleNexcmAiMenu = function (scope) {
        const menu = document.getElementById('nexcmAiMenu');
        menu.dataset.scope = scope;
        menu.classList.toggle('visible');
    };

    window.applyNexcmAiFeature = function (action) {
        const menu = document.getElementById('nexcmAiMenu');
        const scope = menu.dataset.scope === 'overlay' ? 'overlay' : 'main';
        menu.classList.remove('visible');
        const input = document.getElementById(scope === 'overlay' ? 'nexcmOverlayInput' : 'nexcmMainInput');

        if (action === 'clear') {
            input.value = '';
            if (scope === 'main') { nexcmTargetReplyId = null; nexcmActiveReplyUser = ''; }
        } else if (action === 'optimize' && input.value.trim()) {
            input.value = input.value.trim() + ' ✨ [Optimized via Nexus AI]';
        } else if (action === 'translate' && input.value.trim()) {
            input.value = 'AI Translation: ' + input.value.trim() + ' (Processed)';
        }
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
        input.focus();
    };

    window.nexcmPulseLike = function (btn) {
        btn.classList.toggle('liked');
        const icon = btn.querySelector('i');
        const countSpan = btn.querySelector('.count');
        let currentCount = parseInt(countSpan.innerText) || 0;
        if (btn.classList.contains('liked')) {
            icon.className = 'fa-solid fa-heart';
            countSpan.innerText = currentCount + 1;
            if (navigator.vibrate) navigator.vibrate([20, 10, 20]);
        } else {
            icon.className = 'fa-regular fa-heart';
            countSpan.innerText = Math.max(0, currentCount - 1);
        }
    };

    window.nexcmRequestDestruction = function (documentId) {
        if (confirm('Kana da tabbas kana son goge wannan?')) {
            db.collection('nexus_contributions').doc(documentId).delete()
                .catch((error) => { console.error('Gogewa kuskure: ', error); });
        }
    };

    function nexcmFormatTimestamp(timestampInput) {
        if (!timestampInput) return 'Just now';
        let past = timestampInput.toDate ? timestampInput.toDate() : new Date(timestampInput);
        const secondsAgo = Math.floor((Date.now() - past) / 1000);
        if (secondsAgo < 60) return 'Just now';
        const minutesAgo = Math.floor(secondsAgo / 60);
        if (minutesAgo < 60) return `${minutesAgo}m`;
        const hoursAgo = Math.floor(minutesAgo / 60);
        if (hoursAgo < 24) return `${hoursAgo}h`;
        const daysAgo = Math.floor(hoursAgo / 24);
        if (daysAgo < 30) return `${daysAgo}d`;
        return `${Math.floor(daysAgo / 30)}mo`;
    }

    function nexcmFormatMentions(text) {
        if (!text) return '';
        return text.replace(/@([a-zA-Z0-9_\u0600-\u06FF]+)/g, function (match) {
            return `<span class="nexcm-mention-tag">${match}</span>`;
        });
    }

})();

console.log('[PostCard] Shared template loaded ✓');
