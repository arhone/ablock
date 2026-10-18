#!/usr/bin/env node
/**
 * Обновление базы хостингов: какие диапазоны IP принадлежат каким провайдерам.
 * Анонсированные префиксы берутся из RIPEstat (https://stat.ripe.net) по номерам автономных систем.
 * Окно расширения ищет IP сервера в этой базе локально — никуда его не отправляя.
 *
 * Запуск: node tools/update-hosting.js
 */
const fs = require('fs');
const path = require('path');

const SOURCE = 'https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS';
const OUTPUT = path.join(__dirname, '..', 'src', 'data', 'hosting.json');

// Провайдеры: country — страна, только если сети провайдера почти все в ней (иначе null).
// proxy — CDN и защита от DDoS: настоящий сервер сайта спрятан за ними.
const PROVIDERS = [
    {name: 'Cloudflare', asn: [13335, 209242], country: null, proxy: true},
    {name: 'Akamai', asn: [20940, 16625], country: null, proxy: true},
    {name: 'Fastly', asn: [54113], country: null, proxy: true},
    {name: 'Gcore', asn: [202422], country: null, proxy: true},
    {name: 'DDoS-Guard', asn: [57724], country: null, proxy: true},
    {name: 'Qrator', asn: [200449, 51115, 197068], country: null, proxy: true},
    {name: 'StormWall', asn: [59796], country: null, proxy: true},
    {name: 'ServicePipe', asn: [201706], country: null, proxy: true},

    {name: 'Yandex', asn: [13238], country: 'RU'},
    {name: 'Yandex Cloud', asn: [200350], country: 'RU'},
    {name: 'VK', asn: [47541, 47764], country: 'RU'},
    {name: 'Selectel', asn: [49505, 50340], country: 'RU'},
    {name: 'Timeweb', asn: [9123], country: 'RU'},
    {name: 'Beget', asn: [198610], country: 'RU'},
    {name: 'REG.RU', asn: [197695, 43146], country: 'RU'},
    {name: 'RU-CENTER', asn: [48287], country: 'RU'},
    {name: 'Sprinthost', asn: [35278], country: 'RU'},
    {name: 'PIN DC', asn: [34665], country: 'RU'},
    {name: 'Aeza', asn: [210644], country: 'RU'},
    {name: 'Rostelecom', asn: [12389, 8342], country: 'RU'},
    {name: 'MTS', asn: [8359], country: 'RU'},
    {name: 'MegaFon', asn: [31133], country: 'RU'},

    // Собственные сети крупных компаний
    {name: 'Rambler&Co', asn: [24638], country: 'RU'},
    {name: 'Sber', asn: [35237], country: 'RU'},
    {name: 'T-Bank', asn: [43399], country: 'RU'},
    {name: 'Avito', asn: [201012], country: 'RU'},
    {name: 'Ozon', asn: [44386], country: 'RU'},
    {name: 'Wildberries', asn: [57073], country: 'RU'},
    {name: '2GIS', asn: [197482], country: 'RU'},
    {name: 'hh.ru', asn: [47724], country: 'RU'},
    {name: 'Automattic', asn: [2635], country: null},
    {name: 'Wikimedia', asn: [14907], country: null},

    {name: 'Hetzner', asn: [24940], country: null},
    {name: 'OVHcloud', asn: [16276], country: null},
    {name: 'Contabo', asn: [51167], country: null},
    {name: 'Leaseweb', asn: [60781], country: 'NL'},
    {name: 'Servers.com', asn: [7979], country: null},
    {name: 'DigitalOcean', asn: [14061], country: null},
    {name: 'Linode', asn: [63949], country: null},
    {name: 'Vultr', asn: [20473], country: null},
    {name: 'Amazon AWS', asn: [16509, 14618], country: null},
    {name: 'Google', asn: [15169, 396982], country: null},
    {name: 'Microsoft', asn: [8075], country: null},
    {name: 'GitHub', asn: [36459], country: 'US'}
];

/**
 * Префиксы, анонсируемые автономной системой
 * @param {number} asn
 * @returns {Promise<string[]>}
 */
async function prefixes(asn) {
    for (let attempt = 1; ; attempt++) {
        try {
            const response = await fetch(SOURCE + asn, {signal: AbortSignal.timeout(60000)});
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const {data} = await response.json();
            return data.prefixes.map((p) => p.prefix);
        } catch (e) {
            if (attempt === 3) {
                throw new Error(`AS${asn}: ${e.message}`);
            }
            await new Promise((r) => setTimeout(r, 3000 * attempt));
        }
    }
}

/**
 * Префикс → диапазон адресов [первый, последний]
 * @param {string} cidr
 * @returns {bigint[]}
 */
function toRange(cidr) {
    const [ip, bits] = cidr.split('/');
    const v6 = ip.includes(':');
    const width = v6 ? 128n : 32n;
    let start = 0n;
    if (v6) {
        const [head, tail = ''] = ip.split('::');
        const left = head ? head.split(':') : [];
        const right = tail ? tail.split(':') : [];
        const groups = [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
        for (const group of groups) {
            start = (start << 16n) + BigInt(parseInt(group || '0', 16));
        }
    } else {
        for (const part of ip.split('.')) {
            start = (start << 8n) + BigInt(part);
        }
    }
    const size = 1n << (width - BigInt(bits));
    start -= start % size;
    return [start, start + size - 1n];
}

/**
 * Склеивает пересекающиеся и соседние диапазоны
 * @param {bigint[][]} ranges
 * @returns {bigint[][]}
 */
function merge(ranges) {
    ranges.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const result = [];
    for (const range of ranges) {
        const last = result[result.length - 1];
        if (last && range[0] <= last[1] + 1n) {
            last[1] = range[1] > last[1] ? range[1] : last[1];
        } else {
            result.push([...range]);
        }
    }
    return result;
}

async function main() {
    // Диапазоны: IPv4 — числами, IPv6 — 32 hex-цифрами (без BigInt в JSON)
    const v4 = [];
    const v6 = [];
    for (const [index, provider] of PROVIDERS.entries()) {
        const list = new Set();
        for (const asn of provider.asn) {
            for (const prefix of await prefixes(asn)) {
                list.add(prefix);
            }
        }
        const ranges4 = merge([...list].filter((p) => !p.includes(':')).map(toRange));
        const ranges6 = merge([...list].filter((p) => p.includes(':')).map(toRange));
        v4.push(...ranges4.map(([a, b]) => [Number(a), Number(b), index]));
        v6.push(...ranges6.map(([a, b]) => [a.toString(16).padStart(32, '0'), b.toString(16).padStart(32, '0'), index]));
        console.log(`${provider.name.padEnd(14)} префиксов ${String(list.size).padStart(6)} → диапазонов IPv4 ${String(ranges4.length).padStart(5)}, IPv6 ${String(ranges6.length).padStart(5)}`);
    }

    // По возрастанию начала. Сети разных провайдеров изредка пересекаются (субаренда) —
    // окно расширения берёт самый узкий подходящий диапазон
    v4.sort((a, b) => a[0] - b[0]);
    v6.sort((a, b) => (a[0] < b[0] ? -1 : 1));

    const providers = PROVIDERS.map(({name, country, proxy}) => ({name, country, proxy: !!proxy}));
    fs.mkdirSync(path.dirname(OUTPUT), {recursive: true});
    fs.writeFileSync(OUTPUT, JSON.stringify({providers, v4, v6}) + '\n');
    console.log(`Итого: IPv4 ${v4.length}, IPv6 ${v6.length}, ${(fs.statSync(OUTPUT).size / 1024).toFixed(0)} КБ`);
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
