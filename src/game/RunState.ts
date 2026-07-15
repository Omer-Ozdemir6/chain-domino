import { GameState, type GameConfig } from './GameState.js';
import { CHARMS } from '../models/CharmRegistry.js';
import type { CharmDef, CharmHooks, RoundEndContext } from '../models/Charm.js';
import type { OperatorType } from '../models/types.js';

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
  | 'consumable_gild';

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

export type ShopOffer =
  | { type: 'CHARM'; item: CharmDef }
  | { type: 'UPGRADE'; item: ShopUpgradeDef }
  | { type: 'VOUCHER'; item: VoucherDef };

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
        // Enforce Precision Limit on Boss 6
        if (this.round === 6 && this.activeBlind === 'BOSS' && this.game.score > blindTarget + 15) {
          this.game.status = 'LOST';
          this.game.lossReason = null;
          this.status = 'LOST';
          this.defeatedBy = 'Hassas Denge';
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

    const blindReward = this.activeBlind === 'SMALL' ? 3 : this.activeBlind === 'BIG' ? 4 : 5;
    const interest = Math.min(5, Math.floor(this.money / 5));
    const totalPayout = blindReward + turnsLeft * 1 + interest;

    this.money += totalPayout;
    const blindTarget = this.getBlindTarget(this.activeBlind!);

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

    const gameConfig: GameConfig = {
      targetScore: blindTarget,
      maxTurns: maxTurnsVal,
      stonesPerTurn: this.config.stonesPerTurn,
      operatorsPerTurn: this.config.operatorsPerTurn,
      maxPips: this.config.maxPips,
    };
    this.game = new GameState(gameConfig);
    this.roundHooks = this.wireCharms();
    this.discardsLeft = this.selectedDeck === 'RED' ? 3 : 2;

    // Golden stones, stats, and Boss 3 logic injection
    const originalSubmit = this.game.submitChain.bind(this.game);
    this.game.submitChain = () => {
      // Round 3 Boss check: block divide
      if (this.round === 3 && this.activeBlind === 'BOSS') {
        const hasDivide = this.game.board.getUnfrozenEdges().some((e) => e.operator.type === 'DIVIDE');
        if (hasDivide) {
          return { ok: false, error: 'Bu Boss aşamasında bölme operatörü kullanılamaz!' };
        }
      }

      // Find any golden stones placed this turn (unfrozen before submit)
      const unscoredNodes = this.game.board.getNodes().filter((n) => !n.frozen);
      const unscoredGoldenCount = unscoredNodes.filter((n) => (n as any).isGolden).length;
      const unscoredEdgesCount = this.game.board.getUnfrozenEdges().length;

      const res = originalSubmit();
      if (res.ok && res.scoreGained !== undefined) {
        // Update stats
        this.totalCardsPlayed += unscoredEdgesCount;
        this.bestHandScore = Math.max(this.bestHandScore, res.scoreGained);

        // Award $3 per golden stone submitted!
        this.money += unscoredGoldenCount * 3;
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

      // Boss 8: Negatives from subtraction are doubled
      if (this.round === 8 && this.activeBlind === 'BOSS' && operator === 'SUBTRACT' && val < 0) {
        val *= 2;
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

    return offers;
  }
}
