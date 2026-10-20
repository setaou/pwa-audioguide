import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const playerModulePath = path.join(rootDir, 'js/player.js');

assert(fs.existsSync(playerModulePath), 'js/player.js must exist');

const { AudioPlayer, formatTime } = await import(`file://${playerModulePath}`);

assert(typeof AudioPlayer === 'function', 'AudioPlayer must be a class/function');
assert(typeof formatTime === 'function', 'formatTime must be a function');

// Test formatTime helper
assert.strictEqual(formatTime(0), '00:00');
assert.strictEqual(formatTime(65), '01:05');
assert.strictEqual(formatTime(125.7), '02:05');
assert.strictEqual(formatTime(3600), '60:00');

// Mock HTMLAudioElement for testing in Node environment
class MockAudioElement {
  constructor() {
    this.children = [];
    this.currentTime = 0;
    this.duration = 180; // 3 minutes
    this.paused = true;
    this.ended = false;
    this.listeners = {};
  }

  appendChild(child) {
    this.children.push(child);
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  removeEventListener(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== fn);
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => fn(...args));
    }
  }

  async play() {
    this.paused = false;
    this.ended = false;
    this.emit('play');
  }

  pause() {
    this.paused = true;
    this._pendingPause = true;
    queueMicrotask(() => {
      if (this._pendingPause) {
        this._pendingPause = false;
        this.emit('pause');
      }
    });
  }

  load() {
    // According to HTML5 spec, load() empties task queue and emits emptied
    this._pendingPause = false;
    this.currentTime = 0;
    this.emit('emptied');
    this.emit('loadedmetadata');
  }
}

// 1. Test source generation
const mockAudio = new MockAudioElement();
const player = new AudioPlayer({ audioElement: mockAudio });

let metadataUpdated = false;
player.onTimeUpdate = (cur, dur) => {
  if (dur === 180) metadataUpdated = true;
};

mockAudio.emit('loadedmetadata');
assert.strictEqual(metadataUpdated, true, 'loadedmetadata must trigger onTimeUpdate with duration');

player.loadStep({
  webm: 'step-1.webm',
  m4a: 'step-1.m4a'
}, 'tests/fixtures/content/fr/');

const sources = player.getSources();
assert.strictEqual(sources.length, 2, 'Must have 2 audio sources');
assert.strictEqual(sources[0].src, 'tests/fixtures/content/fr/step-1.webm');
assert.strictEqual(sources[0].type, 'audio/webm; codecs=opus');
assert.strictEqual(sources[1].src, 'tests/fixtures/content/fr/step-1.m4a');
assert.strictEqual(sources[1].type, 'audio/mp4');

// 2. Test play / pause state
let stateEvents = [];
player.onStateChange = (state) => stateEvents.push(state);

await player.play();
assert.strictEqual(player.isPlaying(), true);

player.pause();
assert.strictEqual(player.isPlaying(), false);

// Test: loadStep while playing must stop playback and emit onStateChange(false)
await player.play();
assert.strictEqual(player.isPlaying(), true);
stateEvents = [];

player.loadStep({
  webm: 'step-2.webm',
  m4a: 'step-2.m4a'
}, 'tests/fixtures/content/fr/');

assert.strictEqual(player.isPlaying(), false, 'Player must be stopped after loadStep');
assert(stateEvents.length > 0 && stateEvents[stateEvents.length - 1] === false, 'loadStep must emit onStateChange(false)');

// 3. Test skipping & clamping
mockAudio.currentTime = 50;
player.skip(-10);
assert.strictEqual(mockAudio.currentTime, 40, 'Skip -10 should move from 50 to 40');

player.skip(-100);
assert.strictEqual(mockAudio.currentTime, 0, 'Skip backward beyond start must clamp to 0');

player.skip(+30);
assert.strictEqual(mockAudio.currentTime, 30);

player.skip(+500);
assert.strictEqual(mockAudio.currentTime, 180, 'Skip forward beyond duration must clamp to duration');

// 4. Test seeking
player.seek(75);
assert.strictEqual(mockAudio.currentTime, 75);

// 5. Test audio 'ended' behavior: MUST pause and NOT auto-advance
let autoAdvanced = false;
player.onNextStepRequested = () => { autoAdvanced = true; };

mockAudio.emit('ended');
assert.strictEqual(player.isPlaying(), false, 'Player must be stopped when audio ends');
assert.strictEqual(autoAdvanced, false, 'Audio player must NOT auto-advance when ended');

// 6. Test dev mode audio loading via Blob URL for seekability without Range server
{
  const mockDevAudio = new MockAudioElement();
  mockDevAudio.canPlayType = (type) => type.includes('webm') ? 'probably' : '';
  let revokedUrls = [];
  const origRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = (url) => {
    revokedUrls.push(url);
    if (origRevoke) origRevoke(url);
  };

  const origFetch = globalThis.fetch;
  let fetchedUrls = [];
  globalThis.fetch = async (url, opts) => {
    fetchedUrls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      blob: async () => new Blob(['mock-audio'], { type: 'audio/webm' })
    };
  };

  try {
    const devPlayer = new AudioPlayer({ audioElement: mockDevAudio, isDevMode: true });
    assert.strictEqual(devPlayer.isDevMode, true, 'devPlayer must have isDevMode true');

    devPlayer.loadStep({
      webm: 'step-1.webm',
      m4a: 'step-1.m4a'
    }, 'tests/fixtures/content/fr/');

    await devPlayer.play();

    assert.strictEqual(fetchedUrls.length, 1, 'Should fetch audio file in dev mode');
    assert.strictEqual(fetchedUrls[0].url, 'tests/fixtures/content/fr/step-1.webm');
    assert.deepStrictEqual(fetchedUrls[0].opts, { cache: 'no-cache' });
    assert(mockDevAudio.src && mockDevAudio.src.startsWith('blob:'), 'mockDevAudio.src must be set to a blob: URL');

    const firstBlobUrl = mockDevAudio.src;

    // Load next step: previous blob URL must be revoked
    devPlayer.loadStep({
      webm: 'step-2.webm',
      m4a: 'step-2.m4a'
    }, 'tests/fixtures/content/fr/');
    await devPlayer.play();

    assert(revokedUrls.includes(firstBlobUrl), 'Previous Blob URL must be revoked on step change');
    const secondBlobUrl = mockDevAudio.src;

    // destroy() must revoke current blob URL
    devPlayer.destroy();
    assert(revokedUrls.includes(secondBlobUrl), 'Current Blob URL must be revoked on destroy()');
  } finally {
    globalThis.fetch = origFetch;
    URL.revokeObjectURL = origRevoke;
  }
}

console.log('✓ test-player passed successfully!');
