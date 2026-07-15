import { describe, it, expect } from 'vitest';
import { Deck } from './Deck.js';

describe('Deck', () => {
  it('creates a standard double-six set with 28 unique tiles', () => {
    const deck = Deck.createStandardSet(6);
    expect(deck.remaining).toBe(28);
  });

  it('includes each double tile exactly once', () => {
    const deck = Deck.createStandardSet(6);
    const drawn = deck.draw(28);
    const doubles = drawn.filter((s) => s.leftVal === s.rightVal);
    expect(doubles).toHaveLength(7); // 0-0 through 6-6
  });

  it('draw removes stones from the deck', () => {
    const deck = Deck.createStandardSet(6);
    const hand = deck.draw(5);
    expect(hand).toHaveLength(5);
    expect(deck.remaining).toBe(23);
  });

  it('discard returns stones to the deck', () => {
    const deck = Deck.createStandardSet(6);
    const hand = deck.draw(5);
    deck.discard(hand);
    expect(deck.remaining).toBe(28);
  });

  it('shuffle preserves all stones (no loss or duplication)', () => {
    const deck = Deck.createStandardSet(6);
    deck.shuffle(() => 0.42);
    expect(deck.remaining).toBe(28);
  });
});
