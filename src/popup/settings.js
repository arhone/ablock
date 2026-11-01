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
        if (previousFocus?.isConnected && previousFocus.getClientRects().length &&
            getComputedStyle(previousFocus).visibility === 'visible') {
            previousFocus.focus();
        } else {
            const oldTabIndex = document.body.getAttribute('tabindex');
            document.body.setAttribute('tabindex', '-1');
            document.body.focus();
            if (oldTabIndex === null) document.body.removeAttribute('tabindex');
            else document.body.setAttribute('tabindex', oldTabIndex);
        }
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
        badge.value = ['count', 'status', 'off'].includes(stored.aBlockBadgeMode) ? stored.aBlockBadgeMode : 'status';
        animation.checked = stored.aBlockPickerAnimation ?? true;
    }).catch((error) => {
        console.error(error);
        badge.value = 'status';
        animation.checked = true;
    });
    badge.addEventListener('change', () => chrome.storage.local.set({aBlockBadgeMode: badge.value}).catch(console.error));
    animation.addEventListener('change', () => chrome.storage.local.set({aBlockPickerAnimation: animation.checked}).catch(console.error));
    if (sessionStorage.getItem('aBlockOpenSettings')) {
        sessionStorage.removeItem('aBlockOpenSettings');
        open();
        requestAnimationFrame(() => back.focus());
    }
};
