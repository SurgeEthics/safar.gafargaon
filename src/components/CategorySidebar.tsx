import React from 'react';
import { ChevronRight, Ambulance, Flame, Bike, Navigation } from 'lucide-react';
import { Driver, VehicleCategory } from '../types';
import { VEHICLE_OPTIONS } from '../data/initialData';
import { toBengaliNumber } from '../utils/calculator';

interface CategorySidebarProps {
  selectedCategory: VehicleCategory | 'all';
  onSelectCategory: (category: VehicleCategory | 'all') => void;
  drivers: Driver[];
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  drivers
}) => {
  const getCategoryIcon = (id: VehicleCategory) => {
    switch (id) {
      case 'ambulance':
        return <Ambulance className="w-4 h-4 text-red-600" />;
      case 'fire_service':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'bike':
        return <Bike className="w-4 h-4 text-emerald-700" />;
      case 'car':
        return <span className="text-sm">🚗</span>;
      case 'cng':
        return <span className="text-sm">🛺</span>;
      case 'auto':
        return <span className="text-sm">🛺</span>;
      case 'maxi':
        return <span className="text-sm">🚐</span>;
      default:
        return <Navigation className="w-4 h-4 text-emerald-700" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-700 transform rotate-45" />
          <span>ক্যাটাগরি</span>
        </h3>
        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-[11px] text-emerald-700 hover:underline font-medium"
          >
            সব দেখুন
          </button>
        )}
      </div>

      <div className="space-y-1">
        {VEHICLE_OPTIONS.map((opt) => {
          const isSelected = selectedCategory === opt.id;
          const count = drivers.filter((d) => d.category === opt.id).length;

          return (
            <button
              key={opt.id}
              onClick={() => onSelectCategory(isSelected ? 'all' : opt.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition text-left ${
                isSelected
                  ? 'bg-emerald-50 border border-emerald-500/80 font-semibold text-emerald-950 shadow-2xs'
                  : 'hover:bg-slate-50 text-slate-700 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-white shadow-2xs' : 'bg-slate-100'
                  }`}
                >
                  {getCategoryIcon(opt.id)}
                </div>
                <span className="text-xs sm:text-sm">{opt.nameBn}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {toBengaliNumber(count)}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-100 leading-relaxed text-center">
        ক্যাটাগরির উপর ক্লিক করে নির্দিষ্ট গাড়ির চালকদের তালিকা দেখুন
      </div>
    </div>
  );
};
