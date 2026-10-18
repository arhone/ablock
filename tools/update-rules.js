#!/usr/bin/env node
/**
 * Обновление списков фильтров.
 * Скачивает готовые DNR-наборы uBlock Origin Lite (https://github.com/uBlockOrigin/uBOL-home, GPLv3),
 * оставляет только блокирующие правила, убирает повторы между списками и прописывает наборы в manifest.json.
 * Региональные наборы (RU AdList, EasyList Germany и др.) попадают в манифест выключенными:
 * расширение включает их по языкам браузера (src/background/sw.js), количество правил и языки — в src/rules/lists.json.
 * Если список не скачался, остаётся прежняя версия из src/rules/lists/.
 * Для окон про cookie дополнительно скачивает CSS-селекторы (скрытие баннеров на всех сайтах),
 * для всех наборов — косметические фильтры (src/rules/cosmetic/, скрытие мест под рекламу).
 * В конце показывает собственные правила, которые уже есть в списках.
 *
 * Запуск: node tools/update-rules.js
 * Только проверка собственных правил, без скачивания: node tools/update-rules.js --check
 */
const fs = require('fs');
const path = require('path');

const SOURCE = 'https://raw.githubusercontent.com/uBlockOrigin/uBOL-home/main/chromium/rulesets';
// Пути ниже — от папки расширения
const ROOT = path.join(__dirname, '..', 'src');
const OUTPUT = 'rules/lists';

// Наборы uBOL: id → описание
const LISTS = {
    'easylist': 'EasyList — реклама',
    'easyprivacy': 'EasyPrivacy — трекеры',
    'ublock-filters': 'uBlock filters — реклама и трекеры',
    'pgl': 'Peter Lowe — рекламные и трекинговые домены',
    'ublock-badware': 'uBlock filters — мошеннические и вредоносные сайты',
    'annoyances-cookies': 'EasyList/uBO Cookie Notices — окна про cookie'
};

// Окна про cookie включаются отдельной настройкой: этот список не заменяет остальные
const COOKIE_LIST = 'annoyances-cookies';

// Описание наборов uBOL: группа regions — региональные, lang — языки через пробел
const DETAILS = `${SOURCE}/ruleset-details.json`;
const REGION_GROUP = 'regions';

// Количество правил и языки наборов для background/sw.js
const INDEX = 'rules/lists.json';

// Надёжные CSS-селекторы баннеров: набор uBOL → файл в расширении
const COSMETIC = {
    'annoyances-cookies': 'content/cookies.css'
};
const COSMETIC_SOURCE = 'https://raw.githubusercontent.com/uBlockOrigin/uBOL-home/main/firefox/rulesets/scripting/generichigh';

// Косметические фильтры наборов (места под рекламу на странице): скрипты uBOL → rules/cosmetic/<набор>.json.
// Применяет background/sw.js по классам и id, которые находит на странице content/cosmetic.js
const SCRIPTING_SOURCE = `${SOURCE}/scripting`;
const COSMETIC_OUTPUT = 'rules/cosmetic';

// Только блокировка: исключения (allow) из списков не берём, никакой рекламе поблажек нет.
// redirect и modifyHeaders требуют доступа ко всем сайтам.
const ACTIONS = ['block'];

// Условия, которые старые версии Chrome не понимают и могут проигнорировать, расширив правило
const UNSUPPORTED_CONDITIONS = ['responseHeaders', 'excludedResponseHeaders', 'topDomains', 'excludedTopDomains'];

// Лимит Chrome на regex-правила во всех включённых наборах
const MAX_REGEX_RULES = 1000;

// Гарантированный лимит Chrome на правила во всех включённых статических наборах
const MAX_STATIC_RULES = 30000;

/**
 * Скачивает набор правил (404 — набора нет)
 * @param {string} url
 * @returns {Promise<Object[]>}
 */
