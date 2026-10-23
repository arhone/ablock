/**
 * @author AlekseyArh
 * @link https://github.com/arhone/ablock
 */

// Окна про cookie включаются отдельной настройкой
const COOKIE_RULESET = 'annoyances-cookies';

// Остальные наборы правил берём из манифеста, чтобы не дублировать список.
// Включённые в манифесте работают всегда, выключенные — региональные, по языкам браузера
const RESOURCES = chrome.runtime.getManifest().declarative_net_request.rule_resources;
const RULESETS = RESOURCES.filter((r) => r.enabled && r.id !== COOKIE_RULESET).map((r) => r.id);
const REGION_RULESETS = RESOURCES.filter((r) => !r.enabled).map((r) => r.id);

// Количество правил и языки наборов (собирает tools/update-rules.js)
const LISTS_INDEX = 'rules/lists.json';

// Гарантированные лимиты Chrome на правила во всех включённых статических наборах и на число таких наборов
// (до Chrome 120 включённых наборов могло быть только 10)
const MAX_STATIC_RULES = chrome.declarativeNetRequest.GUARANTEED_MINIMUM_STATIC_RULES ?? 30000;
const MAX_REGEX_RULES = chrome.declarativeNetRequest.MAX_NUMBER_OF_REGEX_RULES ?? 1000;
const MAX_ENABLED_RULESETS = chrome.declarativeNetRequest.MAX_NUMBER_OF_ENABLED_STATIC_RULESETS ?? 10;

// Расширенный режим: доступ ко всем сайтам по кнопке в окне расширения
const EXTENDED = {permissions: ['webRequest'], origins: ['<all_urls>']};

// Скрытие баннеров (CSS) и вырезание рекламы из плеера YouTube, лент VK и OK и сетки роликов Pornhub
const CONTENT_SCRIPTS = [
    {
        id: 'youtube',
        matches: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'],
        css: ['content/youtube.css'],
        js: ['content/youtube.js'],
        world: 'MAIN',
        allFrames: true,
        runAt: 'document_start'
    },
    {
        id: 'pornhub',
        matches: ['*://*.pornhub.com/*', '*://*.pornhub.org/*'],
        css: ['content/pornhub.css'],
        js: ['content/pornhub.js'],
        runAt: 'document_start'
    },
    {
        id: 'vk',
        matches: ['*://*.vk.com/*', '*://*.vk.ru/*'],
        css: ['content/vk.css'],
        js: ['content/vk.js'],
        world: 'MAIN',
        runAt: 'document_start'
    },
    {
        id: 'vkvideo',
        matches: ['*://*.vkvideo.ru/*'],
        css: ['content/vk.css'],
        runAt: 'document_start'
    },
    {
        id: 'ok',
        matches: ['*://*.ok.ru/*'],
        css: ['content/ok.css'],
        js: ['content/ok.js'],
        world: 'MAIN',
        runAt: 'document_start'
    }
];

// Скрипты расширенного режима: на всех сайтах
const COOKIE_SCRIPT = {
    id: 'cookies',
    matches: ['<all_urls>'],
    css: ['content/cookies.css', 'content/cookies-ablock.css'],
    allFrames: true,
    runAt: 'document_start'
};
const ADS_SCRIPT = {
    id: 'ads',
    matches: ['<all_urls>'],
    js: ['content/cosmetic.js'],
    allFrames: true,
    runAt: 'document_start'
};
const TIMING_SCRIPT = {
    id: 'timing',
    matches: ['<all_urls>'],
    js: ['content/timing.js'],
    runAt: 'document_start'
};

// Правило, которое пропускает всё на сайтах, где защита отключена. Приоритет выше, чем у любого правила списков
const ALLOW_RULE_ID = 1;
const ALLOW_PRIORITY = 1000;

/**
 * Настройки: защита и скрытие окон про cookie (по умолчанию включено), сайты без защиты
 * @returns {Promise<{status: boolean, cookies: boolean, allowed: string[]}>}
 */
