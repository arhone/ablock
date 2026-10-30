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

// Пользовательские правила: только главный документ и только сайты с доступом
const CUSTOM_SCRIPT = {
    id: 'custom',
    js: ['content/custom.js'],
    allFrames: false,
    world: 'ISOLATED',
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
    const {aBlockCustom = {}} = await chrome.storage.local.get('aBlockCustom');
    const matches = [];
    if (status) {
        for (const host of Object.keys(aBlockCustom)) {
            if (!aBlockCustom[host]?.length) {
                continue;
            }
            for (const pattern of siteOrigins(host)) {
                if (await chrome.permissions.contains({origins: [pattern]})) {
                    matches.push(pattern);
                }
            }
        }
    }
    const scripts = [
        ...(matches.length ? [protect({...CUSTOM_SCRIPT, matches})] : []),
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
    // Дата установки — для одноразовых просьб оценить и поддержать. У обновившихся отсчёт идёт с обновления
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
chrome.permissions.onRemoved.addListener(() => {
    // Инвалидируем уже ожидающие load()/contains(), прежде чем начать очистку.
    redirectEpoch++;
    redirectQueue = redirectQueue.catch(console.error).then(async () => {
        const s = await load();
        for (const tab of Object.values(s.tabs)) {
            delete tab.redirects;
            delete tab.pendingRedirects;
            delete tab.retiredRedirectRequests;
        }
        await saveTabs();
    });
    update();
});

// Сообщения сайтов — косметика и пипетка; настройки и данные вкладок — только из окна расширения
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request?.pick || request?.custom === true) {
        const host = customSenderHost(sender);
        if (!host) {
            return;
        }
        enqueue(async () => {
            if (request.pick) {
                return saveCustom(sender, host, request.pick).catch(() => ({ok: false, error: 'inject'}));
            }
            return applyCustom(sender, host);
        }).then(sendResponse, () => sendResponse({ok: false, error: 'inject'}));
        return true;
    }
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
    if (request?.customRemove || request?.customClear) {
        const data = request.customRemove || request.customClear;
        enqueue(() => removeCustom(data, !!request.customClear).then(() => true, () => false)).then(sendResponse);
        return true;
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
        redirectQueue.catch(console.error).then(async () => {
            const s = await load();
            const extended = await chrome.permissions.contains(EXTENDED);
            const tab = s.tabs[request.tabInfo] || null;
            sendResponse({tab: tab && !extended ? {...tab, redirects: undefined, pendingRedirects: undefined, retiredRedirectRequests: undefined} : tab, stats: s.stats,
                redirectsStatus: extended ? (tab?.redirects ? 'observed' : 'not-observed') : 'permission-required'});
        }).catch(() => sendResponse(null));
        return true;
    }
});

/** Доступ к своему хосту и варианту с www, без поддоменов */
function siteOrigins(host) {
    return (/^[\d.]+$|:/.test(host) ? [host] : [host, 'www.' + host]).map((h) => `*://${h}/*`);
}

/** Принимаем выбор и запрос скрытия только от главного документа сайта */
function customSenderHost(sender) {
    if (sender.id !== chrome.runtime.id || !Number.isInteger(sender.tab?.id) || sender.tab.id < 0
        || sender.frameId !== 0 || !sender.documentId) {
        return null;
    }
    try {
        const url = new URL(sender.url);
        return /^https?:$/.test(url.protocol) ? url.hostname.replace(/^www\./, '') : null;
    } catch {
        return null;
    }
}

function validCustomSelector(s) {
    return typeof s === 'string' && !!s.trim() && s.length <= 300
        && !/[{};]/.test(s) && !s.includes('/*') && !/^(html|body|:root|\*)$/i.test(s.trim());
}

/** Исключения действуют и на родительские домены, как в окне */
async function customActive(host) {
    const {status, allowed} = await getSettings();
    return status && !allowed.some((site) => host === site || host.endsWith('.' + site));
}

function customCSS(tabId, documentId, s, highlight = false) {
    return {
        target: {tabId, documentIds: [documentId]},
        css: highlight ? `${s}{outline:2px solid #12a86b!important;outline-offset:-2px!important}`
            : `${s}{display:none!important}`,
        origin: 'USER'
    };
}

