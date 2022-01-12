/**
 * @author AlekseyArh
 * @link https://github.com/arhone/ablock
 */
aBlock = {
    // Хранилище данных
    storage: {
        status: true
    },
    // Правила
    rules: [
        'ok.ru',
        'vk.com',
        'youtube.com',
        'xvideos.com',
        'rt.pornhub.com',
        'rambler.ru',
        'yandex.ru',
        'other'
    ],
    /**
     * Инициализация
     */
    init: function () {

        // Установка хранилища
        aBlock.syncLocalStorage();

        // Событие смены статуса иконки через popup.js
        aBlock.addButtonListener();

    },
    /**
     * Установка хранилища
     */
    syncLocalStorage: function () {

        chrome.storage.local.get(['aBlockStorage'], function(localStorage) {
            if (typeof localStorage['aBlockStorage'] !== 'undefined') {
                aBlock.storage = localStorage['aBlockStorage'];
            } else {
                chrome.storage.local.set({'aBlockStorage': aBlock.storage});
            }
            aBlock.changeStatus(aBlock.storage.status);
        });

    },
    /**
     * Событие смены статуса иконки через popup.js
     */
    addButtonListener: function () {

        chrome.runtime.onMessage.addListener(function(request) {
            if (typeof request.status !== 'undefined') {
                if (request.status === 'true') {
                    aBlock.changeStatus(true);
                } else {
                    aBlock.changeStatus(false);
                }
            } else {
                console.error(request);
            }
        });

    },
    /**
     * Смена состояния
     * @param status
     */
    changeStatus: function (status) {

        aBlock.storage.status = status;
        chrome.storage.local.set({'aBlockStorage': aBlock.storage});

        aBlock.changeIcon(status);
        aBlock.changeRulesStatus(status);

    },
    /**
     * Смена иконки
     */
    changeIcon: function (status) {

        if (status) {
            // @todo смена иконки не работает, временно вместо иконки меняется текст
            // chrome.action.setIcon({
            //     path: {
            //         32: 'image/ablock-32.png'
            //     }
            // }, function () {});
            chrome.action.setBadgeText({
                text: ''
            });
        } else {
            // chrome.action.setIcon({
            //     path: {
            //         32: 'image/ablock-32-black.png'
            //     }
            // }, function () {});
            chrome.action.setBadgeText({
                text: 'Выкл'
            });
            chrome.action.setBadgeBackgroundColor({
                color: '#2f2f2f'
            });
        }

    },
    /**
     * Включает или отключает правила
     * @param status
     */
    changeRulesStatus: function (status) {

        let settings = status ? {
            'enableRulesetIds': aBlock.rules
        } : {
            'disableRulesetIds': aBlock.rules
        };
        chrome.declarativeNetRequest.updateEnabledRulesets(settings);

    }
}

try {
    aBlock.init();
} catch (e) {
    console.error(e);
}
