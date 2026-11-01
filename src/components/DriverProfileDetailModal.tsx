import React from 'react';
import { X, Phone, ShieldCheck, MapPin, Star, Award, CheckCircle2, Car, Send } from 'lucide-react';
import { Driver } from '../types';
import { toBengaliNumber } from '../utils/calculator';

interface DriverProfileDetailModalProps {
  driver: Driver | null;
  onClose: () => void;
  onRequestRide?: (driver: Driver) => void;
}

export const DriverProfileDetailModal: React.FC<DriverProfileDetailModalProps> = ({
  driver,
  onClose,
  onRequestRide
}) => {
  if (!driver) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm sm:text-base text-white">
              চালকের বিস্তারিত প্রোফাইল
            </h3>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              ভেরিফাইড
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
              {(driver.nameBn || driver.name || 'চ').charAt(0)}
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-900">
                {driver.nameBn || driver.name || 'সম্মানিত চালক'}
              </h4>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                {driver.vehicleModel || driver.vehicleName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-amber-500 font-bold text-xs flex items-center gap-0.5">
                  ★ {toBengaliNumber(driver.rating)} ({toBengaliNumber(driver.reviewCount || driver.totalTrips || 0)} রিভিউ)
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 text-xs font-medium">
                  {toBengaliNumber(driver.experienceYears || 2)} বছরের অভিজ্ঞতা
                </span>
              </div>
            </div>
          </div>

          {/* Key verification info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[11px] block">গাড়ির প্লেট / নম্বর:</span>
              <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">{driver.licensePlate}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[11px] block">বেস স্ট্যান্ড:</span>
              <span className="font-bold text-slate-800 text-xs mt-0.5 block truncate">{driver.standName}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[11px] block">জাতীয় পরিচয়পত্র:</span>
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                NID যাচাইকৃত
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[11px] block">বর্তমান স্ট্যাটাস:</span>
              <span className={`font-bold text-xs mt-0.5 block ${driver.isAvailable ? 'text-emerald-700' : 'text-amber-700'}`}>
                {driver.isAvailable ? 'অনলাইনে প্রস্তুত' : 'ট্রিপে ব্যস্ত'}
              </span>
            </div>
          </div>

          {/* Features / highlights */}
          {driver.features && driver.features.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                বিশেষ সুবিধাসমূহ ও বৈশিষ্ট্য:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {driver.features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{feat}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <a
              href={`tel:${driver.phone.replace(/[^0-9]/g, '')}`}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Phone className="w-4 h-4" />
              <span>সরাসরি কল দিন ({driver.phone})</span>
            </a>

            {onRequestRide && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestRide(driver);
                }}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>অনুরোধ পাঠান</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
