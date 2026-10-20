# Playwright E2E Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up and automate End-to-End (E2E) testing with Playwright for the PWA Audioguide, verifying complete online and offline user journeys in a real browser.

**Architecture:** Playwright tests run against a lightweight local Node.js static server supporting HTTP Range 206 requests. The suite covers online navigation, language switching, carousels, audio playback/seeking, Service Worker preloading into Cache Storage, and offline navigation/audio playback when the network is severed.

**Tech Stack:** Node.js, `@playwright/test`, Chromium, Vanilla JS / Service Worker / CacheStorage.

**Spec:** `docs/superpowers/specs/2026-10-20-e2e-playwright-design.md`

## Global Constraints

- Real browser automation only; no mocking of `Audio`, `ServiceWorker`, `CacheStorage`, or network requests in E2E tests.
- Zero extra runtime dependencies; `@playwright/test` is strictly a `devDependency`.
- Static HTTP server for testing must support HTTP Range 206 Partial Content headers (`Range`, `Accept-Ranges`, `Content-Range`) for native audio streaming.
- Headless Chromium execution by default, compatible with local CLI and CI.
- All code, files, variable names, and comments in English.

## Review Focus

1. **Audio playback policy in Headless Chromium:** Headless Chromium might restrict audio unless triggered by explicit click. Verified by test clicking `#btn-player-play-pause` and checking `audio.currentTime > 0`.
2. **Service Worker registration timing:** Tests must await `navigator.serviceWorker.ready` before invoking cache-dependent features.
3. **HTTP Range 206 offline slicing:** Audio seeking while offline relies on `service-worker.js` range response builder. Tested by asserting `currentTime` updates during offline playback.
4. **Preloader progress and completion:** Preload button state transitions (`disabled`, progress updates, and final `offlineReady` check icon) must complete before severing network.
5. **Language persistence:** Language change must immediately update DOM labels and stay active across navigation.

---

### Task 1: Lightweight HTTP Range Static Server & Package Setup

**Files:**
- Create: `scripts/serve.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `node scripts/serve.js [port]` serving project root with HTTP 200, MIME types, and HTTP 206 Partial Content support.

- [ ] **Step 1: Implement `scripts/serve.js`**

Implement zero-dependency Node.js HTTP static server in `scripts/serve.js`:
- Supports MIME types for `.html`, `.css`, `.js`, `.yml`, `.webm`, `.m4a`, `.jpg`, `.png`, `.webmanifest`.
- Handles `Range: bytes=start-end` requests: returns status `206 Partial Content`, headers `Content-Range: bytes start-end/total`, `Accept-Ranges: bytes`, `Content-Length`, and sends sliced file buffer.
- Handles standard GET requests: returns status `200 OK` with full stream/buffer.
- Supports configurable port (default `8080` or `process.env.PORT`).

- [ ] **Step 2: Verify `scripts/serve.js` with manual curl / fetch test**

Run: `node scripts/serve.js 8089 &` then `curl -I -r bytes=0-10 http://localhost:8089/content/fr/choir.webm`
Expected: `HTTP/1.1 206 Partial Content`, `Content-Range: bytes 0-10/...`, `Accept-Ranges: bytes`.
Kill the background test server.

- [ ] **Step 3: Install `@playwright/test` and Chromium browser**

Run: `npm install -D @playwright/test && npx playwright install chromium`
Expected: `@playwright/test` added to `devDependencies` in `package.json`, Chromium browser installed.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/serve.js
git commit -m "chore: add static range server and playwright dependency"
```

---

### Task 2: Playwright Configuration & Baseline Smoke Test

**Files:**
- Create: `playwright.config.js`
- Create: `tests/e2e/smoke.spec.js`

**Interfaces:**
- Consumes: `scripts/serve.js`
- Produces: `playwright.config.js` running tests on Chromium with automatic `webServer` orchestration on `http://127.0.0.1:8080`.

- [ ] **Step 1: Write Playwright configuration in `playwright.config.js`**

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

- [ ] **Step 2: Write baseline smoke test in `tests/e2e/smoke.spec.js`**

```javascript
import { test, expect } from '@playwright/test';

test('app shell loads successfully', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Audioguide/);
  await expect(page.locator('#view-home')).toBeVisible();
  await expect(page.locator('#monument-title')).toContainText('Cathédrale Saint-Gatien');
});
```

- [ ] **Step 3: Run Playwright smoke test to verify execution**

Run: `npx playwright test tests/e2e/smoke.spec.js`
Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.js tests/e2e/smoke.spec.js
git commit -m "test(e2e): configure playwright and add baseline smoke test"
```

---

### Task 3: Online User Journey Test Suite

**Files:**
- Create: `tests/e2e/online-flow.spec.js`

**Interfaces:**
- Consumes: `#view-home`, `#view-tours`, `#view-step`, `#audio-player-bar`, `#player-seekbar`, `#btn-player-play-pause`, `#btn-player-step-next`, `#step-selector-select`.
- Produces: Comprehensive online user flow assertions verifying language switching, view transitions, carousel slides, audio playback, time seeking, and step jumping.

