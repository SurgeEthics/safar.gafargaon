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
  // Size mapping with comfortable dimensions so 'স' and 'সফর' are distinctly large and legible
  const sizeMap = {
    sm: 'w-11 h-11',
    md: 'w-14 h-14 sm:w-16 sm:h-16',
    lg: 'w-20 h-20 sm:w-24 sm:h-24',
    xl: 'w-28 h-28 sm:w-32 sm:h-32'
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex flex-col items-center select-none group ${className}`}>
      <img
        src="/safar-logo.svg"
        alt="সফর - স্মার্ট ট্রান্সপোর্ট ও ইমার্জেন্সি সার্ভিস"
        className={`${currentSize} object-contain transition-all duration-300 group-hover:scale-105 drop-shadow-md cursor-pointer`}
        title="সফর - স্মার্ট ট্রান্সপোর্ট ও ইমার্জেন্সি সার্ভিস"
      />

      {showSubtitle && (
        <span className="text-[10px] text-emerald-100 font-bold mt-1 tracking-wider uppercase sm:hidden">
          সফর
        </span>
      )}
    </div>
  );
};
