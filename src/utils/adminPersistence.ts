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

export interface MapAdminPinInput {
  bengaliName: string;
  name?: string;
  category: 'স্ট্যান্ড' | 'মোড়' | 'বাজার' | 'হাসপাতাল' | 'শিক্ষা প্রতিষ্ঠান' | 'প্রশাসন' | 'ইউনিয়ন';
  area: string;
  lat: number;
  lng: number;
  idSeed?: number;
}

export function buildAdminPlaceAndStandPayloads(input: MapAdminPinInput) {
  const ts = input.idSeed ?? Date.now();
  const bn = input.bengaliName.trim();
  const en = (input.name || '').trim() || bn;
  const area = (input.area || '').trim() || 'গফরগাঁও পৌরসভা';
  const lat = Number(Number(input.lat).toFixed(6));
  const lng = Number(Number(input.lng).toFixed(6));

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
