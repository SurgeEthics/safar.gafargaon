import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Navigation, X, Search, Check, Truck, Building2 } from 'lucide-react';
import { PauseMarqueeText } from './PauseMarqueeText';
import { GAFARGAON_UNIONS } from '../data/gafargaonUnionData';

export interface LocationAutocompleteProps {
  label: string;
  isPickup: boolean;
  value: string;
  isGpsActive?: boolean;
  userGps?: {
    lat: number | null;
    lng: number | null;
    accuracy?: number | null;
    isTracking?: boolean;
  };
  onLocateGps?: () => void;
  onChangeLocation: (name: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  places?: Array<{
    id?: string;
    name?: string;
    bengaliName?: string;
    category?: string;
    categoryLabel?: string;
    area?: string;
    unionNameBengali?: string;
    searchKeywords?: string[];
    isStand?: boolean;
    lat: number;
    lng: number;
  }>;
}

export interface UnifiedPlaceItem {
  id?: string;
  name: string;
  englishName?: string;
  category: string;
  categoryLabel: string;
  unionName?: string;
  area?: string;
  isStand?: boolean;
  searchKeywords?: string[];
  lat: number;
  lng: number;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  label,
  isPickup,
  value,
  isGpsActive = false,
  userGps,
  onLocateGps,
  onChangeLocation,
  placeholder = 'স্থান বা স্ট্যান্ড খুঁজুন...',
  places = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [selectedUnionFilter, setSelectedUnionFilter] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Map incoming items to unified structure
  const unifiedPlaces: UnifiedPlaceItem[] = places
    .filter(p => {
      const name = (p.bengaliName || p.name || '').trim();
      // Permanently remove any fictitious Goyeshpur UP bhaban
      if (name.includes('গয়েশপুর ইউনিয়ন পরিষদ') || name.includes('গয়েশপুর ইউপি') || name.includes('Gayeshpur Union Parishad')) {
        return false;
      }
      return true;
    })
    .map((p, idx) => {
      let rawUnion = p.unionNameBengali || (p.area && p.area.includes('ইউনিয়ন') ? p.area.split(',')[0].trim() : '');
      // If place mistakenly claims Goyeshpur is a union, assign to Paithol Union (Pagla)
      if (rawUnion.includes('গয়েশপুর')) {
        rawUnion = 'পাইথল ইউনিয়ন (পাগলা)';
      }
      if (!rawUnion || rawUnion === 'গফরগাঁও') {
        rawUnion = 'গফরগাঁও পৌরসভা';
      }

      let cleanArea = p.area || '';
      if (cleanArea.includes('গয়েশপুর ইউনিয়ন (পাগলা)')) {
        cleanArea = cleanArea.replace(/গয়েশপুর ইউনিয়ন \(পাগলা\)/g, 'পাইথল ইউনিয়ন, পাগলা');
      } else if (cleanArea.includes('গয়েশপুর ইউনিয়ন')) {
        cleanArea = cleanArea.replace(/গয়েশপুর ইউনিয়ন/g, 'পাইথল ইউনিয়ন, পাগলা');
      }

      return {
        id: p.id || `place-${idx}`,
        name: p.bengaliName || p.name || 'স্থান',
        englishName: p.name || '',
        category: p.category || (p.isStand ? 'স্ট্যান্ড' : 'স্থান'),
        categoryLabel: p.categoryLabel || p.category || (p.isStand ? 'স্ট্যান্ড' : 'জনপ্রিয় স্থান'),
        unionName: rawUnion,
        area: cleanArea,
        isStand: Boolean(p.isStand || (p.category && p.category.includes('স্ট্যান্ড'))),
        searchKeywords: p.searchKeywords || [],
        lat: p.lat,
        lng: p.lng
      };
    });

  // Canonical list of all 15 unions + Pourashava (including all Pagla thana unions)
  // Exactly 16 legitimate administrative entities (Gafargaon Pourashava + 15 Unions)
  // NEVER add arbitrary/redundant chips like bare 'গফরগাঁও' or non-existent 'গয়েশপুর (পাগলা)'
  const availableUnions = useMemo(() => {
    return GAFARGAON_UNIONS.map(u => u.nameBengali);
  }, []);

  // Filter based on search query and union filter
  const filteredPlaces = unifiedPlaces.filter((p) => {
    const q = inputValue.toLowerCase().trim();
    const matchesUnion = selectedUnionFilter === 'all' || (() => {
      const target = selectedUnionFilter.replace(' ইউনিয়ন', '').replace(' (পাগলা)', '').trim().toLowerCase();
      const placeUni = (p.unionName || '').replace(' ইউনিয়ন', '').replace(' (পাগলা)', '').trim().toLowerCase();
      const placeArea = (p.area || '').toLowerCase();
      return placeUni.includes(target) || target.includes(placeUni) || placeArea.includes(target);
    })();
    if (!matchesUnion) return false;

    if (!q || q.includes('আমার বর্তমান অবস্থান') || q.includes('gps') || q.includes('লাইভ')) {
      return true;
    }

    const nameMatch = p.name.toLowerCase().includes(q);
    const engMatch = p.englishName ? p.englishName.toLowerCase().includes(q) : false;
    const unionMatch = p.unionName ? p.unionName.toLowerCase().includes(q) : false;
    const areaMatch = p.area ? p.area.toLowerCase().includes(q) : false;
    const catMatch = p.categoryLabel.toLowerCase().includes(q);
    const kwMatch = p.searchKeywords?.some(kw => kw.toLowerCase().includes(q) || q.includes(kw.toLowerCase()));

    return nameMatch || engMatch || unionMatch || areaMatch || catMatch || kwMatch;
  });

