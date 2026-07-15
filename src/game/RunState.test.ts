import { describe, it, expect } from 'vitest';
import { RunState, SHOP_UPGRADES } from './RunState.js';
import { CHARMS } from '../models/CharmRegistry.js';
import type { DominoStone } from '../models/types.js';

const stone = (id: string, l: number, r: number): DominoStone => ({ id, leftVal: l, rightVal: r });

function playAndWinBlind(run: RunState, type: 'SMALL' | 'BIG' | 'BOSS') {
  run.startBlind(type);
  run.act((g) => {
    g.score = run.getBlindTarget(type);
  });
  run.act((g) => g.skipTurn());
  expect(run.phase).toBe('SHOP');
  run.leaveShop();
}

describe('RunState', () => {
  it('starts with start screen default', () => {
    const run = new RunState();
    expect(run.round).toBe(1);
    expect(run.currentTarget).toBe(50);
    expect(run.money).toBe(4);
    expect(run.phase).toBe('START_SCREEN');
  });

  it('grows the target 50 -> 68 -> 92 -> 124 -> 167 -> 225 -> 304 -> 410 across 8 antes', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    const seen = [run.currentTarget];
    for (let i = 0; i < 7; i++) {
      playAndWinBlind(run, 'SMALL');
      playAndWinBlind(run, 'BIG');
      playAndWinBlind(run, 'BOSS');
      seen.push(run.currentTarget);
    }
    expect(seen).toEqual([50, 68, 92, 124, 167, 225, 304, 410]);
  });

  it('computes round payout as base + unused-turn bonus + interest', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.startBlind('SMALL');
    run.act((g) => {
      g.score = 65;
    });
    // simulate 2 used turns (turn is 3, so 3-1 = 2 used)
    run.game.turn = 3;
    const moneyBefore = run.money;
    run.act((g) => g.skipTurn());

    expect(run.phase).toBe('SHOP');
    // small blind reward = 3.
    // turns left = 6 - 3 = 3. (adds +3 since skipTurn increments turn from 3 to 4)
    // interest = floor(4/5) = 0.
    // total payout = 3 + 3 = 6.
    expect(run.money - moneyBefore).toBe(6);
  });

  it('buyItem rejects insufficient money, then succeeds and deducts cost', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    const cheap = CHARMS.find((c) => c.id === 'division_master')!; // cost 5
    run.shopOffers = [{ type: 'CHARM', item: cheap }];
    run.money = 3;

    const fail = run.buyItem(cheap.id);
    expect(fail.ok).toBe(false);
    expect(run.ownedCharmIds).toHaveLength(0);

    run.money = 10;
    const ok = run.buyItem(cheap.id);
    expect(ok.ok).toBe(true);
    expect(run.money).toBe(5);
    expect(run.ownedCharmIds).toContain(cheap.id);
  });

  it('buyItem rejects once charm slots are full', () => {
    const run = new RunState({ maxCharmSlots: 1 });
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    run.money = 100;
    const [a, b] = CHARMS;
    run.shopOffers = [
      { type: 'CHARM', item: a },
      { type: 'CHARM', item: b },
    ];

    expect(run.buyItem(a.id).ok).toBe(true);
    const result = run.buyItem(b.id);
    expect(result.ok).toBe(false);
    expect(run.ownedCharmIds).toEqual([a.id]);
  });

  it('sellCharm refunds half the cost and frees the slot', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    const charm = CHARMS.find((c) => c.id === 'chain_end_interest')!; // cost 8
    run.ownedCharmIds = [charm.id];
    run.money = 0;

    const result = run.sellCharm(charm.id);
    expect(result.ok).toBe(true);
    expect(result.refund).toBe(4);
    expect(run.money).toBe(4);
    expect(run.ownedCharmIds).toHaveLength(0);
  });

  it('rerollShop rejects insufficient money and otherwise replaces the offers', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    run.money = 0;
    expect(run.rerollShop().ok).toBe(false);

    run.money = 10;
    const result = run.rerollShop();
    expect(result.ok).toBe(true);
    expect(run.money).toBe(8);
    // shopSize (2 charms + 1 upgrade) plus 1 permanent Voucher slot, since none are owned yet.
    expect(run.shopOffers).toHaveLength(run.config.shopSize + 1);
  });

  it('purchased Cosmic Upgrade increases operator levels and adds score bonus', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    run.money = 10;
    const addUpgrade = SHOP_UPGRADES.find((u) => u.id === 'cosmic_add')!;
    run.shopOffers = [{ type: 'UPGRADE', item: addUpgrade }];

    expect(run.buyItem(addUpgrade.id).ok).toBe(true);
    expect(run.operatorLevels['ADD']).toBe(2);

    run.startBlind('SMALL');

    run.game.hand = [stone('s1', 3, 4), stone('s2', 3, 6)];
    run.game.operatorHand = [{ id: 'op1', type: 'ADD', symbol: '+' }];

    run.act((g) => g.playStone('s1'));
    run.act((g) => g.playOperator('op1'));
    run.act((g) => g.playStone('s2'));
    const result = run.act((g) => g.submitChain());

    expect(result.ok).toBe(true);
    expect(result.scoreGained).toBe(15);
  });

  it('supports Consumable spells like Magnet, Breaker, and Gild', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    run.money = 20;

    const magnet = SHOP_UPGRADES.find((u) => u.id === 'consumable_magnet')!;
    const gild = SHOP_UPGRADES.find((u) => u.id === 'consumable_gild')!;
    run.shopOffers = [
      { type: 'UPGRADE', item: magnet },
      { type: 'UPGRADE', item: gild },
    ];

    expect(run.buyItem(magnet.id).ok).toBe(true);
    expect(run.buyItem(gild.id).ok).toBe(true);
    expect(run.consumables).toEqual([magnet.id, gild.id]);

    run.startBlind('SMALL');

    // Use GILD consumable
    run.game.hand = [stone('s1', 3, 4)];
    const gildRes = run.useConsumable(1, 's1');
    expect(gildRes.ok).toBe(true);
    expect(run.game.hand[0].isGolden).toBe(true);

    // Place and submit to check Golden stone payout (+3 money)
    run.act((g) => g.playStone('s1'));
    const submitRes = run.act((g) => g.submitChain());
    expect(submitRes.ok).toBe(true);
    expect(run.money).toBe(16);

    // Use MAGNET to retrieve stone
    const magnetRes = run.useConsumable(0, 's1');
    expect(magnetRes.ok).toBe(true);
    expect(run.game.hand.some((s) => s.id === 's1')).toBe(true);
    expect(run.game.board.getRootNodeId()).toBeNull();
  });

  it('enforces Round 3 Boss Stage: Division operator forbidden', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.round = 3;
    run.startBlind('BOSS');
    run.game.hand = [stone('s1', 3, 4), stone('s2', 3, 6)];
    run.game.operatorHand = [{ id: 'op1', type: 'DIVIDE', symbol: '÷' }];

    run.act((g) => g.playStone('s1'));
    run.act((g) => g.playOperator('op1'));
    run.act((g) => g.playStone('s2'));
    const result = run.act((g) => g.submitChain());

    expect(result.ok).toBe(false);
    expect(result.error).toContain('bölme operatörü kullanılamaz');
  });

  it('enforces Round 6 Boss Stage: Precision target limit check', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.round = 6;
    run.currentTarget = 50;
    run.startBlind('BOSS');

    // Player submits a score that is WAY over target (75) + 15
    run.act((g) => {
      g.score = 95; // 95 > 75 + 15
    });

    const actionResult = run.act((g) => g.submitChain());
    expect(actionResult.ok).toBe(true);
    expect(run.game.status).toBe('LOST');
    expect(run.status).toBe('LOST');
  });
});
