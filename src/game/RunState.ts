import { GameState, type GameConfig, type GameStateSnapshot } from './GameState.js';
import { CHARMS } from '../models/CharmRegistry.js';
import type { CharmDef, CharmHooks, RoundEndContext } from '../models/Charm.js';
import type { DominoStone, TileModifier, HandType } from '../models/types.js';
import { calculateScore, computeStoneChips, type ScoreCalculationResult, type PlayState } from '../engine/scoreCalculator.js';

export type RunStatus = 'IN_PROGRESS' | 'WON' | 'LOST';
export type RunPhase =
  | 'START_SCREEN'
  | 'BLIND_SELECT'
  | 'PLAYING'
  | 'ROUND_REWARD'
  | 'SHOP'
  | 'RUN_OVER_SCREEN'
  | 'CONGRATS_UNLOCK';

export interface SkipTag {
  id: string;
  name: string;
  description: string;
  icon: string;
  effect: 'FREE_SHOP_ITEM' | 'SHOP_DISCOUNT' | 'ADD_MONEY' | 'EXTRA_DISCARDS' | 'FREE_THEOREM';
}

const TAG_POOL: Omit<SkipTag, 'id'>[] = [
  { name: 'Altın Kupon', description: 'Dükkandaki ilk satın alım tamamen bedava olur.', icon: '🏷️', effect: 'FREE_SHOP_ITEM' },
  { name: 'Kozmik İndirim', description: 'Bir sonraki dükkanda tüm fiyatlar %50 indirimli olur.', icon: '🪐', effect: 'SHOP_DISCOUNT' },
  { name: 'Ekonomi Etiketi', description: 'Anında +$6 bakiye kazandırır.', icon: '💰', effect: 'ADD_MONEY' },
  { name: 'Iskarta Rünü', description: 'Bir sonraki turda fazladan +2 ıskarta hakkı verir.', icon: '🔄', effect: 'EXTRA_DISCARDS' },
  { name: 'Bilgelik Kitabı', description: 'İlk alacağınız Risale (Teorem Kitabı) bedava olur.', icon: '☄️', effect: 'FREE_THEOREM' },
];

export function generateRandomTag(): SkipTag {
  const base = TAG_POOL[Math.floor(Math.random() * TAG_POOL.length)];
  return {
    ...base,
    id: `tag_${Math.random().toString(36).substring(2, 6)}`,
  };
}

export interface RoundRewardLine {
  label: string;
  amount: number;
}

export interface RoundRewardSummary {
  lines: RoundRewardLine[];
  total: number;
  moneyBefore: number;
  moneyAfter: number;
}

export interface RunConfig {
  totalRounds: number;
  startingTarget: number;
  targetGrowthFactor: number;
  baseTurns: number;
  stonesPerTurn: number;
  maxPips?: number;
  startingMoney: number;
  maxCharmSlots: number;
  shopSize: number;
  rerollCost: number;
  /** Every blind target multiplied by this — 1 normally, 2 for the "Altın Ateş" challenge. */
  targetMultiplier?: number;
}

/** A plain-data dump of a whole RunState, JSON-safe for localStorage. Loosely typed on purpose —
 *  it's produced by spreading `this` (see RunState.toSnapshot()), so trying to hand-list every one
 *  of the class's 40+ fields here would just be a second place they could quietly drift out of
 *  sync. `config` and `game` are the two fields anything outside RunState actually needs to know
 *  the real shape of; everything else round-trips through Object.assign untouched. */
export interface RunStateSnapshot {
  config: RunConfig;
  game: GameStateSnapshot | null;
  activatedCharmIdsThisTurn?: string[];
  [key: string]: unknown;
}

// Halved relative to the original curve: the natural-sum + hand-type-level scoring engine (plus
// stonesPerTurn at 5) still leaves Ante 1's Small Blind out of reach for a first-time, charm-less
// run at the old 300/800/2000/... numbers. Halving keeps the same growth shape (so late-game
// charm/level scaling still ramps the same way) while giving new players a realistic shot at
// clearing Ante 1 on natural sums alone.
//
// Growth factor is a deliberately "ugly" 2.3x (not the round 2.5x the numbers used to grow by) —
// at exactly 2.5x, `Small(ante N+1) == Boss(ante N)` (0.6 × 2.5 == 1.5), so two DIFFERENT
// blinds on two DIFFERENT antes kept landing on the identical target number. 2.3x keeps the same
// overall growth shape without that coincidence ever recurring.
export const ANTE_TARGETS: Record<number, number> = {
  1: 300,
  2: 690,
  3: 1590,
  4: 3650,
  5: 8400,
  6: 19300,
  7: 44400,
  8: 102200,
};

/** Base payout per blind type, scaled up gradually with ante — Balatro's own $3/$4/$5 blind
 *  rewards never change across a whole run, but our targets grow ~2.3x per ante while the
 *  reward stayed flat, so by Ante 8 a Boss Blind hundreds of times harder than Ante 1's still
 *  only handed back the same $5. +1 every 2 antes keeps late rewards feeling proportionate
 *  without the shop economy exploding. */
export function getBlindReward(blindType: 'SMALL' | 'BIG' | 'BOSS', ante: number): number {
  const base = blindType === 'SMALL' ? 3 : blindType === 'BIG' ? 4 : 5;
  return base + Math.floor((ante - 1) / 2);
}

const DEFAULT_RUN_CONFIG: RunConfig = {
  totalRounds: 8,
  startingTarget: 300,
  targetGrowthFactor: 2.2,
  baseTurns: 6,
  stonesPerTurn: 5,
  startingMoney: 4,
  maxCharmSlots: 5,
  shopSize: 3,
  rerollCost: 2,
};

export function getHandStats(type: HandType, level: number): { chips: number; mult: number } {
  if (type === 'STRAIGHT') {
    return { chips: 15 + (level - 1) * 10, mult: 1 + (level - 1) * 1 };
  }
  if (type === 'BRANCHED') {
    return { chips: 25 + (level - 1) * 15, mult: 2 + (level - 1) * 2 };
  }
  if (type === 'LOOP') {
    return { chips: 40 + (level - 1) * 20, mult: 3 + (level - 1) * 3 };
  }
  return { chips: 10, mult: 1 };
}

export interface TheoremBookDef {
  id: string;
  handType: HandType;
  name: string;
  description: string;
  cost: number;
}

export const THEOREM_BOOKS: readonly TheoremBookDef[] = [
  { id: 'book_straight', handType: 'STRAIGHT', name: 'Düz Hat Risalesi', description: 'Düz Zincir el seviyesini kalıcı olarak +1 artırır (+10 Chip, +1 Çarpan).', cost: 3 },
  { id: 'book_branched', handType: 'BRANCHED', name: 'Çatallanma Teorisi', description: 'Çatallı Zincir el seviyesini kalıcı olarak +1 artırır (+15 Chip, +2 Çarpan).', cost: 4 },
  { id: 'book_loop', handType: 'LOOP', name: 'Sonsuz Döngü Kitabı', description: 'Sonsuz Döngü el seviyesini kalıcı olarak +1 artırır (+20 Chip, +3 Çarpan).', cost: 5 },
];

export interface RoundRecord {
  round: number;
  blind: 'SMALL' | 'BIG' | 'BOSS';
  target: number;
  scoreAchieved: number;
  moneyEarned: number;
  skipped?: boolean;
}

export interface CashoutDetails {
  blind: 'SMALL' | 'BIG' | 'BOSS';
  blindReward: number;
  turnsLeft: number;
  turnsLeftReward: number;
  interest: number;
  charmBonus: number;
  merchantsBonus: number;
  totalPayout: number;
}

export interface ShopActionResult {
  ok: boolean;
  error?: string;
  refund?: number;
}

export type ShopUpgradeId =
  | 'consumable_magnet'
  | 'consumable_gild'
  | 'consumable_ivory'
  | 'consumable_obsidian'
  | 'consumable_amber'
  | 'consumable_trash'
  | 'consumable_scissors'
  | 'consumable_magnifier'
  | 'consumable_transmute'
  | 'consumable_clover'
  | 'consumable_upgrade';

export interface ShopUpgradeDef {
  id: ShopUpgradeId;
  name: string;
  description: string;
  cost: number;
  type: 'CONSUMABLE';
}

export const SHOP_UPGRADES: readonly ShopUpgradeDef[] = [
  { id: 'consumable_magnet', name: 'Mıknatıs', description: 'Tahtadaki bir yaprak (uçta kalan) domino taşını söküp elinize geri alır.', cost: 3, type: 'CONSUMABLE' },
  { id: 'consumable_gild', name: 'Yaldız', description: 'Elinizdeki bir taşı Altın Taş yapar. Altın taşlar oynandığında +$3 kazandırır.', cost: 4, type: 'CONSUMABLE' },
  { id: 'consumable_ivory', name: 'Fildişi Rünü', description: 'Elinizdeki bir taşı kalıcı olarak Fildişi yapar (+15 Taban Puan).', cost: 4, type: 'CONSUMABLE' },
  { id: 'consumable_obsidian', name: 'Obsidyen Rünü', description: 'Elinizdeki bir taşı kalıcı olarak Obsidyen yapar (Çarpan x2, %25 kırılma şansı).', cost: 5, type: 'CONSUMABLE' },
  { id: 'consumable_amber', name: 'Kehribar Rünü', description: 'Elinizdeki bir taşı kalıcı olarak Kehribar yapar (Bağlandığı komşu taş sayılarını eşitler).', cost: 4, type: 'CONSUMABLE' },
  { id: 'consumable_trash', name: 'Parçalama Ritüeli', description: 'Elinizdeki bir taşı kalıcı olarak destenizden siler (destenizi inceltir).', cost: 4, type: 'CONSUMABLE' },
  { id: 'consumable_scissors', name: 'Mistik Makas', description: 'Tahtadaki uymayan bir bağlantıyı (edge) keser, zinciri iki bağımsız kol haline getirir.', cost: 3, type: 'CONSUMABLE' },
  { id: 'consumable_magnifier', name: 'Tozlu Büyüteç', description: 'Elinizdeki bir domino taşının üzerindeki sayıları o el için geçici olarak ikiye katlar.', cost: 4, type: 'CONSUMABLE' },
  { id: 'consumable_transmute', name: 'Dönüşüm İksiri', description: 'Elinizdeki bir domino taşının sol ve sağ sayılarını birbirine eşitler (çift/spinner yapar).', cost: 4, type: 'CONSUMABLE' },
  { id: 'consumable_clover', name: 'Uğurlu Yonca', description: 'Elinizdeki tüm taşları o el için altın taş yapar (+3 dolar kazanç).', cost: 5, type: 'CONSUMABLE' },
  { id: 'consumable_upgrade', name: 'Geliştirme Parşömeni', description: 'Elinizdeki bir taşın her iki tarafına da +2 ekler (Maks 6). Geliştirilen taraflar mavi parlar.', cost: 4, type: 'CONSUMABLE' },
];

