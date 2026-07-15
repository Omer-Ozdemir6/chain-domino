interface OperatorTileProps {
  symbol: string;
  selected?: boolean;
  onClick?: () => void;
  animateIn?: boolean;
  /** Already committed to score in a previous turn — shown muted, distinct from this turn's live risk. */
  frozen?: boolean;
  highlighted?: boolean;
  /** Small round badge sitting directly on the seam between two touching dominoes, instead of a full tile-sized box. */
  compact?: boolean;
}

export default function OperatorTile({ symbol, selected, onClick, animateIn, frozen, highlighted, compact }: OperatorTileProps) {
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        compact
          ? 'flex h-9 w-9 items-center justify-center rounded-full border-2 bg-amber-50 text-base font-bold text-amber-700 shadow-md transition shrink-0'
          : 'flex h-18 w-18 items-center justify-center rounded-lg border-2 bg-amber-50 text-3xl font-bold text-amber-700 shadow-sm transition shrink-0',
        'dark:bg-amber-900/30 dark:text-amber-300',
        clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default',
        highlighted
          ? 'border-emerald-400 ring-4 ring-emerald-500 scale-105 z-50 shadow-[0_0_15px_5px_rgba(16,185,129,0.7)]'
          : selected
            ? 'border-sky-500 ring-2 ring-sky-400'
            : frozen
              ? 'border-amber-300 dark:border-amber-700'
              : 'border-amber-400 shadow-[0_0_10px_2px_rgba(251,191,36,0.45)] dark:border-amber-500 dark:shadow-[0_0_12px_3px_rgba(251,191,36,0.35)]',
        frozen && !highlighted ? 'opacity-60 saturate-50' : '',
        animateIn ? 'animate-chain-place' : '',
      ].join(' ')}
    >
      {symbol}
    </button>
  );
}
