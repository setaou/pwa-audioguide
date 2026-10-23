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

// 7. Test combined duration & transition playback
{
  const mockMain = new MockAudioElement();
  mockMain.duration = 100;
  const mockTrans = new MockAudioElement();
  mockTrans.duration = 40;

  const dualPlayer = new AudioPlayer({
    audioElement: mockMain,
    transitionAudioElement: mockTrans
  });

  dualPlayer.loadStep(
    { webm: 'step-1.webm', m4a: 'step-1.m4a' },
    { webm: 'trans-1-2.webm', m4a: 'trans-1-2.m4a' },
    'tests/fixtures/content/fr/'
  );

  mockMain.emit('loadedmetadata');
  mockTrans.emit('loadedmetadata');

  assert.strictEqual(dualPlayer.getDuration(), 140, 'Total virtual duration must be 100 + 40 = 140');
  assert.strictEqual(dualPlayer.mainDuration, 100);
  assert.strictEqual(dualPlayer.transitionDuration, 40);

  // Seek into transition
  dualPlayer.seek(110);
  assert.strictEqual(dualPlayer.getCurrentTime(), 110);
  assert.strictEqual(mockTrans.currentTime, 10);
  assert.strictEqual(dualPlayer.isTransitionActive, true);

  // Seek back into main
  dualPlayer.seek(50);
  assert.strictEqual(dualPlayer.getCurrentTime(), 50);
  assert.strictEqual(mockMain.currentTime, 50);
  assert.strictEqual(dualPlayer.isTransitionActive, false);

  // Automatic handover from main to transition on ended
  let mainEndedEmitted = false;
  let fullEndedEmitted = false;
  dualPlayer.onMainAudioEnded = () => { mainEndedEmitted = true; };
  dualPlayer.onEnded = () => { fullEndedEmitted = true; };

  await dualPlayer.play();
  mockMain.emit('ended');
  assert.strictEqual(mainEndedEmitted, true, 'Main audio ended must trigger onMainAudioEnded');
  assert.strictEqual(fullEndedEmitted, false, 'Main audio ended must NOT trigger onEnded when transition exists');
  assert.strictEqual(dualPlayer.isTransitionActive, true, 'Transition must become active when main ends');

  // Transition ended triggers full onEnded
  mockTrans.emit('ended');
  assert.strictEqual(fullEndedEmitted, true, 'Transition audio ended must trigger onEnded');
  assert.strictEqual(dualPlayer.isPlaying(), false, 'Player must be stopped when transition ends');

  // Test graceful degradation on transition error
  const mockMain2 = new MockAudioElement();
  mockMain2.duration = 100;
  const mockTrans2 = new MockAudioElement();
  mockTrans2.duration = 40;

  const playerWithFaultyTrans = new AudioPlayer({
    audioElement: mockMain2,
    transitionAudioElement: mockTrans2
  });

  playerWithFaultyTrans.loadStep(
    { webm: 'step-1.webm', m4a: 'step-1.m4a' },
    { webm: 'broken.webm', m4a: 'broken.m4a' },
    'tests/fixtures/content/fr/'
  );
  mockMain2.emit('loadedmetadata');
  mockTrans2.emit('error', new Error('404 Not Found'));

  assert.strictEqual(playerWithFaultyTrans.transitionDuration, 0, 'Transition duration must reset to 0 on error');
  assert.strictEqual(playerWithFaultyTrans.getDuration(), 100, 'Total duration must degrade to main duration on error');
  assert.strictEqual(playerWithFaultyTrans.isTransitionActive, false);
}

console.log('✓ test-player passed successfully!');
