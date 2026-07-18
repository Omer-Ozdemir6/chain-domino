import { useEffect, useRef, useState } from 'react';
import type { RoundRewardSummary } from '../../game/RunState.js';
import { playSound } from './SoundSynth.js';

interface RoundRewardScreenProps {
  reward: RoundRewardSummary;
  onContinue: () => void;
}

// Deliberately slow stagger between each payout line — this is a "read what you actually
// earned, one line at a time" moment, not a snappy confirmation.
const ROW_STAGGER_MS = 750;
const START_DELAY_MS = 400;
const TICK_MS = 380;

/**
 * The premium itemized money ledger shown after winning a blind, before the shop opens.
 * Recreates Balatro's satisfying "Cash Out" sequence — a drawer that drops down from the top
 * edge of the game screen, each payout line sliding in one at a time, with the wallet total at
 * the top ticking up live as every line lands (not a static before→after swap at the end).
 */
export default function RoundRewardScreen({ reward, onContinue }: RoundRewardScreenProps) {
  const [runningBalance, setRunningBalance] = useState(reward.moneyBefore);
  const [coinBurst, setCoinBurst] = useState(0);
  const [buttonReady, setButtonReady] = useState(false);
  const balanceRef = useRef(reward.moneyBefore);

  const totalDelay = START_DELAY_MS + reward.lines.length * ROW_STAGGER_MS;
  const buttonDelay = totalDelay + 500;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let rafId: number;

    reward.lines.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          playSound('pulse', i);
          setCoinBurst((k) => k + 1);
          const start = balanceRef.current;
          const target = start + line.amount;
          const startTime = performance.now();
          const tick = () => {
            const progress = Math.min(1, (performance.now() - startTime) / TICK_MS);
            const eased = progress * (2 - progress);
            setRunningBalance(Math.round(start + (target - start) * eased));
            if (progress < 1) {
              rafId = requestAnimationFrame(tick);
            } else {
              balanceRef.current = target;
            }
          };
          rafId = requestAnimationFrame(tick);
        }, START_DELAY_MS + i * ROW_STAGGER_MS)
      );
    });

    timers.push(setTimeout(() => setButtonReady(true), buttonDelay));

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-xl max-h-[85vh] rounded-b-3xl bg-stone-900 border-4 border-t-0 border-amber-600/80 p-8 md:p-10 shadow-[0_25px_45px_rgba(0,0,0,0.85)] text-white overflow-y-auto crt select-none animate-panel-drop reward-fade-mask">
      <h2 className="text-6xl md:text-7xl font-black font-pixel tracking-widest text-center text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 drop-shadow-[0_4px_6px_rgba(0,0,0,0.95)]">
        CASH OUT
      </h2>
      <p className="text-center text-sm text-stone-500 font-bold uppercase tracking-widest mt-2">
        Kör Mağlubiyeti Payout Listesi
      </p>

      {/* Live wallet readout — ticks up in real time as each line below lands, instead of a
          static before→after swap once everything's already finished. */}
      <div className="mt-6 flex items-center justify-center gap-3 bg-stone-950/60 rounded-2xl border-2 border-amber-700/40 py-4 relative">
        <span className="text-3xl">💰</span>
        <span key={runningBalance} className="font-pixel text-5xl font-black text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-number-pop">
          ${runningBalance}
        </span>
        {coinBurst > 0 && (
          <span key={coinBurst} className="absolute -top-2 right-1/3 text-xl animate-tile-chip-pop pointer-events-none">🪙</span>
        )}
      </div>

      {/* Itemized list of earnings — each row slides in from the left, one at a time, so the
          player sees WHERE the money came from before the total appears. */}
      <div className="mt-6 bg-stone-950/80 rounded-2xl border border-stone-800/80 p-5 font-mono text-base text-stone-300 space-y-3">
        {reward.lines.map((line, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-2 border-b border-stone-900/60 animate-slide-in-row"
            style={{ animationDelay: `${START_DELAY_MS + i * ROW_STAGGER_MS}ms` }}
          >
            <span className="text-stone-400 text-[15px] font-sans font-medium tracking-wide flex items-center gap-1.5">
              <span className="text-amber-500/80 select-none">✦</span> {line.label}
            </span>
            <span className="font-pixel text-xl font-extrabold px-3 py-1 rounded-lg border text-emerald-400 bg-stone-950 border-emerald-950/30 shadow-[0_0_6px_rgba(16,185,129,0.1)]">
              +${line.amount}
            </span>
          </div>
        ))}

        {/* Subtotal — only pops in once every line above has already landed in the wallet. */}
        <div
          className="flex justify-between items-center pt-3 animate-charm-in-uncommon"
          style={{ animationDelay: `${totalDelay}ms` }}
        >
          <span className="text-amber-300 font-pixel font-bold text-2xl tracking-wider uppercase">Toplam Kazanılan</span>
          <span className="font-pixel text-4xl font-extrabold text-amber-300 bg-amber-950/20 px-5 py-1.5 rounded-xl border-2 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            +${reward.total}
          </span>
        </div>
      </div>

      {/* Glow action button — breathes gently once the whole ledger has told its story, inviting
          the player into the shop. */}
      <button
        type="button"
        onClick={onContinue}
        disabled={!buttonReady}
        className="mt-8 w-full py-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:translate-y-0.5 text-base font-pixel font-bold text-white shadow-[0_4px_15px_rgba(16,185,129,0.25)] border-b-4 border-emerald-800 hover:scale-[1.02] transition cursor-pointer select-none tracking-widest uppercase disabled:opacity-0 animate-charm-in-common animate-score-pulse"
        style={{ animationDelay: `${buttonDelay}ms` }}
      >
        🏪 DÜKKANA GİR
      </button>
    </div>
  );
}
