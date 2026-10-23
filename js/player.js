/**
 * Dual-Source Audio Player Controller for PWA Audioguide.
 */

export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const totalSecs = Math.floor(seconds);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function resolveAssetPath(src, basePath) {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.startsWith('data:')) {
    return src;
  }
  const cleanBase = basePath.endsWith('/') ? basePath : basePath + '/';
  return cleanBase + src;
}

function buildAudioSources(audioConfig, basePath) {
  const sources = [];
  if (!audioConfig) return sources;

  if (audioConfig.webm) {
    sources.push({
      src: resolveAssetPath(audioConfig.webm, basePath),
      type: 'audio/webm; codecs=opus'
    });
  }
  if (audioConfig.m4a) {
    sources.push({
      src: resolveAssetPath(audioConfig.m4a, basePath),
      type: 'audio/mp4'
    });
  }
  if (audioConfig.mp3) {
    sources.push({
      src: resolveAssetPath(audioConfig.mp3, basePath),
      type: 'audio/mpeg'
    });
  }
  return sources;
}

export class AudioPlayer {
  constructor(options = {}) {
    this.audio = options.audioElement || (typeof Audio !== 'undefined' ? new Audio() : null);
    this.transitionAudio = options.transitionAudioElement || (typeof Audio !== 'undefined' ? new Audio() : null);
    this.isDevMode = Boolean(options.isDevMode);

    this.sources = [];
    this.transitionSources = [];

    this.mainDuration = 0;
    this.transitionDuration = 0;
    this.isTransitionActive = false;

    this.onTimeUpdate = null;
    this.onStateChange = null;
    this.onEnded = null;
    this.onMainAudioEnded = null;
    this.onNextStepRequested = null;
    this.onError = null;

    this._currentBlobUrl = null;
    this._currentTransitionBlobUrl = null;
    this._loadPromise = null;
    this._loadId = 0;

    this._boundTimeUpdate = this._handleTimeUpdate.bind(this);
    this._boundStateChange = this._handleStateChange.bind(this);
    this._boundMainEnded = this._handleMainEnded.bind(this);
    this._boundTransitionEnded = this._handleTransitionEnded.bind(this);
    this._boundError = this._handleError.bind(this);
    this._boundMainLoadedMetadata = this._handleMainLoadedMetadata.bind(this);
    this._boundTransitionLoadedMetadata = this._handleTransitionLoadedMetadata.bind(this);
    this._boundTransitionError = this._handleTransitionError.bind(this);

    if (this.audio) {
      this._attachMainListeners();
    }
    if (this.transitionAudio) {
      this._attachTransitionListeners();
    }
  }

  _attachMainListeners() {
    this.audio.addEventListener('timeupdate', this._boundTimeUpdate);
    this.audio.addEventListener('loadedmetadata', this._boundMainLoadedMetadata);
    this.audio.addEventListener('durationchange', this._boundMainLoadedMetadata);
    this.audio.addEventListener('play', this._boundStateChange);
    this.audio.addEventListener('pause', this._boundStateChange);
    this.audio.addEventListener('emptied', this._boundStateChange);
    this.audio.addEventListener('ended', this._boundMainEnded);
    this.audio.addEventListener('error', this._boundError);
  }

  _detachMainListeners() {
    if (!this.audio) return;
    this.audio.removeEventListener('timeupdate', this._boundTimeUpdate);
    this.audio.removeEventListener('loadedmetadata', this._boundMainLoadedMetadata);
    this.audio.removeEventListener('durationchange', this._boundMainLoadedMetadata);
    this.audio.removeEventListener('play', this._boundStateChange);
    this.audio.removeEventListener('pause', this._boundStateChange);
    this.audio.removeEventListener('emptied', this._boundStateChange);
    this.audio.removeEventListener('ended', this._boundMainEnded);
    this.audio.removeEventListener('error', this._boundError);
  }

  _attachTransitionListeners() {
    this.transitionAudio.addEventListener('timeupdate', this._boundTimeUpdate);
    this.transitionAudio.addEventListener('loadedmetadata', this._boundTransitionLoadedMetadata);
    this.transitionAudio.addEventListener('durationchange', this._boundTransitionLoadedMetadata);
    this.transitionAudio.addEventListener('play', this._boundStateChange);
    this.transitionAudio.addEventListener('pause', this._boundStateChange);
    this.transitionAudio.addEventListener('emptied', this._boundStateChange);
    this.transitionAudio.addEventListener('ended', this._boundTransitionEnded);
    this.transitionAudio.addEventListener('error', this._boundTransitionError);
  }

  _detachTransitionListeners() {
    if (!this.transitionAudio) return;
    this.transitionAudio.removeEventListener('timeupdate', this._boundTimeUpdate);
    this.transitionAudio.removeEventListener('loadedmetadata', this._boundTransitionLoadedMetadata);
    this.transitionAudio.removeEventListener('durationchange', this._boundTransitionLoadedMetadata);
    this.transitionAudio.removeEventListener('play', this._boundStateChange);
    this.transitionAudio.removeEventListener('pause', this._boundStateChange);
    this.transitionAudio.removeEventListener('emptied', this._boundStateChange);
    this.transitionAudio.removeEventListener('ended', this._boundTransitionEnded);
    this.transitionAudio.removeEventListener('error', this._boundTransitionError);
  }

