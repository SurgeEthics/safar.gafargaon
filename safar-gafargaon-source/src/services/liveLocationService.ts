/**
 * Real-Time Live Location Service for Safar Gafargaon
 * Connects to Cloudflare Worker (or built-in full-stack WebSocket/REST)
 * Supports real-time peer syncing for both Passengers and Drivers
 */

export interface LiveDriverLocation {
  id: string;
  name: string;
  phone: string;
  category: string;
  categoryBengali: string;
  vehicleModel: string;
  plateNumber: string;
  standName: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy?: number;
  rating: number;
  isOnline: boolean;
  isAvailable: boolean;
  updatedAt: number;
}

export interface LivePassengerLocation {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  accuracy?: number;
  pickupPoint: string;
  destination: string;
  status: 'idle' | 'seeking_ride' | 'on_trip';
  requestedAt?: number;
  updatedAt: number;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

type StateListener = (state: {
  drivers: LiveDriverLocation[];
  passengers: LivePassengerLocation[];
  status: ConnectionStatus;
  latencyMs: number;
  serverType: 'cloudflare' | 'local';
}) => void;

class LiveLocationService {
  private ws: WebSocket | null = null;
  private customServerUrl: string = '';
  private status: ConnectionStatus = 'disconnected';
  private latencyMs: number = 24;
  private pingStartTime: number = 0;
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private broadcastChannel: BroadcastChannel | null = null;

  private drivers: Map<string, LiveDriverLocation> = new Map();
  private passengers: Map<string, LivePassengerLocation> = new Map();
  private listeners: Set<StateListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('safar_cloudflare_worker_url');
      if (savedUrl) {
        this.customServerUrl = savedUrl;
      }

      // Initialize cross-tab BroadcastChannel for immediate multi-tab sync
      try {
        if ('BroadcastChannel' in window) {
          this.broadcastChannel = new BroadcastChannel('safar_realtime_channel');
          this.broadcastChannel.onmessage = (event) => {
            this.handleChannelMessage(event.data);
          };
        }
      } catch (e) {
        // BroadcastChannel unavailable
      }

