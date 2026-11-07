/* ============================================================
   ME.JS — an fitar da wannan daga inline <script> a me.html
   domin ya yi aiki daidai a karkashin NEXUS SPA ROUTER (router.js).
   Duk logic din asali (business logic) BAI CANJA ba — an kawai:
   1) Mika boot-calls (DOMContentLoaded/startProfileOnce) zuwa
      pageInit() domin su sake gudana kowane lokaci da aka koma
      me.html ta SPA (ba tare da full page reload ba).
   2) Kara unsubscribe tracking domin Firestore listeners kada su
      tara/hadu idan an bar me.html sannan aka dawo.
   ============================================================ */

// Wannan shine asalin karamin script (profile pic/cover restore
// daga localStorage) — yanzu function ce mai suna domin a iya
// sake kiranta a pageInit().
function restoreCachedProfilePhotos() {
    const p = localStorage.getItem('userProfilePic');
    const c = localStorage.getItem('userCover');
    if (p && document.getElementById('main-profile-img')) {
        document.getElementById('main-profile-img').src = p;
    }
    if (c && document.getElementById('main-cover-img')) {
        document.getElementById('main-cover-img').src = c;
    }
}


// MUHIMMI: an cire firebase.initializeApp()/const db/const auth daga
// nan — nexus-core.js (wanda ke loda a KOWACE page, SAU DAYA kacal a
// duk rayuwar app din) shine YANZU ke da alhakin wannan gaba daya.
// me.js yana amfani da `db`/`auth`/`analytics`/`storage` da suka riga
// sun wanzu a global scope daga nexus-core.js kai tsaye — sake
// ayyana su a nan zai haifar da "Firebase already defined in global
// scope" da SyntaxError na redeclaration.
let viewedProfileUser = null;
let postsCountUnsub = null;
let authStateUnsub = null;

// Function na canza tabs
function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    document.querySelectorAll('.photo-menu').forEach(m => { if(m.id !== menuId) m.classList.add('hidden'); });
    menu.classList.toggle('hidden');
}

function removePhoto(type) {
    const imgId = type === 'cover' ? 'main-cover-img' : 'main-profile-img';
    const storageKey = type === 'cover' ? 'userCover' : 'userProfilePic';
    document.getElementById(imgId).removeAttribute('src');
    localStorage.removeItem(storageKey);
    document.getElementById(type + '-menu').classList.add('hidden');
}

// Function na sarrafa sauti na bidiyo
function toggleVideoSound(event, element) {
    event.stopPropagation();
    const video = element.previousElementSibling;
    if (video) {
        video.muted = !video.muted;
        element.innerHTML = video.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
    }
}

// ============================================================
// 1. LODA POSTS NA TIMELINE (DYNAMIC BASED ON LOGGED IN USER)
// ============================================================
let timelineUnsub = null;
function loadTimelinePosts() {
    const timelineArea = document.getElementById('timeline-area');
    
    if (!viewedProfileUser || !viewedProfileUser.username) {
        timelineArea.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Loading timeline...</p>';
        return;
    }
    
    if (timelineUnsub) { timelineUnsub(); timelineUnsub = null; }

    timelineUnsub = db.collection('posts')
        .where("username", "==", viewedProfileUser.username)
        .orderBy("timestamp", "desc")
        .onSnapshot(snapshot => {
            
            let hasPosts = false;
            snapshot.forEach(doc => {
                const post = doc.data();
                if (post.category === "normal") { 
                    hasPosts = true;
                    
                    timelineArea.insertAdjacentHTML('beforeend', generatePostHTML({id: doc.id, ...post}));
                    setTimeout(() => postCard_restoreLikes(timelineArea), 1000);
                    
                    db.collection('users').doc(post.username).get().then(userDoc => {
    if (!userDoc.exists) return;
    const pic = userDoc.data().userProfilePic;
    if (!pic) return;
    const card = timelineArea.querySelector(`.post-card[data-post-id="${doc.id}"]`);
    if (card) {
        const avatar = card.querySelector('.post-avatar');
        if (avatar) avatar.src = pic;
    }
});

// Ƙidaya comments na kowane post
db.collection("nexus_contributions")
    .where("postId", "==", doc.id)
    .where("parentId", "==", null)
    .onSnapshot(commentSnap => {
        const el = document.getElementById(`comment-count-${doc.id}`);
        if (el) el.textContent = commentSnap.size;
    });
                }
            });

            const myUsername = localStorage.getItem('nexus_user_session');
if(myUsername){
    db.collection('likes').where('user','==',myUsername).get().then(snap=>{
        snap.forEach(doc=>{
            const postId = doc.data().postId;
            const card = timelineArea.querySelector(`.post-card[data-post-id="${postId}"]`);
            if(card){
                const likeBtn = card.querySelectorAll('.capsule')[0];
               
                if(likeBtn){
    likeBtn.classList.add('liked');
    likeBtn.querySelector('i').className = 'fa-solid fa-heart';
    likeBtn.querySelector('i').style.color = '#ff4d6d';
    
    // Restore like count daga Firestore
    db.collection('likes')
        .where('postId', '==', postId)
        .get().then(countSnap => {
            const countEl = likeBtn.querySelector('span');
            if(countEl) countEl.textContent = countSnap.size > 0 ? countSnap.size : '';
        });
                }
            }
        });
    });
}
            
            if(!hasPosts) {
                timelineArea.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">No posts found on timeline.</p>';
            }
        }, (err) => {
            console.error("Timeline error:", err);
            timelineArea.innerHTML = '<p style="text-align:center; padding:20px; color:#ff4444;">Kuskure wajen loda posts.</p>';
        });
}


let highlightsUnsub = null;

function loadHighlights() {
    if (window.__meLocked) return;
    const container = document.getElementById('highlights-scroll');
    if (!container || !viewedProfileUser || !viewedProfileUser.username) return;

    const urlParams = new URLSearchParams(window.location.search);
    const profileUser = urlParams.get('user') || viewedProfileUser.username;
    const myUsername = localStorage.getItem('nexus_user_session');
    const isOwnProfile = profileUser === myUsername;

    if (highlightsUnsub) { highlightsUnsub(); highlightsUnsub = null; }

    highlightsUnsub = db.collection('users').doc(profileUser)
    .collection('highlights').orderBy('order', 'asc')
    .onSnapshot(snapshot => {
        const highlightsBox = document.getElementById('highlights-box');
        container.innerHTML = '';

        if (snapshot.empty && !isOwnProfile) {
            if (highlightsBox) highlightsBox.style.display = 'none';
            return;
        }
        if (highlightsBox) highlightsBox.style.display = 'block';

            if (isOwnProfile) {
                container.insertAdjacentHTML('beforeend', `
                    <div class="highlight-item">
                        <div class="highlight-add-ring" onclick="openHighlightModal()">
                            <i class="fa-solid fa-plus"></i>
                        </div>
                        <p class="highlight-label">New</p>
                    </div>`);
            }

            snapshot.forEach(doc => {
    const h = doc.data();

    const mediaTag = h.mediaType === 'video'
        ? `<video src="${h.imageUrl}" muted></video>`
        : `<img src="${h.imageUrl}" loading="lazy">`;

    container.insertAdjacentHTML('beforeend', `
        <div class="highlight-item" data-id="${doc.id}">
            <div class="highlight-ring" onclick="viewHighlight('${doc.id}')">
                ${mediaTag}
            </div>
            <p class="highlight-label">${h.label || ''}</p>
        </div>`);

    if (isOwnProfile) {
        const ring = container.querySelector(`.highlight-item[data-id="${doc.id}"] .highlight-ring`);
        let pressTimer;
        ring.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => openHighlightMenu(e, doc.id), 500);
        });
        ring.addEventListener('touchend', () => clearTimeout(pressTimer));
        ring.addEventListener('touchmove', () => clearTimeout(pressTimer));
    }
});
});
}
        

let storyItems = [];
let storyIndex = 0;
let storyTimer = null;
let storyProgressInterval = null;
const STORY_DURATION = 5000;

async function viewHighlight(id) {
    const urlParams = new URLSearchParams(window.location.search);
    const profileUser = urlParams.get('user') || viewedProfileUser.username;

    const snap = await db.collection('users').doc(profileUser)
        .collection('highlights').orderBy('order', 'asc').get();

    storyItems = [];
    snap.forEach(doc => storyItems.push({ id: doc.id, ...doc.data() }));
    storyIndex = Math.max(0, storyItems.findIndex(item => item.id === id));

    meFillAvatar(document.getElementById('storyUserAvatar'), viewedProfileUser.userProfilePic || '', viewedProfileUser.fullName || profileUser);
    document.getElementById('storyUsername').textContent = viewedProfileUser.fullName || profileUser;

    const myUsername = localStorage.getItem('nexus_user_session');
    const isOwn = profileUser === myUsername;
    const followBtn = document.getElementById('storyFollowBtn');
    if (isOwn) {
        followBtn.style.display = 'none';
    } else {
        const followCheck = await db.collection('follows')
            .where('follower', '==', myUsername)
            .get();
        const alreadyFollowing = followCheck.docs.some(d => d.data().following === profileUser);
        followBtn.style.display = alreadyFollowing ? 'none' : 'block';
    }

    document.getElementById('storyViewerOverlay').style.display = 'flex';
    showStoryAt(storyIndex);

    history.pushState({ storyViewer: true }, '');
    window.onpopstate = closeStoryViewer;
}

// ===== Story viewer: stacked cards with a live drag (neighbour card is real, never black) =====
let storyBusy = false;
let storyDrag = null;
const STORY_EASE = 'cubic-bezier(.22,.8,.26,1)';

function storyBuildSlide(index) {
    const item = storyItems[index];
    const el = document.createElement('div');
    el.className = 'story-slide';
    const bd = document.createElement('div');
    bd.className = 'story-bd';
    const url = String(item.imageUrl || '');
    if (item.mediaType !== 'video') bd.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
    el.appendChild(bd);
    let m;
    if (item.mediaType === 'video') {
        m = document.createElement('video');
        m.autoplay = true; m.playsInline = true; m.setAttribute('playsinline', '');
        m.src = url;
    } else {
        m = document.createElement('img');
        m.src = url; m.draggable = false;
    }
    el.appendChild(m);
    return el;
}
// p: 0 = new card fully off-screen, 1 = new card in place
function storyStack(nu, old, dir, p) {
    nu.style.zIndex = '2';
    nu.style.transform = 'translateX(' + (dir * (1 - p) * 100) + '%)';
    nu.style.boxShadow = '0 0 34px rgba(0,0,0,' + (0.55 * (1 - p * .6)) + ')';
    if (old) {
        old.style.zIndex = '1';
        old.style.transform = 'translateX(' + (-dir * 18 * p) + '%) scale(' + (1 - .06 * p) + ')';
        old.style.filter = 'brightness(' + (1 - .5 * p) + ')';
    }
}
function storySettle(nu, old, dir, toP, done) {
    const t = 'transform .38s ' + STORY_EASE + ', filter .38s ease, box-shadow .38s ease';
    nu.style.transition = t;
    if (old) old.style.transition = t;
    storyStack(nu, old, dir, toP);
    setTimeout(function () { nu.style.transition = ''; if (old) old.style.transition = ''; if (done) done(); }, 400);
}
function storyPreload(i) {
    const it = storyItems[i];
    if (it && it.mediaType !== 'video' && it.imageUrl) { const im = new Image(); im.src = it.imageUrl; }
}
function storyApplyMeta(index) {
    clearTimeout(storyTimer);
    const item = storyItems[index];
    if (!item) return;
    const bk = document.getElementById('storyBackdrop');
    if (bk) bk.style.backgroundImage = item.mediaType === 'video' ? 'none' : 'url("' + String(item.imageUrl).replace(/"/g, '%22') + '")';
    document.getElementById('storyTime').textContent = formatStoryTime(item.timestamp);
    const footer = document.getElementById('storyFooter');
    footer.style.display = item.allowReply === false ? 'none' : 'flex';
    const ri = document.getElementById('storyReplyInput'); if (ri) ri.value = '';
    const pill = document.getElementById('sfPill'); if (pill) pill.classList.remove('typing');
    const hb = document.getElementById('sfHeart'); if (hb) hb.classList.remove('liked');
    storyPreload(index + 1); storyPreload(index - 1);
    storyTimer = setTimeout(function () { nextStory(); }, STORY_DURATION);
}

