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
import { PauseMarqueeText } from './PauseMarqueeText';
import { toBengaliNumber } from '../utils/calculator';

export interface PassengerRideCockpitProps {
  request: {
    id: string;
    pickupPoint: string;
    pickupLandmark?: string;
    destination: string;
    category: string;
    distanceKm: number;
    estFare: number;
    status: 'pending' | 'accepted' | 'declined' | 'in_transit' | 'completed' | 'cancelled';
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
    pickupLandmark?: string;
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
  onDismissCockpit?: () => void;
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
  onDismissCockpit,
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
    if (onDismissCockpit) onDismissCockpit();
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. PASSENGER SEARCHING RADAR STATE                             */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* 1. PASSENGER SEARCHING RADAR STATE                             */}
      {/* ============================================================== */}
      {request && !activeBooking && (
        <div className="mb-4 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-4 sm:p-5 border-2 border-emerald-400 shadow-xl animate-in slide-in-from-top-3 relative overflow-hidden">
          {/* Top Status Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-800/60 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                অনুরোধ পাঠানো হয়েছে • নিকটস্থ চালক অনুসন্ধান চলছে
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-md shadow-xs">
                নির্ধারিত ভাড়া: ৳ {request.estFare}
              </span>
            </div>
          </div>

          {/* Middle Body */}
          <div className="flex items-start gap-3.5">
            {/* Left: Radar Pulse Icon */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold text-xl shrink-0 relative mt-0.5">
              <Radio className="w-6 h-6 text-emerald-300 animate-pulse" />
              <span className="absolute -inset-1 rounded-2xl border border-emerald-400/40 animate-ping pointer-events-none" />
            </div>

            {/* Right: Route Details with Marquee */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <PauseMarqueeText
                    text={categoryBengaliName ? `${categoryBengaliName} চালক খোঁজা হচ্ছে` : 'নিকটস্থ চালকের অনুসন্ধান'}
                    className="font-extrabold text-base sm:text-lg text-white"
                    pauseSec={2}
                  />
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0 font-bold whitespace-nowrap">
                  লাইভ অনুসন্ধান
                </span>
              </div>

              <div className="text-xs text-slate-300 mt-2 space-y-1.5 min-w-0">
                {/* Pickup Row with Marquee */}
                <div className="flex items-center gap-1.5 text-[12px] min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="shrink-0 text-emerald-300 font-bold">পিকআপ:</span>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <PauseMarqueeText text={request.pickupPoint} className="text-[12px] font-bold text-white" pauseSec={1.5} />
                  </div>
                </div>

                {/* 2nd Option: Nearest Known Landmark Reference */}
                {request.pickupLandmark && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-200/95 pl-5 min-w-0 bg-amber-500/10 py-0.5 px-2 rounded-lg border border-amber-400/20">
                    <span className="shrink-0 text-amber-300 font-extrabold text-[9.5px] bg-amber-400/20 px-1.5 py-0.2 rounded border border-amber-400/30">২য় পরিচিত রেফারেন্স:</span>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <PauseMarqueeText text={request.pickupLandmark} className="text-[11px] font-bold text-amber-100" pauseSec={1.5} />
                    </div>
                  </div>
                )}

                {/* Destination Row with Marquee */}
                <div className="flex items-center gap-1.5 text-[12px] min-w-0">
                  <Navigation className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="shrink-0 text-red-300 font-bold">গন্তব্য:</span>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <PauseMarqueeText text={request.destination} className="text-[12px] font-bold text-white" pauseSec={1.5} />
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-emerald-200/80 mt-2 flex items-center gap-2 flex-wrap min-w-0">
                <span className="shrink-0">দূরত্ব: <strong className="text-emerald-300 font-bold">{request.distanceKm} কিমি</strong></span>
                <span className="shrink-0">•</span>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <PauseMarqueeText
                    text="গফরগাঁও পৌরসভা ও সংলগ্ন এলাকায় সক্রিয় চালক অনুসন্ধান চলছে..."
                    className="text-[11px] text-emerald-200 font-semibold"
                    pauseSec={1.5}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="mt-3.5 pt-3 border-t border-emerald-900/60 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-[11px] text-slate-300">চালক গ্রহণ করলে নোটিফিকেশন পাবেন</span>
            </div>
            <button
              type="button"
              onClick={onCancelRequest}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition active:scale-95 shrink-0"
            >
              <X className="w-4 h-4" />
              <span>অনুরোধ বাতিল করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MATCHED ACTIVE RIDE COCKPIT (PASSENGER VIEW)               */}
      {/* ============================================================== */}
      {activeBooking && (
        <div className="mb-4 rounded-2xl bg-slate-900 text-white border-2 border-emerald-500 shadow-2xl p-4 sm:p-5 animate-in slide-in-from-top-3 relative overflow-hidden">
          {/* Top Status Bar with Dynamic Phase 1 & Phase 2 Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800 gap-2.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
              {/* Dynamic Status Badge with 1.5s Pause Marquee (No emojis) */}
              <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm max-w-[280px] xs:max-w-[340px] overflow-hidden">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <PauseMarqueeText
                    text={
                      activeBooking.status === 'in_transit'
                        ? 'আল্লাহ্র উপর ভরসা করে যাত্রা শুরু করছি...'
                        : 'পিকআপের দিকে রওনা'
                    }
                    className="text-xs font-bold text-emerald-300"
                    pauseSec={1.5}
                  />
                </div>
              </div>

              {/* Ride Start Security OTP Code */}
              <div
                onClick={() => {
                  if (activeBooking.otp) {
                    navigator.clipboard?.writeText(activeBooking.otp);
                    setCopiedOtp(true);
                    setTimeout(() => setCopiedOtp(false), 2000);
                  }
                }}
                className="bg-slate-950 text-amber-300 border border-amber-400/60 px-3 py-1 rounded-full text-xs font-mono font-black flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition shadow-md shrink-0"
                title="কপি করতে ক্লিক করুন (চালকের সাথে পিন মিলিয়ে গাড়িতে উঠবেন)"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>যাত্রা পিন: <b className="text-amber-200 tracking-wider text-sm">{activeBooking.otp || '৫২০১'}</b></span>
                {copiedOtp && <span className="text-[10px] text-emerald-400">✓ কপিড</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs shrink-0">
              <span className="text-slate-400">মোট ভাড়া:</span>
              <span className="text-lg font-black text-amber-300 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-amber-400/40">
                ৳ {activeBooking.fare && activeBooking.fare > 0 ? activeBooking.fare : 40}
              </span>
            </div>
          </div>

          {/* Center Details: Driver profile + Vehicle details + Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Driver Profile */}
            <div className="lg:col-span-6 flex items-center gap-3.5 min-w-0">
              {(activeBooking.driver.driverPhoto || activeBooking.driver.phone?.includes('01304841550') || activeBooking.driver.name?.toUpperCase().includes('TASNIMUL')) ? (
                <img
                  src={activeBooking.driver.driverPhoto || '/assets/drivers/tasnimul_kabeer.png'}
                  alt={activeBooking.driver.name}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/drivers/tasnimul_kabeer.png';
                  }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-emerald-400 shrink-0 bg-slate-800 shadow-md"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-bold text-2xl shrink-0 border-2 border-emerald-300 shadow-md">
                  👤
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <div className="min-w-0 flex-1">
                    <PauseMarqueeText
                      text={activeBooking.driver.name}
                      className="font-extrabold text-base sm:text-lg text-white"
                      pauseSec={1.5}
                    />
                  </div>
                  <span className="bg-amber-400/20 text-amber-300 text-xs font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {activeBooking.driver.rating.toFixed(1)}
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    ভেরিফাইড চালক
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-slate-300 mt-0.5 min-w-0">
                  <PauseMarqueeText
                    text={`${activeBooking.driver.vehicleModel} • ${activeBooking.driver.plateNumber}`}
                    className="text-xs sm:text-sm text-slate-300"
                    pauseSec={1.5}
                  />
                </div>

                <div className="text-[11px] text-slate-400 mt-0.5 min-w-0">
                  <PauseMarqueeText
                    text={`লাইসেন্স: ${activeBooking.driver.licenseNumber} ${activeBooking.driver.standName ? `• ${activeBooking.driver.standName}` : ''}`}
                    className="text-[11px] text-slate-400"
                    pauseSec={1.5}
                  />
                </div>

                {(activeBooking.pickupTitle || activeBooking.destTitle || request?.pickupPoint) && (
                  <div className="text-[11px] text-slate-300 mt-2 space-y-1 pt-1.5 border-t border-slate-800">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="shrink-0 text-emerald-300 font-bold">পিকআপ:</span>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <PauseMarqueeText
                          text={activeBooking.pickupTitle || request?.pickupPoint || 'পিকআপ স্থান'}
                          className="text-[11px] font-bold text-white"
                          pauseSec={1.5}
                        />
                      </div>
                    </div>
                    {(activeBooking.pickupLandmark || request?.pickupLandmark) && (
                      <div className="flex items-center gap-1.5 text-[10.5px] text-amber-200/95 pl-5 min-w-0 bg-amber-500/10 py-0.5 px-2 rounded-lg border border-amber-400/20">
                        <span className="shrink-0 text-amber-300 font-extrabold text-[9px] bg-amber-400/20 px-1 py-0.2 rounded border border-amber-400/30">২য় পরিচিত স্থান:</span>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <PauseMarqueeText text={activeBooking.pickupLandmark || request?.pickupLandmark || ''} className="text-[10.5px] font-bold text-amber-100" pauseSec={1.5} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Navigation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="shrink-0 text-blue-300 font-bold">গন্তব্য:</span>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <PauseMarqueeText
                          text={activeBooking.destTitle || request?.destination || 'গন্তব্য স্থান'}
                          className="text-[11px] font-bold text-white"
                          pauseSec={1.5}
                        />
                      </div>
                    </div>
                  </div>
                )}
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

              {activeBooking.status !== 'in_transit' ? (
                <button
                  type="button"
                  onClick={onStartRide}
                  className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md cursor-pointer transition active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>গাড়িতে উঠেছি</span>
                </button>
              ) : (
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
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm shadow-md cursor-pointer transition active:scale-95 shrink-0"
                title="ট্রিপ বাতিল করুন"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
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
                onClick={() => {
                  setShowReviewModal(false);
                  if (onDismissCockpit) onDismissCockpit();
                }}
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
