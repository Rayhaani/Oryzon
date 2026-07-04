/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║      NEXUS PROTOCOL — PAGE-SPECIFIC FEED ALGORITHMS         ║
 * ║                                                              ║
 * ║  MODULE A: NexusVideos  → videos.html (TikTok-style)        ║
 * ║  MODULE B: NexusExplore → nexus-feed.html (Discovery)       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * HOW TO USE:
 *   videos.html     → add this script, call: NexusVideos.init(currentUser)
 *   nexus-feed.html → add this script, call: NexusExplore.init(currentUser)
 */

// ════════════════════════════════════════════════════════════════
//
//  MODULE A: NEXUS VIDEOS
//  TikTok / Instagram Reels style algorithm
//
//  Key difference from home feed:
//  • Shows ONLY video content
//  • Watch completion rate is the #1 signal (not likes)
//  • Cold-start: show trending videos until we learn preferences
//  • Swipe-up/down navigation with autoplay + preload
//  • No follow required — pure discovery from day one
//
// ════════════════════════════════════════════════════════════════
const NexusVideos = (() => {

  const CONFIG = {
    BATCH_SIZE         : 20,
    COMPLETION_WEIGHT  : 0.45,   // Watch % is king (TikTok uses ~70%)
    ENGAGEMENT_WEIGHT  : 0.30,   // Likes, comments, shares
    INTEREST_WEIGHT    : 0.15,   // Category match
    RECENCY_WEIGHT     : 0.10,   // Freshness
    PRELOAD_AHEAD      : 2,      // Videos to preload ahead
    AUTOPLAY_DELAY_MS  : 300,
  };

  let _username       = null;
  let _behavior       = {};
  let _interestProfile= {};
  let _videoQueue     = [];
  let _currentIndex   = 0;
  let _watchStart     = null;
  let _container      = null;
  let _isLoading      = false;

  // ─── MAIN ENTRY ───────────────────────────────────────────────
  async function init(username) {
    _username  = username;
    _container = document.getElementById('videoFeedContainer');
    if (!_container) return;

    await _loadContext();
    const videos = await _fetchVideos();
    const ranked = _rankVideos(videos);
    _videoQueue = ranked;
    _renderSwipeStack();
    _setupSwipe();
    _playCurrentVideo();
  }

  // ─── LOAD USER CONTEXT ────────────────────────────────────────
  async function _loadContext() {
    try {
      const [userSnap, behaviorSnap] = await Promise.all([
        db.collection('users').doc(_username).get(),
        db.collection('users').doc(_username)
          .collection('behavior').doc('videoSummary').get()
      ]);
      const userData = userSnap.exists ? userSnap.data() : {};
      _behavior      = behaviorSnap.exists ? behaviorSnap.data() : {};
      _interestProfile = _buildInterestProfile(userData.interests || [], _behavior.categoryScores || {});
    } catch(e) {}
  }

  function _buildInterestProfile(interests, catScores) {
    const profile = {};
    interests.forEach(cat => { profile[cat] = (profile[cat] || 0) + 50; });
    Object.entries(catScores).forEach(([cat, score]) => {
      profile[cat] = (profile[cat] || 0) + Math.min(score, 50);
    });
    const max = Math.max(...Object.values(profile), 1);
    Object.keys(profile).forEach(cat => { profile[cat] = (profile[cat] / max) * 100; });
    return profile;
  }

  // ─── FETCH VIDEOS ONLY ────────────────────────────────────────
  async function _fetchVideos() {
    try {
      // Fetch only video posts, ordered by engagement
      const [trendingSnap, recentSnap, interestSnap] = await Promise.all([
        db.collection('posts')
          .where('mediaType', '==', 'video')
          .orderBy('engagementScore', 'desc')
          .limit(CONFIG.BATCH_SIZE)
          .get(),
        db.collection('posts')
          .where('mediaType', '==', 'video')
          .orderBy('timestamp', 'desc')
          .limit(CONFIG.BATCH_SIZE)
          .get(),
        // Interest-based video discovery
        Object.keys(_interestProfile).length > 0
          ? db.collection('posts')
              .where('mediaType', '==', 'video')
              .where('category', 'in', Object.keys(_interestProfile).slice(0, 10))
              .orderBy('timestamp', 'desc')
              .limit(CONFIG.BATCH_SIZE)
              .get()
          : Promise.resolve({ docs: [] })
      ]);

      const seen = new Set();
      const videos = [];
      [trendingSnap, recentSnap, interestSnap].forEach(snap => {
        if (!snap.docs) return;
        snap.docs.forEach(doc => {
          if (!seen.has(doc.id) && doc.data().username !== _username) {
            seen.add(doc.id);
            videos.push({ id: doc.id, ...doc.data() });
          }
        });
      });

      return videos;
    } catch(e) {
      console.warn('[NexusVideos] Fetch error:', e.message);
      return [];
    }
  }

  // ─── VIDEO RANKING ────────────────────────────────────────────
  function _rankVideos(videos) {
    return videos.map(v => {
      let score = 0;
      const now = Date.now();
      const ageHrs = v.timestamp ? (now - v.timestamp.toMillis()) / 3600000 : 999;

      // 1. COMPLETION RATE — the most important signal
      // avgCompletionRate: 0-1.0 (fraction of video watched on average)
      const completion = v.avgCompletionRate || 0;
      score += completion * 100 * CONFIG.COMPLETION_WEIGHT;

      // 2. ENGAGEMENT QUALITY
      const likes    = v.likes         || 0;
      const comments = v.commentsCount || 0;
      const shares   = v.sharesCount   || 0;
      const saves    = v.savesCount    || 0;
      const views    = v.viewsCount    || 1;
      // Engagement RATE (not absolute) — prevents big accounts dominating
      const engRate  = ((likes + comments*2 + shares*3 + saves*4) / views) * 100;
      score += Math.min(engRate * 0.5, 30) * CONFIG.ENGAGEMENT_WEIGHT;

      // 3. INTEREST AFFINITY
      const catScore = _interestProfile[v.category] || 0;
      score += (catScore / 100) * 100 * CONFIG.INTEREST_WEIGHT;

      // 4. RECENCY DECAY
      const recency = Math.pow(0.5, ageHrs / 12); // Half-life 12h for videos
      score += recency * 100 * CONFIG.RECENCY_WEIGHT;

      // 5. COLD START BOOST (for videos with no history yet)
      if (!v.viewsCount && likes > 0) score += 15;

      // 6. PERSONAL COMPLETION HISTORY
      const myHistory = (_behavior.completionByCategory || {})[v.category] || 0;
      score += Math.min(myHistory * 0.5, 10);

      return { ...v, _score: score };
    })
    .sort((a, b) => b._score - a._score);
  }

  // ─── RENDER SWIPE STACK ───────────────────────────────────────
  function _renderSwipeStack() {
    if (!_container) return;
    _container.innerHTML = '';

    // Show current + preload next N videos
    for (let i = _currentIndex; i < Math.min(_currentIndex + CONFIG.PRELOAD_AHEAD + 1, _videoQueue.length); i++) {
      const v = _videoQueue[i];
      if (!v) continue;
      const slide = _createVideoSlide(v, i === _currentIndex);
      _container.appendChild(slide);
    }
  }

  function _createVideoSlide(video, isActive) {
    const div = document.createElement('div');
    div.className = `nexus-video-slide${isActive ? ' active' : ''}`;
    div.dataset.postId = video.id;
    div.dataset.category = video.category || '';
    div.dataset.username = video.username || '';
    div.innerHTML = `
      <video
        class="nexus-video-player"
        src="${video.mediaUrl}"
        playsinline
        loop
        preload="${isActive ? 'auto' : 'metadata'}"
        style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;"
      ></video>
      <!-- Gradient overlay -->
      <div style="position:absolute;bottom:0;left:0;right:0;height:50%;
           background:linear-gradient(transparent,rgba(0,0,0,0.85));pointer-events:none;"></div>
      <!-- Video info -->
      <div style="position:absolute;bottom:80px;left:16px;right:70px;z-index:2">
        <div style="font-weight:700;font-size:15px;color:#fff;margin-bottom:4px">@${video.username}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);line-height:1.4">${(video.content||'').substring(0,80)}${(video.content||'').length>80?'...':''}</div>
        ${video.category ? `<div style="margin-top:6px;font-size:11px;color:rgba(253,224,141,0.7);font-weight:600">#${video.category}</div>` : ''}
      </div>
      <!-- Right action panel -->
      <div style="position:absolute;right:12px;bottom:100px;display:flex;flex-direction:column;gap:18px;align-items:center;z-index:2">
        <div style="text-align:center;cursor:pointer" onclick="NexusVideos.handleLike('${video.id}','${video.category}','${video.username}',this)">
          <div style="font-size:28px">🤍</div>
          <div style="font-size:11px;color:#fff;margin-top:2px">${video.likes||0}</div>
        </div>
        <div style="text-align:center;cursor:pointer">
          <div style="font-size:28px">💬</div>
          <div style="font-size:11px;color:#fff;margin-top:2px">${video.commentsCount||0}</div>
        </div>
        <div style="text-align:center;cursor:pointer" onclick="NexusVideos.handleShare('${video.id}')">
          <div style="font-size:28px">↗️</div>
          <div style="font-size:11px;color:#fff;margin-top:2px">Share</div>
        </div>
      </div>
    `;
    return div;
  }

  // ─── PLAY CURRENT VIDEO ───────────────────────────────────────
  function _playCurrentVideo() {
    const slide = _container?.querySelector('.nexus-video-slide.active');
    if (!slide) return;
    const video = slide.querySelector('video');
    if (!video) return;
    video.muted = false;
    video.play().catch(() => { video.muted = true; video.play(); });
    _watchStart = Date.now();
  }

  // ─── SWIPE NAVIGATION ─────────────────────────────────────────
  function _setupSwipe() {
    if (!_container) return;
    let startY = 0;
    _container.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    _container.addEventListener('touchend', e => {
      const diff = startY - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 60) {
        diff > 0 ? _nextVideo() : _prevVideo();
      }
    }, { passive: true });

    // Tap to pause/resume
    _container.addEventListener('click', e => {
      if (e.target.closest('[onclick]')) return;
      const video = _container.querySelector('.nexus-video-slide.active video');
      if (!video) return;
      video.paused ? video.play() : video.pause();
    });
  }

  function _nextVideo() { _advanceVideo(1); }
  function _prevVideo() { _advanceVideo(-1); }

  function _advanceVideo(direction) {
    // Record watch time before moving
    if (_watchStart) {
      const duration = Date.now() - _watchStart;
      const current  = _videoQueue[_currentIndex];
      if (current) _recordVideoWatch(current.id, current.category, current.username, duration);
    }

    const newIndex = _currentIndex + direction;
    if (newIndex < 0 || newIndex >= _videoQueue.length) return;
    _currentIndex = newIndex;
    _renderSwipeStack();
    setTimeout(_playCurrentVideo, CONFIG.AUTOPLAY_DELAY_MS);

    // Preload more when nearing end
    if (_currentIndex >= _videoQueue.length - 3) _loadMoreVideos();
  }

  // ─── WATCH TIME RECORDING ─────────────────────────────────────
  async function _recordVideoWatch(postId, category, author, durationMs) {
    if (!_username || !postId) return;
    const video    = _videoQueue.find(v => v.id === postId);
    const vidDurMs = (video?.duration || 30) * 1000;
    const completion = Math.min(durationMs / vidDurMs, 1.0);

    try {
      // Update video completion rate (rolling average)
      const snap = await db.collection('posts').doc(postId).get();
      if (snap.exists) {
        const data = snap.data();
        const prevRate  = data.avgCompletionRate || 0;
        const prevViews = data.viewsCount || 0;
        const newRate   = ((prevRate * prevViews) + completion) / (prevViews + 1);

        await db.collection('posts').doc(postId).update({
          avgCompletionRate: newRate,
          viewsCount       : firebase.firestore.FieldValue.increment(1),
          engagementScore  : firebase.firestore.FieldValue.increment(completion * 2),
        });
      }

      // Update user's video behavior profile
      const completionScore = completion * 20;
      await db.collection('users').doc(_username)
        .collection('behavior').doc('videoSummary')
        .set({
          [`categoryScores.${category}`]             : firebase.firestore.FieldValue.increment(completionScore),
          [`authorScores.${author}`]                 : firebase.firestore.FieldValue.increment(completion * 5),
          [`completionByCategory.${category}`]       : firebase.firestore.FieldValue.increment(completion),
          totalVideosWatched                         : firebase.firestore.FieldValue.increment(1),
          lastUpdated                                : Date.now(),
        }, { merge: true });

    } catch(e) {}
  }

  async function _loadMoreVideos() {
    if (_isLoading) return;
    _isLoading = true;
    const videos = await _fetchVideos();
    const ranked = _rankVideos(videos);
    const seenIds = new Set(_videoQueue.map(v => v.id));
    const newVideos = ranked.filter(v => !seenIds.has(v.id));
    _videoQueue.push(...newVideos);
    _isLoading = false;
  }

  // ─── PUBLIC INTERACTION HANDLERS ──────────────────────────────
  async function handleLike(postId, category, author, btn) {
    const isLiked = btn.querySelector('div').textContent === '❤️';
    btn.querySelector('div').textContent = isLiked ? '🤍' : '❤️';
    const delta = isLiked ? -1 : 1;
    try {
      await db.collection('posts').doc(postId).update({
        likes           : firebase.firestore.FieldValue.increment(delta),
        engagementScore : firebase.firestore.FieldValue.increment(delta),
      });
      await db.collection('users').doc(_username)
        .collection('behavior').doc('videoSummary')
        .set({
          [`categoryScores.${category}`]: firebase.firestore.FieldValue.increment(delta * 10),
          lastUpdated: Date.now(),
        }, { merge: true });
    } catch(e) {}
  }

  async function handleShare(postId) {
    if (navigator.share) {
      await navigator.share({ title: 'Nexus Protocol', url: window.location.href });
    }
    try {
      await db.collection('posts').doc(postId).update({
        sharesCount     : firebase.firestore.FieldValue.increment(1),
        engagementScore : firebase.firestore.FieldValue.increment(3),
      });
    } catch(e) {}
  }

  return { init, handleLike, handleShare };

})();


// ════════════════════════════════════════════════════════════════
//
//  MODULE B: NEXUS EXPLORE
//  Instagram Explore / TikTok For You (Discovery)
//
//  Key difference from home feed:
//  • Shows ONLY posts from people you DON'T follow
//  • Collaborative filtering: "users like you also loved..."
//  • Grid layout (3-column) + expandable post view
//  • Serendipity factor: 10% completely random (to avoid bubble)
//  • Trending topics sidebar
//  • Search integration
//
// ════════════════════════════════════════════════════════════════
const NexusExplore = (() => {

  const CONFIG = {
    BATCH_SIZE        : 40,
    GRID_COLS         : 3,
    SERENDIPITY_RATE  : 0.10, // 10% random/unexpected content
    INTEREST_WEIGHT   : 0.50,
    TRENDING_WEIGHT   : 0.30,
    COLLAB_WEIGHT     : 0.20, // Collaborative filtering weight
  };

  let _username       = null;
  let _behavior       = {};
  let _interestProfile= {};
  let _followingList  = [];
  let _container      = null;

  // ─── MAIN ENTRY ───────────────────────────────────────────────
  async function init(username) {
    _username  = username;
    _container = document.querySelector('.feed-container') ||
                 document.getElementById('exploreContainer');
    if (!_container) return;

    _showGridSkeleton();
    await _loadContext();
    const candidates = await _fetchDiscoveryPosts();
    const ranked     = _rankForDiscovery(candidates);
    const withSerendipity = _injectSerendipity(ranked);
    _renderGrid(withSerendipity);
  }

  async function _loadContext() {
    try {
      const [userSnap, followingSnap, behaviorSnap] = await Promise.all([
        db.collection('users').doc(_username).get(),
        db.collection('users').doc(_username).collection('following').get(),
        db.collection('users').doc(_username)
          .collection('behavior').doc('summary').get()
      ]);
      const userData = userSnap.exists ? userSnap.data() : {};
      _behavior      = behaviorSnap.exists ? behaviorSnap.data() : {};
      _followingList = followingSnap.docs.map(d => d.id);
      _interestProfile = _buildProfile(userData.interests || [], _behavior.categoryScores || {});
    } catch(e) {}
  }

  function _buildProfile(interests, catScores) {
    const p = {};
    interests.forEach(c => { p[c] = (p[c] || 0) + 50; });
    Object.entries(catScores).forEach(([c, s]) => { p[c] = (p[c] || 0) + Math.min(s, 50); });
    const max = Math.max(...Object.values(p), 1);
    Object.keys(p).forEach(c => { p[c] = (p[c] / max) * 100; });
    return p;
  }

  // ─── FETCH DISCOVERY POSTS (non-followed only) ────────────────
  async function _fetchDiscoveryPosts() {
    const topCats = Object.entries(_interestProfile)
      .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c]) => c);

    const [interestSnap, trendingSnap, freshSnap] = await Promise.all([
      topCats.length > 0
        ? db.collection('posts')
            .where('category', 'in', topCats.slice(0, 10))
            .orderBy('engagementScore', 'desc')
            .limit(CONFIG.BATCH_SIZE)
            .get()
        : Promise.resolve({ docs: [] }),
      db.collection('posts')
        .orderBy('engagementScore', 'desc')
        .limit(CONFIG.BATCH_SIZE)
        .get(),
      db.collection('posts')
        .orderBy('timestamp', 'desc')
        .limit(CONFIG.BATCH_SIZE)
        .get()
    ]);

    const seen = new Set();
    const posts = [];
    [interestSnap, trendingSnap, freshSnap].forEach(snap => {
      if (!snap.docs) return;
      snap.docs.forEach(doc => {
        const data = doc.data();
        // EXCLUDE: own posts + posts from followed accounts
        if (!seen.has(doc.id) &&
            data.username !== _username &&
            !_followingList.includes(data.username)) {
          seen.add(doc.id);
          posts.push({ id: doc.id, ...data });
        }
      });
    });
    return posts;
  }

  // ─── DISCOVERY RANKING ────────────────────────────────────────
  function _rankForDiscovery(posts) {
    return posts.map(post => {
      const now    = Date.now();
      const ageHrs = post.timestamp ? (now - post.timestamp.toMillis()) / 3600000 : 999;
      let score    = 0;

      // 1. INTEREST AFFINITY
      const catScore = _interestProfile[post.category] || 0;
      score += (catScore / 100) * 50 * CONFIG.INTEREST_WEIGHT;

      // 2. ENGAGEMENT QUALITY (trending signal)
      const likes    = post.likes        || 0;
      const comments = post.commentsCount || 0;
      const shares   = post.sharesCount  || 0;
      const saves    = post.savesCount   || 0;
      const views    = post.viewsCount   || 1;
      const engRate  = ((likes + comments*2 + shares*3 + saves*4) / views) * 100;
      score += Math.min(engRate * 0.4, 30) * CONFIG.TRENDING_WEIGHT;

      // 3. COLLABORATIVE FILTERING (simplified)
      // If this author's category matches my top interests heavily → boost
      const collabBoost = catScore > 70 ? 15 : catScore > 40 ? 8 : 0;
      score += collabBoost * CONFIG.COLLAB_WEIGHT;

      // 4. RECENCY (lighter weight in explore — quality > freshness)
      const recency = Math.pow(0.5, ageHrs / 24); // 24h half-life
      score += recency * 10;

      // 5. MEDIA TYPE PREFERENCE
      const typePref = (_behavior.contentTypePrefs || {})[post.mediaType] || 0;
      score += (typePref / 100) * 8;

      return { ...post, _score: score };
    }).sort((a, b) => b._score - a._score);
  }

  // ─── SERENDIPITY INJECTION ────────────────────────────────────
  // Every 10th post is something unexpected (avoids filter bubble)
  function _injectSerendipity(ranked) {
    const result     = [...ranked];
    const serendipity= ranked.sort(() => Math.random() - 0.5).slice(0, 5);
    const interval   = Math.floor(1 / CONFIG.SERENDIPITY_RATE);

    serendipity.forEach((post, i) => {
      const insertAt = (i + 1) * interval;
      if (insertAt < result.length) result.splice(insertAt, 0, post);
    });

    return result;
  }

  // ─── RENDER GRID ──────────────────────────────────────────────
  function _renderGrid(posts) {
    if (!_container) return;
    if (posts.length === 0) {
      _container.innerHTML = `
        <div style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)">
          <div style="font-size:28px;margin-bottom:12px">✦</div>
          <div>Start following people and selecting interests to unlock Explore.</div>
        </div>`;
      return;
    }

    const grid = document.createElement('div');
    grid.style.cssText = `
      display:grid;
      grid-template-columns:repeat(${CONFIG.GRID_COLS},1fr);
      gap:2px; width:100%;`;

    posts.forEach((post, idx) => {
      const cell = document.createElement('div');
      // Every 7th post is featured (spans 2 cols, like Instagram)
      const isFeatured = idx % 7 === 3;
      cell.style.cssText = `
        position:relative;
        aspect-ratio:1;
        overflow:hidden;
        cursor:pointer;
        background:#0a0a0a;
        ${isFeatured ? 'grid-column:span 2; grid-row:span 2;' : ''}`;

      if (post.mediaUrl && post.mediaType === 'video') {
        cell.innerHTML = `
          <video src="${post.mediaUrl}" muted loop preload="metadata"
            style="width:100%;height:100%;object-fit:cover;">
          </video>
          <div style="position:absolute;top:6px;right:6px;font-size:13px">▶️</div>`;
      } else if (post.mediaUrl) {
        cell.innerHTML = `
          <img src="${post.mediaUrl}" alt="" loading="lazy"
            style="width:100%;height:100%;object-fit:cover;" />`;
      } else {
        // Text-only post
        cell.style.background = 'linear-gradient(135deg,#1a1500,#0a0800)';
        cell.innerHTML = `
          <div style="padding:12px;font-size:${isFeatured?'13px':'10px'};
               color:rgba(255,255,255,0.8);line-height:1.5;
               display:flex;align-items:center;height:100%;">
            ${(post.content||'').substring(0, isFeatured ? 120 : 60)}
          </div>`;
      }

      // Hover overlay with engagement stats
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:absolute;inset:0;background:rgba(0,0,0,0.55);
        display:none;align-items:center;justify-content:center;
        gap:16px;color:#fff;font-weight:700;font-size:13px;`;
      overlay.innerHTML = `
        <span>❤️ ${post.likes||0}</span>
        <span>💬 ${post.commentsCount||0}</span>`;
      cell.appendChild(overlay);
      cell.addEventListener('mouseenter', () => overlay.style.display = 'flex');
      cell.addEventListener('mouseleave', () => overlay.style.display = 'none');

      // Tap to open post
      cell.addEventListener('click', () => _openPost(post));
      grid.appendChild(cell);
    });

    _container.innerHTML = '';
    _container.appendChild(grid);

    // Observe videos for autoplay in grid
    const videoObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const vid = e.target.querySelector('video');
        if (!vid) return;
        e.isIntersecting ? vid.play() : vid.pause();
      });
    }, { threshold: 0.5 });
    grid.querySelectorAll('div').forEach(cell => {
      if (cell.querySelector('video')) videoObs.observe(cell);
    });
  }

  function _openPost(post) {
    // Open post in full — use existing post overlay or navigate
    if (typeof openPostDetail === 'function') {
      openPostDetail(post);
    } else {
      // Fallback: generate full post card in overlay
      const overlay = document.getElementById('postOverlay');
      if (overlay && typeof generatePostHTML === 'function') {
        overlay.style.display = 'flex';
        overlay.querySelector('.overlay-content').innerHTML = generatePostHTML(post);
      }
    }
  }

  function _showGridSkeleton() {
    if (!_container) return;
    const cell = `<div style="aspect-ratio:1;background:rgba(255,255,255,0.03);animation:skPulse 1.5s infinite alternate;"></div>`;
    _container.innerHTML = `
      <style>@keyframes skPulse{from{opacity:0.3}to{opacity:0.7}}</style>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;">
        ${cell.repeat(12)}
      </div>`;
  }

  return { init };

})();
