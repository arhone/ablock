// Наборы правил с трекерами и окнами про cookie, остальные считаем рекламой
const TRACKER_RULESETS = ['trackers', 'easyprivacy', 'rus-1'];
const COOKIE_RULESET = 'annoyances-cookies';

// Расширенный режим: доступ ко всем сайтам (см. sw.js)
const EXTENDED = {permissions: ['webRequest'], origins: ['<all_urls>']};

const STORE_URL = 'https://chromewebstore.google.com/detail/cmbihlcgenpbmdkipolfghkplheignfe';

// Куда поделиться отчётом: ссылка из адреса расширения в магазине (link) и текста отчёта (text).
// kind: send — мессенджер, post — лента; short — короткий текст (лимит X), title — только первая строка,
// linkOnly — сервис берёт только ссылку, текст отчёта не передать
const enc = encodeURIComponent;
const NETWORKS = {
    telegram: {name: 'Telegram', kind: 'send', url: (link, text) => `https://t.me/share/url?url=${enc(link)}&text=${enc(text)}`},
    vk: {name: 'VK', kind: 'post', url: (link, text) => `https://vk.com/share.php?url=${enc(link)}&title=${enc(text)}`},
    ok: {name: 'OK', kind: 'post', url: (link, text) => `https://connect.ok.ru/offer?url=${enc(link)}&title=${enc(text)}`},
    max: {name: 'Max', kind: 'send', url: (link, text) => `https://max.ru/:share?text=${enc(text + ' ' + link)}`},
    whatsapp: {name: 'WhatsApp', kind: 'send', url: (link, text) => `https://api.whatsapp.com/send?text=${enc(text + ' ' + link)}`},
    viber: {name: 'Viber', kind: 'send', url: (link, text) => `viber://forward?text=${enc(text + ' ' + link)}`},
    x: {name: 'X', kind: 'post', short: true, url: (link, text) => `https://x.com/intent/post?url=${enc(link)}&text=${enc(text)}`},
    facebook: {name: 'Facebook', kind: 'post', linkOnly: true, url: (link) => `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`},
    linkedin: {name: 'LinkedIn', kind: 'post', linkOnly: true, url: (link) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}`},
    reddit: {name: 'Reddit', kind: 'post', title: true, url: (link, text) => `https://www.reddit.com/submit?url=${enc(link)}&title=${enc(text)}`},
    hackernews: {name: 'Hacker News', kind: 'post', title: true, url: (link, text) => `https://news.ycombinator.com/submitlink?u=${enc(link)}&t=${enc(text)}`},
    weibo: {name: '微博', kind: 'post', short: true, url: (link, text) => `https://service.weibo.com/share/share.php?url=${enc(link)}&title=${enc(text)}`}
};

// Соцсети по языку окна: популярные в странах этого языка, Telegram первым
const NETWORKS_BY_LANG = {
    ru: ['telegram', 'vk', 'ok', 'max', 'x'],
    kk: ['telegram', 'whatsapp', 'vk'],
    uz: ['telegram', 'whatsapp', 'facebook'],
    sr: ['telegram', 'viber', 'facebook', 'whatsapp'],
    bg: ['telegram', 'viber', 'facebook', 'whatsapp'],
    pl: ['telegram', 'facebook', 'whatsapp', 'x'],
    sk: ['telegram', 'facebook', 'whatsapp', 'x'],
    de: ['telegram', 'whatsapp', 'facebook', 'x', 'linkedin'],
    fr: ['telegram', 'whatsapp', 'facebook', 'x', 'linkedin'],
    it: ['telegram', 'whatsapp', 'facebook', 'x', 'linkedin'],
    en: ['telegram', 'x', 'reddit', 'facebook', 'hackernews'],
    es: ['telegram', 'whatsapp', 'facebook', 'x'],
    'pt-BR': ['telegram', 'whatsapp', 'facebook', 'x'],
    tr: ['telegram', 'whatsapp', 'x', 'facebook'],
    hi: ['telegram', 'whatsapp', 'facebook', 'x'],
    id: ['telegram', 'whatsapp', 'facebook', 'x'],
    vi: ['telegram', 'facebook', 'x'],
    'zh-CN': ['telegram', 'weibo', 'x'],
    'zh-TW': ['telegram', 'facebook', 'x'],
    uk: ['telegram', 'viber', 'facebook', 'x'],
    cs: ['telegram', 'facebook', 'whatsapp', 'x'],
    sl: ['telegram', 'viber', 'facebook', 'whatsapp'],
    hr: ['telegram', 'viber', 'facebook', 'whatsapp'],
    el: ['telegram', 'viber', 'facebook', 'whatsapp'],
    hu: ['telegram', 'facebook', 'whatsapp', 'viber'],
    ro: ['telegram', 'whatsapp', 'facebook', 'x'],
    lt: ['telegram', 'facebook', 'whatsapp', 'x'],
    lv: ['telegram', 'facebook', 'whatsapp', 'x'],
    et: ['telegram', 'facebook', 'whatsapp', 'x'],
    fi: ['telegram', 'whatsapp', 'facebook', 'x', 'linkedin'],
    sv: ['telegram', 'facebook', 'whatsapp', 'x', 'linkedin'],
    no: ['telegram', 'facebook', 'whatsapp', 'x', 'linkedin'],
    da: ['telegram', 'facebook', 'whatsapp', 'x', 'linkedin'],
    nl: ['telegram', 'whatsapp', 'facebook', 'x', 'linkedin'],
    ca: ['telegram', 'whatsapp', 'facebook', 'x'],
    pt: ['telegram', 'whatsapp', 'facebook', 'x'],
    ar: ['telegram', 'whatsapp', 'facebook', 'x'],
    he: ['telegram', 'whatsapp', 'facebook', 'x'],
    fa: ['telegram', 'whatsapp', 'x'],
    am: ['telegram', 'facebook', 'whatsapp'],
    sw: ['telegram', 'whatsapp', 'facebook', 'x'],
    bn: ['telegram', 'whatsapp', 'facebook', 'x'],
    gu: ['telegram', 'whatsapp', 'facebook', 'x'],
    kn: ['telegram', 'whatsapp', 'facebook', 'x'],
    ml: ['telegram', 'whatsapp', 'facebook', 'x'],
    mr: ['telegram', 'whatsapp', 'facebook', 'x'],
    ta: ['telegram', 'whatsapp', 'facebook', 'x'],
    te: ['telegram', 'whatsapp', 'facebook', 'x'],
    ms: ['telegram', 'whatsapp', 'facebook', 'x'],
    fil: ['telegram', 'facebook', 'viber', 'x'],
    th: ['telegram', 'facebook', 'x'],
    ja: ['telegram', 'x', 'facebook'],
    ko: ['telegram', 'x', 'facebook']
};

// Страница для пожертвований (Boosty). Пустая строка — кнопка «Поддержать» скрыта
const DONATE_URL = 'https://boosty.to/a.arh/donate';

// Когда один раз попросить о поддержке: после стольких заблокированных запросов (расширенный режим)
// или через столько дней после установки (без него счётчика нет)
const ASK_REQUESTS = 10000;
const ASK_DAYS = 30;

// Переводы в _locales: язык можно выбрать в окне, не меняя язык браузера
const LOCALES = ['am', 'ar', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'en_AU', 'en_GB', 'en_US', 'es', 'es_419',
    'et', 'fa', 'fi', 'fil', 'fr', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'kk', 'kn', 'ko', 'lt', 'lv', 'ml', 'mr',
    'ms', 'nl', 'no', 'pl', 'pt_BR', 'pt_PT', 'ro', 'ru', 'sk', 'sl', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'tr', 'uk', 'uz',
    'vi', 'zh_CN', 'zh_TW'];

// Сообщения выбранного в окне языка по порядку поиска (как у Chrome: pt_PT → pt → en); null — язык браузера
let messages = null;

// Язык показанного перевода, а не браузера: в немецком Chrome без перевода de окно на английском,
// и числа, даты и названия стран должны быть тоже по-английски
let LANG = chrome.i18n.getMessage('locale') || chrome.i18n.getUILanguage();

/**
 * Загружает язык, выбранный в окне
 * @returns {Promise<void>}
 */
async function loadLocale() {
    const {aBlockLang} = await chrome.storage.local.get('aBlockLang');
    if (!LOCALES.includes(aBlockLang)) {
        return;
    }
    const chain = [...new Set([aBlockLang, aBlockLang.split('_')[0], 'en'])].filter((code) => LOCALES.includes(code));
    messages = await Promise.all(chain.map(async (code) => (await fetch(`/_locales/${code}/messages.json`)).json()));
    LANG = t('locale') || aBlockLang.replace('_', '-');
}

/**
 * Перевод из _locales: выбранного в окне языка или языка браузера
 * @param {string} key
 * @param {...(string|number)} args подстановки
 * @returns {string}
 */
function t(key, ...args) {
    if (!messages) {
        return chrome.i18n.getMessage(key, args.map(String));
    }
    const entry = messages.map((list) => list[key]).find(Boolean);
    if (!entry) {
        return '';
    }
    // Как в Chrome: $NAME$ — содержимое заполнителя (имя без учёта регистра), затем $1…$9 — подстановки, $$ — знак $
    const placeholders = Object.fromEntries(Object.entries(entry.placeholders || {})
        .map(([name, value]) => [name.toLowerCase(), value.content]));
    return entry.message
        .replace(/\$([\w@]+)\$/g, (match, name) => placeholders[name.toLowerCase()] ?? match)
        .replace(/\$(\$|[1-9])/g, (match, n) => n === '$' ? '$' : String(args[n - 1] ?? ''));
}

