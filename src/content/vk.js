/**
 * Блокировка рекламы в ленте VK.
 * Выполняется в контексте страницы (world: MAIN) до загрузки скриптов сайта.
 */
(function () {

    // Клиент VK сам отключает рекламу, если флаг выставлен
    Object.defineProperty(window, 'noAdsAtAll', {
        get: () => true,
        set: () => {}
    });

    /**
     * Удаляет рекламные посты из ответа ленты (newsfeed.getFeedExp): элементы с type "ads"
     * @param data
     * @returns {*}
     */
    function prune(data) {
        const response = data?.response;
        if (response && Array.isArray(response.items)) {
            response.items = response.items.filter((item) => item?.type !== 'ads');
        }
        return data;
    }

    Response.prototype.json = new Proxy(Response.prototype.json, {
        apply: (target, thisArg, args) => Reflect.apply(target, thisArg, args).then(prune)
    });

    // Проверка блокировщика (isAdblockDetected): HEAD-запросы к этим адресам. Отвечаем «всё загрузилось».
    const PROBES = new Set([
        'https://tns-counter.ru',
        'https://top-fwz1.mail.ru',
        'https://ads.vk.com',
        'https://r0.mradx.net'
    ]);

    window.fetch = new Proxy(window.fetch, {
        apply: (target, thisArg, args) => {
            const [resource, options] = args;
            const url = resource instanceof Request ? resource.url : String(resource);
            const method = (options?.method ?? (resource instanceof Request ? resource.method : 'GET')).toUpperCase();
            if (method === 'HEAD' && PROBES.has(url.replace(/\/$/, ''))) {
                return Promise.resolve(new Response(null, {status: 200}));
            }
            return Reflect.apply(target, thisArg, args);
        }
    });

})();
