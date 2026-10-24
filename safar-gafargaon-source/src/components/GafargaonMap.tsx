import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Maximize2, Minimize2, Navigation, Layers, RotateCcw } from 'lucide-react';
import { Driver, Stand, VehicleCategory } from '../types';
import { toBengaliNumber } from '../utils/calculator';

interface GafargaonMapProps {
  drivers: Driver[];
  stands: Stand[];
  selectedDriver: Driver | null;
  onSelectDriver: (driver: Driver) => void;
  pickupStandId: string;
  destinationStandId: string;
}

export const GafargaonMap: React.FC<GafargaonMapProps> = ({
  drivers,
  stands,
  selectedDriver,
  onSelectDriver,
  pickupStandId,
  destinationStandId
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Gafargaon default center
  const DEFAULT_CENTER: [number, number] = [24.4347, 90.5516];
  const DEFAULT_ZOOM = 14;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Leaflet | © OpenStreetMap contributors | গফরগাঁও',
      maxZoom: 18,
      minZoom: 11
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const routeGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    routeLayerRef.current = routeGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const routeGroup = routeLayerRef.current;
    if (!map || !markersGroup || !routeGroup) return;

    markersGroup.clearLayers();
    routeGroup.clearLayers();

    // Helper icon creator
    const createCustomIcon = (
      label: string,
      colorBg: string,
      borderColor: string,
      textColor: string,
      isSelected = false
    ) => {
      const size = isSelected ? 38 : 30;
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${colorBg};
            border: 2.5px solid ${borderColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? '16px' : '13px'};
            color: ${textColor};
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            font-weight: bold;
          ">
            ${label}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
      });
    };

    // Category emoji / symbol
    const getCategorySymbol = (cat: VehicleCategory) => {
      switch (cat) {
        case 'ambulance': return '🚑';
        case 'fire_service': return '🚒';
        case 'cng': return '🛺';
        case 'auto': return '🛺';
        case 'car': return '🚗';
        case 'maxi': return '🚐';
        case 'bike': return '🏍️';
        default: return '📍';
      }
    };

    // 1. Plot Drivers
    drivers.forEach((driver) => {
      const isSelected = selectedDriver?.id === driver.id;
      const bg = driver.category === 'ambulance' ? '#ef4444' : (driver.category === 'fire_service' ? '#f97316' : '#10b981');
      const border = isSelected ? '#facc15' : '#ffffff';
      const icon = createCustomIcon(getCategorySymbol(driver.category), bg, border, '#ffffff', isSelected);

      const marker = L.marker([driver.lat, driver.lng], { icon });

      const popupContent = `
        <div style="font-family: 'Hind Siliguri', sans-serif; min-width: 190px; padding: 2px;">
          <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 2px;">
            ${driver.nameBn}
          </div>
          <div style="font-size: 11px; color: #047857; font-weight: 600; margin-bottom: 4px;">
            ${driver.vehicleName}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            📍 ${driver.standName}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 10px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
              ${driver.licensePlate}
            </span>
            <span style="font-size: 11px; color: #eab308; font-weight: 700;">
              ★ ${toBengaliNumber(driver.rating)}
            </span>
          </div>
          <a href="tel:${driver.phone.replace(/[^0-9]/g, '')}" 
             style="display: block; text-align: center; background: #059669; color: white; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 11px; text-decoration: none;">
            📞 সরাসরি কল করুন
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        onSelectDriver(driver);
      });

      markersGroup.addLayer(marker);
    });

    // 2. Draw route line between pickup and destination if stands selected
    const pickupStand = stands.find((s) => s.id === pickupStandId);
    const destStand = stands.find((s) => s.id === destinationStandId);

    if (pickupStand && destStand && pickupStand.id !== destStand.id) {
      const latlngs: [number, number][] = [
        [pickupStand.lat, pickupStand.lng],
        [destStand.lat, destStand.lng]
      ];

      // Route dashed line
      const polyline = L.polyline(latlngs, {
        color: '#059669',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.85
      });
      routeGroup.addLayer(polyline);

      // Pickup pin
      const pickupIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="background: #10b981; border: 2.5px solid #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); color: white; font-size: 11px; font-weight: bold;">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const pickupMarker = L.marker([pickupStand.lat, pickupStand.lng], { icon: pickupIcon })
        .bindTooltip(`পিকআপ: ${pickupStand.nameBn}`);
      routeGroup.addLayer(pickupMarker);

      // Dest pin
      const destIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="background: #ef4444; border: 2.5px solid #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); color: white; font-size: 11px; font-weight: bold;">
            B
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const destMarker = L.marker([destStand.lat, destStand.lng], { icon: destIcon })
        .bindTooltip(`গন্তব্য: ${destStand.nameBn}`);
      routeGroup.addLayer(destMarker);
    }

    // Pan to selected driver if set
    if (selectedDriver) {
      map.setView([selectedDriver.lat, selectedDriver.lng], 15, { animate: true });
    }
  }, [drivers, stands, selectedDriver, pickupStandId, destinationStandId, onSelectDriver]);

  // Zoom preset helper
  const handleFlyTo = (lat: number, lng: number, zoom = 15) => {
    mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.2 });
  };

  const handleResetMap = () => {
    mapInstanceRef.current?.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1 });
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col transition-all ${
      isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative h-[430px]'
    }`}>
      {/* Map header */}
      <div className="bg-slate-50/90 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-700" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">
            গফরগাঁও লাইভ ম্যাপ
          </h3>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
            {toBengaliNumber(drivers.length)} চালক দৃশ্যমান
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetMap}
            title="ম্যাপ রিসেট করুন"
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">রিসেট</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'ম্যাপ স্বাভাবিক করুন' : 'ম্যাপ বড় করুন'}
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1 transition"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">{isFullscreen ? 'ছোট করুন' : 'ফুল ভিউ'}</span>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full flex-1 z-0 relative min-h-[320px]"
        id="leaflet-gafargaon-map"
      />

      {/* Map Footer Preset buttons */}
      <div className="bg-white/95 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-xs flex-wrap gap-1.5 z-10">
        <div className="text-[11px] text-slate-600 font-medium hidden sm:block">
          যেকোনো আইকনে ট্যাপ করে চালক ও স্ট্যান্ডের বিস্তারিত তথ্য দেখুন
        </div>
        <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-semibold text-[10px]">দ্রুত ভিউ:</span>
          <button
            type="button"
            onClick={() => handleFlyTo(24.4347, 90.5516, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-medium transition"
          >
            গফরগাঁও
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.4370, 90.5480, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-medium transition"
          >
            পৌরসভা
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.4420, 90.5620, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-medium transition"
          >
            শিবগঞ্জ
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.3670, 90.5280, 15)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-medium transition"
          >
            পাগলা
          </button>
          <button
            type="button"
            onClick={() => handleFlyTo(24.4285, 90.5560, 16)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-medium transition"
          >
            হাসপাতাল
          </button>
        </div>
      </div>
    </div>
  );
};