async function getSettings() {
    const {aBlockStorage, aBlockSettings, aBlockAllowed} = await chrome.storage.local.get(
        ['aBlockStorage', 'aBlockSettings', 'aBlockAllowed']);
    return {
        status: aBlockStorage?.status ?? true,
        cookies: aBlockSettings?.cookies ?? true,
        allowed: aBlockAllowed || []
    };
}

/**
 * Перерегистрирует скрипты сайтов (при выключенной защите только снимает)
 * @param {{status: boolean, cookies: boolean, allowed: string[]}} settings
 * @param {boolean} extended
 */
async function applyContentScripts({status, cookies, allowed}, extended) {
    const registered = await chrome.scripting.getRegisteredContentScripts();
    if (registered.length) {
        await chrome.scripting.unregisterContentScripts({ids: registered.map((s) => s.id)});
    }
    // На сайтах без защиты свои скрипты тоже не запускаем: сайт и его поддомены
    const excludeMatches = allowed.flatMap((host) => [`*://${host}/*`, `*://*.${host}/*`]);
    const protect = (script) => (excludeMatches.length ? {...script, excludeMatches} : script);
    const scripts = [
        ...(status ? CONTENT_SCRIPTS.map(protect) : []),
        ...(extended ? [TIMING_SCRIPT] : []),
        ...(extended && status ? [protect(ADS_SCRIPT)] : []),
        ...(extended && status && cookies ? [protect(COOKIE_SCRIPT)] : [])
    ];
    if (scripts.length) {
        await chrome.scripting.registerContentScripts(scripts);
    }
}

/**
 * Сайты без защиты: всё, что загружает страница такого сайта, пропускается
 * @param {string[]} allowed
 */
async function applyAllowed(allowed) {
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ALLOW_RULE_ID],
        addRules: allowed.length ? [{
            id: ALLOW_RULE_ID,
            priority: ALLOW_PRIORITY,
            action: {type: 'allowAllRequests'},
            condition: {requestDomains: allowed, resourceTypes: ['main_frame']}
        }] : []
    });
}

// Счётчик на иконке — тональный, как плашки в окне: бледная подложка и цветной текст.
// Под светлую и тёмную панель браузера свои цвета
const BADGE_COLORS = {
    light: {background: '#d3f1e3', text: '#0a6b4b'},
    dark: {background: '#1f4a3b', text: '#4be3ad'}
};

// Тёмная ли тема браузера: воркер её не видит, сообщают окно и content/cosmetic.js
let dark;

/**
 * Цвета счётчика под тему браузера
 * @param {boolean} [value] новая тема, без неё — сохранённая
 */
async function applyBadgeColors(value) {
    dark ??= (await chrome.storage.local.get('aBlockDark')).aBlockDark ?? false;
    if (value !== undefined && value !== dark) {
        dark = value;
        await chrome.storage.local.set({aBlockDark: dark});
    } else if (value !== undefined) {
        return;
    }
    const colors = BADGE_COLORS[dark ? 'dark' : 'light'];
    await chrome.action.setBadgeBackgroundColor({color: colors.background});
    await chrome.action.setBadgeTextColor({color: colors.text});
}

/**
 * Счётчик заблокированного и иконка
 * @param {boolean} status
 */
async function applyAction(status) {
    await chrome.declarativeNetRequest.setExtensionActionOptions({displayActionCountAsBadgeText: status});
    await applyBadgeColors();
    await chrome.action.setIcon({
        path: {32: status ? '/images/ablock-32.png' : '/images/ablock-32-black.png'}
    });
}

/**
 * Региональные наборы для языков браузера: сначала язык интерфейса, затем языки сайтов из настроек
 * в порядке, заданном пользователем. Берём, пока помещаются в лимит вместе с остальными
 * (с учётом списка про cookie, даже если он выключен, — чтобы его включение не упёрлось в лимит).
 * @returns {Promise<string[]>}
 */
