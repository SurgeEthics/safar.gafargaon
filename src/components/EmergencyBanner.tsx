import React from 'react';
import { Phone, AlertCircle, ChevronRight } from 'lucide-react';

interface EmergencyBannerProps {
  onOpenDirectory: () => void;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ onOpenDirectory }) => {
  return (
    <div className="bg-red-50 border-b border-red-200 text-red-900 py-1.5 px-3 sm:px-4 text-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
        {/* Left side text and hotlines */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-red-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
            <span>জরুরি হটলাইন:</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] sm:text-xs">
            <a
              href="tel:01710024452"
              className="hover:underline flex items-center gap-1 font-medium text-red-800"
              title="উপজেলা স্বাস্থ্য কমপ্লেক্স এম্বুলেন্সে কল করুন"
            >
              <span>হাসপাতাল এম্বুলেন্স:</span>
              <span className="font-semibold underline decoration-dotted">০১৭১০-০২৪৪৫২</span>
            </a>
            <span className="text-red-300">|</span>
            <a
              href="tel:01703557711"
              className="hover:underline flex items-center gap-1 font-medium text-red-800"
              title="গফরগাঁও ফায়ার সার্ভিসে কল করুন"
            >
              <span>ফায়ার সার্ভিস:</span>
              <span className="font-semibold underline decoration-dotted">০১৭০৩-৫৫৭৭১১</span>
            </a>
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDirectory}
            className="text-[11px] text-red-700 hover:text-red-900 flex items-center hover:underline font-medium"
          >
            <span>অন্যান্য নম্বর</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          <a
            href="tel:999"
            className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded text-xs transition shadow-sm active:scale-95"
            title="জাতীয় জরুরি সেবা ৯৯৯ এ কল করুন"
          >
            <Phone className="w-3 h-3 animate-bounce" />
            <span>জরুরি ৯৯৯</span>
          </a>
        </div>
      </div>
    </div>
  );
};
