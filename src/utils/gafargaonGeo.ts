export interface GeoBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/**
 * Official Gafargaon Upazila administrative bounding box
 * (Includes Gafargaon Pouroshova + all 15 Unions across Gafargaon & Pagla Thana)
 */
export const GAFARGAON_CORE_BOUNDS: GeoBounds = {
  south: 24.2481,
  west: 90.4413,
  north: 24.5435,
  east: 90.6514,
};

/**
 * Extended Service Area Boundary:
 * Core 15 Unions + Gafargaon Pouroshova PLUS minimum ~3.5-4.3 km outer border buffer
 * on all 4 sides (covering Trishal, Bhaluka, Sreepur, Kapasia, Hossainpur & Pakundia borders).
 */
export const GAFARGAON_SERVICE_BOUNDS: GeoBounds = {
  south: 24.210,
  west: 90.399,
  north: 24.582,
  east: 90.694,
};

export const GAFARGAON_CENTER = {
  lat: 24.4536,
  lng: 90.5479,
};

export type PlaceCategoryBn =
  | 'স্ট্যান্ড'
  | 'মোড়'
  | 'বাজার'
  | 'হাসপাতাল'
  | 'শিক্ষা প্রতিষ্ঠান'
  | 'প্রশাসন'
  | 'ইউনিয়ন';

export function isValidCoordinatePair(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export function isWithinGafargaonServiceArea(
  lat: number,
  lng: number,
  bounds: GeoBounds = GAFARGAON_SERVICE_BOUNDS
): boolean {
  if (!isValidCoordinatePair(lat, lng)) return false;
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

export function isWithinCoreGafargaonArea(lat: number, lng: number): boolean {
  return isWithinGafargaonServiceArea(lat, lng, GAFARGAON_CORE_BOUNDS);
}

export function clampToGafargaonServiceArea(
  lat: number,
  lng: number,
  bounds: GeoBounds = GAFARGAON_SERVICE_BOUNDS
): { lat: number; lng: number } {
  if (!isValidCoordinatePair(lat, lng)) {
    return { ...GAFARGAON_CENTER };
  }
  return {
    lat: Number(Math.min(bounds.north, Math.max(bounds.south, lat)).toFixed(6)),
    lng: Number(Math.min(bounds.east, Math.max(bounds.west, lng)).toFixed(6)),
  };
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export interface PlaceReferenceCandidate {
  bengaliName?: string;
  name?: string;
  unionNameBengali?: string;
  area?: string;
  lat: number;
  lng: number;
}

export function inferNearestAreaInfo(
  lat: number,
  lng: number,
  places: PlaceReferenceCandidate[]
): {
  unionName: string;
  nearestPlaceName: string;
  distanceMeters: number;
  isBorderBuffer: boolean;
} {
  let nearest: PlaceReferenceCandidate | null = null;
  let minMeters = Infinity;

  for (const p of places) {
    if (!isValidCoordinatePair(p.lat, p.lng)) continue;
    const dist = haversineMeters(lat, lng, p.lat, p.lng);
    if (dist < minMeters) {
      minMeters = dist;
      nearest = p;
    }
  }

  const isBorderBuffer =
    isWithinGafargaonServiceArea(lat, lng) && !isWithinCoreGafargaonArea(lat, lng);

  const rawUnion =
    nearest?.unionNameBengali ||
    (nearest?.area ? nearest.area.split(',')[0].trim() : '') ||
    'গফরগাঁও পৌরসভা';

  return {
    unionName: isBorderBuffer ? `সীমান্ত সংলগ্ন এলাকা (${rawUnion})` : rawUnion,
    nearestPlaceName: nearest?.bengaliName || nearest?.name || 'গফরগাঁও চত্বর',
    distanceMeters: Number.isFinite(minMeters) ? minMeters : 0,
    isBorderBuffer,
  };
}

export function categorizeOsmTags(tags: Record<string, string | undefined>): PlaceCategoryBn {
  const amenity = (tags.amenity || '').toLowerCase();
  const healthcare = (tags.healthcare || '').toLowerCase();
  const shop = (tags.shop || '').toLowerCase();
  const office = (tags.office || '').toLowerCase();
  const building = (tags.building || '').toLowerCase();
  const place = (tags.place || '').toLowerCase();
  const railway = (tags.railway || '').toLowerCase();
  const highway = (tags.highway || '').toLowerCase();
  const landuse = (tags.landuse || '').toLowerCase();

  if (
    amenity === 'bus_station' ||
    highway === 'bus_stop' ||
    railway === 'station' ||
    railway === 'halt'
  ) {
    return 'স্ট্যান্ড';
  }
  if (
    amenity === 'hospital' ||
    amenity === 'clinic' ||
    amenity === 'doctors' ||
    amenity === 'pharmacy' ||
    Boolean(healthcare) ||
    building === 'hospital'
  ) {
    return 'হাসপাতাল';
  }
  if (
    amenity === 'school' ||
    amenity === 'college' ||
    amenity === 'university' ||
    amenity === 'kindergarten' ||
    building === 'school' ||
    building === 'college' ||
    building === 'university'
  ) {
    return 'শিক্ষা প্রতিষ্ঠান';
  }
  if (
    amenity === 'townhall' ||
    amenity === 'police' ||
    amenity === 'post_office' ||
    amenity === 'courthouse' ||
    amenity === 'bank' ||
    amenity === 'fire_station' ||
    Boolean(office) ||
    building === 'public' ||
    building === 'civic'
  ) {
    return 'প্রশাসন';
  }
  if (
    amenity === 'marketplace' ||
    Boolean(shop) ||
    landuse === 'commercial' ||
    landuse === 'retail'
  ) {
    return 'বাজার';
  }
  if (place === 'village' || place === 'hamlet' || place === 'town' || place === 'suburb' || place === 'neighbourhood') {
    return 'ইউনিয়ন';
  }
  return 'মোড়';
}
