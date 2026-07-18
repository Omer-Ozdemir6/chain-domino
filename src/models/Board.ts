import type { DominoStone, TileModifier, HandType } from './types.js';

export type BoardError =
  | 'CHAIN_MUST_START_WITH_STONE'
  | 'EXPECTED_STONE'
  | 'STONE_MISMATCH'
  | 'SLOT_NOT_FOUND'
  | 'SLOT_NOT_OPEN';

export interface BoardActionResult {
  ok: boolean;
  error?: BoardError;
}

/** `${nodeId}#${slotIndex}`, or the reserved sentinel `'ROOT'` for the very first stone. */
export type SlotId = string;

export type SlotState = 'OPEN' | 'CLOSED';

export interface BoardSlot {
  slotId: SlotId;
  value: number;
  state: SlotState;
}

export interface GraphNode {
  nodeId: string;
  leftVal: number;
  rightVal: number;
  isDouble: boolean;
  frozen: boolean;
  isGolden?: boolean;
  modifier?: TileModifier;
  tags?: string[];
  leftUpgrade?: number;
  rightUpgrade?: number;
}

/** A single stone-to-stone domino connection — pure topology, no operator involved. */
export interface GraphEdge {
  edgeId: string;
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
  if (stone.rightVal === requiredValue) {
    return { ...stone, leftVal: stone.rightVal, rightVal: stone.leftVal, isGolden: stone.isGolden, leftUpgrade: stone.rightUpgrade, rightUpgrade: stone.leftUpgrade };
  }
  return null;
}

// Four cardinal directions a connection can grow in — the same geometry ChainBoard.tsx renders
// the board with. Only doubles (spinners) ever use more than two of them; a plain stone always
// attaches on one side and continues straight ahead. Exported so ChainBoard.tsx's layout uses
// this exact assignment instead of a separately-maintained copy that could drift out of sync
// with `detectHandType()`'s branching geometry.
export type Dir = 'E' | 'S' | 'W' | 'N';
export const OPPOSITE: Record<Dir, Dir> = { E: 'W', W: 'E', S: 'N', N: 'S' };
export const ALL_DIRS: Dir[] = ['E', 'S', 'W', 'N'];

/** Assigns each of a node's slots a direction: for the root, both ends of a plain stone point
 *  opposite ways (still one straight line), a root spinner gets all 4; for a child, slot 0 always
 *  faces back toward its parent (`attach`), a plain stone's other slot continues straight ahead
 *  (`incoming`), and a spinner's other 3 slots get the remaining directions. */
export function assignDirections(isDouble: boolean, incoming: Dir | null): Dir[] {
  if (incoming === null) return isDouble ? ALL_DIRS : ['E', 'W'];
  const attach = OPPOSITE[incoming];
  return isDouble ? [attach, ...ALL_DIRS.filter((d) => d !== attach)] : [attach, incoming];
}

/** "Kozmik Karadelik" mode: a slot's `value` is still "the number the next stone must present",
 *  but the match test is ascending-by-one instead of equality — classic pip-matching is void. */
function orientStoneSequence(stone: DominoStone, requiredValue: number): DominoStone | null {
  const next = requiredValue + 1;
  if (stone.leftVal === next) return stone;
  if (stone.rightVal === next) {
    return { ...stone, leftVal: stone.rightVal, rightVal: stone.leftVal, isGolden: stone.isGolden, leftUpgrade: stone.rightUpgrade, rightUpgrade: stone.leftUpgrade };
  }
  return null;
}

export type MatchMode = 'PIP' | 'SEQUENCE';

interface InternalNode {
  nodeId: string;
  leftVal: number;
  rightVal: number;
  isDouble: boolean;
  frozen: boolean;
  slots: BoardSlot[];
  isGolden?: boolean;
  modifier?: TileModifier;
  tags?: string[];
  leftUpgrade?: number;
  rightUpgrade?: number;
}

interface Move {
  childNodeId: string;
  parentNodeId: string | null;
  parentSlotIndex: number | null;
}

