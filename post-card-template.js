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

        /* ===== VERIFIED BADGE ===== */
        .post-verified-badge {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 13px !important;
            height: 13px !important;
            background-color: #1d9bf0 !important;
            clip-path: polygon(
                50% 0%, 61% 5%, 72% 0%, 80% 9%, 91% 9%, 91% 20%,
                100% 28%, 95% 39%, 100% 50%, 95% 61%, 100% 72%, 91% 80%,
                91% 91%, 80% 91%, 72% 100%, 61% 95%, 50% 100%, 39% 95%,
                28% 100%, 20% 91%, 9% 91%, 9% 80%, 0% 72%, 5% 61%,
                0% 50%, 5% 39%, 0% 28%, 9% 20%, 9% 9%, 20% 9%,
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
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            padding: 5px 12px !important;
            border-radius: 20px !important;
            color: #ffffff !important;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6) !important;
            transition: all 0.2s ease !important;
            min-width: 44px !important;
            height: 30px !important;
            cursor: pointer !important;
        }

        .post-action-capsules, .action-capsules,
        .post-save-capsule, .save-capsule {
            background: rgba(0, 0, 0, 0.55) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
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

        /* Like active state */
        .post-capsule.liked i, .capsule.liked i {
            color: #ff4d6d !important;
        }

        /* Save capsule - rightmost */
        .post-save-capsule, .save-capsule {
            margin-left: 6px !important;
            border-radius: 30px !important;
            padding: 3px !important;
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
        
        /* HIDE NATIVE VIDEO CONTROLS */
        video::-webkit-media-controls { display: none !important; }
        video::-webkit-media-controls-start-playback-button { display: none !important; }

        body:has(video[style*="position: fixed"]) {
            overflow: hidden !important;
            height: 100vh !important;
            max-height: 100vh !important;
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

        .post-media {
            min-height: 600px !important;
            aspect-ratio: 9/16 !important;
            object-fit: cover !important;
            background-color: #0b0b0b !important;
        }

        .header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
        
        /* ===== FOLLOW BUTTON ===== */
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
        .post-card .post-capsule i, .post-card .capsule i {
            color: #ffffff !important;
            font-size: 15px !important;
        }

        .post-card .post-capsule span, .post-card .capsule span {
            color: #ffffff !important;
            font-weight: 600 !important;
            font-size: 11px !important;
        }

        .post-card .post-capsule.liked i, .post-card .capsule.liked i {
            color: #ff4d6d !important;
        }

        #timeline-area, .feed-container {
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

// RESTORE LIKES
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

// 5. MASTER generatePostHTML()
window.generatePostHTML = function(post) {
    const postId = post.id || '';
    const rawPic = post.userProfilePic || "https://api.dicebear.com/7.x/bottts/svg?seed=" + (post.username || 'user');
    const avatarUrl = rawPic.includes('cloudinary.com')
        ? rawPic.replace('/upload/', '/upload/f_auto,q_auto,w_100,h_100,c_fill/')
        : rawPic;

    let mediaWrapperHTML = '';
    if (post.mediaUrl) {
        const fastUrl = post.mediaUrl.includes('cloudinary.com')
            ? post.mediaUrl.replace('/upload/', '/upload/f_auto,q_auto,w_700/')
            : post.mediaUrl;

        if (post.mediaType === 'video') {
            mediaWrapperHTML = `
                <div style="position:relative;">
                    <video src="${fastUrl}" class="post-media" loop playsinline autoplay muted preload="metadata"></video>
                    <div class="post-mute-toggle" onclick="postCard_toggleVideoSound(event, this)">
                        <i class="fa-solid fa-volume-xmark"></i>
                    </div>
                </div>`;
        } else {
            mediaWrapperHTML = `<img src="${fastUrl}" class="post-media" loading="lazy" alt="post image">`;
        }
    }

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

    const likes = post.likesCount || post.likes || 0;
    const comments = post.commentsCount || post.comments || 0;

    return `
    <div class="post-card" data-post-id="${postId}" onclick="
        const media = this.querySelector('.post-media');
        if(media && media.tagName === 'VIDEO' && typeof toggleImmersive === 'function') toggleImmersive(this);
    ">
        <div class="post-header">
            <a href="me.html?user=${encodeURIComponent(post.username || '')}" style="position:absolute; left:0; top:0; width:54px; height:54px; display:block; z-index:20; text-decoration:none;">
                <img src="${avatarUrl}" class="post-avatar" loading="lazy" alt="${post.username}">
            </a>

            <div class="post-username-row" style="display: flex !important; flex-direction: column !important; justify-content: center !important; flex: 1 !important; background: none !important; border: none !important; padding: 0 !important; margin: 0 0 0 2px !important;">
                <div style="display:flex; align-items:center; gap:5px; line-height:1.2;">
                    <span class="post-username" style="font-size:15px !important; font-weight:800; color:#fff; display:block;">${post.username || 'unknown'}</span>
                    <span class="post-verified-badge" style="margin-left: 5px; display: inline-flex; align-items: center; vertical-align: middle;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C10.74 2 9.53 2.62 8.78 3.67L8.2 4.49C7.84 5 7.28 5.33 6.66 5.39L5.67 5.48C4.31 5.61 3.24 6.68 3.11 8.04L3.02 9.03C2.96 9.65 2.63 10.21 2.12 10.57L1.3 11.15C0.25 11.9 0.25 13.47 1.3 14.22L2.12 14.8C2.63 15.16 2.96 15.72 3.02 16.34L3.11 17.33C3.24 18.69 4.31 19.76 5.67 19.89L6.66 19.98C7.28 20.04 7.84 20.37 8.2 20.88L8.78 21.7C9.53 22.75 11.08 22.75 11.83 21.7L12.41 20.88C12.77 20.37 13.33 20.04 13.95 19.98L14.94 19.89C16.3 19.76 17.37 18.69 17.5 17.33L17.59 16.34C17.65 15.72 17.98 15.16 18.49 14.8L19.31 14.22C20.36 13.47 20.36 11.9 19.31 11.15L18.49 10.57C17.98 10.21 17.65 9.65 17.59 9.03L17.5 8.04C17.37 6.68 16.3 5.61 14.94 5.48L13.95 5.39C13.33 5.33 12.77 5 12.41 4.49L11.83 3.67C11.23 2.82 10.45 2 12 2Z" fill="#1d9bf0"/>
                            <path d="M9.5 12L11 13.5L15 9.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span> 
                </div>
                ${timeStr ? (() => {
                    let cleanTime = timeStr.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1').replace(/,/g, '').toLowerCase();
                    let transformStyle = !cleanTime.includes('ago') ? 'capitalize' : 'lowercase';
                    return `<span class="post-time" style="font-size:9px !important; font-weight: 700 !important; color:rgba(255,255,255,0.45); margin-top:3px; display:block; line-height:1; white-space: nowrap !important; text-transform: ${transformStyle} !important;">${cleanTime}</span>`;
                })() : ''}
            </div>

            <div class="header-actions" onclick="stopProp(event)" style="display: flex; align-items: center; gap: 12px;">
                <div class="gift-btn-nexus follow-btn-nexus" onclick="handleFollowBtn(this)" style="cursor: pointer;">
                    <span style="font-size: 10px; font-weight: 600; color: #ffffff;">Follow</span>
                </div>
                <div class="gift-btn-nexus" onclick="openGiftPanel('${post.username}')">
                    <span class="gift-emoji">🎁</span>
                    <span style="font-size: 10px;">Gift</span>
                </div>
            </div>
        </div>

        ${post.content ? `<div class="post-content">${post.content}</div>` : ''}

        <div style="position:relative;" ondblclick="
            const btn = this.closest('.post-card').querySelector('.post-capsule, .capsule');
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

// 6. CONVEYOR STORIES
(function initConveyorStories() {
    const SPEED = 22;
    let beltOffset = 0;
    let lastTime = null;
    let animFrame;
    let isPaused = false;
    let totalWidth = 0;

    function startConveyor() {
        const belt = document.getElementById('conveyorBelt');
        if (!belt) return;

        const cards = belt.querySelectorAll('.s-card');
        const CARD_W = 80;
        const originalCount = cards.length;
        totalWidth = originalCount * CARD_W;

        cards.forEach(card => {
            belt.appendChild(card.cloneNode(true));
            belt.appendChild(card.cloneNode(true));
        });

        belt.querySelectorAll('.s-card').forEach(card => {
            card.addEventListener('click', () => {
                const username = card.dataset.username;
                if (username) openStoryByUsername(username);
            });
        });

        belt.addEventListener('touchstart', () => { isPaused = true; }, { passive: true });
        belt.addEventListener('touchend',   () => { isPaused = false; lastTime = null; });

        cancelAnimationFrame(animFrame);
        animFrame = requestAnimationFrame(animate);
    }

    function animate(ts) {
        if (!lastTime) lastTime = ts;
        const dt = (ts - lastTime) / 1000;
        lastTime = ts;

        if (!isPaused) {
            beltOffset -= SPEED * dt;
            if (Math.abs(beltOffset) >= totalWidth) {
                beltOffset += totalWidth;
            }
            const belt = document.getElementById('conveyorBelt');
            if (belt) belt.style.transform = `translateX(${beltOffset}px)`;
        }
        animFrame = requestAnimationFrame(animate);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startConveyor);
    } else {
        setTimeout(startConveyor, 300);
    }
})();

// FOLLOW HANDLER
window.handleFollowBtn = function(btn) {
    const span = btn.querySelector('span');
    const isFollowing = span.textContent.trim() === 'Following';
    if (isFollowing) {
        span.textContent = 'Follow';
        btn.classList.remove('following');
    } else {
        span.textContent = 'Following';
        btn.classList.add('following');
    }
    if (navigator.vibrate) navigator.vibrate(10);
};

// COMMENTS LOGIC
window.handleCommentBtn = function(postId, event) {
    if (event) event.stopPropagation();
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const isImmersive = card && card.classList.contains('immersive-mode');
    
    if (!isImmersive) {
        window.location.href = `comments.html?postId=${postId}`;
        return;
    }
    openImmersiveSplitComments(postId, card);
};

window.openImmersiveSplitComments = function(postId, card) {
    const existing = document.getElementById('nexusSplitView');
    if (existing) { existing.remove(); return; }

    const splitDiv = document.createElement('div');
    splitDiv.id = 'nexusSplitView';
    splitDiv.style.cssText = `position:fixed; inset:0; z-index:9000; display:flex; flex-direction:column; background:#000;`;

    const videoHalf = document.createElement('div');
    videoHalf.style.cssText = `flex:0 0 42%; position:relative; background:#000; overflow:hidden;`;

    const origVideo = card.querySelector('video');
    const origImg = card.querySelector('img.post-media');

    if (origVideo) {
        const vid = document.createElement('video');
        vid.src = origVideo.src || origVideo.currentSrc;
        vid.autoplay = true; vid.loop = true; vid.muted = false; vid.playsInline = true;
        vid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        videoHalf.appendChild(vid);
        vid.play().catch(()=>{});
        vid.onclick = () => { splitDiv.remove(); document.body.style.overflow = ''; };
    } else if (origImg) {
        const img = document.createElement('img');
        img.src = origImg.src;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        videoHalf.appendChild(img);
        img.onclick = () => { splitDiv.remove(); document.body.style.overflow = ''; };
    }

    const avatarEl = card.querySelector('.post-avatar');
    const usernameEl = card.querySelector('.post-username');
    const miniInfo = document.createElement('div');
    miniInfo.style.cssText = `position:absolute; bottom:0; left:0; right:0; padding:10px 14px; background:linear-gradient(transparent,rgba(0,0,0,0.85)); display:flex; align-items:center; gap:8px;`;
    miniInfo.innerHTML = `
        <img src="${avatarEl ? avatarEl.src : ''}" style="width:28px;height:28px;border-radius:50%;border:1.5px solid #fde08d;object-fit:cover;">
        <span style="color:#fff;font-size:13px;font-weight:700;">${usernameEl ? usernameEl.textContent.trim() : ''}</span>`;
    videoHalf.appendChild(miniInfo);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&#8249;';
    closeBtn.style.cssText = `position:absolute; top:10px; left:12px; width:32px; height:32px; border-radius:50%; background:rgba(0,0,0,0.6); border:none; color:#fff; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10; backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.2);`;
    closeBtn.onclick = () => { splitDiv.remove(); document.body.style.overflow = ''; };
    videoHalf.appendChild(closeBtn);

    const commentsHalf = document.createElement('div');
    commentsHalf.style.cssText = `flex:1; position:relative; overflow:hidden; border-top:1px solid rgba(253,224,141,0.2);`;

    const iframe = document.createElement('iframe');
    iframe.src = `comments.html?postId=${postId}`;
    iframe.style.cssText = `width:100%; height:100%; border:none; display:block; background:#000;`;
    commentsHalf.appendChild(iframe);

    splitDiv.appendChild(videoHalf);
    splitDiv.appendChild(commentsHalf);
    document.body.appendChild(splitDiv);
    document.body.style.overflow = 'hidden';

    if (navigator.vibrate) navigator.vibrate([15,10,15]);
};

// 7. IMMERSIVE TOGGLE
window.toggleImmersive = function(card) {
    if (event && event.target.closest('.interaction-bar')) return;
    if (event && event.target.closest('.post-interaction-bar')) return;
    if (event && event.target.closest('.header-actions')) return;
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
            video.style.cssText = `position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; max-height: none !important; min-height: unset !important; object-fit: cover !important; border-radius: 0 !important; z-index: 4999 !important; background: #000 !important; margin: 0 !important;`;
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
            backBtn.onclick = function(e) { e.stopPropagation(); window.exitImmersive(card); };
            document.body.appendChild(backBtn);
        }

        if (video && typeof window.nexusImmersiveStart === 'function') {
            window.nexusImmersiveStart(card);
        }

        history.pushState({ immersive: true }, '');
        window.onpopstate = function() {
            const sv = document.getElementById('nexusSplitView');
            if (sv) {
                sv.remove();
                document.body.style.overflow = '';
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

    const backBtn = document.querySelector('.immersive-back-btn');
    if (backBtn) backBtn.remove();

    if (video) {
        video.pause(); // TSAYAR DA BIDIYON NAN TAKE
        video.currentTime = 0; // Maida bidiyon farko
        video.muted = true; // Kulle sauti duka
        video.style.cssText = '';
        video.onclick = null;
        
        // Gyara icon din sauti zuwa xmark
        const muteIcon = card.querySelector('.post-mute-toggle i');
        if (muteIcon) {
            muteIcon.className = 'fa-solid fa-volume-xmark';
        }
    }
    card.style.minHeight = '';
    if (card._savedScrollTop !== undefined) {
        window.scrollTo({ top: card._savedScrollTop, behavior: 'auto' });
    }
};


// 8. VIDEO OBSERVER - Auto play/pause lokacin scrolling na gari
window.nexusVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const vid = entry.target;
        const card = vid.closest('.post-card');
        
        // Idan bidiyon tana cikin Immersive Mode, kar wannan observer din ya fasa mata aiki
        if (card && card.classList.contains('immersive-mode')) return;

        if (entry.isIntersecting) {
            // Kunna idan tana rabi ko fiye a allo
            vid.play().catch(() => {});
        } else {
            // Tsayar da ita dundum idan ta fita daga allo
            vid.pause();
        }
    });
}, { 
    root: null,
    threshold: 0.5 // Dole 50% na bidiyon ya bayyana kafin ta yi play, idan ta fita kasa da haka zata tsaya.
});

// Tabbatar an sanya duka bidiyoyin cikin Observer idan an duba su
document.querySelectorAll('.post-card video').forEach(v => window.nexusVideoObserver.observe(v));



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