export type VoucherId =
  | 'voucher_wide_pockets'
  | 'voucher_wizard_bag'
  | 'voucher_rich_start'
  | 'voucher_bargaining_power'
  | 'voucher_crystal_ball';

export interface VoucherDef {
  id: VoucherId;
  name: string;
  description: string;
  cost: number;
  /** One-time permanent effect applied the moment it's purchased. */
  apply: (run: RunState) => void;
}

export const VOUCHERS: readonly VoucherDef[] = [
  {
    id: 'voucher_wide_pockets',
    name: 'Ek Vitrin Yeri',
    description: 'Tılsım slot sayınızı kalıcı olarak +1 artırır.',
    cost: 10,
    apply: (run) => {
      run.config.maxCharmSlots += 1;
    },
  },
  {
    id: 'voucher_wizard_bag',
    name: 'Büyücü Çantası',
    description: 'Sarf edilebilir büyü slot sayınızı kalıcı olarak +1 artırır.',
    cost: 8,
    apply: (run) => {
      run.maxConsumableSlots += 1;
    },
  },
  {
    id: 'voucher_rich_start',
    name: 'Zengin Başlangıç',
    description: 'Anında +$8 kazandırır.',
    cost: 6,
    apply: (run) => {
      run.money += 8;
    },
  },
  {
    id: 'voucher_bargaining_power',
    name: 'Pazarlık Gücü',
    description: 'Mağaza yenileme (reroll) maliyetini kalıcı olarak $1 azaltır.',
    cost: 9,
    apply: (run) => {
      run.config.rerollCost = Math.max(1, run.config.rerollCost - 1);
    },
  },
  {
    id: 'voucher_crystal_ball',
    name: 'Kehanet Küresi',
    description: 'Bir sonraki mağazanızda 1 ekstra tılsım teklifi belirir.',
    cost: 10,
    apply: (run) => {
      run.nextShopBonusCharm = true;
    },
  },
];

export interface BoosterPackDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  modifier: TileModifier;
  /** JUMBO packs offer 5 stone choices instead of the standard 3 (still pick 1) — a bigger, pricier kese. */
  size?: 'STANDARD' | 'JUMBO';
}

export const BOOSTER_PACKS: readonly BoosterPackDef[] = [
  { id: 'booster_standard', name: 'Standart Taş Kesesi', description: '3 adet rastgele normal domino taşı içeren mistik kese; 1 tanesini destenize seçersiniz.', cost: 4, modifier: 'NORMAL' },
  { id: 'booster_obsidian', name: 'Obsidyen Kesesi', description: '3 adet Obsidyen taşı içeren kese; 1 tanesini destenize seçersiniz.', cost: 8, modifier: 'OBSIDIAN' },
  { id: 'booster_ivory', name: 'Fildişi Kesesi', description: '3 adet Fildişi taşı içeren kese; 1 tanesini destenize seçersiniz.', cost: 7, modifier: 'IVORY' },
  { id: 'booster_amber', name: 'Kehribar Kesesi', description: '3 adet Kehribar taşı içeren kese; 1 tanesini destenize seçersiniz.', cost: 6, modifier: 'AMBER' },
  { id: 'booster_jumbo_standard', name: 'Jumbo Taş Kesesi', description: '5 adet rastgele normal domino taşı içeren devasa kese; 1 tanesini destenize seçersiniz.', cost: 7, modifier: 'NORMAL', size: 'JUMBO' },
  { id: 'booster_jumbo_obsidian', name: 'Jumbo Obsidyen Kesesi', description: '5 adet Obsidyen taşı içeren devasa kese; 1 tanesini destenize seçersiniz.', cost: 12, modifier: 'OBSIDIAN', size: 'JUMBO' },
];

export interface RuneOptionDef {
  id: string;
  name: string;
  description: string;
  /** How many customDeck stones this rune can be applied to at once. */
  targetCount: number;
  modifier?: TileModifier;
  /** Yaldız rünü: sets isGolden instead of a modifier. */
  gild?: boolean;
}

export const RUNE_POOL: readonly RuneOptionDef[] = [
  { id: 'rune_ivory_2', name: 'Çifte Fildişi Mührü', description: '2 seçili taşı kalıcı olarak Fildişi yapar (+15 Taban Puan).', targetCount: 2, modifier: 'IVORY' },
  { id: 'rune_obsidian_2', name: 'Obsidyen İkilisi', description: '2 seçili taşı kalıcı olarak Obsidyen yapar (Çarpan x2).', targetCount: 2, modifier: 'OBSIDIAN' },
  { id: 'rune_amber_2', name: 'Kehribar Bağı', description: '2 seçili taşı kalıcı olarak Kehribar yapar (komşu taş sayılarını eşitler).', targetCount: 2, modifier: 'AMBER' },
  { id: 'rune_gild_3', name: 'Altın Yağmuru', description: '3 seçili taşı Altın Taş yapar (oynandığında +$3 kazandırır).', targetCount: 3, gild: true },
  { id: 'rune_obsidian_3', name: 'Üçlü Obsidyen Yağması', description: '3 seçili taşı kalıcı olarak Obsidyen yapar (Çarpan x2).', targetCount: 3, modifier: 'OBSIDIAN' },
];

export interface RunePackDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** JUMBO rune packs offer 5 options instead of 3 (still pick 1) — a bigger, pricier kese. */
  size?: 'STANDARD' | 'JUMBO';
}

export const RUNE_PACKS: readonly RunePackDef[] = [
  { id: 'rune_pack_standard', name: 'Rün Kesesi', description: '3 rastgele rün seçeneği sunar; birini seçip birden fazla taşınıza uygulayabilirsiniz.', cost: 9 },
  { id: 'rune_pack_jumbo', name: 'Jumbo Rün Kesesi', description: '5 rastgele rün seçeneği sunar; birini seçip birden fazla taşınıza uygulayabilirsiniz.', cost: 14, size: 'JUMBO' },
];

export type ShopOffer =
  | { type: 'CHARM'; item: CharmDef }
  | { type: 'UPGRADE'; item: ShopUpgradeDef }
  | { type: 'VOUCHER'; item: VoucherDef }
  | { type: 'BOOSTER'; item: BoosterPackDef }
  | { type: 'THEOREM'; item: TheoremBookDef }
  | { type: 'RUNE_PACK'; item: RunePackDef };

// ─────────────────────────────────────────────────────────────
// BOSS BLINDS
// ─────────────────────────────────────────────────────────────

export interface BossBlindDef {
  id: string;
  /** Short display name shown in BlindSelectScreen */
  name: string;
  /** One-sentence thematic flavor text */
  flavorText: string;
  /** Brief rule reminder shown in-game HUD (≤40 chars) */
  ruleLabel: string;
  /** Threat tier — drives color coding in UI */
  tier: 'MODERATE' | 'DANGEROUS' | 'LETHAL';
  /** Emoji / symbol for the boss card */
  icon: string;
}

export const BOSS_BLINDS: readonly BossBlindDef[] = [
  {
    id: 'boss_blind_judge',
    name: 'Kör Kadı',
    flavorText: '"Adalet kördür — tek sayı taşıyan taşları görmez."',
    ruleLabel: 'Tek toplamlı taş varsa tılsımlar tetiklenmez!',
    tier: 'MODERATE',
    icon: '⚖️',
  },
  {
    id: 'boss_blind_mirror',
    name: 'Aynalı Kule',
    flavorText: '"Her yansıma hakikatin yarısını söyler."',
    ruleLabel: 'Tüm taban puanlar yarıya iner.',
    tier: 'MODERATE',
    icon: '🪞',
  },
  {
    id: 'boss_blind_gate',
    name: 'Demirli Kapı',
    flavorText: '"Bu kapı yalnız düz yoldan geçenleri tanır."',
    ruleLabel: 'Çatallı zincir yasak — sadece düz zincir!',
    tier: 'DANGEROUS',
    icon: '🔒',
  },
  {
    id: 'boss_blind_glassbreaker',
    name: 'Cam Kırıcı',
    flavorText: '"Güçlünü kırmak… zevklidir."',
    ruleLabel: 'Obsidyen taşlar %100 kırılır!',
    tier: 'DANGEROUS',
    icon: '💀',
  },
  {
    id: 'boss_blind_chainbreaker',
    name: 'Zincir Koparıcı',
    flavorText: '"Uzun zincirler kalın kelepçeler taşır."',
    ruleLabel: 'Elde en fazla 3 taş!',
    tier: 'DANGEROUS',
    icon: '⛓️',
  },
  {
    id: 'boss_blind_precision',
    name: 'Hassas Terazi',
    flavorText: '"Fazlası da noksanlık sayılır."',
    ruleLabel: 'Hedefi en fazla +15 aşabilirsin.',
    tier: 'DANGEROUS',
    icon: '🎯',
  },
  {
    id: 'boss_blind_watcher',
    name: 'Gözetleyen Göz',
    flavorText: '"Uzun zincirler dikkatimi dağıtır."',
    ruleLabel: 'Bir elde en fazla 4 taş oynanabilir!',
    tier: 'LETHAL',
    icon: '👁️',
  },
  {
    id: 'boss_blind_pressure',
    name: 'Büyük Baskı',
    flavorText: '"Çiftlerin ağırlığı seni ezer."',
    ruleLabel: 'Çiftli (spinner) taş varsa çarpan yarıya iner!',
    tier: 'LETHAL',
    icon: '🌑',
  },
];