function showStoryAt(index, direction) {
    const wrap = document.getElementById('storyMediaWrap');
    const dir = direction === 'prev' ? -1 : 1;
    const olds = Array.prototype.slice.call(wrap.querySelectorAll('.story-slide'));
    const old = olds.length ? olds[olds.length - 1] : null;
    olds.forEach(function (s) { if (s !== old) s.remove(); });
    const nu = storyBuildSlide(index);
    if (old) {
        storyBusy = true;
        nu.style.transition = 'none';
        storyStack(nu, old, dir, 0);
        wrap.appendChild(nu);
        void nu.offsetWidth;
        requestAnimationFrame(function () {
            storySettle(nu, old, dir, 1, function () { old.remove(); nu.style.boxShadow = ''; nu.style.zIndex = ''; storyBusy = false; });
        });
    } else {
        wrap.appendChild(nu);
    }
    storyApplyMeta(index);
    setupDragListeners(wrap);
}

function nextStory() {
    if (storyBusy) return;
    if (storyIndex < storyItems.length - 1) { storyIndex++; showStoryAt(storyIndex, 'next'); }
    else closeStoryViewer();
}
function prevStory() {
    if (storyBusy) return;
    if (storyIndex > 0) { storyIndex--; showStoryAt(storyIndex, 'prev'); }
}

function setupDragListeners(wrap) {
    wrap.ontouchstart = function (e) {
        if (storyBusy || e.touches.length !== 1) { storyDrag = null; return; }
        storyDrag = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), mode: null, dir: 0, nb: null };
        clearTimeout(storyTimer);
    };
    wrap.ontouchmove = function (e) {
        const d = storyDrag; if (!d) return;
        const dx = e.touches[0].clientX - d.x, dy = e.touches[0].clientY - d.y;
        const cur = wrap.querySelector('.story-slide:not(.story-nb)'); if (!cur) return;
        if (!d.mode) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
            d.mode = Math.abs(dx) >= Math.abs(dy) ? 'h' : (dy > 0 ? 'v' : 'x');
            cur.style.transition = 'none';
        }
        if (d.mode === 'h') {
            const W = wrap.clientWidth || 1;
            const dir = dx < 0 ? 1 : -1;
            if (d.dir !== dir) {
                if (d.nb) { d.nb.remove(); d.nb = null; }
                d.dir = dir;
                const ti = storyIndex + dir;
                if (storyItems[ti]) {
                    d.nb = storyBuildSlide(ti); d.nb.classList.add('story-nb'); d.nb.style.transition = 'none';
                    wrap.appendChild(d.nb);
                }
            }
            const p = Math.min(1, Math.abs(dx) / W);
            if (d.nb) storyStack(d.nb, cur, dir, p);
            else cur.style.transform = 'translateX(' + (dx * .28) + 'px)';
        } else if (d.mode === 'v') {
            const k = Math.min(1, dy / 420);
            cur.style.transform = 'translateY(' + dy + 'px) scale(' + (1 - .18 * k) + ')';
            const ov = document.getElementById('storyViewerOverlay');
            if (ov) ov.style.setProperty('--sv-fade', String(1 - k * .9));
        }
        if (d.mode !== 'x' && e.cancelable) e.preventDefault();
    };
    wrap.ontouchend = function (e) {
        const d = storyDrag; storyDrag = null; if (!d) return;
        const cur = wrap.querySelector('.story-slide:not(.story-nb)');
        const dx = e.changedTouches[0].clientX - d.x, dy = e.changedTouches[0].clientY - d.y;
        const W = wrap.clientWidth || 1, dt = Math.max(1, Date.now() - d.t);
        const resume = function () { storyTimer = setTimeout(function () { nextStory(); }, STORY_DURATION); };
        const ov = document.getElementById('storyViewerOverlay');
        if (!d.mode || d.mode === 'x') { resume(); return; }
        if (d.mode === 'v') {
            if (dy > 120 || dy / dt > .6) { if (ov) ov.style.removeProperty('--sv-fade'); closeStoryViewer(); return; }
            if (cur) { cur.style.transition = 'transform .3s ' + STORY_EASE; cur.style.transform = ''; }
            if (ov) ov.style.setProperty('--sv-fade', '1');
            resume(); return;
        }
        const fast = Math.abs(dx) / dt > .45 && Math.abs(dx) > 28;
        const go = Math.abs(dx) > W * .22 || fast;
        if (d.nb) {
            if (go) {
                storyBusy = true;
                storyIndex += d.dir;
                storyApplyMeta(storyIndex);
                const nb = d.nb;
                storySettle(nb, cur, d.dir, 1, function () { if (cur) cur.remove(); nb.classList.remove('story-nb'); nb.style.boxShadow = ''; nb.style.zIndex = ''; storyBusy = false; });
            } else {
                const nb = d.nb;
                storySettle(nb, cur, d.dir, 0, function () { nb.remove(); if (cur) { cur.style.filter = ''; cur.style.zIndex = ''; } });
                resume();
            }
        } else {
            if (go && d.dir === 1) { closeStoryViewer(); return; }
            if (cur) { cur.style.transition = 'transform .3s ' + STORY_EASE; cur.style.transform = ''; }
            resume();
        }
    };
    wrap.ontouchcancel = wrap.ontouchend;
}

function formatStoryTime(ts) {
    if (!ts || !ts.toDate) return '';
    const diffMs = Date.now() - ts.toDate().getTime();
    const hrs = Math.floor(diffMs / 3600000);
    if (hrs < 1) return Math.floor(diffMs / 60000) + "m";
    if (hrs < 24) return hrs + "h";
    return Math.floor(hrs / 24) + "d";
}

function closeStoryViewer() {
    clearTimeout(storyTimer);
    clearInterval(storyProgressInterval);
    document.getElementById('storyViewerOverlay').style.display = 'none';
    document.getElementById('storyMediaWrap').querySelectorAll('.story-slide').forEach(el => el.remove());
    const _ri = document.getElementById('storyReplyInput'); if (_ri) _ri.value = '';
    const _sp = document.getElementById('sfPill'); if (_sp) _sp.classList.remove('typing');
    window.onpopstate = null;
    storyBusy = false; storyDrag = null;
    const _sh = document.getElementById('mxShare'); if (_sh) _sh.classList.remove('on');
    const _ov = document.getElementById('storyViewerOverlay'); if (_ov) _ov.style.removeProperty('--sv-fade');
}
            
function openHighlightMenu(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.highlight-menu').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'highlight-menu';
    menu.innerHTML = `
        <button onclick="editHighlightPrompt('${id}')"><i class="fa-solid fa-pen"></i>&nbsp; Edit</button>
        <button class="danger" onclick="deleteHighlight('${id}')"><i class="fa-solid fa-trash"></i>&nbsp; Delete</button>`;
    document.body.appendChild(menu);
    const rect = event.target.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    menu.style.left = rect.left + 'px';
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeMenu); }
        });
    }, 50);
}

let hlSelectedFile = null;

function openHighlightModal() {
    document.getElementById('hlLabelInput').value = '';
    document.getElementById('hlPreviewText').style.display = 'block';
    document.getElementById('hlPreviewBox').innerHTML = `
        <span id="hlPreviewText">Danna domin zaɓi hoto/video</span>
        <input type="file" id="hlFileInput" accept="image/*,video/*" style="display:none" onchange="handleHlFileSelect(event)">`;
    hlSelectedFile = null;
    document.getElementById('hlModalOverlay').style.display = 'flex';
}

function closeHighlightModal() {
    document.getElementById('hlModalOverlay').style.display = 'none';
    hlSelectedFile = null;
}

// ============================================================
// EDIT PROFILE DETAILS — Workplace / School / City / Neighborhood / Occupation
// Ana ajiyewa a users/{myUsername} kai tsaye. Owner-only field a Firestore rules
// (request.auth.uid == resource.data.uid) ya ba da damar wannan write.
// Ana amfani da wannan data don gina "People You May Know" mafi kyau a chats.html.
// ============================================================
function openEditProfileModal() {
    const u = viewedProfileUser || {};
    document.getElementById('epBio').value = u.bio || '';
    const _pv = document.getElementById('epPrivate'); if (_pv) _pv.checked = !!u.isPrivate;
    epRenderCustom(Array.isArray(u.customFields) ? u.customFields : []);
    document.getElementById('epWorkplace').value = u.workplace || '';
    document.getElementById('epSchool').value = u.school || '';
    document.getElementById('epCity').value = u.city || '';
    document.getElementById('epNeighborhood').value = u.neighborhood || '';
    document.getElementById('epOccupation').value = u.occupation || '';
    [['epWebsite','website'],['epInstagram','instagram'],['epTiktok','tiktok'],['epFacebook','facebook'],['epX','x'],['epWhatsapp','whatsapp']].forEach(function (m) { var el = document.getElementById(m[0]); if (el) el.value = u[m[1]] || ''; });
    document.getElementById('editProfileModalOverlay').style.display = 'flex';
    document.body.classList.add('ep-open');
}

function closeEditProfileModal() {
    document.getElementById('editProfileModalOverlay').style.display = 'none';
    document.body.classList.remove('ep-open');
}

// Custom fields: any "label: value" pair the user wants on their profile (max 10)
const EP_MAX_CUSTOM = 10;
function epRenderCustom(list) {
    const box = document.getElementById('epCustomList');
    if (!box) return;
    box.textContent = '';
    (list || []).slice(0, EP_MAX_CUSTOM).forEach(function (f) { epAddCustomField(f && f.label, f && f.value, true); });
    epSyncAddBtn();
}
function epSyncAddBtn() {
    const n = document.querySelectorAll('#epCustomList .ep-custom-row').length;
    const b = document.getElementById('epAddField');
    if (b) b.disabled = n >= EP_MAX_CUSTOM;
}
function epAddCustomField(label, value, silent) {
    const box = document.getElementById('epCustomList');
    if (!box || box.querySelectorAll('.ep-custom-row').length >= EP_MAX_CUSTOM) return;
    const row = document.createElement('div'); row.className = 'ep-custom-row';
    const wrap = document.createElement('div'); wrap.className = 'ep-cf-wrap';
    const l = document.createElement('input'); l.type = 'text'; l.className = 'ep-cf-label'; l.placeholder = 'Label (e.g. Languages)'; l.maxLength = 30; l.autocomplete = 'off'; l.value = label || '';
    const v = document.createElement('input'); v.type = 'text'; v.className = 'ep-cf-value'; v.placeholder = 'Value (e.g. English, French)'; v.maxLength = 80; v.autocomplete = 'off'; v.value = value || '';
    wrap.appendChild(l); wrap.appendChild(v);
    const d = document.createElement('button'); d.type = 'button'; d.className = 'ep-cf-del'; d.setAttribute('aria-label', 'Remove field'); d.textContent = '\u00d7';
    d.onclick = function () { row.remove(); epSyncAddBtn(); };
    row.appendChild(wrap); row.appendChild(d);
    box.appendChild(row);
    epSyncAddBtn();
    if (!silent) l.focus();
}

