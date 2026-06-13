(function(){

let currentIndex = 0;

let startY = 0;
let currentY = 0;

let dragging = false;
let animating = false;

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
}

function touchStart(e){

    if(animating) return;

    dragging = true;

    startY =
    e.touches[0].clientY;

}

function touchMove(e){

    if(!dragging) return;

    currentY =
    e.touches[0].clientY;

    const delta =
    currentY - startY;

    moveCards(delta);
}

function moveCards(delta){

    const prev =
    stack.querySelector('.ig-prev');

    const current =
    stack.querySelector('.ig-current');

    const next =
    stack.querySelector('.ig-next');

    prev.style.transition='none';
    current.style.transition='none';
    next.style.transition='none';

    current.style.transform =
    `translateY(${delta}px)`;

    prev.style.transform =
    `translateY(${-window.innerHeight + delta}px)`;

    next.style.transform =
    `translateY(${window.innerHeight + delta}px)`;
}

function touchEnd(){

    if(!dragging) return;

    dragging = false;

    const delta =
    currentY - startY;

    const threshold =
    window.innerHeight * 0.18;

    if(delta < -threshold){

        goNext();

    }

    else if(delta > threshold){

        goPrev();

    }

    else{

        resetPosition();

    }
}

function resetPosition(){

    const prev =
    stack.querySelector('.ig-prev');

    const current =
    stack.querySelector('.ig-current');

    const next =
    stack.querySelector('.ig-next');

    prev.style.transition =
    current.style.transition =
    next.style.transition =
    'transform .25s ease';

    prev.style.transform =
    'translateY(-100%)';

    current.style.transform =
    'translateY(0)';

    next.style.transform =
    'translateY(100%)';
}

function goNext(){

    if(currentIndex >=
        allPosts.length-1){

        resetPosition();
        return;
    }

    animateTo(-window.innerHeight,
    ()=>{
        currentIndex++;
        renderCards();
        resetPosition();
    });

}

function goPrev(){

    if(currentIndex <= 0){

        resetPosition();
        return;
    }

    animateTo(window.innerHeight,
    ()=>{
        currentIndex--;
        renderCards();
        resetPosition();
    });

}

function animateTo(y,callback){

    animating = true;

    const prev =
    stack.querySelector('.ig-prev');

    const current =
    stack.querySelector('.ig-current');

    const next =
    stack.querySelector('.ig-next');

    prev.style.transition =
    current.style.transition =
    next.style.transition =
    'transform .28s ease';

    current.style.transform =
    `translateY(${y}px)`;

    prev.style.transform =
    `translateY(${
        -window.innerHeight+y
    }px)`;

    next.style.transform =
    `translateY(${
        window.innerHeight+y
    }px)`;

    setTimeout(()=>{

        callback();

        animating = false;

    },280);
}

})();