// ─────────────────────────────────────────────────────────────
// STARTING CHESTS
// ─────────────────────────────────────────────────────────────

export type ChestId =
  | 'chest_ivory'
  | 'chest_curator'
  | 'chest_nomad'
  | 'chest_obsidian';

export interface ChestDef {
  id: ChestId;
  name: string;
  description: string;
  icon: string;
  /** Applied once when the run starts, after initializeRun(). */
  apply: (run: RunState) => void;
}

export const STARTING_CHESTS: readonly ChestDef[] = [
  {
    id: 'chest_ivory',
    name: "Fildişi Sandık",
    description: 'Oyuna destesinde fazladan 4 adet kalıcı "Fildişi Mühürlü" domino taşıyla başlar.',
    icon: '🦴',
    apply: (run) => {
      const maxPips = run.config.maxPips ?? 6;
      for (let i = 0; i < 4; i++) {
        const left = Math.floor(Math.random() * (maxPips + 1));
        const right = Math.floor(Math.random() * (maxPips + 1 - left)) + left;
        const randId = Math.random().toString(36).substring(2, 6);
        run.customDeck.push({
          id: `domino_ivory_${left}_${right}_${randId}`,
          leftVal: left,
          rightVal: right,
          modifier: 'IVORY',
        });
      }
    },
  },
  {
    id: 'chest_curator',
    name: "Küratörün Çantası",
    description: 'Oyuna maksimum 6 Tılsım slotuyla başlar ama başlangıç altın miktarı sıfırdır.',
    icon: '👜',
    apply: (run) => {
      run.config.maxCharmSlots = 6;
      run.money = 0;
    },
  },
  {
    id: 'chest_nomad',
    name: "Gezgin Sandığı",
    description: 'Dükkandaki tüm nesneleri %25 indirimli alır ama destesinde hiç 5 veya 6 barındıran taş yoktur.',
    icon: '⛺',
    apply: (run) => {
      run.hasNomadDiscount = true;
      run.customDeck = run.customDeck.filter((s) => s.leftVal < 5 && s.rightVal < 5);
    },
  },
  {
    id: 'chest_obsidian',
    name: "Obsidyen Sandık",
    description: 'Destenizdeki tüm çiftli taşlar "Obsidyen (Cam)" mühürlüdür (kırılırlarsa desteden silinirler).',
    icon: '🌋',
    apply: (run) => {
      run.customDeck.forEach((s) => {
        if (s.leftVal === s.rightVal) {
          s.modifier = 'OBSIDIAN';
        }
      });
    },
  },
];

// ─────────────────────────────────────────────────────────────
// CHARM FUSION RECIPES
// ─────────────────────────────────────────────────────────────

export interface FusionRecipe {
  /** ID of the first source charm (order-independent) */
  sourceA: string;
  /** ID of the second source charm */
  sourceB: string;
  /** ID of the resulting hybrid charm — must exist in CHARMS */
  resultId: string;
  /** Gold cost to perform the fusion */
  cost: number;
}

export const FUSION_RECIPES: readonly FusionRecipe[] = [
  { sourceA: 'cosmic_pendulum',    sourceB: 'heart_matryoshka',  resultId: 'fusion_grand_resonance',   cost: 3 },
  { sourceA: 'double_oracle',      sourceB: 'binary_mirror',     resultId: 'fusion_twin_oracle',        cost: 3 },
  { sourceA: 'golden_abacus',      sourceB: 'thrifty_phantom',   resultId: 'fusion_lucky_ledger',       cost: 4 },
  { sourceA: 'chain_weaver',       sourceB: 'echo_chamber',      resultId: 'fusion_resonant_chain',     cost: 4 },
  { sourceA: 'obsidian_eye',       sourceB: 'ivory_veil',        resultId: 'fusion_prism_eye',          cost: 5 },
];



/**
 * Orchestrates a full run: a fixed sequence of Antes (each consisting of Small, Big, and Boss blinds),
 * money, owned charms, and the shop phase between blinds.
 */
export class RunState {
  readonly config: RunConfig;
  round = 1; // Round acts as "Ante" number here (1 to 8)
  money: number;
  status: RunStatus = 'IN_PROGRESS';
  phase: RunPhase = 'START_SCREEN';
  ownedCharmIds: string[] = [];
  currentTarget: number;
  /** Which StartScreen challenge (if any) this run was started under — 'ch_no_charms',
   *  'ch_doubles_only', 'ch_golden_rush', 'ch_speed_chain', or null for a normal run. */
  activeChallengeId: string | null = null;
  /** Total score carried across every blind of the run — blinds add on top of it instead of resetting to 0. */
  cumulativeScore = 0;
  game!: GameState;
  shopOffers: ShopOffer[] = [];
  history: RoundRecord[] = [];
  /** Itemized money breakdown for the round that was just won, shown by RoundRewardScreen before the shop opens. */
  lastRoundReward: RoundRewardSummary | null = null;
  customDeck: DominoStone[] = [];
  handLevels: Record<HandType, number> = { STRAIGHT: 1, BRANCHED: 1, LOOP: 1 };
  draftOffers: DominoStone[] = [];
  activeBoosterId: string | null = null;

  // Rün Kesesi (Rune Pack): buy -> pick 1 of 3 -> pick K existing customDeck stones -> apply.
  runeOffers: RuneOptionDef[] = [];
  activeRunePackId: string | null = null;
  pendingRune: RuneOptionDef | null = null;

  // Consumables
  consumables: string[] = [];
  discardsLeft = 2;
  /** Permanent per-round discard bonus (e.g. from the "Savaşçının Sandığı" starting chest) — startRound()
   *  re-derives discardsLeft from the deck base every round, so this must be re-added there each time. */
  extraDiscardsPerRound = 0;

  // Permanent, run-wide upgrades bought once from the shop (never expire, never re-offered).
  ownedVoucherIds: string[] = [];
  maxConsumableSlots = 2;
  /** Set by "Kehanet Küresi" — consumed by the next rollShopOffers() call. */
  nextShopBonusCharm = false;

  // Setup tags & rerolls
  currentRerollCost = 2;
  activeTag: SkipTag | null = null;
  smallBlindTag: SkipTag | null = null;
  bigBlindTag: SkipTag | null = null;
  extraDiscardsNextRound = 0;
  isEndless = false;
  charmDurability: Record<string, number> = {};
  perishedCharmMessage: string | null = null;

  // Run Setup selections
  selectedDeck: 'RED' | 'BLUE' | 'YELLOW' = 'RED';
  selectedStake: 'WHITE' | 'RED' = 'WHITE';
  activeBlind: 'SMALL' | 'BIG' | 'BOSS' | null = null;

  // Phase 3: Boss / Chest / Fusion
  activeBossId: string | null = null;
  selectedChestId: ChestId | null = null;
  hasMerchantsBonus = false;
  hasNomadDiscount = false;
  /** Track which fused charms we own (sub-IDs of hybrid charms). */
  fusedCharmIds: string[] = [];

  // Statistics tracker
  bestHandScore = 0;
  totalCardsPlayed = 0;
  totalCardsDiscarded = 0;
  totalRerolls = 0;
  totalPurchases = 0;
  defeatedBy = '';
  handTypePlayCounts: Record<HandType, number> = { STRAIGHT: 0, BRANCHED: 0, LOOP: 0 };

  private roundHooks: CharmHooks[] = [];

  // Faz 10: İmza Tılsımlar (active/interactive charm state)
  private activatedCharmIdsThisTurn = new Set<string>();
  private lastActivationTurn = 0;
  private rescueUsedThisRound = false;
  /** Set for one tick when an onSubmitFail charm rescues the round — App.tsx reads then clears it. */
  lastRescueCharmName: string | null = null;

  /** The constructor-configured slot count — the baseline `initializeRun` restores to for a
   *  normal (non-"Tılsımsız Sefer") run, instead of always snapping back to the global default
   *  and silently discarding a caller's own override (as a plain `new RunState({...})` does). */
  private readonly baseMaxCharmSlots: number;

  constructor(config: Partial<RunConfig> = {}) {
    this.config = { ...DEFAULT_RUN_CONFIG, ...config };
    this.baseMaxCharmSlots = this.config.maxCharmSlots;
    this.money = this.config.startingMoney;
    this.currentTarget = this.config.startingTarget;
    this.currentRerollCost = this.config.rerollCost;
  }

