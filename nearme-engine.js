// ============================================================
//  ABOKINA NEAR ME ENGINE — v1.0
//  Firebase Realtime DB + Geolocation + Dynamic Radius
// ============================================================

// ────────────────────────────────────────────────────────────
//  1. FIREBASE CONFIG — saka na ku anan
// ────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
  authDomain: "oryzon-50ea4.firebaseapp.com",
  databaseURL: "https://oryzon-50ea4-default-rtdb.firebaseio.com",
  projectId: "oryzon-50ea4",
  storageBucket: "oryzon-50ea4.firebasestorage.app",
  messagingSenderId: "782106742622",
  appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
  measurementId: "G-K5085DLL2W"
};
// ────────────────────────────────────────────────────────────
//  2. FIREBASE REALTIME DB STRUCTURE  (dokokin JSON)
//
//  /providers
//    /{providerId}
//      name:        "Musa Plumbing"
//      phone:       "+234..."
//      category:    "skilled_pro"   ← food | skilled_pro | emergency
//      subcategory: "plumber"       ← chef | electrician | mechanic ...
//      rating:      4.8
//      reviewCount: 42
//      available:   true
//      verified:    true
//      photo:       "https://..."
//      location
//        lat:       11.8806
//        lng:       13.1515
//        updatedAt: 1718000000000   ← timestamp ms
//      pricing
//        base:      2000
//        unit:      "per job"
//
//  /users
//    /{userId}
//      name:        "Amina"
//      phone:       "+234..."
//      location
//        lat:       11.8820
//        lng:       13.1490
//
//  /bookings
//    /{bookingId}
//      userId:      "..."
//      providerId:  "..."
//      status:      "pending" | "confirmed" | "ongoing" | "done"
//      createdAt:   1718000000000
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  3. RADIUS RULES — kamar yadda aka yanke shawara
// ────────────────────────────────────────────────────────────
const RADIUS_RULES = {
  food:        { initial: 5,  steps: [5, 8, 10, 15],       unit: "km" },
  skilled_pro: { initial: 15, steps: [15, 20, 25],          unit: "km" },
  emergency:   { initial: 25, steps: [25, 40, 60, 100],     unit: "km" }
};

// ────────────────────────────────────────────────────────────
//  4. HAVERSINE — nisan tsakanin wurare biyu (km)
// ────────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R   = 6371;                         // Radius of Earth km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a   = Math.sin(dLat / 2) ** 2
            + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
            * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * (Math.PI / 180); }

// ────────────────────────────────────────────────────────────
//  5. GEOLOCATION ENGINE — samu matsayin mai amfani
// ────────────────────────────────────────────────────────────
class GeoEngine {
  constructor() {
    this.userLat  = null;
    this.userLng  = null;
    this.accuracy = null;
    this.watchers = [];
  }

  // Nemi izni kuma samu loca guda ɗaya
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Wannan browser bai goyi bayan GPS ba"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLat  = pos.coords.latitude;
          this.userLng  = pos.coords.longitude;
          this.accuracy = pos.coords.accuracy;       // metres
          resolve({ lat: this.userLat, lng: this.userLng, accuracy: this.accuracy });
        },
        (err) => reject(new Error(this._geoErrorMsg(err))),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }

  // Ci gaba da bin diddigin matsayi (for live updates)
  startWatching(callback) {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        this.userLat = pos.coords.latitude;
        this.userLng = pos.coords.longitude;
        callback({ lat: this.userLat, lng: this.userLng });
      },
      (err) => console.warn("GPS watch error:", err),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    this.watchers.push(id);
    return id;
  }

  stopWatching() {
    this.watchers.forEach(id => navigator.geolocation.clearWatch(id));
    this.watchers = [];
  }

  _geoErrorMsg(err) {
    const msgs = {
      1: "Ka ƙi ba GPS izni. Je Settings ↗ ka kunna.",
      2: "GPS bai samu maka wurin ba. Gwada waje.",
      3: "GPS ya ɗauki lokaci mai yawa. Sake gwadawa."
    };
    return msgs[err.code] || "GPS kuskure.";
  }
}

// ────────────────────────────────────────────────────────────
//  6. NEAR ME SEARCH — dynamic radius expansion
// ────────────────────────────────────────────────────────────
class NearMeSearch {
  constructor(firebaseDatabase) {
    this.db  = firebaseDatabase;   // firebase.database() object
    this.geo = new GeoEngine();
  }

