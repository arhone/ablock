/**
 * Блокировка рекламы в видео YouTube.
 * Выполняется в контексте страницы (world: MAIN) до загрузки скриптов сайта.
 */
(function () {

    // Рекламные поля в ответе плеера
    const AD_KEYS = ['adPlacements', 'adSlots', 'playerAds'];

    /**
     * Удаляет рекламные поля из ответа плеера
     * @param data
     * @returns {*}
     */
    function prune(data) {
        if (data && typeof data === 'object') {
            for (const target of [data, data.playerResponse]) {
                if (target && typeof target === 'object') {
                    for (const key of AD_KEYS) {
                        if (key in target) {
                            delete target[key];
                        }
                    }
                }
            }
        }
        return data;
    }

    // Ответ плеера при первой загрузке страницы (var ytInitialPlayerResponse = {...})
    let initialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
        configurable: true,
        get: () => initialPlayerResponse,
        set: (value) => {
            initialPlayerResponse = prune(value);
        }
    });

    // Ответы при переходах между видео. Proxy сохраняет вид нативных функций.
    JSON.parse = new Proxy(JSON.parse, {
        apply: (target, thisArg, args) => prune(Reflect.apply(target, thisArg, args))
    });
    Response.prototype.json = new Proxy(Response.prototype.json, {
        apply: (target, thisArg, args) => Reflect.apply(target, thisArg, args).then(prune)
    });

    // Если реклама всё же пошла (например, вшита в поток): без звука, x16 и «Пропустить»
    const SKIP_BUTTONS = '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern';
    let saved = null;

    function onVideoEvent(event) {
        const video = event.target;
        if (!(video instanceof HTMLVideoElement)) {
            return;
        }
        const player = video.closest('.html5-video-player');
        if (!player) {
            return;
        }
        if (player.classList.contains('ad-showing')) {
            if (!saved) {
                saved = {muted: video.muted, playbackRate: video.playbackRate};
            }
            video.muted = true;
            video.playbackRate = 16;
            player.querySelector(SKIP_BUTTONS)?.click();
        } else if (saved) {
            video.muted = saved.muted;
            video.playbackRate = saved.playbackRate;
            saved = null;
        }
    }

    // События медиа не всплывают, поэтому ловим на этапе погружения
    for (const type of ['playing', 'timeupdate', 'ratechange']) {
        document.addEventListener(type, onVideoEvent, true);
    }

})();
