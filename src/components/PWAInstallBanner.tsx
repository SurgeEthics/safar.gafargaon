import React, { useState, useEffect } from 'react';
import { Download, Share2, QrCode, Check, Copy, X, Sparkles, Smartphone, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  appName?: string;
  customAppUrl?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  appName = 'সফর (Safar) গফরগাঁও',
  customAppUrl,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const getPublicShareUrl = (): string => {
    if (customAppUrl && customAppUrl.trim()) return customAppUrl.trim();
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    // Cloud Run development URL requires AI Studio workspace authentication and returns 403 Forbidden on mobile
    // Convert to the public shared pre-release URL:
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  };

  const currentUrl = getPublicShareUrl();
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

  return (
    <>
      {/* Top Floating Mini Banner when not installed and not dismissed */}
      {!isInstalled && !isDismissed && (
        <aside
          aria-label="App Installation Banner"
          className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md border-b border-emerald-500/30 sticky top-0 z-40"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/safar-logo.svg"
                alt="সফর লোগো"
                className="w-8 h-8 rounded-xl shadow-md border border-emerald-300/40 object-contain flex-shrink-0 hover:scale-105 transition-transform"
              />
              <div className="truncate">
                <p className="font-semibold text-white flex items-center gap-1.5 truncate">
                  <span>মোবাইলে আসল অ্যাপের মতো ব্যবহার করুন</span>
                  <span className="hidden md:inline-flex items-center gap-0.5 bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    <Sparkles className="w-2.5 h-2.5" /> ১০০% ফ্রি
                  </span>
                </p>
                <p className="text-[11px] text-emerald-100 hidden sm:block truncate">
                  কোনো প্লেস্টোর খরচ নেই, ১-ট্যাপে সরাসরি অ্যান্ড্রয়েড ফোনে ইনস্টল
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 shadow transition transform active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ইনস্টল করুন</span>
              </button>

              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="bg-white/15 hover:bg-white/25 text-white font-medium px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                title="শেয়ার ও কিউআর কোড"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">শেয়ার</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                aria-label="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Floating Share / Quick Action Button for easy access even if banner closed */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-semibold text-xs border-2 border-white/40 group"
          title="অ্যাপ লিংক ও কিউআর কোড"
        >
          <QrCode className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="hidden md:inline pr-1">অ্যাপ লিংক ও কিউআর</span>
        </button>
      </div>

      {/* Manual Install Instruction Modal (For Android Chrome / iOS) */}
      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {isIOS ? 'আইফোন / আইপ্যাডে ইনস্টল করুন' : 'অ্যান্ড্রয়েড ফোনে ইনস্টল করার সহজ নিয়ম'}
                  </h3>
                  <p className="text-xs text-slate-500">এক ক্লিকেই এটি ফোনের হোম স্ক্রিনে সেভ হয়ে যাবে</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
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
                <span>প্লে স্টোরের কোনো ২৫ ডলার ফি নেই, কোনো মেমোরি খরচ নেই এবং সবসময় লাইভ আপডেট থাকবে।</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManualGuide(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition shadow"
              >
                বুঝেছি, ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share & QR Code Modal for Viral Growth in Gafargaon */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 my-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src="/safar-logo.svg"
                  alt="সফর লোগো"
                  className="w-12 h-12 rounded-2xl shadow-md border border-emerald-300/40 object-contain p-0.5 bg-white"
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                    সফর অ্যাপটি ফ্রিতে ছড়িয়ে দিন
                  </h3>
                  <p className="text-xs text-slate-500">
                    গফরগাঁওয়ের যেকোনো সাধারণ মানুষ এক স্ক্যানেই অ্যাপ চালাতে পারবে
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Area */}
            <div className="py-4 flex flex-col items-center text-center">
              <div className="bg-gradient-to-b from-emerald-50 to-teal-50 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-emerald-300 w-full max-w-xs flex flex-col items-center">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  গফরগাঁও স্মার্ট ট্রান্সপোর্ট
                </span>
                <h4 className="text-sm font-bold text-slate-800 mb-3">
                  ক্যামেরা দিয়ে স্ক্যান করে অ্যাপ নামান
                </h4>

                {qrDataUrl ? (
                  <div className="bg-white p-3 rounded-2xl shadow-inner border border-emerald-100">
                    <img
                      src={qrDataUrl}
                      alt="Safar App QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-400">
                    কিউআর কোড তৈরি হচ্ছে...
                  </div>
                )}

                <span className="mt-3 px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                  সম্পূর্ণ ফ্রি অ্যাপ
                </span>
              </div>
            </div>

            {/* Live Link Input */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="bg-transparent text-xs text-slate-700 flex-1 outline-none px-2 font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>কপি করুন</span>
                    </>
                  )}
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
                  className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>অন্যান্য মাধ্যমে শেয়ার</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
