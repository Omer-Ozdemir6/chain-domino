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

const RARITY_LABEL_COLOR: Record<CharmRarity, string> = {
  COMMON: 'text-stone-400 dark:text-stone-500',
  UNCOMMON: 'text-teal-600 dark:text-teal-400',
  RARE: 'text-red-700 dark:text-red-400',
  LEGENDARY: 'text-amber-600 dark:text-amber-400',
};

/** Generic engraved-seal glyph for charms without dedicated artwork (the per-operator generated variants). */
function genericCharmGlyph() {
  return (
    <svg className="w-8 h-8 text-stone-500 dark:text-stone-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function renderCharmIcon(id: string) {
  const artwork = CHARM_ICON_MAP[id];
  if (artwork) {
    return <img src={artwork} alt="" className="w-10 h-10 object-contain mx-auto drop-shadow" />;
  }
  return genericCharmGlyph();
}

interface CharmBarProps {
  charms: CharmDef[];
  maxCharmSlots?: number;
  highlightedCharmId?: string | null;
  charmPopupText?: string | null;
}

export default function CharmBar({ charms, maxCharmSlots = 5, highlightedCharmId, charmPopupText }: CharmBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Tılsımların ({charms.length}/{maxCharmSlots})
        </h2>
      </div>
      <div className="flex flex-row flex-nowrap overflow-x-auto gap-3 pb-2 scrollbar-none">
        {charms.map((charm) => {
          const isHighlighted = highlightedCharmId === charm.id;
          const cardClass = charm.curse ? CURSE_CARD_CLASS : RARITY_CARD_CLASS[charm.rarity];
          return (
            <InfoTooltip key={charm.id} text={charm.description} widthClass="w-56">
              <div
                className={`balatro-card relative cursor-help flex flex-col justify-between w-28 h-40 p-2 rounded-lg border-2 text-center transition select-none shrink-0 ${isHighlighted ? 'border-emerald-400 ring-4 ring-emerald-500 scale-105 z-50 shadow-[0_0_15px_5px_rgba(16,185,129,0.7)] animate-bounce' : cardClass}`}
              >
                {isHighlighted && charmPopupText && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-max max-w-44 bg-emerald-500 border border-emerald-300 text-white font-pixel text-xs px-2 py-1 rounded-lg shadow-lg z-50 text-center animate-pulse">
                    {charmPopupText}
                  </div>
                )}
                <div className={`flex items-center justify-center gap-1 text-[9px] uppercase font-bold ${RARITY_LABEL_COLOR[charm.rarity]}`}>
                  {charm.curse && <span title="Lanetli: iyi ve kötü etkisi birlikte gelir">⚠</span>}
                  {charm.rarity}
                </div>

                {/* Visual Icon Art */}
                <div className="my-0.5 flex items-center justify-center transform scale-75 origin-center">
                  {renderCharmIcon(charm.id)}
                </div>

                <div className="text-[11px] font-bold leading-tight">{charm.name}</div>
                {/* Description always visible (not hover-only) — hover-only info is invisible on touch devices. */}
                <p className="text-[9px] leading-snug opacity-80 line-clamp-3 flex-1">{charm.description}</p>
                <div className="text-[10px] font-pixel font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded py-0.5 mt-0.5">${charm.cost}</div>
              </div>
            </InfoTooltip>
          );
        })}
        {charms.length === 0 && (
          <div className="relative flex items-center justify-center w-full h-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <svg key={i} className="slot-silhouette w-7 h-9 text-slate-400 dark:text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2.5" />
                <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none" />
                <path d="M12 12.5v3" />
              </svg>
            ))}
            <span className="absolute text-xs text-slate-400 dark:text-slate-500 font-mono bg-slate-950/70 px-2 py-0.5 rounded">
              Henüz aktif tılsımın yok
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
