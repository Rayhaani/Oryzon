/* ============================================================
   NEXUS IMMERSIVE VIDEO SCROLL ENGINE
   
   Yana aiki KAWAI a immersive mode — videos alone
   • Scroll UP   → Fetch older videos daga Firebase
   • Scroll DOWN → Fetch newer videos daga Firebase
   • Hotuna — ba a taɓa su ba, suna feed kamar yadda suke
   ============================================================ */

(function NexusImmersiveScroll() {

    // ============================================================
    // STATE
    // ============================================================
    const S = {
        oldestCursor:    null,   // Last doc na mafi tsoho
        newestCursor:    null,   // Last doc na mafi sabo
        isFetchingOld:   false,
        isFetchingNew:   false,
        hasMoreOld:      true,
        seenIds:         new Set(),
        BATCH:           5,
        activeCard:      null,   // Post card da yake immersive yanzu
    };


    // ============================================================
    // ENTRY POINT — Ana kira daga toggleImmersive() idan VIDEO
    // ============================================================
    window.nexusImmersiveStart = function(card) {
        S.activeCard = card;

        // Tara dukan video post IDs da ke feed ɗin yanzu
        const allCards = Array.from(
            document.querySelectorAll('.post-card[data-post-id]')
        ).filter(c => c.querySelector('video'));

        // Cika seenIds da posts da ke a DOM yanzu
        S.seenIds.clear();
        allCards.forEach(c => S.seenIds.add(c.dataset.postId));

        // Set cursors daga Firebase snapshot da ke a DOM
        // Mafi sabo = farkon jerin, mafi tsoho = ƙarshen jerin
        const ids = allCards.map(c => c.dataset.postId);
        if (ids.length > 0) {
            S.newestCursor = ids[0];
            S.oldestCursor = ids[ids.length - 1];
        }

        // Fara listening ga scroll a immersive mode
        attachImmersiveScroll(card);
    };


    // ============================================================
    // STOP — Ana kira idan user ya fita immersive
    // ============================================================
    window.nexusImmersiveStop = function() {
        S.activeCard = null;
        S.isFetchingOld = false;
        S.isFetchingNew = false;
    };


    // ============================================================
    // SCROLL LISTENER — A kan immersive card ɗin kanta
    // ============================================================
    function attachImmersiveScroll(card) {
        let lastY = 0;
        let ticking = false;

        function onScroll() {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                // Idan ba immersive mode ba, dakatar
                if (!card.classList.contains('immersive-mode')) {
                    ticking = false;
                    return;
                }

                const currentY = window.scrollY;
                const direction = currentY < lastY ? 'up' : 'down';
                lastY = currentY;

                const distFromTop = currentY;
                const distFromBottom = document.documentElement.scrollHeight
                    - currentY - window.innerHeight;

                // SCROLL UP → Fetch older videos
                if (direction === 'up' && distFromTop < 300) {
                    fetchOlderVideos();
                }

                // SCROLL DOWN → Fetch newer videos
                if (direction === 'down' && distFromBottom < 300) {
                    fetchNewerVideos();
                }

                ticking = false;
            });
        }

        window.addEventListener('scroll', onScroll, { passive: true });

        // Save reference don cire listener idan ya fita immersive
        card._immersiveScrollHandler = onScroll;
    }


    // ============================================================
    // FETCH OLDER VIDEOS (Scroll UP)
    // ============================================================
    async function fetchOlderVideos() {
        if (S.isFetchingOld || !S.hasMoreOld) return;
        if (typeof db === 'undefined') return;
        if (!S.oldestCursor) return;

        S.isFetchingOld = true;
        showLoader('top');

        try {
            // Je Firestore — kawo videos da suka gabaci mafi tsohon cursor
            const oldestDoc = await db.collection('posts')
                .doc(S.oldestCursor).get();

            const snapshot = await db.collection('posts')
                .where('mediaType', '==', 'video')   // Videos KAWAI
                .orderBy('timestamp', 'desc')
                .startAfter(oldestDoc)
                .limit(S.BATCH)
                .get();

            hideLoader('top');

            if (snapshot.empty) {
                S.hasMoreOld = false;
                S.isFetchingOld = false;
                return;
            }

            // Adana scroll height kafin prepend
            const prevHeight = document.documentElement.scrollHeight;

            // Prepend posts a SAMA da feed
            const feed = document.querySelector('.feed-container');
            const newCards = [];

            snapshot.docs.forEach(doc => {
                if (S.seenIds.has(doc.id)) return;
                S.seenIds.add(doc.id);
                newCards.push({ id: doc.id, ...doc.data() });
            });

            // Reverse — oldest ya zo sama
            newCards.reverse().forEach(post => {
                const wrapper = document.createElement('div');
                wrapper.style.marginBottom = '12px';
                wrapper.innerHTML = window.generatePostHTML(post);
                feed.insertBefore(wrapper, feed.firstChild);
            });

            // Update oldest cursor
            S.oldestCursor = snapshot.docs[snapshot.docs.length - 1].id;

            // Maintain scroll position — kar user ya jump
            const heightAdded = document.documentElement.scrollHeight - prevHeight;
            window.scrollBy({ top: heightAdded, behavior: 'instant' });

            // Load avatars na posts ɗin da aka ƙara
            loadAvatars(snapshot);

            // Observe videos ɗin da aka ƙara
            if (typeof window.postCard_observeVideos === 'function') {
                window.postCard_observeVideos();
            }

        } catch (err) {
            console.error('[Immersive Scroll] fetchOlderVideos error:', err);
            hideLoader('top');
        }

        S.isFetchingOld = false;
    }


    // ============================================================
    // FETCH NEWER VIDEOS (Scroll DOWN)
    // ============================================================
    async function fetchNewerVideos() {
        if (S.isFetchingNew) return;
        if (typeof db === 'undefined') return;
        if (!S.newestCursor) return;

        S.isFetchingNew = true;
        showLoader('bottom');

        try {
            const newestDoc = await db.collection('posts')
                .doc(S.newestCursor).get();

            const snapshot = await db.collection('posts')
                .where('mediaType', '==', 'video')   // Videos KAWAI
                .orderBy('timestamp', 'desc')
                .endBefore(newestDoc)
                .limitToLast(S.BATCH)
                .get();

            hideLoader('bottom');

            if (snapshot.empty) {
                S.isFetchingNew = false;
                return;
            }

            const feed = document.querySelector('.feed-container');
            const newCards = [];

            snapshot.docs.forEach(doc => {
                if (S.seenIds.has(doc.id)) return;
                S.seenIds.add(doc.id);
                newCards.push({ id: doc.id, ...doc.data() });
            });

            // Append a ƘASA — newest posts
            newCards.forEach(post => {
                const wrapper = document.createElement('div');
                wrapper.style.marginBottom = '12px';
                wrapper.innerHTML = window.generatePostHTML(post);
                feed.appendChild(wrapper);
            });

            // Update newest cursor zuwa mafi sabo
            S.newestCursor = snapshot.docs[0].id;

            loadAvatars(snapshot);

            if (typeof window.postCard_observeVideos === 'function') {
                window.postCard_observeVideos();
            }

        } catch (err) {
            console.error('[Immersive Scroll] fetchNewerVideos error:', err);
            hideLoader('bottom');
        }

        S.isFetchingNew = false;
    }


    // ============================================================
    // LOAD AVATARS bayan render
    // ============================================================
    function loadAvatars(snapshot) {
        const feed = document.querySelector('.feed-container');
        snapshot.forEach(doc => {
            const post = doc.data();
            if (!post.username) return;
            db.collection('users').doc(post.username).get().then(userDoc => {
                if (!userDoc.exists) return;
                const pic = userDoc.data().userProfilePic;
                if (!pic) return;
                const card = feed.querySelector(`.post-card[data-post-id="${doc.id}"]`);
                if (card) {
                    const avatar = card.querySelector('.post-avatar');
                    if (avatar) avatar.src = pic;
                }
            }).catch(() => {});
        });
    }


    // ============================================================
    // LOADERS — Masu sauki, ba CSS ɗin da zai taɓa design ɗinka ba
    // ============================================================
    function showLoader(position) {
        const id = `immersive-loader-${position}`;
        if (document.getElementById(id)) return;

        const loader = document.createElement('div');
        loader.id = id;
        loader.style.cssText = `
            text-align: center;
            padding: 16px;
            color: rgba(253, 224, 141, 0.6);
            font-size: 12px;
            font-family: 'Orbitron', sans-serif;
            letter-spacing: 1px;
        `;
        loader.textContent = 'Loading...';

        const feed = document.querySelector('.feed-container');
        if (position === 'top') {
            feed.insertBefore(loader, feed.firstChild);
        } else {
            feed.appendChild(loader);
        }
    }

    function hideLoader(position) {
        const el = document.getElementById(`immersive-loader-${position}`);
        if (el) el.remove();
    }

    console.log('[Nexus] Immersive Video Scroll ready ✓');

})();


