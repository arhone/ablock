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
        'google-ads': /^AW-[1-9][0-9]{0,19}$/,
        metrika: /^[1-9][0-9]{0,19}$/,
        'top-mail-ru': /^[1-9][0-9]{0,19}$/,
        vk: /^VK-RTRG-[A-Za-z0-9_-]{1,64}$/,
        tiktok: /^[A-Z0-9]{8,32}$/,
        clarity: /^[a-z0-9]{1,32}$/,
        hotjar: /^[1-9][0-9]{0,19}$/
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
        const host = url.hostname;
        const path = url.pathname;
        if (host === 'www.googletagmanager.com') {
            if (path === '/gtm.js') {
                add('gtm', url.searchParams.get('id'), evidence);
            } else if (path === '/gtag/js') {
                google(url.searchParams.get('id'), evidence);
            }
        } else if (['www.google-analytics.com', 'region1.google-analytics.com'].includes(host) && path === '/g/collect') {
            add('ga4', url.searchParams.get('tid'), evidence);
        } else if (['www.googleadservices.com', 'googleads.g.doubleclick.net'].includes(host)) {
            const match = /^\/pagead\/(?:viewthrough)?conversion\/([1-9][0-9]{0,19})\/?$/.exec(path);
            if (match) {
                add('google-ads', 'AW-' + match[1], evidence);
            }
        } else if (['mc.yandex.ru', 'mc.yandex.com'].includes(host)) {
            add('metrika', /^\/watch\/([1-9][0-9]{0,19})$/.exec(path)?.[1], evidence);
        } else if (host === 'top-fwz1.mail.ru' && path === '/counter') {
            add('top-mail-ru', url.searchParams.get('id'), evidence);
        } else if (host === 'vk.com' && path === '/rtrg') {
            add('vk', url.searchParams.get('p'), evidence);
        } else if (host === 'analytics.tiktok.com' && path === '/i18n/pixel/events.js') {
            add('tiktok', url.searchParams.get('sdkid'), evidence);
        } else if (host === 'www.clarity.ms') {
            add('clarity', /^\/tag\/([a-z0-9]{1,32})$/.exec(path)?.[1], evidence);
        } else if (host === 'static.hotjar.com') {
            add('hotjar', /^\/c\/hotjar-([1-9][0-9]{0,19})\.js$/.exec(path)?.[1], evidence);
        }
    };
    // Литералы остаются отдельными токенами: содержимое строки никогда не становится кодом.
    // Slash вне комментария и шаблоны неоднозначны без JS-парсера: весь такой скрипт пропускаем.
    const tokens = (code, classic) => {
        const list = [];
        let i = 0;
        let lineStart = true;
        while (i < code.length) {
            if (!budget()) {
                return [];
            }
            const ch = code[i];
            if (/\s/.test(ch)) {
                lineStart ||= /[\n\r\u2028\u2029]/.test(ch);
                i++;
            } else if (!classic && (code.startsWith('<!--', i) || (lineStart && code.startsWith('-->', i)))) {
                // В module HTML-комментарии — синтаксическая ошибка.
                return [];
            } else if (code.startsWith('//', i) || (classic && (code.startsWith('<!--', i)
                || (lineStart && code.startsWith('-->', i))))) {
                const end = code.slice(i).search(/[\n\r\u2028\u2029]/);
                i = end < 0 ? code.length : i + end + 1;
                lineStart = true;
            } else if (code.startsWith('/*', i)) {
                const end = code.indexOf('*/', i + 2);
                if (end < 0) {
                    return [];
                }
                lineStart ||= /[\n\r\u2028\u2029]/.test(code.slice(i, end + 2));
                i = end + 2;
            } else if (ch === '/' || ch === '`' || ch === '\\') {
                return [];
            } else if (ch === '"' || ch === "'") {
                lineStart = false;
                let value = '';
                let plain = true;
                i++;
                while (i < code.length && code[i] !== ch) {
                    if (code[i] === '\\') {
                        plain = false;
                        i += 2;
                    } else {
                        value += code[i++];
                    }
                }
                if (i >= code.length) {
                    return [];
                }
                i++;
                list.push({type: 'string', value: plain ? value : null});
            } else if (/[a-zA-Z_$0-9]/.test(ch)) {
                lineStart = false;
                const begin = i++;
                while (i < code.length && /[a-zA-Z_$0-9]/.test(code[i])) {
                    i++;
                }
                list.push({type: 'word', value: code.slice(begin, i)});
            } else {
                lineStart = false;
                list.push({type: 'punct', value: ch});
                i++;
            }
        }
        return list;
    };
    const inline = (code, classic) => {
        const list = tokens(code, classic);
        const word = (i, value) => list[i]?.type !== 'string' && list[i]?.value === value;
        const literal = (i) => list[i]?.type === 'string' ? list[i].value
            : list[i]?.type === 'word' && /^[0-9]+$/.test(list[i].value) ? list[i].value : null;
        const string = (i, value) => list[i]?.type === 'string' && list[i].value === value;
        const match = (i, values) => values.every((value, j) => word(i + j, value));
        // Только собственные литеральные поля верхнего уровня; выражения не вычисляем.
        const object = (begin) => {
            const fields = Object.create(null);
            if (!word(begin, '{')) {
                return null;
            }
            let i = begin + 1;
            while (i < list.length && budget()) {
                if (word(i, '}')) {
                    return {fields, end: i};
                }
                const key = list[i]?.value;
                if (!['word', 'string'].includes(list[i]?.type) || !word(i + 1, ':')
                    || Object.hasOwn(fields, key)) {
                    return null;
                }
                const beginValue = i + 2;
                i = beginValue;
                const stack = [];
                while (i < list.length && budget()) {
                    if (!stack.length && (word(i, ',') || word(i, '}'))) {
                        break;
                    }
                    if (list[i].type === 'punct') {
                        const value = list[i].value;
                        if (['(', '[', '{'].includes(value)) {
                            stack.push(value);
                        } else if ([')', ']', '}'].includes(value)
                            && stack.pop() !== {')': '(', ']': '[', '}': '{'}[value]) {
                            return null;
                        }
                    }
                    i++;
                }
                fields[key] = i === beginValue + 1 ? literal(beginValue)
                    ?? (word(beginValue, 'true') ? true : word(beginValue, 'false') ? false : null) : null;
                if (word(i, ',')) {
                    i++;
                } else if (!word(i, '}')) {
                    return null;
                }
            }
            return null;
        };
        // Парные скобки привязывают аргументы IIFE к её собственному телу, а не всему script.
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
                    return;
                }
                pairs.set(begin, i);
            }
        }
        if (stack.length) {
            return;
        }
        const iife = (begin) => {
            if (!match(begin - 1, ['(', 'function', '('])) {
                return;
            }
            const paramsEnd = pairs.get(begin + 1);
            if (paramsEnd === undefined || !word(paramsEnd + 1, '{')) {
                return;
            }
            const params = [];
            for (let j = begin + 2; j < paramsEnd; j += 2) {
                if (list[j]?.type !== 'word' || !/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(list[j].value)
                    || (j + 1 < paramsEnd && !word(j + 1, ','))) {
                    return;
                }
                params.push(list[j].value);
            }
            if (new Set(params).size !== params.length) {
                return;
            }
            const body = paramsEnd + 1;
            const end = pairs.get(body);
            if (!match(end + 1, [')', '('])) {
                return;
            }
            const argsEnd = pairs.get(end + 2);
            if (argsEnd === undefined) {
                return;
            }
            const args = [];
            for (let j = end + 3; j < argsEnd; j += 2) {
                if (!['word', 'string'].includes(list[j]?.type)
                    || (j + 1 < argsEnd && !word(j + 1, ','))) {
                    return;
                }
                args.push(j);
            }
            // Свидетельства только на верхнем уровне тела. Чужая вложенная функция
            // (даже невызванная) не подтверждает назначение внешней IIFE.
            const direct = [];
            for (let j = body + 1; j < end && budget(); j++) {
                direct.push(j);
                if (word(j, '{')) {
                    j = pairs.get(j);
                }
            }
            const argWord = (index, value) => word(args[index], value);
            const argString = (index, value) => string(args[index], value);
            if (params.join(',') === 'w,d,s,l,i' && argWord(0, 'window') && argWord(1, 'document')
                && argString(2, 'script') && argString(3, 'dataLayer') && args.length === 5
                && direct.some(j => string(j, 'https://www.googletagmanager.com/gtm.js?id=')
                    && match(j + 1, ['+', 'i', '+', 'dl']))) {
                add('gtm', literal(args[4]), 'inline-call');
            }
            // Стандартный Clarity: t.src="https://www.clarity.ms/tag/"+i;
            if (params.join(',') === 'c,l,a,r,i,t,y' && args.length === 5
                && argWord(0, 'window') && argWord(1, 'document')
                && argString(2, 'clarity') && argString(3, 'script')
                && direct.some(j => match(j, ['t', '.', 'src', '='])
                    && string(j + 4, 'https://www.clarity.ms/tag/') && match(j + 5, ['+', 'i', ';']))) {
                add('clarity', literal(args[4]), 'inline-call');
            }
            // Стандартный Hotjar: h — window этой IIFE, а не произвольный объект.
            if (params.join(',') === 'h,o,t,j,a,r' && args.length === 4
                && argWord(0, 'window') && argWord(1, 'document')
                && argString(2, 'https://static.hotjar.com/c/hotjar-') && argString(3, '.js?sv=')
                && direct.some(j => match(j, ['r', '.', 'src', '=', 't', '+', 'h', '.', '_hjSettings', '.', 'hjid', '+', 'j']))) {
                for (const j of direct) {
                    if (match(j, ['h', '.', '_hjSettings', '='])) {
                        const config = object(j + 4);
                        if (config && word(config.end + 1, ';') && config.fields.hjsv === '6') {
                            add('hotjar', config.fields.hjid, 'inline-config');
                        }
                    }
                }
            }
        };
        for (let i = 0; i < list.length && budget(); i++) {
            if (word(i, 'function')) {
                iife(i);
            }
            // Не принимаем произвольные obj.gtag, объявления функций и new gtag(...).
            if (word(i - 1, '.') || word(i - 1, 'function') || word(i - 1, 'new')) {
                continue;
            }
            let at = i;
            if (match(at, ['window', '.'])) {
                at += 2;
            }
            if (match(at, ['gtag', '(']) && string(at + 2, 'config') && word(at + 3, ',')
                && [',', ')'].some(value => word(at + 5, value))) {
                google(literal(at + 4), 'inline-call');
            } else if (match(at, ['ym', '(']) && word(at + 3, ',') && string(at + 4, 'init') && word(at + 5, ',')) {
                const config = object(at + 6);
                if (config && word(config.end + 1, ')')) {
                    add('metrika', literal(at + 2), 'inline-call', config.fields.webvisor);
                }
            } else if (match(at, ['ttq', '.', 'load', '(']) && [',', ')'].some(value => word(at + 5, value))) {
                add('tiktok', literal(at + 4), 'inline-call');
            } else if (match(at, ['clarity', '(']) && string(at + 2, 'init') && word(at + 3, ',') && word(at + 5, ')')) {
                add('clarity', literal(at + 4), 'inline-call');
            } else if (match(at, ['VK', '.', 'Retargeting', '.', 'Init', '(']) && word(at + 7, ')')) {
                add('vk', literal(at + 6), 'inline-call');
            } else if (match(at, ['_tmr', '.', 'push', '('])) {
                const config = object(at + 4);
                if (config && word(config.end + 1, ')') && config.fields.type === 'pageView') {
                    add('top-mail-ru', config.fields.id, 'inline-config');
                }
            } else if (match(at, ['_hjSettings', '='])) {
                const config = object(at + 2);
                if (config && [';', ')', ','].some(value => word(config.end + 1, value))) {
                    add('hotjar', config.fields.hjid, 'inline-config');
                }
            }

        }
    };
    try {
        const url = new URL(location.href);
        if (['http:', 'https:'].includes(url.protocol)) {
            result.context.documentUrl = url.origin + url.pathname.slice(0, 512);
        }
        result.context.timeOrigin = Number.isFinite(performance.timeOrigin) ? performance.timeOrigin : null;
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
        const scripts = document.getElementsByTagName('script');
        if (scripts.length > 500) {
            reason('script-limit', true);
        }
        let bytes = 0;
        for (let i = 0; i < Math.min(scripts.length, 500) && budget(); i++) {
            try {
                const script = scripts[i];
                if (script.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
                    continue;
                }
                if (script.hasAttribute('src')) {
                    urlTag(script.src, 'script-url');
                    continue;
                }
                if (script.type && !['text/javascript', 'application/javascript', 'module'].includes(script.type.toLowerCase())) {
                    continue;
                }
                // UTF-16 × 2 — верхняя оценка объёма; не кодируем и не копируем весь большой скрипт.
                const code = script.textContent;
                if (code.length * 2 > 204800 - bytes) {
                    reason('inline-limit', true);
                    continue;
                }
                bytes += code.length * 2;
                inline(code, script.type.toLowerCase() !== 'module');
            } catch {
                reason('collection-failed');
            }
        }
    } catch {
        result.status = 'unavailable';
        reason('collection-failed');
        result.data = null;
    }
    result.context.capturedAt = Date.now();
    return result;
})();
