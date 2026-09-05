// MUHIMMI: an cire firebaseConfig/firebase.initializeApp()/const db daga
// nan — nexus-core.js (wanda router.js ke loda KAFIN wannan file) shine
// YANZU ke da alhakin firebase.initializeApp() da "db" (var db, global)
// gaba daya. Sake ayyana su a nan zai haifar da SyntaxError na
// redeclaration wanda ke kashe DUK wannan file daga gudana ko layi daya.
const auth = firebase.auth();

const myUsername = localStorage.getItem('nexus_user_session');
if (!myUsername) { window.location.href = "login.html"; }

let followBackLoaded = false;

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function switchNotifTab(index) {
    document.getElementById('tabBtnNotif').classList.toggle('active', index === 0);
    document.getElementById('tabBtnFollow').classList.toggle('active', index === 1);
    document.getElementById('tabBtnReplies').classList.toggle('active', index === 2);
    document.getElementById('tabBtnLikes').classList.toggle('active', index === 3);
    document.getElementById('tabBtnInvites').classList.toggle('active', index === 4);
  document.getElementById('content-notifications').classList.toggle('active', index === 0);
    document.getElementById('content-followback').classList.toggle('active', index === 1);
    document.getElementById('content-replies').classList.toggle('active', index === 2);
    document.getElementById('content-likes').classList.toggle('active', index === 3);
    document.getElementById('content-invites').classList.toggle('active', index === 4);
    const underline = document.getElementById('tabUnderline');  
    underline.classList.toggle('pos-1', index === 1);
    underline.classList.toggle('pos-2', index === 2);
    underline.classList.toggle('pos-3', index === 3);
    underline.classList.toggle('pos-4', index === 4);
    // Babban heading ("Notifications") baya canzawa ko wanne tab aka zaɓa —
    // shi ne sunan babban shafin gaba ɗaya. "mark all read" kawai yana ɓoyewa
    // a tab na Follow Back (amma yana RIƘE da sararinsa a layout domin
    // heading ɗin kada ya yi tsalle/motsi — visibility:hidden ba display:none ba).
    const markReadBtn = document.getElementById('markReadBtn');
    markReadBtn.style.visibility = (index === 0) ? 'visible' : 'hidden';

    if (index === 1 && !followBackLoaded) {
        followBackLoaded = true;
        loadFollowBackList();
    }
}

/* ============================================================
   TIME FORMATTER
   ============================================================ */
function timeAgo(ts) {
    if (!ts || !ts.toDate) return '';
    const diffMs = Date.now() - ts.toDate().getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'yanzu';
    if (min < 60) return min + 'm';
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return hrs + 'h';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd';
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return weeks + 'w';
    return Math.floor(days / 30) + 'mo';
}

