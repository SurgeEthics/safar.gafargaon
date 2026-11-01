import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  Phone,
  MessageCircle,
  Car,
  Check,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';

export interface FullVerificationGuidedModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicleModel?: string;
    plateNumber: string;
    standName?: string;
    licenseNumber: string;
    nidNumber: string;
    firstIssueDate?: string;
    licenseType?: string;
    licenseVerified?: boolean;
    phoneVerified?: boolean;
    nidVerified?: boolean;
    driverPhoto?: string;
    categoryBengali?: string;
  } | null;
  onOpenSpecificGate: (driver: any, gate: 'brta' | 'wa' | 'nid') => void;
  onConfirmFullApproval: (driverId: string) => void;
}

export const FullVerificationGuidedModal: React.FC<FullVerificationGuidedModalProps> = ({
  isOpen,
  onClose,
  driver,
  onOpenSpecificGate,
  onConfirmFullApproval
}) => {
  const [isApproving, setIsApproving] = useState(false);

  if (!isOpen || !driver) return null;

  const isLicenseDone = Boolean(driver.licenseVerified);
  const isPhoneDone = Boolean(driver.phoneVerified);
  const isNidDone = Boolean(driver.nidVerified);
  const completedCount = [isLicenseDone, isPhoneDone, isNidDone].filter(Boolean).length;

  const handleApproveAll = () => {
    setIsApproving(true);
    setTimeout(() => {
      setIsApproving(false);
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
        sounds.playTripCompletedFanfare();
      } catch {}
      onConfirmFullApproval(driver.id);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xs overflow-y-auto overscroll-contain p-2 sm:p-4 modal-scroll-overlay animate-in fade-in duration-200">
      <div className="min-h-full flex items-start sm:items-center justify-center py-2 sm:py-6">
        <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base sm:text-lg leading-tight">
                  ৩-স্তরীয় নিরাপত্তা অনুমোদন
                </h3>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-300/40 px-2 py-0.2 rounded-full font-bold">
                  {completedCount}/৩ সম্পন্ন
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                বিআরটিএ লাইসেন্স, হোয়াটসঅ্যাপ ফোন ও নির্বাচন কমিশন NID যাচাই
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto max-h-[70vh]">
          {/* Driver Card Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">{driver.name}</div>
              <div className="text-slate-500 mt-0.5 font-medium">
                {driver.vehicleModel} • <span className="font-mono text-slate-700 font-bold">{driver.plateNumber}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-emerald-700">{driver.phone}</div>
              <div className="text-slate-500 text-[11px] truncate max-w-[150px]">{driver.standName}</div>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-700">
            ৩টি স্তম্ভের বর্তমান অনুমোদন স্থিতি:
          </div>

          {/* Pillar 1: BRTA */}
          <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
            isLicenseDone ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                isLicenseDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}>
                {isLicenseDone ? <Check className="w-4 h-4" /> : '১'}
              </div>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>বিআরটিএ লাইসেন্স ও মোটরযান</span>
                  {isLicenseDone && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded">
                      অনুমোদিত ✓
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  লাইসেন্স: {driver.licenseNumber}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenSpecificGate(driver, 'brta')}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100 transition cursor-pointer"
            >
              গেটওয়ে খুলুন ↗
            </button>
          </div>

          {/* Pillar 2: Phone / WhatsApp */}
          <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
            isPhoneDone ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                isPhoneDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}>
                {isPhoneDone ? <Check className="w-4 h-4" /> : '২'}
              </div>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>মোবাইল ও WhatsApp নম্বর</span>
                  {isPhoneDone && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded">
                      ভেরিফাইড ✓
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  ফোন: {driver.phone}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenSpecificGate(driver, 'wa')}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 transition cursor-pointer"
            >
              গেটওয়ে খুলুন ↗
            </button>
          </div>

          {/* Pillar 3: NID */}
          <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
            isNidDone ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                isNidDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}>
                {isNidDone ? <Check className="w-4 h-4" /> : '৩'}
              </div>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>জাতীয় পরিচয়পত্র (NID)</span>
                  {isNidDone && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded">
                      অনুমোদিত ✓
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  NID: {driver.nidNumber}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenSpecificGate(driver, 'nid')}
              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 px-2.5 py-1 rounded-lg border border-teal-200 bg-teal-50/60 hover:bg-teal-100 transition cursor-pointer"
            >
              গেটওয়ে খুলুন ↗
            </button>
          </div>

          {/* Real-time Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11.5px] text-amber-950 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              পূর্ণ অনুমোদন নিশ্চিত করলে চালকের মোবাইলে স্বয়ংক্রিয় কনফার্মেশন নোটিফিকেশন পাঠানো হবে এবং তার আইডি তাৎক্ষণিকভাবে ভেরিফাইড ও সক্রিয় হিসেবে চালু হবে।
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 text-xs transition cursor-pointer"
          >
            বাতিল
          </button>

          <button
            type="button"
            onClick={handleApproveAll}
            disabled={isApproving}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 active:scale-98"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isApproving ? 'অনুমোদন হচ্ছে...' : '৩টি স্তরে পূর্ণ অনুমোদন ও চালক সক্রিয় করুন'}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
