import React, { useState, useEffect, useRef } from 'react';
import { Bell, MapPin, Navigation, Check, X } from 'lucide-react';
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
  skipVoiceAnnouncement?: boolean;
}

export const DriverIncomingAlert: React.FC<DriverIncomingAlertProps> = ({
  request,
  onAccept,
  onDecline,
  skipVoiceAnnouncement = false
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(25);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const ringIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const voiceTimeoutRef = useRef<any>(null);

  // Clear all running timers and stop Daf alarm sound & speech
  const cleanupTimersAndAudio = () => {
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
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

    // 0. Only trigger system status-bar notification if the app is in background or screen is off.
    // When the driver is actively looking at the app on screen, showing a duplicate system notification creates annoying clutter!
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      highPriorityNotifications.showIncomingRideAlert({
        id: request.id,
        pickupPoint: request.pickupPoint,
        destination: request.destination,
        estFare: request.estFare,
        distanceKm: request.distanceKm,
        passengerName: request.passengerName
      });
    }

    // 1. Audio Sequence:
    // If opened from notification, skip voice announcement and continue vibration + Duff alarm immediately.
    // If fresh alert, speak loud clear male voice alert -> wait 1 sec pause -> start Duff rhythm alarm.
    let hasStartedDaf = false;
    const startDafRhythm = () => {
      if (hasStartedDaf) return;
      hasStartedDaf = true;
      sounds.playIncomingRideAlert();
      if (!ringIntervalRef.current) {
        ringIntervalRef.current = setInterval(() => {
          sounds.playIncomingRideAlert();
        }, 2000);
      }
    };

    if (skipVoiceAnnouncement) {
      // Direct Duff alarm & continuous vibration when opened from notification
      startDafRhythm();
    } else {
      // Initial male voice alert -> 1.0s pause -> Duff alarm rhythm
      sounds.speakDriverVoiceAlert(() => {
        startDafRhythm();
      });

      // Safety fallback: ensure Duff drum begins ringing if audio is blocked (6.0s)
      voiceTimeoutRef.current = setTimeout(() => {
        startDafRhythm();
      }, 6000);
    }

    // 2. 25-second countdown timer
    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          cleanupTimersAndAudio();
          setIsDismissed(true);
          onDecline(request.id);
          return 0;
        }
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

    // Immediately stop voice & alarm sound and clear repeating intervals
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
    <div className="fixed top-20 z-50 left-3 right-3 sm:left-auto sm:right-6 sm:w-full sm:max-w-md bg-slate-950 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-amber-400 animate-in slide-in-from-top-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black animate-bounce shadow-md">
            <Bell className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-1.5">
              <span>নতুন যাত্রার অনুরোধ!</span>
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {secondsRemaining}s
              </span>
            </h3>
            <p className="text-[11px] text-amber-300">
              যাত্রী আপনার গাড়ির জন্য অপেক্ষা করছেন
            </p>
          </div>
        </div>

        <span className="text-xl font-black text-emerald-400 bg-slate-900 px-3 py-1 rounded-xl border border-emerald-500/40">
          ৳ {request.estFare}
        </span>
      </div>

      {/* Countdown Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-red-500 transition-all duration-1000 ease-linear rounded-full"
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
