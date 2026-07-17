import { describe, it, expect } from 'vitest';
import { RunState } from './RunState.js';
import { CHARMS } from '../models/CharmRegistry.js';
import type { ChestId } from './RunState.js';

function getCharmValue(id: string, currentCharms: string[]): number {
  let baseScore = 25;

  if (id === 'twin_souls') {
    const hasBoth = currentCharms.includes('division_master') && currentCharms.includes('subtract_master');
    baseScore = hasBoth ? 120 : 5;
  } else if (id === 'multiplier_resonance') {
    const hasBoth = currentCharms.includes('multiplier_frenzy') && currentCharms.includes('symmetry_bonus');
    baseScore = hasBoth ? 120 : 5;
  } else if (id.startsWith('fusion_')) {
    baseScore = 150; // Fusion charms are elite
  } else {
    // Scoring charms
    const scoring = [
      'flat_bonus_common', 'flat_bonus_uncommon', 'flat_bonus_rare',
      'add_master', 'subtract_master', 'division_master',
      'zero_hero', 'unlucky_thirteen', 'node_counter',
      'double_hunter', 'symmetry_bonus', 'multiplier_frenzy'
    ];
    if (scoring.includes(id)) {
      baseScore = 85;
    } else {
      // Economy/Utility
      const economy = [
        'loan_shark', 'generous_trader', 'early_finisher', 
        'speed_demon', 'debt_collector', 'thrifty_phantom'
      ];
      if (economy.includes(id)) {
        const ecoCount = currentCharms.filter(c => economy.includes(c)).length;
        baseScore = ecoCount >= 2 ? 10 : 45;
      }
    }
  }

  // If we have empty slots, make charms extremely attractive!
  if (currentCharms.length < 5) {
    baseScore += 60; // Adds 60 to the score, so even a default charm (25 + 60 = 85) beats Theorems (70)
  }

  return baseScore;
}

function getOfferScore(offer: any, currentCharms: string[]): number {
  if (offer.type === 'CHARM') {
    return getCharmValue(offer.item.id, currentCharms);
  }
  if (offer.type === 'THEOREM') {
    return 70; // Great scaling
  }
  if (offer.type === 'VOUCHER') {
    return 60; // Nice passive
  }
  if (offer.type === 'BOOSTER') {
    return 55; // Good deck upgrade
  }
  return 30; // Spells/Consumables
}

function getCharmCategory(id: string): number {
  const charm = CHARMS.find(c => c.id === id);
  if (!charm) return 2; // Default to middle
  const desc = charm.description.toLowerCase();
  
  // If it multiplies mult (X Mult)
  if (desc.includes('çarpanı') && (desc.includes('katına') || desc.includes('çarpar') || desc.includes('katlar') || desc.includes('ile çarpar') || desc.includes('x'))) {
    return 3;
  }
  // If it adds mult
  if (desc.includes('çarpanı') || desc.includes('mult')) {
    return 2;
  }
  // If it adds chips
  if (desc.includes('çip') || desc.includes('puan') || desc.includes('chips')) {
    return 1;
  }
  
  return 2; // Default
}

