import type { ChainElement, DominoStone, OperatorCard } from './types.js';

export type BoardError =
  | 'CHAIN_MUST_START_WITH_STONE'
  | 'EXPECTED_OPERATOR'
  | 'EXPECTED_STONE'
  | 'STONE_MISMATCH'
  | 'SLOT_NOT_FOUND'
  | 'SLOT_NOT_OPEN'
  | 'SLOT_NOT_PENDING';

export interface BoardActionResult {
  ok: boolean;
  error?: BoardError;
}

/** `${nodeId}#${slotIndex}`, or the reserved sentinel `'ROOT'` for the very first stone. */
export type SlotId = string;

export type SlotState = 'OPEN' | 'PENDING' | 'CLOSED';

export interface BoardSlot {
  slotId: SlotId;
  value: number;
  state: SlotState;
  pendingOperator?: OperatorCard;
}

export interface GraphNode {
  nodeId: string;
  leftVal: number;
  rightVal: number;
  isDouble: boolean;
  frozen: boolean;
  isGolden?: boolean;
}

export interface GraphEdge {
  edgeId: string;
  operator: OperatorCard;
  parentNodeId: string;
  parentSlotId: SlotId;
  parentBase: number;
  childNodeId: string;
  childSlotId: SlotId;
  childExposedValue: number;
  frozen: boolean;
}

/**
 * Returns `stone`, flipped if needed so its `leftVal` equals `requiredValue`, or null if
 * neither orientation fits. `leftVal` is always the side that attaches to its parent slot;
 * `rightVal` is the side left exposed for further branching (both equal for a double).
 */
function orientStone(stone: DominoStone, requiredValue: number): DominoStone | null {
  if (stone.leftVal === requiredValue) return stone;
  if (stone.rightVal === requiredValue) return { ...stone, leftVal: stone.rightVal, rightVal: stone.leftVal, isGolden: stone.isGolden };
  return null;
}

interface InternalNode {
  nodeId: string;
  leftVal: number;
  rightVal: number;
  isDouble: boolean;
  frozen: boolean;
  slots: BoardSlot[];
  isGolden?: boolean;
}

type Move =
  | { kind: 'OPERATOR'; nodeId: string; slotIndex: number }
  | { kind: 'STONE'; childNodeId: string; parentNodeId: string | null; parentSlotIndex: number | null };

/**
 * A branching domino board: stones are graph nodes connected by operator edges. A non-double
 * stone has 2 slots (one per pip side); a double stone (spinner) has 4, letting it branch in
 * up to 4 directions. Placing a stone auto-orients it (flips leftVal/rightVal) to fit if needed.
 */
export class Board {
  private nodes = new Map<string, InternalNode>();
  private edges: GraphEdge[] = [];
  private rootNodeId: string | null = null;
  /** Chronological log of moves since the last freeze(), for order-correct undo. */
  private unfrozenMoves: Move[] = [];

  get length(): number {
    return this.nodes.size + this.edges.length;
  }

  getRootNodeId(): string | null {
    return this.rootNodeId;
  }

  getNodes(): GraphNode[] {
    return [...this.nodes.values()].map((n) => ({
      nodeId: n.nodeId,
      leftVal: n.leftVal,
      rightVal: n.rightVal,
      isDouble: n.isDouble,
      frozen: n.frozen,
      isGolden: n.isGolden,
    }));
  }

  getEdges(): ReadonlyArray<GraphEdge> {
    return this.edges;
  }

  getUnfrozenEdges(): GraphEdge[] {
    return this.edges.filter((e) => !e.frozen);
  }

  getSlots(nodeId: string): ReadonlyArray<BoardSlot> {
    return this.nodes.get(nodeId)?.slots ?? [];
  }

  /** The edge whose parent side occupies this slot (i.e. the child reachable from it), if any. */
  getEdgeFromSlot(slotId: SlotId): GraphEdge | undefined {
    return this.edges.find((e) => e.parentSlotId === slotId);
  }

