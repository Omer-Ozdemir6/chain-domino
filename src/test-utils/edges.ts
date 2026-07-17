import type { DominoStone, TileModifier } from '../models/types.js';
import type { GraphEdge } from '../models/Board.js';

let counter = 0;

/** Builds a synthetic DominoStone for scoring/charm unit tests. */
export function S(leftVal: number, rightVal: number, modifier?: TileModifier): DominoStone {
  counter += 1;
  return { id: `s${counter}`, leftVal, rightVal, modifier };
}

/** Builds a synthetic GraphEdge literal (pure topology, no operator) for board/scoring unit tests. */
export function E(parentNodeId: string, parentBase: number, childNodeId: string, childExposedValue: number): GraphEdge {
  counter += 1;
  return {
    edgeId: `e${counter}`,
    parentNodeId,
    parentSlotId: `${parentNodeId}#0`,
    parentBase,
    childNodeId,
    childSlotId: `${childNodeId}#0`,
    childExposedValue,
    frozen: false,
  };
}
