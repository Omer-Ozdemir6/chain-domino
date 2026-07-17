import type { RoundRewardSummary } from '../../game/RunState.js';

interface RoundRewardScreenProps {
  reward: RoundRewardSummary;
  onContinue: () => void;
}

/**
 * The premium itemized money ledger shown after winning a blind, before the shop opens.
 * Recreates Balatro's satisfying "Cash Out" sequence with retro neon/pixel aesthetics
 * and clean layout details.
 */
export default function RoundRewardScreen({ reward, onContinue }: RoundRewardScreenProps) {
  return (
    <div className="w-full max-w-md my-auto rounded-3xl bg-slate-900 border-4 border-amber-600/80 p-6 md:p-8 shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.15)] text-white overflow-y-auto crt select-none animate-[chain-place_450ms_cubic-bezier(0.175,0.885,0.32,1.2)]">
      <h2 className="text-4xl md:text-5xl font-black font-pixel tracking-widest text-center text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 drop-shadow-[0_4px_6px_rgba(0,0,0,0.95)]">
        CASH OUT
      </h2>
      <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
        Kör Mağlubiyeti Payout Listesi
      </p>

      {/* Itemized list of earnings */}
      <div className="mt-6 bg-slate-950/80 rounded-2xl border border-slate-800/80 p-4 font-mono text-xs text-slate-300 space-y-2.5">
        {reward.lines.map((line, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-2 border-b border-slate-900/60 animate-charm-in-common"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <span className="text-slate-400 text-[11px] font-sans font-medium tracking-wide flex items-center gap-1.5">
              <span className="text-amber-500/80 select-none">✦</span> {line.label}
            </span>
            <span className="font-pixel text-base font-extrabold px-2.5 py-0.5 rounded-lg border text-emerald-400 bg-slate-950 border-emerald-950/30 shadow-[0_0_6px_rgba(16,185,129,0.1)]">
              +${line.amount}
            </span>
          </div>
        ))}

        {/* Total Cashout Row */}
        <div
          className="flex justify-between items-center pt-3 animate-charm-in-uncommon"
          style={{ animationDelay: `${reward.lines.length * 120}ms` }}
        >
          <span className="text-amber-300 font-pixel font-bold text-lg tracking-wider uppercase">Toplam Kazanılan</span>
          <span className="font-pixel text-2xl font-extrabold text-amber-300 bg-amber-950/20 px-4 py-1 rounded-xl border-2 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse">
            +${reward.total}
          </span>
        </div>
      </div>

      {/* Balance Summary Box */}
      <div className="mt-5 flex items-center justify-between bg-slate-950/40 rounded-xl p-3.5 border border-slate-850 shadow-inner">
        <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-widest font-sans">Mevcut Bakiye</span>
        <div className="flex items-center gap-3 font-pixel text-lg">
          <span className="text-slate-500 font-medium">${reward.moneyBefore}</span>
          <span className="text-slate-600 font-bold select-none">→</span>
          <span className="text-amber-400 font-bold text-xl drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]">${reward.moneyAfter}</span>
        </div>
      </div>

      {/* Glow action button */}
      <button
        type="button"
        onClick={onContinue}
        className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:translate-y-0.5 text-xs font-pixel font-bold text-white shadow-[0_4px_15px_rgba(16,185,129,0.25)] border-b-4 border-emerald-800 hover:scale-[1.02] transition cursor-pointer select-none tracking-widest uppercase"
      >
        🏪 MAĞAZAYA GEÇ (CONTINUE)
      </button>
    </div>
  );
}
