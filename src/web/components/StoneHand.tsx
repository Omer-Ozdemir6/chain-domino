import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  // The hand row scrolls horizontally (overflow-x-auto), which per the CSS overflow spec forces
  // its vertical overflow to clip too — a stone lifted on selection (and its info tooltip above
  // it) would get cut off mid-rise instead of rising freely. Portaling the tooltip straight to
  // <body>, positioned from the selected tile's own measured rect, escapes that clipping entirely
  // instead of trying to out-guess it with padding.
  const [selectedRect, setSelectedRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const selectedTileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedTileRef.current) {
      const r = selectedTileRef.current.getBoundingClientRect();
      setSelectedRect({ left: r.left, top: r.top, width: r.width });
    } else {
      setSelectedRect(null);
    }
  }, [selectedId]);

  return (
    <div>
      <h2 className="text-[8px] md:text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-0.5 md:mb-1">Taşlar</h2>
      <div className="h-28 md:h-32 lg:h-36 flex flex-nowrap overflow-x-auto gap-1 md:gap-1.5 lg:gap-2 pt-12 pb-1 scrollbar-none items-end">
        {stones.length === 0 && (
          <div className="h-14 w-20 md:h-16 md:w-24 lg:h-18 lg:w-28 rounded-lg border border-dashed border-slate-700/60 flex flex-col items-center justify-center gap-0.5 text-slate-600 select-none">
            <span className="text-base opacity-40">🕯️</span>
            <span className="text-[8px] uppercase tracking-widest font-bold opacity-60">Deste Tükendi</span>
          </div>
        )}
        {stones.map((s, index) => {
          let tileSpellEffect: 'GILD' | 'MAGNET' | 'BLUE' | 'RED' | null = null;
          if (spellEffect?.id === s.id) {
            if (spellEffect.type === 'GILD') tileSpellEffect = 'GILD';
            else if (spellEffect.type === 'BLUE') tileSpellEffect = 'BLUE';
            else if (spellEffect.type === 'RED') tileSpellEffect = 'RED';
          }

          // Deal from right stagger. If gathering, stagger flyback delay to deck box.
          const dealDelay = isGathering ? undefined : `${index * 130}ms`;
          const gatherDelay = isGathering ? `${index * 60}ms` : undefined;
          const animationClass = isGathering ? 'animate-gather-hand' : 'animate-card-deal';
          const activationClass = activationEffect?.stoneId === s.id
            ? activationEffect.kind === 'SPLIT' ? 'animate-charm-crack' : 'animate-charm-mirror-flip'
            : '';
          const isSelected = selectedId === s.id;
          const selectedClass = isSelected 
            ? '-translate-y-8 z-30 scale-105 shadow-[0_15px_30px_rgba(0,0,0,0.3)] animate-levitate' 
            : 'hover:-translate-y-2 hover:z-20';

          const hasInfo = Boolean(s.isGolden || s.modifier || s.leftUpgrade || s.rightUpgrade);

          return (
            <div
              key={s.id}
              ref={isSelected ? selectedTileRef : undefined}
              className={[
                animationClass,
                activationClass,
                'shrink-0 relative transition-all duration-200',
                selectedClass,
                isSpellTargeting || isCharmTargeting ? 'ring-2 ring-violet-400/70 rounded-lg cursor-pointer' : '',
              ].join(' ')}
              style={{
                animationDelay: isGathering ? gatherDelay : dealDelay,
                animationFillMode: isGathering ? 'forwards' : undefined,
              }}
            >
              {isSelected && hasInfo && selectedRect && createPortal(
                <div
                  className="fixed w-48 bg-slate-950/95 border-2 border-cyan-500/80 rounded-xl p-2.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] text-[9px] leading-relaxed text-slate-100 z-[9999] animate-fade-in text-center select-none font-sans pointer-events-none"
                  style={{ left: selectedRect.left + selectedRect.width / 2, top: selectedRect.top - 10, transform: 'translate(-50%, -100%)' }}
                >
                  <div className="font-pixel text-[10px] text-cyan-400 font-bold mb-1 tracking-wider border-b border-cyan-900/40 pb-0.5">TAŞ ÖZELLİKLERİ</div>
                  <div className="flex flex-col gap-1 text-left">
                    {s.isGolden && <div className="text-amber-300 font-semibold">• Altın Taş (Oynandığında +$3)</div>}
                    {s.modifier === 'IVORY' && <div className="text-slate-200 font-semibold">• Fildişi Rünü (+15 Taban Puan)</div>}
                    {s.modifier === 'OBSIDIAN' && <div className="text-purple-400 font-semibold">• Obsidyen Rünü (Çarpan x2, %25 Kırılma)</div>}
                    {s.modifier === 'AMBER' && <div className="text-amber-500 font-semibold">• Kehribar Rünü (Komşuları eşitler)</div>}
                    {((s.leftUpgrade && s.leftUpgrade > 0) || (s.rightUpgrade && s.rightUpgrade > 0)) && (
                      <div className="text-cyan-400 font-semibold">
                        • Geliştirilmiş (+{(s.leftUpgrade || 0) + (s.rightUpgrade || 0)} Nokta)
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
              <Tile
                left={s.leftVal}
                right={s.rightVal}
                leftUpgrade={s.leftUpgrade}
                rightUpgrade={s.rightUpgrade}
                selected={isSelected}
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
