import type { OperatorCard, OperatorType } from './types.js';

const OPERATOR_SYMBOLS: Record<OperatorType, string> = {
  ADD: '+',
  SUBTRACT: '-',
  MULTIPLY: 'x',
  DIVIDE: '÷',
};

let nextId = 0;

export function createOperatorCard(type: OperatorType): OperatorCard {
  nextId += 1;
  return { id: `op_${type.toLowerCase()}_${nextId}`, type, symbol: OPERATOR_SYMBOLS[type] };
}

export class OperatorDeck {
  private cards: OperatorCard[] = [];

  /** Default starting set: a handful of each operator type. */
  static createStandardSet(countPerType = 5): OperatorDeck {
    const deck = new OperatorDeck();
    const types: OperatorType[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];
    for (const type of types) {
      for (let i = 0; i < countPerType; i++) {
        deck.cards.push(createOperatorCard(type));
      }
    }
    return deck;
  }

  get remaining(): number {
    return this.cards.length;
  }

  shuffle(rng: () => number = Math.random): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(count = 1): OperatorCard[] {
    return this.cards.splice(0, count);
  }

  discard(cards: OperatorCard[]): void {
    this.cards.push(...cards);
  }
}