  _resetAudioElement(el) {
    if (!el) return;
    if (typeof el.innerHTML !== 'undefined') {
      el.innerHTML = '';
    }
    if (el.src) {
      el.src = '';
    }
    if (typeof el.load === 'function') {
      el.load();
    }
  }

  loadStep(audioConfig, transitionConfigOrBasePath = null, possibleBasePath = '') {
    this.pause();
    this.sources = [];
    this.transitionSources = [];
    this.mainDuration = 0;
    this.transitionDuration = 0;
    this.isTransitionActive = false;

    let transitionConfig = null;
    let basePath = '';

    if (typeof transitionConfigOrBasePath === 'string') {
      basePath = transitionConfigOrBasePath;
      transitionConfig = null;
    } else {
      transitionConfig = transitionConfigOrBasePath;
      basePath = possibleBasePath || '';
    }

    if (this._currentBlobUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(this._currentBlobUrl);
      this._currentBlobUrl = null;
    }
    if (this._currentTransitionBlobUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(this._currentTransitionBlobUrl);
      this._currentTransitionBlobUrl = null;
    }

    this._loadPromise = null;
    this._loadId++;

    if (!audioConfig) {
      this._resetAudioElement(this.audio);
      this._resetAudioElement(this.transitionAudio);
      if (this.onTimeUpdate) {
        this.onTimeUpdate(0, 0, 0);
      }
      if (this.onStateChange) {
        this.onStateChange(false);
      }
      return;
    }

    this.sources = buildAudioSources(audioConfig, basePath);
    if (transitionConfig) {
      this.transitionSources = buildAudioSources(transitionConfig, basePath);
    }

    const loadId = this._loadId;

    if (this.isDevMode && typeof fetch === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      this._loadPromise = (async () => {
        try {
          if (this.sources.length > 0) {
            const mainSource = this._pickSource(this.audio, this.sources);
            if (mainSource) {
              const res = await fetch(mainSource.src, { cache: 'no-cache' });
              if (!res.ok || loadId !== this._loadId) return;
              const blob = await res.blob();
              if (loadId !== this._loadId) return;
              if (this._currentBlobUrl && typeof URL.revokeObjectURL === 'function') {
                URL.revokeObjectURL(this._currentBlobUrl);
              }
              this._currentBlobUrl = URL.createObjectURL(blob);
              if (this.audio) {
                this._resetAudioElement(this.audio);
                this.audio.src = this._currentBlobUrl;
                if (typeof this.audio.load === 'function') this.audio.load();
              }
            }
          }

          if (this.transitionSources.length > 0 && this.transitionAudio) {
            const transSource = this._pickSource(this.transitionAudio, this.transitionSources);
            if (transSource) {
              const resTrans = await fetch(transSource.src, { cache: 'no-cache' });
              if (resTrans.ok && loadId === this._loadId) {
                const blobTrans = await resTrans.blob();
                if (loadId === this._loadId) {
                  if (this._currentTransitionBlobUrl && typeof URL.revokeObjectURL === 'function') {
                    URL.revokeObjectURL(this._currentTransitionBlobUrl);
                  }
                  this._currentTransitionBlobUrl = URL.createObjectURL(blobTrans);
                  this._resetAudioElement(this.transitionAudio);
                  this.transitionAudio.src = this._currentTransitionBlobUrl;
                  if (typeof this.transitionAudio.load === 'function') this.transitionAudio.load();
                }
              }
            }
          }
        } catch (err) {
          if (this.onError) this.onError(err);
        }
      })();
    } else {
      // DOM source appending
      if (this.audio && this.sources.length > 0) {
        this._setupElementSources(this.audio, this.sources);
      }
      if (this.transitionAudio && this.transitionSources.length > 0) {
        this._setupElementSources(this.transitionAudio, this.transitionSources);
      } else if (this.transitionAudio) {
        this._resetAudioElement(this.transitionAudio);
      }
    }

    if (this.onTimeUpdate) {
      this.onTimeUpdate(0, this.getDuration(), 0);
    }
    if (this.onStateChange) {
      this.onStateChange(false);
    }
  }

  _pickSource(audioEl, sources) {
    if (!sources || sources.length === 0) return null;
    return sources.find(s => {
      if (audioEl && typeof audioEl.canPlayType === 'function') {
        const support = audioEl.canPlayType(s.type);
        return support === 'probably' || support === 'maybe';
      }
      return true;
    }) || sources[0];
  }

  _setupElementSources(audioEl, sources) {
    if (typeof audioEl.innerHTML !== 'undefined') {
      audioEl.innerHTML = '';
      sources.forEach(source => {
        const sourceEl = document.createElement('source');
        sourceEl.src = source.src;
        sourceEl.type = source.type;
        audioEl.appendChild(sourceEl);
      });
    } else {
      sources.forEach(source => {
        audioEl.appendChild(source);
      });
    }
    if (typeof audioEl.load === 'function') {
      audioEl.load();
    }
  }

