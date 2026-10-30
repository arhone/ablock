[Русский](README.md) · **English**

# ABlock — ad blocker and site checker

![ABlock for Chrome and Yandex Browser: ad blocking and a sample ya.ru speed, security and privacy report](docs/img/banner-en.webp)

An ad blocker for Chrome and Yandex Browser. Check website speed, privacy, security headers and technologies in one click.

[Chrome Web Store](https://chromewebstore.google.com/detail/cmbihlcgenpbmdkipolfghkplheignfe) · [Website](https://ablock.arh.one/) · [Telegram](https://t.me/ablockinfo) · [Support](https://boosty.to/a.arh/donate)

## Features

- Blocks ads, including Google Ads and Yandex Direct, Google Analytics and Yandex Metrica trackers, and known phishing and scam sites.
- Removes ads on YouTube, VK and OK. Regional filters follow your browser's languages.
- Extended mode hides cookie pop-ups and empty ad slots. The element picker hides content you select.
- Scores sites out of 10 for privacy, speed, security, SEO and accessibility. Includes a Core Web Vitals checker and checks security headers and rules for search engines and AI bots.
- Identifies technologies and tracking companies; extended mode also shows hosting and the server IP address. Shares reports as images or text, saves private site notes and lets you clear a site's data.

No “acceptable ads”. Turn protection off for an individual site if needed.
[Full guide: window, scores, permissions and extended mode (Russian)](FEATURES.md).

## Privacy

The extension processes data locally and does not send it to the developer or third-party services. All data is calculated and stored in your browser;
server IPs are looked up in a bundled database. No analytics or accounts.
The hidden element list stores selectors, element types and sizes, source hosts (if third-party),
and up to 60 characters of element text in this browser only (`aBlockCustom` in `chrome.storage.local`).
Notes, settings and statistics are also stored locally. Notes are excluded from reports.
Checks use browser data and the site's own `robots.txt`, `llms.txt` and `/.well-known/security.txt`.
No third-party APIs or vulnerability scanning.

## Installation

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/cmbihlcgenpbmdkipolfghkplheignfe), also for Yandex Browser. Requires Chrome 111 or later.

From source: `git clone https://github.com/arhone/ablock.git`, open `chrome://extensions`
(`browser://extensions` in Yandex Browser), enable Developer mode, click “Load unpacked” and select `ablock/src`.

[Development: structure, rules, translations, packaging and checks (Russian)](DEVELOPMENT.md).

## Third-party data

The lists in `src/rules/lists/`, `src/rules/cosmetic/` and `src/content/cookies.css` are created by other authors and distributed under their terms.
Prebuilt rulesets come from [uBlock Origin Lite](https://github.com/uBlockOrigin/uBOL-home).

| List | Authors | License |
|---|---|---|
| [EasyList, EasyPrivacy](https://easylist.to/) | The EasyList authors | GPLv3 / CC BY-SA 3.0 |
| [uBlock filters](https://github.com/uBlockOrigin/uAssets) | Raymond Hill and uAssets contributors | GPLv3 |
| [Peter Lowe’s list](https://pgl.yoyo.org/adservers/) | Peter Lowe | Combining and publishing permitted |
| [RU AdList](https://forums.lanik.us/viewforum.php?f=102) | RU AdList authors | CC BY-SA 3.0 |
| Regional lists: EasyList Germany, AdGuard, ABPindo, IndianList and others — names and URLs in `src/rules/lists.json` | Each list's authors | GPLv3, CC BY-SA and others — see the lists' websites |
| [EasyList Cookie, uBlock Annoyances](https://easylist.to/) | The EasyList authors, Raymond Hill | GPLv3 / CC BY-SA 3.0 |

The `src/data/hosting.json` database is compiled from open [RIPE NCC](https://www.ripe.net/) data.

## Feedback

If ads get through or a site breaks, contact us on [Telegram](https://t.me/ablockinfo) or [open an issue](https://github.com/arhone/ablock/issues).
Include the page URL and, if possible, the ad request URL from the developer tools Network tab.

## Support

ABlock is free and has no “acceptable ads”. Support development on [Boosty](https://boosty.to/a.arh/donate).

## License

ABlock may be freely used, modified and distributed with attribution preserved.
See [LICENSE](LICENSE) for the full text.

© 2020–2026 Алексей Арх
