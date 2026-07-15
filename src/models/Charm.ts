import type { GraphNode } from './Board.js';
import type { OperatorType } from './types.js';

export type CharmRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY';

/** What a charm is created with — lets synergy charms react to which other charms are owned. */
export interface CharmContext {
  ownedCharmIds: readonly string[];
}

/** Snapshot handed to a charm's round-end money hook, once a round's target has been hit. */
export interface RoundEndContext {
  finalScore: number;
  target: number;
  turnsUsed: number;
  turnsLeft: number;
  /** The frozen board's nodes at the moment the round was won (e.g. for counting doubles). */
  nodes: ReadonlyArray<GraphNode>;
}

/**
 * A charm's live behavior for one round. Created fresh via CharmDef.createHooks() at the start
 * of each round, so any internal counter state (e.g. "every 3rd edge") resets at round boundaries.
 */
export interface CharmHooks {
  /** Modifies an edge's value as it resolves; return the value unchanged if this charm doesn't apply. */
  onOperatorResolve?: (operator: OperatorType, parentBase: number, childExposed: number, edgeValue: number) => number;
  /** Modifies a submit's total gain; return the value unchanged if this charm doesn't apply. */
  onEvaluationEnd?: (totalGain: number) => number;
  /** Bonus money granted when the round is won, on top of the base payout. */
  onRoundEnd?: (ctx: RoundEndContext) => number;
}

export interface CharmDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  rarity: CharmRarity;
  /** High-risk/high-reward charms that help AND hurt at once — flagged for a distinct red warning look in the UI. */
  curse?: boolean;
  createHooks: (ctx: CharmContext) => CharmHooks;
}
