/* exported CompanyOwner */
// Общий распознаватель: sites означает владельца, domains — известные источники слежки.
// Никаких запросов: используются только переданные адрес и справочник из пакета.
const CompanyOwner = (() => {
    /** URL или ключ host/path → хост и путь без query/fragment. Неизвестные схемы не угадываем. */
    function normalize(value) {
        if (typeof value !== 'string' || value.trim() !== value || !value) {
            return null;
        }
        try {
            const url = new URL(value.includes('://') ? value : 'https://' + value);
            if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
                return null;
            }
            return {host: url.hostname.toLowerCase().replace(/\.$/, ''), path: url.pathname};
        } catch {
            return null;
        }
    }

    function matches(value, pattern) {
        const address = normalize(value);
        const rule = normalize(pattern);
        if (!address || !rule || !(address.host === rule.host || address.host.endsWith('.' + rule.host))) {
            return false;
        }
        // /rtrg не совпадает с /rtrg-extra; /ads/ — только содержимое этой директории.
        return address.path === rule.path || (address.path.startsWith(rule.path)
            && (rule.path.endsWith('/') || address.path[rule.path.length] === '/'));
    }

    /**
     * Возвращает {company, basis, pattern} или null. basis: domains | sites.
     * Сначала самый узкий хост, затем путь, domains перед sites при равенстве;
     * последняя ничья — порядок компаний и правил в справочнике.
     * Передайте ['sites'] для владельца сайта, ['domains'] для источников слежки.
     */
    /** Правила компании для выбранных basis: сначала domains, затем sites */
    function rulesOf(company, bases) {
        return ['domains', 'sites']
            .filter((basis) => bases.includes(basis))
            .flatMap((basis) => (company[basis] || []).map((pattern) => ({basis, pattern})));
    }

    /** Тройка узости правила для адреса или null, если адрес не подходит */
    function rankOf(value, {basis, pattern}) {
        const rule = normalize(pattern);
        if (!rule || !matches(value, pattern)) {
            return null;
        }
        return [rule.host.length, rule.path.length, basis === 'domains' ? 1 : 0];
    }

    function find(value, companies, bases = ['domains', 'sites']) {
        let best = null;
        let rank = [-1, -1, -1];
        for (const company of companies) {
            for (const rule of rulesOf(company, bases)) {
                const next = rankOf(value, rule);
                if (next && isBetter(next, rank)) {
                    best = {company, basis: rule.basis, pattern: rule.pattern};
                    rank = next;
                }
            }
        }
        return best;
    }

    /** Тройка узости: длина хоста, длина пути, приоритет basis. Больше первых разных — лучше. */
    function isBetter(next, rank) {
        const different = next.findIndex((n, i) => n !== rank[i]);
        return different >= 0 && next[different] > rank[different];
    }

    return {normalize, matches, find};
})();
