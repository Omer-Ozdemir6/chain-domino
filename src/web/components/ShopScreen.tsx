import type { CharmDef } from '../../models/Charm.js';
import type { ShopOffer, SkipTag, RuneOptionDef } from '../../game/RunState.js';
import { FUSION_RECIPES } from '../../game/RunState.js';
import { CHARMS } from '../../models/CharmRegistry.js';
import { renderCharmIcon } from './CharmBar.js';
import { VOUCHER_ICON_MAP, CONSUMABLE_ICON_MAP } from './charmIconMap.js';
import type { DominoStone } from '../../models/types.js';
import { Fragment, useEffect, useState } from 'react';

function renderBoosterIcon(id: string, size?: 'STANDARD' | 'JUMBO') {
  let color = 'from-blue-500 to-indigo-700';
  if (id.includes('obsidian')) color = 'from-purple-800 to-stone-900 border-purple-600/50 shadow-[0_0_10px_rgba(147,51,234,0.4)]';
  else if (id.includes('ivory')) color = 'from-stone-100 to-stone-300 border-stone-400';
  else if (id.includes('amber')) color = 'from-amber-500 to-orange-700 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
  const isJumbo = size === 'JUMBO';

  return (
    <div className={`${isJumbo ? 'w-18 h-24' : 'w-14 h-20'} rounded-xl bg-gradient-to-br ${color} flex flex-col items-center justify-between border-2 border-white/20 shadow-lg relative overflow-hidden select-none`}>
      <div className="absolute inset-0 bg-opacity-20 bg-white swirl-felt pointer-events-none" />
      {isJumbo && (
        <span className="absolute top-1 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 text-[9px] font-pixel font-black px-1.5 py-0.5 rounded shadow z-10 tracking-widest">JUMBO</span>
      )}
      <span className="font-pixel text-[10px] text-white font-extrabold rotate-12 drop-shadow-md mt-6">PAKET</span>
      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping mb-3" />
    </div>
  );
}

function renderRuneIcon(size?: 'STANDARD' | 'JUMBO') {
  const isJumbo = size === 'JUMBO';
  return (
    <div className={`${isJumbo ? 'w-18 h-24' : 'w-14 h-20'} rounded-xl bg-gradient-to-br from-rose-700 to-fuchsia-900 border-rose-500/50 shadow-[0_0_10px_rgba(225,29,72,0.4)] flex flex-col items-center justify-between border-2 border-white/20 shadow-lg relative overflow-hidden select-none`}>
      <div className="absolute inset-0 bg-opacity-20 bg-white swirl-felt pointer-events-none" />
      {isJumbo && (
        <span className="absolute top-1 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 text-[9px] font-pixel font-black px-1.5 py-0.5 rounded shadow z-10 tracking-widest">JUMBO</span>
      )}
      <span className="font-pixel text-[10px] text-white font-extrabold rotate-12 drop-shadow-md mt-6">RÜN</span>
      <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-300 animate-ping mb-3" />
    </div>
  );
}

