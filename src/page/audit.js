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
     * Контракт audit.causes v1: только JSON-факты главного документа, без влияния на оценку.
     * context: documentUrl (origin + путь до 512 символов, без userinfo/query/hash),
     * timeOrigin и capturedAt (epoch ms), scope: top-document, navigationType (строка|null),
     * activationStart (ms|null). documentId берёт окно из результата executeScript, не из страницы.
     * Каждый раздел: {status, reasons: string[], truncated: boolean, data: object|null}.
     * status: ok — доступные факты собраны; partial — собраны с ограничениями;
     * unavailable — нет данных; unsupported — нет нужного API. null — неизвестно, 0 — измеренный ноль.
     * Все времена/длительности — ms без форматирования, CLS — безразмерная величина.
     *
     * Реестр reasons (стабильные коды, не тексты интерфейса):
     * not-collected — сборщик ещё не подключён; api-unsupported — API отсутствует;
     * no-entry — буфер не содержит записи; buffer-dropped — браузер отбросил записи;
     * budget-exceeded — исчерпан бюджет обработки; result-limit — результат обрезан;
     * navigation-missing — нет Navigation Timing; timing-restricted — сетевые отметки скрыты;
     * prerender — активация предварительно загруженного документа; bfcache — восстановление;
     * element-unavailable — узел удалён/скрыт; resource-unmatched — ресурс не сопоставлен;
     * text-lcp — у текстового LCP нет сетевых фаз; sources-unavailable — нет источников CLS;
     * resource-ambiguous — несколько подходящих ресурсов; timing-inconsistent — фазы не согласованы;
     * timing-incomplete — отметки отсутствуют; redirect-unavailable — редиректы не раскрыты;
     * render-time-unavailable — нет времени отрисовки LCP; service-worker — участие SW;
     * browser-cache — доставка из кэша; interim-response — промежуточный ответ (код неизвестен);
     * history-navigation — переход по истории (попадание в bfcache не доказано);
     * preload-unresolved — нельзя сопоставить responsive preload/media без догадки;
     * scripts-excluded — записи скриптов вне подтверждённой атрибуции self исключены;
     * attribution-unavailable — у кадра нет скриптов или у скрипта нет безопасного источника;
     * collection-failed — изолированный сбой сборщика, раздел недоступен, остальной аудит продолжается.
     * truncated=true только при отсечении фактов лимитом/бюджетом, не просто при unavailable.
     *
     * Формат data (у недоступного раздела целиком null):
     * lcp: {value, startTime, size, kind: image|text|unknown, element, resourceUrl,
     *   phases: {ttfb, resourceLoadDelay, resourceLoadDuration, elementRenderDelay},
     *   longestPhase, attributes: {loading, fetchPriority}, preload: boolean|null}.
     * element: {tag: string} | null — только имя тега, без id/class/текста/HTML/атрибутов сайта.
     * attributes — текущие значения известных enum, не доказательство значений при загрузке.
     * Для text/неполного timing неизвестные сетевые фазы null. Фазы неотрицательны,
     * при полном разложении их сумма равна value; prerender/bfcache не раскладываем механически.
     * cls: {value, session: {startTime, endTime}|null, shifts: [
     *   {startTime, value, sources: [{element, previousRect, currentRect, imageWithoutDimensions}]}]}.
     * rect: {x,y,width,height}|null; shifts — только максимальная серия, без hadRecentInput.
     * До 200 сдвигов и 10 источников суммарно (повторный узел — отдельное наблюдение); value принадлежит сдвигу, не дублируется у его источников.
     * imageWithoutDimensions: boolean|null — у img сейчас нет обоих атрибутов размеров;
     * только гипотеза о незарезервированном месте, CSS и прежняя разметка неизвестны.
     * Сдвинувшийся элемент — факт, а не доказанный виновник; отсутствующий узел — null.
     * ttfb: {value, phases: {redirect, dns, connection, tls, requestWait, unaccounted},
     *   responseStart, finalResponseHeadersStart, firstInterimResponseStart, workerStart, deliveryType, browserCache,
     *   serverTiming: [{name, description, duration}]}.
     * connection включает tls (tls не прибавлять второй раз); requestWait — сеть + сервер.
     * responseStart сохраняет прежний смысл TTFB; finalResponseHeadersStart — отдельное
     * необязательное поле. serverTiming — до 5 записей, name до 64, description до 128 символов;
     * это объявленные сервером интервалы, они могут перекрываться и не входят в сумму фаз.
     * browserCache: boolean|null; deliveryType: cache|navigational-prefetch|null.
     * firstInterimResponseStart — необязательная отметка первого промежуточного ответа, не доказательство 103.
     * Все данные относятся к исходной навигации документа, не к новому визиту после bfcache.
     * preload — подходящий link в текущей разметке, не доказательство фактического использования.
     * Строки только текстом; URL в data сокращать как documentUrl (только http/https, иначе null).
     * Нельзя возвращать DOM, PerformanceEntry, HTML, текст страницы, cookies, query-значения.
     *
     * Бюджет следующих сборщиков: дополнительная синхронная обработка до 20 ms,
     * вычислительный аудит — ориентир до 50 ms на тяжёлом стенде (без ожидания файлов сайта).
     * Новые наблюдатели запускать параллельно существующим, без последовательного ожидания,
     * отключать по завершении/тайм-ауту. Проверять бюджет в ограниченных проходах;
     * при превышении partial + budget-exceeded + truncated. Необязательные API — по наличию.
     * LCP: до 2000 ресурсов и 100 link, общий бюджет причин 20 ms; TTFB: до 5 Server-Timing.
     * loaf: {version: 1, availableFrames, processedFrames, blockingDuration, droppedEntries,
     *   excludedScripts: {count, duration}, scripts: [{kind: url|inline|unknown, url: string|null, duration: number|null, count}]}.
     * Только доступный буфер long-animation-frame, не TBT и не полное время главного потока.
     * availableFrames — число полученных записей до лимита, processedFrames — обработанных;
     * blockingDuration — сумма по обработанным кадрам целиком, включая работу других окон;
     * не ограничивается главным документом и не распределяется между скриптами;
     * null, если кадры есть, но ни один не обработан, или длительность неизвестна.
     * scripts — только записи с windowAttribution === 'self', суммы duration по безопасному URL (без query/hash, путь до 512),
     * inline — sourceURL совпадает с адресом документа, пустой/небезопасный URL — unknown.
     * Это атрибуция браузера, не доказанная причина; имена функций/код/позиции не сохраняются.
     * count — число записей скрипта, не кадров; интервалы могут перекрываться, не складывать
     * с blockingDuration. Неизвестная длительность делает соответствующую сумму null.
     * excludedScripts — число и сумма duration обработанных записей с любой другой
     * windowAttribution (включая отсутствующую), без сохранения их URL/окон. Счётчик
     * входит в общий лимит 2000 записей; исключение даёт partial/scripts-excluded.
     * droppedEntries: number|null — потери, сообщённые callback, null если браузер не сообщил.
     * До 200 кадров, 100 источников, 2000 записей скриптов суммарно; лимиты дают partial.
     * Пустой поддерживаемый буфер: ok + no-entry, нулевые счётчики и суммы, scripts: [].
     * Нет API: unsupported/api-unsupported; ошибка наблюдения: unavailable/collection-failed.
     * Наблюдатель LoAF разделяет короткое ожидание recorded(), новых запросов нет.
     */
    const documentUrl = new URL(location.href);
    const causes = {
        version: 1,
        context: {
            documentUrl: /^https?:$/.test(documentUrl.protocol) ? documentUrl.origin + documentUrl.pathname.slice(0, 512) : null,
            timeOrigin: performance.timeOrigin,
            capturedAt: null,
            scope: 'top-document',
            navigationType: navigation?.type ?? null,
            activationStart: navigation?.activationStart ?? null
        },
        lcp: {status: 'unavailable', reasons: ['not-collected'], truncated: false, data: null},
        cls: {status: 'unavailable', reasons: ['not-collected'], truncated: false, data: null},
        ttfb: {status: 'unavailable', reasons: ['not-collected'], truncated: false, data: null},
        loaf: {status: 'unavailable', reasons: ['not-collected'], truncated: false, data: null}
    };

    /**
     * Уже записанные браузером замеры. Если замеров нет, обработчик не вызывается — ждём недолго.
     * dropped — сообщённые браузером потери (null, если не сообщил); failed — ошибка наблюдения.
     * available — число полученных записей до ограничения результата.
     * @param {Object} options
     * @param {number} limit
     * @returns {Promise<PerformanceEntry[]>}
     */
    const recorded = (options, limit = Infinity) => new Promise((resolve) => {
        let observer;
        let timer;
        const finish = (entries, info) => {
            observer?.disconnect();
            clearTimeout(timer);
            resolve(Object.assign(limit === Infinity ? entries : entries.slice(0, limit), {
                available: entries.length,
                dropped: info?.droppedEntriesCount ?? null
            }));
        };
        try {
            observer = new PerformanceObserver((list, self, info) => finish(list.getEntries(), info));
            observer.observe({...options, buffered: true});
            timer = setTimeout(() => finish(limit === Infinity ? [] : observer.takeRecords()), 60);
        } catch {
            observer?.disconnect();
            clearTimeout(timer);
            resolve(Object.assign([], {failed: true}));
        }
    });
    // Одноразовые данные из ISOLATED world того же документа. Код сайта их не видит.
    const aiCatalog = globalThis.__ablockAuditAi;
    delete globalThis.__ablockAuditAi;

    /**
     * Текстовый файл сайта. SPA часто отвечают на любой адрес своей главной — такой ответ не считаем
     * @param {string} path
     * @returns {Promise<?string|undefined>} null — файла нет, undefined — сайт не ответил вовремя (не знаем)
     */
    let robotsFileState = 'unavailable';
    const siteFile = async (path) => {
        try {
            const response = await fetch(new URL(path, location.origin), {signal: AbortSignal.timeout(2000), credentials: 'omit', redirect: 'follow'});
            const type = response.headers.get('content-type') || '';
            if (path === '/robots.txt') {
                robotsFileState = [404, 410].includes(response.status) ? 'missing' : 'unavailable';
            }
            if (!response.ok || /html/i.test(type)) {
                return null;
            }
            const text = (await response.text()).slice(0, 100000);
            if (path === '/robots.txt' && !/^\s*</.test(text)) {
                robotsFileState = 'present';
            }
            return /^\s*</.test(text) ? null : text;
        } catch {
            return undefined;
        }
    };

    /**
     * Поле robots.txt: имя в нижнем регистре и значение без пробелов по краям. Комментарий и хвостовые пробелы отбрасываем заранее
     * @param {string} raw
     * @returns {{name: ?string, value: string}}
     */
    const robotsField = (raw) => {
        const [, key, rest = ''] = /^\s*([\w-]+)\s*:(.*)$/.exec(raw.replace(/#.*/, '').trimEnd()) || [];
        return {name: key?.toLowerCase(), value: rest.trim()};
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
        for (const raw of text.split(/\r\n|[\r\n]/g)) {
            const {name, value} = robotsField(raw);
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
                    .replaceAll(/[.+?^${}()|[\]\\]/g, String.raw`\$&`).replaceAll('*', '.*');
                if (new RegExp('^' + pattern + (anchored ? '$' : '')).test(path)
                    && (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow))) {
                    best = rule;
                }
            }
            return !!best && !best.allow;
        };
        const all = rulesFor('*');
        // ИИ-боты, названные в robots.txt по имени. Общий запрет «User-agent: *» — не правило для ИИ
        const named = (aiCatalog?.tokens || []).filter((bot) => rulesFor(bot.token.toLowerCase()).length);
        return {
            blocked: blocked(all, location.pathname + location.search),
            closed: blocked(all, '/'),
            sitemap,
            // Без каталога неизвестность: окно показывает «—», а не отсутствие правил.
            aiNamed: aiCatalog ? new Set(named.map((bot) => bot.id)).size : null,
            // Запрещён — закрыт весь сайт
            aiBlocked: aiCatalog ? [...new Map(named.filter((bot) => blocked(rulesFor(bot.token.toLowerCase()), '/'))
                .map((bot) => [bot.id, bot.token])).values()] : null
        };
    };

    /**
     * Нормализация пути по RFC 9309 §2.2.2: ASCII unreserved декодируем, остальные escape сохраняем.
     * Не-ASCII переводим в UTF-8 percent-encoding; %2F и / остаются разными.
     * @param {string} path
     * @returns {string}
     */
    const normalizePath = (path) => path.replaceAll(/%[0-9a-f]{2}|[^\p{ASCII}]/giu, (part) => {
        if (part.startsWith('%')) {
            const character = String.fromCodePoint(Number.parseInt(part.slice(1), 16));
            return /^[a-z0-9._~-]$/i.test(character) ? character : part.toUpperCase();
        }
        return encodeURIComponent(part);
    });

    /** Правило robots.txt с нормализованным путём и его специфичностью (длина без «*», «$» и кодов %xx) */
    const aiRule = (allow, value) => {
        const path = normalizePath(value);
        const specificity = path.replaceAll('*', '').replace(/\$$/, '').replaceAll(/%[0-9a-f]{2}/gi, 'x').length;
        return {allow, path, specificity};
    };

    /** Агент robots.txt: новая группа, если текущая уже получила правила, иначе агент попадает в текущую */
    const aiAgentGroup = (groups, group, value) => {
        let current = group;
        if (!current || current.started) {
            current = {agents: [], rules: [], started: false};
            groups.push(current);
        }
        current.agents.push(value.toLowerCase());
        return current;
    };

    /**
     * Группы правил ИИ-ботов из robots.txt; при отсечении или нехватке времени — stop: [reason, truncated]
     * @param {string[]} lines
     * @param {number} deadline
     * @returns {{groups?: Object[], stop?: [string, boolean]}}
     */
    const parseAiGroups = (lines, deadline) => {
        const groups = [];
        let group = null;
        let rules = 0;
        for (const raw of lines) {
            if (performance.now() > deadline) {
                return {stop: ['budget-exceeded', true]};
            }
            const {name, value} = robotsField(raw);
            if (name === 'user-agent') {
                group = aiAgentGroup(groups, group, value);
            } else if ((name === 'allow' || name === 'disallow') && group) {
                group.started = true;
                if (++rules > 2000 || value.length > 2048) {
                    return {stop: ['result-limit', true]};
                }
                if (value) {
                    group.rules.push(aiRule(name === 'allow', value));
                }
            }
        }
        return {groups};
    };

    /**
     * Линейное glob-сопоставление: без регулярных выражений из недоверенного файла.
     * @returns {boolean}
     */
    const globMatch = (pattern, path, deadline) => {
        const anchored = pattern.endsWith('$');
        const glob = anchored ? pattern.slice(0, -1) : pattern + '*';
        let i = 0;
        let j = 0;
        let star = -1;
        let retry = 0;
        let steps = 0;
        while (j < path.length) {
            if (++steps % 256 === 0 && performance.now() > deadline) {
                throw new Error('robots-budget');
            }
            if (glob[i] === '*') {
                star = i++;
                retry = j;
            } else if (glob[i] === path[j]) {
                i++;
                j++;
            } else if (star >= 0) {
                i = star + 1;
                j = ++retry;
            } else {
                return false;
            }
        }
        while (glob[i] === '*') {
            i++;
        }
        return i === glob.length;
    };

    /** Запрещён ли путь самым специфичным правилом списка (при равенстве побеждает Allow) */
    const disallowedBy = (list, path, deadline) => {
        let best = null;
        let length = -1;
        for (const rule of list) {
            if (performance.now() > deadline) {
                throw new Error('robots-budget');
            }
            const specificity = rule.specificity;
            if (globMatch(rule.path, path, deadline) && (specificity > length || (specificity === length && rule.allow))) {
                best = rule;
                length = specificity;
            }
        }
        return !!best && !best.allow;
    };

    /** Группа бота: своя («named»), общая для всех («wildcard») или нет применимой («none») */
    const groupKind = (named, selected) => {
        if (named.length) {
            return 'named';
        }
        return selected.length ? 'wildcard' : 'none';
    };

    /** Правила одного токена каталога: совпадение с текущим адресом, корнем и наличие ограничений/исключений */
    const botRules = (bot, groups, target, deadline) => {
        const named = groups.filter((g) => g.agents.includes(bot.token.toLowerCase()));
        const selected = named.length ? named : groups.filter((g) => g.agents.includes('*'));
        const list = selected.flatMap((g) => g.rules);
        const current = (path) => (disallowedBy(list, path, deadline) ? 'disallowed' : 'allowed');
        return {id: bot.id, token: bot.token, status: bot.status,
            group: groupKind(named, selected),
            current: selected.length ? current(target) : null,
            restrictions: selected.length ? list.some((r) => !r.allow) : null,
            rootDisallowed: selected.length ? disallowedBy(list, '/', deadline) : null,
            exceptions: selected.length ? list.some((r) => r.allow) : null};
    };

    /** Сводка бота по его токенам: disallowed > allowed > null */
    const botCurrent = (values) => {
        if (values.has('disallowed')) {
            return 'disallowed';
        }
        return values.has('allowed') ? 'allowed' : null;
    };

    /**
     * Правила по токенам каталога, без передачи текста/путей сайта в окно.
     * data: {file: present|missing, tokens: [{id, token, status,
     * group: named|wildcard|none, current: allowed|disallowed|null,
     * restrictions: boolean|null, rootDisallowed: boolean|null, exceptions: boolean|null}],
     * bots: [{id, current: allowed|disallowed|null}]}.
     * allowed описывает только совпадение правил с текущим адресом, не согласие на использование.
     * Нет применимой группы — current=null. Сводка бота: disallowed > allowed > null.
     * До 128 токенов, 10000 строк, 2000 правил, 2048 символов на правило, адрес до 8192.
     * Кооперативный бюджет 20 ms; reasons: catalog-unavailable, file-missing, file-unavailable,
     * result-limit, budget-exceeded, collection-failed. Отсутствующий файл не означает разрешение.
     * При отсечении правил весь раздел недоступен: неполный набор не доказывает разрешение.
     */
    const collectRobotsAi = (text) => {
        const empty = (reason, truncated = false) => ({status: 'unavailable', reasons: [reason], truncated, data: null});
        if (aiCatalog?.timeOrigin !== performance.timeOrigin || !Array.isArray(aiCatalog.tokens)) {
            return empty('catalog-unavailable');
        }
        if (typeof text !== 'string') {
            return {status: robotsFileState === 'missing' ? 'ok' : 'unavailable',
                reasons: [robotsFileState === 'missing' ? 'file-missing' : 'file-unavailable'],
                truncated: false, data: robotsFileState === 'missing' ? {file: 'missing', tokens: [], bots: []} : null};
        }
        const deadline = performance.now() + 20;
        const lines = text.split(/\r\n|[\r\n]/g);
        if (lines.length > 10000 || text.length >= 100000) {
            return empty('result-limit', true);
        }
        const parsed = parseAiGroups(lines, deadline);
        if (parsed.stop) {
            return empty(...parsed.stop);
        }
        const target = normalizePath(location.pathname + location.search);
        if (target.length > 8192 || aiCatalog.tokens.length > 128) {
            return empty('result-limit', true);
        }
        const results = [];
        for (const bot of aiCatalog.tokens) {
            if (performance.now() > deadline) {
                return empty('budget-exceeded', true);
            }
            results.push(botRules(bot, parsed.groups, target, deadline));
        }
        const bots = [...new Set(results.map((r) => r.id))].map((id) => {
            const values = new Set(results.filter((r) => r.id === id).map((r) => r.current));
            return {id, current: botCurrent(values)};
        });
        return {status: 'ok', reasons: [], truncated: false, data: {file: 'present', tokens: results, bots}};
    };

    // Всё ожидание — параллельно: окно ждёт не дольше самого медленного (обычно 60 мс, файлы сайта — до 2 с)
    const [lcpEntries, shifts, events, firstInput, loafEntries, robotsText, llms, securityTxt] = await Promise.all([
        recorded({type: 'largest-contentful-paint'}),
        recorded({type: 'layout-shift'}),
        recorded({type: 'event', durationThreshold: 16}),
        recorded({type: 'first-input'}),
        typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame')
            ? recorded({type: 'long-animation-frame'}, 200) : null,
        siteFile('/robots.txt'),
        siteFile('/llms.txt'),
        siteFile('/.well-known/security.txt')
    ]);
    const robots = parseRobots(robotsText);
    try {
        causes.robotsAi = collectRobotsAi(robotsText);
    } catch (error) {
        const budget = error.message === 'robots-budget';
        causes.robotsAi = {status: 'unavailable', reasons: [budget ? 'budget-exceeded' : 'collection-failed'], truncated: budget, data: null};
    }

    /**
     * CLS — самая «прыгучая» серия сдвигов: перерывы меньше 1 с, вся серия не дольше 5 с (как у Google)
     * @returns {{cls: number, bestStart: number, bestEnd: number}} индексы лучшей серии, bestEnd = -1 — сдвигов нет
     */
    const clsSeries = (list) => {
        let cls = 0;
        let session = 0;
        let first = 0;
        let last = 0;
        let sessionStart = 0;
        let bestStart = 0;
        let bestEnd = -1;
        for (const [index, shift] of list.entries()) {
            if (shift.hadRecentInput) {
                continue;
            }
            if (session && shift.startTime - last < 1000 && shift.startTime - first < 5000) {
                session += shift.value;
            } else {
                session = shift.value;
                first = shift.startTime;
                sessionStart = index;
            }
            last = shift.startTime;
            if (session > cls) {
                bestStart = sessionStart;
                bestEnd = index;
            }
            cls = Math.max(cls, session);
        }
        return {cls, bestStart, bestEnd};
    };
    const {cls, bestStart, bestEnd} = clsSeries(shifts);

    /**
     * INP: одно действие (нажатие, отпускание, клик) — одно значение, самое долгое из его событий, как у Google.
     * До 50 действий включительно INP — самая долгая реакция, с 51-го — 98-й перцентиль: на каждые следующие
     * 50 действий отбрасываем одну самую долгую (51–100 — одну, 101–150 — две). У Google (web-vitals) перцентиль
     * уже с 50-го действия; у нас с 51-го, чтобы совпадать с пояснением «больше 50».
     * Браузер до подписки хранит только события от 104 мс, поэтому всех действий считаем по interactionCount,
     * а первое действие (first-input) хранится всегда, в своём буфере: событий нет, а первое действие есть —
     * значит, действия были и все быстрее 104 мс. Буфер событий — около 150 записей; когда он полон, браузер
     * отбрасывает новые. Долгое первое действие учитываем и по first-input: его событие могло не поместиться.
     * Быстрое — нет: в first-input только нажатие, отпускание и клик могли быть дольше
     */
    const interactionVitals = (eventList, firstList) => {
        const longest = new Map();
        for (const event of [...eventList, ...firstList.slice(0, 1).filter((entry) => entry.duration >= 104)]) {
            if (event.interactionId > 0) {
                longest.set(event.interactionId, Math.max(longest.get(event.interactionId) || 0, event.duration));
            }
        }
        // Перцентиль попал на действие быстрее 104 мс — его длительности не знаем, но оно быстрое
        const durations = [...longest.values()].sort((a, b) => b - a);
        const count = Math.max(performance.interactionCount || 0, durations.length);
        // События отброшены, а сохранённых действий меньше, чем было, — какие-то действия не знаем,
        // быстрые они или медленные: INP не называем
        const inpPartial = eventList.dropped > 0 && count > durations.length;
        const inp = inpPartial ? null : durations[Math.floor(Math.max(count - 1, 0) / 50)] ?? null;
        return {inp, inpPartial, count, inpMax: durations[0] ?? null};
    };
    const {inp, inpPartial, count, inpMax} = interactionVitals(events, firstInput);

    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const lcp = lcpEntries.at(-1);
    const resources = performance.getEntriesByType('resource');

    const buildVitals = () => ({
        ttfb: navigation?.responseStart > 0 ? Math.max(0, navigation.responseStart - start) : null,
        fcp: fcp ? Math.max(0, fcp.startTime - start) : null,
        lcp: lcp ? Math.max(0, lcp.startTime - start) : null,
        // Сдвиги не записаны, если вкладка грузилась в фоне, — тогда не знаем
        cls: shifts.length || lcp ? Math.round(cls * 1000) / 1000 : null,
        inp,
        // INP не записан, но действия были — все быстрее 100 мс
        inpFast: inp === null && !inpPartial && (count > 0 || firstInput.length > 0),
        // Браузер сохранил не все события — INP неизвестен
        inpPartial,
        // Самое долгое известное действие: больше INP, если перцентиль его отбросил
        inpMax,
        blocking: resources.filter((entry) => entry.renderBlockingStatus === 'blocking').length,
        blockingScripts: resources.filter((entry) => entry.renderBlockingStatus === 'blocking'
            && entry.initiatorType === 'script').length,
        // Страница целиком из кэша браузера — сервер не спрашивали
        browserCache: navigation?.deliveryType === 'cache' || (navigation?.transferSize === 0 && navigation?.decodedBodySize > 0)
    });
    const vitals = buildVitals();

    // Только дополнительные вычисления причин: прежние vitals выше остаются неизменными.
    const causeStarted = performance.now();
    const finite = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
    const positive = (value) => finite(value) !== null && value > 0 ? value : null;
    const shortUrl = (value) => {
        try {
            if (typeof value !== 'string' || value.length > 8192 || !/^https?:\/\//i.test(value)) {
                return null;
            }
            const url = new URL(value);
            return url.origin + url.pathname.slice(0, 512);
        } catch {
            return null;
        }
    };
    const reason = (section, code, partial = true) => {
        if (!section.reasons.includes(code)) {
            section.reasons.push(code);
        }
        if (partial && section.status === 'ok') {
            section.status = 'partial';
        }
    };
    const limited = (section, code) => {
        section.truncated = true;
        reason(section, code);
    };
    const budget = (section) => {
        if (performance.now() - causeStarted >= 20) {
            limited(section, 'budget-exceeded');
            return false;
        }
        return true;
    };
    // Поздняя инъекция не знает о pageshow.persisted до её запуска. Это исходные измерения
    // документа, а не запись нового визита. back_forward сам по себе не доказывает bfcache.
    const specialNavigation = (section) => {
        if (start > 0 || document.prerendering === true) {
            reason(section, 'prerender');
            return true;
        }
        if (navigation?.type === 'back_forward') {
            reason(section, 'history-navigation');
            return true;
        }
        return false;
    };

    /** Интервал между отметками TTFB; неизвестные или несогласованные отметки — null и причина */
    const ttfbInterval = (section, data, begin, end) => {
        if (positive(begin) === null || positive(end) === null) {
            reason(section, 'timing-incomplete');
            return null;
        }
        if (end < begin || end > data.responseStart) {
            reason(section, 'timing-inconsistent');
            return null;
        }
        return end - begin;
    };

    /** TLS входит в connection: отдельная фаза только при измеренном соединении и согласованной отметке TLS */
    const ttfbTls = (section, navigation, phases, interval) => {
        const tlsStart = finite(navigation.secureConnectionStart);
        if (phases.connection !== null && tlsStart !== null) {
            if (tlsStart > 0 && tlsStart >= navigation.connectStart) {
                phases.tls = interval(tlsStart, navigation.connectEnd);
            } else if (tlsStart === 0 && (phases.connection === 0 || location.protocol === 'http:')) {
                phases.tls = 0; // Измеренное отсутствие нового соединения/незашифрованный HTTP.
            }
        }
        if (phases.tls === null) {
            reason(section, 'timing-incomplete');
        }
    };

    /** Сумма непересекающихся фаз: остаток — unaccounted; несогласованные отметки — все фазы null */
    const ttfbAccount = (section, data, spans) => {
        const phases = data.phases;
        let end = 0;
        let sum = 0;
        let consistent = true;
        for (const [begin, finish, duration] of spans) {
            if (begin < end) {
                consistent = false;
            }
            end = Math.max(end, finish);
            sum += duration;
        }
        if (consistent && sum <= data.value) {
            // Включает скрытые/невыделенные интервалы; не приписываем остаток серверу.
            phases.unaccounted = data.value - sum;
        } else {
            for (const key of Object.keys(phases)) {
                phases[key] = null;
            }
            reason(section, 'timing-inconsistent');
        }
    };

    /** Фазы TTFB: непересекающиеся интервалы, нераскрытое — в unaccounted; при несогласованности все фазы null */
    const ttfbPhases = (section, data, navigation, worker) => {
        const phases = data.phases;
        const interval = (begin, end) => ttfbInterval(section, data, begin, end);
        // Нулевые redirectStart/End и redirectCount не отличают отсутствие от скрытой цепочки.
        if (positive(navigation.redirectStart) !== null && positive(navigation.redirectEnd) !== null) {
            phases.redirect = interval(navigation.redirectStart, navigation.redirectEnd);
        } else {
            reason(section, 'redirect-unavailable');
        }
        if (!worker) {
            phases.dns = interval(navigation.domainLookupStart, navigation.domainLookupEnd);
            phases.connection = interval(navigation.connectStart, navigation.connectEnd);
            ttfbTls(section, navigation, phases, interval);
        }
        phases.requestWait = interval(navigation.requestStart, data.responseStart);
        // Складываем только непересекающиеся интервалы: TLS уже входит в connection.
        ttfbAccount(section, data, [
            [navigation.redirectStart, navigation.redirectEnd, phases.redirect],
            [navigation.domainLookupStart, navigation.domainLookupEnd, phases.dns],
            [navigation.connectStart, navigation.connectEnd, phases.connection],
            [navigation.requestStart, data.responseStart, phases.requestWait]
        ].filter(([, , value]) => value !== null).sort((a, b) => a[0] - b[0]));
    };

    /** Текст Server-Timing без служебных символов и адресов: целые URL сокращаем до origin и пути */
    const serverTimingText = (section, value, max) => {
        const source = String(value ?? '');
        if (source.length > max) {
            limited(section, 'result-limit');
        }
        // Сначала целые URL (любой регистр схемы), затем обрезка: иначе можно оставить часть userinfo.
        const text = source.replaceAll(/\p{Cc}/gu, '').replaceAll(/https?:[^\s]+/gi, (url) => shortUrl(url) || '')
            .replaceAll(/\?[^\s]*/g, '').replaceAll(/[<>]/g, '');
        if (text.length > max) {
            limited(section, 'result-limit');
        }
        return text.slice(0, max);
    };

    /** Browser cache: страница из кэша (true), прямой ответ сервера (false) или неизвестно (null) */
    const ttfbBrowserCache = (navigation, data, worker) => {
        if (!worker && (data.deliveryType === 'cache' || (data.workerStart === 0
            && navigation.transferSize === 0 && navigation.decodedBodySize > 0))) {
            return true;
        }
        return navigation.transferSize > 0 ? false : null;
    };

    const collectTtfb = () => {
        const section = {status: 'ok', reasons: [], truncated: false, data: null};
        if (!navigation || positive(navigation.responseStart) === null) {
            section.status = 'unavailable';
            reason(section, navigation ? 'no-entry' : 'navigation-missing');
            return section;
        }
        const data = section.data = {
            value: vitals.ttfb,
            phases: {redirect: null, dns: null, connection: null, tls: null, requestWait: null, unaccounted: null},
            responseStart: positive(navigation.responseStart),
            finalResponseHeadersStart: positive(navigation.finalResponseHeadersStart),
            firstInterimResponseStart: positive(navigation.firstInterimResponseStart),
            workerStart: finite(navigation.workerStart),
            deliveryType: ['cache', 'navigational-prefetch'].includes(navigation.deliveryType) ? navigation.deliveryType : null,
            browserCache: null,
            serverTiming: []
        };
        const worker = data.workerStart !== null && data.workerStart > 0;
        data.browserCache = ttfbBrowserCache(navigation, data, worker);
        if (worker) {
            reason(section, 'service-worker');
        }
        if (data.browserCache) {
            reason(section, 'browser-cache', false);
        }
        if (data.finalResponseHeadersStart !== null
            && data.finalResponseHeadersStart > (data.firstInterimResponseStart ?? data.responseStart)) {
            // Промежуточный ответ не обязательно 103; его код Performance API не сообщает.
            reason(section, 'interim-response', false);
        }
        if (!specialNavigation(section) && budget(section)) {
            ttfbPhases(section, data, navigation, worker);
        }
        const timings = navigation.serverTiming || [];
        for (let i = 0; i < Math.min(timings.length, 5); i++) {
            if (!budget(section)) {
                break;
            }
            const entry = timings[i];
            data.serverTiming.push({name: serverTimingText(section, entry.name, 64), description: serverTimingText(section, entry.description, 128), duration: finite(entry.duration)});
        }
        if (timings.length > 5) {
            limited(section, 'result-limit');
        }
        return section;
    };

    /** Сведения о LCP-записи: элемент и тип без текста и атрибутов сайта, известные атрибуты и разложение по TTFB */
    const lcpData = (lcpEntry) => {
        const node = lcpEntry.element?.isConnected ? lcpEntry.element : null;
        const tag = node?.localName?.toLowerCase();
        const element = tag && /^[a-z][a-z0-9-]{0,31}$/.test(tag) ? {tag} : null;
        const image = !!lcpEntry.url || ['img', 'image', 'video'].includes(tag);
        return {
            value: vitals.lcp, startTime: finite(lcpEntry.startTime), size: finite(lcpEntry.size),
            kind: lcpKind(image, element), element,
            resourceUrl: lcpEntry.url ? shortUrl(lcpEntry.url) : null,
            phases: {ttfb: null, resourceLoadDelay: null, resourceLoadDuration: null, elementRenderDelay: null},
            longestPhase: null,
            attributes: {
                loading: tag === 'img' && ['eager', 'lazy', 'auto'].includes(node.loading) ? node.loading : null,
                fetchPriority: tag === 'img' && ['auto', 'high', 'low'].includes(node.fetchPriority) ? node.fetchPriority : null
            },
            preload: null
        };
    };
    const lcpKind = (image, element) => {
        if (image) {
            return 'image';
        }
        return element ? 'text' : 'unknown';
    };

    /** Ресурс LCP: ровно одна подходящая запись Resource Timing, начавшаяся до LCP */
    const matchLcpResource = (section, data, lcpEntry, resourceName) => {
        const matches = [];
        for (let i = 0; i < Math.min(resources.length, 2000); i++) {
            if (!budget(section)) {
                break;
            }
            const entry = resources[i];
            if ((entry.name === resourceName || entry.name === lcpEntry.url) && finite(entry.startTime) !== null && entry.startTime <= data.startTime) {
                matches.push(entry);
            }
        }
        if (resources.length > 2000) {
            limited(section, 'result-limit');
        }
        const resource = !section.truncated && matches.length === 1 ? matches[0] : null;
        if (!resource) {
            reason(section, matches.length > 1 ? 'resource-ambiguous' : 'resource-unmatched');
        }
        return resource;
    };

    /** Фазы LCP после первого байта HTML: задержка до загрузки, сама загрузка и отрисовка элемента */
    const lcpResourcePhases = (section, data, lcpEntry, resource) => {
        // Разложение непересекающегося интервала после первого байта HTML, включая ранний preload.
        // https://web.dev/articles/optimize-lcp — фазы неотрицательны и суммируются в LCP.
        const begin = resource.requestStart;
        const end = resource.responseEnd;
        if (finite(end) !== null && end >= resource.responseStart && resource.responseStart >= begin && end <= data.startTime) {
            const loadStart = Math.max(data.phases.ttfb, begin);
            const loadEnd = Math.max(loadStart, end);
            data.phases.resourceLoadDelay = loadStart - data.phases.ttfb;
            data.phases.resourceLoadDuration = loadEnd - loadStart;
            data.phases.elementRenderDelay = data.value - loadEnd;
        } else {
            reason(section, 'timing-inconsistent');
        }
    };

    /** Медиа-условие link[rel=preload]: true/false, null — не знаем (нет matchMedia или условие не разобрано) */
    const mediaApplies = (link) => {
        if (typeof link.media !== 'string') {
            return null;
        }
        if (!link.media.trim()) {
            return true;
        }
        if (typeof matchMedia !== 'function') {
            return null;
        }
        try {
            const result = matchMedia(link.media);
            return typeof result.matches === 'boolean' ? result.matches : null;
        } catch {
            // Неизвестное условие media не превращаем в подходящий preload.
            return null;
        }
    };

    /** link[rel=preload as=image] из разметки: null — это не такая предзагрузка картинки */
    const imagePreload = (link, lcpEntry, data, resourceName) => {
        // В выборку попадает и SVG <link>: HTML-свойств у него нет.
        if (link.namespaceURI !== 'http://www.w3.org/1999/xhtml'
            || typeof link.rel !== 'string' || typeof link.as !== 'string' || typeof link.href !== 'string') {
            return null;
        }
        if (!link.rel.toLowerCase().split(/\s+/).includes('preload') || link.as.toLowerCase() !== 'image') {
            return null;
        }
        const srcset = typeof link.imageSrcset === 'string' ? link.imageSrcset : link.getAttribute('imagesrcset');
        return {
            responsive: typeof srcset === 'string' && srcset.length > 0,
            matchesUrl: link.href === lcpEntry.url || (data.resourceUrl && link.href.length <= 8192
                && link.href.split('#', 1)[0] === resourceName),
            applies: mediaApplies(link)
        };
    };

    /** Нынешний preload в разметке — не доказательство его использования при загрузке */
    const lcpPreload = (section, data, lcpEntry, resourceName) => {
        const links = document.getElementsByTagName('link');
        let complete = true;
        let unresolved = false;
        for (let i = 0; i < Math.min(links.length, 100); i++) {
            if (!budget(section)) {
                complete = false;
                break;
            }
            const candidate = imagePreload(links[i], lcpEntry, data, resourceName);
            if (!candidate || candidate.applies === false) {
                continue;
            }
            unresolved ||= candidate.responsive || (candidate.applies === null && candidate.matchesUrl);
            if (candidate.applies === true && candidate.matchesUrl && !candidate.responsive) {
                data.preload = true;
            }
        }
        if (links.length > 100) {
            complete = false;
            limited(section, 'result-limit');
        }
        if (data.preload !== true && complete && !unresolved) {
            data.preload = false;
        } else if (data.preload !== true && unresolved) {
            reason(section, 'preload-unresolved');
        }
    };

    /** LCP — картинка с ресурсом: сопоставление с Resource Timing, фазы и preload */
    const lcpImage = (section, data, lcpEntry, special) => {
        const resourceName = data.resourceUrl ? lcpEntry.url.split('#', 1)[0] : lcpEntry.url;
        const resource = matchLcpResource(section, data, lcpEntry, resourceName);
        if (resource && (positive(resource.requestStart) === null || positive(resource.responseStart) === null)) {
            reason(section, 'timing-restricted');
        }
        if (positive(lcpEntry.renderTime) === null) {
            reason(section, 'render-time-unavailable');
        }
        if (!special && resource && positive(resource.requestStart) !== null && positive(resource.responseStart) !== null
            && positive(lcpEntry.renderTime) !== null && data.phases.ttfb !== null) {
            lcpResourcePhases(section, data, lcpEntry, resource);
        }
        lcpPreload(section, data, lcpEntry, resourceName);
    };

    /** LCP не записан: различаем «API нет» и «API есть, записи пока нет» */
    const lcpUnavailable = (section) => {
        const supported = typeof PerformanceObserver !== 'undefined' && (!Array.isArray(PerformanceObserver.supportedEntryTypes)
            || PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint'));
        section.status = supported ? 'unavailable' : 'unsupported';
        reason(section, supported ? 'no-entry' : 'api-unsupported');
        return section;
    };

    /** Текст как LCP: сетевых фаз нет, известна только отрисовка после первого байта */
    const lcpText = (section, data) => {
        reason(section, 'text-lcp', false);
        if (data.phases.ttfb !== null) {
            data.phases.elementRenderDelay = data.value - data.phases.ttfb;
        }
    };

    /** Самая длинная фаза — только если все применимые фазы известны */
    const lcpLongest = (data) => {
        const applicable = data.kind === 'text' ? ['ttfb', 'elementRenderDelay'] : Object.keys(data.phases);
        if (applicable.every((key) => data.phases[key] !== null)) {
            data.longestPhase = applicable.reduce((a, b) => (data.phases[a] >= data.phases[b] ? a : b), applicable[0] || null);
        }
    };

    const collectLcp = () => {
        const section = {status: 'ok', reasons: [], truncated: false, data: null};
        if (!lcp) {
            return lcpUnavailable(section);
        }
        const data = section.data = lcpData(lcp);
        if (!data.element) {
            reason(section, 'element-unavailable');
        }
        if (lcpEntries.dropped > 0) {
            reason(section, 'buffer-dropped');
        }
        const special = specialNavigation(section);
        if (!navigation) {
            reason(section, 'navigation-missing');
        }
        if (!special && navigation && positive(navigation.responseStart) !== null && data.startTime >= navigation.responseStart) {
            data.phases.ttfb = navigation.responseStart;
        }
        if (data.kind === 'text') {
            lcpText(section, data);
        } else if (data.kind === 'image' && lcp.url && budget(section)) {
            lcpImage(section, data, lcp, special);
        } else if (data.kind === 'image') {
            reason(section, 'resource-unmatched');
        }
        if (data.phases.ttfb === null && !special) {
            reason(section, 'timing-incomplete');
        }
        lcpLongest(data);
        return section;
    };

    /** Координаты прямоугольника; нулевая площадь — доступный факт, не отсутствие rect */
    const rect = (value) => {
        if (!value || !['x', 'y', 'width', 'height'].every((key) =>
            typeof value[key] === 'number' && Number.isFinite(value[key]))
            || value.width < 0 || value.height < 0) {
            return null;
        }
        return {x: value.x, y: value.y, width: value.width, height: value.height};
    };

    /** Источник сдвига: узел (только имя тега), прямоугольники до и после и гипотеза о картинке без размеров */
    const clsSource = (section, source) => {
        const node = source.node;
        const tag = node?.isConnected && typeof node.localName === 'string'
            && /^[a-z][a-z0-9-]{0,63}$/i.test(node.localName) ? node.localName : null;
        const previousRect = rect(source.previousRect);
        const currentRect = rect(source.currentRect);
        const element = tag ? {tag} : null;
        if (!element) {
            reason(section, 'element-unavailable');
        }
        if (!previousRect || !currentRect) {
            reason(section, 'sources-unavailable');
        }
        // Только гипотеза: нынешние атрибуты не говорят о CSS или разметке во время сдвига.
        const imageWithoutDimensions = tag === 'img'
            ? !node.hasAttribute('width') && !node.hasAttribute('height') : null;
        return {element, previousRect, currentRect, imageWithoutDimensions};
    };

    /** Источники сдвига в общем лимите 10 (повторный узел — отдельное наблюдение) */
    const clsSources = (section, item, sources, counter) => {
        for (const source of sources) {
            if (!budget(section)) {
                break;
            }
            if (counter.count >= 10) {
                limited(section, 'result-limit');
                break;
            }
            counter.count++;
            item.sources.push(clsSource(section, source));
        }
    };

    // Индексы максимальной серии сохранены прежним проходом: её value не зависит от лимитов причин.
    const collectCls = () => {
        const section = {status: 'ok', reasons: [], truncated: false, data: null};
        if (typeof PerformanceObserver === 'undefined'
            || !PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
            return {...section, status: 'unsupported', reasons: ['api-unsupported']};
        }
        if (vitals.cls === null) {
            return {...section, status: 'unavailable', reasons: ['no-entry']};
        }
        const data = section.data = {value: cls, session: bestEnd < 0 ? null : {
            startTime: shifts[bestStart].startTime, endTime: shifts[bestEnd].startTime
        }, shifts: []};
        if (shifts.dropped > 0) {
            reason(section, 'buffer-dropped');
        }
        specialNavigation(section);
        const counter = {count: 0};
        for (let index = bestStart; index <= bestEnd; index++) {
            if (!budget(section)) {
                break;
            }
            const shift = shifts[index];
            if (shift.hadRecentInput) {
                continue;
            }
            if (data.shifts.length >= 200) {
                limited(section, 'result-limit');
                break;
            }
            const item = {startTime: finite(shift.startTime), value: finite(shift.value), sources: []};
            data.shifts.push(item);
            if (!shift.sources?.length) {
                reason(section, 'sources-unavailable');
                continue;
            }
            clsSources(section, item, shift.sources, counter);
            if (section.reasons.includes('budget-exceeded')) {
                break;
            }
        }
        return section;
    };

    /** Скрипт LoAF вне подтверждённой атрибуции self: только число и сумма длительностей, без URL */
    const loafExcluded = (section, data, script) => {
        data.excludedScripts.count++;
        const duration = finite(script.duration);
        if (duration === null) {
            data.excludedScripts.duration = null;
            reason(section, 'timing-incomplete');
        } else if (data.excludedScripts.duration !== null) {
            data.excludedScripts.duration += duration;
        }
        reason(section, 'scripts-excluded');
    };

    /** Тип источника LoAF: url, inline (адрес совпадает с документом) или unknown */
    const loafKind = (script, url) => {
        if (!url) {
            return 'unknown';
        }
        return script.sourceURL.split('#', 1)[0] === location.href.split('#', 1)[0] ? 'inline' : 'url';
    };

    /** Скрипт LoAF с безопасной атрибуцией self: суммы по источнику (URL или inline) */
    const loafSource = (section, data, sources, script) => {
        const url = shortUrl(script.sourceURL);
        const kind = loafKind(script, url);
        const key = kind === 'url' ? url : kind;
        if (kind === 'unknown') {
            reason(section, 'attribution-unavailable');
        }
        let item = sources.get(key);
        if (!item) {
            if (sources.size >= 100) {
                limited(section, 'result-limit');
                return;
            }
            item = {kind, url: kind === 'url' ? url : null, duration: 0, count: 0};
            sources.set(key, item);
            data.scripts.push(item);
        }
        item.count++;
        const duration = finite(script.duration);
        if (duration === null) {
            item.duration = null;
            reason(section, 'timing-incomplete');
        } else if (item.duration !== null) {
            item.duration += duration;
        }
    };

    /** Кадр LoAF: время блокировки и скрипты кадра; общий лимит 2000 записей скриптов в counter */
    const loafFrame = (section, data, sources, frame, counter) => {
        const blocking = finite(frame.blockingDuration);
        if (blocking === null) {
            data.blockingDuration = null;
            reason(section, 'timing-incomplete');
        } else if (data.blockingDuration !== null) {
            data.blockingDuration += blocking;
        }
        if (!frame.scripts?.length) {
            reason(section, 'attribution-unavailable');
            return;
        }
        for (const script of frame.scripts) {
            if (!budget(section)) {
                break;
            }
            if (counter.count >= 2000) {
                limited(section, 'result-limit');
                break;
            }
            counter.count++;
            if (script.windowAttribution !== 'self') {
                loafExcluded(section, data, script);
            } else {
                loafSource(section, data, sources, script);
            }
        }
    };

    const collectLoaf = () => {
        const section = {status: 'ok', reasons: [], truncated: false, data: null};
        if (loafEntries === null) {
            return {...section, status: 'unsupported', reasons: ['api-unsupported']};
        }
        if (loafEntries.failed) {
            return {...section, status: 'unavailable', reasons: ['collection-failed']};
        }
        const data = section.data = {
            version: 1,
            availableFrames: loafEntries.available,
            processedFrames: 0,
            blockingDuration: 0,
            droppedEntries: loafEntries.dropped,
            excludedScripts: {count: 0, duration: 0},
            scripts: []
        };
        if (!data.availableFrames) {
            reason(section, 'no-entry', false);
        }
        if (data.droppedEntries > 0) {
            reason(section, 'buffer-dropped');
        }
        if (data.availableFrames > loafEntries.length) {
            limited(section, 'result-limit');
        }
        specialNavigation(section);
        const sources = new Map();
        const counter = {count: 0};
        for (const frame of loafEntries) {
            if (!budget(section)) {
                break;
            }
            data.processedFrames++;
            loafFrame(section, data, sources, frame, counter);
            if (section.reasons.includes('budget-exceeded')) {
                break;
            }
        }
        if (data.availableFrames > 0 && data.processedFrames === 0) {
            data.blockingDuration = null;
        }
        return section;
    };
    const collectSafely = (collect) => {
        try {
            return collect();
        } catch {
            // Причины дополняют снимок: сбой одного раздела не лишает окно прежних показателей.
            return {status: 'unavailable', reasons: ['collection-failed'], truncated: false, data: null};
        }
    };
    causes.ttfb = collectSafely(collectTtfb);
    causes.lcp = collectSafely(collectLcp);
    causes.cls = collectSafely(collectCls);
    causes.loaf = collectSafely(collectLoaf);

    // SEO
    const meta = (selector) => document.querySelector(selector)?.getAttribute('content')?.trim() ?? null;
    // Снимаем завершающие «/» (не регулярным выражением: длинная строка «/» дала бы квадратичное время)
    const stripSlashes = (path) => {
        let end = path.length;
        while (end > 0 && path[end - 1] === '/') {
            end--;
        }
        return path.slice(0, end);
    };
    const siteHost = (url) => url.hostname.replace(/^www\./, '');
    const pagePath = (url) => stripSlashes(url.pathname.replaceAll(/%[0-9a-f]{2}/gi, (code) => code.toUpperCase()));

    /**
     * Канонический адрес: эта же страница, другая страница сайта или другой сайт. Страница — путь без завершающего «/»
     * (регистр %xx не важен) и параметры из канонического адреса: у этой страницы они должны быть с теми же
     * значениями (?page=2 и ?page=1 — разные страницы), лишние вроде utm_source и порядок не важны, hash не учитываем.
     * Сайт — хост без «www.». Пустой или неразборчивый адрес — как если бы его не было (пустой href браузер
     * превратил бы в адрес этой же страницы — поэтому берём сам атрибут)
     */
    const collectSeo = () => {
        const robotsMeta = [...document.querySelectorAll('meta[name="robots" i], meta[name="googlebot" i], meta[name="yandex" i]')]
            .map((el) => el.content).join(',');
        // Целые значения через запятую: «max-image-preview:none» — не запрет индексации
        const noindex = robotsMeta.split(',').some((value) => /^\s*(noindex|none)\s*$/i.test(value));
        const canonicalHref = document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim();
        let canonicalUrl = null;
        try {
            canonicalUrl = canonicalHref ? new URL(canonicalHref, document.baseURI) : null;
        } catch {
            // Адрес не разбирается — считаем, что его нет
        }
        const pageParams = new URLSearchParams(location.search);
        const sameParams = () => [...canonicalUrl.searchParams].every(([key, value]) => pageParams.getAll(key).includes(value));
        const canonicalState = () => {
            if (!canonicalUrl) {
                return '';
            }
            if (siteHost(canonicalUrl) !== siteHost(location)) {
                return 'other';
            }
            return pagePath(canonicalUrl) === pagePath(location) && sameParams() ? 'same' : 'page';
        };
        const viewport = meta('meta[name="viewport" i]');
        return {
            status: navigation?.responseStatus || 0,
            robots,
            llms: typeof llms === 'string',
            noindex,
            title: document.title.trim().length,
            description: meta('meta[name="description" i]')?.length ?? null,
            h1: document.querySelectorAll('h1').length,
            canonical: canonicalState(),
            ogTitle: !!meta('meta[property="og:title" i]'),
            ogImage: !!meta('meta[property="og:image" i]'),
            viewport: viewport !== null,
            zoomOff: viewport !== null && (/user-scalable\s*=\s*(no|0)/i.test(viewport)
                || Number.parseFloat(/maximum-scale\s*=\s*([\d.]+)/i.exec(viewport)?.[1] ?? '5') < 2)
        };
    };
    const seo = collectSeo();

    // Картинки: первые 300 — на тяжёлых страницах этого хватает и это быстро
    const images = [...document.images].slice(0, 300);

    /** Один элемент картинки в счётчики разметки (не загружена, скрыта или без размеров — учитываем по-разному) */
    const countImage = (img, counts, dpr, contentTypes) => {
        // Не загружена, служебный пиксель или скрыта (слайд карусели): размер на экране неизвестен
        if (!img.currentSrc || img.clientWidth < 2 || img.clientHeight < 2) {
            return;
        }
        if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
            const style = getComputedStyle(img);
            // Место зарезервировано стилями — сдвига не будет
            if (style.aspectRatio === 'auto' && !(img.style.width && img.style.height)
                && style.position !== 'absolute' && style.position !== 'fixed') {
                counts.noSize++;
            }
        }
        if (img.naturalWidth > 600 && img.naturalWidth > img.clientWidth * dpr * 2) {
            counts.large++;
        }
        // Настоящий тип браузер сообщает для картинок самого сайта; для чужих — только расширение в адресе
        const type = contentTypes.get(img.currentSrc)?.replace('image/', '').replace('jpeg', 'jpg');
        const ext = type || /\.(\w+)(?:$|\?)/.exec(new URL(img.currentSrc, location.href).pathname)?.[1]?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext)) {
            counts.typed++;
            counts.guessed += type ? 0 : 1;
            if (ext === 'webp' || ext === 'avif') {
                counts.modern++;
            }
        }
    };

    const collectMarkup = () => {
        const dpr = window.devicePixelRatio || 1;
        const counts = {noSize: 0, large: 0, modern: 0, typed: 0, guessed: 0};
        const contentTypes = new Map(resources.filter((entry) => entry.contentType).map((entry) => [entry.name, entry.contentType]));
        for (const img of images) {
            countImage(img, counts, dpr, contentTypes);
        }
        return {quirks: document.compatMode === 'BackCompat', ...counts};
    };
    const markup = collectMarkup();

    // Доступность: только простые проверки разметки
    const collectA11y = () => {
        const named = (el) => (el.textContent || '').trim() || el.getAttribute('aria-label')?.trim()
            || el.getAttribute('aria-labelledby') || el.getAttribute('title')?.trim()
            || el.querySelector('img[alt]:not([alt=""]), svg title, [aria-label]');
        const hidden = (el) => el.closest('[hidden], [aria-hidden="true"]') || !el.getClientRects().length;
        const controls = [...document.querySelectorAll('button, [role="button"], a[href]')].slice(0, 1000);
        const fields = [...document.querySelectorAll('input:not([type="hidden"], [type="submit"], [type="button"], [type="reset"], [type="image"]), select, textarea')]
            .slice(0, 300);
        const labelled = (el) => el.labels?.length || el.getAttribute('aria-label')?.trim() || el.getAttribute('aria-labelledby')
            || el.getAttribute('title')?.trim() || el.getAttribute('placeholder')?.trim();
        return {
            lang: document.documentElement.lang || '',
            alt: images.filter((img) => !img.hasAttribute('alt') && img.getAttribute('role') !== 'presentation' && !hidden(img)).length,
            labels: fields.filter((el) => !labelled(el) && !hidden(el)).length,
            names: controls.filter((el) => !named(el) && !hidden(el)).length,
            main: !!document.querySelector('main, [role="main"]')
        };
    };
    const a11y = collectA11y();

    // Cookie входа, которые видит JavaScript, но не сессии аналитики и сервисов: проверяем по каждому шаблону отдельно
    const NON_SESSION_COOKIE = [/csrf|xsrf|amplitude/i, /^_(ga|gat|gid)(_|$)/i, /^_(hj|ym_|pk_|uetsid|uetvid|pin_|ttp|tt_)/i,
        /^ttcsid/i, /^__stripe/i, /^intercom-/i, /^blaize_session/i, /^fpgsid$/i, /^ab\.storage\./i, /^optimizelysession/i];

    causes.context.capturedAt = Date.now();
    return {
        causes,
        vitals,
        seo,
        // Файлы, которые не удалось проверить: сайт не ответил за 2 секунды или сеть недоступна
        unchecked: {
            robots: robotsText === undefined,
            llms: llms === undefined,
            securityTxt: securityTxt === undefined
        },
        markup,
        a11y,
        security: {
            // Каждый <meta> CSP — отдельная политика, браузер применяет все, но только из <head>
            csp: [...document.querySelectorAll('head > meta[http-equiv="Content-Security-Policy" i]')]
                .map((meta) => meta.content).filter(Boolean),
            securityTxt: typeof securityTxt === 'string' && /contact\s*:/i.test(securityTxt),
            // Cookie входа, которые видит JavaScript (без HttpOnly), — по названию, это догадка.
            // CSRF-токены JavaScript читает по замыслу, а сессии аналитики и сервисов (Hotjar, Amplitude, Google,
            // Метрика, Matomo, Microsoft, Pinterest, TikTok, Stripe, Intercom, Piano, Braze, Optimizely) входом
            // не являются. Префиксы — с разделителем: сессии Rails вида _gateway_session остаются
            sessionCookies: document.cookie.split(/;\s*/).map((c) => c.split('=')[0])
                .filter((name) => /sess|sid$|^sid|token|auth|jwt/i.test(name) && !NON_SESSION_COOKIE.some((re) => re.test(name)))
                .slice(0, 3)
        }
    };
})().catch((e) => {
    console.error(e);
    return null;
});
