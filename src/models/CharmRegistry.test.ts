import { describe, it, expect } from 'vitest';
import { CHARMS } from './CharmRegistry.js';
import { E } from '../test-utils/edges.js';
import type { RoundEndContext, CharmContext } from './Charm.js';

const findCharm = (id: string) => {
  const charm = CHARMS.find((c) => c.id === id);
  if (!charm) throw new Error(`charm not found: ${id}`);
  return charm;
};

const noSynergy: CharmContext = { ownedCharmIds: [] };

const ctx = (overrides: Partial<RoundEndContext> = {}): RoundEndContext => ({
  finalScore: 0,
  target: 0,
  turnsUsed: 0,
  turnsLeft: 0,
  nodes: [],
  ...overrides,
});

describe('CharmRegistry', () => {
  it('has exactly 24 charms with unique ids', () => {
    expect(CHARMS).toHaveLength(24);
    expect(new Set(CHARMS.map((c) => c.id)).size).toBe(24);
  });

  it('Bölüm Ustası adds +3 only to DIVIDE edges', () => {
    const hooks = findCharm('division_master').createHooks(noSynergy);
    const divideEdge = E(7, 'DIVIDE', 4); // base edgeValue would be 2
    expect(hooks.onOperatorResolve!('DIVIDE', 7, 4, 2)).toBe(5);
    expect(hooks.onOperatorResolve!('ADD', 7, 4, 11)).toBe(11);
    expect(divideEdge).toBeDefined(); // just exercising the E() helper import
  });

  it('Toplam Ustası adds +2 only to ADD edges', () => {
    const hooks = findCharm('add_master').createHooks(noSynergy);
    expect(hooks.onOperatorResolve!('ADD', 5, 3, 8)).toBe(10);
    expect(hooks.onOperatorResolve!('SUBTRACT', 5, 3, 2)).toBe(2);
  });

  it('Eksi Ustası adds +4 only to SUBTRACT edges', () => {
    const hooks = findCharm('subtract_master').createHooks(noSynergy);
    expect(hooks.onOperatorResolve!('SUBTRACT', 5, 3, 2)).toBe(6);
    expect(hooks.onOperatorResolve!('ADD', 5, 3, 8)).toBe(8);
  });

  it('Çarpan Coşkusu doubles only every 3rd edge and resets per round', () => {
    const hooks = findCharm('multiplier_frenzy').createHooks(noSynergy);
    const results = [1, 2, 3, 4, 5, 6].map((v) => hooks.onOperatorResolve!('ADD', 0, 0, v));
    expect(results).toEqual([1, 2, 6, 4, 5, 12]);

    // a fresh round -> fresh hooks -> counter starts over
    const freshHooks = findCharm('multiplier_frenzy').createHooks(noSynergy);
    expect(freshHooks.onOperatorResolve!('ADD', 0, 0, 1)).toBe(1);
    expect(freshHooks.onOperatorResolve!('ADD', 0, 0, 2)).toBe(2);
    expect(freshHooks.onOperatorResolve!('ADD', 0, 0, 3)).toBe(6);
  });

  it('Simetri Ödülü adds +5 only when parentBase equals childExposed', () => {
    const hooks = findCharm('symmetry_bonus').createHooks(noSynergy);
    expect(hooks.onOperatorResolve!('ADD', 6, 6, 12)).toBe(17);
    expect(hooks.onOperatorResolve!('ADD', 6, 5, 11)).toBe(11);
  });

  it('Küçük Sayı Sevgisi adds +4 only when the exposed value is 2 or less', () => {
    const hooks = findCharm('small_number_love').createHooks(noSynergy);
    expect(hooks.onOperatorResolve!('ADD', 6, 2, 8)).toBe(12);
    expect(hooks.onOperatorResolve!('ADD', 6, 3, 9)).toBe(9);
  });

  it('Basit Zevkler adds +3 only when parentBase is 6 or less', () => {
    const hooks = findCharm('simple_pleasures').createHooks(noSynergy);
    expect(hooks.onOperatorResolve!('ADD', 6, 4, 10)).toBe(13);
    expect(hooks.onOperatorResolve!('ADD', 7, 4, 11)).toBe(11);
  });

  it('Ekstra Mesai only boosts the 4th connection onward', () => {
    const hooks = findCharm('overtime').createHooks(noSynergy);
    const results = [1, 2, 3, 4, 5].map((v) => hooks.onOperatorResolve!('ADD', 0, 0, v));
    expect(results).toEqual([1, 2, 3, 7, 8]);
  });

  it('Dörtlü Uyum grants +15 only when all 4 operators were used, and resets after evaluation', () => {
    const hooks = findCharm('four_way_harmony').createHooks(noSynergy);
    hooks.onOperatorResolve!('ADD', 0, 0, 1);
    hooks.onOperatorResolve!('SUBTRACT', 0, 0, 1);
    hooks.onOperatorResolve!('MULTIPLY', 0, 0, 1);
    expect(hooks.onEvaluationEnd!(10)).toBe(10); // only 3 operators used

    hooks.onOperatorResolve!('ADD', 0, 0, 1);
    hooks.onOperatorResolve!('SUBTRACT', 0, 0, 1);
    hooks.onOperatorResolve!('MULTIPLY', 0, 0, 1);
    hooks.onOperatorResolve!('DIVIDE', 0, 0, 1);
    expect(hooks.onEvaluationEnd!(10)).toBe(25); // all 4 this turn

    // resets for the next turn
    hooks.onOperatorResolve!('ADD', 0, 0, 1);
    expect(hooks.onEvaluationEnd!(10)).toBe(10);
  });

  it('Denge Ustası grants +12 only when both SUBTRACT and DIVIDE were used that turn', () => {
    const hooks = findCharm('balance_master').createHooks(noSynergy);
    hooks.onOperatorResolve!('SUBTRACT', 0, 0, 1);
    expect(hooks.onEvaluationEnd!(10)).toBe(10);

    hooks.onOperatorResolve!('SUBTRACT', 0, 0, 1);
    hooks.onOperatorResolve!('DIVIDE', 0, 0, 1);
    expect(hooks.onEvaluationEnd!(10)).toBe(22);
  });

  it('Zincir Sonu Faizi adds 10% only to a positive total', () => {
    const hooks = findCharm('chain_end_interest').createHooks(noSynergy);
    expect(hooks.onEvaluationEnd!(20)).toBe(22);
    expect(hooks.onEvaluationEnd!(-20)).toBe(-20);
  });

  it('Kayıp Sigortası floors the total at 0', () => {
    const hooks = findCharm('loss_insurance').createHooks(noSynergy);
    expect(hooks.onEvaluationEnd!(-15)).toBe(0);
    expect(hooks.onEvaluationEnd!(15)).toBe(15);
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

  it("İkiz Ruhlar only boosts DIVIDE/SUBTRACT when both twin charms are owned", () => {
    const withoutTwin = findCharm('twin_souls').createHooks(noSynergy);
    expect(withoutTwin.onOperatorResolve!('DIVIDE', 0, 0, 5)).toBe(5);

    const withTwin = findCharm('twin_souls').createHooks({ ownedCharmIds: ['division_master', 'subtract_master'] });
    expect(withTwin.onOperatorResolve!('DIVIDE', 0, 0, 5)).toBe(7);
    expect(withTwin.onOperatorResolve!('SUBTRACT', 0, 0, 5)).toBe(7);
    expect(withTwin.onOperatorResolve!('ADD', 0, 0, 5)).toBe(5);
  });

  it('Çarpan Rezonansı only boosts symmetric MULTIPLY edges when both charms are owned', () => {
    const withoutBoth = findCharm('multiplier_resonance').createHooks(noSynergy);
    expect(withoutBoth.onOperatorResolve!('MULTIPLY', 4, 4, 16)).toBe(16);

    const withBoth = findCharm('multiplier_resonance').createHooks({
      ownedCharmIds: ['multiplier_frenzy', 'symmetry_bonus'],
    });
    expect(withBoth.onOperatorResolve!('MULTIPLY', 4, 4, 16)).toBe(24);
    expect(withBoth.onOperatorResolve!('MULTIPLY', 4, 3, 12)).toBe(12);
  });

  it('Kumarbaz Ruhu amplifies gains and losses asymmetrically', () => {
    const hooks = findCharm('gamblers_spirit').createHooks(noSynergy);
    expect(hooks.onEvaluationEnd!(10)).toBe(13);
    expect(hooks.onEvaluationEnd!(-10)).toBe(-15);
  });

  it('Çılgın Bilgin rewards SUBTRACT/DIVIDE and penalizes ADD/MULTIPLY', () => {
    const hooks = findCharm('mad_scholar').createHooks(noSynergy);
    expect(hooks.onOperatorResolve!('SUBTRACT', 0, 0, 2)).toBe(10);
    expect(hooks.onOperatorResolve!('DIVIDE', 0, 0, 2)).toBe(10);
    expect(hooks.onOperatorResolve!('ADD', 0, 0, 10)).toBe(7);
    expect(hooks.onOperatorResolve!('MULTIPLY', 0, 0, 10)).toBe(7);
  });

  it('Fedakar Kalp zeroes losses but shaves 10% off gains', () => {
    const hooks = findCharm('sacrificial_heart').createHooks(noSynergy);
    expect(hooks.onEvaluationEnd!(-20)).toBe(0);
    expect(hooks.onEvaluationEnd!(20)).toBe(18);
  });

  it('Tefeci pays $6 per round but worsens negative turns by 20%', () => {
    const hooks = findCharm('loan_shark').createHooks(noSynergy);
    expect(hooks.onRoundEnd!(ctx())).toBe(6);
    expect(hooks.onEvaluationEnd!(-10)).toBe(-12);
    expect(hooks.onEvaluationEnd!(10)).toBe(10);
  });

  it('Kırılgan Zafer only pays out when the overshoot is 5 or less', () => {
    const hooks = findCharm('fragile_victory').createHooks(noSynergy);
    expect(hooks.onRoundEnd!(ctx({ finalScore: 55, target: 50 }))).toBe(12);
    expect(hooks.onRoundEnd!(ctx({ finalScore: 60, target: 50 }))).toBe(0);
  });

  it('Efsanevi Simetri adds +15 only when parentBase equals childExposed', () => {
    const hooks = findCharm('legendary_symmetry').createHooks(noSynergy);
    expect(hooks.onOperatorResolve!('ADD', 6, 6, 12)).toBe(27);
    expect(hooks.onOperatorResolve!('ADD', 6, 5, 11)).toBe(11);
  });
});
