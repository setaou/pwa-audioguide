/**
 * Main Application Orchestrator for PWA Audioguide.
 */

import { AudioPlayer, formatTime } from './player.js';
import { renderMarkdownWithCarousels, initCarousels } from './carousel.js';
import { TourPreloader } from './preloader.js';
import { getIcon } from './icons.js';

const UI_STRINGS = {
  fr: {
    startTours: 'Découvrir les parcours de visite',
    backToHome: 'Accueil',
    backToTours: 'Parcours',
    toursTitle: 'Parcours de visite',
    stepsCount: (count) => `${count} étapes`,
    stepOf: (current, total) => `Étape ${current} sur ${total}`,
    offlineDownload: 'Télécharger pour écoute hors-ligne',
    downloading: (pct) => `Téléchargement ${pct}%...`,
    offlineReady: '✓ Disponible hors-ligne',
    prev: 'Préc',
    next: 'Suiv',
    headphonesTipTitle: 'Visite avec oreillettes',
    headphonesTipText: 'Fonctionne 100% hors-ligne. Branchez vos oreillettes et profitez des explications sonores.',
    selectLanguage: 'Choisir la langue / Select language'
  },
  en: {
    startTours: 'Explore Tour Circuits',
    backToHome: 'Home',
    backToTours: 'Tours',
    toursTitle: 'Tour Circuits',
    stepsCount: (count) => `${count} steps`,
    stepOf: (current, total) => `Step ${current} of ${total}`,
    offlineDownload: 'Download for offline visit',
    downloading: (pct) => `Downloading ${pct}%...`,
    offlineReady: '✓ Offline Ready',
    prev: 'Prev',
    next: 'Next',
    headphonesTipTitle: 'Earphones recommended',
    headphonesTipText: 'Operates 100% offline. Plug in your earphones and immerse yourself in the audio tour.',
    selectLanguage: 'Select language / Choisir la langue'
  }
};

export class AudioguideApp {
  constructor(options = {}) {
    this.storage = options.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.yamlParser = options.yamlParser || globalThis.jsyaml || null;

    this.currentView = 'home';
    this.currentLanguage = this.getSavedLanguage() || 'fr';
    this.rootConfig = null;
    this.langConfig = null;
    this.currentTour = null;
    this.currentStepIndex = 0;

    this.player = new AudioPlayer();
    this.preloader = new TourPreloader();

    this.isScrubbing = false;
  }

  getSavedLanguage() {
    return this.storage ? this.storage.getItem('audioguide_lang') : null;
  }

  setLanguage(langCode) {
    this.currentLanguage = langCode;
    if (this.storage) {
      this.storage.setItem('audioguide_lang', langCode);
    }
  }

  t(key, ...args) {
    const langDict = UI_STRINGS[this.currentLanguage] || UI_STRINGS.fr;
    const val = langDict[key] || UI_STRINGS.fr[key];
    if (typeof val === 'function') return val(...args);
    return val || '';
  }

  async init() {
    await this.loadRootConfig();
    await this.loadLanguageConfig(this.currentLanguage);
    this.setupUIBindings();
    this.renderHome();
    this.navigateTo('home');
  }

  async loadYaml(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    const text = await res.text();
    const parser = this.yamlParser || globalThis.jsyaml;
    if (!parser || typeof parser.load !== 'function') {
      throw new Error('YAML parser not loaded');
    }
    return parser.load(text);
  }

  async loadRootConfig() {
    try {
      this.rootConfig = await this.loadYaml('config.yml');
    } catch (err) {
      console.warn('Using default root config fallback:', err);
      this.rootConfig = {
        monument: {
          name: "Audioguide",
          subtitle: "",
          cover_image: ""
        },
        languages: [
          { code: 'fr', name: 'Français', flag: '🇫🇷' },
          { code: 'en', name: 'English', flag: '🇬🇧' }
        ]
      };
    }
  }

  async loadLanguageConfig(lang) {
    try {
      this.langConfig = await this.loadYaml(`content/${lang}/config.yml`);
    } catch (err) {
      console.warn(`Failed loading content/${lang}/config.yml:`, err);
    }
  }

