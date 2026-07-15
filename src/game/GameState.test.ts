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
    expect(game.operatorHand).toHaveLength(2);
    expect(game.stoneDeck.remaining).toBe(initialStoneDeck - 3);
    expect(game.operatorDeck.remaining).toBe(initialOpDeck - 2);
  });

  it('playStone moves a stone from hand onto the board', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];

    const result = game.playStone('s1');

    expect(result.ok).toBe(true);
    expect(game.hand).toHaveLength(0);
    expect(game.board.length).toBe(1);
  });

  it('playStone fails when the stone is not in hand', () => {
    const game = new GameState(baseConfig);
    const result = game.playStone('missing');
    expect(result.ok).toBe(false);
  });

  it('playOperator fails and leaves hand untouched when board rejects it', () => {
    const game = new GameState(baseConfig);
    game.operatorHand = [createOperatorCard('ADD')];

    // No stone on the board yet, so the operator can't be placed.
    const result = game.playOperator(game.operatorHand[0].id);

    expect(result.ok).toBe(false);
    expect(game.operatorHand).toHaveLength(1);
  });

  it('submitChain scores the chain, resets the board, and advances the turn', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('s2', 4, 2)];
    game.operatorHand = [createOperatorCard('ADD')];

    game.playStone('s1');
    game.playOperator(game.operatorHand[0].id);
    game.playStone('s2');

    const result = game.submitChain();

    expect(result.ok).toBe(true);
    expect(result.scoreGained).toBe(9); // (3+4) + 2
    expect(game.score).toBe(9);
    expect(game.turn).toBe(2);
    expect(game.board.length).toBe(0);
  });

  it('submitChain rejects an incomplete chain without advancing the turn or score', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    game.operatorHand = [createOperatorCard('ADD')];

    game.playStone('s1');
    game.playOperator(game.operatorHand[0].id);
    // no closing stone placed -> chain dangles on an operator

    const result = game.submitChain();

    expect(result.ok).toBe(false);
    expect(game.score).toBe(0);
    expect(game.turn).toBe(1);
  });

  it('reaches WON status once score meets the target', () => {
    const game = new GameState({ ...baseConfig, targetScore: 5 });
    game.hand = [stone('s1', 3, 4)];

    game.playStone('s1');
    const result = game.submitChain();

    expect(result.scoreGained).toBe(7);
    expect(game.status).toBe('WON');
  });

  it('reaches LOST status after exceeding maxTurns without hitting the target', () => {
    const game = new GameState({ ...baseConfig, targetScore: 1000, maxTurns: 1 });
    game.hand = [stone('s1', 1, 1)];

    game.playStone('s1');
    game.submitChain(); // turn 1 -> 2, score 2, still below target

    expect(game.turn).toBe(2);
    expect(game.status).toBe('LOST');
  });

  it('ignores further plays once the game has ended', () => {
    const game = new GameState({ ...baseConfig, targetScore: 1, maxTurns: 5 });
    game.hand = [stone('s1', 3, 4)];
    game.playStone('s1');
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
    game.hand = [stone('s1', 3, 4), stone('bad', 9, 9), stone('s2', 4, 2)];
    game.operatorHand = [createOperatorCard('ADD')];
    const opId = game.operatorHand[0].id;

    game.playStone('s1');
    game.playOperator(opId);
    expect(game.playStone('bad').ok).toBe(false); // 9 does not match the exposed 4

    game.undoLastMove(); // take the operator back
    game.playOperator(opId);
    expect(game.playStone('s2').ok).toBe(true); // 4 matches, chain now valid

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
  });
});
