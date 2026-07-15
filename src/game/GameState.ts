import { Board } from '../models/Board.js';
import { Deck } from '../models/Deck.js';
import { OperatorDeck } from '../models/OperatorDeck.js';
import type { DominoStone, OperatorCard } from '../models/types.js';
import { ChainEvaluator } from '../engine/ChainEvaluator.js';

export type GameStatus = 'PLAYING' | 'WON' | 'LOST';

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
}

/**
 * Drives a single run's turn loop: draw -> place stones/operators -> submit -> repeat
 * until the target score is reached (WON) or turns run out (LOST).
 */
export class GameState {
  readonly config: GameConfig;
  readonly stoneDeck: Deck;
  readonly operatorDeck: OperatorDeck;
  readonly board = new Board();
  readonly evaluator = new ChainEvaluator();

  hand: DominoStone[] = [];
  operatorHand: OperatorCard[] = [];

  turn = 1;
  score = 0;
  status: GameStatus = 'PLAYING';

  constructor(config: GameConfig) {
    this.config = config;
    this.stoneDeck = Deck.createStandardSet(config.maxPips ?? 6);
    this.operatorDeck = OperatorDeck.createStandardSet();
    this.stoneDeck.shuffle();
    this.operatorDeck.shuffle();
  }

  /** Draws this turn's allotment of stones and operators into the player's hand. */
  drawForTurn(): void {
    this.hand.push(...this.stoneDeck.draw(this.config.stonesPerTurn));
    this.operatorHand.push(...this.operatorDeck.draw(this.config.operatorsPerTurn));
  }

  playStone(stoneId: string): PlayResult {
    if (this.status !== 'PLAYING') return { ok: false, error: 'Oyun sona erdi.' };

    const index = this.hand.findIndex((s) => s.id === stoneId);
    if (index === -1) return { ok: false, error: 'Taş elde bulunamadı.' };

    const result = this.board.addStone(this.hand[index]);
    if (!result.ok) return { ok: false, error: result.error };

    this.hand.splice(index, 1);
    return { ok: true };
  }

  playOperator(operatorId: string): PlayResult {
    if (this.status !== 'PLAYING') return { ok: false, error: 'Oyun sona erdi.' };

    const index = this.operatorHand.findIndex((o) => o.id === operatorId);
    if (index === -1) return { ok: false, error: 'Operatör elde bulunamadı.' };

    const result = this.board.addOperator(this.operatorHand[index]);
    if (!result.ok) return { ok: false, error: result.error };

    this.operatorHand.splice(index, 1);
    return { ok: true };
  }

  /** Removes the most recently placed board element and returns it to the player's hand. */
  undoLastMove(): PlayResult {
    if (this.status !== 'PLAYING') return { ok: false, error: 'Oyun sona erdi.' };

    const removed = this.board.removeLast();
    if (!removed) return { ok: false, error: 'Geri alınacak hamle yok.' };

    if (removed.type === 'STONE') {
      this.hand.push(removed.data);
    } else {
      this.operatorHand.push(removed.data);
    }
    return { ok: true };
  }

  /**
   * Abandons the current turn: discards the remaining hand and any in-progress
   * board chain back into their decks (no score gained), then advances the turn.
   * Use this to escape a turn where no valid chain can be completed.
   */
  skipTurn(): void {
    if (this.status !== 'PLAYING') return;

    for (const element of this.board.drainAll()) {
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

  /** Evaluates the board's current chain, applies score, and advances the turn. */
  submitChain(): SubmitResult {
    if (this.status !== 'PLAYING') return { ok: false, error: 'Oyun sona erdi.' };

    const result = this.evaluator.evaluate(this.board.getChain());
    if (result.error) {
      return { ok: false, error: result.error, steps: result.steps };
    }

    this.score += result.finalValue;
    this.board.reset();
    this.turn += 1;

    this.updateStatus();

    return { ok: true, scoreGained: result.finalValue, steps: result.steps };
  }

  private updateStatus(): void {
    if (this.score >= this.config.targetScore) {
      this.status = 'WON';
    } else if (this.turn > this.config.maxTurns) {
      this.status = 'LOST';
    }
  }
}
