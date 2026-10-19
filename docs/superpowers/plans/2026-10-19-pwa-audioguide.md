# PWA Audioguide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, offline-ready Progressive Web Application (PWA) audioguide for historical monuments, featuring multi-format audio (WebM Opus / AAC M4A), markdown content with swipeable image carousels, and a showcase tour for Tours Cathedral (Cathédrale Saint-Gatien).

**Architecture:** Client-side static Single Page Application (Vanilla HTML/CSS/JS) with pure YAML configuration, Markdown step texts, HTML5 audio player with sticky mobile controls, Cache API preloader, and Service Worker supporting HTTP 206 Range requests for offline audio seeking.

**Tech Stack:** HTML5, Vanilla CSS, Vanilla JavaScript (ES6+), `marked` (Markdown parsing), `js-yaml` (YAML parsing), Cache API & Service Worker, WebM (Opus) / M4A (AAC) audio formats.

**Spec:** `docs/superpowers/specs/2026-10-19-pwa-audioguide-design.md`

## Global Constraints

- Pure Vanilla JS, Vanilla CSS, HTML (no frameworks, no bundlers, no build steps required).
- All directory, file, and code variable names are strictly in English.
- Configuration strictly in YAML (`config.yml` at root, `content/<lang>/config.yml` per language).
- Step content organized flatly per language: `content/<lang>/<step_id>.md`, `<step_id>.webm`, `<step_id>.m4a`, and images.
- Multi-format audio: primary WebM Opus (`audio/webm; codecs=opus`) with AAC M4A (`audio/mp4`) fallback.
- Audio stops at the end of each step without auto-advancing to the next step.
- Open-source and free technologies only.

## Review Focus

1. **Service Worker HTTP Range 206 Handling:** Mobile audio seeking on cached files fails if the Service Worker does not synthesize partial content 206 responses.
2. **Consecutive Markdown Images Transformation:** Multiple successive markdown images must be grouped into a single touch-swipeable carousel rather than stacked vertically.
3. **Audio Preload Format Selection:** Tour preloader must check `canPlayType` before downloading to cache only the compatible audio format (WebM Opus or M4A AAC), preventing redundant bandwidth/storage consumption.
4. **Offline Resilience:** Visiting the monument with airplane mode enabled must serve the complete application shell, texts, carousels, and preloaded audio without network errors.
5. **Language Switching Persistence:** Switching language updates the view immediately and stores the preference in `localStorage`.

---

### Task 1: Project Scaffolding & YAML Configuration Schema

**Files:**
- Create: `config.yml`
- Create: `content/fr/config.yml`
- Create: `content/en/config.yml`
- Create: `js/vendor/js-yaml.min.js`
- Test: `tests/test-config.js`

**Interfaces:**
- Consumes: `js/vendor/js-yaml.min.js`
- Produces: `loadRootConfig(): Promise<MonumentConfig>`, `loadLanguageConfig(lang: string): Promise<LanguageConfig>`

- [ ] **Step 1: Write the failing test for configuration loading and validation**

Create `tests/test-config.js` checking:
1. Root `config.yml` contains `monument.name`, `cover_image`, `default_language`, and `languages` array.
2. `content/fr/config.yml` and `content/en/config.yml` contain `tours` and `steps`.
3. Every step referenced in a tour's `steps` list exists in the `steps` dictionary.
4. Every step specifies `text_file`, `audio.webm`, and `audio.m4a`.

```javascript
// tests/test-config.js
import assert from 'node:assert';
import fs from 'node:fs';
// Load YAML and assert schema constraints
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-config.js`
Expected: FAIL (files missing)

- [ ] **Step 3: Download/vendor `js-yaml.min.js` and implement configuration files**

