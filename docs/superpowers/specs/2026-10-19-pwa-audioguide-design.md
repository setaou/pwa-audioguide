# PWA Audioguide - Design Document

## 1. Overview & Intent

The goal of this project is to build a modern, high-quality, lightweight Progressive Web Application (PWA) for historical monuments. The application enables visitors to experience an immersive self-guided tour directly on their smartphones with earphones, even in challenging environments like ancient cathedrals with thick stone walls where internet connectivity is erratic or absent.

The primary showcase implementation will feature the **Tours Cathedral (Cathédrale Saint-Gatien de Tours)**, providing rich markdown descriptions, multi-image carousels with captions, and voice narration stored in Opus format.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Mobile-first & Offline-ready:** Operates smoothly on modern smartphones as a PWA, with full offline capability through a Service Worker and optional tour preloading.
- **Clean Separation of Concerns:**
  - Global monument metadata in root `config.yml`.
  - Language-specific tour definitions, step mappings, texts, audio, and images grouped cleanly in language folders (`content/<lang>/`).
  - Texts written in standard Markdown (`.md`).
  - Multi-format audio narration: Opus (in WebM container) as primary source, with AAC (in M4A container) fallback for universal compatibility across all devices (Android, iOS Safari, desktop).
- **Consecutive Image Carousels:** Automatically groups consecutive markdown images with captions into an interactive, touch-swipeable carousel with dots indicator.
- **Ergonomic Sticky Audio Player:** Persistent bottom control bar with play/pause, seekbar with current/total time, rewind/forward skip (-10s / +10s), and step navigation (previous, next, and jump-to dropdown).
- **Audio Stop on Completion:** Audio playback stops at the end of each step without automatic chaining.
- **English Convention:** Consistent English naming for all directories, files, code variables, and data keys.
- **Free & Open Source:** Only free, open-source, minimalist dependencies (no proprietary services or heavy frameworks).

### Non-Goals
- Complex server-side backends or databases (the app runs 100% as a client-side static PWA).
- GPS / Geofencing / indoor beacon auto-triggering (visitor manually navigates steps).
- User accounts, paywalls, or analytics trackers.

### Anti-Goals
- Heavy JavaScript frameworks (React, Angular, Vue, Vite build chains). Must run directly in modern browsers with Vanilla JS/CSS/HTML without mandatory build step.
- Disruptive full-page reloads when navigating steps or changing audio tracks.

---

## 3. Architecture & File Structure

All file, directory, and variable naming is in **English**.

```
audioguide/
├── config.yml                  # Global monument configuration & languages
├── index.html                  # Single-page PWA shell
├── manifest.webmanifest        # PWA manifest
├── service-worker.js           # Offline caching & media preloader
├── css/
│   └── styles.css              # Responsive Vanilla CSS design
├── js/
│   ├── app.js                  # Main application orchestrator & router
│   ├── player.js               # Audio player controller & timeline
│   ├── carousel.js             # Touch-swipe image carousel renderer
│   ├── preloader.js            # Offline tour asset caching helper
│   ├── vendor/
│   │   ├── marked.min.js       # Fast Markdown parser
│   │   └── js-yaml.min.js      # Client-side YAML parser
│   └── icons.js                # Clean SVG icon helper
├── content/
│   ├── fr/
│   │   ├── config.yml          # French tours & steps configuration
│   │   ├── facade.md           # Markdown content with images & captions
│   │   ├── facade.opus         # Opus audio narration
│   │   ├── facade-1.jpg        # Step images
│   │   ├── facade-2.jpg
│   │   ├── nave.md
│   │   ├── nave.opus
│   │   ├── nave-1.jpg
│   │   └── ...                 # Additional steps flat in the language directory
│   └── en/
│       ├── config.yml          # English tours & steps configuration
│       ├── facade.md
│       ├── facade.opus
│       └── ...
└── scripts/
    └── generate_demo_assets.py # Utility script to generate audio (TTS) and download public domain images
```

---

## 4. Configuration Schema

### 4.1. Root Configuration (`config.yml`)
Configures monument identity and available language catalogs:
```yaml
monument:
  name: "Tours Cathedral (Saint-Gatien)"
  subtitle: "Gothic Masterpiece of the Loire Valley"
  cover_image: "content/fr/cathedral-cover.jpg"
default_language: "fr"
languages:
  - code: "fr"
    name: "Français"
    flag: "🇫🇷"
  - code: "en"
    name: "English"
    flag: "🇬🇧"
```

### 4.2. Language Configuration (`content/<lang>/config.yml`)
Defines the tours and steps for that language:
```yaml
tours:
  - id: "essential"
    title: "The Highlights"
    description: "Discover the west facade, the luminous gothic nave, and the royal tomb."
    duration: "40 min"
    badge: "Recommended"
    steps:
      - "facade"
      - "nave"
      - "choir-stained-glass"
      - "royal-tomb"

  - id: "stained-glass"
    title: "13th Century Stained Glass"
    description: "An immersion into one of France's most exquisite stained glass collections."
    duration: "25 min"
    badge: "Art & Light"
    steps:
      - "facade"
      - "choir-stained-glass"
      - "rose-window"

steps:
  - id: "facade"
    title: "The Western Facade"
    text_file: "facade.md"
    audio:
      webm: "facade.webm"   # Opus in WebM container (primary)
      m4a: "facade.m4a"     # AAC in M4A container (fallback)

  - id: "nave"
    title: "The Gothic Nave"
    text_file: "nave.md"
    audio:
      webm: "nave.webm"
      m4a: "nave.m4a"

  - id: "choir-stained-glass"
    title: "Choir Stained Glass Windows"
    text_file: "choir.md"
    audio:
      webm: "choir.webm"
      m4a: "choir.m4a"

  - id: "royal-tomb"
    title: "Tomb of the Children of Charles VIII"
    text_file: "tomb.md"
    audio:
      webm: "tomb.webm"
      m4a: "tomb.m4a"

  - id: "rose-window"
    title: "The West Rose Window"
    text_file: "rose.md"
    audio:
      webm: "rose.webm"
      m4a: "rose.m4a"
```

