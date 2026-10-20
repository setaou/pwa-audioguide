# E2E Testing with Playwright - Design Document

## 1. Overview & Intent

The purpose of this project is to implement an automated End-to-End (E2E) test suite using **Playwright** for the PWA Audioguide.
While the project already has unit/integration tests running in Node.js with mock DOM and stubbed APIs, an E2E suite verifies the complete application inside a real browser engine (Chromium), confirming that all subsystems work together seamlessly:
- Single-page application UI transitions and localized strings.
- Interactive components (touch/click carousels, navigation dropdowns, sticky player bar).
- Real HTML5 Audio playback, state changes, and time seeking.
- Real Service Worker lifecycle, Cache Storage preloading, and offline audio playback with HTTP 206 Partial Content slicing.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Real Browser Automation:** Run automated tests in a real headless browser using Playwright.
- **Strict Isolation with Test Fixtures:** E2E tests MUST run against the lightweight test fixtures (`tests/fixtures/config.yml` and `tests/fixtures/content/{fr,en}/`), NEVER against the production/demo data (`config.yml` or `content/`).
- **Online User Journey Validation:**
  - Application startup with fixture config (`?config=tests/fixtures/config.yml`) and language selection (FR / EN).
  - Tour selection ("Circuit Test 1" / "Test Tour 1") and navigation to step view ("Étape Fictive 1").
  - Step content rendering (Markdown, image carousels from fixtures, captions).
  - Sticky audio player functionality: Play, Pause, Skip (+10s / -10s), Seekbar interaction, and step-to-step navigation using fixture audio files.
- **Offline User Journey Validation:**
  - One-click tour preloading into Cache Storage via `js/preloader.js` targeting test fixture assets.
  - Progress feedback during preloading and final "offline ready" indicator.
  - Full network disconnection simulation (`context.setOffline(true)`).
  - Step navigation, image viewing, and audio playback/seeking while completely offline, served by `service-worker.js`.
- **Zero-Friction Test Execution:**
  - Local web server automatically spawned by Playwright (`webServer` configuration in `playwright.config.js`).
  - Standard npm commands: `npm run test:e2e` and integrated into `npm test`.

### Non-Goals
- **Testing against Demo/Production Data in E2E:** Demo assets (`content/`) are excluded from E2E to ensure lightning-fast execution, zero flakiness, and complete isolation.
- **Visual Regression (Pixel Diffing):** No screenshot baseline diffing; tests focus purely on functionality, DOM state, accessibility, and audio/caching behavior.
- **Multi-Browser Grid in Default CI:** The primary target is Chromium headless (guaranteeing standard Service Worker and Opus/WebM audio support). Firefox and WebKit can be configured as optional profiles.
- **External Cloud Services:** No SauceLabs, BrowserStack, or external testing clouds; everything runs locally or in standard CI.

### Anti-Goals
- **Mocked Browser APIs in E2E:** E2E tests must NOT mock `Audio`, `ServiceWorker`, `CacheStorage`, or network requests. They must run against the real static file server and the real Service Worker.

---

## 3. Architecture & Test Plan

### Directory Structure
```
audioguide/
├── playwright.config.js          # Playwright test configuration & web server setup
├── tests/
│   ├── e2e/
│   │   ├── online-flow.spec.js   # Online browsing, language switch, audio seeking
│   │   └── offline-tour.spec.js  # Preloading, offline network cut, offline audio/step navigation
│   └── ...                       # Existing unit/integration test suites
```

### Static Web Server
Playwright requires a web server to serve the PWA over HTTP (Service Workers cannot register on `file://` URLs).
- A lightweight Node.js static server script or an existing static file server (e.g., Node's built-in `http` module or a standard zero-dependency local static server that handles HTTP 206 Partial Content requests).
- Configured in `playwright.config.js` under `webServer` so it automatically starts before test execution and stops afterwards.

### Test Scenarios

#### Scenario 1: Online Journey (`online-flow.spec.js`)
1. **Homepage & Language Switch:**
   - Navigates to `/index.html?config=tests/fixtures/config.yml`.
   - Checks initial UI strings (monument title "Monument Fictif de Test", start button "Démarrer les parcours").
   - Switches language (French -> English -> French) and verifies that UI labels update accordingly ("Mock Test Monument", "Start Tour Circuits").
2. **Tour Selection & Step View:**
   - Clicks "Démarrer les parcours" (`#btn-start-tours`).
   - Verifies navigation to Tour selection view (`#view-tours`).
   - Selects the fixture tour "Circuit Test 1" (`tour-1`).
   - Verifies navigation to Step view (`#view-step`), displaying Step 1 heading "Étape Fictive 1", text, and carousel.
3. **Carousel Interaction:**
   - Verifies image carousel is present with navigation dots (2 images from fixtures: `img-1.jpg`, `img-2.jpg`).
   - Clicks second dot and checks active slide transition.
4. **Audio Playback & Seeking:**
   - Verifies sticky audio player (`#audio-player-bar`) is visible.
   - Clicks Play button (`#btn-player-play-pause`).
   - Waits for playback to advance (`currentTime > 0`) using fixture audio (`step-1.webm` / `step-1.m4a`).
   - Performs seeking (+10s skip or seekbar).
   - Verifies that audio time updates and playback continues without error.
   - Clicks Pause button and verifies playback stops.
5. **Step Navigation:**
   - Clicks "Étape suivante" (`#btn-player-step-next`).
   - Verifies that Step 2 content and title are loaded ("Étape Fictive 2").
   - Uses the step `<select>` dropdown (`#step-selector-select`) to navigate back to Step 1.

#### Scenario 2: Offline Preloading & Disconnected Tour (`offline-tour.spec.js`)
1. **Service Worker Registration:**
   - Loads the page with fixture config `/index.html?config=tests/fixtures/config.yml` and waits for `navigator.serviceWorker.ready`.
2. **Tour Preloading:**
   - Navigates to Tour selection (`#view-tours`).
   - Locates fixture tour card and clicks the download button (`#btn-preload-tour-1`).
   - Observes progress updates on the download button / progress indicator.
   - Waits for completion (button displays "Prêt hors-ligne" / check icon).
3. **Simulating Disconnection:**
   - Sets network offline via Playwright API: `await context.setOffline(true)`.
4. **Offline Navigation & Media Verification:**
   - Enters the tour.
   - Navigates through Step 1 and Step 2.
   - Verifies that step descriptions (Markdown) and carousel images render successfully without network errors from cache.
   - Triggers audio play on Step 1 while offline.
   - Verifies fixture audio plays from Cache Storage (via Service Worker range request handler).
   - Performs an audio seek while offline and confirms playback continues smoothly.

---

## 4. Dependencies & Tooling

- **Dependencies (`devDependencies` in `package.json`):**
  - `@playwright/test`: Test runner, browser management, assertions, and offline simulation.
- **Browsers:**
  - Chromium headless binary installed via `npx playwright install chromium` (or with `--with-deps` if system libraries are needed).
- **Scripts in `package.json`:**
  - `"test:unit"`: runs existing Node.js unit tests (`bash tests/run-all-tests.sh`).
  - `"test:e2e"`: runs Playwright test suite (`npx playwright test`).
  - `"test"`: runs unit tests followed by e2e tests.

---

## 5. What's Left to the Builder

- Choice of static server for the Playwright `webServer` option (a minimalist custom Node.js HTTP range server in `scripts/serve.js` or a standard runner).
- Port selection for the local test server (e.g., port 3000 or 8080).
- Precise timeouts for Service Worker caching (allowing sufficient time for downloading demo audio and images into Cache Storage).
