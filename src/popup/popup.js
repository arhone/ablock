/* global CompanyOwner */
// Наборы правил с трекерами и окнами про cookie, остальные считаем рекламой
const TRACKER_RULESETS = ['trackers', 'easyprivacy', 'rus-1'];
const COOKIE_RULESET = 'annoyances-cookies';

// Расширенный режим: доступ ко всем сайтам (см. sw.js)
const EXTENDED = {permissions: ['webRequest'], origins: ['<all_urls>']};

const STORE_URL = 'https://chromewebstore.google.com/detail/cmbihlcgenpbmdkipolfghkplheignfe';

// Куда поделиться отчётом или самим расширением: ссылка из адреса расширения в магазине (link) и текста (text).
// kind: send — мессенджер, post — лента; short — короткий текст (лимит X), title — только первая строка,
// linkOnly — сервис берёт только ссылку, текст не передать
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

// Одноразовые просьбы (renderNotices): оценить в магазине — через столько дней после установки,
// поддержать — через столько дней после того, как закрыли просьбу оценить. В расширенном режиме просьба поддержать
// называет число заблокированного, если его набралось столько (статистика идёт с включения режима)
const RATE_DAYS = 30;
const ASK_DAYS = 90;
const ASK_REQUESTS = 30000;

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
    const {aBlockLang} = await chrome.storage.local.get('aBlockLang').catch(() => ({}));
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
    chrome.storage.local.get('aBlockLang').catch(() => ({})).then(({aBlockLang}) => {
        select.value = LOCALES.includes(aBlockLang) ? aBlockLang : '';
    });
    select.addEventListener('change', async () => {
        await chrome.storage.local.set({aBlockLang: select.value});
        location.reload();
    });
}

// Тема окна по системе; выбранная в окне светлая или тёмная хранится в aBlockTheme
const systemDark = matchMedia('(prefers-color-scheme: dark)');
// Правило тёмной темы в popup.css: его условие подменяется, когда тема выбрана вручную
const darkRule = [...document.styleSheets[0].cssRules].find((rule) => rule.conditionText?.includes('prefers-color-scheme'));
const darkCondition = darkRule.conditionText;
let theme = null;

/**
 * Включает тему: 'light', 'dark' или null — как в системе
 * @param {?string} value
 */
function applyTheme(value) {
    theme = value === 'light' || value === 'dark' ? value : null;
    darkRule.media.mediaText = theme ? (theme === 'dark' ? 'all' : 'not all') : darkCondition;
    // Полосы прокрутки, списки и галочки — в цвет темы
    document.documentElement.style.colorScheme = theme || '';
}

/**
 * Тёмная ли тема сейчас
 * @returns {boolean}
 */
function isDark() {
    return theme ? theme === 'dark' : systemDark.matches;
}

// Тема до первой отрисовки, чтобы окно не мигало
chrome.storage.local.get('aBlockTheme').catch(() => ({})).then(({aBlockTheme}) => applyTheme(aBlockTheme));

/**
 * Кнопка темы: переключает светлую и тёмную. Совпавшая с системной тема не запоминается —
 * окно снова следует за системой
 */
