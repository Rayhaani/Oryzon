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
        /* An gyara nan don ya dace da ainihin classes din HTML gaba daya */
        .post-interaction-bar, .interaction-bar {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 10px 10px !important;
            background: rgba(10, 10, 10, 0.6) !important;
            backdrop-filter: blur(10px) !important;
            border-top: 1px solid rgba(255, 215, 0, 0.08) !important;
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



           /* ===== FOLLOW BUTTON - IDENTICAL TO GIFT BUTTON ===== */
.follow-btn-nexus {
    min-width: 60px;
    justify-content: center;
}

.follow-btn-nexus.following {
    min-width: 80px;
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

                       <div class="post-username-row" style="display: flex !important; flex-direction: column !important; justify-content: center !important; flex: 1 !important; background: none !important; border: none !important; padding: 0 !important; margin: 0 0 0 5px !important;">
                <div>
                    <!-- Username an kara masa girma da 2px (Ya koma 18px) -->
                    <div style="display:flex; align-items:center; gap:5px; line-height:1.2;">
                        <span class="post-username" style="font-size:17px !important; font-weight:800; color:#fff; display:block;">${post.username || 'unknown'}</span>
                        <span class="post-verified-badge"><i class="fa-solid fa-check"></i></span>
                    </div>
                    <!-- Timestamp girmansa bai wuce 50% na username ba (Ya koma 9px) kuma ba zai yi breaking ba -->
                    ${timeStr ? `<span class="post-time" style="font-size:10px !important; color:rgba(255,255,255,0.45); margin-top:3px; display:block; line-height:1; text-transform:capitalize; white-space: nowrap !important;">${timeStr}</span>` : ''}
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

        <div style="position:relative;" dblclick="
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
               
                <div class="post-capsule" onclick="event.stopPropagation(); window.location.href='comments.html?postId=${post.id}'" id="comment-btn-${post.id}">
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

console.log('[PostCard] Shared template loaded ✓');
