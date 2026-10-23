import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const swPath = path.join(rootDir, 'service-worker.js');
const preloaderPath = path.join(rootDir, 'js/preloader.js');

assert(fs.existsSync(swPath), 'service-worker.js must exist');
assert(fs.existsSync(preloaderPath), 'js/preloader.js must exist');

const { parseRangeHeader, buildRangeResponse, APP_SHELL } = await import(`file://${swPath}`);
const { TourPreloader, selectOptimalAudio } = await import(`file://${preloaderPath}`);

// 0. Verify APP_SHELL contains essential shell files
assert(Array.isArray(APP_SHELL), 'APP_SHELL must be an array');
assert(APP_SHELL.includes('./index.html'), 'APP_SHELL must include ./index.html');
assert(APP_SHELL.includes('./css/styles.css'), 'APP_SHELL must include ./css/styles.css');
assert(APP_SHELL.includes('./config.yml'), 'APP_SHELL must include ./config.yml');

// 1. Test parseRangeHeader
const totalSize = 1000;

// Test standard range: bytes=200-500
const r1 = parseRangeHeader('bytes=200-500', totalSize);
assert.deepStrictEqual(r1, { start: 200, end: 500, length: 301 });

// Test open-ended range: bytes=200-
const r2 = parseRangeHeader('bytes=200-', totalSize);
assert.deepStrictEqual(r2, { start: 200, end: 999, length: 800 });

// Test suffix range: bytes=-300 (last 300 bytes)
const r3 = parseRangeHeader('bytes=-300', totalSize);
assert.deepStrictEqual(r3, { start: 700, end: 999, length: 300 });

// 2. Test buildRangeResponse
const dummyBuffer = new Uint8Array(1000);
for (let i = 0; i < 1000; i++) dummyBuffer[i] = i % 256;

const rangeRes = buildRangeResponse(dummyBuffer.buffer, 'bytes=200-500', 'audio/webm; codecs=opus');
assert.strictEqual(rangeRes.status, 206, 'Status must be 206 Partial Content');
assert.strictEqual(rangeRes.headers.get('Content-Range'), 'bytes 200-500/1000');
assert.strictEqual(rangeRes.headers.get('Content-Length'), '301');
assert.strictEqual(rangeRes.headers.get('Accept-Ranges'), 'bytes');
assert.strictEqual(rangeRes.headers.get('Content-Type'), 'audio/webm; codecs=opus');

// 3. Test selectOptimalAudio in preloader
const audioConfig = { webm: 'step.webm', m4a: 'step.m4a' };

// When WebM Opus supported:
const webmAudio = selectOptimalAudio(audioConfig, (type) => {
  return type.includes('webm') ? 'probably' : '';
});
assert.strictEqual(webmAudio, 'step.webm', 'Should choose webm when supported');

// When only M4A AAC supported (e.g. older iOS Safari):
const m4aAudio = selectOptimalAudio(audioConfig, (type) => {
  return type.includes('mp4') ? 'probably' : '';
});
assert.strictEqual(m4aAudio, 'step.m4a', 'Should choose m4a fallback when webm is not supported');

// 4. Test TourPreloader with configurable contentDir
const preloader = new TourPreloader({ contentDir: 'tests/fixtures/content' });
assert.strictEqual(preloader.contentDir, 'tests/fixtures/content', 'Preloader must store configured contentDir');

const testTour = { id: 'tour-1', steps: ['step-1'] };
const testLangConfig = {
  steps: [
    {
      id: 'step-1',
      text_file: 'step-1.md',
      audio: { webm: 'step-1.webm', m4a: 'step-1.m4a' }
    }
  ]
};

const preloadedFiles = [];
const fetchedFiles = [];
const origFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  fetchedFiles.push(url);
  if (url.endsWith('.md')) {
    return {
      ok: true,
      text: async () => '![Test](img-1.jpg)'
    };
  }
  return { ok: true, text: async () => '' };
};

try {
  await preloader.preloadTour(testTour, 'fr', testLangConfig, (p) => {
    preloadedFiles.push(p.file);
  });
  assert(fetchedFiles.includes('tests/fixtures/content/fr/step-1.md'), 'Must fetch markdown with custom content dir');
  assert(preloadedFiles.includes('tests/fixtures/content/fr/config.yml'), 'Must preload custom content dir config.yml');
  assert(preloadedFiles.includes('tests/fixtures/content/fr/step-1.md'), 'Must preload custom content dir markdown');
  assert(preloadedFiles.includes('tests/fixtures/content/fr/step-1.webm'), 'Must preload custom content dir audio');
  assert(preloadedFiles.includes('tests/fixtures/content/fr/img-1.jpg'), 'Must preload custom content dir image');

  // Test: Preload tour with step transitions
  const transitionTour = { id: 'tour-trans', steps: ['step-1', 'step-2'] };
  const transitionLangConfig = {
    steps: [
      {
        id: 'step-1',
        text_file: 'step-1.md',
        audio: { webm: 'step-1.webm', m4a: 'step-1.m4a' },
        transitions: {
          'step-2': { audio: { webm: 'trans-1-2.webm', m4a: 'trans-1-2.m4a' } }
        }
      },
      {
        id: 'step-2',
        text_file: 'step-2.md',
        audio: { webm: 'step-2.webm', m4a: 'step-2.m4a' }
      }
    ]
  };

  const transPreloadedFiles = [];
  await preloader.preloadTour(transitionTour, 'fr', transitionLangConfig, (p) => {
    transPreloadedFiles.push(p.file);
  });
  assert(transPreloadedFiles.includes('tests/fixtures/content/fr/trans-1-2.webm'), 'Must preload transition audio file');
} finally {
  globalThis.fetch = origFetch;
}

console.log('✓ test-service-worker passed successfully!');