async function saveCustom(sender, host, pick) {
    if (!validCustomSelector(pick.s) || !await customActive(host)) {
        return {ok: false, error: 'invalid'};
    }
    const {aBlockCustom = {}} = await chrome.storage.local.get('aBlockCustom');
    const entries = own(aBlockCustom, host) || [];
    const exists = entries.some(({s}) => s === pick.s);
    if (!exists && entries.length >= 100) {
        return {ok: false, error: 'limit'};
    }
    try {
        await chrome.scripting.insertCSS(customCSS(sender.tab.id, sender.documentId, pick.s));
    } catch {
        return {ok: false, error: 'inject'};
    }
    if (!exists) {
        const k = ['image', 'video', 'frame', 'banner', 'dialog', 'block'].includes(pick.k) ? pick.k : 'block';
        const size = (n) => Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
        const entry = {s: pick.s, k, t: typeof pick.t === 'string' ? pick.t.slice(0, 60) : '',
            w: size(pick.w), h: size(pick.h), d: Date.now()};
        if (typeof pick.src === 'string') {
            try {
                entry.src = new URL(`https://${pick.src}`).hostname;
            } catch {
                // Некорректный источник не сохраняем
            }
        }
        aBlockCustom[host] = [...entries, entry];
        try {
            await chrome.storage.local.set({aBlockCustom});
        } catch {
            // Запись не сохранилась: возвращаем элемент на страницу
            await chrome.scripting.removeCSS(customCSS(sender.tab.id, sender.documentId, pick.s)).catch(() => {});
            return {ok: false, error: 'inject'};
        }
        if (!entries.length) {
            update();
        }
    }
    const permanent = await chrome.permissions.contains(EXTENDED)
        || await chrome.permissions.contains({origins: [`*://${host}/*`]});
    return {ok: true, count: entries.length + (exists ? 0 : 1), permanent};
}

async function applyCustom(sender, host) {
    if (!await customActive(host)) {
        return;
    }
    const {aBlockCustom = {}} = await chrome.storage.local.get('aBlockCustom');
    for (const {s} of own(aBlockCustom, host) || []) {
        if (validCustomSelector(s)) {
            await chrome.scripting.insertCSS(customCSS(sender.tab.id, sender.documentId, s)).catch(() => {});
        }
    }
}

async function removeCustom(data, clear) {
    if (typeof data?.host !== 'string') {
        return;
    }
    const host = data.host.replace(/^www\./, '');
    const {aBlockCustom = {}} = await chrome.storage.local.get('aBlockCustom');
    const entries = own(aBlockCustom, host) || [];
    const removed = entries.filter(({s}) => clear || data.selectors?.includes(s));
    const remaining = entries.filter((entry) => !removed.includes(entry));
    if (remaining.length) {
        aBlockCustom[host] = remaining;
    } else {
        delete aBlockCustom[host];
    }
    await chrome.storage.local.set({aBlockCustom});
    if (entries.length && !remaining.length) {
        update();
    }
    if (Number.isInteger(data.tabId) && data.documentId) {
        for (const {s} of removed) {
            await chrome.scripting.removeCSS(customCSS(data.tabId, data.documentId, s)).catch(() => {});
        }
    }
}

// Закрытие окна не должно оставлять подсветку или временно показанный элемент
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'aBlockHover' || port.sender?.id !== chrome.runtime.id
        || !port.sender.url?.startsWith(chrome.runtime.getURL(''))) {
        return;
    }
    let current = null;
    const restore = async () => {
        const item = current;
        current = null;
        if (!item) {
            return;
        }
        const {tabId, documentId, s, hidden} = item;
        await chrome.scripting.removeCSS(customCSS(tabId, documentId, s, true)).catch(() => {});
        if (hidden) {
            // После удаления записи или выключения защиты скрытие не возвращаем
            try {
                const tab = await chrome.tabs.get(tabId);
                const host = new URL(tab.url).hostname.replace(/^www\./, '');
                const {aBlockCustom = {}} = await chrome.storage.local.get('aBlockCustom');
                if (await customActive(host) && own(aBlockCustom, host)?.some((entry) => entry.s === s)) {
                    await chrome.scripting.insertCSS(customCSS(tabId, documentId, s));
                }
            } catch {
                // Документ уже закрыт или доступ снят
            }
        }
    };
    port.onMessage.addListener((item) => {
        enqueue(async () => {
            current = null;
            if (Number.isInteger(item?.tabId) && typeof item.documentId === 'string' && validCustomSelector(item.s)) {
                current = {tabId: item.tabId, documentId: item.documentId, s: item.s, hidden: item.hidden === true};
            }
        });
    });
    port.onDisconnect.addListener(() => enqueue(restore));
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
        const {stats} = await load();
        await saveTabs();
        await chrome.storage.local.set({aBlockStats: stats});
    }, 1000);
}

