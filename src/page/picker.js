/**
 * @author AlekseyArh
 * @link https://github.com/arhone/ablock
 *
 * Выбор и скрытие элемента на странице в изолированном мире расширения.
 */
(() => {
    globalThis.aBlockPickerStop?.();
    const cfg = globalThis.aBlockPickerConfig;
    const core = globalThis.aBlockPickerCore;
    if (!cfg?.strings || !core) return;
    const strings = cfg.strings;
    const previousFocus = document.activeElement;
    const host = document.createElement('div');
    // Стили хоста задаём с приоритетом: правила сайта не должны менять слой выбора.
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;pointer-events:auto!important;';
    const root = host.attachShadow({mode: 'closed'});
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
        :host { color-scheme:light dark; }
        * { box-sizing:border-box; }
        .surface { position:fixed; inset:0; cursor:crosshair; font:13px/1.4 system-ui,sans-serif; color:#20242c; --bg:#fff; --muted:#707887; --line:#e1e5e9; }
        .shade { position:absolute; inset:0; background:#0004; pointer-events:none; }
        .shade[hidden], [hidden] { display:none!important; }
        .frames { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
        .frame { position:absolute; border:2px dashed #12a86b; background:#12a86b0c; }
        .frame.main { border-style:solid; }
        .label { position:absolute; inset-inline-start:-2px; bottom:100%; background:#087c54; color:#fff; padding:2px 6px; white-space:nowrap; border-radius:3px 3px 0 0; }
        .panel { position:absolute; inset-inline:12px; margin-inline:auto; width:fit-content; max-width:calc(100% - 24px); max-height:min(600px,calc(100% - 24px)); overflow:auto; padding:12px; border:1px solid var(--line); border-radius:10px; background:var(--bg); box-shadow:0 4px 24px #0003; cursor:default; }
        .description { max-width:520px; overflow-wrap:anywhere; font-weight:600; }
        .quote { color:var(--muted); font-weight:400; margin-top:2px; }
        .actions, .hint { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
        .actions { margin-top:10px; }
        .hint { max-width:620px; }
        .esc { color:var(--muted); }
        button { font:inherit; color:inherit; background:var(--bg); border:1px solid var(--line); border-radius:5px; padding:7px 12px; cursor:pointer; }
        .actions button { min-width:88px; min-height:36px; }
        .actions .resize { min-width:36px; width:36px; height:36px; padding:0; display:inline-flex; align-items:center; justify-content:center; direction:ltr; }
        .resize svg { display:block; width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }
        button:focus-visible { outline:2px solid #12a86b; outline-offset:2px; }
        button:disabled { opacity:.45; cursor:default; }
        .hide { background:#087c54; border-color:#087c54; color:#fff; font-weight:600; }
        .matches { flex:1; }
        .many { color:#986000; }
        .toast { text-align:center; }
        @media(prefers-color-scheme:dark) {
            .surface { color:#e6e9ef; --bg:#1c2028; --muted:#a0a8b6; --line:#3c434f; }
            .hide { background:#12a86b; border-color:#12a86b; color:#071e15; }
            .many { color:#efbf62; }
        }
        @media(max-width:480px) {
            .panel { width:calc(100% - 24px); }
            .actions .matches { flex-basis:100%; }
            .actions .hide, .actions .cancel { flex:1; }
        }
    `);
    root.adoptedStyleSheets = [sheet];
    function node(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }
    const surface = node('div', 'surface');
    surface.dir = cfg.dir === 'rtl' ? 'rtl' : 'ltr';
    const shade = node('div', 'shade');
    shade.hidden = true;
    const frames = node('div', 'frames');
    const panel = node('div', 'panel');
    panel.setAttribute('role', 'region');
    const description = node('div', 'description');
    const actions = node('div', 'actions');
    function button(key, className, action, iconPath) {
        const el = node('button', className, iconPath ? undefined : strings[key]);
        if (iconPath) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 18 18');
            svg.setAttribute('aria-hidden', 'true');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', iconPath);
            svg.append(path);
            el.append(svg);
            el.title = strings[key];
            el.setAttribute('aria-label', strings[key]);
        }
        el.type = 'button';
        el.addEventListener('click', action);
        return el;
    }
    const wider = button('pickWider', 'resize', () => change(1), 'M8 9H1m4-4L1 9l4 4M10 9h7m-4-4 4 4-4 4');
    const narrower = button('pickNarrower', 'resize', () => change(-1), 'M1 9h6M3 5l4 4-4 4M17 9h-6m4-4-4 4 4 4');
    const matches = node('span', 'matches');
    const cancel = button('pickCancel', 'cancel', () => stop());
    const hide = button('pickHide', 'hide', save);
    actions.append(wider, narrower, matches, cancel, hide);
    const hint = node('div', 'hint');
    hint.append(node('span', '', strings[matchMedia('(pointer:coarse)').matches ? 'pickHintTouch' : 'pickHint']),
        node('span', 'esc', strings.pickEsc), button('pickCancel', 'cancel', () => stop()));
    panel.append(hint);
    surface.append(shade, frames, panel);
    root.append(surface);
    document.documentElement.append(host);
    let chain = [];
    let level = 0;
    let selected = null;
    let preview = null;
    let result = null;
    let busy = false;
    let ended = false;
    let focusRestored = false;
    let timer = 0;
    let frame = 0;
    let pointerY = -1;
    const listeners = [];
    const pressed = new Set();
    let releaseKeys = () => {};
    function listen(target, type, fn) {
        target.addEventListener(type, fn, true);
        listeners.push(() => target.removeEventListener(type, fn, true));
    }
    function restoreFocus() {
        if (focusRestored) return;
        focusRestored = true;
        if (previousFocus?.isConnected && !host.contains(previousFocus)) {
            previousFocus.focus({preventScroll: true});
        }
        // Если скрытое поле больше не принимает фокус, возвращаем его документу.
        if (document.activeElement === host) {
            const body = document.body;
            if (!body) return;
            const old = body.getAttribute('tabindex');
            body.setAttribute('tabindex', '-1');
            body.focus({preventScroll: true});
            if (old === null) body.removeAttribute('tabindex');
            else body.setAttribute('tabindex', old);
        }
    }
    function detach() {
        listeners.splice(0).forEach((remove) => remove());
        cancelAnimationFrame(frame);
        releaseKeys();
        if (!pressed.size) return;
        const keys = new Set(pressed);
        pressed.clear();
        // После выхода гасим только отпускание удерживаемых клавиш, не дольше секунды.
        const release = (event) => {
            if (!event.isTrusted || !keys.delete(event.key)) return;
            block(event);
            if (!keys.size) releaseKeys();
        };
        const timeout = setTimeout(() => releaseKeys(), 1000);
        releaseKeys = () => {
            clearTimeout(timeout);
            window.removeEventListener('keyup', release, true);
            window.removeEventListener('pagehide', releaseKeys, true);
            releaseKeys = () => {};
        };
        window.addEventListener('keyup', release, true);
        window.addEventListener('pagehide', releaseKeys, true);
    }
    function stop() {
        ended = true;
        detach();
        clearTimeout(timer);
        restoreFocus();
        host.remove();
        if (globalThis.aBlockPickerStop === stop) delete globalThis.aBlockPickerStop;
    }
    globalThis.aBlockPickerStop = stop;
    function kind(info) {
        return strings[`kind${info.k[0].toUpperCase()}${info.k.slice(1)}`] || strings.kindBlock;
    }
    function summary(target, info, source) {
        target.append(document.createTextNode(`${kind(info)} · `));
        const size = node('bdi', '', `${info.w}×${info.h}`);
        size.dir = 'ltr';
        target.append(size);
        if (source && info.src) {
            const src = node('bdi', '', info.src);
            src.dir = 'ltr';
            target.append(document.createTextNode(' · '), src);
        }
    }
    function place(rect) {
        const height = panel.getBoundingClientRect().height + 12 + 8;
        const bottom = rect && rect.bottom > innerHeight - height && rect.top < innerHeight;
        const top = rect && rect.top < height && rect.bottom > 0;
        const above = bottom && !top;
        panel.style.top = above ? '12px' : 'auto';
        panel.style.bottom = above ? 'auto' : '12px';
    }
    function draw() {
        frames.replaceChildren();
        const el = selected || preview;
        if (!el?.isConnected) {
            place(pointerY >= 0 ? {top: pointerY, bottom: pointerY + 1} : null);
            return;
        }
        const info = core.describe(el);
        const rect = el.getBoundingClientRect();
        const all = selected && result?.s ? [...document.querySelectorAll(result.s)] : [el];
        for (const match of all) {
            const r = match.getBoundingClientRect();
            if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
            const box = node('div', `frame${match === el ? ' main' : ''}`);
            box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
            if (match === el) {
                const label = node('span', 'label');
                summary(label, info, false);
                if (r.top < 24) { label.style.bottom = 'auto'; label.style.top = '0'; }
                box.append(label);
            }
            frames.append(box);
        }
        place(rect);
    }
    function schedule() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(draw);
    }
    function update(next = core.build(selected)) {
        result = next;
        description.replaceChildren();
        const info = core.describe(selected);
        summary(description, info, true);
        if (info.t) {
            const quote = node('div', 'quote');
            const text = node('bdi', '', (strings.pickQuote || '').replace(/\$TEXT\$|\$1/g, () => info.t));
            quote.append(text);
            description.append(quote);
        }
        const count = result.count;
        matches.textContent = (strings[count > 1 ? 'pickMatchesAll' : 'pickMatches'] || '').replace(/\$COUNT\$|\$1/g, () => String(count));
        matches.classList.toggle('many', count > 1);
        wider.disabled = busy || level === chain.length - 1;
        narrower.disabled = busy || level === 0;
        hide.disabled = busy || !result.s;
        shade.hidden = false;
        if (!panel.contains(actions)) panel.replaceChildren(description, actions);
        draw();
    }
    function change(delta) {
        if (busy || !chain[level + delta]) return;
        level += delta;
        selected = chain[level];
        const active = root.activeElement;
        update();
        if (active?.disabled) (delta > 0 ? narrower : wider).focus({preventScroll: true});
    }
    function candidate(event) {
        return document.elementsFromPoint(event.clientX, event.clientY).find((el) =>
            el !== host && !/^(html|body)$/.test(el.localName) && el.getRootNode() === document);
    }
    function inPanel(event) {
        // На window закрытый Shadow DOM виден только как host; фон слоя тоже host.
        if (event.target !== host) return false;
        if (!('clientX' in event) || (event.type === 'click' && event.detail === 0)) {
            return panel.contains(root.activeElement);
        }
        const rect = panel.getBoundingClientRect();
        return event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom;
    }
    function block(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
    function move(event) {
        if (inPanel(event) || selected || event.pointerType === 'touch') return;
        pointerY = event.clientY;
        preview = candidate(event);
        schedule();
    }
    function down(event) {
        if (inPanel(event)) return;
        block(event);
        if (busy) return;
        const el = candidate(event);
        if (!el) return;
        chain = [];
        for (let parent = el; parent && !/^(html|body)$/.test(parent.localName); parent = parent.parentElement) chain.push(parent);
        level = 0;
        selected = el;
        update();
        hide.focus({preventScroll: true});
    }
    function click(event) {
        if (!inPanel(event)) block(event);
    }
    function key(event) {
        if (event.key === 'Escape') { block(event); stop(); }
        else if (event.key === 'Tab') {
            const buttons = [...panel.querySelectorAll('button')].filter((el) => !el.disabled);
            if (!buttons.length) return;
            const index = buttons.indexOf(root.activeElement);
            const next = event.shiftKey ? (index <= 0 ? buttons.length - 1 : index - 1) : (index + 1) % buttons.length;
            block(event);
            buttons[next].focus({preventScroll: true});
        } else if (!inPanel(event)) block(event);
        else if (event.key === 'Enter' || event.key === ' ') {
            // Сами активируем кнопку: клавиши не должны управлять страницей под панелью.
            block(event);
            if (!event.isTrusted) return;
            pressed.add(event.key);
            const active = root.activeElement;
            if (!event.repeat && active?.localName === 'button') active.click();
        } else event.stopPropagation();
    }
    function keyup(event) {
        pressed.delete(event.key);
        if (event.key === 'Enter' || event.key === ' ') block(event);
        else event.stopPropagation();
    }
    async function save() {
        if (busy || !selected?.isConnected) return;
        const next = core.build(selected);
        busy = !!next.s;
        update(next);
        if (!next.s) return;
        const pick = {s: next.s, ...core.describe(selected)};
        let response;
        try { response = await chrome.runtime.sendMessage({pick}); } catch { response = null; }
        if (ended) return;
        busy = false;
        if (response?.ok || response?.error === 'limit') {
            const rect = panel.getBoundingClientRect();
            const above = rect.top < innerHeight / 2;
            detach();
            restoreFocus();
            shade.hidden = true;
            frames.replaceChildren();
            panel.classList.add('toast');
            panel.setAttribute('role', 'status');
            panel.setAttribute('aria-live', 'polite');
            panel.replaceChildren(node('span', '', response.ok ? strings[response.permanent ? 'pickDone' : 'pickDoneTemp'] : strings.pickLimit));
            if (response.ok) panel.append(document.createTextNode(' · '), node('span', 'esc', strings[response.permanent ? 'pickDoneList' : 'pickDoneTempSave']));
            panel.style.top = above ? '12px' : 'auto';
            panel.style.bottom = above ? 'auto' : '12px';
            // В тосте нет действий: страница снова получает указатель и клавиатуру.
            host.style.setProperty('pointer-events', 'none', 'important');
            surface.style.pointerEvents = 'none';
            listen(window, 'pagehide', stop);
            timer = setTimeout(stop, 2500);
        } else {
            update();
            hide.focus({preventScroll: true});
        }
    }
    listen(window, 'pointermove', move);
    listen(window, 'pointerdown', down);
    listen(window, 'click', click);
    listen(window, 'keydown', key);
    listen(window, 'keyup', keyup);
    listen(window, 'scroll', schedule);
    listen(window, 'resize', schedule);
    listen(window, 'pagehide', stop);
    place(null);
})();