function initTheme() {
    const button = document.getElementById('theme');
    const render = () => {
        button.dataset.dark = String(isDark());
        button.title = t(isDark() ? 'themeLight' : 'themeDark');
    };
    // Тема браузера — для цвета счётчика на иконке (воркер её не видит)
    const report = () => chrome.runtime.sendMessage({dark: systemDark.matches}).catch(() => {});
    render();
    report();
    systemDark.addEventListener('change', () => {
        render();
        report();
    });
    chrome.storage.local.get('aBlockTheme').catch(() => ({})).then(({aBlockTheme}) => {
        applyTheme(aBlockTheme);
        render();
    });
    button.addEventListener('click', () => {
        const dark = !isDark();
        applyTheme(dark === systemDark.matches ? null : (dark ? 'dark' : 'light'));
        render();
        if (theme) {
            chrome.storage.local.set({aBlockTheme: theme});
        } else {
            chrome.storage.local.remove('aBlockTheme');
        }
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
    setBadge('blocked', t('ads', '—'), 'none', '');
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
    const stored = await chrome.storage.local.get('aBlockNotes').catch(() => null);
    // Заметка неизвестна — не даём случайно стереть её через пустую форму
    if (!stored) {
        return;
    }
    const {aBlockNotes} = stored;
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

    // Смешанный контент: страница по HTTPS подгружает файлы по HTTP. Скрипты, стили и фреймы (активный)
    // браузер блокирует — страница ломается; картинки и медиа (пассивный) Chrome сам переводит на HTTPS
    const https = location.protocol === 'https:';
    const mixed = https
        ? document.querySelectorAll('script[src^="http:"], iframe[src^="http:"], link[rel="stylesheet"][href^="http:"]').length
        : 0;
    const mixedPassive = https
        ? document.querySelectorAll('img[src^="http:"], video[src^="http:"], audio[src^="http:"], source[src^="http:"]').length
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
        mixed,
        mixedPassive
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
    // С клавиатуры — только значки с пояснением (setupTips); пустые «—» Tab пропускает
    if (title) {
        badge.tabIndex = 0;
    } else {
        badge.removeAttribute('tabindex');
    }
    fitBadges();
}

/**
 * Длинный перевод («Verkkotunnukset 10», «Ohne Komprimierung») не должен выталкивать значки за окно.
 * Длинные подписи теперь с обеих сторон щита («Домены» слева, «Реклама» и «Трекеры» справа), поэтому сначала
 * значки ближе к щиту и с полями уже (#panel.tight). Если и так ряд шире окна, у самого широкого значка шрифт
 * на полпикселя меньше (не мельче 9,5px), затем перенос по пробелу (и снова до 9,5px). Слова не рвутся:
 * если и так не влезает, нужен перевод покороче. Обычные значки не меняются
 */
function fitBadges() {
    const panel = document.getElementById('panel');
    const badges = [...panel.querySelectorAll('.badge')];
    for (const badge of badges) {
        badge.removeAttribute('style');
    }
    const overflows = () => panel.scrollWidth > panel.clientWidth + 0.5;
    panel.classList.remove('tight');
    if (overflows()) {
        panel.classList.add('tight');
    }
    // Перенесённый значок занимает всю колонку: при равной ширине колонку держит тот, что в одну строку
    const width = (badge) => badge.offsetWidth - (badge.style.whiteSpace === 'normal' ? 0.5 : 0);
    const left = new Set(badges);
    while (overflows() && left.size) {
        const widest = [...left].reduce((a, b) => (width(b) > width(a) ? b : a));
        const size = parseFloat(getComputedStyle(widest).fontSize);
        const wraps = widest.style.whiteSpace === 'normal';
        if (size > 9.5) {
            widest.style.fontSize = `${size - 0.5}px`;
        } else if (!wraps) {
            widest.style.whiteSpace = 'normal';
            widest.style.removeProperty('font-size');
        } else {
            left.delete(widest);
        }
    }
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
    if (el.title) {
        el.tabIndex = 0; // Пояснение — и с клавиатуры (setupTips)
    }
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
 * Каталог остаётся данными расширения; аудит запускается в документе bootstrap.
 * @param {number} tabId
 * @returns {Promise<?chrome.scripting.InjectionResult>}
 */
async function runAudit(tabId) {
    let tokens = null;
    try {
        const catalog = await loadData('ai-bots');
        const seen = new Set();
        if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.bots)) {
            throw new Error('catalog');
        }
        tokens = catalog.bots.flatMap((bot) => ['tokens', 'unverifiedTokens'].flatMap((key) => bot[key].map((token) => {
            if (!/^[a-z0-9-]{1,80}$/i.test(bot.id) || !/^[a-z0-9_-]{1,80}$/i.test(token) || seen.has(token.toLowerCase())) {
                throw new Error('token');
            }
            seen.add(token.toLowerCase());
            return {id: bot.id, token, status: key === 'tokens' ? 'verified' : 'unverified'};
        })));
        if (tokens.length > 128) {
            tokens = null;
        }
    } catch {
        tokens = null;
    }
    const [bootstrap] = await chrome.scripting.executeScript({target: {tabId}, world: 'ISOLATED',
        func: (tokens) => {
            globalThis.__ablockAuditAi = tokens ? {tokens, timeOrigin: performance.timeOrigin} : null;
        }, args: [tokens]});
    if (!bootstrap?.documentId) {
        return null;
    }
    const [injection] = await chrome.scripting.executeScript({target: {tabId, documentIds: [bootstrap.documentId]},
        files: ['page/audit.js'], world: 'ISOLATED'});
    return injection?.documentId === bootstrap.documentId ? injection : null;
}

/**
 * Принимаем аудит только для документа исходного снимка и всё ещё открытого документа.
 * Повторная короткая инъекция не читает DOM и не ждёт загрузки. Ошибка доступа — отказ.
 * @param {number} tabId
 * @param {?chrome.scripting.InjectionResult} injection
 * @param {Object} info
 * @returns {Promise<?Object>}
 */
async function acceptAudit(tabId, injection, info) {
    const audit = injection?.result;
    const context = audit?.causes?.context;
    if (!info.documentId || injection?.documentId !== info.documentId
        || audit?.causes?.version !== 1 || context?.scope !== 'top-document'
        || !Number.isFinite(context.timeOrigin) || context.timeOrigin !== info.timeOrigin) {
        return null;
    }
    let timer;
    try {
        // 400 мс дают проверке время на короткую занятость страницы, но не задерживают весь отчёт надолго.
        const [current] = await Promise.race([
            chrome.scripting.executeScript({
                target: {tabId}, func: () => performance.timeOrigin, injectImmediately: true
            }),
            new Promise((resolve) => { timer = setTimeout(() => resolve([]), 400); })
        ]);
        return current?.documentId === injection.documentId && current.result === context.timeOrigin ? audit : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Значки сайта: HTTPS, протокол, скорость, сторонние домены, вес, сжатие
 * @param {chrome.tabs.Tab} tab
 * @param {?Object} server данные расширенного режима
 * @param {Function} [onLoadTime] страница догрузилась после открытия окна: info.loadTime уже обновлён
 * @returns {Promise<?Object>} данные страницы
 */
async function renderSite(tab, server, onLoadTime) {
    const https = new URL(tab.url).protocol === 'https:';
    setBadge('https', https ? 'HTTPS' : 'HTTP', https ? 'good' : 'bad',
        t(https ? 'httpsOn' : 'httpsOff'));

    let info;
    let documentId;
    try {
        // Сразу, не дожидаясь разбора страницы: нужны только замеры браузера
        [{result: info, documentId}] = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: collectPageInfo, injectImmediately: true});
    } catch {
        return null; // Страница недоступна для расширений
    }
    info.documentId = documentId;
    info.https = https;

    const protocols = {
        'h3': ['HTTP/3', 'good', t('protocolH3')],
        'h2': ['HTTP/2', 'good', t('protocolH2')],
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
        // Окно открыли до конца загрузки: время покажем, когда страница загрузится, а если она не загрузится
        // никогда (счётчик или реклама грузятся бесконечно) — время готовности документа через 10 секунд
        let timer = 0;
        let attempts = 0;
        // Ответ на более ранний замер может прийти позже нового — показываем только последний
        let seq = 0;
        let done = false;
        const listener = (id, change) => {
            if (id === tab.id && change.status === 'complete') {
                refresh();
            }
        };
        const stop = () => {
            done = true;
            clearTimeout(timer);
            chrome.tabs.onUpdated.removeListener(listener);
        };
        const refresh = async () => {
            clearTimeout(timer);
            const n = ++seq;
            let result;
            try {
                [{result}] = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: collectPageInfo});
            } catch {
                stop(); // Вкладку закрыли или перешли на страницу, недоступную расширению
                return;
            }
            if (done || n !== seq) {
                return;
            }
            renderSpeed(result);
            if (result.loadTime !== null) {
                stop();
                info.loadTime = result.loadTime;
                onLoadTime?.();
            } else if (++attempts < 8) {
                // Ещё грузится (complete мог и не прийти): замер тяжёлый, поэтому всё реже и не больше 8 попыток
                timer = setTimeout(refresh, Math.max(10000 - result.age, 1000 * attempts) + 100);
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
        timer = setTimeout(refresh, Math.max(10000 - info.age, 1000) + 100);
    }

    // Сайты и CDN той же компании (githubassets.com у github.com, userapi.com у vk.com) — не сторонние
    const host = new URL(tab.url).hostname;
    const owner = (await loadData('companies')).find((company) => CompanyOwner.find(host, [company], ['sites']));
    if (owner) {
        info.domains = info.domains.filter((domain) => !owner.sites.some((d) => matchesDomain(domain, d)));
    }
    const count = info.domains.length;
    const list = info.domains.slice(0, 25).join('\n') + (count > 25 ? '\n' + t('domainsMore', count - 25) : '');
    setBadge('domains', t('domains', count), count <= 5 ? 'good' : count <= 15 ? 'warn' : 'bad',
        count ? t('domainsList', list) : t('domainsNone'));

    // Вес: если размер многих файлов оценён, а не известен точно — «≈»
    const {bytes, estimated, files, unknown, truncated} = info.weight;
    const approximate = truncated || estimated > bytes * 0.2;
    // Цвет — по тому же округлённому числу, что на значке: «2 МБ» не должно быть жёлтым
    const megabytes = Math.round(bytes / 2 ** 20 * 10) / 10;
    const weightTitle = [t('weightTitle'), approximate ? t('weightEstimated', files - unknown, files) : '']
        .filter(Boolean).join('\n');
    setBadge('weight', (approximate ? '≈\u00a0' : '') + formatSize(bytes),
        megabytes <= 2 ? 'good' : megabytes <= 5 ? 'warn' : 'bad', weightTitle);
    // Строку о заблокированном добавляет renderBlocked — при каждом нажатии на щит заново от этой основы
    document.getElementById('weight').dataset.base = weightTitle;

    // Сжатие главного документа
    const NAMES = {br: 'Brotli', zstd: 'Zstandard', gzip: 'gzip', deflate: 'Deflate', dcb: 'Brotli', dcz: 'Zstandard'};
    const {encoded, decoded, files: encodedFiles, plain} = info.encoding;

    // Текстовые файлы: «Brotli — 14, gzip — 5, без сжатия — 2»
    const counts = {};
    for (const [key, count] of Object.entries(encodedFiles)) {
        // «multiple» — так браузер пишет про файл, сжатый несколькими способами подряд
        const name = !key ? t('compressionNoneInline')
            : key === 'multiple' ? t('compressionMultipleInline') : NAMES[key] || key;
        counts[name] = (counts[name] || 0) + count;
    }
    const total = Object.values(encodedFiles).reduce((sum, count) => sum + count, 0);
    info.plainShare = total >= 3 ? (encodedFiles[''] || 0) / total : 0;
    const filesLines = total ? [
        t('compressionFiles', Object.entries(counts).sort((a, b) => b[1] - a[1])
            .map(([name, count]) => `${name} — ${formatNumber(count)}`).join(', ')),
        plain.length ? t('compressionPlain', plain.join(', ')) : ''
    ] : [];
    // Из заголовка — если браузер не назвал сжатие или при нескольких написал «multiple». Повторы склеены
    // через запятую («gzip, br»): сжатия применены по порядку, последнее — то, в котором пришёл документ.
    // Пустые значения пропускаем, регистр не важен («BR» — тоже Brotli)
    const encoding = ((info.encoding.name !== 'multiple' && info.encoding.name)
        || (server?.headers['content-encoding'] || '').split(',').map((s) => s.trim()).filter(Boolean).at(-1)
        || info.encoding.name).toLowerCase();
    info.compressed = null;
    if (encoding && encoding !== 'identity') {
        // «multiple» без заголовка (не расширенный режим): сжатие есть, но каким способом пришёл документ,
        // неизвестно — нейтрально, не хвалим и не ругаем
        const multiple = encoding === 'multiple';
        const name = multiple ? t('compressionMultiple') : NAMES[encoding] || encoding;
        info.compressed = true;
        setBadge('compression', name, multiple ? 'none' : encoding === 'br' || encoding === 'zstd' ? 'good' : 'warn', [
            t('compressionOn', multiple ? t('compressionMultipleInline') : name)
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
 * @returns {boolean} время показано (полной загрузки или готовности документа)
 */
function renderSpeed({loadTime, ready, age}) {
    const time = loadTime ?? (age >= 10000 ? ready : null);
    if (time === null) {
        setBadge('speed', t('loading'), 'none', t('loadingTitle'));
        return false;
    }
    const seconds = time / 1000;
    const formatted = formatNumber(seconds, {minimumFractionDigits: 1, maximumFractionDigits: 1});
    setBadge('speed', t('seconds', formatted), seconds < 2 ? 'good' : seconds < 5 ? 'warn' : 'bad',
        t(loadTime === null ? 'loadingTitle' : 'loadTime'));
    return true;
}

// Только локальные списки: это принадлежность домена к списку, не причина конкретной блокировки.
let blockedTrackerDomains;
async function blockedDomainTitles(server) {
    if (!server) {
        return [t('blockedDomainsExtended'), t('blockedDomainsExtended')];
    }
    try {
        blockedTrackerDomains ??= Promise.all(chrome.runtime.getManifest().declarative_net_request.rule_resources
            .filter((set) => TRACKER_RULESETS.includes(set.id))
            .map(async (set) => {
                const response = await fetch(chrome.runtime.getURL(set.path));
                if (!response.ok) {
                    throw new Error('Tracker rules unavailable');
                }
                return {id: set.id, rules: await response.json()};
            }));
        const [sets, enabled] = await Promise.all([blockedTrackerDomains,
            chrome.declarativeNetRequest.getEnabledRulesets()]);
        const domains = new Set(sets.filter((set) => enabled.includes(set.id))
            .flatMap((set) => set.rules.filter((rule) => rule.action.type === 'block')
                .flatMap((rule) => rule.condition.requestDomains || [])));
        const hosts = new Map();
        for (const [key, count] of Object.entries(server.blocked || {})) {
            const host = key.split('/')[0];
            hosts.set(host, (hosts.get(host) || 0) + count);
        }
        const groups = [[], []];
        for (const [host, count] of hosts) {
            let domain = host;
            while (domain && !domains.has(domain)) {
                const dot = domain.indexOf('.');
                domain = dot < 0 ? '' : domain.slice(dot + 1);
            }
            groups[domain ? 1 : 0].push([host, count]);
        }
        return groups.map((group, i) => {
            if (!group.length) {
                return '';
            }
            group.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
            return [t(i ? 'blockedTrackerDomains' : 'blockedOtherDomains'),
                ...group.slice(0, 8).map(([host, count]) => `${host} — ${formatNumber(count)}`),
                group.length > 8 ? t('blockedDomainsMore', formatNumber(group.length - 8)) : ''
            ].filter(Boolean).join('\n');
        });
    } catch {
        blockedTrackerDomains = undefined; // Ошибка чтения не должна скрыть прежние счётчики.
        return [t('blockedDomainsUnavailable'), t('blockedDomainsUnavailable')];
    }
}

/**
 * Значки заблокированного на вкладке. В подсказке «Реклама» в расширенном режиме и объём: его считает sw.js
 * по webRequest, без расширенного режима объёма нет
 * @param {chrome.tabs.Tab} tab
 * @param {?Object} info
 * @param {boolean} status
 * @param {?Object} server данные расширенного режима: оценка объёма заблокированного
 */
async function renderBlocked(tab, info, status, server) {
    // Подсказка веса: основа из renderSite и, если что-то заблокировано, строка об этом
    const weight = document.getElementById('weight');
    const setWeightTitle = (blocked) => {
        if (weight.dataset.base !== undefined) {
            weight.title = [weight.dataset.base, blocked ? t('weightBlocked') : ''].filter(Boolean).join('\n');
        }
    };
    setWeightTitle(false);
    if (!status) {
        setBadge('blocked', t('ads', '—'), 'none', t('statusOff'));
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

    const [adDomains, trackerDomains] = await blockedDomainTitles(server);
    const trackers = matched.filter((m) => TRACKER_RULESETS.includes(m.rule.rulesetId)).length;
    const cookies = matched.filter((m) => m.rule.rulesetId === COOKIE_RULESET).length;
    const ads = matched.length - trackers - cookies;
    setBadge('blocked', t('ads', formatNumber(ads + cookies)), 'good', [
        t('blockedTitle', ads),
        cookies ? t('blockedCookies', cookies) : '',
        server?.bytes ? t('blockedSize', formatSize(server.bytes)) : '',
        adDomains
    ].filter(Boolean).join('\n'));
    // Трекеры заблокированы: сайт пытался следить, но защита это остановила — жёлтый, а не красный
    setBadge('trackers', t('trackers', trackers), trackers ? 'warn' : 'good',
        [trackers ? t('trackersFound', trackers) : t('trackersNone'), trackerDomains].filter(Boolean).join('\n'));
    // Заблокированное не загрузилось — без защиты страница весила бы больше
    setWeightTitle(ads || trackers);
}

/**
 * Совпадает ли адрес (домен + начало пути) с доменом из справочника (можно с путём: yandex.ru/ads/)
 * @param {string} key
 * @param {string} pattern
 * @returns {boolean}
 */
function matchesDomain(key, pattern) {
    return CompanyOwner.matches(key, pattern);
}

/**
 * Кто следит: компании по сторонним адресам страницы. Состояние — как у метки: загружено (или защита выключена) —
 * bad, без расширенного режима не видно, заблокировано ли, — warn, всё заблокировано — good
 * @param {Object} info
 * @param {?Object} server данные расширенного режима
 * @param {boolean} status
 * @returns {Promise<Array<{name: string, hosts: string[], state: string}>>}
 */
async function findCompanies(info, server, status) {
    const companies = await loadData('companies');
    const blocked = Object.keys(server?.blocked || {});
    const blockedHosts = new Set(blocked.map((key) => key.split('/')[0]));
    const keys = [...new Set([...info.requests, ...blocked])];

    const found = [];
    for (const company of companies) {
        const hosts = [...new Set(keys
            .filter((key) => company.domains.some((d) => matchesDomain(key, d)))
            .map((key) => key.split('/')[0]))].sort();
        if (hosts.length) {
            const state = !status ? 'bad' : !server ? 'warn' : hosts.every((h) => blockedHosts.has(h)) ? 'good' : 'bad';
            found.push({name: company.name, hosts, state});
        }
    }
    return found;
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
        // Повторы склеены через запятую («GitHub.com, GitHub.com»): каждое значение проверяем отдельно,
        // иначе не совпадут шаблоны на всю строку. Версия — из последнего подходящего
        const match = (server?.headers[header] || '').split(',').map((value) => re.exec(value.trim())).findLast(Boolean);
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
 * Для любопытных: IPv6 (расширенный режим). HSTS и смешанный контент — в разделе «Безопасность»
 * @param {?Object} server
 */
function renderExtra(server) {
    const dd = document.getElementById('extra');
    dd.replaceChildren();
    if (server?.ip) {
        const v6 = server.ip.includes(':');
        dd.append(chip(v6 ? 'IPv6' : 'IPv4', v6 ? 'good' : 'none', t(v6 ? 'ipv6' : 'ipv4')));
    }
    const empty = !dd.childElementCount;
    dd.hidden = empty;
    document.getElementById('extra-label').hidden = empty;
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
 * Время причин с точностью до ms; положительное меньше 1 не превращаем в ноль.
 * @param {?number} value
 * @returns {string}
 */
function formatCauseTime(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return '—';
    }
    const ms = formatNumber(value > 0 && value < 1 ? 1 : Math.round(value),
        {style: 'unit', unit: 'millisecond', unitDisplay: 'short', maximumFractionDigits: 0});
    return value > 0 && value < 1 ? `<${ms}` : ms;
}

/**
 * Сдвиги и источники максимальной серии; величина принадлежит сдвигу, не каждому узлу.
 * geometry содержит только подписи и числа; компонент изолирует числовые группы как LTR.
 * @param {?Object} section
 * @returns {Array<{label: string, value: string, geometry?: Array<{label: string, value: string}>}>}
 */
function formatClsCauses(section) {
    const data = section?.data;
    if (!data) {
        return [];
    }
    const items = [{label: t('causeClsTitle'), value: t('causeClsScope')}];
    const number = (value) => typeof value === 'number' && Number.isFinite(value)
        ? formatNumber(value, {maximumFractionDigits: 3}) : '—';
    const rect = (value) => value
        ? `${number(value.x)}, ${number(value.y)} · ${number(value.width)}×${number(value.height)} px` : '—';
    const tagKeys = {
        p: 'causeClsParagraph', img: 'kindImage', video: 'kindVideo', iframe: 'causeClsFrame',
        div: 'causeClsBlock', section: 'causeClsBlock', article: 'causeClsBlock', main: 'causeClsBlock',
        header: 'causeClsBlock', footer: 'causeClsBlock', aside: 'causeClsBlock', nav: 'causeClsBlock',
        a: 'causeClsLink', button: 'causeClsButton', ul: 'causeClsList', ol: 'causeClsList', dl: 'causeClsList',
        table: 'causeClsTable'
    };
    const elementName = (tag) => {
        const key = /^h[1-6]$/.test(tag) ? 'causeClsHeading'
            : Object.hasOwn(tagKeys, tag) ? tagKeys[tag] : null;
        return key ? t(key) : tag || t('causeClsUnavailable');
    };
    if (data.session) {
        items.push({label: t('causeClsSession'), value: `${formatCauseTime(data.session.startTime)} – ${formatCauseTime(data.session.endTime)} · ${number(data.value)}`});
    } else {
        items.push({label: t('causeClsSession'), value: t('auditDetailsEmpty')});
    }
    for (const shift of data.shifts || []) {
        items.push({label: t('causeClsShift'), value: `${formatCauseTime(shift.startTime)} · ${number(shift.value)}`});
        if (!shift.sources?.length) {
            items.push({label: t('causeElement'), value: t('causeClsUnavailable')});
        }
        for (const source of shift.sources || []) {
            items.push({label: elementName(source.element?.tag),
                geometry: [{label: t('causeClsBefore'), value: rect(source.previousRect)},
                    {label: t('causeClsAfter'), value: rect(source.currentRect)}],
                value: source.imageWithoutDimensions === true ? t('causeClsImageGuess') : ''});
        }
    }
    items.push({label: t('auditDetails'), value: t('causeClsCapture')});
    return items;
}

/**
 * Переведённые факты LCP/TTFB для общего компонента. Неизвестное показываем «—»,
 * причины не создают строк оценки и не попадают в экспорт. Неизвестные коды не выводим сырыми.
 * @param {string} key
 * @param {?Object} section
 * @returns {Array<{label: string, value: string}>}
 */
function formatLoadCauses(key, section) {
    const data = section?.data;
    if (!data || !['lcp', 'ttfb'].includes(key)) {
        return [];
    }
    const items = [];
    const add = (label, value) => items.push({label: t(label), value});
    const time = formatCauseTime;
    const phases = key === 'lcp' ? {
        ttfb: 'auditTtfb', resourceLoadDelay: 'causeLoadDelay', resourceLoadDuration: 'causeLoadDuration', elementRenderDelay: 'causeRenderDelay'
    } : {
        redirect: 'causeRedirect', dns: 'causeDns', connection: 'causeConnection', tls: 'causeTls',
        requestWait: 'causeRequestWait', unaccounted: 'causeUnaccounted'
    };
    if (key === 'lcp') {
        add('causeElement', [data.element?.tag, data.kind === 'text' ? t('causeText')
            : data.kind === 'image' ? t('kindImage') : ''].filter(Boolean).join(' · ') || '—');
    }
    for (const [name, label] of Object.entries(phases)) {
        if (key === 'lcp' && data.kind === 'text' && ['resourceLoadDelay', 'resourceLoadDuration'].includes(name)) {
            continue; // У текстового LCP нет фазы загрузки картинки, нули не придумываем.
        }
        add(label, time(data.phases?.[name]));
    }
    if (key === 'lcp') {
        if (data.longestPhase && phases[data.longestPhase]) {
            add('causeLongest', t(phases[data.longestPhase]));
        }
        if (data.resourceUrl) {
            add('causeResource', data.resourceUrl);
        }
        if (data.kind === 'image') {
            const attributes = data.attributes || {};
            add('causeImageHints', [attributes.loading && `loading=${attributes.loading}`,
                attributes.fetchPriority && `fetchpriority=${attributes.fetchPriority}`].filter(Boolean).join('; ') || '—');
            add('causePreload', data.preload === true ? t('auditYes') : data.preload === false ? t('auditNo') : '—');
        }
    } else {
        if (data.browserCache === true) {
            add('auditCache', t('auditCacheBrowser'));
        }
        if (data.workerStart > 0) {
            add('causeWorker', t('auditYes'));
        }
        if (section.reasons.includes('interim-response')) {
            add('causeInterim', time(data.firstInterimResponseStart));
        }
        if (data.finalResponseHeadersStart !== null) {
            add('causeFinalHeaders', time(data.finalResponseHeadersStart));
        }
        for (const entry of data.serverTiming || []) {
            add('causeServerTiming', [entry.name, time(entry.duration), entry.description].filter(Boolean).join(' · '));
        }
    }
    if (section.reasons.some((code) => ['prerender', 'history-navigation'].includes(code))) {
        add('auditDetails', t('causeSpecialNavigation'));
    }
    add('auditDetails', t('causeScope'));
    return items;
}

/**
 * Атрибуция браузера по владельцам источников, без вывода о причинах задержки.
 * Суммы относятся только к сохранённым записям self; кадры считаются отдельно.
 * @param {?Object} section
 * @param {Array<Object>} catalog полный справочник, не список найденных трекеров
 * @param {string} documentUrl безопасный адрес снимка
 * @returns {{value: string, items: Array<Object>, notes: string[], section: ?Object}}
 */
function formatLoafCauses(section, catalog = [], documentUrl = '') {
    const data = section?.data;
    const groups = new Map();
    const pageOwner = CompanyOwner.find(documentUrl, catalog, ['sites'])?.company;
    const page = CompanyOwner.normalize(documentUrl);
    for (const script of data?.scripts || []) {
        const address = script.kind === 'url' ? CompanyOwner.normalize(script.url) : null;
        const owner = address ? CompanyOwner.find(script.url, catalog)?.company : null;
        const own = address && (address.host === page?.host || (owner && owner === pageOwner));
        // Источники одной компании могут быть собственными и сторонними: суммы разделяем.
        const key = owner ? `company:${catalog.indexOf(owner)}:${Boolean(own)}`
            : own ? 'own' : address ? `host:${address.host}` : `kind:${script.kind}`;
        const label = owner ? owner.name + (own ? ` · ${t('loafOwn')}` : '')
            : own ? t('loafOwn') : script.kind === 'inline' ? t('loafInline')
                : t('loafUnknown') + (address ? ` · ${address.host}` : '');
        let group = groups.get(key);
        if (!group) {
            group = {label, duration: 0};
            groups.set(key, group);
        }
        group.duration = group.duration === null || typeof script.duration !== 'number'
            || !Number.isFinite(script.duration) || script.duration < 0 ? null : group.duration + script.duration;
    }
    const sorted = [...groups.values()].sort((a, b) => (b.duration ?? -1) - (a.duration ?? -1));
    const limited = sorted.length > 20;
    const partial = section?.status === 'partial' || section?.truncated || limited;
    const total = sorted.reduce((sum, item) => sum === null || item.duration === null ? null : sum + item.duration, 0);
    const notes = [t('auditLoafHint'), `${t('loafBlocking')}: ${formatCauseTime(data?.blockingDuration)}`];
    if (limited) {
        notes.push(t('loafLimited'));
    }
    if (data?.excludedScripts?.count > 0 || section?.reasons?.includes('scripts-excluded')) {
        notes.push(t('loafExcluded'));
    }
    const empty = !data?.availableFrames ? t('loafEmpty') : t('auditDetailsEmpty');
    return {
        value: !['ok', 'partial'].includes(section?.status) || !data
            ? t(section?.status === 'unsupported' ? 'loafUnsupported' : 'loafUnavailable')
            : partial ? t('auditDetailsPartial') : !data.availableFrames ? empty : sorted.length ? formatCauseTime(total) : '—',
        items: sorted.slice(0, 20).map(({label, duration}) => ({label, value: formatCauseTime(duration)})),
        notes: sorted.length ? notes : [...notes, empty],
        section: limited ? {...section, truncated: true} : section
    };
}

/**
 * Разделы под табло оценки: строки по группам оценки (приватность, скорость, безопасность, SEO, доступность)
 * и «Роботы и ИИ» без оценки. Строка — название, значение и цвет; пояснение — при наведении.
 * Замечания — жёлтые и красные строки. Балл группы в заголовке раздела ставит renderScore
 * @param {?Object} audit результат page/audit.js
 * @param {?Object} server данные расширенного режима
 * @param {boolean} extended
 * @param {Object} info данные страницы (collectPageInfo)
 * @param {Array<{name: string, hosts: string[], state: string}>} companies кто следит
 * @param {Array<Object>} [catalog] полный справочник владельцев источников
 * @returns {Map<string, {name: string, state: string}>} строки по ключам — для оценки
 */
function renderAudit(audit, server, extended, info, companies, catalog = []) {
    const body = document.getElementById('audit-body');
    // «О сайте» — в разметке, остальное — заново
    for (const el of [...body.children].filter((el) => el.id !== 'about')) {
        el.remove();
    }
    const rows = new Map();
    const grade = (value, good, poor) => (value <= good ? 'good' : value <= poor ? 'warn' : 'bad');
    const yes = t('auditYes');
    const no = t('auditNo');

    let group = null;
    // scored — группа оценки: в заголовке будет её балл
    const section = (key, scored) => {
        group = document.createElement('div');
        group.className = 'audit-group';
        const title = document.createElement('h3');
        if (scored) {
            group.dataset.group = scored;
            title.className = 'scored';
            const name = document.createElement('span');
            name.textContent = t(key);
            title.append(name);
        } else {
            title.textContent = t(key);
        }
        group.append(title);
        body.append(group);
    };
    // key — строки auditKey (название) и auditKeyHint (пояснение) в переводах; name и hint — свои, more — ещё
    // строки подсказки, которые не нужны в пояснениях картинки отчёта
    const row = (key, value, state, sure = true, {name, hint, more} = {}) => {
        const el = document.createElement('div');
        el.className = 'audit-row';
        el.dataset.state = state;
        el.dataset.key = key;
        const custom = key.startsWith('auditCustom:');
        name ??= custom ? key.slice(12) : t(key);
        hint ??= custom ? '' : t(key + 'Hint');
        el.title = [hint, more, sure ? '' : t('guess')].filter(Boolean).join('\n');
        if (el.title) {
            el.tabIndex = 0;
        }
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
        const causeKey = {auditLcp: 'lcp', auditCls: 'cls', auditTtfb: 'ttfb'}[key];
        if (causeKey && audit?.causes?.version === 1) {
            renderAuditCauses(el, audit.causes[causeKey], causeKey === 'cls' ? formatClsCauses(audit.causes.cls)
                : formatLoadCauses(causeKey, audit.causes[causeKey]));
        }
        rows.set(key, {name, state});
        return el;
    };
    const time = (key, ms, good, poor) => row(key, ms === null ? '—' : formatTime(ms), ms === null ? 'none' : grade(ms, good, poor));

    // Приватность: компании из справочника и сторонние домены — с теми же цветами, что у меток
    section('auditPrivacy', 'privacy');
    const names = companies.map((company) => company.name);
    const tracking = row('auditTracking', names.length ? names.slice(0, 3).join(', ')
        + (names.length > 3 ? ` +${formatNumber(names.length - 3)}` : '') : no,
    companies.some((company) => company.state === 'bad') ? 'bad' : names.length ? 'warn' : 'good', true, {
        name: t('scoreTrackers'),
        more: names.length
            ? ['bad', 'warn', 'good'].map((state) => companies.filter((company) => company.state === state))
                .filter((list) => list.length)
                .map((list) => t({bad: 'companyLoaded', warn: 'companyFound', good: 'companyBlocked'}[list[0].state],
                    list.map((company) => `${company.name}: ${company.hosts.join(', ')}`).join('\n')))
                .join('\n')
            : t('companiesNoneTitle')
    });
    // В тексте и на картинке отчёта — все компании, а не первые три
    tracking.dataset.names = names.join(', ');
    if (names.length > 3) {
        tracking.dataset.note = `${t('scoreTrackers')}: ${tracking.dataset.names}`;
    }
    const domains = info.domains.length;
    row('auditDomains', formatNumber(domains), domains <= 5 ? 'good' : domains <= 15 ? 'warn' : 'bad', true, {
        name: t('scoreDomains'),
        more: domains ? t('domainsList', info.domains.slice(0, 25).join('\n')
            + (domains > 25 ? '\n' + t('domainsMore', domains - 25) : '')) : ''
    });

    // Пороги — как у Google (web.dev/vitals)
    const {vitals, seo, markup, a11y} = audit || {};
    if (audit) {
        section('auditSpeed', 'speed');
        if (audit.causes?.version === 1) {
            const loaf = formatLoafCauses(audit.causes.loaf, catalog, audit.causes.context?.documentUrl);
            const el = row('auditLoaf', loaf.value, 'none');
            renderAuditCauses(el, loaf.section, loaf.items, loaf.notes);
        }
        time('auditTtfb', vitals.ttfb, 800, 1800);
        time('auditFcp', vitals.fcp, 1800, 3000);
        time('auditLcp', vitals.lcp, 2500, 4000);
        row('auditCls', vitals.cls === null ? '—' : formatNumber(vitals.cls, {maximumFractionDigits: 2}),
            vitals.cls === null ? 'none' : grade(vitals.cls, 0.1, 0.25));
        // Действия были, но все быстрее 104 мс — браузер их не сохранил: точного числа нет, но это хорошо.
        // Браузер отбросил часть событий — INP не знаем: «—» и в пояснении, что данные неполные
        let inpRow;
        if (vitals.inpPartial) {
            inpRow = row('auditInp', '—', 'none');
            inpRow.title = inpRow.dataset.hint = `${inpRow.dataset.hint}\n${t('auditInpPartial')}`;
        } else if (vitals.inpFast) {
            inpRow = row('auditInp', t('auditInpFast', formatTime(100)), 'good');
        } else if (vitals.inp === null) {
            row('auditInp', t('auditNoInput'), 'none');
        } else {
            inpRow = time('auditInp', vitals.inp, 200, 500);
        }
        // Перцентиль отбросил медленные действия или данные неполные — самое медленное известное называем
        // в пояснении (и в картинке «Поделиться»), если оно на вид не совпадает с показанным значением
        const slowest = vitals.inpMax === null ? '' : formatTime(vitals.inpMax);
        if (inpRow && slowest && (vitals.inpPartial || (vitals.inpFast ? vitals.inpMax >= 100 : slowest !== formatTime(vitals.inp)))) {
            inpRow.title = inpRow.dataset.hint = `${inpRow.dataset.hint}\n${t('auditInpSlowest', slowest)}`;
        }
        row('auditBlocking', formatNumber(vitals.blocking), vitals.blockingScripts || vitals.blocking > 15 ? 'warn' : 'good');
        // Кэш: браузера (видно всегда) или сервера и CDN (по заголовкам, в расширенном режиме). Не замечание
        const CACHE_HEADERS = [['cf-cache-status', 'Cloudflare'], ['x-cache-status', 'nginx'], ['x-proxy-cache', 'nginx'],
            ['x-fastcgi-cache', 'nginx'], ['x-srcache-fetch-status', 'nginx'], ['x-cache', '']];
        const [cacheHeader, cacheSource] = CACHE_HEADERS.find(([header]) => server?.headers[header]) || [];
        if (vitals.browserCache) {
            row('auditCache', t('auditCacheBrowser'), 'none');
        } else if (cacheHeader) {
            // Повторы склеены через запятую (два X-Cache, у Fastly с щитом — «MISS, HIT» одной строкой): каждое
            // значение — свой уровень кэша, последнее — ближайший к посетителю. По нему и подпись, и цвет
            const value = server.headers[cacheHeader].split(',').map((s) => s.trim()).filter(Boolean).at(-1) ?? '';
            const hit = /\bhit\b/i.test(value);
            row('auditCache', (/\b(hit|miss|expired|stale|bypass|dynamic|updating|revalidated)\b/i.exec(value)?.[1] || value)
                .toUpperCase() + (cacheSource ? ` · ${cacheSource}` : ''), hit ? 'good' : 'none');
        }
        // Вёрстка — тоже про скорость: картинки без размеров сдвигают страницу, большие и старых форматов — тяжелее
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
    }

    section('auditSecurity', 'security');
    if (!server) {
        // Заголовки сервера видны только в расширенном режиме — балл по неполным данным
        const note = document.createElement('p');
        note.className = 'h-note';
        note.textContent = t('scoreUnsure');
        group.append(note);
    }
    row('auditHttps', info.https ? yes : no, info.https ? 'good' : 'bad', true,
        {name: t('scoreHttps'), hint: t(info.https ? 'httpsOn' : 'httpsOff')});
    // Смешанный контент: скрипты, стили и фреймы браузер блокирует — красным, картинки и медиа переводит
    // на HTTPS сам — жёлтым
    if (info.https) {
        row('auditMixed', [info.mixed ? t('mixed', info.mixed) : '', info.mixedPassive ? t('mixedPassive', info.mixedPassive) : '']
            .filter(Boolean).join(', ') || no, info.mixed ? 'bad' : info.mixedPassive ? 'warn' : 'good', true, {
            name: t('scoreMixed'),
            hint: [info.mixed ? t('mixedTitle', info.mixed) : '', info.mixedPassive ? t('mixedPassiveTitle', info.mixedPassive) : '']
                .filter(Boolean).join('\n')
        });
        if (server?.ip) {
            const hsts = 'strict-transport-security' in server.headers;
            row('auditHsts', hsts ? yes : no, hsts ? 'good' : 'bad', true, {name: 'HSTS', hint: t(hsts ? 'hstsOn' : 'hstsOff')});
        }
    }
    if (!server) {
        row('auditCustom:CSP, X-Frame-Options, Permissions-Policy…', t(extended ? 'serverReload' : 'serverExtended'), 'none');
    } else {
        const headers = server.headers;
        // Каждый заголовок CSP (повторы склеены через запятую) и каждый <meta> — отдельная политика, браузер применяет все
        const policies = [...(headers['content-security-policy'] || '').split(','), ...(audit?.security.csp || [])]
            .filter((policy) => policy.trim());
        const csp = policies.length > 0;
        // 'unsafe-inline' без nonce и hash разрешает любой встроенный скрипт — от XSS такая политика не спасает.
        // Для элементов и атрибутов своя цепочка: script-src-elem/-attr → script-src → default-src.
        // Набор слаб, если задан хотя бы в одной политике и слаб во всех, где задан.
        // Строгие ограничения элементов не перекрывают слабые ограничения атрибутов и наоборот.
        const directive = (policy, name) => new RegExp(`(?:^|;)\\s*${name}(?![\\w-])([^;]*)`, 'i').exec(policy)?.[1];
        const sources = ['script-src-elem', 'script-src-attr'].map((name) => policies
            .map((policy) => directive(policy, name) ?? directive(policy, 'script-src') ?? directive(policy, 'default-src'))
            .filter((value) => value !== undefined));
        const weak = sources.some((values) => values.length > 0 && values.every((value) => /'unsafe-inline'/i.test(value)
            && !/(?:^|\s)'(?:nonce|sha(?:256|384|512))-[a-z0-9+/_-]+={0,2}'(?:\s|$)|'strict-dynamic'/i.test(value)));
        // CSP только с frame-ancestors или upgrade-insecure-requests есть, но от XSS не защищает
        const loose = csp && sources.every((values) => values.length === 0);
        row('auditCsp', !csp ? no : loose ? t('auditCspNoScripts') : weak ? t('auditCspWeak') : yes,
            !csp || loose || weak ? 'warn' : 'good');
        const nosniff = /nosniff/i.test(headers['x-content-type-options'] || '');
        row('auditNosniff', nosniff ? yes : no, nosniff ? 'good' : 'warn');
        // frame-ancestors в <meta> браузер игнорирует — только из заголовка
        const frame = 'x-frame-options' in headers || /frame-ancestors/i.test(headers['content-security-policy'] || '');
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
    const unchecked = audit?.unchecked || {};
    if (audit) {
        const security = audit.security;
        // Угадано по названию cookie — найденные показываем нейтрально, без замечания
        row('auditSession', security.sessionCookies.length ? security.sessionCookies.join(', ') : no,
            security.sessionCookies.length ? 'none' : 'good', !security.sessionCookies.length);
        row('auditSecurityTxt', unchecked.securityTxt ? '—' : security.securityTxt ? yes : no, security.securityTxt ? 'good' : 'none');
    }

    if (audit) {
        section('auditSeo', 'seo');
        if (seo.status) {
            row('auditStatus', String(seo.status), seo.status >= 400 ? 'bad' : seo.status >= 300 ? 'warn' : 'good');
        }
        // Запрет индексации — грубая ошибка SEO, поэтому здесь, а не в «Роботах и ИИ».
        // X-Robots-Tag: «noindex», «googlebot: noindex», но не «max-image-preview:none»
        const noindex = seo.noindex || (server?.headers['x-robots-tag'] || '').split(',')
            .some((value) => /^\s*(?:(?!max-|unavailable_after)[\w-]+\s*:\s*)?(noindex|none)\s*$/i.test(value));
        const denied = [noindex ? 'noindex' : '', seo.robots?.blocked ? 'robots.txt' : ''].filter(Boolean).join(', ');
        row('auditNoindex', denied || no, denied ? 'bad' : 'good');
        // Длина вне рекомендованной — не замечание: Google режет по ширине в пикселях, а описание часто пишет сам
        row('auditTitle', seo.title ? t('auditLength', formatNumber(seo.title)) : no,
            !seo.title ? 'bad' : seo.title < 10 || seo.title > 70 ? 'none' : 'good');
        row('auditDescription', seo.description ? t('auditLength', formatNumber(seo.description)) : no,
            !seo.description ? 'warn' : seo.description < 50 || seo.description > 170 ? 'none' : 'good');
        row('auditH1', formatNumber(seo.h1), seo.h1 === 0 ? 'warn' : seo.h1 === 1 ? 'good' : 'none');
        // Указана другая страница или другой сайт — бывает законно (зеркала, AMP, фильтры, перепечатки), не замечание
        row('auditCanonical', {same: yes, page: t('auditOtherPage'), other: t('auditOtherSite'), '': no}[seo.canonical],
            seo.canonical === 'same' ? 'good' : 'none');
        row('auditOg', seo.ogTitle && seo.ogImage ? yes : seo.ogTitle ? t('auditNoImage') : no,
            seo.ogTitle && seo.ogImage ? 'good' : 'warn');
        row('auditViewport', seo.viewport ? yes : no, seo.viewport ? 'good' : 'warn');

        section('auditA11y', 'a11y');
        row('auditLang', a11y.lang || no, a11y.lang ? 'good' : 'warn');
        if (seo.viewport) {
            row('auditZoom', seo.zoomOff ? yes : no, seo.zoomOff ? 'bad' : 'good');
        }
        row('auditAlt', formatNumber(a11y.alt), a11y.alt ? 'warn' : 'good');
        row('auditLabels', formatNumber(a11y.labels), a11y.labels ? 'warn' : 'good');
        row('auditNames', formatNumber(a11y.names), a11y.names ? 'warn' : 'good');
        row('auditMain', a11y.main ? yes : no, a11y.main ? 'good' : 'warn');

        // Роботы и ИИ: то, о чём часто не знают — robots.txt, карта сайта, правила для нейросетей, llms.txt.
        // Без оценки: закрыть сайт от ИИ-ботов или открыть — не хорошо и не плохо
        section('auditBots');
        const robots = seo.robots;
        // Сайт не ответил вовремя: файла может и не быть, но замечанием это не считаем
        if (unchecked.robots) {
            row('auditRobots', '—', 'none');
        } else {
            row('auditRobots', robots ? yes : no, robots ? 'good' : 'warn');
        }
        if (robots) {
            row('auditSitemap', robots.sitemap ? yes : no, robots.sitemap ? 'good' : 'none');
            // Считаем только ботов, названных по имени: «User-agent: *» закрывает сайт всем, а не именно ИИ
            const blockedBots = robots.aiBlocked || [];
            const ai = row('auditAi', robots.aiNamed === null ? '—' : blockedBots.length ? t('auditAiBlocked', formatNumber(blockedBots.length))
                : robots.aiNamed ? t('auditAiAllowed') : robots.closed ? t('auditAiAll') : t('auditAiNone'), 'none');
            if (blockedBots.length) {
                ai.title += '\n' + blockedBots.join(', ');
            }
        }
        // Google llms.txt не использует — есть файл или нет, только для сведения
        row('auditLlms', unchecked.llms ? '—' : seo.llms ? yes : no, 'none');
    }
    setupAuditGroups();
    return rows;
}

/**
 * Снимок после аудита, независимо от host/идентичности документа.
 * Повторная проверка прав защищает от отзыва режима во время ожидания ответа.
 * @param {number} tabId
 * @returns {Promise<?Object>}
 */
async function readTabRedirects(tabId) {
    const basic = {redirectsStatus: 'permission-required'};
    if (!await chrome.permissions.contains(EXTENDED).catch(() => false)) {
        return basic;
    }
    const response = await chrome.runtime.sendMessage({tabInfo: tabId}).catch(() => null);
    return await chrome.permissions.contains(EXTENDED).catch(() => false) ? response : basic;
}

/**
 * Последняя запись вкладки, без предположений о её связи с документом аудита.
 * Времена webRequest не участвуют ни в TTFB, ни в оценке.
 * @param {?Object} response ответ tabInfo
 * @returns {{value: string, section: Object, items: Array<{label: string, value: string}>}}
 */
function formatRedirectCauses(response) {
    const empty = (key) => ({value: t(key), section: {status: 'unavailable'}, items: []});
    if (response?.redirectsStatus === 'permission-required') {
        return empty('redirectsPermission');
    }
    if (!['observed', 'not-observed'].includes(response?.redirectsStatus)) {
        return empty('redirectsUnavailable');
    }
    const chain = response.tab?.pendingRedirects || response.tab?.redirects;
    if (!chain) {
        return empty('redirectsAbsent');
    }
    if (chain.version !== 1 || !Array.isArray(chain.hops)
        || !['pending', 'completed', 'error'].includes(chain.outcome)) {
        return empty('redirectsUnavailable');
    }
    // Повторная защита границы вывода: даже испорченный снимок не выводит query/credentials.
    const address = (value) => {
        try {
            const url = new URL(value);
            return /^https?:$/.test(url.protocol) ? url.origin + url.pathname.slice(0, 160) : '—';
        } catch {
            return '—';
        }
    };
    const hops = chain.hops.slice(0, 20);
    const partial = !chain.complete || chain.truncated || chain.hops.length > 20 || chain.outcome !== 'completed';
    const items = hops.map((hop, index) => ({
        label: `${formatNumber(index + 1)} · HTTP ${Number.isInteger(hop.statusCode) && hop.statusCode >= 300 && hop.statusCode <= 399 ? hop.statusCode : '—'}`,
        value: `${address(hop.from)} → ${address(hop.to)}`
    }));
    return {
        value: t(chain.outcome === 'error' ? 'redirectsError' : chain.outcome === 'pending' ? 'redirectsPending'
            : partial ? 'auditDetailsPartial' : hops.length ? 'redirectsCompleted' : 'redirectsEmpty'),
        section: {status: partial ? 'partial' : 'ok', truncated: !!chain.truncated}, items
    };
}

/**
 * Отдельный блок без audit-row/модели оценки. Оговорка не скрывается с подробностями.
 * @param {?Object} response
 */
function renderRedirectCauses(response) {
    document.getElementById('tab-redirects')?.remove();
    const block = document.createElement('section');
    block.id = 'tab-redirects';
    const title = document.createElement('h3');
    title.textContent = t('redirectsTitle');
    const caveat = document.createElement('p');
    caveat.className = 'tab-redirects-note';
    caveat.textContent = t('redirectsCaveat');
    const data = formatRedirectCauses(response);
    const summary = document.createElement('div');
    summary.dataset.key = 'tabRedirects';
    const value = document.createElement('span');
    value.textContent = data.value;
    summary.append(value);
    block.append(title, caveat, summary);
    document.getElementById('audit-body').append(block);
    renderAuditCauses(summary, data.section, data.items);
}

/**
 * Общее раскрытие: скрытый контент не удерживает фокус и открытое пояснение.
 * @param {HTMLButtonElement} button
 * @param {HTMLElement} panel
 * @param {boolean} open
 */
function setAuditDisclosure(button, panel, open) {
    if (!open) {
        if (panel.contains(document.activeElement)) {
            button.focus();
        }
        if (panel.contains(document.querySelector('[aria-describedby="tip"]'))) {
            document.getElementById('tip').dispatchEvent(new Event('close'));
        }
    }
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
}

/**
 * Группы остаются в DOM и в модели оценки. Одновременно открыт один раздел, включая «О сайте».
 */
function setupAuditGroups() {
    const body = document.getElementById('audit-body');
    for (const [index, group] of [...body.children].entries()) {
        if (group.querySelector('.group-toggle')) {
            continue;
        }
        const title = group.querySelector('h3');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'group-toggle';
        button.id = `audit-group-toggle-${index}`;
        const name = document.createElement('span');
        name.className = 'group-name';
        name.append(...title.childNodes);
        button.append(name);
        if (group.id !== 'about') {
            const note = document.createElement('span');
            note.className = 'h-issues';
            note.textContent = t('auditGroupIssues', formatNumber(group.querySelectorAll('.audit-row:is([data-state="bad"], [data-state="warn"])').length));
            button.append(note);
        }
        title.append(button);
        const panel = document.createElement('div');
        panel.className = 'group-body';
        panel.id = `audit-group-body-${index}`;
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-labelledby', button.id);
        panel.append(...[...group.children].filter((el) => el !== title));
        group.append(panel);
        button.setAttribute('aria-controls', panel.id);
        setAuditDisclosure(button, panel, false);
        button.addEventListener('click', () => openAuditGroup(group, panel.hidden));
        group.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !event.defaultPrevented
                && !document.querySelector('[aria-describedby="tip"]') && document.getElementById('share-menu').hidden && !panel.hidden) {
                event.preventDefault();
                setAuditDisclosure(button, panel, false);
                button.focus();
            }
        });
    }
}

/**
 * @param {HTMLElement} group
 * @param {boolean} [open]
 */
function openAuditGroup(group, open = true) {
    for (const other of document.querySelectorAll('#audit-body > .audit-group')) {
        setAuditDisclosure(other.querySelector('.group-toggle'), other.querySelector('.group-body'), other === group && open);
    }
}

/**
 * Общий компонент причин для следующих сборщиков. Форматтер передаёт переведённые факты
 * [{label, value}], а не сырые data/reasons: неизвестные поля и коды сами в интерфейс не попадают.
 * Пять фактов видны сразу, остальные раскрываются в общем потоке. Ни одного .audit-row внутри.
 * @param {HTMLElement} row
 * @param {?Object} section раздел causes v1
 * @param {Array<{label: string, value: string, geometry?: Array<{label: string, value: string}>}>} [items] подготовленные подписи и значения
 * @param {string[]} [notes] пояснения вне списка: не занимают первые пять мест
 */
function renderAuditCauses(row, section, items = [], notes = []) {
    if (!['ok', 'partial'].includes(section?.status)) {
        return;
    }
    const line = document.createElement('div');
    line.className = 'audit-line';
    row.replaceWith(line);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'causes-toggle';
    button.textContent = t('auditDetails');
    button.setAttribute('aria-label', `${t('auditDetails')}: ${row.querySelector('span').textContent}`);
    const panel = document.createElement('div');
    panel.className = 'audit-causes';
    panel.id = `causes-${row.dataset.key}`;
    button.setAttribute('aria-controls', panel.id);
    setAuditDisclosure(button, panel, false);
    line.append(row, button, panel);
    button.addEventListener('click', () => setAuditDisclosure(button, panel, panel.hidden));
    line.addEventListener('keydown', (event) => {
        if (!panel.hidden && event.key === 'Escape' && !event.defaultPrevented
            && !document.querySelector('[aria-describedby="tip"]') && document.getElementById('share-menu').hidden) {
            event.preventDefault();
            setAuditDisclosure(button, panel, false);
            button.focus();
        }
    });
    if (section.status === 'partial' || section.truncated) {
        const note = document.createElement('p');
        note.textContent = t('auditDetailsPartial');
        panel.append(note);
    }
    for (const text of notes) {
        const note = document.createElement('p');
        note.textContent = text;
        panel.append(note);
    }
    if (!items.length && notes.length) {
        return;
    }
    if (!items.length) {
        const empty = document.createElement('p');
        empty.textContent = t('auditDetailsEmpty');
        panel.append(empty);
        return;
    }
    const list = document.createElement('ul');
    const append = ({label, value, geometry}) => {
        const item = document.createElement('li');
        const text = document.createElement('bdi');
        text.textContent = value;
        item.append(label + ': ');
        if (geometry) {
            geometry.forEach((part, index) => {
                const numbers = document.createElement('bdi');
                numbers.setAttribute('dir', 'ltr');
                numbers.textContent = part.value;
                item.append((index ? ' · ' : '') + part.label + ': ', numbers);
            });
            if (value) {
                item.append(' · ', text);
            }
        } else {
            item.append(text);
        }
        list.append(item);
    };
    items.slice(0, 5).forEach(append);
    panel.append(list);
    if (items.length > 5) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'causes-more';
        more.textContent = t('auditDetailsMore', formatNumber(items.length - 5));
        more.addEventListener('click', () => {
            items.slice(5).forEach(append);
            button.focus();
            more.remove();
        });
        panel.append(more);
    }
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

// Группы оценки: ключ, название, вес в общей. Приватность весит больше: ради неё ABlock и ставят, и это
// то, что посетитель на сайте изменить не может. Скорость и безопасность касаются посетителя напрямую;
// SEO — больше забота владельца сайта, а проверок доступности пока мало и они простые
const SCORE_GROUPS = [['privacy', 'auditPrivacy', 3], ['speed', 'auditSpeed', 2], ['security', 'auditSecurity', 2],
    ['seo', 'auditSeo', 1], ['a11y', 'auditA11y', 1]];

/**
 * Цвет балла из 10
 * @param {number} score
 * @returns {string}
 */
function scoreState(score) {
    return score >= 7.5 ? 'good' : score >= 5 ? 'warn' : 'bad';
}

/**
 * Оценка по группам: в каждой — среднее взвешенное по показателям, общая — среднее взвешенное по группам.
 * Показатели, которые не удалось узнать, и нейтральные строки не учитываются
 * @param {Object} info
 * @param {Array<{name: string}>} companies
 * @param {?Object} audit результат page/audit.js
 * @param {Map<string, {name: string, state: string}>} rows строки разделов (renderAudit)
 * @param {?Object} server данные расширенного режима
 * @returns {{total: number, groups: Array<{id: string, name: string, score: ?number, sure: boolean, parts: Array<[string, number]>}>}}
 */
function scoreSite(info, companies, audit, rows, server) {
    const step = (value, limits, points) => points[limits.findIndex((limit) => value <= limit)] ?? points[points.length - 1];
    // Строка как показатель: зелёная — 1, жёлтая — 0,5, красная — 0; нейтральной или отсутствующей нет
    const row = (key, weight) => [rows.get(key)?.name, {good: 1, warn: 0.5, bad: 0}[rows.get(key)?.state], weight];
    // Сколько найдено (картинки без alt, поля без подписи): одно — ещё не беда, много — хуже
    const count = (key, value, weight) => [rows.get(key)?.name, rows.has(key) ? step(value, [0, 3, 10], [1, 0.7, 0.5, 0.3]) : undefined, weight];
    const vitals = audit?.vitals;
    const a11y = audit?.a11y;
    const parts = {
        privacy: [
            [t('scoreTrackers'), step(companies.length, [0, 1, 2, 4, 7], [1, 0.8, 0.65, 0.45, 0.25, 0.1]), 3],
            // Вес меньше: сторонние домены во многом те же трекеры
            [t('scoreDomains'), step(info.domains.length, [5, 15, 30], [1, 0.6, 0.35, 0.15]), 1]
        ],
        speed: [
            // Скорость — по отрисовке главного блока (LCP), как у Google; если её нет — по полной загрузке
            [t('scoreSpeed'), vitals?.lcp != null ? step(vitals.lcp / 1000, [1.5, 2.5, 4, 6], [1, 0.85, 0.5, 0.25, 0.1])
                : info.loadTime === null ? undefined : step(info.loadTime / 1000, [1, 2, 3, 5], [1, 0.85, 0.65, 0.4, 0.15]), 2],
            [t('scoreCls'), vitals?.cls != null ? step(vitals.cls, [0.1, 0.25], [1, 0.5, 0.1]) : undefined, 1],
            // Отклик — только если действия были и он известен
            [t('auditInp'), vitals?.inpFast ? 1 : vitals?.inp != null && !vitals.inpPartial
                ? step(vitals.inp, [200, 500], [1, 0.5, 0.1]) : undefined, 1],
            // Пороги как у метки веса: до 2 МБ — от 8 баллов, до 5 — от 5, больше — меньше 5
            [t('scoreWeight'), step(Math.round(info.weight.bytes / 2 ** 20 * 10) / 10, [1, 2, 3, 5, 8], [1, 0.9, 0.7, 0.55, 0.3, 0.1]), 1.5],
            // HTTP/2 — норма (Lighthouse ругается только на HTTP/1.x), HTTP/3 — небольшой плюс
            [t('scoreProtocol'), info.h3 ? 1 : {'h2': 0.9, 'http/1.1': 0.3, 'http/1.0': 0.2}[info.protocol], 1],
            [t('scoreCompression'), compressionScore(info), 0.5],
            row('auditTtfb', 0.5),
            row('auditFcp', 0.5),
            row('auditBlocking', 0.5),
            row('auditDoctype', 0.5),
            row('auditNoSize', 0.25),
            row('auditLarge', 0.25),
            row('auditModern', 0.25)
        ],
        security: [
            [t('scoreHttps'), info.https ? 1 : 0, 3],
            // Пассивный смешанный контент браузер переводит на HTTPS сам — штраф мягче. Без HTTPS его не бывает
            [t('scoreMixed'), !info.https ? undefined : info.mixed ? 0.2 : info.mixedPassive ? 0.7 : 1, 1],
            [t('scoreHsts'), rows.has('auditHsts') ? (rows.get('auditHsts').state === 'good' ? 1 : 0.3) : undefined, 1],
            row('auditCsp', 1),
            row('auditNosniff', 0.5),
            row('auditFrame', 0.5),
            row('auditVersions', 0.5)
        ],
        // Грубые ошибки весят больше: страница закрыта от поисковиков или без заголовка
        seo: [
            row('auditStatus', 1),
            row('auditNoindex', 3),
            row('auditTitle', 3),
            row('auditDescription', 1),
            row('auditH1', 0.5),
            row('auditOg', 0.5),
            row('auditViewport', 1)
        ],
        // Запрет масштабирования — самое грубое: слабовидящий не может увеличить страницу
        a11y: [
            row('auditLang', 1),
            row('auditZoom', 3),
            count('auditAlt', a11y?.alt, 1),
            count('auditLabels', a11y?.labels, 1),
            count('auditNames', a11y?.names, 1),
            row('auditMain', 0.5)
        ]
    };

    const groups = SCORE_GROUPS.map(([id, key, weight]) => {
        const known = parts[id].filter(([, value]) => value !== undefined);
        const sum = known.reduce((total, [, value, w]) => total + value * w, 0);
        const weights = known.reduce((total, [, , w]) => total + w, 0);
        return {
            id,
            name: t(key),
            weight,
            exact: weights ? (sum / weights) * 10 : null,
            score: weights ? Math.round((sum / weights) * 100) / 10 : null,
            // По неполным данным: безопасность без заголовков сервера (без расширенного режима), скорость — если
            // страница не дала выполнить аудит (метрик Google нет, остались вес, протокол и время загрузки)
            sure: id === 'security' ? Boolean(server) : id === 'speed' ? Boolean(audit) : true,
            parts: known.map(([name, value]) => [name, Math.round(value * 10)])
        };
    });
    const scored = groups.filter((group) => group.score !== null);
    const weights = scored.reduce((total, group) => total + group.weight, 0);
    let total = Math.round(scored.reduce((sum, group) => sum + group.exact * group.weight, 0) / weights * 10) / 10;
    // Без шифрования сайт не может быть хорошим
    if (!info.https) {
        total = Math.min(total, 4);
    }
    return {total, groups};
}

/**
 * Круг с дугой по баллу из 10
 * @param {number} size
 * @param {number} stroke толщина
 * @param {?number} score
 * @returns {SVGSVGElement}
 */
function scoreRing(size, stroke, score) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ring');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('aria-hidden', 'true');
    const r = (size - stroke) / 2;
    const c = size / 2;
    svg.innerHTML = `<circle class="track" cx="${c}" cy="${c}" r="${r}" stroke-width="${stroke}"/>`
        + (score ? `<circle class="arc" cx="${c}" cy="${c}" r="${r}" stroke-width="${stroke}" pathLength="100" stroke-dasharray="${score * 10} 100"/>` : '');
    return svg;
}

/**
 * Оценка в окне: полоса (10 делений и число), табло (общая и группы) и баллы в заголовках разделов
 * @param {Object} info
 * @param {Array<{name: string}>} companies
 * @param {?Object} audit
 * @param {Map<string, {name: string, state: string}>} rows
 * @param {?Object} server
 * @returns {{total: number, groups: Array<Object>}}
 */
function renderScore(info, companies, audit, rows, server) {
    const result = scoreSite(info, companies, audit, rows, server);
    const {total, groups} = result;
    const format = (value) => formatNumber(value, {minimumFractionDigits: 1, maximumFractionDigits: 1});
    const formatted = format(total);

    const el = document.getElementById('score');
    el.dataset.state = scoreState(total);
    document.getElementById('score-value').textContent = formatted;
    for (const [i, segment] of [...document.querySelectorAll('#meter i')].entries()) {
        segment.classList.toggle('on', i < Math.round(total));
    }
    // Из чего сложилась общая: группы и потолок без HTTPS
    const totalTitle = [
        t('scoreTitle', formatted),
        ...groups.filter((group) => group.score !== null)
            .map((group) => `${group.name}: ${format(group.score)}${group.sure ? '' : '?'}`),
        info.https ? '' : t('scoreCapHttps')
    ].filter(Boolean).join('\n');
    document.getElementById('score-more').title = totalTitle;

    // Табло: круг общей и строки групп с пятью делениями (деление — 2 балла, половина — 1)
    const board = document.getElementById('board');
    const ring = document.createElement('div');
    ring.className = 'board-total';
    ring.dataset.state = scoreState(total);
    ring.title = totalTitle;
    ring.tabIndex = 0;
    const dial = document.createElement('span');
    dial.className = 'dial';
    const number = document.createElement('span');
    number.className = 'num';
    number.textContent = formatted;
    const of = document.createElement('small');
    of.textContent = t('scoreOutOf');
    number.append(of);
    dial.append(scoreRing(72, 6, total), number);
    const caption = document.createElement('span');
    caption.className = 'caption';
    caption.textContent = t('scoreLabel');
    ring.append(dial, caption);

    const list = document.createElement('div');
    list.className = 'board-rows';
    for (const group of groups) {
        const item = document.createElement('div');
        item.className = 'board-row';
        item.dataset.state = group.score === null ? 'none' : scoreState(group.score);
        if (!group.sure) {
            item.dataset.sure = 'false';
        }
        const value = group.score === null ? '—' : format(group.score);
        item.title = group.score === null ? '' : [
            `${group.name}. ${t('scoreTitle', value + (group.sure ? '' : '?'))}`,
            ...group.parts.map(([name, points]) => `${name}: ${formatNumber(points)}`),
            group.sure ? '' : t(group.id === 'speed' ? 'scoreSpeedUnsure' : 'scoreUnsure'),
            group.id === 'speed' && info.loadTime === null ? t('loadingTitle') : ''
        ].filter(Boolean).join('\n');
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = group.name;
        const meter = document.createElement('span');
        meter.className = 'five';
        const points = Math.round(group.score ?? 0);
        for (let i = 0; i < 5; i++) {
            const segment = document.createElement('span');
            segment.className = 'seg' + (points >= i * 2 + 2 ? ' on' : points === i * 2 + 1 ? ' half' : '');
            meter.append(segment);
        }
        const num = document.createElement('span');
        num.className = 'num';
        num.textContent = value;
        item.append(label, meter, num);
        list.append(item);

        // Балл в заголовке раздела; закрытая группа всё ещё находится в DOM.
        const section = document.querySelector(`.audit-group[data-group="${group.id}"]`);
        const title = section?.querySelector('.group-toggle');
        if (section) {
            const jump = document.createElement('button');
            jump.type = 'button';
            jump.className = 'board-jump';
            jump.setAttribute('aria-label', item.title || group.name);
            jump.setAttribute('aria-controls', section.querySelector('.group-body').id);
            jump.addEventListener('click', () => {
                openAuditGroup(section);
                section.querySelector('.group-toggle').focus();
                section.scrollIntoView({block: 'nearest'});
            });
            item.append(jump);
        } else if (item.title) {
            // Без аудита раздела может не быть: пояснение балла остаётся доступно с клавиатуры.
            item.tabIndex = 0;
        }
        if (title) {
            title.querySelector('.ring')?.remove();
            title.querySelector('.h-num')?.remove();
            title.querySelector('.h-issues')?.remove();
            delete title.dataset.sure;
            title.dataset.state = item.dataset.state;
            if (!group.sure) {
                title.dataset.sure = 'false';
            }
            title.prepend(scoreRing(18, 2.5, group.score));
            const h = document.createElement('span');
            h.className = 'h-num';
            const v = document.createElement('span');
            v.className = 'h-value';
            v.textContent = value;
            const small = document.createElement('small');
            small.textContent = t('scoreOutOf');
            // Отступ — в CSS: «из 10» отдельно, а «/10» (финский, эстонский, венгерский…) — вплотную, как дробь
            small.className = /^\/\S/.test(small.textContent) ? 'of tight' : 'of';
            h.append(v, small);
            title.append(h);
            const issues = section.querySelectorAll('.audit-row:is([data-state="bad"], [data-state="warn"])').length;
            const note = document.createElement('span');
            note.className = 'h-issues';
            note.textContent = t('auditGroupIssues', formatNumber(issues));
            title.append(note);
        }
    }
    const focusedGroup = board.contains(document.activeElement) ? document.activeElement.getAttribute('aria-controls') : null;
    // Пересчёт заменяет табло целиком: открытое пояснение к его строке осталось бы висеть от старой
    if (board.contains(document.querySelector('[aria-describedby="tip"]'))) {
        document.getElementById('tip').dispatchEvent(new Event('close'));
    }
    board.replaceChildren(ring, list);
    if (focusedGroup) {
        board.querySelector(`[aria-controls="${focusedGroup}"]`)?.focus();
    }
    return result;
}

/**
 * Нажатие на полосу оценки раскрывает табло и разделы по группам
 */
function setupScoreToggle() {
    const score = document.getElementById('score');
    const head = document.getElementById('score-head');
    const button = document.getElementById('score-more');
    const body = document.getElementById('score-body');
    // Стрелка — тоже часть полосы
    head.addEventListener('click', () => {
        body.hidden = !body.hidden;
        button.setAttribute('aria-expanded', String(!body.hidden));
        score.toggleAttribute('data-open', !body.hidden);
        if (body.hidden) {
            document.getElementById('share-menu').hidden = true;
            if (body.contains(document.activeElement)) {
                button.focus();
            }
            document.getElementById('tip').dispatchEvent(new Event('close'));
        }
    });
    body.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !event.defaultPrevented
            && !document.querySelector('[aria-describedby="tip"]') && document.getElementById('share-menu').hidden) {
            event.preventDefault();
            head.click();
            button.focus();
        }
    });
}

/**
 * Пояснения значков, меток, строк оценки и разделов без мыши: по нажатию (в том числе на сенсорном экране)
 * и по фокусу с клавиатуры показывается тот же текст, что в подсказке при наведении.
 * Escape, нажатие мимо или уход фокуса — скрыть
 */
function setupTips() {
    const tip = document.getElementById('tip');
    const SELECTOR = '.badge[tabindex], .chip[tabindex], .audit-row[tabindex], .board [tabindex]:not(button), .board-jump, #stats-text';
    let owner = null;

    const hide = () => {
        if (!owner) {
            return;
        }
        // Подсказку при наведении возвращаем, если её не заменили, пока было открыто пояснение
        if (!owner.title) {
            owner.title = owner.dataset.tip;
        }
        delete owner.dataset.tip;
        owner.removeAttribute('aria-describedby');
        owner = null;
        tip.hidden = true;
    };
    const show = (el) => {
        hide();
        const text = el.title || (el.matches('.board-jump') ? el.closest('.board-row').title : '');
        if (!text) {
            return;
        }
        owner = el;
        // У кнопки табло текст берём из строки: расчёт и экспорт табло не меняются.
        el.dataset.tip = text;
        el.removeAttribute('title');
        el.setAttribute('aria-describedby', 'tip');
        tip.textContent = el.dataset.tip;
        tip.hidden = false;
        const rect = el.getBoundingClientRect();
        const max = document.documentElement.clientWidth - tip.offsetWidth - 8;
        tip.style.left = `${Math.max(8, Math.min(rect.left + (rect.width - tip.offsetWidth) / 2, max)) + scrollX}px`;
        tip.style.top = `${rect.bottom + 6 + scrollY}px`;
    };

    // Владелец пояснения исчезает (табло пересчитано) — закрыть
    tip.addEventListener('close', hide);
    // На сенсорном экране первый тап объясняет балл, второй открывает группу.
    // Запоминаем состояние до фокуса: браузер может сфокусировать кнопку между pointerdown и click.
    let touch = null;
    document.addEventListener('pointerdown', (event) => {
        const button = event.pointerType === 'touch' ? event.target.closest('.board-jump') : null;
        touch = button ? {button, open: owner === button} : null;
    }, true);
    document.addEventListener('pointercancel', () => { touch = null; }, true);
    document.addEventListener('click', (event) => {
        const button = event.target.closest('.board-jump');
        const firstTap = button && touch?.button === button && !touch.open
            && (button.title || button.closest('.board-row').title);
        touch = null;
        if (firstTap) {
            // Capture останавливает только первый тап до обработчика перехода на самой кнопке.
            event.preventDefault();
            event.stopPropagation();
            show(button);
        }
    }, true);
    document.addEventListener('click', (event) => {
        const el = event.target.closest('button') ? null : event.target.closest(SELECTOR);
        if (el && el !== owner) {
            show(el);
        } else {
            hide();
        }
    });
    document.addEventListener('focusin', (event) => {
        if (event.target.matches(SELECTOR) && event.target.matches(':focus-visible')) {
            show(event.target);
        }
    });
    document.addEventListener('focusout', (event) => {
        if (event.target === owner) {
            hide();
        }
    });
    document.addEventListener('keydown', (event) => {
        touch = null;
        const el = document.activeElement;
        if (event.key === 'Escape' && owner) {
            // preventDefault — чтобы Escape закрыл пояснение, а не окно
            event.preventDefault();
            hide();
        } else if ((event.key === 'Enter' || event.key === ' ') && el?.matches(SELECTOR) && !el.matches('.board-jump')) {
            event.preventDefault();
            if (el === owner) {
                hide();
            } else {
                show(el);
            }
        }
    });
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
 * Картинка с отчётом о сайте: домен, дата, значки, табло оценки по группам, сервер и движок, замечания.
 * Подсказки на картинке не видны — пояснения к проблемам выписываются списком.
 * Рисуется через SVG foreignObject: стили окна те же, сторонние библиотеки не нужны
 * @param {string} host
 * @returns {Promise<Blob>}
 */
async function renderReport(host) {
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
    // Табло — сразу раскрытое: свёрнутой полосы на картинке нет
    const board = document.getElementById('board').cloneNode(true);
    board.removeAttribute('id');
    board.querySelectorAll('.board-jump').forEach((button) => button.remove());

    const details = document.getElementById('details').cloneNode(true);
    const copy = details.querySelector('#server .icon-button');
    copy?.replaceWith(chip(copy.dataset.ip, 'none', ''));

    // Пояснения к тому, что можно улучшить (в окне они в подсказках)
    const notes = make('ul', 'sheet-notes');
    // HTTPS, HSTS и смешанный контент — строками раздела «Безопасность» ниже
    const problems = [...panel.querySelectorAll(':is(#protocol, #compression)[data-state="bad"]')];
    // Пояснение, открытое нажатием, временно хранится в data-tip (setupTips)
    for (const text of new Set(problems.map((el) => (el.title || el.dataset.tip || '').split('\n')[0]).filter(Boolean))) {
        notes.append(make('li', '', text));
    }
    // Замечания из разделов оценки: название и значение жирным, дальше пояснение
    for (const el of document.querySelectorAll('#audit-body .audit-row:is([data-state="bad"], [data-state="warn"])')) {
        const li = make('li', '');
        // Значение может само кончаться точкой («186 симв.») — вторую не ставим
        const dot = /[.!?…]$/.test(el.dataset.note) ? ' ' : '. ';
        li.append(make('b', '', el.dataset.note), el.dataset.hint ? dot + el.dataset.hint : '');
        notes.append(li);
    }

    // «?» — и у меток, определённых по косвенным признакам, и у баллов по неполным данным: одно пояснение на знак
    const guess = Boolean(details.querySelector('[data-sure="false"]'));
    const unsure = Boolean(board.querySelector('[data-sure="false"]'));
    const legendText = [guess && unsure ? t('reportLegendQuestion') : guess ? t('reportLegendGuess') : unsure ? t('reportLegendUnsure') : '',
        /≈/.test(panel.textContent) ? t('reportLegendEstimate') : ''].filter(Boolean).join(' · ');
    const legend = legendText ? make('div', 'sheet-legend', legendText) : null;
    const foot = make('div', 'sheet-foot');
    foot.append(make('span', '', 'ABlock'), make('span', '', 'https://ablock.arh.one'));

    sheet.append(head, panel, board, details);
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
    const style = document.createElement('style');
    style.textContent = [...document.styleSheets[0].cssRules].map((rule) => rule === darkRule
        ? `@media ${isDark() ? 'all' : 'not all'} {${[...rule.cssRules].map((inner) => inner.cssText).join('\n')}}`
        : rule.cssText).join('\n')
        // Картинка не грузит файлы: маску сот фона — внутрь
        .replace(/url\("?cells\.svg"?\)/g, `url("${await toDataUrl('cells.svg')}")`);
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
    // Баллы групп: «Приватность 3,9 · Скорость 6,2 · Безопасность 8,0? …»
    const groups = [...document.querySelectorAll('#board .board-row')]
        .map((el) => `${el.querySelector('.label').textContent} ${el.querySelector('.num').textContent}`
            + (el.dataset.sure === 'false' ? '?' : ''));
    if (groups.length) {
        lines.push(groups.join(' · '));
    }
    // HSTS и смешанный контент — строки раздела «Безопасность»: «HSTS: нет»
    const rows = [...document.querySelectorAll('.audit-row:is([data-key="auditHsts"], [data-key="auditMixed"])')];
    const summary = {};
    for (const [state, mark] of Object.entries(marks)) {
        const list = [...items.filter((el) => el.dataset.state === state).map(text),
            ...rows.filter((el) => el.dataset.state === state).map((el) => el.dataset.note)];
        if (list.length) {
            summary[state] = [mark, list];
        }
    }
    if (short) {
        // X: не больше 280 знаков вместе со ссылкой — оценка, баллы групп и итоги по значкам. Не влезает — обрезается
        // с конца, поэтому проблемы раньше хорошего: ❌, ⚠️, затем ✅. Строку, которая не влезла целиком,
        // сокращаем по пунктам с «…», чтобы длинный список проблем не пропал совсем
        const LIMIT = 230;
        let text = lines.join('\n');
        if (text.length > LIMIT) {
            return lines[0];
        }
        for (const [mark, list] of [summary.bad, summary.warn, summary.good].filter(Boolean)) {
            const line = `${mark} ${list.join(', ')}`;
            if (text.length + 1 + line.length <= LIMIT) {
                text += '\n' + line;
                continue;
            }
            for (let count = list.length - 1; count > 0; count--) {
                const part = `${mark} ${list.slice(0, count).join(', ')}, …`;
                if (text.length + 1 + part.length <= LIMIT) {
                    text += '\n' + part;
                    break;
                }
            }
            break;
        }
        return text;
    }
    lines.push(...[summary.good, summary.warn, summary.bad].filter(Boolean).map(([mark, list]) => `${mark} ${list.join(', ')}`));
    for (const [label, id] of [['serverLabel', 'server'], ['techLabel', 'tech']]) {
        const list = [...document.querySelectorAll(`#${id} .chip`)].map(text);
        if (list.length) {
            lines.push(`${t(label)}: ${list.join(', ')}`);
        }
    }
    const companies = document.querySelector('.audit-row[data-key="auditTracking"]')?.dataset.names;
    lines.push(`${t('companiesLabel')}: ${companies || t('companiesNone')}`);
    lines.push('', t('reportShareFoot'));
    return lines.join('\n');
}

/**
 * Значок действия ненадолго подсвечивается, подсказка сообщает результат и затем возвращается
 * @param {HTMLElement} button
 * @param {string} key ключ перевода
 */
function showDone(button, key) {
    const title = button.dataset.title ??= button.title;
    clearTimeout(button.doneTimer);
    button.dataset.done = '';
    button.title = t(key);
    button.doneTimer = setTimeout(() => {
        delete button.dataset.done;
        button.title = title;
    }, 1500);
}

/**
 * Соцсети языка окна в меню «Поделиться» — значки из шаблона #networks по порядку NETWORKS_BY_LANG.
 * Ссылка пересобирается перед любым её использованием (нажатие, средняя кнопка, контекстное меню, фокус):
 * текст к этому времени мог измениться — оценку пересчитывают, когда страница догрузилась
 * @param {Element} box .networks меню
 * @param {function(boolean): string} getText текст; true — короткий (лимит X) или нужна только первая строка
 * @param {function(Object): string} [hint] вторая строка подсказки значка
 */
function setupNetworks(box, getText, hint = () => '') {
    const template = document.getElementById('networks').content;
    for (const id of NETWORKS_BY_LANG[LANG] || NETWORKS_BY_LANG[LANG.split('-')[0]] || NETWORKS_BY_LANG.en) {
        const network = NETWORKS[id];
        const link = template.querySelector(`[data-network="${id}"]`).cloneNode(true);
        link.title = [t(network.kind === 'send' ? 'shareSend' : 'sharePost', network.name), hint(network)]
            .filter(Boolean).join('\n');
        // Ссылка есть сразу — значок доступен с клавиатуры
        const update = () => {
            const text = getText(network.short || network.title);
            link.href = network.url(STORE_URL, network.title ? text.split('\n')[0] : text);
        };
        update();
        for (const type of ['pointerdown', 'focus', 'contextmenu', 'auxclick', 'click']) {
            link.addEventListener(type, update);
        }
        box.append(link);
    }
}

/**
 * «Поделиться» отчётом о сайте: картинка (в буфер, файлом, системным меню) или текст (Telegram, VK, буфер).
 * Открывается значком в шапке раскрытой оценки и строкой в её конце — меню появляется под нажатым
 * @param {string} host
 * @param {{result: ?Object}} score оценка, актуальная на момент нажатия
 */
function setupReport(host, score) {
    // Картинка рисуется один раз, а заново — если оценка пересчитана (страница догрузилась)
    let image = null;
    let imageResult = null;
    const getImage = () => {
        if (imageResult !== score.result) {
            imageResult = score.result;
            image = renderReport(host);
        }
        return image;
    };
    const fileName = `ablock-${host}-${new Date().toISOString().slice(0, 10)}.png`;

    // Меню — под строкой «Поделиться» в конце раскрытого вида
    const menu = document.getElementById('share-menu');
    document.getElementById('share').addEventListener('click', () => {
        menu.hidden = !menu.hidden;
        if (!menu.hidden) {
            menu.scrollIntoView({block: 'nearest'});
        }
    });

    const copyImage = document.getElementById('share-image');
    copyImage.addEventListener('click', async () => {
        // Буфер — сразу в обработчике нажатия, пока браузер разрешает; картинка дорисуется
        await navigator.clipboard.write([new ClipboardItem({'image/png': getImage()})]);
        showDone(copyImage, 'copied');
    });

    const save = document.getElementById('share-save');
    save.addEventListener('click', async () => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(await getImage());
        link.download = fileName;
        link.click();
        showDone(save, 'reportDone');
    });

    // Текст собирается при нажатии: к этому времени страница могла догрузиться
    setupNetworks(menu.querySelector('.networks'), (short) => reportText(host, short),
        (network) => t(network.linkOnly ? 'shareLinkOnly' : 'shareAsText'));
    const copyText = document.getElementById('share-text');
    copyText.addEventListener('click', async () => {
        await navigator.clipboard.writeText(`${reportText(host)} ${STORE_URL}`);
        showDone(copyText, 'copied');
    });

    // Системное меню «Поделиться» с файлом: Windows, macOS, ChromeOS (на Linux его нет)
    const system = document.getElementById('share-system');
    system.hidden = !navigator.canShare?.({files: [new File([''], fileName, {type: 'image/png'})]});
    system.addEventListener('click', async () => {
        const file = new File([await getImage()], fileName, {type: 'image/png'});
        await navigator.share({files: [file], text: `${reportText(host)} ${STORE_URL}`}).catch(() => null);
    });
}

/**
 * Строка «Очистить данные сайта» после переключателей: корзина удаляет всё, что браузер хранит для сайта,
 * и перезагружает страницу — значки и оценка покажут сайт таким, каким его видит новый посетитель.
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
    document.getElementById('clear-row').hidden = false;

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
    document.getElementById('stats-text').title = t('statsTitle',
        new Date(stats?.since || Date.now()).toLocaleDateString(LANG));
}

/**
 * «Поделиться» ссылкой на расширение из карточки статистики: ссылка на магазин в буфер, системным меню
 * или в соцсети языка окна. Текст — название и описание расширения; меню — под значками, в той же карточке
 */
function setupExtensionShare() {
    const text = `${t('extName')}\n${t('extDescription')}`;
    const card = document.getElementById('stats');
    const button = document.getElementById('stats-share');
    const menu = document.getElementById('stats-menu');
    const toggle = (open) => {
        menu.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
    };
    button.addEventListener('click', () => {
        toggle(menu.hidden);
        if (!menu.hidden) {
            menu.scrollIntoView({block: 'nearest'});
        }
    });
    // Escape закрывает открытое меню, а не окно; фокус — обратно на значок
    card.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !menu.hidden) {
            event.preventDefault();
            toggle(false);
            button.focus();
        }
    });

    const copy = document.getElementById('stats-copy');
    copy.addEventListener('click', async () => {
        await navigator.clipboard.writeText(STORE_URL);
        showDone(copy, 'copied');
    });
    // Системное меню «Поделиться»: Windows, macOS, ChromeOS (на Linux его нет)
    const system = document.getElementById('stats-system');
    system.hidden = !navigator.canShare?.({url: STORE_URL});
    system.addEventListener('click', () => {
        navigator.share({title: t('extName'), text, url: STORE_URL}).catch(() => null);
    });
    setupNetworks(menu.querySelector('.networks'), () => text);
}

