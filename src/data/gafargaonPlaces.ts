import { COMPREHENSIVE_UNION_PLACES, ComprehensivePlace } from './gafargaonUnionData';
import { GAFARGAON_OSM_PLACES } from './gafargaonOsmPlaces';

const ALL_STATIC_PLACES: ComprehensivePlace[] = [
  ...COMPREHENSIVE_UNION_PLACES,
  ...GAFARGAON_OSM_PLACES,
];

export type PlaceCategory =
  | 'স্ট্যান্ড'
  | 'মোড়'
  | 'বাজার'
  | 'হাসপাতাল'
  | 'শিক্ষা প্রতিষ্ঠান'
  | 'প্রশাসন'
  | 'ইউনিয়ন'
  | 'বাসা / বাড়ি'
  | 'মসজিদ / মাদ্রাসা'
  | 'দোকান / ব্যাবসা প্রতিষ্ঠান'
  | (string & {});

export interface PlaceCategoryOption {
  value: string;
  label: string;
}

export const PLACE_CATEGORY_OPTIONS: PlaceCategoryOption[] = [
  { value: 'স্ট্যান্ড', label: 'স্ট্যান্ড পয়েন্ট' },
  { value: 'মোড়', label: 'চৌরাস্তা / মোড়' },
  { value: 'বাজার', label: 'বাজার / হাট' },
  { value: 'হাসপাতাল', label: 'হাসপাতাল / স্বাস্থ্যকেন্দ্র' },
  { value: 'শিক্ষা প্রতিষ্ঠান', label: 'স্কুল / কলেজ' },
  { value: 'প্রশাসন', label: 'থানা / সরকারি অফিস' },
  { value: 'ইউনিয়ন', label: 'ইউনিয়ন পরিষদ' },
  { value: 'বাসা / বাড়ি', label: 'বাসা / বাড়ি' },
  { value: 'মসজিদ / মাদ্রাসা', label: 'মসজিদ / মাদ্রাসা' },
  { value: 'দোকান / ব্যাবসা প্রতিষ্ঠান', label: 'দোকান / ব্যাবসা প্রতিষ্ঠান' },
];

export interface GafargaonPlace {
  id: string;
  name: string;
  bengaliName: string;
  category: PlaceCategory;
  area: string;
  lat: number;
  lng: number;
  isPopular?: boolean;
  showOnMap?: boolean;
}

// Unified Gafargaon & Pagla Places (Derived from Comprehensive 15-Union + OSM Bounded Database)
export const GAFARGAON_PLACES: GafargaonPlace[] = ALL_STATIC_PLACES.map(p => ({
  id: p.id,
  name: p.name,
  bengaliName: p.bengaliName,
  category: p.category,
  area: `${p.unionNameBengali}, ${p.area}`,
  lat: p.lat,
  lng: p.lng,
  isPopular: p.isPopular
}));

export const STATIC_GAFARGAON_PLACE_IDS: ReadonlySet<string> = new Set(
  GAFARGAON_PLACES.map(p => p.id)
);

/**
 * Resolves GPS Coordinates for any Gafargaon or Pagla location query
 * Supports English transliterations, typos, and Bengali search assumptions
 */