export interface BoardSnapshot {
  nodes: Array<[string, InternalNode]>;
  edges: GraphEdge[];
  rootNodeId: string | null;
  unfrozenMoves: Move[];
  matchMode: MatchMode;
  branchingEnabled: boolean;
}

/**
 * A branching domino board: stones are graph nodes connected directly by classic end-matching
 * (equal pip value on the touching sides) — no operator sits between them.
 */
export class Board {
  private nodes = new Map<string, InternalNode>();
  private edges: GraphEdge[] = [];
  private rootNodeId: string | null = null;
  /** Chronological log of moves since the last freeze(), for order-correct undo. */
  private unfrozenMoves: Move[] = [];
  /** 'PIP' (classic end-matching) by default; 'SEQUENCE' while a rule-bending charm like Kozmik
   *  Karadelik is owned. Set once per round by RunState.startRound(). */
  private matchMode: MatchMode = 'PIP';
  /** true normally — a double (spinner) opens up to 4 slots. false for the "Tek Zincir" challenge:
   *  doubles are treated exactly like plain stones (2 slots, straight pass-through), so the chain
   *  can never branch. Set once per round by RunState.startRound(). */
  private branchingEnabled = true;

  setMatchMode(mode: MatchMode): void {
    this.matchMode = mode;
  }

  setBranchingEnabled(enabled: boolean): void {
    this.branchingEnabled = enabled;
  }

  /** A plain-data dump of every private field, for localStorage persistence — `nodes` is a Map
   *  (not JSON-safe on its own), everything else here is already plain arrays/primitives. */
  toSnapshot(): BoardSnapshot {
    return {
      nodes: Array.from(this.nodes.entries()),
      edges: this.edges,
      rootNodeId: this.rootNodeId,
      unfrozenMoves: this.unfrozenMoves,
      matchMode: this.matchMode,
      branchingEnabled: this.branchingEnabled,
    };
  }

  static fromSnapshot(snap: BoardSnapshot): Board {
    const board = new Board();
    board.nodes = new Map(snap.nodes);
    board.edges = snap.edges;
    board.rootNodeId = snap.rootNodeId;
    board.unfrozenMoves = snap.unfrozenMoves;
    board.matchMode = snap.matchMode;
    board.branchingEnabled = snap.branchingEnabled;
    return board;
  }

  isBranchingEnabled(): boolean {
    return this.branchingEnabled;
  }

