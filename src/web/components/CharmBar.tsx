import type { CharmDef, CharmRarity } from '../../models/Charm.js';
import InfoTooltip from './InfoTooltip.js';
import { CHARM_ICON_MAP } from './charmIconMap.js';

const RARITY_CARD_CLASS: Record<CharmRarity, string> = {
  COMMON: 'border-stone-400 bg-stone-50/95 text-stone-800 dark:border-stone-600 dark:bg-stone-900/90 dark:text-stone-200 shadow-sm',
  UNCOMMON: 'border-teal-600 bg-teal-50/95 text-teal-900 shadow-md dark:border-teal-500 dark:bg-teal-950/80 dark:text-teal-100',
  RARE: 'border-red-800 bg-red-50/95 text-red-950 shadow-md dark:border-red-700 dark:bg-red-950/80 dark:text-red-100',
  LEGENDARY: 'border-amber-500 bg-amber-50/95 text-amber-900 shadow-[0_0_10px_rgba(217,119,6,0.35)] dark:border-amber-400 dark:bg-amber-950/80 dark:text-amber-100 animate-shine',
};

const CURSE_CARD_CLASS =
  'border-rose-800 bg-rose-50/95 text-rose-950 shadow-md dark:border-rose-700 dark:bg-rose-950/80 dark:text-rose-100';

const GEM_CLASS: Record<CharmRarity, string> = {
  COMMON: 'bg-stone-500 shadow-[0_0_8px_#78716c]',
  UNCOMMON: 'bg-teal-400 shadow-[0_0_8px_#2dd4bf]',
  RARE: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
  LEGENDARY: 'bg-amber-400 shadow-[0_0_10px_#fbbf24] animate-pulse',
};
const CURSE_GEM = 'bg-fuchsia-500 shadow-[0_0_10px_#d946ef] animate-pulse';

const RARITY_ENTRANCE: Record<CharmRarity, string> = {
  COMMON: 'animate-charm-in-common',
  UNCOMMON: 'animate-charm-in-uncommon',
  RARE: 'animate-charm-in-rare',
  LEGENDARY: 'animate-charm-in-legendary',
};

const RARITY_LABEL_COLOR: Record<CharmRarity, string> = {
  COMMON: 'text-stone-400 dark:text-stone-500',
  UNCOMMON: 'text-teal-600 dark:text-teal-400',
  RARE: 'text-red-700 dark:text-red-400',
  LEGENDARY: 'text-amber-600 dark:text-amber-400',
};

const OP_GLYPH_COLOR: Record<string, string> = {
  add: 'text-emerald-600 dark:text-emerald-400',
  subtract: 'text-rose-600 dark:text-rose-400',
};

function categoryGlyphPath(category: string): React.ReactNode {
  switch (category) {
    case 'even':
      return <><circle cx="8" cy="12" r="4.5" /><circle cx="16" cy="12" r="4.5" /></>;
    case 'odd':
      return <path d="M12 3 L20 12 L12 21 L4 12 Z" />;
    case 'high_value':
      return <path d="M12 3 L20 15 L4 15 Z M12 15 L12 21" />;
    case 'low_value':
      return <path d="M12 21 L20 9 L4 9 Z M12 9 L12 3" />;
    case 'expert':
      return <path d="M12 2.5 L14.7 9 L21.5 9.4 L16.2 13.8 L18 20.5 L12 16.7 L6 20.5 L7.8 13.8 L2.5 9.4 L9.3 9 Z" />;
    case 'streak':
      return <><ellipse cx="7" cy="9" rx="4" ry="3" transform="rotate(-25 7 9)" /><ellipse cx="16" cy="15" rx="4" ry="3" transform="rotate(-25 16 15)" /></>;
    default:
      return <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.4" /></>;
  }
}

