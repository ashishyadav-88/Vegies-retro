import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'light',
  size = 'md',
}) => {
  const isLight = variant === 'light';

  const sizeClasses = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', subtext: 'text-[9px]' },
    md: { icon: 'w-10 h-10', text: 'text-xl', subtext: 'text-[10px]' },
    lg: { icon: 'w-14 h-14', text: 'text-3xl', subtext: 'text-xs' },
  }[size];

  return (
    <a
      href="#home"
      id="brand-logo"
      className={`inline-flex items-center gap-3 group transition-transform duration-200 hover:scale-[1.02] ${className}`}
    >
      {/* Visual Logo Emblem */}
      <div
        className={`relative ${sizeClasses.icon} rounded-2xl flex items-center justify-center shadow-md shadow-emerald-900/10 transition-all duration-300 group-hover:shadow-emerald-600/25 ${
          isLight
            ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white'
            : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white'
        }`}
      >
        {/* Subtle decorative border ring */}
        <div className="absolute inset-0 rounded-2xl border border-amber-400/40 pointer-events-none" />

        {/* SVG Emblem: Stylized Leaf + Fork & Spoon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3/5 h-3/5 text-amber-300 drop-shadow-sm"
        >
          {/* Leaf outline */}
          <path
            d="M12 2C7 2 3 7 3 12c0 4 2.5 7.5 6.5 9 0-3 1.5-6 4.5-8 3-2 5-6 5-11-4.5 0-7 0-7 0z"
            fill="#10b981"
            fillOpacity="0.4"
            stroke="#fcd34d"
            strokeWidth="1.6"
          />
          {/* Center stem vein */}
          <path d="M7 16c2.5-3 5-5 10-6" stroke="#fef08a" strokeWidth="1.6" />
          {/* Sparkle dot */}
          <circle cx="18" cy="5" r="1.5" fill="#f59e0b" stroke="none" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-['Outfit',sans-serif] font-extrabold tracking-tight ${sizeClasses.text} ${
              isLight ? 'text-stone-900' : 'text-white'
            }`}
          >
            Vegies
          </span>
          <span className="font-['Outfit',sans-serif] font-bold text-amber-500 tracking-wide text-xs uppercase px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
            Restro
          </span>
        </div>
        <span
          className={`font-medium tracking-wider uppercase mt-1 ${sizeClasses.subtext} ${
            isLight ? 'text-emerald-700' : 'text-emerald-300'
          }`}
        >
          Delicious Food • Pure Taste
        </span>
      </div>
    </a>
  );
};