/**
 * Область оповещений над переключателями: одна карточка за раз. По порядку — просьба оценить в магазине,
 * просьба поддержать (когда просьбу оценить уже закрыли), плашка расширенного режима, без неё — статистика.
 * Просьбы — один раз: после кнопки или крестика сразу видна следующая карточка.
 * Всё считается в браузере, наружу ничего не уходит
 * @param {boolean} extended
 * @param {?Object} stats Статистика расширенного режима, null без него
 */
async function renderNotices(extended, stats) {
    // Хранилище не прочиталось — просьб нет, но расширенный режим или статистика видны
    const stored = await chrome.storage.local.get(['aBlockInstalled', 'aBlockRated', 'aBlockAsked'])
        .catch(() => null);
    const seen = stored || {};
    const days = (time) => time ? (Date.now() - time) / 86400000 : 0;
    const cards = [
        ['rate', () => !seen.aBlockRated && days(seen.aBlockInstalled) >= RATE_DAYS],
        ['ask', () => Boolean(DONATE_URL) && !seen.aBlockAsked && days(seen.aBlockRated) >= ASK_DAYS],
        ['extended', () => !extended],
        ['stats', () => extended]
    ];
    // Главная кнопка карточки — куда перевести фокус, если закрыли предыдущую
    const focusTarget = {rate: 'rate-button', ask: 'ask-button', extended: 'extended-button', stats: 'stats-text'};
    const show = () => {
        const [shown] = cards.find(([, when]) => when()) || [];
        for (const [id] of cards) {
            document.getElementById(id).hidden = id !== shown;
        }
        return shown;
    };
    // Кнопка просьбы открывает ссылку, крестик — «больше не показывать»; то и другое запоминается.
    // Новая вкладка закрывает окно: сначала запоминаем, потом открываем
    const once = (id, url, key) => {
        const done = async () => {
            // Фокус был в закрытой карточке — без переноса он ушёл бы на body
            const focused = document.getElementById(id).contains(document.activeElement);
            seen[key] = Date.now();
            const shown = show();
            if (focused && shown) {
                document.getElementById(focusTarget[shown]).focus();
            }
            await chrome.storage.local.set({[key]: seen[key]}).catch(() => null);
        };
        const link = document.getElementById(`${id}-button`);
        link.href = url;
        const open = async (event) => {
            if (event.type === 'auxclick' && event.button !== 1) {
                return;
            }
            event.preventDefault();
            await done();
            // Средняя кнопка открывает фоновую вкладку, оставляя окно и новую карточку видимыми
            chrome.tabs.create({url, active: event.type !== 'auxclick'});
        };
        link.addEventListener('click', open);
        link.addEventListener('auxclick', open);
        document.getElementById(`${id}-close`).addEventListener('click', done);
    };
    once('rate', STORE_URL, 'aBlockRated');
    once('ask', DONATE_URL, 'aBlockAsked');
    // Палец вверх в статистике — та же оценка в магазине: просьба оценить после него не появится.
    // Время первой оценки не переписываем — от него считается просьба поддержать; хранилище не прочиталось —
    // не пишем вовсе: оценка могла уже быть. Магазин открывается, даже если запись не удалась
    const rate = document.getElementById('stats-rate');
    rate.href = STORE_URL;
    const openRate = async (event) => {
        if (event.type === 'auxclick' && event.button !== 1) {
            return;
        }
        event.preventDefault();
        if (stored && !seen.aBlockRated) {
            seen.aBlockRated = Date.now();
            await chrome.storage.local.set({aBlockRated: seen.aBlockRated}).catch(() => null);
        }
        chrome.tabs.create({url: STORE_URL, active: event.type !== 'auxclick'});
    };
    rate.addEventListener('click', openRate);
    rate.addEventListener('auxclick', openRate);
    document.getElementById('ask-text').textContent = (stats?.requests || 0) >= ASK_REQUESTS
        ? t('askStats', formatNumber(stats.requests), formatSize(stats.bytes || 0))
        : t('askTime');
    show();
}