const SPECIAL_GLYPHS: Record<string, { path: React.ReactNode; colorClass: string }> = {
  cosmic_pendulum: {
    colorClass: 'text-indigo-500 dark:text-indigo-400',
    path: <><circle cx="12" cy="5" r="2" /><path d="M12 7 L12 15" /><circle cx="12" cy="18" r="3.5" /><path d="M12 18 L12 18" strokeWidth="3" /></>,
  },
  heart_matryoshka: {
    colorClass: 'text-rose-500 dark:text-rose-400',
    path: <><path d="M12 20 C6 15 3 11 3 7.5 A4 4 0 0 1 12 6 A4 4 0 0 1 21 7.5 C21 11 18 15 12 20 Z" /><path d="M12 15.5 C9 13 7.5 11 7.5 8.8 A2.3 2.3 0 0 1 12 8 A2.3 2.3 0 0 1 16.5 8.8 C16.5 11 15 13 12 15.5 Z" fill="currentColor" fillOpacity="0.35" /></>,
  },
  fusion_grand_resonance: {
    colorClass: 'text-amber-500 dark:text-amber-400',
    path: <path d="M13 2 L5 13 H11 L9 22 L19 9 H13 Z" fill="currentColor" stroke="none" />,
  },
  fusion_twin_oracle: {
    colorClass: 'text-violet-500 dark:text-violet-400',
    path: <><circle cx="12" cy="11" r="7" /><path d="M8 20 Q12 17 16 20" /><circle cx="12" cy="11" r="2.5" fill="currentColor" /></>,
  },
  fusion_lucky_ledger: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 8 H16 M8 12 H16 M8 16 H13" /></>,
  },
  fusion_resonant_chain: {
    colorClass: 'text-sky-500 dark:text-sky-400',
    path: <><rect x="3" y="8" width="8" height="8" rx="3.5" /><rect x="13" y="8" width="8" height="8" rx="3.5" /></>,
  },
  fusion_prism_eye: {
    colorClass: 'text-fuchsia-500 dark:text-fuchsia-400',
    path: <><path d="M2 12 C6 5 18 5 22 12 C18 19 6 19 2 12 Z" /><circle cx="12" cy="12" r="3.5" /></>,
  },
};