- [ ] **Step 1: Write the failing tests in `tests/e2e/online-flow.spec.js`**

Test scenarios to cover:
1. `language selection updates UI labels and persists`:
   - Start at `/index.html`.
   - Click English language button (`[data-lang="en"]`).
   - Verify `#monument-title` or button texts update to English ("Start tour").
   - Click French language button (`[data-lang="fr"]`).
   - Verify UI updates back to French ("Commencer la visite").
2. `tour navigation and step view content`:
   - Click `#btn-start-tours` -> `#view-tours` is visible.
   - Click tour card (`.tour-card[data-tour-id="cathedral-highlights"]`).
   - Verify `#view-step` is visible, `#step-heading` contains "Façade occidentale".
   - Verify carousel `.carousel-container` is present with navigation dots `.carousel-dot`.
   - Click second dot `.carousel-dot[data-index="1"]`, verify second slide becomes active.
3. `audio playback, time updates, and seeking`:
   - Verify `#audio-player-bar` is visible.
   - Click `#btn-player-play-pause`.
   - Wait for audio `currentTime` > 0 (`page.evaluate(() => document.querySelector('audio').currentTime > 0)`).
   - Click `#btn-player-skip-forward` (+10s) or dispatch seekbar input event to seek.
   - Verify `currentTime` increases accordingly.
   - Click `#btn-player-play-pause` to pause. Verify audio is paused.
4. `step navigation via buttons and dropdown selector`:
   - Click `#btn-player-step-next`.
   - Verify `#step-heading` updates to Step 2 ("Nef gothique").
   - Change select dropdown `#step-selector-select` to Step 3.
   - Verify `#step-heading` updates to Step 3 ("Chœur et vitraux").
   - Click back button `#btn-step-back-tours` -> `#view-tours` is visible.
   - Click back button `#btn-tours-back` -> `#view-home` is visible.

- [ ] **Step 2: Run test suite to verify execution**

Run: `npx playwright test tests/e2e/online-flow.spec.js`
Expected: PASS. If any selector mismatch or timing issue occurs, adjust selector/wait condition.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/online-flow.spec.js
git commit -m "test(e2e): add comprehensive online user flow test suite"
```

---

### Task 4: Offline Preload & Disconnected Tour Test Suite

**Files:**
- Create: `tests/e2e/offline-tour.spec.js`

**Interfaces:**
- Consumes: `service-worker.js`, `#btn-preload-cathedral-highlights`, `context.setOffline(true)`.
- Produces: Full offline capability verification ensuring assets, carousels, and audio playback work when network is disabled.

- [ ] **Step 1: Write `tests/e2e/offline-tour.spec.js`**

Test scenarios to cover:
1. `service worker registers and activates`:
   - Load `/index.html`.
   - Assert `await page.evaluate(() => navigator.serviceWorker.ready)` resolves.
2. `offline tour preloading stores assets in CacheStorage`:
   - Navigate to `#view-tours`.
   - Click `#btn-preload-cathedral-highlights`.
   - Assert download progress appears (`#preload-status-cathedral-highlights`).
   - Wait for download completion: `#btn-preload-cathedral-highlights` contains "Prêt pour écoute hors-ligne" or check icon.
   - Query `window.caches`: verify cache contains `config.yml`, markdown files, images, and audio files.
3. `offline visit when network is cut`:
   - Cut network: `await context.setOffline(true)`.
   - Navigate into tour (`.tour-card[data-tour-id="cathedral-highlights"]`).
   - Verify Step 1 loads text and images without network error.
   - Trigger audio playback via `#btn-player-play-pause`.
   - Assert audio plays (`currentTime > 0`) while offline.
   - Seek audio (+10s or seekbar) while offline; verify Service Worker serves range response 206 from cache and playback continues.
   - Click `#btn-player-step-next` to go to Step 2 while offline.
   - Verify Step 2 markdown and images load from cache.

- [ ] **Step 2: Run test suite to verify execution**

Run: `npx playwright test tests/e2e/offline-tour.spec.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/offline-tour.spec.js
git commit -m "test(e2e): add offline tour preloading and disconnected playback test suite"
```

---

### Task 5: NPM Scripts Integration & Test Suite Validation

**Files:**
- Modify: `package.json`
- Remove / Clean: `tests/e2e/smoke.spec.js` (if redundant with online flow)

**Interfaces:**
- Produces: `npm run test:e2e`, `npm run test:unit`, `npm test` running full unit + E2E test suite.

- [ ] **Step 1: Update scripts in `package.json`**

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

- [ ] **Step 2: Run entire test suite**

Run: `npm test`
Expected:
1. `tests/run-all-tests.sh` executes all 6 unit suites (100% GREEN).
2. Playwright executes all E2E specs in Chromium headless (100% PASS).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "ci: integrate playwright e2e tests into npm test script"
```
