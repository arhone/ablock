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

    // Рекламные блоки в ответах ленты: переименовываем поле banner, и клиент их не рисует
    const FEED_URL = /feed/;
    const urls = new WeakMap();

    XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
        apply: (target, thisArg, args) => {
            urls.set(thisArg, String(args[1]));
            return Reflect.apply(target, thisArg, args);
        }
    });

    /**
     * Подменяет геттер ответа XHR для запросов ленты
     * @param {string} name responseText или response
     */
    function patchResponse(name) {
        const descriptor = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, name);
        descriptor.get = new Proxy(descriptor.get, {
            apply: (target, thisArg, args) => {
                const value = Reflect.apply(target, thisArg, args);
                if (typeof value === 'string' && FEED_URL.test(urls.get(thisArg) ?? '')) {
                    return value.replace(/banner:/g, '_banner:');
                }
                return value;
            }
        });
        Object.defineProperty(XMLHttpRequest.prototype, name, descriptor);
    }
    patchResponse('responseText');
    patchResponse('response');

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
