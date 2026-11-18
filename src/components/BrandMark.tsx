import React from 'react';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-7 h-7 rounded-md',
  md: 'w-9 h-9 rounded-lg',
  lg: 'w-10 h-10 rounded-xl',
} as const;

/**
 * Custom architectural fintech emblem representing precision price steps
 * and disciplined risk balance within a crisp framed mark.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`${SIZE_MAP[size]} bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shrink-0 border border-slate-800/80 dark:border-blue-500/40 shadow-[0_1px_2px_rgba(15,23,42,0.14)] ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 17.5H19"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect x="5.5" y="12" width="2.75" height="3.5" rx="0.6" fill="currentColor" fillOpacity="0.72" />
        <rect x="10.625" y="8.5" width="2.75" height="7" rx="0.6" fill="currentColor" fillOpacity="0.88" />
        <rect x="15.75" y="5" width="2.75" height="10.5" rx="0.6" fill="#60A5FA" className="dark:fill-white" />
        <path
          d="M6.8 9.2L11.9 6.2L17.1 3.6"
          stroke="#93C5FD"
          className="dark:stroke-blue-100"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
