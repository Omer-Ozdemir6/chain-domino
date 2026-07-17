import type { CharmDef } from '../../models/Charm.js';
import type { ShopOffer, FusionRecipe, SkipTag } from '../../game/RunState.js';
import { FUSION_RECIPES } from '../../game/RunState.js';
import { CHARMS } from '../../models/CharmRegistry.js';
import { renderCharmIcon } from './CharmBar.js';
import { VOUCHER_ICON_MAP, CONSUMABLE_ICON_MAP } from './charmIconMap.js';
import InfoTooltip from './InfoTooltip.js';
import type { TileModifier } from '../../models/types.js';
import { useState } from 'react';

function renderBoosterIcon(id: string) {
  let color = 'from-blue-500 to-indigo-700';
  if (id === 'booster_obsidian') color = 'from-purple-800 to-slate-900 border-purple-600/50 shadow-[0_0_10px_rgba(147,51,234,0.4)]';
  else if (id === 'booster_ivory') color = 'from-slate-100 to-stone-300 border-stone-400';
  else if (id === 'booster_amber') color = 'from-amber-500 to-orange-700 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.4)]';

  return (
    <div className={`w-14 h-20 rounded-xl bg-gradient-to-br ${color} flex flex-col items-center justify-between border-2 border-white/20 shadow-lg relative overflow-hidden select-none`}>
      <div className="absolute inset-0 bg-opacity-20 bg-white swirl-felt pointer-events-none" />
      <span className="font-pixel text-[8px] text-white font-extrabold rotate-12 drop-shadow-md mt-4">PAKET</span>
      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping mb-3" />
    </div>
  );
}

interface ShopScreenProps {
  money: number;
  offers: ShopOffer[];
  ownedCharms: CharmDef[];
  maxCharmSlots: number;
  rerollCost: number;
  onBuy: (itemId: string) => void;
  onReroll: () => void;
  onContinue: () => void;
  /** Stack the sign+buttons above the offer rack instead of beside it, for the narrow portrait canvas. */
  isPortrait?: boolean;
  /** Total permanent stone count, shown so players can confirm a drafted stone actually joined the deck. */
  deckSize: number;
  draftOffers: any[];
  onDraftSelect: (stoneId: string) => void;
  onFuse?: (charmAId: string, charmBId: string) => void;
  fusedCharmIds?: string[];
  activeTag?: SkipTag | null;
}

const RARITY_BORDER: Record<CharmDef['rarity'], string> = {
  COMMON: 'border-stone-700 bg-stone-950/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.05)]',
  UNCOMMON: 'border-teal-700/80 bg-teal-950/30',
  RARE: 'border-red-800/80 bg-red-950/30',
  LEGENDARY: 'border-amber-500 bg-amber-950/40 animate-shine',
};

const CURSE_BORDER = 'border-rose-800 bg-rose-950/30';

const GEM_CLASS: Record<CharmDef['rarity'], string> = {
  COMMON: 'bg-stone-500 shadow-[0_0_8px_#78716c]',
  UNCOMMON: 'bg-teal-400 shadow-[0_0_8px_#2dd4bf]',
  RARE: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
  LEGENDARY: 'bg-amber-400 shadow-[0_0_10px_#fbbf24] animate-pulse',
};
const CURSE_GEM = 'bg-fuchsia-500 shadow-[0_0_10px_#d946ef] animate-pulse';

const RARITY_LABEL_CLASS: Record<CharmDef['rarity'], string> = {
  COMMON: 'text-stone-500',
  UNCOMMON: 'text-teal-500 font-semibold',
  RARE: 'text-red-500 font-bold',
  LEGENDARY: 'text-amber-400 font-bold animate-pulse',
};