async function pickRegions() {
    const {base, regions} = await (await fetch(chrome.runtime.getURL(LISTS_INDEX))).json();
    const languages = [chrome.i18n.getUILanguage(), ...await chrome.i18n.getAcceptLanguages()]
        .map((language) => language.toLowerCase().split(/[-_]/)[0]);
    let {rules, regex} = base;
    const slots = MAX_ENABLED_RULESETS - RESOURCES.filter((r) => r.enabled).length;
    const picked = [];
    for (const language of new Set(languages)) {
        for (const [id, region] of Object.entries(regions)) {
            if (region.lang.includes(language) && !picked.includes(id) && REGION_RULESETS.includes(id)
                && picked.length < slots
                && rules + region.rules <= MAX_STATIC_RULES && regex + region.regex <= MAX_REGEX_RULES) {
                picked.push(id);
                rules += region.rules;
                regex += region.regex;
            }
        }
    }
    return picked;
}

/**
 * Включает наборы правил
 * @param {boolean} status
 * @param {boolean} cookies
 */
async function applyRulesets(status, cookies) {
    const cookieRulesets = status && cookies ? {enable: [COOKIE_RULESET], disable: []} : {enable: [], disable: [COOKIE_RULESET]};
    await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [...(status ? RULESETS : []), ...cookieRulesets.enable],
        disableRulesetIds: [...(status ? [] : RULESETS), ...cookieRulesets.disable]
    });
    // Региональные — отдельным вызовом: если правил окажется больше лимита, ошибка не выключит основные
    const regions = status ? await pickRegions() : [];
    await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: regions,
        disableRulesetIds: REGION_RULESETS.filter((id) => !regions.includes(id))
    });
}

/**
 * Применяет настройки: правила, скрытие баннеров, иконка.
 * Шаги независимы: сбой одного (например, превышен лимит правил) не отменяет остальные.
 * @param {{status: boolean, cookies: boolean}} settings
 */
async function applySettings(settings) {
    const {status, cookies, allowed} = settings;
    const extended = await chrome.permissions.contains(EXTENDED);
    // Набор косметических фильтров зависит от настройки cookie: соберётся заново при следующем запросе
    cosmetic = null;
    if (state) {
        (await state).status = status;
    }
    const results = await Promise.allSettled([
        chrome.storage.local.set({aBlockStorage: {status}, aBlockSettings: {cookies}, aBlockAllowed: allowed}),
        applyAllowed(allowed),
        // Без расширенного режима переключателя в окне нет — сервисы баннеров блокируются всегда
        applyRulesets(status, cookies || !extended),
        applyContentScripts(settings, extended),
        applyAction(status)
    ]);
    for (const result of results) {
        if (result.status === 'rejected') {
            console.error(result.reason);
        }
    }
}

// Последовательное применение, чтобы быстрые переключения не пересекались
let queue = Promise.resolve();
function enqueue(task) {
    queue = queue.then(task).catch(console.error);
    return queue;
}

/**
 * Применяет сохранённые настройки, изменив часть из них
 * @param {Object} [changes]
 * @returns {Promise}
 */
function update(changes = {}) {
    return enqueue(async () => applySettings({...await getSettings(), ...changes}));
}

chrome.runtime.onInstalled.addListener(async () => {
    update();
    // Дата установки — для одноразовой просьбы о поддержке. У обновившихся отсчёт идёт с обновления
    const {aBlockInstalled} = await chrome.storage.local.get('aBlockInstalled');
    if (!aBlockInstalled) {
        await chrome.storage.local.set({aBlockInstalled: Date.now()});
    }
});
chrome.runtime.onStartup.addListener(() => update());

// Расширенный режим включили или выключили: скрипты на всех сайтах и слежение за запросами.
// Разрешение на удаление данных: окно расширения могло закрыться, пока его запрашивало, — удаляем здесь
chrome.permissions.onAdded.addListener(async (permissions) => {
    listenRequests();
    update();
    if (permissions.permissions?.includes('browsingData')) {
        const {aBlockClear} = await chrome.storage.session.get('aBlockClear');
        await chrome.storage.session.remove('aBlockClear');
        if (aBlockClear && Date.now() - aBlockClear.time < 120000) {
            await clearSite(aBlockClear.tabId, aBlockClear.url);
        }
    }
});
chrome.permissions.onRemoved.addListener(() => update());

