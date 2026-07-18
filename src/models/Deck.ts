import type { DominoStone } from './types.js';

export class Deck {
  private stones: DominoStone[] = [];

  /** Builds a standard double-N domino set (default double-six: 28 unique tiles). */
  static createStandardSet(maxPips = 6): Deck {
    const deck = new Deck();
    for (let left = 0; left <= maxPips; left++) {
      for (let right = left; right <= maxPips; right++) {
        deck.stones.push({
          id: `domino_${left}_${right}`,
          leftVal: left,
          rightVal: right,
        });
      }
    }
    return deck;
  }

  get remaining(): number {
    return this.stones.length;
  }

  shuffle(rng: () => number = Math.random): void {
    for (let i = this.stones.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.stones[i], this.stones[j]] = [this.stones[j], this.stones[i]];
    }
  }

  draw(count = 1): DominoStone[] {
    return this.stones.splice(0, count);
  }

  discard(stones: DominoStone[]): void {
    this.stones.push(...stones);
  }

  removeStoneById(id: string): void {
    this.stones = this.stones.filter((s) => s.id !== id);
  }

  getStones(): DominoStone[] {
    return this.stones;
  }

  /** For localStorage persistence — the deck's own state is just this one array. */
  toSnapshot(): DominoStone[] {
    return this.stones;
  }

  static fromSnapshot(stones: DominoStone[]): Deck {
    const deck = new Deck();
    deck.stones = stones;
    return deck;
  }
}
