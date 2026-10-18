/**
 * Реклама Pornhub в обход блокировщика: если скрипт TrafficJunky заблокирован, сайт вставляет баннеры
 * в элементы с выдуманным именем тега из букв a–j (закодированные цифры): <cdabd>, <bdbbc>.
 * Такие элементы прячем, как только они появляются. Настоящие теги из этих букв (head) браузер знает — их не трогаем.
 */
(() => {
    const RANDOM_TAG = /^[a-j]{4,12}$/;

    /** @param {Element} element */
    const check = (element) => {
        if (RANDOM_TAG.test(element.localName) && document.createElement(element.localName) instanceof HTMLUnknownElement) {
            element.style.setProperty('display', 'none', 'important');
        }
    };

    new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    check(node);
                    for (const child of node.children) {
                        check(child);
                    }
                }
            }
        }
    }).observe(document, {childList: true, subtree: true});
})();
