import type { RunStatus } from '../../game/RunState.js';

interface RunOverScreenProps {
  status: Exclude<RunStatus, 'IN_PROGRESS'>;
  round: number;
  totalRounds: number;
  money: number;
  bestHandScore: number;
  totalCardsPlayed: number;
  totalCardsDiscarded: number;
  totalRerolls: number;
  totalPurchases: number;
  defeatedBy: string;
  onRestart: () => void;
}

export default function RunOverScreen({
  status,
  round,
  totalRounds,
  money,
  bestHandScore,
  totalCardsPlayed,
  totalCardsDiscarded,
  totalRerolls,
  totalPurchases,
  defeatedBy,
  onRestart,
}: RunOverScreenProps) {
  const won = status === 'WON';

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-4 overflow-y-auto crt select-none animate-[fade-in_0.4s_ease-out]">
      <div className="w-full max-w-md my-auto rounded-3xl bg-slate-900 border-4 border-slate-950 p-8 shadow-2xl text-white">
        
        {/* Balatro Marquee Game Over Title */}
        <h2 className={`text-4xl font-black font-pixel tracking-wider uppercase text-center drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] ${won ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`}>
          {won ? 'RUN KAZANILDI!' : 'GAME OVER'}
        </h2>
        <p className="text-center text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
          {won ? 'Tüm Ante Aşamaları Tamamlandı' : `Ante ${round}/${totalRounds} Aşamasında Elendiniz`}
        </p>

        {/* Gray-Blue Ledger Stats Grid */}
        <div className="mt-6 bg-slate-950/60 rounded-2xl border border-slate-800 p-4 font-mono text-xs text-slate-300 space-y-2">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
            <span className="text-slate-400">En İyi Zincir (Best Hand)</span>
            <span className="font-pixel text-emerald-400 text-sm font-bold bg-slate-950 px-2 py-0.5 rounded border border-emerald-950">
              {bestHandScore} <span className="text-[11px] text-slate-400 font-sans uppercase">puan</span>
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
            <span className="text-slate-400 font-medium">Oynanan Domino Taşları</span>
            <span className="text-slate-200 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
              {totalCardsPlayed}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
            <span className="text-slate-400">Harcanan Iskarta Sayısı</span>
            <span className="text-slate-200 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
              {totalCardsDiscarded}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
            <span className="text-slate-400">Mağaza Yenileme (Rerolls)</span>
            <span className="text-slate-200 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
              {totalRerolls}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
            <span className="text-slate-400">Satın Alınan Özellikler</span>
            <span className="text-slate-200 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
              {totalPurchases}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
            <span className="text-slate-400">Kalan Bakiye</span>
            <span className="text-amber-400 font-pixel text-sm font-bold bg-slate-950 px-2 py-0.5 rounded border border-amber-950">
              ${money}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-400">Seed</span>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded">
              DOMINO-RUN
            </span>
          </div>
        </div>

        {/* Defeated By / Badge Section */}
        <div className="mt-5 flex items-center justify-between bg-slate-950/40 rounded-xl p-3 border border-slate-850">
          <span className="text-xs text-slate-500 uppercase font-extrabold tracking-widest">
            {won ? 'KAZANILAN ZORLUK' : 'ELENDİĞİNİZ BLIND'}
          </span>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-lg border font-pixel text-xs font-bold uppercase text-white shadow-md ${won ? 'bg-emerald-600 border-emerald-500' : 'bg-red-700 border-red-500 animate-pulse'}`}>
              {won ? 'WHITE STAKE' : defeatedBy || 'BLIND'}
            </div>
          </div>
        </div>

        {/* Play Again Buttons (styled red-orange like screenshot) */}
        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3.5 rounded-xl bg-red-650 hover:bg-red-600 active:translate-y-0.5 text-xs font-pixel font-bold text-white shadow-lg border-b-4 border-red-850 transition uppercase"
          >
            YENİ RUN BAŞLAT (NEW RUN)
          </button>
          
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-xs font-pixel font-bold text-slate-350 border-b-4 border-slate-950 transition uppercase"
          >
            ANA MENÜYE DÖN (MAIN MENU)
          </button>
        </div>
      </div>
    </div>
  );
}