function genericCharmGlyph(id: string) {
  const special = SPECIAL_GLYPHS[id];
  if (special) {
    return (
      <svg className={`w-8 h-8 mx-auto ${special.colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {special.path}
      </svg>
    );
  }

  const op = ['add', 'subtract', 'multiply', 'divide'].find((o) => id.startsWith(`${o}_`));
  const category = op ? id.slice(op.length + 1).replace(/_lover$/, '') : '';
  const colorClass = op ? OP_GLYPH_COLOR[op] : 'text-stone-500 dark:text-stone-400';
  return (
    <svg className={`w-8 h-8 mx-auto ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {categoryGlyphPath(category)}
    </svg>
  );
}

export function renderCharmIcon(id: string) {
  const artwork = CHARM_ICON_MAP[id];
  if (artwork) {
    return <img src={artwork} alt="" className="w-10 h-10 object-contain mx-auto drop-shadow" />;
  }
  return genericCharmGlyph(id);
}

function CracksOverlay({ ratio }: { ratio: number }) {
  if (ratio > 0.75) return null;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-red-800/50 dark:stroke-red-400/40 fill-none z-20" viewBox="0 0 100 150">
      {/* Light cracks (ratio <= 0.75) */}
      <path d="M 12,25 L 22,35 L 18,52 M 88,28 L 73,42 L 78,63" strokeWidth="1" />
      
      {/* Medium cracks (ratio <= 0.50) */}
      {ratio <= 0.50 && (
        <path d="M 22,35 L 42,32 L 48,18 M 73,42 L 58,52 L 63,72 L 48,82" strokeWidth="1.2" strokeLinecap="round" />
      )}
      
      {/* Heavy cracks (ratio <= 0.25) */}
      {ratio <= 0.25 && (
        <path d="M 48,18 L 33,48 L 43,72 L 28,102 L 13,115 M 63,72 L 53,95 L 68,120 L 88,135 M 8,72 L 23,78 L 18,92" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

interface CharmBarProps {
  charms: CharmDef[];
  maxCharmSlots?: number;
  activeCharmId?: string | null;
  activeCharmPopupText?: string | null;
  layout?: 'vertical' | 'horizontal';
  /** Turda bir kez tıklanabilir (interactive) tılsımlar için: tıklandığında hedef taş bekleyen tılsımı bildirir. */
  onActivateCharm?: (charmId: string) => void;
  /** Şu an "hedef bekliyor" olarak işaretli (armed) tılsım — kendi tıklanabilir halkasını vurgular. */
  armedCharmId?: string | null;
  /** Bu tur zaten kullanılmış interactive tılsımlar — griye çevrilip tıklanamaz hale gelir. */
  activatedCharmIds?: readonly string[];
  charmDurability?: Record<string, number>;
}

export default function CharmBar({
  charms,
  maxCharmSlots = 5,
  activeCharmId = null,
  activeCharmPopupText = null,
  layout = 'horizontal',
  onActivateCharm,
  armedCharmId = null,
  activatedCharmIds = [],
  charmDurability = {},
}: CharmBarProps) {
  return (
    <div className="flex flex-col gap-2 relative z-30">
      {layout === 'horizontal' && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 font-pixel">
            Tılsımların ({charms.length}/{maxCharmSlots})
          </h2>
        </div>
      )}
      <div className={layout === 'vertical' 
        ? "flex flex-col gap-3 overflow-y-auto max-h-[52vh] pr-1 py-1 scrollbar-none" 
        : "flex flex-row flex-nowrap gap-1.5 md:gap-2 lg:gap-3 pb-10 md:pb-14 -mb-8 md:-mb-12 scrollbar-none relative z-30 overflow-visible"
      }>
        {Array.from({ length: maxCharmSlots }, (_, i) => {
          const charm = charms[i];

          if (!charm) {
            return (
              <div
                key={`empty-${i}`}
                className="relative flex flex-col items-center justify-center w-18 h-26 md:w-22 md:h-32 lg:w-28 lg:h-40 p-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 shrink-0"
              >
                <svg className="slot-silhouette w-9 h-11 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2.5" />
                  <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none" />
                  <path d="M12 12.5v3" />
                </svg>
              </div>
            );
          }

          const cardClass = charm.curse ? CURSE_CARD_CLASS : RARITY_CARD_CLASS[charm.rarity];
          const hasDurability = charm.perish && charmDurability[charm.id] !== undefined;
          
          const tooltipContent = (
            <div className="flex flex-col gap-1.5 p-1 select-none text-left leading-normal font-sans">
              <div className="flex items-center justify-between border-b border-amber-800/40 pb-1">
                <span className="font-bold text-xs text-amber-200">{charm.name}</span>
                <span className={`text-[8.5px] uppercase font-extrabold ${RARITY_LABEL_COLOR[charm.rarity]}`}>
                  {charm.curse ? 'LANETLİ' : charm.rarity}
                </span>
              </div>
              <p className="text-[10px] text-slate-200 leading-relaxed">
                {charm.description}
              </p>
              {hasDurability && (
                <div className="text-[9px] text-indigo-300 font-pixel font-bold mt-0.5 border-t border-amber-850/20 pt-1">
                  ⏳ Kalan Ömür: {charmDurability[charm.id]} / {charm.maxDurability} el
                </div>
              )}
              <div className="flex justify-between items-center text-[9px] text-amber-400/80 border-t border-amber-800/20 pt-1">
                <span>Satış Değeri: ${Math.round(charm.cost / 2)}</span>
                <span>Değer: ${charm.cost}</span>
              </div>
            </div>
          );

          const gemClass = charm.curse ? CURSE_GEM : GEM_CLASS[charm.rarity];
          const entranceClass = charm.curse ? 'animate-charm-in-rare' : RARITY_ENTRANCE[charm.rarity];
          const isScoringActive = activeCharmId === charm.id;
          const signatureGlow = isScoringActive && charm.signature
            ? charm.signature.visual === 'vortex' ? 'ring-4 ring-violet-400 shadow-[0_0_30px_rgba(167,139,250,0.9)]'
              : charm.signature.visual === 'gnaw' ? 'animate-bounce ring-4 ring-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.85)]'
              : charm.signature.visual === 'rewind' ? 'ring-4 ring-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.85)]'
              : 'ring-4 ring-slate-300 shadow-[0_0_25px_rgba(226,232,240,0.85)]' // 'smoke'
            : '';
          const isUsedUp = Boolean(charm.interactive) && activatedCharmIds.includes(charm.id);
          const isArmed = armedCharmId === charm.id;
          const isClickable = Boolean(charm.interactive) && !isUsedUp && Boolean(onActivateCharm);
          
          const durabilityVal = hasDurability ? charmDurability[charm.id] : 999;
          const durRatio = hasDurability ? durabilityVal / (charm.maxDurability ?? 4) : 1;
          const isUnstable = hasDurability && durabilityVal === 1;

          return (
            <InfoTooltip key={charm.id} text={tooltipContent} widthClass="w-56" side="right">
              <div
                onClick={isClickable ? () => onActivateCharm!(charm.id) : undefined}
                className={`balatro-card relative flex flex-col justify-between w-18 h-26 md:w-22 md:h-32 lg:w-28 lg:h-40 p-2.5 rounded-lg border-2 text-center transition select-none shrink-0 ${entranceClass} ${cardClass} ${isScoringActive ? `scale-110 -translate-y-3 z-30 animate-pulse ${signatureGlow || 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.9)]'}` : ''} ${isClickable ? 'cursor-pointer' : 'cursor-help'} ${isClickable && !isArmed ? 'ring-2 ring-violet-400/70 animate-pulse' : ''} ${isArmed ? 'scale-105 ring-4 ring-violet-400 shadow-[0_0_18px_rgba(167,139,250,0.8)]' : ''} ${isUsedUp ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${isUnstable ? 'animate-card-unstable' : ''}`}
                style={{ animationDelay: isScoringActive ? undefined : `${i * 110}ms` }}
              >
                {/* Visual cracks based on durability */}
                {hasDurability && <CracksOverlay ratio={durRatio} />}
                {/* Floating score text directly below the card on trigger (no container box, matching screenshot!) */}
                {isScoringActive && activeCharmPopupText && (
                  <div 
                    className={`absolute -bottom-12 left-1/2 transform -translate-x-1/2 pointer-events-none z-50 font-pixel text-2xl md:text-3xl font-black tracking-widest whitespace-nowrap animate-score-step-pop ${
                      activeCharmPopupText.toLowerCase().includes('mult') ? 'text-white' :
                      activeCharmPopupText.toLowerCase().includes('chip') ? 'text-[#00c2ff]' : 'text-amber-300'
                    }`}
                    style={{
                      textShadow: '-2.5px -2.5px 0 #000, 2.5px -2.5px 0 #000, -2.5px 2.5px 0 #000, 2.5px 2.5px 0 #000, 0 6px 10px rgba(0,0,0,0.95)'
                    }}
                  >
                    {activeCharmPopupText}
                  </div>
                )}

                {/* Durability Badge for Perishable Charms */}
                {hasDurability && (
                  <div 
                    className={`absolute top-2 left-2 z-10 px-1 py-0.5 rounded font-pixel text-[8px] font-bold text-white border flex items-center gap-0.5 shadow-md ${
                      charmDurability[charm.id] === 1 
                        ? 'bg-red-600 border-red-500 animate-pulse text-red-50' 
                        : 'bg-indigo-950/90 border-indigo-700/60 text-indigo-200'
                    }`}
                  >
                    <span>⏳</span>
                    <span>{charmDurability[charm.id]}</span>
                  </div>
                )}

                {/* Rarity Gem indicators in top corner (Balatro style) */}
                <div className={`absolute top-2.5 right-2.5 w-3 h-3 rounded-full border border-slate-950/40 z-10 ${gemClass}`} title={charm.curse ? 'Lanetli' : charm.rarity} />

                {/* Visual Icon Art — Massive Balatro Joker graphics, fills the card body */}
                <div className="flex-1 flex items-center justify-center transform scale-[1.5] md:scale-[1.8] lg:scale-[2.1] origin-center my-auto pointer-events-none">
                  {renderCharmIcon(charm.id)}
                </div>

                <div className="text-[9px] font-pixel font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded py-0.5 mt-0.5">${charm.cost}</div>
              </div>
            </InfoTooltip>
          );
        })}
      </div>
    </div>
  );
}