async function download(url) {
    const response = await fetch(url);
    if (response.status === 404) {
        return [];
    }
    if (!response.ok) {
        throw new Error(`${url}: HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Подходит ли правило
 * @param {Object} rule
 * @returns {boolean}
 */
function isSupported(rule) {
    return ACTIONS.includes(rule.action.type)
        && !UNSUPPORTED_CONDITIONS.some((key) => key in rule.condition);
}

/**
 * Путь к Chrome (можно задать через CHROME_PATH)
 * @returns {?string}
 */
function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    ];
    return candidates.find((p) => p && fs.existsSync(p)) || null;
}

/**
 * Проверяет regex-правила в Chrome (isRegexSupported).
 * Неподдерживаемое regex-правило в статическом наборе ломает загрузку всего расширения.
 * @param {Object[]} conditions
 * @returns {Promise<boolean[]>} поддерживается ли каждое
 */
async function checkRegexes(conditions) {
    const chrome = findChrome();
    if (!chrome) {
        console.warn('Chrome не найден (путь можно задать в CHROME_PATH), regex-правила будут отброшены');
        return conditions.map(() => false);
    }

    const {spawn} = require('child_process');
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ablock-'));
    const extension = path.join(tmp, 'extension');
    fs.mkdirSync(extension);
    fs.writeFileSync(path.join(extension, 'sw.js'), '');
    fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({
        manifest_version: 3,
        name: 'regex-check',
        version: '1',
        background: {service_worker: 'sw.js'},
        permissions: ['declarativeNetRequest']
    }));

    const browser = spawn(chrome, [
        '--headless=new', '--no-sandbox', '--no-first-run', `--user-data-dir=${path.join(tmp, 'profile')}`,
        '--remote-debugging-pipe', '--enable-unsafe-extension-debugging', 'about:blank'
    ], {stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']});

    // Протокол CDP через pipe: JSON-сообщения, разделённые \0
    let lastId = 0;
    let buffer = '';
    const pending = new Map();
    browser.stdio[4].on('data', (chunk) => {
        buffer += chunk;
        let end;
        while ((end = buffer.indexOf('\0')) >= 0) {
            const message = JSON.parse(buffer.slice(0, end));
            buffer = buffer.slice(end + 1);
            pending.get(message.id)?.(message);
            pending.delete(message.id);
        }
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
        const id = ++lastId;
        pending.set(id, (m) => m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result));
        browser.stdio[3].write(JSON.stringify({id, method, params, sessionId}) + '\0');
    });

    try {
        const {id: extensionId} = await send('Extensions.loadUnpacked', {path: extension});
        let worker;
        for (let i = 0; i < 50 && !worker; i++) {
            await new Promise((r) => setTimeout(r, 100));
            const {targetInfos} = await send('Target.getTargets');
            worker = targetInfos.find((t) => t.type === 'service_worker' && t.url.includes(extensionId));
        }
        if (!worker) {
            throw new Error('Service worker проверки не запустился');
        }
        const {sessionId} = await send('Target.attachToTarget', {targetId: worker.targetId, flatten: true});
        const items = conditions.map((c) => ({regex: c.regexFilter, isCaseSensitive: !!c.isUrlFilterCaseSensitive}));
        const {result, exceptionDetails} = await send('Runtime.evaluate', {
            expression: `Promise.all(${JSON.stringify(items)}.map((item) =>
                chrome.declarativeNetRequest.isRegexSupported(item).then((r) => r.isSupported)))`,
            awaitPromise: true,
            returnByValue: true
        }, sessionId);
        if (exceptionDetails) {
            throw new Error(exceptionDetails.exception?.description || 'Ошибка проверки regex');
        }
        return result.value;
    } finally {
        const exited = new Promise((resolve) => browser.once('exit', resolve));
        browser.kill();
        await exited;
        fs.rmSync(tmp, {recursive: true, force: true, maxRetries: 5});
    }
}

/**
 * Путь к файлу списка
 * @param {string} id
 * @returns {string}
 */
function listPath(id) {
    return path.join(ROOT, OUTPUT, `${id}.json`);
}

/**
 * Прежняя версия списка без номеров правил
 * @param {string} id
 * @returns {?Object[]}
 */
function readList(id) {
    if (!fs.existsSync(listPath(id))) {
        return null;
    }
    return JSON.parse(fs.readFileSync(listPath(id), 'utf8')).map((rule) => {
        delete rule.id;
        return rule;
    });
}

/**
 * Правило блокирует домены целиком, без других условий
 * @param {Object} rule
 * @returns {boolean}
 */
function isDomainBlock(rule) {
    const keys = Object.keys(rule.condition);
    return rule.action.type === 'block' && keys.length === 1 && keys[0] === 'requestDomains';
}

/**
 * Список, который уже блокирует домен или домен уровнем выше
 * @param {string} domain
 * @param {Map<string, string>} domains домен → список
 * @returns {?string}
 */
function coveredBy(domain, domains) {
    for (let d = domain; d.includes('.'); d = d.slice(d.indexOf('.') + 1)) {
        if (domains.has(d)) {
            return domains.get(d);
        }
    }
    return null;
}

/**
 * Ключ правила для поиска повторов: действие и условие с упорядоченными полями.
 * Приоритет не учитывается: в списках только блокировка, и неважно, какое из одинаковых правил сработает.
 * @param {Object} rule
 * @returns {string}
 */
function ruleKey(rule) {
    const sort = (value) => value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, sort(value[k])]))
        : value;
    return JSON.stringify([sort(rule.action), sort(rule.condition)]);
}

/**
 * Убирает из списка повторы внутри него и то, что уже есть в просмотренных списках:
 * одинаковые правила и домены, которые уже заблокированы целиком (вместе с поддоменами).
 * @param {string} id
 * @param {{rules: Object[]}} list
 * @param {{keys: Set<string>, domains: Map<string, string>}} seen правила и домены просмотренных списков
 * @returns {{keys: Set<string>, domains: Map<string, string>}} они же вместе с этим списком
 */
function dedupeList(id, list, seen) {
    const keys = new Set(seen.keys);
    const domains = new Map(seen.domains);
    const rules = [];
    list.duplicates = 0;
    for (let rule of list.rules) {
        if (isDomainBlock(rule)) {
            const rest = rule.condition.requestDomains.filter((d) => !coveredBy(d, domains));
            list.duplicates += rule.condition.requestDomains.length - rest.length;
            if (!rest.length) {
                continue;
            }
            rule = {...rule, condition: {requestDomains: rest}};
        }
        const key = ruleKey(rule);
        if (keys.has(key)) {
            list.duplicates++;
            continue;
        }
        keys.add(key);
        rules.push(rule);
    }
    // Домены списка учитываем после него самого, чтобы он не вычеркнул сам себя
    for (const rule of rules.filter(isDomainBlock)) {
        rule.condition.requestDomains.forEach((d) => domains.set(d, id));
    }
    list.rules = rules;
    return {keys, domains};
}

/**
 * Убирает повторы. Основные списки всегда включены вместе — каждый сверяется со всеми выше по порядку LISTS.
 * Список про cookie и региональные включаются по отдельности, поэтому сверяются только с основными,
 * а не друг с другом: иначе правило, вычеркнутое как повтор, пропало бы, когда второй список выключен.
 * @param {Object<string, {rules: Object[]}>} lists
 * @param {string[]} separate списки, которые включаются отдельно
 */
function dedupe(lists, separate) {
    let seen = {keys: new Set(), domains: new Map()};
    for (const id of Object.keys(lists).filter((id) => !separate.includes(id))) {
        seen = dedupeList(id, lists[id], seen);
    }
    for (const id of separate) {
        dedupeList(id, lists[id], seen);
    }
}

/**
 * Региональные наборы uBOL: id → название, сайт и языки.
 * Не скачалось описание — берём из прежнего rules/lists.json.
 * @returns {Promise<Object<string, {name: string, url: string, lang: string[]}>>}
 */
async function loadRegions() {
    try {
        const details = await download(DETAILS);
        const regions = {};
        for (const item of details.filter((d) => d.group === REGION_GROUP)) {
            regions[item.id] = {name: item.name, url: item.homeURL, lang: (item.lang || '').split(' ').filter(Boolean)};
        }
        // У дополнительных наборов (rus-1 — счётчики к RU AdList) языки не указаны: берём у основного набора
        for (const [id, region] of Object.entries(regions)) {
            if (!region.lang.length) {
                region.lang = regions[id.replace(/-\d+$/, '-0')]?.lang || [];
            }
        }
        if (!Object.keys(regions).length) {
            throw new Error('региональных наборов нет');
        }
        return regions;
    } catch (e) {
        const index = path.join(ROOT, INDEX);
        if (!fs.existsSync(index)) {
            throw new Error(`${DETAILS}: ${e.message}, прежней версии ${INDEX} нет`);
        }
        console.warn(`Описание наборов не скачалось (${e.message}), региональные — по прежнему ${INDEX}`);
        const {regions} = JSON.parse(fs.readFileSync(index, 'utf8'));
        return Object.fromEntries(Object.entries(regions).map(([id, {name, url, lang}]) => [id, {name, url, lang}]));
    }
}

/**
 * Собственные правила, которые уже есть в основных списках.
 * Список про cookie и региональные не в счёт: они бывают выключены, и тогда собственное правило нужно
 * @param {Object<string, Object[]>} lists id → правила
 * @param {{path: string}[]} own наборы из манифеста
 * @returns {string[]} описания найденного
 */
function findRedundant(lists, own) {
    const keys = new Map();
    const domains = new Map();
    for (const [id, rules] of Object.entries(lists)) {
        if (id === COOKIE_LIST || !(id in LISTS)) {
            continue;
        }
        for (const rule of rules) {
            keys.set(ruleKey(rule), id);
            if (isDomainBlock(rule)) {
                rule.condition.requestDomains.forEach((d) => domains.set(d, id));
            }
        }
    }

    const found = [];
    for (const resource of own) {
        for (const rule of JSON.parse(fs.readFileSync(path.join(ROOT, resource.path), 'utf8'))) {
            const where = `${resource.path} #${rule.id}`;
            if (rule.action.type !== 'block') {
                continue;
            }
            if (isDomainBlock(rule)) {
                for (const domain of rule.condition.requestDomains) {
                    const list = coveredBy(domain, domains);
                    if (list) {
                        found.push(`${where}: ${domain} — уже в ${list}`);
                    }
                }
                continue;
            }
            const same = keys.get(ruleKey(rule));
            // ||домен/путь: домен может быть заблокирован целиком
            const host = rule.condition.urlFilter?.match(/^\|\|([a-z0-9.-]+)/i)?.[1];
            const list = same || (host && coveredBy(host.toLowerCase(), domains));
            if (list) {
                found.push(`${where}: ${rule.condition.urlFilter || rule.condition.regexFilter} — уже в ${list}`);
            }
        }
    }
    return found;
}

