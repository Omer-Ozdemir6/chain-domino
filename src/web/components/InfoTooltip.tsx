import type { ReactNode } from 'react';

interface InfoTooltipProps {
  /** The element that triggers the tooltip on hover (a card, an icon, a label...). */
  children: ReactNode;
  /** Tooltip body content. */
  text: ReactNode;
  /** Where the bubble opens relative to its trigger. */
  side?: 'top' | 'bottom' | 'right' | 'left';
  /** Horizontal anchoring for top/bottom — use 'left'/'right' near a screen edge so the bubble can't get clipped. */
  align?: 'center' | 'left' | 'right';
  className?: string;
  widthClass?: string;
}

/** Theme-matching hover bubble (parchment/amber border, dark glass, fade+scale in) — replaces native `title` tooltips. */
export default function InfoTooltip({
  children,
  text,
  side = 'top',
  align = 'center',
  className,
  widthClass = 'w-48',
}: InfoTooltipProps) {
  let positionClass = '';

  if (side === 'top') {
    positionClass = `bottom-full mb-2.5 ${
      align === 'center' ? 'left-1/2 -translate-x-1/2' :
      align === 'left' ? 'left-0' : 'right-0'
    }`;
  } else if (side === 'bottom') {
    positionClass = `top-full mt-2.5 ${
      align === 'center' ? 'left-1/2 -translate-x-1/2' :
      align === 'left' ? 'left-0' : 'right-0'
    }`;
  } else if (side === 'right') {
    positionClass = 'left-full ml-3 top-1/2 -translate-y-1/2';
  } else if (side === 'left') {
    positionClass = 'right-full mr-3 top-1/2 -translate-y-1/2';
  }

  return (
    <div className={`group relative inline-block ${className ?? ''}`}>
      {children}
      <div
        className={`pointer-events-none absolute ${positionClass} ${widthClass} rounded-lg border-2 border-amber-700/60 bg-slate-950/95 px-3 py-2 text-[10.5px] leading-relaxed text-amber-100 shadow-[0_4px_12px_rgba(0,0,0,0.65)] opacity-0 scale-95 transition duration-150 group-hover:opacity-100 group-hover:scale-100 z-50`}
      >
        {text}
      </div>
    </div>
  );
}
