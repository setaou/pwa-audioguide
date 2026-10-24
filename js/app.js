/**
 * Main Application Orchestrator for PWA Audioguide.
 */

import { AudioPlayer, formatTime } from './player.js';
import { renderMarkdownWithCarousels, initCarousels } from './carousel.js';
import { TourPreloader } from './preloader.js';
import { getIcon } from './icons.js';

export class AudioguideApp {
  constructor(options = {}) {
    this.storage = options.localStorage || (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' ? localStorage : null);
    this.yamlParser = options.yamlParser || globalThis.jsyaml || null;
    this.rootConfigPath = options.rootConfigPath
      || (typeof window !== 'undefined' && typeof window.location !== 'undefined'
          ? new URLSearchParams(window.location.search).get('config')
          : null)
      || 'config.yml';
    this.contentDir = options.contentDir || null;
    this.isDevMode = options.isDevMode !== undefined
      ? Boolean(options.isDevMode)
      : ((typeof window !== 'undefined' && typeof window.location !== 'undefined'
          && new URLSearchParams(window.location.search).get('dev') === '1')
        || this.getSavedDevMode());
    this.isAutoplay = options.isAutoplay !== undefined
      ? Boolean(options.isAutoplay)
      : this.getSavedAutoplay();

    this.currentView = 'home';
    this.currentLanguage = this.getSavedLanguage() || 'fr';
    this.fallbackLanguage = 'en';
    this.rootConfig = options.rootConfig || null;
    this.langConfig = null;
    this.fallbackLangConfig = null;
    this.currentTour = null;
    this.currentStepIndex = 0;

    this.player = new AudioPlayer({ isDevMode: this.isDevMode });
    this.preloader = options.preloader || new TourPreloader({ contentDir: this.getContentDir() });

    this.isScrubbing = false;
  }

  getContentDir() {
    const dir = this.contentDir || this.rootConfig?.content_dir || 'content';
    return String(dir).replace(/\/+$/, '');
  }

  getSavedLanguage() {
    try {
      return (this.storage && typeof this.storage.getItem === 'function')
        ? this.storage.getItem('audioguide_lang')
        : null;
    } catch (_) {
      return null;
    }
  }

  setLanguage(langCode) {
    this.currentLanguage = langCode;
    try {
      if (this.storage && typeof this.storage.setItem === 'function') {
        this.storage.setItem('audioguide_lang', langCode);
      }
    } catch (_) {}
  }

  getSavedDevMode() {
    try {
      return (this.storage && typeof this.storage.getItem === 'function')
        ? this.storage.getItem('audioguide_dev_mode') === 'true'
        : false;
    } catch (_) {
      return false;
    }
  }

  getSavedAutoplay() {
    try {
      if (this.storage && typeof this.storage.getItem === 'function') {
        const val = this.storage.getItem('audioguide_autoplay');
        if (val !== null) return val !== 'false';
      }
    } catch (_) {}
    return true;
  }

  setDevMode(enabled) {
    this.isDevMode = Boolean(enabled);
    if (this.player) {
      this.player.isDevMode = this.isDevMode;
    }
    try {
      if (this.storage && typeof this.storage.setItem === 'function') {
        this.storage.setItem('audioguide_dev_mode', String(this.isDevMode));
      }
    } catch (_) {}
  }

  setAutoplay(enabled) {
    this.isAutoplay = Boolean(enabled);
    try {
      if (this.storage && typeof this.storage.setItem === 'function') {
        this.storage.setItem('audioguide_autoplay', String(this.isAutoplay));
      }
    } catch (_) {}
  }

  openSettings() {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('settings-overlay');
    const sheet = document.getElementById('settings-sheet');
    const devToggle = document.getElementById('toggle-dev-mode');
    const autoplayToggle = document.getElementById('toggle-autoplay');

    if (devToggle) devToggle.checked = this.isDevMode;
    if (autoplayToggle) autoplayToggle.checked = this.isAutoplay;

    if (overlay) {
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
    }
    if (sheet) {
      sheet.classList.add('active');
      sheet.setAttribute('aria-hidden', 'false');
    }
  }

  closeSettings() {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('settings-overlay');
    const sheet = document.getElementById('settings-sheet');

    if (overlay) {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (sheet) {
      sheet.classList.remove('active');
      sheet.setAttribute('aria-hidden', 'true');
    }
    const btnOpen = document.getElementById('btn-settings-open');
    if (btnOpen && typeof btnOpen.focus === 'function') {
      btnOpen.focus();
    }
  }

  async clearCacheAndReload() {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
      window.location.reload();
    }
  }

  t(key, ...args) {
    const ui = this.langConfig?.ui || this.langConfig?.strings || {};
    const fallbackUi = this.fallbackLangConfig?.ui || this.fallbackLangConfig?.strings || {};
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    let val = ui[key] !== undefined ? ui[key] : (ui[snakeKey] !== undefined ? ui[snakeKey] : ui[camelKey]);

    if (val === undefined || val === null || val === '') {
      val = fallbackUi[key] !== undefined ? fallbackUi[key] : (fallbackUi[snakeKey] !== undefined ? fallbackUi[snakeKey] : fallbackUi[camelKey]);
    }

    if (val === undefined || val === null) {
      return '';
    }

    if (typeof val === 'function') {
      return val(...args);
    }

    let str = String(val);
    if (args.length > 0) {
      if (typeof args[0] === 'object' && args[0] !== null) {
        Object.entries(args[0]).forEach(([k, v]) => {
          str = str.replaceAll(`{${k}}`, v);
        });
      } else {
        args.forEach((arg, idx) => {
          str = str.replaceAll(`{${idx}}`, arg);
        });
        if (args.length === 1) {
          str = str.replaceAll('{count}', args[0]).replaceAll('{percent}', args[0]).replaceAll('{pct}', args[0]);
        } else if (args.length === 2) {
          str = str.replaceAll('{current}', args[0]).replaceAll('{total}', args[1]);
        }
      }
    }
    return str;
  }

  async init() {
    await this.loadRootConfig();
    await this.loadLanguageConfig(this.currentLanguage);
    this.setupUIBindings();
    this.applyLocalizedUI();
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('hashchange', () => this.handleRoute());
    }
    await this.handleRoute();
  }