  const handleSelectPlace = (place: UnifiedPlaceItem) => {
    setInputValue(place.name);
    onChangeLocation(place.name, { lat: place.lat, lng: place.lng });
    setIsOpen(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    onChangeLocation(text);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
          <MapPin className={`w-3.5 h-3.5 ${isPickup ? 'text-emerald-600' : 'text-red-500'}`} />
          <span>{label}</span>
        </label>
        {isPickup && onLocateGps && (
          <button
            type="button"
            onClick={onLocateGps}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              isGpsActive
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
            title="লাইভ GPS লোকেশন চিহ্নিত করুন"
          >
            <Navigation className={`w-3 h-3 ${isGpsActive ? 'text-emerald-600 animate-pulse' : ''}`} />
            <span>{isGpsActive ? 'GPS সক্রিয়' : 'আমার লোকেশন নিন'}</span>
          </button>
        )}
      </div>

      <div className="relative flex items-center bg-white border border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-xl px-2.5 py-1.5 transition-all shadow-xs">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
        <input
          type="text"
          value={inputValue}
          onChange={handleTextChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full text-xs font-semibold text-slate-800 placeholder-slate-400 bg-transparent outline-none truncate"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              onChangeLocation('');
            }}
            className="text-slate-400 hover:text-slate-600 p-1 shrink-0 ml-1 rounded-full hover:bg-slate-100 cursor-pointer"
            title="মুছুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto z-50 p-2 animate-in fade-in zoom-in-95">
          {/* Header & Quick Union Filter */}
          <div className="pb-1.5 mb-1.5 border-b border-slate-100">
            <div className="flex items-center justify-between px-1 mb-1 text-[10.5px]">
              <span className="font-bold text-slate-700">১৫টি ইউনিয়ন ও পৌরসভার স্থানসমূহ</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {filteredPlaces.length}টি স্থান
              </span>
            </div>

            {/* Quick Union Filter Tags - Horizontal Scroll with all 15 unions + Pourashava */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1 px-0.5 scroll-smooth touch-pan-x">
              <button
                type="button"
                onClick={() => setSelectedUnionFilter('all')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  selectedUnionFilter === 'all'
                    ? 'bg-emerald-700 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>সকল ইউনিয়ন</span>
              </button>
              {availableUnions.map((u) => {
                const isSelected = selectedUnionFilter === u;
                const isPagla = u.includes('পাগলা');
                const displayName = u.replace(' ইউনিয়ন', '').replace(' (পাগলা)', '');

                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setSelectedUnionFilter(u)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0 ${
                      isSelected
                        ? isPagla
                          ? 'bg-amber-600 text-white shadow-xs font-black'
                          : 'bg-emerald-700 text-white shadow-xs font-black'
                        : isPagla
                          ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <span>{displayName}</span>
                    {isPagla && (
                      <span className={`text-[8.5px] px-1 rounded font-bold ${
                        isSelected ? 'bg-amber-800 text-amber-100' : 'bg-amber-200/80 text-amber-900'
                      }`}>
                        পাগলা
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List of Places & Stands */}
          <div className="divide-y divide-slate-50 space-y-1">
            {filteredPlaces.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                কোনো তালিকাভুক্ত স্থান পাওয়া যায়নি। আপনি নিজের মতো টাইপ করতে পারেন।
              </div>
            ) : (
              filteredPlaces.map((place) => {
                const isSelected = inputValue.trim() === place.name.trim();
                return (
                  <button
                    key={`${place.name}-${place.lat}-${place.lng}`}
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected ? 'bg-emerald-100/80 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {place.isStand ? (
                        <Truck className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-700' : 'text-emerald-600'}`} />
                      ) : (
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${isPickup ? 'text-emerald-600' : 'text-red-500'}`} />
                      )}

                      <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                        <PauseMarqueeText
                          text={place.name}
                          className={`text-xs ${isSelected ? 'font-black text-emerald-950' : 'font-semibold text-slate-900'}`}
                          pauseSec={1.5}
                        />
                        <PauseMarqueeText
                          text={`${place.unionName ? place.unionName + ' • ' : ''}${place.area || place.categoryLabel || ''}`}
                          className={`text-[9.5px] block ${isSelected ? 'text-emerald-900 font-semibold' : 'text-slate-500'}`}
                          pauseSec={1.5}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        place.isStand ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {place.categoryLabel}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
