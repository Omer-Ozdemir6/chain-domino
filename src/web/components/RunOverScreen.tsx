import type { RunStatus } from '../../game/RunState.js';
import type { HandType } from '../../models/types.js';

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
  handTypePlayCounts: Record<HandType, number>;
  /** Jumps straight into a new run with the same deck/stake — no menu detour. */
  onNewRun: () => void;
  /** Returns to the title screen's deck/stake/chest picker. */
  onMainMenu: () => void;
}

const HAND_TYPE_LABEL: Record<HandType, string> = {
  STRAIGHT: 'Düz Zincir',
  BRANCHED: 'Çatallı Zincir',
  LOOP: 'Sonsuz Döngü',
};

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
  handTypePlayCounts,
  onNewRun,
  onMainMenu,
}: RunOverScreenProps) {
  const won = status === 'WON';
  const mostPlayedType = (Object.keys(handTypePlayCounts) as HandType[]).reduce(
    (best, type) => (handTypePlayCounts[type] > handTypePlayCounts[best] ? type : best),
    'STRAIGHT' as HandType
  );
  const mostPlayedCount = handTypePlayCounts[mostPlayedType];

  return (
    <div className="w-full max-w-md my-auto rounded-3xl bg-stone-900 border-4 border-stone-950 p-8 shadow-2xl text-white overflow-y-auto crt select-none animate-[fade-in_0.4s_ease-out]">
        {/* Balatro Marquee Game Over Title */}
        <h2 className={`text-5xl font-black font-pixel tracking-wider uppercase text-center drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] ${won ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`}>
          {won ? 'RUN KAZANILDI!' : 'GAME OVER'}
        </h2>
        <p className="text-center text-sm text-stone-500 font-bold uppercase tracking-wider mt-1">
          {won ? 'Tüm Ante Aşamaları Tamamlandı' : `Ante ${round}/${totalRounds} Aşamasında Elendiniz`}
        </p>

        {/* Gray-Blue Ledger Stats Grid */}
        <div className="mt-6 bg-stone-950/60 rounded-2xl border border-stone-800 p-4 font-mono text-sm text-stone-300 space-y-2">
          <div className="flex justify-between items-center py-1.5 border-b border-stone-800/40">
            <span className="text-stone-400">En İyi Zincir (Best Hand)</span>
            <span className="font-pixel text-emerald-400 text-base font-bold bg-stone-950 px-2 py-0.5 rounded border border-emerald-950">
              {bestHandScore} <span className="text-[13px] text-stone-400 font-sans uppercase">puan</span>
            </span>
          </div>

          {mostPlayedCount > 0 && (
            <div className="flex justify-between items-center py-1.5 border-b border-stone-800/40">
              <span className="text-stone-400">En Çok Oynanan Dizilim</span>
              <span className="text-stone-200 font-bold bg-stone-950 px-2 py-0.5 rounded border border-stone-900">
                {HAND_TYPE_LABEL[mostPlayedType]} <span className="text-stone-500">({mostPlayedCount})</span>
              </span>
            </div>
          )}

          <div className="flex justify-between items-center py-1.5 border-b border-stone-800/40">
            <span className="text-stone-400 font-medium">Oynanan Domino Taşları</span>
            <span className="text-stone-200 font-bold bg-stone-950 px-2 py-0.5 rounded border border-stone-900">
              {totalCardsPlayed}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-stone-800/40">
            <span className="text-stone-400">Harcanan Iskarta Sayısı</span>
            <span className="text-stone-200 font-bold bg-stone-950 px-2 py-0.5 rounded border border-stone-900">
              {totalCardsDiscarded}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-stone-800/40">
            <span className="text-stone-400">Mağaza Yenileme (Rerolls)</span>
            <span className="text-stone-200 font-bold bg-stone-950 px-2 py-0.5 rounded border border-stone-900">
              {totalRerolls}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-stone-800/40">
            <span className="text-stone-400">Satın Alınan Özellikler</span>
            <span className="text-stone-200 font-bold bg-stone-950 px-2 py-0.5 rounded border border-stone-900">
              {totalPurchases}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-stone-800/40">
            <span className="text-stone-400">Kalan Bakiye</span>
            <span className="text-amber-400 font-pixel text-base font-bold bg-stone-950 px-2 py-0.5 rounded border border-amber-950">
              ${money}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-stone-400">Seed</span>
            <span className="text-sm text-stone-500 font-bold uppercase tracking-wider bg-stone-950 px-2 py-0.5 rounded">
              DOMINO-RUN
            </span>
          </div>
        </div>

        {/* Defeated By / Badge Section */}
        <div className="mt-5 flex items-center justify-between bg-stone-950/40 rounded-xl p-3 border border-stone-850">
          <span className="text-sm text-stone-500 uppercase font-extrabold tracking-widest">
            {won ? 'KAZANILAN ZORLUK' : 'ELENDİĞİNİZ BLIND'}
          </span>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-lg border font-pixel text-sm font-bold uppercase text-white shadow-md ${won ? 'bg-emerald-600 border-emerald-500' : 'bg-red-700 border-red-500 animate-pulse'}`}>
              {won ? 'WHITE STAKE' : defeatedBy || 'BLIND'}
            </div>
          </div>
        </div>

        {/* Play Again Buttons (styled red-orange like screenshot) */}
        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            onClick={onNewRun}
            className="w-full py-3.5 rounded-xl bg-red-650 hover:bg-red-600 active:translate-y-0.5 text-sm font-pixel font-bold text-white shadow-lg border-b-4 border-red-850 transition uppercase"
          >
            YENİ RUN BAŞLAT (NEW RUN)
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 active:translate-y-0.5 text-sm font-pixel font-bold text-stone-350 border-b-4 border-stone-950 transition uppercase"
          >
            ANA MENÜYE DÖN (MAIN MENU)
          </button>
        </div>
    </div>
  );
}
