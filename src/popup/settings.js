globalThis.initSettings = function () {
    const screen = document.getElementById('settings-screen');
    const openButton = document.getElementById('settings-open');
    const back = document.getElementById('settings-back');
    const badge = document.getElementById('badge-mode');
    const animation = document.getElementById('picker-animation');
    let previousFocus = openButton;
    const open = () => {
        previousFocus = document.activeElement === openButton ? document.activeElement : openButton;
        screen.hidden = false;
        document.body.dataset.screen = 'settings';
        back.focus();
    };
    const close = () => {
        screen.hidden = true;
        delete document.body.dataset.screen;
        previousFocus.focus();
    };
    openButton.addEventListener('click', open);
    back.addEventListener('click', close);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.body.dataset.screen === 'settings') {
            event.preventDefault();
            close();
        }
    });
    chrome.storage.local.get(['aBlockBadgeMode', 'aBlockPickerAnimation']).then((stored) => {
        badge.value = ['count', 'status', 'off'].includes(stored.aBlockBadgeMode) ? stored.aBlockBadgeMode : 'count';
        animation.checked = stored.aBlockPickerAnimation ?? true;
    }).catch(console.error);
    badge.addEventListener('change', () => chrome.storage.local.set({aBlockBadgeMode: badge.value}).catch(console.error));
    animation.addEventListener('change', () => chrome.storage.local.set({aBlockPickerAnimation: animation.checked}).catch(console.error));
    if (sessionStorage.getItem('aBlockOpenSettings')) {
        sessionStorage.removeItem('aBlockOpenSettings');
        open();
    }
};
