import type { RunState } from './RunState.js';

export interface UnlockDef {
  id: string;
  kind: 'CHARM' | 'VOUCHER';
  /** Shown next to the lock icon in the Koleksiyon screen and shop-pool tooltip. */
  description: string;
  isMet: (run: RunState) => boolean;
}

/** A small, hand-picked subset of charms/vouchers that stay OUT of every shop pool until their
 *  condition is met once, in any run — after that they're unlocked forever (evaluateUnlocks()
 *  persists it). Most of the 112 charms are available from the start; these are the ones worth
 *  making players earn. */
export const UNLOCKS: readonly UnlockDef[] = [
  { id: 'legendary_final_boss', kind: 'CHARM', description: 'Bir elde 20 veya daha uzun bir zincir dizin.', isMet: (run) => run.bestChainLength >= 20 },
  { id: 'legendary_midas', kind: 'CHARM', description: 'Bir seferde aynı anda $50 biriktirin.', isMet: (run) => run.money >= 50 },
  { id: 'legendary_universal_chain', kind: 'CHARM', description: 'Bir seferde toplam 50 taş oynayın.', isMet: (run) => run.totalCardsPlayed >= 50 },
  { id: 'legendary_grand_harmony', kind: 'CHARM', description: 'Bir seferde 5 kez Çatallı Zincir dizin.', isMet: (run) => run.handTypePlayCounts.BRANCHED >= 5 },
  { id: 'legendary_double_edge', kind: 'CHARM', description: 'Bir seferi tamamen kazanın.', isMet: (run) => run.status === 'WON' },
  { id: 'legendary_symmetry', kind: 'CHARM', description: 'Tek elde 500 veya daha fazla puan yapın.', isMet: (run) => run.bestHandScore >= 500 },
  { id: 'high_five', kind: 'CHARM', description: '5. Safhaya ulaşın.', isMet: (run) => run.round >= 5 },
  { id: 'boom_or_bust', kind: 'CHARM', description: 'Bir seferde mağazayı 5 kez yenileyin.', isMet: (run) => run.totalRerolls >= 5 },
  { id: 'mirror_image', kind: 'CHARM', description: 'Bir seferde mağazadan toplam 15 alışveriş yapın.', isMet: (run) => run.totalPurchases >= 15 },
  { id: 'voucher_crystal_ball', kind: 'VOUCHER', description: 'Bir seferde mağazayı 10 kez yenileyin.', isMet: (run) => run.totalRerolls >= 10 },
];

export const LOCKED_CHARM_IDS: ReadonlySet<string> = new Set(
  UNLOCKS.filter((u) => u.kind === 'CHARM').map((u) => u.id)
);
export const LOCKED_VOUCHER_IDS: ReadonlySet<string> = new Set(
  UNLOCKS.filter((u) => u.kind === 'VOUCHER').map((u) => u.id)
);

export function isLockedAndNotUnlocked(id: string, unlockedIds: ReadonlySet<string>): boolean {
  return (LOCKED_CHARM_IDS.has(id) || LOCKED_VOUCHER_IDS.has(id)) && !unlockedIds.has(id);
}
