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
    sm: { box: 'w-11 h-11', text: 'text-xs' },
    md: { box: 'w-14 h-14 sm:w-16 sm:h-16', text: 'text-sm' },
    lg: { box: 'w-20 h-20 sm:w-24 sm:h-24', text: 'text-base' },
    xl: { box: 'w-28 h-28 sm:w-32 sm:h-32', text: 'text-xl' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex flex-col items-center select-none group ${className}`}>
      {/* 
        Safar Logo Emblem:
        - Minimal internal border padding (p-0.5 to p-1) for maximum glyph space
        - Accurate Bengali letter 'দন্ত্য-স' (স) stylized as a highway with center road dashes
        - Location Map Pin (📍) placed at the apex of 'স'
        - Bengali text 'সফর' large, bold, and crystal-clear below 'স'
      */}
      <div
        className={`${currentSize.box} rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 p-0.5 sm:p-1 shadow-md shadow-emerald-950/20 border-2 border-emerald-300 flex items-center justify-center transition-all duration-300 group-hover:scale-105 relative overflow-hidden`}
        title="সফর - স্মার্ট ট্রান্সপোর্ট ও ইমার্জেন্সি সার্ভিস"
      >
        {/* Soft glossy corner sheen */}
        <div className="absolute -top-6 -right-6 w-14 h-14 bg-white/20 rounded-full blur-sm pointer-events-none" />

        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-sm overflow-visible"
        >
          <defs>
            {/* Road gradient */}
            <linearGradient id="safarRoadPure" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>

            {/* Map Pin Gradient */}
            <linearGradient id="safarPinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff4d4f" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Depth Shadow */}
            <filter id="logoDepth" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#064e3b" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* ============================================================== */}
          {/* ACCURATE BENGALI LETTER 'দন্ত্য-স' (স) HIGHWAY ROAD EMBLEM        */}
          {/* ============================================================== */}
          <g filter="url(#logoDepth)">
            {/* 1. Main White Highway Road Structure of 'স' */}
            {/* Left curved belly & middle junction loop */}
            <path
              d="M 24,46 C 18,34 26,18 44,18 C 58,18 64,28 55,38 C 45,46 32,48 32,58 L 76,58"
              fill="none"
              stroke="url(#safarRoadPure)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right Vertical Stem (দাঁড়/মাত্রা) of 'স' */}
            <path
              d="M 76,17 L 76,62"
              fill="none"
              stroke="url(#safarRoadPure)"
              strokeWidth="9"
              strokeLinecap="round"
            />

            {/* 2. Emerald Green Center Road Dashes following the 'স' curves */}
            <path
              d="M 24,46 C 18,34 26,18 44,18 C 58,18 64,28 55,38 C 45,46 32,48 32,58 L 74,58"
              fill="none"
              stroke="#059669"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="3.5 2.5"
            />
            <path
              d="M 76,20 L 76,59"
              fill="none"
              stroke="#059669"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="3.5 2.5"
            />

            {/* 3. Suitable Map Pin (📍) at the Crest/Loop Apex of 'স' */}
            <g transform="translate(44, 12)">
              {/* Teardrop Location Marker Pin */}
              <path
                d="M 0,-11 C -6,-11 -10.5,-6.5 -10.5,-0.5 C -10.5,5.5 0,13 0,13 C 0,13 10.5,5.5 10.5,-0.5 C 10.5,-6.5 6,-11 0,-11 Z"
                fill="url(#safarPinGrad)"
                stroke="#ffffff"
                strokeWidth="1.8"
              />
              {/* Inner White Center Dot */}
              <circle cx="0" cy="-1.5" r="3.2" fill="#ffffff" />
            </g>

            {/* 4. Origin Vehicle Blue Pulse Pin */}
            <circle cx="24" cy="46" r="3.8" fill="#0284c7" stroke="#ffffff" strokeWidth="1.6" />
          </g>

          {/* ============================================================== */}
          {/* BENGALI 'সফর' TEXT - LARGER, BOLDER & PROMINENT DIRECTLY BELOW   */}
          {/* ============================================================== */}
          <text
            x="50"
            y="90"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="23.5"
            fontWeight="900"
            letterSpacing="1.2"
            style={{
              fontFamily: "'Hind Siliguri', 'Inter', system-ui, sans-serif",
              filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))'
            }}
          >
            সফর
          </text>
        </svg>
      </div>

      {showSubtitle && (
        <span className="text-[10px] text-emerald-100 font-bold mt-1 tracking-wider uppercase sm:hidden">
          সফর
        </span>
      )}
    </div>
  );
};
