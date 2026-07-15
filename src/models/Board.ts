import type { ChainElement, DominoStone, OperatorCard } from './types.js';

export type BoardError =
  | 'CHAIN_MUST_START_WITH_STONE'
  | 'EXPECTED_OPERATOR'
  | 'EXPECTED_STONE'
  | 'STONE_MISMATCH';

export interface BoardActionResult {
  ok: boolean;
  error?: BoardError;
}

/**
 * Holds the active chain being built on the table this turn.
 * Enforces domino placement rules: STONE, OPERATOR, STONE, OPERATOR, STONE...
 * where a stone's leftVal must equal the previous stone's rightVal.
 */
export class Board {
  private chain: ChainElement[] = [];

  getChain(): ReadonlyArray<ChainElement> {
    return this.chain;
  }

  get length(): number {
    return this.chain.length;
  }

  private lastStone(): DominoStone | null {
    for (let i = this.chain.length - 1; i >= 0; i--) {
      const el = this.chain[i];
      if (el.type === 'STONE') return el.data;
    }
    return null;
  }

  private expectsOperatorNext(): boolean {
    if (this.chain.length === 0) return false;
    return this.chain[this.chain.length - 1].type === 'STONE';
  }

  canAddStone(stone: DominoStone): BoardActionResult {
    if (this.chain.length === 0) {
      return { ok: true };
    }
    if (this.expectsOperatorNext()) {
      return { ok: false, error: 'EXPECTED_OPERATOR' };
    }
    const prev = this.lastStone();
    if (prev && prev.rightVal !== stone.leftVal) {
      return { ok: false, error: 'STONE_MISMATCH' };
    }
    return { ok: true };
  }

  addStone(stone: DominoStone): BoardActionResult {
    const check = this.canAddStone(stone);
    if (!check.ok) return check;
    this.chain.push({ type: 'STONE', data: stone });
    return { ok: true };
  }

  canAddOperator(): BoardActionResult {
    if (this.chain.length === 0) {
      return { ok: false, error: 'CHAIN_MUST_START_WITH_STONE' };
    }
    if (!this.expectsOperatorNext()) {
      return { ok: false, error: 'EXPECTED_STONE' };
    }
    return { ok: true };
  }

  addOperator(operator: OperatorCard): BoardActionResult {
    const check = this.canAddOperator();
    if (!check.ok) return check;
    this.chain.push({ type: 'OPERATOR', data: operator });
    return { ok: true };
  }

  /** Removes and returns the most recently placed element (stone or operator), if any. */
  removeLast(): ChainElement | undefined {
    return this.chain.pop();
  }

  /** Removes and returns every element currently on the board, in placement order. */
  drainAll(): ChainElement[] {
    const drained = this.chain;
    this.chain = [];
    return drained;
  }

  reset(): void {
    this.chain = [];
  }
}
