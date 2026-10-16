/**
 * @author AlekseyArh
 * @link https://github.com/arhone/ablock
 */

// Наборы правил берём из манифеста, чтобы не дублировать список
const RULESETS = chrome.runtime.getManifest().declarative_net_request.rule_resources.map((r) => r.id);

// Скрытие баннеров (CSS) и вырезание рекламы из плеера YouTube и лент VK и OK
const CONTENT_SCRIPTS = [
    {
        id: 'youtube',
        matches: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'],
        css: ['css/youtube.css'],
        js: ['js/youtube.js'],
        world: 'MAIN',
        allFrames: true,
        runAt: 'document_start'
    },
    {
        id: 'pornhub',
        matches: ['*://*.pornhub.com/*', '*://*.pornhub.org/*'],
        css: ['css/pornhub.css'],
        runAt: 'document_start'
    },
    {
        id: 'vk',
        matches: ['*://*.vk.com/*', '*://*.vk.ru/*'],
        css: ['css/vk.css'],
        js: ['js/vk.js'],
        world: 'MAIN',
        runAt: 'document_start'
    },
    {
        id: 'vkvideo',
        matches: ['*://*.vkvideo.ru/*'],
        css: ['css/vk.css'],
        runAt: 'document_start'
    },
    {
        id: 'ok',
        matches: ['*://*.ok.ru/*'],
        css: ['css/ok.css'],
        js: ['js/ok.js'],
        world: 'MAIN',
        runAt: 'document_start'
    }
];

/**
 * Текущий статус (по умолчанию включено)
 * @returns {Promise<boolean>}
 */
async function getStatus() {
    const {aBlockStorage} = await chrome.storage.local.get('aBlockStorage');
    return aBlockStorage?.status ?? true;
}

/**
 * Перерегистрирует скрипты сайтов (при выключенной защите только снимает)
 * @param {boolean} status
 */
async function applyContentScripts(status) {
    const registered = await chrome.scripting.getRegisteredContentScripts();
    if (registered.length) {
        await chrome.scripting.unregisterContentScripts({ids: registered.map((s) => s.id)});
    }
    if (status) {
        await chrome.scripting.registerContentScripts(CONTENT_SCRIPTS);
    }
}

/**
 * Счётчик заблокированного и иконка
 * @param {boolean} status
 */
async function applyAction(status) {
    await chrome.declarativeNetRequest.setExtensionActionOptions({displayActionCountAsBadgeText: status});
    await chrome.action.setBadgeBackgroundColor({color: '#16a34a'});
    await chrome.action.setBadgeTextColor({color: '#ffffff'});
    await chrome.action.setIcon({
        path: {32: status ? '/image/ablock-32.png' : '/image/ablock-32-black.png'}
    });
}

/**
 * Применяет статус: правила, скрытие баннеров, иконка.
 * Шаги независимы: сбой одного (например, превышен лимит правил) не отменяет остальные.
 * @param {boolean} status
 */
async function applyStatus(status) {
    const results = await Promise.allSettled([
        chrome.storage.local.set({aBlockStorage: {status}}),
        chrome.declarativeNetRequest.updateEnabledRulesets(
            status ? {enableRulesetIds: RULESETS} : {disableRulesetIds: RULESETS}
        ),
        applyContentScripts(status),
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

function restore() {
    enqueue(async () => applyStatus(await getStatus()));
}

chrome.runtime.onInstalled.addListener(restore);
chrome.runtime.onStartup.addListener(restore);

// Переключение из popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (typeof request?.status !== 'boolean') {
        return;
    }
    enqueue(() => applyStatus(request.status)).then(() => sendResponse(true));
    return true;
});