/**
 * Выбор языка окна: «как в браузере» или любой из переводов. Окно перезапускается на новом языке
 */
function initLanguage() {
    const select = document.getElementById('lang');
    const auto = new Option(t('langAuto'), '');
    const names = LOCALES.map((code) => {
        const tag = code.replace('_', '-');
        const name = new Intl.DisplayNames([tag], {type: 'language'}).of(tag) || code;
        return new Option(name.charAt(0).toLocaleUpperCase(tag) + name.slice(1), code);
    }).sort((a, b) => a.text.localeCompare(b.text, LANG));
    select.append(auto, ...names);
    chrome.storage.local.get('aBlockLang').then(({aBlockLang}) => {
        select.value = LOCALES.includes(aBlockLang) ? aBlockLang : '';
    });
    select.addEventListener('change', async () => {
        await chrome.storage.local.set({aBlockLang: select.value});
        location.reload();
    });
}

/**
 * Число по правилам языка браузера
 * @param {number} value
 * @param {Object} [options] Intl.NumberFormat
 * @returns {string}
 */
function formatNumber(value, options) {
    return value.toLocaleString(LANG, options);
}

/**
 * Размер: 840 КБ, 2,4 МБ, 1,1 ГБ, 3,2 ТБ
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
    const units = [['petabyte', 2 ** 50], ['terabyte', 2 ** 40], ['gigabyte', 2 ** 30], ['megabyte', 2 ** 20],
        ['kilobyte', 2 ** 10]];
    const [unit, size] = units.find(([, size]) => bytes >= size) || units.at(-1);
    return formatNumber(bytes / size, {
        style: 'unit',
        unit,
        unitDisplay: 'short',
        maximumFractionDigits: bytes / size < 10 ? 1 : 0
    });
}

/**
 * Переводит статичный текст окна: data-i18n — содержимое, data-i18n-title — подсказка
 */
function translatePage() {
    document.documentElement.lang = LANG;
    document.documentElement.dir = /^(ar|fa|he)\b/.test(LANG) ? 'rtl' : 'ltr';
    for (const el of document.querySelectorAll('[data-i18n]')) {
        el.textContent = t(el.dataset.i18n);
    }
    for (const el of document.querySelectorAll('[data-i18n-title]')) {
        el.title = t(el.dataset.i18nTitle);
    }
    for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    }
    setBadge('blocked', t('blocked', '—'), 'none', '');
    setBadge('trackers', t('trackers', '—'), 'none', '');
    setBadge('domains', t('domains', '—'), 'none', '');
    document.getElementById('meter').append(...Array.from({length: 10}, () => document.createElement('i')));
}

/**
 * Заметка к сайту: хранится в aBlockNotes {хост: текст} только в этом браузере
 * @param {string} host Хост без www
 */
async function setupNote(host) {
    const add = document.getElementById('note-add');
    const note = document.getElementById('note');
    const input = document.getElementById('note-input');
    const {aBlockNotes} = await chrome.storage.local.get('aBlockNotes');
    let text = aBlockNotes?.[host] || '';

    const show = () => {
        note.textContent = text;
        note.hidden = !text;
        add.hidden = Boolean(text);
        input.hidden = true;
    };
    const edit = () => {
        input.value = text;
        note.hidden = true;
        add.hidden = true;
        input.hidden = false;
        input.focus();
    };
    const save = async () => {
        if (input.hidden) {
            return;
        }
        text = input.value.replace(/\s+/g, ' ').trim();
        show();
        // Перечитываем: заметки могли измениться в окне на другой вкладке
        const {aBlockNotes: notes = {}} = await chrome.storage.local.get('aBlockNotes');
        if (text) {
            notes[host] = text;
        } else {
            delete notes[host];
        }
        await chrome.storage.local.set({aBlockNotes: notes});
    };

    add.addEventListener('click', edit);
    note.addEventListener('click', edit);
    note.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            edit();
        }
    });
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            // Отмена правки; preventDefault, чтобы Escape не закрыл окно
            e.preventDefault();
            input.hidden = true;
            show();
        }
    });
    show();
}

/**
 * Выполняется на странице: протокол, время загрузки, сторонние домены, вес, сжатие
 * @returns {Object}
 */
