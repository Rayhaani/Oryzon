/* ============================================================
   NEXUS SHARED FOOTER — footer.js  (v1.2)
   ------------------------------------------------------------
   Wannan file shine SINGLE SOURCE OF TRUTH na bottom navigation
   footer din Nexus. Duk pages guda 6 (social, services, chats,
   nexus-feed, videos, me) suna amfani da wannan file guda ɗaya.

   YADDA ANA AMFANI DA SHI a cikin kowace page:
     1) Sanya <div id="footer-placeholder"></div> a inda footer
        din yake son bayyana (yawanci kafin rufe </body>).
     2) Sanya <script src="footer.js"></script> nan bayan
        placeholder din.

   v1.2 CHANGES (bisa ga bukatar user):
   - .nexus-footer (outer wrapper) YANZU TRANSPARENT GABA DAYA —
     an cire background, backdrop-filter, da border-radius dinta.
     Babu "panel" a bayan capsule bar din yanzu; capsule bar din
     kadai ne ke bayyana, kai tsaye a bakin page background,
     EXACTLY yadda .post-action-capsules / .post-capsule suke
     zaune kai tsaye a bakin post-media a post-card-template.js
     (babu wani extra wrapper background a can ma).
   - Tazarar kasan bar din da kasan screen yanzu 6px + safe-area,
     daidai da yadda .post-interaction-bar ke da 6px padding
     daga kasan card din a post-card-template.js.
   - .footer-capsule-bar / .footer-icon.post-capsule an tabbatar
     sun yi daidai-daidai (background, blur, border, radius,
     padding, height, min-width, gap) da
     .post-action-capsules / .post-capsule na template.
     Bambance-bambancen da suka rage (flex:1 + space-around akan
     bar, da active/inactive gold state akan icon) dole ne su
     kasance domin dalilai na AIKI kadai (footer yana da icons 6
     da za a rarraba daidai a fadin screen, kuma yana bukatar
     nuna wace page ake ciki yanzu) — babu su a post card domin
     babu irin wannan bukata a can.
   ============================================================ */

