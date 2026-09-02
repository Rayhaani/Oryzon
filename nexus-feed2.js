/* ============================================================
   NEXUS-FEED.JS — an fitar da wannan daga inline <script> a
   nexus-feed.html domin ya yi aiki daidai a karkashin NEXUS SPA
   ROUTER (router.js). Business logic din asali BAI CANJA ba —
   an kawai:
   1) Guard din firebase.initializeApp() da localStorage re-read.
   2) Mika boot-call (DOMContentLoaded) zuwa pageInit() domin ya
      sake gudana kowane lokaci da aka koma nexus-feed.html ta SPA.
   3) Kara pageDestroy() domin ya tsaftace videoObserver da immersive
      card (wanda ke zaune a document.body, WAJEN #page-content)
      idan an bar page din yayin da yake bude.
   ============================================================ */

    // MUHIMMI: an cire firebase.initializeApp()/const db daga nan —
    // nexus-core.js (wanda ke loda a KOWACE page, SAU DAYA kacal a
    // duk rayuwar app din) shine YANZU ke da alhakin wannan gaba
    // daya. nexus-feed.js yana amfani da `db`/`currentUser` da suka
    // riga sun wanzu a global scope daga nexus-core.js kai tsaye —
    // `currentUser` a can `const` ne (username string), iri daya da
    // yadda ake amfani da shi a nan, don haka babu bukatar sake
    // ayyana shi.

     
function openImmersiveFromGrid(index) {
    console.log('[DEBUG] function called, index:', index);
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

    // ===== GYARAN SCROLL NA GASKIYA =====
    // Maimakon mu canza body ya koma fixed (wanda ke janyo matsalar rabon hoto),
    // Zamu kulle tsayin body ne kawai sannan mu boye scrollbar din.
    const scrollY = window.scrollY; 
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    card.classList.add('immersive-mode');
    card.style.height = '100dvh';
    if (footer) footer.classList.add('footer-hidden');
    console.log('[DEBUG] immersive opened, index:', index);

    // Fix hoto ya cika screen (An saka top: 0 da left: 0 don kada scroll na baya ya shafe shi)
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

    // Fix video ya cika screen
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

    // Back button
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

    // Maida scroll
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollY);

    card.style.height = '';
wrapper.remove();
    };
    document.body.appendChild(backBtn);

    // Back button na browser
    history.replaceState({ immersive: true }, '');
    window.onpopstate = function() {
        backBtn.click();
        window.onpopstate = null;
    };
}
    
    
    
    // ===== GLOW PALETTE =====
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

    // ===== DATA =====
    let allPosts = [];
    let activeVideoTiles = new Map(); // tile el => IntersectionObserver entry

    // NOTE: kiran loadPersonalizedGrid() an mika shi zuwa pageInit()
    // a kasan wannan file domin ya sake gudana kowane lokaci da aka
    // koma nexus-feed.html ta SPA (DOMContentLoaded baya sake fitowa
    // bayan SPA swap).

