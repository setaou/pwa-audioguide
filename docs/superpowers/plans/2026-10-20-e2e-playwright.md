# Playwright E2E Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up and automate End-to-End (E2E) testing with Playwright for the PWA Audioguide using dedicated test fixtures (`tests/fixtures/`), completely isolated from production/demo data.

**Architecture:** Playwright tests run against a lightweight local Node.js static server supporting HTTP Range 206 requests. The PWA is booted with `?config=tests/fixtures/config.yml`. The suite covers online navigation, language switching, carousels, audio playback/seeking, Service Worker preloading of fixture assets into Cache Storage, and offline navigation/audio playback when the network is severed.

**Tech Stack:** Node.js, `@playwright/test`, Chromium, Vanilla JS / Service Worker / CacheStorage.

**Spec:** `docs/superpowers/specs/2026-10-20-e2e-playwright-design.md`

## Global Constraints

- **Strict Test Fixture Isolation:** Tests MUST use `tests/fixtures/` (`tests/fixtures/config.yml` and `tests/fixtures/content/{fr,en}/`), NEVER demo data (`content/`).
- Real browser automation only; no mocking of `Audio`, `ServiceWorker`, `CacheStorage`, or network requests in E2E tests.
- Zero extra runtime dependencies; `@playwright/test` is strictly a `devDependency`.
- Static HTTP server for testing must support HTTP Range 206 Partial Content headers (`Range`, `Accept-Ranges`, `Content-Range`) for native audio streaming.
- Headless Chromium execution by default, compatible with local CLI and CI.
- All code, files, variable names, and comments in English.

## Review Focus

1. **Audio playback policy in Headless Chromium:** Headless Chromium might restrict audio unless triggered by explicit click. Verified by test clicking `#btn-player-play-pause` and checking `audio.currentTime > 0`.
2. **Valid audio containers in test fixtures:** Fixture audio files (`step-*.webm`, `step-*.m4a`) must be valid playable containers (e.g., 3-second generated audio via ffmpeg) so Chromium's media decoder handles them without decoding errors.
3. **Config query parameter bootstrap:** `index.html` and `AudioguideApp` must accept `?config=tests/fixtures/config.yml` to switch root configuration seamlessly.
4. **Service Worker registration timing:** Tests must await `navigator.serviceWorker.ready` before invoking cache-dependent features.
5. **HTTP Range 206 offline slicing:** Audio seeking while offline relies on `service-worker.js` range response builder. Tested by asserting `currentTime` updates during offline playback.

---

### Task 1: Fixture Media Validation, HTTP Range Server & Playwright Setup

**Files:**
- Modify: `tests/fixtures/content/fr/step-1.{webm,m4a}`, `tests/fixtures/content/fr/step-2.{webm,m4a}`, `tests/fixtures/content/en/step-1.{webm,m4a}`, `tests/fixtures/content/en/step-2.{webm,m4a}`
- Create: `scripts/serve.js`
- Modify: `package.json`

**Interfaces:**
- Produces: Playable WebM/Opus and M4A/AAC fixture audio files in `tests/fixtures/content/{fr,en}/`.
- Produces: `node scripts/serve.js [port]` serving project root with HTTP 200, MIME types, and HTTP 206 Partial Content support.

- [ ] **Step 1: Generate valid playable 3-second audio files for test fixtures**

Use `ffmpeg` to generate valid 3-second audio files in `tests/fixtures/content/{fr,en}/`:
```bash
for lang in fr en; do
  for step in step-1 step-2; do
    ffmpeg -f lavfi -i "sine=frequency=440:duration=3" -c:a libopus -b:a 64k "tests/fixtures/content/$lang/$step.webm" -y
    ffmpeg -f lavfi -i "sine=frequency=440:duration=3" -c:a aac -b:a 64k "tests/fixtures/content/$lang/$step.m4a" -y
  done
done
```
Verify existing unit tests still pass: `bash tests/run-all-tests.sh`.

- [ ] **Step 2: Implement zero-dependency HTTP static range server in `scripts/serve.js`**

Implement Node.js HTTP server in `scripts/serve.js`:
- Supports MIME types for `.html`, `.css`, `.js`, `.yml`, `.webm`, `.m4a`, `.jpg`, `.png`, `.webmanifest`.
- Handles `Range: bytes=start-end` requests: returns status `206 Partial Content`, headers `Content-Range: bytes start-end/total`, `Accept-Ranges: bytes`, `Content-Length`, and sends sliced file buffer.
- Handles standard GET requests: returns status `200 OK` with full stream/buffer.
- Configurable port via CLI arg or `PORT` env var (default `8080`).