(function () {
    "use strict";

    // ------------------------------------------------------------
    // 1) CSS na footer.
    // ------------------------------------------------------------
    const FOOTER_CSS = `
        .nexus-footer {
            position: fixed; bottom: 0; width: 100%;
            height: calc(42px + env(safe-area-inset-bottom));
            display: flex; justify-content: center; align-items: center;
            z-index: 9999;
            padding: 0 8px calc(6px + env(safe-area-inset-bottom)) 8px;
            box-sizing: border-box;
            transition: transform 0.4s ease;

            /* ✅ TRANSPARENT GABA DAYA — babu panel/background a bayan
               capsule bar din. Capsule bar din kadai ke bayyana, kai
               tsaye a bakin page background, kamar yadda .post-action-
               capsules ke zaune kai tsaye a bakin post-media, babu wani
               extra wrapper a bayansa. */
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border-top: none !important;
            border-radius: 0 !important;
            overflow: visible;
        }
        .footer-hidden { transform: translateY(100%); }

        /* ===== CAPSULE BAR WRAPPER — EXACT daga
           .post-action-capsules / .action-capsules (FINAL override
           state) na post-card-template.js ===== */
        .footer-capsule-bar {
            display: flex !important;
            justify-content: space-around !important; /* footer-specific: rarraba icons 6 daidai a fadin screen */
            align-items: center !important;
            gap: 4px !important;
            flex: 1 !important;
            background: rgba(0, 0, 0, 0.6) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-radius: 30px !important;
            padding: 3px !important;
        }

        /* ===== INDIVIDUAL CAPSULE — EXACT daga
           .post-capsule / .capsule na post-card-template.js ===== */
        .footer-icon.post-capsule {
            position: relative;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            padding: 5px 12px !important;
            border-radius: 20px !important;
            color: #ffffff !important;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6) !important;
            transition: all 0.2s ease !important;
            min-width: 44px !important;
            height: 30px !important;
            cursor: pointer !important;
            flex: 1 !important; /* footer-specific: rarraba fadin bar daidai tsakanin icons 6 */
        }

        .footer-icon.post-capsule:active {
            background: rgba(255, 255, 255, 0.12) !important;
            transform: scale(0.95) !important;
        }

        /* Icon color — inactive/active state (footer-specific;
           babu irin wannan concept a post card domin babu "current
           page" a can) */
        .footer-icon.post-capsule svg {
            color: rgba(255, 255, 255, 0.55) !important;
            transition: color 0.2s ease, transform 0.18s ease, filter 0.2s ease;
        }
        .footer-icon.post-capsule:active svg { transform: scale(.92); }

        .footer-icon.post-capsule.active svg {
            color: var(--premium-gold, #fde08d) !important;
            filter: drop-shadow(0 0 5px rgba(253, 224, 141, 0.5));
        }

        .profile-img {
            width: 26px; height: 26px; border-radius: 50%;
            border: 1.5px solid #fff; object-fit: cover;
            transition: border-color 0.2s ease;
        }
        .footer-icon.post-capsule.active .profile-img {
            border-color: var(--premium-gold, #fde08d);
        }

        .notif-badge {
            position: absolute;
            top: -2px;
            right: 2px;
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
    // 2) HTML na footer.
    // ------------------------------------------------------------
    const FOOTER_HTML = `
    <nav class="nexus-footer" id="instaFooter">
        <div class="footer-capsule-bar">
            <div class="footer-icon post-capsule" data-page="social.html" onclick="window.location.href='social.html'">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z"/></svg>
            </div>

            <div class="footer-icon post-capsule" data-page="services.html" onclick="window.location.href='services.html'">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <span class="notif-badge" id="servicesBadgeCount">0</span>
            </div>

            <div class="footer-icon post-capsule" data-page="chats.html" onclick="window.location.href='chats.html'">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-12.7 8.38 8.38 0 013.8.9L21 3z"/></svg>
                <span class="notif-badge" id="chatBadgeCount">0</span>
            </div>

            <div class="footer-icon post-capsule" data-page="nexus-feed.html" onclick="window.location.href='nexus-feed.html'">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="10" cy="10" r="6.7" />
                    <path d="M15.3 15.3L20 20" />
                </svg>
            </div>

            <div class="footer-icon post-capsule" data-page="videos.html" onclick="window.location.href='videos.html';" style="cursor: pointer;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="3" width="20" height="18" rx="5" ry="5" />
                    <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
                </svg>
            </div>

            <div class="footer-icon post-capsule" data-page="me.html" onclick="window.location.href='me.html'">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Sadiq" alt="" class="profile-img" id="footerProfileImg" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Sadiq'">
            </div>
        </div>
    </nav>
    `;

    // ------------------------------------------------------------
    // 3) Loda hoton profile daga localStorage.
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
    window.loadFooterProfile = loadFooterProfile;

    // ------------------------------------------------------------
    // 4) Sanya "active" akan icon din page din da ake ciki yanzu.
    // ------------------------------------------------------------
    function setActiveIcon() {
        let currentPage = window.location.pathname.split('/').pop();
        if (!currentPage) currentPage = 'social.html';

        document.querySelectorAll('#instaFooter .footer-icon[data-page]').forEach(icon => {
            icon.classList.toggle('active', icon.getAttribute('data-page') === currentPage);
        });
    }

    // ------------------------------------------------------------
    // 5) Scroll behavior.
    // ------------------------------------------------------------
    let lastScrollY = window.scrollY;
    let footerIdleTimer = null;
    const SCROLL_THRESHOLD = 6;

    function setupScrollBehavior() {
        window.addEventListener('scroll', function () {
            const footer = document.getElementById('instaFooter');
            if (!footer) return;

            const currentY = Math.max(0, window.scrollY);
            const delta = currentY - lastScrollY;

            if (delta < -SCROLL_THRESHOLD) {
                footer.classList.add('footer-hidden');
            }
            lastScrollY = currentY;

            clearTimeout(footerIdleTimer);
            footerIdleTimer = setTimeout(() => {
                footer.classList.remove('footer-hidden');
            }, 2000);
        }, { passive: true });

        setTimeout(() => { lastScrollY = window.scrollY; }, 300);
    }

    // ------------------------------------------------------------
    // 6) Services badge.
    // ------------------------------------------------------------
    function listenServicesBadgeCount() {
        const sessionUser = localStorage.getItem('nexus_user_session');
        if (!sessionUser) return;

        function attachListener() {
            if (!window.firebase || !firebase.database) {
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

        if (!document.getElementById('nexus-footer-styles')) {
            const styleTag = document.createElement('style');
            styleTag.id = 'nexus-footer-styles';
            styleTag.textContent = FOOTER_CSS;
            document.head.appendChild(styleTag);
        }

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
