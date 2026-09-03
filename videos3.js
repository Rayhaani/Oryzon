/* ============================================================
   VIDEOS.JS — yanzu OVERLAY ne a cikin social.html, ba SPA page
   ba (an cire NexusRouter.registerPage). Business logic bai canja
   ba, an kawai:
   1) pageInit/pageDestroy -> openVideosOverlay()/closeVideosOverlay()
   2) popstate/click back-hijack -> yanzu suna closeVideosOverlay()
      maimakon location.replace('social.html') (mu riga muna can).
   ============================================================ */

// -- STATE --
let activeFilter = 'all';
let lastVisible  = null;
let isLoading    = false;
let allLoaded    = false;
const PAGE_SIZE  = 8;

// -- ALGORITHM STATE --
let _interestProfile = {};
let _followingList   = [];
let _behaviorData    = {};
let _scoredCache     = [];
let _cacheOffset     = 0;
let _watchTimers     = {};
let _watchObserver   = null;
const FETCH_SIZE     = 60;

let feedEl          = null;
let loadMoreTrigger = null;

let _infiniteScrollObserver = null;
let _infiniteScrollSentinel = null;
let _scrollT;

function _videosPopstateHijack(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeVideosOverlay();
}

function _videosClickBackHijack(event) {
    if (!event.target || typeof event.target.closest !== 'function') return;

    const backBtn = event.target.closest('.immersive-back-btn') ||
                    event.target.closest('[class*="back-btn"]') ||
                    event.target.closest('.fa-arrow-left') ||
                    event.target.closest('.fa-chevron-left');

    if (backBtn && backBtn.closest('#videosOverlay') && !document.querySelector('#videosOverlay .post-card.immersive-mode')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        closeVideosOverlay();
    }
}

function _videosScrollPriorityHandler() {
    clearTimeout(_scrollT);
    _scrollT = setTimeout(() => {
        if (typeof postCard_handleVideoPriority === 'function') postCard_handleVideoPriority();
    }, 150);
}

// -- FILTER --
window.setFilter = function(chip, filter) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = filter;
    lastVisible  = null;
    allLoaded    = false;
    feedEl.innerHTML = '';
    loadVideos(true);
};

// -- QUERY BUILDER --
function buildQuery() {
    let q = db.collection('posts').where('mediaType', '==', 'video');
    if (activeFilter !== 'all') {
        q = q.where('category', '==', activeFilter);
    }
    return q;
}

// -- ALGORITHM FUNCTIONS --
async function _loadUserContext() {
    try {
        const currentUser = localStorage.getItem('nexus_user_session');
        const [userSnap, followSnap, behaviorSnap] = await Promise.all([
            db.collection('users').doc(currentUser).get(),
            db.collection('users').doc(currentUser).collection('following').get(),
            db.collection('users').doc(currentUser).collection('behavior').doc('videoSummary').get()
        ]);
        const userData   = userSnap.exists   ? userSnap.data()   : {};
        _behaviorData    = behaviorSnap.exists? behaviorSnap.data(): {};
        _followingList   = followSnap.docs.map(d => d.id);
        const interests  = userData.interests || [];
        const catScores  = _behaviorData.categoryScores || {};
        interests.forEach(c => { _interestProfile[c] = (_interestProfile[c]||0) + 50; });
        Object.entries(catScores).forEach(([c,s]) => { _interestProfile[c] = (_interestProfile[c]||0) + Math.min(s,50); });
        const max = Math.max(...Object.values(_interestProfile), 1);
        Object.keys(_interestProfile).forEach(c => { _interestProfile[c] = (_interestProfile[c]/max)*100; });
    } catch(e) { console.warn('[Algorithm] Context error:', e.message); }
}

function _scoreVideo(video) {
    const currentUser = localStorage.getItem('nexus_user_session');
    const now    = Date.now();
    const ageHrs = video.timestamp ? (now - video.timestamp.toMillis())/3600000 : 999;
    let score    = 0;
    score += (video.avgCompletionRate||0) * 45;
    const likes   = video.likes||0, comments = video.commentsCount||0;
    const shares  = video.sharesCount||0, views = Math.max(video.viewsCount||1,1);
    const engRate = ((likes + comments*2 + shares*3) / views) * 100;
    score += Math.min(engRate*0.4, 30);
    score += ((_interestProfile[video.category]||0)/100) * 15;
    if (_followingList.includes(video.username)) score += 10;
    score += Math.pow(0.5, ageHrs/12) * 10;
    score += Math.min(((_behaviorData.completionByCategory||{})[video.category]||0)*0.3, 5);
    if (video.username === currentUser) score -= 200;
    return Math.max(score, 0);
}

