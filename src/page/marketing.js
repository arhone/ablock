/**
 * Ограниченный снимок меток главного документа, world: ISOLATED. Последнее выражение — JSON.
 * Не выполняет код сайта и не читает его глобальные переменные, cookies или dataLayer.
 * v1: {version, context:{documentUrl,timeOrigin,capturedAt,scope}, status,reasons,truncated,
 * data:{tags:[{service,id,evidence:[],settings:{webvisor:true|null}}]}}.
 * evidence: resource-url | script-url | inline-call | inline-config.
 * webvisor=true — найдена литеральная настройка, null — неизвестно (в том числе false).
 * reasons: recognition-limited (всегда: это не полный JS-анализ и не история загрузки),
 * result-limit, inline-limit, script-limit, resource-limit, budget-exceeded,
 * resource-unavailable, collection-failed. Усечение — только лимиты/бюджет.
 */
(() => {
    const started = performance.now();
    const result = {version: 1, context: {documentUrl: null, timeOrigin: null, capturedAt: null,
        scope: 'top-document'}, status: 'partial', reasons: ['recognition-limited'], truncated: false,
    data: {tags: []}};
    const reason = (code, truncated = false) => {
        if (!result.reasons.includes(code)) {
            result.reasons.push(code);
        }
        result.truncated ||= truncated;
    };
    const budget = () => {
        if (performance.now() - started >= 20) {
            reason('budget-exceeded', true);
            return false;
        }
        return true;
    };
    const patterns = {
        gtm: /^GTM-[A-Z0-9]{1,32}$/,
        ga4: /^G-[A-Z0-9]{1,32}$/,
        'google-ads': /^AW-[1-9]\d{0,19}$/,
        metrika: /^[1-9]\d{0,19}$/,
        'top-mail-ru': /^[1-9]\d{0,19}$/,
        vk: /^VK-RTRG-[\w-]{1,64}$/,
        tiktok: /^[A-Z0-9]{8,32}$/,
        clarity: /^[a-z0-9]{1,32}$/,
        hotjar: /^[1-9]\d{0,19}$/
    };
    const found = new Map();
    const add = (service, id, evidence, webvisor = null) => {
        if (typeof id !== 'string' || !patterns[service].test(id)) {
            return;
        }
        const key = service + ':' + id;
        let item = found.get(key);
        if (!item) {
            if (found.size >= 100) {
                reason('result-limit', true);
                return;
            }
            item = {service, id, evidence: [], settings: {webvisor: null}};
            found.set(key, item);
            result.data.tags.push(item);
        }
        if (!item.evidence.includes(evidence)) {
            item.evidence.push(evidence);
        }
        if (service === 'metrika' && webvisor === true) {
            item.settings.webvisor = true;
        }
    };
    const google = (id, evidence) => {
        add('ga4', id, evidence);
        add('google-ads', id, evidence);
    };
    // Обработчик адреса по хосту: путь и параметры адреса известны только внутри обработчика
    const urlHandlers = new Map();
    const onHosts = (hosts, handler) => {
        for (const host of hosts) {
            urlHandlers.set(host, handler);
        }
    };
    onHosts(['www.googletagmanager.com'], (url, path, evidence) => {
        if (path === '/gtm.js') {
            add('gtm', url.searchParams.get('id'), evidence);
        } else if (path === '/gtag/js') {
            google(url.searchParams.get('id'), evidence);
        }
    });
    onHosts(['www.google-analytics.com', 'region1.google-analytics.com'], (url, path, evidence) => {
        if (path === '/g/collect') {
            add('ga4', url.searchParams.get('tid'), evidence);
        }
    });
    onHosts(['www.googleadservices.com', 'googleads.g.doubleclick.net'], (url, path, evidence) => {
        const match = /^\/pagead\/(?:viewthrough)?conversion\/([1-9]\d{0,19})\/?$/.exec(path);
        if (match) {
            add('google-ads', 'AW-' + match[1], evidence);
        }
    });
    onHosts(['mc.yandex.ru', 'mc.yandex.com'], (url, path, evidence) => {
        add('metrika', /^\/watch\/([1-9]\d{0,19})$/.exec(path)?.[1], evidence);
    });
    onHosts(['top-fwz1.mail.ru'], (url, path, evidence) => {
        if (path === '/counter') {
            add('top-mail-ru', url.searchParams.get('id'), evidence);
        }
    });
    onHosts(['vk.com'], (url, path, evidence) => {
        if (path === '/rtrg') {
            add('vk', url.searchParams.get('p'), evidence);
        }
    });
    onHosts(['analytics.tiktok.com'], (url, path, evidence) => {
        if (path === '/i18n/pixel/events.js') {
            add('tiktok', url.searchParams.get('sdkid'), evidence);
        }
    });
    onHosts(['www.clarity.ms'], (url, path, evidence) => {
        add('clarity', /^\/tag\/([a-z0-9]{1,32})$/.exec(path)?.[1], evidence);
    });
    onHosts(['static.hotjar.com'], (url, path, evidence) => {
        add('hotjar', /^\/c\/hotjar-([1-9]\d{0,19})\.js$/.exec(path)?.[1], evidence);
    });
    const urlTag = (value, evidence) => {
        if (typeof value !== 'string' || value.length > 8192) {
            return;
        }
        let url;
        try {
            url = new URL(value, document.baseURI);
        } catch {
            return;
        }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
            return;
        }
        urlHandlers.get(url.hostname)?.(url, url.pathname, evidence);
    };
    const LINE_BREAK = /[\n\r\u2028\u2029]/;
    // Пробелы и комментарии: true — пропущено, null — это не они, false — код не разобрать без JS-парсера
    const skipTrivia = (code, classic, state) => {
        const i = state.i;
        if (/\s/.test(code[i])) {
            state.lineStart ||= LINE_BREAK.test(code[i]);
            state.i++;
            return true;
        }
        const htmlOpen = code.startsWith('<!--', i);
        const htmlClose = state.lineStart && code.startsWith('-->', i);
        // В module HTML-комментарии — синтаксическая ошибка.
        if (!classic && (htmlOpen || htmlClose)) {
            return false;
        }
        if (code.startsWith('//', i) || (classic && (htmlOpen || htmlClose))) {
            const end = code.slice(i).search(LINE_BREAK);
            state.i = end < 0 ? code.length : i + end + 1;
            state.lineStart = true;
            return true;
        }
        if (code.startsWith('/*', i)) {
            const end = code.indexOf('*/', i + 2);
            if (end < 0) {
                return false;
            }
            state.lineStart ||= LINE_BREAK.test(code.slice(i, end + 2));
            state.i = end + 2;
            return true;
        }
        return null;
    };
    // Строка: значение без экранирования, либо null; false — строка не закрыта
    const scanString = (code, state, list) => {
        const quote = code[state.i];
        state.lineStart = false;
        let value = '';
        let plain = true;
        state.i++;
        while (state.i < code.length && code[state.i] !== quote) {
            if (code[state.i] === '\\') {
                plain = false;
                state.i += 2;
            } else {
                value += code[state.i++];
            }
        }
        if (state.i >= code.length) {
            return false;
        }
        state.i++;
        list.push({type: 'string', value: plain ? value : null});
        return true;
    };
    const scanWord = (code, state, list) => {
        state.lineStart = false;
        const begin = state.i++;
        while (state.i < code.length && /[\w$]/.test(code[state.i])) {
            state.i++;
        }
        list.push({type: 'word', value: code.slice(begin, state.i)});
    };
    // Литералы остаются отдельными токенами: содержимое строки никогда не становится кодом.
    // Slash вне комментария и шаблоны неоднозначны без JS-парсера: весь такой скрипт пропускаем.
    // Один фрагмент кода; false — код не разобрать без JS-парсера
    const scanToken = (code, classic, state, list) => {
        const trivia = skipTrivia(code, classic, state);
        if (trivia !== null) {
            return trivia;
        }
        const ch = code[state.i];
        if (ch === '/' || ch === '`' || ch === '\\') {
            return false;
        }
        if (ch === '"' || ch === "'") {
            return scanString(code, state, list);
        }
        if (/[\w$]/.test(ch)) {
            scanWord(code, state, list);
            return true;
        }
        state.lineStart = false;
        list.push({type: 'punct', value: ch});
        state.i++;
        return true;
    };
    const tokens = (code, classic) => {
        const list = [];
        const state = {i: 0, lineStart: true};
        while (state.i < code.length) {
            if (!budget() || !scanToken(code, classic, state, list)) {
                return [];
            }
        }
        return list;
    };
    const wordAt = (list, i, value) => list[i]?.type !== 'string' && list[i]?.value === value;
    const stringAt = (list, i, value) => list[i]?.type === 'string' && list[i].value === value;
    const literalAt = (list, i) => {
        if (list[i]?.type === 'string') {
            return list[i].value;
        }
        return list[i]?.type === 'word' && /^\d+$/.test(list[i].value) ? list[i].value : null;
    };
    const matchAt = (list, i, values) => values.every((value, j) => wordAt(list, i + j, value));
    const boolAt = (list, i) => {
        if (wordAt(list, i, 'true')) {
            return true;
        }
        return wordAt(list, i, 'false') ? false : null;
    };
    // Конец значения поля: запятая или закрывающая скобка объекта на верхнем уровне; null — скобки не сходятся
    const valueEnd = (list, begin) => {
        const stack = [];
        let i = begin;
        while (i < list.length && budget()) {
            if (!stack.length && (wordAt(list, i, ',') || wordAt(list, i, '}'))) {
                break;
            }
            if (list[i].type === 'punct') {
                const value = list[i].value;
                if (['(', '[', '{'].includes(value)) {
                    stack.push(value);
                } else if ([')', ']', '}'].includes(value) && stack.pop() !== {')': '(', ']': '[', '}': '{'}[value]) {
                    return null;
                }
            }
            i++;
        }
        return i;
    };
    // Только собственные литеральные поля верхнего уровня; выражения не вычисляем.
    const objectAt = (list, begin) => {
        const fields = Object.create(null);
        if (!wordAt(list, begin, '{')) {
            return null;
        }
        let i = begin + 1;
        while (i < list.length && budget()) {
            if (wordAt(list, i, '}')) {
                return {fields, end: i};
            }
            const key = list[i]?.value;
            if (!['word', 'string'].includes(list[i]?.type) || !wordAt(list, i + 1, ':')
                || Object.hasOwn(fields, key)) {
                return null;
            }
            const beginValue = i + 2;
            i = valueEnd(list, beginValue);
            if (i === null) {
                return null;
            }
            fields[key] = i === beginValue + 1 ? literalAt(list, beginValue) ?? boolAt(list, beginValue) : null;
            if (wordAt(list, i, ',')) {
                i++;
            } else if (!wordAt(list, i, '}')) {
                return null;
            }
        }
        return null;
    };
    // Парные скобки привязывают аргументы IIFE к её собственному телу, а не всему script.
    const pairsOf = (list) => {
        const pairs = new Map();
        const stack = [];
        for (let i = 0; i < list.length && budget(); i++) {
            if (list[i].type !== 'punct') {
                continue;
            }
            const value = list[i].value;
            if (['(', '[', '{'].includes(value)) {
                stack.push(i);
            } else if ([')', ']', '}'].includes(value)) {
                const begin = stack.pop();
                if (list[begin]?.value !== {')': '(', ']': '[', '}': '{'}[value]) {
                    return null;
                }
                pairs.set(begin, i);
            }
        }
        return stack.length ? null : pairs;
    };
    const paramList = (list, from, to) => {
        const params = [];
        for (let j = from; j < to; j += 2) {
            if (list[j]?.type !== 'word' || !/^[a-zA-Z_$][\w$]*$/.test(list[j].value)
                || (j + 1 < to && !wordAt(list, j + 1, ','))) {
                return null;
            }
            params.push(list[j].value);
        }
        return new Set(params).size === params.length ? params : null;
    };
    const argList = (list, from, to) => {
        const args = [];
        for (let j = from; j < to; j += 2) {
            if (!['word', 'string'].includes(list[j]?.type) || (j + 1 < to && !wordAt(list, j + 1, ','))) {
                return null;
            }
            args.push(j);
        }
        return args;
    };
    // Свидетельства только на верхнем уровне тела. Чужая вложенная функция
    // (даже невызванная) не подтверждает назначение внешней IIFE.
    const topLevelTokens = (list, pairs, begin, end) => {
        const direct = [];
        let j = begin + 1;
        while (j < end && budget()) {
            direct.push(j);
            if (wordAt(list, j, '{')) {
                j = pairs.get(j);
            }
            j++;
        }
        return direct;
    };
    const argsOf = (list, args) => ({
        word: (index, value) => wordAt(list, args[index], value),
        string: (index, value) => stringAt(list, args[index], value),
        literal: (index) => literalAt(list, args[index])
    });
    // Стандартный GTM: сниппет вставляет gtm.js?id=…+i+dl
    const gtmCall = (list, signature, args, direct) => {
        const arg = argsOf(list, args);
        if (signature === 'w,d,s,l,i' && arg.word(0, 'window') && arg.word(1, 'document')
            && arg.string(2, 'script') && arg.string(3, 'dataLayer') && args.length === 5
            && direct.some((j) => stringAt(list, j, 'https://www.googletagmanager.com/gtm.js?id=')
                && matchAt(list, j + 1, ['+', 'i', '+', 'dl']))) {
            add('gtm', arg.literal(4), 'inline-call');
        }
    };
    // Стандартный Clarity: t.src="https://www.clarity.ms/tag/"+i;
    const clarityCall = (list, signature, args, direct) => {
        const arg = argsOf(list, args);
        if (signature === 'c,l,a,r,i,t,y' && args.length === 5
            && arg.word(0, 'window') && arg.word(1, 'document')
            && arg.string(2, 'clarity') && arg.string(3, 'script')
            && direct.some((j) => matchAt(list, j, ['t', '.', 'src', '='])
                && stringAt(list, j + 4, 'https://www.clarity.ms/tag/') && matchAt(list, j + 5, ['+', 'i', ';']))) {
            add('clarity', arg.literal(4), 'inline-call');
        }
    };
    // Стандартный Hotjar: h — window этой IIFE, а не произвольный объект.
    const hotjarCall = (list, signature, args, direct) => {
        const arg = argsOf(list, args);
        if (signature === 'h,o,t,j,a,r' && args.length === 4
            && arg.word(0, 'window') && arg.word(1, 'document')
            && arg.string(2, 'https://static.hotjar.com/c/hotjar-') && arg.string(3, '.js?sv=')
            && direct.some((j) => matchAt(list, j, ['r', '.', 'src', '=', 't', '+', 'h', '.', '_hjSettings', '.', 'hjid', '+', 'j']))) {
            for (const j of direct) {
                if (matchAt(list, j, ['h', '.', '_hjSettings', '='])) {
                    const config = objectAt(list, j + 4);
                    if (config && wordAt(list, config.end + 1, ';') && config.fields.hjsv === '6') {
                        add('hotjar', config.fields.hjid, 'inline-config');
                    }
                }
            }
        }
    };
    const iifeAt = (list, pairs, begin) => {
        if (!matchAt(list, begin - 1, ['(', 'function', '('])) {
            return;
        }
        const paramsEnd = pairs.get(begin + 1);
        if (paramsEnd === undefined || !wordAt(list, paramsEnd + 1, '{')) {
            return;
        }
        const params = paramList(list, begin + 2, paramsEnd);
        if (!params) {
            return;
        }
        const body = paramsEnd + 1;
        const end = pairs.get(body);
        if (!matchAt(list, end + 1, [')', '('])) {
            return;
        }
        const argsEnd = pairs.get(end + 2);
        if (argsEnd === undefined) {
            return;
        }
        const args = argList(list, end + 3, argsEnd);
        if (!args) {
            return;
        }
        const direct = topLevelTokens(list, pairs, body, end);
        const signature = params.join(',');
        gtmCall(list, signature, args, direct);
        clarityCall(list, signature, args, direct);
        hotjarCall(list, signature, args, direct);
    };
    // Вызовы и присваивания на верхнем уровне: gtag, Яндекс.Метрика, TikTok, Clarity, VK
    const tagCall = (list, at) => {
        if (matchAt(list, at, ['gtag', '(']) && stringAt(list, at + 2, 'config') && wordAt(list, at + 3, ',')
            && [',', ')'].some((value) => wordAt(list, at + 5, value))) {
            google(literalAt(list, at + 4), 'inline-call');
        } else if (matchAt(list, at, ['ym', '(']) && wordAt(list, at + 3, ',') && stringAt(list, at + 4, 'init')
            && wordAt(list, at + 5, ',')) {
            const config = objectAt(list, at + 6);
            if (config && wordAt(list, config.end + 1, ')')) {
                add('metrika', literalAt(list, at + 2), 'inline-call', config.fields.webvisor);
            }
        } else if (matchAt(list, at, ['ttq', '.', 'load', '(']) && [',', ')'].some((value) => wordAt(list, at + 5, value))) {
            add('tiktok', literalAt(list, at + 4), 'inline-call');
        }
    };
    const widgetCall = (list, at) => {
        if (matchAt(list, at, ['clarity', '(']) && stringAt(list, at + 2, 'init') && wordAt(list, at + 3, ',')
            && wordAt(list, at + 5, ')')) {
            add('clarity', literalAt(list, at + 4), 'inline-call');
        } else if (matchAt(list, at, ['VK', '.', 'Retargeting', '.', 'Init', '(']) && wordAt(list, at + 7, ')')) {
            add('vk', literalAt(list, at + 6), 'inline-call');
        }
    };
    // Настройки в вызовах: _tmr.push({...}) и _hjSettings = {...}
    const configCall = (list, at) => {
        if (matchAt(list, at, ['_tmr', '.', 'push', '('])) {
            const config = objectAt(list, at + 4);
            if (config && wordAt(list, config.end + 1, ')') && config.fields.type === 'pageView') {
                add('top-mail-ru', config.fields.id, 'inline-config');
            }
        } else if (matchAt(list, at, ['_hjSettings', '='])) {
            const config = objectAt(list, at + 2);
            if (config && [';', ')', ','].some((value) => wordAt(list, config.end + 1, value))) {
                add('hotjar', config.fields.hjid, 'inline-config');
            }
        }
    };
    // Не принимаем произвольные obj.gtag, объявления функций и new gtag(...).
    const inline = (code, classic) => {
        const list = tokens(code, classic);
        const pairs = pairsOf(list);
        if (!pairs) {
            return;
        }
        for (let i = 0; i < list.length && budget(); i++) {
            if (wordAt(list, i, 'function')) {
                iifeAt(list, pairs, i);
            }
            if (wordAt(list, i - 1, '.') || wordAt(list, i - 1, 'function') || wordAt(list, i - 1, 'new')) {
                continue;
            }
            const at = matchAt(list, i, ['window', '.']) ? i + 2 : i;
            tagCall(list, at);
            widgetCall(list, at);
            configCall(list, at);
        }
    };
    // Скрипт на странице: адрес — из src, встроенный код — токенами, не исполняем
    const scanScript = (script, usage) => {
        if (script.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
            return;
        }
        if (script.hasAttribute('src')) {
            urlTag(script.src, 'script-url');
            return;
        }
        if (script.type && !['text/javascript', 'application/javascript', 'module'].includes(script.type.toLowerCase())) {
            return;
        }
        // UTF-16 × 2 — верхняя оценка объёма; не кодируем и не копируем весь большой скрипт.
        const code = script.textContent;
        if (code.length * 2 > 204800 - usage.bytes) {
            reason('inline-limit', true);
            return;
        }
        usage.bytes += code.length * 2;
        inline(code, script.type.toLowerCase() !== 'module');
    };
    const collectScripts = () => {
        const scripts = document.getElementsByTagName('script');
        if (scripts.length > 500) {
            reason('script-limit', true);
        }
        const usage = {bytes: 0};
        for (let i = 0; i < Math.min(scripts.length, 500) && budget(); i++) {
            try {
                scanScript(scripts[i], usage);
            } catch {
                reason('collection-failed');
            }
        }
    };
    // Скрипты получают бюджет раньше длинного списка ресурсов страницы.
    const collectResources = () => {
        try {
            const resources = performance.getEntriesByType('resource');
            if (resources.length > 2000) {
                reason('resource-limit', true);
            }
            for (let i = 0; i < Math.min(resources.length, 2000) && budget(); i++) {
                urlTag(resources[i].name, 'resource-url');
            }
        } catch {
            reason('resource-unavailable');
        }
    };
    try {
        const url = new URL(location.href);
        if (['http:', 'https:'].includes(url.protocol)) {
            result.context.documentUrl = url.origin + url.pathname.slice(0, 512);
        }
        result.context.timeOrigin = Number.isFinite(performance.timeOrigin) ? performance.timeOrigin : null;
        collectScripts();
        collectResources();
    } catch {
        result.status = 'unavailable';
        reason('collection-failed');
        result.data = null;
    }
    result.context.capturedAt = Date.now();
    return result;
})();
