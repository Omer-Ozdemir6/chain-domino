import type { RunState } from '../game/RunState.js';

const COLLECTION_KEY = 'chain-domino-collection-v1';

export interface DiscoveredIds {
  charms: string[];
  vouchers: string[];
  upgrades: string[];
}

export function loadDiscovered(): DiscoveredIds {
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    if (!raw) return { charms: [], vouchers: [], upgrades: [] };
    const parsed = JSON.parse(raw) as Partial<DiscoveredIds>;
    return {
      charms: parsed.charms ?? [],
      vouchers: parsed.vouchers ?? [],
      upgrades: parsed.upgrades ?? [],
    };
  } catch {
    return { charms: [], vouchers: [], upgrades: [] };
  }
}

function saveDiscovered(ids: DiscoveredIds): void {
  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable — collection tracking is a nice-to-have.
  }
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
    saveDiscovered({ charms: [...charms], vouchers: [...vouchers], upgrades: [...upgrades] });
  }
}