  private findSlot(slotId: SlotId): { node: InternalNode; slot: BoardSlot; index: number } | null {
    const hashIndex = slotId.lastIndexOf('#');
    if (hashIndex === -1) return null;
    const node = this.nodes.get(slotId.slice(0, hashIndex));
    if (!node) return null;
    const index = Number(slotId.slice(hashIndex + 1));
    const slot = node.slots[index];
    return slot ? { node, slot, index } : null;
  }

  private createRootNode(stone: DominoStone): InternalNode {
    const isDouble = stone.leftVal === stone.rightVal;
    const nodeId = stone.id;
    const slots: BoardSlot[] = isDouble
      ? Array.from({ length: 4 }, (_, i) => ({ slotId: `${nodeId}#${i}`, value: stone.leftVal, state: 'OPEN' as const }))
      : [
          { slotId: `${nodeId}#0`, value: stone.leftVal, state: 'OPEN' as const },
          { slotId: `${nodeId}#1`, value: stone.rightVal, state: 'OPEN' as const },
        ];
    return { nodeId, leftVal: stone.leftVal, rightVal: stone.rightVal, isDouble, frozen: false, slots, isGolden: stone.isGolden };
  }

  /** `oriented.leftVal` is the attach (closed) side by convention; slot #0 is always that side. */
  private createChildNode(oriented: DominoStone): InternalNode {
    const isDouble = oriented.leftVal === oriented.rightVal;
    const nodeId = oriented.id;
    const slots: BoardSlot[] = isDouble
      ? Array.from({ length: 4 }, (_, i) => ({
          slotId: `${nodeId}#${i}`,
          value: oriented.leftVal,
          state: (i === 0 ? 'CLOSED' : 'OPEN') as SlotState,
        }))
      : [
          { slotId: `${nodeId}#0`, value: oriented.leftVal, state: 'CLOSED' as const },
          { slotId: `${nodeId}#1`, value: oriented.rightVal, state: 'OPEN' as const },
        ];
    return { nodeId, leftVal: oriented.leftVal, rightVal: oriented.rightVal, isDouble, frozen: false, slots, isGolden: oriented.isGolden };
  }

  getOpenOperatorTargets(): SlotId[] {
    const targets: SlotId[] = [];
    for (const node of this.nodes.values()) {
      node.slots.forEach((slot, i) => {
        if (slot.state === 'OPEN') targets.push(`${node.nodeId}#${i}`);
      });
    }
    return targets;
  }

  /** Slots (possibly requiring a flip) this stone could legally close right now; `['ROOT']` on an empty board. */
  getLegalStoneTargets(stone: DominoStone): SlotId[] {
    if (this.rootNodeId === null) return ['ROOT'];
    const targets: SlotId[] = [];
    for (const node of this.nodes.values()) {
      node.slots.forEach((slot, i) => {
        if (slot.state === 'PENDING' && orientStone(stone, slot.value)) {
          targets.push(`${node.nodeId}#${i}`);
        }
      });
    }
    return targets;
  }

  canAddOperatorAt(slotId: SlotId): BoardActionResult {
    if (slotId === 'ROOT') {
      return this.rootNodeId === null
        ? { ok: false, error: 'CHAIN_MUST_START_WITH_STONE' }
        : { ok: false, error: 'SLOT_NOT_FOUND' };
    }
    const found = this.findSlot(slotId);
    if (!found) return { ok: false, error: 'SLOT_NOT_FOUND' };
    if (found.slot.state !== 'OPEN') return { ok: false, error: 'SLOT_NOT_OPEN' };
    return { ok: true };
  }

  addOperatorAt(operator: OperatorCard, slotId: SlotId): BoardActionResult {
    const check = this.canAddOperatorAt(slotId);
    if (!check.ok) return check;

    const found = this.findSlot(slotId)!;
    found.slot.state = 'PENDING';
    found.slot.pendingOperator = operator;
    this.unfrozenMoves.push({ kind: 'OPERATOR', nodeId: found.node.nodeId, slotIndex: found.index });
    return { ok: true };
  }

