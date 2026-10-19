/**
 * Carousel and Markdown rendering engine for PWA Audioguide.
 */

// Universal loader for marked in both Browser and Node.js test environment
let markedParser = globalThis.marked;
if (!markedParser && typeof process !== 'undefined') {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const markedPath = path.resolve(process.cwd(), 'js/vendor/marked.min.js');
    if (fs.existsSync(markedPath)) {
      const code = fs.readFileSync(markedPath, 'utf8');
      const ctx = {};
      const fn = new Function('window', 'self', 'globalThis', code);
      fn(ctx, ctx, ctx);
      markedParser = ctx.marked || globalThis.marked;
    }
  } catch (e) {
    // ignore
  }
}

function resolveAssetPath(src, basePath) {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.startsWith('data:')) {
    return src;
  }
  const cleanBase = basePath.endsWith('/') ? basePath : basePath + '/';
  return cleanBase + src;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parses markdown and transforms consecutive images into interactive swipeable carousels.
 * Single isolated images are rendered as clean figures with captions.
 *
 * @param {string} markdownText - Raw markdown content
 * @param {string} basePath - Directory path to prefix relative image sources
 * @returns {string} Processed HTML string
 */
export function renderMarkdownWithCarousels(markdownText, basePath = '') {
  if (!markdownText) return '';

  const singleImageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/;
  // Match groups of 1 or more images separated only by whitespace or newlines
  const imageGroupRegex = /(?:!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\)\s*){1,}/g;

  // Pre-process markdown: replace image sequences with custom carousel or figure HTML blocks
  let processedMarkdown = markdownText.replace(imageGroupRegex, (match) => {
    const images = [];
    let imgMatch;
    const globalMatcher = new RegExp(singleImageRegex.source, 'g');
    while ((imgMatch = globalMatcher.exec(match)) !== null) {
      const alt = imgMatch[1] || imgMatch[3] || '';
      const src = imgMatch[2];
      images.push({ alt, src: resolveAssetPath(src, basePath) });
    }

    if (images.length === 0) return match;

    if (images.length === 1) {
      const img = images[0];
      return `\n\n<figure class="single-image"><img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" loading="lazy"><figcaption>${escapeHtml(img.alt)}</figcaption></figure>\n\n`;
    }

    // Build carousel for 2 or more consecutive images (ensure NO leading indentation so marked doesn't treat as code block)
    const slidesHtml = images.map((img, idx) => `<div class="carousel-slide ${idx === 0 ? 'active' : ''}" data-index="${idx}">
<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" loading="lazy">
<div class="carousel-caption">${escapeHtml(img.alt)}</div>
</div>`).join('\n');

    const dotsHtml = images.map((_, idx) => `<button class="carousel-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="Slide ${idx + 1}"></button>`).join('');

    return `\n\n<div class="carousel-container" data-carousel>
<div class="carousel-track">
${slidesHtml}
</div>
<button class="carousel-nav carousel-prev" aria-label="Previous image">❮</button>
<button class="carousel-nav carousel-next" aria-label="Next image">❯</button>
<div class="carousel-dots">${dotsHtml}</div>
</div>\n\n`;
  });

  const parser = markedParser || (typeof marked !== 'undefined' ? marked : null);
  if (parser && typeof parser.parse === 'function') {
    return parser.parse(processedMarkdown);
  }

  return processedMarkdown;
}

/**
 * Initializes touch gestures, dots and buttons on all carousels inside a container element.
 * @param {HTMLElement} containerElement
 */
export function initCarousels(containerElement) {
  if (!containerElement) return;

  const carousels = containerElement.querySelectorAll('[data-carousel]');
  carousels.forEach((carousel) => {
    const slides = carousel.querySelectorAll('.carousel-slide');
    const dots = carousel.querySelectorAll('.carousel-dot');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');

    if (slides.length <= 1) return;

    let currentIndex = 0;

    function goToSlide(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      currentIndex = index;

      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === currentIndex);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        goToSlide(currentIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        goToSlide(currentIndex + 1);
      });
    }

    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        const targetIndex = parseInt(dot.getAttribute('data-index'), 10);
        goToSlide(targetIndex);
      });
    });

    // Touch swipe support
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    carousel.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      endX = touch.clientX;
      endY = touch.clientY;
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      endX = touch.clientX;
      endY = touch.clientY;
    }, { passive: true });

    carousel.addEventListener('touchend', () => {
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Ensure horizontal swipe is dominant and significant
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          goToSlide(currentIndex + 1); // Swipe left -> Next
        } else {
          goToSlide(currentIndex - 1); // Swipe right -> Prev
        }
      }
    });
  });
}
