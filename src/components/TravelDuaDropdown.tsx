import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  Moon,
} from 'lucide-react';
import {
  TRAVEL_DUAS,
  TRAVEL_DUA_SLIDES,
  getDuaSlideIndexById,
  getWrappedDuaSlideIndex,
  formatDuaForCopy,
} from '../data/travelDuas';
import { PauseMarqueeText } from './PauseMarqueeText';

interface TravelDuaDropdownProps {
  className?: string;
}

const toBnDigits = (num: number): string =>
  String(num).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)] || d);

export const TravelDuaDropdown: React.FC<TravelDuaDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>('dua-01');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [swipePreview, setSwipePreview] = useState<'left' | 'right' | null>(null);
  const [copied, setCopied] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{
    x: number;
    y: number;
    lockedAxis: 'x' | 'y' | null;
  } | null>(null);
  const lastWheelSlideRef = useRef<number>(0);

  const activeDua =
    activeSlideIndex !== null && TRAVEL_DUA_SLIDES[activeSlideIndex]
      ? TRAVEL_DUA_SLIDES[activeSlideIndex]
      : null;

  // Close dropdown on outside click (only when no dua sticker modal is active)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeSlideIndex !== null) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeSlideIndex]);

  const navigateSlide = useCallback((delta: number) => {
    setActiveSlideIndex((prev) => {
      if (prev === null) return null;
      return getWrappedDuaSlideIndex(prev, delta, TRAVEL_DUA_SLIDES.length);
    });
    setSlideDirection(delta >= 0 ? 'next' : 'prev');
    setCopied(false);
    setSwipePreview(null);
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = 0;
    }
  }, []);

  const jumpToSlideIndex = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= TRAVEL_DUA_SLIDES.length) return;
    setActiveSlideIndex((prev) => {
      if (prev !== null) {
        setSlideDirection(targetIndex >= prev ? 'next' : 'prev');
      }
      return targetIndex;
    });
    setCopied(false);
    setSwipePreview(null);
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = 0;
    }
  }, []);

  // Keyboard navigation (Left/Right Arrows + Escape) while popup sticker is open
  useEffect(() => {
    if (activeSlideIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateSlide(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateSlide(-1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setActiveSlideIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlideIndex, navigateSlide]);

  const handleOpenDuaById = (id: string) => {
    const idx = getDuaSlideIndexById(id);
    setSlideDirection('next');
    setActiveSlideIndex(idx >= 0 ? idx : 0);
    setCopied(false);
    setSwipePreview(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      lockedAxis: null,
    };
    setSwipePreview(null);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (!start.lockedAxis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      start.lockedAxis = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : 'y';
    }

    if (start.lockedAxis === 'x') {
      if (dx < -18) {
        setSwipePreview('left');
      } else if (dx > 18) {
        setSwipePreview('right');
      } else {
        setSwipePreview(null);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || e.changedTouches.length === 0) {
      setSwipePreview(null);
      return;
    }
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    setSwipePreview(null);

    const isHorizontalGesture =
      start.lockedAxis === 'x' ||
      (start.lockedAxis === null && Math.abs(dx) > Math.abs(dy) * 1.25);

    if (isHorizontalGesture && Math.abs(dx) >= 44) {
      if (dx < 0) {
        // Swipe left -> forward (1 -> 12 -> 1)
        navigateSlide(1);
      } else {
        // Swipe right -> backward (12 -> 1 -> 12)
        navigateSlide(-1);
      }
    }
  };

  const handleWheelSwipe = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaX) > 36 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.6) {
      const now = Date.now();
      if (now - lastWheelSlideRef.current > 450) {
        lastWheelSlideRef.current = now;
        navigateSlide(e.deltaX > 0 ? 1 : -1);
      }
    }
  };

  const handleCopy = () => {
    if (!activeDua) return;
    const text = formatDuaForCopy(activeDua);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      })
      .catch(() => {});
  };

  const totalSlides = TRAVEL_DUA_SLIDES.length;

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
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 text-[10px] font-bold hidden sm:inline-block">
              দো'আ সমূহ
            </span>
            <span
              className={`w-5 h-5 rounded-full bg-white border border-emerald-300 flex items-center justify-center text-emerald-700 transition-transform duration-200 ${
                isOpen ? 'rotate-180 bg-emerald-600 text-white border-emerald-600' : ''
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 left-0 sm:left-auto sm:right-0 mt-1.5 w-full sm:w-[360px] md:w-[390px] bg-amber-50/95 backdrop-blur-md rounded-2xl border-2 border-emerald-500/40 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[75vh] flex flex-col">
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
                aria-label="দো'আ তালিকা বন্ধ করুন"
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
                      <button
                        type="button"
                        onClick={() => setExpandedSubmenu(isSubmenuOpen ? null : item.id)}
                        className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-amber-100/70 transition cursor-pointer text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-8 h-8 rounded-full bg-[#2a8996] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            {item.serialNumberBn}
                          </span>
                          <span className="font-bold text-xs sm:text-[13px] text-slate-800 group-hover:text-emerald-900 transition leading-snug">
                            {item.title}
                          </span>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full bg-white/80 border border-amber-300 flex items-center justify-center text-slate-600 transition-transform ${
                            isSubmenuOpen ? 'rotate-90 text-emerald-700 bg-emerald-100' : ''
                          }`}
                        >
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>

                      {isSubmenuOpen && (
                        <div className="pl-6 pr-1 pt-1 pb-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          {item.subItems.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleOpenDuaById(sub.id)}
                              className="w-full flex items-center gap-2.5 p-1.5 rounded-lg bg-amber-100/60 hover:bg-emerald-100/80 border border-amber-300/60 hover:border-emerald-400 transition cursor-pointer text-left group"
                            >
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
                      onClick={() => handleOpenDuaById(item.id)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-amber-100/70 transition cursor-pointer text-left group"
                    >
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

            <div className="bg-amber-100/80 px-3 py-2 text-center text-[11px] text-amber-900 border-t border-amber-300/40 shrink-0 font-medium">
              যে কোনো দো'আয় ক্লিক করলে স্লাইড স্টিকার ও কপি অপশন পাবেন (১–১২)
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DUA STICKER POPUP MODAL (Swipeable & Arrow Navigable 1 <-> 12) */}
      {/* ============================================================== */}
      {activeDua && activeSlideIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`সফরের দো'আ স্টিকার: ${activeDua.title}`}
          className="fixed inset-0 z-[80] flex items-center justify-center p-2.5 sm:px-14 sm:py-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveSlideIndex(null)}
        >
          <div
            className="relative w-full max-w-xl flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tablet/Desktop Flanking Previous Arrow Button */}
            <button
              type="button"
              onClick={() => navigateSlide(-1)}
              aria-label="পূর্ববর্তী দো'আ স্টিকার"
              title="পূর্ববর্তী দো'আ (বাম অ্যারো)"
              className="hidden sm:flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/95 hover:bg-emerald-600 text-emerald-900 hover:text-white border border-emerald-200 shadow-xl absolute -left-12 md:-left-14 z-10 cursor-pointer transition-all active:scale-95"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Sticker Modal Card */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={() => {
                touchStartRef.current = null;
                setSwipePreview(null);
              }}
              onWheel={handleWheelSwipe}
              className={`bg-white w-full rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 touch-pan-y select-none sm:select-text transition-transform ${
                swipePreview === 'left'
                  ? '-translate-x-2 opacity-95'
                  : swipePreview === 'right'
                  ? 'translate-x-2 opacity-95'
                  : 'translate-x-0 opacity-100'
              }`}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-2.5 sm:p-3 flex items-center justify-between shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-white shrink-0">
                    <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 fill-amber-300" />
                  </span>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9.5px] sm:text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
                        সফরের দো'আ স্টিকার
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-extrabold leading-none">
                        নং {activeDua.serialBn} • {toBnDigits(activeSlideIndex + 1)}/{toBnDigits(totalSlides)}
                      </span>
                    </div>
                    <div className="min-w-0 overflow-hidden mt-0.5">
                      <PauseMarqueeText
                        text={activeDua.title}
                        className="font-extrabold text-xs sm:text-sm text-white"
                        pauseSec={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 ${
                      copied
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                        : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                    }`}
                    title="সম্পূর্ণ দো'আ কার্ড কপি করুন"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden xs:inline sm:inline">{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSlideIndex(null)}
                    aria-label="স্টিকার পপআপ বন্ধ করুন"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                    title="বন্ধ করুন"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sticker Body Content (Animated Slide Transition) */}
              <div
                ref={bodyScrollRef}
                className="p-2.5 sm:p-4 overflow-y-auto space-y-3 text-slate-900 bg-slate-50/50 flex-1 font-['Hind_Siliguri',sans-serif]"
              >
                <div
                  key={activeDua.id}
                  className={`bg-white p-3 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-2.5 animate-in fade-in duration-200 ${
                    slideDirection === 'next' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {activeDua.title}
                    </h2>
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[#2a8996] text-[11px] font-extrabold">
                      {activeDua.serialBn}
                    </span>
                  </div>

                  {activeDua.subTitle && (
                    <p className="text-xs font-semibold text-slate-700">{activeDua.subTitle}</p>
                  )}

                  {activeDua.narration && (
                    <p className="text-xs text-slate-700 leading-relaxed italic bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                      {activeDua.narration}
                    </p>
                  )}

                  {activeDua.arabic && (
                    <div
                      dir="rtl"
                      className="py-2.5 px-3 bg-amber-50/80 rounded-xl border border-amber-300/80 text-right mt-1.5 mb-3.5 shadow-2xs"
                    >
                      <p className="font-['Amiri','Scheherazade_New','Noto_Naskh_Arabic',serif] text-[17px] sm:text-[19px] text-emerald-950 font-normal leading-[1.8] tracking-wide select-all antialiased text-right">
                        {activeDua.arabic}
                      </p>
                    </div>
                  )}

                  {activeDua.transliteration && (
                    <div className="space-y-1 pt-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                        উচ্চারণ:
                      </span>
                      <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed select-all">
                        "{activeDua.transliteration}"
                      </p>
                    </div>
                  )}

                  {activeDua.translation && (
                    <div className="space-y-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                        অর্থ:
                      </span>
                      <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed select-all">
                        "{activeDua.translation}"
                      </p>
                    </div>
                  )}

                  {activeDua.context && (
                    <div className="text-[11px] sm:text-xs text-slate-700 leading-relaxed bg-slate-100/70 p-2 rounded-lg border border-slate-200">
                      {activeDua.context}
                    </div>
                  )}

                  {activeDua.reference && (
                    <div className="pt-2 border-t border-slate-100 text-[10.5px] sm:text-[11px] text-slate-500 leading-relaxed whitespace-pre-line">
                      {activeDua.reference}
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Slide Strip (Tap directly or see position across 1-12) */}
              <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full" role="tablist" aria-label="দো'আ স্টিকার ক্রম">
                  {TRAVEL_DUA_SLIDES.map((slide, idx) => {
                    const isCurrent = idx === activeSlideIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        role="tab"
                        aria-selected={isCurrent}
                        aria-label={`দো'আ ${slide.serialBn}: ${slide.title}`}
                        onClick={() => jumpToSlideIndex(idx)}
                        className={`h-5 min-w-5 px-1 rounded-md text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                          isCurrent
                            ? 'bg-emerald-600 text-white shadow-xs scale-105'
                            : 'bg-white text-slate-600 hover:bg-emerald-100 border border-slate-200'
                        }`}
                      >
                        {slide.serialBn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Bottom Action Bar */}
              <div className="bg-slate-100/90 px-3 py-2 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  টাচ স্লাইড, প্যাড সোয়াইপ বা অ্যারো দিয়ে ১–১২ দেখুন
                </span>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer active:scale-95 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSlideIndex(null)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            </div>

            {/* Tablet/Desktop Flanking Next Arrow Button */}
            <button
              type="button"
              onClick={() => navigateSlide(1)}
              aria-label="পরবর্তী দো'আ স্টিকার"
              title="পরবর্তী দো'আ (ডান অ্যারো)"
              className="hidden sm:flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/95 hover:bg-emerald-600 text-emerald-900 hover:text-white border border-emerald-200 shadow-xl absolute -right-12 md:-right-14 z-10 cursor-pointer transition-all active:scale-95"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
