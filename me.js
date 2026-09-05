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
    document.getElementById(imgId).src = type === 'cover' 
        ? "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1200" 
        : "https://api.dicebear.com/7.x/bottts/svg?seed=mamba";
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
const STORY_DURATION = 5000;

async function viewHighlight(id) {
    const urlParams = new URLSearchParams(window.location.search);
    const profileUser = urlParams.get('user') || viewedProfileUser.username;

    const snap = await db.collection('users').doc(profileUser)
        .collection('highlights').orderBy('order', 'asc').get();

    storyItems = [];
    snap.forEach(doc => storyItems.push({ id: doc.id, ...doc.data() }));
    storyIndex = Math.max(0, storyItems.findIndex(item => item.id === id));

    document.getElementById('storyUserAvatar').src =
        viewedProfileUser.userProfilePic || "https://api.dicebear.com/7.x/bottts/svg?seed=" + profileUser;
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

function showStoryAt(index, direction = 'next') {
    clearTimeout(storyTimer);

    const wrap = document.getElementById('storyMediaWrap');
    const oldSlide = wrap.querySelector('.story-slide');

    const item = storyItems[index];
    const isVideo = item.mediaType === 'video';
    const newSlide = document.createElement('div');
    newSlide.className = 'story-slide';
    newSlide.innerHTML = isVideo
        ? `<video src="${item.imageUrl}" autoplay playsinline muted={false}></video>`
        : `<img src="${item.imageUrl}">`;

    // Sabon slide ya fara a waje (dama idan 'next', hagu idan 'prev')
    newSlide.style.transform = direction === 'prev' ? 'translateX(-100%)' : 'translateX(100%)';
    newSlide.style.transition = 'none';
    wrap.appendChild(newSlide);

    // Tilasta reflow domin transition ta yi aiki
    void newSlide.offsetWidth;

    requestAnimationFrame(() => {
        newSlide.style.transition = 'transform 0.3s ease-out';
        newSlide.style.transform = 'translateX(0)';
        if (oldSlide) {
            oldSlide.style.transition = 'transform 0.3s ease-out';
            oldSlide.style.transform = direction === 'prev' ? 'translateX(100%)' : 'translateX(-100%)';
        }
    });

    // Goge tsohon slide BAYAN transition ya gama (300ms)
    if (oldSlide) {
        setTimeout(() => oldSlide.remove(), 320);
    }

    document.getElementById('storyTime').textContent = formatStoryTime(item.timestamp);

    const footer = document.getElementById('storyFooter');
    footer.style.display = item.allowReply === false ? 'none' : 'flex';

    storyTimer = setTimeout(() => nextStory(), STORY_DURATION);

    setupDragListeners(wrap);
}
            
function nextStory() {
    if (storyIndex < storyItems.length - 1) { storyIndex++; showStoryAt(storyIndex, 'next'); }
    else closeStoryViewer();
}

function prevStory() {
    if (storyIndex > 0) { storyIndex--; showStoryAt(storyIndex, 'prev'); }
}

function setupDragListeners(wrap) {
    let startY = 0;
    wrap.ontouchstart = (e) => {
        dragStartX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        dragging = true;
        clearTimeout(storyTimer);
    };
    wrap.ontouchmove = (e) => {
        if (!dragging) return;
        const deltaX = e.touches[0].clientX - dragStartX;
        const deltaY = e.touches[0].clientY - startY;
        const current = wrap.querySelector('.story-slide');
        if (!current) return;
        if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 0) {
            current.style.transform = `translateY(${deltaY}px)`;
        } else {
            current.style.transform = `translateX(${deltaX}px)`;
        }
    };
    wrap.ontouchend = (e) => {
        dragging = false;
        const deltaX = e.changedTouches[0].clientX - dragStartX;
        const deltaY = e.changedTouches[0].clientY - startY;
        const current = wrap.querySelector('.story-slide');
        const threshold = 80;

        if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > threshold) {
            closeStoryViewer();
            return;
        }
        if (deltaX < -threshold && storyIndex < storyItems.length - 1) {
            if (current) current.style.transform = `translateX(-100%)`;
            setTimeout(() => nextStory(), 200);
        } else if (deltaX > threshold && storyIndex > 0) {
            if (current) current.style.transform = `translateX(100%)`;
            setTimeout(() => prevStory(), 200);
        } else {
            if (current) current.style.transform = `translateX(0) translateY(0)`;
            storyTimer = setTimeout(() => nextStory(), STORY_DURATION);
        }
    };
}

