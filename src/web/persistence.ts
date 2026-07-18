import { RunState, type RunStateSnapshot } from '../game/RunState.js';

const SAVE_KEY = 'chain-domino-save-v1';

/** Persists the run after every mutation — or, once the run is back at the title screen (a
 *  fresh app load, or the player explicitly chose "Ana Menüye Dön"), clears whatever was saved
 *  instead, so the next load doesn't resurrect an abandoned run the player meant to leave behind. */
export function saveRun(run: RunState): void {
  try {
    if (run.phase === 'START_SCREEN') {
      clearSavedRun();
      return;
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(run.toSnapshot()));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded, disabled) — persistence is a
    // nice-to-have, never something a move should fail over.
  }
}

export function loadSavedRun(): RunState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as RunStateSnapshot;
    return RunState.fromSnapshot(snap);
  } catch {
    // Corrupt/incompatible save (e.g. from an older schema) — start fresh instead of crashing
    // the whole app on load.
    clearSavedRun();
    return null;
  }
}

export function clearSavedRun(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