/**
 * Выводит собственные правила, которые можно удалить
 * @param {Object<string, Object[]>} lists
 * @param {{path: string}[]} own
 */
function reportRedundant(lists, own) {
    const found = findRedundant(lists, own);
    if (found.length) {
        console.log(`\nСобственные правила, которые уже есть в списках (можно удалить): ${found.length}`);
        found.forEach((line) => console.log('  ' + line));
    } else {
        console.log('\nСобственные правила не повторяют списки');
    }
}

/**
 * Значение константы из скрипта uBOL: `const name = /* N *\/<JSON>;` или `new Map(/* N *\/<JSON>)`.
 * Скрипт не выполняем — только разбираем данные
 * @param {string} source
 * @param {string} name
 * @returns {*}
 */
function scriptConstant(source, name) {
    const match = source.match(new RegExp(`const ${name} = (?:new Map\\()?(?:/\\* \\d+ \\*/)?(.*?)\\)?;\\n`));
    if (!match) {
        throw new Error(`нет ${name}`);
    }
    // Пустая Map записана как new Map(undefined)
    return match[1] === 'undefined' ? [] : JSON.parse(match[1]);
}

/**
 * Класс или id, с которого начинается селектор: по нему селектор ищется на странице.
 * Экранированные символы не разбираем — такой селектор применяется всегда
 * @param {string} selector
 * @returns {?string} '#id' или '.class'
 */