/** Доступ к своему хосту и варианту с www, без поддоменов */
function siteOrigins(host) {
    return (/^[\d.]+$|:/.test(host) ? [host] : [host, 'www.' + host]).map((h) => `*://${h}/*`);
}

/** Строка пипетки: открытие окна ничего не меняет на странице */
async function setupPicker(tab, host, active) {
    const row = document.getElementById('pick-row');
    const button = document.getElementById('pick');
    const countButton = document.getElementById('pick-count');
    const hint = document.getElementById('pick-hint');
    const message = document.getElementById('pick-message');
    const permission = document.getElementById('pick-permission');
    let count = 0;
    let access = false;
    let notice = '';
    let timer;
    let revision = 0;

    function render() {
        const enabled = active();
        button.disabled = !enabled;
        document.getElementById('pick-label').dataset.off = String(!enabled);
        button.title = t(enabled ? 'pickTitle' : 'pickOff');
        const hidePermission = !enabled || access || !count || Boolean(notice);
        if ((!count && countButton.contains(document.activeElement))
            || (hidePermission && permission.contains(document.activeElement))) {
            (button.disabled ? document.getElementById('button') : button).focus();
        }
        countButton.hidden = !count;
        countButton.textContent = `${count} ›`;
        countButton.title = t('pickCountTitle', count);
        countButton.setAttribute('aria-label', countButton.title);
        permission.hidden = hidePermission;
        message.textContent = !enabled ? t('pickOff') : notice || (!access && count ? t('pickTemp') : '');
        hint.hidden = !message.textContent;
    }

    function announce(key) {
        clearTimeout(timer);
        notice = t(key);
        render();
        timer = setTimeout(() => {
            notice = '';
            render();
        }, 3000);
    }

    async function refresh() {
        const current = ++revision;
        const [stored, extended, siteAccess] = await Promise.all([
            chrome.storage.local.get('aBlockCustom').catch(() => ({})),
            chrome.permissions.contains(EXTENDED).catch(() => false),
            chrome.permissions.contains({origins: [`*://${host}/*`]}).catch(() => false)
        ]);
        if (current !== revision) {
            return;
        }
        count = stored.aBlockCustom?.[host]?.length || 0;
        access = extended || siteAccess;
        render();
    }

    document.getElementById('pick-allow').addEventListener('click', async () => {
        // Запрос первым вызовом: сохраняем пользовательский жест и при закрытии окна диалогом.
        const granted = await chrome.permissions.request({origins: siteOrigins(host)}).catch(() => false);
        await refresh();
        if (granted && access) {
            announce('pickAllowed');
        }
    });
    button.addEventListener('click', async () => {
        if (!active() || button.disabled) {
            return;
        }
        button.disabled = true;
        const keys = ['pickHint', 'pickHintTouch', 'pickEsc', 'pickWider', 'pickNarrower', 'pickHide',
            'pickCancel', 'pickMatches', 'pickMatchesAll', 'pickDone', 'pickDoneList', 'pickDoneTemp',
            'pickDoneTempSave', 'pickLimit', 'kindImage', 'kindVideo', 'kindFrame', 'kindBanner',
            'kindDialog', 'kindBlock', 'pickQuote'];
        // Подстановки выполняет панель на странице, поэтому передаём шаблоны с $1.
        const cfg = {strings: Object.fromEntries(keys.map((key) => [key, t(key, '$1')])),
            dir: document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'};
        try {
            await chrome.scripting.executeScript({target: {tabId: tab.id},
                func: (c) => { globalThis.aBlockPickerConfig = c; }, args: [cfg]});
            await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['page/picker-core.js', 'page/picker.js']});
            window.close();
        } catch {
            render();
        }
    });
    countButton.addEventListener('click', () => {
        if (typeof globalThis.openHidden !== 'function') {
            return;
        }
        globalThis.openHidden({tab, host, active: active(), access, onClose: async (changed) => {
            await refresh();
            if (changed && !count) {
                announce('pickCleared');
            }
            (count ? countButton : active() ? button : document.getElementById('button')).focus();
        }});
    });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.aBlockCustom) {
            refresh();
        }
    });
    chrome.permissions.onAdded.addListener(refresh);
    chrome.permissions.onRemoved.addListener(refresh);
    await refresh();
    row.hidden = false;
    return render;
}