function ucfirst(str) {
    if (!str) return str;
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/* ============================================================
   1. NOTIFICATIONS TAB (tare da Unread/Read sub-tabs)
   ============================================================ */
let notifCache = [];
let currentReadFilter = 'unread';

async function loadNotifications() {
    const container = document.getElementById('notifListContainer');
    try {
        // GYARAN MUHIMMI: an cire orderBy() daga Firestore query domin
        // ya kaucewa buƙatar composite index. Ana jera su (sort) a JS.
        const snap = await db.collection('notifications')
            .where('to', '==', myUsername)
            .limit(150)
            .get();

        notifCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        notifCache.sort((a, b) => {
            const ta = a.timestamp && a.timestamp.toDate ? a.timestamp.toDate().getTime() : 0;
            const tb = b.timestamp && b.timestamp.toDate ? b.timestamp.toDate().getTime() : 0;
            return tb - ta;
        });

        updateSubtabCounts();
        renderNotifList();

    } catch (err) {
        console.error('Notif load error:', err);
        container.innerHTML = `<div class="state-msg"><i class="fa-solid fa-triangle-exclamation"></i><p>Error loading notifications.</p></div>`;
    }
}

function switchReadFilter(filter) {
    currentReadFilter = filter;
    document.getElementById('subtabUnread').classList.toggle('active', filter === 'unread');
    document.getElementById('subtabRead').classList.toggle('active', filter === 'read');
    document.getElementById('subtabSlider').classList.toggle('pos-1', filter === 'read');
    renderNotifList();
}

/* GYARAN MUHIMMI: wannan function guda ɗaya ce ke rike da Unread/Read
   toggle na tabs uku na Replies, Likes, da Invites. Kowanne yana da
   nasa 'tab' string ('replies'/'likes'/'invites') don JS ya san
   wanne subtab-slider/button/list-container zai sabunta, ba tare da
   maimaita wannan function sau uku ba. */
const readFilterStateByTab = { replies: 'unread', likes: 'unread', invites: 'unread' };

function switchReadFilterFor(tab, filter) {
    readFilterStateByTab[tab] = filter;
    const cap = tab.charAt(0).toUpperCase() + tab.slice(1);
    document.getElementById(`subtabUnread${cap}`).classList.toggle('active', filter === 'unread');
    document.getElementById(`subtabRead${cap}`).classList.toggle('active', filter === 'read');
    document.getElementById(`subtabSlider${cap}`).classList.toggle('pos-1', filter === 'read');
    // Har yanzu babu bayanan Replies/Likes/Invites daga Firestore, don
    // haka babu render function da za a kira nan tukun — zai zo lokacin
    // da muka tattauna inda wadannan notifications za su fito daga.
}

function updateSubtabCounts() {
    const unreadCount = notifCache.filter(n => n.read === false).length;
    const readCount = notifCache.filter(n => n.read !== false).length;
    document.getElementById('subtabUnreadCount').textContent = unreadCount > 99 ? '99+' : unreadCount;
    document.getElementById('subtabReadCount').textContent = readCount > 99 ? '99+' : readCount;
    updateUnreadBadge(unreadCount);
}

function renderNotifList() {
    const container = document.getElementById('notifListContainer');
    const items = notifCache.filter(n => currentReadFilter === 'unread' ? n.read === false : n.read !== false);

    container.innerHTML = '';

    if (items.length === 0) {
        const isUnreadView = currentReadFilter === 'unread';
        container.innerHTML = `
            <div class="state-msg">
                <i class="fa-regular fa-bell${isUnreadView ? '' : '-slash'}"></i>
                <div class="state-title">${isUnreadView ? "You're all caught up" : 'No read notifications yet'}</div>
                <p>${isUnreadView
                    ? "You'll see it here whenever something involves you — follows, requests, and more."
                    : 'Notifications you\'ve opened will show up here.'}</p>
            </div>`;
        return;
    }

    items.forEach(notif => {
        container.insertAdjacentHTML('beforeend', buildNotifCard(notif));
        hydrateNotifCard(notif);
    });
}

function updateUnreadBadge(count) {
    const badge = document.getElementById('notifUnreadBadge');
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.toggle('show', count > 0);
}

function buildNotifCard(notif) {
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${notif.from || 'user'}`;
    const isUnread = notif.read === false;

    let inlineActionHTML = '';
    let stackedActionsHTML = '';

    if (notif.type === 'friend_request') {
        // Biyu-button (Accept/Decline) ba su dace su zauna a gefen dama a
        // layi guda ba a wayar hannu — don haka su ci gaba da zama a ƙasan
        // rubutun, kamar da.
        stackedActionsHTML = `
            <div class="notif-actions" id="notif-actions-${notif.id}">
                <button class="btn-accept" onclick="notifRespond('${notif.id}','${notif.requestId}','${notif.from}',true)">Accept</button>
                <button class="btn-decline" onclick="notifRespond('${notif.id}','${notif.requestId}','${notif.from}',false)">Decline</button>
            </div>`;
    } else if (notif.type === 'new_follower') {
        // GYARAN: button guda ɗaya kawai ("Follow Back") yana zama a gefen
        // dama a layi guda da avatar/text, daidai da Instagram — ba a ƙasa ba.
        inlineActionHTML = `<span id="notif-follow-slot-${notif.id}"></span>`;
    }

    const thumbHTML = notif.mediaUrl ? `<img class="notif-thumb" src="${notif.mediaUrl}" loading="lazy">` : '';

    // Danna kan katin (ba button ba) yana markawa "read" nan take, kuma
    // yana matsar da shi zuwa Read sub-tab. Danna kan avatar yana buɗe
    // profile na mai aikawa (follower, commenter, da sauransu).
    return `
        <div class="notif-card ${isUnread ? 'unread' : ''}" id="notif-card-${notif.id}" data-id="${notif.id}" onclick="handleNotifCardTap(event, '${notif.id}')">
            <div class="notif-avatar-wrap" onclick="event.stopPropagation(); openProfile('${notif.from}')">
                <img class="notif-avatar" id="notif-avatar-${notif.id}" src="${defaultAvatar}">
                <div class="notif-unread-dot"></div>
            </div>
            <div class="notif-body">
                <p class="notif-text">${notif.message || ''}</p>
                <span class="notif-time">${timeAgo(notif.timestamp)}</span>
                ${stackedActionsHTML}
            </div>
            ${inlineActionHTML || thumbHTML}
        </div>
    `;
}

function openProfile(username) {
    if (!username) return;
    window.location.href = `me.html?user=${encodeURIComponent(username)}`;
}

async function hydrateNotifCard(notif) {
    try {
        const userDoc = await db.collection('users').doc(notif.from).get();
        if (userDoc.exists) {
            const u = userDoc.data();
            const avatarEl = document.getElementById(`notif-avatar-${notif.id}`);
            if (avatarEl && u.userProfilePic) avatarEl.src = u.userProfilePic;
        }
    } catch (e) { /* silent */ }

    if (notif.type === 'new_follower') {
        try {
            const check = await db.collection('follows')
                .where('follower', '==', myUsername)
                .get();
            const alreadyFollowing = check.docs.some(d => d.data().following === notif.from);
            const slot = document.getElementById(`notif-follow-slot-${notif.id}`);
            if (!slot) return;
            if (alreadyFollowing) {
                slot.innerHTML = `<button class="fb-follow-btn done" disabled>Following</button>`;
            } else {
                slot.innerHTML = `<button class="fb-follow-btn" onclick="event.stopPropagation(); notifFollowBack('${notif.from}', this);">Follow back</button>`;
            }
        } catch (e) { /* silent */ }
    }
}

/* Danna kan katin (ba kan button ba) yana markawa notification ɗin "read" */
function handleNotifCardTap(event, notifId) {
    if (event.target.closest('button') || event.target.closest('.notif-avatar-wrap')) return;
    markSingleNotifRead(notifId);
}

async function markSingleNotifRead(notifId) {
    const notif = notifCache.find(n => n.id === notifId);
    if (!notif || notif.read !== false) return;
    notif.read = true;
    updateSubtabCounts();
    renderNotifList();
    try {
        await db.collection('notifications').doc(notifId).update({ read: true });
    } catch (e) { console.error('Mark read error:', e); }
}

async function markAllNotifsRead() {
    try {
        const snap = await db.collection('notifications')
            .where('to', '==', myUsername)
            .get();
        const unreadDocs = snap.docs.filter(d => d.data().read === false);
        if (unreadDocs.length === 0) return;
        const batch = db.batch();
        unreadDocs.forEach(doc => batch.update(doc.ref, { read: true }));
        await batch.commit();
        loadNotifications();
    } catch (e) { console.error('Mark all read error:', e); }
}

/* Accept / decline friend request directly from notification card */
async function notifRespond(notifId, requestId, fromUsername, accept) {
    try {
        if (accept) {
            const existing = await db.collection('friends')
                .where('users', 'array-contains', myUsername).get();
            let already = false;
            existing.forEach(d => { if (d.data().users.includes(fromUsername)) already = true; });

            if (!already) {
                await db.collection('friends').add({
                    users: [myUsername, fromUsername],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await db.collection('users').doc(myUsername).update({
                    friendCount: firebase.firestore.FieldValue.increment(1)
                });
                await db.collection('users').doc(fromUsername).update({
                    friendCount: firebase.firestore.FieldValue.increment(1)
                });
            }
            await db.collection('notifications').add({
                to: fromUsername, from: myUsername, type: 'friend_accepted',
                message: `${myUsername} accepted your Friend Request!`,
                read: false, timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        if (requestId && requestId !== 'undefined') {
            await db.collection('friendRequests').doc(requestId).update({
                status: accept ? 'accepted' : 'rejected'
            });
        }

        await db.collection('notifications').doc(notifId).update({ read: true });

        // Sync cache domin Unread/Read counts su tafi daidai lokacin
        // da mutum ya sauya sub-tab, ba tare da fitar da katin nan take
        // yayin da yake kallon "You're friends" feedback ba.
        const cachedNotif = notifCache.find(n => n.id === notifId);
        if (cachedNotif) cachedNotif.read = true;
        updateSubtabCounts();

        const actionsEl = document.getElementById(`notif-actions-${notifId}`);
        if (actionsEl) {
            actionsEl.outerHTML = `<div class="notif-status-tag"><i class="fa-solid ${accept ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>${accept ? "You're friends now" : 'Request declined'}</div>`;
        }
        const card = document.getElementById(`notif-card-${notifId}`);
        if (card) card.classList.remove('unread');

    } catch (err) {
        console.error('Notif respond error:', err);
        alert('Error: ' + err.message);
    }
}

