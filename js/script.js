window.aBlock = {

    // Хранилище
    storage: {
        base64Image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEQAACxEBf2RfkQAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC42/Ixj3wAAAqZJREFUWEfFlz1oFEEYhi8aEBIbFRSxs5CgKFhZiJWFhUrAItgEQSSQxjqdIoJYWIkWgYhYWAhCEOysLFKlMSBYiEaDP1GIJCbxL7nz+WbeO27Z2d2Z8w4feJn9ft5vNpu73b1aCo1Go69IaukdbDJUr9ffovkCjai1N3ACEygIm2+gabX2BjaY0X45qG2iVTSo9u7C4D1oQ/vloFbXOixLd2HwRbdTBfRNydJdGDytPUqh7zNLv2wZqJ1G4wrjYeAAxjW3QwT0HpfVQbwN3UL2ObmmdDyYzmh2FPTfkNW8B0jN+oqrdXQCk/JHQf9Llj7WC2jFZz3JJ4BnK6YP3h4H/cYThRnIp50AhmPyJoEv+JXt5ASuy5sEvqKrdlWjq6HZ/o9z3peH2oIOHcR/0BJ6h14jd3Nq4xHaofHV0Lw/MKQFpVH0W8df0CKaV/wGvUc/0CqpMZT2xMR42YaFoLaObqPmCXxDn0yKm+sLdEgj08D4zIaUQY9darvkdvntUf1LeeMnh/GXvB3MOzWgFHo+omX0Ctn//7tKDuJTGpkGxvOaUQp9K8h94lk3XbINcnc0Mg2MDzWjFPqMZYU5qNmHcovGxoHJHh5LfkQ19H7VYRDqRzU6Dgwn5a2E3sdoN7LHcBBqVzQ6Dgwj8hZCzxoa59B9tzme8pU81O65wbHg6cdUdgecQ4fV7iAeVjkDebtPDKktHoxn/Ygs5O+yDKitBflBlHtpITepljTw2nPguR/jIV5kCb5uGdQzj2Bie0vep3I6mE+g9mfBfZWC0HpJfQ7imyp1DkNafxXH55QOQn0vcjcjVrsr7lKpcxhyBNmvnnXmble6EPqaP14mlPp3GPoAPVVYim1M7wLq3i8khtp7wajCUug7SP+Ywv8DJ5Dw4lGr/QUwdQXkJkgc3wAAAABJRU5ErkJggg==',
        'radio.yandex.ru': {
            play: false
        }
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
            Array.from(document.querySelectorAll('[id="video-ad"]')).forEach(
                function(element) {
                    element.remove();
                }
            );

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
            Array.from(document.querySelectorAll('[id="player"]')).forEach(
                function(element) {
                    element.setAttribute('style', 'z-index: 10;');
                }
            );
            let divs = document.querySelectorAll('[id="hd-rightColVideoPage"] > div');
            if (divs.length === 3 && !divs[0].getAttribute('id')) {
                divs[0].remove();
            }
            let divsAlt = document.querySelectorAll('[id="vpContentContainer"] > div');
            if (divsAlt.length > 1 && parseInt(divsAlt[1].getAttribute('id'))) {
                let div = divsAlt[1].querySelectorAll('div')[0];
                if (typeof div !== 'undefined' && !div.getAttribute('id')) {
                    div.remove();
                }
            }

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

            let hostname = window.location.hostname.replace('www.', '');
            let current = typeof aBlock.hosts[hostname] !== 'undefined' ? aBlock.hosts[hostname] : aBlock.hosts.other;
            current();
            setInterval(function () {
                current();
            }, 500);
            document.addEventListener('click', function () {
                current();
            });

        }

    });

} catch (e) {
    console.error(e);
}