  async loadYaml(url) {
    const fetchOptions = this.isDevMode ? { cache: 'no-cache' } : {};
    const res = await fetch(url, fetchOptions);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    let text = await res.text();
    if (url.endsWith('.md')) {
      const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (match) {
        text = match[1];
      }
    }
    const parser = this.yamlParser || globalThis.jsyaml;
    if (!parser || typeof parser.load !== 'function') {
      throw new Error('YAML parser not loaded');
    }
    return parser.load(text);
  }

  async loadRootConfig(configPath = this.rootConfigPath) {
    try {
      this.rootConfig = await this.loadYaml(configPath);
    } catch (err) {
      console.warn('Using default root config fallback:', err);
      this.rootConfig = {
        monument: {
          name: "Audioguide",
          subtitle: "",
          cover_image: ""
        },
        content_dir: "content",
        default_language: "fr",
        fallback_language: "en",
        languages: [
          { code: 'fr', name: 'Français', flag: '🇫🇷' },
          { code: 'en', name: 'English', flag: '🇬🇧' }
        ]
      };
    }
    if (this.rootConfig && this.rootConfig.fallback_language) {
      this.fallbackLanguage = this.rootConfig.fallback_language;
    }
    if (this.preloader) {
      this.preloader.contentDir = this.getContentDir();
    }
  }

  async loadConfigForLang(lang) {
    if (!lang) return null;
    const baseDir = this.getContentDir();
    try {
      return await this.loadYaml(`${baseDir}/${lang}/config.yml`);
    } catch (err) {
      try {
        return await this.loadYaml(`${baseDir}/${lang}/config.md`);
      } catch (err2) {
        console.warn(`Failed loading ${baseDir}/${lang}/config.yml or config.md:`, err2);
        return null;
      }
    }
  }

