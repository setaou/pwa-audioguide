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

// 5. Verify Player pause on navigation and autoplay on step change
let playerPaused = false;
let playerPlayed = false;
app.player = {
  pause: () => { playerPaused = true; },
  loadStep: () => {},
  play: () => { playerPlayed = true; }
};

app.currentTour = { id: 'tour-1', steps: ['step-1', 'step-2'] };
app.langConfig = {
  steps: [
    { id: 'step-1', title: 'Step 1', audio: { webm: 'step1.webm' } },
    { id: 'step-2', title: 'Step 2', audio: { webm: 'step2.webm' } }
  ]
};

playerPaused = false;
playerPlayed = false;
await app.loadStepByIndex(1);
assert.strictEqual(playerPaused, true, 'loadStepByIndex must immediately pause audio playback');
assert.strictEqual(playerPlayed, true, 'loadStepByIndex must auto-start playback when step has audio');

// Verify selectTour also triggers auto-play for step 0
playerPlayed = false;
app.selectTour({ id: 'tour-1', steps: ['step-1', 'step-2'] });
assert.strictEqual(playerPlayed, true, 'selectTour must auto-start playback for the first step');

// Verify step with no audio does not trigger play
app.langConfig.steps.push({ id: 'step-no-audio', title: 'Step without audio' });
app.currentTour.steps.push('step-no-audio');
playerPlayed = false;
await app.loadStepByIndex(2);
assert.strictEqual(playerPlayed, false, 'Step without audio must not trigger play');

playerPaused = false;
app.navigateTo('home');
assert.strictEqual(playerPaused, true, 'Navigating away from step must pause audio playback');

// 6. Verify No hardcoded UI strings dictionary in app.js
const appJsSource = fs.readFileSync(appPath, 'utf8');
assert(!appJsSource.includes('const UI_STRINGS'), 'UI strings must NOT be hardcoded in app.js dictionary');
assert(!appJsSource.includes('UI_STRINGS ='), 'UI strings must NOT be hardcoded in app.js');

// 7. Verify dynamic localization from langConfig
app.langConfig = {
  monument: {
    name: 'Cathédrale Saint-Gatien de Tours',
    subtitle: 'Chef-d\'œuvre gothique',
    badge: 'Monument Historique'
  },
  ui: {
    start_tours: 'Découvrir les parcours de visite',
    steps_count: '{count} étapes',
    step_of: 'Étape {current} sur {total}',
    downloading: 'Téléchargement {percent}%...'
  },
  steps: []
};

assert.strictEqual(app.t('start_tours'), 'Découvrir les parcours de visite');
assert.strictEqual(app.t('startTours'), 'Découvrir les parcours de visite', 'Should support camelCase key lookup');
assert.strictEqual(app.t('steps_count', 5), '5 étapes', 'Should interpolate single argument');
assert.strictEqual(app.t('step_of', 2, 8), 'Étape 2 sur 8', 'Should interpolate multiple arguments');
assert.strictEqual(app.t('downloading', 42), 'Téléchargement 42%...');

// 8. Test loading real content/fr/config.yml and content/en/config.yml
const jsYamlPath = path.join(rootDir, 'js/vendor/js-yaml.min.js');
const jsYamlCode = fs.readFileSync(jsYamlPath, 'utf8');
const vmCtx = {};
new Function('window', 'self', 'globalThis', jsYamlCode)(vmCtx, vmCtx, vmCtx);
const testParser = vmCtx.jsyaml;

const realApp = new AudioguideApp({
  yamlParser: testParser,
  localStorage: fakeLocalStorage
});

// Mock fetch to load files from disk
globalThis.fetch = async (url) => {
  const cleanUrl = url.replace(/^\.\//, '');
  const filePath = path.join(rootDir, cleanUrl);
  if (fs.existsSync(filePath)) {
    const text = fs.readFileSync(filePath, 'utf8');
    return {
      ok: true,
      status: 200,
      text: async () => text
    };
  }
  return {
    ok: false,
    status: 404,
    text: async () => 'Not found'
  };
};

await realApp.loadRootConfig();
assert(realApp.rootConfig, 'realApp should load rootConfig');

await realApp.loadLanguageConfig('fr');
assert.strictEqual(realApp.t('start_tours'), 'Découvrir les parcours de visite');
assert.strictEqual(realApp.t('tours_title'), 'Parcours de visite');
assert.strictEqual(realApp.langConfig.monument.badge, 'Monument Historique');
assert.strictEqual(realApp.langConfig.monument.name, 'Cathédrale Saint-Gatien de Tours');

await realApp.loadLanguageConfig('en');
assert.strictEqual(realApp.t('start_tours'), 'Explore Tour Circuits');
assert.strictEqual(realApp.t('tours_title'), 'Tour Circuits');
assert.strictEqual(realApp.langConfig.monument.badge, 'Historic Monument');
assert.strictEqual(realApp.langConfig.monument.name, 'Tours Cathedral (Saint-Gatien)');

// 9. Test config.md fallback loading
const testMdApp = new AudioguideApp({
  yamlParser: testParser,
  localStorage: fakeLocalStorage
});
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (url === 'content/testlang/config.yml') {
    return { ok: false, status: 404, text: async () => '' };
  }
  if (url === 'content/testlang/config.md') {
    return {
      ok: true,
      status: 200,
      text: async () => `---\nui:\n  start_tours: "Start MD"\n---\n`
    };
  }
  return originalFetch(url);
};

await testMdApp.loadLanguageConfig('testlang');
assert.strictEqual(testMdApp.t('start_tours'), 'Start MD', 'Should fallback to config.md if config.yml does not exist');
globalThis.fetch = originalFetch;

// 10. Test fallback_language resolution when keys are missing in active language
const fallbackTestApp = new AudioguideApp({
  yamlParser: testParser,
  localStorage: fakeLocalStorage
});

fallbackTestApp.fallbackLanguage = 'en';
fallbackTestApp.langConfig = {
  monument: {
    name: 'Cathédrale Saint-Gatien de Tours'
    // missing subtitle and badge
  },
  ui: {
    start_tours: 'Découvrir les parcours'
    // missing tours_title and steps_count
  }
};
fallbackTestApp.fallbackLangConfig = {
  monument: {
    name: 'Tours Cathedral',
    subtitle: 'Gothic Masterpiece',
    badge: 'Historic Monument'
  },
  ui: {
    start_tours: 'Explore Tours',
    tours_title: 'Tour Circuits',
    steps_count: '{count} steps'
  }
};

assert.strictEqual(fallbackTestApp.t('start_tours'), 'Découvrir les parcours', 'Should use language key when present');
assert.strictEqual(fallbackTestApp.t('tours_title'), 'Tour Circuits', 'Should fallback to fallback language when key is missing');
assert.strictEqual(fallbackTestApp.t('steps_count', 4), '4 steps', 'Should fallback and interpolate with fallback language');

// 11. Test dev mode (?dev=1)
assert(htmlContent.includes("new URLSearchParams(window.location.search).get('dev') === '1'"), 'index.html must check strictly for ?dev=1');
assert(htmlContent.includes('reg.unregister()'), 'index.html must unregister Service Worker in dev mode');
assert(htmlContent.includes('caches.delete'), 'index.html must clear caches in dev mode');

const devApp = new AudioguideApp({ isDevMode: true });
assert.strictEqual(devApp.isDevMode, true, 'App should recognize isDevMode flag');
assert.strictEqual(devApp.player.isDevMode, true, 'AudioPlayer should inherit isDevMode from AudioguideApp');

console.log('✓ test-app-flow passed successfully!');