- Download `js-yaml.min.js` (v4.x) into `js/vendor/js-yaml.min.js`.
- Create `config.yml` with Tours Cathedral metadata and language declarations (`fr`, `en`).
- Create `content/fr/config.yml` and `content/en/config.yml` with tours (`essential`, `stained-glass`) and 5 steps (`facade`, `nave`, `choir-stained-glass`, `royal-tomb`, `rose-window`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test-config.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add config.yml content/ js/vendor/ tests/test-config.js
git commit -m "feat: scaffold yaml configurations and schema validation"
```

---

### Task 2: Markdown Parsing & Touch-Swipe Image Carousel Engine

**Files:**
- Create: `js/vendor/marked.min.js`
- Create: `js/carousel.js`
- Test: `tests/test-carousel.js`

**Interfaces:**
- Consumes: Raw Markdown strings with consecutive `![caption](image.jpg)`
- Produces:
  - `renderMarkdownWithCarousels(markdownText: string, basePath: string): string`
  - `initCarousels(containerElement: HTMLElement): void`

- [ ] **Step 1: Write the failing test for markdown image grouping into carousels**

Create `tests/test-carousel.js`:
- Test parsing a markdown snippet with two consecutive images:
  ```markdown
  Some intro text.
  ![Western facade](facade-1.jpg)
  ![Portals detail](facade-2.jpg)
  Follow-up description.
  ```
- Assert output contains `<div class="carousel-container" data-carousel>` with 2 slides (`<div class="carousel-slide">`), captions, and navigation dots.
- Assert single isolated images remain standard figures without carousel wrapping.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-carousel.js`
Expected: FAIL (modules missing)

- [ ] **Step 3: Download `marked.min.js` and implement `js/carousel.js`**

- Download `marked.min.js` into `js/vendor/marked.min.js`.
- Implement `renderMarkdownWithCarousels(markdownText, basePath)` in `js/carousel.js`:
  - Custom AST or regex post-processing: Detect adjacent markdown images `(!\[.*?\]\(.*?\)\s*){2,}` and convert them to a carousel markup.
  - Implement touch events in `initCarousels(container)`: `touchstart`, `touchmove`, `touchend` with horizontal swipe detection (> 40px delta), dot indicators, and optional next/prev buttons.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test-carousel.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/vendor/marked.min.js js/carousel.js tests/test-carousel.js
git commit -m "feat: add markdown parser and swipeable carousel engine"
```

---

### Task 3: Dual-Source Audio Player Controller

**Files:**
- Create: `js/player.js`
- Test: `tests/test-player.js`

**Interfaces:**
- Consumes: Audio step definition `{ webm: string, m4a: string }`, step navigation callbacks
- Produces: `AudioPlayer` class:
  - `loadStep(audioConfig, basePath): void`
  - `play(): Promise<void>`
  - `pause(): void`
  - `togglePlay(): void`
  - `seek(seconds: number): void`
  - `skip(deltaSeconds: number): void`
  - Events: `onTimeUpdate`, `onStateChange`, `onEnded`

- [ ] **Step 1: Write the failing test for AudioPlayer state machine**

Create `tests/test-player.js`:
- Test that loading an audio configuration generates `<source type="audio/webm; codecs=opus">` and `<source type="audio/mp4">`.
- Test that `skip(-10)` and `skip(+10)` clamp properly between 0 and duration.
- Test that on audio `ended` event, the player transitions to paused state and **does not** advance automatically to the next step.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-player.js`
Expected: FAIL (AudioPlayer undefined)

- [ ] **Step 3: Implement `AudioPlayer` in `js/player.js`**

- Create `AudioPlayer` class encapsulating the HTML5 `<audio>` element.
- Implement source selection, progress updates, seekbar scrubbing handlers (mouse & touch drag), time formatting (`mm:ss`), skip backward/forward 10s, and clean pause on `ended`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test-player.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/player.js tests/test-player.js
git commit -m "feat: implement dual-source audio player with touch scrubber"
```

---

### Task 4: Service Worker (HTTP Range 206) & Offline Tour Preloader

**Files:**
- Create: `service-worker.js`
- Create: `js/preloader.js`
- Test: `tests/test-service-worker.js`

**Interfaces:**
- Consumes: CacheStorage API, `content/<lang>/config.yml`
- Produces:
  - `service-worker.js`: Cache-first shell + HTTP 206 partial response synthesizer for audio seeks
  - `TourPreloader`: `preloadTour(tour, lang, onProgress): Promise<void>`

- [ ] **Step 1: Write the failing test for HTTP Range 206 response synthesis**

Create `tests/test-service-worker.js`:
- Test Range header parser: Given a full ArrayBuffer of 1000 bytes and a request with `Range: bytes=200-500`, assert the synthetic response status is 206, `Content-Range: bytes 200-500/1000`, `Content-Length: 301`, and the body contains slice(200, 501).

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-service-worker.js`
Expected: FAIL

- [ ] **Step 3: Implement `service-worker.js` and `js/preloader.js`**

- Implement `service-worker.js`:
  - Static app shell precaching (`CACHE_NAME = 'audioguide-v1'`).
  - Cache-first strategy for app resources and content.
  - Partial content 206 handler: Intercepts `Range` header requests for cached audio responses, slicing the ArrayBuffer and returning `new Response(slicedBody, { status: 206, headers })`.
- Implement `TourPreloader` in `js/preloader.js`:
  - Inspects `audio.canPlayType('audio/webm; codecs=opus')`. If supported, selects `.webm`; otherwise selects `.m4a`.
  - Parses tour's markdown files to collect all referenced images.
  - Downloads all tour assets in sequence into the cache with progress callbacks (`(loaded, total) => ...`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test-service-worker.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add service-worker.js js/preloader.js tests/test-service-worker.js
git commit -m "feat: add service worker with range requests and tour preloader"
```

---

### Task 5: UI Views, SVG Icons & Application Controller

**Files:**
- Create: `index.html`
- Create: `manifest.webmanifest`
- Create: `css/styles.css`
- Create: `js/icons.js`
- Create: `js/app.js`
- Test: `tests/test-app-flow.js`

**Interfaces:**
- Consumes: `AudioPlayer`, `renderMarkdownWithCarousels`, `TourPreloader`, `js-yaml`
- Produces: Full interactive PWA with 3 views (Home, Tour Selection, Step View)

- [ ] **Step 1: Write the failing test for UI view navigation**

Create `tests/test-app-flow.js`:
- Validate DOM view state transitions: `home` -> `tour-selection` -> `step-view`.
- Test language switching persists to `localStorage` and updates displayed texts.
- Test step navigation updates the step dropdown, loads the markdown text, and updates the audio player.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-app-flow.js`
Expected: FAIL

- [ ] **Step 3: Implement HTML shell, CSS styles, SVG icons, and main controller**

- Create `index.html` with responsive viewport, PWA meta tags, and semantic view containers (`#view-home`, `#view-tours`, `#view-step`).
- Create `manifest.webmanifest` configured for standalone PWA display.
- Create `css/styles.css`: Mobile-first responsive design, modern dark/slate theme with warm cathedral accents, carousel flex styling, touch targets >= 44px, sticky bottom player bar.
- Create `js/icons.js` exporting clean, accessible inline SVG icons (play, pause, skip-back-10, skip-forward-10, prev, next, chevron, download, check, globe).
- Create `js/app.js` orchestrating view changes, language selection, tour selection, step rendering, carousel initialization, and preloader integration.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test-app-flow.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html manifest.webmanifest css/styles.css js/icons.js js/app.js tests/test-app-flow.js
git commit -m "feat: implement responsive UI views and app router"
```

---

### Task 6: Demo Content & Audio Generation for Tours Cathedral

**Files:**
- Create: `scripts/generate_demo_assets.py`
- Populate:
  - `content/fr/` (5 steps: `facade.md`, `nave.md`, `choir.md`, `tomb.md`, `rose.md`, `.webm`, `.m4a`, and images)
  - `content/en/` (5 steps: `facade.md`, `nave.md`, `choir.md`, `tomb.md`, `rose.md`, `.webm`, `.m4a`, and images)
- Test: `tests/test-demo-assets.js`

**Interfaces:**
- Consumes: TTS engine / audio encoder, public domain images of Saint-Gatien de Tours
- Produces: Complete working demonstration content with real texts, images, and audio files.

- [ ] **Step 1: Write the failing test for demo assets presence and validity**

Create `tests/test-demo-assets.js`:
- Check that all 5 steps in `content/fr/` and `content/en/` have:
  - Valid markdown files containing descriptions and image references.
  - Valid `.webm` Opus audio files (file size > 1000 bytes, valid header).
  - Valid `.m4a` AAC audio files (file size > 1000 bytes, valid header).
  - All referenced images exist on disk.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-demo-assets.js`
Expected: FAIL (content files missing)

- [ ] **Step 3: Implement `scripts/generate_demo_assets.py` and generate assets**

- Fetch high-quality historical texts for the 5 cathedral steps in French and English.
- Generate voice narrations using Python TTS (or edge-tts / espeak / pyttsx3) and encode into WebM Opus and M4A AAC using ffmpeg or python audio libraries.
- Download verified open-source / Wikimedia Commons images for each step (Western facade, Gothic nave, Choir stained glass, Royal tomb of Charles VIII's children, Western rose window).

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test-demo-assets.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/ content/ tests/test-demo-assets.js
git commit -m "feat: generate demo texts, images and dual-format audio for Tours Cathedral"
```

---

### Task 7: End-to-End Verification & Documentation

**Files:**
- Create: `README.md`
- Test: `tests/run-all-tests.sh`

- [ ] **Step 1: Create master test runner script `tests/run-all-tests.sh`**

Runs all test suites sequentially:
1. `test-config.js`
2. `test-carousel.js`
3. `test-player.js`
4. `test-service-worker.js`
5. `test-app-flow.js`
6. `test-demo-assets.js`

- [ ] **Step 2: Run all tests to ensure 100% pass rate**

Run: `bash tests/run-all-tests.sh`
Expected: All suites PASS.

- [ ] **Step 3: Create `README.md` with installation and user guide**

Document how to run the PWA locally (e.g. `npx serve` or `python3 -m http.server`), how to install as a PWA, how to add a new monument or language, and details about the multi-format audio support.

- [ ] **Step 4: Final verification and commit**

```bash
git add README.md tests/run-all-tests.sh
git commit -m "docs: complete user guide and automated test suite"
```