async function _fetchPersonalized() {
    const currentUser = localStorage.getItem('nexus_user_session');
    const topCats = Object.entries(_interestProfile)
        .sort((a,b)=>b[1]-a[1]).slice(0,10).map(([c])=>c);
    const topFollowing = _followingList
        .sort((a,b)=>((_behaviorData.authorScores||{})[b]||0)-((_behaviorData.authorScores||{})[a]||0))
        .slice(0,10);

    const promises = [];
    if (activeFilter !== 'all') {
        promises.push(
            db.collection('posts').where('mediaType','==','video')
              .where('category','==',activeFilter)
              .orderBy('timestamp','desc').limit(FETCH_SIZE).get()
        );
    } else {
        if (topFollowing.length > 0)
            promises.push(db.collection('posts').where('mediaType','==','video')
                .where('username','in',topFollowing)
                .orderBy('timestamp','desc').limit(FETCH_SIZE).get());
        if (topCats.length > 0)
            promises.push(db.collection('posts').where('mediaType','==','video')
                .where('category','in',topCats.slice(0,10))
                .orderBy('timestamp','desc').limit(FETCH_SIZE).get());
        promises.push(db.collection('posts').where('mediaType','==','video')
            .orderBy('engagementScore','desc').limit(30).get());
        promises.push(db.collection('posts').where('mediaType','==','video')
            .orderBy('timestamp','desc').limit(FETCH_SIZE).get());
    }

    const settled = await Promise.allSettled(promises);
    const snaps = settled.map(r => r.status === 'fulfilled' ? r.value : null);
    settled.forEach(r => { if (r.status === 'rejected') console.warn('[videos] query failed:', r.reason?.message || r.reason); });
    const seen = new Set(); const all = [];
    snaps.forEach(snap => {
        if (!snap?.docs) return;
        snap.docs.forEach(doc => {
            if (!seen.has(doc.id)) { seen.add(doc.id); all.push({id:doc.id,...doc.data()}); }
        });
    });
    return all;
}

// -- LOAD VIDEOS (personalized) --
async function loadVideos(reset = false) {
    if (isLoading) return;
    isLoading = true;
    loadMoreTrigger.style.display = 'flex';
    try {
        if (reset) {
            feedEl.innerHTML = ''; _cacheOffset = 0; _scoredCache = [];
            let raw = [];
            try {
                raw = await _fetchPersonalized();
            } catch (fetchErr) {
                console.error('[videos] fetch failed:', fetchErr);
                feedEl.innerHTML = `<div class="empty-videos"><i class="fa-solid fa-wifi"></i><p>Connection issue.<br><span style="text-decoration:underline;cursor:pointer;" onclick="loadVideos(true)">Tap to retry</span></p></div>`;
                feedEl.classList.add('ready');
                loadMoreTrigger.style.display = 'none';
                isLoading = false; return;
            }
            if (raw.length === 0) {
                feedEl.innerHTML = `<div class="empty-videos"><i class="fa-solid fa-video-slash"></i><p>No videos yet.<br>Be the first!</p></div>`;
                feedEl.classList.add('ready');
                loadMoreTrigger.style.display = 'none';
                isLoading = false; return;
            }
            const perAuthor = {};
            _scoredCache = raw
                .map(v => ({...v, _score: _scoreVideo(v)}))
                .sort((a,b) => b._score - a._score)
                .filter(v => { const c = perAuthor[v.username]||0; if(c>=3) return false; perAuthor[v.username]=c+1; return true; });
        }

        const batch = _scoredCache.slice(_cacheOffset, _cacheOffset + PAGE_SIZE);
        _cacheOffset += PAGE_SIZE;

        if (batch.length === 0) { loadMoreTrigger.style.display='none'; isLoading=false; return; }

        let html = '';
        batch.forEach(v => { if (typeof generatePostHTML==='function') html += generatePostHTML(v); });
        feedEl.insertAdjacentHTML('beforeend', html);

        if (reset) {
            requestAnimationFrame(() => startFirstImmersive());
        }

        setTimeout(() => { if (typeof postCard_restoreLikes==='function') postCard_restoreLikes(feedEl); }, 400);
        batch.forEach(v => {
            if (!v.username) return;
            db.collection('users').doc(v.username).get().then(uDoc => {
                if (!uDoc.exists) return;
                const pic = uDoc.data().userProfilePic; if (!pic) return;
                const card = feedEl.querySelector(`.post-card[data-post-id="${v.id}"]`);
                if (card) { const av=card.querySelector('.post-avatar'); if(av) av.src=pic; }
            });
            db.collection('nexus_contributions')
              .where('postId','==',v.id).where('parentId','==',null)
              .onSnapshot(s => { const el=document.getElementById(`comment-count-${v.id}`); if(el) el.textContent=s.size; });
        });

        if (typeof postCard_observeVideos==='function') postCard_observeVideos();
        setTimeout(() => { if (typeof postCard_handleVideoPriority==='function') postCard_handleVideoPriority(); }, 500);
        _observeNewCards();
        loadMoreTrigger.style.display = 'none';

    } catch(err) {
        console.error('[videos] loadVideos error:', err);
        loadMoreTrigger.style.display = 'none';
    } finally { isLoading = false; }
}

