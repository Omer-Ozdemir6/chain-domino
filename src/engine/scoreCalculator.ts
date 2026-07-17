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

/** A single stone's own chip contribution (base pip sum + IVORY bonus) — the exact per-stone
 *  math `calculateScore()`'s loop applies, factored out so a stone-by-stone reveal animation
 *  can reuse the identical formula instead of re-deriving it and risking drift. */
export function computeStoneChips(stone: DominoStone): number {
  const base = stone.leftVal + stone.rightVal;
  const bonus = stone.modifier === 'IVORY' ? 15 : 0;
  return base + bonus;
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
    const stoneModifier = stone.modifier ?? 'NORMAL';
    const chips = computeStoneChips(stone);

    if (stoneModifier === 'IVORY') {
      steps.push(`Fildişi Mührü [${stone.leftVal}|${stone.rightVal}] (+15 Taban Puan)`);
    }

    state.chips += chips;
    steps.push(`[${stone.leftVal}|${stone.rightVal}] → +${stone.leftVal + stone.rightVal} Chip`);

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
