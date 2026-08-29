/* ============================================================
   SOCIAL PAGE MODULE — social.js  (v1.0)
   ------------------------------------------------------------
   An fitar da wannan daga inline <script> na social.html domin
   NexusRouter (router.js) ya iya loda shi ta hanyar loadScriptOnce()
   sannan ya kira initSocialPage()/destroySocialPage() a duk lokacin
   da mutum ya shigo/ya bar social.html ta SPA navigation — ba kawai
   a native full page load ba.

   Yana amfani da GLOBALS din nexus-core.js: currentUser, db,
   storage, analytics, BACKEND_URL. Kada a sake ayyana su a nan.
   ============================================================ */

let userSavedPosts = [];
let tokens = 0.0000;
let scrollTimeout;
let lastVisibleDoc = null;
const FEED_PAGE_SIZE = 12;

      function openPostOverlay() { document.getElementById('postOverlay').style.display = 'flex'; }
      function closePostOverlay() {
          document.getElementById('postOverlay').style.display = 'none';
          nxSelectedMediaFiles = [];
          document.getElementById('mediaPreview').innerHTML = '';
          document.getElementById('fileUpload').value = '';
      }

      // NEW — holds every file the user has picked for THIS post (supports
      // picking more than one image/video, and picking again to add more).
      let nxSelectedMediaFiles = [];

      function previewMedia(input) {
          // Merge newly-picked files into the running selection (dedupe by
          // name+size+lastModified so re-opening the picker doesn't duplicate).
          Array.from(input.files || []).forEach(file => {
              const exists = nxSelectedMediaFiles.some(f =>
                  f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
              if (!exists) nxSelectedMediaFiles.push(file);
          });
          input.value = ''; // allow re-picking the same file / picking again to add more
          nxRenderMediaPreview();
      }

      // NEW — draws a thumbnail grid for every selected file, each with its
      // own ✕ to remove just that one before publishing.
      function nxRenderMediaPreview() {
          const preview = document.getElementById('mediaPreview');
          if (nxSelectedMediaFiles.length === 0) { preview.innerHTML = ''; return; }

          preview.style.display = 'flex';
          preview.style.flexWrap = 'wrap';
          preview.style.gap = '8px';
          preview.innerHTML = '';

          nxSelectedMediaFiles.forEach((file, index) => {
              const reader = new FileReader();
              const cell = document.createElement('div');
              cell.style.cssText = 'position:relative; width:84px; height:84px; border-radius:10px; overflow:hidden; flex-shrink:0; background:#1a1a1a;';
              reader.onload = function(e) {
                  const mediaEl = file.type.includes('video')
                      ? `<video src="${e.target.result}" muted style="width:100%;height:100%;object-fit:cover;display:block;"></video>`
                      : `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
                  cell.innerHTML = `${mediaEl}<div onclick="nxRemoveMediaAt(${index})" style="position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;">&times;</div>`;
              };
              reader.readAsDataURL(file);
              preview.appendChild(cell);
          });
      }

      // NEW — drop one file out of the pending selection and re-render.
      function nxRemoveMediaAt(index) {
          nxSelectedMediaFiles.splice(index, 1);
          nxRenderMediaPreview();
      }
              
      // NEW — uploads a single File to the existing Render/Storj /upload
      // endpoint and returns {url, type}. Same request shape as before,
      // PLUS a Firebase Auth ID token in the Authorization header, since
      // /upload on the backend now requires requireAuth (added as a
      // security fix) and was rejecting every request with 401 before
      // this — that's what "Storj upload via Render failed" was.
      async function nxUploadOneFile(file) {
          const currentFirebaseUser = firebase.auth().currentUser;
          if (!currentFirebaseUser) throw new Error("Not logged in — please log in again and retry.");
          const idToken = await currentFirebaseUser.getIdToken();

          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', 'feed');
          formData.append('username', currentUser);

          const response = await fetch(`${BACKEND_URL}/upload`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${idToken}` },
              body: formData
          });
          if (!response.ok) throw new Error("Storj upload via Render failed");
          const data = await response.json();

          if (!data.success) throw new Error(data.error || "Sabar ta gaza turawa zuwa Storj.");
          return { url: data.url, type: file.type.includes('video') ? 'video' : 'image' };
      }

      async function publishPost() { 
          const text = document.getElementById('postText').value;
          const publishBtn = document.querySelector('.publish-btn');

          if (!text && nxSelectedMediaFiles.length === 0) return alert("Add text or media!");
          publishBtn.innerText = "Uploading...";
          publishBtn.disabled = true;

          try {
              // mediaUrl/mediaType (singular) stay exactly as before for a
              // single file, so every existing reader of `posts` — including
              // the post-card carousel — needs zero changes for that case.
              // mediaUrls (plural, array) is NEW and only gets written when
              // the person picked more than one image/video.
              let mediaUrl = ""; let mediaType = "none";
              let mediaUrls = [];

              if (nxSelectedMediaFiles.length === 1) {
                  const uploaded = await nxUploadOneFile(nxSelectedMediaFiles[0]);
                  mediaUrl = uploaded.url;
                  mediaType = uploaded.type;
              } else if (nxSelectedMediaFiles.length > 1) {
                  for (const file of nxSelectedMediaFiles) {
                      mediaUrls.push(await nxUploadOneFile(file));
                  }
              }

              const selectedCategory = document.querySelector('input[name="postType"]:checked').value;

              // MUHIMMI: mu kawo bayanan user DAYA kacal (ko daga cache), mu ajiye a cikin
              // post din kanta, domin gaba babu bukatar wani query domin avatar/suna.
              const cachedProfile = JSON.parse(localStorage.getItem('nexus_profile_cache') || '{}');
              let fullName = cachedProfile.fullName;
              let userProfilePic = cachedProfile.userProfilePic || localStorage.getItem('userProfilePic') || '';

              if (!fullName) {
                  const userDoc = await db.collection("users").doc(currentUser).get();
                  if (userDoc.exists) {
                      fullName = userDoc.data().fullName || currentUser;
                      userProfilePic = userDoc.data().userProfilePic || userProfilePic;
                      localStorage.setItem('nexus_profile_cache', JSON.stringify({ fullName, userProfilePic }));
                  }
              }

              const newPostData = {
    username: currentUser,
    fullName: fullName || currentUser,
    userProfilePic: userProfilePic,
    content: text,
    mediaUrl: mediaUrl,
    mediaType: mediaType,
    category: selectedCategory,
    commentCount: 0,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    likes: 0,
    remixOf: nexusRemixTarget ? nexusRemixTarget.postId : null
};
              if (mediaUrls.length > 0) newPostData.mediaUrls = mediaUrls; // NEW — only added for multi-media posts

              await db.collection("posts").add(newPostData);
              
              nexusRemixTarget = null;
              nxSelectedMediaFiles = []; // NEW — clear the pending selection
              alert("Your Post has been Published! 🚀");
              location.reload();
          } catch (error) {
              console.error(error); alert("Something went wrong: " + error.message);
          } finally {
              publishBtn.innerText = "Publish Post"; publishBtn.disabled = false;
          }
                      }

let feedUnsub = null;

// initSocialPage(): ana kiran wannan SAU DAYA lokacin page ta fara load
// ta al'ada (DOMContentLoaded), DA KUMA duk lokacin da NexusRouter ya
// shigo social.html ta hanyar SPA navigation (feed/DOM elements sabbi ne
// a kowane visit, don haka dole a sake render su).
function initSocialPage() {
    // MUHIMMI: a nan ne kadai za mu iya kiran NexusAlgorithm.init() cikin
    // aminci, domin a wannan lokacin nexus-algorithm.js (script na karshe
    // a page) ya riga ya gama loda kuma NexusAlgorithm ya wanzu.
    if (currentUser && typeof NexusAlgorithm !== 'undefined') {
        NexusAlgorithm.init(currentUser);
    }
    const savedProfile = localStorage.getItem('userProfilePic');
    const storyAvatar = document.getElementById('story-avatar-preview');
    if (savedProfile && storyAvatar) { storyAvatar.src = savedProfile; }
    window.postCard_observeVideos && window.postCard_observeVideos();

    if (currentUser) {
        renderNexusFeed();

        db.collection("users").doc(currentUser).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                if (document.getElementById("userProfileName")) {
                    document.getElementById("userProfileName").innerText = data.fullName;
                }
                if (document.getElementById("dropFullName")) {
                    document.getElementById("dropFullName").innerText = data.fullName || currentUser;
                }
                if (document.getElementById("dropUsername")) {
                    document.getElementById("dropUsername").innerText = "@" + (data.username || currentUser);
                }
            }
        }).catch((err) => { console.error("Error fetching user data:", err); });
    }
}