// Все записи вкладок идут одной очередью, включая отложенную статистику.
// Снимок делаем внутри очереди: старая запись не может затереть новую цепочку.
let tabsWrite = Promise.resolve();
function saveTabs() {
    tabsWrite = tabsWrite.catch(console.error).then(async () => {
        const {tabs} = await load();
        await chrome.storage.session.set({aBlockTabs: structuredClone(tabs)});
    });
    return tabsWrite;
}

const MAX_REDIRECTS = 20;
const MAX_RETIRED_REQUESTS = 8;
let redirectEpoch = 0;
let redirectQueue = Promise.resolve();

/** Только безопасный HTTP(S) origin и первые 160 символов пути, без credentials/query/hash. */
function redirectAddress(value) {
    try {
        const url = new URL(value);
        return /^https?:$/.test(url.protocol) ? url.origin + url.pathname.slice(0, 160) : null;
    } catch {
        return null;
    }
}

/**
 * redirects v1 — только наблюдавшиеся HTTP-переходы главной навигации.
 * До принятия headers новая цепочка находится в pendingRedirects; данные открытого
 * документа и redirects сохраняются. 204/205 и attachment не заменяют документ.
 * retiredRedirectRequests — последние 8 вытесненных requestId, включая после сна worker.
 * generation — UUID новой навигации, requestId — идентификатор браузера (не URL).
 * hops: {from,to,statusCode,timeStamp}, максимум 20; initialUrl/finalUrl безопасные.
 * outcome: pending/completed/error; complete — вся ли HTTP-цепочка наблюдалась.
 * reasons: limit/non-http-redirect/unsafe-url/request-error. Ноль hops — измеренный ноль.
 * document: null либо {documentId,timeOrigin}; только при точном совпадении ID события
 * завершения и InjectionResult главного активного фрейма. Без ID НЕ выводить как историю
 * документа. Потребитель обязан сверить documentId и timeOrigin с результатом своего аудита.
 * Нет webNavigation: браузер может не дать ID главной навигации — это явная недоступность
 * привязки, а не разрешение сопоставлять по хосту, сокращённому URL или времени.
 */
