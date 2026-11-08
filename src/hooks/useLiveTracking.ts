import { useState, useEffect, useRef, useCallback } from 'react';
import { liveLocationService, LiveServerState } from '../services/liveLocationService';

export interface UseLiveTrackingProps {
  role: 'passenger' | 'driver';
  userId: string;
  userName: string;
  userPhone: string;
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
    status: string;
  };
}

export interface DeviceGpsState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  isTracking: boolean;
}

export function useLiveTracking({
  role,
  userId,
  userName,
  userPhone,
  driverDetails,
  passengerDetails
}: UseLiveTrackingProps) {
  const [gps, setGps] = useState<DeviceGpsState>({
    lat: null,
    lng: null,
    accuracy: null,
    speed: null,
    heading: null,
    isTracking: false
  });

  const [serverState, setServerState] = useState<LiveServerState>(liveLocationService.getState());
  const watchIdRef = useRef<number | null>(null);

  // Subscribe to live location server state
  useEffect(() => {
    const unsubscribe = liveLocationService.subscribe((state) => {
      setServerState(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Sync passenger presence to liveLocationService
  const pickupPoint = passengerDetails?.pickupPoint;
  const destination = passengerDetails?.destination;
  const tripStatus = passengerDetails?.status;

  useEffect(() => {
    if (role === 'passenger' && pickupPoint) {
      liveLocationService.registerPassenger({
        id: userId || 'passenger-current',
        name: userName || 'যাত্রী',
        phone: userPhone,
        pickupPoint: pickupPoint,
        destination: destination,
        lat: gps.lat || 24.4335,
        lng: gps.lng || 90.5512,
        status: tripStatus
      });
    } else {
      liveLocationService.unregisterPassenger(userId || 'passenger-current');
    }
  }, [role, userId, userName, userPhone, pickupPoint, destination, tripStatus, gps.lat, gps.lng]);

  const startGpsTracking = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return;
    }

    setGps((prev) => ({ ...prev, isTracking: true }));

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || 10,
          speed: position.coords.speed ? Math.round(position.coords.speed * 3.6) : null,
          heading: position.coords.heading || null,
          isTracking: true
        });
      },
      (error) => {
        console.warn('Geolocation watchPosition error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  }, []);

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGps((prev) => ({ ...prev, isTracking: false }));
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    gps,
    serverState,
    startGpsTracking,
    stopGpsTracking
  };
}
