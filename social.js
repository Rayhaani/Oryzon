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

// ============================================================
// HEADER + FOOTER: kamar YouTube — duka su boye TARE nan take idan
// ana scroll DOWN, duka su bayyana TARE nan take idan ana scroll UP.
// Babu jinkirin lokaci (ba dakiku 2 ba) — kai tsaye bisa ga alkiblar
// scroll din, kamar yadda aka bayyana. Musamman ga social.html kadai
// — an tsare shi da named functions domin a iya cire su daga
// listeners a destroySocialPage() idan an bar social.html, in ba
// haka ba za su zauna a `window` har abada.
// ============================================================
(function () {
    if (document.getElementById('nx-header-autohide-style')) return;
    const s = document.createElement('style');
    s.id = 'nx-header-autohide-style';
    s.textContent = `
        header {
            transition: transform 0.35s cubic-bezier(0.4,0,0.2,1) !important;
            will-change: transform;
        }
    `;
    document.head.appendChild(s);
})();
let _navLastScrollY = 0;
function _socialNavScrollHandler() {
    const header = document.querySelector('header');
    const footer = document.getElementById('instaFooter');
    const y = window.scrollY;

    if (y <= 60) {
        // Kusa da saman page — koyaushe a nuna duka biyu.
        if (header) header.style.transform = 'translateY(0)';
        if (footer) footer.classList.remove('footer-hidden');
    } else if (y > _navLastScrollY) {
        // Ana scroll DOWN — boye duka biyu nan take.
        if (header) header.style.transform = 'translateY(-110%)';
        if (footer) footer.classList.add('footer-hidden');
    } else if (y < _navLastScrollY) {
        // Ana scroll UP — bayyana duka biyu nan take.
        if (header) header.style.transform = 'translateY(0)';
        if (footer) footer.classList.remove('footer-hidden');
    }
    _navLastScrollY = y;
}
function _socialNavScrollReset() {
    _navLastScrollY = 0;
    const header = document.querySelector('header');
    const footer = document.getElementById('instaFooter');
    if (header) header.style.transform = '';
    if (footer) footer.classList.remove('footer-hidden');
}

      function openPostOverlay() {
          document.getElementById('postOverlay').style.display = 'flex';
          if (window.NexusMenu) NexusMenu.updateComposer();
      }
      function closePostOverlay() {
          document.getElementById('postOverlay').style.display = 'none';
          nxSelectedMediaFiles = [];
          document.getElementById('mediaPreview').innerHTML = '';
          document.getElementById('fileUpload').value = '';
      }

      window.openNexusFeedOverlay = function() {
          const ov = document.getElementById('nexusFeedOverlay');
          if (ov) ov.style.display = 'block';
      };
      window.closeNexusFeedOverlay = function() {
          const ov = document.getElementById('nexusFeedOverlay');
          if (ov) ov.style.display = 'none';
      };

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

              // Using the app as a Page: publish the post as that page (same fields pages.js writes).
              const activeIdentity = window.nxGetActiveIdentity ? window.nxGetActiveIdentity() : null;
              if (activeIdentity && activeIdentity.type === 'page') {
                  newPostData.pageId = activeIdentity.id;
                  newPostData.username = activeIdentity.name;
                  newPostData.fullName = activeIdentity.name;
                  newPostData.userProfilePic = activeIdentity.avatar || '';
                  newPostData.authorUsername = currentUser;
                  newPostData.pinned = false;
              }

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
    if (currentUser) { renderNexusFeed(); }
    if (window.NexusMenu) NexusMenu.init();
    if (currentUser && typeof NexusAlgorithm !== 'undefined') {
        setTimeout(function () {
            try { NexusAlgorithm.init(currentUser); } catch (e) { console.warn('NexusAlgorithm.init failed:', e); }
        }, 0);
    }
    const savedProfile = localStorage.getItem('userProfilePic');
    const storyAvatar = document.getElementById('story-avatar-preview');
    if (savedProfile && storyAvatar) { storyAvatar.src = savedProfile; }
    window.postCard_observeVideos && window.postCard_observeVideos();

    if (currentUser) {
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
                const headerAvatar = document.querySelector('.header-avatar-placeholder');
                if (headerAvatar) {
                    const photo = data.userProfilePic || localStorage.getItem('userProfilePic');
                    if (photo) {
                        headerAvatar.innerHTML = `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                    } else {
                        const initial = (data.fullName || currentUser || '?').trim().charAt(0).toUpperCase();
                        headerAvatar.innerText = initial;
                    }
                }
                if (window.NexusMenu) NexusMenu.setUser({ fullName: data.fullName || currentUser, photo: data.userProfilePic || localStorage.getItem('userProfilePic') || '' });
            }
        }).catch((err) => { console.error("Error fetching user data:", err); });
    }

    _socialNavScrollReset();
    window.addEventListener('scroll', _socialNavScrollHandler, { passive: true });
}

// destroySocialPage(): ana kiran wannan daga NexusRouter kafin a bar
// social.html zuwa wata page, domin rufe duk real-time listeners masu
// dogaro da DOM elements na wannan page (in ba haka ba, listeners din
// za su ci gaba da aiki a boye kan elements da suka riga sun bace).
function destroySocialPage() {
    if (window.NexusMenu) NexusMenu.destroy();
    document.body.style.overflow = '';
    if (feedUnsub) { feedUnsub(); feedUnsub = null; }
    if (liveViewersUnsub) { liveViewersUnsub(); liveViewersUnsub = null; }
    if (liveChatUnsub) { liveChatUnsub(); liveChatUnsub = null; }
    if (watchViewersUnsub) { watchViewersUnsub(); watchViewersUnsub = null; }
    if (watchChatUnsub) { watchChatUnsub(); watchChatUnsub = null; }
    window.removeEventListener('scroll', _socialNavScrollHandler);
    _socialNavScrollReset();
}

function _nxRegisterSocialPage() {
    if (window.NexusRouter) {
        NexusRouter.registerPage('social.html', { init: initSocialPage, destroy: destroySocialPage });
    }
}
_nxRegisterSocialPage();
window.addEventListener('DOMContentLoaded', function () {
    _nxRegisterSocialPage();
    initSocialPage();
});

// Ana kiran wannan daga router.js (danna home icon yayin muna can tuni,
// ko "back" na biyu yayin muna home) — domin sabbin posts su bayyana,
// tare da komawa saman feed din, kamar Instagram.
window.refreshSocialFeed = function () {
    if (!currentUser) return;
    if (feedUnsub) { feedUnsub(); feedUnsub = null; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderNexusFeed();
};

      // ============================================================
      // OPTIMIZED FEED RENDERING
      // - Nuna skeleton / cached HTML nan take (babu farin allo)
      // - .limit() maimakon dukkan database
      // - saved_posts da posts suna gudu a layi daya (parallel)
      // - Babu N+1 queries: fullName/userProfilePic/commentCount
      //   sun riga sun kasance a cikin kowane post document
      // ============================================================
      // Plain JSON -> Firestore values (inverse of nxSerialize in login.html)
      function nxRevive(v) {
          if (v === null || typeof v !== 'object') return v;
          if (Array.isArray(v)) return v.map(nxRevive);
          if (v.__nxts) return new firebase.firestore.Timestamp(v.__nxts[0], v.__nxts[1]);
          if (v.__nxgp) return new firebase.firestore.GeoPoint(v.__nxgp[0], v.__nxgp[1]);
          if (v.__nxref) return db.doc(v.__nxref);
          const o = {}; Object.keys(v).forEach(k => { o[k] = nxRevive(v[k]); }); return o;
      }

      // ============================================================
      // REST FALLBACK: reads the first feed page over plain HTTPS (fetch), so the
      // first paint does NOT depend on the Firestore SDK connecting (which can take
      // 30-40s on a cold/slow network). Same query, same security rules (ID token).
      // ============================================================
      function nxFromValue(v) {
          if (v === null || typeof v !== 'object') return null;
          if ('stringValue' in v) return v.stringValue;
          if ('integerValue' in v) return Number(v.integerValue);
          if ('doubleValue' in v) return Number(v.doubleValue);
          if ('booleanValue' in v) return v.booleanValue;
          if ('nullValue' in v) return null;
          if ('timestampValue' in v) {
              const m = /^(.*?)(?:\.(\d+))?Z$/.exec(v.timestampValue);
              if (!m) return null;
              const seconds = Math.floor(Date.parse(m[1] + 'Z') / 1000);
              const nanos = m[2] ? parseInt((m[2] + '000000000').slice(0, 9), 10) : 0;
              return new firebase.firestore.Timestamp(seconds, nanos);
          }
          if ('geoPointValue' in v) return new firebase.firestore.GeoPoint(v.geoPointValue.latitude || 0, v.geoPointValue.longitude || 0);
          if ('referenceValue' in v) { const i = v.referenceValue.indexOf('/documents/'); return i > -1 ? db.doc(v.referenceValue.slice(i + 11)) : null; }
          if ('mapValue' in v) return nxFromFields(v.mapValue.fields || {});
          if ('arrayValue' in v) return (v.arrayValue.values || []).map(nxFromValue);
          return null;
      }
      function nxFromFields(fields) {
          const o = {};
          Object.keys(fields).forEach(k => { o[k] = nxFromValue(fields[k]); });
          return o;
      }
      async function nxFetchFeedREST(limit) {
          const user = firebase.auth().currentUser || await new Promise(res => {
              let done = false, unsub = null;
              const finish = u => { if (done) return; done = true; if (unsub) unsub(); res(u); };
              unsub = firebase.auth().onAuthStateChanged(finish);
              if (done && unsub) unsub();
              setTimeout(() => finish(null), 15000);
          });
          if (!user) return null;
          const token = await user.getIdToken();
          const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
          const timer = ctrl ? setTimeout(() => ctrl.abort(), 25000) : null;
          try {
              const res = await fetch('https://firestore.googleapis.com/v1/projects/' + firebaseConfig.projectId + '/databases/(default)/documents:runQuery', {
                  method: 'POST',
                  headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ structuredQuery: {
                      from: [{ collectionId: 'posts' }],
                      orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }],
                      limit: limit
                  } }),
                  signal: ctrl ? ctrl.signal : undefined
              });
              if (!res.ok) { console.warn('[NX-PERF] REST feed HTTP', res.status); return null; }
              const rows = await res.json();
              return rows.filter(r => r.document).map(r => ({
                  id: r.document.name.split('/').pop(),
                  data: nxFromFields(r.document.fields || {})
              }));
          } finally { if (timer) clearTimeout(timer); }
      }

      async function renderNexusFeed() {
          const feedContainer = document.querySelector('.feed-container');
          if (!feedContainer) return;
          const t0 = performance.now();

          // Never stack listeners (router + DOMContentLoaded can both call init).
          if (feedUnsub) { feedUnsub(); feedUnsub = null; }
          window.__nxLikedIds = window.__nxLikedIds || new Set();
          feedContainer.__nxLastHTML = null;

          // STEP 1: paint INSTANTLY (0ms) — cached feed or skeleton.
          try { window.userSavedPosts = JSON.parse(localStorage.getItem('nexus_saved_cache') || '[]'); } catch (e) { window.userSavedPosts = []; }
          // 1a) Feed seeded by login.html (plain JSON, no Firestore SDK needed) — used once.
          let seededHTML = '';
          try {
              const seedRaw = localStorage.getItem('nexus_feed_seed');
              if (seedRaw && typeof generatePostHTML === 'function') {
                  JSON.parse(seedRaw).forEach(x => {
                      seededHTML += generatePostHTML({ id: x.id, ...nxRevive(x.data), pinned: false });
                  });
              }
          } catch (e) { console.warn('feed seed failed:', e); seededHTML = ''; }
          localStorage.removeItem('nexus_feed_seed');
          const cachedFeedHTML = seededHTML || localStorage.getItem('nexus_feed_cache_html');
          if (seededHTML) {
              try { localStorage.setItem('nexus_feed_cache_html', seededHTML); } catch (e) {}
              console.log('[NX-PERF] painted from LOGIN SEED', Math.round(performance.now() - t0), 'ms');
          }
          if (cachedFeedHTML) {
              feedContainer.innerHTML = cachedFeedHTML;
              feedContainer.__nxLastHTML = cachedFeedHTML;
              setTimeout(() => postCard_restoreLikes(feedContainer), 100);
              window.postCard_observeVideos && window.postCard_observeVideos();
              console.log('[NX-PERF] cached feed painted', Math.round(performance.now() - t0), 'ms');
          } else {
              feedContainer.innerHTML = renderSkeletonCards(FEED_PAGE_SIZE);
          }

          // STEP 1b: REST fetch (parallel to everything else). Paints as soon as it returns,
          // unless the SDK already delivered fresh SERVER data.
          nxFetchFeedREST(FEED_PAGE_SIZE).then(rows => {
              if (!rows || !rows.length || typeof generatePostHTML !== 'function') return;
              if (!document.body.contains(feedContainer) || feedContainer.__nxServerPainted) return;
              let html = '';
              rows.forEach(x => { html += generatePostHTML({ id: x.id, ...x.data, pinned: false }); });
              feedContainer.__nxRestPainted = true;
              console.log('[NX-PERF] REST feed ready', Math.round(performance.now() - t0), 'ms | docs:', rows.length);
              if (!html || feedContainer.__nxLastHTML === html) return;
              feedContainer.innerHTML = html;
              feedContainer.__nxLastHTML = html;
              try { localStorage.setItem('nexus_feed_cache_html', html); } catch (e) {}
              setTimeout(() => postCard_restoreLikes(feedContainer), 200);
              window.postCard_observeVideos && window.postCard_observeVideos();
          }).catch(e => console.warn('[NX-PERF] REST feed failed:', e));

          // STEP 2: saved_posts runs separately — it NEVER blocks the feed.
          db.collection("saved_posts").where("userId", "==", currentUser).get()
              .then(snap => {
                  const ids = snap.docs.map(d => d.data().postId);
                  const changed = JSON.stringify(ids) !== JSON.stringify(window.userSavedPosts || []);
                  window.userSavedPosts = ids;
                  try { localStorage.setItem('nexus_saved_cache', JSON.stringify(ids)); } catch (e) {}
                  if (changed && feedContainer.__nxLastSnapshot) renderPostsBatch(feedContainer.__nxLastSnapshot, feedContainer, true);
              })
              .catch(e => console.log("Saved posts error:", e));

          // STEP 3: ONE realtime listener. First snapshot comes from the local
          // cache (instant) or the server, whichever is first; later ones update it.
          const postsQuery = db.collection("posts")
              .orderBy("timestamp", "desc")
              .limit(FEED_PAGE_SIZE);
          let first = true;
          console.log('[NX-PERF] listener attached', Math.round(performance.now() - t0), 'ms');
          feedUnsub = postsQuery.onSnapshot((snapshot) => {
              if (first) {
                  console.log('[NX-PERF] first snapshot', Math.round(performance.now() - t0), 'ms | from', snapshot.metadata.fromCache ? 'CACHE' : 'SERVER', '| docs:', snapshot.size);
                  if (!snapshot.empty) lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
                  first = false;
              }
              feedContainer.__nxLastSnapshot = snapshot;
              if (!snapshot.metadata.fromCache) feedContainer.__nxServerPainted = true;
              else if (feedContainer.__nxRestPainted) return;   // REST already showed fresher data
              renderPostsBatch(snapshot, feedContainer);
          }, (err) => {
              console.error('[NX-PERF] listener error after', Math.round(performance.now() - t0), 'ms:', err);
          });

          // STEP 4 removed: postCard_restoreLikes() (post-card-template.js) already runs the
          // likes query after every render — a second identical query only added network load.
      }

      function applyLikedState(feedContainer) {
          (window.__nxLikedIds || new Set()).forEach(postId => {
              const card = feedContainer.querySelector(`.post-card[data-post-id="${postId}"]`);
              if (!card) return;
              const likeBtn = card.querySelectorAll('.capsule')[0];
              if (likeBtn) {
                  likeBtn.classList.add('liked');
                  const icon = likeBtn.querySelector('i');
                  if (icon) { icon.className = 'fa-solid fa-heart'; icon.style.color = '#ff4d6d'; }
              }
          });
      }

      function renderPostsBatch(snapshot, feedContainer, force) {
          if (snapshot.empty) {
              // Empty from LOCAL CACHE only = not confirmed yet; keep what is shown.
              if (snapshot.metadata && snapshot.metadata.fromCache) return;
              feedContainer.innerHTML = '<div class="empty-feed" style="text-align:center; padding:20px; color:#aaa;">No posts yet...</div>';
              feedContainer.__nxLastHTML = null;
              return;
          }

          let allPostsHTML = '';
          snapshot.forEach((doc) => {
              const post = { id: doc.id, ...doc.data() };
              // Main feed never shows the pinned tag.
              allPostsHTML += generatePostHTML({ ...post, pinned: false });
          });

          // Identical to what is already on screen -> skip (no flicker, no work).
          if (!force && feedContainer.__nxLastHTML === allPostsHTML) return;
          feedContainer.__nxLastHTML = allPostsHTML;

          feedContainer.innerHTML = allPostsHTML;
          try { localStorage.setItem('nexus_feed_cache_html', allPostsHTML); } catch (e) {}

          setTimeout(() => postCard_restoreLikes(feedContainer), 200);
          applyLikedState(feedContainer);

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
    // The old dropdown is now the full-screen Nexus Menu (see NEXUS MENU
    // module at the bottom of this file).
    if (window.NexusMenu) NexusMenu.toggle();
}

// Idan aka danna ko'ina a allon bayan dropdown din yana bude, zai rufe da kansa
// GYARA: an kara null-guard domin wannan listener (kamar touchstart/touchend
// a sama) yana zaune a document HAR ABADA (social.js yana loda SAU DAYA
// kacal ta router.js), don haka yana ci gaba da kunna a KOWACE page bayan
// an bar social.html — a can #CyberDropdown/#cyberMenu ba su wanzu ba,
// wanda ke haddasa "Cannot read properties of null (reading 'contains')"
// akan KOWANE click a duk sauran pages, kuma yana iya karya sauran click
// handlers na wancan page tare da shi.
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('CyberDropdown');
    const menuBtn = document.getElementById('cyberMenu');
    if (!dropdown || !menuBtn) return;

    if (!dropdown.contains(event.target) && !menuBtn.contains(event.target)) {
        dropdown.classList.remove('Active');
        menuBtn.classList.remove('is-active');
    }
});

// ============================================================
// NODE ACTIONS — PREMIUM MENU (dynamic owner/viewer + verified-only gating)
// ============================================================
let neuralMenuPostId = null;
let neuralMenuOpening = false;
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
    return `<a href="#" class="sheet-item ${premium ? 'premium-item' : ''}" onclick="event.preventDefault(); ${onclickCode}">
        <i class="fa-solid ${icon} sheet-icon" style="color:${accent};"></i>
        <span class="sheet-text">${text}</span>
    </a>`;
}

async function openNeuralMenu(postId, postUsername) {
    if (neuralMenuOpening) return;
    neuralMenuOpening = true;

    const sheet = document.getElementById('neuralBottomMenu');
    neuralMenuPostId = postId || null;
    const isOwnPost = !!(postUsername && postUsername === currentUser);

    // Kama maballin da aka danna NAN DA NAN (kafin await), domin window.event
    // baya dogaro da kansa bayan wani async gap.
    const triggerEvt = window.event;
    const triggerEl = triggerEvt ? (triggerEvt.currentTarget || triggerEvt.target) : null;

    try {
        await refreshViewerVerification();

        let postData = { username: postUsername };
        try {
            if (postId && typeof db !== 'undefined') {
                const doc = await db.collection('posts').doc(postId).get();
                if (doc.exists) postData = { ...doc.data(), username: postUsername };
            }
        } catch (e) { /* ignore, ci gaba da default */ }

        renderNodeActionsMenu(postId, isOwnPost, postData);

        // Sanya dropdown din kai tsaye a kasan maballin da aka danna, kamar Cyber-Dropdown
        const menuWidth = sheet.offsetWidth || 230;
        const menuHeight = sheet.offsetHeight || 260;
        if (triggerEl && triggerEl.getBoundingClientRect) {
            const rect = triggerEl.getBoundingClientRect();
            let left = rect.right - menuWidth;
            if (left < 8) left = 8;
            if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;

            // Idan babu isashen sarari a KASAN maballin domin duk menu ya
            // bayyana, mu bude shi a SAMAN maballin maimakon — kamar
            // yadda dropdown na dabam-dabam (Twitter/IG) suke yi.
            let top = rect.bottom + 6;
            if (top + menuHeight > window.innerHeight - 8) {
                top = rect.top - menuHeight - 6;
            }
            if (top < 8) top = 8; // idan har haka ma bai isa ba, mu manne sama
            sheet.style.top = top + 'px';
            sheet.style.left = left + 'px';
        } else {
            sheet.style.top = '55px';
            sheet.style.left = (window.innerWidth - menuWidth - 12) + 'px';
        }

        sheet.classList.add('is-open');
        if (navigator.vibrate) navigator.vibrate(20);
    } finally {
        neuralMenuOpening = false;
    }
}

function renderNodeActionsMenu(postId, isOwnPost, postData) {
    const grid = document.getElementById('nodeActionsGrid');
    if (!grid) return;
    let html = '';
    const uname = (postData.username || '').replace(/'/g, "\\'");

    if (isOwnPost) {
        html += nodeItem('fa-thumbtack', postData.pinned ? 'Unpin Post' : 'Pin Post',
            `togglePinFromMenu('${postId}', ${!!postData.pinned})`, '#FFD700', false);
        html += nodeItem('fa-pen', 'Edit Post',
            `editPostFromMenu('${postId}')`, '#00f2fe', false);
        html += nodeItem('fa-share', 'Share',
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
        html += nodeItem('fa-circle-plus', 'Interested',
            `interestedFromMenu('${postId}')`, '#50FA7B', false);
        html += nodeItem('fa-circle-minus', 'Not Interested',
            `notInterestedFromMenu('${postId}')`, '#aaaaaa', false);
        html += nodeItem('fa-bookmark', 'Save Post',
            `postCard_toggleSave(event, '${postId}')`, '#FFD700', false);
        html += nodeItem('fa-star', 'Add to Favourites',
            `favouriteFromMenu('${postId}')`, '#fde08d', false);
        html += nodeItem('fa-user-plus', 'Follow',
            `followToggleFromMenu('${postId}')`, '#1d9bf0', false);
        html += nodeItem('fa-share', 'Share',
            `sharePostFromMenu('${postId}')`, '#00f2fe', false);
        html += nodeItem('fa-circle-info', "Why You're Seeing This",
            `whySeeingFromMenu()`, '#aaaaaa', false);
        html += nodeItem('fa-flag', 'Report',
            `reportFromMenu('${postId}')`, '#ff4d6d', false);
        html += nodeItem('fa-bell', 'Turn On Notifications',
            `turnOnNotificationsFromMenu('${uname}')`, '#50FA7B', false);
        html += nodeItem('fa-link', 'Copy Link',
            `copyLinkFromMenu('${postId}')`, '#00f2fe', false);
        html += nodeItem('fa-bell-slash', 'Mute',
            `muteNodeFromMenu('${uname}')`, '#aaaaaa', false);
        html += nodeItem('fa-shuffle', 'Remix This Post',
            `remixPostFromMenu('${postId}', '${uname}')`, '#fde08d', true);
    }

    grid.innerHTML = html;

    if (!currentUserIsVerified) {
        grid.querySelectorAll('.premium-item').forEach(el => el.remove());
    }
}

function closeNeuralMenu() {
    const sheet = document.getElementById('neuralBottomMenu');
    sheet.classList.remove('is-open');
}

// Rufe NODE ACTIONS dropdown idan an danna ko'ina a wajensa
document.addEventListener('click', function(event) {
    const sheet = document.getElementById('neuralBottomMenu');
    if (!sheet || !sheet.classList.contains('is-open')) return;
    if (!sheet.contains(event.target)) {
        closeNeuralMenu();
    }
});

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
    const msg = currentlyPinned
        ? 'Unpin this post?'
        : 'Pin this post? It will show as pinned inside this group/timeline.';
    if (!confirm(msg)) return;

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

function interestedFromMenu(postId) {
    if (typeof db !== 'undefined' && currentUser) {
        db.collection('signals').add({
            user: currentUser, postId, type: 'interested',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    }
    closeNeuralMenu();
}

function turnOnNotificationsFromMenu(username) {
    if (!username || typeof db === 'undefined' || !currentUser) { closeNeuralMenu(); return; }

    db.collection('post_notifications').doc(`${currentUser}_${username}`).set({
        subscribedBy: currentUser, subscribedTo: username,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => alert(`You'll be notified about new posts from ${username}.`)).catch(() => {});
    closeNeuralMenu();
}

function favouriteFromMenu(postId) {
    if (typeof db !== 'undefined' && currentUser) {
        db.collection('favourites').doc(`${currentUser}_${postId}`).set({
            user: currentUser, postId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    }
    closeNeuralMenu();
}

function followToggleFromMenu(postId) {
    const btn = document.querySelector(`.post-card[data-post-id="${postId}"] .follow-btn-nexus`);
    if (btn) handleFollowBtn(btn);
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


// ============================================================
// NEXUS MENU — full-screen menu + account switcher (v1.0)
// ------------------------------------------------------------
// Everything lives in ONE closure (nothing here can collide with
// the globals of other page scripts). All clicks inside the menu go
// through ONE delegated handler (data-act="...").
//
// Switch account lists, for the signed-in person:
//   - their own account
//   - every PAGE they own or administer        -> switches into the page
//   - every GROUP they own or administer       -> opens the group
//   - every CHANNEL they own or administer     -> opens the channel
// (creatorUsername == me, or adminUsernames contains me)
//
// Active identity is stored in localStorage 'nx_active_identity'
// ({type:'page', id, name, avatar, owner}). While a page is active:
// the menu card + header avatar show the page, and new posts made from
// the composer are published as the page (same fields pages.js uses).
// ============================================================
(function () {
    'use strict';

    var ID_KEY = 'nx_active_identity', LIST_KEY = 'nx_identity_list_v1', SORT_KEY = 'nx_menu_sort';
    var root = null, isOpen = false, hasHist = false, pending = null, fallbackT = null;
    var list = [], listOk = false, loaded = false, loadSeq = 0, lastLoad = 0;
    var user = { fullName: '', photo: '' };
    var sorted = false, toastT = null;

    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function me() {
        try { return (typeof currentUser !== 'undefined' && currentUser) || localStorage.getItem('nexus_user_session') || ''; } catch (e) { return ''; }
    }
    function cachedUser() {
        try {
            var c = JSON.parse(localStorage.getItem('nexus_profile_cache') || '{}');
            return { fullName: c.fullName || '', photo: c.userProfilePic || localStorage.getItem('userProfilePic') || '' };
        } catch (e) { return { fullName: '', photo: '' }; }
    }
    function userName() { return user.fullName || me() || ''; }

    // ---------- identity ----------
    function getActive() {
        try {
            var o = JSON.parse(localStorage.getItem(ID_KEY) || 'null');
            if (o && o.type === 'page' && o.id && o.owner && o.owner === me()) return o;
        } catch (e) {}
        return null;
    }
    function setActive(o, silent) {
        try {
            if (o) localStorage.setItem(ID_KEY, JSON.stringify({ type: o.type, id: o.id, name: o.name, avatar: o.avatar || '', owner: me() }));
            else localStorage.removeItem(ID_KEY);
        } catch (e) {}
        applyHeader(); renderAll(); updateComposer();
        if (!silent) { try { window.dispatchEvent(new CustomEvent('nexus:identitychange', { detail: getActive() })); } catch (e) {} }
    }

    // ---------- small html helpers ----------
    function av(url, name, cls) {
        var ch = (String(name || '?').trim().charAt(0) || '?').toUpperCase();
        return '<span class="nxm-av ' + (cls || '') + '">' + esc(ch) + (url ? '<img src="' + esc(url) + '" alt="" onerror="this.remove()">' : '') + '</span>';
    }
    function toast(msg) {
        var t = document.getElementById('nxmToastG');
        if (!t) { t = document.createElement('div'); t.id = 'nxmToastG'; t.className = 'nxm-toast'; document.body.appendChild(t); }
        t.textContent = msg; void t.offsetWidth; t.classList.add('show');
        clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2300);
    }
    function go(url) {
        try { if (window.NexusRouter && NexusRouter.navigateTo) { NexusRouter.navigateTo(url); return; } } catch (e) {}
        window.location.href = url;
    }

    // ---------- header avatar (top bar) ----------
    function applyHeader() {
        var h = document.querySelector('.header-avatar-placeholder'); if (!h) return;
        var a = getActive();
        var photo = a ? a.avatar : (user.photo || localStorage.getItem('userProfilePic') || '');
        var name = a ? a.name : userName();
        if (photo) h.innerHTML = '<img src="' + esc(photo) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
        else { h.textContent = (String(name || '?').trim().charAt(0) || '?').toUpperCase(); }
    }

    // ---------- composer: "Posting as" ----------
    function updateComposer() {
        var ta = $('postText'); if (!ta) return;
        var el = $('nxPostAs'), a = getActive();
        if (!a) { if (el) el.remove(); return; }
        if (!el) { el = document.createElement('div'); el.id = 'nxPostAs'; el.className = 'nx-post-as'; ta.parentNode.insertBefore(el, ta); }
        el.innerHTML = 'Posting as <b>' + esc(a.name) + '</b>';
    }

    // ---------- data: everything this person owns or administers ----------
    function load(force) {
        var u = me(); if (!u || typeof db === 'undefined') return Promise.resolve();
        if (!force && loaded && Date.now() - lastLoad < 60000) return Promise.resolve();
        var seq = ++loadSeq;
        if (!loaded) {
            try {
                var c = JSON.parse(localStorage.getItem(LIST_KEY) || 'null');
                if (c && c.u === u && Array.isArray(c.l)) { list = c.l; loaded = true; renderAll(); }
            } catch (e) {}
        }
        var kinds = [['pages', 'page'], ['groups', 'group'], ['channels', 'channel']], ok = true, out = [];
        return Promise.all(kinds.map(function (k) {
            var seen = {};
            var qs = [
                db.collection(k[0]).where('creatorUsername', '==', u).limit(50),
                db.collection(k[0]).where('adminUsernames', 'array-contains', u).limit(50)
            ];
            return Promise.all(qs.map(function (q) { return q.get().catch(function () { ok = false; return null; }); })).then(function (rs) {
                rs.forEach(function (s) {
                    if (!s) return;
                    s.forEach(function (d) {
                        if (seen[d.id]) return; seen[d.id] = 1;
                        var x = d.data() || {};
                        out.push({ type: k[1], id: d.id, name: x.name || d.id, avatar: x.avatarUrl || '', role: x.creatorUsername === u ? 'Owner' : 'Admin', verified: !!x.verified });
                    });
                });
            });
        })).then(function () {
            if (seq !== loadSeq) return;
            var order = { page: 0, group: 1, channel: 2 };
            out.sort(function (a, b) { return (order[a.type] - order[b.type]) || String(a.name).localeCompare(String(b.name)); });
            list = out; listOk = ok; loaded = true; lastLoad = Date.now();
            try { localStorage.setItem(LIST_KEY, JSON.stringify({ u: u, l: out })); } catch (e) {}
            // The page the person was using is gone (deleted, or they are no longer an admin).
            var a = getActive();
            if (a && ok && !out.some(function (p) { return p.type === 'page' && p.id === a.id; })) { setActive(null, false); toast('You no longer manage ' + a.name); return; }
            renderAll();
        });
    }

    // ---------- render ----------
    function renderAll() {
        if (!root) return;
        var a = getActive();
        // current identity card
        $('nxmProfAv').innerHTML = a ? av(a.avatar, a.name) : av(user.photo, userName());
        $('nxmName').textContent = a ? a.name : userName();
        $('nxmSub').textContent = a ? 'View page' : 'View your profile';
        // small avatar of "the other side"
        var other = a ? { avatar: user.photo, name: userName() } : (list.filter(function (p) { return p.type === 'page'; })[0] || list[0]);
        $('nxmMini').innerHTML = other ? av(other.avatar, other.name, 'nxm-mini') : '';
        if (other) { $('nxmMini').setAttribute('data-act', 'toggleSwitch'); } else { $('nxmMini').removeAttribute('data-act'); }
        // avatars on the "Switch account" row
        var others = [];
        if (a) others.push({ avatar: user.photo, name: userName() });
        list.forEach(function (p) { if (!(a && p.type === 'page' && p.id === a.id)) others.push(p); });
        if (!others.length) others.push({ avatar: user.photo, name: userName() });
        $('nxmStack').innerHTML = others.slice(0, 2).map(function (p) { return av(p.avatar, p.name); }).join('');
        // panel
        var h = '<div class="nxm-id' + (a ? '' : ' on') + '" data-act="pickUser">' + av(user.photo, userName()) +
            '<div class="nxm-id-t"><div class="nxm-id-n">' + esc(userName()) + '</div><div class="nxm-id-s">Personal account</div></div>' +
            '<span class="nxm-id-r"><span class="nxm-ring"></span></span></div>';
        [['page', 'Pages'], ['group', 'Groups'], ['channel', 'Channels']].forEach(function (g) {
            var rows = list.filter(function (p) { return p.type === g[0]; });
            if (!rows.length) return;
            h += '<div class="nxm-pl">' + g[1] + '</div>';
            rows.forEach(function (p) {
                var on = g[0] === 'page' && a && a.id === p.id;
                h += '<div class="nxm-id' + (on ? ' on' : '') + '" data-act="pick" data-type="' + p.type + '" data-id="' + esc(p.id) + '">' + av(p.avatar, p.name) +
                    '<div class="nxm-id-t"><div class="nxm-id-n">' + esc(p.name) + (p.verified ? ' <i class="fa-solid fa-circle-check nxm-vb"></i>' : '') + '</div>' +
                    '<div class="nxm-id-s">' + (g[0] === 'page' ? 'Page' : g[0] === 'group' ? 'Group' : 'Channel') + ' · ' + p.role + '</div></div>' +
                    '<span class="nxm-id-r">' + (g[0] === 'page' ? '<span class="nxm-ring"></span>' : '<i class="fa-solid fa-chevron-right"></i>') + '</span></div>';
            });
        });
        if (!list.length) h += '<div class="nxm-empty">' + (loaded ? 'Pages, groups and channels you create or manage will appear here.' : 'Loading…') + '</div>';
        $('nxmPanel').innerHTML = h;
    }

    // ---------- open / close (phone Back closes only the menu) ----------
    function showUI() {
        root.classList.add('open'); isOpen = true;
        document.body.style.overflow = 'hidden';
        var f = $('instaFooter'); if (f) f.classList.add('footer-hidden');
        var b = $('cyberMenu'); if (b) b.classList.add('is-active');
    }
    function hideUI() {
        if (!root) return;
        root.classList.remove('open', 'searching', 'none');
        isOpen = false;
        document.body.style.overflow = '';
        var f = $('instaFooter'); if (f) f.classList.remove('footer-hidden');
        var b = $('cyberMenu'); if (b) b.classList.remove('is-active');
        var s = $('nxmSearch'); if (s) { s.value = ''; applySearch(''); }
        var sw = $('nxmSw'); if (sw) sw.classList.remove('open');
        closeSheet();
    }
    function runPending() { var fn = pending; pending = null; if (fn) setTimeout(fn, 0); }
    function open() {
        if (!root) root = $('nxMenu'); if (!root || isOpen) return;
        renderAll(); showUI();
        try { history.pushState({ nexusRoute: 'social.html', nxMenu: 1 }, '', location.href); hasHist = true; } catch (e) { hasHist = false; }
        var sc = $('nxmScroll'); if (sc) sc.scrollTop = 0;
        load();
    }
    function close(after) {
        pending = typeof after === 'function' ? after : null;
        if (!isOpen) { runPending(); return; }
        if (hasHist) {
            try { history.back(); } catch (e) { hasHist = false; hideUI(); runPending(); return; }
            clearTimeout(fallbackT);
            fallbackT = setTimeout(function () { if (isOpen) { hasHist = false; hideUI(); runPending(); } }, 500);
        } else { hideUI(); runPending(); }
    }
    function onPop(e) {
        if (!isOpen) return;
        e.stopImmediatePropagation();
        clearTimeout(fallbackT);
        hasHist = false; hideUI(); runPending();
    }
    function toggle() { if (isOpen) close(); else open(); }

    // ---------- search + sort ----------
    function applySearch(q) {
        if (!root) return;
        q = String(q || '').trim().toLowerCase();
        root.classList.toggle('searching', root.classList.contains('searching') || !!q);
        var shown = 0;
        root.querySelectorAll('[data-label]').forEach(function (el) {
            var hit = !q || String(el.getAttribute('data-label')).indexOf(q) > -1;
            el.classList.toggle('nxm-hidden', !hit);
            if (hit) shown++;
        });
        root.classList.toggle('none', !!q && !shown);
    }
    function applySort() {
        var cards = $('nxmGrid') ? $('nxmGrid').children : [];
        var arr = Array.prototype.slice.call(cards);
        if (sorted) {
            var s = arr.slice().sort(function (a, b) { return String(a.getAttribute('data-label')).localeCompare(String(b.getAttribute('data-label'))); });
            s.forEach(function (el, i) { el.style.order = i; });
        } else { arr.forEach(function (el) { el.style.order = ''; }); }
    }

    // ---------- report a problem ----------
    function closeSheet() { var w = $('nxmShw'); if (w) w.classList.remove('open'); }
    function reportSheet() {
        $('nxmSheet').innerHTML = '<div class="nxm-grab"></div><div class="nxm-sh-t">Report a problem</div>' +
            '<div class="nxm-sh-m">Tell us what went wrong and we will look into it.</div>' +
            '<textarea id="nxmRep" maxlength="1000" placeholder="Describe the problem"></textarea>' +
            '<div class="nxm-btns"><button class="nxm-btn" data-act="sheetClose">Cancel</button><button class="nxm-btn pri" id="nxmRepSend" data-act="sendReport">Send</button></div>';
        $('nxmShw').classList.add('open');
    }
    function sendReport() {
        var ta = $('nxmRep'), txt = ta ? ta.value.trim() : ''; if (!txt) { toast('Please describe the problem'); return; }
        var btn = $('nxmRepSend'); if (btn) btn.disabled = true;
        var a = getActive();
        db.collection('reports').add({
            type: 'problem', message: txt, reporterUsername: me() || null,
            identity: a ? { type: a.type, id: a.id } : null,
            page: location.pathname.split('/').pop(), userAgent: String(navigator.userAgent || '').slice(0, 200),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () { closeSheet(); toast('Thanks, your report was sent'); })
          .catch(function () { if (btn) btn.disabled = false; toast('Could not send. Try again'); });
    }

    // ---------- invite ----------
    function invite() {
        var url = location.origin + location.pathname.replace(/[^\/]*$/, '');
        var text = 'Join me on Oryzon';
        if (navigator.share) { navigator.share({ title: 'Oryzon', text: text, url: url }).catch(function () {}); return; }
        try { navigator.clipboard.writeText(url).then(function () { toast('Invite link copied'); }, function () { toast(url); }); } catch (e) { toast(url); }
    }

    // ---------- click handling ----------
    function onClick(e) {
        var el = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!el || !root.contains(el)) return;
        var act = el.getAttribute('data-act');
        switch (act) {
            case 'close': close(); break;
            case 'toggleSwitch':
                var sw = $('nxmSw'); sw.classList.toggle('open');
                if (sw.classList.contains('open')) { load(); setTimeout(function () { try { sw.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (x) {} }, 30); }
                break;
            case 'profile': {
                var a = getActive();
                close(function () { go(a ? 'pages.html?page=' + encodeURIComponent(a.id) : 'me.html'); });
                break;
            }
            case 'pickUser':
                if (getActive()) { setActive(null); close(function () { toast('Switched to your account'); }); }
                else $('nxmSw').classList.remove('open');
                break;
            case 'pick': {
                var type = el.getAttribute('data-type'), id = el.getAttribute('data-id');
                var p = list.filter(function (x) { return x.type === type && x.id === id; })[0]; if (!p) break;
                if (type === 'page') {
                    var cur = getActive();
                    if (cur && cur.id === id) { $('nxmSw').classList.remove('open'); break; }
                    setActive(p); close(function () { toast('Now using ' + p.name); });
                } else if (type === 'group') { close(function () { go('group.html?group=' + encodeURIComponent(id)); }); }
                else { close(function () { go('channels.html?channel=' + encodeURIComponent(id)); }); }
                break;
            }
            case 'invite': invite(); break;
            case 'go': { var u = el.getAttribute('data-url'); close(function () { go(u); }); break; }
            case 'chats': { var tab = el.getAttribute('data-tab'); try { localStorage.setItem('nexus_active_tab', tab); } catch (x) {} close(function () { go('chats.html'); }); break; }
            case 'ovl': { var ou = el.getAttribute('data-url'); if (typeof window.openPageOverlay === 'function') window.openPageOverlay(ou); break; }
            case 'acc': el.classList.toggle('open'); break;
            case 'report': reportSheet(); break;
            case 'sheetClose': closeSheet(); break;
            case 'sendReport': sendReport(); break;
            case 'sort':
                sorted = !sorted; try { localStorage.setItem(SORT_KEY, sorted ? '1' : '0'); } catch (x) {}
                applySort(); toast(sorted ? 'Shortcuts sorted A to Z' : 'Default order');
                break;
            case 'search': {
                root.classList.add('searching');
                var inp = $('nxmSearch'); if (inp) { inp.value = ''; setTimeout(function () { inp.focus(); }, 30); }
                break;
            }
        }
    }
    // Back arrow while searching just leaves the search.
    function onBackInSearch(e) {
        if (!root || !root.classList.contains('searching')) return;
        var b = e.target.closest ? e.target.closest('.nxm-back') : null;
        if (!b) return;
        e.stopImmediatePropagation(); e.preventDefault();
        var s = $('nxmSearch'); if (s) s.value = '';
        root.classList.remove('searching', 'none'); applySearch('');
    }

    // ---------- lifecycle ----------
    function init() {
        root = $('nxMenu'); if (!root) return;
        var c = cachedUser(); user.fullName = user.fullName || c.fullName; user.photo = user.photo || c.photo;
        if (!root.__nxm) {
            root.__nxm = true;
            root.addEventListener('click', onBackInSearch, true);
            root.addEventListener('click', onClick);
            var si = $('nxmSearch'); if (si) si.addEventListener('input', function () { applySearch(this.value); });
        }
        window.removeEventListener('popstate', onPop, true);
        window.addEventListener('popstate', onPop, true);
        try { sorted = localStorage.getItem(SORT_KEY) === '1'; } catch (e) { sorted = false; }
        isOpen = false; hasHist = false; loaded = false; lastLoad = 0;
        applySort(); applyHeader(); updateComposer(); renderAll();
        load(true);
    }
    function destroy() {
        window.removeEventListener('popstate', onPop, true);
        clearTimeout(fallbackT);
        if (isOpen) hideUI();
        isOpen = false; hasHist = false; pending = null;
    }
    function setUser(d) {
        d = d || {};
        if (d.fullName) user.fullName = d.fullName;
        if (d.photo) user.photo = d.photo;
        applyHeader(); renderAll();
    }

    // The router asks NexusOverlay.isOpen() before handling a popstate.
    (function () {
        var NO = window.NexusOverlay = window.NexusOverlay || {};
        if (NO.__nxmWrapped) return; NO.__nxmWrapped = true;
        var prev = NO.isOpen;
        NO.isOpen = function () { if (isOpen) return true; return typeof prev === 'function' ? prev.apply(NO, arguments) : false; };
    })();

    window.NexusMenu = { init: init, destroy: destroy, open: open, close: close, toggle: toggle, setUser: setUser, getActive: getActive, applyHeader: applyHeader, updateComposer: updateComposer };
    window.nxGetActiveIdentity = getActive;
})();