// Сообщения: от страниц сайтов (content/cosmetic.js) — только классы и id элементов,
// настройки и данные вкладок — только из окна расширения (popup.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Классы и id элементов страницы от content/cosmetic.js
    if (Array.isArray(request?.cosmetic)) {
        if (typeof request.dark === 'boolean') {
            applyBadgeColors(request.dark).catch(console.error);
        }
        applyCosmetic(sender, request.cosmetic, request.first === true).then(sendResponse, (e) => {
            console.error(e);
            sendResponse(0);
        });
        return true;
    }
    if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) {
        return;
    }
    if (typeof request?.status === 'boolean') {
        update({status: request.status}).then(() => sendResponse(true));
        return true;
    }
    if (typeof request?.dark === 'boolean') {
        applyBadgeColors(request.dark).then(() => sendResponse(true));
        return true;
    }
    if (typeof request?.cookies === 'boolean') {
        update({cookies: request.cookies}).then(() => sendResponse(true));
        return true;
    }
    // Защита на одном сайте: {site: 'example.com', enabled: false}
    if (typeof request?.site === 'string' && typeof request.enabled === 'boolean') {
        const {site, enabled} = request;
        enqueue(async () => {
            const settings = await getSettings();
            const allowed = settings.allowed.filter((host) => host !== site);
            await applySettings({...settings, allowed: enabled ? allowed : [...allowed, site].sort()});
        }).then(() => sendResponse(true));
        return true;
    }
    if (typeof request?.clear?.tabId === 'number') {
        clearSite(request.clear.tabId, request.clear.url).then(() => sendResponse(true), () => sendResponse(false));
        return true;
    }
    if (typeof request?.tabInfo === 'number') {
        load().then((s) => sendResponse({tab: s.tabs[request.tabInfo] || null, stats: s.stats}));
        return true;
    }
});

/*
 * Косметические фильтры списков: скрытие мест под рекламу (расширенный режим).
 * Данные — rules/cosmetic/<набор>.json (собирает tools/update-rules.js из uBlock Origin Lite)
 */

const COSMETIC_DIR = 'rules/cosmetic';

// Собственные фильтры ABlock: сайт → селекторы мест под рекламу, которые списки не скрывают
const OWN_COSMETIC = 'rules/cosmetic-ablock.json';

// Сколько классов и id принимаем за одно сообщение
const MAX_TOKENS = 5000;

/** @type {?Promise<Object[]>} */
let cosmetic = null;

/**
 * Косметические фильтры включённых наборов: основных, региональных и, если включено скрытие окон, про cookie
 * @returns {Promise<Object[]>}
 */
function loadCosmetic() {
    cosmetic ??= (async () => {
        const [index, regions, {cookies}] = await Promise.all([
            fetch(chrome.runtime.getURL(LISTS_INDEX)).then((r) => r.json()),
            pickRegions(),
            getSettings()
        ]);
        const ids = [...RULESETS, ...regions, ...(cookies ? [COOKIE_RULESET] : [])]
            .filter((id) => index.cosmetic?.includes(id));
        const load = (file) => fetch(chrome.runtime.getURL(file)).then((r) => r.json());
        return Promise.all([...ids.map((id) => load(`${COSMETIC_DIR}/${id}.json`)), load(OWN_COSMETIC).then(ownCosmetic)]);
    })();
    cosmetic.catch(() => {
        cosmetic = null;
    });
    return cosmetic;
}

/**
 * Собственные фильтры в формате наборов из списков
 * @param {Object<string, string[]>} sites сайт → селекторы
 * @returns {Object}
 */
