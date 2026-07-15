import { describe, it, expect } from 'vitest';
import { GameState } from './GameState.js';
import { createOperatorCard } from '../models/OperatorDeck.js';
import type { DominoStone } from '../models/types.js';

const stone = (id: string, l: number, r: number): DominoStone => ({ id, leftVal: l, rightVal: r });

const baseConfig = { targetScore: 100, maxTurns: 5, stonesPerTurn: 3, operatorsPerTurn: 2 };

describe('GameState', () => {
  it('drawForTurn moves stones/operators from the decks into hand', () => {
    const game = new GameState(baseConfig);
    const initialStoneDeck = game.stoneDeck.remaining;
    const initialOpDeck = game.operatorDeck.remaining;

    game.drawForTurn();

    expect(game.hand).toHaveLength(3);
    expect(game.operatorHand).toHaveLength(1);
    expect(game.stoneDeck.remaining).toBe(initialStoneDeck - 3);
    expect(game.operatorDeck.remaining).toBe(initialOpDeck - 1);
  });

  it('cycleOperatorCard moves active operator to discard and draws a new one', () => {
    const game = new GameState(baseConfig);
    game.drawForTurn();
    const activeOp = game.operatorHand[0];
    expect(activeOp).toBeDefined();

    const result = game.cycleOperatorCard();
    expect(result.ok).toBe(true);
    expect(game.operatorHand[0]).not.toBe(activeOp);
    expect(game.operatorDiscardPile).toContain(activeOp);
  });

  it('playStone places the first stone at ROOT by default', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];

    const result = game.playStone('s1');

    expect(result.ok).toBe(true);
    expect(game.hand).toHaveLength(0);
    expect(game.board.length).toBe(1);
    expect(game.board.getRootNodeId()).toBe('s1');
  });

  it('playStone fails when the stone is not in hand', () => {
    const game = new GameState(baseConfig);
    const result = game.playStone('missing');
    expect(result.ok).toBe(false);
  });

  it('playOperator fails and leaves hand untouched when the board has no open slot', () => {
    const game = new GameState(baseConfig);
    game.operatorHand = [createOperatorCard('ADD')];

    // No stone on the board yet, so there is no open slot for an operator.
    const result = game.playOperator(game.operatorHand[0].id);

    expect(result.ok).toBe(false);
    expect(game.operatorHand).toHaveLength(1);
  });

  it('submitChain scores the new edge, keeps the graph on the board, and advances the turn', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('s2', 3, 2)];
    game.operatorHand = [createOperatorCard('ADD')];

    game.playStone('s1');
    game.playOperator(game.operatorHand[0].id);
    game.playStone('s2');

    const result = game.submitChain();

    expect(result.ok).toBe(true);
    expect(result.scoreGained).toBe(9); // (3+4) + 2
    expect(game.score).toBe(9);
    expect(game.turn).toBe(2);
    expect(game.board.length).toBe(3); // 2 nodes + 1 edge, stays on the board
  });

  it('a lone stone with no connection yet scores 0', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    game.playStone('s1');

    const result = game.submitChain();

    expect(result.ok).toBe(true);
    expect(result.scoreGained).toBe(0);
    expect(game.score).toBe(0);
  });

  it('a later submit only scores newly-added edges, never re-scoring frozen ones', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('s2', 3, 2)];
    game.operatorHand = [createOperatorCard('ADD')];

    game.playStone('s1');
    game.playOperator(game.operatorHand[0].id);
    game.playStone('s2');
    const first = game.submitChain(); // edge: (3+4)+2=9

    // s1 (a non-double) still has one open slot left (its rightVal side, 4); branch off it again.
    const s1Slot = game.board.getOpenOperatorTargets().find((id) => id.startsWith('s1#'))!;
    game.hand = [stone('s3', 4, 5)];
    game.operatorHand = [createOperatorCard('MULTIPLY')];
    game.playOperator(game.operatorHand[0].id, s1Slot);
    game.playStone('s3', s1Slot); // new edge: (3+4)*5=35

    const second = game.submitChain();

    expect(first.scoreGained).toBe(9);
    expect(second.ok).toBe(true);
    expect(second.scoreGained).toBe(35); // only the new edge, not 9+35
    expect(game.score).toBe(9 + 35);
    expect(game.board.length).toBe(5); // 3 nodes + 2 edges
  });

  it('a SUBTRACT/DIVIDE edge can score low or negative for that turn, without touching banked score', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    game.playStone('s1');
    game.hand = [stone('s2', 3, 4)];
    game.operatorHand = [createOperatorCard('DIVIDE')];
    game.playOperator(game.operatorHand[0].id);
    game.playStone('s2'); // edge: round((3+4)/4) = 2
    const result = game.submitChain();

    expect(result.ok).toBe(true);
    expect(result.scoreGained).toBe(2);
    expect(game.score).toBe(2);
  });

  it("skipTurn only discards this turn's unscored growth, leaving the frozen graph on the board", () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('s2', 3, 2)];
    game.operatorHand = [createOperatorCard('ADD')];
    game.playStone('s1');
    game.playOperator(game.operatorHand[0].id);
    game.playStone('s2');
    game.submitChain(); // freezes s1/s2/edge, score 9

    const s1Slot = game.board.getOpenOperatorTargets().find((id) => id.startsWith('s1#'))!;
    game.hand = [stone('s3', 4, 1)];
    game.operatorHand = [createOperatorCard('SUBTRACT')];
    game.playOperator(game.operatorHand[0].id, s1Slot);
    game.playStone('s3', s1Slot); // not yet submitted

    game.skipTurn();

    expect(game.score).toBe(9); // unchanged, nothing new was scored
    expect(game.board.length).toBe(3); // only the frozen s1/s2/edge remain
  });

  it('undoLastMove cannot reach elements from a previously submitted (frozen) turn', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    game.playStone('s1');
    game.submitChain(); // freezes s1

    const result = game.undoLastMove();

    expect(result.ok).toBe(false);
    expect(game.board.length).toBe(1);
  });

  it('submitChain rejects a dangling operator without advancing the turn or score', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    game.operatorHand = [createOperatorCard('ADD')];

    game.playStone('s1');
    game.playOperator(game.operatorHand[0].id);
    // no closing stone placed -> a slot dangles on an operator

    const result = game.submitChain();

    expect(result.ok).toBe(false);
    expect(game.score).toBe(0);
    expect(game.turn).toBe(1);
  });

  it('reaches WON status once score meets the target', () => {
    const game = new GameState({ ...baseConfig, targetScore: 5 });
    game.hand = [stone('s1', 3, 4), stone('s2', 3, 2)];
    game.operatorHand = [createOperatorCard('ADD')];

    game.playStone('s1');
    game.playOperator(game.operatorHand[0].id);
    game.playStone('s2');
    const result = game.submitChain();

    expect(result.scoreGained).toBe(9);
    expect(game.status).toBe('WON');
  });

  it('reaches LOST status after exceeding maxTurns without hitting the target', () => {
    const game = new GameState({ ...baseConfig, targetScore: 1000, maxTurns: 1 });
    game.hand = [stone('s1', 1, 1)];

    game.playStone('s1');
    game.submitChain(); // turn 1 -> 2, still below target

    expect(game.turn).toBe(2);
    expect(game.status).toBe('LOST');
  });

  it('ignores further plays once the game has ended', () => {
    const game = new GameState({ ...baseConfig, targetScore: 1, maxTurns: 5 });
    game.hand = [stone('s1', 3, 4), stone('s2', 3, 2)];
    game.operatorHand = [createOperatorCard('ADD')];
    game.playStone('s1');
    game.playOperator(game.operatorHand[0].id);
    game.playStone('s2');
    game.submitChain();
    expect(game.status).toBe('WON');

    const result = game.playStone('anything');
    expect(result.ok).toBe(false);
  });

  it('undoLastMove returns a placed stone back to the hand', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    game.playStone('s1');
    expect(game.board.length).toBe(1);

    const result = game.undoLastMove();

    expect(result.ok).toBe(true);
    expect(game.board.length).toBe(0);
    expect(game.hand.map((s) => s.id)).toContain('s1');
  });

  it('undoLastMove returns a placed operator back to the operator hand', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    game.operatorHand = [createOperatorCard('ADD')];
    const opId = game.operatorHand[0].id;
    game.playStone('s1');
    game.playOperator(opId);

    const result = game.undoLastMove();

    expect(result.ok).toBe(true);
    expect(game.board.length).toBe(1);
    expect(game.operatorHand.map((o) => o.id)).toContain(opId);
  });

  it('undoLastMove fails when the board is empty', () => {
    const game = new GameState(baseConfig);
    const result = game.undoLastMove();
    expect(result.ok).toBe(false);
  });

  it('lets a player recover from a mismatched attempt via undo then retry', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('bad', 9, 9), stone('s2', 3, 2)];
    game.operatorHand = [createOperatorCard('ADD')];
    const opId = game.operatorHand[0].id;

    game.playStone('s1');
    game.playOperator(opId);
    expect(game.playStone('bad').ok).toBe(false); // 9 does not match the pending slot's value 3

    game.undoLastMove(); // take the operator back
    game.playOperator(opId);
    expect(game.playStone('s2').ok).toBe(true); // 3 matches, edge now valid

    const result = game.submitChain();
    expect(result.ok).toBe(true);
    expect(result.scoreGained).toBe(9);
  });

  it('skipTurn discards the hand and board back to the decks and advances the turn without scoring', () => {
    const game = new GameState(baseConfig);
    const totalStones = game.stoneDeck.remaining;
    const totalOperators = game.operatorDeck.remaining;

    game.drawForTurn(); // pulls real stones/operators out of the decks
    const s1 = game.hand[0].id;
    game.playStone(s1);
    game.playOperator(game.operatorHand[0].id);
    // remaining hand/operatorHand entries stay unplayed

    game.skipTurn();

    expect(game.score).toBe(0);
    expect(game.turn).toBe(2);
    expect(game.board.length).toBe(0);
    expect(game.hand).toHaveLength(0);
    expect(game.operatorHand).toHaveLength(0);
    expect(game.stoneDeck.remaining).toBe(totalStones);
    expect(game.operatorDeck.remaining).toBe(totalOperators);
  });

  it('skipTurn can push the game into LOST when it exhausts maxTurns', () => {
    const game = new GameState({ ...baseConfig, targetScore: 1000, maxTurns: 1 });
    game.skipTurn();
    expect(game.turn).toBe(2);
    expect(game.status).toBe('LOST');
    expect(game.lossReason).toBe('MAX_TURNS');
  });

  it('hasAnyLegalMove is true when a stone in hand fits an open slot', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    expect(game.hasAnyLegalMove()).toBe(true);
  });

  it('hasAnyLegalMove is false when no stone or operator in hand fits a pending slot', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    game.operatorHand = [createOperatorCard('ADD')];
    game.playStone('s1');
    game.playOperator(game.operatorHand[0].id);
    // A slot now dangles awaiting leftVal 4 (or 3, the other side); hand has nothing that fits.
    game.hand = [stone('bad', 9, 9)];
    expect(game.hasAnyLegalMove()).toBe(false);
  });

  it('flips to LOST with STUCK reason when a slot dangles on an operator and no hand item fits', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('bad', 9, 9)];
    game.operatorHand = [createOperatorCard('ADD')];
    const opId = game.operatorHand[0].id;

    game.playStone('s1');
    game.hand = [stone('bad', 9, 9)]; // only a non-fitting stone remains
    const result = game.playOperator(opId);

    expect(result.ok).toBe(true);
    expect(game.status).toBe('LOST');
    expect(game.lossReason).toBe('STUCK');
  });

  it('a double stone can branch into 4 independent connections', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('d1', 6, 6)];
    game.playStone('d1');

    const slots = game.board.getOpenOperatorTargets();
    expect(slots).toHaveLength(4);

    game.hand = [stone('c0', 6, 1), stone('c1', 6, 2), stone('c2', 6, 3), stone('c3', 6, 4)];
    game.operatorHand = [
      createOperatorCard('ADD'),
      createOperatorCard('SUBTRACT'),
      createOperatorCard('MULTIPLY'),
      createOperatorCard('DIVIDE'),
    ];

    slots.forEach((slotId, i) => {
      game.playOperator(game.operatorHand[0].id, slotId);
      game.playStone(game.hand[0].id, slotId);
    });

    expect(game.board.getEdges()).toHaveLength(4);
    const result = game.submitChain();
    expect(result.ok).toBe(true);
    // (6+6)+1=13, (6+6)-2=10, (6+6)*3=36, round((6+6)/4)=3, plus the +5 hand-emptied bonus
    // (all 4 drawn stones were played this turn, emptying the hand).
    expect(result.scoreGained).toBe(13 + 10 + 36 + 3 + 5);
    expect(result.handEmptiedBonus).toBe(5);
  });
});
