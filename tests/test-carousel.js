import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const markedPath = path.join(rootDir, 'js/vendor/marked.min.js');
const carouselModulePath = path.join(rootDir, 'js/carousel.js');

assert(fs.existsSync(markedPath), 'js/vendor/marked.min.js must exist');
assert(fs.existsSync(carouselModulePath), 'js/carousel.js must exist');

const { renderMarkdownWithCarousels, initCarousels } = await import(`file://${carouselModulePath}`);

assert(typeof renderMarkdownWithCarousels === 'function', 'renderMarkdownWithCarousels must be a function');
assert(typeof initCarousels === 'function', 'initCarousels must be a function');

// Test Case 1: Consecutive images get converted into carousel
const markdownWithCarousel = `
# Étape de test

Description avec plusieurs images :

![Image test 1](img-1.jpg)
![Image test 2](img-2.jpg)
![Image test 3](img-3.jpg)

Suite de la description.
`;

const htmlWithCarousel = renderMarkdownWithCarousels(markdownWithCarousel, 'tests/fixtures/content/fr/');
assert(htmlWithCarousel.includes('carousel-container'), 'HTML must contain carousel-container');
assert(htmlWithCarousel.includes('carousel-slide'), 'HTML must contain carousel-slide');
assert(htmlWithCarousel.includes('src="tests/fixtures/content/fr/img-1.jpg"'), 'Images must resolve relative to basePath');
assert(htmlWithCarousel.includes('src="tests/fixtures/content/fr/img-2.jpg"'), 'Images must resolve relative to basePath');
assert(htmlWithCarousel.includes('src="tests/fixtures/content/fr/img-3.jpg"'), 'Images must resolve relative to basePath');
assert(htmlWithCarousel.includes('Image test 1'), 'Caption 1 must be present');
assert(htmlWithCarousel.includes('Image test 2'), 'Caption 2 must be present');
assert(htmlWithCarousel.includes('carousel-dots'), 'Must have carousel-dots indicator');
assert(htmlWithCarousel.includes('carousel-prev') && htmlWithCarousel.includes('carousel-next'), 'Must have navigation buttons');

// Test Case 2: Isolated single image does NOT become a carousel
const markdownWithSingleImage = `
# Étape solo

Voici une image seule :

![Photo unique](solo.jpg)

Ceci est une description.
`;

const htmlWithSingle = renderMarkdownWithCarousels(markdownWithSingleImage, 'tests/fixtures/content/fr/');
assert(!htmlWithSingle.includes('carousel-container'), 'Single image must NOT be wrapped in carousel-container');
assert(htmlWithSingle.includes('src="tests/fixtures/content/fr/solo.jpg"'), 'Single image must resolve with basePath');
assert(htmlWithSingle.includes('Photo unique'), 'Single image caption must be present');

// Test Case 3: initCarousels calculates dynamic track height based on real image aspect ratios
// Mock window.innerHeight = 800px (40vh = 320px)
globalThis.window = { innerHeight: 800 };

const mockTrack = {
  style: {}
};
const mockImg1 = {
  naturalWidth: 800,
  naturalHeight: 600, // 4:3 -> at 360px width => 270px height (<= 320px max)
  complete: true,
  addEventListener: () => {}
};
const mockImg2 = {
  naturalWidth: 1200,
  naturalHeight: 600, // 2:1 -> at 360px width => 180px height
  complete: true,
  addEventListener: () => {}
};
const mockSlide1 = { classList: { toggle: () => {} } };
const mockSlide2 = { classList: { toggle: () => {} } };
const mockCaption = { offsetHeight: 32 };

const mockCarousel = {
  clientWidth: 360,
  querySelector: (sel) => {
    if (sel === '.carousel-track') return mockTrack;
    if (sel === '.carousel-caption') return mockCaption;
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === '.carousel-slide') return [mockSlide1, mockSlide2];
    if (sel === '.carousel-slide img') return [mockImg1, mockImg2];
    if (sel === '.carousel-dot') return [];
    return [];
  },
  addEventListener: () => {}
};
const mockContainer = {
  querySelectorAll: (sel) => {
    if (sel === '[data-carousel]') return [mockCarousel];
    return [];
  }
};

initCarousels(mockContainer);

// Expected height: max(270, 180) + 32px caption = 302px
assert.strictEqual(mockTrack.style.height, '302px', 'Track height should be dynamically set to 302px');

console.log('✓ test-carousel passed successfully!');
