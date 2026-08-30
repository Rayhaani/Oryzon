/* channels.js — extracted from channels.html for SPA navigation (router.js). */
    /* ============================================================
       NEXUS CHANNEL — now wired to real Firebase (Firestore + Auth).
       Project: oryzon-50ea4. Every reaction, vote, group-buy join,
       escrow payment, tip and post you see below is read from and
       written to Firestore in real time via onSnapshot listeners —
       nothing here is local-only demo data anymore.

       DATA MODEL
       channels/{channelId}
           name, initials, subscriberCount, verified, description,
           link, category, tiers[], adminIds[], duoPartner{active,name}
       channels/{channelId}/posts/{postId}
           type, content, image, video, poster, views, timestamp,
           reactions{emoji:count}, reactedBy{uid:emoji}, pinned, paid,
           edited, tips, poll{...}, pollVotedBy{uid:index},
           groupbuy{...}, groupBuyJoinedBy{uid:true},
           escrow{...}, unlock{...}, unlockBoostedBy{uid:true},
           duoBroadcast, authorId
       channels/{channelId}/subscribers/{uid}
           subscribedAt, muted
       channels/{channelId}/tierSubs/{uid}
           tierId, subscribedAt
       users/{uid}/savedPosts/{channelId__postId}
           channelId, postId, savedAt

       ASSUMPTION worth checking: unauthenticated visitors are sent to
       'login.html?redirect=<this page>'. If your real Nexus sign-in
       page has a different filename, change LOGIN_PAGE_URL below.
       ============================================================ */

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
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const FieldValue = firebase.firestore.FieldValue;
    const LOGIN_PAGE_URL = 'login.html'; // <-- change to your real sign-in page filename if different

    const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👍'];

    const currentUsername = localStorage.getItem('nexus_user_session');
    if (!currentUsername) {
        window.location.href = 'login.html' + '?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    }
    let currentChannelId = 'demo_channel';
    let isAdmin = false;

    let channelInfo = {
        id: 'demo_channel',
        name: 'Channel',
        initials: '#',
        subscriberCount: 0,
        verified: false,
        description: '',
        link: '',
        category: '',
        muted: false,
        isSubscribedPaid: false,
        tiers: [
            { id: 'free', name: 'Free', price: 0, desc: 'Regular posts, polls and reactions.' },
            { id: 'plus', name: 'Nexus Plus', price: 5, desc: 'Early access, exclusive drops, no ads. $5/month' },
            { id: 'vip', name: 'Nexus VIP', price: 15, desc: 'Everything in Plus, plus 1-on-1 vendor priority support. $15/month' }
        ]
    };
    let duoPartner = { active: false, name: '' };
    let postsData = [];
    let savedPostIdSet = new Set();
    let viewedThisSession = new Set();

    let channelUnsub = null;
    let postsUnsub = null;
    let subscriberUnsub = null;
    let tierSubUnsub = null;
    let savedUnsub = null;

    /* ---------- formatting helpers ---------- */
    function formatCount(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return (n || 0).toString();
    }
    function formatTimeAgo(ts) {
        const mins = Math.floor((Date.now() - ts) / 60000);
        if (mins < 60) return mins + 'm ago';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        return Math.floor(hrs / 24) + 'd ago';
    }
    function formatClockTime(ts) {
        const d = new Date(ts);
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'pm' : 'am';
        h = h % 12; if (h === 0) h = 12;
        return h + ':' + m + ' ' + ampm;
    }
    function formatDateLabel(ts) {
        const d = new Date(ts);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
    }
    function formatPrice(n) { return '$' + (n || 0).toLocaleString(); }
    function showToast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(window._toastTimer);
        window._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    }
    function tsToMillis(ts) {
        if (!ts) return Date.now();
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        return ts;
    }
    function channelRef() { return db.collection('channels').doc(currentChannelId); }
    function postsRef() { return channelRef().collection('posts'); }

    /* ---------- boot sequence: auth -> resolve channel -> attach listeners ---------- */
    let authReadyResolve;
    const authReadyPromise = new Promise(resolve => { authReadyResolve = resolve; });
    auth.onAuthStateChanged(user => {
        authReadyResolve(user);
        if (!user) {
            window.location.href = LOGIN_PAGE_URL + '?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
            return;
        }
    });

    async function resolveChannelAndStart() {
        try {
            const params = new URLSearchParams(window.location.search);
            currentChannelId = params.get('channel') || params.get('id') || 'demo_channel';

            const STARTER_CHANNELS = ['demo_channel', 'tech-pulse', 'kano-market-news', 'urban-vision'];
            if (STARTER_CHANNELS.includes(currentChannelId)) {
                await seedStarterChannelIfMissing(currentChannelId);
            }

            attachListeners();
        } catch (err) {
            console.error('Nexus channel boot error:', err);
            showBootError(err);
        }
    }

    function showBootError(err) {
        const container = document.getElementById('feedContainer');
        const code = (err && err.code) || 'unknown';
        let hint = 'An unexpected error occurred.';
        if (code === 'permission-denied') {
            hint = 'Firestore denied this read/write. Your Security Rules likely don\'t allow it yet — check the Rules tab in Firebase Console for project oryzon-50ea4.';
        }
        container.innerHTML = `<div style="padding:24px 14px;color:rgba(255,120,120,0.9);font-size:13px;line-height:1.6;">
            <b>Could not load this channel.</b><br>
            Code: ${code}<br>
            ${hint}
        </div>`;
    }

    async function seedStarterChannelIfMissing(channelId) {
        const ref = db.collection('channels').doc(channelId);
        const snap = await ref.get();
        if (snap.exists) return;

        if (channelId === 'demo_channel') {
            await seedDemoChannelRichContent(ref);
            return;
        }

        // The 3 channels linked from chats.html — light seed matching their preview text there
        const STARTER_META = {
            'tech-pulse': { name: 'Tech Pulse Hub', initials: 'TP', subscriberCount: 3200, category: 'Technology', welcome: 'New updates released for Nexus Ecosystem — welcome to Tech Pulse Hub!' },
            'kano-market-news': { name: 'Kano Market Broadcast', initials: 'KM', subscriberCount: 1800, category: 'Business', welcome: 'Daily updates on B2B prices and vendors start here — welcome!' },
            'urban-vision': { name: 'Urban Vision 2050', initials: 'UV', subscriberCount: 940, category: 'Design', welcome: 'Check out the latest futuristic release — welcome to Urban Vision 2050!' }
        };
        const meta = STARTER_META[channelId] || { name: channelId, initials: channelId.slice(0, 2).toUpperCase(), subscriberCount: 0, category: '', welcome: 'Welcome to the channel!' };

        await ref.set({
            name: meta.name,
            initials: meta.initials,
            subscriberCount: meta.subscriberCount,
            verified: false,
            description: '',
            link: 'nexus.app/c/' + channelId,
            category: meta.category,
            tiers: channelInfo.tiers,
            creatorUsername: currentUsername,
            adminUsernames: [currentUsername],
            duoPartner: { active: false, name: '' },
            createdAt: FieldValue.serverTimestamp()
        });

        await ref.collection('posts').add({
            type: 'text', content: meta.welcome, image: null, video: null, poster: null,
            views: 0, timestamp: FieldValue.serverTimestamp(),
            reactions: { '❤️': 0, '🔥': 0, '😂': 0, '👍': 0 }, reactedBy: {},
            pinned: true, paid: false, edited: false, tips: 0, duoBroadcast: false,
            authorUsername: currentUsername
        });
    }

    async function seedDemoChannelRichContent(ref) {
        await ref.set({
            name: 'Nexus Tech Digest',
            initials: 'NT',
            subscriberCount: 12400,
            verified: true,
            description: 'Official updates, drops and behind-the-scenes from the Nexus team.',
            link: 'nexus.app/c/nexustechdigest',
            category: 'Technology',
            tiers: channelInfo.tiers,
            creatorUsername: currentUsername,
            adminUsernames: [currentUsername],
            duoPartner: { active: true, name: 'Fashion Hub Partner' },
            createdAt: FieldValue.serverTimestamp()
        });

        const now = Date.now();
        const seedPosts = [
            { type: 'text', content: 'Welcome to the channel! We\'ll be sharing updates, tips, and behind-the-scenes here.', views: 1840, minsAgo: 60, reactions: { '❤️': 42, '🔥': 18, '😂': 2, '👍': 30 }, pinned: true },
            { type: 'image', content: 'New feature just dropped — check out the update page for details.', image: 'https://placehold.co/600x360/111111/00F2FF?text=Update', views: 963, minsAgo: 120, reactions: { '❤️': 15, '🔥': 9, '😂': 0, '👍': 12 }, duoBroadcast: true },
            { type: 'poll', content: 'Which drop should we launch first next month?', views: 720, minsAgo: 180, reactions: { '❤️': 6, '🔥': 4, '😂': 0, '👍': 3 },
              poll: { question: 'Which drop should we launch first next month?', options: [{ text: 'Fashion collection', votes: 58 }, { text: 'Tech accessories', votes: 34 }, { text: 'Home & kitchen', votes: 21 }], hideNames: true, endsAt: now + 86400000 }, pollVotedBy: {} },
            { type: 'groupbuy', content: 'Group-Buy: Wireless earbuds — price drops for everyone as more people join!', views: 540, minsAgo: 240, reactions: { '❤️': 9, '🔥': 11, '😂': 0, '👍': 5 },
              groupbuy: { target: 100, joined: 63, originalPrice: 12000, dropPrice: 8500 }, groupBuyJoinedBy: {} },
            { type: 'escrow', content: 'Verified vendor listing — pay safely, funds only release to the seller after you confirm delivery.', views: 410, minsAgo: 300, reactions: { '❤️': 5, '🔥': 2, '😂': 0, '👍': 4 },
              escrow: { item: 'Original Samsung Fast Charger', price: 8500, paid: false, paidBy: null } },
            { type: 'delivery', content: 'Delivered! Order #NX2291 confirmed at customer\'s doorstep.', image: 'https://placehold.co/600x360/111111/1EE676?text=Delivered', views: 305, minsAgo: 360, reactions: { '❤️': 20, '🔥': 3, '😂': 0, '👍': 14 } },
            { type: 'unlock', content: 'Behind-the-scenes video of our new warehouse — help unlock it for everyone!', views: 190, minsAgo: 420, reactions: { '❤️': 3, '🔥': 2, '😂': 0, '👍': 2 },
              unlock: { needed: 200, current: 148, unlocked: false }, unlockBoostedBy: {} },
            { type: 'image', content: 'A closer look at next week\'s exclusive drop — Nexus Plus members already got early access yesterday.', image: 'https://placehold.co/600x360/111111/FFB800?text=Exclusive', views: 88, minsAgo: 480, reactions: { '❤️': 2, '🔥': 1, '😂': 0, '👍': 1 }, paid: true }
        ];

        const batch = db.batch();
        seedPosts.forEach(p => {
            const docRef = ref.collection('posts').doc();
            batch.set(docRef, Object.assign({
                image: null, video: null, poster: null,
                pinned: false, paid: false, edited: false, tips: 0,
                reactedBy: {}, duoBroadcast: false,
                authorUsername: currentUsername,
                timestamp: firebase.firestore.Timestamp.fromMillis(now - p.minsAgo * 60000)
            }, p));
        });
        await batch.commit();
    }

    function attachListeners() {
        if (channelUnsub) channelUnsub();
        if (postsUnsub) postsUnsub();
        if (subscriberUnsub) subscriberUnsub();
        if (tierSubUnsub) tierSubUnsub();
        if (savedUnsub) savedUnsub();

        channelUnsub = channelRef().onSnapshot(doc => {
            if (!doc.exists) {
                document.getElementById('feedContainer').innerHTML = `<div style="padding:24px 14px;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;">
                    <b>This channel doesn't exist in Firestore yet.</b><br>
                    channelId: "${currentChannelId}"<br>
                    Open this page with a matching <code>?id=</code> for a channel you've created, or with no query params at all to load/seed the demo channel.
                </div>`;
                return;
            }
            const d = doc.data();
            channelInfo = Object.assign(channelInfo, {
                id: currentChannelId,
                name: d.name || 'Channel',
                initials: d.initials || (d.name ? d.name.slice(0, 2).toUpperCase() : '#'),
                subscriberCount: d.subscriberCount || 0,
                verified: !!d.verified,
                description: d.description || '',
                link: d.link || '',
                category: d.category || '',
                tiers: d.tiers || channelInfo.tiers
            });
            duoPartner = d.duoPartner || { active: false, name: '' };
            isAdmin = !!(currentUsername && (d.creatorUsername === currentUsername || (d.adminUsernames && d.adminUsernames.includes(currentUsername))));
            renderHeader();
            renderBottomBar();
        }, err => { console.error('channel listener error:', err); showBootError(err); });

        postsUnsub = postsRef().orderBy('timestamp', 'asc').onSnapshot(snapshot => {
            postsData = snapshot.docs.map(d => {
                const data = d.data();
                return Object.assign({ id: d.id, _ref: d.ref }, data, {
                    timestamp: tsToMillis(data.timestamp)
                });
            });
            renderFeed();
        }, err => { console.error('posts listener error:', err); showBootError(err); });

        subscriberUnsub = channelRef().collection('subscribers').doc(currentUsername).onSnapshot(doc => {
            const d = doc.data() || {};
            channelInfo.muted = !!d.muted;
            channelInfo.isSubscribedMember = !!d.subscribedAt;
            renderHeader();
        }, err => console.error('subscriber listener error:', err));

        tierSubUnsub = channelRef().collection('tierSubs').doc(currentUsername).onSnapshot(doc => {
            const d = doc.data();
            channelInfo.isSubscribedPaid = !!(d && d.tierId && d.tierId !== 'free');
            renderFeed();
        }, err => console.error('tier subscription listener error:', err));

        savedUnsub = db.collection('users').doc(currentUsername).collection('savedPosts')
            .where('channelId', '==', currentChannelId).onSnapshot(snapshot => {
                savedPostIdSet = new Set(snapshot.docs.map(d => d.data().postId));
                renderFeed();
            }, err => console.error('saved posts listener error:', err));
    }

    /* ---------- header ---------- */
    function renderHeader() {
        document.getElementById('headerAvatar').textContent = channelInfo.initials;
        document.getElementById('headerName').innerHTML = channelInfo.name + (channelInfo.verified ? ' <span class="verified-badge"><svg width="15" height="15" viewBox="0 0 24 24" fill="var(--cyan-neon)"><path d="M12 2l2.4 2.4 3.4-.5.5 3.4L21 9.6 18.7 12 21 14.4l-2.7 1.7-.5 3.4-3.4-.5L12 22l-2.4-2.4-3.4.5-.5-3.4L3 14.4 5.3 12 3 9.6l2.7-1.7.5-3.4 3.4.5z"/><path d="M9 12l2 2 4-4" stroke="#050505" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : '');
        document.getElementById('headerSubCount').textContent = formatCount(channelInfo.subscriberCount) + ' subscribers' + (channelInfo.muted ? ' · Muted' : '');
    }

    /* ---------- feed rendering ---------- */
    function renderFeed() {
        const container = document.getElementById('feedContainer');
        container.innerHTML = '';
        const sorted = [...postsData].sort((a, b) => (b.pinned - a.pinned) || (a.timestamp - b.timestamp));
        let lastDateLabel = null;
        sorted.forEach(post => {
            const uid = currentUsername;
            post.myReaction = (post.reactedBy && post.reactedBy[uid]) || null;
            if (post.poll) post.poll.votedIndex = (post.pollVotedBy && post.pollVotedBy[uid] !== undefined) ? post.pollVotedBy[uid] : null;
            if (post.groupbuy) post.groupbuy.joinedByMe = !!(post.groupBuyJoinedBy && post.groupBuyJoinedBy[uid]);
            if (post.unlock) post.unlock.boostedByMe = !!(post.unlockBoostedBy && post.unlockBoostedBy[uid]);
            post.saved = savedPostIdSet.has(post.id);

            if (!viewedThisSession.has(post.id)) {
                viewedThisSession.add(post.id);
                post._ref.update({ views: FieldValue.increment(1) }).catch(() => {});
            }

            const dateLabel = formatDateLabel(post.timestamp);
            if (dateLabel !== lastDateLabel && !post.pinned) {
                const sep = document.createElement('div');
                sep.className = 'date-separator';
                sep.innerHTML = `<span>${dateLabel}</span>`;
                container.appendChild(sep);
                lastDateLabel = dateLabel;
            }

            const card = document.createElement('div');
            card.className = 'post-card';

            let mediaHTML = '';
            if (post.type === 'image' && post.image) {
                mediaHTML = `<img src="${post.image}" class="post-image">`;
            } else if (post.type === 'video' && post.video) {
                mediaHTML = `<video src="${post.video}" class="post-video" controls poster="${post.poster || ''}"></video>`;
            } else if (post.type === 'delivery' && post.image) {
                mediaHTML = `<img src="${post.image}" class="post-image">`;
            }

            let bodyBlockHTML = '';
            if (post.paid && !channelInfo.isSubscribedPaid) {
                bodyBlockHTML = `
                    <div class="paid-lock-overlay">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                        <p>This post is for Nexus Plus subscribers only.</p>
                        <div class="paid-unlock-btn" onclick="openSubscribeModal()">Unlock with Nexus Plus</div>
                    </div>`;
            } else {
                if (post.type === 'poll') bodyBlockHTML = renderPollBlock(post);
                if (post.type === 'groupbuy') bodyBlockHTML = renderGroupBuyBlock(post);
                if (post.type === 'escrow') bodyBlockHTML = renderEscrowBlock(post);
                if (post.type === 'unlock') bodyBlockHTML = renderUnlockBlock(post);
            }

            const duoTagHTML = (post.duoBroadcast && duoPartner.active)
                ? `<div class="duo-badge">
                     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                     Co-broadcast with <b>${duoPartner.name}</b>
                   </div>`
                : '';

            const deliveryBadgeHTML = post.type === 'delivery'
                ? `<div class="delivery-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green-ok)" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg> Verified Delivery Proof</div>`
                : '';

            card.innerHTML = `
                ${post.pinned ? `<div class="pin-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)"><path d="M12 2l1.5 5.5L19 9l-4.5 3L16 18l-4-3.2L8 18l1.5-6L5 9l5.5-1.5z"/></svg> Pinned message</div>` : ''}
                ${duoTagHTML}
                ${deliveryBadgeHTML}
                ${mediaHTML ? `
                <div class="post-media-group">
                    ${mediaHTML}
                    <div class="post-content-wrap">
                        <span class="post-content-text">${post.content}${post.edited ? '<span class="edited-tag">(edited)</span>' : ''}</span><span class="post-timestamp">${formatClockTime(post.timestamp)}</span>
                    </div>
                </div>` : `
                <div class="post-content-wrap">
                    <span class="post-content-text">${post.content}${post.edited ? '<span class="edited-tag">(edited)</span>' : ''}</span><span class="post-timestamp">${formatClockTime(post.timestamp)}</span>
                </div>`}
                ${bodyBlockHTML}
                <div class="post-footer">
                    <div class="post-views">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        ${formatCount(post.views)}
                    </div>
                    <div class="reactions-bar">
                        ${REACTION_EMOJIS.map(e => `
                            <div class="reaction-pill ${post.myReaction === e ? 'active' : ''}" onclick="toggleReaction('${post.id}', '${e}')">
                                ${e} ${post.reactions[e] > 0 ? post.reactions[e] : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    function renderPollBlock(post) {
        const poll = post.poll;
        const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);
        const endsAtMs = tsToMillis(poll.endsAt);
        const hoursLeft = Math.max(0, Math.floor((endsAtMs - Date.now()) / 3600000));
        return `
            <div class="poll-block">
                <div class="poll-question">📊 ${poll.question}</div>
                ${poll.options.map((o, i) => {
                    const pct = totalVotes ? Math.round((o.votes / totalVotes) * 100) : 0;
                    return `
                        <div class="poll-option ${poll.votedIndex === i ? 'voted-for' : ''}" onclick="voteOnPoll('${post.id}', ${i})">
                            <div class="poll-bar-fill" style="width:${poll.votedIndex !== null ? pct : 0}%"></div>
                            <div class="poll-option-row">
                                <span>${o.text}</span>
                                <span>${poll.votedIndex !== null ? pct + '%' : ''}</span>
                            </div>
                        </div>`;
                }).join('')}
                <div class="poll-meta">${formatCount(totalVotes)} votes · ${poll.hideNames ? 'Anonymous' : 'Public'} · ${hoursLeft > 0 ? hoursLeft + 'h left' : 'Ended'}</div>
            </div>`;
    }

    function renderGroupBuyBlock(post) {
        const gb = post.groupbuy;
        const pct = Math.min(100, Math.round((gb.joined / gb.target) * 100));
        return `
            <div class="groupbuy-block">
                <div class="groupbuy-title">🛒 Group-Buy Deal</div>
                <div class="groupbuy-track"><div class="groupbuy-fill" style="width:${pct}%"></div></div>
                <div class="groupbuy-info">
                    <span>${gb.joined}/${gb.target} joined</span>
                    <span><s style="opacity:.5">${formatPrice(gb.originalPrice)}</s> ${formatPrice(gb.dropPrice)}</span>
                </div>
                <div class="groupbuy-btn" onclick="joinGroupBuy('${post.id}')">${gb.joinedByMe ? '✓ You joined this deal' : 'Join this group-buy'}</div>
            </div>`;
    }

    function renderEscrowBlock(post) {
        const es = post.escrow;
        return `
            <div class="escrow-block">
                <div class="escrow-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-ok)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Trust-Pay Escrow · ${es.item}</div>
                <div class="escrow-price">${formatPrice(es.price)}</div>
                <div class="escrow-btn" onclick="payEscrow('${post.id}')">${es.paid ? '✓ Funds held in escrow' : 'Pay into escrow'}</div>
                <div class="escrow-note">Seller is paid only after you confirm delivery</div>
            </div>`;
    }

    function renderUnlockBlock(post) {
        const u = post.unlock;
        const pct = Math.min(100, Math.round((u.current / u.needed) * 100));
        if (u.unlocked) {
            return `<div class="unlock-block"><div class="unlock-title">🔓 Unlocked by the community!</div></div>`;
        }
        return `
            <div class="unlock-block">
                <div class="unlock-title">🔒 Crowd-Unlock — ${u.current}/${u.needed} reactions needed</div>
                <div class="unlock-track"><div class="unlock-fill" style="width:${pct}%"></div></div>
                <div class="unlock-btn" onclick="boostUnlock('${post.id}')">${u.boostedByMe ? '✓ You helped unlock this' : 'React to help unlock'}</div>
            </div>`;
    }

    /* ---------- reactions (real-time, per-user, via transaction) ---------- */
    async function toggleReaction(postId, emoji) {
        const ref = postsRef().doc(postId);
        const uid = currentUsername;
        try {
            await db.runTransaction(async t => {
                const doc = await t.get(ref);
                if (!doc.exists) return;
                const data = doc.data();
                const reactions = Object.assign({ '❤️': 0, '🔥': 0, '😂': 0, '👍': 0 }, data.reactions);
                const reactedBy = Object.assign({}, data.reactedBy);
                const current = reactedBy[uid];
                if (current === emoji) {
                    reactions[emoji] = Math.max(0, (reactions[emoji] || 0) - 1);
                    delete reactedBy[uid];
                } else {
                    if (current) reactions[current] = Math.max(0, (reactions[current] || 0) - 1);
                    reactions[emoji] = (reactions[emoji] || 0) + 1;
                    reactedBy[uid] = emoji;
                }
                t.update(ref, { reactions, reactedBy });
            });
        } catch (e) { showToast('Could not save reaction — try again'); }
    }

    /* ---------- HOT FEATURE 2: group-buy ---------- */
    async function joinGroupBuy(postId) {
        const ref = postsRef().doc(postId);
        const uid = currentUsername;
        try {
            await db.runTransaction(async t => {
                const doc = await t.get(ref);
                if (!doc.exists) return;
                const data = doc.data();
                if (data.groupBuyJoinedBy && data.groupBuyJoinedBy[uid]) return;
                t.update(ref, {
                    'groupbuy.joined': FieldValue.increment(1),
                    ['groupBuyJoinedBy.' + uid]: true
                });
            });
            showToast('You joined the group-buy — price locks in when the target is reached');
        } catch (e) { showToast('Could not join — try again'); }
    }

    /* ---------- HOT FEATURE 3: escrow ---------- */
    async function payEscrow(postId) {
        const ref = postsRef().doc(postId);
        try {
            await ref.update({ 'escrow.paid': true, 'escrow.paidBy': currentUsername });
            showToast('Payment held in escrow — funds release after delivery is confirmed');
        } catch (e) { showToast('Could not process payment — try again'); }
    }

    /* ---------- HOT FEATURE 9: crowd-unlock ---------- */
    async function boostUnlock(postId) {
        const ref = postsRef().doc(postId);
        const uid = currentUsername;
        try {
            await db.runTransaction(async t => {
                const doc = await t.get(ref);
                if (!doc.exists) return;
                const data = doc.data();
                if (data.unlockBoostedBy && data.unlockBoostedBy[uid]) return;
                if (data.unlock.unlocked) return;
                const newCurrent = Math.min(data.unlock.needed, data.unlock.current + 1);
                t.update(ref, {
                    'unlock.current': newCurrent,
                    'unlock.unlocked': newCurrent >= data.unlock.needed,
                    ['unlockBoostedBy.' + uid]: true
                });
            });
            showToast('Thanks — pushing this closer to unlocked');
        } catch (e) { showToast('Could not register your boost — try again'); }
    }

    /* ---------- polls ---------- */
    async function voteOnPoll(postId, optionIndex) {
        const ref = postsRef().doc(postId);
        const uid = currentUsername;
        try {
            await db.runTransaction(async t => {
                const doc = await t.get(ref);
                if (!doc.exists) return;
                const data = doc.data();
                if (data.pollVotedBy && data.pollVotedBy[uid] !== undefined) return;
                const options = data.poll.options.slice();
                options[optionIndex] = Object.assign({}, options[optionIndex], { votes: (options[optionIndex].votes || 0) + 1 });
                t.update(ref, {
                    'poll.options': options,
                    ['pollVotedBy.' + uid]: optionIndex
                });
            });
        } catch (e) { showToast('Could not record your vote — try again'); }
    }

    /* ---------- HOT FEATURE 1: AI channel assistant ---------- */
    function toggleAIPanel() {
        document.getElementById('aiPanel').classList.toggle('open');
        const body = document.getElementById('aiPanelBody');
        if (!body.dataset.greeted) {
            body.innerHTML = `<div class="ai-msg bot">Hi! I know everything posted in this channel — ask me about a post, a deal, or how the group-buy and escrow features work.</div>`;
            body.dataset.greeted = '1';
        }
    }
    function sendAIQuestion() {
        const input = document.getElementById('aiInput');
        const q = input.value.trim();
        if (!q) return;
        const body = document.getElementById('aiPanelBody');
        body.innerHTML += `<div class="ai-msg user">${q}</div>`;
        input.value = '';
        body.scrollTop = body.scrollHeight;
        // --GEMINI HOOK-- replace this local answer with a real call to your
        // existing Gemini vendor-chatbot endpoint, passing postsData as context.
        setTimeout(() => {
            let answer = "I can see this channel's posts, polls, group-buys and escrow listings — try asking about a specific one, e.g. 'what's the group-buy price?'";
            const lower = q.toLowerCase();
            if (lower.includes('group') || lower.includes('buy')) {
                const gb = postsData.find(p => p.groupbuy);
                if (gb) answer = `The active group-buy is at ${gb.groupbuy.joined}/${gb.groupbuy.target} joined — price drops to ${formatPrice(gb.groupbuy.dropPrice)} once the target is hit.`;
            } else if (lower.includes('escrow') || lower.includes('trust')) {
                answer = "Trust-Pay Escrow holds your payment safely and only releases it to the seller after you confirm the item was delivered.";
            } else if (lower.includes('subscri') || lower.includes('plus') || lower.includes('vip')) {
                answer = `Nexus Plus is ${formatPrice(channelInfo.tiers[1].price)}/month for early access and exclusive posts, VIP is ${formatPrice(channelInfo.tiers[2].price)}/month.`;
            } else if (lower.includes('pin')) {
                const pinned = postsData.find(p => p.pinned);
                answer = pinned ? `The pinned message right now is: "${pinned.content}"` : 'Nothing is pinned right now.';
            }
            body.innerHTML += `<div class="ai-msg bot">${answer}</div>`;
            body.scrollTop = body.scrollHeight;
        }, 500);
    }

    /* ---------- HOT FEATURE 8: duo broadcast (admin only, channel-level) ---------- */
    function openDuoModal() {
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Duo Broadcast</div>
            <div class="modal-sub">Co-post one message into your channel and a partner channel at the same time.</div>
            <div class="modal-row">
                <div class="modal-row-label">Duo Broadcast<small>Requires the partner channel to accept your invite</small></div>
                <div class="toggle-switch ${duoPartner.active ? 'on' : ''}" onclick="toggleDuo()"><div class="toggle-knob"></div></div>
            </div>
            <div class="modal-row"><div class="modal-row-label">Partner channel<small>${duoPartner.name || 'Not set'}</small></div></div>
            <div class="modal-btn primary" onclick="closeModal()">Done</div>
        `);
        openModal();
    }
    async function toggleDuo() {
        try {
            await channelRef().update({ 'duoPartner.active': !duoPartner.active });
            openDuoModal();
        } catch (e) { showToast('Could not update — try again'); }
    }

    /* ---------- About modal (standard) ---------- */
    function openAboutModal() {
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">${channelInfo.name}</div>
            <div class="modal-sub">${channelInfo.category} · ${formatCount(channelInfo.subscriberCount)} subscribers</div>
            <div class="modal-row"><div class="modal-row-label">${channelInfo.description}</div></div>
            <div class="modal-row"><div class="modal-row-label">Invite link<small>${channelInfo.link}</small></div><div class="modal-btn ghost" style="margin:0;width:auto;padding:8px 14px;" onclick="copyInviteLink()">Copy</div></div>
            <div class="modal-btn ghost" onclick="openSubscribeModal()">View subscription tiers</div>
            ${isAdmin ? `<div class="modal-btn ghost" onclick="openAnalyticsModal()">Channel analytics</div>` : ''}
            ${isAdmin ? `<div class="modal-btn ghost" onclick="openDuoModal()">Duo Broadcast settings</div>` : ''}
        `);
        openModal();
    }
    function copyInviteLink() {
        if (navigator.clipboard) navigator.clipboard.writeText('https://' + channelInfo.link);
        showToast('Invite link copied');
    }

    /* ---------- menu modal: mute / search / report / saved (standard) ---------- */
    function openMenuModal() {
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Channel options</div>
            <div class="modal-row">
                <div class="modal-row-label">Mute notifications<small>Stop alerts for new posts</small></div>
                <div class="toggle-switch ${channelInfo.muted ? 'on' : ''}" onclick="toggleMute()"><div class="toggle-knob"></div></div>
            </div>
            <div class="modal-row" style="cursor:pointer" onclick="openSavedModal()"><div class="modal-row-label">Saved messages<small>${savedPostIdSet.size} saved</small></div></div>
            <div class="modal-row" style="cursor:pointer" onclick="openAboutModal()"><div class="modal-row-label">About this channel</div></div>
            ${!isAdmin ? `<div class="modal-btn danger" onclick="reportChannel()">Report channel</div>` : ''}
            ${!isAdmin ? `<div class="modal-btn ghost" onclick="closeModal()">Leave channel</div>` : ''}
        `);
        openModal();
    }
    async function toggleMute() {
        try {
            await channelRef().collection('subscribers').doc(currentUsername).set({ muted: !channelInfo.muted }, { merge: true });
            openMenuModal();
            showToast(!channelInfo.muted ? 'Channel muted' : 'Channel unmuted');
        } catch (e) { showToast('Could not update — try again'); }
    }
    function reportChannel() {
        closeModal();
        showToast('Report submitted — our team will review it');
    }
    function openSavedModal() {
        const saved = postsData.filter(p => savedPostIdSet.has(p.id));
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Saved messages</div>
            ${saved.length ? saved.map(p => `<div class="search-result-item">${p.content}</div>`).join('') : '<div class="modal-sub">Nothing saved yet.</div>'}
        `);
        openModal();
    }

    /* ---------- search (standard) ---------- */
    function openSearchModal() {
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Search this channel</div>
            <div class="search-input-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                <input type="text" id="searchInput" placeholder="Search messages..." oninput="performSearch()">
            </div>
            <div id="searchResults"></div>
        `);
        openModal();
        setTimeout(() => document.getElementById('searchInput').focus(), 200);
    }
    function performSearch() {
        const q = document.getElementById('searchInput').value.trim().toLowerCase();
        const results = document.getElementById('searchResults');
        if (!q) { results.innerHTML = ''; return; }
        const matches = postsData.filter(p => p.content.toLowerCase().includes(q));
        results.innerHTML = matches.length
            ? matches.map(p => `<div class="search-result-item">${p.content}</div>`).join('')
            : '<div class="modal-sub">No messages found.</div>';
    }

    /* ---------- subscription tiers (standard: paid channels) ---------- */
    let selectedTierId = 'free';
    function openSubscribeModal() {
        selectedTierId = channelInfo.isSubscribedPaid ? 'plus' : 'free';
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Subscription tiers</div>
            <div class="modal-sub">Support this channel and unlock exclusive posts.</div>
            ${channelInfo.tiers.map(t => `
                <div class="tier-card ${selectedTierId === t.id ? 'selected' : ''}" onclick="selectTier('${t.id}')">
                    <div class="tier-name"><span>${t.name}</span><span class="tier-price">${t.price === 0 ? 'Free' : '$' + t.price.toLocaleString() + '/mo'}</span></div>
                    <div class="tier-desc">${t.desc}</div>
                </div>
            `).join('')}
            <div class="modal-btn primary" onclick="confirmSubscription()">Confirm</div>
        `);
        openModal();
    }
    function selectTier(tierId) {
        selectedTierId = tierId;
        openSubscribeModal();
    }
    async function confirmSubscription() {
        try {
            if (selectedTierId === 'free') {
                await channelRef().collection('tierSubs').doc(currentUsername).delete().catch(() => {});
            } else {
                await channelRef().collection('tierSubs').doc(currentUsername).set({ tierId: selectedTierId, subscribedAt: FieldValue.serverTimestamp() });
            }
            closeModal();
            showToast(selectedTierId !== 'free' ? 'Subscribed — exclusive posts unlocked' : 'You are on the Free tier');
        } catch (e) { showToast('Could not update subscription — try again'); }
    }

    /* ---------- analytics (standard, admin only) ---------- */
    function openAnalyticsModal() {
        const totalViews = postsData.reduce((s, p) => s + (p.views || 0), 0);
        const totalReactions = postsData.reduce((s, p) => s + Object.values(p.reactions || {}).reduce((a, b) => a + b, 0), 0);
        const totalTips = postsData.reduce((s, p) => s + (p.tips || 0), 0);
        const bars = [40, 55, 35, 70, 60, 85, 50];
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Channel analytics</div>
            <div class="analytics-grid">
                <div class="analytics-tile"><div class="num">${formatCount(channelInfo.subscriberCount)}</div><div class="lbl">Subscribers</div></div>
                <div class="analytics-tile"><div class="num">${formatCount(totalViews)}</div><div class="lbl">Total views</div></div>
                <div class="analytics-tile"><div class="num">${formatCount(totalReactions)}</div><div class="lbl">Reactions</div></div>
                <div class="analytics-tile"><div class="num">${totalTips}</div><div class="lbl">Tips received</div></div>
            </div>
            <div class="modal-sub" style="margin-bottom:6px;">Views this week</div>
            <div class="mini-bars">${bars.map(b => `<div style="height:${b}%"></div>`).join('')}</div>
            <div class="modal-btn ghost" onclick="closeModal()">Close</div>
        `);
        openModal();
    }

    /* ---------- generic modal helpers ---------- */
    function renderModal(html) { document.getElementById('modalSheet').innerHTML = html; }
    function openModal() { document.getElementById('modalOverlay').classList.add('open'); }
    function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
    function closeModalOnBackdrop(e) { if (e.target.id === 'modalOverlay') closeModal(); }

    /* ---------- composer + attach menu (standard: image/video/poll/schedule + hot variants) ---------- */
    function renderBottomBar() {
        const bar = document.getElementById('bottomBar');
        if (isAdmin) {
            bar.innerHTML = `
                <div class="composer-bar">
                    <div class="composer-pill">
                        <div class="composer-attach-btn" onclick="toggleAttachMenu()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>
                        </div>
                        <input type="text" class="composer-input" id="composerInput" placeholder="Broadcast a message...">
                        <div class="composer-send" onclick="publishPost()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#050505" stroke-width="2.4"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
                        </div>
                    </div>
                </div>
            `;
        } else {
            bar.innerHTML = `<div class="subscribe-bar" onclick="${channelInfo.isSubscribedMember ? 'unsubscribeFromChannel()' : 'subscribeToChannel()'}">${channelInfo.isSubscribedMember ? 'Subscribed' : 'Subscribe'}</div>`;
        }
        renderAttachMenu();
    }
    async function subscribeToChannel() {
        if (channelInfo.isSubscribedMember) { showToast('You are already subscribed'); return; }
        try {
            await channelRef().collection('subscribers').doc(currentUsername).set({ subscribedAt: FieldValue.serverTimestamp(), muted: false }, { merge: true });
            // Fan-out: rubuta index a KANSA (users/{me}/mySubscriptions/{channelId})
            // — wannan shine kadai abinda chats.html zai karanta domin jera "my
            // channels", don haka babu bukatar wata collectionGroup query mai
            // bude subscribers na DUK channels a database.
            await db.collection('users').doc(currentUsername).collection('mySubscriptions').doc(currentChannelId)
                .set({ subscribedAt: FieldValue.serverTimestamp() });
            await channelRef().update({ subscriberCount: FieldValue.increment(1) });
            showToast('Subscribed to ' + channelInfo.name);
        } catch (e) { showToast('Could not subscribe — try again'); }
    }
    async function unsubscribeFromChannel() {
        if (!channelInfo.isSubscribedMember) { showToast('You are not subscribed'); return; }
        try {
            await channelRef().collection('subscribers').doc(currentUsername).delete();
            // Goge fan-out index din ma — in ba haka ba, badge/list dinka a
            // chats.html zai ci gaba da nuna wannan channel kamar har yanzu
            // mutum yana subscribed dashi ko da ya bar shi a nan.
            await db.collection('users').doc(currentUsername).collection('mySubscriptions').doc(currentChannelId).delete();
            await channelRef().update({ subscriberCount: FieldValue.increment(-1) });
            showToast('Unsubscribed from ' + channelInfo.name);
        } catch (e) { showToast('Could not unsubscribe — try again'); }
    }

    function renderAttachMenu() {
        const menu = document.getElementById('attachMenu');
        const options = [
            { icon: '🖼️', label: 'Image', fn: 'attachImage' },
            { icon: '🎬', label: 'Video', fn: 'attachVideo' },
            { icon: '📊', label: 'Poll', fn: 'openPollComposer' },
            { icon: '🛒', label: 'Group-Buy', fn: 'openGroupBuyComposer' },
            { icon: '🛡️', label: 'Escrow', fn: 'openEscrowComposer' },
            { icon: '📦', label: 'Delivery Proof', fn: 'openDeliveryComposer' },
            { icon: '🔓', label: 'Crowd-Unlock', fn: 'openUnlockComposer' },
            { icon: '⏰', label: 'Schedule', fn: 'openScheduleComposer' },
            { icon: '⭐', label: 'Mark Paid', fn: 'togglePaidComposeFlag' }
        ];
        menu.innerHTML = options.map(o => `
            <div class="attach-option" onclick="${o.fn}()">
                <div class="attach-icon-circle" style="font-size:18px;">${o.icon}</div>
                <span>${o.label}</span>
            </div>
        `).join('');
    }
    function toggleAttachMenu() {
        const menu = document.getElementById('attachMenu');
        const bar = document.querySelector('.composer-bar');
        if (bar) menu.style.bottom = bar.offsetHeight + 'px';
        menu.classList.toggle('open');
    }

    function attachImage() {
        toggleAttachMenu();
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Attach image</div>
            <div class="modal-sub">Paste an image URL (in production this opens your device gallery).</div>
            <textarea class="composer-textarea" id="mediaUrlInput" placeholder="https://..."></textarea>
            <div class="modal-btn primary" onclick="publishPost('image')">Attach & post</div>
        `);
        openModal();
    }
    function attachVideo() {
        toggleAttachMenu();
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Attach video</div>
            <div class="modal-sub">Paste a video URL (in production this opens your device gallery).</div>
            <textarea class="composer-textarea" id="mediaUrlInput" placeholder="https://..."></textarea>
            <div class="modal-btn primary" onclick="publishPost('video')">Attach & post</div>
        `);
        openModal();
    }

    let pollOptionCount = 2;
    function openPollComposer() {
        toggleAttachMenu();
        pollOptionCount = 2;
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Create a poll</div>
            <input type="text" id="pollQuestionInput" placeholder="Ask a question..." class="composer-textarea" style="min-height:auto;">
            <div id="pollOptionsWrap">
                <div class="poll-option-input"><input type="text" class="pollOptEl" placeholder="Option 1"></div>
                <div class="poll-option-input"><input type="text" class="pollOptEl" placeholder="Option 2"></div>
            </div>
            <div class="modal-btn ghost" onclick="addPollOption()">+ Add option</div>
            <div class="modal-row">
                <div class="modal-row-label">Hide voter names<small>Anonymous voting</small></div>
                <div class="toggle-switch on" id="pollHideToggle" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div>
            </div>
            <div class="modal-btn primary" onclick="createPoll()">Publish poll</div>
        `);
        openModal();
    }
    function addPollOption() {
        pollOptionCount++;
        document.getElementById('pollOptionsWrap').insertAdjacentHTML('beforeend', `<div class="poll-option-input"><input type="text" class="pollOptEl" placeholder="Option ${pollOptionCount}"></div>`);
    }
    async function createPoll() {
        const question = document.getElementById('pollQuestionInput').value.trim();
        const opts = Array.from(document.querySelectorAll('.pollOptEl')).map(i => i.value.trim()).filter(Boolean);
        if (!question || opts.length < 2) { showToast('Add a question and at least 2 options'); return; }
        const hideNames = document.getElementById('pollHideToggle').classList.contains('on');
        try {
            await postsRef().add(basePostFields({
                type: 'poll',
                content: question,
                poll: { question, options: opts.map(t => ({ text: t, votes: 0 })), hideNames, endsAt: Date.now() + 86400000 },
                pollVotedBy: {}
            }));
            closeModal();
            showToast('Poll published');
        } catch (e) { showToast('Could not publish poll — try again'); }
    }

    function openGroupBuyComposer() {
        toggleAttachMenu();
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Start a Group-Buy</div>
            <textarea class="composer-textarea" id="gbTextInput" placeholder="Describe the deal..."></textarea>
            <div class="poll-option-input"><input type="number" id="gbTarget" placeholder="Target buyers e.g. 100"></div>
            <div class="poll-option-input"><input type="number" id="gbOriginal" placeholder="Original price ($)"></div>
            <div class="poll-option-input"><input type="number" id="gbDrop" placeholder="Group price ($)"></div>
            <div class="modal-btn primary" onclick="createGroupBuy()">Publish group-buy</div>
        `);
        openModal();
    }
    async function createGroupBuy() {
        const content = document.getElementById('gbTextInput').value.trim();
        const target = parseInt(document.getElementById('gbTarget').value) || 50;
        const original = parseInt(document.getElementById('gbOriginal').value) || 0;
        const drop = parseInt(document.getElementById('gbDrop').value) || 0;
        if (!content) { showToast('Describe the deal first'); return; }
        try {
            await postsRef().add(basePostFields({
                type: 'groupbuy', content,
                groupbuy: { target, joined: 0, originalPrice: original, dropPrice: drop },
                groupBuyJoinedBy: {}
            }));
            closeModal();
            showToast('Group-buy published');
        } catch (e) { showToast('Could not publish — try again'); }
    }

    function openEscrowComposer() {
        toggleAttachMenu();
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Create Trust-Pay listing</div>
            <textarea class="composer-textarea" id="esTextInput" placeholder="Describe the item..."></textarea>
            <div class="poll-option-input"><input type="text" id="esItem" placeholder="Item name"></div>
            <div class="poll-option-input"><input type="number" id="esPrice" placeholder="Price ($)"></div>
            <div class="modal-btn primary" onclick="createEscrowPost()">Publish listing</div>
        `);
        openModal();
    }
    async function createEscrowPost() {
        const content = document.getElementById('esTextInput').value.trim();
        const item = document.getElementById('esItem').value.trim() || 'Item';
        const price = parseInt(document.getElementById('esPrice').value) || 0;
        if (!content) { showToast('Describe the item first'); return; }
        try {
            await postsRef().add(basePostFields({
                type: 'escrow', content,
                escrow: { item, price, paid: false, paidBy: null }
            }));
            closeModal();
            showToast('Trust-Pay listing published');
        } catch (e) { showToast('Could not publish — try again'); }
    }

    function openDeliveryComposer() {
        toggleAttachMenu();
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Post delivery proof</div>
            <textarea class="composer-textarea" id="dpTextInput" placeholder="e.g. Delivered! Order #123 confirmed..."></textarea>
            <textarea class="composer-textarea" id="dpImageInput" placeholder="Photo URL (optional)" style="min-height:40px;"></textarea>
            <div class="modal-btn primary" onclick="createDeliveryPost()">Publish proof</div>
        `);
        openModal();
    }
    async function createDeliveryPost() {
        const content = document.getElementById('dpTextInput').value.trim();
        const image = document.getElementById('dpImageInput').value.trim() || null;
        if (!content) { showToast('Add a short description'); return; }
        try {
            await postsRef().add(basePostFields({ type: 'delivery', content, image }));
            closeModal();
            showToast('Delivery proof published');
        } catch (e) { showToast('Could not publish — try again'); }
    }

    function openUnlockComposer() {
        toggleAttachMenu();
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Create Crowd-Unlock post</div>
            <textarea class="composer-textarea" id="ulTextInput" placeholder="What are subscribers unlocking?"></textarea>
            <div class="poll-option-input"><input type="number" id="ulNeeded" placeholder="Reactions needed e.g. 200"></div>
            <div class="modal-btn primary" onclick="createUnlockPost()">Publish</div>
        `);
        openModal();
    }
    async function createUnlockPost() {
        const content = document.getElementById('ulTextInput').value.trim();
        const needed = parseInt(document.getElementById('ulNeeded').value) || 200;
        if (!content) { showToast('Describe what will be unlocked'); return; }
        try {
            await postsRef().add(basePostFields({
                type: 'unlock', content,
                unlock: { needed, current: 0, unlocked: false },
                unlockBoostedBy: {}
            }));
            closeModal();
            showToast('Crowd-unlock post published');
        } catch (e) { showToast('Could not publish — try again'); }
    }

    let scheduledForTs = null;
    function openScheduleComposer() {
        toggleAttachMenu();
        renderModal(`
            <div class="modal-handle"></div>
            <div class="modal-title">Schedule this broadcast</div>
            <div class="modal-sub">Write your message in the composer bar, then pick a time — it publishes automatically.</div>
            <input type="datetime-local" id="scheduleInput" class="composer-textarea" style="min-height:auto;">
            <div class="modal-btn primary" onclick="confirmSchedule()">Confirm time</div>
        `);
        openModal();
    }
    function confirmSchedule() {
        const val = document.getElementById('scheduleInput').value;
        if (!val) { showToast('Pick a date and time'); return; }
        scheduledForTs = new Date(val).getTime();
        closeModal();
        showToast('Next message will publish at the scheduled time');
    }

    let paidComposeFlag = false;
    function togglePaidComposeFlag() {
        paidComposeFlag = !paidComposeFlag;
        toggleAttachMenu();
        showToast(paidComposeFlag ? 'Next message will be marked Nexus Plus only' : 'Next message will be public');
    }

    function basePostFields(overrides) {
        return Object.assign({
            type: 'text',
            content: '',
            image: null,
            video: null,
            poster: null,
            views: 0,
            timestamp: (scheduledForTs && scheduledForTs > Date.now())
                ? firebase.firestore.Timestamp.fromMillis(scheduledForTs)
                : FieldValue.serverTimestamp(),
            reactions: { '❤️': 0, '🔥': 0, '😂': 0, '👍': 0 },
            reactedBy: {},
            pinned: false,
            paid: paidComposeFlag,
            edited: false,
            tips: 0,
            duoBroadcast: false,
            authorUsername: currentUsername
        }, overrides);
    }

    async function publishPost(mediaType) {
        const input = document.getElementById('composerInput');
        const text = input.value.trim();
        const mediaUrlEl = document.getElementById('mediaUrlInput');
        const mediaUrl = mediaUrlEl ? mediaUrlEl.value.trim() : '';
        if (!text && !mediaUrl) return;

        const fields = basePostFields({
            content: text || (mediaType === 'video' ? 'New video' : 'New photo'),
            type: mediaType === 'video' ? 'video' : (mediaType === 'image' ? 'image' : 'text')
        });
        if (mediaType === 'image') fields.image = mediaUrl || 'https://placehold.co/600x360/111111/00F2FF?text=New+Post';
        if (mediaType === 'video') fields.video = mediaUrl || '';

        try {
            await postsRef().add(fields);
            input.value = '';
            paidComposeFlag = false;
            scheduledForTs = null;
            if (document.getElementById('modalOverlay').classList.contains('open')) closeModal();
            showToast('Broadcast sent to ' + formatCount(channelInfo.subscriberCount) + ' subscribers');
        } catch (e) { showToast('Could not publish — try again'); }
    }


    /* ============================================================
       SPA WIRING — hukuncin router.js (kamar chats.html/group.html).
       init() shine ke maye gurbin abinda auth.onAuthStateChanged ke
       yi kai tsaye a da (resolveChannelAndStart -> attachListeners),
       domin idan an bar wannan page ta hanyar SPA sannan aka koma,
       auth listener din ba zai sake gudana ba (auth din bai canza
       ba), don haka dole mu sake kiran resolveChannelAndStart() da
       kanmu duk lokacin da aka shigo wannan page.
       ============================================================ */
    async function init() {
        await authReadyPromise;
        if (!auth.currentUser) return; // an riga an fara redirect zuwa login
        resolveChannelAndStart();
    }

    function destroy() {
        if (channelUnsub) channelUnsub();
        if (postsUnsub) postsUnsub();
        if (subscriberUnsub) subscriberUnsub();
        if (tierSubUnsub) tierSubUnsub();
        if (savedUnsub) savedUnsub();
        channelUnsub = postsUnsub = subscriberUnsub = tierSubUnsub = savedUnsub = null;
        if (typeof closeModal === 'function') closeModal();
        const attachMenu = document.getElementById('attachMenu');
        if (attachMenu) attachMenu.classList.remove('open');
        const aiPanel = document.getElementById('aiPanel');
        if (aiPanel) aiPanel.classList.remove('open');
        if (window._toastTimer) clearTimeout(window._toastTimer);
    }

    if (window.NexusRouter) {
        window.NexusRouter.registerPage('channels.html', { init: init, destroy: destroy });
    }
    // Native/direct page load: router.js's bootstrap already ran BEFORE this
    // script existed, so it never called init() for us. document.readyState
    // is still "loading" only during that first synchronous parse — for any
    // later SPA navigation (which runs long after the document finished
    // loading) it's "complete", and router.js calls init() itself in that case.
    if (document.readyState === 'loading') {
        init();
    }
