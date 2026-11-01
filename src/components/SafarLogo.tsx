import React from 'react';

interface SafarLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const SafarLogo: React.FC<SafarLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false
}) => {
  const sizeMap = {
    sm: { box: 'w-10 h-10', text: 'text-xs' },
    md: { box: 'w-14 h-14 sm:w-16 sm:h-16', text: 'text-sm' },
    lg: { box: 'w-20 h-20 sm:w-24 sm:h-24', text: 'text-base' },
    xl: { box: 'w-28 h-28 sm:w-32 sm:h-32', text: 'text-xl' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex flex-col items-center select-none group ${className}`}>
      <div
        className={`${currentSize.box} flex items-center justify-center transition-all duration-300 group-hover:scale-105 relative`}
        title="সফর - স্মার্ট ট্রান্সপোর্ট ও ইমার্জেন্সি সার্ভিস"
      >
        <img
          src="/safar-logo.png"
          alt="সফর"
          className="w-full h-full object-contain rounded-2xl drop-shadow-md"
        />
      </div>

      {showSubtitle && (
        <span className="text-[10px] text-emerald-100 font-bold mt-1 tracking-wider uppercase sm:hidden">
          সফর
        </span>
      )}
    </div>
  );
};
