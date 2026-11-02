import React from 'react';
import { Phone, Star, ShieldCheck, MapPin, Info, Ambulance, Flame, Bike } from 'lucide-react';
import { Driver, VehicleCategory } from '../types';
import { toBengaliNumber } from '../utils/calculator';
import { PauseMarqueeText } from './PauseMarqueeText';

interface DriverCardProps {
  driver: Driver;
  onCall: (driver: Driver) => void;
  onViewDetails: (driver: Driver) => void;
  onSelectOnMap: (driver: Driver) => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  onCall,
  onViewDetails,
  onSelectOnMap
}) => {
  const getCategoryBadge = (category: VehicleCategory) => {
    switch (category) {
      case 'ambulance':
        return {
          icon: <Ambulance className="w-4 h-4 text-red-600" />,
          bg: 'bg-red-50 border-red-200 text-red-700'
        };
      case 'fire_service':
        return {
          icon: <Flame className="w-4 h-4 text-orange-600" />,
          bg: 'bg-orange-50 border-orange-200 text-orange-700'
        };
      case 'bike':
        return {
          icon: <Bike className="w-4 h-4 text-emerald-700" />,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800'
        };
      case 'car':
        return {
          icon: <span className="text-sm">🚗</span>,
          bg: 'bg-blue-50 border-blue-200 text-blue-700'
        };
      case 'cng':
        return {
          icon: <span className="text-sm">🛺</span>,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700'
        };
      case 'auto':
        return {
          icon: <span className="text-sm">🛺</span>,
          bg: 'bg-lime-50 border-lime-200 text-lime-800'
        };
      case 'maxi':
        return {
          icon: <span className="text-sm">🚐</span>,
          bg: 'bg-purple-50 border-purple-200 text-purple-700'
        };
      default:
        return {
          icon: <MapPin className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-slate-50 border-slate-200 text-slate-700'
        };
    }
  };

  const badgeInfo = getCategoryBadge(driver.category as VehicleCategory);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top header row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${badgeInfo.bg}`}>
              {badgeInfo.icon}
            </div>
            {driver.isAvailable ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                প্রস্তুত
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                ট্রিপে ব্যস্ত
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-amber-500 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{toBengaliNumber(driver.rating)}</span>
          </div>
        </div>

        {/* Driver Name & Vehicle Model */}
        <div className="mb-2.5 min-w-0">
          <h4
            onClick={() => onViewDetails(driver)}
            className="font-bold text-sm sm:text-base text-slate-900 leading-snug group-hover:text-emerald-800 transition cursor-pointer min-w-0"
          >
            <PauseMarqueeText text={driver.nameBn || (driver as any).name || 'চালক'} className="font-bold text-sm sm:text-base text-slate-900 leading-snug" pauseSec={1.5} />
          </h4>
          <div className="text-xs text-emerald-700 font-medium leading-normal mt-0.5 min-w-0">
            <PauseMarqueeText text={driver.vehicleModel || driver.vehicleName || ''} className="text-xs text-emerald-700 font-medium" pauseSec={1.5} />
          </div>
        </div>

        {/* Stand location */}
        <div
          onClick={() => onSelectOnMap(driver)}
          className="flex items-center gap-1.5 text-xs text-slate-600 mb-2 cursor-pointer hover:text-emerald-700 group/stand min-w-0"
        >
          <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover/stand:text-emerald-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <PauseMarqueeText text={driver.standName || 'গফরগাঁও স্ট্যান্ড'} className="text-xs text-slate-600" pauseSec={1.5} />
          </div>
        </div>

        {/* License & NID verification badges */}
        <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100 mb-3">
          <div className="truncate font-mono font-medium">
            লাইসেন্স: <span className="text-slate-700 font-semibold">{driver.licensePlate}</span>
          </div>
          {driver.nidVerified && (
            <span
              title="জাতীয় পরিচয়পত্র ও পুলিশ ভেরিফাইড"
              className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold text-[10px] bg-emerald-100/80 px-1.5 py-0.5 rounded shrink-0"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>NID ভেরিফাইড</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <a
          href={`tel:${driver.phone.replace(/[^0-9]/g, '')}`}
          onClick={(e) => {
            onCall(driver);
          }}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold py-2 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>কল করুন</span>
        </a>

        <button
          onClick={() => onViewDetails(driver)}
          title="চালকের বিস্তারিত প্রোফাইল দেখুন"
          className="w-9 h-9 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