document.addEventListener('DOMContentLoaded', async function () {

    await loadLocale();
    translatePage();
    initLanguage();
    initTheme();
    setupTips();

    const donate = document.getElementById('donate');
    donate.href = DONATE_URL;
    donate.hidden = !DONATE_URL;

    const bg = document.getElementById('bg');
    const label = document.getElementById('status');

    // Текущие настройки (по умолчанию всё включено)
    const {aBlockStorage, aBlockSettings, aBlockAllowed} = await chrome.storage.local.get(
        ['aBlockStorage', 'aBlockSettings', 'aBlockAllowed']).catch(() => ({}));
    let status = aBlockStorage?.status ?? true;

    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const isSite = /^https?:/.test(tab?.url || '');

    // Защита на этом сайте: отключена для него самого или для домена, в который он входит
    const host = isSite ? new URL(tab.url).hostname.replace(/^www\./, '') : '';
    let allowedEntry = (aBlockAllowed || []).find((h) => host === h || host.endsWith('.' + h));
    // Защита действует на этой странице
    const active = () => status && !allowedEntry;

    let renderPicker = () => {};

    // Отображает статус
    function render() {
        bg.dataset.status = String(active());
        label.dataset.status = String(active());
        label.textContent = t(!status ? 'statusOff' : allowedEntry ? 'statusSiteOff' : 'statusOn');
        renderPicker();
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

    // Пока настройка сохраняется и страница загружается, новое переключение недоступно
    function setProtectionBusy(busy) {
        shield.disabled = busy;
        site.disabled = busy;
    }

    // Окно обновляется один раз после загрузки вкладки
    async function reloadSite() {
        function onUpdated(id, change) {
            if (id === tab.id && change.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(onUpdated);
                setTimeout(() => location.reload(), 1000);
            }
        }
        chrome.tabs.onUpdated.addListener(onUpdated);
        try {
            await chrome.tabs.reload(tab.id);
        } catch {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            setProtectionBusy(false);
        }
    }

    /**
     * Включает или отключает защиту на этом сайте и перезагружает страницу: правила действуют на новые запросы.
     * Окно обновится вслед за страницей
     * @param {boolean} enabled
     */
    async function setSite(enabled) {
        if (shield.disabled) {
            return;
        }
        setProtectionBusy(true);
        const saved = await chrome.runtime.sendMessage({site: allowedEntry || host, enabled}).catch(() => false);
        if (saved !== true) {
            // Фоновый скрипт не сохранил настройку (например, старая версия после обновления файлов)
            site.checked = !allowedEntry;
            setProtectionBusy(false);
            return;
        }
        allowedEntry = enabled ? undefined : allowedEntry || host;
        site.checked = enabled;
        render();
        await reloadSite();
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
    // Фокус при открытии — на щите (главное действие), а не на первом значке. Пока окно было скрыто, autofocus
    // мог не сработать. Рамка фокуса — только когда начали пользоваться клавиатурой
    const shield = document.getElementById('button');
    if (document.activeElement === document.body) {
        shield.focus();
    }
    shield.dataset.quiet = '';
    const loud = () => delete shield.dataset.quiet;
    document.addEventListener('keydown', loud, {once: true});
    shield.addEventListener('blur', loud, {once: true});

    let info = null;
    let server = null; // Данные расширенного режима о вкладке

    // Нажатие на кнопку. Если защита отключена только на этом сайте — щит возвращает её сайту
    document.getElementById('button').addEventListener('click', async function () {
        if (shield.disabled) {
            return;
        }
        if (status && allowedEntry) {
            setSite(true);
            return;
        }
        setProtectionBusy(true);
        const saved = await chrome.runtime.sendMessage({status: !status}).catch(() => false);
        if (saved !== true) {
            // Фоновый скрипт не сохранил настройку
            setProtectionBusy(false);
            return;
        }
        status = !status;
        render();
        if (isSite) {
            renderBlocked(tab, info, active(), server);
            await reloadSite();
        } else {
            setProtectionBusy(false);
        }
    });

    // Расширенный режим: включение или статистика
    const extended = await chrome.permissions.contains(EXTENDED);
    // Выключение — внизу раскрытой оценки: заголовки, хостинг и статистика пропадут, доступ ко всем сайтам будет снят
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
        setupExtensionShare();
        renderNotices(true, response?.stats).catch(console.error);
        // Данные относятся к этой странице, а не к предыдущей на вкладке
        if (isSite && response?.tab?.host === new URL(tab.url).hostname) {
            server = response.tab;
        }
    } else {
        renderNotices(false, null).catch(console.error);
    }

    // Значки и подробности только для обычных сайтов
    if (!isSite) {
        return;
    }
    // Движок и аудит смотрят разметку: браузер выполнит их, когда страница разберётся (на медленной — через
    // несколько секунд). Значки и блокировки показываем, не дожидаясь их
    const techResult = chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['page/inspect.js'], world: 'MAIN'})
        .then(([{result}]) => result || [])
        .catch(() => []);
    const auditResult = runAudit(tab.id)
        .catch(() => null);
    // Оценка по группам; пересчитывается, если время загрузки придёт позже
    const score = {result: null};
    let rescore = null;
    info = await renderSite(tab, server, () => rescore?.());
    if (!info) {
        return; // Страница недоступна для расширений (магазин, настройки)
    }
    renderPicker = await setupPicker(tab, host, active);
    setupClear(tab);
    await renderBlocked(tab, info, active(), server);
    const companies = await findCompanies(info, server, active());
    await renderServer(server, extended);
    renderExtra(server);

    const [tech, auditInjection] = await Promise.all([techResult, auditResult]);
    const audit = await acceptAudit(tab.id, auditInjection, info);
    renderTech(tech, server);
    const rows = renderAudit(audit, server, extended, info, companies, await loadData('companies').catch(() => []));
    renderRedirectCauses(await readTabRedirects(tab.id));
    rescore = () => {
        score.result = renderScore(info, companies, audit, rows, server);
    };
    rescore();
    document.getElementById('score').hidden = false;
    setupScoreToggle();
    setupReport(new URL(tab.url).hostname, score);

});
