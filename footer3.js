/* ============================================================
   NEXUS SHARED FOOTER — footer.js  (v1.0)
   ------------------------------------------------------------
   Wannan file shine SINGLE SOURCE OF TRUTH na bottom navigation
   footer din Nexus. Duk pages guda 6 (social, services, chats,
   nexus-feed, videos, me) suna amfani da wannan file guda ɗaya.

   YADDA ANA AMFANI DA SHI a cikin kowace page:
     1) Sanya <div id="footer-placeholder"></div> a inda footer
        din yake son bayyana (yawanci kafin rufe </body>).
     2) Sanya <script src="footer.js"></script> nan bayan
        placeholder din.

   IDAN AKA SO A GYARA FOOTER (misali sauya icon, kara link, canza
   launi): a nan KAWAI ake gyara — sauyin zai bayyana a dukkan
   pages guda 6 ba tare da bude wani file ba.
   ============================================================ */

(function () {
    "use strict";

    // ------------------------------------------------------------
    // 1) CSS na footer.
    //    Background/blur din nan an DAUKO EXACT daga `header {}` na
    //    social.html (layi 43-59) — ba a kirkiri sabon launi ba.
    // ------------------------------------------------------------
    const FOOTER_CSS = `
        .nexus-footer {
            position: fixed; bottom: 0; width: 100%;
            height: calc(42px + env(safe-area-inset-bottom));
            display: flex; justify-content: space-around; align-items: center;
            z-index: 9999; padding: 0 0 env(safe-area-inset-bottom) 0;
            transition: transform 0.4s ease;
            /* --- Exact header background/blur daga social.html --- */
            background: rgba(245, 245, 247, 0.22) !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            border-top: 1px solid transparent !important;
            border-top: none !important;
            /* --- Lankwasar sama (curved top corners) --- */
            border-radius: 24px 24px 0 0;
            overflow: hidden;
        }
        .footer-hidden { transform: translateY(100%); }
        .footer-icon {
            position: relative;
            color: #fff; opacity: 0.5; cursor: pointer; height: 42px; width: 50px;
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.15s ease, opacity 0.2s ease;
        }
        .footer-icon:active { transform: scale(0.82); }
        .footer-icon.active { opacity: 1; filter: drop-shadow(0 0 5px var(--cyan-neon, #0ff)); }
        .footer-icon svg {
            display: block;
            shape-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
            transition: transform .18s ease;
        }
        .footer-icon:active svg { transform: scale(.92); }
        .profile-img { width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid #fff; object-fit: cover; }
        .notif-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            min-width: 16px;
            height: 16px;
            padding: 0 4px;
            border-radius: 9px;
            background: linear-gradient(135deg, #ff6b6b, #e5383b);
            border: 1.5px solid #050505;
            color: #fff;
            font-size: 9.5px;
            font-weight: 800;
            font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
            display: none;
            align-items: center;
            justify-content: center;
            line-height: 1;
            box-shadow: 0 0 6px rgba(229, 56, 59, 0.6);
            animation: notifBadgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .notif-badge.show { display: flex; }
        @keyframes notifBadgePop {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `;

    // ------------------------------------------------------------
    // 2) HTML na footer — data-page attribute ne ke tantance wace
    //    icon ce "active" gwargwadon page din da user yake yanzu.
    // ------------------------------------------------------------
    const FOOTER_HTML = `
    <nav class="nexus-footer" id="instaFooter">
        <div class="footer-icon" data-page="social.html" onclick="window.location.href='social.html'">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z"/></svg>
        </div>

        <div class="footer-icon" data-page="services.html" onclick="window.location.href='services.html'">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <span class="notif-badge" id="servicesBadgeCount">0</span>
        </div>

        <div class="footer-icon" data-page="chats.html" onclick="window.location.href='chats.html'">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-12.7 8.38 8.38 0 013.8.9L21 3z"/></svg>
            <span class="notif-badge" id="chatBadgeCount">0</span>
        </div>

        <div class="footer-icon" data-page="nexus-feed.html" onclick="window.location.href='nexus-feed.html'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="10" cy="10" r="6.7" />
                <path d="M15.3 15.3L20 20" />
            </svg>
        </div>

        <div class="footer-icon" data-page="videos.html" onclick="window.location.href='videos.html';" style="cursor: pointer;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="5" ry="5" />
                <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
            </svg>
        </div>

        <div class="footer-icon" data-page="me.html" onclick="window.location.href='me.html'">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Sadiq" alt="" class="profile-img" id="footerProfileImg" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Sadiq'">
        </div>
    </nav>
    `;

    // ------------------------------------------------------------
    // 3) Loda hoton profile daga localStorage (kamar yadda yake
    //    a asali a kowace page).
    // ------------------------------------------------------------
    function loadFooterProfile() {
        const savedPic = localStorage.getItem('userProfilePic');
        const footerImg = document.getElementById('footerProfileImg');
        if (savedPic && footerImg) {
            footerImg.src = savedPic;
        } else if (footerImg) {
            footerImg.src = "https://api.dicebear.com/7.x/bottts/svg?seed=Sadiq";
        }
    }
    // An bar shi a duniya (global) domin idan wata page take son sake
    // loda hoton (misali bayan an canza profile pic a me.html) za ta iya
    // kiran window.loadFooterProfile() kai tsaye.
    window.loadFooterProfile = loadFooterProfile;

    // ------------------------------------------------------------
    // 4) Sanya "active" akan icon din page din da ake ciki yanzu.
    // ------------------------------------------------------------
    function setActiveIcon() {
        let currentPage = window.location.pathname.split('/').pop();
        if (!currentPage) currentPage = 'social.html'; // default idan "/" ne kadai

        document.querySelectorAll('#instaFooter .footer-icon[data-page]').forEach(icon => {
            icon.classList.toggle('active', icon.getAttribute('data-page') === currentPage);
        });
    }

    // ------------------------------------------------------------
    // 5) Scroll behavior: idan ana "scrolling up" sai footer ta boye.
    //    Idan an daina scrolling na tsawon 2.5s, sai ta sake bayyana
    //    kai tsaye (automatic).
    // ------------------------------------------------------------
    let lastScrollY = window.scrollY;
    let footerIdleTimer = null;

    function setupScrollBehavior() {
        window.addEventListener('scroll', function () {
            const footer = document.getElementById('instaFooter');
            if (!footer) return;

            const currentY = window.scrollY;

            // Scrolling UP => boye footer
            if (currentY < lastScrollY) {
                footer.classList.add('footer-hidden');
            }
            lastScrollY = currentY;

            // Bayan 2.5s babu scrolling => sake bayyana ta kanta
            clearTimeout(footerIdleTimer);
            footerIdleTimer = setTimeout(() => {
                footer.classList.remove('footer-hidden');
            }, 2500);
        }, { passive: true });
    }

    // ------------------------------------------------------------
    // 6) Services badge — adadin sabbin vendor notifications
    //    (sabon order/request) daga Realtime Database:
    //    providers/{username}/notifications/{id}/read
    //    Wannan ita ce hanyar da services.html ke amfani da ita a
    //    updateBellBadge(), don haka mun bi daidai wannan tsari.
    // ------------------------------------------------------------
    function listenServicesBadgeCount() {
        const sessionUser = localStorage.getItem('nexus_user_session');
        if (!sessionUser) return;

        function attachListener() {
            if (!window.firebase || !firebase.database) {
                // Firebase bata riga ta shirya ba, sake gwadawa bayan dan lokaci
                setTimeout(attachListener, 1000);
                return;
            }
            firebase.database().ref(`providers/${sessionUser}/notifications`)
                .on('value', (snap) => {
                    const badge = document.getElementById('servicesBadgeCount');
                    if (!badge) return;
                    const data = snap.val() || {};
                    const unread = Object.values(data).filter(n => n && !n.read).length;
                    badge.textContent = unread > 9 ? '9+' : unread;
                    badge.classList.toggle('show', unread > 0);
                }, err => console.error('Services badge error:', err));
        }
        attachListener();
    }

    // ------------------------------------------------------------
    // 7) Saka CSS + HTML a cikin page, sannan kunna logic din sama.
    // ------------------------------------------------------------
    function injectFooter() {
        const placeholder = document.getElementById('footer-placeholder');
        if (!placeholder) {
            console.error('footer.js: ba a sami <div id="footer-placeholder"></div> a wannan page ba.');
            return;
        }

        // CSS (sau daya kawai, ko da an loda footer.js a pages da dama)
        if (!document.getElementById('nexus-footer-styles')) {
            const styleTag = document.createElement('style');
            styleTag.id = 'nexus-footer-styles';
            styleTag.textContent = FOOTER_CSS;
            document.head.appendChild(styleTag);
        }

        // HTML
        placeholder.outerHTML = FOOTER_HTML;

        setActiveIcon();
        loadFooterProfile();
        setupScrollBehavior();
        listenServicesBadgeCount();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectFooter);
    } else {
        injectFooter();
    }
})();
