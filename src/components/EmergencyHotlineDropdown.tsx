import React, { useState, useRef, useEffect } from 'react';
import { Phone, ChevronDown, PhoneCall, Siren, Hospital, Flame, Heart, X, ShieldAlert } from 'lucide-react';
import { EmergencyContact } from '../types';
import { INITIAL_EMERGENCY_CONTACTS } from '../data/initialData';

interface EmergencyHotlineDropdownProps {
  className?: string;
  contacts?: EmergencyContact[];
  onOpenDirectory?: () => void;
}

export const EmergencyHotlineDropdown: React.FC<EmergencyHotlineDropdownProps> = ({
  className = '',
  contacts = INITIAL_EMERGENCY_CONTACTS,
  onOpenDirectory
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hospital':
      case 'ambulance':
        return <Hospital className="w-4 h-4 text-red-600" />;
      case 'fire':
        return <Flame className="w-4 h-4 text-orange-600" />;
      case 'police':
        return <Siren className="w-4 h-4 text-blue-600" />;
      case 'blood':
        return <Heart className="w-4 h-4 text-rose-600" />;
      default:
        return <PhoneCall className="w-4 h-4 text-red-600" />;
    }
  };

  const handleCall = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    window.location.href = `tel:${cleaned}`;
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Main Trigger Button */}
      <div className="w-full flex items-center justify-between gap-1.5 p-1 bg-gradient-to-r from-red-50 via-rose-50 to-red-100 border border-red-300 rounded-xl sm:rounded-2xl shadow-xs transition-all duration-200">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="জরুরি হটলাইন ড্রপডাউন মেনু"
          className="flex-1 flex items-center justify-between gap-2 px-2.5 py-1 text-left cursor-pointer active:scale-[0.99] group rounded-lg"
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Blinking Emergency Indicator Icon */}
            <span className="relative flex h-7 w-7 rounded-lg bg-red-600 text-white items-center justify-center shrink-0 shadow-xs group-hover:bg-red-700 transition">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-lg bg-red-400 opacity-60"></span>
              <Phone className="w-4 h-4 relative z-10" />
            </span>
            <div className="truncate">
              <span className="font-extrabold text-xs sm:text-sm text-red-950 block leading-tight">
                জরুরি হটলাইন
              </span>
              <span className="text-[10px] text-red-700 font-semibold block leading-tight">
                ২৪ ঘণ্টা জরুরি সেবা ও কল
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-5 h-5 rounded-full bg-white border border-red-300 flex items-center justify-center text-red-700 transition-transform duration-200 ${isOpen ? 'rotate-180 bg-red-600 text-white border-red-600' : ''}`}>
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Quick 999 Direct Call Badge */}
        <a
          href="tel:999"
          className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-extrabold px-2.5 py-1.5 rounded-lg text-xs shadow-xs transition active:scale-95 shrink-0"
          title="জাতীয় জরুরি সেবা ৯৯৯ এ কল করুন"
        >
          <PhoneCall className="w-3 h-3 animate-bounce" />
          <span>জরুরি ৯৯৯</span>
        </a>
      </div>

      {/* Dropdown Menu (Lists all hotlines with instant auto-call upon click) */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:left-0 sm:right-auto mt-1.5 w-full sm:w-[360px] md:w-[390px] bg-white/95 backdrop-blur-md rounded-2xl border-2 border-red-500/40 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[75vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white px-4 py-3 flex items-center justify-between border-b border-red-900/20 shrink-0">
            <div className="flex items-center gap-2">
              <Siren className="w-4 h-4 text-red-200 animate-pulse" />
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                গফরগাঁও জরুরি হটলাইন
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

          {/* Hotline Contact Items (Clicking automatically calls) */}
          <div className="overflow-y-auto p-2 sm:p-2.5 space-y-1.5 divide-y divide-slate-100">
            {/* Quick 999 Highlight Item */}
            <div
              onClick={() => handleCall('999')}
              className="p-2.5 rounded-xl bg-red-50/90 hover:bg-red-100/90 border border-red-300 transition cursor-pointer flex items-center justify-between gap-2.5 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldAlert className="w-4 h-4 text-white" />
                </span>
                <div className="truncate">
                  <h4 className="font-extrabold text-xs sm:text-sm text-red-950 group-hover:text-red-700 transition">
                    জাতীয় জরুরি সেবা (পুলিশ, এম্বুলেন্স, ফায়ার)
                  </h4>
                  <span className="font-mono font-black text-xs text-red-700 block">
                    ৯৯৯ (টোল-ফ্রি)
                  </span>
                </div>
              </div>
              <a
                href="tel:999"
                onClick={(e) => e.stopPropagation()}
                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs shrink-0"
              >
                <PhoneCall className="w-3 h-3" />
                <span>কল</span>
              </a>
            </div>

            {/* List of Managed Hotlines */}
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleCall(contact.phone)}
                className="pt-1.5 first:pt-0"
              >
                <div className="p-2 rounded-xl bg-slate-50 hover:bg-red-50/60 border border-slate-200 hover:border-red-300 transition cursor-pointer flex items-center justify-between gap-2.5 group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs group-hover:border-red-300">
                      {getCategoryIcon(contact.category)}
                    </span>
                    <div className="truncate">
                      <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-red-900 transition leading-snug truncate">
                        {contact.titleBn}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-red-700 mt-0.5">
                        <Phone className="w-3 h-3 text-red-500 shrink-0" />
                        <span>{contact.phone}</span>
                        {contact.altPhone && (
                          <span className="text-slate-400 font-normal">/ {contact.altPhone}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <a
                    href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs shrink-0 active:scale-95 transition"
                    title={`${contact.titleBn}-এ সরাসরি কল করুন`}
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>কল</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Footer with Directory Modal link if needed */}
          <div className="bg-slate-50 px-3 py-2 text-center text-[11px] text-slate-600 border-t border-slate-200 shrink-0 flex items-center justify-between">
            <span>ক্লিক করলেই সরাসরি ফোন ডায়ালারে চলে যাবে</span>
            {onOpenDirectory && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenDirectory();
                }}
                className="text-red-700 font-bold hover:underline cursor-pointer ml-auto"
              >
                সকল হেল্পলাইন বিস্তারিত
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
