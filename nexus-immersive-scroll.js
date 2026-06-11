/**
 * Nexus Protocol - Global Standard Video Pagination Logic
 * Developer: Sadiq
 * Description: Manages infinite scroll generation for videos using Firestore cursors.
 */

// State Management don adana gurbin Firestore Cursors
let oldestVideoCursor = null;  // Yana rike da karshen bidiyon da aka yi fetching don Pagination (Scroll Up)
let latestVideoTimestamp = null; // Yana rike da lokacin bidiyo na farko don Refresh (Scroll Down)
let isFetchingVideos = false;    // Kare sabani lokacin da ake cikin fetching process
const VIDEO_LIMIT = 5;          // Adadin bidiyoyin da za a ringa kawowa lokaci guda (Instagram Standard)

// 1. INITIAL FETCH: Fara lodon bidiyoyin farko lokacin da aka bude Immersive Mode
async function initializeImmersiveFeed() {
    if (isFetchingVideos) return;
    isFetchingVideos = true;

    try {
        const snapshot = await db.collection("posts")
            .where("mediaType", "==", "video")
            .orderBy("timestamp", "desc")
            .limit(VIDEO_LIMIT)
            .get();

        if (!snapshot.empty) {
            // Adana na farko don refresh, da na karshe don pagination
            latestVideoTimestamp = snapshot.docs[0].data().timestamp;
            oldestVideoCursor = snapshot.docs[snapshot.docs.length - 1];

            const feedContainer = document.querySelector('.feed-container');
            feedContainer.innerHTML = ''; // Share tsohon hoto idan akwai

            snapshot.forEach((doc) => {
                const post = { id: doc.id, ...doc.data() };
                appendVideoToDOM(post, 'append');
            });

            // Fara lura da bidiyoyin da suka fito fili (Autoplay mechanism)
            if (window.postCard_observeVideos) window.postCard_observeVideos();
        } else {
            console.log("Babu bidiyoyi a halin yanzu.");
        }
    } catch (error) {
        console.error("Kuskure yayin hada feed:", error);
    } finally {
        isFetchingVideos = false;
    }
}

// 2. SCROLL UP (INFINITE PAGINATION): Tura bidiyoyi na baya yayin da aka duba na sama
async function fetchPreviousVideos() {
    if (isFetchingVideos || !oldestVideoCursor) return;
    isFetchingVideos = true;

    console.log("Fetching older videos from Firestore...");

    try {
        const snapshot = await db.collection("posts")
            .where("mediaType", "==", "video")
            .orderBy("timestamp", "desc")
            .startAfter(oldestVideoCursor) // Fara daga inda aka tsaya baya
            .limit(VIDEO_LIMIT)
            .get();

        if (!snapshot.empty) {
            oldestVideoCursor = snapshot.docs[snapshot.docs.length - 1]; // Sabunta cursor

            snapshot.forEach((doc) => {
                const post = { id: doc.id, ...doc.data() };
                appendVideoToDOM(post, 'append'); // Sanya shi a kasan jerin
            });

            // Sabunta Video Observer dinka na tsarin autoplay
            if (window.postCard_observeVideos) window.postCard_observeVideos();
        } else {
            console.log("An kawo duka bidiyoyin dake Firestore.");
            oldestVideoCursor = null; // Babu sauran tsofaffin bidiyoyi
        }
    } catch (error) {
        console.error("Gaza fito da tsoffin bidiyoyi:", error);
    } finally {
        isFetchingVideos = false;
    }
}

// 3. SCROLL DOWN (REFRESH SYSTEM): Fito da sababbin bidiyoyin da aka dora yanzu-yanzu
async function refreshNewVideos() {
    if (isFetchingVideos) return;
    isFetchingVideos = true;

    console.log("Checking for newly uploaded videos...");

    try {
        let query = db.collection("posts")
            .where("mediaType", "==", "video")
            .orderBy("timestamp", "desc");

        // Idan akwai wani bidiyo a kasa, duba na sama da shi kadai
        if (latestVideoTimestamp) {
            query = query.endBefore(latestVideoTimestamp);
        } else {
            query = query.limit(VIDEO_LIMIT);
        }

        const snapshot = await query.get();

        if (!snapshot.empty) {
            // Sabunta mafi sabon lokaci
            latestVideoTimestamp = snapshot.docs[0].data().timestamp;

            // Saka sababbin bidiyoyi a saman feed dinka daya bayan daya (Instagram Style)
            snapshot.docs.reverse().forEach((doc) => {
                const post = { id: doc.id, ...doc.data() };
                appendVideoToDOM(post, 'prepend');
            });

            if (window.postCard_observeVideos) window.postCard_observeVideos();
            console.log(`${snapshot.size} sababbin bidiyoyi sun shigo.`);
        } else {
            console.log("Babu wani sabon bidiyo da aka dora.");
        }
    } catch (error) {
        console.error("Kuskure wurin yin refresh:", error);
    } finally {
        isFetchingVideos = false;
    }
}

// 4. INTEGRATION NODE: Sanya bidiyo a cikin UI dinka (DOM) ba tare da taba CSS ba
function appendVideoToDOM(post, actionType) {
    const feedContainer = document.querySelector('.feed-container');
    if (!feedContainer) return;

    // Amfani da template dinka na asali `generatePostHTML` wanda ke cikin post-card-template.js
    const videoHTML = generatePostHTML(post);
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = videoHTML;
    const cleanElement = wrapper.firstElementChild;

    if (actionType === 'prepend') {
        feedContainer.insertBefore(cleanElement, feedContainer.firstChild); // Don Scroll Down Refresh
    } else {
        feedContainer.appendChild(cleanElement); // Don Scroll Up Pagination
    }
}

// 5. GLOBAL SCROLL LISTENER: Kararrawa mai lura da canjin motsi (Swipe Up / Down)
let lastScrollTop = 0;

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // A. SCROLL UP DETECTOR: Idan mutum yana kusantar kasan allon (Kasa da 200px kusa da kasa)
    if (scrollTop > lastScrollTop) {
        if ((windowHeight + scrollTop) >= (documentHeight - 200)) {
            fetchPreviousVideos(); // Kira Firestore Pagination
        }
    } 
    // B. SCROLL DOWN DETECTOR: Idan ya juyo sama har ya taba 0 (Top Refresh)
    else if (scrollTop < lastScrollTop) {
        if (scrollTop <= 0) {
            refreshNewVideos(); // Fito da newly uploaded videos
        }
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // Gyaran bera na overscroll
}, { passive: true });

// Kunna tsarin gaba daya zaran an sauko dakin immersive mode
document.addEventListener('DOMContentLoaded', () => {
    initializeImmersiveFeed();
});
