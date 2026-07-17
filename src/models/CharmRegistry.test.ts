import { describe, it, expect } from 'vitest';
import { CHARMS } from './CharmRegistry.js';
import { S } from '../test-utils/edges.js';
import type { RoundEndContext, CharmContext } from './Charm.js';
import type { DominoStone } from '../models/types.js';
import type { PlayState } from '../engine/scoreCalculator.js';

const findCharm = (id: string) => {
  const charm = CHARMS.find((c) => c.id === id);
  if (!charm) throw new Error(`charm not found: ${id}`);
  return charm;
};

const noSynergy: CharmContext = { ownedCharmIds: [] };
const base: PlayState = { chips: 0, mult: 1 };

const ctx = (overrides: Partial<RoundEndContext> = {}): RoundEndContext => ({
  finalScore: 0,
  target: 0,
  turnsUsed: 0,
  turnsLeft: 0,
  nodes: [],
  ...overrides,
});

/** Runs a charm's onCalculate hook (if any) against a chain, starting from a plain {chips:0, mult:1}. */
function calc(id: string, chain: DominoStone[], charmCtx: CharmContext = noSynergy): PlayState {
  const hooks = findCharm(id).createHooks(charmCtx);
  if (!hooks.onCalculate) throw new Error(`${id} has no onCalculate hook`);
  return hooks.onCalculate(base, chain);
}

