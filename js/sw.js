Object.prototype.isset = function (path = '') {
    if (path === '') {
        return true;
    }
    let keys = path.split('.');
    return typeof this[keys[0]] === 'undefined' ? false : this[keys[0]].isset(keys.slice(1).join('.'));
};

let storage = {};
chrome.storage.local.get(['aBlock'], function(localStorage) {
    storage = localStorage['aBlock'];
});

function aBlockUpdateStatus () {

    try {

        chrome.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true}, function (tabs) {

            if (!chrome.runtime.lastError) {}
            try {

                if (typeof tabs[0] !== 'undefined' && typeof tabs[0].url !== 'undefined') {

                    let hostname = (new URL(tabs[0].url)).hostname;

                    chrome.storage.local.get(['aBlock'], function(localStorage) {
                        storage = localStorage['aBlock'];
                        if (typeof storage.hosts[hostname] === 'undefined' || storage.hosts[hostname].status === true) {
                            chrome.action.setIcon({path:'image/ablock-32.png'});
                        } else {
                            chrome.action.setIcon({path:'image/ablock-32-black.png'});
                        }
                    });

                } else {

                    setTimeout(function() {
                        aBlockUpdateStatus();
                    }, 100);

                }

            } catch (e) {
                setTimeout(function() {
                    aBlockUpdateStatus();
                }, 100);
            }

        });

    } catch (e) {
        setTimeout(function() {
            aBlockUpdateStatus();
        }, 100);
    }

}

// Ссылки для блокировки
let aBlockUrls = {
    'yandex.ru': function (url) {
        return (
            url.indexOf('://an.yandex.ru/system/video-ads-sdk/adsdk.js') !== -1
            || url.indexOf('://yastatic.net/awaps-ad-sdk-js-bundles') !== -1
            || url.indexOf('://yastatic.net/partner-code-bundles') !== -1
            || url.indexOf('://frontend-test.s3.mds.yandex.net') !== -1
        );
    },
    'mail.yandex.ru': function (url) {
        return (
            url.indexOf('://an.yandex.ru/partner-code-bundles/') !== -1
            || url.indexOf('://an.yandex.ru/system/context.js') !== -1
        );
    },
    'radio.yandex.ru': function (url) {
        return (
            url.indexOf('://an.yandex.ru/partner-code-bundles/') !== -1
            || url.indexOf('://yastatic.net/awaps-ad-sdk-js/') !== -1
        );
    },
    'music.yandex.ru': function (url) {
        return (
            url.indexOf('://an.yandex.ru/partner-code-bundles/') !== -1
            || url.indexOf('://yastatic.net/awaps-ad-sdk-js/') !== -1
        );
    },
    'vk.com': function (url) {
        return (
            url.indexOf('://ad.mail.ru/') !== -1
            || url.indexOf('://an.yandex.ru/') !== -1
            || url.indexOf('://vk.com/ads_rotate.php') !== -1
        );
    },
    'rambler.ru': function (url) {
        return (
            url.indexOf('://an.yandex.ru/') !== -1
            || url.indexOf('://ads.adfox.ru') !== -1
            || url.indexOf('://mc.yandex.ru/metrika/tag.js') !== -1
            || url.indexOf('://www.google-analytics.com/analytics.js') !== -1
            || url.indexOf('ssp.rambler.ru/file.jsp') !== -1
            || url.indexOf('://prime.rambler.ru/api/v3/prime/getActiveAdblockInfo') !== -1
            || url.indexOf('.24smi.net') !== -1
        );
    },
    'news.rambler.ru': function (url) {
        return (
            url.indexOf('://an.yandex.ru/') !== -1
            || url.indexOf('://ads.adfox.ru') !== -1
            || url.indexOf('://mc.yandex.ru/metrika/tag.js') !== -1
            || url.indexOf('://www.google-analytics.com/analytics.js') !== -1
            || url.indexOf('ssp.rambler.ru/file.jsp') !== -1
            || url.indexOf('://prime.rambler.ru/api/v3/prime/getActiveAdblockInfo') !== -1
        );
    },
    'kino.rambler.ru': function (url) {
        return (
            url.indexOf('://an.yandex.ru/') !== -1
            || url.indexOf('://ads.adfox.ru') !== -1
            || url.indexOf('://mc.yandex.ru/metrika/tag.js') !== -1
            || url.indexOf('://www.google-analytics.com/analytics.js') !== -1
            || url.indexOf('ssp.rambler.ru/file.jsp') !== -1
            || url.indexOf('://prime.rambler.ru/api/v3/prime/getActiveAdblockInfo') !== -1
        );
    },
    'mail.rambler.ru': function (url) {
        return (
            url.indexOf('://an.yandex.ru/') !== -1
            || url.indexOf('://ads.adfox.ru') !== -1
            || url.indexOf('://mc.yandex.ru/metrika/tag.js') !== -1
            || url.indexOf('://www.google-analytics.com/analytics.js') !== -1
        );
    },
    'mail.ru': function (url) {
        return false;
    },
    'e.mail.ru': function (url) {
        return false;
    },
    'ok.ru': function (url, details) {

        return (
            url.indexOf('.yandex.ru/') !== -1
            || url.indexOf('.mail.ru/') !== -1
            || (
                url === 'https://ok.ru/dk'
                && details.isset('requestBody.formData.mt.0')
                && details.requestBody.formData['mt'][0] === 'page'
            )
            || url === 'https://ok.ru/dk?cmd=RecommendedGroupsLoaderBlock'
        );
    },
    'rt.pornhub.com': function (url) {
        return (
            url.indexOf('://www.pornhub.com/_xa/ads_batch?ads') !== -1
            || url.indexOf('trafficjunky.com') !== -1
        );
    },
    'xvideos.com': function (url) {
        return (
            url.indexOf('trafficjunky.com') !== -1
        );
    },
    'youtube.com': function () {
        return false;
    },
    'arh.one': function () {
        return false;
    },
    'other': function (url) {
        return (
            url.indexOf('://an.yandex.ru/system/video-ads-sdk/adsdk.js') !== -1
            || url.indexOf('://yastatic.net/awaps-ad-sdk-js-bundles') !== -1
            || url.indexOf('://yastatic.net/partner-code-bundles') !== -1
            || url.indexOf('://an.yandex.ru/partner-code-bundles') !== -1
            || url.indexOf('://yastatic.net/pcode/adfox') !== -1
            || url.indexOf('://tag.digitaltarget.ru/adcm.js') !== -1
            || url.indexOf('://smi2.ru/data/js') !== -1
            || url.indexOf('://api.lentainform.com') !== -1
            || url.indexOf('://jsc.lentainform.com') !== -1
            || url.indexOf('://yastatic.net/s3/zen-lib/widget-loader') !== -1
            || url.indexOf('://nativeroll.tv/js') !== -1
            || url.indexOf('://ads.adfox.ru') !== -1
            || url.indexOf('://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js') !== -1
            || url.indexOf('://seedr.com/js/advert.js') !== -1
            || url.indexOf('://imasdk.googleapis.com/js/') !== -1
            || url.indexOf('://googleads.g.doubleclick.net/dbm/ad') !== -1
            || url.indexOf('://boostingads.com/t.js') !== -1
            || url.indexOf('://rotator.admediator.ru/js/rotator.js') !== -1
            || url.indexOf('://utarget.ru') !== -1
            || url.indexOf('://utarget.pro') !== -1
            || url.indexOf('trafficbass.com') !== -1
            || url.indexOf('://bs.direct') !== -1
            || url.indexOf('://px.moatads.com') !== -1
            || url.indexOf('cotsta.ru') !== -1
        );
    }
}