  /** A plain-data dump of the whole run for localStorage persistence. Most fields are already
   *  primitives/arrays/records and survive a spread untouched; the three that don't get handled
   *  explicitly: `game` (a class instance -> its own toSnapshot()), `activatedCharmIdsThisTurn`
   *  (a Set -> array), and `roundHooks` (an array of closures over the owned charms — genuinely
   *  not serializable, and not needed to be: fromSnapshot() rebuilds it via wireCharms()). */
  toSnapshot(): RunStateSnapshot {
    const snap = { ...this } as unknown as RunStateSnapshot & { roundHooks?: unknown };
    snap.game = this.game ? this.game.toSnapshot() : null;
    snap.activatedCharmIdsThisTurn = Array.from(this.activatedCharmIdsThisTurn);
    delete snap.roundHooks;
    return snap;
  }

  static fromSnapshot(snap: RunStateSnapshot): RunState {
    const run = new RunState(snap.config);
    Object.assign(run, snap);
    run.game = snap.game ? GameState.fromSnapshot(snap.game) : (undefined as unknown as GameState);
    (run as unknown as { activatedCharmIdsThisTurn: Set<string> }).activatedCharmIdsThisTurn = new Set(
      snap.activatedCharmIdsThisTurn ?? []
    );
    (run as unknown as { roundHooks: CharmHooks[] }).roundHooks = run.phase === 'START_SCREEN' ? [] : run.wireCharms();
    return run;
  }

  initializeRun(deck: 'RED' | 'BLUE' | 'YELLOW', stake: 'WHITE' | 'RED', challengeId: string | null = null): void {
    this.selectedDeck = deck;
    this.selectedStake = stake;
    this.activeChallengeId = challengeId;
    this.money = deck === 'YELLOW' ? 8 : 4;
    this.currentTarget = ANTE_TARGETS[1];
    this.cumulativeScore = 0;
    this.round = 1;
    this.status = 'IN_PROGRESS';
    this.phase = 'BLIND_SELECT';
    this.activeBlind = null;
    this.consumables = [];
    this.ownedCharmIds = [];
    this.ownedVoucherIds = [];
    this.maxConsumableSlots = 2;
    this.nextShopBonusCharm = false;
    this.activeBossId = null;
    this.selectedChestId = null;
    this.hasMerchantsBonus = false;
    this.hasNomadDiscount = false;
    this.extraDiscardsPerRound = 0;
    this.fusedCharmIds = [];
    this.lastRoundReward = null;
    this.handLevels = { STRAIGHT: 1, BRANCHED: 1, LOOP: 1 };

    this.resetRerollCost();
    this.activeTag = null;
    this.smallBlindTag = generateRandomTag();
    this.bigBlindTag = generateRandomTag();
    this.extraDiscardsNextRound = 0;
    this.isEndless = false;
    this.charmDurability = {};
    this.perishedCharmMessage = null;

    // "Tılsımsız Sefer": no charm slots at all — the shop's own slotsFull check (0 >= 0) then
    // naturally disables every charm/rune "SATIN AL" button without needing a separate guard.
    this.config.maxCharmSlots = challengeId === 'ch_no_charms' ? 0 : this.baseMaxCharmSlots;
    // "Altın Ateş": every blind target doubled — reset to 1 for every other challenge/normal run
    // so a previous run's challenge setting can never leak into the next one.
    this.config.targetMultiplier = challengeId === 'ch_golden_rush' ? 2 : 1;

    // Generate persistent customDeck
    let initialStones: DominoStone[] = [];
    const maxPips = this.config.maxPips ?? 6;
    for (let left = 0; left <= maxPips; left++) {
      for (let right = left; right <= maxPips; right++) {
        const randId = Math.random().toString(36).substring(2, 6);
        initialStones.push({
          id: `domino_${left}_${right}_${randId}`,
          leftVal: left,
          rightVal: right,
          modifier: 'NORMAL',
          // "Altın Ateş": the whole deck starts golden (each play worth +$3), balanced by
          // doubled blind targets above.
          isGolden: challengeId === 'ch_golden_rush' ? true : undefined,
        });
      }
    }
    // "Çiftler Festivali": strip every non-double out of the deck, leaving only spinners.
    if (challengeId === 'ch_doubles_only') {
      initialStones = initialStones.filter((s) => s.leftVal === s.rightVal);
    }
    this.customDeck = initialStones;
    this.draftOffers = [];
    this.activeBoosterId = null;
    this.shopOffers = [];
    this.history = [];
    this.bestHandScore = 0;
    this.totalCardsPlayed = 0;
    this.totalCardsDiscarded = 0;
    this.totalRerolls = 0;
    this.totalPurchases = 0;
    this.defeatedBy = '';
    this.handTypePlayCounts = { STRAIGHT: 0, BRANCHED: 0, LOOP: 0 };

    // An empty placeholder round so `game` is always defined the instant a run starts — lets the
    // UI keep the board/HUD mounted as a persistent backdrop behind blind-select/shop/reward
    // overlays instead of navigating to a separate screen. startRound() replaces this with the
    // real thing the moment a blind is actually played.
    this.game = new GameState({
      targetScore: this.currentTarget,
      maxTurns: 6,
      stonesPerTurn: this.config.stonesPerTurn,
      maxPips: this.config.maxPips,
    });
  }

  startBlind(blindType: 'SMALL' | 'BIG' | 'BOSS'): void {
    this.activeBlind = blindType;
    this.phase = 'PLAYING';
    this.startRound();
  }

  /** The score this blind requires — each blind (Small/Big/Boss) is independent and starts fresh
   *  from 0, matching Balatro's actual blind structure (score never carries over between blinds). */
  getBlindTarget(blindType: 'SMALL' | 'BIG' | 'BOSS'): number {
    const multiplier = this.selectedStake === 'RED' ? 1.25 : 1.0;
    const factor = blindType === 'SMALL' ? 0.6 : blindType === 'BIG' ? 1.0 : 1.5;
    return Math.round(this.currentTarget * factor * multiplier * (this.config.targetMultiplier ?? 1));
  }

  skipBlind(blindType: 'SMALL' | 'BIG'): void {
    if (this.phase !== 'BLIND_SELECT') return;

    let tagToApply: SkipTag | null = null;
    if (blindType === 'SMALL') {
      tagToApply = this.smallBlindTag;
      this.smallBlindTag = null;
    } else {
      tagToApply = this.bigBlindTag;
      this.bigBlindTag = null;
    }

    if (tagToApply) {
      this.activeTag = tagToApply;
      if (tagToApply.effect === 'ADD_MONEY') {
        this.money += 6;
      } else if (tagToApply.effect === 'EXTRA_DISCARDS') {
        this.extraDiscardsNextRound = 2;
      }
    }

    const blindTarget = this.getBlindTarget(blindType);
    this.history.push({
      round: this.round,
      blind: blindType,
      target: blindTarget,
      scoreAchieved: 0,
      moneyEarned: 0,
      skipped: true,
    });

    this.activeBlind = blindType; // set temporarily to know what we skipped
    this.currentRerollCost = this.config.rerollCost; // Reset reroll cost inflation!
    this.phase = 'SHOP';
    this.shopOffers = this.rollShopOffers();
  }

  /** Applies fn to the current round's GameState, then checks for round completion / run loss. */
  act<T>(fn: (game: GameState) => T): T {
    const result = fn(this.game);

    // "Turda bir kez" tılsım aktivasyonları, gerçek bir tur ilerlemesinde sıfırlanır — bu tek
    // merkezi mutasyon noktası, ayrı bir turn-change hook'una gerek bırakmadan bunu yapar.
    if (this.game && this.game.turn !== this.lastActivationTurn) {
      this.activatedCharmIdsThisTurn.clear();
      this.lastActivationTurn = this.game.turn;
    }

    if (this.phase === 'PLAYING') {
      if (this.game.status === 'WON') {
        // Boss 6 – Hassas Terazi: cannot exceed target by more than 15
        if (this.activeBossId === 'boss_blind_precision' && this.game.score > this.game.config.targetScore + 15) {
          this.game.status = 'LOST';
          this.game.lossReason = null;
          this.status = 'LOST';
          this.defeatedBy = '🎯 Hassas Terazi — Hedefi fazla aştın!';
        } else {
          this.completeRound();
        }
      } else if (this.game.status === 'LOST') {
        // Zamanı Büken Sarkaç ve benzeri "onSubmitFail" tılsımları: rauntta bir kez, kaybı
        // gerçek LOST'a çevirmeden önce geri sarma/ücretsiz çekiş şansı sunar.
        const rescue = this.rescueUsedThisRound ? null : this.tryOnSubmitFailRescue();
        if (rescue) {
          this.rescueUsedThisRound = true;
        } else {
          this.status = 'LOST';
          this.defeatedBy =
            this.activeBlind === 'SMALL' ? 'Small Blind' : this.activeBlind === 'BIG' ? 'Big Blind' : 'Boss Blind';
          this.phase = 'RUN_OVER_SCREEN';
        }
      }
    }

    return result;
  }

  /** Checks owned charms' onSubmitFail hooks (first one that returns a truthy result wins),
   *  applies its rewind/free-draw, and returns its charm name — or null if no rescue applies. */
  private tryOnSubmitFailRescue(): string | null {
    const roundEndCtx: RoundEndContext = {
      finalScore: this.game.score,
      target: this.getBlindTarget(this.activeBlind!),
      turnsUsed: this.game.turn - 1,
      turnsLeft: Math.max(0, (this.selectedDeck === 'BLUE' ? 7 : 6) - (this.game.turn - 1)),
      nodes: this.game.playedNodesThisRound,
    };

    for (let idx = 0; idx < this.ownedCharmIds.length; idx++) {
      const hooks = this.roundHooks[idx];
      if (!hooks?.onSubmitFail) continue;
      const result = hooks.onSubmitFail(roundEndCtx);
      if (!result) continue;

      // submitChain() already scored and cleared the table before this runs ("Gönder ve Sil"),
      // so there's nothing left on the board to claw back — the score from that hand stands.
      // "Rewind" instead gives the turn itself back, for a genuine extra shot at the target.
      if (result.rewind) {
        this.game.turn = Math.max(1, this.game.turn - 1);
      }
      if (result.freeDraw) this.game.hand.push(...this.game.stoneDeck.draw(result.freeDraw));
      this.game.status = 'PLAYING';
      this.game.lossReason = null;

      const def = CHARMS.find((c) => c.id === this.ownedCharmIds[idx]);
      this.lastRescueCharmName = def?.name ?? null;
      return this.lastRescueCharmName;
    }
    return null;
  }

