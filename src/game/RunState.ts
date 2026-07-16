import { GameState, type GameConfig } from './GameState.js';
import { CHARMS } from '../models/CharmRegistry.js';
import type { CharmDef, CharmHooks, RoundEndContext } from '../models/Charm.js';
import type { DominoStone, OperatorType, TileModifier } from '../models/types.js';

export type RunStatus = 'IN_PROGRESS' | 'WON' | 'LOST';
export type RunPhase =
  | 'START_SCREEN'
  | 'BLIND_SELECT'
  | 'PLAYING'
  | 'SHOP'
  | 'RUN_OVER_SCREEN'
  | 'CONGRATS_UNLOCK';

export interface RunConfig {
  totalRounds: number;
  startingTarget: number;
  targetGrowthFactor: number;
  baseTurns: number;
  stonesPerTurn: number;
  operatorsPerTurn: number;
  maxPips?: number;
  startingMoney: number;
  maxCharmSlots: number;
  shopSize: number;
  rerollCost: number;
}

const DEFAULT_RUN_CONFIG: RunConfig = {
  totalRounds: 8,
  startingTarget: 50,
  targetGrowthFactor: 1.35,
  baseTurns: 6,
  stonesPerTurn: 3,
  operatorsPerTurn: 2,
  startingMoney: 4,
  maxCharmSlots: 5,
  shopSize: 3,
  rerollCost: 2,
};

export interface RoundRecord {
  round: number;
  blind: 'SMALL' | 'BIG' | 'BOSS';
  target: number;
  scoreAchieved: number;
  moneyEarned: number;
  skipped?: boolean;
}

export interface ShopActionResult {
  ok: boolean;
  error?: string;
  refund?: number;
}

export type ShopUpgradeId =
  | 'cosmic_add'
  | 'cosmic_sub'
  | 'cosmic_mul'
  | 'cosmic_div'
  | 'consumable_magnet'
  | 'consumable_breaker'
  | 'consumable_gild'
  | 'consumable_ivory'
  | 'consumable_obsidian'
  | 'consumable_amber';

export interface ShopUpgradeDef {
  id: ShopUpgradeId;
  name: string;
  description: string;
  cost: number;
  type: 'COSMIC' | 'CONSUMABLE';
  operator?: OperatorType;
}

export const SHOP_UPGRADES: readonly ShopUpgradeDef[] = [
  { id: 'cosmic_add', name: 'Kozmik Artı (+)', description: 'Toplama (+) operatörünü seviye atlatır. Her seviye toplama işlemine +2 puan ekler.', cost: 4, type: 'COSMIC', operator: 'ADD' },
  { id: 'cosmic_sub', name: 'Kozmik Eksi (-)', description: 'Çıkarma (-) operatörünü seviye atlatır. Çıkarma işlemine +3 puan ekler.', cost: 4, type: 'COSMIC', operator: 'SUBTRACT' },
  { id: 'cosmic_mul', name: 'Kozmik Çarpı (x)', description: 'Çarpma (x) operatörünü seviye atlatır. Çarpma işlemine +5 puan ekler.', cost: 5, type: 'COSMIC', operator: 'MULTIPLY' },
  { id: 'cosmic_div', name: 'Kozmik Bölü (÷)', description: 'Bölme (÷) operatörünü seviye atlatır. Bölme işlemine +4 puan ekler.', cost: 5, type: 'COSMIC', operator: 'DIVIDE' },
  { id: 'consumable_magnet', name: 'Mıknatıs', description: 'Tahtadaki dondurulmuş bir yaprak (uçta kalan) domino taşını söküp elinize geri alır.', cost: 3, type: 'CONSUMABLE' },
  { id: 'consumable_breaker', name: 'Kırıcı', description: 'Tahtadaki dondurulmuş bir operatör taşını kırıp yok eder ve o yolu açar.', cost: 3, type: 'CONSUMABLE' },
  { id: 'consumable_gild', name: 'Yaldız', description: 'Elinizdeki bir taşı Altın Taş yapar. Altın taşlar oynandığında +$3 kazandırır.', cost: 4, type: 'CONSUMABLE' },
  { id: 'consumable_ivory', name: 'Fildişi Rünü', description: 'Elinizdeki bir taşı kalıcı olarak Fildişi yapar (+15 Taban Puan).', cost: 4, type: 'CONSUMABLE' },
  { id: 'consumable_obsidian', name: 'Obsidyen Rünü', description: 'Elinizdeki bir taşı kalıcı olarak Obsidyen yapar (Çarpan x2, %25 kırılma şansı).', cost: 5, type: 'CONSUMABLE' },
  { id: 'consumable_amber', name: 'Kehribar Rünü', description: 'Elinizdeki bir taşı kalıcı olarak Kehribar yapar (Bağlandığı komşu taş sayılarını eşitler).', cost: 4, type: 'CONSUMABLE' },
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
    name: 'Geniş Cephane',
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
}

