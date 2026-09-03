/* ============================================================
   NEXUS-FEED.JS — yanzu OVERLAY ne a cikin social.html, ba SPA
   page ba (an cire NexusRouter.registerPage). Business logic bai
   canja ba, an kawai pageInit/pageDestroy -> openNexusFeedOverlay()/
   closeNexusFeedOverlay().
   ============================================================ */

function openImmersiveFromGrid(index) {
    const post = allPosts[index];
    if (!post) return;

    const existing = document.getElementById('nexus-immersive-card');
    if (existing) existing.remove();

    if (typeof generatePostHTML !== 'function') return;

    const wrapper = document.createElement('div');
    wrapper.id = 'nexus-immersive-card';
    wrapper.innerHTML = generatePostHTML(post);
    document.body.appendChild(wrapper);
    setTimeout(()=>{
        enableExploreScroll(index);
    },50);

    const card = wrapper.querySelector('.post-card');
    if (!card) return;

    const footer = document.getElementById('instaFooter');

    const scrollY = window.scrollY;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    card.classList.add('immersive-mode');
    card.style.height = '100dvh';
    if (footer) footer.classList.add('footer-hidden');

    const img = card.querySelector('img.post-media');
    if (img) {
        img.style.cssText = `
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
            object-fit: cover !important;
            border-radius: 0 !important;
            z-index: 4999 !important;
            margin: 0 !important;
        `;
    }

    const video = card.querySelector('video');
    if (video) {
        video.style.cssText = `
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
            object-fit: cover !important;
            border-radius: 0 !important;
            z-index: 4999 !important;
            margin: 0 !important;
        `;
        video.muted = false;
        video.play().catch(()=>{});
    }

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
    backBtn.onclick = function(e) {
        e.stopPropagation();
        card.classList.remove('immersive-mode');
        if (footer) footer.classList.remove('footer-hidden');
        backBtn.remove();
        if (img) img.style.cssText = '';
        if (video) { video.style.cssText = ''; video.pause(); }

        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);

        card.style.height = '';
        wrapper.remove();
    };
    document.body.appendChild(backBtn);
}

// -- GLOW PALETTE --
const glowPalette = [
    'rgba(255, 115, 0, 0.6)',
    'rgba(0, 191, 255, 0.6)',
    'rgba(186, 85, 211, 0.6)',
    'rgba(255, 0, 60, 0.6)',
    'rgba(255, 215, 0, 0.6)',
    'rgba(0, 230, 118, 0.6)',
    'rgba(255, 64, 129, 0.6)',
    'rgba(0, 229, 255, 0.6)',
];
function getGlow(i) { return glowPalette[i % glowPalette.length]; }

function formatTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

function formatCount(n) {
    n = parseInt(n) || 0;
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return n.toString();
}

// -- DATA --
let allPosts = [];
let activeVideoTiles = new Map();