async function saveProfileDetails() {
    const myUsername = localStorage.getItem('nexus_user_session');
    if (!myUsername) return;

    const saveBtn = document.getElementById('epSaveBtn');
    const customFields = [];
    document.querySelectorAll('#epCustomList .ep-custom-row').forEach(function (r) {
        const lb = r.querySelector('.ep-cf-label').value.trim().slice(0, 30), vl = r.querySelector('.ep-cf-value').value.trim().slice(0, 80);
        if (lb && vl) customFields.push({ label: lb, value: vl });
    });
    const details = {
        bio: document.getElementById('epBio').value.trim().slice(0, 160),
        customFields: customFields,
        workplace: document.getElementById('epWorkplace').value.trim(),
        school: document.getElementById('epSchool').value.trim(),
        city: document.getElementById('epCity').value.trim(),
        neighborhood: document.getElementById('epNeighborhood').value.trim(),
        occupation: document.getElementById('epOccupation').value.trim(),
        isPrivate: !!(document.getElementById('epPrivate') && document.getElementById('epPrivate').checked)
    };
    [['epWebsite','website',120],['epInstagram','instagram',60],['epTiktok','tiktok',60],['epFacebook','facebook',80],['epX','x',60],['epWhatsapp','whatsapp',25]].forEach(function (m) { var el = document.getElementById(m[0]); if (el) details[m[1]] = el.value.trim().replace(/\s+/g, m[1] === 'whatsapp' ? ' ' : '').slice(0, m[2]); });

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        await db.collection('users').doc(myUsername).set(details, { merge: true });

        // Sabunta local cache domin gaba idan aka sake bude modal ɗin, ya nuna sabon bayani
        viewedProfileUser = { ...(viewedProfileUser || {}), ...details };

        closeEditProfileModal();
        try { meRenderAbout(viewedProfileUser, myUsername); } catch (e) {}
        showToast('Profile details saved');
    } catch (e) {
        console.error('Save profile details error:', e);
        showToast('Failed to save. Please try again.', true);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
}

function handleHlFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    hlSelectedFile = file;
    const previewBox = document.getElementById('hlPreviewBox');
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video')) {
        previewBox.innerHTML = `<video src="${url}" style="width:100%;height:100%;object-fit:cover;" muted></video>`;
    } else {
        previewBox.innerHTML = `<img src="${url}">`;
    }
}

async function saveNewHighlight() {
    const label = document.getElementById('hlLabelInput').value.trim();
    if (!label) { alert("Da fatan za a saka suna."); return; }
    if (!hlSelectedFile) { alert("Da fatan za a zaɓi hoto ko video."); return; }

    const fileToUpload = hlSelectedFile;   // <-- AJIYE SHI A LOCAL VARIABLE KAFIN
    closeHighlightModal();
    await uploadHighlight(fileToUpload, label);   // <-- YANZU YANA AMFANI DA COPY MAI AMINCI
            }
async function uploadHighlight(file, label) {
    const username = localStorage.getItem('nexus_user_session');
    if (!username) return;
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'highlight');
        formData.append('username', username);
        const authH = await meAuthHeaders();
        if (!authH) throw new Error('Your session has expired. Please log in again.');
        const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', headers: authH, body: formData });
        const data = await response.json();
        if (data.success) {
            const countSnap = await db.collection('users').doc(username).collection('highlights').get();
            await db.collection('users').doc(username).collection('highlights').add({
                label: label,
                imageUrl: data.url,
                mediaType: file.type.startsWith('video') ? 'video' : 'image',
                order: countSnap.size,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast("Highlight uploaded successfully");
        } else {
            throw new Error(data.error || "Upload failed");
        }
    } catch (err) {
        console.error('Highlight upload error:', err);
        showToast("Upload failed. Please try again.", true);
    }
}
                        
async function editHighlightPrompt(id) {
    const username = localStorage.getItem('nexus_user_session');
    const newLabel = prompt("Sabon suna:");
    if (!newLabel) return;
    await db.collection('users').doc(username).collection('highlights').doc(id).update({ label: newLabel });
}

async function deleteHighlight(id) {
    if (!confirm("Tabbata za ka goge wannan Highlight?")) return;
    const username = localStorage.getItem('nexus_user_session');
    await db.collection('users').doc(username).collection('highlights').doc(id).delete();
    document.querySelectorAll('.highlight-menu').forEach(m => m.remove());
}

         
// =====================================================================
// 2. TIMELINE DATABASE SYNC LOADER (INTELLIGENT RUNNER)
// =====================================================================
const urlParams = new URLSearchParams(window.location.search);
// Nemo sunan mutumin da muke kallo daga URL (Misali: me.html?user=Sadiq)
const targetTimelineUser = urlParams.get('user') || localStorage.getItem("nexus_user_session") || "Sadiq";


function loadUserTimelinePosts() {
    // Tabbatar ka saka ainihin ID na inda kake son jerin posts din su bayyana a HTML dinka
    const timelineContainer = document.getElementById('timeline-posts-container');
    if (!timelineContainer) {
        console.warn("Bamu sami 'timeline-posts-container' a jikin HTML ba tukunna.");
        return;
    }

    timelineContainer.innerHTML = '<p style="text-align:center; padding:30px; color:#666;">Syncing timeline...</p>';

    if (typeof db === "undefined") {
        console.error("Firebase Database bai gama lodi ba.");
        return;
    }

    // Dauko posts daga Firebase ba tare da hadaddiyar query ba don gudun Index Error
    db.collection("posts").get()
    .then((querySnapshot) => {
        const userFilteredPosts = [];

        querySnapshot.forEach((doc) => {
            const postData = doc.data();
            
            // Tace posts na wannan mutumin kadai da kake kallon profile dinsa
            if (postData.username && postData.username.toLowerCase() === targetTimelineUser.toLowerCase()) {
                userFilteredPosts.push({
                    id: doc.id,
                    ...postData
                });
            }
        });

        // Tsara posts din ta hanyar na karshe da aka dora (JavaScript sorting)
        userFilteredPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        timelineContainer.innerHTML = '';

        if (userFilteredPosts.length === 0) {
            timelineContainer.innerHTML = '<p style="text-align:center; padding:40px; color:#555; font-size:13px;">No posts yet on this timeline</p>';
            return;
        }

        // Zana posts din ta hanyar kiran EXACT function dinka na Homepage!
        userFilteredPosts.forEach((post) => {
            timelineContainer.insertAdjacentHTML('beforeend', generatePostHTML(post));
        });
    })
    .catch((error) => {
        console.error("Timeline load error: ", error);
        timelineContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#ff4444;">Error loading timeline</p>';
    });
}

// NOTE: kiran loadUserTimelinePosts() an mika shi zuwa pageInit() a
// kasan wannan file domin ya sake gudana kowane lokaci da aka koma
// me.html ta hanyar SPA navigation (ba DOMContentLoaded kadai ba,
// domin wannan event baya sake fitowa bayan SPA swap).
// ============================================================
// 3. LODA SHOWCASE IMAGES (DYNAMIC BASED ON LOGGED IN USER)
// ============================================================
let showcaseUnsubscribe = null;

function loadShowcaseImages() {
    const showcaseArea = document.getElementById('showcase-area');
    if (!viewedProfileUser || !viewedProfileUser.username) {
        showcaseArea.innerHTML = '<p style="text-align:center; width:100%; padding:20px; color:#666;">Loading showcase...</p>';
        return;
    }

    const myUsername = localStorage.getItem('nexus_user_session');
    const isOwnProfile = viewedProfileUser.username === myUsername;

    if (showcaseUnsubscribe) { showcaseUnsubscribe(); showcaseUnsubscribe = null; }

    showcaseUnsubscribe = db.collection('posts')
        .where("username", "==", viewedProfileUser.username)
        .onSnapshot(snapshot => {
            showcaseArea.innerHTML = '';
            let hasImages = false;

            snapshot.forEach(doc => {
                const post = doc.data();
                if (post.category === "business" && post.mediaUrl) {
                    hasImages = true;
                    const deleteBtn = isOwnProfile ? `
                        <div onclick="event.stopPropagation(); deleteShowcasePost('${doc.id}')" style="
                            position:absolute; top:6px; right:6px; width:24px; height:24px;
                            background:rgba(0,0,0,0.6); border-radius:50%; display:flex;
                            align-items:center; justify-content:center; z-index:10; cursor:pointer;">
                            <i class="fa-solid fa-trash" style="color:#ff4d6d; font-size:11px;"></i>
                        </div>` : '';

                    showcaseArea.insertAdjacentHTML('beforeend', `
                        <div class="grid-item" style="aspect-ratio: 1/1; overflow: hidden; border-radius: 8px; position: relative;">
                            ${deleteBtn}
                            <img src="${window.npThumbUrl ? npThumbUrl(post.mediaUrl) : post.mediaUrl}" data-orig="${post.mediaUrl}" onerror="npThumbFail(this)" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                        </div>`);
                }
            });

            if (!hasImages) {
                showcaseArea.innerHTML = '<p style="text-align:center; width:100%; padding:20px; color:#666;">Babu hotuna a nan.</p>';
            }
        }, (err) => { console.error("Showcase error: ", err); });
}

async function deleteShowcasePost(postId) {
    if (!confirm(" Are you sure you want to delete this post?")) return;
    try {
        await db.collection('posts').doc(postId).delete();
    } catch(err) {
        console.error("Delete error:", err);
        alert("Delete error occur: " + err.message);
    }
                    }
            
function switchTab(tab) {
    if (window.__meLocked) return;
    const showcase = document.getElementById('showcase-area');
    const timeline = document.getElementById('timeline-area');
    const btnShowcase = document.getElementById('btn-showcase');
    const btnTimeline = document.getElementById('btn-timeline');

    if (tab === 'showcase') {
        timeline.classList.add('hidden');
        showcase.classList.remove('hidden');
        btnShowcase.className = 'btn-slim btn-white';
        btnTimeline.className = 'btn-slim btn-trans';
        // Tabbatar an kira shi da 'false' domin kada ya yi tsalle zuwa timeline idan babu hotuna a farkon lodi
        loadShowcaseImages(false); 
    } else {
        showcase.classList.add('hidden');
        timeline.classList.remove('hidden');
        btnTimeline.className = 'btn-slim btn-white';
        btnShowcase.className = 'btn-slim btn-trans';
        loadTimelinePosts();
    }
}
            

