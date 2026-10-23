/**
 * Косметические фильтры списков (расширенный режим): места под рекламу, которые остаются на странице
 * после блокировки запросов. Собирает классы и id элементов и отправляет их background/sw.js —
 * тот подбирает селекторы списков и вставляет их в страницу. Сами списки в страницу не попадают.
 * @author AlekseyArh
 * @link https://github.com/arhone/ablock
 */
(() => {
    // Новые классы и id отправляются пачкой не чаще раза в 64 мс
    const DELAY = 64;
    // Если DOM не меняется 30 секунд, страница собрана: наблюдение прекращается
    const IDLE = 30000;
    // Сколько пачек подряд без единого селектора терпим, прежде чем прекратить (страница без рекламной разметки)
    const MAX_MISSES = 64;

    const seen = new Set();
    let pending = [];
    let first = true;
    let timer = null;
    let idleTimer = null;
    let misses = 0;
    let lastChange = Date.now();
    let observer = null;

    const add = (token) => {
        if (!seen.has(token)) {
            seen.add(token);
            pending.push(token);
        }
    };

    /** @param {Element} element */
    const addElement = (element) => {
        const id = element.id;
        if (typeof id === 'string' && id.trim()) {
            add('#' + id.trim());
        }
        const classes = element.getAttribute('class');
        if (classes) {
            for (const name of classes.split(/\s+/)) {
                if (name) {
                    add('.' + name);
                }
            }
        }
    };

    /** @param {Element} root */
    const scan = (root) => {
        addElement(root);
        for (const element of root.querySelectorAll('[id],[class]')) {
            addElement(element);
        }
    };

    const stop = () => {
        observer?.disconnect();
        observer = null;
        clearTimeout(timer);
        clearTimeout(idleTimer);
    };

    const flush = () => {
        timer = null;
        if (!pending.length && !first) {
            return;
        }
        const tokens = pending;
        pending = [];
        const message = {cosmetic: tokens, first};
        // Тема браузера — для цвета счётчика на иконке
        if (first) {
            message.dark = matchMedia('(prefers-color-scheme: dark)').matches;
        }
        first = false;
        chrome.runtime.sendMessage(message).then((count) => {
            misses = count ? 0 : misses + 1;
            if (misses >= MAX_MISSES) {
                stop();
            }
        }, stop);
    };

    const schedule = () => {
        timer ??= setTimeout(flush, DELAY);
    };

    const checkIdle = () => {
        if (Date.now() - lastChange > IDLE) {
            stop();
            return;
        }
        idleTimer = setTimeout(checkIdle, IDLE);
    };

    // Первая пачка сразу: в ответ приходят и селекторы для этого сайта, и общие
    scan(document.documentElement);
    flush();

    observer = new MutationObserver((mutations) => {
        lastChange = Date.now();
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        scan(node);
                    }
                }
            } else {
                addElement(mutation.target);
            }
        }
        if (pending.length) {
            schedule();
        }
    });
    observer.observe(document, {childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id']});
    checkIdle();
})();
