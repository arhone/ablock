import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['node_modules/', 'dist/', 'src/rules/', 'src/_metadata/']
    },
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script'
        }
    },
    // Фоновый скрипт расширения
    {
        files: ['src/background/**/*.js'],
        languageOptions: {
            globals: {...globals.serviceworker, ...globals.webextensions}
        }
    },
    // Окно расширения
    {
        files: ['src/popup/**/*.js'],
        languageOptions: {
            globals: {...globals.browser, ...globals.webextensions}
        }
    },
    // Скрипты, внедряемые в страницы сайтов: content — постоянно, page — по запросу окна (chrome.* там недоступен)
    {
        files: ['src/content/**/*.js', 'src/page/**/*.js'],
        languageOptions: {
            globals: globals.browser
        }
    },
    // Контент-скрипт в изолированном мире: chrome.runtime доступен
    {
        files: ['src/content/cosmetic.js'],
        languageOptions: {
            globals: {...globals.browser, ...globals.webextensions}
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
