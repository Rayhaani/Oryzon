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
            margin-bottom: 15px !important;
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
            padding: 0 15px 0 55px !important;
            height: 46px !important;
            position: relative !important;
            background: transparent !important;
            border-bottom: 3px solid rgba(253, 224, 141, 0.1) !important;
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
        .post-username-row {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            flex: 1 !important;
        }

        .post-username {
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #ffffff !important;
            font-family: 'Plus Jakarta Sans', sans-serif !important;
        }

        /* ===== VERIFIED BADGE ===== */
        .post-verified-badge {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 15px !important;
            height: 15px !important;
            background-color: #1d9bf0 !important;
            clip-path: polygon(50% 0%, 61% 5%, 72% 0%, 80% 9%, 91% 9%, 91% 20%, 100% 28%, 95% 39%, 100% 50%, 95% 61%, 100% 72%, 91% 80%, 91% 91%, 80% 91%, 72% 100%, 61% 95%, 50% 100%, 39% 95%, 28% 100%, 20% 91%, 9% 91%, 9% 80%, 0% 72%, 5% 61%, 0% 50%, 5% 39%, 0% 28%, 9% 20%, 9% 9%, 20% 9%, 28% 0%, 39% 5%) !important;
            flex-shrink: 0 !important;
        }

        .post-verified-badge i {
            font-size: 8px !important;
            color: white !important;
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
        .post-interaction-bar {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 10px 10px !important;
            background: rgba(10, 10, 10, 0.6) !important;
            backdrop-filter: blur(10px) !important;
            border-top: 1px solid rgba(255, 215, 0, 0.08) !important;
        }

        .post-action-capsules {
            display: flex !important;
            gap: 6px !important;
            flex: 1 !important;
        }

        /* ===== CAPSULE BUTTONS ===== */
        .post-capsule {
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

        .post-capsule:active {
            transform: scale(0.93) !important;
        }

        .post-capsule i {
            color: var(--premium-gold) !important;
            font-size: 15px !important;
            display: inline-block !important;
        }

        .post-capsule span {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #ccc !important;
        }

        /* Like active state */
        .post-capsule.liked i {
            color: #ff4d6d !important;
        }

        /* Save capsule - rightmost */
        .post-save-capsule {
            margin-left: auto !important;
        }

        .post-save-capsule .post-capsule {
            min-width: 68px !important;
        }

        /* ===== FULL SCREEN / IMMERSIVE MODE ===== */
        .post-card.immersive-mode {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
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
        .immersive-mode .post-interaction-bar {
            position: relative !important;
            z-index: 5001 !important;
            background: linear-gradient(transparent, rgba(0,0,0,0.85)) !important;
            padding: 10px 20px !important;
        }

        /* ===== HIDE NATIVE VIDEO CONTROLS ===== */
        video::-webkit-media-controls { display: none !important; }
        video::-webkit-media-controls-start-playback-button { display: none !important; }



        /* ===== HAKKUNAN MAGANCE MATSALAR BLACK SPACE ===== */

/* Lokacin da aka cire video aka saka ta a body, 
   wannan yana gyara matsalar tsayin body don kar ya haifar da fanko a kasa */
body:has(video[style*="position: fixed"]) {
    overflow: hidden !important;
    height: 100vh !important;
    max-height: 100vh !important;
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
    const savedProfilePic = localStorage.getItem('userProfilePic');
    const rawPic = savedProfilePic || post.userProfilePic || "https://api.dicebear.com/7.x/bottts/svg?seed=mamba";
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
        if (diff < 60)        timeStr = `${diff}s ago`;
        else if (diff < 3600) timeStr = `${Math.floor(diff/60)}m ago`;
        else if (diff < 86400)timeStr = `${Math.floor(diff/3600)}h ago`;
        else                   timeStr = ts.toLocaleDateString();
    }

    // --- Like count ---
    const likes = post.likesCount || post.likes || 0;
    const comments = post.commentsCount || post.comments || 0;

    return `
    <div class="post-card" onclick="
    const media = this.querySelector('.post-media');
    if(media && media.tagName === 'VIDEO' && typeof toggleImmersive === 'function') toggleImmersive(this);
">

        <!-- HEADER -->
        <div class="post-header">
            <a href="me.html?user=${encodeURIComponent(post.username || '')}"
               style="position:absolute; left:0; top:0; width:54px; height:54px; display:block; z-index:20; text-decoration:none;">
                <img src="${avatarUrl}"
                     class="post-avatar"
                     loading="lazy"
                     alt="${post.username}">
            </a>

            <div class="post-username-row">
                <div>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span class="post-username">${post.username || 'unknown'}</span>
                        <span class="post-verified-badge">
                            <i class="fa-solid fa-check"></i>
                        </span>
                    </div>
                    ${timeStr ? `<span class="post-time">${timeStr}</span>` : ''}
                </div>
            </div>

          <div class="header-actions" onclick="stopProp(event)" style="display: flex; align-items: center; gap: 12px;">
                <button class="follow-text-link" onclick="handleFollow(this)">Follow</button>
                <div class="gift-btn-nexus" onclick="openGiftPanel('${post.username}')">
                    <span class="gift-emoji">🎁</span>
                    <span style="font-size: 10px;">Gift</span>
                </div>
            </div>

            
<!-- Three-dot menu (optional) -->
            <div onclick="event.stopPropagation()"
                 style="color:rgba(255,255,255,0.3); font-size:18px; cursor:pointer; padding:0 4px; letter-spacing:2px;">
                ···
            </div>
        </div>
            
        <!-- /HEADER -->

        <!-- TEXT CONTENT -->
        ${post.content ? `<div class="post-content">${post.content}</div>` : ''}

        <!-- MEDIA -->
        <div style="position:relative;" ondblclick="
    const btn = this.closest('.post-card').querySelector('.capsule');
    btn.classList.add('liked');
    btn.querySelector('i').style.color = '#ff4d6d';
    let c = parseInt(btn.querySelector('span').textContent) || 0;
    btn.querySelector('span').textContent = c + 1;
    const heart = document.createElement('i');
    heart.className = 'fa-solid fa-heart';
    heart.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);font-size:80px;color:#ff4d6d;z-index:99;pointer-events:none;transition:all 0.4s ease;opacity:1;';
    this.appendChild(heart);
    setTimeout(() => heart.style.transform = 'translate(-50%,-50%) scale(1)', 10);
    setTimeout(() => { heart.style.opacity = '0'; heart.style.transform = 'translate(-50%,-50%) scale(1.3)'; }, 400);
    setTimeout(() => heart.remove(), 800);
">${mediaWrapperHTML}</div>

        <div class="interaction-bar" onclick="stopProp(event)">
    <div class="action-capsules">
        <div class="capsule" onclick="triggerPulse(this, event)">
            <i class="fa-regular fa-heart"></i>
            <span>${post.likes || 0}</span>
        </div>
        <div class="capsule"><i class="fa-regular fa-comment"></i><span>12</span></div>
        <div class="capsule"><i class="fa-solid fa-arrows-rotate"></i><span>5</span></div>
        <div class="capsule"><i class="fa-regular fa-paper-plane"></i></div>
    </div>
    <div class="action-capsules save-capsule">
        <div class="capsule" onclick="toggleSave(this, '${post.id}')">
            <i class="fa-regular fa-bookmark"></i>
            <span>Save</span>
        </div>
    </div>
</div>
        <!-- /INTERACTION BAR -->

    </div>`;
};

console.log('[PostCard] Shared template loaded ✓');