  /**
   * Bincika masu aiki kusa da mai amfani
   * @param {string} category  - "food" | "skilled_pro" | "emergency"
   * @param {string} [subcat]  - "plumber" | "chef" | ...  (optional filter)
   * @param {object} [opts]    - { minResults: 3, forceRadius: null }
   * @returns {Promise<{results: Array, radiusUsed: number}>}
   */
  async search(category, subcat = null, opts = {}) {
    const { minResults = 3, forceRadius = null } = opts;

    // 5a. Samu loca na mai amfani
    let userLoc;
    try {
      userLoc = await this.geo.getCurrentLocation();
    } catch (err) {
      throw new Error("📍 " + err.message);
    }

    // 5b. Zaɓi rules na wannan category
    const rule   = RADIUS_RULES[category] || RADIUS_RULES.skilled_pro;
    const radii  = forceRadius ? [forceRadius] : rule.steps;

    // 5c. Ɗaga duk providers daga Firebase gaba ɗaya
    //     (For production: use Geohash indexing — duba comment a kasa)
    const snapshot = await this.db.ref("providers")
      .orderByChild("category")
      .equalTo(category)
      .once("value");

    const allProviders = [];
    snapshot.forEach(child => {
      const p = { id: child.key, ...child.val() };
      if (p.available && p.location?.lat) allProviders.push(p);
    });

    // 5d. Lissafta nisa kuma tace bisa subcategory
    const withDistance = allProviders
      .filter(p => !subcat || p.subcategory === subcat)
      .map(p => ({
        ...p,
        distanceKm: haversineKm(userLoc.lat, userLoc.lng, p.location.lat, p.location.lng)
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // 5e. Dynamic radius expansion — zai yi kamar Google/Uber
    let results    = [];
    let radiusUsed = radii[0];

    for (const radius of radii) {
      results = withDistance.filter(p => p.distanceKm <= radius);
      radiusUsed = radius;

      if (results.length >= minResults) break;

      // Idan ƙarshen radii an isa, a dawo da abin da ake da shi
      if (radius === radii[radii.length - 1]) break;

      console.log(`ℹ️ ${results.length} results a ${radius}km — faɗaɗa zuwa ${radii[radii.indexOf(radius) + 1]}km`);
    }

    return {
      results,
      radiusUsed,
      userLoc,
      expanded: radiusUsed !== radii[0]     // an faɗaɗa ko a'a?
    };
  }
}

// ────────────────────────────────────────────────────────────
//  7. PROVIDER REGISTRATION — Pro ya saka lambar wurinsa
// ────────────────────────────────────────────────────────────
class ProviderRegistration {
  constructor(firebaseDatabase, firebaseAuth) {
    this.db   = firebaseDatabase;
    this.auth = firebaseAuth;
    this.geo  = new GeoEngine();
  }

  /**
   * Yin rajistar Pro mai aiki
   * @param {object} profile - { name, phone, category, subcategory, pricing }
   */
  async register(profile) {
    const user = this.auth.currentUser;
    if (!user) throw new Error("Dole ka shiga (login) kafin rajista.");

    let loc;
    try {
      loc = await this.geo.getCurrentLocation();
    } catch (e) {
      throw new Error("📍 Ba mu samu loca ba: " + e.message);
    }

    const providerData = {
      ...profile,
      uid:       user.uid,
      available: true,
      verified:  false,
      rating:    0,
      reviewCount: 0,
      location: {
        lat:       loc.lat,
        lng:       loc.lng,
        updatedAt: Date.now()
      },
      createdAt: Date.now()
    };

    await this.db.ref(`providers/${user.uid}`).set(providerData);
    return providerData;
  }

  /**
   * Sabunta loca ta Pro a ko wane lokaci (real-time)
   * Kira wannan function kowace minti 5 ko idan Pro ya motsa
   */
  async updateMyLocation() {
    const user = this.auth.currentUser;
    if (!user) return;

    try {
      const loc = await this.geo.getCurrentLocation();
      await this.db.ref(`providers/${user.uid}/location`).update({
        lat:       loc.lat,
        lng:       loc.lng,
        updatedAt: Date.now()
      });
      console.log("📍 Loca an sabunta:", loc.lat, loc.lng);
    } catch (e) {
      console.warn("Loca update ta kasa:", e.message);
    }
  }

  /**
   * Canza ko Pro yana available ko a'a
   */
  async setAvailability(isAvailable) {
    const user = this.auth.currentUser;
    if (!user) return;
    await this.db.ref(`providers/${user.uid}/available`).set(isAvailable);
  }
}

// ────────────────────────────────────────────────────────────
//  8. UI HELPER — nuna sakamakon bincike a shafi
// ────────────────────────────────────────────────────────────
function renderNearMeResults(containerId, searchResult) {
  const { results, radiusUsed, expanded } = searchResult;
  const box = document.getElementById(containerId);
  if (!box) return;

  if (!results.length) {
    box.innerHTML = `
      <div class="nm-empty">
        <span>😔</span>
        <p>Ba mu samu kowa kusa da kai ba a wannan lokaci.</p>
        <p>Sake gwadawa daga baya ko faɗaɗa bincike.</p>
      </div>`;
    return;
  }

  const expandedNote = expanded
    ? `<div class="nm-expanded-notice">
         ℹ️ Ba mu samu kowa a ƙaramin nisa — mun faɗaɗa zuwa <strong>${radiusUsed}km</strong>
       </div>`
    : "";

  const cards = results.map(p => `
    <div class="nm-card" data-id="${p.id}">
      <img src="${p.photo || 'assets/default-avatar.png'}" alt="${p.name}" class="nm-avatar">
      <div class="nm-info">
        <h3 class="nm-name">${p.name}</h3>
        <span class="nm-sub">${p.subcategory || p.category}</span>
        <div class="nm-meta">
          <span class="nm-dist">📍 ${p.distanceKm.toFixed(1)} km</span>
          ${p.rating > 0 ? `<span class="nm-rating">⭐ ${p.rating} (${p.reviewCount})</span>` : ""}
          ${p.verified ? `<span class="nm-verified">✅ Verified</span>` : ""}
        </div>
        ${p.pricing ? `<p class="nm-price">₦${p.pricing.base.toLocaleString()} ${p.pricing.unit}</p>` : ""}
      </div>
      <button class="nm-book-btn" onclick="handleBook('${p.id}')">Book</button>
    </div>
  `).join("");

  box.innerHTML = `
    ${expandedNote}
    <p class="nm-count">${results.length} masu aiki an samu a nisan ${radiusUsed}km</p>
    <div class="nm-grid">${cards}</div>
  `;
}

// ────────────────────────────────────────────────────────────
//  9. BOOKING HANDLER — mai amfani ya danna "Book"
// ────────────────────────────────────────────────────────────
async function handleBook(providerId) {
  // Replace with your modal/form logic
  const db   = firebase.database();
  const auth = firebase.auth();
  const user = auth.currentUser;

  if (!user) {
    alert("Ka shiga asusun ka (login) kafin yin booking.");
    return;
  }

  const bookingRef = db.ref("bookings").push();
  await bookingRef.set({
    userId:     user.uid,
    providerId,
    status:     "pending",
    createdAt:  Date.now()
  });

  alert("✅ Booking an aika! Mai aiki zai tuntube ka da sauri.");
}

// ────────────────────────────────────────────────────────────
//  10. MAIN INIT — kira wannan daga services.html ɗinka
// ────────────────────────────────────────────────────────────
async function initNearMe(category, subcategory, resultsContainerId) {
  const db      = firebase.database();
  const searcher = new NearMeSearch(db);

  // Nuna loading state
  const box = document.getElementById(resultsContainerId);
  if (box) box.innerHTML = `<div class="nm-loading">📡 Ana nema kusa da ka…</div>`;

  try {
    const result = await searcher.search(category, subcategory);
    renderNearMeResults(resultsContainerId, result);
  } catch (err) {
    if (box) box.innerHTML = `<div class="nm-error">❌ ${err.message}</div>`;
    console.error("Near Me search failed:", err);
  }
}

// ────────────────────────────────────────────────────────────
//  EXPORT (idan kana amfani da module bundler kamar Vite/Webpack)
// ────────────────────────────────────────────────────────────
// export { GeoEngine, NearMeSearch, ProviderRegistration,
//          renderNearMeResults, initNearMe, RADIUS_RULES, haversineKm };

/*
 ╔══════════════════════════════════════════════════════════════╗
 ║  PRODUCTION NOTE: GEOHASH INDEXING                         ║
 ║                                                            ║
 ║  Idan providers sun kai 10,000+, kada ka load duka.        ║
 ║  Yi amfani da GeoFire library (wanda Firebase ya yi):      ║
 ║                                                            ║
 ║    npm install geofire                                     ║
 ║                                                            ║
 ║  GeoFire zai baka KAWAI providers da suke a cikin radius   ║
 ║  kai tsaye daga DB — yana da sauri sosai.                  ║
 ╚══════════════════════════════════════════════════════════════╝
*/
