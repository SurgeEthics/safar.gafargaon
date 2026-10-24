import React from 'react';
import { User, Car, Database, UserPlus, PhoneCall, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  mode: 'passenger' | 'driver';
  onModeChange: (mode: 'passenger' | 'driver') => void;
  onOpenDataManager: () => void;
  onOpenDriverRegister: () => void;
  onOpenEmergencyDirectory: () => void;
  totalDriversCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  onOpenDataManager,
  onOpenDriverRegister,
  onOpenEmergencyDirectory,
  totalDriversCount
}) => {
  return (
    <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 border border-white/25 flex items-center justify-center font-bold text-2xl text-white shadow-inner">
            <span className="font-serif">S</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-none">
                সফর
              </h1>
              <span className="bg-emerald-600/80 text-[11px] font-medium px-2 py-0.5 rounded-full border border-emerald-400/30 text-emerald-100 hidden sm:inline-block">
                গফরগাঁও
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 font-normal leading-tight mt-0.5">
              স্মার্ট ট্রান্সপোর্ট ও ইমার্জেন্সি সার্ভিস
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Passenger / Driver Mode Switcher */}
          <div className="bg-emerald-950/40 p-1 rounded-xl flex items-center border border-white/10 text-xs">
            <button
              onClick={() => onModeChange('passenger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                mode === 'passenger'
                  ? 'bg-white text-emerald-900 shadow-sm font-semibold'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>যাত্রী</span>
            </button>
            <button
              onClick={() => onModeChange('driver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                mode === 'driver'
                  ? 'bg-white text-emerald-900 shadow-sm font-semibold'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>চালক</span>
            </button>
          </div>

          {/* Data Manager & Backup (Answers user's prompt on managing AI Studio project data) */}
          <button
            onClick={onOpenDataManager}
            title="অন্য AI Studio প্রজেক্টের সাথে ডেটা আদান-প্রদান ও ব্যাকআপ"
            className="flex items-center gap-1.5 bg-emerald-700/80 hover:bg-emerald-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/40 transition shadow-sm"
          >
            <Database className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">ডেটা ব্যাকআপ</span>
          </button>

          {/* Emergency Directory Quick View */}
          <button
            onClick={onOpenEmergencyDirectory}
            title="গফরগাঁও জরুরি সেবা ডিরেক্টরি"
            className="p-1.5 bg-emerald-700/70 hover:bg-emerald-700 text-emerald-100 hover:text-white rounded-lg transition"
          >
            <PhoneCall className="w-4 h-4 text-emerald-200" />
          </button>

          {/* Registration Button */}
          <button
            onClick={onOpenDriverRegister}
            className="flex items-center gap-1.5 bg-white text-emerald-900 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition border border-emerald-100"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>নিবন্ধন</span>
          </button>
        </div>
      </div>
    </header>
  );
};