function renderVoucherIcon(id: string) {
  const artwork = VOUCHER_ICON_MAP[id];
  if (artwork) {
    return <img src={artwork} alt="" className="w-14 h-14 object-contain mx-auto drop-shadow" />;
  }
  return (
    <svg className="w-10 h-14" viewBox="0 0 100 130">
      <rect x="15" y="35" width="70" height="60" rx="6" fill="#78350F" stroke="#D97706" strokeWidth="4" />
      <circle cx="50" cy="65" r="16" fill="#FBBF24" stroke="#D97706" strokeWidth="3" />
      <text x="50" y="72" textAnchor="middle" fill="#78350F" fontSize="18" fontWeight="bold" fontFamily="monospace">V</text>
      <path d="M15 45 L5 35 M85 45 L95 35" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function renderUpgradeIcon(id: string) {
  const consumableArt = CONSUMABLE_ICON_MAP[id];
  if (consumableArt) {
    return <img src={consumableArt} alt="" className="w-14 h-14 object-contain mx-auto drop-shadow" />;
  }
  if (id === 'consumable_magnet') {
    return (
      <svg className="w-10 h-14" viewBox="0 0 100 130">
        <path d="M30 40 L30 80 A20 20 0 0 0 70 80 L70 40" fill="none" stroke="#EF4444" strokeWidth="12" strokeLinecap="round" />
        <path d="M30 35 L30 45" stroke="#FFFFFF" strokeWidth="12" />
        <path d="M70 35 L70 45" stroke="#FFFFFF" strokeWidth="12" />
        <path d="M30 20 Q50 30 70 20" fill="none" stroke="#60A5FA" strokeWidth="3" className="animate-bounce" />
      </svg>
    );
  }
  if (id === 'consumable_breaker') {
    return (
      <svg className="w-10 h-14" viewBox="0 0 100 130">
        <path d="M50 70 L30 40 L40 30 L60 60 Z" fill="#94A3B8" stroke="#475569" strokeWidth="3" />
        <rect x="55" y="60" width="10" height="40" transform="rotate(-30, 55, 60)" fill="#78350F" />
        <path d="M30 90 L50 80 L70 95 M45 75 L60 90" fill="none" stroke="#EF4444" strokeWidth="3" />
      </svg>
    );
  }
  if (id === 'consumable_gild') {
    return (
      <svg className="w-10 h-14 animate-bounce" viewBox="0 0 100 130">
        <circle cx="50" cy="65" r="22" fill="#FBBF24" stroke="#D97706" strokeWidth="4" />
        <circle cx="50" cy="65" r="14" fill="none" stroke="#D97706" strokeWidth="2" strokeDasharray="3 2" />
        <text x="50" y="73" textAnchor="middle" fill="#D97706" fontSize="24" fontWeight="bold" fontFamily="monospace">$</text>
        <path d="M25 35 L29 39 M25 39 L29 35" stroke="#FBBF24" strokeWidth="2" />
        <path d="M75 95 L79 99 M75 99 L79 95" stroke="#FBBF24" strokeWidth="2" />
      </svg>
    );
  }
  // Rune consumables
  if (id === 'consumable_ivory') {
    return (
      <svg className="w-10 h-14" viewBox="0 0 100 130">
        <path d="M50 25 L75 65 L50 105 L25 65 Z" fill="#F5F5F4" stroke="#A8A29E" strokeWidth="4" />
        <path d="M50 25 L50 105 M25 65 L75 65" stroke="#D6D3D1" strokeWidth="2" />
      </svg>
    );
  }
  if (id === 'consumable_obsidian') {
    return (
      <svg className="w-10 h-14" viewBox="0 0 100 130">
        <path d="M50 22 L78 50 L68 108 L32 108 L22 50 Z" fill="#1E1B2E" stroke="#9333EA" strokeWidth="4" />
        <path d="M50 22 L50 108 M22 50 L78 50" stroke="#A855F7" strokeWidth="1.5" strokeOpacity="0.6" />
      </svg>
    );
  }
  if (id === 'consumable_amber') {
    return (
      <svg className="w-10 h-14" viewBox="0 0 100 130">
        <path d="M50 20 L74 34 L74 96 L50 110 L26 96 L26 34 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="4" />
        <circle cx="50" cy="65" r="8" fill="#FDE68A" fillOpacity="0.8" />
      </svg>
    );
  }
  if (id === 'consumable_trash') {
    return (
      <svg className="w-10 h-14" viewBox="0 0 100 130">
        <circle cx="50" cy="65" r="22" fill="#450A0A" stroke="#EF4444" strokeWidth="4" />
        <path d="M38 53 L62 77 M62 53 L38 77" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" />
        <path d="M50 35 L50 45" stroke="#EF4444" strokeWidth="2.5" />
      </svg>
    );
  }
  if (id === 'consumable_scissors') {
    return (
      <svg className="w-10 h-14" viewBox="0 0 100 130">
        <circle cx="35" cy="90" r="14" fill="none" stroke="#EF4444" strokeWidth="5" />
        <circle cx="65" cy="90" r="14" fill="none" stroke="#EF4444" strokeWidth="5" />
        <path d="M40 80 L60 30" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
        <path d="M60 80 L40 30" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
        <circle cx="50" cy="65" r="3" fill="#334155" />
      </svg>
    );
  }
  if (id === 'consumable_magnifier') {
    return (
      <svg className="w-10 h-14" viewBox="0 0 100 130">
        <circle cx="45" cy="50" r="20" fill="rgba(147,197,253,0.3)" stroke="#60A5FA" strokeWidth="4" />
        <path d="M60 65 L85 95" stroke="#78350F" strokeWidth="8" strokeLinecap="round" />
        <path d="M35 40 Q40 35 45 42" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'consumable_transmute') {
    return (
      <svg className="w-10 h-14 animate-pulse" viewBox="0 0 100 130">
        <path d="M50 20 L35 50 L35 100 A15 15 0 0 0 65 100 L65 50 Z" fill="#D946EF" stroke="#A21CAF" strokeWidth="4" />
        <path d="M40 60 L60 60" stroke="#F1F5F9" strokeWidth="2" />
        <circle cx="45" cy="80" r="3" fill="#FFFFFF" opacity="0.7" />
        <circle cx="55" cy="90" r="4" fill="#FFFFFF" opacity="0.6" />
      </svg>
    );
  }
  if (id === 'consumable_clover') {
    return (
      <svg className="w-10 h-14 animate-bounce" viewBox="0 0 100 130">
        <path d="M50 65 Q50 35 35 50 Q20 65 50 65" fill="#10B981" stroke="#047857" strokeWidth="3" />
        <path d="M50 65 Q80 35 65 50 Q50 65 50 65" fill="#10B981" stroke="#047857" strokeWidth="3" />
        <path d="M50 65 Q50 95 65 80 Q80 65 50 65" fill="#10B981" stroke="#047857" strokeWidth="3" />
        <path d="M50 65 Q20 95 35 80 Q50 65 50 65" fill="#10B981" stroke="#047857" strokeWidth="3" />
        <path d="M50 65 fill" opacity="0" />
        <path d="M50 65 Q45 105 30 110" fill="none" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}

export default function ShopScreen({
  money,
  offers,
  ownedCharms,
  maxCharmSlots,
  rerollCost,
  onBuy,
  onReroll,
  onContinue,
  isPortrait = false,
  deckSize,
  draftOffers,
  onDraftSelect,
  onFuse,
  fusedCharmIds,
  activeTag,
}: ShopScreenProps) {
  const slotsFull = ownedCharms.length >= maxCharmSlots;

  const [fuseA, setFuseA] = useState<string | null>(null);
  const [fuseB, setFuseB] = useState<string | null>(null);

  const handleFuseCharmSelect = (charmId: string) => {
    if (fuseA === charmId) {
      setFuseA(null);
    } else if (fuseB === charmId) {
      setFuseB(null);
    } else if (!fuseA) {
      setFuseA(charmId);
    } else if (!fuseB) {
      setFuseB(charmId);
    } else {
      setFuseB(charmId);
    }
  };

  const activeRecipe = FUSION_RECIPES.find(
    (r) =>
      (r.sourceA === fuseA && r.sourceB === fuseB) ||
      (r.sourceA === fuseB && r.sourceB === fuseA)
  );

  const resultCharm = activeRecipe
    ? CHARMS.find((c) => c.id === activeRecipe.resultId)
    : null;

  const canFuse = activeRecipe && money >= activeRecipe.cost && onFuse;

  const eligibleOwnedCharms = ownedCharms.filter(charm => {
    const inAnyRecipe = FUSION_RECIPES.some(r => r.sourceA === charm.id || r.sourceB === charm.id);
    if (!inAnyRecipe) return false;

    if (fuseA && fuseA !== charm.id) {
      const formsValidPair = FUSION_RECIPES.some(
        r => (r.sourceA === fuseA && r.sourceB === charm.id) || (r.sourceA === charm.id && r.sourceB === fuseA)
      );
      return formsValidPair;
    }

    return true;
  });

  const cardOffers = offers.filter((o) => o.type === 'CHARM' || o.type === 'UPGRADE' || o.type === 'THEOREM');
  const packageOffers = offers.filter((o) => o.type === 'BOOSTER' || o.type === 'VOUCHER');

  function renderOfferCard(offer: ShopOffer) {
    if (offer.type === 'CHARM') {
      const charm = offer.item as CharmDef;
      const disabled = money < charm.cost || slotsFull;
      const borderClass = charm.curse ? CURSE_BORDER : RARITY_BORDER[charm.rarity];
      
      const tooltipContent = (
        <div className="flex flex-col gap-1.5 p-1 select-none text-left leading-normal font-sans">
          <div className="flex items-center justify-between border-b border-amber-800/40 pb-1">
            <span className="font-bold text-xs text-amber-200">{charm.name}</span>
            <span className={`text-[8.5px] uppercase font-extrabold ${RARITY_LABEL_CLASS[charm.rarity]}`}>
              {charm.curse ? 'LANETLİ' : charm.rarity}
            </span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed">
            {charm.description}
          </p>
          <div className="flex justify-between items-center text-[9px] text-amber-400/80 border-t border-amber-800/20 pt-1">
            <span>Maliyet: ${charm.cost}</span>
          </div>
        </div>
      );

      const gemClass = charm.curse ? CURSE_GEM : GEM_CLASS[charm.rarity];

      return (
        <InfoTooltip key={charm.id} text={tooltipContent} widthClass="w-64" side="right">
          <div
            className={`balatro-card relative flex flex-col justify-between w-22 h-34 md:w-24 md:h-38 p-2 rounded-xl border-2 transition shrink-0 ${borderClass}`}
          >
            <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-950/40 z-10 ${gemClass}`} title={charm.curse ? 'Lanetli' : charm.rarity} />

            <div className="flex-1 flex items-center justify-center transform scale-[1.25] origin-center my-auto pointer-events-none">
              {renderCharmIcon(charm.id)}
            </div>

            <button
              type="button"
              onClick={() => onBuy(charm.id)}
              disabled={disabled}
              className="w-full py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-[9px] md:text-[10px] font-bold font-pixel text-white shadow border-b-2 border-emerald-800 transition"
            >
              SATIN AL ${charm.cost}
            </button>
          </div>
        </InfoTooltip>
      );
    }

    if (offer.type === 'VOUCHER') {
      const voucher = offer.item;
      const disabled = money < voucher.cost;
      
      const tooltipContent = (
        <div className="flex flex-col gap-1.5 p-1 select-none text-left leading-normal font-sans">
          <div className="flex items-center justify-between border-b border-amber-800/40 pb-1">
            <span className="font-bold text-xs text-amber-200">{voucher.name}</span>
            <span className="text-[8.5px] uppercase font-extrabold text-amber-500">FERMAN</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed">
            {voucher.description}
          </p>
        </div>
      );

      return (
        <InfoTooltip key={voucher.id} text={tooltipContent} widthClass="w-64" side="right">
          <div
            className="balatro-card relative flex flex-col justify-between w-22 h-34 md:w-24 md:h-38 p-2 rounded-xl border-2 border-amber-600/80 bg-amber-950/20 shadow-[0_0_10px_rgba(217,119,6,0.3)] transition shrink-0"
          >
            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-950/40 z-10 bg-amber-500 shadow-[0_0_8px_#d97706]" title="Ferman" />

            <div className="flex-1 flex items-center justify-center transform scale-[1.25] origin-center my-auto pointer-events-none">
              {renderVoucherIcon(voucher.id)}
            </div>

            <button
              type="button"
              onClick={() => onBuy(voucher.id)}
              disabled={disabled}
              className="w-full py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:pointer-events-none text-[9px] md:text-[10px] font-bold font-pixel text-white shadow border-b-2 border-amber-800 transition"
            >
              SATIN AL ${voucher.cost}
            </button>
          </div>
        </InfoTooltip>
      );
    }

    if (offer.type === 'BOOSTER') {
      const pack = offer.item;
      const disabled = money < pack.cost;

      const tooltipContent = (
        <div className="flex flex-col gap-1.5 p-1 select-none text-left leading-normal font-sans">
          <div className="flex items-center justify-between border-b border-amber-800/40 pb-1">
            <span className="font-bold text-xs text-amber-200">{pack.name}</span>
            <span className="text-[8.5px] uppercase font-extrabold text-indigo-400 font-pixel">KESE</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed font-sans">
            {pack.description}
          </p>
        </div>
      );

      let boosterBorder = 'border-indigo-600/80 bg-indigo-950/20';
      if (pack.id === 'booster_obsidian') boosterBorder = 'border-purple-600/80 bg-purple-950/20';
      else if (pack.id === 'booster_ivory') boosterBorder = 'border-stone-400/80 bg-stone-900/40';
      else if (pack.id === 'booster_amber') boosterBorder = 'border-amber-500/80 bg-amber-950/20';

      return (
        <InfoTooltip key={pack.id} text={tooltipContent} widthClass="w-64" side="right">
          <div
            className={`balatro-card relative flex flex-col justify-between w-22 h-34 md:w-24 md:h-38 p-2 rounded-xl border-2 ${boosterBorder} transition shrink-0`}
          >
            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-950/40 z-10 bg-indigo-500 shadow-[0_0_8px_#6366f1]" title="Kese" />

            <div className="flex-1 flex items-center justify-center transform scale-[0.8] origin-center my-auto pointer-events-none">
              {renderBoosterIcon(pack.id)}
            </div>

            <button
              type="button"
              onClick={() => onBuy(pack.id)}
              disabled={disabled}
              className="w-full py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none text-[9px] md:text-[10px] font-bold font-pixel text-white shadow border-b-2 border-indigo-850 transition"
            >
              SATIN AL ${pack.cost}
            </button>
          </div>
        </InfoTooltip>
      );
    }

    if (offer.type === 'THEOREM') {
      const book = offer.item;
      const disabled = money < book.cost;
      const borderClass = 'border-rose-600/80 bg-rose-950/20 shadow-[0_0_10px_rgba(244,63,94,0.25)]';
      const labelColor = 'text-rose-400';

      const tooltipContent = (
        <div className="flex flex-col gap-1.5 p-1 select-none text-left leading-normal font-sans">
          <div className="flex items-center justify-between border-b border-amber-800/40 pb-1">
            <span className="font-bold text-xs text-amber-200">{book.name}</span>
            <span className={`text-[8.5px] uppercase font-extrabold ${labelColor}`}>TEOREM</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed font-sans">
            {book.description}
          </p>
        </div>
      );

      return (
        <InfoTooltip key={book.id} text={tooltipContent} widthClass="w-64" side="right">
          <div
            className={`balatro-card relative flex flex-col justify-between w-22 h-34 md:w-24 md:h-38 p-2 rounded-xl border-2 transition shrink-0 ${borderClass}`}
          >
            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-950/40 z-10 bg-rose-500 shadow-[0_0_8px_#f43f5e]" title="Teorem Kitabı" />
            
            <div className="flex-1 flex items-center justify-center text-2xl origin-center my-auto pointer-events-none text-rose-450 drop-shadow">
              📖
            </div>

            <button
              type="button"
              onClick={() => onBuy(book.id)}
              disabled={disabled}
              className="w-full py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-[9px] md:text-[10px] font-bold font-pixel text-white shadow border-b-2 border-emerald-800 transition"
            >
              SATIN AL ${book.cost}
            </button>
          </div>
        </InfoTooltip>
      );
    }

    const upgrade = offer.item;
    const disabled = money < upgrade.cost;
    const borderClass = 'border-teal-700/80 bg-teal-950/20';
    const labelColor = 'text-teal-400';

    const tooltipContent = (
      <div className="flex flex-col gap-1.5 p-1 select-none text-left leading-normal font-sans">
        <div className="flex items-center justify-between border-b border-amber-800/40 pb-1">
          <span className="font-bold text-xs text-amber-200">{upgrade.name}</span>
          <span className={`text-[8.5px] uppercase font-extrabold ${labelColor}`}>
            BÜYÜ
          </span>
        </div>
        <p className="text-[10px] text-slate-200 leading-relaxed">
          {upgrade.description}
        </p>
      </div>
    );

    const gemColor = 'bg-teal-400 shadow-[0_0_8px_#2dd4bf]';

    return (
      <InfoTooltip key={upgrade.id} text={tooltipContent} widthClass="w-64" side="left">
        <div
          className={`balatro-card relative flex flex-col justify-between w-22 h-34 md:w-24 md:h-38 p-2 rounded-xl border-2 transition shrink-0 ${borderClass}`}
        >
          <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-950/40 z-10 ${gemColor}`} title="Büyü" />

          <div className="flex-1 flex items-center justify-center transform scale-[1.25] origin-center my-auto pointer-events-none">
            {renderUpgradeIcon(upgrade.id)}
          </div>

          <button
            type="button"
            onClick={() => onBuy(upgrade.id)}
            disabled={disabled}
            className="w-full py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-[9px] md:text-[10px] font-bold font-pixel text-white shadow border-b-2 border-emerald-800 transition"
          >
            SATIN AL ${upgrade.cost}
          </button>
        </div>
      </InfoTooltip>
    );
  }

  // Common Draft Kese Modal Overlay
  const draftOverlay = draftOffers && draftOffers.length > 0 && (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-50 p-4 font-pixel select-none crt-screen">
      <h2 className="text-xl md:text-2xl text-amber-300 mb-2 drop-shadow-[0_0_10px_#fbbf24] animate-pulse">KESE AÇILIYOR</h2>
      <p className="text-xs text-slate-400 mb-8 font-sans">Taş kesesinden destenize kalıcı olarak eklemek için 1 adet taş seçin.</p>
      
      <div className="flex gap-4 justify-center items-center mb-8">
        {draftOffers.map((stone) => {
          let modifierBorder = 'border-stone-700 bg-stone-900/60';
          let modifierLabel = 'STANDART';
          if (stone.modifier === 'OBSIDIAN') {
            modifierBorder = 'border-purple-600 bg-purple-950/40 shadow-[0_0_15px_rgba(147,51,234,0.4)] text-purple-200';
            modifierLabel = 'OBSİDYEN';
          } else if (stone.modifier === 'IVORY') {
            modifierBorder = 'border-stone-400 bg-stone-100/10 shadow-[0_0_15px_rgba(245,245,244,0.4)] text-stone-200';
            modifierLabel = 'FİLDİŞİ';
          } else if (stone.modifier === 'AMBER') {
            modifierBorder = 'border-amber-500 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.4)] text-amber-300';
            modifierLabel = 'KEHRİBAR';
          }

          return (
            <div
              key={stone.id}
              onClick={() => onDraftSelect(stone.id)}
              className={`flex flex-col items-center justify-between p-3.5 w-24 h-36 md:w-30 md:h-44 rounded-2xl border-2 cursor-pointer transform hover:scale-105 active:scale-95 transition ${modifierBorder}`}
            >
              <span className="text-[7.5px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-slate-950/80 mb-2 text-white">
                {modifierLabel}
              </span>
              
              {/* Domino stone representation */}
              <div className="flex-1 flex flex-col justify-center items-center gap-1.5">
                <div className="flex gap-1.5 items-center justify-center">
                  <span className="text-base md:text-xl font-bold bg-slate-950/50 px-2 py-0.5 rounded">{stone.leftVal}</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-base md:text-xl font-bold bg-slate-950/50 px-2 py-0.5 rounded">{stone.rightVal}</span>
                </div>
              </div>
              
              <span className="text-[9px] text-emerald-400 font-bold mt-2">SEÇ</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isPortrait) {
    return (
      <div className="w-full h-full flex flex-col bg-stone-900 border-2 border-stone-950 p-3 gap-3 select-none overflow-y-auto">
        {/* Controls */}
        <div className="flex gap-3 shrink-0 flex-row items-center">
          <div className="rounded-xl border-4 border-amber-800 bg-linear-to-b from-amber-700 to-amber-900 text-center shadow-md flex-1 py-2">
            <h2 className="font-black text-amber-50 font-pixel tracking-widest uppercase shop-neon text-xl">
              MAĞAZA
            </h2>
            <p className="text-[10px] font-pixel text-amber-200/80 mt-1">
              Deste: <span className="font-bold text-amber-100">{deckSize}</span> taş
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onContinue}
              className="btn-arcade btn-arcade-green px-5 py-3 rounded-xl text-sm font-pixel font-black text-white uppercase animate-pulse"
            >
              Sonraki Tur
            </button>
            <button
              type="button"
              onClick={onReroll}
              disabled={money < rerollCost}
              className="btn-arcade btn-arcade-slate px-5 py-3 rounded-xl text-sm font-pixel font-black text-white uppercase"
            >
              Yenile (${rerollCost})
            </button>
          </div>
        </div>

        {activeTag && (
          <div className="flex items-center gap-2.5 bg-slate-950/80 border border-amber-500/30 rounded-xl px-4 py-2 shadow-lg animate-pulse shrink-0 self-center">
            <span className="text-3xl">{activeTag.icon}</span>
            <div className="flex flex-col leading-tight select-none">
              <span className="font-pixel text-xs font-black text-amber-300 uppercase tracking-widest">
                Aktif Etiket: {activeTag.name}
              </span>
              <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                {activeTag.description}
              </span>
            </div>
          </div>
        )}

        {/* Offers & Fusion stacked in Portrait */}
        <div className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Teklifler</h3>
            {slotsFull && (
              <span className="text-[11px] text-amber-400 font-bold uppercase animate-pulse">Slotlar Dolu!</span>
            )}
          </div>

          {/* Offers lists */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-950/30 p-2.5 rounded-xl border border-slate-900/50 flex flex-col">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-900/50 pb-1 mb-2 font-pixel">
                Tılsımlar & Sarf Malzemeleri
              </div>
              <div className="flex flex-row flex-wrap gap-2.5 items-center justify-center">
                {cardOffers.map(renderOfferCard)}
                {cardOffers.length === 0 && <span className="text-[10px] font-mono text-slate-655">Tümü satıldı.</span>}
              </div>
            </div>

            <div className="bg-slate-950/30 p-2.5 rounded-xl border border-slate-900/50 flex flex-col">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-900/50 pb-1 mb-2 font-pixel">
                Taş Keseleri & Fermanlar
              </div>
              <div className="flex flex-row flex-wrap gap-2.5 items-center justify-center">
                {packageOffers.map(renderOfferCard)}
                {packageOffers.length === 0 && <span className="text-[10px] font-mono text-slate-655">Tümü satıldı.</span>}
              </div>
            </div>
          </div>

          {/* Fusion in Portrait */}
          <div className="border-t border-slate-800/50 pt-3 mt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 font-pixel mb-2">Garabet Füzyon Ocağı</h3>
            {ownedCharms.length < 2 ? (
              <p className="text-[9.5px] text-slate-500 italic font-sans text-center">En az 2 tılsımınız olmalı.</p>
            ) : (
              <div className="flex flex-col gap-3 bg-slate-950/30 p-3 rounded-xl border border-slate-900/50">
                {/* Inventory */}
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tılsım Seç:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {eligibleOwnedCharms.map((charm) => (
                      <button
                        key={charm.id}
                        type="button"
                        onClick={() => handleFuseCharmSelect(charm.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-left text-[10px] transition ${
                          fuseA === charm.id || fuseB === charm.id ? 'border-amber-400 bg-amber-950/30 text-amber-300 font-bold' : 'border-slate-800 bg-slate-900/40 text-slate-400'
                        }`}
                      >
                        <span className="text-xs">{renderCharmIcon(charm.id)}</span>
                        <span>{charm.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slots */}
                <div className="flex justify-center items-center gap-2">
                  <div className="w-12 h-14 border rounded flex items-center justify-center text-xs bg-slate-900 border-slate-800">
                    {fuseA ? renderCharmIcon(fuseA) : '?'}
                  </div>
                  <span className="text-slate-600 font-pixel">+</span>
                  <div className="w-12 h-14 border rounded flex items-center justify-center text-xs bg-slate-900 border-slate-800">
                    {fuseB ? renderCharmIcon(fuseB) : '?'}
                  </div>
                  <span className="text-slate-600 font-pixel">=</span>
                  <div className="w-12 h-14 border rounded flex items-center justify-center text-xs bg-slate-900 border-slate-800">
                    {resultCharm ? renderCharmIcon(resultCharm.id) : '?'}
                  </div>
                </div>

                {/* Submit */}
                {resultCharm && activeRecipe && (
                  <button
                    type="button"
                    disabled={!canFuse}
                    onClick={() => {
                      onFuse?.(fuseA!, fuseB!);
                      setFuseA(null);
                      setFuseB(null);
                    }}
                    className={`w-full py-2.5 rounded-lg text-xs font-pixel font-bold text-white transition ${
                      canFuse ? 'bg-amber-600 hover:bg-amber-500 border-b-2 border-amber-800' : 'bg-slate-850 opacity-40'
                    }`}
                  >
                    BİRLEŞTİR (${activeRecipe.cost})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {draftOverlay}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // LANDSCAPE LAYOUT (Zero scroll on page, columns side-by-side)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-row bg-slate-900 border-4 border-slate-950 p-2 md:p-3 lg:p-4 gap-2 md:gap-3 lg:gap-4 select-none overflow-hidden rounded-3xl relative felt-board">
      {/* 1. Left Side: Controls & Wood Sign */}
      <div className="w-28 md:w-32 lg:w-40 flex flex-col justify-between shrink-0 h-full">
        {/* Carved wooden shop sign */}
        <div className="rounded-xl border-4 border-amber-800 bg-linear-to-b from-amber-700 to-amber-900 text-center shadow-md p-3">
          <h2 className="font-black text-amber-50 font-pixel tracking-widest uppercase shop-neon text-lg md:text-xl lg:text-2xl">
            MAĞAZA
          </h2>
          <p className="text-[10px] font-pixel text-amber-200/80 mt-1">
            Deste: <span className="font-bold text-amber-100">{deckSize}</span> taş
          </p>
        </div>

        {/* Balance Badge */}
        <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl text-center shadow-inner">
          <span className="block text-[8px] text-slate-500 font-pixel uppercase tracking-widest mb-0.5">Bakiye</span>
          <span className="font-pixel text-xl md:text-2xl text-emerald-450 font-black">${money}</span>
        </div>

        {/* Active Tag */}
        {activeTag && (
          <div className="bg-slate-950 border border-amber-500/25 p-2 rounded-xl text-center shadow-md animate-pulse">
            <span className="block text-[7.5px] text-slate-500 font-pixel uppercase tracking-widest mb-0.5">Aktif Etiket</span>
            <div className="text-xl my-1">{activeTag.icon}</div>
            <span className="font-pixel text-[10px] text-amber-300 font-bold block leading-tight">{activeTag.name}</span>
            <span className="text-[7.5px] text-slate-400 block leading-tight mt-1">{activeTag.description}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-auto w-full">
          {/* Next Round Button (Green, matching cash out continue button) */}
          <button
            type="button"
            onClick={onContinue}
            className="btn-arcade btn-arcade-green w-full py-2.5 md:py-3 lg:py-4 rounded-xl text-xs md:text-sm font-pixel font-black text-white uppercase animate-pulse"
          >
            Sonraki Tur
          </button>

          {/* Reroll Button (Slate, matching controls) */}
          <button
            type="button"
            onClick={onReroll}
            disabled={money < rerollCost}
            className="btn-arcade btn-arcade-slate w-full py-2.5 md:py-3 lg:py-4 rounded-xl text-xs md:text-sm font-pixel font-black text-white"
          >
            Yenile (${rerollCost})
          </button>
        </div>
      </div>

      {/* 2. Middle Column: Shop Offers Rack (Fits completely, scrollable internal lists only) */}
      <div className="flex-1 bg-slate-950/75 border border-slate-800/80 rounded-2xl p-2 md:p-3 lg:p-4 flex flex-col h-full min-w-0 min-h-0">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Teklifler</h3>
          {slotsFull && (
            <span className="text-[11px] text-amber-400 font-bold uppercase animate-pulse">
              Tılsım Slotları Dolu!
            </span>
          )}
        </div>

        {/* Offers shelves container - internally scrollable if the window is tiny */}
        <div className="flex-1 mt-3 flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
          {/* A. Üst Raf: Tılsımlar & Sarf Malzemeleri */}
          <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900/50 flex flex-col shrink-0">
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-900/50 pb-1 mb-2 font-pixel">
              Tılsımlar & Sarf Malzemeleri
            </div>
            <div className="flex flex-row flex-wrap gap-2.5 items-center justify-start min-h-0">
              {cardOffers.map(renderOfferCard)}
              {cardOffers.length === 0 && (
                <span className="text-[10px] font-mono text-slate-655">Tüm kartlar satın alındı.</span>
              )}
            </div>
          </div>

          {/* B. Alt Raf: Taş Keseleri & Fermanlar */}
          <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900/50 flex flex-col shrink-0">
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-900/50 pb-1 mb-2 font-pixel">
              Taş Keseleri & Fermanlar
            </div>
            <div className="flex flex-row flex-wrap gap-2.5 items-center justify-start">
              {packageOffers.map(renderOfferCard)}
              {packageOffers.length === 0 && (
                <span className="text-[10px] font-mono text-slate-655">Tüm paketler ve fermanlar satın alındı.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Right Column: Fusion Forge (Side-by-side setup) */}
      <div className="w-64 md:w-72 lg:w-80 xl:w-96 bg-slate-950/75 border border-slate-800/80 rounded-2xl p-2 md:p-3 lg:p-4 flex flex-col shrink-0 h-full min-h-0">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0 select-none">
          <span className="text-base">🏛️</span>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-500 font-pixel">
            Garabet Füzyon Ocağı
          </h3>
        </div>

        {ownedCharms.length < 2 ? (
          <div className="flex-1 flex items-center justify-center py-4 bg-slate-900/10 border border-slate-900/40 rounded-xl mt-3">
            <p className="text-[10px] font-sans text-slate-500 italic text-center px-4 leading-normal">
              Füzyon ocağını kullanmak için en az 2 tılsıma sahip olmalısınız.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col mt-3 gap-3 min-h-0">
            {/* Charm Inventory Selector */}
            <div className="flex-1 flex flex-col min-h-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block shrink-0">
                1. Tılsımlarını Seç:
              </span>
              <div className="flex-1 overflow-y-auto mt-1 max-h-56 border border-slate-900 bg-slate-950/30 p-2.5 rounded-xl flex flex-col gap-1.5 animate-fade-in pr-1">
                {eligibleOwnedCharms.length === 0 ? (
                  <p className="text-[9.5px] text-slate-500 italic font-sans leading-relaxed">
                    {fuseA
                      ? 'Seçilen tılsımla birleşebilecek başka uyumlu tılsımınız bulunmuyor.'
                      : 'Birleştirilebilir uyumlu tılsımınız bulunmuyor. Saat, Matruşka, Abaküs, Ayna vb. uyumlu çiftleri toplayın.'}
                  </p>
                ) : (
                  eligibleOwnedCharms.map((charm) => {
                    const isSelected = fuseA === charm.id || fuseB === charm.id;
                    const isFused = fusedCharmIds?.includes(charm.id);
                    
                    return (
                      <button
                        key={charm.id}
                        type="button"
                        onClick={() => handleFuseCharmSelect(charm.id)}
                        className={[
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition select-none cursor-pointer shrink-0',
                          isSelected
                            ? 'border-amber-400 bg-amber-950/20 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.15)] font-bold'
                            : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-800 hover:text-white',
                        ].join(' ')}
                      >
                        <span className="text-sm shrink-0 leading-none">{renderCharmIcon(charm.id)}</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-pixel leading-tight">{charm.name}</span>
                          <span className="text-[8px] text-slate-500 font-sans leading-none mt-0.5">
                            {charm.rarity} {isFused ? '(Füzyon)' : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected slots & Recipe check */}
            <div className="border border-slate-900/80 bg-slate-950/40 p-2.5 rounded-xl shrink-0 flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block mb-1.5 text-center">
                2. Sinerji Reçetesi
              </span>
              <div className="flex items-center gap-3">
                {/* Slot A */}
                <div className={[
                  'w-11 h-14 rounded-lg border flex flex-col items-center justify-center p-1 text-center transition shrink-0',
                  fuseA ? 'border-amber-500/50 bg-amber-950/10' : 'border-dashed border-slate-800 bg-slate-900/10'
                ].join(' ')}>
                  {fuseA ? (
                    <>
                      <span className="text-xs shrink-0 leading-none">{renderCharmIcon(fuseA)}</span>
                      <span className="text-[7px] font-pixel text-slate-350 leading-tight truncate w-full mt-0.5">
                        {ownedCharms.find(c => c.id === fuseA)?.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[8px] text-slate-650 font-pixel">Boş</span>
                  )}
                </div>

                <span className="text-slate-650 font-bold font-pixel text-sm select-none">+</span>

                {/* Slot B */}
                <div className={[
                  'w-11 h-14 rounded-lg border flex flex-col items-center justify-center p-1 text-center transition shrink-0',
                  fuseB ? 'border-amber-500/50 bg-amber-950/10' : 'border-dashed border-slate-800 bg-slate-900/10'
                ].join(' ')}>
                  {fuseB ? (
                    <>
                      <span className="text-xs shrink-0 leading-none">{renderCharmIcon(fuseB)}</span>
                      <span className="text-[7px] font-pixel text-slate-350 leading-tight truncate w-full mt-0.5">
                        {ownedCharms.find(c => c.id === fuseB)?.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[8px] text-slate-650 font-pixel">Boş</span>
                  )}
                </div>

                <span className="text-slate-650 font-bold font-pixel text-sm select-none">=</span>

                {/* Result Preview */}
                <div className={[
                  'w-11 h-14 rounded-lg border flex flex-col items-center justify-center p-1 text-center transition shrink-0',
                  resultCharm ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_8px_rgba(16,185,129,0.2)] animate-pulse' : 'border-dashed border-slate-800 bg-slate-900/10'
                ].join(' ')}>
                  {resultCharm ? (
                    <>
                      <span className="text-xs shrink-0 leading-none">{renderCharmIcon(resultCharm.id)}</span>
                      <span className="text-[7px] font-pixel text-emerald-450 font-bold leading-tight truncate w-full mt-0.5">
                        {resultCharm.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[8px] text-slate-650 font-pixel">?</span>
                  )}
                </div>
              </div>
            </div>

            {/* Fusion Action Bar */}
            <div className="shrink-0 flex flex-col gap-1 border-t border-slate-900 pt-2.5">
              {resultCharm ? (
                <div className="flex flex-col gap-2">
                  <div className="bg-slate-900/20 border border-slate-900 p-2 rounded-lg text-center">
                    <span className="text-[8.5px] font-pixel text-emerald-400 font-bold block mb-0.5">YENİ HİBRİT TILSIM</span>
                    <p className="text-[8px] text-slate-350 font-sans leading-tight">
                      {resultCharm.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canFuse}
                    onClick={() => {
                      onFuse?.(fuseA!, fuseB!);
                      setFuseA(null);
                      setFuseB(null);
                    }}
                    className={[
                      'w-full py-2.5 rounded-xl text-xs font-pixel font-bold text-white shadow border-b-2 transition cursor-pointer select-none',
                      canFuse
                        ? 'bg-amber-600 hover:bg-amber-500 border-amber-800 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                        : 'bg-slate-850 border-slate-950 opacity-40 cursor-default text-slate-400'
                    ].join(' ')}
                  >
                    {activeRecipe && money >= activeRecipe.cost ? `BİRLEŞTİR ($${activeRecipe.cost})` : `YETERSİZ PARA ($${activeRecipe?.cost ?? ''})`}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 rounded-xl bg-slate-850 border-slate-950 opacity-40 text-xs font-pixel font-bold text-slate-500 cursor-default border-b-2"
                >
                  FÜZYON YAPILAMAZ
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {draftOverlay}
    </div>
  );
}
