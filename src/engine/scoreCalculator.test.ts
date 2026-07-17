import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoreCalculator.js';
import type { DominoStone } from '../models/types.js';
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

  const DEFAULT_STATS = { chips: 0, mult: 1 };
  const DEFAULT_NAME = 'Düz Zincir';

  it('sums a lone root stone\'s own pip values as chips', () => {
    const stone = normalStone('s1', 3, 4);
    const result = calculateScore([stone], [], [], DEFAULT_STATS, DEFAULT_NAME);
    expect(result.chips).toBe(7); // 3 + 4
    expect(result.mult).toBe(1);
    expect(result.score).toBe(7);
  });

  it('applies Ivory bonus of +15 chips on top of the stone\'s own pip sum', () => {
    const stone = ivoryStone('s1', 3, 4);
    const result = calculateScore([stone], [], [], DEFAULT_STATS, DEFAULT_NAME);
    expect(result.chips).toBe(22); // 3 + 4 + 15
    expect(result.score).toBe(22);
  });

  it('applies Obsidian x2 multiplier', () => {
    const root = normalStone('root', 5, 5);
    const child = obsidianStone('child', 3, 4);
    const edge = E('root', 5, 'child', 5);
    const result = calculateScore([root, child], [edge], [], DEFAULT_STATS, DEFAULT_NAME);
    // chips: root(5+5=10) + child(3+4=7) = 17, mult: 1 * 2 = 2 -> score = 34
    expect(result.chips).toBe(17);
    expect(result.mult).toBe(2);
    expect(result.score).toBe(34);
  });

  it('sums the natural pip total of every connected stone, root included', () => {
    // Matches the design example: [3|5] connected to [5|2] -> 3+5+5+2 = 15
    const root = normalStone('root', 3, 5);
    const child = normalStone('child', 5, 2);
    const edge = E('root', 8, 'child', 5);
    const result = calculateScore([root, child], [edge], [], DEFAULT_STATS, DEFAULT_NAME);
    expect(result.chips).toBe(15);
    expect(result.score).toBe(15);
  });

  it('triggers cosmic_pendulum charm to add +4 multiplier when chain length >= 4', () => {
    const stones = [
      normalStone('s1', 1, 1),
      normalStone('s2', 2, 2),
      normalStone('s3', 3, 3),
      normalStone('s4', 4, 4),
    ];

    const charmHooks: CharmHooks = {
      onCalculate: (state, chain) => {
        if (chain.length >= 4) {
          return { ...state, mult: state.mult + 4 };
        }
        return state;
      },
    };

    const activeCharms = [{ id: 'cosmic_pendulum', name: 'Galaksili Büyük Saat', hooks: charmHooks }];

    const result = calculateScore(stones, [], activeCharms, DEFAULT_STATS, DEFAULT_NAME);
    // chips: 2+4+6+8 = 20, mult: 1 + 4 = 5, score: 100
    expect(result.chips).toBe(20);
    expect(result.mult).toBe(5);
    expect(result.score).toBe(100);
  });

  it('triggers heart_matryoshka charm to multiply multiplier by 1.5 when all played stones have even sums', () => {
    const stones = [
      normalStone('s1', 2, 2), // sum = 4 (even)
      normalStone('s2', 3, 3), // sum = 6 (even)
    ];

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

    const result = calculateScore(stones, [], activeCharms, DEFAULT_STATS, DEFAULT_NAME);
    // chips: 4 + 6 = 10, mult: 1 * 1.5 = 1.5, score: 15
    expect(result.chips).toBe(10);
    expect(result.mult).toBe(1.5);
    expect(result.score).toBe(15);
  });

  it('runs multiple charms in order, each seeing the previous charm\'s result (Tetiklenme Şöleni)', () => {
    const stones = [normalStone('s1', 4, 4)];
    const addTen: CharmHooks = { onCalculate: (state) => ({ ...state, mult: state.mult + 10 }) };
    const doubleIt: CharmHooks = { onCalculate: (state) => ({ ...state, mult: state.mult * 2 }) };

    const result = calculateScore(stones, [], [
      { id: 'a', name: 'A', hooks: addTen },
      { id: 'b', name: 'B', hooks: doubleIt },
    ], DEFAULT_STATS, DEFAULT_NAME);
    // mult: 1 -> +10 = 11 -> *2 = 22 (order matters, proves sequential chaining)
    expect(result.mult).toBe(22);
    expect(result.chips).toBe(8);
    expect(result.score).toBe(176);
  });

  it('permanently destroys Obsidian stone upon submit if 25% breakage check triggers', () => {
    const config = { targetScore: 100, maxTurns: 5, stonesPerTurn: 4 };
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
    const config = { targetScore: 100, maxTurns: 5, stonesPerTurn: 4 };
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
    const config = { targetScore: 100, maxTurns: 5, stonesPerTurn: 4 };
    const game = new GameState(config);

    // root node: 3|4
    const s1: DominoStone = { id: 's1', leftVal: 3, rightVal: 4, modifier: 'NORMAL' };
    // child node (Amber): 4|5
    const s2: DominoStone = { id: 's2', leftVal: 4, rightVal: 5, modifier: 'AMBER' };

    game.hand = [s1, s2];

    // Place s1 as root, then s2 directly onto its open "4" end (classic domino matching).
    game.playStone('s1', 'ROOT');
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
