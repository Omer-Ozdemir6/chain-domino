import { describe, it, expect } from 'vitest';
import { Board } from './Board.js';
import { createOperatorCard } from './OperatorDeck.js';
import type { DominoStone } from './types.js';

const stone = (id: string, l: number, r: number): DominoStone => ({ id, leftVal: l, rightVal: r });

describe('Board', () => {
  it('accepts the first stone unconditionally', () => {
    const board = new Board();
    const result = board.addStone(stone('s1', 3, 4));
    expect(result.ok).toBe(true);
    expect(board.length).toBe(1);
  });

  it('rejects a second stone placed without an operator in between', () => {
    const board = new Board();
    board.addStone(stone('s1', 3, 4));
    const result = board.addStone(stone('s2', 4, 2));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('EXPECTED_OPERATOR');
  });

  it('rejects an operator before any stone is placed', () => {
    const board = new Board();
    const result = board.addOperator(createOperatorCard('ADD'));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('CHAIN_MUST_START_WITH_STONE');
  });

  it('rejects two consecutive operators', () => {
    const board = new Board();
    board.addStone(stone('s1', 3, 4));
    board.addOperator(createOperatorCard('ADD'));
    const result = board.addOperator(createOperatorCard('SUBTRACT'));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('EXPECTED_STONE');
  });

  it('rejects a stone whose left value does not match the previous stone right value', () => {
    const board = new Board();
    board.addStone(stone('s1', 3, 4));
    board.addOperator(createOperatorCard('ADD'));
    const result = board.addStone(stone('s2', 5, 2));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('STONE_MISMATCH');
  });

  it('builds a valid chain: stone -> operator -> stone', () => {
    const board = new Board();
    board.addStone(stone('s1', 3, 4));
    board.addOperator(createOperatorCard('ADD'));
    const result = board.addStone(stone('s2', 4, 2));
    expect(result.ok).toBe(true);
    expect(board.length).toBe(3);
  });

  it('reset clears the chain', () => {
    const board = new Board();
    board.addStone(stone('s1', 3, 4));
    board.reset();
    expect(board.length).toBe(0);
  });

  it('removeLast pops the most recently placed element', () => {
    const board = new Board();
    board.addStone(stone('s1', 3, 4));
    board.addOperator(createOperatorCard('ADD'));

    const removed = board.removeLast();

    expect(removed?.type).toBe('OPERATOR');
    expect(board.length).toBe(1);
  });

  it('removeLast returns undefined on an empty board', () => {
    const board = new Board();
    expect(board.removeLast()).toBeUndefined();
  });

  it('removeLast lets a stone be re-added after undoing a mismatched attempt', () => {
    const board = new Board();
    board.addStone(stone('s1', 3, 4));
    board.addOperator(createOperatorCard('ADD'));
    board.removeLast(); // undo the operator
    const result = board.addOperator(createOperatorCard('MULTIPLY'));
    expect(result.ok).toBe(true);
  });

  it('drainAll empties the board and returns every element in order', () => {
    const board = new Board();
    board.addStone(stone('s1', 3, 4));
    board.addOperator(createOperatorCard('ADD'));
    board.addStone(stone('s2', 4, 2));

    const drained = board.drainAll();

    expect(drained).toHaveLength(3);
    expect(board.length).toBe(0);
  });
});
