export interface GafargaonPlace {
  id: string;
  name: string;
  bengaliName: string;
  category: 'স্ট্যান্ড' | 'মোড়' | 'বাজার' | 'হাসপাতাল' | 'শিক্ষা প্রতিষ্ঠান' | 'প্রশাসন' | 'ইউনিয়ন';
  area: string;
  lat: number;
  lng: number;
  isPopular?: boolean;
}

export const GAFARGAON_PLACES: GafargaonPlace[] = [
  // Stand & Transport Hubs
  {
    id: 'railway-station',
    name: 'Gafargaon Railway Station North',
    bengaliName: 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
    category: 'স্ট্যান্ড',
    area: 'পৌরসভা ১ নং ওয়ার্ড, প্রধান রেলওয়ে গেট সংলগ্ন',
    lat: 24.5518,
    lng: 90.5512,
    isPopular: true
  },
  {
    id: 'pouroshova-chottor',
    name: 'Pouroshova Chottor Circle',
    bengaliName: 'পৌরসভা চত্বর স্ট্যান্ড',
    category: 'স্ট্যান্ড',
    area: 'পৌরসভা ভবন ও কেন্দ্রীয় শহিদ মিনার চত্বর',
    lat: 24.5562,
    lng: 90.5539,
    isPopular: true
  },
  {
    id: 'hospital-mor',
    name: 'Upazila Health Complex Hospital',
    bengaliName: 'উপজেলা স্বাস্থ্য কমপ্লেক্স (হাসপাতাল) স্ট্যান্ড',
    category: 'হাসপাতাল',
    area: 'হাসপাতাল রোড, জরুরি বিভাগ ফটক',
    lat: 24.5585,
    lng: 90.5482,
    isPopular: true
  },
  {
    id: 'pagla-thana',
    name: 'Pagla Thana Mor Stand',
    bengaliName: 'পাগলা থানা স্ট্যান্ড',
    category: 'প্রশাসন',
    area: 'পাগলা থানা গেট ও ব্যস্ততম ত্রি-মোহনা',
    lat: 24.4530,
    lng: 90.5050,
    isPopular: true
  },
  {
    id: 'shibganj-bazar',
    name: 'Shibganj Bazar Mor',
    bengaliName: 'শিবগঞ্জ বাজার মোড় স্ট্যান্ড',
    category: 'বাজার',
    area: 'শিবগঞ্জ ব্রিজ ও সিএনজি পয়েন্ট',
    lat: 24.5630,
    lng: 90.5620,
    isPopular: true
  },
  {
    id: 'rawna-mor',
    name: 'Rawna Bazar Mor',
    bengaliName: 'রওনা বাজার মোড়',
    category: 'বাজার',
    area: 'রওনা ইউনিয়ন পরিষদ সংলগ্ন বাজার',
    lat: 24.5300,
    lng: 90.5400,
    isPopular: true
  },
  {
    id: 'balipara-road',
    name: 'Balipara Road Mor Stand',
    bengaliName: 'বালিপাড়া রোড মোড় স্ট্যান্ড',
    category: 'মোড়',
    area: 'বালিপাড়া লিংক রোড সংযোগ পয়েন্ট',
    lat: 24.5590,
    lng: 90.5590,
    isPopular: true
  },
  {
    id: 'duttapara-mor',
    name: 'Duttapara Mor Stand',
    bengaliName: 'দত্তপাড়া মোড় স্ট্যান্ড',
    category: 'মোড়',
    area: 'দত্তপাড়া বটতলা মোড়',
    lat: 24.5440,
    lng: 90.5480,
    isPopular: true
  },
  {
    id: 'kander-bazar',
    name: 'Kander Bazar Stand',
    bengaliName: 'কান্দার বাজার স্ট্যান্ড',
    category: 'বাজার',
    area: 'কান্দাপাড়া চৌরাস্তা',
    lat: 24.5710,
    lng: 90.5420,
    isPopular: true
  },

  // Educational Institutions & Landmark Junctions
  {
    id: 'altaf-golandaz-college',
    name: 'Altaf Golandaz Degree College Mor',
    bengaliName: 'আলতাফ গোলন্দাজ ডিগ্রি কলেজ মোড়',
    category: 'শিক্ষা প্রতিষ্ঠান',
    area: 'গোলন্দাজ রোড, কলেজ প্রধান গেট',
    lat: 24.5505,
    lng: 90.5470,
    isPopular: true
  },
  {
    id: 'gafargaon-govt-college',
    name: 'Gafargaon Govt College & Dakbanglo',
    bengaliName: 'গফরগাঁও সরকারি কলেজ ও ডাকবাংলো মোড়',
    category: 'শিক্ষা প্রতিষ্ঠান',
    area: 'ডাকবাংলো লিংক রোড ও কলেজ হোস্টেল গেট',
    lat: 24.5540,
    lng: 90.5495,
    isPopular: true
  },
  {
    id: 'islamia-high-school',
    name: 'Gafargaon Islamia Govt High School',
    bengaliName: 'ইসলামিয়া সরকারি হাইস্কুল গেট',
    category: 'শিক্ষা প্রতিষ্ঠান',
    area: 'পৌর স্কুল রোড',
    lat: 24.5530,
    lng: 90.5525
  },
  {
    id: 'khairullah-girls-school',
    name: 'Khairullah Govt Girls High School',
    bengaliName: 'খায়রুল্লাহ সরকারি বালিকা বিদ্যালয় মোড়',
    category: 'শিক্ষা প্রতিষ্ঠান',
    area: 'বালিকা বিদ্যালয় রোড',
    lat: 24.5550,
    lng: 90.5505
  },

  // Important Unions & Markets in Gafargaon
  {
    id: 'longgair-mor',
    name: 'Longgair Bazar Mor',
    bengaliName: 'লংগাইর মোড় ও বাজার',
    category: 'ইউনিয়ন',
    area: 'লংগাইর ইউনিয়ন পরিষদ ও বাজার চত্বর',
    lat: 24.5210,
    lng: 90.5650,
    isPopular: true
  },
  {
    id: 'saltia-bazar',
    name: 'Saltia Union Bazar Mor',
    bengaliName: 'সালটিয়া বাজার মোড়',
    category: 'বাজার',
    area: 'সালটিয়া ইউনিয়ন পরিষদ সংলগ্ন বাজার',
    lat: 24.5410,
    lng: 90.5390,
    isPopular: true
  },
  {
    id: 'panchbag-bazar',
    name: 'Panchbag Bazar Mor',
    bengaliName: 'পাঁচবাগ বাজার মোড়',
    category: 'বাজার',
    area: 'পাঁচবাগ ইউনিয়ন প্রধান পয়েন্ট',
    lat: 24.4850,
    lng: 90.5380,
    isPopular: true
  },
  {
    id: 'niguari-bazar',
    name: 'Niguari Bazar Mor',
    bengaliName: 'নিগুয়ারী বাজার মোড়',
    category: 'বাজার',
    area: 'নিগুয়ারী ইউনিয়ন দক্ষিণ মোড়',
    lat: 24.4250,
    lng: 90.5120
  },
  {
    id: 'rasulpur-bazar',
    name: 'Rasulpur Bazar Mor',
    bengaliName: 'রসুলপুর বাজার মোড়',
    category: 'বাজার',
    area: 'রসুলপুর ইউনিয়ন পরিষদ সংলগ্ন',
    lat: 24.5750,
    lng: 90.5700
  },
  {
    id: 'tangab-bazar',
    name: 'Tangab Bazar Mor',
    bengaliName: 'টাঙ্গাব বাজার মোড়',
    category: 'বাজার',
    area: 'টাঙ্গাব ইউনিয়ন পশ্চিম পয়েন্ট',
    lat: 24.4390,
    lng: 90.4850
  },
  {
    id: 'usthi-bazar',
    name: 'Usthi Bazar',
    bengaliName: 'উস্থি বাজার মোড়',
    category: 'বাজার',
    area: 'উস্থি ইউনিয়ন পূর্ব বাজার',
    lat: 24.4980,
    lng: 90.5750
  },
  {
    id: 'moshakhali-station',
    name: 'Moshakhali Railway Station & Bazar',
    bengaliName: 'মশাখালী রেলওয়ে স্টেশন ও বাজার',
    category: 'স্ট্যান্ড',
    area: 'মশাখালী ইউনিয়ন ও রেলওয়ে জংশন',
    lat: 24.4720,
    lng: 90.5310,
    isPopular: true
  },
  {
    id: 'charalgi-mor',
    name: 'Charalgi Union Mor',
    bengaliName: 'চরআলগী মোড় ও ইউনিয়ন পরিষদ',
    category: 'ইউনিয়ন',
    area: 'চরআলগী ইউনিয়ন পয়েন্ট',
    lat: 24.5680,
    lng: 90.5820
  },
  {
    id: 'barbaria-bazar',
    name: 'Barbaria Bazar Mor',
    bengaliName: 'বারবাড়িয়া বাজার',
    category: 'বাজার',
    area: 'বারবাড়িয়া ইউনিয়ন উত্তর সীমান্ত',
    lat: 24.5820,
    lng: 90.5350
  },
  {
    id: 'jashora-bazar',
    name: 'Jashora Union Bazar',
    bengaliName: 'যশরা ইউনিয়ন বাজার',
    category: 'ইউনিয়ন',
    area: 'যশরা ইউনিয়ন কেন্দ্র',
    lat: 24.5350,
    lng: 90.5150
  },
  {
    id: 'ghagra-bazar',
    name: 'Ghagra Bazar Mor',
    bengaliName: 'ঘাগড়া বাজার মোড়',
    category: 'বাজার',
    area: 'ঘাগড়া বাজার পয়েন্ট',
    lat: 24.5120,
    lng: 90.5280
  },
  {
    id: 'joydhorkhali-mor',
    name: 'Joydhorkhali Mor',
    bengaliName: 'জয়ধরখালী মোড়',
    category: 'মোড়',
    area: 'যশরা-গফরগাঁও সংযোগ রোড',
    lat: 24.5620,
    lng: 90.5350
  },
  {
    id: 'bashiya-mor',
    name: 'Bashiya Mor',
    bengaliName: 'বাশিয়া মোড়',
    category: 'মোড়',
    area: 'চরআলগী রোড মোড়',
    lat: 24.5380,
    lng: 90.5620
  },
  {
    id: 'kazir-bazar',
    name: 'Kazir Bazar Mor',
    bengaliName: 'কাজীর বাজার মোড়',
    category: 'বাজার',
    area: 'কাজীর বাজার লিংক পয়েন্ট',
    lat: 24.5480,
    lng: 90.5590
  },

  // City Centre, Roads & Ghats
  {
    id: 'kachari-road',
    name: 'Kachari Road Mor',
    bengaliName: 'কাচারী রোড মোড়',
    category: 'মোড়',
    area: 'ভূমি অফিস ও আদালত চত্বর সংলগ্ন',
    lat: 24.5545,
    lng: 90.5500,
    isPopular: true
  },
  {
    id: 'thana-road',
    name: 'Gafargaon Model Thana Road',
    bengaliName: 'থানা রোড ও গফরগাঁও মডেল থানা',
    category: 'প্রশাসন',
    area: 'মডেল থানা ফটক ও ট্রাফিক পয়েন্ট',
    lat: 24.5555,
    lng: 90.5515
  },
  {
    id: 'pouro-kachabazar',
    name: 'Pouro Notun Kacha Bazar',
    bengaliName: 'পৌর নতুন কাঁচাবাজার মোড়',
    category: 'বাজার',
    area: 'পৌরসভা কাঁচাবাজার ও আড়ত',
    lat: 24.5570,
    lng: 90.5530
  },
  {
    id: 'old-railway-bridge',
    name: 'Old Railway Bridge Ghat Mor',
    bengaliName: 'পুরাতন রেলওয়ে ব্রিজ সংলগ্ন ঘাট',
    category: 'মোড়',
    area: 'নদী সংলগ্ন পুরাতন রেলওয়ে ব্রিজ পয়েন্ট',
    lat: 24.5510,
    lng: 90.5545
  },
  {
    id: 'shila-river-ghat',
    name: 'Shila River Ghat Mor',
    bengaliName: 'শিলা নদী ঘাট মোড়',
    category: 'মোড়',
    area: 'নৌকা ঘাট ও বেরীবাঁধ রোড',
    lat: 24.5460,
    lng: 90.5560
  },
  {
    id: 'bottola-mor',
    name: 'Bottola Mor',
    bengaliName: 'বটতলা মোড়',
    category: 'মোড়',
    area: 'গফরগাঁও কলেজিয়েট রোড বটতলা',
    lat: 24.5490,
    lng: 90.5490
  },
  {
    id: 'pouro-park',
    name: 'Pouro Central Park & Muktomoncho',
    bengaliName: 'পৌর কেন্দ্রীয় পার্ক ও মুক্তমঞ্চ',
    category: 'মোড়',
    area: 'পার্ক রোড সংলগ্ন চত্বর',
    lat: 24.5558,
    lng: 90.5520
  }
];

