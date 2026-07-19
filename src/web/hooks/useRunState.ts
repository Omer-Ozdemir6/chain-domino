import { useReducer, useRef, useState } from 'react';
import { RunState, type RunConfig } from '../../game/RunState.js';
import type { GameState } from '../../game/GameState.js';
import type { UnlockDef } from '../../game/unlocks.js';
import { loadSavedRun, saveRun } from '../persistence.js';
import { recordDiscoveries, evaluateUnlocks, loadUnlockedIds } from '../collection.js';

/**
 * RunState is a mutable class, not immutable data. This hook keeps a single stable
 * instance and forces a re-render after every mutation instead of reducer-ifying it.
 *
 * Also owns the localStorage round-trip: a saved run (if any) is restored on first mount instead
 * of a fresh instance, and every mutation below re-persists the current state afterward — so a
 * page refresh (or the browser/tab closing) mid-run picks back up exactly where it left off,
 * rather than losing the wallet, hand, and owned charms.
 */
export function useRunState(config?: Partial<RunConfig>) {
  const [, bump] = useReducer((c: number) => c + 1, 0);
  const ref = useRef<RunState | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<UnlockDef[]>([]);
  if (!ref.current) {
    ref.current = loadSavedRun() ?? new RunState(config);
    ref.current.unlockedIds = loadUnlockedIds();
    recordDiscoveries(ref.current);
  }
  const run = ref.current;

  /** Mutates the current round's GameState (place/undo/submit/skip). */
  function act<T>(fn: (game: GameState) => T): T {
    const result = run.act(fn);
    saveRun(run);
    const fresh = evaluateUnlocks(run);
    if (fresh.length > 0) setNewlyUnlocked((prev) => [...prev, ...fresh]);
    bump();
    return result;
  }

  /** Mutates the run itself (buy/sell/reroll/leaveShop). */
  function shop<T>(fn: (run: RunState) => T): T {
    const result = fn(run);
    saveRun(run);
    recordDiscoveries(run);
    const fresh = evaluateUnlocks(run);
    if (fresh.length > 0) setNewlyUnlocked((prev) => [...prev, ...fresh]);
    bump();
    return result;
  }

  /** Replaces the run with a brand-new instance. If `after` is given, it runs against the fresh
   *  instance before the re-render — lets callers (e.g. "New Run") jump straight past the start
   *  screen into a freshly initialized run instead of landing back on the main menu. A bare
   *  reset() (no `after`) is how "Ana Menüye Dön" un-does a save: the fresh instance sits at
   *  'START_SCREEN', and saveRun() treats that phase as "nothing to persist" and clears it. */
  function reset(after?: (freshRun: RunState) => void): void {
    ref.current = new RunState(config);
    ref.current.unlockedIds = loadUnlockedIds();
    after?.(ref.current);
    saveRun(ref.current);
    bump();
  }

  /** Pops the front of the newly-unlocked queue — called once App.tsx has shown its toast for it. */
  function clearNewlyUnlocked(): void {
    setNewlyUnlocked((prev) => prev.slice(1));
  }

  return { run, act, shop, reset, newlyUnlocked, clearNewlyUnlocked };
}
