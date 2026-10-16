// Наборы правил с трекерами, остальные считаем рекламой
const TRACKER_RULESETS = ['trackers', 'ru-trackers', 'easyprivacy', 'rus-1'];

/**
 * Выполняется на странице: протокол, время загрузки, сторонние домены
 * @returns {{protocol: string, loadTime: ?number, timeOrigin: number, domains: string[]}}
 */
function collectPageInfo() {
    const navigation = performance.getEntriesByType('navigation')[0];
    // Упрощённо: «свой» домен — последние две части имени
    const base = location.hostname.split('.').slice(-2).join('.');
    const domains = new Set();
    for (const entry of performance.getEntriesByType('resource')) {
        try {
            const host = new URL(entry.name).hostname;
            if (host && host !== base && !host.endsWith('.' + base)) {
                domains.add(host);
            }
        } catch {
            // Адрес не разбирается (data:, blob:) — пропускаем
        }
    }
    return {
        protocol: navigation?.nextHopProtocol || '',
        loadTime: navigation?.loadEventEnd > 0 ? navigation.loadEventEnd - navigation.startTime : null,
        timeOrigin: performance.timeOrigin,
        domains: [...domains].sort()
    };
}

/**
 * Обновляет значок
 * @param {string} id
 * @param {string} text
 * @param {string} state good | warn | bad | none
 * @param {string} title
 */
function setBadge(id, text, state, title) {
    const badge = document.getElementById(id);
    badge.textContent = text;
    badge.dataset.state = state;
    badge.title = title;
}

/**
 * Значки сайта: HTTPS, протокол, скорость, сторонние домены
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<?Object>} данные страницы
 */
async function renderSite(tab) {
    const https = new URL(tab.url).protocol === 'https:';
    setBadge('https', https ? 'HTTPS' : 'HTTP', https ? 'good' : 'bad',
        https ? 'Соединение зашифровано' : 'Соединение не зашифровано');

    let info;
    try {
        [{result: info}] = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: collectPageInfo});
    } catch {
        return null; // Страница недоступна для расширений
    }

    const protocols = {
        'h3': ['HTTP/3', 'good', 'HTTP/3 (QUIC) — самый быстрый протокол'],
        'h2': ['HTTP/2', 'warn', 'HTTP/2 — современный протокол'],
        'http/1.1': ['HTTP/1.1', 'bad', 'HTTP/1.1 — устаревший протокол'],
        'http/1.0': ['HTTP/1.0', 'bad', 'HTTP/1.0 — устаревший протокол']
    };
    const [protocol, protocolState, protocolTitle] = protocols[info.protocol]
        || ['HTTP/?', 'none', 'Протокол неизвестен (страница из кэша)'];
    setBadge('protocol', protocol, protocolState, protocolTitle);

    if (info.loadTime === null) {
        setBadge('speed', 'Загрузка…', 'none', 'Страница ещё загружается');
    } else {
        const seconds = info.loadTime / 1000;
        setBadge('speed', seconds.toFixed(1) + ' с', seconds < 2 ? 'good' : seconds < 5 ? 'warn' : 'bad',
            'Время загрузки страницы');
    }

    const count = info.domains.length;
    const list = info.domains.slice(0, 25).join('\n') + (count > 25 ? '\n…ещё ' + (count - 25) : '');
    setBadge('domains', 'Домены ' + count, count <= 5 ? 'good' : count <= 15 ? 'warn' : 'bad',
        count ? 'Сторонние домены:\n' + list : 'Сторонних доменов нет');

    return info;
}

/**
 * Значки заблокированного на вкладке
 * @param {chrome.tabs.Tab} tab
 * @param {?Object} info
 * @param {boolean} status
 */
async function renderBlocked(tab, info, status) {
    if (!status) {
        setBadge('blocked', 'Блок —', 'none', 'Защита выключена');
        setBadge('trackers', 'Трекеры —', 'none', 'Защита выключена');
        return;
    }

    let matched;
    try {
        ({rulesMatchedInfo: matched} = await chrome.declarativeNetRequest.getMatchedRules({
            tabId: tab.id,
            minTimeStamp: Math.floor(info?.timeOrigin ?? 0)
        }));
    } catch {
        return; // Превышен лимит запросов
    }

    const trackers = matched.filter((m) => TRACKER_RULESETS.includes(m.rule.rulesetId)).length;
    const ads = matched.length - trackers;
    setBadge('blocked', 'Блок ' + matched.length, 'good',
        'Заблокировано на странице\nРеклама: ' + ads + '\nТрекеры: ' + trackers);
    setBadge('trackers', 'Трекеры ' + trackers, trackers ? 'bad' : 'good',
        trackers ? 'Сайт следит за вами, заблокировано трекеров: ' + trackers : 'Трекеров не найдено');
}

document.addEventListener('DOMContentLoaded', async function () {

    const bg = document.getElementById('bg');
    const label = document.getElementById('status');

    // Отображает статус
    function render(status) {
        bg.dataset.status = String(status);
        label.dataset.status = String(status);
        label.textContent = status ? 'Защита включена' : 'Защита выключена';
    }

    // Текущий статус (по умолчанию включено)
    const {aBlockStorage} = await chrome.storage.local.get('aBlockStorage');
    let status = aBlockStorage?.status ?? true;
    render(status);
    document.body.classList.remove('loading');

    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const isSite = /^https?:/.test(tab?.url || '');
    let info = null;

    // Нажатие на кнопку
    document.getElementById('button').addEventListener('click', function () {
        status = !status;
        render(status);
        chrome.runtime.sendMessage({status});
        if (isSite) {
            renderBlocked(tab, info, status);
        }
    });

    // Значки только для обычных сайтов
    if (isSite) {
        info = await renderSite(tab);
        await renderBlocked(tab, info, status);
    }

});
