// ============================================================
// 9. NEXUS IMMERSIVE SCROLL ENGINE
//    - nexus-feed.html  → duka posts (video + image)
//    - Sauran pages     → videos kawai
//    TikTok/Instagram-style vertical snap scroll a cikin immersive
// ============================================================

(function initImmersiveScrollEngine() {

    // ===== CONFIG =====
    const SNAP_DURATION   = 380;   // ms — transition speed tsakanin posts
    const SWIPE_THRESHOLD = 45;    // px — ƙarancin swipe distance don switch
    const SWIPE_VELOCITY  = 0.3;   // px/ms — ko da swipe ya yi sauri, ya bi

    // ===== STATE =====
    let isImmersiveScrollActive = false;
    let currentIndex            = 0;
    let allPosts                = [];   // Array na post cards da za a scroll
    let isTransitioning         = false;
    let touchStartY             = 0;
    let touchStartTime          = 0;
    let touchStartX             = 0;

    // Detect page type — nexus-feed.html ne ko a'a
    function isNexusFeed() {
        const path = window.location.pathname;
        return path.includes('nexus-feed') || path.includes('index') || path.endsWith('/');
    }

    // ===== COLLECT POSTS =====
    // nexus-feed → duka .post-card
    // Sauran pages → .post-card mai video kawai
    function collectScrollablePosts(triggeredCard) {
        const allCards = Array.from(document.querySelectorAll('.post-card'));

        if (isNexusFeed()) {
            // Feed — duka posts (video + image) sun shiga
            allPosts = allCards;
        } else {
            // Sauran pages — videos kawai
            allPosts = allCards.filter(card => card.querySelector('video'));
        }

        // Nemo index ɗin card ɗin da aka danna
        currentIndex = allPosts.indexOf(triggeredCard);
        if (currentIndex === -1) currentIndex = 0;
    }

    // ===== BUILD IMMERSIVE SCROLL CONTAINER =====
    function buildImmersiveScroll(triggeredCard) {
        // Goge tsoho idan akwai
        const old = document.getElementById('nexusImmersiveScroll');
        if (old) old.remove();

        collectScrollablePosts(triggeredCard);
        if (allPosts.length === 0) return;

        isImmersiveScrollActive = true;
        isTransitioning = false;

        // ===== OUTER WRAPPER =====
        const wrapper = document.createElement('div');
        wrapper.id = 'nexusImmersiveScroll';
        wrapper.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 6000;
            background: #000;
            overflow: hidden;
            touch-action: none;
        `;

        // ===== SLIDES TRACK =====
        const track = document.createElement('div');
        track.id = 'nisTrack';
        track.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100%;
            height: 100%;
            will-change: transform;
        `;

        // ===== BUILD EACH SLIDE =====
        allPosts.forEach((card, idx) => {
            const slide = buildSlide(card, idx);
            track.appendChild(slide);
        });

        wrapper.appendChild(track);

        // ===== BACK BUTTON =====
        const backBtn = document.createElement('button');
        backBtn.id = 'nisBackBtn';
        backBtn.innerHTML = `<i class="fa-solid fa-chevron-left"></i>`;
        backBtn.style.cssText = `
            position: fixed;
            top: 16px; left: 16px;
            width: 38px; height: 38px;
            background: rgba(0,0,0,0.55);
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 50%;
            color: #fff;
            font-size: 16px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            z-index: 7000;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            transition: background 0.2s;
        `;
        backBtn.onclick = closeImmersiveScroll;
        wrapper.appendChild(backBtn);

        // ===== PROGRESS DOTS =====
        const dotsWrap = document.createElement('div');
        dotsWrap.id = 'nisDots';
        dotsWrap.style.cssText = `
            position: fixed;
            top: 22px; right: 16px;
            display: flex; gap: 4px;
            z-index: 7000;
            align-items: center;
        `;
        // Max 7 dots a nuna (idan fiye, nuna số/total)
        if (allPosts.length <= 7) {
            allPosts.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.className = 'nis-dot';
                dot.style.cssText = `
                    width: ${i === currentIndex ? '18px' : '6px'};
                    height: 6px;
                    border-radius: 3px;
                    background: ${i === currentIndex ? '#fde08d' : 'rgba(255,255,255,0.3)'};
                    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
                `;
                dotsWrap.appendChild(dot);
            });
        } else {
            // Counter idan posts sun yi yawa
            const counter = document.createElement('div');
            counter.id = 'nisCounter';
            counter.style.cssText = `
                color: rgba(255,255,255,0.7);
                font-size: 11px;
                font-weight: 700;
                font-family: 'Inter', sans-serif;
                background: rgba(0,0,0,0.4);
                padding: 4px 10px;
                border-radius: 20px;
                border: 1px solid rgba(255,255,255,0.15);
            `;
            counter.textContent = `${currentIndex + 1} / ${allPosts.length}`;
            dotsWrap.appendChild(counter);
        }
        wrapper.appendChild(dotsWrap);

        document.body.appendChild(wrapper);

        // ===== JUMP to current index immediately (no animation) =====
        jumpToSlide(currentIndex, false);

        // ===== ATTACH TOUCH EVENTS =====
        wrapper.addEventListener('touchstart', onTouchStart, { passive: true });
        wrapper.addEventListener('touchend',   onTouchEnd,   { passive: true });
        wrapper.addEventListener('touchmove',  onTouchMove,  { passive: false });

        // ===== KEYBOARD SUPPORT =====
        document.addEventListener('keydown', onKeyDown);

        // ===== HISTORY PUSH =====
        history.pushState({ nexusImmersiveScroll: true, index: currentIndex }, '');
        window.addEventListener('popstate', onPopState);

        // ===== HIDE FOOTER / MENU =====
        const footer = document.getElementById('instaFooter');
        const menu   = document.getElementById('cyberMenu');
        if (footer) footer.classList.add('footer-hidden');
        if (menu)   menu.style.display = 'none';

        if (navigator.vibrate) navigator.vibrate(15);
    }

    // ===== BUILD A SINGLE SLIDE =====
    function buildSlide(card, idx) {
        const slide = document.createElement('div');
        slide.className = 'nis-slide';
        slide.dataset.index = idx;
        slide.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            overflow: hidden;
            background: #000;
        `;

        // --- MEDIA BACKGROUND ---
        const video = card.querySelector('video');
        const img   = card.querySelector('img.post-media');

        if (video) {
            const vid = document.createElement('video');
            vid.src        = video.src || video.currentSrc || video.querySelector('source')?.src || '';
            vid.loop       = true;
            vid.playsInline = true;
            vid.muted      = true;
            vid.preload    = 'metadata';
            vid.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                object-fit: cover;
                z-index: 1;
            `;
            slide.appendChild(vid);

            // Mute toggle button
            const muteBtn = document.createElement('div');
            muteBtn.className = 'nis-mute-btn';
            muteBtn.innerHTML = `<i class="fa-solid fa-volume-xmark"></i>`;
            muteBtn.style.cssText = `
                position: absolute;
                bottom: 80px; right: 14px;
                width: 34px; height: 34px;
                background: rgba(0,0,0,0.6);
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                color: #fff;
                font-size: 14px;
                z-index: 30;
                cursor: pointer;
                border: 1px solid rgba(255,255,255,0.2);
                backdrop-filter: blur(8px);
                transition: transform 0.15s;
            `;
            muteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                vid.muted = !vid.muted;
                window.nexusGlobalSound = !vid.muted;
                const icon = muteBtn.querySelector('i');
                icon.className = vid.muted
                    ? 'fa-solid fa-volume-xmark'
                    : 'fa-solid fa-volume-high';

                // Mute duk sauran slides
                document.querySelectorAll('.nis-slide video').forEach(other => {
                    if (other !== vid) {
                        other.muted = true;
                        const otherMute = other.closest('.nis-slide')?.querySelector('.nis-mute-btn i');
                        if (otherMute) otherMute.className = 'fa-solid fa-volume-xmark';
                    }
                });
                muteBtn.style.transform = 'scale(0.85)';
                setTimeout(() => { muteBtn.style.transform = ''; }, 150);
            });
            slide.appendChild(muteBtn);

            // Tap to play/pause
            slide.addEventListener('click', (e) => {
                if (e.target.closest('.nis-overlay-bottom')) return;
                if (e.target.closest('.nis-mute-btn')) return;
                if (vid.paused) { vid.play(); } else { vid.pause(); }
            });

        } else if (img) {
            const cloneImg = document.createElement('img');
            cloneImg.src = img.src;
            cloneImg.loading = 'lazy';
            cloneImg.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                object-fit: cover;
                z-index: 1;
            `;
            slide.appendChild(cloneImg);
        }

        // --- GRADIENT OVERLAY (don rubutu ya bayyana) ---
        const gradient = document.createElement('div');
        gradient.style.cssText = `
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 55%;
            background: linear-gradient(transparent, rgba(0,0,0,0.85));
            z-index: 2;
            pointer-events: none;
        `;
        slide.appendChild(gradient);

        // --- OVERLAY BOTTOM CONTENT ---
        const overlayBottom = document.createElement('div');
        overlayBottom.className = 'nis-overlay-bottom';
        overlayBottom.style.cssText = `
            position: absolute;
            bottom: 0; left: 0; right: 0;
            z-index: 10;
            padding: 0 14px 14px;
        `;

        // Clone header (avatar, username, follow, gift)
        const origHeader = card.querySelector('.post-header');
        if (origHeader) {
            const headerClone = origHeader.cloneNode(true);
            headerClone.style.cssText = `
                background: transparent !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                border-bottom: none !important;
                padding: 0 0 8px 52px !important;
                position: relative !important;
                margin-bottom: 0 !important;
            `;
            // Re-attach follow button click
            const followBtn = headerClone.querySelector('.gift-btn-nexus.follow-btn-nexus');
            if (followBtn) {
                followBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.handleFollowBtn && window.handleFollowBtn(followBtn);
                };
            }
            // Re-attach gift button
            const giftBtn = headerClone.querySelectorAll('.gift-btn-nexus')[1];
            if (giftBtn) {
                const username = card.querySelector('.post-username')?.textContent?.trim();
                giftBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.openGiftPanel && window.openGiftPanel(username);
                };
            }
            overlayBottom.appendChild(headerClone);
        }

        // Clone post content text
        const origContent = card.querySelector('.post-content');
        if (origContent) {
            const contentClone = origContent.cloneNode(true);
            contentClone.style.cssText = `
                padding: 4px 0 8px 0 !important;
                font-size: 13px !important;
                color: rgba(255,255,255,0.88) !important;
                text-shadow: 0 1px 4px rgba(0,0,0,0.8) !important;
                line-height: 1.45 !important;
                max-height: 60px;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
            `;
            overlayBottom.appendChild(contentClone);
        }

        // Clone interaction bar
        const origBar = card.querySelector('.post-interaction-bar');
        if (origBar) {
            const barClone = origBar.cloneNode(true);
            barClone.style.cssText = `
                position: relative !important;
                bottom: auto !important;
                left: auto !important;
                width: 100% !important;
                padding: 6px 0 !important;
                background: transparent !important;
            `;

            // Re-wire like button
            const likeBtn = barClone.querySelector('.post-capsule');
            if (likeBtn) {
                const origPostId = card.dataset.postId;
                likeBtn.onclick = (e) => {
                    e.stopPropagation();
                    const icon = likeBtn.querySelector('i');
                    const countEl = likeBtn.querySelector('span');
                    const liked = likeBtn.classList.toggle('liked');
                    icon.className = liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
                    icon.style.color = liked ? '#ff4d6d' : '';
                    let c = parseInt(countEl?.textContent) || 0;
                    if (countEl) countEl.textContent = liked ? c + 1 : Math.max(0, c - 1);
                };
            }

            // Re-wire comment button
            const commentBtns = barClone.querySelectorAll('.post-capsule');
            commentBtns.forEach(btn => {
                const icon = btn.querySelector('i');
                if (icon && icon.classList.contains('fa-comment')) {
                    const postId = card.dataset.postId;
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        window.openImmersiveSplitComments && window.openImmersiveSplitComments(postId, card);
                    };
                }
            });

            overlayBottom.appendChild(barClone);
        }

        slide.appendChild(overlayBottom);
        return slide;
    }

    // ===== JUMP TO SLIDE (instant or animated) =====
    function jumpToSlide(index, animate = true) {
        const track = document.getElementById('nisTrack');
        if (!track) return;

        currentIndex = Math.max(0, Math.min(index, allPosts.length - 1));

        if (animate) {
            track.style.transition = `transform ${SNAP_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        } else {
            track.style.transition = 'none';
        }

        track.style.transform = `translateY(${-currentIndex * 100}vh)`;

        // Play/pause videos
        manageVideoPlayback(currentIndex);

        // Update dots / counter
        updateProgressIndicator(currentIndex);

        if (animate) {
            isTransitioning = true;
            setTimeout(() => { isTransitioning = false; }, SNAP_DURATION + 30);
            if (navigator.vibrate) navigator.vibrate(8);
        }
    }

    // ===== MANAGE VIDEO PLAYBACK =====
    function manageVideoPlayback(activeIdx) {
        const slides = document.querySelectorAll('.nis-slide');
        slides.forEach((slide, i) => {
            const vid = slide.querySelector('video');
            if (!vid) return;

            if (i === activeIdx) {
                vid.muted = !window.nexusGlobalSound;
                vid.currentTime = 0;
                vid.play().catch(() => {});
            } else {
                vid.pause();
                vid.muted = true;
                // Pre-load adjacent slides
                if (Math.abs(i - activeIdx) <= 1) {
                    vid.preload = 'auto';
                }
            }
        });
    }

    // ===== UPDATE DOTS / COUNTER =====
    function updateProgressIndicator(activeIdx) {
        if (allPosts.length <= 7) {
            const dots = document.querySelectorAll('.nis-dot');
            dots.forEach((dot, i) => {
                dot.style.width      = i === activeIdx ? '18px' : '6px';
                dot.style.background = i === activeIdx
                    ? '#fde08d'
                    : 'rgba(255,255,255,0.3)';
            });
        } else {
            const counter = document.getElementById('nisCounter');
            if (counter) counter.textContent = `${activeIdx + 1} / ${allPosts.length}`;
        }
    }

    // ===== NEXT / PREV =====
    function goNext() {
        if (isTransitioning) return;
        if (currentIndex >= allPosts.length - 1) {
            // End of feed — shake animation
            shakeEndFeedIndicator('end');
            return;
        }
        jumpToSlide(currentIndex + 1);
    }

    function goPrev() {
        if (isTransitioning) return;
        if (currentIndex <= 0) {
            shakeEndFeedIndicator('start');
            return;
        }
        jumpToSlide(currentIndex - 1);
    }

    // ===== SHAKE INDICATOR when at start/end =====
    function shakeEndFeedIndicator(position) {
        const track = document.getElementById('nisTrack');
        if (!track) return;
        const dir = position === 'end' ? -1 : 1;
        track.style.transition = 'transform 0.08s ease';
        track.style.transform  = `translateY(calc(${-currentIndex * 100}vh + ${dir * 18}px))`;
        setTimeout(() => {
            track.style.transform = `translateY(${-currentIndex * 100}vh)`;
        }, 80);
        if (navigator.vibrate) navigator.vibrate([10, 10, 10]);
    }

    // ===== TOUCH EVENTS =====
    function onTouchStart(e) {
        if (e.touches.length !== 1) return;
        touchStartY    = e.touches[0].clientY;
        touchStartX    = e.touches[0].clientX;
        touchStartTime = Date.now();
    }

    function onTouchMove(e) {
        // Hana scroll na page a bayan
        if (isImmersiveScrollActive) e.preventDefault();
    }

    function onTouchEnd(e) {
        if (!e.changedTouches.length) return;
        const endY    = e.changedTouches[0].clientY;
        const endX    = e.changedTouches[0].clientX;
        const deltaY  = touchStartY - endY;
        const deltaX  = Math.abs(touchStartX - endX);
        const elapsed = Date.now() - touchStartTime;
        const velocity = Math.abs(deltaY) / elapsed;

        // Ignore horizontal swipes (don interaction bar buttons)
        if (deltaX > Math.abs(deltaY) * 1.2) return;

        if (Math.abs(deltaY) >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY) {
            if (deltaY > 0) {
                goNext(); // Swipe up → next post
            } else {
                goPrev(); // Swipe down → prev post
            }
        }
    }

    // ===== KEYBOARD =====
    function onKeyDown(e) {
        if (!isImmersiveScrollActive) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
        if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
        if (e.key === 'Escape') closeImmersiveScroll();
    }

    // ===== HISTORY POPSTATE =====
    function onPopState(e) {
        if (e.state?.nexusImmersiveScroll) return; // baya a cikin immersive
        closeImmersiveScroll();
    }

    // ===== CLOSE IMMERSIVE SCROLL =====
    function closeImmersiveScroll() {
        if (!isImmersiveScrollActive) return;

        isImmersiveScrollActive = false;

        // Stop all videos
        document.querySelectorAll('.nis-slide video').forEach(v => {
            v.pause(); v.muted = true; v.src = '';
        });

        const wrapper = document.getElementById('nexusImmersiveScroll');
        if (wrapper) {
            wrapper.style.transition = 'opacity 0.25s ease';
            wrapper.style.opacity = '0';
            setTimeout(() => wrapper.remove(), 260);
        }

        // Show footer / menu
        const footer = document.getElementById('instaFooter');
        const menu   = document.getElementById('cyberMenu');
        if (footer) footer.classList.remove('footer-hidden');
        if (menu)   menu.style.display = '';

        // Scroll page back to the card wanda aka bude daga gare shi
        const originalCard = allPosts[currentIndex];
        if (originalCard) {
            originalCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        document.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('popstate', onPopState);

        allPosts = [];
    }

    // ===== OVERRIDE toggleImmersive → USE SCROLL ENGINE =====
    // Mun maye gurbin tsarin toggleImmersive na asali
    const _originalToggleImmersive = window.toggleImmersive;

    window.toggleImmersive = function(card, forceClose) {
        // Idan danna a interaction bar, comment, follow — kar a bude
        if (event) {
            if (event.target.closest('.post-interaction-bar')) return;
            if (event.target.closest('.interaction-bar'))      return;
            if (event.target.closest('.header-actions'))       return;
            if (event.target.closest('.follow-text-link'))     return;
            if (event.target.closest('.gift-btn-nexus'))       return;
            if (event.target.closest('a'))                     return;
            if (event.target.closest('.post-mute-toggle'))     return;
            if (event.target.closest('.mute-toggle'))          return;
        }

        // Idan immersive scroll yana buɗe, rufe shi
        if (isImmersiveScrollActive) {
            closeImmersiveScroll();
            return;
        }

        // Bude immersive scroll
        buildImmersiveScroll(card);
    };

    // Expose don wasu pages su iya kira
    window.nexusImmersiveScroll = {
        open:  buildImmersiveScroll,
        close: closeImmersiveScroll,
        next:  goNext,
        prev:  goPrev,
        goTo:  (i) => jumpToSlide(i),
        isActive: () => isImmersiveScrollActive,
    };

    // ===== WHEEL SUPPORT (Desktop) =====
    let wheelTimeout = null;
    document.addEventListener('wheel', (e) => {
        if (!isImmersiveScrollActive) return;
        e.preventDefault();
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
            if (e.deltaY > 20)       goNext();
            else if (e.deltaY < -20) goPrev();
        }, 50);
    }, { passive: false });

    // ===== CSS DON SLIDES =====
    const style = document.createElement('style');
    style.textContent = `
        #nexusImmersiveScroll {
            opacity: 1;
            animation: nis-fadein 0.25s ease;
        }
        @keyframes nis-fadein {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        /* Slide inner gradient text shadow improvements */
        .nis-slide .post-username {
            text-shadow: 0 1px 6px rgba(0,0,0,0.9) !important;
        }
        .nis-slide .post-time {
            text-shadow: 0 1px 4px rgba(0,0,0,0.8) !important;
        }

        /* Post capsules a cikin slide — transparent glass style */
        .nis-slide .post-capsule,
        .nis-slide .capsule {
            background: rgba(0,0,0,0.45) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(255,255,255,0.15) !important;
        }

        .nis-slide .post-action-capsules,
        .nis-slide .action-capsules {
            background: rgba(0,0,0,0.40) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
        }

        .nis-slide .post-save-capsule,
        .nis-slide .save-capsule {
            background: rgba(0,0,0,0.40) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
        }

        /* Header a slide — transparent */
        .nis-slide .post-header {
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border-bottom: none !important;
        }

        /* Follow button a cikin slide */
        .nis-slide .gift-btn-nexus {
            background: rgba(0,0,0,0.5) !important;
            backdrop-filter: blur(10px) !important;
        }

        /* Mute button pulse animation */
        .nis-mute-btn:active {
            transform: scale(0.85) !important;
        }

        /* End-of-feed indicator */
        #nisEndIndicator {
            position: fixed;
            bottom: 30px; left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,0.5);
            font-size: 11px;
            font-weight: 700;
            font-family: 'Inter', sans-serif;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            z-index: 7000;
            animation: nis-fadeout 1.5s ease forwards;
            pointer-events: none;
        }
        @keyframes nis-fadeout {
            0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
            70%  { opacity: 1; }
            100% { opacity: 0; transform: translateX(-50%) translateY(8px); }
        }

        /* Prevent body scroll a bayan */
        body.nis-active {
            overflow: hidden !important;
            position: fixed !important;
            width: 100% !important;
        }

        /* Progress dots container */
        #nisDots {
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);

    console.log('[NexusImmersiveScroll] Engine loaded ✓ | Feed-mode:', isNexusFeed());

})();
