import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const htmlPath = path.join(rootDir, 'index.html');
const manifestPath = path.join(rootDir, 'manifest.webmanifest');
const cssPath = path.join(rootDir, 'css/styles.css');
const iconsPath = path.join(rootDir, 'js/icons.js');
const appPath = path.join(rootDir, 'js/app.js');

assert(fs.existsSync(htmlPath), 'index.html must exist');
assert(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');
assert(fs.existsSync(cssPath), 'css/styles.css must exist');
assert(fs.existsSync(iconsPath), 'js/icons.js must exist');
assert(fs.existsSync(appPath), 'js/app.js must exist');

// 1. Verify manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.name, 'manifest must have name');
assert.strictEqual(manifest.display, 'standalone');
assert(manifest.start_url, 'manifest must have start_url');

// 2. Verify HTML shell
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
assert(htmlContent.includes('id="view-home"'), 'index.html must have view-home');
assert(htmlContent.includes('id="view-tours"'), 'index.html must have view-tours');
assert(htmlContent.includes('id="view-step"'), 'index.html must have view-step');
assert(htmlContent.includes('id="audio-player-bar"'), 'index.html must have audio player bar');
assert(htmlContent.includes('manifest.webmanifest'), 'index.html must link manifest');
assert(htmlContent.includes('css/styles.css'), 'index.html must link css/styles.css');
assert(htmlContent.includes("navigator.serviceWorker.register('./service-worker.js', { type: 'module' })"), 'index.html must register Service Worker as module');

// 3. Verify Icons
const { getIcon } = await import(`file://${iconsPath}`);
assert(typeof getIcon === 'function', 'getIcon must be a function');
assert(getIcon('play').includes('<svg'), 'getIcon(play) must return SVG');
assert(getIcon('pause').includes('<svg'), 'getIcon(pause) must return SVG');
assert(getIcon('skip-back').includes('<svg'), 'getIcon(skip-back) must return SVG');
assert(getIcon('skip-forward').includes('<svg'), 'getIcon(skip-forward) must return SVG');
assert(getIcon('step-prev').includes('<svg'), 'getIcon(step-prev) must return SVG');
assert(getIcon('step-next').includes('<svg'), 'getIcon(step-next) must return SVG');

// 4. Verify App State Manager
const { AudioguideApp } = await import(`file://${appPath}`);
assert(typeof AudioguideApp === 'function', 'AudioguideApp class must exist');

const mockStorage = {};
const fakeLocalStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); }
};

const app = new AudioguideApp({ localStorage: fakeLocalStorage });
assert.strictEqual(app.currentView, 'home', 'Default view should be home');

app.setLanguage('en');
assert.strictEqual(app.currentLanguage, 'en');
assert.strictEqual(fakeLocalStorage.getItem('audioguide_lang'), 'en');

app.navigateTo('tours');
assert.strictEqual(app.currentView, 'tours');

console.log('✓ test-app-flow passed successfully!');
