/* global process, Buffer, setTimeout, clearTimeout, console */
// Node без зависимостей. Chrome общается только через CDP pipe.
import {spawn} from 'node:child_process';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../img');
const profile = await mkdtemp(path.join(tmpdir(), 'ablock-banner-'));
const chrome = spawn(process.env.CHROME || 'google-chrome', [
    '--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--hide-scrollbars',
    ...(process.env.NO_SANDBOX === '1' ? ['--no-sandbox'] : [])
], {stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe']});
let seq = 0, buffer = '', stderr = '', failure;
const pending = new Map();
const fail = (error) => {
    failure = error;
    for (const {reject, timer} of pending.values()) { clearTimeout(timer); reject(error); }
    pending.clear();
};
chrome.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
chrome.on('error', fail);
chrome.on('exit', (code, signal) => fail(new Error(`Chrome exited: ${code ?? signal}\n${stderr}`)));
chrome.stdio[3].on('error', fail);
chrome.stdio[4].on('data', chunk => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf('\0')) !== -1) {
        const message = JSON.parse(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
        const item = pending.get(message.id);
        if (!item) continue;
        pending.delete(message.id);
        clearTimeout(item.timer);
        if (message.error) item.reject(new Error(JSON.stringify(message.error)));
        else item.resolve(message.result);
    }
});
function send(method, params = {}, sessionId) {
    if (failure) return Promise.reject(failure);
    return new Promise((resolve, reject) => {
        const id = ++seq;
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`CDP timeout: ${method}\n${stderr}`));
        }, 15000);
        pending.set(id, {resolve, reject, timer});
        chrome.stdio[3].write(JSON.stringify({id, method, params, sessionId}) + '\0');
    });
}
try {
    await mkdir(out, {recursive: true});
    const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
    const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
    const call = (method, params) => send(method, params, sessionId);
    await call('Page.enable');
    await call('Network.enable');
    await call('Network.setBlockedURLs', {urls: ['http://*', 'https://*']});
    await call('Emulation.setDeviceMetricsOverride', {width: 1280, height: 640, deviceScaleFactor: 1, mobile: false});
    await call('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: 'light'}]});
    for (const lang of ['ru', 'en']) {
        const url = pathToFileURL(path.join(here, `${lang}.html`)).href;
        const nav = await call('Page.navigate', {url});
        if (nav.errorText) throw new Error(nav.errorText);
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
            const {result} = await call('Runtime.evaluate', {expression: `location.href === ${JSON.stringify(url)} && document.readyState === 'complete'`, returnByValue: true});
            if (result.value) { ready = true; break; }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (!ready) throw new Error(`Page not ready: ${lang}`);
        const check = await call('Runtime.evaluate', {awaitPromise: true, returnByValue: true, expression: `(async () => {
            await document.fonts.ready;
            await Promise.all(Array.from(document.images, image => image.decode()));
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const bounds = element => { const r = element.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}; };
            return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
                boxes:Array.from(document.querySelectorAll('.brand,h1,.points,.browsers,.address,.sample'),bounds)};
        })()`});
        if (check.exceptionDetails) throw new Error(JSON.stringify(check.exceptionDetails));
        const geometry = check.result.value;
        if (geometry.scrollWidth !== 1280 || geometry.scrollHeight !== 640 || geometry.boxes.some(r => r.x < 0 || r.y < 0 || r.right > 1280 || r.bottom > 640)) {
            throw new Error(`Banner overflow: ${JSON.stringify(geometry)}`);
        }
        for (const format of ['png', 'webp']) {
            const {data} = await call('Page.captureScreenshot', {format, ...(format === 'webp' ? {quality: 90} : {}), captureBeyondViewport: false,
                clip: {x: 0, y: 0, width: 1280, height: 640, scale: 1}});
            const bytes = Buffer.from(data, 'base64');
            if (format === 'png' && bytes.length > 1000000) throw new Error(`PNG exceeds 1 MB: ${bytes.length}`);
            const file = path.join(out, `banner-${lang}.${format}`);
            await writeFile(file, bytes);
            console.log(`${file}: ${bytes.length} bytes`);
        }
    }
} finally {
    if (chrome.exitCode === null && chrome.signalCode === null) {
        const exited = new Promise(resolve => chrome.once('exit', resolve));
        chrome.kill('SIGKILL');
        await exited;
    }
    await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
}
