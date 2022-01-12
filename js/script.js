chrome.runtime.sendMessage({update: 'true'});

window.aBlock = {

    // Картинка заглушки рекламного блока
    base64Image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEQAACxEBf2RfkQAAABh0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC42/Ixj3wAAAqZJREFUWEfFlz1oFEEYhi8aEBIbFRSxs5CgKFhZiJWFhUrAItgEQSSQxjqdIoJYWIkWgYhYWAhCEOysLFKlMSBYiEaDP1GIJCbxL7nz+WbeO27Z2d2Z8w4feJn9ft5vNpu73b1aCo1Go69IaukdbDJUr9ffovkCjai1N3ACEygIm2+gabX2BjaY0X45qG2iVTSo9u7C4D1oQ/vloFbXOixLd2HwRbdTBfRNydJdGDytPUqh7zNLv2wZqJ1G4wrjYeAAxjW3QwT0HpfVQbwN3UL2ObmmdDyYzmh2FPTfkNW8B0jN+oqrdXQCk/JHQf9Llj7WC2jFZz3JJ4BnK6YP3h4H/cYThRnIp50AhmPyJoEv+JXt5ASuy5sEvqKrdlWjq6HZ/o9z3peH2oIOHcR/0BJ6h14jd3Nq4xHaofHV0Lw/MKQFpVH0W8df0CKaV/wGvUc/0CqpMZT2xMR42YaFoLaObqPmCXxDn0yKm+sLdEgj08D4zIaUQY9darvkdvntUf1LeeMnh/GXvB3MOzWgFHo+omX0Ctn//7tKDuJTGpkGxvOaUQp9K8h94lk3XbINcnc0Mg2MDzWjFPqMZYU5qNmHcovGxoHJHh5LfkQ19H7VYRDqRzU6Dgwn5a2E3sdoN7LHcBBqVzQ6Dgwj8hZCzxoa59B9tzme8pU81O65wbHg6cdUdgecQ4fV7iAeVjkDebtPDKktHoxn/Ygs5O+yDKitBflBlHtpITepljTw2nPguR/jIV5kCb5uGdQzj2Bie0vep3I6mE+g9mfBfZWC0HpJfQ7imyp1DkNafxXH55QOQn0vcjcjVrsr7lKpcxhyBNmvnnXmble6EPqaP14mlPp3GPoAPVVYim1M7wLq3i8khtp7wajCUug7SP+Ywv8DJ5Dw4lGr/QUwdQXkJkgc3wAAAABJRU5ErkJggg==',

    /**
     * init
     * @param host
     */
    init: function (host) {

        let modules = {
            'yandex.ru': function () {
                setInterval(function () {
                    aBlock.yandexAdBlock();
                }, 500);
            },
            'radio.yandex.ru': function () {
                aBlock.radioYandexAdBlock();
            },
            'market.yandex.ru': function () {
                setInterval(function () {
                    aBlock.marketYandexAdBlock();
                }, 500);
            },
            'zen.yandex.ru': function () {
                setInterval(function () {
                    aBlock.zenAdBlock();
                }, 500);
            },
            'vk.com': function () {
                aBlock.vkAdBlock();
                setInterval(function () {
                    aBlock.vkAdBlock();
                }, 500);
            },
            'm.vk.com': function () {
                aBlock.mVkAdBlock();
                setInterval(function () {
                    aBlock.mVkAdBlock();
                }, 500);
            },
            'pulse.mail.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.mailAdBlock();
                });
                aBlock.mailAdBlock();
                setInterval(function () {
                    aBlock.mailAdBlock();
                }, 500);
            },
            'e.mail.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.eMailAdBlock();
                });
                aBlock.eMailAdBlock();
                setInterval(function () {
                    aBlock.eMailAdBlock();
                }, 500);
            },
            'mail.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.mailAdBlock();
                });
                aBlock.mailAdBlock();
                setInterval(function () {
                    aBlock.mailAdBlock();
                }, 500);
            },
            'go.mail.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.goMailAdBlock();
                });
                aBlock.goMailAdBlock();
                setInterval(function () {
                    aBlock.goMailAdBlock();
                }, 500);
            },
            'touch.mail.ru': function () {
                aBlock.touchMailAdBlock();
                setInterval(function () {
                    aBlock.touchMailAdBlock();
                }, 500);
            },
            'otvet.mail.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.otvetMailAdBlock();
                });
                aBlock.otvetMailAdBlock();
                setInterval(function () {
                    aBlock.otvetMailAdBlock();
                }, 500);
            },
            'mail.rambler.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.mailRamblerAdBlock();
                });
                aBlock.mailRamblerAdBlock();
                setInterval(function () {
                    aBlock.mailRamblerAdBlock();
                }, 500);
            },
            'rambler.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.ramblerAdBlock();
                });
                aBlock.ramblerAdBlock();
                setInterval(function () {
                    aBlock.ramblerAdBlock();
                }, 500);
            },
            'news.rambler.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.newsRamblerAdBlock();
                });
                aBlock.newsRamblerAdBlock();
                setInterval(function () {
                    aBlock.newsRamblerAdBlock();
                }, 500);
            },
            'sport.rambler.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.newsRamblerAdBlock();
                });
                aBlock.newsRamblerAdBlock();
                setInterval(function () {
                    aBlock.newsRamblerAdBlock();
                }, 500);
            },
            'kino.rambler.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.kinoRamblerAdBlock();
                });
                aBlock.kinoRamblerAdBlock();
                setInterval(function () {
                    aBlock.kinoRamblerAdBlock();
                }, 500);
            },
            'lenta.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.lentaAdBlock();
                });
                aBlock.lentaAdBlock();
                setInterval(function () {
                    aBlock.lentaAdBlock();
                }, 500);
            },
            'rg.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.rgAdBlock();
                });
                aBlock.rgAdBlock();
                setInterval(function () {
                    aBlock.rgAdBlock();
                }, 500);
            },
            'pikabu.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.pikabuAdBlock();
                });
                aBlock.pikabuAdBlock();
                setInterval(function () {
                    aBlock.pikabuAdBlock();
                }, 500);
            },
            'best.aliexpress.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.bestAliexpressAdBlock();
                });
                aBlock.bestAliexpressAdBlock();
                setInterval(function () {
                    aBlock.bestAliexpressAdBlock();
                }, 500);
            },
            'aliexpress.ru': function () {
                $('html').on('click', 'body', function () {
                    aBlock.aliexpressAdBlock();
                });
                aBlock.aliexpressAdBlock();
                setInterval(function () {
                    aBlock.aliexpressAdBlock();
                }, 500);
            }
        };

    },
    /**
     * Настройки сайтов
     */
    hosts: {
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
                        'background-image: url(' + aBlock.base64Image + '); ' +
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
            let divs = document.querySelectorAll('[id="content"] > div');
            if (divs.length === 2 && !divs[0].getAttribute('id')) {
                divs[0].remove();
            }

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
        other: function () {

        }
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
    },

    /**
     * zenAdBlock
     */
    zenAdBlock: function () {

        // Рекламные баннеры
        $('.feed__item-wrap').each(function (n, element) {
            element = $(element);
            if (
                !element.find('a').length
                || element.find('a:contains(Промо)').length
            ) {
                if (!element.hasClass('ablock-show')
                    &&
                    (
                        !element.hasClass('ablock')
                        ||
                        element.find('div').first().is(":visible")
                    )
                ) {
                    element.addClass('ablock');
                    element.css({'background-color': '#f3f1ed'});
                    element.css({'background-image': "url('" + aBlock.base64Image + "')"});
                    element.css({'background-repeat': 'no-repeat'});
                    element.css({'background-position': 'center center'});
                    element.find('div').first().hide();
                }
            }
        })

        // Показывать заблокированные блоки дзена, при нажатии на них
        $('body').on('click', '.ablock', function () {
            $(this).addClass('ablock-show');
            $(this).find('div').show();
        });

    },

    /**
     * yandexAdBlock
     */
    yandexAdBlock: function () {

        // Баннер под поиском на главной
        $('iframe [src ^= "/portal/ntp/banner"]').hide();
        $('.b-inline_banner iframe').hide();
        $('.b-banner__wrap a.b-banner__link').hide();
        $('[data-statlog ^= "banner."]').hide();

        // Директ в мобильной
        $('.block__title a[href="//direct.yandex.ru/?partner"]').closest('[data-bem]').hide();
        $('[data-statlog="div_direct_tgo_touch.title"]').closest('[data-bem]').hide();

        // Рекламный пост в мобильной
        $('.zenad-card-rtb__ad').closest('.zenad-scaled-container').hide();

        // Блок авто.ру в мобильной
        $('[aria-label="Авто.ру"]').hide();

        // Блоки в дзене на главной яндекса
        $('.zen-page .feed__item-wrap').each(function (n, element) {
            element = $(element);
            if (
                !element.find('a').length
                ||
                element.find('div:contains(Промо)').length
                ||
                element.find('.zenad-card-rtb__ad').length
            ) {
                if (!element.hasClass('ablock-show')
                    &&
                    (
                        !element.hasClass('ablock')
                        ||
                        element.find('div').first().is(":visible")
                    )
                ) {
                    element.addClass('ablock');
                    element.css({'background-color': '#f9f9f9'});
                    element.css({'background-image': "url('" + aBlock.base64Image + "')"});
                    element.css({'background-repeat': 'no-repeat'});
                    element.css({'background-position': 'center center'});
                    element.find('div').first().hide();
                }
            }
        });

        // Показывать заблокированные блоки дзена, при нажатии на них
        $('body').on('click', '.ablock', function () {
            $(this).addClass('ablock-show');
            $(this).find('div').show();
        });

        // Блоки в яндекс новостях
        $('.mg-grid__row').each(function (n, element) {
            element = $(element);
            if (!element.find('a').length) {
                element.hide();
            }
        });
        $('.news-app__heading span:contains(Реклама)').hide();

        // Блоки справа в яндекс новостях
        $('.mg-grid__col_sm_3').each(function (n, element) {
            element = $(element);
            element.find('div').each(function (n, element) {
                element = $(element);
                if (!element.find('a').length) {
                    element.hide();
                }
            })
        });
        $('.neo-advert').hide();
        $('.news-advert__column').hide();

        // Блоки под новостью в яндекс новостях
        $('.news-app__layout > div > div[data-log-id]').hide();

        // Рекламные посты под новостью в яндекс новостях
        $('.mg-grid__col').each(function (n, element) {
            element = $(element);
            if (!element.find('a').length) {
                element.hide();
            }
        });

    },

    /**
     * radioYandexAdBlock
     */
    radioYandexAdBlock: function () {

        let title = $('h2.page-station__title').text();
        if (title === 'Реклама') {
            location.reload();
        }

    },

    /**
     * marketYandexAdBlock
     */
    marketYandexAdBlock: function () {
        // Большой баннер сверху
        $('[data-zone-name="Banner"]').hide();
    },

    /**
     * vkAdBlock
     */
    vkAdBlock: function () {

        // Рекламные посты
        $('.wall_marked_as_ads').closest('.post').remove();
        $('.post_date:contains(Рекламная запись)').closest('.post').remove();
        $('._ads_block_data_w').parent().remove();

        // Рекламный блок слева
        $('.ads_label:contains(Реклама)').parent().remove();

        // Рекламный блок справа
        let right = $('.right_list .apps_feedRightAppsBlock__row');
        right.parent().hide();
        right.closest('.apps_feedRightAppsBlock_single_app').hide();

    },

    /**
     * mVkAdBlock
     */
    mVkAdBlock: function () {

        // Рекламные посты
        $('._ads_block_data_w').remove();
        $('.ads_mark').closest('.wall_item').remove();

    },

    /**
     * mailAdBlock
     */
    mailAdBlock: function () {

        // Всплывающий баннер слева сверху
        $('#bubble-home').hide();

        // Баннер под лентой новостей
        $('[id ^= "commercial_"]').hide();

        // Баннеры справа
        $('.rectangle-banner').parent().hide();

        // Блоки в пульсе на главной мейла
        $('.pl_au').each(function (n, element) {
            element = $(element);
            if (
                element.find('script').length
                ||
                element.find('style').length
                ||
                element.find('span:contains(Промо)').length
                ||
                element.find('span:contains(Реклама)').length
            ) {
                if (!element.hasClass('ablock-show')
                    &&
                    (
                        !element.hasClass('ablock')
                        ||
                        element.find('div').first().is(":visible")
                    )
                    ) {
                    element.addClass('ablock');
                    element.css({'background-color': '#f9f9f9'});
                    element.css({'background-image': "url('" + aBlock.base64Image + "')"});
                    element.css({'background-repeat': 'no-repeat'});
                    element.css({'background-position': 'center center'});
                    element.find('div').first().hide();
                }
            }
        });

        $('[id ^= "yandex_ad_"]').parent().hide();

        // Показывать заблокированные блоки пульса, при нажатии на них
        $('body').on('click', '.ablock', function () {
           $(this).addClass('ablock-show');
           $(this).find('div').show();
        });

    },

    /**
     * goMailAdBlock
     */
    goMailAdBlock: function () {

        // Баннер снизу справа
        $('.RightBottomRbBanner-container').hide();

    },

    /**
     * touchMailAdBlock
     */
    touchMailAdBlock: function () {
        $('.advert-list-item__body').closest('.advert-list-item').hide();
    },

    /**
     * otvetMailAdBlock
     */
    otvetMailAdBlock: function () {

        $('[class ^= "adv-slot"]').attr('style','display:none !important');
        $('.banner-mail').attr('style','display:none !important');
        $('.column_right .fixedsticky').attr('style','display:none !important');

    },

    /**
     * eMailAdBlock
     */
    eMailAdBlock: function () {

        // Баннер, который маскируется под новое письмо
        $('.letter-list-item-adv__container').hide();

        // Рекламные баннеры справа
        $('.advert-column').hide();

    },

    /**
     * mailRamblerAdBlock
     */
    mailRamblerAdBlock: function () {

        // Баннер, который маскируется под новое письмо
        $('.Ad-direct-3A').hide();
        $('[id ^= "begun_block"]').hide();

        // Рекламные баннеры справа
        $('.AppContainer-adWrapper-1o').hide();

    },

    /**
     * ramblerAdBlock
     */
    ramblerAdBlock: function () {
        $('[id ^= "__ban_"]').hide();
        $('[id ^= "begun_block"]').hide();
    },

    /**
     * newsRamblerAdBlock
     */
    newsRamblerAdBlock: function () {
        $('[id ^= "__ban_"]').hide();
        $('[id ^= "begun_block"]').hide();
    },

    /**
     * newsRamblerAdBlock
     */
    kinoRamblerAdBlock: function () {
        $('[id ^= "__ban_"]').hide();
        $('[id ^= "begun_block"]').hide();
    },

    /**
     * lentaAdBlock
     */
    lentaAdBlock: function () {

        $('.b-banner').hide();
        $('[id ^= "begun_block"]').hide();

    },

    /**
     * rgAdBlock
     */
    rgAdBlock: function () {

        $('.b-adfox').remove();
        $('.b-yadirect').remove();
        $('.b-yandex-zen-widget').remove();
        $('.b-relap-widget').remove();

    },

    /**
     * pikabu
     */
    pikabuAdBlock: function () {
        $('[data-ad-type]').remove();
        $('[id ^= "adfox_"]').remove();
    },

    /**
     * aliexpressAdBlock
     */
    aliexpressAdBlock: function () {
        $('.top-ad-container').remove();
        $('script[src ^= "https://ad.adriver.ru"]');
    },

    /**
     * bestAliexpressAdBlock
     */
    bestAliexpressAdBlock: function () {
        $('.top-banner-container').remove();
        $('.top-ad-container').remove();
        $('script[src ^= "https://ad.adriver.ru"]');
    },

}

// Запускаем на включенных сайтах
try {

    let hostname = window.location.hostname.replace('www.', '');
    let current = typeof aBlock.hosts[hostname] !== 'undefined' ? aBlock.hosts[hostname] : aBlock.hosts.other;
    current();
    setInterval(function () {
        current();
    }, 500);
    document.addEventListener('click', function () {
        current();
    });

    // chrome.storage.local.get(['aBlock'], function(localStorage) {
    //     let storage = localStorage['aBlock'];
    //     let hostname = window.location.hostname.replace('www.', '');
    //     if (typeof storage.hosts[hostname] === 'undefined' || storage.hosts[hostname].status === true) {
    //         let current = typeof aBlock.hosts[hostname] !== 'undefined' ? aBlock.hosts[hostname] : aBlock.hosts.other;
    //         current();
    //         setInterval(function () {
    //             current();
    //         }, 500);
    //         document.addEventListener('click', function () {
    //             current();
    //         });
    //     }
    // });
} catch (e) {
    console.error(e);
}