  /** Turda bir kez, oyuncunun tıklayarak elindeki bir taşa uyguladığı manuel tılsım etkisi. */
  useActiveCharm(charmId: string, targetStoneId: string): ShopActionResult {
    if (this.phase !== 'PLAYING') return { ok: false, error: 'Sadece oynarken kullanılabilir.' };
    if (!this.ownedCharmIds.includes(charmId)) return { ok: false, error: 'Bu tılsıma sahip değilsin.' };
    if (this.activatedCharmIdsThisTurn.has(charmId)) return { ok: false, error: 'Bu tılsım bu tur zaten kullanıldı.' };

    const idx = this.ownedCharmIds.indexOf(charmId);
    const hooks = this.roundHooks[idx];
    if (!hooks?.onActivate) return { ok: false, error: 'Bu tılsımın aktif bir yeteneği yok.' };

    const stoneIdx = this.game.hand.findIndex((s) => s.id === targetStoneId);
    if (stoneIdx === -1) return { ok: false, error: 'Taş elinizde bulunamadı.' };

    const replacement = hooks.onActivate(this.game.hand[stoneIdx]);
    if (!replacement) return { ok: false, error: 'Bu taşa uygulanamaz.' };

    this.game.hand.splice(stoneIdx, 1, ...replacement);
    this.activatedCharmIdsThisTurn.add(charmId);
    return { ok: true };
  }

  /** Whether `charmId` has already been clicked/used this turn (for CharmBar's dimmed state). */
  isCharmActivatedThisTurn(charmId: string): boolean {
    return this.activatedCharmIdsThisTurn.has(charmId);
  }

  buyItem(itemId: string): ShopActionResult {
    if (this.phase !== 'SHOP') return { ok: false, error: 'Mağazada değilsin.' };
    const offer = this.shopOffers.find((o) => o.item.id === itemId);
    if (!offer) return { ok: false, error: 'Bu ürün mağazada yok.' };
    if (this.money < offer.item.cost) return { ok: false, error: 'Yeterli paran yok.' };

    if (offer.type === 'CHARM') {
      if (this.ownedCharmIds.length >= this.config.maxCharmSlots) {
        return { ok: false, error: 'Tılsım slotların dolu.' };
      }
      this.money -= offer.item.cost;
      this.ownedCharmIds.push(offer.item.id);
      
      const charmDef = offer.item as any;
      if (charmDef.perish && charmDef.maxDurability !== undefined) {
        this.charmDurability[offer.item.id] = charmDef.maxDurability;
      }
      this.resetRerollCost(); // Apply reroll discount if small_number_love is bought!
    } else if (offer.type === 'VOUCHER') {
      this.money -= offer.item.cost;
      this.ownedVoucherIds.push(offer.item.id);
      offer.item.apply(this);
    } else if (offer.type === 'BOOSTER') {
      this.money -= offer.item.cost;
      this.activeBoosterId = offer.item.id;
      this.generateDraftOffers(offer.item.modifier, offer.item.size === 'JUMBO' ? 5 : 3);
    } else if (offer.type === 'RUNE_PACK') {
      this.money -= offer.item.cost;
      this.activeRunePackId = offer.item.id;
      this.generateRuneOffers(offer.item.size === 'JUMBO' ? 5 : 3);
    } else if (offer.type === 'THEOREM') {
      this.money -= offer.item.cost;
      const handType = offer.item.handType;
      this.handLevels[handType] = (this.handLevels[handType] ?? 1) + 1;
    } else {
      const upgrade = offer.item;
      if (this.consumables.length >= this.maxConsumableSlots) {
        return { ok: false, error: `Sarf edilebilir eşya slotların dolu (Maks ${this.maxConsumableSlots}).` };
      }
      this.money -= upgrade.cost;
      this.consumables.push(upgrade.id);
    }

    // Consume one-time free tag effects
    if (this.activeTag) {
      if (this.activeTag.effect === 'FREE_SHOP_ITEM') {
        this.activeTag = null;
      } else if (this.activeTag.effect === 'FREE_THEOREM' && offer.type === 'THEOREM') {
        this.activeTag = null;
      }
    }

    this.totalPurchases += 1;
    this.shopOffers = this.shopOffers.filter((o) => o.item.id !== itemId);
    return { ok: true };
  }

  private generateDraftOffers(modifier: TileModifier, count = 3): void {
    this.draftOffers = [];
    const maxPips = this.config.maxPips ?? 6;
    for (let i = 0; i < count; i++) {
      const left = Math.floor(Math.random() * (maxPips + 1));
      const right = Math.floor(Math.random() * (maxPips + 1 - left)) + left;
      const randId = Math.random().toString(36).substring(2, 6);
      this.draftOffers.push({
        id: `draft_${left}_${right}_${randId}`,
        leftVal: left,
        rightVal: right,
        modifier: modifier,
      });
    }
  }

  draftStone(stoneId: string): ShopActionResult {
    const selected = this.draftOffers.find((s) => s.id === stoneId);
    if (!selected) return { ok: false, error: 'Seçilen taş bulunamadı.' };

    const permanentStone: DominoStone = {
      id: `domino_${selected.leftVal}_${selected.rightVal}_${Math.random().toString(36).substring(2, 6)}`,
      leftVal: selected.leftVal,
      rightVal: selected.rightVal,
      modifier: selected.modifier,
    };

    this.customDeck.push(permanentStone);
    this.draftOffers = [];
    this.activeBoosterId = null;
    return { ok: true };
  }

  /** Walks away from a booster pack's card offer without drafting anything (money already spent). */
  skipDraft(): ShopActionResult {
    if (this.draftOffers.length === 0) return { ok: false, error: 'Açık bir kese yok.' };
    this.draftOffers = [];
    this.activeBoosterId = null;
    return { ok: true };
  }

  private generateRuneOffers(count = 3): void {
    const shuffled = [...RUNE_POOL].sort(() => Math.random() - 0.5);
    this.runeOffers = shuffled.slice(0, Math.min(count, shuffled.length)).map((r) => ({ ...r }));
  }

  chooseRuneOption(optionId: string): ShopActionResult {
    const selected = this.runeOffers.find((r) => r.id === optionId);
    if (!selected) return { ok: false, error: 'Seçilen rün bulunamadı.' };
    this.pendingRune = selected;
    this.runeOffers = [];
    this.activeRunePackId = null;
    return { ok: true };
  }

  /** Walks away from an open rune pack (either the 1-of-3 pick screen or the target-selection
   *  screen) without applying anything — money already spent, no refund. */
  skipRunePack(): ShopActionResult {
    if (this.runeOffers.length === 0 && !this.pendingRune) return { ok: false, error: 'Açık bir rün kesesi yok.' };
    this.runeOffers = [];
    this.activeRunePackId = null;
    this.pendingRune = null;
    return { ok: true };
  }

  applyRune(stoneIds: string[]): ShopActionResult {
    if (!this.pendingRune) return { ok: false, error: 'Uygulanacak bir rün seçilmedi.' };
    if (stoneIds.length < 1 || stoneIds.length > this.pendingRune.targetCount) {
      return { ok: false, error: `1 ile ${this.pendingRune.targetCount} arası taş seçmelisin.` };
    }
    const targets = stoneIds.map((id) => this.customDeck.find((s) => s.id === id));
    if (targets.some((t) => !t)) return { ok: false, error: 'Seçilen taşlardan biri destede bulunamadı.' };

    const rune = this.pendingRune;
    targets.forEach((stone) => {
      if (rune.gild) stone!.isGolden = true;
      if (rune.modifier) stone!.modifier = rune.modifier;
    });
    this.pendingRune = null;
    return { ok: true };
  }

  sellCharm(charmId: string): ShopActionResult {
    if (this.phase !== 'SHOP') return { ok: false, error: 'Mağazada değilsin.' };
    const index = this.ownedCharmIds.indexOf(charmId);
    if (index === -1) return { ok: false, error: 'Bu tılsıma sahip değilsin.' };

    const def = CHARMS.find((c) => c.id === charmId)!;
    const refund = Math.floor(def.cost / 2);
    this.ownedCharmIds.splice(index, 1);
    delete this.charmDurability[charmId]; // Clean durability state
    this.resetRerollCost(); // Update reroll cost (removes discount if small_number_love is sold)
    this.money += refund;
    return { ok: true, refund };
  }

  /** Apply a starting chest bonus right after initializeRun(). */
  selectChest(chestId: ChestId): ShopActionResult {
    const def = STARTING_CHESTS.find((c) => c.id === chestId);
    if (!def) return { ok: false, error: 'Bilinmeyen sandık.' };
    this.selectedChestId = chestId;
    def.apply(this);
    return { ok: true };
  }

