import type { DominoStone, OperatorType } from '../models/types.js';
import type { GraphEdge } from '../models/Board.js';
import type { CharmHooks } from '../models/Charm.js';

export interface PlayState {
  chips: number;
  mult: number;
}

export interface ScoreCalculationResult {
  score: number;
  chips: number;
  mult: number;
  steps: string[];
}

export function calculateScore(
  unfrozenStones: DominoStone[],
  unfrozenEdges: GraphEdge[],
  activeCharms: { id: string; name: string; hooks: CharmHooks }[],
  operatorLevels: Record<OperatorType, number>,
  onOperatorResolveHook?: (operator: OperatorType, parentBase: number, childExposed: number, edgeValue: number) => number
): ScoreCalculationResult {
  let state: PlayState = { chips: 0, mult: 1 };
  const steps: string[] = [];

  // Group edges by childNodeId to associate each stone with its connection edge
  const edgeByChild = new Map(unfrozenEdges.map((e) => [e.childNodeId, e]));

  unfrozenStones.forEach((stone) => {
    let baseVal = 0;
    const edge = edgeByChild.get(stone.id);

    if (edge) {
      const { parentBase } = edge;
      let { childExposedValue } = edge;

      // Amber magnet effect: align childExposedValue to parentBase
      const modifier = stone.modifier ?? 'NORMAL';
      if (modifier === 'AMBER' && childExposedValue !== parentBase) {
        steps.push(`Kehribar Taşı: Komşu değer ${childExposedValue} → ${parentBase} (mıknatıslandı)`);
        childExposedValue = parentBase;
      }

      let edgeValue = 0;

      // Resolve base arithmetic operation
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
            edgeValue = parentBase; // Safe division fallback
          } else {
            edgeValue = Math.round(parentBase / childExposedValue);
          }
          break;
      }

      // Add operator levels cosmic bonus if resolve hook is not present
      const opType = edge.operator.type;
      if (onOperatorResolveHook) {
        edgeValue = onOperatorResolveHook(opType, parentBase, childExposedValue, edgeValue);
      } else {
        const level = operatorLevels[opType] ?? 1;
        let lvlBonus = 0;
        if (level > 1) {
          if (opType === 'ADD') lvlBonus = (level - 1) * 2;
          else if (opType === 'SUBTRACT') lvlBonus = (level - 1) * 3;
          else if (opType === 'MULTIPLY') lvlBonus = (level - 1) * 5;
          else if (opType === 'DIVIDE') lvlBonus = (level - 1) * 4;
        }
        edgeValue += lvlBonus;
      }

      baseVal = edgeValue;
      steps.push(`${parentBase} ${edge.operator.symbol} ${childExposedValue} = ${edgeValue}`);
    } else {
      // Root stone has no parent edge. Its values are used as parentBase for children,
      // so we don't double-count its dots in baseVal chips.
      baseVal = 0;
      steps.push(`Kök Taş [${stone.leftVal}|${stone.rightVal}]`);
    }

    // Apply materials and modifiers
    // Note: For AMBER stones, modifier was already handled above for edge alignment
    const stoneModifier = stone.modifier ?? 'NORMAL';
    let bonusPoints = 0;
    if (stoneModifier === 'IVORY') {
      bonusPoints = 15;
      steps.push(`Fildişi Taşı (+15 Taban Puan)`);
    }

    state.chips += (baseVal + bonusPoints);

    if (stoneModifier === 'OBSIDIAN') {
      state.mult *= 2;
      steps.push(`Obsidyen Taşı (Çarpan x2)`);
    }

    if (stoneModifier === 'AMBER') {
      // Amber bonus: +5 chips when actually connected (edge exists) as a synergy bonus
      if (edge) {
        state.chips += 5;
        steps.push(`Kehribar Taşı (+5 Rezonans Sinerjisi)`);
      }
    }
  });

  // Evaluate active charms' onCalculate hook modifiers
  activeCharms.forEach((charm) => {
    if (charm.hooks && charm.hooks.onCalculate) {
      const oldMult = state.mult;
      const oldChips = state.chips;
      state = charm.hooks.onCalculate(state, unfrozenStones);
      if (state.mult !== oldMult || state.chips !== oldChips) {
        steps.push(`${charm.name} Tetiklendi! (Rezonans: ${state.chips}, Çarpan: ${state.mult})`);
      }
    }
  });

  // Safeguards to prevent negatives or 0 multiplier
  if (state.chips < 0) state.chips = 0;
  if (state.mult < 1) state.mult = 1;

  const finalScore = Math.round(state.chips * state.mult);
  steps.push(`Nihai Skor: ${state.chips} x ${state.mult} = ${finalScore}`);

  return { score: finalScore, chips: state.chips, mult: state.mult, steps };
}
