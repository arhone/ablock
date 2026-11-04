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

    // Проверяем не только число совпадений, но и наличие выбранного элемента.
    function check(doc, el, s) {
        if (!valid(s)) return null;
        try {
            const matches = doc.querySelectorAll(s);
            return [...matches].includes(el) ? {s, count: matches.length} : null;
        } catch {
            return null;
        }
    }

    function idSelector(doc, node) {
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

    // Добавляет часть селектора, если она допустима; возвращает накопленный селектор
    function extend(result, s, next) {
        if (!valid(next)) return s;
        result.push(next);
        return next;
    }

    function sourceSelector(doc, node, s) {
        if (!/^(?:iframe|img)$/.test(node.localName)) return '';
        try {
            const raw = node.getAttribute('src') || '';
            const url = new URL(raw, doc.baseURI);
            const prefix = `${url.origin}/`;
            if (/^https?:$/.test(url.protocol) && raw.startsWith(prefix)) {
                const next = `${s}[src^="${CSS.escape(prefix)}"]`;
                if (valid(next)) return next;
            }
        } catch {
            // Некорректный адрес не участвует в селекторе.
        }
        return '';
    }

    function parts(doc, node) {
        const id = idSelector(doc, node);
        if (id) return [id];
        const result = [];
        let s = CSS.escape(node.localName);
        for (const name of node.classList) {
            if (isStableClass(name)) s = extend(result, s, `${s}.${CSS.escape(name)}`);
        }
        for (const name of ['data-testid', 'aria-label', 'role', 'name']) {
            const value = node.getAttribute(name);
            if (value) s = extend(result, s, `${s}[${name}="${CSS.escape(value)}"]`);
        }
        const source = sourceSelector(doc, node, s);
        if (source) result.push(source);
        return result;
    }

    function consider(state, doc, el, s) {
        const found = check(doc, el, s);
        if (found && (!state.best || found.count < state.best.count ||
            (found.count === state.best.count && found.s.length < state.best.s.length))) state.best = found;
        return found?.count === 1;
    }

    // Пути по устойчивым признакам; levels заполняется для позиционных путей
    function stableSelectors(doc, el, state, levels) {
        let node = el;
        let path = '';
        // Не поднимаемся до html/body и не строим цепочки длиннее пяти уровней.
        for (let depth = 0; node && depth < 5 && !/^(?:html|body)$/i.test(node.localName); depth++) {
            const variants = parts(doc, node);
            levels.push({node, part: variants.at(-1) || CSS.escape(node.localName), stable: variants.length > 0});
            for (const part of variants) {
                if (consider(state, doc, el, path ? `${part} > ${path}` : part)) return true;
            }
            path = path ? `${levels[depth].part} > ${path}` : levels[depth].part;
            node = node.parentElement;
        }
        return false;
    }

    // Позиция среди одноимённых соседей — только после устойчивых признаков.
    function positionalSelectors(doc, el, state, levels) {
        let path = '';
        let stablePath = false;
        const hasStable = levels.some((level) => level.stable);
        for (const level of levels) {
            stablePath ||= level.stable;
            const siblings = [...level.node.parentElement.children].filter((sibling) =>
                sibling.localName === level.node.localName && sibling.namespaceURI === level.node.namespaceURI);
            level.position = siblings.indexOf(level.node) + 1;
            const part = `${level.part}:nth-of-type(${level.position})`;
            path = path ? `${part} > ${path}` : part;
            if ((stablePath || !hasStable) && consider(state, doc, el, path)) return true;
        }
        return false;
    }

    // Если допустимого пути с признаками нет, пробуем короткую позиционную цепочку.
    function positionalChain(doc, el, state, levels) {
        let path = '';
        for (const level of levels) {
            const part = `${CSS.escape(level.node.localName)}:nth-of-type(${level.position})`;
            path = path ? `${part} > ${path}` : part;
            if (consider(state, doc, el, path)) return true;
        }
        return false;
    }

    function build(el) {
        const empty = {s: '', count: 0};
        if (el?.nodeType !== 1 || /^(?:html|body)$/i.test(el.localName) ||
            el.getRootNode() !== el.ownerDocument || !el.isConnected) return empty;
        const doc = el.ownerDocument;
        const id = idSelector(doc, el);
        if (id) return check(doc, el, id) || empty;
        const state = {best: null};
        const levels = [];
        if (stableSelectors(doc, el, state, levels) || positionalSelectors(doc, el, state, levels)) return state.best;
        if (!state.best && positionalChain(doc, el, state, levels)) return state.best;
        // Голый тег — последний запасной вариант.
        if (!state.best) consider(state, doc, el, CSS.escape(el.localName));
        return state.best || empty;
    }

    function kindOf(el, view, rect) {
        const tag = el.localName;
        if (/^(?:img|picture|svg)$/.test(tag)) return 'image';
        if (/^(?:video|audio|embed|object)$/.test(tag)) return 'video';
        if (tag === 'iframe') return 'frame';
        const style = view.getComputedStyle(el);
        if (el.getAttribute('role') === 'dialog' || el.hasAttribute('aria-modal') ||
            (style.position === 'fixed' && rect.width > view.innerWidth * 0.5 &&
                rect.height > view.innerHeight * 0.3)) return 'dialog';
        let node = el;
        for (let depth = 0; node && depth <= 3; depth++, node = node.parentElement) {
            if (['fixed', 'sticky'].includes(view.getComputedStyle(node).position)) return 'banner';
        }
        return 'block';
    }

    function invisible(node, view) {
        if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true' ||
            node.checkVisibility?.() === false) return true;
        const style = view.getComputedStyle(node);
        return style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility);
    }

    // Отбрасываем чувствительные и невидимые поддеревья целиком, не читая их текст.
    function safeText(el, view) {
        if (invisible(el, view)) return '';
        const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (node.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
                if (node.isContentEditable || node.matches('input, textarea, select, [contenteditable], script, style, noscript, template') || invisible(node, view)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        });
        const parts = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) parts.push(node.nodeValue);
        return parts.join(' ');
    }

    function labelOf(el) {
        if (el.isContentEditable || el.closest('input, textarea, select, [contenteditable]')) return '';
        const view = el.ownerDocument.defaultView;
        const reads = [() => el.getAttribute('aria-label'), () => el.getAttribute('alt'),
            () => el.getAttribute('title'), () => safeText(el, view)];
        for (const read of reads) {
            const text = (read() || '').replaceAll(/\s+/g, ' ').trim();
            if (!text) continue;
            // Место под многоточие входит в лимит UTF-16; пару не разрываем.
            return text.length <= 60 ? text : text.slice(0, 59).replace(/[\uD800-\uDBFF]$/, '') + '…';
        }
        return '';
    }

    function sourceHost(el, tag) {
        if (!/^(?:iframe|img|video)$/.test(tag)) return null;
        const doc = el.ownerDocument;
        try {
            const source = tag === 'img' ? el.currentSrc || el.src : el.src;
            const url = new URL(source, doc.baseURI);
            if (/^https?:$/.test(url.protocol) && url.host !== doc.defaultView.location.host) return url.host;
        } catch {
            // Пустой или некорректный источник не показываем в описании.
        }
        return null;
    }

    function describe(el) {
        const doc = el.ownerDocument;
        const view = doc.defaultView;
        const rect = el.getBoundingClientRect();
        const result = {k: kindOf(el, view, rect), t: labelOf(el), w: Math.round(rect.width), h: Math.round(rect.height)};
        const src = sourceHost(el, el.localName);
        if (src !== null) result.src = src;
        return result;
    }

    globalThis.aBlockPickerCore = {build, describe, isStableClass};
})();
