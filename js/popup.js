window.addEventListener('load', function () {

    // Меняем иконки при открытии окна на подходящую под статус
    chrome.storage.local.get(['aBlockStorage'], function(localStorage) {

        if (
            typeof localStorage['aBlockStorage'] !== 'undefined'
            && typeof localStorage['aBlockStorage'].status !== 'undefined'
        ) {

            // Скрыто до загрузки
            document.getElementById('aBlock').classList.remove('loading');

            let storage = localStorage['aBlockStorage'];

            // Включаем кнопку
            if (storage.status) {
                document.querySelector('#aBlock #bg').setAttribute('data-status', 'true');
            } else {
                document.querySelector('#aBlock #bg').setAttribute('data-status', 'false');
            }

        }

    });

    // Нажатие на кнопку
    document.getElementById('aBlock').addEventListener('click', function () {

        let status = document.querySelector('#aBlock #bg').getAttribute('data-status');
        let newStatus = status === 'true' ? 'false' : 'true';

        chrome.runtime.sendMessage({status: newStatus});
        document.querySelector('#aBlock #bg').setAttribute('data-status', newStatus);

    });

});
