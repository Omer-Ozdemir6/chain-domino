import Pips from './Pips.js';
import type { TileModifier } from '../../models/types.js';

interface TileProps {
  /** Value shown on the west side (or north, if `vertical`). */
  left: number;
  /** Value shown on the east side (or south, if `vertical`). */
  right: number;
  selected?: boolean;
  onClick?: () => void;
  animateIn?: boolean;
  /** Already committed to score in a previous turn — shown muted, distinct from this turn's live risk. */
  frozen?: boolean;
  /** A double (spinner) stone — can branch in up to 4 directions instead of 2. */
  isDouble?: boolean;
  /** Stack the two values top/bottom instead of side by side, for a north/south connection. */
  vertical?: boolean;
  isGolden?: boolean;
  highlighted?: boolean;
  spellEffect?: 'GILD' | 'MAGNET' | 'BLUE' | 'RED' | null;
  modifier?: TileModifier;
  leftConnected?: boolean;
  rightConnected?: boolean;
}

/** Returns Tailwind border/shadow/bg classes for a tile based on its modifier. */
function getModifierClasses(modifier?: TileModifier, isGolden?: boolean, isDouble?: boolean, selected?: boolean, highlighted?: boolean): string {
  if (highlighted) return 'border-emerald-400 ring-4 ring-emerald-500 scale-105 z-50 shadow-[0_0_15px_5px_rgba(16,185,129,0.7)]';
  if (selected) return 'border-teal-600 ring-2 ring-teal-500';

  switch (modifier) {
    case 'OBSIDIAN':
      return 'border-purple-600 shadow-[0_0_14px_3px_rgba(147,51,234,0.55)] ring-1 ring-purple-500 bg-slate-950/90 obsidian-tile';
    case 'IVORY':
      return 'border-stone-300 shadow-[0_0_12px_3px_rgba(245,245,244,0.6)] ring-1 ring-stone-200 bg-stone-50/90 ivory-tile';
    case 'AMBER':
      return 'border-amber-500 shadow-[0_0_14px_3px_rgba(245,158,11,0.55)] ring-1 ring-amber-400 bg-amber-950/30 amber-tile';
    default:
      if (isGolden) return 'border-amber-400 shadow-[0_0_15px_3px_rgba(251,191,36,0.65)] ring-2 ring-amber-400 bg-amber-500/10 golden-tile';
      if (isDouble) return 'border-red-700 shadow-[0_0_10px_2px_rgba(185,28,28,0.35)] dark:border-red-600';
      return 'border-slate-300 dark:border-slate-600';
  }
}

/** Returns a small label/indicator shown in the corner of the tile for non-NORMAL modifiers. */
function getModifierIndicator(modifier?: TileModifier, isGolden?: boolean): React.ReactNode {
  if (isGolden && (!modifier || modifier === 'NORMAL')) {
    return <span className="absolute top-0.5 right-0.5 text-[5px] font-pixel text-amber-400 leading-none font-bold">✦</span>;
  }
  switch (modifier) {
    case 'OBSIDIAN':
      return <span className="absolute top-0.5 right-0.5 text-[5px] font-pixel text-purple-400 leading-none font-bold">◆</span>;
    case 'IVORY':
      return <span className="absolute top-0.5 right-0.5 text-[5px] font-pixel text-stone-500 leading-none font-bold">◇</span>;
    case 'AMBER':
      return <span className="absolute top-0.5 right-0.5 text-[5px] font-pixel text-amber-400 leading-none font-bold">⬡</span>;
    default:
      return null;
  }
}

