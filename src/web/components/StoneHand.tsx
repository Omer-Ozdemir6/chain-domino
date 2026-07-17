import type { DominoStone } from '../../models/types.js';
import Tile from './Tile.js';

interface StoneHandProps {
  stones: DominoStone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  spellEffect?: { id: string; type: 'GILD' | 'MAGNET' | 'BREAKER' | 'BLUE' | 'RED' | 'GOLDEN' } | null;
  isSpellTargeting?: boolean;
  isGathering?: boolean;
  /** A tılsım is armed (Küratörün Çekici / Simyacı Aynası) and waiting for a hand stone to click. */
  isCharmTargeting?: boolean;
  /** The stone just clicked to activate an interactive charm — plays a crack/flip animation. */
  activationEffect?: { stoneId: string; kind: 'SPLIT' | 'SWAP' } | null;
}

export default function StoneHand({
  stones,
  selectedId,
  onSelect,
  spellEffect,
  isSpellTargeting,
  isGathering = false,
  isCharmTargeting,
  activationEffect,
}: StoneHandProps) {
  return (
    <div>
      <h2 className="text-[8px] md:text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-0.5 md:mb-1">Taşlar</h2>
      <div className="flex flex-nowrap overflow-x-auto gap-1 md:gap-1.5 lg:gap-2 pb-1 scrollbar-none items-end">
        {stones.length === 0 && <span className="text-[10px] text-slate-450 italic">(yok)</span>}
        {stones.map((s, index) => {
          let tileSpellEffect: 'GILD' | 'MAGNET' | 'BLUE' | 'RED' | null = null;
          if (spellEffect?.id === s.id) {
            if (spellEffect.type === 'GILD') tileSpellEffect = 'GILD';
            else if (spellEffect.type === 'BLUE') tileSpellEffect = 'BLUE';
            else if (spellEffect.type === 'RED') tileSpellEffect = 'RED';
          }

          // Deal from right stagger. If gathering, stagger flyback delay to deck box.
          const dealDelay = isGathering ? undefined : `${index * 80}ms`;
          const gatherDelay = isGathering ? `${index * 60}ms` : undefined;
          const animationClass = isGathering ? 'animate-gather-hand' : 'animate-card-deal';
          const activationClass = activationEffect?.stoneId === s.id
            ? activationEffect.kind === 'SPLIT' ? 'animate-charm-crack' : 'animate-charm-mirror-flip'
            : '';

          return (
            <div
              key={s.id}
              className={[
                animationClass,
                activationClass,
                'shrink-0 relative transition-transform duration-150 hover:-translate-y-2 hover:z-20',
                isSpellTargeting || isCharmTargeting ? 'ring-2 ring-violet-400/70 rounded-lg cursor-pointer' : '',
              ].join(' ')}
              style={{
                animationDelay: isGathering ? gatherDelay : dealDelay,
                animationFillMode: isGathering ? 'forwards' : undefined,
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