function ownCosmetic(sites) {
    const set = {high: [], generic: {}, exceptions: {}, specific: [], hosts: {}, regexes: []};
    for (const [site, selectors] of Object.entries(sites)) {
        set.hosts[site] = selectors.map((selector) => set.specific.push(selector) - 1);
    }
    return set;
}

/**
 * Значение собственного свойства объекта (имя сайта или класса не должно совпасть со свойством Object)
 * @param {Object} object
 * @param {string} key
 * @returns {*}
 */
function own(object, key) {
    return Object.hasOwn(object, key) ? object[key] : undefined;
}

/**
 * Ключи, по которым в списках ищутся фильтры сайта: сам адрес, родительские домены
 * и «сущности» вида example.* (фильтр для всех доменных зон сайта)
 * @param {string} hostname
 * @returns {string[]}
 */
function cosmeticKeys(hostname) {
    const hosts = [hostname];
    for (let pos = hostname.indexOf('.'); pos >= 0; pos = hostname.indexOf('.', pos + 1)) {
        hosts.push(hostname.slice(pos + 1));
    }
    const entities = [];
    for (const host of hosts) {
        for (let name = host, pos = name.lastIndexOf('.'); pos > 0; pos = name.lastIndexOf('.')) {
            name = name.slice(0, pos);
            entities.push(name + '.*');
        }
    }
    return [...new Set([...hosts, ...entities])];
}

/**
 * Подбирает селекторы к классам и id страницы и вставляет их в документ, приславший сообщение.
 * В первом сообщении документа — ещё фильтры для этого сайта и общие для всех сайтов
 * @param {chrome.runtime.MessageSender} sender
 * @param {string[]} tokens '#id' и '.class'
 * @param {boolean} first
 * @returns {Promise<number>} сколько селекторов вставлено
 */
async function applyCosmetic(sender, tokens, first) {
    const tabId = sender.tab?.id;
    if (tabId === undefined || tabId < 0 || !sender.documentId) {
        return 0;
    }
    const origin = sender.origin && sender.origin !== 'null' ? sender.origin : sender.url;
    const {hostname} = new URL(origin);
    if (!hostname) {
        return 0;
    }
    const sets = await loadCosmetic();
    const keys = cosmeticKeys(hostname);

    // Исключения: селекторы, которые списки не применяют на этом сайте
    const exceptions = new Set();
    const specific = [];
    for (const set of sets) {
        for (const key of keys) {
            own(set.exceptions, key)?.forEach((selector) => exceptions.add(selector));
        }
        const items = keys.flatMap((key) => own(set.hosts, key) || []);
        for (const [part, regex, list] of set.regexes) {
            if (hostname.includes(part) && new RegExp(regex).test(hostname)) {
                items.push(...list);
            }
        }
        for (const i of items) {
            if (i < 0) {
                const entry = set.specific[~i];
                exceptions.add(Array.isArray(entry) ? entry[0] : entry);
            } else if (first) {
                specific.push(set.specific[i]);
            }
        }
    }

    const hide = new Set();
    const styles = new Map();
    for (const entry of specific) {
        if (Array.isArray(entry)) {
            styles.set(entry[0], entry[1]);
        } else {
            hide.add(entry);
        }
    }
    for (const set of sets) {
        if (first) {
            set.high.forEach((selector) => hide.add(selector));
        }
        for (const token of tokens.slice(0, MAX_TOKENS)) {
            if (typeof token === 'string') {
                own(set.generic, token)?.forEach((selector) => hide.add(selector));
            }
        }
    }

    // Каждый селектор — отдельным правилом: неизвестный браузеру селектор не отменит остальные
    const rules = [];
    for (const selector of hide) {
        if (!exceptions.has(selector)) {
            rules.push(`${selector}{display:none!important}`);
        }
    }
    for (const [selector, style] of styles) {
        if (!exceptions.has(selector)) {
            rules.push(`${selector}{${style}}`);
        }
    }
    if (!rules.length) {
        return 0;
    }
    try {
        await chrome.scripting.insertCSS({target: {tabId, documentIds: [sender.documentId]}, css: rules.join('\n'), origin: 'USER'});
    } catch {
        // Документ успел закрыться (рекламный iframe удалили, страницу покинули)
        return 0;
    }
    return rules.length;
}

