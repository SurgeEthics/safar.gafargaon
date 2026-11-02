import React, { useState, useEffect } from 'react';
import { Bell, MapPin, Navigation, Check, X, ExternalLink } from 'lucide-react';
import { PauseMarqueeText } from './PauseMarqueeText';

export interface DriverScreenOpenNotificationPopupProps {
  request: {
    id: string;
    passengerName: string;
    passengerPhone: string;
    pickupPoint: string;
    pickupLandmark?: string;
    destination: string;
    category: string;
    distanceKm: number;
    estFare: number;
    status: string;
  } | null;
  onOpenDashboard: () => void;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

export const DriverScreenOpenNotificationPopup: React.FC<DriverScreenOpenNotificationPopupProps> = ({
  request,
  onOpenDashboard,
  onAccept,
  onDecline
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(25);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!request || request.status !== 'pending') return;

    setSecondsRemaining(25);
    setIsProcessing(false);

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDecline(request.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request?.id, request?.status]);

  if (!request || request.status !== 'pending') return null;

  const progressPercent = (secondsRemaining / 25) * 100;

  return (
    <div 
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-full sm:max-w-md z-[9999] bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-3.5 sm:p-4 shadow-2xl border-2 border-emerald-400 ring-4 ring-emerald-500/20 animate-in slide-in-from-top-6 duration-300 cursor-pointer select-none"
      onClick={() => onOpenDashboard()}
      role="alert"
      aria-live="assertive"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800/80">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black relative shrink-0 shadow-md">
            <Bell className="w-5 h-5 text-slate-950 animate-bounce" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5 leading-tight">
              <span>নতুন যাত্রার অনুরোধ!</span>
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                {secondsRemaining}s
              </span>
            </h3>
            <p className="text-[11px] text-emerald-300 font-medium">
              স্ক্রিন অন হয়েছে • এখনই গ্রহণ করুন
            </p>
          </div>
        </div>

        <span className="text-lg sm:text-xl font-black text-amber-300 bg-slate-900/90 px-3 py-1 rounded-xl border border-amber-400/40 shrink-0 shadow-inner">
          ৳ {request.estFare}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2.5">
        <div 
          className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Route Info */}
      <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-emerald-900/60 space-y-1.5 mb-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-slate-300 font-bold shrink-0">পিকআপ:</span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <PauseMarqueeText text={request.pickupPoint} className="text-xs font-bold text-emerald-300" pauseSec={1.5} />
          </div>
        </div>

        {request.pickupLandmark && (
          <div className="flex items-center gap-1.5 text-[10.5px] text-amber-200 pl-5 bg-amber-500/10 py-0.5 px-2 rounded-lg border border-amber-400/20 min-w-0">
            <span className="shrink-0 text-amber-300 font-extrabold text-[9px] bg-amber-400/25 px-1 py-0.2 rounded">২য় পরিচিত রেফারেন্স:</span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <PauseMarqueeText text={request.pickupLandmark} className="text-[10.5px] font-bold text-amber-100" pauseSec={1.5} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <Navigation className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-[11px] text-slate-300 font-bold shrink-0">গন্তব্য:</span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <PauseMarqueeText text={request.destination} className="text-xs font-bold text-white" pauseSec={1.5} />
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isProcessing) return;
            setIsProcessing(true);
            onDecline(request.id);
          }}
          disabled={isProcessing}
          className="flex-1 py-2 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition border border-slate-700 cursor-pointer"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
          <span>বাতিল</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDashboard();
          }}
          className="px-2.5 py-2 bg-teal-800/80 hover:bg-teal-700 text-teal-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition border border-teal-600/50 cursor-pointer"
          title="চালক ড্যাশবোর্ডে পূর্ণ তথ্য দেখুন"
        >
          <ExternalLink className="w-3.5 h-3.5 text-teal-300" />
          <span>ড্যাশবোর্ড</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isProcessing) return;
            setIsProcessing(true);
            onAccept(request.id);
          }}
          disabled={isProcessing}
          className="flex-2 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
        >
          <Check className="w-4 h-4 text-slate-950" />
          <span>{isProcessing ? 'গ্রহণ হচ্ছে...' : 'গ্রহণ করুন (Accept)'}</span>
        </button>
      </div>

      {/* Tap Hint */}
      <div className="mt-2 text-center text-[10.5px] text-emerald-300/80 font-medium">
        👆 যেকোনো জায়গায় ট্যাপ করে চালক ড্যাশবোর্ডে যান
      </div>
    </div>
  );
};
