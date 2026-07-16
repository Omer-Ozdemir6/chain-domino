import { Board } from '../models/Board.js';
import type { SlotId } from '../models/Board.js';
import { Deck } from '../models/Deck.js';
import { OperatorDeck } from '../models/OperatorDeck.js';
import type { DominoStone, OperatorCard } from '../models/types.js';
import { GraphEvaluator } from '../engine/GraphEvaluator.js';

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

  /** Draws this turn's allotment of stones and solitaire active operators. */
  drawForTurn(): void {
    this.hand.push(...this.stoneDeck.draw(this.config.stonesPerTurn));
    
    // Auto-draw active operator if slot is empty and passes are available
    if (this.operatorHand.length === 0) {
      if (this.operatorDeck.remaining === 0 && this.operatorDiscardPile.length > 0 && this.operatorDeckCycles < this.maxOperatorDeckCycles) {
        this.operatorDeck.discard(this.operatorDiscardPile);
        this.operatorDiscardPile = [];
        this.operatorDeck.shuffle();
        this.operatorDeckCycles += 1;
      }
      this.operatorHand.push(...this.operatorDeck.draw(1));
    }
    
    this.checkStuck();
  }

  /** Cycles the active operator card from the draw pile without consuming round discards. */
  cycleOperatorCard(): PlayResult {
    if (this.status !== 'PLAYING') return { ok: false, error: 'Oyun sona erdi.' };

    // Move current active operator to discard pile
    if (this.operatorHand.length > 0) {
      this.operatorDiscardPile.push(...this.operatorHand);
      this.operatorHand = [];
    }

    // Reset deck from discard pile if empty
    if (this.operatorDeck.remaining === 0) {
      if (this.operatorDeckCycles >= this.maxOperatorDeckCycles) {
        return { ok: false, error: 'Tüm devir haklarınızı tükettiniz! Artık yeni operatör çekemezsiniz.' };
      }
      if (this.operatorDiscardPile.length === 0) {
        return { ok: false, error: 'Çekilecek operatör kalmadı.' };
      }
      
      this.operatorDeck.discard(this.operatorDiscardPile);
      this.operatorDiscardPile = [];
      this.operatorDeck.shuffle();
      this.operatorDeckCycles += 1;
    }

    // Draw next operator card
    this.operatorHand = this.operatorDeck.draw(1);
    this.checkStuck();
    return { ok: true };
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
      // Solitaire active operator: if we already have an active operator in hand,
      // move it back to the operator draw deck (so the undone card takes the active slot)
      if (this.operatorHand.length > 0) {
        this.operatorDeck.discard(this.operatorHand);
        this.operatorHand = [];
      }
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
  submitChain(): SubmitResult {
    if (this.status !== 'PLAYING') return { ok: false, error: 'Oyun sona erdi.' };
    if (this.board.hasPendingOperator()) {
      return { ok: false, error: 'Zincir operatör ile bitemez!', steps: [] };
    }

    const result = this.evaluator.scoreEdges(this.board.getUnfrozenEdges());
    if (!result.ok) {
      return { ok: false, error: result.error, steps: result.steps };
    }

    // Reward fully playing out a turn's whole hand (not just a couple of leftover stones).
    const newStonesThisTurn = this.board.getNodes().filter((n) => !n.frozen).length;
    const handEmptiedBonus =
      this.hand.length === 0 && newStonesThisTurn >= this.config.stonesPerTurn ? HAND_EMPTIED_BONUS : 0;

    this.score += result.totalGain + handEmptiedBonus;
    this.board.freeze();
    this.turn += 1;

    this.updateStatus();

    return {
      ok: true,
      scoreGained: result.totalGain + handEmptiedBonus,
      handEmptiedBonus: handEmptiedBonus || undefined,
      steps: result.steps,
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