export function resolveLocationCoordinates(
  locName: string,
  isDestination: boolean = false,
  customStands?: Array<{ name?: string; bengaliName?: string; lat?: number; lng?: number }>
): { lat: number; lng: number; matchedPlace?: any } {
  if (!locName || locName.trim() === '') {
    return isDestination ? { lat: 24.4515, lng: 90.5535 } : { lat: 24.4536, lng: 90.5479 };
  }

  const clean = locName.trim().toLowerCase();

  // 0. Check dynamic / custom stands first (so user-updated coordinates from Google Maps take immediate effect)
  let standList = customStands;
  if (!standList && typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('safar_stands_v6');
      if (saved) {
        standList = JSON.parse(saved);
      }
    } catch {}
  }
  if (Array.isArray(standList) && standList.length > 0) {
    const standMatch = standList.find(s => {
      const bn = (s.bengaliName || '').toLowerCase().trim();
      const en = (s.name || '').toLowerCase().trim();
      if (!bn && !en) return false;
      const simpleBn = bn.replace(' স্ট্যান্ড', '').replace(' মোড়', '').replace(' বাজার', '').trim();
      return (
        (bn && (bn === clean || clean.includes(bn) || bn.includes(clean))) ||
        (simpleBn && simpleBn.length >= 3 && clean.includes(simpleBn)) ||
        (en && (en === clean || clean.includes(en) || en.includes(clean)))
      );
    });
    if (standMatch && typeof standMatch.lat === 'number' && typeof standMatch.lng === 'number') {
      return { lat: standMatch.lat, lng: standMatch.lng, matchedPlace: standMatch };
    }
  }

  // 0.5 Check saved/admin-managed popular places before static seed list
  if (typeof window !== 'undefined') {
    try {
      const savedPlacesRaw = localStorage.getItem('safar_popular_places_v1');
      if (savedPlacesRaw) {
        const savedPlaces = JSON.parse(savedPlacesRaw);
        if (Array.isArray(savedPlaces)) {
          const dynamicPlaceMatch = savedPlaces.find((p: any) => {
            const bn = (p?.bengaliName || '').toLowerCase().trim();
            const en = (p?.name || '').toLowerCase().trim();
            return (bn && bn === clean) || (en && en === clean);
          });
          if (dynamicPlaceMatch && typeof dynamicPlaceMatch.lat === 'number' && typeof dynamicPlaceMatch.lng === 'number') {
            return { lat: dynamicPlaceMatch.lat, lng: dynamicPlaceMatch.lng, matchedPlace: dynamicPlaceMatch };
          }
        }
      }
    } catch {}
  }

  // 1. Exact match in comprehensive + OSM places dataset
  const exact = ALL_STATIC_PLACES.find(
    p => p.bengaliName.toLowerCase() === clean || p.name.toLowerCase() === clean
  );
  if (exact) return { lat: exact.lat, lng: exact.lng, matchedPlace: exact };

  // 2. Direct name substring match (handles bilingual OSM names like "Dhopaghat Bazar ধোপাঘাট বাজার")
  const nameContains = ALL_STATIC_PLACES.find(
    p => p.bengaliName.toLowerCase().includes(clean) || p.name.toLowerCase().includes(clean)
  );
  if (nameContains) return { lat: nameContains.lat, lng: nameContains.lng, matchedPlace: nameContains };

  // 3. Exact keyword match in searchKeywords
  const exactKeywordMatch = ALL_STATIC_PLACES.find(p =>
    p.searchKeywords && p.searchKeywords.some(kw => kw.toLowerCase() === clean)
  );
  if (exactKeywordMatch) return { lat: exactKeywordMatch.lat, lng: exactKeywordMatch.lng, matchedPlace: exactKeywordMatch };

  // 4. Partial / stripped suffix match
  const partial = ALL_STATIC_PLACES.find(p => {
    const simpleBn = p.bengaliName.replace(' স্ট্যান্ড', '').replace(' মোড়', '').replace(' বাজার', '').trim().toLowerCase();
    return simpleBn.length >= 3 && (clean.includes(simpleBn) || simpleBn.includes(clean));
  });
  if (partial) return { lat: partial.lat, lng: partial.lng, matchedPlace: partial };

  // 5. Longer keyword substring match (skipping short generic tags like "বাজার"/"stand")
  const keywordMatch = ALL_STATIC_PLACES.find(p =>
    p.searchKeywords && p.searchKeywords.some(kw => {
      const k = kw.toLowerCase().trim();
      return k.length >= 4 && !['বাজার', 'মোড়', 'স্ট্যান্ড', 'bazar', 'stand', 'more', 'pagla', 'gafargaon'].includes(k) && clean.includes(k);
    })
  );
  if (keywordMatch) return { lat: keywordMatch.lat, lng: keywordMatch.lng, matchedPlace: keywordMatch };

  // 4. Keyword matching for common Gafargaon & Pagla locations with exact Google Maps coordinates
  if (clean.includes('gps') || clean.includes('লাইভ') || clean.includes('আমার অবস্থান') || clean.includes('বর্তমান অবস্থান')) {
    return { lat: 24.4536, lng: 90.5479 };
  }
  if (clean.includes('পাগলা')) return { lat: 24.3325, lng: 90.5825 };
  if (clean.includes('দত্তেরবাজার') || clean.includes('দত্তের বাজার')) return { lat: 24.3387, lng: 90.5883 };
  if (clean.includes('হাসপাতাল') || clean.includes('স্বাস্থ্য')) return { lat: 24.4627, lng: 90.5429 };
  if (clean.includes('রেলওয়ে') || clean.includes('স্টেশন')) return { lat: 24.4536, lng: 90.5479 };
  if (clean.includes('পৌরসভা') || clean.includes('শহিদ মিনার')) return { lat: 24.4515, lng: 90.5535 };
  if (clean.includes('থানা')) return { lat: 24.4520, lng: 90.5542 };
  if (clean.includes('জামতলী') || clean.includes('জামতলি')) return { lat: 24.4528, lng: 90.5492 };
  if (clean.includes('শিবগঞ্জ')) return { lat: 24.4625, lng: 90.5630 };
  if (clean.includes('রওনা')) return { lat: 24.4320, lng: 90.5480 };
  if (clean.includes('বালিপাড়া')) return { lat: 24.4590, lng: 90.5540 };
  if (clean.includes('দত্তপাড়া')) return { lat: 24.4480, lng: 90.5490 };
  if (clean.includes('কান্দার') || clean.includes('কান্দাপাড়া')) return { lat: 24.4580, lng: 90.5410 };
  if (clean.includes('কান্দিপাড়া')) return { lat: 24.3738, lng: 90.5918 };
  if (clean.includes('গোলন্দাজ') || clean.includes('আলতাফ')) return { lat: 24.4465, lng: 90.5510 };
  if (clean.includes('কলেজ') || clean.includes('ডাকবাংলো')) return { lat: 24.4510, lng: 90.5520 };
  if (clean.includes('লংগাইর')) return { lat: 24.4120, lng: 90.5620 };
  if (clean.includes('সালটিয়া')) return { lat: 24.4560, lng: 90.5450 };
  if (clean.includes('পাঁচবাগ') || clean.includes('পাঁচভাগ')) return { lat: 24.3713, lng: 90.5859 };
  if (clean.includes('নিগুয়ারী') || clean.includes('নিগুয়ারী')) return { lat: 24.3050, lng: 90.5750 };
  if (clean.includes('রসুলপুর')) return { lat: 24.4850, lng: 90.5650 };
  if (clean.includes('টাঙ্গাব')) return { lat: 24.3220, lng: 90.5250 };
  if (clean.includes('উস্থি')) return { lat: 24.3980, lng: 90.5750 };
  if (clean.includes('মশাখালী')) return { lat: 24.3854, lng: 90.5362 };
  if (clean.includes('কাচারী')) return { lat: 24.4525, lng: 90.5510 };
  if (clean.includes('বারবাড়িয়া') || clean.includes('বারবারিয়া')) return { lat: 24.4855, lng: 90.4844 };
  if (clean.includes('চরআলগী')) return { lat: 24.4750, lng: 90.5780 };
  if (clean.includes('ধুলদী') || clean.includes('ধুলদি')) return { lat: 24.4680, lng: 90.5510 };
  if (clean.includes('পিরোজপুর') || clean.includes('পিয়ারপুর')) return { lat: 24.4190, lng: 90.5520 };

  // 5. Fallback deterministic offset based on character codes so custom locations
  // never collide onto identical coordinates with pickup
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 25) - 12) * 0.0012;
  const lngOffset = ((Math.abs(hash * 7) % 25) - 12) * 0.0012;

  const baseCenterLat = isDestination ? 24.4515 : 24.4536;
  const baseCenterLng = isDestination ? 90.5535 : 90.5479;

  return {
    lat: Number((baseCenterLat + latOffset).toFixed(4)),
    lng: Number((baseCenterLng + lngOffset).toFixed(4))
  };
}
