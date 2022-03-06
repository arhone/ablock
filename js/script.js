window.aBlock = {

    // Хранилище
    storage: {
        base64Image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEQAACxEBf2RfkQAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC42/Ixj3wAAAqZJREFUWEfFlz1oFEEYhi8aEBIbFRSxs5CgKFhZiJWFhUrAItgEQSSQxjqdIoJYWIkWgYhYWAhCEOysLFKlMSBYiEaDP1GIJCbxL7nz+WbeO27Z2d2Z8w4feJn9ft5vNpu73b1aCo1Go69IaukdbDJUr9ffovkCjai1N3ACEygIm2+gabX2BjaY0X45qG2iVTSo9u7C4D1oQ/vloFbXOixLd2HwRbdTBfRNydJdGDytPUqh7zNLv2wZqJ1G4wrjYeAAxjW3QwT0HpfVQbwN3UL2ObmmdDyYzmh2FPTfkNW8B0jN+oqrdXQCk/JHQf9Llj7WC2jFZz3JJ4BnK6YP3h4H/cYThRnIp50AhmPyJoEv+JXt5ASuy5sEvqKrdlWjq6HZ/o9z3peH2oIOHcR/0BJ6h14jd3Nq4xHaofHV0Lw/MKQFpVH0W8df0CKaV/wGvUc/0CqpMZT2xMR42YaFoLaObqPmCXxDn0yKm+sLdEgj08D4zIaUQY9darvkdvntUf1LeeMnh/GXvB3MOzWgFHo+omX0Ctn//7tKDuJTGpkGxvOaUQp9K8h94lk3XbINcnc0Mg2MDzWjFPqMZYU5qNmHcovGxoHJHh5LfkQ19H7VYRDqRzU6Dgwn5a2E3sdoN7LHcBBqVzQ6Dgwj8hZCzxoa59B9tzme8pU81O65wbHg6cdUdgecQ4fV7iAeVjkDebtPDKktHoxn/Ygs5O+yDKitBflBlHtpITepljTw2nPguR/jIV5kCb5uGdQzj2Bie0vep3I6mE+g9mfBfZWC0HpJfQ7imyp1DkNafxXH55QOQn0vcjcjVrsr7lKpcxhyBNmvnnXmble6EPqaP14mlPp3GPoAPVVYim1M7wLq3i8khtp7wajCUug7SP+Ywv8DJ5Dw4lGr/QUwdQXkJkgc3wAAAABJRU5ErkJggg==',
        'radio.yandex.ru': {
            play: false
        },
        localStorage: null
    },

    /**
     * Настройки сайтов
     */
    hosts: {
        'm.vk.com': function () {

            // В ленте
            Array.from(document.querySelectorAll(".wi_info a")).forEach(
                function(element) {
                    if (element.innerText.indexOf('Рекламная запись') > -1) {
                        element.closest('.wall_item').remove();
                    }
                }
            );
            Array.from(document.querySelectorAll(".wi_info span")).forEach(
                function(element) {
                    if (element.innerText.indexOf('Рекламная запись') > -1) {
                        element.closest('.wall_item').remove();
                    }
                }
            );

        },
        'vk.com': function () {

            // Блоки слева
            Array.from(document.querySelectorAll(".ads_ads_box")).forEach(
                function(element) {
                    element.remove();
                }
            );

            // В ленте
            Array.from(document.querySelectorAll(".post_date a")).forEach(
                function(element) {
                    if (element.innerText.indexOf('Рекламная запись') > -1) {
                        element.closest('.feed_row').remove();
                    }
                }
            );
            Array.from(document.querySelectorAll(".ads_ad_explain")).forEach(
                function(element) {
                    if (element.innerText.indexOf('Рекламная запись') > -1) {
                        element.closest('.feed_row').remove();
                    }
                }
            );

        },
        'ok.ru': function () {

            // Баннер ali
            Array.from(document.getElementsByClassName("promo-mall-ali-mod")).forEach(
                function(element) {
                    element.remove();
                }
            );

            // Баннеры слева
            Array.from(document.getElementsByClassName("trg-b-banner-block")).forEach(
                function(element) {
                    element.remove();
                }
            );

            let block = document.getElementById('hook_Block_ViewportHeightAwareBanner');
            if (block) {
                let sBlock = document.getElementById('hook_Block_CompactFooter');
                if (sBlock) {
                    block.after(sBlock);
                }
                block.remove()
            }

            // Баннеры справа
            Array.from(document.getElementsByClassName("banner_new__loaded")).forEach(
                function(element) {
                    element.remove();
                }
            );
            Array.from(document.getElementsByClassName("mall-products-vertical-portlet")).forEach(
                function(element) {
                    element.remove();
                }
            );
            Array.from(document.querySelectorAll("#hook_Block_FourthCol [id] div")).forEach(
                function(element) {
                    if (element.innerText.indexOf('.ru') > 1) {
                        element.closest('[id]').setAttribute('style', 'display: none;');
                    }
                }
            );

            // В ленте
            Array.from(document.querySelectorAll(".feed-list .feed-w [data-seen-params]")).forEach(
                function(element) {
                    let data = JSON.parse(element.getAttribute('data-seen-params') || {});
                    if (
                        data && typeof data['options'] !== 'undefined'
                        && typeof data['options']['onScrollSeen'] !== 'undefined'
                        && data['options']['onScrollSeen'] === false
                        && aBlock.methods.searchTextList(element.querySelectorAll('.feed_top span'), 'Р') !== false
                        && aBlock.methods.searchTextList(element.querySelectorAll('.feed_top span'), 'м') !== false
                        && aBlock.methods.searchTextList(element.querySelectorAll('.feed_top span'), 'а') !== false
                    ) {
                        element.remove();
                    }
                }
            );

        },
        'youtube.com': function () {

            // Баннер на главной
            Array.from(document.querySelectorAll('[id="masthead-ad"]')).forEach(
                function(element) {
                    element.remove();
                }
            );
            Array.from(document.querySelectorAll('[layout="display-ad-layout-top-landscape-image"]')).forEach(
                function(element) {
                    element.parentElement.setAttribute('style', '' +
                        'background-image: url(' + aBlock.storage.base64Image + '); ' +
                        'background-repeat: no-repeat; ' +
                        'background-position: center center;');
                    element.remove();
                }
            );

            // Баннер в видео
            Array.from(document.getElementsByClassName('ytp-ad-overlay-slot')).forEach(
                function(element) {
                    element.setAttribute('style', 'display: none');
                }
            );

            // Показать кнопку "Пропустить"
            Array.from(document.getElementsByClassName('ytp-ad-skip-button-slot')).forEach(
                function(element) {
                    element.removeAttribute('style');
                }
            );
            Array.from(document.getElementsByClassName('ytp-ad-skip-button-container')).forEach(
                function(element) {
                    element.removeAttribute('style');
                }
            );

        },
        'xvideos.com': function () {

            // Реклама справа от видео
            // Array.from(document.querySelectorAll('[id="video-ad"]')).forEach(
            //     function(element) {
            //         element.remove();
            //     }
            // );

        },
        'rt.pornhub.com': function () {

            // Баннер авторизации
            Array.from(document.querySelectorAll('[id="age-verification-container"]')).forEach(
                function(element) {
                    element.remove();
                }
            );
            Array.from(document.querySelectorAll('[id="age-verification-wrapper"]')).forEach(
                function(element) {
                    element.remove();
                }
            );

            // Баннер на паузе
            Array.from(document.querySelectorAll('[id="pb_template"]')).forEach(
                function(element) {
                    element.remove();
                }
            );

            // Реклама справа от видео
            // Array.from(document.querySelectorAll('[id="player"]')).forEach(
            //     function(element) {
            //         element.setAttribute('style', 'z-index: 10;');
            //     }
            // );
            // let divs = document.querySelectorAll('[id="hd-rightColVideoPage"] > div');
            // if (divs.length === 3 && !divs[0].getAttribute('id')) {
            //     divs[0].remove();
            // }
            // let divsAlt = document.querySelectorAll('[id="vpContentContainer"] > div');
            // if (divsAlt.length > 1 && parseInt(divsAlt[1].getAttribute('id'))) {
            //     let div = divsAlt[1].querySelectorAll('div')[0];
            //     if (typeof div !== 'undefined' && !div.getAttribute('id')) {
            //         div.remove();
            //     }
            // }

        },
        'mail.yandex.ru': function () {

            // Баннер, который маскируется под новое письмо
            Array.from(document.querySelectorAll('.mail-Layout-Main > div')).forEach(
                function(element) {
                    if (element.getAttribute('data-key')) {
                        element.remove();
                    }
                }
            );

            // Баннер сверху в мобильной версии
            Array.from(document.querySelectorAll('.direct')).forEach(
                function(element) {
                    element.remove();
                }
            );

            // Баннер слева
            Array.from(document.querySelectorAll('.b-banner')).forEach(
                function(element) {
                    element.remove();
                }
            );
            Array.from(document.querySelectorAll('.ns-view-mail-pro-left-column-button ~ div')).forEach(
                function(element) {
                    element.remove();
                }
            );

        },
        'rambler.ru': function () {

            // Баннеры begun
            Array.from(document.querySelectorAll('[id ^= "begun_block"]')).forEach(
                function(element) {
                    element.innerHTML = "";
                }
            );

        },
        'mail.rambler.ru': function () {

            // Баннер, который маскируется под новое письмо
            Array.from(document.querySelectorAll('.Ad-direct-3A')).forEach(
                function(element) {
                    element.remove();
                }
            );

            // Баннеры begun
            window.aBlock.hosts['rambler.ru']();

        },
        'news.rambler.ru': function () {

            // Баннеры begun
            window.aBlock.hosts['rambler.ru']();

        },
        'kino.rambler.ru': function () {

            // Баннеры begun
            window.aBlock.hosts['rambler.ru']();

        },
        'auto.rambler.ru': function () {

            // Баннеры begun
            window.aBlock.hosts['rambler.ru']();

        },
        'sport.rambler.ru': function () {

            // Баннеры begun
            window.aBlock.hosts['rambler.ru']();

        },
        'horoscopes.rambler.ru': function () {

            // Баннеры begun
            window.aBlock.hosts['rambler.ru']();

        },
        'e.mail.ru': function () {

            // Баннер, который маскируется под новое письмо
            Array.from(document.querySelectorAll('.letter-list-item-adv__container')).forEach(
                function(element) {
                    element.setAttribute('style', 'display: none;');
                }
            );

            // Рекламные баннеры справа
            Array.from(document.querySelectorAll('.advert-column')).forEach(
                function(element) {
                    element.setAttribute('style', 'display: none;');
                }
            );

        },
        'pulse.mail.ru': function () {

            // Блоки в ленте
            Array.from(document.querySelectorAll('[data-testid="pulse-card"] span')).forEach(
                function(element) {
                    if (
                        element.innerText.toLowerCase().indexOf('реклама') > -1
                        || element.innerText.toLowerCase().indexOf('промо') > -1
                    ) {
                        element.closest('[data-testid="pulse-card"]').setAttribute('style', 'display: none;');
                    }
                }
            );
            Array.from(document.querySelectorAll('[data-testid="pulse-card"] div')).forEach(
                function(element) {
                    if (
                        element.innerText.toLowerCase().indexOf('реклама') > -1
                        || element.innerText.toLowerCase().indexOf('промо') > -1
                    ) {
                        element.closest('[data-testid="pulse-card"]').setAttribute('style', 'display: none;');
                    }
                }
            );

        },
        'yandex.ru': function () {

            // Баннер на главной под поиском
            let banner = document.querySelector('.container__banner');
            if (banner) {
                banner.setAttribute('style', 'display: none;');
            }
            Array.from(document.querySelectorAll('iframe')).forEach(
                function(element) {
                    element.setAttribute('style', 'display: none;');
                }
            );

            // Блоки в ленте
            Array.from(document.querySelectorAll('.feed__row div')).forEach(
                function(element) {
                    if (element.innerText.toLowerCase().indexOf('промо') > -1) {
                        element.closest('.feed__row').setAttribute('style', 'display: none;');
                    }
                }
            );

            // Блоки в новостях
            Array.from(document.querySelectorAll('.root123 > div')).forEach(
                function(element) {
                    if (element.getAttribute('style') === 'width: 100%;') {
                        element.setAttribute('style', 'display: none;');
                    }
                }
            );

        },
        'radio.yandex.ru': function () {

            // Включить проигрывание
            let playButton = document.querySelector('.player-controls__play');
            if (playButton && playButton.getAttribute('title') === 'Играть [P]' && !aBlock.storage['radio.yandex.ru'].play) {
                aBlock.storage['radio.yandex.ru'].play = true;
                playButton.click();
            }

            // Обновление страницы на рекламном треке
            let text = document.querySelector('h2.page-station__title');
            if (text && text.innerText === 'Реклама') {
                location.reload();
            }

        },
        'zen.yandex.ru': function () {

            // Блоки в ленте
            Array.from(document.querySelectorAll('.feed__row div')).forEach(
                function(element) {
                    if (element.innerText.toLowerCase().indexOf('промо') > -1) {
                        element.closest('.feed__row').setAttribute('style', 'display: none;');
                    }
                }
            );

        },
        other: function () {}
    },
    /**
     * Небезопасные сайты
     */
    warningHosts: {
        'activisionblizzard.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/activision-blizzard/')
        },
        'atlassian.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/atlassian/')
        },
        'autodesk.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/autodesk/')
        },
        'bbc.co.uk': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/bbc/')
        },
        'btc-alpha.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/btc-alpha/')
        },
        'coursera.org': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/coursera/')
        },
        'dmarket.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/dmarket/')
        },
        'ea.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/electronic-arts/')
        },
        'esputnik.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости, дискриминации и пропаганде',
                'http://www.netynas.ru/esputnik/')
        },
        'eurovision.tv': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/eurovision/')
        },
        'hostinger.ru': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/hostinger/')
        },
        'host-tracker.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/host-tracker/')
        },
        'grammarly.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/grammarly/')
        },
        'serpstat.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и разжигании национальной ненависти',
                'http://www.netynas.ru/serpstat/')
        },
        'qmall.io': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/qmall/')
        },
        'visa.com.ru': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/visa/')
        },
        'visa.com': function (hostname) {
            aBlock.methods.addWarning(hostname, 'Сайт был замечен в политической предвзятости и дискриминации',
                'http://www.netynas.ru/visa/')
        },
    },
    /**
     * Вспомогательные методы
     */
    methods: {
        /**
         * Поиск текста в нескольких элементах
         * @param elements
         * @param text
         * @returns {boolean}
         */
        searchTextList: function (elements, text) {
            let position = false;
            Array.from(elements).forEach(
                function(el) {
                    let p;
                    if (el && (p = el.innerText.indexOf(text)) >= 0) {
                        position = p;
                    }
                }
            );
            return position;
        },
        /**
         * Добавляет предупреждения о ненадежности сайта
         */
        addWarning: function (hostname, details, proof) {

            let warningElement = document.createElement('div');
            warningElement.id = 'ablock-warning';
            warningElement.style =
                "background-image: url('data:image/jpeg;base64,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');" +
                'background-repeat: no-repeat;' +
                'background-size: cover;' +
                'font-family: sans-serif;' +
                'position: fixed;' +
                'top: 0;' +
                'z-index: 9999;' +
                'text-align: center;' +
                'padding-top: 10%;' +
                'width: 100%;' +
                'height: 100%;'
            ;

            let textElement = document.createElement('div');
            textElement.innerHTML = 'Это небезопасный веб-сайт';
            textElement.style =
                'color: #b43610;' +
                'font-size: 2em;'
            ;
            warningElement.append(textElement);

            let detailsElement = document.createElement('div');
            detailsElement.innerHTML = '<span style="color: #828282">Причина предупреждения:</span> ' + details || '';
            detailsElement.style =
                'width: 50%;' +
                'margin: auto;' +
                'color: #333333;' +
                'padding-top: 20px'
            ;
            warningElement.append(detailsElement);

            let proofElement = document.createElement('a');
            proofElement.href = proof;
            proofElement.innerText = 'Подробнее';
            proofElement.target = '_blank';
            proofElement.style =
                'color: #515f6e;' +
                'margin-top: 50px;' +
                'display: block;' +
                'text-decoration: none !important;' +
                'border: none !important;'
            ;
            warningElement.append(proofElement);

            let closeElement = document.createElement('div');
            closeElement.innerText = 'Убрать предупреждение';
            closeElement.title = 'Мы лишь предупреждаем. Мы не в праве Вас как-то ограничивать';
            closeElement.style =
                'font-size: 12px;' +
                'margin-top: 10px;' +
                'color: #d44500;' +
                'cursor: pointer;'
            ;
            warningElement.append(closeElement);
            closeElement.addEventListener('click', function () {
                aBlock.methods.closeWarning(hostname);
            });

            document.getElementsByTagName('html')[0].innerHTML = '';
            document.getElementsByTagName('html')[0].append(warningElement);
            document.getElementsByTagName('body')[0].innerHTML = '';

        },
        /**
         * Закрывает предупреждение
         * @param hostname
         */
        closeWarning: function (hostname) {
            let warningElement = document.getElementById('ablock-warning');
            if (typeof warningElement !== 'undefined') {
                warningElement.remove();
                if (typeof aBlock.storage.localStorage['warningHostsCloses'] === 'undefined') {
                    aBlock.storage.localStorage['warningHostsCloses'] = {};
                }
                aBlock.storage.localStorage['warningHostsCloses'][hostname] = true;
                console.log(aBlock.storage.localStorage);
                chrome.storage.local.set({'aBlockStorage': aBlock.storage.localStorage});
                location.reload();
            }
        }
    }

}

// Запускаем на включенных сайтах
try {

    chrome.storage.local.get(['aBlockStorage'], function(localStorage) {

        if (
            typeof localStorage['aBlockStorage'] !== 'undefined'
            && typeof localStorage['aBlockStorage'].status !== 'undefined'
            && localStorage['aBlockStorage'].status
        ) {

            aBlock.storage.localStorage = localStorage['aBlockStorage'];

            let hostname = window.location.hostname.replace('www.', '');

            let currentHost = typeof aBlock.hosts[hostname] !== 'undefined' ? aBlock.hosts[hostname] : aBlock.hosts.other;
            currentHost();
            setInterval(function () {
                currentHost();
            }, 500);
            document.addEventListener('click', function () {
                currentHost();
            });

            if (typeof aBlock.storage.localStorage['warningHostsCloses'] === 'undefined') {
                aBlock.storage.localStorage['warningHostsCloses'] = {};
            }

            if (typeof aBlock.storage.localStorage['warningHostsCloses'][hostname] === 'undefined' && typeof aBlock.warningHosts[hostname] !== 'undefined') {
                aBlock.warningHosts[hostname](hostname);
            }

        }

    });

} catch (e) {
    console.error(e);
}
