import { describe, it, expect } from 'vitest';
import { Board } from './Board.js';
import { createOperatorCard } from './OperatorDeck.js';
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

  it('rejects a second stone placed without an operator in between', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const slot = board.getSlots('s1')[0];
    const result = board.addStoneAt(stone('s2', 4, 2), slot.slotId);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('SLOT_NOT_PENDING');
  });

  it('rejects an operator before any stone is placed', () => {
    const board = new Board();
    const result = board.addOperatorAt(createOperatorCard('ADD'), 'ROOT');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('CHAIN_MUST_START_WITH_STONE');
  });

  it('rejects two consecutive operators on the same slot', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const slotId = board.getSlots('s1')[0].slotId;
    board.addOperatorAt(createOperatorCard('ADD'), slotId);
    const result = board.addOperatorAt(createOperatorCard('SUBTRACT'), slotId);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('SLOT_NOT_OPEN');
  });

  it('rejects a stone whose value does not match the pending slot', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const fourSlot = board.getSlots('s1').find((s) => s.value === 4)!.slotId;
    board.addOperatorAt(createOperatorCard('ADD'), fourSlot);
    const result = board.addStoneAt(stone('bad', 9, 9), fourSlot);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('STONE_MISMATCH');
  });

  it('builds a valid chain: stone -> operator -> stone', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const fourSlot = board.getSlots('s1').find((s) => s.value === 4)!.slotId;
    board.addOperatorAt(createOperatorCard('ADD'), fourSlot);
    const result = board.addStoneAt(stone('s2', 4, 2), fourSlot);
    expect(result.ok).toBe(true);
    expect(board.length).toBe(3); // 2 nodes + 1 edge
    expect(board.getEdges()).toHaveLength(1);
  });

  it('reset clears the board', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    board.reset();
    expect(board.length).toBe(0);
    expect(board.getRootNodeId()).toBeNull();
  });

  it('removeLast pops the most recently placed element', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const slotId = board.getSlots('s1')[0].slotId;
    board.addOperatorAt(createOperatorCard('ADD'), slotId);

    const removed = board.removeLast();

    expect(removed?.type).toBe('OPERATOR');
    expect(board.length).toBe(1);
  });

  it('removeLast returns undefined on an empty board', () => {
    const board = new Board();
    expect(board.removeLast()).toBeUndefined();
  });

  it('removeLast lets a different operator be placed after undoing the first', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const slotId = board.getSlots('s1')[0].slotId;
    board.addOperatorAt(createOperatorCard('ADD'), slotId);
    board.removeLast(); // undo the operator
    const result = board.addOperatorAt(createOperatorCard('MULTIPLY'), slotId);
    expect(result.ok).toBe(true);
  });

  it('drainAll empties the board and returns every stone and operator', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const slotId = board.getSlots('s1')[0].slotId;
    board.addOperatorAt(createOperatorCard('ADD'), slotId);
    board.addStoneAt(stone('s2', board.getSlots('s1')[0].value, 2), slotId);

    const drained = board.drainAll();

    expect(drained).toHaveLength(3); // s1, ADD op, s2
    expect(board.length).toBe(0);
  });

  it('getLegalStoneTargets returns ROOT only on an empty board', () => {
    const board = new Board();
    expect(board.getLegalStoneTargets(stone('s1', 3, 4))).toEqual(['ROOT']);
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    expect(board.getLegalStoneTargets(stone('s2', 1, 1))).not.toContain('ROOT');
  });

  it('addStoneAt rejects ROOT once the board is non-empty', () => {
    const board = new Board();
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    const result = board.addStoneAt(stone('s2', 1, 1), 'ROOT');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('SLOT_NOT_FOUND');
  });

  it('hasPendingOperator is true only while an operator awaits a closing stone', () => {
    const board = new Board();
    expect(board.hasPendingOperator()).toBe(false);
    board.addStoneAt(stone('s1', 3, 4), 'ROOT');
    expect(board.hasPendingOperator()).toBe(false);
    const slotId = board.getSlots('s1')[0].slotId;
    board.addOperatorAt(createOperatorCard('ADD'), slotId);
    expect(board.hasPendingOperator()).toBe(true);
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
      board.addOperatorAt(createOperatorCard('ADD'), slotA);
      board.addStoneAt(stone('child-double', 6, 6), slotA);

      const childSlots = board.getSlots('child-double');
      expect(childSlots).toHaveLength(4);
      expect(childSlots.filter((s) => s.state === 'CLOSED')).toHaveLength(1);
      expect(childSlots.filter((s) => s.state === 'OPEN')).toHaveLength(3);

      const slotB = board.getSlots('root')[1].slotId;
      board.addOperatorAt(createOperatorCard('SUBTRACT'), slotB);
      board.addStoneAt(stone('child-plain', 6, 1), slotB);

      const plainChildSlots = board.getSlots('child-plain');
      expect(plainChildSlots).toHaveLength(2);
      expect(plainChildSlots.filter((s) => s.state === 'CLOSED')).toHaveLength(1);
      expect(plainChildSlots.filter((s) => s.state === 'OPEN')).toHaveLength(1);
    });

    it('all 4 slots of a double can independently receive an operator + stone, then none remain open', () => {
      const board = new Board();
      board.addStoneAt(stone('d1', 5, 5), 'ROOT');
      const slots = board.getSlots('d1').map((s) => s.slotId);
      expect(slots).toHaveLength(4);

      slots.forEach((slotId, i) => {
        board.addOperatorAt(createOperatorCard('ADD'), slotId);
        board.addStoneAt(stone(`child${i}`, 5, i), slotId);
      });

      expect(board.getOpenOperatorTargets().filter((s) => s.startsWith('d1#'))).toHaveLength(0);
      expect(board.getEdges()).toHaveLength(4);
    });

    it('a non-double stone is capped at 2 total connections', () => {
      const board = new Board();
      board.addStoneAt(stone('n1', 3, 4), 'ROOT');
      const [slotA, slotB] = board.getSlots('n1').map((s) => s.slotId);

      board.addOperatorAt(createOperatorCard('ADD'), slotA);
      board.addStoneAt(stone('c1', 3, 1), slotA);
      board.addOperatorAt(createOperatorCard('SUBTRACT'), slotB);
      board.addStoneAt(stone('c2', 4, 2), slotB);

      expect(board.getOpenOperatorTargets().filter((s) => s.startsWith('n1#'))).toHaveLength(0);
    });

    it('two independent branches off the same double do not interfere with each other', () => {
      const board = new Board();
      board.addStoneAt(stone('d1', 6, 6), 'ROOT');
      const [slotA, slotB] = board.getSlots('d1').map((s) => s.slotId);

      board.addOperatorAt(createOperatorCard('ADD'), slotA);
      board.addStoneAt(stone('branchA', 6, 2), slotA);
      board.addOperatorAt(createOperatorCard('MULTIPLY'), slotB);
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
      board.addOperatorAt(createOperatorCard('ADD'), slotId);
      board.addStoneAt(stone('s2', 2, 1), slotId);
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

      board.addOperatorAt(createOperatorCard('ADD'), slotA);
      board.addStoneAt(stone('branchA', 6, 2), slotA);
      board.addOperatorAt(createOperatorCard('SUBTRACT'), slotB);
      board.addStoneAt(stone('branchB', 6, 1), slotB);
      board.freeze(); // d1, branchA, branchB all committed

      board.addOperatorAt(createOperatorCard('MULTIPLY'), slotC);
      board.addStoneAt(stone('branchC', 6, 3), slotC);

      const drained = board.drainUnscored();

      expect(drained).toHaveLength(2); // just the MULTIPLY op + branchC
      expect(board.getNodes().find((n) => n.nodeId === 'branchA')).toBeDefined();
      expect(board.getNodes().find((n) => n.nodeId === 'branchB')).toBeDefined();
      expect(board.getNodes().find((n) => n.nodeId === 'branchC')).toBeUndefined();
    });

    it('drainUnscored falls back to draining everything when nothing has ever been frozen', () => {
      const board = new Board();
      board.addStoneAt(stone('s1', 1, 2), 'ROOT');
      const slotId = board.getSlots('s1')[0].slotId;
      board.addOperatorAt(createOperatorCard('ADD'), slotId);

      const drained = board.drainUnscored();

      expect(drained).toHaveLength(2);
      expect(board.length).toBe(0);
    });
  });
});
