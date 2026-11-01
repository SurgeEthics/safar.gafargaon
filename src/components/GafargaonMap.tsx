import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Navigation, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  LocateFixed, 
  Cloud, 
  Users, 
  PhoneCall, 
  Clock, 
  Sparkles,
  Layers,
  MapPin,
  CheckCircle2,
  Car,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { Stand, Driver, VehicleCategory } from '../types';
import { LiveDriverLocation, LivePassengerLocation } from '../services/liveLocationService';
import { toBengaliNumber, calculateDistanceKm } from '../utils/calculator';
import { AutoMarqueeText } from './AutoMarqueeText';

const calculateEtaMinutes = (dist: number, speedKmh: number = 30): number => {
  return Math.max(1, Math.round((dist / speedKmh) * 60));
};

interface GafargaonMapProps {
  // Static/Fallback drivers & stands
  drivers: Driver[];
  stands: Stand[];
  
  // Real-time server state
  liveDrivers: LiveDriverLocation[];
  livePassengers: LivePassengerLocation[];
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  latencyMs: number;
  serverType: 'cloudflare' | 'local';
  onOpenServerSettings: () => void;
  isAdmin?: boolean;

  // Real device GPS
  userGps: {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    isTracking: boolean;
  };
  onStartGpsTracking: () => void;
  userRole: 'passenger' | 'driver';

  // Selection & Route planning
  selectedDriver?: any;
  onSelectDriver: (driver: any) => void;
  pickupCoords?: { lat: number; lng: number } | null;
  destCoords?: { lat: number; lng: number } | null;
  pickupTitle?: string;
  destTitle?: string;
  calculatedDistance?: number;
  calculatedDurationMinutes?: number;

  // Active mutual booking
  activeBooking?: {
    driverName: string;
    driverPhone: string;
    driverCategory: string;
    driverPhoto?: string;
    currentDriverLat: number;
    currentDriverLng: number;
    passengerLat: number;
    passengerLng: number;
    destLat?: number;
    destLng?: number;
    pickupTitle?: string;
    destTitle?: string;
    distanceKm: number;
    etaMinutes: number;
    fare?: number;
    status?: 'en_route' | 'arrived' | 'in_transit' | 'completed';
  } | null;

  isTripActive?: boolean;
  activeDriverId?: string;

  onSelectPickupPlace?: (placeName: string) => void;
  onSelectDestPlace?: (placeName: string) => void;
  onClearRoute?: () => void;
}

