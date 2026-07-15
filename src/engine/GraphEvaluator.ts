import type { GraphEdge } from '../models/Board.js';
import type { OperatorType } from '../models/types.js';

export interface GraphEvaluationResult {
  ok: boolean;
  error?: string;
  totalGain: number;
  steps: string[];
}

/**
 * Scores a branching board by summing each stone-operator-stone edge as its own independent
 * mini-formula (parentBase OP childExposedValue), rather than one long running chain. An edge's
 * value never changes once placed, so callers only ever need to pass the newly-added edges.
 */
export class GraphEvaluator {
  /** Hook for charms that modify an edge's value as it resolves; returns the (possibly changed) value. */
  public onOperatorResolve?: (
    operator: OperatorType,
    parentBase: number,
    childExposed: number,
    edgeValue: number
  ) => number;

  /** Hook for charms that manipulate this batch's total gain; returns the (possibly changed) total. */
  public onEvaluationEnd?: (totalGain: number) => number;

  public scoreEdges(edges: ReadonlyArray<GraphEdge>): GraphEvaluationResult {
    const steps: string[] = [];
    let totalGain = 0;

    for (const edge of edges) {
      const { parentBase, childExposedValue } = edge;
      let edgeValue: number;

      switch (edge.operator.type) {
        case 'ADD':
          edgeValue = parentBase + childExposedValue;
          break;
        case 'SUBTRACT':
          edgeValue = parentBase - childExposedValue;
          break;
        case 'MULTIPLY':
          edgeValue = parentBase * childExposedValue;
          break;
        case 'DIVIDE':
          if (childExposedValue === 0) {
            return { ok: false, totalGain: 0, steps, error: 'Sıfıra bölme hatası!' };
          }
          edgeValue = Math.round(parentBase / childExposedValue);
          break;
      }

      if (this.onOperatorResolve) {
        edgeValue = this.onOperatorResolve(edge.operator.type, parentBase, childExposedValue, edgeValue);
      }
      steps.push(`${parentBase} ${edge.operator.symbol} ${childExposedValue} = ${edgeValue}`);
      totalGain += edgeValue;
    }

    if (this.onEvaluationEnd) {
      totalGain = this.onEvaluationEnd(totalGain);
      steps.push(`Tılsım Manipülasyonu Sonrası Kazanç: ${totalGain}`);
    }

    return { ok: true, totalGain, steps };
  }
}
