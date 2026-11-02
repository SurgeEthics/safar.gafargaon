import React from 'react';
import { Ambulance, Car, Users, Filter, CheckCircle2 } from 'lucide-react';
import { Driver, VehicleCategory } from '../types';
import { VEHICLE_OPTIONS } from '../data/initialData';
import { DriverCard } from './DriverCard';
import { toBengaliNumber } from '../utils/calculator';

interface DriverListProps {
  drivers: Driver[];
  selectedCategory: VehicleCategory | 'all';
  onCallDriver: (driver: Driver) => void;
  onViewDetails: (driver: Driver) => void;
  onSelectOnMap: (driver: Driver) => void;
}

export const DriverList: React.FC<DriverListProps> = ({
  drivers,
  selectedCategory,
  onCallDriver,
  onViewDetails,
  onSelectOnMap
}) => {
  const currentCategoryObj = selectedCategory !== 'all' 
    ? VEHICLE_OPTIONS.find((v) => v.id === selectedCategory) 
    : null;

  const categoryTitle = currentCategoryObj 
    ? `${currentCategoryObj.nameBn} - সক্রিয় চালকদের তালিকা` 
    : 'সকল ক্যাটাগরি - সক্রিয় চালকদের তালিকা';

  return (
    <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
      {/* List Header matching screenshot */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs">
              <Users className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              {categoryTitle}
            </h3>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {toBengaliNumber(drivers.length)} জন
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            যেকোনো চালকের কার্ডে ট্যাপ করে বিস্তারিত লাইসেন্স, এনআইডি ও দূরত্ব দেখুন
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>প্রস্তুত ({toBengaliNumber(drivers.filter(d => d.isAvailable).length)})</span>
          </span>
        </div>
      </div>

      {/* Driver Cards Grid */}
      {drivers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6">
          <p className="text-sm font-semibold text-slate-700">
            কোনো চালক পাওয়া যায়নি
          </p>
          <p className="text-xs text-slate-500 mt-1">
            অনুগ্রহ করে ভিন্ন স্ট্যান্ড বা ক্যাটাগরি নির্বাচন করুন অথবা নতুন চালক হিসেবে নিবন্ধন করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {drivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              onCall={onCallDriver}
              onViewDetails={onViewDetails}
              onSelectOnMap={onSelectOnMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};