  async loadLanguageConfig(lang) {
    this.langConfig = await this.loadConfigForLang(lang);
    if (this.fallbackLanguage) {
      if (lang === this.fallbackLanguage) {
        this.fallbackLangConfig = this.langConfig;
      } else if (!this.fallbackLangConfig || this.fallbackLangConfig === this.langConfig) {
        this.fallbackLangConfig = await this.loadConfigForLang(this.fallbackLanguage);
      }
    }
  }

  setupUIBindings() {
    if (typeof document === 'undefined') return;

    // View Navigation Buttons
    const btnStartTours = document.getElementById('btn-start-tours');
    if (btnStartTours) {
      btnStartTours.addEventListener('click', () => {
        this.setRoute('#/tours');
      });
    }

    // Settings Bottom Sheet Bindings
    const btnSettingsOpen = document.getElementById('btn-settings-open');
    if (btnSettingsOpen) {
      btnSettingsOpen.innerHTML = getIcon('settings');
      btnSettingsOpen.addEventListener('click', () => {
        this.openSettings();
      });
    }

    const btnSettingsClose = document.getElementById('btn-settings-close');
    if (btnSettingsClose) {
      btnSettingsClose.addEventListener('click', () => {
        this.closeSettings();
      });
    }

    const settingsOverlay = document.getElementById('settings-overlay');
    if (settingsOverlay) {
      settingsOverlay.addEventListener('click', () => {
        this.closeSettings();
      });
    }

    const toggleDevMode = document.getElementById('toggle-dev-mode');
    if (toggleDevMode) {
      toggleDevMode.addEventListener('change', (e) => {
        this.setDevMode(e.target.checked);
      });
    }

    const toggleAutoplay = document.getElementById('toggle-autoplay');
    if (toggleAutoplay) {
      toggleAutoplay.addEventListener('change', (e) => {
        this.setAutoplay(e.target.checked);
      });
    }

    const btnClearCache = document.getElementById('btn-clear-cache');
    if (btnClearCache) {
      btnClearCache.addEventListener('click', () => {
        this.clearCacheAndReload();
      });
    }

    if (typeof document.addEventListener === 'function') {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const sheet = document.getElementById('settings-sheet');
          if (sheet && sheet.classList.contains('active')) {
            this.closeSettings();
          }
        }
      });
    }

    const btnToursBack = document.getElementById('btn-tours-back');
    if (btnToursBack) {
      btnToursBack.innerHTML = getIcon('chevron-left');
      btnToursBack.addEventListener('click', () => {
        this.setRoute('#/');
      });
    }

    const btnStepBackTours = document.getElementById('btn-step-back-tours');
    if (btnStepBackTours) {
      btnStepBackTours.innerHTML = getIcon('chevron-left');
      btnStepBackTours.addEventListener('click', () => {
        this.setRoute('#/tours');
      });
    }

    // Step Selector Dropdown
    const stepSelect = document.getElementById('step-selector-select');
    if (stepSelect) {
      stepSelect.addEventListener('change', (e) => {
        const stepIndex = parseInt(e.target.value, 10);
        if (this.currentTour && this.currentTour.steps && this.currentTour.steps[stepIndex]) {
          const stepId = this.currentTour.steps[stepIndex];
          this.setRoute(`#/tour/${this.currentTour.id}/${stepId}`);
        } else {
          this.loadStepByIndex(stepIndex);
        }
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
        if (this.currentTour && this.currentTour.steps && this.currentStepIndex > 0) {
          const prevStepId = this.currentTour.steps[this.currentStepIndex - 1];
          this.setRoute(`#/tour/${this.currentTour.id}/${prevStepId}`);
        }
      });
    }

    const btnNextStep = document.getElementById('player-btn-next-step');
    if (btnNextStep) {
      const iconNext = document.getElementById('player-icon-next');
      if (iconNext) iconNext.innerHTML = getIcon('step-next');
      btnNextStep.addEventListener('click', () => {
        if (this.currentTour && this.currentTour.steps && this.currentStepIndex < this.currentTour.steps.length - 1) {
          const nextStepId = this.currentTour.steps[this.currentStepIndex + 1];
          this.setRoute(`#/tour/${this.currentTour.id}/${nextStepId}`);
        }
      });
    }

    // Seekbar scrubbing
    const seekbar = document.getElementById('player-seekbar');
    if (seekbar) {
      seekbar.addEventListener('input', (e) => {
        this.isScrubbing = true;
        const duration = this.player?.getDuration ? this.player.getDuration() : (this.player?.audio ? this.player.audio.duration : 0);
        const targetSecs = (parseFloat(e.target.value) / 100) * duration;
        const curTimeEl = document.getElementById('player-time-current');
        if (curTimeEl) curTimeEl.textContent = formatTime(targetSecs);
      });

      const finishScrubbing = (e) => {
        if (!this.isScrubbing) return;
        this.isScrubbing = false;
        const duration = this.player?.getDuration ? this.player.getDuration() : (this.player?.audio ? this.player.audio.duration : 0);
        const targetSecs = (parseFloat(seekbar.value) / 100) * duration;
        this.player.seek(targetSecs);
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

      this._updateNextButtonPulse(current);
    };

    this.player.onMainAudioEnded = () => {
      const curTime = this.player?.getCurrentTime ? this.player.getCurrentTime() : 0;
      this._updateNextButtonPulse(curTime, true);
    };
  }

  _updateNextButtonPulse(currentTime, force = false) {
    if (typeof document === 'undefined') return;
    const nextBtn = document.getElementById('player-btn-next-step');
    if (!nextBtn) return;

    if (!this.currentTour || this.currentStepIndex >= this.currentTour.steps.length - 1) {
      nextBtn.classList.remove('btn-next-pulse');
      return;
    }

    const mainDuration = this.player?.mainDuration || 0;
    if (mainDuration <= 0 && !force) {
      nextBtn.classList.remove('btn-next-pulse');
      return;
    }

    const isTransitionActive = Boolean(this.player?.isTransitionActive);
    if (force || isTransitionActive || currentTime >= mainDuration) {
      nextBtn.classList.add('btn-next-pulse');
    } else {
      nextBtn.classList.remove('btn-next-pulse');
    }
  }

  applyLocalizedUI() {
    if (typeof document === 'undefined') return;

    // Monument info: language config takes precedence over fallback language, which takes precedence over root fallback
    const mon = this.langConfig?.monument || {};
    const fallbackMon = this.fallbackLangConfig?.monument || {};
    const rootMon = this.rootConfig?.monument || {};

    const titleEl = document.getElementById('monument-title');
    const subEl = document.getElementById('monument-subtitle');
    const badgeEl = document.getElementById('monument-badge');
    const heroEl = document.getElementById('home-hero-bg');

    const monName = mon.name || fallbackMon.name || rootMon.name || '';
    if (titleEl && monName) titleEl.textContent = monName;
    const monSub = (mon.subtitle !== undefined && mon.subtitle !== '')
      ? mon.subtitle
      : (fallbackMon.subtitle || rootMon.subtitle || '');
    if (subEl && monSub) subEl.textContent = monSub;
    const monBadge = mon.badge || fallbackMon.badge || rootMon.badge || '';
    if (badgeEl && monBadge) badgeEl.textContent = monBadge;

    const coverImg = this.rootConfig?.monument?.cover_image;
    if (heroEl && coverImg) {
      heroEl.style.backgroundImage = `url('${coverImg}')`;
    }
    if (monName) {
      document.title = `Audioguide - ${monName}`;
    }

    // Home view static texts
    const labelLang = document.getElementById('label-select-language');
    if (labelLang) labelLang.textContent = this.t('selectLanguage');

    const txtStart = document.getElementById('txt-start-tours');
    if (txtStart) txtStart.textContent = this.t('startTours');

    const tipTitle = document.getElementById('home-headphones-tip');
    if (tipTitle) tipTitle.textContent = this.t('headphonesTipTitle');

    const tipText = document.getElementById('home-offline-tip');
    if (tipText) tipText.textContent = this.t('headphonesTipText');

    // Settings sheet and button localized strings
    const btnSettingsOpen = document.getElementById('btn-settings-open');
    if (btnSettingsOpen) {
      btnSettingsOpen.setAttribute('aria-label', this.t('settingsBtnTitle') || this.t('settingsTitle'));
      btnSettingsOpen.setAttribute('title', this.t('settingsBtnTitle') || this.t('settingsTitle'));
    }

    const settingsTitle = document.getElementById('settings-title');
    if (settingsTitle) settingsTitle.textContent = this.t('settingsTitle');

    const btnSettingsClose = document.getElementById('btn-settings-close');
    if (btnSettingsClose) btnSettingsClose.setAttribute('aria-label', this.t('settingsClose'));

    const lblDevMode = document.getElementById('lbl-dev-mode');
    if (lblDevMode) lblDevMode.textContent = this.t('settingsDevMode');

    const descDevMode = document.getElementById('desc-dev-mode');
    if (descDevMode) descDevMode.textContent = this.t('settingsDevModeDesc');

    const lblAutoplay = document.getElementById('lbl-autoplay');
    if (lblAutoplay) lblAutoplay.textContent = this.t('settingsAutoplay');

    const descAutoplay = document.getElementById('desc-autoplay');
    if (descAutoplay) descAutoplay.textContent = this.t('settingsAutoplayDesc');

    const txtClearCache = document.getElementById('txt-clear-cache');
    if (txtClearCache) txtClearCache.textContent = this.t('settingsClearCache');

    // Navigation buttons aria-labels
    const btnToursBack = document.getElementById('btn-tours-back');
    if (btnToursBack) btnToursBack.setAttribute('aria-label', this.t('backToHome'));

    const btnStepBackTours = document.getElementById('btn-step-back-tours');
    if (btnStepBackTours) btnStepBackTours.setAttribute('aria-label', this.t('backToTours'));

    const stepSelect = document.getElementById('step-selector-select');
    if (stepSelect) stepSelect.setAttribute('aria-label', this.t('selectStep'));

    // Tour header title
    const toursTitle = document.getElementById('tours-header-title');
    if (toursTitle) toursTitle.textContent = this.t('toursTitle');

    // Player controls titles and labels
    const seekbar = document.getElementById('player-seekbar');
    if (seekbar) seekbar.setAttribute('aria-label', this.t('audioProgress'));

    const btnPrevStep = document.getElementById('player-btn-prev-step');
    if (btnPrevStep) {
      btnPrevStep.setAttribute('title', this.t('prevStepTitle'));
      btnPrevStep.setAttribute('aria-label', this.t('prevStepTitle'));
    }
    const txtPrev = document.getElementById('player-txt-prev');
    if (txtPrev) txtPrev.textContent = this.t('prev');

    const btnSkipBack = document.getElementById('player-btn-skip-back');
    if (btnSkipBack) {
      btnSkipBack.setAttribute('title', this.t('skipBackTitle'));
      btnSkipBack.setAttribute('aria-label', this.t('skipBackTitle'));
    }

    const btnPlay = document.getElementById('player-btn-play');
    if (btnPlay) {
      btnPlay.setAttribute('title', this.t('playPauseTitle'));
      btnPlay.setAttribute('aria-label', this.t('playPauseTitle'));
    }

    const btnSkipForward = document.getElementById('player-btn-skip-forward');
    if (btnSkipForward) {
      btnSkipForward.setAttribute('title', this.t('skipForwardTitle'));
      btnSkipForward.setAttribute('aria-label', this.t('skipForwardTitle'));
    }

    const btnNextStep = document.getElementById('player-btn-next-step');
    if (btnNextStep) {
      btnNextStep.setAttribute('title', this.t('nextStepTitle'));
      btnNextStep.setAttribute('aria-label', this.t('nextStepTitle'));
    }
    const txtNext = document.getElementById('player-txt-next');
    if (txtNext) txtNext.textContent = this.t('next');
  }

  navigateTo(viewName) {
    this.currentView = viewName;
    if (viewName !== 'step') {
      if (this.player && typeof this.player.pause === 'function') {
        this.player.pause();
      }
      const nextBtn = typeof document !== 'undefined' ? document.getElementById('player-btn-next-step') : null;
      if (nextBtn) {
        nextBtn.classList.remove('btn-next-pulse');
      }
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

    const settingsBtn = document.getElementById('btn-settings-open');
    if (settingsBtn) {
      settingsBtn.style.display = viewName === 'home' ? 'flex' : 'none';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  parseHash(hash = '') {
    try {
      const raw = String(hash || '').replace(/^#\/?/, '').replace(/\/+$/, '').trim();
      if (!raw) {
        return { view: 'home' };
      }
      const parts = raw.split('/').filter(Boolean);
      if (parts.length === 1 && parts[0] === 'tours') {
        return { view: 'tours' };
      }
      if (parts.length >= 3 && parts[0] === 'tour') {
        return {
          view: 'step',
          tourId: decodeURIComponent(parts[1]),
          stepId: decodeURIComponent(parts[2])
        };
      }
      return { view: 'home' };
    } catch (_) {
      return { view: 'home' };
    }
  }

  setRoute(hashPath) {
    const targetHash = hashPath.startsWith('#') ? hashPath : `#${hashPath}`;
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      } else {
        this.handleRoute();
      }
    } else {
      this._mockHash = targetHash;
      return this.handleRoute();
    }
  }

  async handleRoute() {
    let currentHash = '';
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      currentHash = window.location.hash || '';
    } else if (this._mockHash !== undefined && this._mockHash !== null) {
      currentHash = this._mockHash;
    }

    const route = this.parseHash(currentHash);

    if (route.view === 'home') {
      this.renderHome();
      this.navigateTo('home');
      return;
    }

    if (route.view === 'tours') {
      this.renderTours();
      this.navigateTo('tours');
      return;
    }

    if (route.view === 'step') {
      const tours = this.langConfig?.tours || [];
      const tour = tours.find(t => t.id === route.tourId) || (this.currentTour?.id === route.tourId ? this.currentTour : null);
      if (!tour) {
        console.warn(`Tour not found: ${route.tourId}`);
        this.setRoute('#/tours');
        return;
      }

      const stepIds = tour.steps || [];
      let stepIndex = stepIds.indexOf(route.stepId);
      if (stepIndex === -1) {
        console.warn(`Step not found in tour ${route.tourId}: ${route.stepId}`);
        if (stepIds.length > 0) {
          this.setRoute(`#/tour/${route.tourId}/${stepIds[0]}`);
          return;
        } else {
          this.setRoute('#/tours');
          return;
        }
      }

      this.currentTour = tour;
      this.navigateTo('step');
      await this.loadStepByIndex(stepIndex);
      return;
    }

    this.renderHome();
    this.navigateTo('home');
  }

  renderHome() {
    if (typeof document === 'undefined') return;

    this.applyLocalizedUI();

    // Language buttons
    const langGrid = document.getElementById('languages-grid');
    if (langGrid && this.rootConfig && this.rootConfig.languages) {
      langGrid.innerHTML = '';
      this.rootConfig.languages.forEach(l => {
        const btn = document.createElement('button');
        btn.className = `lang-btn ${l.code === this.currentLanguage ? 'active' : ''}`;
        btn.dataset.lang = l.code;
        btn.innerHTML = `<span>${l.flag || ''}</span> <span>${l.name}</span>`;
        btn.addEventListener('click', async () => {
          this.setLanguage(l.code);
          await this.loadLanguageConfig(l.code);
          this.applyLocalizedUI();
          this.renderHome();
        });
        langGrid.appendChild(btn);
      });
    }
  }

  renderTours() {
    if (typeof document === 'undefined' || !this.langConfig) return;

    this.applyLocalizedUI();

    const toursContainer = document.getElementById('tours-list');
    if (!toursContainer) return;

    toursContainer.innerHTML = '';

    const tours = this.langConfig.tours || [];
    tours.forEach(tour => {
      const card = document.createElement('div');
      card.className = 'tour-card';
      card.dataset.tourId = tour.id;

      const stepCount = (tour.steps || []).length;

      card.innerHTML = `
        <div class="tour-card-header">
          <span class="tour-card-badge">${tour.badge || ''}</span>
          <span class="tour-card-meta">⏱ ${tour.duration || ''} • ${this.t('stepsCount', stepCount)}</span>
        </div>
        <h3 class="tour-card-title">${tour.title}</h3>
        <p class="tour-card-desc">${tour.description || ''}</p>

        <div class="preload-panel" id="preload-panel-${tour.id}">
          <div class="preload-panel-header">
            <span>${this.t('offlineBadge')}</span>
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
        if (e.target.closest('.preload-btn')) return; // ignore download button click
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
          }, this.getContentDir());

          if (status) status.textContent = this.t('offlineReady');
          preloadBtn.innerHTML = `${getIcon('check')} <span>${this.t('offlineReady')}</span>`;
        });
      }

      toursContainer.appendChild(card);
    });
  }

  selectTour(tour) {
    this.currentTour = tour;
    const firstStepId = (tour.steps && tour.steps.length > 0) ? tour.steps[0] : '';
    if (firstStepId) {
      this.setRoute(`#/tour/${tour.id}/${firstStepId}`);
    } else {
      this.currentStepIndex = 0;
      this.navigateTo('step');
      this.loadStepByIndex(0);
    }
  }

  async loadStepByIndex(index) {
    if (!this.currentTour || !this.langConfig) return;
    const stepIds = this.currentTour.steps || [];
    if (index < 0 || index >= stepIds.length) return;

    if (this.player && typeof this.player.pause === 'function') {
      this.player.pause();
    }

    this.currentStepIndex = index;
    const stepId = stepIds[index];

    const stepMap = new Map();
    (this.langConfig.steps || []).forEach(s => stepMap.set(s.id, s));
    const step = stepMap.get(stepId);
    if (!step) return;

    const basePath = `${this.getContentDir()}/${this.currentLanguage}/`;

    // Resolve optional transition audio to next step in tour
    let transitionConfig = null;
    if (this.currentTour && index < this.currentTour.steps.length - 1) {
      const nextStepId = this.currentTour.steps[index + 1];
      if (step.transitions && step.transitions[nextStepId]) {
        transitionConfig = step.transitions[nextStepId].audio || step.transitions[nextStepId];
      }
    }

    // Load Audio in Player and conditionally start playback upon step arrival
    if (this.player) {
      if (step.audio && typeof this.player.loadStep === 'function') {
        this.player.loadStep(step.audio, transitionConfig, basePath);
        if (this.isAutoplay && typeof this.player.play === 'function') {
          this.player.play();
        }
      } else if (typeof this.player.loadStep === 'function') {
        this.player.loadStep(null);
      }
    }

    const hasDOM = typeof document !== 'undefined';

    // Reset next button pulse
    if (hasDOM) {
      const nextBtn = document.getElementById('player-btn-next-step');
      if (nextBtn) {
        nextBtn.classList.remove('btn-next-pulse');
      }
    }

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
        markdownContainer.innerHTML = `<p>${this.t('stepLoading')}</p>`;
        const fetchOptions = this.isDevMode ? { cache: 'no-cache' } : {};
        try {
          const res = await fetch(`${basePath}${step.text_file}`, fetchOptions);
          if (res.ok) {
            const rawMd = await res.text();
            markdownContainer.innerHTML = renderMarkdownWithCarousels(rawMd, basePath, {
              prevImage: this.t('prevImage'),
              nextImage: this.t('nextImage'),
              carouselSlide: this.t('carouselSlide')
            });
            initCarousels(markdownContainer);
          } else {
            markdownContainer.innerHTML = `<p>${this.t('stepUnavailable')}</p>`;
          }
        } catch (err) {
          markdownContainer.innerHTML = `<p>${this.t('stepError')}</p>`;
        }
      }
    }

    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
