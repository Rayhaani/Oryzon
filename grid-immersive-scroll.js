let startTime = 0;
let velocity = 0;

(function(){

let currentIndex = 0;

let startY = 0;
let currentY = 0;
let lastY = 0;
let lastTime = 0;

let dragging = false;
let animating = false;
let rafPending = false;

let stack;

window.enableExploreScroll = function(index){

    currentIndex = index;

    buildStack();

};

function buildStack(){

    const wrapper =
    document.getElementById(
        'nexus-immersive-card'
    );

    if(!wrapper) return;

    wrapper.innerHTML = `
        <div class="ig-stack">
            <div class="ig-card ig-prev"></div>
            <div class="ig-card ig-current"></div>
            <div class="ig-card ig-next"></div>
        </div>
    `;

    stack =
    wrapper.querySelector('.ig-stack');

    renderCards();

    // make sure cards start in their resting positions
    // with NO transition (avoids a slide-in flash on open)
    resetPosition(true);

    attachTouch();
}

function renderCards(){

    const prev =
    stack.querySelector('.ig-prev');

    const current =
    stack.querySelector('.ig-current');

    const next =
    stack.querySelector('.ig-next');

    prev.innerHTML =
    currentIndex > 0
    ? generatePostHTML(
        allPosts[currentIndex-1]
      )
    : '';

    current.innerHTML =
    generatePostHTML(
        allPosts[currentIndex]
    );

    next.innerHTML =
    currentIndex <
    allPosts.length-1
    ? generatePostHTML(
        allPosts[currentIndex+1]
      )
    : '';

    autoPlayVideos();
}

function autoPlayVideos(){

    stack
    .querySelectorAll('video')
    .forEach(v=>{

       v.pause();
       v.muted = true;

    });

    const currentVideo =
    stack
    .querySelector(
        '.ig-current video'
    );

    if(currentVideo){

        currentVideo.muted = false;

        currentVideo
        .play()
        .catch(()=>{});

    }
}

function attachTouch(){

    stack.addEventListener(
        'touchstart',
        touchStart,
        {passive:true}
    );

    stack.addEventListener(
        'touchmove',
        touchMove,
        {passive:true}
    );

    stack.addEventListener(
        'touchend',
        touchEnd,
        {passive:true}
    );

    stack.addEventListener(
        'touchcancel',
        touchEnd,
        {passive:true}
    );
}

function touchStart(e){

    if(animating) return;

    startTime = Date.now();
    lastTime = startTime;

    dragging = true;

    startY =
    e.touches[0].clientY;

    currentY = startY;
    lastY = startY;

    velocity = 0;
}

function touchMove(e){

    if(!dragging) return;

    currentY =
    e.touches[0].clientY;

    // track velocity from the most recent movement
    // (matches the "flick" feel of IG/TikTok, not the
    // average over the whole gesture)
    const now = Date.now();
    const dt = now - lastTime;

    if(dt > 0){
        velocity = (currentY - lastY) / dt; // signed px/ms
    }

    lastY = currentY;
    lastTime = now;

    // throttle visual updates to one per animation frame
    if(!rafPending){

        rafPending = true;

        requestAnimationFrame(()=>{

            rafPending = false;

            const delta =
            currentY - startY;

            moveCards(delta);
        });
    }
}

function moveCards(delta){

    const prev =
    stack.querySelector('.ig-prev');

    const current =
    stack.querySelector('.ig-current');

    const next =
    stack.querySelector('.ig-next');

    let d = delta;

    // rubber-band resistance at the very first
    // and very last post (like IG/TikTok)
    if(currentIndex === 0 && delta > 0){
        d = delta * 0.35;
    }

    if(
        currentIndex === allPosts.length - 1 &&
        delta < 0
    ){
        d = delta * 0.35;
    }

    prev.style.transition = 'none';
    current.style.transition = 'none';
    next.style.transition = 'none';

    prev.style.transform =
    `translate3d(0,${-window.innerHeight + d}px,0)`;

    current.style.transform =
    `translate3d(0,${d}px,0)`;

    next.style.transform =
    `translate3d(0,${window.innerHeight + d}px,0)`;
}

function touchEnd(){

    if(!dragging) return;

    dragging = false;

    const delta = currentY - startY;

    const elapsed =
    Date.now() - startTime;

    const avgVelocity =
    elapsed > 0
    ? Math.abs(delta) / elapsed
    : 0;

    const flickVelocity =
    Math.abs(velocity);

    const threshold =
    window.innerHeight * 0.18;

    const fastSwipe =
    avgVelocity > 0.55 ||
    flickVelocity > 0.5;

    if(
        delta < -threshold ||
        (delta < -40 && fastSwipe && velocity < 0)
    ){

        goNext();

    }

    else if(
        delta > threshold ||
        (delta > 40 && fastSwipe && velocity > 0)
    ){

        goPrev();

    }

    else{

        resetPosition();

    }
}

// pass `instant = true` to snap into place with NO
// transition (used right after recycling card content,
// so there's no extra "slide back" animation)
function resetPosition(instant){

    const prev =
    stack.querySelector('.ig-prev');

    const current =
    stack.querySelector('.ig-current');

    const next =
    stack.querySelector('.ig-next');

    if(instant){

        prev.style.transition =
        current.style.transition =
        next.style.transition =
        'none';

    } else {

        prev.style.transition =
        current.style.transition =
        next.style.transition =
        'transform .25s cubic-bezier(.22,.61,.36,1)';
    }

    prev.style.transform =
    'translate3d(0,-100%,0)';

    current.style.transform =
    'translate3d(0,0,0)';

    next.style.transform =
    'translate3d(0,100%,0)';

    if(instant){

        // force a reflow so the browser "commits" the
        // instant position before any future transition
        // is applied — prevents the next swipe from
        // animating FROM the old position
        void prev.offsetHeight;
        void current.offsetHeight;
        void next.offsetHeight;
    }
}

function goNext(){

    if(currentIndex >= allPosts.length - 1){
        resetPosition();
        return;
    }

    animateTo(-window.innerHeight, ()=>{

        currentIndex++;

        const prev =
        stack.querySelector('.ig-prev');

        const current =
        stack.querySelector('.ig-current');

        const next =
        stack.querySelector('.ig-next');

        // recycle cards
        prev.innerHTML =
        current.innerHTML;

        current.innerHTML =
        next.innerHTML;

        // build ONE card only
        const newIndex =
        currentIndex + 1;

        next.innerHTML =
        newIndex < allPosts.length
        ? generatePostHTML(
            allPosts[newIndex]
          )
        : '';

        autoPlayVideos();

        // instant snap — no second animation
        resetPosition(true);

        animating = false;
    });
}

function goPrev(){

    if(currentIndex <= 0){
        resetPosition();
        return;
    }

    animateTo(window.innerHeight, ()=>{

        currentIndex--;

        const prev =
        stack.querySelector('.ig-prev');

        const current =
        stack.querySelector('.ig-current');

        const next =
        stack.querySelector('.ig-next');

        // recycle cards
        next.innerHTML =
        current.innerHTML;

        current.innerHTML =
        prev.innerHTML;

        // build ONE card only
        const newIndex =
        currentIndex - 1;

        prev.innerHTML =
        newIndex >= 0
        ? generatePostHTML(
            allPosts[newIndex]
          )
        : '';

        autoPlayVideos();

        // instant snap — no second animation
        resetPosition(true);

        animating = false;
    });
}


function animateTo(y, callback){

    animating = true;

    const prev =
    stack.querySelector('.ig-prev');

    const current =
    stack.querySelector('.ig-current');

    const next =
    stack.querySelector('.ig-next');

    const transition =
    'transform .28s cubic-bezier(.22,.61,.36,1)';

    prev.style.transition =
    current.style.transition =
    next.style.transition =
    transition;

    current.style.transform =
    `translate3d(0,${y}px,0)`;

    prev.style.transform =
    `translate3d(
        0,
        ${-window.innerHeight + y}px,
        0
    )`;

    next.style.transform =
    `translate3d(
        0,
        ${window.innerHeight + y}px,
        0
    )`;

    let done = false;

    const finish = ()=>{

        if(done) return;
        done = true;

        current.removeEventListener(
            'transitionend',
            finish
        );

        callback();
    };

    current.addEventListener('transitionend', finish);

    // safety fallback in case transitionend doesn't fire
    setTimeout(finish, 320);
}

})();