function openSubModal() {
    document.getElementById("subscriptionModal").style.display = "flex";
    document.body.style.overflow = "hidden"; 
}

function closeSubModal() {
    document.getElementById("subscriptionModal").style.display = "none";
    document.body.style.overflow = "auto";
}

// Avatar: the shared gold-ring .nx-av; initials when there is no photo (no broken-image icon)
function meFillAvatar(el, u, name) {
    if (!el) return;
    const wrap = el.parentNode;
    let ini = wrap.querySelector('.nx-ini');
    const showIni = function () {
        el.style.display = 'none';
        if (!ini) { ini = document.createElement('div'); ini.className = 'nx-ini'; wrap.insertBefore(ini, el.nextSibling); }
        ini.textContent = (String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('') || '?').toUpperCase();
        ini.style.display = '';
    };
    el.onerror = null;
    if (!u) { el.removeAttribute('src'); el.removeAttribute('data-orig'); showIni(); return; }
    if (ini) ini.style.display = 'none';
    el.style.display = '';
    el.setAttribute('data-orig', u);
    el.onerror = function () { const o = el.getAttribute('data-orig'); if (o && el.src !== o) { el.src = o; } else { el.onerror = null; showIni(); } };
    el.src = window.npThumbUrl ? window.npThumbUrl(u) : u;
}
function meSetAvatar(u, name) { meFillAvatar(document.getElementById('main-profile-img'), u, name); }
function meSetCover(u) {
    const el = document.getElementById('main-cover-img'); if (!el) return;
    if (!u) { el.removeAttribute('src'); el.style.visibility = 'hidden'; return; }
    el.onerror = function () { el.style.visibility = 'hidden'; };
    el.onload = function () { el.style.visibility = ''; };
    el.style.visibility = ''; el.src = u;
}

// ============================================================
// 4. UPDATE PHOTO TO CLOUDINARY & FIRESTORE (DYNAMIC DOC ID)
// ============================================================
function applyUserToProfile(user) {
    if (!user) return;

    const profilePic = user.userProfilePic || "";
    const coverPhoto = user.userCover || "";
    
    meSetAvatar(profilePic, user.fullName || user.username);
    meSetCover(coverPhoto);
    
    if (profilePic) localStorage.setItem('userProfilePic', profilePic); else localStorage.removeItem('userProfilePic');
    if (coverPhoto) localStorage.setItem('userCover', coverPhoto); else localStorage.removeItem('userCover');

    // fullName ("Aliyu Abdulkadir") zai fito - ba username ba
    document.getElementById('profile-name-text').textContent = 
        user.fullName || user.username || "User";
        }
// ============================================================
// 5. APPLICATION STATE TO PROFILE UI (USERNAME USED INSTEAD OF FULLNAME)
// ============================================================
function applyUserToProfile(user) {
    if (!user) return;

    const profilePic = user.userProfilePic || "";
    const coverPhoto = user.userCover || "";
    
    meSetAvatar(profilePic, user.fullName || user.username);
    meSetCover(coverPhoto);
    
    if (profilePic) localStorage.setItem('userProfilePic', profilePic); else localStorage.removeItem('userProfilePic');
    if (coverPhoto) localStorage.setItem('userCover', coverPhoto); else localStorage.removeItem('userCover');

    // Nuna fullName idan akwai shi, idan ba a nuna username
    document.getElementById('profile-name-text').textContent = 
        user.fullName || user.username || "User";
}

    
// ============================================================
// 6. GLOBAL AUTH MONITOR (DYNAMIC DETECTOR)
// ============================================================
// CIRE onAuthStateChanged GABA DAYA - ba a amfani da Firebase Auth
// Maye gurbinsa da wannan:
async function initProfile() {
    try {
        // Karanta username daga localStorage kai tsaye
        const username = localStorage.getItem("nexus_user_session");

        const urlParams = new URLSearchParams(window.location.search);
        const profileUser = urlParams.get('user') || username;
        const isOwnProfile = profileUser === username;

        if (!username) {
            // Babu wanda ya login - tafi login page
            window.location.href = "login.html";
            return;
        }

        // Cache-first: idan an taba bude wannan profile, nuna shi nan take
        let cachedDoc = null;
        try { cachedDoc = await db.collection('users').doc(profileUser).get({ source: 'cache' }); } catch (e) {}
        const serverPromise = db.collection('users').doc(profileUser).get();
        let userDoc;
        if (cachedDoc && cachedDoc.exists) {
            userDoc = cachedDoc;
            serverPromise.then(function (sd) {
                if (sd && sd.exists && viewedProfileUser) { viewedProfileUser = { uid: sd.id, ...sd.data() }; applyUserToProfile(viewedProfileUser); }
            }).catch(function () {});
        } else {
            userDoc = await serverPromise;
        }

        if (userDoc.exists) {
            viewedProfileUser = { uid: userDoc.id, ...userDoc.data() };
        } else {
            // Username yana localStorage amma babu document
            viewedProfileUser = {
                uid: profileUser,
                username: profileUser,
                fullName: profileUser,
                userProfilePic: ""
            };
        }

        // Apply profile UI
       applyUserToProfile(viewedProfileUser);
        window.__meLocked = await meComputeLocked(viewedProfileUser, profileUser, isOwnProfile);
        meApplyLock(window.__meLocked);
        try { meRenderAbout(viewedProfileUser, profileUser); } catch (e) { console.error('About error:', e); }

        // Loda showcase nan take - a keɓe domin kada wani kuskure ya hana ta
        try {
            switchTab('showcase');
        } catch(e) {
            console.error("Showcase auto-load error:", e);
        }

        window.__meIsOwn = isOwnProfile;
        const cam = document.getElementById('profile-cam'); if (cam) cam.style.display = isOwnProfile ? 'flex' : 'none';
        const cvr = document.getElementById('mx-cover'); if (cvr) cvr.style.cursor = isOwnProfile ? 'pointer' : 'default';
        const verifyB = document.getElementById('getVerifiedBtn'); if (verifyB && !isOwnProfile) verifyB.style.display = 'none';
        try {
            Promise.resolve(initFollowButton()).catch(function () {}).then(meMarkReady);
            loadFollowerCount();

            if (isOwnProfile) {
                document.getElementById('stats-third-label').textContent = 'Friends';
                loadFriendCount();
            } else {
                document.getElementById('stats-third-label').textContent = 'Following';
                loadFollowingCount(profileUser);
            }
        } catch(e) {
            console.error("Stats loading error:", e);
        }

        // 1. Zai loda adadin posts na mai asusun
        if (postsCountUnsub) { postsCountUnsub(); postsCountUnsub = null; }
        postsCountUnsub = db.collection('posts')
            .where("username", "==", viewedProfileUser.username)
            .onSnapshot(snap => {
                const postsCountEl = document.getElementById('stats-posts-count');
                if (postsCountEl) postsCountEl.innerText = snap.size;
            }, err => {
                console.error("Firestore counts error:", err);
            });

        // Bude shafin a kan Showcase a matsayin default (wannan shi kadai zai loda hotuna)

try { switchTab('showcase'); } catch(e) { console.error(e); }
try { loadHighlights(); } catch(e) { console.error("Highlights error:", e); }
        
        // Gyara Contact button ya dauki username
        const contactBtn = document.getElementById('contact-btn');
        if (contactBtn) {
            contactBtn.href = `chat-interior.html?with=${viewedProfileUser.username}`;
        }
        
        // Idan wani ne, boye camera buttons
        meMarkReady();

    } catch (e) {
        console.error("Profile init error:", e);
        // Idan Firestore ya kasa isa (misali "unavailable"), kar mu
        // bar "Loading..." har abada — mu sake gwada nan take sau daya.
        if (e && e.code === 'unavailable' && !window.__meProfileRetried) {
            window.__meProfileRetried = true;
            setTimeout(() => { initProfile(); }, 1500);
        }
    }
}

let authReadyOnce = false;
function startProfileOnce() {
    if (authReadyOnce) return;
    authReadyOnce = true;
    initProfile();
}
// NOTE: an mika kiran startProfileOnce() da auth.onAuthStateChanged()
// zuwa pageInit()/pageDestroy() a kasan wannan file domin su iya
// sake gudana (kuma a tsaftace listener) kowane lokaci da aka koma
// me.html ta hanyar SPA navigation.
                   
// ============================================================
// BACKEND_URL an rigaya an ayyana ta a nexus-core.js (var BACKEND_URL,
// global). Kada a sake ayyana ta a nan — zai haifar da
// "SyntaxError: Identifier 'BACKEND_URL' has already been declared"
// wanda ke kashe DUK me.js daga gudana ko layi daya.
// ============================================================

// ============================================================
// AUTH HEADER — backend /upload requires "Authorization: Bearer <idToken>"
// ============================================================
async function meAuthHeaders() {
    try {
        let u = firebase.auth().currentUser;
        if (!u) {
            u = await new Promise(function (res) {
                const t = setTimeout(function () { res(null); }, 4000);
                const un = firebase.auth().onAuthStateChanged(function (x) { clearTimeout(t); try { un(); } catch (e) {} res(x); });
            });
        }
        if (u) return { 'Authorization': 'Bearer ' + await u.getIdToken() };
    } catch (e) { console.warn('Auth token unavailable:', e && e.message); }
    return null;
}

// ============================================================
// UPDATE PHOTO - Profile da Cover
// ============================================================
async function updatePhoto(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const username = localStorage.getItem('nexus_user_session');
    if (!username || !window.__meIsOwn) return;

    // Nuna loading
    const imgId = type === 'cover' ? 'main-cover-img' : 'main-profile-img';
    const imgEl = document.getElementById(imgId);
    const originalSrc = imgEl.src;
    imgEl.style.opacity = '0.5';

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        formData.append('username', username);

        const authH = await meAuthHeaders();
        if (!authH) throw new Error('Your session has expired. Please log in again.');
        const response = await fetch(`${BACKEND_URL}/upload`, {
            method: 'POST',
            headers: authH,
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Nuna hoto nan take
            imgEl.src = data.url;
            imgEl.style.opacity = '1';

            // Adana a Firestore
            const userRef = db.collection('users').doc(username);
            const updateData = {};
            
            if (type === 'profile') {
                updateData.userProfilePic = data.url;
                updateData.profilePicKey = data.key;
                localStorage.setItem('userProfilePic', data.url);
            } else {
                updateData.userCover = data.url;
                updateData.coverKey = data.key;
                localStorage.setItem('userCover', data.url);
            }

            await userRef.update(updateData);
            
            // Rufe menu
            document.querySelectorAll('.photo-menu').forEach(m => m.classList.add('hidden'));
            
        } else {
            throw new Error(data.error);
        }

    } catch (err) {
        console.error('Upload kuskure:', err);
        imgEl.src = originalSrc;
        imgEl.style.opacity = '1';
        showToast('Upload failed: ' + (err && err.message ? err.message : 'please try again'), true);
    }
}

// ============================================================
// FRIENDS REQUEST SYSTEM
// ============================================================

