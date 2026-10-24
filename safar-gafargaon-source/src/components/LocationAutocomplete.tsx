import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X, Check, Navigation, Sparkles, Compass } from 'lucide-react';
import { GafargaonPlace, searchGafargaonPlaces, resolveLocationCoordinates } from '../data/gafargaonPlaces';

interface LocationAutocompleteProps {
  label: string;
  isPickup?: boolean;
  value: string;
  onChangeLocation: (name: string, coords: { lat: number; lng: number }) => void;
  onLocateGps?: () => void;
  isGpsActive?: boolean;
  placeholder?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  label,
  isPickup = false,
  value,
  onChangeLocation,
  onLocateGps,
  isGpsActive = false,
  placeholder = 'স্ট্যান্ড বা ঠিকানা খুঁজুন বা লিখুন...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<GafargaonPlace[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal input value with external prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Update suggestions on input change
  useEffect(() => {
    const results = searchGafargaonPlaces(inputValue);
    setSuggestions(results);
  }, [inputValue]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPlace = (place: GafargaonPlace) => {
    setInputValue(place.bengaliName);
    onChangeLocation(place.bengaliName, { lat: place.lat, lng: place.lng });
    setIsOpen(false);
  };

  const handleCustomConfirm = () => {
    if (!inputValue.trim()) return;
    const coords = resolveLocationCoordinates(inputValue, !isPickup);
    onChangeLocation(inputValue.trim(), coords);
    setIsOpen(false);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'স্ট্যান্ড':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'হাসপাতাল':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'শিক্ষা প্রতিষ্ঠান':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'বাজার':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'প্রশাসন':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="relative space-y-1" ref={containerRef}>
      {/* Label and GPS Action */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full inline-block ring-2 ${
              isPickup ? 'bg-emerald-600 ring-emerald-200' : 'bg-red-600 ring-red-200'
            }`}
          />
          <span>{label}</span>
        </label>

        {isPickup && onLocateGps && (
          <button
            type="button"
            onClick={onLocateGps}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer transition-colors ${
              isGpsActive ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-100/70'
            }`}
          >
            <Navigation className={`w-3 h-3 ${isGpsActive ? 'animate-pulse' : ''}`} />
            <span>{isGpsActive ? 'লাইভ GPS সক্রিয়' : '+ আমার GPS লোকেশন'}</span>
          </button>
        )}
      </div>

      {/* Input Field with Search Icon & Clear button */}
      <div className="relative flex items-center">
        <div className="absolute left-2.5 pointer-events-none text-slate-400">
          <MapPin className={`w-3.5 h-3.5 ${isPickup ? 'text-emerald-600' : 'text-red-500'}`} />
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-2 bg-white border border-slate-300 hover:border-slate-400 focus:border-emerald-500 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
        />

        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              setIsOpen(true);
            }}
            className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            title="মুছে ফেলুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[1200] max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header Note */}
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 flex items-center justify-between sticky top-0 z-10 border-b border-slate-100">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>গফরগাঁওয়ের সাজেশন তালিকা ({suggestions.length}টি পাওয়া গেছে)</span>
            </span>
            <span className="text-slate-400">ট্যাপ করে বাছুন</span>
          </div>

          {/* Matching Suggestion Items */}
          {suggestions.length > 0 ? (
            suggestions.map((place) => {
              const isSelected = value.trim() === place.bengaliName.trim();
              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className={`w-full px-3 py-2 text-left flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="mt-0.5 text-slate-400 shrink-0">
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <span>{place.bengaliName}</span>
                        {place.isPopular && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-semibold shrink-0">
                            জনপ্রিয়
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {place.area}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded border shrink-0 font-bold ${getCategoryBadgeClass(
                      place.category
                    )}`}
                  >
                    {place.category}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-center text-xs text-slate-500">
              কোনো পূর্বনির্ধারিত স্থান পাওয়া যায়নি
            </div>
          )}

          {/* Custom Typed Address Confirmation Item */}
          {inputValue.trim() && !suggestions.some((s) => s.bengaliName === inputValue.trim()) && (
            <button
              type="button"
              onClick={handleCustomConfirm}
              className="w-full px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold text-left flex items-center justify-between gap-2 border-t border-emerald-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Compass className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">
                  ✍️ <strong>"{inputValue.trim()}"</strong> কাস্টম ঠিকানা হিসেবে নিশ্চিত করুন
                </span>
              </div>
              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded shadow-2xs shrink-0">
                সেট করুন
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
