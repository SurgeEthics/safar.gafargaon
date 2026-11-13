import {
  GAFARGAON_SERVICE_BOUNDS,
  PlaceCategoryBn,
  PlaceReferenceCandidate,
  clampToGafargaonServiceArea,
  haversineMeters,
  inferNearestAreaInfo,
  isWithinGafargaonServiceArea,
} from '../utils/gafargaonGeo';
import { toBengaliNumber } from '../utils/calculator';

export interface FreeGeocodedPlace {
  id: string;
  name: string;
  bengaliName: string;
  category: PlaceCategoryBn;
  categoryLabel: string;
  area: string;
  unionNameBengali: string;
  lat: number;
  lng: number;
  source: 'osm-live';
}

const searchCache = new Map<string, FreeGeocodedPlace[]>();

export function clearFreeMapSearchCache() {
  searchCache.clear();
}

function mapArcgisTypeToCategory(typeStr?: string, labelStr?: string): PlaceCategoryBn {
  const t = `${typeStr || ''} ${labelStr || ''}`.toLowerCase();
  if (t.includes('bus') || t.includes('train') || t.includes('station') || t.includes('স্ট্যান্ড')) return 'স্ট্যান্ড';
  if (t.includes('hospital') || t.includes('clinic') || t.includes('medical') || t.includes('হাসপাতাল')) return 'হাসপাতাল';
  if (t.includes('school') || t.includes('college') || t.includes('university') || t.includes('বিদ্যাল') || t.includes('মাদ্রাসা')) return 'শিক্ষা প্রতিষ্ঠান';
  if (t.includes('government') || t.includes('police') || t.includes('bank') || t.includes('post') || t.includes('পৌরসভা')) return 'প্রশাসন';
  if (t.includes('shop') || t.includes('market') || t.includes('store') || t.includes('বাজার') || t.includes('হাট')) return 'বাজার';
  if (t.includes('village') || t.includes('populated') || t.includes('locality') || t.includes('ইউনিয়ন')) return 'ইউনিয়ন';
  return 'মোড়';
}

/**
 * Live bounded search across Gafargaon Pouroshova + 15 Unions + 3-4km border area
 * using CORS-safe ArcGIS World GeocodeServer (100% free, no API key required) strictly bounded to GAFARGAON_SERVICE_BOUNDS.
 */
export async function searchBoundedFreePlaces(
  rawQuery: string,
  localPlaces: PlaceReferenceCandidate[] = [],
  signal?: AbortSignal
): Promise<FreeGeocodedPlace[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];

  const cacheKey = q.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const { west, south, east, north } = GAFARGAON_SERVICE_BOUNDS;
  const results: FreeGeocodedPlace[] = [];
  const seenKeys = new Set<string>();

  const pushUnique = (item: FreeGeocodedPlace) => {
    if (!isWithinGafargaonServiceArea(item.lat, item.lng)) return;
    const normName = item.bengaliName.toLowerCase().trim();
    if (!normName) return;
    const bucketKey = `${normName}::${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    if (seenKeys.has(bucketKey)) return;
    seenKeys.add(bucketKey);
    results.push(item);
  };

  try {
    const queryWithContext =
      q.toLowerCase().includes('gafargaon') || q.includes('গফরগাঁও') || q.includes('পাগলা')
        ? q
        : `${q}, Gafargaon, Mymensingh`;
    const arcUrl =
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates` +
      `?SingleLine=${encodeURIComponent(queryWithContext)}` +
      `&searchExtent=${west},${south},${east},${north}` +
      `&countryCode=BGD&outFields=PlaceName,Place_addr,Type&f=json&maxLocations=12`;

    const res = await fetch(arcUrl, { signal });
    if (res.ok) {
      const json = await res.json();
      const candidates = Array.isArray(json?.candidates) ? json.candidates : [];
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const rawLat = c?.location?.y;
        const rawLng = c?.location?.x;
        if (typeof rawLat !== 'number' || typeof rawLng !== 'number') continue;
        const lat = Number(rawLat.toFixed(14));
        const lng = Number(rawLng.toFixed(14));
        if (!isWithinGafargaonServiceArea(lat, lng)) continue;

        const attrs = c.attributes || {};
        const displayName = (attrs.PlaceName || c.address || '').split(',')[0].trim();
        if (!displayName || displayName.toLowerCase() === 'gafargaon') continue;

        const inferred = inferNearestAreaInfo(lat, lng, localPlaces);
        const cat = mapArcgisTypeToCategory(attrs.Type, displayName);
        const areaText =
          (attrs.Place_addr || '').trim() ||
          `${inferred.nearestPlaceName} সংলগ্ন`;

        pushUnique({
          id: `live-geo-${i}-${lat}-${lng}`,
          name: displayName,
          bengaliName: displayName,
          category: cat,
          categoryLabel: `${cat} (লাইভ ম্যাপ)`,
          area: areaText,
          unionNameBengali: inferred.unionName,
          lat,
          lng,
          source: 'osm-live',
        });
      }
    }
  } catch {
    // Graceful silent fallback to local curated + OSM places
  }

  if (results.length > 0) {
    searchCache.set(cacheKey, results);
  }
  return results;
}

/**
 * Reverse geocodes a tapped map point (Tap-to-Pin) into a human-friendly Bengali location name
 * with 14-decimal high-accuracy latitude & longitude using CORS-safe locality lookup + local precision matching.
 */
export async function reverseGeocodeFree(
  rawLat: number,
  rawLng: number,
  localPlaces: PlaceReferenceCandidate[] = []
): Promise<{
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  unionName: string;
}> {
  const { lat, lng } = clampToGafargaonServiceArea(rawLat, rawLng);
  const inferred = inferNearestAreaInfo(lat, lng, localPlaces);

  // 1. If tapped within 75 meters of a known stand, mosque, school, market or road landmark, snap to that exact verified name
  if (inferred.distanceMeters <= 75 && inferred.nearestPlaceName) {
    return {
      title: inferred.nearestPlaceName,
      subtitle: `${inferred.unionName}`,
      lat,
      lng,
      unionName: inferred.unionName,
    };
  }

  // 2. Enrich locality using CORS-safe BigDataCloud free reverse client API (supports Bengali)
  let remoteLocality = '';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=bn`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const loc = (data?.locality || data?.city || '').trim();
      if (loc && loc !== 'বাংলাদেশ') {
        remoteLocality = loc;
      }
    }
  } catch {
    // Offline/timeout fallback uses inferred landmark directly
  }

  // 3. Deterministic high-precision local landmark description in Bengali numerals
  const distText =
    inferred.distanceMeters >= 1000
      ? `${toBengaliNumber((inferred.distanceMeters / 1000).toFixed(1))} কিমি`
      : `${toBengaliNumber(Math.max(10, Math.round(inferred.distanceMeters / 10) * 10))} মিটার`;

  const unionText =
    remoteLocality && !inferred.unionName.includes(remoteLocality)
      ? `${inferred.unionName} (${remoteLocality})`
      : inferred.unionName;

  return {
    title: `${inferred.nearestPlaceName} সংলগ্ন`,
    subtitle: `প্রায় ${distText} দূরে • ${unionText}`,
    lat,
    lng,
    unionName: inferred.unionName,
  };
}

export function isSameCoordinate(
  a?: { lat: number; lng: number } | null,
  b?: { lat: number; lng: number } | null
): boolean {
  if (!a || !b) return false;
  return haversineMeters(a.lat, a.lng, b.lat, b.lng) < 5;
}