export const GafargaonMap: React.FC<GafargaonMapProps> = ({
  drivers,
  stands,
  liveDrivers,
  livePassengers,
  connectionStatus,
  latencyMs,
  serverType,
  onOpenServerSettings,
  isAdmin = false,
  userGps,
  onStartGpsTracking,
  userRole,
  selectedDriver,
  onSelectDriver,
  pickupCoords,
  destCoords,
  pickupTitle,
  destTitle,
  calculatedDistance,
  calculatedDurationMinutes,
  activeBooking,
  onSelectPickupPlace,
  onSelectDestPlace,
  onClearRoute,
  isTripActive = false,
  activeDriverId
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'drivers' | 'passengers'>('all');
  const [isLandscapeMode, setIsLandscapeMode] = useState<boolean>(false);
  
  // Track user manual zoom/pan interaction (fixes the 5-6s snap-back/auto-zoom glitch)
  const [userHasInteracted, setUserHasInteracted] = useState<boolean>(false);
  const userInteractedRef = useRef<boolean>(false);

  // Active Trip State: When trip request or active ride is in progress, clean map
  const isTripCurrentlyActive = Boolean(
    isTripActive ||
    activeBooking ||
    (pickupCoords && destCoords && userRole === 'driver')
  );
  
  // Mobile Scroll Lock: Default true on mobile (< 768px) to prevent scroll hijack
  const [isScrollLocked, setIsScrollLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [isRouteOverlayCollapsed, setIsRouteOverlayCollapsed] = useState<boolean>(false);
  const [showLockNotification, setShowLockNotification] = useState<boolean>(false);
  const lockNotificationTimerRef = useRef<any>(null);
  const lastFittedRouteKeyRef = useRef<string>('');
  const lastFittedBookingIdRef = useRef<string>('');

  // Gafargaon Center Coordinates (Exact Google Maps Location)
  const DEFAULT_CENTER: [number, number] = [24.4536, 90.5479];
  const DEFAULT_ZOOM = 14;

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id != null) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        scrollWheelZoom: !isScrollLocked,
        touchZoom: !isScrollLocked,
        dragging: !isScrollLocked
      });

      // Clear OpenStreetMap Standard Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap | সফর গফরগাঁও লাইভ',
        maxZoom: 19,
        minZoom: 11
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Track genuine user zoom/pan/drag gestures to prevent auto-reset overriding user view
      const handleUserInteraction = (e: any) => {
        if (e && (e as any).originalEvent) {
          userInteractedRef.current = true;
          setUserHasInteracted(true);
        }
      };

      map.on('movestart', handleUserInteraction);
      map.on('zoomstart', handleUserInteraction);
      map.on('dragstart', handleUserInteraction);

      // Invalidate map size after short delay to prevent any gray-tile artifacts
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Dynamically Toggle Leaflet Touch & Scroll Dragging
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isScrollLocked) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      if ((map as any).tapHold) (map as any).tapHold.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      if ((map as any).tapHold) (map as any).tapHold.enable();
    }
  }, [isScrollLocked]);

  // Handle Resize on fullscreen toggle
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
    }
  }, [isFullscreen]);

  // 2. Render Markers, Routes & Real-time Live Coordinates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    if (userAccuracyCircleRef.current) {
      userAccuracyCircleRef.current.remove();
      userAccuracyCircleRef.current = null;
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    // Helper: Category badge styling
    const getCategoryDetails = (cat: string) => {
      switch (cat) {
        case 'ambulance': return { symbol: '✚', color: '#dc2626', name: 'এম্বুলেন্স' };
        case 'fire':
        case 'fire_service': return { symbol: '🚒', color: '#ea580c', name: 'ফায়ার সার্ভিস' };
        case 'cng': return { symbol: '🛺', color: '#059669', name: 'সিএনজি' };
        case 'auto': return { symbol: '🔋', color: '#0d9488', name: 'অটো রিকশা' };
        case 'car': return { symbol: '🚗', color: '#2563eb', name: 'কার' };
        case 'microbus':
        case 'maxi': return { symbol: '🚐', color: '#4f46e5', name: 'মাইক্রোবাস' };
        case 'bike': return { symbol: '🏍️', color: '#d97706', name: 'মোটরসাইকেল' };
        default: return { symbol: '🚖', color: '#059669', name: 'যানবাহন' };
      }
    };

    // A. Render Gafargaon Registered Stands (HIDDEN when ride request or trip is active!)
    if (!isTripCurrentlyActive) {
      stands.forEach((stand) => {
        const standIcon = L.divIcon({
          className: 'custom-stand-marker',
          html: `
            <div style="background-color: #065f46; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid #ffffff; cursor: pointer;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -34]
        });

        const marker = L.marker([stand.lat, stand.lng], { icon: standIcon });
        const standBn = (stand as any).bengaliName || stand.nameBn;
        const count = stand.driverCount || (stand as any).activeDrivers || 5;

        marker.bindPopup(`
          <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px; min-width: 175px;">
            <h4 style="font-weight: 800; color: #065f46; margin: 0 0 4px 0; font-size: 13.5px;">${standBn}</h4>
            <p style="font-size: 11px; color: #334155; margin: 0 0 6px 0;">সক্রিয় যানবাহন: <b>${toBengaliNumber(count)} টি</b></p>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <button onclick="window.__selectPickupPlace && window.__selectPickupPlace('${standBn}')" 
                      style="width: 100%; background: #059669; color: white; border: none; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                🚖 এই স্ট্যান্ড পিকআপ করুন
              </button>
              <button onclick="window.__selectDestPlace && window.__selectDestPlace('${standBn}')" 
                      style="width: 100%; background: #dc2626; color: white; border: none; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                🎯 এখানে যাব (গন্তব্য করুন)
              </button>
            </div>
          </div>
        `);

        marker.bindTooltip(`
          <div style="font-family: 'Hind Siliguri', sans-serif; font-weight: 700; font-size: 11px; padding: 1px 4px;">
            📍 ${standBn} <span style="color: #059669; font-weight: 800;">(${toBengaliNumber(count)}টি গাড়ি)</span>
          </div>
        `, { direction: 'top', offset: [0, -32], opacity: 0.95 });

        markersGroup.addLayer(marker);
      });
    }

    // B. Combine Server Live Drivers with Seed Drivers for maximum coverage
    const displayedDriversMap = new Map<string, {
      id: string;
      name: string;
      phone: string;
      category: string;
      vehicleModel: string;
      plateNumber: string;
      standName: string;
      lat: number;
      lng: number;
      speed: number;
      rating: number;
      isLiveEdge: boolean;
    }>();

    // First populate fallback seed drivers
    drivers.forEach((d) => {
      displayedDriversMap.set(d.id, {
        id: d.id,
        name: d.nameBn || (d as any).name || 'চালক',
        phone: d.phone,
        category: d.category,
        vehicleModel: d.vehicleName || (d as any).vehicleModel || 'গাড়ি',
        plateNumber: d.licensePlate || (d as any).plateNumber || 'নথিভুক্ত',
        standName: d.standName || 'গফরগাঁও স্ট্যান্ড',
        lat: d.lat,
        lng: d.lng,
        speed: (d as any).approxSpeedKmh || 25,
        rating: d.rating || 4.8,
        isLiveEdge: false
      });
    });

    // Then overwrite or add real-time Cloudflare/Server live drivers
    liveDrivers.forEach((ld) => {
      displayedDriversMap.set(ld.id, {
        id: ld.id,
        name: ld.name,
        phone: ld.phone,
        category: ld.category,
        vehicleModel: ld.vehicleModel || '',
        plateNumber: ld.plateNumber || '',
        standName: ld.standName || '',
        lat: ld.lat,
        lng: ld.lng,
        speed: ld.speed || 0,
        rating: ld.rating || 4.9,
        isLiveEdge: true
      });
    });

    // Plot Drivers if filter permits AND trip is NOT currently active
    if (!isTripCurrentlyActive && (filterMode === 'all' || filterMode === 'drivers')) {
      displayedDriversMap.forEach((driver) => {
        const catInfo = getCategoryDetails(driver.category);
        const isSelected = selectedDriver?.id === driver.id;

        const driverIcon = L.divIcon({
          className: 'custom-driver-marker',
          html: `
            <div style="position: relative; cursor: pointer;">
              ${driver.isLiveEdge ? `
                <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${catInfo.color}45; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; top: -4px; left: -4px;"></div>
              ` : ''}
              <div style="
                background-color: ${catInfo.color};
                color: #ffffff;
                width: ${isSelected ? '40px' : '36px'};
                height: ${isSelected ? '40px' : '36px'};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.38);
                border: 2.5px solid ${isSelected ? '#facc15' : '#ffffff'};
                font-size: ${driver.category === 'ambulance' ? '18px' : '15px'};
                font-weight: bold;
                transition: transform 0.15s ease;
              ">
                ${catInfo.symbol}
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -20]
        });

        const marker = L.marker([driver.lat, driver.lng], { icon: driverIcon });

        marker.bindPopup(`
          <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px; min-width: 195px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
              <span style="font-size: 10px; background: #ecfdf5; color: #047857; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">
                ${driver.isLiveEdge ? '⚡ ক্লাউডফ্লেয়ার লাইভ' : '📍 সফর ভেরিফাইড'}
              </span>
              <span style="font-size: 11px; color: #d97706; font-weight: 800;">★ ${toBengaliNumber(driver.rating)}</span>
            </div>
            <h4 style="font-weight: 800; color: #0f172a; margin: 2px 0 2px 0; font-size: 13px;">${driver.name}</h4>
            <div style="font-size: 11px; color: #0284c7; font-weight: 700; margin-bottom: 2px;">${driver.vehicleModel}</div>
            <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">স্ট্যান্ড: ${driver.standName} • গতি: ${toBengaliNumber(driver.speed)} কিমি/ঘণ্টা</div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <a href="tel:${driver.phone.replace(/[^0-9]/g, '')}" 
                 style="display: block; text-align: center; background: #059669; color: white; padding: 5px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; text-decoration: none;">
                📞 সরাসরি কল করুন (${driver.phone})
              </a>
              <button onclick="window.__selectPickupPlace && window.__selectPickupPlace('${driver.standName}')"
                      style="display: block; width: 100%; text-align: center; background-color: #ecfdf5; color: #047857; padding: 4px 8px; border-radius: 6px; border: 1px solid #a7f3d0; font-size: 10.5px; font-weight: 700; cursor: pointer;">
                🚖 এই স্ট্যান্ড পিকআপ করুন
              </button>
              <button onclick="window.__selectDestPlace && window.__selectDestPlace('${driver.standName}')"
                      style="display: block; width: 100%; text-align: center; background-color: #fef2f2; color: #b91c1c; padding: 4px 8px; border-radius: 6px; border: 1px solid #fecaca; font-size: 10.5px; font-weight: 700; cursor: pointer;">
                🎯 এই স্ট্যান্ডে যাব (গন্তব্য)
              </button>
            </div>
          </div>
        `);

        // Smooth Hover Sticker Tooltip
        marker.bindTooltip(`
          <div style="font-family: 'Hind Siliguri', sans-serif; padding: 2px 5px; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
            <span>${catInfo.symbol}</span>
            <span>${driver.name}</span>
            <span style="color: #0284c7; font-size: 10px;">(${driver.vehicleModel})</span>
            <span style="color: #d97706; font-size: 10px;">★${toBengaliNumber(driver.rating)}</span>
          </div>
        `, { direction: 'top', offset: [0, -20], opacity: 0.95 });

        marker.on('click', () => {
          const matched = drivers.find(d => d.id === driver.id) || (driver as any);
          if (matched && onSelectDriver) onSelectDriver(matched);
        });

        markersGroup.addLayer(marker);
      });
    }

    // C. Plot Live Passengers (from Cloudflare / Server) - HIDDEN if trip is currently active
    if (!isTripCurrentlyActive && (filterMode === 'all' || filterMode === 'passengers')) {
      livePassengers.forEach((passenger) => {
        const passIcon = L.divIcon({
          className: 'custom-live-passenger-marker',
          html: `
            <div style="position: relative;">
              <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(37, 99, 235, 0.4); animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite; top: -5px; left: -5px;"></div>
              <div style="background-color: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid #ffffff; font-weight: bold; font-size: 12px;">
                👤
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14]
        });

        const pMarker = L.marker([passenger.lat, passenger.lng], { icon: passIcon });
        pMarker.bindPopup(`
          <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px; min-width: 175px;">
            <span style="font-size: 10px; background: #dbeafe; color: #1e40af; font-weight: 700; padding: 1px 6px; border-radius: 4px;">
              লাইভ যাত্রী (অনলাইন)
            </span>
            <h4 style="font-weight: 800; color: #1e3a8a; margin: 4px 0 2px 0; font-size: 13px;">${passenger.name}</h4>
            <p style="font-size: 11px; color: #475569; margin: 0 0 2px 0;">পিকআপ: <b>${passenger.pickupPoint}</b></p>
            ${passenger.destination ? `<p style="font-size: 11px; color: #dc2626; margin: 0 0 4px 0;">গন্তব্য: <b>${passenger.destination}</b></p>` : ''}
            <span style="font-size: 10px; color: #059669; font-weight: 700;">🟢 রাইডের অপেক্ষায় আছেন</span>
          </div>
        `);
        markersGroup.addLayer(pMarker);
      });
    }

    // D. Current User's Real Device GPS Beacon & Accuracy Circle
    if (userGps.lat && userGps.lng) {
      // Accuracy circle
      const accCircle = L.circle([userGps.lat, userGps.lng], {
        radius: Math.max(15, userGps.accuracy || 20),
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.15,
        weight: 1.5
      }).addTo(map);
      userAccuracyCircleRef.current = accCircle;

      // Pulse pin
      const myBeaconIcon = L.divIcon({
        className: 'custom-my-gps-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(14, 165, 233, 0.45); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite; top: -6px; left: -6px;"></div>
            <div style="background-color: #0284c7; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.6); border: 3px solid #ffffff; font-weight: 900; font-size: 14px;">
              ${userRole === 'driver' ? '🚗' : '🎯'}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const myMarker = L.marker([userGps.lat, userGps.lng], { icon: myBeaconIcon });
      myMarker.bindPopup(`
        <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px;">
          <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
            আমার বর্তমান ডিভাইস অবস্থান
          </span>
          <h4 style="font-weight: 800; color: #0284c7; margin: 4px 0 2px 0; font-size: 13px;">আপনি এখানে আছেন</h4>
          <p style="font-size: 11px; color: #475569; margin: 0;">সঠিকতা: প্রায় ${Math.round(userGps.accuracy || 15)} মিটার</p>
        </div>
      `);
      markersGroup.addLayer(myMarker);
      userMarkerRef.current = myMarker;
    }

    // E. Mutual Live Booking Tracking Line & Markers (2-Phase System)
    if (activeBooking) {
      const catDetails = getCategoryDetails(activeBooking.driverCategory);
      const isInTransit = activeBooking.status === 'in_transit';
      const effectiveDestLat = activeBooking.destLat || destCoords?.lat;
      const effectiveDestLng = activeBooking.destLng || destCoords?.lng;

      // Driver photo resolution
      const driverPhotoUrl = activeBooking.driverPhoto;

      // 1. Driver/Vehicle Live Marker (Moving towards Pickup in Phase 1, or towards Destination in Phase 2)
      const driverLiveIcon = L.divIcon({
        className: 'custom-active-driver-tracking-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <!-- Driver Name Top Badge -->
            <div style="
              background: #0f172a;
              color: #facc15;
              font-size: 10px;
              font-weight: 900;
              white-space: nowrap;
              padding: 2px 7px;
              border-radius: 8px;
              border: 1.5px solid #facc15;
              box-shadow: 0 2px 6px rgba(0,0,0,0.5);
              margin-bottom: 2px;
              max-width: 120px;
              overflow: hidden;
              text-overflow: ellipsis;
            ">
              ${activeBooking.driverName || 'চালক'}
            </div>

            <!-- Avatar / Photo Circle with Ping Animation -->
            <div style="position: relative; width: 44px; height: 44px;">
              <div style="position: absolute; inset: -4px; border-radius: 50%; background: ${isInTransit ? 'rgba(37, 99, 235, 0.45)' : 'rgba(5, 150, 105, 0.45)'}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="
                position: relative;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: ${isInTransit ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #059669, #047857)'};
                border: 3px solid ${isInTransit ? '#60a5fa' : '#facc15'};
                box-shadow: 0 4px 14px rgba(0,0,0,0.5);
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                ${driverPhotoUrl 
                  ? `<img src="${driverPhotoUrl}" alt="${activeBooking.driverName}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'color:white;font-size:18px;font-weight:900;\\'>${catDetails.symbol}</span>';" />` 
                  : `<span style="color: white; font-size: 18px; font-weight: 900;">${catDetails.symbol}</span>`
                }
              </div>
            </div>

            <!-- Dynamic Phase Status Badge Below -->
            <div style="
              margin-top: 2px;
              background: #0f172a;
              color: ${isInTransit ? '#60a5fa' : '#facc15'};
              font-size: 9.5px;
              font-weight: 800;
              white-space: nowrap;
              padding: 1.5px 7px;
              border-radius: 10px;
              border: 1px solid ${isInTransit ? '#60a5fa' : '#facc15'};
              box-shadow: 0 2px 5px rgba(0,0,0,0.4);
            ">
              ${isInTransit ? '🟢 গন্তব্যে চলছে' : '🚗 চালক আসছে'}
            </div>
          </div>
        `,
        iconSize: [44, 76],
        iconAnchor: [22, 50],
        popupAnchor: [0, -50]
      });

      const bDriverMarker = L.marker([activeBooking.currentDriverLat, activeBooking.currentDriverLng], { icon: driverLiveIcon });
      
      const navTargetLat = isInTransit ? (effectiveDestLat || activeBooking.passengerLat) : activeBooking.passengerLat;
      const navTargetLng = isInTransit ? (effectiveDestLng || activeBooking.passengerLng) : activeBooking.passengerLng;
      const navTargetLabel = isInTransit ? 'গন্তব্যের দিকে টার্ন-বাই-টার্ন GPS' : 'পিকআপের দিকে টার্ন-বাই-টার্ন GPS';

      bDriverMarker.bindPopup(`
        <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px; min-width: 215px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; background: ${isInTransit ? '#eff6ff' : '#ecfdf5'}; color: ${isInTransit ? '#1d4ed8' : '#047857'}; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid ${isInTransit ? '#bfdbfe' : '#a7f3d0'};">
              ${isInTransit ? '🟢 গন্তব্যে যাত্রা চলছে (Phase 2)' : '🚗 চালক পিকআপে আসছেন (Phase 1)'}
            </span>
            <span style="font-size: 11px; color: #0284c7; font-weight: 800;">${activeBooking.distanceKm} কিমি</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            ${driverPhotoUrl ? `<img src="${driverPhotoUrl}" alt="${activeBooking.driverName}" style="width: 38px; height: 38px; border-radius: 8px; object-fit: cover; border: 1px solid #cbd5e1;" />` : ''}
            <div>
              <h4 style="font-weight: 900; color: #0f172a; margin: 0; font-size: 14px;">${activeBooking.driverName}</h4>
              <div style="font-size: 11px; color: #475569;">বাহন: <b>${catDetails.name}</b> • সময়: <b>~${activeBooking.etaMinutes} মিনিট</b></div>
            </div>
          </div>
          <a href="tel:${activeBooking.driverPhone.replace(/[^0-9]/g, '')}" 
             style="display: block; text-align: center; background: #059669; color: white; padding: 6px 10px; border-radius: 8px; font-weight: 800; font-size: 11.5px; text-decoration: none; margin: 6px 0 4px 0;">
            📞 চালককে সরাসরি কল (${activeBooking.driverPhone})
          </a>
          <a href="${userGps.isTracking && userGps.lat ? `https://www.google.com/maps/dir/?api=1&origin=${userGps.lat},${userGps.lng}&destination=${navTargetLat},${navTargetLng}&travelmode=driving` : `https://www.google.com/maps/dir/?api=1&destination=${navTargetLat},${navTargetLng}&travelmode=driving`}"
             target="_blank" rel="noopener noreferrer"
             style="display: block; text-align: center; background: #2563eb; color: white; padding: 6px 10px; border-radius: 8px; font-weight: 800; font-size: 11px; text-decoration: none;">
            🗺️ ${navTargetLabel}
          </a>
        </div>
      `);
      bDriverMarker.bindTooltip(`${isInTransit ? '🟢 গন্তব্যে চলছে' : '🚗 চালক'}: ${activeBooking.driverName} (~${activeBooking.etaMinutes} মি.)`, { direction: 'top', offset: [0, -50], opacity: 0.95 });
      markersGroup.addLayer(bDriverMarker);

      // 2. Passenger Pickup Point Marker (A)
      const passPickupIcon = L.divIcon({
        className: 'custom-active-passenger-pickup-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(37, 99, 235, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; top: -6px; left: -6px;"></div>
            <div style="background-color: #2563eb; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5); border: 2.5px solid #ffffff; font-weight: 900; font-size: 14px;">
              A
            </div>
            <div style="position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); background: #1e3a8a; color: white; font-size: 9.5px; font-weight: 800; white-space: nowrap; padding: 1px 6px; border-radius: 10px;">
              পিকআপ (A)
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });
      const bPassMarker = L.marker([activeBooking.passengerLat, activeBooking.passengerLng], { icon: passPickupIcon });
      bPassMarker.bindTooltip(`📍 পিকআপ (A): ${activeBooking.pickupTitle || pickupTitle || 'যাত্রী পিকআপ'}`, { direction: 'top', offset: [0, -18] });
      markersGroup.addLayer(bPassMarker);

      // 3. Destination Marker (B) & Connecting Route Line
      // In Phase 1: Only Driver and Pickup (A) are shown. Destination (B) is hidden.
      // In Phase 2: Pickup (A) and Destination (B) are shown. Polyline is Driver/Vehicle -> Destination (B).
      if (isInTransit && effectiveDestLat && effectiveDestLng) {
        const destIcon = L.divIcon({
          className: 'custom-active-destination-marker',
          html: `
            <div style="position: relative;">
              <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(220, 38, 38, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; top: -6px; left: -6px;"></div>
              <div style="background-color: #dc2626; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.5); border: 2.5px solid #ffffff; font-weight: 900; font-size: 14px;">
                B
              </div>
              <div style="position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); background: #991b1b; color: white; font-size: 9.5px; font-weight: 800; white-space: nowrap; padding: 1px 6px; border-radius: 10px;">
                গন্তব্য (B)
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18]
        });
        const bDestMarker = L.marker([effectiveDestLat, effectiveDestLng], { icon: destIcon });
        bDestMarker.bindTooltip(`🏁 গন্তব্য (B): ${activeBooking.destTitle || destTitle || 'গন্তব্য স্থান'}`, { direction: 'top', offset: [0, -18] });
        markersGroup.addLayer(bDestMarker);

        // Phase 2 Route: From Vehicle/Driver directly towards Destination (B) with bright royal blue line
        const destRoutePoints: [number, number][] = [
          [activeBooking.currentDriverLat, activeBooking.currentDriverLng],
          [effectiveDestLat, effectiveDestLng]
        ];
        const polyline = L.polyline(destRoutePoints, {
          color: '#2563eb',
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        routePolylineRef.current = polyline;
      } else {
        // Phase 1 Route: Connecting Driver to Pickup (A) with dynamic blue route line
        const routePoints: [number, number][] = [
          [activeBooking.currentDriverLat, activeBooking.currentDriverLng],
          [
            (activeBooking.currentDriverLat + activeBooking.passengerLat) / 2 + 0.0004,
            (activeBooking.currentDriverLng + activeBooking.passengerLng) / 2 - 0.0003
          ],
          [activeBooking.passengerLat, activeBooking.passengerLng]
        ];

        const polyline = L.polyline(routePoints, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.9,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(map);

        routePolylineRef.current = polyline;
      }

      // Fit bounds ONLY ONCE per booking session/phase and NEVER override user manual zoom
      const bookingSessionKey = `${activeBooking.driverPhone || 'driver'}_${activeBooking.status || 'en_route'}_${(activeBooking.pickupTitle || '').slice(0, 8)}`;
      if (!userInteractedRef.current && lastFittedBookingIdRef.current !== bookingSessionKey) {
        lastFittedBookingIdRef.current = bookingSessionKey;
        const pointsToFit: [number, number][] = isInTransit && effectiveDestLat && effectiveDestLng
          ? [
              [activeBooking.currentDriverLat, activeBooking.currentDriverLng],
              [effectiveDestLat, effectiveDestLng]
            ]
          : [
              [activeBooking.currentDriverLat, activeBooking.currentDriverLng],
              [activeBooking.passengerLat, activeBooking.passengerLng]
            ];
        const bounds = L.latLngBounds(pointsToFit);
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 15 });
      }
    }
    // F. Route Planning Preview (A to B)
    else if (pickupCoords && destCoords && (pickupCoords.lat !== destCoords.lat || pickupCoords.lng !== destCoords.lng)) {
      // Pickup Pin (A)
      const pickupIcon = L.divIcon({
        className: 'custom-pickup-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: rgba(5, 150, 105, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; top: -5px; left: -5px;"></div>
            <div style="background-color: #059669; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 2.5px solid #ffffff; font-weight: 900; font-size: 14px;">
              A
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const pMarker = L.marker([pickupCoords.lat, pickupCoords.lng], { icon: pickupIcon })
        .bindTooltip(`পিকআপ (A): ${pickupTitle || 'যাত্রা শুরুর স্থান'}`);
      markersGroup.addLayer(pMarker);

      // Destination Pin (B)
      const destIcon = L.divIcon({
        className: 'custom-dest-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: rgba(220, 38, 38, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; top: -5px; left: -5px;"></div>
            <div style="background-color: #dc2626; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 2.5px solid #ffffff; font-weight: 900; font-size: 14px;">
              B
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const dMarker = L.marker([destCoords.lat, destCoords.lng], { icon: destIcon })
        .bindTooltip(`গন্তব্য (B): ${destTitle || 'পৌঁছানোর স্থান'}`);
      markersGroup.addLayer(dMarker);

      // Curved road connecting route
      const midLat = (pickupCoords.lat + destCoords.lat) / 2 + 0.0004;
      const midLng = (pickupCoords.lng + destCoords.lng) / 2 - 0.0004;
      const routePoints: [number, number][] = [
        [pickupCoords.lat, pickupCoords.lng],
        [midLat, midLng],
        [destCoords.lat, destCoords.lng]
      ];

      const polyline = L.polyline(routePoints, {
        color: '#059669',
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 8',
        lineCap: 'round'
      }).addTo(map);

      routePolylineRef.current = polyline;

      // Fit bounds only when route endpoints change AND user hasn't manually zoomed/panned
      const routeKey = `${pickupCoords.lat.toFixed(4)},${pickupCoords.lng.toFixed(4)}->${destCoords.lat.toFixed(4)},${destCoords.lng.toFixed(4)}`;
      if (!userInteractedRef.current && lastFittedRouteKeyRef.current !== routeKey) {
        lastFittedRouteKeyRef.current = routeKey;
        const bounds = L.latLngBounds([
          [pickupCoords.lat, pickupCoords.lng],
          [destCoords.lat, destCoords.lng]
        ]);
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
      }
    } else {
      // Clear route fitted key when no route is active
      lastFittedRouteKeyRef.current = '';
    }
  }, [
    drivers,
    stands,
    liveDrivers,
    livePassengers,
    userGps,
    filterMode,
    selectedDriver,
    pickupCoords,
    destCoords,
    pickupTitle,
    destTitle,
    calculatedDistance,
    calculatedDurationMinutes,
    activeBooking,
    onSelectDriver,
    userRole
  ]);

  // Expose global window pickup and destination selector for popups
  useEffect(() => {
    (window as any).__selectPickupPlace = (placeName: string) => {
      if (onSelectPickupPlace) {
        onSelectPickupPlace(placeName);
      }
    };
    (window as any).__selectDestPlace = (placeName: string) => {
      if (onSelectDestPlace) {
        onSelectDestPlace(placeName);
      }
    };
    return () => {
      delete (window as any).__selectPickupPlace;
      delete (window as any).__selectDestPlace;
    };
  }, [onSelectPickupPlace, onSelectDestPlace]);

  // Center on user device GPS
  const handleLocateMe = () => {
    if (userGps.lat && userGps.lng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userGps.lat, userGps.lng], 16, { duration: 1.2 });
    } else {
      onStartGpsTracking();
    }
  };

  // Re-center on active booking, route, user GPS or Gafargaon center, and resume auto-following
  const handleRecenterFocus = () => {
    userInteractedRef.current = false;
    setUserHasInteracted(false);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeBooking) {
      const effectiveDestLat = activeBooking.destLat || destCoords?.lat;
      const effectiveDestLng = activeBooking.destLng || destCoords?.lng;
      const pointsToFit: [number, number][] = [
        [activeBooking.currentDriverLat, activeBooking.currentDriverLng],
        [activeBooking.passengerLat, activeBooking.passengerLng]
      ];
      if (effectiveDestLat && effectiveDestLng) {
        pointsToFit.push([effectiveDestLat, effectiveDestLng]);
      }
      const bounds = L.latLngBounds(pointsToFit);
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
    } else if (pickupCoords && destCoords) {
      const bounds = L.latLngBounds([
        [pickupCoords.lat, pickupCoords.lng],
        [destCoords.lat, destCoords.lng]
      ]);
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
    } else if (userGps.lat && userGps.lng) {
      map.flyTo([userGps.lat, userGps.lng], 16, { duration: 1.0 });
    } else {
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.0 });
    }
  };

  const handleResetCenter = () => {
    userInteractedRef.current = false;
    setUserHasInteracted(false);
    mapInstanceRef.current?.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1 });
  };

  const handleFlyTo = (lat: number, lng: number, zoom = 15) => {
    mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.2 });
  };

  return (
    <div
      className={`bg-white shadow-sm overflow-hidden flex flex-col transition-all isolate relative ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none bg-slate-950 flex flex-col'
          : 'w-full rounded-none sm:rounded-2xl border-y sm:border border-slate-200'
      } ${isLandscapeMode && isFullscreen ? 'rotate-90 sm:rotate-0 origin-center scale-[0.98]' : ''}`}
    >
      {/* Top Header Bar */}
      <div className="bg-slate-50/95 px-3 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-xs sm:text-sm">
            <Navigation className="w-4 h-4 text-emerald-600" />
            <span>গফরগাঁও লাইভ ম্যাপ</span>
          </div>

          {/* Active Trip Mode Badge or Filter Pills */}
          {isTripCurrentlyActive ? (
            <div className="flex items-center gap-1.5 bg-emerald-950 text-emerald-200 px-2.5 py-1 rounded-lg text-[10.5px] font-black border border-emerald-500/50 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>অ্যাক্টিভ ট্রিপ: শুধুমাত্র চালক, পিকআপ ও গন্তব্য ফোকাস</span>
            </div>
          ) : (
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  filterMode === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                সবাই ({toBengaliNumber(drivers.length + livePassengers.length)})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('drivers')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  filterMode === 'drivers' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                চালক ({toBengaliNumber(drivers.length)})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('passengers')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  filterMode === 'passengers' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                যাত্রী ({toBengaliNumber(livePassengers.length)})
              </button>
            </div>
          )}

          {/* Cloudflare Server Status Badge (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenServerSettings}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-red-100 text-red-800 border-red-300'
              }`}
              title="ক্লাউডফ্লেয়ার লাইভ সার্ভার সেটিংস (অ্যাডমিন)"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-600 animate-ping'
                    : connectionStatus === 'connecting'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-red-500'
                }`}
              />
              <Cloud className="w-3 h-3" />
              <span>
                {serverType === 'cloudflare' ? 'ক্লাউডফ্লেয়ার এজ' : 'লাইভ সার্ভার'} • {latencyMs}ms
              </span>
            </button>
          )}
        </div>

        {/* Action Buttons: Scroll Lock, Locate Me, Reset, Fullscreen */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Scroll Lock Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextState = !isScrollLocked;
              setIsScrollLocked(nextState);
              setShowLockNotification(true);
              if (lockNotificationTimerRef.current) clearTimeout(lockNotificationTimerRef.current);
              lockNotificationTimerRef.current = setTimeout(() => setShowLockNotification(false), 3000);
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
              isScrollLocked
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
            }`}
            title={isScrollLocked ? 'ম্যাপ আনলক করুন (ম্যাপ ঘুরানো ও জুম করা যাবে)' : 'স্ক্রল লক করুন (মোবাইলে পেজ সহজে স্ক্রল হবে)'}
          >
            {isScrollLocked ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <Unlock className="w-3.5 h-3.5 text-emerald-700" />}
            <span>{isScrollLocked ? 'স্ক্রল লক: চালু' : 'ম্যাপ আনলক'}</span>
          </button>

          <button
            type="button"
            onClick={handleLocateMe}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
              userGps.isTracking
                ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="আমার লাইভ অবস্থান দেখুন"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${userGps.isTracking ? 'animate-spin' : ''}`} />
            <span>{userGps.isTracking ? 'আমার অবস্থান' : '+ GPS ট্র্যাকিং'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetCenter}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="গফরগাঁও কেন্দ্রে ম্যাপ রিসেট করুন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">রিসেট</span>
          </button>

          {/* Fullscreen Expand Button - Strictly Hidden on PC & Tablets as requested */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="hidden sm:hidden md:hidden lg:hidden px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold items-center gap-1 transition-colors cursor-pointer shadow-xs"
            title={isFullscreen ? 'ফুলস্ক্রিন বন্ধ করুন' : 'মোবাইলে সর্বোচ্চ চওড়া ফুলস্ক্রিন ভিউ'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-bold">{isFullscreen ? 'প্রস্থান' : 'ফুলস্ক্রিন'}</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div 
        className={`relative w-full bg-slate-100 overflow-hidden ${
          isFullscreen ? 'flex-1 h-full' : 'h-[390px] sm:h-[450px] lg:h-[500px]'
        }`}
        onClick={() => {
          if (isScrollLocked) {
            setShowLockNotification(true);
            if (lockNotificationTimerRef.current) clearTimeout(lockNotificationTimerRef.current);
            lockNotificationTimerRef.current = setTimeout(() => setShowLockNotification(false), 3000);
          }
        }}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Recenter / Auto-focus Button when user manually zoomed/panned */}
        {userHasInteracted && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] pointer-events-auto animate-in fade-in slide-in-from-bottom-2">
            <button
              type="button"
              onClick={handleRecenterFocus}
              className="bg-slate-900/95 hover:bg-slate-900 text-amber-300 hover:text-white px-4 py-2 rounded-full text-xs font-black border-2 border-amber-400 shadow-2xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 backdrop-blur-sm"
              title="ম্যাপ পুনরায় রুট ও মূল কেন্দ্রে আনুন"
            >
              <LocateFixed className="w-4 h-4 text-amber-400 animate-spin" />
              <span>🎯 রুট কেন্দ্রে আনুন (অটো-ফোকাস)</span>
            </button>
          </div>
        )}

        {/* Fullscreen Overlay Header Bar */}
        {isFullscreen && (
          <div className="absolute top-2 left-2 right-2 z-[450] pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl border border-emerald-500/50 shadow-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <div className="min-w-0">
                <h4 className="font-extrabold text-xs sm:text-sm text-emerald-300 truncate">
                  {activeBooking
                    ? `চলমান ট্রিপ: ${activeBooking.driverName} • ভাড়া: ৳${activeBooking.fare || 40}`
                    : 'সফর গফরগাঁও ওয়াইড স্ক্রিন লাইভ ম্যাপ'}
                </h4>
                <p className="text-[10px] text-slate-300 truncate">
                  {activeBooking
                    ? `পিকআপ: ${activeBooking.pickupTitle || pickupTitle || ''} ➔ গন্তব্য: ${activeBooking.destTitle || destTitle || ''}`
                    : 'সর্বোচ্চ চওড়া ভিউ • ফুলস্ক্রিন মোড'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 shadow-md cursor-pointer transition active:scale-95"
                title="ফুলস্ক্রিন থেকে প্রস্থান করুন"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>বন্ধ</span>
              </button>
            </div>
          </div>
        )}

        {/* 1. Floating Scroll Lock / Unlock Button directly on Map - Hidden on mobile as requested */}
        <div className="hidden sm:flex absolute top-2.5 right-2.5 z-20 flex-col items-end gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextState = !isScrollLocked;
              setIsScrollLocked(nextState);
              setShowLockNotification(true);
              if (lockNotificationTimerRef.current) clearTimeout(lockNotificationTimerRef.current);
              lockNotificationTimerRef.current = setTimeout(() => setShowLockNotification(false), 3000);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-md transition-colors duration-200 cursor-pointer active:scale-95 bg-black/25 hover:bg-black hover:border-black ${
              isScrollLocked
                ? 'text-amber-300 border-amber-400/50 hover:text-amber-300'
                : 'text-emerald-100 border-emerald-400/50 hover:text-emerald-100'
            }`}
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
            title={isScrollLocked ? 'ম্যাপ আনলক করতে ট্যাপ করুন' : 'ম্যাপ লক করতে ট্যাপ করুন'}
          >
            {isScrollLocked ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>🔒 স্ক্রল লক (পেজ টানুন)</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                <span>🔓 ম্যাপ সক্রিয় (ঘুরানো যাবে)</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Floating helper note when scroll is locked - Hidden on mobile */}
        {isScrollLocked && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setIsScrollLocked(false);
              setShowLockNotification(true);
              if (lockNotificationTimerRef.current) clearTimeout(lockNotificationTimerRef.current);
              lockNotificationTimerRef.current = setTimeout(() => setShowLockNotification(false), 3000);
            }}
            className="hidden sm:flex absolute bottom-2.5 left-2.5 z-20 bg-black/25 hover:bg-black hover:border-black text-white/95 px-2.5 py-1.5 rounded-xl border border-white/25 shadow-md items-center gap-2 cursor-pointer transition-colors duration-200 max-w-[280px]"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-ping" />
            <span className="text-[10px] sm:text-[11px] font-semibold text-white leading-tight">
              মোবাইলে পেজ আটকাবে না • ম্যাপ সরাতে <span className="text-amber-300 underline font-bold">আনলক</span> করুন
            </span>
          </div>
        )}

        {/* Temporary Notification Toast for lock state */}
        {showLockNotification && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-black/90 text-white text-[11px] sm:text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 shadow-xl flex items-center gap-2 animate-in fade-in max-w-[90%] text-center">
            {isScrollLocked ? (
              <>
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>🔒 স্ক্রল লক চালু: মোবাইলে ম্যাপ না আটকে পেজ সহজে স্ক্রল হবে।</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>🔓 ম্যাপ আনলক: এখন যেকোনো দিকে ম্যাপ টানতে ও জুম করতে পারবেন।</span>
              </>
            )}
          </div>
        )}

        {/* 3. Floating Route Distance & Live Stats Overlay (Responsive, Collapsible on Mobile, with Smooth Marquee) */}
        {((pickupCoords && destCoords && (pickupCoords.lat !== destCoords.lat || pickupCoords.lng !== destCoords.lng) && Boolean(calculatedDistance && calculatedDistance > 0)) || Boolean(activeBooking)) && (() => {
          const effectivePickup = activeBooking?.pickupTitle || pickupTitle || 'পিকআপ';
          const effectiveDest = activeBooking?.destTitle || destTitle || 'গন্তব্য';
          
          let effectiveDistance = activeBooking?.distanceKm || calculatedDistance || 1.2;
          let effectiveDuration = activeBooking?.etaMinutes || calculatedDurationMinutes || Math.max(2, Math.round(effectiveDistance * 2.5));

          if (activeBooking && activeBooking.status === 'in_transit') {
            const curLat = activeBooking.currentDriverLat || activeBooking.passengerLat || pickupCoords?.lat;
            const curLng = activeBooking.currentDriverLng || activeBooking.passengerLng || pickupCoords?.lng;
            const dLat = activeBooking.destLat || destCoords?.lat;
            const dLng = activeBooking.destLng || destCoords?.lng;
            if (curLat && curLng && dLat && dLng) {
              const liveDist = calculateDistanceKm(curLat, curLng, dLat, dLng);
              if (liveDist > 0) {
                effectiveDistance = Number(liveDist.toFixed(2));
                effectiveDuration = Math.max(1, calculateEtaMinutes(liveDist, 30));
              }
            }
          }

          let googleMapsUrl = '';
          let googleMapsLabel = 'গুগল ম্যাপে লাইভ রুট (GPS)';

          if (activeBooking) {
            if (activeBooking.status === 'in_transit') {
              const targetLat = activeBooking.destLat || destCoords?.lat;
              const targetLng = activeBooking.destLng || destCoords?.lng;
              if (targetLat && targetLng) {
                googleMapsUrl = userGps.isTracking && userGps.lat
                  ? `https://www.google.com/maps/dir/?api=1&origin=${userGps.lat},${userGps.lng}&destination=${targetLat},${targetLng}&travelmode=driving`
                  : `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}&travelmode=driving`;
                googleMapsLabel = 'গুগল ম্যাপে GPS (গন্তব্যের দিকে)';
              }
            } else {
              const targetLat = activeBooking.passengerLat || pickupCoords?.lat;
              const targetLng = activeBooking.passengerLng || pickupCoords?.lng;
              if (targetLat && targetLng) {
                googleMapsUrl = userGps.isTracking && userGps.lat
                  ? `https://www.google.com/maps/dir/?api=1&origin=${userGps.lat},${userGps.lng}&destination=${targetLat},${targetLng}&travelmode=driving`
                  : `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}&travelmode=driving`;
                googleMapsLabel = 'গুগল ম্যাপে GPS (পিকআপ পয়েন্টের দিকে)';
              }
            }
          }
          if (!googleMapsUrl && pickupCoords && destCoords) {
            googleMapsUrl = userGps.isTracking && userGps.lat
              ? `https://www.google.com/maps/dir/?api=1&origin=${userGps.lat},${userGps.lng}&destination=${destCoords.lat},${destCoords.lng}&travelmode=driving`
              : `https://www.google.com/maps/dir/?api=1&destination=${destCoords.lat},${destCoords.lng}&travelmode=driving`;
            googleMapsLabel = 'গুগল ম্যাপে লাইভ রুট (GPS)';
          }

          if (isRouteOverlayCollapsed) {
            return (
              <button
                type="button"
                onClick={() => setIsRouteOverlayCollapsed(false)}
                className="absolute top-2.5 left-2.5 z-20 bg-slate-900/85 hover:bg-slate-900 text-white rounded-xl px-3 py-1.5 shadow-lg border border-white/20 flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-all animate-in fade-in"
                title="রুট বিবরণ বড় করুন"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{toBengaliNumber(effectiveDistance)} কিমি রুট</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300 ml-0.5" />
              </button>
            );
          }

          return (
            <div 
              className="absolute top-2.5 left-2.5 z-20 bg-slate-950/80 hover:bg-slate-950/95 text-white rounded-2xl p-2.5 sm:p-3 shadow-xl border border-white/25 w-[260px] xs:w-[285px] sm:w-[320px] max-w-[calc(100vw-24px)] animate-in fade-in transition-all duration-200"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[11px] truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${activeBooking?.status === 'in_transit' ? 'bg-sky-400' : 'bg-emerald-400'}`}></span>
                  <span className="truncate">
                    {activeBooking 
                      ? (activeBooking.status === 'in_transit' ? '🟢 গন্তব্যের দিকে যাত্রা (Phase 2)' : '🚗 পিকআপের দিকে রওনা (Phase 1)') 
                      : 'রুট প্ল্যান ও নির্ভুল দূরত্ব'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsRouteOverlayCollapsed(true)}
                    className="p-1 hover:bg-white/20 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="সংক্ষেপ করুন (ম্যাপ দেখতে)"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  {onClearRoute && !activeBooking && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearRoute();
                      }}
                      className="p-1 hover:bg-white/20 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="রুট মুছুন"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-base sm:text-lg font-black text-white">
                  {toBengaliNumber(effectiveDistance)} কিমি
                </span>
                <span className="text-[11px] text-emerald-300 font-bold">
                  (~{toBengaliNumber(effectiveDuration)} মিনিট)
                </span>
                {activeBooking?.fare && (
                  <span className="text-[11px] text-amber-300 font-extrabold ml-auto bg-amber-400/20 px-1.5 py-0.5 rounded-md border border-amber-400/30">
                    ৳ {toBengaliNumber(activeBooking.fare)}
                  </span>
                )}
              </div>

              {/* Marquee Animated Full Route text */}
              <div className="border-t border-white/20 pt-1.5 overflow-hidden w-full">
                <AutoMarqueeText
                  text={activeBooking && activeBooking.status !== 'in_transit' ? `চালক ➔ পিকআপ: ${effectivePickup}` : `A: ${effectivePickup} ➔ B: ${effectiveDest}`}
                  className="text-[10.5px] font-bold text-slate-100"
                  speed={32}
                  pauseAtEndMs={1500}
                />
              </div>

              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-1.5 w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] py-1.5 px-2.5 rounded-xl transition-all shadow-md active:scale-98"
                >
                  <Navigation className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="truncate">{googleMapsLabel}</span>
                </a>
              )}
            </div>
          );
        })()}

        {/* Floating live legend at bottom-right (Semi-Transparent Frosted Glass) */}
        <div className="absolute bottom-2 right-2 z-20 bg-white/75 backdrop-blur-md rounded-xl p-2 shadow-md border border-slate-200/80 text-[10px] font-semibold space-y-1 hidden xs:block">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block border border-white"></span>
            <span>স্ট্যান্ড পয়েন্ট</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-white animate-pulse"></span>
            <span>লাইভ চালক (চলমান)</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-700">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block border border-white animate-pulse"></span>
            <span>লাইভ যাত্রী</span>
          </div>
          {userGps.lat && (
            <div className="flex items-center gap-1.5 text-sky-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block border border-white animate-ping"></span>
              <span>আমার অবস্থান</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Quick Hub Presets */}
      <div className="bg-white/95 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-xs flex-wrap gap-1.5 z-10">
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] w-full sm:w-auto">
          <span className="text-slate-500 font-bold text-[10px] shrink-0">দ্রুত ভিউ:</span>
          <button
            type="button"
            onClick={() => handleFlyTo(24.4536, 90.5479, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer shrink-0"
          >
            রেলওয়ে স্টেশন
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.4515, 90.5535, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer shrink-0"
          >
            পৌরসভা চত্বর
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.4627, 90.5429, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer shrink-0"
          >
            হাসপাতাল
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.4625, 90.5630, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer shrink-0"
          >
            শিবগঞ্জ
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.3325, 90.5825, 15)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer shrink-0"
          >
            পাগলা থানা
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.3387, 90.5883, 15)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer shrink-0"
          >
            দত্তেরবাজার
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.3738, 90.5918, 15)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer shrink-0"
          >
            কান্দিপাড়া
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.3854, 90.5362, 15)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer shrink-0"
          >
            মশাখালী
          </button>
        </div>

        <div className="text-[10px] text-slate-500 font-medium hidden md:block">
          ম্যাপের যেকোনো যানবাহনে ট্যাপ করে সরাসরি কল করুন
        </div>
      </div>
    </div>
  );
};
