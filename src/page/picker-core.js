/**
 * @author AlekseyArh
 * @link https://github.com/arhone/ablock
 *
 * Построение селектора и описание выбранного элемента без изменения страницы.
 */
(() => {
    function isStableClass(name) {
        return typeof name === 'string' && !!name &&
            !/\s|[{};]/.test(name) && !name.includes('/*') &&
            !/^(?:css-|sc-|jsx-\d+)/i.test(name) &&
            !/^_.+_[a-z\d]{5,}(?:_|$)/i.test(name) &&
            !/__[a-z\d]{5,}(?:_|$)/i.test(name) &&
            (name.match(/\d/g) || []).length < 3 &&
            !(name.length >= 5 && /[a-z]/i.test(name) && /\d/.test(name));
    }

    function valid(s) {
        return !!s && s.length <= 300 && !/[{};]/.test(s) && !s.includes('/*') &&
            !/^(?:html|body|:root|\*)$/i.test(s);
    }

    function build(el) {
        const empty = {s: '', count: 0};
        if (!el || el.nodeType !== 1 || /^(?:html|body)$/i.test(el.localName) ||
            el.getRootNode() !== el.ownerDocument || !el.isConnected) return empty;
        const doc = el.ownerDocument;

        // Проверяем не только число совпадений, но и наличие выбранного элемента.
        function check(s) {
            if (!valid(s)) return null;
            try {
                const matches = doc.querySelectorAll(s);
                return [...matches].includes(el) ? {s, count: matches.length} : null;
            } catch {
                return null;
            }
        }

        function idSelector(node) {
            if (!isStableClass(node.id)) return '';
            const s = `#${CSS.escape(node.id)}`;
            if (!valid(s)) return '';
            try {
                const matches = doc.querySelectorAll(s);
                return matches.length === 1 && matches[0] === node ? s : '';
            } catch {
                return '';
            }
        }

        function parts(node) {
            const tag = CSS.escape(node.localName);
            const id = idSelector(node);
            if (id) return [id];
            const result = [];
            let s = tag;
            for (const name of node.classList) {
                if (!isStableClass(name)) continue;
                const next = `${s}.${CSS.escape(name)}`;
                if (valid(next)) result.push(s = next);
            }
            for (const name of ['data-testid', 'aria-label', 'role', 'name']) {
                const value = node.getAttribute(name);
                if (!value) continue;
                const next = `${s}[${name}="${CSS.escape(value)}"]`;
                if (valid(next)) result.push(s = next);
            }
            if (/^(?:iframe|img)$/.test(node.localName)) {
                try {
                    const raw = node.getAttribute('src') || '';
                    const url = new URL(raw, doc.baseURI);
                    const prefix = `${url.origin}/`;
                    if (/^https?:$/.test(url.protocol) && raw.startsWith(prefix)) {
                        const next = `${s}[src^="${CSS.escape(prefix)}"]`;
                        if (valid(next)) result.push(next);
                    }
                } catch {
                    // Некорректный адрес не участвует в селекторе.
                }
            }
            return result;
        }

        const id = idSelector(el);
        if (id) return check(id) || empty;
        let best = null;
        function consider(s) {
            const found = check(s);
            if (found && (!best || found.count < best.count ||
                (found.count === best.count && found.s.length < best.s.length))) best = found;
            return found?.count === 1;
        }

        const levels = [];
        let node = el;
        let path = '';
        // Не поднимаемся до html/body и не строим цепочки длиннее пяти уровней.
        for (let depth = 0; node && depth < 5 && !/^(?:html|body)$/i.test(node.localName); depth++) {
            const variants = parts(node);
            levels.push({node, part: variants[variants.length - 1] || CSS.escape(node.localName),
                stable: variants.length > 0});
            for (const part of variants) {
                if (consider(path ? `${part} > ${path}` : part)) return best;
            }
            path = path ? `${levels[depth].part} > ${path}` : levels[depth].part;
            node = node.parentElement;
        }

        // Позиция среди одноимённых соседей — только после устойчивых признаков.
        path = '';
        let stablePath = false;
        const hasStable = levels.some((level) => level.stable);
        for (const level of levels) {
            stablePath ||= level.stable;
            const siblings = [...level.node.parentElement.children].filter((sibling) =>
                sibling.localName === level.node.localName && sibling.namespaceURI === level.node.namespaceURI);
            level.position = siblings.indexOf(level.node) + 1;
            const part = `${level.part}:nth-of-type(${level.position})`;
            path = path ? `${part} > ${path}` : part;
            if ((stablePath || !hasStable) && consider(path)) return best;
        }
        // Если допустимого пути с признаками нет, пробуем короткую позиционную цепочку.
        if (!best) {
            path = '';
            for (const level of levels) {
                const part = `${CSS.escape(level.node.localName)}:nth-of-type(${level.position})`;
                path = path ? `${part} > ${path}` : part;
                if (consider(path)) return best;
            }
        }
        // Голый тег — последний запасной вариант.
        if (!best) consider(CSS.escape(el.localName));
        return best || empty;
    }

    function describe(el) {
        const doc = el.ownerDocument;
        const view = doc.defaultView;
        const rect = el.getBoundingClientRect();
        const tag = el.localName;
        const style = view.getComputedStyle(el);
        let k = 'block';
        if (/^(?:img|picture|svg)$/.test(tag)) k = 'image';
        else if (/^(?:video|audio|embed|object)$/.test(tag)) k = 'video';
        else if (tag === 'iframe') k = 'frame';
        else if (el.getAttribute('role') === 'dialog' || el.hasAttribute('aria-modal') ||
            (style.position === 'fixed' && rect.width > view.innerWidth * 0.5 &&
                rect.height > view.innerHeight * 0.3)) k = 'dialog';
        else {
            let node = el;
            for (let depth = 0; node && depth <= 3; depth++, node = node.parentElement) {
                if (['fixed', 'sticky'].includes(view.getComputedStyle(node).position)) {
                    k = 'banner';
                    break;
                }
            }
        }

        function invisible(node) {
            if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true' ||
                node.checkVisibility?.() === false) return true;
            const style = view.getComputedStyle(node);
            return style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility);
        }

        // Отбрасываем чувствительные и невидимые поддеревья целиком, не читая их текст.
        function safeText() {
            if (invisible(el)) return '';
            const walker = doc.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    if (node.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
                    if (node.isContentEditable || node.matches('input, textarea, select, [contenteditable], script, style, noscript, template') || invisible(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            });
            const parts = [];
            let node;
            while ((node = walker.nextNode())) parts.push(node.nodeValue);
            return parts.join(' ');
        }

        let t = '';
        if (!el.isContentEditable && !el.closest('input, textarea, select, [contenteditable]')) {
            for (const read of [() => el.getAttribute('aria-label'), () => el.getAttribute('alt'),
                () => el.getAttribute('title'), safeText]) {
                const text = (read() || '').replace(/\s+/g, ' ').trim();
                if (!text) continue;
                if (text.length <= 60) t = text;
                else {
                    // Место под многоточие входит в лимит UTF-16; пару не разрываем.
                    t = text.slice(0, 59).replace(/[\uD800-\uDBFF]$/, '') + '…';
                }
                break;
            }
        }
        const result = {k, t, w: Math.round(rect.width), h: Math.round(rect.height)};
        if (/^(?:iframe|img|video)$/.test(tag)) {
            try {
                const source = tag === 'img' ? el.currentSrc || el.src : el.src;
                const url = new URL(source, doc.baseURI);
                if (/^https?:$/.test(url.protocol) && url.host !== view.location.host) result.src = url.host;
            } catch {
                // Пустой или некорректный источник не показываем в описании.
            }
        }
        return result;
    }

    globalThis.aBlockPickerCore = {build, describe, isStableClass};
})();
