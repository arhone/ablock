<p align="center">
    <img src="image/ablock-128.png" width="96" alt="ABlock">
</p>

<h1 align="center">ABlock — блокировщик рекламы</h1>

<p align="center">
    Лёгкий блокировщик рекламы и трекеров для Chrome и Яндекс Браузера.<br>
    Без исключений и «допустимой рекламы» — все равны.
</p>

<p align="center">
    <a href="https://chrome.google.com/webstore/detail/ablock-блокировщик-реклам/cmbihlcgenpbmdkipolfghkplheignfe">Chrome Web Store</a> ·
    <a href="https://t.me/ablockinfo">Telegram</a> ·
    <a href="LICENSE">Лицензия</a>
</p>

---

## Возможности

- 🚫 **Реклама** — рекламные сети всего мира, Яндекс Директ, РСЯ, Adfox, Google Ads и другие.
- 🕵️ **Трекеры и счётчики** — Яндекс Метрика, Google Analytics, пиксели соцсетей, LiveInternet, Mail.ru и т.д.
- ▶️ **YouTube** — реклама вырезается из плеера, баннеры скрыты.
- 🛡 **Мошеннические сайты** — блокировка известных вредоносных и фишинговых адресов.
- ⚡ **Быстро** — блокирует сам браузер по готовым правилам, расширение не замедляет страницы.
- 🔒 **Приватно** — ничего не собирает и никуда не отправляет.

## Значки в окне расширения

Вокруг щита — короткая сводка о текущем сайте. Зелёный — хорошо, жёлтый — так себе, красный — плохо.

| Значок | Что показывает |
|---|---|
| **HTTPS** | Зашифровано ли соединение |
| **HTTP/3 · HTTP/2 · HTTP/1.1** | Протокол, по которому загружена страница |
| **1.2 с** | Время загрузки страницы |
| **Блок** | Сколько запросов заблокировано на странице |
| **Трекеры** | Сколько из них — слежка за пользователем |
| **Домены** | Сколько сторонних сайтов подгружает страница (список — при наведении) |

Щит включает и выключает защиту. Число на иконке расширения — заблокированное на текущей вкладке.

## Установка

**Из магазина** — [Chrome Web Store](https://chrome.google.com/webstore/detail/ablock-блокировщик-реклам/cmbihlcgenpbmdkipolfghkplheignfe).
Яндекс Браузер устанавливает расширения оттуда же.

**Из исходников:**

1. Скачайте репозиторий: `git clone https://github.com/arhone/ablock.git`
2. Откройте `chrome://extensions` (в Яндекс Браузере — `browser://extensions`)
3. Включите «Режим разработчика»
4. Нажмите «Загрузить распакованное расширение» и выберите папку `ablock`

Нужен Chrome 111 или новее.

## Разрешения

| Разрешение | Зачем |
|---|---|
| `declarativeNetRequest` | Блокировка запросов по правилам |
| `scripting` | Скрытие баннеров на YouTube, VK, OK и pornhub, сбор данных для значков |
| `activeTab` | Доступ к текущей вкладке — только когда вы открываете окно расширения |
| `storage` | Запомнить, включена ли защита |
| `youtube.com`, `youtube-nocookie.com` (встроенные видео), `vk.com`, `vk.ru`, `vkvideo.ru`, `ok.ru`, `pornhub.com`, `pornhub.org` | Убрать рекламу в плеере, ленте и баннеры на этих сайтах |

## Как устроено

```
ablock/
├── manifest.json        описание расширения
├── popup.html           окно расширения
├── js/
│   ├── sw.js            фоновый скрипт: включение и выключение защиты
│   ├── popup.js         значки и кнопка в окне
│   ├── youtube.js       вырезание рекламы из плеера YouTube
│   ├── vk.js            вырезание рекламы из ленты VK
│   └── ok.js            вырезание рекламы из ленты OK
├── css/                 скрытие баннеров на YouTube, VK, OK и pornhub
├── rules/               собственные правила
│   └── lists/           популярные списки фильтров (обновляются скриптом)
└── tools/
    └── update-rules.js  обновление списков фильтров
```

### Собственные правила

Лежат в `rules/*.json` и правятся вручную:

| Файл | Что блокирует |
|---|---|
| `ads.json` | Рекламные сети |
| `trackers.json` | Счётчики и трекеры |
| `ru-ads.json` | Российская реклама: Яндекс, Adfox, Mail.ru и др. |
| `ru-trackers.json` | Российские счётчики: Метрика, LiveInternet, Top100 и др. |
| `youtube.com.json`, `vk.com.json`, `ok.ru.json`, … | Реклама на конкретных сайтах |
| `other.json` | Общие шаблоны рекламных скриптов |

Чтобы заблокировать домен вместе с поддоменами, добавьте его в список `requestDomains` первого правила
в `ads.json` или `trackers.json`. Отдельный адрес — новым правилом в конце файла (`id` должен быть уникальным
внутри файла):

```json
{
    "id": 42,
    "action": { "type": "block" },
    "condition": { "urlFilter": "||example.com/ads/" }
}
```

Формат правил — [declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest).

### Обновление списков фильтров

```sh
node tools/update-rules.js
```

Скрипт скачивает свежие списки в `rules/lists/` и прописывает их в `manifest.json`.
Берутся только блокирующие правила: исключения из списков не используются, поблажек рекламе нет.

Нужен Node.js 18+ и Google Chrome — он проверяет regex-правила (путь к Chrome можно задать в `CHROME_PATH`).
После обновления поднимите версию в `manifest.json` и выпустите новую версию расширения.

### Проверка кода

```sh
npm install
npm run lint       # ESLint для js/ и tools/, Stylelint для css/
npm run lint:fix   # исправить то, что исправляется автоматически
```

Нужен Node.js 20.19+. `package.json` и `node_modules/` нужны только для разработки, в расширение их класть не надо.

## Списки фильтров

Папка `rules/lists/` — работа других авторов, она распространяется на их условиях.
Готовые наборы правил взяты из [uBlock Origin Lite](https://github.com/uBlockOrigin/uBOL-home):

| Список | Авторы | Лицензия |
|---|---|---|
| [EasyList, EasyPrivacy](https://easylist.to/) | The EasyList authors | GPLv3 / CC BY-SA 3.0 |
| [uBlock filters](https://github.com/uBlockOrigin/uAssets) | Raymond Hill и участники uAssets | GPLv3 |
| [Peter Lowe’s list](https://pgl.yoyo.org/adservers/) | Peter Lowe | разрешено объединять и публиковать |
| [RU AdList](https://forums.lanik.us/viewforum.php?f=102) | Авторы RU AdList | CC BY-SA 3.0 |

## Нашли рекламу?

Напишите в [Telegram](https://t.me/ablockinfo) или [создайте issue](https://github.com/arhone/ablock/issues)
с адресом страницы и, если получится, адресом рекламного запроса (вкладка «Сеть» в инструментах разработчика).

## Лицензия

ABlock можно свободно использовать, менять, форкать и распространять — достаточно сохранить
указание авторства. Полный текст — в [LICENSE](LICENSE).

© 2021–2026 Алексей Арх