  /** Fuse two owned charms into a single hybrid charm. */
  attemptFusion(charmAId: string, charmBId: string): ShopActionResult {
    if (this.phase !== 'SHOP') return { ok: false, error: 'Füzyon sadece mağazada yapılabilir.' };

    // Find matching recipe (order-independent)
    const recipe = FUSION_RECIPES.find(
      (r) =>
        (r.sourceA === charmAId && r.sourceB === charmBId) ||
        (r.sourceA === charmBId && r.sourceB === charmAId)
    );
    if (!recipe) return { ok: false, error: 'Bu iki tılsım birleştirilemiyor.' };
    if (this.money < recipe.cost) return { ok: false, error: `Füzyon için $${recipe.cost} gerekiyor.` };

    const idxA = this.ownedCharmIds.indexOf(charmAId);
    const idxB = this.ownedCharmIds.indexOf(charmBId);
    if (idxA === -1 || idxB === -1) return { ok: false, error: 'Her iki tılsıma da sahip olmalısın.' };

    // Check result charm exists
    const resultDef = CHARMS.find((c) => c.id === recipe.resultId);
    if (!resultDef) return { ok: false, error: 'Hibrit tılsım tanımı bulunamadı.' };

    // Remove both sources
    this.ownedCharmIds = this.ownedCharmIds.filter((id) => id !== charmAId && id !== charmBId);
    // Add hybrid (takes 1 slot instead of 2)
    this.ownedCharmIds.push(recipe.resultId);
    this.fusedCharmIds.push(recipe.resultId);
    this.money -= recipe.cost;
    return { ok: true };
  }

  rerollShop(): ShopActionResult {
    if (this.phase !== 'SHOP') return { ok: false, error: 'Mağazada değilsin.' };
    if (this.money < this.currentRerollCost) return { ok: false, error: 'Yeterli paran yok.' };

    this.money -= this.currentRerollCost;
    this.currentRerollCost += 1; // Reroll Inflation!
    this.totalRerolls += 1;
    this.shopOffers = this.rollShopOffers();
    return { ok: true };
  }

  useConsumable(index: number, targetId: string): { ok: boolean; error?: string } {
    if (this.phase !== 'PLAYING') return { ok: false, error: 'Büyüleri sadece tur oynarken yapabilirsiniz.' };
    if (index < 0 || index >= this.consumables.length) return { ok: false, error: 'Geçersiz büyü indeksi.' };
    const item = this.consumables[index];

    if (item === 'consumable_magnet') {
      const stone = this.game.board.removeNode(targetId);
      if (!stone) return { ok: false, error: 'Sadece uçta kalan dondurulmuş taşları geri alabilirsiniz.' };
      this.game.hand.push(stone);
    } else if (item === 'consumable_gild') {
      const stone = this.game.hand.find((s) => s.id === targetId);
      if (!stone) return { ok: false, error: 'Taş elinizde bulunamadı.' };
      stone.isGolden = true;
    } else if (item === 'consumable_ivory') {
      const stone = this.game.hand.find((s) => s.id === targetId);
      if (!stone) return { ok: false, error: 'Taş elinizde bulunamadı.' };
      stone.modifier = 'IVORY';
      const deckStone = this.customDeck.find((s) => s.id === targetId);
      if (deckStone) deckStone.modifier = 'IVORY';
    } else if (item === 'consumable_obsidian') {
      const stone = this.game.hand.find((s) => s.id === targetId);
      if (!stone) return { ok: false, error: 'Taş elinizde bulunamadı.' };
      stone.modifier = 'OBSIDIAN';
      const deckStone = this.customDeck.find((s) => s.id === targetId);
      if (deckStone) deckStone.modifier = 'OBSIDIAN';
    } else if (item === 'consumable_amber') {
      const stone = this.game.hand.find((s) => s.id === targetId);
      if (!stone) return { ok: false, error: 'Taş elinizde bulunamadı.' };
      stone.modifier = 'AMBER';
      const deckStone = this.customDeck.find((s) => s.id === targetId);
      if (deckStone) deckStone.modifier = 'AMBER';
    } else if (item === 'consumable_trash') {
      const idx = this.game.hand.findIndex((s) => s.id === targetId);
      if (idx === -1) return { ok: false, error: 'Taş elinizde bulunamadı.' };
      this.game.hand.splice(idx, 1);
      this.customDeck = this.customDeck.filter((s) => s.id !== targetId);
    } else if (item === 'consumable_scissors') {
      const ok = this.game.board.removeEdgeById(targetId);
      if (!ok) return { ok: false, error: 'Silinecek bağlantı bulunamadı.' };
    } else if (item === 'consumable_magnifier') {
      const stone = this.game.hand.find((s) => s.id === targetId);
      if (!stone) return { ok: false, error: 'Taş elinizde bulunamadı.' };
      stone.leftVal *= 2;
      stone.rightVal *= 2;
      const deckStone = this.customDeck.find((s) => s.id === targetId);
      if (deckStone) {
        deckStone.leftVal *= 2;
        deckStone.rightVal *= 2;
      }
    } else if (item === 'consumable_transmute') {
      const stone = this.game.hand.find((s) => s.id === targetId);
      if (!stone) return { ok: false, error: 'Taş elinizde bulunamadı.' };
      stone.rightVal = stone.leftVal;
      const deckStone = this.customDeck.find((s) => s.id === targetId);
      if (deckStone) {
        deckStone.rightVal = deckStone.leftVal;
      }
    } else if (item === 'consumable_clover') {
      if (this.game.hand.length === 0) return { ok: false, error: 'Elinizde taş yok.' };
      this.game.hand.forEach((stone) => {
        stone.isGolden = true;
      });
    } else if (item === 'consumable_upgrade') {
      const stone = this.game.hand.find((s) => s.id === targetId);
      if (!stone) return { ok: false, error: 'Taş elinizde bulunamadı.' };
      
      const leftAdd = Math.min(2, 6 - stone.leftVal);
      stone.leftVal += leftAdd;
      stone.leftUpgrade = (stone.leftUpgrade || 0) + leftAdd;

      const rightAdd = Math.min(2, 6 - stone.rightVal);
      stone.rightVal += rightAdd;
      stone.rightUpgrade = (stone.rightUpgrade || 0) + rightAdd;

      const deckStone = this.customDeck.find((s) => s.id === targetId);
      if (deckStone) {
        deckStone.leftVal = stone.leftVal;
        deckStone.rightVal = stone.rightVal;
        deckStone.leftUpgrade = stone.leftUpgrade;
        deckStone.rightUpgrade = stone.rightUpgrade;
      }
    } else {
      return { ok: false, error: 'Bilinmeyen büyü türü.' };
    }

    this.consumables.splice(index, 1);
    (this.game as any).checkStuck();
    return { ok: true };
  }

  discardSelected(stoneIds: string[]): { ok: boolean; error?: string } {
    if (this.phase !== 'PLAYING') return { ok: false, error: 'Iskartayı sadece oynarken yapabilirsiniz.' };
    if (this.discardsLeft <= 0) return { ok: false, error: 'Iskarta hakkınız kalmadı.' };

    const toDiscardStones = this.game.hand.filter((s) => stoneIds.includes(s.id));

    if (toDiscardStones.length === 0) {
      return { ok: false, error: 'Lütfen ıskarta edilecek taşları seçin.' };
    }

    // Discard them
    this.game.stoneDeck.discard(toDiscardStones);

    this.totalCardsDiscarded += toDiscardStones.length;

    // Remove from hand
    this.game.hand = this.game.hand.filter((s) => !stoneIds.includes(s.id));

    // Draw replacements
    this.game.hand.push(...this.game.stoneDeck.draw(toDiscardStones.length));

    this.discardsLeft -= 1;
    return { ok: true };
  }

  /** Leaves the shop, advances to the next blind or next Ante. */
  leaveShop(): void {
    if (this.phase !== 'SHOP') return;

    this.activeTag = null; // Clear active tag effects
    if (!this.smallBlindTag) this.smallBlindTag = generateRandomTag();
    if (!this.bigBlindTag) this.bigBlindTag = generateRandomTag();

    if (this.activeBlind === 'SMALL') {
      this.phase = 'BLIND_SELECT';
      this.activeBlind = null;
    } else if (this.activeBlind === 'BIG') {
      this.phase = 'BLIND_SELECT';
      this.activeBlind = null;
    } else if (this.activeBlind === 'BOSS') {
      // Completed full Ante!
      if (this.round >= this.config.totalRounds && !this.isEndless) {
        this.status = 'WON';
        this.phase = 'CONGRATS_UNLOCK';
      } else {
        this.round += 1;
        this.currentTarget = ANTE_TARGETS[this.round] ?? Math.round(ANTE_TARGETS[8] * Math.pow(this.config.targetGrowthFactor, this.round - 8));
        this.phase = 'BLIND_SELECT';
        this.activeBlind = null;
        // Generate entirely new tags for the new Ante
        this.smallBlindTag = generateRandomTag();
        this.bigBlindTag = generateRandomTag();
      }
    }
  }

  startEndlessMode(): void {
    this.isEndless = true;
    this.round += 1;
    this.currentTarget = Math.round(ANTE_TARGETS[8] * Math.pow(this.config.targetGrowthFactor, this.round - 8));
    this.phase = 'BLIND_SELECT';
    this.activeBlind = null;
    this.smallBlindTag = generateRandomTag();
    this.bigBlindTag = generateRandomTag();
  }

