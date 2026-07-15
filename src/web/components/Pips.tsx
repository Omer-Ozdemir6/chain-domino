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
}

/** Small or large glowing domino-pip grid (0-6 only; higher values render nothing). */
export default function Pips({ value, large }: PipsProps) {
  const positions = LAYOUTS[value];
  if (!positions) return null;

  const sizeClass = large ? 'h-10 w-10 gap-[3px]' : 'h-6 w-6 gap-[2px]';
  const dotSize = large ? 'w-2 h-2 rounded-full' : 'w-[4.5px] h-[4.5px] rounded-full';

  return (
    <div className={`grid grid-cols-3 grid-rows-3 ${sizeClass}`}>
      {Array.from({ length: 9 }, (_, i) => {
        const active = positions.some(([r, c]) => r * 3 + c === i);
        return (
          <span
            key={i}
            className={[
              active
                ? 'bg-sky-500 shadow-[0_0_6px_2px_rgba(56,189,248,0.95)] dark:bg-sky-400'
                : '',
              dotSize,
            ].join(' ')}
          />
        );
      })}
    </div>
  );
}