/**
 * Удаляет всё, что браузер хранит для сайта, и перезагружает вкладку.
 * Cookie браузер удаляет для всего домена сам, остальное — по адресу сайта и его варианту с www и без.
 * Родительский домен не трогаем: у user.github.io это был бы чужой github.io
 * @param {number} tabId
 * @param {string} url
 */
async function clearSite(tabId, url) {
    const {hostname} = new URL(url);
    const hosts = [hostname, hostname.startsWith('www.') ? hostname.slice(4) : 'www.' + hostname];
    const isIp = /^[\d.]+$|:/.test(hostname);
    const origins = (isIp ? [hostname] : hosts).flatMap((host) => [`https://${host}`, `http://${host}`]);
    await chrome.browsingData.remove({origins}, {
        cache: true,
        cacheStorage: true,
        cookies: true,
        fileSystems: true,
        indexedDB: true,
        localStorage: true,
        serviceWorkers: true,
        webSQL: true
    });
    await chrome.tabs.reload(tabId, {bypassCache: true});
}

/*
 * Расширенный режим: сервер страницы и статистика блокировок.
 * Всё хранится только в браузере: вкладки — до закрытия браузера, статистика — постоянно.
 */

// Заголовки ответа, нужные окну (сервер, движок, HSTS, HTTP/3)
const HEADERS = ['server', 'x-powered-by', 'x-powered-cms', 'x-generator', 'x-drupal-cache', 'x-shopify-stage',
    'x-wix-request-id', 'x-vercel-id', 'x-nf-request-id', 'x-varnish', 'via',
    'strict-transport-security', 'alt-svc', 'content-encoding', 'x-robots-tag',
    'content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy',
    'permissions-policy', 'cross-origin-opener-policy',
    // Кэш сервера и CDN: HIT — страница из кэша, MISS — собрана заново
    'x-cache-status', 'x-cache', 'cf-cache-status', 'x-proxy-cache', 'x-fastcgi-cache', 'x-srcache-fetch-status', 'age'];

// Средний размер заблокированного запроса по типу, байт. Точный размер узнать нельзя:
// запрос не состоялся, поэтому экономия — оценка
const AVERAGE_SIZE = {
    script: 30000,
    sub_frame: 60000,
    image: 8000,
    stylesheet: 15000,
    font: 30000,
    media: 200000,
    xmlhttprequest: 2000,
    ping: 500,
    websocket: 0
};
const OTHER_SIZE = 3000;

// Сколько сторонних адресов помнить на вкладку
const MAX_HOSTS = 300;

/** @type {?Promise<{status: boolean, tabs: Object, stats: Object}>} */
let state = null;

/**
 * Данные из хранилища (service worker засыпает, память теряется)
 * @returns {Promise<{status: boolean, tabs: Object, stats: Object}>}
 */
function load() {
    state ??= Promise.all([
        chrome.storage.session.get('aBlockTabs'),
        chrome.storage.local.get('aBlockStats'),
        getSettings()
    ]).then(([{aBlockTabs}, {aBlockStats}, {status}]) => ({
        status,
        tabs: aBlockTabs || {},
        stats: aBlockStats || {requests: 0, bytes: 0, since: Date.now()}
    }));
    return state;
}

// Запись не чаще раза в секунду: запросов на странице бывают сотни
let saveTimer = null;
function save() {
    saveTimer ??= setTimeout(async () => {
        saveTimer = null;
        const {tabs, stats} = await load();
        await chrome.storage.session.set({aBlockTabs: tabs});
        await chrome.storage.local.set({aBlockStats: stats});
    }, 1000);
}

