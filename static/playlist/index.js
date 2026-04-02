var CDN = 'https://d3ikisbsngjr73.cloudfront.net';
var SOURCES = [
    { url: CDN + '/f5f7a84b-518c-434f-b038-6f1d3f106c0f/index.m3u8', title: 'Bassist Girl Playing Lively' },
    { url: CDN + '/d9250032-3687-484b-a3ec-da736ba97628/index.m3u8', title: 'Gardener Shelving Potted Plants' },
    { url: CDN + '/b4cdd86b-e705-4546-a0ef-12afcf7679c9/index.m3u8', title: 'Girl Meditating in the Desert' },
    { url: CDN + '/e8165952-8a15-44ad-be6f-ea1a2eed25d1/index.m3u8', title: 'Reflection of a Screen in Glasses' },
    { url: CDN + '/5807d167-b766-4fb6-b8e6-bf073395c570/index.m3u8', title: 'A Man Walking His Dog' },
    { url: CDN + '/9f65dfd0-5bdb-4c51-8054-e3782bea35d9/index.m3u8', title: 'Person and Dog Walk in a Creek' },
    { url: CDN + '/570488bb-eefc-49a2-9ba8-c28160582e4d/index.m3u8', title: 'Dog and Owner Playing With a Ball' },
    { url: CDN + '/ef043b0d-f8cf-479e-9d4d-15600abe9200/index.m3u8', title: 'Dog Catches a Ball in a River' },
    { url: CDN + '/567c71cf-d87a-4670-ba34-652b6832d925/index.m3u8', title: 'Beautiful Sunrise Landscape' },
    { url: CDN + '/8c8dab80-1fb4-4771-a2ff-8bda38c6b570/index.m3u8', title: 'Forest Stream in the Sunlight' },
    { url: CDN + '/9922228a-c6d8-4bf8-834c-58ecd05c4cd1/index.m3u8', title: 'Tropical Fish' },
    { url: CDN + '/126d2812-f562-4d49-aad7-46dc9af6e3f4/index.m3u8', title: 'Fly Over a Huge Canyon' },
    { url: CDN + '/13c46947-db2c-4ed4-a02a-f38394a09ea8/index.m3u8', title: 'Green Vailed Chameleon' },
    { url: CDN + '/1dc67599-c131-4816-8fd6-3c2b815b4a14/index.m3u8', title: 'Sea Waves in a Little Bay' },
    { url: CDN + '/79993646-8de0-465e-b8fb-d39b50e954ff/index.m3u8', title: 'Woman Doing Yoga' },
    { url: CDN + '/90597caf-7865-4366-8728-9ad7e7b5c3b9/index.m3u8', title: 'Ballerina Moving Colored Ribbon Fans' },
    { url: CDN + '/e3d8b6e2-0da7-4f3b-aa65-c416a9fc4894/index.m3u8', title: 'Young Man Skating in the Park' },
    { url: CDN + '/18809c1a-d472-40dd-9ac0-713a63812b8a/index.m3u8', title: 'Front View of a Skateboarder' },
    { url: CDN + '/d40553fc-667f-40eb-a268-54a9162b07be/index.m3u8', title: 'Skateboarder Talks With a Girl' },
    { url: CDN + '/7759400f-6ef6-4469-a9af-8f05cf93c3b8/index.m3u8', title: 'Woman Doing Agility Exercises' },
    { url: CDN + '/2b9e0198-8365-4354-b710-021f722af0f2/index.m3u8', title: 'Tired Woman After Boxing Class' },
    { url: CDN + '/b344c4c5-6160-44c9-8bdd-5d40f51a8b65/index.m3u8', title: 'Young Man Jogging' },
    { url: CDN + '/cef66b61-3efa-4052-8460-d12614ef586a/index.m3u8', title: 'Chopping Chillis' },
    { url: CDN + '/ffd04b33-8a5e-4bbd-87ce-be700f7f7146/index.m3u8', title: 'Cutting a Pork Chop' },
    { url: CDN + '/56007779-38b1-497f-b989-0a0f1ed533ac/index.m3u8', title: 'Cars on a Highway at Night' },
    { url: CDN + '/d641d5d7-9833-45fe-9814-7878bfce68e6/index.m3u8', title: 'City Traffic at Night' },
    { url: CDN + '/9ccad1a9-ebdf-42fb-ac15-749231880a21/index.m3u8', title: 'Man Speeding a Motorcycle' },
    { url: CDN + '/d94628db-e2de-465c-8ff0-1c95a0f68fe3/index.m3u8', title: 'Man Speeding on a Road' },
    { url: CDN + '/a56536f3-8d8e-4aec-bf79-3bc24405871e/index.m3u8', title: 'Speeding Down a Highway' },
    { url: CDN + '/8cdbfe57-8208-40a2-aaf8-f7d133693906/index.m3u8', title: 'Curved Highway Through Mountains' },
];

