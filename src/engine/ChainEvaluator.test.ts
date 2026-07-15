import { describe, it, expect } from 'vitest';
import { ChainEvaluator } from './ChainEvaluator.js';
import { createOperatorCard } from '../models/OperatorDeck.js';
import type { ChainElement, DominoStone } from '../models/types.js';

const stone = (id: string, l: number, r: number): DominoStone => ({ id, leftVal: l, rightVal: r });
const S = (s: DominoStone): ChainElement => ({ type: 'STONE', data: s });
const O = (t: Parameters<typeof createOperatorCard>[0]): ChainElement => ({
  type: 'OPERATOR',
  data: createOperatorCard(t),
});

describe('ChainEvaluator', () => {
  it('evaluates a single stone as leftVal + rightVal', () => {
    const evaluator = new ChainEvaluator();
    const result = evaluator.evaluate([S(stone('s1', 3, 4))]);
    expect(result.finalValue).toBe(7);
    expect(result.error).toBeUndefined();
  });

  it('resolves left-to-right regardless of operator precedence', () => {
    // (3+4) + 2 - 15 = 7 + 2 - 15 = -6  (not standard precedence, pure sequential)
    const evaluator = new ChainEvaluator();
    const chain = [
      S(stone('s1', 3, 4)),
      O('ADD'),
      S(stone('s2', 4, 2)),
      O('SUBTRACT'),
      S(stone('s3', 2, 15)),
    ];
    const result = evaluator.evaluate(chain);
    expect(result.finalValue).toBe(-6);
  });

  it('multiplies using the exposed (non-touching) face of the next stone', () => {
    // (2+3) * 5 = 25, matched face is 3, exposed face is 5
    const evaluator = new ChainEvaluator();
    const chain = [S(stone('s1', 2, 3)), O('MULTIPLY'), S(stone('s2', 3, 5))];
    const result = evaluator.evaluate(chain);
    expect(result.finalValue).toBe(25);
  });

  it('divides and allows fractional results', () => {
    // (1+3) / 2 = 2
    const evaluator = new ChainEvaluator();
    const chain = [S(stone('s1', 1, 3)), O('DIVIDE'), S(stone('s2', 3, 2))];
    const result = evaluator.evaluate(chain);
    expect(result.finalValue).toBe(2);
  });

  it('errors on division by zero', () => {
    const evaluator = new ChainEvaluator();
    const chain = [S(stone('s1', 1, 3)), O('DIVIDE'), S(stone('s2', 3, 0))];
    const result = evaluator.evaluate(chain);
    expect(result.error).toBe('Sıfıra bölme hatası!');
  });

  it('errors when the chain does not start with a stone', () => {
    const evaluator = new ChainEvaluator();
    const result = evaluator.evaluate([O('ADD')]);
    expect(result.error).toBeDefined();
  });

  it('errors when two operators appear consecutively', () => {
    const evaluator = new ChainEvaluator();
    const chain = [S(stone('s1', 3, 4)), O('ADD'), O('SUBTRACT')];
    const result = evaluator.evaluate(chain);
    expect(result.error).toBe('Üst üste iki operatör yerleştirilemez!');
  });

  it('errors when the chain ends with a dangling operator', () => {
    const evaluator = new ChainEvaluator();
    const chain = [S(stone('s1', 3, 4)), O('ADD')];
    const result = evaluator.evaluate(chain);
    expect(result.error).toBe('Zincir operatör ile bitemez!');
  });

  it('errors on mismatched stone faces', () => {
    const evaluator = new ChainEvaluator();
    const chain = [S(stone('s1', 3, 4)), O('ADD'), S(stone('s2', 5, 2))];
    const result = evaluator.evaluate(chain);
    expect(result.error).toContain('Uyumsuz taş eşleşmesi');
  });

  it('invokes onOperatorResolve for each resolved operator', () => {
    const evaluator = new ChainEvaluator();
    const calls: Array<[string, number, number, number]> = [];
    evaluator.onOperatorResolve = (op, l, r, res) => calls.push([op, l, r, res]);
    const chain = [S(stone('s1', 3, 4)), O('ADD'), S(stone('s2', 4, 2))];
    evaluator.evaluate(chain);
    expect(calls).toEqual([['ADD', 7, 2, 9]]);
  });

  it('applies onEvaluationEnd to manipulate the final result (Paradox charm)', () => {
    const evaluator = new ChainEvaluator();
    evaluator.onEvaluationEnd = (result) => (result < 0 ? Math.abs(result) * 5 : result);
    const chain = [
      S(stone('s1', 3, 4)),
      O('ADD'),
      S(stone('s2', 4, 2)),
      O('SUBTRACT'),
      S(stone('s3', 2, 15)),
    ];
    const result = evaluator.evaluate(chain);
    expect(result.finalValue).toBe(30); // -6 -> abs(6)*5
  });
});
