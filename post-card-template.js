/* ============================================================
   POST CARD TEMPLATE - Decentralized Shared Source of Truth
   Wannan kudin yana gyara matsalar blank page ta hanyar kare
   variables din da basu da ma'ana (undefined variables).
   ============================================================ */

(function injectPostCardStyles() {
    if (document.getElementById('post-card-shared-styles')) return;

    const style = document.createElement('style');
    style.id = 'post-card-shared-styles';
    style.textContent = `
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

        .post-card {
            background: var(--post-bg) !important;
            backdrop-filter: blur(10px) !important;
            border: 1px solid var(--post-border) !important;
            border-radius: var(--post-radius) !important;
            margin-bottom: 15px !important;
            padding-bottom: 0 !important;
            position: relative !important;
            overflow: hidden !important;
            box-shadow: var(--gold-glow) !important;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }

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

        .post-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0 15px 0 55px !important;
            height: 54px !important;
            position: relative !important;
            background: linear-gradient(180deg, rgba(253, 224, 141, 0.08) 0%, transparent 100%) !important;
            border-bottom: 1px solid rgba(253, 224, 141, 0.1) !important;
            margin-bottom: 0 !important;
        }

        .post-avatar {
            position: absolute !important;
            left: 8px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 38px !important;
            height: 38px !important;
            border-radius: 50% !important;
            border: 2px solid var(--premium-gold) !important;
            object-fit: cover !important;
            z-index: 10 !important;
        }

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

        .nexus-badge {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 15px !important;
            height: 15px !important;
            background-color: #1d9bf0 !important;
            clip-path: polygon(50% 0%, 61% 5%, 72% 0%, 80% 9%, 91% 9%, 91% 20%, 100% 28%, 95% 39%, 100% 50%, 95% 61%, 100% 72%, 91% 80%, 91% 91%, 80% 91%, 72% 100%, 61% 95%, 50% 100%, 39% 95%, 28% 100%, 20% 91%, 9% 91%, 9% 80%, 0% 72%, 5% 61%, 0% 50%, 5% 39%, 0% 28%, 9% 20%, 9% 9%, 20% 9%, 28% 0%, 39% 5%) !important;
            flex-shrink: 0 !important;
            margin-left: 3px !important;
        }

        .nexus-badge i {
            font-size: 8px !important;
            color: white !important;
            font-weight: 900 !important;
        }

        .post-time {
            font-size: 10px !important;
            color: rgba(255, 255, 255, 0.45) !important;
            display: block !important;
            margin-top: 1px !important;
            font-family: 'Inter', sans-serif !important;
        }

        .post-content {
            padding: 10px 14px 8px 14px !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
            color: #efefef !important;
            text-align: justify !important;
            text-justify: inter-word !important;
        }

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

        .post-mute-toggle i { font-size: 13px !important; }

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
        }

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

        .post-capsule:active { transform: scale(0.93) !important; }

        /* Icons sun koma fari kamar yadda kake so */
        .post-capsule i {
            color: #ffffff !important;
            font-size: 15px !important;
            display: inline-block !important;
        }

        .post-capsule span {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #ccc !important;
        }

        .post-capsule.liked i { color: #ff4d6d !important; }

        .post-save-capsule {
            margin-left: auto !important;
        }

        .post-save-capsule .post-capsule {
            min-width: 68px !important;
        }

        .follow-text-link {
            background: transparent !important;
            border: 1px solid var(--premium-gold) !important;
            color: var(--premium-gold) !important;
            border-radius: 20px !important;
            padding: 4px 14px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
        }

        .gift-btn-nexus {
            display: flex !important;
            align-items: center !important;
            gap: 3px !important;
            background: rgba(255,255,255,0.08) !important;
            border: 1px solid rgba(255,255,255,0.15) !important;
            border-radius: 20px !important;
            padding: 4px 10px !important;
            cursor: pointer !important;
            font-size: 11px !important;
            color: #fff !important;
        }

        #timeline-area,
        .feed-container {
            padding: 0 10px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
    `;
    document.head.appendChild(style);
})();

// Helper Functions (Muted Sound, Like, Save)
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

window.postCard_toggleLike = function(event, postId) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    const countEl = btn.querySelector('span');

    const liked = btn.classList.toggle('liked');
    icon.style.color = liked ? '#ff4d6d' : '#ffffff';

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

window.postCard_toggleSave = function(event, postId) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    const countEl = btn.querySelector('span');

    const saved = btn.classList.toggle('saved');
    icon.style.color = saved ? '#fde08d' : '#ffffff';
    if (countEl) countEl.textContent = saved ? 'Saved' : 'Save';
};