async function loadPersonalizedGrid() {
    try {
        // 1. Load user context
        const [userSnap, followSnap, behaviorSnap] = await Promise.all([
            db.collection('users').doc(currentUser).get(),
            db.collection('users').doc(currentUser).collection('following').get(),
            db.collection('users').doc(currentUser).collection('behavior').doc('summary').get()
        ]);

        const userData    = userSnap.exists ? userSnap.data() : {};
        const following   = followSnap.docs.map(d => d.id);
        const behavior    = behaviorSnap.exists ? behaviorSnap.data() : {};

        // 2. Build interest profile
        const interests   = userData.interests || [];
        const catScores   = behavior.categoryScores || {};
        const profile     = {};
        interests.forEach(c => { profile[c] = (profile[c]||0) + 50; });
        Object.entries(catScores).forEach(([c,s]) => { profile[c] = (profile[c]||0) + Math.min(s,50); });

        const topCats = Object.entries(profile)
            .sort((a,b) => b[1]-a[1]).slice(0,10).map(([c])=>c);

        // 3. Fetch from 3 sources — EXCLUDE posts from followed accounts
        const [interestSnap, trendingSnap, recentSnap] = await Promise.all([
            topCats.length > 0
                ? db.collection('posts')
                    .where('category','in', topCats.slice(0,10))
                    .orderBy('timestamp','desc').limit(40).get()
                : Promise.resolve({docs:[]}),
            db.collection('posts')
                .orderBy('engagementScore','desc').limit(30).get(),
            db.collection('posts')
                .orderBy('timestamp','desc').limit(30).get()
        ]);

        // 4. Merge, deduplicate, exclude own posts + followed accounts
        const seen = new Set();
        const candidates = [];
        [interestSnap, trendingSnap, recentSnap].forEach(snap => {
            if (!snap.docs) return;
            snap.docs.forEach(doc => {
                const d = doc.data();
                if (!seen.has(doc.id) &&
                    d.username !== currentUser &&
                    !following.includes(d.username)) {
                    seen.add(doc.id);
                    candidates.push({ id: doc.id, ...d });
                }
            });
        });

        // 5. Score each post
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

        // 6. Inject serendipity — every 10th post = unexpected content
        const random = [...allPosts].sort(()=>Math.random()-0.5).slice(0,3);
        random.forEach((p,i) => {
            const insertAt = (i+1)*10;
            if (insertAt < allPosts.length) allPosts.splice(insertAt, 0, p);
        });

        // 7. Render using existing grid
        renderGrid();

    } catch(err) {
        console.error('[NexusExplore] Error:', err);
        // Fallback: chronological
        db.collection('posts').orderBy('timestamp','desc').limit(30).get().then(snap => {
            allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderGrid();
        });
    }
            }
    
    
    // ===== RENDER GRID =====
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
    
        // Load real avatars
        allPosts.forEach(post => {
    if (!post.username) return;
    db.collection('users').doc(post.username).get().then(userDoc => {
        if (!userDoc.exists) return;
        const pic = userDoc.data().userProfilePic;
        if (!pic) return;

        // ← GYARAN: Update allPosts kai tsaye
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
    
    // ===== AUTO PLAY VIDEOS (IntersectionObserver — kamar Instagram) =====
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

    // ===== PARALLAX =====
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
// SPA INIT / DESTROY — domin router.js (NexusRouter)
// ============================================================
function pageInit() {
    // `currentUser` yanzu const ne daga nexus-core.js (ba a sake
    // karanta shi a nan ba domin ba za a iya sake masa daraja ba,
    // kuma nexus-core.js ya riga ya yi auth-guard/redirect).
    if (!currentUser) { window.location.href = 'login.html'; return; }

    // nexus-feed.html ana isa gareta ta wani icon a HEADER, ba wani
    // tab a FOOTER ba — footer (#instaFooter) yana zaune WAJEN
    // #page-content (a duk page da ta shigar da footer.js), don haka
    // baya cirewa ta kansa lokacin SPA content-swap. Dole a boye shi
    // da hannu a nan.
    const footer = document.getElementById('instaFooter');
    if (footer) footer.style.display = 'none';

    allPosts = [];
    loadPersonalizedGrid();
}

function pageDestroy() {
    if (videoObserver) { videoObserver.disconnect(); videoObserver = null; }

    // Idan an bar page din yayin da immersive card yake bude (misali
    // an danna wata SPA link ba tare da an rufe shi ta backBtn ba),
    // dole a share shi da hannu domin baya cikin #page-content don
    // haka baya cirewa ta hanyar content swap na router.
    const existing = document.getElementById('nexus-immersive-card');
    if (existing) existing.remove();
    document.querySelectorAll('.immersive-back-btn').forEach(b => b.remove());
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    window.onpopstate = null;

    // Sake nuna footer domin sauran pages (wadanda suke bukatarsa).
    const footer = document.getElementById('instaFooter');
    if (footer) footer.style.display = '';
}

if (window.NexusRouter) {
    NexusRouter.registerPage('nexus-feed.html', { init: pageInit, destroy: pageDestroy });
}
pageInit();