function leadingToken(selector) {
    const match = selector.match(/^[#.][\w\u00a0-\uffff-]+(?=[^\w\u00a0-\uffff\\-]|$)/);
    return match ? match[0] : null;
}

/**
 * Косметические фильтры набора uBOL в формате расширения:
 * high — селекторы для всех сайтов; generic — селекторы, которые применяются, если на странице есть класс или id;
 * exceptions — сайт → селекторы, которые на нём не применяются; hosts — сайт → номера в specific
 * (отрицательный ~i — исключение); specific — селектор или [селектор, стиль]; regexes — [подстрока, regex, номера]
 * @param {string} id
 * @returns {Promise<?Object>} null — у набора нет косметических фильтров
 */
async function downloadCosmetic(id) {
    const [genericResponse, specificResponse] = await Promise.all([
        fetch(`${SCRIPTING_SOURCE}/generic/${id}.js`),
        fetch(`${SCRIPTING_SOURCE}/specific/${id}.json`)
    ]);
    for (const response of [genericResponse, specificResponse]) {
        if (!response.ok && response.status !== 404) {
            throw new Error(`${response.url}: HTTP ${response.status}`);
        }
    }
    if (!genericResponse.ok && !specificResponse.ok) {
        return null;
    }
    const result = {high: [], generic: {}, exceptions: {}, specific: [], hosts: {}, regexes: []};
    if (genericResponse.ok) {
        const source = await genericResponse.text();
        const lowly = scriptConstant(source, 'lowlyGeneric');
        const high = scriptConstant(source, 'highlyGeneric');
        const exceptions = scriptConstant(source, 'exceptions');
        const hostnames = scriptConstant(source, 'hostnames');
        result.high = high ? high.split(',\n') : [];
        for (const [, selectors] of lowly) {
            for (const selector of selectors.split(',\n')) {
                const token = leadingToken(selector);
                if (token) {
                    (result.generic[token] ??= []).push(selector);
                } else {
                    result.high.push(selector);
                }
            }
        }
        hostnames.forEach((host, i) => {
            result.exceptions[host] = exceptions[i].split('\n');
        });
    }
    if (specificResponse.ok) {
        const {selectors, selectorLists, selectorListRefs, hostnames, regexes} = await specificResponse.json();
        // Процедурные фильтры (:has-text и т.п.) требуют движка uBOL — берём только те, что выражаются CSS
        const kept = new Map();
        selectors.forEach((selector, i) => {
            if (!selector.startsWith('{')) {
                kept.set(i, result.specific.push(selector) - 1);
                return;
            }
            const procedural = JSON.parse(selector);
            if (procedural.cssable && procedural.action?.[0] === 'style' && typeof procedural.selector === 'string') {
                kept.set(i, result.specific.push([procedural.selector, procedural.action[1]]) - 1);
            }
        });
        const list = (ref) => selectorLists[ref].split(',').map(Number)
            .filter((n) => kept.has(n >= 0 ? n : ~n))
            .map((n) => (n >= 0 ? kept.get(n) : ~kept.get(~n)));
        hostnames.forEach((host, i) => {
            const items = list(selectorListRefs[i]);
            if (items.length) {
                result.hosts[host] = items;
            }
        });
        for (let i = 0; i < regexes.length; i += 3) {
            const items = list(regexes[i + 2]);
            if (items.length) {
                result.regexes.push([regexes[i], regexes[i + 1], items]);
            }
        }
    }
    return result;
}

/**
 * Скачивает косметические фильтры наборов. Не скачались — остаётся прежняя версия
 * @param {string[]} ids
 * @returns {Promise<string[]>} наборы, для которых есть файл
 */
async function updateCosmetic(ids) {
    const dir = path.join(ROOT, COSMETIC_OUTPUT);
    fs.mkdirSync(dir, {recursive: true});
    const available = [];
    for (const id of ids) {
        const file = path.join(dir, `${id}.json`);
        try {
            const data = await downloadCosmetic(id);
            if (!data) {
                fs.rmSync(file, {force: true});
                continue;
            }
            fs.writeFileSync(file, JSON.stringify(data) + '\n');
            const generic = Object.values(data.generic).flat().length;
            console.log(`${(COSMETIC_OUTPUT + '/' + id).padEnd(32)} общих ${data.high.length + generic}, ` +
                `для сайтов ${data.specific.length} (сайтов ${Object.keys(data.hosts).length})`);
        } catch (e) {
            if (!fs.existsSync(file)) {
                console.warn(`${COSMETIC_OUTPUT}/${id}: не скачался (${e.message}), пропущен`);
                continue;
            }
            console.warn(`${COSMETIC_OUTPUT}/${id}: не скачался (${e.message}), остаётся прежняя версия`);
        }
        available.push(id);
    }
    for (const file of fs.readdirSync(dir)) {
        if (!available.includes(file.slice(0, -5))) {
            fs.rmSync(path.join(dir, file));
        }
    }
    return available;
}

/**
 * Собственные наборы из манифеста
 * @param {Object} manifest
 * @returns {Object[]}
 */
function ownRulesets(manifest) {
    return manifest.declarative_net_request.rule_resources.filter((r) => !r.path.startsWith(OUTPUT + '/'));
}

/**
 * Сколько правил и regex-правил в наборах
 * @param {Object[][]} sets
 * @returns {{rules: number, regex: number}}
 */
function count(sets) {
    const rules = sets.flat();
    return {rules: rules.length, regex: rules.filter((r) => r.condition.regexFilter).length};
}

async function main() {
    const manifestPath = path.join(ROOT, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const own = ownRulesets(manifest);

    if (process.argv.includes('--check')) {
        const lists = {};
        for (const id of Object.keys(LISTS)) {
            lists[id] = readList(id) || [];
        }
        reportRedundant(lists, own);
        return;
    }

    fs.mkdirSync(path.join(ROOT, OUTPUT), {recursive: true});
    const regions = await loadRegions();
    const titles = {...LISTS, ...Object.fromEntries(Object.entries(regions).map(([id, r]) => [id, r.name]))};

    // Скачиваем наборы и отбираем подходящие правила. Не скачался — берём прежнюю версию.
    // Региональный набор без прежней версии пропускаем: без него расширение работает
    const lists = {};
    const stale = [];
    for (const id of Object.keys(titles)) {
        try {
            const [plain, regex] = await Promise.all([
                download(`${SOURCE}/main/${id}.json`),
                download(`${SOURCE}/regex/${id}.json`)
            ]);
            if (!plain.length) {
                throw new Error('набор пуст или не найден');
            }
            const all = [...plain, ...regex];
            lists[id] = {downloaded: all.length, rules: all.filter(isSupported)};
        } catch (e) {
            const previous = readList(id);
            if (!previous && id in LISTS) {
                throw new Error(`${id}: ${e.message}, прежней версии нет`);
            }
            if (!previous) {
                console.warn(`${id}: не скачался (${e.message}), пропущен`);
                delete regions[id];
                continue;
            }
            console.warn(`${id}: не скачался (${e.message}), остаётся прежняя версия`);
            stale.push(id);
            lists[id] = {downloaded: previous.length, rules: previous};
        }
    }
    if (stale.length === Object.keys(lists).length) {
        throw new Error('Ни один список не скачался, ничего не изменено');
    }

    // CSS-селекторы: заголовок с лицензией GPLv3 сохраняем как есть
    for (const [id, file] of Object.entries(COSMETIC)) {
        try {
            const response = await fetch(`${COSMETIC_SOURCE}/${id}.css`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const css = await response.text();
            if (!css.includes('display: none')) {
                throw new Error('неожиданное содержимое');
            }
            fs.writeFileSync(path.join(ROOT, file), css);
            console.log(`${file.padEnd(16)} ${String(css.split(',\n').length).padStart(6)} селекторов`);
        } catch (e) {
            if (!fs.existsSync(path.join(ROOT, file))) {
                throw new Error(`${id}.css: ${e.message}, прежней версии нет`);
            }
            console.warn(`${file}: не скачался (${e.message}), остаётся прежняя версия`);
        }
    }

    // Проверяем все regex-правила одним запуском Chrome
    const regexRules = Object.values(lists).flatMap((list) => list.rules.filter((r) => r.condition.regexFilter));
    const supported = await checkRegexes(regexRules.map((r) => r.condition));
    const rejected = new Set(regexRules.filter((r, i) => !supported[i]));

    for (const list of Object.values(lists)) {
        list.rules = list.rules.filter((r) => !rejected.has(r));
    }
    dedupe(lists, [COOKIE_LIST, ...Object.keys(regions)]);

    const output = {};
    for (const id of Object.keys(lists)) {
        output[id] = lists[id].rules.map((rule, i) => ({...rule, id: i + 1}));
    }

    // Лимиты проверяем до записи, чтобы не оставить расширение с неподходящими файлами.
    // Всегда включены собственные наборы, основные списки и список про cookie
    const ownRules = own.map((resource) => JSON.parse(fs.readFileSync(path.join(ROOT, resource.path), 'utf8')));
    const base = count([...ownRules, ...Object.keys(LISTS).map((id) => output[id])]);
    if (base.regex > MAX_REGEX_RULES) {
        throw new Error(`regex-правил ${base.regex}, лимит Chrome ${MAX_REGEX_RULES}`);
    }
    if (base.rules > MAX_STATIC_RULES) {
        throw new Error(`правил ${base.rules}, лимит Chrome ${MAX_STATIC_RULES}`);
    }
    // Региональный набор, который не помещается даже один, расширение никогда не включит
    const index = {base, regions: {}};
    for (const [id, {name, url, lang}] of Object.entries(regions)) {
        const size = count([output[id]]);
        if (base.rules + size.rules > MAX_STATIC_RULES || base.regex + size.regex > MAX_REGEX_RULES) {
            console.warn(`${id}: ${size.rules} правил, regex ${size.regex} — не помещается вместе с основными`);
        }
        index.regions[id] = {name, url, lang, ...size};
    }

    for (const [id, title] of Object.entries(titles).filter(([id]) => output[id])) {
        fs.writeFileSync(listPath(id), JSON.stringify(output[id]) + '\n');
        const note = stale.includes(id) ? '  [прежняя версия]' : '';
        console.log(`${id.padEnd(18)} ${String(output[id].length).padStart(6)} правил (повторов убрано ${lists[id].duplicates})  ${title}${note}`);
    }
    index.cosmetic = await updateCosmetic(Object.keys(titles).filter((id) => output[id]));
    fs.writeFileSync(path.join(ROOT, INDEX), JSON.stringify(index, null, 4) + '\n');

    // Наборы, которых больше нет у uBOL
    for (const file of fs.readdirSync(path.join(ROOT, OUTPUT))) {
        if (file.endsWith('.json') && !output[file.slice(0, -5)]) {
            fs.rmSync(path.join(ROOT, OUTPUT, file));
            console.log(`${file}: набора больше нет, удалён`);
        }
    }

    // Прописываем наборы в манифест после собственных, региональные — выключенными
    manifest.declarative_net_request.rule_resources = [
        ...own,
        ...Object.keys(LISTS).map((id) => ({id, enabled: true, path: `${OUTPUT}/${id}.json`})),
        ...Object.keys(regions).map((id) => ({id, enabled: false, path: `${OUTPUT}/${id}.json`}))
    ];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');

    const regional = count(Object.keys(regions).map((id) => output[id]));
    console.log(`Всегда включены: ${base.rules} правил, из них regex: ${base.regex}; ` +
        `в региональных наборах: ${regional.rules}, regex: ${regional.regex} ` +
        `(неподдерживаемых regex отброшено: ${rejected.size})`);

    reportRedundant(Object.fromEntries(Object.entries(lists).map(([id, list]) => [id, list.rules])), own);
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