SOURCES.forEach(function(s, i) { if (typeof POSTERS !== 'undefined' && POSTERS[i]) s.poster = POSTERS[i]; });

var LC_NOTHING = 0;
var LC_METADATA = 1;
var LC_DATA = 2;
var SIDEBAR_HIDE_DELAY = 2500;

var activeIndex = -1;
var looping = true;
var sidebarHideTimeout = -1;

var sidebar = document.getElementById('sidebar');
var navigation = document.getElementById('navigation');
var contentTitle = document.getElementById('content-title');
var buttonUp = document.getElementById('buttonUp');
var buttonDown = document.getElementById('buttonDown');
var buttonPlay = document.getElementById('buttonPlay');
var buttonPause = document.getElementById('buttonPause');
var progressBar = document.getElementById('progress');
var errorContainer = document.getElementById('content-error');

var player = bitmovin.playerx.Player({
    key: 'YOUR-PLAYER-KEY',
    defaultContainer: document.getElementById('player-container'),
    playback: { autoplay: true, muted: true, preventSeeking: false },
});


function modulo(n, m) { return ((n % m) + m) % m; }

function getSource(index) {
    return (SOURCES[index] && SOURCES[index].sourceApi) || null;
}

function ensureSource(index, attach, loadControl) {
    if (!SOURCES[index]) return null;
    if (SOURCES[index].sourceApi) return SOURCES[index].sourceApi;

    SOURCES[index].sourceApi = player.sources.add(
        { resources: [{ url: SOURCES[index].url, type: 'hls' }] },
        { attach: !!attach, loadControl: loadControl !== undefined ? loadControl : LC_METADATA, playback: { autoplay: true, muted: true } }
    );
    return SOURCES[index].sourceApi;
}

function removeControls(source) {
    if (!source.video) {
        requestAnimationFrame(function() { removeControls(source); });
        return;
    }
    source.video.removeAttribute('controls');
}

function updateUI(index) {
    contentTitle.textContent = SOURCES[index].title;
    progressBar.style.width = '0';

    document.querySelectorAll('.video-card').forEach(function(card, i) {
        card.setAttribute('data-state', i === index ? 'active' : 'inactive');
        if (i === index) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });

    buttonUp.classList.toggle('hidden', index === 0 && !looping);
    buttonDown.classList.toggle('hidden', index === SOURCES.length - 1 && !looping);
}


function onPlaying() {
    buttonPlay.style.display = 'none';
    buttonPause.style.display = 'block';
}

function onPaused() {
    buttonPause.style.display = 'none';
    buttonPlay.style.display = 'block';
}

function onTimeChanged() {
    var source = getSource(activeIndex);
    if (!source) return;

    var duration = source.duration;
    var currentTime = source.currentTime;

    if (duration > 0) {
        progressBar.style.width = (window.innerWidth * currentTime / duration) + 'px';
    }

    if (currentTime > 1) {
        var next = getSource(modulo(activeIndex + 1, SOURCES.length));
        var prev = getSource(modulo(activeIndex - 1, SOURCES.length));
        if (next) next.loadControl = LC_DATA;
        if (prev) prev.loadControl = LC_DATA;
    }
}