// destroySocialPage(): ana kiran wannan daga NexusRouter kafin a bar
// social.html zuwa wata page, domin rufe duk real-time listeners masu
// dogaro da DOM elements na wannan page (in ba haka ba, listeners din
// za su ci gaba da aiki a boye kan elements da suka riga sun bace).
function destroySocialPage() {
    document.body.style.overflow = '';
    if (feedUnsub) { feedUnsub(); feedUnsub = null; }
    if (liveViewersUnsub) { liveViewersUnsub(); liveViewersUnsub = null; }
    if (liveChatUnsub) { liveChatUnsub(); liveChatUnsub = null; }
    if (watchViewersUnsub) { watchViewersUnsub(); watchViewersUnsub = null; }
    if (watchChatUnsub) { watchChatUnsub(); watchChatUnsub = null; }
}

if (window.NexusRouter) {
    NexusRouter.registerPage('social.html', { init: initSocialPage, destroy: destroySocialPage });
}

// SPA: router.js din shine kadai ke da alhakin kiran initSocialPage()
// bayan wannan file ya gama loda (ta runInit()). Idan an sake kiranta
// a nan MA lokacin da readyState='complete' (SPA), za a kira ta SAU
// BIYU. Saboda haka a NAN kadai muke jiran DOMContentLoaded (native
// load) — babu 'else' immediate-call.
window.addEventListener('DOMContentLoaded', initSocialPage);


      // ============================================================
      // OPTIMIZED FEED RENDERING
      // - Nuna skeleton / cached HTML nan take (babu farin allo)
      // - .limit() maimakon dukkan database
      // - saved_posts da posts suna gudu a layi daya (parallel)
      // - Babu N+1 queries: fullName/userProfilePic/commentCount
      //   sun riga sun kasance a cikin kowane post document
      // ============================================================
      async function renderNexusFeed() {
          const feedContainer = document.querySelector('.feed-container');

          // STEP 1: Nuna wani abu NAN TAKE (cached feed ko skeleton),
          // maimakon barin allo fari yayin da muke jiran Firebase.
          const cachedFeedHTML = localStorage.getItem('nexus_feed_cache_html');
          if (cachedFeedHTML) {
              feedContainer.innerHTML = cachedFeedHTML;
              setTimeout(() => postCard_restoreLikes(feedContainer), 100);
              window.postCard_observeVideos && window.postCard_observeVideos();
          } else {
              feedContainer.innerHTML = renderSkeletonCards(FEED_PAGE_SIZE);
          }

          // STEP 2: saved_posts da posts suna gudu A LAYI DAYA (parallel),
          // ba jere daya bayan daya ba, domin basu da alaka da junansu.
          const savedPostsPromise = db.collection("saved_posts")
              .where("userId", "==", currentUser)
              .get()
              .catch(e => { console.log("Saved posts error:", e); return { docs: [] }; });

          const postsQuery = db.collection("posts")
              .orderBy("timestamp", "desc")
              .limit(FEED_PAGE_SIZE);

          let savedSnapshot, postsSnapshot;
          try {
              [savedSnapshot, postsSnapshot] = await Promise.all([savedPostsPromise, postsQuery.get()]);
          } catch (err) {
              // Firestore ta kasa kai wa backend (misali network blip). Mu
              // BARI cached/skeleton feed din da ake nunawa yanzu, kada mu
              // share ta da "No posts yet...". Real-time listener a kasa
              // zai gyara komai da kanta idan network ta dawo.
              console.error('renderNexusFeed: get() ya kasa (network/Firestore), an bar tsohon feed:', err);
              feedUnsub = postsQuery.onSnapshot((snapshot) => {
                  renderPostsBatch(snapshot, feedContainer);
              });
              return;
          }

          window.userSavedPosts = savedSnapshot.docs.map(doc => doc.data().postId);

          renderPostsBatch(postsSnapshot, feedContainer);

          if (!postsSnapshot.empty) {
              lastVisibleDoc = postsSnapshot.docs[postsSnapshot.docs.length - 1];
          }

          // STEP 3: real-time listener KAWAI akan wannan page na farko,
          // domin sabbin posts su bayyana nan take. Ana ajiye unsubscribe
          // a feedUnsub domin destroySocialPage() ya iya rufe ta.
          feedUnsub = postsQuery.onSnapshot((snapshot) => {
              renderPostsBatch(snapshot, feedContainer);
          });
      }

      function renderPostsBatch(snapshot, feedContainer) {
          if (snapshot.empty) {
              // Idan "empty" din ya fito daga LOCAL CACHE ne kadai (watau
              // Firestore bai tabbatar da martanin ainihin server ba
              // tukuna — misali saboda "backend unavailable"), kada mu
              // share feed din da ake nunawa yanzu da "No posts yet...".
              // Mu bar abinda ke akwai har sai an tabbata da gaske babu
              // posts (fromCache === false).
              if (snapshot.metadata && snapshot.metadata.fromCache) {
                  console.warn('renderPostsBatch: snapshot empty + fromCache=true, an bar tsohon feed (network blip, ba a tabbatar ba tukuna).');
                  return;
              }
              feedContainer.innerHTML = '<div class="empty-feed" style="text-align:center; padding:20px; color:#aaa;">No posts yet...</div>';
              return;
          }

          let allPostsHTML = '';
          snapshot.forEach((doc) => {
              // Kowane post yanzu yana da fullName/userProfilePic/commentCount
              // A CIKIN kansa — babu bukatar wani query domin samo su.
              const post = { id: doc.id, ...doc.data() };
              allPostsHTML += generatePostHTML(post);
          });

          feedContainer.innerHTML = allPostsHTML;

          // Ajiye a cache domin lodi na gaba ya kasance nan take
          localStorage.setItem('nexus_feed_cache_html', allPostsHTML);

          setTimeout(() => postCard_restoreLikes(feedContainer), 200);

          // Likes: query DAYA kacal (ba a cikin loop na kowane post ba)
          const myUsername = currentUser;
          if (myUsername) {
              db.collection('likes').where('user', '==', myUsername).get().then(snap => {
                  const likedPostIds = new Set(snap.docs.map(d => d.data().postId));
                  likedPostIds.forEach(postId => {
                      const card = feedContainer.querySelector(`.post-card[data-post-id="${postId}"]`);
                      if (!card) return;
                      const likeBtn = card.querySelectorAll('.capsule')[0];
                      if (likeBtn) {
                          likeBtn.classList.add('liked');
                          const icon = likeBtn.querySelector('i');
                          if (icon) { icon.className = 'fa-solid fa-heart'; icon.style.color = '#ff4d6d'; }
                      }
                  });
              });
          }

          window.postCard_observeVideos && window.postCard_observeVideos();
          setTimeout(() => window.postCard_handleVideoPriority && window.postCard_handleVideoPriority(), 300);
      }

      // Skeleton placeholder — yana bayyana NAN TAKE (0ms) yayin da
      // ainihin data ke zuwa daga Firebase a baya.
      function renderSkeletonCards(count) {
          let html = '';
          for (let i = 0; i < count; i++) {
              html += `<div class="skeleton-card"><div class="skeleton-shimmer"></div></div>`;
          }
          return html;
      }

      // Ana kira wannan lokacin da aka rubuta sabon comment/reply —
      // yana amfani da increment() atomic maimakon sake ƙidaya duk comments.
      async function addComment(postId, commentText, parentId = null) {
          await db.collection("nexus_contributions").add({
              postId, parentId, username: currentUser,
              content: commentText,
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });

          await db.collection("posts").doc(postId).update({
              commentCount: firebase.firestore.FieldValue.increment(1)
          });
      }

      window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(window.postCard_handleVideoPriority, 150);
}, { passive: true });



        // ===== STORY VIEWER LOGIC =====

    
