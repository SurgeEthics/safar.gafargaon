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
  X,
  Crosshair,
  Globe,
  Satellite,
  Map as MapIcon,
  PlusCircle,
  Loader2
} from 'lucide-react';
import { Stand, Driver, VehicleCategory } from '../types';
import { LiveDriverLocation, LivePassengerLocation } from '../services/liveLocationService';
import { toBengaliNumber, calculateDistanceKm } from '../utils/calculator';
import {
  GAFARGAON_CORE_BOUNDS,
  GAFARGAON_SERVICE_BOUNDS,
  GAFARGAON_CENTER,
  PlaceReferenceCandidate,
  clampToGafargaonServiceArea,
  isValidCoordinatePair
} from '../utils/gafargaonGeo';
import { reverseGeocodeFree } from '../services/freeMapSearchService';
import { GAFARGAON_UNIONS } from '../data/gafargaonUnionData';
import {
  GafargaonPlace,
  PLACE_CATEGORY_OPTIONS,
  PlaceCategory,
  STATIC_GAFARGAON_PLACE_IDS
} from '../data/gafargaonPlaces';
import {
  buildAdminPlaceAndStandPayloads,
  CategoryMetaCandidate,
  computeStandVehicleTypesSummary,
  filterCustomMapPlaces,
  parseGoogleMapsCoordinates,
  resolveDriverMapPosition,
  resolveVehicleCategoryMeta
} from '../utils/adminPersistence';
import { AutoMarqueeText } from './AutoMarqueeText';
import { PauseMarqueeText } from './PauseMarqueeText';

export type MapLayerMode = 'standard' | 'satellite';

interface GafargaonMapProps {
  // Static/Fallback drivers & stands
  drivers: Driver[];
  stands: Stand[];
  categories?: CategoryMetaCandidate[];
  
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
    pickupLandmark?: string;
    destTitle?: string;
    distanceKm: number;
    etaMinutes: number;
    fare?: number;
    status?: 'en_route' | 'arrived' | 'in_transit' | 'completed';
  } | null;

  isTripActive?: boolean;
  activeDriverId?: string;

  onSelectPickupPlace?: (placeName: string, coords?: { lat: number; lng: number }) => void;
  onSelectDestPlace?: (placeName: string, coords?: { lat: number; lng: number }) => void;
  onClearRoute?: () => void;

  // Expanded area places & interactive pin-to-save support
  allPlaces?: PlaceReferenceCandidate[];
  popularPlaces?: GafargaonPlace[];
  externalPinRequest?: { mode: 'none' | 'pickup' | 'dest'; triggerId: number };
  onSaveCustomPlace?: (place: {
    id: string;
    name: string;
    bengaliName: string;
    category: PlaceCategory;
    area: string;
    lat: number;
    lng: number;
    isPopular?: boolean;
    showOnMap?: boolean;
  }) => void;
  onSaveCustomStand?: (stand: {
    id: string;
    name: string;
    bengaliName: string;
    area: string;
    location: string;
    lat: number;
    lng: number;
    activeDrivers: number;
    isPopular?: boolean;
  }) => void;
}