  setupUIBindings() {
    if (typeof document === 'undefined') return;

    // View Navigation Buttons
    const btnStartTours = document.getElementById('btn-start-tours');
    if (btnStartTours) {
      btnStartTours.addEventListener('click', () => {
        this.renderTours();
        this.navigateTo('tours');
      });
    }

    const btnToursBack = document.getElementById('btn-tours-back');
    if (btnToursBack) {
      btnToursBack.innerHTML = getIcon('chevron-left');
      btnToursBack.addEventListener('click', () => {
        this.navigateTo('home');
      });
    }

    const btnStepBackTours = document.getElementById('btn-step-back-tours');
    if (btnStepBackTours) {
      btnStepBackTours.innerHTML = getIcon('chevron-left');
      btnStepBackTours.addEventListener('click', () => {
        this.player.pause();
        this.renderTours();
        this.navigateTo('tours');
      });
    }

    // Step Selector Dropdown
    const stepSelect = document.getElementById('step-selector-select');
    if (stepSelect) {
      stepSelect.addEventListener('change', (e) => {
        const stepIndex = parseInt(e.target.value, 10);
        this.loadStepByIndex(stepIndex);
      });
    }

    // Player Controls
    const btnPlay = document.getElementById('player-btn-play');
    if (btnPlay) {
      btnPlay.innerHTML = getIcon('play');
      btnPlay.addEventListener('click', () => this.player.togglePlay());
    }

    const btnSkipBack = document.getElementById('player-btn-skip-back');
    if (btnSkipBack) {
      btnSkipBack.innerHTML = getIcon('skip-back');
      btnSkipBack.addEventListener('click', () => this.player.skip(-10));
    }

    const btnSkipForward = document.getElementById('player-btn-skip-forward');
    if (btnSkipForward) {
      btnSkipForward.innerHTML = getIcon('skip-forward');
      btnSkipForward.addEventListener('click', () => this.player.skip(10));
    }

    const btnPrevStep = document.getElementById('player-btn-prev-step');
    if (btnPrevStep) {
      const iconPrev = document.getElementById('player-icon-prev');
      if (iconPrev) iconPrev.innerHTML = getIcon('step-prev');
      btnPrevStep.addEventListener('click', () => {
        if (this.currentStepIndex > 0) {
          this.loadStepByIndex(this.currentStepIndex - 1);
        }
      });
    }

    const btnNextStep = document.getElementById('player-btn-next-step');
    if (btnNextStep) {
      const iconNext = document.getElementById('player-icon-next');
      if (iconNext) iconNext.innerHTML = getIcon('step-next');
      btnNextStep.addEventListener('click', () => {
        if (this.currentTour && this.currentStepIndex < this.currentTour.steps.length - 1) {
          this.loadStepByIndex(this.currentStepIndex + 1);
        }
      });
    }

    // Seekbar scrubbing
    const seekbar = document.getElementById('player-seekbar');
    if (seekbar) {
      seekbar.addEventListener('input', (e) => {
        this.isScrubbing = true;
        const duration = this.player.audio ? this.player.audio.duration : 0;
        const targetSecs = (parseFloat(e.target.value) / 100) * duration;
        const curTimeEl = document.getElementById('player-time-current');
        if (curTimeEl) curTimeEl.textContent = formatTime(targetSecs);
      });

      const finishScrubbing = (e) => {
        if (!this.isScrubbing) return;
        const duration = this.player.audio ? this.player.audio.duration : 0;
        const targetSecs = (parseFloat(seekbar.value) / 100) * duration;
        this.player.seek(targetSecs);
        this.isScrubbing = false;
      };

      seekbar.addEventListener('change', finishScrubbing);
      seekbar.addEventListener('pointerup', finishScrubbing);
      seekbar.addEventListener('touchend', finishScrubbing);
      seekbar.addEventListener('pointercancel', () => { this.isScrubbing = false; });
      seekbar.addEventListener('touchcancel', () => { this.isScrubbing = false; });
    }

    // Player state sync
    this.player.onStateChange = (isPlaying) => {
      const playBtn = document.getElementById('player-btn-play');
      if (playBtn) {
        playBtn.innerHTML = isPlaying ? getIcon('pause') : getIcon('play');
      }
    };

    this.player.onTimeUpdate = (current, duration, percent) => {
      if (this.isScrubbing) return;
      const curTimeEl = document.getElementById('player-time-current');
      const durTimeEl = document.getElementById('player-time-duration');
      const seekbarEl = document.getElementById('player-seekbar');

      if (curTimeEl) curTimeEl.textContent = formatTime(current);
      if (durTimeEl) durTimeEl.textContent = formatTime(duration);
      if (seekbarEl) seekbarEl.value = isNaN(percent) ? 0 : percent;
    };
  }