function formatStoryTime(ts) {
    if (!ts || !ts.toDate) return '';
    const diffMs = Date.now() - ts.toDate().getTime();
    const hrs = Math.floor(diffMs / 3600000);
    if (hrs < 1) return Math.floor(diffMs / 60000) + "m";
    if (hrs < 24) return hrs + "h";
    return Math.floor(hrs / 24) + "d";
}

function nextStory() {
    if (storyIndex < storyItems.length - 1) { storyIndex++; showStoryAt(storyIndex); }
    else closeStoryViewer();
}

function prevStory() {
    if (storyIndex > 0) { storyIndex--; showStoryAt(storyIndex); }
}

function closeStoryViewer() {
    clearTimeout(storyTimer);
    clearInterval(storyProgressInterval);
    document.getElementById('storyViewerOverlay').style.display = 'none';
    document.getElementById('storyMediaWrap').querySelectorAll('img, video').forEach(el => el.remove());
    window.onpopstate = null;
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
    document.getElementById('epWorkplace').value = u.workplace || '';
    document.getElementById('epSchool').value = u.school || '';
    document.getElementById('epCity').value = u.city || '';
    document.getElementById('epNeighborhood').value = u.neighborhood || '';
    document.getElementById('epOccupation').value = u.occupation || '';
    document.getElementById('editProfileModalOverlay').style.display = 'flex';
}

function closeEditProfileModal() {
    document.getElementById('editProfileModalOverlay').style.display = 'none';
}

