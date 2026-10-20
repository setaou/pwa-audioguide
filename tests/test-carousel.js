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
# La Façade

Admirez la façade gothique flamboyante :

![Portail central de la cathédrale](facade-1.jpg)
![Détail des voussures et sculptures](facade-2.jpg)
![Les deux tours couronnées de dômes](facade-3.jpg)

La construction s'est étalée sur plusieurs siècles.
`;

const htmlWithCarousel = renderMarkdownWithCarousels(markdownWithCarousel, 'content/fr/');
assert(htmlWithCarousel.includes('carousel-container'), 'HTML must contain carousel-container');
assert(htmlWithCarousel.includes('carousel-slide'), 'HTML must contain carousel-slide');
assert(htmlWithCarousel.includes('src="content/fr/facade-1.jpg"'), 'Images must resolve relative to basePath');
assert(htmlWithCarousel.includes('src="content/fr/facade-2.jpg"'), 'Images must resolve relative to basePath');
assert(htmlWithCarousel.includes('src="content/fr/facade-3.jpg"'), 'Images must resolve relative to basePath');
assert(htmlWithCarousel.includes('Portail central de la cathédrale'), 'Caption 1 must be present');
assert(htmlWithCarousel.includes('Détail des voussures et sculptures'), 'Caption 2 must be present');
assert(htmlWithCarousel.includes('carousel-dots'), 'Must have carousel-dots indicator');
assert(htmlWithCarousel.includes('carousel-prev') && htmlWithCarousel.includes('carousel-next'), 'Must have navigation buttons');

// Test Case 2: Isolated single image does NOT become a carousel
const markdownWithSingleImage = `
# L'Orgue

Voici le buffet d'orgue :

![Grand orgue de la Renaissance](organ.jpg)

C'est un chef-d'œuvre du XVIe siècle.
`;

const htmlWithSingle = renderMarkdownWithCarousels(markdownWithSingleImage, 'content/fr/');
assert(!htmlWithSingle.includes('carousel-container'), 'Single image must NOT be wrapped in carousel-container');
assert(htmlWithSingle.includes('src="content/fr/organ.jpg"'), 'Single image must resolve with basePath');
assert(htmlWithSingle.includes('Grand orgue de la Renaissance'), 'Single image caption must be present');

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