*Note: Steps can be shared across multiple tours seamlessly.*

---

## 5. UI Views & User Experience

The application is structured as a client-side Single Page Application (SPA) with 3 primary views:

### View 1: Home & Language Selection
- **Header / Hero:** Full-width monument hero image with gradient overlay, monument title, and subtitle.
- **Language Selector:** Large, accessible language cards with flags and labels. Choosing a language persists the preference in `localStorage`.
- **Primary CTA:** "Explore Tours" / "Découvrir les parcours" button navigating to Tour Selection.

### View 2: Tour Selection & Offline Preload
- **Header:** Back button to Home, monument title.
- **Tour List:** Cards displaying tour title, description, badge (e.g., "Recommended"), estimated duration, and step count.
- **Offline Download Option:** A card/banner: "Download for offline visit". Clicking downloads all audio files, markdown texts, and images for the selected tour via Cache API with a smooth progress bar.
- **Tour Action:** Clicking a tour opens Step 1 of that tour.

### View 3: Step View & Audio Player
- **Top Navigation Bar:**
  - Back button (returns to Tour Selection).
  - Step selector dropdown: Allows direct jump to any step in the current tour (e.g. `Step 2/5: The Nave`).
- **Main Scrollable Content:**
  - Step title & badge (`Step X of N`).
  - Markdown content parsed with `marked`:
    - Headers, lists, paragraphs, quotes.
    - **Consecutive Image Carousel:** When multiple markdown images appear consecutively (e.g. `![Caption 1](img1.jpg)\n![Caption 2](img2.jpg)`), the renderer groups them into a swipeable carousel with:
      - Touch swipe gestures (touch start, move, end with inertia/threshold).
      - Left / Right chevron buttons for desktop/accessibility.
      - Dot indicators showing active slide.
      - Image caption displayed below the active slide.
- **Sticky Bottom Audio Player:**
  - **Progress Bar:** Time current / Time total, seekable track with drag and touch scrubbing.
  - **Playback Controls:**
    - Step previous button (`⏮ Prev`).
    - Skip backward 10s (`-10s`).
    - Prominent circular Play / Pause toggle (`▶ / ⏸`).
    - Skip forward 10s (`+10s`).
    - Step next button (`Next ⏭`).
  - **Audio Ending:** When audio playback completes (`ended` event), playback stops cleanly. No automatic progression to the next step.

---

## 6. Offline & PWA Strategy

- **Service Worker:**
  - Pre-caches core app shell: `index.html`, `css/styles.css`, `js/*.js`, `vendor/*.js`, `config.yml`.
  - Cache-first strategy for static assets and media files.
  - **Audio Range Requests Handling:** Modern mobile browsers (and audio players) use HTTP `Range` headers for seeking and buffer streaming. The Service Worker will support synthetic partial 206 responses from the CacheStorage so that time scrubbing works seamlessly even when offline.
- **Audio Formats & Multi-source Playback:**
  - Primary format: Opus in WebM container (`.webm`, `audio/webm; codecs=opus`).
  - Fallback format: AAC in M4A container (`.m4a`, `audio/mp4`).
  - The HTML5 audio player dynamically adds `<source>` elements in preference order (WebM Opus first, AAC M4A second).
- **On-Demand Tour Preloader:**
  - Reads the tour's step list from `content/<lang>/config.yml`.
  - Determines which audio container is supported by the visitor's device using `audio.canPlayType()`. Only the supported audio format is downloaded to save bandwidth and storage.
  - Parses Markdown to extract referenced image URLs.
  - Fetches and stores text, chosen audio file, and images into the PWA Cache.
  - Reports real-time download progress (e.g., "Caching 5 of 12 files...").

---

## 7. Demo Content: Tours Cathedral (Cathédrale Saint-Gatien de Tours)

- **History & Architecture:**
  - Construction spanned from 1170 to 1547, illustrating the evolution from Early Gothic, High Gothic, Rayonnant, Flamboyant, to early French Renaissance.
- **Selected Steps:**
  1. `facade`: The Flamboyant Gothic western facade, portals, and Renaissance tower tops.
  2. `nave`: The 29-meter high vaults, triforium, and harmonious nave proportions.
  3. `choir-stained-glass`: The exceptional 13th-century radiant stained glass in the apse.
  4. `royal-tomb`: The Carrara marble tomb of the children of King Charles VIII and Anne de Bretagne.
  5. `rose-window`: The flamboyant western rose window and the 16th-century grand organ.
- **Asset Generation:**
  - Real, historically accurate French and English texts.
  - Public-domain / Wikimedia Commons licensed imagery for Saint-Gatien.
  - High quality text-to-speech audio converted to Opus format via Python script.