  private completeRound(): void {
    const turnsUsed = this.game.turn - 1;
    const maxTurnsVal = this.selectedDeck === 'BLUE' ? 7 : 6;
    const turnsLeft = Math.max(0, maxTurnsVal - turnsUsed);
    const blindTarget = this.getBlindTarget(this.activeBlind!);

    const blindLabel = this.activeBlind === 'SMALL' ? 'Küçük Kör' : this.activeBlind === 'BIG' ? 'Büyük Kör' : 'Boss Kör';
    const blindReward = getBlindReward(this.activeBlind!, this.round);
    const interest = Math.min(5, Math.floor(this.money / 5));

    const roundEndCtx: RoundEndContext = {
      finalScore: this.game.score,
      target: blindTarget,
      turnsUsed,
      turnsLeft,
      // The board itself is emptied after every submitted hand ("Gönder ve Sil") — round-end
      // charms that scan "everything played this round" need the accumulated history instead.
      nodes: this.game.playedNodesThisRound,
    };

    // Itemize every owned charm's onRoundEnd contribution individually (skipping zero-payout
    // ones) instead of a single opaque lump sum, so the player can see exactly which charm paid
    // for what — this is the "detailed ledger" screen shown before the shop opens.
    const lines: RoundRewardLine[] = [
      { label: `${blindLabel} Ödülü`, amount: blindReward },
    ];
    if (turnsLeft > 0) lines.push({ label: `Kullanılmayan Tur Bonusu (x${turnsLeft})`, amount: turnsLeft });
    if (interest > 0) lines.push({ label: 'Faiz', amount: interest });
    if (this.hasMerchantsBonus) lines.push({ label: 'Tüccarın Kesesi Faizi', amount: 1 });

    let charmBonus = 0;
    this.ownedCharmIds.forEach((id, idx) => {
      const hooks = this.roundHooks[idx];
      if (!hooks?.onRoundEnd) return;
      const amount = hooks.onRoundEnd(roundEndCtx);
      if (amount !== 0) {
        charmBonus += amount;
        const def = CHARMS.find((c) => c.id === id);
        lines.push({ label: def?.name ?? id, amount });
      }
    });

    const totalPayout = blindReward + turnsLeft * 1 + interest + charmBonus + (this.hasMerchantsBonus ? 1 : 0);
    const moneyBefore = this.money;
    this.money += totalPayout;

    this.lastRoundReward = {
      lines,
      total: totalPayout,
      moneyBefore,
      moneyAfter: this.money,
    };

    // Informational only now (blinds no longer carry score forward) — kept for diagnostics/logging.
    this.cumulativeScore = this.game.score;

    this.history.push({
      round: this.round,
      blind: this.activeBlind!,
      target: blindTarget,
      scoreAchieved: this.game.score,
      moneyEarned: totalPayout,
      skipped: false,
    });

    // Process charm durability degradation
    this.perishedCharmMessage = null;
    const perishedCharms: string[] = [];
    this.ownedCharmIds.forEach((id) => {
      const def = CHARMS.find((c) => c.id === id);
      if (def?.perish) {
        const curDur = this.charmDurability[id] !== undefined ? this.charmDurability[id] : (def.maxDurability ?? 4);
        const nextDur = curDur - 1;
        if (nextDur <= 0) {
          perishedCharms.push(def.name);
          delete this.charmDurability[id];
        } else {
          this.charmDurability[id] = nextDur;
        }
      }
    });

    if (perishedCharms.length > 0) {
      this.ownedCharmIds = this.ownedCharmIds.filter((id) => {
        const def = CHARMS.find((c) => c.id === id);
        if (def?.perish) {
          return this.charmDurability[id] !== undefined;
        }
        return true;
      });
      this.perishedCharmMessage = `${perishedCharms.join(', ')} aşınarak tuzla buz oldu! ⏳`;
    }

    // Show the itemized reward ledger first — proceedToShop() (called once the player
    // acknowledges it) is what actually opens the shop.
    this.phase = 'ROUND_REWARD';
  }

  resetRerollCost(): void {
    const hasDiscount = this.ownedCharmIds.includes('small_number_love');
    this.currentRerollCost = Math.max(1, this.config.rerollCost - (hasDiscount ? 1 : 0));
  }

  /** Acknowledges the round-reward ledger and opens the shop. */
  proceedToShop(): void {
    if (this.phase !== 'ROUND_REWARD') return;
    this.resetRerollCost(); // Reset reroll cost inflation and apply discount if owned!
    this.phase = 'SHOP';
    this.shopOffers = this.rollShopOffers();
  }

  private startRound(): void {
    const blindTarget = this.getBlindTarget(this.activeBlind!);
    const maxTurnsVal = this.selectedDeck === 'BLUE' ? 7 : 6;

    // Determine active boss (index = round-1 mapped to BOSS_BLINDS)
    if (this.activeBlind === 'BOSS') {
      const bossIndex = Math.min(this.round - 1, BOSS_BLINDS.length - 1);
      this.activeBossId = BOSS_BLINDS[bossIndex].id;
    } else {
      this.activeBossId = null;
    }

    // Boss 5 (Zincir Koparıcı): reduce hand size to 3 stones per turn
    const bossReducesHand = this.activeBossId === 'boss_blind_chainbreaker';
    const effectiveStonesPerTurn = bossReducesHand ? 3 : this.config.stonesPerTurn;

    // Every blind (Small/Big/Boss) starts fresh from 0 — score never carries over between them.
    const gameConfig: GameConfig = {
      targetScore: blindTarget,
      maxTurns: maxTurnsVal,
      stonesPerTurn: effectiveStonesPerTurn,
      maxPips: this.config.maxPips,
    };
    this.game = new GameState(gameConfig);
    if (this.customDeck.length > 0) {
      this.game.stoneDeck.getStones().length = 0;
      this.game.stoneDeck.discard(JSON.parse(JSON.stringify(this.customDeck)));
    }
    this.game.stoneDeck.shuffle();
    this.roundHooks = this.wireCharms();
    this.discardsLeft = (this.selectedDeck === 'RED' ? 3 : 2) + this.extraDiscardsPerRound + this.extraDiscardsNextRound;
    this.extraDiscardsNextRound = 0; // Consume the tag bonus

    // Kozmik Karadelik: while owned, the board matches by ascending sequence instead of pips.
    const sequenceCharm = this.ownedCharmIds
      .map((id) => CHARMS.find((c) => c.id === id))
      .find((c) => c?.placementMode === 'SEQUENCE');
    this.game.board.setMatchMode(sequenceCharm ? 'SEQUENCE' : 'PIP');
    // "Tek Zincir": doubles no longer branch — they just pass the chain straight through.
    this.game.board.setBranchingEnabled(this.activeChallengeId !== 'ch_speed_chain');

    this.activatedCharmIdsThisTurn.clear();
    this.lastActivationTurn = this.game.turn;
    this.rescueUsedThisRound = false;
    this.lastRescueCharmName = null;

    // ─── Boss Blind submit override ────────────────────────────
    const originalSubmit = this.game.submitChain.bind(this.game);
    this.game.submitChain = () => {
      const boss = this.activeBossId;
      const unfrozenStones = this.game.board.getNodes().filter((n) => !n.frozen);

      // Boss 3 (Demirli Kapı): branched chains (a double used as a branch point) forbidden.
      if (boss === 'boss_blind_gate' && this.game.board.detectHandType() === 'BRANCHED') {
        return { ok: false, error: 'Demirli Kapı: Çatallı zincir bu aşamada yasaktır, sadece düz zincir!', steps: [] };
      }

      // Boss 7 (Gözetleyen Göz): at most 4 stones per submission.
      if (boss === 'boss_blind_watcher' && unfrozenStones.length > 4) {
        return { ok: false, error: 'Gözetleyen Göz: Bir elde en fazla 4 taş oynayabilirsin!', steps: [] };
      }

      // Find any golden / special stones placed this turn
      const unscoredGoldenCount = unfrozenStones.filter((n) => (n as any).isGolden).length;
      const unscoredStoneCount = unfrozenStones.length;

      // buildActiveCharms() applies Boss 1's (Kör Kadı) odd-stone charm-silence rule and injects
      // the mirror/pressure boss hooks — same logic previewScore() uses, kept in sync by construction.
      const stonesForCharms: DominoStone[] = unfrozenStones.map((n) => ({
        id: n.nodeId,
        leftVal: n.leftVal,
        rightVal: n.rightVal,
        isGolden: n.isGolden,
        modifier: n.modifier,
        tags: n.tags,
      }));
      const activeCharms = this.buildActiveCharms(stonesForCharms);

      const handType = this.game.board.detectHandType();
      const handLevel = this.handLevels[handType] ?? 1;
      const handStats = getHandStats(handType, handLevel);
      const handTypeName = handType === 'STRAIGHT' ? 'Düz Zincir' : handType === 'BRANCHED' ? 'Çatallı Zincir' : 'Sonsuz Döngü';

      const res = originalSubmit(activeCharms, handStats, handTypeName);

      if (res.ok && res.scoreGained !== undefined) {
        this.totalCardsPlayed += unscoredStoneCount;
        this.bestHandScore = Math.max(this.bestHandScore, res.scoreGained);
        this.handTypePlayCounts[handType] = (this.handTypePlayCounts[handType] ?? 0) + 1;

        // Award $3 per golden stone submitted
        this.money += unscoredGoldenCount * 3;

        // Apply permanent Obsidian breakage to customDeck
        if (res.brokenTileIds && res.brokenTileIds.length > 0) {
          this.customDeck = this.customDeck.filter((s) => !res.brokenTileIds!.includes(s.id));
        }

        // Boss 4 – Cam Kırıcı: 100% obsidian break (override normal 25%)
        if (this.activeBossId === 'boss_blind_glassbreaker') {
          const obsidianIds = unfrozenStones
            .filter((n) => (n as any).modifier === 'OBSIDIAN')
            .map((n) => n.nodeId);
          if (obsidianIds.length > 0) {
            obsidianIds.forEach((id) => this.game.stoneDeck.removeStoneById(id));
            this.customDeck = this.customDeck.filter((s) => !obsidianIds.includes(s.id));
          }
        }
      }
      return res;
    };

    this.game.drawForTurn();
  }