  navigateTo(viewName) {
    this.currentView = viewName;
    if (viewName !== 'step' && this.player) {
      this.player.pause();
    }
    if (typeof document === 'undefined') return;

    const views = ['home', 'tours', 'step'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.toggle('active', v === viewName);
    });

    const playerBar = document.getElementById('audio-player-bar');
    if (playerBar) {
      playerBar.style.display = viewName === 'step' ? 'flex' : 'none';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderHome() {
    if (typeof document === 'undefined') return;

    if (this.rootConfig && this.rootConfig.monument) {
      const mon = this.rootConfig.monument;
      const titleEl = document.getElementById('monument-title');
      const subEl = document.getElementById('monument-subtitle');
      const heroEl = document.getElementById('home-hero-bg');

      if (titleEl && mon.name) titleEl.textContent = mon.name;
      if (subEl && mon.subtitle) subEl.textContent = mon.subtitle;
      if (heroEl && mon.cover_image) {
        heroEl.style.backgroundImage = `url('${mon.cover_image}')`;
      }
      if (mon.name) {
        document.title = `Audioguide - ${mon.name}`;
      }
    }

    // Localized UI static text
    const labelLang = document.getElementById('label-select-language');
    if (labelLang) labelLang.textContent = this.t('selectLanguage');

    const txtStart = document.getElementById('txt-start-tours');
    if (txtStart) txtStart.textContent = this.t('startTours');

    const tipTitle = document.getElementById('home-headphones-tip');
    if (tipTitle) tipTitle.textContent = this.t('headphonesTipTitle');

    const tipText = document.getElementById('home-offline-tip');
    if (tipText) tipText.textContent = this.t('headphonesTipText');

    // Language buttons
    const langGrid = document.getElementById('languages-grid');
    if (langGrid && this.rootConfig && this.rootConfig.languages) {
      langGrid.innerHTML = '';
      this.rootConfig.languages.forEach(l => {
        const btn = document.createElement('button');
        btn.className = `lang-btn ${l.code === this.currentLanguage ? 'active' : ''}`;
        btn.innerHTML = `<span>${l.flag || ''}</span> <span>${l.name}</span>`;
        btn.addEventListener('click', async () => {
          this.setLanguage(l.code);
          await this.loadLanguageConfig(l.code);
          this.renderHome();
        });
        langGrid.appendChild(btn);
      });
    }
  }

  renderTours() {
    if (typeof document === 'undefined' || !this.langConfig) return;

    const toursTitle = document.getElementById('tours-header-title');
    if (toursTitle) toursTitle.textContent = this.t('toursTitle');

    const toursContainer = document.getElementById('tours-list');
    if (!toursContainer) return;

    toursContainer.innerHTML = '';

    const tours = this.langConfig.tours || [];
    tours.forEach(tour => {
      const card = document.createElement('div');
      card.className = 'tour-card';

      const stepCount = (tour.steps || []).length;

      card.innerHTML = `
        <div class="tour-card-header">
          <span class="tour-card-badge">${tour.badge || 'Circuit'}</span>
          <span class="tour-card-meta">⏱ ${tour.duration || ''} • ${this.t('stepsCount', stepCount)}</span>
        </div>
        <h3 class="tour-card-title">${tour.title}</h3>
        <p class="tour-card-desc">${tour.description || ''}</p>

        <div class="preload-panel" id="preload-panel-${tour.id}">
          <div class="preload-panel-header">
            <span>💾 Hors-ligne</span>
            <span id="preload-status-${tour.id}">${this.t('offlineDownload')}</span>
          </div>
          <div class="preload-progress-bar" style="display: none;" id="preload-bar-${tour.id}">
            <div class="preload-progress-fill" id="preload-fill-${tour.id}"></div>
          </div>
          <button class="preload-btn" id="btn-preload-${tour.id}">
            ${getIcon('download')}
            <span>${this.t('offlineDownload')}</span>
          </button>
        </div>
      `;

      // Open tour when card body is clicked
      card.addEventListener('click', (e) => {
        if (e.target.closest('.preload-panel')) return; // ignore download button click
        this.selectTour(tour);
      });

      // Offline Preload trigger
      const preloadBtn = card.querySelector(`#btn-preload-${tour.id}`);
      if (preloadBtn) {
        preloadBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          preloadBtn.disabled = true;
          const bar = card.querySelector(`#preload-bar-${tour.id}`);
          const fill = card.querySelector(`#preload-fill-${tour.id}`);
          const status = card.querySelector(`#preload-status-${tour.id}`);
          if (bar) bar.style.display = 'block';

          await this.preloader.preloadTour(tour, this.currentLanguage, this.langConfig, (p) => {
            if (fill) fill.style.width = `${p.percent}%`;
            if (status) status.textContent = this.t('downloading', p.percent);
          });

          if (status) status.textContent = this.t('offlineReady');
          preloadBtn.innerHTML = `${getIcon('check')} <span>${this.t('offlineReady')}</span>`;
        });
      }

      toursContainer.appendChild(card);
    });
  }

  selectTour(tour) {
    this.currentTour = tour;
    this.currentStepIndex = 0;
    this.loadStepByIndex(0);
    this.navigateTo('step');
  }

  async loadStepByIndex(index) {
    if (!this.currentTour || !this.langConfig) return;
    const stepIds = this.currentTour.steps || [];
    if (index < 0 || index >= stepIds.length) return;

    if (this.player) {
      this.player.pause();
    }

    this.currentStepIndex = index;
    const stepId = stepIds[index];

    const stepMap = new Map();
    (this.langConfig.steps || []).forEach(s => stepMap.set(s.id, s));
    const step = stepMap.get(stepId);
    if (!step) return;

    const hasDOM = typeof document !== 'undefined';

    // Update Dropdown selector
    if (hasDOM) {
      const stepSelect = document.getElementById('step-selector-select');
      if (stepSelect) {
        stepSelect.innerHTML = '';
        stepIds.forEach((id, idx) => {
          const s = stepMap.get(id);
          const opt = document.createElement('option');
          opt.value = idx.toString();
          opt.textContent = `${idx + 1}. ${s ? s.title : id}`;
          if (idx === index) opt.selected = true;
          stepSelect.appendChild(opt);
        });
      }

      // Update UI headers
      const badgeEl = document.getElementById('step-indicator-badge');
      if (badgeEl) {
        badgeEl.textContent = this.t('stepOf', index + 1, stepIds.length);
      }

      const headingEl = document.getElementById('step-heading');
      if (headingEl) {
        headingEl.textContent = step.title;
      }

      // Update previous / next button state & localized text
      const prevBtn = document.getElementById('player-btn-prev-step');
      const nextBtn = document.getElementById('player-btn-next-step');
      const txtPrev = document.getElementById('player-txt-prev');
      const txtNext = document.getElementById('player-txt-next');
      if (txtPrev) txtPrev.textContent = this.t('prev');
      if (txtNext) txtNext.textContent = this.t('next');
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === stepIds.length - 1;

      // Load and render markdown content with carousels
      const markdownContainer = document.getElementById('step-body-markdown');
      if (markdownContainer) {
        markdownContainer.innerHTML = '<p>Chargement...</p>';
        const basePath = `content/${this.currentLanguage}/`;
        try {
          const res = await fetch(`${basePath}${step.text_file}`);
          if (res.ok) {
            const rawMd = await res.text();
            markdownContainer.innerHTML = renderMarkdownWithCarousels(rawMd, basePath);
            initCarousels(markdownContainer);
          } else {
            markdownContainer.innerHTML = '<p>Texte non disponible.</p>';
          }
        } catch (err) {
          markdownContainer.innerHTML = '<p>Erreur lors du chargement de l\'étape.</p>';
        }
      }
    }

    // Load Audio in Player
    if (this.player) {
      if (step.audio) {
        this.player.loadStep(step.audio, `content/${this.currentLanguage}/`);
      } else {
        this.player.loadStep(null);
      }
    }

    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
