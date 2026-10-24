import React from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { Stand } from '../types';
import { toBengaliNumber } from '../utils/calculator';

interface StandSelectorProps {
  stands: Stand[];
  selectedStandId: string;
  onSelectStand: (standId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalDriverCount: number;
}

export const StandSelector: React.FC<StandSelectorProps> = ({
  stands,
  selectedStandId,
  onSelectStand,
  searchQuery,
  onSearchChange,
  totalDriverCount
}) => {
  return (
    <div className="bg-white border-b border-slate-200/80 px-3 sm:px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto space-y-2.5">
        {/* Top line: Stand Dropdown & Search Input */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Stand selector dropdown */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-700">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={selectedStandId}
              onChange={(e) => onSelectStand(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            >
              <option value="all">
                সকল স্ট্যান্ড ({toBengaliNumber(totalDriverCount)} জন চালক)
              </option>
              {stands.map((stand) => (
                <option key={stand.id} value={stand.id}>
                  {stand.nameBn} ({toBengaliNumber(stand.driverCount)} জন চালক)
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="md:col-span-7 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="চালকের নাম, গাড়ি, লাইসেন্স বা স্ট্যান্ড দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom line: Stand pills filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => onSelectStand('all')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full font-medium transition ${
              selectedStandId === 'all'
                ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            সকল স্ট্যান্ড ({toBengaliNumber(totalDriverCount)})
          </button>

          {stands.map((stand) => {
            const isSelected = selectedStandId === stand.id;
            return (
              <button
                key={stand.id}
                onClick={() => onSelectStand(stand.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full transition ${
                  isSelected
                    ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                }`}
              >
                {stand.nameBn} ({toBengaliNumber(stand.driverCount)})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