async function loadPersonalizedGrid() {
    const grid = document.getElementById('quantumGrid');
    const TIMEOUT_MS = 9000;
    const withTimeout = (p) => Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS))
    ]);

    try {
        const ctxSettled = await Promise.allSettled([
            db.collection('users').doc(currentUser).get(),
            db.collection('users').doc(currentUser).collection('following').get(),
            db.collection('users').doc(currentUser).collection('behavior').doc('summary').get()
        ]);
        const [userSnapR, followSnapR, behaviorSnapR] = ctxSettled;

        const userData   = (userSnapR.status === 'fulfilled' && userSnapR.value.exists) ? userSnapR.value.data() : {};
        const following  = (followSnapR.status === 'fulfilled') ? followSnapR.value.docs.map(d => d.id) : [];
        const behavior    = (behaviorSnapR.status === 'fulfilled' && behaviorSnapR.value.exists) ? behaviorSnapR.value.data() : {};

        const interests   = userData.interests || [];
        const catScores   = behavior.categoryScores || {};
        const profile     = {};
        interests.forEach(c => { profile[c] = (profile[c]||0) + 50; });
        Object.entries(catScores).forEach(([c,s]) => { profile[c] = (profile[c]||0) + Math.min(s,50); });

        const topCats = Object.entries(profile)
            .sort((a,b) => b[1]-a[1]).slice(0,10).map(([c])=>c);

        const postsSettled = await withTimeout(Promise.allSettled([
            topCats.length > 0
                ? db.collection('posts')
                    .where('category','in', topCats.slice(0,10))
                    .orderBy('timestamp','desc').limit(40).get()
                : Promise.resolve({docs:[]}),
            db.collection('posts')
                .orderBy('engagementScore','desc').limit(30).get(),
            db.collection('posts')
                .orderBy('timestamp','desc').limit(30).get()
        ]));

        const seen = new Set();
        const candidates = [];
        postsSettled.forEach(r => {
            if (r.status !== 'fulfilled' || !r.value.docs) return;
            r.value.docs.forEach(doc => {
                const d = doc.data();
                if (!seen.has(doc.id)) {
                    seen.add(doc.id);
                    candidates.push({ id: doc.id, ...d });
                }
            });
        });
        const now = Date.now();
        allPosts = candidates.map(post => {
            const ageHrs  = post.timestamp ? (now - post.timestamp.toMillis())/3600000 : 999;
            const catScore= profile[post.category] || 0;
            const likes   = post.likes || 0;
            const comments= post.commentsCount || 0;
            const shares  = post.sharesCount || 0;
            const views   = Math.max(post.viewsCount||1, 1);
            const engRate = ((likes + comments*2 + shares*3) / views) * 100;
            const recency = Math.pow(0.5, ageHrs/24);

            const score =
                (catScore/100) * 50 +
                Math.min(engRate*0.4, 30) +
                recency * 10 +
                Math.min((post.engagementVelocity||0)*0.3, 5);

            return { ...post, _score: score };
        }).sort((a,b) => b._score - a._score);

        const random = [...allPosts].sort(()=>Math.random()-0.5).slice(0,3);
        random.forEach((p,i) => {
            const insertAt = (i+1)*10;
            if (insertAt < allPosts.length) allPosts.splice(insertAt, 0, p);
        });

        renderGrid();

   } catch(err) {
        console.error('[NexusExplore] Error:', err);
        if (grid) {
            grid.innerHTML = `<div class="empty-state">
                <i class="fa-solid fa-wifi"></i>
                <p>Connection issue.<br><span style="text-decoration:underline;cursor:pointer;" onclick="loadPersonalizedGrid()">Tap to retry</span></p>
            </div>`;
        }
    } 
}

// -- RENDER GRID --
function renderGrid() {
    const grid = document.getElementById('quantumGrid');

    if (allPosts.length === 0) {
        grid.innerHTML = `<div class="empty-state">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <p>No posts yet in the matrix</p>
        </div>`;
        return;
    }

    grid.innerHTML = allPosts.map((post, index) => {
        const avatar = post.userProfilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.username}`;
        const likes = formatCount(post.likes || 0);
        const isVideo = post.mediaType === 'video';

        let mediaHTML = '';
        if (post.mediaUrl) {
            if (isVideo) {
                mediaHTML = `<video
                    src="${post.mediaUrl}"
                    muted loop playsinline
                    preload="metadata"
                    class="grid-video">
                </video>
                <div class="video-indicator"><i class="fa-solid fa-play"></i></div>`;
            } else {
                mediaHTML = `<img src="${post.mediaUrl}" loading="lazy" alt="">`;
            }
        } else {
            mediaHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:12px;background:linear-gradient(145deg,#0d0d0d,#1a1a1a);">
                <p style="font-size:11px;color:rgba(255,255,255,0.7);text-align:center;line-height:1.4;">${(post.content||'').substring(0,60)}${post.content&&post.content.length>60?'...':''}</p>
            </div>`;
        }

        return `
        <div class="quantum-tile"
            data-index="${index}"
            onmousemove="runParallaxEngine(event,this)"
            onmouseleave="resetParallaxEngine(this)"
            onclick="openImmersiveFromGrid(${index})">
            ${mediaHTML}
            <div class="quantum-overlay">
                <div class="quantum-badge">
                    <i class="fa-solid fa-bolt"></i>
                    <span>${likes}</span>
                </div>
            </div>
            <div class="hidden-neural-payload"
                data-post-id="${post.id}"
                data-user="${post.username||'unknown'}"
                data-avatar="${avatar}"
                data-caption="${(post.content||'').replace(/"/g,'&quot;')}"
                data-glow="${getGlow(index)}"
                data-time="${formatTime(post.timestamp)}"
                data-likes="${post.likes||0}"
                data-comments="${post.commentCount||0}"
                data-media-url="${post.mediaUrl||''}"
                data-media-type="${post.mediaType||'image'}">
            </div>
        </div>`;
    }).join('');

    setupVideoAutoPlay();

    allPosts.forEach(post => {
        if (!post.username) return;
        db.collection('users').doc(post.username).get().then(userDoc => {
            if (!userDoc.exists) return;
            const pic = userDoc.data().userProfilePic;
            if (!pic) return;

            post.userProfilePic = pic;

            document.querySelectorAll('.quantum-tile').forEach(tile => {
                const payload = tile.querySelector('.hidden-neural-payload');
                if (payload && payload.dataset.user === post.username) {
                    payload.dataset.avatar = pic;
                }
            });
        }).catch(()=>{});
    });
}

