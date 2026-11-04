/* global t */

// Отдельный экран: хранилище меняет только фон, окно управляет предпросмотром.
(() => {
    let dispose = null;
    globalThis.openHidden = async ({tab, host, onClose}) => {
        if (dispose) {
            await dispose();
        }
        const screen = document.getElementById('hidden-screen');
        if (!screen) {
            return;
        }
        const previousFocus = document.activeElement;
        let closed = false;
        let changed = false;
        let busy = false;
        let deletion = Promise.resolve(false);
        let confirmTimer = null;
        let current = null;
        let desired = null;
        let hovered = null;
        let focused = null;
        let queue = Promise.resolve();
        const selected = new Set();
        const port = chrome.runtime.connect({name: 'aBlockHover'});
        const post = (message) => {
            try {
                port.postMessage(message);
            } catch {
                // При перезапуске расширения порт уже закрыт.
            }
        };
        const node = (tag, className, text) => {
            const el = document.createElement(tag);
            el.className = className;
            if (text !== undefined) {
                el.textContent = text;
            }
            return el;
        };
        const button = (text, className) => {
            const el = node('button', className, text);
            el.type = 'button';
            return el;
        };
        screen.replaceChildren();
        const head = node('div', 'hidden-head');
        const back = button('', 'hidden-back');
        back.setAttribute('aria-label', t('hiddenBack'));
        back.append(node('span', '', '‹'));
        const title = node('h2', 'hidden-title');
        // Подстановка хоста отдельным bdi сохраняет порядок в RTL и при копировании.
        const marker = '\uFFFC';
        const parts = t('hiddenTitle', marker).split(marker);
        title.append(document.createTextNode(parts[0]), node('bdi', '', host), document.createTextNode(parts.slice(1).join(marker)));
        title.querySelector('bdi').dir = 'ltr';
        const count = node('span', 'hidden-count');
        head.append(back, title, count);
        const toolbar = node('div', 'hidden-toolbar');
        const allLabel = node('label', 'hidden-all');
        const all = node('input', '');
        all.type = 'checkbox';
        allLabel.append(all, document.createTextNode(t('hiddenSelectAll')));
        const selection = node('span', 'hidden-selected');
        toolbar.append(allLabel, selection);
        const list = node('div', 'hidden-list');
        const hint = node('p', 'hidden-hint');
        hint.setAttribute('role', 'status');
        const actions = node('div', 'hidden-actions');
        const clear = button(t('hiddenClear'), 'hidden-clear');
        const remove = button(t('hiddenDelete'), 'hidden-delete');
        const disable = button('', 'hidden-disable');
        const enable = button('', 'hidden-enable');
        actions.append(disable, enable, remove, clear);
        screen.append(head, toolbar, list, hint, actions);
        screen.hidden = false;
        document.body.dataset.screen = 'hidden';
        const resize = () => {
            if (closed) {
                return;
            }
            const height = Math.max(document.body.scrollHeight, document.body.getBoundingClientRect().height);
            list.style.maxHeight = `${Math.max(0, 600 - (height - list.getBoundingClientRect().height))}px`;
        };
        const setHint = (key) => {
            hint.textContent = t(confirmTimer ? 'hiddenClearHint' : key);
            resize();
        };
        const defaultHint = 'hiddenHint';
        const css = (item, outline = false) => ({
            target: {tabId: tab.id, documentIds: [documentId]},
            css: outline ? `${item.s}{outline:2px solid #12a86b!important;outline-offset:-2px!important}`
                : `${item.s}{display:none!important}`,
            origin: 'USER'
        });
        const restore = async () => {
            if (!current) {
                return;
            }
            const item = current;
            await chrome.scripting.removeCSS(css(item, true)).catch(() => {});
            if (item.hidden) {
                await chrome.scripting.insertCSS(css(item)).catch(() => {});
            }
            current = null;
            post({s: null});
        };
        // Все изменения CSS идут последовательно, включая уход и удаление записи.
        const highlight = (item) => {
            desired = busy ? null : item;
            queue = queue.then(async () => {
                if (current === desired) {
                    if (!closed) {
                        setHint(current ? 'hiddenLit' : defaultHint);
                    }
                    return;
                }
                await restore();
                const next = desired;
                if (closed || !next || !next.count || !documentId) {
                    if (!closed) {
                        setHint(next?.count === 0 ? 'hiddenMissingHint' : defaultHint);
                    }
                    return;
                }
                current = next;
                post({tabId: tab.id, documentId, s: next.s, hidden: next.hidden});
                if (next.hidden) {
                    await chrome.scripting.removeCSS(css(next));
                }
                await chrome.scripting.insertCSS(css(next, true));
                await chrome.scripting.executeScript({
                    target: {tabId: tab.id, documentIds: [documentId]},
                    func: (s) => document.querySelector(s)?.scrollIntoView({block: 'center', inline: 'nearest'}),
                    args: [next.s]
                });
                if (!closed && desired === next) {
                    setHint('hiddenLit');
                }
            }).catch(async () => {
                await restore();
                if (!closed) {
                    setHint(defaultHint);
                }
            });
            return queue;
        };
        const close = async () => {
            if (closed) {
                return;
            }
            closed = true;
            clearTimeout(confirmTimer);
            document.removeEventListener('keydown', escape, true);
            window.removeEventListener('resize', resize);
            observer.disconnect();
            await highlight(null);
            await deletion;
            port.disconnect();
            screen.hidden = true;
            screen.replaceChildren();
            delete document.body.dataset.screen;
            dispose = null;
            previousFocus?.focus();
            onClose?.(changed);
        };
        const escape = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                void close();
            }
        };
        dispose = close;
        back.addEventListener('click', close);
        document.addEventListener('keydown', escape, true);
        window.addEventListener('resize', resize);
        const observer = new ResizeObserver(resize);
        observer.observe(screen);
        const footer = document.querySelector('body > footer');
        if (footer) {
            observer.observe(footer);
        }
        back.focus();
        let entries = [];
        let documentId = null;
        const stored = await chrome.storage.local.get('aBlockCustom').catch(() => ({}));
        entries = Object.hasOwn(stored.aBlockCustom || {}, host) ? stored.aBlockCustom[host] : [];
        const [inspection] = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: (selectors) => selectors.map((s) => {
                try {
                    const elements = [...document.querySelectorAll(s)];
                    return {count: elements.length, hidden: elements.length > 0
                        && elements.every((el) => getComputedStyle(el).display === 'none')};
                } catch {
                    return {count: 0, hidden: false};
                }
            }),
            args: [entries.map(({s}) => s)]
        }).catch(() => []);
        if (closed) {
            return;
        }
        documentId = inspection?.documentId;
        entries = entries.map((entry, i) => ({...entry, count: inspection?.result?.[i]?.count ?? null,
            hidden: Boolean(entry.enabled !== false && inspection?.result?.[i]?.hidden)}));
        const updateSelection = () => {
            all.checked = entries.length > 0 && selected.size === entries.length;
            all.indeterminate = selected.size > 0 && selected.size < entries.length;
            all.disabled = busy || !entries.length;
            selection.textContent = selected.size ? t('hiddenSelected', selected.size) : '';
            remove.textContent = selected.size ? t('hiddenDeleteN', selected.size) : t('hiddenDelete');
            remove.disabled = busy || !selected.size;
            clear.disabled = busy || !entries.length;
            for (const [button, key, state] of [[disable, 'hiddenDisableN', true], [enable, 'hiddenEnableN', false]]) {
                const n = entries.filter((item) => selected.has(item.s) && (item.enabled !== false) === state).length;
                button.textContent = t(key, n);
                button.disabled = busy || !n;
            }
            for (const input of list.querySelectorAll('input')) {
                input.checked = selected.has(input.value);
                input.disabled = busy;
            }
            resize();
        };
        const paths = {
            image: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M8 7h.01',
            video: 'M3 3h18v18H3z M10 8l7 4-7 4z',
            frame: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 5l-4 14',
            banner: 'M3 4h18v16H3z M3 9h18',
            dialog: 'M3 3h18v18H3z M3 8h18 M7 5h.01 M10 5h.01',
            block: 'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5'
        };
        const render = () => {
            hovered = focused = null;
            list.replaceChildren();
            count.textContent = String(entries.length);
            for (const item of entries) {
                const row = node('label', 'hidden-row');
                row.classList.toggle('hidden-missing', item.count === 0);
                row.classList.toggle('hidden-disabled', item.enabled === false);
                if (item.enabled === false) row.title = t('hiddenEnableN', 1);
                const check = node('input', '');
                check.type = 'checkbox';
                check.value = item.s;
                const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                icon.setAttribute('viewBox', '0 0 24 24');
                icon.setAttribute('aria-hidden', 'true');
                const path = document.createElementNS(icon.namespaceURI, 'path');
                path.setAttribute('d', paths[item.k] || paths.block);
                icon.append(path);
                const description = node('span', 'hidden-description');
                const line = node('span', 'hidden-summary');
                const kind = Object.hasOwn(paths, item.k) ? item.k : 'block';
                line.append(document.createTextNode(t(`kind${kind[0].toUpperCase()}${kind.slice(1)}`) + ' · '));
                const size = node('bdi', '', `${item.w}×${item.h}`);
                size.dir = 'ltr';
                line.append(size);
                if (item.src) {
                    const source = node('bdi', '', item.src);
                    source.dir = 'ltr';
                    line.append(document.createTextNode(' · '), source);
                }
                description.append(line);
                if (item.t) {
                    const text = node('span', 'hidden-text');
                    text.append(node('bdi', '', t('pickQuote', item.t)));
                    description.append(text);
                }
                if (item.count === 0) {
                    description.append(node('span', 'hidden-absent', t('hiddenMissing')));
                }
                const selector = node('code', 'hidden-selector', item.s);
                selector.dir = 'ltr';
                selector.title = item.s;
                description.append(selector);
                row.append(check, icon, description);
                check.addEventListener('change', () => {
                    if (check.checked) {
                        selected.add(item.s);
                    } else {
                        selected.delete(item.s);
                    }
                    updateSelection();
                });
                row.addEventListener('pointerenter', () => { hovered = item; void highlight(item); });
                row.addEventListener('pointerleave', () => { hovered = null; void highlight(focused); });
                row.addEventListener('focusin', () => { focused = item; void highlight(item); });
                row.addEventListener('focusout', () => { focused = null; void highlight(hovered); });
                list.append(row);
            }
            updateSelection();
            setHint(defaultHint);
        };
        all.addEventListener('change', () => {
            selected.clear();
            if (all.checked) {
                entries.forEach(({s}) => selected.add(s));
            }
            updateSelection();
        });
        const disarm = () => {
            clearTimeout(confirmTimer);
            confirmTimer = null;
            clear.classList.remove('hidden-confirm');
            clear.textContent = t('hiddenClear');
            setHint(defaultHint);
        };
        const erase = async (everything) => {
            if (busy) {
                return;
            }
            busy = true;
            updateSelection();
            deletion = (async () => {
                await highlight(null);
                if (!documentId) {
                    const [result] = await chrome.scripting.executeScript({
                        target: {tabId: tab.id},
                        func: () => null
                    }).catch(() => []);
                    documentId = result?.documentId;
                }
                const data = {host, tabId: tab.id, ...(documentId ? {documentId} : {})};
                const saved = await chrome.runtime.sendMessage(everything ? {customClear: data}
                    : {customRemove: {...data, selectors: [...selected]}}).catch(() => false);
                changed ||= saved === true;
                return saved;
            })();
            const saved = await deletion;
            if (closed) {
                return;
            }
            busy = false;
            disarm();
            if (saved === true) {
                entries = everything ? [] : entries.filter(({s}) => !selected.has(s));
                selected.clear();
                render();
                if (!entries.length) {
                    await close();
                    return;
                }
                all.focus();
            } else {
                updateSelection();
            }
        };
        const toggle = async (enabled) => {
            if (busy) return;
            busy = true;
            updateSelection();
            deletion = (async () => {
                await highlight(null);
                const saved = await chrome.runtime.sendMessage({customToggle: {host, selectors: [...selected],
                    enabled, tabId: tab.id, ...(documentId ? {documentId} : {})}}).catch(() => false);
                changed ||= saved === true;
                return saved;
            })();
            const saved = await deletion;
            if (closed) return;
            busy = false;
            disarm();
            if (saved === true) {
                const access = await chrome.permissions.contains({permissions: ['webRequest'], origins: ['<all_urls>']})
                    .catch(() => false);
                if (closed) return;
                entries = entries.map((item) => selected.has(item.s)
                    ? {...item, enabled, hidden: enabled && access && !!documentId} : item);
                render();
                all.focus();
            } else {
                updateSelection();
            }
        };
        disable.addEventListener('click', () => toggle(false));
        enable.addEventListener('click', () => toggle(true));
        remove.addEventListener('click', () => erase(false));
        clear.addEventListener('click', () => {
            if (confirmTimer) {
                void erase(true);
                return;
            }
            confirmTimer = setTimeout(disarm, 4000);
            clear.classList.add('hidden-confirm');
            clear.textContent = t('hiddenClearConfirm', entries.length);
            setHint('hiddenClearHint');
        });
        render();
    };
})();
