/**
 * Service Worker for PWA Audioguide.
 * Provides offline caching, cache-first serving, and HTTP 206 Partial Content
 * synthesis for audio seek requests on cached media.
 */

export const CACHE_NAME = 'audioguide-v1';

export const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/player.js',
  './js/carousel.js',
  './js/preloader.js',
  './js/icons.js',
  './js/vendor/marked.min.js',
  './js/vendor/js-yaml.min.js',
  './config.yml',
  './content/fr/config.yml',
  './content/en/config.yml',
  './content/fr/cathedral-cover.jpg'
];

/**
 * Parses HTTP Range header string into start, end, and byte length.
 * @param {string} rangeHeader - e.g. "bytes=200-500", "bytes=200-", "bytes=-300"
 * @param {number} totalLength - Total size in bytes of the resource
 * @returns {{ start: number, end: number, length: number } | null}
 */
export function parseRangeHeader(rangeHeader, totalLength) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=') || totalLength <= 0) {
    return null;
  }

  const rangePart = rangeHeader.replace('bytes=', '').trim();
  const parts = rangePart.split('-');
  const startStr = parts[0];
  const endStr = parts[1];

  let start;
  let end;

  if (startStr === '') {
    // Suffix range: bytes=-300 (last 300 bytes)
    const suffix = parseInt(endStr, 10);
    if (isNaN(suffix)) return null;
    start = Math.max(0, totalLength - suffix);
    end = totalLength - 1;
  } else if (endStr === '') {
    // Open-ended range: bytes=200-
    start = parseInt(startStr, 10);
    if (isNaN(start)) return null;
    end = totalLength - 1;
  } else {
    // Explicit range: bytes=200-500
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) return null;
  }

  // Clamp within boundaries
  start = Math.max(0, Math.min(start, totalLength - 1));
  end = Math.max(start, Math.min(end, totalLength - 1));
  const length = end - start + 1;

  return { start, end, length };
}

/**
 * Synthesizes an HTTP 206 Partial Content Response from a complete ArrayBuffer.
 * @param {ArrayBuffer} fullBuffer
 * @param {string} rangeHeader
 * @param {string} contentType
 * @returns {Response}
 */
export function buildRangeResponse(fullBuffer, rangeHeader, contentType = 'audio/webm') {
  const totalLength = fullBuffer.byteLength;
  const range = parseRangeHeader(rangeHeader, totalLength);

  if (!range) {
    return new Response(fullBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': totalLength.toString(),
        'Accept-Ranges': 'bytes'
      }
    });
  }

  const slicedBuffer = fullBuffer.slice(range.start, range.end + 1);

  return new Response(slicedBuffer, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': contentType,
      'Content-Range': `bytes ${range.start}-${range.end}/${totalLength}`,
      'Content-Length': range.length.toString(),
      'Accept-Ranges': 'bytes'
    }
  });
}

// Service Worker event lifecycle (active in browser service worker runtime)
if (typeof self !== 'undefined' && typeof self.addEventListener === 'function' && typeof caches !== 'undefined') {
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(APP_SHELL);
      }).then(() => self.skipWaiting())
    );
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      }).then(() => self.clients.claim())
    );
  });

  self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only handle GET requests
    if (request.method !== 'GET') return;

    const rangeHeader = request.headers.get('range');

    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request, { ignoreSearch: true });

        if (cachedResponse) {
          if (rangeHeader) {
            // Synthesize partial 206 from cached response for seeking
            const buffer = await cachedResponse.arrayBuffer();
            let contentType = cachedResponse.headers.get('Content-Type');
            if (!contentType) {
              const url = request.url.toLowerCase();
              if (url.endsWith('.m4a') || url.endsWith('.mp4')) {
                contentType = 'audio/mp4';
              } else if (url.endsWith('.webm')) {
                contentType = 'audio/webm; codecs=opus';
              } else {
                contentType = 'audio/webm';
              }
            }
            return buildRangeResponse(buffer, rangeHeader, contentType);
          }
          return cachedResponse;
        }

        // Cache miss: fetch from network
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            // Cache valid responses for future offline use
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // If offline and request is an HTML navigation, return app shell
          if (request.mode === 'navigate') {
            const shell = await cache.match('./index.html');
            if (shell) return shell;
          }
          throw err;
        }
      })()
    );
  });
}
