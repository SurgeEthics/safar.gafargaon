import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronRight, X, Copy, Check, Moon, Share2 } from 'lucide-react';
import { TRAVEL_DUAS, TravelDuaItem, TravelDuaSubItem, formatDuaForCopy } from '../data/travelDuas';

interface TravelDuaDropdownProps {
  className?: string;
}

export const TravelDuaDropdown: React.FC<TravelDuaDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>('dua-01'); // default expanded
  const [activeDua, setActiveDua] = useState<{
    title: string;
    subTitle?: string;
    arabic?: string;
    transliteration?: string;
    translation?: string;
    narration?: string;
    context?: string;
    reference?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click (only when no dua sticker modal is active)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDua) return; // Do not close dropdown while reading popup sticker
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDua]);

  const handleOpenDua = (dua: {
    title: string;
    subTitle?: string;
    arabic?: string;
    transliteration?: string;
    translation?: string;
    narration?: string;
    context?: string;
    reference?: string;
  }) => {
    setActiveDua(dua);
    setCopied(false);
    // Keep dropdown open so user can smoothly continue reading without re-opening
  };

  const handleCopy = () => {
    if (!activeDua) return;
    const text = formatDuaForCopy(activeDua);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  };

  return (
    <>
      {/* Dropdown Container */}
      <div ref={dropdownRef} className={`relative ${className}`}>
        {/* Main Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="সফরের দো'আ ড্রপডাউন মেনু"
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 hover:from-emerald-100 hover:to-teal-100 border border-emerald-300 rounded-xl sm:rounded-2xl shadow-xs transition-all duration-200 cursor-pointer active:scale-[0.99] group text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-emerald-700 transition">
              <BookOpen className="w-4 h-4" />
            </span>
            <div className="truncate">
              <span className="font-extrabold text-xs sm:text-sm text-emerald-950 block leading-tight">
                সফরের দো'আ
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block leading-tight">
                সফর সংক্রান্ত জরুরি দো'আ ও যিকিরসমূহ
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-bold hidden sm:inline-block">
              দো'আ সমূহ
            </span>
            <span className={`w-5 h-5 rounded-full bg-white border border-emerald-300 flex items-center justify-center text-emerald-700 transition-transform duration-200 ${isOpen ? 'rotate-180 bg-emerald-600 text-white border-emerald-600' : ''}`}>
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Dropdown Menu (Islamic / Gold & Emerald Palette as requested) */}
        {isOpen && (
          <div className="absolute right-0 left-0 sm:left-auto sm:right-0 mt-1.5 w-full sm:w-[360px] md:w-[390px] bg-amber-50/95 backdrop-blur-md rounded-2xl border-2 border-emerald-500/40 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[75vh] flex flex-col">
            {/* Header in Dropdown (Clean, no extra 'সফর' text as instructed) */}
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white px-4 py-3 flex items-center justify-between border-b border-emerald-800/20 shrink-0">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-amber-300 fill-amber-300" />
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                  সফরের দো'আ ও যিক্‌র
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of 12 Duas */}
            <div className="overflow-y-auto p-2 sm:p-2.5 space-y-1.5 divide-y divide-amber-200/40">
              {TRAVEL_DUAS.map((item) => {
                const isSubmenuOpen = expandedSubmenu === item.id;

                if (item.hasSubmenu && item.subItems) {
                  return (
                    <div key={item.id} className="pt-1.5 first:pt-0">
                      {/* Main Group Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedSubmenu(isSubmenuOpen ? null : item.id)}
                        className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-amber-100/70 transition cursor-pointer text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Circular Teal Badge (as in user's image) */}
                          <span className="w-8 h-8 rounded-full bg-[#2a8996] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            {item.serialNumberBn}
                          </span>
                          <span className="font-bold text-xs sm:text-[13px] text-slate-800 group-hover:text-emerald-900 transition leading-snug">
                            {item.title}
                          </span>
                        </div>
                        <span className={`w-5 h-5 rounded-full bg-white/80 border border-amber-300 flex items-center justify-center text-slate-600 transition-transform ${isSubmenuOpen ? 'rotate-90 text-emerald-700 bg-emerald-100' : ''}`}>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>

                      {/* Submenu Items (indented, outlined circular badges) */}
                      {isSubmenuOpen && (
                        <div className="pl-6 pr-1 pt-1 pb-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          {item.subItems.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleOpenDua({
                                title: sub.title,
                                subTitle: sub.subTitle,
                                arabic: sub.arabic,
                                transliteration: sub.transliteration,
                                translation: sub.translation,
                                narration: sub.narration,
                                reference: sub.reference
                              })}
                              className="w-full flex items-center gap-2.5 p-1.5 rounded-lg bg-amber-100/60 hover:bg-emerald-100/80 border border-amber-300/60 hover:border-emerald-400 transition cursor-pointer text-left group"
                            >
                              {/* Outlined Circular Badge (as in user's image: ১০.১, ১০.২ / ০১.১, ০১.২) */}
                              <span className="w-7 h-7 rounded-full bg-white border-1.5 border-[#2a8996] text-[#2a8996] font-bold text-[10.5px] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-[#2a8996] group-hover:text-white transition-colors">
                                {sub.serialBn}
                              </span>
                              <span className="font-bold text-xs text-slate-800 group-hover:text-emerald-950 transition">
                                {sub.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={item.id} className="pt-1.5 first:pt-0">
                    <button
                      type="button"
                      onClick={() => handleOpenDua({
                        title: `[${item.serialNumberBn}] ${item.title}`,
                        subTitle: item.subTitle,
                        arabic: item.arabic,
                        transliteration: item.transliteration,
                        translation: item.translation,
                        narration: item.narration,
                        context: item.context,
                        reference: item.reference
                      })}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-amber-100/70 transition cursor-pointer text-left group"
                    >
                      {/* Circular Teal Badge (as in user's image) */}
                      <span className="w-8 h-8 rounded-full bg-[#2a8996] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {item.serialNumberBn}
                      </span>
                      <span className="font-bold text-xs sm:text-[13px] text-slate-800 group-hover:text-emerald-900 transition leading-snug">
                        {item.title}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Footer Tip */}
            <div className="bg-amber-100/80 px-3 py-2 text-center text-[11px] text-amber-900 border-t border-amber-300/40 shrink-0 font-medium">
              যে কোনো দো'আয় ক্লিক করলে পূর্ণ স্টিকার ও কপি অপশন পাবেন
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DUA STICKER POPUP MODAL (Exact Format as Screenshots 003508 / 003452) */}
      {/* ============================================================== */}
      {activeDua && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveDua(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-white shrink-0">
                  <Moon className="w-4 h-4 text-amber-300 fill-amber-300" />
                </span>
                <div className="truncate">
                  <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">
                    সফরের দো'আ স্টিকার
                  </span>
                  <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                    {activeDua.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Copy Button on Header */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 ${
                    copied
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                      : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                  }`}
                  title="সম্পূর্ণ দো'আ কার্ড কপি করুন"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveDua(null)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer ml-1"
                  title="বন্ধ করুন"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sticker Body Content (Faithful reproduction of format in Screenshot 003508 / 003452) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-900 bg-slate-50/50 flex-1 font-['Hind_Siliguri',sans-serif]">
              {/* Sticker Container with clean border & shadow */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
                {/* Title */}
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {activeDua.title}
                </h2>

                {/* Subtitle if available (e.g. দো'আ [০১.০১]:) */}
                {activeDua.subTitle && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">
                    {activeDua.subTitle}
                  </p>
                )}

                {/* Narration intro if any */}
                {activeDua.narration && (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                    {activeDua.narration}
                  </p>
                )}

                {/* Arabic Text (Pure Arabic, Font Amiri / Scheherazade New, crisp, right-to-left with accurate vowel marks) */}
                {activeDua.arabic && (
                  <div 
                    dir="rtl" 
                    className="py-3.5 px-4 bg-amber-50/70 rounded-2xl border-2 border-amber-300/60 text-right my-2 shadow-xs"
                  >
                    <p className="font-['Amiri','Scheherazade_New','Noto_Naskh_Arabic',serif] text-2xl sm:text-3xl text-emerald-950 font-normal leading-[2.3] tracking-wide select-all antialiased">
                      {activeDua.arabic}
                    </p>
                  </div>
                )}

                {/* Pronunciation (উচ্চারণ) */}
                {activeDua.transliteration && (
                  <div className="space-y-1">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                      উচ্চারণ:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed select-all">
                      "{activeDua.transliteration}"
                    </p>
                  </div>
                )}

                {/* Meaning (অর্থ) */}
                {activeDua.translation && (
                  <div className="space-y-1">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                      অর্থ:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed select-all">
                      "{activeDua.translation}"
                    </p>
                  </div>
                )}

                {/* Context (দোয়ার প্রেক্ষাপট) */}
                {activeDua.context && (
                  <div className="text-xs sm:text-[13px] text-slate-700 leading-relaxed bg-slate-100/70 p-2.5 rounded-xl border border-slate-200">
                    {activeDua.context}
                  </div>
                )}

                {/* Reference & Hadith context */}
                {activeDua.reference && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] sm:text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {activeDua.reference}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="bg-slate-100/90 px-4 py-3 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                সফরকালে দো'আ পাঠ করা সুন্নত ও নিরাপত্তার মাধ্যম
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 shadow-xs ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'সম্পূর্ণ লেখা কপি হয়েছে!' : 'স্টিকার কপি করুন'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDua(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
