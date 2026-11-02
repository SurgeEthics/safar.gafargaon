import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, User, Car, Shield, MapPin, Landmark, ChevronRight, Check } from 'lucide-react';
import { Driver, Stand } from '../types';
import { GafargaonPlace } from '../data/gafargaonPlaces';
import { toBengaliNumber } from '../utils/calculator';
import { PauseMarqueeText } from './PauseMarqueeText';

export interface SuggestionItem {
  id: string;
  type: 'driver' | 'vehicle' | 'license' | 'stand' | 'place';
  typeLabel: string;
  title: string;
  subTitle?: string;
  badge?: string;
  badgeColor?: string;
  targetQuery: string;
  standName?: string;
  categoryId?: string;
}

interface DriverSearchAutocompleteProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  drivers: Driver[];
  stands: Stand[];
  places: any[];
  onSelectStand?: (standName: string) => void;
  onSelectCategory?: (category: string) => void;
  className?: string;
}

export const DriverSearchAutocomplete: React.FC<DriverSearchAutocompleteProps> = ({
  searchQuery,
  onSearchChange,
  drivers,
  stands,
  places,
  onSelectStand,
  onSelectCategory,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute matched suggestions across চালকের নাম, গাড়ি, লাইসেন্স, স্ট্যান্ড, জনপ্রিয় স্থান
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const list: SuggestionItem[] = [];
    const addedKeys = new Set<string>();

    // 1. চালকের নাম (Driver Name)
    for (const d of drivers) {
      const matchName = d.name.toLowerCase().includes(q);
      const matchPhone = d.phone.includes(q);
      if (matchName || matchPhone) {
        const key = `drv-${d.id}`;
        if (!addedKeys.has(key)) {
          addedKeys.add(key);
          list.push({
            id: key,
            type: 'driver',
            typeLabel: 'চালক',
            title: d.name,
            subTitle: `${d.vehicleModel || 'বাহন'} • ${d.standName || 'স্ট্যান্ড'}`,
            badge: d.rating ? `★ ${d.rating}` : 'ভেরিফাইড',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            targetQuery: d.name,
            standName: d.standName,
            categoryId: d.category
          });
        }
      }
    }

    // 2. গাড়ি / মডেল (Vehicle Model or Category)
    for (const d of drivers) {
      const model = d.vehicleModel || '';
      const catBn = d.categoryBengali || '';
      if (
        (model && model.toLowerCase().includes(q)) ||
        (catBn && catBn.toLowerCase().includes(q))
      ) {
        const title = model || catBn;
        const key = `veh-${title.toLowerCase()}`;
        if (!addedKeys.has(key)) {
          addedKeys.add(key);
          list.push({
            id: key,
            type: 'vehicle',
            typeLabel: 'গাড়ি / বাহন',
            title: title,
            subTitle: `চালক: ${d.name} • ${d.standName || ''}`,
            badge: d.categoryBengali || 'যানবাহন',
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
            targetQuery: title,
            categoryId: d.category
          });
        }
      }
    }

    // 3. লাইসেন্স ও প্লেট নম্বর (License / Number Plate)
    for (const d of drivers) {
      const license = d.licenseNumber || '';
      const plate = d.plateNumber || '';
      if (
        (license && license.toLowerCase().includes(q)) ||
        (plate && plate.toLowerCase().includes(q))
      ) {
        const displayCode = license && license.toLowerCase().includes(q) ? license : plate;
        const key = `lic-${d.id}-${displayCode}`;
        if (!addedKeys.has(key)) {
          addedKeys.add(key);
          list.push({
            id: key,
            type: 'license',
            typeLabel: 'লাইসেন্স / প্লেট',
            title: displayCode,
            subTitle: `${d.name} (${d.vehicleModel})`,
            badge: 'বিআরটিএ',
            badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
            targetQuery: displayCode,
            standName: d.standName
          });
        }
      }
    }

    // 4. স্ট্যান্ড (Stand Name)
    for (const s of stands) {
      const matchBn = s.bengaliName.toLowerCase().includes(q);
      const matchEn = s.name.toLowerCase().includes(q);
      const matchLoc = s.location && s.location.toLowerCase().includes(q);
      if (matchBn || matchEn || matchLoc) {
        const key = `std-${s.id}`;
        if (!addedKeys.has(key)) {
          addedKeys.add(key);
          list.push({
            id: key,
            type: 'stand',
            typeLabel: 'স্ট্যান্ড',
            title: s.bengaliName,
            subTitle: s.location || 'গফরগাঁও / পাগলা এলাকা',
            badge: `${toBengaliNumber(s.driverCount || s.activeDrivers || 0)} চালক`,
            badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
            targetQuery: s.bengaliName.replace(' স্ট্যান্ড', ''),
            standName: s.bengaliName
          });
        }
      }
    }

    // 5. জনপ্রিয় স্থান (Popular Places / Landmarks)
    for (const p of places) {
      const bn = p.bengaliName || p.nameBn || '';
      const en = p.name || p.nameEn || '';
      const uni = p.unionNameBengali || p.union || p.area || '';
      const matchBn = bn.toLowerCase().includes(q);
      const matchEn = en.toLowerCase().includes(q);
      const matchUni = uni.toLowerCase().includes(q);
      if (matchBn || matchEn || matchUni) {
        const key = `plc-${p.id || bn}`;
        if (!addedKeys.has(key)) {
          addedKeys.add(key);
          list.push({
            id: key,
            type: 'place',
            typeLabel: 'জনপ্রিয় স্থান',
            title: bn,
            subTitle: `${uni ? uni + ' • ' : ''}${p.categoryLabel || p.category || 'ল্যান্ডমার্ক'}`,
            badge: p.categoryLabel || p.category || 'স্থান',
            badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
            targetQuery: bn
          });
        }
      }
    }

    // Limit to top 15 most relevant suggestions to keep mobile snappy and clean
    return list.slice(0, 15);
  }, [searchQuery, drivers, stands, places]);

  // Handle selecting an item
  const handleSelectItem = (item: SuggestionItem) => {
    onSearchChange(item.targetQuery);
    if (item.standName && onSelectStand) {
      onSelectStand(item.standName);
    }
    if (item.categoryId && onSelectCategory) {
      onSelectCategory(item.categoryId);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectItem(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const renderIcon = (type: SuggestionItem['type']) => {
    switch (type) {
      case 'driver':
        return <User className="w-3.5 h-3.5 text-emerald-600" />;
      case 'vehicle':
        return <Car className="w-3.5 h-3.5 text-amber-600" />;
      case 'license':
        return <Shield className="w-3.5 h-3.5 text-blue-600" />;
      case 'stand':
        return <MapPin className="w-3.5 h-3.5 text-teal-600" />;
      case 'place':
        return <Landmark className="w-3.5 h-3.5 text-purple-600" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Bar with Modern Focus Ring */}
      <div className="relative flex items-center bg-slate-50 hover:bg-slate-100 focus-within:bg-white border border-slate-300 focus-within:border-emerald-500 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:py-2 transition-all shadow-xs">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (searchQuery.trim().length >= 1) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="চালকের নাম, গাড়ি, লাইসেন্স বা স্ট্যান্ড দিয়ে খুঁজুন..."
          className="w-full text-[11px] sm:text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-1"
            title="মুছে ফেলুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Auto-Suggestion Dropdown Popup */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/98 backdrop-blur-md rounded-2xl border-2 border-emerald-500/40 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-[380px] flex flex-col">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white px-3 py-2 flex items-center justify-between border-b border-emerald-900/40 shrink-0">
            <span className="text-[11px] font-bold flex items-center gap-1.5 text-emerald-200">
              <Search className="w-3 h-3 text-emerald-400" />
              <span>পরামর্শ ও ফলাফল ({toBengaliNumber(suggestions.length)}টি পাওয়া গেছে)</span>
            </span>
            <span className="text-[10px] text-slate-400">ট্যাপ করে বাছুন</span>
          </div>

          {/* Suggestion Items List */}
          <div className="overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100 scrollbar-thin">
            {suggestions.map((item, index) => {
              const isHighlighted = highlightedIndex === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isHighlighted
                      ? 'bg-emerald-50 text-emerald-950 shadow-2xs ring-1 ring-emerald-300'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      {renderIcon(item.type)}
                    </span>
                    <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <PauseMarqueeText
                            text={item.title}
                            className="text-xs font-bold text-slate-900"
                            pauseSec={1.5}
                          />
                        </div>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {item.typeLabel}
                        </span>
                      </div>
                      {item.subTitle && (
                        <PauseMarqueeText
                          text={item.subTitle}
                          className="text-[10px] text-slate-500 block leading-tight"
                          pauseSec={1.5}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
