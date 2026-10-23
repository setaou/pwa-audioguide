/**
 * Tour Preloader for offline PWA visit caching.
 */

const CACHE_NAME = 'audioguide-v1';

/**
 * Determines the optimal audio file based on device playback capabilities.
 * @param {{ webm?: string, m4a?: string, mp3?: string }} audioConfig
 * @param {(mimeType: string) => string} canPlayTypeFn
 * @returns {string | null}
 */
export function selectOptimalAudio(audioConfig, canPlayTypeFn) {
  if (!audioConfig) return null;

  if (typeof canPlayTypeFn === 'function') {
    const webmSupport = canPlayTypeFn('audio/webm; codecs=opus');
    if (audioConfig.webm && (webmSupport === 'probably' || webmSupport === 'maybe')) {
      return audioConfig.webm;
    }

    const m4aSupport = canPlayTypeFn('audio/mp4');
    if (audioConfig.m4a && (m4aSupport === 'probably' || m4aSupport === 'maybe')) {
      return audioConfig.m4a;
    }
  }

  // Fallback order: webm -> m4a -> mp3
  return audioConfig.webm || audioConfig.m4a || audioConfig.mp3 || null;
}

export class TourPreloader {
  constructor(options = {}) {
    this.cacheName = options.cacheName || CACHE_NAME;
    this.contentDir = options.contentDir || 'content';
    this.canPlayType = options.canPlayType || ((type) => {
      if (typeof Audio !== 'undefined') {
        const a = new Audio();
        return a.canPlayType(type);
      }
      return '';
    });
  }

  /**
   * Preloads all text, images, and audio assets for a specific tour into CacheStorage.
   *
   * @param {Object} tour - Tour configuration object
   * @param {string} lang - Language code (e.g. 'fr')
   * @param {Object} langConfig - Complete language config containing steps
   * @param {(progress: { current: number, total: number, percent: number, file: string }) => void} onProgress
   * @param {string} [contentDir] - Base directory for content (defaults to this.contentDir or 'content')
   * @returns {Promise<void>}
   */
  async preloadTour(tour, lang, langConfig, onProgress = null, contentDir = this.contentDir) {
    if (!tour || !langConfig) return;

    const baseDir = (contentDir || this.contentDir || 'content').replace(/\/+$/, '');
    const basePath = `${baseDir}/${lang}/`;
    const stepMap = new Map();
    (langConfig.steps || []).forEach(s => stepMap.set(s.id, s));

    const tourSteps = (tour.steps || []).map(id => stepMap.get(id)).filter(Boolean);
    const assetUrls = new Set();

    // 1. Language configuration file
    assetUrls.add(`${basePath}config.yml`);

    // 2. Step text and audio files
    for (const step of tourSteps) {
      if (step.text_file) {
        assetUrls.add(`${basePath}${step.text_file}`);
      }

      if (step.audio) {
        const chosenAudio = selectOptimalAudio(step.audio, this.canPlayType);
        if (chosenAudio) {
          assetUrls.add(`${basePath}${chosenAudio}`);
        }
      }
    }

    // 2b. Transition audio files between consecutive tour steps
    for (let i = 0; i < (tour.steps || []).length - 1; i++) {
      const currentStepId = tour.steps[i];
      const nextStepId = tour.steps[i + 1];
      const step = stepMap.get(currentStepId);
      if (step && step.transitions && step.transitions[nextStepId]) {
        const transConf = step.transitions[nextStepId].audio || step.transitions[nextStepId];
        const chosenTransAudio = selectOptimalAudio(transConf, this.canPlayType);
        if (chosenTransAudio) {
          assetUrls.add(`${basePath}${chosenTransAudio}`);
        }
      }
    }

    // 3. Extract images referenced in markdown files
    for (const step of tourSteps) {
      if (step.text_file) {
        const textUrl = `${basePath}${step.text_file}`;
        try {
          const res = await fetch(textUrl);
          if (res.ok) {
            const mdText = await res.text();
            const imgRegex = /!\[.*?\]\(([^)\s]+)/g;
            let match;
            while ((match = imgRegex.exec(mdText)) !== null) {
              const imgSrc = match[1];
              if (!imgSrc.startsWith('http://') && !imgSrc.startsWith('https://') && !imgSrc.startsWith('/')) {
                assetUrls.add(`${basePath}${imgSrc}`);
              } else {
                assetUrls.add(imgSrc);
              }
            }
          }
        } catch (e) {
          // If offline or fetch fails, proceed with other files
        }
      }
    }

    const filesToCache = Array.from(assetUrls);
    const total = filesToCache.length;
    let current = 0;

    const cache = typeof caches !== 'undefined' ? await caches.open(this.cacheName) : null;

    for (const fileUrl of filesToCache) {
      current++;
      if (onProgress) {
        onProgress({
          current,
          total,
          percent: Math.round((current / total) * 100),
          file: fileUrl
        });
      }

      if (cache) {
        try {
          const response = await fetch(fileUrl);
          if (response.ok) {
            await cache.put(fileUrl, response);
          }
        } catch (err) {
          console.warn(`Could not cache asset: ${fileUrl}`, err);
        }
      }
    }
  }
}
