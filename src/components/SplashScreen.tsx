import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 3000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fading 400ms before finishing
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, Math.max(1000, durationMs - 400));

    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      onFinish?.();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      id="safar-app-splash-screen"
      className={`fixed inset-0 z-[999999] bg-white flex flex-col items-center justify-between px-6 pt-12 pb-14 select-none transition-opacity duration-400 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top spacer */}
      <div className="w-full"></div>

      {/* Center: App Icon with clean rounded corners matching IMG-13 */}
      <div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
        <div className="relative">
          <img
            src="/pwa-192x192.png"
            alt="সফর লোগো"
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl sm:rounded-[36px] shadow-xl shadow-emerald-700/20 object-cover"
          />
        </div>
      </div>

      {/* Bottom Area: Beautiful Arabic Dua in Oval Pill Border matching IMG-13 */}
      <div className="w-full flex flex-col items-center justify-center pb-2 animate-in fade-in duration-700">
        <div className="border border-slate-300/90 bg-white rounded-full px-6 sm:px-8 py-2.5 sm:py-3 shadow-xs max-w-[92%] sm:max-w-md mx-auto">
          <p
            dir="rtl"
            className="font-['Amiri',_'Scheherazade_New',_'Noto_Naskh_Arabic',_serif] text-base sm:text-lg md:text-xl font-bold text-slate-800 tracking-wide text-center leading-normal"
          >
            بِسْمِ اللّٰهِ، تَوَكَّلْتُ عَلَى اللّٰهِ
          </p>
        </div>
      </div>
    </div>
  );
};