// Блокирование запросов
chrome.declarativeWebRequest.onBeforeRequest.addListener(function(details) {

    try {

        let hostname = (new URL(details.initiator)).hostname.replace('www.', '');
        if (typeof storage.hosts[hostname] === 'undefined' || storage.hosts[hostname].status === true) {

            if (typeof aBlockUrls[hostname] !== 'undefined') {
                if (aBlockUrls[hostname](details.url, details)) {
                    return {cancel: true};
                }
            } else if (aBlockUrls['other'](details.url)) {
                return {cancel: true};
            }

        }

    } catch (e) {}

}, {urls: ['<all_urls>']}, ['blocking', 'requestBody']);

// Слушаем событие смены иконки
chrome.extension.onMessage.addListener(function(request){
    if (typeof request.status !== 'undefined') {
        if (request.status === 'true') {
            chrome.action.setIcon({path:'image/ablock-32.png'});
        } else {
            chrome.action.setIcon({path:'image/ablock-32-black.png'});
        }
        chrome.storage.local.get(['aBlock'], function(localStorage) {
            storage = localStorage['aBlock'];
        });
    } else if (typeof request.update !== 'undefined') {
        aBlockUpdateStatus();
    }
});

// Определяем хранилище
chrome.storage.local.get(['aBlock'], function(localStorage) {
    let storage = localStorage['aBlock'];
    if (typeof storage === 'undefined') {
        storage = {
            'hosts': {}
        };
        chrome.storage.local.set({'aBlock': storage});
    }
});

// Смотрим какая вкладка открыта
chrome.tabs.onActivated.addListener(function () {
    aBlockUpdateStatus();
});