  /** Boss 2 (Aynalı Kule) and Boss 8 (Büyük Baskı) are implemented as a synthetic charm hook
   *  appended to the scoring pass, rather than a submit-time rejection — they alter the math,
   *  not whether the chain is legal. Returns null when no active boss needs one. */
  private buildBossHook(): CharmHooks | null {
    if (this.activeBossId === 'boss_blind_mirror') {
      return { onCalculate: (state) => ({ ...state, chips: Math.round(state.chips / 2) }) };
    }
    if (this.activeBossId === 'boss_blind_pressure') {
      return {
        onCalculate: (state, chain) => {
          const hasDouble = chain.some((s) => s.leftVal === s.rightVal);
          return hasDouble ? { ...state, mult: state.mult / 2 } : state;
        },
      };
    }
    return null;
  }


  /** Instantiates fresh hook closures for every owned charm -- createHooks() is called once per
   *  round so any internal counter state resets at round boundaries. */
  private wireCharms(): CharmHooks[] {
    const hookCtx = { ownedCharmIds: this.ownedCharmIds };
    return this.ownedCharmIds
      .map((id) => CHARMS.find((c) => c.id === id))
      .filter((c): c is CharmDef => Boolean(c))
      .map((c) => c.createHooks(hookCtx));
  }
  /** The activeCharms array submitChain()'s boss override builds, factored out so previewScore()
   *  can mirror it exactly without risking drift from what actually gets scored. */
  private buildActiveCharms(stones: DominoStone[]): { id: string; name: string; hooks: CharmHooks }[] {
    const hasOddStone = stones.some((s) => (s.leftVal + s.rightVal) % 2 !== 0);
    const judgeBlocksCharms = this.activeBossId === 'boss_blind_judge' && hasOddStone;
    const activeCharms: { id: string; name: string; hooks: CharmHooks }[] = judgeBlocksCharms
      ? []
      : this.ownedCharmIds.map((id, idx) => {
          const def = CHARMS.find((c) => c.id === id);
          return { id, name: def?.name ?? '', hooks: this.roundHooks[idx] };
        });
    const bossHook = this.buildBossHook();
    if (bossHook) {
      const bossDef = BOSS_BLINDS.find((b) => b.id === this.activeBossId);
      activeCharms.push({ id: 'boss_effect', name: bossDef?.name ?? 'Boss', hooks: bossHook });
    }
    return activeCharms;
  }

  /**
   * Computes a score for an arbitrary (possibly partial) stone selection using the exact same
   * engine, charm hooks, and boss effects that submitChain() will use for the real commit. Lets
   * the UI preview/animate a submission — including a running chips×mult total for a growing
   * subset of the board — without ever risking drift from what actually gets scored.
   */
  previewScore(stones: DominoStone[]): ScoreCalculationResult {
    const handType = this.game.board.detectHandType();
    const handLevel = this.handLevels[handType] ?? 1;
    const handStats = getHandStats(handType, handLevel);
    const handTypeName = handType === 'STRAIGHT' ? 'Düz Zincir' : handType === 'BRANCHED' ? 'Çatallı Zincir' : 'Sonsuz Döngü';

    return calculateScore(stones, this.game.board.getUnfrozenEdges(), this.buildActiveCharms(stones), handStats, handTypeName);
  }

  /**
   * Same engine/charms/boss-effects as previewScore(), but returns each active charm's own
   * isolated before/after {chips,mult} snapshot (applied strictly in owned order) — this is what
   * drives the "Tetiklenme Şöleni" scoring animation: the natural sum resolves first, then each
   * charm visibly triggers one at a time in the exact order it will actually apply.
   */
  previewScoreSteps(stones: DominoStone[]): {
    handStartChips: number;
    handStartMult: number;
    stoneSteps: { id: string; leftVal: number; rightVal: number; chipDelta: number; chipsAfter: number }[];
    baseChips: number;
    baseMult: number;
    steps: { id: string; name: string; before: PlayState; after: PlayState }[];
    final: ScoreCalculationResult;
  } {
    const handType = this.game.board.detectHandType();
    const handLevel = this.handLevels[handType] ?? 1;
    const handStats = getHandStats(handType, handLevel);
    const handTypeName = handType === 'STRAIGHT' ? 'Düz Zincir' : handType === 'BRANCHED' ? 'Çatallı Zincir' : 'Sonsuz Döngü';

    // Stone-by-stone chip buildup (Faz 11 LCD reveal) — mirrors calculateScore()'s own per-stone
    // loop exactly via the shared computeStoneChips() helper, starting from the hand-type's own
    // base chips so the very first stone's popup shows the true running total, not just its own value.
    let runningChips = handStats.chips;
    const stoneSteps = stones.map((stone) => {
      const chipDelta = computeStoneChips(stone);
      runningChips += chipDelta;
      return { id: stone.id, leftVal: stone.leftVal, rightVal: stone.rightVal, chipDelta, chipsAfter: runningChips };
    });

    const activeCharms = this.buildActiveCharms(stones);
    const baseResult = calculateScore(stones, this.game.board.getUnfrozenEdges(), [], handStats, handTypeName);
    let state: PlayState = { chips: baseResult.chips, mult: baseResult.mult };
    const steps = activeCharms.map((charm) => {
      const before = state;
      const after = charm.hooks.onCalculate ? charm.hooks.onCalculate(state, stones) : state;
      state = after;
      return { id: charm.id, name: charm.name, before, after };
    });
    return {
      handStartChips: handStats.chips,
      handStartMult: handStats.mult,
      stoneSteps,
      baseChips: baseResult.chips,
      baseMult: baseResult.mult,
      steps,
      final: this.previewScore(stones),
    };
  }

  private computePayout(finalScore: number, target: number, turnsLeft: number): number {
    const overflowBonus = Math.floor((finalScore - target) / 5);
    return 4 + overflowBonus + turnsLeft * 2;
  }

  private nextTarget(prevTarget: number): number {
    return Math.round(prevTarget * this.config.targetGrowthFactor);
  }

  /** Balatro's own shop is a single row of a handful of cards: 2 jokers, 1-2 packs, and a
   *  voucher that doesn't show up every visit — never the 6-7-item, four-panel spread this used
   *  to roll. Trimmed to match: 2 charms, 2 pack slots drawn from the combined booster+rune
   *  pool (so a visit might show 2 boosters, 2 rune packs, or one of each), 1 "extra" slot
   *  drawn from upgrades/theorem books, and a voucher at a real chance instead of guaranteed. */
  private rollShopOffers(): ShopOffer[] {
    const offers: ShopOffer[] = [];

    // 2 Charms (3 if "Kehanet Küresi" promised a bonus one)
    const charmSlots = this.nextShopBonusCharm ? 3 : 2;
    this.nextShopBonusCharm = false;
    const availableCharms = CHARMS.filter((c) => !this.ownedCharmIds.includes(c.id));
    const shuffledCharms = [...availableCharms].sort(() => Math.random() - 0.5);
    shuffledCharms.slice(0, charmSlots).forEach((c) => {
      offers.push({ type: 'CHARM', item: { ...c } as any });
    });

    // 2 pack slots, each independently a booster or a rune pack.
    const shuffledBoosters = [...BOOSTER_PACKS].sort(() => Math.random() - 0.5);
    const shuffledRunePacks = [...RUNE_PACKS].sort(() => Math.random() - 0.5);
    for (let slot = 0; slot < 2; slot++) {
      if (Math.random() < 0.5 && shuffledBoosters[slot % shuffledBoosters.length]) {
        offers.push({ type: 'BOOSTER', item: { ...shuffledBoosters[slot % shuffledBoosters.length] } as any });
      } else if (shuffledRunePacks[slot % shuffledRunePacks.length]) {
        offers.push({ type: 'RUNE_PACK', item: { ...shuffledRunePacks[slot % shuffledRunePacks.length] } as any });
      }
    }

    // 1 "extra" slot: an upgrade/consumable or a theorem book, not both every visit.
    if (Math.random() < 0.6) {
      const shuffledUpgrades = [...SHOP_UPGRADES].sort(() => Math.random() - 0.5);
      if (shuffledUpgrades[0]) offers.push({ type: 'UPGRADE', item: { ...shuffledUpgrades[0] } as any });
    } else {
      const shuffledBooks = [...THEOREM_BOOKS].sort(() => Math.random() - 0.5);
      if (shuffledBooks[0]) offers.push({ type: 'THEOREM', item: { ...shuffledBooks[0] } as any });
    }

    // Voucher — a real chance to appear, not guaranteed every single shop visit.
    const availableVouchers = VOUCHERS.filter((v) => !this.ownedVoucherIds.includes(v.id));
    if (availableVouchers.length > 0 && Math.random() < 0.5) {
      const voucher = availableVouchers[Math.floor(Math.random() * availableVouchers.length)];
      offers.push({ type: 'VOUCHER', item: { ...voucher } as any });
    }

    // Apply Nomad Chest 25% discount first
    if (this.hasNomadDiscount) {
      offers.forEach((o) => {
        o.item.cost = Math.floor(o.item.cost * 0.75);
      });
    }

    // Apply Skip Tag discounts/free items
    if (this.activeTag) {
      const tagEffect = this.activeTag.effect;
      offers.forEach((o) => {
        if (tagEffect === 'FREE_SHOP_ITEM') {
          o.item.cost = 0;
        } else if (tagEffect === 'SHOP_DISCOUNT') {
          o.item.cost = Math.floor(o.item.cost / 2);
        } else if (tagEffect === 'FREE_THEOREM' && o.type === 'THEOREM') {
          o.item.cost = 0;
        }
      });
    }

    return offers;
  }
}
