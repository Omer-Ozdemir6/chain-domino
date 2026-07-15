import type { CharmDef, CharmRarity } from '../../models/Charm.js';
import InfoTooltip from './InfoTooltip.js';

const RARITY_CARD_CLASS: Record<CharmRarity, string> = {
  COMMON: 'border-slate-400 bg-slate-50/95 text-slate-800 dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-200 shadow-sm',
  UNCOMMON: 'border-sky-400 bg-sky-50/95 text-sky-900 shadow-[0_0_12px_rgba(56,189,248,0.4)] dark:border-sky-500 dark:bg-sky-950/90 dark:text-sky-100',
  RARE: 'border-fuchsia-400 bg-fuchsia-50/95 text-fuchsia-900 shadow-[0_0_15px_rgba(217,70,239,0.5)] dark:border-fuchsia-500 dark:bg-fuchsia-950/90 dark:text-fuchsia-100',
  LEGENDARY: 'border-amber-400 bg-amber-50/95 text-amber-900 shadow-[0_0_18px_rgba(251,191,36,0.6)] dark:border-amber-400 dark:bg-amber-950/90 dark:text-amber-100 animate-shine',
};

const CURSE_CARD_CLASS =
  'border-rose-500 bg-rose-50/95 text-rose-950 shadow-[0_0_15px_rgba(244,63,94,0.5)] dark:border-rose-500 dark:bg-rose-950/90 dark:text-rose-100';

const RARITY_LABEL_COLOR: Record<CharmRarity, string> = {
  COMMON: 'text-slate-400 dark:text-slate-500',
  UNCOMMON: 'text-sky-500 dark:text-sky-400',
  RARE: 'text-fuchsia-500 dark:text-fuchsia-400',
  LEGENDARY: 'text-amber-500 dark:text-amber-400',
};

export function renderCharmIcon(id: string) {
  switch (id) {
    case 'division_master':
      return (
        <svg className="w-8 h-8 text-amber-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" className="stroke-amber-600/20" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <circle cx="12" cy="7" r="1.5" fill="currentColor" />
          <circle cx="12" cy="17" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'add_master':
      return (
        <svg className="w-8 h-8 text-emerald-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" className="stroke-emerald-600/20" />
          <line x1="12" y1="7" x2="12" y2="17" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
      );
    case 'subtract_master':
      return (
        <svg className="w-8 h-8 text-rose-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" className="stroke-rose-600/20" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
      );
    case 'multiplier_frenzy':
      return (
        <svg className="w-8 h-8 text-fuchsia-500 mx-auto animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" className="fill-fuchsia-500/20" />
        </svg>
      );
    case 'symmetry_bonus':
    case 'legendary_symmetry':
      return (
        <svg className="w-8 h-8 text-sky-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="6" width="7" height="12" rx="1.5" />
          <rect x="14" y="6" width="7" height="12" rx="1.5" />
          <line x1="12" y1="4" x2="12" y2="20" strokeDasharray="2 2" stroke="currentColor" className="opacity-45" />
          <circle cx="6.5" cy="12" r="1" fill="currentColor" />
          <circle cx="17.5" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case 'chain_end_interest':
      return (
        <svg className="w-8 h-8 text-emerald-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      );
    case 'loss_insurance':
      return (
        <svg className="w-8 h-8 text-rose-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" className="fill-rose-500/10" />
          <path d="M12 8v8M8 12h8" strokeWidth="2.5" />
        </svg>
      );
    case 'generous_trader':
      return (
        <svg className="w-8 h-8 text-yellow-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="16" r="3" />
          <circle cx="16" cy="16" r="3" />
          <circle cx="12" cy="10" r="3" fill="currentColor" className="fill-yellow-500/10" />
          <path d="M12 2v5" />
        </svg>
      );
    case 'early_finisher':
    case 'clutch_finisher':
      return (
        <svg className="w-8 h-8 text-indigo-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'double_hunter':
      return (
        <svg className="w-8 h-8 text-red-500 mx-auto animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" className="stroke-red-500/30" />
          <line x1="12" y1="1" x2="12" y2="23" />
          <line x1="1" y1="12" x2="23" y2="12" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    case 'twin_souls':
    case 'multiplier_resonance':
      return (
        <svg className="w-8 h-8 text-violet-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="8" cy="12" r="5" />
          <circle cx="16" cy="12" r="5" className="opacity-60" />
        </svg>
      );
    case 'gamblers_spirit':
    case 'mad_scholar':
    case 'sacrificial_heart':
    case 'loan_shark':
    case 'fragile_victory':
      return (
        <svg className="w-8 h-8 text-rose-600 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l9 16H3z" fill="currentColor" className="fill-rose-600/15" />
          <line x1="12" y1="9" x2="12" y2="14" />
          <circle cx="12" cy="17" r="0.8" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg className="w-8 h-8 text-slate-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );
  }
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
