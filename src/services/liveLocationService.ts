import { validateSafeExternalUrl, isValidBdCoordinate, sanitizePlainText } from '../utils/security';

export interface LiveDriverLocation {
  id: string;
  name: string;
  category: string;
  vehicleModel?: string;
  plateNumber?: string;
  standName?: string;
  lat: number;
  lng: number;
  speed?: number;
  rating?: number;
  isOnline?: boolean;
  isLiveEdge?: boolean;
  updatedAt?: string;
}

export interface LivePassengerLocation {
  id: string;
  pickupPoint: string;
  destination?: string;
  lat: number;
  lng: number;
  status?: string;
  updatedAt?: string;
}

export interface LiveServerState {
  drivers: LiveDriverLocation[];
  passengers: LivePassengerLocation[];
  status: 'connected' | 'connecting' | 'disconnected';
  latencyMs: number;
  serverType: 'cloudflare' | 'local';
}

type Listener = (state: LiveServerState) => void;

class LiveLocationService {
  private customServerUrl: string = '';
  private state: LiveServerState = {
    drivers: [],
    passengers: [],
    status: 'connected',
    latencyMs: 35,
    serverType: 'local',
  };
  private listeners: Set<Listener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('safar_custom_worker_url') || '';
        if (stored) {
          const check = validateSafeExternalUrl(stored);
          if (check.ok && check.normalizedUrl) {
            this.customServerUrl = check.normalizedUrl;
            this.state.serverType = 'cloudflare';
          } else {
            localStorage.removeItem('safar_custom_worker_url');
          }
        }
      } catch {
        // ignore storage errors
      }
    }
  }

  public getCustomServerUrl(): string {
    return this.customServerUrl;
  }

  public setCustomServerUrl(url: string): { ok: boolean; error?: string } {
    const trimmed = url.trim();
    if (!trimmed) {
      this.customServerUrl = '';
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('safar_custom_worker_url');
        } catch {}
      }
      this.state.serverType = 'local';
      this.notify();
      return { ok: true };
    }

    const check = validateSafeExternalUrl(trimmed);
    if (!check.ok || !check.normalizedUrl) {
      return { ok: false, error: check.error || 'অবৈধ URL' };
    }

    this.customServerUrl = check.normalizedUrl;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('safar_custom_worker_url', this.customServerUrl);
      } catch {}
    }
    this.state.serverType = 'cloudflare';
    this.notify();
    return { ok: true };
  }

  public syncDriversFromCatalog(catalogDrivers: any[]): void {
    if (!catalogDrivers) return;

    const liveDrivers: LiveDriverLocation[] = catalogDrivers
      .filter((d: any) => d.isOnline !== false)
      .map((d: any) => ({
        id: sanitizePlainText(d.id, 128),
        name: sanitizePlainText(d.name || d.nameBn, 80) || 'চালক',
        category: sanitizePlainText(d.category, 40) || 'cng',
        vehicleModel: sanitizePlainText(d.vehicleModel || d.vehicleName, 80),
        plateNumber: sanitizePlainText(d.plateNumber || d.licensePlate, 40),
        standName: sanitizePlainText(d.standName, 100),
        lat: isValidBdCoordinate(d.lat, d.lng) ? d.lat : 24.4536,
        lng: isValidBdCoordinate(d.lat, d.lng) ? d.lng : 90.5479,
        speed: d.approxSpeedKmh || 25,
        rating: d.rating || 4.9,
        isOnline: d.isOnline !== false,
        isLiveEdge: true,
        updatedAt: new Date().toISOString(),
      }));

    const current = this.state.drivers;
    if (current.length === liveDrivers.length) {
      const hasMeaningfulChange = liveDrivers.some((d, idx) => {
        const cur = current[idx];
        if (!cur) return true;
        return (
          cur.id !== d.id ||
          cur.name !== d.name ||
          cur.category !== d.category ||
          cur.vehicleModel !== d.vehicleModel ||
          cur.standName !== d.standName ||
          cur.isOnline !== d.isOnline ||
          Math.abs(cur.lat - d.lat) > 0.0001 ||
          Math.abs(cur.lng - d.lng) > 0.0001
        );
      });
      if (!hasMeaningfulChange) return;
    }

    this.state.drivers = liveDrivers;
    this.state.status = 'connected';
    this.notify();
  }

  public registerPassenger(passenger: LivePassengerLocation & { name?: string; phone?: string }): void {
    const cleanLat = isValidBdCoordinate(passenger.lat, passenger.lng) ? passenger.lat : 24.4335;
    const cleanLng = isValidBdCoordinate(passenger.lat, passenger.lng) ? passenger.lng : 90.5512;
    const sanitized: LivePassengerLocation = {
      id: sanitizePlainText(passenger.id, 128) || 'passenger-current',
      pickupPoint: sanitizePlainText(passenger.pickupPoint, 120),
      destination: sanitizePlainText(passenger.destination, 120),
      lat: cleanLat,
      lng: cleanLng,
      status: passenger.status,
      updatedAt: passenger.updatedAt || new Date().toISOString(),
    };

    const existingIdx = this.state.passengers.findIndex(
      (p: LivePassengerLocation) => p.id === sanitized.id
    );
    if (existingIdx >= 0) {
      const existing = this.state.passengers[existingIdx];
      if (
        existing.pickupPoint === sanitized.pickupPoint &&
        existing.destination === sanitized.destination &&
        existing.status === sanitized.status &&
        Math.abs(existing.lat - sanitized.lat) < 0.0001 &&
        Math.abs(existing.lng - sanitized.lng) < 0.0001
      ) {
        return;
      }
      this.state.passengers[existingIdx] = sanitized;
    } else {
      this.state.passengers.push(sanitized);
    }
    this.notify();
  }

  public unregisterPassenger(id: string): void {
    const prevLen = this.state.passengers.length;
    this.state.passengers = this.state.passengers.filter((p: LivePassengerLocation) => p.id !== id);
    if (this.state.passengers.length !== prevLen) {
      this.notify();
    }
  }

  public getState(): LiveServerState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn: Listener) => fn({ ...this.state }));
  }
}

export const liveLocationService = new LiveLocationService();
