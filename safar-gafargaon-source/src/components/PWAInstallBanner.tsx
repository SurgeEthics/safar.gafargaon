import React, { useState, useEffect, useRef } from 'react';
import { Download, Share2, QrCode, Check, Copy, X, Sparkles, Smartphone, ExternalLink, Printer, Globe, Cloud, HelpCircle, FileArchive, Database } from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  appName?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  appName = 'সফর (Safar) গফরগাঁও',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [showCloudflareGuide, setShowCloudflareGuide] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Custom live production URL (e.g., Cloudflare Pages domain)
  const [customLiveUrl, setCustomLiveUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('safar_custom_live_url') || '';
    }
    return '';
  });
  const [isEditingCustomUrl, setIsEditingCustomUrl] = useState(false);
  const [tempUrlInput, setTempUrlInput] = useState('');

  // Prevent background body scroll when any modal is open to avoid double scrollbars and lock issues on mobile
  useEffect(() => {
    if (showShareModal || showManualGuide || showCloudflareGuide) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [showShareModal, showManualGuide, showCloudflareGuide]);

  const getPublicShareUrl = (): string => {
    if (customLiveUrl && customLiveUrl.trim().length > 0) {
      return customLiveUrl.trim();
    }
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    // Cloud Run development URL requires AI Studio workspace authentication and returns 403 Forbidden on mobile
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  };

  const currentUrl = getPublicShareUrl();
  const isDevUrlDetected = typeof window !== 'undefined' && window.location.origin.includes('ais-dev-') && !customLiveUrl;
  const shareText = `গফরগাঁওয়ের নিজস্ব স্মার্ট রাইড ও ইমার্জেন্সি অ্যাপ "সফর"। এখনই ফ্রিতে ইনস্টল করুন: ${currentUrl}`;

  useEffect(() => {
    if (currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#064e3b',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR:', err));
    }
  }, [currentUrl]);

  const handleSaveCustomUrl = () => {
    let clean = tempUrlInput.trim();
    if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    setCustomLiveUrl(clean);
    if (typeof window !== 'undefined') {
      if (clean) {
        localStorage.setItem('safar_custom_live_url', clean);
      } else {
        localStorage.removeItem('safar_custom_live_url');
      }
    }
    setIsEditingCustomUrl(false);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowManualGuide(true);
      }
    } else {
      setShowManualGuide(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: appName,
          text: 'গফরগাঁও স্মার্ট ট্রান্সপোর্ট ও জরুরি সেবা অ্যাপ — কোনো খরচ নেই, সরাসরি আপনার মোবাইলে ইনস্টল করুন!',
          url: currentUrl,
        });
        return;
      } catch {
        // Fallback to share modal
      }
    }
    setShowShareModal(true);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <>
      {/* Top Floating Mini Banner when not installed and not dismissed */}
      {!isInstalled && !isDismissed && (
        <aside
          aria-label="App Installation Banner"
          className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md border-b border-emerald-500/30 sticky top-0 z-40"
        >
          <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-white shadow-inner text-sm sm:text-base">
                🚗
              </span>

              {/* Mobile Running Marquee Ticker */}
              <div className="sm:hidden overflow-hidden min-w-0 flex-1 relative py-0.5">
                <div className="inline-flex animate-bulletin-marquee whitespace-nowrap text-xs font-semibold text-white items-center select-none">
                  <div className="inline-flex items-center gap-2 pr-10 shrink-0">
                    <span className="text-white">মোবাইলে আসল অ্যাপের মতো ব্যবহার করুন</span>
                    <span className="bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full text-[10px] font-black inline-flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> ১০০% ফ্রি
                    </span>
                    <span className="text-emerald-100 text-[11px] font-normal">• কোনো প্লেস্টোর খরচ নেই</span>
                    <span className="text-amber-200 text-[11px] font-bold">• ১-ট্যাপে ইনস্টল</span>
                  </div>
                  <div className="inline-flex items-center gap-2 pr-10 shrink-0" aria-hidden="true">
                    <span className="text-white">মোবাইলে আসল অ্যাপের মতো ব্যবহার করুন</span>
                    <span className="bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full text-[10px] font-black inline-flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> ১০০% ফ্রি
                    </span>
                    <span className="text-emerald-100 text-[11px] font-normal">• কোনো প্লেস্টোর খরচ নেই</span>
                    <span className="text-amber-200 text-[11px] font-bold">• ১-ট্যাপে ইনস্টল</span>
                  </div>
                </div>
              </div>

              {/* Tablet & Desktop Static Rich Layout */}
              <div className="hidden sm:block truncate">
                <p className="font-semibold text-white flex items-center gap-1.5 truncate">
                  <span>মোবাইলে আসল অ্যাপের মতো ব্যবহার করুন</span>
                  <span className="hidden md:inline-flex items-center gap-0.5 bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    <Sparkles className="w-2.5 h-2.5" /> ১০০% ফ্রি
                  </span>
                </p>
                <p className="text-[11px] text-emerald-100 truncate">
                  কোনো প্লেস্টোর খরচ নেই, ১-ট্যাপে সরাসরি অ্যান্ড্রয়েড ফোনে ইনস্টল
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-1 shadow transition transform active:scale-95 shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="sm:inline hidden">ইনস্টল করুন</span>
                <span className="sm:hidden inline">ইনস্টল</span>
              </button>

              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="bg-white/15 hover:bg-white/25 text-white font-medium p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
                title="শেয়ার ও কিউআর কোড"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">শেয়ার</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0"
                aria-label="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Floating Share / Quick Action Button */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-semibold text-xs border-2 border-white/40 group cursor-pointer"
          title="অ্যাপ লিংক ও কিউআর কোড"
        >
          <QrCode className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="hidden md:inline pr-1">অ্যাপ লিংক ও কিউআর</span>
        </button>
      </div>

      {/* Manual Install Instruction Modal (For Android Chrome / iOS) */}
      {showManualGuide && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-xs p-3 sm:p-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowManualGuide(false);
          }}
        >
          <div className="min-h-full flex items-start sm:items-center justify-center py-2 sm:py-6">
            <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 relative my-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight">
                      {isIOS ? 'আইফোন / আইপ্যাডে ইনস্টল করুন' : 'অ্যান্ড্রয়েড ফোনে ইনস্টল করার সহজ নিয়ম'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">এক ক্লিকেই এটি ফোনের হোম স্ক্রিনে সেভ হয়ে যাবে</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3.5 text-xs sm:text-sm text-slate-700">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        ১
                      </span>
                      <p>
                        Safari ব্রাউজারের নিচের <strong>শেয়ার (Share / ↑)</strong> আইকনটিতে চাপ দিন।
                      </p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        ২
                      </span>
                      <p>
                        নিচে স্ক্রল করে <strong>&quot;Add to Home Screen&quot; (+ চিহ্ন)</strong> সিলেক্ট করুন।
                      </p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        ৩
                      </span>
                      <p>
                        উপরে ডানপাশে <strong>&quot;Add&quot;</strong> বাটনে চাপ দিলেই আপনার ফোনে অ্যাপ যুক্ত হবে!
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        ১
                      </span>
                      <p>
                        আপনার Chrome ব্রাউজারের একদম উপরে ডানে <strong>তিনটি ডট (⋮ মেনু)</strong> বাটনে চাপ দিন।
                      </p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        ২
                      </span>
                      <p>
                        মেনু থেকে <strong>&quot;Install app&quot;</strong> অথবা <strong>&quot;Add to Home screen&quot;</strong> লেখায় ক্লিক করুন।
                      </p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        ৩
                      </span>
                      <p>
                        <strong>&quot;Install&quot;</strong> কনফার্ম করুন। ব্যস! উবারের মতো অ্যাপটি আপনার ফোনের হোম স্ক্রিনে আইকন হিসেবে চলে আসবে।
                      </p>
                    </div>
                  </>
                )}

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>প্লে স্টোরের কোনো ফি নেই, কোনো মেমোরি খরচ নেই এবং সবসময় লাইভ আপডেট থাকবে।</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowManualGuide(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer"
                >
                  বুঝেছি, ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share & QR Code Modal */}
      {showShareModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/75 backdrop-blur-xs p-3 sm:p-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareModal(false);
          }}
        >
          <div className="min-h-full flex items-start sm:items-center justify-center py-2 sm:py-6">
            <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 relative my-auto animate-in fade-in zoom-in-95 text-slate-900">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/30 text-lg shrink-0">
                    🚗
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-tight">
                      সফর অ্যাপ লিংক ও কিউআর কোড
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      গফরগাঁওয়ের যেকোনো সাধারণ মানুষ এক স্ক্যানেই অ্যাপ চালাতে পারবে
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer shrink-0 ml-1"
                  aria-label="বন্ধ করুন"
                  title="বন্ধ করুন"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Poster Area */}
              <div ref={printRef} className="py-3 sm:py-4 flex flex-col items-center text-center">
                <div className="bg-gradient-to-b from-emerald-50 to-teal-50 p-3.5 sm:p-5 rounded-2xl border-2 border-dashed border-emerald-300 w-full max-w-xs flex flex-col items-center">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    গফরগাঁও স্মার্ট ট্রান্সপোর্ট
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-2 sm:mb-3">
                    ক্যামেরা দিয়ে স্ক্যান করে অ্যাপ নামান
                  </h4>

                  {qrDataUrl ? (
                    <div className="bg-white p-2.5 sm:p-3 rounded-2xl shadow-inner border border-emerald-100">
                      <img
                        src={qrDataUrl}
                        alt="Safar App QR Code"
                        className="w-36 h-36 sm:w-44 sm:h-44 object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 sm:w-44 sm:h-44 bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-400">
                      কিউআর কোড তৈরি হচ্ছে...
                    </div>
                  )}

                  <p className="text-[11px] text-slate-600 font-medium mt-2.5">
                    সিএনজি, অটোরিকশা ও ইমার্জেন্সি অ্যাম্বুলেন্স সেবা
                  </p>
                  <span className="mt-1 px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                    সম্পূর্ণ ফ্রি অ্যাপ
                  </span>
                </div>
              </div>

              {/* Active Link & Custom URL Configuration */}
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      {customLiveUrl ? 'ক্লাউডফ্লেয়ার / কাস্টম লাইভ ডোমেইন' : 'বর্তমান অ্যাপ লিংক'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempUrlInput(customLiveUrl || '');
                        setIsEditingCustomUrl(!isEditingCustomUrl);
                      }}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      {isEditingCustomUrl ? 'বাতিল' : (customLiveUrl ? 'পরিবর্তন' : '+ ক্লাউডফ্লেয়ার লিংক দিন')}
                    </button>
                  </div>

                  {isEditingCustomUrl ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="url"
                        placeholder="https://safar-gafargaon.pages.dev"
                        value={tempUrlInput}
                        onChange={(e) => setTempUrlInput(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 flex-1 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCustomUrl}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        সেভ
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200">
                      <input
                        type="text"
                        readOnly
                        value={currentUrl}
                        className="bg-transparent text-xs text-slate-700 flex-1 outline-none px-2 font-mono truncate"
                      />
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition shrink-0 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">কপি হয়েছে!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>কপি</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {isDevUrlDetected && (
                    <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200 leading-relaxed">
                      <strong>⚠️ &quot;No page found&quot; আসার কারণ:</strong> AI Studio-র এই প্রিভিউ লিংকটি শুধুমাত্র আপনার ডেভেলপমেন্ট কাজের জন্য। সাধারণ মানুষদের মোবাইলে সরাসরি চালানোর জন্য অ্যাপটি <strong>Cloudflare Pages</strong>-এ ফ্রিতে ডেপ্লয় করুন।
                    </div>
                  )}
                </div>

                {/* Cloudflare Guide Quick Action */}
                <div className="flex items-center justify-between p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Cloudflare-এ ফ্রিতে লাইভ করতে চান?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCloudflareGuide(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shrink-0"
                  >
                    গাইড দেখুন
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition"
                  >
                    <span>💬 হোয়াটসঅ্যাপে পাঠান</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>

                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>অন্যান্য মাধ্যমে শেয়ার</span>
                  </button>
                </div>

                {/* Downloads & Poster Row */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <a
                      href="/safar-gafargaon-source.zip"
                      download="safar-gafargaon-source.zip"
                      className="text-slate-700 hover:text-emerald-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      title="Cloudflare-এ আপলোড করার জন্য সম্পূর্ণ কোড জিপ"
                    >
                      <FileArchive className="w-3.5 h-3.5 text-amber-600" />
                      <span>সোর্স কোড ZIP</span>
                    </a>

                    <button
                      type="button"
                      onClick={handlePrintPoster}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer ml-2"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>পোস্টার প্রিন্ট</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloudflare Step-by-Step Guide Modal */}
      {showCloudflareGuide && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/75 backdrop-blur-xs p-3 sm:p-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCloudflareGuide(false);
          }}
        >
          <div className="min-h-full flex items-start sm:items-center justify-center py-2 sm:py-6">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative my-auto animate-in fade-in zoom-in-95 text-slate-900">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                      Cloudflare Pages-এ ফ্রি ডেপ্লয় করার নিয়ম
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">আজীবন ফ্রি হোস্টিং, আনলিমিটেড ব্যান্ডউইথ ও ফ্রি SSL</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCloudflareGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3.5 text-xs sm:text-sm text-slate-700">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <strong className="text-slate-900 flex items-center gap-1.5 text-xs">
                    <Database className="w-4 h-4 text-emerald-600" /> আপনার ডেটা বর্তমানে কোথায় স্টোর হচ্ছে?
                  </strong>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    অ্যাপের ২৬ জন চালক ও স্ট্যান্ডের ডেটা অ্যাপের ভেতরেই সংরক্ষিত আছে। চালকদের লাইসেন্স ভেরিফিকেশন ও নতুন বুকিং ব্রাউজারের লোকাল স্টোরেজে (localStorage) সেভ হয়।
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      ১
                    </span>
                    <div>
                      <strong className="text-emerald-900 block mb-0.5">সোর্স কোড ZIP ডাউনলোড করুন</strong>
                      <p className="text-xs text-slate-600 mb-1.5">অ্যাপের সম্পূর্ণ ফাইল প্রস্তুত রয়েছে:</p>
                      <a
                        href="/safar-gafargaon-source.zip"
                        download="safar-gafargaon-source.zip"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 shadow-xs"
                      >
                        <FileArchive className="w-3.5 h-3.5" /> safar-gafargaon-source.zip ডাউনলোড
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      ২
                    </span>
                    <div>
                      <strong className="text-slate-900 block mb-0.5">GitHub-এ আপলোড করুন</strong>
                      <p className="text-xs text-slate-600">
                        ফাইলগুলো আনজিপ করে আপনার GitHub অ্যাকাউন্টে একটি নতুন Repository বানিয়ে আপলোড করুন।
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50/70 border border-orange-100">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      ৩
                    </span>
                    <div>
                      <strong className="text-orange-950 block mb-0.5">Cloudflare Pages-এ কানেক্ট করুন</strong>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Cloudflare ড্যাশবোর্ডে গিয়ে <strong>Workers &amp; Pages &gt; Create &gt; Pages &gt; Connect to Git</strong> নির্বাচন করে আপনার রিপোজিটরি সিলেক্ট করুন।
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      ৪
                    </span>
                    <div>
                      <strong className="text-blue-950 block mb-0.5">বিল্ড সেটিংস (Build Settings):</strong>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                        <li>Framework preset: <strong>Vite</strong></li>
                        <li>Build command: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">npm run build</code></li>
                        <li>Build output directory: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">dist</code></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>ডেপ্লয় সম্পন্ন হলে আপনি পাবেন একটি ফ্রি ডোমেইন (যেমন: <code className="font-mono font-bold">safar-gafargaon.pages.dev</code>) যা যেকোনো ফোনে সরাসরি চলবে!</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCloudflareGuide(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition shadow cursor-pointer"
                >
                  ঠিক আছে, বুঝেছি
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