export const BOOSTER_PACKS: readonly BoosterPackDef[] = [
  { id: 'booster_standard', name: 'Standart Taş Paketi', description: '3 adet rastgele normal domino taşı üretir, 1 tanesini destenize seçersiniz.', cost: 4, modifier: 'NORMAL' },
  { id: 'booster_obsidian', name: 'Obsidyen Paketi', description: '3 adet Obsidyen taş üretir, 1 tanesini destenize seçersiniz.', cost: 8, modifier: 'OBSIDIAN' },
  { id: 'booster_ivory', name: 'Fildişi Paketi', description: '3 adet Fildişi taş üretir, 1 tanesini destenize seçersiniz.', cost: 7, modifier: 'IVORY' },
  { id: 'booster_amber', name: 'Kehribar Paketi', description: '3 adet Kehribar taş üretir, 1 tanesini destenize seçersiniz.', cost: 6, modifier: 'AMBER' },
];

export type ShopOffer =
  | { type: 'CHARM'; item: CharmDef }
  | { type: 'UPGRADE'; item: ShopUpgradeDef }
  | { type: 'VOUCHER'; item: VoucherDef }
  | { type: 'BOOSTER'; item: BoosterPackDef };

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
    flavorText: '"Adalet kördür — ve bölme göze görünmez."',
    ruleLabel: 'Bölme (÷) operatörü yasak!',
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
    flavorText: '"Toplama kolaydır — kolayı yasakla."',
    ruleLabel: 'Toplama (+) operatörü yasak!',
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
    flavorText: '"Her tekrar bir zayıflıktır."',
    ruleLabel: 'Aynı operatör üst üste kullanılamaz!',
    tier: 'LETHAL',
    icon: '👁️',
  },
  {
    id: 'boss_blind_pressure',
    name: 'Büyük Baskı',
    flavorText: '"Kötüleri iki katla, iyileri bir kat."',
    ruleLabel: 'Çıkarma negatifleri ×2 ceza!',
    tier: 'LETHAL',
    icon: '🌑',
  },
];

// ─────────────────────────────────────────────────────────────
// STARTING CHESTS
// ─────────────────────────────────────────────────────────────

