import type { CharmDef } from '../../models/Charm.js';
import type { ShopOffer, FusionRecipe } from '../../game/RunState.js';
import { FUSION_RECIPES } from '../../game/RunState.js';
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
  draftOffers: any[];
  onDraftSelect: (stoneId: string) => void;
  onFuse?: (charmAId: string, charmBId: string) => void;
  fusedCharmIds?: string[];
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
  if (id === 'cosmic_add') {
    return (
      <svg className="w-10 h-14 animate-pulse" viewBox="0 0 100 130">
        <defs>
          <radialGradient id="cosmic-glow-add" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="130" fill="url(#cosmic-glow-add)" />
        <circle cx="50" cy="65" r="30" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray="4 2" />
        <path d="M50 45 L50 85 M30 65 L70 65" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
        <circle cx="25" cy="30" r="2" fill="#FBBF24" />
        <circle cx="75" cy="100" r="3" fill="#FBBF24" />
      </svg>
    );
  }
  if (id === 'cosmic_sub') {
    return (
      <svg className="w-10 h-14 animate-pulse" viewBox="0 0 100 130">
        <defs>
          <radialGradient id="cosmic-glow-sub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="130" fill="url(#cosmic-glow-sub)" />
        <circle cx="50" cy="65" r="30" fill="none" stroke="#EF4444" strokeWidth="4" strokeDasharray="4 2" />
        <path d="M30 65 L70 65" stroke="#EF4444" strokeWidth="8" strokeLinecap="round" />
        <circle cx="35" cy="100" r="2" fill="#FBBF24" />
        <circle cx="65" cy="30" r="3" fill="#FBBF24" />
      </svg>
    );
  }
  if (id === 'cosmic_mul') {
    return (
      <svg className="w-10 h-14 animate-pulse" viewBox="0 0 100 130">
        <defs>
          <radialGradient id="cosmic-glow-mul" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="130" fill="url(#cosmic-glow-mul)" />
        <circle cx="50" cy="65" r="30" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="4 2" />
        <path d="M35 50 L65 80 M65 50 L35 80" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round" />
        <circle cx="20" cy="80" r="2" fill="#FBBF24" />
        <circle cx="80" cy="40" r="3" fill="#FBBF24" />
      </svg>
    );
  }
  if (id === 'cosmic_div') {
    return (
      <svg className="w-10 h-14 animate-pulse" viewBox="0 0 100 130">
        <defs>
          <radialGradient id="cosmic-glow-div" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="130" fill="url(#cosmic-glow-div)" />
        <circle cx="50" cy="65" r="30" fill="none" stroke="#06B6D4" strokeWidth="4" strokeDasharray="4 2" />
        <path d="M40 85 L60 45" stroke="#06B6D4" strokeWidth="8" strokeLinecap="round" />
        <circle cx="50" cy="45" r="5" fill="#06B6D4" />
        <circle cx="50" cy="85" r="5" fill="#06B6D4" />
      </svg>
    );
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
  draftOffers,
  onDraftSelect,
}: ShopScreenProps) {
  const slotsFull = ownedCharms.length >= maxCharmSlots;

  return (
    <div className={`w-full h-full flex ${isPortrait ? 'flex-col' : 'flex-row'} bg-stone-900 border-2 border-stone-950 p-3 gap-3 select-none overflow-y-auto`}>
      {/* Controls: a column beside the rack on landscape, a row above it on portrait */}
      <div className={`flex gap-3 shrink-0 ${isPortrait ? 'flex-row items-center' : 'flex-col w-36 justify-center'}`}>
        {/* Carved wooden shop sign */}
        <div className={`rounded-xl border-4 border-amber-800 bg-linear-to-b from-amber-700 to-amber-900 text-center shadow-md ${isPortrait ? 'flex-1 py-2' : 'p-3'}`}>
          <h2 className={`font-black text-amber-50 font-pixel tracking-widest uppercase shop-neon ${isPortrait ? 'text-xl' : 'text-3xl'}`}>
            MAĞAZA
          </h2>
        </div>

        <div className={isPortrait ? 'flex gap-2 shrink-0' : 'flex flex-col gap-2'}>
          {/* Next Round Button (Red, matching screenshot) */}
          <button
            type="button"
            onClick={onContinue}
            className={`${isPortrait ? 'flex-1' : 'w-full'} py-3.5 rounded-xl bg-red-600 hover:bg-red-500 active:translate-y-0.5 text-sm font-pixel font-bold text-white shadow-lg border-b-4 border-red-800 transition uppercase`}
          >
            Sonraki Tur
          </button>

          {/* Reroll Button (Green, matching screenshot) */}
          <button
            type="button"
            onClick={onReroll}
            disabled={money < rerollCost}
            className={`${isPortrait ? 'flex-1' : 'w-full'} py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-sm font-pixel font-bold text-white disabled:opacity-30 border-b-4 border-emerald-800 transition uppercase`}
          >
            Yenile (${rerollCost})
          </button>
        </div>
      </div>

      {/* Main Rack Box (Matches the screenshot dark cards box) */}
      <div className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between min-h-0">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Teklifler</h3>
          {slotsFull && (
            <span className="text-[11px] text-amber-400 font-bold uppercase animate-pulse">
              Tılsım Slotları Dolu!
            </span>
          )}
        </div>

        <div className="flex-1 mt-3 flex flex-row flex-wrap gap-3 overflow-x-auto overflow-y-auto items-center justify-center">
          {offers.map((offer) => {
            if (offer.type === 'CHARM') {
              const charm = offer.item;
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
                <InfoTooltip key={charm.id} text={tooltipContent} widthClass="w-56" side="top">
                  <div
                    className={`balatro-card relative flex flex-col justify-between w-30 h-46 md:w-36 md:h-56 p-2.5 rounded-xl border-2 transition shrink-0 ${borderClass}`}
                  >
                    {/* Rarity Gem indicator */}
                    <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-950/40 z-10 ${gemClass}`} title={charm.curse ? 'Lanetli' : charm.rarity} />

                    {/* Massive visual card art */}
                    <div className="flex-1 flex items-center justify-center transform scale-[2.1] origin-center my-auto pointer-events-none">
                      {renderCharmIcon(charm.id)}
                    </div>

                    <button
                      type="button"
                      onClick={() => onBuy(charm.id)}
                      disabled={disabled}
                      className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-[9.5px] md:text-[11px] font-bold font-pixel text-white shadow border-b-2 border-emerald-800 transition"
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
                    <span className="text-[8.5px] uppercase font-extrabold text-amber-500">VOUCHER</span>
                  </div>
                  <p className="text-[10px] text-slate-200 leading-relaxed">
                    {voucher.description}
                  </p>
                </div>
              );

              return (
                <InfoTooltip key={voucher.id} text={tooltipContent} widthClass="w-56" side="top">
                  <div
                    className="balatro-card relative flex flex-col justify-between w-30 h-46 md:w-36 md:h-56 p-2.5 rounded-xl border-2 border-amber-600/80 bg-amber-950/20 shadow-[0_0_10px_rgba(217,119,6,0.3)] transition shrink-0"
                  >
                    {/* Rarity Gem indicator (Voucher gold gem) */}
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-950/40 z-10 bg-amber-500 shadow-[0_0_8px_#d97706]" title="Voucher" />

                    {/* Massive visual card art */}
                    <div className="flex-1 flex items-center justify-center transform scale-[2.1] origin-center my-auto pointer-events-none">
                      {renderVoucherIcon(voucher.id)}
                    </div>

                    <button
                      type="button"
                      onClick={() => onBuy(voucher.id)}
                      disabled={disabled}
                      className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:pointer-events-none text-[9.5px] md:text-[11px] font-bold font-pixel text-white shadow border-b-2 border-amber-800 transition"
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
                    <span className="text-[8.5px] uppercase font-extrabold text-indigo-400 font-pixel">PAKET</span>
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
                <InfoTooltip key={pack.id} text={tooltipContent} widthClass="w-56" side="top">
                  <div
                    className={`balatro-card relative flex flex-col justify-between w-30 h-46 md:w-36 md:h-56 p-2.5 rounded-xl border-2 ${boosterBorder} transition shrink-0`}
                  >
                    {/* Rarity Gem indicator (Booster indigo gem) */}
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-950/40 z-10 bg-indigo-500 shadow-[0_0_8px_#6366f1]" title="Booster" />

                    {/* Massive visual card art */}
                    <div className="flex-1 flex items-center justify-center transform scale-[1.3] origin-center my-auto pointer-events-none">
                      {renderBoosterIcon(pack.id)}
                    </div>

                    <button
                      type="button"
                      onClick={() => onBuy(pack.id)}
                      disabled={disabled}
                      className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none text-[9.5px] md:text-[11px] font-bold font-pixel text-white shadow border-b-2 border-indigo-850 transition"
                    >
                      SATIN AL ${pack.cost}
                    </button>
                  </div>
                </InfoTooltip>
              );
            }

            const upgrade = offer.item;
            const disabled = money < upgrade.cost;
            const borderClass =
              upgrade.type === 'COSMIC'
                ? 'border-amber-600/80 bg-amber-950/20'
                : 'border-teal-700/80 bg-teal-950/20';
            const labelColor = upgrade.type === 'COSMIC' ? 'text-amber-400' : 'text-teal-400';
            
            const tooltipContent = (
              <div className="flex flex-col gap-1.5 p-1 select-none text-left leading-normal font-sans">
                <div className="flex items-center justify-between border-b border-amber-800/40 pb-1">
                  <span className="font-bold text-xs text-amber-200">{upgrade.name}</span>
                  <span className={`text-[8.5px] uppercase font-extrabold ${labelColor}`}>
                    {upgrade.type === 'COSMIC' ? 'KOZMİK' : 'BÜYÜ'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-200 leading-relaxed">
                  {upgrade.description}
                </p>
              </div>
            );

            const gemColor = upgrade.type === 'COSMIC' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-teal-400 shadow-[0_0_8px_#2dd4bf]';

            return (
              <InfoTooltip key={upgrade.id} text={tooltipContent} widthClass="w-56" side="top">
                <div
                  className={`balatro-card relative flex flex-col justify-between w-30 h-46 md:w-36 md:h-56 p-2.5 rounded-xl border-2 transition shrink-0 ${borderClass}`}
                >
                  {/* Rarity Gem indicator */}
                  <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-950/40 z-10 ${gemColor}`} title={upgrade.type === 'COSMIC' ? 'Kozmik' : 'Büyü'} />

                  {/* Massive visual card art */}
                  <div className="flex-1 flex items-center justify-center transform scale-[2.1] origin-center my-auto pointer-events-none">
                    {renderUpgradeIcon(upgrade.id)}
                  </div>

                  <button
                    type="button"
                    onClick={() => onBuy(upgrade.id)}
                    disabled={disabled}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-[9.5px] md:text-[11px] font-bold font-pixel text-white shadow border-b-2 border-emerald-800 transition"
                  >
                    SATIN AL ${upgrade.cost}
                  </button>
                </div>
              </InfoTooltip>
            );
          })}
          {offers.length === 0 && (
            <div className="w-full h-32 flex items-center justify-center border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs font-mono text-slate-500">Tüm teklifler satın alındı.</p>
            </div>
          )}
        </div>
      </div>

      {draftOffers && draftOffers.length > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-50 p-4 font-pixel select-none crt-screen">
          <h2 className="text-xl md:text-2xl text-amber-300 mb-2 drop-shadow-[0_0_10px_#fbbf24] animate-pulse">PAKET AÇILIYOR</h2>
          <p className="text-xs text-slate-400 mb-8 font-sans">Destenize kalıcı olarak eklemek için 1 adet taş seçin.</p>
          
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
      )}
    </div>
  );
}
