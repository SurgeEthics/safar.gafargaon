import React from 'react';
import { X, PhoneCall, ShieldAlert, Heart, Flame, Hospital, Siren, MapPin, Clock } from 'lucide-react';
import { EmergencyContact } from '../types';
import { INITIAL_EMERGENCY_CONTACTS } from '../data/initialData';

interface EmergencyDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts?: EmergencyContact[];
}

export const EmergencyDirectoryModal: React.FC<EmergencyDirectoryModalProps> = ({
  isOpen,
  onClose,
  contacts = INITIAL_EMERGENCY_CONTACTS
}) => {
  if (!isOpen) return null;

  const getCategoryIcon = (cat: EmergencyContact['category']) => {
    switch (cat) {
      case 'hospital':
      case 'ambulance':
        return <Hospital className="w-5 h-5 text-red-600" />;
      case 'fire':
        return <Flame className="w-5 h-5 text-orange-600" />;
      case 'police':
        return <Siren className="w-5 h-5 text-blue-600" />;
      case 'blood':
        return <Heart className="w-5 h-5 text-rose-600" />;
      default:
        return <PhoneCall className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold">
              <Siren className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                গফরগাঁও জরুরি হেল্পলাইন ডিরেক্টরি
              </h3>
              <p className="text-[11px] text-red-100">
                ২৪ ঘণ্টা সার্বক্ষণিক জরুরি সেবা ও যোগাযোগ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contacts List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-red-300 transition flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  {getCategoryIcon(contact.category)}
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                    {contact.titleBn}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{contact.locationBn}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-bold text-xs text-red-700">
                      {contact.phone}
                    </span>
                    {contact.altPhone && (
                      <span className="font-mono text-[11px] text-slate-500">
                        / {contact.altPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <a
                href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>কল দিন</span>
              </a>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 text-center text-xs text-slate-500">
          জরুরি পরিস্থিতিতে দ্রুত কল করুন • টোল-ফ্রি ৯৯৯
        </div>

      </div>
    </div>
  );
};
