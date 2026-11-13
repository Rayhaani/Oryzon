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
    likesCount: 0,
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

              // PRIVACY: stamp whether the author's profile is private (so rules/queries can use it later)
              try { const _pu = await db.collection('users').doc(currentUser).get(); newPostData.authorPrivate = !!(_pu.exists && _pu.data().isPrivate); } catch (e) { newPostData.authorPrivate = false; }
              if (newPostData.pageId) newPostData.authorPrivate = false;   // a page's post is public by nature
              await db.collection("posts").add(newPostData);
              
              nexusRemixTarget = null;
              nxSelectedMediaFiles = []; // NEW — clear the pending selection
              document.getElementById('postText').value = '';
              closePostOverlay();
              nxToast('Your post is live');
              window.scrollTo({ top: 0, behavior: 'smooth' });
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
    // NexusAlgorithm.init() used to draw its own feed over .feed-container and fight the feed engine.
    // Now the engine asks NexusAlgorithm.rank() for the ranked list and draws the cards itself (see nxApplyAlgo).
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
                                               headerAvatar.innerHTML = `<img src="${window.NX_AV_BRAND}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`; 
                    }
                }
                if (window.NexusMenu) NexusMenu.setUser({ fullName: data.fullName || currentUser, photo: data.userProfilePic || localStorage.getItem('userProfilePic') || '', cover: data.userCover || '', verified: !!data.isVerified, followers: data.followerCount || 0, friends: data.friendCount || 0 });
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
    if (typeof nxFeedStop === 'function') nxFeedStop();
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
          // Public posts do not need a sign-in, so the feed is NOT held back while the login token is still being fetched
          // (that token comes from the backend and can take ~10s on a cold start). Signed in already -> send the token.
          let token = null;
          try { const user = firebase.auth().currentUser; if (user) token = await user.getIdToken(); } catch (e) { token = null; }
          const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
          const timer = ctrl ? setTimeout(() => ctrl.abort(), 25000) : null;
          try {
              const run = async (filtered) => {
                  const sq = {
                      from: [{ collectionId: 'posts' }],
                      orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }],
                      limit: limit
                  };
                  if (filtered) sq.where = { fieldFilter: { field: { fieldPath: 'authorPrivate' }, op: 'EQUAL', value: { booleanValue: false } } };
                  return fetch('https://firestore.googleapis.com/v1/projects/' + firebaseConfig.projectId + '/databases/(default)/documents:runQuery', {
                      method: 'POST',
                      headers: token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ structuredQuery: sq }),
                      signal: ctrl ? ctrl.signal : undefined
                  });
              };
              let res = await run(true);                       // public posts only (privacy-filtered)
              if (!res.ok) res = await run(false);             // e.g. index not created yet -> plain query
              if (!res.ok) { console.warn('[NX-PERF] REST feed HTTP', res.status); return null; }
              const rows = await res.json();
              return rows.filter(r => r.document).map(r => ({
                  id: r.document.name.split('/').pop(),
                  data: nxFromFields(r.document.fields || {})
              }));
          } finally { if (timer) clearTimeout(timer); }
      }

      // Skeleton placeholder (was missing from this file -> the feed crashed when there was no cached feed)
      function renderSkeletonCards(count) {
          let html = '';
          for (let i = 0; i < count; i++) html += '<div class="skeleton-card"><div class="skeleton-shimmer"></div></div>';
          return html;
      }

      async function renderNexusFeed() {
          const feedContainer = document.querySelector('.feed-container');
          if (!feedContainer) return;
          const t0 = performance.now();
          nxFeedStart();

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
              feedContainer.__nxRestPainted = true;
              rows.forEach(x => nxPut(x.id, x.data, true, 0));
              nxState.serverSeen = true;
              console.log('[NX-PERF] REST feed ready', Math.round(performance.now() - t0), 'ms | docs:', rows.length);
              nxScheduleRender();
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
          // the feed shows public posts only (posts of private profiles are visible to their friends on the profile)
          const postsQueryPub = db.collection("posts").where('authorPrivate', '==', false)
              .orderBy("timestamp", "desc")
              .limit(FEED_PAGE_SIZE);
          let first = true;
          console.log('[NX-PERF] listener attached', Math.round(performance.now() - t0), 'ms');
          feedUnsub = nxFallbackSub(postsQueryPub, postsQuery, (snapshot) => {
              if (first) {
                  console.log('[NX-PERF] first snapshot', Math.round(performance.now() - t0), 'ms | from', snapshot.metadata.fromCache ? 'CACHE' : 'SERVER', '| docs:', snapshot.size);
                  if (!snapshot.empty) lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
              }
              feedContainer.__nxLastSnapshot = snapshot;
              if (!snapshot.metadata.fromCache) feedContainer.__nxServerPainted = true;
              nxIngestSnapshot(snapshot);
              first = false;
              nxScheduleRender();
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

      // Kept for older callers: the feed engine now renders from its own store (see end of file).
      function renderPostsBatch(snapshot, feedContainer, force) {
          nxScheduleRender();
      }

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
               avatar: localStorage.getItem('userProfilePic') || window.NX_AV_BRAND, 
        name: 'Your Story', time: 'just now',
                slides: [{ img: localStorage.getItem('userProfilePic') || window.NX_AV_BRAND, text: 'Your story' }]
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

const NX_TILE_ICONS = {
    'fa-thumbtack': '<path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4"/><path d="M9 15l-4.5 4.5"/><path d="M14.5 4l5.5 5.5"/>',
    'fa-pen': '<path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"/><path d="M13.5 6.5l4 4"/>',
    'fa-share': '<path d="M13 4v4c-6.575 1.028 -9.02 6.788 -10 12c-.037 .206 5.384 -5.962 10 -6v4l8 -7l-8 -7"/>',
    'fa-link': '<path d="M9 15l6 -6"/><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/>',
    'fa-box-archive': '<path d="M3 6a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2"/><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-10"/><path d="M10 12l4 0"/>',
    'fa-trash-can': '<path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>',
    'fa-comment-slash': '<path d="M8.595 4.577c3.223 -1.176 7.025 -.61 9.65 1.63c2.982 2.543 3.601 6.523 1.636 9.66m-1.908 2.109c-2.787 2.19 -6.89 2.666 -10.273 1.024l-4.7 1l1.3 -3.9c-2.229 -3.296 -1.494 -7.511 1.68 -10.057"/><path d="M3 3l18 18"/>',
    'fa-chart-line': '<path d="M4 19l16 0"/><path d="M4 15l4 -6l4 2l4 -5l4 4"/>',
    'fa-rocket': '<path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3"/><path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3"/><path d="M14 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>',
    'fa-clock': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 7v5l3 3"/>',
    'fa-user-group': '<path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>',
    'fa-circle-plus': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M9 12h6"/><path d="M12 9v6"/>',
    'fa-circle-minus': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M9 12l6 0"/>',
    'fa-bookmark': '<path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4"/>',
    'fa-star': '<g transform="translate(12 12) scale(.92) translate(-12 -12)"><path stroke-width="2.17" d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245"/></g>',
    'fa-user-plus': '<g transform="translate(-2 -.5)"><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M16 19h6"/><path d="M19 16v6"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4"/></g>',
    'fa-circle-info': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/>',
    'fa-flag': '<path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0v-9"/><path d="M5 21v-7"/>',
    'fa-bell': '<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
    'fa-bell-slash': '<path d="M9.346 5.353c.21 -.129 .428 -.246 .654 -.353a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3m-1 3h-13a4 4 0 0 0 2 -3v-3a6.996 6.996 0 0 1 1.273 -3.707"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/><path d="M3 3l18 18"/>',
    'fa-shuffle': '<path d="M18 4l3 3l-3 3"/><path d="M18 20l3 -3l-3 -3"/><path d="M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5"/><path d="M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3"/>'
};

const NX_TILE_LABELS = {"Pin Post": "Pin", "Unpin Post": "Unpin", "Edit Post": "Edit", "Share": "Share", "Copy Link": "Copy", "Move to Archive": "Archive", "Delete Post": "Delete", "Turn On Comments": "Enable comments", "Turn Off Comments": "Disable comments", "View Insights": "Insights", "Boost Post": "Boost", "Remove Boost": "Unboost", "Lock as Time-Capsule": "Time-capsule", "Edit Time-Capsule": "Edit capsule", "Edit Privacy": "Privacy", "Interested": "Interested", "Not Interested": "Not for me", "Save Post": "Save", "Add to Favourites": "Favourite", "Follow": "Follow", "Why You're Seeing This": "Why this?", "Report": "Report", "Turn On Notifications": "Notify me", "Mute": "Mute", "Remix This Post": "Remix"};

// Icon tile (4-column grid). Launin icon yana zuwa ne daga CSS (.sheet-tile) domin ya yi daidai da footer;
// kawai abubuwa masu hatsari (Report / Delete, accent #ff4d6d) suna ja.
function nodeItem(icon, text, onclickCode, accent, premium) {
    const paths = NX_TILE_ICONS[icon] || NX_TILE_ICONS['fa-circle-info'];
    const label = NX_TILE_LABELS[text] || text;
    const danger = accent === '#ff4d6d';
    return `<a href="#" class="sheet-item ${danger ? 'sheet-danger' : ''} ${premium ? 'premium-item' : ''}" title="${text.replace(/"/g, '&quot;')}" onclick="event.preventDefault(); ${onclickCode}">
        <span class="sheet-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>
        <span class="sheet-text">${label}</span>
    </a>`;
}

// Cache na bayanan post (pinned / boosted / ...) domin menu ya bude nan take a budewa ta gaba.
const nxPostDataCache = {};

function nxPositionNeuralMenu(sheet, triggerEl) {
    const menuWidth = sheet.offsetWidth || 230;
    const menuHeight = sheet.offsetHeight || 260;
    if (triggerEl && triggerEl.getBoundingClientRect) {
        const rect = triggerEl.getBoundingClientRect();
        let left = rect.right - menuWidth;
        if (left < 8) left = 8;
        if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;

        // Idan babu isashen sarari a KASAN maballin, mu bude shi a SAMAN maballin.
        let top = rect.bottom + 6;
        if (top + menuHeight > window.innerHeight - 8) {
            top = rect.top - menuHeight - 6;
        }
        if (top < 8) top = 8;
        sheet.style.top = top + 'px';
        sheet.style.left = left + 'px';
    } else {
        sheet.style.top = '55px';
        sheet.style.left = (window.innerWidth - menuWidth - 12) + 'px';
    }
}

function nxMenuState(pd) {
    return JSON.stringify([!!pd.pinned, !!pd.commentsDisabled, !!pd.boosted, !!pd.locked]);
}

async function openNeuralMenu(postId, postUsername) {
    if (neuralMenuOpening) return;
    neuralMenuOpening = true;

    const sheet = document.getElementById('neuralBottomMenu');
    neuralMenuPostId = postId || null;
    const isOwnPost = !!(postUsername && postUsername === currentUser);

    // Kama maballin da aka danna NAN DA NAN (kafin kowane await).
    const triggerEvt = window.event;
    const triggerEl = triggerEvt ? (triggerEvt.currentTarget || triggerEvt.target) : null;

    // ---- BUDEWA NAN TAKE: babu await (babu network) kafin menu ya bayyana ----
    let postData = nxPostDataCache[postId] ? { ...nxPostDataCache[postId], username: postUsername } : { username: postUsername };
    try {
        const cached = JSON.parse(localStorage.getItem('nexus_profile_cache') || '{}');
        if (typeof cached.isVerified === 'boolean') currentUserIsVerified = cached.isVerified;
    } catch (e) { /* ignore */ }

    try {
        renderNodeActionsMenu(postId, isOwnPost, postData);
        nxPositionNeuralMenu(sheet, triggerEl);
        sheet.classList.add('is-open');
        if (navigator.vibrate) navigator.vibrate(20);
    } finally {
        neuralMenuOpening = false;
    }

    // ---- BAYAN HAKA, a bayan fage: tabbatar da verification + sabbin bayanan post ----
    try {
        const verifiedBefore = currentUserIsVerified;
        await refreshViewerVerification();
        let fresh = postData;
        if (postId && typeof db !== 'undefined') {
            const doc = await db.collection('posts').doc(postId).get();
            if (doc.exists) {
                fresh = { ...doc.data(), username: postUsername };
                nxPostDataCache[postId] = fresh;
            }
        }
        // Idan an rufe menu ko an bude na wani post daban, kada a taba komai
        if (neuralMenuPostId !== (postId || null) || !sheet.classList.contains('is-open')) return;
        if (verifiedBefore !== currentUserIsVerified || nxMenuState(fresh) !== nxMenuState(postData)) {
            renderNodeActionsMenu(postId, isOwnPost, fresh);
            nxPositionNeuralMenu(sheet, triggerEl);
        }
    } catch (e) { /* menu ya riga ya bude, ci gaba */ }
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
    const url = nxPostURL(postId);
    if (navigator.share) {
        navigator.share({ title: 'Check this out on Nexus', url }).catch(() => {});
    } else {
        copyLinkFromMenu(postId);
        return;
    }
    closeNeuralMenu();
}

function copyLinkFromMenu(postId) {
    const url = nxPostURL(postId);
    navigator.clipboard.writeText(url).then(() => nxToast('Link copied')).catch(() => alert(url));
    closeNeuralMenu();
}

function notInterestedFromMenu(postId) {
    if (typeof db !== 'undefined' && currentUser) {
        db.collection('signals').add({
            user: currentUser, postId, type: 'not_interested',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    }
    nxHidePost(postId);
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
                       hostAvatar: localStorage.getItem('userProfilePic') || window.NX_AV_BRAND, 
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
// NEXUS MENU — left drawer + account header (v3.0)
// ------------------------------------------------------------
// Everything lives in ONE closure (nothing here can collide with
// the globals of other page scripts). All clicks inside the menu go
// through ONE delegated handler (data-act="...").
//
// Header of the drawer:
//   - only a personal account  -> the profile header (cover, avatar,
//     name, verified / Get Verified, Posts · Followers · Friends),
//     fed by the same user document me.html uses
//   - also owns / administers pages, groups or channels -> a
//     swipeable strip of avatars: personal account first, then every
//     page, group and channel (creatorUsername == me, or
//     adminUsernames contains me). Tap an avatar to open it.
//   - the ACTIVE account (personal or a page) carries a small
//     pencil badge -> opens its edit mode.
//
// Active identity is stored in localStorage 'nx_active_identity'
// ({type:'page', id, name, avatar, owner}). While a page is active,
// new posts from the composer are published as that page.
//
// Performance: opening is a pure transform/opacity transition. All
// DOM for the drawer is built ahead of time (never on tap), the
// history entry is pushed after the first frames, page animations are
// paused while open, and there is no body scroll lock / footer hide.
// ============================================================
(function () {
    'use strict';

    var ID_KEY = 'nx_active_identity', LIST_KEY = 'nx_identity_list_v1', STAT_KEY = 'nx_menu_stats_v1';
    var DEF_COVER = 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1200';
    var PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
    var GOLD = '<svg class="nxm-gb" viewBox="0 0 24 24" fill="#fde08d"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.97-.81-4.08s-2.49-1.46-4.08-1.27c-.66-1.1-1.91-1.81-3.17-1.81s-2.51.71-3.17 1.81c-1.58-.19-3.07.16-4.08 1.27s-1.27 2.69-.81 4.08c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.97.81 4.08s2.49 1.46 4.08 1.27c.66 1.1 1.91 1.81 3.17 1.81s2.51-.71 3.17-1.81c1.58.19 3.07-.16 4.08-1.27s1.27-2.69.81-4.08c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.25L6.85 12.5l1.44-1.44 2.25 2.25 5.27-5.27 1.44 1.44-6.71 6.77z"/></svg>';

    var root = null, isOpen = false, hasHist = false, pending = null, fallbackT = null, loadT = null;
    var list = [], loaded = false, loadSeq = 0, lastLoad = 0, headSig = '', toastT = null;
    var user = { fullName: '', photo: '', cover: '', verified: false, followers: 0, friends: 0, posts: 0 };
    var touch = null, closing = false, spAll = false, spQ = '';

    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function me() {
        try { return (typeof currentUser !== 'undefined' && currentUser) || localStorage.getItem('nexus_user_session') || ''; } catch (e) { return ''; }
    }
    function num(n) { n = Number(n) || 0; try { return n.toLocaleString(); } catch (e) { return String(n); } }
    function thumb(u) { try { return window.npThumbUrl ? window.npThumbUrl(u) : u; } catch (e) { return u; } }
    function userName() { return user.fullName || me() || ''; }

    function cachedUser() {
        var o = { fullName: '', photo: '', cover: '', verified: false, followers: 0, friends: 0, posts: 0 };
        try {
            var c = JSON.parse(localStorage.getItem('nexus_profile_cache') || '{}');
            o.fullName = c.fullName || ''; o.photo = c.userProfilePic || localStorage.getItem('userProfilePic') || '';
            o.cover = localStorage.getItem('userCover') || '';
            var s = JSON.parse(localStorage.getItem(STAT_KEY) || '{}');
            if (s && s.u === me()) { o.followers = s.f || 0; o.friends = s.r || 0; o.posts = s.p || 0; o.verified = !!s.v; }
        } catch (e) {}
        return o;
    }
    function saveStats() {
        try { localStorage.setItem(STAT_KEY, JSON.stringify({ u: me(), f: user.followers, r: user.friends, p: user.posts, v: user.verified ? 1 : 0, t: Date.now() })); } catch (e) {}
    }

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
        applyHeader(); renderHead(); updateComposer();
        if (!silent) { try { window.dispatchEvent(new CustomEvent('nexus:identitychange', { detail: getActive() })); } catch (e) {} }
    }

    // ---------- small helpers ----------
    // The platform avatar (.nx-av): gold crescent + dark circle; photo when there is one, plain dark circle when not.
    var AV_BLANK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23262626'/%3E%3C/svg%3E";
    window.nxmAvFail = function (img) {
        if (img.dataset.orig && !img.dataset.retry) { img.dataset.retry = '1'; img.src = img.dataset.orig; return; }
        img.onerror = null; img.src = AV_BLANK;
    };
    function av(url, size) {
        size = Number(size) || 48;
        var style = size === 48 ? '' : ' style="--nx-av:' + size + 'px"';
        return '<div class="nx-av"' + style + '><img src="' + (url ? esc(thumb(url)) : AV_BLANK) + '" alt="" decoding="async"' + (url ? ' data-orig="' + esc(url) + '" onerror="nxmAvFail(this)"' : '') + '></div>';
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

    // ---------- top bar avatar ----------
    function applyHeader() {
        var h = document.querySelector('.header-avatar-placeholder'); if (!h) return;
        var a = getActive();
        var photo = a ? a.avatar : (user.photo || localStorage.getItem('userProfilePic') || '');
        var name = a ? a.name : userName();
        if (photo) h.innerHTML = '<img src="' + esc(photo) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
                else { h.innerHTML = '<img src="' + window.NX_AV_BRAND + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'; }
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
                        out.push({ type: k[1], id: d.id, name: x.name || d.id, avatar: x.avatarUrl || '', role: x.creatorUsername === u ? 'Owner' : 'Admin' });
                    });
                });
            });
        })).then(function () {
            if (seq !== loadSeq) return;
            if (!ok && loaded) return; // keep what we already show when a query failed
            var order = { page: 0, group: 1, channel: 2 };
            out.sort(function (a, b) { return (order[a.type] - order[b.type]) || String(a.name).localeCompare(String(b.name)); });
            list = out; loaded = true; lastLoad = Date.now();
            try { localStorage.setItem(LIST_KEY, JSON.stringify({ u: u, l: out })); } catch (e) {}
            // The page the person was using is gone (deleted, or they are no longer an admin).
            var a = getActive();
            if (a && ok && !out.some(function (p) { return p.type === 'page' && p.id === a.id; })) { setActive(null, false); toast('You no longer manage ' + a.name); return; }
            renderHead();
        });
    }
    // number of posts (same source as the profile: posts.username == me)
    function refreshPosts() {
        var u = me(); if (!u || typeof db === 'undefined') return;
        try {
            var s = JSON.parse(localStorage.getItem(STAT_KEY) || '{}');
            if (s && s.u === u && s.pt && Date.now() - s.pt < 20 * 60 * 1000) return;
            var q = db.collection('posts').where('username', '==', u);
            var p = (typeof q.count === 'function') ? q.count().get().then(function (r) { return r.data().count; }) : q.get().then(function (r) { return r.size; });
            p.then(function (n) {
                user.posts = n; saveStats();
                try { var o = JSON.parse(localStorage.getItem(STAT_KEY) || '{}'); o.pt = Date.now(); localStorage.setItem(STAT_KEY, JSON.stringify(o)); } catch (e) {}
                renderHead();
            }).catch(function () {});
        } catch (e) {}
    }

    // ---------- header render (built ahead of time, never on tap) ----------
    function stat(n, label) { return '<div class="nxm-st"><b>' + num(n) + '</b><span>' + label + '</span></div>'; }
    function kindLabel(t) { return t === 'page' ? 'Page' : t === 'group' ? 'Group' : 'Channel'; }
    function renderHead() {
        var h = $('nxmHead'); if (!h) return;
        var a = getActive(), name = userName();
        renderSpaces();
        var sig = JSON.stringify([list, a && a.id, user]);
        if (sig === headSig) return; headSig = sig;
        var strip = h.querySelector('.nxm-strip'), keep = strip ? strip.scrollLeft : 0;
        var html = '';
        if (!list.length) {
            html = '<div class="nxm-ph" data-act="profile">' +
                '<div class="nxm-cov"><img src="' + esc(user.cover || DEF_COVER) + '" alt="" decoding="async"></div>' +
                '<div class="nxm-ph-row"><div class="nxm-pav">' + av(user.photo, 72) +
                '<button class="nxm-pen" data-act="edit" aria-label="Edit profile">' + PEN + '</button></div>' +
                '<div class="nxm-ph-t"><div class="nxm-ph-n"><h1 class="nxm-name">' + esc(name) + '</h1>' + GOLD +
                (user.verified ? '' : '<span class="nxm-gv" data-act="gv">Get Verified</span>') + '</div>' +
                '<div class="nxm-stats">' + stat(user.posts, 'Posts') + stat(user.followers, 'Followers') + stat(user.friends, 'Friends') + '</div></div></div></div>';
        } else {
            var items = [{ type: 'user', id: '', name: name, avatar: user.photo, on: !a }].concat(list.map(function (p) {
                return { type: p.type, id: p.id, name: p.name, avatar: p.avatar, on: p.type === 'page' && !!a && a.id === p.id };
            }));
            html = '<div class="nxm-strip" id="nxmStrip">' + items.map(function (p) {
                return '<div class="nxm-ac' + (p.on ? ' on' : '') + '" data-act="acc" data-type="' + p.type + '" data-id="' + esc(p.id) + '">' +
                    '<div class="nxm-ac-r">' + av(p.avatar, 54) +
                    (p.on ? '<button class="nxm-pen" data-act="edit" aria-label="Edit">' + PEN + '</button>' : '') + '</div>' +
                    '<div class="nxm-ac-n">' + esc(p.name) + '</div><div class="nxm-ac-k">' + (p.type === 'user' ? 'You' : kindLabel(p.type)) + '</div></div>';
            }).join('') + '</div>';
        }
        h.innerHTML = html;
        strip = h.querySelector('.nxm-strip');
        if (strip) {
            strip.scrollLeft = keep;
            strip.addEventListener('scroll', function () { stripMask(strip); }, { passive: true });
            requestAnimationFrame(function () { stripMask(strip); });
        }
    }
    function stripMask(s) {
        var more = s.scrollWidth > s.clientWidth + 2;
        var atEnd = s.scrollLeft + s.clientWidth >= s.scrollWidth - 8;
        s.classList.toggle('more', more);
        s.classList.toggle('mid', more && s.scrollLeft > 8 && !atEnd);
        s.classList.toggle('end', more && s.scrollLeft > 8 && atEnd);
    }

    // "Your spaces": every page, group and channel this person manages (only shown when there is at least one)
    function renderSpaces() {
        var wrap = $('nxmSpacesWrap'); if (!wrap) return;
        if (!list.length) { wrap.hidden = true; return; }
        wrap.hidden = false;
        var a = getActive(), q = spQ.trim().toLowerCase(), limit = 5;
        var rows = q ? list.filter(function (p) { return String(p.name).toLowerCase().indexOf(q) > -1; }) : list;
        var shown = (spAll || q) ? rows : rows.slice(0, limit);
        var h = shown.map(function (p) {
            var on = p.type === 'page' && !!a && a.id === p.id;
            return '<div class="nxm-r nxm-sp" data-act="acc" data-type="' + p.type + '" data-id="' + esc(p.id) + '">' +
                av(p.avatar, 20) + '<span class="nxm-t">' + esc(p.name) + '</span>' + (on ? '<span class="nxm-ring"></span>' : '') + '</div>';
        }).join('');
        if (!rows.length) h = '<div class="nxm-empty">No results</div>';
        $('nxmSpaces').innerHTML = h;
        var more = $('nxmMore');
        more.hidden = !!q || rows.length <= limit;
        more.textContent = spAll ? 'Show less' : 'Show more';
    }
    function spaceSearch(on) {
        $('nxmSh').hidden = on; $('nxmSsb').hidden = !on;
        var i = $('nxmSpQ'); i.value = ''; spQ = '';
        if (on) setTimeout(function () { i.focus(); }, 30);
        renderSpaces();
    }

    // ---------- open / close (phone Back closes only the menu) ----------
    function showUI() {
        root.classList.add('open'); root.setAttribute('aria-hidden', 'false'); isOpen = true;
        // Dakatar da animations na feed (class a <html>) yana tilasta browser ya sake lissafin style na DUKKAN feed.
        // Idan aka yi shi a lokacin danna, yana jinkirta firam na farko — don haka sai bayan slide ya kare.
        clearTimeout(root.__pauseT);
        root.__pauseT = setTimeout(function () { if (isOpen) document.documentElement.classList.add('nxm-open'); }, 300);
    }
    function hideUI() {
        if (!root) return;
        root.classList.remove('open', 'drag'); root.setAttribute('aria-hidden', 'true');
        isOpen = false; closing = false;
        clearTimeout(root.__pauseT);
        document.documentElement.classList.remove('nxm-open');
        var dr = $('nxmDr'); if (dr) dr.style.transform = '';
        var ssb = $('nxmSsb'); if (ssb && !ssb.hidden) spaceSearch(false);
        closeSheet();
    }
    function runPending() { var fn = pending; pending = null; if (fn) setTimeout(fn, 0); }
    function open() {
        if (!root) root = $('nxMenu'); if (!root || isOpen) return;
        showUI();
        var sc = $('nxmScroll'); if (sc) sc.scrollTop = 0;
        // Anything that is not the slide itself waits until the first frames are painted.
        requestAnimationFrame(function () { requestAnimationFrame(function () {
            if (!isOpen || hasHist) return;
            try { history.pushState({ nexusRoute: 'social.html', nxMenu: 1 }, '', location.href); hasHist = true; } catch (e) { hasHist = false; }
        }); });
        clearTimeout(loadT); loadT = setTimeout(function () { load(); refreshPosts(); }, 380);
    }
    function close(after) {
        if (closing) { if (typeof after === 'function') pending = after; return; }
        pending = typeof after === 'function' ? after : null;
        if (!isOpen) { runPending(); return; }
        closing = true;
        if (hasHist) {
            try { history.back(); } catch (e) { hasHist = false; hideUI(); runPending(); return; }
            clearTimeout(fallbackT);
            fallbackT = setTimeout(function () { if (isOpen) { hasHist = false; hideUI(); runPending(); } }, 500);
            // start the slide-out right away, do not wait for the popstate
            root.classList.remove('open');
        } else { hideUI(); runPending(); }
    }
    function onPop(e) {
        if (!isOpen) return;
        e.stopImmediatePropagation();
        clearTimeout(fallbackT);
        hasHist = false; hideUI(); runPending();
    }
    function toggle() { if (isOpen) close(); else open(); }

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
            case 'profile': close(function () { go('me.html'); }); break;
            case 'gv': e.stopPropagation(); close(function () { if (typeof window.openPageOverlay === 'function') window.openPageOverlay('get-verified.html'); }); break;
            case 'edit': {
                e.stopPropagation();
                var ac = getActive();
                close(function () { go(ac ? 'pages.html?page=' + encodeURIComponent(ac.id) + '&edit=1' : 'me.html?edit=1'); });
                break;
            }
            case 'acc': {
                var type = el.getAttribute('data-type'), id = el.getAttribute('data-id');
                if (type === 'user') { if (getActive()) setActive(null); close(function () { go('me.html'); }); break; }
                var p = list.filter(function (x) { return x.type === type && x.id === id; })[0]; if (!p) break;
                if (type === 'page') { setActive(p); close(function () { go('pages.html?page=' + encodeURIComponent(id)); }); }
                else if (type === 'group') close(function () { go('group.html?group=' + encodeURIComponent(id)); });
                else close(function () { go('channels.html?channel=' + encodeURIComponent(id)); });
                break;
            }
            case 'spSearch': spaceSearch(true); break;
            case 'spSearchOff': spaceSearch(false); break;
            case 'more': spAll = !spAll; renderSpaces(); break;
            case 'invite': invite(); break;
            case 'ovl': { var ou = el.getAttribute('data-url'); close(function () { if (typeof window.openPageOverlay === 'function') window.openPageOverlay(ou); }); break; }
            case 'report': reportSheet(); break;
            case 'sheetClose': closeSheet(); break;
            case 'sendReport': sendReport(); break;
        }
    }

    // swipe the drawer to the left to close it (the avatar strip keeps its own horizontal swipe)
    function onTouchStart(e) {
        var t = e.touches && e.touches[0]; if (!t) return;
        touch = { x: t.clientX, y: t.clientY, strip: !!(e.target.closest && e.target.closest('.nxm-strip')), done: false };
    }
    function onTouchMove(e) {
        if (!touch || touch.strip || touch.done) return;
        var t = e.touches && e.touches[0]; if (!t) return;
        var dx = t.clientX - touch.x, dy = t.clientY - touch.y;
        if (dx < -64 && Math.abs(dx) > Math.abs(dy) * 1.6) { touch.done = true; close(); }
    }
    function onTouchEnd() { touch = null; }

    // ---------- lifecycle ----------
    function init() {
        root = $('nxMenu'); if (!root) return;
        var c = cachedUser();
        user.fullName = user.fullName || c.fullName; user.photo = user.photo || c.photo; user.cover = user.cover || c.cover;
        user.followers = user.followers || c.followers; user.friends = user.friends || c.friends; user.posts = user.posts || c.posts; user.verified = user.verified || c.verified;
        if (!root.__nxm) {
            root.__nxm = true;
            root.addEventListener('click', onClick);
            var qi = $('nxmSpQ'); if (qi) qi.addEventListener('input', function () { spQ = this.value; renderSpaces(); });
            var dr = $('nxmDr');
            if (dr) {
                dr.addEventListener('touchstart', onTouchStart, { passive: true });
                dr.addEventListener('touchmove', onTouchMove, { passive: true });
                dr.addEventListener('touchend', onTouchEnd, { passive: true });
                dr.addEventListener('touchcancel', onTouchEnd, { passive: true });
            }
        }
        window.removeEventListener('popstate', onPop, true);
        window.addEventListener('popstate', onPop, true);
        isOpen = false; closing = false; hasHist = false; loaded = false; lastLoad = 0; headSig = '';
        // show what we already know (cache) immediately, decide strip vs profile from the cached list
        try {
            var cl = JSON.parse(localStorage.getItem(LIST_KEY) || 'null');
            if (cl && cl.u === me() && Array.isArray(cl.l)) { list = cl.l; loaded = true; } else { list = []; }
        } catch (e) { list = []; }
        applyHeader(); updateComposer(); renderHead();
        load(true);
    }
    function destroy() {
        window.removeEventListener('popstate', onPop, true);
        clearTimeout(fallbackT); clearTimeout(loadT);
        if (isOpen) hideUI();
        isOpen = false; hasHist = false; pending = null;
    }
    function setUser(d) {
        d = d || {};
        if (d.fullName) user.fullName = d.fullName;
        if (d.photo) user.photo = d.photo;
        if (d.cover) user.cover = d.cover;
        if (typeof d.verified === 'boolean') user.verified = d.verified;
        if (d.followers != null) user.followers = d.followers;
        if (d.friends != null) user.friends = d.friends;
        saveStats(); applyHeader(); renderHead();
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

/* ============================================================
   FEED — PHASE 0 FIXES (feed engine)
   5 infinite scroll (no more stop at 12)   7 keyed DOM reconcile
   (no flicker, scroll + videos stay)       9 For You / Following /
   Latest tabs with ranking                  + ?post=ID permalink
   ============================================================ */
const nxState = {
    posts: new Map(), tab: 'foryou', end: false, loading: false, renderQueued: false, serverSeen: false,
    hidden: new Set(), following: new Set(), page: 0, io: null, algoAt: 0
};
nxState.tab = 'foryou';   // one ranked feed, like Instagram's default (no tab buttons)
try { JSON.parse(localStorage.getItem('nx_hidden_posts') || '[]').forEach(function (i) { nxState.hidden.add(i); }); } catch (e) { /* ignore */ }

function nxFeedEl() { return document.querySelector('.feed-container'); }
function nxN(v) { return Number(v) || 0; }
function nxLikesOf(p) { return nxN(p.likesCount != null ? p.likesCount : p.likes); }
function nxCommentsOf(p) { return nxN(p.commentsCount != null ? p.commentsCount : (p.commentCount != null ? p.commentCount : p.comments)); }
function nxCssId(id) { return (window.CSS && CSS.escape) ? CSS.escape(id) : id; }

// ---------- store + ranking ----------
function nxScore(p) {
    const ageH = Math.max(0, (Date.now() - nxTimeMs(p.timestamp)) / 3.6e6);
    let s = (1 + nxLikesOf(p) + 2 * nxCommentsOf(p)) / Math.pow(ageH + 2, 1.35);
    if (nxState.following.has(p.username)) s *= 1.6;
    if (p.boosted) s *= 1.15;
    if (p.mediaUrl || (p.mediaUrls && p.mediaUrls.length)) s *= 1.08;
    if (p.isVerified) s *= 1.04;
    if (p.username === currentUser) s *= 0.85;
    return s;
}
function nxPut(id, data, fromServer, page) {
    const prev = nxState.posts.get(id);
    if (prev && prev.__fromServer && !fromServer) return;                 // stale cache never overwrites fresher data
    const p = Object.assign({}, data, { id: id });
    p.__fromServer = !!fromServer;
    p.__page = prev ? prev.__page : (page || 0);
    p.__rank = prev && prev.__rank != null ? prev.__rank : nxScore(p);   // rank is fixed once → posts don't jump while you read
    nxState.posts.set(id, p);
}
let nxMutedPosts = new Set();
function nxMutedRefresh() {      // "Mute → Posts" from a profile (me.js keeps this cache in sync)
    try { nxMutedPosts = new Set(JSON.parse(localStorage.getItem('nx_muted_posts_' + currentUser) || '[]')); } catch (e) { nxMutedPosts = new Set(); }
}
function nxVisible() {
    const me = currentUser;
    nxMutedRefresh();
    let list = Array.from(nxState.posts.values()).filter(function (p) { return p && p.id && !nxState.hidden.has(p.id) && (!nxMutedPosts.size || p.username === me || !nxMutedPosts.has(p.username)); });
    if (nxState.tab === 'following') list = list.filter(function (p) { return p.username === me || nxState.following.has(p.username); });
    if (nxState.tab === 'foryou') {
        // 0 = posts published AFTER the algorithm ran (new posts show first), 1 = algorithm order, 2 = everything else (older pages)
        const grp = function (p) {
            if (p.__algo != null) return 1;
            if (nxState.algoAt && nxTimeMs(p.timestamp) > nxState.algoAt) return 0;
            return 2;
        };
        list.sort(function (a, b) {
            const ga = grp(a), gb = grp(b);
            if (ga !== gb) return ga - gb;
            if (ga === 0) return nxTimeMs(b.timestamp) - nxTimeMs(a.timestamp);
            if (ga === 1) return a.__algo - b.__algo;
            return (a.__page - b.__page) || (b.__rank - a.__rank);
        });
    }
    else list.sort(function (a, b) { return nxTimeMs(b.timestamp) - nxTimeMs(a.timestamp); });
    return list;
}
function nxSig(p) {   // things that change how a card LOOKS (counts are patched in place, never re-render the card)
    return JSON.stringify([p.content || p.text || p.caption || p.body, p.mediaUrl, p.mediaType, p.mediaUrls, p.locked, p.lockedTitle,
        p.lockedSubtitle, p.unlockAt ? nxTimeMs(p.unlockAt) : 0, p.boosted, p.repostOf, p.repostSnapshot, p.userProfilePic, p.fullName,
        p.isVerified, p.location, p.translatable, p.commentsDisabled, p.username, p.pageId, p.pinned]);
}

// ---------- keyed reconcile ----------
function nxReconcile(container, items) {
    const existing = new Map();
    Array.from(container.children).forEach(function (ch) {
        if (ch.classList.contains('post-card')) existing.set(ch.dataset.postId, ch); else ch.remove();
    });
    let prev = null;
    items.forEach(function (it) {
        let el = existing.get(it.id); existing.delete(it.id);
        if (!el || el.__nxSig !== it.sig) {
            const tmp = document.createElement('div');
            tmp.innerHTML = it.html().trim();
            const n = tmp.firstElementChild;
            if (!n) return;
            n.__nxSig = it.sig;
            if (el && el.parentNode === container) container.replaceChild(n, el);
            el = n;
        }
        const want = prev ? prev.nextElementSibling : container.firstElementChild;
        if (want !== el) container.insertBefore(el, want);
        prev = el;
    });
    existing.forEach(function (el) { el.remove(); });
}
function nxPatchCounts(el, p) {
    if (!(el.__nxLikeTs && Date.now() - el.__nxLikeTs < 6000)) {
        const sp = el.querySelector('.post-capsule[data-nx="like"] span');
        if (sp) sp.textContent = nxLikesOf(p);
    }
    const cc = el.querySelector('[id^="comment-count-"]');
    if (cc) cc.textContent = nxCommentsOf(p);
}
function nxFeedRender() {
    nxState.renderQueued = false;
    const c = nxFeedEl(); if (!c || typeof generatePostHTML !== 'function') return;
    const list = nxVisible();
    nxReconcile(c, list.map(function (p) {
        return { id: p.id, sig: nxSig(p), html: function () { return generatePostHTML(Object.assign({}, p, { pinned: false })); } };
    }));
    list.forEach(function (p) {
        const el = c.querySelector('.post-card[data-post-id="' + nxCssId(p.id) + '"]');
        if (el) nxPatchCounts(el, p);
    });
    if (!list.length && nxState.serverSeen) {
        const d = document.createElement('div'); d.className = 'nx-feed-empty';
        d.textContent = nxState.tab === 'following' ? 'Follow people to see their posts here.' : 'No posts yet.';
        c.appendChild(d);
    }
    try {
        if (nxState.tab !== 'following' && list.length) {
            localStorage.setItem('nexus_feed_cache_html', Array.from(c.children).slice(0, FEED_PAGE_SIZE).map(function (x) { return x.outerHTML; }).join(''));
        }
    } catch (e) { /* storage full */ }
    postCard_hydrate(c);
    try { if (window.NexusAlgorithm && NexusAlgorithm.trackCards) NexusAlgorithm.trackCards(c); } catch (e) { /* optional */ }
    window.postCard_observeVideos && window.postCard_observeVideos();
    setTimeout(function () { window.postCard_handleVideoPriority && window.postCard_handleVideoPriority(); }, 300);
    nxUpdateFoot();
    nxMaybeMore();
}
function nxScheduleRender() {
    if (nxState.renderQueued) return;
    nxState.renderQueued = true;
    requestAnimationFrame(nxFeedRender);
}

// ---------- tabs + footer marker ----------
function nxEnsureUI() {
    const c = nxFeedEl(); if (!c || document.getElementById('nxFeedFoot')) return;
    if (!document.getElementById('nx-feedui-style')) {
        const st = document.createElement('style'); st.id = 'nx-feedui-style';
        st.textContent = [
            '#nxFeedTabs{display:flex;align-items:center;gap:8px;padding:10px 12px 6px}',
            '#nxFeedTabs .nx-tab{background:#12151b;border:1px solid #30363d;color:#8a8b92;border-radius:20px;padding:7px 14px;font:600 13px Inter,sans-serif;cursor:pointer}',
            '#nxFeedTabs .nx-tab.on{background:#fff;color:#000;border-color:#fff}',
            '#nxFeedFoot{text-align:center;color:#7d8590;font:500 13px Inter,sans-serif;padding:22px 0 90px}',
            '.nx-feed-empty{text-align:center;color:#8a8b92;padding:40px 20px;font:500 14px Inter,sans-serif}'
        ].join('\n');
        document.head.appendChild(st);
    }

    const foot = document.createElement('div'); foot.id = 'nxFeedFoot'; foot.innerHTML = '<span></span><div id="nxSentinel" style="height:1px"></div>';
    c.parentNode.insertBefore(foot, c.nextSibling);
    nxPaintTabs();
    if ('IntersectionObserver' in window) {
        nxState.io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) nxLoadMore(); }, { rootMargin: '900px 0px' });
        nxState.io.observe(document.getElementById('nxSentinel'));
    }
}
function nxPaintTabs() {
    document.querySelectorAll('#nxFeedTabs .nx-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === nxState.tab); });
}
function nxSetTab(t) {
    if (t === nxState.tab) return;
    nxState.tab = t; try { localStorage.setItem('nx_feed_tab', t); } catch (e) { /* ignore */ }
    nxPaintTabs(); nxFeedRender();
    window.scrollTo({ top: 0, behavior: 'auto' });
}
function nxUpdateFoot() {
    const f = document.getElementById('nxFeedFoot'); if (!f) return;
    const sp = f.querySelector('span'); if (!sp) return;
    if (nxState.loading) sp.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    else if (nxState.end && nxState.posts.size > 0) sp.innerHTML = '<i class="fa-solid fa-circle-check"></i> You\u2019re all caught up';
    else sp.textContent = '';
}

// ---------- ingest + infinite scroll ----------
function nxIngestSnapshot(snapshot) {
    const fromServer = !snapshot.metadata.fromCache;
    if (fromServer) nxState.serverSeen = true;
    snapshot.docChanges().forEach(function (ch) {
        if (ch.type === 'removed') { nxState.posts.delete(ch.doc.id); return; }
        nxPut(ch.doc.id, ch.doc.data(), fromServer, 0);
    });
}
async function nxLoadMore() {
    if (nxState.loading || nxState.end || !lastVisibleDoc || typeof db === 'undefined') return;
    nxState.loading = true; nxUpdateFoot();
    try {
        let snap;
        try { snap = await db.collection('posts').where('authorPrivate', '==', false).orderBy('timestamp', 'desc').startAfter(lastVisibleDoc).limit(FEED_PAGE_SIZE).get(); }
        catch (e) { snap = await db.collection('posts').orderBy('timestamp', 'desc').startAfter(lastVisibleDoc).limit(FEED_PAGE_SIZE).get(); }
        if (snap.empty) nxState.end = true;
        else {
            nxState.page += 1;
            snap.docs.forEach(function (d) { nxPut(d.id, d.data(), true, nxState.page); });
            lastVisibleDoc = snap.docs[snap.docs.length - 1];
            if (snap.size < FEED_PAGE_SIZE) nxState.end = true;
        }
    } catch (e) { console.warn('load more failed:', e); }
    nxState.loading = false;
    nxFeedRender();
}
function nxMaybeMore() {
    const s = document.getElementById('nxSentinel');
    if (!s || nxState.end || nxState.loading || !nxState.serverSeen) return;
    if (s.getBoundingClientRect().top < window.innerHeight + 900) setTimeout(nxLoadMore, 0);
}
async function nxLoadFollowingSet() {
    const m = await nxLoadFollowing();
    nxState.following = new Set(Array.from(m.keys()));
    nxScheduleRender();
}

// PRIVACY helper: listen with the privacy-filtered query first; if it fails (e.g. composite index not created yet)
// fall back to the plain query so nothing ever goes blank.
function nxFallbackSub(primary, fallback, next, errCb) {
    let un = null, dead = false;
    un = primary.onSnapshot(next, function (err) {
        console.warn('[privacy] filtered listener failed, using the plain query:', err && err.code);
        if (dead) return;
        try { un && un(); } catch (e) {}
        un = fallback.onSnapshot(next, errCb);
    });
    return function () { dead = true; try { un && un(); } catch (e) {} };
}

// PRIVACY INIT: (1) refresh my muted-posts list, (2) one-time, silent: stamp `authorPrivate` on MY OLD posts
// (only the owner may edit a post, so every user migrates their own posts the first time they open the feed).
async function nxPrivacyInit() {
    try {
        const me = currentUser; if (!me || typeof db === 'undefined') return;
        const us = await db.collection('users').doc(me).get();
        const d = us.exists ? us.data() : {};
        try { localStorage.setItem('nx_muted_posts_' + me, JSON.stringify(d.mutedPostUsers || [])); localStorage.setItem('nx_is_private', d.isPrivate ? '1' : '0'); } catch (e) {}
        nxScheduleRender();
        // uidMap/{uid} -> username (lets the rules know WHO is reading), and friend grants (see nxReconcileFriendGrants)
        // one-time write per device (not on every login)
        try {
            const cu = firebase.auth().currentUser;
            const mk = 'nx_uidmap_' + (cu && cu.uid) + '_' + me;
            if (cu && cu.uid && !localStorage.getItem(mk)) {
                await db.collection('uidMap').doc(cu.uid).set({ username: me }, { merge: true });
                localStorage.setItem(mk, '1');
            }
        } catch (e) { console.warn('[privacy] uidMap skipped:', e && e.message); }
        // friend grants: at most once every 12 hours, and only AFTER the feed is on screen (never competes with login)
        try {
            const gk = 'nx_grants_at_' + me, last = +localStorage.getItem(gk) || 0;
            if (Date.now() - last > 12 * 3600 * 1000) {
                setTimeout(function () { nxReconcileFriendGrants(me); try { localStorage.setItem(gk, String(Date.now())); } catch (e) {} }, 15000);
            }
        } catch (e) {}
        const key = 'nx_priv_mig_v1_' + me;
        if (localStorage.getItem(key)) return;
        await new Promise(function (r) { setTimeout(r, 20000); });   // one-time stamping runs well after login
        const priv = !!d.isPrivate; let last = null, total = 0;
        for (;;) {
            let q = db.collection('posts').where('username', '==', me).limit(400);
            if (last) q = q.startAfter(last);
            const snap = await q.get();
            if (snap.empty) break;
            const batch = db.batch(); let n = 0;
            snap.forEach(function (doc) {
                const x = doc.data();
                if (typeof x.authorPrivate === 'boolean') return;
                batch.update(doc.ref, { authorPrivate: (x.groupId || x.pageId || x.channelId) ? false : priv }); n++;
            });
            if (n) { await batch.commit(); total += n; }
            last = snap.docs[snap.docs.length - 1];
            if (snap.size < 400) break;
        }
        localStorage.setItem(key, '1');
        if (total) console.log('[privacy] stamped authorPrivate on', total, 'of my posts');
    } catch (e) { console.warn('[privacy] init skipped:', e && e.message); }
}
// Friend grants: users/{me}/friendList/{friend} = "this person may see my friends-only posts".
// Only the owner can write their own subcollection, so only I can ever grant access to MY posts.
async function nxReconcileFriendGrants(me) {
    try {
        const fs = await db.collection('friends').where('users', 'array-contains', me).get();
        const want = new Set();
        fs.forEach(function (d) { (d.data().users || []).forEach(function (u) { if (u && u !== me) want.add(u); }); });
        const cur = await db.collection('users').doc(me).collection('friendList').get();
        const have = new Set(); cur.forEach(function (d) { have.add(d.id); });
        const batch = db.batch(); let n = 0;
        want.forEach(function (u) { if (!have.has(u)) { batch.set(db.collection('users').doc(me).collection('friendList').doc(u), { at: Date.now() }); n++; } });
        have.forEach(function (u) { if (!want.has(u)) { batch.delete(db.collection('users').doc(me).collection('friendList').doc(u)); n++; } });
        if (n) await batch.commit();
    } catch (e) { console.warn('[privacy] friend grants skipped:', e && e.message); }
}
// Ranked list from nexus-algorithm.js (following 55% / interests 30% / trending / fresh), drawn by the engine.
async function nxApplyAlgo() {
    if (typeof NexusAlgorithm === 'undefined' || !NexusAlgorithm.rank || !currentUser) return;
    try {
        const ranked = await NexusAlgorithm.rank(currentUser);
        if (!ranked || !ranked.length || !nxFeedEl()) return;
        nxState.algoAt = Date.now();
        ranked.forEach(function (p, i) {
            const data = Object.assign({}, p); delete data.id;
            nxPut(p.id, data, true, 0);
            const s = nxState.posts.get(p.id); if (s) s.__algo = i;
        });
        nxState.serverSeen = true;
        nxFeedRender();
    } catch (e) { console.warn('NexusAlgorithm.rank failed — showing the normal feed:', e); }
}
window.nxOnFollowChanged = function () {
    if (window.__nxFollowing) nxState.following = new Set(Array.from(window.__nxFollowing.keys()));
    nxScheduleRender();
};
function nxHidePost(id) {          // "Not interested" — stays hidden after the next refresh too
    nxState.hidden.add(id);
    try { localStorage.setItem('nx_hidden_posts', JSON.stringify(Array.from(nxState.hidden).slice(-500))); } catch (e) { /* ignore */ }
    nxScheduleRender();
}

// ---------- permalink: social.html?post=ID ----------
window.nxOpenPermalink = async function (id) {
    if (!id || typeof db === 'undefined') return;
    const body = nxSheet('Post', '<div class="nx-empty-s">Loading…</div>', { full: true });
    try {
        const doc = await db.collection('posts').doc(id).get();
        if (!doc.exists) { body.innerHTML = '<div class="nx-empty-s">This post is no longer available</div>'; return; }
        body.innerHTML = generatePostHTML(Object.assign({ id: doc.id }, doc.data(), { pinned: false }));
        postCard_hydrate(body);
        window.postCard_observeVideos && window.postCard_observeVideos();
    } catch (e) { body.innerHTML = '<div class="nx-empty-s">Could not open this post</div>'; }
};

function nxFeedStart() {
    nxState.end = false; nxState.loading = false; nxState.page = 0; nxState.serverSeen = false;
    nxEnsureUI(); nxPaintTabs();
    nxLoadFollowingSet();
    setTimeout(nxPrivacyInit, 3000);   // after the first paint, never during login
    setTimeout(nxApplyAlgo, 0);
    const pid = (function () { try { return new URLSearchParams(location.search).get('post'); } catch (e) { return null; } })();
    if (pid && window.__nxPermDone !== pid) { window.__nxPermDone = pid; setTimeout(function () { nxOpenPermalink(pid); }, 400); }
}
function nxFeedStop() {
    if (nxState.io) { nxState.io.disconnect(); nxState.io = null; }
    nxState.posts.clear();
}
