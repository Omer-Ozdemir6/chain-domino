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

  function reset(): void {
    ref.current = new RunState(config);
    bump();
  }

  return { run, act, shop, reset };
}