describe('CharmRegistry', () => {
  it('has at least 100 charms with unique ids', () => {
    expect(CHARMS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(CHARMS.map((c) => c.id)).size).toBe(CHARMS.length);
  });

  it('every charm exposes at least one hook (onCalculate or onRoundEnd)', () => {
    for (const charm of CHARMS) {
      const hooks = charm.createHooks(noSynergy);
      expect(Boolean(hooks.onCalculate || hooks.onRoundEnd || (hooks as any).onActivate || (hooks as any).onSubmitFail || charm.placementMode), `${charm.id} has no hook`).toBe(true);
    }
  });

  it('Tek Sayı Ustası adds +4 per stone with an odd pip sum and +1 mult', () => {
    const result = calc('division_master', [S(3, 4), S(2, 2)]); // sums 7 (odd), 4 (even)
    expect(result.chips).toBe(4);
    expect(result.mult).toBe(2);
  });

  it('Toplam Ustası adds +3 per stone with an even pip sum and x1.2 mult if 3+ evens', () => {
    const result = calc('add_master', [S(3, 4), S(2, 2)]); // sums 7 (odd), 4 (even)
    expect(result.chips).toBe(3);
    expect(result.mult).toBe(1);

    const result2 = calc('add_master', [S(2, 2), S(4, 4), S(6, 6)]);
    expect(result2.chips).toBe(9);
    expect(result2.mult).toBeCloseTo(1.2);
  });

  it('Eksi Ustası adds +6 per non-double stone', () => {
    const result = calc('subtract_master', [S(6, 6), S(3, 4)]); // 1 double, 1 non-double
    expect(result.chips).toBe(6);
  });

  it('Çarpan Coşkusu multiplies mult by x1.5 per 3 stones', () => {
    expect(calc('multiplier_frenzy', [S(1, 1), S(1, 2)]).mult).toBe(1); // only 2 stones
    expect(calc('multiplier_frenzy', [S(1, 1), S(1, 2), S(2, 3)]).mult).toBe(1.5); // exactly 3
    expect(calc('multiplier_frenzy', Array.from({ length: 6 }, () => S(1, 1))).mult).toBe(2.25); // 6 stones = x1.5^2
  });

  it('Simetri Ödülü adds +8 chips and +2 mult per double (spinner) stone', () => {
    const result = calc('symmetry_bonus', [S(6, 6), S(3, 4)]);
    expect(result.chips).toBe(8);
    expect(result.mult).toBe(3);
  });

  it('Küçük Sayı Sevgisi adds +6 per stone summing to 2 or less', () => {
    const result = calc('small_number_love', [S(1, 1), S(3, 4)]); // sums 2, 7
    expect(result.chips).toBe(6);
  });

  it('Ekstra Mesai boosts mult from the 4th onward', () => {
    const chain = Array.from({ length: 5 }, () => S(1, 1));
    const result = calc('overtime', chain);
    expect(result.mult).toBe(7); // 1 base + 2 * 3
  });

  it("Dörtlü Uyum grants x2.0 mult only with 4+ distinct pip-sum values in the chain", () => {
    const notEnough = calc('four_way_harmony', [S(1, 1), S(2, 2), S(3, 3)]); // 3 distinct sums
    expect(notEnough.mult).toBe(1);
    const enough = calc('four_way_harmony', [S(1, 1), S(2, 2), S(3, 3), S(4, 4)]); // 4 distinct sums
    expect(enough.mult).toBe(2);
  });

  it('Denge Ustası grants +20 chips and +4 mult only when both a double and a non-double are present', () => {
    expect(calc('balance_master', [S(6, 6), S(5, 5)]).chips).toBe(0); // all doubles
    expect(calc('balance_master', [S(6, 6), S(3, 4)]).chips).toBe(20);
    expect(calc('balance_master', [S(6, 6), S(3, 4)]).mult).toBe(5);
  });

  it('Zincir Sonu Faizi adds 10% only to a positive chip total', () => {
    const hooks = findCharm('chain_end_interest').createHooks(noSynergy);
    expect(hooks.onCalculate!({ chips: 20, mult: 1 }, []).chips).toBe(22);
    expect(hooks.onCalculate!({ chips: -20, mult: 1 }, []).chips).toBe(-20);
  });

  it('Kayıp Sigortası floors chips at 0', () => {
    const hooks = findCharm('loss_insurance').createHooks(noSynergy);
    expect(hooks.onCalculate!({ chips: -15, mult: 1 }, []).chips).toBe(0);
    expect(hooks.onCalculate!({ chips: 15, mult: 1 }, []).chips).toBe(15);
  });

  it('Cömert Tüccar always grants a flat $5', () => {
    const hooks = findCharm('generous_trader').createHooks(noSynergy);
    expect(hooks.onRoundEnd!(ctx())).toBe(5);
  });

  it('Erken Bitiş Ustası grants $2 per unused turn', () => {
    const hooks = findCharm('early_finisher').createHooks(noSynergy);
    expect(hooks.onRoundEnd!(ctx({ turnsLeft: 4 }))).toBe(8);
  });

  it('Çift Avcısı grants $3 per double node on the board', () => {
    const hooks = findCharm('double_hunter').createHooks(noSynergy);
    const nodes = [
      { nodeId: 'a', leftVal: 6, rightVal: 6, isDouble: true, frozen: true },
      { nodeId: 'b', leftVal: 3, rightVal: 4, isDouble: false, frozen: true },
      { nodeId: 'c', leftVal: 2, rightVal: 2, isDouble: true, frozen: true },
    ];
    expect(hooks.onRoundEnd!(ctx({ nodes }))).toBe(6);
  });

  it('Son Anda Kurtuluş only pays out when the round is won with 0 turns left', () => {
    const hooks = findCharm('clutch_finisher').createHooks(noSynergy);
    expect(hooks.onRoundEnd!(ctx({ turnsLeft: 0 }))).toBe(15);
    expect(hooks.onRoundEnd!(ctx({ turnsLeft: 1 }))).toBe(0);
  });

  it('İkiz Ruhlar only boosts chips when both twin charms are owned', () => {
    const chain = [S(3, 4), S(4, 2)];
    expect(calc('twin_souls', chain, noSynergy).chips).toBe(0);
    const withTwin = calc('twin_souls', chain, { ownedCharmIds: ['division_master', 'subtract_master'] });
    expect(withTwin.chips).toBe(chain.length * 2);
  });

  it('Çarpan Rezonansı only boosts double-stone chips when both charms are owned', () => {
    const chain = [S(6, 6), S(3, 4)];
    expect(calc('multiplier_resonance', chain, noSynergy).chips).toBe(0);
    const withBoth = calc('multiplier_resonance', chain, { ownedCharmIds: ['multiplier_frenzy', 'symmetry_bonus'] });
    expect(withBoth.chips).toBe(8); // 1 double stone
  });

  it('Kumarbaz Ruhu amplifies gains and losses asymmetrically', () => {
    const hooks = findCharm('gamblers_spirit').createHooks(noSynergy);
    expect(hooks.onCalculate!({ chips: 10, mult: 1 }, []).chips).toBe(13);
    expect(hooks.onCalculate!({ chips: -10, mult: 1 }, []).chips).toBe(-15);
  });

  it('Çılgın Bilgin rewards double stones and penalizes non-double stones', () => {
    const result = calc('mad_scholar', [S(6, 6), S(3, 4)]); // 1 double, 1 non-double
    expect(result.chips).toBe(8 - 3);
  });

  it('Fedakar Kalp zeroes negative chips but shaves 10% off positive ones', () => {
    const hooks = findCharm('sacrificial_heart').createHooks(noSynergy);
    expect(hooks.onCalculate!({ chips: -20, mult: 1 }, []).chips).toBe(0);
    expect(hooks.onCalculate!({ chips: 20, mult: 1 }, []).chips).toBe(18);
  });

  it('Tefeci pays $6 per round but worsens negative chips by 20%', () => {
    const hooks = findCharm('loan_shark').createHooks(noSynergy);
    expect(hooks.onRoundEnd!(ctx())).toBe(6);
    expect(hooks.onCalculate!({ chips: -10, mult: 1 }, []).chips).toBe(-12);
    expect(hooks.onCalculate!({ chips: 10, mult: 1 }, []).chips).toBe(10);
  });

  it('Kırılgan Zafer only pays out when the overshoot is 5 or less', () => {
    const hooks = findCharm('fragile_victory').createHooks(noSynergy);
    expect(hooks.onRoundEnd!(ctx({ finalScore: 55, target: 50 }))).toBe(12);
    expect(hooks.onRoundEnd!(ctx({ finalScore: 60, target: 50 }))).toBe(0);
  });

  it('Efsanevi Simetri adds +15 chips and x1.5 mult per double stone', () => {
    const result = calc('legendary_symmetry', [S(6, 6), S(3, 4)]);
    expect(result.chips).toBe(15);
    expect(result.mult).toBeCloseTo(1.5);
  });

  it('cosmic_pendulum and heart_matryoshka (fusion source charms) still work as before', () => {
    const pendulum = calc('cosmic_pendulum', [S(1, 1), S(2, 2), S(3, 3), S(4, 4), S(5, 5)]);
    expect(pendulum.mult).toBe(3);
    const matryoshka = calc('heart_matryoshka', [S(2, 2), S(4, 4)]); // both even sums
    expect(matryoshka.mult).toBeCloseTo(2.2);
  });

  it('Ardışık Seri rewards consecutive stones with equal pip sums', () => {
    const result = calc('add_streak', [S(1, 5), S(2, 4), S(3, 3)]); // all sum to 6
    expect(result.chips).toBe(24); // 2 consecutive matches * 12
    expect(result.mult).toBe(7); // 1 base + 2 matches * 3
  });

  it('Obur Matruşka: a double devours the chip value of every earlier un-eaten stone into its own mult', () => {
    // stone sums: 3, 7, then a double summing 12 — the double eats the 3 and 7 (10 total).
    const chain = [S(1, 2), S(3, 4), S(6, 6)];
    const result = calc('gluttonous_matryoshka', chain);
    expect(result.chips).toBe(-10); // 0 - (3 + 7)
    expect(result.mult).toBe(2); // 1 + 10/10
  });

  it('Obur Matruşka: a second double only eats stones not already eaten by an earlier double', () => {
    const chain = [S(1, 1), S(2, 2), S(1, 3)]; // sums: 2 (double), 4 (double), 4
    const result = calc('gluttonous_matryoshka', chain);
    // First double (S(1,1)) has nothing before it. Second double (S(2,2)) eats the first double's 2.
    expect(result.chips).toBe(-2);
    expect(result.mult).toBeCloseTo(1.2);
  });

  it('a Tetiklenme Şöleni: multiple owned charms compose in order via calculateScore', () => {
    // Sanity check that two charms found in the registry chain their effects like the engine does.
    const chain = [S(6, 6), S(6, 6)];
    let state: PlayState = { chips: 0, mult: 1 };
    const symmetry = findCharm('symmetry_bonus').createHooks(noSynergy);
    const legendary = findCharm('legendary_symmetry').createHooks(noSynergy);
    state = symmetry.onCalculate!(state, chain);
    state = legendary.onCalculate!(state, chain);
    expect(state.chips).toBe(2 * 8 + 2 * 15); // both charms saw the same chain, stacked in order
  });
});
