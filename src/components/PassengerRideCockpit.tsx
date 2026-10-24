import React, { useState, useEffect } from 'react';
import {
  Radio,
  MapPin,
  Navigation,
  Clock,
  PhoneCall,
  Shield,
  ShieldCheck,
  Star,
  X,
  CheckCircle,
  AlertTriangle,
  Send,
  MessageCircle,
  Share2,
  Lock,
  Compass,
  Check,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';

export interface PassengerRideCockpitProps {
  request: {
    id: string;
    pickupPoint: string;
    destination: string;
    category: string;
    distanceKm: number;
    estFare: number;
    status: 'pending' | 'accepted' | 'declined';
  } | null;
  activeBooking: {
    driver: {
      id: string;
      name: string;
      phone: string;
      category: string;
      vehicleModel: string;
      plateNumber: string;
      licenseNumber: string;
      driverPhoto?: string;
      rating: number;
      totalTrips?: number;
      licenseVerified?: boolean;
      nidVerified?: boolean;
      phoneVerified?: boolean;
      standName?: string;
    };
    pickupTitle?: string;
    destTitle?: string;
    fare?: number;
    distanceKm?: number;
    etaMinutes?: number;
    status: 'en_route' | 'arrived' | 'in_transit' | 'completed';
    otp?: string;
  } | null;
  onCancelRequest: () => void;
  onCancelBooking: () => void;
  onDriverArrived?: () => void;
  onStartRide?: () => void;
  onCompleteRide: (fare: number) => void;
  onSubmitReview: (driverId: string, rating: number, tags: string[], feedback: string) => void;
  onFocusMap: () => void;
  categoryBengaliName?: string;
}

export const PassengerRideCockpit: React.FC<PassengerRideCockpitProps> = ({
  request,
  activeBooking,
  onCancelRequest,
  onCancelBooking,
  onStartRide,
  onCompleteRide,
  onSubmitReview,
  onFocusMap,
  categoryBengaliName = 'অটো'
}) => {
  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [selectedReviewTags, setSelectedReviewTags] = useState<string[]>(['নিরাপদ ড্রাইভিং', 'ভদ্র আচরণ']);
  const [reviewComment, setReviewComment] = useState('');
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Quick message presets
  const [customMsg, setCustomMsg] = useState('');
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  // Sound trigger on match
  useEffect(() => {
    if (activeBooking && activeBooking.status === 'en_route') {
      sounds.playDriverMatchedChime();
    }
  }, [activeBooking?.driver.id]);

  // Sound trigger on arrival
  useEffect(() => {
    if (activeBooking?.status === 'arrived') {
      sounds.playDriverMatchedChime();
    }
  }, [activeBooking?.status]);

  if (!request && !activeBooking && !showReviewModal) {
    return null;
  }

  const reviewTagOptions = [
    'নিরাপদ ড্রাইভিং',
    'ভদ্র আচরণ',
    'সঠিক ভাড়া',
    'পরিচ্ছন্ন বাহন',
    'সময়নিষ্ঠ',
    'চমৎকার সার্ভিস'
  ];

  const handleToggleReviewTag = (tag: string) => {
    if (selectedReviewTags.includes(tag)) {
      setSelectedReviewTags(selectedReviewTags.filter(t => t !== tag));
    } else {
      setSelectedReviewTags([...selectedReviewTags, tag]);
    }
  };

  const handleSendQuickMessage = (msg: string) => {
    if (!activeBooking) return;
    setSentNotice(`চালকের কাছে বার্তা পৌঁছেছে: "${msg}"`);
    setTimeout(() => setSentNotice(null), 3500);
  };

  const handleFinishAndShowReview = () => {
    if (activeBooking) {
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
      sounds.playTripCompletedFanfare();
      onCompleteRide(activeBooking.fare || 0);
      setShowReviewModal(true);
    }
  };

  const handleFinalSubmitReview = () => {
    if (activeBooking) {
      onSubmitReview(
        activeBooking.driver.id,
        reviewRating,
        selectedReviewTags,
        reviewComment
      );
    }
    setShowReviewModal(false);
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. PASSENGER SEARCHING RADAR STATE                             */}
      {/* ============================================================== */}
      {request && !activeBooking && (
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white border-2 border-emerald-400 shadow-xl animate-in slide-in-from-top-3 relative overflow-hidden">
          {/* Subtle radar glowing ring in background */}
          <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-emerald-500/10 pointer-events-none animate-ping" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            {/* Left: Radar Pulse & Live Search Information */}
            <div className="flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center font-black shrink-0">
                <Radio className="w-6 h-6 text-emerald-300 animate-pulse" />
                <span className="absolute -inset-1 rounded-2xl border border-emerald-400/40 animate-ping pointer-events-none" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                    অনুরোধ পাঠানো হয়েছে • নিকটস্থ চালক অনুসন্ধান চলছে
                  </span>
                  <span className="text-amber-300 font-black text-sm bg-slate-900/80 px-2 py-0.5 rounded border border-amber-400/30">
                    ভাড়া: ৳ {request.estFare}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-2 flex-wrap text-sm font-bold text-white">
                  <span className="text-emerald-300 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {request.pickupPoint}
                  </span>
                  <span className="text-slate-400">➔</span>
                  <span className="text-white flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-red-400" />
                    {request.destination}
                  </span>
                </div>

                <p className="text-xs text-emerald-200/80 mt-1 flex items-center gap-2">
                  <span>দূরত্ব: {request.distanceKm} কিমি</span>
                  <span>•</span>
                  <span>গফরগাঁও পৌরসভা ও সংলগ্ন এলাকায় সক্রিয় {categoryBengaliName} চালকদের রিং হচ্ছে...</span>
                </p>
              </div>
            </div>

            {/* Right: Passenger Action (Cancel Request) */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={onCancelRequest}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white text-xs font-bold rounded-xl border border-red-500/40 cursor-pointer transition active:scale-95 shadow-xs"
              >
                <X className="w-4 h-4" />
                <span>অনুরোধ বাতিল করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MATCHED ACTIVE RIDE COCKPIT (PASSENGER VIEW)               */}
      {/* ============================================================== */}
      {activeBooking && (
        <div className="mb-4 rounded-2xl bg-slate-900 text-white border-2 border-emerald-500 shadow-2xl p-4 sm:p-5 animate-in slide-in-from-top-3 relative overflow-hidden">
          {/* Top Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800 gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-black px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-md ${
                activeBooking.status === 'in_transit'
                  ? 'bg-blue-500 text-white animate-pulse'
                  : activeBooking.status === 'arrived'
                  ? 'bg-amber-400 text-slate-950 font-black animate-bounce'
                  : 'bg-emerald-500 text-white animate-pulse'
              }`}>
                <Radio className="w-3.5 h-3.5" />
                {activeBooking.status === 'in_transit'
                  ? 'যাত্রী নিয়ে গাড়ি চলমান (গন্তব্যের পথে)'
                  : activeBooking.status === 'arrived'
                  ? 'চালক পিকআপে পৌঁছেছেন! গাড়িতে উঠুন'
                  : 'চালক আপনার পিকআপের দিকে আসছেন'}
              </span>

              {/* Ride Start Security OTP Code */}
              <div
                onClick={() => {
                  if (activeBooking.otp) {
                    navigator.clipboard?.writeText(activeBooking.otp);
                    setCopiedOtp(true);
                    setTimeout(() => setCopiedOtp(false), 2000);
                  }
                }}
                className="bg-slate-950 text-amber-300 border border-amber-400/60 px-3 py-1 rounded-full text-xs font-mono font-black flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition"
                title="কপি করতে ক্লিক করুন (চালকের সাথে পিন মিলিয়ে গাড়িতে উঠবেন)"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>যাত্রা পিন: <b className="text-amber-200 tracking-wider text-sm">{activeBooking.otp || '৫২০১'}</b></span>
                {copiedOtp && <span className="text-[10px] text-emerald-400">✓ কপিড</span>}
              </div>

              <div className="text-xs text-emerald-300 font-bold flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {activeBooking.status === 'in_transit'
                    ? 'আনুমানিক পৌঁছাতে বাকি: ৪ মিনিট'
                    : activeBooking.status === 'arrived'
                    ? 'পিকআপ পয়েন্টে অপেক্ষমাণ'
                    : `বাকি: ${activeBooking.etaMinutes} মিনিট (${activeBooking.distanceKm} কিমি)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">মোট ভাড়া:</span>
              <span className="text-lg font-black text-amber-300 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-amber-400/40">
                ৳ {activeBooking.fare}
              </span>
            </div>
          </div>

          {/* Center Details: Driver profile + Vehicle details + Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Driver Profile */}
            <div className="lg:col-span-6 flex items-center gap-3.5">
              {activeBooking.driver.driverPhoto ? (
                <img
                  src={activeBooking.driver.driverPhoto}
                  alt={activeBooking.driver.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-emerald-400 shrink-0 bg-slate-800 shadow-md"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-bold text-2xl shrink-0 border-2 border-emerald-300 shadow-md">
                  👤
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-extrabold text-base sm:text-lg text-white truncate">
                    {activeBooking.driver.name}
                  </h3>
                  <span className="bg-amber-400/20 text-amber-300 text-xs font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {activeBooking.driver.rating.toFixed(1)}
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    ভেরিফাইড চালক
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 mt-0.5 truncate">
                  {activeBooking.driver.vehicleModel} •{' '}
                  <strong className="text-emerald-300 font-mono">{activeBooking.driver.plateNumber}</strong>
                </p>

                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>লাইসেন্স: {activeBooking.driver.licenseNumber}</span>
                  {activeBooking.driver.standName && (
                    <>
                      <span>•</span>
                      <span>{activeBooking.driver.standName}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Action Buttons: Direct Call, WhatsApp, Track Map, Finish */}
            <div className="lg:col-span-6 flex items-center justify-start lg:justify-end gap-2 flex-wrap">
              <a
                href={`tel:${activeBooking.driver.phone}`}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition active:scale-95"
              >
                <PhoneCall className="w-4 h-4" />
                <span>চালককে কল</span>
              </a>

              <a
                href={`https://wa.me/88${activeBooking.driver.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={onFocusMap}
                className="inline-flex items-center gap-1.5 bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition"
                title="ম্যাপে লাইভ রুট দেখুন"
              >
                <Navigation className="w-4 h-4" />
                <span>ম্যাপে ট্র্যাক</span>
              </button>

              {activeBooking.status === 'en_route' && (
                <button
                  type="button"
                  onClick={onStartRide}
                  className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md cursor-pointer transition active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>গাড়িতে উঠেছি</span>
                </button>
              )}

              {activeBooking.status !== 'en_route' && (
                <button
                  type="button"
                  onClick={handleFinishAndShowReview}
                  className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md cursor-pointer transition active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>গন্তব্যে পৌঁছেছি (ভাড়া দিন)</span>
                </button>
              )}

              <button
                type="button"
                onClick={onCancelBooking}
                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition"
                title="ট্রিপ বাতিল করুন"
              >
                <X className="w-3.5 h-3.5" />
                <span>বাতিল</span>
              </button>
            </div>
          </div>

          {/* Quick Chat Presets & Notice Bar */}
          <div className="mt-3.5 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
              <span className="text-[11px] text-slate-400 font-semibold shrink-0">দ্রুত বার্তা:</span>
              {[
                'আমি গেটের সামনে আছি',
                'দেরি করবেন না প্লিজ',
                'কালো ছাতা নিয়ে দাঁড়িয়ে আছি',
                'কতক্ষণ লাগবে ভাই?'
              ].map((msg) => (
                <button
                  key={msg}
                  type="button"
                  onClick={() => handleSendQuickMessage(msg)}
                  className="text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-200 px-2.5 py-1 rounded-lg border border-slate-700/80 whitespace-nowrap cursor-pointer transition active:scale-95"
                >
                  {msg}
                </button>
              ))}
            </div>

            {sentNotice && (
              <span className="text-xs text-amber-300 font-semibold animate-pulse bg-slate-950 px-2.5 py-1 rounded-lg border border-amber-400/40 shrink-0">
                {sentNotice}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. TRIP COMPLETED & 5-STAR RATING REVIEW MODAL                 */}
      {/* ============================================================== */}
      {showReviewModal && activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-slate-900">
            {/* Header */}
            <div className="text-center pb-3 border-b border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold text-2xl shadow-inner mb-2">
                🎉
              </div>
              <h3 className="text-lg font-black text-slate-900">
                যাত্রা সফলভাবে সম্পন্ন হয়েছে!
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeBooking.pickupTitle} ➔ {activeBooking.destTitle}
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 my-4">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span>চালকের নাম:</span>
                <strong className="text-slate-900">{activeBooking.driver.name}</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span>বাহন ও লাইসেন্স:</span>
                <span className="font-mono text-slate-800">{activeBooking.driver.plateNumber}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span>মোট দূরত্ব:</span>
                <span className="text-slate-800">{activeBooking.distanceKm} কিমি</span>
              </div>
              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">পরিশোধযোগ্য নির্ধারিত ভাড়া:</span>
                <span className="text-xl font-black text-emerald-700">৳ {activeBooking.fare}</span>
              </div>
              <p className="text-[10px] text-emerald-800 text-center mt-1 font-semibold">
                (চালককে নগদ অথবা বিকাশ/নগদে ভাড়া পরিশোধ করুন)
              </p>
            </div>

            {/* Star Rating Selector */}
            <div className="text-center my-3">
              <label className="text-xs font-bold text-slate-700 block mb-2">
                চালক কেমন সেবা দিলেন? স্টার রেটিং দিন:
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 cursor-pointer transition transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= reviewRating
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-amber-600 mt-1 block">
                {reviewRating === 5
                  ? 'চমৎকার! (৫ স্টার)'
                  : reviewRating === 4
                  ? 'খুব ভালো (৪ স্টার)'
                  : reviewRating === 3
                  ? 'মোটামুটি (৩ স্টার)'
                  : 'উন্নতি প্রয়োজন'}
              </span>
            </div>

            {/* Quick Tag Pills */}
            <div className="my-3">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                ফিডব্যাক ট্যাগ নির্বাচন করুন:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {reviewTagOptions.map((tag) => {
                  const isSelected = selectedReviewTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleReviewTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-xl font-medium border transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Comment */}
            <div className="my-3">
              <input
                type="text"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="মন্তব্য লিখুন (ঐচ্ছিক)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                পরে দেব
              </button>
              <button
                type="button"
                onClick={handleFinalSubmitReview}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition active:scale-95"
              >
                রিভিউ জমা দিন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
