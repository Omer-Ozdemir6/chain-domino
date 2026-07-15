import { createOperatorCard } from '../models/OperatorDeck.js';
import type { GraphEdge } from '../models/Board.js';
import type { OperatorType } from '../models/types.js';

let edgeCounter = 0;

/** Builds a synthetic GraphEdge literal for evaluator/charm unit tests. */
export function E(parentBase: number, op: OperatorType, childExposedValue: number): GraphEdge {
  edgeCounter += 1;
  return {
    edgeId: `e${edgeCounter}`,
    operator: createOperatorCard(op),
    parentNodeId: 'p',
    parentSlotId: `p#0`,
    parentBase,
    childNodeId: `c${edgeCounter}`,
    childSlotId: `c${edgeCounter}#0`,
    childExposedValue,
    frozen: false,
  };
}
