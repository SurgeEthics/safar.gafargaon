import React, { useState } from 'react';
import {
  Compass,
  ChevronDown,
  ChevronRight,
  MapPin,
  Check,
  Building2,
  Shield,
  Truck
} from 'lucide-react';
import { GAFARGAON_UNIONS, COMPREHENSIVE_UNION_PLACES, ComprehensivePlace, UnionInfo } from '../data/gafargaonUnionData';
import { PauseMarqueeText } from './PauseMarqueeText';

interface UnionQuickDestinationsProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedDestination: string;
  onSelectDestination: (name: string, coords?: { lat: number; lng: number }) => void;
  customQuickDestinations?: string[];
  allPlaces?: Array<any>;
}

export const UnionQuickDestinations: React.FC<UnionQuickDestinationsProps> = ({
  isOpen,
  onToggle,
  selectedDestination,
  onSelectDestination,
  allPlaces
}) => {
  const [activeUnionId, setActiveUnionId] = useState<string | null>(null);

  const handleToggleUnion = (unionId: string) => {
    setActiveUnionId(prev => (prev === unionId ? null : unionId));
  };

  return (
    <div className="w-full bg-slate-50/90 rounded-2xl border border-emerald-200/90 shadow-xs overflow-hidden flex flex-col">
      {/* Dropdown Header Bar (Present running exact sleek style) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/90 hover:from-emerald-100 hover:to-teal-100 border-b border-emerald-200/80 transition-all cursor-pointer text-left select-none group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-emerald-700 transition">
            <Compass className="w-4 h-4" />
          </span>
          <div className="truncate">
            <span className="font-extrabold text-xs sm:text-sm text-emerald-950 block leading-tight">
              দ্রুত গন্তব্য
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold block leading-tight">
              গফরগাঁও ও পাগলার ১৫টি ইউনিয়নের সকল স্থান ও স্ট্যান্ড
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-emerald-200/90 text-emerald-900 text-[10px] font-bold">
            {selectedDestination ? selectedDestination.split(' ')[0] : '১৫ ইউনিয়ন'}
          </span>
          <span className={`w-5 h-5 rounded-full bg-white border border-emerald-300 flex items-center justify-center text-emerald-700 transition-transform duration-200 ${isOpen ? 'rotate-180 bg-emerald-600 text-white border-emerald-600' : ''}`}>
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </div>
      </button>

      {/* Dropdown Content with Scroll Option & Parallel Height */}
      {isOpen && (
        <div className="p-2 sm:p-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Scrollable Container with parallel fixed h-[250px] matching right vehicle list */}
          <div className="h-[250px] overflow-y-auto scrollbar-thin pr-1 space-y-1.5">
            
            {/* Quick Union Directory Accordion */}
            {GAFARGAON_UNIONS.map((union: UnionInfo) => {
              const isUnionExpanded = activeUnionId === union.id;
              const sourcePlaces = (allPlaces && allPlaces.length > 0) ? allPlaces : COMPREHENSIVE_UNION_PLACES;
              const cleanTarget = union.nameBengali.replace(' ইউনিয়ন', '').replace(' (পাগলা)', '').trim().toLowerCase();
              
              const unionPlaces = sourcePlaces.filter(p => {
                const bName = (p.bengaliName || p.name || '').trim();
                // Filter out any fake Goyeshpur UP
                if (bName.includes('গয়েশপুর ইউনিয়ন পরিষদ') || bName.includes('গয়েশপুর ইউপি') || bName.includes('Gayeshpur Union Parishad')) {
                  return false;
                }
                if (p.unionId === union.id) return true;
                if (p.unionNameBengali && p.unionNameBengali.trim() === union.nameBengali.trim()) return true;
                const pArea = (p.area || '').toLowerCase();
                const pUnion = (p.unionNameBengali || '').toLowerCase();
                return pUnion.includes(cleanTarget) || pArea.includes(cleanTarget);
              });

              const hasSelectedInside = unionPlaces.some(p => (p.bengaliName || p.name || '').trim() === selectedDestination.trim());

              return (
                <div
                  key={union.id}
                  className={`rounded-xl border transition-all ${
                    hasSelectedInside
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : isUnionExpanded
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-200 bg-white hover:border-emerald-200'
                  }`}
                >
                  {/* Union Header Row */}
                  <button
                    type="button"
                    onClick={() => handleToggleUnion(union.id)}
                    className="w-full flex items-center justify-between p-2 text-left cursor-pointer transition select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${
                        union.thana === 'পাগলা থানা'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {union.id === 'pourashava' ? <Building2 className="w-3 h-3 text-emerald-700" /> : <MapPin className="w-3 h-3" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {union.nameBengali}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                            union.thana === 'পাগলা থানা' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          }`}>
                            {union.thana === 'পাগলা থানা' ? 'পাগলা' : 'সদর'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono truncate block">
                          {union.nameEnglish}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {unionPlaces.length} টি স্থান
                      </span>
                      <span className={`text-slate-400 transition-transform duration-200 ${isUnionExpanded ? 'rotate-90 text-emerald-700' : ''}`}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>

                  {/* SUBMENU DROPDOWN: Shows all popular places & stands for this specific union */}
                  {isUnionExpanded && (
                    <div className="px-2 pb-2 pt-1 border-t border-slate-100 space-y-1 bg-slate-50/70 rounded-b-xl animate-in slide-in-from-top-1 duration-150">
                      <div className="text-[9.5px] font-bold text-slate-500 px-1 py-0.5 flex items-center justify-between">
                        <span>{union.nameBengali}-এর প্রধান স্ট্যান্ড ও আকর্ষণীয় স্থান:</span>
                        <span className="text-emerald-700 font-bold">{unionPlaces.length}টি স্থান</span>
                      </div>

                      {unionPlaces.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">কোনো স্থান অন্তর্ভুক্ত নেই</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {unionPlaces.map((place: any) => {
                            const pName = place.bengaliName || place.name || 'স্থান';
                            const pArea = place.area || place.categoryLabel || '';
                            const isMatch = selectedDestination.trim() === pName.trim();

                            return (
                              <button
                                key={place.id || `${pName}-${place.lat}-${place.lng}`}
                                type="button"
                                onClick={() => {
                                  onSelectDestination(pName, { lat: place.lat, lng: place.lng });
                                  onToggle(); // Auto-fold on selection
                                }}
                                className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                                  isMatch
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                    : 'bg-white hover:bg-emerald-50/80 text-slate-800 border-slate-200'
                                }`}
                                title={`${pName} (${pArea})`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                                  {place.isStand ? (
                                    <Truck className={`w-3.5 h-3.5 shrink-0 ${isMatch ? 'text-amber-300' : 'text-emerald-600'}`} />
                                  ) : (
                                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${isMatch ? 'text-amber-300' : 'text-slate-400'}`} />
                                  )}
                                  
                                  {/* Mobile Responsive Marquee on Text Truncation with 1.5s Pause at the end */}
                                  <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                                    <PauseMarqueeText
                                      text={pName}
                                      className={`text-[11px] font-bold ${isMatch ? 'text-white' : 'text-slate-800'}`}
                                      pauseSec={1.5}
                                    />
                                    <PauseMarqueeText
                                      text={pArea}
                                      className={`text-[9px] block ${isMatch ? 'text-emerald-100' : 'text-slate-500'}`}
                                      pauseSec={1.5}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className={`text-[8.5px] px-1 py-0.2 rounded font-semibold ${
                                    isMatch
                                      ? 'bg-emerald-700 text-emerald-100'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {place.category}
                                  </span>

                                  {isMatch && (
                                    <Check className="w-3 h-3 text-amber-300 shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>
      )}
    </div>
  );
};