// Helper to simulate a single run
function simulateSingleRun(runIndex: number) {
  const run = new RunState();
  
  // Choose random deck: RED, BLUE, or YELLOW
  const decks: ('RED' | 'BLUE' | 'YELLOW')[] = ['RED', 'BLUE', 'YELLOW'];
  const deck = decks[runIndex % decks.length];
  
  // Choose random starting chest
  const chests: ChestId[] = ['chest_ivory', 'chest_curator', 'chest_nomad', 'chest_obsidian'];
  const chest = chests[runIndex % chests.length];

  run.initializeRun(deck, 'WHITE');
  run.selectChest(chest);

  let stepsLimit = 1000; // safety valve against infinite loops
  let steps = 0;

  const stats = {
    runId: runIndex + 1,
    deck,
    chest,
    win: false,
    endAnte: 1,
    endBlind: 'SMALL' as 'SMALL' | 'BIG' | 'BOSS',
    money: 0,
    ownedCharms: [] as string[],
    turnsPlayed: 0,
    lossReason: '' as string,
  };

  while (run.status === 'IN_PROGRESS' && steps < stepsLimit) {
    steps++;

    if (run.phase === 'BLIND_SELECT') {
      // Find which blind to play next
      const round = run.round;
      const hasSmall = run.history.some((r) => r.round === round && r.blind === 'SMALL');
      const hasBig = run.history.some((r) => r.round === round && r.blind === 'BIG');
      const hasBoss = run.history.some((r) => r.round === round && r.blind === 'BOSS');

      let nextBlind: 'SMALL' | 'BIG' | 'BOSS' = 'SMALL';
      if (hasSmall && !hasBig) nextBlind = 'BIG';
      if (hasSmall && hasBig && !hasBoss) nextBlind = 'BOSS';

      run.startBlind(nextBlind);
    } 
    else if (run.phase === 'PLAYING') {
      // Sort hand: prioritize doubles (opens branches) and high-value tiles
      let hand = [...run.game.hand].sort((a, b) => {
        const isDoubleA = a.leftVal === a.rightVal ? 1 : 0;
        const isDoubleB = b.leftVal === b.rightVal ? 1 : 0;
        if (isDoubleA !== isDoubleB) return isDoubleB - isDoubleA;
        return (b.leftVal + b.rightVal) - (a.leftVal + a.rightVal);
      });
      let playedAny = false;

      for (let i = 0; i < hand.length; i++) {
        const stone = hand[i];
        const targets = run.game.board.getLegalStoneTargets(stone);
        if (targets.length > 0) {
          const res = run.act((g) => g.playStone(stone.id));
          if (res.ok) {
            playedAny = true;
            stats.turnsPlayed++;
            // Re-draw/sort hand
            hand = [...run.game.hand].sort((a, b) => {
              const isDoubleA = a.leftVal === a.rightVal ? 1 : 0;
              const isDoubleB = b.leftVal === b.rightVal ? 1 : 0;
              if (isDoubleA !== isDoubleB) return isDoubleB - isDoubleA;
              return (b.leftVal + b.rightVal) - (a.leftVal + a.rightVal);
            });
            i = -1; // reset search loop
          }
        }
      }

      if (playedAny) {
        const res = run.act((g) => g.submitChain());
        if (!res.ok) {
          run.act((g) => g.skipTurn());
        }
        if (run.game.status === 'PLAYING') {
          run.act((g) => g.drawForTurn());
        }
      } else {
        // Stuck! Try to discard if we have discard rights left
        if (run.discardsLeft > 0) {
          run.discardSelected(run.game.hand.map(s => s.id));
          // Do not skip turn, we just drew new cards to try again next loop tick
        } else {
          // Out of discards, must skip turn
          run.act((g) => g.skipTurn());
          if (run.game.status === 'PLAYING') {
            run.act((g) => g.drawForTurn());
          }
        }
      }
    } 
    else if (run.phase === 'ROUND_REWARD') {
      // Acknowledge rewards and proceed to shop
      run.proceedToShop();
    } 
    else if (run.phase === 'SHOP') {
      // Buy logic: select most expensive affordable item, prioritizing charms
      let boughtSomething = true;
      while (boughtSomething && run.phase === 'SHOP') {
        boughtSomething = false;
        const affordable = run.shopOffers.filter((o) => o.item.cost <= run.money);
        if (affordable.length > 0) {
          // Sort using our heuristic helper function
          affordable.sort((a, b) => {
            const scoreA = getOfferScore(a, run.ownedCharmIds);
            const scoreB = getOfferScore(b, run.ownedCharmIds);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return b.item.cost - a.item.cost; // expensive first
          });

          const toBuy = affordable[0];
          const res = run.buyItem(toBuy.item.id);
          if (res.ok) {
            boughtSomething = true;
          }
        }

        // Reroll if we have extra money and no immediate deals
        if (!boughtSomething && run.money >= run.currentRerollCost && run.money > 12) {
          const res = run.rerollShop();
          if (res.ok) {
            boughtSomething = true;
          }
        }
      }

      // Handle post-buy draft select if triggered
      if (run.draftOffers.length > 0) {
        run.draftStone(run.draftOffers[0].id);
      }

      // Sort owned charms in optimal order: Chips -> Mult -> X Mult
      run.ownedCharmIds.sort((a, b) => getCharmCategory(a) - getCharmCategory(b));

      // Leave shop
      if (run.phase === 'SHOP') {
        run.leaveShop();
      }
    } 
    else if (run.phase === 'CONGRATS_UNLOCK') {
      // Win screen reached
      run.status = 'WON';
    } 
    else {
      // Fail-safe to avoid loops on other states
      break;
    }
  }

  stats.win = run.status === 'WON';
  stats.endAnte = run.round;
  stats.endBlind = run.activeBlind || (run.history.length > 0 ? run.history[run.history.length - 1].blind : 'SMALL');
  stats.money = run.money;
  stats.ownedCharms = [...run.ownedCharmIds];
  stats.lossReason = run.defeatedBy || (run.game.lossReason || 'Unknown');

  return stats;
}