/* Follow back straight from a "new_follower" notification */
async function notifFollowBack(targetUsername, btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = '...';
    try {
        await performFollowBack(targetUsername);
        btnEl.textContent = 'Following';
        btnEl.classList.add('done');
    } catch (err) {
        console.error(err);
        btnEl.disabled = false;
        btnEl.textContent = 'Follow back';
    }
}

/* ============================================================
   2. FOLLOW BACK TAB
   ============================================================ */
async function loadFollowBackList() {
    const container = document.getElementById('followBackContainer');
    try {
        const [followersSnap, followingSnap, dismissedSnap] = await Promise.all([
            db.collection('follows').where('following', '==', myUsername).get(),
            db.collection('follows').where('follower', '==', myUsername).get(),
            db.collection('users').doc(myUsername).collection('dismissed').get()
        ]);

        const followerSet = new Set();
        followersSnap.forEach(d => followerSet.add(d.data().follower));

        const followingSet = new Set();
        followingSnap.forEach(d => followingSet.add(d.data().following));

        const dismissedSet = new Set();
        dismissedSnap.forEach(d => dismissedSet.add(d.id));

        const candidates = [...followerSet].filter(u =>
            u !== myUsername && !followingSet.has(u) && !dismissedSet.has(u)
        );

        document.getElementById('followBackBadge').textContent = candidates.length > 99 ? '99+' : candidates.length;
        document.getElementById('followBackBadge').classList.toggle('show', candidates.length > 0);

        container.innerHTML = '';

        if (candidates.length === 0) {
            container.innerHTML = `
                <div class="state-msg">
                    <i class="fa-solid fa-user-check"></i>
                    <div class="state-title">You're all caught up</div>
                    <p>You follow everyone who follows you back.</p>
                </div>`;
            return;
        }

        container.insertAdjacentHTML('beforeend', `<div class="section-header">People you don't follow back</div>`);

        candidates.forEach(username => {
            container.insertAdjacentHTML('beforeend', buildFollowBackRow(username));
            hydrateFollowBackRow(username, followingSet);
        });

    } catch (err) {
        console.error('Follow-back load error:', err);
        container.innerHTML = `<div class="state-msg"><i class="fa-solid fa-triangle-exclamation"></i><p>Error loading list.</p></div>`;
    }
}

