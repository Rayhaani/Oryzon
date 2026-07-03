/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         NEXUS PROTOCOL — PERSONALIZED FEED ALGORITHM        ║
 * ║                       Version 1.0                           ║
 * ║  Inspired by Meta, TikTok & X ranking systems               ║
 * ║  Author: Nexus Engineering Team                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * HOW TO USE IN social.html:
 *   1. Add this line before </body>:
 *      <script src="nexus-algorithm.js"></script>
 *   2. Replace renderNexusFeed() call with:
 *      NexusAlgorithm.init(currentUser);
 *   3. Ensure db and generatePostHTML() are already available.
 *
 * FIRESTORE INDEXES REQUIRED (Firebase Console → Indexes):
 *   Collection: posts
 *   Fields: timestamp (desc)
 *   Fields: engagementScore (desc), timestamp (desc)
 *   Fields: category (asc), timestamp (desc)
 *   Fields: category (asc), engagementScore (desc)
 */

const NexusAlgorithm = (() => {

  // ══════════════════════════════════════════
  //  CONFIGURATION
  // ══════════════════════════════════════════
  const CONFIG = {
    FEED_BATCH_SIZE      : 40,      // Posts fetched per source
    FEED_DISPLAY_SIZE    : 30,      // Posts shown per render
    MAX_PER_AUTHOR       : 3,       // Diversity cap per author
    CACHE_DURATION_MS    : 10 * 60 * 1000,  // 10-min feed cache
    RECENCY_HALFLIFE_HRS : 8,       // Score half-life (hours)
    VIEW_THRESHOLD_MS    : 2000,    // Min view time to count (ms)
    TRENDING_WINDOW_HRS  : 48,      // Posts considered "trending"

    // Feed composition (must sum to 1.0)
    WEIGHT_FOLLOWING     : 0.55,    // 55% from people you follow
    WEIGHT_INTERESTS     : 0.25,    // 25% interest-based discovery
    WEIGHT_TRENDING      : 0.20,    // 20% trending / viral

    // Scoring weights (must sum to 100)
    SCORE_RELATIONSHIP   : 30,
    SCORE_INTEREST       : 28,
    SCORE_ENGAGEMENT     : 22,
    SCORE_RECENCY        : 12,
    SCORE_CONTENT_TYPE   : 5,
    SCORE_VELOCITY       : 3,
  };

  // ══════════════════════════════════════════
  //  STATE
  // ══════════════════════════════════════════
  let _username       = null;
  let _userDoc        = null;
  let _behavior       = {};
  let _followingList  = [];
  let _interestProfile= {};
  let _seenPostIds    = new Set();
  let _viewTimers     = {};
  let _observer       = null;
  let _isLoading      = false;
  let _feedContainer  = null;

  // ══════════════════════════════════════════
  //  MAIN ENTRY POINT
  // ══════════════════════════════════════════
  async function init(username) {
    if (!username || !db) return;
    _username = username;
    _feedContainer = document.querySelector('.feed-container');
    if (!_feedContainer) return;

    _showSkeleton();

    try {
      await _loadUserContext();
      const posts = await _fetchCandidatePosts();
      const scored = _scoreAndRank(posts);
      const feed = _applyDiversityRules(scored);
      await _renderFeed(feed);
      _setupScrollPagination();
      _setupEngagementTracking();
    } catch (err) {
      console.error('[NexusAlgorithm] Init error:', err);
      _fallbackRender();
    }
  }

  // ══════════════════════════════════════════
  //  PHASE 1: LOAD USER CONTEXT
  // ══════════════════════════════════════════
  async function _loadUserContext() {
    const [userSnap, followingSnap, behaviorSnap] = await Promise.all([
      db.collection('users').doc(_username).get(),
      db.collection('users').doc(_username).collection('following').get(),
      db.collection('users').doc(_username)
        .collection('behavior').doc('summary').get()
    ]);

    _userDoc   = userSnap.exists ? userSnap.data() : {};
    _behavior  = behaviorSnap.exists ? behaviorSnap.data() : {};
    _followingList = followingSnap.docs.map(d => d.id);

    // Build weighted interest profile
    // Merge onboarding interests + behavioral category scores
    _interestProfile = _buildInterestProfile();
  }

  function _buildInterestProfile() {
    const profile = {};

    // Base from onboarding: each selected interest = 50 points
    const onboardingInterests = _userDoc.interests || [];
    onboardingInterests.forEach(cat => {
      profile[cat] = (profile[cat] || 0) + 50;
    });

    // Add behavioral signals (from actual engagement)
    const behaviorCats = _behavior.categoryScores || {};
    Object.entries(behaviorCats).forEach(([cat, score]) => {
      profile[cat] = (profile[cat] || 0) + Math.min(score, 50);
    });

    // Normalize to 0-100
    const maxScore = Math.max(...Object.values(profile), 1);
    Object.keys(profile).forEach(cat => {
      profile[cat] = (profile[cat] / maxScore) * 100;
    });

    return profile;
  }

  // ══════════════════════════════════════════
  //  PHASE 2: FETCH CANDIDATE POSTS
  //  Multi-source parallel fetching (Meta approach)
  // ══════════════════════════════════════════
  async function _fetchCandidatePosts() {
    const now = Date.now();
    const trendingCutoff = new Date(now - CONFIG.TRENDING_WINDOW_HRS * 3600000);

    // Determine top followed accounts (max 10 for Firestore "in" query)
    const authorScores = _behavior.authorScores || {};
    const topFollowing = _followingList
      .sort((a, b) => (authorScores[b] || 0) - (authorScores[a] || 0))
      .slice(0, 10);

    // Top interest categories for discovery
    const topCategories = Object.entries(_interestProfile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cat]) => cat);

    // Parallel fetch from 3 sources
    const fetchPromises = [
      // SOURCE A: Posts from followed accounts
      topFollowing.length > 0
        ? db.collection('posts')
            .where('username', 'in', topFollowing)
            .orderBy('timestamp', 'desc')
            .limit(CONFIG.FEED_BATCH_SIZE)
            .get()
        : Promise.resolve({ docs: [] }),

      // SOURCE B: Interest-based discovery
      topCategories.length > 0
        ? db.collection('posts')
            .where('category', 'in', topCategories.slice(0, 10))
            .orderBy('timestamp', 'desc')
            .limit(CONFIG.FEED_BATCH_SIZE)
            .get()
        : Promise.resolve({ docs: [] }),

      // SOURCE C: Trending / viral (high engagement, recent)
      db.collection('posts')
        .orderBy('engagementScore', 'desc')
        .limit(CONFIG.FEED_BATCH_SIZE)
        .get(),

      // SOURCE D: General recency (ensures feed is never empty)
      db.collection('posts')
        .orderBy('timestamp', 'desc')
        .limit(CONFIG.FEED_BATCH_SIZE)
        .get(),
    ];

    const [followingSnap, interestSnap, trendingSnap, recentSnap] =
      await Promise.all(fetchPromises);

    // Merge & deduplicate across all sources
    const seen = new Set();
    const allPosts = [];

    const addFromSnap = (snap, source) => {
      if (!snap || !snap.docs) return;
      snap.docs.forEach(doc => {
        if (!seen.has(doc.id) && doc.id !== _username) {
          seen.add(doc.id);
          allPosts.push({
            id: doc.id,
            _source: source,
            ...doc.data()
          });
        }
      });
    };

    addFromSnap(followingSnap,  'following');
    addFromSnap(interestSnap,   'interest');
    addFromSnap(trendingSnap,   'trending');
    addFromSnap(recentSnap,     'recent');

    return allPosts;
  }

  // ══════════════════════════════════════════
  //  PHASE 3: MULTI-FACTOR SCORING
  //  Inspired by Meta's EdgeRank + TikTok's
  //  interest graph + X's velocity signals
  // ══════════════════════════════════════════
  function _scorePost(post) {
    const now = Date.now();
    let score = 0;

    const postAgeMs  = post.timestamp
      ? now - post.timestamp.toMillis()
      : 999 * 3600000;
    const postAgeHrs = postAgeMs / 3600000;

    // ── 1. RELATIONSHIP STRENGTH (0-30 pts) ────────────────────
    if (_followingList.includes(post.username)) {
      score += 20; // Base: you follow this person

      // Bonus: how often you've interacted with this author
      const authorAffinity = (_behavior.authorScores || {})[post.username] || 0;
      score += Math.min(authorAffinity * 0.5, 10);
    }

    // ── 2. INTEREST AFFINITY (0-28 pts) ────────────────────────
    const categoryScore = _interestProfile[post.category] || 0;
    score += (categoryScore / 100) * CONFIG.SCORE_INTEREST;

    // ── 3. ENGAGEMENT QUALITY (0-22 pts) ───────────────────────
    const likes    = post.likes        || 0;
    const comments = post.commentsCount || 0;
    const shares   = post.sharesCount  || 0;
    const saves    = post.savesCount   || 0;
    const views    = post.viewsCount   || 0;

    // Weighted engagement — saves & comments weighted highest
    // (Meta internally weights saves 3-4x likes)
    const weightedEng =
      (likes    * 1.0) +
      (comments * 2.0) +
      (shares   * 3.0) +
      (saves    * 4.0) +
      (views    * 0.05);

    score += Math.min(weightedEng * 0.15, CONFIG.SCORE_ENGAGEMENT);

    // ── 4. RECENCY DECAY (0-12 pts) ────────────────────────────
    // Exponential decay — half-life = CONFIG.RECENCY_HALFLIFE_HRS
    const decayFactor = Math.pow(0.5, postAgeHrs / CONFIG.RECENCY_HALFLIFE_HRS);
    score += CONFIG.SCORE_RECENCY * decayFactor;

    // ── 5. CONTENT TYPE PREFERENCE (0-5 pts) ───────────────────
    const userTypePref = (_behavior.contentTypePrefs || {})[post.mediaType] || 0;
    score += (userTypePref / 100) * CONFIG.SCORE_CONTENT_TYPE;

    // ── 6. ENGAGEMENT VELOCITY (0-3 pts) ───────────────────────
    // How fast is this post gaining traction?
    const velocity = post.engagementVelocity || 0; // eng/hour
    score += Math.min(velocity * 0.3, CONFIG.SCORE_VELOCITY);

    // ── BONUSES & PENALTIES ─────────────────────────────────────

    // Cold-start bonus: new user with no behavior → boost recent popular posts
    if (Object.keys(_behavior).length === 0 && likes > 5) {
      score += 8;
    }

    // Already-seen penalty
    if (_seenPostIds.has(post.id)) {
      score -= 100;
    }

    // Own post suppression (don't show user their own posts in home feed)
    if (post.username === _username) {
      score -= 200;
    }

    return Math.max(score, 0);
  }

  function _scoreAndRank(posts) {
    return posts
      .map(post => ({ ...post, _score: _scorePost(post) }))
      .sort((a, b) => b._score - a._score);
  }

  // ══════════════════════════════════════════
  //  PHASE 4: DIVERSITY & COMPOSITION RULES
  //  Ensures feed isn't dominated by one author
  //  or one content type (Meta does this too)
  // ══════════════════════════════════════════
  function _applyDiversityRules(scoredPosts) {
    const result    = [];
    const perAuthor = {};
    let   videoCount = 0;

    for (const post of scoredPosts) {
      if (result.length >= CONFIG.FEED_DISPLAY_SIZE) break;

      // Max N posts per author
      const authCount = perAuthor[post.username] || 0;
      if (authCount >= CONFIG.MAX_PER_AUTHOR) continue;

      // Max 40% videos in first 10 posts (content diversity)
      if (post.mediaType === 'video' && result.length < 10 && videoCount >= 4) continue;

      perAuthor[post.username] = authCount + 1;
      if (post.mediaType === 'video') videoCount++;

      result.push(post);
    }

    return result;
  }

  // ══════════════════════════════════════════
  //  PHASE 5: RENDER
  // ══════════════════════════════════════════
  async function _renderFeed(posts) {
    if (!_feedContainer) return;

    if (posts.length === 0) {
      _feedContainer.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:rgba(255,255,255,0.3)">
          <div style="font-size:32px;margin-bottom:12px">✦</div>
          <div style="font-family:'Orbitron',sans-serif;font-size:13px;letter-spacing:1px">YOUR FEED IS BEING CALIBRATED</div>
          <div style="font-size:12px;margin-top:8px;line-height:1.6">Follow people and select interests to unlock your personalised feed.</div>
        </div>`;
      return;
    }

    // Render posts using existing template
    let html = '';
    posts.forEach(post => {
      if (typeof generatePostHTML === 'function') {
        html += generatePostHTML(post);
      }
    });
    _feedContainer.innerHTML = html;

    // Track which posts were rendered as seen
    posts.forEach(p => _seenPostIds.add(p.id));

    // Restore likes & load avatars (existing logic)
    setTimeout(() => {
      if (typeof postCard_restoreLikes === 'function') postCard_restoreLikes(_feedContainer);
      _loadAvatars(posts);
      _loadCommentCounts(posts);
    }, 400);

    if (typeof postCard_observeVideos === 'function') postCard_observeVideos();
    setTimeout(() => {
      if (typeof postCard_handleVideoPriority === 'function') postCard_handleVideoPriority();
    }, 600);
  }

  function _loadAvatars(posts) {
    posts.forEach(post => {
      if (!post.username) return;
      db.collection('users').doc(post.username).get().then(doc => {
        if (!doc.exists) return;
        const pic = doc.data().userProfilePic;
        if (!pic) return;
        const card = _feedContainer.querySelector(`.post-card[data-post-id="${post.id}"]`);
        if (card) {
          const av = card.querySelector('.post-avatar');
          if (av) av.src = pic;
        }
      });
    });
  }

  function _loadCommentCounts(posts) {
    posts.forEach(post => {
      db.collection('nexus_contributions')
        .where('postId', '==', post.id)
        .where('parentId', '==', null)
        .onSnapshot(snap => {
          const el = document.getElementById(`comment-count-${post.id}`);
          if (el) el.textContent = snap.size;
        });
    });
  }

  // ══════════════════════════════════════════
  //  PHASE 6: ENGAGEMENT TRACKING
  //  The learning engine — every interaction
  //  trains the algorithm in real-time
  // ══════════════════════════════════════════
  function _setupEngagementTracking() {
    // View time tracking (IntersectionObserver)
    _observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const card = entry.target;
        const postId = card.dataset.postId;
        if (!postId) return;

        if (entry.isIntersecting) {
          // Post entered viewport: start timer
          _viewTimers[postId] = Date.now();
        } else {
          // Post left viewport: record view duration
          if (_viewTimers[postId]) {
            const duration = Date.now() - _viewTimers[postId];
            delete _viewTimers[postId];

            if (duration >= CONFIG.VIEW_THRESHOLD_MS) {
              const postData = _getPostDataFromCard(card);
              _recordViewSignal(postId, postData, duration);
            }
          }
        }
      });
    }, { threshold: 0.5 }); // 50% visible counts as a view

    // Observe all post cards
    document.querySelectorAll('.post-card').forEach(card => {
      _observer.observe(card);
    });
  }

  function _getPostDataFromCard(card) {
    return {
      category : card.dataset.category || '',
      username : card.dataset.username || '',
      mediaType: card.dataset.mediaType || 'none',
    };
  }

  // Record a meaningful view signal
  async function _recordViewSignal(postId, postData, durationMs) {
    if (!_username || !postId) return;

    const viewScore = Math.min(durationMs / 1000, 10); // max 10 pts for 10s+ view

    try {
      // Update user behavior profile
      const behaviorUpdate = {};
      if (postData.category) {
        behaviorUpdate[`categoryScores.${postData.category}`] =
          firebase.firestore.FieldValue.increment(viewScore);
      }
      if (postData.username && postData.username !== _username) {
        behaviorUpdate[`authorScores.${postData.username}`] =
          firebase.firestore.FieldValue.increment(1);
      }
      if (postData.mediaType && postData.mediaType !== 'none') {
        behaviorUpdate[`contentTypePrefs.${postData.mediaType}`] =
          firebase.firestore.FieldValue.increment(viewScore);
      }
      behaviorUpdate['lastUpdated'] = Date.now();

      await db.collection('users').doc(_username)
        .collection('behavior').doc('summary')
        .set(behaviorUpdate, { merge: true });

      // Update post view count + engagement score
      await db.collection('posts').doc(postId).update({
        viewsCount     : firebase.firestore.FieldValue.increment(1),
        engagementScore: firebase.firestore.FieldValue.increment(0.1),
      });

    } catch (e) {
      console.warn('[NexusAlgorithm] View signal error:', e.message);
    }
  }

  // ══ PUBLIC: Call this on like action ══
  async function trackLike(postId, postCategory, postAuthor, isLiked) {
    if (!_username) return;
    const delta = isLiked ? 1 : -1;
    try {
      await db.collection('users').doc(_username)
        .collection('behavior').doc('summary')
        .set({
          [`categoryScores.${postCategory}`]: firebase.firestore.FieldValue.increment(delta * 8),
          [`authorScores.${postAuthor}`]    : firebase.firestore.FieldValue.increment(delta * 3),
          lastUpdated: Date.now(),
        }, { merge: true });

      // Update post engagement score
      await db.collection('posts').doc(postId).update({
        engagementScore: firebase.firestore.FieldValue.increment(delta * 1),
        // Update velocity (for trending calculation)
        engagementVelocity: firebase.firestore.FieldValue.increment(delta * 0.1),
      });
    } catch(e) {}
  }

  // ══ PUBLIC: Call this on comment action ══
  async function trackComment(postId, postCategory, postAuthor) {
    if (!_username) return;
    try {
      await db.collection('users').doc(_username)
        .collection('behavior').doc('summary')
        .set({
          [`categoryScores.${postCategory}`]: firebase.firestore.FieldValue.increment(15),
          [`authorScores.${postAuthor}`]    : firebase.firestore.FieldValue.increment(5),
          lastUpdated: Date.now(),
        }, { merge: true });

      await db.collection('posts').doc(postId).update({
        engagementScore   : firebase.firestore.FieldValue.increment(2),
        engagementVelocity: firebase.firestore.FieldValue.increment(0.2),
      });
    } catch(e) {}
  }

  // ══ PUBLIC: Call this on share/save action ══
  async function trackSave(postId, postCategory, postAuthor) {
    if (!_username) return;
    try {
      await db.collection('users').doc(_username)
        .collection('behavior').doc('summary')
        .set({
          [`categoryScores.${postCategory}`]: firebase.firestore.FieldValue.increment(20),
          [`authorScores.${postAuthor}`]    : firebase.firestore.FieldValue.increment(6),
          lastUpdated: Date.now(),
        }, { merge: true });

      await db.collection('posts').doc(postId).update({
        savesCount    : firebase.firestore.FieldValue.increment(1),
        engagementScore: firebase.firestore.FieldValue.increment(4),
      });
    } catch(e) {}
  }

  // ══════════════════════════════════════════
  //  INFINITE SCROLL / PAGINATION
  // ══════════════════════════════════════════
  function _setupScrollPagination() {
    const sentinel = document.createElement('div');
    sentinel.id = 'feed-sentinel';
    sentinel.style.height = '20px';
    if (_feedContainer) _feedContainer.appendChild(sentinel);

    const scrollObs = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting && !_isLoading) {
        _isLoading = true;
        await _loadMore();
        _isLoading = false;
      }
    }, { threshold: 1.0 });

    scrollObs.observe(sentinel);
  }

  async function _loadMore() {
    // Fetch next batch, excluding already-seen posts
    try {
      const snap = await db.collection('posts')
        .orderBy('timestamp', 'desc')
        .limit(CONFIG.FEED_BATCH_SIZE * 2)
        .get();

      const newPosts = [];
      snap.forEach(doc => {
        if (!_seenPostIds.has(doc.id)) {
          newPosts.push({ id: doc.id, ...doc.data() });
        }
      });

      if (newPosts.length === 0) return;

      const scored    = _scoreAndRank(newPosts);
      const diversified = _applyDiversityRules(scored);

      // Append new posts to feed
      const sentinel = document.getElementById('feed-sentinel');
      diversified.forEach(post => {
        if (typeof generatePostHTML !== 'function') return;
        const div = document.createElement('div');
        div.innerHTML = generatePostHTML(post);
        const card = div.firstElementChild;
        if (card && sentinel) {
          _feedContainer.insertBefore(card, sentinel);
          if (_observer) _observer.observe(card);
        }
        _seenPostIds.add(post.id);
      });

      _loadAvatars(diversified);
      if (typeof postCard_observeVideos === 'function') postCard_observeVideos();

    } catch(e) {
      console.warn('[NexusAlgorithm] Load more error:', e.message);
    }
  }

  // ══════════════════════════════════════════
  //  SKELETON LOADER
  // ══════════════════════════════════════════
  function _showSkeleton() {
    if (!_feedContainer) return;
    const skeletonCard = `
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:18px;padding:16px;margin-bottom:14px;animation:skPulse 1.5s infinite alternate;">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px">
          <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.05)"></div>
          <div><div style="width:100px;height:9px;border-radius:5px;background:rgba(255,255,255,0.05);margin-bottom:6px"></div><div style="width:60px;height:7px;border-radius:5px;background:rgba(255,255,255,0.04)"></div></div>
        </div>
        <div style="width:100%;height:220px;border-radius:12px;background:rgba(255,255,255,0.04)"></div>
        <div style="margin-top:12px;width:70%;height:8px;border-radius:5px;background:rgba(255,255,255,0.05)"></div>
      </div>`;
    _feedContainer.innerHTML = `
      <style>@keyframes skPulse{from{opacity:0.4}to{opacity:0.8}}</style>
      ${skeletonCard.repeat(3)}`;
  }

  // ══════════════════════════════════════════
  //  FALLBACK: Regular chronological feed
  //  (if algorithm fails for any reason)
  // ══════════════════════════════════════════
  function _fallbackRender() {
    db.collection('posts').orderBy('timestamp', 'desc').limit(20)
      .onSnapshot(snap => {
        if (!_feedContainer) return;
        let html = '';
        snap.forEach(doc => {
          if (typeof generatePostHTML === 'function')
            html += generatePostHTML({ id: doc.id, ...doc.data() });
        });
        _feedContainer.innerHTML = html || '<div style="text-align:center;padding:30px;color:#aaa">No posts yet.</div>';
        setTimeout(() => {
          if (typeof postCard_restoreLikes === 'function') postCard_restoreLikes(_feedContainer);
          if (typeof postCard_observeVideos === 'function') postCard_observeVideos();
        }, 400);
      });
  }

  // ══════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════
  return {
    init,
    trackLike,
    trackComment,
    trackSave,
  };

})();

/**
 * ══════════════════════════════════════════════════
 *  NEXUS ENGAGEMENT VELOCITY UPDATER
 *  Run this server-side (or via Cloud Function)
 *  every 30 minutes to update engagementVelocity
 *  on posts younger than 48 hours.
 *  For now, we approximate it client-side below.
 * ══════════════════════════════════════════════════
 *
 *  CLOUD FUNCTION (optional, deploy when ready):
 *
 *  exports.updateVelocity = functions.pubsub
 *    .schedule('every 30 minutes').onRun(async () => {
 *      const cutoff = admin.firestore.Timestamp.fromMillis(
 *        Date.now() - 48 * 3600000
 *      );
 *      const snap = await admin.firestore()
 *        .collection('posts')
 *        .where('timestamp', '>', cutoff)
 *        .get();
 *      const batch = admin.firestore().batch();
 *      snap.forEach(doc => {
 *        const data = doc.data();
 *        const ageHrs = (Date.now() - data.timestamp.toMillis()) / 3600000;
 *        const totalEng = (data.likes||0) + (data.commentsCount||0)*2 + (data.sharesCount||0)*3;
 *        const velocity = ageHrs > 0 ? totalEng / ageHrs : 0;
 *        batch.update(doc.ref, { engagementVelocity: velocity });
 *      });
 *      await batch.commit();
 *    });
 */
