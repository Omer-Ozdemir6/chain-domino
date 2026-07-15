import type { ChainElement, OperatorType } from '../models/types.js';

export interface EvaluationResult {
  finalValue: number;
  steps: string[];
  error?: string;
}

/**
 * Resolves a chain left-to-right (not standard operator precedence) so the
 * running total stays intuitive to follow as stones are placed one by one.
 */
export class ChainEvaluator {
  /** Hook for charms that react to each operator resolving (e.g. Fractured Divider). */
  public onOperatorResolve?: (
    operator: OperatorType,
    left: number,
    right: number,
    currentResult: number
  ) => void;

  /** Hook for charms that manipulate the final result (e.g. The Paradox, Prime Absolute). */
  public onEvaluationEnd?: (finalResult: number) => number;

  public evaluate(chain: ReadonlyArray<ChainElement>): EvaluationResult {
    if (chain.length === 0) {
      return { finalValue: 0, steps: ['Zincir boş.'] };
    }

    const steps: string[] = [];

    if (chain[0].type !== 'STONE') {
      return { finalValue: 0, steps, error: 'Zincir bir taş ile başlamalıdır!' };
    }

    let currentStone = chain[0].data;
    let accumulator = currentStone.leftVal + currentStone.rightVal;
    steps.push(`Başlangıç Taşı [${currentStone.leftVal}|${currentStone.rightVal}] -> Taban: ${accumulator}`);

    let activeOperator: OperatorType | null = null;

    for (let i = 1; i < chain.length; i++) {
      const element = chain[i];

      if (element.type === 'OPERATOR') {
        if (activeOperator !== null) {
          return { finalValue: 0, steps, error: 'Üst üste iki operatör yerleştirilemez!' };
        }
        activeOperator = element.data.type;
        steps.push(`Operatör Hazırlandı: ${element.data.symbol}`);
      } else {
        if (activeOperator === null) {
          return { finalValue: 0, steps, error: 'Taşlar arasına operatör kartı koyulmalıdır!' };
        }

        const nextStone = element.data;

        if (currentStone.rightVal !== nextStone.leftVal) {
          return {
            finalValue: 0,
            steps,
            error: `Uyumsuz taş eşleşmesi: ${currentStone.rightVal} ve ${nextStone.leftVal} eşleşmiyor!`,
          };
        }

        const nextValue = nextStone.rightVal;
        const prevAccumulator = accumulator;

        switch (activeOperator) {
          case 'ADD':
            accumulator += nextValue;
            break;
          case 'SUBTRACT':
            accumulator -= nextValue;
            break;
          case 'MULTIPLY':
            accumulator *= nextValue;
            break;
          case 'DIVIDE':
            if (nextValue === 0) {
              return { finalValue: 0, steps, error: 'Sıfıra bölme hatası!' };
            }
            accumulator = accumulator / nextValue;
            break;
        }

        steps.push(`${prevAccumulator} ${activeOperator} ${nextValue} = ${accumulator}`);

        this.onOperatorResolve?.(activeOperator, prevAccumulator, nextValue, accumulator);

        currentStone = nextStone;
        activeOperator = null;
      }
    }

    if (activeOperator !== null) {
      return { finalValue: 0, steps, error: 'Zincir operatör ile bitemez!' };
    }

    if (this.onEvaluationEnd) {
      accumulator = this.onEvaluationEnd(accumulator);
      steps.push(`Tılsım Manipülasyonu Sonrası Değer: ${accumulator}`);
    }

    return { finalValue: accumulator, steps };
  }
}