export default function Tile({
  left,
  right,
  selected,
  onClick,
  animateIn,
  frozen,
  isDouble,
  vertical,
  isGolden,
  highlighted,
  spellEffect,
  modifier,
  leftConnected = false,
  rightConnected = false,
}: TileProps) {
  const clickable = Boolean(onClick);
  const modifierClasses = getModifierClasses(modifier, isGolden, isDouble, selected, highlighted);
  const modifierIndicator = getModifierIndicator(modifier, isGolden);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        'flex items-center rounded-lg border-2 bg-white font-mono text-sm md:text-base lg:text-lg font-semibold text-slate-800 shadow-[0_3px_0_rgba(0,0,0,0.15),0_8px_14px_rgba(0,0,0,0.4)] transition shrink-0 relative overflow-hidden',
        vertical ? 'flex-col' : 'flex-row',
        'dark:bg-slate-800 dark:text-slate-100',
        clickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_5px_0_rgba(0,0,0,0.2),0_14px_20px_rgba(0,0,0,0.5)]' : 'cursor-default',
        modifierClasses,
        frozen && !highlighted ? 'opacity-60 saturate-50' : '',
        animateIn ? 'animate-chain-place' : '',
      ].join(' ')}
    >
      {modifierIndicator}
      {modifier === 'OBSIDIAN' && <div className="obsidian-cracks" />}
      {modifier === 'IVORY' && <div className="ivory-runes" />}
      <span className={`flex h-14 w-10 md:h-16 md:w-11 lg:h-18 lg:w-13 flex-col items-center justify-center gap-0.5 md:gap-1 transition-colors ${leftConnected ? 'bg-amber-500/10' : ''}`}>
        <span className={`text-xs md:text-sm lg:text-base font-pixel font-bold leading-none ${leftConnected ? 'text-amber-300 animate-pulse drop-shadow-[0_0_6px_#fbbf24]' : 'text-slate-100'}`}>{left}</span>
        <div className={leftConnected ? 'animate-pulse drop-shadow-[0_0_8px_#fbbf24] saturate-200' : ''}>
          <Pips value={left} large />
        </div>
      </span>
      <span
        className={[
          vertical ? 'h-px w-10 md:w-11 lg:w-13' : 'h-10 md:h-11 lg:h-13 w-px',
          isDouble ? 'bg-red-700 dark:bg-red-600' : 'bg-slate-300 dark:bg-slate-600',
        ].join(' ')}
      />
      <span className={`flex h-14 w-10 md:h-16 md:w-11 lg:h-18 lg:w-13 flex-col items-center justify-center gap-0.5 md:gap-1 transition-colors ${rightConnected ? 'bg-amber-500/10' : ''}`}>
        <span className={`text-xs md:text-sm lg:text-base font-pixel font-bold leading-none ${rightConnected ? 'text-amber-300 animate-pulse drop-shadow-[0_0_6px_#fbbf24]' : 'text-slate-100'}`}>{right}</span>
        <div className={rightConnected ? 'animate-pulse drop-shadow-[0_0_8px_#fbbf24] saturate-200' : ''}>
          <Pips value={right} large />
        </div>
      </span>
      {spellEffect && (
        <div className={`absolute inset-0 z-50 pointer-events-none rounded-lg spell-particle-${spellEffect.toLowerCase()}`}>
          <span className={`absolute top-1/4 left-1/4 w-1.5 h-1.5 rounded-full ${spellEffect === 'GILD' ? 'bg-amber-350' : spellEffect === 'RED' ? 'bg-purple-400' : 'bg-sky-350'} animate-[spark-1_0.8s_ease-out_forwards]`} />
          <span className={`absolute top-1/4 right-1/4 w-1.5 h-1.5 rounded-full ${spellEffect === 'GILD' ? 'bg-amber-350' : spellEffect === 'RED' ? 'bg-purple-400' : 'bg-sky-350'} animate-[spark-2_0.8s_ease-out_forwards]`} />
          <span className={`absolute bottom-1/4 left-1/4 w-1.5 h-1.5 rounded-full ${spellEffect === 'GILD' ? 'bg-amber-350' : spellEffect === 'RED' ? 'bg-purple-400' : 'bg-sky-350'} animate-[spark-3_0.8s_ease-out_forwards]`} />
          <span className={`absolute bottom-1/4 right-1/4 w-1.5 h-1.5 rounded-full ${spellEffect === 'GILD' ? 'bg-amber-350' : spellEffect === 'RED' ? 'bg-purple-400' : 'bg-sky-350'} animate-[spark-4_0.8s_ease-out_forwards]`} />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-85 animate-[ping_0.6s_ease-out_infinite]" />
        </div>
      )}
    </button>
  );
}
