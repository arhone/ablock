#!/usr/bin/env node
/**
 * Обновление списков фильтров.
 * Скачивает готовые DNR-наборы uBlock Origin Lite (https://github.com/uBlockOrigin/uBOL-home, GPLv3),
 * оставляет только блокирующие правила и прописывает наборы в manifest.json.
 *
 * Запуск: node tools/update-rules.js
 */
const fs = require('fs');
const path = require('path');

const SOURCE = 'https://raw.githubusercontent.com/uBlockOrigin/uBOL-home/main/chromium/rulesets';
const ROOT = path.join(__dirname, '..');
const OUTPUT = 'rules/lists';

// Наборы uBOL: id → описание
const LISTS = {
    'easylist': 'EasyList — реклама',
    'easyprivacy': 'EasyPrivacy — трекеры',
    'ublock-filters': 'uBlock filters — реклама и трекеры',
    'pgl': 'Peter Lowe — рекламные и трекинговые домены',
    'ublock-badware': 'uBlock filters — мошеннические и вредоносные сайты',
    'rus-0': 'RU AdList — российская реклама',
    'rus-1': 'RU AdList: Counters — российские счётчики'
};

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

async function main() {
    fs.mkdirSync(path.join(ROOT, OUTPUT), {recursive: true});

    // Скачиваем наборы и отбираем подходящие правила
    const lists = {};
    for (const id of Object.keys(LISTS)) {
        const [plain, regex] = await Promise.all([
            download(`${SOURCE}/main/${id}.json`),
            download(`${SOURCE}/regex/${id}.json`)
        ]);
        if (!plain.length) {
            throw new Error(`Набор ${id} пуст или не найден`);
        }
        const all = [...plain, ...regex];
        lists[id] = {downloaded: all.length, rules: all.filter(isSupported)};
    }

    // Проверяем все regex-правила одним запуском Chrome
    const regexRules = Object.values(lists).flatMap((list) => list.rules.filter((r) => r.condition.regexFilter));
    const supported = await checkRegexes(regexRules.map((r) => r.condition));
    const rejected = new Set(regexRules.filter((r, i) => !supported[i]));

    const write = (id, rules) => fs.writeFileSync(path.join(ROOT, OUTPUT, `${id}.json`), JSON.stringify(rules) + '\n');

    let total = 0;
    let regexTotal = 0;
    for (const [id, title] of Object.entries(LISTS)) {
        const rules = lists[id].rules.filter((r) => !rejected.has(r)).map((rule, i) => ({...rule, id: i + 1}));
        write(id, rules);

        total += rules.length;
        regexTotal += rules.filter((r) => r.condition.regexFilter).length;
        const dropped = lists[id].downloaded - rules.length;
        console.log(`${id.padEnd(16)} ${String(rules.length).padStart(6)} правил (отброшено ${dropped})  ${title}`);
    }

    // Собственные наборы тоже входят в лимиты
    const manifestPath = path.join(ROOT, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const own = manifest.declarative_net_request.rule_resources.filter((r) => !r.path.startsWith(OUTPUT + '/'));
    for (const resource of own) {
        const rules = JSON.parse(fs.readFileSync(path.join(ROOT, resource.path), 'utf8'));
        total += rules.length;
        regexTotal += rules.filter((r) => r.condition.regexFilter).length;
    }

    if (regexTotal > MAX_REGEX_RULES) {
        throw new Error(`regex-правил ${regexTotal}, лимит Chrome ${MAX_REGEX_RULES}`);
    }
    if (total > MAX_STATIC_RULES) {
        throw new Error(`правил ${total}, лимит Chrome ${MAX_STATIC_RULES}`);
    }

    // Прописываем наборы в манифест после собственных
    manifest.declarative_net_request.rule_resources = [
        ...own,
        ...Object.keys(LISTS).map((id) => ({id, enabled: true, path: `${OUTPUT}/${id}.json`}))
    ];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');

    console.log(`Итого с собственными: ${total} правил, из них regex: ${regexTotal} (неподдерживаемых отброшено: ${rejected.size})`);
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
