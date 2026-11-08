import React, { useState } from 'react';
import {
  Send,
  ArrowUpDown,
  Navigation,
  Clock,
  MapPin,
  ChevronUp,
  ChevronDown,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Ambulance,
  Flame,
  Bike
} from 'lucide-react';
import { Stand, VehicleCategory, Driver } from '../types';
import { VEHICLE_OPTIONS } from '../data/initialData';
import { calculateDistanceKm, calculateFare, estimateTravelTimeMinutes, toBengaliNumber } from '../utils/calculator';

interface FareCalculatorProps {
  stands: Stand[];
  pickupStandId: string;
  destinationStandId: string;
  selectedCategory: VehicleCategory;
  onPickupChange: (id: string) => void;
  onDestinationChange: (id: string) => void;
  onCategoryChange: (category: VehicleCategory) => void;
  onLocateUser: () => void;
  isLocating: boolean;
  drivers: Driver[];
  onRequestBooking: (category: VehicleCategory, fare: number, distance: number) => void;
}

export const FareCalculator: React.FC<FareCalculatorProps> = ({
  stands,
  pickupStandId,
  destinationStandId,
  selectedCategory,
  onPickupChange,
  onDestinationChange,
  onCategoryChange,
  onLocateUser,
  isLocating,
  drivers,
  onRequestBooking
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [customDestination, setCustomDestination] = useState(false);
  const [customDestName, setCustomDestName] = useState('');

  const pickupStand = stands.find((s) => s.id === pickupStandId) || stands[0];
  const destStand = stands.find((s) => s.id === destinationStandId) || stands[2];

  const distanceKm = pickupStand && destStand && pickupStand.id !== destStand.id
    ? calculateDistanceKm(pickupStand.lat, pickupStand.lng, destStand.lat, destStand.lng)
    : 1.2;

  const currentFare = calculateFare(selectedCategory, distanceKm);
  const estimatedTime = estimateTravelTimeMinutes(selectedCategory, distanceKm);

  // Swap pickup & destination
  const handleSwap = () => {
    onPickupChange(destinationStandId);
    onDestinationChange(pickupStandId);
  };

  // Quick chips for destination
  const popularDests = stands.slice(0, 5);

  const getVehicleIcon = (catId: VehicleCategory) => {
    switch (catId) {
      case 'ambulance':
        return <Ambulance className="w-5 h-5 text-red-600" />;
      case 'fire_service':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'bike':
        return <Bike className="w-5 h-5 text-emerald-700" />;
      case 'car':
        return (
          <span className="text-xl leading-none">🚗</span>
        );
      case 'cng':
        return (
          <span className="text-xl leading-none">🛺</span>
        );
      case 'auto':
        return (
          <span className="text-xl leading-none">🛺</span>
        );
      case 'maxi':
        return (
          <span className="text-xl leading-none">🚐</span>
        );
      default:
        return <Navigation className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="bg-emerald-50/40 border border-emerald-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs transition-all">
      {/* Title & header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-100 flex-wrap gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Send className="w-4 h-4 transform rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                কোথায় যাবেন? যাত্রা পরিকল্পনা ও ভাড়ার হিসাব
              </h2>
              <span className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                লাইভ রেট
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              যাত্রার অবস্থান ও গন্তব্য বেছে নিন — স্বয়ংক্রিয় দূরত্ব ও সরকারি নির্ধারিত ন্যুনতম ভাড়া দেখুন
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition"
        >
          <span>{isCollapsed ? 'বিস্তারিত দেখুন' : 'সংক্ষেপ করুন'}</span>
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-4 space-y-4">
          {/* Pickup and Destination selectors */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            {/* Origin (Pickup) */}
            <div className="lg:col-span-5 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>শুরুর অবস্থান (পিকআপ):</span>
                </div>
                <button
                  type="button"
                  onClick={onLocateUser}
                  disabled={isLocating}
                  className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1 hover:underline disabled:opacity-50 text-[11px]"
                >
                  <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'খোঁজা হচ্ছে...' : '+ আমার GPS লোকেশন'}</span>
                </button>
              </div>
              <select
                value={pickupStandId}
                onChange={(e) => onPickupChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {stands.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameBn}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="lg:col-span-2 flex justify-center">
              <button
                type="button"
                onClick={handleSwap}
                title="স্থান পরিবর্তন করুন"
                className="w-9 h-9 rounded-full bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 flex items-center justify-center shadow-xs transition transform hover:rotate-180 duration-300"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>

            {/* Destination */}
            <div className="lg:col-span-5 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-red-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                  <span>কোথায় যাবেন (গন্তব্য স্থল):</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomDestination(!customDestination)}
                  className="text-slate-600 hover:text-slate-800 font-medium hover:underline text-[11px]"
                >
                  {customDestination ? 'স্ট্যান্ড নির্বাচন' : '+ অন্য গন্তব্য লিখুন'}
                </button>
              </div>

              {customDestination ? (
                <input
                  type="text"
                  value={customDestName}
                  onChange={(e) => setCustomDestName(e.target.value)}
                  placeholder="যেমন: লংগাইর মোড়, কাচারী রোড..."
                  className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <select
                  value={destinationStandId}
                  onChange={(e) => onDestinationChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {stands.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameBn}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Popular fast destination chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs text-slate-600 pt-1">
            <span className="font-semibold text-slate-700 whitespace-nowrap text-[11px]">
              দ্রুত গন্তব্য:
            </span>
            {popularDests.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onDestinationChange(s.id);
                  setCustomDestination(false);
                }}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] transition ${
                  destinationStandId === s.id && !customDestination
                    ? 'bg-emerald-700 text-white font-medium shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {s.nameBn}
              </button>
            ))}
          </div>

          {/* Vehicle selection row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">
                যানবাহনের ধরন নির্বাচন করুন (ভাড়ার তালিকা):
              </span>
              <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  আনুমানিক দূরত্ব: <strong className="text-slate-800">{toBengaliNumber(distanceKm)} কি.মি.</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  সময়: <strong className="text-slate-800">{toBengaliNumber(estimatedTime)} মিনিট</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {VEHICLE_OPTIONS.map((opt) => {
                const isSelected = selectedCategory === opt.id;
                const optFare = calculateFare(opt.id, distanceKm);
                const optDrivers = drivers.filter((d) => d.category === opt.id);
                const availableCount = optDrivers.filter((d) => d.isAvailable).length;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onCategoryChange(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-slate-200 bg-white/80 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}

                    <div className="mb-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-1.5">
                        {getVehicleIcon(opt.id)}
                      </div>
                      <div className="font-semibold text-xs text-slate-800 leading-tight">
                        {opt.nameBn}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-emerald-800 leading-tight">
                        {opt.id === 'fire_service' ? 'ফ্রি' : `৳ ${toBengaliNumber(optFare)}`}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {toBengaliNumber(availableCount)} চালক প্রস্তুত
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">নির্বাচিত বাহন:</span>
              <span className="font-bold text-emerald-800 text-xs sm:text-sm">
                {VEHICLE_OPTIONS.find((v) => v.id === selectedCategory)?.nameBn}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-600">মোট আনুমানিক ভাড়া:</span>
              <span className="text-base sm:text-lg font-bold text-emerald-700">
                {selectedCategory === 'fire_service' ? 'বিনামূল্যে জরুরি' : `৳ ${toBengaliNumber(currentFare)}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRequestBooking(selectedCategory, currentFare, distanceKm)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <PhoneCall className="w-4 h-4" />
                <span>চালকের সাথে সরাসরি যোগাযোগ ও কল</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