// Helper to search and filter Gafargaon places with Bengali fuzzy matching
export function searchGafargaonPlaces(query: string): GafargaonPlace[] {
  if (!query || query.trim() === '') {
    return GAFARGAON_PLACES.filter(p => p.isPopular).slice(0, 8);
  }

  const cleanQuery = query.trim().toLowerCase();

  return GAFARGAON_PLACES.filter(p => {
    const bnMatch = p.bengaliName.toLowerCase().includes(cleanQuery);
    const enMatch = p.name.toLowerCase().includes(cleanQuery);
    const areaMatch = p.area.toLowerCase().includes(cleanQuery);
    const catMatch = p.category.toLowerCase().includes(cleanQuery);
    return bnMatch || enMatch || areaMatch || catMatch;
  });
}

// Deterministic coordinate resolver for any custom address in Gafargaon
export function resolveLocationCoordinates(
  locName: string,
  isDestination = false
): { lat: number; lng: number; matchedPlace?: GafargaonPlace } {
  if (!locName || locName.trim() === '') {
    return isDestination ? { lat: 24.5585, lng: 90.5482 } : { lat: 24.5518, lng: 90.5512 };
  }

  const clean = locName.trim().toLowerCase();

  // 1. Direct match in places dataset
  const exact = GAFARGAON_PLACES.find(
    p => p.bengaliName.toLowerCase() === clean || p.name.toLowerCase() === clean
  );
  if (exact) return { lat: exact.lat, lng: exact.lng, matchedPlace: exact };

  // 2. Partial / Substring match
  const partial = GAFARGAON_PLACES.find(p => {
    const simpleBn = p.bengaliName.replace(' স্ট্যান্ড', '').replace(' মোড়', '').replace(' বাজার', '').toLowerCase();
    return clean.includes(simpleBn) || simpleBn.includes(clean);
  });
  if (partial) return { lat: partial.lat, lng: partial.lng, matchedPlace: partial };

  // 3. Keyword matching for common Gafargaon locations
  if (clean.includes('gps') || clean.includes('লাইভ') || clean.includes('আমার অবস্থান') || clean.includes('বর্তমান অবস্থান')) {
    return { lat: 24.5518, lng: 90.5512 };
  }
  if (clean.includes('পাগলা')) return { lat: 24.4530, lng: 90.5050 };
  if (clean.includes('হাসপাতাল') || clean.includes('স্বাস্থ্য')) return { lat: 24.5585, lng: 90.5482 };
  if (clean.includes('রেলওয়ে') || clean.includes('স্টেশন')) return { lat: 24.5518, lng: 90.5512 };
  if (clean.includes('পৌরসভা') || clean.includes('শহিদ মিনার')) return { lat: 24.5562, lng: 90.5539 };
  if (clean.includes('শিবগঞ্জ')) return { lat: 24.5630, lng: 90.5620 };
  if (clean.includes('রওনা')) return { lat: 24.5300, lng: 90.5400 };
  if (clean.includes('বালিপাড়া')) return { lat: 24.5590, lng: 90.5590 };
  if (clean.includes('দত্তপাড়া')) return { lat: 24.5440, lng: 90.5480 };
  if (clean.includes('কান্দার') || clean.includes('কান্দাপাড়া')) return { lat: 24.5710, lng: 90.5420 };
  if (clean.includes('গোলন্দাজ') || clean.includes('আলতাফ')) return { lat: 24.5505, lng: 90.5470 };
  if (clean.includes('কলেজ') || clean.includes('ডাকবাংলো')) return { lat: 24.5540, lng: 90.5495 };
  if (clean.includes('লংগাইর')) return { lat: 24.5210, lng: 90.5650 };
  if (clean.includes('সালটিয়া')) return { lat: 24.5410, lng: 90.5390 };
  if (clean.includes('পাঁচবাগ')) return { lat: 24.4850, lng: 90.5380 };
  if (clean.includes('নিগুয়ারী')) return { lat: 24.4250, lng: 90.5120 };
  if (clean.includes('রসুলপুর')) return { lat: 24.5750, lng: 90.5700 };
  if (clean.includes('টাঙ্গাব')) return { lat: 24.4390, lng: 90.4850 };
  if (clean.includes('উস্থি')) return { lat: 24.4980, lng: 90.5750 };
  if (clean.includes('মশাখালী')) return { lat: 24.4720, lng: 90.5310 };
  if (clean.includes('কাচারী')) return { lat: 24.5545, lng: 90.5500 };
  if (clean.includes('থানা')) return { lat: 24.5555, lng: 90.5515 };

  // 4. Fallback deterministic offset based on character codes so custom locations 
  // never collide onto identical coordinates with pickup!
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 25) - 12) * 0.0018; // approx ±2.5 km
  const lngOffset = ((Math.abs(hash * 7) % 25) - 12) * 0.0018;

  const baseCenterLat = isDestination ? 24.5585 : 24.5518;
  const baseCenterLng = isDestination ? 90.5482 : 90.5512;

  return {
    lat: Number((baseCenterLat + latOffset).toFixed(4)),
    lng: Number((baseCenterLng + lngOffset).toFixed(4))
  };
}
