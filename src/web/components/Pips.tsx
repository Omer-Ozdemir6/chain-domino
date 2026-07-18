const LAYOUTS: Record<number, Array<[number, number]>> = {
  0: [],
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
};

interface PipsProps {
  value: number;
  large?: boolean;
  /** Bigger than `large` still — the hand-sized tile variant, scaled up to match a charm card's
   *  visual weight. */
  xl?: boolean;
  /** Overrides the default light/dark-adaptive dot color — needed for tiles whose background
   *  doesn't follow the theme (e.g. the Ivory seal's near-white face stays white in dark mode
   *  too, so its dots must stay dark instead of flipping to the usual dark-mode light dots). */
  dotColorClass?: string;
  /** True for the one tile currently being tallied during the stone-by-stone scoring reveal —
   *  each dot briefly blooms into a glowing 5-point star instead of staying a plain circle. */
  sparkle?: boolean;
}

/** Small, large, or xl classic domino-pip grid (0-6 only; higher values render nothing). */
export default function Pips({ value, large, xl, dotColorClass, sparkle }: PipsProps) {
  const positions = LAYOUTS[value];
  if (!positions) return null;

  const sizeClass = xl
    ? 'h-9 w-9 md:h-11 md:w-11 lg:h-13 lg:w-13 gap-[3px] md:gap-1'
    : large ? 'h-7 w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 gap-[2px] md:gap-[3px]' : 'h-6 w-6 gap-[2px]';
  const dotSize = xl
    ? 'w-2 h-2 md:w-2.5 md:h-2.5 lg:w-3 lg:h-3 rounded-full'
    : large ? 'w-1.5 h-1.5 md:w-[7px] md:h-[7px] lg:w-2 lg:h-2 rounded-full' : 'w-[4.5px] h-[4.5px] rounded-full';

  return (
    <div className={`grid grid-cols-3 grid-rows-3 ${sizeClass}`}>
      {Array.from({ length: 9 }, (_, i) => {
        const active = positions.some(([r, c]) => r * 3 + c === i);
        return (
          <span
            key={i}
            className={[
              active ? (dotColorClass ?? 'bg-slate-800 dark:bg-slate-100') : '',
              dotSize,
              active && sparkle ? 'animate-pip-to-star' : '',
            ].join(' ')}
            style={active && sparkle ? { animationDelay: `${i * 35}ms` } : undefined}
          />
        );
      })}
    </div>
  );
}
