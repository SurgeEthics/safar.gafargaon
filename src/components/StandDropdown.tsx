import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, ChevronDown, CheckCircle2, Search, X } from 'lucide-react';
import { Stand } from '../types';
import { toBengaliNumber } from '../utils/calculator';

interface StandDropdownProps {
  stands: Stand[];
  selectedStand: string;
  onSelectStand: (standName: string) => void;
  totalDriversCount: number;
  getStandDriverCount: (standBengaliName: string) => number;
  className?: string;
}

export const StandDropdown: React.FC<StandDropdownProps> = ({
  stands,
  selectedStand,
  onSelectStand,
  totalDriversCount,
  getStandDriverCount,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter stands based on quick search
  const filteredStands = useMemo(() => {
    if (!filterQuery.trim()) return stands;
    const q = filterQuery.toLowerCase().trim();
    return stands.filter(s => {
      const bn = (s.bengaliName || s.nameBn || '').toLowerCase();
      const loc = (s.location || s.description || '').toLowerCase();
      const en = (s.name || s.nameEn || '').toLowerCase();
      return bn.includes(q) || loc.includes(q) || en.includes(q);
    });
  }, [stands, filterQuery]);

  // Current selected display label & count
  const isAllSelected = selectedStand === 'all';
  const currentCount = isAllSelected ? totalDriversCount : getStandDriverCount(selectedStand);
  const displayTitle = isAllSelected ? 'সকল স্ট্যান্ড' : selectedStand;
  const displaySubtitle = isAllSelected
    ? 'গফরগাঁও ও পাগলার নিবন্ধিত সকল স্ট্যান্ড'
    : 'নির্বাচিত নির্দিষ্ট স্ট্যান্ড পয়েন্ট';

  const handleSelect = (val: string) => {
    onSelectStand(val);
    setIsOpen(false);
    setFilterQuery('');
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Stylish Trigger Button matching Safar Dua & Hotline UI */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="স্ট্যান্ড নির্বাচন ড্রপডাউন মেনু"
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 hover:from-emerald-100 hover:to-teal-100 border border-emerald-300 rounded-xl sm:rounded-2xl shadow-xs transition-all duration-200 cursor-pointer active:scale-[0.99] group text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-emerald-700 transition">
            <MapPin className="w-4 h-4" />
          </span>
          <div className="truncate">
            <span className="font-extrabold text-xs sm:text-sm text-emerald-950 block leading-tight truncate">
              {displayTitle}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold block leading-tight truncate">
              {displaySubtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-emerald-200/90 text-emerald-950 text-[10px] font-bold">
            {toBengaliNumber(currentCount)} জন চালক
          </span>
          <span
            className={`w-5 h-5 rounded-full bg-white border border-emerald-300 flex items-center justify-center text-emerald-700 transition-transform duration-200 ${
              isOpen ? 'rotate-180 bg-emerald-600 text-white border-emerald-600' : ''
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </div>
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:left-0 sm:right-auto mt-1.5 w-full sm:w-[380px] md:w-[420px] bg-white/95 backdrop-blur-md rounded-2xl border-2 border-emerald-500/40 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[75vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white px-3.5 py-2.5 flex items-center justify-between border-b border-emerald-800/20 shrink-0">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-200" />
              <h3 className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
                স্ট্যান্ড নির্বাচন ও চালক সংখ্যা
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Filter Search inside Dropdown */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="relative flex items-center bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="স্ট্যান্ডের নাম দিয়ে ফিল্টার করুন..."
                className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
                autoFocus
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List of Stands */}
          <div className="overflow-y-auto p-2 space-y-1.5 max-h-[360px] scrollbar-thin">
            {/* 1. All Stands Option */}
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                isAllSelected
                  ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                  : 'bg-white hover:bg-emerald-50/50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isAllSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <MapPin className="w-4 h-4" />
                </span>
                <div className="truncate">
                  <span className={`text-xs font-black block truncate ${
                    isAllSelected ? 'text-emerald-950' : 'text-slate-900'
                  }`}>
                    সকল স্ট্যান্ড (সামগ্রিক)
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    গফরগাঁও ও পাগলার সমস্ত রেজিস্টার্ড পয়েন্ট
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {toBengaliNumber(totalDriversCount)} জন চালক
                </span>
                {isAllSelected && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </div>
            </button>

            {/* 2. Filtered Stands */}
            {filteredStands.map((stand) => {
              const standBn = stand.bengaliName || stand.nameBn || 'স্ট্যান্ড';
              const isSelected = selectedStand === standBn;
              const count = getStandDriverCount(standBn);

              return (
                <button
                  key={stand.id}
                  type="button"
                  onClick={() => handleSelect(standBn)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                      : 'bg-white hover:bg-emerald-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <div className="truncate">
                      <span className={`text-xs font-black block truncate ${
                        isSelected ? 'text-emerald-950' : 'text-slate-900'
                      }`}>
                        {standBn}
                      </span>
                      {stand.location && stand.location !== standBn && (
                        <span className="text-[10px] text-slate-500 block truncate">
                          {stand.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      count > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {toBengaliNumber(count)} জন চালক
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}

            {filteredStands.length === 0 && (
              <div className="py-6 text-center text-slate-400 text-xs">
                কোনো স্ট্যান্ড খুঁজে পাওয়া যায়নি
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
