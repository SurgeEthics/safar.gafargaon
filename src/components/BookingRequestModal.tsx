import React, { useState } from 'react';
import { X, Send, MapPin, Navigation, Car, Clock, Phone, User, CheckCircle2 } from 'lucide-react';
import { Stand, VehicleCategory, VehicleOption } from '../types';
import { toBengaliNumber } from '../utils/calculator';

interface BookingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickupStand: Stand;
  destinationStand?: Stand;
  customDestinationName?: string;
  category: VehicleCategory;
  fare: number;
  distanceKm: number;
  vehicles: VehicleOption[];
  onConfirmRequest: (passengerName: string, passengerPhone: string, note?: string) => void;
}

export const BookingRequestModal: React.FC<BookingRequestModalProps> = ({
  isOpen,
  onClose,
  pickupStand,
  destinationStand,
  customDestinationName,
  category,
  fare,
  distanceKm,
  vehicles,
  onConfirmRequest
}) => {
  const [passengerName, setPassengerName] = useState(() => {
    return localStorage.getItem('safar_passenger_name') || 'যাত্রী';
  });
  const [passengerPhone, setPassengerPhone] = useState(() => {
    return localStorage.getItem('safar_passenger_phone') || '01700-112233';
  });
  const [passengerNote, setPassengerNote] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentVehicle = vehicles.find((v) => v.id === category);
  const destName = customDestinationName || destinationStand?.nameBn || 'উপজেলা স্বাস্থ্য কমপ্লেক্স';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName.trim()) {
      setError('অনুগ্রহ করে আপনার নাম লিখুন');
      return;
    }
    if (!passengerPhone.trim() || passengerPhone.length < 9) {
      setError('অনুগ্রহ করে সঠিক মোবাইল নম্বর লিখুন');
      return;
    }

    // Remember in localStorage
    localStorage.setItem('safar_passenger_name', passengerName);
    localStorage.setItem('safar_passenger_phone', passengerPhone);

    onConfirmRequest(passengerName, passengerPhone, passengerNote);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold">
              <Send className="w-4 h-4 transform rotate-45" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                যাত্রার অনুরোধ নিশ্চিতকরণ
              </h3>
              <p className="text-[11px] text-emerald-200">
                গফরগাঁও লোকাল সার্ভিস • সরকারি সুলভ ভাড়া
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          
          {/* Trip Summary Card */}
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-900 pb-2 border-b border-emerald-100">
              <span className="flex items-center gap-1.5 text-emerald-800">
                <Car className="w-4 h-4" />
                <span>নির্বাচিত বাহন: {currentVehicle?.nameBn}</span>
              </span>
              <span className="text-emerald-700 font-extrabold text-sm">
                নির্ধারিত ভাড়া: ৳ {toBengaliNumber(fare)}
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-start gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                <span><b>পিকআপ:</b> {pickupStand.nameBn}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0"></span>
                <span><b>গন্তব্য:</b> {destName}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 font-medium pt-1 text-[11px]">
                <span>দূরত্ব: {toBengaliNumber(distanceKm)} কিমি</span>
                <span>•</span>
                <span>আনুমানিক সময়: {toBengaliNumber(Math.max(3, Math.ceil(distanceKm * 3.5)))} মিনিট</span>
              </div>
            </div>
          </div>

          {/* Passenger Input Fields */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                আপনার নাম *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={passengerName}
                  onChange={(e) => {
                    setPassengerName(e.target.value);
                    setError('');
                  }}
                  placeholder="যেমন: আহসান হাবিব"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                আপনার মোবাইল নম্বর (চালক যোগাযোগ করবেন) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={passengerPhone}
                  onChange={(e) => {
                    setPassengerPhone(e.target.value);
                    setError('');
                  }}
                  placeholder="017XX-XXXXXX"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                পিকআপ ল্যান্ডমার্ক বা বিশেষ নোট (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={passengerNote}
                onChange={(e) => setPassengerNote(e.target.value)}
                placeholder="যেমন: স্টেশনের ২ নং গেটের গোলচত্বরে দাঁড়িয়ে আছি..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>অনুরোধ কনফার্ম করুন</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