  canAddStoneAt(stone: DominoStone, slotId: SlotId): BoardActionResult {
    if (slotId === 'ROOT') {
      return this.rootNodeId === null ? { ok: true } : { ok: false, error: 'SLOT_NOT_FOUND' };
    }
    const found = this.findSlot(slotId);
    if (!found) return { ok: false, error: 'SLOT_NOT_FOUND' };
    if (found.slot.state !== 'PENDING') return { ok: false, error: 'SLOT_NOT_PENDING' };
    return orientStone(stone, found.slot.value) ? { ok: true } : { ok: false, error: 'STONE_MISMATCH' };
  }

  addStoneAt(stone: DominoStone, slotId: SlotId): BoardActionResult {
    const check = this.canAddStoneAt(stone, slotId);
    if (!check.ok) return check;

    if (slotId === 'ROOT') {
      const node = this.createRootNode(stone);
      this.nodes.set(node.nodeId, node);
      this.rootNodeId = node.nodeId;
      this.unfrozenMoves.push({ kind: 'STONE', childNodeId: node.nodeId, parentNodeId: null, parentSlotIndex: null });
      return { ok: true };
    }

    const found = this.findSlot(slotId)!;
    const operator = found.slot.pendingOperator!;
    const oriented = orientStone(stone, found.slot.value)!;
    const childNode = this.createChildNode(oriented);
    this.nodes.set(childNode.nodeId, childNode);

    this.edges.push({
      edgeId: childNode.nodeId,
      operator,
      parentNodeId: found.node.nodeId,
      parentSlotId: slotId,
      parentBase: found.node.leftVal + found.node.rightVal,
      childNodeId: childNode.nodeId,
      childSlotId: `${childNode.nodeId}#0`,
      childExposedValue: childNode.rightVal,
      frozen: false,
    });

    found.slot.state = 'CLOSED';
    found.slot.pendingOperator = undefined;
    this.unfrozenMoves.push({
      kind: 'STONE',
      childNodeId: childNode.nodeId,
      parentNodeId: found.node.nodeId,
      parentSlotIndex: found.index,
    });

    return { ok: true };
  }

  /** True when any slot anywhere in the graph holds an operator awaiting a closing stone. */
  hasPendingOperator(): boolean {
    for (const node of this.nodes.values()) {
      if (node.slots.some((s) => s.state === 'PENDING')) return true;
    }
    return false;
  }

  /** Removes and returns the most recently placed element (stone or operator), if any. */
  removeLast(): ChainElement | undefined {
    const move = this.unfrozenMoves.pop();
    if (!move) return undefined;

    if (move.kind === 'OPERATOR') {
      const node = this.nodes.get(move.nodeId)!;
      const slot = node.slots[move.slotIndex];
      const operator = slot.pendingOperator!;
      slot.state = 'OPEN';
      slot.pendingOperator = undefined;
      return { type: 'OPERATOR', data: operator };
    }

    const childNode = this.nodes.get(move.childNodeId)!;
    const stoneData: DominoStone = { id: childNode.nodeId, leftVal: childNode.leftVal, rightVal: childNode.rightVal };
    this.nodes.delete(move.childNodeId);

    if (move.parentNodeId === null) {
      this.rootNodeId = null;
    } else {
      const edgeIndex = this.edges.findIndex((e) => e.childNodeId === move.childNodeId);
      const [edge] = this.edges.splice(edgeIndex, 1);
      const parentNode = this.nodes.get(move.parentNodeId)!;
      const parentSlot = parentNode.slots[move.parentSlotIndex!];
      parentSlot.state = 'PENDING';
      parentSlot.pendingOperator = edge.operator;
    }

    return { type: 'STONE', data: stoneData };
  }