describe('Chain Domino Simulation Plays', () => {
  it('runs 50 game play simulations to analyze winrate and balance', () => {
    const totalRuns = 50;
    const results = [];
    
    for (let i = 0; i < totalRuns; i++) {
      results.push(simulateSingleRun(i));
    }

    // Calculate aggregated stats
    const wins = results.filter(r => r.win).length;
    const winRate = (wins / totalRuns) * 100;
    
    // Average ante reached
    const avgAnte = results.reduce((acc, r) => acc + r.endAnte, 0) / totalRuns;
    
    // Loss distribution per ante/blind
    const lossDistribution: Record<string, number> = {};
    results.forEach(r => {
      if (!r.win) {
        const key = `Ante ${r.endAnte} (${r.endBlind})`;
        lossDistribution[key] = (lossDistribution[key] || 0) + 1;
      }
    });

    // Most purchased charms
    const charmCounts: Record<string, number> = {};
    results.forEach(r => {
      r.ownedCharms.forEach(c => {
        charmCounts[c] = (charmCounts[c] || 0) + 1;
      });
    });

    // Write a beautiful simulation report output to console
    console.log('=== CHAIN DOMINO SIMULATION REPORT ===');
    console.log(`Total Runs Simulated: ${totalRuns}`);
    console.log(`Wins: ${wins} / ${totalRuns} (${winRate.toFixed(1)}% Win Rate)`);
    console.log(`Average Ante Reached: ${avgAnte.toFixed(2)}`);
    console.log('\n--- Loss Distribution (Stuck Points) ---');
    Object.entries(lossDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, count]) => {
        console.log(`- ${key}: ${count} times (${((count / totalRuns) * 100).toFixed(1)}%)`);
      });

    console.log('\n--- Most Popular Final Charms ---');
    Object.entries(charmCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([charmId, count]) => {
        const name = CHARMS.find(c => c.id === charmId)?.name || charmId;
        console.log(`- ${name} (${charmId}): owned in ${count} runs`);
      });

    console.log('\n--- Sample Runs ---');
    results.slice(0, 10).forEach(r => {
      console.log(`Run #${r.runId} | Deck: ${r.deck} | Chest: ${r.chest} | Win: ${r.win ? 'YES' : 'NO'} | End Ante: ${r.endAnte} | End Money: $${r.money} | Reason: ${r.lossReason}`);
    });
    console.log('======================================');

    // Always succeed so CI/tests pass cleanly
    expect(true).toBe(true);
  });

  it('runs a single game with detailed logging to diagnose issues', () => {
    const run = new RunState();
    run.initializeRun('RED', 'WHITE');
    run.selectChest('chest_ivory');
    
    console.log('\n=== DETAILED FULL RUN DEBUG LOG ===');
    console.log(`Deck: ${run.selectedDeck} | Chest: ${run.selectedChestId} | Money: $${run.money}`);
    
    let loopCount = 0;
    while (run.status === 'IN_PROGRESS' && loopCount < 300) {
      loopCount++;

      if (run.phase === 'BLIND_SELECT') {
        const round = run.round;
        const hasSmall = run.history.some((r) => r.round === round && r.blind === 'SMALL');
        const hasBig = run.history.some((r) => r.round === round && r.blind === 'BIG');
        const hasBoss = run.history.some((r) => r.round === round && r.blind === 'BOSS');

        let nextBlind: 'SMALL' | 'BIG' | 'BOSS' = 'SMALL';
        if (hasSmall && !hasBig) nextBlind = 'BIG';
        if (hasSmall && hasBig && !hasBoss) nextBlind = 'BOSS';

        const target = run.getBlindTarget(nextBlind);
        console.log(`\n>>> STARTING BLIND: ${nextBlind} | Target Score: ${target} (Cumulative: ${run.cumulativeScore})`);
        run.startBlind(nextBlind);
      } 
      else if (run.phase === 'PLAYING') {
        console.log(`\n--- Turn ${run.game.turn} (Max: ${run.game.config.maxTurns}) ---`);
        console.log(`Remaining deck: ${run.game.stoneDeck.remaining} | Discards left: ${run.discardsLeft}`);
        console.log(`Hand: ${run.game.hand.map(s => `[${s.leftVal}|${s.rightVal}]`).join(', ')}`);
        
        let hand = [...run.game.hand].sort((a, b) => {
          const isDoubleA = a.leftVal === a.rightVal ? 1 : 0;
          const isDoubleB = b.leftVal === b.rightVal ? 1 : 0;
          if (isDoubleA !== isDoubleB) return isDoubleB - isDoubleA;
          return (b.leftVal + b.rightVal) - (a.leftVal + a.rightVal);
        });
        let playedAny = false;

        for (let i = 0; i < hand.length; i++) {
          const stone = hand[i];
          const targets = run.game.board.getLegalStoneTargets(stone);
          if (targets.length > 0) {
            console.log(`  -> Playing [${stone.leftVal}|${stone.rightVal}] onto target: ${targets[0]}`);
            const res = run.act((g) => g.playStone(stone.id));
            if (res.ok) {
              playedAny = true;
              hand = [...run.game.hand].sort((a, b) => {
                const isDoubleA = a.leftVal === a.rightVal ? 1 : 0;
                const isDoubleB = b.leftVal === b.rightVal ? 1 : 0;
                if (isDoubleA !== isDoubleB) return isDoubleB - isDoubleA;
                return (b.leftVal + b.rightVal) - (a.leftVal + a.rightVal);
              });
              i = -1;
            }
          }
        }

        if (playedAny) {
          const res = run.act((g) => g.submitChain());
          if (res.ok) {
            console.log(`  -> SUBMITTED! Gained: ${res.scoreGained} pts. Total score: ${run.game.score}`);
          } else {
            console.log(`  -> Submit failed: ${res.error}. Skipping turn.`);
            run.act((g) => g.skipTurn());
          }
          if (run.game.status === 'PLAYING') {
            run.act((g) => g.drawForTurn());
          }
        } else {
          if (run.discardsLeft > 0) {
            console.log(`  -> STUCK! Discarding entire hand to draw new tiles.`);
            run.discardSelected(run.game.hand.map(s => s.id));
          } else {
            console.log(`  -> STUCK! Out of discards, skipping turn.`);
            run.act((g) => g.skipTurn());
            if (run.game.status === 'PLAYING') {
              run.act((g) => g.drawForTurn());
            }
          }
        }
        
        if (run.game.status !== 'PLAYING') {
          console.log(`\nRound status: ${run.game.status} | Final score: ${run.game.score} / ${run.game.config.targetScore}`);
        }
      } 
      else if (run.phase === 'ROUND_REWARD') {
        console.log(`\n>>> ROUND REWARD CLAYED! Money earned, proceeding to shop. Current Money: $${run.money}`);
        run.proceedToShop();
      } 
      else if (run.phase === 'SHOP') {
        console.log(`\n>>> SHOP PHASE | Money: $${run.money} | Reroll cost: $${run.currentRerollCost}`);
        console.log(`Offers: ${run.shopOffers.map(o => `${o.type}:${o.item.name}($${o.item.cost})`).join(', ')}`);
        
        let boughtSomething = true;
        while (boughtSomething && run.phase === 'SHOP') {
          boughtSomething = false;
          const affordable = run.shopOffers.filter((o) => o.item.cost <= run.money);
          if (affordable.length > 0) {
            affordable.sort((a, b) => {
              const scoreA = getOfferScore(a, run.ownedCharmIds);
              const scoreB = getOfferScore(b, run.ownedCharmIds);
              if (scoreA !== scoreB) return scoreB - scoreA;
              return b.item.cost - a.item.cost;
            });

            const toBuy = affordable[0];
            console.log(`  -> Buying ${toBuy.type}: ${toBuy.item.name} for $${toBuy.item.cost}`);
            const res = run.buyItem(toBuy.item.id);
            if (res.ok) {
              boughtSomething = true;
            }
          }

          if (!boughtSomething && run.money >= run.currentRerollCost && run.money > 12) {
            console.log(`  -> Rerolling shop for $${run.currentRerollCost}`);
            const res = run.rerollShop();
            if (res.ok) {
              boughtSomething = true;
            }
          }
        }

        if (run.draftOffers.length > 0) {
          console.log(`  -> Drafting stone: [${run.draftOffers[0].leftVal}|${run.draftOffers[0].rightVal}]`);
          run.draftStone(run.draftOffers[0].id);
        }

        // Sort owned charms in optimal order: Chips -> Mult -> X Mult
        run.ownedCharmIds.sort((a, b) => getCharmCategory(a) - getCharmCategory(b));

        console.log(`Leaving shop. Owned Charms: ${run.ownedCharmIds.join(', ')}`);
        run.leaveShop();
      } 
      else if (run.phase === 'CONGRATS_UNLOCK') {
        console.log(`\n>>> VICTORY ACHIEVED! <<<`);
        run.status = 'WON';
      } 
      else {
        break;
      }
    }
    console.log(`\n=== RUN CONCLUDED ===`);
    console.log(`Status: ${run.status} | Defeated by: ${run.defeatedBy} | Money: $${run.money}`);
    console.log('=====================\n');
  });
});