/** Balatro-style floating price pill, half-overlapping the top edge of an offer card. */
function renderPriceBadge(cost: number) {
  return (
    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 bg-amber-900 border-2 border-amber-600 text-sm font-pixel font-black text-amber-100 z-20 shadow-[0_0_10px_rgba(245,158,11,0.4)] whitespace-nowrap">
      ${cost}
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
  onSkipDraft: () => void;
  onFuse?: (charmAId: string, charmBId: string) => void;
  fusedCharmIds?: string[];
  activeTag?: SkipTag | null;
  /** Rün Kesesi (Rune Pack) flow: buy -> pick 1 of 3 -> pick K existing customDeck stones -> apply. */
  runeOffers: RuneOptionDef[];
  onChooseRune: (optionId: string) => void;
  onSkipRunePack: () => void;
  pendingRune: RuneOptionDef | null;
  customDeck: DominoStone[];
  onApplyRune: (stoneIds: string[]) => void;
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
        <path d="M50 65 Q45 105 30 110" fill="none" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'consumable_upgrade') {
    return (
      <svg className="w-10 h-14 animate-pulse" viewBox="0 0 100 130">
        <path d="M30 30 h40 a10 10 0 0 1 10 10 v60 a10 10 0 0 1 -10 10 h-40 a10 10 0 0 1 -10 -10 v-60 a10 10 0 0 1 10 -10 z" fill="#0891B2" stroke="#083344" strokeWidth="4" />
        <path d="M25 25 h50 a5 5 0 0 1 5 5 v5 a5 5 0 0 1 -5 5 h-50 a5 5 0 0 1 -5 -5 v-5 a5 5 0 0 1 5 -5 z" fill="#22D3EE" stroke="#083344" strokeWidth="3" />
        <path d="M25 100 h50 a5 5 0 0 1 5 5 v5 a5 5 0 0 1 -5 5 h-50 a5 5 0 0 1 -5 -5 v-5 a5 5 0 0 1 5 -5 z" fill="#22D3EE" stroke="#083344" strokeWidth="3" />
        <path d="M50 45 L50 85 M30 65 L70 65" stroke="#ECFEFF" strokeWidth="5" strokeLinecap="round" />
        <circle cx="50" cy="65" r="5" fill="#ECFEFF" />
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
  onSkipDraft,
  onFuse,
  fusedCharmIds,
  activeTag,
  runeOffers,
  onChooseRune,
  onSkipRunePack,
  pendingRune,
  customDeck,
  onApplyRune,
}: ShopScreenProps) {
  const slotsFull = ownedCharms.length >= maxCharmSlots;

  // Reroll dice physics: two bone dice tumble in, and only once they've landed do the old offer
  // cards actually get replaced — `rerollKey` remounts the whole offers row so every card replays
  // its entrance animation, standing in for the "new cards glinting up" half of the effect.
  const [isRerolling, setIsRerolling] = useState(false);
  const [rerollKey, setRerollKey] = useState(0);
  const [diceFaces, setDiceFaces] = useState<[number, number]>([1, 1]);
  function handleRerollClick() {
    if (isRerolling || money < rerollCost) return;
    setIsRerolling(true);
    setDiceFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
    setTimeout(() => {
      onReroll();
      setRerollKey((k) => k + 1);
      setIsRerolling(false);
    }, 750);
  }

  // Pack-opening ceremony: a bought booster/rune pack sits sealed in the middle of the screen
  // until the player clicks it — only THEN does the seal crack (smoke + light burst) and the
  // stone/rune choices actually reveal themselves, instead of the choice list just appearing
  // instantly the moment the purchase resolves.
  const packIsPending = draftOffers.length > 0 || runeOffers.length > 0;
  const [packSeal, setPackSeal] = useState<'sealed' | 'cracking' | 'open'>('sealed');
  useEffect(() => {
    if (packIsPending) setPackSeal('sealed');
  }, [packIsPending]);
  function handleCrackSeal() {
    if (packSeal !== 'sealed') return;
    setPackSeal('cracking');
    setTimeout(() => setPackSeal('open'), 500);
  }
  const sealedPackOverlay = packIsPending && packSeal !== 'open' && (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-stone-950/95 z-50 p-4 font-pixel select-none crt-screen">
      <div
        onClick={handleCrackSeal}
        className={`relative cursor-pointer ${packSeal === 'sealed' ? 'animate-pack-idle-bob hover:scale-105 transition-transform' : 'animate-pack-crack'}`}
      >
        {draftOffers.length > 0
          ? renderBoosterIcon(`booster_${(draftOffers[0]?.modifier ?? 'standard').toLowerCase()}`, 'JUMBO')
          : renderRuneIcon('JUMBO')}
        {packSeal === 'sealed' && (
          <span className="absolute -top-2 -right-2 text-2xl drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse pointer-events-none">🔒</span>
        )}
        {packSeal === 'cracking' && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-36 rounded-full bg-amber-300/50 blur-2xl animate-pack-burst" />
            </div>
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 text-xl pointer-events-none animate-pack-smoke"
                style={{ '--puff-angle': `${i * 45}deg` } as React.CSSProperties}
              >
                💨
              </span>
            ))}
          </>
        )}
      </div>
      {packSeal === 'sealed' && (
        <p className="mt-6 text-sm text-amber-300/80 font-sans animate-pulse">Mührü kırmak için tıklayın</p>
      )}
    </div>
  );

  const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const diceOverlay = isRerolling && (
    <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none bg-stone-950/30">
      <div className="flex gap-8">
        <span className="text-7xl text-stone-100 animate-dice-tumble" style={{ animationDelay: '0ms' }}>
          {DICE_FACES[diceFaces[0] - 1]}
        </span>
        <span className="text-7xl text-stone-100 animate-dice-tumble" style={{ animationDelay: '90ms' }}>
          {DICE_FACES[diceFaces[1] - 1]}
        </span>
      </div>
    </div>
  );

  const [fuseA, setFuseA] = useState<string | null>(null);
  const [fuseB, setFuseB] = useState<string | null>(null);
  const [hoveredDetails, setHoveredDetails] = useState<{
    name: string;
    type: string;
    description: string;
    rarity?: string;
    cost?: number;
    id: string;
    locked?: boolean;
    rect: { top: number; left: number; right: number; bottom: number };
  } | null>(null);

  // A hovered/pinned offer-card tooltip left floating over the sealed-pack/draft overlays once a
  // purchase opened one of them — the card underneath it is gone (covered by the full-screen
  // overlay) but the tooltip itself had no reason to close, so it just sat there stuck on top.
  useEffect(() => {
    if (packIsPending) setHoveredDetails(null);
  }, [packIsPending]);

  function handleCardEnter(e: React.MouseEvent<HTMLElement>, details: { name: string; type: string; description: string; rarity?: string; cost?: number; id: string }) {
    const r = e.currentTarget.getBoundingClientRect();
    const rect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
    setHoveredDetails((prev) => {
      if (prev?.locked && prev.id === details.id) return prev;
      return { ...details, locked: false, rect };
    });
  }
  function handleCardLeave() {
    setHoveredDetails((prev) => (prev?.locked ? prev : null));
  }
  function handleCardClick(e: React.MouseEvent<HTMLElement>, details: { name: string; type: string; description: string; rarity?: string; cost?: number; id: string }) {
    const r = e.currentTarget.getBoundingClientRect();
    const rect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
    setHoveredDetails((prev) => {
      if (prev?.locked && prev.id === details.id) return null;
      return { ...details, locked: true, rect };
    });
  }

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

  // Split into one labeled section per offer type — instead of two broad rows, each kind of
  // item gets its own clearly-titled area so the player can scan by category rather than a single
  // undifferentiated row of mixed cards.
  const [selectedRuneTargets, setSelectedRuneTargets] = useState<string[]>([]);
  useEffect(() => {
    if (!pendingRune) setSelectedRuneTargets([]);
  }, [pendingRune]);

  function toggleRuneTarget(stoneId: string) {
    setSelectedRuneTargets((prev) => {
      if (prev.includes(stoneId)) return prev.filter((id) => id !== stoneId);
      if (!pendingRune || prev.length >= pendingRune.targetCount) return prev;
      return [...prev, stoneId];
    });
  }  function renderOfferCard(offer: ShopOffer) {
    if (offer.type === 'CHARM') {
      const charm = offer.item as CharmDef;
      const disabled = money < charm.cost || slotsFull;
      const borderClass = charm.curse ? CURSE_BORDER : RARITY_BORDER[charm.rarity];
      const gemClass = charm.curse ? CURSE_GEM : GEM_CLASS[charm.rarity];

      const itemDetails = {
        name: charm.name,
        type: 'Tılsım',
        description: charm.description,
        rarity: charm.rarity,
        cost: charm.cost,
        id: charm.id
      };

      return (
        <div
          key={charm.id}
          onMouseEnter={(e) => handleCardEnter(e, itemDetails)}
          onMouseLeave={handleCardLeave}
          onClick={(e) => handleCardClick(e, itemDetails)}
          className={`balatro-card relative flex flex-col justify-between w-24 h-36 md:w-28 md:h-42 p-2.5 rounded-xl border-2 transition shrink-0 cursor-pointer hover:scale-105 active:scale-95 ${borderClass}`}
        >
          {renderPriceBadge(charm.cost)}
          <div className={`absolute top-2.5 right-2.5 w-3 h-3 rounded-full border border-stone-950/40 z-10 ${gemClass}`} title={charm.curse ? 'Lanetli' : charm.rarity} />

          <div className="flex-1 flex items-center justify-center transform scale-[1.3] origin-center my-auto pointer-events-none">
            {renderCharmIcon(charm.id)}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy(charm.id);
            }}
            disabled={disabled}
            className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-sm md:text-base font-bold font-pixel text-white shadow border-b-2 border-emerald-800 transition cursor-pointer"
          >
            SATIN AL
          </button>
        </div>
      );
    }

    if (offer.type === 'VOUCHER') {
      const voucher = offer.item;
      const disabled = money < voucher.cost;

      const itemDetails = {
        name: voucher.name,
        type: 'Ferman',
        description: voucher.description,
        cost: voucher.cost,
        id: voucher.id
      };

      return (
        <div
          key={voucher.id}
          onMouseEnter={(e) => handleCardEnter(e, itemDetails)}
          onMouseLeave={handleCardLeave}
          onClick={(e) => handleCardClick(e, itemDetails)}
          className="balatro-card relative flex flex-col justify-between w-24 h-36 md:w-28 md:h-42 p-2.5 rounded-xl border-2 border-amber-600/80 bg-amber-950/20 shadow-[0_0_10px_rgba(217,119,6,0.3)] transition shrink-0 cursor-pointer hover:scale-105 active:scale-95"
        >
          {renderPriceBadge(voucher.cost)}
          <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full border border-stone-950/40 z-10 bg-amber-500 shadow-[0_0_8px_#d97706]" title="Ferman" />

          <div className="flex-1 flex items-center justify-center transform scale-[1.3] origin-center my-auto pointer-events-none">
            {renderVoucherIcon(voucher.id)}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy(voucher.id);
            }}
            disabled={disabled}
            className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:pointer-events-none text-sm md:text-base font-bold font-pixel text-white shadow border-b-2 border-amber-800 transition cursor-pointer"
          >
            SATIN AL
          </button>
        </div>
      );
    }

    if (offer.type === 'BOOSTER') {
      const pack = offer.item;
      const disabled = money < pack.cost;

      const itemDetails = {
        name: pack.name,
        type: 'Taş Kesesi',
        description: pack.description,
        cost: pack.cost,
        id: pack.id
      };

      let boosterBorder = 'border-indigo-600/80 bg-indigo-950/20';
      if (pack.id === 'booster_obsidian') boosterBorder = 'border-purple-600/80 bg-purple-950/20';
      else if (pack.id === 'booster_ivory') boosterBorder = 'border-stone-400/80 bg-stone-900/40';
      else if (pack.id === 'booster_amber') boosterBorder = 'border-amber-500/80 bg-amber-950/20';

      return (
        <div
          key={pack.id}
          onMouseEnter={(e) => handleCardEnter(e, itemDetails)}
          onMouseLeave={handleCardLeave}
          onClick={(e) => handleCardClick(e, itemDetails)}
          className={`balatro-card relative flex flex-col justify-between w-24 h-36 md:w-28 md:h-42 p-2.5 rounded-xl border-2 transition shrink-0 cursor-pointer hover:scale-105 active:scale-95 ${boosterBorder}`}
        >
          {renderPriceBadge(pack.cost)}
          <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full border border-stone-950/40 z-10 bg-indigo-500 shadow-[0_0_8px_#6366f1]" title="Kese" />

          <div className="flex-1 flex items-center justify-center transform scale-[0.9] origin-center my-auto pointer-events-none">
            {renderBoosterIcon(pack.id)}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy(pack.id);
            }}
            disabled={disabled}
            className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none text-sm md:text-base font-bold font-pixel text-white shadow border-b-2 border-indigo-850 transition cursor-pointer"
          >
            SATIN AL
          </button>
        </div>
      );
    }

    if (offer.type === 'RUNE_PACK') {
      const pack = offer.item;
      const disabled = money < pack.cost;

      const itemDetails = {
        name: pack.name,
        type: 'Rün Kesesi',
        description: pack.description,
        cost: pack.cost,
        id: pack.id
      };

      return (
        <div
          key={pack.id}
          onMouseEnter={(e) => handleCardEnter(e, itemDetails)}
          onMouseLeave={handleCardLeave}
          onClick={(e) => handleCardClick(e, itemDetails)}
          className="balatro-card relative flex flex-col justify-between w-24 h-36 md:w-28 md:h-42 p-2.5 rounded-xl border-2 border-rose-600/80 bg-rose-950/20 transition shrink-0 cursor-pointer hover:scale-105 active:scale-95"
        >
          {renderPriceBadge(pack.cost)}
          <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full border border-stone-950/40 z-10 bg-rose-500 shadow-[0_0_8px_#f43f5e]" title="Rün Kesesi" />

          <div className="flex-1 flex items-center justify-center transform scale-[0.9] origin-center my-auto pointer-events-none">
            {renderRuneIcon()}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy(pack.id);
            }}
            disabled={disabled}
            className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:pointer-events-none text-sm md:text-base font-bold font-pixel text-white shadow border-b-2 border-rose-850 transition cursor-pointer"
          >
            SATIN AL
          </button>
        </div>
      );
    }

    if (offer.type === 'THEOREM') {
      const book = offer.item;
      const disabled = money < book.cost;
      const borderClass = 'border-rose-600/80 bg-rose-950/20 shadow-[0_0_10px_rgba(244,63,94,0.25)]';

      const itemDetails = {
        name: book.name,
        type: 'Teorem Kitabı',
        description: book.description,
        cost: book.cost,
        id: book.id
      };

      return (
        <div
          key={book.id}
          onMouseEnter={(e) => handleCardEnter(e, itemDetails)}
          onMouseLeave={handleCardLeave}
          onClick={(e) => handleCardClick(e, itemDetails)}
          className={`balatro-card relative flex flex-col justify-between w-24 h-36 md:w-28 md:h-42 p-2.5 rounded-xl border-2 transition shrink-0 cursor-pointer hover:scale-105 active:scale-95 ${borderClass}`}
        >
          {renderPriceBadge(book.cost)}
          <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full border border-stone-950/40 z-10 bg-rose-500 shadow-[0_0_8px_#f43f5e]" title="Teorem Kitabı" />

          <div className="flex-1 flex items-center justify-center text-4xl origin-center my-auto pointer-events-none text-rose-450 drop-shadow">
            📖
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy(book.id);
            }}
            disabled={disabled}
            className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-sm md:text-base font-bold font-pixel text-white shadow border-b-2 border-emerald-800 transition cursor-pointer"
          >
            SATIN AL
          </button>
        </div>
      );
    }

    const upgrade = offer.item;
    const disabled = money < upgrade.cost;
    const borderClass = 'border-teal-700/80 bg-teal-950/20';
    const gemColor = 'bg-teal-400 shadow-[0_0_8px_#2dd4bf]';

    const itemDetails = {
      name: upgrade.name,
      type: 'Büyü',
      description: upgrade.description,
      cost: upgrade.cost,
      id: upgrade.id
    };

    return (
      <div
        key={upgrade.id}
        onMouseEnter={(e) => handleCardEnter(e, itemDetails)}
          onMouseLeave={handleCardLeave}
          onClick={(e) => handleCardClick(e, itemDetails)}
        className={`balatro-card relative flex flex-col justify-between w-24 h-36 md:w-28 md:h-42 p-2.5 rounded-xl border-2 transition shrink-0 cursor-pointer hover:scale-105 active:scale-95 ${borderClass}`}
      >
        {renderPriceBadge(upgrade.cost)}
        <div className={`absolute top-2.5 right-2.5 w-3 h-3 rounded-full border border-stone-950/40 z-10 ${gemColor}`} title="Büyü" />

        <div className="flex-1 flex items-center justify-center transform scale-[1.3] origin-center my-auto pointer-events-none">
          {renderUpgradeIcon(upgrade.id)}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBuy(upgrade.id);
          }}
          disabled={disabled}
          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-sm md:text-base font-bold font-pixel text-white shadow border-b-2 border-emerald-800 transition cursor-pointer"
        >
          SATIN AL
        </button>
      </div>
    );
  }

  // Common Draft Kese Modal Overlay — only revealed once the pack's seal has been cracked open.
  const draftOverlay = draftOffers && draftOffers.length > 0 && packSeal === 'open' && (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-stone-950/95 z-50 p-4 font-pixel select-none crt-screen">
      <h2 className="text-2xl md:text-3xl text-amber-300 mb-2 drop-shadow-[0_0_10px_#fbbf24] animate-pulse">KESE AÇILIYOR</h2>
      <p className="text-sm text-stone-400 mb-8 font-sans">Taş kesesinden destenize kalıcı olarak eklemek için 1 adet taş seçin.</p>
      
      <div className="flex gap-4 justify-center items-center mb-8">
        {draftOffers.map((stone, i) => {
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
          const fanOffset = (i - (draftOffers.length - 1) / 2) * 6;

          return (
            <div
              key={stone.id}
              onClick={() => onDraftSelect(stone.id)}
              style={{ '--fan-rot': `${fanOffset}deg`, animationDelay: `${i * 90}ms` } as React.CSSProperties}
              className={`flex flex-col items-center justify-between p-3.5 w-24 h-36 md:w-30 md:h-44 rounded-2xl border-2 cursor-pointer transform hover:scale-105 active:scale-95 transition animate-pack-fan-in ${modifierBorder}`}
            >
              <span className="text-[9.5px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-stone-950/80 mb-2 text-white">
                {modifierLabel}
              </span>
              
              {/* Domino stone representation */}
              <div className="flex-1 flex flex-col justify-center items-center gap-1.5">
                <div className="flex gap-1.5 items-center justify-center">
                  <span className="text-lg md:text-2xl font-bold text-white bg-stone-950/50 px-2 py-0.5 rounded">{stone.leftVal}</span>
                  <span className="text-stone-400">|</span>
                  <span className="text-lg md:text-2xl font-bold text-white bg-stone-950/50 px-2 py-0.5 rounded">{stone.rightVal}</span>
                </div>
              </div>
              
              <span className="text-[11px] text-emerald-400 font-bold mt-2">SEÇ</span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onSkipDraft}
        className="px-6 py-2 rounded-xl border border-stone-700 bg-stone-900/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-sm font-pixel uppercase tracking-widest transition"
      >
        Atla
      </button>
    </div>
  );

  // Rün Kesesi — Step 1: pick exactly 1 of 3 random rune options. Only revealed once the pack's
  // seal has been cracked open.
  const runePackOverlay = runeOffers.length > 0 && packSeal === 'open' && (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-stone-950/95 z-50 p-4 font-pixel select-none crt-screen">
      <h2 className="text-2xl md:text-3xl text-rose-350 mb-2 drop-shadow-[0_0_10px_#fb7185] animate-pulse">RÜN KESESİ AÇILIYOR</h2>
      <p className="text-sm text-stone-400 mb-8 font-sans">Bir rün seçin — seçtiğiniz rün, birden fazla taşınıza birden uygulanabilir.</p>

      <div className="flex gap-4 justify-center items-center mb-8 flex-wrap">
        {runeOffers.map((rune, i) => (
          <div
            key={rune.id}
            onClick={() => onChooseRune(rune.id)}
            style={{ '--fan-rot': `${(i - (runeOffers.length - 1) / 2) * 6}deg`, animationDelay: `${i * 90}ms` } as React.CSSProperties}
            className="flex flex-col items-center justify-between p-3.5 w-32 h-44 md:w-36 md:h-48 rounded-2xl border-2 border-rose-600/70 bg-rose-950/30 shadow-[0_0_15px_rgba(225,29,72,0.3)] cursor-pointer transform hover:scale-105 active:scale-95 transition text-center animate-pack-fan-in"
          >
            <span className="text-[12px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-stone-950/80 text-rose-300">
              {rune.targetCount} taşa uygulanır
            </span>
            <span className="flex-1 flex items-center justify-center text-base font-bold text-white leading-tight px-1">
              {rune.name}
            </span>
            <p className="text-[11px] text-stone-300 font-sans leading-snug mb-2">{rune.description}</p>
            <span className="text-[11px] text-emerald-400 font-bold">SEÇ</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onSkipRunePack}
        className="px-6 py-2 rounded-xl border border-stone-700 bg-stone-900/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-sm font-pixel uppercase tracking-widest transition"
      >
        Atla
      </button>
    </div>
  );

  // Rün Kesesi — Step 2: pick up to `pendingRune.targetCount` existing customDeck stones to apply it to.
  const runeTargetOverlay = pendingRune && (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-stone-950/95 z-50 p-4 font-pixel select-none crt-screen">
      <h2 className="text-2xl md:text-3xl text-rose-350 mb-1 drop-shadow-[0_0_10px_#fb7185]">{pendingRune.name}</h2>
      <p className="text-sm text-stone-400 mb-4 font-sans text-center max-w-md">
        Destenizden {pendingRune.targetCount} taşa kadar seçin ({selectedRuneTargets.length}/{pendingRune.targetCount} seçildi).
      </p>

      <div className="flex-1 min-h-0 w-full max-w-2xl overflow-y-auto flex flex-wrap gap-2 justify-center items-start content-start px-2 mb-4">
        {customDeck.map((stone) => {
          const isSelected = selectedRuneTargets.includes(stone.id);
          return (
            <div
              key={stone.id}
              onClick={() => toggleRuneTarget(stone.id)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 cursor-pointer transition select-none shrink-0 ${
                isSelected ? 'border-rose-400 bg-rose-950/40 shadow-[0_0_10px_rgba(251,113,133,0.4)]' : 'border-stone-800 bg-stone-900/40 hover:border-stone-600'
              }`}
            >
              <span className="text-base font-bold text-white bg-stone-950/60 px-1.5 py-0.5 rounded">{stone.leftVal}</span>
              <span className="text-stone-500 text-sm">|</span>
              <span className="text-base font-bold text-white bg-stone-950/60 px-1.5 py-0.5 rounded">{stone.rightVal}</span>
              {stone.modifier && stone.modifier !== 'NORMAL' && (
                <span className="text-[10px] text-amber-300 font-bold ml-1 uppercase">{stone.modifier}</span>
              )}
            </div>
          );
        })}
        {customDeck.length === 0 && <span className="text-sm text-stone-500 font-sans">Destenizde taş yok.</span>}
      </div>

      <div className="flex gap-3 shrink-0">
        <button
          type="button"
          onClick={onSkipRunePack}
          className="px-6 py-2.5 rounded-xl border border-stone-700 bg-stone-900/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-sm font-pixel uppercase tracking-widest transition"
        >
          Vazgeç
        </button>
        <button
          type="button"
          disabled={selectedRuneTargets.length === 0}
          onClick={() => onApplyRune(selectedRuneTargets)}
          className="px-8 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:pointer-events-none text-sm font-pixel font-bold text-white shadow border-b-2 border-rose-850 uppercase tracking-widest transition"
        >
          Uygula
        </button>
      </div>
    </div>
  );

  // Details panel: hovering (or clicking, to lock it open) a card's body — never the "SATIN AL"
  // button, which stops propagation — opens this beside THAT specific card. Positioned via the
  // card's own measured rect (captured on hover/click) rather than CSS-nested inside the card, so
  // it always paints in front of every other card (a single top-level fixed element can't be
  // occluded by unrelated sibling cards the way a nested per-card panel could).
  const PANEL_WIDTH = 320;
  const PANEL_GAP = 12;
  let detailsPanel: React.ReactNode = null;
  if (hoveredDetails) {
    const isCharmDetails = hoveredDetails.type === 'Tılsım';
    const overflowsRight = hoveredDetails.rect.right + PANEL_GAP + PANEL_WIDTH > window.innerWidth;
    const left = overflowsRight
      ? Math.max(8, hoveredDetails.rect.left - PANEL_WIDTH - PANEL_GAP)
      : hoveredDetails.rect.right + PANEL_GAP;
    const cardHeight = hoveredDetails.rect.bottom - hoveredDetails.rect.top;
    const top = Math.min(
      Math.max(8, hoveredDetails.rect.top + cardHeight / 2 - 140),
      window.innerHeight - 300
    );
    detailsPanel = (
      <div
        className={`fixed z-[9999] w-80 bg-stone-950/95 border-3 rounded-2xl p-5 flex flex-col gap-3 font-sans select-none cursor-auto animate-fade-in ${
          isCharmDetails ? 'border-amber-600/80 shadow-[0_0_30px_rgba(217,119,6,0.65)]' : 'border-cyan-500/80 shadow-[0_0_30px_rgba(6,182,212,0.65)]'
        }`}
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex flex-col gap-1 border-b pb-2 ${isCharmDetails ? 'border-amber-800/30' : 'border-cyan-800/30'}`}>
          <span className={`font-pixel text-2xl font-black tracking-wider uppercase ${isCharmDetails ? 'text-amber-200' : 'text-cyan-400'}`}>
            {hoveredDetails.name}
          </span>
          <div className="flex items-center gap-2">
            <span className="bg-stone-900 px-2 py-0.5 rounded text-[12px] font-bold text-stone-400 border border-stone-800 uppercase tracking-widest">
              {hoveredDetails.type}
            </span>
            {hoveredDetails.rarity && (
              <span className={`text-[12px] font-extrabold tracking-widest uppercase ${
                hoveredDetails.rarity === 'LEGENDARY' ? 'text-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]' :
                hoveredDetails.rarity === 'RARE' ? 'text-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' :
                hoveredDetails.rarity === 'UNCOMMON' ? 'text-teal-400' : 'text-stone-400'
              }`}>
                {hoveredDetails.rarity}
              </span>
            )}
          </div>
        </div>
        <p className="text-base leading-relaxed text-stone-200 py-1 font-outfit">
          {hoveredDetails.description}
        </p>
        {hoveredDetails.cost !== undefined && (
          <div className={`flex items-center justify-between text-sm border-t pt-2 font-pixel ${isCharmDetails ? 'text-amber-400/80 border-amber-800/20' : 'text-cyan-400/80 border-cyan-800/20'}`}>
            <span>Maliyet: ${hoveredDetails.cost}</span>
          </div>
        )}
      </div>
    );
  }

  if (isPortrait) {
    return (
      <div className="relative w-full h-full flex flex-col bg-stone-900 border-2 border-stone-950 p-3 gap-3 select-none overflow-y-auto">
        {/* Controls */}
        <div className="flex gap-3 shrink-0 flex-row items-center">
          <div className="rounded-xl border-4 border-amber-800 bg-linear-to-b from-amber-700 to-amber-900 text-center shadow-md flex-1 py-2">
            <h2 className="font-black text-amber-50 font-pixel tracking-widest uppercase shop-neon text-2xl">
              MAĞAZA
            </h2>
            <p className="text-[12px] font-pixel text-amber-200/80 mt-1">
              Deste: <span className="font-bold text-amber-100">{deckSize}</span> taş
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onContinue}
              className="btn-arcade btn-arcade-green px-5 py-3 rounded-xl text-base font-pixel font-black text-white uppercase animate-pulse"
            >
              Sonraki Tur
            </button>
            <button
              type="button"
              onClick={handleRerollClick}
              disabled={money < rerollCost || isRerolling}
              className="btn-arcade btn-arcade-slate px-5 py-3 rounded-xl text-base font-pixel font-black text-white uppercase"
            >
              Yenile (${rerollCost})
            </button>
          </div>
        </div>

        {activeTag && (
          <div className="flex items-center gap-2.5 bg-stone-950/80 border border-amber-500/30 rounded-xl px-4 py-2 shadow-lg animate-pulse shrink-0 self-center">
            <span className="text-4xl">{activeTag.icon}</span>
            <div className="flex flex-col leading-tight select-none">
              <span className="font-pixel text-sm font-black text-amber-300 uppercase tracking-widest">
                Aktif Etiket: {activeTag.name}
              </span>
              <span className="text-[12px] text-stone-400 font-sans mt-0.5">
                {activeTag.description}
              </span>
            </div>
          </div>
        )}

        {/* Offers & Fusion stacked in Portrait */}
        <div className="flex-1 bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <h3 className="text-base font-bold uppercase tracking-wider text-stone-400">Teklifler</h3>
            {slotsFull && (
              <span className="text-[13px] text-amber-400 font-bold uppercase animate-pulse">Slotlar Dolu!</span>
            )}
          </div>

          {/* Offers rack — Balatro's own shop is one flat row of a handful of cards (2 jokers,
              1-2 packs, sometimes a voucher), not sorted into category panels. */}
          <div className="flex flex-row flex-wrap gap-3 justify-center items-start shrink-0">
            <Fragment key={rerollKey}>{offers.map((offer, i) => (<div key={i} className="animate-shop-card-in" style={{ animationDelay: `${i * 70}ms` }}>{renderOfferCard(offer)}</div>))}</Fragment>
          </div>

          {/* Fusion in Portrait */}
          <div className="border-t border-stone-800/50 pt-3 mt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 font-pixel mb-2">Garabet Füzyon Ocağı</h3>
            {ownedCharms.length < 2 ? (
              <p className="text-[11.5px] text-stone-500 italic font-sans text-center">En az 2 tılsımınız olmalı.</p>
            ) : (
              <div className="flex flex-col gap-3 bg-stone-950/30 p-3 rounded-xl border border-stone-900/50">
                {/* Inventory */}
                <div>
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Tılsım Seç:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {eligibleOwnedCharms.map((charm) => (
                      <button
                        key={charm.id}
                        type="button"
                        onClick={() => handleFuseCharmSelect(charm.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-left text-[12px] transition ${
                          fuseA === charm.id || fuseB === charm.id ? 'border-amber-400 bg-amber-950/30 text-amber-300 font-bold' : 'border-stone-800 bg-stone-900/40 text-stone-400'
                        }`}
                      >
                        <span className="text-sm">{renderCharmIcon(charm.id)}</span>
                        <span>{charm.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slots */}
                <div className="flex justify-center items-center gap-2">
                  <div className="w-12 h-14 border rounded flex items-center justify-center text-sm bg-stone-900 border-stone-800">
                    {fuseA ? renderCharmIcon(fuseA) : '?'}
                  </div>
                  <span className="text-stone-600 font-pixel">+</span>
                  <div className="w-12 h-14 border rounded flex items-center justify-center text-sm bg-stone-900 border-stone-800">
                    {fuseB ? renderCharmIcon(fuseB) : '?'}
                  </div>
                  <span className="text-stone-600 font-pixel">=</span>
                  <div className="w-12 h-14 border rounded flex items-center justify-center text-sm bg-stone-900 border-stone-800">
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
                    className={`w-full py-2.5 rounded-lg text-sm font-pixel font-bold text-white transition ${
                      canFuse ? 'bg-amber-600 hover:bg-amber-500 border-b-2 border-amber-800' : 'bg-stone-850 opacity-40'
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
        {runePackOverlay}
        {runeTargetOverlay}
        {detailsPanel}
        {sealedPackOverlay}
        {diceOverlay}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // LANDSCAPE LAYOUT (Zero scroll on page, columns side-by-side)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-row bg-stone-900 border-4 border-stone-950 p-2 md:p-3 lg:p-4 gap-2 md:gap-3 lg:gap-4 select-none overflow-hidden rounded-3xl relative felt-board">
      {/* 1. Left Side: Controls & Wood Sign */}
      <div className="w-28 md:w-32 lg:w-40 flex flex-col justify-between shrink-0 h-full">
        {/* Carved wooden shop sign */}
        <div className="rounded-xl border-4 border-amber-800 bg-linear-to-b from-amber-700 to-amber-900 text-center shadow-md p-3">
          <h2 className="font-black text-amber-50 font-pixel tracking-widest uppercase shop-neon text-xl md:text-2xl lg:text-3xl">
            MAĞAZA
          </h2>
          <p className="text-[12px] font-pixel text-amber-200/80 mt-1">
            Deste: <span className="font-bold text-amber-100">{deckSize}</span> taş
          </p>
        </div>

        {/* Balance Badge */}
        <div className="bg-stone-950/90 border border-stone-800 p-2.5 rounded-xl text-center shadow-inner">
          <span className="block text-[10px] text-stone-500 font-pixel uppercase tracking-widest mb-0.5">Bakiye</span>
          <span className="font-pixel text-2xl md:text-3xl text-emerald-400 font-black">💰 ${money}</span>
        </div>

        {/* Active Tag */}
        {activeTag && (
          <div className="bg-stone-950 border border-amber-500/25 p-2 rounded-xl text-center shadow-md animate-pulse">
            <span className="block text-[9.5px] text-stone-500 font-pixel uppercase tracking-widest mb-0.5">Aktif Etiket</span>
            <div className="text-2xl my-1">{activeTag.icon}</div>
            <span className="font-pixel text-[12px] text-amber-300 font-bold block leading-tight">{activeTag.name}</span>
            <span className="text-[9.5px] text-stone-400 block leading-tight mt-1">{activeTag.description}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-auto w-full">
          {/* Next Round Button (Green, matching cash out continue button) */}
          <button
            type="button"
            onClick={onContinue}
            className="btn-arcade btn-arcade-green w-full py-2.5 md:py-3 lg:py-4 rounded-xl text-sm md:text-base font-pixel font-black text-white uppercase animate-pulse"
          >
            Sonraki Tur
          </button>

          {/* Reroll Button (Slate, matching controls) */}
          <button
            type="button"
            onClick={handleRerollClick}
            disabled={money < rerollCost || isRerolling}
            className="btn-arcade btn-arcade-slate w-full py-2.5 md:py-3 lg:py-4 rounded-xl text-sm md:text-base font-pixel font-black text-white"
          >
            Yenile (${rerollCost})
          </button>
        </div>
      </div>

      {/* 2. Middle Column: Shop Offers Rack — Balatro's own shop is one flat row of a handful of
          cards (2 jokers, 1-2 packs, sometimes a voucher), never sorted into category panels. */}
      <div className="flex-1 bg-stone-950/75 border border-stone-800/80 rounded-2xl p-2 md:p-3 lg:p-4 flex flex-col h-full min-w-0 min-h-0 shop-parchment-bg">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2 shrink-0">
          <h3 className="text-base font-bold uppercase tracking-wider text-stone-400">Teklifler</h3>
          {slotsFull && (
            <span className="text-[13px] text-amber-400 font-bold uppercase animate-pulse">
              Tılsım Slotları Dolu!
            </span>
          )}
        </div>

        <div className="flex-1 mt-3 flex flex-row flex-wrap gap-3 justify-center items-center content-center min-h-0 overflow-y-auto">
          <Fragment key={rerollKey}>{offers.map((offer, i) => (<div key={i} className="animate-shop-card-in" style={{ animationDelay: `${i * 70}ms` }}>{renderOfferCard(offer)}</div>))}</Fragment>
        </div>
      </div>

      {/* 3. Right Column: Fusion Forge (Side-by-side setup) */}
      <div className="w-64 md:w-72 lg:w-80 xl:w-96 bg-stone-950/75 border border-stone-800/80 rounded-2xl p-2 md:p-3 lg:p-4 flex flex-col shrink-0 h-full min-h-0">
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2 shrink-0 select-none">
          <span className="text-lg">🏛️</span>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-amber-500 font-pixel">
            Garabet Füzyon Ocağı
          </h3>
        </div>

        {ownedCharms.length < 2 ? (
          <div className="flex-1 flex items-center justify-center py-4 bg-stone-900/10 border border-stone-900/40 rounded-xl mt-3">
            <p className="text-[12px] font-sans text-stone-500 italic text-center px-4 leading-normal">
              Füzyon ocağını kullanmak için en az 2 tılsıma sahip olmalısınız.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col mt-3 gap-3 min-h-0">
            {/* Charm Inventory Selector */}
            <div className="flex-1 flex flex-col min-h-0">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block shrink-0">
                1. Tılsımlarını Seç:
              </span>
              <div className="flex-1 overflow-y-auto mt-1 max-h-56 border border-stone-900 bg-stone-950/30 p-2.5 rounded-xl flex flex-col gap-1.5 animate-fade-in pr-1">
                {eligibleOwnedCharms.length === 0 ? (
                  <p className="text-[11.5px] text-stone-500 italic font-sans leading-relaxed">
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
                            : 'border-stone-800 bg-stone-900/40 text-stone-400 hover:bg-stone-800 hover:text-white',
                        ].join(' ')}
                      >
                        <span className="text-base shrink-0 leading-none">{renderCharmIcon(charm.id)}</span>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-pixel leading-tight">{charm.name}</span>
                          <span className="text-[10px] text-stone-500 font-sans leading-none mt-0.5">
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
            <div className="border border-stone-900/80 bg-stone-950/40 p-2.5 rounded-xl shrink-0 flex flex-col items-center">
              <span className="text-[11px] font-bold text-stone-455 uppercase tracking-wider block mb-1.5 text-center">
                2. Sinerji Reçetesi
              </span>
              <div className="flex items-center gap-3">
                {/* Slot A */}
                <div className={[
                  'w-11 h-14 rounded-lg border flex flex-col items-center justify-center p-1 text-center transition shrink-0',
                  fuseA ? 'border-amber-500/50 bg-amber-950/10' : 'border-dashed border-stone-800 bg-stone-900/10'
                ].join(' ')}>
                  {fuseA ? (
                    <>
                      <span className="text-sm shrink-0 leading-none">{renderCharmIcon(fuseA)}</span>
                      <span className="text-[9px] font-pixel text-stone-350 leading-tight truncate w-full mt-0.5">
                        {ownedCharms.find(c => c.id === fuseA)?.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-stone-650 font-pixel">Boş</span>
                  )}
                </div>

                <span className="text-stone-650 font-bold font-pixel text-base select-none">+</span>

                {/* Slot B */}
                <div className={[
                  'w-11 h-14 rounded-lg border flex flex-col items-center justify-center p-1 text-center transition shrink-0',
                  fuseB ? 'border-amber-500/50 bg-amber-950/10' : 'border-dashed border-stone-800 bg-stone-900/10'
                ].join(' ')}>
                  {fuseB ? (
                    <>
                      <span className="text-sm shrink-0 leading-none">{renderCharmIcon(fuseB)}</span>
                      <span className="text-[9px] font-pixel text-stone-350 leading-tight truncate w-full mt-0.5">
                        {ownedCharms.find(c => c.id === fuseB)?.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-stone-650 font-pixel">Boş</span>
                  )}
                </div>

                <span className="text-stone-650 font-bold font-pixel text-base select-none">=</span>

                {/* Result Preview */}
                <div className={[
                  'w-11 h-14 rounded-lg border flex flex-col items-center justify-center p-1 text-center transition shrink-0',
                  resultCharm ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_8px_rgba(16,185,129,0.2)] animate-pulse' : 'border-dashed border-stone-800 bg-stone-900/10'
                ].join(' ')}>
                  {resultCharm ? (
                    <>
                      <span className="text-sm shrink-0 leading-none">{renderCharmIcon(resultCharm.id)}</span>
                      <span className="text-[9px] font-pixel text-emerald-400 font-bold leading-tight truncate w-full mt-0.5">
                        {resultCharm.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-stone-650 font-pixel">?</span>
                  )}
                </div>
              </div>
            </div>

            {/* Fusion Action Bar */}
            <div className="shrink-0 flex flex-col gap-1 border-t border-stone-900 pt-2.5">
              {resultCharm ? (
                <div className="flex flex-col gap-2">
                  <div className="bg-stone-900/20 border border-stone-900 p-2 rounded-lg text-center">
                    <span className="text-[10.5px] font-pixel text-emerald-400 font-bold block mb-0.5">YENİ HİBRİT TILSIM</span>
                    <p className="text-[10px] text-stone-350 font-sans leading-tight">
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
                      'w-full py-2.5 rounded-xl text-sm font-pixel font-bold text-white shadow border-b-2 transition cursor-pointer select-none',
                      canFuse
                        ? 'bg-amber-600 hover:bg-amber-500 border-amber-800 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                        : 'bg-stone-850 border-stone-950 opacity-40 cursor-default text-stone-400'
                    ].join(' ')}
                  >
                    {activeRecipe && money >= activeRecipe.cost ? `BİRLEŞTİR ($${activeRecipe.cost})` : `YETERSİZ PARA ($${activeRecipe?.cost ?? ''})`}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 rounded-xl bg-stone-850 border-stone-950 opacity-40 text-sm font-pixel font-bold text-stone-500 cursor-default border-b-2"
                >
                  FÜZYON YAPILAMAZ
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {draftOverlay}
      {runePackOverlay}
      {runeTargetOverlay}
      {detailsPanel}
      {sealedPackOverlay}
      {diceOverlay}
    </div>
  );
}
