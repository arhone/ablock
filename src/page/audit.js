/**
 * @author AlekseyArh
 * @link https://github.com/arhone/ablock
 *
 * Выполняется на странице по запросу окна расширения: метрики скорости, SEO, вёрстка, доступность.
 * Только то, что браузер уже знает, и быстрые запросы к странице — без записи загрузки и отладчика.
 * Результат — последнее выражение файла (обещание, окно дождётся его).
 */
(async () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const start = navigation?.activationStart || 0;

    /**
     * Уже записанные браузером замеры. Если замеров нет, обработчик не вызывается — ждём недолго
     * @param {Object} options
     * @returns {Promise<PerformanceEntry[]>}
     */
    const recorded = (options) => new Promise((resolve) => {
        try {
            const observer = new PerformanceObserver((list) => {
                observer.disconnect();
                resolve(list.getEntries());
            });
            observer.observe({...options, buffered: true});
            setTimeout(() => {
                observer.disconnect();
                resolve([]);
            }, 60);
        } catch {
            resolve([]); // Тип замеров не поддерживается
        }
    });
    // Известные ИИ-боты: по имени в robots.txt больше никак не понять, что бот собирает тексты для нейросетей
    const AI_BOTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-Web', 'anthropic-ai',
        'Google-Extended', 'PerplexityBot', 'CCBot', 'Bytespider', 'Applebot-Extended', 'meta-externalagent',
        'Amazonbot', 'cohere-ai', 'Diffbot', 'YandexAdditional'];

    /**
     * Текстовый файл сайта. SPA часто отвечают на любой адрес своей главной — такой ответ не считаем
     * @param {string} path
     * @returns {Promise<?string|undefined>} null — файла нет, undefined — сайт не ответил вовремя (не знаем)
     */
    const siteFile = async (path) => {
        try {
            const response = await fetch(path, {signal: AbortSignal.timeout(2000), credentials: 'omit', redirect: 'follow'});
            const type = response.headers.get('content-type') || '';
            if (!response.ok || /html/i.test(type)) {
                return null;
            }
            const text = (await response.text()).slice(0, 100000);
            return /^\s*</.test(text) ? null : text;
        } catch {
            return undefined;
        }
    };

    /**
     * robots.txt: закрыта ли эта страница для всех роботов, есть ли карта сайта, сколько ИИ-ботов запрещено.
     * Как у поисковиков: побеждает самое длинное правило, при равенстве — Allow
     * @param {?string} text
     * @returns {?Object}
     */
    const parseRobots = (text) => {
        if (typeof text !== 'string') {
            return null;
        }
        const groups = [];
        let group = null;
        let sitemap = false;
        for (const raw of text.split(/\r?\n/)) {
            const [, key, value = ''] = /^\s*([\w-]+)\s*:\s*(.*?)\s*$/.exec(raw.replace(/#.*/, '')) || [];
            const name = key?.toLowerCase();
            if (name === 'sitemap') {
                sitemap = true;
            } else if (name === 'user-agent') {
                if (!group || group.rules.length) {
                    group = {agents: [], rules: []};
                    groups.push(group);
                }
                group.agents.push(value.toLowerCase());
            } else if ((name === 'allow' || name === 'disallow') && group) {
                group.rules.push({allow: name === 'allow', path: value});
            }
        }
        const rulesFor = (agent) => groups.filter((g) => g.agents.includes(agent)).flatMap((g) => g.rules);
        const blocked = (rules, path) => {
            let best = null;
            for (const rule of rules.filter((r) => r.path)) {
                // «*» — любые символы, «$» в конце — конец адреса
                const anchored = rule.path.endsWith('$');
                const pattern = (anchored ? rule.path.slice(0, -1) : rule.path)
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
                if (new RegExp('^' + pattern + (anchored ? '$' : '')).test(path)
                    && (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow))) {
                    best = rule;
                }
            }
            return !!best && !best.allow;
        };
        const all = rulesFor('*');
        // ИИ-боты, названные в robots.txt по имени. Общий запрет «User-agent: *» — не правило для ИИ
        const named = AI_BOTS.filter((bot) => rulesFor(bot.toLowerCase()).length);
        return {
            blocked: blocked(all, location.pathname + location.search),
            closed: blocked(all, '/'),
            sitemap,
            aiNamed: named.length,
            // Запрещён — закрыт весь сайт
            aiBlocked: named.filter((bot) => blocked(rulesFor(bot.toLowerCase()), '/'))
        };
    };

    // Всё ожидание — параллельно: окно ждёт не дольше самого медленного (обычно 60 мс, файлы сайта — до 2 с)
    const [lcpEntries, shifts, events, robotsText, llms, securityTxt] = await Promise.all([
        recorded({type: 'largest-contentful-paint'}),
        recorded({type: 'layout-shift'}),
        recorded({type: 'event', durationThreshold: 16}),
        siteFile('/robots.txt'),
        siteFile('/llms.txt'),
        siteFile('/.well-known/security.txt')
    ]);
    const robots = parseRobots(robotsText);

    // CLS — самая «прыгучая» серия сдвигов: перерывы меньше 1 с, вся серия не дольше 5 с (как у Google)
    let cls = 0;
    let session = 0;
    let first = 0;
    let last = 0;
    for (const shift of shifts) {
        if (shift.hadRecentInput) {
            continue;
        }
        if (session && shift.startTime - last < 1000 && shift.startTime - first < 5000) {
            session += shift.value;
        } else {
            session = shift.value;
            first = shift.startTime;
        }
        last = shift.startTime;
        cls = Math.max(cls, session);
    }

    // INP — самая долгая реакция на клик или ввод (для небольшого числа действий так и считается)
    const interactions = events.filter((event) => event.interactionId > 0);
    const inp = interactions.length ? Math.max(...interactions.map((event) => event.duration)) : null;

    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const lcp = lcpEntries[lcpEntries.length - 1];
    const resources = performance.getEntriesByType('resource');

    const vitals = {
        ttfb: navigation?.responseStart > 0 ? Math.max(0, navigation.responseStart - start) : null,
        fcp: fcp ? Math.max(0, fcp.startTime - start) : null,
        lcp: lcp ? Math.max(0, lcp.startTime - start) : null,
        // Сдвиги не записаны, если вкладка грузилась в фоне, — тогда не знаем
        cls: shifts.length || lcp ? Math.round(cls * 1000) / 1000 : null,
        inp,
        blocking: resources.filter((entry) => entry.renderBlockingStatus === 'blocking').length,
        blockingScripts: resources.filter((entry) => entry.renderBlockingStatus === 'blocking'
            && entry.initiatorType === 'script').length,
        // Страница целиком из кэша браузера — сервер не спрашивали
        browserCache: navigation?.deliveryType === 'cache' || (navigation?.transferSize === 0 && navigation?.decodedBodySize > 0)
    };

    // SEO
    const meta = (selector) => document.querySelector(selector)?.getAttribute('content')?.trim() ?? null;
    const robotsMeta = [...document.querySelectorAll('meta[name="robots" i], meta[name="googlebot" i], meta[name="yandex" i]')]
        .map((el) => el.content).join(',');
    // Целые значения через запятую: «max-image-preview:none» — не запрет индексации
    const noindex = robotsMeta.split(',').some((value) => /^\s*(noindex|none)\s*$/i.test(value));
    const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
    const viewport = meta('meta[name="viewport" i]');
    const seo = {
        status: navigation?.responseStatus || 0,
        robots,
        llms: typeof llms === 'string',
        noindex,
        title: document.title.trim().length,
        description: meta('meta[name="description" i]')?.length ?? null,
        h1: document.querySelectorAll('h1').length,
        canonical: canonical ? (new URL(canonical).hostname === location.hostname ? 'same' : 'other') : '',
        ogTitle: !!meta('meta[property="og:title" i]'),
        ogImage: !!meta('meta[property="og:image" i]'),
        viewport: viewport !== null,
        zoomOff: viewport !== null && (/user-scalable\s*=\s*(no|0)/i.test(viewport)
            || parseFloat(/maximum-scale\s*=\s*([\d.]+)/i.exec(viewport)?.[1] ?? '5') < 2)
    };

    // Картинки: первые 300 — на тяжёлых страницах этого хватает и это быстро
    const images = [...document.images].slice(0, 300);
    const dpr = window.devicePixelRatio || 1;
    let noSize = 0;
    let large = 0;
    let modern = 0;
    let typed = 0;
    let guessed = 0;
    const contentTypes = new Map(resources.filter((entry) => entry.contentType).map((entry) => [entry.name, entry.contentType]));
    for (const img of images) {
        // Не загружена, служебный пиксель или скрыта (слайд карусели): размер на экране неизвестен
        if (!img.currentSrc || img.clientWidth < 2 || img.clientHeight < 2) {
            continue;
        }
        if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
            const style = getComputedStyle(img);
            // Место зарезервировано стилями — сдвига не будет
            if (style.aspectRatio === 'auto' && !(img.style.width && img.style.height)
                && style.position !== 'absolute' && style.position !== 'fixed') {
                noSize++;
            }
        }
        if (img.naturalWidth > 600 && img.naturalWidth > img.clientWidth * dpr * 2) {
            large++;
        }
        // Настоящий тип браузер сообщает для картинок самого сайта; для чужих — только расширение в адресе
        const type = contentTypes.get(img.currentSrc)?.replace('image/', '').replace('jpeg', 'jpg');
        const ext = type || /\.(\w+)(?:$|\?)/.exec(new URL(img.currentSrc, location.href).pathname)?.[1]?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext)) {
            typed++;
            guessed += type ? 0 : 1;
            if (ext === 'webp' || ext === 'avif') {
                modern++;
            }
        }
    }

    // Доступность: только простые проверки разметки
    const named = (el) => (el.textContent || '').trim() || el.getAttribute('aria-label')?.trim()
        || el.getAttribute('aria-labelledby') || el.getAttribute('title')?.trim()
        || el.querySelector('img[alt]:not([alt=""]), svg title, [aria-label]');
    const hidden = (el) => el.closest('[hidden], [aria-hidden="true"]') || !el.getClientRects().length;
    const controls = [...document.querySelectorAll('button, [role="button"], a[href]')].slice(0, 1000);
    const fields = [...document.querySelectorAll('input:not([type="hidden"], [type="submit"], [type="button"], [type="reset"], [type="image"]), select, textarea')]
        .slice(0, 300);
    const labelled = (el) => el.labels?.length || el.getAttribute('aria-label')?.trim() || el.getAttribute('aria-labelledby')
        || el.getAttribute('title')?.trim() || el.getAttribute('placeholder')?.trim();
    const a11y = {
        lang: document.documentElement.lang || '',
        alt: images.filter((img) => !img.hasAttribute('alt') && img.getAttribute('role') !== 'presentation' && !hidden(img)).length,
        labels: fields.filter((el) => !labelled(el) && !hidden(el)).length,
        names: controls.filter((el) => !named(el) && !hidden(el)).length,
        main: !!document.querySelector('main, [role="main"]')
    };

    return {
        vitals,
        seo,
        // Файлы, которые не удалось проверить: сайт не ответил за 2 секунды или сеть недоступна
        unchecked: {
            robots: robotsText === undefined,
            llms: llms === undefined,
            securityTxt: securityTxt === undefined
        },
        markup: {
            quirks: document.compatMode === 'BackCompat',
            noSize,
            large,
            modern,
            typed,
            guessed
        },
        a11y,
        security: {
            csp: document.querySelector('meta[http-equiv="Content-Security-Policy" i]')?.content || '',
            securityTxt: typeof securityTxt === 'string' && /contact\s*:/i.test(securityTxt),
            // Cookie входа, которые видит JavaScript (без HttpOnly), — по названию, это догадка
            sessionCookies: document.cookie.split(/;\s*/).map((c) => c.split('=')[0])
                .filter((name) => /sess|sid$|^sid|token|auth|jwt/i.test(name)).slice(0, 3)
        }
    };
})();
