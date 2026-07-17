import { useReducer, useRef } from 'react';
import { RunState, type RunConfig } from '../../game/RunState.js';
import type { GameState } from '../../game/GameState.js';

/**
 * RunState is a mutable class, not immutable data. This hook keeps a single stable
 * instance and forces a re-render after every mutation instead of reducer-ifying it.
 */
export function useRunState(config?: Partial<RunConfig>) {
  const [, bump] = useReducer((c: number) => c + 1, 0);
  const ref = useRef<RunState | null>(null);
  if (!ref.current) ref.current = new RunState(config);
  const run = ref.current;

  /** Mutates the current round's GameState (place/undo/submit/skip). */
  function act<T>(fn: (game: GameState) => T): T {
    const result = run.act(fn);
    bump();
    return result;
  }

  /** Mutates the run itself (buy/sell/reroll/leaveShop). */
  function shop<T>(fn: (run: RunState) => T): T {
    const result = fn(run);
    bump();
    return result;
  }

  /** Replaces the run with a brand-new instance. If `after` is given, it runs against the fresh
   *  instance before the re-render — lets callers (e.g. "New Run") jump straight past the start
   *  screen into a freshly initialized run instead of landing back on the main menu. */
  function reset(after?: (freshRun: RunState) => void): void {
    ref.current = new RunState(config);
    after?.(ref.current);
    bump();
  }

  return { run, act, shop, reset };
}