      this.connect();
      this.startRestPolling();
    }
  }

  public setCustomServerUrl(url: string) {
    const trimmed = url.trim();
    this.customServerUrl = trimmed;
    if (trimmed) {
      localStorage.setItem('safar_cloudflare_worker_url', trimmed);
    } else {
      localStorage.removeItem('safar_cloudflare_worker_url');
    }
    this.reconnect();
  }

  public getCustomServerUrl(): string {
    return this.customServerUrl;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getLatency(): number {
    return this.latencyMs;
  }

  public getServerType(): 'cloudflare' | 'local' {
    return this.customServerUrl.includes('workers.dev') || this.customServerUrl.includes('cloudflare')
      ? 'cloudflare'
      : 'local';
  }

  public getDrivers(): LiveDriverLocation[] {
    return Array.from(this.drivers.values());
  }

  public getPassengers(): LivePassengerLocation[] {
    return Array.from(this.passengers.values());
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Notify immediately with current snapshot
    listener({
      drivers: this.getDrivers(),
      passengers: this.getPassengers(),
      status: this.status,
      latencyMs: this.latencyMs,
      serverType: this.getServerType()
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = {
      drivers: this.getDrivers(),
      passengers: this.getPassengers(),
      status: this.status,
      latencyMs: this.latencyMs,
      serverType: this.getServerType()
    };
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    });
  }

  private getWebSocketUrl(): string {
    if (this.customServerUrl) {
      let url = this.customServerUrl.trim();
      if (url.startsWith('https://')) {
        url = url.replace('https://', 'wss://');
      } else if (url.startsWith('http://')) {
        url = url.replace('http://', 'ws://');
      } else if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        url = 'wss://' + url;
      }
      if (!url.endsWith('/ws') && !url.endsWith('/api/live/ws')) {
        url = url.replace(/\/+$/, '') + '/ws';
      }
      return url;
    }

    // Default to current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.status = 'connecting';
    this.notify();

    const wsUrl = this.getWebSocketUrl();

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.status = 'connected';
        this.notify();
        this.startHeartbeat();

        // Also fetch REST snapshot to guarantee freshness
        this.fetchSnapshotViaRest();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleIncomingMessage(message);
        } catch (e) {
          // ignore malformed message
        }
      };

      this.ws.onerror = () => {
        // On error, fallback to REST polling without breaking UI
        this.status = 'disconnected';
        this.notify();
      };

      this.ws.onclose = () => {
        this.status = 'disconnected';
        this.stopHeartbeat();
        this.notify();
        this.scheduleReconnect();
      };
    } catch (err) {
      this.status = 'disconnected';
      this.notify();
      this.scheduleReconnect();
    }
  }

  public reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.connect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 4000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.pingStartTime = Date.now();
        this.ws.send(JSON.stringify({ type: 'PING', timestamp: this.pingStartTime }));
      }
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleIncomingMessage(msg: any) {
    if (msg.type === 'PONG') {
      if (this.pingStartTime > 0) {
        this.latencyMs = Math.max(8, Date.now() - this.pingStartTime);
        this.notify();
      }
      return;
    }

    if (msg.type === 'SYNC_STATE') {
      if (Array.isArray(msg.drivers)) {
        msg.drivers.forEach((d: LiveDriverLocation) => this.drivers.set(d.id, d));
      }
      if (Array.isArray(msg.passengers)) {
        msg.passengers.forEach((p: LivePassengerLocation) => this.passengers.set(p.id, p));
      }
      this.notify();
      return;
    }

    if (msg.type === 'DRIVER_MOVED' && msg.driver) {
      this.drivers.set(msg.driver.id, msg.driver);
      this.notify();
      return;
    }

    if (msg.type === 'PASSENGER_MOVED' && msg.passenger) {
      this.passengers.set(msg.passenger.id, msg.passenger);
      this.notify();
      return;
    }

    if (msg.type === 'USER_REMOVED') {
      if (msg.role === 'driver') {
        this.drivers.delete(msg.id);
      } else {
        this.passengers.delete(msg.id);
      }
      this.notify();
      return;
    }
  }

  private handleChannelMessage(data: any) {
    if (!data) return;
    if (data.type === 'DRIVER_MOVED' && data.driver) {
      this.drivers.set(data.driver.id, data.driver);
      this.notify();
    } else if (data.type === 'PASSENGER_MOVED' && data.passenger) {
      this.passengers.set(data.passenger.id, data.passenger);
      this.notify();
    } else if (data.type === 'USER_REMOVED') {
      if (data.role === 'driver') this.drivers.delete(data.id);
      else this.passengers.delete(data.id);
      this.notify();
    }
  }

  private restPollInterval: any = null;

  public startRestPolling() {
    if (this.restPollInterval) return;
    this.fetchSnapshotViaRest();
    this.restPollInterval = setInterval(() => {
      this.fetchSnapshotViaRest();
    }, 4000);
  }

  public stopRestPolling() {
    if (this.restPollInterval) {
      clearInterval(this.restPollInterval);
      this.restPollInterval = null;
    }
  }

  // REST Snapshot & real-time HTTP polling fallback
  private async fetchSnapshotViaRest() {
    try {
      const baseUrl = this.customServerUrl ? this.customServerUrl.replace(/\/+$/, '') : '';
      const endpoint = `${baseUrl}/api/live/all`;
      const start = Date.now();
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        this.latencyMs = Math.max(8, Date.now() - start);
        if (Array.isArray(data.drivers)) {
          data.drivers.forEach((d: LiveDriverLocation) => this.drivers.set(d.id, d));
        }
        if (Array.isArray(data.passengers)) {
          data.passengers.forEach((p: LivePassengerLocation) => this.passengers.set(p.id, p));
        }
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.status = 'connected';
        }
        this.notify();
      }
    } catch (e) {
      // REST snapshot error
    }
  }

  // PUBLIC EMITTERS

  // Transmit real-time driver GPS coordinates to Cloudflare / Server
  public updateDriverLocation(data: Omit<LiveDriverLocation, 'updatedAt'>) {
    const payload = {
      type: 'UPDATE_DRIVER',
      data: {
        ...data,
        updatedAt: Date.now()
      }
    };

    // Update locally
    this.drivers.set(data.id, payload.data);
    this.notify();

    // Broadcast across browser tabs
    try {
      this.broadcastChannel?.postMessage({
        type: 'DRIVER_MOVED',
        driver: payload.data
      });
    } catch (e) {}

    // Send via WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      // Send via HTTP REST fallback
      this.sendHttpUpdate('driver', payload.data);
    }
  }

  // Transmit real-time passenger GPS coordinates to Cloudflare / Server
  public updatePassengerLocation(data: Omit<LivePassengerLocation, 'updatedAt'>) {
    const payload = {
      type: 'UPDATE_PASSENGER',
      data: {
        ...data,
        updatedAt: Date.now()
      }
    };

    // Update locally
    this.passengers.set(data.id, payload.data);
    this.notify();

    // Broadcast across browser tabs
    try {
      this.broadcastChannel?.postMessage({
        type: 'PASSENGER_MOVED',
        passenger: payload.data
      });
    } catch (e) {}

    // Send via WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      // Send via HTTP REST fallback
      this.sendHttpUpdate('passenger', payload.data);
    }
  }

  public removeUser(role: 'driver' | 'passenger', id: string) {
    if (role === 'driver') this.drivers.delete(id);
    else this.passengers.delete(id);
    this.notify();

    try {
      this.broadcastChannel?.postMessage({ type: 'USER_REMOVED', role, id });
    } catch (e) {}

    const payload = { type: 'REMOVE_USER', role, id };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      const baseUrl = this.customServerUrl ? this.customServerUrl.replace(/\/+$/, '') : '';
      fetch(`${baseUrl}/api/live/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  }

  private sendHttpUpdate(role: 'driver' | 'passenger', data: any) {
    const baseUrl = this.customServerUrl ? this.customServerUrl.replace(/\/+$/, '') : '';
    fetch(`${baseUrl}/api/live/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, data })
    }).catch(() => {});
  }
}

export const liveLocationService = new LiveLocationService();
