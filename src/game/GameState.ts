import { Board } from '../models/Board.js';
import type { SlotId } from '../models/Board.js';
import { Deck } from '../models/Deck.js';
import { OperatorDeck } from '../models/OperatorDeck.js';
import type { DominoStone, OperatorCard, OperatorType } from '../models/types.js';
import { GraphEvaluator } from '../engine/GraphEvaluator.js';
import { calculateScore } from '../engine/scoreCalculator.js';
import type { CharmHooks } from '../models/Charm.js';

export type { SlotId } from '../models/Board.js';
export type GameStatus = 'PLAYING' | 'WON' | 'LOST';
export type LossReason = 'MAX_TURNS' | 'STUCK' | null;

export interface GameConfig {
  targetScore: number;
  maxTurns: number;
  stonesPerTurn: number;
  operatorsPerTurn: number;
  maxPips?: number;
}

export interface PlayResult {
  ok: boolean;
  error?: string;
}

export interface SubmitResult {
  ok: boolean;
  error?: string;
  scoreGained?: number;
  steps?: string[];
  /** Extra flat bonus folded into scoreGained for fully playing out a turn's whole hand. */
  handEmptiedBonus?: number;
  brokenTileIds?: string[];
}

/** Flat score bonus for placing every stone drawn this turn before submitting. */
const HAND_EMPTIED_BONUS = 5;

/**
 * Drives a single run's turn loop: draw -> place stones/operators -> submit -> repeat
 * until the target score is reached (WON) or turns run out (LOST).
 */
export class GameState {
  readonly config: GameConfig;
  readonly stoneDeck: Deck;
  readonly operatorDeck: OperatorDeck;
  readonly board = new Board();
  readonly evaluator = new GraphEvaluator();

  hand: DominoStone[] = [];
  operatorHand: OperatorCard[] = [];
  operatorDiscardPile: OperatorCard[] = [];
  operatorDeckCycles = 0;
  /** The operator deck never reshuffles mid-round — once its fixed draw order runs out, that's it. */
  readonly maxOperatorDeckCycles = 0;

  turn = 1;
  score = 0;
  status: GameStatus = 'PLAYING';
  lossReason: LossReason = null;

  constructor(config: GameConfig) {
    this.config = config;
    this.stoneDeck = Deck.createStandardSet(config.maxPips ?? 6);
    this.operatorDeck = OperatorDeck.createStandardSet();
    this.stoneDeck.shuffle();
    this.operatorDeck.shuffle();
  }

  /** Tops the operator hand back up to its fixed slot count, respecting the reshuffle safety valve. */
  private refillOperatorHand(): void {
    while (this.operatorHand.length < this.config.operatorsPerTurn) {
      if (this.operatorDeck.remaining === 0) {
        if (this.operatorDiscardPile.length === 0 || this.operatorDeckCycles >= this.maxOperatorDeckCycles) break;
        this.operatorDeck.discard(this.operatorDiscardPile);
        this.operatorDiscardPile = [];
        this.operatorDeck.shuffle();
        this.operatorDeckCycles += 1;
      }
      const [card] = this.operatorDeck.draw(1);
      if (!card) break;
      this.operatorHand.push(card);
    }
  }

  /** Draws this turn's allotment of stones and tops the operator hand up to its fixed slot count. */
  drawForTurn(): void {
    this.hand.push(...this.stoneDeck.draw(this.config.stonesPerTurn));
    this.refillOperatorHand();
    this.checkStuck();
  }

  /** True if at least one item in hand could be legally placed on the board right now. */
  hasAnyLegalMove(): boolean {
    const stoneOk = this.hand.some((s) => this.board.getLegalStoneTargets(s).length > 0);
    
    // If the board has a pending operator, the chain is broken/incomplete.
    // Placing operators on other branches does not resolve the pending state, so only stones can save us.
    if (this.board.hasPendingOperator()) {
      return stoneOk;
    }

    // Solitaire operator check: can place if we have an active operator OR if we can draw a new one!
    const canDrawOperator = this.operatorDeck.remaining > 0 || (this.operatorDiscardPile.length > 0 && this.operatorDeckCycles < this.maxOperatorDeckCycles);
    const operatorOk = (this.operatorHand.length > 0 || canDrawOperator) && this.board.getOpenOperatorTargets().length > 0;
    
    return stoneOk || operatorOk;
  }

  /**
   * Detects the softlock: some slot in the graph dangles on an operator (so it can't be
   * submitted) and nothing in hand can close it. This status is self-healing: undoLastMove/
   * skipTurn stay available while stuck (they're the intended way out) and clear it once no
   * slot is dangling or a legal move reappears. An empty board or a fully-closed graph always
   * leaves submit/skip available, so those cases are never treated as stuck.
   */
  private checkStuck(): void {
    if (this.status === 'WON' || (this.status === 'LOST' && this.lossReason === 'MAX_TURNS')) return;

    const stuck = this.board.hasPendingOperator() && !this.hasAnyLegalMove();
    if (stuck) {
      this.status = 'LOST';
      this.lossReason = 'STUCK';
    } else if (this.status === 'LOST' && this.lossReason === 'STUCK') {
      this.status = 'PLAYING';
      this.lossReason = null;
    }
  }

  /** True while the game accepts undo/skip: still playing, or stuck (their designated escape). */
  canRecover(): boolean {
    return this.status === 'PLAYING' || (this.status === 'LOST' && this.lossReason === 'STUCK');
  }