export const GafargaonMap: React.FC<GafargaonMapProps> = ({
  drivers,
  stands,
  categories = [],
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
  activeDriverId,
  allPlaces = [],
  popularPlaces = [],
  externalPinRequest,
  onSaveCustomPlace,
  onSaveCustomStand
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayTileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayTransportLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'drivers' | 'passengers'>('all');
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState<string>('all');
  const [mapLayer, setMapLayer] = useState<MapLayerMode>('standard');
  const [isLandscapeMode, setIsLandscapeMode] = useState<boolean>(false);

  // Interactive Tap-to-Pin state
  const [pinMode, setPinMode] = useState<'none' | 'pickup' | 'dest'>('none');
  const [droppedPin, setDroppedPin] = useState<{
    lat: number;
    lng: number;
    title: string;
    subtitle: string;
    unionName: string;
    isResolving: boolean;
  } | null>(null);
  const [isAdminPinSaveModalOpen, setIsAdminPinSaveModalOpen] = useState<boolean>(false);
  const [adminPinSaveTarget, setAdminPinSaveTarget] = useState<'both' | 'place' | 'stand'>('both');
  const [adminPinCoordInput, setAdminPinCoordInput] = useState<string>('');
  const [adminPinForm, setAdminPinForm] = useState<{
    bengaliName: string;
    name: string;
    category: PlaceCategory;
    area: string;
    lat: number;
    lng: number;
  }>({
    bengaliName: '',
    name: '',
    category: 'স্ট্যান্ড',
    area: GAFARGAON_UNIONS[0].nameBengali,
    lat: 24.4536,
    lng: 90.5479
  });
  
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

  // Refs so Leaflet click handler always accesses fresh callbacks/state without re-creating map
  const pinModeRef = useRef(pinMode);
  pinModeRef.current = pinMode;
  const isScrollLockedRef = useRef(isScrollLocked);
  isScrollLockedRef.current = isScrollLocked;
  const isTripActiveRef = useRef(isTripCurrentlyActive);
  isTripActiveRef.current = isTripCurrentlyActive;
  const allPlacesRef = useRef(allPlaces);
  allPlacesRef.current = allPlaces;
  const onSelectPickupPlaceRef = useRef(onSelectPickupPlace);
  onSelectPickupPlaceRef.current = onSelectPickupPlace;
  const onSelectDestPlaceRef = useRef(onSelectDestPlace);
  onSelectDestPlaceRef.current = onSelectDestPlace;

  // Gafargaon Center Coordinates (Exact Google Maps Location)
  const DEFAULT_CENTER: [number, number] = [GAFARGAON_CENTER.lat, GAFARGAON_CENTER.lng];
  const DEFAULT_ZOOM = 14;

  const isValidLatLng = (lat: unknown, lng: unknown): lat is number =>
    isValidCoordinatePair(lat, lng);

  // Sync external Tap-to-Pin triggers (e.g. from Pickup/Destination Autocomplete)
  useEffect(() => {
    if (externalPinRequest && externalPinRequest.triggerId > 0) {
      if (externalPinRequest.mode === 'pickup' || externalPinRequest.mode === 'dest') {
        setPinMode(externalPinRequest.mode);
        setIsScrollLocked(false);
        setDroppedPin(null);
      } else {
        setPinMode('none');
      }
    }
  }, [externalPinRequest]);

  // 1. Initialize Leaflet Map with strict Gafargaon-Pagla + 3-4km border bounds
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id != null) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }

      const serviceBounds = L.latLngBounds(
        [GAFARGAON_SERVICE_BOUNDS.south, GAFARGAON_SERVICE_BOUNDS.west],
        [GAFARGAON_SERVICE_BOUNDS.north, GAFARGAON_SERVICE_BOUNDS.east]
      );

      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 12,
        maxZoom: 19,
        maxBounds: serviceBounds,
        maxBoundsViscosity: 1.0,
        attributionControl: false,
        zoomControl: true,
        scrollWheelZoom: !isScrollLocked,
        touchZoom: !isScrollLocked,
        dragging: !isScrollLocked
      });

      // Service Zone Boundary Visual Guide (Gafargaon + Pagla + 3-4km border buffer)
      L.rectangle(serviceBounds, {
        color: '#0d9488',
        weight: 2,
        dashArray: '8, 6',
        fillColor: '#0d9488',
        fillOpacity: 0.02,
        interactive: false
      }).addTo(map);

      // Core Upazila Reference Outline
      L.rectangle(
        [
          [GAFARGAON_CORE_BOUNDS.south, GAFARGAON_CORE_BOUNDS.west],
          [GAFARGAON_CORE_BOUNDS.north, GAFARGAON_CORE_BOUNDS.east]
        ],
        {
          color: '#059669',
          weight: 1.2,
          opacity: 0.35,
          dashArray: '4, 6',
          fill: false,
          interactive: false
        }
      ).addTo(map);

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

      // Interactive Tap-to-Pin on Map Click
      map.on('click', async (ev: L.LeafletMouseEvent) => {
        const currentPinMode = pinModeRef.current;
        if (isScrollLockedRef.current && currentPinMode === 'none') {
          return;
        }
        if (isTripActiveRef.current && currentPinMode === 'none') {
          return;
        }

        const clamped = clampToGafargaonServiceArea(ev.latlng.lat, ev.latlng.lng);
        setDroppedPin({
          lat: clamped.lat,
          lng: clamped.lng,
          title: 'লোকেশন শনাক্ত করা হচ্ছে...',
          subtitle: `${clamped.lat.toFixed(14)}, ${clamped.lng.toFixed(14)}`,
          unionName: '',
          isResolving: true
        });

        const geo = await reverseGeocodeFree(clamped.lat, clamped.lng, allPlacesRef.current);
        setDroppedPin({
          lat: geo.lat,
          lng: geo.lng,
          title: geo.title,
          subtitle: geo.subtitle,
          unionName: geo.unionName,
          isResolving: false
        });
        const matchedUnion = GAFARGAON_UNIONS.find(
          (u) =>
            geo.unionName?.includes(u.nameBengali) ||
            geo.unionName?.includes(u.nameBengali.replace(' ইউনিয়ন', '').replace(' (পাগলা)', ''))
        );
        setAdminPinForm({
          bengaliName: geo.title,
          name: '',
          category: 'স্ট্যান্ড',
          area: matchedUnion ? matchedUnion.nameBengali : GAFARGAON_UNIONS[0].nameBengali,
          lat: Number(geo.lat.toFixed(14)),
          lng: Number(geo.lng.toFixed(14))
        });

        if (currentPinMode === 'pickup' && onSelectPickupPlaceRef.current) {
          onSelectPickupPlaceRef.current(geo.title, { lat: geo.lat, lng: geo.lng });
          setPinMode('none');
        } else if (currentPinMode === 'dest' && onSelectDestPlaceRef.current) {
          onSelectDestPlaceRef.current(geo.title, { lat: geo.lat, lng: geo.lng });
          setPinMode('none');
        }
      });

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

  // Switch Base & Hybrid Overlay Tile Layers Dynamically (100% Free Multi-Layer, Zero Watermark)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (overlayTileLayerRef.current) {
      map.removeLayer(overlayTileLayerRef.current);
      overlayTileLayerRef.current = null;
    }
    if (overlayTransportLayerRef.current) {
      map.removeLayer(overlayTransportLayerRef.current);
      overlayTransportLayerRef.current = null;
    }

    if (mapLayer === 'satellite') {
      baseTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          minZoom: 12
        }
      ).addTo(map);
      overlayTransportLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          minZoom: 12,
          pane: 'overlayPane'
        }
      ).addTo(map);
      overlayTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          minZoom: 12,
          pane: 'overlayPane'
        }
      ).addTo(map);
    } else {
      baseTileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          minZoom: 12
        }
      ).addTo(map);
    }
  }, [mapLayer]);

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

  // Render Dropped Interactive Pin Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
      pinMarkerRef.current = null;
    }
    if (!droppedPin) return;

    const pinIcon = L.divIcon({
      className: 'custom-tap-pin-marker',
      html: `
        <div style="position: relative; pointer-events: none;">
          <div style="position: absolute; width: 46px; height: 46px; border-radius: 50%; background: rgba(13, 148, 136, 0.35); animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite; top: -7px; left: -7px;"></div>
          <div style="background-color: #0f766e; color: white; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 14px rgba(0,0,0,0.45); border: 2.5px solid #ffffff;">
            <span style="transform: rotate(45deg); font-size: 14px; line-height: 1;">📍</span>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    pinMarkerRef.current = L.marker([droppedPin.lat, droppedPin.lng], { icon: pinIcon }).addTo(map);
  }, [droppedPin]);

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

    // Helper: Dynamic Category badge styling using Admin-configured categories + fallback
    const activeCategoriesList = categories && categories.length > 0 ? categories : undefined;
    const getCategoryDetails = (cat: string) => resolveVehicleCategoryMeta(cat, activeCategoriesList);

    // A. Render Gafargaon Registered Stands (HIDDEN when ride request or trip is active!)
    if (!isTripCurrentlyActive) {
      stands.forEach((stand) => {
        if (!isValidLatLng(stand.lat, stand.lng)) return;
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
        const standBn = (stand as any).bengaliName || stand.nameBn || stand.name || 'স্ট্যান্ড';
        const standSummary = computeStandVehicleTypesSummary(standBn, activeCategoriesList, drivers as any);
        const typeChipsHtml = standSummary.typeNames
          .slice(0, 10)
          .map(
            (name) =>
              `<span style="display:inline-block;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;border-radius:9999px;padding:1px 6px;font-size:9.5px;font-weight:700;">${name}</span>`
          )
          .join('');

        marker.bindPopup(`
          <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px; min-width: 195px; max-width: 245px;">
            <h4 style="font-weight: 800; color: #065f46; margin: 0 0 4px 0; font-size: 13.5px;">${standBn}</h4>
            <p style="font-size: 11px; color: #334155; margin: 0 0 4px 0;">
              সক্রিয় যানবাহন: <b>${toBengaliNumber(standSummary.typeCount)} প্রকার</b>
              ${standSummary.driverCountAtStand > 0 ? ` • চালক: <b>${toBengaliNumber(standSummary.driverCountAtStand)} জন</b>` : ''}
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:3px;margin:0 0 7px 0;">
              ${typeChipsHtml}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <button onclick="window.__selectPickupPlace && window.__selectPickupPlace('${standBn.replace(/'/g, "\\'")}', ${stand.lat}, ${stand.lng})" 
                      style="width: 100%; background: #059669; color: white; border: none; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                🚖 এই স্ট্যান্ড পিকআপ করুন
              </button>
              <button onclick="window.__selectDestPlace && window.__selectDestPlace('${standBn.replace(/'/g, "\\'")}', ${stand.lat}, ${stand.lng})" 
                      style="width: 100%; background: #dc2626; color: white; border: none; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                🎯 এখানে যাব (গন্তব্য করুন)
              </button>
            </div>
          </div>
        `);

        marker.bindTooltip(`
          <div style="font-family: 'Hind Siliguri', sans-serif; font-weight: 700; font-size: 11px; padding: 1px 4px;">
            📍 ${standBn} • <span style="color: #059669; font-weight: 800;">সক্রিয় যানবাহন: ${toBengaliNumber(standSummary.typeCount)} প্রকার</span>
          </div>
        `, { direction: 'top', offset: [0, -32], opacity: 0.95 });

        markersGroup.addLayer(marker);
      });

      // A2. Render Admin-Added / Custom Popular Places as Green Map Pins (deduplicated against stands)
      const customMapPlaces = filterCustomMapPlaces(popularPlaces, stands, STATIC_GAFARGAON_PLACE_IDS);
      customMapPlaces.forEach((place) => {
        if (!isValidLatLng(place.lat, place.lng)) return;
        const placePinIcon = L.divIcon({
          className: 'custom-stand-marker custom-popular-place-marker',
          html: `
            <div style="background-color: #065f46; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid #ffffff; cursor: pointer;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -34]
        });

        const placeMarker = L.marker([place.lat, place.lng], { icon: placePinIcon });
        const placeBn = place.bengaliName || place.name || 'নতুন স্থান';
        const safePlaceBn = placeBn.replace(/'/g, "\\'");
        const catLabel = place.category || 'জনপ্রিয় স্থান';
        const areaLabel = place.area || 'গফরগাঁও';
        const placeSummary = computeStandVehicleTypesSummary(placeBn, activeCategoriesList, drivers as any);

        placeMarker.bindPopup(`
          <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px; min-width: 185px;">
            <h4 style="font-weight: 800; color: #065f46; margin: 0 0 3px 0; font-size: 13.5px;">${placeBn}</h4>
            <p style="font-size: 10.5px; color: #334155; margin: 0 0 4px 0;">
              <span style="background: #ecfdf5; color: #065f46; font-weight: 700; padding: 1px 5px; border-radius: 4px; border: 1px solid #a7f3d0;">${catLabel}</span>
              • ${areaLabel}
            </p>
            <p style="font-size: 11px; color: #334155; margin: 0 0 6px 0;">সক্রিয় যানবাহন: <b>${toBengaliNumber(placeSummary.typeCount)} প্রকার</b></p>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <button onclick="window.__selectPickupPlace && window.__selectPickupPlace('${safePlaceBn}', ${place.lat}, ${place.lng})"
                      style="width: 100%; background: #059669; color: white; border: none; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                📍 এই স্থান পিকআপ করুন
              </button>
              <button onclick="window.__selectDestPlace && window.__selectDestPlace('${safePlaceBn}', ${place.lat}, ${place.lng})"
                      style="width: 100%; background: #dc2626; color: white; border: none; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                🎯 এখানে যাব (গন্তব্য করুন)
              </button>
            </div>
          </div>
        `);

        placeMarker.bindTooltip(`
          <div style="font-family: 'Hind Siliguri', sans-serif; font-weight: 700; font-size: 11px; padding: 1px 4px;">
            📍 ${placeBn} <span style="color: #059669; font-weight: 800;">(${catLabel} • সক্রিয় যানবাহন: ${toBengaliNumber(placeSummary.typeCount)} প্রকার)</span>
          </div>
        `, { direction: 'top', offset: [0, -32], opacity: 0.95 });

        markersGroup.addLayer(placeMarker);
      });
    }

    // B. Combine Server Live Drivers with Seed/Registered Drivers for maximum coverage
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

    // First populate fallback / registered drivers
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
        isLiveEdge: (d as any).isAvailable !== false
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
      const standDriverCounters = new Map<string, number>();

      displayedDriversMap.forEach((driver) => {
        if (vehicleCategoryFilter !== 'all' && driver.category !== vehicleCategoryFilter) {
          return;
        }
        const standKey = (driver.standName || 'default').trim().toLowerCase();
        const standIdx = standDriverCounters.get(standKey) || 0;
        standDriverCounters.set(standKey, standIdx + 1);

        const resolvedPos = resolveDriverMapPosition(driver, stands, standIdx);
        if (!isValidLatLng(resolvedPos.lat, resolvedPos.lng)) return;

        const catInfo = getCategoryDetails(driver.category);
        const isSelected = selectedDriver?.id === driver.id;
        const safeStandName = (driver.standName || resolvedPos.matchedStandName || 'গফরগাঁও স্ট্যান্ড').replace(/'/g, "\\'");

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

        const marker = L.marker([resolvedPos.lat, resolvedPos.lng], { icon: driverIcon });

        marker.bindPopup(`
          <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px; min-width: 195px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; gap: 4px;">
              <span style="font-size: 10px; background: #ecfdf5; color: #047857; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">
                ${driver.isLiveEdge ? '⚡ সক্রিয় লাইভ' : '📍 নিবন্ধিত চালক'}
              </span>
              <span style="font-size: 10px; background: ${catInfo.color}18; color: ${catInfo.color}; font-weight: 800; padding: 1px 6px; border-radius: 4px; border: 1px solid ${catInfo.color}40;">
                ${catInfo.symbol} ${catInfo.name}
              </span>
              <span style="font-size: 11px; color: #d97706; font-weight: 800;">★ ${toBengaliNumber(driver.rating)}</span>
            </div>
            <h4 style="font-weight: 800; color: #0f172a; margin: 2px 0 2px 0; font-size: 13px;">${driver.name}</h4>
            <div style="font-size: 11px; color: #0284c7; font-weight: 700; margin-bottom: 2px;">${driver.vehicleModel || catInfo.name}</div>
            <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">স্ট্যান্ড: ${driver.standName || resolvedPos.matchedStandName || 'গফরগাঁও'} • গতি: ${toBengaliNumber(driver.speed)} কিমি/ঘণ্টা</div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <a href="tel:${(driver.phone || '').replace(/[^0-9]/g, '')}" 
                 style="display: block; text-align: center; background: #059669; color: white; padding: 5px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; text-decoration: none;">
                📞 সরাসরি কল করুন (${driver.phone || ''})
              </a>
              <button onclick="window.__selectPickupPlace && window.__selectPickupPlace('${safeStandName}', ${resolvedPos.lat}, ${resolvedPos.lng})"
                      style="display: block; width: 100%; text-align: center; background-color: #ecfdf5; color: #047857; padding: 4px 8px; border-radius: 6px; border: 1px solid #a7f3d0; font-size: 10.5px; font-weight: 700; cursor: pointer;">
                🚖 এই স্ট্যান্ড পিকআপ করুন
              </button>
              <button onclick="window.__selectDestPlace && window.__selectDestPlace('${safeStandName}', ${resolvedPos.lat}, ${resolvedPos.lng})"
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
            <span style="color: ${catInfo.color}; font-size: 10px;">(${catInfo.name})</span>
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
        if (!isValidLatLng(passenger.lat, passenger.lng)) return;
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
    const gpsLat = userGps.lat;
    const gpsLng = userGps.lng;
    if (typeof gpsLat === 'number' && Number.isFinite(gpsLat) && typeof gpsLng === 'number' && Number.isFinite(gpsLng)) {
      // Accuracy circle
      const accCircle = L.circle([gpsLat, gpsLng], {
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

      const myMarker = L.marker([gpsLat, gpsLng], { icon: myBeaconIcon });
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

    // E. Mutual Live Booking Tracking Line & Markers (Two-Phase Real Trip Workflow)
    if (activeBooking) {
      const catDetails = getCategoryDetails(activeBooking.driverCategory);
      const isInTransit = activeBooking.status === 'in_transit';
      const safeDriverLat = isValidLatLng(activeBooking.currentDriverLat, activeBooking.currentDriverLng)
        ? Number(activeBooking.currentDriverLat)
        : DEFAULT_CENTER[0];
      const safeDriverLng = isValidLatLng(activeBooking.currentDriverLat, activeBooking.currentDriverLng)
        ? Number(activeBooking.currentDriverLng)
        : DEFAULT_CENTER[1];
      const safePassLat = isValidLatLng(activeBooking.passengerLat, activeBooking.passengerLng)
        ? Number(activeBooking.passengerLat)
        : (isValidLatLng(pickupCoords?.lat, pickupCoords?.lng) ? Number(pickupCoords!.lat) : DEFAULT_CENTER[0]);
      const safePassLng = isValidLatLng(activeBooking.passengerLat, activeBooking.passengerLng)
        ? Number(activeBooking.passengerLng)
        : (isValidLatLng(pickupCoords?.lat, pickupCoords?.lng) ? Number(pickupCoords!.lng) : DEFAULT_CENTER[1]);
      const rawDestLat = activeBooking.destLat ?? destCoords?.lat;
      const rawDestLng = activeBooking.destLng ?? destCoords?.lng;
      const effectiveDestLat: number | undefined = isValidLatLng(rawDestLat, rawDestLng) ? Number(rawDestLat) : undefined;
      const effectiveDestLng: number | undefined = isValidLatLng(rawDestLat, rawDestLng) ? Number(rawDestLng) : undefined;

      // Calculate accurate dynamic distance for Phase 2 (remaining distance to destination) vs Phase 1 (to pickup)
      const targetMarkerLat = isInTransit ? effectiveDestLat : safePassLat;
      const targetMarkerLng = isInTransit ? effectiveDestLng : safePassLng;
      const phaseRemainingKm = (typeof targetMarkerLat === 'number' && Number.isFinite(targetMarkerLat) && typeof targetMarkerLng === 'number' && Number.isFinite(targetMarkerLng))
        ? calculateDistanceKm(safeDriverLat, safeDriverLng, targetMarkerLat, targetMarkerLng)
        : (Number.isFinite(Number(activeBooking.distanceKm)) ? Number(activeBooking.distanceKm) : 1.2);
      const phaseRemainingEta = Math.max(1, Math.round(phaseRemainingKm * 2.5));

      // 1. Driver Marker (Shows Driver Recent Photo if available, Driver Name on Top, and Dynamic Status Badge)
      const driverLiveIcon = L.divIcon({
        className: 'custom-active-driver-tracking-marker',
        html: `
          <div style="position: relative; cursor: pointer;">
            <!-- Outer Pulsing Radar Ring -->
            <div style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: ${isInTransit ? 'rgba(5, 150, 105, 0.45)' : 'rgba(217, 119, 6, 0.45)'}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite; top: -5px; left: -5px;"></div>
            
            <!-- TOP PILL: Driver's Real Name -->
            <div style="
              position: absolute;
              top: -22px;
              left: 50%;
              transform: translateX(-50%);
              background: #0f172a;
              color: #ffffff;
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
              padding: 1.5px 7px;
              border-radius: 9999px;
              border: 1.5px solid ${isInTransit ? '#34d399' : '#facc15'};
              box-shadow: 0 2px 6px rgba(0,0,0,0.6);
              max-width: 130px;
              overflow: hidden;
              text-overflow: ellipsis;
            ">
              ${activeBooking.driverName || 'চালক'}
            </div>

            <!-- CENTER: Driver Recent Photo or Vehicle Category Icon -->
            <div style="
              width: 40px;
              height: 40px;
              border-radius: 50%;
              overflow: hidden;
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
              border: 3px solid ${isInTransit ? '#10b981' : '#facc15'};
              background: #0f172a;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${activeBooking.driverPhoto ? `
                <img src="${activeBooking.driverPhoto}" alt="${activeBooking.driverName || 'চালক'}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div style="display: none; width: 100%; height: 100%; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; align-items: center; justify-content: center; font-size: 16px; font-weight: 900;">
                  ${catDetails.symbol}
                </div>
              ` : `
                <div style="width: 100%; height: 100%; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900;">
                  ${catDetails.symbol}
                </div>
              `}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24]
      });

      const bDriverMarker = L.marker([safeDriverLat, safeDriverLng], { icon: driverLiveIcon });

      const gpsDestUrl = isInTransit && isValidLatLng(effectiveDestLat, effectiveDestLng)
        ? `https://www.google.com/maps/dir/?api=1&origin=${safeDriverLat},${safeDriverLng}&destination=${effectiveDestLat},${effectiveDestLng}&travelmode=driving`
        : `https://www.google.com/maps/dir/?api=1&origin=${safeDriverLat},${safeDriverLng}&destination=${safePassLat},${safePassLng}&travelmode=driving`;
      const gpsDestLabel = isInTransit
        ? 'গুগল ম্যাপে GPS (গন্তব্যের দিকে)'
        : 'গুগল ম্যাপে GPS (পিকআপ পয়েন্টের দিকে)';

      bDriverMarker.bindPopup(`
        <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px; min-width: 215px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; background: ${isInTransit ? '#ecfdf5' : '#fef3c7'}; color: ${isInTransit ? '#047857' : '#b45309'}; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid ${isInTransit ? '#a7f3d0' : '#fde68a'};">
              ${isInTransit ? '🟢 গন্তব্যের দিকে যাত্রা চলছে' : '🟡 চালক পিকআপের দিকে রওনা হয়েছেন'}
            </span>
            <span style="font-size: 11px; color: #0284c7; font-weight: 800;">${phaseRemainingKm} কিমি</span>
          </div>
          <h4 style="font-weight: 900; color: #0f172a; margin: 2px 0; font-size: 14px;">${activeBooking.driverName || 'চালক'}</h4>
          <div style="font-size: 11px; color: #475569; margin-bottom: 5px;">বাহন: <b>${catDetails.name}</b> • বাকি: <b>~${phaseRemainingEta} মিনিট</b></div>
          <a href="tel:${(activeBooking.driverPhone || '').replace(/[^0-9]/g, '')}" 
             style="display: block; text-align: center; background: #059669; color: white; padding: 6px 10px; border-radius: 8px; font-weight: 800; font-size: 11.5px; text-decoration: none; margin-bottom: 4px;">
            📞 চালককে সরাসরি কল (${activeBooking.driverPhone || ''})
          </a>
          <a href="${gpsDestUrl}"
             target="_blank" rel="noopener noreferrer"
             style="display: block; text-align: center; background: #2563eb; color: white; padding: 6px 10px; border-radius: 8px; font-weight: 800; font-size: 11px; text-decoration: none;">
            🗺️ ${gpsDestLabel}
          </a>
        </div>
      `);
      bDriverMarker.bindTooltip(`🚗 ${activeBooking.driverName || 'চালক'}: ${isInTransit ? 'গন্তব্যের দিকে যাত্রা চলছে' : 'পিকআপে আসছেন'} (~${phaseRemainingEta} মি.)`, { direction: 'top', offset: [0, -24], opacity: 0.95 });
      markersGroup.addLayer(bDriverMarker);

      // TWO-PHASE SEPARATION:
      if (!isInTransit) {
        // PHASE 1: Driver -> Pickup Location (Only Driver and Pickup Point A)
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
        const bPassMarker = L.marker([safePassLat, safePassLng], { icon: passPickupIcon });
        const passTooltip = activeBooking.pickupLandmark
          ? `📍 পিকআপ (A): ${activeBooking.pickupTitle || pickupTitle || 'যাত্রী পিকআপ'} (${activeBooking.pickupLandmark})`
          : `📍 পিকআপ (A): ${activeBooking.pickupTitle || pickupTitle || 'যাত্রী পিকআপ'}`;
        bPassMarker.bindTooltip(passTooltip, { direction: 'top', offset: [0, -18] });
        markersGroup.addLayer(bPassMarker);

        // Phase 1 Route Line (Driver -> Pickup Point A)
        const phase1Points: [number, number][] = [
          [safeDriverLat, safeDriverLng],
          [
            (safeDriverLat + safePassLat) / 2 + 0.0004,
            (safeDriverLng + safePassLng) / 2 - 0.0003
          ],
          [safePassLat, safePassLng]
        ];

        const polyline = L.polyline(phase1Points, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.9,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(map);

        routePolylineRef.current = polyline;

        // Auto fit bounds for Phase 1: Driver + Pickup only
        const bookingSessionKey = `${activeBooking.driverPhone || 'driver'}_phase1_${(activeBooking.pickupTitle || '').slice(0, 8)}`;
        if (!userInteractedRef.current && lastFittedBookingIdRef.current !== bookingSessionKey) {
          lastFittedBookingIdRef.current = bookingSessionKey;
          try {
            const bounds = L.latLngBounds([
              [safeDriverLat, safeDriverLng],
              [safePassLat, safePassLng]
            ]);
            map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
          } catch {}
        }
      } else {
        // PHASE 2: Passenger Boarded ("গাড়িতে উঠেছি") -> Destination Point B
        if (isValidLatLng(effectiveDestLat, effectiveDestLng)) {
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
          const destLatNum = Number(effectiveDestLat);
          const destLngNum = Number(effectiveDestLng);
          const bDestMarker = L.marker([destLatNum, destLngNum], { icon: destIcon });
          bDestMarker.bindTooltip(`🏁 গন্তব্য (B): ${activeBooking.destTitle || destTitle || 'গন্তব্য স্থান'}`, { direction: 'top', offset: [0, -18] });
          markersGroup.addLayer(bDestMarker);

          // Phase 2 Route Line (Driver with passenger -> Destination B)
          const phase2Points: [number, number][] = [
            [safeDriverLat, safeDriverLng],
            [
              (safeDriverLat + destLatNum) / 2 + 0.0003,
              (safeDriverLng + destLngNum) / 2 - 0.0003
            ],
            [destLatNum, destLngNum]
          ];

          const polyline = L.polyline(phase2Points, {
            color: '#059669',
            weight: 5,
            opacity: 0.9,
            dashArray: '8, 8',
            lineCap: 'round'
          }).addTo(map);

          routePolylineRef.current = polyline;

          // Auto fit bounds for Phase 2: Driver + Destination only
          const bookingSessionKey = `${activeBooking.driverPhone || 'driver'}_phase2_${(activeBooking.destTitle || '').slice(0, 8)}`;
          if (!userInteractedRef.current && lastFittedBookingIdRef.current !== bookingSessionKey) {
            lastFittedBookingIdRef.current = bookingSessionKey;
            try {
              const bounds = L.latLngBounds([
                [safeDriverLat, safeDriverLng],
                [destLatNum, destLngNum]
              ]);
              map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
            } catch {}
          }
        }
      }
    }
    // F. Route Planning Preview (A to B)
    else if (
      pickupCoords &&
      destCoords &&
      isValidLatLng(pickupCoords.lat, pickupCoords.lng) &&
      isValidLatLng(destCoords.lat, destCoords.lng) &&
      (pickupCoords.lat !== destCoords.lat || pickupCoords.lng !== destCoords.lng)
    ) {
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
      const routeKey = `${Number(pickupCoords.lat || 0).toFixed(4)},${Number(pickupCoords.lng || 0).toFixed(4)}->${Number(destCoords.lat || 0).toFixed(4)},${Number(destCoords.lng || 0).toFixed(4)}`;
      if (!userInteractedRef.current && lastFittedRouteKeyRef.current !== routeKey) {
        lastFittedRouteKeyRef.current = routeKey;
        try {
          const bounds = L.latLngBounds([
            [pickupCoords.lat, pickupCoords.lng],
            [destCoords.lat, destCoords.lng]
          ]);
          map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
        } catch {}
      }
    } else {
      // Clear route fitted key when no route is active
      lastFittedRouteKeyRef.current = '';
    }
  }, [
    drivers,
    stands,
    categories,
    popularPlaces,
    liveDrivers,
    livePassengers,
    userGps,
    filterMode,
    vehicleCategoryFilter,
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
    (window as any).__selectPickupPlace = (placeName: string, lat?: number, lng?: number) => {
      if (onSelectPickupPlace) {
        onSelectPickupPlace(
          placeName,
          typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined
        );
      }
    };
    (window as any).__selectDestPlace = (placeName: string, lat?: number, lng?: number) => {
      if (onSelectDestPlace) {
        onSelectDestPlace(
          placeName,
          typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined
        );
      }
    };
    return () => {
      delete (window as any).__selectPickupPlace;
      delete (window as any).__selectDestPlace;
    };
  }, [onSelectPickupPlace, onSelectDestPlace]);

  // Center on user device GPS
  const handleLocateMe = () => {
    const uLat = userGps.lat;
    const uLng = userGps.lng;
    if (typeof uLat === 'number' && Number.isFinite(uLat) && typeof uLng === 'number' && Number.isFinite(uLng) && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.flyTo([uLat, uLng], 16, { duration: 1.2 });
      } catch {}
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

    try {
      const uLat = userGps.lat;
      const uLng = userGps.lng;
      if (activeBooking) {
        const safeDLat = isValidLatLng(activeBooking.currentDriverLat, activeBooking.currentDriverLng) ? Number(activeBooking.currentDriverLat) : DEFAULT_CENTER[0];
        const safeDLng = isValidLatLng(activeBooking.currentDriverLat, activeBooking.currentDriverLng) ? Number(activeBooking.currentDriverLng) : DEFAULT_CENTER[1];
        const safePLat = isValidLatLng(activeBooking.passengerLat, activeBooking.passengerLng) ? Number(activeBooking.passengerLat) : DEFAULT_CENTER[0];
        const safePLng = isValidLatLng(activeBooking.passengerLat, activeBooking.passengerLng) ? Number(activeBooking.passengerLng) : DEFAULT_CENTER[1];
        const effectiveDestLat = activeBooking.destLat ?? destCoords?.lat;
        const effectiveDestLng = activeBooking.destLng ?? destCoords?.lng;
        const pointsToFit: [number, number][] = [
          [safeDLat, safeDLng],
          [safePLat, safePLng]
        ];
        if (typeof effectiveDestLat === 'number' && Number.isFinite(effectiveDestLat) && typeof effectiveDestLng === 'number' && Number.isFinite(effectiveDestLng)) {
          pointsToFit.push([effectiveDestLat, effectiveDestLng]);
        }
        const bounds = L.latLngBounds(pointsToFit);
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
      } else if (pickupCoords && destCoords && isValidLatLng(pickupCoords.lat, pickupCoords.lng) && isValidLatLng(destCoords.lat, destCoords.lng)) {
        const bounds = L.latLngBounds([
          [pickupCoords.lat, pickupCoords.lng],
          [destCoords.lat, destCoords.lng]
        ]);
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
      } else if (typeof uLat === 'number' && Number.isFinite(uLat) && typeof uLng === 'number' && Number.isFinite(uLng)) {
        map.flyTo([uLat, uLng], 16, { duration: 1.0 });
      } else {
        map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.0 });
      }
    } catch {}
  };

  const handleResetCenter = () => {
    userInteractedRef.current = false;
    setUserHasInteracted(false);
    try {
      mapInstanceRef.current?.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1 });
    } catch {}
  };

  const handleFlyTo = (lat: number, lng: number, zoom = 15) => {
    if (!isValidLatLng(lat, lng)) return;
    try {
      mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.2 });
    } catch {}
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
            <span>সফর লাইভ ম্যাপ</span>
          </div>

          {/* 2-Layer Free Map Switcher: Standard / Satellite Hybrid */}
          <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg text-[10.5px] font-bold" role="group" aria-label="ম্যাপ লেয়ার পরিবর্তন">
            <button
              type="button"
              onClick={() => setMapLayer('standard')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                mapLayer === 'standard' ? 'bg-white text-emerald-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="সাধারণ রাস্তার ম্যাপ (OpenStreetMap)"
            >
              <MapIcon className="w-3 h-3" />
              <span>সাধারণ</span>
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('satellite')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                mapLayer === 'satellite' ? 'bg-slate-900 text-amber-300 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="স্যাটেলাইট হাইব্রিড ভিউ (বাড়ি, গলি ও গ্রামীণ পথ স্পষ্ট)"
            >
              <Satellite className="w-3 h-3" />
              <span>স্যাটেলাইট</span>
            </button>
          </div>

          {/* Active Trip Mode Badge or Filter Pills */}
          {isTripCurrentlyActive ? (
            <div className="flex items-center gap-1.5 bg-emerald-950 text-emerald-200 px-2.5 py-1 rounded-lg text-[10.5px] font-black border border-emerald-500/50 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>অ্যাক্টিভ ট্রিপ: শুধুমাত্র চালক, পিকআপ ও গন্তব্য ফোকাস</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
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

              {categories && categories.filter(c => c.id !== 'all').length > 0 && (
                <select
                  data-testid="map-vehicle-filter"
                  aria-label="ম্যাপে বাহনের ধরন ফিল্টার"
                  value={vehicleCategoryFilter}
                  onChange={(e) => setVehicleCategoryFilter(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[10.5px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  title="ম্যাপে নির্দিষ্ট বাহনের ধরন ফিল্টার করুন"
                >
                  <option value="all">
                    সকল বাহন
                  </option>
                  {categories.filter(c => c.id !== 'all').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameBengali}
                    </option>
                  ))}
                </select>
              )}
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

        {/* Action Buttons: Tap-to-Pin, Scroll Lock, Locate Me, Reset, Fullscreen */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Direct Tap-to-Pin Controls (when not in active trip) */}
          {!isTripCurrentlyActive && onSelectPickupPlace && (
            <button
              type="button"
              onClick={() => {
                const next = pinMode === 'pickup' ? 'none' : 'pickup';
                setPinMode(next);
                if (next !== 'none') setIsScrollLocked(false);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                pinMode === 'pickup'
                  ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                  : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-300'
              }`}
              title="ম্যাপের যেকোনো জায়গায় ট্যাপ করে পিকআপ পয়েন্ট সেট করুন"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>পিকআপ পিন</span>
            </button>
          )}
          {!isTripCurrentlyActive && onSelectDestPlace && (
            <button
              type="button"
              onClick={() => {
                const next = pinMode === 'dest' ? 'none' : 'dest';
                setPinMode(next);
                if (next !== 'none') setIsScrollLocked(false);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                pinMode === 'dest'
                  ? 'bg-red-600 text-white border-red-700 shadow-xs'
                  : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
              }`}
              title="ম্যাপের যেকোনো জায়গায় ট্যাপ করে গন্তব্য সেট করুন"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>গন্তব্য পিন</span>
            </button>
          )}

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

          {/* Fullscreen / Landscape Expand Button (Hidden on PC & Tablet) */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="md:hidden px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            title={isFullscreen ? 'ফুলস্ক্রিন বন্ধ করুন' : 'মোবাইলে সর্বোচ্চ চওড়া ফুলস্ক্রিন ও ল্যান্ডস্কেপ ভিউ'}
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
        } ${pinMode !== 'none' ? 'cursor-crosshair' : ''}`}
        onClick={() => {
          if (isScrollLocked && pinMode === 'none') {
            setShowLockNotification(true);
            if (lockNotificationTimerRef.current) clearTimeout(lockNotificationTimerRef.current);
            lockNotificationTimerRef.current = setTimeout(() => setShowLockNotification(false), 3000);
          }
        }}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Tap-to-Pin Active Guidance Banner */}
        {pinMode !== 'none' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-2.5 left-1/2 -translate-x-1/2 z-[460] w-[92%] max-w-md px-3 py-2 rounded-2xl shadow-2xl border flex items-center justify-between gap-2 text-white animate-in fade-in ${
              pinMode === 'pickup' ? 'bg-teal-900/95 border-teal-400' : 'bg-red-900/95 border-red-400'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Crosshair className="w-4 h-4 shrink-0 animate-pulse text-amber-300" />
              <span className="text-[11.5px] sm:text-xs font-bold leading-snug">
                {pinMode === 'pickup'
                  ? 'ম্যাপ বা স্যাটেলাইটে আপনার ঠিক পিকআপ জায়গায় (বাড়ি/মোড়) ট্যাপ করুন'
                  : 'ম্যাপ বা স্যাটেলাইটে আপনার ঠিক গন্তব্য জায়গায় ট্যাপ করুন'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPinMode('none')}
              className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-extrabold shrink-0 cursor-pointer"
            >
              বাতিল
            </button>
          </div>
        )}

        {/* Dropped Pin Interactive Action Card */}
        {droppedPin && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-3 left-2.5 right-16 sm:left-3 sm:right-auto sm:w-[350px] z-[450] bg-white/95 backdrop-blur-md border border-teal-300 rounded-2xl shadow-2xl p-3 animate-in fade-in"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-teal-700 mb-0.5">
                  <Globe className="w-3 h-3 shrink-0" />
                  <span className="break-words">{droppedPin.unionName || 'গফরগাঁও–পাগলা এলাকা (+৪ কিমি)'}</span>
                </div>
                <h4 className="font-black text-slate-900 text-xs sm:text-sm leading-snug break-words flex items-start gap-1.5">
                  {droppedPin.isResolving && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 shrink-0 mt-0.5" />}
                  <span>{droppedPin.title}</span>
                </h4>
                <p className="text-[10.5px] text-slate-500 leading-snug break-words mt-0.5">
                  {droppedPin.subtitle} • ({droppedPin.lat.toFixed(14)}, {droppedPin.lng.toFixed(14)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDroppedPin(null)}
                aria-label="পিন কার্ড বন্ধ করুন"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {onSelectPickupPlace && (
                <button
                  type="button"
                  disabled={droppedPin.isResolving}
                  onClick={() => {
                    onSelectPickupPlace(droppedPin.title, { lat: droppedPin.lat, lng: droppedPin.lng });
                    setDroppedPin(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>পিকআপ সেট</span>
                </button>
              )}
              {onSelectDestPlace && (
                <button
                  type="button"
                  disabled={droppedPin.isResolving}
                  onClick={() => {
                    onSelectDestPlace(droppedPin.title, { lat: droppedPin.lat, lng: droppedPin.lng });
                    setDroppedPin(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition"
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span>গন্তব্য সেট</span>
                </button>
              )}
            </div>

            {/* Admin-Only Full Place & Stand Save Trigger directly from Map Pin */}
            {isAdmin && (onSaveCustomPlace || onSaveCustomStand) && !droppedPin.isResolving && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const matchedUnion = GAFARGAON_UNIONS.find(
                      (u) =>
                        droppedPin.unionName?.includes(u.nameBengali) ||
                        droppedPin.unionName?.includes(u.nameBengali.replace(' ইউনিয়ন', '').replace(' (পাগলা)', ''))
                    );
                    setAdminPinForm({
                      bengaliName: droppedPin.title,
                      name: '',
                      category: 'স্ট্যান্ড',
                      area: matchedUnion ? matchedUnion.nameBengali : GAFARGAON_UNIONS[0].nameBengali,
                      lat: Number(droppedPin.lat.toFixed(14)),
                      lng: Number(droppedPin.lng.toFixed(14))
                    });
                    setAdminPinCoordInput('');
                    setAdminPinSaveTarget('both');
                    setIsAdminPinSaveModalOpen(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition active:scale-98"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>অ্যাডমিন: নতুন স্থান / স্ট্যান্ড যুক্ত করুন (লাইভ ফায়ারস্টোর)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Admin-Only Full Place & Stand Creation Modal (Matching Admin Control Panel) */}
        {isAdmin && isAdminPinSaveModalOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[10050] flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-slate-900 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>ম্যাপ পিন থেকে নতুন স্থান ও স্ট্যান্ড যোগ (Admin)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAdminPinSaveModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="বন্ধ করুন"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!adminPinForm.bengaliName.trim()) return;
                  const { place, stand } = buildAdminPlaceAndStandPayloads(adminPinForm);
                  if ((adminPinSaveTarget === 'both' || adminPinSaveTarget === 'place') && onSaveCustomPlace) {
                    onSaveCustomPlace(place);
                  }
                  if ((adminPinSaveTarget === 'both' || adminPinSaveTarget === 'stand') && onSaveCustomStand) {
                    onSaveCustomStand(stand);
                  }
                  setIsAdminPinSaveModalOpen(false);
                  setDroppedPin(null);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="font-bold text-slate-700 block mb-1">কোথায় যুক্ত হবে (ফায়ারস্টোর লাইভ সিঙ্ক):</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'both' as const, label: 'নতুন স্ট্যান্ড + জনপ্রিয় স্থান' },
                      { id: 'place' as const, label: 'শুধু জনপ্রিয় স্থান' },
                      { id: 'stand' as const, label: 'শুধু নতুন স্ট্যান্ড' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAdminPinSaveTarget(opt.id)}
                        className={`px-2 py-2 rounded-xl border text-[10.5px] font-extrabold text-center transition cursor-pointer ${
                          adminPinSaveTarget === opt.id
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    বাংলা নাম (ম্যাপ ও ড্রপডাউনে যা দেখাবে): <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminPinForm.bengaliName}
                    onChange={(e) => setAdminPinForm({ ...adminPinForm, bengaliName: e.target.value })}
                    placeholder="যেমন: পাগলা কলেজ মোড় স্ট্যান্ড"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ইংরেজি নাম / কোড (ঐচ্ছিক):</label>
                  <input
                    type="text"
                    value={adminPinForm.name}
                    onChange={(e) => setAdminPinForm({ ...adminPinForm, name: e.target.value })}
                    placeholder="যেমন: Pagla College Mor Stand"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ক্যাটাগরি / ধরন:</label>
                    <select
                      value={adminPinForm.category}
                      onChange={(e) => setAdminPinForm({ ...adminPinForm, category: e.target.value as PlaceCategory })}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {PLACE_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      এলাকা / ইউনিয়ন: <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={adminPinForm.area}
                      onChange={(e) => setAdminPinForm({ ...adminPinForm, area: e.target.value })}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      required
                    >
                      {GAFARGAON_UNIONS.map((u) => (
                        <option key={u.id} value={u.nameBengali}>
                          {u.nameBengali} ({u.thana === 'পাগলা থানা' ? 'পাগলা' : 'সদর'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">অক্ষাংশ (Latitude): *</label>
                    <input
                      type="number"
                      step="any"
                      value={adminPinForm.lat}
                      onChange={(e) => setAdminPinForm({ ...adminPinForm, lat: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">দ্রাঘিমাংশ (Longitude): *</label>
                    <input
                      type="number"
                      step="any"
                      value={adminPinForm.lng}
                      onChange={(e) => setAdminPinForm({ ...adminPinForm, lng: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Google Maps Coordinates Quick Paste Helper (Auto Detect) */}
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <label className="font-bold text-xs text-emerald-900 block mb-1">
                    🌐 গুগল ম্যাপস কোঅর্ডিনেট পেস্ট করুন (অটো ডিটেক্ট):
                  </label>
                  <input
                    type="text"
                    value={adminPinCoordInput}
                    placeholder="যেমন: 24.4536, 90.5479 (Google Maps থেকে কপি করা)"
                    onChange={(e) => {
                      const raw = e.target.value;
                      setAdminPinCoordInput(raw);
                      const parsed = parseGoogleMapsCoordinates(raw);
                      if (parsed) {
                        setAdminPinForm((prev) => ({
                          ...prev,
                          lat: parsed.lat,
                          lng: parsed.lng
                        }));
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-emerald-700 block mt-1">
                    গুগল ম্যাপে যেকোনো লোকেশনে ট্যাপ বা রাইট ক্লিক করে Lat, Lng কপি করে এখানে পেস্ট করলেই উপরে অক্ষাংশ ও দ্রাঘিমাংশ স্বয়ংক্রিয়ভাবে বসে যাবে।
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdminPinSaveModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
                  >
                    ফায়ারস্টোরে লাইভ সেভ করুন
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
          const effectiveDestLat = activeBooking?.destLat || destCoords?.lat;
          const effectiveDestLng = activeBooking?.destLng || destCoords?.lng;

          const isInTransit = activeBooking?.status === 'in_transit';
          const targetLat = isInTransit ? effectiveDestLat : (activeBooking?.passengerLat || pickupCoords?.lat);
          const targetLng = isInTransit ? effectiveDestLng : (activeBooking?.passengerLng || pickupCoords?.lng);
          const hasDriverGps = Boolean(activeBooking?.currentDriverLat && activeBooking?.currentDriverLng);
          const effectiveDistance = (activeBooking && hasDriverGps && targetLat && targetLng)
            ? calculateDistanceKm(activeBooking.currentDriverLat, activeBooking.currentDriverLng, targetLat, targetLng)
            : (activeBooking?.distanceKm || calculatedDistance || 1.2);
          const effectiveDuration = Math.max(1, Math.round(effectiveDistance * 2.5));

          let googleMapsUrl = '';
          let googleMapsLabel = 'গুগল ম্যাপে লাইভ রুট (GPS)';

          if (activeBooking) {
            if (isInTransit) {
              const targetLat = effectiveDestLat;
              const targetLng = effectiveDestLng;
              if (targetLat && targetLng) {
                googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${activeBooking.currentDriverLat},${activeBooking.currentDriverLng}&destination=${targetLat},${targetLng}&travelmode=driving`;
                googleMapsLabel = 'গুগল ম্যাপে GPS (গন্তব্যের দিকে)';
              }
            } else {
              const targetLat = activeBooking.passengerLat || pickupCoords?.lat;
              const targetLng = activeBooking.passengerLng || pickupCoords?.lng;
              if (targetLat && targetLng) {
                googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${activeBooking.currentDriverLat},${activeBooking.currentDriverLng}&destination=${targetLat},${targetLng}&travelmode=driving`;
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
                <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[11px] min-w-0 flex-1 overflow-hidden">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <PauseMarqueeText
                      text={
                        activeBooking
                          ? (isInTransit
                              ? 'আল্লাহ্র উপর ভরসা করে যাত্রা শুরু করছি...'
                              : 'পিকআপের দিকে রওনা')
                          : 'রুট প্ল্যান ও নির্ভুল দূরত্ব'
                      }
                      className="text-[11px] font-extrabold text-emerald-400"
                      pauseSec={1.5}
                    />
                  </div>
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

              {/* Dynamic Route Info with PauseMarqueeText (Phase 1: চালক ➔ পিকআপ vs Phase 2: পিকআপ ➔ গন্তব্য) */}
              <div className="border-t border-white/20 pt-1.5 overflow-hidden w-full">
                <PauseMarqueeText
                  text={
                    activeBooking
                      ? (isInTransit
                          ? `পিকআপ: ${effectivePickup} ➔ গন্তব্য: ${effectiveDest}`
                          : `চালক ➔ পিকআপ: ${effectivePickup}`)
                      : `পিকআপ (A): ${effectivePickup} ➔ গন্তব্য (B): ${effectiveDest}`
                  }
                  className="text-[10.5px] font-bold text-slate-100"
                  pauseSec={1.5}
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

      {/* Bottom Quick Hub Presets: Pouroshova & All 15 Unions */}
      <div className="bg-white/95 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-xs flex-wrap gap-1.5 z-10">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin text-[11px] w-full md:flex-1 pb-0.5">
          <span className="text-slate-500 font-bold text-[10px] shrink-0">দ্রুত ভিউ:</span>
          {GAFARGAON_UNIONS.map((union) => (
            <button
              key={union.id}
              type="button"
              onClick={() => handleFlyTo(union.centerLat, union.centerLng, union.id === 'pourashava' ? 15 : 14)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-300 rounded text-slate-700 font-semibold transition-colors cursor-pointer shrink-0"
              title={`${union.nameBengali} (${union.thana})`}
            >
              {union.nameBengali}
            </button>
          ))}
        </div>

        <div className="text-[10px] text-slate-500 font-medium hidden md:block shrink-0">
          ম্যাপের যেকোনো যানবাহনে ট্যাপ করে সরাসরি কল করুন
        </div>
      </div>
    </div>
  );
};
