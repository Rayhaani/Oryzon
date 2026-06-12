/* ============================================================
   NEXUS VIDEOS PAGE — Infinite Scroll Engine
   Saka wannan script a videos.html bayan firebase da template.js
   
   HTML da ake bukata a videos.html:
   <div id="videos-feed"></div>
   <div id="videos-loader" style="display:none; text-align:center; padding:20px; color:#fde08d;">
       <i class="fa-solid fa-spinner fa-spin"></i>
   </div>
   ============================================================ */

(function initVideosPage() {

    // ── CONFIG ──────────────────────────────────────────────
    const BATCH_SIZE   = 5;   // Videos per fetch
    const SCROLL_THRESHOLD = 300; // px daga kasan page kafin a load more

    // ── STATE ───────────────────────────────────────────────
    let lastDoc        = null;   // Firestore pagination cursor
    let isFetching     = false;  // Guard - kar a yi double fetch
    let allLoaded      = false;  // True idan babu karin videos

    const feed   = document.getElementById('videos-feed');
    const loader = document.getElementById('videos-loader');

    if (!feed) {
        console.error('[Videos] #videos-feed div ba ta nan!');
        return;
    }

    // ── FETCH VIDEOS ────────────────────────────────────────
    async function fetchVideos() {
        if (isFetching || allLoaded) return;
        isFetching = true;

        if (loader) loader.style.display = 'block';

        try {
            let query = db.collection('posts')
                .where('mediaType', '==', 'video')
                .orderBy('timestamp', 'desc')
                .limit(BATCH_SIZE);

            // Pagination - fara daga inda aka tsaya
            if (lastDoc) {
                query = query.startAfter(lastDoc);
            }

            const snapshot = await query.get();

            if (snapshot.empty || snapshot.docs.length < BATCH_SIZE) {
                allLoaded = true; // Babu karin posts
            }

            if (snapshot.empty) {
                if (!lastDoc) {
                    // Page ta farko ce kuma babu videos kwata-kwata
                    feed.innerHTML = `
                        <div style="
                            text-align:center; padding:60px 20px;
                            color:rgba(255,255,255,0.3); font-family:'Inter',sans-serif;
                        ">
                            <i class="fa-solid fa-video-slash" style="font-size:48px; margin-bottom:16px; display:block; color:rgba(253,224,141,0.3);"></i>
                            <p style="font-size:14px;">Babu videos tukuna</p>
                        </div>`;
                }
                return;
            }

            // Update cursor zuwa last document
            lastDoc = snapshot.docs[snapshot.docs.length - 1];

            // Render kowane post
            const fragment = document.createDocumentFragment();

            snapshot.docs.forEach(doc => {
                const post = { id: doc.id, ...doc.data() };

                // Wrapper div - for spacing between cards
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'margin-bottom: 12px;';
                wrapper.innerHTML = generatePostHTML(post);

                fragment.appendChild(wrapper);
            });

            feed.appendChild(fragment);

            // Observe videos da aka ƙara don autoplay
            if (typeof window.postCard_observeVideos === 'function') {
                window.postCard_observeVideos();
            }

            // Restore likes
            if (typeof window.postCard_restoreLikes === 'function') {
                window.postCard_restoreLikes(feed);
            }

        } catch (err) {
            console.error('[Videos] Fetch error:', err);

            // Idan index error ne, nuna message mai amfani
            if (err.code === 'failed-precondition') {
                console.warn('[Videos] Firestore index needed: posts collection → mediaType ASC + timestamp DESC');
            }
        } finally {
            isFetching = false;
            if (loader) loader.style.display = 'none';
        }
    }

    // ── INFINITE SCROLL LISTENER ────────────────────────────
    function onScroll() {
        if (allLoaded || isFetching) return;

        const scrolledTo   = window.scrollY + window.innerHeight;
        const pageHeight   = document.documentElement.scrollHeight;
        const nearBottom   = pageHeight - scrolledTo < SCROLL_THRESHOLD;

        if (nearBottom) {
            fetchVideos();
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // ── INITIAL LOAD ─────────────────────────────────────────
    // Wait for Firebase to be ready
    function waitForFirebase() {
        if (typeof db !== 'undefined' && typeof generatePostHTML === 'function') {
            fetchVideos();
        } else {
            setTimeout(waitForFirebase, 150);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForFirebase);
    } else {
        waitForFirebase();
    }

    // ── PUBLIC API ───────────────────────────────────────────
    // Reset da sake load (e.g. bayan pull-to-refresh)
    window.videosPage_reset = function() {
        lastDoc    = null;
        isFetching = false;
        allLoaded  = false;
        feed.innerHTML = '';
        fetchVideos();
    };

    console.log('[Videos] Infinite scroll engine loaded ✓');

})();
 
