/* ============================================================
   PAGES.JS — extracted from pages.html for SPA compatibility
   ------------------------------------------------------------
   Loaded once via router.js PAGE_SCRIPTS['pages.html']. Top-
   level function declarations stay GLOBAL on purpose (this is
   a normal script, not a module) because the markup uses many
   onclick="..." attributes that resolve names from the global
   scope — do NOT wrap this file in an IIFE.

   Lifecycle: initPage()/destroyPage() are registered with
   NexusRouter.registerPage('pages.html', ...) at the bottom.
   initPage() re-derives ?page=slug + the logged-in user and
   re-subscribes Firestore listeners EVERY time this page is
   navigated into. destroyPage() tears down snapshot listeners,
   the scroll listener, and the countdown timer so nothing
   leaks or double-fires on re-entry.
   ============================================================ */

        // ============================================================
        // FIREBASE + REAL PAGE IDENTITY (oryzon-50ea4)
        // ============================================================
        const firebaseConfig = {
            apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
            authDomain: "oryzon-50ea4.firebaseapp.com",
            databaseURL: "https://oryzon-50ea4-default-rtdb.firebaseio.com",
            projectId: "oryzon-50ea4",
            storageBucket: "oryzon-50ea4.firebasestorage.app",
            messagingSenderId: "782106742622",
            appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
            measurementId: "G-K5085DLL2W"
        };
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();
        const FieldValue = firebase.firestore.FieldValue;

        // SPA NOTE: these were `const`, read ONCE at native page load. Under
        // router.js, pages.js loads once but init() can run again for a
        // different ?page=slug (or a different user), so they're now `let`
        // and re-derived fresh on every initPage() call below.
        let currentUsername = null;

        let authReadyResolve;
        let authReadyPromise;

        let pageSlug = null;
        let pageData = null;
        let isOwner = false;
        let isFollowing = false;
        let pageUnsub = null;
        let followUnsub = null;
        let postsUnsub = null;
        let viewTracked = false; // don't double-count the same session on every onSnapshot re-fire

        function pageRef() { return db.collection('pages').doc(pageSlug); }
        function myPageDocRef() { return db.collection('users').doc(currentUsername).collection('myPages').doc(pageSlug); }

        function initRealPage() {
            if (!pageSlug) {
                // No ?page= given — keep the built-in demo content as-is for local preview.
                renderFeedPosts();
                return;
            }

            checkIfBlocked();

            pageUnsub = pageRef().onSnapshot(doc => {
                if (!doc.exists) {
                    document.getElementById('timeline-area').innerHTML =
                        '<div style="padding:30px 16px;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;">This page doesn\'t exist yet. Check the link, or create it from New Message → New Page.</div>';
                    return;
                }
                pageData = doc.data();
                isOwner = !!(currentUsername && (pageData.creatorUsername === currentUsername || (pageData.adminUsernames || []).includes(currentUsername)));
                window.CURRENT_PAGE_OWNER = pageData.name;

                document.getElementById('headerTitleText').childNodes[0].textContent = pageData.name + ' ';
                document.getElementById('pageNameTitle').childNodes[0].textContent = pageData.name;
                document.getElementById('pageCoverImg').src = pageData.coverUrl || document.getElementById('pageCoverImg').src;
                document.getElementById('pageAvatarImg').src = pageData.avatarUrl || document.getElementById('pageAvatarImg').src;
                document.getElementById('pageBioText').textContent = pageData.description || '';
                document.getElementById('pageCategoryText').textContent = pageData.category || 'General';
                document.getElementById('headerVerifiedIcon').style.display = pageData.verified ? '' : 'none';
                document.getElementById('pageVerifiedIcon').style.display = pageData.verified ? '' : 'none';
                document.getElementById('pageMetaRow').textContent = formatCount(pageData.followerCount || 0) + ' followers';

                document.getElementById('followBtn').style.display = isOwner ? 'none' : '';
                document.getElementById('ownerPostBtn').style.display = isOwner ? '' : 'none';
                document.getElementById('coverEditBtn').style.display = isOwner ? '' : 'none';

                // Menu sheet header + admin-only groups (kamar yadda manyan
                // platforms suke yi — duba jadawalin da aka tattauna)
                document.getElementById('sheetPageAvatar').src = pageData.avatarUrl || document.getElementById('sheetPageAvatar').src;
                document.getElementById('sheetPageName').childNodes[0].textContent = pageData.name + ' ';
                document.getElementById('sheetPageMeta').textContent = formatCount(pageData.followerCount || 0) + ' followers · TrustScore ' + (pageData.trustScore || '—');
                document.documentElement.classList.remove('pg-loading');
                document.getElementById('menuGroupBoost').style.display = isOwner ? '' : 'none';
                document.getElementById('menuGroupManage').style.display = isOwner ? '' : 'none';
                document.getElementById('reportMenuItem').style.display = isOwner ? 'none' : '';
                document.getElementById('blockMenuItem').style.display = isOwner ? 'none' : '';
                const adminCount = 1 + (pageData.adminUsernames || []).length;
                document.getElementById('rolesSubLabel').textContent = adminCount + (adminCount === 1 ? ' admin' : ' admins');
                refreshScheduledCount();

                if (!viewTracked) { viewTracked = true; trackPageEvent('views'); }

                renderFeedPosts();
            }, err => console.error('page listener error:', err));

            if (currentUsername) {
                followUnsub = pageRef().collection('followers').doc(currentUsername).onSnapshot(doc => {
                    isFollowing = doc.exists;
                    const btn = document.getElementById('followBtn');
                    const label = document.getElementById('followLabel');
                    btn.classList.toggle('is-following', isFollowing);
                    label.textContent = isFollowing ? 'Following' : 'Follow';
                });
                loadMyPagePrefs();
            }
        }

        function formatCount(n) {
            if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
            if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
            return (n || 0).toString();
        }

        // Fallback for the per-post "⋯" menu that post-card-template.js expects
        // (openNeuralMenu is normally supplied by the main feed page; pages.html
        // provides a lightweight version so post menus still work here).
        if (typeof window.openNeuralMenu !== 'function') {
            window.openNeuralMenu = function () { showToast('Post options'); };
        }

        // ============================================================
        // FEED POSTS — rendered via the shared window.generatePostHTML()
        // from post-card-template.js
        // ============================================================
        function renderFeedPosts() {
            if (pageSlug) {
                renderRealFeedPosts();
                return;
            }

            const samplePosts = [
                {
                    id: 'page-post-0', pinned: true, isAdmin: true, translatable: true,
                    username: 'Maijalalaini Islamic Medicine',
                    userProfilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
                    mediaUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&auto=format&fit=crop&q=80',
                    mediaType: 'image',
                    content: 'Welcome to our official page! Browse our full 2026 product catalog in the Shop tab, or message us any time — our AI Twin replies instantly, day or night.',
                    timestamp: new Date(Date.now() - 1000 * 60 * 10),
                    likesCount: 512, commentsCount: 63
                },
                {
                    id: 'page-post-1', boosted: true, isAdmin: true, translatable: true,
                    username: 'Ali_Developer',
                    userProfilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
                    mediaUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80',
                    mediaType: 'image',
                    content: 'Alhamdulillah — our full 2026 platform roadmap is now complete. Thank you to every member of the community for your support!',
                    timestamp: new Date(Date.now() - 1000 * 60 * 42),
                    likesCount: 318, commentsCount: 47
                },
                {
                    id: 'page-post-2', translatable: true,
                    username: 'MmnAfrah',
                    userProfilePic: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
                    mediaUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&auto=format&fit=crop&q=80',
                    mediaType: 'image',
                    content: `This week's community call is on Monday. Anyone interested in the Business Deals sector should come ready with questions.`,
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
                    likesCount: 142, commentsCount: 19
                },
                {
                    id: 'page-post-3', translatable: true,
                    username: 'Zainab_TrustID',
                    userProfilePic: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
                    mediaUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&auto=format&fit=crop&q=80',
                    mediaType: 'image',
                    content: 'TrustID audits have been refreshed for all verified members. Check your profile for your latest score and full audit history.',
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
                    likesCount: 89, commentsCount: 11
                }
            ];

            const container = document.getElementById('timeline-area');
            container.innerHTML = samplePosts.map(post => window.generatePostHTML(post)).join('') + renderTimeCapsulePost();

            if (typeof window.postCard_observeVideos === 'function') {
                window.postCard_observeVideos();
            }
        }

        // Real Firestore-backed Timeline for an actual ?page= — queries the
        // SAME global 'posts' collection the homepage/profile timeline use,
        // filtered to just this page's posts via the 'pageId' field.
        //
        // Scheduled posts (visible:false + publishAt) stay OUT of the feed
        // entirely until their time arrives — self-healed client-side below
        // (first viewer to load the page after publishAt flips it visible;
        // this is a static GitHub Pages site with no server cron, so it is
        // not millisecond-exact like a real Cloud Functions scheduled
        // trigger would be). Time-capsule posts are NOT hidden — they use
        // post-card-template.js's own existing `post.locked` countdown box.
        function renderRealFeedPosts() {
            if (postsUnsub) return; // already listening
            postsUnsub = db.collection('posts')
                .where('pageId', '==', pageSlug)
                .orderBy('timestamp', 'desc')
                .onSnapshot(snapshot => {
                    const container = document.getElementById('timeline-area');
                    const now = Date.now();
                    const visiblePosts = [];
                    snapshot.docs.forEach(d => {
                        const data = d.data();
                        if (data.visible === false) {
                            const publishAt = data.publishAt ? (data.publishAt.toMillis ? data.publishAt.toMillis() : new Date(data.publishAt).getTime()) : null;
                            if (publishAt && publishAt <= now) {
                                db.collection('posts').doc(d.id).update({ visible: true }).catch(() => {});
                            }
                            return; // ba a nuna a Timeline har sai visible:true
                        }
                        visiblePosts.push(Object.assign({}, data, {
                            id: d.id,
                            username: pageData ? pageData.name : data.username,
                            userProfilePic: pageData ? pageData.avatarUrl : data.userProfilePic,
                            isAdmin: isOwner
                        }));
                    });
                    if (!visiblePosts.length) {
                        container.innerHTML = '<div style="padding:30px 16px;color:rgba(255,255,255,0.5);font-size:13px;text-align:center;">No posts yet.</div>';
                        return;
                    }
                    container.innerHTML = visiblePosts.map(post => window.generatePostHTML(post)).join('');
                    if (typeof window.postCard_observeVideos === 'function') window.postCard_observeVideos();
                    if (typeof window.postCard_restoreLikes === 'function') window.postCard_restoreLikes(container);
                    if (typeof window.postCard_initLockedCountdowns === 'function') window.postCard_initLockedCountdowns();
                }, err => console.error('page posts listener error:', err));
        }

        function openCreatePostModal() {
            if (!isOwner) return;
            document.getElementById('createPostTiming').value = 'now';
            document.getElementById('createPostDateField').style.display = 'none';
            openModal('createPostModal');
        }
        function onCreatePostTimingChange() {
            const timing = document.getElementById('createPostTiming').value;
            const field = document.getElementById('createPostDateField');
            const label = document.getElementById('createPostDateLabel');
            field.style.display = timing === 'now' ? 'none' : '';
            label.textContent = timing === 'capsule' ? 'Unlocks at' : 'Publish at';
        }
        async function submitCreatePost() {
            const text = document.getElementById('createPostText').value.trim();
            const imageUrl = document.getElementById('createPostImageUrl').value.trim();
            const timing = document.getElementById('createPostTiming').value;
            const dateVal = document.getElementById('createPostDateInput').value;
            if (!text && !imageUrl) return;
            if (timing !== 'now' && !dateVal) { showToast('Choose a date/time first'); return; }
            const btn = document.getElementById('createPostSubmitBtn');
            btn.textContent = 'Publishing...';
            try {
                const authUser = await authReadyPromise;
                if (!authUser) { showToast('You need to be signed in.'); btn.textContent = 'Publish'; return; }
                const postDoc = {
                    pageId: pageSlug,
                    username: pageData ? pageData.name : currentUsername,
                    userProfilePic: pageData ? (pageData.avatarUrl || '') : '',
                    content: text,
                    mediaUrl: imageUrl || null,
                    mediaType: imageUrl ? 'image' : null,
                    likesCount: 0,
                    commentsCount: 0,
                    pinned: false,
                    authorUsername: currentUsername,
                    timestamp: FieldValue.serverTimestamp()
                };
                if (timing === 'scheduled') {
                    postDoc.visible = false;
                    postDoc.publishAt = new Date(dateVal).toISOString();
                } else if (timing === 'capsule') {
                    postDoc.visible = true;
                    postDoc.locked = true;
                    postDoc.unlockAt = new Date(dateVal).toISOString();
                    postDoc.lockedSubtitle = 'Time-Capsule Post';
                } else {
                    postDoc.visible = true;
                }
                await db.collection('posts').add(postDoc);
                document.getElementById('createPostText').value = '';
                document.getElementById('createPostImageUrl').value = '';
                document.getElementById('createPostDateInput').value = '';
                closeModal('createPostModal');
                showToast(timing === 'now' ? 'Post published' : timing === 'capsule' ? '🔒 Time-capsule post created' : '🗓 Post scheduled');
            } catch (e) {
                console.error('Create post error:', e);
                showToast('Could not publish — check Firestore rules for /posts');
            } finally {
                btn.textContent = 'Publish';
            }
        }

        // Time-Capsule post — NEW FEATURE #3
        // Uses its own capsule-post-* classes (see CSS) so it never shares
        // selectors with the real post cards from post-card-template.js.
       function renderTimeCapsulePost() {
            return `
            <div class="capsule-post-card">
                <div class="capsule-post-head">
                    <img class="capsule-post-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80">
                    <div class="capsule-post-head-info">
                        <div class="cpname-row">
                            <span class="cpname">Maijalalaini Islamic Medicine</span>
                            <span class="post-verified-badge" style="margin-left:0; display:inline-flex; align-items:center; vertical-align:middle; flex-shrink:0;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
                                    <path d="M12 2C10.74 2 9.53 2.62 8.78 3.67L8.2 4.49C7.84 5 7.28 5.33 6.66 5.39L5.67 5.48C4.31 5.61 3.24 6.68 3.11 8.04L3.02 9.03C2.96 9.65 2.63 10.21 2.12 10.57L1.3 11.15C0.25 11.9 0.25 13.47 1.3 14.22L2.12 14.8C2.63 15.16 2.96 15.72 3.02 16.34L3.11 17.33C3.24 18.69 4.31 19.76 5.67 19.89L6.66 19.98C7.28 20.04 7.84 20.37 8.2 20.88L8.78 21.7C9.53 22.75 11.08 22.75 11.83 21.7L12.41 20.88C12.77 20.37 13.33 20.04 13.95 19.98L14.94 19.89C16.3 19.76 17.37 18.69 17.5 17.33L17.59 16.34C17.65 15.72 17.98 15.16 18.49 14.8L19.31 14.22C20.36 13.47 20.36 11.9 19.31 11.15L18.49 10.57C17.98 10.21 17.65 9.65 17.59 9.03L17.5 8.04C17.37 6.68 16.3 5.61 14.94 5.48L13.95 5.39C13.33 5.33 12.77 5 12.41 4.49L11.83 3.67C11.23 2.82 10.45 2 12 2Z" fill="#1d9bf0"/>
                                    <path d="M9.5 12L11 13.5L15 9.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                        </div>
                        <span class="cpmeta">Scheduled · <i class="fa-solid fa-lock"></i> Time Capsule</span>
                    </div>
                </div>
                <div class="capsule-lock">
                    <i class="fa-solid fa-box-archive big"></i>
                    <div class="ctitle">A message unlocks for followers soon</div>
                    <div class="csub">Time-Capsule Post — set to reveal on our 7th anniversary</div>
                    <div class="capsule-countdown" id="capsuleCountdown"></div>
                </div>
            </div>`;
       } 
        let capsuleTimer = null;
        function startCapsuleCountdown() {
            if (capsuleTimer) { clearInterval(capsuleTimer); capsuleTimer = null; }
            const target = Date.now() + 1000 * (3600*11 + 60*24 + 9);
            function tick() {
                const el = document.getElementById('capsuleCountdown');
                if (!el) return;
                let diff = Math.max(0, target - Date.now());
                const h = String(Math.floor(diff/3600000)).padStart(2,'0');
                const m = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
                const s = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
                el.innerHTML = `<span>${h}</span><span>${m}</span><span>${s}</span>`;
            }
            tick(); capsuleTimer = setInterval(tick, 1000);
        }

        // ============================================================
        // TABS: Reels / Photos / Shop / Events / Reviews / Community
        // ============================================================
        const galleryImgs = [
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80'
        ];

        function renderGrids() {
            document.getElementById('photosGrid').innerHTML = galleryImgs.map(u => `<div class="gitem"><img src="${u}" loading="lazy"></div>`).join('');
            document.getElementById('reelsGrid').innerHTML = galleryImgs.map(u => `<div class="gitem"><img src="${u}" loading="lazy"><i class="fa-solid fa-play playicon"></i></div>`).join('');

            const products = [
                { name: 'Herbal Immunity Boost 250ml', price: '₦4,500', img: galleryImgs[0] },
                { name: 'Joint Relief Balm', price: '₦3,200', img: galleryImgs[1] },
                { name: 'Digestive Care Tea Pack', price: '₦2,800', img: galleryImgs[2] },
                { name: 'Skin Radiance Oil', price: '₦5,000', img: galleryImgs[3] }
            ];
            const shopHTML = products.map(p => `
                <div class="product-card">
                    <img src="${p.img}" loading="lazy">
                    <div class="pinfo">
                        <div class="ptitle">${p.name}</div>
                        <div class="pprice">${p.price}</div>
                        <button class="pbuy" onclick="showToast('🛒 Added to cart')">Add to cart</button>
                    </div>
                </div>`).join('');
            document.getElementById('shopGrid').innerHTML = shopHTML;
            document.getElementById('ctaShopGrid').innerHTML = shopHTML;

            const events = [
                { mon: 'AUG', day: '14', title: 'Free Community Health Check', meta: 'Kano Central Clinic · 10:00 AM' },
                { mon: 'AUG', day: '22', title: 'Live Q&A: Natural Remedies', meta: 'Online · Nexus Live · 6:00 PM' },
                { mon: 'SEP', day: '03', title: '7th Anniversary Celebration', meta: 'Zoo Road HQ · All day' }
            ];
            document.getElementById('eventsList').innerHTML = events.map(e => `
                <div class="event-card">
                    <div class="event-date-box"><div class="mon">${e.mon}</div><div class="day">${e.day}</div></div>
                    <div class="event-info">
                        <div class="etitle">${e.title}</div>
                        <div class="emeta">${e.meta}</div>
                        <div class="event-going-btn" onclick="showToast('✅ You are going')"><i class="fa-solid fa-check"></i> Going</div>
                    </div>
                </div>`).join('');

            const reviews = [
                { name: 'Hauwa Bello', img: galleryImgs[0], stars: 5, text: 'Fast delivery and the product actually works. Very trustworthy page, highly recommend.' },
                { name: 'Ibrahim Sani', img: galleryImgs[4], stars: 5, text: 'Their AI assistant answered my question at midnight and the order arrived the next day.' },
                { name: 'Amina Yusuf', img: galleryImgs[5], stars: 4, text: 'Great quality overall. Would love more delivery slots in the evening.' }
            ];
            document.getElementById('reviewsList').innerHTML = reviews.map(r => `
                <div class="review-item">
                    <div class="rhead"><img src="${r.img}"><div><div class="rname">${r.name}</div><div class="rstars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div></div></div>
                    <div class="rtext">${r.text}</div>
                </div>`).join('');

            const contributors = [
                { name: 'Fatima Shuaibu Yusuf', role: 'Top commenter this month', img: galleryImgs[2] },
                { name: 'Shehu Hashimu', role: 'Most shared posts', img: galleryImgs[3] },
                { name: 'Zainab_TrustID', role: 'TrustScore Ambassador', img: galleryImgs[1] }
            ];
            document.getElementById('communityList').innerHTML = contributors.map(c => `
                <div class="member-row"><img src="${c.img}"><div><div class="mname">${c.name} <i class="fa-solid fa-circle-check verified-badge" style="font-size:10px;"></i></div><div class="mrole">${c.role}</div></div></div>`).join('');

            document.getElementById('miniChart').innerHTML = [40,55,35,70,50,85,65].map(h => `<div class="bar" style="height:${h}%;"></div>`).join('');
        }

        function switchTab(name) {
            document.querySelectorAll('.ptab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
            document.getElementById('pageTabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // ============================================================
        // FOLLOW / NOTIFICATIONS
        // ============================================================
        async function toggleFollow() {
            if (!pageSlug) {
                const btn = document.getElementById('followBtn');
                const label = document.getElementById('followLabel');
                const following = btn.classList.toggle('is-following');
                label.textContent = following ? 'Following' : 'Follow';
                showToast(following ? '🔔 You are now following this page' : 'Unfollowed');
                return;
            }
            try {
                const authUser = await authReadyPromise;
                if (!authUser) { showToast('You need to be signed in.'); return; }
                const followerRef = pageRef().collection('followers').doc(currentUsername);
                // Fan-out: users/{me}/myPages/{pageSlug} — wannan shine kadai
                // abinda chats.html zai karanta domin jera "my pages", don haka
                // babu bukatar wata collectionGroup query mai bude followers na
                // DUK pages a database. Ana rubuta/goge shi a cikin SAME
                // transaction domin ya kasance atomic tare da followerRef.
                const myPageRef = db.collection('users').doc(currentUsername).collection('myPages').doc(pageSlug);
                const wasFollowing = isFollowing;
                await db.runTransaction(async t => {
                    const doc = await t.get(followerRef);
                    if (doc.exists) {
                        t.delete(followerRef);
                        t.delete(myPageRef);
                        t.update(pageRef(), { followerCount: FieldValue.increment(-1) });
                    } else {
                        t.set(followerRef, { followedAt: FieldValue.serverTimestamp() });
                        t.set(myPageRef, { followedAt: FieldValue.serverTimestamp() });
                        t.update(pageRef(), { followerCount: FieldValue.increment(1) });
                    }
                });
                trackPageEvent(wasFollowing ? 'unfollows' : 'follows');
                showToast(isFollowing ? 'Unfollowed' : '🔔 You are now following this page');
            } catch (e) {
                console.error('toggleFollow error:', e);
                showToast('Could not update — try again');
            }
        }
        function toggleNotifDropdown() {
            document.getElementById('notifDropdown').classList.toggle('open');
        }
        function setNotifPref(el, label) {
            document.querySelectorAll('#notifDropdown .nd-item').forEach(i => i.classList.remove('active-opt'));
            el.classList.add('active-opt');
            document.getElementById('notifDropdown').classList.remove('open');
            document.getElementById('notifSubLabel').textContent = label === 'All' ? 'All notifications' : label;
            if (currentUsername && pageSlug) myPageDocRef().set({ notifPref: label }, { merge: true }).catch(() => {});
            showToast('🔔 Notifications set to: ' + label);
        }
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.icon-square-btn')) document.getElementById('notifDropdown')?.classList.remove('open');
        });

        // ============================================================
        // 3-DOT MENU SHEET
        // ============================================================
        function openMenuSheet() {
            document.getElementById('sheetBackdrop').classList.add('open');
            document.getElementById('menuSheet').classList.add('open');
        }
        function closeMenuSheet() {
            document.getElementById('sheetBackdrop').classList.remove('open');
            document.getElementById('menuSheet').classList.remove('open');
        }

        // ============================================================
        // GENERIC MODALS
        // ============================================================
        function openModal(id) { document.getElementById(id + '-bg').classList.add('open'); }
        function closeModal(id) { document.getElementById(id + '-bg').classList.remove('open'); }
        function closeModalOnBg(e, id) { if (e.target.id === id + '-bg') closeModal(id); }

        // ============================================================
        // PER-VIEWER PAGE PREFS (notif/language) — ana ajiyewa akan
        // users/{me}/myPages/{pageSlug}, wanda TUNI namu ne (fan-out doc
        // din da group.html/channels.html/pages.html suke amfani dashi
        // domin "my pages" list), don haka babu sabon collection.
        // ============================================================
        function loadMyPagePrefs() {
            myPageDocRef().get().then(doc => {
                const d = doc.exists ? doc.data() : {};
                document.getElementById('notifSubLabel').textContent = d.notifPref === 'All' || !d.notifPref ? 'All notifications' : d.notifPref;
                const langNames = { en: 'English', ha: 'Hausa', fr: 'French', ar: 'Arabic' };
                const lang = d.langPref || 'en';
                document.getElementById('langSubLabel').textContent = langNames[lang] + ' (auto-detect on)';
                document.getElementById('langOpt' + lang.charAt(0).toUpperCase() + lang.slice(1)).checked = true;
            }).catch(() => {});
        }
        let selectedLang = 'en';
        function selectLangOption(code) { selectedLang = code; }
        function saveLangPref() {
            const langNames = { en: 'English', ha: 'Hausa', fr: 'French', ar: 'Arabic' };
            if (currentUsername && pageSlug) myPageDocRef().set({ langPref: selectedLang }, { merge: true }).catch(() => {});
            document.getElementById('langSubLabel').textContent = langNames[selectedLang] + ' (auto-detect on)';
            closeModal('languageModal');
            showToast('🌐 Language updated to ' + langNames[selectedLang]);
        }

        // ============================================================
        // DISPLAY & ACCESSIBILITY — app-wide (localStorage), ba na wannan
        // page kadai ba, kamar yadda aka tattauna.
        // ============================================================
        function applyA11yPrefs() {
            const size = localStorage.getItem('nexus_a11y_textsize') || 'normal';
            document.body.classList.remove('a11y-text-small', 'a11y-text-large');
            if (size === 'small') document.body.classList.add('a11y-text-small');
            if (size === 'large') document.body.classList.add('a11y-text-large');
            document.getElementById('textSizeSmall').checked = size === 'small';
            document.getElementById('textSizeNormal').checked = size === 'normal';
            document.getElementById('textSizeLarge').checked = size === 'large';
            const captionsOn = localStorage.getItem('nexus_a11y_captions') === '1';
            document.body.classList.toggle('a11y-captions-on', captionsOn);
            const icon = document.getElementById('captionsToggleIcon');
            if (icon) icon.className = captionsOn ? 'fa-solid fa-toggle-on mchev' : 'fa-solid fa-toggle-off mchev';
        }
        function setTextSize(size) {
            localStorage.setItem('nexus_a11y_textsize', size);
            applyA11yPrefs();
            showToast('Text size: ' + size);
        }
        function toggleCaptions() {
            const on = localStorage.getItem('nexus_a11y_captions') === '1';
            localStorage.setItem('nexus_a11y_captions', on ? '0' : '1');
            applyA11yPrefs();
        }

        // ============================================================
        // EDIT PAGE INFO — admin kadai
        // ============================================================
        function openEditPageModal() {
            if (!isOwner || !pageData) return;
            document.getElementById('editPageName').value = pageData.name || '';
            document.getElementById('editPageCategory').value = pageData.category || '';
            document.getElementById('editPageDesc').value = pageData.description || '';
            document.getElementById('editPagePhone').value = pageData.contactPhone || '';
            document.getElementById('editPageEmail').value = pageData.contactEmail || '';
            openModal('editPageModal');
        }
        async function submitEditPage() {
            const btn = document.getElementById('editPageSubmitBtn');
            btn.textContent = 'Saving...';
            try {
                await pageRef().update({
                    name: document.getElementById('editPageName').value.trim(),
                    category: document.getElementById('editPageCategory').value.trim(),
                    description: document.getElementById('editPageDesc').value.trim(),
                    contactPhone: document.getElementById('editPagePhone').value.trim(),
                    contactEmail: document.getElementById('editPageEmail').value.trim()
                });
                closeModal('editPageModal');
                showToast('Page info updated');
            } catch (e) {
                console.error('submitEditPage error:', e);
                showToast('Could not save — try again');
            } finally {
                btn.textContent = 'Save changes';
            }
        }

        // ============================================================
        // PAGE ROLES — admin kadai
        // ============================================================
        function openRolesModal() {
            if (!isOwner || !pageData) return;
            const list = document.getElementById('rolesList');
            const admins = pageData.adminUsernames || [];
            let html = `<div class="arow"><i class="fa-solid fa-crown" style="color:#fbbf24;"></i> ${pageData.creatorUsername} <span style="color:var(--text-sub);margin-left:6px;">Owner</span></div>`;
            admins.forEach(u => {
                html += `<div class="arow" style="justify-content:space-between;"><span><i class="fa-solid fa-user-shield"></i> ${u} <span style="color:var(--text-sub);margin-left:6px;">Admin</span></span>` +
                    (u !== currentUsername ? `<button class="modal-primary-btn" style="width:auto;padding:4px 10px;margin:0;font-size:11px;" onclick="removeAdminUsername('${u}')">Remove</button>` : '') + `</div>`;
            });
            list.innerHTML = html;
            openModal('rolesModal');
        }
        async function addAdminUsername() {
            const input = document.getElementById('addAdminInput');
            const uname = input.value.trim();
            if (!uname) return;
            try {
                await pageRef().update({ adminUsernames: FieldValue.arrayUnion(uname) });
                input.value = '';
                showToast(uname + ' is now an admin');
                openRolesModal();
            } catch (e) { showToast('Could not add admin'); }
        }
        async function removeAdminUsername(uname) {
            try {
                await pageRef().update({ adminUsernames: FieldValue.arrayRemove(uname) });
                showToast(uname + ' removed as admin');
                openRolesModal();
            } catch (e) { showToast('Could not remove admin'); }
        }

        // ============================================================
        // SCHEDULED & TIME-CAPSULE POSTS — admin kadai
        // ============================================================
        function refreshScheduledCount() {
            if (!pageSlug || !isOwner) return;
            db.collection('posts').where('pageId', '==', pageSlug).where('visible', '==', false).get()
                .then(snap => {
                    const label = document.getElementById('scheduledSubLabel');
                    if (label) label.textContent = snap.size + (snap.size === 1 ? ' post scheduled' : ' posts scheduled');
                }).catch(() => {});
        }
        function openScheduledModal() {
            if (!isOwner) return;
            const list = document.getElementById('scheduledList');
            list.innerHTML = '<p style="color:var(--text-sub);font-size:13px;">Loading…</p>';
            openModal('scheduledModal');
            db.collection('posts').where('pageId', '==', pageSlug).where('visible', '==', false).get()
                .then(snap => {
                    if (snap.empty) { list.innerHTML = '<p style="color:var(--text-sub);font-size:13px;">Nothing scheduled right now.</p>'; return; }
                    list.innerHTML = snap.docs.map(d => {
                        const p = d.data();
                        const when = p.publishAt ? new Date(p.publishAt).toLocaleString() : '—';
                        return `<div class="about-block"><h4>${when}</h4><div class="arow" style="justify-content:space-between;"><span>${(p.content || '').slice(0, 60)}</span><button class="modal-primary-btn" style="width:auto;padding:4px 10px;margin:0;font-size:11px;background:var(--danger);" onclick="cancelScheduledPost('${d.id}')">Cancel</button></div></div>`;
                    }).join('');
                }).catch(err => { console.error(err); list.innerHTML = '<p style="color:var(--text-sub);font-size:13px;">Could not load scheduled posts.</p>'; });
        }
        async function cancelScheduledPost(postId) {
            if (!confirm('Cancel this scheduled post?')) return;
            await db.collection('posts').doc(postId).delete().catch(() => {});
            showToast('Scheduled post cancelled');
            refreshScheduledCount();
            openScheduledModal();
        }

        // ============================================================
        // REPORT / BLOCK — real
        // ============================================================
        let selectedReportReason = null;
        function selectReportReason(el, reason) {
            document.querySelectorAll('#reportModal-bg .radio-option').forEach(o => o.classList.remove('active-opt'));
            el.classList.add('active-opt');
            selectedReportReason = reason;
        }
        async function submitReport() {
            if (!selectedReportReason) { showToast('Choose a reason first'); return; }
            try {
                await db.collection('reports').add({
                    targetType: 'page',
                    targetId: pageSlug,
                    reason: selectedReportReason,
                    reporterUsername: currentUsername || null,
                    timestamp: FieldValue.serverTimestamp()
                });
                closeModal('reportModal');
                showToast('🚩 Report submitted');
            } catch (e) {
                console.error('submitReport error:', e);
                showToast('Could not submit report — try again');
            }
        }
        function myBlockedPageRef() { return db.collection('users').doc(currentUsername).collection('blockedPages').doc(pageSlug); }
        function checkIfBlocked() {
            if (!currentUsername || !pageSlug) return;
            myBlockedPageRef().get().then(doc => {
                if (doc.exists) {
                    document.getElementById('timeline-area').innerHTML =
                        '<div style="padding:40px 16px;color:rgba(255,255,255,0.5);font-size:13px;text-align:center;">You have blocked this page. <span style="color:#4fb0ff;cursor:pointer;" onclick="unblockPage()">Unblock</span></div>';
                }
            }).catch(() => {});
        }
        async function confirmBlock() {
            if (!confirm('Block this page? You will no longer see their posts or messages.')) return;
            try {
                await myBlockedPageRef().set({ blockedAt: FieldValue.serverTimestamp() });
                if (isFollowing) {
                    await pageRef().collection('followers').doc(currentUsername).delete().catch(() => {});
                    await myPageDocRef().delete().catch(() => {});
                }
                showToast('⛔ Page blocked');
                checkIfBlocked();
            } catch (e) { showToast('Could not block — try again'); }
        }
        async function unblockPage() {
            await myBlockedPageRef().delete().catch(() => {});
            showToast('Page unblocked');
            renderFeedPosts();
        }

        function toggleSave() {
            const icon = document.getElementById('saveIcon');
            const label = document.getElementById('saveLabel');
            const saved = icon.classList.toggle('fa-solid');
            icon.classList.toggle('fa-regular', !saved);
            label.textContent = saved ? 'Saved' : 'Save page';
            if (currentUsername && pageSlug) {
                const ref = db.collection('users').doc(currentUsername).collection('savedPages').doc(pageSlug);
                if (saved) ref.set({ savedAt: FieldValue.serverTimestamp() }).catch(() => {});
                else ref.delete().catch(() => {});
            }
            showToast(saved ? '🔖 Page saved' : 'Removed from saved');
        }

        // ============================================================
        // ANALYTICS / INSIGHTS — light-weight amma na gaskiya. Kowanne
        // view/follow/unfollow ana rikodin sa zuwa
        // pages/{id}/analyticsDaily/{YYYY-MM-DD} ta increment. Insights
        // modal tana karanta wannan + tattara likesCount/commentsCount na
        // dukkan posts din page domin engagement da top post.
        // ============================================================
        function todayKey() { return new Date().toISOString().slice(0, 10); }
        function trackPageEvent(field) {
            if (!pageSlug) return;
            pageRef().collection('analyticsDaily').doc(todayKey())
                .set({ [field]: FieldValue.increment(1) }, { merge: true })
                .catch(err => console.error('trackPageEvent error:', err));
        }
        async function openInsightsModal() {
            if (!isOwner) return;
            openModal('insightsModal');
            document.getElementById('insFollowers').textContent = formatCount(pageData?.followerCount || 0);
            // Last 7 days of daily rollups
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                days.push(d.toISOString().slice(0, 10));
            }
            try {
                const dayDocs = await Promise.all(days.map(k => pageRef().collection('analyticsDaily').doc(k).get()));
                const viewsPerDay = dayDocs.map(d => (d.exists && d.data().views) || 0);
                const followsPerDay = dayDocs.map(d => (d.exists && d.data().follows) || 0);
                const unfollowsPerDay = dayDocs.map(d => (d.exists && d.data().unfollows) || 0);
                const totalViews = viewsPerDay.reduce((a, b) => a + b, 0);
                const netFollows = followsPerDay.reduce((a, b) => a + b, 0) - unfollowsPerDay.reduce((a, b) => a + b, 0);
                document.getElementById('insViews').textContent = formatCount(totalViews);
                document.getElementById('insNetFollows').textContent = (netFollows >= 0 ? '+' : '') + netFollows;
                const max = Math.max(1, ...viewsPerDay);
                document.getElementById('miniChart').innerHTML = viewsPerDay.map(v =>
                    `<div class="bar" style="height:${Math.max(4, (v / max) * 100)}%;" title="${v} views"></div>`
                ).join('');
            } catch (e) { console.error('insights days error:', e); }
            // Post-level engagement (one-time aggregate read)
            try {
                const postsSnap = await db.collection('posts').where('pageId', '==', pageSlug).get();
                let totalEngagement = 0, topPost = null;
                postsSnap.forEach(d => {
                    const p = d.data();
                    const eng = (p.likesCount || 0) + (p.commentsCount || 0);
                    totalEngagement += eng;
                    if (!topPost || eng > topPost.eng) topPost = { eng, content: p.content || '' };
                });
                document.getElementById('insEngagements').textContent = formatCount(totalEngagement);
                if (topPost && topPost.eng > 0) {
                    document.getElementById('insTopPostBlock').style.display = '';
                    document.getElementById('insTopPostRow').innerHTML = `<i class="fa-solid fa-fire"></i> "${topPost.content.slice(0, 70)}" — ${topPost.eng} engagements`;
                }
            } catch (e) { console.error('insights posts error:', e); }
        }

        // ============================================================
        // AI PAGE TWIN CHAT — NEW FEATURE #7
        // ============================================================
        const aiReplies = [
            "Great question! Our team typically confirms orders within 30 minutes during business hours.",
            "Yes, that product is in stock right now — I can add it to your cart if you'd like.",
            "We deliver nationwide, usually within 24–48 hours depending on your location.",
            "I've noted that for our human team — they'll follow up here shortly if needed.",
            "You can check live pricing and stock any time in the Shop tab above."
        ];
        function sendAiMsg() {
            const input = document.getElementById('aiChatInput');
            const text = input.value.trim();
            if (!text) return;
            const body = document.getElementById('aiChatBody');
            body.insertAdjacentHTML('beforeend', `<div class="ai-msg user">${text}</div>`);
            input.value = '';
            body.scrollTop = body.scrollHeight;
            setTimeout(() => {
                const reply = aiReplies[Math.floor(Math.random() * aiReplies.length)];
                body.insertAdjacentHTML('beforeend', `<div class="ai-msg bot">${reply}</div>`);
                body.scrollTop = body.scrollHeight;
            }, 700);
        }

        // ============================================================
        // TOAST
        // ============================================================
        let toastTimer = null;
        function showToast(msg) {
            const box = document.getElementById('toastBox');
            box.textContent = msg;
            box.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => box.classList.remove('show'), 2200);
        }

        // ============================================================
        // HIGHLIGHTS / STORY VIEWER
        // ============================================================
        const groupHighlights = [
            { img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&auto=format&fit=crop&q=80', label: 'Launch' },
            { img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=900&auto=format&fit=crop&q=80', label: 'Deals' },
            { img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&auto=format&fit=crop&q=80', label: 'Events' },
            { img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80', label: 'Recovery Stories — collaborative thread' }
        ];
        let groupStoryIndex = 0;
        let groupStoryTimer = null;
        const GROUP_STORY_DURATION = 5000;

        function viewGroupHighlight(index) {
            groupStoryIndex = index;
            document.getElementById('storyViewerOverlay').style.display = 'block';
            showGroupStoryAt(groupStoryIndex);
            history.pushState({ storyViewer: true }, '');
            window.onpopstate = closeGroupStoryViewer;
        }
        function showGroupStoryAt(index, direction = 'next') {
            clearTimeout(groupStoryTimer);
            const wrap = document.getElementById('storyMediaWrap');
            const oldSlide = wrap.querySelector('.story-slide');
            const item = groupHighlights[index];

            const newSlide = document.createElement('div');
            newSlide.className = 'story-slide';
            newSlide.innerHTML = `<img src="${item.img}">`;
            newSlide.style.transform = direction === 'prev' ? 'translateX(-100%)' : 'translateX(100%)';
            newSlide.style.transition = 'none';
            wrap.appendChild(newSlide);
            void newSlide.offsetWidth;

            requestAnimationFrame(() => {
                newSlide.style.transition = 'transform 0.3s ease-out';
                newSlide.style.transform = 'translateX(0)';
                if (oldSlide) {
                    oldSlide.style.transition = 'transform 0.3s ease-out';
                    oldSlide.style.transform = direction === 'prev' ? 'translateX(100%)' : 'translateX(-100%)';
                }
            });
            if (oldSlide) setTimeout(() => oldSlide.remove(), 320);

            document.getElementById('storyUsername').textContent = item.label;
            document.getElementById('storyTime').textContent = 'Now';
            groupStoryTimer = setTimeout(() => nextGroupStory(), GROUP_STORY_DURATION);
        }
        function nextGroupStory() {
            if (groupStoryIndex < groupHighlights.length - 1) { groupStoryIndex++; showGroupStoryAt(groupStoryIndex, 'next'); }
            else closeGroupStoryViewer();
        }
        function prevGroupStory() {
            if (groupStoryIndex > 0) { groupStoryIndex--; showGroupStoryAt(groupStoryIndex, 'prev'); }
        }
        function closeGroupStoryViewer() {
            clearTimeout(groupStoryTimer);
            document.getElementById('storyViewerOverlay').style.display = 'none';
            document.getElementById('storyMediaWrap').querySelectorAll('.story-slide').forEach(el => el.remove());
            window.onpopstate = null;
        }

        // ============================================================
        // INIT / DESTROY  (SPA lifecycle — router.js calls these)
        // ------------------------------------------------------------
        // Everything that used to run once at native <script> execution
        // time now runs inside initPage(), so it re-runs correctly every
        // time the router navigates INTO pages.html (including switching
        // straight from one ?page=slug to another without a full reload).
        // destroyPage() undoes anything that would otherwise leak or go
        // stale (Firestore listeners, window listeners, timers).
        // ============================================================
        function onScrollHeaderNX() {
            const header = document.querySelector('header');
            if (!header) return;
            const REVEAL_THRESHOLD = 140;
            if (window.scrollY > REVEAL_THRESHOLD) header.classList.add('header-scrolled');
            else header.classList.remove('header-scrolled');
        }

        function initPage() {
            // Re-derive per-navigation identity fresh every time.
            currentUsername = localStorage.getItem('nexus_user_session');
            if (!currentUsername) { window.location.href = 'login.html'; return; }

            authReadyPromise = new Promise(resolve => { authReadyResolve = resolve; });
            auth.onAuthStateChanged(user => { authReadyResolve(user); });

            pageSlug = new URLSearchParams(window.location.search).get('page');
            document.documentElement.classList.toggle('pg-loading', !!pageSlug);

            // Reset per-page/per-visit state so leftovers from a previous
            // page (or a previous visit) can't bleed into this one.
            pageData = null;
            isOwner = false;
            isFollowing = false;
            viewTracked = false;

            initRealPage();
            renderGrids();
            startCapsuleCountdown();
            applyA11yPrefs();

            window.addEventListener('scroll', onScrollHeaderNX, { passive: true });
            onScrollHeaderNX();
        }

        function destroyPage() {
            if (pageUnsub) { pageUnsub(); pageUnsub = null; }
            if (followUnsub) { followUnsub(); followUnsub = null; }
            if (postsUnsub) { postsUnsub(); postsUnsub = null; }
            if (capsuleTimer) { clearInterval(capsuleTimer); capsuleTimer = null; }
            clearTimeout(groupStoryTimer);
            window.onpopstate = null;

            window.removeEventListener('scroll', onScrollHeaderNX);

            // This anti-flash helper class is pages.html-specific — don't
            // let it leak onto whichever page comes next.
            document.documentElement.classList.remove('pg-loading');
        }

        window.NexusRouter.registerPage('pages.html', { init: initPage, destroy: destroyPage });

        // Native full page load (user opened pages.html directly, not via
        // SPA nav) — router.js only auto-runs init() on SPA navigation, so
        // fire it once manually here if this IS the page that just loaded.
        if (window.NexusRouter.getCurrentPath() === 'pages.html') {
            initPage();
        }