// Aika friend request
async function sendFriendRequest(targetUsername) {
    const myUsername = localStorage.getItem('nexus_user_session');
    if (!myUsername || myUsername === targetUsername) return;

    try {
        // Duba ko request ta riga ta wanzu
        const existing = await db.collection('friendRequests')
            .where('from', '==', myUsername)
            .get();
        const alreadySent = existing.docs.some(d => d.data().to === targetUsername);

        if (alreadySent) {
            alert("You've already sent a request!");
            return;
        }

        // Duba ko sun riga sun zama friends
        const friendship = await db.collection('friends')
            .where('users', 'array-contains', myUsername)
            .get();

        let alreadyFriends = false;
        friendship.forEach(doc => {
            if (doc.data().users.includes(targetUsername)) alreadyFriends = true;
        });

        if (alreadyFriends) {
            alert("You're already friends!");
            return;
        }

        // Aika request
        const requestRef = await db.collection('friendRequests').add({
            from: myUsername,
            to: targetUsername,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Aika notification zuwa target user
        await db.collection('notifications').add({
            to: targetUsername,
            from: myUsername,
            type: 'friend_request',
            requestId: requestRef.id,
            message: `${myUsername} sent you a Friend Request`,
            read: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Canza button
        const btn = document.getElementById('add-node-btn');
        if (btn) {
            btn.textContent = 'Request Sent';
            btn.disabled = true;
            btn.style.opacity = '0.6';
        }

        alert('Friend Request sent!');

    } catch (err) {
        console.error('Friend request kuskure:', err);
        alert('Kuskure: ' + err.message);
    }
}

// Karɓa ko ƙi request
async function respondToRequest(requestId, fromUsername, accept) {
    const myUsername = localStorage.getItem('nexus_user_session');

    try {
        if (accept) {
            // Ƙirƙiri friendship
            await db.collection('friends').add({
                users: [myUsername, fromUsername],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Aika notification zuwa wanda ya aika request
            await db.collection('notifications').add({
                to: fromUsername,
                from: myUsername,
                type: 'friend_accepted',
                message: `${myUsername} accepted your Friend Request!`,
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update stats - kara friend count
            await db.collection('users').doc(myUsername).update({
                friendCount: firebase.firestore.FieldValue.increment(1)
            });
            await db.collection('users').doc(fromUsername).update({
                friendCount: firebase.firestore.FieldValue.increment(1)
            });
        }

        // Canja status na request
        await db.collection('friendRequests').doc(requestId).update({
            status: accept ? 'accepted' : 'rejected'
        });

        // Goge notification din
        const notifQuery = await db.collection('notifications')
            .where('requestId', '==', requestId)
            .get();
        notifQuery.forEach(doc => doc.ref.delete());

    } catch (err) {
        console.error('Response kuskure:', err);
    }
}

// ============================================================
// NOTIFICATIONS SYSTEM - Real-time
// ============================================================
function listenToNotifications() {
    const myUsername = localStorage.getItem('nexus_user_session');
    if (!myUsername) return;

    // GYARAN: cire 'read'=='false' filter domin ya kaucewa buƙatar
    // composite index (wanda ke sa listener ya fāɗi cikin shiru) —
    // yanzu ana tace unread a JS bayan an karɓi data.
    db.collection('notifications')
        .where('to', '==', myUsername)
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            const unreadDocs = snapshot.docs.filter(d => d.data().read === false);
            const count = unreadDocs.length;

            // Nuna count a badge
            const badge = document.getElementById('notif-badge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }

            // Render notifications
            renderNotifications(unreadDocs);
        }, err => console.error('Notification listener error:', err));
}

function renderNotifications(docs) {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    container.innerHTML = '';

    if (docs.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">Babu sabon notification</p>';
        return;
    }

    docs.forEach(doc => {
        const notif = doc.data();
        
        let actionHTML = '';
        if (notif.type === 'friend_request') {
            actionHTML = `
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button onclick="respondToRequest('${notif.requestId}', '${notif.from}', true)" 
                        style="flex:1; padding:8px; background:#fde08d; color:#000; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
                        ✅ Karɓa
                    </button>
                    <button onclick="respondToRequest('${notif.requestId}', '${notif.from}', false)"
                        style="flex:1; padding:8px; background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:8px; cursor:pointer;">
                        ❌ Ki
                    </button>
                </div>`;
        }

        container.insertAdjacentHTML('beforeend', `
            <div style="padding:15px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; gap:5px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#00f2fe,#7000ff); flex-shrink:0;"></div>
                    <div>
                        <p style="color:#fff; font-size:13px; margin:0;">${notif.message}</p>
                        <span style="color:#666; font-size:10px;">Yanzu</span>
                    </div>
                </div>
                ${actionHTML}
            </div>
        `);
    });
}

// Fara listening idan page ta loda
listenToNotifications();



            // ============================================================
// FOLLOW SYSTEM - Complete
// ============================================================
async function initFollowButton() {
    const myUsername = localStorage.getItem('nexus_user_session');
    const urlParams = new URLSearchParams(window.location.search);
    const profileUser = urlParams.get('user') || myUsername;
    
    // Idan nake kallon profile na kaina, boye follow button, nuna Edit Profile a maimako
    if (myUsername === profileUser) {
        document.getElementById('follow-btn').style.display = 'none';
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) editBtn.style.display = 'flex';
        // own profile: no Message button (nobody messages themselves); Share + QR instead
        const cb = document.getElementById('contact-btn'); if (cb) cb.style.display = 'none';
        ['shareProfileBtn', 'qrProfileBtn'].forEach(function (id) { const b = document.getElementById(id); if (b) b.style.display = 'flex'; });
        return;
    }

    // Duba ko ina following shi riga
    const followerSnap = await db.collection('follows')
        .where('follower', '==', myUsername)
        .get();
    const existingFollow = followerSnap.docs.some(d => d.data().following === profileUser);

    const btn = document.getElementById('follow-btn');
    if (existingFollow) {
        btn.textContent = 'Following';
        btn.dataset.state = 'following';
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.color = '#fff';
    } else {
        btn.textContent = 'Follow';
        btn.dataset.state = 'none';
    }
}

// Duba ko wani friends doc ya rigaya ya wanzu tsakanin mutane biyu
async function friendsDocExists(userA, userB) {
    const snap = await db.collection('friends')
        .where('users', 'array-contains', userA)
        .get();
    let found = null;
    snap.forEach(doc => {
        if (doc.data().users.includes(userB)) found = doc;
    });
    return found;
}

async function toggleFollow() {
    const myUsername = localStorage.getItem('nexus_user_session');
    const urlParams = new URLSearchParams(window.location.search);
    const profileUser = urlParams.get('user') || myUsername;
    const btn = document.getElementById('follow-btn');

    if (!myUsername || myUsername === profileUser) return;

    btn.disabled = true;
    btn.style.opacity = '0.5';

    try {
        if (btn.dataset.state === 'following') {
            // === UNFOLLOW ===
            // GYARAN: query mai filter guda ɗaya kawai (babu buƙatar composite index)
            const myFollowsSnap = await db.collection('follows')
                .where('follower', '==', myUsername)
                .get();
            const toDelete = myFollowsSnap.docs.filter(d => d.data().following === profileUser);
            for (const doc of toDelete) { await doc.ref.delete(); }

            // Rage follower count na profileUser
            await db.collection('users').doc(profileUser).update({
                followerCount: firebase.firestore.FieldValue.increment(-1)
            });

            // ← GYARAN: Rage followingCount na myUsername
            await db.collection('users').doc(myUsername).set({
                followingCount: firebase.firestore.FieldValue.increment(-1)
            }, { merge: true });

            // Duba ko sun kasance mutual (friends) - idan haka, rage friends count
            // GYARAN: query mai filter guda ɗaya kawai
            const theirFollowsSnap = await db.collection('follows')
                .where('follower', '==', profileUser)
                .get();
            const wasMutual = theirFollowsSnap.docs.some(d => d.data().following === myUsername);

            if (wasMutual) {
                await db.collection('users').doc(profileUser).update({
                    friendCount: firebase.firestore.FieldValue.increment(-1)
                });
                await db.collection('users').doc(myUsername).update({
                    friendCount: firebase.firestore.FieldValue.increment(-1)
                });

                // ← SABON GYARA: Goge ainihin 'friends' document idan akwai
                const existingFriendDoc = await friendsDocExists(myUsername, profileUser);
                if (existingFriendDoc) {
                    await existingFriendDoc.ref.delete();
                }
            }

            btn.textContent = 'Follow';
            btn.dataset.state = 'none';
            btn.style.background = '#000';
            btn.style.color = '#fff';
            btn.style.border = '1px solid rgba(255,255,255,0.2)';

        } else {
            // === FOLLOW ===
            await db.collection('follows').add({
                follower: myUsername,
                following: profileUser,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Kara follower count na profileUser
            await db.collection('users').doc(profileUser).update({
                followerCount: firebase.firestore.FieldValue.increment(1)
            });

            // ← GYARAN: Kara followingCount na myUsername
            await db.collection('users').doc(myUsername).set({
                followingCount: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });

            // Duba ko profileUser yana following myUsername riga (mutual check)
            // ← MUHIMMIN GYARA: query mai filter guda ɗaya kawai (babu buƙatar
            // composite index) — a baya wannan query yana amfani da filters
            // guda biyu tare, wanda ke fāɗuwa cikin shiru kuma yana hana
            // notification ɗin "X ya fara bin ka" gudana gaba ɗaya.
            const theirFollowsSnap = await db.collection('follows')
                .where('follower', '==', profileUser)
                .get();
            const isMutual = theirFollowsSnap.docs.some(d => d.data().following === myUsername);

            if (isMutual) {
                await db.collection('users').doc(profileUser).update({
                    friendCount: firebase.firestore.FieldValue.increment(1)
                });
                await db.collection('users').doc(myUsername).update({
                    friendCount: firebase.firestore.FieldValue.increment(1)
                });

                // ← SABON GYARA: Ƙirƙiri ainihin 'friends' document (idan babu shi tuni,
                // misali daga tsohon friend-request), don Friends tab a chats.html ya gan su
                const existingFriendDoc = await friendsDocExists(myUsername, profileUser);
                if (!existingFriendDoc) {
                    await db.collection('friends').add({
                        users: [myUsername, profileUser],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                await db.collection('notifications').add({
                    to: profileUser,
                    from: myUsername,
                    type: 'new_friend',
                    message: `${myUsername} followed you back — you're friends now!`,
                    read: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await db.collection('notifications').add({
                    to: profileUser,
                    from: myUsername,
                    type: 'new_follower',
                    message: `${myUsername} started following you`,
                    read: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            btn.textContent = 'Following';
            btn.dataset.state = 'following';
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.color = '#fff';
        }

    } catch (err) {
        console.error('Follow kuskure:', err);
        alert('Kuskure: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}
            
  
            
// ============================================================
// LOAD REAL FOLLOWER COUNT (live, from the follows collection)
// ============================================================
let followersUnsub = null;
function loadFollowerCount() {
    const el = document.getElementById('stats-followers-count');
    if (!el) return;
    const me = localStorage.getItem('nexus_user_session');
    const profileUser = new URLSearchParams(window.location.search).get('user') || me;
    if (!profileUser) return;
    if (followersUnsub) { followersUnsub(); followersUnsub = null; }
    let fallbackUsed = false;
    followersUnsub = db.collection('follows').where('following', '==', profileUser).onSnapshot(function (snap) {
        el.textContent = snap.size.toLocaleString();
    }, function (err) {
        console.warn('Followers count fallback:', err && err.message);
        if (fallbackUsed) return; fallbackUsed = true;
        db.collection('users').doc(profileUser).get().then(function (d) {
            el.textContent = ((d.exists && d.data().followerCount) || 0).toLocaleString();
        }).catch(function () {});
    });
}

// ============================================================
// LOAD REAL FRIEND COUNT DAGA FIREBASE
// ============================================================
function loadFriendCount() {
    const urlParams = new URLSearchParams(window.location.search);
    const myUsername = localStorage.getItem('nexus_user_session');
    const profileUser = urlParams.get('user') || myUsername;

    db.collection('users').doc(profileUser)
        .onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                // Friends count
                document.getElementById('stats-friends-count').textContent =
                    (data.friendCount || 0).toLocaleString();
            }
        });
}


            function loadFollowingCount(profileUser) {
    db.collection('users').doc(profileUser)
        .onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('stats-friends-count').textContent =
                    (data.followingCount || 0).toLocaleString();
            }
        });
            }


            function toggleImmersive(card) {
    if (event && event.target.closest('.interaction-bar')) return;
    if (event && event.target.closest('.header-actions')) return;
    if (event && event.target.closest('a')) return;

    const video = card.querySelector('video');
    const footer = document.getElementById('instaFooter');

    if (!card.classList.contains('immersive-mode')) {
        const savedTime = video ? video.currentTime : 0;
        card.classList.add('immersive-mode');
        if (footer) footer.classList.add('footer-hidden');
        
        
        if (video) {
            video.style.cssText = `
                position: fixed !important;
                top: 0 !important; left: 0 !important;
                width: 100vw !important; height: 100vh !important;
                max-height: none !important;
                object-fit: cover !important; border-radius: 0 !important;
                z-index: 4999 !important; background: #000 !important; margin: 0 !important;
            `;
            video.currentTime = savedTime;
            video.muted = false;
            setTimeout(() => { video.play().catch(() => {}); }, 50);
        }

        if (!card.querySelector('.immersive-back-btn')) {
            const backBtn = document.createElement('div');
            backBtn.className = 'immersive-back-btn';
            backBtn.innerHTML = `<i class="fa-solid fa-chevron-left"></i>`;
            backBtn.style.cssText = `
                position: fixed; top: 15px; left: 15px; width: 36px; height: 36px;
                background: rgba(0,0,0,0.6); border-radius: 50%; display: flex;
                align-items: center; justify-content: center; color: white; font-size: 16px;
                z-index: 9999; cursor: pointer; backdrop-filter: blur(10px); 
                border: 1px solid rgba(255,255,255,0.3);
            `;
            backBtn.onclick = function(e) { e.stopPropagation(); exitImmersive(card); };
            document.body.appendChild(backBtn);
        }

        history.pushState({ immersive: true }, '');
        window.onpopstate = function() { exitImmersive(card); };

    } else {
        exitImmersive(card);
    }
}

function exitImmersive(card) {
    const video = card.querySelector('video');
    const footer = document.getElementById('instaFooter');
    const savedTime = video ? video.currentTime : 0;

    card.classList.remove('immersive-mode');

    if (footer) footer.classList.remove('footer-hidden');

    const backBtn = document.querySelector('.immersive-back-btn');
    if (backBtn) backBtn.remove();

    if (video) {
        video.style.cssText = '';
        video.currentTime = savedTime;
        setTimeout(() => { video.play().catch(() => {}); }, 50);
    }
    window.onpopstate = null;
}


    function getProfileUser() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('user') || localStorage.getItem('nexus_user_session') || '';
}

async function handleChatBtn() {
    const profileUser = getProfileUser();
    
    // Duba ko user ɗin yana da products a Firebase
    try {
        const snap = await db.collection('products')
            .where('vendorId', '==', profileUser)
            .limit(1)
            .get();

        if (snap.empty && !window.__meIsPro) {
            // Babu products — je personal chat kai tsaye
            window.location.href = `chat-interior.html?with=${profileUser}`;
        } else {
            // Yana da products — nuna dropdown
            const dropdown = document.getElementById('chat-dropdown');
            const btn = document.getElementById('contact-btn');
            const rect = btn.getBoundingClientRect();
            
            dropdown.style.display = 'block';
            dropdown.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            dropdown.style.left = rect.left + 'px';

            // Rufe idan an danna waje
            setTimeout(() => {
                document.addEventListener('click', function closeDD(e) {
                    if (!dropdown.contains(e.target) && e.target !== btn) {
                        dropdown.style.display = 'none';
                        document.removeEventListener('click', closeDD);
                    }
                });
            }, 100);
        }
    } catch(err) {
        console.error(err);
        window.location.href = `chat-interior.html?with=${profileUser}`;
    }
}

function showToast(message, isError = false) {
    let toast = document.getElementById('nexus-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'nexus-toast';
        toast.className = 'nexus-toast';
        document.body.appendChild(toast);
    }
    toast.style.borderColor = isError ? '#ff4d6d' : '#fde08d';
    toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i><span>${message}</span>`;
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => toast.classList.remove('show'), 2500);
        }

    async function followFromStory() {
    const myUsername = localStorage.getItem('nexus_user_session');
    const urlParams = new URLSearchParams(window.location.search);
    const profileUser = urlParams.get('user') || viewedProfileUser.username;

    await db.collection('follows').add({
        follower: myUsername, following: profileUser,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection('users').doc(profileUser).update({
        followerCount: firebase.firestore.FieldValue.increment(1)
    });
    document.getElementById('storyFollowBtn').style.display = 'none';
    if (typeof initFollowButton === 'function') initFollowButton();
            }

// ===== Story share sheet (Instagram-style) =====
let meShareFriends = null, meShareSel = null;
function meStoryShareText() {
    const nm = (viewedProfileUser && (viewedProfileUser.fullName || viewedProfileUser.username)) || 'a story';
    return nm + "'s story on Nexus";
}
function shareStory() {
    clearTimeout(storyTimer);
    const ov = document.getElementById('mxShare'); if (!ov) return;
    meShareSel = null;
    const q = document.getElementById('mxShareQ'); if (q) q.value = '';
    meShareRender();
    meShareSync();
    ov.classList.add('on');
    if (!meShareFriends) meShareLoad();
}
function meCloseShare() {
    const ov = document.getElementById('mxShare'); if (ov) ov.classList.remove('on');
    if (document.getElementById('storyViewerOverlay').style.display !== 'none') {
        clearTimeout(storyTimer);
        storyTimer = setTimeout(function () { nextStory(); }, STORY_DURATION);
    }
}
async function meShareLoad() {
    const grid = document.getElementById('mxShareGrid');
    grid.innerHTML = '<div class="mxs-empty">Loading…</div>';
    const me = localStorage.getItem('nexus_user_session');
    const list = [];
    try {
        const snap = await db.collection('friends').where('users', 'array-contains', me).get();
        const names = [];
        snap.forEach(function (d) { (d.data().users || []).forEach(function (u) { if (u !== me && names.indexOf(u) < 0) names.push(u); }); });
        await Promise.all(names.slice(0, 80).map(async function (u) {
            let name = u, pic = '';
            try { const ud = await db.collection('users').doc(u).get(); if (ud.exists) { const x = ud.data(); name = x.fullName || x.username || u; pic = x.userProfilePic || ''; } } catch (e) {}
            list.push({ u: u, name: name, pic: pic });
        }));
    } catch (e) {}
    list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    meShareFriends = list;
    meShareRender();
}
function meShareInitials(n) { return (String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('') || '?').toUpperCase(); }
function meShareRender() {
    const grid = document.getElementById('mxShareGrid'); if (!grid) return;
    if (!meShareFriends) return;
    const q = String((document.getElementById('mxShareQ') || {}).value || '').trim().toLowerCase();
    const items = meShareFriends.filter(function (f) { return !q || f.name.toLowerCase().indexOf(q) > -1 || f.u.toLowerCase().indexOf(q) > -1; });
    grid.innerHTML = '';
    if (!items.length) {
        const e = document.createElement('div'); e.className = 'mxs-empty';
        e.textContent = meShareFriends.length ? 'No matches' : 'Add friends to send stories to them';
        grid.appendChild(e); return;
    }
    items.forEach(function (f) {
        const b = document.createElement('button'); b.type = 'button';
        b.className = 'mxs-item' + (meShareSel === f.u ? ' sel' : '');
        const av = document.createElement('div'); av.className = 'nx-av'; av.style.setProperty('--nx-av', '64px');
        const im = document.createElement('img'); im.alt = '';
        av.appendChild(im);
        meFillAvatar(im, f.pic, f.name);
        const ck = document.createElement('span'); ck.className = 'mxs-ck'; ck.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#050505" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
        const nm = document.createElement('span'); nm.className = 'mxs-nm'; nm.textContent = f.name;
        const box = document.createElement('div'); box.className = 'mxs-av'; box.appendChild(av); box.appendChild(ck);
        b.appendChild(box); b.appendChild(nm);
        b.onclick = function () { meShareSel = (meShareSel === f.u) ? null : f.u; meShareRender(); meShareSync(); };
        grid.appendChild(b);
    });
}
function meShareSync() {
    const on = !!meShareSel;
    const bar = document.getElementById('mxShareSend'), row = document.getElementById('mxShareApps');
    if (bar) bar.style.display = on ? 'flex' : 'none';
    if (row) row.style.display = on ? 'none' : 'flex';
}
function meShareLink() { return meProfileUrl(); }
function meShareCopy() { meCopyProfileLink(); meCloseShare(); }
async function meShareNative() {
    const url = meShareLink();
    try { if (navigator.share) { await navigator.share({ title: meStoryShareText(), text: meStoryShareText(), url: url }); meCloseShare(); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    meShareCopy();
}
function meShareTo(kind) {
    const url = encodeURIComponent(meShareLink()), txt = encodeURIComponent(meStoryShareText());
    const map = {
        whatsapp: 'https://wa.me/?text=' + txt + '%20' + url,
        telegram: 'https://t.me/share/url?url=' + url + '&text=' + txt,
        x: 'https://twitter.com/intent/tweet?text=' + txt + '&url=' + url,
        facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + url
    };
    window.open(map[kind], '_blank', 'noopener');
}
function meShareSendChat() {
    if (!meShareSel) return;
    const note = String((document.getElementById('mxShareMsg') || {}).value || '').trim();
    const text = (note ? note + '\n' : '') + meStoryShareText() + ': ' + meShareLink();
    try { localStorage.setItem('nx_share_draft_' + meShareSel, text); } catch (e) {}
    const to = 'chat-interior.html?with=' + encodeURIComponent(meShareSel);
    closeStoryViewer();
    meCloseShare();
    if (window.__go) window.__go(to);
    else if (window.NexusRouter && NexusRouter.navigateTo) NexusRouter.navigateTo(to);
    else window.location.href = to;
}


    function likeStory() {
    const hb = document.getElementById('sfHeart');
    const on = hb && !hb.classList.contains('liked');
    if (hb) { hb.classList.toggle('liked', on); }
    if (on) showToast("Liked");
}

function storyReplyChanged() {
    const i = document.getElementById('storyReplyInput'), p = document.getElementById('sfPill');
    if (i && p) p.classList.toggle('typing', !!i.value.trim());
}
function storyReplyFocus() { clearTimeout(storyTimer); }
function storyReplyBlur() {
    const i = document.getElementById('storyReplyInput');
    const ov = document.getElementById('storyViewerOverlay');
    if (i && !i.value.trim() && ov && ov.style.display !== 'none') { clearTimeout(storyTimer); storyTimer = setTimeout(() => nextStory(), STORY_DURATION); }
}

function sendStoryReply() {
    const input = document.getElementById('storyReplyInput');
    const msg = input.value.trim();
    if (!msg) return;
    showToast("Message sent");
    input.value = '';
    storyReplyChanged();
    input.blur();
}

    function openStoryOptionsMenu(event) {
    event.stopPropagation();
    clearTimeout(storyTimer);
    document.querySelectorAll('.highlight-menu').forEach(m => m.remove());

    const myUsername = localStorage.getItem('nexus_user_session');
    const urlParams = new URLSearchParams(window.location.search);
    const profileUser = urlParams.get('user') || viewedProfileUser.username;
    const isOwn = profileUser === myUsername;

    const menu = document.createElement('div');
    menu.className = 'highlight-menu';
    menu.innerHTML = isOwn
        ? `<button onclick="editHighlightPrompt('${storyItems[storyIndex].id}'); this.parentElement.remove();"><i class="fa-solid fa-pen"></i>&nbsp; Edit</button>
           <button class="danger" onclick="deleteHighlight('${storyItems[storyIndex].id}'); closeStoryViewer();"><i class="fa-solid fa-trash"></i>&nbsp; Delete</button>`
        : `<button onclick="this.parentElement.remove();"><i class="fa-solid fa-flag"></i>&nbsp; Report</button>`;

    document.body.appendChild(menu);
    const rect = event.target.getBoundingClientRect();
    menu.style.top = (rect.bottom + 8) + 'px';
    menu.style.right = '15px';
    menu.style.left = 'auto';

    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
                storyTimer = setTimeout(() => closeStoryViewer(), STORY_DURATION);
            }
        });
    }, 50);
    }


// ============================================================
// PROFILE INFO (design upgrade — additive, read-only)
// Fills #mx-info under the bio: merges the user's own profile details with the
// PUBLIC part of providers/{username}. Private data is never read here.
// ============================================================
let meAboutToken = 0;
function meEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function meIc(cls) { const i = document.createElement('i'); i.className = cls; return i; }
function meGetRtdb() {
    try { return firebase.database(); } catch (e) {}
    try { return firebase.app().database('https://oryzon-50ea4-default-rtdb.firebaseio.com'); } catch (e) {}
    return null;
}
function meFmtTime(s) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); if (!m) return '';
    let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + m[2] + ' ' + ap;
}
function meDaysLabel(list) {
    const ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const on = ORDER.map(d => (list || []).some(x => String(x).toLowerCase().replace(/s$/, '') === d));
    const n = on.filter(Boolean).length;
    if (!n) return '';
    if (n === 7) return 'Every day';
    const out = []; let i = 0;
    while (i < 7) {
        if (!on[i]) { i++; continue; }
        let j = i; while (j + 1 < 7 && on[j + 1]) j++;
        out.push(j - i >= 2 ? SHORT[i] + '–' + SHORT[j] : SHORT.slice(i, j + 1).join(', '));
        i = j + 1;
    }
    return out.join(', ');
}
function meIsAvailable(p) {
    if (p.online === false) return false;
    const now = new Date();
    const key = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    if (p.blockedDates && p.blockedDates[key]) return false;
    const sch = Array.isArray(p.schedule) ? p.schedule : (p.schedule ? Object.values(p.schedule) : []);
    if (sch.length) {
        const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
        if (!sch.some(x => String(x).toLowerCase().replace(/s$/, '') === today)) return false;
    }
    return true;
}
function meOpenServices(u) {
    try {
        const P = window.parent;
        if (P && P !== window && P.openProfileSheet) {
            const show = function () {
                // same layering the inbox uses, so the pro sheet is not left under another overlay
                try {
                    const ps = P.document.getElementById('profile-sheet-overlay');
                    if (ps) {
                        ps.style.zIndex = '10650';
                        if (!ps.__npZObs) {
                            ps.__npZObs = new P.MutationObserver(function () { if (ps.style.display === 'none' && ps.style.zIndex === '10650') ps.style.zIndex = '7500'; });
                            ps.__npZObs.observe(ps, { attributes: true, attributeFilter: ['style'] });
                        }
                    }
                } catch (e) {}
                P.openProfileSheet(u);
            };
            const ov = P.document.getElementById('me-overlay');
            if (P.npCloseOverlay) P.npCloseOverlay('me');
            // closing is asynchronous (history.back) — open the sheet once this profile is really gone
            let tries = 0;
            const wait = function () {
                if (!ov || ov.style.display === 'none' || ++tries > 25) show(); else setTimeout(wait, 40);
            };
            wait();
            return;
        }
    } catch (e) {}
    window.location.href = 'services.html';
}

// ============================================================
// PROFESSIONS — one list merged from every place a profession can come from:
//   1) the profile's own Occupation field (comma separated allowed)
//   2) the services provider category (providers/{username})
//   3) user.professions[] (manual / future writers)
//   4) detected from the vendor's marketplace products (products.vendorId)
// Same profession from two places is shown once. Computed at view time, so it
// is always current and never stored twice.
// ============================================================
function meTitleCase(s) {
    return String(s).replace(/\s+/g, ' ').trim().split(' ').map(function (w) {
        if (!w) return w;
        if (w !== w.toLowerCase() && w !== w.toUpperCase()) return w;          // keep "iOS", "McDonald"
        if (/^(and|of|at|for|the|in|to|&)$/i.test(w)) return w.toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ').replace(/^./, function (c) { return c.toUpperCase(); });
}
function meProfKey(s) {
    return String(s).toLowerCase().replace(/^(professional|certified|licensed|expert|senior|junior)\s+/, '').replace(/[^a-z0-9]/g, '').replace(/s$/, '');
}
function meSplitProf(v) {
    return String(v == null ? '' : v).split(/[,;|\/&]+|\s+and\s+/i).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 1 && x.length <= 40; });
}
function meVendorLabel(c) {
    c = String(c || '').trim();
    if (!c || c.length > 30) return '';
    if (/(vendor|seller|shop|store|maker|trader|dealer|supplier|boutique)$/i.test(c)) return meTitleCase(c);
    return meTitleCase(c) + ' Vendor';
}
async function meCollectProfessions(user, p, profileUser) {
    const out = [], seen = {};
    const push = function (raw, src) {
        meSplitProf(raw).forEach(function (r) {
            const k = meProfKey(r); if (!k || seen[k]) return;
            seen[k] = 1; out.push({ label: meTitleCase(r), source: src });
        });
    };
    push(user && user.occupation, 'profile');
    if (p) {
        const food = p.pricing && p.pricing.unit === 'per item';   // food vendors list dishes, not professions
        const sv = [];
        if (!food) {
            if (p.subcategory) sv.push(p.subcategory);
            if (Array.isArray(p.servicesOffered)) p.servicesOffered.slice(0, 3).forEach(function (x) { sv.push(x); });
        }
        if (sv.length) sv.forEach(function (c) { push(c, 'services'); });
        else (Array.isArray(p.categories) ? p.categories : [p.categoryLabel || p.category]).forEach(function (c) { push(c, 'services'); });
    }
    (Array.isArray(user && user.professions) ? user.professions : []).forEach(function (c) { push(c && c.label ? c.label : c, 'profile'); });
    try {
        const snap = await db.collection('products').where('vendorId', '==', profileUser).limit(30).get();
        const cats = {};
        snap.forEach(function (d) {
            const x = d.data() || {};
            const c = x.categoryLabel || x.category || x.productType || x.type;
            if (c && typeof c === 'string') cats[c.trim().toLowerCase()] = (cats[c.trim().toLowerCase()] || 0) + 1;
        });
        Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; }).slice(0, 3).forEach(function (c) {
            const l = meVendorLabel(c); if (l) push(l, 'marketplace');
        });
    } catch (e) {}
    return out;
}
// true when a bio only restates the professions already shown in the headline
function meBioRedundant(text, profs) {
    if (!profs || !profs.length) return false;
    const stop = {professional:1,expert:1,certified:1,experienced:1,skilled:1,licensed:1,best:1,top:1,quality:1,reliable:1,trusted:1,the:1,a:1,an:1,and:1,of:1,in:1,for:1,with:1,i:1,am:1,is:1,works:1,as:1,service:1,services:1};
    const norm = function (w) {
        let x = w;
        for (let i = 0; i < 2; i++) { const y = x.replace(/(ations|ation|ators|ator|ings|ing|ists|ist|ians|ian|ments|ment|ers|er|ors|or|ics|ic|als|al|ed|es|s|e)$/, ''); if (y.length < 3) break; x = y; }
        return x;
    };
    const have = {};
    profs.forEach(function (x) { String(x.label).toLowerCase().split(/[^a-z]+/).forEach(function (w) { if (w) have[norm(w)] = 1; }); });
    const words = String(text).toLowerCase().split(/[^a-z]+/).filter(function (w) { return w && !stop[w]; });
    return words.length > 0 && words.every(function (w) { return have[norm(w)]; });
}
function meHash(s) { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function meJoinNice(a) { return a.length <= 1 ? (a[0] || '') : a.length === 2 ? a[0] + ' and ' + a[1] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function meArticle(w) { return /^[aeiou]/i.test(w) ? 'an' : 'a'; }
// Varied, factual one-liner used only when the user wrote no bio. Never stored.
function meGenerateBio(profs, user, p, profileUser) {
    if (!profs.length) return '';
    const names = profs.slice(0, 3).map(function (x) { return x.label.toLowerCase(); });
    const city = String((p && p.city) || (user && user.city) || '').trim();
    const org = String((p && p.businessName) || (user && user.workplace) || '').trim();
    if (!city && !org) return '';        // would only repeat the headline
    const list = meJoinNice(names);
    const cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    const T = [];
    T.push(function () { return cap(list) + (city ? ' based in ' + city : '') + (org ? ', working with ' + org : '') + '.'; });
    if (city) T.push(function () { return city + '-based ' + list + (org ? ' at ' + org : '') + '.'; });
    T.push(function () { return 'Works as ' + meArticle(names[0]) + ' ' + list + (org ? ' at ' + org : '') + (city ? ' in ' + city : '') + '.'; });
    if (org) T.push(function () { return cap(list) + ' at ' + org + (city ? ', ' + city : '') + '.'; });
    return T[meHash(profileUser) % T.length]();
}

async function meRenderAbout(user, profileUser) {
    const token = ++meAboutToken;
    user = user || {};
    const info = document.getElementById('mx-info'), book = document.getElementById('mx-book-btn');
    if (!info) return;
    info.textContent = ''; info.style.display = 'none'; if (book) book.style.display = 'none';
    const bioEl = document.getElementById('mx-bio');
    if (bioEl) { bioEl.textContent = ''; bioEl.style.display = 'none'; }
    const profEl0 = document.getElementById('mx-prof'); if (profEl0) { profEl0.textContent = ''; profEl0.style.display = 'none'; }
    if (window.__meLocked) return;
    const me = localStorage.getItem('nexus_user_session');
    const own = !!me && me === profileUser;

    let p = null;
    try {
        const rt = meGetRtdb();
        if (rt) p = (await rt.ref('providers/' + profileUser).once('value')).val();
    } catch (e) { console.warn('Business info unavailable:', e && e.message); }
    if (token !== meAboutToken) return;
    if (p && p.status !== 'approved') p = null;
    window.__meIsPro = !!p;

    // professions headline (gold-slash title) + generated bio when the user wrote none
    const profs = await meCollectProfessions(user, p, profileUser);
    if (token !== meAboutToken) return;
    const profEl = document.getElementById('mx-prof');
    if (profEl) {
        profEl.textContent = '';
        profEl.classList.remove('open');
        const MAXV = 4;
        profs.forEach(function (x, i) {
            if (i > 0) profEl.appendChild(meEl('i', 'mx-sl', '/'));
            const s = meEl('span', 'mx-pf' + (i >= MAXV ? ' mx-extra' : ''), x.label);
            if (i >= MAXV) s.style.display = 'none';
            profEl.appendChild(s);
        });
        if (profs.length > MAXV) {
            const more = meEl('button', 'mx-more', '+' + (profs.length - MAXV) + ' more');
            more.type = 'button';
            more.onclick = function () {
                profEl.querySelectorAll('.mx-extra').forEach(function (e) { e.style.display = ''; });
                profEl.querySelectorAll('.mx-extra').forEach(function (e) { if (e.previousSibling && e.previousSibling.className === 'mx-sl') e.previousSibling.style.display = ''; });
                more.remove();
            };
            // hide the slash that belongs to a collapsed profession
            profEl.querySelectorAll('.mx-extra').forEach(function (e) { if (e.previousSibling && e.previousSibling.className === 'mx-sl') e.previousSibling.style.display = 'none'; });
            profEl.appendChild(more);
        }
        profEl.style.display = profs.length ? '' : 'none';
    }
    if (bioEl) {
        // own bio first, then the services-form bio; skip any text that only repeats the profession headline
        let b = String(user.bio || '').trim();
        if (!b || meBioRedundant(b, profs)) b = (p && String(p.bio || '').trim()) || '';
        if (b && meBioRedundant(b, profs)) b = '';
        if (!b) b = meGenerateBio(profs, user, p, profileUser);
        if (b) { bioEl.textContent = b; bioEl.style.display = ''; }
    }

    const T = v => (v == null ? '' : String(v).trim());
    const items = []; // {icon, text, kind: 'short' | 'long' | 'link', href}
    const add = (icon, text, kind, href) => { text = T(text); if (text) items.push({ icon, text, kind: kind || 'short', href }); };

    // work: employer / business name (the profession names are in the headline above)
    const org = T(p && p.businessName) || T(user.workplace);
    if (org) add('fa-solid fa-briefcase', (profs.length ? 'Works at ' : '') + org, 'long');
    add('fa-solid fa-graduation-cap', user.school);
    add('fa-solid fa-location-dot', p ? [p.area, p.city].filter(Boolean).join(', ') || [user.neighborhood, user.city].filter(Boolean).join(', ') : [user.neighborhood, user.city].filter(Boolean).join(', '));
    if (p) {
        const tally = Object.values(p.ratingTally || {}).filter(v => typeof v === 'number');
        if (tally.length) add('fa-solid fa-star', (tally.reduce((x, y) => x + y, 0) / tally.length).toFixed(1) + ' · ' + tally.length + (tally.length === 1 ? ' review' : ' reviews'), 'short', null, 'gold');
        const rs = p.responseStats;
        if (rs && rs.n >= 3 && rs.totalMs > 0) {
            const min = rs.totalMs / rs.n / 60000;
            add('fa-solid fa-bolt', 'Replies in ' + (min < 60 ? '~' + Math.max(1, Math.round(min)) + ' min' : min < 1440 ? '~' + Math.round(min / 60) + ' hr' : '~' + Math.round(min / 1440) + ' d'));
        }
    }
    // links (shown only when present on the profile or the business)
    const pick = k => T(user[k]) || T(p && p[k]);
    const site = pick('website');
    if (site) add('fa-solid fa-link', site.replace(/^https?:\/\//i, '').replace(/\/$/, ''), 'link', /^https?:/i.test(site) ? site : 'https://' + site);
    [['instagram', 'fa-brands fa-instagram', v => '@' + v.replace(/^@/, ''), v => 'https://instagram.com/' + v.replace(/^@/, '')],
     ['tiktok', 'fa-brands fa-tiktok', v => '@' + v.replace(/^@/, ''), v => 'https://tiktok.com/@' + v.replace(/^@/, '')],
     ['facebook', 'fa-brands fa-facebook', v => v.replace(/^https?:\/\/(www\.)?facebook\.com\//i, ''), v => /^https?:/i.test(v) ? v : 'https://facebook.com/' + v],
     ['x', 'fa-brands fa-x-twitter', v => '@' + v.replace(/^@/, ''), v => 'https://x.com/' + v.replace(/^@/, '')],
     ['whatsapp', 'fa-brands fa-whatsapp', () => 'WhatsApp', v => 'https://wa.me/' + v.replace(/[^0-9]/g, '')]
    ].forEach(s => { const v = pick(s[0]); if (v) add(s[1], s[2](v), 'link', s[3](v)); });

    (Array.isArray(user.customFields) ? user.customFields : []).forEach(function (f) {
        if (f && f.label && f.value) add('fa-solid fa-circle-info', String(f.label).trim() + ': ' + String(f.value).trim(), 'long');
    });

    if (book && p && !own) { book.onclick = () => meOpenServices(profileUser); book.style.display = 'flex'; }
    if (!items.length) return;

    // pair short items two per row (spaced apart); long / link items take their own row
    let i = 0;
    while (i < items.length) {
        const row = meEl('div', 'mx-irow');
        const it = items[i], nx = items[i + 1];
        const mk = x => {
            const el = meEl(x.href ? 'a' : 'span', 'mx-it' + (x.href ? ' mx-lk' : '') + (x.icon.indexOf('star') > -1 ? ' mx-gold' : ''));
            if (x.href) { el.href = x.href; el.target = '_blank'; el.rel = 'noopener noreferrer'; }
            el.appendChild(meIc(x.icon)); el.appendChild(meEl('span', '', x.text)); return el;
        };
        row.appendChild(mk(it));
        if (it.kind === 'short' && nx && nx.kind === 'short' && (it.text.length + nx.text.length) <= 38) { row.appendChild(mk(nx)); i += 2; } else i += 1;
        info.appendChild(row);
    }
    info.style.display = 'flex';
}

// ============================================================
// SPA INIT / DESTROY — domin router.js (NexusRouter)
// ============================================================
// ============================================================
// READY: buttons/tabs stay hidden until the profile state is known (no flash of stale buttons)
// ============================================================
function meMarkReady() {
    document.querySelectorAll('.mx-actions, .mx-tabs').forEach(function (e) { e.classList.add('mx-on'); });
}

// ============================================================
// PRIVACY: private profile = friends only
// ============================================================
async function meComputeLocked(user, profileUser, own) {
    if (own || !user || !user.isPrivate) return false;
    const me = localStorage.getItem('nexus_user_session');
    if (!me) return true;
    try { return !(await friendsDocExists(me, profileUser)); } catch (e) { return true; }
}
function meApplyLock(locked) {
    const lock = document.getElementById('mx-lock');
    if (lock) lock.style.display = locked ? '' : 'none';
    ['.mx-tabs', '#showcase-area', '#timeline-area', '#highlights-box', '#mx-info', '#mx-bio', '#mx-prof'].forEach(function (q) {
        const el = document.querySelector(q);
        if (!el) return;
        if (locked) { el.setAttribute('data-lk', el.style.display || '-'); el.style.display = 'none'; }
        else if (el.hasAttribute('data-lk')) { const v = el.getAttribute('data-lk'); el.style.display = v === '-' ? '' : v; el.removeAttribute('data-lk'); }
    });
}

// ============================================================
// SHARE PROFILE + QR
// ============================================================
function meProfileUrl() { return new URL('me.html?user=' + encodeURIComponent(getProfileUser()), window.location.href).href; }
async function meShareProfile() {
    const url = meProfileUrl();
    const name = (viewedProfileUser && (viewedProfileUser.fullName || viewedProfileUser.username)) || 'Profile';
    try { if (navigator.share) { await navigator.share({ title: name, text: name + ' on Nexus', url: url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    meCopyProfileLink();
}
function meCopyProfileLink() {
    const url = meProfileUrl();
    const done = function () { showToast('Link copied'); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(done, function () { meCopyFallback(url, done); }); return; } } catch (e) {}
    meCopyFallback(url, done);
}
function meCopyFallback(t, done) {
    const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); done(); } catch (e) { showToast('Could not copy', true); }
    a.remove();
}
function meLoadQrLib() {
    if (window.qrcode) return Promise.resolve();
    return new Promise(function (res, rej) {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
        sc.onload = res; sc.onerror = rej; document.head.appendChild(sc);
    });
}
async function meOpenQr() {
    const url = meProfileUrl();
    const ov = document.getElementById('mxQrOverlay'), box = document.getElementById('mxQrCode');
    document.getElementById('mxQrName').textContent = (viewedProfileUser && (viewedProfileUser.fullName || viewedProfileUser.username)) || '';
    document.getElementById('mxQrLink').textContent = url.replace(/^https?:\/\//, '');
    box.textContent = '';
    ov.style.display = 'flex';
    try {
        await meLoadQrLib();
        const q = window.qrcode(0, 'M'); q.addData(url); q.make();
        box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
    } catch (e) { box.textContent = 'QR code unavailable offline'; }
}
function meCloseQr() { document.getElementById('mxQrOverlay').style.display = 'none'; }

function pageInit() {
    { const _me = localStorage.getItem('nexus_user_session'); const _u = new URLSearchParams(window.location.search).get('user'); if (!_u || _u === _me) restoreCachedProfilePhotos(); }

    // Sake saita guard din domin initProfile() ya sake gudana
    // kowane lokaci da aka koma me.html (misali daga wani user
    // profile zuwa wani, ko bayan an bar shafin sannan aka dawo).
    authReadyOnce = false;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startProfileOnce);
    } else {
        startProfileOnce();
    }

    if (authStateUnsub) { authStateUnsub(); authStateUnsub = null; }
    authStateUnsub = firebase.auth().onAuthStateChanged(startProfileOnce);

    if (typeof db !== "undefined") {
        loadUserTimelinePosts();
    } else {
        setTimeout(loadUserTimelinePosts, 1000);
    }
}

function pageDestroy() {
    if (highlightsUnsub) { highlightsUnsub(); highlightsUnsub = null; }
    if (showcaseUnsubscribe) { showcaseUnsubscribe(); showcaseUnsubscribe = null; }
    if (timelineUnsub) { timelineUnsub(); timelineUnsub = null; }
    if (postsCountUnsub) { postsCountUnsub(); postsCountUnsub = null; }
    if (followersUnsub) { followersUnsub(); followersUnsub = null; }
    if (authStateUnsub) { authStateUnsub(); authStateUnsub = null; }
    document.removeEventListener('DOMContentLoaded', startProfileOnce);
}

if (window.NexusRouter) {
    NexusRouter.registerPage('me.html', { init: pageInit, destroy: pageDestroy });
}
pageInit();
