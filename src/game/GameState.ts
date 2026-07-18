import { Board } from '../models/Board.js';
import type { SlotId, GraphNode } from '../models/Board.js';
import { Deck } from '../models/Deck.js';
import type { DominoStone } from '../models/types.js';
import { calculateScore } from '../engine/scoreCalculator.js';
import type { CharmHooks } from '../models/Charm.js';

export type { SlotId } from '../models/Board.js';
export type GameStatus = 'PLAYING' | 'WON' | 'LOST';
export type LossReason = 'MAX_TURNS' | 'NO_MOVES' | null;

export interface GameConfig {
  targetScore: number;
  maxTurns: number;
  stonesPerTurn: number;
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

export interface GameStateSnapshot {
  config: GameConfig;
  board: ReturnType<Board['toSnapshot']>;
  stoneDeck: DominoStone[];
  hand: DominoStone[];
  playedNodesThisRound: GraphNode[];
  turn: number;
  score: number;
  status: GameStatus;
  lossReason: LossReason;
}

export class GameState {
  readonly config: GameConfig;
  readonly stoneDeck: Deck;
  readonly board: Board;

  hand: DominoStone[] = [];
  /** Every stone scored this round, across all submitted hands — the board itself is emptied
   *  after each submission, so round-end charms that need to scan "everything played this round"
   *  (e.g. money-per-double-on-the-board) read this instead of the (now always empty) board. */
  playedNodesThisRound: GraphNode[] = [];

  turn = 1;
  score = 0;
  status: GameStatus = 'PLAYING';
  lossReason: LossReason = null;

  /** `restore` lets fromSnapshot() hand in an already-rebuilt Board/Deck — both `board` and
   *  `stoneDeck` are readonly, so this has to happen in the constructor, not a later method. */
  constructor(config: GameConfig, restore?: { board: Board; stoneDeck: Deck }) {
    this.config = config;
    this.board = restore?.board ?? new Board();
    this.stoneDeck = restore?.stoneDeck ?? Deck.createStandardSet(config.maxPips ?? 6);
    if (!restore) this.stoneDeck.shuffle();
  }

  toSnapshot(): GameStateSnapshot {
    return {
      config: this.config,
      board: this.board.toSnapshot(),
      stoneDeck: this.stoneDeck.toSnapshot(),
      hand: this.hand,
      playedNodesThisRound: this.playedNodesThisRound,
      turn: this.turn,
      score: this.score,
      status: this.status,
      lossReason: this.lossReason,
    };
  }

  static fromSnapshot(snap: GameStateSnapshot): GameState {
    const gs = new GameState(snap.config, {
      board: Board.fromSnapshot(snap.board),
      stoneDeck: Deck.fromSnapshot(snap.stoneDeck),
    });
    gs.hand = snap.hand;
    gs.playedNodesThisRound = snap.playedNodesThisRound;
    gs.turn = snap.turn;
    gs.score = snap.score;
    gs.status = snap.status;
    gs.lossReason = snap.lossReason;
    return gs;
  }

  /** Tops the stone hand up to its fixed slot count (never beyond). */
  drawForTurn(): void {
    const need = Math.max(0, this.config.stonesPerTurn - this.hand.length);
    if (need > 0) this.hand.push(...this.stoneDeck.draw(need));
    this.checkStuck();
  }

  /** True if at least one item in hand could be legally placed on the board right now. */
  hasAnyLegalMove(): boolean {
    return this.hand.some((s) => this.board.getLegalStoneTargets(s).length > 0);
  }

  private checkStuck(): void {
    if (this.status !== 'PLAYING') return;
    if (this.hasAnyLegalMove() || this.stoneDeck.remaining > 0) return;
    // If the hand is completely empty but we have unfrozen nodes on the board, let the player submit!
    if (this.hand.length === 0 && this.board.getNodes().some((n) => !n.frozen)) return;

    this.status = this.score >= this.config.targetScore ? 'WON' : 'LOST';
    if (this.status === 'LOST') this.lossReason = 'NO_MOVES';
  }

  /** True while the game accepts undo/skip: still playing. */
  canRecover(): boolean {
    return this.status === 'PLAYING';
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

  /** Removes the most recently placed stone and returns it to the player's hand. */
  undoLastMove(): PlayResult {
    if (!this.canRecover()) return { ok: false, error: 'Oyun sona erdi.' };

    const removed = this.board.removeLast();
    if (!removed) return { ok: false, error: 'Geri alınacak hamle yok.' };

    this.hand.push(removed);
    this.checkStuck();
    return { ok: true };
  }

  /**
   * Discards the remaining hand and this turn's not-yet-scored board additions back into the deck
   */
  skipTurn(): void {
    if (!this.canRecover()) return;

    for (const stone of this.board.drainUnscored()) {
      this.stoneDeck.discard([stone]);
    }
    this.stoneDeck.discard(this.hand.splice(0, this.hand.length));

    this.turn += 1;
    this.updateStatus();
  }

  /**
   * Scores every stone placed since the last submit
   */
  submitChain(
    activeCharms: { id: string; name: string; hooks: CharmHooks }[] = [],
    handStats: { chips: number; mult: number } = { chips: 0, mult: 1 },
    handTypeName: string = 'Düz Zincir'
  ): SubmitResult {
    if (this.status !== 'PLAYING') return { ok: false, error: 'Oyun sona erdi.' };

    // Map board unfrozen nodes to DominoStone records
    const unfrozenNodes = this.board.getNodes().filter((n) => !n.frozen);
    const unfrozenStones: DominoStone[] = unfrozenNodes.map((n) => ({
      id: n.nodeId,
      leftVal: n.leftVal,
      rightVal: n.rightVal,
      isGolden: n.isGolden,
      modifier: n.modifier,
      tags: n.tags,
      leftUpgrade: n.leftUpgrade,
      rightUpgrade: n.rightUpgrade,
    }));

    const result = calculateScore(unfrozenStones, this.board.getUnfrozenEdges(), activeCharms, handStats, handTypeName);

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

    // Reward fully playing out a turn's whole hand
    const newStonesThisTurn = unfrozenStones.length;
    const handEmptiedBonus =
      this.hand.length === 0 && newStonesThisTurn >= this.config.stonesPerTurn ? HAND_EMPTIED_BONUS : 0;

    this.score += result.score + handEmptiedBonus;
    this.playedNodesThisRound.push(...unfrozenNodes);
    this.board.drainAll(); // "Gönder ve Sil": the table is fully cleared for the next hand
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
