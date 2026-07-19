interface DeckPileProps {
  remaining: number;
  total: number;
  /** 'compact' matches the small portrait-layout footprint; 'full' matches the desktop card-sized pile. */
  variant: 'compact' | 'full';
}

const FULL_LAYER_SIZE = ['w-18 h-26 md:w-22 md:h-32 lg:w-28 lg:h-40', 'text-2xl md:text-3xl'];
const COMPACT_LAYER_SIZE = ['w-6 h-9', 'text-xs'];

/**
 * A physical-feeling draw pile: the number of stacked tile-back layers scales with how much of
 * the deck is left (4 layers full, thinning down to a single card, then an empty dashed outline
 * once it's drained), instead of the remaining count only ever being legible as a bare number.
 */
export default function DeckPile({ remaining, total, variant }: DeckPileProps) {
  const fraction = total > 0 ? remaining / total : 0;
  const layers = remaining <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(fraction * 4)));
  const [boxSize, glyphSize] = variant === 'full' ? FULL_LAYER_SIZE : COMPACT_LAYER_SIZE;
  const offsetStep = variant === 'full' ? 3 : 1.5;

  if (layers === 0) {
    return (
      <div className={`relative ${boxSize}`}>
        <div className="absolute inset-0 rounded-lg border-2 border-dashed border-stone-700/60 bg-stone-950/30" />
      </div>
    );
  }

  return (
    <div className={`relative ${boxSize}`}>
      {Array.from({ length: layers }).map((_, i) => {
        const depth = layers - 1 - i; // 0 = frontmost (drawn last), deeper layers sit further back
        const isFront = depth === 0;
        return (
          <div
            key={i}
            className={`absolute inset-0 bg-red-800 rounded-lg border-2 border-red-700/80 shadow-[0_4px_6px_rgba(0,0,0,0.5)] flex items-center justify-center font-pixel text-stone-200 font-bold leading-none select-none ${
              isFront ? 'animate-pulse' : ''
            }`}
            style={{ transform: `translate(${depth * offsetStep}px, -${depth * offsetStep}px)` }}
          >
            {isFront && (
              <div className="absolute inset-1.5 border border-red-650/40 rounded flex items-center justify-center">
                <span className={`${glyphSize} opacity-40`}>🀲</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
