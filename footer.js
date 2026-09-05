/* ============================================================
   NEXUS SHARED FOOTER — footer.js  (v1.3 — SPA-ready)
   ------------------------------------------------------------
   v1.3 CHANGES (SPA fix):
   - An CIRE duk onclick="window.location.href='...'" daga icons.
     Wadannan suna yin FULL PAGE RELOAD nan take, kafin router.js
     ya taba samun dama ya kama click din ta hanyar sa document
     click listener (domin inline onclick attribute yana gudana
     kai tsaye, ba ya jira komai). data-page attribute din shi
     kadai yanzu ke can — kuma router.js (via [data-spa-link],
     [data-page] selector) shi ke kama click din, ya yi
     navigateTo() maimakon reload.
   - An kara saurara event din 'nexus:routechange' da router.js
     ke harbawa bayan kowace SPA navigation, domin a sake kiran
     setActiveIcon() kuma icon din da ya dace ya sami gold state
     din 'active' ko da an je wata page ba tare da reload ba.
   ============================================================ */

(function () {
    "use strict";

    // ------------------------------------------------------------
    // 1) CSS na footer. (Ba a canza komai a nan — daga v1.2)
    // ------------------------------------------------------------
    const FOOTER_CSS = `
        .nexus-footer {
            position: fixed !important; bottom: 0 !important; width: 100% !important;
            height: calc(42px + env(safe-area-inset-bottom));
            display: flex; justify-content: center; align-items: center;
            z-index: 9999;
            padding: 0 8px calc(6px + env(safe-area-inset-bottom)) 8px;
            box-sizing: border-box;
            transition: transform 0.4s ease;
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border-top: none !important;
            border-radius: 0 !important;
            overflow: visible;
        }
        .footer-hidden { transform: translateY(100%); }

        .footer-capsule-bar {
            display: flex !important;
            justify-content: space-around !important;
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
            flex: 1 !important;
        }

        .footer-icon.post-capsule:active {
            background: rgba(255, 255, 255, 0.12) !important;
            transform: scale(0.95) !important;
        }

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
        .chat-nav-dot {
            min-width: 10px !important;
            width: 10px;
            height: 10px !important;
            padding: 0 !important;
            font-size: 0 !important;
            border-radius: 50% !important;
            top: 0px !important;
            right: 4px !important;
        }
    `;

    // ------------------------------------------------------------
    // 2) HTML na footer.
    //    MUHIMMI: babu onclick="window.location.href=...'" — an
    //    cire su duka. data-page kadai ke can yanzu; router.js ne
    //    ke kama click din ya yi SPA navigate maimakon full reload.
    // ------------------------------------------------------------
    const FOOTER_HTML = `
    <nav class="nexus-footer" id="instaFooter">
        <div class="footer-capsule-bar">
            <div class="footer-icon post-capsule" data-page="social.html">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z"/></svg>
            </div>

            <div class="footer-icon post-capsule" data-page="services.html">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
               <span class="notif-badge chat-nav-dot" id="servicesBadgeCount"></span>
            </div>

            <div class="footer-icon post-capsule" data-page="chats.html">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-12.7 8.38 8.38 0 013.8.9L21 3z"/></svg>
              <span class="notif-badge chat-nav-dot" id="chatBadgeCount"></span>
            </div>

           <div class="footer-icon post-capsule" data-page="shop.html">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
            </div>

           <div class="footer-icon post-capsule" data-page="videos.html">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="3" width="20" height="18" rx="5" ry="5" />
                    <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
                </svg>
            </div>

            <div class="footer-icon post-capsule" data-page="health.html">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
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
    //    Yanzu ana amfani da NexusRouter.getCurrentPath() idan ya
    //    wanzu (SPA-aware), in ba haka ba a koma ga
    //    window.location.pathname (native load na farko).
    // ------------------------------------------------------------
    function setActiveIcon() {
        let currentPage = (window.NexusRouter && window.NexusRouter.getCurrentPath())
            || window.location.pathname.split('/').pop();
        if (!currentPage) currentPage = 'social.html';

        document.querySelectorAll('#instaFooter .footer-icon[data-page]').forEach(icon => {
            icon.classList.toggle('active', icon.getAttribute('data-page') === currentPage);
        });
    }
    window.setActiveIcon = setActiveIcon;

    // ------------------------------------------------------------
    // 5) Scroll behavior.
    // ------------------------------------------------------------
    function setupScrollBehavior() {
        const footer = document.getElementById('instaFooter');
        if (footer) footer.classList.remove('footer-hidden');
    }

    // ------------------------------------------------------------
    // 5b) Pin footer to the TRUE visible viewport bottom.
    // Wasu Android Chrome/WebView suna da bug inda position:fixed
    // baya bin sabon girman "layout viewport" da sauri lokacin da
    // address-bar ke boyewa/bayyana yayin scroll — sanadin da footer
    // ke "nutsewa" kwatsam sannan ta "gyaru" da zaran an sake scroll.
    // MUHIMMI: wannan matsalar ta tabbata a health.html KAWAI, don
    // haka wannan fix din yana aiki KAWAI a wannan page — a sauran
    // pages (wadanda position:fixed dinsu ke aiki daidai tun farko)
    // ba mu son wani karin JS transform, don kada mu "tura ta sama"
    // ba dole ba.
    // ------------------------------------------------------------
    function pinFooterToVisualViewport() {
        if (!window.visualViewport) return;
        const footer = document.getElementById('instaFooter');
        if (!footer || footer.__vvPinned) return;
        footer.__vvPinned = true;

        const vv = window.visualViewport;
        let rafId = null;

        function apply() {
            rafId = null;
            const onHealth = /(^|\/)health\.html(\?|#|$)/.test(location.pathname + location.search + location.hash)
                || location.pathname.endsWith('health.html');
            if (!onHealth) {
                // Ba mu kan health.html ba — tabbatar babu wani transform
                // da ya rage daga baya, komawa yadda take na asali.
                // MUHIMMI: idan akwai transform da ya rage daga health.html
                // (misali an bar shi lokacin address-bar boye), kada mu bar
                // shi ya "koma 0" ta hanyar CSS transition na 0.4s (wanda
                // ke haifar da tsalle a bayyane lokacin da mai amfani ya
                // canza tab) — mu share shi NAN-TAKE maimakon.
                if (footer.style.transform) {
                    footer.style.transition = 'none';
                    footer.style.transform = '';
                    // Force reflow domin browser ya "kama" transition:none
                    // kafin mu mayar da transition, in ba haka ba zai iya
                    // dunkule su tare ya sake yin animate ta kowace hanya.
                    void footer.offsetHeight;
                    footer.style.transition = '';
                } else if (footer.style.transition) {
                    footer.style.transition = '';
                }
                return;
            }
            // Cire CSS transition na wucin-gadi domin motsin JS din ya
            // zama santsi (1:1 da yatsan mai amfani), ba mai "tsalle"/
            // jinkirin ease ba wanda ke haddasa jitter yayin scroll.
            footer.style.transition = 'none';
            const gap = window.innerHeight - (vv.height + vv.offsetTop);
            footer.style.transform = gap > 0.5 ? `translateY(-${gap}px)` : '';
        }
        function schedule() {
            if (rafId === null) rafId = requestAnimationFrame(apply);
        }

        vv.addEventListener('resize', schedule);
        vv.addEventListener('scroll', schedule);
        window.addEventListener('scroll', schedule, { passive: true });
        document.addEventListener('nexus:routechange', schedule);
        schedule();
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

   function listenPersonalChatsBadge() {
        const sessionUser = localStorage.getItem('nexus_user_session');
        if (!sessionUser) return;

        function startListening() {
            firebase.firestore().collection('personalChats')
                .where('members', 'array-contains', sessionUser)
                .onSnapshot((snap) => {
                    let hasUnread = false;
                    snap.forEach(doc => {
                        const d = doc.data();
                        if (d.unreadCount && d.unreadCount[sessionUser] > 0) hasUnread = true;
                    });
                    window.updateChatFooterBadge(hasUnread);
                }, err => console.error('Footer personal-chat badge error:', err));
        }

        function attach() {
            if (!window.firebase || !firebase.auth) {
                setTimeout(attach, 1000);
                return;
            }
            firebase.auth().onAuthStateChanged((user) => {
                if (user) startListening();
            });
        }
        attach();
   }

   // ------------------------------------------------------------
    // 6b) Chat badge — ana kiran wannan daga chats.html kai tsaye
    // (window.updateChatFooterBadge) domin sabuntawa nan take.
    // ------------------------------------------------------------
   window.updateChatFooterBadge = function (hasUnread) {
        window.__nexusChatHasUnread = !!hasUnread;
        const badge = document.getElementById('chatBadgeCount');
        if (!badge) return;
        badge.classList.toggle('show', !!hasUnread);
    };

    // ------------------------------------------------------------
    // 7) Saka CSS + HTML a cikin page, sannan kunna logic din sama.
    // ------------------------------------------------------------
    function injectFooter() {
        const existing = document.getElementById('instaFooter');
        if (existing) {
            // Footer ya riga ya wanzu (an loda shi tuni daga wata page) —
            // kada a sake yin injection, sai a sabunta active icon kawai.
            setActiveIcon();
            loadFooterProfile();
            pinFooterToVisualViewport();
            return;
        }

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
        if (window.__nexusChatHasUnread !== undefined) window.updateChatFooterBadge(window.__nexusChatHasUnread);

        setActiveIcon();
        loadFooterProfile();
        setupScrollBehavior();
        pinFooterToVisualViewport();
        listenServicesBadgeCount();
        listenPersonalChatsBadge();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectFooter);
    } else {
        injectFooter();
    }

    // SPA: sake kiran setActiveIcon a duk lokacin da route ta canza,
    // domin gold "active" state din ya bi page din da ake ciki YANZU.
    // (An fitar da wannan daga cikin injectFooter() domin ta wanzu ko da
    // footer ya riga ya kasance a DOM — misali idan footer.js ya sake
    // loda a health.html, injectFooter() zai koma da wuri sama, amma
    // listener din routechange dole ya kasance nan ko ta yaya.)
    document.addEventListener('nexus:routechange', setActiveIcon);
})();
