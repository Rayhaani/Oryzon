/* ============================================================
   NEXUS SERVICE WORKER — sw.js
   ------------------------------------------------------------
   Manufa: idan network ya yanke ko ya yi rauni bayan mai amfani
   ya riga ya ziyarci wata page a baya, sai a nuna masa AININHIN
   copy ɗin da ke cikin cache (CSS/JS/HTML/fonts duka a ciki),
   maimakon "raw" HTML mara-salo.

   TSARI (NETWORK-FIRST GA KOMAI — HTML DA CSS/JS/fonts duka):
   - Kowace GET request (HTML, CSS, JS, fonts, firebase SDK, da
     sauransu): a GWADA NETWORK TUKUN. Idan ya yi nasara, a nuna
     wa mai amfani AININHIN sabon content ɗin nan take, KUMA a
     sabunta cache ɗin da wannan sabon copy — don haka BABU
     bukatar bump CACHE_NAME duk lokacin da ka canza wani file;
     canjinka yana bayyana nan take idan akwai net.
   - Idan network ya kasa (babu net/network ya yanke) SAI a koma
     ga TSOHON copy da ke cikin cache (idan akwai) — wannan shine
     kawai lokacin da cache ke amfani, don haka offline fallback
     ne kawai, ba wata dabara ta "saurin gudu" ba.
   - Firestore/Auth/Realtime-DB calls (ba GET na yau da kullum
     ba, akasari WebSocket/long-polling) BA a taɓa su — Service
     Worker kawai yana kama fetch() na yau da kullum, ba ya
     shafar Firestore SDK.

   CACHE_NAME — a yanzu BA a bukatar bump ɗinsa akan kowace edit
   (network koyaushe yake da fifiko, cache yana sabuntawa ta
   kansa). Ka canza shi kawai idan kana son share tsofaffin
   fayiloli marasa amfani daga cache (maintenance na zaɓi kawai).
   ============================================================ */

const CACHE_NAME = 'nexus-v1'; // <-- KARA lambar wannan duk lokacin da ka canza wani file

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Kawai GET requests — POST/PUT (misali uploads zuwa backend) an bar
    // su su gudana kai-tsaye, babu SW cache a kansu.
    if (req.method !== 'GET') return;

    // HTML navigation (buɗe/refresh wata page) — NETWORK FIRST.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                    return res;
                })
                .catch(() => caches.match(req).then((cached) => cached || caches.match('./chats.html')))
        );
        return;
    }

    // Sauran static assets (CSS/JS/fonts/hotuna, ciki har da firebase SDK
    // da Google Fonts) — NETWORK FIRST, cache kawai a matsayin offline
    // fallback (haka babu bukatar bump CACHE_NAME akan kowace edit).
    event.respondWith(
        fetch(req)
            .then((res) => {
                if (res && res.status === 200) {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                }
                return res;
            })
            .catch(() => caches.match(req))
    );
});
