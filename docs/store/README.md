# Страница в Chrome Web Store

Материалы для [консоли разработчика](https://chrome.google.com/webstore/devconsole).

```
store/
├── README.md       эта памятка: что куда вставлять
├── listings/       описания по языкам: en.md, ru.md, de.md… (как в src/_locales/)
├── img/            промо-картинки и скриншоты по языкам: en/, ru/, sr/
└── mockup/         выдуманный сайт для скриншотов: ru.html, en.html, sr.html
```

## Вкладка «Описание в магазине»

Для каждого языка — свой файл в `listings/`: `en.md`, `ru.md`, `de.md` и т. д. по `src/_locales/`.
Название и краткое описание магазин берёт из `src/_locales/<язык>/messages.json` (`extName`, `extDescription`),
в консоли вводится только подробное описание из блока «Описание». Язык по умолчанию — английский.

Где вводить: вкладка «Описание в магазине», выпадающий список языка над полем описания. В нём появляются
все языки из `src/_locales` после загрузки сборки. Для языка без своего текста магазин показывает английское
описание. Свой файл в `listings/` есть у каждого языка, кроме вариантов: `en_AU`, `en_GB`, `en_US` оставить
пустыми (это английский по умолчанию), в `es_419` вставить `es.md`.

В описаниях нет списков чужих брендов (Яндекс, Google, YouTube…): магазин считает перечисление
посторонних названий спамом ключевыми словами (Keyword Spam) и может отклонить публикацию.

| Поле | Файл |
|---|---|
| Скриншоты 1280×800, PNG без прозрачности | `img/en/` — основной язык (их видят все языки без своих), `img/ru/`, `img/sr/` |
| Малая промо-картинка 440×280 | `img/promo-440x280.jpg` (`promo-220x140.jpg` — старый размер, магазину не нужен) |
| Категория | Инструменты (Tools) |

Скриншоты: слева выдуманный новостной сайт «Утюг новости» / «The Daily Iron» / «Dnevna Pegla» со статьёй
о рекламе «из каждого утюга» и слежке (`mockup/<язык>.html`), справа окно расширения в тёмной теме.
Окно снято на настоящей новостной странице, домен в нём заменён на «этом сайте», а цифры в статье
совпадают с окном (заблокировано, трекеры, вес). На месте рекламы на сайте — пустые плашки.

Магазин показывает скриншоты своего языка, а языкам без своих — английские.

## Вкладка «Конфиденциальность»

Заполняется на английском один раз для всех языков.

**Single purpose**

```text
Blocks ads, trackers and malicious sites, and shows how the current website performs and who tracks you on it.
```

**Permission justification**

| Разрешение | Текст |
|---|---|
| `declarativeNetRequest` | Blocks ad, tracker and malware requests with static filter lists, and lets the user turn protection off for a single site. |
| `storage` | Saves the user's settings (protection on/off, sites without protection, cookie pop-up hiding) and total blocking counters locally. |
| `scripting` | Registers content scripts that remove ads from the YouTube, VK, OK and Pornhub players, feeds and video grids; in extended mode inserts CSS that hides empty ad slots and cookie pop-ups; runs the site check in the active tab when the user opens the popup. |
| `activeTab` | Reads the page opened in the active tab when the user clicks the extension icon, to show the site check. |
| Разрешение на доступ к хостам (одно поле на все хосты, включая необязательный `<all_urls>`) | Required: youtube.com, youtube-nocookie.com, vk.com, vk.ru, vkvideo.ru, ok.ru, pornhub.com, pornhub.org — content scripts and styles that remove ads embedded in the pages of these sites, which network rules cannot block. Optional <all_urls>, requested only when the user turns on extended mode: hides empty ad slots and cookie consent pop-ups on every site (element classes are matched against the bundled filter lists inside the extension), reads the current page's response headers and server IP for the site check, and enlarges the page's resource timing buffer so the check sees all loaded files. Nothing leaves the browser. |
| `webRequest` (optional) | Extended mode, enabled by the user: reads response headers and server IP of the current page to show hosting, HTTP/3, compression and security headers, and counts blocked requests for the statistics. Nothing is modified or sent anywhere. |
| `browsingData` (optional) | Requested only when the user clicks the button to clear the current site's data (cookies, storage, cache). |

**Remote code:** No, I am not using remote code.

**Data usage:** не отмечать ни одного пункта — расширение не собирает данные пользователей.
Отметить все три подтверждения (не продаю данные, не использую не по назначению, не для кредитоспособности).

**Privacy policy URL:** `https://github.com/arhone/ablock#readme` — раздел «Приватность» в README
(на GitHub он не заголовок, поэтому отдельного якоря нет).

## Обновление скриншотов

Снимаются тестовым стендом (`/tmp/ablock-shots/store.mjs` и `compose.py`, в репозиторий не входят;
переменные `SITEW` — ширина страницы, `DARK=1`, `PAGEJS` — скрипт на странице перед снимком, `POPJS` — в окне расширения):
расширение с разрешениями расширенного режима и `declarativeNetRequestFeedback` (иначе счётчик «Блок»
в тестовом браузере пустой) открывается на сайте, окно снимается в 2× и накладывается на снимок
страницы с тенью и рамкой.
