/* ============================================================
   SERVICES PAGE MODULE — services.js  (v1.0)
   ------------------------------------------------------------
   An fitar da wannan daga inline <script> blocks (5 daban-daban)
   na services.html, domin NexusRouter ya iya loda shi ta
   loadScriptOnce() sannan ya kira initServicesPage()/
   destroyServicesPage() a duk lokacin SPA navigation.

   Yana amfani da GLOBALS din nexus-core.js: currentUser, db,
   storage, analytics, BACKEND_URL, firebase (app+database+
   messaging compat SDKs). Kada a sake ayyana su a nan.
   ============================================================ */
(function(){
const __servicesInitCallbacks = [];
function runOnServicesInit(fn) { __servicesInitCallbacks.push(fn); }
       // Core Static Local Data Context Stores Verbatim
let CATEGORIES = [
    { id: "plumber", label: "Plumber", icon: "🔧" },
    { id: "electrician", label: "Electrician", icon: "⚡" },
    { id: "carpenter", label: "Carpenter", icon: "🪚" },
    { id: "chef", label: "Chef / Cook", icon: "🍳" },
    { id: "snacks", label: "Snacks Vendor", icon: "🧁" },
    { id: "beverages", label: "Drinks & Beverages", icon: "🥤" },
    { id: "painter", label: "Painter", icon: "🎨" },
    { id: "mason", label: "Mason / Builder", icon: "🧱" },
    { id: "welder", label: "Welder", icon: "🔩" },
    { id: "mechanic", label: "Auto Mechanic", icon: "🚗" },
    { id: "ac_tech", label: "AC Technician", icon: "❄️" },
    { id: "tailor", label: "Tailor", icon: "🧵" },
    { id: "hvac", label: "HVAC Engineer", icon: "💨" },
    { id: "cleaner", label: "Professional Cleaner", icon: "🧹" },
    { id: "doctor", label: "Doctor", icon: "🩺" },
    { id: "veterinary", label: "Veterinary Doctor", icon: "🐄" }
];

// CURRENCIES, getCurrencySymbol(), formatPrice(), da currency picker
// functions (renderCurrencyList, filterCurrencyList, openCurrencyPicker,
// closeCurrencyPicker, selectCurrency, buildCurrencyDropdownHtml,
// populateCurrencyDropdowns) an koma ajiye su a currency-data.js — an
// loda shi a services.html KAFIN wannan file, don haka duk ana samun
// su nan yadda ya kamata ba tare da an sake ayyana su a nan ba.

const PRO_STORIES = [
    { proId: 1, stories: [{ name: "Plumbing Job", icon: "🔧", price: "₦3,500", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" }] },
    { proId: 2, stories: [{ name: "Solar Setup", icon: "⚡", price: "₦5,000", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&q=80" }] },
    { proId: 3, stories: [{ name: "Wardrobe Build", icon: "🪚", price: "₦4,200", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80" }] },
    { proId: 4, stories: [
        { name: "Jollof Rice", icon: "🍛", price: "₦2,200", image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&q=80" },
        { name: "Danwake", icon: "🥣", price: "₦1,500", image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80" }
    ]},
    { proId: 5, stories: [
        { name: "Small Chops", icon: "🍢", price: "₦2,500", image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&q=80" },
        { name: "Fresh Donuts", icon: "🍩", price: "₦500", image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80" }
    ]},
    { proId: 6, stories: [
        { name: "Kunu Aya", icon: "🥛", price: "₦300", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80" },
        { name: "Zobo", icon: "🍷", price: "₦250", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80" }
    ]}
];

const PROS = [
    {
        id: 1, name: "Malam Sule Ibrahim", username: "Sule", category: "plumber", display_cat: "Plumbing Expert",
        rating: 4.9, reviews: 134, distance: 0.8, city: "Kano", address: "Sabon Gari, Kano", verified: true,
        avatar: "SI", color: "linear-gradient(135deg, #059669 0%, #047857 100%)", jobs: 312, price: "₦3,500",
        bio: "Highly skilled professional with over 12 years of experience in modern plumbing networks and quantum fluid systems.",
        skills: ["Leak Detection", "Pipe Layering", "Smart Drainage"], online: true,
      gallery: ["Main Pipeline Fit", "Commercial Restroom Set", "Smart Drain Valve Setup", "Underground Leak Fix"],
        services: [
            { name: "Tap & Faucet Repair", desc: "Fixing leaking taps and faucets", icon: "🚰", category: "Repair & Maintenance", pricingType: "flat", price: 2500 },
            { name: "Toilet Unclogging", desc: "Clearing blocked toilets and drains", icon: "🚽", category: "Repair & Maintenance", pricingType: "flat", price: 3500 },
            { name: "Pipe Fitting", desc: "Installation of new water supply pipes", icon: "🔧", category: "Installation", pricingType: "flat", price: 8000 },
            { name: "Full Bathroom Plumbing", desc: "Complete plumbing setup for new bathrooms", icon: "🛁", category: "Installation", pricingType: "tiered",
                tiers: [
                    { name: "Basic", price: 35000, delivery: "3 days", includes: ["Standard fittings", "Basic drainage"] },
                    { name: "Standard", price: 60000, delivery: "2 days", includes: ["Premium fittings", "Smart drainage system"] },
                    { name: "Premium", price: 100000, delivery: "1 day", includes: ["Luxury fittings", "Full leak-proof system", "1 year warranty"] }
                ]
            },
            { name: "Underground Leak Detection & Fix", desc: "Locating and repairing hidden underground leaks", icon: "🔍", category: "Emergency Services", pricingType: "tiered",
                tiers: [
                    { name: "Basic", price: 15000, delivery: "Same day", includes: ["Leak detection", "Minor repair"] },
                    { name: "Standard", price: 30000, delivery: "Same day", includes: ["Leak detection", "Full pipe replacement (single section)"] },
                    { name: "Premium", price: 55000, delivery: "Same day", includes: ["Full network inspection", "Complete pipe replacement", "3 month warranty"] }
     ]
            }
        ]
    },
    {
        id: 2, name: "Alhaji Bello Musa", username: "Bello", category: "electrician", display_cat: "Electrical Engineer",
        rating: 4.8, reviews: 98, distance: 1.2, city: "Abuja", address: "Wuse II, Abuja", verified: true,
        avatar: "BM", color: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", jobs: 245, price: "₦5,000",
        bio: "Certified electrical engineer specializing in industrial solar setups and smart residential home automation.",
        skills: ["Auto-Wiring", "Solar Systems", "Generators"], online: true,
        gallery: ["Inverter Bank Hookup", "Smart DB Box Clean Setup", "Industrial Control Panel", "Conduit Grid Layout"],
        services: [
            { name: "Socket & Switch Repair", desc: "Repair of faulty sockets and switches", icon: "🔌", category: "Repair & Maintenance", pricingType: "flat", price: 3000 },
            { name: "Ceiling Fan Installation", desc: "Fast installation of ceiling fans", icon: "🌀", category: "Installation", pricingType: "flat", price: 5000 },
            { name: "Home Rewiring", desc: "Complete rewiring of your home", icon: "🏠", category: "Installation", pricingType: "flat", price: 45000 },
            { name: "Solar Panel Installation", desc: "Full solar setup with wiring and battery backup", icon: "☀️", category: "Solar & Power", pricingType: "tiered",
                tiers: [
                    { name: "Basic", price: 30000, delivery: "2 days", includes: ["1 solar panel", "Standard wiring"] },
                    { name: "Standard", price: 50000, delivery: "1 day", includes: ["2 solar panels", "Battery backup"] },
                    { name: "Premium", price: 80000, delivery: "Same day", includes: ["Full setup", "1 year warranty"] }
                ]
            },
            { name: "Generator Installation & Automation", desc: "New generator setup with auto-changeover switch", icon: "⚡", category: "Solar & Power", pricingType: "tiered",
                tiers: [
                    { name: "Basic", price: 20000, delivery: "1 day", includes: ["Generator setup", "Basic wiring"] },
                    { name: "Standard", price: 35000, delivery: "1 day", includes: ["Auto-changeover switch", "Testing"] },
                    { name: "Premium", price: 60000, delivery: "Same day", includes: ["Full automation", "Remote monitoring", "6 month warranty"] }
        ]
            }
        ]
    },
    {
        id: 3, name: "Usman Garba", username: "Usman", category: "carpenter", display_cat: "Master Carpenter",
        rating: 4.7, reviews: 76, distance: 2.1, city: "Kaduna", address: "Barnawa, Kaduna", verified: false,
        avatar: "UG", color: "linear-gradient(135deg, #78350f 0%, #451a03 100%)", jobs: 189, price: "₦4,200",
        bio: "Expert artisan dedicated to fabricating luxury furniture architectures and reinforced modern security doors.",
        skills: ["Premium Furniture", "Roof Design", "Carving"], online: false,
        gallery: ["Royal Dining Finish", "Mahogany Armor Door", "Modern Roof Trusses", "Custom Wardrobe Set"],
        services: [
            { name: "Furniture Repair", desc: "Repair of broken chairs, tables and cabinets", icon: "🪑", category: "Repair & Maintenance", pricingType: "flat", price: 4000 },
            { name: "Door Installation", desc: "Fitting of standard wooden doors", icon: "🚪", category: "Installation", pricingType: "flat", price: 15000 },
            { name: "Window Frame Fitting", desc: "Installation of wooden window frames", icon: "🪟", category: "Installation", pricingType: "flat", price: 12000 },
            { name: "Custom Furniture Design", desc: "Bespoke furniture built to your specifications", icon: "🛋️", category: "Custom Builds", pricingType: "tiered",
                tiers: [
                    { name: "Basic", price: 40000, delivery: "5 days", includes: ["Single piece", "Standard wood finish"] },
                    { name: "Standard", price: 75000, delivery: "3 days", includes: ["Multi-piece set", "Premium wood finish"] },
                    { name: "Premium", price: 150000, delivery: "2 days", includes: ["Full custom design", "Luxury finish", "1 year warranty"] }
                ]
            },
            { name: "Security Door Fabrication", desc: "Reinforced security doors built to order", icon: "🛡️", category: "Custom Builds", pricingType: "tiered",
                tiers: [
                    { name: "Basic", price: 35000, delivery: "3 days", includes: ["Standard security door", "Basic locking system"] },
                    { name: "Standard", price: 60000, delivery: "2 days", includes: ["Reinforced steel core", "Advanced locking system"] },
                    { name: "Premium", price: 100000, delivery: "1 day", includes: ["Full armor-grade build", "Smart lock integration", "1 year warranty"] }
    ]
            }
        ]
    },
        {
        id: 4, name: "Chef Amara Yusuf", username: "Amara", category: "chef", display_cat: "Culinary Artist / Chef",
        rating: 5.0, reviews: 215, distance: 0.5, city: "Kano", address: "Nassarawa GRA, Kano", verified: true,
        avatar: "AY", color: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)", jobs: 410, price: "₦6,000",
        bio: "Elite chef specializing in upscale local catering, signature gourmet dishes, and customized corporate event banquets.",
        skills: ["Gourmet Catering", "Pastry Art", "Menu Development"], online: true,
        schedule: ["Mondays", "Wednesdays", "Fridays", "Saturdays"],
        gallery: ["Premium Banqueting Platter", "Pastry Fine Art Design", "Corporate Event Spread", "Gourmet Kitchen Prep"],
        menu: [
            { name: "Jollof Rice", price: "₦2,200", icon: "🍛", desc: "Smoky party-style jollof", category: "Main Menu" },
            { name: "Fried Rice", price: "₦2,500", icon: "🍚", desc: "Spiced with vegetables", category: "Main Menu" },
            { name: "Danwake", price: "₦1,500", icon: "🥣", desc: "Fresh with groundnut oil", category: "Main Menu" },
            { name: "Tuwo Shinkafa", price: "₦1,800", icon: "🍲", desc: "With miyan kuka", category: "Main Menu" },
            { name: "Masa", price: "₦800", icon: "🫓", desc: "Hot & crispy rice cakes", category: "Main Menu" },
            { name: "Beef", price: "₦1,500", icon: "🥩", desc: "Rich tomato beef stew", category: "Proteins & Sides" },
            { name: "Goat Meat", price: "₦2,200", icon: "🍖", desc: "Peppered goat meat", category: "Proteins & Sides" },
            { name: "Grilled Fish", price: "₦3,000", icon: "🐟", desc: "Smoky grilled fish", category: "Proteins & Sides" },
            { name: "Ponmo", price: "₦1,500", icon: "🥘", desc: "Soft peppered cow skin", category: "Proteins & Sides" },
            { name: "Moi Moi", price: "₦1,200", icon: "🍮", desc: "Steamed bean pudding", category: "Proteins & Sides" },
            { name: "Plantain", price: "₦1,500", icon: "🍌", desc: "Sweet fried plantain", category: "Proteins & Sides" },
            { name: "Pounded Yam", price: "₦1,800", icon: "🍡", desc: "Smooth pounded yam", category: "Swallow" },
            { name: "Amala", price: "₦1,300", icon: "🟤", desc: "Soft yam flour swallow", category: "Swallow" },
            { name: "Eba", price: "₦1,200", icon: "🟡", desc: "Smooth garri swallow", category: "Swallow" },
            { name: "Semovita", price: "₦1,800", icon: "🍚", desc: "Smooth semolina swallow", category: "Swallow" },
            { name: "Wheat", price: "₦1,400", icon: "🌾", desc: "Soft wheat meal swallow", category: "Swallow" },
            { name: "Fufu", price: "₦1,000", icon: "⚪", desc: "Soft cassava fufu", category: "Swallow" }
    ]
    },
    {
        id: 5, name: "Hajiya Bilkisu Musawa", username: "Laylah", category: "snacks", display_cat: "Snacks Vendor",
        rating: 4.8, reviews: 89, distance: 0.7, city: "Kano", address: "Hotoro, Kano", verified: true,
        avatar: "BM", color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", jobs: 203, price: "₦500",
        bio: "Premium snacks vendor specializing in fresh small chops, donuts, meatpie and chin chin. Serving Kano for over 8 years.",
        skills: ["Small Chops", "Pastry", "Chin Chin"], online: true,
        schedule: ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays"],
        gallery: ["Fresh Donuts Batch", "Small Chops Platter", "Meatpie Display", "Chin Chin Pack"],
        products: [
            { name: "Small Chops", price: 2500, icon: "🍢", unit: "per plate", desc: "Assorted small chops", category: "Small Chops" },
            { name: "Meatpie", price: 300, icon: "🥧", unit: "per piece", desc: "Hot & crispy meatpie", category: "Small Chops" },
            { name: "Samosa", price: 250, icon: "🥟", unit: "per piece", desc: "Spicy vegetable samosa", category: "Small Chops" },
            { name: "Spring Rolls", price: 250, icon: "🌯", unit: "per piece", desc: "Crispy vegetable spring rolls", category: "Small Chops" },
            { name: "Chin Chin", price: 800, icon: "🍪", unit: "per pack", desc: "Crunchy chin chin", category: "Small Chops" },
            { name: "Puff Puff", price: 400, icon: "🟡", unit: "per dozen", desc: "Soft & sweet puff puff", category: "Small Chops" },
            { name: "Birthday Cake", price: 8500, icon: "🎂", unit: "per cake", desc: "Custom-decorated birthday cake", category: "Cakes" },
            { name: "Red Velvet Cake", price: 9500, icon: "🍰", unit: "per cake", desc: "Rich red velvet layered cake", category: "Cakes" },
            { name: "Cupcakes", price: 350, icon: "🧁", unit: "per piece", desc: "Frosted vanilla cupcakes", category: "Cakes" },
            { name: "Glazed Doughnuts", price: 500, icon: "🍩", unit: "per dozen", desc: "Fresh glazed doughnuts", category: "Doughnuts" },
            { name: "Chocolate Doughnuts", price: 600, icon: "🍩", unit: "per dozen", desc: "Rich chocolate-coated doughnuts", category: "Doughnuts" },
            { name: "Chocolate Chip Cookies", price: 700, icon: "🍪", unit: "per pack", desc: "Classic chocolate chip cookies", category: "Cookies & Biscuits" },
            { name: "Oatmeal Cookies", price: 700, icon: "🍪", unit: "per pack", desc: "Wholesome oatmeal raisin cookies", category: "Cookies & Biscuits" }
        ]
    },
    {
        id: 6, name: "Malam Kabir Drinks", username: "Hanaan", category: "beverages", display_cat: "Drinks & Beverages",
        rating: 4.9, reviews: 112, distance: 1.1, city: "Kano", address: "Fagge, Kano", verified: true,
        avatar: "KD", color: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)", jobs: 178, price: "₦300",
        bio: "Fresh local beverages vendor. Specializing in cold kunu aya, zobo, fura da nono and fresh juices. All natural ingredients.",
        skills: ["Kunu Aya", "Zobo", "Fresh Juice"], online: true,
        schedule: ["Mondays", "Wednesdays", "Fridays", "Saturdays", "Sundays"],
        gallery: ["Fresh Kunu Display", "Zobo Bottles", "Fura da Nono", "Fresh Juice Pack"],
        products: [
            { name: "Kunu Aya", price: 300, icon: "🥛", unit: "per cup", desc: "Fresh tiger nut milk" },
            { name: "Zobo", price: 250, icon: "🍷", unit: "per bottle", desc: "Cold hibiscus drink" },
            { name: "Fura da Nono", price: 400, icon: "🥣", unit: "per cup", desc: "Fresh fura with nono" },
            { name: "Fresh Juice", price: 500, icon: "🥤", unit: "per bottle", desc: "Assorted fresh juices" },
            { name: "Waina", price: 200, icon: "🫓", unit: "per piece", desc: "Fresh rice cake" }
        ]
    },
];    
async function loadRealProvidersFromFirebase() {
    try {
        let viewerLat = null, viewerLng = null;
        if (navigator.geolocation) {
            try {
                const pos = await new Promise((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
                );
                viewerLat = pos.coords.latitude;
                viewerLng = pos.coords.longitude;
            } catch (gpsErr) {
                console.warn('Ba a samu location na user ba:', gpsErr);
            }
        }
        const snap = await firebase.database().ref('providers').once('value');
        const data = snap.val();
        if (!data) return;
        const eligibleUsernames = Object.keys(data).filter(username => {
            const p = data[username];
            return p && p.status === 'approved' && !PROS.some(existing => String(existing.id) === username);
        });
        const photoUrls = await Promise.all(eligibleUsernames.map(username => fetchProPhoto(username)));
        eligibleUsernames.forEach((username, idx) => {
            const p = data[username];
            const catalog = p.categories || {};
            const flatItems = [];
            Object.keys(catalog).forEach(catKey => {
                const items = catalog[catKey].items || {};
                Object.keys(items).forEach(itemId => flatItems.push({ ...items[itemId], category: catKey }));
            });
            const isFoodCategory = ['chef', 'snacks', 'beverages'].includes(p.category);
            const photoUrl = photoUrls[idx];

            const newPro = {
                id: username,
                realUsername: username,
                name: p.businessName || p.name || username,
                username: username,
                category: p.category || '',
                display_cat: p.categoryLabel || p.category || '',
                rating: p.rating || 0,
                reviews: p.reviewsCount || 0,
                distance: (p.location && viewerLat !== null && viewerLng !== null)
                    ? getDistanceKm(viewerLat, viewerLng, p.location.lat, p.location.lng)
                    : 0,
                city: p.city || '',
                address: p.address || (p.location ? `${p.location.lat.toFixed(4)}, ${p.location.lng.toFixed(4)}` : 'Location available on request'),
                verified: p.status === 'approved',
                avatar: (p.businessName || p.name || username).slice(0,2).toUpperCase(),
                photoUrl: photoUrl,
                color: p.color || 'linear-gradient(135deg, #ea580c 0%, #78350f 100%)',
                jobs: p.jobsDone || 0,
                price: p.pricing ? formatPrice(p.pricing.base, p.pricing.currency) : formatPrice(0, null),
                bio: p.bio || '',
                skills: p.categoryLabel ? [p.categoryLabel] : [],
                online: p.online !== undefined ? p.online : true,
                gallery: (p.portfolio || []).map(url => typeof url === 'string' ? { url } : url),
                menuImageUrl: p.menuImageUrl || null,
                coverImageUrl: p.coverImageUrl || null
            };

            if (isFoodCategory) {
                newPro.menu = flatItems;
            } else {
                newPro.services = flatItems;
            }

            PROS.push(newPro);
        });
    } catch (e) {
        console.warn('Could not load real providers:', e);
    }
}
async function loadContentFromFirebase() {
    try {
        const snap = await firebase.database().ref('admin/content').once('value');
        const data = snap.val();
        if (data) {
            if (data.categories) CATEGORIES = data.categories;
            if (data.emergency_services) EMG_SERVICES = data.emergency_services;
            if (data.ps_categories) PS_CATS = data.ps_categories;
        }
    } catch(e) {
        console.warn('Could not load Firebase content, using defaults:', e);
    }
}
    
// Global App State
let state = {
    view: "main",
    query: "",
    selectedCat: null,
    nearMeActive: false,
    activeProStoryIndex: null,
    activeStorySlide: 0,
    storyProgress: 0,
    storyIntervalId: null,
    isStoryPaused: false,
    likedPros: {},
    isLiveStoryMode: false,
    liveStoryData: null,
    storyOpenedFromProfile: false,
    storyOpenedFromAllStories: false,
    storySingleMode: false,
    storyOriginCardIndex: null,
};

const STORY_DURATION_MS = 5000;
const STORY_TICK_MS = 50;

// ── PS INLINE STATE ──
const psInlineState = {
    currentStep: 1,
    selectedCategory: null,
    selectedCategoryLabel: null,
    selectedSubcategory: null,
    price: null,
    priceUnit: null,
    currency: null,   // ← SABON FILI
    description: null,
    availableDays: [],
    gpsLat: null,
    gpsLng: null,
    gpsCity: null,
    gpsAddress: null,
    gpsReady: false,
    idType: null
};

const portfolioFiles = {};
const verificationFiles = {};
// BACKEND_URL yana zuwa daga nexus-core.js (global) — an cire duplicate declaration a nan.

let PS_CATS = [
    { id:"skilled_pro", label:"Plumber",      icon:"🔧", subs:["General Plumbing","Pipe Fitting","Leak Repair","Drainage"] },
    { id:"skilled_pro", label:"Electrician",  icon:"⚡", subs:["Wiring","Solar Installation","Generator","Smart Home"] },
    { id:"skilled_pro", label:"Carpenter",    icon:"🪚", subs:["Furniture","Doors & Windows","Roofing","Carving"] },
    { id:"chef",      label:"Chef / Caterer",    icon:"🍳", subs:["Home Cooking","Catering","Corporate Events","Wedding Catering","Fine Dining"] },
    { id:"snacks",    label:"Snacks Vendor",      icon:"🧁", subs:["Small Chops","Donuts & Pastry","Meatpie & Samosa","Puff Puff","Chin Chin"] },
    { id:"beverages", label:"Drinks & Beverages", icon:"🥤", subs:["Kunu & Fura","Zobo & Zabo","Fresh Juice","Smoothies","Waina & Masa"] },
    { id:"skilled_pro", label:"Painter",      icon:"🎨", subs:["Interior","Exterior","Texture","Graffiti"] },
    { id:"skilled_pro", label:"Mason",        icon:"🧱", subs:["Block Laying","Plastering","Tiling","Foundation"] },
    { id:"skilled_pro", label:"Welder",       icon:"🔩", subs:["Gate & Fence","Steel Fabrication","Roofing","Furniture"] },
    { id:"emergency",   label:"Mechanic",     icon:"🚗", subs:["Engine Repair","Electrical","Tires","Body Work"] },
    { id:"skilled_pro", label:"AC Tech",      icon:"❄️", subs:["Installation","Repair","Maintenance","Gas Refill"] },
    { id:"skilled_pro", label:"Tailor",       icon:"🧵", subs:["Native Wear","English Wear","Alterations","Embroidery"] },
    { id:"skilled_pro", label:"Cleaner",      icon:"🧹", subs:["Home Cleaning","Office Cleaning","Post-Event","Deep Clean"] },
    { id:"beauty",      label:"Kitso / Hair", icon:"💇🏾‍♀️", subs:["Kitso","Wig Making","Hair Treatment","Braiding"] },
    { id:"beauty",      label:"Makeup",       icon:"💄", subs:["Bridal Makeup","Party Makeup","Henna/Lalle"] },
    { id:"delivery",    label:"Delivery",     icon:"🛵", subs:["Bike Delivery","Car Delivery","Package Delivery"] },
    { id:"home_service",label:"Laundry",      icon:"🧺", subs:["Wash & Fold","Ironing","Dry Cleaning"] },
    { id:"food",        label:"Catering",     icon:"🍲", subs:["Wedding Catering","Small Chops","Party Food"] },
    { id:"emergency",   label:"Emergency",    icon:"🚨", subs:["Car Breakdown","Medical Assist","Security","Fire Safety"] },
    { id:"doctor",      label:"Doctor",       icon:"🩺", subs:["General Practice","Pediatrics","Surgery","Dentistry","Gynecology","ENT","Cardiology","Other"] },
    { id:"veterinary",  label:"Veterinary Doctor", icon:"🐄", subs:["Poultry","Goats & Sheep","Cattle","Mixed/All Animals","Other"] },
]; 

// ── HELPERS ──
function renderStars(rating) {
    const floor = Math.floor(rating);
    return `<div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
        <span style="color:#f59e0b;font-size:12px;letter-spacing:-0.5px;">${"★".repeat(floor) + "☆".repeat(5-floor)}</span>
        <span style="color:#71717a;font-size:11px;font-weight:700;margin-left:2px;">${rating}</span>
    </div>`;
}

async function fetchProPhoto(username) {
    if (!username) return null;
    try {
        const doc = await firebase.firestore().collection('users').doc(username).get();
        return doc.exists ? (doc.data().userProfilePic || null) : null;
    } catch (e) { return null; }
}

function createProCardHtml(pro) {
    const availabilityLabel = pro.online ? 'Available' : 'Offline';
    const availColor = pro.online
        ? { bg: 'rgba(16,185,129,0.12)', border: '#10b981', text: '#059669' }
        : { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', text: '#dc2626' };
    const orderPct = Math.round((pro.rating / 5) * 100);
    const displayHandle = pro.username || pro.name.split(' ')[0];
    const addressLine = pro.address || pro.city || '';

    // Badges: prefer real menu/service item names (global-platform style) — fall back to skills when nothing's listed yet
    const itemSource = (pro.menu && pro.menu.length ? pro.menu : null) || (pro.services && pro.services.length ? pro.services : null) || [];
    const badgeLabels = itemSource.length > 0 ? itemSource.slice(0, 2).map(it => it.name) : (pro.skills || []).slice(0, 2);

    return `
        <div class="biometric-sentinel-card" onclick="openProfileSheet('${pro.id}')">
            <div class="sentinel-screw scr-tl"></div>
            <div class="sentinel-screw scr-bl"></div><div class="sentinel-screw scr-br"></div>

            <div style="position:absolute;top:6px;right:6px;z-index:3;display:flex;flex-direction:column;align-items:flex-end;gap:9px;">
                <span style="background:${availColor.bg};border:1px solid ${availColor.border};color:${availColor.text};border-radius:20px;padding:1px 10px;font-size:9px;line-height:1.4;font-weight:700;">${availabilityLabel}</span>
                <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);white-space:nowrap;">${pro.jobs} Orders <span style="color:#16a34a;">(${orderPct}%)</span></span>
            </div>

            <div style="display:flex;align-items:center;gap:14px;z-index:2;position:relative;padding-right:78px;">
                <div class="lens-viewport" onclick="event.stopPropagation();window.location.href='me.html?user=${encodeURIComponent(pro.username||'')}'" style="cursor:pointer;${pro.photoUrl ? `background-image:url('${pro.photoUrl}');background-size:cover;background-position:center;` : ''}">${pro.photoUrl ? '' : `<div class="lens-glass-reflection">${(pro.avatar||displayHandle.slice(0,2)).toUpperCase()}</div>`}</div>
                <div style="flex:1;padding-left:2px;min-width:0;">
                    <div class="sentinel-title-text" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${displayHandle}</div>
                    <div class="sentinel-sub-text">${pro.display_cat}</div>
                </div>
            </div>
            <p class="sentinel-body-p" style="text-align:justify;">${pro.bio}</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;z-index:2;position:relative;">
                ${badgeLabels.map(s=>`<span class="sentinel-hardware-badge">${s}</span>`).join('')}
            </div>
            <div class="sentinel-footer" style="z-index:2;position:relative;width:100%;">
                <div style="display:flex;align-items:center;gap:8px;color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;flex:1;min-width:0;">
                    <span style="flex-shrink:0;">🔴 ${pro.distance}km</span>
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📍 ${addressLine}</span>
                </div>
                <div style="color:#ffffff;font-size:16px;font-weight:800;flex-shrink:0;">${pro.price}<span style="font-size:11px;color:rgba(255,255,255,0.6);font-weight:500;">/hr</span></div>
            </div>
        </div>`;
        }

function switchView(viewName) {
    state.view = viewName;
    const mainView = document.getElementById("main-view");
    const resultsView = document.getElementById("results-view");
    const actionsBlock = document.getElementById("header-actions");
    const footerEl = document.getElementById("footer-placeholder");
    const ordersBanner = document.getElementById("active-orders-banner");
    const backBtn = document.getElementById("results-back-btn");
    if (viewName === "main") {
    mainView.style.display = "block";
        resultsView.style.display = "none";
        if (actionsBlock) actionsBlock.style.display = "grid";
        if (footerEl) footerEl.style.display = "block";
        if (backBtn) backBtn.style.display = "none";
    } else {
        mainView.style.display = "none";
        resultsView.style.display = "block";
        if (actionsBlock) actionsBlock.style.display = "none";   
       if (footerEl) footerEl.style.display = "none";
        if (ordersBanner) ordersBanner.style.display = "none";
        if (backBtn) backBtn.style.display = "flex";
        renderResultsPage();
    }
}

let storyMarqueeResumeTimer = null;
function pauseStoryMarquee() {
    const track = document.getElementById('stories-track-container');
    if (!track) return;
    track.style.animationPlayState = 'paused';
    clearTimeout(storyMarqueeResumeTimer);
    storyMarqueeResumeTimer = setTimeout(() => {
        track.style.animationPlayState = 'running';
    }, 10000);
}

function initAppElements() {
    const doubleProStories = [...PRO_STORIES, ...PRO_STORIES];
    const track = document.getElementById("stories-track-container");
    track.innerHTML = doubleProStories.map((proStory, index) => {
        const realIndex = index % PRO_STORIES.length;
        const pro = PROS.find(p => p.id === proStory.proId);
        const firstStory = proStory.stories[0];
        return `<div class="glass-lens-card" onclick="openStoryDeck(${realIndex})">
            <div class="glass-lens-img-wrap"><img class="glass-lens-img" src="${firstStory.image}" alt="${pro?pro.name:''}"/></div>
            <div class="glass-lens-ring">✦</div>
            <div class="glass-lens-body">
                <span class="glass-lens-name">${pro?pro.name.split(' ')[0]:firstStory.name}</span>
                <div class="glass-lens-distance">${pro?pro.distance+'km away':''}</div>
            </div>
        </div>`;
    }).join('');
    track.addEventListener('touchstart', pauseStoryMarquee, { passive: true });
    track.addEventListener('mousedown', pauseStoryMarquee);

    const catGrid = document.getElementById("categories-grid-container");
    catGrid.innerHTML = CATEGORIES.map(cat => `
        <div onclick="handleCategorySelect('${cat.id}')" class="aero-prism-card">
            <div class="prism-icon-sphere"><span style="font-size:22px;">${cat.icon}</span></div>
            <span class="prism-card-label">${cat.label}</span>
        </div>`).join('');

    const highlyRatedList = document.getElementById("highly-rated-list-container");
    highlyRatedList.innerHTML = PROS.map((pro,idx) => `
        <div class="slide-up" style="animation-delay:${idx*80}ms">${createProCardHtml(pro)}</div>`).join('');
}

function getFilteredPros() {
    return PROS.filter(p => {
        if (state.selectedCat && p.category !== state.selectedCat) return false;
        if (state.nearMeActive && p.distance > 1.5) return false;
        if (state.query) {
            const q = state.query.toLowerCase();
            return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.display_cat.toLowerCase().includes(q);
        }
        return true;
    });
}

function renderResultsPage() {
    const bar = document.getElementById("trades-filter-bar");
    const allBtnActive = !state.selectedCat;
    let barHtml = `<button onclick="handleCategorySelect(null)" style="flex-shrink:0;background:${allBtnActive?"linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%)":"#ffffff"};color:${allBtnActive?"#fff":"#4b5563"};border:${allBtnActive?"none":"1px solid #e2e8f0"};border-radius:12px;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer;">All Trades</button>`;
    barHtml += CATEGORIES.map(cat => {
        const isActive = state.selectedCat === cat.id;
        return `<button onclick="handleCategorySelect('${cat.id}')" style="flex-shrink:0;background:${isActive?"linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%)":"#ffffff"};color:${isActive?"#fff":"#4b5563"};border:${isActive?"none":"1px solid #e2e8f0"};border-radius:12px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;">${cat.icon} ${cat.label}</button>`;
    }).join('');
    bar.innerHTML = barHtml;

    document.getElementById("proximity-badge-alert").style.display = state.nearMeActive ? "flex" : "none";

    const list = document.getElementById("results-list-container");
    const filtered = getFilteredPros();
    document.getElementById("search-results-counter").innerText = `Search Results (${filtered.length})`;

    if (filtered.length > 0) {
        list.innerHTML = filtered.map((pro,idx) => `<div class="slide-up" style="animation-delay:${idx*40}ms">${createProCardHtml(pro)}</div>`).join('');
    } else {
        list.innerHTML = `<div style="text-align:center;padding:60px 20px;">
            <div style="font-size:36px;">📍</div>
            <div style="font-weight:700;font-size:15px;color:#111827;margin-top:12px;">No Providers Found Near You</div>
            <div style="color:#64748b;font-size:12px;margin-top:4px;max-width:280px;margin-left:auto;margin-right:auto;">We couldn't find anyone offering this service in your area right now. If you know a skilled professional, let them know we're looking — and if you offer this service yourself, you can register below.</div>
            <button onclick="openRequestServiceOverlay()" style="margin-top:16px;background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%);color:#fff;border:none;border-radius:12px;padding:11px 20px;font-size:13px;font-weight:700;cursor:pointer;">+ Request or Recommend</button>
        </div>`;
    }
}

function handleCategorySelect(catId) { 
    state.selectedCat = catId; 
    trackSearchEvent(catId);
    switchView("results"); 
        }
        
function handleLikeToggle(event, proId) {
    event.stopPropagation();
    state.likedPros[proId] = !state.likedPros[proId];
    if (state.view === "results") renderResultsPage(); else initAppElements();
}

function triggerRouterCheck() {
    const inputEl = document.getElementById("search-input");
    const val = inputEl.value;
    state.query = val;
    inputEl.blur();
    if (!val.trim()) return;
    trackSearchEvent(val.trim().toLowerCase());
    document.getElementById("router-overlay").style.display = "flex";
        }
        
function selectRoutePreference(type) {
    document.getElementById("router-overlay").style.display = "none";
    document.activeElement.blur(); // 👈 extra safety
    const q = state.query.toLowerCase();
    const match = CATEGORIES.find(c => q.includes(c.label.toLowerCase()) || q.includes(c.id));
    if (match) state.selectedCat = match.id;
    if (type === "near") {
        const locator = document.getElementById("locating-status");
        locator.style.display = "block";
        setTimeout(() => { locator.style.display = "none"; state.nearMeActive = true; switchView("results"); }, 1000);
    } else {
        state.nearMeActive = false;
        switchView("results");
    }
}

// ── STORIES ENGINE ──
function openStoryDeck(proStoriesIndex, initialSlide) {
    document.body.appendChild(document.getElementById('story-overlay-deck'));
    state.activeProStoryIndex = proStoriesIndex;
    state.activeStorySlide = initialSlide || 0;
    state.storyProgress = 0;
    state.isStoryPaused = false;
    if (state.storyIntervalId) clearInterval(state.storyIntervalId);
    window.scrollTo(0, 0);
    const overlayEl = document.getElementById("story-overlay-deck");
    overlayEl.style.display = "flex";
    overlayEl.style.visibility = "visible";
    void overlayEl.offsetHeight;
    updateStoryOverlayUi();
    const indicatorContainer = document.getElementById("story-progress-indicators-bar");
    if (state.storySingleMode) {
        if (indicatorContainer) indicatorContainer.style.visibility = "hidden";
    } else {
        if (indicatorContainer) indicatorContainer.style.visibility = "visible";
        startStoryInterval();
    }
        }

function openStoryFromAllStories(cardIndex, proIndex, slideIndex) {
    state.storyOpenedFromAllStories = true;
    state.storySingleMode = true;
    state.storyOriginCardIndex = cardIndex;
    closeAllStoriesOverlay();
    openStoryDeck(proIndex, slideIndex);
        }

function openLiveDailyStory(username, uploads) {
    state.isLiveStoryMode = true;
    state.liveStoryData = { username, uploads };
    state.activeStorySlide = 0;
    state.storyProgress = 0;
    state.isStoryPaused = false;
    if (state.storyIntervalId) clearInterval(state.storyIntervalId);
    document.getElementById("story-overlay-deck").style.display = "flex";
    updateStoryOverlayUi();
    startStoryInterval();
        }

function startStoryInterval() {
    if (state.storyIntervalId) clearInterval(state.storyIntervalId);
    const increment = (STORY_TICK_MS / STORY_DURATION_MS) * 100;
    state.storyIntervalId = setInterval(() => {
        if (state.isStoryPaused) return;
        state.storyProgress += increment;
        if (state.storyProgress >= 100) {
            state.storyProgress = 0;

            if (state.isLiveStoryMode) {
                const uploads = state.liveStoryData.uploads;
                const nextSlide = state.activeStorySlide + 1;
                if (nextSlide < uploads.length) {
                    state.activeStorySlide = nextSlide;
                    updateStoryOverlayUi();
                } else {
                    closeStoryDeck();
                }
                return;
            }

            const currentProData = PRO_STORIES[state.activeProStoryIndex];
            const nextSlide = state.activeStorySlide + 1;
            if (nextSlide < currentProData.stories.length) {
                state.activeStorySlide = nextSlide;
                updateStoryOverlayUi();
            } else {
                const nextPro = state.activeProStoryIndex + 1;
                if (nextPro < PRO_STORIES.length) {
                    state.activeProStoryIndex = nextPro;
                    state.activeStorySlide = 0;
                    updateStoryOverlayUi();
                } else { closeStoryDeck(); }
            }
        } else { updateStoryProgressBarOnly(); }
    }, STORY_TICK_MS);
        }

function updateStoryProgressBarOnly() {
    const totalSlides = state.isLiveStoryMode
        ? state.liveStoryData.uploads.length
        : PRO_STORIES[state.activeProStoryIndex].stories.length;

    for (let idx = 0; idx < totalSlides; idx++) {
        const fillEl = document.getElementById(`story-fill-node-${idx}`);
        if (fillEl) {
            if (idx < state.activeStorySlide) fillEl.style.width = "100%";
            else if (idx === state.activeStorySlide) fillEl.style.width = `${state.storyProgress}%`;
            else fillEl.style.width = "0%";
        }
    }
        }

function updateStoryOverlayUi() {
    const videoLayer = document.getElementById("story-canvas-video-layer");
    const canvas = document.getElementById("story-interactive-canvas-area");

    if (state.isLiveStoryMode) {
        const { username, uploads } = state.liveStoryData;
        const activeUpload = uploads[state.activeStorySlide];
        state.activeStoryCurrency = activeUpload.dishCurrency || '';

        const indicatorContainer = document.getElementById("story-progress-indicators-bar");
        indicatorContainer.innerHTML = uploads.map((u, idx) => `
            <div class="story-progress-bg"><div class="story-progress-fill" id="story-fill-node-${idx}" style="width:${idx < state.activeStorySlide ? '100%' : '0%'};"></div></div>`).join('');

        document.getElementById("story-header-icon").innerText = "🔴";
        document.getElementById("story-header-title").innerText = username;
        document.getElementById("story-header-meta").innerText = "Live Now · Available In Perimeter";
        document.getElementById("story-canvas-main-emoji").style.display = "none";
        document.getElementById("story-canvas-main-title").innerText = activeUpload.dishName || "";
        document.getElementById("story-canvas-main-price").innerText = activeUpload.dishPrice ? formatPrice(Number(activeUpload.dishPrice), activeUpload.dishCurrency) : "";        
        // Share tsohon video/image kafin sabo
        videoLayer.innerHTML = "";
        videoLayer.style.display = "none";
        canvas.style.backgroundImage = "none";

        if (activeUpload.type === "video") {
            videoLayer.innerHTML = `<video src="${activeUpload.url}" autoplay muted playsinline loop style="width:100%;height:100%;object-fit:cover;"></video>`;
            videoLayer.style.display = "block";
        } else {
            canvas.style.backgroundImage = `url('${activeUpload.url}')`;
            canvas.style.backgroundSize = "cover";
            canvas.style.backgroundPosition = "center";
        }
        return;
    }

    // Demo PRO_STORIES mode (yadda yake a baya) — tabbatar an share video layer
    videoLayer.innerHTML = "";
    videoLayer.style.display = "none";

   state.activeStoryCurrency = '';
    const currentProData = PRO_STORIES[state.activeProStoryIndex];
    const activeStory = currentProData.stories[state.activeStorySlide]; 
    const pro = PROS.find(p => p.id === currentProData.proId);
    const indicatorContainer = document.getElementById("story-progress-indicators-bar");
    indicatorContainer.innerHTML = currentProData.stories.map((s,idx) => `
        <div class="story-progress-bg"><div class="story-progress-fill" id="story-fill-node-${idx}" style="width:${idx<state.activeStorySlide?'100%':'0%'};"></div></div>`).join('');
    document.getElementById("story-header-icon").innerText = activeStory.icon;
    document.getElementById("story-header-icon").style.display = "inline";
    document.getElementById("story-header-title").innerText = activeStory.name;
    document.getElementById("story-header-meta").innerText = `Prepared Live Near Me (${pro?pro.distance:''}km)`;
    document.getElementById("story-canvas-main-emoji").style.display = "block";
    document.getElementById("story-canvas-main-emoji").innerText = activeStory.icon;
    document.getElementById("story-canvas-main-title").innerText = activeStory.name;
    document.getElementById("story-canvas-main-price").innerText = activeStory.price;
    canvas.style.backgroundImage = `url('${activeStory.image}')`;
    canvas.style.backgroundSize = "cover";
    canvas.style.backgroundPosition = "center";
        }

function closeStoryDeck() {
    if (state.storyIntervalId) clearInterval(state.storyIntervalId);
    state.activeProStoryIndex = null;
    state.isLiveStoryMode = false;
    state.liveStoryData = null;
    document.getElementById("story-overlay-deck").style.display = "none";
    const indicatorContainer = document.getElementById("story-progress-indicators-bar");
    if (indicatorContainer) indicatorContainer.style.visibility = "visible";
    state.storySingleMode = false;

    if (state.storyOpenedFromAllStories) {
        state.storyOpenedFromAllStories = false;
        const returnIndex = state.storyOriginCardIndex;
        state.storyOriginCardIndex = null;
        openAllStoriesOverlay();
        setTimeout(() => {
            const grid = document.getElementById('all-stories-grid');
            const cardEl = grid && grid.children[returnIndex];
            if (cardEl) cardEl.scrollIntoView({ block: 'center' });
        }, 50);
    }
        }

 // ── PROFILE SHEET ──
// ── PROFILE SHEET ──
 function openProfileSheet(proId) {
    const pro = PROS.find(p => String(p.id) === String(proId));
   if (!pro) return;
    mbTrackProfileView(proId);
     
    // Hero banner: real portfolio photo idan yana akwai, in ba haka ba, gradient default
    const heroBanner = document.getElementById("nxh-hero-banner");
    const firstGalleryUrl = (pro.gallery && pro.gallery[0] && typeof pro.gallery[0] === 'object' && pro.gallery[0].url)
        ? pro.gallery[0].url : null;
    const heroImageUrl = pro.coverImageUrl || firstGalleryUrl;
    if (heroBanner) heroBanner.style.setProperty('background-image', heroImageUrl ? `url('${heroImageUrl}')` : 'none', 'important');
    document.getElementById("profile-online-status-pill").style.background = pro.online ? '#16a34a' : '#dc2626';
    document.getElementById("profile-online-status-pill").style.boxShadow = pro.online ? '0 0 8px rgba(22,163,74,0.6)' : '0 0 8px rgba(220,38,38,0.6)';
    const avatarSphere = document.getElementById("profile-avatar-sphere");
    avatarSphere.style.background = pro.color;
    avatarSphere.innerText = pro.avatar;
    document.getElementById("profile-expert-name").innerText = pro.name;
    document.getElementById("profile-shield-badge").style.display = pro.verified ? "inline" : "none";
    const scheduleCard = document.getElementById("chef-schedule-section-card");
    if (scheduleCard && pro.category === "chef" && pro.schedule) {
        scheduleCard.style.display = "block";
        document.getElementById("chef-days-badges-slot").innerHTML = pro.schedule.map(day =>
            `<span style="background:#ffffff;color:#be185d;border:1px solid rgba(236,72,153,0.2);padding:4px 10px;border-radius:10px;font-size:11px;font-weight:700;">${day}</span>`).join('');
    } else if (scheduleCard) { scheduleCard.style.display = "none"; }
 const targetGallery = pro.gallery || [];

    // ── Gallery tab: real photo/video grid ──
    const nxhGalleryGrid = document.getElementById("nxh-gallery-grid");
    if (nxhGalleryGrid) {
        if (!targetGallery.length) {
            nxhGalleryGrid.innerHTML = `<div class="nxh-gallery-empty">📷 No photos uploaded yet</div>`;
        } else {
            nxhGalleryGrid.innerHTML = targetGallery.map(item => {
                const isMediaObj = item && typeof item === 'object' && item.url;
                if (isMediaObj) {
                    const isVideo = item.type === 'video' || /\.(mp4|mov|webm)$/i.test(item.url);
                    return isVideo
                   ? `<div class="nxh-gallery-card nxh-gallery-has-img" style="padding:0;position:relative;overflow:hidden;" onclick="openGalleryLightbox('${item.url}', true, event)"><video src="${item.url}" autoplay loop muted playsinline preload="auto" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video><span style="position:absolute;top:8px;right:8px;z-index:2;width:19px;height:19px;border-radius:5px;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,0.35);"><svg width="11" height="11" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="margin-left:1px;"><path d="M8 5v14l11-7z" fill="#111" stroke="#111" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg></span></div>`                  
    : `<div class="nxh-gallery-card nxh-gallery-has-img" style="background-image:url('${item.url}');background-size:cover;background-position:center;background-repeat:no-repeat;" onclick="openGalleryLightbox('${item.url}', false, event)"></div>`;
                }
                return `<div class="nxh-gallery-card">📷 ${item}</div>`;
            }).join('');
        }
        }
// ── Any pro with menu items or services gets the tabbed layout instead of the empty generic block ──
    const isFoodPro = true; // Duk pro (chef, carpenter, engineer, da sauransu) yanzu suna amfani da tsarin grid iri daya
    profileMenuIsFood = isFoodPro;
    const genericWrap = document.getElementById("nxh-generic-info-wrap");
    const foodSection = document.getElementById("nxfm-food-menu-section");
    const statusCard = document.getElementById("nxh-status-card");
    const cartFab = document.getElementById("nxfm-cart-fab");
    if (isFoodPro) {
        if (statusCard) statusCard.style.display = "none";
        renderFoodMenuSection(pro);
        document.getElementById('pro-action-bar').style.background = '#050505';
        if (cartFab) cartFab.style.display = isFoodProCategory(pro.category) ? "flex" : "none";
    } else {
        document.getElementById('pro-action-bar').style.background = '#050505';
        if (statusCard) statusCard.style.display = "";
        if (cartFab) cartFab.style.display = "none";
        switchSeg('menu');
        }

  window.__npProfileOverlay = true;
  history.pushState({ npOverlay: "profile" }, "", "");
  document.getElementById("profile-sheet-overlay").style.display = "block";
        }

// ── NEXUS FOOD MENU — renders the Mama T's Kitchen-style layout for chef/snacks/beverages pro sheets ──
let nxfmCurrentPro = null;
function renderFoodMenuSection(pro) {
    nxfmCurrentPro = pro;
    localStorage.setItem('nxfm_last_viewed_pro', JSON.stringify(pro));
    nxfmUpdateCartBadge();
    const items = pro.menu || pro.products || pro.services || [];


    // Build category tabs from item.category, falling back to a single "All" list
    const cats = [];
    items.forEach(it => { if (it.category && !cats.includes(it.category)) cats.push(it.category); });

    const tabsRow = document.getElementById("nxfm-tabs-row");
    if (cats.length > 0) {
        tabsRow.style.display = "flex";
        tabsRow.innerHTML = ['All', ...cats].map((c, i) =>
            `<div class="nxfm-tab${i === 0 ? ' active' : ''}" data-nxfm-tab="${c}" onclick="nxfmSelectTab(this,'${c.replace(/'/g,"\\'")}')">${c}</div>`).join('');
    } else {
        tabsRow.style.display = "none";
        tabsRow.innerHTML = "";
    }

nxfmRenderItems(items, cats, "All");
    switchSeg('menu');
        }

function nxfmSelectTab(el, cat) {
    document.querySelectorAll('#nxfm-tabs-row .nxfm-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const pro = nxfmCurrentPro;
    const items = (pro && (pro.menu || pro.products || pro.services)) || [];
    const cats = [];
    items.forEach(it => { if (it.category && !cats.includes(it.category)) cats.push(it.category); });
    nxfmRenderItems(items, cats, cat);
    if (navigator.vibrate) navigator.vibrate(10);
}

function isFoodProCategory(c) { return c === 'chef' || c === 'snacks' || c === 'beverages'; }

function nxfmRenderItems(items, cats, activeTab) {
    const slot = document.getElementById("nxfm-categories-slot");
    const serviceMode = nxfmCurrentPro && !isFoodProCategory(nxfmCurrentPro.category);
    const emptyIcon = serviceMode ? '🧰' : '🍽️';
    const emptyLabel = serviceMode ? 'No services listed yet' : 'No menu items yet';
    if (!items.length) {
        const isOwn = !!window._nxfmIsOwnProfile;
        slot.innerHTML = isOwn
           ? `<div class="nxfm-empty-state"><div style="font-size:32px;">${emptyIcon}</div><div style="font-weight:800;margin-top:8px;">You haven't added your ${serviceMode ? 'services' : 'products'} yet</div><div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:6px;">Tap Edit to add items so customers can see what you offer.</div><button onclick="document.getElementById('edit-profile-btn').click()" style="margin-top:16px;background:#1d4ed8;color:#fff;border:none;border-radius:12px;padding:10px 20px;font-weight:800;font-size:13px;cursor:pointer;">✏️ Edit Profile</button></div>`             
            : `<div class="nxfm-empty-state"><div style="font-size:32px;">${emptyIcon}</div><div style="font-weight:800;margin-top:8px;">This provider hasn't listed his ${serviceMode ? 'services' : 'products'} yet</div><div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:6px;">Use the chat button or hire expert to contact him directly.</div></div>`;      
        return;
        }

    const groups = cats.length > 0 ? cats : ["Menu"];
    let html = "";
    groups.forEach(cat => {
        if (activeTab !== "All" && activeTab !== cat) return;
        const catItems = cats.length > 0 ? items.filter(it => it.category === cat) : items;
        if (!catItems.length) return;
        const headingHtml = cats.length > 0 ? `<div class="nxfm-cat-title">${cat}</div><div class="nxfm-cat-desc">${nxfmCatDesc(cat)}</div>` : '';
        const gridClass = (cat === 'Proteins & Sides' || cat === 'Swallow') ? 'nxfm-item-grid nxfm-item-grid-3col' : 'nxfm-item-grid';
        html += `<div class="nxfm-cat-block">
            ${headingHtml}
            <div class="${gridClass}">
        ${catItems.map(item => item.pricingType === "tiered" ? `
        <div class="nxfm-item-card-grid" onclick="openTiersSheet('${(item.name||'').replace(/'/g, "\\'")}')">     
                    <div class="nxfm-grid-thumb">
                        ${item.image ? `<img src="${item.image}">` : (item.icon || '🛠️')}
                    </div>
                    <div class="nxfm-grid-info">
                        <div class="nxfm-grid-name">${item.name}</div>
                        <div class="nxfm-grid-desc">${item.desc || ''}</div>
                        <div class="nxfm-grid-bottom-row">
                            <div class="nxfm-grid-price">From ${formatPrice(Math.min(...item.tiers.map(t=>t.price)), item.currency)}</div>
                            <div class="nxfm-tiers-badge">${item.tiers.length} Options</div>
                        </div>
                    </div>
                </div>` : `
         <div class="nxfm-item-card-grid" onclick="openItemDetail('${(item.name||'').replace(/'/g, "\\'")}','${item.price}','${item.image||''}','${(item.icon||(serviceMode?'🧰':'🍽️')).replace(/'/g,"\\'")}','${(item.desc||'').replace(/'/g,"\\'")}','${item.currency||''}')">                   
                    <div class="nxfm-grid-thumb">
                        ${item.image ? `<img src="${item.image}">` : (item.icon || (serviceMode ? '🧰' : '🍽️'))}
                    </div>
                    <div class="nxfm-grid-info">
                        <div class="nxfm-grid-name">${item.name}</div>
                        <div class="nxfm-grid-desc">${item.desc || ''}</div>
                        <div class="nxfm-grid-bottom-row">
                            <div class="nxfm-grid-price">${typeof item.price === 'number' ? formatPrice(item.price, item.currency) : item.price}</div>
                            ${serviceMode
                                ? `<button class="nxfm-grid-add-btn" onclick="event.stopPropagation();nxfmRequestServiceQuote('${(item.name||'').replace(/'/g, "\\'")}','${item.price}','${(item.desc||'').replace(/'/g,"\\'")}')" title="Request Quote">📞</button>`
                                : `<button class="nxfm-grid-add-btn" onclick="event.stopPropagation();nxfmGridQuickAdd('${(item.name||'').replace(/'/g, "\\'")}','${item.price}','${item.image||''}','${(item.icon||'🍽️').replace(/'/g,"\\'")}','${(item.desc||'').replace(/'/g,"\\'")}','${item.currency||''}')">+</button>`}                       
                        </div>
                    </div>
                </div>`).join('')} 
            </div>
        </div>`;
    });
    slot.innerHTML = html || `<div class="nxfm-empty-state">${emptyIcon}<div style="font-weight:800;margin-top:8px;">No items in this category</div></div>`;
}

function nxfmCatDesc(cat) {
   const map = {
        'Main Menu': "A variety of delicious dishes, freshly prepared.",
        'Drinks': "Chilled and freshly made beverages.",
        'Proteins & Sides': "Assorted proteins and side dishes to complete your meal.",
        'Swallow': "Traditional Nigerian swallows are served hot and fresh.",
        'Cakes': "Freshly baked cakes, custom-made for every occasion.",
        'Doughnuts': "Soft, fluffy doughnuts glazed to perfection.",
        'Cookies & Biscuits': "Crunchy, freshly baked cookies and biscuits.",
        'Small Chops': "A savory assortment of Nigeria's favorite fried snacks.",
        'Services': "Professional services offered, priced per job."
    }; 
    if (map[cat]) return map[cat];
    const serviceMode = nxfmCurrentPro && !isFoodProCategory(nxfmCurrentPro.category);
    return serviceMode ? "Professional services offered, priced per job." : "Freshly prepared and ready to order.";
        }
// REPLACE: closeProfileSheet() function
function closeProfileSheet() {
    document.getElementById("profile-sheet-overlay").style.display = "none";
    
    // Idan an shigo daga story, dawo story daidai inda ya tsaya
    if (state.storyOpenedFromProfile) {
        state.storyOpenedFromProfile = false;
        document.getElementById('story-overlay-deck').style.display = 'flex';
        state.isStoryPaused = false;
        startStoryInterval();
    }
        }
        
// ── CHEF MENU ──
let currentChefMenuPro = null;

function openChefMenuOverlay(pro) {
    currentChefMenuPro = pro;
    chefMenuEditMode = false;
    chefMenuEditingItemId = null;
    document.getElementById("chef-menu-overlay").style.display = "flex";

    document.getElementById("chef-menu-pro-name").innerText = pro.name;
    document.querySelector(".chef-menu-header div div:first-child").innerText = pro.menuWelcome || `Welcome to ${pro.name} · ✨ Today's Live Menu`;

    checkChefMenuOwnership(pro);
    renderChefMenuOverlayItems(pro);

    const availEl = document.getElementById("availability-text");
    if (pro.schedule) {
        availEl.innerText = pro.schedule.length === 7 ? "✅ Available Everyday" : `📅 Available: ${pro.schedule.join(', ')}`;
    } else { availEl.innerText = "✅ Available Everyday"; }
      
    // Check notify me status
    setTimeout(() => checkNotifyMeStatus(), 300);
        }
        
function closeChefMenuOverlay() {
    document.getElementById("chef-menu-overlay").style.display = "none";
    document.getElementById("profile-sheet-overlay").style.display = "block";
        }
// ════════════════════════════════════════════════════════════
//  🧁 SNACKS MENU OVERLAY ENGINE
// ════════════════════════════════════════════════════════════

let currentSnacksMenuPro = null;
let snacksMenuEditMode = false;
let snacksMenuIsOwner = false;
let snacksMenuEditingItemId = null;

function openSnacksMenuOverlay(pro) {
    currentSnacksMenuPro = pro;
    snacksMenuEditMode = false;
    snacksMenuEditingItemId = null;
    document.getElementById('snacks-menu-overlay').style.display = 'flex';
    document.getElementById('snacks-menu-pro-name').innerText = pro.name;
    document.querySelector('#snacks-menu-overlay .chef-menu-header div div:first-child').innerText =
        pro.menuWelcome || `Welcome to ${pro.name} · 🧁 Today's Snacks`;

    checkSnacksMenuOwnership(pro);
    renderSnacksMenuOverlayItems(pro);

    const availEl = document.getElementById('snacks-availability-text');
    if (pro.schedule) {
        availEl.innerText = pro.schedule.length === 7
            ? '✅ Available Everyday'
            : `📅 Available: ${pro.schedule.join(', ')}`;
    } else {
        availEl.innerText = '✅ Available Everyday';
    }

    setTimeout(() => checkSnacksNotifyMeStatus(), 300);
}

function closeSnacksMenuOverlay() {
    document.getElementById('snacks-menu-overlay').style.display = 'none';
    document.getElementById('profile-sheet-overlay').style.display = 'block';
        }

function checkSnacksMenuOwnership(pro) {
    const sessionUser = localStorage.getItem('nexus_user_session');
    const editBtn = document.getElementById('snacks-menu-edit-btn');
    if (!editBtn) return;
    if (sessionUser && String(pro.id) === String(sessionUser)) {
        snacksMenuIsOwner = true;
        editBtn.style.display = 'flex';
    } else {
        snacksMenuIsOwner = false;
        editBtn.style.display = 'none';
    }
}

function toggleSnacksMenuEditMode() {
    if (!snacksMenuIsOwner) return;
    snacksMenuEditMode = !snacksMenuEditMode;
    const editBtn = document.getElementById('snacks-menu-edit-btn');
    if (snacksMenuEditMode) {
        editBtn.textContent = '✕';
        editBtn.style.background = 'rgba(239,68,68,0.2)';
        editBtn.style.borderColor = 'rgba(239,68,68,0.3)';
    } else {
        editBtn.textContent = '✏️';
        editBtn.style.background = 'rgba(255,255,255,0.1)';
        editBtn.style.borderColor = 'rgba(255,255,255,0.2)';
        snacksMenuEditingItemId = null;
    }
    if (currentSnacksMenuPro) renderSnacksMenuOverlayItems(currentSnacksMenuPro);
}

function renderSnacksMenuOverlayItems(pro) {
    const slot = document.getElementById('snacks-menu-items-slot');
    if (!slot) return;

    const products = pro.products || pro.menu || [];

    if (!snacksMenuEditMode) {
        slot.innerHTML = products.map((item, idx) => `
         <div class="menu-item-card" style="animation-delay:${idx * 0.1}s"
                onclick="openSnacksOrderConfirm('${(item.name||'').replace(/'/g,"\\'")}','${item.price}','${item.unit||''}','${item.currency||''}')">   
        <div class="menu-item-emoji">${item.icon || '🧁'}</div>
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-desc">${item.unit || item.desc || ''}</div>
                </div>
                <div class="menu-item-price">
                    ${typeof item.price === 'number' ? formatPrice(item.price, item.currency) : item.price}
                </div>
            </div>`).join('');
        return;
    }

    slot.innerHTML = products.map((item, idx) => `
        <div class="menu-item-card edit-mode" style="animation-delay:${idx * 0.1}s">
            <div class="menu-item-emoji">${item.icon || '🧁'}</div>
            <div class="menu-item-info">
                <div class="menu-item-name">${item.name}</div>
                <div class="menu-item-desc">${item.unit || item.desc || ''}</div>
            </div>
            <div class="menu-item-price">
                ${typeof item.price === 'number' ? formatPrice(item.price, item.currency) : item.price}
            </div>
            <div class="menu-item-edit-actions">
                <button class="menu-item-edit-btn" onclick="openSnacksMenuItemForm(${idx})">✏️</button>
                <button class="menu-item-delete-btn" onclick="deleteSnacksMenuOverlayItem(${idx})">🗑️</button>
            </div>
        </div>`).join('');

    slot.innerHTML += `<button class="chef-menu-add-item-btn" onclick="openSnacksMenuItemForm(null)">➕ Add New Product</button>`;
    slot.innerHTML += `<button class="chef-menu-save-changes-btn" onclick="saveSnacksMenuChanges()">💾 Save Changes</button>`;
}

function openSnacksMenuItemForm(itemIdx) {
    snacksMenuEditingItemId = itemIdx;
    const pro = currentSnacksMenuPro;
    const products = pro.products || pro.menu || [];
    const existing = itemIdx !== null ? products[itemIdx] : null;

    const slot = document.getElementById('snacks-menu-items-slot');
    const formHtml = `
        <div class="chef-menu-edit-form" id="snacks-menu-inline-form">
            <input type="text" id="smf-name" placeholder="Product Name" value="${existing ? existing.name.replace(/"/g,'&quot;') : ''}">
            <input type="number" id="smf-price" placeholder="Price ($)" value="${existing ? existing.price : ''}">
            <input type="text" id="smf-unit" placeholder="Unit (e.g. per piece, per pack)" value="${existing ? (existing.unit||'') : ''}">
            <input type="text" id="smf-icon" placeholder="Emoji (e.g. 🧁)" value="${existing ? (existing.icon||'') : ''}" maxlength="4">
            <div class="chef-menu-edit-form-actions">
                <button onclick="cancelSnacksMenuItemForm()" style="background:rgba(255,255,255,0.1);color:#fff;">Cancel</button>
                <button onclick="confirmSnacksMenuItemForm()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;">${existing ? 'Update' : 'Add'} Product</button>
            </div>
        </div>`;

    renderSnacksMenuOverlayItems(pro);
    slot.insertAdjacentHTML('afterbegin', formHtml);
}

function cancelSnacksMenuItemForm() {
    snacksMenuEditingItemId = null;
    renderSnacksMenuOverlayItems(currentSnacksMenuPro);
}

function confirmSnacksMenuItemForm() {
    const name = document.getElementById('smf-name').value.trim();
    const price = parseInt(document.getElementById('smf-price').value);
    const unit = document.getElementById('smf-unit').value.trim();
    const icon = document.getElementById('smf-icon').value.trim() || '🧁';

    if (!name) { showGlobalToast('⚠️ Enter product name!'); return; }
    if (!price || price <= 0) { showGlobalToast('⚠️ Enter valid price!'); return; }

    if (!currentSnacksMenuPro.products) currentSnacksMenuPro.products = [];

    if (snacksMenuEditingItemId === null) {
        currentSnacksMenuPro.products.push({ name, price, unit, icon });
        showGlobalToast(`✅ "${name}" added!`);
    } else {
        currentSnacksMenuPro.products[snacksMenuEditingItemId] = { name, price, unit, icon };
        showGlobalToast(`✅ "${name}" updated!`);
    }

    snacksMenuEditingItemId = null;
    renderSnacksMenuOverlayItems(currentSnacksMenuPro);
}

function deleteSnacksMenuOverlayItem(idx) {
    const products = currentSnacksMenuPro.products || currentSnacksMenuPro.menu || [];
    const item = products[idx];
    if (!confirm(`Remove "${item.name}"?`)) return;
    products.splice(idx, 1);
    renderSnacksMenuOverlayItems(currentSnacksMenuPro);
    showGlobalToast(`🗑️ "${item.name}" removed!`);
}

async function saveSnacksMenuChanges() {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser || !snacksMenuIsOwner) { showGlobalToast('⚠️ No permission!'); return; }

    const saveBtn = document.querySelector('#snacks-menu-items-slot .chef-menu-save-changes-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }

    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            await firebase.database().ref(`providers/${sessionUser}`).update({
                products: currentSnacksMenuPro.products,
                lastUpdated: Date.now()
            });
        }
        showGlobalToast('✅ Products saved!');
        toggleSnacksMenuEditMode();
    } catch (err) {
        showGlobalToast('❌ Failed: ' + err.message);
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Save Changes'; }
    }
}

// ── SNACKS ORDER CONFIRM ──
let snacksOrderDraft = { itemName: null, itemPrice: null, itemUnit: null, currency: null };

function openSnacksOrderConfirm(itemName, itemPrice, itemUnit, currency) {
    snacksOrderDraft.itemName = itemName;
    snacksOrderDraft.itemPrice = itemPrice;
    snacksOrderDraft.itemUnit = itemUnit;
    snacksOrderDraft.currency = currency || '';
    document.getElementById('order-confirm-item-name').textContent = itemName;
    document.getElementById('order-confirm-overlay').style.display = 'flex';
    // Override confirmOrderYes temporarily
    window._snacksOrderActive = true;
}

// ── SNACKS NOTIFY ME ──
async function toggleSnacksNotifyMe() {
if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) { showGlobalToast('⚠️ Please login first!'); return; }
    if (!currentSnacksMenuPro) return;

    const proId = String(currentSnacksMenuPro.id);
    const btn = document.getElementById('snacks-notify-me-btn');

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;
        const ref = firebase.database().ref(`notify_subscribers/${proId}/${sessionUser}`);
        const snap = await ref.once('value');

        if (snap.exists()) {
            await ref.remove();
            btn.textContent = '🔔 Notify Me on Next Order Day';
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
            showGlobalToast('🔕 Notifications turned off.');
        } else {
            await ref.set({
                username: sessionUser,
                proId: proId,
                proName: currentSnacksMenuPro.name || '—',
                subscribedAt: Date.now()
            });
            btn.textContent = '✅ You will be notified!';
            btn.style.background = 'rgba(16,185,129,0.2)';
            btn.style.borderColor = 'rgba(16,185,129,0.4)';
            showGlobalToast('✅ You will be notified on the next order day!');
        }
    } catch(err) {
        showGlobalToast('❌ Failed. Try again.');
    }
}

async function checkSnacksNotifyMeStatus() {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser || !currentSnacksMenuPro) return;
    const proId = String(currentSnacksMenuPro.id);
    const btn = document.getElementById('snacks-notify-me-btn');
    if (!btn) return;

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;
        const snap = await firebase.database()
            .ref(`notify_subscribers/${proId}/${sessionUser}`)
            .once('value');
        if (snap.exists()) {
            btn.textContent = '✅ You will be notified!';
            btn.style.background = 'rgba(16,185,129,0.2)';
            btn.style.borderColor = 'rgba(16,185,129,0.4)';
        }
    } catch(err) { console.warn('checkSnacksNotifyMeStatus error:', err); }
}

// ════════════════════════════════════════════════════════════
//  🥤 BEVERAGES MENU OVERLAY ENGINE
// ════════════════════════════════════════════════════════════

let currentBeveragesMenuPro = null;
let beveragesMenuEditMode = false;
let beveragesMenuIsOwner = false;
let beveragesMenuEditingItemId = null;

function openBeveragesMenuOverlay(pro) {
    currentBeveragesMenuPro = pro;
    beveragesMenuEditMode = false;
    beveragesMenuEditingItemId = null;
    document.getElementById('beverages-menu-overlay').style.display = 'flex';
    document.getElementById('beverages-menu-pro-name').innerText = pro.name;
    document.querySelector('#beverages-menu-overlay .chef-menu-header div div:first-child').innerText =
        pro.menuWelcome || `Welcome to ${pro.name} · 🥤 Today's Drinks`;

    checkBeveragesMenuOwnership(pro);
    renderBeveragesMenuOverlayItems(pro);

    const availEl = document.getElementById('beverages-availability-text');
    if (pro.schedule) {
        availEl.innerText = pro.schedule.length === 7
            ? '✅ Available Everyday'
            : `📅 Available: ${pro.schedule.join(', ')}`;
    } else {
        availEl.innerText = '✅ Available Everyday';
    }

    setTimeout(() => checkBeveragesNotifyMeStatus(), 300);
}

function closeBeveragesMenuOverlay() {
    document.getElementById('beverages-menu-overlay').style.display = 'none';
    document.getElementById('profile-sheet-overlay').style.display = 'block';
        }

function checkBeveragesMenuOwnership(pro) {
    const sessionUser = localStorage.getItem('nexus_user_session');
    const editBtn = document.getElementById('beverages-menu-edit-btn');
    if (!editBtn) return;
    if (sessionUser && String(pro.id) === String(sessionUser)) {
        beveragesMenuIsOwner = true;
        editBtn.style.display = 'flex';
    } else {
        beveragesMenuIsOwner = false;
        editBtn.style.display = 'none';
    }
}

function toggleBeveragesMenuEditMode() {
    if (!beveragesMenuIsOwner) return;
    beveragesMenuEditMode = !beveragesMenuEditMode;
    const editBtn = document.getElementById('beverages-menu-edit-btn');
    if (beveragesMenuEditMode) {
        editBtn.textContent = '✕';
        editBtn.style.background = 'rgba(239,68,68,0.2)';
        editBtn.style.borderColor = 'rgba(239,68,68,0.3)';
    } else {
        editBtn.textContent = '✏️';
        editBtn.style.background = 'rgba(255,255,255,0.1)';
        editBtn.style.borderColor = 'rgba(255,255,255,0.2)';
        beveragesMenuEditingItemId = null;
    }
    if (currentBeveragesMenuPro) renderBeveragesMenuOverlayItems(currentBeveragesMenuPro);
}

function renderBeveragesMenuOverlayItems(pro) {
    const slot = document.getElementById('beverages-menu-items-slot');
    if (!slot) return;

    const products = pro.products || pro.menu || [];

    if (!beveragesMenuEditMode) {
        slot.innerHTML = products.map((item, idx) => `
        <div class="menu-item-card" style="animation-delay:${idx * 0.1}s"
                onclick="openBeveragesOrderConfirm('${(item.name||'').replace(/'/g,"\\'")}','${item.price}','${item.unit||''}','${item.currency||''}')">    
        <div class="menu-item-emoji">${item.icon || '🥤'}</div>
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-desc">${item.unit || item.desc || ''}</div>
                </div>
                <div class="menu-item-price">
                    ${typeof item.price === 'number' ? formatPrice(item.price, item.currency) : item.price}
                </div>
            </div>`).join('');
        return;
    }

    slot.innerHTML = products.map((item, idx) => `
        <div class="menu-item-card edit-mode" style="animation-delay:${idx * 0.1}s">
            <div class="menu-item-emoji">${item.icon || '🥤'}</div>
            <div class="menu-item-info">
                <div class="menu-item-name">${item.name}</div>
                <div class="menu-item-desc">${item.unit || item.desc || ''}</div>
            </div>
            <div class="menu-item-price">
                ${typeof item.price === 'number' ? formatPrice(item.price, item.currency) : item.price}
            </div>
            <div class="menu-item-edit-actions">
                <button class="menu-item-edit-btn" onclick="openBeveragesMenuItemForm(${idx})">✏️</button>
                <button class="menu-item-delete-btn" onclick="deleteBeveragesMenuOverlayItem(${idx})">🗑️</button>
            </div>
        </div>`).join('');

    slot.innerHTML += `<button class="chef-menu-add-item-btn" onclick="openBeveragesMenuItemForm(null)">➕ Add New Drink</button>`;
    slot.innerHTML += `<button class="chef-menu-save-changes-btn" onclick="saveBeveragesMenuChanges()">💾 Save Changes</button>`;
}

function openBeveragesMenuItemForm(itemIdx) {
    beveragesMenuEditingItemId = itemIdx;
    const pro = currentBeveragesMenuPro;
    const products = pro.products || pro.menu || [];
    const existing = itemIdx !== null ? products[itemIdx] : null;

    const slot = document.getElementById('beverages-menu-items-slot');
    const formHtml = `
      <div class="chef-menu-edit-form" id="beverages-menu-inline-form">
            <input type="text" id="bmf-name" placeholder="Drink Name" value="${existing ? existing.name.replace(/"/g,'&quot;') : ''}">
            <button type="button" id="bmf-currency" onclick="openCurrencyPicker('bmf-currency')" data-currency="${existing && existing.currency ? existing.currency : ''}" style="width:100%;text-align:left;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;padding:10px 12px;cursor:pointer;font-family:inherit;">${existing && existing.currency ? getCurrencySymbol(existing.currency) + ' ' + existing.currency : '🌍 Select Currency'} <span style="font-size:9px;opacity:0.5;">▾</span></button>
            <input type="number" id="bmf-price" placeholder="Price" value="${existing ? existing.price : ''}">
            <input type="text" id="bmf-unit" placeholder="Unit (e.g. per cup, per bottle)" value="${existing ? (existing.unit||'') : ''}">
            <input type="text" id="bmf-icon" placeholder="Emoji (e.g. 🥤)" value="${existing ? (existing.icon||'') : ''}" maxlength="4">
            <div class="chef-menu-edit-form-actions">
                <button onclick="cancelBeveragesMenuItemForm()" style="background:rgba(255,255,255,0.1);color:#fff;">Cancel</button>
                <button onclick="confirmBeveragesMenuItemForm()" style="background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;">${existing ? 'Update' : 'Add'} Drink</button>
            </div>
        </div>`; 

    renderBeveragesMenuOverlayItems(pro);
    slot.insertAdjacentHTML('afterbegin', formHtml);
}

function cancelBeveragesMenuItemForm() {
    beveragesMenuEditingItemId = null;
    renderBeveragesMenuOverlayItems(currentBeveragesMenuPro);
}

function confirmBeveragesMenuItemForm() {
    const name = document.getElementById('bmf-name').value.trim();
    const currency = document.getElementById('bmf-currency').dataset.currency;
    const price = parseInt(document.getElementById('bmf-price').value);
    const unit = document.getElementById('bmf-unit').value.trim();
    const icon = document.getElementById('bmf-icon').value.trim() || '🥤';

    if (!name) { showGlobalToast('⚠️ Enter drink name!'); return; }
    if (!currency) { showGlobalToast('⚠️ Select a currency!'); return; }
    if (!price || price <= 0) { showGlobalToast('⚠️ Enter valid price!'); return; }

    if (!currentBeveragesMenuPro.products) currentBeveragesMenuPro.products = [];

    if (beveragesMenuEditingItemId === null) {
        currentBeveragesMenuPro.products.push({ name, price, currency, unit, icon });
        showGlobalToast(`✅ "${name}" added!`);
    } else {
        currentBeveragesMenuPro.products[beveragesMenuEditingItemId] = { name, price, currency, unit, icon };
        showGlobalToast(`✅ "${name}" updated!`);
    }

    beveragesMenuEditingItemId = null;
    renderBeveragesMenuOverlayItems(currentBeveragesMenuPro);
        }
function deleteBeveragesMenuOverlayItem(idx) {
    const products = currentBeveragesMenuPro.products || currentBeveragesMenuPro.menu || [];
    const item = products[idx];
    if (!confirm(`Remove "${item.name}"?`)) return;
    products.splice(idx, 1);
    renderBeveragesMenuOverlayItems(currentBeveragesMenuPro);
    showGlobalToast(`🗑️ "${item.name}" removed!`);
}

async function saveBeveragesMenuChanges() {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser || !beveragesMenuIsOwner) { showGlobalToast('⚠️ No permission!'); return; }

    const saveBtn = document.querySelector('#beverages-menu-items-slot .chef-menu-save-changes-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }

    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            await firebase.database().ref(`providers/${sessionUser}`).update({
                products: currentBeveragesMenuPro.products,
                lastUpdated: Date.now()
            });
        }
        showGlobalToast('✅ Drinks saved!');
        toggleBeveragesMenuEditMode();
    } catch (err) {
        showGlobalToast('❌ Failed: ' + err.message);
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Save Changes'; }
    }
}

// ── BEVERAGES ORDER CONFIRM ──
let beveragesOrderDraft = { itemName: null, itemPrice: null, itemUnit: null, currency: null };

function openBeveragesOrderConfirm(itemName, itemPrice, itemUnit, currency) {
    beveragesOrderDraft.itemName = itemName;
    beveragesOrderDraft.itemPrice = itemPrice;
    beveragesOrderDraft.itemUnit = itemUnit;
    beveragesOrderDraft.currency = currency || '';
    document.getElementById('order-confirm-item-name').textContent = itemName;
    document.getElementById('order-confirm-overlay').style.display = 'flex';
    window._beveragesOrderActive = true;
        }

// ── BEVERAGES NOTIFY ME ──
async function toggleBeveragesNotifyMe() {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) { showGlobalToast('⚠️ Please login first!'); return; }
    if (!currentBeveragesMenuPro) return;

    const proId = String(currentBeveragesMenuPro.id);
    const btn = document.getElementById('beverages-notify-me-btn');

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;
        const ref = firebase.database().ref(`notify_subscribers/${proId}/${sessionUser}`);
        const snap = await ref.once('value');

        if (snap.exists()) {
            await ref.remove();
            btn.textContent = '🔔 Notify Me on Next Order Day';
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
            showGlobalToast('🔕 Notifications turned off.');
        } else {
            await ref.set({
                username: sessionUser,
                proId: proId,
                proName: currentBeveragesMenuPro.name || '—',
                subscribedAt: Date.now()
            });
            btn.textContent = '✅ You will be notified!';
            btn.style.background = 'rgba(16,185,129,0.2)';
            btn.style.borderColor = 'rgba(16,185,129,0.4)';
            showGlobalToast('✅ You will be notified on the next order day!');
        }
    } catch(err) {
        showGlobalToast('❌ Failed. Try again.');
    }
}

async function checkBeveragesNotifyMeStatus() {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser || !currentBeveragesMenuPro) return;
    const proId = String(currentBeveragesMenuPro.id);
    const btn = document.getElementById('beverages-notify-me-btn');
    if (!btn) return;

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;
        const snap = await firebase.database()
            .ref(`notify_subscribers/${proId}/${sessionUser}`)
            .once('value');
        if (snap.exists()) {
            btn.textContent = '✅ You will be notified!';
            btn.style.background = 'rgba(16,185,129,0.2)';
            btn.style.borderColor = 'rgba(16,185,129,0.4)';
        }
    } catch(err) { console.warn('checkBeveragesNotifyMeStatus error:', err); }
        }
      
// ── CHEF MENU EDIT MODE STATE ──
let chefMenuEditMode = false;
let chefMenuIsOwner = false;
let chefMenuEditingItemId = null; // null = adding new, otherwise editing existing item id

function checkChefMenuOwnership(pro) {
    const sessionUser = localStorage.getItem('nexus_user_session');
    const editBtn = document.getElementById('chef-menu-edit-btn');
    if (!editBtn) return;

    if (sessionUser && String(currentProfileProId) === String(sessionUser)) {
        chefMenuIsOwner = true;
        editBtn.style.display = 'flex';
    } else {
        chefMenuIsOwner = false;
        editBtn.style.display = 'none';
    }
}

function toggleChefMenuEditMode() {
    if (!chefMenuIsOwner) return;
    chefMenuEditMode = !chefMenuEditMode;
    const editBtn = document.getElementById('chef-menu-edit-btn');

    if (chefMenuEditMode) {
        editBtn.textContent = '✕';
        editBtn.style.background = 'rgba(239,68,68,0.2)';
        editBtn.style.borderColor = 'rgba(239,68,68,0.3)';
    } else {
        editBtn.textContent = '✏️';
        editBtn.style.background = 'rgba(255,255,255,0.1)';
        editBtn.style.borderColor = 'rgba(255,255,255,0.2)';
        chefMenuEditingItemId = null;
    }

    if (currentChefMenuPro) {
        renderChefMenuOverlayItems(currentChefMenuPro);
    }
        }
// ── RENDER MENU ITEMS (handles both normal view & edit mode) ──
function renderChefMenuOverlayItems(pro) {
    const slot = document.getElementById('chef-menu-items-slot');
    if (!slot) return;

    if (!chefMenuEditMode) {
        // Normal customer view — exactly as before
        slot.innerHTML = (pro.menu || []).map((item, idx) => `
           <div class="menu-item-card" style="animation-delay:${idx * 0.1}s" onclick="openItemDetail('${(item.name||'').replace(/'/g, "\\'")}','${item.price}','${item.image||''}','${(item.icon||'🍽️').replace(/'/g,"\\'")}','${(item.desc||'').replace(/'/g,"\\'")}','${item.currency||''}')">               
                <div class="menu-item-emoji">${item.icon || '🍽️'}</div>
                <div class="menu-item-info"><div class="menu-item-name">${item.name}</div><div class="menu-item-desc">${item.desc || ''}</div></div>
                <div class="menu-item-price">${typeof item.price === 'number' ? formatPrice(item.price, item.currency) : item.price}</div>           
            </div>`).join('');
        return;
    }

    // Edit mode view — show edit/delete buttons, no order-on-click
    slot.innerHTML = (pro.menu || []).map((item, idx) => `
        <div class="menu-item-card edit-mode" style="animation-delay:${idx * 0.1}s">
            <div class="menu-item-emoji">${item.icon || '🍽️'}</div>
            <div class="menu-item-info"><div class="menu-item-name">${item.name}</div><div class="menu-item-desc">${item.desc || ''}</div></div>
            <div class="menu-item-price">${typeof item.price === 'number' ? formatPrice(item.price, item.currency) : item.price}</div>            
            <div class="menu-item-edit-actions">
                <button class="menu-item-edit-btn" onclick="openChefMenuItemForm(${idx})">✏️</button>
                <button class="menu-item-delete-btn" onclick="deleteChefMenuOverlayItem(${idx})">🗑️</button>
            </div>
        </div>`).join('');

    // Add New Item button at the bottom
    slot.innerHTML += `<button class="chef-menu-add-item-btn" onclick="openChefMenuItemForm(null)">➕ Add New Item</button>`;

    // Save Changes button
    slot.innerHTML += `<button class="chef-menu-save-changes-btn" onclick="saveChefMenuChanges()">💾 Save Menu Changes</button>`;
}

// ── ADD / EDIT FORM ──
function openChefMenuItemForm(itemIdx) {
    chefMenuEditingItemId = itemIdx; // null = new item, number = index of item being edited
    const pro = currentChefMenuPro;
    const existing = (itemIdx !== null && pro.menu) ? pro.menu[itemIdx] : null;

    const slot = document.getElementById('chef-menu-items-slot');
    const formHtml = `
        <div class="chef-menu-edit-form" id="chef-menu-inline-form">
            <input type="text" id="cmf-name" placeholder="Sunan Dish" value="${existing ? existing.name.replace(/"/g,'&quot;') : ''}">
            <input type="number" id="cmf-price" placeholder="Price ($)" value="${existing ? existing.price : ''}">
            <input type="text" id="cmf-desc" placeholder="Short Description" value="${existing ? (existing.desc||'').replace(/"/g,'&quot;') : ''}">
            <input type="text" id="cmf-icon" placeholder="Emoji (e.g. 🍛)" value="${existing ? (existing.icon||'') : ''}" maxlength="4">
            <div class="chef-menu-edit-form-actions">
                <button onclick="cancelChefMenuItemForm()" style="background:rgba(255,255,255,0.1);color:#fff;">Cancel</button>
                <button onclick="confirmChefMenuItemForm()" style="background:linear-gradient(135deg,#ec4899,#be185d);color:#fff;">${existing ? 'Update' : 'Add'} Dish</button>
            </div>
        </div>`;

    // Re-render list, then inject form at top
    renderChefMenuOverlayItems(pro);
    slot.insertAdjacentHTML('afterbegin', formHtml);
}

function cancelChefMenuItemForm() {
    chefMenuEditingItemId = null;
    renderChefMenuOverlayItems(currentChefMenuPro);
}

function confirmChefMenuItemForm() {
    const name = document.getElementById('cmf-name').value.trim();
    const price = parseInt(document.getElementById('cmf-price').value);
    const desc = document.getElementById('cmf-desc').value.trim();
    const icon = document.getElementById('cmf-icon').value.trim() || '🍽️';

    if (!name) { showGlobalToast('⚠️ Saka sunan dish!'); return; }
    if (!price || price <= 0) { showGlobalToast('⚠️ Saka farashi mai inganci!'); return; }

    if (!currentChefMenuPro.menu) currentChefMenuPro.menu = [];

    if (chefMenuEditingItemId === null) {
        currentChefMenuPro.menu.push({ name, price, desc, icon });
        showGlobalToast(`✅ "${name}" added!`);
    } else {
        currentChefMenuPro.menu[chefMenuEditingItemId] = { name, price, desc, icon };
        showGlobalToast(`✅ "${name}" an update!`);
    }

    chefMenuEditingItemId = null;
    renderChefMenuOverlayItems(currentChefMenuPro);
}

function deleteChefMenuOverlayItem(idx) {
    const item = currentChefMenuPro.menu[idx];
    if (!confirm(`Tabbatar: Cire "${item.name}" daga menu?`)) return;
    currentChefMenuPro.menu.splice(idx, 1);
    renderChefMenuOverlayItems(currentChefMenuPro);
    showGlobalToast(`🗑️ "${item.name}" an cire!`);
        }
        
// ── POST SERVICE INLINE ENGINE ──
function openPostServiceSheet() {
    psShowStep(1);
    // Reset duk food steps
[3,4,5,6].forEach(s => {
    const el = document.getElementById(`ps-chef-step-${s}`);
    if (el) el.style.display = 'none';
});
[3,4,5].forEach(s => {
    const el = document.getElementById(`ps-snacks-step-${s}`);
    if (el) el.style.display = 'none';
    const bv = document.getElementById(`ps-beverages-step-${s}`);
    if (bv) bv.style.display = 'none';
});
    
    renderPSCatList();
    const overlay = document.getElementById("post-service-sheet-overlay");
    const sheet = document.getElementById("post-service-sheet");
    overlay.style.display = "flex";
    setTimeout(() => { sheet.style.transform = "scale(1)"; sheet.style.opacity = "1"; }, 10);
    document.body.style.overflow = "hidden";
}

function closePSManual() {
    const sheet = document.getElementById("post-service-sheet");
    sheet.style.transform = "scale(0.9)";
    sheet.style.opacity = "0";
    setTimeout(() => { document.getElementById("post-service-sheet-overlay").style.display = "none"; }, 300);
    document.body.style.overflow = "";
}

function closePSOverlay(event) {
    if (event.target.id !== "post-service-sheet-overlay") return;
    closePSManual();
}

function psShowStep(step) {
    psInlineState.currentStep = step;
    ["ps-inline-step-1","ps-inline-step-2","ps-inline-step-3"].forEach((id,i) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (i+1 === step) ? "flex" : "none";
    });

    const dotsWrapper = document.getElementById("ps-inline-step-dots");
    const backBtn = document.getElementById("ps-back-step-inline-btn");
    const titleEl = document.getElementById("ps-sheet-title-label");

    if (step === 1) {
        dotsWrapper.style.display = "none";
        backBtn.style.display = "none";
        titleEl.textContent = "Choose Your Service";
    } else {
        dotsWrapper.style.display = "flex";
        backBtn.style.display = "block";
        
        // Titles bisa formType
        if (step === 2) {
            const typeLabels = {
                chef: "👨‍🍳 Chef Details",
                snacks: "🧁 Snacks Details", 
                beverages: "🥤 Beverages Details",
                general: "Service Details"
            };
            titleEl.textContent = typeLabels[psInlineState.formType] || "Service Details";
        } else {
            titleEl.textContent = "Location & Submit";
        }

        [1,2,3].forEach(i => {
            const dot = document.getElementById(`ps-dot-${i}`);
            if (dot) dot.style.background = i === step ? "#6366f1" : i < step ? "#10b981" : "rgba(255,255,255,0.2)";
        });
    }
    }

function psGoBack() {
    if (psInlineState.currentStep > 1) psShowStep(psInlineState.currentStep - 1);
}

function psGoToStep3() {
    const price = document.getElementById("ps-price").value;
    const serviceDesc = document.getElementById("ps-service-description").value.trim();
    const desc = document.getElementById("ps-description").value.trim();
    const days = Array.from(document.querySelectorAll("#ps-inline-step-2 .ps-day-chip-inline input:checked")).map(el => el.value);
    const idType = document.getElementById("ps-id-type").value;

    if (!price || parseInt(price) <= 0) { psShowToast("⚠️ Saka farashi mai inganci!"); return; }
    if (serviceDesc.length < 10) { psShowToast("⚠️ Service description too short — minimum 10 characters!"); return; }
    if (desc.length < 20) { psShowToast("⚠️ Bio is too short — minimum 20 characters!"); return; }
    if (days.length === 0) { psShowToast("⚠️ Select at least one day!"); return; }
    if (Object.keys(portfolioFiles).length < 4) { psShowToast(`⚠️ Upload at least 4 photos! (${Object.keys(portfolioFiles).length}/4)`); return; }
    if (!idType) { psShowToast("⚠️ Select your ID type!"); return; }
    if (!verificationFiles.id) { psShowToast("⚠️ Saka hoton ID dinka!"); return; }
    if (!verificationFiles.selfie) { psShowToast("⚠️ Upload your selfie and ID!"); return; }

   psInlineState.price = parseInt(price);
psInlineState.serviceDescription = serviceDesc;
psInlineState.priceUnit = document.getElementById("ps-price-unit").value;
const selectedCurrency = document.getElementById("ps-price-currency").dataset.currency;
if (!selectedCurrency) { psShowToast("⚠️ Select your currency!"); return; }
psInlineState.currency = selectedCurrency;
psInlineState.description = desc;
psInlineState.availableDays = days;
psInlineState.idType = idType;

document.getElementById("ps-sum-category").textContent = `${psInlineState.selectedCategoryLabel} → ${psInlineState.selectedSubcategory}`;
document.getElementById("ps-sum-price").textContent = `${formatPrice(psInlineState.price, psInlineState.currency)} ${psInlineState.priceUnit}`;
document.getElementById("ps-sum-days").textContent = days.join(", "); 
    psShowStep(3);
}

// ── DOCTOR: VALIDATE + GO TO GPS STEP ──
function psDoctorGoToStep3() {
    const specialization = document.getElementById("doctor-specialization").value;
    const licenseNumber = document.getElementById("doctor-license-number").value.trim();
    const clinicName = document.getElementById("doctor-clinic-name").value.trim();
    const experience = document.getElementById("doctor-experience").value;
    const fee = document.getElementById("doctor-fee").value;
    const feeUnit = document.getElementById("doctor-fee-unit").value;
    const currency = document.getElementById("doctor-fee-currency").dataset.currency;
    const bio = document.getElementById("doctor-bio").value.trim();
    const days = Array.from(document.querySelectorAll("#doctor-days-grid input:checked")).map(el => el.value);
    const idType = document.getElementById("doctor-id-type").value;

    if (!specialization) { psShowToast("⚠️ Select a specialization!"); return; }
    if (!licenseNumber) { psShowToast("⚠️ Saka license number!"); return; }
    if (!currency) { psShowToast("⚠️ Select a currency!"); return; }
    if (!fee || parseInt(fee) <= 0) { psShowToast("⚠️ Saka consultation fee mai inganci!"); return; }
    if (bio.length < 20) { psShowToast("⚠️ Bio is too short — minimum 20 characters!"); return; }
    if (days.length === 0) { psShowToast("⚠️ Select at least one day!"); return; }
    if (!idType) { psShowToast("⚠️ Select your ID type!"); return; }
    if (!verificationFiles.id) { psShowToast("⚠️ Saka hoton ID dinka!"); return; }
    if (!verificationFiles.selfie) { psShowToast("⚠️ Upload your selfie and ID!"); return; }

    // Save into psInlineState for submission
    psInlineState.price = parseInt(fee);
    psInlineState.priceUnit = feeUnit;
    psInlineState.currency = currency;
    psInlineState.description = bio;
    psInlineState.availableDays = days;
    psInlineState.idType = idType;
    psInlineState.doctorSpecialization = specialization;
    psInlineState.doctorLicenseNumber = licenseNumber;
    psInlineState.doctorClinicName = clinicName;
    psInlineState.doctorExperience = experience;

    document.getElementById("ps-sum-category").textContent = `${psInlineState.selectedCategoryLabel} → ${specialization}`;
    document.getElementById("ps-sum-price").textContent = `${formatPrice(psInlineState.price, currency)} ${feeUnit}`;
    document.getElementById("ps-sum-days").textContent = days.join(", ");

    psShowStep(3);
        }

// ── VETERINARY: VALIDATE + GO TO GPS STEP ──
function psVetGoToStep3() {
    const animalTypes = Array.from(document.querySelectorAll("#vet-animal-types input:checked")).map(el => el.value);
    const licenseNumber = document.getElementById("vet-license-number").value.trim();
    const serviceType = document.getElementById("vet-service-type").value;
    const fee = document.getElementById("vet-fee").value;
    const feeUnit = document.getElementById("vet-fee-unit").value;
    const currency = document.getElementById("vet-fee-currency").dataset.currency;
    const bio = document.getElementById("vet-bio").value.trim();
    const days = Array.from(document.querySelectorAll("#vet-days-grid input:checked")).map(el => el.value);
    const idType = document.getElementById("vet-id-type").value;

    if (animalTypes.length === 0) { psShowToast("⚠️ Select at least one animal type!"); return; }
    if (!licenseNumber) { psShowToast("⚠️ Saka license number!"); return; }
    if (!serviceType) { psShowToast("⚠️ Select a service type!"); return; }
    if (!currency) { psShowToast("⚠️ Select a currency!"); return; }
    if (!fee || parseInt(fee) <= 0) { psShowToast("⚠️ Saka service fee mai inganci!"); return; }
    if (bio.length < 20) { psShowToast("⚠️ Bio is too short — minimum 20 characters!"); return; }
    if (days.length === 0) { psShowToast("⚠️ Select at least one day!"); return; }
    if (!idType) { psShowToast("⚠️ Select your ID type!"); return; }
    if (!verificationFiles.id) { psShowToast("⚠️ Saka hoton ID dinka!"); return; }
    if (!verificationFiles.selfie) { psShowToast("⚠️ Upload your selfie and ID!"); return; }

    psInlineState.price = parseInt(fee);
    psInlineState.priceUnit = feeUnit;
    psInlineState.currency = currency;
    psInlineState.description = bio;
    psInlineState.availableDays = days;
    psInlineState.idType = idType;
    psInlineState.vetAnimalTypes = animalTypes;
    psInlineState.vetLicenseNumber = licenseNumber;
    psInlineState.vetServiceType = serviceType;

    document.getElementById("ps-sum-category").textContent = `${psInlineState.selectedCategoryLabel} → ${animalTypes.join(', ')}`;
    document.getElementById("ps-sum-price").textContent = `${formatPrice(psInlineState.price, currency)} ${feeUnit}`;
    document.getElementById("ps-sum-days").textContent = days.join(", ");

    psShowStep(3);
        }
        
function captureGPSInline() {
    captureGPSUniversal({
        statusId: 'ps-gps-status-inline',
        coordsId: 'ps-gps-coords-inline',
        btnId: 'ps-gps-btn-inline',
        cardId: 'ps-gps-card-inline',
        stateTarget: psInlineState,
        summaryFields: {
            'ps-sum-location': (s) => `${s.gpsLat.toFixed(4)}, ${s.gpsLng.toFixed(4)}`
        }
    });
        }
        
async function uploadPortfolioFilesInline(username, onProgress) {
    const keys = Object.keys(portfolioFiles);
    let uploaded = 0;
    const statusEl = document.getElementById("ps-upload-status-inline");
    const countEl = document.getElementById("ps-upload-count-inline");
    const barEl = document.getElementById("ps-upload-bar-inline");
    if (statusEl) statusEl.style.display = "block";
    for (const key of keys) {
        const entry = portfolioFiles[key];
        if (!entry.file) continue;
        try {
            const formData = new FormData();
            formData.append("file", entry.file);
            formData.append("type", "portfolio");
            formData.append("username", username || "guest");
            const res = await fetch(`${BACKEND_URL}/upload`, { method: "POST", body: formData });
            const data = await res.json();
            if (data.success) portfolioFiles[key].url = data.url;
        } catch(err) { console.warn(`Slot ${key} upload failed:`, err); }
        uploaded++;
        const pct = Math.round((uploaded/keys.length)*100);
        if (countEl) countEl.textContent = `${uploaded}/${keys.length}`;
        if (barEl) barEl.style.width = pct + "%";
        if (onProgress) onProgress(uploaded, keys.length);
    }
    return Object.values(portfolioFiles).filter(e=>e.url).map(e=>({ url:e.url, type:e.type.includes("video")?"video":"image" }));
        }

    async function uploadVerificationFilesInline(username, onProgress) {
    const results = {};
    const idToken = firebase.auth().currentUser ? await firebase.auth().currentUser.getIdToken() : null;
    const keys = Object.keys(verificationFiles);
    let uploaded = 0;
    for (const key of keys) {
        const entry = verificationFiles[key];
        if (!entry.file) continue;
        try {
            const formData = new FormData();
            formData.append("file", entry.file);
            formData.append("docType", key);
            const res = await fetch(`${BACKEND_URL}/upload-verification`, {
                method: "POST",
                headers: idToken ? { "Authorization": `Bearer ${idToken}` } : {},
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                results[key] = data.key;
            } else {
                psShowToast(`❌ ${key}: ${data.error || 'unknown'} (status ${res.status})`);
            }
        } catch(err) {
            console.warn(`Verification ${key} upload failed:`, err);
            psShowToast(`❌ ${key} network error: ${err.message}`);
        }
        uploaded++;
        if (onProgress) onProgress(uploaded, keys.length);
    }
    return results;
    }

// ── WORLD-CLASS PROGRESS MODAL CONTROLLER ──
const psProgSteps = ["portfolio","verification","saving"];
function psProgressShow() {
    document.getElementById("ps-progress-overlay").style.display = "flex";
    document.getElementById("ps-prog-error").style.display = "none";
    psProgSteps.forEach(s => {
        const el = document.querySelector(`.ps-prog-step[data-step="${s}"]`);
        el.classList.remove("active","done");
        el.querySelector(".ps-prog-icon").textContent = { portfolio:"📸", verification:"🪪", saving:"☁️" }[s];
        document.getElementById(`ps-prog-sub-${s}`).textContent = "Waiting…";
    });
    psProgressSetPercent(0);
}
function psProgressSetPercent(pct) {
    document.getElementById("ps-prog-bar-fill").style.width = Math.min(100,Math.max(0,pct)) + "%";
    document.getElementById("ps-prog-percent").textContent = Math.round(Math.min(100,Math.max(0,pct))) + "%";
}
function psProgressStepActive(step, subtext) {
    const el = document.querySelector(`.ps-prog-step[data-step="${step}"]`);
    if (el) el.classList.add("active");
    if (subtext) document.getElementById(`ps-prog-sub-${step}`).textContent = subtext;
}
function psProgressStepDone(step, subtext) {
    const el = document.querySelector(`.ps-prog-step[data-step="${step}"]`);
    if (el) { el.classList.remove("active"); el.classList.add("done"); el.querySelector(".ps-prog-icon").textContent = "✓"; }
    if (subtext) document.getElementById(`ps-prog-sub-${step}`).textContent = subtext;
}
function psProgressError(message) {
    document.getElementById("ps-prog-error").style.display = "block";
    document.getElementById("ps-prog-error").textContent = message;
}
function psProgressHide() {
    document.getElementById("ps-progress-overlay").style.display = "none";
}
        
async function submitServiceInline() {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    if (!psInlineState.gpsReady) { psShowToast("⚠️ Capture your GPS location before submitting!"); return; }
    const submitBtn = document.getElementById("ps-submit-btn-inline");
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Submitting...";
    psProgressShow();

    try {
        const username = localStorage.getItem("nexus_user_session") || "guest";

        psProgressStepActive("portfolio", "Preparing files…");
        const portfolioUrls = await uploadPortfolioFilesInline(username, (u,t) => {
            psProgressStepActive("portfolio", `${u} of ${t} files uploaded`);
            psProgressSetPercent((u/t) * 33);
        });
        psProgressStepDone("portfolio", "Portfolio uploaded");
        psProgressSetPercent(33);

        psProgressStepActive("verification", "Uploading documents…");
        const verificationKeys = await uploadVerificationFilesInline(username, (u,t) => {
            psProgressStepActive("verification", `${u} of ${t} documents uploaded`);
            psProgressSetPercent(33 + (u/t) * 33);
        });

        if (!verificationKeys.id || !verificationKeys.selfie) {
            psProgressError("We couldn't verify your identity documents. Please check your connection and try again.");
            setTimeout(() => psProgressHide(), 2200);
            psShowToast("❌ Verification upload failed!");
            submitBtn.disabled = false;
            submitBtn.textContent = "🚀 Post Service";
            return;
        }
        psProgressStepDone("verification", "Identity verified");
        psProgressSetPercent(66);

        psProgressStepActive("saving", "Writing your profile…");

        // Firebase write — if firebase is available
        if (typeof firebase !== "undefined" && firebase.database) {
            const db = firebase.database();
            const firstServiceItemId = "svc_" + Date.now();
            const basePayload = {
                category: psInlineState.selectedCategory,
                subcategory: psInlineState.selectedSubcategory,
                categoryLabel: psInlineState.selectedCategoryLabel,
                pricing: { base: psInlineState.price, unit: psInlineState.priceUnit, currency: psInlineState.currency },
                bio: psInlineState.description,
                schedule: psInlineState.availableDays,
                location: { lat: psInlineState.gpsLat, lng: psInlineState.gpsLng, updatedAt: Date.now() },
                city: psInlineState.gpsCity || '',
                address: psInlineState.gpsAddress || '',
                portfolio: portfolioUrls,
                verification: { idType: psInlineState.idType, idKey: verificationKeys.id, selfieKey: verificationKeys.selfie, submittedAt: Date.now() },
                status: "pending_verification",
                createdAt: Date.now(),
                username: username,
                categories: {
                    Services: {
                        items: {
                            [firstServiceItemId]: {
                                name: psInlineState.selectedSubcategory || psInlineState.selectedCategoryLabel || "Service",
                                desc: psInlineState.serviceDescription || "",
                                price: psInlineState.price,
                                currency: psInlineState.currency,
                                unit: psInlineState.priceUnit,
                                image: (portfolioUrls[0] && portfolioUrls[0].url) || "",
                                createdAt: Date.now()
                            }
                        }
                    }
                }
            };

            // Extra fields specific to Doctor
            if (psInlineState.selectedCategory === "doctor") {
                basePayload.specialization = psInlineState.doctorSpecialization;
                basePayload.licenseNumber = psInlineState.doctorLicenseNumber;
                basePayload.clinicName = psInlineState.doctorClinicName || "";
                basePayload.yearsOfPractice = psInlineState.doctorExperience || "";
            }

            // Extra fields specific to Veterinary
            if (psInlineState.selectedCategory === "veterinary") {
                basePayload.animalTypes = psInlineState.vetAnimalTypes;
                basePayload.licenseNumber = psInlineState.vetLicenseNumber;
                basePayload.serviceType = psInlineState.vetServiceType;
            }

            await db.ref(`providers/${username}`).set(basePayload);
        }

        psProgressStepDone("saving", "Profile saved");
        psProgressSetPercent(100);

        setTimeout(() => {
            psProgressHide();
            document.getElementById("ps-success-overlay-inline").style.display = "flex";
        }, 500);

    } catch(err) {
        console.error("Submit error:", err);
        psProgressError("Something went wrong: " + err.message);
        setTimeout(() => psProgressHide(), 2200);
        psShowToast("❌ Error: " + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "🚀 Post Service";
    }
}

function handlePortfolioFile(input, slotIndex) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 50*1024*1024) { psShowToast("❌ File too large — max 50MB!"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        const slot = document.getElementById(`ps-slot-${slotIndex}`);
        if (!slot) return;
        slot.classList.add("filled");
        const isVideo = file.type.includes("video");
        slot.querySelector(".ps-port-inner").innerHTML = `
            ${isVideo
                ? `<video src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" muted playsinline></video>`
                : `<img src="${e.target.result}" class="ps-port-preview" alt="Portfolio">`}
            <button class="ps-port-remove" onclick="removePortfolioSlotInline(event,${slotIndex})">✕</button>`;
    };
    reader.readAsDataURL(file);
    portfolioFiles[slotIndex] = { file, url: null, type: file.type };
}

function removePortfolioSlotInline(event, slotIndex) {
    event.preventDefault(); event.stopPropagation();
    delete portfolioFiles[slotIndex];
    const slot = document.getElementById(`ps-slot-${slotIndex}`);
    slot.classList.remove("filled");
    const icons = ["📷","📷","📷","📷","📷","📷","🎥","🎥"];
    const labels = ["Photo 1","Photo 2","Photo 3","Photo 4","Photo 5","Photo 6","Video 1","Video 2"];
    slot.querySelector(".ps-port-inner").innerHTML = `<span>${icons[slotIndex]}</span><span style="font-size:9px;color:rgba(255,255,255,0.3);">${labels[slotIndex]}</span>`;
}

function handleVerificationFile(input, slotKey) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 15*1024*1024) { psShowToast("❌ File too large!"); return; }
    if (!file.type.includes("image")) { psShowToast("❌ Hoto kawai!"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        const slot = document.getElementById(`verify-slot-${slotKey}`);
        slot.style.borderColor = "rgba(16,185,129,0.5)";
        slot.style.borderStyle = "solid";
        slot.innerHTML = `<input type="file" accept="image/*" ${slotKey==='selfie'?'capture="user"':''} onchange="handleVerificationFile(this,'${slotKey}')" hidden><img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="${slotKey}">`;
    };
    reader.readAsDataURL(file);
    verificationFiles[slotKey] = { file, url: null, type: file.type };
                             }

    function renderPSCatList(filteredCats) {
    const cats = filteredCats || PS_CATS;
    const list = document.getElementById("ps-cat-list");
    list.innerHTML = cats.map((cat,idx) => `
        <div id="ps-cat-item-${idx}" onclick="togglePSCat(${idx})" style="display:flex;align-items:center;gap:10px;padding:12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.03);transition:all 0.2s ease;">
            <span style="font-size:17px;">${cat.icon}</span>
            <span style="flex:1;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cat.label}</span>
            <span style="font-size:10px;color:rgba(255,255,255,0.2);">➔</span>
        </div>`).join('');
    document.getElementById("ps-sub-empty-state").style.display = "block";
    document.getElementById("ps-sub-list-content").innerHTML = "";
}

function togglePSCat(idx) {
    PS_CATS.forEach((_,i) => {
        const item = document.getElementById(`ps-cat-item-${i}`);
        if (item) {
            item.style.background = i===idx ? "rgba(56,189,248,0.15)" : "transparent";
            item.style.borderLeft = i===idx ? "3px solid #38bdf8" : "none";
        }
    });
    const cat = PS_CATS[idx];
    if (!cat) return;
    document.getElementById("ps-sub-empty-state").style.display = "none";
    document.getElementById("ps-sub-list-content").innerHTML = `
        <div style="font-size:10px;font-weight:800;color:#38bdf8;text-transform:uppercase;letter-spacing:0.5px;padding:6px 8px 10px;">${cat.label} Specialties</div>
        ${cat.subs.map(sub => `
            <div onclick="selectPSSub('${cat.label}','${sub}',${idx})" style="padding:10px 12px;margin-bottom:5px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:8px;cursor:pointer;transition:all 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">${sub}</div>
        `).join('')}`;
}

function filterInlineCategories(query) {
    const q = query.trim().toLowerCase();
    const filtered = q==="" ? PS_CATS : PS_CATS.filter(c => c.label.toLowerCase().includes(q) || c.subs.some(s=>s.toLowerCase().includes(q)));
    renderPSCatList(filtered);
}

function selectPSSub(catLabel, sub, idx) {
    const cat = PS_CATS[idx];
    psInlineState.selectedCategory = cat.id;
    psInlineState.selectedCategoryLabel = catLabel;
    psInlineState.selectedSubcategory = sub;
    
    // Detect form type
    if (cat.id === "chef") {
        psInlineState.formType = "chef";
    } else if (cat.id === "snacks") {
        psInlineState.formType = "snacks";
    } else if (cat.id === "beverages") {
        psInlineState.formType = "beverages";
    } else if (cat.id === "doctor") {
        psInlineState.formType = "doctor";
    } else if (cat.id === "veterinary") {
        psInlineState.formType = "veterinary";
    } else {
        psInlineState.formType = "general";
    }
    
    psShowStep(2);
    psShowFoodForm();
        }

// ── FOOD FORM CONTROLLER ──
function psShowFoodForm() {
    const type = psInlineState.formType;
    document.getElementById('ps-form-chef').style.display = 'none';
    document.getElementById('ps-form-snacks').style.display = 'none';
    document.getElementById('ps-form-beverages').style.display = 'none';
    document.getElementById('ps-form-general').style.display = 'none';
    document.getElementById('ps-form-doctor').style.display = 'none';
    document.getElementById('ps-form-veterinary').style.display = 'none';

    if (type === 'chef') {
        document.getElementById('ps-form-chef').style.display = 'flex';
    } else if (type === 'snacks') {
        document.getElementById('ps-form-snacks').style.display = 'flex';
    } else if (type === 'beverages') {
        document.getElementById('ps-form-beverages').style.display = 'flex';
    } else if (type === 'doctor') {
        document.getElementById('ps-form-doctor').style.display = 'flex';
    } else if (type === 'veterinary') {
        document.getElementById('ps-form-veterinary').style.display = 'flex';
    } else {
        document.getElementById('ps-form-general').style.display = 'flex';
    }
        }
// ── CHEF STEP 3: MENU BUILDER ──
function psChefGoToStep3() {
    const cuisines = Array.from(
        document.querySelectorAll('#chef-cuisine-chips input:checked')
    ).map(el => el.value);
    const style = document.getElementById('chef-cooking-style').value;
    const exp = document.getElementById('chef-experience').value;
    const bio = document.getElementById('chef-bio').value.trim();

    if (cuisines.length === 0) { psShowToast('⚠️ Select at least one cuisine!'); return; }
    if (!style) { psShowToast('⚠️ Select a cooking style!'); return; }
    if (!exp) { psShowToast('⚠️ Select years of experience!'); return; }
    if (bio.length < 10) { psShowToast('⚠️ Bio is too short — minimum 10 characters!'); return; }

    psInlineState.chefCuisines = cuisines;
    psInlineState.chefStyle = style;
    psInlineState.chefExperience = exp;
    psInlineState.chefBio = bio;

    // Hide step 2 entirely
    document.getElementById('ps-inline-step-2').style.display = 'none';

    // Nuna chef step 3
    const step3 = document.getElementById('ps-chef-step-3');
    step3.style.display = 'flex';
    step3.style.flex = '1';
    step3.style.overflowY = 'auto';
    step3.style.flexDirection = 'column';
    step3.style.gap = '12px';
    step3.style.padding = '12px 16px 16px';

    // Update header — babu "Menu Builder" kalmar
    document.getElementById('ps-sheet-title-label').textContent = '🍽️ Ƙara Dishes';
    document.getElementById('ps-back-step-inline-btn').style.display = 'block';

    // Dots
    [1,2,3,4,5,6].forEach(i => {
        const dot = document.getElementById(`ps-dot-${i}`);
        if (dot) dot.style.background = i === 3 ? '#ec4899' : i < 3 ? '#10b981' : 'rgba(255,255,255,0.2)';
    });

    psInlineState.currentStep = 3;
        }
// ── CHEF STEP 4: SERVICE SETUP ──
function psChefGoToStep4() {
    const menuItems = getChefMenuItems();
    if (menuItems.length === 0) { psShowToast('⚠️ Add at least one menu item!'); return; }

    psInlineState.chefMenu = menuItems;
    psShowChefStep(4);
}

// ── CHEF STEP 5: SCHEDULE + VERIFICATION ──
function psChefGoToStep5() {
    const eventTypes = Array.from(
        document.querySelectorAll('#chef-event-types input:checked')
    ).map(el => el.value);
    const maxGuests = document.getElementById('chef-max-guests').value;
    const radius = document.getElementById('chef-service-radius').value;
    const serviceType = document.getElementById('chef-service-type').value;

    if (eventTypes.length === 0) { psShowToast('⚠️ Select at least one event type!'); return; }
    if (!serviceType) { psShowToast('⚠️ Select a service type!'); return; }

    psInlineState.chefEventTypes = eventTypes;
    psInlineState.chefMaxGuests = maxGuests;
    psInlineState.chefRadius = radius;
    psInlineState.chefServiceType = serviceType;

    psShowChefStep(5);
}

// ── CHEF STEP 6: GPS ──
function psChefGoToStep6() {
    const days = Array.from(
        document.querySelectorAll('#chef-days-grid input:checked')
    ).map(el => el.value);
    const timeFrom = document.getElementById('chef-time-from').value;
    const timeTo = document.getElementById('chef-time-to').value;
    const notice = document.getElementById('chef-advance-notice').value;
    const idType = document.getElementById('chef-id-type').value;

    if (days.length === 0) { psShowToast('⚠️ Select at least one day!'); return; }
    if (!timeFrom || !timeTo) { psShowToast('⚠️ Saka lokacin aiki!'); return; }
    if (!idType) { psShowToast('⚠️ Select your ID type!'); return; }
    if (!verificationFiles.id) { psShowToast('⚠️ Upload your ID photo!'); return; }
    if (!verificationFiles.selfie) { psShowToast('⚠️ Upload your selfie and ID!'); return; }

    psInlineState.chefDays = days;
    psInlineState.chefTimeFrom = timeFrom;
    psInlineState.chefTimeTo = timeTo;
    psInlineState.chefNotice = notice;

    // Show GPS step
    psShowChefStep(6);
    renderChefSummary();
}

// ── CHEF STEP CONTROLLER ──
function psShowChefStep(step) {
    [3,4,5,6].forEach(s => {
        const el = document.getElementById(`ps-chef-step-${s}`);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(`ps-chef-step-${step}`);
    if (target) target.style.display = 'flex';

    // Update dots
    const totalSteps = 6;
    psInlineState.currentStep = step;
    [1,2,3,4,5,6].forEach(i => {
        const dot = document.getElementById(`ps-dot-${i}`);
        if (dot) dot.style.background = i === step ? '#ec4899' : i < step ? '#10b981' : 'rgba(255,255,255,0.2)';
    });

    // Update title
    const titles = {
        3: '🍽️ Menu Builder',
        4: '⚙️ Service Setup',
        5: '📅 Schedule & Verification',
        6: '📍 Location & Submit'
    };
    document.getElementById('ps-sheet-title-label').textContent = titles[step] || 'Chef Registration';
}

// ── MENU BUILDER HELPERS ──
let chefMenuItems = [];

function getChefMenuItems() {
    return chefMenuItems;
}

function addChefMenuItem() {
    const name = document.getElementById('chef-menu-item-name').value.trim();
    const price = document.getElementById('chef-menu-item-price').value;
    const category = document.getElementById('chef-menu-item-category').value;
    const desc = document.getElementById('chef-menu-item-desc').value.trim();
    const currency = document.getElementById('chef-menu-currency').dataset.currency;

    if (!name) { psShowToast('⚠️ Saka sunan dish!'); return; }
    if (!currency) { psShowToast('⚠️ Select a currency!'); return; }
    if (!price || parseInt(price) <= 0) { psShowToast('⚠️ Saka farashi mai inganci!'); return; }
    if (!category) { psShowToast('⚠️ Select a category!'); return; }

    const item = {
        id: Date.now(),
        name,
        price: parseInt(price),
        currency,
        category,
        desc: desc || ''
    };

    chefMenuItems.push(item);
    renderChefMenuList();

    // Clear inputs
    document.getElementById('chef-menu-item-name').value = '';
    document.getElementById('chef-menu-item-price').value = '';
    document.getElementById('chef-menu-item-desc').value = '';
    document.getElementById('chef-menu-item-category').value = '';

    psShowToast(`✅ "${name}" added!`);
}

function removeChefMenuItem(id) {
    chefMenuItems = chefMenuItems.filter(item => item.id !== id);
    renderChefMenuList();
}

function renderChefMenuList() {
    const list = document.getElementById('chef-menu-items-list');
    if (!list) return;

    if (chefMenuItems.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:12px;">Your menu has no items yet</div>`;
        return;
    }

    list.innerHTML = chefMenuItems.map(item => `
        <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 12px;margin-bottom:8px;">
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:800;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;">${item.category} ${item.desc ? '· ' + item.desc : ''}</div>
            </div>
            <div style="font-size:13px;font-weight:800;color:#34d399;flex-shrink:0;">${formatPrice(item.price, item.currency)}</div>
            <button onclick="removeChefMenuItem(${item.id})" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#ef4444;font-size:11px;padding:4px 8px;cursor:pointer;flex-shrink:0;">✕</button>
        </div>`).join('');
}

// ── SNACKS VENDOR ──
let snacksItems = [];

function psSnacksGoToStep3() {
    const bio = document.getElementById('snacks-bio').value.trim();
    if (bio.length < 10) { psShowToast('⚠️ Bio is too short!'); return; }
    psInlineState.snacksBio = bio;
    psShowSnacksStep(3);
}

function psSnacksGoToStep4() {
    if (snacksItems.length === 0) { psShowToast('⚠️ Add at least one product!'); return; }
    psInlineState.snacksItems = snacksItems;
    psShowSnacksStep(4);
}

function psSnacksGoToGPS() {
    const days = Array.from(
        document.querySelectorAll('#snacks-days-grid input:checked')
    ).map(el => el.value);
    const delivery = document.getElementById('snacks-delivery-type').value;
    const idType = document.getElementById('snacks-id-type').value;

    if (days.length === 0) { psShowToast('⚠️ Select at least one day!'); return; }
    if (!delivery) { psShowToast('⚠️ Select a delivery type!'); return; }
    if (!idType) { psShowToast('⚠️ Select your ID type!'); return; }
    if (!verificationFiles.id) { psShowToast('⚠️ Upload your ID photo!'); return; }
    if (!verificationFiles.selfie) { psShowToast('⚠️ Upload your selfie and ID!'); return; }

    psInlineState.snacksDays = days;
    psInlineState.snacksDelivery = delivery;
    psShowSnacksStep(5);
}

function psShowSnacksStep(step) {
    [3,4,5].forEach(s => {
        const el = document.getElementById(`ps-snacks-step-${s}`);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(`ps-snacks-step-${step}`);
    if (target) target.style.display = 'flex';

    const titles = {
        3: '🧁 Products List',
        4: '📅 Schedule & Verification',
        5: '📍 Location & Submit'
    };
    document.getElementById('ps-sheet-title-label').textContent = titles[step] || 'Snacks Registration';

    [1,2,3,4,5].forEach(i => {
        const dot = document.getElementById(`ps-dot-${i}`);
        if (dot) dot.style.background = i === step ? '#f59e0b' : i < step ? '#10b981' : 'rgba(255,255,255,0.2)';
    });
}

function addSnacksItem() {
    const name = document.getElementById('snacks-item-name').value.trim();
    const price = document.getElementById('snacks-item-price').value;
    const unit = document.getElementById('snacks-item-unit').value;
    const currency = document.getElementById('snacks-item-currency').dataset.currency;

    if (!name) { psShowToast('⚠️ Saka sunan product!'); return; }
    if (!currency) { psShowToast('⚠️ Select a currency!'); return; }
    if (!price || parseInt(price) <= 0) { psShowToast('⚠️ Saka farashi!'); return; }

    const item = { id: Date.now(), name, price: parseInt(price), currency, unit };
    snacksItems.push(item);
    renderSnacksItemsList();

    document.getElementById('snacks-item-name').value = '';
    document.getElementById('snacks-item-price').value = '';
    psShowToast(`✅ "${name}" added!`);
}

function removeSnacksItem(id) {
    snacksItems = snacksItems.filter(i => i.id !== id);
    renderSnacksItemsList();
}

function renderSnacksItemsList() {
    const list = document.getElementById('snacks-items-list');
    if (!list) return;

    if (snacksItems.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:12px;">No products added yet</div>`;
        return;
    }

    list.innerHTML = snacksItems.map(item => `
        <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 12px;margin-bottom:8px;">
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:800;color:#ffffff;">${item.name}</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.4);">${item.unit}</div>
            </div>
            <div style="font-size:13px;font-weight:800;color:#f59e0b;">${formatPrice(item.price, item.currency)}</div>
            <button onclick="removeSnacksItem(${item.id})" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#ef4444;font-size:11px;padding:4px 8px;cursor:pointer;">✕</button>
        </div>`).join('');
}

// ── BEVERAGES VENDOR ──
let beveragesItems = [];

function psBeveragesGoToStep3() {
    const bio = document.getElementById('beverages-bio').value.trim();
    if (bio.length < 10) { psShowToast('⚠️ Bio is too short!'); return; }
    psInlineState.beveragesBio = bio;
    psShowBeveragesStep(3);
}

function psBeveragesGoToStep4() {
    if (beveragesItems.length === 0) { psShowToast('⚠️ Add at least one drink!'); return; }
    psInlineState.beveragesItems = beveragesItems;
    psShowBeveragesStep(4);
}

function psBeveragesGoToGPS() {
    const days = Array.from(
        document.querySelectorAll('#beverages-days-grid input:checked')
    ).map(el => el.value);
    const delivery = document.getElementById('beverages-delivery-type').value;
    const idType = document.getElementById('beverages-id-type').value;

    if (days.length === 0) { psShowToast('⚠️ Select at least one day!'); return; }
    if (!delivery) { psShowToast('⚠️ Select a delivery type!'); return; }
    if (!idType) { psShowToast('⚠️ Select your ID type!'); return; }
    if (!verificationFiles.id) { psShowToast('⚠️ Upload your ID photo!'); return; }
    if (!verificationFiles.selfie) { psShowToast('⚠️ Upload your selfie and ID!'); return; }

    psInlineState.beveragesDays = days;
    psInlineState.beveragesDelivery = delivery;
    psShowBeveragesStep(5);
}

function psShowBeveragesStep(step) {
    [3,4,5].forEach(s => {
        const el = document.getElementById(`ps-beverages-step-${s}`);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(`ps-beverages-step-${step}`);
    if (target) target.style.display = 'flex';

    const titles = {
        3: '🥤 Drinks List',
        4: '📅 Schedule & Verification',
        5: '📍 Location & Submit'
    };
    document.getElementById('ps-sheet-title-label').textContent = titles[step] || 'Beverages Registration';

    [1,2,3,4,5].forEach(i => {
        const dot = document.getElementById(`ps-dot-${i}`);
        if (dot) dot.style.background = i === step ? '#06b6d4' : i < step ? '#10b981' : 'rgba(255,255,255,0.2)';
    });
}

function addBeveragesItem() {
    const name = document.getElementById('beverages-item-name').value.trim();
    const price = document.getElementById('beverages-item-price').value;
    const unit = document.getElementById('beverages-item-unit').value;
    const currency = document.getElementById('beverages-item-currency').dataset.currency;

    if (!name) { psShowToast('⚠️ Saka sunan drink!'); return; }
    if (!currency) { psShowToast('⚠️ Select a currency!'); return; }
    if (!price || parseInt(price) <= 0) { psShowToast('⚠️ Saka farashi!'); return; }

    const item = { id: Date.now(), name, price: parseInt(price), currency, unit };
    beveragesItems.push(item);
    renderBeveragesItemsList();
    document.getElementById('beverages-item-name').value = '';
    document.getElementById('beverages-item-price').value = '';
    psShowToast(`✅ "${name}" added!`);
}

function removeBeveragesItem(id) {
    beveragesItems = beveragesItems.filter(i => i.id !== id);
    renderBeveragesItemsList();
}

function renderBeveragesItemsList() {
    const list = document.getElementById('beverages-items-list');
    if (!list) return;

    if (beveragesItems.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:12px;">No drinks added yet</div>`;
        return;
    }

    list.innerHTML = beveragesItems.map(item => `
        <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 12px;margin-bottom:8px;">
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:800;color:#ffffff;">${item.name}</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.4);">${item.unit}</div>
            </div>
            <div style="font-size:13px;font-weight:800;color:#06b6d4;">${formatPrice(item.price, item.currency)}</div>
            <button onclick="removeBeveragesItem(${item.id})" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#ef4444;font-size:11px;padding:4px 8px;cursor:pointer;">✕</button>
        </div>`).join('');
}

// ── CHEF SUMMARY ──
function renderChefSummary() {
    const el = document.getElementById('chef-gps-summary');
    if (!el) return;
    el.innerHTML = `
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:600;">Category</span>
            <span style="font-size:11px;color:#ffffff;font-weight:700;">${psInlineState.selectedCategoryLabel} → ${psInlineState.selectedSubcategory}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:600;">Style</span>
            <span style="font-size:11px;color:#ffffff;font-weight:700;">${psInlineState.chefStyle || '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:600;">Menu Items</span>
            <span style="font-size:11px;color:#ffffff;font-weight:700;">${chefMenuItems.length} dishes</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;">
            <span style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:600;">Days</span>
            <span style="font-size:11px;color:#ffffff;font-weight:700;text-align:right;max-width:60%;">${(psInlineState.chefDays || []).join(', ')}</span>
        </div>`;
}

// ── CHEF FOOD PHOTOS ──
const chefFoodPhotos = {};

function handleChefFoodPhoto(input, slotIndex) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 50*1024*1024) { psShowToast('❌ File too large!'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        const slot = document.getElementById(`cf-slot-${slotIndex}`);
        if (!slot) return;
        slot.classList.add('filled');
        const isVideo = file.type.includes('video');
        slot.querySelector('.ps-port-inner').innerHTML = `
            ${isVideo
                ? `<video src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" muted playsinline></video>`
                : `<img src="${e.target.result}" class="ps-port-preview" alt="Food">`}
            <button class="ps-port-remove" onclick="removeChefFoodPhoto(event,${slotIndex})">✕</button>`;
    };
    reader.readAsDataURL(file);
    chefFoodPhotos[slotIndex] = { file, url: null, type: file.type };
}

function removeChefFoodPhoto(event, slotIndex) {
    event.preventDefault(); event.stopPropagation();
    delete chefFoodPhotos[slotIndex];
    const slot = document.getElementById(`cf-slot-${slotIndex}`);
    slot.classList.remove('filled');
    slot.querySelector('.ps-port-inner').innerHTML = `<span>🍽️</span><span style="font-size:9px;color:rgba(255,255,255,0.3);">Hoto ${slotIndex+1}</span>`;
}

// ── SNACKS PHOTOS ──
const snacksPhotos = {};

function handleSnacksPhoto(input, slotIndex) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const slot = document.getElementById(`sn-slot-${slotIndex}`);
        if (!slot) return;
        slot.classList.add('filled');
        slot.querySelector('.ps-port-inner').innerHTML = `
            <img src="${e.target.result}" class="ps-port-preview" alt="Snack">
            <button class="ps-port-remove" onclick="removeSnacksPhoto(event,${slotIndex})">✕</button>`;
    };
    reader.readAsDataURL(file);
    snacksPhotos[slotIndex] = { file, url: null, type: file.type };
}

function removeSnacksPhoto(event, slotIndex) {
    event.preventDefault(); event.stopPropagation();
    delete snacksPhotos[slotIndex];
    const slot = document.getElementById(`sn-slot-${slotIndex}`);
    slot.classList.remove('filled');
    slot.querySelector('.ps-port-inner').innerHTML = `<span>🧁</span><span style="font-size:9px;color:rgba(255,255,255,0.3);">Hoto ${slotIndex+1}</span>`;
}

// ── BEVERAGES PHOTOS ──
const beveragesPhotos = {};

function handleBeveragesPhoto(input, slotIndex) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const slot = document.getElementById(`bv-slot-${slotIndex}`);
        if (!slot) return;
        slot.classList.add('filled');
        slot.querySelector('.ps-port-inner').innerHTML = `
            <img src="${e.target.result}" class="ps-port-preview" alt="Drink">
            <button class="ps-port-remove" onclick="removeBeveragesPhoto(event,${slotIndex})">✕</button>`;
    };
    reader.readAsDataURL(file);
    beveragesPhotos[slotIndex] = { file, url: null, type: file.type };
}

function removeBeveragesPhoto(event, slotIndex) {
    event.preventDefault(); event.stopPropagation();
    delete beveragesPhotos[slotIndex];
    const slot = document.getElementById(`bv-slot-${slotIndex}`);
    slot.classList.remove('filled');
    slot.querySelector('.ps-port-inner').innerHTML = `<span>🥤</span><span style="font-size:9px;color:rgba(255,255,255,0.3);">Hoto ${slotIndex+1}</span>`;
}

// ── CHEF GPS ──
function captureChefGPS() {
    captureGPSUniversal({
        statusId: 'chef-gps-status',
        coordsId: 'chef-gps-coords',
        btnId: 'chef-gps-btn',
        cardId: 'chef-gps-card',
        stateTarget: psInlineState,
        onSuccess: renderChefSummary
    });
        }

// ── SNACKS GPS ──
function captureSnacksGPS() {
    captureGPSUniversal({
        statusId: 'snacks-gps-status',
        coordsId: 'snacks-gps-coords',
        cardId: 'snacks-gps-card',
        stateTarget: psInlineState,
        summaryFields: {
            'snacks-sum-category': () => `${psInlineState.selectedCategoryLabel} → ${psInlineState.selectedSubcategory}`,
            'snacks-sum-count': () => `${snacksItems.length} products`,
            'snacks-sum-location': (s) => `${s.gpsLat.toFixed(4)}, ${s.gpsLng.toFixed(4)}`
        }
    });
        }

// ── BEVERAGES GPS ──
function captureBeveragesGPS() {
    captureGPSUniversal({
        statusId: 'beverages-gps-status',
        coordsId: 'beverages-gps-coords',
        stateTarget: psInlineState,
        summaryFields: {
            'beverages-sum-count': () => `${beveragesItems.length} drinks`,
            'beverages-sum-location': (s) => `${s.gpsLat.toFixed(4)}, ${s.gpsLng.toFixed(4)}`
        }
    });
        }

// ── CHEF SUBMIT ──
async function submitChefService() {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    if (!psInlineState.gpsReady) { psShowToast('⚠️ Capture your GPS location!'); return; }
    if (chefMenuItems.length === 0) { psShowToast('⚠️ Your menu is empty!'); return; }

    const btn = document.getElementById('chef-submit-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';

    try {
        const username = localStorage.getItem('nexus_user_session') || 'guest';

        // Upload food photos
        const photoUrls = [];
        for (const key of Object.keys(chefFoodPhotos)) {
            const entry = chefFoodPhotos[key];
            if (!entry.file) continue;
            try {
                const formData = new FormData();
                formData.append('file', entry.file);
                formData.append('type', 'portfolio');
                formData.append('username', username);
                const res = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) photoUrls.push({ url: data.url, type: 'image' });
            } catch(e) { console.warn('Photo upload failed:', e); }
        }

        // Upload verification
        const verificationKeys = await uploadVerificationFilesInline(username);
        if (!verificationKeys.id || !verificationKeys.selfie) {
            psShowToast('❌ Verification upload failed!');
            btn.disabled = false;
            btn.textContent = '🚀 Post Chef Service';
            return;
        }

        // Firebase write
        if (typeof firebase !== 'undefined' && firebase.database) {
            await firebase.database().ref(`providers/${username}`).set({
                category: 'chef',
                subcategory: psInlineState.selectedSubcategory,
                categoryLabel: psInlineState.selectedCategoryLabel,
                cuisines: psInlineState.chefCuisines,
                cookingStyle: psInlineState.chefStyle,
                experience: psInlineState.chefExperience,
                bio: psInlineState.chefBio,
                menu: chefMenuItems,
                serviceType: psInlineState.chefServiceType,
                eventTypes: psInlineState.chefEventTypes,
                maxGuests: psInlineState.chefMaxGuests,
                serviceRadius: psInlineState.chefRadius,
                pricing: {
                    base: parseInt(document.getElementById('chef-starting-price').value) || 0,
                    unit: document.getElementById('chef-price-unit').value
                },
                schedule: psInlineState.chefDays,
                operatingHours: {
                    from: psInlineState.chefTimeFrom,
                    to: psInlineState.chefTimeTo
                },
                advanceNotice: psInlineState.chefNotice,
                portfolio: photoUrls,
                location: {
                    lat: psInlineState.gpsLat,
                    lng: psInlineState.gpsLng,
                    updatedAt: Date.now()
                },
                city: psInlineState.gpsCity || '',
                address: psInlineState.gpsAddress || '',
                verification: {
                    idType: document.getElementById('chef-id-type').value,
                    idKey: verificationKeys.id,
                    selfieKey: verificationKeys.selfie,
                    submittedAt: Date.now()
                },
                status: 'pending_verification',
                createdAt: Date.now(),
                username: username
            });
        }

        document.getElementById('ps-success-overlay-inline').style.display = 'flex';

    } catch(err) {
        console.error('Chef submit error:', err);
        psShowToast('❌ Error: ' + err.message);
    }

    btn.disabled = false;
    btn.textContent = '🚀 Post Chef Service';
}

// ── SNACKS SUBMIT ──
async function submitSnacksService() {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    if (!psInlineState.gpsReady) { psShowToast('⚠️ Capture your GPS location!'); return; }
    if (snacksItems.length === 0) { psShowToast('⚠️ Add at least one product!'); return; }
    if (Object.keys(snacksPhotos).length < 2) { psShowToast('⚠️ Upload at least 2 photos!'); return; }

    const btn = document.getElementById('snacks-submit-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';

    try {
        const username = localStorage.getItem('nexus_user_session') || 'guest';

        // Upload photos
        const photoUrls = [];
        for (const key of Object.keys(snacksPhotos)) {
            const entry = snacksPhotos[key];
            if (!entry.file) continue;
            try {
                const formData = new FormData();
                formData.append('file', entry.file);
                formData.append('type', 'portfolio');
                formData.append('username', username);
                const res = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) photoUrls.push({ url: data.url, type: 'image' });
            } catch(e) { console.warn('Photo upload failed:', e); }
        }

        const verificationKeys = await uploadVerificationFilesInline(username);

        if (typeof firebase !== 'undefined' && firebase.database) {
            await firebase.database().ref(`providers/${username}`).set({
                category: 'snacks',
                subcategory: psInlineState.selectedSubcategory,
                categoryLabel: psInlineState.selectedCategoryLabel,
                bio: psInlineState.snacksBio,
                products: snacksItems,
                deliveryType: psInlineState.snacksDelivery,
                schedule: psInlineState.snacksDays,
                portfolio: photoUrls,
                location: {
                    lat: psInlineState.gpsLat,
                    lng: psInlineState.gpsLng,
                    updatedAt: Date.now()
                },
                city: psInlineState.gpsCity || '',
                address: psInlineState.gpsAddress || '',
                verification: {
                    idType: document.getElementById('snacks-id-type').value,
                    idKey: verificationKeys.id || '',
                    selfieKey: verificationKeys.selfie || '',
                    submittedAt: Date.now()
                },
                status: 'pending_verification',
                createdAt: Date.now(),
                username: username
            });
        }

        document.getElementById('ps-success-overlay-inline').style.display = 'flex';

    } catch(err) {
        console.error('Snacks submit error:', err);
        psShowToast('❌ Error: ' + err.message);
    }

    btn.disabled = false;
    btn.textContent = '🚀 Post Snacks Service';
}

// ── BEVERAGES SUBMIT ──
async function submitBeveragesService() {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    if (!psInlineState.gpsReady) { psShowToast('⚠️ Capture your GPS location!'); return; }
    if (beveragesItems.length === 0) { psShowToast('⚠️ Add at least one drink!'); return; }
    if (Object.keys(beveragesPhotos).length < 2) { psShowToast('⚠️ Upload at least 2 photos!'); return; }

    const btn = document.getElementById('beverages-submit-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';

    try {
        const username = localStorage.getItem('nexus_user_session') || 'guest';

        const photoUrls = [];
        for (const key of Object.keys(beveragesPhotos)) {
            const entry = beveragesPhotos[key];
            if (!entry.file) continue;
            try {
                const formData = new FormData();
                formData.append('file', entry.file);
                formData.append('type', 'portfolio');
                formData.append('username', username);
                const res = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) photoUrls.push({ url: data.url, type: 'image' });
            } catch(e) { console.warn('Photo upload failed:', e); }
        }

        const verificationKeys = await uploadVerificationFilesInline(username);

        if (typeof firebase !== 'undefined' && firebase.database) {
            await firebase.database().ref(`providers/${username}`).set({
                category: 'beverages',
                subcategory: psInlineState.selectedSubcategory,
                categoryLabel: psInlineState.selectedCategoryLabel,
                bio: psInlineState.beveragesBio,
                products: beveragesItems,
                deliveryType: psInlineState.beveragesDelivery,
                schedule: psInlineState.beveragesDays,
                portfolio: photoUrls,
                location: {
                    lat: psInlineState.gpsLat,
                    lng: psInlineState.gpsLng,
                    updatedAt: Date.now()
                },
                city: psInlineState.gpsCity || '',
                address: psInlineState.gpsAddress || '',
                verification: {
                    idType: document.getElementById('beverages-id-type').value,
                    idKey: verificationKeys.id || '',
                    selfieKey: verificationKeys.selfie || '',
                    submittedAt: Date.now()
                },
                status: 'pending_verification',
                createdAt: Date.now(),
                username: username
            });
        }

        document.getElementById('ps-success-overlay-inline').style.display = 'flex';

    } catch(err) {
        console.error('Beverages submit error:', err);
        psShowToast('❌ Error: ' + err.message);
    }

    btn.disabled = false;
    btn.textContent = '🚀 Post Beverages Service';
        }
        
function psShowToast(message) {
    const existing = document.getElementById("ps-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "ps-toast";
    toast.textContent = message;
    toast.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(20,25,45,0.97);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:10px 20px;border-radius:50px;font-size:12px;font-weight:600;z-index:99999;backdrop-filter:blur(20px);box-shadow:0 8px 30px rgba(0,0,0,0.4);white-space:nowrap;`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity="0"; toast.style.transition="opacity 0.3s ease"; setTimeout(()=>toast.remove(),300); }, 3000);
}

// ════════════════════════════════════════════════════════════
//  🍽️ DAILY UPLOAD — DISH BLOCKS ENGINE (dropdown-based)
// ════════════════════════════════════════════════════════════

let dailyUploadBlocks = []; // [{ blockId, dishName, dishPrice, photos: { 0: {file,type}, ... } }]
let dailyUploadBlockCounter = 0;

function getAvailableMenuForDailyUpload() {
    // currentChefMenuPro yana dauke da menu na chef din da yake buÉ™e profile dinsa
    if (currentChefMenuPro && currentChefMenuPro.menu) return currentChefMenuPro.menu;
    if (uploadWindowState.proData && uploadWindowState.proData.menu) return uploadWindowState.proData.menu;
    return [];
}

function addDailyUploadBlock() {
    const menu = getAvailableMenuForDailyUpload();
    if (!menu || menu.length === 0) {
        showGlobalToast('⚠️ Your menu has no dishes! Add a dish in your Chef Menu before doing a daily upload.');
        return;
    }

    dailyUploadBlockCounter++;
    const blockId = dailyUploadBlockCounter;

    dailyUploadBlocks.push({
        blockId,
        dishName: '',
        dishPrice: null,
        dishCurrency: null,
        photos: {}
    });

    renderDailyUploadBlocks();
}

function removeDailyUploadBlock(blockId) {
    dailyUploadBlocks = dailyUploadBlocks.filter(b => b.blockId !== blockId);
    renderDailyUploadBlocks();
}

function renderDailyUploadBlocks() {
    const container = document.getElementById('daily-upload-blocks-container');
    if (!container) return;

    const menu = getAvailableMenuForDailyUpload();

    if (dailyUploadBlocks.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:16px;color:rgba(0,0,0,0.3);font-size:12px;">Danna "➕ Ƙara Wani Dish" don fara</div>`;
        return;
    }

    container.innerHTML = dailyUploadBlocks.map(block => {
        const filledCount = Object.keys(block.photos).length;
        return `
        <div style="background:rgba(236,72,153,0.04);border:1px solid rgba(236,72,153,0.15);border-radius:14px;padding:12px;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <select onchange="setDailyUploadBlockDish(${block.blockId}, this.value)" style="flex:1;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;color:#111827;font-size:12px;padding:8px 10px;outline:none;">
                    <option value="">— Select Dish from Menu —</option>
                    ${menu.map(item => {
                        const usedElsewhere = dailyUploadBlocks.some(b => b.blockId !== block.blockId && b.dishName === item.name);
                        return `<option value="${item.name.replace(/"/g,'&quot;')}|${item.price}|${item.currency||''}" ${block.dishName === item.name ? 'selected' : ''} ${usedElsewhere ? 'disabled' : ''}>${item.name}${usedElsewhere ? ' (Already selected)' : ''} (${formatPrice(item.price, item.currency)})</option>`;
                    }).join('')}
                </select>
                <button onclick="removeDailyUploadBlock(${block.blockId})" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#ef4444;font-size:11px;padding:8px 10px;cursor:pointer;flex-shrink:0;">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
                ${[0,1,2,3].map(slotIdx => {
                    const photo = block.photos[slotIdx];
                    if (photo && photo.previewUrl) {
                        const isVideo = photo.type && photo.type.includes('video');
                        return `
                        <div class="ps-port-slot filled" style="position:relative;">
                            ${isVideo
                                ? `<video src="${photo.previewUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" muted playsinline></video>`
                                : `<img src="${photo.previewUrl}" class="ps-port-preview" alt="Upload">`}
                            <button class="ps-port-remove" onclick="removeDailyUploadBlockPhoto(${block.blockId},${slotIdx})">✕</button>
                        </div>`;
                    }
                    return `
                        <label class="ps-port-slot" style="display:block;">
                            <input type="file" accept="image/*,video/*" onchange="handleDailyUploadBlockPhoto(this,${block.blockId},${slotIdx})" hidden>
                            <div class="ps-port-inner"><span>🍽️</span><span style="font-size:9px;color:rgba(0,0,0,0.3);">Hoto ${slotIdx+1}</span></div>
                        </label>`;
                }).join('')}
            </div>
            <div style="font-size:10px;color:rgba(0,0,0,0.35);margin-top:6px;font-weight:600;">${filledCount}/4 hotuna/videos</div>
        </div>`;
    }).join('');
}

function setDailyUploadBlockDish(blockId, value) {
    const block = dailyUploadBlocks.find(b => b.blockId === blockId);
    if (!block) return;
    if (!value) { block.dishName = ''; block.dishPrice = null; block.dishCurrency = null; renderDailyUploadBlocks(); return; }
    const [name, price, currency] = value.split('|');
    const alreadyUsed = dailyUploadBlocks.some(b => b.blockId !== blockId && b.dishName === name);
    if (alreadyUsed) {
        showGlobalToast(`⚠️ You already selected "${name}" in another block! Each dish can only be used once per day.`);
        renderDailyUploadBlocks();
        return;
    }
    block.dishName = name;
    block.dishPrice = parseInt(price);
    block.dishCurrency = currency || '';
    renderDailyUploadBlocks();
        }

function handleDailyUploadBlockPhoto(input, blockId, slotIdx) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { showGlobalToast('❌ File too large — max 50MB!'); return; }

    const block = dailyUploadBlocks.find(b => b.blockId === blockId);
    if (!block) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        block.photos[slotIdx] = { file, type: file.type, previewUrl: e.target.result, uploadedUrl: null };
        renderDailyUploadBlocks();
    };
    reader.readAsDataURL(file);
}

function removeDailyUploadBlockPhoto(blockId, slotIdx) {
    const block = dailyUploadBlocks.find(b => b.blockId === blockId);
    if (!block) return;
    delete block.photos[slotIdx];
    renderDailyUploadBlocks();
        }
runOnServicesInit(() => {
    const storyWrapper = document.getElementById('quantum-story-wrapper');
    const storyTrack = document.getElementById('stories-track-container');
    if (!storyWrapper || !storyTrack) return;

    let resumeTimer = null;

    function pauseMarquee() {
        storyTrack.classList.add('marquee-paused');
        if (resumeTimer) clearTimeout(resumeTimer);
    }

    function scheduleResume() {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
            storyTrack.classList.remove('marquee-paused');
        }, 4000);
    }

    storyWrapper.addEventListener('pointerdown', pauseMarquee, { passive: true });
    storyWrapper.addEventListener('touchstart', pauseMarquee, { passive: true });
    storyWrapper.addEventListener('scroll', scheduleResume, { passive: true });
    storyWrapper.addEventListener('scroll', () => {
        const singleSetWidth = storyTrack.scrollWidth / 2;
        if (singleSetWidth > 0) {
            if (storyWrapper.scrollLeft >= singleSetWidth) {
                storyWrapper.scrollLeft -= singleSetWidth;
            } else if (storyWrapper.scrollLeft <= 0) {
                storyWrapper.scrollLeft += singleSetWidth;
            }
        }
    }, { passive: true });
    storyWrapper.addEventListener('pointerup', scheduleResume, { passive: true });
    storyWrapper.addEventListener('touchend', scheduleResume, { passive: true });
});        
// ── DOMContentLoaded ──
runOnServicesInit(() => {
   populateCurrencyDropdowns();
   initAppElements();
    if (!window._nexusProvidersLoadedOnce) {
   const _loadTimeout = new Promise(resolve => setTimeout(resolve, 8000));
   Promise.race([
       Promise.all([loadContentFromFirebase(), loadRealProvidersFromFirebase()]),
       _loadTimeout
   ]).then(() => {
        window._nexusProvidersLoadedOnce = true;
        initAppElements();

        // ── Idan an bude shafin ta hanyar shared link (?pro=ID) ──
        const urlParams = new URLSearchParams(window.location.search);
        const sharedProId = urlParams.get('pro');
        if (sharedProId) {
            const targetPro = PROS.find(p => String(p.id) === sharedProId);
            if (targetPro) openProfileSheet(targetPro.id);
        }
    });
   }
    document.getElementById("search-input").addEventListener("keydown", (e) => { if(e.key==="Enter") triggerRouterCheck(); });
    document.getElementById("search-trigger-btn").addEventListener("click", triggerRouterCheck);
    document.getElementById("route-all-opt").addEventListener("click", () => selectRoutePreference("all"));
    document.getElementById("route-near-opt").addEventListener("click", () => selectRoutePreference("near"));
    document.getElementById("router-overlay").addEventListener("click", () => { document.getElementById("router-overlay").style.display = "none"; });

   function nxLazyLoadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load ' + src));
            document.body.appendChild(s);
        });
   }
   
   document.getElementById("near-me-btn").addEventListener("click", () => {
        if (!navigator.geolocation) {
            showGlobalToast("Your browser does not support location services.");
            return;
        }
        document.getElementById("location-permission-overlay").style.display = "flex";
    });

    function closeLocationPermissionModal() {
        document.getElementById("location-permission-overlay").style.display = "none";
    }
    window.closeLocationPermissionModal = closeLocationPermissionModal;

     function confirmLocationPermission() {
        document.getElementById("location-permission-overlay").style.display = "none";
        document.getElementById("nearme-scan-overlay").style.display = "flex";
        const footerEl1 = document.getElementById("footer-placeholder");
        if (footerEl1) footerEl1.style.display = "none";
        attemptNearMeGPSFix(true);
    }
    window.confirmLocationPermission = confirmLocationPermission;

    function attemptNearMeGPSFix(isFirstAttempt) {
        if (isFirstAttempt) {
            document.getElementById("nearme-scan-status").textContent = "Finding pros near you...";
            document.getElementById("nearme-scan-sub").textContent = "This will only take a moment";
        }
        navigator.geolocation.getCurrentPosition(
            () => {
                document.getElementById("nearme-scan-overlay").style.display = "none";
                state.nearMeActive = true;
                switchView("results");
            },
            (err) => {
                if (isFirstAttempt) {
                    document.getElementById("nearme-scan-sub").textContent = "Retrying a different way...";
                    attemptNearMeGPSFix(false);
                else {
                    document.getElementById("nearme-scan-overlay").style.display = "none";
                    const footerEl2 = document.getElementById("footer-placeholder");
                    if (footerEl2) footerEl2.style.display = "block";
                    const msgs = {
                        1: "Location access denied. Enable it in your browser settings to see pros near you.",
                        2: "Could not determine your location. Please try again outdoors.",
                        3: "Location request timed out. Please try again."
                    };
                    showGlobalToast(msgs[err.code] || "Location error.");
                }
            },
            isFirstAttempt
                ? { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                : { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
    }
    window.attemptNearMeGPSFix = attemptNearMeGPSFix;   
    document.getElementById("view-all-traders-btn").addEventListener("click", () => { state.selectedCat = null; switchView("results"); });
    document.getElementById("close-profile-sheet-btn").addEventListener("click", closeProfileSheet);

    const storyOverlay = document.getElementById("story-overlay-deck");
    storyOverlay.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (e.target.closest("button")) return;
        state.isStoryPaused = true;
    });
    storyOverlay.addEventListener("pointerup", (e) => {
    if (e.target.closest("button")) return;
    state.isStoryPaused = false;
    const x = e.clientX;
    const half = window.innerWidth / 2;

    if (state.isLiveStoryMode) {
        const uploads = state.liveStoryData.uploads;
        if (x >= half) {
            const nextSlide = state.activeStorySlide + 1;
            if (nextSlide < uploads.length) { state.activeStorySlide = nextSlide; state.storyProgress = 0; updateStoryOverlayUi(); }
            else closeStoryDeck();
        } else {
            const prevSlide = state.activeStorySlide - 1;
            if (prevSlide >= 0) { state.activeStorySlide = prevSlide; state.storyProgress = 0; updateStoryOverlayUi(); }
        }
        return;
    }
if (state.storySingleMode) return;
    const currentProData = PRO_STORIES[state.activeProStoryIndex];
    if (x >= half) {
        const nextSlide = state.activeStorySlide + 1;
        if (nextSlide < currentProData.stories.length) { state.activeStorySlide = nextSlide; state.storyProgress = 0; updateStoryOverlayUi(); }
        else {
            const nextPro = state.activeProStoryIndex + 1;
            if (nextPro < PRO_STORIES.length) { state.activeProStoryIndex = nextPro; state.activeStorySlide = 0; state.storyProgress = 0; updateStoryOverlayUi(); }
            else closeStoryDeck();
        }
    } else {
        const prevSlide = state.activeStorySlide - 1;
        if (prevSlide >= 0) { state.activeStorySlide = prevSlide; state.storyProgress = 0; updateStoryOverlayUi(); }
        else {
            const prevPro = state.activeProStoryIndex - 1;
            if (prevPro >= 0) { state.activeProStoryIndex = prevPro; state.activeStorySlide = 0; state.storyProgress = 0; updateStoryOverlayUi(); }
        }
    }
});

   document.getElementById("close-story-overlay-btn").addEventListener("click", (e) => { e.stopPropagation(); closeStoryDeck(); });
   // REPLACE: story-action-order-btn click handler (a cikin DOMContentLoaded)
document.getElementById("story-action-order-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    state.isStoryPaused = true;
    if (state.storyIntervalId) clearInterval(state.storyIntervalId);
    
   const itemName = document.getElementById("story-canvas-main-title").innerText;
    const itemPrice = document.getElementById("story-canvas-main-price").innerText;
    
    orderDraft.itemName = itemName;
    orderDraft.itemPrice = itemPrice;
    orderDraft.currency = state.activeStoryCurrency || '';
    orderDraft.fromStory = true; // flag 
    
    // Set vendor info daga current story pro
    const currentProData = state.isLiveStoryMode ? null : PRO_STORIES[state.activeProStoryIndex];
    const pro = state.isLiveStoryMode
        ? PROS.find(p => p.name === state.liveStoryData?.username)
        : PROS.find(p => p.id === currentProData?.proId);
    
    if (pro) {
        currentChefMenuPro = pro;
    }
    
    document.getElementById('order-confirm-item-name').textContent = itemName;
    document.getElementById('order-confirm-overlay').style.display = 'flex';
}); 
    document.getElementById("story-action-profile-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        state.isStoryPaused = true;
        if (state.storyIntervalId) clearInterval(state.storyIntervalId);
        state.storyOpenedFromProfile = true;
      
        document.getElementById('story-overlay-deck').style.display = 'none';

        if (state.isLiveStoryMode) {
            const username = state.liveStoryData.username;
            const matchedPro = PROS.find(p => p.name === username || String(p.id) === username);
            if (matchedPro) { openProfileSheet(matchedPro.id); } else { openProfileSheet(username); }
            return;
        }

        const currentProData = PRO_STORIES[state.activeProStoryIndex];
        openProfileSheet(currentProData.proId);
    });
    document.getElementById("chef-menu-close-btn").addEventListener("click", closeChefMenuOverlay);
   
        // AUTO-CHECK WARNINGS ON LOAD
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (sessionUser) checkProviderWarnings(sessionUser);
    if (sessionUser) checkProviderApprovalStatus();
    
    // Initialize push notifications
    initPushNotifications();
    
    // Initialize notification bell
initNotificationBell();

// AUTO-START upload window checker
startUploadWindowChecker();

// AUTO-LOAD daily stories
loadAndRenderDailyStories();

window.addEventListener("popstate", function() {
    const profileSheet = document.getElementById("profile-sheet-overlay");
    if (profileSheet && profileSheet.style.display === "block") {
        closeProfileSheet();
    }
});
});


// ── GLOBAL STATE ADDITIONS ──
let currentProfileProId = null;  // Track which pro is open in profile sheet
let selectedReportReason = null;
let selectedReviewStars = 0;
const reportProofFiles = {};

window.openProfileSheet = openProfileSheet;

// ── PATCH openProfileSheet to track currentProfileProId ──
// NOTE: Nemo wannan layi a cikin openProfileSheet function ɗinka:
//   const pro = PROS.find(p => p.id === proId);
//   if (!pro) return;
// Saka wannan BAYAN wannan layin biyu:
//   currentProfileProId = proId;
// (Ka nemi 'currentProfileProId = proId;' a cikin openProfileSheet a kasa — already included)

// ── OVERRIDE openProfileSheet to add currentProfileProId tracking ──
const _originalOpenProfileSheet = openProfileSheet;
// We patch by re-declaring; ensure this runs after original definition
(function patchOpenProfileSheet() {
    const origFn = window.openProfileSheet;
    window.openProfileSheet = function(proId) {
        currentProfileProId = proId;
        origFn(proId);
    };
})();

// ── SHARE PROVIDER MENU LINK ──
function shareProviderProfile() {
    if (!currentProfileProId) return;
    const pro = PROS.find(p => String(p.id) === String(currentProfileProId));
    const shareTitle = pro ? `${pro.name} — Menu` : 'View Menu';

    // If this provider has a real registered username (linked to live
    // Firebase provider data), use the backend share-preview route so
    // WhatsApp/Facebook can render the image+description directly.
    // Otherwise, fall back to the regular demo link.
    const shareUrl = (pro && pro.realUsername)
        ? `https://oryzon-backend-ed1q.onrender.com/share/${pro.realUsername}`
        : `${window.location.origin}${window.location.pathname}?pro=${currentProfileProId}`;

    if (navigator.share) {
        navigator.share({ title: shareTitle, url: shareUrl }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showGlobalToast('🔗 Link copied! You can now share it with anyone.');
        }).catch(() => {
            showGlobalToast('⚠️ Failed to copy link.');
        });
    }
    }
// ═══════════════════════════
// 🚩 REPORT FUNCTIONS
// ═══════════════════════════

function openReportModal() {
    if (!currentProfileProId) return;
    const pro = PROS.find(p => String(p.id) === String(currentProfileProId));
    if (!pro) return;

    // Reset state
    selectedReportReason = null;
    document.querySelectorAll('.report-reason-chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('report-description-input').value = '';
    document.getElementById('report-reporter-name-input').value = '';
    document.getElementById('report-custom-reason-input').value = '';
    document.getElementById('report-custom-reason-input').style.display = 'none';
    Object.keys(reportProofFiles).forEach(k => delete reportProofFiles[k]);
    [0,1,2,3].forEach(i => {
        const slot = document.getElementById(`rp-slot-${i}`);
        if (slot) slot.innerHTML = `<input type="file" accept="image/*" onchange="handleReportProof(this,${i})" hidden>📷`;
    });

    document.getElementById('report-modal-pro-name-label').textContent = pro.name;
    document.getElementById('report-modal-overlay').style.display = 'flex';
}

function closeReportModal() {
    document.getElementById('report-modal-overlay').style.display = 'none';
}

function selectReportReason(el, reason) {
    document.querySelectorAll('.report-reason-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedReportReason = reason;

    const customInput = document.getElementById('report-custom-reason-input');
    if (reason === 'Other') {
        customInput.style.display = 'block';
    } else {
        customInput.style.display = 'none';
    }
}

function handleReportProof(input, slotIndex) {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.includes('image')) { showGlobalToast('⚠️ Images only!'); return; }
    if (file.size > 10 * 1024 * 1024) { showGlobalToast('⚠️ File too large (max 10MB)'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
        const slot = document.getElementById(`rp-slot-${slotIndex}`);
        if (!slot) return;
        slot.innerHTML = `
            <input type="file" accept="image/*" onchange="handleReportProof(this,${slotIndex})" hidden>
            <img src="${e.target.result}" alt="proof">
            <button class="proof-remove" onclick="removeReportProof(event,${slotIndex})">✕</button>`;
    };
    reader.readAsDataURL(file);
    reportProofFiles[slotIndex] = file;
}

function removeReportProof(event, slotIndex) {
    event.preventDefault();
    event.stopPropagation();
    delete reportProofFiles[slotIndex];
    const slot = document.getElementById(`rp-slot-${slotIndex}`);
    if (slot) slot.innerHTML = `<input type="file" accept="image/*" onchange="handleReportProof(this,${slotIndex})" hidden>📷`;
}

async function submitReport() {
 if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }   
    const pro = PROS.find(p => String(p.id) === String(currentProfileProId));
    if (!pro) return;

    const reason = selectedReportReason === 'Other'
        ? document.getElementById('report-custom-reason-input').value.trim()
        : selectedReportReason;

    const description = document.getElementById('report-description-input').value.trim();
    const reporterName = document.getElementById('report-reporter-name-input').value.trim() || 'Anonymous';

    if (!reason) { showGlobalToast('⚠️ Please select a reason!'); return; }
    if (description.length < 10) { showGlobalToast('⚠️ Please add a description (min 10 chars)!'); return; }

    const btn = document.getElementById('report-submit-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';

    try {
        // Upload proof images
        const proofUrls = [];
        for (const key of Object.keys(reportProofFiles)) {
            const file = reportProofFiles[key];
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', 'report_proof');
                formData.append('username', reporterName);
                const res = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) proofUrls.push(data.url);
            } catch (e) { console.warn('Proof upload failed:', e); }
        }

        // Write to Firebase
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
            await db.ref(`reports/${reportId}`).set({
                providerId: String(pro.id),
                providerName: pro.name,
                reporterName: reporterName,
                reason: reason,
                description: description,
                proofs: proofUrls,
                status: 'pending',
                createdAt: Date.now()
            });
        }

        closeReportModal();
       
        // Aika push zuwa provider
        await sendPushToUser(
            currentProfileProId,
            '🚩 New Report Filed',
            'Someone has filed a report against your service profile.',
            { url: '/services.html' }
        );
        showGlobalToast('✅ Report submitted successfully. Our team will review it.');
        
    } catch (err) {
        console.error('Report submit error:', err);
        showGlobalToast('❌ Failed to submit. Please try again.');
    }

    btn.disabled = false;
    btn.textContent = 'Submit Report 🚩';
}

// ═══════════════════════════
// ⭐ REVIEW MODAL — FULL REWRITE
// ═══════════════════════════
function openReviewModal() {
    if (!currentProfileProId) return;
    const pro = PROS.find(p => String(p.id) === String(currentProfileProId));
    if (!pro) return;

    const dims = getNPDimensions(pro.category || 'default');

    // Reset
    selectedReviewStars = 0;
    document.getElementById('review-comment-input').value = '';
    document.getElementById('review-customer-name-input').value = '';

    // Gina dimension stars rows
    const dimsHTML = dims.map(d => `
        <div style="border:1.5px solid rgba(255,255,255,0.1);border-radius:16px;padding:14px 16px;margin-bottom:12px;">
            <div style="font-size:13px;font-weight:700;color:#ffffff;margin-bottom:10px;">${d.label}</div>
            <div class="np-dim-star-picker" data-key="${d.key}" style="display:flex;justify-content:space-between;max-width:260px;">
                ${[1,2,3,4,5].map(n => `
                    <span onclick="setDimStar('${d.key}', ${n}, this)" data-val="${n}"
                        style="font-size:28px;color:rgba(255,255,255,0.25);cursor:pointer;transition:all 0.15s ease;">☆</span>
                `).join('')}
            </div>
        </div>`).join('');

    const box = document.querySelector('.review-modal-box');
    if (!box) return;

    box.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <button onclick="closeReviewModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#ffffff;">✕</button>
            <div style="text-align:center;">
                <div style="font-size:15px;font-weight:800;color:#ffffff;">${pro.name}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);">Rate this provider</div>
            </div>
            <button onclick="submitReview()" style="background:none;border:none;font-size:14px;font-weight:800;color:#00F2FF;cursor:pointer;">Post</button>
        </div>
        <div style="padding:20px;">
            <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your Review *</div>
            <textarea id="review-comment-input" maxlength="400" placeholder="Share your experience with this provider..."
                style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;font-size:13px;color:#ffffff;outline:none;resize:none;height:80px;line-height:1.5;font-family:inherit;box-sizing:border-box;margin-bottom:20px;"></textarea>

            <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Rate Each Category *</div>
            <div id="np-dim-stars-container">${dimsHTML}</div>

            <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;margin:6px 0 6px;">Your Name (Optional)</div>
            <input type="text" id="review-customer-name-input" placeholder="Anonymous if left blank"
                style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;font-size:13px;color:#ffffff;outline:none;box-sizing:border-box;margin-bottom:20px;">

            <button onclick="submitReview()" style="width:100%;padding:14px;background:linear-gradient(135deg,#00F2FF,#0891b2);border:none;border-radius:14px;color:#000000;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;">Post Review ⭐</button>
        </div>
    `;

    document.getElementById('review-modal-overlay').style.display = 'flex';
}

// ── SET DIMENSION STAR ──
const npDimRatings = {};

function setDimStar(key, value, el) {
    npDimRatings[key] = value;

    // Light up stars
    const picker = el.closest('.np-dim-star-picker');
    picker.querySelectorAll('span').forEach(s => {
        s.style.color = parseInt(s.dataset.val) <= value ? '#f59e0b' : '#e2e8f0';
        s.style.transform = parseInt(s.dataset.val) <= value ? 'scale(1.15)' : 'scale(1)';
    });

    if (navigator.vibrate) navigator.vibrate(8);
}

// ── SUBMIT REVIEW ──
async function submitReview() {
 if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }   
    const pro = PROS.find(p => String(p.id) === String(currentProfileProId));
    if (!pro) return;

    const comment = document.getElementById('review-comment-input').value.trim();
    const customerName = document.getElementById('review-customer-name-input').value.trim() || 'Anonymous';

    // Validation
    if (comment.length < 10) {
        showGlobalToast('⚠️ Please write a comment (min 10 chars)!');
        return;
    }

    const dims = getNPDimensions(pro.category || 'default');
    const unrated = dims.filter(d => !npDimRatings[d.key]);
    if (unrated.length > 0) {
        showGlobalToast(`⚠️ Please rate: ${unrated[0].label}`);
        return;
    }

    // Calculate overall rating = average of all dimensions
    const dimValues = dims.map(d => npDimRatings[d.key]);
    const overallRating = parseFloat(
        (dimValues.reduce((a, b) => a + b, 0) / dimValues.length).toFixed(1)
    );

    // Build initials
    const nameParts = customerName.split(' ');
    const initials = nameParts.length >= 2
        ? nameParts[0][0].toUpperCase() + nameParts[1][0].toUpperCase()
        : customerName.slice(0, 2).toUpperCase();

    const avatarColors = [
        '#1d4ed8','#059669','#7c3aed','#dc2626',
        '#d97706','#0891b2','#be185d','#065f46'
    ];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const reviewPayload = {
        providerId: String(pro.id),
        providerName: pro.name,
        customerName: customerName,
        reviewerInitials: initials,
        reviewerColor: avatarColor,
        reviewerSince: `Member since ${new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
        rating: overallRating,
        comment: comment,
        dimensions: { ...npDimRatings },
        verifiedOrder: 'Verified Purchase',
        orderDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        orderStatus: 'Delivered & Confirmed',
        helpfulCount: 0,
        date: new Date().toLocaleDateString('en-GB').replace(/\//g, '/'),
        createdAt: Date.now()
    };

    const btn = document.querySelector('.review-modal-box button:last-child');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Posting...'; }

    try {
        // Save to Firebase
        if (typeof firebase !== 'undefined' && firebase.database) {
            const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
            await firebase.database()
                .ref(`reviews/${pro.id}/${reviewId}`)
                .set(reviewPayload);

            // Notify provider
            await firebase.database()
                .ref(`providers/${currentProfileProId}/notifications`)
                .push({
                    type: 'review',
                    title: '⭐ New Review',
                    message: `A customer rated you ${overallRating} stars!`,
                    read: false,
                    createdAt: Date.now()
                });
        }

        // Clear dim ratings
        Object.keys(npDimRatings).forEach(k => delete npDimRatings[k]);

        closeReviewModal();
        showGlobalToast('✅ Review posted! Thank you for your feedback.');

        // Refresh reviews display
        setTimeout(() => injectNPReviewsIntoProfile(currentProfileProId), 500);

    } catch (err) {
        console.error('Review submit error:', err);
        showGlobalToast('❌ Failed to post review. Please try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Post Review ⭐'; }
    }
}

// ── CLOSE REVIEW MODAL ──
function closeReviewModal() {
    document.getElementById('review-modal-overlay').style.display = 'none';
    Object.keys(npDimRatings).forEach(k => delete npDimRatings[k]);
    }

// ═══════════════════════════
// ⚠️ WARNING OVERLAY FUNCTIONS
// ═══════════════════════════

function checkProviderWarnings(uid) {
    if (!uid || typeof firebase === 'undefined' || !firebase.database) return;
    const db = firebase.database();
    db.ref(`providers/${uid}/warnings`).once('value').then(snap => {
        const warnings = snap.val();
        if (!warnings) return;
        const unacked = Object.entries(warnings).find(([key, w]) => !w.acknowledged);
        if (unacked) {
            const [warningKey, warning] = unacked;
            showWarningOverlay(uid, warningKey, warning);
        }
    });
}

function showWarningOverlay(uid, warningKey, warning) {
    document.getElementById('pro-warning-message-text').textContent =
        warning.message || 'You have received a formal warning from Nexus Protocol Admin. Please review your profile.';

    const issuedDate = warning.issuedAt
        ? new Date(warning.issuedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
        : '—';
    document.getElementById('pro-warning-timestamp').textContent = `Issued: ${issuedDate}`;

    // Store for acknowledgeWarning
    document.getElementById('pro-warning-overlay').dataset.uid = uid;
    document.getElementById('pro-warning-overlay').dataset.warningKey = warningKey;

    document.getElementById('pro-warning-overlay').style.display = 'flex';
}

function acknowledgeWarning() {
    const overlay = document.getElementById('pro-warning-overlay');
    const uid = overlay.dataset.uid;
    const warningKey = overlay.dataset.warningKey;

    if (uid && warningKey && typeof firebase !== 'undefined' && firebase.database) {
        firebase.database().ref(`providers/${uid}/warnings/${warningKey}/acknowledged`).set(true);
    }

    overlay.style.display = 'none';
}

// ═══════════════════════════
// 🔔 GLOBAL TOAST (shared)
// ═══════════════════════════
function showGlobalToast(message) {
    const existing = document.getElementById('global-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%;
        transform: translateX(-50%);
        background: rgba(15,23,42,0.97);
        border: 1px solid rgba(255,255,255,0.12);
        color: #fff;
        padding: 10px 22px;
        border-radius: 50px;
        font-size: 13px;
        font-weight: 600;
        z-index: 99999;
        backdrop-filter: blur(20px);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        white-space: nowrap;
        pointer-events: none;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ── PROFILE EDIT ENGINE ──
let isEditMode = false;
let currentEditProId = null;

// Override openProfileSheet don ƙara edit check
const _baseOpenProfile = window.openProfileSheet;
window.openProfileSheet = function(proId) {
    currentEditProId = proId;

    // Saita ownership KAFIN render, domin empty-state ya san wanda ke kallo
    const _sessionUserCheck = localStorage.getItem('nexus_user_session');
    window._nxfmIsOwnProfile = !!(_sessionUserCheck && String(proId) === String(_sessionUserCheck));

    _baseOpenProfile(proId);
    
    // Check: shin wannan user ne owner?
    const sessionUser = localStorage.getItem('nexus_user_session');
   const pro = PROS.find(p => String(p.id) === String(proId));
    const editBtn = document.getElementById('edit-profile-btn');
    
    // Edit ya bayyana KAWAI idan wanda ke kallo shine mai wannan profile ɗin
    if (sessionUser && editBtn) {
        if (String(proId) === String(sessionUser)) {
            editBtn.style.display = 'none';
            currentEditProId = sessionUser;
        } else {
            editBtn.style.display = 'none';
        }
    }
    
    // Reset edit mode
    isEditMode = false;
    document.getElementById('edit-fields-section').style.display = 'none';
    document.getElementById('profile-bio-edit').style.display = 'none';
    document.getElementById('profile-expert-bio-p').style.display = 'block';
};

// ── SERVICES EDIT LIST STATE (non-food pros) ──
let pendingServicesEdit = [];

function renderServicesEditList() {
    const list = document.getElementById('edit-services-list');
    if (!list) return;
    if (pendingServicesEdit.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:10px;color:#94a3b8;font-size:11px;">No services added yet</div>`;
    } else {
       list.innerHTML = pendingServicesEdit.map((s, i) => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                    ${s.photo ? `<img src="${s.photo}" style="width:32px;height:32px;border-radius:8px;object-fit:cover;flex-shrink:0;">` : ''}
                    <div style="min-width:0;">
                        <div style="font-size:12px;font-weight:800;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name}</div>
                        <div style="font-size:11px;color:#64748b;">$${Number(s.price).toLocaleString()}${s.desc ? ' · ' + s.desc : ''}</div>
                    </div>
                </div>
                <button onclick="removeServiceFromEditList(${i})" type="button" style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#dc2626;font-size:12px;cursor:pointer;">✕</button>
            </div>`).join(''); 
    }
    const form = document.getElementById('edit-service-form');
    if (form) form.style.display = pendingServicesEdit.length >= 5 ? 'none' : 'block';
}

function addServiceToEditList() {
    const name = document.getElementById('edit-service-name').value.trim();
    const desc = document.getElementById('edit-service-desc').value.trim();
    const price = parseInt(document.getElementById('edit-service-price').value);

    if (!name) { showGlobalToast('⚠️ Enter a service name!'); return; }
    if (!desc) { showGlobalToast('⚠️ Enter a short description!'); return; }
    if (!price || price <= 0) { showGlobalToast('⚠️ Enter a valid price!'); return; }
    if (!editServicePendingPhoto) { showGlobalToast('⚠️ Upload a photo for this service!'); return; }
    if (pendingServicesEdit.length >= 5) { showGlobalToast('⚠️ Maximum 5 services!'); return; }

    pendingServicesEdit.push({ name, desc, price, photo: editServicePendingPhoto });
    document.getElementById('edit-service-name').value = '';
    document.getElementById('edit-service-desc').value = '';
    document.getElementById('edit-service-price').value = '';
    resetEditServicePhotoSlot();
    renderServicesEditList();
    }

function removeServiceFromEditList(idx) {
    pendingServicesEdit.splice(idx, 1);
    renderServicesEditList();
}
let editServicePendingPhoto = null;

function handleEditServicePhoto(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 8*1024*1024) { showGlobalToast('⚠️ Image too large! Max 8MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        editServicePendingPhoto = e.target.result;
        const slot = document.getElementById('edit-svc-photo-slot');
        if (!slot) return;
        slot.classList.add('filled');
        slot.querySelector('.ps-port-inner').innerHTML = `<img src="${e.target.result}" class="ps-port-preview" alt="Service">`;
    };
    reader.readAsDataURL(file);
}

function resetEditServicePhotoSlot() {
    editServicePendingPhoto = null;
    const slot = document.getElementById('edit-svc-photo-slot');
    if (!slot) return;
    slot.classList.remove('filled');
    slot.querySelector('.ps-port-inner').innerHTML = `<span>📷</span><span style="font-size:9px;color:rgba(255,255,255,0.3);">Photo *</span>`;
    }

function closeEditFieldsOnBg(event) {
    if (event.target.id === 'edit-fields-section' && isEditMode) {
        toggleEditMode();
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const editBtn = document.getElementById('edit-profile-btn');
    const editSection = document.getElementById('edit-fields-section');
    const bioP = document.getElementById('profile-expert-bio-p');
    const bioEdit = document.getElementById('profile-bio-edit');

    if (isEditMode) {
        // Buɗe edit mode
        editBtn.textContent = '✕ Cancel';
        editBtn.style.color = '#dc2626';
        editSection.style.display = 'flex';
        bioP.style.display = 'none';
        bioEdit.style.display = 'block';
        resetEditServicePhotoSlot();

        // Load current values daga Firebase
        if (typeof firebase !== 'undefined' && firebase.database) {
            const sessionUser = localStorage.getItem('nexus_user_session');
            firebase.database().ref('providers/' + sessionUser).once('value').then(snap => {
                if (!snap.exists()) return;
                const data = snap.val();
                
                // Bio
                bioEdit.value = data.bio || '';
                document.getElementById('profile-bio-char-num-label').textContent = (data.bio || '').length + '/130';
                
                // Price
                document.getElementById('edit-price-input').value = 
                    data.pricing ? data.pricing.base : '';
                document.getElementById('edit-price-unit').value = 
                    data.pricing ? (data.pricing.unit || 'per job') : 'per job';
                
                // Days
                const days = data.schedule || [];
                document.querySelectorAll('#edit-days-grid input[type="checkbox"]').forEach(cb => {
                    cb.checked = days.includes(cb.value);
                });

                // Services (stored under categories.Services.items — same structure the rest of the platform uses)
                const svcItems = (data.categories && data.categories.Services && data.categories.Services.items) || {};
                pendingServicesEdit = Object.values(svcItems).map(it => ({ name: it.name, desc: it.desc || '', price: it.price, photo: it.photo || null }));
                renderServicesEditList();
            });
        }
    } else {
        // Rufe edit mode
        editBtn.textContent = '✏️ Edit';
        editBtn.style.color = '#1d4ed8';
        editSection.style.display = 'none';
        bioP.style.display = 'block';
        bioEdit.style.display = 'none';
        resetEditServicePhotoSlot();
    }
}

async function saveProfileEdits() {
   if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; } 
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) { showGlobalToast('⚠️ Not logged in!'); return; }

    const bio = document.getElementById('profile-bio-edit').value.trim();
    const price = parseInt(document.getElementById('edit-price-input').value);
    const priceUnit = document.getElementById('edit-price-unit').value;
    const days = Array.from(
        document.querySelectorAll('#edit-days-grid input[type="checkbox"]:checked')
    ).map(cb => cb.value);

    if (!bio || bio.length < 10) { showGlobalToast('⚠️ Bio is too short!'); return; }
    if (!price || price <= 0) { showGlobalToast('⚠️ Enter a valid price!'); return; }
    if (days.length === 0) { showGlobalToast('⚠️ Select at least one day!'); return; }

    const saveBtn = document.querySelector('#edit-fields-section button');
    saveBtn.textContent = '⏳ Saving...';
    saveBtn.disabled = true;

    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            await firebase.database().ref('providers/' + sessionUser).update({
                bio: bio,
                pricing: { base: price, unit: priceUnit },
                schedule: days,
                lastUpdated: Date.now()
            });

            // Services — stored under categories/Services/items (same structure used across the platform)
            const servicesCatRef = firebase.database().ref('providers/' + sessionUser + '/categories/Services/items');
            const existingSnap = await servicesCatRef.once('value');
            const existingData = existingSnap.val() || {};
            const removals = {};
            Object.keys(existingData).forEach(key => { removals[key] = null; });
            if (Object.keys(removals).length) await servicesCatRef.update(removals);
            for (const s of pendingServicesEdit) {
           await servicesCatRef.push({ name: s.name, desc: s.desc || '', price: s.price, photo: s.photo || null, category: 'Services' });     
    }
        }

        // Update UI nan take
        document.getElementById('profile-expert-bio-p').textContent = bio;
        
        showGlobalToast('✅ Profile updated successfully!');
        toggleEditMode(); // Rufe edit mode
        
    } catch (err) {
        showGlobalToast('❌ Failed to save: ' + err.message);
    }

    saveBtn.textContent = '💾 Save Changes';
    saveBtn.disabled = false;
        }

// ════════════════════════════════════════════════════════════
//  FCM PUSH NOTIFICATION ENGINE
// ════════════════════════════════════════════════════════════

// VAPID Key daga Firebase Console → Project Settings → Cloud Messaging
const FCM_VAPID_KEY = "BAvRAyWB-6x0-UBgArEIUTngdH3kxHWHMoP5QHC7Kz6cVCZSQZMignJx1dzZ_rHlYjrFHfkpaDsFnGz0qs2PSTI"; 

async function initPushNotifications() {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) return;

    try {
        // Register Service Worker
        if (!('serviceWorker' in navigator)) return;
        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Initialize FCM
        if (typeof firebase === 'undefined' || !firebase.messaging) return;
        const messaging = firebase.messaging();

        // Get FCM token
        const token = await messaging.getToken({
            vapidKey: FCM_VAPID_KEY,
            serviceWorkerRegistration: reg
        });

        if (!token) return;

        // Save token to backend
        await fetch(`${BACKEND_URL}/save-fcm-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: sessionUser, token })
        });

        // Foreground notification handler
        messaging.onMessage((payload) => {
            const { title, body } = payload.notification;
            showGlobalToast(`🔔 ${title}: ${body}`);
        });

    } catch (err) {
        console.warn('Push notification init failed:', err);
    }
}

// Aika push notification (internal function)
async function sendPushToUser(username, title, body, data = {}) {
    try {
        await fetch(`${BACKEND_URL}/send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, title, body, data })
        });
    } catch (err) {
        console.warn('Send push failed:', err);
    }
            }

// ════════════════════════════════════════════════════════════
//  🔔 IN-APP NOTIFICATION ENGINE
// ════════════════════════════════════════════════════════════

let notifListener = null;
let allNotifications = [];

function initNotificationBell() {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) return;
    if (!firebase || !firebase.database) return;

    const db = firebase.database();

    // Listen for new notifications in realtime
    notifListener = db.ref(`providers/${sessionUser}/notifications`)
        .orderByChild('createdAt')
        .limitToLast(20)
        .on('value', (snap) => {
            const data = snap.val() || {};
            allNotifications = Object.entries(data)
                .map(([id, n]) => ({ id, ...n }))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            updateBellBadge();
        });
}

function updateBellBadge() {
    const unread = allNotifications.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    const bellBtn = document.getElementById('notif-bell-btn');

    if (unread > 0) {
        badge.style.display = 'flex';
        badge.textContent = unread > 9 ? '9+' : unread;
        bellBtn.classList.add('has-notif');
    } else {
        badge.style.display = 'none';
        bellBtn.classList.remove('has-notif');
    }
}

function toggleNotifPanel() {
    const overlay = document.getElementById('notif-panel-overlay');
    const isOpen = overlay.style.display === 'block';
    if (isOpen) {
        closeNotifPanel();
    } else {
        renderNotifPanel();
        overlay.style.display = 'block';
    }
}

function closeNotifPanel() {
    document.getElementById('notif-panel-overlay').style.display = 'none';
}

function renderNotifPanel() {
    const list = document.getElementById('notif-panel-list');

    if (allNotifications.length === 0) {
        list.innerHTML = `<div class="notif-empty">🔕 No notifications yet</div>`;
        return;
    }

    list.innerHTML = allNotifications.map(n => {
        const isUnread = !n.read;
        const iconClass = n.type === 'review' ? 'review' : n.type === 'warning' ? 'warning' : 'message';
        const iconEmoji = n.type === 'review' ? '⭐' : n.type === 'warning' ? '⚠️' : '💬';
        const timeStr = formatNotifTime(n.createdAt);

        return `
        <div class="notif-item ${isUnread ? 'unread' : ''}" onclick="handleNotifClick('${n.id}','${n.type}')">
            <div class="notif-item-icon ${iconClass}">${iconEmoji}</div>
            <div class="notif-item-body">
                <div class="notif-item-title">${n.title || 'Notification'}</div>
                <div class="notif-item-msg">${n.message || ''}</div>
                <div class="notif-item-time">${timeStr}</div>
            </div>
            ${isUnread ? '<div style="width:6px;height:6px;border-radius:50%;background:#1d4ed8;flex-shrink:0;margin-top:4px;"></div>' : ''}
        </div>`;
    }).join('');
}

function handleNotifClick(notifId, type) {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) return;

    // Mark as read
    firebase.database()
        .ref(`providers/${sessionUser}/notifications/${notifId}/read`)
        .set(true);

    closeNotifPanel();
}

function markAllNotifsRead() {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) return;

    const updates = {};
    allNotifications.forEach(n => {
        if (!n.read) updates[`${n.id}/read`] = true;
    });

    if (Object.keys(updates).length > 0) {
        firebase.database()
            .ref(`providers/${sessionUser}/notifications`)
            .update(updates);
    }

    closeNotifPanel();
}

function formatNotifTime(timestamp) {
    if (!timestamp) return '—';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
    }

    // ════════════════════════════════════════════════════════════
//  💬 SECURE CHAT ENGINE
// ════════════════════════════════════════════════════════════

function openSecureChat() {
    const sessionUser = localStorage.getItem('nexus_user_session');

    // Idan ba a login ba
    if (!sessionUser) {
        showGlobalToast('⚠️ Please login first to start a chat!');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }

    // Samu pro username daga Firebase
    if (!currentProfileProId) {
        showGlobalToast('⚠️ Could not identify provider!');
        return;
    }
   const pro = PROS.find(p => String(p.id) === String(currentProfileProId));
    window.location.href = `vendor-chat.html?with=${encodeURIComponent(currentProfileProId)}&name=${encodeURIComponent(pro ? pro.name : '')}`; 
    }

// ══════════════════════════════════════════════════════════════
//  🚨 EMERGENCY: DROPDOWN + ORIGINAL SCANNING ENGINE
//  Replace ALL previous emergency JS with this block
// ══════════════════════════════════════════════════════════════

// ── Service list (mirrors your CATEGORIES) ──
let EMG_SERVICES = [
    { id:"plumber",     label:"Plumber",             icon:"🔧", subs:["General Plumbing","Pipe Fitting","Leak Repair","Drainage"] },
    { id:"electrician", label:"Electrician",         icon:"⚡", subs:["Wiring","Solar Installation","Generator","Smart Home"] },
    { id:"carpenter",   label:"Carpenter",           icon:"🪚", subs:["Furniture","Doors & Windows","Roofing","Carving"] },
    { id:"chef",        label:"Chef / Cook",         icon:"🍳", subs:["Home Cooking","Catering","Corporate Events"] },
    { id:"painter",     label:"Painter",             icon:"🎨", subs:["Interior","Exterior","Texture"] },
    { id:"mason",       label:"Mason / Builder",     icon:"🧱", subs:["Block Laying","Plastering","Tiling"] },
    { id:"welder",      label:"Welder",              icon:"🔩", subs:["Gate & Fence","Steel Fabrication","Roofing"] },
    { id:"mechanic",    label:"Auto Mechanic",       icon:"🚗", subs:["Engine Repair","Electrical","Tires","Body Work"] },
    { id:"ac_tech",     label:"AC Technician",       icon:"❄️", subs:["Installation","Repair","Maintenance","Gas Refill"] },
    { id:"tailor",      label:"Tailor",              icon:"🧵", subs:["Native Wear","English Wear","Alterations"] },
    { id:"hvac",        label:"HVAC Engineer",       icon:"💨", subs:["Installation","Repair","Maintenance"] },
    { id:"cleaner",     label:"Professional Cleaner",icon:"🧹", subs:["Home Cleaning","Office Cleaning","Deep Clean"] },
];

// ── Scanning state ──
let emergencyUserLat      = null;
let emergencyUserLng      = null;
let emergencyCurrentRadius = 5;
let emergencyAllPros      = [];
let emergencyFilteredPros = [];
let emergencySelectedCat  = null;   // set when user picks a service

// ────────────────────────────────────────────
//  DROPDOWN OPEN / CLOSE
// ────────────────────────────────────────────
function openEmergencySheet() {
    // Reset search
    const inp = document.getElementById("emg-search-input");
    if (inp) inp.value = "";
    renderEmgServiceList(EMG_SERVICES);

    // Show dropdown + backdrop
    document.getElementById("emg-dropdown-panel").style.display = "flex";
    document.getElementById("emg-backdrop").style.display = "block";
}

function closeEmgDropdown() {
    document.getElementById("emg-dropdown-panel").style.display = "none";
    document.getElementById("emg-backdrop").style.display = "none";
}

// ────────────────────────────────────────────
//  SERVICE LIST RENDER + FILTER
// ────────────────────────────────────────────
function renderEmgServiceList(list) {
    const el = document.getElementById("emg-service-list");
    if (!el) return;
    el.innerHTML = list.map((s, idx) => `
        <div class="emg-service-row" id="emg-row-${idx}" onclick="toggleEmgSub(${idx})">
            <div class="emg-service-icon">${s.icon}</div>
            <span class="emg-service-label">${s.label}</span>
            <span class="emg-service-arrow">›</span>
        </div>`).join("");
    window._emgCurrentList = list;
    document.getElementById('emg-sub-empty').style.display = 'block';
    document.getElementById('emg-sub-list-content').innerHTML = '';
}

function toggleEmgSub(idx) {
    const list = window._emgCurrentList || EMG_SERVICES;
    const service = list[idx];
    if (!service) return;

    document.querySelectorAll('.emg-service-row').forEach((row,i) => {
        row.style.background = i===idx ? 'rgba(239,68,68,0.12)' : 'transparent';
    });

    document.getElementById('emg-sub-empty').style.display = 'none';
    document.getElementById('emg-sub-list-content').innerHTML = `
        <div style="font-size:10px;font-weight:800;color:#ef4444;text-transform:uppercase;letter-spacing:0.5px;padding:6px 8px 10px;">${service.label}</div>
        ${(service.subs||[]).map(sub => `
            <div onclick="selectEmgSub('${service.id}','${service.label}','${sub}')" style="padding:10px 12px;margin-bottom:6px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:8px;cursor:pointer;">${sub}</div>
        `).join('')}`;
}

function selectEmgSub(catId, catLabel, subLabel) {
    closeEmgDropdown();
    selectEmgService(catId, `${catLabel} – ${subLabel}`);
}

function filterEmgServices(query) {
    const q = query.trim().toLowerCase();
    const filtered = q === ""
        ? EMG_SERVICES
        : EMG_SERVICES.filter(s =>
            s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
          );
    renderEmgServiceList(filtered);
}

// ────────────────────────────────────────────
//  USER PICKS A SERVICE → open scanning sheet
// ────────────────────────────────────────────
function selectEmgService(catId, catLabel) {
    // Close dropdown
    closeEmgDropdown();

    // Set selected category
    emergencySelectedCat   = catId;
    emergencyCurrentRadius = 5;
    emergencyAllPros       = [];

    // Reset scanning sheet UI
    document.getElementById("emergency-scanning-state").style.display = "block";
    document.getElementById("emergency-results-list").style.display   = "none";
    document.getElementById("emergency-expand-btn").style.display     = "none";
    document.getElementById("emergency-scan-status").textContent      = `Scanning for ${catLabel}...`;
    document.getElementById("emergency-scan-sub").textContent         = `Finding verified experts within ${emergencyCurrentRadius}km`;
    document.getElementById("emergency-location-text").textContent    = "Detecting your location...";

    // Show scanning sheet
    document.getElementById("emergency-sheet-overlay").style.display = "flex";

    if (!navigator.geolocation) {
        document.getElementById("emergency-scan-status").textContent = "❌ GPS not supported";
        return;
    }

    // Check permission state FIRST, before attempting to get location
    navigator.permissions?.query({ name: 'geolocation' }).then(res => {
        if (res.state === 'denied') {
            document.getElementById("emergency-scan-status").textContent = "🚫 Location Access Blocked";
            document.getElementById("emergency-scan-sub").textContent    = "Go to Chrome Settings → Site Settings → Location → Allow, then try again.";
            document.getElementById("emergency-location-text").textContent = "Location permission denied";
            return; // don't even attempt getCurrentPosition
        }

        // Permission not denied — proceed with retry logic
        attemptEmergencyGPSFix(true);
    });
}

function attemptEmergencyGPSFix(isFirstAttempt) {
    if (isFirstAttempt) {
        document.getElementById("emergency-scan-sub").textContent = "Finding verified experts within " + emergencyCurrentRadius + "km";
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            emergencyUserLat = pos.coords.latitude;
            emergencyUserLng = pos.coords.longitude;
            document.getElementById("emergency-location-text").textContent =
                `📍 ${emergencyUserLat.toFixed(4)}, ${emergencyUserLng.toFixed(4)}`;
            scanEmergencyPros();
        },
        (err) => {
            if (isFirstAttempt) {
                // GPS failed on first attempt — sake gwadawa da low-accuracy + tsawon lokaci
                document.getElementById("emergency-scan-sub").textContent = "🔄 Retrying a different way...";
                attemptEmergencyGPSFix(false);
            } else {
                const msgs = { 1:"You denied GPS permission.", 2:"GPS location unavailable — make sure Location is turned on.", 3:"Timed out — try again outdoors or near a window." };
                document.getElementById("emergency-scan-status").textContent = "⚠️ GPS failed";
                document.getElementById("emergency-scan-sub").textContent    = msgs[err.code] || "GPS kuskure — sake gwadawa.";
            }
        },
        isFirstAttempt
            ? { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
            : { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
    }
// ────────────────────────────────────────────
//  CLOSE SCANNING SHEET
// ────────────────────────────────────────────
function closeEmergencySheet(event) {
    // If called from overlay click, only close if target is the overlay itself
    if (event && event.target && event.target.id !== "emergency-sheet-overlay") return;
    document.getElementById("emergency-sheet-overlay").style.display = "none";
}

// ────────────────────────────────────────────
//  DISTANCE HELPER
// ────────────────────────────────────────────
function getDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function reverseGeocodeCoords(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`);
        const data = await res.json();
        const a = data.address || {};
        const city = a.city || a.town || a.village || a.county || '';
        const area = a.suburb || a.neighbourhood || a.road || '';
        const address = [area, city].filter(Boolean).join(', ') || data.display_name || '';
        return { city, address };
    } catch (e) {
        console.warn('Reverse geocoding ya kasa:', e);
        return { city: '', address: '' };
    }
}
// ════════════════════════════════════════════════════════════
//  📍 UNIVERSAL GPS CAPTURE — Yana aiki ga DUK categories
//  (Plumber, Chef, Snacks, Beverages, Doctor, Engineer, Lab, da sauransu)
// ════════════════════════════════════════════════════════════
function captureGPSUniversal(config, isRetry) {
    const {
        statusId,           // ID na status text (misali "ps-gps-status-inline")
        coordsId,           // ID na coords text (misali "ps-gps-coords-inline")
        btnId = null,        // ID na button (idan akwai)
        cardId = null,        // ID na card wrapper (idan akwai, don border/bg highlight)
        stateTarget = psInlineState,  // Wane state object za a saka gpsLat/gpsLng a ciki
        onSuccess = null,    // Optional callback bayan an samu GPS (misali renderChefSummary)
        summaryFields = {}   // Optional: { locationId: "ps-sum-location" } don sabunta summary kai tsaye
    } = config;

    const status = document.getElementById(statusId);
    const coords = document.getElementById(coordsId);
    const btn = btnId ? document.getElementById(btnId) : null;
    const card = cardId ? document.getElementById(cardId) : null;

    if (!navigator.geolocation) {
        psShowToast('❌ Your browser does not support GPS.');
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Ana nema...'; }
    if (status) status.textContent = isRetry ? '🔄 Retrying a different way...' : '🔄 Getting location...';

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            stateTarget.gpsLat = pos.coords.latitude;
            stateTarget.gpsLng = pos.coords.longitude;

            if (status) status.textContent = '🔄 Finding your address...';
            const place = await reverseGeocodeCoords(stateTarget.gpsLat, stateTarget.gpsLng);
            stateTarget.gpsCity = place.city;
            stateTarget.gpsAddress = place.address;

            stateTarget.gpsReady = true;

            if (status) status.textContent = '✅ Location captured!';
            if (coords) coords.textContent = stateTarget.gpsAddress || `${stateTarget.gpsLat.toFixed(5)}, ${stateTarget.gpsLng.toFixed(5)}`;
            if (btn) { btn.disabled = false; btn.textContent = '✅ Done'; }
            if (card) {
                card.style.borderColor = 'rgba(16,185,129,0.4)';
                card.style.background = 'rgba(16,185,129,0.08)';
            }

            // Sabunta duk summary fields da aka bayar (misali location text a Step na karshe)
            Object.entries(summaryFields).forEach(([fieldId, formatter]) => {
                const el = document.getElementById(fieldId);
                if (el) {
                    el.textContent = typeof formatter === 'function'
                        ? formatter(stateTarget)
                        : `${stateTarget.gpsLat.toFixed(4)}, ${stateTarget.gpsLng.toFixed(4)}`;
                }
            });

            if (typeof onSuccess === 'function') onSuccess();

            psShowToast('📍 GPS captured successfully!');
        },
        (err) => {
            if (!isRetry) {
                // Yunkuri na farko ya kasa — kai tsaye sake gwadawa da low-accuracy
                captureGPSUniversal(config, true);
                return;
            }
            if (btn) { btn.disabled = false; btn.textContent = 'Retry'; }
            if (status) status.textContent = '❌ GPS failed';
            const msgs = {
                1: 'You denied GPS permission.',
                2: 'GPS location unavailable — make sure Location is turned on.',
                3: 'Timed out — try again outdoors or near a window.'
            };
            psShowToast('⚠️ ' + (msgs[err.code] || 'GPS kuskure.'));
        },
        isRetry
            ? { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
            : { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
    }
// ────────────────────────────────────────────
//  SCAN PROS (Firebase + demo PROS array)
// ────────────────────────────────────────────
async function scanEmergencyPros() {
    document.getElementById("emergency-scan-status").textContent =
        `Scanning for ${emergencySelectedCat}...`;
    document.getElementById("emergency-scan-sub").textContent =
        `Finding verified experts within ${emergencyCurrentRadius}km`;

    emergencyAllPros = [];

    // ── Demo PROS (your local array) ──
    if (typeof PROS !== "undefined") {
        PROS.forEach(p => {
            if (emergencySelectedCat && p.category !== emergencySelectedCat) return;
            if (p.distance <= emergencyCurrentRadius) {
                emergencyAllPros.push({
                    uid:         String(p.id),
                    name:        p.name,
                    display_cat: p.display_cat,
                    avatar:      p.avatar,
                    color:       p.color,
                    pricing:     { base: parseInt((p.price||"0").replace(/[^\d]/g,"")), unit: "per job" },
                    distanceKm:  p.distance,
                    categoryLabel: p.display_cat
                });
            }
        });
    }

    // ── Firebase live providers ──
    try {
        if (typeof firebase !== "undefined" && firebase.database &&
            emergencyUserLat !== null && emergencyUserLng !== null) {

            const snap = await firebase.database().ref("providers").once("value");
            const data = snap.val() || {};

            Object.entries(data).forEach(([uid, pro]) => {
                if (pro.status !== "approved" && pro.verified !== true) return;
                if (!pro.location || !pro.location.lat || !pro.location.lng) return;

                const dist = getDistanceKm(
                    emergencyUserLat, emergencyUserLng,
                    pro.location.lat, pro.location.lng
                );
                if (dist > emergencyCurrentRadius) return;

                const cat = (pro.category || "").toLowerCase();
                if (emergencySelectedCat && cat !== emergencySelectedCat) return;

                // Avoid duplicate with demo data
                if (!emergencyAllPros.find(p => p.uid === uid)) {
                    emergencyAllPros.push({ uid, ...pro, distanceKm: dist });
                }
            });
        }
    } catch (err) {
        console.warn("Firebase emergency scan failed:", err);
    }

    // Sort by distance
    emergencyAllPros.sort((a, b) => a.distanceKm - b.distanceKm);
    renderEmergencyResults();
}

// ────────────────────────────────────────────
//  RENDER RESULTS
// ────────────────────────────────────────────
function renderEmergencyResults() {
    const list     = document.getElementById("emergency-results-list");
    const scanState = document.getElementById("emergency-scanning-state");
    const expandBtn = document.getElementById("emergency-expand-btn");

    const pros = emergencyAllPros;
    emergencyFilteredPros = pros;

    scanState.style.display = "none";

    if (pros.length === 0) {
        list.style.display = "block";
        list.innerHTML = `
            <div style="text-align:center;padding:30px 20px;">
                <div style="font-size:36px;margin-bottom:12px;">📡</div>
                <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:6px;">
                    No ${emergencySelectedCat || "pros"} found within ${emergencyCurrentRadius}km
                </div>
                <div style="font-size:11px;color:rgba(255,255,255,0.4);">Try expanding the search radius</div>
            </div>`;
        expandBtn.style.display = "block";
        expandBtn.textContent = `🔍 Expand to ${emergencyCurrentRadius * 2}km`;
        return;
    }

    expandBtn.style.display = "none";
    list.style.display = "block";
    list.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">
            ⚡ ${pros.length} Pro${pros.length > 1 ? "s" : ""} Found Within ${emergencyCurrentRadius}km
        </div>
        ${pros.map(pro => `
        <div class="emergency-pro-card" onclick="emergencyContactPro('${pro.uid}')">
            <div class="emergency-pro-avatar" style="background:${pro.color || getProColor(pro.categoryLabel)};">
                ${pro.avatar || (pro.categoryLabel||"P").charAt(0).toUpperCase()}
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:800;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${pro.name || pro.categoryLabel || "Professional"}
                    ${pro.display_cat ? `<span style="font-size:11px;color:rgba(255,255,255,0.5);"> · ${pro.display_cat}</span>` : ""}
                </div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">
                   ${formatPrice(Number(pro.pricing?.base||0), pro.pricing?.currency)} ${pro.pricing?.unit||"per job"} 
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                <span class="emergency-distance-badge">${pro.distanceKm.toFixed(1)}km</span>
                <span style="font-size:9px;color:#22c55e;font-weight:700;">● Available</span>
            </div>
        </div>`).join("")}`;
}

// ────────────────────────────────────────────
//  EXPAND RADIUS
// ────────────────────────────────────────────
function expandEmergencyRadius() {
    emergencyCurrentRadius *= 2;
    document.getElementById("emergency-scanning-state").style.display = "block";
    document.getElementById("emergency-results-list").style.display   = "none";
    scanEmergencyPros();
}

// ────────────────────────────────────────────
//  CONTACT PRO
// ────────────────────────────────────────────
function emergencyContactPro(proUid) {
    const sessionUser = localStorage.getItem("nexus_user_session");
    if (!sessionUser) {
        showGlobalToast("⚠️ Please login first!");
        setTimeout(() => { window.location.href = "login.html"; }, 1500);
        return;
    }
    document.getElementById("emergency-sheet-overlay").style.display = "none";
    window.location.href = `chat-interior.html?with=${encodeURIComponent(proUid)}`;
}

// ────────────────────────────────────────────
//  getProColor (reuse or define here)
// ────────────────────────────────────────────
function getProColor(category) {
    const colors = {
        "Plumber":     "linear-gradient(135deg,#059669,#047857)",
        "Electrician": "linear-gradient(135deg,#d97706,#b45309)",
        "Mechanic":    "linear-gradient(135deg,#dc2626,#b91c1c)",
        "Chef":        "linear-gradient(135deg,#ec4899,#be185d)",
        "Carpenter":   "linear-gradient(135deg,#78350f,#451a03)",
        "Cleaner":     "linear-gradient(135deg,#0284c7,#0369a1)",
    };
    return colors[category] || "linear-gradient(135deg,#1d4ed8,#1e40af)";
}

// Init service list on page load
runOnServicesInit(() => {
    renderEmgServiceList(EMG_SERVICES);
});
                       

// ════════════════════════════════════════════════════════════
//  📞 HIRE EXPERT ENGINE
// ════════════════════════════════════════════════════════════

let hireState = {
    proId: null,
    step: 1,
    dateValid: true
};

function getDayNameFromDateInput(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString('en-US', { weekday: 'long' }); // e.g. "Monday"
}

function normalizeDayLabel(label) {
    return label.toLowerCase().replace(/s$/, ''); // "Mondays" -> "monday"
}

function getHireProData(proId) {
    // 1) Demo PROS array
    const demoPro = PROS.find(p => String(p.id) === String(proId));
    if (demoPro) return demoPro;
    return null;
}

function openHireSheet(presetName, presetPrice, presetDesc, presetCurrency) {
    if (!currentProfileProId) return;
    hireState.proId = currentProfileProId;
    hireState.step = 1;

    const pro = getHireProData(currentProfileProId);
    hireState.currency = presetCurrency || pro?.pricing?.currency || '';
    const avatar = document.getElementById('hire-mini-avatar');
    if (pro) {
        avatar.style.background = pro.color;
        avatar.textContent = pro.avatar;
        document.getElementById('hire-mini-name').textContent = pro.name;
        document.getElementById('hire-mini-category').textContent = pro.display_cat;
        const priceDigits = (pro.price || '').replace(/[^\d]/g, '');
        document.getElementById('hire-budget').value = priceDigits || '';
    } else {
        avatar.style.background = 'linear-gradient(135deg,#1d4ed8,#1e40af)';
        avatar.textContent = '👤';
        document.getElementById('hire-mini-name').textContent = 'Provider';
        document.getElementById('hire-mini-category').textContent = '';
        document.getElementById('hire-budget').value = '';
    }

    document.getElementById('hire-job-desc').value = presetName
        ? `${presetName}${presetDesc ? ' — ' + presetDesc : ''}`
        : '';
    document.getElementById('hire-date-needed').value = '';
    document.getElementById('hire-date-warning').style.display = 'none';
    document.getElementById('hire-budget-unit').value = 'per job';

    if (presetPrice) {
        const digits = String(presetPrice).replace(/[^\d]/g, '');
        if (digits) document.getElementById('hire-budget').value = digits;
    }

    hireShowStep(1);

    const overlay = document.getElementById('hire-sheet-overlay');
    const box = document.getElementById('hire-sheet-box');
    overlay.style.display = 'flex';
    setTimeout(() => {
        box.style.transform = 'scale(1)';
        box.style.opacity = '1';
    }, 10);
    document.body.style.overflow = 'hidden';
}

// Request Quote — used for service pros (electrician, plumber, etc.) instead of Add to Cart
function nxfmRequestServiceQuote(name, price, desc, currency) {
    openHireSheet(name, price, desc, currency);
    }

function closeHireSheet() {
    const box = document.getElementById('hire-sheet-box');
    box.style.transform = 'scale(0.9)';
    box.style.opacity = '0';
    setTimeout(() => {
        document.getElementById('hire-sheet-overlay').style.display = 'none';
    }, 300);
    document.body.style.overflow = '';
}
function closeHireSheetOnBg(event) {
    if (event.target.id === 'hire-sheet-overlay') closeHireSheet();
}

function hireShowStep(step) {
    hireState.step = step;
    document.getElementById('hire-step-1').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('hire-step-2').style.display = step === 2 ? 'block' : 'none';
    document.getElementById('hire-back-btn').style.display = step === 1 ? 'none' : 'block';
    document.getElementById('hire-sheet-title').textContent = step === 1 ? '📞 Hire Expert' : '✅ Confirm Request';
    document.getElementById('hire-dot-1').style.background = step >= 1 ? '#1d4ed8' : 'rgba(255,255,255,0.2)';
    document.getElementById('hire-dot-2').style.background = step >= 2 ? '#1d4ed8' : 'rgba(255,255,255,0.2)';
}

function hireGoBack() {
    if (hireState.step > 1) hireShowStep(1);
}

function checkHireDateAvailability() {
    const dateVal = document.getElementById('hire-date-needed').value;
    const warningBox = document.getElementById('hire-date-warning');
    hireState.dateValid = true;

    if (!dateVal) { warningBox.style.display = 'none'; return; }

    const pro = getHireProData(hireState.proId);
    const schedule = pro && pro.schedule ? pro.schedule : null;

    if (!schedule || schedule.length === 0) {
        warningBox.style.display = 'none';
        return; // No schedule restriction info — assume available
    }

    const dayName = getDayNameFromDateInput(dateVal);
    const normalizedDay = normalizeDayLabel(dayName);
    const availableNormalized = schedule.map(normalizeDayLabel);

    if (!availableNormalized.includes(normalizedDay)) {
        hireState.dateValid = false;
        warningBox.textContent = `⚠️ ${pro.name.split(' ')[0]} ba ya samuwa ranar ${dayName}. Yana samuwa: ${schedule.join(', ')}.`;
        warningBox.style.display = 'block';
    } else {
        warningBox.style.display = 'none';
    }
}

function hireGoToStep2() {
    const jobDesc = document.getElementById('hire-job-desc').value.trim();
    const dateVal = document.getElementById('hire-date-needed').value;
    const budget = document.getElementById('hire-budget').value;
    const budgetUnit = document.getElementById('hire-budget-unit').value;

    if (jobDesc.length < 10) { showGlobalToast('⚠️ Bayyana aikinka da kyau (kalla haruffa 10)!'); return; }
    if (!dateVal) { showGlobalToast('⚠️ Zaɓi ranar da kake buƙatar aikin!'); return; }
    if (!hireState.dateValid) { showGlobalToast('⚠️ Wannan rana ba ranar samuwar pro ɗin ba ne — zaɓi wata rana.'); return; }
    if (budgetUnit !== 'negotiable' && (!budget || parseInt(budget) <= 0)) { showGlobalToast('⚠️ Saka budget mai inganci!'); return; }

    hireState.jobDesc = jobDesc;
    hireState.dateVal = dateVal;
    hireState.budget = budgetUnit === 'negotiable' ? null : parseInt(budget);
    hireState.budgetUnit = budgetUnit;

    // Fill summary
    document.getElementById('hire-sum-job').textContent = jobDesc.length > 40 ? jobDesc.slice(0,40)+'…' : jobDesc;
    const niceDate = new Date(dateVal + "T00:00:00").toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', weekday:'short' });
    document.getElementById('hire-sum-date').textContent = niceDate;
   document.getElementById('hire-sum-budget').textContent = budgetUnit === 'negotiable' ? 'Negotiable' : `${formatPrice(hireState.budget, hireState.currency)} ${budgetUnit}`; 
    hireShowStep(2);
}

async function writeHireRequestToFirebase() {
    if (typeof firebase === 'undefined' || !firebase.database) {
        throw new Error('Firebase not ready');
    }
    const sessionUser = localStorage.getItem('nexus_user_session') || 'guest';
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const pro = getHireProData(hireState.proId);

   const payload = {
        requestId,
        proId: String(hireState.proId),
        proName: pro ? pro.name : 'Provider',
        customerUsername: sessionUser,
        jobDescription: hireState.jobDesc,
        dateNeeded: hireState.dateVal,
        budget: hireState.budget,
        budgetUnit: hireState.budgetUnit,
        currency: hireState.currency || '',
        status: 'pending',
        createdAt: Date.now()
    }; 

    const db = firebase.database();
    await db.ref(`providers/${hireState.proId}/requests/${requestId}`).set(payload);
    await db.ref(`customers/${sessionUser}/sentRequests/${requestId}`).set(payload);

    return requestId;
}

async function submitHireRequest() {
  if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }  
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) {
        showGlobalToast('⚠️ Please login first to send a request!');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }

    const btn = document.getElementById('hire-send-request-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';

    try {
        await writeHireRequestToFirebase();

        await sendPushToUser(
            hireState.proId,
            '📨 New Job Request',
            `A customer wants to hire you for: ${hireState.jobDesc.slice(0,40)}...`,
            { url: 'requests.html' }
        );

        closeHireSheet();
        showGlobalToast('✅ Request sent! The pro will be notified.');

    } catch (err) {
        console.error('Hire request error:', err);
        showGlobalToast('❌ Failed to send request. Try again.');
    }

    btn.disabled = false;
    btn.textContent = 'Send Request 📨';
}

function submitHireChatFirst() {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) {
        showGlobalToast('⚠️ Please login first to start a chat!');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }
    closeHireSheet();
    window.location.href = `chat-interior.html?with=${encodeURIComponent(hireState.proId)}`;
}

let orderDraft = { itemName: null, itemPrice: null, fromStory: false, returnToStory: false };
let itemDetailQty = 1;
let itemDetailData = { name: '', price: '', image: '', icon: '', desc: '' };

// ══════════ NXFM PER-VENDOR CART ENGINE ══════════
function nxfmGetActiveViewedPro() {
    const live = nxfmCurrentPro || currentChefMenuPro || currentSnacksMenuPro || currentBeveragesMenuPro;
    if (live) return live;
    const saved = localStorage.getItem('nxfm_last_viewed_pro');
    return saved ? JSON.parse(saved) : null;
    }
function nxfmCartRef(proId) {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) return null;
    return firebase.database().ref(`carts/${sessionUser}/${proId}`);
}
async function nxfmGetCart(proId) {
    await guaranteeAuth();
    const ref = nxfmCartRef(proId);
    if (!ref) return [];
    try {
        const snap = await ref.once('value');
        const val = snap.val();
        return val ? Object.values(val) : [];
    } catch (e) { return []; }
}
async function nxfmSaveCart(proId, cart) {
    const ref = nxfmCartRef(proId);
    if (!ref) return;
    await ref.set(cart);
    nxfmUpdateCartBadge();
}
async function nxfmAddToCart(proId, item) {
    const cart = await nxfmGetCart(proId);
    const existing = cart.find(i => i.name === item.name);
    if (existing) { existing.qty += item.qty; }
    else { cart.push(item); }
    await nxfmSaveCart(proId, cart);
}
async function nxfmGridQuickAdd(name, price, image, icon, desc, currency) {
    const pro = nxfmGetActiveViewedPro();
    if (!pro) { showGlobalToast('⚠️ Vendor not found.'); return; }
    await nxfmAddToCart(pro.id, { name, price, image, icon, desc, currency, qty: 1 });
    showGlobalToast('✅ Added to cart');
    }
async function nxfmUpdateCartBadge() {
    const pro = nxfmGetActiveViewedPro();
    const badge = document.getElementById('nxfm-cart-badge');
    if (!badge) return;
    if (!pro) { badge.style.display = 'none'; return; }
    const cart = await nxfmGetCart(pro.id);
    const count = cart.reduce((sum, i) => sum + i.qty, 0);
    if (count > 0) { badge.textContent = count; badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
        }

async function openNxfmCartPage() {
    const pro = nxfmGetActiveViewedPro();
    if (!pro) { showGlobalToast('⚠️ Open a vendor profile first.'); return; }
    await renderNxfmCartPage(pro.id);
    document.getElementById('nxfm-cart-page-overlay').style.display = 'flex';
    }
function closeNxfmCartPage() {
    document.getElementById('nxfm-cart-page-overlay').style.display = 'none';
}
async function renderNxfmCartPage(proId) {
    const cart = await nxfmGetCart(proId);
    const list = document.getElementById('nxfm-cart-items-list');
    if (!cart.length) {
        list.innerHTML = `<div style="text-align:center;padding:40px 10px;color:#9ca3af;font-size:13px;">🛒 Your cart is empty</div>`;
    } else {
        list.innerHTML = cart.map(item => `
        <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:10px;">
            <div style="width:64px;height:64px;border-radius:12px;overflow:hidden;background:#fdece0;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:28px;">
                ${item.image ? `<img src="${item.image}" style="width:100%;height:100%;object-fit:cover;">` : (item.icon || '🍽️')}
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:800;color:#ffffff;">${item.name}</div>
                <div style="font-size:12px;color:rgba(255,255,255,0.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.desc || ''}</div>
                <div style="font-size:13px;font-weight:800;color:#fde08d;margin-top:2px;">${typeof item.price === 'number' ? formatPrice(item.price, item.currency) : item.price}</div>          
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
      <button onclick="nxfmCartQtyChange('${proId}','${item.name.replace(/'/g,"\\'")}',-1)" style="width:26px;height:26px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.25);font-size:15px;font-weight:700;color:#ffffff;cursor:pointer;">−</button>   
    <div style="min-width:20px;text-align:center;font-size:13px;font-weight:800;color:#fde08d;">${item.qty}</div>
    <button onclick="nxfmCartQtyChange('${proId}','${item.name.replace(/'/g,"\\'")}',1)" style="width:26px;height:26px;border:none;border-radius:8px;background:#fde08d;font-size:15px;font-weight:800;color:#111827;cursor:pointer;">+</button>
</div>
        </div>`).join('');
    }
const total = cart.reduce((sum, i) => sum + (parseInt(String(i.price).replace(/[^\d]/g,'')) || 0) * i.qty, 0);
    document.getElementById('nxfm-cart-total').textContent = formatPrice(total, cart[0]?.currency);
    }
async function nxfmCartQtyChange(proId, itemName, delta) {
    const cart = await nxfmGetCart(proId);
    const item = cart.find(i => i.name === itemName);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { cart.splice(cart.indexOf(item), 1); }
    await nxfmSaveCart(proId, cart);
    await renderNxfmCartPage(proId);
    }
async function nxfmCartPlaceOrder() {
    const pro = nxfmGetActiveViewedPro();
    if (!pro) { showGlobalToast('⚠️ Vendor not found — open a profile first.'); return; }
    const cart = await nxfmGetCart(pro.id);
    if (!cart.length) { showGlobalToast('⚠️ Your cart is empty.'); return; }

    window._activeCartOrder = { proId: pro.id, items: cart };
    window._activePlaceOrderPro = pro;

    const total = cart.reduce((sum, i) => sum + (parseInt(String(i.price).replace(/[^\d]/g,'')) || 0) * i.qty, 0);
    document.getElementById('po-item-name').innerHTML = cart.map(i => `${i.qty}× ${i.name}`).join('<br>');
    document.getElementById('po-item-price').textContent = formatPrice(total, cart[0]?.currency);
    document.getElementById('po-qty-row').style.display = 'none';
    document.getElementById('po-address').value = '';
    document.getElementById('po-phone').value = '';
    document.getElementById('po-booking-date').value = '';
    document.getElementById('po-booking-time').value = '';
    closeNxfmCartPage();
    document.getElementById('place-order-overlay').style.display = 'flex';
    updateOrderTotal();
}
function openItemDetail(name, price, image, icon, desc, currency) {
    itemDetailQty = 1;
    itemDetailData.name = name;
    itemDetailData.price = price;
    itemDetailData.image = image || '';
    itemDetailData.icon = icon || '🍽️';
    itemDetailData.desc = desc || '';
    itemDetailData.currency = currency || '';

    document.getElementById('item-detail-name').textContent = name;
    document.getElementById('item-detail-desc').textContent = desc || '';
    document.getElementById('item-detail-price').textContent = typeof price === 'number' ? formatPrice(Number(price), currency) : price;
    document.getElementById('item-detail-qty').textContent = '1';
    const imgEl = document.getElementById('item-detail-image');
    const iconEl = document.getElementById('item-detail-icon');
    if (image) {
        imgEl.src = image;
        imgEl.style.display = 'block';
        iconEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        iconEl.style.display = 'block';
        iconEl.textContent = icon || '🍽️';
    }

    // Service pros (electrician, plumber, etc.) get "Request Quote" instead of a cart/quantity flow
    const serviceMode = nxfmCurrentPro && !isFoodProCategory(nxfmCurrentPro.category);
    const qtyWrap = document.getElementById('item-detail-qty-wrap');
    const ctaBtn = document.getElementById('item-detail-cta-btn');
    if (serviceMode) {
        qtyWrap.style.display = 'none';
        ctaBtn.textContent = '📞 Request Quote';
        ctaBtn.onclick = itemDetailRequestQuote;
    } else {
        qtyWrap.style.display = 'flex';
        ctaBtn.textContent = '🛒 Add to Cart';
        ctaBtn.onclick = itemDetailAddToCart;
    }

    document.getElementById('item-detail-overlay').style.display = 'flex';
}

function itemDetailRequestQuote() {
    document.getElementById('item-detail-overlay').style.display = 'none';
    nxfmRequestServiceQuote(itemDetailData.name, itemDetailData.price, itemDetailData.desc, itemDetailData.currency);
    }

function closeItemDetail() {
    document.getElementById('item-detail-overlay').style.display = 'none';
}

function itemDetailQtyChange(delta) {
    itemDetailQty = Math.max(1, itemDetailQty + delta);
    document.getElementById('item-detail-qty').textContent = itemDetailQty;
    const unitPrice = parseInt(String(itemDetailData.price).replace(/[^\d]/g,'')) || 0;
    document.getElementById('item-detail-price').textContent = formatPrice(unitPrice * itemDetailQty, itemDetailData.currency);
    }

async function itemDetailAddToCart() {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    const pro = nxfmGetActiveViewedPro();
    if (!pro) { showGlobalToast('⚠️ Vendor not found.'); return; }
    try {
        await nxfmAddToCart(pro.id, {
            name: itemDetailData.name,
            price: itemDetailData.price,
            image: itemDetailData.image,
            icon: itemDetailData.icon,
            desc: itemDetailData.desc,
            currency: itemDetailData.currency,
            qty: itemDetailQty
        });
        document.getElementById('item-detail-overlay').style.display = 'none';
        showGlobalToast('✅ Added to cart');
    } catch (err) {
        showGlobalToast('❌ Cart save failed: ' + err.message);
    }
    }

let tiersSheetData = null;
function openTiersSheet(itemName) {
    const pro = nxfmCurrentPro;
    const items = (pro && (pro.menu || pro.products || pro.services)) || [];
    const item = items.find(it => it.name === itemName);
    if (!item || !item.tiers) return;
    tiersSheetData = item;
    document.getElementById('tiers-sheet-title').textContent = item.name;
    document.getElementById('tiers-sheet-list').innerHTML = item.tiers.map((tier, i) => `
        <div style="background:#ffffff;border:1px solid #f1e4d8;border-radius:16px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div style="font-size:15px;font-weight:800;color:#78350f;">${tier.name}</div>
               <div style="font-size:16px;font-weight:800;color:#ea580c;">${formatPrice(tier.price, tiersSheetData.currency)}</div> 
            </div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">⏱️ ${tier.delivery || ''}</div>
            <ul style="margin:0 0 12px;padding-left:18px;font-size:12.5px;color:#374151;">
                ${(tier.includes || []).map(f => `<li style="margin-bottom:2px;">${f}</li>`).join('')}
            </ul>
            <button onclick="tiersSheetSelect(${i})" style="width:100%;background:#ea580c;color:#ffffff;border:none;border-radius:12px;padding:11px 0;font-weight:800;font-size:13px;cursor:pointer;">Select ${tier.name}</button>
        </div>`).join('');
    document.getElementById('tiers-sheet-overlay').style.display = 'flex';
}
function closeTiersSheet() {
    document.getElementById('tiers-sheet-overlay').style.display = 'none';
}
async function tiersSheetSelect(tierIndex) {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    const pro = nxfmGetActiveViewedPro();
    const item = tiersSheetData;
    if (!pro || !item) return;
    const tier = item.tiers[tierIndex];
    try {
        await nxfmAddToCart(pro.id, {
            name: `${item.name} (${tier.name})`,
            price: tier.price,
            image: item.image || '',
            icon: item.icon || '🛠️',
            desc: item.desc || '',
            currency: item.currency,
            qty: 1
        });
        closeTiersSheet();
        showGlobalToast('✅ Added to cart');
    } catch (err) {
        showGlobalToast('❌ Cart save failed: ' + err.message);
    }
    }
function mbRenderMenuItem(item, idx) {
    return `
    <div class="nxfm-item-card-grid" onclick="mbOpenEditItem(${idx})">
        <div class="nxfm-grid-thumb">
            ${item.image ? `<img src="${item.image}">` : (item.icon || '🍽️')}
        </div>
        <div class="nxfm-grid-info">
            <div class="nxfm-grid-name">${item.name}</div>
            <div class="nxfm-grid-desc">${item.desc || ''}</div>
            <div class="nxfm-grid-bottom-row">
                <div class="nxfm-grid-price">${item.pricingType === 'tiered' ? 'From ' + formatPrice(Math.min(...item.tiers.map(t=>t.price)), item.currency) : formatPrice(item.price, item.currency)}</div>
                <button class="nxfm-grid-add-btn" onclick="event.stopPropagation();mbOpenItemMenu(${idx})">⋮</button>
            </div>
        </div>
    </div>`;
}
let mbCurrentCategory = null;
let mbAllItems = [];

async function openMyBusinessDashboard() {
    const username = localStorage.getItem("nexus_user_session");
    if (!username) { showGlobalToast('⚠️ Please login again.'); return; }

    document.getElementById('my-business-overlay').style.display = 'flex';
    mbSwitchTab('overview');

    try {
        const snap = await firebase.database().ref('providers/' + username).once('value');
        const data = snap.val();
        if (!data) { showGlobalToast('❌ Business profile not found.'); return; }

        document.getElementById('mb-business-name').textContent = data.businessName || data.categoryLabel || 'My Business';
        const headerPublishBtn = document.getElementById('mb-header-publish-btn');
        if (data.color && headerPublishBtn) headerPublishBtn.style.borderColor = data.color;
        mbAllItems = [];
        const categories = data.categories || {};
        Object.keys(categories).forEach(catKey => {
            const catItems = categories[catKey].items || {};
            Object.keys(catItems).forEach(itemKey => {
                mbAllItems.push({ id: itemKey, category: catKey, ...catItems[itemKey] });
            });
        });
       mbRenderCategoryPills(Object.keys(categories));
        mbRenderMenuList();
        mbRenderOverview(data); 
    } catch (err) {
        showGlobalToast('❌ Failed to load menu: ' + err.message);
    }
}

function closeMyBusinessDashboard() {
    document.getElementById('my-business-overlay').style.display = 'none';
}

function mbSwitchTab(tabName) {
['overview','menu','orders','sales','bookings','customers','insights','reviews','gallery'].forEach(t => {
        document.getElementById('mb-tab-' + t).classList.toggle('active', t === tabName);
        document.getElementById('mb-panel-' + t).style.display = (t === tabName) ? 'block' : 'none';
    });
    if (tabName === 'orders') mbLoadOrders();
    if (tabName === 'sales') mbLoadSales();
    if (tabName === 'bookings') mbRenderBookingsTab();
    if (tabName === 'customers') mbRenderCustomersTab();
    if (tabName === 'insights') mbRenderInsightsTab();
    if (tabName === 'reviews') mbRenderReviewsTab();
    if (tabName === 'gallery') mbRenderGalleryTab();
    }
let mbBookingsAll = [];

async function mbRenderBookingsTab() {
    const username = localStorage.getItem("nexus_user_session");
    const list = document.getElementById('mb-bookings-list');
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Loading bookings...</div>`;
    try {
        const snap = await firebase.database().ref('providers/' + username + '/requests').once('value');
        const data = snap.val() || {};
        mbBookingsAll = Object.entries(data)
            .map(([id, r]) => ({ id, ...r }))
            .filter(r => r.status !== 'declined' && r.status !== 'cancelled')
            .sort((a, b) => (a.dateNeeded || '9999-99-99').localeCompare(b.dateNeeded || '9999-99-99'));
        mbRenderBookingsList();
    } catch (err) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Failed to load bookings</div>`;
    }
}

function mbBookingUrgency(dateStr) {
    if (!dateStr) return { label: 'No date', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(dateStr + 'T00:00:00');
    const diffDays = Math.round((target - today) / 86400000);
    if (diffDays < 0) return { label: 'Overdue', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' };
    if (diffDays === 0) return { label: 'Today', color: '#ea580c', bg: 'rgba(234,88,12,0.1)' };
    if (diffDays === 1) return { label: 'Tomorrow', color: '#d97706', bg: 'rgba(217,119,6,0.1)' };
    if (diffDays <= 7) return { label: 'This Week', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' };
    return { label: 'Upcoming', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' };
}

function mbRenderBookingsList() {
    const list = document.getElementById('mb-bookings-list');
    if (mbBookingsAll.length === 0) {
        list.innerHTML = `
        <div style="text-align:center;padding:50px 20px;color:rgba(255,255,255,0.5);">
            <div style="font-size:36px;margin-bottom:10px;">📅</div>
            <div style="font-weight:800;font-size:14px;color:#ffffff;margin-bottom:4px;">No bookings yet</div>
            <div style="font-size:12px;">Job requests from customers will appear here so you never miss one.</div>
        </div>`;
        return;
    }
    list.innerHTML = mbBookingsAll.map(b => {
        const urgency = mbBookingUrgency(b.dateNeeded);
        const dateLabel = b.dateNeeded
            ? new Date(b.dateNeeded + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
            : 'No date specified';
        const budgetLabel = b.budgetUnit === 'negotiable' || !b.budget
            ? 'Negotiable'
            : `${formatPrice(b.budget, b.currency)} ${b.budgetUnit || ''}`;
        return `
        <div style="background:#262626 !important;border:1.5px solid ${urgency.color}22;border-left:4px solid ${urgency.color};border-radius:14px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <div style="font-size:11px;font-weight:800;color:${urgency.color};background:${urgency.bg};padding:3px 9px;border-radius:8px;">${urgency.label.toUpperCase()}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);font-weight:700;">${dateLabel}</div>
            </div>
            <div style="font-size:13.5px;color:#ffffff;font-weight:600;line-height:1.4;margin-bottom:8px;">${(b.jobDescription || '').replace(/</g,'&lt;')}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:12px;color:rgba(255,255,255,0.55);">👤 ${b.customerUsername || 'Customer'}</div>
                <div style="font-size:12.5px;font-weight:800;color:#ffffff;">${budgetLabel}</div>
            </div>
        </div>`;
    }).join('');
    }

let mbCustomersAll = [];

async function mbRenderCustomersTab() {
    const username = localStorage.getItem("nexus_user_session");
    const list = document.getElementById('mb-customers-list');
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Loading customers...</div>`;
    try {
        const [ordersSnap, requestsSnap, currencySnap] = await Promise.all([
            firebase.database().ref('providers/' + username + '/orders').once('value'),
            firebase.database().ref('providers/' + username + '/requests').once('value'),
            firebase.database().ref('providers/' + username + '/currency').once('value')
        ]);
        const ordersData = ordersSnap.val() || {};
        const requestsData = requestsSnap.val() || {};
        const proCurrency = currencySnap.val() || '';
        const customerMap = {};

        Object.values(ordersData).forEach(o => {
            const cust = o.customerUsername;
            if (!cust) return;
            if (!customerMap[cust]) customerMap[cust] = { username: cust, orders: 0, bookings: 0, totalSpent: 0, lastActive: 0 };
            customerMap[cust].orders++;
            customerMap[cust].totalSpent += (Number(o.itemPrice) || 0) * (Number(o.quantity) || 1);
            customerMap[cust].lastActive = Math.max(customerMap[cust].lastActive, o.createdAt || 0);
        });

        Object.values(requestsData).forEach(r => {
            const cust = r.customerUsername;
            if (!cust) return;
            if (!customerMap[cust]) customerMap[cust] = { username: cust, orders: 0, bookings: 0, totalSpent: 0, lastActive: 0 };
            customerMap[cust].bookings++;
            customerMap[cust].lastActive = Math.max(customerMap[cust].lastActive, r.createdAt || 0);
        });

        mbCustomersAll = Object.values(customerMap)
            .map(c => ({ ...c, currency: proCurrency }))
            .sort((a, b) => b.lastActive - a.lastActive);
        mbRenderCustomersList();
    } catch (err) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Failed to load customers</div>`;
    }
}

function mbRenderCustomersList() {
    const list = document.getElementById('mb-customers-list');
    if (mbCustomersAll.length === 0) {
        list.innerHTML = `
        <div style="text-align:center;padding:50px 20px;color:rgba(255,255,255,0.5);">
            <div style="font-size:36px;margin-bottom:10px;">👥</div>
            <div style="font-weight:800;font-size:14px;color:#ffffff;margin-bottom:4px;">No customers yet</div>
            <div style="font-size:12px;">Everyone who orders or books you will show up here.</div>
        </div>`;
        return;
    }
    list.innerHTML = mbCustomersAll.map(c => {
        const isRepeat = (c.orders + c.bookings) > 1;
        const lastActiveLabel = c.lastActive ? new Date(c.lastActive).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
        const spentLabel = c.totalSpent > 0 ? formatPrice(c.totalSpent, c.currency) : '—';
        return `
        <div style="background:#262626 !important;border-radius:14px;padding:14px;display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;border-radius:50%;background:rgba(99,102,241,0.18);color:#818cf8;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex-shrink:0;">${(c.username || '?').charAt(0).toUpperCase()}</div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <div style="font-size:13.5px;font-weight:800;color:#ffffff;">${c.username}</div>
                    ${isRepeat ? `<span style="font-size:9.5px;font-weight:800;color:#4ade80;background:rgba(22,163,74,0.15);padding:2px 6px;border-radius:6px;">REPEAT</span>` : ''}
                </div>
                <div style="font-size:11.5px;color:rgba(255,255,255,0.55);margin-top:2px;">${c.orders} order${c.orders===1?'':'s'} · ${c.bookings} booking${c.bookings===1?'':'s'} · Last: ${lastActiveLabel}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:12.5px;font-weight:800;color:#ffffff;">${spentLabel}</div>
                <div style="font-size:9.5px;color:rgba(255,255,255,0.5);">spent</div>
            </div>
        </div>`;
    }).join('');
    }
async function mbRenderInsightsTab() {
    const username = localStorage.getItem("nexus_user_session");
    try {
        const [viewsSnap, ordersSnap, requestsSnap] = await Promise.all([
            firebase.database().ref('providers/' + username + '/analytics/views').once('value'),
            firebase.database().ref('providers/' + username + '/orders').once('value'),
            firebase.database().ref('providers/' + username + '/requests').once('value')
        ]);
        const viewsData = viewsSnap.val() || {};
        const ordersData = ordersSnap.val() || {};
        const requestsData = requestsSnap.val() || {};

        const todayKey = new Date().toISOString().slice(0,10);
        const viewsToday = viewsData[todayKey] || 0;
        const totalViews = Object.values(viewsData).reduce((a, b) => a + b, 0);

        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0,10);
            last7.push({ count: viewsData[key] || 0, label: d.toLocaleDateString('en-GB', { weekday: 'short' }) });
        }
        const maxViews = Math.max(1, ...last7.map(d => d.count));

        const totalEngagements = Object.keys(ordersData).length + Object.keys(requestsData).length;
        const conversionRate = totalViews > 0 ? Math.round((totalEngagements / totalViews) * 100) : 0;

        document.getElementById('mb-insights-views-today').textContent = viewsToday;
        document.getElementById('mb-insights-total-views').textContent = totalViews;
        document.getElementById('mb-insights-conversion').textContent = conversionRate + '%';

        document.getElementById('mb-insights-chart').innerHTML = last7.map(d => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                <div style="font-size:10px;font-weight:800;color:#334155;">${d.count}</div>
                <div style="width:100%;max-width:28px;height:${Math.max(6, (d.count / maxViews) * 80)}px;background:linear-gradient(180deg,#3b82f6,#2563eb);border-radius:6px 6px 2px 2px;"></div>
                <div style="font-size:9.5px;color:#94a3b8;">${d.label}</div>
            </div>`).join('');
    } catch (err) {
        console.warn('Insights unavailable:', err.message);
    }
}
let mbReviewsAll = [];

async function mbRenderReviewsTab() {
    const username = localStorage.getItem("nexus_user_session");
    const list = document.getElementById('mb-reviews-list');
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Loading reviews...</div>`;
    try {
        const snap = await firebase.database().ref('reviews/' + username).once('value');
        const data = snap.val() || {};
        mbReviewsAll = Object.entries(data).map(([id, r]) => ({ id, ...r })).sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

        const avgEl = document.getElementById('mb-reviews-avg');
        const starsEl = document.getElementById('mb-reviews-avg-stars');
        const countEl = document.getElementById('mb-reviews-count');
        const breakdownEl = document.getElementById('mb-reviews-breakdown');

        if (mbReviewsAll.length === 0) {
            avgEl.textContent = '—';
            starsEl.textContent = '☆☆☆☆☆';
            countEl.textContent = '0 reviews';
            breakdownEl.innerHTML = '';
            list.innerHTML = `
            <div style="text-align:center;padding:50px 20px;color:rgba(255,255,255,0.5);">
                <div style="font-size:36px;margin-bottom:10px;">⭐</div>
                <div style="font-weight:800;font-size:14px;color:#ffffff;margin-bottom:4px;">No reviews yet</div>
                <div style="font-size:12px;">Customer reviews will appear here after their first order or booking.</div>
            </div>`;
            return;
        }

        const total = mbReviewsAll.length;
        const avg = mbReviewsAll.reduce((sum, r) => sum + (Number(r.rating)||0), 0) / total;
        avgEl.textContent = avg.toFixed(1);
        const fullStars = Math.round(avg);
        starsEl.textContent = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
        countEl.textContent = `${total} review${total === 1 ? '' : 's'}`;

        const counts = [5,4,3,2,1].map(star => mbReviewsAll.filter(r => Math.round(Number(r.rating)) === star).length);
        breakdownEl.innerHTML = [5,4,3,2,1].map((star, i) => {
            const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
            return `
            <div style="display:flex;align-items:center;gap:6px;">
                <div style="font-size:10.5px;color:rgba(255,255,255,0.55);width:10px;">${star}</div>
                <div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:#f59e0b;"></div>
                </div>
                <div style="font-size:10px;color:rgba(255,255,255,0.5);width:22px;text-align:right;">${counts[i]}</div>
            </div>`;
        }).join('');

        list.innerHTML = mbReviewsAll.map(r => {
            const stars = '★'.repeat(Math.round(Number(r.rating)||0)) + '☆'.repeat(5 - Math.round(Number(r.rating)||0));
            return `
            <div style="background:#262626 !important;border-radius:16px;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="width:34px;height:34px;border-radius:50%;background:${r.reviewerColor || '#6366f1'};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px;flex-shrink:0;">${r.reviewerInitials || '?'}</div>
                        <div>
                            <div style="font-size:13px;font-weight:800;color:#ffffff;">${r.customerName || 'Customer'}</div>
                            <div style="color:#f59e0b;font-size:11px;">${stars}</div>
                        </div>
                    </div>
                    <div style="font-size:10.5px;color:rgba(255,255,255,0.5);flex-shrink:0;">${r.date || ''}</div>
                </div>
                <div style="font-size:12.5px;color:rgba(255,255,255,0.85);line-height:1.5;">${(r.comment || '').replace(/</g,'&lt;')}</div>
                ${r.verifiedOrder ? `<div style="font-size:10px;color:#4ade80;font-weight:700;margin-top:8px;">✓ ${r.verifiedOrder}</div>` : ''}
            </div>`;
        }).join('');
    } catch (err) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.5);font-size:12px;">Failed to load reviews</div>`;
    }
    }
async function mbRenderGalleryTab() {
    const username = localStorage.getItem("nexus_user_session");
    const grid = document.getElementById('mb-gallery-grid');
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Loading gallery...</div>`;
    try {
        const snap = await firebase.database().ref('providers/' + username + '/portfolio').once('value');
        const data = snap.val() || [];
        const photos = (Array.isArray(data) ? data : Object.values(data)).filter(Boolean);

        if (photos.length === 0) {
            grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:rgba(255,255,255,0.5);">
                <div style="font-size:36px;margin-bottom:10px;">🖼️</div>
                <div style="font-weight:800;font-size:14px;color:#ffffff;margin-bottom:4px;">No photos yet</div>
                <div style="font-size:12px;">Upload photos to show customers your work.</div>
            </div>`;
            return;
        }

        grid.innerHTML = photos.map((p, i) => {
            const url = typeof p === 'string' ? p : (p && p.url) || '';
            return `
            <div style="position:relative;border-radius:12px;overflow:hidden;aspect-ratio:1;background:#262626;">
                <img src="${url}" alt="${url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="console.warn('GALLERY IMG FAILED:', this.src); this.style.outline='2px solid red';">
                <button onclick="mbDeleteGalleryPhoto(${i})" style="position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;font-size:12px;cursor:pointer;">✕</button>
            </div>`;
        }).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:rgba(255,255,255,0.5);font-size:12px;">Failed to load gallery</div>`;
    }
    }

async function mbUploadGalleryPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const username = localStorage.getItem("nexus_user_session");
    showGlobalToast('⏳ Uploading photo...');
    try {
      if (typeof guaranteeAuth === 'function') await guaranteeAuth();
        const idToken = firebase.auth().currentUser ? await firebase.auth().currentUser.getIdToken() : null;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'portfolio');
        formData.append('username', username);
        const res = await fetch('https://oryzon-backend-ed1q.onrender.com/upload', {
            method: 'POST',
            headers: idToken ? { "Authorization": `Bearer ${idToken}` } : {},
            body: formData
        });
       const uploadData = await res.json();
        if (!res.ok || !uploadData || !uploadData.url) throw new Error(uploadData?.error || `Server ya ki karba (status ${res.status})`);
        const snap = await firebase.database().ref('providers/' + username + '/portfolio').once('value');
        const existing = snap.val() || [];
        const photos = (Array.isArray(existing) ? existing : Object.values(existing)).filter(Boolean);
        photos.push(uploadData.url);
        await firebase.database().ref('providers/' + username + '/portfolio').set(photos);

        showGlobalToast('✅ Photo added to gallery');
        mbRenderGalleryTab();
    } catch (err) {
        showGlobalToast('❌ Upload failed: ' + err.message);
    }
}

async function mbDeleteGalleryPhoto(index) {
    if (!confirm('Remove this photo from your gallery?')) return;
    const username = localStorage.getItem("nexus_user_session");
    try {
        const snap = await firebase.database().ref('providers/' + username + '/portfolio').once('value');
        const existing = snap.val() || [];
        const photos = Array.isArray(existing) ? existing : Object.values(existing);
        photos.splice(index, 1);
        await firebase.database().ref('providers/' + username + '/portfolio').set(photos);
        showGlobalToast('✅ Photo removed');
        mbRenderGalleryTab();
    } catch (err) {
        showGlobalToast('❌ Failed to remove photo: ' + err.message);
    }
}

function mbRenderCategoryPills(categoryKeys) {
    const wrap = document.getElementById('mb-category-pills');
    wrap.innerHTML = `<div class="nxfm-tab ${mbCurrentCategory===null?'active':''}" onclick="mbFilterCategory(null)">All</div>` +
        categoryKeys.map(cat => `<div class="nxfm-tab ${mbCurrentCategory===cat?'active':''}" onclick="mbFilterCategory('${cat}')">${cat}</div>`).join('');
    }

function mbFilterCategory(cat) {
    mbCurrentCategory = cat;
    mbRenderCategoryPills([...new Set(mbAllItems.map(i => i.category))]);
    mbRenderMenuList();
}

function mbRenderMenuList() {
    const list = document.getElementById('mb-menu-list');
    const items = mbCurrentCategory ? mbAllItems.filter(i => i.category === mbCurrentCategory) : mbAllItems;
    if (items.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#94a3b8;font-size:13px;">No items yet. Tap "Add Item" below to get started.</div>`;
        return;
    }
    list.innerHTML = items.map((item, idx) => mbRenderMenuItem(item, idx)).join('');
    }
let mbEditingIndex = null;
let mbPricingType = 'flat';
let mbTierCount = 0;

function mbShareMenuLink() {
    const username = localStorage.getItem("nexus_user_session");
    if (!username) { showGlobalToast('⚠️ Please login again.'); return; }
    const shareUrl = `https://oryzon-backend-ed1q.onrender.com/share/${username}`;
    const shareTitle = 'Check out my profile on Nexus';
    if (navigator.share) {
        navigator.share({ title: shareTitle, url: shareUrl }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showGlobalToast('🔗 Link copied! Share it with your customers.');
        }).catch(() => {
            showGlobalToast('⚠️ Failed to copy link.');
        });
    }
}

function mbOpenAddItem() {
    mbEditingIndex = null;
    mbPricingType = 'flat';
    mbTierCount = 0;
    document.getElementById('mb-form-title').textContent = 'Add Item';
    document.getElementById('mb-inp-name').value = '';
    document.getElementById('mb-inp-desc').value = '';
    document.getElementById('mb-inp-category').value = mbCurrentCategory || '';
    document.getElementById('mb-inp-icon').value = '';
    document.getElementById('mb-inp-price').value = '';
    document.getElementById('mb-tiers-inputs').innerHTML = '';
    mbSetPricingType('flat');
    document.getElementById('mb-item-form-overlay').style.display = 'flex';
}

let mbActionsItemIdx = null;
function mbOpenItemMenu(idx) {
    mbActionsItemIdx = idx;
    document.getElementById('mb-item-actions-sheet').style.display = 'flex';
}
function mbCloseItemActions() {
    document.getElementById('mb-item-actions-sheet').style.display = 'none';
    mbActionsItemIdx = null;
}
function mbActionsDelete() {
    const idx = mbActionsItemIdx;
    mbCloseItemActions();
    mbDeleteItem(idx);
    }

function mbOpenEditItem(idx) {
    const items = mbCurrentCategory ? mbAllItems.filter(i => i.category === mbCurrentCategory) : mbAllItems;
    const item = items[idx];
    if (!item) return;
    mbEditingIndex = mbAllItems.indexOf(item);
    document.getElementById('mb-form-title').textContent = 'Edit Item';
    document.getElementById('mb-inp-name').value = item.name || '';
    document.getElementById('mb-inp-desc').value = item.desc || '';
    document.getElementById('mb-inp-category').value = item.category || '';
    document.getElementById('mb-inp-icon').value = item.icon || '';
    document.getElementById('mb-tiers-inputs').innerHTML = '';
    mbTierCount = 0;
    if (item.pricingType === 'tiered') {
        mbSetPricingType('tiered');
        (item.tiers || []).forEach(t => mbAddTierRow(t));
    } else {
        mbSetPricingType('flat');
        document.getElementById('mb-inp-price').value = item.price || '';
    }
    document.getElementById('mb-item-form-overlay').style.display = 'flex';
}

function mbCloseItemForm() {
    document.getElementById('mb-item-form-overlay').style.display = 'none';
}

function mbSetPricingType(type) {
    mbPricingType = type;
    const flatBtn = document.getElementById('mb-price-type-flat');
    const tierBtn = document.getElementById('mb-price-type-tiered');
    flatBtn.style.background = type === 'flat' ? '#fff7ed' : '#ffffff';
    flatBtn.style.borderColor = type === 'flat' ? '#ea580c' : '#e2e8f0';
    flatBtn.style.color = type === 'flat' ? '#ea580c' : '#334155';
    tierBtn.style.background = type === 'tiered' ? '#fff7ed' : '#ffffff';
    tierBtn.style.borderColor = type === 'tiered' ? '#ea580c' : '#e2e8f0';
    tierBtn.style.color = type === 'tiered' ? '#ea580c' : '#334155';
    document.getElementById('mb-flat-price-block').style.display = type === 'flat' ? 'block' : 'none';
    document.getElementById('mb-tiers-block').style.display = type === 'tiered' ? 'flex' : 'none';
    if (type === 'tiered' && mbTierCount === 0) { mbAddTierRow(); mbAddTierRow(); mbAddTierRow(); }
}

function mbAddTierRow(prefill) {
    const id = mbTierCount++;
    const wrap = document.getElementById('mb-tiers-inputs');
    const row = document.createElement('div');
    row.id = 'mb-tier-row-' + id;
    row.style = 'display:flex;gap:6px;margin-bottom:8px;';
    row.innerHTML = `
        <input class="mb-tier-name" placeholder="Tier name" value="${prefill?.name || ''}" style="flex:1;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 10px;font-size:12px;outline:none;">
        <input class="mb-tier-price" type="number" placeholder="Price" value="${prefill?.price || ''}" style="width:80px;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 10px;font-size:12px;outline:none;">        
        <input class="mb-tier-delivery" placeholder="Delivery" value="${prefill?.delivery || ''}" style="width:90px;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 10px;font-size:12px;outline:none;">
        <button onclick="document.getElementById('mb-tier-row-${id}').remove()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:10px;width:32px;cursor:pointer;">✕</button>`;
    wrap.appendChild(row);
}

async function mbSaveItem() {
    const username = localStorage.getItem("nexus_user_session");
    const name = document.getElementById('mb-inp-name').value.trim();
    const category = document.getElementById('mb-inp-category').value.trim();
    if (!name || !category) { showGlobalToast('⚠️ Name and category are required.'); return; }

    const item = {
        name,
        desc: document.getElementById('mb-inp-desc').value.trim(),
        icon: document.getElementById('mb-inp-icon').value.trim() || '🍽️',
        category,
        pricingType: mbPricingType
    };

    if (mbPricingType === 'flat') {
        item.price = Number(document.getElementById('mb-inp-price').value) || 0;
    } else {
        const rows = document.querySelectorAll('#mb-tiers-inputs > div');
        item.tiers = Array.from(rows).map(r => ({
            name: r.querySelector('.mb-tier-name').value.trim(),
            price: Number(r.querySelector('.mb-tier-price').value) || 0,
            delivery: r.querySelector('.mb-tier-delivery').value.trim(),
            includes: []
        })).filter(t => t.name && t.price);
        if (item.tiers.length === 0) { showGlobalToast('⚠️ Add at least one tier.'); return; }
    }

    try {
        const ref = firebase.database().ref('providers/' + username + '/categories/' + category + '/items');
        if (mbEditingIndex !== null) {
            const existing = mbAllItems[mbEditingIndex];
            await ref.child(existing.id).set(item);
        } else {
            await ref.push(item);
        }
        showGlobalToast('✅ Item saved');
        mbCloseItemForm();
        openMyBusinessDashboard();
    } catch (err) {
        showGlobalToast('❌ Save failed: ' + err.message);
    }
}

async function mbDeleteItem(idx) {
    const username = localStorage.getItem("nexus_user_session");
    const items = mbCurrentCategory ? mbAllItems.filter(i => i.category === mbCurrentCategory) : mbAllItems;
    const item = items[idx];
    if (!item) return;
    try {
        await firebase.database().ref('providers/' + username + '/categories/' + item.category + '/items/' + item.id).remove();
        showGlobalToast('🗑️ Item deleted');
        openMyBusinessDashboard();
    } catch (err) {
        showGlobalToast('❌ Delete failed: ' + err.message);
    }
}

// ── RENDER 7-DAY TREND CHART (Orders vs Bookings) ──
function mbRenderTrendChart(ordersByDay, bookingsByDay, dayLabels) {
    const svg = document.getElementById('mb-trend-svg');
    const labelsWrap = document.getElementById('mb-trend-labels');
    if (!svg || !labelsWrap) return;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const W = 300, padX = 15, topY = 14, baseY = 92;
    const maxVal = Math.max(1, ...ordersByDay, ...bookingsByDay);
    const stepX = (W - padX * 2) / (ordersByDay.length - 1);
    const pointsFor = (arr) => arr.map((v, i) => {
        const x = padX + i * stepX;
        const y = baseY - (v / maxVal) * (baseY - topY);
        return { x, y };
    });
    const makeEl = (tag, attrs) => {
        const el = document.createElementNS(SVG_NS, tag);
        Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
        return el;
    };
    const baseline = makeEl('line', { x1: padX, y1: baseY, x2: W - padX, y2: baseY, stroke: 'rgba(255,255,255,0.12)', 'stroke-width': 1 });
    svg.appendChild(baseline);
    const addSeries = (pts, color, dashed) => {
        const lineAttrs = { points: pts.map(p => `${p.x},${p.y}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
        if (dashed) lineAttrs['stroke-dasharray'] = '4,3';
        svg.appendChild(makeEl('polyline', lineAttrs));
        pts.forEach(p => svg.appendChild(makeEl('circle', { cx: p.x, cy: p.y, r: 2.8, fill: color })));
    };
    addSeries(pointsFor(ordersByDay), '#38bdf8', false);
    addSeries(pointsFor(bookingsByDay), '#f472b6', true);
    labelsWrap.innerHTML = dayLabels.map(d => `<span>${d}</span>`).join('');
    }

const MB_ANNOUNCEMENTS = [
    { tag: 'NEW', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', icon: '📅', title: 'Bookings & Insights are here', body: 'Track every job request and see how many people view your profile — all in one place.' },
    { tag: 'NEW', gradient: 'linear-gradient(135deg,#10b981,#059669)', icon: '👥', title: 'Meet your Customers tab', body: 'See everyone who has ordered or booked you, and spot your repeat customers instantly.' },
    { tag: 'TIP', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '✨', title: 'Boost your Profile Health', body: 'Complete your setup checklist to get more visibility and bookings from customers.' }
];

function mbRenderAnnouncements() {
    const track = document.getElementById('mb-announce-track');
    const dots = document.getElementById('mb-announce-dots');
    if (!track || !dots) return;
    track.innerHTML = MB_ANNOUNCEMENTS.map(a => `
        <div class="mb-announce-slide" style="background:#ffffff;">
            <div style="height:4px;background:${a.gradient};"></div>
            <div style="padding:16px;display:flex;gap:12px;align-items:flex-start;">
                <div style="width:40px;height:40px;border-radius:12px;background:${a.gradient};display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;">${a.icon}</div>
                <div style="flex:1;min-width:0;">
                    <span style="font-size:9.5px;font-weight:800;color:#ea580c;background:rgba(234,88,12,0.12);padding:2px 7px;border-radius:6px;">${a.tag}</span>
                    <div class="mb-heading-brand" style="font-size:14px;font-weight:800;color:#1e293b;margin-top:6px;">${a.title}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:3px;line-height:1.4;">${a.body}</div>
                </div>
            </div>
        </div>`).join('');
    dots.innerHTML = MB_ANNOUNCEMENTS.map((_, i) => `<div class="mb-announce-dot${i === 0 ? ' active' : ''}"></div>`).join('');
    let ticking = false;
    track.onscroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const idx = Math.round(track.scrollLeft / track.clientWidth);
            [...dots.children].forEach((d, i) => d.classList.toggle('active', i === idx));
            ticking = false;
        });
    };
}

async function mbRenderOverview(data) {
    const username = localStorage.getItem("nexus_user_session");
    mbRenderAnnouncements();
    const businessName = data.businessName || data.categoryLabel || username;
    const isFoodCategory = ['chef', 'snacks', 'beverages'].includes(data.category);  
    document.getElementById('mb-greeting').textContent = `Good morning, ${businessName}`;
    document.getElementById('mb-greeting-sub').textContent = `Here's how ${businessName} is doing today`;

    const isPublished = data.published === true;
    document.getElementById('mb-publish-banner').style.display = isPublished ? 'none' : 'flex';

   const todayKey = new Date().toISOString().slice(0,10);
    const last7Keys = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0,10); });
    const last7Labels = last7Keys.map(k => new Date(k + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }));
    const ordersByDay = last7Keys.map(() => 0);
    const bookingsByDay = last7Keys.map(() => 0);
    let salesToday = 0, ordersToday = 0, pendingCount = 0, salesTodayCurrency = '', completedCount = 0, cancelledCount = 0, totalOrdersCount = 0;   
    try {
        const ordersSnap = await firebase.database().ref('providers/' + username + '/orders').once('value');
        ordersSnap.forEach(child => {
            const o = child.val();
            const orderDate = new Date(o.createdAt || 0).toISOString().slice(0,10);
            const lineTotal = (Number(o.itemPrice) || 0) * (Number(o.quantity) || 1);
            if (orderDate === todayKey) {
                ordersToday++;
                if (o.status === 'completed') { salesToday += lineTotal; if (!salesTodayCurrency) salesTodayCurrency = o.currency || ''; }
            }
            const orderDayIdx = last7Keys.indexOf(orderDate);
            if (orderDayIdx !== -1) ordersByDay[orderDayIdx]++;
          if (o.status === 'pending') pendingCount++;
            if (o.status === 'completed') completedCount++;
            if (o.status === 'cancelled') cancelledCount++;
            totalOrdersCount++;
        });
    } catch (err) { console.warn('Orders stats unavailable:', err.message); }
    let avgRating = null, reviewCount = 0;
    try {
        const reviewsSnap = await firebase.database().ref('reviews/' + username).once('value');
        let ratingSum = 0;
        reviewsSnap.forEach(child => {
            const r = child.val();
            if (typeof r.rating === 'number') { ratingSum += r.rating; reviewCount++; }
        });
        if (reviewCount > 0) avgRating = (ratingSum / reviewCount).toFixed(1);
    } catch (err) { console.warn('Reviews stats unavailable:', err.message); }

    const completionRate = (completedCount + cancelledCount) > 0
        ? Math.round((completedCount / (completedCount + cancelledCount)) * 100)
        : 100;

    try {
        const reqSnap = await firebase.database().ref('providers/' + username + '/requests').once('value');
        const reqData = reqSnap.val() || {};
       const bookingsToday = Object.values(reqData).filter(r => new Date(r.createdAt || 0).toISOString().slice(0,10) === todayKey).length;
        document.getElementById('mb-stat-bookings-today').textContent = bookingsToday;
        document.getElementById('mb-stat-total-bookings').textContent = Object.keys(reqData).length;
        Object.values(reqData).forEach(r => {
            const reqDate = new Date(r.createdAt || 0).toISOString().slice(0,10);
            const reqDayIdx = last7Keys.indexOf(reqDate);
            if (reqDayIdx !== -1) bookingsByDay[reqDayIdx]++;
        });
        const upcoming = Object.values(reqData).filter(r => r.status !== 'declined' && r.status !== 'cancelled' && r.status !== 'completed');
        const banner = document.getElementById('mb-bookings-banner');
        if (upcoming.length > 0) {
            banner.style.display = 'flex';
            document.getElementById('mb-bookings-count').textContent = upcoming.length;
            document.getElementById('mb-bookings-plural').textContent = upcoming.length === 1 ? '' : 's';
            const hasUrgent = upcoming.some(r => mbBookingUrgency(r.dateNeeded).label === 'Today' || mbBookingUrgency(r.dateNeeded).label === 'Overdue');
            document.getElementById('mb-bookings-urgent-tip').textContent = hasUrgent ? '⚠️ Some need your attention today' : 'Tap to review job requests';
        } else {
            banner.style.display = 'none';
        }
    } catch (err) { console.warn('Bookings banner unavailable:', err.message); }

    mbRenderTrendChart(ordersByDay, bookingsByDay, last7Labels); 
    try {
        const viewsSnap = await firebase.database().ref(`providers/${username}/analytics/views/${todayKey}`).once('value');
        document.getElementById('mb-stat-visitors').textContent = viewsSnap.val() || 0;
    } catch (err) { console.warn('Visitors stat unavailable:', err.message); }

    document.getElementById('mb-stat-orders').textContent = ordersToday;
    document.getElementById('mb-stat-pending-orders').textContent = pendingCount;
    document.getElementById('mb-badge-rating').textContent = avgRating ? `${avgRating}` : '—';
    document.getElementById('mb-badge-completion').textContent = completionRate + '%';
    document.getElementById('mb-stat-total-orders').textContent = totalOrdersCount;                                                                 const categories = data.categories || {};
    const totalItems = Object.values(categories).reduce((sum, c) => sum + Object.keys(c.items || {}).length, 0);
    const checklist = [
        { label: 'Complete business info', done: !!(data.businessName && data.bio && data.location) },
        { label: 'Add your first menu item', done: totalItems > 0 },
        { label: 'Add payment method', done: false },
        { label: 'Publish your menu', done: isPublished },
        { label: 'Upgrade to Premium', done: false, onClick: 'mbOpenUpgradeModal()' },
    ];
    const healthDone = checklist.filter(s => s.done).length;
    const healthPct = Math.round((healthDone / checklist.length) * 100);
    const healthColor = healthPct >= 80 ? 'var(--np-green,#10b981)' : healthPct >= 40 ? 'var(--np-amber,#f59e0b)' : 'var(--np-red,#ef4444)';
    const healthTip = healthPct >= 80 ? 'Great! Your profile is fully optimized' : healthPct >= 40 ? 'Almost there — finish the steps below' : 'Complete your setup to boost visibility';
    document.getElementById('mb-health-ring').style.background = `conic-gradient(${healthColor} ${healthPct * 3.6}deg, rgba(255,255,255,0.1) 0deg)`;
    document.getElementById('mb-health-score').textContent = healthPct + '%';
    document.getElementById('mb-health-score').style.color = healthColor;
    document.getElementById('mb-health-tip').textContent = healthTip;
    document.getElementById('mb-setup-checklist').innerHTML = checklist.map(step => `
        <div class="mb-glass-card mb-check-card" onclick="${step.onClick || ''}" style="${step.onClick ? 'cursor:pointer;' : ''}${step.done ? '' : 'border-left:3px solid var(--np-cyan,#06b6d4);'}">
            <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${step.done ? 'var(--np-green,#10b981)' : 'rgba(255,255,255,0.35)'};background:${step.done ? 'var(--np-green,#10b981)' : 'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:12px;">${step.done ? '✓' : ''}</div>
            <div style="flex:1;font-size:13px;font-weight:600;color:${step.done ? 'rgba(255,255,255,0.55)' : '#ffffff'};${step.done ? 'text-decoration:line-through;' : ''}">${step.label}</div>
        </div>`).join('');
    }
async function mbPublish() {
    const username = localStorage.getItem("nexus_user_session");
    try {
        showGlobalToast('⏳ Publishing menu...');
        const snap = await firebase.database().ref('providers/' + username).once('value');
        const data = snap.val() || {};
        await mbGenerateAndUploadFlyer(username, data);
        await firebase.database().ref('providers/' + username).update({ published: true });
        showGlobalToast('✅ Menu published!');
        openMyBusinessDashboard();
    } catch (err) { showGlobalToast('❌ Publish failed: ' + err.message); }
    }

let mbOrdersAll = [], mbOrdersFilter = 'all', mbProCurrency = '';

async function mbLoadOrders() {
    const username = localStorage.getItem("nexus_user_session");
    const list = document.getElementById('mb-orders-list');
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Loading orders...</div>`;
    try {
        const [ordersSnap, currencySnap] = await Promise.all([
            firebase.database().ref('providers/' + username + '/orders').once('value'),
            firebase.database().ref('providers/' + username + '/currency').once('value')
        ]);
        const data = ordersSnap.val() || {};
        mbProCurrency = currencySnap.val() || '';
        mbOrdersAll = Object.entries(data).map(([id, o]) => ({ id, ...o })).sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
        mbRenderOrders();
    } catch (err) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Failed to load orders</div>`;
    }
    }

function mbFilterOrders(status) {
    mbOrdersFilter = status;
    document.querySelectorAll('.mb-order-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    mbRenderOrders();
    }
function mbRenderOrders() {
    const list = document.getElementById('mb-orders-list');
   const searchTerm = (document.getElementById('mb-orders-search')?.value || '').trim().toLowerCase();
    let orders = mbOrdersFilter === 'all' ? mbOrdersAll : mbOrdersAll.filter(o => (o.status||'pending') === mbOrdersFilter);
    if (searchTerm) {
        orders = orders.filter(o => (o.itemName||'').toLowerCase().includes(searchTerm) || (o.customerUsername||'').toLowerCase().includes(searchTerm));
    } 
    if (orders.length === 0) {
        list.innerHTML = `
        <div style="text-align:center;padding:50px 20px;color:#94a3b8;">
            <div style="font-size:36px;margin-bottom:10px;">📋</div>
            <div style="font-weight:800;font-size:14px;color:#334155;margin-bottom:4px;">No ${mbOrdersFilter === 'all' ? '' : mbOrdersFilter + ' '}orders</div>
            <div style="font-size:12px;">Orders will appear here when customers place them through your menu.</div>
        </div>`;
        return;
    }

    const statusMeta = {
        pending:   { label: 'PENDING',   bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
        confirmed: { label: 'CONFIRMED', bg: 'rgba(16,185,129,0.1)', color: '#059669' },
        completed: { label: 'COMPLETED', bg: 'rgba(59,130,246,0.1)', color: '#2563eb' },
        cancelled: { label: 'CANCELLED', bg: 'rgba(239,68,68,0.1)',  color: '#dc2626' },
    };

    list.innerHTML = orders.map(o => {
        const meta = statusMeta[o.status] || statusMeta.pending;
        const lineTotal = (Number(o.itemPrice)||0) * (Number(o.quantity)||1);
        let actions = '';
        if (o.status === 'pending' || !o.status) {
            actions = `
                <button onclick="mbUpdateOrderStatus('${o.id}','confirmed')" style="flex:1;padding:10px;background:#16a34a;border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;">✓ Confirm</button>
                <button onclick="mbUpdateOrderStatus('${o.id}','cancelled')" style="flex:1;padding:10px;background:#fee2e2;border:1px solid #fecaca;border-radius:10px;color:#dc2626;font-size:12px;font-weight:800;cursor:pointer;">✕ Decline</button>`;
        } else if (o.status === 'confirmed') {
            actions = `<button onclick="mbUpdateOrderStatus('${o.id}','completed')" style="flex:1;padding:10px;background:#2563eb;border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;">✓ Mark Completed</button>`;
        }
        return `
        <div style="background:#ffffff;border-radius:16px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                <div>
                    <div style="font-weight:800;font-size:14px;color:#1e293b;">${o.itemName || '—'}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">@${o.customerUsername || 'customer'} · Qty: ${o.quantity || 1}</div>
                </div>
                <span style="background:${meta.bg};color:${meta.color};border-radius:8px;padding:4px 10px;font-size:10px;font-weight:800;flex-shrink:0;">${meta.label}</span>
            </div>
            <div style="font-size:12px;color:#64748b;margin-bottom:2px;">📍 ${o.fulfillmentMethod === 'pickup' ? 'Self Pickup' : (o.address || '—')}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:10px;">📞 ${o.phone || '—'}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f1f5f9;padding-top:10px;">
               <div style="font-weight:800;font-size:14px;color:#ea580c;">${formatPrice(lineTotal, mbProCurrency)}</div>
                <div style="font-size:11px;color:#94a3b8;">${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : ''}</div>
            </div>
            ${actions ? `<div style="display:flex;gap:8px;margin-top:10px;">${actions}</div>` : ''}
        </div>`;
    }).join('');
}

async function mbUpdateOrderStatus(orderId, newStatus) {
    const username = localStorage.getItem("nexus_user_session");
    try {
        await firebase.database().ref('providers/' + username + '/orders/' + orderId + '/status').set(newStatus);
        showGlobalToast(`✅ Order marked ${newStatus}`);
        mbLoadOrders();
    } catch (err) {
        showGlobalToast('❌ Failed to update order: ' + err.message);
    }
}
       async function mbLoadSales() {
    const username = localStorage.getItem("nexus_user_session");
    const rangeDays = Number(document.getElementById('mb-sales-range').value);
    const [planSnap, currencySnap] = await Promise.all([
        firebase.database().ref('providers/' + username + '/plan').once('value'),
        firebase.database().ref('providers/' + username + '/currency').once('value')
    ]);
    const currentPlan = planSnap.val() || 'free';
    const proCurrency = currencySnap.val() || '';
    const isPaid = currentPlan === 'pro' || currentPlan === 'max';
    const badge = document.getElementById('mb-plan-badge');
    if (badge) {
        badge.textContent = currentPlan.toUpperCase();
        badge.style.background = isPaid ? '#dcfce7' : '#e0f2fe';
        badge.style.color = isPaid ? '#15803d' : '#0369a1';
    }
        const cutoff = rangeDays === 0 ? 0 : Date.now() - (rangeDays * 86400000);

    try {
        const snap = await firebase.database().ref('providers/' + username + '/orders').once('value');
        const data = snap.val() || {};
        const allOrders = Object.entries(data).map(([id, o]) => ({ id, ...o }));
        const orders = allOrders.filter(o => (o.createdAt || 0) >= cutoff);

        const completed = orders.filter(o => o.status === 'completed');
        const inProgress = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
        const cancelled = orders.filter(o => o.status === 'cancelled');

        
        const lineTotal = o => (Number(o.itemPrice) || 0) * (Number(o.quantity) || 1);
        const totalSales = completed.reduce((sum, o) => sum + lineTotal(o), 0);
        const totalSalesCurrency = proCurrency;

        document.getElementById('mb-sales-total').textContent = formatPrice(totalSales, totalSalesCurrency);                                                            document.getElementById('mb-sales-total-sub').textContent = `${completed.length} completed order${completed.length === 1 ? '' : 's'}`;        
        document.getElementById('mb-sales-total-orders').textContent = orders.length;
        document.getElementById('mb-sales-completed').textContent = completed.length;
        document.getElementById('mb-sales-progress').textContent = inProgress.length;
        document.getElementById('mb-sales-cancelled').textContent = cancelled.length;

        // Revenue trend chart — last 14 days
        const chartDays = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setHours(0,0,0,0);
            d.setDate(d.getDate() - i);
            const dayStart = d.getTime();
            const dayEnd = dayStart + 86400000;
            const dayRevenue = allOrders
                .filter(o => o.status === 'completed' && (o.createdAt||0) >= dayStart && (o.createdAt||0) < dayEnd)
                .reduce((sum, o) => sum + lineTotal(o), 0);
            chartDays.push({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), revenue: dayRevenue });
        }
        const maxRevenue = Math.max(1, ...chartDays.map(d => d.revenue));
        const chartEl = document.getElementById('mb-sales-chart');
        const chartLockEl = document.getElementById('mb-sales-chart-lock');
        if (!isPaid) {
            chartEl.style.filter = 'blur(4px)';
            chartEl.style.pointerEvents = 'none';
            chartLockEl.style.display = 'flex';
            chartLockEl.innerHTML = mbLockOverlayHTML();
        } else {
            chartEl.style.filter = 'none';
            chartEl.style.pointerEvents = 'auto';
            chartLockEl.style.display = 'none';
        }
        chartEl.innerHTML = chartDays.map(d => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                <div style="width:100%;max-width:16px;height:${Math.max(4, (d.revenue / maxRevenue) * 90)}px;background:linear-gradient(180deg,#3b82f6,#1d4ed8);border-radius:4px 4px 1px 1px;"></div>
                <div style="font-size:8px;color:#94a3b8;writing-mode:vertical-rl;transform:rotate(180deg);height:32px;">${d.label}</div>
            </div>`).join('');

        // Top selling items (by qty, among completed orders)
        const itemStats = {};
        completed.forEach(o => {
            const key = o.itemName || 'Unknown';
            if (!itemStats[key]) itemStats[key] = { qty: 0, revenue: 0, currency: '' };
            itemStats[key].qty += Number(o.quantity) || 1;
            itemStats[key].revenue += lineTotal(o);
            if (!itemStats[key].currency) itemStats[key].currency = proCurrency; 
        });
        const topItems = Object.entries(itemStats).sort((a,b) => b[1].qty - a[1].qty).slice(0, 5);

        const topItemsEl = document.getElementById('mb-top-items');
        const topLockEl = document.getElementById('mb-top-items-lock');
        if (!isPaid) {
            topItemsEl.style.filter = 'blur(4px)';
            topItemsEl.style.pointerEvents = 'none';
            topLockEl.style.display = 'flex';
            topLockEl.innerHTML = mbLockOverlayHTML();
        } else {
            topItemsEl.style.filter = 'none';
            topItemsEl.style.pointerEvents = 'auto';
            topLockEl.style.display = 'none';
        }
        topItemsEl.innerHTML = topItems.length === 0
            ? `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">No completed sales yet</div>`
            : topItems.map(([name, stat], i) => `
                <div style="background:#ffffff;border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                    <div style="width:26px;height:26px;border-radius:50%;background:#fff7ed;color:#ea580c;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">${i+1}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:13px;color:#1e293b;">${name}</div>
                        <div style="font-size:11px;color:#64748b;">${stat.qty} sold</div>
                    </div>
                   <div style="font-weight:800;font-size:13px;color:#ea580c;flex-shrink:0;">${formatPrice(stat.revenue, stat.currency)}</div>                 
                </div>`).join('');

        // Recent transactions (completed, most recent first)
        const recent = completed.sort((a,b) => (b.createdAt||0) - (a.createdAt||0)).slice(0, 10);
        const recentEl = document.getElementById('mb-recent-transactions');
        const recentLockEl = document.getElementById('mb-recent-tx-lock');
        if (!isPaid) {
            recentEl.style.filter = 'blur(4px)';
            recentEl.style.pointerEvents = 'none';
            recentLockEl.style.display = 'flex';
            recentLockEl.innerHTML = mbLockOverlayHTML();
        } else {
            recentEl.style.filter = 'none';
            recentEl.style.pointerEvents = 'auto';
            recentLockEl.style.display = 'none';
        }
        recentEl.innerHTML = recent.length === 0
            ? `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">No transactions yet</div>`
            : recent.map(o => `
                <div style="background:#ffffff;border-radius:14px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                    <div>
                        <div style="font-weight:700;font-size:13px;color:#1e293b;">${o.itemName || '—'}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:2px;">@${o.customerUsername || 'customer'} · ${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : ''}</div>
                    </div>
                    <div style="font-weight:800;font-size:13px;color:#16a34a;">+${formatPrice(lineTotal(o), o.currency)}</div>
                </div>`).join('');

    } catch (err) {
        showGlobalToast('❌ Failed to load sales: ' + err.message);
    }
}
let mbApprovedProviderData = null;

function mbLockOverlayHTML() {
    return `
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(255,255,255,0.4);backdrop-filter:blur(2px);border-radius:14px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#0f172a;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;">🔒</div>
            <button onclick="mbOpenUpgradeModal()" style="background:#0f172a;color:#ffffff;border:none;border-radius:20px;padding:9px 18px;font-size:12px;font-weight:800;cursor:pointer;">Upgrade to unlock</button>
        </div>`;
}

async function checkProviderApprovalStatus() {
    const username = localStorage.getItem("nexus_user_session");
    if (!username) return;
    try {
        const snap = await firebase.database().ref('providers/' + username).once('value');
        const data = snap.val();
        const btnLabel = document.getElementById('post-service-btn-label');
        if (data && data.status === 'approved') {
            mbApprovedProviderData = data;
            btnLabel.textContent = 'My Business';
        } else {
            mbApprovedProviderData = null;
            btnLabel.textContent = 'Post Your Service';
        }
    } catch (err) {
        console.warn('Could not check provider status:', err.message);
    }
}

function handlePostServiceBtnClick() {
    if (mbApprovedProviderData) {
        openMyBusinessDashboard();
    } else {
        openPostServiceSheet();
    }
    }


const MB_PLANS = [
    {
        id: 'free', name: 'Free', price: 0, tagline: 'Get online in minutes',
        features: ['Unlimited menu items', 'Order management', 'Basic sales overview', 'Customer chat'],
        locked: ['Top Selling Items', 'Recent Transactions', 'Revenue Chart']
    },
    {
        id: 'pro', name: 'Pro', price: 9, badge: 'Most Popular', tagline: 'For growing businesses',
        features: ['Everything in Free', 'Top Selling Items', 'Recent Transactions', 'Revenue Chart', 'Priority support'],
        locked: []
    },
    {
        id: 'max', name: 'Max', price: 19, badge: 'Best Value', tagline: 'For established businesses',
        features: ['Everything in Pro', 'Multi-category dashboard', 'Advanced customer insights', 'Featured placement in search', 'Dedicated account manager'],
        locked: []
    },
];

let mbBillingPeriod = 'monthly';
let mbCachedCurrentPlan = 'free';

function mbPeriodPrice(monthlyPrice, period) {
    if (monthlyPrice === 0) return { perMonth: 0, billedNote: 'Free forever' };
    if (period === 'quarterly') {
        const perMonth = monthlyPrice * 0.9;
        return { perMonth, billedNote: `Billed $${(perMonth * 3).toFixed(2).replace(/\.00$/, '')} every 3 months` };
    }
    if (period === 'yearly') {
        const perMonth = monthlyPrice * 0.6;
        return { perMonth, billedNote: `Billed $${(perMonth * 12).toFixed(2).replace(/\.00$/, '')} yearly` };
    }
    return { perMonth: monthlyPrice, billedNote: `Billed $${monthlyPrice.toFixed(2).replace(/\.00$/, '')} monthly` };
}

function mbRenderCurrentPlanCard(currentPlan) {
    const plan = MB_PLANS.find(p => p.id === currentPlan) || MB_PLANS[0];
    document.getElementById('mb-current-plan-card').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;">Current Plan</span>
            <span style="background:rgba(16,185,129,0.12);color:var(--np-green,#10b981);font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;">● Active</span>
        </div>
        <div style="font-size:19px;font-weight:900;color:#ffffff;margin-bottom:8px;">${plan.name}</div>
        <div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:8px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;color:rgba(255,255,255,0.45);font-weight:700;">Status</span>
            <span style="font-size:12px;color:#ffffff;font-weight:700;">${plan.id === 'free' ? 'No renewal (Free plan)' : 'Renews ' + mbBillingPeriod}</span>
        </div>`;
}

function mbRenderPlanCards() {
    document.querySelectorAll('.mb-billing-toggle-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.period === mbBillingPeriod));

    document.getElementById('mb-plan-cards').innerHTML = MB_PLANS.map(plan => {
        const isCurrent = plan.id === mbCachedCurrentPlan;
        const isFree = plan.id === 'free';
        const { perMonth, billedNote } = mbPeriodPrice(plan.price, mbBillingPeriod);
        const priceLabel = plan.price === 0 ? 'Free' : '$' + perMonth.toFixed(2).replace(/\.00$/, '');
        return `
        <div class="mb-glass-card" style="border-radius:20px;padding:22px;position:relative;${plan.badge ? 'border-color:var(--np-amber,#f59e0b) !important;' : ''}">
            ${plan.badge ? `<div style="position:absolute;top:-11px;left:20px;background:var(--np-amber,#f59e0b);color:#0f172a;font-size:10px;font-weight:900;padding:4px 12px;border-radius:20px;letter-spacing:0.3px;">${plan.badge.toUpperCase()}</div>` : ''}
            <div style="font-size:17px;font-weight:900;color:#ffffff;">${plan.name}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:14px;">${plan.tagline}</div>
            <div style="font-size:28px;font-weight:900;color:#ffffff;">${priceLabel}<span style="font-size:12px;color:rgba(255,255,255,0.4);font-weight:600;"> ${plan.price === 0 ? '' : '/mo'}</span></div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:16px;">${billedNote}</div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
                ${plan.features.map(f => `<div style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:rgba(255,255,255,0.8);"><span style="color:var(--np-green,#10b981);flex-shrink:0;">✓</span>${f}</div>`).join('')}
            </div>
            <button ${isCurrent ? 'disabled' : ''} onclick="mbSelectPlan('${plan.id}', ${perMonth})"
                style="width:100%;padding:13px;border-radius:12px;border:none;font-weight:800;font-size:13px;cursor:${isCurrent ? 'default' : 'pointer'};background:${isCurrent ? 'rgba(255,255,255,0.1)' : (plan.badge ? 'var(--np-amber,#f59e0b)' : '#ffffff')};color:${isCurrent ? 'rgba(255,255,255,0.5)' : '#0f172a'};">
                ${isCurrent ? 'Current Plan' : (isFree ? 'Downgrade' : 'Upgrade to ' + plan.name)}
            </button>
        </div>`;
    }).join('');
}

function mbSetBillingPeriod(period) {
    mbBillingPeriod = period;
    mbRenderPlanCards();
    mbRenderCurrentPlanCard(mbCachedCurrentPlan);
}

async function mbOpenUpgradeModal() {
    const username = localStorage.getItem("nexus_user_session");
    const snap = await firebase.database().ref('providers/' + username + '/plan').once('value');
    mbCachedCurrentPlan = snap.val() || 'free';
    mbBillingPeriod = 'monthly';

    mbRenderCurrentPlanCard(mbCachedCurrentPlan);
    mbRenderPlanCards();

    document.getElementById('mb-upgrade-page').style.display = 'flex';
}

function mbCloseUpgradeModal() {
    document.getElementById('mb-upgrade-page').style.display = 'none';
    }

function mbSelectPlan(planId, price) {
    if (planId === 'free') {
        mbConfirmPlanChange('free');
        return;
    }
    showGlobalToast('⚠️ Payment gateway not connected yet.');
}

async function mbConfirmPlanChange(planId) {
    const username = localStorage.getItem("nexus_user_session");
    try {
        await firebase.database().ref('providers/' + username + '/plan').set(planId);
        showGlobalToast('✅ Plan updated to ' + planId.toUpperCase());
        mbCloseUpgradeModal();
        mbLoadSales();
    } catch (err) {
        showGlobalToast('❌ Failed: ' + err.message);
    }
}

async function mbGenerateAndUploadFlyer(username, data) {
    const categories = data.categories || {};
    const allItems = [];
    Object.keys(categories).forEach(cat => {
        const items = categories[cat].items || {};
        Object.keys(items).forEach(id => allItems.push(items[id]));
    });
    if (allItems.length === 0) return null;

    document.getElementById('mb-flyer-avatar').textContent = (data.businessName || username).charAt(0).toUpperCase();
    document.getElementById('mb-flyer-business-name').textContent = data.businessName || username;
    document.getElementById('mb-flyer-category').textContent = data.categoryLabel || '';

    const gridItems = allItems.slice(0, 6);
    document.getElementById('mb-flyer-grid').innerHTML = gridItems.map(item => {
    const priceLabel = item.pricingType === 'tiered'
            ? 'From ' + formatPrice(Math.min(...item.tiers.map(t => t.price)), item.currency)
            : formatPrice(Number(item.price || 0), item.currency);   
    return `
        <div style="background:#fff7ed;border-radius:20px;padding:20px;text-align:center;">
            <div style="font-size:56px;margin-bottom:10px;">${item.icon || '🍽️'}</div>
            <div style="font-size:18px;font-weight:800;color:#78350f;margin-bottom:4px;">${item.name}</div>
            <div style="font-size:20px;font-weight:900;color:#ea580c;">${priceLabel}</div>
        </div>`;
    }).join('');

    const captureEl = document.getElementById('mb-flyer-capture');
    if (typeof html2canvas === 'undefined') {
        await nxLazyLoadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }
   const canvas = await html2canvas(captureEl, { scale: 2, useCORS: true, backgroundColor: null });
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));

    const formData = new FormData();
    formData.append('file', blob, username + '_flyer.png');
    formData.append('type', 'menu_flyers');
    formData.append('username', username);

    const uploadRes = await fetch('https://oryzon-backend-ed1q.onrender.com/upload', {
        method: 'POST',
        body: formData
    });
    const uploadData = await uploadRes.json();
    if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');

    await firebase.database().ref('providers/' + username).update({
        menuImageUrl: uploadData.url,
        menuImageUpdatedAt: Date.now()
    });

    return uploadData.url;
}

async function mbRefreshCategoriesData() {
    const username = localStorage.getItem("nexus_user_session");
    const snap = await firebase.database().ref('providers/' + username + '/categories').once('value');
    const categories = snap.val() || {};
    mbAllItems = [];
    Object.keys(categories).forEach(catKey => {
        const catItems = categories[catKey].items || {};
        Object.keys(catItems).forEach(itemKey => {
            mbAllItems.push({ id: itemKey, category: catKey, ...catItems[itemKey] });
        });
    });
    mbRenderCategoryPills(Object.keys(categories));
    mbRenderMenuList();
}

function mbOpenCategoryManager() {
    document.getElementById('mb-category-manager-overlay').style.display = 'flex';
    mbRenderCategoryManagerList();
}

function mbCloseCategoryManager() {
    document.getElementById('mb-category-manager-overlay').style.display = 'none';
}

function mbRenderCategoryManagerList() {
    const list = document.getElementById('mb-category-manager-list');
    const categories = [...new Set(mbAllItems.map(i => i.category))];
    if (categories.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.5);font-size:12px;">No categories yet. Add an item to create one.</div>`;
        return;
    }
    list.innerHTML = categories.map(cat => {
        const count = mbAllItems.filter(i => i.category === cat).length;
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.11);border-radius:12px;padding:12px 14px;margin-bottom:8px;">
            <div>
                <div style="font-size:13.5px;font-weight:700;color:#ffffff;">${cat}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">${count} item${count === 1 ? '' : 's'}</div>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="mbRenameCategoryAction('${cat}')" style="width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.1);color:#ffffff;font-size:14px;cursor:pointer;">✏️</button>
                <button onclick="mbDeleteCategoryAction('${cat}')" style="width:32px;height:32px;border-radius:9px;border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.12);color:#f87171;font-size:14px;cursor:pointer;">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

async function mbRenameCategoryAction(oldName) {
    const newName = prompt('Rename category:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const trimmed = newName.trim();
    const username = localStorage.getItem("nexus_user_session");
    try {
        const oldRef = firebase.database().ref('providers/' + username + '/categories/' + oldName + '/items');
        const snap = await oldRef.once('value');
        const items = snap.val() || {};
        const newRef = firebase.database().ref('providers/' + username + '/categories/' + trimmed + '/items');
        for (const [itemId, itemData] of Object.entries(items)) {
            await newRef.child(itemId).set(itemData);
        }
        await firebase.database().ref('providers/' + username + '/categories/' + oldName).remove();
        showGlobalToast('✅ Category renamed');
        await mbRefreshCategoriesData();
        mbRenderCategoryManagerList();
    } catch (err) {
        showGlobalToast('❌ Rename failed: ' + err.message);
    }
}

async function mbDeleteCategoryAction(name) {
    const count = mbAllItems.filter(i => i.category === name).length;
    if (!confirm(`Delete "${name}" and all ${count} item(s) inside it? This cannot be undone.`)) return;
    const username = localStorage.getItem("nexus_user_session");
    try {
        await firebase.database().ref('providers/' + username + '/categories/' + name).remove();
        showGlobalToast('✅ Category deleted');
        await mbRefreshCategoriesData();
        mbRenderCategoryManagerList();
    } catch (err) {
        showGlobalToast('❌ Delete failed: ' + err.message);
    }
}
const MB_THEME_COLORS = ['#64748b', '#1e3a8a', '#0ea5e9', '#166534', '#65780a', '#f59e0b', '#ea580c', '#a855f7', '#312e81', '#be185d', '#eab308', '#b91c1c', '#92400e', '#0d9488', '#1d4ed8', '#22c55e'];
async function mbOpenCustomizeModal() {
    const username = localStorage.getItem("nexus_user_session");
    const snap = await firebase.database().ref('providers/' + username).once('value');
    const data = snap.val() || {};
    const currentColor = data.color || MB_THEME_COLORS[0];

    const isCustom = !MB_THEME_COLORS.includes(currentColor);
    document.getElementById('mb-customize-swatches').innerHTML = MB_THEME_COLORS.map(c => `
        <button onclick="mbSelectThemeColor('${c}')" style="width:38px;height:38px;border-radius:50%;background:${c};border:${c === currentColor ? '3px solid #0f172a' : '3px solid transparent'};box-shadow:0 0 0 1.5px ${c === currentColor ? c : 'transparent'};cursor:pointer;"></button>
    `).join('') + `
        <button onclick="document.getElementById('mb-native-color-input').click()" style="width:38px;height:38px;border-radius:50%;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);border:${isCustom ? '3px solid #0f172a' : '3px solid transparent'};box-shadow:0 0 0 1.5px ${isCustom ? currentColor : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <span style="background:#ffffff;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#334155;font-weight:900;">+</span>
        </button>
        <input type="color" id="mb-native-color-input" value="${isCustom ? currentColor : '#1d4ed8'}" oninput="mbSelectThemeColor(this.value)" style="position:absolute;width:0;height:0;opacity:0;pointer-events:none;">
    `;

    const preview = document.getElementById('mb-customize-cover-preview');
    if (data.coverImageUrl) {
        preview.style.backgroundImage = `url('${data.coverImageUrl}')`;
        preview.textContent = '';
    } else {
        preview.style.backgroundImage = '';
        preview.textContent = 'No cover photo set';
    }

    document.getElementById('mb-customize-overlay').style.display = 'flex';
}

function mbCloseCustomizeModal() {
    document.getElementById('mb-customize-overlay').style.display = 'none';
}

async function mbSelectThemeColor(hex) {
    const username = localStorage.getItem("nexus_user_session");
    try {
        if (typeof guaranteeAuth === 'function') await guaranteeAuth();
        await firebase.database().ref('providers/' + username + '/color').set(hex);
        showGlobalToast('✅ Accent color updated');
        mbOpenCustomizeModal();
    } catch (err) {
        showGlobalToast('❌ Failed: ' + err.message);
    }
}

async function mbUploadCoverPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const username = localStorage.getItem("nexus_user_session");
    showGlobalToast('⏳ Uploading cover photo...');
    try {
        if (typeof guaranteeAuth === 'function') await guaranteeAuth();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'cover_photos');
        formData.append('username', username);
        const res = await fetch('https://oryzon-backend-ed1q.onrender.com/upload', { method: 'POST', body: formData });
        const data = await res.json();
        await firebase.database().ref('providers/' + username + '/coverImageUrl').set(data.url);
        showGlobalToast('✅ Cover photo updated');
        mbOpenCustomizeModal();
    } catch (err) {
        showGlobalToast('❌ Upload failed: ' + err.message);
    }
    }
const MB_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const MB_DAY_LABELS = {monday:'Monday',tuesday:'Tuesday',wednesday:'Wednesday',thursday:'Thursday',friday:'Friday',saturday:'Saturday',sunday:'Sunday'};

function mbTimeOptions(selected) {
    let opts = '';
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const val = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
            const label = new Date(2000,0,1,h,m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            opts += '<option value="' + val + '" ' + (val === selected ? 'selected' : '') + '>' + label + '</option>';
        }
    }
    return opts;
}

function mbRenderOperatingHoursRows(hoursData) {
    const list = document.getElementById('bs-hours-list');
    list.innerHTML = MB_DAYS.map(function(day) {
        const d = hoursData[day] || { enabled: true, open: '08:00', close: '18:00' };
        return '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid #f1f5f9;">' +
            '<input type="checkbox" id="bs-hours-enabled-' + day + '" ' + (d.enabled ? 'checked' : '') + ' style="width:18px;height:18px;flex-shrink:0;">' +
            '<div style="width:78px;font-size:12.5px;font-weight:700;color:#334155;flex-shrink:0;">' + MB_DAY_LABELS[day] + '</div>' +
            '<select id="bs-hours-open-' + day + '" style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:7px 6px;font-size:12px;">' + mbTimeOptions(d.open) + '</select>' +
            '<span style="font-size:11px;color:#94a3b8;">to</span>' +
            '<select id="bs-hours-close-' + day + '" style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:7px 6px;font-size:12px;">' + mbTimeOptions(d.close) + '</select>' +
            '</div>';
    }).join('');
}

async function mbOpenBusinessSettings() {
    const username = localStorage.getItem("nexus_user_session");
    if (!username) { showGlobalToast('⚠️ Please login again.'); return; }
    document.getElementById('my-business-overlay').style.display = 'none';
    document.getElementById('mb-business-settings-overlay').style.display = 'flex';

    const snap = await firebase.database().ref('providers/' + username).once('value');
    const data = snap.val() || {};

    document.getElementById('bs-phone').value = data.phone || '';
    document.getElementById('bs-email').value = data.email || '';
    document.getElementById('bs-website').value = data.website || '';
    document.getElementById('bs-country').value = data.country || '';
    document.getElementById('bs-state').value = data.state || '';
    document.getElementById('bs-city').value = data.city || '';
    document.getElementById('bs-address').value = data.address || '';

    const currBtn = document.getElementById('bs-currency');
    currBtn.dataset.currency = data.currency || '';
    currBtn.innerHTML = data.currency
        ? (getCurrencySymbol(data.currency) + ' ' + data.currency + ' <span style="float:right;opacity:0.5;">▾</span>')
        : '🌍 Select Currency <span style="float:right;opacity:0.5;">▾</span>';

    mbRenderOperatingHoursRows(data.operatingHours || {});

    const socials = data.socials || {};
    document.getElementById('bs-whatsapp').value = socials.whatsapp || '';
    document.getElementById('bs-instagram').value = socials.instagram || '';
    document.getElementById('bs-facebook').value = socials.facebook || '';
    document.getElementById('bs-twitter').value = socials.twitter || '';
    document.getElementById('bs-youtube').value = socials.youtube || '';
    document.getElementById('bs-linkedin').value = socials.linkedin || '';
    document.getElementById('bs-tiktok').value = socials.tiktok || '';
}

function mbCloseBusinessSettings() {
    document.getElementById('mb-business-settings-overlay').style.display = 'none';
    document.getElementById('my-business-overlay').style.display = 'flex';
}

async function mbSaveBusinessSettings() {
    const username = localStorage.getItem("nexus_user_session");
    const btn = document.getElementById('bs-save-btn');
    btn.textContent = '⏳ Saving...';
    btn.disabled = true;

    const operatingHours = {};
    MB_DAYS.forEach(function(day) {
        operatingHours[day] = {
            enabled: document.getElementById('bs-hours-enabled-' + day).checked,
            open: document.getElementById('bs-hours-open-' + day).value,
            close: document.getElementById('bs-hours-close-' + day).value
        };
    });

    const payload = {
        phone: document.getElementById('bs-phone').value.trim(),
        email: document.getElementById('bs-email').value.trim(),
        website: document.getElementById('bs-website').value.trim(),
        country: document.getElementById('bs-country').value.trim(),
        state: document.getElementById('bs-state').value.trim(),
        city: document.getElementById('bs-city').value.trim(),
        address: document.getElementById('bs-address').value.trim(),
        currency: document.getElementById('bs-currency').dataset.currency || '',
        operatingHours: operatingHours,
        socials: {
            whatsapp: document.getElementById('bs-whatsapp').value.trim(),
            instagram: document.getElementById('bs-instagram').value.trim(),
            facebook: document.getElementById('bs-facebook').value.trim(),
            twitter: document.getElementById('bs-twitter').value.trim(),
            youtube: document.getElementById('bs-youtube').value.trim(),
            linkedin: document.getElementById('bs-linkedin').value.trim(),
            tiktok: document.getElementById('bs-tiktok').value.trim()
        }
    };

    try {
        if (typeof guaranteeAuth === 'function') await guaranteeAuth();
        await firebase.database().ref('providers/' + username).update(payload);
        showGlobalToast('✅ Business settings saved');
        mbCloseBusinessSettings();
    } catch (err) {
        showGlobalToast('❌ Save failed: ' + err.message);
    } finally {
        btn.textContent = 'Save All Changes';
        btn.disabled = false;
    }
    }
const MB_FAQS = [
    { q: 'How do I get paid for orders?', a: 'Customers pay you directly based on the contact method you set up. Nexus does not process payments on your behalf yet — coordinate payment details with each customer directly.' },
    { q: 'How do I make my profile visible to customers?', a: 'Go to Overview and tap "Publish" on the orange banner, or use the Publish button at the top of your dashboard. Your profile stays hidden from customers until you publish it.' },
    { q: 'What is the difference between Orders and Bookings?', a: 'Orders come from your Menu/Place Order flow — usually immediate purchases. Bookings come from the "Hire Expert" flow — customers requesting a job for a specific date.' },
    { q: 'How do I change my currency?', a: 'Open Business (Quick Actions) → Location & Currency → tap the Currency field to select your preferred currency.' },
    { q: 'Why is my Profile Health score low?', a: 'Complete each item in the "Complete Your Setup" checklist on your Overview tab — business info, menu items, payment method, and publishing your menu.' },
    { q: 'How do repeat customers work?', a: 'Open the Customers tab to see everyone who has ordered or booked you. Anyone with more than one order or booking is tagged "REPEAT".' }
];

function mbOpenHelpModal() {
    const list = document.getElementById('mb-faq-list');
    list.innerHTML = MB_FAQS.map((f, i) => `
        <div style="background:#ffffff;border-radius:14px;margin-bottom:8px;overflow:hidden;">
            <button onclick="mbToggleFaq(${i})" style="width:100%;text-align:left;background:none;border:none;padding:14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-family:inherit;">
                <span style="font-size:12.5px;font-weight:700;color:#1e293b;">${f.q}</span>
                <span id="mb-faq-arrow-${i}" style="font-size:11px;color:#94a3b8;transition:transform 0.2s ease;flex-shrink:0;margin-left:8px;">▾</span>
            </button>
            <div id="mb-faq-answer-${i}" style="display:none;padding:0 14px 14px;font-size:12px;color:#64748b;line-height:1.5;">${f.a}</div>
        </div>`).join('');
    document.getElementById('mb-help-overlay').style.display = 'flex';
}

function mbToggleFaq(i) {
    const answer = document.getElementById('mb-faq-answer-' + i);
    const arrow = document.getElementById('mb-faq-arrow-' + i);
    const isOpen = answer.style.display === 'block';
    answer.style.display = isOpen ? 'none' : 'block';
    arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

const MB_WHATS_NEW = [
    { date: 'August 2026', tag: 'NEW', title: 'Reviews & Gallery tabs', body: 'Monitor all your customer reviews in one place, and manage your portfolio photos directly from your dashboard.' },
    { date: 'August 2026', tag: 'NEW', title: 'Business Settings', body: 'Set your contact details, operating hours, location, currency, and social media links — all in one dedicated page.' },
    { date: 'August 2026', tag: 'IMPROVED', title: 'Sales & Orders upgrades', body: 'Sales now shows a 14-day revenue trend chart. Orders now has search so you can find any order instantly.' },
    { date: 'August 2026', tag: 'NEW', title: 'Bookings & Insights', body: 'Track job requests with due dates so you never miss one, and see how many people are viewing your profile.' },
    { date: 'July 2026', tag: 'NEW', title: 'Customer profiles', body: 'See everyone who has ordered or booked you, with repeat-customer badges and total spend.' }
];

function mbOpenWhatsNewModal() {
    const list = document.getElementById('mb-whatsnew-list');
    list.innerHTML = MB_WHATS_NEW.map(item => {
        const tagColor = item.tag === 'NEW' ? '#16a34a' : '#2563eb';
        return `
        <div style="display:flex;gap:12px;margin-bottom:18px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${tagColor};margin-top:6px;flex-shrink:0;"></div>
            <div style="flex:1;">
                <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${item.date}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                    <span style="font-size:9px;font-weight:800;color:${tagColor};background:${tagColor}1a;padding:2px 7px;border-radius:6px;">${item.tag}</span>
                    <div class="mb-heading-brand" style="font-size:13.5px;font-weight:800;color:#1e293b;">${item.title}</div>
                </div>
                <div style="font-size:12px;color:#64748b;line-height:1.5;">${item.body}</div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('mb-whatsnew-overlay').style.display = 'flex';
}

function mbOpenAddCategory() {
    document.getElementById('mb-inp-new-category').value = '';
    document.getElementById('mb-add-category-overlay').style.display = 'flex';
}
function mbCloseAddCategory() {
    document.getElementById('mb-add-category-overlay').style.display = 'none';
}
function mbSaveNewCategory() {
    const name = document.getElementById('mb-inp-new-category').value.trim();
    if (!name) return;
    mbCloseAddCategory();
    document.getElementById('mb-inp-category').value = name;
    mbOpenAddItem();
    document.getElementById('mb-inp-category').value = name;
    }
function openOrderConfirm(itemName, itemPrice) {
    orderDraft.itemName = itemName;
    orderDraft.itemPrice = itemPrice;
    document.getElementById('order-confirm-item-name').textContent = itemName;
    document.getElementById('order-confirm-overlay').style.display = 'flex';
}

// REPLACE: closeOrderConfirm() function
function closeOrderConfirm() {
    document.getElementById('order-confirm-overlay').style.display = 'none';
    
    if (orderDraft.fromStory) {
        orderDraft.fromStory = false;
        state.isStoryPaused = false;
        startStoryInterval();
    }
}
    
// REPLACE: confirmOrderYes() function
function confirmOrderYes() {
    document.getElementById('order-confirm-overlay').style.display = 'none';

    const wasFromStory = orderDraft.fromStory;
    orderDraft.fromStory = false;

    let activePro = null;
    let activeItemName = null;
    let activeItemPrice = null;
    let activeItemCurrency = '';

    if (window._snacksOrderActive) {
        activePro = currentSnacksMenuPro;
        activeItemName = snacksOrderDraft.itemName;
        activeItemPrice = snacksOrderDraft.itemPrice;
        activeItemCurrency = snacksOrderDraft.currency || '';
        window._snacksOrderActive = false;
    } else if (window._beveragesOrderActive) {
        activePro = currentBeveragesMenuPro;
        activeItemName = beveragesOrderDraft.itemName;
        activeItemPrice = beveragesOrderDraft.itemPrice;
        activeItemCurrency = beveragesOrderDraft.currency || '';
        window._beveragesOrderActive = false;
    } else {
        activePro = currentChefMenuPro;
        activeItemName = orderDraft.itemName;
        activeItemPrice = orderDraft.itemPrice;
        activeItemCurrency = orderDraft.currency || '';
    }

    document.getElementById('po-item-name').textContent = activeItemName || orderDraft.itemName;
    window._activePlaceOrderCurrency = activeItemCurrency;
    const activePriceNum = parseInt(String(activeItemPrice || orderDraft.itemPrice).replace(/[^\d]/g,'')) || 0;
    document.getElementById('po-item-price').textContent = formatPrice(activePriceNum, activeItemCurrency);
    document.getElementById('po-qty').value = 1;
    document.getElementById('po-address').value = '';
    document.getElementById('po-phone').value = '';
    document.getElementById('po-booking-date').value = '';
    document.getElementById('po-booking-time').value = '';

    window._activePlaceOrderPro = activePro;

    orderDraft.returnToStory = wasFromStory;

    document.getElementById('place-order-overlay').style.display = 'flex';
    updateOrderTotal();
}

function openPlaceOrderOverlay() {
    document.getElementById('po-item-name').textContent = orderDraft.itemName;
    window._activePlaceOrderCurrency = orderDraft.currency || '';
    const draftPriceNum = parseInt(String(orderDraft.itemPrice).replace(/[^\d]/g,'')) || 0;
    document.getElementById('po-item-price').textContent = formatPrice(draftPriceNum, orderDraft.currency);
    document.getElementById('po-qty').value = 1;
    document.getElementById('po-address').value = '';
    document.getElementById('po-phone').value = '';
    document.getElementById('po-booking-date').value = '';
    document.getElementById('po-booking-time').value = '';

    const pro = currentChefMenuPro;
    document.getElementById('po-vendor-bank').textContent = pro?.bankDetails?.bankName || 'Bank info not set';
    document.getElementById('po-vendor-acct').textContent = pro?.bankDetails?.accountNumber || '—';
    document.getElementById('po-vendor-acctname').textContent = pro?.bankDetails?.accountName || '';

    document.getElementById('place-order-overlay').style.display = 'flex';
}

// REPLACE: closePlaceOrderOverlay() function
function closePlaceOrderOverlay() {
    document.getElementById('place-order-overlay').style.display = 'none';
    document.getElementById('po-qty-row').style.display = '';
    window._activeCartOrder = null;
    
    if (orderDraft.returnToStory) {
        orderDraft.returnToStory = false;
        state.isStoryPaused = false;
        startStoryInterval();
    }
    }

function updateOrderTotal() {
    if (window._activeCartOrder) {
        const total = window._activeCartOrder.items.reduce((sum, i) => sum + (parseInt(String(i.price).replace(/[^\d]/g,'')) || 0) * i.qty, 0);
        document.getElementById('po-total-display').textContent = total > 0 ? formatPrice(total, window._activeCartOrder.items[0]?.currency) : '—';
        return;
    }
    const qty = parseInt(document.getElementById('po-qty').value) || 1;
    const priceText = document.getElementById('po-item-price').textContent || '';
    const priceNum = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
    const total = qty * priceNum;
    document.getElementById('po-total-display').textContent = total > 0 ? formatPrice(total, window._activePlaceOrderCurrency) : '—';
}
    
async function submitOrderRequestOnly() {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    const sessionUserCheck = localStorage.getItem('nexus_user_session') || 'guest';
    if (await isCustomerRestricted(sessionUserCheck)) return;

    const isCartOrder = !!window._activeCartOrder;
    const qty = isCartOrder ? null : (parseInt(document.getElementById('po-qty').value) || 1);
    const address = document.getElementById('po-address').value.trim();
    const phone = document.getElementById('po-phone').value.trim();
    const method = document.getElementById('po-method-delivery').dataset.active === 'true' ? 'delivery' : 'pickup';
    const bookingDate = document.getElementById('po-booking-date').value;
    const bookingTime = document.getElementById('po-booking-time').value;
    const scheduledFor = bookingDate ? `${bookingDate}T${bookingTime || '00:00'}` : null;
    if (method === 'delivery' && (!address || address.length < 5)) { showGlobalToast('⚠️ Enter delivery address!'); return; }
    if (!phone || phone.length < 7) { showGlobalToast('⚠️ Enter phone number!'); return; }
    if (method === 'delivery' && !validateDeliveryTimePreference()) return;

    const btn = document.getElementById('por-submit-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Sending Request...';

    try {
        const pro = window._activePlaceOrderPro || currentChefMenuPro;
        const sessionUser = localStorage.getItem('nexus_user_session') || 'guest';
        const requestId = `orderreq_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

        const requestPayload = isCartOrder ? {
            requestId,
            items: window._activeCartOrder.items.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
            itemName: window._activeCartOrder.items.map(i => `${i.qty}× ${i.name}`).join(', '),
            itemPrice: window._activeCartOrder.items.reduce((sum, i) => sum + (Number(i.price) || 0) * i.qty, 0),
            currency: window._activeCartOrder.items[0]?.currency || '',
            quantity: window._activeCartOrder.items.reduce((sum, i) => sum + i.qty, 0),
            fulfillmentMethod: method,
            address: method === 'delivery' ? address : null,
            phone,
            deliveryTimePreference: { ...deliveryTimePreference },
            scheduledFor,
            customerUsername: sessionUser,
            proName: pro?.name || '—',
            proId: String(pro?.id || ''),
            status: 'pending_vendor_review',
            createdAt: Date.now()
        } : {
            requestId,
            itemName: orderDraft.itemName,
            itemPrice: orderDraft.itemPrice,
            currency: orderDraft.currency || '',
            quantity: qty,
            fulfillmentMethod: method,
            address: method === 'delivery' ? address : null,
            phone,
            deliveryTimePreference: { ...deliveryTimePreference },
            scheduledFor,
            customerUsername: sessionUser,
            proName: pro?.name || '—',
            proId: String(pro?.id || ''),
            status: 'pending_vendor_review',
            createdAt: Date.now()
        };

        if (typeof firebase !== 'undefined' && firebase.database) {
            await firebase.database().ref(`providers/${pro.id}/orderRequests/${requestId}`).set(requestPayload);
            await firebase.database().ref(`customers/${sessionUser}/sentOrderRequests/${requestId}`).set(requestPayload);

            await firebase.database().ref(`providers/${pro.id}/notifications`).push({
                type: 'message',
                title: '📨 New Order Request',
                message: isCartOrder ? `New request: ${requestPayload.itemName} — awaiting your review` : `New request: ${qty}x ${orderDraft.itemName} — awaiting your review`,
                read: false,
                createdAt: Date.now()
            });
        }

        if (isCartOrder) {
            nxfmSaveCart(pro.id, []);
            window._activeCartOrder = null;
        }

        closePlaceOrderOverlay();
        showOrderStatusOverlay(pro.id, requestId);

    } catch (err) {
        console.error('Order request error:', err);
        showGlobalToast('❌ Error: ' + err.message);
    }
    
    btn.disabled = false;
    btn.textContent = '📨 Send Order Request';
}

// ── LOAD PRO PENDING ORDERS ──
async function loadProPendingOrders(proId) {
    const section = document.getElementById('pro-pending-orders-section');
    const list = document.getElementById('pro-pending-orders-list');
    if (!section || !list) return;

    const sessionUser = localStorage.getItem('nexus_user_session');

    // Only show to the pro themselves — kuma a ɓoye idan ba shi ba
    if (!sessionUser || String(proId) !== String(sessionUser)) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;
        const snap = await firebase.database().ref(`providers/${proId}/orders`).once('value');
        const data = snap.val() || {};

        const orders = Object.entries(data)
            .map(([id, o]) => ({ id, ...o }))
            .filter(o => o.status === 'pending')
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (orders.length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;background:#f8fafc;border-radius:12px;">No pending orders yet</div>`;
            return;
        }

        list.innerHTML = orders.map(o => `
            <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:14px;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                    <div>
                        <div style="font-size:13px;font-weight:800;color:#111827;">${o.itemName || '—'}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:2px;">Qty: ${o.quantity || 1} · ${o.itemPrice || '—'}</div>
                    </div>
                    <span style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#d97706;border-radius:8px;padding:3px 10px;font-size:10px;font-weight:800;">PENDING</span>
                </div>
                <div style="font-size:11px;color:#64748b;margin-bottom:4px;">📍 ${o.fulfillmentMethod === 'pickup' ? 'Self Pickup' : (o.address || '—')}</div>
                <div style="font-size:11px;color:#64748b;margin-bottom:10px;">📞 ${o.phone || '—'}</div>
                <div style="display:flex;gap:8px;">
                    <button onclick="updateOrderStatus('${proId}','${o.id}','confirmed')" style="flex:1;padding:8px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;">✅ Confirm</button>
                    <button onclick="updateOrderStatus('${proId}','${o.id}','cancelled')" style="flex:1;padding:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:10px;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;">✕ Cancel</button>
                </div>
            </div>`).join('');

    } catch(err) {
        console.error('Load pro orders error:', err);
        list.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">Failed to load orders</div>`;
    }
}

// ── UPDATE ORDER STATUS ──
async function updateOrderStatus(proId, orderId, newStatus) {
  if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }  
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;
        await firebase.database()
            .ref(`providers/${proId}/orders/${orderId}/status`)
            .set(newStatus);
        showGlobalToast(`✅ Order ${newStatus}!`);
        loadProPendingOrders(proId);
    } catch(err) {
        showGlobalToast('❌ Failed to update order.');
    }
}

// ── CUSTOMER ORDERS ──
async function openCustomerOrders() {
    document.getElementById('customer-orders-overlay').style.display = 'flex';
    const list = document.getElementById('customer-orders-list');
    const sessionUser = localStorage.getItem('nexus_user_session');

    if (!sessionUser) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Please login to view your orders</div>`;
        return;
    }

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;
        const snap = await firebase.database()
            .ref(`customers/${sessionUser}/sentRequests`)
            .once('value');
        const data = snap.val() || {};

        const orders = Object.entries(data)
            .map(([id, o]) => ({ id, ...o }))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (orders.length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">You have no orders yet</div>`;
            return;
        }

        const statusColor = { pending:'#d97706', confirmed:'#059669', cancelled:'#dc2626' };
        const statusBg = { pending:'rgba(245,158,11,0.1)', confirmed:'rgba(16,185,129,0.1)', cancelled:'rgba(239,68,68,0.1)' };

        list.innerHTML = orders.map(o => `
            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                    <div>
                        <div style="font-size:13px;font-weight:800;color:#ffffff;">${o.itemName || o.jobDescription || '—'}</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">${o.proName || '—'}</div>
                    </div>
                    <span style="background:${statusBg[o.status]||statusBg.pending};color:${statusColor[o.status]||statusColor.pending};border-radius:8px;padding:3px 10px;font-size:10px;font-weight:800;">${(o.status||'pending').toUpperCase()}</span>
                </div>
                <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:6px;">${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}</div>
            </div>`).join('');

    } catch(err) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:12px;">Failed to load orders</div>`;
    }
}

function closeCustomerOrders() {
    document.getElementById('customer-orders-overlay').style.display = 'none';
}

const ACTIVE_ORDER_STATUS_MAP = {
    pending:    { label: 'Pending',    color: '#fbbf24' },
    confirmed:  { label: 'Accepted',   color: '#3b82f6' },
    in_progress:{ label: 'In Progress',color: '#3b82f6' },
    ready:      { label: 'Ready',      color: '#22c55e' },
    completed:  { label: 'Completed',  color: '#22c55e' },
    cancelled:  { label: 'Cancelled',  color: '#ef4444' }
};
let activeOrdersListExpanded = false;

async function refreshActiveOrdersBanner() {
    const banner = document.getElementById('active-orders-banner');
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser || typeof firebase === 'undefined' || !firebase.database) { banner.style.display = 'none'; return; }
    try {
        const snap = await firebase.database().ref(`customers/${sessionUser}/sentRequests`).once('value');
        const data = snap.val() || {};
        const activeOrders = Object.entries(data)
            .map(([id, o]) => ({ id, ...o }))
            .filter(o => o.status !== 'cancelled' && o.status !== 'completed')
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (activeOrders.length === 0) { banner.style.display = 'none'; return; }
        banner.style.display = 'block';
        document.getElementById('active-orders-summary').textContent =
            activeOrders.length === 1 ? '1 Active Order' : `${activeOrders.length} Active Orders`;

        document.getElementById('active-orders-list').innerHTML = activeOrders.map(o => {
            const meta = ACTIVE_ORDER_STATUS_MAP[o.status] || ACTIVE_ORDER_STATUS_MAP.pending;
            return `<div class="active-order-row" onclick="openActiveOrderDetail('${o.proId||''}','${o.id}')">
                <div class="active-order-left">
                    <span class="active-order-name">${o.itemName || o.jobDescription || 'Service Request'}</span>
                    <span class="active-order-sub">${o.proName || ''}${o.eta ? ' · ' + o.eta : ''}</span>
                </div>
                <div style="display:flex;align-items:center;">
                    <span class="active-order-status-dot" style="background:${meta.color};"></span>
                    <span style="font-size:10px;font-weight:800;color:${meta.color};">${meta.label}</span>
                </div></div>`;
        }).join('');
    } catch (err) { console.warn('refreshActiveOrdersBanner error:', err); banner.style.display = 'none'; }
}

function toggleActiveOrdersList() {
    activeOrdersListExpanded = !activeOrdersListExpanded;
    const list = document.getElementById('active-orders-list');
    const chevron = document.getElementById('active-orders-chevron');
    list.classList.toggle('expanded', activeOrdersListExpanded);
    chevron.style.transform = activeOrdersListExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
}

function openActiveOrderDetail(proId, requestId) {
    if (proId && requestId) showOrderStatusOverlay(proId, requestId);
    else openCustomerOrders();
}

runOnServicesInit(() => { refreshActiveOrdersBanner(); });
    
// ── ALERT ADMIN ON NEW ORDER ──
async function alertAdminNewOrder(orderData) {
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const adminNotifId = `order_alert_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

        await firebase.database().ref(`admin/notifications/${adminNotifId}`).set({
            type: 'new_order',
            title: '🛒 New Order Placed',
            message: `${orderData.customerUsername || 'A customer'} ordered ${orderData.quantity || 1}x ${orderData.itemName || '—'} from ${orderData.proName || '—'}`,
            orderId: orderData.orderId || null,
            proId: orderData.proId || null,
            proName: orderData.proName || null,
            customerUsername: orderData.customerUsername || null,
            itemName: orderData.itemName || null,
            itemPrice: orderData.itemPrice || null,
            quantity: orderData.quantity || 1,
            fulfillmentMethod: orderData.fulfillmentMethod || 'delivery',
            address: orderData.address || null,
            phone: orderData.phone || null,
            read: false,
            createdAt: Date.now()
        });

    } catch(err) {
        console.warn('Admin alert failed:', err);
    }
}


// ── NOTIFY ME ENGINE ──
async function toggleNotifyMe() {
 if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }   
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) {
        showGlobalToast('⚠️ Please login first to enable notifications!');
        return;
    }

    if (!currentChefMenuPro) return;

    const proId = String(currentChefMenuPro.id);
    const btn = document.getElementById('notify-me-btn');

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const ref = firebase.database()
            .ref(`notify_subscribers/${proId}/${sessionUser}`);
        const snap = await ref.once('value');

        if (snap.exists()) {
            // Already subscribed — unsubscribe
            await ref.remove();
            btn.textContent = '🔔 Notify Me on Next Order Day';
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
            showGlobalToast('🔕 Notifications turned off.');
        } else {
            // Subscribe
            await ref.set({
                username: sessionUser,
                proId: proId,
                proName: currentChefMenuPro.name || '—',
                subscribedAt: Date.now()
            });
            btn.textContent = '✅ You will be notified!';
            btn.style.background = 'rgba(16,185,129,0.2)';
            btn.style.borderColor = 'rgba(16,185,129,0.4)';
            showGlobalToast('✅ You will be notified on the next order day!');
        }

    } catch(err) {
        console.warn('toggleNotifyMe error:', err);
        showGlobalToast('❌ Failed. Try again.');
    }
}

// ── CHECK NOTIFY ME STATUS ──
async function checkNotifyMeStatus() {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser || !currentChefMenuPro) return;

    const proId = String(currentChefMenuPro.id);
    const btn = document.getElementById('notify-me-btn');
    if (!btn) return;

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const snap = await firebase.database()
            .ref(`notify_subscribers/${proId}/${sessionUser}`)
            .once('value');

        if (snap.exists()) {
            btn.textContent = '✅ You will be notified!';
            btn.style.background = 'rgba(16,185,129,0.2)';
            btn.style.borderColor = 'rgba(16,185,129,0.4)';
        }
    } catch(err) {
        console.warn('checkNotifyMeStatus error:', err);
    }
}

// ── SEND NOTIFICATIONS TO SUBSCRIBERS ──
async function sendOrderDayNotifications(proId, proName, nextOrderDay) {
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const snap = await firebase.database()
            .ref(`notify_subscribers/${proId}`)
            .once('value');

        const subscribers = snap.val() || {};
        const usernames = Object.keys(subscribers);

        if (usernames.length === 0) return;

        // Send notification to each subscriber
        const promises = usernames.map(username =>
            firebase.database()
                .ref(`customers/${username}/notifications`)
                .push({
                    type: 'order_day_alert',
                    title: `🍽️ ${proName} is taking orders today!`,
                    message: `${proName} is currently available and taking orders. Place your order now before it closes!`,
                    proId: proId,
                    proName: proName,
                    read: false,
                    createdAt: Date.now()
                })
        );

        await Promise.all(promises);

        // Also send push notifications
        await Promise.all(usernames.map(username =>
            sendPushToUser(
                username,
                `🍽️ ${proName} is taking orders today!`,
                `Place your order now before it closes!`,
                { url: 'index.html' }
            )
        ));

        showGlobalToast(`✅ ${usernames.length} subscriber${usernames.length > 1 ? 's' : ''} notified!`);

    } catch(err) {
        console.warn('sendOrderDayNotifications error:', err);
    }
                                        }
    
// ── WELCOME MESSAGE EDIT ──
function renderChefMenuWelcomeArea(pro) {
    const headerTextWrap = document.querySelector('#chef-menu-overlay .chef-menu-header > div:first-child');
    if (!headerTextWrap) return;

    const welcomeText = pro.menuWelcome || `Welcome to ${pro.name} · ✨ Today's Live Menu`;

    if (!chefMenuEditMode) {
        headerTextWrap.innerHTML = `
            <div style="font-size: 10px; color: rgba(255,255,255,0.5); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${welcomeText}</div>
            <div class="chef-menu-title" id="chef-menu-pro-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pro.name}</div>`;
    } else {
        headerTextWrap.innerHTML = `
            <input type="text" id="chef-menu-welcome-input" class="chef-menu-welcome-input" value="${welcomeText.replace(/"/g,'&quot;')}" placeholder="Welcome message...">
            <div class="chef-menu-title" id="chef-menu-pro-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pro.name}</div>`;
    }
}

// ── SAVE EVERYTHING TO FIREBASE ──
async function saveChefMenuChanges() {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser || !chefMenuIsOwner) { showGlobalToast('⚠️ You do not have permission to do this!'); return; }

    const saveBtn = document.querySelector('.chef-menu-save-changes-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }

    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            await firebase.database().ref(`providers/${sessionUser}`).update({
                menu: currentChefMenuPro.menu,
                lastUpdated: Date.now()
            });
        }

       showGlobalToast('✅ Menu saved successfully!'); 
        toggleChefMenuEditMode();

    } catch (err) {
        console.error('Save menu error:', err);
        showGlobalToast('❌ Failed to save: ' + err.message);
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Save Menu Changes'; }
    }
}

// ════════════════════════════════════════════════════════════
//  📅 DAILY UPLOAD WINDOW ENGINE
// ════════════════════════════════════════════════════════════

const UPLOAD_WINDOW_CHECK_INTERVAL = 60000; // Duba kowane minti 1

function getNowNigeria() {
    // Nigeria = UTC+1
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 1));
}

function getTodayDayName() {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return days[getNowNigeria().getDay()];
}

function getCurrentHHMM() {
    const now = getNowNigeria();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    return `${h}:${m}`;
}

function isWithinBusinessHours(timeFrom, timeTo) {
    const now = getCurrentHHMM();
    return now >= timeFrom && now < timeTo;
}

function isProScheduledToday(proData) {
    const today = getTodayDayName();
    const schedule = proData.schedule || [];
    return schedule.some(d => d.toLowerCase().replace(/s$/,'') === today.toLowerCase());
}

// Main checker — runs every minute
function startUploadWindowChecker() {
    checkUploadWindow();
    setInterval(checkUploadWindow, UPLOAD_WINDOW_CHECK_INTERVAL);
}

async function checkUploadWindow() {
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) return;
    if (typeof firebase === 'undefined' || !firebase.database) return;

    try {
        const snap = await firebase.database().ref('providers/' + sessionUser).once('value');
        if (!snap.exists()) return;
        const proData = snap.val();

        const isChef = proData.category === 'chef';
        if (!isChef) return; // upload window chef kawai yanzu

        const scheduledToday = isProScheduledToday(proData);
        const timeFrom = proData.operatingHours?.from || null;
        const timeTo   = proData.operatingHours?.to   || null;

        if (!scheduledToday || !timeFrom || !timeTo) {
            hideUploadWindow();
            return;
        }

        const withinHours = isWithinBusinessHours(timeFrom, timeTo);

        if (withinHours) {
            await showUploadWindow(sessionUser, proData, timeFrom, timeTo);
            // Notify subscribers when upload window opens
            const today = getNowNigeria().toISOString().slice(0,10);
            const alreadyNotifiedSnap = await firebase.database()
                .ref(`notify_sent/${sessionUser}/${today}`)
                .once('value');
            if (!alreadyNotifiedSnap.exists()) {
                await sendOrderDayNotifications(sessionUser, proData.username || sessionUser, today);
                await firebase.database()
                    .ref(`notify_sent/${sessionUser}/${today}`)
                    .set(true);
            }
        } else {
    
            hideUploadWindow();
            await expireStories(sessionUser);
        }

    } catch(err) {
        console.warn('Upload window check failed:', err);
    }
}

async function expireStories(sessionUser) {
    // Mayar da active zuwa false kawai — KAR a cire uploads, domin za mu bukace su gobe
    try {
        const today = getNowNigeria().toISOString().slice(0,10);
        const ref = firebase.database().ref('daily_stories/' + sessionUser + '/' + today);
        const snap = await ref.once('value');
        if (snap.exists() && snap.val().active) {
            await ref.update({ active: false, expiredAt: Date.now() });
        }
    } catch(e) {
        console.warn('Story expire failed:', e);
    }
}

// ════════════════════════════════════════════════════════════
//  📸 UPLOAD WINDOW UI ENGINE
// ════════════════════════════════════════════════════════════

let uploadWindowState = {
    isVisible: false,
    previousUploads: [],
    sessionUser: null,
    proData: null
};

async function showUploadWindow(sessionUser, proData, timeFrom, timeTo) {
    uploadWindowState.sessionUser = sessionUser;
    uploadWindowState.proData = proData;

    // Check idan akwai previous uploads na yau
    const today = getNowNigeria().toISOString().slice(0,10);
    const snap = await firebase.database()
        .ref('daily_stories/' + sessionUser + '/' + today)
        .once('value');

    const todayData = snap.val();
    const hasPreviousUploads = todayData && todayData.uploads && todayData.uploads.length > 0;

    if (!uploadWindowState.isVisible) {
        uploadWindowState.isVisible = true;

        if (hasPreviousUploads) {
            uploadWindowState.previousUploads = todayData.uploads;
            showPreviousUploadsPrompt(proData, timeFrom, timeTo, todayData.uploads);
        } else {
            injectUploadSlotIntoProfile(proData, timeFrom, timeTo, false);
        }
    }
}

function hideUploadWindow() {
    uploadWindowState.isVisible = false;

    // Cire upload slot daga profile sheet
    const slot = document.getElementById('daily-upload-slot');
    if (slot) slot.remove();

    // Cire prompt idan yana can
    const prompt = document.getElementById('previous-uploads-prompt');
    if (prompt) prompt.remove();
}

// ── PREVIOUS UPLOADS PROMPT ──
function showPreviousUploadsPrompt(proData, timeFrom, timeTo, previousUploads) {
    // Cire idan yana can
    const existing = document.getElementById('previous-uploads-prompt');
    if (existing) existing.remove();

    const profileContent = document.querySelector('#profile-sheet-overlay > div:last-child');
    if (!profileContent) return;

    const prompt = document.createElement('div');
    prompt.id = 'previous-uploads-prompt';
    prompt.style.cssText = `
        margin-bottom: 24px;
        background: linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(190,24,93,0.05) 100%);
        border: 1px solid rgba(236,72,153,0.2);
        border-radius: 18px;
        padding: 16px;
        animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
    `;

    prompt.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#be185d;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
            📸 Today's Upload Window Active · ${timeFrom} – ${timeTo}
        </div>
        <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:12px;">
            Kana da uploads ${previousUploads.length} na yau. Shin kana son mu sake nuna su ko kana son ƙara sababbi?
        </div>
        <div style="display:flex;gap:8px;">
            <button onclick="usePreviousUploads()" style="flex:1;padding:10px;background:linear-gradient(135deg,#ec4899,#be185d);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;">
                ✅ Nuna Na Baya
            </button>
            <button onclick="startNewUpload('${timeFrom}','${timeTo}')" style="flex:1;padding:10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;color:#111827;font-size:12px;font-weight:800;cursor:pointer;">
                📷 Upload Sababbi
            </button>
        </div>
    `;

    // Saka kafin chef-schedule-section-card ko a farkon content
    const scheduleCard = document.getElementById('chef-schedule-section-card');
    if (scheduleCard && scheduleCard.parentNode) {
        scheduleCard.parentNode.insertBefore(prompt, scheduleCard);
    } else {
        profileContent.insertBefore(prompt, profileContent.firstChild);
    }
}

async function usePreviousUploads() {
    const { sessionUser, previousUploads } = uploadWindowState;
    const today = getNowNigeria().toISOString().slice(0,10);

    // Re-activate a Firebase (set active: true)
    await firebase.database()
        .ref('daily_stories/' + sessionUser + '/' + today)
        .update({ active: true, reusedAt: Date.now() });

    // Cire prompt
    const prompt = document.getElementById('previous-uploads-prompt');
    if (prompt) prompt.remove();

    showGlobalToast('✅ Na baya hotunan sun koma active a story!');
    
    // Refresh stories a homepage
    loadAndRenderDailyStories();
}

function startNewUpload(timeFrom, timeTo) {
    // Cire prompt
    const prompt = document.getElementById('previous-uploads-prompt');
    if (prompt) prompt.remove();

    // Nuna upload slot
    injectUploadSlotIntoProfile(
        uploadWindowState.proData, 
        timeFrom, 
        timeTo, 
        true
    );
}

// ── INJECT UPLOAD SLOT INTO PROFILE SHEET ──
function injectUploadSlotIntoProfile(proData, timeFrom, timeTo, isNewUpload) {
    // Cire idan yana can
    const existing = document.getElementById('daily-upload-slot');
    if (existing) existing.remove();

    const profileContent = document.querySelector('#profile-sheet-overlay > div:last-child');
    if (!profileContent) return;

    const slot = document.createElement('div');
    slot.id = 'daily-upload-slot';
    slot.style.cssText = `
        margin-bottom: 24px;
        background: linear-gradient(135deg, rgba(236,72,153,0.06) 0%, rgba(190,24,93,0.04) 100%);
        border: 1.5px solid rgba(236,72,153,0.25);
        border-radius: 18px;
        padding: 16px;
        animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
    `;

    slot.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div>
                <div style="font-size:11px;font-weight:700;color:#be185d;text-transform:uppercase;letter-spacing:0.5px;">
                    🔴 LIVE · Upload Window Open
                </div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;font-weight:600;">
                    ${timeFrom} – ${timeTo} · Kayan abincin yau
                </div>
            </div>
            <div style="background:rgba(236,72,153,0.1);border:1px solid rgba(236,72,153,0.2);border-radius:8px;padding:4px 10px;">
                <span style="font-size:10px;font-weight:800;color:#be185d;" id="upload-window-countdown">--:--</span>
            </div>
        </div>

        <!-- Dish Blocks Container (dynamic) -->
        <div id="daily-upload-blocks-container"></div>

        <!-- Add New Dish Block Button -->
        <button onclick="addDailyUploadBlock()" style="width:100%;padding:10px;background:rgba(236,72,153,0.15);border:1.5px dashed rgba(236,72,153,0.4);border-radius:12px;color:#be185d;font-size:12px;font-weight:800;cursor:pointer;margin-bottom:12px;font-family:inherit;">
            ➕ Ƙara Wani Dish
        </button>

        <!-- Upload Button -->
        <button id="daily-upload-submit-btn" onclick="submitDailyUploads()" style="width:100%;padding:12px;background:linear-gradient(135deg,#ec4899,#be185d);border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;">
            🚀 Aika Zuwa Story
        </button>
    `;

    // Saka kafin schedule card
    const scheduleCard = document.getElementById('chef-schedule-section-card');
    if (scheduleCard && scheduleCard.parentNode) {
        scheduleCard.parentNode.insertBefore(slot, scheduleCard);
    } else {
        profileContent.insertBefore(slot, profileContent.firstChild);
    }

    // Start countdown
    startUploadWindowCountdown(uploadWindowState.proData?.operatingHours?.to);
}

// ── COUNTDOWN TIMER ──
let countdownInterval = null;

function startUploadWindowCountdown(timeTo) {
    if (countdownInterval) clearInterval(countdownInterval);
    if (!timeTo) return;

    function updateCountdown() {
        const el = document.getElementById('upload-window-countdown');
        if (!el) { clearInterval(countdownInterval); return; }

        const now = getNowNigeria();
        const [h, m] = timeTo.split(':').map(Number);
        const end = new Date(now);
        end.setHours(h, m, 0, 0);

        const diff = end - now;
        if (diff <= 0) {
            el.textContent = 'Closed';
            clearInterval(countdownInterval);
            hideUploadWindow();
            return;
        }

        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        el.textContent = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')} left`;
    }

    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 60000);
    }

    async function loadAndRenderDailyStories() {
    if (typeof firebase === 'undefined' || !firebase.database) return;
    const today = getNowNigeria().toISOString().slice(0,10);
    
    try {
        const snap = await firebase.database().ref('daily_stories').once('value');
        const data = snap.val() || {};
        
        const liveStories = [];
        Object.entries(data).forEach(([username, days]) => {
            const todayData = days[today];
            if (!todayData || !todayData.active || !todayData.uploads) return;
            liveStories.push({ username, uploads: todayData.uploads });
        });

        const track = document.getElementById("stories-track-container");
        if (!track) return;

        // Cire duk tsohon live-story nodes kafin mu sake zana sabbin
        track.querySelectorAll('.live-daily-story').forEach(el => el.remove());

        if (liveStories.length === 0) return;
        
        liveStories.forEach(story => {
            const firstUpload = story.uploads[0];
            const div = document.createElement('div');
            div.className = 'glass-lens-card live-daily-story';
            div.onclick = () => openLiveDailyStory(story.username, story.uploads);
            div.innerHTML = `
                <div class="glass-lens-img-wrap">
                    <img class="glass-lens-img" src="${firstUpload.url}" alt="${story.username}"/>
                </div>
                <div class="glass-lens-ring">🔴</div>
                <div class="glass-lens-body">
                    <span class="glass-lens-name">${story.username}</span>
                    <div class="glass-lens-distance" style="color:#ef4444;">● LIVE</div>
                </div>`;
            track.prepend(div);
        });
        
    } catch(err) {
        console.warn('loadAndRenderDailyStories error:', err);
    }
    }
    

async function submitDailyUploads() {
    if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }
    const sessionUser = localStorage.getItem('nexus_user_session');
    if (!sessionUser) { showGlobalToast('⚠️ Please login first!'); return; }

    if (dailyUploadBlocks.length === 0) {
        showGlobalToast('⚠️ Add at least one dish!');
        return;
    }

    // Validate kowane block
    for (const block of dailyUploadBlocks) {
        if (!block.dishName) {
            showGlobalToast('⚠️ Select a dish for each block!');
            return;
        }
        if (Object.keys(block.photos).length === 0) {
            showGlobalToast(`⚠️ Upload at least one photo for "${block.dishName}"!`);
            return;
        }
    }
// Final safety check: ensure no dish is duplicated for the same day
    const dishNamesSoFar = new Set();
    for (const block of dailyUploadBlocks) {
        if (dishNamesSoFar.has(block.dishName)) {
            showGlobalToast(`⚠️ You cannot upload "${block.dishName}" more than once for the same day!`);
            return;
        }
        dishNamesSoFar.add(block.dishName);
    }
    const btn = document.getElementById('daily-upload-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Submitting...'; }

    try {
        const allUploads = [];

        for (const block of dailyUploadBlocks) {
            for (const slotIdx of Object.keys(block.photos)) {
                const photo = block.photos[slotIdx];
                if (!photo.file) continue;
                try {
                    const formData = new FormData();
                    formData.append('file', photo.file);
                    formData.append('type', 'daily_story');
                    formData.append('username', sessionUser);
                    const res = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.success) {
                        allUploads.push({
                            url: data.url,
                            type: photo.type && photo.type.includes('video') ? 'video' : 'image',
                            dishName: block.dishName,
                            dishPrice: block.dishPrice,
                            dishCurrency: block.dishCurrency
                        });
                    }
                } catch (e) { console.warn(`Block ${block.blockId} slot ${slotIdx} upload failed:`, e); }
            }
        }

        if (allUploads.length === 0) {
            showGlobalToast('❌ Upload ya kasa. Sake gwadawa.');
            if (btn) { btn.disabled = false; btn.textContent = '🚀 Aika Zuwa Story'; }
            return;
        }

        // Save to Firebase daily_stories
        const today = getNowNigeria().toISOString().slice(0, 10);
        if (typeof firebase !== 'undefined' && firebase.database) {
            await firebase.database().ref(`daily_stories/${sessionUser}/${today}`).set({
                uploads: allUploads,
                active: true,
                uploadedAt: Date.now(),
                username: sessionUser
            });
        }

        showGlobalToast(`✅ Hotunan ${allUploads.length} sun tafi story!`);

        // Reset blocks
        dailyUploadBlocks = [];
        renderDailyUploadBlocks();

        // Refresh stories on homepage
        loadAndRenderDailyStories();

        // Close upload slot
        const slot = document.getElementById('daily-upload-slot');
        if (slot) slot.remove();

    } catch (err) {
        console.error('Daily upload error:', err);
        showGlobalToast('❌ Error: ' + err.message);
        if (btn) { btn.disabled = false; btn.textContent = '🚀 Aika Zuwa Story'; }
    }
    }

// ── FIREBASE PROVIDER → PRO-LIKE OBJECT NORMALIZER ──
function normalizeFirebaseProvider(username, data) {
    const initials = (data.username || username || '??').slice(0, 2).toUpperCase();
    return {
        id: username, // username ne maimakon lamba — wannan shi ne alamar "real provider"
        name: data.username || username,
        category: data.category || 'general',
        display_cat: data.categoryLabel || data.category || 'Service Provider',
        rating: data.rating || 0,
        reviews: data.reviewsCount || 0,
        distance: data.distanceKm || 0,
        city: data.city || '',
        verified: data.status === 'approved' || data.verified === true,
        avatar: initials,
        color: getProColor(data.categoryLabel || data.category),
        jobs: data.jobsCompleted || 0,
        price: data.pricing ? formatPrice(Number(data.pricing.base || 0), data.pricing.currency) : '0',
        bio: data.bio || 'No bio provided yet.',
        skills: data.skills || data.cuisines || [],
        online: data.online === true,
        schedule: data.schedule || null,
        gallery: (data.portfolio || []).map(p => p.url ? p : { url: p }),
        menu: data.menu || null,
        operatingHours: data.operatingHours || null,
        location: data.location || null,
        bankDetails: data.bankDetails || null,
        _isFirebaseProvider: true
    };
}

// ── ASYNC FETCH + RENDER WRAPPER ──
async function fetchFirebaseProviderAsPro(username) {
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    try {
        const snap = await firebase.database().ref('providers/' + username).once('value');
        if (!snap.exists()) return null;
        return normalizeFirebaseProvider(username, snap.val());
    } catch (err) {
        console.warn('fetchFirebaseProviderAsPro failed:', err);
        return null;
    }
}

// ════════════════════════════════════════════════════════════
//  ⭐ NEXUS PROTOCOL — VERIFIED REVIEW SYSTEM
// ════════════════════════════════════════════════════════════

// ── DIMENSION CONFIG PER CATEGORY ──
const NP_DIMENSIONS = {
    chef: [
        { key: 'taste',     label: 'Taste and Quality',   color: '#f59e0b' },
        { key: 'packing',   label: 'Packing',              color: '#3b82f6' },
        { key: 'value',     label: 'Value for Money',      color: '#10b981' },
        { key: 'freshness', label: 'Freshness',            color: '#8b5cf6' },
        { key: 'delivery',  label: 'Timely Delivery',      color: '#ec4899' },
    ],
    snacks: [
        { key: 'taste',     label: 'Taste & Quality',    color: '#f59e0b' },
        { key: 'packaging', label: 'Packaging',           color: '#3b82f6' },
        { key: 'value',     label: 'Value for Money',     color: '#10b981' },
        { key: 'delivery',  label: 'Delivery Speed',      color: '#ec4899' },
        { key: 'freshness', label: 'Freshness',           color: '#8b5cf6' },
    ],
    beverages: [
        { key: 'taste',     label: 'Taste & Quality',    color: '#f59e0b' },
        { key: 'packaging', label: 'Packaging',           color: '#3b82f6' },
        { key: 'value',     label: 'Value for Money',     color: '#10b981' },
        { key: 'temperature', label: 'Temperature',       color: '#ec4899' },
        { key: 'freshness', label: 'Freshness',           color: '#8b5cf6' },
    ],
    plumber: [
        { key: 'quality',   label: 'Work Quality',        color: '#f59e0b' },
        { key: 'punctuality', label: 'Punctuality',       color: '#3b82f6' },
        { key: 'value',     label: 'Value for Money',     color: '#10b981' },
        { key: 'professionalism', label: 'Professionalism', color: '#ec4899' },
        { key: 'cleanliness', label: 'Cleanliness',       color: '#8b5cf6' },
    ],
    electrician: [
        { key: 'quality',   label: 'Work Quality',        color: '#f59e0b' },
        { key: 'punctuality', label: 'Punctuality',       color: '#3b82f6' },
        { key: 'value',     label: 'Value for Money',     color: '#10b981' },
        { key: 'professionalism', label: 'Professionalism', color: '#ec4899' },
        { key: 'safety',    label: 'Safety Standards',    color: '#8b5cf6' },
    ],
    carpenter: [
        { key: 'quality',   label: 'Craftsmanship',       color: '#f59e0b' },
        { key: 'accuracy',  label: 'Accuracy to Design',  color: '#3b82f6' },
        { key: 'value',     label: 'Value for Money',     color: '#10b981' },
        { key: 'punctuality', label: 'Delivery Time',     color: '#ec4899' },
        { key: 'communication', label: 'Communication',   color: '#8b5cf6' },
    ],
    tailor: [
        { key: 'quality',   label: 'Craftsmanship',       color: '#f59e0b' },
        { key: 'accuracy',  label: 'Accuracy to Design',  color: '#3b82f6' },
        { key: 'value',     label: 'Value for Money',     color: '#10b981' },
        { key: 'punctuality', label: 'Delivery Time',     color: '#ec4899' },
        { key: 'communication', label: 'Communication',   color: '#8b5cf6' },
    ],
    cleaner: [
        { key: 'quality',   label: 'Cleaning Quality',    color: '#f59e0b' },
        { key: 'punctuality', label: 'Punctuality',       color: '#3b82f6' },
        { key: 'value',     label: 'Value for Money',     color: '#10b981' },
        { key: 'professionalism', label: 'Professionalism', color: '#ec4899' },
        { key: 'thoroughness', label: 'Thoroughness',     color: '#8b5cf6' },
    ],
    mechanic: [
        { key: 'quality',   label: 'Repair Quality',      color: '#f59e0b' },
        { key: 'punctuality', label: 'Turnaround Time',   color: '#3b82f6' },
        { key: 'value',     label: 'Value for Money',     color: '#10b981' },
        { key: 'professionalism', label: 'Professionalism', color: '#ec4899' },
        { key: 'honesty',   label: 'Honesty & Transparency', color: '#8b5cf6' },
    ],
    default: [
        { key: 'quality',   label: 'Service Quality',     color: '#f59e0b' },
        { key: 'punctuality', label: 'Punctuality',       color: '#3b82f6' },
        { key: 'value',     label: 'Value for Money',     color: '#10b981' },
        { key: 'professionalism', label: 'Professionalism', color: '#ec4899' },
        { key: 'communication', label: 'Communication',   color: '#8b5cf6' },
    ],
};

function getNPDimensions(category) {
    return NP_DIMENSIONS[category] || NP_DIMENSIONS.default;
}

// ── DEMO REVIEWS DATA ──
const NP_DEMO_REVIEWS = [
    {
        id: 'rev_001',
        reviewerName: 'Dennis W.',
        reviewerInitials: 'DW',
        reviewerColor: '#1d4ed8',
        reviewerSince: 'Member since Jan 2024',
        rating: 5,
        comment: 'Absolutely incredible experience! The food was fresh, hot, and delivered right on time. Chef Amara truly knows her craft — the Jollof Rice was smoky and perfect. Will definitely order again.',
        dimensions: { taste: 5, delivery: 5, value: 4, presentation: 5, freshness: 5 },
        verifiedOrder: 'Jollof Rice',
        orderDate: '23 Oct 2024',
        orderStatus: 'Delivered & Confirmed',
        helpfulCount: 47,
        date: '23/10/2024'
    },
    {
        id: 'rev_002',
        reviewerName: 'Amina K.',
        reviewerInitials: 'AK',
        reviewerColor: '#059669',
        reviewerSince: 'Member since Mar 2024',
        rating: 4,
        comment: 'Really good food, the presentation was top notch. Delivery was slightly delayed but Chef kept me informed throughout. The Danwake was delicious.',
        dimensions: { taste: 5, delivery: 3, value: 4, presentation: 5, freshness: 4 },
        verifiedOrder: 'Danwake',
        orderDate: '09 Jun 2025',
        orderStatus: 'Delivered & Confirmed',
        helpfulCount: 23,
        date: '09/06/2025'
    },
    {
        id: 'rev_003',
        reviewerName: 'Bashir M.',
        reviewerInitials: 'BM',
        reviewerColor: '#7c3aed',
        reviewerSince: 'Member since Aug 2023',
        rating: 5,
        comment: 'Best catering service I have ever used for a corporate event. Professional, punctual, and the food quality was world class. Everyone at the office was impressed.',
        dimensions: { taste: 5, delivery: 5, value: 5, presentation: 5, freshness: 5 },
        verifiedOrder: 'Corporate Event Catering',
        orderDate: '14 Mar 2025',
        orderStatus: 'Delivered & Confirmed',
        helpfulCount: 89,
        date: '14/03/2025'
    },
];

// ── RENDER STARS ──
function renderNPStars(rating, size = 14) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            html += `<span class="np-review-star" style="font-size:${size}px;">★</span>`;
        } else if (i - rating < 1 && i - rating > 0) {
            html += `<span class="np-review-star" style="font-size:${size}px;opacity:0.4;">★</span>`;
        } else {
            html += `<span class="np-review-star" style="font-size:${size}px;color:#e2e8f0;">★</span>`;
        }
    }
    return html;
}

// ── RENDER DISTRIBUTION BARS ──
function renderNPDistBars(reviews) {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
        const idx = Math.round(r.rating) - 1;
        if (idx >= 0 && idx < 5) counts[idx]++;
    });
    const max = Math.max(...counts, 1);

    let html = '';
    for (let i = 5; i >= 1; i--) {
        const pct = (counts[i - 1] / reviews.length) * 100;
        html += `
            <div class="np-dist-row">
                <div class="np-dist-label">${i}</div>
                <div class="np-dist-bar-wrap">
                    <div class="np-dist-bar-fill" style="width:${pct}%;"></div>
                </div>
            </div>`;
    }
    return html;
}

// ── RENDER DIMENSION AVERAGES ──
function renderNPDimAverages(reviews, category) {
    const dims = getNPDimensions(category);
    const averages = {};
    dims.forEach(d => {
        const vals = reviews.map(r => r.dimensions?.[d.key] || 0).filter(v => v > 0);
        averages[d.key] = vals.length > 0
            ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
            : '0.0';
    });

    const sortedDims = [...dims].sort((a, b) => averages[b.key] - averages[a.key]);

    return sortedDims.map(d => `
        <div class="np-dim-row">
            <div class="np-dim-label">${d.label}</div>
            <div class="np-dim-bar-wrap">
                <div class="np-dim-bar-fill" style="width:${(averages[d.key] / 5) * 100}%;background:${d.color};"></div>
            </div>
            <div class="np-dim-score">${averages[d.key]}</div>
        </div>`).join('');
    }
// ── RENDER MINI DIM BARS IN CARD ──
function renderNPMiniDims(review, category) {
    const dims = getNPDimensions(category);
    return dims.map(d => {
        const score = review.dimensions?.[d.key] || 0;
        const pct = (score / 5) * 100;
        return `
            <div class="np-review-dim-row">
                <div class="np-review-dim-label">${d.label}</div>
                <div class="np-review-dim-bar">
                    <div class="np-review-dim-fill" style="width:${pct}%;background:${d.color};"></div>
                </div>
            </div>`;
    }).join('');
}

// ── RENDER FULL RATING SECTION ──
function renderNPRatingSection(reviews, category) {
    if (!reviews || reviews.length === 0) {
        return `
            <div class="np-rating-section">
                <div style="text-align:center;padding:20px;">
                    <div style="font-size:28px;margin-bottom:8px;">⭐</div>
                    <div style="font-size:13px;font-weight:700;color:#374151;">No reviews yet</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Be the first verified customer to leave a review</div>
                </div>
            </div>`;
    }

    return `
        <div class="np-rating-section">
            <div class="np-dimensions">
                ${renderNPDimAverages(reviews, category)}
            </div>
        </div>`;
}

// ── RENDER REVIEW CARDS ──
function renderNPReviewCards(reviews, category) {
    if (!reviews || reviews.length === 0) return '';

    const cards = reviews.map(r => `
        <div class="np-review-card">
            <div class="np-review-top">
                <div class="np-reviewer-left">
                    <div class="np-reviewer-avatar" style="background:${r.reviewerColor};">
                        ${r.reviewerInitials}
                        <div style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;background:#10b981;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;">
                            <span style="font-size:7px;color:#fff;">✓</span>
                        </div>
                    </div>
                    <div>
                        <div class="np-reviewer-name">${r.reviewerName}</div>
                        <div class="np-reviewer-meta">
                            ${renderNPStars(r.rating, 12)}
                            <span class="np-reviewer-date">${r.date}</span>
                        </div>
                    </div>
                </div>
                <button class="np-verified-badge" onclick="openIdentityOverlay(${JSON.stringify(r).replace(/"/g, '&quot;')})">✅ Verified Purchase</button>
            </div>

            <div class="np-review-comment">${r.comment}</div>

            <div class="np-helpful-row">
                <div class="np-helpful-text">Was this review helpful?</div>
                <div class="np-helpful-btns">
                    <button class="np-helpful-btn" onclick="handleNPHelpful(this, '${r.id}', true)">Yes · ${r.helpfulCount}</button>
                    <button class="np-helpful-btn" onclick="handleNPHelpful(this, '${r.id}', false)">No</button>
                </div>
            </div>
        </div>`).join('');

    return `
        <div class="np-reviews-section" style="margin-top:4px;">
            ${cards}
        </div>`;
    }

let rfActiveDim = null, rfActiveSentiment = null;

function openRatingsFilterPage() {
    if (!currentProfileProId) return;
    const pro = PROS.find(p => String(p.id) === String(currentProfileProId));
    if (!pro) return;
    rfActiveDim = null; rfActiveSentiment = null;
    const dims = getNPDimensions(pro.category || 'default');
    document.getElementById('rf-dim-pills').innerHTML = dims.map(d => `
    <button onclick="rfFilterDim('${d.key}')" id="rf-pill-${d.key}" style="display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:10px 16px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.15);background:#262626 !important;color:#ffffff;font-weight:700;font-size:12.5px;cursor:pointer;">${d.label}</button>`).join('');  
    rfRenderReviews(pro);
    document.getElementById('ratings-filter-page').style.display = 'flex';
}

function closeRatingsFilterPage() {
    document.getElementById('ratings-filter-page').style.display = 'none';
}

function rfFilterDim(key) {
    rfActiveDim = (rfActiveDim === key) ? null : key;
    document.querySelectorAll('#rf-dim-pills button').forEach(b => {
        const active = b.id === 'rf-pill-' + rfActiveDim;
        b.style.background = active ? '#fde08d' : '#262626';
b.style.borderColor = active ? '#fde08d' : 'rgba(255,255,255,0.15)';
b.style.color = active ? '#111827' : '#ffffff';
            });
   const pro = PROS.find(p => String(p.id) === String(currentProfileProId));
    rfRenderReviews(pro);
}

function rfFilterSentiment(type) {
    rfActiveSentiment = (rfActiveSentiment === type) ? null : type;
    const posBtn = document.getElementById('rf-pill-positive'), negBtn = document.getElementById('rf-pill-negative');
    posBtn.style.background = rfActiveSentiment === 'positive' ? '#fde08d' : '#262626';
posBtn.style.color = rfActiveSentiment === 'positive' ? '#111827' : '#ffffff';
negBtn.style.background = rfActiveSentiment === 'negative' ? '#fde08d' : '#262626';
negBtn.style.color = rfActiveSentiment === 'negative' ? '#111827' : '#ffffff';
    const pro = PROS.find(p => String(p.id) === String(currentProfileProId));
    rfRenderReviews(pro);
}

function rfRenderReviews(pro) {
    let reviews = NP_DEMO_REVIEWS;
    if (rfActiveDim) reviews = reviews.filter(r => (r.dimensions?.[rfActiveDim] || 0) >= 4);
    if (rfActiveSentiment === 'positive') reviews = reviews.filter(r => r.rating >= 4);
    if (rfActiveSentiment === 'negative') reviews = reviews.filter(r => r.rating <= 2);
    document.getElementById('rf-reviews-list').innerHTML = reviews.length
        ? renderNPReviewCards(reviews, pro.category || 'default')
        : `<div style="text-align:center;padding:40px 20px;color:#94a3b8;font-size:13px;">No matching reviews</div>`;
    }
    
// ── HELPFUL BUTTON ──
function handleNPHelpful(btn, reviewId, isYes) {
    const row = btn.closest('.np-helpful-btns');
    row.querySelectorAll('.np-helpful-btn').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'rgba(255,255,255,0.75)';
        b.style.borderColor = 'rgba(255,255,255,0.12)';
    });
    btn.style.background = 'transparent';
    btn.style.color = '#ffffff';
    btn.style.borderColor = '#1d4ed8';
    if (navigator.vibrate) navigator.vibrate(10);
}

// ── IDENTITY OVERLAY ──
function openIdentityOverlay(reviewData) {
    const r = typeof reviewData === 'string' ? JSON.parse(reviewData) : reviewData;

    document.getElementById('npIdAvatar').style.background = r.reviewerColor;
    document.getElementById('npIdAvatar').textContent = r.reviewerInitials;
    document.getElementById('npIdName').textContent = r.reviewerName;
    document.getElementById('npIdSince').textContent = r.reviewerSince;
    document.getElementById('npIdOrder').textContent = r.verifiedOrder;
    document.getElementById('npIdDate').textContent = r.orderDate;
    document.getElementById('npIdStatus').textContent = r.orderStatus;

    document.getElementById('npIdentityOverlay').classList.add('active');
    if (navigator.vibrate) navigator.vibrate(15);
}

function closeIdentityOverlay(event) {
    if (event && event.target !== document.getElementById('npIdentityOverlay')) return;
    document.getElementById('npIdentityOverlay').classList.remove('active');
}

// ── INJECT INTO PROFILE SHEET ──
function injectNPReviewsIntoProfile(proId) {
    const pro = PROS.find(p => String(p.id) === String(proId));
    if (!pro) return;

    // Remove existing
    const existing = document.getElementById('np-reviews-inject');
    if (existing) existing.remove();

    // Use demo reviews — replace with Firebase fetch in production
    const reviews = NP_DEMO_REVIEWS;
    const category = pro.category || 'default';

    const container = document.createElement('div');
    container.id = 'np-reviews-inject';
    container.style.cssText = 'display:none;background:transparent;margin:0 -20px 0;padding:26px 0 46px;position:relative;z-index:2;';
    container.innerHTML = `
        <div onclick="openRatingsFilterPage()" style="display:flex;align-items:center;justify-content:space-between;font-weight:800;font-size:17px;color:#00F2FF;margin-bottom:12px;padding:0 20px;cursor:pointer;">
            <span>Ratings and Reviews</span>
            <span style="font-size:20px;color:#00F2FF;">›</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:0 20px;margin-bottom:10px;">
            ${[1,2,3,4,5].map(() => `<span onclick="openReviewModal()" style="font-size:32px;line-height:1;cursor:pointer;color:rgba(255,255,255,0.3);font-family:'Segoe UI Symbol',sans-serif;">☆</span>`).join('')}
        </div>
        <div onclick="openReviewModal()" style="padding:0 20px;margin-bottom:16px;font-size:13px;font-weight:700;color:#00F2FF;cursor:pointer;">Write a review</div>
        ${renderNPRatingSection(reviews, category)}
        ${renderNPReviewCards(reviews, category)}
  <div style="position:fixed;bottom:0;left:0;right:0;background:#050505 !important;padding:8px 16px 12px;display:flex;gap:8px;z-index:9998;">
        <button onclick="openReportModal()" style="flex:1;background:#262626 !important;color:#ffffff;border:none;border-radius:12px;padding:11px 0;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,0.05);">🚩 Report Provider</button>
        <button onclick="openReviewModal()" style="flex:1;background:#fde08d !important;color:#1a1a1a;border:none;border-radius:12px;padding:11px 0;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,0.15);">⭐ Leave Review</button>
    </div>
    `;

  // Saka bayan food-menu-section (ko generic-info-wrap idan ba food pro ba) — a WAJEN duk wani hideable wrapper
const gallerySection = document.getElementById('nxh-gallery-section');
    if (gallerySection && gallerySection.parentNode) {
        gallerySection.insertAdjacentElement('beforebegin', container);
    }
}

// ── PATCH openProfileSheet don auto-inject reviews ──
(function patchProfileSheetForReviews() {
    const origFn = window.openProfileSheet;
    window.openProfileSheet = function(proId) {
        origFn(proId);
        setTimeout(() => injectNPReviewsIntoProfile(proId), 100);
        setTimeout(() => loadProPendingOrders(proId), 200);
        setTimeout(() => loadPendingOrderRequests(proId), 250);  // ← SABON LINE
    };
})();
    
  function setOrderMethod(method) {
    window.setOrderMethod = setOrderMethod;
    const deliveryBtn = document.getElementById('po-method-delivery');
    const pickupBtn = document.getElementById('po-method-pickup');
    const addressWrap = document.getElementById('po-address-wrap');
    const pickupInfo = document.getElementById('po-pickup-info');
    const dtpContainer = document.getElementById('dtp-container-el');

    if (method === 'delivery') {
        deliveryBtn.style.background = '#fde08d';
        deliveryBtn.style.color = '#111827';
        deliveryBtn.style.borderColor = 'transparent';
        deliveryBtn.dataset.active = 'true';
        pickupBtn.style.background = 'rgba(20,20,22,0.65)';
        pickupBtn.style.color = 'rgba(255,255,255,0.75)';
        pickupBtn.dataset.active = 'false';
        addressWrap.style.display = 'block';
        pickupInfo.style.display = 'none';

        if (dtpContainer) dtpContainer.classList.add('visible');

    } else {
        pickupBtn.style.background = '#fde08d';
        pickupBtn.style.color = '#111827';
        pickupBtn.dataset.active = 'true';
        deliveryBtn.style.background = 'rgba(20,20,22,0.65)';
deliveryBtn.style.color = 'rgba(255,255,255,0.75)';
        deliveryBtn.dataset.active = 'false';
        addressWrap.style.display = 'none';
        pickupInfo.style.display = 'block';

        if (dtpContainer) {
            dtpContainer.classList.remove('visible');
            deliveryTimePreference.mode = null;
            deliveryTimePreference.windowType = null;
            deliveryTimePreference.customText = null;
            const vendorBtn = document.getElementById('dtp-opt-vendor');
            const strictBtn = document.getElementById('dtp-opt-strict');
            if (vendorBtn) vendorBtn.classList.remove('active');
            if (strictBtn) strictBtn.classList.remove('active');
            const dropdownWrap = document.getElementById('dtp-dropdown-wrap');
            if (dropdownWrap) dropdownWrap.classList.remove('visible');
        }
    }
    }  
    
    
// ── TRACK SEARCH/CATEGORY EVENTS ──
async function trackSearchEvent(query) {
    if (!query) return;
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const cleanQuery = String(query).toLowerCase().trim();
        const ref = firebase.database().ref(`admin/search_stats/${cleanQuery}`);
        const snap = await ref.once('value');
        const current = snap.val() || { query: cleanQuery, count: 0, lastSearched: null };

        await ref.set({
            query: cleanQuery,
            count: (current.count || 0) + 1,
            lastSearched: Date.now()
        });

    } catch(err) {
        console.warn('trackSearchEvent error:', err);
    }
}

// ── LOAD MOST SEARCHED (for admin panel use) ──
async function loadMostSearched(limit = 10) {
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return [];

        const snap = await firebase.database()
            .ref('admin/search_stats')
            .orderByChild('count')
            .limitToLast(limit)
            .once('value');

        const data = snap.val() || {};
        return Object.values(data)
            .sort((a, b) => (b.count || 0) - (a.count || 0));

    } catch(err) {
        console.warn('loadMostSearched error:', err);
        return [];
    }
}

// ── REQUEST NEW SERVICE ──
function openRequestServiceOverlay() {
    document.getElementById('req-service-name').value = '';
    document.getElementById('req-service-reason').value = '';
    document.getElementById('req-service-contact').value = '';
    document.getElementById('request-service-overlay').style.display = 'flex';
}

function closeRequestServiceOverlay() {
    document.getElementById('request-service-overlay').style.display = 'none';
}

async function submitServiceRequest() {
if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }    
    const serviceName = document.getElementById('req-service-name').value.trim();
    const reason = document.getElementById('req-service-reason').value.trim();
    const contact = document.getElementById('req-service-contact').value.trim();

    if (!serviceName || serviceName.length < 2) {
        showGlobalToast('⚠️ Please enter the service name!');
        return;
    }

    const btn = document.querySelector('#request-service-overlay button:last-child');
    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';

    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            const requestId = `svc_req_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
            await firebase.database().ref(`admin/service_requests/${requestId}`).set({
                serviceName,
                reason: reason || '—',
                contact: contact || 'Anonymous',
                status: 'pending',
                createdAt: Date.now()
            });

            // Also track as search
            await trackSearchEvent(serviceName.toLowerCase());
        }

        closeRequestServiceOverlay();
        showGlobalToast('✅ Request submitted! We will review and add it soon.');

    } catch(err) {
        console.error('Service request error:', err);
        showGlobalToast('❌ Failed to submit. Try again.');
    }

    btn.disabled = false;
    btn.textContent = 'Submit Request 🚀';
                             }

    // ── DELIVERY TIME PREFERENCE STATE ──
const deliveryTimePreference = {
    mode: null,          // 'vendor' or 'strict'
    windowType: null,    // 'now_30' | '30_60' | '1_2h' | 'custom'
    customText: null
};

function selectDeliveryPreference(mode) {
    deliveryTimePreference.mode = mode;

    const vendorBtn = document.getElementById('dtp-opt-vendor');
    const strictBtn = document.getElementById('dtp-opt-strict');
    const dropdownWrap = document.getElementById('dtp-dropdown-wrap');

    if (mode === 'vendor') {
        vendorBtn.classList.add('active');
        strictBtn.classList.remove('active');
        dropdownWrap.classList.remove('visible');

        // Reset strict-time fields since vendor will decide
        deliveryTimePreference.windowType = null;
        deliveryTimePreference.customText = null;
        document.getElementById('dtp-time-select').value = '';
        document.getElementById('dtp-custom-input').classList.remove('visible');
        document.getElementById('dtp-custom-input').value = '';

    } else {
        strictBtn.classList.add('active');
        vendorBtn.classList.remove('active');
        dropdownWrap.classList.add('visible');
    }
}

function handleDtpTimeChange(value) {
    deliveryTimePreference.windowType = value;
    const customInput = document.getElementById('dtp-custom-input');

    if (value === 'custom') {
        customInput.classList.add('visible');
    } else {
        customInput.classList.remove('visible');
        customInput.value = '';
        deliveryTimePreference.customText = null;
    }
}

// Sync custom text as user types
runOnServicesInit(() => {
    const customInputEl = document.getElementById('dtp-custom-input');
    if (customInputEl) {
        customInputEl.addEventListener('input', (e) => {
            deliveryTimePreference.customText = e.target.value.trim();
        });
    }
});

// ── VALIDATION HELPER (call this before submitting the request) ──
function validateDeliveryTimePreference() {
    if (!deliveryTimePreference.mode) {
        showGlobalToast('⚠️ Please select a delivery time preference!');
        return false;
    }
    if (deliveryTimePreference.mode === 'strict') {
        if (!deliveryTimePreference.windowType) {
            showGlobalToast('⚠️ Please select your required delivery window!');
            return false;
        }
        if (deliveryTimePreference.windowType === 'custom' && !deliveryTimePreference.customText) {
            showGlobalToast('⚠️ Please enter your custom delivery time!');
            return false;
        }
    }
    return true;
}

// ── GLOBAL STATE FOR ORDER REQUESTS ──
let activeRejectRequestId = null;
let activeRejectProId = null;

// ════════════════════════════════════════════════════════════
//  📨 LOAD & RENDER PENDING ORDER REQUESTS (Vendor Side)
// ════════════════════════════════════════════════════════════
async function loadPendingOrderRequests(proId) {
    const section = document.getElementById('pending-order-requests-section');
    const list = document.getElementById('pending-order-requests-list');
    if (!section || !list) return;

    const sessionUser = localStorage.getItem('nexus_user_session');

    // Only owner sees this — kuma a ɓoye idan ba shi ba
    if (!sessionUser || String(proId) !== String(sessionUser)) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;
        const snap = await firebase.database().ref(`providers/${proId}/orderRequests`).once('value');
        const data = snap.val() || {};

        const requests = Object.entries(data)
            .map(([id, r]) => ({ id, ...r }))
            .filter(r => r.status === 'pending_vendor_review')
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (requests.length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;background:#f8fafc;border-radius:12px;">No new order requests</div>`;
            return;
        }

        list.innerHTML = requests.map(r => renderOrderRequestCardHtml(r)).join('');

    } catch (err) {
        console.error('Load order requests error:', err);
        list.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">Failed to load requests</div>`;
    }
}

function renderOrderRequestCardHtml(r) {
    const dtp = r.deliveryTimePreference || {};
    let timeLabel = 'Left to vendor';
    if (dtp.mode === 'strict') {
        const labels = {
            now_30: 'Now (10 – 30 mins)',
            '30_60': 'Within 30 mins – 1 hour',
            '1_2h': 'Within 1 – 2 hours',
            custom: dtp.customText || 'Custom time'
        };
        timeLabel = labels[dtp.windowType] || 'Not specified';
    }

    return `
        <div class="order-req-card">
            <div class="order-req-top">
                <div>
                    <div class="order-req-item-name">${r.quantity}x ${r.itemName}</div>
                    <div class="order-req-meta">📍 ${r.fulfillmentMethod === 'pickup' ? 'Self Pickup' : (r.address || '—')}</div>
                    <div class="order-req-meta">⏰ ${timeLabel}</div>
                    <div class="order-req-meta">📞 ${r.phone || '—'}</div>
                </div>
                <span class="order-req-badge">PENDING</span>
            </div>
            <div class="order-req-actions">
                <button class="order-req-accept-btn" onclick="acceptOrderRequest('${r.proId}','${r.id}')">✅ Accept</button>
                <button class="order-req-reject-btn" onclick="openRejectReasonModal('${r.proId}','${r.id}')">✕ Reject</button>
            </div>
        </div>`;
}

// ════════════════════════════════════════════════════════════
//  ✅ ACCEPT ORDER REQUEST
// ════════════════════════════════════════════════════════════
async function acceptOrderRequest(proId, requestId) {
 if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }  
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const reqSnap = await firebase.database().ref(`providers/${proId}/orderRequests/${requestId}`).once('value');
        const reqData = reqSnap.val();
        if (!reqData) return;

        // Set a payment deadline window (e.g. 10 minutes from now)
        const paymentDeadline = Date.now() + (10 * 60 * 1000);

        await firebase.database().ref(`providers/${proId}/orderRequests/${requestId}`).update({
            status: 'accepted_awaiting_payment',
            acceptedAt: Date.now(),
            paymentDeadline: paymentDeadline
        });

        await firebase.database().ref(`customers/${reqData.customerUsername}/sentOrderRequests/${requestId}`).update({
            status: 'accepted_awaiting_payment',
            acceptedAt: Date.now(),
            paymentDeadline: paymentDeadline
        });

        // Notify customer
        await firebase.database().ref(`customers/${reqData.customerUsername}/notifications`).push({
            type: 'order_accepted',
            title: '✅ Order Accepted!',
            message: `${reqData.proName} accepted your order for ${reqData.itemName}. Complete payment now to confirm.`,
            requestId: requestId,
            read: false,
            createdAt: Date.now()
        });

        await sendPushToUser(
            reqData.customerUsername,
            '✅ Order Accepted!',
            `${reqData.proName} accepted your order. Complete payment now to confirm.`,
            { url: 'index.html', requestId: requestId }
        );

        showGlobalToast('✅ Order accepted! Customer has been notified to complete payment.');
        loadPendingOrderRequests(proId);

    } catch (err) {
        console.error('Accept order request error:', err);
        showGlobalToast('❌ Failed to accept order. Try again.');
    }
}

// ════════════════════════════════════════════════════════════
//  ✕ REJECT ORDER REQUEST (with reason)
// ════════════════════════════════════════════════════════════
function openRejectReasonModal(proId, requestId) {
    activeRejectProId = proId;
    activeRejectRequestId = requestId;
    document.getElementById('reject-reason-select').value = '';
    document.getElementById('reject-reason-note').value = '';
    document.getElementById('reject-reason-overlay').style.display = 'flex';
}

function closeRejectReasonModal() {
    document.getElementById('reject-reason-overlay').style.display = 'none';
    activeRejectProId = null;
    activeRejectRequestId = null;
}

async function confirmRejectOrderRequest() {
   if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; } 
    const reason = document.getElementById('reject-reason-select').value;
    const note = document.getElementById('reject-reason-note').value.trim();

    if (!reason) { showGlobalToast('⚠️ Please select a reason!'); return; }

    const proId = activeRejectProId;
    const requestId = activeRejectRequestId;

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const reqSnap = await firebase.database().ref(`providers/${proId}/orderRequests/${requestId}`).once('value');
        const reqData = reqSnap.val();
        if (!reqData) return;

        await firebase.database().ref(`providers/${proId}/orderRequests/${requestId}`).update({
            status: 'rejected',
            rejectReason: reason,
            rejectNote: note || null,
            rejectedAt: Date.now()
        });

        await firebase.database().ref(`customers/${reqData.customerUsername}/sentOrderRequests/${requestId}`).update({
            status: 'rejected',
            rejectReason: reason,
            rejectNote: note || null,
            rejectedAt: Date.now()
        });

        const reasonLabels = {
            item_unavailable: 'The item is no longer available',
            delivery_unavailable: 'Vendor cannot deliver to your location',
            time_unavailable: 'Vendor cannot meet your requested time',
            other: 'Vendor was unable to fulfill this order'
        };

        await firebase.database().ref(`customers/${reqData.customerUsername}/notifications`).push({
            type: 'order_rejected',
            title: '❌ Order Request Declined',
            message: `${reqData.proName}: ${reasonLabels[reason] || 'Unable to fulfill this order'}`,
            read: false,
            createdAt: Date.now()
        });

        await sendPushToUser(
            reqData.customerUsername,
            '❌ Order Request Declined',
            reasonLabels[reason] || 'Unable to fulfill this order',
            { url: 'index.html' }
        );

        // Track vendor reliability
        await trackVendorRejection(proId, reason);

        // If item marked unavailable, auto-hide related story/menu visibility
        if (reason === 'item_unavailable') {
            await autoHideUnavailableItem(proId, reqData.itemName);
        }

        closeRejectReasonModal();
        showGlobalToast('Order rejected. Customer has been notified.');
        loadPendingOrderRequests(proId);

    } catch (err) {
        console.error('Reject order request error:', err);
        showGlobalToast('❌ Failed to reject order. Try again.');
    }
}

// ════════════════════════════════════════════════════════════
//  📉 VENDOR RELIABILITY TRACKER
// ════════════════════════════════════════════════════════════
// ── TRACK PROFILE VIEW (Visitors Today) ──
function mbTrackProfileView(proId) {
    (async () => {
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;
        const viewerUsername = localStorage.getItem('nexus_user_session');
        if (viewerUsername && String(viewerUsername) === String(proId)) return; // kada mu ƙidaya kai da kansa
        if (typeof guaranteeAuth === 'function') await guaranteeAuth();
        const todayKey = new Date().toISOString().slice(0,10);
        const viewRef = firebase.database().ref(`providers/${proId}/analytics/views/${todayKey}`);
        viewRef.transaction(current => (current || 0) + 1);
    } catch (err) {
        console.warn('mbTrackProfileView error:', err);
    }
    })();
    }
async function trackVendorRejection(proId, reason) {
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const statsRef = firebase.database().ref(`providers/${proId}/reliabilityStats`);
        const snap = await statsRef.once('value');
        const stats = snap.val() || { totalRejections: 0, itemUnavailableCount: 0, rejectionLog: [] };

        stats.totalRejections = (stats.totalRejections || 0) + 1;
        if (reason === 'item_unavailable') {
            stats.itemUnavailableCount = (stats.itemUnavailableCount || 0) + 1;
        }

        // Keep a rolling log of last 30 days for pattern detection
        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        const log = (stats.rejectionLog || []).filter(entry => entry.timestamp > thirtyDaysAgo);
        log.push({ reason, timestamp: now });
        stats.rejectionLog = log;

        await statsRef.set(stats);

        // Check for suspicious pattern: too many item_unavailable rejections in short window
        await checkVendorReliabilityFlags(proId, log);

    } catch (err) {
        console.warn('trackVendorRejection error:', err);
    }
}

async function checkVendorReliabilityFlags(proId, rejectionLog) {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentRejections = rejectionLog.filter(entry => entry.timestamp > sevenDaysAgo);
    const recentItemUnavailable = recentRejections.filter(entry => entry.reason === 'item_unavailable');

    // Flag threshold: 5+ rejections in 7 days, or 3+ item_unavailable claims in 7 days
    const shouldFlag = recentRejections.length >= 5 || recentItemUnavailable.length >= 3;

    if (shouldFlag) {
        try {
            const flagId = `flag_${Date.now()}`;
            await firebase.database().ref(`admin/reliability_flags/${flagId}`).set({
                proId: String(proId),
                reason: recentItemUnavailable.length >= 3
                    ? 'Repeated "item unavailable" rejections — possible inventory misrepresentation'
                    : 'High rejection frequency in the past 7 days',
                rejectionCount7d: recentRejections.length,
                itemUnavailableCount7d: recentItemUnavailable.length,
                status: 'unreviewed',
                createdAt: Date.now()
            });
        } catch (err) {
            console.warn('checkVendorReliabilityFlags error:', err);
        }
    }
}

// ════════════════════════════════════════════════════════════
//  🚫 AUTO-HIDE UNAVAILABLE ITEM FROM STORY/DISPLAY
// ════════════════════════════════════════════════════════════
async function autoHideUnavailableItem(proId, itemName) {
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const today = getNowNigeria().toISOString().slice(0, 10);
        const storyRef = firebase.database().ref(`daily_stories/${proId}/${today}`);
        const snap = await storyRef.once('value');
        const storyData = snap.val();

        if (storyData && storyData.uploads) {
            const filteredUploads = storyData.uploads.filter(u => u.dishName !== itemName);

            if (filteredUploads.length === 0) {
                // No uploads left for today — deactivate the story entirely
                await storyRef.update({ active: false, expiredAt: Date.now() });
            } else {
                await storyRef.update({ uploads: filteredUploads });
            }
        }

        showGlobalToast(`📸 "${itemName}" has been removed from today's story.`);

    } catch (err) {
        console.warn('autoHideUnavailableItem error:', err);
    }
    }

// ════════════════════════════════════════════════════════════
//  📡 CUSTOMER ORDER STATUS LISTENER
// ════════════════════════════════════════════════════════════
let activeOrderStatusListener = null;
let activeOrderStatusRequestId = null;
let activeOrderStatusProId = null;
let paymentCountdownInterval = null;

function showOrderStatusOverlay(proId, requestId) {
    activeOrderStatusProId = proId;
    activeOrderStatusRequestId = requestId;

    document.getElementById('order-status-icon').textContent = '⏳';
    document.getElementById('order-status-title').textContent = 'Waiting for Vendor...';
    document.getElementById('order-status-sub').textContent = 'Your request has been sent. Please wait while the vendor reviews your order.';
    document.getElementById('order-status-countdown').style.display = 'none';

    document.getElementById('order-status-overlay').style.display = 'flex';

    listenToOrderRequestStatus(proId, requestId);
}

function closeOrderStatusOverlay() {
    document.getElementById('order-status-overlay').style.display = 'none';
    if (paymentCountdownInterval) clearInterval(paymentCountdownInterval);
}

function listenToOrderRequestStatus(proId, requestId) {
    if (typeof firebase === 'undefined' || !firebase.database) return;

    // Detach any previous listener
    if (activeOrderStatusListener) {
        firebase.database().ref(`providers/${proId}/orderRequests/${requestId}`).off('value', activeOrderStatusListener);
    }

    activeOrderStatusListener = firebase.database()
        .ref(`providers/${proId}/orderRequests/${requestId}`)
        .on('value', (snap) => {
            const data = snap.val();
            if (!data) return;

            if (data.status === 'accepted_awaiting_payment') {
                handleOrderAcceptedUI(proId, requestId, data);
            } else if (data.status === 'rejected') {
                handleOrderRejectedUI(data);
            } else if (data.status === 'cancelled_no_payment') {
                handleOrderExpiredUI();
            }
        });
}

function handleOrderAcceptedUI(proId, requestId, data) {
    // Stop listening for further status pings on this screen since we now move to payment
    if (activeOrderStatusListener) {
        firebase.database().ref(`providers/${proId}/orderRequests/${requestId}`).off('value', activeOrderStatusListener);
        activeOrderStatusListener = null;
    }

    document.getElementById('order-status-icon').textContent = '✅';
    document.getElementById('order-status-title').textContent = 'Order Accepted!';
    document.getElementById('order-status-sub').textContent = 'The vendor confirmed your order is available. Complete payment now to secure it.';

    // Show countdown then auto-open payment overlay
    setTimeout(() => {
        document.getElementById('order-status-overlay').style.display = 'none';
        openPaymentWindowOverlay(proId, requestId, data);
    }, 1200);
}

function handleOrderRejectedUI(data) {
    if (activeOrderStatusListener) {
        firebase.database().ref(`providers/${activeOrderStatusProId}/orderRequests/${activeOrderStatusRequestId}`).off('value', activeOrderStatusListener);
        activeOrderStatusListener = null;
    }

    const reasonLabels = {
        item_unavailable: 'The item is no longer available',
        delivery_unavailable: 'Vendor cannot deliver to your location',
        time_unavailable: 'Vendor cannot meet your requested time',
        other: 'Vendor was unable to fulfill this order'
    };

    document.getElementById('order-status-icon').textContent = '❌';
    document.getElementById('order-status-title').textContent = 'Request Declined';
    document.getElementById('order-status-sub').textContent = reasonLabels[data.rejectReason] || 'This vendor could not fulfill your request.';
}

function handleOrderExpiredUI() {
    if (activeOrderStatusListener) {
        firebase.database().ref(`providers/${activeOrderStatusProId}/orderRequests/${activeOrderStatusRequestId}`).off('value', activeOrderStatusListener);
        activeOrderStatusListener = null;
    }
    document.getElementById('order-status-icon').textContent = '⌛';
    document.getElementById('order-status-title').textContent = 'Request Expired';
    document.getElementById('order-status-sub').textContent = 'You did not complete payment in time, so this request was automatically cancelled.';
}

// ════════════════════════════════════════════════════════════
//  💳 PAYMENT WINDOW — auto-opens after vendor accepts
// ════════════════════════════════════════════════════════════
let activePaymentRequestId = null;
let activePaymentProId = null;
let paymentDeadlineTimestamp = null;

function openPaymentWindowOverlay(proId, requestId, requestData) {
    activePaymentProId = proId;
    activePaymentRequestId = requestId;
    paymentDeadlineTimestamp = requestData.paymentDeadline;

    document.getElementById('pw-item-name').textContent = `${requestData.quantity}x ${requestData.itemName}`;
    const unitPrice = parseInt(String(requestData.itemPrice).replace(/[^\d]/g, '')) || 0;
    document.getElementById('pw-item-total').textContent = formatPrice(unitPrice * requestData.quantity, requestData.currency);
    // Fetch vendor bank details
    if (typeof firebase !== 'undefined' && firebase.database) {
        firebase.database().ref(`providers/${proId}/bankDetails`).once('value').then(snap => {
            const bank = snap.val() || {};
            document.getElementById('pw-vendor-bank').textContent = bank.bankName || 'Bank info not set';
            document.getElementById('pw-vendor-acct').textContent = bank.accountNumber || '—';
            document.getElementById('pw-vendor-acctname').textContent = bank.accountName || '';
        });
    }

    document.getElementById('payment-window-overlay').style.display = 'flex';
    startPaymentCountdown();
}

function startPaymentCountdown() {
    if (paymentCountdownInterval) clearInterval(paymentCountdownInterval);

    function tick() {
        const remaining = paymentDeadlineTimestamp - Date.now();
        const countdownEl = document.getElementById('payment-window-countdown');

        if (remaining <= 0) {
            clearInterval(paymentCountdownInterval);
            countdownEl.textContent = '00:00';
            handlePaymentDeadlineExpired();
            return;
        }

        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        countdownEl.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    }

    tick();
    paymentCountdownInterval = setInterval(tick, 1000);
}

async function handlePaymentDeadlineExpired() {
    document.getElementById('payment-window-overlay').style.display = 'none';
    showGlobalToast('⌛ Payment window expired. Order has been cancelled.');

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const reqSnap = await firebase.database()
            .ref(`providers/${activePaymentProId}/orderRequests/${activePaymentRequestId}`)
            .once('value');
        const reqData = reqSnap.val();
        if (!reqData || reqData.status !== 'accepted_awaiting_payment') return; // already handled

        await firebase.database().ref(`providers/${activePaymentProId}/orderRequests/${activePaymentRequestId}`).update({
            status: 'cancelled_no_payment',
            cancelledAt: Date.now()
        });

        await firebase.database().ref(`customers/${reqData.customerUsername}/sentOrderRequests/${activePaymentRequestId}`).update({
            status: 'cancelled_no_payment',
            cancelledAt: Date.now()
        });

        // Notify vendor their time wasn't wasted for nothing — order is closed
        await firebase.database().ref(`providers/${activePaymentProId}/notifications`).push({
            type: 'message',
            title: '⌛ Order Auto-Cancelled',
            message: `Customer did not complete payment in time for ${reqData.itemName}. No action needed.`,
            read: false,
            createdAt: Date.now()
        });

        // Track customer no-show strike
        await trackCustomerNoShowStrike(reqData.customerUsername);

    } catch (err) {
        console.warn('handlePaymentDeadlineExpired error:', err);
    }
}

async function submitFinalPayment() {
  if (!(await guaranteeAuth())) { showGlobalToast('⚠️ Please login again.'); setTimeout(()=>window.location.href='login.html',1200); return; }  
    const btn = document.getElementById('pw-submit-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Confirming...';

    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const proId = activePaymentProId;
        const requestId = activePaymentRequestId;

        const reqSnap = await firebase.database().ref(`providers/${proId}/orderRequests/${requestId}`).once('value');
        const reqData = reqSnap.val();
        if (!reqData) { showGlobalToast('❌ Request not found.'); return; }

        // Check deadline hasn't already passed (race condition safety)
        if (Date.now() > reqData.paymentDeadline) {
            showGlobalToast('⌛ Payment window has expired.');
            document.getElementById('payment-window-overlay').style.display = 'none';
            return;
        }

        const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
        const finalOrderPayload = {
            orderId,
            itemName: reqData.itemName,
            itemPrice: reqData.itemPrice,
            quantity: reqData.quantity,
            fulfillmentMethod: reqData.fulfillmentMethod,
            address: reqData.address,
            phone: reqData.phone,
            deliveryTimePreference: reqData.deliveryTimePreference,
            customerUsername: reqData.customerUsername,
            proName: reqData.proName,
            proId: String(proId),
            status: 'pending',
            paidAt: Date.now(),
            createdAt: Date.now()
        };

        await firebase.database().ref(`providers/${proId}/orders/${orderId}`).set(finalOrderPayload);
        await firebase.database().ref(`customers/${reqData.customerUsername}/sentRequests/${orderId}`).set(finalOrderPayload);

        // Mark original request as completed
        await firebase.database().ref(`providers/${proId}/orderRequests/${requestId}`).update({
            status: 'payment_completed',
            completedAt: Date.now()
        });

        await firebase.database().ref(`providers/${proId}/notifications`).push({
            type: 'message',
            title: '💳 Payment Received',
            message: `Payment confirmed for ${reqData.quantity}x ${reqData.itemName}. Please prepare and set delivery ETA.`,
            read: false,
            createdAt: Date.now()
        });

        await alertAdminNewOrder(finalOrderPayload);

        clearInterval(paymentCountdownInterval);
        document.getElementById('payment-window-overlay').style.display = 'none';
        document.getElementById('ps-success-overlay-inline').style.display = 'flex';

    } catch (err) {
        console.error('submitFinalPayment error:', err);
        showGlobalToast('❌ Failed to confirm payment. Try again.');
    }

    btn.disabled = false;
    btn.textContent = "I've Paid — Confirm Order ✅";
}

// ════════════════════════════════════════════════════════════
//  🚫 CUSTOMER NO-SHOW STRIKE SYSTEM
// ════════════════════════════════════════════════════════════
async function trackCustomerNoShowStrike(username) {
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        const statsRef = firebase.database().ref(`customers/${username}/reliabilityStats`);
        const snap = await statsRef.once('value');
        const stats = snap.val() || { totalStrikes: 0, strikeLog: [] };

        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        const log = (stats.strikeLog || []).filter(entry => entry.timestamp > thirtyDaysAgo);
        log.push({ reason: 'payment_not_completed', timestamp: now });

        stats.totalStrikes = (stats.totalStrikes || 0) + 1;
        stats.strikeLog = log;

        await statsRef.set(stats);

        // Check strike thresholds
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const strikesLast7Days = log.filter(e => e.timestamp > sevenDaysAgo).length;
        const strikesLast30Days = log.length;

        if (strikesLast7Days >= 3) {
            await applyCustomerRestriction(username, 24, 'Repeated failure to complete payment within the allowed window (3+ times in 7 days)');
        } else if (strikesLast30Days >= 5) {
            await applyCustomerRestriction(username, 72, 'Repeated failure to complete payment within the allowed window (5+ times in 30 days)');
        }

    } catch (err) {
        console.warn('trackCustomerNoShowStrike error:', err);
    }
}

async function applyCustomerRestriction(username, hours, reason) {
    try {
        const restrictedUntil = Date.now() + (hours * 60 * 60 * 1000);
        await firebase.database().ref(`customers/${username}/restriction`).set({
            restrictedUntil,
            reason,
            appliedAt: Date.now()
        });

        await firebase.database().ref(`customers/${username}/notifications`).push({
            type: 'warning',
            title: '⚠️ Account Temporarily Restricted',
            message: `You cannot send new order requests for ${hours} hours. Reason: ${reason}`,
            read: false,
            createdAt: Date.now()
        });

        await sendPushToUser(
            username,
            '⚠️ Account Temporarily Restricted',
            `You cannot send new order requests for ${hours} hours.`,
            { url: 'index.html' }
        );
    } catch (err) {
        console.warn('applyCustomerRestriction error:', err);
    }
}

// ── CHECK RESTRICTION BEFORE ALLOWING A NEW REQUEST ──
async function isCustomerRestricted(username) {
    try {
        if (typeof firebase === 'undefined' || !firebase.database) return false;
        const snap = await firebase.database().ref(`customers/${username}/restriction`).once('value');
        const data = snap.val();
        if (!data) return false;
        if (Date.now() < data.restrictedUntil) {
            const minsLeft = Math.ceil((data.restrictedUntil - Date.now()) / 60000);
            showGlobalToast(`🚫 You are temporarily restricted. Try again in ${minsLeft} minutes.`);
            return true;
        }
        return false;
    } catch (err) {
        console.warn('isCustomerRestricted error:', err);
        return false;
    }
}

async function ensureAuthReady() {
    if (firebase.auth().currentUser) return true;
    const token = localStorage.getItem("nexus_custom_token");
    if (!token) return false;
    try {
        await firebase.auth().signInWithCustomToken(token);
        return true;
    } catch(e) {
        localStorage.removeItem("nexus_custom_token");
        return false;
    }
}

async function refreshAuthToken() {
    const sessionUser = localStorage.getItem("nexus_user_session");
    if (!sessionUser) return false;
    try {
        const res = await fetch("https://oryzon-backend-ed1q.onrender.com/get-custom-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: sessionUser })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem("nexus_custom_token", data.token);
            await firebase.auth().signInWithCustomToken(data.token);
            return true;
        }
    } catch(e) {}
    return false;
}

async function guaranteeAuth() {
    let ok = await ensureAuthReady();
    if (!ok) ok = await refreshAuthToken();
    return ok;
}
let profileMenuIsFood = false;
function switchSeg(tab) {
    document.querySelectorAll('.nxh-seg-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('seg-' + tab + '-btn').classList.add('active');
    const foodSection = document.getElementById('nxfm-food-menu-section');
    const genericWrap = document.getElementById('nxh-generic-info-wrap');
    if (foodSection) foodSection.style.display = (tab === 'menu' && profileMenuIsFood) ? '' : 'none';
    if (genericWrap) genericWrap.style.display = (tab === 'menu' && !profileMenuIsFood) ? 'block' : 'none';
    const gallerySection = document.getElementById('nxh-gallery-section');
    if (gallerySection) gallerySection.style.display = (tab === 'gallery') ? '' : 'none';

    if (tab === 'reviews' && !document.getElementById('np-reviews-inject') && currentProfileProId) {
        injectNPReviewsIntoProfile(currentProfileProId);
    }
    const reviewsInject = document.getElementById('np-reviews-inject');
    if (reviewsInject) reviewsInject.style.display = (tab === 'reviews') ? '' : 'none';
    }
// ═══════════════════════════
// AUTO-CHECK WARNINGS ON LOAD
// ═══════════════════════════
// Idan ana amfani da Firebase Auth, ka saka wannan a cikin DOMContentLoaded:
// firebase.auth().onAuthStateChanged(user => { if (user) checkProviderWarnings(user.uid); });
// Ko kuma idan username-based session:
// const sessionUser = localStorage.getItem('nexus_user_session');
// if (sessionUser) checkProviderWarnings(sessionUser);
// ── Draggable Cart FAB — so it never blocks the menu item + buttons ──
(function(){
  const fab = document.getElementById('nxfm-cart-fab');
  if (!fab) return;
  let dragging = false, moved = false, offsetX = 0, offsetY = 0;

  fab.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false;
    fab.setPointerCapture(e.pointerId);
    const rect = fab.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    fab.style.cursor = 'grabbing';
  });

  fab.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    moved = true;
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;
    x = Math.max(4, Math.min(window.innerWidth - fab.offsetWidth - 4, x));
    y = Math.max(4, Math.min(window.innerHeight - fab.offsetHeight - 4, y));
    fab.style.left = x + 'px';
    fab.style.top = y + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  });

  fab.addEventListener('pointerup', () => { dragging = false; fab.style.cursor = 'grab'; });

  fab.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  });
})();
function openGalleryLightbox(url, isVideo, evt) {
    if (evt) evt.stopPropagation();
    const overlay = document.getElementById('nxh-gallery-lightbox');
    const imgEl = document.getElementById('nxh-gallery-lightbox-img');
    const videoWrap = document.getElementById('nxh-gallery-lightbox-video-wrap');
    const videoEl = document.getElementById('nxh-gallery-lightbox-video');
    const iconsEl = document.getElementById('nxh-lightbox-video-icons');
    if (isVideo) {
        videoEl.src = url;
        videoEl.muted = false;
        document.getElementById('nxh-lightbox-mute-icon').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3z" fill="#fff"/><path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M19 6a9 9 0 0 1 0 12" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
        videoEl.play();
        videoWrap.style.display = 'block';
        iconsEl.style.display = 'none';
        imgEl.style.display = 'none'; imgEl.src = '';
    } else {
        imgEl.style.display = 'block'; imgEl.src = url;
        videoWrap.style.display = 'none'; videoEl.pause(); videoEl.src = '';
    }
    overlay.style.display = 'flex';
}
function toggleLightboxVideoPlay() {
    const videoEl = document.getElementById('nxh-gallery-lightbox-video');
    const iconsEl = document.getElementById('nxh-lightbox-video-icons');
    const playIcon = document.getElementById('nxh-lightbox-play-icon');
    if (videoEl.paused) {
        videoEl.play();
        iconsEl.style.display = 'none';
    } else {
        videoEl.pause();
        playIcon.innerHTML = '<svg width="33" height="33" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>';
        iconsEl.style.display = 'flex';
    }
}
function toggleLightboxVideoMute(event) {
    event.stopPropagation();
    const videoEl = document.getElementById('nxh-gallery-lightbox-video');
    const muteIcon = document.getElementById('nxh-lightbox-mute-icon');
    videoEl.muted = !videoEl.muted;
    muteIcon.innerHTML = videoEl.muted
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3z" fill="#fff"/><path d="M16 9l6 6M22 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3z" fill="#fff"/><path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M19 6a9 9 0 0 1 0 12" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
}
function closeGalleryLightbox() {
    const overlay = document.getElementById('nxh-gallery-lightbox');
    const videoWrap = document.getElementById('nxh-gallery-lightbox-video-wrap');
    const videoEl = document.getElementById('nxh-gallery-lightbox-video');
    videoEl.pause(); videoEl.src = '';
    videoWrap.style.display = 'none';
    overlay.style.display = 'none';
    }
function renderAllStoriesGrid(query) {
    const grid = document.getElementById('all-stories-grid');
    const q = (query || '').trim().toLowerCase();
    const flatItems = [];
    PRO_STORIES.forEach((proStory, proIndex) => {
        const pro = PROS.find(p => p.id === proStory.proId);
        proStory.stories.forEach((story, slideIndex) => {
            flatItems.push({ pro, story, proIndex, slideIndex });
        });
    });
    const filtered = flatItems.filter(({ pro, story }) => {
        if (!q) return true;
        const haystack = `${pro ? pro.name : ''} ${story.name}`.toLowerCase();
        return haystack.includes(q);
    });
    if (!filtered.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#94a3b8;font-size:13px;font-weight:600;">No matches found</div>`;
        return;
    }
    grid.innerHTML = filtered.map(({ pro, story, proIndex, slideIndex }, cardIndex) => {
        return `<div onclick="openStoryFromAllStories(${cardIndex}, ${proIndex}, ${slideIndex});" style="border-radius:18px;overflow:hidden;cursor:pointer;background:#262626 !important;border:none;">
            <div style="width:100%;aspect-ratio:1/1;background-image:url('${story.image}');background-size:cover;background-position:center;border-radius:18px;"></div>
            <div style="padding:10px 12px 12px;">
                <div style="font-weight:800;font-size:13px;color:#ffffff;">${pro?pro.name:story.name}</div>
                <div style="font-size:11.5px;color:rgba(255,255,255,0.7);margin-top:2px;">${story.name} · ${story.price}</div>
                <div style="font-size:11px;color:#fde08d;font-weight:700;margin-top:2px;">${pro?pro.distance+'km away':''}</div>
            </div>
        </div>`;
    }).join('');
}
function filterAllStoriesGrid(query) {
    renderAllStoriesGrid(query);
}
function openAllStoriesOverlay() {
    renderAllStoriesGrid();
    document.getElementById('all-stories-overlay').style.display = 'block';
}
function closeAllStoriesOverlay() {
    document.getElementById('all-stories-overlay').style.display = 'none';
}

// ============================================================
// SERVICES PAGE — INIT / DESTROY / REGISTER (SPA-ready)
// ------------------------------------------------------------
// Duk abin da tsohon code ya sanya a cikin DOMContentLoaded
// yanzu ana tara shi anan ta hanyar runOnServicesInit(), sannan
// duk ana gudanar da su a initServicesPage() — wanda NexusRouter
// ke kira KOWANE LOKACI mutum ya shigo services.html, ko ta
// native full load ko ta SPA navigation.
// ============================================================
function initServicesPage() {
    __servicesInitCallbacks.forEach(fn => {
        try { fn(); } catch (e) { console.error('services.js init callback error:', e); }
    });
}

function destroyServicesPage() {
    if (notifListener) {
        const sessionUser = localStorage.getItem('nexus_user_session');
        if (sessionUser && firebase && firebase.database) {
            firebase.database().ref(`providers/${sessionUser}/notifications`)
                .orderByChild('createdAt')
                .limitToLast(20)
                .off('value', notifListener);
        }
        notifListener = null;
    }
    if (activeOrderStatusListener && activeOrderStatusProId && activeOrderStatusRequestId) {
        firebase.database().ref(`providers/${activeOrderStatusProId}/orderRequests/${activeOrderStatusRequestId}`)
            .off('value', activeOrderStatusListener);
        activeOrderStatusListener = null;
    }
}

window.runOnServicesInit = runOnServicesInit;
window.loadRealProvidersFromFirebase = loadRealProvidersFromFirebase;
window.loadContentFromFirebase = loadContentFromFirebase;
window.renderStars = renderStars;
window.fetchProPhoto = fetchProPhoto;
window.createProCardHtml = createProCardHtml;
window.switchView = switchView;
window.pauseStoryMarquee = pauseStoryMarquee;
window.initAppElements = initAppElements;
window.getFilteredPros = getFilteredPros;
window.renderResultsPage = renderResultsPage;
window.handleCategorySelect = handleCategorySelect;
window.handleLikeToggle = handleLikeToggle;
window.triggerRouterCheck = triggerRouterCheck;
window.selectRoutePreference = selectRoutePreference;
window.openStoryDeck = openStoryDeck;
window.openStoryFromAllStories = openStoryFromAllStories;
window.openLiveDailyStory = openLiveDailyStory;
window.startStoryInterval = startStoryInterval;
window.updateStoryProgressBarOnly = updateStoryProgressBarOnly;
window.updateStoryOverlayUi = updateStoryOverlayUi;
window.closeStoryDeck = closeStoryDeck;
window.renderFoodMenuSection = renderFoodMenuSection;
window.nxfmSelectTab = nxfmSelectTab;
window.isFoodProCategory = isFoodProCategory;
window.nxfmRenderItems = nxfmRenderItems;
window.nxfmCatDesc = nxfmCatDesc;
window.closeProfileSheet = closeProfileSheet;
window.openChefMenuOverlay = openChefMenuOverlay;
window.closeChefMenuOverlay = closeChefMenuOverlay;
window.openSnacksMenuOverlay = openSnacksMenuOverlay;
window.closeSnacksMenuOverlay = closeSnacksMenuOverlay;
window.checkSnacksMenuOwnership = checkSnacksMenuOwnership;
window.toggleSnacksMenuEditMode = toggleSnacksMenuEditMode;
window.renderSnacksMenuOverlayItems = renderSnacksMenuOverlayItems;
window.openSnacksMenuItemForm = openSnacksMenuItemForm;
window.cancelSnacksMenuItemForm = cancelSnacksMenuItemForm;
window.confirmSnacksMenuItemForm = confirmSnacksMenuItemForm;
window.deleteSnacksMenuOverlayItem = deleteSnacksMenuOverlayItem;
window.saveSnacksMenuChanges = saveSnacksMenuChanges;
window.openSnacksOrderConfirm = openSnacksOrderConfirm;
window.toggleSnacksNotifyMe = toggleSnacksNotifyMe;
window.checkSnacksNotifyMeStatus = checkSnacksNotifyMeStatus;
window.openBeveragesMenuOverlay = openBeveragesMenuOverlay;
window.closeBeveragesMenuOverlay = closeBeveragesMenuOverlay;
window.checkBeveragesMenuOwnership = checkBeveragesMenuOwnership;
window.toggleBeveragesMenuEditMode = toggleBeveragesMenuEditMode;
window.renderBeveragesMenuOverlayItems = renderBeveragesMenuOverlayItems;
window.openBeveragesMenuItemForm = openBeveragesMenuItemForm;
window.cancelBeveragesMenuItemForm = cancelBeveragesMenuItemForm;
window.confirmBeveragesMenuItemForm = confirmBeveragesMenuItemForm;
window.deleteBeveragesMenuOverlayItem = deleteBeveragesMenuOverlayItem;
window.saveBeveragesMenuChanges = saveBeveragesMenuChanges;
window.openBeveragesOrderConfirm = openBeveragesOrderConfirm;
window.toggleBeveragesNotifyMe = toggleBeveragesNotifyMe;
window.checkBeveragesNotifyMeStatus = checkBeveragesNotifyMeStatus;
window.checkChefMenuOwnership = checkChefMenuOwnership;
window.toggleChefMenuEditMode = toggleChefMenuEditMode;
window.renderChefMenuOverlayItems = renderChefMenuOverlayItems;
window.openChefMenuItemForm = openChefMenuItemForm;
window.cancelChefMenuItemForm = cancelChefMenuItemForm;
window.confirmChefMenuItemForm = confirmChefMenuItemForm;
window.deleteChefMenuOverlayItem = deleteChefMenuOverlayItem;
window.openPostServiceSheet = openPostServiceSheet;
window.closePSManual = closePSManual;
window.closePSOverlay = closePSOverlay;
window.psShowStep = psShowStep;
window.psGoBack = psGoBack;
window.psGoToStep3 = psGoToStep3;
window.psDoctorGoToStep3 = psDoctorGoToStep3;
window.psVetGoToStep3 = psVetGoToStep3;
window.captureGPSInline = captureGPSInline;
window.uploadPortfolioFilesInline = uploadPortfolioFilesInline;
window.psProgressShow = psProgressShow;
window.psProgressSetPercent = psProgressSetPercent;
window.psProgressStepActive = psProgressStepActive;
window.psProgressStepDone = psProgressStepDone;
window.psProgressError = psProgressError;
window.psProgressHide = psProgressHide;
window.submitServiceInline = submitServiceInline;
window.handlePortfolioFile = handlePortfolioFile;
window.removePortfolioSlotInline = removePortfolioSlotInline;
window.handleVerificationFile = handleVerificationFile;
window.togglePSCat = togglePSCat;
window.filterInlineCategories = filterInlineCategories;
window.selectPSSub = selectPSSub;
window.psShowFoodForm = psShowFoodForm;
window.psChefGoToStep3 = psChefGoToStep3;
window.psChefGoToStep4 = psChefGoToStep4;
window.psChefGoToStep5 = psChefGoToStep5;
window.psChefGoToStep6 = psChefGoToStep6;
window.psShowChefStep = psShowChefStep;
window.getChefMenuItems = getChefMenuItems;
window.addChefMenuItem = addChefMenuItem;
window.removeChefMenuItem = removeChefMenuItem;
window.renderChefMenuList = renderChefMenuList;
window.psSnacksGoToStep3 = psSnacksGoToStep3;
window.psSnacksGoToStep4 = psSnacksGoToStep4;
window.psSnacksGoToGPS = psSnacksGoToGPS;
window.psShowSnacksStep = psShowSnacksStep;
window.addSnacksItem = addSnacksItem;
window.removeSnacksItem = removeSnacksItem;
window.renderSnacksItemsList = renderSnacksItemsList;
window.psBeveragesGoToStep3 = psBeveragesGoToStep3;
window.psBeveragesGoToStep4 = psBeveragesGoToStep4;
window.psBeveragesGoToGPS = psBeveragesGoToGPS;
window.psShowBeveragesStep = psShowBeveragesStep;
window.addBeveragesItem = addBeveragesItem;
window.removeBeveragesItem = removeBeveragesItem;
window.renderBeveragesItemsList = renderBeveragesItemsList;
window.renderChefSummary = renderChefSummary;
window.handleChefFoodPhoto = handleChefFoodPhoto;
window.removeChefFoodPhoto = removeChefFoodPhoto;
window.handleSnacksPhoto = handleSnacksPhoto;
window.removeSnacksPhoto = removeSnacksPhoto;
window.handleBeveragesPhoto = handleBeveragesPhoto;
window.removeBeveragesPhoto = removeBeveragesPhoto;
window.captureChefGPS = captureChefGPS;
window.captureSnacksGPS = captureSnacksGPS;
window.captureBeveragesGPS = captureBeveragesGPS;
window.submitChefService = submitChefService;
window.submitSnacksService = submitSnacksService;
window.submitBeveragesService = submitBeveragesService;
window.psShowToast = psShowToast;
window.getAvailableMenuForDailyUpload = getAvailableMenuForDailyUpload;
window.addDailyUploadBlock = addDailyUploadBlock;
window.removeDailyUploadBlock = removeDailyUploadBlock;
window.renderDailyUploadBlocks = renderDailyUploadBlocks;
window.setDailyUploadBlockDish = setDailyUploadBlockDish;
window.handleDailyUploadBlockPhoto = handleDailyUploadBlockPhoto;
window.removeDailyUploadBlockPhoto = removeDailyUploadBlockPhoto;
window.shareProviderProfile = shareProviderProfile;
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.selectReportReason = selectReportReason;
window.handleReportProof = handleReportProof;
window.removeReportProof = removeReportProof;
window.submitReport = submitReport;
window.openReviewModal = openReviewModal;
window.setDimStar = setDimStar;
window.submitReview = submitReview;
window.closeReviewModal = closeReviewModal;
window.checkProviderWarnings = checkProviderWarnings;
window.showWarningOverlay = showWarningOverlay;
window.acknowledgeWarning = acknowledgeWarning;
window.showGlobalToast = showGlobalToast;
window.renderServicesEditList = renderServicesEditList;
window.addServiceToEditList = addServiceToEditList;
window.removeServiceFromEditList = removeServiceFromEditList;
window.handleEditServicePhoto = handleEditServicePhoto;
window.resetEditServicePhotoSlot = resetEditServicePhotoSlot;
window.closeEditFieldsOnBg = closeEditFieldsOnBg;
window.toggleEditMode = toggleEditMode;
window.saveProfileEdits = saveProfileEdits;
window.initPushNotifications = initPushNotifications;
window.sendPushToUser = sendPushToUser;
window.initNotificationBell = initNotificationBell;
window.updateBellBadge = updateBellBadge;
window.toggleNotifPanel = toggleNotifPanel;
window.closeNotifPanel = closeNotifPanel;
window.renderNotifPanel = renderNotifPanel;
window.handleNotifClick = handleNotifClick;
window.markAllNotifsRead = markAllNotifsRead;
window.formatNotifTime = formatNotifTime;
window.openSecureChat = openSecureChat;
window.openEmergencySheet = openEmergencySheet;
window.closeEmgDropdown = closeEmgDropdown;
window.renderEmgServiceList = renderEmgServiceList;
window.toggleEmgSub = toggleEmgSub;
window.selectEmgSub = selectEmgSub;
window.filterEmgServices = filterEmgServices;
window.selectEmgService = selectEmgService;
window.attemptEmergencyGPSFix = attemptEmergencyGPSFix;
window.closeEmergencySheet = closeEmergencySheet;
window.getDistanceKm = getDistanceKm;
window.reverseGeocodeCoords = reverseGeocodeCoords;
window.captureGPSUniversal = captureGPSUniversal;
window.scanEmergencyPros = scanEmergencyPros;
window.renderEmergencyResults = renderEmergencyResults;
window.expandEmergencyRadius = expandEmergencyRadius;
window.emergencyContactPro = emergencyContactPro;
window.getProColor = getProColor;
window.getDayNameFromDateInput = getDayNameFromDateInput;
window.normalizeDayLabel = normalizeDayLabel;
window.getHireProData = getHireProData;
window.openHireSheet = openHireSheet;
window.nxfmRequestServiceQuote = nxfmRequestServiceQuote;
window.closeHireSheet = closeHireSheet;
window.closeHireSheetOnBg = closeHireSheetOnBg;
window.hireShowStep = hireShowStep;
window.hireGoBack = hireGoBack;
window.checkHireDateAvailability = checkHireDateAvailability;
window.hireGoToStep2 = hireGoToStep2;
window.writeHireRequestToFirebase = writeHireRequestToFirebase;
window.submitHireRequest = submitHireRequest;
window.submitHireChatFirst = submitHireChatFirst;
window.nxfmGetActiveViewedPro = nxfmGetActiveViewedPro;
window.nxfmCartRef = nxfmCartRef;
window.nxfmGetCart = nxfmGetCart;
window.nxfmSaveCart = nxfmSaveCart;
window.nxfmAddToCart = nxfmAddToCart;
window.nxfmGridQuickAdd = nxfmGridQuickAdd;
window.nxfmUpdateCartBadge = nxfmUpdateCartBadge;
window.openNxfmCartPage = openNxfmCartPage;
window.closeNxfmCartPage = closeNxfmCartPage;
window.renderNxfmCartPage = renderNxfmCartPage;
window.nxfmCartQtyChange = nxfmCartQtyChange;
window.nxfmCartPlaceOrder = nxfmCartPlaceOrder;
window.openItemDetail = openItemDetail;
window.itemDetailRequestQuote = itemDetailRequestQuote;
window.closeItemDetail = closeItemDetail;
window.itemDetailQtyChange = itemDetailQtyChange;
window.itemDetailAddToCart = itemDetailAddToCart;
window.openTiersSheet = openTiersSheet;
window.closeTiersSheet = closeTiersSheet;
window.tiersSheetSelect = tiersSheetSelect;
window.mbRenderMenuItem = mbRenderMenuItem;
window.openMyBusinessDashboard = openMyBusinessDashboard;
window.closeMyBusinessDashboard = closeMyBusinessDashboard;
window.mbSwitchTab = mbSwitchTab;
window.mbRenderBookingsTab = mbRenderBookingsTab;
window.mbBookingUrgency = mbBookingUrgency;
window.mbRenderBookingsList = mbRenderBookingsList;
window.mbRenderCustomersTab = mbRenderCustomersTab;
window.mbRenderCustomersList = mbRenderCustomersList;
window.mbRenderInsightsTab = mbRenderInsightsTab;
window.mbRenderReviewsTab = mbRenderReviewsTab;
window.mbRenderGalleryTab = mbRenderGalleryTab;
window.mbUploadGalleryPhoto = mbUploadGalleryPhoto;
window.mbDeleteGalleryPhoto = mbDeleteGalleryPhoto;
window.mbRenderCategoryPills = mbRenderCategoryPills;
window.mbFilterCategory = mbFilterCategory;
window.mbRenderMenuList = mbRenderMenuList;
window.mbShareMenuLink = mbShareMenuLink;
window.mbOpenAddItem = mbOpenAddItem;
window.mbOpenItemMenu = mbOpenItemMenu;
window.mbCloseItemActions = mbCloseItemActions;
window.mbActionsDelete = mbActionsDelete;
window.mbOpenEditItem = mbOpenEditItem;
window.mbCloseItemForm = mbCloseItemForm;
window.mbSetPricingType = mbSetPricingType;
window.mbAddTierRow = mbAddTierRow;
window.mbSaveItem = mbSaveItem;
window.mbDeleteItem = mbDeleteItem;
window.mbRenderTrendChart = mbRenderTrendChart;
window.mbRenderAnnouncements = mbRenderAnnouncements;
window.mbRenderOverview = mbRenderOverview;
window.mbPublish = mbPublish;
window.mbLoadOrders = mbLoadOrders;
window.mbFilterOrders = mbFilterOrders;
window.mbRenderOrders = mbRenderOrders;
window.mbUpdateOrderStatus = mbUpdateOrderStatus;
window.mbLockOverlayHTML = mbLockOverlayHTML;
window.checkProviderApprovalStatus = checkProviderApprovalStatus;
window.handlePostServiceBtnClick = handlePostServiceBtnClick;
window.mbPeriodPrice = mbPeriodPrice;
window.mbRenderCurrentPlanCard = mbRenderCurrentPlanCard;
window.mbRenderPlanCards = mbRenderPlanCards;
window.mbSetBillingPeriod = mbSetBillingPeriod;
window.mbOpenUpgradeModal = mbOpenUpgradeModal;
window.mbCloseUpgradeModal = mbCloseUpgradeModal;
window.mbSelectPlan = mbSelectPlan;
window.mbConfirmPlanChange = mbConfirmPlanChange;
window.mbGenerateAndUploadFlyer = mbGenerateAndUploadFlyer;
window.mbRefreshCategoriesData = mbRefreshCategoriesData;
window.mbOpenCategoryManager = mbOpenCategoryManager;
window.mbCloseCategoryManager = mbCloseCategoryManager;
window.mbRenderCategoryManagerList = mbRenderCategoryManagerList;
window.mbRenameCategoryAction = mbRenameCategoryAction;
window.mbDeleteCategoryAction = mbDeleteCategoryAction;
window.mbOpenCustomizeModal = mbOpenCustomizeModal;
window.mbCloseCustomizeModal = mbCloseCustomizeModal;
window.mbSelectThemeColor = mbSelectThemeColor;
window.mbUploadCoverPhoto = mbUploadCoverPhoto;
window.mbTimeOptions = mbTimeOptions;
window.mbRenderOperatingHoursRows = mbRenderOperatingHoursRows;
window.mbOpenBusinessSettings = mbOpenBusinessSettings;
window.mbCloseBusinessSettings = mbCloseBusinessSettings;
window.mbSaveBusinessSettings = mbSaveBusinessSettings;
window.mbOpenHelpModal = mbOpenHelpModal;
window.mbToggleFaq = mbToggleFaq;
window.mbOpenWhatsNewModal = mbOpenWhatsNewModal;
window.mbOpenAddCategory = mbOpenAddCategory;
window.mbCloseAddCategory = mbCloseAddCategory;
window.mbSaveNewCategory = mbSaveNewCategory;
window.openOrderConfirm = openOrderConfirm;
window.closeOrderConfirm = closeOrderConfirm;
window.confirmOrderYes = confirmOrderYes;
window.openPlaceOrderOverlay = openPlaceOrderOverlay;
window.closePlaceOrderOverlay = closePlaceOrderOverlay;
window.updateOrderTotal = updateOrderTotal;
window.submitOrderRequestOnly = submitOrderRequestOnly;
window.loadProPendingOrders = loadProPendingOrders;
window.updateOrderStatus = updateOrderStatus;
window.openCustomerOrders = openCustomerOrders;
window.closeCustomerOrders = closeCustomerOrders;
window.refreshActiveOrdersBanner = refreshActiveOrdersBanner;
window.toggleActiveOrdersList = toggleActiveOrdersList;
window.openActiveOrderDetail = openActiveOrderDetail;
window.alertAdminNewOrder = alertAdminNewOrder;
window.toggleNotifyMe = toggleNotifyMe;
window.checkNotifyMeStatus = checkNotifyMeStatus;
window.sendOrderDayNotifications = sendOrderDayNotifications;
window.renderChefMenuWelcomeArea = renderChefMenuWelcomeArea;
window.saveChefMenuChanges = saveChefMenuChanges;
window.getNowNigeria = getNowNigeria;
window.getTodayDayName = getTodayDayName;
window.getCurrentHHMM = getCurrentHHMM;
window.isWithinBusinessHours = isWithinBusinessHours;
window.isProScheduledToday = isProScheduledToday;
window.startUploadWindowChecker = startUploadWindowChecker;
window.checkUploadWindow = checkUploadWindow;
window.expireStories = expireStories;
window.showUploadWindow = showUploadWindow;
window.hideUploadWindow = hideUploadWindow;
window.showPreviousUploadsPrompt = showPreviousUploadsPrompt;
window.usePreviousUploads = usePreviousUploads;
window.startNewUpload = startNewUpload;
window.injectUploadSlotIntoProfile = injectUploadSlotIntoProfile;
window.startUploadWindowCountdown = startUploadWindowCountdown;
window.submitDailyUploads = submitDailyUploads;
window.normalizeFirebaseProvider = normalizeFirebaseProvider;
window.fetchFirebaseProviderAsPro = fetchFirebaseProviderAsPro;
window.getNPDimensions = getNPDimensions;
window.renderNPStars = renderNPStars;
window.renderNPDistBars = renderNPDistBars;
window.renderNPDimAverages = renderNPDimAverages;
window.renderNPMiniDims = renderNPMiniDims;
window.renderNPRatingSection = renderNPRatingSection;
window.renderNPReviewCards = renderNPReviewCards;
window.openRatingsFilterPage = openRatingsFilterPage;
window.closeRatingsFilterPage = closeRatingsFilterPage;
window.rfFilterDim = rfFilterDim;
window.rfFilterSentiment = rfFilterSentiment;
window.rfRenderReviews = rfRenderReviews;
window.handleNPHelpful = handleNPHelpful;
window.openIdentityOverlay = openIdentityOverlay;
window.closeIdentityOverlay = closeIdentityOverlay;
window.injectNPReviewsIntoProfile = injectNPReviewsIntoProfile;
window.trackSearchEvent = trackSearchEvent;
window.loadMostSearched = loadMostSearched;
window.openRequestServiceOverlay = openRequestServiceOverlay;
window.closeRequestServiceOverlay = closeRequestServiceOverlay;
window.submitServiceRequest = submitServiceRequest;
window.selectDeliveryPreference = selectDeliveryPreference;
window.handleDtpTimeChange = handleDtpTimeChange;
window.validateDeliveryTimePreference = validateDeliveryTimePreference;
window.loadPendingOrderRequests = loadPendingOrderRequests;
window.renderOrderRequestCardHtml = renderOrderRequestCardHtml;
window.acceptOrderRequest = acceptOrderRequest;
window.openRejectReasonModal = openRejectReasonModal;
window.closeRejectReasonModal = closeRejectReasonModal;
window.confirmRejectOrderRequest = confirmRejectOrderRequest;
window.mbTrackProfileView = mbTrackProfileView;
window.trackVendorRejection = trackVendorRejection;
window.checkVendorReliabilityFlags = checkVendorReliabilityFlags;
window.autoHideUnavailableItem = autoHideUnavailableItem;
window.showOrderStatusOverlay = showOrderStatusOverlay;
window.closeOrderStatusOverlay = closeOrderStatusOverlay;
window.listenToOrderRequestStatus = listenToOrderRequestStatus;
window.handleOrderAcceptedUI = handleOrderAcceptedUI;
window.handleOrderRejectedUI = handleOrderRejectedUI;
window.handleOrderExpiredUI = handleOrderExpiredUI;
window.openPaymentWindowOverlay = openPaymentWindowOverlay;
window.startPaymentCountdown = startPaymentCountdown;
window.handlePaymentDeadlineExpired = handlePaymentDeadlineExpired;
window.submitFinalPayment = submitFinalPayment;
window.trackCustomerNoShowStrike = trackCustomerNoShowStrike;
window.applyCustomerRestriction = applyCustomerRestriction;
window.isCustomerRestricted = isCustomerRestricted;
window.ensureAuthReady = ensureAuthReady;
window.refreshAuthToken = refreshAuthToken;
window.guaranteeAuth = guaranteeAuth;
window.switchSeg = switchSeg;
window.openGalleryLightbox = openGalleryLightbox;
window.toggleLightboxVideoPlay = toggleLightboxVideoPlay;
window.toggleLightboxVideoMute = toggleLightboxVideoMute;
window.closeGalleryLightbox = closeGalleryLightbox;
window.renderAllStoriesGrid = renderAllStoriesGrid;
window.filterAllStoriesGrid = filterAllStoriesGrid;
window.openAllStoriesOverlay = openAllStoriesOverlay;
window.closeAllStoriesOverlay = closeAllStoriesOverlay;
if (window.NexusRouter) {
    NexusRouter.registerPage('services.html', { init: initServicesPage, destroy: destroyServicesPage });
}

// SPA: router.js din shine kadai ke da alhakin kiran initServicesPage()
// bayan wannan file ya gama loda (ta runInit()). Idan an sake kiranta
// a nan MA lokacin da readyState='complete' (SPA), za a kira ta SAU
// BIYU (yana haddasa duplicate Firebase listeners/leaks a kowace SPA
// visit zuwa services.html). Saboda haka a NAN kadai muke jiran
// DOMContentLoaded (native load) — babu 'else' immediate-call, daidai
// da yadda social.js ya yi.
window.addEventListener('DOMContentLoaded', initServicesPage);
   
})();
