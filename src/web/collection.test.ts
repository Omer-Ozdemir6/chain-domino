import { describe, it, expect, beforeEach } from 'vitest';
import { RunState } from '../game/RunState.js';
import { loadDiscovered, recordDiscoveries } from './collection.js';

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
    expect(loadDiscovered()).toEqual({ charms: [], vouchers: [], upgrades: [] });
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
