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

export class AudioPlayer {
  constructor(options = {}) {
    this.audio = options.audioElement || (typeof Audio !== 'undefined' ? new Audio() : null);
    this.sources = [];
    this.onTimeUpdate = null;
    this.onStateChange = null;
    this.onEnded = null;
    this.onNextStepRequested = null;
    this.onError = null;

    this._boundTimeUpdate = this._handleTimeUpdate.bind(this);
    this._boundStateChange = this._handleStateChange.bind(this);
    this._boundEnded = this._handleEnded.bind(this);
    this._boundError = this._handleError.bind(this);

    if (this.audio) {
      this._attachListeners();
    }
  }

  _attachListeners() {
    this.audio.addEventListener('timeupdate', this._boundTimeUpdate);
    this.audio.addEventListener('loadedmetadata', this._boundTimeUpdate);
    this.audio.addEventListener('durationchange', this._boundTimeUpdate);
    this.audio.addEventListener('play', this._boundStateChange);
    this.audio.addEventListener('pause', this._boundStateChange);
    this.audio.addEventListener('emptied', this._boundStateChange);
    this.audio.addEventListener('ended', this._boundEnded);
    this.audio.addEventListener('error', this._boundError);
  }

  _detachListeners() {
    if (!this.audio) return;
    this.audio.removeEventListener('timeupdate', this._boundTimeUpdate);
    this.audio.removeEventListener('loadedmetadata', this._boundTimeUpdate);
    this.audio.removeEventListener('durationchange', this._boundTimeUpdate);
    this.audio.removeEventListener('play', this._boundStateChange);
    this.audio.removeEventListener('pause', this._boundStateChange);
    this.audio.removeEventListener('emptied', this._boundStateChange);
    this.audio.removeEventListener('ended', this._boundEnded);
    this.audio.removeEventListener('error', this._boundError);
  }

  loadStep(audioConfig, basePath = '') {
    this.pause();
    this.sources = [];

    if (!audioConfig) {
      if (this.audio) {
        if (typeof this.audio.innerHTML !== 'undefined') {
          this.audio.innerHTML = '';
        }
        if (typeof this.audio.load === 'function') {
          this.audio.load();
        }
      }
      if (this.onTimeUpdate) {
        this.onTimeUpdate(0, 0, 0);
      }
      if (this.onStateChange) {
        this.onStateChange(false);
      }
      return;
    }

    // Prefer WebM (Opus) as primary source
    if (audioConfig.webm) {
      this.sources.push({
        src: resolveAssetPath(audioConfig.webm, basePath),
        type: 'audio/webm; codecs=opus'
      });
    }

    // Fallback to M4A (AAC)
    if (audioConfig.m4a) {
      this.sources.push({
        src: resolveAssetPath(audioConfig.m4a, basePath),
        type: 'audio/mp4'
      });
    }

    // Also support mp3 if provided
    if (audioConfig.mp3) {
      this.sources.push({
        src: resolveAssetPath(audioConfig.mp3, basePath),
        type: 'audio/mpeg'
      });
    }

    if (!this.audio) return;

    // In a real browser DOM, clear and append <source> tags
    if (typeof this.audio.innerHTML !== 'undefined') {
      this.audio.innerHTML = '';
      this.sources.forEach(source => {
        const sourceEl = document.createElement('source');
        sourceEl.src = source.src;
        sourceEl.type = source.type;
        this.audio.appendChild(sourceEl);
      });
    } else {
      // In mock/test environments
      this.sources.forEach(source => {
        this.audio.appendChild(source);
      });
    }

    if (typeof this.audio.load === 'function') {
      this.audio.load();
    }

    if (this.onTimeUpdate) {
      this.onTimeUpdate(0, this.audio.duration || 0, 0);
    }

    if (this.onStateChange) {
      this.onStateChange(false);
    }
  }

  getSources() {
    return [...this.sources];
  }

  isPlaying() {
    if (!this.audio) return false;
    return !this.audio.paused && !this.audio.ended;
  }

  async play() {
    if (!this.audio) return;
    try {
      await this.audio.play();
    } catch (err) {
      if (this.onError) this.onError(err);
    }
  }

  pause() {
    if (!this.audio) return;
    this.audio.pause();
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
    if (!this.audio) return;
    const duration = this.audio.duration || 0;
    const target = Math.max(0, Math.min(seconds, duration));
    this.audio.currentTime = target;
  }

  skip(deltaSeconds) {
    if (!this.audio) return;
    const current = this.audio.currentTime || 0;
    const duration = this.audio.duration || 0;
    const target = Math.max(0, Math.min(current + deltaSeconds, duration));
    this.audio.currentTime = target;
  }

  _handleTimeUpdate() {
    if (!this.audio || !this.onTimeUpdate) return;
    const current = this.audio.currentTime || 0;
    const duration = this.audio.duration || 0;
    const percent = duration > 0 ? (current / duration) * 100 : 0;
    this.onTimeUpdate(current, duration, percent);
  }

  _handleStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.isPlaying());
    }
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

  _handleError(e) {
    if (this.onError) {
      this.onError(e);
    }
  }

  destroy() {
    this.pause();
    this._detachListeners();
  }
}
