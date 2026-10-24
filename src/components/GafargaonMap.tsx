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
  Unlock
} from 'lucide-react';
import { Stand, Driver, VehicleCategory } from '../types';
import { LiveDriverLocation, LivePassengerLocation } from '../services/liveLocationService';
import { toBengaliNumber } from '../utils/calculator';

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
    currentDriverLat: number;
    currentDriverLng: number;
    passengerLat: number;
    passengerLng: number;
    distanceKm: number;
    etaMinutes: number;
  } | null;

  onSelectPickupPlace?: (placeName: string) => void;
  onSelectDestPlace?: (placeName: string) => void;
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
  onSelectDestPlace
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'drivers' | 'passengers'>('all');
  
  // Mobile Scroll Lock: Default true on mobile (< 768px) to prevent scroll hijack
  const [isScrollLocked, setIsScrollLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [showLockNotification, setShowLockNotification] = useState<boolean>(false);
  const lockNotificationTimerRef = useRef<any>(null);

  // Gafargaon Center Coordinates
  const DEFAULT_CENTER: [number, number] = [24.5535, 90.5518];
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

    // A. Render Gafargaon Registered Stands
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
          <p style="font-size: 11px; color: #334155; margin: 0 0 6px 0;">সক্রিয় যানবাহন: <b>${toBengaliNumber(count)} জন</b></p>
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
      markersGroup.addLayer(marker);
    });

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
        vehicleModel: ld.vehicleModel,
        plateNumber: ld.plateNumber,
        standName: ld.standName,
        lat: ld.lat,
        lng: ld.lng,
        speed: ld.speed || 0,
        rating: ld.rating || 4.9,
        isLiveEdge: true
      });
    });

    // Plot Drivers if filter permits
    if (filterMode === 'all' || filterMode === 'drivers') {
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

        marker.on('click', () => {
          const matched = drivers.find(d => d.id === driver.id);
          if (matched) onSelectDriver(matched);
        });

        markersGroup.addLayer(marker);
      });
    }

    // C. Plot Live Passengers (from Cloudflare / Server)
    if (filterMode === 'all' || filterMode === 'passengers') {
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

    // E. Mutual Live Booking Tracking Line
    if (activeBooking) {
      const routePoints: [number, number][] = [
        [activeBooking.currentDriverLat, activeBooking.currentDriverLng],
        [
          (activeBooking.currentDriverLat + activeBooking.passengerLat) / 2 + 0.0006,
          (activeBooking.currentDriverLng + activeBooking.passengerLng) / 2 - 0.0005
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

      polyline.bindTooltip(`দূরত্ব: ${toBengaliNumber(activeBooking.distanceKm)} কিমি • পৌঁছাতে বাকি: ${toBengaliNumber(activeBooking.etaMinutes)} মিনিট`, {
        permanent: true,
        direction: 'center',
        className: 'route-distance-tooltip'
      });

      routePolylineRef.current = polyline;

      const bounds = L.latLngBounds([
        [activeBooking.currentDriverLat, activeBooking.currentDriverLng],
        [activeBooking.passengerLat, activeBooking.passengerLng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
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

      if (calculatedDistance != null && calculatedDurationMinutes != null) {
        polyline.bindTooltip(`দূরত্ব: ${toBengaliNumber(calculatedDistance)} কিমি • সময়: ${toBengaliNumber(calculatedDurationMinutes)} মিনিট`, {
          permanent: true,
          direction: 'center',
          className: 'route-distance-tooltip'
        });
      }

      routePolylineRef.current = polyline;

      const bounds = L.latLngBounds([
        [pickupCoords.lat, pickupCoords.lng],
        [destCoords.lat, destCoords.lng]
      ]);
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
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

  const handleResetCenter = () => {
    mapInstanceRef.current?.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1 });
  };

  const handleFlyTo = (lat: number, lng: number, zoom = 15) => {
    mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.2 });
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-3 z-[9999] shadow-2xl' : 'relative w-full'
      }`}
    >
      {/* Top Header Bar */}
      <div className="bg-slate-50/95 px-3 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-xs sm:text-sm">
            <Navigation className="w-4 h-4 text-emerald-600" />
            <span>গফরগাঁও লাইভ ম্যাপ</span>
          </div>

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

          {/* Filter Pills */}
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

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title={isFullscreen ? 'ম্যাপ স্বাভাবিক করুন' : 'ম্যাপ বড় করুন'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">{isFullscreen ? 'ছোট করুন' : 'ফুল ভিউ'}</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div 
        className="relative w-full h-[360px] sm:h-[420px] lg:h-[480px] bg-slate-100"
        onClick={() => {
          if (isScrollLocked) {
            setShowLockNotification(true);
            if (lockNotificationTimerRef.current) clearTimeout(lockNotificationTimerRef.current);
            lockNotificationTimerRef.current = setTimeout(() => setShowLockNotification(false), 3000);
          }
        }}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Scroll Lock / Unlock Button directly on Map */}
        <div className="absolute top-2.5 right-2.5 z-[400] flex flex-col items-end gap-1">
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
            className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-lg transition-all cursor-pointer backdrop-blur-md active:scale-95 ${
              isScrollLocked
                ? 'bg-slate-900/90 text-amber-300 border-amber-400/50 hover:bg-slate-900'
                : 'bg-emerald-700/95 text-white border-emerald-400/60 hover:bg-emerald-800'
            }`}
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

        {/* Floating helper note when scroll is locked */}
        {isScrollLocked && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setIsScrollLocked(false);
              setShowLockNotification(true);
              if (lockNotificationTimerRef.current) clearTimeout(lockNotificationTimerRef.current);
              lockNotificationTimerRef.current = setTimeout(() => setShowLockNotification(false), 3000);
            }}
            className="absolute bottom-2.5 left-2.5 z-[400] bg-slate-900/90 text-white px-2.5 py-1.5 rounded-xl border border-slate-700/80 shadow-md backdrop-blur-xs flex items-center gap-2 cursor-pointer hover:bg-slate-950 transition max-w-[280px]"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-ping" />
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-200 leading-tight">
              মোবাইলে পেজ আটকাবে না • ম্যাপ সরাতে <span className="text-amber-300 underline font-bold">আনলক</span> করুন
            </span>
          </div>
        )}

        {/* Temporary Notification Toast for lock state */}
        {showLockNotification && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[410] bg-slate-900/95 text-white text-[11px] sm:text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in max-w-[90%] text-center">
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

        {/* Floating Route Distance & Live Stats Overlay when pickup & dest are set */}
        {pickupCoords && destCoords && calculatedDistance != null && (
          <div className="absolute top-2.5 left-2.5 z-[400] bg-slate-900/90 text-white backdrop-blur-sm rounded-xl p-2.5 shadow-xl border border-emerald-500/40 max-w-[280px] animate-in fade-in">
            <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[11px] mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>রুট প্ল্যান ও নির্ভুল দূরত্ব</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-black text-white">
                {toBengaliNumber(calculatedDistance)} কিমি
              </span>
              <span className="text-[11px] text-emerald-300 font-bold">
                (~{toBengaliNumber(calculatedDurationMinutes || 5)} মিনিট)
              </span>
            </div>
            <div className="text-[10px] text-slate-300 truncate mt-1 border-t border-slate-700/60 pt-1">
              <span className="text-emerald-400 font-bold">A:</span> {pickupTitle?.slice(0, 18) || 'পিকআপ'} ➔ <span className="text-red-400 font-bold">B:</span> {destTitle?.slice(0, 18) || 'গন্তব্য'}
            </div>
          </div>
        )}

        {/* Floating live legend at bottom-right */}
        <div className="absolute bottom-2 right-2 z-[400] bg-white/95 backdrop-blur-xs rounded-xl p-2 shadow-md border border-slate-200 text-[10px] font-semibold space-y-1 hidden xs:block">
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
            onClick={() => handleFlyTo(24.5535, 90.5518, 15)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            গফরগাঁও
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.5562, 90.5539, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            পৌরসভা
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.5518, 90.5512, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            রেলওয়ে স্টেশন
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.5585, 90.5482, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            হাসপাতাল
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.4530, 90.5050, 15)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            পাগলা
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.5630, 90.5620, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            শিবগঞ্জ
          </button>
        </div>

        <div className="text-[10px] text-slate-500 font-medium hidden md:block">
          ম্যাপের যেকোনো যানবাহনে ট্যাপ করে সরাসরি কল করুন
        </div>
      </div>
    </div>
  );
};