  playStone(stoneId: string, targetSlotId?: SlotId): PlayResult {
    if (this.status !== 'PLAYING') return { ok: false, error: 'Oyun sona erdi.' };

    const index = this.hand.findIndex((s) => s.id === stoneId);
    if (index === -1) return { ok: false, error: 'Taş elde bulunamadı.' };

    const slotId = targetSlotId ?? this.board.getLegalStoneTargets(this.hand[index])[0];
    if (!slotId) return { ok: false, error: 'STONE_MISMATCH' };

    const result = this.board.addStoneAt(this.hand[index], slotId);
    if (!result.ok) return { ok: false, error: result.error };

    // Apply Amber magnet neighbor alignment effect
    this.board.applyAmberMagnet(stoneId);

    this.hand.splice(index, 1);
    this.checkStuck();
    return { ok: true };
  }

  playOperator(operatorId: string, targetSlotId?: SlotId): PlayResult {
    if (this.status !== 'PLAYING') return { ok: false, error: 'Oyun sona erdi.' };

    const index = this.operatorHand.findIndex((o) => o.id === operatorId);
    if (index === -1) return { ok: false, error: 'Operatör elde bulunamadı.' };

    const slotId = targetSlotId ?? this.board.getOpenOperatorTargets()[0];
    if (!slotId) return { ok: false, error: 'SLOT_NOT_OPEN' };

    const result = this.board.addOperatorAt(this.operatorHand[index], slotId);
    if (!result.ok) return { ok: false, error: result.error };

    this.operatorHand.splice(index, 1);
    // The played slot refills immediately (if the deck still has cards) so the hand stays at a
    // fixed count instead of the player having to draw again between placements.
    this.refillOperatorHand();
    this.checkStuck();
    return { ok: true };
  }

  /** Removes the most recently placed board element and returns it to the player's hand. */
  undoLastMove(): PlayResult {
    if (!this.canRecover()) return { ok: false, error: 'Oyun sona erdi.' };

    const removed = this.board.removeLast();
    if (!removed) return { ok: false, error: 'Geri alınacak hamle yok.' };

    if (removed.type === 'STONE') {
      this.hand.push(removed.data);
    } else {
      this.operatorHand.push(removed.data);
    }
    this.checkStuck();
    return { ok: true };
  }

  /**
   * Abandons the current turn: discards the remaining hand and this turn's not-yet-scored
   * board additions back into their decks (already-frozen, previously scored branches stay
   * on the board), then advances the turn. Use this to escape a turn where no valid
   * continuation can be completed.
   */
  skipTurn(): void {
    if (!this.canRecover()) return;

    for (const element of this.board.drainUnscored()) {
      if (element.type === 'STONE') {
        this.stoneDeck.discard([element.data]);
      } else {
        this.operatorDeck.discard([element.data]);
      }
    }
    this.stoneDeck.discard(this.hand.splice(0, this.hand.length));
    this.operatorDeck.discard(this.operatorHand.splice(0, this.operatorHand.length));

    this.turn += 1;
    this.updateStatus();
  }

  /**
   * Scores every connection (stone-operator-stone edge) placed since the last submit, each as
   * its own independent mini-formula, and banks the sum. Previously-frozen edges are never
   * re-evaluated — a SUBTRACT/DIVIDE addition can only make this turn's own gain low or
   * negative, it can no longer retroactively worsen already-banked connections.
   */
  submitChain(
    activeCharms: { id: string; name: string; hooks: CharmHooks }[] = [],
    operatorLevels: Record<OperatorType, number> = { ADD: 1, SUBTRACT: 1, MULTIPLY: 1, DIVIDE: 1 }
  ): SubmitResult {
    if (this.status !== 'PLAYING') return { ok: false, error: 'Oyun sona erdi.' };
    if (this.board.hasPendingOperator()) {
      return { ok: false, error: 'Zincir operatör ile bitemez!', steps: [] };
    }

    // Map board unfrozen nodes to DominoStone records
    const unfrozenStones: DominoStone[] = this.board.getNodes()
      .filter((n) => !n.frozen)
      .map((n) => ({
        id: n.nodeId,
        leftVal: n.leftVal,
        rightVal: n.rightVal,
        isGolden: n.isGolden,
        modifier: (n as any).modifier,
        tags: (n as any).tags,
      }));

    const unfrozenEdges = this.board.getUnfrozenEdges();

    const result = calculateScore(
      unfrozenStones,
      unfrozenEdges,
      activeCharms,
      operatorLevels,
      this.evaluator.onOperatorResolve?.bind(this.evaluator)
    );

    // Check for Obsidian breakage (25% chance of permanent destruction)
    const brokenTileIds: string[] = [];
    unfrozenStones.forEach((stone) => {
      if (stone.modifier === 'OBSIDIAN') {
        if (Math.random() <= 0.25) {
          this.stoneDeck.removeStoneById(stone.id);
          brokenTileIds.push(stone.id);
        }
      }
    });

    // Reward fully playing out a turn's whole hand (not just a couple of leftover stones).
    const newStonesThisTurn = unfrozenStones.length;
    const handEmptiedBonus =
      this.hand.length === 0 && newStonesThisTurn >= this.config.stonesPerTurn ? HAND_EMPTIED_BONUS : 0;

    this.score += result.score + handEmptiedBonus;
    this.board.freeze();
    this.turn += 1;

    this.updateStatus();

    return {
      ok: true,
      scoreGained: result.score + handEmptiedBonus,
      handEmptiedBonus: handEmptiedBonus || undefined,
      steps: result.steps,
      brokenTileIds: brokenTileIds.length > 0 ? brokenTileIds : undefined,
    };
  }

  private updateStatus(): void {
    if (this.score >= this.config.targetScore) {
      this.status = 'WON';
    } else if (this.turn > this.config.maxTurns) {
      this.status = 'LOST';
      this.lossReason = 'MAX_TURNS';
    }
  }
}
