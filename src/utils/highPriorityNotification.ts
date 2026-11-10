/**
 * High-Priority Mobile Push/Local Notification & Haptic Vibration Engine for Safar Drivers.
 * Ensures that even when the driver's phone screen is locked/off or the app is minimized in the background,
 * high-priority notifications alert the driver with distinct vibration and direct actions.
 */

class HighPriorityNotificationEngine {
  private vibrationInterval: any = null;
  private activeNotificationTag = 'safar-driver-incoming-ride';
  private isVibrating = false;

  private canVibrate(): boolean {
    return typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function';
  }

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

    // Request permission if default
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {}
    }

    // 1. Start continuous repeating haptic vibration (crucial when screen is off)
    this.startRepeatingVibration();

    const title = '🚖 নতুন যাত্রার অনুরোধ এসেছে! (সফর গফরগাঁও)';
    const body = `📍 পিকআপ: ${request.pickupPoint}\n🎯 গন্তব্য: ${request.destination}\n💰 নির্ধারিত ভাড়া: ৳${request.estFare} (দূরত্ব: ${request.distanceKm} কিমি)`;
    const options: any = {
      body,
      icon: '/pwa-192x192.png',
      badge: '/notification-badge.png',
      tag: this.activeNotificationTag,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [600, 200, 600, 200, 800, 300, 600],
      data: {
        requestId: request.id,
        url: `/?openDriverTrip=${request.id}&role=driver`
      },
      actions: [
        { action: 'accept', title: '✅ গ্রহণ করুন (ACCEPT)' },
        { action: 'open', title: '📲 অ্যাপ খুলুন' }
      ]
    };

    // 2. Try Service Worker showNotification first with instantaneous check & fallback
    if ('serviceWorker' in navigator) {
      try {
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          const swReadyPromise = navigator.serviceWorker.ready;
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 500));
          registration = (await Promise.race([swReadyPromise, timeoutPromise])) as any;
        }
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
          icon: '/pwa-192x192.png',
          badge: '/notification-badge.png',
          tag: this.activeNotificationTag,
          requireInteraction: true,
          silent: false
        } as any);
        notif.onclick = () => {
          try {
            window.focus();
          } catch {}
          notif.close();
          try {
            window.dispatchEvent(
              new CustomEvent('safar-notification-action', {
                detail: { action: 'open', requestId: request.id }
              })
            );
          } catch {
            window.location.href = `/?openDriverTrip=${request.id}&role=driver&action=open`;
          }
        };
      }
    } catch {}
  }

  /**
   * Continuous repeating vibration while incoming ride is awaiting driver response
   */
  private startRepeatingVibration() {
    this.stopRepeatingVibration();
    if (!this.canVibrate()) return;

    const pattern = [500, 200, 500, 200, 700];
    try {
      navigator.vibrate(pattern);
      this.isVibrating = true;
    } catch {}

    this.vibrationInterval = setInterval(() => {
      try {
        if (this.canVibrate()) {
          navigator.vibrate(pattern);
        }
      } catch {}
    }, 2400);
  }

  private stopRepeatingVibration() {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    if (!this.isVibrating) return;
    this.isVibrating = false;
    if (this.canVibrate()) {
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
