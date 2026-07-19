import type { CharmDef, CharmRarity } from '../../models/Charm.js';
import InfoTooltip from './InfoTooltip.js';

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

  // --- Core (bespoke, replacing sprite-sheet art) ---
  // A single solitary flame — the lone "odd number" master.
  division_master: {
    colorClass: 'text-teal-600 dark:text-teal-400',
    path: <><path d="M12 2c-1 3-4 4-4 8a4 4 0 0 0 8 0c0-4-3-5-4-8z" /><path d="M9 22h6" /></>,
  },
  // A plus sign in a ring — the "sum" master.
  add_master: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" strokeWidth="2.2" /></>,
  },
  // A minus sign in a ring — mirrors add_master.
  subtract_master: {
    colorClass: 'text-rose-600 dark:text-rose-400',
    path: <><circle cx="12" cy="12" r="9" /><path d="M7 12h10" strokeWidth="2.2" /></>,
  },
  // An 8-point burst — a frenzy of multiplication.
  multiplier_frenzy: {
    colorClass: 'text-amber-600 dark:text-amber-400',
    path: <path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19" />,
  },
  // Mirrored chevrons split by a dashed axis — visual symmetry.
  symmetry_bonus: {
    colorClass: 'text-sky-600 dark:text-sky-400',
    path: <><path d="M12 3v18" strokeDasharray="2 2" /><path d="M12 3L5 12l7 9" /><path d="M12 3l7 9-7 9" /></>,
  },
  // A small plain heart — an affection for small numbers.
  small_number_love: {
    colorClass: 'text-pink-500 dark:text-pink-400',
    path: <path d="M12 18c-4-3.4-7-6.2-7-9.4A3.4 3.4 0 0 1 12 6.6a3.4 3.4 0 0 1 7 2c0 3.2-3 6-7 9.4z" />,
  },
  // A simple radiant sun — basic, uncomplicated pleasure.
  simple_pleasures: {
    colorClass: 'text-amber-500 dark:text-amber-300',
    path: <><circle cx="12" cy="12" r="5.5" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5" /></>,
  },
  // Four stones in a row under a soft dashed murmur — the fourth-stone-onward whisper.
  overtime: {
    colorClass: 'text-violet-600 dark:text-violet-400',
    path: <><rect x="3" y="5" width="4" height="7" rx="1" /><rect x="8" y="5" width="4" height="7" rx="1" /><rect x="13" y="5" width="4" height="7" rx="1" /><rect x="18" y="5" width="3" height="7" rx="1" /><path d="M4 17c4-2.5 8-2.5 16 0" strokeDasharray="1.5 2" /></>,
  },
  // Four linked points around a center — a fourfold harmony.
  four_way_harmony: {
    colorClass: 'text-teal-500 dark:text-teal-400',
    path: <><circle cx="6.5" cy="6.5" r="2.2" /><circle cx="17.5" cy="6.5" r="2.2" /><circle cx="6.5" cy="17.5" r="2.2" /><circle cx="17.5" cy="17.5" r="2.2" /><path d="M8.5 8.5l3 3M15.5 8.5l-3 3M8.5 15.5l3-3M15.5 15.5l-3-3" opacity="0.55" /></>,
  },
  // A balance scale — the master of even measure.
  balance_master: {
    colorClass: 'text-amber-500 dark:text-amber-400',
    path: <><path d="M12 2v17" /><path d="M5 7h14" /><path d="M5 7l-3 6a3.2 3.2 0 0 0 6 0z" /><path d="M19 7l-3 6a3.2 3.2 0 0 0 6 0z" /><path d="M8 21h8" /></>,
  },
  // Two small coins linked by a short chain — interest compounding at chain's end.
  chain_end_interest: {
    colorClass: 'text-amber-600 dark:text-amber-400',
    path: <><circle cx="8" cy="16" r="4" /><circle cx="16" cy="8" r="3.2" /><path d="M11 13l2-2" strokeWidth="1.3" /></>,
  },
  // A shield with a protective central gem.
  loss_insurance: {
    colorClass: 'text-stone-400 dark:text-stone-300',
    path: <><path d="M12 2 20 5.5v5c0 5.2-3.5 8.7-8 10.5-4.5-1.8-8-5.3-8-10.5v-5z" /><circle cx="12" cy="11" r="2.3" fill="currentColor" stroke="none" /></>,
  },
  // A drawstring coin pouch.
  generous_trader: {
    colorClass: 'text-amber-600 dark:text-amber-400',
    path: <><path d="M8.5 10a3.5 3.5 0 0 1 7 0v1h1.2a1 1 0 0 1 1 1.1l-.9 7.1a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8l-.9-7.1a1 1 0 0 1 1-1.1H8.5z" /><path d="M9.3 10a2.7 2.7 0 0 1 5.4 0" /></>,
  },
  // A racing checkered flag — finishing early.
  early_finisher: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><path d="M6 3v18" /><path d="M6 4h4v3h4V4h4v7h-4v-3h-4v3H6z" /></>,
  },
  // A hunting crosshair over a paired target.
  double_hunter: {
    colorClass: 'text-rose-600 dark:text-rose-400',
    path: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" /></>,
  },
  // An hourglass with a single glowing grain caught mid-fall.
  clutch_finisher: {
    colorClass: 'text-emerald-500 dark:text-emerald-400',
    path: <><path d="M6 3h12" /><path d="M6 21h12" /><path d="M7 3c0 5 5 7 5 9s-5 4-5 9" /><path d="M17 3c0 5-5 7-5 9s5 4 5 9" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /></>,
  },
  // Two overlapping ghostly silhouettes — twin souls.
  twin_souls: {
    colorClass: 'text-violet-500 dark:text-violet-400',
    path: <><path d="M7.5 20v-7a4 4 0 0 1 8 0v7l-2-1.6-2 1.6-2-1.6z" opacity="0.9" /><path d="M14 20v-8a3.7 3.7 0 0 1 4-3.7" opacity="0.4" /></>,
  },
  // A wide resonant wave — chords ringing louder together.
  multiplier_resonance: {
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    path: <path d="M2 12h3l2-7 3 14 2-9 3 6h3l2-4" />,
  },
  // A ghostly card silhouette with a faint die inside.
  gamblers_spirit: {
    colorClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    path: <><path d="M7 20v-9a5 5 0 0 1 10 0v9l-2.5-2-2.5 2-2.5-2z" /><rect x="9.5" y="10.5" width="5" height="5" rx="1" fill="currentColor" fillOpacity="0.4" stroke="none" /></>,
  },
  // Cracked spectacles — the mad scholar's monocle.
  mad_scholar: {
    colorClass: 'text-purple-600 dark:text-purple-400',
    path: <><circle cx="7" cy="12" r="4" /><circle cx="17" cy="12" r="4" /><path d="M11 12h2M3 12h1M20 12h1" /><path d="M7.5 9.5l1.6 1.8-1 2.4" strokeWidth="1.1" /></>,
  },
  // A heart with a small flame offered above it.
  sacrificial_heart: {
    colorClass: 'text-rose-500 dark:text-rose-400',
    path: <><path d="M12 19c-5-4-8-7-8-10.5A3.8 3.8 0 0 1 12 5a3.8 3.8 0 0 1 8 3.5C20 12 17 15 12 19z" /><path d="M12 2.5c-.6 1.2-1.4 1.5-1.4 2.5a1.4 1.4 0 0 0 2.8 0c0-1-.8-1.3-1.4-2.5z" fill="currentColor" stroke="none" /></>,
  },
  // A spiky, predatory coin.
  loan_shark: {
    colorClass: 'text-red-700 dark:text-red-400',
    path: <><circle cx="12" cy="12" r="7.5" /><path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M7.4 7.4l1.4 1.4M15.2 15.2l1.4 1.4M16.6 7.4l-1.4 1.4M7.4 16.6l1.4-1.4" strokeWidth="1.1" /></>,
  },
  // A trophy with a crack running through its cup.
  fragile_victory: {
    colorClass: 'text-amber-500 dark:text-amber-400',
    path: <><path d="M7 4h10v3a5 5 0 0 1-10 0z" /><path d="M9 4H5v2a4 4 0 0 0 4 4" opacity="0.5" /><path d="M15 4h4v2a4 4 0 0 1-4 4" opacity="0.5" /><path d="M12 12v4M9 20h6M11 16l-2 4" strokeWidth="1.2" /></>,
  },
  // Symmetry Bonus's mirrored chevrons crowned with a small star — its legendary amplification.
  legendary_symmetry: {
    colorClass: 'text-amber-400 dark:text-amber-300',
    path: <><path d="M12 6v16" strokeDasharray="2 2" /><path d="M12 6L6 14l6 8" /><path d="M12 6l6 8-6 8" /><path d="M12 1l.7 1.6 1.7.2-1.2 1.2.3 1.7-1.5-.9-1.5.9.3-1.7-1.2-1.2 1.7-.2z" fill="currentColor" stroke="none" /></>,
  },

  // --- Positional (bespoke) ---
  // A stone struck at the very opening of the chain, radiating impact lines.
  opening_strike: {
    colorClass: 'text-orange-600 dark:text-orange-400',
    path: <><rect x="9" y="9" width="6" height="9" rx="1" /><path d="M12 9V4M8 6l1.5 2M16 6l-1.5 2" strokeWidth="1.3" /></>,
  },
  // A closing curtain motif — the grand finale.
  grand_finale: {
    colorClass: 'text-rose-500 dark:text-rose-400',
    path: <><path d="M4 3v18" /><path d="M20 3v18" /><path d="M4 4c5 5 5 15 0 16" opacity="0.6" /><path d="M20 4c-5 5-5 15 0 16" opacity="0.6" /><path d="M9 12h6" strokeDasharray="1.5 2" /></>,
  },
  // A single small coin — the miser master's frugal secret.
  minimalist: {
    colorClass: 'text-stone-400 dark:text-stone-300',
    path: <><circle cx="12" cy="12" r="4.5" /><path d="M12 9.3v5.4M10.5 10.3h2.6M10.5 13.7h2.6" strokeWidth="1" /></>,
  },

  // --- Economy (bespoke) ---
  // A simple laurel wreath — an easy, humble win.
  flat_bonus_common: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><path d="M6 20c3-8 3-14 6-16" /><path d="M18 20c-3-8-3-14-6-16" /></>,
  },
  // A winding footpath — a long journey.
  long_turn_reward: {
    colorClass: 'text-stone-400 dark:text-stone-300',
    path: <><path d="M4 20c3-4 1-8 5-10s1-6 7-8" /><circle cx="6" cy="17" r="0.9" fill="currentColor" stroke="none" /><circle cx="10" cy="11" r="0.9" fill="currentColor" stroke="none" /><circle cx="15" cy="4" r="0.9" fill="currentColor" stroke="none" /></>,
  },
  // A medal with an upward chevron — exceeding the goal.
  overachiever: {
    colorClass: 'text-amber-500 dark:text-amber-400',
    path: <><circle cx="12" cy="8" r="5" /><path d="M9.3 8l2.7-2.7L14.7 8" strokeWidth="1.3" /><path d="M9 12l-2 9 5-3 5 3-2-9" /></>,
  },
  // A crescent moon over a lone howling curve.
  lone_wolf: {
    colorClass: 'text-stone-400 dark:text-stone-300',
    path: <><path d="M18 3.5a3 3 0 1 0 0 6 3.5 3.5 0 1 1 0-6z" fill="currentColor" stroke="none" /><path d="M4 20c2-6 5-9 8-9 2 0 3 1.5 3 3 0 3-3 4-3 6" /></>,
  },
  // A finish line almost broken through.
  almost_there: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><path d="M4 5v16" /><path d="M20 5v16" /><path d="M4 12h11" strokeDasharray="3 2" /><path d="M17 9l3 3-3 3" strokeWidth="1.3" /></>,
  },
  // A boomerang return-arrow.
  comeback_kid: {
    colorClass: 'text-sky-600 dark:text-sky-400',
    path: <><path d="M4 12a8 8 0 0 1 14-5" /><path d="M16 4.2l1.8 2.8-3.1.7" strokeWidth="1.3" /></>,
  },
  // A four-bladed pinwheel — matching the "spinner" (double) theme.
  spinner_fan: {
    colorClass: 'text-red-600 dark:text-red-400',
    path: <><path d="M12 12 4 8a4 4 0 0 1 8-2z" /><path d="M12 12 16 4a4 4 0 0 1 2 8z" /><path d="M12 12 20 16a4 4 0 0 1-8 2z" /><path d="M12 12 8 20a4 4 0 0 1-2-8z" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /></>,
  },
  // A small coin pinched between two lines.
  penny_pincher: {
    colorClass: 'text-amber-600 dark:text-amber-400',
    path: <><circle cx="12" cy="14" r="3.5" /><path d="M7.5 8l3 3M16.5 8l-3 3" strokeWidth="1.4" /></>,
  },
  // A mound of piled coins.
  grand_hoard: {
    colorClass: 'text-amber-500 dark:text-amber-400',
    path: <><path d="M3 18c2-5 4-6 9-6s7 1 9 6" /><circle cx="8" cy="17" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="15.3" r="1.8" fill="currentColor" stroke="none" /><circle cx="16" cy="17" r="1.6" fill="currentColor" stroke="none" /></>,
  },
  // A diagonal speed-dash with a small motion trail.
  swift_victory: {
    colorClass: 'text-emerald-500 dark:text-emerald-400',
    path: <><path d="M4 18c4-2 8-6 14-14" strokeWidth="1.6" /><path d="M14 4h4v4" strokeWidth="1.6" /><path d="M6.5 15.5l-2 1 1-2" strokeWidth="1.1" /></>,
  },
  // A small sprout — modest, steady growth.
  modest_gain: {
    colorClass: 'text-emerald-500 dark:text-emerald-400',
    path: <><path d="M12 20V11" /><path d="M12 11c-4 0-5-3-5-5 3 0 5 1 5 5z" /><path d="M12 13c3 0 4-2.5 4-4.5-2.5 0-4 1-4 4.5z" opacity="0.7" /></>,
  },
  // Three dots in a triangular cluster — three doubles.
  triple_double: {
    colorClass: 'text-rose-600 dark:text-rose-400',
    path: <><circle cx="7" cy="8" r="2.3" /><circle cx="17" cy="8" r="2.3" /><circle cx="12" cy="16.5" r="2.3" /></>,
  },
  // A simplified running figure.
  marathon_runner: {
    colorClass: 'text-teal-600 dark:text-teal-400',
    path: <><circle cx="14.5" cy="4.5" r="1.8" fill="currentColor" stroke="none" /><path d="M9 20l2-6 3 2 2-5-3-3-4 1-2 4" strokeWidth="1.4" /></>,
  },

  // --- Curse (bespoke) ---
  // A coin split by a jagged crack.
  chaos_coin: {
    colorClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    path: <><circle cx="12" cy="12" r="7.5" /><path d="M9.5 7l3 4.5-2 1 3 4.5" strokeWidth="1.3" /></>,
  },
  // Inward-pointing mirrored chevrons — symmetry turned in on itself.
  reverse_symmetry: {
    colorClass: 'text-rose-600 dark:text-rose-400',
    path: <><path d="M12 3v18" strokeDasharray="2 2" /><path d="M5 3l7 9-7 9" opacity="0.85" /><path d="M19 3l-7 9 7 9" opacity="0.85" /></>,
  },
  // A circle and diamond colliding with a spark.
  add_sub_clash: {
    colorClass: 'text-orange-600 dark:text-orange-400',
    path: <><circle cx="7" cy="12" r="4" /><path d="M17 6l5 6-5 6-5-6z" /><path d="M10.5 12h3" strokeWidth="1.3" /></>,
  },
  // An anvil and a feather forced together.
  mul_div_clash: {
    colorClass: 'text-orange-700 dark:text-orange-400',
    path: <><path d="M3 15h5l1-2h4a1.6 1.6 0 0 1 1.6 1.6V16H3z" /><path d="M18.5 4c-3 0-6.5 2-6.5 5.8 0 1 .4 1.7 1.3 1.7 3.7 0 6.2-3.7 6.2-6.7 0-.3 0-.6-.2-.8z" /></>,
  },
  // A three-pip die with a lucky sparkle.
  lucky_dice: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><rect x="5" y="5" width="14" height="14" rx="3" /><circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none" /><circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><path d="M19 2l.8 1.7 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8L16.4 4l1.8-.3z" fill="currentColor" stroke="none" /></>,
  },
  // A circle exactly half filled.
  all_or_nothing: {
    colorClass: 'text-stone-400 dark:text-stone-300',
    path: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></>,
  },
  // A small horned flame-spirit with trailing legs — a hasty ifrit.
  speed_demon: {
    colorClass: 'text-orange-600 dark:text-orange-400',
    path: <><path d="M12 3c-1 2-3 2-3 5a3 3 0 0 0 6 0c0-3-2-3-3-5z" /><path d="M9 5l-1-2M15 5l1-2" strokeWidth="1.2" /><path d="M9 21c1-3 1-5 3-5s2 2 3 5" opacity="0.6" /></>,
  },
  // A flame split by a dashed, unstable seam.
  volatile_soul: {
    colorClass: 'text-violet-600 dark:text-violet-400',
    path: <><path d="M12 3c-2 3-5 5-5 9a5 5 0 0 0 10 0c0-4-3-6-5-9z" /><path d="M12 8v8" strokeDasharray="1.5 1.5" /></>,
  },
  // A ledger with a coin stamp — a collector's due notice.
  debt_collector: {
    colorClass: 'text-red-700 dark:text-red-400',
    path: <><rect x="4" y="6" width="16" height="14" rx="1.5" /><path d="M8 10.5h8M8 14.5h5" strokeWidth="1.1" /><circle cx="17.5" cy="4.5" r="2.2" fill="currentColor" stroke="none" /></>,
  },
  // Stacked casino chips.
  high_roller: {
    colorClass: 'text-violet-600 dark:text-violet-400',
    path: <><ellipse cx="12" cy="18" rx="7" ry="2.2" /><ellipse cx="12" cy="14" rx="7" ry="2.2" /><ellipse cx="12" cy="10" rx="7" ry="2.2" /></>,
  },
  // Twin circles split by a lightning crack — an even-numbered curse.
  even_curse: {
    colorClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    path: <><circle cx="8" cy="12" r="4.5" /><circle cx="16" cy="12" r="4.5" /><path d="M12 7l-1.3 5 2 1-1.3 5" strokeWidth="1.1" /></>,
  },
  // A single diamond split by a lightning crack — an odd-numbered curse.
  odd_curse: {
    colorClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    path: <><path d="M12 2 19 12 12 22 5 12Z" /><path d="M12 6l-1.5 5 2 1-1.5 5" strokeWidth="1.1" /></>,
  },
  // A jagged starburst — everything or nothing, in one blast.
  boom_or_bust: {
    colorClass: 'text-red-600 dark:text-red-400',
    path: <path d="M12 2l1.5 4 4-1-2 4 4 1-4 2 2 4-4-1-1.5 4-1.5-4-4 1 2-4-4-1 4-2-2-4 4 1z" fill="currentColor" stroke="none" />,
  },
  // An open hand with fingers spread, reaching.
  greedy_hand: {
    colorClass: 'text-amber-700 dark:text-amber-400',
    path: <path d="M5 12v4a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5v-6M8 12V8a2 2 0 0 1 4 0v4M12 11V7a2 2 0 0 1 4 0v5M16 12v-3a2 2 0 0 1 4 0v3" />,
  },

  // --- Synergy (bespoke) — pairing/combo motifs, since each rewards owning two other charms ---
  // Four nodes in a diamond, cross-linked — four masters united.
  synergy_all_masters: {
    colorClass: 'text-amber-600 dark:text-amber-400',
    path: <><circle cx="12" cy="5" r="2" /><circle cx="19" cy="12" r="2" /><circle cx="12" cy="19" r="2" /><circle cx="5" cy="12" r="2" /><path d="M12 7v10M7 12h10" opacity="0.4" /></>,
  },
  // Two coin pouches side by side, small and large.
  synergy_economy_duo: {
    colorClass: 'text-amber-600 dark:text-amber-400',
    path: <><path d="M6 9a2.5 2.5 0 0 1 5 0v.6h.9a.8.8 0 0 1 .8.9l-.7 5.6a1.6 1.6 0 0 1-1.6 1.4H7.6A1.6 1.6 0 0 1 6 15.9L5.3 10.5a.8.8 0 0 1 .8-.9H6z" /><path d="M13.5 13a2 2 0 0 1 4 0v.5h.6a.7.7 0 0 1 .7.8l-.6 4.4a1.3 1.3 0 0 1-1.3 1.1h-2a1.3 1.3 0 0 1-1.3-1.1l-.6-4.4a.7.7 0 0 1 .7-.8h.6z" opacity="0.75" /></>,
  },
  // A shield with a faded, warded-off crack.
  synergy_curse_ward: {
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    path: <><path d="M12 2 20 5.5v5c0 5.2-3.5 8.7-8 10.5-4.5-1.8-8-5.3-8-10.5v-5z" /><path d="M9 9l3 3-2 1 3 4" strokeWidth="1.1" opacity="0.45" /></>,
  },
  // A small heart and a small sun overlapping.
  synergy_small_simple: {
    colorClass: 'text-pink-500 dark:text-pink-400',
    path: <><path d="M9 15c-2.5-2-4-3.5-4-5.5A2.5 2.5 0 0 1 9 7.5 2.5 2.5 0 0 1 13 9.5c0 2-1.5 3.5-4 5.5z" /><circle cx="16.5" cy="7.5" r="2.6" /><path d="M16.5 3.3v1M16.5 10.7v1M12.9 7.5h1M20.1 7.5h1" strokeWidth="1" /></>,
  },
  // Two harmony nodes above a soft whisper wave.
  synergy_harmony_overtime: {
    colorClass: 'text-teal-600 dark:text-teal-400',
    path: <><circle cx="8" cy="7" r="1.8" /><circle cx="16" cy="7" r="1.8" /><path d="M9.5 8.5l2.5 2.5M14.5 8.5l-2.5 2.5" opacity="0.5" /><path d="M4 18c4-2.5 8-2.5 16 0" strokeDasharray="1.5 2" /></>,
  },
  // A clock reaching its final moment beside a coin.
  synergy_finisher_duo: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><circle cx="9" cy="10" r="6" /><path d="M9 6v4l3 2" strokeWidth="1.2" /><circle cx="18.5" cy="17" r="3.4" fill="currentColor" fillOpacity="0.35" /></>,
  },
  // A four-way cross converging on a solid core — two experts, one union.
  synergy_expert_masters: {
    colorClass: 'text-emerald-700 dark:text-emerald-400',
    path: <><path d="M6 6l5 5M18 6l-5 5M6 18l5-5M18 18l-5-5" strokeWidth="1.2" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></>,
  },

  // --- Legendary (remaining, bespoke) ---
  // A four-link horizontal chain wrapped in a faint aura — the whole chain, blessed.
  legendary_universal_chain: {
    colorClass: 'text-amber-500 dark:text-amber-300',
    path: <><circle cx="4.5" cy="12" r="2.3" /><circle cx="9.5" cy="12" r="2.3" /><circle cx="14.5" cy="12" r="2.3" /><circle cx="19.5" cy="12" r="2.3" /><circle cx="12" cy="12" r="10.5" strokeDasharray="2 3" opacity="0.4" /></>,
  },
  // A double-edged dagger blade.
  legendary_double_edge: {
    colorClass: 'text-rose-600 dark:text-rose-400',
    path: <><path d="M12 2 14 9 12 22 10 9Z" /><path d="M8 9h8" /></>,
  },
  // Two fully overlapping circles — grand harmony/unity.
  legendary_grand_harmony: {
    colorClass: 'text-amber-500 dark:text-amber-300',
    path: <><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></>,
  },
  // A reaching arm ending at a solid gold coin.
  legendary_midas: {
    colorClass: 'text-amber-500 dark:text-amber-300',
    path: <><path d="M3 20c1-5 3-11 9-11s8 6 9 11" /><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none" /></>,
  },
  // A lightning bolt with a dark oracle's eye at its core.
  legendary_final_boss: {
    colorClass: 'text-amber-400 dark:text-amber-300',
    path: <><path d="M13 3 7 13h4.5l-2 8 8-11h-4.5z" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="#1c1917" stroke="none" /></>,
  },

  // --- Numeric-coincidence (bespoke) ---
  // A stylized "7" with a lucky sparkle.
  lucky_seven: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><path d="M6 5h12l-7 15" strokeWidth="2" /><path d="M19 2l.6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2z" fill="currentColor" stroke="none" /></>,
  },
  // A double-six domino tile with a crack down the middle — unlucky twelve.
  unlucky_thirteen: {
    colorClass: 'text-rose-600 dark:text-rose-400',
    path: <><rect x="5" y="4" width="14" height="16" rx="2" /><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none" /><path d="M9 3l2 4.5-2 3.5" strokeWidth="1.1" /></>,
  },
  // Two overlapping exclamation marks — twice the trouble.
  double_trouble: {
    colorClass: 'text-red-600 dark:text-red-400',
    path: <><path d="M8 4h5l-1 9H9z" /><circle cx="10.5" cy="15.5" r="1" fill="currentColor" stroke="none" /><path d="M14 7h5l-1 9h-3z" opacity="0.55" /><circle cx="16.5" cy="18.5" r="1" fill="currentColor" stroke="none" opacity="0.55" /></>,
  },
  // A bare circle framed by four corner rays — an aura around emptiness.
  zero_hero: {
    colorClass: 'text-sky-600 dark:text-sky-400',
    path: <><circle cx="12" cy="12" r="6" /><path d="M6 6l-2-2M18 6l2-2M6 18l-2 2M18 18l2 2" strokeWidth="1.1" opacity="0.5" /></>,
  },
  // A classic six-pip die face.
  six_pack: {
    colorClass: 'text-amber-600 dark:text-amber-400',
    path: <><rect x="5" y="5" width="14" height="14" rx="3" /><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" /></>,
  },
  // An open book with a glowing memory orb.
  total_recall: {
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    path: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 4v13a3 3 0 0 0 3 3" opacity="0.5" /><circle cx="12" cy="10" r="2" fill="currentColor" fillOpacity="0.4" /></>,
  },
  // A steady open palm.
  steady_hand: {
    colorClass: 'text-stone-400 dark:text-stone-300',
    path: <path d="M12 3v9M9 5v7M15 5v7M6 9v5a6 6 0 0 0 6 6h1a6 6 0 0 0 6-6V9" strokeWidth="1.3" />,
  },
  // A crescent moon with a jagged nightmare glint.
  negative_nightmare: {
    colorClass: 'text-purple-600 dark:text-purple-400',
    path: <><path d="M15 3a9 9 0 1 0 6 15 7 7 0 0 1-6-15z" fill="currentColor" fillOpacity="0.15" /><path d="M9 12l1.5 1.5L9 15" strokeWidth="1.1" /></>,
  },
  // A coin secured with a small padlock.
  thrifty_spender: {
    colorClass: 'text-amber-600 dark:text-amber-400',
    path: <><circle cx="12" cy="14" r="6" /><rect x="10" y="10" width="4" height="3" rx="1" /><path d="M10.5 10V8.5a1.5 1.5 0 0 1 3 0V10" strokeWidth="1" /></>,
  },
  // A tally-counter box with two beads.
  node_counter: {
    colorClass: 'text-sky-600 dark:text-sky-400',
    path: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 12h16" strokeWidth="1.1" /><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" /></>,
  },
  // A watching eye with five short rays — the fifth omen.
  high_five: {
    colorClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    path: <><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><path d="M12 3v3M12 18v3M4 8l2.5 1.5M17.5 14.5L20 16M4 16l2.5-1.5M17.5 9.5L20 8" strokeWidth="1.1" /></>,
  },
  // A medal with a checkmark — a perfect score.
  perfect_ten: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><circle cx="12" cy="9" r="6" /><path d="M9 9l2 2 4-4" strokeWidth="1.4" /><path d="M9 14l-2 7 5-3 5 3-2-7" /></>,
  },
  // A shape and its faded twin split by a dashed mirror axis.
  mirror_image: {
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    path: <><rect x="4" y="6" width="6" height="12" rx="1" /><rect x="14" y="6" width="6" height="12" rx="1" opacity="0.4" /><path d="M12 4v16" strokeDasharray="1.5 1.5" /></>,
  },
  // A stacked deck of dominoes.
  flat_bonus_strong: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    path: <><rect x="7" y="10" width="10" height="8" rx="1" /><rect x="5" y="7" width="10" height="8" rx="1" opacity="0.7" /><rect x="9" y="4" width="10" height="8" rx="1" opacity="0.45" /></>,
  },
  // A bullseye target with an arrow dead center — a perfect landing.
  perfect_landing: {
    colorClass: 'text-amber-500 dark:text-amber-300',
    path: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><path d="M19 5l-5.3 5.3" strokeWidth="1.3" /></>,
  },
};

