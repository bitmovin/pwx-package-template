var SOURCES = [];
var CDN = 'https://storage.googleapis.com/bitmovin-content-cdn-origin/content/short_form_content';

for (var i = 1; i <= 12; i++) {
    SOURCES.push({
        url: CDN + '/short_form_' + i + '/m3u8/master.m3u8',
        title: 'Short Form ' + i,
        poster: CDN + '/short_form_' + i + '/thumb.jpg',
    });
}

var LC_NOTHING = 0;
var LC_METADATA = 1;
var LC_DATA = 2;
var PRELOAD_RANGE = 2;

var activeIndex = -1;

var feed = document.getElementById('feed');
var progressDots = document.getElementById('progress-dots');

SOURCES.forEach(function(source, index) {
    var item = document.createElement('div');
    item.className = 'feed-item';
    item.dataset.index = index;
    item.innerHTML =
        '<div class="feed-card"><div class="feed-card-inner">' +
            '<div class="feed-video" data-index="' + index + '" style="background-image:url(\'' + source.poster + '\')"></div>' +
            '<div class="feed-overlay-top"></div>' +
            '<div class="feed-overlay-bottom"></div>' +
            '<div class="feed-username">' +
                '<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=short' + index + '">' +
                '<span>user_' + (index + 1) + '</span>' +
            '</div>' +
            '<div class="feed-info">' +
                '<div class="feed-info-title">' + source.title + '</div>' +
                '<div class="feed-info-desc">' + (index + 1) + '/' + SOURCES.length + '</div>' +
            '</div>' +
            '<div class="feed-progress"><div class="feed-progress-bar" data-index="' + index + '"></div></div>' +
        '</div></div>';
    feed.appendChild(item);

    var dot = document.createElement('div');
    dot.className = 'progress-dot';
    dot.dataset.index = index;
    progressDots.appendChild(dot);
});

var player = bitmovin.playerx.Player({
    key: 'YOUR-PLAYER-KEY',
    defaultContainer: document.getElementById('player-container'),
    playback: { autoplay: true, muted: true },
});


function getSource(index) {
    return player.sources.list()[index] || null;
}

function ensureSource(index, attach, loadControl) {
    var existing = getSource(index);
    if (existing) return existing;

    return player.sources.add(
        { resources: [{ url: SOURCES[index].url, type: 'hls' }] },
        { attach: !!attach, loadControl: loadControl !== undefined ? loadControl : LC_METADATA, playback: { autoplay: true, muted: true } }
    );
}

function getPreloadWindow(index) {
    var start = Math.max(0, index - PRELOAD_RANGE);
    var end = Math.min(index + PRELOAD_RANGE, SOURCES.length - 1);
    var indices = [];
    for (var i = start; i <= end; i++) indices.push(i);
    return indices;
}

player.events.on('video-attached', function(event) {
    event.videoElement.removeAttribute('controls');
    event.videoElement.setAttribute('playsinline', '');
    event.videoElement.setAttribute('webkit-playsinline', '');
    event.videoElement.loop = true;
});

function updateProgressDots(index) {
    document.querySelectorAll('.progress-dot').forEach(function(dot) {
        dot.classList.toggle('active', parseInt(dot.dataset.index) === index);
    });
}


function onTimeChanged() {
    var source = getSource(activeIndex);
    if (!source || source.duration <= 0) return;

    var bar = document.querySelector('.feed-progress-bar[data-index="' + activeIndex + '"]');
    if (bar) bar.style.width = (source.currentTime / source.duration * 100) + '%';
}


function goToSource(index) {
    if (index === activeIndex || index < 0 || index >= SOURCES.length) return;

    var oldIndex = activeIndex;
    activeIndex = index;

    // Attach new source first for fastest switch
    var slot = document.querySelector('.feed-video[data-index="' + index + '"]');
    var activeSource = ensureSource(index, true, LC_DATA);
    activeSource.loadControl = LC_DATA;
    player.sources.attachVideo(activeSource, { container: slot });

    // Subscribe to new, unsubscribe from old
    activeSource.events.on('time-changed', onTimeChanged);

    var oldSource = getSource(oldIndex);
    if (oldSource) {
        oldSource.events.off('time-changed', onTimeChanged);
        oldSource.loadControl = LC_METADATA;
    }

    // Preload nearby sources, demote distant ones
    var window = getPreloadWindow(index);

    window.forEach(function(i) {
        if (i !== index) ensureSource(i, false, LC_DATA);
    });

    player.sources.list().forEach(function(source, i) {
        if (window.indexOf(i) === -1) source.loadControl = LC_NOTHING;
    });

    updateProgressDots(index);
}


var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            var index = parseInt(entry.target.dataset.index);
            if (index !== activeIndex) goToSource(index);
        }
    });
}, { root: feed, threshold: [0.6] });

document.querySelectorAll('.feed-item').forEach(function(item) {
    observer.observe(item);
});


feed.addEventListener('click', function() {
    var source = getSource(activeIndex);
    if (!source) return;
    source.state === 'playing' ? source.pause() : source.play();
});


goToSource(0);
