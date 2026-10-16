/**
 * Блокировка рекламы в OK.
 * Выполняется в контексте страницы (world: MAIN) до загрузки скриптов сайта.
 */
(function () {

    /**
     * Удаляет рекламу Яндекс.Директа из ответа
     * @param data
     * @returns {*}
     */
    function prune(data) {
        const body = data?.result?.body;
        if (body && typeof body === 'object' && 'direct' in body) {
            delete body.direct;
        }
        return data;
    }

    JSON.parse = new Proxy(JSON.parse, {
        apply: (target, thisArg, args) => prune(Reflect.apply(target, thisArg, args))
    });
    Response.prototype.json = new Proxy(Response.prototype.json, {
        apply: (target, thisArg, args) => Reflect.apply(target, thisArg, args).then(prune)
    });

    // Без этих параметров рекламный код не может замаскировать свои запросы
    Object.defineProperty(Object.prototype, 'obfuscateParams', {
        get: () => undefined,
        set: () => {}
    });

    // Рекламные посты в ленте: отличаются только подписью «Реклама»
    const AD_LABEL = /реклама/i;

    function hideFeedAds(root) {
        for (const label of root.querySelectorAll('.feed-info-label')) {
            if (AD_LABEL.test(label.textContent)) {
                const post = label.closest('.feed-w');
                if (post) {
                    post.style.setProperty('display', 'none', 'important');
                }
            }
        }
    }

    // Каждого родителя проверяем один раз за пачку изменений, а не на каждый добавленный узел
    new MutationObserver((mutations) => {
        const roots = new Set();
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof Element) {
                    roots.add(node.parentElement ?? node);
                }
            }
        }
        for (const root of roots) {
            hideFeedAds(root);
        }
    }).observe(document, {childList: true, subtree: true});

})();