function collectPageInfo() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    // Упрощённо: «свой» домен — последние две части имени, а для адресов вида site.co.uk, site.com.br — три
    const labels = location.hostname.split('.');
    const isIp = /^[\d.]+$|:/.test(location.hostname);
    const secondLevel = labels.length > 2 && /^[a-z]{2}$/.test(labels.at(-1))
        && /^(co|com|net|org|gov|edu|ac|or|ne|go|gob|nic|msk|spb)$/.test(labels.at(-2));
    const base = isIp ? location.hostname : labels.slice(secondLevel ? -3 : -2).join('.');
    const isOwn = (host) => host === base || host.endsWith('.' + base);

    // Средний размер файла по типу, байт: сторонние сайты обычно скрывают размер от страницы
    const AVERAGE_SIZE = {script: 25000, css: 12000, font: 30000, img: 15000, media: 300000, xhr: 3000, frame: 40000, other: 5000};
    const kindOf = (entry, path) => {
        if (/\.(woff2?|ttf|otf)$/i.test(path)) {
            return 'font';
        }
        if (/\.css$/i.test(path)) {
            return 'css';
        }
        if (/\.m?js$/i.test(path)) {
            return 'script';
        }
        if (/\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(path)) {
            return 'img';
        }
        if (/\.(mp4|webm|m3u8|ts|m4s|mp3|ogg)$/i.test(path)) {
            return 'media';
        }
        return {
            script: 'script', link: 'css', css: 'css', img: 'img', image: 'img', video: 'media', audio: 'media',
            xmlhttprequest: 'xhr', fetch: 'xhr', beacon: 'xhr', iframe: 'frame'
        }[entry.initiatorType] || 'other';
    };

    const domains = new Set();
    // Все адреса (домен + начало пути) — по ним окно узнаёт, кто следит.
    // Свои поддомены тоже: сайт может собирать статистику через них (collector.github.com)
    const requests = new Set();
    let known = navigation?.encodedBodySize || 0;
    let estimated = 0;
    let unknown = 0;
    // Сжатие текстовых файлов. Видно только там, где сайт файла это разрешил, — обычно у своих CDN
    // (github.githubassets.com); картинки, видео и шрифты сжаты сами по себе
    const encodings = {};
    const plain = new Set();
    const isText = (entry, path) => !/\.(glb|bin|wasm|zip|gz|br|zst|pdf|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp[34]|webm|ogg|m4s|ts)$/i.test(path)
        && (/\.(svg|json|xml|txt|html?)$/i.test(path) || ['script', 'css', 'xhr'].includes(kindOf(entry, path)));
    for (const entry of resources) {
        let url;
        try {
            url = new URL(entry.name);
        } catch {
            continue; // Адрес не разбирается (data:, blob:) — пропускаем
        }
        if (url.hostname && !isOwn(url.hostname)) {
            domains.add(url.hostname);
        }
        if (/^https?:$/.test(url.protocol)) {
            requests.add(url.hostname + url.pathname.slice(0, 40));
        }
        if (entry.encodedBodySize > 0) {
            known += entry.encodedBodySize;
        } else if (!entry.transferSize && !entry.decodedBodySize && entry.responseStatus !== 304) {
            // Все размеры нулевые: сайт файла не разрешил их показывать (или запрос заблокирован)
            unknown++;
            estimated += AVERAGE_SIZE[kindOf(entry, url.pathname)];
        }
        // Мелкие файлы серверы обычно не сжимают — и правильно; из кэша сжатие не видно
        if (entry.encodedBodySize > 0 && entry.decodedBodySize >= 1500
            && entry.transferSize > 0 && isText(entry, url.pathname) && 'contentEncoding' in entry) {
            const name = entry.contentEncoding && entry.contentEncoding !== 'identity' ? entry.contentEncoding : '';
            // Тип сжатия чужого файла браузер может не назвать — тогда смотрим, меньше ли он передан
            if (name || entry.encodedBodySize >= entry.decodedBodySize) {
                encodings[name] = (encodings[name] || 0) + 1;
            }
            if (!name && entry.encodedBodySize >= entry.decodedBodySize) {
                const file = url.pathname.split('/').pop() || url.pathname;
                plain.add(isOwn(url.hostname) ? file : `${url.hostname}/${file}`);
            }
        }
    }
    for (const el of document.querySelectorAll('script[src], img[src], iframe[src]')) {
        try {
            const url = new URL(el.src);
            if (/^https?:$/.test(url.protocol)) {
                requests.add(url.hostname + url.pathname.slice(0, 40));
            }
        } catch {
            // Пропускаем
        }
    }

    // Смешанный контент: страница по HTTPS подгружает файлы по HTTP
    const mixed = location.protocol === 'https:'
        ? document.querySelectorAll('script[src^="http:"], img[src^="http:"], iframe[src^="http:"], '
            + 'link[rel="stylesheet"][href^="http:"], video[src^="http:"], audio[src^="http:"], source[src^="http:"]').length
        : 0;

    return {
        protocol: navigation?.nextHopProtocol || '',
        // Файлы самого сайта по HTTP/3: браузер узнаёт о нём из первого ответа и переходит в следующих запросах
        h3Files: resources.filter((entry) => {
            try {
                return entry.nextHopProtocol === 'h3' && isOwn(new URL(entry.name).hostname);
            } catch {
                return false;
            }
        }).length,
        loadTime: navigation?.loadEventEnd > 0 ? navigation.loadEventEnd - navigation.startTime : null,
        // Документ готов (DOMContentLoaded): на случай, если какой-то файл страницы не догрузится никогда
        ready: navigation?.domContentLoadedEventEnd > 0 ? navigation.domContentLoadedEventEnd - navigation.startTime : null,
        age: performance.now(),
        timeOrigin: performance.timeOrigin,
        domains: [...domains].sort(),
        requests: [...requests].slice(0, 3000),
        weight: {
            bytes: known + estimated,
            estimated,
            files: resources.length + 1,
            unknown,
            // Буфер браузера переполнен: часть файлов не учтена
            truncated: resources.length >= 250 && resources.length % 250 === 0
        },
        encoding: {
            name: navigation?.contentEncoding || '',
            encoded: navigation?.encodedBodySize || 0,
            decoded: navigation?.decodedBodySize || 0,
            files: encodings,
            plain: [...plain].slice(0, 5)
        },
        mixed
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
 * Метка в строке подробностей
 * @param {string} text
 * @param {string} state good | warn | bad | none | '' (обычная)
 * @param {string} title
 * @param {boolean} [sure] false — определено по косвенным признакам
 * @returns {HTMLSpanElement}
 */
function chip(text, state, title, sure = true) {
    const el = document.createElement('span');
    el.className = 'chip';
    el.textContent = text;
    el.title = sure ? title : [title, t('guess')].filter(Boolean).join('\n');
    if (state) {
        el.dataset.state = state;
    }
    if (!sure) {
        el.dataset.sure = 'false';
    }
    return el;
}

/**
 * Данные из JSON в папке data/
 * @param {string} name
 * @returns {Promise<*>}
 */
async function loadData(name) {
    const response = await fetch(chrome.runtime.getURL(`data/${name}.json`));
    return response.json();
}

/**
 * Значки сайта: HTTPS, протокол, скорость, сторонние домены, вес, сжатие
 * @param {chrome.tabs.Tab} tab
 * @param {?Object} server данные расширенного режима
 * @returns {Promise<?Object>} данные страницы
 */
async function renderSite(tab, server) {
    const https = new URL(tab.url).protocol === 'https:';
    setBadge('https', https ? 'HTTPS' : 'HTTP', https ? 'good' : 'bad',
        t(https ? 'httpsOn' : 'httpsOff'));

    let info;
    try {
        // Сразу, не дожидаясь разбора страницы: нужны только замеры браузера
        [{result: info}] = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: collectPageInfo, injectImmediately: true});
    } catch {
        return null; // Страница недоступна для расширений
    }
    info.https = https;

    const protocols = {
        'h3': ['HTTP/3', 'good', t('protocolH3')],
        'h2': ['HTTP/2', 'warn', t('protocolH2')],
        'http/1.1': ['HTTP/1.1', 'bad', t('protocolOld', 'HTTP/1.1')],
        'http/1.0': ['HTTP/1.0', 'bad', t('protocolOld', 'HTTP/1.0')]
    };
    const [protocol, protocolState, protocolTitle] = protocols[info.protocol]
        || ['HTTP/?', 'none', t('protocolUnknown')];
    // Сервер умеет HTTP/3, но эта страница пришла по старому протоколу — обычно при первом заходе
    info.h3 = info.protocol === 'h3';
    if (!info.h3 && protocols[info.protocol]
        && (info.h3Files > 0 || /\bh3\b|h3=/.test(server?.headers['alt-svc'] || ''))) {
        info.h3 = true;
        setBadge('protocol', 'HTTP/3', 'good', t('protocolH3Later', protocol));
    } else {
        setBadge('protocol', protocol, protocolState, protocolTitle);
    }

    renderSpeed(info);
    if (info.loadTime === null) {
        // Окно открыли до конца загрузки: время покажем, когда страница загрузится
        const listener = async (id, change) => {
            if (id !== tab.id || change.status !== 'complete') {
                return;
            }
            chrome.tabs.onUpdated.removeListener(listener);
            try {
                const [{result}] = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: collectPageInfo});
                renderSpeed(result);
            } catch {
                // Вкладку закрыли или перешли на страницу, недоступную расширению
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    }

    const count = info.domains.length;
    const list = info.domains.slice(0, 25).join('\n') + (count > 25 ? '\n' + t('domainsMore', count - 25) : '');
    setBadge('domains', t('domains', count), count <= 5 ? 'good' : count <= 15 ? 'warn' : 'bad',
        count ? t('domainsList', list) : t('domainsNone'));

    // Вес: если размер многих файлов оценён, а не известен точно — «≈»
    const {bytes, estimated, files, unknown, truncated} = info.weight;
    const approximate = truncated || estimated > bytes * 0.2;
    const megabytes = bytes / 2 ** 20;
    setBadge('weight', (approximate ? '≈ ' : '') + formatSize(bytes),
        megabytes < 1 ? 'good' : megabytes < 3 ? 'warn' : 'bad',
        [t('weightTitle'), approximate ? t('weightEstimated', files - unknown, files) : ''].filter(Boolean).join('\n'));

    // Сжатие главного документа
    const NAMES = {br: 'Brotli', zstd: 'Zstandard', gzip: 'gzip', deflate: 'Deflate', dcb: 'Brotli', dcz: 'Zstandard'};
    const {encoded, decoded, files: encodedFiles, plain} = info.encoding;

    // Текстовые файлы: «Brotli — 14, gzip — 5, без сжатия — 2»
    const counts = {};
    for (const [key, count] of Object.entries(encodedFiles)) {
        const name = key ? NAMES[key] || key : t('compressionNone').toLocaleLowerCase(LANG);
        counts[name] = (counts[name] || 0) + count;
    }
    const total = Object.values(encodedFiles).reduce((sum, count) => sum + count, 0);
    info.plainShare = total >= 3 ? (encodedFiles[''] || 0) / total : 0;
    const filesLines = total ? [
        t('compressionFiles', Object.entries(counts).sort((a, b) => b[1] - a[1])
            .map(([name, count]) => `${name} — ${formatNumber(count)}`).join(', ')),
        plain.length ? t('compressionPlain', plain.join(', ')) : ''
    ] : [];
    const encoding = info.encoding.name || server?.headers['content-encoding'] || '';
    info.compressed = null;
    if (encoding && encoding !== 'identity') {
        const name = NAMES[encoding] || encoding;
        info.compressed = true;
        setBadge('compression', name, encoding === 'br' || encoding === 'zstd' ? 'good' : 'warn', [
            t('compressionOn', name)
            + (decoded > encoded && encoded > 0 ? ` (${t('compressionRatio', formatSize(decoded), formatSize(encoded))})` : ''),
            ...filesLines
        ].filter(Boolean).join('\n'));
    } else if (decoded > 2000) {
        info.compressed = false;
        setBadge('compression', t('compressionNone'), 'bad', [t('compressionOff'), ...filesLines].filter(Boolean).join('\n'));
    } else {
        setBadge('compression', '—', 'none', [t('compressionUnknown'), ...filesLines].filter(Boolean).join('\n'));
    }

    return info;
}

/**
 * Значок времени загрузки. Если страница так и не загрузилась целиком (счётчик или реклама грузятся
 * бесконечно), через 10 секунд показываем время готовности документа
 * @param {{loadTime: ?number, ready: ?number, age: number}} info
 */
function renderSpeed({loadTime, ready, age}) {
    const time = loadTime ?? (age > 10000 ? ready : null);
    if (time === null) {
        setBadge('speed', t('loading'), 'none', t('loadingTitle'));
        return;
    }
    const seconds = time / 1000;
    const formatted = formatNumber(seconds, {minimumFractionDigits: 1, maximumFractionDigits: 1});
    setBadge('speed', t('seconds', formatted), seconds < 2 ? 'good' : seconds < 5 ? 'warn' : 'bad',
        t(loadTime === null ? 'loadingTitle' : 'loadTime'));
}

/**
 * Значки заблокированного на вкладке
 * @param {chrome.tabs.Tab} tab
 * @param {?Object} info
 * @param {boolean} status
 * @param {?Object} server данные расширенного режима: оценка объёма заблокированного
 */
