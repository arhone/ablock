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
| Homepage URL | https://ablock.arh.one |

Скриншот 1 — заголовок, тезисы и настоящий отчёт «Поделиться» о ya.ru.
Скриншот 2: слева выдуманный новостной сайт «Утюг новости» / «The Daily Iron» / «Dnevna Pegla» со статьёй
о рекламе «из каждого утюга» и слежке (`mockup/<язык>.html`), справа окно расширения в тёмной теме.
Окно настоящее, на демонстрационных данных: 64 запроса к рекламе, 26 трекеров, вес 1,2 МБ после блокировки —
те же цифры, что в статье («4,5 МБ, после блокировки — 1,2 МБ»); React, Angie, Yandex, DDoS-Guard; вместо домена —
«этом сайте». Сербский сайт — на кириллице, как окно. На месте рекламы на сайте — пустые плашки.

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
(прямой якорь раздела: `https://github.com/arhone/ablock#приватность`).

## Обновление скриншотов

На каждый язык (en, ru, sr) — два PNG 1280×800 без прозрачности.

**Скриншот 1 «красивый».** Исходники — `banner/store-<язык>.html`, общий
`banner/store.css`. Используются локальные отчёты `docs/site/img/report-en.webp`,
`report.webp` и `report-sr.webp` (сербский отчёт предварительно снимает автор).
Из корня репозитория:

```sh
node docs/store/banner/capture.mjs store
```

Результаты — `img/en/store-1.png`, `img/ru/store-1.png`, `img/sr/store-1.png`.
Режим `all` также включает эти три кадра. Скрипт ждёт картинки и шрифты,
проверяет границы блоков, размеры 1280×800 и PNG без альфа-канала.
Подробности и выбор Chrome — [banner/README.md](banner/README.md).

**Скриншот 2 «Утюг».** Стенд вне репозитория (рабочая папка дизайнера). Из корня репозитория:

```sh
node /srv/arhone/ablock/.agents/workers/designers/diana/files/store-shot-2/shot.mjs
```

Результаты — `img/en/store-2.png`, `img/ru/store-2.png`, `img/sr/store-2.png` (один язык — аргументом: `… shot.mjs ru`).
Скрипт копирует расширение в `/tmp` (права расширенного режима — в manifest копии, демо-данные — в `popup.js` копии),
открывает `mockup/<язык>.html` как `http://iron.example` (адрес направлен на 127.0.0.1, остальная сеть закрыта),
снимает окно в тёмной теме на языке кадра и сайт из файла, собирает кадр. Проверяет: окно не выше 600 px без
прокрутки, тексты не обрезаны, цифры окна и вес до блокировки есть в статье, нигде нет Meta, PNG 1280×800 без альфа-канала.
Если цифры в статье меняются — их нужно поменять и в стенде. Подробности — `README.md` рядом со скриптом.

Баннеры README и превью GitHub: HTML-исходники и команда снимка — [banner/README.md](banner/README.md).
Используют настоящие отчёты «Поделиться» для ya.ru из `docs/site/img/report.webp` и `report-en.webp`.
Старый `docs/img/report.webp` — архивная картинка отчёта для github.com, в README больше не используется.
Для повторного получения архивного отчёта: `SHARE=<png>` у `store.mjs` перехватывает файл
кнопки «Сохранить картинкой»; WebP без потерь. Дата в шапке скрывалась:
`POPJS="const s=document.styleSheets[0]; s.insertRule('.sheet-head > span:last-child{visibility:hidden}', s.cssRules.length)"`.
