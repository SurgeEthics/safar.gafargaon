import { useState, useEffect, useRef, useCallback } from 'react';
import {
  liveLocationService,
  LiveDriverLocation,
  LivePassengerLocation,
  ConnectionStatus
} from '../services/liveLocationService';

export interface DeviceGpsState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  isTracking: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable';
  errorMessage: string | null;
}

export function useLiveTracking(options: {
  role: 'passenger' | 'driver';
  userId: string;
  userName: string;
  userPhone?: string;
  driverDetails?: {
    category: string;
    categoryBengali: string;
    vehicleModel: string;
    plateNumber: string;
    standName: string;
    rating: number;
    isOnline: boolean;
  };
  passengerDetails?: {
    pickupPoint: string;
    destination: string;
    status: 'idle' | 'seeking_ride' | 'on_trip';
  };
}) {
  const { role, userId, userName, userPhone, driverDetails, passengerDetails } = options;

  // Real device GPS state
  const [gps, setGps] = useState<DeviceGpsState>({
    lat: null,
    lng: null,
    accuracy: null,
    speed: null,
    heading: null,
    isTracking: false,
    permissionState: 'prompt',
    errorMessage: null
  });

  // Server state
  const [serverState, setServerState] = useState<{
    drivers: LiveDriverLocation[];
    passengers: LivePassengerLocation[];
    status: ConnectionStatus;
    latencyMs: number;
    serverType: 'cloudflare' | 'local';
  }>({
    drivers: liveLocationService.getDrivers(),
    passengers: liveLocationService.getPassengers(),
    status: liveLocationService.getStatus(),
    latencyMs: liveLocationService.getLatency(),
    serverType: liveLocationService.getServerType()
  });

  const watchIdRef = useRef<number | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);

  // Subscribe to live location service
  useEffect(() => {
    const unsubscribe = liveLocationService.subscribe((state) => {
      setServerState(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Broadcast current GPS location to server
  const broadcastLocation = useCallback((lat: number, lng: number, accuracy = 10, speed = 0, heading = 0) => {
    const now = Date.now();
    // Throttle to max once every 1.5 seconds to conserve battery and bandwidth
    if (now - lastBroadcastTimeRef.current < 1500) {
      return;
    }
    lastBroadcastTimeRef.current = now;

    if (role === 'driver' && driverDetails) {
      liveLocationService.updateDriverLocation({
        id: userId,
        name: userName,
        phone: userPhone || '',
        category: driverDetails.category,
        categoryBengali: driverDetails.categoryBengali,
        vehicleModel: driverDetails.vehicleModel,
        plateNumber: driverDetails.plateNumber,
        standName: driverDetails.standName,
        lat,
        lng,
        speed: speed || 0,
        heading: heading || 0,
        accuracy,
        rating: driverDetails.rating || 4.9,
        isOnline: driverDetails.isOnline,
        isAvailable: true
      });
    } else {
      liveLocationService.updatePassengerLocation({
        id: userId,
        name: userName,
        phone: userPhone || '',
        lat,
        lng,
        accuracy,
        pickupPoint: passengerDetails?.pickupPoint || 'গফরগাঁও লাইভ লোকেশন',
        destination: passengerDetails?.destination || '',
        status: passengerDetails?.status || 'idle'
      });
    }
  }, [role, userId, userName, userPhone, driverDetails, passengerDetails]);

  // Start watching device GPS
  const startGpsTracking = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGps(prev => ({
        ...prev,
        isTracking: false,
        permissionState: 'unavailable',
        errorMessage: 'আপনার ব্রাউজার বা ডিভাইসে জিপিএস লোকেশন সাপোর্ট করে না'
      }));
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setGps(prev => ({ ...prev, isTracking: true, errorMessage: null }));

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        setGps({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || 10,
          speed: speed ? Math.round(speed * 3.6) : 0, // convert m/s to km/h
          heading: heading || 0,
          isTracking: true,
          permissionState: 'granted',
          errorMessage: null
        });

        broadcastLocation(
          latitude,
          longitude,
          accuracy,
          speed ? Math.round(speed * 3.6) : 0,
          heading || 0
        );
      },
      (err) => {
        let msg = 'লাইভ জিপিএস লোকেশন পাওয়া যায়নি';
        if (err.code === 1) { // PERMISSION_DENIED
          msg = 'জিপিএস পারমিশন দেওয়া হয়নি। ব্রাউজার বা ফোনের লোকেশন চালু করুন।';
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          msg = 'ডিভাইসের অবস্থান চিহ্নিত করা যাচ্ছে না। খোলা জায়গায় চেষ্টা করুন।';
        } else if (err.code === 3) { // TIMEOUT
          msg = 'লোকেশন পেতে সময় বেশি লেগেছে। পুনরায় চেষ্টা করা হচ্ছে...';
        }

        setGps(prev => ({
          ...prev,
          permissionState: err.code === 1 ? 'denied' : 'unavailable',
          errorMessage: msg
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000
      }
    );

    watchIdRef.current = watchId;
  }, [broadcastLocation]);

  // Stop watching GPS
  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGps(prev => ({ ...prev, isTracking: false }));
    liveLocationService.removeUser(role, userId);
  }, [role, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    gps,
    serverState,
    startGpsTracking,
    stopGpsTracking,
    broadcastLocation
  };
}
