/**
 * grid-immersive-scroll.js
 * 
 * Wannan file yana saita Instagram-style scroll/swipe navigation
 * a cikin immersive mode — na wannan page (grid) kadai.
 * 
 * Yadda yake aiki:
 *  - Muna override openImmersiveFromGrid() don mu kara scroll logic
 *  - Bayan template.js ya bude immersive, muna inject touch/wheel handlers
 *  - Swipe up   → next post
 *  - Swipe down → prev post
 *  - Keyboard ↑↓ ma suna aiki
 *  - Zamu cire duk handlers idan immersive ya rufe (cleanup)
 */

(function () {
    'use strict';

    /* ─────────────────────────────────────────────
       1. STATE
    ───────────────────────────────────────────── */
    let currentIndex   = 0;
    let isAnimating    = false;
    let cleanupFn      = null;   // will hold the function that removes all listeners

    /* ─────────────────────────────────────────────
       2. OVERRIDE openImmersiveFromGrid
          (the original is defined in the HTML; we
           replace it after DOM + template.js load)
    ───────────────────────────────────────────── */
    function patchOpenImmersive() {
        // Keep the original so we can still call it
        const _originalOpen = window.openImmersiveFromGrid;

        window.openImmersiveFromGrid = function (index) {
            currentIndex = index;

            // Let template.js do its thing first
            _originalOpen(index);

            // Then inject scroll logic once the card is in the DOM
            requestAnimationFrame(() => {
                waitForImmersiveCard(() => {
                    injectScrollLogic();
                });
            });
        };
    }

    /* ─────────────────────────────────────────────
       3. WAIT FOR CARD (template.js may animate it in)
    ───────────────────────────────────────────── */
    function waitForImmersiveCard(cb, attempt = 0) {
        const wrapper = document.getElementById('nexus-immersive-card');
        const card    = wrapper && wrapper.querySelector('.post-card');

        if (card && card.classList.contains('immersive-mode')) {
            cb(card);
        } else if (attempt < 40) {               // try for ~400ms
            setTimeout(() => waitForImmersiveCard(cb, attempt + 1), 10);
        }
    }

    /* ─────────────────────────────────────────────
       4. INJECT SCROLL / SWIPE LOGIC
    ───────────────────────────────────────────── */
    function injectScrollLogic() {
        // Remove any previous listeners first (safety)
        if (cleanupFn) { cleanupFn(); cleanupFn = null; }

        // ── touch state ──
        let touchStartY    = 0;
        let touchStartX    = 0;
        let isSwiping      = false;

        // ── Prevent page scroll while immersive is open ──
        const preventScroll = (e) => { e.preventDefault(); };

        // ── Navigate to a post by index ──
        function goTo(newIndex) {
            if (isAnimating) return;
            if (!window.allPosts || newIndex < 0 || newIndex >= allPosts.length) return;

            isAnimating = true;
            currentIndex = newIndex;

            // Determine slide direction for animation
            const direction = newIndex > currentIndex ? 'up' : 'down';
            animateTransition(direction, () => {
                // Close current immersive
                const wrapper = document.getElementById('nexus-immersive-card');
                if (!wrapper) { isAnimating = false; return; }

                const card = wrapper.querySelector('.post-card');

                // Use template.js toggleImmersive to close cleanly
                const footer = document.getElementById('instaFooter');
if (card) card.classList.remove('immersive-mode');
if (footer) footer.classList.remove('footer-hidden');
if (wrapper) wrapper.remove();
document.documentElement.style.overflow = '';
document.body.style.overflow = '';
                // Open next/prev after a short delay
                setTimeout(() => {
                    const _orig = window.__originalOpenImmersive || window.openImmersiveFromGrid;
                    _orig(currentIndex);

                    requestAnimationFrame(() => {
                        waitForImmersiveCard(() => {
                            isAnimating = false;
                            injectScrollLogic(); // re-inject for new card
                        });
                    });
                }, 80);
            });
        }

        // ── Slide animation (CSS transform approach) ──
        function animateTransition(direction, onComplete) {
            const wrapper = document.getElementById('nexus-immersive-card');
            if (!wrapper) { onComplete(); return; }

            const card = wrapper.querySelector('.post-card');
            if (!card) { onComplete(); return; }

            const yOut = direction === 'up' ? '-100vh' : '100vh';

            card.style.transition = 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease';
            card.style.transform  = `translateY(${yOut})`;
            card.style.opacity    = '0';

            setTimeout(onComplete, 280);
        }

        // ── Touch handlers ──
        function onTouchStart(e) {
            console.log('[DEBUG] immersive opened, index:', index);
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            isSwiping   = false;
        }

        function onTouchMove(e) {
            // Determine swipe axis once we have enough movement
            const dy = touchStartY - e.touches[0].clientY;
            const dx = Math.abs(touchStartX - e.touches[0].clientX);

            if (!isSwiping && Math.abs(dy) > 8 && dx < 40) {
                isSwiping = true;
            }
            if (isSwiping) e.preventDefault();
        }

        function onTouchEnd(e) {
            if (!isSwiping) return;
            const dy = touchStartY - e.changedTouches[0].clientY;
            const threshold = window.innerHeight * 0.18;   // 18% of screen

            if (dy > threshold) {
                goTo(currentIndex + 1);                     // swipe up → next
            } else if (dy < -threshold) {
                goTo(currentIndex - 1);                     // swipe down → prev
            }
            isSwiping = false;
        }

        // ── Mouse wheel handler (desktop) ──
        let wheelAccum = 0;
        let wheelTimer = null;
        function onWheel(e) {
            e.preventDefault();
            wheelAccum += e.deltaY;

            clearTimeout(wheelTimer);
            wheelTimer = setTimeout(() => {
                if (Math.abs(wheelAccum) > 60) {
                    if (wheelAccum > 0) goTo(currentIndex + 1);
                    else               goTo(currentIndex - 1);
                }
                wheelAccum = 0;
            }, 80);
        }

        // ── Keyboard handler ──
        function onKeyDown(e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goTo(currentIndex + 1);
            if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  goTo(currentIndex - 1);
        }

        // ── Attach ──
        const wrapper = document.getElementById('nexus-immersive-card');

        document.addEventListener('touchstart',  onTouchStart, { passive: true });
        document.addEventListener('touchmove',   onTouchMove,  { passive: false });
        document.addEventListener('touchend',    onTouchEnd,   { passive: true });
        document.addEventListener('wheel',       onWheel,      { passive: false });
        document.addEventListener('keydown',     onKeyDown);
        document.body.addEventListener('touchmove', preventScroll, { passive: false });

        // ── Navigation indicator UI ──
        injectNavIndicator(currentIndex);

        // ── Watch for immersive closing (MutationObserver) ──
        const card = wrapper && wrapper.querySelector('.post-card');
        let closeObserver = null;

        if (card) {
            closeObserver = new MutationObserver(() => {
                if (!card.classList.contains('immersive-mode')) {
                    cleanup();
                }
            });
            closeObserver.observe(card, { attributes: true, attributeFilter: ['class'] });
        }

        // ── Cleanup ──
        function cleanup() {
            document.removeEventListener('touchstart',  onTouchStart);
            document.removeEventListener('touchmove',   onTouchMove);
            document.removeEventListener('touchend',    onTouchEnd);
            document.removeEventListener('wheel',       onWheel);
            document.removeEventListener('keydown',     onKeyDown);
            document.body.removeEventListener('touchmove', preventScroll);

            const indicator = document.getElementById('nexus-scroll-indicator');
            if (indicator) indicator.remove();

            if (closeObserver) closeObserver.disconnect();
            cleanupFn    = null;
            isAnimating  = false;
        }

        cleanupFn = cleanup;
    }

    /* ─────────────────────────────────────────────
       5. NAV INDICATOR
          Dots / arrows overlay — subtle, non-intrusive
    ───────────────────────────────────────────── */
    function injectNavIndicator(index) {
        // Remove old indicator
        const old = document.getElementById('nexus-scroll-indicator');
        if (old) old.remove();

        const total   = (window.allPosts || []).length;
        const hasPrev = index > 0;
        const hasNext = index < total - 1;

        const el = document.createElement('div');
        el.id = 'nexus-scroll-indicator';
        el.innerHTML = `
            ${hasPrev ? `<div class="nsi-arrow nsi-up" id="nsiUp">
                <i class="fa-solid fa-chevron-up"></i>
            </div>` : ''}
            <div class="nsi-counter">${index + 1} / ${total}</div>
            ${hasNext ? `<div class="nsi-arrow nsi-down" id="nsiDown">
                <i class="fa-solid fa-chevron-down"></i>
            </div>` : ''}
        `;

        // Inject styles once
        if (!document.getElementById('nexus-scroll-styles')) {
            const style = document.createElement('style');
            style.id = 'nexus-scroll-styles';
            style.textContent = `
                #nexus-scroll-indicator {
                    position: fixed;
                    right: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                    pointer-events: auto;
                }
                .nsi-arrow {
                    width: 34px; height: 34px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.12);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.18);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    color: #fff;
                    font-size: 12px;
                    transition: background 0.2s, transform 0.15s;
                    user-select: none;
                }
                .nsi-arrow:active {
                    background: rgba(255,255,255,0.25);
                    transform: scale(0.92);
                }
                .nsi-counter {
                    font-size: 10px;
                    color: rgba(255,255,255,0.45);
                    font-weight: 500;
                    letter-spacing: 0.5px;
                    background: rgba(0,0,0,0.4);
                    padding: 3px 7px;
                    border-radius: 20px;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(el);

        // Tap handlers for arrow buttons
        const upBtn   = document.getElementById('nsiUp');
        const downBtn = document.getElementById('nsiDown');

     if (upBtn)   upBtn.addEventListener('click',   () => goTo(currentIndex - 1));
if (downBtn) downBtn.addEventListener('click', () => goTo(currentIndex + 1));   
    }

    /* The indicator buttons need access to goTo, expose via closure */
    window.goToFromIndicator = function(newIndex) {
        // goTo is defined inside injectScrollLogic — we need a bridge
        // We re-trigger openImmersiveFromGrid which will re-inject scroll
        if (isAnimating) return;
        if (!window.allPosts || newIndex < 0 || newIndex >= allPosts.length) return;

        // Close current
        const wrapper = document.getElementById('nexus-immersive-card');
        if (!wrapper) return;
        const card = wrapper.querySelector('.post-card');

        isAnimating  = true;
        currentIndex = newIndex;

        const footer2 = document.getElementById('instaFooter');
if (card) card.classList.remove('immersive-mode');
if (footer2) footer2.classList.remove('footer-hidden');
if (wrapper) wrapper.remove();
document.documentElement.style.overflow = '';
document.body.style.overflow = '';

setTimeout(() => {
    window.openImmersiveFromGrid(newIndex);
    isAnimating = false;
}, 80);
    };

    /* ─────────────────────────────────────────────
       6. INIT — wait for template.js to load
    ───────────────────────────────────────────── */
    function init() {
        if (typeof toggleImmersive === 'undefined' || typeof openImmersiveFromGrid === 'undefined') {
            // template.js hasn't loaded yet, retry
            setTimeout(init, 50);
            return;
        }

        // Store original open function before patching
        window.__originalOpenImmersive = window.openImmersiveFromGrid;

        patchOpenImmersive();
        console.log('[Nexus Scroll] ✓ Instagram-style scroll injected for grid page');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
              
