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

/** A soft, slowly "breathing" aura sitting behind each card — never fully cansız/static, even
 *  when nothing's actively triggering. Color matches each rarity's own accent. */
const AURA_CLASS: Record<CharmRarity, string> = {
  COMMON: 'bg-stone-400/25',
  UNCOMMON: 'bg-teal-400/30',
  RARE: 'bg-rose-500/30',
  LEGENDARY: 'bg-amber-400/35',
};
const CURSE_AURA = 'bg-fuchsia-500/30';

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
  // A mirrored pair of wings split by a dashed axis — "symmetry/pairing", for the even-sum lover.
  add_even_lover: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><path d="M12 3v18" strokeDasharray="2 2" /><path d="M12 6c-3 0-6 2-6 6s3 6 6 6" /><path d="M12 6c3 0 6 2 6 6s-3 6-6 6" /></>,
  },
  // A single solitary diamond with a filled core — "unpaired", for the odd-sum lover.
  add_odd_lover: {
    colorClass: 'text-teal-600 dark:text-teal-400',
    path: <><path d="M12 2 L19 12 L12 22 L5 12 Z" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></>,
  },
  // An anvil — "heavy load" for the high-value bonus.
  add_high_value: {
    colorClass: 'text-orange-600 dark:text-orange-400',
    path: <><path d="M5 15h5l1-3h7a2 2 0 0 1 2 2v2H5z" /><path d="M9 12V8a1 1 0 0 1 1-1h2v5" /><path d="M7 18h10" /></>,
  },
  // A feather — "light load" for the low-value bonus.
  add_low_value: {
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    path: <><path d="M20 4c-6 0-14 4-14 12 0 2 1 4 3 4 8 0 12-8 12-14 0-.7-.1-1.4-.3-2z" /><path d="M9 15 20 4" /><path d="M12 15h-3" /><path d="M14.5 12h-3" /></>,
  },
  // A doubled domino face (matching pips both ends) topped with a small mastery star.
  add_expert: {
    colorClass: 'text-emerald-700 dark:text-emerald-400',
    path: <><rect x="6" y="5" width="12" height="16" rx="2" /><line x1="6" y1="13" x2="18" y2="13" /><circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none" /><circle cx="15" cy="9" r="1.1" fill="currentColor" stroke="none" /><circle cx="9" cy="17" r="1.1" fill="currentColor" stroke="none" /><circle cx="15" cy="17" r="1.1" fill="currentColor" stroke="none" /><path d="M12 1.3l.6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2z" fill="currentColor" stroke="none" /></>,
  },
  // A zigzag streak line — consecutive matches firing one after another.
  add_streak: {
    colorClass: 'text-lime-600 dark:text-lime-400',
    path: <path d="M3 13h4l2-6 4 12 2-6h6" />,
  },
  // A diagonal chain of three linked rings — a long, well-forged chain.
  subtract_expert: {
    colorClass: 'text-rose-700 dark:text-rose-400',
    path: <><circle cx="6" cy="7" r="3" /><circle cx="12" cy="12" r="3" /><circle cx="18" cy="17" r="3" /></>,
  },
  // A hand mirror — swap the two ends of a stone.
  alchemists_mirror: {
    colorClass: 'text-cyan-500 dark:text-cyan-300',
    path: <><circle cx="12" cy="9" r="6" /><path d="M12 15v7" /><path d="M9 22h6" /></>,
  },
  // An inkwell with a quill resting in it.
  ancient_inkwell: {
    colorClass: 'text-amber-700 dark:text-amber-400',
    path: <><path d="M6 10h12l-1 9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" /><ellipse cx="12" cy="10" rx="6" ry="2" /><path d="M16 8 21 2" /></>,
  },
  // Two offset squares linked by a dashed bridge — a mirrored, doubled reflection.
  binary_mirror: {
    colorClass: 'text-sky-600 dark:text-sky-400',
    path: <><rect x="2.5" y="6" width="8" height="8" rx="1" /><rect x="13.5" y="10" width="8" height="8" rx="1" /><path d="M10.5 10l3 0" strokeDasharray="1.5 1.5" /></>,
  },
  // Interlocking woven waves — a loom pulling stones into a single chain.
  chain_weaver: {
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    path: <><path d="M3 7c3.5 0 3.5 4 7 4s3.5-4 7-4 3.5 4 4 4" /><path d="M3 13c3.5 0 3.5 4 7 4s3.5-4 7-4 3.5 4 4 4" /></>,
  },
  // A round clockface with two swinging pendulum arms — distinct from cosmic_pendulum's simple
  // lollipop swing, this one reads more like an actual mechanical clock.
  chrono_pendulum: {
    colorClass: 'text-sky-500 dark:text-sky-300',
    path: <><circle cx="12" cy="8" r="5.2" /><path d="M12 8 12 4.5" /><path d="M12 8 14.6 9.6" /><path d="M12 13 10 20" /><path d="M12 13 14 20" /><circle cx="10" cy="20.3" r="1.2" fill="currentColor" stroke="none" /><circle cx="14" cy="20.3" r="1.2" fill="currentColor" stroke="none" /></>,
  },
  // A five-pip die face — cosmic luck.
  cosmic_dice: {
    colorClass: 'text-violet-500 dark:text-violet-400',
    path: <><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="8.3" cy="8.3" r="1.2" fill="currentColor" stroke="none" /><circle cx="15.7" cy="8.3" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="8.3" cy="15.7" r="1.2" fill="currentColor" stroke="none" /><circle cx="15.7" cy="15.7" r="1.2" fill="currentColor" stroke="none" /></>,
  },
  // Concentric dashed rings collapsing into a solid center — an accretion disk around a void.
  cosmic_singularity: {
    colorClass: 'text-purple-600 dark:text-purple-400',
    path: <><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="5.5" strokeDasharray="2 2" /><circle cx="12" cy="12" r="9" strokeDasharray="3 3" opacity="0.55" /></>,
  },
  // An hourglass with a jagged crack running through its neck.
  cracked_hourglass: {
    colorClass: 'text-red-600 dark:text-red-400',
    path: <><path d="M6 3h12" /><path d="M6 21h12" /><path d="M7 3c0 5 5 7 5 9s-5 4-5 9" /><path d="M17 3c0 5-5 7-5 9s5 4 5 9" /><path d="M9.5 8l3 2.2-2 2.8" strokeWidth="1.3" /></>,
  },
  // An auctioneer's gavel mid-strike.
  curators_gavel: {
    colorClass: 'text-amber-600 dark:text-amber-400',
    path: <><path d="M14 3l7 7-2 2-7-7z" /><path d="M12 8l4 4" /><path d="M3 21l7-7" /><path d="M2 22l3-3" /></>,
  },
  // A crystal ball with two glinting inner sparkles on a stand — a doubled/twinned prophecy.
  double_oracle: {
    colorClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    path: <><circle cx="12" cy="11" r="7" /><circle cx="9.5" cy="9.5" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="9.5" r="1" fill="currentColor" stroke="none" /><path d="M7 20h10" /></>,
  },
  // Three concentric rings rippling out from a center point — sound bouncing back.
  echo_chamber: {
    colorClass: 'text-sky-600 dark:text-sky-400',
    path: <><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="8.5" opacity="0.5" /></>,
  },
  // A rounded nesting-doll silhouette with a curved "biting" mouth line.
  gluttonous_matryoshka: {
    colorClass: 'text-rose-600 dark:text-rose-400',
    path: <><path d="M12 2c-3 0-5 2-5 5 0 1.5.7 2.5 1.5 3.3C6.8 11.5 5 14 5 17c0 3 3 5 7 5s7-2 7-5c0-3-1.8-5.5-3.5-6.7.8-.8 1.5-1.8 1.5-3.3 0-3-2-5-5-5z" /><path d="M9.3 15.5c.6 1 1.6 1.5 2.7 1.5s2.1-.5 2.7-1.5" /></>,
  },
  // An abacus frame with beads on two rods.
  golden_abacus: {
    colorClass: 'text-amber-500 dark:text-amber-400',
    path: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><line x1="4" y1="9.5" x2="20" y2="9.5" /><line x1="4" y1="14.5" x2="20" y2="14.5" /><circle cx="8" cy="9.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="13" cy="9.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="10" cy="14.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="16" cy="14.5" r="1.3" fill="currentColor" stroke="none" /></>,
  },
  // Four soft draping folds — a veil.
  ivory_veil: {
    colorClass: 'text-stone-400 dark:text-stone-300',
    path: <><path d="M4 4c2 4 2 8 0 16" /><path d="M9.3 4c2 4 2 8 0 16" /><path d="M14.7 4c2 4 2 8 0 16" /><path d="M20 4c2 4 2 8 0 16" /></>,
  },
  // A domed treasure chest with a small lock plate.
  noble_ivory_chest: {
    colorClass: 'text-amber-500 dark:text-amber-300',
    path: <><rect x="4" y="10" width="16" height="10" rx="1.5" /><path d="M4 10c0-4 3.5-7 8-7s8 3 8 7" /><rect x="10" y="12" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" /></>,
  },
  // An almond eye with a solid gem-cut iris.
  obsidian_eye: {
    colorClass: 'text-purple-500 dark:text-purple-400',
    path: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" /></>,
  },
  // A wavy-bottomed ghost with two dot eyes and a small coin beside it.
  thrifty_phantom: {
    colorClass: 'text-stone-300 dark:text-stone-200',
    path: <><path d="M6 20V11a6 6 0 0 1 12 0v9l-2-2-2 2-2-2-2 2-2-2z" /><circle cx="9.5" cy="10.5" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="10.5" r="1" fill="currentColor" stroke="none" /></>,
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
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-450 dark:text-stone-550 font-pixel">
            Tılsımların ({charms.length}/{maxCharmSlots})
          </h2>
        </div>
      )}
      <div className={layout === 'vertical'
        ? "flex flex-col gap-3 overflow-y-auto max-h-[52vh] pr-1 py-1 scrollbar-none"
        : "flex flex-row flex-nowrap justify-center gap-1.5 md:gap-2 lg:gap-3 pb-10 md:pb-14 -mb-8 md:-mb-12 scrollbar-none relative z-30 overflow-visible"
      }>
        {Array.from({ length: maxCharmSlots }, (_, i) => {
          const charm = charms[i];

          if (!charm) {
            return (
              <div
                key={`empty-${i}`}
                className="relative flex flex-col items-center justify-center w-18 h-26 md:w-22 md:h-32 lg:w-28 lg:h-40 p-2 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-700 shrink-0"
              >
                <svg className="slot-silhouette w-9 h-11 text-stone-400 dark:text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <p className="text-[10px] text-stone-200 leading-relaxed">
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
              : 'ring-4 ring-stone-300 shadow-[0_0_25px_rgba(226,232,240,0.85)]' // 'smoke'
            : '';
          const isUsedUp = Boolean(charm.interactive) && activatedCharmIds.includes(charm.id);
          const isArmed = armedCharmId === charm.id;
          const isClickable = Boolean(charm.interactive) && !isUsedUp && Boolean(onActivateCharm);

          const durabilityVal = hasDurability ? charmDurability[charm.id] : 999;
          const durRatio = hasDurability ? durabilityVal / (charm.maxDurability ?? 4) : 1;
          const isUnstable = hasDurability && durabilityVal === 1;
          const auraClass = charm.curse ? CURSE_AURA : AURA_CLASS[charm.rarity];
          // The 3D tilt only applies at rest — while scoring/armed the card already owns its own
          // transform (scale/translate via className), and an inline style here would clobber it.
          const tiltEnabled = !isScoringActive && !isArmed && !isUsedUp;
          const handleTiltMove = tiltEnabled
            ? (e: React.MouseEvent<HTMLDivElement>) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width - 0.5;
                const py = (e.clientY - rect.top) / rect.height - 0.5;
                e.currentTarget.style.transform = `perspective(700px) rotateX(${py * -10}deg) rotateY(${px * 10}deg) translateY(-4px)`;
              }
            : undefined;
          const handleTiltLeave = tiltEnabled
            ? (e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.transform = '';
              }
            : undefined;

          return (
            <InfoTooltip key={charm.id} text={tooltipContent} widthClass="w-56" side="right">
              <div
                data-charm-id={charm.id}
                onClick={isClickable ? () => onActivateCharm!(charm.id) : undefined}
                onMouseMove={handleTiltMove}
                onMouseLeave={handleTiltLeave}
                className={`balatro-card relative flex flex-col justify-between w-18 h-26 md:w-22 md:h-32 lg:w-28 lg:h-40 p-2.5 rounded-lg border-2 text-center transition select-none shrink-0 ${entranceClass} ${cardClass} ${isScoringActive ? `scale-110 -translate-y-3 z-30 animate-pulse ${signatureGlow || 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.9)]'}` : ''} ${isClickable ? 'cursor-pointer' : 'cursor-help'} ${isClickable && !isArmed ? 'ring-2 ring-violet-400/70 animate-pulse' : ''} ${isArmed ? 'scale-105 ring-4 ring-violet-400 shadow-[0_0_18px_rgba(167,139,250,0.8)]' : ''} ${isUsedUp ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${isUnstable ? 'animate-card-unstable' : ''}`}
                style={{ animationDelay: isScoringActive ? undefined : `${i * 110}ms` }}
              >
                {/* Idle breathing aura — a soft glow behind the card that slowly grows/shrinks,
                    phase-offset per card so the row never breathes in lockstep. */}
                <div
                  className={`absolute -inset-2.5 -z-10 rounded-xl blur-md pointer-events-none ${auraClass} animate-charm-aura-breathe`}
                  style={{ animationDelay: `${i * 260}ms` }}
                />
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
                <div className={`absolute top-2.5 right-2.5 w-3 h-3 rounded-full border border-stone-950/40 z-10 ${gemClass}`} title={charm.curse ? 'Lanetli' : charm.rarity} />

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
