import { describe, it, expect } from 'vitest';
import { Board } from '../models/Board.js';
import { createOperatorCard } from '../models/OperatorDeck.js';
import { GraphEvaluator } from './GraphEvaluator.js';
import type { DominoStone } from '../models/types.js';

const stone = (id: string, l: number, r: number): DominoStone => ({ id, leftVal: l, rightVal: r });

describe('Board -> GraphEvaluator integration', () => {
  it('scores a small branching graph built through the real Board API', () => {
    const board = new Board();
    board.addStoneAt(stone('d1', 6, 6), 'ROOT');
    const [slotA, slotB] = board.getSlots('d1').map((s) => s.slotId);

    board.addOperatorAt(createOperatorCard('ADD'), slotA); // (6+6) + 2 = 14
    board.addStoneAt(stone('branchA', 6, 2), slotA);
    board.addOperatorAt(createOperatorCard('MULTIPLY'), slotB); // (6+6) * 3 = 36
    board.addStoneAt(stone('branchB', 6, 3), slotB);

    const evaluator = new GraphEvaluator();
    const result = evaluator.scoreEdges(board.getUnfrozenEdges());

    expect(result.ok).toBe(true);
    expect(result.totalGain).toBe(14 + 36);
  });

  it('an illegal placement never reaches the evaluator', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const slotId = board.getSlots('s1')[0].slotId;
    board.addOperatorAt(createOperatorCard('ADD'), slotId);
    const rejected = board.addStoneAt(stone('bad', 9, 9), slotId);

    expect(rejected.ok).toBe(false);
    expect(board.getEdges()).toHaveLength(0); // the bad stone never got connected

    const evaluator = new GraphEvaluator();
    const result = evaluator.scoreEdges(board.getUnfrozenEdges());
    // the dangling operator never turned into an edge, so there is simply nothing to score
    expect(result.ok).toBe(true);
    expect(result.totalGain).toBe(0);
  });
});