- [ ] **Step 3: Verify `scripts/serve.js` with curl**

Run: `node scripts/serve.js 8089 &` then `curl -I -r bytes=0-10 http://localhost:8089/tests/fixtures/content/fr/step-1.webm`
Expected: `HTTP/1.1 206 Partial Content`, `Content-Range: bytes 0-10/...`, `Accept-Ranges: bytes`.
Kill background server.

- [ ] **Step 4: Install `@playwright/test` and Chromium browser**

Run: `npm install -D @playwright/test && npx playwright install chromium`
Expected: `@playwright/test` in `devDependencies`, Chromium browser installed.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/ scripts/serve.js package.json package-lock.json
git commit -m "chore: prepare fixture media, range server and install playwright"
```

---

### Task 2: Config URL Parameter Support, Playwright Config & Smoke Test

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`
- Create: `playwright.config.js`
- Create: `tests/e2e/smoke.spec.js`

**Interfaces:**
- Produces: Loading `/index.html?config=tests/fixtures/config.yml` initializes `AudioguideApp` with `tests/fixtures/config.yml`.
- Produces: `playwright.config.js` with automated `webServer`.

- [ ] **Step 1: Ensure `index.html` and `js/app.js` honor `?config=` query parameter**

In `index.html`:
```javascript
const urlParams = new URLSearchParams(window.location.search);
const isDev = urlParams.get('dev') === '1';
const configPath = urlParams.get('config') || 'config.yml';

window.audioguideApp = new AudioguideApp({ isDevMode: isDev, rootConfigPath: configPath });
window.audioguideApp.init();
```

In `js/app.js`:
In `loadRootConfig()`, ensure `this.preloader.contentDir = this.getContentDir();` so the preloader always targets the fixture content directory.

- [ ] **Step 2: Write Playwright configuration in `playwright.config.js`**

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node scripts/serve.js 8080',
    url: 'http://127.0.0.1:8080/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
```

- [ ] **Step 3: Write baseline smoke test in `tests/e2e/smoke.spec.js` asserting fixture data**

```javascript
import { test, expect } from '@playwright/test';

test('app shell loads fixture configuration', async ({ page }) => {
  await page.goto('/index.html?config=tests/fixtures/config.yml');
  await expect(page).toHaveTitle(/Audioguide/);
  await expect(page.locator('#view-home')).toBeVisible();
  await expect(page.locator('#monument-title')).toContainText('Monument Fictif de Test');
});
```

- [ ] **Step 4: Run smoke test**

Run: `npx playwright test tests/e2e/smoke.spec.js`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add index.html js/app.js playwright.config.js tests/e2e/smoke.spec.js
git commit -m "feat(e2e): support config query param and add fixture smoke test"
```

---

### Task 3: Online User Journey Test Suite (Fixtures)

**Files:**
- Create: `tests/e2e/online-flow.spec.js`

**Interfaces:**
- Consumes: `/index.html?config=tests/fixtures/config.yml`, fixture elements ("Monument Fictif de Test", "Circuit Test 1", "Étape Fictive 1").
- Produces: End-to-end verification of language switching, tour selection, carousel navigation, audio playback, time seeking, and step jumping.

- [ ] **Step 1: Write tests in `tests/e2e/online-flow.spec.js`**

Test scenarios to cover:
1. `language selection updates UI labels and persists`:
   - Start at `/index.html?config=tests/fixtures/config.yml`.
   - Verify French title `#monument-title` is "Monument Fictif de Test".
   - Click English button (`[data-lang="en"]`).
   - Verify `#monument-title` becomes "Mock Test Monument" and CTA is "Start Tour Circuits".
   - Click French button (`[data-lang="fr"]`).
   - Verify `#monument-title` returns to "Monument Fictif de Test" and CTA is "Démarrer les parcours".
2. `tour navigation and step view content`:
   - Click `#btn-start-tours` -> `#view-tours` is visible.
   - Click fixture tour card (`.tour-card[data-tour-id="tour-1"]`).
   - Verify `#view-step` is visible, `#step-heading` contains "Étape Fictive 1".
   - Verify carousel `.carousel-container` is present with 2 dots `.carousel-dot`.
   - Click second dot `.carousel-dot[data-index="1"]`, verify second slide becomes active.