async function saveProfileDetails() {
    const myUsername = localStorage.getItem('nexus_user_session');
    if (!myUsername) return;

    const saveBtn = document.getElementById('epSaveBtn');
    const details = {
        workplace: document.getElementById('epWorkplace').value.trim(),
        school: document.getElementById('epSchool').value.trim(),
        city: document.getElementById('epCity').value.trim(),
        neighborhood: document.getElementById('epNeighborhood').value.trim(),
        occupation: document.getElementById('epOccupation').value.trim()
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Ajiyewa...';

    try {
        await db.collection('users').doc(myUsername).set(details, { merge: true });

        // Sabunta local cache domin gaba idan aka sake bude modal ɗin, ya nuna sabon bayani
        viewedProfileUser = { ...(viewedProfileUser || {}), ...details };

        closeEditProfileModal();
        showToast('Profile details saved');
    } catch (e) {
        console.error('Save profile details error:', e);
        showToast('Failed to save. Please try again.', true);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Ajiye';
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
        const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
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
                            <img src="${post.mediaUrl}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
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

// ============================================================
// 4. UPDATE PHOTO TO CLOUDINARY & FIRESTORE (DYNAMIC DOC ID)
// ============================================================
function applyUserToProfile(user) {
    if (!user) return;

    const profilePic = user.userProfilePic || 
        "https://api.dicebear.com/7.x/bottts/svg?seed=" + user.username;
    const coverPhoto = user.userCover || 
        "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1200";
    
    document.getElementById('main-profile-img').src = profilePic;
    document.getElementById('main-cover-img').src = coverPhoto;
    
    localStorage.setItem('userProfilePic', profilePic);
    localStorage.setItem('userCover', coverPhoto);

    // fullName ("Aliyu Abdulkadir") zai fito - ba username ba
    document.getElementById('profile-name-text').textContent = 
        user.fullName || user.username || "User";
        }
// ============================================================
// 5. APPLICATION STATE TO PROFILE UI (USERNAME USED INSTEAD OF FULLNAME)
// ============================================================
function applyUserToProfile(user) {
    if (!user) return;

    const profilePic = user.userProfilePic || 
                       "https://api.dicebear.com/7.x/bottts/svg?seed=" + user.username;
    const coverPhoto = user.userCover || 
                       "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1200";
    
    document.getElementById('main-profile-img').src = profilePic;
    document.getElementById('main-cover-img').src = coverPhoto;
    
    localStorage.setItem('userProfilePic', profilePic);
    localStorage.setItem('userCover', coverPhoto);

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

        // Nemi Firestore document kai tsaye da username a matsayin doc ID
        const userDoc = await db.collection('users').doc(profileUser).get();

        if (userDoc.exists) {
            viewedProfileUser = { uid: userDoc.id, ...userDoc.data() };
        } else {
            // Username yana localStorage amma babu document
            viewedProfileUser = {
                uid: profileUser,
                username: profileUser,
                fullName: profileUser,
                userProfilePic: "https://api.dicebear.com/7.x/bottts/svg?seed=" + profileUser
            };
        }

        // Apply profile UI
       applyUserToProfile(viewedProfileUser);

        // Loda showcase nan take - a keɓe domin kada wani kuskure ya hana ta
        try {
            switchTab('showcase');
        } catch(e) {
            console.error("Showcase auto-load error:", e);
        }

        try {
            initFollowButton();
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
        if (!isOwnProfile) {
            const coverCam = document.querySelector('.camera-cover-main');
            const profileCam = document.querySelector('.camera-profile-main');
            const verifyBtn = document.getElementById('getVerifiedBtn');
            
            if (coverCam) coverCam.style.style.display = 'none';
            if (profileCam) profileCam.style.display = 'none';
            if (verifyBtn) verifyBtn.style.display = 'none';
        }

    } catch (e) {
        console.error("Profile init error:", e);
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
// UPDATE PHOTO - Profile da Cover
// ============================================================
async function updatePhoto(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const username = localStorage.getItem('nexus_user_session');
    if (!username) return;

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

        const response = await fetch(`${BACKEND_URL}/upload`, {
            method: 'POST',
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
        alert('Kuskure wajen upload: ' + err.message);
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
        return;
    }

    // Duba ko ina following shi riga
    const followerSnap = await db.collection('follows')
        .where('follower', '==', myUsername)
        .get();
    const existingFollow = followerSnap.docs.some(d => d.data().following === profileUser);

    const btn = document.getElementById('follow-btn');
    if (existingFollow) {
        btn.textContent = 'FOLLOWING';
        btn.dataset.state = 'following';
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.color = '#fff';
    } else {
        btn.textContent = 'FOLLOW';
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

            btn.textContent = 'FOLLOW';
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

            btn.textContent = 'FOLLOWING';
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
// LOAD REAL FOLLOWER COUNT DAGA FIREBASE
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

        if (snap.empty) {
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

    function shareStory() {
    showToast("Story shared");
    }

    function likeStory() {
    showToast("Liked");
}

function sendStoryReply() {
    const input = document.getElementById('storyReplyInput');
    const msg = input.value.trim();
    if (!msg) return;
    showToast("Message sent");
    input.value = '';
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
// SPA INIT / DESTROY — domin router.js (NexusRouter)
// ============================================================
function pageInit() {
    restoreCachedProfilePhotos();

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
    if (authStateUnsub) { authStateUnsub(); authStateUnsub = null; }
    document.removeEventListener('DOMContentLoaded', startProfileOnce);
}

if (window.NexusRouter) {
    NexusRouter.registerPage('me.html', { init: pageInit, destroy: pageDestroy });
}
pageInit();
