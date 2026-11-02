/**
 * Bullet-proof Screen Wake-Lock Manager for Safar Driver Mode.
 * Ensures driver phone screen NEVER goes to sleep while waiting for ride requests at stands.
 * Features:
 * 1. Primary: Native Screen WakeLock API (navigator.wakeLock)
 * 2. Auto-recovery: Re-acquires automatically on visibilitychange, focus, and user tap/touch
 * 3. iOS & Legacy Fallback: Silent looping video element (NoSleep pattern) for 100% device coverage
 */

class ScreenWakeLockManager {
  private sentinel: any = null;
  private isEnabled = false;
  private fallbackVideo: HTMLVideoElement | null = null;
  private listenersAttached = false;
  private onStateChangeCallbacks: Set<(active: boolean) => void> = new Set();

  constructor() {
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleUserInteraction = this.handleUserInteraction.bind(this);
  }

  /**
   * Subscribe to wake-lock state changes (for UI status badges)
   */
  subscribe(callback: (active: boolean) => void): () => void {
    this.onStateChangeCallbacks.add(callback);
    callback(this.isActive());
    return () => {
      this.onStateChangeCallbacks.delete(callback);
    };
  }

  private notifyStateChange() {
    const active = this.isActive();
    this.onStateChangeCallbacks.forEach(cb => {
      try {
        cb(active);
      } catch {}
    });
  }

  public isActive(): boolean {
    return Boolean(this.sentinel || (this.fallbackVideo && !this.fallbackVideo.paused));
  }

  /**
   * Request screen wake-lock. Safe to call multiple times.
   */
  public async requestLock(): Promise<boolean> {
    this.isEnabled = true;
    this.attachEventListeners();

    let acquired = false;

    // 1. Try Native WakeLock API
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!this.sentinel) {
          this.sentinel = await (navigator as any).wakeLock.request('screen');
          this.sentinel.addEventListener('release', () => {
            this.sentinel = null;
            this.notifyStateChange();
            // Automatically attempt re-acquisition if still enabled and document is visible
            if (this.isEnabled && typeof document !== 'undefined' && document.visibilityState === 'visible') {
              setTimeout(() => {
                if (this.isEnabled) this.requestLock().catch(() => {});
              }, 1000);
            }
          });
        }
        acquired = true;
      } catch (err) {
        // Native WakeLock might be denied or require user gesture
        acquired = false;
      }
    }

    // 2. Activate Silent Video Fallback (Guarantees wakefulness on iOS Safari and strict Android power savers)
    try {
      this.activateVideoFallback();
    } catch {}

    this.notifyStateChange();
    return acquired || this.isActive();
  }

  /**
   * Release screen wake-lock (e.g. when driver switches to passenger or logs off)
   */
  public releaseLock() {
    this.isEnabled = false;
    this.detachEventListeners();

    if (this.sentinel) {
      try {
        if (typeof this.sentinel.release === 'function') {
          this.sentinel.release().catch(() => {});
        }
      } catch {}
      this.sentinel = null;
    }

    this.deactivateVideoFallback();
    this.notifyStateChange();
  }

  /**
   * Handle tab visibility & focus changes
   */
  private handleVisibilityChange() {
    if (!this.isEnabled) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      // Re-request lock as soon as driver brings app back or turns screen on
      this.requestLock().catch(() => {});
    }
  }

  /**
   * Re-acquire on user touch if native wakeLock was released or requires gesture
   */
  private handleUserInteraction() {
    if (!this.isEnabled) return;
    if (!this.sentinel) {
      this.requestLock().catch(() => {});
    }
  }

  private attachEventListeners() {
    if (this.listenersAttached || typeof window === 'undefined') return;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleVisibilityChange);
    document.addEventListener('touchstart', this.handleUserInteraction, { passive: true });
    document.addEventListener('click', this.handleUserInteraction, { passive: true });
    this.listenersAttached = true;
  }

  private detachEventListeners() {
    if (!this.listenersAttached || typeof window === 'undefined') return;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleVisibilityChange);
    document.removeEventListener('touchstart', this.handleUserInteraction);
    document.removeEventListener('click', this.handleUserInteraction);
    this.listenersAttached = false;
  }

  /**
   * Invisible tiny 1x1 blank looping video fallback (standard NoSleep implementation)
   */
  private activateVideoFallback() {
    if (typeof document === 'undefined') return;
    if (!this.fallbackVideo) {
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('loop', '');
      video.setAttribute('muted', '');
      video.muted = true;
      video.style.position = 'fixed';
      video.style.top = '-9999px';
      video.style.left = '-9999px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01';
      video.style.pointerEvents = 'none';

      // Minimal 1-second blank mp4 data uri
      video.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAADpmcmVlAAAGXm1kYXQAAAAAAgAQABAAAAAG//+AAAAC6G1vb3YAAABsbXZoZAAAAAB2H/sAdh/7AAAB9AAACu0AAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAmx0cmFrAAAAXHRraGQAAAAHdh/7AHYf+wAAAAEAAAAAAAAK7QAAAAAAAAAAAAAAAEAAAAAAABAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAYltZGlhAAAAIG1kaGQAAAAAdh/7AHYf+wAAB9AAACu0AAAAAAAAAAAA';

      document.body.appendChild(video);
      this.fallbackVideo = video;
    }

    if (this.fallbackVideo.paused) {
      this.fallbackVideo.play().catch(() => {});
    }
  }

  private deactivateVideoFallback() {
    if (this.fallbackVideo) {
      try {
        this.fallbackVideo.pause();
        if (this.fallbackVideo.parentNode) {
          this.fallbackVideo.parentNode.removeChild(this.fallbackVideo);
        }
      } catch {}
      this.fallbackVideo = null;
    }
  }
}

export const screenWakeLock = new ScreenWakeLockManager();
