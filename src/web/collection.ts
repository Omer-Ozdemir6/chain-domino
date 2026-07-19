import type { RunState } from '../game/RunState.js';
import { UNLOCKS, type UnlockDef } from '../game/unlocks.js';

const COLLECTION_KEY = 'chain-domino-collection-v1';

export interface DiscoveredIds {
  charms: string[];
  vouchers: string[];
  upgrades: string[];
  /** Permanently unlocked charm/voucher ids — see src/game/unlocks.ts for their conditions. */
  unlocked: string[];
}

export function loadDiscovered(): DiscoveredIds {
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    if (!raw) return { charms: [], vouchers: [], upgrades: [], unlocked: [] };
    const parsed = JSON.parse(raw) as Partial<DiscoveredIds>;
    return {
      charms: parsed.charms ?? [],
      vouchers: parsed.vouchers ?? [],
      upgrades: parsed.upgrades ?? [],
      unlocked: parsed.unlocked ?? [],
    };
  } catch {
    return { charms: [], vouchers: [], upgrades: [], unlocked: [] };
  }
}

function saveDiscovered(ids: DiscoveredIds): void {
  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable — collection tracking is a nice-to-have.
  }
}

/** Loads permanently-unlocked ids as a Set, ready to hand straight to `RunState.unlockedIds`. */
export function loadUnlockedIds(): Set<string> {
  return new Set(loadDiscovered().unlocked);
}

/**
 * Checks every UNLOCKS condition against the current run; any newly-met one is added to
 * `run.unlockedIds` (so it's available in this run's own later shops too) and persisted
 * immediately, so it stays unlocked forever even if the tab closes right after. Returns exactly
 * the defs that were newly met this call (empty array on a call that unlocked nothing new) so the
 * caller can show a "you just unlocked X" notification instead of this happening silently.
 */
export function evaluateUnlocks(run: RunState): UnlockDef[] {
  const current = loadDiscovered();
  const unlocked = new Set(current.unlocked);
  const before = unlocked.size;
  const newlyUnlocked: UnlockDef[] = [];

  for (const def of UNLOCKS) {
    if (unlocked.has(def.id)) continue;
    if (def.isMet(run)) {
      unlocked.add(def.id);
      run.unlockedIds.add(def.id);
      newlyUnlocked.push(def);
    }
  }

  if (unlocked.size !== before) {
    saveDiscovered({ ...current, unlocked: [...unlocked] });
  }
  return newlyUnlocked;
}

/**
 * Marks every charm/voucher/upgrade the player has ever seen in a shop offer or owned as
 * "discovered" — this is a run-independent, cross-run record kept separately from the per-run
 * save (persistence.ts), so the collection screen still shows everything found in a prior,
 * already-finished run.
 */
export function recordDiscoveries(run: RunState): void {
  const current = loadDiscovered();
  const charms = new Set(current.charms);
  const vouchers = new Set(current.vouchers);
  const upgrades = new Set(current.upgrades);
  const before = charms.size + vouchers.size + upgrades.size;

  run.ownedCharmIds.forEach((id) => charms.add(id));
  for (const offer of run.shopOffers) {
    if (offer.type === 'CHARM') charms.add(offer.item.id);
    else if (offer.type === 'VOUCHER') vouchers.add(offer.item.id);
    else if (offer.type === 'UPGRADE') upgrades.add(offer.item.id);
  }

  const after = charms.size + vouchers.size + upgrades.size;
  if (after !== before) {
    saveDiscovered({ ...current, charms: [...charms], vouchers: [...vouchers], upgrades: [...upgrades] });
  }
}