// -- AUTO PLAY VIDEOS --
let videoObserver = null;

function setupVideoAutoPlay() {
    if (videoObserver) videoObserver.disconnect();

    videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                video.play().catch(()=>{});
            } else {
                video.pause();
                video.currentTime = 0;
            }
        });
    }, {
        threshold: [0, 0.5, 1.0],
        rootMargin: '0px'
    });

    document.querySelectorAll('.grid-video').forEach(video => {
        videoObserver.observe(video);
    });
}

// -- PARALLAX --
function runParallaxEngine(event, tile) {
    const bb = tile.getBoundingClientRect();
    const ax = event.clientX - bb.left - bb.width/2;
    const ay = event.clientY - bb.top - bb.height/2;
    tile.style.transform = `rotateX(${-(ay/(bb.height/2))*14}deg) rotateY(${(ax/(bb.width/2))*14}deg) scale(1.03)`;
    const g = tile.querySelector('img, video');
    if (g) g.style.transform = `scale(1.08) translateX(${-ax*0.06}px) translateY(${-ay*0.06}px)`;
}
function resetParallaxEngine(tile) {
    tile.style.transform = '';
    const g = tile.querySelector('img, video');
    if (g) g.style.transform = '';
}

// ============================================================
// OVERLAY OPEN / CLOSE (maimakon router pageInit/pageDestroy)
// ============================================================
window.openNexusFeedOverlay = function() {
    if (!currentUser) { window.location.href = 'login.html'; return; }

    const overlay = document.getElementById('nexusFeedOverlay');
    if (!overlay) return;
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';

    const footer = document.getElementById('instaFooter');
    if (footer) footer.style.display = 'none';
    const header = document.querySelector('#page-content > header');
    if (header) header.style.display = 'none';

    allPosts = [];
    loadPersonalizedGrid();
};

window.closeNexusFeedOverlay = function() {
    if (videoObserver) { videoObserver.disconnect(); videoObserver = null; }

    const existing = document.getElementById('nexus-immersive-card');
    if (existing) existing.remove();
    document.querySelectorAll('.immersive-back-btn').forEach(b => b.remove());
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    const overlay = document.getElementById('nexusFeedOverlay');
    if (overlay) overlay.style.display = 'none';

    const footer = document.getElementById('instaFooter');
    if (footer) footer.style.display = '';
    const header = document.querySelector('#page-content > header');
    if (header) header.style.display = '';
};
(function () {
    const input = document.getElementById('nfeedSearchInput');
    const icon = document.getElementById('nfeedSearchIcon');
    if (!input || !icon) return;
    input.addEventListener('focus', () => { icon.style.display = 'block'; });
    input.addEventListener('blur', () => { if (!input.value.trim()) icon.style.display = 'none'; });
})();