function buildFollowBackRow(username) {
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    const initialName = ucfirst(username);
    return `
        <div class="fb-card" id="fb-card-${username}">
            <img class="fb-avatar" id="fb-avatar-${username}" src="${defaultAvatar}" onclick="openProfile('${username}')" style="cursor:pointer;">
            <div class="fb-info" onclick="openProfile('${username}')" style="cursor:pointer;">
                <div class="fb-name" id="fb-name-${username}">${initialName}</div>
                <div class="fb-mutuals" id="fb-mutuals-${username}"></div>
            </div>
            <div class="fb-actions">
                <button class="fb-follow-btn" id="fb-btn-${username}" onclick="event.stopPropagation(); fbFollowBack('${username}')">Follow back</button>
                <div class="fb-dismiss-btn" onclick="event.stopPropagation(); fbDismiss('${username}')"><i class="fa-solid fa-xmark"></i></div>
            </div>
        </div>`;
}

async function hydrateFollowBackRow(username, followingSet) {
    try {
        const userDoc = await db.collection('users').doc(username).get();
        if (userDoc.exists) {
            const u = userDoc.data();
            const nameEl = document.getElementById(`fb-name-${username}`);
            const avatarEl = document.getElementById(`fb-avatar-${username}`);
            if (nameEl) nameEl.textContent = ucfirst(u.fullName || u.username || username);
            if (avatarEl && u.userProfilePic) avatarEl.src = u.userProfilePic;
        }
    } catch (e) { /* silent */ }

    try {
        const theirFollowersSnap = await db.collection('follows').where('following', '==', username).get();
        const theirFollowers = [];
        theirFollowersSnap.forEach(d => theirFollowers.push(d.data().follower));
        const mutuals = theirFollowers.filter(u => followingSet.has(u) && u !== myUsername);

        const mutualsEl = document.getElementById(`fb-mutuals-${username}`);
        if (!mutualsEl) return;

        if (mutuals.length === 0) { mutualsEl.innerHTML = ''; return; }

        const shown = mutuals.slice(0, 3);
        let avatarsHTML = shown.map(u => `<img src="https://api.dicebear.com/7.x/bottts/svg?seed=${u}">`).join('');
        mutualsEl.innerHTML = `<div class="fb-mutual-avatars">${avatarsHTML}</div><span class="fb-mutual-text">${mutuals.length} mutual${mutuals.length > 1 ? 's' : ''}</span>`;
    } catch (e) { /* silent */ }
}

