import { createInterface } from 'node:readline';
import { GameState } from '../game/GameState.js';
import type { ChainElement } from '../models/types.js';

const config = {
  targetScore: 50,
  maxTurns: 6,
  stonesPerTurn: 3,
  operatorsPerTurn: 2,
};

const game = new GameState(config);
const rl = createInterface({ input: process.stdin, output: process.stdout });

function formatStone(id: number, l: number, r: number): string {
  return `[${id}] (${l}|${r})`;
}

function formatChain(chain: ReadonlyArray<ChainElement>): string {
  if (chain.length === 0) return '(boş)';
  return chain
    .map((el) => (el.type === 'STONE' ? `(${el.data.leftVal}|${el.data.rightVal})` : el.data.symbol))
    .join(' ');
}

function printState(): void {
  console.log('\n' + '='.repeat(50));
  console.log(`Tur ${game.turn}/${config.maxTurns}  |  Skor: ${game.score}/${config.targetScore}  |  Durum: ${game.status}`);
  console.log('Masa: ' + formatChain(game.board.getChain()));
  console.log('Elindeki taşlar:');
  game.hand.forEach((s, i) => console.log('  ' + formatStone(i, s.leftVal, s.rightVal)));
  console.log('Elindeki operatörler:');
  game.operatorHand.forEach((o, i) => console.log(`  [${i}] ${o.symbol}`));
  console.log('-'.repeat(50));
  console.log('Komutlar: d(çek)  s <n>(taş oyna)  o <n>(operatör oyna)  u(geri al)  c(hesapla/submit)  k(turu atla)  q(çık)');
}

function handleLine(input: string): void {
  const [cmd, argRaw] = input.trim().split(/\s+/);
  const arg = Number(argRaw);

  switch (cmd) {
    case 'd':
      game.drawForTurn();
      break;
    case 's': {
      const target = game.hand[arg];
      if (!target) {
        console.log('Geçersiz taş numarası.');
        break;
      }
      const result = game.playStone(target.id);
      if (!result.ok) console.log('Hata: ' + result.error);
      break;
    }
    case 'o': {
      const target = game.operatorHand[arg];
      if (!target) {
        console.log('Geçersiz operatör numarası.');
        break;
      }
      const result = game.playOperator(target.id);
      if (!result.ok) console.log('Hata: ' + result.error);
      break;
    }
    case 'u': {
      const result = game.undoLastMove();
      if (!result.ok) console.log('Hata: ' + result.error);
      break;
    }
    case 'c': {
      const result = game.submitChain();
      if (!result.ok) {
        console.log('Zincir geçersiz: ' + result.error);
      } else {
        console.log(`Zincir çözüldü! +${result.scoreGained} puan.`);
        result.steps?.forEach((step) => console.log('  ' + step));
        if (game.status === 'PLAYING') game.drawForTurn();
      }
      break;
    }
    case 'k':
      game.skipTurn();
      if (game.status === 'PLAYING') game.drawForTurn();
      break;
    case 'q':
      rl.close();
      return;
    default:
      console.log('Bilinmeyen komut.');
  }

  if (game.status !== 'PLAYING') {
    printState();
    console.log(game.status === 'WON' ? '\nKazandın!' : '\nKaybettin.');
    rl.close();
    return;
  }

  printState();
  rl.prompt();
}

console.log('CHAIN - Domino Zincir Prototipi');
console.log(`Hedef: ${config.targetScore} puan, ${config.maxTurns} tur içinde.`);
game.drawForTurn();
printState();
rl.setPrompt('> ');
rl.prompt();
rl.on('line', handleLine);
rl.on('close', () => process.exit(0));
