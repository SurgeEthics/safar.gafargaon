import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  Copy,
  Check,
  X,
  Phone,
  MessageCircle,
  Car,
  Bell,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { generateDriverVerificationSuccessMessage } from '../utils/verification';

export interface DriverVerificationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: {
    id: string;
    name: string;
    phone: string;
    categoryBengali?: string;
    vehicleModel?: string;
    plateNumber: string;
    standName?: string;
    licenseNumber?: string;
    nidNumber?: string;
    driverPhoto?: string;
  } | null;
  onViewDriverDashboard?: (driverId: string) => void;
}

export const DriverVerificationSuccessModal: React.FC<DriverVerificationSuccessModalProps> = ({
  isOpen,
  onClose,
  driver,
  onViewDriverDashboard
}) => {
  const [copiedMessage, setCopiedMessage] = useState(false);

  if (!isOpen || !driver) return null;

  const successMessage = generateDriverVerificationSuccessMessage(
    driver.name,
    driver.plateNumber,
    driver.categoryBengali || driver.vehicleModel
  );

  const cleanPhone = driver.phone.replace(/[^0-9]/g, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(successMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-emerald-200 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Celebratory Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white p-5 sm:p-6 text-center relative overflow-hidden shrink-0">
          {/* Decorative glowing orb */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-400/20 rounded-full blur-2xl pointer-events-none"></div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center mb-3 shadow-lg ring-4 ring-emerald-400/20 animate-bounce">
            <ShieldCheck className="w-9 h-9 text-emerald-300" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-300/40 text-[11px] font-black text-emerald-200 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>ভেরিফিকেশন সফল ও সক্রিয়</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            অভিনন্দন! চালক সম্পূর্ণ ভেরিফাইড
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-sm mx-auto">
            ৩-স্তরের সরকারি ও ডিজিটাল যাচাইকরণ সফলভাবে সম্পন্ন হয়েছে এবং প্রোফাইল লাইভ করা হয়েছে।
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Driver Active Identity Card */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 border-2 border-emerald-300/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-md">
                  {driver.driverPhoto ? (
                    <img
                      src={driver.driverPhoto}
                      alt={driver.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <span>{driver.name.slice(0, 2)}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                      {driver.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                      <CheckCircle className="w-3 h-3" />
                      ভেরিফাইড চালক
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{driver.plateNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span>{driver.vehicleModel || driver.categoryBengali}</span>
                  </p>
                </div>
              </div>

              {/* Live Active Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>সক্রিয় (Active)</span>
              </div>
            </div>

            {/* The 3 Verified Pillars Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-center">
              <div className="p-2 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-medium">বিআরটিএ</div>
                <div className="text-xs font-black text-emerald-800 flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>লাইসেন্স ✓</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-medium">মোবাইল</div>
                <div className="text-xs font-black text-emerald-800 flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>হোয়াটসঅ্যাপ ✓</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-medium">নির্বাচন কমিশন</div>
                <div className="text-xs font-black text-emerald-800 flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>NID ✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time SMS / WhatsApp Notification Dispatched Box */}
          <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                <Bell className="w-4 h-4 text-blue-700 animate-bounce" />
                <span>চালকের মোবাইলে স্বয়ংক্রিয় ভেরিফিকেশন মেসেজ প্রেরিত:</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-blue-200"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMessage ? 'কপি হয়েছে' : 'মেসেজ কপি'}</span>
              </button>
            </div>

            {/* Simulated message chat bubble */}
            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs text-xs text-slate-700 leading-relaxed font-sans">
              <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 mb-1.5 border-b border-slate-100 font-mono">
                <span>প্রাপক: {driver.phone}</span>
                <span>পাঠানো সময়: এইমাত্র</span>
              </div>
              <p>{successMessage}</p>
            </div>

            {/* Quick action buttons to open WhatsApp or Call */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href={`https://wa.me/880${cleanPhone}?text=${encodeURIComponent(successMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp এ পাঠান ↗</span>
              </a>

              <a
                href={`tel:${driver.phone}`}
                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>সরাসরি কল দিন</span>
              </a>
            </div>
          </div>

          {/* Real-time Status Callout */}
          <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">অ্যাপে রিয়েল-টাইম স্ট্যাটাস আপডেট:</p>
              <p className="text-[11px] text-emerald-900 mt-0.5">
                চালকের স্ট্যাটাস এখন সফর ম্যাপ ও যাত্রী তালিকায় <strong>&quot;ভেরিফাইড ও সক্রিয়&quot;</strong> হিসেবে দৃশ্যমান রয়েছে। যাত্রীরা অবিলম্বে বুকিং করতে পারবেন।
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5 shrink-0">
          {onViewDriverDashboard && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewDriverDashboard(driver.id);
              }}
              className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <span>চালক ড্যাশবোর্ড দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>ঠিক আছে, সম্পন্ন করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
