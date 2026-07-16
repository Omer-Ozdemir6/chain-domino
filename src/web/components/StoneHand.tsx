import type { DominoStone } from '../../models/types.js';
import Tile from './Tile.js';

interface StoneHandProps {
  stones: DominoStone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  spellEffect?: { id: string; type: 'GILD' | 'MAGNET' | 'BREAKER' | 'BLUE' | 'RED' | 'GOLDEN' } | null;
  /** When a rune spell is active, highlight all stones as clickable targets. */
  isSpellTargeting?: boolean;
}

export default function StoneHand({ stones, selectedId, onSelect, spellEffect, isSpellTargeting }: StoneHandProps) {
  return (
    <div>
      <h2 className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Taşlar</h2>
      <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1 scrollbar-none items-end">
        {stones.length === 0 && <span className="text-[10px] text-slate-450 italic">(yok)</span>}
        {stones.map((s, index) => {
          let tileSpellEffect: 'GILD' | 'MAGNET' | 'BLUE' | 'RED' | null = null;
          if (spellEffect?.id === s.id) {
            if (spellEffect.type === 'GILD') tileSpellEffect = 'GILD';
            else if (spellEffect.type === 'BLUE') tileSpellEffect = 'BLUE';
            else if (spellEffect.type === 'RED') tileSpellEffect = 'RED';
          }

          // A gentle hand-of-cards fan: alternating tilt/lift around the center card.
          const mid = (stones.length - 1) / 2;
          const offset = index - mid;
          const rotate = Math.max(-6, Math.min(6, offset * 3));
          const lift = Math.abs(offset) * 2;

          return (
            <div
              key={s.id}
              className={[
                'animate-card-deal shrink-0 relative transition-transform duration-150 hover:-translate-y-2 hover:z-20',
                isSpellTargeting ? 'ring-2 ring-violet-400/70 rounded-lg cursor-pointer' : '',
              ].join(' ')}
              style={{
                animationDelay: `${index * 80}ms`,
                transform: `rotate(${rotate}deg) translateY(${lift}px)`,
              }}
            >
              <Tile
                left={s.leftVal}
                right={s.rightVal}
                selected={selectedId === s.id}
                onClick={() => onSelect(s.id)}
                isGolden={s.isGolden}
                modifier={s.modifier}
                spellEffect={tileSpellEffect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