async function renderBlocked(tab, info, status, server) {
    if (!status) {
        setBadge('blocked', t('blocked', '—'), 'none', t('statusOff'));
        setBadge('trackers', t('trackers', '—'), 'none', t('statusOff'));
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
    const cookies = matched.filter((m) => m.rule.rulesetId === COOKIE_RULESET).length;
    const ads = matched.length - trackers - cookies;
    setBadge('blocked', t('blocked', matched.length), 'good', [
        t('blockedTitle', ads, trackers),
        cookies ? t('blockedCookies', cookies) : '',
        server?.bytes ? t('blockedSize', formatSize(server.bytes)) : ''
    ].filter(Boolean).join('\n'));
    setBadge('trackers', t('trackers', trackers), trackers ? 'bad' : 'good',
        trackers ? t('trackersFound', trackers) : t('trackersNone'));
}

/**
 * Совпадает ли адрес (домен + начало пути) с доменом из справочника (можно с путём: yandex.ru/ads/)
 * @param {string} key
 * @param {string} pattern
 * @returns {boolean}
 */
function matchesDomain(key, pattern) {
    const slash = key.indexOf('/');
    const host = slash < 0 ? key : key.slice(0, slash);
    const path = slash < 0 ? '/' : key.slice(slash);
    const [patternHost, ...patternPath] = pattern.split('/');
    const hostMatches = host === patternHost || host.endsWith('.' + patternHost);
    return hostMatches && (!patternPath.length || path.startsWith('/' + patternPath.join('/')));
}

/**
 * Кто следит: компании по сторонним адресам страницы
 * @param {Object} info
 * @param {?Object} server данные расширенного режима
 * @param {boolean} status
 * @returns {Promise<number>} сколько компаний найдено
 */
async function renderCompanies(info, server, status) {
    const companies = await loadData('companies');
    const blocked = Object.keys(server?.blocked || {});
    const blockedHosts = new Set(blocked.map((key) => key.split('/')[0]));
    const keys = [...new Set([...info.requests, ...blocked])];

    const found = [];
    for (const company of companies) {
        const hosts = new Set(keys
            .filter((key) => company.domains.some((d) => matchesDomain(key, d)))
            .map((key) => key.split('/')[0]));
        if (hosts.size) {
            found.push({name: company.name, hosts: [...hosts].sort()});
        }
    }

    const dd = document.getElementById('companies');
    dd.replaceChildren();
    for (const {name, hosts} of found) {
        const list = hosts.join('\n');
        if (!status) {
            dd.append(chip(name, 'bad', t('companyLoaded', list)));
        } else if (!server) {
            // Без расширенного режима не видно, прошёл запрос или нет
            dd.append(chip(name, 'warn', t('companyFound', list)));
        } else if (hosts.every((h) => blockedHosts.has(h))) {
            dd.append(chip(name, 'good', t('companyBlocked', list)));
        } else {
            dd.append(chip(name, 'bad', t('companyLoaded', list)));
        }
    }
    if (!found.length) {
        // Справочник знает не всех: трекеры на значке могут быть, а компаний из справочника — нет
        dd.append(chip(t('companiesNone'), 'none', t('companiesNoneTitle')));
    }
    return found.length;
}

/**
 * IPv4 → число, IPv6 → 32 hex-цифры (как в data/hosting.json)
 * @param {string} ip
 * @returns {number|string|null}
 */
function ipKey(ip) {
    if (!ip.includes(':')) {
        const parts = ip.split('.').map(Number);
        return parts.length === 4 ? parts.reduce((n, part) => n * 256 + part, 0) : null;
    }
    let address = ip.replace(/^\[|\]$/g, '');
    // IPv4 в хвосте IPv6 (::ffff:1.2.3.4) → две группы
    const v4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(address);
    if (v4) {
        const [a, b, c, d] = v4.slice(1).map(Number);
        address = address.slice(0, v4.index) + ((a << 8) | b).toString(16) + ':' + ((c << 8) | d).toString(16);
    }
    const [head, tail = ''] = address.split('::');
    const left = head ? head.split(':') : [];
    const right = tail ? tail.split(':') : [];
    const groups = address.includes('::')
        ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
        : left;
    return groups.map((g) => g.padStart(4, '0')).join('');
}

/**
 * Провайдер по IP: самый узкий диапазон, в который попадает адрес
 * @param {Object} hosting data/hosting.json
 * @param {string} ip
 * @returns {?{name: string, country: ?string, proxy: boolean}}
 */
function findProvider(hosting, ip) {
    const key = ipKey(ip);
    if (key === null) {
        return null;
    }
    const v6 = typeof key === 'string';
    const width = (a, b) => (v6 ? Number(BigInt('0x' + b) - BigInt('0x' + a)) : b - a);
    let best = null;
    for (const [start, end, index] of v6 ? hosting.v6 : hosting.v4) {
        if (start > key) {
            break; // Диапазоны отсортированы по началу
        }
        if (key <= end && (!best || width(start, end) < width(best[0], best[1]))) {
            best = [start, end, index];
        }
    }
    return best ? hosting.providers[best[2]] : null;
}

/**
 * Сервер: хостинг и страна по IP (расширенный режим)
 * @param {?Object} server
 * @param {boolean} extended
 */
async function renderServer(server, extended) {
    const dd = document.getElementById('server');
    dd.replaceChildren();
    if (!extended) {
        dd.append(chip(t('serverExtended'), 'none', t('extendedText')));
        return;
    }
    if (!server?.ip) {
        dd.append(chip(t('serverReload'), 'none', t('serverReloadTitle')));
        return;
    }

    const provider = findProvider(await loadData('hosting'), server.ip);
    const ipLine = t('serverIp', server.ip);
    if (!provider) {
        dd.append(chip(t('serverUnknown'), 'none', t('serverUnknownTitle') + '\n' + ipLine));
    } else if (provider.proxy) {
        dd.append(chip(provider.name, 'warn', t('serverProxy', provider.name) + '\n' + ipLine));
    } else {
        dd.append(chip(provider.name, '', t('serverHosting', provider.name) + '\n' + ipLine));
        if (provider.country) {
            // Без названий стран на языке перевода (узбекский в Яндекс Браузере) вернётся код «US» — тогда по-английски
            const name = (lang) => new Intl.DisplayNames([lang], {type: 'region'}).of(provider.country);
            const local = name(LANG);
            const country = local === provider.country ? name('en') : local;
            dd.append(chip(country, '', t('serverCountry'), false));
        }
    }
    dd.append(copyButton(server.ip));
}

/**
 * Маленькая кнопка «Копировать IP» в конце строки «Сервер»
 * @param {string} ip
 * @returns {HTMLButtonElement}
 */
function copyButton(ip) {
    const button = document.createElement('button');
    button.className = 'icon-button';
    button.type = 'button';
    button.title = t('copyIp', ip);
    button.dataset.ip = ip;
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 16 16');
    icon.innerHTML = '<rect x="5" y="5" width="9" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>'
        + '<path d="M11 3.5V3a1.5 1.5 0 0 0-1.5-1.5h-6A1.5 1.5 0 0 0 2 3v6a1.5 1.5 0 0 0 1.5 1.5H4" fill="none" stroke="currentColor" stroke-width="1.6"/>';
    button.append(icon);
    button.addEventListener('click', async () => {
        await navigator.clipboard.writeText(ip);
        button.dataset.done = '';
        button.title = t('copied');
        setTimeout(() => {
            delete button.dataset.done;
            button.title = t('copyIp', ip);
        }, 1500);
    });
    return button;
}

// Технологии по заголовкам ответа: заголовок, шаблон (версия — в первой группе), название, вид
const HEADER_TECH = [
    ['server', /nginx\/?([\d.]+)?/i, 'nginx', 'server'],
    ['server', /Angie\/?([\d.]+)?/i, 'Angie', 'server'],
    ['server', /openresty\/?([\d.]+)?/i, 'OpenResty', 'server'],
    ['server', /Tengine\/?([\d.]+)?/i, 'Tengine', 'server'],
    ['server', /Apache-Coyote|Tomcat/i, 'Tomcat', 'server'],
    ['server', /Jetty/i, 'Jetty', 'server'],
    ['server', /envoy/i, 'Envoy', 'server'],
    ['server', /Apache(?!-Coyote)\/?([\d.]+)?/i, 'Apache', 'server'],
    ['server', /LiteSpeed/i, 'LiteSpeed', 'server'],
    ['server', /Microsoft-IIS\/?([\d.]+)?/i, 'IIS', 'server'],
    ['server', /Caddy/i, 'Caddy', 'server'],
    ['server', /Kestrel/i, 'ASP.NET', 'framework'],
    ['server', /gunicorn|uvicorn/i, 'Python', 'lang'],
    // Сам github.com отвечает «github.com», сайты на GitHub Pages — «GitHub.com»
    ['server', /^GitHub\.com$/, 'GitHub Pages', 'host'],
    ['x-powered-by', /PHP\/?([\d.]+)?/i, 'PHP', 'lang'],
    ['x-powered-by', /Express/i, 'Express', 'framework'],
    ['x-powered-by', /ASP\.NET/i, 'ASP.NET', 'framework'],
    ['x-powered-by', /Next\.js/i, 'Next.js', 'framework'],
    ['x-powered-by', /Nuxt/i, 'Nuxt', 'framework'],
    ['x-powered-cms', /Bitrix/i, '1C-Bitrix', 'cms'],
    ['x-generator', /Drupal\s*(\d+)?/i, 'Drupal', 'cms'],
    ['x-drupal-cache', /./, 'Drupal', 'cms'],
    ['x-shopify-stage', /./, 'Shopify', 'cms'],
    ['x-wix-request-id', /./, 'Wix', 'cms'],
    ['x-vercel-id', /./, 'Vercel', 'host'],
    ['x-nf-request-id', /./, 'Netlify', 'host'],
    ['x-varnish', /./, 'Varnish', 'server'],
    ['via', /varnish/i, 'Varnish', 'server']
];
const TECH_ORDER = ['cms', 'framework', 'host', 'server', 'lang', 'lib'];

/**
 * На чём сделан сайт
 * @param {Object[]} detected из page/inspect.js
 * @param {?Object} server
 */
function renderTech(detected, server) {
    const tech = new Map(detected.map((item) => [item.name, item]));
    for (const [header, re, name, kind] of HEADER_TECH) {
        const match = re.exec(server?.headers[header] || '');
        if (match) {
            const prev = tech.get(name);
            tech.set(name, {name, kind, sure: true, version: prev?.version || match[1] || ''});
        }
    }

    const dd = document.getElementById('tech');
    dd.replaceChildren();
    const items = [...tech.values()]
        .sort((a, b) => TECH_ORDER.indexOf(a.kind) - TECH_ORDER.indexOf(b.kind) || b.sure - a.sure)
        .slice(0, 10);
    for (const {name, version, sure} of items) {
        dd.append(chip(version ? `${name} ${version}` : name, '', t('techFound'), sure));
    }
    if (!items.length) {
        dd.append(chip(t('techNone'), 'none', t('techNoneTitle')));
    }
}

/**
 * Для любопытных: IPv6, HSTS, HTTP/3 в Alt-Svc, смешанный контент
 * @param {Object} info
 * @param {?Object} server
 * @returns {{hsts: ?boolean}}
 */
function renderExtra(info, server) {
    const dd = document.getElementById('extra');
    dd.replaceChildren();
    let hsts = null;
    if (server?.ip) {
        const v6 = server.ip.includes(':');
        dd.append(chip(v6 ? 'IPv6' : 'IPv4', v6 ? 'good' : 'none', t(v6 ? 'ipv6' : 'ipv4')));
        if (info.https) {
            hsts = 'strict-transport-security' in server.headers;
            dd.append(chip('HSTS', hsts ? 'good' : 'bad', t(hsts ? 'hstsOn' : 'hstsOff')));
        }
    }
    if (info.mixed) {
        dd.append(chip(t('mixed', info.mixed), 'bad', t('mixedTitle', info.mixed)));
    }
    const empty = !dd.childElementCount;
    dd.hidden = empty;
    document.getElementById('extra-label').hidden = empty;
    return {hsts};
}

/**
 * Время: 340 мс, 1,8 с
 * @param {number} ms
 * @returns {string}
 */
function formatTime(ms) {
    return Math.round(ms / 10) * 10 < 1000
        ? formatNumber(Math.round(ms / 10) * 10, {style: 'unit', unit: 'millisecond', unitDisplay: 'short'})
        : formatNumber(ms / 1000, {style: 'unit', unit: 'second', unitDisplay: 'short', maximumFractionDigits: 1});
}

/**
 * Блок «Подробнее»: метрики скорости Google, SEO, вёрстка, доступность, заголовки безопасности.
 * Строка — название, значение и цвет; пояснение — при наведении. Замечания — жёлтые и красные строки
 * @param {?Object} audit результат page/audit.js
 * @param {?Object} server данные расширенного режима
 * @param {boolean} extended
 */
function renderAudit(audit, server, extended) {
    const body = document.getElementById('audit-body');
    body.replaceChildren();
    if (!audit) {
        return;
    }
    const grade = (value, good, poor) => (value <= good ? 'good' : value <= poor ? 'warn' : 'bad');
    const yes = t('auditYes');
    const no = t('auditNo');

    let group = null;
    const section = (key) => {
        group = document.createElement('div');
        group.className = 'audit-group';
        const title = document.createElement('h3');
        title.textContent = t(key);
        group.append(title);
        body.append(group);
    };
    // key — строки auditKey (название) и auditKeyHint (пояснение) в переводах
    const row = (key, value, state, sure = true) => {
        const el = document.createElement('div');
        el.className = 'audit-row';
        el.dataset.state = state;
        const name = key.startsWith('auditCustom:') ? key.slice(12) : t(key);
        const hint = key.startsWith('auditCustom:') ? '' : t(key + 'Hint');
        el.title = sure ? hint : [hint, t('guess')].filter(Boolean).join('\n');
        if (!sure) {
            el.dataset.sure = 'false';
        }
        el.dataset.note = `${name}: ${value}`;
        el.dataset.hint = hint;
        const label = document.createElement('span');
        label.textContent = name;
        const result = document.createElement('b');
        result.textContent = value;
        el.append(label, result);
        group.append(el);
        return el;
    };
    const time = (key, ms, good, poor) => row(key, ms === null ? '—' : formatTime(ms), ms === null ? 'none' : grade(ms, good, poor));

    // Пороги — как у Google (web.dev/vitals)
    const {vitals, seo, markup, a11y} = audit;
    section('auditSpeed');
    time('auditTtfb', vitals.ttfb, 800, 1800);
    time('auditFcp', vitals.fcp, 1800, 3000);
    time('auditLcp', vitals.lcp, 2500, 4000);
    row('auditCls', vitals.cls === null ? '—' : formatNumber(vitals.cls, {maximumFractionDigits: 2}),
        vitals.cls === null ? 'none' : grade(vitals.cls, 0.1, 0.25));
    if (vitals.inp === null) {
        row('auditInp', t('auditNoInput'), 'none');
    } else {
        time('auditInp', vitals.inp, 200, 500);
    }
    row('auditBlocking', formatNumber(vitals.blocking), vitals.blockingScripts || vitals.blocking > 15 ? 'warn' : 'good');
    // Кэш: браузера (видно всегда) или сервера и CDN (по заголовкам, в расширенном режиме). Не замечание
    const CACHE_HEADERS = [['cf-cache-status', 'Cloudflare'], ['x-cache-status', 'nginx'], ['x-proxy-cache', 'nginx'],
        ['x-fastcgi-cache', 'nginx'], ['x-srcache-fetch-status', 'nginx'], ['x-cache', '']];
    const [cacheHeader, cacheSource] = CACHE_HEADERS.find(([header]) => server?.headers[header]) || [];
    if (vitals.browserCache) {
        row('auditCache', t('auditCacheBrowser'), 'none');
    } else if (cacheHeader) {
        const value = server.headers[cacheHeader];
        const hit = /\bhit\b/i.test(value);
        row('auditCache', (/\b(hit|miss|expired|stale|bypass|dynamic|updating|revalidated)\b/i.exec(value)?.[1] || value)
            .toUpperCase() + (cacheSource ? ` · ${cacheSource}` : ''), hit ? 'good' : 'none');
    }

    section('auditSeo');
    if (seo.status) {
        row('auditStatus', String(seo.status), seo.status >= 400 ? 'bad' : seo.status >= 300 ? 'warn' : 'good');
    }
    row('auditTitle', seo.title ? t('auditLength', formatNumber(seo.title)) : no,
        !seo.title ? 'bad' : seo.title < 10 || seo.title > 70 ? 'warn' : 'good');
    row('auditDescription', seo.description ? t('auditLength', formatNumber(seo.description)) : no,
        !seo.description || seo.description < 50 || seo.description > 170 ? 'warn' : 'good');
    row('auditH1', formatNumber(seo.h1), seo.h1 === 0 ? 'warn' : seo.h1 === 1 ? 'good' : 'none');
    row('auditCanonical', {same: yes, other: t('auditOtherHost'), '': no}[seo.canonical],
        {same: 'good', other: 'warn', '': 'none'}[seo.canonical]);
    row('auditOg', seo.ogTitle && seo.ogImage ? yes : seo.ogTitle ? t('auditNoImage') : no,
        seo.ogTitle && seo.ogImage ? 'good' : 'warn');
    row('auditViewport', seo.viewport ? yes : no, seo.viewport ? 'good' : 'warn');

    // Роботы и ИИ: то, о чём часто не знают — robots.txt, карта сайта, правила для нейросетей, llms.txt
    section('auditBots');
    const robots = seo.robots;
    // X-Robots-Tag: «noindex», «googlebot: noindex», но не «max-image-preview:none»
    const noindex = seo.noindex || (server?.headers['x-robots-tag'] || '').split(',')
        .some((value) => /^\s*(?:(?!max-|unavailable_after)[\w-]+\s*:\s*)?(noindex|none)\s*$/i.test(value));
    const denied = [noindex ? 'noindex' : '', robots?.blocked ? 'robots.txt' : ''].filter(Boolean).join(', ');
    row('auditNoindex', denied || no, denied ? 'bad' : 'good');
    // Сайт не ответил вовремя: файла может и не быть, но замечанием это не считаем
    const unchecked = audit.unchecked || {};
    if (unchecked.robots) {
        row('auditRobots', '—', 'none');
    } else {
        row('auditRobots', robots ? yes : no, robots ? 'good' : 'warn');
    }
    if (robots) {
        row('auditSitemap', robots.sitemap ? yes : no, robots.sitemap ? 'good' : 'none');
        // Считаем только ботов, названных по имени: «User-agent: *» закрывает сайт всем, а не именно ИИ
        const blockedBots = robots.aiBlocked;
        const ai = row('auditAi', blockedBots.length ? t('auditAiBlocked', formatNumber(blockedBots.length))
            : robots.aiNamed ? t('auditAiAllowed') : robots.closed ? t('auditAiAll') : t('auditAiNone'), 'none');
        if (blockedBots.length) {
            ai.title += '\n' + blockedBots.join(', ');
        }
    }
    row('auditLlms', unchecked.llms ? '—' : seo.llms ? yes : no, seo.llms ? 'good' : 'none');

    section('auditMarkup');
    row('auditDoctype', markup.quirks ? no : yes, markup.quirks ? 'bad' : 'good');
    row('auditNoSize', formatNumber(markup.noSize), markup.noSize ? 'warn' : 'good');
    row('auditLarge', formatNumber(markup.large), markup.large ? 'warn' : 'good');
    // Формат картинок: в расширенном режиме — настоящий тип из ответа сервера (imagor и CDN отдают WebP
    // и по адресу name.jpg); без него — что сообщит браузер, а для чужих картинок — по расширению
    const types = server?.images || {};
    const raster = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    const known = raster.reduce((sum, type) => sum + (types[type] || 0), 0);
    const [modern, typed, sure] = known >= 3
        ? [(types['image/webp'] || 0) + (types['image/avif'] || 0), known, true]
        : [markup.modern, markup.typed, markup.guessed === 0];
    if (typed >= 3) {
        row('auditModern', t('auditModernValue', formatNumber(modern), formatNumber(typed)),
            modern / typed >= 0.5 ? 'good' : 'warn', sure);
    }

    section('auditA11y');
    row('auditLang', a11y.lang || no, a11y.lang ? 'good' : 'warn');
    row('auditAlt', formatNumber(a11y.alt), a11y.alt ? 'warn' : 'good');
    row('auditLabels', formatNumber(a11y.labels), a11y.labels ? 'warn' : 'good');
    row('auditNames', formatNumber(a11y.names), a11y.names ? 'warn' : 'good');
    row('auditMain', a11y.main ? yes : no, a11y.main ? 'good' : 'warn');
    if (seo.viewport) {
        row('auditZoom', seo.zoomOff ? yes : no, seo.zoomOff ? 'bad' : 'good');
    }

    section('auditSecurity');
    const security = audit.security;
    if (!extended || !server) {
        row('auditCustom:CSP, X-Frame-Options, Permissions-Policy…', t(extended ? 'serverReload' : 'serverExtended'), 'none');
    } else {
        const headers = server.headers;
        const csp = [headers['content-security-policy'], security.csp].filter(Boolean).join(';');
        // 'unsafe-inline' без nonce и hash разрешает любой встроенный скрипт — от XSS такая политика не спасает
        const scripts = /(?:^|;)\s*script-src([^;]*)/i.exec(csp)?.[1] ?? /(?:^|;)\s*default-src([^;]*)/i.exec(csp)?.[1] ?? '';
        const weak = /'unsafe-inline'/i.test(scripts) && !/'nonce-|'sha(256|384|512)-|'strict-dynamic'/i.test(scripts);
        row('auditCsp', !csp ? no : weak ? t('auditCspWeak') : yes, !csp ? 'warn' : weak ? 'warn' : 'good');
        const nosniff = /nosniff/i.test(headers['x-content-type-options'] || '');
        row('auditNosniff', nosniff ? yes : no, nosniff ? 'good' : 'warn');
        const frame = 'x-frame-options' in headers || /frame-ancestors/i.test(csp);
        row('auditFrame', frame ? yes : no, frame ? 'good' : 'warn');
        row('auditReferrer', 'referrer-policy' in headers ? yes : no, 'referrer-policy' in headers ? 'good' : 'none');
        row('auditPermissions', 'permissions-policy' in headers ? yes : no, 'permissions-policy' in headers ? 'good' : 'none');
        row('auditCoop', 'cross-origin-opener-policy' in headers ? yes : no, 'cross-origin-opener-policy' in headers ? 'good' : 'none');
        // Версии ПО в заголовках: не уязвимость, но подсказка атакующему
        const versions = ['server', 'x-powered-by', 'x-powered-cms']
            .map((header) => headers[header] || '')
            .filter((value) => /\d+\.\d+/.test(value));
        row('auditVersions', versions.length ? versions.join(', ') : t('auditHidden'), versions.length ? 'warn' : 'good');
    }
    row('auditSession', security.sessionCookies.length ? security.sessionCookies.join(', ') : no,
        security.sessionCookies.length ? 'warn' : 'good', !security.sessionCookies.length);
    row('auditSecurityTxt', unchecked.securityTxt ? '—' : security.securityTxt ? yes : no, security.securityTxt ? 'good' : 'none');

    const issues = body.querySelectorAll('.audit-row[data-state="warn"], .audit-row[data-state="bad"]').length;
    const counter = document.getElementById('audit-issues');
    counter.textContent = issues ? t('auditIssues', formatNumber(issues)) : t('auditNoIssues');
    counter.dataset.state = body.querySelector('.audit-row[data-state="bad"]') ? 'bad' : issues ? 'warn' : 'good';
    document.getElementById('audit').hidden = false;
}

/**
 * Балл за сжатие: главная страница, а если больше 20% текстовых файлов без сжатия — не выше половины.
 * Brotli или gzip — неважно: разница в размере небольшая
 * @param {Object} info
 * @returns {number|undefined}
 */
function compressionScore(info) {
    const files = info.plainShare > 0.2 ? 0.5 : 1;
    if (info.compressed === null) {
        return info.plainShare ? files : undefined;
    }
    return info.compressed ? files : 0;
}

/**
 * Оценка сайта по 10-балльной шкале: среднее взвешенное по показателям.
 * Показатели, которые не удалось узнать, не учитываются
 * @param {Object} info
 * @param {number} companies
 * @param {?boolean} hsts
 * @param {?Object} vitals метрики скорости из page/audit.js
 * @returns {Array<[string, number]>} показатели: название, баллы из 10
 */
function renderScore(info, companies, hsts, vitals) {
    const step = (value, limits, points) => points[limits.findIndex((limit) => value <= limit)] ?? points[points.length - 1];
    const parts = [
        ['scoreHttps', info.https ? 1 : 0, 3],
        ['scoreProtocol', info.h3 ? 1 : {'h2': 0.8, 'http/1.1': 0.3, 'http/1.0': 0.2}[info.protocol], 1],
        // Скорость — по отрисовке главного блока (LCP), как у Google; если её нет — по полной загрузке
        ['scoreSpeed', vitals?.lcp != null ? step(vitals.lcp / 1000, [1.5, 2.5, 4, 6], [1, 0.85, 0.5, 0.25, 0.1])
            : info.loadTime === null ? undefined : step(info.loadTime / 1000, [1, 2, 3, 5], [1, 0.85, 0.65, 0.4, 0.15]), 2],
        ['scoreCls', vitals?.cls != null ? step(vitals.cls, [0.1, 0.25], [1, 0.5, 0.1]) : undefined, 1],
        ['scoreWeight', step(info.weight.bytes / 2 ** 20, [0.5, 1, 2, 3, 5], [1, 0.85, 0.7, 0.5, 0.3, 0.1]), 1.5],
        ['scoreTrackers', step(companies, [0, 1, 2, 4, 7], [1, 0.8, 0.65, 0.45, 0.25, 0.1]), 2.5],
        ['scoreDomains', step(info.domains.length, [5, 15, 30], [1, 0.6, 0.35, 0.15]), 1],
        ['scoreCompression', compressionScore(info), 0.5],
        ['scoreHsts', hsts === null ? undefined : hsts ? 1 : 0.3, 0.5],
        ['scoreMixed', info.mixed ? 0.2 : 1, 1]
    ].filter(([, value]) => value !== undefined);

    const total = parts.reduce((sum, [, value, weight]) => sum + value * weight, 0);
    const weights = parts.reduce((sum, [, , weight]) => sum + weight, 0);
    let score = Math.round((total / weights) * 100) / 10;
    // Без шифрования сайт не может быть хорошим
    if (!info.https) {
        score = Math.min(score, 4);
    }

    const el = document.getElementById('score');
    el.dataset.state = score >= 7.5 ? 'good' : score >= 5 ? 'warn' : 'bad';
    const formatted = formatNumber(score, {minimumFractionDigits: 1, maximumFractionDigits: 1});
    document.getElementById('score-value').textContent = formatted;
    for (const [i, segment] of [...document.querySelectorAll('#meter i')].entries()) {
        segment.classList.toggle('on', i < Math.round(score));
    }
    el.title = [
        t('scoreTitle', formatted),
        ...parts.map(([key, value]) => `${t(key)}: ${formatNumber(Math.round(value * 10))}`),
        info.loadTime === null ? t('loadingTitle') : ''
    ].filter(Boolean).join('\n');
    return parts.map(([key, value]) => [t(key), Math.round(value * 10)]);
}

/**
 * Файл расширения → data: URL (картинка в SVG не может ссылаться на файлы)
 * @param {string} src
 * @returns {Promise<string>}
 */
async function toDataUrl(src) {
    const blob = await (await fetch(src)).blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

/**
 * Картинка с отчётом о сайте: домен, дата, значки, оценка по показателям и подробности.
 * Подсказки на картинке не видны — пояснения к проблемам выписываются списком.
 * Рисуется через SVG foreignObject: стили окна те же, сторонние библиотеки не нужны
 * @param {string} host
 * @param {Array<[string, number]>} parts показатели оценки: название, баллы из 10
 * @returns {Promise<Blob>}
 */
async function renderReport(host, parts) {
    const make = (tag, className, text) => {
        const el = document.createElement(tag);
        el.className = className;
        if (text) {
            el.textContent = text;
        }
        return el;
    };

    const sheet = make('div', 'sheet');
    const head = make('div', 'sheet-head');
    head.append(make('b', '', host),
        make('span', '', new Date().toLocaleString(LANG, {dateStyle: 'medium', timeStyle: 'short'})));

    const panel = document.getElementById('panel').cloneNode(true);
    for (const img of panel.querySelectorAll('img')) {
        img.src = await toDataUrl(img.src);
    }
    const score = document.getElementById('score').cloneNode(true);
    score.querySelector('#clear').remove();
    const scoreParts = make('div', 'sheet-parts');
    for (const [name, points] of parts) {
        const el = chip(`${name} ${formatNumber(points)}`, points >= 8 ? 'good' : points >= 5 ? 'warn' : 'bad', '');
        scoreParts.append(el);
    }

    const details = document.getElementById('details').cloneNode(true);
    const copy = details.querySelector('#server .icon-button');
    copy?.replaceWith(chip(copy.dataset.ip, 'none', ''));

    // Пояснения к тому, что можно улучшить (в окне они в подсказках)
    const notes = make('ul', 'sheet-notes');
    const problems = [...panel.querySelectorAll(':is(#https, #protocol, #compression)[data-state="bad"]'),
        ...details.querySelectorAll('#extra .chip:is([data-state="bad"], [data-state="warn"])')];
    for (const text of new Set(problems.map((el) => el.title.split('\n')[0]).filter(Boolean))) {
        notes.append(make('li', '', text));
    }
    // Замечания из «Подробнее»: название и значение жирным, дальше пояснение
    for (const el of document.querySelectorAll('#audit .audit-row:is([data-state="bad"], [data-state="warn"])')) {
        const li = make('li', '');
        // Значение может само кончаться точкой («186 симв.») — вторую не ставим
        const dot = /[.!?…]$/.test(el.dataset.note) ? ' ' : '. ';
        li.append(make('b', '', el.dataset.note), el.dataset.hint ? dot + el.dataset.hint : '');
        notes.append(li);
    }

    const legendText = [details.querySelector('[data-sure="false"]') ? t('reportLegendGuess') : '',
        /≈/.test(panel.textContent) ? t('reportLegendEstimate') : ''].filter(Boolean).join(' · ');
    const legend = legendText ? make('div', 'sheet-legend', legendText) : null;
    const foot = make('div', 'sheet-foot');
    foot.append(make('span', '', 'ABlock'), make('span', '', 'github.com/arhone/ablock'));

    sheet.append(head, panel, score, scoreParts, details);
    if (notes.childElementCount) {
        sheet.append(notes);
    }
    if (legend) {
        sheet.append(legend);
    }
    sheet.append(foot);

    // Размер — по раскладке в самом окне, за его пределами
    sheet.style.cssText = 'position: fixed; left: -10000px; top: 0';
    document.body.append(sheet);
    const width = sheet.offsetWidth;
    const height = sheet.offsetHeight;
    sheet.remove();
    sheet.removeAttribute('style');

    // Тема та же, что у окна
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const style = document.createElement('style');
    style.textContent = [...document.styleSheets[0].cssRules].map((rule) => rule.cssText).join('\n')
        .replace('@media (prefers-color-scheme: dark)', dark ? '@media all' : '@media not all');
    // Картинка рисуется вне окна: язык и направление письма задаём явно
    const root = document.createElement('div');
    root.lang = LANG;
    root.dir = document.documentElement.dir;
    root.append(style, sheet);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
        + `<foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(root)}</foreignObject></svg>`;

    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await image.decode();
    const scale = 2; // Чёткость на экранах с высокой плотностью
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Отчёт о сайте текстом — для Telegram, VK и буфера обмена.
 * Ссылки «поделиться» передают только текст: картинку туда без своего сервера не отправить
 * @param {string} host
 * @param {boolean} [short] коротко — для X
 * @returns {string}
 */
function reportText(host, short = false) {
    // У скорости и веса в значке одно число — добавляем, что это
    const labels = {speed: 'scoreSpeed', weight: 'scoreWeight'};
    const text = (el) => (labels[el.id] ? t(labels[el.id]) + ' ' : '') + el.textContent
        + (el.dataset.sure === 'false' ? '?' : '');
    const marks = {good: '✅', warn: '⚠️', bad: '❌'};
    const items = [...document.querySelectorAll('#https, #protocol, #speed, #weight, #domains, #compression, #extra .chip')];
    const lines = [t('reportShareHead', host, document.getElementById('score-value').textContent)];
    for (const [state, mark] of Object.entries(marks)) {
        const list = items.filter((el) => el.dataset.state === state).map(text);
        if (list.length) {
            lines.push(`${mark} ${list.join(', ')}`);
        }
    }
    for (const [label, id] of [['serverLabel', 'server'], ['techLabel', 'tech'], ['companiesLabel', 'companies']]) {
        const list = [...document.querySelectorAll(`#${id} .chip`)].map(text);
        if (list.length) {
            lines.push(`${t(label)}: ${list.join(', ')}`);
        }
    }
    if (short) {
        // X: не больше 280 знаков вместе со ссылкой — только оценка и итоги по значкам
        let text = lines.slice(0, 4).join('\n');
        while (text.length > 230 && text.includes('\n')) {
            text = text.slice(0, text.lastIndexOf('\n'));
        }
        return text;
    }
    lines.push('', t('reportShareFoot'));
    return lines.join('\n');
}

/**
 * «Поделиться» отчётом о сайте: картинка (в буфер, файлом, системным меню) или текст (Telegram, VK, буфер)
 * @param {string} host
 * @param {Array<[string, number]>} parts
 */
function setupReport(host, parts) {
    let image = null;
    const getImage = () => (image ||= renderReport(host, parts));
    const fileName = `ablock-${host}-${new Date().toISOString().slice(0, 10)}.png`;
    // Иконка ненадолго подсвечивается, подсказка сообщает результат и затем возвращается
    const done = (button, key) => {
        const title = button.dataset.title ??= button.title;
        clearTimeout(button.doneTimer);
        button.dataset.done = '';
        button.title = t(key);
        button.doneTimer = setTimeout(() => {
            delete button.dataset.done;
            button.title = title;
        }, 1500);
    };

    const menu = document.getElementById('share-menu');
    document.getElementById('share').addEventListener('click', () => {
        menu.hidden = !menu.hidden;
    });

    const copyImage = document.getElementById('share-image');
    copyImage.addEventListener('click', async () => {
        // Буфер — сразу в обработчике нажатия, пока браузер разрешает; картинка дорисуется
        await navigator.clipboard.write([new ClipboardItem({'image/png': getImage()})]);
        done(copyImage, 'copied');
    });

    const save = document.getElementById('share-save');
    save.addEventListener('click', async () => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(await getImage());
        link.download = fileName;
        link.click();
        done(save, 'reportDone');
    });

    // Соцсети языка окна по порядку; текст собирается при нажатии: к этому времени страница могла догрузиться
    const box = document.querySelector('.networks');
    for (const id of NETWORKS_BY_LANG[LANG] || NETWORKS_BY_LANG[LANG.split('-')[0]] || NETWORKS_BY_LANG.en) {
        const network = NETWORKS[id];
        const link = box.querySelector(`[data-network="${id}"]`);
        link.title = [
            t(network.kind === 'send' ? 'shareSend' : 'sharePost', network.name),
            t(network.linkOnly ? 'shareLinkOnly' : 'shareAsText')
        ].join('\n');
        link.addEventListener('click', () => {
            const text = reportText(host, network.short || network.title);
            link.href = network.url(STORE_URL, network.title ? text.split('\n')[0] : text);
        });
        link.hidden = false;
        box.append(link);
    }
    const copyText = document.getElementById('share-text');
    copyText.addEventListener('click', async () => {
        await navigator.clipboard.writeText(`${reportText(host)} ${STORE_URL}`);
        done(copyText, 'copied');
    });

    // Системное меню «Поделиться» с файлом: Windows, macOS, ChromeOS (на Linux его нет)
    const system = document.getElementById('share-system');
    system.hidden = !navigator.canShare?.({files: [new File([''], fileName, {type: 'image/png'})]});
    system.addEventListener('click', async () => {
        const file = new File([await getImage()], fileName, {type: 'image/png'});
        await navigator.share({files: [file], text: `${reportText(host)} ${STORE_URL}`}).catch(() => null);
    });

    document.getElementById('report').hidden = false;
}

/**
 * Корзина у оценки: удаляет всё, что браузер хранит для сайта, и перезагружает страницу —
 * значки и оценка покажут сайт таким, каким его видит новый посетитель.
 * Первое нажатие просит подтверждения: человек выйдет из аккаунта на сайте
 * @param {chrome.tabs.Tab} tab
 */
function setupClear(tab) {
    const button = document.getElementById('clear');
    const text = document.getElementById('clear-text');
    let timer = 0;
    const reset = () => {
        delete button.dataset.confirm;
        text.hidden = true;
    };

    button.addEventListener('click', async () => {
        if (!('confirm' in button.dataset)) {
            button.dataset.confirm = '';
            text.hidden = false;
            timer = setTimeout(reset, 4000);
            return;
        }
        clearTimeout(timer);
        reset();

        // Окно обновится, когда страница загрузится заново
        chrome.tabs.onUpdated.addListener((id, change) => {
            if (id === tab.id && change.status === 'complete') {
                setTimeout(() => location.reload(), 1000);
            }
        });

        // Удаляет sw.js. Разрешение необязательное — запрашивается при первом удалении; окно может
        // закрыться, пока открыт запрос, поэтому sw.js доделает удаление сам, когда разрешение появится
        const clear = {tabId: tab.id, url: tab.url};
        if (await chrome.permissions.contains({permissions: ['browsingData']})) {
            button.disabled = true;
            await chrome.runtime.sendMessage({clear});
            return;
        }
        await chrome.storage.session.set({aBlockClear: {...clear, time: Date.now()}});
        if (await chrome.permissions.request({permissions: ['browsingData']})) {
            button.disabled = true;
        } else {
            await chrome.storage.session.remove('aBlockClear');
        }
    });
}

/**
 * Статистика за всё время (расширенный режим)
 * @param {?Object} stats
 */
function renderStats(stats) {
    // От миллиона — сокращённо: «1,2 млн», «3,4 млрд», чтобы строка не росла с годами
    const requests = stats?.requests || 0;
    document.getElementById('stats-text').textContent = t('stats',
        formatNumber(requests, requests >= 1e6 ? {notation: 'compact', maximumFractionDigits: 1} : {}),
        formatSize(stats?.bytes || 0));
    document.getElementById('stats').title = t('statsTitle',
        new Date(stats?.since || Date.now()).toLocaleDateString(LANG));
}

/**
 * Просьба о поддержке: один раз, пока её не закрыли или не перешли по ссылке.
 * Всё считается в браузере, наружу ничего не уходит
 * @param {?Object} stats Статистика расширенного режима, null без него
 */
async function renderAsk(stats) {
    const {aBlockAsked, aBlockInstalled} = await chrome.storage.local.get(['aBlockAsked', 'aBlockInstalled']);
    if (!DONATE_URL || aBlockAsked) {
        return;
    }
    let text;
    if (stats) {
        if ((stats.requests || 0) < ASK_REQUESTS) {
            return;
        }
        text = t('askStats', formatNumber(stats.requests), formatSize(stats.bytes || 0));
    } else {
        if (!aBlockInstalled || Date.now() - aBlockInstalled < ASK_DAYS * 86400000) {
            return;
        }
        text = t('askTime');
    }
    const ask = document.getElementById('ask');
    document.getElementById('ask-text').textContent = text;
    const link = document.getElementById('ask-donate');
    link.href = DONATE_URL;
    const done = () => {
        ask.hidden = true;
        return chrome.storage.local.set({aBlockAsked: Date.now()});
    };
    // Новая вкладка закрывает окно: сначала запоминаем, потом открываем
    link.addEventListener('click', async (event) => {
        event.preventDefault();
        await done();
        chrome.tabs.create({url: DONATE_URL});
    });
    document.getElementById('ask-close').addEventListener('click', done);
    ask.hidden = false;
}

document.addEventListener('DOMContentLoaded', async function () {

    await loadLocale();
    translatePage();
    initLanguage();

    const donate = document.getElementById('donate');
    donate.href = DONATE_URL;
    donate.hidden = !DONATE_URL;

    const bg = document.getElementById('bg');
    const label = document.getElementById('status');

    // Текущие настройки (по умолчанию всё включено)
    const {aBlockStorage, aBlockSettings, aBlockAllowed} = await chrome.storage.local.get(
        ['aBlockStorage', 'aBlockSettings', 'aBlockAllowed']);
    let status = aBlockStorage?.status ?? true;

    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const isSite = /^https?:/.test(tab?.url || '');

    // Защита на этом сайте: отключена для него самого или для домена, в который он входит
    const host = isSite ? new URL(tab.url).hostname.replace(/^www\./, '') : '';
    let allowedEntry = (aBlockAllowed || []).find((h) => host === h || host.endsWith('.' + h));
    // Защита действует на этой странице
    const active = () => status && !allowedEntry;

    // Отображает статус
    function render() {
        bg.dataset.status = String(active());
        label.dataset.status = String(active());
        label.textContent = t(!status ? 'statusOff' : allowedEntry ? 'statusSiteOff' : 'statusOn');
    }
    render();

    // Для IP-адресов не показываем: правила браузера задаются по доменам
    const siteRow = document.getElementById('site-row');
    const site = document.getElementById('site');
    if (host) {
        setupNote(host);
    }
    siteRow.hidden = !host || /^[\d.]+$|:|^\[/.test(host);
    site.checked = !allowedEntry;
    document.getElementById('site-text').textContent = t('siteLabel', allowedEntry || host);

    /**
     * Включает или отключает защиту на этом сайте и перезагружает страницу: правила действуют на новые запросы.
     * Окно обновится вслед за страницей
     * @param {boolean} enabled
     */
    async function setSite(enabled) {
        site.disabled = true;
        const saved = await chrome.runtime.sendMessage({site: allowedEntry || host, enabled}).catch(() => false);
        if (saved !== true) {
            // Фоновый скрипт не сохранил настройку (например, старая версия после обновления файлов)
            site.checked = !allowedEntry;
            site.disabled = false;
            return;
        }
        allowedEntry = enabled ? undefined : allowedEntry || host;
        site.checked = enabled;
        render();
        chrome.tabs.onUpdated.addListener((id, change) => {
            if (id === tab.id && change.status === 'complete') {
                setTimeout(() => location.reload(), 1000);
            }
        });
        await chrome.tabs.reload(tab.id);
    }
    site.addEventListener('change', () => setSite(site.checked));

    const cookies = document.getElementById('cookies');
    cookies.checked = aBlockSettings?.cookies ?? true;
    cookies.addEventListener('change', () => chrome.runtime.sendMessage({cookies: cookies.checked}));

    // Инкогнито: расширение не может включить его себе само — открываем свою страницу в настройках браузера,
    // где переключатель сразу на виду. Галочка видна, пока доступа нет
    const incognito = document.getElementById('incognito');
    chrome.extension.isAllowedIncognitoAccess().then((allowed) => {
        document.getElementById('incognito-row').hidden = allowed;
    });
    incognito.addEventListener('click', (event) => {
        event.preventDefault();
        // В Яндекс Браузере разрешение для инкогнито есть только в списке дополнений
        const yandex = navigator.userAgentData?.brands.some((b) => b.brand === 'YaBrowser');
        chrome.tabs.create({url: yandex ? 'browser://tune/' : `chrome://extensions/?id=${chrome.runtime.id}`});
    });

    document.body.classList.remove('loading');

    let info = null;
    let server = null; // Данные расширенного режима о вкладке

    // Нажатие на кнопку. Если защита отключена только на этом сайте — щит возвращает её сайту
    document.getElementById('button').addEventListener('click', function () {
        if (status && allowedEntry) {
            setSite(true);
            return;
        }
        status = !status;
        render();
        chrome.runtime.sendMessage({status});
        if (isSite) {
            renderBlocked(tab, info, active(), server);
        }
    });

    // Расширенный режим: включение или статистика
    const extended = await chrome.permissions.contains(EXTENDED);
    document.getElementById('extended').hidden = extended;
    // Выключение — внизу «Подробнее»: заголовки, хостинг и статистика пропадут, доступ ко всем сайтам будет снят
    document.getElementById('audit-foot').hidden = !extended;
    // Без расширенного режима баннеры не прячутся, а сервисы баннеров блокируются всегда — переключать нечего
    document.getElementById('cookies-row').hidden = !extended;
    document.getElementById('extended-off').addEventListener('click', async () => {
        if (await chrome.permissions.remove(EXTENDED).catch(() => false)) {
            location.reload();
        }
    });
    document.getElementById('extended-button').addEventListener('click', async () => {
        // Окно может закрыться, пока открыт запрос разрешения, — остальное сделает sw.js
        if (await chrome.permissions.request(EXTENDED)) {
            location.reload();
        }
    });
    if (extended) {
        const response = await chrome.runtime.sendMessage({tabInfo: tab?.id ?? -1}).catch(() => null);
        renderStats(response?.stats);
        document.getElementById('stats').hidden = false;
        renderAsk(response?.stats || {}).catch(console.error);
        // Данные относятся к этой странице, а не к предыдущей на вкладке
        if (isSite && response?.tab?.host === new URL(tab.url).hostname) {
            server = response.tab;
        }
    } else {
        renderAsk(null).catch(console.error);
    }

    // Значки и подробности только для обычных сайтов
    if (!isSite) {
        return;
    }
    // Движок и аудит смотрят разметку: браузер выполнит их, когда страница разберётся (на медленной — через
    // несколько секунд). Значки, блокировки и компании показываем, не дожидаясь их
    const techResult = chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['page/inspect.js'], world: 'MAIN'})
        .then(([{result}]) => result || [])
        .catch(() => []);
    const auditResult = chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['page/audit.js']})
        .then(([{result}]) => result || null)
        .catch(() => null);
    info = await renderSite(tab, server);
    if (!info) {
        return; // Страница недоступна для расширений (магазин, настройки)
    }
    await renderBlocked(tab, info, active(), server);
    const companies = await renderCompanies(info, server, active());
    await renderServer(server, extended);
    const {hsts} = renderExtra(info, server);
    document.getElementById('details').hidden = false;

    const [tech, audit] = await Promise.all([techResult, auditResult]);
    renderTech(tech, server);
    renderAudit(audit, server, extended);
    const parts = renderScore(info, companies, hsts, audit?.vitals);
    document.getElementById('score').hidden = false;
    setupReport(new URL(tab.url).hostname, parts);
    setupClear(tab);

});
