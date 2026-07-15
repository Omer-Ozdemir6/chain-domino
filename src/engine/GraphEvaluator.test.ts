import { describe, it, expect } from 'vitest';
import { GraphEvaluator } from './GraphEvaluator.js';
import { E } from '../test-utils/edges.js';

describe('GraphEvaluator', () => {
  it('scores a single ADD edge as parentBase + childExposedValue', () => {
    const evaluator = new GraphEvaluator();
    const result = evaluator.scoreEdges([E(7, 'ADD', 2)]);
    expect(result.ok).toBe(true);
    expect(result.totalGain).toBe(9);
  });

  it('scores a single SUBTRACT edge as parentBase - childExposedValue', () => {
    const evaluator = new GraphEvaluator();
    const result = evaluator.scoreEdges([E(7, 'SUBTRACT', 15)]);
    expect(result.totalGain).toBe(-8);
  });

  it('scores a single MULTIPLY edge as parentBase * childExposedValue', () => {
    const evaluator = new GraphEvaluator();
    const result = evaluator.scoreEdges([E(5, 'MULTIPLY', 5)]);
    expect(result.totalGain).toBe(25);
  });

  it('scores a DIVIDE edge and rounds to the nearest whole number', () => {
    const evaluator = new GraphEvaluator();
    const result = evaluator.scoreEdges([E(7, 'DIVIDE', 4)]);
    expect(result.totalGain).toBe(2); // 1.75 -> rounds to 2
    expect(Number.isInteger(result.totalGain)).toBe(true);
  });

  it('errors on division by zero', () => {
    const evaluator = new GraphEvaluator();
    const result = evaluator.scoreEdges([E(7, 'DIVIDE', 0)]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Sıfıra bölme hatası!');
  });

  it('sums multiple independent edges', () => {
    const evaluator = new GraphEvaluator();
    const result = evaluator.scoreEdges([E(7, 'ADD', 2), E(6, 'SUBTRACT', 1), E(4, 'MULTIPLY', 3)]);
    expect(result.ok).toBe(true);
    expect(result.totalGain).toBe(9 + 5 + 12);
  });

  it('returns 0 for an empty edge list', () => {
    const evaluator = new GraphEvaluator();
    const result = evaluator.scoreEdges([]);
    expect(result.ok).toBe(true);
    expect(result.totalGain).toBe(0);
  });

  it('invokes onOperatorResolve for each edge and passes its return value through', () => {
    const evaluator = new GraphEvaluator();
    const calls: Array<[string, number, number, number]> = [];
    evaluator.onOperatorResolve = (op, l, r, res) => {
      calls.push([op, l, r, res]);
      return res;
    };
    evaluator.scoreEdges([E(7, 'ADD', 2)]);
    expect(calls).toEqual([['ADD', 7, 2, 9]]);
  });

  it('lets onOperatorResolve change an edge value, which flows into the total and the step text', () => {
    const evaluator = new GraphEvaluator();
    evaluator.onOperatorResolve = (_op, _l, _r, edgeValue) => edgeValue + 3;
    const result = evaluator.scoreEdges([E(7, 'DIVIDE', 4)]); // base 2, +3 charm -> 5
    expect(result.totalGain).toBe(5);
    expect(result.steps[0]).toContain('= 5');
  });

  it('applies onEvaluationEnd to manipulate the batch total (Paradox charm)', () => {
    const evaluator = new GraphEvaluator();
    evaluator.onEvaluationEnd = (total) => (total < 0 ? Math.abs(total) * 5 : total);
    const result = evaluator.scoreEdges([E(7, 'SUBTRACT', 15)]); // -8
    expect(result.totalGain).toBe(40); // abs(8)*5
  });
});