  getSources() {
    return [...this.sources];
  }

  getTransitionSources() {
    return [...this.transitionSources];
  }

  getDuration() {
    return (this.mainDuration || 0) + (this.transitionDuration || 0);
  }

  getCurrentTime() {
    if (this.isTransitionActive) {
      const transCurrent = this.transitionAudio ? (this.transitionAudio.currentTime || 0) : 0;
      return (this.mainDuration || 0) + transCurrent;
    }
    return this.audio ? (this.audio.currentTime || 0) : 0;
  }

  isPlaying() {
    if (this.isTransitionActive) {
      if (!this.transitionAudio) return false;
      return !this.transitionAudio.paused && !this.transitionAudio.ended;
    }
    if (!this.audio) return false;
    return !this.audio.paused && !this.audio.ended;
  }

  async play() {
    if (this._loadPromise) {
      await this._loadPromise;
    }
    try {
      if (this.isTransitionActive) {
        if (this.transitionAudio) await this.transitionAudio.play();
      } else {
        if (this.audio) await this.audio.play();
      }
    } catch (err) {
      if (this.onError) this.onError(err);
    }
  }

  pause() {
    if (this.audio) this.audio.pause();
    if (this.transitionAudio) this.transitionAudio.pause();
    if (this.onStateChange) {
      this.onStateChange(false);
    }
  }

  togglePlay() {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(seconds) {
    const totalDuration = this.getDuration();
    const target = Math.max(0, Math.min(seconds, totalDuration));
    const wasPlaying = this.isPlaying();

    if (target < this.mainDuration || this.transitionDuration === 0) {
      // Target is in main audio
      if (this.isTransitionActive) {
        if (this.transitionAudio) {
          this.transitionAudio.pause();
          this.transitionAudio.currentTime = 0;
        }
        this.isTransitionActive = false;
      }
      if (this.audio) {
        this.audio.currentTime = target;
      }
      if (wasPlaying) {
        this.audio?.play()?.catch(() => {});
      }
    } else {
      // Target is in transition audio
      if (!this.isTransitionActive) {
        if (this.audio) {
          this.audio.pause();
        }
        this.isTransitionActive = true;
      }
      if (this.transitionAudio) {
        this.transitionAudio.currentTime = target - this.mainDuration;
      }
      if (wasPlaying) {
        this.transitionAudio?.play()?.catch(() => {});
      }
    }

    this._handleTimeUpdate();
  }

  skip(deltaSeconds) {
    const current = this.getCurrentTime();
    this.seek(current + deltaSeconds);
  }

  _handleMainLoadedMetadata() {
    if (this.audio) {
      this.mainDuration = this.audio.duration || 0;
    }
    this._handleTimeUpdate();
  }

  _handleTransitionLoadedMetadata() {
    if (this.transitionAudio) {
      this.transitionDuration = this.transitionAudio.duration || 0;
    }
    this._handleTimeUpdate();
  }

  _handleTimeUpdate() {
    if (!this.onTimeUpdate) return;
    const current = this.getCurrentTime();
    const duration = this.getDuration();
    const percent = duration > 0 ? (current / duration) * 100 : 0;
    this.onTimeUpdate(current, duration, percent);
  }

  _handleStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.isPlaying());
    }
  }

  _handleMainEnded() {
    if (this.onMainAudioEnded) {
      this.onMainAudioEnded();
    }

    // If there is an active transition with duration, handover seamlessly
    if (this.transitionAudio && this.transitionDuration > 0) {
      this.isTransitionActive = true;
      if (this.transitionAudio) {
        this.transitionAudio.currentTime = 0;
        this.transitionAudio.play().catch(e => {
          if (this.onError) this.onError(e);
        });
      }
    } else {
      this._handleEnded();
    }
  }

  _handleTransitionEnded() {
    this.isTransitionActive = false;
    this._handleEnded();
  }

  _handleEnded() {
    // Specification mandate: Audio stops cleanly and does NOT auto-advance.
    this.pause();
    if (this.onStateChange) {
      this.onStateChange(false);
    }
    if (this.onEnded) {
      this.onEnded();
    }
  }

  _handleTransitionError(e) {
    // Graceful degradation: discard transition and recalibrate to main duration
    this.transitionDuration = 0;
    if (this.isTransitionActive) {
      this.isTransitionActive = false;
      this._handleEnded();
    } else {
      this._handleTimeUpdate();
    }
  }

  _handleError(e) {
    if (this.onError) {
      this.onError(e);
    }
  }

  destroy() {
    this.pause();
    if (this._currentBlobUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(this._currentBlobUrl);
      this._currentBlobUrl = null;
    }
    if (this._currentTransitionBlobUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(this._currentTransitionBlobUrl);
      this._currentTransitionBlobUrl = null;
    }
    this._detachMainListeners();
    this._detachTransitionListeners();
  }
}
