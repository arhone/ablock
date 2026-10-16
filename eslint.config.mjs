import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['node_modules/', 'rules/', '_metadata/']
    },
    js.configs.recommended,
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script'
        }
    },
    // Фоновый скрипт расширения
    {
        files: ['js/sw.js'],
        languageOptions: {
            globals: {...globals.serviceworker, ...globals.webextensions}
        }
    },
    // Окно расширения
    {
        files: ['js/popup.js'],
        languageOptions: {
            globals: {...globals.browser, ...globals.webextensions}
        }
    },
    // Скрипты, внедряемые в страницы сайтов (world: MAIN, chrome.* там недоступен)
    {
        files: ['js/youtube.js', 'js/vk.js', 'js/ok.js'],
        languageOptions: {
            globals: globals.browser
        }
    },
    {
        files: ['tools/**/*.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: globals.node
        }
    }
];
