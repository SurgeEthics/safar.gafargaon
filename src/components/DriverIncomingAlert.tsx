import React, { useState, useEffect } from 'react';
import { Bell, MapPin, Navigation, Clock, Check, X, Shield, PhoneCall } from 'lucide-react';
import { sounds } from '../utils/audio';

export interface DriverIncomingAlertProps {
  request: {
    id: string;
    passengerName: string;
    passengerPhone: string;
    pickupPoint: string;
    destination: string;
    category: string;
    distanceKm: number;
    estFare: number;
    status: 'pending' | 'accepted' | 'declined';
  } | null;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

export const DriverIncomingAlert: React.FC<DriverIncomingAlertProps> = ({
  request,
  onAccept,
  onDecline
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(15);

  useEffect(() => {
    if (!request || request.status !== 'pending') return;

    // Play ringing chime alert
    sounds.playIncomingRideAlert();

    setSecondsRemaining(15);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDecline(request.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request?.id]);

  if (!request || request.status !== 'pending') return null;

  const progressPercent = (secondsRemaining / 15) * 100;

  return (
    <div className="fixed inset-x-3 sm:inset-x-auto sm:right-6 top-20 z-50 max-w-md w-full bg-slate-950 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-amber-400 animate-in slide-in-from-top-4">
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
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-semibold block">পিকআপ পয়েন্ট:</span>
            <span className="text-xs font-bold text-white truncate block">{request.pickupPoint}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Navigation className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-semibold block">গন্তব্য স্থল:</span>
            <span className="text-xs font-bold text-white truncate block">{request.destination}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <span>যাত্রী: <strong className="text-white">{request.passengerName}</strong></span>
          <span>দূরত্ব: <strong className="text-emerald-300">{request.distanceKm} কিমি</strong></span>
        </div>
      </div>

      {/* Action Buttons: Accept & Decline */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDecline(request.id)}
          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
        >
          <X className="w-4 h-4 text-slate-400" />
          <span>প্রত্যাখ্যান</span>
        </button>

        <button
          type="button"
          onClick={() => onAccept(request.id)}
          className="flex-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition active:scale-95"
        >
          <Check className="w-4 h-4 text-slate-950" />
          <span>অনুরোধ গ্রহণ করুন (Accept)</span>
        </button>
      </div>
    </div>
  );
};
