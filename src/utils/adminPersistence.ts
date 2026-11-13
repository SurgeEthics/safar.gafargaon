export function stripUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      cleaned[key] = stripUndefinedFields(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned as T;
}

export function mergeRemoteSettingsWithDefaults<T extends Record<string, any>>(
  defaults: T,
  remote: Partial<T> | null | undefined
): T {
  if (!remote || typeof remote !== 'object') {
    return { ...defaults };
  }
  const cleanRemote = stripUndefinedFields(remote as Record<string, any>);
  return {
    ...defaults,
    ...cleanRemote,
  } as T;
}

export function shouldSeedDefaultCollection(
  snapshotEmpty: boolean,
  fromCache: boolean,
  serverCount: number
): boolean {
  if (fromCache) return false;
  if (!snapshotEmpty) return false;
  return serverCount === 0;
}

import type { PlaceCategory, PlaceCategoryOption } from '../data/gafargaonPlaces';

export interface MapAdminPinInput {
  bengaliName: string;
  name?: string;
  category: PlaceCategory;
  area: string;
  lat: number;
  lng: number;
  idSeed?: number;
}

export function parseGoogleMapsCoordinates(raw: string): { lat: number; lng: number } | null {
  if (!raw || typeof raw !== 'string') return null;
  const val = raw.trim();
  if (!val) return null;

  let lat: number | null = null;
  let lng: number | null = null;

  const atMatch = val.match(/@(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  const bangMatch = val.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const queryMatch = val.match(/[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?)\s*(?:,|%2C|\s)\s*(-?\d+(?:\.\d+)?)/i);

  if (atMatch) {
    lat = parseFloat(atMatch[1]);
    lng = parseFloat(atMatch[2]);
  } else if (bangMatch) {
    lat = parseFloat(bangMatch[1]);
    lng = parseFloat(bangMatch[2]);
  } else if (queryMatch) {
    lat = parseFloat(queryMatch[1]);
    lng = parseFloat(queryMatch[2]);
  } else {
    const cleaned = val.replace(/[()]/g, ' ').trim();
    const pairMatch = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
    if (pairMatch) {
      lat = parseFloat(pairMatch[1]);
      lng = parseFloat(pairMatch[2]);
    }
  }

  if (
    lat === null ||
    lng === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }

  return {
    lat: Number(lat.toFixed(14)),
    lng: Number(lng.toFixed(14)),
  };
}

export interface CustomMapPlaceCandidate {
  id: string;
  name?: string;
  bengaliName?: string;
  category?: string;
  area?: string;
  lat: number;
  lng: number;
  isPopular?: boolean;
  showOnMap?: boolean;
}

export interface StandMapCandidate {
  id?: string;
  nameBn?: string;
  bengaliName?: string;
  lat: number;
  lng: number;
}

function normalizePlaceLabel(label?: string): string {
  return (label || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function filterCustomMapPlaces<T extends CustomMapPlaceCandidate>(
  popularPlaces: readonly T[],
  stands: readonly StandMapCandidate[],
  staticPlaceIds: ReadonlySet<string>
): T[] {
  if (!Array.isArray(popularPlaces) || popularPlaces.length === 0) {
    return [];
  }

  const seenIds = new Set<string>();
  const standNames = new Set(
    (stands || [])
      .map((s) => normalizePlaceLabel(s.bengaliName || s.nameBn))
      .filter(Boolean)
  );

  return popularPlaces.filter((place) => {
    if (!place || !place.id) return false;
    if (seenIds.has(place.id)) return false;
    if (
      typeof place.lat !== 'number' ||
      typeof place.lng !== 'number' ||
      !Number.isFinite(place.lat) ||
      !Number.isFinite(place.lng)
    ) {
      return false;
    }

    const isAdminOrCustomPlace =
      Boolean(place.showOnMap) ||
      place.id.startsWith('place-') ||
      !staticPlaceIds.has(place.id);

    if (!isAdminOrCustomPlace) return false;

    const placeNameNorm = normalizePlaceLabel(place.bengaliName || place.name);
    if (placeNameNorm && standNames.has(placeNameNorm)) {
      return false;
    }

    const hasOverlappingStand = (stands || []).some(
      (s) =>
        typeof s.lat === 'number' &&
        typeof s.lng === 'number' &&
        Math.abs(s.lat - place.lat) < 0.00022 &&
        Math.abs(s.lng - place.lng) < 0.00022
    );
    if (hasOverlappingStand) return false;

    seenIds.add(place.id);
    return true;
  });
}

export function buildAdminPlaceAndStandPayloads(input: MapAdminPinInput) {
  const ts = input.idSeed ?? Date.now();
  const bn = input.bengaliName.trim();
  const en = (input.name || '').trim() || bn;
  const area = (input.area || '').trim() || 'গফরগাঁও পৌরসভা';
  const lat = Number(Number(input.lat).toFixed(14));
  const lng = Number(Number(input.lng).toFixed(14));

  return {
    place: {
      id: `place-map-${ts}`,
      name: en,
      bengaliName: bn,
      category: input.category,
      area,
      lat,
      lng,
      isPopular: true,
      showOnMap: true,
    },
    stand: {
      id: `stand-map-${ts}`,
      name: en,
      bengaliName: bn,
      area,
      location: `${area} • ${bn}`,
      lat,
      lng,
      activeDrivers: 0,
      isPopular: true,
    },
  };
}

export interface CategoryMetaCandidate {
  id: string;
  nameBengali: string;
  accentColor?: string;
  iconType?: string;
}

export interface ResolvedVehicleCategoryMeta {
  id: string;
  name: string;
  symbol: string;
  color: string;
}

const DEFAULT_CATEGORY_META: Record<string, { symbol: string; color: string; name: string }> = {
  ambulance: { symbol: '✚', color: '#dc2626', name: 'এম্বুলেন্স' },
  fire: { symbol: '🚒', color: '#ea580c', name: 'ফায়ার সার্ভিস' },
  fire_service: { symbol: '🚒', color: '#ea580c', name: 'ফায়ার সার্ভিস' },
  cng: { symbol: '🛺', color: '#059669', name: 'সিএনজি' },
  auto: { symbol: '🔋', color: '#0d9488', name: 'অটো রিকশা' },
  car: { symbol: '🚗', color: '#2563eb', name: 'কার' },
  microbus: { symbol: '🚐', color: '#4f46e5', name: 'মাইক্রোবাস' },
  maxi: { symbol: '🚐', color: '#4f46e5', name: 'মাইক্রোবাস' },
  bike: { symbol: '🏍️', color: '#d97706', name: 'মোটরসাইকেল' },
  truck: { symbol: '🛻', color: '#0284c7', name: 'পিকআপ / ভ্যান' },
};

const ICON_TYPE_SYMBOL_MAP: Record<string, string> = {
  ambulance: '✚',
  fire: '🚒',
  cng: '🛺',
  auto: '🔋',
  car: '🚗',
  microbus: '🚐',
  bike: '🏍️',
  truck: '🛻',
};

export function resolveVehicleCategoryMeta(
  categoryId: string,
  categories?: readonly CategoryMetaCandidate[]
): ResolvedVehicleCategoryMeta {
  const key = (categoryId || '').trim().toLowerCase();
  const matched = Array.isArray(categories)
    ? categories.find((c) => c.id !== 'all' && c.id.toLowerCase() === key)
    : undefined;
  const builtin = DEFAULT_CATEGORY_META[key];
  const iconTypeKey = (matched?.iconType || '').trim().toLowerCase();
  const symbolFromIconType = ICON_TYPE_SYMBOL_MAP[iconTypeKey];

  return {
    id: matched?.id || categoryId || 'cng',
    name: matched?.nameBengali?.trim() || builtin?.name || 'যানবাহন',
    symbol: builtin?.symbol || symbolFromIconType || '🚖',
    color: matched?.accentColor?.trim() || builtin?.color || '#059669',
  };
}

export interface DriverPositionCandidate {
  id?: string;
  category?: string;
  standName?: string;
  lat?: number;
  lng?: number;
}

export interface StandVehicleTypesSummary {
  typeCount: number;
  typeNames: string[];
  driverCountAtStand: number;
}

function doesDriverMatchStand(driverStandName: string | undefined, standName: string): boolean {
  const dNorm = normalizePlaceLabel(driverStandName);
  const sNorm = normalizePlaceLabel(standName);
  if (!dNorm || !sNorm) return false;
  if (dNorm === sNorm) return true;
  const cleanStand = sNorm.replace(/\s*স্ট্যান্ড$/, '').trim();
  const cleanDriverStand = dNorm.replace(/\s*স্ট্যান্ড$/, '').trim();
  return Boolean(
    (cleanStand && cleanDriverStand.includes(cleanStand)) ||
    (cleanDriverStand && cleanStand.includes(cleanDriverStand))
  );
}

export function computeStandVehicleTypesSummary(
  standName: string,
  categories?: readonly CategoryMetaCandidate[],
  drivers?: readonly DriverPositionCandidate[]
): StandVehicleTypesSummary {
  const activeCategories = Array.isArray(categories)
    ? categories.filter((c) => c && c.id && c.id !== 'all')
    : Object.entries(DEFAULT_CATEGORY_META)
        .filter(([id]) => !['fire_service', 'maxi', 'truck'].includes(id))
        .map(([id, meta]) => ({ id, nameBengali: meta.name }));

  const seenIds = new Set<string>();
  const typeNames: string[] = [];

  for (const cat of activeCategories) {
    const idNorm = cat.id.trim().toLowerCase();
    if (!seenIds.has(idNorm)) {
      seenIds.add(idNorm);
      typeNames.push(cat.nameBengali?.trim() || resolveVehicleCategoryMeta(cat.id).name);
    }
  }

  let driverCountAtStand = 0;
  if (Array.isArray(drivers)) {
    for (const d of drivers) {
      if (doesDriverMatchStand(d.standName, standName)) {
        driverCountAtStand += 1;
        const catNorm = (d.category || '').trim().toLowerCase();
        if (catNorm && catNorm !== 'all' && !seenIds.has(catNorm)) {
          seenIds.add(catNorm);
          typeNames.push(resolveVehicleCategoryMeta(catNorm, categories).name);
        }
      }
    }
  }

  return {
    typeCount: Math.max(1, seenIds.size),
    typeNames,
    driverCountAtStand,
  };
}

export function resolveDriverMapPosition(
  driver: DriverPositionCandidate,
  stands: readonly StandMapCandidate[],
  sameStandIndex = 0
): { lat: number; lng: number; matchedStandName?: string } {
  const matchedStand = Array.isArray(stands)
    ? stands.find((s) => doesDriverMatchStand(driver.standName, s.bengaliName || s.nameBn || ''))
    : undefined;

  const hasValidDriverCoords =
    typeof driver.lat === 'number' &&
    typeof driver.lng === 'number' &&
    Number.isFinite(driver.lat) &&
    Number.isFinite(driver.lng) &&
    driver.lat >= 24.0 &&
    driver.lat <= 25.0 &&
    driver.lng >= 90.0 &&
    driver.lng <= 91.0;

  const isDefaultFallbackCoord =
    hasValidDriverCoords &&
    Math.abs((driver.lat as number) - 24.4536) < 0.0001 &&
    Math.abs((driver.lng as number) - 90.5479) < 0.0001;

  const standHasCoords =
    matchedStand &&
    typeof matchedStand.lat === 'number' &&
    typeof matchedStand.lng === 'number' &&
    Number.isFinite(matchedStand.lat) &&
    Number.isFinite(matchedStand.lng);

  const standDiffersFromFallback =
    standHasCoords &&
    (Math.abs(matchedStand!.lat - 24.4536) > 0.0005 || Math.abs(matchedStand!.lng - 90.5479) > 0.0005);

  if (hasValidDriverCoords && !(isDefaultFallbackCoord && standDiffersFromFallback)) {
    return {
      lat: Number((driver.lat as number).toFixed(14)),
      lng: Number((driver.lng as number).toFixed(14)),
      matchedStandName: matchedStand?.bengaliName || matchedStand?.nameBn,
    };
  }

  if (standHasCoords) {
    const angle = (sameStandIndex * 137.5 * Math.PI) / 180;
    const radius = sameStandIndex === 0 ? 0.00028 : 0.00035 + Math.min(sameStandIndex, 8) * 0.00009;
    return {
      lat: Number((matchedStand!.lat + Math.sin(angle) * radius).toFixed(14)),
      lng: Number((matchedStand!.lng + Math.cos(angle) * radius).toFixed(14)),
      matchedStandName: matchedStand!.bengaliName || matchedStand!.nameBn,
    };
  }

  return {
    lat: 24.4536,
    lng: 90.5479,
  };
}

export function upsertPlaceCategory(
  existing: readonly PlaceCategoryOption[],
  labelInput: string,
  editingValue?: string | null
): { ok: boolean; list: PlaceCategoryOption[]; updatedItem?: PlaceCategoryOption; message?: string } {
  const cleanLabel = (labelInput || '').trim().replace(/\s+/g, ' ');
  if (!cleanLabel) {
    return {
      ok: false,
      list: [...existing],
      message: 'ক্যাটাগরির নাম খালি রাখা যাবে না!',
    };
  }

  const normalizedTarget = cleanLabel.toLowerCase();

  if (editingValue) {
    const duplicate = existing.find(
      (c) =>
        c.value !== editingValue &&
        (c.label.trim().toLowerCase() === normalizedTarget || c.value.trim().toLowerCase() === normalizedTarget)
    );
    if (duplicate) {
      return {
        ok: false,
        list: [...existing],
        message: 'এই নামের ক্যাটাগরি ইতিমধ্যেই রয়েছে!',
      };
    }

    const nextItem: PlaceCategoryOption = { value: cleanLabel, label: cleanLabel };
    const nextList = existing.map((c) => (c.value === editingValue ? nextItem : c));
    return { ok: true, list: nextList, updatedItem: nextItem };
  }

  const duplicate = existing.find(
    (c) =>
      c.label.trim().toLowerCase() === normalizedTarget ||
      c.value.trim().toLowerCase() === normalizedTarget
  );
  if (duplicate) {
    return {
      ok: false,
      list: [...existing],
      message: 'এই নামের ক্যাটাগরি ইতিমধ্যেই তালিকায় আছে!',
    };
  }

  const nextItem: PlaceCategoryOption = { value: cleanLabel, label: cleanLabel };
  return {
    ok: true,
    list: [...existing, nextItem],
    updatedItem: nextItem,
  };
}

export function removePlaceCategory(
  existing: readonly PlaceCategoryOption[],
  valueToRemove: string
): { ok: boolean; list: PlaceCategoryOption[]; message?: string } {
  if (existing.length <= 1) {
    return {
      ok: false,
      list: [...existing],
      message: 'কমপক্ষে ১টি ক্যাটাগরি তালিকায় থাকা আবশ্যক!',
    };
  }
  const filtered = existing.filter((c) => c.value !== valueToRemove);
  return { ok: true, list: filtered };
}