export type ChestId =
  | 'chest_collectors_safe'
  | 'chest_alchemists_jar'
  | 'chest_warriors_kit'
  | 'chest_merchants_purse';

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
    id: 'chest_collectors_safe',
    name: "Koleksiyoncunun Kasası",
    description: '+1 Tılsım slotu ve başlangıçta 1 ücretsiz UNCOMMON tılsım.',
    icon: '🏛️',
    apply: (run) => {
      (run.config as any).maxCharmSlots += 1;
      const uncommons = CHARMS.filter((c) => c.rarity === 'UNCOMMON' && !run.ownedCharmIds.includes(c.id));
      if (uncommons.length > 0) {
        const picked = uncommons[Math.floor(Math.random() * uncommons.length)];
        run.ownedCharmIds.push(picked.id);
      }
    },
  },
  {
    id: 'chest_alchemists_jar',
    name: "Simyacının Kavanozu",
    description: 'Destenizden rastgele 2 taş kalıcı olarak Fildişi yapılır.',
    icon: '⚗️',
    apply: (run) => {
      if (run.customDeck.length < 2) return;
      const shuffled = [...run.customDeck].sort(() => Math.random() - 0.5);
      shuffled.slice(0, 2).forEach((stone) => {
        const s = run.customDeck.find((x) => x.id === stone.id);
        if (s) s.modifier = 'IVORY';
      });
    },
  },
  {
    id: 'chest_warriors_kit',
    name: "Savaşçının Sandığı",
    description: '+3 ıskarta hakkı ve +$2 başlangıç parası.',
    icon: '⚔️',
    apply: (run) => {
      run.discardsLeft += 3;
      run.money += 2;
    },
  },
  {
    id: 'chest_merchants_purse',
    name: "Tüccarın Kesesi",
    description: '+$6 başlangıç parası ve her tur sonunda +$1 faiz bonusu.',
    icon: '💰',
    apply: (run) => {
      run.money += 6;
      run.hasMerchantsBonus = true;
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
  game!: GameState;
  shopOffers: ShopOffer[] = [];
  history: RoundRecord[] = [];
  customDeck: DominoStone[] = [];
  draftOffers: DominoStone[] = [];
  activeBoosterId: string | null = null;

  // Consumables & Operator Levels
  operatorLevels: Record<OperatorType, number> = { ADD: 1, SUBTRACT: 1, MULTIPLY: 1, DIVIDE: 1 };
  consumables: string[] = [];
  discardsLeft = 2;

  // Permanent, run-wide upgrades bought once from the shop (never expire, never re-offered).
  ownedVoucherIds: string[] = [];
  maxConsumableSlots = 2;
  /** Set by "Kehanet Küresi" — consumed by the next rollShopOffers() call. */
  nextShopBonusCharm = false;

  // Run Setup selections
  selectedDeck: 'RED' | 'BLUE' | 'YELLOW' = 'RED';
  selectedStake: 'WHITE' | 'RED' = 'WHITE';
  activeBlind: 'SMALL' | 'BIG' | 'BOSS' | null = null;

  // Phase 3: Boss / Chest / Fusion
  activeBossId: string | null = null;
  selectedChestId: ChestId | null = null;
  hasMerchantsBonus = false;
  /** Track which fused charms we own (sub-IDs of hybrid charms). */
  fusedCharmIds: string[] = [];
  /** Last operator type played this turn (for Gözetleyen Göz boss rule). */
  lastOperatorType: OperatorType | null = null;

  // Statistics tracker
  bestHandScore = 0;
  totalCardsPlayed = 0;
  totalCardsDiscarded = 0;
  totalRerolls = 0;
  totalPurchases = 0;
  defeatedBy = '';

  private roundHooks: CharmHooks[] = [];

  constructor(config: Partial<RunConfig> = {}) {
    this.config = { ...DEFAULT_RUN_CONFIG, ...config };
    this.money = this.config.startingMoney;
    this.currentTarget = this.config.startingTarget;
  }

  initializeRun(deck: 'RED' | 'BLUE' | 'YELLOW', stake: 'WHITE' | 'RED'): void {
    this.selectedDeck = deck;
    this.selectedStake = stake;
    this.money = deck === 'YELLOW' ? 8 : 4;
    this.currentTarget = this.config.startingTarget;
    this.round = 1;
    this.status = 'IN_PROGRESS';
    this.phase = 'BLIND_SELECT';
    this.activeBlind = null;
    this.operatorLevels = { ADD: 1, SUBTRACT: 1, MULTIPLY: 1, DIVIDE: 1 };
    this.consumables = [];
    this.ownedCharmIds = [];
    this.ownedVoucherIds = [];
    this.maxConsumableSlots = 2;
    this.nextShopBonusCharm = false;
    this.activeBossId = null;
    this.selectedChestId = null;
    this.hasMerchantsBonus = false;
    this.fusedCharmIds = [];
    this.lastOperatorType = null;

    // Generate persistent customDeck
    const initialStones: DominoStone[] = [];
    const maxPips = this.config.maxPips ?? 6;
    for (let left = 0; left <= maxPips; left++) {
      for (let right = left; right <= maxPips; right++) {
        const randId = Math.random().toString(36).substring(2, 6);
        initialStones.push({
          id: `domino_${left}_${right}_${randId}`,
          leftVal: left,
          rightVal: right,
          modifier: 'NORMAL',
        });
      }
    }
    this.customDeck = initialStones;
    this.draftOffers = [];
    this.activeBoosterId = null;
    this.history = [];
    this.bestHandScore = 0;
    this.totalCardsPlayed = 0;
    this.totalCardsDiscarded = 0;
    this.totalRerolls = 0;
    this.totalPurchases = 0;
    this.defeatedBy = '';
  }

  startBlind(blindType: 'SMALL' | 'BIG' | 'BOSS'): void {
    this.activeBlind = blindType;
    this.phase = 'PLAYING';
    this.startRound();
  }

  getBlindTarget(blindType: 'SMALL' | 'BIG' | 'BOSS'): number {
    const multiplier = this.selectedStake === 'RED' ? 1.25 : 1.0;
    const factor = blindType === 'SMALL' ? 0.6 : blindType === 'BIG' ? 1.0 : 1.5;
    return Math.round(this.currentTarget * factor * multiplier);
  }

  skipBlind(blindType: 'SMALL' | 'BIG'): void {
    if (this.phase !== 'BLIND_SELECT') return;

    if (blindType === 'SMALL') {
      this.money += 4; // Agriculturist tag rewards $4
    } else {
      // Celestial tag upgrades a random operator level
      const ops: OperatorType[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];
      const chosen = ops[Math.floor(Math.random() * ops.length)];
      this.operatorLevels[chosen] += 1;
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
    this.phase = 'SHOP';
    this.shopOffers = this.rollShopOffers();
  }

  /** Applies fn to the current round's GameState, then checks for round completion / run loss. */
  act<T>(fn: (game: GameState) => T): T {
    const result = fn(this.game);

    if (this.phase === 'PLAYING') {
      if (this.game.status === 'WON') {
        const blindTarget = this.getBlindTarget(this.activeBlind!);
        // Boss 6 – Hassas Terazi: cannot exceed target by more than 15
        if (this.activeBossId === 'boss_blind_precision' && this.game.score > blindTarget + 15) {
          this.game.status = 'LOST';
          this.game.lossReason = null;
          this.status = 'LOST';
          this.defeatedBy = '🎯 Hassas Terazi — Hedefi fazla aştın!';
        } else {
          this.completeRound();
        }
      } else if (this.game.status === 'LOST' && this.game.lossReason !== 'STUCK') {
        // STUCK is intentionally self-healing inside GameState (undo/skip stay available and
        // clear it) — only a real loss (out of turns, or the boss-6 precision cap above) ends the run.
        this.status = 'LOST';
        this.defeatedBy =
          this.activeBlind === 'SMALL' ? 'Small Blind' : this.activeBlind === 'BIG' ? 'Big Blind' : 'Boss Blind';
        this.phase = 'RUN_OVER_SCREEN';
      }
    }

    return result;
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
    } else if (offer.type === 'VOUCHER') {
      this.money -= offer.item.cost;
      this.ownedVoucherIds.push(offer.item.id);
      offer.item.apply(this);
    } else if (offer.type === 'BOOSTER') {
      this.money -= offer.item.cost;
      this.activeBoosterId = offer.item.id;
      this.generateDraftOffers(offer.item.modifier);
    } else {
      const upgrade = offer.item;
      if (upgrade.type === 'COSMIC') {
        this.money -= upgrade.cost;
        const op = upgrade.operator!;
        this.operatorLevels[op] = (this.operatorLevels[op] || 1) + 1;
      } else {
        if (this.consumables.length >= this.maxConsumableSlots) {
          return { ok: false, error: `Sarf edilebilir eşya slotların dolu (Maks ${this.maxConsumableSlots}).` };
        }
        this.money -= upgrade.cost;
        this.consumables.push(upgrade.id);
      }
    }

    this.totalPurchases += 1;
    this.shopOffers = this.shopOffers.filter((o) => o.item.id !== itemId);
    return { ok: true };
  }

  private generateDraftOffers(modifier: TileModifier): void {
    this.draftOffers = [];
    const maxPips = this.config.maxPips ?? 6;
    for (let i = 0; i < 3; i++) {
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

  sellCharm(charmId: string): ShopActionResult {
    if (this.phase !== 'SHOP') return { ok: false, error: 'Mağazada değilsin.' };
    const index = this.ownedCharmIds.indexOf(charmId);
    if (index === -1) return { ok: false, error: 'Bu tılsıma sahip değilsin.' };

    const def = CHARMS.find((c) => c.id === charmId)!;
    const refund = Math.floor(def.cost / 2);
    this.ownedCharmIds.splice(index, 1);
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
    if (this.money < this.config.rerollCost) return { ok: false, error: 'Yeterli paran yok.' };

    this.money -= this.config.rerollCost;
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
    } else if (item === 'consumable_breaker') {
      const op = this.game.board.removeOperator(targetId);
      if (!op) return { ok: false, error: 'Sadece dondurulmuş ve ucu boşta olan operatörleri kırabilirsiniz.' };
      this.game.operatorHand.push(op);
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
    } else {
      return { ok: false, error: 'Bilinmeyen büyü türü.' };
    }

    this.consumables.splice(index, 1);
    (this.game as any).checkStuck();
    return { ok: true };
  }

  discardSelected(stoneIds: string[], operatorIds: string[]): { ok: boolean; error?: string } {
    if (this.phase !== 'PLAYING') return { ok: false, error: 'Iskartayı sadece oynarken yapabilirsiniz.' };
    if (this.discardsLeft <= 0) return { ok: false, error: 'Iskarta hakkınız kalmadı.' };

    const toDiscardStones = this.game.hand.filter((s) => stoneIds.includes(s.id));
    const toDiscardOps = this.game.operatorHand.filter((o) => operatorIds.includes(o.id));

    if (toDiscardStones.length === 0 && toDiscardOps.length === 0) {
      return { ok: false, error: 'Lütfen ıskarta edilecek kartları seçin.' };
    }

    // Discard them
    this.game.stoneDeck.discard(toDiscardStones);
    this.game.operatorDeck.discard(toDiscardOps);

    this.totalCardsDiscarded += toDiscardStones.length + toDiscardOps.length;

    // Remove from hand
    this.game.hand = this.game.hand.filter((s) => !stoneIds.includes(s.id));
    this.game.operatorHand = this.game.operatorHand.filter((o) => !operatorIds.includes(o.id));

    // Draw replacements
    this.game.hand.push(...this.game.stoneDeck.draw(toDiscardStones.length));
    this.game.operatorHand.push(...this.game.operatorDeck.draw(toDiscardOps.length));

    this.discardsLeft -= 1;
    (this.game as any).checkStuck();
    return { ok: true };
  }

  /** Leaves the shop, advances to the next blind or next Ante. */
  leaveShop(): void {
    if (this.phase !== 'SHOP') return;

    if (this.activeBlind === 'SMALL') {
      this.phase = 'BLIND_SELECT';
      this.activeBlind = null;
    } else if (this.activeBlind === 'BIG') {
      this.phase = 'BLIND_SELECT';
      this.activeBlind = null;
    } else if (this.activeBlind === 'BOSS') {
      // Completed full Ante!
      if (this.round >= this.config.totalRounds) {
        this.status = 'WON';
        this.phase = 'CONGRATS_UNLOCK';
      } else {
        this.round += 1;
        this.currentTarget = this.nextTarget(this.currentTarget);
        this.phase = 'BLIND_SELECT';
        this.activeBlind = null;
      }
    }
  }

  private completeRound(): void {
    const turnsUsed = this.game.turn - 1;
    const maxTurnsVal = this.selectedDeck === 'BLUE' ? 7 : 6;
    const turnsLeft = Math.max(0, maxTurnsVal - turnsUsed);
    const blindTarget = this.getBlindTarget(this.activeBlind!);

    const blindReward = this.activeBlind === 'SMALL' ? 3 : this.activeBlind === 'BIG' ? 4 : 5;
    const interest = Math.min(5, Math.floor(this.money / 5));

    const roundEndCtx: RoundEndContext = {
      finalScore: this.game.score,
      target: blindTarget,
      turnsUsed,
      turnsLeft,
      nodes: this.game.board.getNodes(),
    };
    const charmBonus = this.roundHooks.reduce(
      (sum, h) => sum + (h.onRoundEnd ? h.onRoundEnd(roundEndCtx) : 0),
      0
    );

    const totalPayout = blindReward + turnsLeft * 1 + interest + charmBonus + (this.hasMerchantsBonus ? 1 : 0);

    this.money += totalPayout;

    this.history.push({
      round: this.round,
      blind: this.activeBlind!,
      target: blindTarget,
      scoreAchieved: this.game.score,
      moneyEarned: totalPayout,
      skipped: false,
    });

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

    const gameConfig: GameConfig = {
      targetScore: blindTarget,
      maxTurns: maxTurnsVal,
      stonesPerTurn: effectiveStonesPerTurn,
      operatorsPerTurn: this.config.operatorsPerTurn,
      maxPips: this.config.maxPips,
    };
    this.game = new GameState(gameConfig);
    if (this.customDeck.length > 0) {
      this.game.stoneDeck.getStones().length = 0;
      this.game.stoneDeck.discard(JSON.parse(JSON.stringify(this.customDeck)));
    }
    this.game.stoneDeck.shuffle();
    this.roundHooks = this.wireCharms();
    this.discardsLeft = this.selectedDeck === 'RED' ? 3 : 2;
    this.lastOperatorType = null;

    // ─── Boss Blind submit override ────────────────────────────
    const originalSubmit = this.game.submitChain.bind(this.game);
    this.game.submitChain = () => {
      const boss = this.activeBossId;
      const unfrozenEdges = this.game.board.getUnfrozenEdges();

      // Boss 1 – Kör Kadı: block DIVIDE
      if (boss === 'boss_blind_judge') {
        if (unfrozenEdges.some((e) => e.operator.type === 'DIVIDE')) {
          return { ok: false, error: '⚖️ Kör Kadı: Bölme (÷) operatörü bu aşamada yasaktır!', steps: [] };
        }
      }

      // Boss 3 – Demirli Kapı: block ADD
      if (boss === 'boss_blind_gate') {
        if (unfrozenEdges.some((e) => e.operator.type === 'ADD')) {
          return { ok: false, error: '🔒 Demirli Kapı: Toplama (+) operatörü bu aşamada yasaktır!', steps: [] };
        }
      }

      // Boss 7 – Gözetleyen Göz: block same operator used consecutively
      if (boss === 'boss_blind_watcher' && this.lastOperatorType !== null) {
        const firstOpType = unfrozenEdges[0]?.operator?.type ?? null;
        if (firstOpType && firstOpType === this.lastOperatorType) {
          return {
            ok: false,
            error: `👁️ Gözetleyen Göz: ${firstOpType} operatörünü üst üste kullanamazsın!`,
            steps: [],
          };
        }
      }

      // Find any golden / special stones placed this turn
      const unscoredNodes = this.game.board.getNodes().filter((n) => !n.frozen);
      const unscoredGoldenCount = unscoredNodes.filter((n) => (n as any).isGolden).length;
      const unscoredEdgesCount = unfrozenEdges.length;

      // Construct activeCharms array for the score engine
      const activeCharms = this.ownedCharmIds.map((id, idx) => {
        const def = CHARMS.find((c) => c.id === id);
        return { id, name: def?.name ?? '', hooks: this.roundHooks[idx] };
      });

      const res = originalSubmit(activeCharms, this.operatorLevels);

      if (res.ok && res.scoreGained !== undefined) {
        this.totalCardsPlayed += unscoredEdgesCount;
        this.bestHandScore = Math.max(this.bestHandScore, res.scoreGained);

        // Award $3 per golden stone submitted
        this.money += unscoredGoldenCount * 3;

        // Apply permanent Obsidian breakage to customDeck
        if (res.brokenTileIds && res.brokenTileIds.length > 0) {
          this.customDeck = this.customDeck.filter((s) => !res.brokenTileIds!.includes(s.id));
        }

        // Boss 4 – Cam Kırıcı: 100% obsidian break (override normal 25%)
        if (this.activeBossId === 'boss_blind_glassbreaker') {
          const obsidianIds = unscoredNodes
            .filter((n) => (n as any).modifier === 'OBSIDIAN')
            .map((n) => n.nodeId);
          if (obsidianIds.length > 0) {
            obsidianIds.forEach((id) => this.game.stoneDeck.removeStoneById(id));
            this.customDeck = this.customDeck.filter((s) => !obsidianIds.includes(s.id));
          }
        }

        // Track last operator used (for Gözetleyen Göz)
        if (unfrozenEdges.length > 0) {
          this.lastOperatorType = unfrozenEdges[unfrozenEdges.length - 1].operator.type;
        }
      }
      return res;
    };

    this.game.drawForTurn();
  }


  /** Instantiates fresh hook closures for every owned charm and composes them onto the evaluator. */
  private wireCharms(): CharmHooks[] {
    const hookCtx = { ownedCharmIds: this.ownedCharmIds };
    const hooks = this.ownedCharmIds
      .map((id) => CHARMS.find((c) => c.id === id))
      .filter((c): c is CharmDef => Boolean(c))
      .map((c) => c.createHooks(hookCtx));

    this.game.evaluator.onOperatorResolve = (operator, parentBase, childExposed, edgeValue) => {
      let val = edgeValue;
      // Apply level bonuses
      const lvl = this.operatorLevels[operator];
      if (lvl > 1) {
        if (operator === 'ADD') val += (lvl - 1) * 2;
        else if (operator === 'SUBTRACT') val += (lvl - 1) * 3;
        else if (operator === 'MULTIPLY') val += (lvl - 1) * 5;
        else if (operator === 'DIVIDE') val += (lvl - 1) * 4;
      }

      // Boss 8 – Büyük Baskı: Negatives from subtraction are doubled
      if (this.activeBossId === 'boss_blind_pressure' && operator === 'SUBTRACT' && val < 0) {
        val *= 2;
      }

      // Boss 2 – Aynalı Kule: chips halved (simulate by halving every edge value)
      if (this.activeBossId === 'boss_blind_mirror') {
        val = Math.round(val / 2);
      }

      return hooks.reduce(
        (value, h) => (h.onOperatorResolve ? h.onOperatorResolve(operator, parentBase, childExposed, value) : value),
        val
      );
    };

    this.game.evaluator.onEvaluationEnd = (totalGain) =>
      hooks.reduce((value, h) => (h.onEvaluationEnd ? h.onEvaluationEnd(value) : value), totalGain);

    return hooks;
  }

  private computePayout(finalScore: number, target: number, turnsLeft: number): number {
    const overflowBonus = Math.floor((finalScore - target) / 5);
    return 4 + overflowBonus + turnsLeft * 2;
  }

  private nextTarget(prevTarget: number): number {
    return Math.round(prevTarget * this.config.targetGrowthFactor);
  }

  private rollShopOffers(): ShopOffer[] {
    const offers: ShopOffer[] = [];

    // 2 Charms (3 if "Kehanet Küresi" promised a bonus one)
    const charmSlots = this.nextShopBonusCharm ? 3 : 2;
    this.nextShopBonusCharm = false;
    const availableCharms = CHARMS.filter((c) => !this.ownedCharmIds.includes(c.id));
    const shuffledCharms = [...availableCharms].sort(() => Math.random() - 0.5);
    shuffledCharms.slice(0, charmSlots).forEach((c) => {
      offers.push({ type: 'CHARM', item: c });
    });

    // 1 Upgrade/Consumable
    const shuffledUpgrades = [...SHOP_UPGRADES].sort(() => Math.random() - 0.5);
    if (shuffledUpgrades[0]) {
      offers.push({ type: 'UPGRADE', item: shuffledUpgrades[0] });
    }

    // 1 permanent Voucher, if any remain unbought
    const availableVouchers = VOUCHERS.filter((v) => !this.ownedVoucherIds.includes(v.id));
    if (availableVouchers.length > 0) {
      const voucher = availableVouchers[Math.floor(Math.random() * availableVouchers.length)];
      offers.push({ type: 'VOUCHER', item: voucher });
    }

    // 1 Booster Pack
    const shuffledBoosters = [...BOOSTER_PACKS].sort(() => Math.random() - 0.5);
    if (shuffledBoosters[0]) {
      offers.push({ type: 'BOOSTER', item: shuffledBoosters[0] });
    }

    return offers;
  }
}