async function performFollowBack(targetUsername) {
    await db.collection('follows').add({
        follower: myUsername, following: targetUsername,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection('users').doc(targetUsername).update({
        followerCount: firebase.firestore.FieldValue.increment(1)
    });
    await db.collection('users').doc(myUsername).set({
        followingCount: firebase.firestore.FieldValue.increment(1)
    }, { merge: true });

    // Since they already follow me, following back always completes the mutual
    const existingFriend = await db.collection('friends')
        .where('users', 'array-contains', myUsername).get();
    let already = false;
    existingFriend.forEach(d => { if (d.data().users.includes(targetUsername)) already = true; });

    if (!already) {
        await db.collection('friends').add({
            users: [myUsername, targetUsername],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('users').doc(targetUsername).update({
            friendCount: firebase.firestore.FieldValue.increment(1)
        });
        await db.collection('users').doc(myUsername).update({
            friendCount: firebase.firestore.FieldValue.increment(1)
        });
    }

    await db.collection('notifications').add({
        to: targetUsername, from: myUsername, type: 'new_friend',
        message: `${myUsername} followed you back — you're friends now!`,
        read: false, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function fbFollowBack(username) {
    const btn = document.getElementById(`fb-btn-${username}`);
    if (!btn) return;
    btn.disabled = true; btn.textContent = '...';
    try {
        await performFollowBack(username);
        btn.textContent = 'Following'; btn.classList.add('done');
        const card = document.getElementById(`fb-card-${username}`);
        setTimeout(() => {
            if (card) {
                card.classList.add('removing');
                setTimeout(() => { card.remove(); refreshFollowBackBadgeCount(); }, 320);
            }
        }, 900);
    } catch (err) {
        console.error('Follow back error:', err);
        btn.disabled = false; btn.textContent = 'Follow back';
        alert('Error: ' + err.message);
    }
}

async function fbDismiss(username) {
    const card = document.getElementById(`fb-card-${username}`);
    try {
        await db.collection('users').doc(myUsername).collection('dismissed').doc(username).set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (card) {
            card.classList.add('removing');
            setTimeout(() => { card.remove(); refreshFollowBackBadgeCount(); }, 320);
        }
    } catch (err) {
        console.error('Dismiss error:', err);
    }
}

function refreshFollowBackBadgeCount() {
    const remaining = document.querySelectorAll('.fb-card').length;
    const badge = document.getElementById('followBackBadge');
    badge.textContent = remaining;
    badge.classList.toggle('show', remaining > 0);
    if (remaining === 0) {
        document.getElementById('followBackContainer').innerHTML = `
            <div class="state-msg">
                <i class="fa-solid fa-user-check"></i>
                <div class="state-title">You're all caught up</div>
                <p>You follow everyone who follows you back.</p>
            </div>`;
    }
}

/* ============================================================
   INIT (SPA-ready: pageInit/pageDestroy domin NexusRouter)
   ============================================================ */
// GYARAN MUHIMMI: jira Auth session ta tabbata (ko a ƙirƙiri sabuwa
// idan babu) kafin a gudanar da ko wace Firestore query da ke buƙatar
// request.auth != null (notifications, friends, friendRequests).
// Ba tare da wannan ba, duk waɗannan queries suna fāɗuwa da
// "Missing or insufficient permissions" koyaushe, ba tare da la'akari
// da yadda query ɗin yake ba.
let notifAuthUnsub = null;

function pageInit() {
    if (notifAuthUnsub) { notifAuthUnsub(); notifAuthUnsub = null; }
    notifAuthUnsub = auth.onAuthStateChanged(user => {
        if (user) {
            loadNotifications();
        } else {
            auth.signInAnonymously().catch(err => {
                console.error('Anonymous sign-in error:', err);
                document.getElementById('notifListContainer').innerHTML =
                    `<div class="state-msg"><i class="fa-solid fa-triangle-exclamation"></i><p>Error verifying your account.</p></div>`;
            });
        }
    });
}

function pageDestroy() {
    if (notifAuthUnsub) { notifAuthUnsub(); notifAuthUnsub = null; }
}

function _nxRegisterNotifPage() {
    if (window.NexusRouter) {
        NexusRouter.registerPage('notifications.html', { init: pageInit, destroy: pageDestroy });
    }
}
_nxRegisterNotifPage();
window.addEventListener('DOMContentLoaded', function () {
    _nxRegisterNotifPage();
    pageInit();
});
