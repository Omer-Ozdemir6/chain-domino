import type { GraphNode } from './Board.js';
import type { DominoStone } from './types.js';
import type { PlayState } from '../engine/scoreCalculator.js';

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
  /** Modifies the running {chips, mult} state as the chain is scored; return the state unchanged
   *  if this charm doesn't apply. Every owned charm's onCalculate fires in owned order — this is
   *  the single trigger point ("Tetiklenme Şöleni") for all scoring manipulation. */
  onCalculate?: (state: PlayState, playedChain: DominoStone[]) => PlayState;
  /** Bonus money granted when the round is won, on top of the base payout. */
  onRoundEnd?: (ctx: RoundEndContext) => number;
  /** Manual, player-clicked, once-per-turn effect targeting one hand stone. Returns the stone(s)
   *  that should replace it in hand, or null if this charm can't act on the given target. */
  onActivate?: (targetStone: DominoStone) => DominoStone[] | null;
  /** Fires once when a round would otherwise end in LOSS because the final submission didn't
   *  cross the target on the last turn. A truthy result rewinds the last placed stone and/or
   *  grants free draws instead of ending the run. */
  onSubmitFail?: (ctx: RoundEndContext) => { rewind?: boolean; freeDraw?: number } | undefined;
}

export interface CharmDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  rarity: CharmRarity;
  /** High-risk/high-reward charms that help AND hurt at once — flagged for a distinct red warning look in the UI. */
  curse?: boolean;
  /** True if this charm exposes onActivate — CharmBar renders it as clickable. */
  interactive?: boolean;
  /** Declares an alternate board placement rule while owned, instead of classic pip-matching. */
  placementMode?: 'SEQUENCE';
  /** Opt-in procedural sound + CSS/SVG visual "punch" for the Tetiklenme Şöleni animation. Charms
   *  without this keep the existing generic pulse/ring trigger effect. */
  signature?: {
    sound: 'gavel' | 'chime' | 'void' | 'devour' | 'rewind';
    visual: 'smoke' | 'vortex' | 'gnaw' | 'rewind';
  };
  /** If true, this charm has a durability (in number of rounds) and perishes once it hits 0. */
  perish?: boolean;
  /** Maximum number of rounds this charm can last before perishing. */
  maxDurability?: number;
  createHooks: (ctx: CharmContext) => CharmHooks;
}
