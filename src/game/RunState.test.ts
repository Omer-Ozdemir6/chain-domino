import { describe, it, expect } from 'vitest';
import { RunState, SHOP_UPGRADES, BOOSTER_PACKS, RUNE_PACKS, RUNE_POOL } from './RunState.js';
import { CHARMS } from '../models/CharmRegistry.js';
import type { DominoStone } from '../models/types.js';

const stone = (id: string, l: number, r: number): DominoStone => ({ id, leftVal: l, rightVal: r });

function playAndWinBlind(run: RunState, type: 'SMALL' | 'BIG' | 'BOSS') {
  run.startBlind(type);
  run.act((g) => {
    g.score = run.getBlindTarget(type);
  });
  run.act((g) => g.skipTurn());
  expect(run.phase).toBe('ROUND_REWARD');
  run.proceedToShop();
  expect(run.phase).toBe('SHOP');
  run.leaveShop();
}

describe('RunState', () => {
  it('starts with start screen default', () => {
    const run = new RunState();
    expect(run.round).toBe(1);
    expect(run.currentTarget).toBe(300);
    expect(run.money).toBe(4);
    expect(run.phase).toBe('START_SCREEN');
  });

  it("the Küratörün Çantası starting chest's maxCharmSlots and 0 starting money are applied correctly", () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.selectChest('chest_curator');
    expect(run.config.maxCharmSlots).toBe(6);
    expect(run.money).toBe(0);
  });

  it('grows the target 300 -> 690 -> 1590 -> 3650 -> 8400 -> 19300 -> 44400 -> 102200 across 8 antes', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    const seen = [run.currentTarget];
    for (let i = 0; i < 7; i++) {
      playAndWinBlind(run, 'SMALL');
      playAndWinBlind(run, 'BIG');
      playAndWinBlind(run, 'BOSS');
      seen.push(run.currentTarget);
    }
    expect(seen).toEqual([300, 690, 1590, 3650, 8400, 19300, 44400, 102200]);
  });

  it('computes round payout as base + unused-turn bonus + interest', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.startBlind('SMALL');
    run.act((g) => {
      g.score = run.getBlindTarget('SMALL');
    });
    // simulate 2 used turns (turn is 3, so 3-1 = 2 used)
    run.game.turn = 3;
    const moneyBefore = run.money;
    run.act((g) => g.skipTurn());

    expect(run.phase).toBe('ROUND_REWARD');
    run.proceedToShop();
    expect(run.phase).toBe('SHOP');
    // small blind reward = 3.
    // turns left = 6 - 3 = 3. (adds +3 since skipTurn increments turn from 3 to 4)
    // interest = floor(4/5) = 0.
    // total payout = 3 + 3 = 6.
    expect(run.money - moneyBefore).toBe(6);
  });

  it("a round-end charm's onRoundEnd hook actually pays out on completeRound", () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.ownedCharmIds = ['generous_trader']; // flat +$5 every round
    run.startBlind('SMALL');
    run.act((g) => {
      g.score = run.getBlindTarget('SMALL');
    });
    run.game.turn = 6; // 0 turns left, 0 interest bonus
    const moneyBefore = run.money;
    run.act((g) => g.skipTurn());

    expect(run.phase).toBe('ROUND_REWARD');
    run.proceedToShop();
    expect(run.phase).toBe('SHOP');
    // small blind reward = 3, turnsLeft = 0, interest = 0, charm bonus = 5.
    expect(run.money - moneyBefore).toBe(8);
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
    // Balatro-style trimmed shop: 2 charms + 2 pack slots + 1 upgrade/theorem slot always,
    // plus a voucher that only shows up some of the time — so the count varies visit to visit.
    expect(run.shopOffers.length).toBeGreaterThanOrEqual(5);
    expect(run.shopOffers.length).toBeLessThanOrEqual(6);
  });

  it('booster pack drafting can be skipped without drafting a stone', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    run.money = 20;
    run.shopOffers = [{ type: 'BOOSTER', item: BOOSTER_PACKS[0] }];
    const deckSizeBefore = run.customDeck.length;

    expect(run.buyItem(BOOSTER_PACKS[0].id).ok).toBe(true);
    expect(run.draftOffers).toHaveLength(3);

    expect(run.skipDraft().ok).toBe(true);
    expect(run.draftOffers).toHaveLength(0);
    expect(run.activeBoosterId).toBeNull();
    expect(run.customDeck).toHaveLength(deckSizeBefore); // nothing was added
  });

  it('rune pack: buy -> pick 1 of 3 -> apply to K existing deck stones -> back to normal shop', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    run.money = 20;
    run.customDeck = [stone('d1', 1, 1), stone('d2', 2, 2), stone('d3', 3, 3)];
    run.shopOffers = [{ type: 'RUNE_PACK', item: RUNE_PACKS[0] }];

    expect(run.buyItem(RUNE_PACKS[0].id).ok).toBe(true);
    expect(run.runeOffers).toHaveLength(3);
    run.runeOffers[0] = { ...RUNE_POOL[0] }; // Force slot 0 to be Ivory to prevent test flakiness (25% fail rate)

    const ivoryRune = run.runeOffers.find((r) => r.modifier === 'IVORY')!;
    expect(run.chooseRuneOption(ivoryRune.id).ok).toBe(true);
    expect(run.runeOffers).toHaveLength(0);
    expect(run.pendingRune?.id).toBe(ivoryRune.id);

    const applyFail = run.applyRune(['d1', 'd2', 'd3']); // exceeds targetCount (2)
    expect(applyFail.ok).toBe(false);

    const applyOk = run.applyRune(['d1', 'd2']);
    expect(applyOk.ok).toBe(true);
    expect(run.customDeck.find((s) => s.id === 'd1')!.modifier).toBe('IVORY');
    expect(run.customDeck.find((s) => s.id === 'd2')!.modifier).toBe('IVORY');
    expect(run.customDeck.find((s) => s.id === 'd3')!.modifier).toBeUndefined();
    expect(run.pendingRune).toBeNull();
  });

  it('rune pack can be skipped either before or after picking an option, with no refund', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    run.money = 20;
    run.shopOffers = [{ type: 'RUNE_PACK', item: RUNE_PACKS[0] }];
    run.buyItem(RUNE_PACKS[0].id);
    const moneyAfterBuy = run.money;

    expect(run.skipRunePack().ok).toBe(true);
    expect(run.runeOffers).toHaveLength(0);
    expect(run.money).toBe(moneyAfterBuy); // no refund
  });

  it('an owned charm actually modifies the chips×mult result of a real submission', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    // cosmic_pendulum: chain length >= 4 gives +4 mult.
    run.ownedCharmIds = ['cosmic_pendulum'];
    run.startBlind('SMALL');

    run.game.hand = [
      stone('s1', 1, 1),
      stone('s2', 1, 2),
      stone('s3', 2, 3),
      stone('s4', 3, 4),
      stone('s5', 4, 5),
    ];
    run.act((g) => g.playStone('s1'));
    run.act((g) => g.playStone('s2'));
    run.act((g) => g.playStone('s3'));
    run.act((g) => g.playStone('s4'));
    run.act((g) => g.playStone('s5'));
    const result = run.act((g) => g.submitChain());

    expect(result.ok).toBe(true);
    // chips: 15 (base) + (2 + 3 + 5 + 7 + 9) = 41. mult: 1 (base) * 3 = 3 -> 123.
    // Plus the +5 hand-emptied bonus: all 5 placed stones equal stonesPerTurn (5), so the whole
    // hand was played out before submitting.
    expect(result.scoreGained).toBe(128);
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

    // Use MAGNET to retrieve an unsubmitted leaf stone straight off the board. Under "Gönder ve
    // Sil" nothing stays frozen on the board between hands (s1 is already gone — scored and
    // cleared), so Magnet's real use case is pulling back a stone from the in-progress,
    // not-yet-submitted chain, which works regardless of frozen state (removeNode() only cares
    // whether the node is a leaf).
    run.game.hand = [stone('s2', 5, 6)];
    run.act((g) => g.playStone('s2'));
    const magnetRes = run.useConsumable(0, 's2');
    expect(magnetRes.ok).toBe(true);
    expect(run.game.hand.some((s) => s.id === 's2')).toBe(true);
    expect(run.game.board.getRootNodeId()).toBeNull();
  });

  it('Round 1 Boss (Kör Kadı) silences every owned charm when an odd-pip stone is in the chain', () => {
    // BOSS_BLINDS[0] (round 1's boss) is boss_blind_judge.
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.ownedCharmIds = ['cosmic_pendulum']; // would add +4 mult if it triggered
    run.round = 1;
    run.startBlind('BOSS');
    run.game.hand = [
      stone('s1', 1, 1), // sum 2, even
      stone('s2', 1, 3), // sum 4, even
      stone('s3', 3, 4), // sum 7, ODD — triggers Kör Kadı's silence
      stone('s4', 4, 2), // sum 6, even
    ];

    run.act((g) => g.playStone('s1'));
    run.act((g) => g.playStone('s2'));
    run.act((g) => g.playStone('s3'));
    run.act((g) => g.playStone('s4'));
    const result = run.act((g) => g.submitChain());

    expect(result.ok).toBe(true);
    // chips: 2+4+7+6 = 19, mult stays 1 (charm silenced) -> 19, not 19*5. No hand-emptied
    // bonus: stonesPerTurn is 5, and only 4 stones were drawn/played this turn.
    expect(result.scoreGained).toBe(34);
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

  it('supports Starting Chest selections and applies their rewards', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');

    const originalDeckLen = run.customDeck.length;
    const res = run.selectChest('chest_nomad');
    expect(res.ok).toBe(true);
    expect(run.hasNomadDiscount).toBe(true);
    expect(run.customDeck.length).toBeLessThan(originalDeckLen);
    expect(run.customDeck.every(s => s.leftVal < 5 && s.rightVal < 5)).toBe(true);
  });

  it('supports Charm Fusion: combines cosmic_pendulum and heart_matryoshka', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    run.money = 20;

    // Manually add the two target charms to the owned array
    run.ownedCharmIds = ['cosmic_pendulum', 'heart_matryoshka'];

    const fuseRes = run.attemptFusion('cosmic_pendulum', 'heart_matryoshka');
    expect(fuseRes.ok).toBe(true);
    expect(run.ownedCharmIds).toEqual(['fusion_grand_resonance']);
    expect(run.money).toBe(17); // $20 - $3 cost
  });

  it('supports Consumable spell consumable_trash (Parçalama Ritüeli)', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.phase = 'SHOP';
    
    // Add consumable_trash to list
    run.consumables = ['consumable_trash'];
    
    run.startBlind('SMALL');
    
    // Add stone to hand
    const initialDeckSize = run.customDeck.length;
    const targetStone = run.game.hand[0];
    const targetStoneId = targetStone.id;
    
    const res = run.useConsumable(0, targetStoneId);
    expect(res.ok).toBe(true);
    expect(run.game.hand.some(s => s.id === targetStoneId)).toBe(false);
    expect(run.customDeck.some(s => s.id === targetStoneId)).toBe(false);
    expect(run.customDeck.length).toBe(initialDeckSize - 1);
  });

  describe('Faz 10: İmza Tılsımlar — active/interactive charms', () => {
    it("Küratörün Çekici splits a hand stone into two blank-backed halves", () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.ownedCharmIds = ['curators_gavel'];
      run.startBlind('SMALL');
      run.game.hand = [stone('s1', 3, 5)];

      const res = run.useActiveCharm('curators_gavel', 's1');
      expect(res.ok).toBe(true);
      expect(run.game.hand).toHaveLength(2);
      expect(run.game.hand.map((s) => [s.leftVal, s.rightVal])).toEqual([[3, 0], [5, 0]]);
    });

    it("Simyacı Aynası swaps a hand stone's two ends", () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.ownedCharmIds = ['alchemists_mirror'];
      run.startBlind('SMALL');
      run.game.hand = [stone('s1', 3, 5)];

      const res = run.useActiveCharm('alchemists_mirror', 's1');
      expect(res.ok).toBe(true);
      expect(run.game.hand[0].leftVal).toBe(5);
      expect(run.game.hand[0].rightVal).toBe(3);
    });

    it('interactive charms can only be used once per turn', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.ownedCharmIds = ['alchemists_mirror'];
      run.startBlind('SMALL');
      run.game.hand = [stone('s1', 3, 5), stone('s2', 1, 2)];

      expect(run.useActiveCharm('alchemists_mirror', 's1').ok).toBe(true);
      const second = run.useActiveCharm('alchemists_mirror', 's2');
      expect(second.ok).toBe(false);
    });

    it("Kozmik Karadelik switches the board to SEQUENCE matching for the whole round", () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.ownedCharmIds = ['cosmic_singularity'];
      run.startBlind('SMALL');
      run.game.hand = [stone('s1', 3, 4), stone('s2', 5, 9)];

      run.act((g) => g.playStone('s1'));
      // Classic pip-matching would need a "4"; SEQUENCE mode instead needs "5" (4 -> 5).
      const result = run.act((g) => g.playStone('s2'));
      expect(result.ok).toBe(true);
    });

    it('Zamanı Büken Sarkaç rescues a losing final submission with a rewind + free draw', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.ownedCharmIds = ['chrono_pendulum'];
      run.startBlind('SMALL');
      run.game.hand = [stone('s1', 1, 1)];
      run.act((g) => g.playStone('s1'));
      run.game.turn = 6; // RED deck's last turn (maxTurns = 6)

      const result = run.act((g) => g.submitChain());

      expect(result.ok).toBe(true);
      expect(run.phase).toBe('PLAYING'); // rescued, not RUN_OVER_SCREEN
      expect(run.status).toBe('IN_PROGRESS');
      expect(run.game.status).toBe('PLAYING');
      // s1 was already scored and cleared by submitChain's own "Gönder ve Sil" — there's nothing
      // left on the board to claw back. The rescue instead refunds the turn itself + a free draw.
      expect(run.game.board.getRootNodeId()).toBeNull();
      expect(run.game.turn).toBe(6); // incremented to 7 by submitChain, then refunded by the rescue
      expect(run.game.hand).toHaveLength(1); // just the 1 free draw
    });
  });

  describe('Tılsım Aşınması ve Yeni Büyü Testleri', () => {
    it('supports charm durability degradation across rounds and perishing when it hits 0', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      
      // Buy/add a perishable charm
      run.ownedCharmIds = ['cracked_hourglass'];
      run.charmDurability['cracked_hourglass'] = 2; // set to 2 rounds left
      
      run.startBlind('SMALL');
      // Simulate win
      run.game.score = run.currentTarget + 10;
      run.game.status = 'WON';
      run.act((g) => g.submitChain()); // triggers completeRound

      expect(run.ownedCharmIds).toContain('cracked_hourglass');
      expect(run.charmDurability['cracked_hourglass']).toBe(1);

      // Next round win
      run.proceedToShop();
      run.leaveShop();
      run.startBlind('BIG');
      run.game.score = run.currentTarget + 10;
      run.game.status = 'WON';
      run.act((g) => g.submitChain());

      // Durability hit 0, must perish and get removed
      expect(run.ownedCharmIds).not.toContain('cracked_hourglass');
      expect(run.charmDurability['cracked_hourglass']).toBeUndefined();
      expect(run.perishedCharmMessage).toContain('Çatlak Kum Saati');
    });

    it('supports new spell Mistik Makas (consumable_scissors) to split chains', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.startBlind('SMALL');
      
      run.game.hand = [stone('s1', 2, 2), stone('s2', 2, 3)];
      run.act(g => g.playStone('s1'));
      run.act(g => g.playStone('s2', 's1#1'));
      
      const edge = run.game.board.getEdges()[0];
      expect(edge).toBeDefined();

      run.consumables = ['consumable_scissors'];
      const useRes = run.useConsumable(0, edge.edgeId);
      expect(useRes.ok).toBe(true);
      expect(run.game.board.getEdges()).toHaveLength(0);
      
      // Parent/child slots must be opened back
      const parentNode = (run.game.board as any).nodes.get('s1');
      const childNode = (run.game.board as any).nodes.get('s2');
      expect(parentNode.slots[1].state).toBe('OPEN');
      expect(childNode.slots[0].state).toBe('OPEN');
    });

    it('supports new spell Tozlu Büyüteç (consumable_magnifier) to double pip values', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.startBlind('SMALL');
      run.game.hand = [stone('s1', 3, 4)];
      run.customDeck = [stone('s1', 3, 4)];
      
      run.consumables = ['consumable_magnifier'];
      const useRes = run.useConsumable(0, 's1');
      expect(useRes.ok).toBe(true);
      expect(run.game.hand[0].leftVal).toBe(6);
      expect(run.game.hand[0].rightVal).toBe(8);
      expect(run.customDeck[0].leftVal).toBe(6);
      expect(run.customDeck[0].rightVal).toBe(8);
    });

    it('supports new spell Dönüşüm İksiri (consumable_transmute) to make a stone double', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.startBlind('SMALL');
      run.game.hand = [stone('s1', 2, 5)];
      
      run.consumables = ['consumable_transmute'];
      const useRes = run.useConsumable(0, 's1');
      expect(useRes.ok).toBe(true);
      expect(run.game.hand[0].leftVal).toBe(2);
      expect(run.game.hand[0].rightVal).toBe(2);
    });

    it('supports new spell Uğurlu Yonca (consumable_clover) to gild all hand stones', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.startBlind('SMALL');
      run.game.hand = [stone('s1', 2, 3), stone('s2', 4, 4)];
      
      run.consumables = ['consumable_clover'];
      const useRes = run.useConsumable(0, '');
      expect(useRes.ok).toBe(true);
      expect(run.game.hand[0].isGolden).toBe(true);
      expect(run.game.hand[1].isGolden).toBe(true);
    });

    it('supports new spell Geliştirme Parşömeni (consumable_upgrade) to add +2 points up to max 6', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.startBlind('SMALL');
      run.game.hand = [stone('s1', 2, 5)];
      run.customDeck = [stone('s1', 2, 5)];
      
      run.consumables = ['consumable_upgrade'];
      const useRes = run.useConsumable(0, 's1');
      expect(useRes.ok).toBe(true);
      expect(run.game.hand[0].leftVal).toBe(4);
      expect(run.game.hand[0].rightVal).toBe(6); // 5 + 2 capped at 6 -> 6!
      expect((run.game.hand[0] as any).leftUpgrade).toBe(2);
      expect((run.game.hand[0] as any).rightUpgrade).toBe(1); // capped at 6, so added 1
    });
  });

  describe('Faz 11: previewScoreSteps stone-by-stone reveal', () => {
    it('builds a running chip total one stone at a time, matching computeStoneChips exactly', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.startBlind('SMALL');

      const stones = [stone('s1', 3, 4), stone('s2', 1, 2)]; // chips: 7, then 3 -> running 7, 10
      const result = run.previewScoreSteps(stones);

      expect(result.stoneSteps).toHaveLength(2);
      expect(result.stoneSteps[0]).toMatchObject({ id: 's1', chipDelta: 7, chipsAfter: result.handStartChips + 7 });
      expect(result.stoneSteps[1]).toMatchObject({ id: 's2', chipDelta: 3, chipsAfter: result.handStartChips + 10 });
      // The last stone step's running total must match the aggregate baseChips calculateScore produces.
      expect(result.stoneSteps[result.stoneSteps.length - 1].chipsAfter).toBe(result.baseChips);
    });
  });

  describe('StartScreen challenges', () => {
    it('ch_no_charms drops maxCharmSlots to 0 and a normal run afterward restores it', () => {
      const run = new RunState({ maxCharmSlots: 4 });
      run.initializeRun('RED', 'WHITE', 'ch_no_charms');
      expect(run.config.maxCharmSlots).toBe(0);

      run.initializeRun('RED', 'WHITE', null);
      expect(run.config.maxCharmSlots).toBe(4);
    });

    it('ch_doubles_only leaves nothing but doubles in the starting deck', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE', 'ch_doubles_only');
      expect(run.customDeck.length).toBeGreaterThan(0);
      expect(run.customDeck.every((s) => s.leftVal === s.rightVal)).toBe(true);
    });

    it('ch_golden_rush starts every stone golden and doubles every blind target', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE', 'ch_golden_rush');
      expect(run.customDeck.every((s) => s.isGolden)).toBe(true);
      run.startBlind('SMALL');
      const normalRun = new RunState();
      normalRun.initializeRun('RED', 'WHITE', null);
      normalRun.startBlind('SMALL');
      expect(run.game.config.targetScore).toBe(normalRun.game.config.targetScore * 2);

      // A subsequent normal run must not inherit the doubled target.
      run.initializeRun('RED', 'WHITE', null);
      run.startBlind('SMALL');
      expect(run.game.config.targetScore).toBe(normalRun.game.config.targetScore);
    });

    it('ch_speed_chain disables branching on the board', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE', 'ch_speed_chain');
      run.startBlind('SMALL');
      expect(run.game.board.isBranchingEnabled()).toBe(false);

      run.initializeRun('RED', 'WHITE', null);
      run.startBlind('SMALL');
      expect(run.game.board.isBranchingEnabled()).toBe(true);
    });
  });

  describe('toSnapshot / fromSnapshot (localStorage persistence)', () => {
    it('round-trips a shop-phase run through JSON, preserving wallet/charms/deck', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.phase = 'SHOP';
      run.money = 42;
      run.ownedCharmIds = ['division_master', 'chain_end_interest'];
      run.round = 3;

      const restored = RunState.fromSnapshot(JSON.parse(JSON.stringify(run.toSnapshot())));

      expect(restored.money).toBe(42);
      expect(restored.ownedCharmIds).toEqual(['division_master', 'chain_end_interest']);
      expect(restored.round).toBe(3);
      expect(restored.phase).toBe('SHOP');
      expect(restored.customDeck).toEqual(run.customDeck);
      // A restored run must still be playable — sellCharm needs SHOP phase + a live money field.
      expect(restored.sellCharm('division_master').ok).toBe(true);
    });

    it('round-trips a mid-hand board (a placed, not-yet-submitted stone) through JSON', () => {
      const run = new RunState();
      run.initializeRun('RED', 'WHITE');
      run.startBlind('SMALL');
      const first = run.game.hand[0];
      run.act((g) => g.playStone(first.id, 'ROOT'));

      const restored = RunState.fromSnapshot(JSON.parse(JSON.stringify(run.toSnapshot())));

      expect(restored.game.board.getNodes()).toHaveLength(1);
      expect(restored.game.board.getRootNodeId()).toBe(run.game.board.getRootNodeId());
      expect(restored.game.hand.map((s) => s.id)).toEqual(run.game.hand.map((s) => s.id));
      expect(restored.game.turn).toBe(run.game.turn);
    });

    it('an empty save (never past START_SCREEN) has no game to snapshot and does not crash', () => {
      const run = new RunState();
      const snap = run.toSnapshot();
      expect(snap.game).toBeNull();
    });
  });
});