3. `audio playback, time updates, and seeking`:
   - Verify `#audio-player-bar` is visible.
   - Click `#btn-player-play-pause`.
   - Wait for audio `currentTime` > 0 (`page.evaluate(() => document.querySelector('audio').currentTime > 0)`).
   - Click `#btn-player-skip-forward` (+10s) or set seekbar range value.
   - Verify `currentTime` updates and playback continues without error.
   - Click `#btn-player-play-pause` to pause. Verify audio is paused.
4. `step navigation via buttons and dropdown selector`:
   - Click `#btn-player-step-next`.
   - Verify `#step-heading` updates to "Étape Fictive 2".
   - Change select dropdown `#step-selector-select` to "Étape Fictive 1".
   - Verify `#step-heading` updates back to "Étape Fictive 1".
   - Click back button `#btn-step-back-tours` -> `#view-tours` is visible.
   - Click back button `#btn-tours-back` -> `#view-home` is visible.

- [ ] **Step 2: Run online flow test suite**

Run: `npx playwright test tests/e2e/online-flow.spec.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/online-flow.spec.js
git commit -m "test(e2e): add comprehensive online user flow test suite with fixtures"
```

---

### Task 4: Offline Preload & Disconnected Tour Test Suite (Fixtures)

**Files:**
- Create: `tests/e2e/offline-tour.spec.js`

**Interfaces:**
- Consumes: `/index.html?config=tests/fixtures/config.yml`, `service-worker.js`, `#btn-preload-tour-1`, `context.setOffline(true)`.
- Produces: Complete verification of offline preloading of fixtures into CacheStorage, and offline browsing/audio playback when network is cut.

- [ ] **Step 1: Write `tests/e2e/offline-tour.spec.js`**

Test scenarios to cover:
1. `service worker registers and activates`:
   - Load `/index.html?config=tests/fixtures/config.yml`.
   - Assert `await page.evaluate(() => navigator.serviceWorker.ready)` resolves.
2. `offline tour preloading caches fixture assets`:
   - Navigate to `#view-tours`.
   - Click `#btn-preload-tour-1`.
   - Assert download progress appears (`#preload-status-tour-1`).
   - Wait for download completion: `#btn-preload-tour-1` contains "Prêt hors-ligne" or check icon.
   - Query `window.caches`: verify cache contains fixture files (`tests/fixtures/content/fr/config.yml`, `step-1.md`, `img-1.jpg`, audio files).
3. `offline visit when network is cut`:
   - Cut network: `await context.setOffline(true)`.
   - Navigate into tour (`.tour-card[data-tour-id="tour-1"]`).
   - Verify Step 1 loads markdown text and images without network errors.
   - Trigger audio playback via `#btn-player-play-pause`.
   - Assert audio plays (`currentTime > 0`) while offline.
   - Seek audio while offline; verify Service Worker serves range response 206 from cache.
   - Click `#btn-player-step-next` to go to Step 2 while offline.
   - Verify Step 2 markdown and images load from cache.

- [ ] **Step 2: Run offline tour test suite**

Run: `npx playwright test tests/e2e/offline-tour.spec.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/offline-tour.spec.js
git commit -m "test(e2e): add offline tour preloading and disconnected playback test suite with fixtures"
```

---

### Task 5: NPM Scripts Integration & Test Suite Validation

**Files:**
- Modify: `package.json`
- Remove: `tests/e2e/smoke.spec.js` (clean up temporary smoke test)

**Interfaces:**
- Produces: `npm run test:e2e`, `npm run test:unit`, `npm test` running full unit + E2E test suite.

- [ ] **Step 1: Update scripts in `package.json` and remove `tests/e2e/smoke.spec.js`**

Update `scripts` in `package.json`:
```json
{
  "scripts": {
    "serve": "node scripts/serve.js",
    "test:unit": "bash tests/run-all-tests.sh",
    "test:e2e": "playwright test",
    "test": "npm run test:unit && npm run test:e2e"
  }
}
```
Remove `tests/e2e/smoke.spec.js`.

- [ ] **Step 2: Run entire test suite**

Run: `npm test`
Expected:
1. `tests/run-all-tests.sh` executes all 6 unit suites (100% GREEN).
2. Playwright executes all E2E specs in Chromium headless (100% PASS).

- [ ] **Step 3: Commit**

```bash
git add package.json tests/e2e/
git commit -m "ci: integrate playwright e2e tests into npm test script"
```
