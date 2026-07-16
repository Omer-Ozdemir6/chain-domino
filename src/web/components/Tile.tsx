import Pips from './Pips.js';

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
  spellEffect?: 'GILD' | 'MAGNET' | null;
}

export default function Tile({ left, right, selected, onClick, animateIn, frozen, isDouble, vertical, isGolden, highlighted, spellEffect }: TileProps) {
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        'flex items-center rounded-lg border-2 bg-white font-mono text-lg font-semibold text-slate-800 shadow-sm transition shrink-0 relative',
        vertical ? 'flex-col' : 'flex-row',
        'dark:bg-slate-800 dark:text-slate-100',
        clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default',
        highlighted
          ? 'border-emerald-400 ring-4 ring-emerald-500 scale-105 z-50 shadow-[0_0_15px_5px_rgba(16,185,129,0.7)]'
          : selected
            ? 'border-teal-600 ring-2 ring-teal-500'
            : isGolden
              ? 'border-amber-400 shadow-[0_0_15px_3px_rgba(251,191,36,0.65)] ring-2 ring-amber-400 bg-amber-500/10'
              : isDouble
                ? 'border-red-700 shadow-[0_0_10px_2px_rgba(185,28,28,0.35)] dark:border-red-600'
                : 'border-slate-300 dark:border-slate-600',
        frozen && !highlighted ? 'opacity-60 saturate-50' : '',
        animateIn ? 'animate-chain-place' : '',
      ].join(' ')}
    >
      <span className="flex h-18 w-13 flex-col items-center justify-center gap-1">
        <span className="text-sm font-pixel font-bold leading-none text-slate-100">{left}</span>
        <Pips value={left} large />
      </span>
      <span
        className={[
          vertical ? 'h-px w-13' : 'h-13 w-px',
          isDouble ? 'bg-red-700 dark:bg-red-600' : 'bg-slate-300 dark:bg-slate-600',
        ].join(' ')}
      />
      <span className="flex h-18 w-13 flex-col items-center justify-center gap-1">
        <span className="text-sm font-pixel font-bold leading-none text-slate-100">{right}</span>
        <Pips value={right} large />
      </span>
      {spellEffect && (
        <div className={`absolute inset-0 z-50 pointer-events-none rounded-lg spell-particle-${spellEffect.toLowerCase()}`}>
          <span className={`absolute top-1/4 left-1/4 w-1.5 h-1.5 rounded-full ${spellEffect === 'GILD' ? 'bg-amber-350' : 'bg-sky-350'} animate-[spark-1_0.8s_ease-out_forwards]`} />
          <span className={`absolute top-1/4 right-1/4 w-1.5 h-1.5 rounded-full ${spellEffect === 'GILD' ? 'bg-amber-350' : 'bg-sky-350'} animate-[spark-2_0.8s_ease-out_forwards]`} />
          <span className={`absolute bottom-1/4 left-1/4 w-1.5 h-1.5 rounded-full ${spellEffect === 'GILD' ? 'bg-amber-350' : 'bg-sky-350'} animate-[spark-3_0.8s_ease-out_forwards]`} />
          <span className={`absolute bottom-1/4 right-1/4 w-1.5 h-1.5 rounded-full ${spellEffect === 'GILD' ? 'bg-amber-350' : 'bg-sky-350'} animate-[spark-4_0.8s_ease-out_forwards]`} />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-85 animate-[ping_0.6s_ease-out_infinite]" />
        </div>
      )}
    </button>
  );
}
