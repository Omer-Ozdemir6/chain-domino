import { describe, it, expect, beforeEach } from 'vitest';
import { RunState } from '../game/RunState.js';
import { loadDiscovered, recordDiscoveries, evaluateUnlocks, loadUnlockedIds } from './collection.js';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage() as unknown as Storage;
});

describe('collection.ts (meta-progression discovery tracking)', () => {
  it('starts empty when nothing has been saved', () => {
    expect(loadDiscovered()).toEqual({ charms: [], vouchers: [], upgrades: [], unlocked: [] });
  });

  it('records owned charms and shop-offer ids across all three categories', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.shopOffers = [
      { type: 'CHARM', item: { id: 'test_charm', name: 'X', description: '', cost: 1, rarity: 'COMMON', createHooks: () => ({}) } },
      { type: 'VOUCHER', item: { id: 'voucher_rich_start', name: 'X', description: '', cost: 1, apply: () => {} } },
      { type: 'UPGRADE', item: { id: 'consumable_magnet', name: 'X', description: '', cost: 1, type: 'CONSUMABLE' } },
    ];
    run.ownedCharmIds = ['owned_charm'];

    recordDiscoveries(run);

    const discovered = loadDiscovered();
    expect(discovered.charms.sort()).toEqual(['owned_charm', 'test_charm']);
    expect(discovered.vouchers).toEqual(['voucher_rich_start']);
    expect(discovered.upgrades).toEqual(['consumable_magnet']);
  });

  it('merges into previously discovered ids instead of overwriting them', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.ownedCharmIds = ['first_charm'];
    recordDiscoveries(run);

    run.ownedCharmIds = ['second_charm'];
    recordDiscoveries(run);

    expect(loadDiscovered().charms.sort()).toEqual(['first_charm', 'second_charm']);
  });
});

describe('unlock gating (collection.ts + RunState shop pool)', () => {
  it('a locked charm never appears in shop offers before its condition is met', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.unlockedIds = loadUnlockedIds(); // empty — nothing unlocked yet

    // rollShopOffers() is private and slot-limited/random; roll it many times and confirm the
    // locked id never once slips through, instead of relying on a single roll (which could pass
    // by sheer luck of not being picked even if gating were broken).
    const seenCharmIds = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const offers = (run as unknown as { rollShopOffers(): { type: string; item: { id: string } }[] }).rollShopOffers();
      offers.filter((o) => o.type === 'CHARM').forEach((o) => seenCharmIds.add(o.item.id));
    }
    expect(seenCharmIds.has('legendary_midas')).toBe(false);
  });

  it('evaluateUnlocks persists a newly-met condition and makes it available in the same run', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.unlockedIds = loadUnlockedIds();
    run.round = 5; // meets high_five's "reach round 5" condition

    evaluateUnlocks(run);

    expect(run.unlockedIds.has('high_five')).toBe(true);
    expect(loadUnlockedIds().has('high_five')).toBe(true);
  });

  it('an unlock, once persisted, stays unlocked for a brand new run', () => {
    const runA = new RunState();
    runA.initializeRun('RED', 'WHITE');
    runA.round = 5;
    evaluateUnlocks(runA);

    const runB = new RunState();
    runB.initializeRun('RED', 'WHITE');
    runB.unlockedIds = loadUnlockedIds();

    expect(runB.unlockedIds.has('high_five')).toBe(true);
  });
});