function queueRedirect(kind, details) {
    const epoch = redirectEpoch;
    redirectQueue = redirectQueue.catch(console.error).then(async () => {
        const s = await load();
        if (epoch !== redirectEpoch || !await chrome.permissions.contains(EXTENDED)
            || epoch !== redirectEpoch || details.tabId < 0 || details.frameId !== 0
            || details.documentLifecycle === 'prerender' || details.documentLifecycle === 'cached') {
            return;
        }
        let tab = s.tabs[details.tabId];
        let chain = tab?.pendingRedirects || tab?.redirects;
        if (tab?.retiredRedirectRequests?.includes(details.requestId)) {
            return;
        }
        if (kind === 'start') {
            // onBeforeRequest повторяется после HTTP-перехода с тем же requestId.
            if (chain?.requestId === details.requestId || chain?.startedAt > details.timeStamp) {
                return;
            }
            if (details.documentId) {
                return; // Предзагрузка от имени существующего документа.
            }
            tab ??= {};
            const retired = tab.retiredRedirectRequests || [];
            if (chain) {
                retired.push(chain.requestId);
            }
            tab.retiredRedirectRequests = retired.slice(-MAX_RETIRED_REQUESTS);
            chain = {
                version: 1, generation: crypto.randomUUID(), requestId: details.requestId,
                initialUrl: redirectAddress(details.url), finalUrl: null,
                startedAt: details.timeStamp, endedAt: null, outcome: 'pending',
                complete: true, truncated: false, reasons: [], hops: [], document: null
            };
            if (!chain.initialUrl) {
                chain.complete = false;
                chain.reasons.push('unsafe-url');
            }
            tab.pendingRedirects = chain;
            s.tabs[details.tabId] = tab;
        } else {
            if (kind === 'headers' && (!chain || chain.requestId !== details.requestId)
                && (!chain || details.timeStamp >= chain.startedAt)) {
                // Режим могли включить между началом запроса и ответом. Сохраняем
                // прежний сбор IP/заголовков, но не придумываем начало цепочки.
                chain = null;
            } else if (!chain || chain.requestId !== details.requestId || chain.outcome !== 'pending') {
                return;
            }
            if (kind === 'redirect') {
                // Внутренние переходы браузера (например, HSTS) не выдаём за HTTP-ответ.
                if (details.statusCode < 300 || details.statusCode > 399
                    || details.statusLine?.includes('Internal Redirect')) {
                    chain.complete = false;
                    if (!chain.reasons.includes('non-http-redirect')) {
                        chain.reasons.push('non-http-redirect');
                    }
                } else if (chain.hops.length < MAX_REDIRECTS) {
                    const from = redirectAddress(details.url);
                    const to = redirectAddress(details.redirectUrl);
                    chain.hops.push({from, to, statusCode: details.statusCode, timeStamp: details.timeStamp});
                    if (!from || !to) {
                        chain.complete = false;
                        if (!chain.reasons.includes('unsafe-url')) {
                            chain.reasons.push('unsafe-url');
                        }
                    }
                } else {
                    chain.complete = false;
                    chain.truncated = true;
                    if (!chain.reasons.includes('limit')) {
                        chain.reasons.push('limit');
                    }
                }
            } else if (kind === 'headers') {
                const attachment = details.responseHeaders?.some(({name, value}) =>
                    name.toLowerCase() === 'content-disposition' && /^attachment(?:\s*;|\s*$)/i.test(value || ''));
                if (details.statusCode === 204 || details.statusCode === 205 || attachment) {
                    return;
                }
                const headers = {};
                for (const {name, value} of details.responseHeaders || []) {
                    const key = name.toLowerCase();
                    if (HEADERS.includes(key)) {
                        headers[key] = key in headers ? `${headers[key]}, ${value}` : value;
                    }
                }
                const retired = tab?.retiredRedirectRequests || [];
                if (!chain) {
                    for (const previous of [tab?.redirects, tab?.pendingRedirects]) {
                        if (previous && !retired.includes(previous.requestId)) {
                            retired.push(previous.requestId);
                        }
                    }
                }
                tab = {host: new URL(details.url).hostname, ip: details.ip || '', headers,
                    blocked: {}, bytes: 0, retiredRedirectRequests: retired.slice(-MAX_RETIRED_REQUESTS)};
                if (chain) {
                    tab.redirects = chain;
                }
                s.tabs[details.tabId] = tab;
            } else {
                chain.finalUrl = redirectAddress(details.url);
                chain.endedAt = details.timeStamp;
                chain.outcome = kind === 'completed' ? 'completed' : 'error';
                chain.statusCode = details.statusCode ?? null;
                if (kind === 'error') {
                    chain.complete = false;
                    chain.reasons.push('request-error');
                }
            }
        }
        await saveTabs();
        if (kind === 'completed' && details.documentId && details.documentLifecycle === 'active') {
            // Ограничиваем ожидание; поздний результат инъекции сам состояние не меняет.
            const result = await Promise.race([
                chrome.scripting.executeScript({target: {tabId: details.tabId, frameIds: [0]},
                    func: () => performance.timeOrigin}).catch(() => []),
                new Promise((resolve) => setTimeout(() => resolve([]), 400))
            ]);
            const main = result.find((entry) => entry.frameId === 0);
            if (epoch === redirectEpoch && s.tabs[details.tabId]?.redirects === chain
                && main?.documentId === details.documentId && Number.isFinite(main.result)) {
                chain.document = {documentId: main.documentId, timeOrigin: main.result};
                await saveTabs();
            }
        }
    });
    return redirectQueue;
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
function onMainFrame(details) {
    return queueRedirect('headers', details);
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
    for (const [event, kind] of [
        ['onBeforeRequest', 'start'], ['onBeforeRedirect', 'redirect'],
        ['onCompleted', 'completed'], ['onErrorOccurred', 'error']
    ]) {
        chrome.webRequest[event].addListener(
            (details) => queueRedirect(kind, details).catch(console.error),
            {urls: ['<all_urls>'], types: ['main_frame']}
        );
    }
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

chrome.tabs.onRemoved.addListener((tabId) => {
    redirectQueue = redirectQueue.catch(console.error).then(async () => {
        const s = await load();
        delete s.tabs[tabId];
        await saveTabs();
    });
});
