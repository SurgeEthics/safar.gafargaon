import React, { useState, useEffect, useRef } from 'react';
import { Bell, MapPin, Navigation, Check, X, ExternalLink } from 'lucide-react';
import { sounds } from '../utils/audio';
import { highPriorityNotifications } from '../utils/highPriorityNotification';
import { PauseMarqueeText } from './PauseMarqueeText';

export interface DriverIncomingAlertProps {
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
    status: 'pending' | 'accepted' | 'declined' | 'in_transit' | 'completed' | 'cancelled';
  } | null;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onOpenDashboard?: () => void;
  isPassengerMode?: boolean;
  skipVoiceAnnouncement?: boolean;
}

export const DriverIncomingAlert: React.FC<DriverIncomingAlertProps> = ({
  request,
  onAccept,
  onDecline,
  onOpenDashboard,
  isPassengerMode = false,
  skipVoiceAnnouncement = false
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(25);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const countdownIntervalRef = useRef<any>(null);
  const continuousVibrationRef = useRef<any>(null);

  // Clear all running timers, vibration and stop Daf alarm sound & speech immediately
  const cleanupTimersAndAudio = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (continuousVibrationRef.current) {
      clearInterval(continuousVibrationRef.current);
      continuousVibrationRef.current = null;
    }
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
        navigator.vibrate(0);
      }
    } catch {}
    sounds.stopAllAlarms();
    highPriorityNotifications.clearIncomingRideAlert();
  };

  useEffect(() => {
    if (!request || request.status !== 'pending') {
      cleanupTimersAndAudio();
      setIsDismissed(true);
      return;
    }

    setIsDismissed(false);
    setIsProcessing(false);
    setSecondsRemaining(25);

    // 1. Continuous rhythmic haptic vibration for the full 25 seconds
    const pulseVibration = () => {
      try {
        if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
          // Strong dual pulse
          navigator.vibrate([600, 150, 500, 150]);
        }
      } catch {}
    };

    pulseVibration();
    continuousVibrationRef.current = setInterval(pulseVibration, 1400);

    // 2. 25-second countdown timer
    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          cleanupTimersAndAudio();
          setIsDismissed(true);
          onDecline(request.id);
          return 0;
        }
        // Also trigger micro-haptic on each countdown tick
        try {
          if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
            navigator.vibrate(200);
          }
        } catch {}
        return prev - 1;
      });
    }, 1000);

    return () => {
      cleanupTimersAndAudio();
    };
  }, [request?.id]);

  // Handle Driver 1st-Click Accept
  const handleAccept = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing || isDismissed || !request) return;

    // Immediately stop voice & alarm sound, stop vibration
    cleanupTimersAndAudio();

    // Immediately dismiss modal on 1st click to prevent double clicks or confusion
    setIsProcessing(true);
    setIsDismissed(true);

    // Call parent handler
    onAccept(request.id);
  };

  // Handle Driver Decline
  const handleDecline = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing || isDismissed || !request) return;

    cleanupTimersAndAudio();
    setIsProcessing(true);
    setIsDismissed(true);

    onDecline(request.id);
  };

  if (!request || request.status !== 'pending' || isDismissed) return null;

  const progressPercent = (secondsRemaining / 25) * 100;

  return (
    <div 
      className="fixed top-16 sm:top-20 z-[9999] left-3 right-3 sm:left-auto sm:right-6 sm:w-full sm:max-w-md bg-slate-950 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-emerald-400 ring-4 ring-emerald-500/20 animate-in slide-in-from-top-4 select-none"
      role="alert"
      aria-live="assertive"
    >
      {/* Top Header with Official Safar Logo */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img 
              src="/safar-logo.png" 
              alt="সফর লোগো" 
              className="w-10 h-10 rounded-2xl object-contain border border-emerald-400/50 shadow-md bg-emerald-950/40"
            />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5 leading-tight">
              <span>নতুন যাত্রার অনুরোধ!</span>
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                {secondsRemaining}s
              </span>
            </h3>
            <p className="text-[11px] text-amber-300 font-medium truncate">
              {isPassengerMode ? 'সম্মানিত চালক, যাত্রী আপনার জন্য অপেক্ষা করছেন' : 'যাত্রী আপনার গাড়ির জন্য অপেক্ষা করছেন'}
            </p>
          </div>
        </div>

        <span className="text-xl font-black text-emerald-400 bg-slate-900 px-3 py-1 rounded-xl border border-emerald-500/40 shrink-0">
          ৳ {request.estFare}
        </span>
      </div>

      {/* Countdown Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Route & Passenger Information */}
      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2 mb-3.5">
        <div className="flex items-start gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-400 font-semibold block">পিকআপ পয়েন্ট:</span>
            <div className="min-w-0 w-full overflow-hidden">
              <PauseMarqueeText text={request.pickupPoint} className="text-xs font-bold text-emerald-300" pauseSec={1.5} />
            </div>
            {request.pickupLandmark && (
              <div className="flex items-center gap-1 text-[10.5px] text-amber-200 mt-1 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-400/25 min-w-0">
                <span className="shrink-0 text-amber-300 font-extrabold text-[9px] bg-amber-400/25 px-1 py-0.2 rounded">২য় পরিচিত রেফারেন্স:</span>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <PauseMarqueeText text={request.pickupLandmark} className="text-[10.5px] font-bold text-amber-100" pauseSec={1.5} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 min-w-0">
          <Navigation className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-400 font-semibold block">গন্তব্য স্থল:</span>
            <div className="min-w-0 w-full overflow-hidden">
              <PauseMarqueeText text={request.destination} className="text-xs font-bold text-white" pauseSec={1.5} />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="min-w-0 flex-1 flex items-center gap-1 mr-2">
            <span className="shrink-0">যাত্রী:</span>
            <strong className="text-white truncate">{request.passengerName}</strong>
          </div>
          <span className="shrink-0">দূরত্ব: <strong className="text-emerald-300">{request.distanceKm} কিমি</strong></span>
        </div>
      </div>

      {/* Action Buttons: Accept & Decline */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecline}
          disabled={isProcessing}
          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
        >
          <X className="w-4 h-4 text-slate-400" />
          <span>প্রত্যাখ্যান</span>
        </button>

        {isPassengerMode && onOpenDashboard && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onOpenDashboard();
            }}
            className="px-3 py-2.5 bg-teal-800/80 hover:bg-teal-700 text-teal-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition border border-teal-600/50 cursor-pointer"
            title="চালক ড্যাশবোর্ডে পূর্ণ তথ্য দেখুন"
          >
            <ExternalLink className="w-3.5 h-3.5 text-teal-300" />
            <span>ড্যাশবোর্ড</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleAccept}
          disabled={isProcessing}
          className="flex-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition active:scale-95"
        >
          <Check className="w-4 h-4 text-slate-950" />
          <span>{isProcessing ? 'গ্রহণ করা হচ্ছে...' : 'অনুরোধ গ্রহণ করুন (Accept)'}</span>
        </button>
      </div>
    </div>
  );
};
