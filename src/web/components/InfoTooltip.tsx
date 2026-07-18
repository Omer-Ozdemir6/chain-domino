import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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

/** Theme-matching hover bubble (parchment/amber border, dark glass, fade+scale in) — replaces
 *  native `title` tooltips. Portaled to <body> and positioned from the trigger's own measured
 *  rect (not CSS-relative absolute positioning), so it always renders on top of and never gets
 *  clipped or occluded by neighboring cards. Opens on hover (desktop) AND tap (mobile, which has
 *  no hover) — a tap "pins" it open until the next tap anywhere else on the page. */
export default function InfoTooltip({
  children,
  text,
  side = 'top',
  align = 'center',
  className,
  widthClass = 'w-48',
}: InfoTooltipProps) {
  const [rect, setRect] = useState<{ top: number; left: number; right: number; bottom: number; width: number; height: number } | null>(null);
  const pinnedRef = useRef(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  function measure() {
    const el = triggerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const next = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    setRect(next);
    return next;
  }

  useEffect(() => {
    if (!rect) return;
    function handleOutside(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        pinnedRef.current = false;
        setRect(null);
      }
    }
    document.addEventListener('click', handleOutside, true);
    return () => document.removeEventListener('click', handleOutside, true);
  }, [rect]);

  const GAP = 12;
  let style: React.CSSProperties = {};
  let originClass = '';
  if (rect) {
    if (side === 'right') {
      style = { left: rect.right + GAP, top: rect.top + rect.height / 2, transform: 'translateY(-50%)' };
      originClass = 'origin-left';
    } else if (side === 'left') {
      style = { left: rect.left - GAP, top: rect.top + rect.height / 2, transform: 'translate(-100%, -50%)' };
      originClass = 'origin-right';
    } else if (side === 'top') {
      const alignStyle =
        align === 'center' ? { left: rect.left + rect.width / 2, transform: 'translate(-50%, -100%)' } :
        align === 'left' ? { left: rect.left, transform: 'translateY(-100%)' } :
        { left: rect.right, transform: 'translate(-100%, -100%)' };
      style = { top: rect.top - GAP, ...alignStyle };
      originClass = 'origin-bottom';
    } else {
      const alignStyle =
        align === 'center' ? { left: rect.left + rect.width / 2, transform: 'translateX(-50%)' } :
        align === 'left' ? { left: rect.left } :
        { left: rect.right, transform: 'translateX(-100%)' };
      style = { top: rect.bottom + GAP, ...alignStyle };
      originClass = 'origin-top';
    }
  }

  return (
    <div
      ref={triggerRef}
      className={`inline-block ${className ?? ''}`}
      onMouseEnter={measure}
      onMouseLeave={() => { if (!pinnedRef.current) setRect(null); }}
      onClick={() => {
        // A tap pins the tooltip open (mobile has no hover) — tapping the trigger again, or
        // anywhere else on the page, closes it. Doesn't interfere with the child's own onClick
        // (e.g. arming an interactive charm) — both fire together.
        if (pinnedRef.current) {
          pinnedRef.current = false;
          setRect(null);
        } else {
          pinnedRef.current = true;
          measure();
        }
      }}
    >
      {children}
      {rect && createPortal(
        <div
          className={`fixed pointer-events-none ${widthClass} rounded-lg border-2 border-amber-700/60 bg-stone-950/95 px-3 py-2 text-[10.5px] leading-relaxed text-amber-100 shadow-[0_4px_12px_rgba(0,0,0,0.65)] z-[9999] animate-fade-in ${originClass}`}
          style={style}
        >
          {text}
        </div>,
        document.body
      )}
    </div>
  );
}
