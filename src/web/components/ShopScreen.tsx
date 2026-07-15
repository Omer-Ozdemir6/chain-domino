import type { CharmDef } from '../../models/Charm.js';
import type { ShopOffer } from '../../game/RunState.js';
import { renderCharmIcon } from './CharmBar.js';

interface ShopScreenProps {
  money: number;
  offers: ShopOffer[];
  ownedCharms: CharmDef[];
  maxCharmSlots: number;
  rerollCost: number;
  onBuy: (itemId: string) => void;
  onReroll: () => void;
  onContinue: () => void;
}

const RARITY_BORDER: Record<CharmDef['rarity'], string> = {
  COMMON: 'border-slate-700 bg-slate-950/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.05)]',
  UNCOMMON: 'border-sky-500/80 bg-sky-950/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]',
  RARE: 'border-fuchsia-500/80 bg-fuchsia-950/40 shadow-[0_0_12px_rgba(217,70,239,0.25)]',
  LEGENDARY: 'border-amber-400 bg-amber-950/40 shadow-[0_0_16px_rgba(251,191,36,0.4)] animate-shine',
};

const CURSE_BORDER = 'border-rose-500 bg-rose-950/40 shadow-[0_0_14px_rgba(244,63,94,0.4)]';

const RARITY_LABEL_CLASS: Record<CharmDef['rarity'], string> = {
  COMMON: 'text-slate-500',
  UNCOMMON: 'text-sky-400 font-semibold',
  RARE: 'text-fuchsia-400 font-bold animate-pulse',
  LEGENDARY: 'text-amber-400 font-bold animate-pulse',
};

function renderVoucherIcon() {
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
}: ShopScreenProps) {
  const slotsFull = ownedCharms.length >= maxCharmSlots;

  return (
    <div className="w-full h-full flex flex-row bg-slate-900 border-2 border-slate-950 p-4 gap-4 crt select-none overflow-y-auto">
      {/* Left Column Controls */}
      <div className="flex flex-col gap-4 w-36 shrink-0 justify-center">
        {/* Flashing Neon Marquee SHOP Sign */}
        <div className="rounded-xl border-4 border-red-600 bg-red-950 p-3 text-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
          <h2 className="text-3xl font-black text-red-500 font-pixel tracking-widest uppercase shop-neon">
            SHOP
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {/* Next Round Button (Red, matching screenshot) */}
          <button
            type="button"
            onClick={onContinue}
            className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 active:translate-y-0.5 text-sm font-pixel font-bold text-white shadow-lg border-b-4 border-red-800 transition uppercase"
          >
            Sonraki Tur
          </button>

          {/* Reroll Button (Green, matching screenshot) */}
          <button
            type="button"
            onClick={onReroll}
            disabled={money < rerollCost}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-sm font-pixel font-bold text-white disabled:opacity-30 border-b-4 border-emerald-800 transition uppercase"
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
              return (
                <div
                  key={charm.id}
                  className={`balatro-card flex flex-col justify-between w-36 h-56 p-3 rounded-xl border-2 transition shrink-0 ${borderClass}`}
                >
                  <div className="text-center">
                    <span className={`text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-center gap-1 ${RARITY_LABEL_CLASS[charm.rarity]}`}>
                      {charm.curse && <span title="Lanetli">⚠</span>}
                      {charm.rarity}
                    </span>
                    <h4 className="text-xs font-bold leading-tight mt-0.5 truncate text-slate-200" title={charm.name}>
                      {charm.name}
                    </h4>
                  </div>

                  <div className="my-1 flex items-center justify-center transform scale-90">
                    {renderCharmIcon(charm.id)}
                  </div>

                  <p className="text-[10px] text-slate-300 leading-normal text-center mb-1.5 line-clamp-4">
                    {charm.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => onBuy(charm.id)}
                    disabled={disabled}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-[11px] font-bold font-pixel text-white shadow border-b-2 border-emerald-800 transition"
                  >
                    SATIN AL ${charm.cost}
                  </button>
                </div>
              );
            }

            if (offer.type === 'VOUCHER') {
              const voucher = offer.item;
              const disabled = money < voucher.cost;
              return (
                <div
                  key={voucher.id}
                  className="balatro-card flex flex-col justify-between w-36 h-56 p-3 rounded-xl border-2 border-amber-600/80 bg-amber-950/20 shadow-[0_0_10px_rgba(217,119,6,0.3)] transition shrink-0"
                >
                  <div className="text-center">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-500">KALICI</span>
                    <h4 className="text-xs font-bold leading-tight mt-0.5 truncate text-slate-200" title={voucher.name}>
                      {voucher.name}
                    </h4>
                  </div>

                  <div className="my-1 flex items-center justify-center transform scale-90">{renderVoucherIcon()}</div>

                  <p className="text-[10px] text-slate-300 leading-normal text-center mb-1.5 line-clamp-4">
                    {voucher.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => onBuy(voucher.id)}
                    disabled={disabled}
                    className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:pointer-events-none text-[11px] font-bold font-pixel text-white shadow border-b-2 border-amber-800 transition"
                  >
                    SATIN AL ${voucher.cost}
                  </button>
                </div>
              );
            }

            const upgrade = offer.item;
            const disabled = money < upgrade.cost;
            const borderClass =
              upgrade.type === 'COSMIC'
                ? 'border-amber-500/80 bg-amber-950/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'border-cyan-500/80 bg-cyan-950/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]';
            const labelColor = upgrade.type === 'COSMIC' ? 'text-amber-400' : 'text-cyan-400';

            return (
              <div
                key={upgrade.id}
                className={`balatro-card flex flex-col justify-between w-36 h-56 p-3 rounded-xl border-2 transition shrink-0 ${borderClass}`}
              >
                <div className="text-center">
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold ${labelColor}`}>
                    {upgrade.type === 'COSMIC' ? 'KOZMİK' : 'BÜYÜ'}
                  </span>
                  <h4 className="text-xs font-bold leading-tight mt-0.5 truncate text-slate-200" title={upgrade.name}>
                    {upgrade.name}
                  </h4>
                </div>

                <div className="my-1 flex items-center justify-center transform scale-90">
                  {renderUpgradeIcon(upgrade.id)}
                </div>

                <p className="text-[10px] text-slate-300 leading-normal text-center mb-1.5 line-clamp-4">
                  {upgrade.description}
                </p>

                <button
                  type="button"
                  onClick={() => onBuy(upgrade.id)}
                  disabled={disabled}
                  className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none text-[11px] font-bold font-pixel text-white shadow border-b-2 border-emerald-800 transition"
                >
                  SATIN AL ${upgrade.cost}
                </button>
              </div>
            );
          })}
          {offers.length === 0 && (
            <div className="w-full h-32 flex items-center justify-center border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs font-mono text-slate-500">Tüm teklifler satın alındı.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
