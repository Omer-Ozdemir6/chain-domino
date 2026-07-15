import { describe, it, expect } from 'vitest';
import { Board } from '../models/Board.js';
import { createOperatorCard } from '../models/OperatorDeck.js';
import { ChainEvaluator } from './ChainEvaluator.js';
import type { DominoStone } from '../models/types.js';

const stone = (id: string, l: number, r: number): DominoStone => ({ id, leftVal: l, rightVal: r });

describe('Board -> ChainEvaluator integration', () => {
  it('evaluates a chain built through the Board API', () => {
    const board = new Board();
    board.addStone(stone('s1', 3, 4));
    board.addOperator(createOperatorCard('ADD'));
    board.addStone(stone('s2', 4, 2));

    const evaluator = new ChainEvaluator();
    const result = evaluator.evaluate(board.getChain());

    expect(result.finalValue).toBe(9);
    expect(result.error).toBeUndefined();
  });

  it('Board validation prevents illegal chains from ever reaching the evaluator', () => {
    const board = new Board();
    board.addStone(stone('s1', 3, 4));
    board.addOperator(createOperatorCard('ADD'));
    const rejected = board.addStone(stone('bad', 9, 9));

    expect(rejected.ok).toBe(false);
    expect(board.length).toBe(2); // the bad stone never got appended

    const evaluator = new ChainEvaluator();
    const result = evaluator.evaluate(board.getChain());
    // chain is left dangling on an operator, which the evaluator itself flags
    expect(result.error).toBe('Zincir operatör ile bitemez!');
  });
});