  /** Removes and returns every element currently on the board (stones and operators, placed or dangling). */
  drainAll(): ChainElement[] {
    const drained: ChainElement[] = [];
    for (const node of this.nodes.values()) {
      drained.push({ type: 'STONE', data: { id: node.nodeId, leftVal: node.leftVal, rightVal: node.rightVal } });
      for (const slot of node.slots) {
        if (slot.state === 'PENDING' && slot.pendingOperator) {
          drained.push({ type: 'OPERATOR', data: slot.pendingOperator });
        }
      }
    }
    for (const edge of this.edges) {
      drained.push({ type: 'OPERATOR', data: edge.operator });
    }
    this.nodes = new Map();
    this.edges = [];
    this.rootNodeId = null;
    this.unfrozenMoves = [];
    return drained;
  }

  /** [Breaker consumable] Removes a pending operator from a slot, making it OPEN again. */
  removeOperator(slotId: SlotId): OperatorCard | null {
    const found = this.findSlot(slotId);
    if (!found || found.slot.state !== 'PENDING') return null;
    const operator = found.slot.pendingOperator!;
    found.slot.state = 'OPEN';
    found.slot.pendingOperator = undefined;
    // Clean up move log if it was placed in the current turn
    this.unfrozenMoves = this.unfrozenMoves.filter(
      (m) => !(m.kind === 'OPERATOR' && m.nodeId === found.node.nodeId && m.slotIndex === found.index)
    );
    return operator;
  }

  /** [Magnet consumable] Removes a leaf node from the board, restoring its parent slot to PENDING. */
  removeNode(nodeId: string): DominoStone | null {
    // Check if it is a parent of any edge (i.e. not a leaf)
    const isParent = this.edges.some((e) => e.parentNodeId === nodeId);
    if (isParent) return null;

    const node = this.nodes.get(nodeId);
    if (!node) return null;

    const stone: DominoStone = { id: node.nodeId, leftVal: node.leftVal, rightVal: node.rightVal, isGolden: node.slots[0]?.value === 999 /* dummy to check, keep type check simple */ };
    // Fetch actual golden status if stored
    const goldenState = (node as any).isGolden;
    const resultStone: DominoStone & { isGolden?: boolean } = {
      id: node.nodeId,
      leftVal: node.leftVal,
      rightVal: node.rightVal,
      isGolden: goldenState,
    };

    this.nodes.delete(nodeId);

    if (this.rootNodeId === nodeId) {
      this.rootNodeId = null;
    } else {
      const edgeIndex = this.edges.findIndex((e) => e.childNodeId === nodeId);
      if (edgeIndex !== -1) {
        const [edge] = this.edges.splice(edgeIndex, 1);
        const parentNode = this.nodes.get(edge.parentNodeId);
        if (parentNode) {
          const slotIndex = parentNode.slots.findIndex((s) => s.slotId === edge.parentSlotId);
          if (slotIndex !== -1) {
            const slot = parentNode.slots[slotIndex];
            slot.state = 'PENDING';
            slot.pendingOperator = edge.operator;
          }
        }
      }
    }

    // Clean up move log if it was placed in the current turn
    this.unfrozenMoves = this.unfrozenMoves.filter(
      (m) => !(m.kind === 'STONE' && m.childNodeId === nodeId)
    );

    return resultStone;
  }

  reset(): void {
    this.nodes = new Map();
    this.edges = [];
    this.rootNodeId = null;
    this.unfrozenMoves = [];
  }

  /** Marks everything currently on the board as permanently committed; undo/skip can no longer reach it. */
  freeze(): void {
    for (const node of this.nodes.values()) node.frozen = true;
    for (const edge of this.edges) edge.frozen = true;
    this.unfrozenMoves = [];
  }

  /** Removes and returns only the elements placed since the last freeze, leaving committed elements in place. */
  drainUnscored(): ChainElement[] {
    const drained: ChainElement[] = [];
    while (this.unfrozenMoves.length > 0) {
      const el = this.removeLast();
      if (el) drained.push(el);
    }
    return drained;
  }
}
