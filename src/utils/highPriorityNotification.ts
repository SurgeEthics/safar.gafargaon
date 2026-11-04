/**
 * High-Priority Mobile Push/Local Notification & Haptic Vibration Engine for Safar Drivers.
 * Ensures that even when the driver's phone screen is locked/off or the app is minimized in the background,
 * high-priority notifications alert the driver with continuous 25-second vibration and direct actions.
 */

class HighPriorityNotificationEngine {
  private vibrationInterval: any = null;
  private activeNotificationTag = 'safar-driver-incoming-ride';

  /**
   * Request system notification permission with user gesture
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      if (Notification.permission === 'granted') {
        return 'granted';
      }
      return await Notification.requestPermission();
    } catch {
      return Notification.permission || 'denied';
    }
  }

  /**
   * Full 25-second continuous vibration pattern (34 cycles of 500ms vibrate + 250ms gap = 25,500ms)
   */
  private get25SecondVibrationPattern(): number[] {
    const pattern: number[] = [];
    for (let i = 0; i < 34; i++) {
      pattern.push(500, 250);
    }
    return pattern;
  }

  /**
   * Trigger high-priority driver ride alert notification (Service Worker & Local)
   */
  async showIncomingRideAlert(request: {
    id: string;
    pickupPoint: string;
    destination: string;
    estFare: number;
    distanceKm: number;
    passengerName?: string;
  }) {
    if (typeof window === 'undefined') return;

    // 1. Start continuous repeating haptic vibration for the full 25 seconds
    this.startRepeatingVibration();

    const title = '🚖 নতুন যাত্রার অনুরোধ এসেছে! (সফর গফরগাঁও)';
    const body = `📍 পিকআপ: ${request.pickupPoint}\n🎯 গন্তব্য: ${request.destination}\n💰 নির্ধারিত ভাড়া: ৳${request.estFare} (দূরত্ব: ${request.distanceKm} কিমি)`;
    const vibrate25s = this.get25SecondVibrationPattern();

    const options: any = {
      body,
      icon: '/safar-logo.png',
      badge: '/safar-logo.png',
      image: '/safar-logo.png',
      tag: this.activeNotificationTag,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: vibrate25s,
      data: {
        requestId: request.id,
        url: `/?openDriverTrip=${request.id}&role=driver`
      },
      actions: [
        { action: 'accept', title: '✅ গ্রহণ করুন (ACCEPT)' },
        { action: 'open', title: '📲 অ্যাপ খুলুন' }
      ]
    };

    // 2. Try Service Worker showNotification first (Standard for Android Chrome & PWA)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, options);
          return;
        }
      } catch (err) {
        // Fallback to standard window Notification
      }
    }

    // 3. Fallback: Standard Window Notification
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification(title, {
          body,
          icon: '/safar-logo.png',
          badge: '/safar-logo.png',
          tag: this.activeNotificationTag,
          requireInteraction: true
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
          window.location.href = `/?openDriverTrip=${request.id}&role=driver`;
        };
      }
    } catch {}
  }

  /**
   * Continuous repeating vibration while incoming ride is awaiting driver response
   */
  startRepeatingVibration() {
    this.stopRepeatingVibration();
    if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

    const pattern = [600, 200, 500, 200];
    try {
      navigator.vibrate(pattern);
    } catch {}

    this.vibrationInterval = setInterval(() => {
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate(pattern);
        }
      } catch {}
    }, 1500);
  }

  stopRepeatingVibration() {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }

  /**
   * Clear notifications and vibration when driver accepts or declines
   */
  async clearIncomingRideAlert() {
    this.stopRepeatingVibration();

    // Close Service Worker notifications
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.getNotifications === 'function') {
          const notifications = await registration.getNotifications({ tag: this.activeNotificationTag });
          notifications.forEach(n => n.close());
        }
      } catch {}
    }
  }
}

export const highPriorityNotifications = new HighPriorityNotificationEngine();