let currentStory = null;
let currentSlide = 0;
let progressInterval = null;
let isPaused = false;
let progressWidth = 0;
const SLIDE_DURATION = 5000;

// Jerin dukan members a order
const storyOrder = ['your_story','live_now','trt_afrika','bbc_news','arewa_tech','daily_trust'];

const storyMap = {
    'your_story': {
        avatar: localStorage.getItem('userProfilePic') || 'https://api.dicebear.com/7.x/bottts/svg?seed=me',
        name: 'Your Story', time: 'just now',
        slides: [{ img: localStorage.getItem('userProfilePic') || 'https://api.dicebear.com/7.x/bottts/svg?seed=me', text: 'Your story' }]
    },
    'live_now': {
        avatar: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Al_Jazeera_%E8%8B%B1%E8%AA%9E_logo.svg',
        name: 'aljazeeraeng', time: '🔴 LIVE',
        slides: [{ img: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80', text: 'Breaking: Live coverage now 📡' }]
    },
    'trt_afrika': {
        avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
        name: 'trtafrikaha', time: '10m ago',
        slides: [
            { img: 'https://images.unsplash.com/photo-1503891450247-ee5f8ec46dc3?w=600&q=80', text: 'Africa today 🌍' },
            { img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80', text: 'Stories from the continent ✊' }
        ]
    },
    'bbc_news': {
        avatar: 'https://upload.wikimedia.org/wikipedia/commons/6/62/BBC_News_2019.svg',
        name: 'bbcnews', time: '30m ago',
        slides: [{ img: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&q=80', text: 'World news update 🌐' }]
    },
    'arewa_tech': {
        avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg',
        name: 'arewatech', time: '1h ago',
        slides: [{ img: 'https://images.unsplash.com/photo-1542296332-3c659bd32e73?w=600&q=80', text: 'Fashion week highlights 👗' }]
    },
    'daily_trust': {
        avatar: 'https://images.pexels.com/photos/14446662/pexels-photo-14446662.jpeg',
        name: 'dailytrust', time: '2h ago',
        slides: [{ img: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80', text: 'Daily Trust latest news 📰' }]
    }
};

function openStory(storyId) {
    const story = storyMap[storyId];
    if (!story) return;

    currentStory = story;
    currentStory._id = storyId;
    currentSlide = 0;
    isPaused = false;

    document.getElementById('viewerAvatar').src = story.avatar;
    document.getElementById('viewerName').textContent = story.name;
    document.getElementById('viewerTime').textContent = story.time;

    buildProgressBar(story.slides.length);
    showSlide(0);

    document.getElementById('storyViewer').classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('instaFooter').style.display = 'none';

    if (navigator.vibrate) navigator.vibrate(15);
}

function closeStoryViewer() {
    document.getElementById('storyViewer').classList.remove('open');
    document.body.style.overflow = '';
    clearInterval(progressInterval);
    currentStory = null;
    isPaused = false;
    document.getElementById('instaFooter').style.display = 'flex';
}

function buildProgressBar(count) {
    const bar = document.getElementById('progressBar');
    bar.innerHTML = '';
    for (let i = 0; i < count; i++) {
        bar.innerHTML += `<div class="progress-segment"><div class="progress-fill" id="prog-${i}"></div></div>`;
    }
}

function showSlide(index) {
    clearInterval(progressInterval);
    if (!currentStory) return;

    const slides = currentStory.slides;

    // Idan slides din wannan member sun kare, je next member
    if (index >= slides.length) {
        goToNextMember();
        return;
    }
    // Idan ya koma baya fiye da kashi na farko, rufe
    if (index < 0) {
        closeStoryViewer();
        return;
    }

    currentSlide = index;
    isPaused = false;

    document.getElementById('viewerImage').src = slides[index].img;
    document.getElementById('viewerText').textContent = slides[index].text;

    // Cike bars da suka gabata, share na gaba
    slides.forEach((_, i) => {
        const fill = document.getElementById('prog-' + i);
        if (fill) fill.style.width = i < index ? '100%' : '0%';
    });

    // Fara progress na wannan slide
    progressWidth = 0;
    const fill = document.getElementById('prog-' + index);
    if (!fill) return;

    const step = 100 / (SLIDE_DURATION / 100);
    progressInterval = setInterval(() => {
        if (isPaused) return; // ← PAUSE yana aiki nan
        progressWidth += step;
        fill.style.width = Math.min(progressWidth, 100) + '%';
        if (progressWidth >= 100) {
            clearInterval(progressInterval);
            showSlide(index + 1);
        }
    }, 100);
}

function goToNextMember() {
    const currentIndex = storyOrder.indexOf(currentStory._id);
    const nextId = storyOrder[currentIndex + 1];
    if (nextId && storyMap[nextId]) {
        openStory(nextId);
    } else {
        closeStoryViewer(); // Karshen dukan stories
    }
}

function nextStory() { showSlide(currentSlide + 1); }
function prevStory() { showSlide(currentSlide - 1); }

// ===== TAP TO PAUSE / RESUME (delegated — yana aiki ko da an sake swap DOM) =====
let holdTimer = null;
let isHolding = false;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    const viewer = e.target.closest('#storyViewer');
    if (!viewer || !viewer.classList.contains('open')) return;
    touchStartY = e.touches[0].clientY;
    if (e.target.closest('.story-close-btn') || e.target.closest('.hud-footer-capsule')) return;
    holdTimer = setTimeout(() => {
        isHolding = true;
        isPaused = true;
    }, 150);
}, { passive: true });

document.addEventListener('touchend', (e) => {
    const viewer = e.target.closest('#storyViewer');
    if (!viewer || !viewer.classList.contains('open')) return;
    clearTimeout(holdTimer);

    const swipeDown = e.changedTouches[0].clientY - touchStartY;
    if (swipeDown > 80 && !isHolding) { closeStoryViewer(); isHolding = false; return; }

    if (isHolding) { isPaused = false; isHolding = false; return; }

    if (e.target.closest('.story-close-btn') || e.target.closest('.hud-footer-capsule')) return;

    const x = e.changedTouches[0].clientX;
    const halfScreen = window.innerWidth / 2;
    if (x < halfScreen) prevStory(); else nextStory();
}, { passive: true });


        /* ================= CONTROLLER NA DROPDOWN ================= */
function toggleMinimalMenu() {
    const dropdown = document.getElementById('CyberDropdown');
    dropdown.classList.toggle('Active');
}

// Idan aka danna ko'ina a allon bayan dropdown din yana bude, zai rufe da kansa
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('CyberDropdown');
    const menuBtn = document.getElementById('cyberMenu');
    
    if (!dropdown.contains(event.target) && !menuBtn.contains(event.target)) {
        dropdown.classList.remove('Active');
        menuBtn.classList.remove('is-active');
    }
});

// ============================================================
// NODE ACTIONS — PREMIUM MENU (dynamic owner/viewer + verified-only gating)
// ============================================================
let neuralMenuPostId = null;
let currentUserIsVerified = false;
let nexusRemixTarget = null;

async function refreshViewerVerification() {
    if (!currentUser) { currentUserIsVerified = false; return false; }
    try {
        const cached = JSON.parse(localStorage.getItem('nexus_profile_cache') || '{}');
        if (typeof cached.isVerified === 'boolean') {
            currentUserIsVerified = cached.isVerified;
            return currentUserIsVerified;
        }
        const userDoc = await db.collection('users').doc(currentUser).get();
        currentUserIsVerified = userDoc.exists ? !!userDoc.data().isVerified : false;
        cached.isVerified = currentUserIsVerified;
        localStorage.setItem('nexus_profile_cache', JSON.stringify(cached));
    } catch (e) {
        currentUserIsVerified = false;
    }
    return currentUserIsVerified;
}

function nodeItem(icon, text, onclickCode, accent, premium) {
    return `<a href="#" class="sheet-item ${premium ? 'premium-item' : ''}" style="--accent:${accent};" onclick="event.preventDefault(); ${onclickCode}">
        <div class="sheet-icon-box" style="position:relative;">
            <i class="fa-solid ${icon}"></i>
            ${premium ? '<span style="position:absolute;top:-4px;right:-4px;font-size:10px;color:#fde08d;">★</span>' : ''}
        </div>
        <span class="sheet-text">${text}</span>
    </a>`;
}

async function openNeuralMenu(postId, postUsername) {
    const sheet = document.getElementById('neuralBottomMenu');
    neuralMenuPostId = postId || null;
    const isOwnPost = !!(postUsername && postUsername === currentUser);

    await refreshViewerVerification();

    let postData = { username: postUsername };
    try {
        if (postId && typeof db !== 'undefined') {
            const doc = await db.collection('posts').doc(postId).get();
            if (doc.exists) postData = { ...doc.data(), username: postUsername };
        }
    } catch (e) { /* ignore, ci gaba da default */ }

    renderNodeActionsMenu(postId, isOwnPost, postData);

    sheet.classList.add('is-open');
    if (navigator.vibrate) navigator.vibrate(20);
}

function renderNodeActionsMenu(postId, isOwnPost, postData) {
    const grid = document.getElementById('nodeActionsGrid');
    if (!grid) return;
    let html = '';

    if (isOwnPost) {
        html += nodeItem('fa-thumbtack', postData.pinned ? 'Unpin Post' : 'Pin Post',
            `togglePinFromMenu('${postId}', ${!!postData.pinned})`, '#FFD700', false);

        html += nodeItem('fa-pen', 'Edit Post',
            `editPostFromMenu('${postId}')`, '#00f2fe', false);

        html += nodeItem('fa-share-nodes', 'Share Node',
            `sharePostFromMenu('${postId}')`, '#00f2fe', false);

        html += nodeItem('fa-link', 'Copy Link',
            `copyLinkFromMenu('${postId}')`, '#00f2fe', false);

        html += nodeItem('fa-box-archive', 'Move to Archive',
            `archivePostFromMenu('${postId}')`, '#a78bfa', false);

        html += nodeItem('fa-trash-can', 'Delete Post',
            `deletePostFromMenu()`, '#ff4d6d', false);

        html += nodeItem('fa-comment-slash', postData.commentsDisabled ? 'Turn On Comments' : 'Turn Off Comments',
            `toggleCommentsFromMenu('${postId}', ${!!postData.commentsDisabled})`, '#50FA7B', true);

        html += nodeItem('fa-chart-line', 'View Insights',
            `viewInsightsFromMenu('${postId}')`, '#00f2fe', true);

        html += nodeItem('fa-rocket', postData.boosted ? 'Remove Boost' : 'Boost Post',
            `toggleBoostFromMenu('${postId}', ${!!postData.boosted})`, '#fde08d', true);

        html += nodeItem('fa-clock', postData.locked ? 'Edit Time-Capsule' : 'Lock as Time-Capsule',
            `lockAsTimeCapsuleFromMenu('${postId}')`, '#a78bfa', true);

        html += nodeItem('fa-user-group', 'Edit Privacy',
            `editPrivacyFromMenu('${postId}')`, '#00f2fe', true);

    } else {
        html += nodeItem('fa-bookmark', 'Save Post',
            `postCard_toggleSave(event, '${postId}')`, '#FFD700', false);

        html += nodeItem('fa-share-nodes', 'Share Node',
            `sharePostFromMenu('${postId}')`, '#00f2fe', false);

        html += nodeItem('fa-link', 'Copy Link',
            `copyLinkFromMenu('${postId}')`, '#00f2fe', false);

        html += nodeItem('fa-circle-minus', 'Not Interested',
            `notInterestedFromMenu('${postId}')`, '#aaaaaa', false);

        html += nodeItem('fa-circle-info', "Why You're Seeing This",
            `whySeeingFromMenu()`, '#aaaaaa', false);

        html += nodeItem('fa-bell-slash', 'Mute Node',
            `muteNodeFromMenu('${(postData.username || '').replace(/'/g, "\\'")}')`, '#50FA7B', false);

        html += nodeItem('fa-triangle-exclamation', 'Report',
            `reportFromMenu('${postId}')`, '#ff4d6d', false);

        html += nodeItem('fa-shuffle', 'Remix This Post',
            `remixPostFromMenu('${postId}', '${(postData.username || '').replace(/'/g, "\\'")}')`, '#fde08d', true);
    }

    grid.innerHTML = html;

    // Cire duk premium-item idan viewer din ba verified ba ne
    if (!currentUserIsVerified) {
        grid.querySelectorAll('.premium-item').forEach(el => el.remove());
    }
}

function closeNeuralMenu() {
    const sheet = document.getElementById('neuralBottomMenu');
    sheet.classList.remove('is-open');
}

function deletePostFromMenu() {
    if (!neuralMenuPostId) return;
    if (!confirm('Are you sure you want to delete this post?')) return;

    db.collection("posts").doc(neuralMenuPostId).delete().then(() => {
        const card = document.querySelector(`.post-card[data-post-id="${neuralMenuPostId}"]`);
        if (card) card.remove();
        closeNeuralMenu();
    }).catch(err => alert("An error occurred: " + err.message));
}

function togglePinFromMenu(postId, currentlyPinned) {
    db.collection('posts').doc(postId).update({ pinned: !currentlyPinned }).then(() => {
        closeNeuralMenu();
        location.reload();
    }).catch(err => alert('Error: ' + err.message));
}

async function editPostFromMenu(postId) {
    const doc = await db.collection('posts').doc(postId).get();
    if (!doc.exists) return;
    const current = doc.data().content || '';
    const updated = prompt('Edit your post:', current);
    if (updated === null) return;

    db.collection('posts').doc(postId).update({ content: updated, edited: true }).then(() => {
        const contentEl = document.querySelector(`.post-card[data-post-id="${postId}"] .post-content`);
        if (contentEl) contentEl.textContent = updated;
        closeNeuralMenu();
    }).catch(err => alert('Error: ' + err.message));
}

function archivePostFromMenu(postId) {
    if (!confirm('Move this post to archive? It will be hidden from your feed.')) return;

    db.collection('posts').doc(postId).update({ archived: true }).then(() => {
        const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (card) card.remove();
        closeNeuralMenu();
    }).catch(err => alert('Error: ' + err.message));
}

function toggleCommentsFromMenu(postId, currentlyDisabled) {
    db.collection('posts').doc(postId).update({ commentsDisabled: !currentlyDisabled }).then(() => {
        const btn = document.getElementById(`comment-btn-${postId}`);
        if (btn) btn.style.opacity = currentlyDisabled ? '1' : '0.4';
        closeNeuralMenu();
    }).catch(err => alert('Error: ' + err.message));
}

async function viewInsightsFromMenu(postId) {
    const doc = await db.collection('posts').doc(postId).get();
    if (!doc.exists) return;
    const d = doc.data();
    const likes = d.likesCount || d.likes || 0;
    const comments = d.commentsCount || d.commentCount || 0;

    alert(`📊 Post Insights\n\nLikes: ${likes}\nComments: ${comments}\nBoosted: ${d.boosted ? 'Yes' : 'No'}`);
    closeNeuralMenu();
}

function toggleBoostFromMenu(postId, currentlyBoosted) {
    db.collection('posts').doc(postId).update({ boosted: !currentlyBoosted }).then(() => {
        closeNeuralMenu();
        location.reload();
    }).catch(err => alert('Error: ' + err.message));
}

function lockAsTimeCapsuleFromMenu(postId) {
    const hours = prompt('Unlock this post after how many hours?', '24');
    if (hours === null || isNaN(parseFloat(hours))) return;
    const unlockAt = Date.now() + (parseFloat(hours) * 3600000);
    const title = prompt('Time-Capsule title:', 'A message unlocks for followers soon') || 'A message unlocks for followers soon';

    db.collection('posts').doc(postId).update({
        locked: true, unlockAt: unlockAt, lockedTitle: title
    }).then(() => {
        closeNeuralMenu();
        location.reload();
    }).catch(err => alert('Error: ' + err.message));
}

function editPrivacyFromMenu(postId) {
    const choice = prompt('Set audience: type "public", "followers", or "circle"', 'public');
    if (!choice) return;

    db.collection('posts').doc(postId).update({ audience: choice.toLowerCase() }).then(() => {
        closeNeuralMenu();
    }).catch(err => alert('Error: ' + err.message));
}

function sharePostFromMenu(postId) {
    const url = `${location.origin}${location.pathname}?post=${postId}`;
    if (navigator.share) {
        navigator.share({ title: 'Check this out on Nexus', url }).catch(() => {});
    } else {
        copyLinkFromMenu(postId);
        return;
    }
    closeNeuralMenu();
}

function copyLinkFromMenu(postId) {
    const url = `${location.origin}${location.pathname}?post=${postId}`;
    navigator.clipboard.writeText(url).then(() => alert('Link copied!')).catch(() => alert(url));
    closeNeuralMenu();
}

function notInterestedFromMenu(postId) {
    if (typeof db !== 'undefined' && currentUser) {
        db.collection('signals').add({
            user: currentUser, postId, type: 'not_interested',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    }
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (card) card.remove();
    closeNeuralMenu();
}

function whySeeingFromMenu() {
    alert("You're seeing this post because of your recent activity, who you follow, and how popular it is with people you're connected to.");
    closeNeuralMenu();
}

function muteNodeFromMenu(username) {
    if (!username || typeof db === 'undefined' || !currentUser) { closeNeuralMenu(); return; }

    db.collection('muted_users').doc(`${currentUser}_${username}`).set({
        mutedBy: currentUser, mutedUser: username,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => alert(`You won't see posts from ${username} anymore.`)).catch(() => {});
    closeNeuralMenu();
}

function reportFromMenu(postId) {
    const reason = prompt('Why are you reporting this post?', '');
    if (reason === null) return;

    if (typeof db !== 'undefined' && currentUser) {
        db.collection('reports').add({
            reportedBy: currentUser, postId, reason,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    }
    alert("Thanks — we won't let anyone know who reported this.");
    closeNeuralMenu();
}

function remixPostFromMenu(postId, originalUsername) {
    nexusRemixTarget = { postId, originalUsername };
    closeNeuralMenu();
    openPostOverlay();
    const textArea = document.getElementById('postText');
    if (textArea) textArea.value = `Remixing @${originalUsername}'s post:\n\n`;
}

// ===== GO LIVE LOGIC =====
let liveStream = null;
let liveFacingMode = 'user';
let liveViewerInterval = null;
let liveViewerCount = 0;
let currentLiveSessionId = null;
let liveViewersUnsub = null;
let liveChatUnsub = null;
let currentWatchingLiveId = null;
let watchViewersUnsub = null;
let watchChatUnsub = null;
let mediaRecorder = null;
let recordedChunks = [];

function openStorySheet() {
    document.getElementById('storySheetOverlay').classList.add('open');
    document.getElementById('instaFooter').classList.add('footer-hidden');
    document.body.style.overflow = 'hidden';
}
function closeStorySheet() {
    document.getElementById('storySheetOverlay').classList.remove('open');
    document.getElementById('instaFooter').classList.remove('footer-hidden');
    document.body.style.overflow = '';
}

async function startLiveStudio() {
    document.getElementById('instaFooter').classList.add('footer-hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('liveStudio').classList.add('open');
    document.getElementById('liveChatFeed').innerHTML = '';
    liveViewerCount = 0;
    document.getElementById('liveViewerCount').textContent = '0';
    try {
        const liveDocRef = await db.collection('nexus_live_sessions').add({
            host: currentUser,
            hostAvatar: localStorage.getItem('userProfilePic') || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + currentUser,
            status: 'live',
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            endedAt: null
        });
        currentLiveSessionId = liveDocRef.id;
        notifyFollowersLive();
        setupHostLiveListeners(currentLiveSessionId);
} catch (err) {
        console.error('Ba a iya halitta live session ba:', err);
        alert('LIVE SESSION ERROR: ' + err.message);
    }

    try {
        liveStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: liveFacingMode }, audio: true
        });
        document.getElementById('liveCameraPreview').srcObject = liveStream;
    recordedChunks = [];
        try {
            mediaRecorder = new MediaRecorder(liveStream, { mimeType: 'video/webm;codecs=vp8,opus' });
            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
            mediaRecorder.start();
        } catch (recErr) {
            console.warn('MediaRecorder ba ya samuwa:', recErr);
        }
    } catch (err) {
        alert('Ba a samu izinin camera/microphone ba: ' + err.message);
        endLiveStudio();
        return;
    }
}
        
function flipLiveCamera() {
    liveFacingMode = liveFacingMode === 'user' ? 'environment' : 'user';
    if (liveStream) liveStream.getTracks().forEach(t => t.stop());
    navigator.mediaDevices.getUserMedia({ video: { facingMode: liveFacingMode }, audio: true })
        .then(stream => {
            liveStream = stream;
            document.getElementById('liveCameraPreview').srcObject = stream;
        });
}

function endLiveStudio() {
    const liveIdToClose = currentLiveSessionId;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = () => uploadLiveRecording(liveIdToClose);
        mediaRecorder.stop();
    }

    if (liveStream) liveStream.getTracks().forEach(t => t.stop());
    liveStream = null;
    if (liveViewersUnsub) liveViewersUnsub();
    if (liveChatUnsub) liveChatUnsub();
    document.getElementById('liveStudio').classList.remove('open');
    document.getElementById('instaFooter').classList.remove('footer-hidden');
    document.body.style.overflow = '';
    if (currentLiveSessionId) {
        db.collection('nexus_live_sessions').doc(currentLiveSessionId).update({
            status: 'ended',
            endedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error('Kuskure wajen rufe live session:', err));
        currentLiveSessionId = null;
    }
}

async function uploadLiveRecording(liveId) {
    if (!liveId || recordedChunks.length === 0) return;
    try {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('file', blob, `live_${liveId}.webm`);
        formData.append('type', 'live_recording');
        formData.append('username', currentUser);

        const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
            await db.collection('nexus_live_sessions').doc(liveId).update({
                recordingUrl: data.url
            });
            console.log('Recording an ajiye:', data.url);
        } else {
            console.error('Upload din recording ya kasa:', data.error);
        }
    } catch (err) {
        console.error('uploadLiveRecording error:', err);
    }
}

async function notifyFollowersLive() {
    try {
        const followsSnap = await db.collection('follows').where('following', '==', currentUser).get();
        const fullName = localStorage.getItem('nexus_profile_cache')
            ? (JSON.parse(localStorage.getItem('nexus_profile_cache')).fullName || currentUser)
            : currentUser;

        followsSnap.forEach(doc => {
            const followerUsername = doc.data().follower;
            fetch(`${BACKEND_URL}/send-push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: followerUsername,
                    title: '🔴 Live yanzu',
                    body: `${fullName} yana Live yanzu — shiga ka gani!`,
                    data: { url: '/social.html?live=' + currentLiveSessionId }
                })
            }).catch(err => console.warn('Push ya kasa zuwa ' + followerUsername, err));
        });
    } catch (err) {
        console.error('notifyFollowersLive error:', err);
    }
}

function setupHostLiveListeners(liveId) {
    const liveRef = db.collection('nexus_live_sessions').doc(liveId);

    liveViewersUnsub = liveRef.collection('viewers').onSnapshot(
        snap => {
            console.log('[HOST] viewer count update:', snap.size);
            document.getElementById('liveViewerCount').textContent = snap.size;
        },
        err => {
            console.error('[HOST] viewers listener error:', err);
            alert('Viewer listener error: ' + err.message);
        }
    );

    liveChatUnsub = liveRef.collection('chat').orderBy('timestamp').onSnapshot(
        snap => {
            const feed = document.getElementById('liveChatFeed');
            feed.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const el = document.createElement('div');
                el.className = 'live-chat-msg';
                el.innerHTML = `<b>${d.author}</b>${d.text}`;
                feed.appendChild(el);
            });
            feed.scrollTop = feed.scrollHeight;
        },
        err => console.error('[HOST] chat listener error:', err)
    );
}

// ===== WATCH LIVE (masu kallo) =====
async function openWatchLive(liveId) {
    try {
        if (!liveId) {
            const activeSnap = await db.collection('nexus_live_sessions')
                .where('status', '==', 'live').get();
            if (activeSnap.empty) { alert('Babu wanda yake Live yanzu.'); return; }
            liveId = activeSnap.docs[0].id;
        }

        currentWatchingLiveId = liveId;
        const liveRef = db.collection('nexus_live_sessions').doc(liveId);
        const liveDoc = await liveRef.get();
        if (!liveDoc.exists) { alert('Wannan live ya kare.'); return; }
        const liveData = liveDoc.data();

        document.getElementById('watchLiveHostAvatar').src = liveData.hostAvatar;
        document.getElementById('watchLiveHostName').textContent = liveData.host;
        document.getElementById('watchLiveChatFeed').innerHTML = '';
        document.getElementById('watchLiveOverlay').classList.add('open');
        document.getElementById('instaFooter').classList.add('footer-hidden');
        document.body.style.overflow = 'hidden';

        await liveRef.collection('viewers').doc(currentUser).set({
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('[VIEWER] joined live as', currentUser, 'liveId:', liveId);

        watchViewersUnsub = liveRef.collection('viewers').onSnapshot(snap => {
            document.getElementById('watchLiveViewerCount').textContent = snap.size;
        });

        watchChatUnsub = liveRef.collection('chat').orderBy('timestamp').onSnapshot(snap => {
            const feed = document.getElementById('watchLiveChatFeed');
            feed.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const el = document.createElement('div');
                el.className = 'live-chat-msg';
                el.innerHTML = `<b>${d.author}</b>${d.text}`;
                feed.appendChild(el);
            });
            feed.scrollTop = feed.scrollHeight;
        });
    } catch (err) {
        console.error('openWatchLive error:', err);
        alert('Error: ' + err.message);
    }
            }

function closeWatchLive() {
    if (currentWatchingLiveId) {
        db.collection('nexus_live_sessions').doc(currentWatchingLiveId)
            .collection('viewers').doc(currentUser).delete().catch(() => {});
    }
    if (watchViewersUnsub) watchViewersUnsub();
    if (watchChatUnsub) watchChatUnsub();
    currentWatchingLiveId = null;
    document.getElementById('watchLiveOverlay').classList.remove('open');
    document.getElementById('instaFooter').classList.remove('footer-hidden');
    document.body.style.overflow = '';
}

function sendWatchLiveChat() {
    const input = document.getElementById('watchLiveChatInput');
    const msg = input.value.trim();
    if (!msg || !currentWatchingLiveId) return;
    db.collection('nexus_live_sessions').doc(currentWatchingLiveId)
        .collection('chat').add({
            author: currentUser,
            text: msg,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    input.value = '';
}

function sendWatchLiveReaction() {
    if (navigator.vibrate) navigator.vibrate(15);
    }

function sendLiveChat() {
    const input = document.getElementById('liveChatInput');
    const msg = input.value.trim();
    if (!msg || !currentLiveSessionId) return;
    db.collection('nexus_live_sessions').doc(currentLiveSessionId)
        .collection('chat').add({
            author: currentUser,
            text: msg,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    input.value = '';
}

function sendLiveReaction() {
    if (navigator.vibrate) navigator.vibrate(15);
}
