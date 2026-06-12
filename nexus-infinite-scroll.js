/* ============================================================
   NEXUS INFINITE SCROLL ENGINE — Instagram-Style
   
   YADDA YAKE AIKI:
   • Scroll UP   → Fetch older posts (before oldest in view)
   • Scroll DOWN → Fetch newest posts (real-time refresh)
   • Deduplication → Post ɗaya ba zai zo sau biyu ba
   • Batch size → 5 posts per fetch (kamar Instagram)
   • Preload threshold → Yana fetch kafin ka kai ƙarshen list
   ============================================================ */

(function NexusInfiniteScroll() {

    // ============================================================
    // 1. STATE MANAGEMENT
    // ============================================================
    const STATE = {
        // Cursor din mafi tsoho (oldest) post da muke da shi
        oldestCursor:       null,
        // Cursor din mafi sabo (newest) post da muke da shi
        newestCursor:       null,

        isFetchingOlder:    false,   // Guard - kar a double-fetch sama
        isFetchingNewer:    false,   // Guard - kar a double-fetch kasa
        hasMoreOlder:       true,    // Idan false, babu wasu posts ƙari sama
        
        seenPostIds:        new Set(), // Deduplication registry
        BATCH_SIZE:         5,         // Posts per fetch — exactly kamar Instagram
        
        // Preload threshold: Fara fetch idan 2 cards suka rage
        PRELOAD_THRESHOLD:  2,
        
        lastScrollY:        0,
        scrollDirection:    null,     // 'up' ko 'down'
        
        // Real-time listener handle
        newPostsUnsubscribe: null,
        
        // Container da muke saka posts ciki
        feedContainer:      null,
    };


    // ============================================================
    // 2. SCROLL DIRECTION DETECTOR
    //    Yana gane ko ana tafi sama ko kasa, yana kiran
    //    handler ɗin da ya dace
    // ============================================================
    function initScrollDetector() {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;

                // Gane direction
                if (currentScrollY < STATE.lastScrollY) {
                    STATE.scrollDirection = 'up';
                } else if (currentScrollY > STATE.lastScrollY) {
                    STATE.scrollDirection = 'down';
                }

                STATE.lastScrollY = currentScrollY;

                // --- CHECK: Kusa da sama? Fetch older ---
                if (STATE.scrollDirection === 'up') {
                    const distanceFromTop = currentScrollY;
                    const cardHeight = estimateCardHeight();

                    // Idan mun zo kusa da saman feed (threshold cards suka rage)
                    if (distanceFromTop < (cardHeight * STATE.PRELOAD_THRESHOLD)) {
                        fetchOlderPosts();
                    }
                }

                // --- CHECK: Kusa da kasa? Mana ne yake handling newer ---
                // Newer posts ana handling su ta real-time listener,
                // amma idan user ya scroll kasa ƙwarai, muna trigger manual refresh
                if (STATE.scrollDirection === 'down') {
                    const distanceFromBottom =
                        document.documentElement.scrollHeight
                        - window.scrollY
                        - window.innerHeight;

                    if (distanceFromBottom < 200) {
                        // Ƙarshen feed — show "you're up to date" indicator
                        showUpToDateIndicator();
                    }
                }

                ticking = false;
            });
        }, { passive: true });
    }


    // ============================================================
    // 3. FETCH OLDER POSTS (Scroll UP)
    //    → Query Firestore: posts da timestamp ƙanƙara da mafi tsoho
    //      da muke da shi a yanzu
    // ============================================================
    async function fetchOlderPosts() {
        // Guards
        if (STATE.isFetchingOlder) return;
        if (!STATE.hasMoreOlder) return;
        if (!STATE.oldestCursor) return;
        if (typeof db === 'undefined') return;

        STATE.isFetchingOlder = true;
        showSkeletonLoader('top');

        try {
            const snapshot = await db.collection('posts')
                .orderBy('timestamp', 'desc')
                // Bayan mafi tsoho cursor — wato posts da suka gabace shi
                .startAfter(STATE.oldestCursor)
                .limit(STATE.BATCH_SIZE)
                .get();

            removeSkeletonLoader('top');

            if (snapshot.empty || snapshot.docs.length < STATE.BATCH_SIZE) {
                STATE.hasMoreOlder = false;
                if (snapshot.empty) {
                    showEndOfFeedIndicator();
                    STATE.isFetchingOlder = false;
                    return;
                }
            }

            // Adana scroll position kafin mu saka posts a sama
            const scrollAnchor = document.documentElement.scrollHeight;

            // Saka posts a SAMA (prepend) — kamar Instagram
            const fragment = document.createDocumentFragment();
            const newCards = [];

            snapshot.docs.forEach(doc => {
                if (STATE.seenPostIds.has(doc.id)) return; // Skip duplicates

                const post = { id: doc.id, ...doc.data() };
                STATE.seenPostIds.add(doc.id);
                newCards.push({ doc, post });
            });

            // Reverse saboda muna prepend — oldest ya zo sama, newest ƙasa
            newCards.reverse().forEach(({ doc, post }) => {
                const wrapper = createPostWrapper(post);
                STATE.feedContainer.insertBefore(wrapper, STATE.feedContainer.firstChild);
            });

            // Update oldest cursor zuwa last doc na wannan batch
            if (snapshot.docs.length > 0) {
                STATE.oldestCursor = snapshot.docs[snapshot.docs.length - 1];
            }

            // Maintain scroll position — kar user ya "jump"
            // Instagram trick: adjust scrollY ta bambancin height da aka ƙara
            const heightAdded = document.documentElement.scrollHeight - scrollAnchor;
            window.scrollBy({ top: heightAdded, behavior: 'instant' });

            // Observe videos ɗin da aka ƙara
            if (typeof window.postCard_observeVideos === 'function') {
                window.postCard_observeVideos();
            }

        } catch (error) {
            console.error('[Nexus Scroll] fetchOlderPosts error:', error);
            removeSkeletonLoader('top');
        }

        STATE.isFetchingOlder = false;
    }


    // ============================================================
    // 4. REAL-TIME NEW POSTS LISTENER (Scroll DOWN / Refresh)
    //    → Firestore onSnapshot — yana listening live
    //    → Idan akwai sabon post, yana append a ƙasa feed
    //      kuma yana nuna "New posts available ↑" badge
    //      (kamar Instagram's "New posts" pill)
    // ============================================================
    function initNewPostsListener() {
        if (typeof db === 'undefined') return;
        if (STATE.newPostsUnsubscribe) STATE.newPostsUnsubscribe();

        // Listen kawai daga mafi sabbin cursor zuwa gaba
        let query = db.collection('posts').orderBy('timestamp', 'desc');

        if (STATE.newestCursor) {
            query = query.endBefore(STATE.newestCursor);
        }

        STATE.newPostsUnsubscribe = query
            .limit(STATE.BATCH_SIZE)
            .onSnapshot(snapshot => {
                const genuinelyNew = [];

                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const doc = change.doc;
                        if (!STATE.seenPostIds.has(doc.id)) {
                            genuinelyNew.push({ id: doc.id, ...doc.data(), _doc: doc });
                        }
                    }
                });

                if (genuinelyNew.length === 0) return;

                // Update newest cursor
                STATE.newestCursor = genuinelyNew[0]._doc;

                // Idan user yana sama (top of feed), auto-prepend silently
                const isAtTop = window.scrollY < 100;

                if (isAtTop) {
                    // Auto-inject a gaba — user zai ganta nan da nan
                    genuinelyNew.forEach(post => {
                        if (STATE.seenPostIds.has(post.id)) return;
                        STATE.seenPostIds.add(post.id);
                        const wrapper = createPostWrapper(post);
                        STATE.feedContainer.insertBefore(wrapper, STATE.feedContainer.firstChild);
                    });

                    if (typeof window.postCard_observeVideos === 'function') {
                        window.postCard_observeVideos();
                    }

                } else {
                    // User yana ƙasa — nuna "New Posts" pill
                    // (Kamar Instagram's blue "New posts" button)
                    showNewPostsPill(genuinelyNew.length, genuinelyNew);
                }
            }, error => {
                console.error('[Nexus Scroll] Real-time listener error:', error);
            });
    }


    // ============================================================
    // 5. INITIAL LOAD — Farkon load na page
    //    Yana kiran wannan function ɗin daga social.html
    //    maimakon direct db.collection() call
    // ============================================================
    window.nexusInitFeed = async function(container) {
        STATE.feedContainer = container || document.querySelector('.feed-container');
        if (!STATE.feedContainer) {
            console.error('[Nexus Scroll] Feed container not found!');
            return;
        }
        if (typeof db === 'undefined') {
            console.error('[Nexus Scroll] Firebase db not initialized!');
            return;
        }

        // Show initial skeletons
        showSkeletonLoader('initial');

        try {
            const snapshot = await db.collection('posts')
                .orderBy('timestamp', 'desc')
                .limit(STATE.BATCH_SIZE)
                .get();

            removeSkeletonLoader('initial');

            if (snapshot.empty) {
                STATE.feedContainer.innerHTML = `
                    <div style="text-align:center;padding:40px;color:rgba(255,255,255,0.3);">
                        No posts yet. Be the first! 🚀
                    </div>`;
                return;
            }

            // Render initial batch
            snapshot.docs.forEach(doc => {
                const post = { id: doc.id, ...doc.data() };
                if (STATE.seenPostIds.has(doc.id)) return;
                STATE.seenPostIds.add(doc.id);

                const wrapper = createPostWrapper(post);
                STATE.feedContainer.appendChild(wrapper);
            });

            // Set cursors
            STATE.newestCursor = snapshot.docs[0];
            STATE.oldestCursor = snapshot.docs[snapshot.docs.length - 1];

            // Start engines
            initScrollDetector();
            initNewPostsListener();

            // Observe videos
            if (typeof window.postCard_observeVideos === 'function') {
                setTimeout(window.postCard_observeVideos, 300);
            }

            // Load avatars daga users collection
            loadAvatarsForCards(snapshot);

            // Load comment counts
            loadCommentCounts(snapshot);

            // Restore likes
            if (typeof window.postCard_restoreLikes === 'function') {
                setTimeout(() => window.postCard_restoreLikes(STATE.feedContainer), 500);
            }

        } catch (error) {
            console.error('[Nexus Scroll] Initial load error:', error);
            removeSkeletonLoader('initial');
            STATE.feedContainer.innerHTML = `
                <div style="text-align:center;padding:40px;color:rgba(255,255,255,0.3);">
                    Could not load posts. Check connection.
                </div>`;
        }
    };


    // ============================================================
    // 6. HELPER — Create post wrapper node
    // ============================================================
    function createPostWrapper(post) {
        // Spacing wrapper — kamar yadda feed din kake da shi
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 12px;';
        wrapper.innerHTML = window.generatePostHTML(post);
        return wrapper;
    }


    // ============================================================
    // 7. HELPER — Load avatars bayan render
    // ============================================================
    function loadAvatarsForCards(snapshot) {
        snapshot.forEach(doc => {
            const post = doc.data();
            if (!post.username) return;

            db.collection('users').doc(post.username).get().then(userDoc => {
                if (!userDoc.exists) return;
                const pic = userDoc.data().userProfilePic;
                if (!pic) return;

                const card = STATE.feedContainer.querySelector(
                    `.post-card[data-post-id="${doc.id}"]`
                );
                if (card) {
                    const avatar = card.querySelector('.post-avatar');
                    if (avatar) avatar.src = pic;
                }
            }).catch(() => {});
        });
    }


    // ============================================================
    // 8. HELPER — Load comment counts
    // ============================================================
    function loadCommentCounts(snapshot) {
        snapshot.forEach(doc => {
            const postId = doc.id;
            db.collection('nexus_contributions')
                .where('postId', '==', postId)
                .where('parentId', '==', null)
                .onSnapshot(snap => {
                    const el = document.getElementById(`comment-count-${postId}`);
                    if (el) el.textContent = snap.size;
                });
        });
    }


    // ============================================================
    // 9. "NEW POSTS" PILL — Instagram-style notification
    //    Ana nuna shi idan akwai sabbin posts amma user yana kasa
    // ============================================================
    function showNewPostsPill(count, posts) {
        // Remove existing pill
        const existing = document.getElementById('nexus-new-posts-pill');
        if (existing) existing.remove();

        const pill = document.createElement('div');
        pill.id = 'nexus-new-posts-pill';
        pill.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5">
                <path d="M18 15l-6-6-6 6"/>
            </svg>
            ${count} new post${count > 1 ? 's' : ''}
        `;
        pill.style.cssText = `
            position: fixed;
            top: 64px;
            left: 50%;
            transform: translateX(-50%) translateY(-10px);
            background: rgba(30, 30, 40, 0.92);
            border: 1px solid rgba(253, 224, 141, 0.4);
            color: #fde08d;
            font-family: 'Orbitron', sans-serif;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            padding: 8px 18px;
            border-radius: 50px;
            display: flex;
            align-items: center;
            gap: 7px;
            cursor: pointer;
            z-index: 4999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 15px rgba(253,224,141,0.15);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            transition: all 0.3s cubic-bezier(0.175,0.885,0.32,1.275);
            opacity: 0;
        `;

        document.body.appendChild(pill);

        // Animate in
        requestAnimationFrame(() => {
            pill.style.opacity = '1';
            pill.style.transform = 'translateX(-50%) translateY(0)';
        });

        // Click → scroll to top & inject posts
        pill.addEventListener('click', () => {
            // Inject new posts a sama
            const fragment = document.createDocumentFragment();
            posts.reverse().forEach(post => {
                if (STATE.seenPostIds.has(post.id)) return;
                STATE.seenPostIds.add(post.id);
                const wrapper = createPostWrapper(post);
                STATE.feedContainer.insertBefore(wrapper, STATE.feedContainer.firstChild);
            });

            // Smooth scroll zuwa sama
            window.scrollTo({ top: 0, behavior: 'smooth' });

            if (typeof window.postCard_observeVideos === 'function') {
                setTimeout(window.postCard_observeVideos, 400);
            }

            // Remove pill
            pill.style.opacity = '0';
            pill.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => pill.remove(), 300);
        });

        // Auto-dismiss bayan 8 seconds
        setTimeout(() => {
            if (document.getElementById('nexus-new-posts-pill')) {
                pill.style.opacity = '0';
                pill.style.transform = 'translateX(-50%) translateY(-10px)';
                setTimeout(() => pill.remove(), 300);
            }
        }, 8000);
    }


    // ============================================================
    // 10. SKELETON LOADER — Show while fetching
    //     Kamar Instagram's grey placeholder cards
    // ============================================================
    function showSkeletonLoader(position) {
        const existing = document.getElementById(`nexus-skeleton-${position}`);
        if (existing) return;

        const skeletonCount = position === 'initial' ? 3 : 1;
        const wrapper = document.createElement('div');
        wrapper.id = `nexus-skeleton-${position}`;

        for (let i = 0; i < skeletonCount; i++) {
            wrapper.innerHTML += `
                <div style="
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(253,224,141,0.1);
                    border-radius: 20px;
                    margin-bottom: 12px;
                    overflow: hidden;
                    animation: nexusSkelPulse 1.5s ease-in-out infinite;
                ">
                    <!-- Header skeleton -->
                    <div style="
                        display:flex; align-items:center; gap:10px;
                        padding: 12px 14px;
                        background: rgba(255,255,255,0.02);
                        border-bottom: 1px solid rgba(255,255,255,0.04);
                    ">
                        <div style="width:42px;height:42px;border-radius:50%;
                            background:rgba(255,255,255,0.06);flex-shrink:0;"></div>
                        <div style="flex:1;">
                            <div style="width:35%;height:10px;border-radius:6px;
                                background:rgba(255,255,255,0.07);margin-bottom:6px;"></div>
                            <div style="width:20%;height:8px;border-radius:6px;
                                background:rgba(255,255,255,0.04);"></div>
                        </div>
                    </div>
                    <!-- Media skeleton -->
                    <div style="width:100%;height:400px;
                        background: linear-gradient(135deg,
                            rgba(255,255,255,0.03) 0%,
                            rgba(253,224,141,0.04) 50%,
                            rgba(255,255,255,0.03) 100%);
                        background-size: 200% 200%;
                        animation: nexusSkelShimmer 2s linear infinite;
                    "></div>
                    <!-- Actions skeleton -->
                    <div style="display:flex;gap:8px;padding:10px 12px;">
                        <div style="width:60px;height:28px;border-radius:20px;
                            background:rgba(255,255,255,0.05);"></div>
                        <div style="width:60px;height:28px;border-radius:20px;
                            background:rgba(255,255,255,0.05);"></div>
                        <div style="width:44px;height:28px;border-radius:20px;
                            background:rgba(255,255,255,0.05);"></div>
                    </div>
                </div>
            `;
        }

        // Inject skeleton CSS once
        if (!document.getElementById('nexus-skeleton-css')) {
            const style = document.createElement('style');
            style.id = 'nexus-skeleton-css';
            style.textContent = `
                @keyframes nexusSkelPulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
                @keyframes nexusSkelShimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `;
            document.head.appendChild(style);
        }

        if (position === 'top') {
            STATE.feedContainer.insertBefore(wrapper, STATE.feedContainer.firstChild);
        } else {
            STATE.feedContainer.appendChild(wrapper);
        }
    }

    function removeSkeletonLoader(position) {
        const el = document.getElementById(`nexus-skeleton-${position}`);
        if (el) el.remove();
    }


    // ============================================================
    // 11. "You're all caught up" indicator
    //     Ana nuna shi idan user ya kai ƙarshen older posts
    // ============================================================
    function showEndOfFeedIndicator() {
        if (document.getElementById('nexus-end-indicator')) return;

        const indicator = document.createElement('div');
        indicator.id = 'nexus-end-indicator';
        indicator.innerHTML = `
            <div style="
                text-align: center;
                padding: 30px 20px;
                color: rgba(255,255,255,0.25);
                font-family: 'Inter', sans-serif;
                font-size: 12px;
            ">
                <div style="
                    width: 40px; height: 1px;
                    background: rgba(255,255,255,0.1);
                    margin: 0 auto 14px;
                "></div>
                You've seen all posts
            </div>
        `;

        STATE.feedContainer.insertBefore(indicator, STATE.feedContainer.firstChild);
    }

    // "Up to date" indicator idan user ya kai ƙarshen feed kasa
    let upToDateShown = false;
    function showUpToDateIndicator() {
        if (upToDateShown) return;
        if (document.getElementById('nexus-uptodate')) return;
        upToDateShown = true;

        const el = document.createElement('div');
        el.id = 'nexus-uptodate';
        el.innerHTML = `
            <div style="
                text-align:center; padding:20px;
                color:rgba(255,255,255,0.25);
                font-size:11px; font-family:'Inter';
            ">
                You're all caught up ✓
            </div>
        `;
        STATE.feedContainer.appendChild(el);

        setTimeout(() => {
            if (el.parentNode) el.remove();
            upToDateShown = false;
        }, 3000);
    }


    // ============================================================
    // 12. HELPER — Estimate card height for threshold calculation
    // ============================================================
    function estimateCardHeight() {
        const firstCard = STATE.feedContainer.querySelector('.post-card');
        if (firstCard) return firstCard.offsetHeight + 12;
        return 600; // Default estimate
    }


    // ============================================================
    // 13. CLEANUP — Call this if user leaves page
    // ============================================================
    window.nexusDestroyFeed = function() {
        if (STATE.newPostsUnsubscribe) {
            STATE.newPostsUnsubscribe();
            STATE.newPostsUnsubscribe = null;
        }
    };

    // Cleanup on page hide
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Pause real-time listener don battery/data saving
            if (STATE.newPostsUnsubscribe) {
                STATE.newPostsUnsubscribe();
                STATE.newPostsUnsubscribe = null;
            }
        } else {
            // Resume idan user ya koma page
            initNewPostsListener();
        }
    });

    console.log('[Nexus Scroll] Engine initialized ✓');

})();
