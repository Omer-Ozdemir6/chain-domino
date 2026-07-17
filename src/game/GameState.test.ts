import { describe, it, expect } from 'vitest';
import { GameState } from './GameState.js';
import type { DominoStone } from '../models/types.js';

const stone = (id: string, l: number, r: number): DominoStone => ({ id, leftVal: l, rightVal: r });

const baseConfig = { targetScore: 100, maxTurns: 5, stonesPerTurn: 3 };

describe('GameState', () => {
  it('drawForTurn fills the stone hand up to stonesPerTurn', () => {
    const game = new GameState(baseConfig);
    const initialStoneDeck = game.stoneDeck.remaining;

    game.drawForTurn();

    expect(game.hand).toHaveLength(3);
    expect(game.stoneDeck.remaining).toBe(initialStoneDeck - 3);
  });

  it('drawForTurn tops the stone hand up to its cap instead of adding stonesPerTurn every call', () => {
    const game = new GameState(baseConfig);
    game.drawForTurn();
    expect(game.hand).toHaveLength(3);

    // Play one stone away, leaving 2 in hand — the next draw should only top up by 1, not add 3 more.
    const playedId = game.hand[0].id;
    game.playStone(playedId);
    expect(game.hand).toHaveLength(2);

    game.drawForTurn();
    expect(game.hand).toHaveLength(3);

    // A full hand should draw nothing at all.
    const deckBefore = game.stoneDeck.remaining;
    game.drawForTurn();
    expect(game.hand).toHaveLength(3);
    expect(game.stoneDeck.remaining).toBe(deckBefore);
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

  it('playStone connects a second stone directly onto a matching open end (no operator involved)', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('s2', 4, 2)];

    game.playStone('s1');
    const result = game.playStone('s2');

    expect(result.ok).toBe(true);
    expect(game.board.length).toBe(3); // 2 nodes + 1 edge
  });

  it('playStone fails when the stone does not match any open slot', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('bad', 9, 9)];
    game.playStone('s1');

    const result = game.playStone('bad');
    expect(result.ok).toBe(false);
  });

  it('submitChain sums the natural pip total of every placed stone, root included', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('s2', 4, 2)];

    game.playStone('s1');
    game.playStone('s2');

    const result = game.submitChain();

    expect(result.ok).toBe(true);
    expect(result.scoreGained).toBe(3 + 4 + 4 + 2); // 13, matching the design's own worked example
    expect(game.score).toBe(13);
    expect(game.turn).toBe(2);
    expect(game.board.length).toBe(3); // 2 nodes + 1 edge, stays on the board
  });

  it('a lone root stone still counts its own pip value', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    game.playStone('s1');

    const result = game.submitChain();

    expect(result.ok).toBe(true);
    expect(result.scoreGained).toBe(7); // 3 + 4, no "root doesn't count" exemption
    expect(game.score).toBe(7);
  });

  it('a later submit only scores newly-added stones, never re-scoring frozen ones', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('s2', 4, 2)];

    game.playStone('s1');
    game.playStone('s2');
    const first = game.submitChain(); // 3+4+4+2 = 13

    // s1 still has one open slot left (its 3 side); branch off it again.
    const s1Slot = game.board.getSlots('s1').find((s) => s.state === 'OPEN')!.slotId;
    game.hand = [stone('s3', 3, 5)];
    game.playStone('s3', s1Slot);

    const second = game.submitChain();

    expect(first.scoreGained).toBe(13);
    expect(second.ok).toBe(true);
    expect(second.scoreGained).toBe(3 + 5); // only the new stone, not 13+8
    expect(game.score).toBe(13 + 8);
    expect(game.board.length).toBe(5); // 3 nodes + 2 edges
  });

  it("skipTurn only discards this turn's unscored growth, leaving the frozen graph on the board", () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('s2', 4, 2)];
    game.playStone('s1');
    game.playStone('s2');
    game.submitChain(); // freezes s1/s2/edge, score 13

    const s1Slot = game.board.getSlots('s1').find((s) => s.state === 'OPEN')!.slotId;
    game.hand = [stone('s3', 3, 1)];
    game.playStone('s3', s1Slot); // not yet submitted

    game.skipTurn();

    expect(game.score).toBe(13); // unchanged, nothing new was scored
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

  it('reaches WON status once score meets the target', () => {
    const game = new GameState({ ...baseConfig, targetScore: 5 });
    game.hand = [stone('s1', 3, 4), stone('s2', 4, 2)];

    game.playStone('s1');
    game.playStone('s2');
    const result = game.submitChain();

    expect(result.scoreGained).toBe(13);
    expect(game.status).toBe('WON');
  });

  it('reaches LOST status after exceeding maxTurns without hitting the target', () => {
    const game = new GameState({ ...baseConfig, targetScore: 1000, maxTurns: 1 });
    game.hand = [stone('s1', 1, 1)];

    game.playStone('s1');
    game.submitChain(); // turn 1 -> 2, still below target

    expect(game.turn).toBe(2);
    expect(game.status).toBe('LOST');
    expect(game.lossReason).toBe('MAX_TURNS');
  });

  it('ignores further plays once the game has ended', () => {
    const game = new GameState({ ...baseConfig, targetScore: 1, maxTurns: 5 });
    game.hand = [stone('s1', 3, 4), stone('s2', 4, 2)];
    game.playStone('s1');
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

  it('undoLastMove fails when the board is empty', () => {
    const game = new GameState(baseConfig);
    const result = game.undoLastMove();
    expect(result.ok).toBe(false);
  });

  it('lets a player recover from a mismatched attempt via undo then retry', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4), stone('bad', 9, 9), stone('s2', 4, 2)];

    game.playStone('s1');
    expect(game.playStone('bad').ok).toBe(false); // 9 doesn't match either open slot (3 or 4)
    expect(game.playStone('s2').ok).toBe(true); // 4 matches

    const result = game.submitChain();
    expect(result.ok).toBe(true);
    expect(result.scoreGained).toBe(13);
  });

  it('skipTurn discards the hand and board back to the deck and advances the turn without scoring', () => {
    const game = new GameState(baseConfig);
    const totalStones = game.stoneDeck.remaining;

    game.drawForTurn(); // pulls real stones out of the deck
    game.playStone(game.hand[0].id);
    // remaining hand entries stay unplayed

    game.skipTurn();

    expect(game.score).toBe(0);
    expect(game.turn).toBe(2);
    expect(game.board.length).toBe(0);
    expect(game.hand).toHaveLength(0);
    expect(game.stoneDeck.remaining).toBe(totalStones);
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

  it('hasAnyLegalMove is false when nothing in hand fits any open slot', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('s1', 3, 4)];
    game.playStone('s1');
    game.hand = [stone('bad', 9, 9)];
    expect(game.hasAnyLegalMove()).toBe(false);
  });

  it('a double stone can branch into 4 independent connections', () => {
    const game = new GameState(baseConfig);
    game.hand = [stone('d1', 6, 6)];
    game.playStone('d1');

    const slots = game.board.getSlots('d1').map((s) => s.slotId);
    expect(slots).toHaveLength(4);

    game.hand = [stone('c0', 6, 1), stone('c1', 6, 2), stone('c2', 6, 3), stone('c3', 6, 4)];

    slots.forEach((slotId) => {
      game.playStone(game.hand[0].id, slotId);
    });

    expect(game.board.getEdges()).toHaveLength(4);
    const result = game.submitChain();
    expect(result.ok).toBe(true);
    // root(6+6=12) + c0(6+1=7) + c1(6+2=8) + c2(6+3=9) + c3(6+4=10) = 46, plus the +5
    // hand-emptied bonus (all 4 drawn stones were played this turn, emptying the hand).
    expect(result.scoreGained).toBe(12 + 7 + 8 + 9 + 10 + 5);
    expect(result.handEmptiedBonus).toBe(5);
  });

  it('resolves the round immediately (WON/LOST) once the stone deck is fully spent and no move is possible', () => {
    const game = new GameState({ ...baseConfig, targetScore: 5 });
    game.hand = [stone('s1', 3, 4)];
    game.playStone('s1'); // occupies ROOT, exposing 3 and 4
    game.score = 10; // already past the target

    game.stoneDeck.draw(game.stoneDeck.remaining); // fully exhaust the deck
    game.hand = [stone('s2', 1, 2)]; // matches neither exposed value

    expect(game.status).toBe('PLAYING');
    game.drawForTurn();

    expect(game.status).toBe('WON');
  });

  it('resolves as LOST (not an endless grind) when the stone deck is spent below target', () => {
    const game = new GameState({ ...baseConfig, targetScore: 500 });
    game.hand = [stone('s1', 3, 4)];
    game.playStone('s1');
    game.score = 10; // well below target, unreachable now that nothing more can be drawn or placed

    game.stoneDeck.draw(game.stoneDeck.remaining);
    game.hand = [stone('s2', 1, 2)];

    game.drawForTurn();

    expect(game.status).toBe('LOST');
    expect(game.lossReason).toBe('NO_MOVES');
  });
});