  private orient(stone: DominoStone, requiredValue: number): DominoStone | null {
    return this.matchMode === 'SEQUENCE' ? orientStoneSequence(stone, requiredValue) : orientStone(stone, requiredValue);
  }

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
      modifier: n.modifier,
      tags: n.tags,
      leftUpgrade: n.leftUpgrade,
      rightUpgrade: n.rightUpgrade,
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
    const branches = isDouble && this.branchingEnabled;
    const nodeId = stone.id;
    const slots: BoardSlot[] = branches
      ? Array.from({ length: 4 }, (_, i) => ({ slotId: `${nodeId}#${i}`, value: stone.leftVal, state: 'OPEN' as const }))
      : [
          { slotId: `${nodeId}#0`, value: stone.leftVal, state: 'OPEN' as const },
          { slotId: `${nodeId}#1`, value: stone.rightVal, state: 'OPEN' as const },
        ];
    return {
      nodeId,
      leftVal: stone.leftVal,
      rightVal: stone.rightVal,
      isDouble,
      frozen: false,
      slots,
      isGolden: stone.isGolden,
      modifier: stone.modifier,
      tags: stone.tags,
      leftUpgrade: stone.leftUpgrade,
      rightUpgrade: stone.rightUpgrade,
    };
  }

  /** `oriented.leftVal` is the attach (closed) side by convention; slot #0 is always that side. */
  private createChildNode(oriented: DominoStone): InternalNode {
    const isDouble = oriented.leftVal === oriented.rightVal;
    const branches = isDouble && this.branchingEnabled;
    const nodeId = oriented.id;
    const slots: BoardSlot[] = branches
      ? Array.from({ length: 4 }, (_, i) => ({
          slotId: `${nodeId}#${i}`,
          value: oriented.leftVal,
          state: (i === 0 ? 'CLOSED' : 'OPEN') as SlotState,
        }))
      : [
          { slotId: `${nodeId}#0`, value: oriented.leftVal, state: 'CLOSED' as const },
          { slotId: `${nodeId}#1`, value: oriented.rightVal, state: 'OPEN' as const },
        ];
    return {
      nodeId,
      leftVal: oriented.leftVal,
      rightVal: oriented.rightVal,
      isDouble,
      frozen: false,
      slots,
      isGolden: oriented.isGolden,
      modifier: oriented.modifier,
      tags: oriented.tags,
      leftUpgrade: oriented.leftUpgrade,
      rightUpgrade: oriented.rightUpgrade,
    };
  }

  /** Slots (possibly requiring a flip) this stone could legally close right now; `['ROOT']` on an empty board. */
  getLegalStoneTargets(stone: DominoStone): SlotId[] {
    if (this.rootNodeId === null) return ['ROOT'];
    const targets: SlotId[] = [];
    for (const node of this.nodes.values()) {
      node.slots.forEach((slot, i) => {
        if (slot.state === 'OPEN' && this.orient(stone, slot.value)) {
          targets.push(`${node.nodeId}#${i}`);
        }
      });
    }
    return targets;
  }

  canAddStoneAt(stone: DominoStone, slotId: SlotId): BoardActionResult {
    if (slotId === 'ROOT') {
      return this.rootNodeId === null ? { ok: true } : { ok: false, error: 'SLOT_NOT_FOUND' };
    }
    const found = this.findSlot(slotId);
    if (!found) return { ok: false, error: 'SLOT_NOT_FOUND' };
    if (found.slot.state !== 'OPEN') return { ok: false, error: 'SLOT_NOT_OPEN' };
    return this.orient(stone, found.slot.value) ? { ok: true } : { ok: false, error: 'STONE_MISMATCH' };
  }

  addStoneAt(stone: DominoStone, slotId: SlotId): BoardActionResult {
    const check = this.canAddStoneAt(stone, slotId);
    if (!check.ok) return check;

    if (slotId === 'ROOT') {
      const node = this.createRootNode(stone);
      this.nodes.set(node.nodeId, node);
      this.rootNodeId = node.nodeId;
      this.unfrozenMoves.push({ childNodeId: node.nodeId, parentNodeId: null, parentSlotIndex: null });
      return { ok: true };
    }

    const found = this.findSlot(slotId)!;
    const oriented = this.orient(stone, found.slot.value)!;
    const childNode = this.createChildNode(oriented);
    this.nodes.set(childNode.nodeId, childNode);

    this.edges.push({
      edgeId: childNode.nodeId,
      parentNodeId: found.node.nodeId,
      parentSlotId: slotId,
      parentBase: found.node.leftVal + found.node.rightVal,
      childNodeId: childNode.nodeId,
      childSlotId: `${childNode.nodeId}#0`,
      childExposedValue: childNode.rightVal,
      frozen: false,
    });

    found.slot.state = 'CLOSED';
    this.unfrozenMoves.push({
      childNodeId: childNode.nodeId,
      parentNodeId: found.node.nodeId,
      parentSlotIndex: found.index,
    });

    return { ok: true };
  }

  /** Removes and returns the most recently placed stone, if any. */
  removeLast(): DominoStone | undefined {
    const move = this.unfrozenMoves.pop();
    if (!move) return undefined;

    const childNode = this.nodes.get(move.childNodeId)!;
    const stoneData: DominoStone = {
      id: childNode.nodeId,
      leftVal: childNode.leftVal,
      rightVal: childNode.rightVal,
      isGolden: childNode.isGolden,
      modifier: childNode.modifier,
      tags: childNode.tags,
      leftUpgrade: childNode.leftUpgrade,
      rightUpgrade: childNode.rightUpgrade,
    };
    this.nodes.delete(move.childNodeId);

    if (move.parentNodeId === null) {
      this.rootNodeId = null;
    } else {
      const edgeIndex = this.edges.findIndex((e) => e.childNodeId === move.childNodeId);
      this.edges.splice(edgeIndex, 1);
      const parentNode = this.nodes.get(move.parentNodeId)!;
      const parentSlot = parentNode.slots[move.parentSlotIndex!];
      parentSlot.state = 'OPEN';
    }

    return stoneData;
  }

  /** Removes and returns every stone currently on the board, placed or not. */
  drainAll(): DominoStone[] {
    const drained: DominoStone[] = [];
    for (const node of this.nodes.values()) {
      drained.push({
        id: node.nodeId,
        leftVal: node.leftVal,
        rightVal: node.rightVal,
        isGolden: node.isGolden,
        modifier: node.modifier,
        tags: node.tags,
        leftUpgrade: node.leftUpgrade,
        rightUpgrade: node.rightUpgrade,
      });
    }
    this.nodes = new Map();
    this.edges = [];
    this.rootNodeId = null;
    this.unfrozenMoves = [];
    return drained;
  }

  /** [Magnet consumable] Removes a leaf node from the board, restoring its parent slot to OPEN. */
  removeNode(nodeId: string): DominoStone | null {
    // Check if it is a parent of any edge (i.e. not a leaf)
    const isParent = this.edges.some((e) => e.parentNodeId === nodeId);
    if (isParent) return null;

    const node = this.nodes.get(nodeId);
    if (!node) return null;

    const resultStone: DominoStone = {
      id: node.nodeId,
      leftVal: node.leftVal,
      rightVal: node.rightVal,
      isGolden: node.isGolden,
      modifier: node.modifier,
      tags: node.tags,
      leftUpgrade: node.leftUpgrade,
      rightUpgrade: node.rightUpgrade,
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
            parentNode.slots[slotIndex].state = 'OPEN';
          }
        }
      }
    }

    // Clean up move log if it was placed in the current turn
    this.unfrozenMoves = this.unfrozenMoves.filter((m) => m.childNodeId !== nodeId);

    return resultStone;
  }

  removeEdgeById(edgeId: string): boolean {
    const edgeIndex = this.edges.findIndex((e) => e.edgeId === edgeId);
    if (edgeIndex === -1) return false;
    const [edge] = this.edges.splice(edgeIndex, 1);
    
    // Open parent slot
    const parentNode = this.nodes.get(edge.parentNodeId);
    if (parentNode) {
      const slot = parentNode.slots.find((s) => s.slotId === edge.parentSlotId);
      if (slot) {
        slot.state = 'OPEN';
      }
    }
    
    // Open child slot
    const childNode = this.nodes.get(edge.childNodeId);
    if (childNode) {
      const slot = childNode.slots.find((s) => s.slotId === edge.childSlotId);
      if (slot) {
        slot.state = 'OPEN';
      }
    }

    // Clean move log relation
    this.unfrozenMoves = this.unfrozenMoves.filter((m) => m.childNodeId !== edge.childNodeId);
    return true;
  }

  reset(): void {
    this.nodes = new Map();
    this.edges = [];
    this.rootNodeId = null;
    this.unfrozenMoves = [];
  }

  applyAmberMagnet(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node || node.modifier !== 'AMBER') return;

    // Find parent node connection and align its exposed values to match child's leftVal (touching side)
    const edge = this.edges.find((e) => e.childNodeId === nodeId);
    if (edge) {
      const parentNode = this.nodes.get(edge.parentNodeId);
      if (parentNode && !parentNode.frozen) {
        parentNode.rightVal = node.leftVal;
        parentNode.leftVal = node.leftVal;
        parentNode.slots.forEach((s) => {
          if (s.state !== 'CLOSED') s.value = node.leftVal;
        });
        edge.parentBase = parentNode.leftVal + parentNode.rightVal;
      }
    }

    // Find any child nodes connected to this node and align their attaching sides
    this.edges.forEach((e) => {
      if (e.parentNodeId === nodeId) {
        const childNode = this.nodes.get(e.childNodeId);
        if (childNode && !childNode.frozen) {
          childNode.leftVal = node.rightVal;
          childNode.rightVal = node.rightVal;
          childNode.slots.forEach((s) => {
            if (s.state !== 'CLOSED') s.value = node.rightVal;
          });
          e.childExposedValue = childNode.rightVal;
        }
      }
    });
  }

  /** Marks everything currently on the board as permanently committed; undo/skip can no longer reach it. */
  freeze(): void {
    for (const node of this.nodes.values()) node.frozen = true;
    for (const edge of this.edges) edge.frozen = true;
    this.unfrozenMoves = [];
  }

  /** Removes and returns only the elements placed since the last freeze, leaving committed elements in place. */
  drainUnscored(): DominoStone[] {
    const drained: DominoStone[] = [];
    while (this.unfrozenMoves.length > 0) {
      const el = this.removeLast();
      if (el) drained.push(el);
    }
    return drained;
  }

  /**
   * Classifies the shape of the currently unfrozen chain — straight, branched, or loop.
   * Only considers unfrozen nodes/edges: a shape frozen in an earlier turn (already scored,
   * left on the board) must never influence this turn's classification.
   */
  detectHandType(): HandType {
    if (this.rootNodeId === null) return 'STRAIGHT';

    const unfrozenNodes = [...this.nodes.values()].filter((n) => !n.frozen);
    const unfrozenEdges = this.edges.filter((e) => !e.frozen);
    const rootNode = this.nodes.get(this.rootNodeId);
    if (!rootNode || rootNode.frozen) return 'STRAIGHT';

    // Loop check: If the root's first slot (slot #0, which attaches to nothing) value
    // matches the exposed value of any active leaf node, and chain size is >= 4
    if (unfrozenNodes.length >= 4) {
      const startSlot = rootNode.slots[0];
      if (startSlot && startSlot.state === 'OPEN') {
        const startVal = startSlot.value;
        // Check all leaves
        for (const node of unfrozenNodes) {
          if (node.nodeId === this.rootNodeId) continue;
          const childEdges = unfrozenEdges.filter((e) => e.parentNodeId === node.nodeId);
          if (childEdges.length === 0) {
            // Leaf node: check open slot value
            const openSlot = node.slots.find((s) => s.state === 'OPEN');
            if (openSlot && openSlot.value === startVal) {
              return 'LOOP';
            }
          }
        }
      }
    }

    // Branched check: walks the same E/S/W/N geometry the board renders with (see
    // `assignDirections` below) — a node only counts as a genuine fork if its children's
    // directions aren't just the two opposite ends of one line. A plain (non-double) root stone
    // growing from BOTH its ends, or a spinner's chain passing straight through one of its axes,
    // is still one straight line — raw "more than one child" alone can't tell those apart from
    // an actual turn, which was misclassifying dominoes like [1|6]-[6|4] with a third stone
    // attached back onto the root's other end as BRANCHED even though it renders as one straight row.
    const slotIndexOf = (slotId: SlotId): number => Number(slotId.slice(slotId.lastIndexOf('#') + 1));
    const walk = (nodeId: string, incoming: Dir | null): boolean => {
      const node = this.nodes.get(nodeId)!;
      const dirs = assignDirections(node.isDouble && this.branchingEnabled, incoming);
      const childEdges = unfrozenEdges.filter((e) => e.parentNodeId === nodeId);
      const childDirs = childEdges.map((e) => dirs[slotIndexOf(e.parentSlotId)]);
      const isForkHere = childDirs.length >= 2 && !(childDirs.length === 2 && OPPOSITE[childDirs[0]] === childDirs[1]);
      if (isForkHere) return true;
      return childEdges.some((e) => walk(e.childNodeId, dirs[slotIndexOf(e.parentSlotId)]));
    };
    if (walk(this.rootNodeId, null)) return 'BRANCHED';

    return 'STRAIGHT';
  }
}
