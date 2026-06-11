/**
 * grid-immersive-scroll.js
 * Instagram-style swipe navigation — explore.html kadai
 * Yana aiki da openImmersiveFromGrid() na explore.html
 */

(function () {
    'use strict';

    let currentIndex = 0;
    let isAnimating  = false;
    let touchStartY  = 0;
    let touchStartX  = 0;
    let isSwiping    = false;

    // ── Saita listeners bayan immersive ya bude ──
    function attachSwipeListeners() {
        // Cire tsohuwar listeners kafin a ƙara sabuwa
        detachSwipeListeners();

        document.addEventListener('touchstart',  onTouchStart, { passive: true });
        document.addEventListener('touchmove',   onTouchMove,  { passive: false });
        document.addEventListener('touchend',    onTouchEnd,   { passive: true });
        document.addEventListener('wheel',       onWheel,      { passive: false });
        document.addEventListener('keydown',     onKeyDown);
    }

    function detachSwipeListeners() {
        document.removeEventListener('touchstart',  onTouchStart);
        document.removeEventListener('touchmove',   onTouchMove);
        document.removeEventListener('touchend',    onTouchEnd);
        document.removeEventListener('wheel',       onWheel);
        document.removeEventListener('keydown',     onKeyDown);
    }

    // ── Navigatе zuwa wani post ──
    function goTo(newIndex) {
        if (isAnimating) return;
        if (!window.allPosts || newIndex < 0 || newIndex >= window.allPosts.length) return;

        isAnimating = true;

        // Animate out
        const wrapper = document.getElementById('nexus-immersive-card');
        const card    = wrapper && wrapper.querySelector('.post-card');
        const backBtn = document.querySelector('.immersive-back-btn');

        if (card) {
            const yOut = newIndex > currentIndex ? '-100dvh' : '100dvh';
            card.style.transition = 'transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease';
            card.style.transform  = `translateY(${yOut})`;
            card.style.opacity    = '0';
        }

        setTimeout(() => {
            // Rufe current — kamar backBtn click amma ba tare da scroll restore ba
            if (backBtn) {
                // Cire onclick na backBtn na wucin gadi don mu sarrafa kanmu
                const origOnclick = backBtn.onclick;
                backBtn.onclick = null;

                // Tsaftace DOM kai tsaye
                const footer = document.getElementById('instaFooter');
                if (card) card.classList.remove('immersive-mode');
                if (footer) footer.classList.remove('footer-hidden');
                backBtn.remove();
                if (wrapper) wrapper.remove();

                // Maida overflow
                document.documentElement.style.overflow = '';
                document.body.style.overflow = '';
            } else if (wrapper) {
                wrapper.remove();
            }

            // Cire nav indicator
            const indicator = document.getElementById('nexus-scroll-indicator');
            if (indicator) indicator.remove();

            currentIndex = newIndex;

            // Bude sabon post
            if (typeof window.__gridOpenOriginal === 'function') {
                window.__gridOpenOriginal(currentIndex);
            }

            // Jira immersive ya bude sannan mu sake saka listeners
            waitForImmersive(() => {
                updateNavIndicator();
                isAnimating = false;
                attachSwipeListeners();
            });

        }, 250);
    }

    // ── Jira immersive card ya bayyana a DOM ──
    function waitForImmersive(cb, attempt = 0) {
        const wrapper = document.getElementById('nexus-immersive-card');
        const card    = wrapper && wrapper.querySelector('.post-card');

        if (card && card.classList.contains('immersive-mode')) {
            cb();
        } else if (attempt < 50) {
            setTimeout(() => waitForImmersive(cb, attempt + 1), 10);
        } else {
            isAnimating = false;
        }
    }

    // ── Touch handlers ──
    function onTouchStart(e) {
        // Kar a gauraye da swipe na cikin card (comments, etc)
        if (e.target.closest('#nexusSplitView')) return;
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        isSwiping   = false;
    }

    function onTouchMove(e) {
        if (e.target.closest('#nexusSplitView')) return;
        const dy = touchStartY - e.touches[0].clientY;
        const dx = Math.abs(touchStartX - e.touches[0].clientX);
        if (!isSwiping && Math.abs(dy) > 10 && dx < 50) {
            isSwiping = true;
        }
        if (isSwiping) e.preventDefault();
    }

    function onTouchEnd(e) {
        if (!isSwiping) return;
        if (e.target.closest('#nexusSplitView')) return;

        const dy        = touchStartY - e.changedTouches[0].clientY;
        const threshold = window.innerHeight * 0.2;

        if      (dy >  threshold) goTo(currentIndex + 1); // swipe up → next
        else if (dy < -threshold) goTo(currentIndex - 1); // swipe down → prev

        isSwiping = false;
    }

    // ── Mouse wheel (desktop) ──
    let wheelAccum = 0;
    let wheelTimer = null;
    function onWheel(e) {
        e.preventDefault();
        wheelAccum += e.deltaY;
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
            if (Math.abs(wheelAccum) > 80) {
                if (wheelAccum > 0) goTo(currentIndex + 1);
                else                goTo(currentIndex - 1);
            }
            wheelAccum = 0;
        }, 100);
    }

    // ── Keyboard ──
    function onKeyDown(e) {
        if (e.key === 'ArrowDown') goTo(currentIndex + 1);
        if (e.key === 'ArrowUp')   goTo(currentIndex - 1);
    }

    // ── Nav indicator (1/14 a gefen dama) ──
    function updateNavIndicator() {
        const old = document.getElementById('nexus-scroll-indicator');
        if (old) old.remove();

        const total   = (window.allPosts || []).length;
        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex < total - 1;

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
                    gap: 8px;
                    pointer-events: auto;
                }
                .nsi-arrow {
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.12);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.18);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    color: #fff;
                    font-size: 11px;
                    transition: background 0.2s;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .nsi-arrow:active { background: rgba(255,255,255,0.28); }
                .nsi-counter {
                    font-size: 10px;
                    color: rgba(255,255,255,0.5);
                    font-weight: 600;
                    background: rgba(0,0,0,0.45);
                    padding: 3px 8px;
                    border-radius: 20px;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    white-space: nowrap;
                }
            `;
            document.head.appendChild(style);
        }

        const el = document.createElement('div');
        el.id = 'nexus-scroll-indicator';
        el.innerHTML = `
            ${hasPrev ? `<div class="nsi-arrow" id="nsiUp"><i class="fa-solid fa-chevron-up"></i></div>` : ''}
            <div class="nsi-counter">${currentIndex + 1} / ${total}</div>
            ${hasNext ? `<div class="nsi-arrow" id="nsiDown"><i class="fa-solid fa-chevron-down"></i></div>` : ''}
        `;
        document.body.appendChild(el);

        const up   = document.getElementById('nsiUp');
        const down = document.getElementById('nsiDown');
        if (up)   up.addEventListener('click',   () => goTo(currentIndex - 1));
        if (down) down.addEventListener('click', () => goTo(currentIndex + 1));
    }

    // ── Override openImmersiveFromGrid ──
    function init() {
        if (typeof window.openImmersiveFromGrid === 'undefined') {
            setTimeout(init, 50);
            return;
        }

        // Save original
        window.__gridOpenOriginal = window.openImmersiveFromGrid;

        // Override
        window.openImmersiveFromGrid = function(index) {
            currentIndex = index;

            // Cire old listeners da indicator
            detachSwipeListeners();
            const old = document.getElementById('nexus-scroll-indicator');
            if (old) old.remove();

            // Kira asali
            window.__gridOpenOriginal(index);

            // Jira immersive ya bude sannan inject
            waitForImmersive(() => {
                updateNavIndicator();
                attachSwipeListeners();

                // Kuma watch backBtn — idan aka rufe, detach listeners
                watchForClose();
            });
        };

        console.log('[Nexus Scroll] ✓ Swipe navigation ready');
    }

    // ── Kalli idan immersive ya rufe daga backBtn ──
    function watchForClose() {
        const observer = new MutationObserver(() => {
            const wrapper = document.getElementById('nexus-immersive-card');
            if (!wrapper) {
                detachSwipeListeners();
                const indicator = document.getElementById('nexus-scroll-indicator');
                if (indicator) indicator.remove();
                isAnimating = false;
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true });
    }

    // ── Start ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
                