/**
 * Запрос страницы, которую браузер загружает заранее (speculation rules: Chrome так подгружает, например,
 * первый результат поиска). Пользователь её ещё не открыл: её данные затёрли бы данные открытой страницы.
 * Сама страница помечена как prerender, а её предварительная загрузка идёт от имени открытого документа
 * (documentId), тогда как у настоящего перехода документа ещё нет
 * @param {{type: string, documentLifecycle?: string, documentId?: string}} details
 * @returns {boolean}
 */
function isPrerender(details) {
    return details.documentLifecycle === 'prerender' || (details.type === 'main_frame' && !!details.documentId);
}

/**
 * Главный документ вкладки: IP сервера и заголовки
 * @param {chrome.webRequest.WebResponseCacheDetails} details
 */
async function onMainFrame(details) {
    if (isPrerender(details)) {
        return;
    }
    const s = await load();
    const headers = {};
    for (const {name, value} of details.responseHeaders || []) {
        const key = name.toLowerCase();
        if (HEADERS.includes(key)) {
            headers[key] = value;
        }
    }
    s.tabs[details.tabId] = {
        host: new URL(details.url).hostname,
        ip: details.ip || '',
        headers,
        blocked: {},
        bytes: 0
    };
    save();
}

/**
 * Картинка: настоящий тип из заголовка. Адрес обманчив — сервер может отдавать WebP и по name.jpg
 * @param {chrome.webRequest.WebResponseCacheDetails} details
 */
async function onImage(details) {
    const header = details.responseHeaders?.find((h) => h.name.toLowerCase() === 'content-type');
    const type = header?.value?.split(';')[0].trim().toLowerCase();
    const s = await load();
    const tab = s.tabs[details.tabId];
    if (!tab || !type?.startsWith('image/') || isPrerender(details)) {
        return;
    }
    tab.images ??= {};
    tab.images[type] = (tab.images[type] || 0) + 1;
    save();
}

/**
 * Заблокированный запрос: в статистику и в список вкладки
 * @param {chrome.webRequest.WebResponseErrorDetails} details
 */
async function onBlocked(details) {
    const s = await load();
    // ERR_BLOCKED_BY_CLIENT ставят и другие блокировщики: при выключенной защите не считаем
    if (!s.status) {
        return;
    }
    const size = AVERAGE_SIZE[details.type] ?? OTHER_SIZE;
    s.stats.requests++;
    s.stats.bytes += size;
    const tab = s.tabs[details.tabId];
    if (tab && details.type !== 'main_frame' && !isPrerender(details)) {
        tab.bytes = (tab.bytes || 0) + size;
        const url = new URL(details.url);
        const key = url.hostname + url.pathname.slice(0, 40);
        if (key in tab.blocked || Object.keys(tab.blocked).length < MAX_HOSTS) {
            tab.blocked[key] = (tab.blocked[key] || 0) + 1;
        }
    }
    save();
}

let listening = false;

/**
 * Подписка на запросы. Слушатели должны регистрироваться синхронно при запуске service worker,
 * иначе события, разбудившие его, потеряются
 */
function listenRequests() {
    if (listening || !chrome.webRequest) {
        return;
    }
    listening = true;
    chrome.webRequest.onResponseStarted.addListener(
        (details) => onMainFrame(details).catch(console.error),
        {urls: ['<all_urls>'], types: ['main_frame']},
        ['responseHeaders']
    );
    chrome.webRequest.onResponseStarted.addListener(
        (details) => onImage(details).catch(console.error),
        {urls: ['<all_urls>'], types: ['image']},
        ['responseHeaders']
    );
    chrome.webRequest.onErrorOccurred.addListener(
        (details) => {
            if (details.error === 'net::ERR_BLOCKED_BY_CLIENT') {
                onBlocked(details).catch(console.error);
            }
        },
        {urls: ['<all_urls>']}
    );
}

listenRequests();

chrome.tabs.onRemoved.addListener(async (tabId) => {
    const s = await load();
    if (tabId in s.tabs) {
        delete s.tabs[tabId];
        save();
    }
});