// Kare functions din da bamu tabbatar da zamansu a wasu shafukan ba (Safety Guards)
if (typeof window.openGiftPanel !== 'function') {
    window.openGiftPanel = function(username) { console.log('Gift clicked for:', username); };
}
if (typeof window.handleFollow !== 'function') {
    window.handleFollow = function(el) { console.log('Follow clicked'); };
}

// MAIN MASTER GENERATOR
window.generatePostHTML = function(post) {
    const postId = post.id || '';
    const vBadge = `<span class="nexus-badge"><i class="fa-solid fa-check"></i></span>`;

    // --- Avatar Logic (Kariya daga Undefined Crash) ---
    const savedProfilePic = localStorage.getItem('userProfilePic');
    let currentPic = "https://api.dicebear.com/7.x/bottts/svg?seed=" + (post.username || "User");
    
    // An saka typeof don kare "currentUser is not defined" error
    if (post.username && typeof currentUser !== 'undefined' && currentUser && post.username.toLowerCase() === currentUser.toLowerCase() && savedProfilePic) {
        currentPic = savedProfilePic;
    } else {
        currentPic = post.userProfilePic || currentPic;
    }

    // --- Media Renderer ---
    let mediaWrapperHTML = '';
    if (post.mediaUrl) {
        if (post.mediaType === 'video') {
            mediaWrapperHTML = `
                <div style="position:relative; width:100%;">
                    <video src="${post.mediaUrl}" class="post-media" loop playsinline autoplay muted preload="metadata"></video>
                    <div class="post-mute-toggle" onclick="postCard_toggleVideoSound(event, this)">
                        <i class="fa-solid fa-volume-xmark"></i>
                    </div>
                </div>`;
        } else {
            mediaWrapperHTML = `<img src="${post.mediaUrl}" class="post-media" loading="lazy" alt="post image">`;
        }
    }

    // --- Time String ---
    let timeStr = '';
    if (post.timestamp) {
        const ts = post.timestamp.toDate ? post.timestamp.toDate() : new Date(post.timestamp);
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60)        timeStr = `${diff}s ago`;
        else if (diff < 3600) timeStr = `${Math.floor(diff/60)}m ago`;
        else if (diff < 86400)timeStr = `${Math.floor(diff/3600)}h ago`;
        else                   timeStr = ts.toLocaleDateString();
    }

    const likes = post.likesCount || post.likes || 0;

    return `
    <div class="post-card" data-post-id="${postId}">

        <div class="post-header">
            <a href="me.html?user=${encodeURIComponent(post.username || '')}"
               onclick="event.stopPropagation()"
               style="position:absolute; left:8px; top:50%; transform:translateY(-50%); width:38px; height:38px; display:block; z-index:20;">
                <img src="${currentPic}" class="post-avatar" alt="${post.username}">
            </a>

            <div class="post-username-row">
                <div>
                    <div style="display:flex; align-items:center; gap:2px;">
                        <span class="post-username">${post.username || 'unknown'}</span>
                        ${vBadge}
                    </div>
                    ${timeStr ? `<span class="post-time">${timeStr}</span>` : ''}
                </div>
            </div>

            <div onclick="event.stopPropagation()" style="display: flex; align-items: center; gap: 8px; z-index:25;">
                <button class="follow-text-link" onclick="handleFollow(this)">Follow</button>
                <div class="gift-btn-nexus" onclick="openGiftPanel('${post.username}')">
                    <span>🎁</span>
                    <span style="font-size: 10px;">Gift</span>
                </div>
            </div>
        </div>

        ${post.content ? `<div class="post-content">${post.content}</div>` : ''}

        ${mediaWrapperHTML}

        <div class="post-interaction-bar" onclick="event.stopPropagation()">
            <div class="post-action-capsules">
                <div class="post-capsule" onclick="postCard_toggleLike(event, '${postId}')">
                    <i class="fa-regular fa-heart"></i>
                    <span>${likes > 0 ? Number(likes).toLocaleString() : '0'}</span>
                </div>
                <div class="post-capsule"><i class="fa-regular fa-comment"></i><span>0</span></div>
                <div class="post-capsule"><i class="fa-solid fa-arrows-rotate"></i><span>0</span></div>
                <div class="post-capsule"><i class="fa-regular fa-paper-plane"></i></div>
            </div>

            <div class="post-save-capsule">
                <div class="post-capsule" onclick="postCard_toggleSave(event, '${postId}')">
                    <i class="fa-regular fa-bookmark"></i>
                    <span>Save</span>
                </div>
            </div>
        </div>

    </div>`;
};

console.log('[PostCard] Balanced master template loaded ✓');
