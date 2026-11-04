/**
 * Authentic Arabic Daf (دف - Duff / ১ মুখ খোলা ঢোল) Acoustic Percussion Synthesizer for Safar.
 * Produces pure acoustic Daf drum strikes (DUM & TAK) with zero melodic or instrumental background music.
 * Used for both Driver and Passenger notification alerts.
 * Features instant hard-cut stopping with master alarm gain isolation to prevent any audio leakage on Accept.
 */

class SoundEffects {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private alarmGain: GainNode | null = null;
  private activeInterval: any = null;
  private activeSources: (AudioNode & { stop?: (when?: number) => void })[] = [];
  private isAlarmRinging = false;
  private currentVoiceAudio: HTMLAudioElement | null = null;
  private pauseTimeout: any = null;
  private voiceAlertBuffer: AudioBuffer | null = null;
  private isPreloadingVoice = false;
  private keepAliveInterval: any = null;

  /**
   * Pre-fetch and decode the authentic Bengali Male voice alert into memory.
   * Ensures 0ms latency and eliminates any browser network or autoplay delay.
   */
  preloadVoiceAlert() {
    if (typeof window === 'undefined' || this.voiceAlertBuffer || this.isPreloadingVoice) return;
    this.isPreloadingVoice = true;
    fetch('/driver_voice_male.mp3')
      .then(res => res.arrayBuffer())
      .then(arrayBuffer => {
        const ctx = this.getContext();
        if (ctx) {
          return ctx.decodeAudioData(arrayBuffer).then(decoded => {
            this.voiceAlertBuffer = decoded;
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        this.isPreloadingVoice = false;
      });
  }

  /**
   * Unlocks AudioContext and HTML5 audio element on any user interaction (tap, touch, click).
   * This completely bypasses mobile browser autoplay restrictions.
   */
  unlockAudio() {
    if (typeof window === 'undefined') return;
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    this.preloadVoiceAlert();
    try {
      const dummy = new Audio('/driver_voice_male.mp3');
      dummy.volume = 0.001;
      const p = dummy.play();
      if (p !== undefined) {
        p.then(() => {
          dummy.pause();
          dummy.currentTime = 0;
        }).catch(() => {});
      }
    } catch {}
  }

  /**
   * Keeps active background audio session on Android Chrome and iOS Safari while in Driver Mode.
   * Mobile OS will NEVER suspend Firestore connections or tab execution while audio session is active.
   */
  startDriverBackgroundKeepAlive() {
    if (typeof window === 'undefined' || this.keepAliveInterval) return;
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    this.keepAliveInterval = setInterval(() => {
      try {
        if (!this.ctx || this.ctx.state === 'closed') return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(25, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.1);
      } catch {}
    }, 12000);
  }

  stopDriverBackgroundKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        try {
          // Dynamic compression for high-punch acoustic drum transients without clipping
          this.compressor = this.ctx.createDynamicsCompressor();
          this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
          this.compressor.knee.setValueAtTime(4, this.ctx.currentTime);
          this.compressor.ratio.setValueAtTime(16, this.ctx.currentTime);
          this.compressor.attack.setValueAtTime(0.001, this.ctx.currentTime);
          this.compressor.release.setValueAtTime(0.08, this.ctx.currentTime);

          // Dedicated alarm gain for instant 0ms hard mute
          this.alarmGain = this.ctx.createGain();
          this.alarmGain.gain.setValueAtTime(1.8, this.ctx.currentTime);

          // Master output gain with 1.8x loudness boost
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(1.8, this.ctx.currentTime);

          this.compressor.connect(this.alarmGain);
          this.alarmGain.connect(this.masterGain);
          this.masterGain.connect(this.ctx.destination);
        } catch {
          // Fallback
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getDestinationNode(ctx: AudioContext): AudioNode {
    return this.compressor || ctx.destination;
  }

  /**
   * STOP ALL ALARMS IMMEDIATELY (Hard mute on 1st click).
   * Instantly stops intervals, speech synthesis, mutes the alarm gain bus, kills active oscillators, and clears vibration.
   */
  stopAllAlarms() {
    this.isAlarmRinging = false;

    // 0. Cancel speech synthesis and audio voice playback immediately
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}

    if (this.currentVoiceAudio) {
      try {
        this.currentVoiceAudio.pause();
        this.currentVoiceAudio.currentTime = 0;
      } catch {}
      this.currentVoiceAudio = null;
    }

    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }

    // 1. Clear any active repeating interval immediately
    if (this.activeInterval) {
      clearInterval(this.activeInterval);
      this.activeInterval = null;
    }

    // 2. Immediately cut the alarm gain bus to 0 to kill any in-flight or scheduled drum hits
    if (this.alarmGain && this.ctx) {
      try {
        this.alarmGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.alarmGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {}
    }

    // 3. Stop every registered audio source immediately
    try {
      this.activeSources.forEach(s => {
        try {
          if (typeof s.stop === 'function') s.stop(0);
        } catch {}
      });
      this.activeSources = [];
    } catch {}

    // 4. Cancel mobile vibration immediately
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
        navigator.vibrate(0);
      }
    } catch {}
  }

  /**
   * Mobile haptic vibration helper.
   */
  private triggerVibration(pattern: number[]) {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {}
  }

  /**
   * Generate an acoustic noise buffer for drum transient skin/rim strike.
   */
  private createNoiseBuffer(ctx: AudioContext, duration = 0.08): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Synthesize an authentic acoustic Daf "DUM" (দুম - deep open bass stroke near center).
   * Features genuine animal-skin membrane resonance and decaying low thud in wooden frame.
   */
  private playDafDum(ctx: AudioContext, targetNode: AudioNode, startTime: number, volume = 1.0) {
    // 1. Skin Impact Noise Transient (Attack punch)
    try {
      const noiseBuffer = this.createNoiseBuffer(ctx, 0.06);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(280, startTime);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.9 * volume, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(targetNode);
      noiseSource.start(startTime);
      this.activeSources.push(noiseSource);
    } catch {}

    // 2. Resonant Membrane Body (Fundamental deep pitch drop 135Hz -> 72Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, startTime);
    osc.frequency.exponentialRampToValueAtTime(72, startTime + 0.28);

    gain.gain.setValueAtTime(1.0 * volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.005, startTime + 0.32);

    // Resonant wooden shell peaking filter
    const frameFilter = ctx.createBiquadFilter();
    frameFilter.type = 'peaking';
    frameFilter.frequency.setValueAtTime(95, startTime);
    frameFilter.Q.setValueAtTime(3.5, startTime);
    frameFilter.gain.setValueAtTime(6, startTime);

    osc.connect(frameFilter);
    frameFilter.connect(gain);
    gain.connect(targetNode);

    osc.start(startTime);
    osc.stop(startTime + 0.33);
    this.activeSources.push(osc);
  }

  /**
   * Synthesize an authentic acoustic Daf "TAK" (তাক - sharp outer frame/rim edge snap).
   * Crisp, loud skin-edge slap with short acoustic wooden ring.
   */
  private playDafTak(ctx: AudioContext, targetNode: AudioNode, startTime: number, volume = 0.95) {
    // 1. Sharp rim snap noise burst (high bandpass)
    try {
      const noiseBuffer = this.createNoiseBuffer(ctx, 0.05);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1600, startTime);
      bandpass.Q.setValueAtTime(2.2, startTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.95 * volume, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(targetNode);
      noiseSource.start(startTime);
      this.activeSources.push(noiseSource);
    } catch {}

    // 2. High-pitch frame ring (triangle wave at 540Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, startTime);
    osc.frequency.exponentialRampToValueAtTime(380, startTime + 0.09);

    gain.gain.setValueAtTime(0.9 * volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.005, startTime + 0.1);

    osc.connect(gain);
    gain.connect(targetNode);

    osc.start(startTime);
    osc.stop(startTime + 0.11);
    this.activeSources.push(osc);
  }

  /**
   * Play an authentic Arabic Daf drum rhythm phrase:
   * Pattern: DUM ... TAK ... TAK ... DUM ... TAK!
   * Strictly acoustic frame drum percussion (১ মুখ খোলা ঢোল), zero instrumental music.
   */
  playArabicDafAlarm() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      // Re-enable alarm gain at full highest loud level (1.8x)
      if (this.alarmGain) {
        this.alarmGain.gain.cancelScheduledValues(ctx.currentTime);
        this.alarmGain.gain.setValueAtTime(1.8, ctx.currentTime);
      }

      this.isAlarmRinging = true;
      const now = ctx.currentTime;
      const targetNode = this.getDestinationNode(ctx);

      // Mobile haptic vibration sync
      this.triggerVibration([350, 120, 150, 100, 350]);

      // Rhythmic strokes: DUM (0.00s) -> TAK (0.22s) -> TAK (0.38s) -> DUM (0.58s) -> TAK (0.80s)
      this.playDafDum(ctx, targetNode, now, 1.0);
      this.playDafTak(ctx, targetNode, now + 0.22, 0.95);
      this.playDafTak(ctx, targetNode, now + 0.38, 0.9);
      this.playDafDum(ctx, targetNode, now + 0.58, 1.0);
      this.playDafTak(ctx, targetNode, now + 0.80, 0.98);
    } catch {
      // Audio playback fails silently if restricted
    }
  }

  /**
   * Loud, clear, dignified Bangladeshi Bengali MALE voice announcement for drivers:
   * "সফর অ্যাপের সম্মানিত চালক, আপনার একটি নতুন যাত্রার অনুরোধ এসেছে।"
   * Strictly uses authentic male voice studio recording '/driver_voice_male.mp3'.
   * Followed by a strict 1.0 second pause of silence before the loud Arabic Daf drum rhythm alarm begins!
   * Zero robotic tone and zero female voice!
   */
  speakDriverVoiceAlert(onEnd?: () => void): boolean {
    if (typeof window === 'undefined') {
      if (onEnd) onEnd();
      return false;
    }

    try {
      this.stopVoiceAndPause();

      // Trigger loud clear speech haptic vibration
      this.triggerVibration([500, 200, 500, 200, 500]);

      let hasFinished = false;
      const finishAndPause = () => {
        if (hasFinished) return;
        hasFinished = true;
        this.currentVoiceAudio = null;

        // Distinct rhythmic vibration pulse during the 1.0 second pause
        this.triggerVibration([300, 200, 300]);

        // Exactly 1.0 second (1000ms) pause after speech completes before Duff drum rings
        this.pauseTimeout = setTimeout(() => {
          this.pauseTimeout = null;
          if (onEnd) onEnd();
        }, 1000);
      };

      // Safety timeout: 5.5s (voice duration is ~4.68s) to guarantee 1s pause + Duff alarm triggers
      const safetyTimer = setTimeout(() => {
        if (!hasFinished) {
          finishAndPause();
        }
      }, 5500);

      const ctx = this.getContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        if (this.alarmGain) {
          this.alarmGain.gain.cancelScheduledValues(ctx.currentTime);
          this.alarmGain.gain.setValueAtTime(1.8, ctx.currentTime);
        }
      }

      // 1. Play via HTML5 Audio element with loud broadcast volume (most compatible across mobile Android & iOS)
      const audio = new Audio('/driver_voice_male.mp3');
      audio.volume = 1.0;
      this.currentVoiceAudio = audio;

      audio.onended = () => {
        clearTimeout(safetyTimer);
        finishAndPause();
      };
      audio.onerror = () => {
        // Fallback to Web Audio if HTML5 audio fails
        if (ctx && this.voiceAlertBuffer) {
          try {
            const source = ctx.createBufferSource();
            source.buffer = this.voiceAlertBuffer;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(1.8, ctx.currentTime);
            source.connect(gain);
            gain.connect(this.masterGain || ctx.destination);
            source.onended = () => {
              clearTimeout(safetyTimer);
              finishAndPause();
            };
            source.start(0);
            this.activeSources.push(source);
            return;
          } catch (e) {}
        }
        clearTimeout(safetyTimer);
        finishAndPause();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy blocks HTML5 audio element, try Web Audio buffer
          if (ctx && this.voiceAlertBuffer) {
            try {
              const source = ctx.createBufferSource();
              source.buffer = this.voiceAlertBuffer;
              const gain = ctx.createGain();
              gain.gain.setValueAtTime(1.8, ctx.currentTime);
              source.connect(gain);
              gain.connect(this.masterGain || ctx.destination);
              source.onended = () => {
                clearTimeout(safetyTimer);
                finishAndPause();
              };
              source.start(0);
              this.activeSources.push(source);
              return;
            } catch (e) {}
          }
          // Otherwise safetyTimer guarantees progression
        });
      }

      return true;
    } catch {
      if (onEnd) onEnd();
      return false;
    }
  }

  private stopVoiceAndPause() {
    if (this.currentVoiceAudio) {
      try {
        this.currentVoiceAudio.pause();
        this.currentVoiceAudio.currentTime = 0;
      } catch {}
      this.currentVoiceAudio = null;
    }

    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
  }

  /**
   * Driver incoming ride request alert: Pure Arabic Daf drum rhythm.
   */
  playIncomingRideAlert() {
    this.playArabicDafAlarm();
  }

  /**
   * Gentle, brief confirmation sound when passenger gets matched with driver.
   * Single soft double-tap (200ms) only, NOT the repeating Daf alarm!
   */
  playDriverMatchedChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (this.alarmGain) {
        this.alarmGain.gain.setValueAtTime(1.0, ctx.currentTime);
      }
      const now = ctx.currentTime;
      const targetNode = this.getDestinationNode(ctx);
      this.playDafDum(ctx, targetNode, now, 0.8);
      this.playDafTak(ctx, targetNode, now + 0.16, 0.7);
    } catch {}
  }

  /**
   * Trip completed alert: Pure acoustic double Daf cadence.
   */
  playTripCompletedFanfare() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (this.alarmGain) {
        this.alarmGain.gain.setValueAtTime(1.0, ctx.currentTime);
      }
      const now = ctx.currentTime;
      const targetNode = this.getDestinationNode(ctx);

      this.triggerVibration([200, 100, 200, 100, 350]);

      // Double celebratory Daf roll
      this.playDafDum(ctx, targetNode, now, 1.0);
      this.playDafTak(ctx, targetNode, now + 0.18, 0.95);
      this.playDafDum(ctx, targetNode, now + 0.36, 1.0);
      this.playDafTak(ctx, targetNode, now + 0.52, 1.0);
      this.playDafDum(ctx, targetNode, now + 0.72, 1.0);
    } catch {}
  }
}

export const sounds = new SoundEffects();
