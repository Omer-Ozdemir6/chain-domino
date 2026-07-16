import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoreCalculator.js';
import type { DominoStone, OperatorCard } from '../models/types.js';
import { E } from '../test-utils/edges.js';
import type { CharmHooks } from '../models/Charm.js';
import { GameState } from '../game/GameState.js';

describe('scoreCalculator', () => {
  const normalStone = (id: string, l: number, r: number): DominoStone => ({
    id,
    leftVal: l,
    rightVal: r,
    modifier: 'NORMAL',
  });

  const ivoryStone = (id: string, l: number, r: number): DominoStone => ({
    id,
    leftVal: l,
    rightVal: r,
    modifier: 'IVORY',
  });

  const obsidianStone = (id: string, l: number, r: number): DominoStone => ({
    id,
    leftVal: l,
    rightVal: r,
    modifier: 'OBSIDIAN',
  });

  it('calculates flat score for a root stone with no edges', () => {
    const stone = normalStone('s1', 3, 4);
    const result = calculateScore([stone], [], [], { ADD: 1, SUBTRACT: 1, MULTIPLY: 1, DIVIDE: 1 });
    expect(result.score).toBe(0); // chips = 0, mult = 1
    expect(result.chips).toBe(0);
    expect(result.mult).toBe(1);
  });

  it('applies Ivory bonus of +15 chips', () => {
    const stone = ivoryStone('s1', 3, 4);
    const result = calculateScore([stone], [], [], { ADD: 1, SUBTRACT: 1, MULTIPLY: 1, DIVIDE: 1 });
    expect(result.score).toBe(15); // chips = 0 + 15 = 15, mult = 1
    expect(result.chips).toBe(15);
  });

  it('applies Obsidian x2 multiplier', () => {
    const root = normalStone('root', 5, 5);
    const child = obsidianStone('child', 3, 4);
    const edge = E(5, 'ADD', 4); // 9 chips
    edge.childNodeId = 'child';
    const result = calculateScore([root, child], [edge], [], { ADD: 1, SUBTRACT: 1, MULTIPLY: 1, DIVIDE: 1 });
    expect(result.score).toBe(18); // chips = 9, mult = 1 * 2 = 2 -> score = 18
    expect(result.chips).toBe(9);
    expect(result.mult).toBe(2);
  });

  it('calculates score with connected edges and operator levels', () => {
    const root = normalStone('root', 5, 5);
    const child = normalStone('child', 3, 4);
    const edge = E(5, 'ADD', 4); // parentBase = 5, childExposedValue = 4 -> edge value = 9
    edge.childNodeId = 'child';

    const result = calculateScore(
      [root, child],
      [edge],
      [],
      { ADD: 2, SUBTRACT: 1, MULTIPLY: 1, DIVIDE: 1 } // level 2 ADD gives +2 bonus
    );

    // root: 0 chips
    // child (edge value): 5+4 = 9, +2 level bonus = 11 chips
    // Total chips = 11, mult = 1 -> score = 11
    expect(result.chips).toBe(11);
    expect(result.score).toBe(11);
  });

  it('triggers cosmic_pendulum charm to add +4 multiplier when chain length >= 4', () => {
    const stones = [
      normalStone('s1', 1, 1),
      normalStone('s2', 2, 2),
      normalStone('s3', 3, 3),
      normalStone('s4', 4, 4),
    ];
    const e2 = E(1, 'ADD', 2); e2.childNodeId = 's2';
    const e3 = E(2, 'ADD', 3); e3.childNodeId = 's3';
    const e4 = E(3, 'ADD', 4); e4.childNodeId = 's4';

    const charmHooks: CharmHooks = {
      onCalculate: (state, chain) => {
        if (chain.length >= 4) {
          return { ...state, mult: state.mult + 4 };
        }
        return state;
      },
    };

    const activeCharms = [{ id: 'cosmic_pendulum', name: 'Galaksili Büyük Saat', hooks: charmHooks }];

    const result = calculateScore(stones, [e2, e3, e4], activeCharms, { ADD: 1, SUBTRACT: 1, MULTIPLY: 1, DIVIDE: 1 });
    // chips: s2 (3) + s3 (5) + s4 (7) = 15
    // mult: 1 + 4 = 5
    // score: 15 * 5 = 75
    expect(result.chips).toBe(15);
    expect(result.mult).toBe(5);
    expect(result.score).toBe(75);
  });

  it('triggers heart_matryoshka charm to multiply multiplier by 1.5 when all played stones have even sums', () => {
    const stones = [
      normalStone('s1', 2, 2), // sum = 4 (even)
      normalStone('s2', 3, 3), // sum = 6 (even)
    ];
    const e2 = E(4, 'ADD', 6); e2.childNodeId = 's2';

    const charmHooks: CharmHooks = {
      onCalculate: (state, chain) => {
        const isAllEven = chain.every((t) => (t.leftVal + t.rightVal) % 2 === 0);
        if (isAllEven && chain.length > 0) {
          return { ...state, mult: state.mult * 1.5 };
        }
        return state;
      },
    };

    const activeCharms = [{ id: 'heart_matryoshka', name: 'Anatomik Matruşka', hooks: charmHooks }];

    const result = calculateScore(stones, [e2], activeCharms, { ADD: 1, SUBTRACT: 1, MULTIPLY: 1, DIVIDE: 1 });
    // chips: 10
    // mult: 1 * 1.5 = 1.5
    // score: 10 * 1.5 = 15
    expect(result.chips).toBe(10);
    expect(result.mult).toBe(1.5);
    expect(result.score).toBe(15);
  });

  it('permanently destroys Obsidian stone upon submit if 25% breakage check triggers', () => {
    const config = { targetScore: 100, maxTurns: 5, stonesPerTurn: 4, operatorsPerTurn: 4 };
    const game = new GameState(config);

    // Override hand and deck with an Obsidian stone
    const obsStone: DominoStone = { id: 'obsidian_stone', leftVal: 3, rightVal: 3, modifier: 'OBSIDIAN' };
    game.hand = [obsStone];
    game.stoneDeck.discard([obsStone]);

    game.playStone('obsidian_stone', 'ROOT');

    // Force Math.random to return <= 0.25 to trigger breakage
    const origRandom = Math.random;
    Math.random = () => 0.1;

    try {
      const res = game.submitChain();
      expect(res.ok).toBe(true);
      expect(res.brokenTileIds).toContain('obsidian_stone');
      // Verify stone is deleted from stoneDeck
      const remainingIds = game.stoneDeck.getStones().map((s) => s.id);
      expect(remainingIds).not.toContain('obsidian_stone');
    } finally {
      Math.random = origRandom;
    }
  });

  it('does not destroy Obsidian stone if breakage check does not trigger', () => {
    const config = { targetScore: 100, maxTurns: 5, stonesPerTurn: 4, operatorsPerTurn: 4 };
    const game = new GameState(config);

    const obsStone: DominoStone = { id: 'obsidian_stone', leftVal: 3, rightVal: 3, modifier: 'OBSIDIAN' };
    game.hand = [obsStone];
    game.stoneDeck.discard([obsStone]);

    game.playStone('obsidian_stone', 'ROOT');

    // Force Math.random to return > 0.25
    const origRandom = Math.random;
    Math.random = () => 0.5;

    try {
      const res = game.submitChain();
      expect(res.ok).toBe(true);
      expect(res.brokenTileIds).toBeUndefined();
      const remainingIds = game.stoneDeck.getStones().map((s) => s.id);
      expect(remainingIds).toContain('obsidian_stone');
    } finally {
      Math.random = origRandom;
    }
  });

  it('aligns neighboring parent and child node slot values when placing Amber stone', () => {
    const config = { targetScore: 100, maxTurns: 5, stonesPerTurn: 4, operatorsPerTurn: 4 };
    const game = new GameState(config);

    // root node: 3|4
    const s1: DominoStone = { id: 's1', leftVal: 3, rightVal: 4, modifier: 'NORMAL' };
    // child node (Amber): 4|5
    const s2: DominoStone = { id: 's2', leftVal: 4, rightVal: 5, modifier: 'AMBER' };
    const op: OperatorCard = { id: 'op1', type: 'ADD', symbol: '+' };

    game.hand = [s1, s2];
    game.operatorHand = [op];

    // Place s1 as root
    game.playStone('s1', 'ROOT');
    // Place operator
    game.playOperator('op1', 's1#1');
    // Place Amber stone s2
    game.playStone('s2', 's1#1');

    // Amber stone has leftVal = 4, rightVal = 5.
    // Parent node is s1 (which has leftVal = 3, rightVal = 4).
    // The Amber alignment will set parent s1's values to match s2's leftVal (4).
    // So parent s1's leftVal and rightVal should both become 4!
    const parentNode = game.board.getNodes().find((n) => n.nodeId === 's1')!;
    expect(parentNode.leftVal).toBe(4);
    expect(parentNode.rightVal).toBe(4);
  });
});
