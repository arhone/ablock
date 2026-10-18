/**
 * @author AlekseyArh
 * @link https://github.com/arhone/ablock
 *
 * Выполняется на странице по запросу окна расширения (world: MAIN — нужны переменные сайта).
 * Определяет, на чём сделан сайт. Результат — последнее выражение файла.
 * sure: false — признак косвенный, окно покажет его со знаком вопроса.
 */
(() => {
    const found = new Map();

    /**
     * @param {string} name
     * @param {string} kind cms | framework | lib | lang
     * @param {boolean} sure
     * @param {*} [version]
     */
    function add(name, kind, sure, version) {
        const prev = found.get(name);
        found.set(name, {
            name,
            kind,
            sure: sure || !!prev?.sure,
            version: (typeof version === 'string' && /^[\d.]+$/.test(version) ? version : '') || prev?.version || ''
        });
    }

    // Генератор в <meta name="generator">
    const GENERATORS = [
        [/WordPress\s*([\d.]+)?/i, 'WordPress', 'cms'],
        [/Joomla/i, 'Joomla', 'cms'],
        [/Drupal\s*(\d+)?/i, 'Drupal', 'cms'],
        [/Bitrix/i, '1C-Bitrix', 'cms'],
        [/Tilda/i, 'Tilda', 'cms'],
        [/Wix\.com/i, 'Wix', 'cms'],
        [/Webflow/i, 'Webflow', 'cms'],
        [/Ghost\s*([\d.]+)?/i, 'Ghost', 'cms'],
        [/MODX/i, 'MODX', 'cms'],
        [/UMI\.CMS/i, 'UMI.CMS', 'cms'],
        [/NetCat/i, 'NetCat', 'cms'],
        [/TYPO3/i, 'TYPO3', 'cms'],
        [/OpenCart/i, 'OpenCart', 'cms'],
        [/Squarespace/i, 'Squarespace', 'cms'],
        [/Hugo\s*([\d.]+)?/i, 'Hugo', 'framework'],
        [/Jekyll\s*v?([\d.]+)?/i, 'Jekyll', 'framework'],
        [/Hexo/i, 'Hexo', 'framework'],
        [/Docusaurus/i, 'Docusaurus', 'framework'],
        [/Astro\s*v?([\d.]+)?/i, 'Astro', 'framework'],
        [/Gatsby\s*([\d.]+)?/i, 'Gatsby', 'framework'],
        [/Nuxt/i, 'Nuxt', 'framework'],
        [/VitePress/i, 'VitePress', 'framework']
    ];
    for (const meta of document.querySelectorAll('meta[name="generator" i]')) {
        for (const [re, name, kind] of GENERATORS) {
            const match = re.exec(meta.content || '');
            if (match) {
                add(name, kind, true, match[1]);
            }
        }
    }

    // Адреса скриптов, стилей и картинок
    const urls = [...document.querySelectorAll('script[src], link[href], img[src]')]
        .map((el) => el.src || el.href || '')
        .join('\n');
    const PATHS = [
        [/\/bitrix\/(js|templates|cache)\//, '1C-Bitrix', 'cms', true],
        [/\/wp-(content|includes)\//, 'WordPress', 'cms', true],
        [/tildacdn\.|\/tilda-/, 'Tilda', 'cms', true],
        [/static\.wixstatic\.com|parastorage\.com/, 'Wix', 'cms', true],
        [/cdn\.shopify\.com/, 'Shopify', 'cms', true],
        [/\/catalog\/view\/(theme|javascript)\//, 'OpenCart', 'cms', true],
        [/\/media\/(jui|system\/js)\//, 'Joomla', 'cms', true],
        [/\/sites\/(default|all)\/(files|themes|modules)\//, 'Drupal', 'cms', true],
        [/\/assets\/components\//, 'MODX', 'cms', false],
        [/insales/, 'InSales', 'cms', false],
        [/\/_next\/static\//, 'Next.js', 'framework', true],
        [/\/_nuxt\//, 'Nuxt', 'framework', true],
        [/\/_astro\//, 'Astro', 'framework', true],
        [/\/_app\/immutable\//, 'SvelteKit', 'framework', true],
        [/bootstrap(\.bundle)?(\.min)?\.(js|css)/, 'Bootstrap', 'lib', true],
        [/tailwind/, 'Tailwind CSS', 'lib', false],
        [/\.php(\?|$)/m, 'PHP', 'lang', false]
    ];
    for (const [re, name, kind, sure] of PATHS) {
        if (re.test(urls)) {
            add(name, kind, sure);
        }
    }

    // Переменные, которые оставляют движки и библиотеки
    const w = window;
    const GLOBALS = [
        [() => w.BX, '1C-Bitrix', 'cms'],
        [() => w.t_onReady || w.tildaForm, 'Tilda', 'cms'],
        [() => w.Shopify, 'Shopify', 'cms'],
        [() => w.Drupal || w.drupalSettings, 'Drupal', 'cms'],
        [() => w.Joomla, 'Joomla', 'cms'],
        [() => w.Webflow, 'Webflow', 'cms'],
        [() => w.InSales || w.Insales, 'InSales', 'cms'],
        [() => w.__NEXT_DATA__ || document.getElementById('__NEXT_DATA__'), 'Next.js', 'framework'],
        [() => w.__NUXT__ || w.$nuxt, 'Nuxt', 'framework'],
        [() => document.getElementById('___gatsby'), 'Gatsby', 'framework'],
        [() => w.__remixContext, 'Remix', 'framework'],
        [() => document.querySelector('astro-island'), 'Astro', 'framework'],
        [() => w.Ember, 'Ember', 'framework'],
        [() => w.Turbo, 'Hotwire Turbo', 'lib'],
        [() => w.Livewire, 'Laravel', 'framework'],
        [() => w.Alpine && (w.Alpine.version || true), 'Alpine.js', 'lib'],
        [() => w.htmx && (w.htmx.version || true), 'htmx', 'lib'],
        [() => w.jQuery?.fn?.jquery, 'jQuery', 'lib'],
        [() => w.angular?.version?.full, 'AngularJS', 'framework'],
        [() => w.Vue?.version, 'Vue', 'framework'],
        [() => w.React?.version, 'React', 'framework'],
        [() => w.bootstrap?.Tooltip?.VERSION, 'Bootstrap', 'lib']
    ];
    for (const [get, name, kind] of GLOBALS) {
        try {
            const value = get();
            if (value) {
                add(name, kind, true, value);
            }
        } catch {
            // Сайт мог подменить переменную геттером, который бросает ошибку
        }
    }

    // Фреймворки, видимые по служебным полям элементов
    const angular = document.querySelector('[ng-version]');
    if (angular) {
        add('Angular', 'framework', true, angular.getAttribute('ng-version'));
    }
    const sample = [document.getElementById('root'), document.getElementById('app'), document.body?.firstElementChild,
        ...document.querySelectorAll('body > div')].filter(Boolean).slice(0, 20);
    for (const el of sample) {
        const keys = Object.keys(el);
        if (el._reactRootContainer || keys.some((k) => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'))) {
            add('React', 'framework', true);
        }
        if (el.__vue_app__) {
            add('Vue', 'framework', true, el.__vue_app__.version);
        } else if (el.__vue__) {
            add('Vue', 'framework', true, el.__vue__.$root?.constructor?.version);
        }
    }
    if (document.querySelector('[class*="svelte-"]')) {
        add('Svelte', 'framework', false);
    }
    if (found.has('Next.js') || found.has('Gatsby') || found.has('Remix')) {
        add('React', 'framework', true);
    }
    if (found.has('Nuxt') || found.has('VitePress')) {
        add('Vue', 'framework', true);
    }

    // Формы и cookie: признаки серверной части (косвенные)
    const cookies = document.cookie;
    if (document.querySelector('input[name="__VIEWSTATE"]') || /ASP\.NET_SessionId/.test(cookies)) {
        add('ASP.NET', 'framework', true);
    }
    if (/BITRIX_SM_/.test(cookies)) {
        add('1C-Bitrix', 'cms', true);
    }
    if (/wordpress_|wp-settings-/.test(cookies)) {
        add('WordPress', 'cms', true);
    }
    if (document.querySelector('input[name="csrfmiddlewaretoken"]') || /(^|; )csrftoken=/.test(cookies)) {
        add('Django', 'framework', false);
    }
    if (document.querySelector('meta[name="csrf-param"][content="authenticity_token"]')) {
        add('Ruby on Rails', 'framework', false);
    }
    if (/(^|; )XSRF-TOKEN=/.test(cookies) && document.querySelector('meta[name="csrf-token"], input[name="_token"]')) {
        add('Laravel', 'framework', false);
    }
    if (/(^|; )PHPSESSID=/.test(cookies)) {
        add('PHP', 'lang', true);
    }
    if (/(^|; )JSESSIONID=/.test(cookies)) {
        add('Java', 'lang', false);
    }
    if (['1C-Bitrix', 'WordPress', 'Joomla', 'Drupal', 'MODX', 'OpenCart', 'UMI.CMS', 'NetCat', 'Laravel'].some((n) => found.get(n)?.sure)) {
        add('PHP', 'lang', true);
    }

    return [...found.values()];
})();
