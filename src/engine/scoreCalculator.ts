import type { DominoStone, HandType } from '../models/types.js';
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
  handStats: { chips: number; mult: number } = { chips: 0, mult: 1 },
  handTypeName: string = 'Düz Zincir'
): ScoreCalculationResult {
  let state: PlayState = { chips: handStats.chips, mult: handStats.mult };
  const steps: string[] = [];

  steps.push(`El Türü: ${handTypeName} (Seviye Başlangıcı: ${handStats.chips} Chip, ${handStats.mult} Çarpan)`);

  unfrozenStones.forEach((stone) => {
    const base = stone.leftVal + stone.rightVal;
    const stoneModifier = stone.modifier ?? 'NORMAL';

    let bonusPoints = 0;
    if (stoneModifier === 'IVORY') {
      bonusPoints = 15;
      steps.push(`Fildişi Mührü [${stone.leftVal}|${stone.rightVal}] (+15 Taban Puan)`);
    }

    state.chips += base + bonusPoints;
    steps.push(`[${stone.leftVal}|${stone.rightVal}] → +${base} Chip`);

    if (stoneModifier === 'OBSIDIAN') {
      state.mult *= 2;
      steps.push(`Obsidyen Mührü [${stone.leftVal}|${stone.rightVal}] (Çarpan x2)`);
    }
  });

  // Tetiklenme Şöleni: every active charm fires in order
  activeCharms.forEach((charm) => {
    if (charm.hooks?.onCalculate) {
      const before = { ...state };
      state = charm.hooks.onCalculate(state, unfrozenStones);
      if (state.chips !== before.chips || state.mult !== before.mult) {
        steps.push(`${charm.name} Tetiklendi! (Chip: ${state.chips}, Çarpan: ${state.mult})`);
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
