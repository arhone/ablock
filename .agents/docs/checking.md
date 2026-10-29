# Как проверять

## Линтеры
`npm run lint` (ESLint для `src/` и `tools/`, Stylelint для `src/**/*.css`), Node.js 20.19+. JSON — `tools/pack.sh` проверяет перед упаковкой; отдельный файл — `node -e 'JSON.parse(require("fs").readFileSync(process.argv[1]))' <файл>`.

## Окно в headless Chrome
- Chrome 137+ не грузит расширение флагом `--load-extension` — только через CDP pipe (`--remote-debugging-pipe`) и `Extensions.loadUnpacked` с путём к папке.
- Расширение просит часть прав по запросу (optional) и получает доступ к вкладке по клику (activeTab). В headless клика нет, поэтому для стенда — копия `src/` с этими правами в обязательных и `declarativeNetRequestFeedback` (иначе «Реклама —»). Сам `src/manifest.json` не менять.
- Окно: `chrome-extension://<id>/popup/popup.html` во вкладке, или настоящее окно через `chrome.action.openPopup()` из фонового скрипта. Фоновый скрипт засыпает и теряет данные вкладки — перед снимком перезагружать сайт.
- Тема — `Emulation.setEmulatedMedia` (`prefers-color-scheme`). Язык — `aBlockLang` в `chrome.storage.local` или язык браузера.
- Локальные сайты — свой сервер на 127.0.0.1 и `--host-resolver-rules`; HTTPS со своим сертификатом — `--ignore-certificate-errors`. Внешние сайты из песочницы могут не открываться; некоторые (lenta.ru) рвут соединение с HeadlessChrome — нужен обычный User-Agent.
- Стенды в `/tmp` пропадают после перезагрузки — скрипты держать в `files/` воркера.

## Что смотреть в окне
- Высота не больше 600 px; длинные языки — de, fi, el, vi; справа налево — ar, he, fa.
- Светлая и тёмная тема.
- Обычный и расширенный режим, защита выключена, страница, где расширение не работает (магазин, `chrome://`).
- Клавиатура: Tab, Enter, Escape, куда уходит фокус после скрытия элемента.
- Новые тексты — во всех 53 полных локалях, без лишних ключей.
- Честно писать, что не проверено: настоящее окно по клику, Яндекс Браузер, диктор.