// -- WATCH TIME TRACKING --
function _setupWatchTracking() {
    _watchObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const postId = entry.target.dataset.postId; if (!postId) return;
            if (entry.isIntersecting) {
                _watchTimers[postId] = Date.now();
            } else if (_watchTimers[postId]) {
                const duration = Date.now() - _watchTimers[postId];
                delete _watchTimers[postId];
                if (duration >= 2000) {
                    const cat = entry.target.dataset.category||'';
                    const user= entry.target.dataset.username||'';
                    _recordWatchTime(postId, cat, user, duration);
                }
            }
        });
    }, { threshold: 0.6 });
}

function _observeNewCards() {
    if (!_watchObserver) return;
    document.querySelectorAll('#videoFeed .post-card').forEach(c => _watchObserver.observe(c));
}

async function _recordWatchTime(postId, category, author, durationMs) {
    const currentUser = localStorage.getItem('nexus_user_session');
    try {
        const vid = _scoredCache.find(v=>v.id===postId);
        const completion = Math.min(durationMs/((vid?.duration||30)*1000), 1.0);
        const postSnap = await db.collection('posts').doc(postId).get();
        if (postSnap.exists) {
            const d=postSnap.data(), prev=d.avgCompletionRate||0, prevV=Math.max(d.viewsCount||0,0);
            await db.collection('posts').doc(postId).update({
                avgCompletionRate: ((prev*prevV)+completion)/(prevV+1),
                viewsCount: firebase.firestore.FieldValue.increment(1),
                engagementScore: firebase.firestore.FieldValue.increment(completion*2),
            });
        }
        const upd = { lastUpdated: Date.now() };
        if (category) {
            upd[`categoryScores.${category}`] = firebase.firestore.FieldValue.increment(completion*20);
            upd[`completionByCategory.${category}`] = firebase.firestore.FieldValue.increment(completion);
        }
        if (author && author!==currentUser)
            upd[`authorScores.${author}`] = firebase.firestore.FieldValue.increment(completion*5);
        upd['totalVideosWatched'] = firebase.firestore.FieldValue.increment(1);
        await db.collection('users').doc(currentUser).collection('behavior').doc('videoSummary').set(upd,{merge:true});
    } catch(e) {}
}

// -- INFINITE SCROLL --
function setupInfiniteScroll() {
    if (_infiniteScrollObserver) _infiniteScrollObserver.disconnect();
    if (_infiniteScrollSentinel) _infiniteScrollSentinel.remove();

    _infiniteScrollSentinel = document.createElement('div');
    _infiniteScrollSentinel.style.height = '1px';
    const overlay = document.getElementById('videosOverlay');
    (overlay || document.body).appendChild(_infiniteScrollSentinel);

    _infiniteScrollObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoading && !allLoaded) loadVideos(false);
    }, { rootMargin: '250px', root: overlay || null });
    _infiniteScrollObserver.observe(_infiniteScrollSentinel);
}

function startFirstImmersive() {
    const cards = document.querySelectorAll('#videoFeed .post-card');
    if (!cards.length) {
        feedEl.classList.add('ready');
        return;
    }
    if (typeof window.toggleImmersive === 'function') {
        window.toggleImmersive(cards[0]);
    }
    feedEl.classList.add('ready');
}

// ============================================================
// OVERLAY OPEN / CLOSE (maimakon router pageInit/pageDestroy)
// ============================================================
window.openVideosOverlay = async function() {
    if (!localStorage.getItem('nexus_user_session')) { location.href = 'login.html'; return; }

    const overlay = document.getElementById('videosOverlay');
    if (!overlay) return;
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    const footer = document.getElementById('instaFooter');
    if (footer) footer.style.display = 'none';
    const header = document.querySelector('#page-content > header');
    if (header) header.style.display = 'none';
    feedEl          = document.getElementById('videoFeed');
    loadMoreTrigger = document.getElementById('loadMoreTrigger');

    activeFilter = 'all';
    lastVisible  = null;
    isLoading    = false;
    allLoaded    = false;
    _scoredCache = [];
    _cacheOffset = 0;
    _watchTimers = {};

    window.addEventListener('popstate', _videosPopstateHijack, true);
    document.addEventListener('click', _videosClickBackHijack, true);
    overlay.addEventListener('scroll', _videosScrollPriorityHandler, { passive: true });

    await _loadUserContext();
    _setupWatchTracking();
    loadVideos(true);
    setupInfiniteScroll();
};

window.closeVideosOverlay = function() {
    const overlay = document.getElementById('videosOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
    const footer = document.getElementById('instaFooter');
    if (footer) footer.style.display = '';
    const header = document.querySelector('#page-content > header');
    if (header) header.style.display = '';
    window.removeEventListener('popstate', _videosPopstateHijack, true);
    document.removeEventListener('click', _videosClickBackHijack, true);
    if (overlay) overlay.removeEventListener('scroll', _videosScrollPriorityHandler);
    clearTimeout(_scrollT);
    if (_watchObserver) { _watchObserver.disconnect(); _watchObserver = null; }
    if (_infiniteScrollObserver) { _infiniteScrollObserver.disconnect(); _infiniteScrollObserver = null; }
    if (_infiniteScrollSentinel) { _infiniteScrollSentinel.remove(); _infiniteScrollSentinel = null; }
    if (feedEl) feedEl.innerHTML = '';
};