/** A soft radial-gradient medallion sitting behind an icon's linework — the linework alone read
 *  as thin, flat clip-art next to Balatro's painted item art. A tinted glow disc + a drop-shadow
 *  on the strokes gives real depth/weight without risking a blind per-path fill pass across 95
 *  hand-authored icons (several are pure open linework — zigzags, crosshairs — that a naive fill
 *  would auto-close into an ugly stray polygon). currentColor ties the medallion to each icon's
 *  own accent color, so it never needs its own color prop. */
function IconMedallion({ children, colorClass }: { children: React.ReactNode; colorClass: string }) {
  return (
    <span className="relative inline-block w-9 h-9 mx-auto">
      <span className={`absolute inset-0 rounded-full ${colorClass} opacity-[0.16] blur-[3px]`} style={{ background: 'radial-gradient(circle, currentColor 0%, currentColor 55%, transparent 78%)' }} />
      <svg
        className={`relative w-9 h-9 ${colorClass} drop-shadow-[0_1.5px_1px_rgba(0,0,0,0.5)]`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}

function genericCharmGlyph(id: string) {
  const special = SPECIAL_GLYPHS[id];
  if (special) {
    return <IconMedallion colorClass={special.colorClass}>{special.path}</IconMedallion>;
  }

  const op = ['add', 'subtract', 'multiply', 'divide'].find((o) => id.startsWith(`${o}_`));
  const category = op ? id.slice(op.length + 1).replace(/_lover$/, '') : '';
  const colorClass = op ? OP_GLYPH_COLOR[op] : 'text-stone-500 dark:text-stone-400';
  return <IconMedallion colorClass={colorClass}>{categoryGlyphPath(category)}</IconMedallion>;
}

export function renderCharmIcon(id: string) {
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
  /** Cila (polish) levels — 1 (default) through CHARM_POLISH_MAX_LEVEL; only shown above 1. */
  charmLevels?: Record<string, number>;
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
  charmLevels = {},
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

                {/* Cila (polish) level badge — only shown once actually upgraded past level 1. */}
                {(charmLevels[charm.id] ?? 1) > 1 && (
                  <div className="absolute top-2 right-2 z-10 w-4 h-4 rounded-full bg-sky-500 border border-sky-300 text-stone-950 font-pixel text-[9px] font-black flex items-center justify-center shadow-md">
                    {charmLevels[charm.id]}
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
