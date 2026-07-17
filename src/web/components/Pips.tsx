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
  /** Overrides the default light/dark-adaptive dot color — needed for tiles whose background
   *  doesn't follow the theme (e.g. the Ivory seal's near-white face stays white in dark mode
   *  too, so its dots must stay dark instead of flipping to the usual dark-mode light dots). */
  dotColorClass?: string;
}

/** Small or large classic domino-pip grid (0-6 only; higher values render nothing). */
export default function Pips({ value, large, dotColorClass }: PipsProps) {
  const positions = LAYOUTS[value];
  if (!positions) return null;

  const sizeClass = large ? 'h-7 w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 gap-[2px] md:gap-[3px]' : 'h-6 w-6 gap-[2px]';
  const dotSize = large ? 'w-1.5 h-1.5 md:w-[7px] md:h-[7px] lg:w-2 lg:h-2 rounded-full' : 'w-[4.5px] h-[4.5px] rounded-full';

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
            ].join(' ')}
          />
        );
      })}
    </div>
  );
}
