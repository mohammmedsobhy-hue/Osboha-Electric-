import React from 'react';

interface BrandLogoProps {
  variant?: 'light' | 'dark'; // 'light' for light backgrounds, 'dark' for dark backgrounds
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitle?: string;
  iconOnly?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'dark',
  size = 'md',
  showSubtitle = true,
  subtitle = 'إدارة المشاريع والمالية والأرباح',
  iconOnly = false,
  className = '',
}) => {
  // Dimensions based on size
  const iconDimensions = {
    sm: { box: 'w-8 h-8', svg: 'w-5 h-5', text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-10 h-10', svg: 'w-6 h-6', text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-14 h-14', svg: 'w-8 h-8', text: 'text-xl', sub: 'text-xs' },
  }[size];

  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Electrical Icon Emblem */}
      <div
        className={`relative ${iconDimensions.box} rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-sm ${
          isDark
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-cyan-500/40 shadow-cyan-950/40 ring-1 ring-cyan-500/20'
            : 'bg-gradient-to-br from-slate-900 to-cyan-950 border border-cyan-600/30 shadow-slate-300'
        }`}
      >
        {/* Ambient Power Glow behind bolt */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-amber-500/20 via-transparent to-cyan-400/20 pointer-events-none" />

        {/* Scalable High-Voltage Electric Circuit & Bolt SVG */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${iconDimensions.svg} relative z-10`}
        >
          <defs>
            <linearGradient id="oeBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="55%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            <linearGradient id="oeCircuitGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>

          {/* Electric Circuit Nodes & Power Grid lines */}
          <circle cx="6" cy="6" r="1.5" fill="#38BDF8" opacity="0.8" />
          <circle cx="26" cy="6" r="1.5" fill="#F59E0B" opacity="0.8" />
          <circle cx="6" cy="26" r="1.5" fill="#0284C7" opacity="0.8" />
          <circle cx="26" cy="26" r="1.5" fill="#38BDF8" opacity="0.8" />

          <path
            d="M6 6 L12 6 M20 6 L26 6 M6 26 L12 26 M20 26 L26 26"
            stroke="url(#oeCircuitGrad)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* Dynamic Lightning Bolt */}
          <path
            d="M17 3 L8 17 L15 17 L13 29 L24 14 L17 14 Z"
            fill="url(#oeBoltGrad)"
          />
          <path
            d="M17 3 L8 17 L15 17 L13 29 L24 14 L17 14 Z"
            stroke="#FFFFFF"
            strokeWidth="0.6"
            strokeLinejoin="round"
            strokeOpacity="0.75"
          />
        </svg>

        {/* Small energy badge indicator */}
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-slate-900 animate-pulse" />
      </div>

      {/* Brand Typography */}
      {!iconOnly && (
        <div className="flex flex-col text-right">
          <div className="flex items-center gap-1.5 leading-none" dir="ltr">
            <span
              className={`font-black tracking-tight ${iconDimensions.text} font-sans ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}
            >
              Osboha
            </span>
            <span
              className={`font-black tracking-tight ${iconDimensions.text} font-sans ${
                isDark
                  ? 'bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-amber-600 to-cyan-700 bg-clip-text text-transparent'
              }`}
            >
              Electric
            </span>
          </div>

          {showSubtitle && (
            <span
              className={`${iconDimensions.sub} font-medium mt-0.5 leading-tight ${
                isDark ? 'text-cyan-400/90' : 'text-slate-500'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
