/* ============================================================
   NEXUS SHARED FOOTER — footer.js  (v1.5 — Bybit-style)
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
        /* v1.5 — Bybit-style footer: icons kawai, girma da tazara daidai */
        .nexus-footer {
            position: fixed !important; bottom: 0 !important; left: 0; width: 100% !important;
            height: calc(48px + env(safe-area-inset-bottom));
            display: flex; align-items: flex-start; justify-content: center;
            z-index: 9999;
            padding: 0 0 env(safe-area-inset-bottom) 0;
            box-sizing: border-box;
            transition: transform 0.4s ease;
            background: #000 !important;
            border-top: 0.5px solid rgba(255, 255, 255, 0.12) !important;
            border-radius: 28px 28px 0 0 !important;
            overflow: visible;
        }
        .footer-hidden { transform: translateY(100%); }

        .footer-capsule-bar {
            display: flex !important;
            align-items: stretch !important;
            justify-content: stretch !important;
            width: 100% !important;
            height: 48px !important;
            padding: 0 6px !important;
            box-sizing: border-box !important;
            gap: 0 !important;
        }

        /* Kowane tab: fadi daidai (flex 1 1 0) — tazara ta zama daidai */
        .footer-icon {
            position: relative;
            flex: 1 1 0 !important;
            min-width: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #8a8b92 !important;
            cursor: pointer !important;
            -webkit-tap-highlight-color: transparent;
            transition: color 0.2s ease, transform 0.18s ease !important;
        }
        .footer-icon:active { transform: scale(0.9) !important; }
        .footer-icon.active { color: #ffffff !important; }

        /* Dukkan icons girmansu 26x26 daidai, stroke 2 daidai */
        .footer-icon svg {
            width: 26px !important; height: 26px !important;
            flex: 0 0 26px;
            display: block;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        /* Home: kamar Instagram — cike idan yana aiki, layi idan ba ya aiki */
        .footer-icon .nx-home-svg path { fill: none; }
        .footer-icon.active .nx-home-svg path { fill: currentColor; }
        /* Play triangle na Videos yana cike koyaushe */
        .footer-icon .nx-play-fill { fill: currentColor; stroke: none; }

        .profile-img {
            width: 26px; height: 26px; border-radius: 50%;
            border: 1.5px solid #fff; object-fit: cover;
            transition: border-color 0.2s ease;
        }
        .footer-icon.active .profile-img { border-color: #fff; }

        .notif-badge {
            position: absolute;
            top: -2px;
            right: 2px;
            min-width: 16px;
            height: 16px;
            padding: 0 4px;
            border-radius: 9px;
            background: linear-gradient(135deg, #ff6b6b, #e5383b);
            border: 2px solid #000;
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
            top: 9px !important;
            right: calc(50% - 20px) !important;
            background: #ff3040 !important;
            box-sizing: content-box !important;
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
            <!-- Home (Instagram style) -->
            <div class="footer-icon" data-page="social.html" aria-label="Home">
               <svg class="nx-home-svg" viewBox="0 0 24 24"><g transform="translate(12 12) scale(.9) translate(-12 -12)"><path stroke-width="2.2" d="M12 2.6c-.5 0-1 .2-1.4.5L3.3 8.4C2.5 9 2 9.9 2 10.9V19.5C2 20.9 3.1 22 4.5 22H8.5c.8 0 1.5-.7 1.5-1.5V16.5c0-1.1.9-2 2-2s2 .9 2 2v4c0 .8.7 1.5 1.5 1.5h4c1.4 0 2.5-1.1 2.5-2.5V10.9c0-1-.5-1.9-1.3-2.5l-7.3-5.3c-.4-.3-.9-.5-1.4-.5z"/></g></svg>            
            </div>

            <!-- Services (service bell) -->
            <div class="footer-icon" data-page="services.html" aria-label="Services">
                             <svg viewBox="0 0 24 24"><path d="M3 16a9 9 0 0 1 18 0z"/><path d="M2 20h20"/><path d="M12 7V4.5M9.5 4h5"/></svg>                   
                <span class="notif-badge chat-nav-dot" id="servicesBadgeCount"></span>
            </div>

            <!-- Chats -->
            <div class="footer-icon" data-page="chats.html" aria-label="Chats">
                <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-12.7 8.38 8.38 0 013.8.9L21 3z"/></svg>
                <span class="notif-badge chat-nav-dot" id="chatBadgeCount"></span>
            </div>

            <!-- Shop / Marketplace (shopping bag) -->
            <div class="footer-icon" data-page="shop.html" aria-label="Shop">
                <svg viewBox="0 0 24 24"><path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1-2.966 2.544h-6.852a3 3 0 0 1-2.965-2.544l-1.255-8.152a2 2 0 0 1 1.977-2.304z"/><path d="M9 11v-5a3 3 0 0 1 6 0v5"/></svg>
            </div>

            <!-- Videos -->
            <div class="footer-icon" data-page="videos.html" aria-label="Videos">
                <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="5" ry="5"/><path class="nx-play-fill" d="M10 9l5 3-5 3V9z"/></svg>
            </div>

            <!-- Health -->
            <div class="footer-icon" data-page="health.html" aria-label="Health">
                <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
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
            const onHealth = /(^|\/)(health|videos)\.html(\?|#|$)/.test(location.pathname + location.search + location.hash)
                || location.pathname.endsWith('health.html')
                || location.pathname.endsWith('videos.html');            
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
    // 5c) Auna ainihin girman footer da ake GANI a wannan lokaci
    // (bayan duk toolbar da Opera/Brave ya tura), a saka a cikin
    // --nx-footer-h domin post-header/caption na immersive video
    // su bi motsinta daidai — ba tare da dogaro da lamba mai
    // kayyadewa da hannu ba.
    // ------------------------------------------------------------
    function nxSyncFooterOffset() {
        const footer = document.getElementById('instaFooter');
        if (!footer) return;
        if (footer.style.display === 'none') { document.documentElement.style.setProperty('--nx-footer-h', '0px'); return; }
        const rect = footer.getBoundingClientRect();
        const vv = window.visualViewport;
        const visibleBottom = vv ? (vv.height + vv.offsetTop) : window.innerHeight;
        const isBrave = !!navigator.brave;
        const isOpera = /OPR\/|OPT\//.test(navigator.userAgent);
        const extraBuffer = (isBrave || isOpera) ? 54 : 0;
        const visibleH = Math.max(0, visibleBottom - rect.top) + extraBuffer;
        document.documentElement.style.setProperty('--nx-footer-h', visibleH + 'px');
    }
    window.nxSyncFooterOffset = nxSyncFooterOffset;
    window.addEventListener('resize', nxSyncFooterOffset);
    window.addEventListener('orientationchange', nxSyncFooterOffset);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', nxSyncFooterOffset);
        window.visualViewport.addEventListener('scroll', nxSyncFooterOffset);
    }
   setInterval(nxSyncFooterOffset, 400);
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
            nxSyncFooterOffset();
            return;
        }

        let placeholder = document.getElementById('footer-placeholder');
        if (!placeholder) {
            // v1.4: SPA — idan page din da aka shigo da ita ba ta da placeholder
            // (misali an fara app a page maras footer), a kirkiri shi a karshen body.
            placeholder = document.createElement('div');
            placeholder.id = 'footer-placeholder';
            document.body.appendChild(placeholder);
        }

        if (!document.getElementById('nexus-footer-styles')) {
            const styleTag = document.createElement('style');
            styleTag.id = 'nexus-footer-styles';
            styleTag.textContent = FOOTER_CSS;
            document.head.appendChild(styleTag);
        }

        placeholder.outerHTML = FOOTER_HTML;
        toggleFooterOnMe(); // apply the per-page hide immediately (no flash of the footer on pages that hide it)
        if (window.__nexusChatHasUnread !== undefined) window.updateChatFooterBadge(window.__nexusChatHasUnread);

        setActiveIcon();
        loadFooterProfile();
        setupScrollBehavior();
        pinFooterToVisualViewport();
        nxSyncFooterOffset();
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

    // me.html baya bukatar footer (yana da nasa Showcase/Timeline
    // navigation) — boye ta idan mun kasance a wannan page.
    function toggleFooterOnMe() {
        const footer = document.getElementById('instaFooter');
        if (!footer) return;
        const currentPage = (window.NexusRouter && window.NexusRouter.getCurrentPath())
            || window.location.pathname.split('/').pop();
        const HIDE_FOOTER_ON = ['me.html', 'pages.html', 'group.html'];
        footer.style.display = HIDE_FOOTER_ON.includes(currentPage) ? 'none' : '';
    }
    document.addEventListener('nexus:routechange', toggleFooterOnMe);
    toggleFooterOnMe();

   // ------------------------------------------------------------
    // 8) Boye footer NAN TAKE (kafin page ta bude) idan an danna
    // link zuwa pages.html — capture:true domin ya gudana KAFIN
    // router.js ya kama click din ya yi navigateTo().
    // ------------------------------------------------------------
    const NX_HIDE_PAGES = ['me.html', 'pages.html', 'group.html'];
    function nxPageOfUrl(u) {
        try { return new URL(u, window.location.href).pathname.split('/').pop(); } catch (e) { return ''; }
    }
    function nxHideFooterNow() {
        const footer = document.getElementById('instaFooter');
        if (footer) footer.style.display = 'none';
    }
    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-page], [data-spa-link], a[href]');
        if (!link) return;
        const target = link.getAttribute('data-page') || nxPageOfUrl(link.getAttribute('href') || '');
        if (NX_HIDE_PAGES.includes(target)) nxHideFooterNow();
    }, true);

    // Programmatic navigation (NexusRouter.navigateTo('group.html?group=..') from JS clicks):
    // hide the footer the moment navigation STARTS, not after the new page's scripts have loaded.
    function nxWrapRouter() {
        const R = window.NexusRouter;
        if (!R || typeof R.navigateTo !== 'function') return false;
        if (R.__nxFooterWrapped) return true;
        const orig = R.navigateTo;
        R.navigateTo = function (url) {
            try { if (typeof url === 'string' && NX_HIDE_PAGES.includes(nxPageOfUrl(url))) nxHideFooterNow(); } catch (e) {}
            return orig.apply(this, arguments);
        };
        R.__nxFooterWrapped = true;
        return true;
    }
    if (!nxWrapRouter()) {
        let tries = 0;
        const t = setInterval(() => { if (nxWrapRouter() || ++tries > 40) clearInterval(t); }, 250);
    }
})();
