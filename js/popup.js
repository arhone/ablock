window.addEventListener('load', function () {

    // Меняем иконки при открытии окна на подходящую под статус
    chrome.storage.local.get(['aBlock'], function(localStorage) {

        // Получаем домен текущей вкладки
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

            let hostname = (new URL(tabs[0].url)).hostname.replace('www.', '');
            let storage = localStorage['aBlock'];

            // Включаем кнопку
            if (typeof storage.hosts[hostname] === 'undefined' || storage.hosts[hostname].status === true) {
                document.querySelector('#aBlock .aBlock-bg').classList.remove('aBlock-off');
            } else {
                document.querySelector('#aBlock .aBlock-bg').classList.add('aBlock-off');
            }

        });

    });

    // Нажатие на кнопку
    document.getElementById('aBlock').addEventListener('click', function () {

        chrome.storage.local.get(['aBlock'], function(localStorage) {

            // Получаем домен текущей вкладки
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

                let hostname = (new URL(tabs[0].url)).hostname.replace('www.', '');
                let storage = localStorage['aBlock'];

                // Отключаем домен
                if (typeof storage.hosts[hostname] === 'undefined' || storage.hosts[hostname].status === true) {
                    chrome.runtime.sendMessage({status: 'false'});
                    storage.hosts[hostname] = {};
                    storage.hosts[hostname].status = false;
                    let _ = chrome.storage.local.set({'aBlock': storage});
                    document.querySelector('#aBlock .aBlock-bg').classList.add('aBlock-off');
                } else {
                    chrome.runtime.sendMessage({status: 'true'});
                    storage.hosts[hostname] = {};
                    storage.hosts[hostname].status = true;
                    let _ = chrome.storage.local.set({'aBlock': storage});
                    document.querySelector('#aBlock .aBlock-bg').classList.remove('aBlock-off');
                }

            });

        });

    });

});