function onEnded() {
    var next = looping ? modulo(activeIndex + 1, SOURCES.length) : Math.min(activeIndex + 1, SOURCES.length - 1);
    goTo(next);
}

function subscribeEvents(source) {
    source.events.on('playing', onPlaying);
    source.events.on('paused', onPaused);
    source.events.on('time-changed', onTimeChanged);
    source.events.on('ended', onEnded);
}

function unsubscribeEvents(source) {
    source.events.off('playing', onPlaying);
    source.events.off('paused', onPaused);
    source.events.off('time-changed', onTimeChanged);
    source.events.off('ended', onEnded);
}


function goTo(index) {
    if (index === activeIndex || index < 0 || index >= SOURCES.length) return;

    var oldIndex = activeIndex;
    var oldSource = getSource(oldIndex);
    var wasEnded = oldSource && oldSource.state === 'ended';

    activeIndex = index;

    // Attach new source first for fastest switch
    var activeSource = ensureSource(index, true, LC_DATA);
    activeSource.loadControl = LC_DATA;
    player.sources.attachVideo(activeSource);

    subscribeEvents(activeSource);

    // Clean up old source
    if (oldSource) {
        unsubscribeEvents(oldSource);
        if (wasEnded) oldSource.currentTime = 0;
        oldSource.loadControl = LC_METADATA;
    }

    // Ensure next/prev exist with metadata
    ensureSource(modulo(activeIndex + 1, SOURCES.length)).loadControl = LC_METADATA;
    ensureSource(modulo(activeIndex - 1, SOURCES.length)).loadControl = LC_METADATA;

    removeControls(activeSource);
    updateUI(index);
}

function navigate(direction) {
    maybeShowBar();
    var next = activeIndex + direction;
    goTo(looping ? modulo(next, SOURCES.length) : Math.max(0, Math.min(next, SOURCES.length - 1)));
}

function goNext() { navigate(1); }
function goPrevious() { navigate(-1); }


SOURCES.forEach(function(source, index) {
    var card = document.createElement('div');
    card.classList.add('video-card');
    if (source.poster) card.style.backgroundImage = "url('" + source.poster + "')";
    card.textContent = source.title;
    card.addEventListener('click', function() { goTo(index); });
    sidebar.appendChild(card);
});

function maybeShowBar() {
    sidebar.classList.add('open');
    navigation.classList.add('show');
    clearTimeout(sidebarHideTimeout);
    sidebarHideTimeout = setTimeout(function() {
        var source = getSource(activeIndex);
        if (!source || source.state !== 'playing') {
            maybeShowBar();
        } else {
            sidebar.classList.remove('open');
            navigation.classList.remove('show');
        }
    }, SIDEBAR_HIDE_DELAY);
}

document.addEventListener('mousemove', maybeShowBar);
maybeShowBar();


buttonPlay.addEventListener('click', function() {
    var source = getSource(activeIndex);
    if (source) source.play();
});

buttonPause.addEventListener('click', function() {
    var source = getSource(activeIndex);
    if (source) source.pause();
});

buttonUp.addEventListener('click', goPrevious);
buttonDown.addEventListener('click', goNext);


var touchStartY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', function(e) {
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dy) > 50) dy < 0 ? goNext() : goPrevious();
}, { passive: true });

document.addEventListener('touchstart', maybeShowBar, { passive: true });


document.addEventListener('keydown', function(e) {
    maybeShowBar();

    if (e.code === 'ArrowUp') {
        goPrevious();
    } else if (e.code === 'ArrowDown') {
        goNext();
    } else if (e.code === 'Enter') {
        var source = getSource(activeIndex);
        if (source) source.state === 'playing' ? source.pause() : source.play();
    }
});


player.events.on('player-error', function(error) {
    errorContainer.textContent = 'Error: ' + (error.message || 'Unknown error');
    errorContainer.setAttribute('data-state', 'error');
});


goTo(0);
