import { describe, it, expect } from 'vitest';
import { Board } from './Board.js';
import type { DominoStone } from './types.js';

const stone = (id: string, l: number, r: number): DominoStone => ({ id, leftVal: l, rightVal: r });

describe('Board', () => {
  it('accepts the first stone unconditionally at ROOT', () => {
    const board = new Board();
    const result = board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    expect(result.ok).toBe(true);
    expect(board.length).toBe(1);
    expect(board.getRootNodeId()).toBe('s1');
  });

  it('connects a second stone directly onto a matching open end (classic domino matching, no operator)', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const slot = board.getSlots('s1').find((s) => s.value === 4)!;
    const result = board.addStoneAt(stone('s2', 4, 2), slot.slotId);
    expect(result.ok).toBe(true);
    expect(board.length).toBe(3); // 2 nodes + 1 edge
    expect(board.getEdges()).toHaveLength(1);
  });

  it('rejects a stone whose value does not match the open slot', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const fourSlot = board.getSlots('s1').find((s) => s.value === 4)!.slotId;
    const result = board.addStoneAt(stone('bad', 9, 9), fourSlot);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('STONE_MISMATCH');
  });

  it('rejects placing a stone at an already-closed slot', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const fourSlot = board.getSlots('s1').find((s) => s.value === 4)!.slotId;
    board.addStoneAt(stone('s2', 4, 2), fourSlot);
    const result = board.addStoneAt(stone('s3', 4, 1), fourSlot);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('SLOT_NOT_OPEN');
  });

  it('auto-orients a stone (flips leftVal/rightVal) to fit an open slot', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const fourSlot = board.getSlots('s1').find((s) => s.value === 4)!.slotId;
    // s2's matching value (4) is on the right, not the left — must be flipped to attach.
    const result = board.addStoneAt(stone('s2', 2, 4), fourSlot);
    expect(result.ok).toBe(true);
    const child = board.getNodes().find((n) => n.nodeId === 's2')!;
    expect(child.leftVal).toBe(4);
    expect(child.rightVal).toBe(2);
  });

  it('reset clears the board', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    board.reset();
    expect(board.length).toBe(0);
    expect(board.getRootNodeId()).toBeNull();
  });

  it('removeLast pops the most recently placed stone', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const slotId = board.getSlots('s1')[0].slotId;
    board.addStoneAt(stone('s2', board.getSlots('s1')[0].value, 2), slotId);

    const removed = board.removeLast();

    expect(removed).toBeDefined();
    expect(removed?.id).toBe('s2');
    expect(board.length).toBe(1);
  });

  it('removeLast returns undefined on an empty board', () => {
    const board = new Board();
    expect(board.removeLast()).toBeUndefined();
  });

  it('removeLast reopens the slot so a different stone can be placed there', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const slotId = board.getSlots('s1')[0].slotId;
    const value = board.getSlots('s1')[0].value;
    board.addStoneAt(stone('s2', value, 1), slotId);
    board.removeLast(); // undo s2
    const result = board.addStoneAt(stone('s3', value, 9), slotId);
    expect(result.ok).toBe(true);
  });

  it('drainAll empties the board and returns every stone', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const slotId = board.getSlots('s1')[0].slotId;
    board.addStoneAt(stone('s2', board.getSlots('s1')[0].value, 2), slotId);

    const drained = board.drainAll();

    expect(drained).toHaveLength(2); // s1, s2
    expect(board.length).toBe(0);
  });

  it('getLegalStoneTargets returns ROOT only on an empty board', () => {
    const board = new Board();
    expect(board.getLegalStoneTargets(stone('s1', 3, 4))).toEqual(['ROOT']);
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    expect(board.getLegalStoneTargets(stone('s2', 1, 1))).not.toContain('ROOT');
  });

  it('getLegalStoneTargets only matches slots whose exposed value equals one of the stone\'s sides', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT'); // exposes 3 and 4
    expect(board.getLegalStoneTargets(stone('s2', 4, 1))).toHaveLength(1);
    expect(board.getLegalStoneTargets(stone('s3', 9, 9))).toHaveLength(0);
  });

  it('addStoneAt rejects ROOT once the board is non-empty', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const result = board.addStoneAt(stone('s2', 1, 1), 'ROOT');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('SLOT_NOT_FOUND');
  });

  it('detectHandType is STRAIGHT for an unbranched chain and BRANCHED once a node has 2+ children', () => {
    const board = new Board();
    board.addStoneAt(stone('d1', 6, 6), 'ROOT');
    expect(board.detectHandType()).toBe('STRAIGHT');

    const [slotA, slotB] = board.getSlots('d1').map((s) => s.slotId);
    board.addStoneAt(stone('branchA', 6, 2), slotA);
    expect(board.detectHandType()).toBe('STRAIGHT');

    board.addStoneAt(stone('branchB', 6, 3), slotB);
    expect(board.detectHandType()).toBe('BRANCHED');
  });

  it('detectHandType ignores a frozen shape left over from an earlier turn — only the current unfrozen extension counts', () => {
    const board = new Board();
    board.addStoneAt(stone('d1', 6, 6), 'ROOT');
    const [slotA, slotB] = board.getSlots('d1').map((s) => s.slotId);
    board.addStoneAt(stone('branchA', 6, 2), slotA);
    board.addStoneAt(stone('branchB', 6, 1), slotB); // d1 branches into 2 children
    board.freeze(); // committed from a previous turn (this is the "old leftover stones" scenario)

    // This turn's actual placement: a single straight extension off branchA. Without filtering
    // by frozen state, d1's two frozen child-edges alone would still misreport BRANCHED.
    const branchASlot = board.getSlots('branchA').find((s) => s.state === 'OPEN')!.slotId;
    board.addStoneAt(stone('s1', 2, 5), branchASlot);

    expect(board.detectHandType()).toBe('STRAIGHT');
  });

  it('a plain (non-double) root stone growing from BOTH its ends is still STRAIGHT, not BRANCHED — matches a live-reported bug where [1|6]-[6|4]-[4|1] (a straight-looking row) was misclassified as branched', () => {
    const board = new Board();
    board.addStoneAt(stone('d1', 1, 6), 'ROOT'); // plain root: slot 0 -> E, slot 1 -> W (opposite, collinear)
    const [slot0, slot1] = board.getSlots('d1').map((s) => s.slotId);
    board.addStoneAt(stone('d2', 6, 4), slot0); // extends "east"
    expect(board.detectHandType()).toBe('STRAIGHT');

    board.addStoneAt(stone('d3', 4, 1), slot1); // extends "west" — root's OTHER end, not a real fork
    expect(board.detectHandType()).toBe('STRAIGHT');
  });

  it('a root spinner using two PERPENDICULAR ends (e.g. E and S) is a real fork; using two OPPOSITE ends (E and W) is not', () => {
    const board = new Board();
    board.addStoneAt(stone('d1', 6, 6), 'ROOT'); // double root: 4 slots -> E, S, W, N
    const slots = board.getSlots('d1').map((s) => s.slotId); // [E, S, W, N] in that order

    board.addStoneAt(stone('east', 6, 2), slots[0]); // E
    board.addStoneAt(stone('west', 6, 3), slots[2]); // W — opposite of E, still one straight line
    expect(board.detectHandType()).toBe('STRAIGHT');

    board.addStoneAt(stone('south', 6, 4), slots[1]); // S — perpendicular to the E/W line: real fork
    expect(board.detectHandType()).toBe('BRANCHED');
  });

  describe('branching at double stones', () => {
    it('a root double stone gets 4 OPEN slots; a root non-double gets 2', () => {
      const board = new Board();
      board.addStoneAt(stone('d1', 6, 6), 'ROOT');
      const doubleSlots = board.getSlots('d1');
      expect(doubleSlots).toHaveLength(4);
      expect(doubleSlots.every((s) => s.state === 'OPEN')).toBe(true);

      const board2 = new Board();
      board2.addStoneAt(stone('n1', 3, 4), 'ROOT');
      const plainSlots = board2.getSlots('n1');
      expect(plainSlots).toHaveLength(2);
      expect(plainSlots.every((s) => s.state === 'OPEN')).toBe(true);
    });

    it('attaching a double as a child gives it 4 slots (1 CLOSED, 3 OPEN); a non-double gives 2 (1 CLOSED, 1 OPEN)', () => {
      const board = new Board();
      board.addStoneAt(stone('root', 6, 6), 'ROOT');
      const slotA = board.getSlots('root')[0].slotId;
      board.addStoneAt(stone('child-double', 6, 6), slotA);

      const childSlots = board.getSlots('child-double');
      expect(childSlots).toHaveLength(4);
      expect(childSlots.filter((s) => s.state === 'CLOSED')).toHaveLength(1);
      expect(childSlots.filter((s) => s.state === 'OPEN')).toHaveLength(3);

      const slotB = board.getSlots('root')[1].slotId;
      board.addStoneAt(stone('child-plain', 6, 1), slotB);

      const plainChildSlots = board.getSlots('child-plain');
      expect(plainChildSlots).toHaveLength(2);
      expect(plainChildSlots.filter((s) => s.state === 'CLOSED')).toHaveLength(1);
      expect(plainChildSlots.filter((s) => s.state === 'OPEN')).toHaveLength(1);
    });

    it('all 4 slots of a double can independently receive a stone, then none remain open', () => {
      const board = new Board();
      board.addStoneAt(stone('d1', 5, 5), 'ROOT');
      const slots = board.getSlots('d1').map((s) => s.slotId);
      expect(slots).toHaveLength(4);

      slots.forEach((slotId, i) => {
        board.addStoneAt(stone(`child${i}`, 5, i), slotId);
      });

      expect(board.getSlots('d1').filter((s) => s.state === 'OPEN')).toHaveLength(0);
      expect(board.getEdges()).toHaveLength(4);
    });

    it('a non-double stone is capped at 2 total connections', () => {
      const board = new Board();
      board.addStoneAt(stone('n1', 3, 4), 'ROOT');
      const [slotA, slotB] = board.getSlots('n1').map((s) => s.slotId);

      board.addStoneAt(stone('c1', 3, 1), slotA);
      board.addStoneAt(stone('c2', 4, 2), slotB);

      expect(board.getSlots('n1').filter((s) => s.state === 'OPEN')).toHaveLength(0);
    });

    it('two independent branches off the same double do not interfere with each other', () => {
      const board = new Board();
      board.addStoneAt(stone('d1', 6, 6), 'ROOT');
      const [slotA, slotB] = board.getSlots('d1').map((s) => s.slotId);

      board.addStoneAt(stone('branchA', 6, 2), slotA);
      board.addStoneAt(stone('branchB', 6, 3), slotB);

      // undoing the most recent move only removes branchB, branchA stays intact
      board.removeLast();
      expect(board.getNodes().find((n) => n.nodeId === 'branchA')).toBeDefined();
      expect(board.getNodes().find((n) => n.nodeId === 'branchB')).toBeUndefined();
    });
  });

  describe('freeze and drainUnscored', () => {
    it('getUnfrozenEdges only returns edges since the last freeze', () => {
      const board = new Board();
      board.addStoneAt(stone('s1', 1, 2), 'ROOT');
      const slotId = board.getSlots('s1')[0].slotId;
      board.addStoneAt(stone('s2', board.getSlots('s1')[0].value, 1), slotId);
      expect(board.getUnfrozenEdges()).toHaveLength(1);

      board.freeze();
      expect(board.getUnfrozenEdges()).toHaveLength(0);
      expect(board.getEdges()).toHaveLength(1);
    });

    it('removeLast can no longer reach elements placed before the last freeze', () => {
      const board = new Board();
      board.addStoneAt(stone('s1', 1, 2), 'ROOT');
      board.freeze();

      expect(board.removeLast()).toBeUndefined();
      expect(board.length).toBe(1);
    });

    it('drainUnscored removes only a new branch added to an already-frozen double, leaving the frozen part intact', () => {
      const board = new Board();
      board.addStoneAt(stone('d1', 6, 6), 'ROOT');
      const [slotA, slotB, slotC] = board.getSlots('d1').map((s) => s.slotId);

      board.addStoneAt(stone('branchA', 6, 2), slotA);
      board.addStoneAt(stone('branchB', 6, 1), slotB);
      board.freeze(); // d1, branchA, branchB all committed

      board.addStoneAt(stone('branchC', 6, 3), slotC);

      const drained = board.drainUnscored();

      expect(drained).toHaveLength(1); // just branchC
      expect(board.getNodes().find((n) => n.nodeId === 'branchA')).toBeDefined();
      expect(board.getNodes().find((n) => n.nodeId === 'branchB')).toBeDefined();
      expect(board.getNodes().find((n) => n.nodeId === 'branchC')).toBeUndefined();
    });

    it('drainUnscored falls back to draining everything when nothing has ever been frozen', () => {
      const board = new Board();
      board.addStoneAt(stone('s1', 1, 2), 'ROOT');
      const slotId = board.getSlots('s1')[0].slotId;
      board.addStoneAt(stone('s2', board.getSlots('s1')[0].value, 1), slotId);

      const drained = board.drainUnscored();

      expect(drained).toHaveLength(2);
      expect(board.length).toBe(0);
    });
  });

  describe('SEQUENCE match mode (Kozmik Karadelik)', () => {
    it('defaults to PIP matching — a sequential-but-not-equal stone is illegal', () => {
      const board = new Board();
      board.addStoneAt(stone('s1', 3, 4), 'ROOT');
      const fourSlot = board.getSlots('s1').find((s) => s.value === 4)!.slotId;
      const result = board.addStoneAt(stone('s2', 5, 9), fourSlot);
      expect(result.ok).toBe(false);
    });

    it('once set to SEQUENCE, a stone matches by ascending-by-one instead of equality', () => {
      const board = new Board();
      board.setMatchMode('SEQUENCE');
      board.addStoneAt(stone('s1', 3, 4), 'ROOT');
      const fourSlot = board.getSlots('s1').find((s) => s.value === 4)!.slotId;

      // A pip-matching [4|x] stone is now ILLEGAL — the rule is fully replaced, not additive.
      expect(board.addStoneAt(stone('bad', 4, 4), fourSlot).ok).toBe(false);

      // A [5|x] stone (4 -> 5, ascending by one) is legal.
      const result = board.addStoneAt(stone('s2', 5, 9), fourSlot);
      expect(result.ok).toBe(true);
      expect(board.length).toBe(3);
    });

    it('getLegalStoneTargets reflects SEQUENCE mode too, not just addStoneAt', () => {
      const board = new Board();
      board.setMatchMode('SEQUENCE');
      board.addStoneAt(stone('s1', 3, 4), 'ROOT');
      // Root has two open slots: value 3 (needs a 4 next) and value 4 (needs a 5 next).
      expect(board.getLegalStoneTargets(stone('cand', 5, 1))).toHaveLength(1); // matches the "4" slot
      expect(board.getLegalStoneTargets(stone('cand2', 9, 9))).toHaveLength(0); // matches neither
    });
  });
});
