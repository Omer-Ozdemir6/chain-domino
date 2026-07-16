import type { ReactNode } from 'react';

interface InfoTooltipProps {
  /** The element that triggers the tooltip on hover (a card, an icon, a label...). */
  children: ReactNode;
  /** Tooltip body content. */
  text: ReactNode;
  /** Where the bubble opens relative to its trigger. */
  side?: 'top' | 'bottom';
  /** Horizontal anchoring — use 'left'/'right' near a screen edge so the bubble can't get clipped. */
  align?: 'center' | 'left' | 'right';
  className?: string;
  widthClass?: string;
}

const ALIGN_CLASS: Record<NonNullable<InfoTooltipProps['align']>, string> = {
  center: 'left-1/2 -translate-x-1/2',
  left: 'left-0',
  right: 'right-0',
};

/** Theme-matching hover bubble (parchment/amber border, dark glass, fade+scale in) — replaces native `title` tooltips. */
export default function InfoTooltip({ children, text, side = 'top', align = 'center', className, widthClass = 'w-48' }: InfoTooltipProps) {
  const sideClass = side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  return (
    <span className={`group relative inline-flex ${className ?? ''}`}>
      {children}
      <span
        className={`pointer-events-none absolute ${ALIGN_CLASS[align]} ${sideClass} ${widthClass} rounded-lg border border-amber-700/50 bg-slate-950/95 px-2.5 py-1.5 text-[10px] leading-snug text-amber-100 shadow-md opacity-0 scale-95 transition duration-150 group-hover:opacity-100 group-hover:scale-100 z-50`}
      >
        {text}
      </span>
    </span>
  );
}
