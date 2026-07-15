import type { GameStatus } from '../../game/GameState.js';
import InfoTooltip from './InfoTooltip.js';

interface SidebarHUDProps {
  round: number;
  totalRounds: number;
  money: number;
  turn: number;
  maxTurns: number;
  score: number;
  targetScore: number;
  status: GameStatus;

  // Additional Roguelike details
  operatorLevels?: Record<string, number>;
  discardsLeft?: number;

  /** True while the step-by-step scoring animation is rolling the score upward. */
  scoring?: boolean;

  // Controls
  canSubmit: boolean;
  /** True once every open operator on the board has a closing stone — no dangling connections. */
  formulaComplete?: boolean;
  /** True when there's actually new, unscored work ready to submit (drives the glow state). */
  formulaReady?: boolean;
  canRecover: boolean;
  canUndo: boolean;
  onSubmit: () => void;
  onUndo: () => void;
  onSkip: () => void;
  onDiscard: () => void;
  message: string | null;
}

const STATUS_LABEL: Record<GameStatus, string> = {
  PLAYING: 'Oynanıyor',
  WON: 'Kazanıldı',
  LOST: 'Kaybedildi',
};

const OPERATOR_LEVEL_BONUS: Record<string, number> = { ADD: 2, SUBTRACT: 3, MULTIPLY: 5, DIVIDE: 4 };

export default function SidebarHUD({
  round,
  totalRounds,
  money,
  turn,
  maxTurns,
  score,
  targetScore,
  status,
  scoring = false,
  operatorLevels = { ADD: 1, SUBTRACT: 1, MULTIPLY: 1, DIVIDE: 1 },
  discardsLeft = 2,
  canSubmit,
  formulaComplete = true,
  formulaReady = false,
  canRecover,
  canUndo,
  onSubmit,
  onUndo,
  onSkip,
  onDiscard,
}: SidebarHUDProps) {
  let bossWarning: string | null = null;
  if (round === 3) {
    bossWarning = 'Bölme Yasak';
  } else if (round === 6) {
    bossWarning = 'Hassas Denge';
  } else if (round === 8) {
    bossWarning = 'Büyük Baskı';
  }

  return (
    <aside className="w-64 bg-slate-900 border-r-4 border-slate-950 p-3 flex flex-col gap-2.5 text-white shrink-0 select-none h-full">
      {/* Unified Score Card (Combines Current Score, Target Score, Ante, and Status) */}
      <div
        className={[
          'bg-slate-950 border-2 border-slate-800 rounded-xl p-2.5 text-center shadow-inner relative overflow-hidden crt flex flex-col gap-1 shrink-0 transition',
          scoring ? 'animate-score-pulse' : '',
        ].join(' ')}
      >
        <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-wider px-1">
          <span>Mevcut Skor</span>
          <span className="text-amber-500 font-pixel text-base font-bold">Hedef: {targetScore}</span>
        </div>

        <div className="font-pixel text-4xl text-emerald-400 tracking-wider drop-shadow-[0_0_8px_rgba(52,211,153,0.35)] leading-tight">
          {score}
        </div>

        {bossWarning && (
          <div className="bg-rose-950/40 border border-rose-500/20 text-[10px] font-bold text-rose-400 uppercase py-0.5 px-1.5 rounded inline-block mx-auto mb-1 animate-pulse">
            ⚠️ BOSS: {bossWarning}
          </div>
        )}

        <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest border-t border-slate-900/60 pt-1 px-1">
          <span>Ante {round}/{totalRounds}</span>
          <span className={status === 'PLAYING' ? 'text-sky-400' : status === 'WON' ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-3 gap-1.5 shrink-0">
        <div className="bg-slate-950/50 border border-slate-850 rounded-lg py-1.5 text-center">
          <span className="block text-[10px] text-slate-400 uppercase font-bold leading-none">Tur</span>
          <span className="font-pixel text-lg text-sky-400">{turn}/{maxTurns}</span>
        </div>
        <div className="bg-slate-950/50 border border-slate-850 rounded-lg py-1.5 text-center">
          <span className="block text-[10px] text-slate-400 uppercase font-bold leading-none">Iskarta</span>
          <span className="font-pixel text-lg text-fuchsia-400">{discardsLeft}</span>
        </div>
        <div className="bg-slate-950/50 border border-slate-850 rounded-lg py-1.5 text-center">
          <span className="block text-[10px] text-slate-400 uppercase font-bold leading-none">Para</span>
          <span className="font-pixel text-lg text-amber-500">${money}</span>
        </div>
      </div>

      {/* Operator levels line */}
      <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-2.5 shrink-0">
        <InfoTooltip
          align="left"
          widthClass="w-56"
          text={
            <>
              Mağazadaki <span className="text-amber-300 font-semibold">Kozmik Yükseltmeler</span>'i satın aldıkça
              o operatörün seviyesi artar. Her seviye, o operatörü her kullandığınızda sonuca sabit bir bonus ekler:
              <br />+ ⇒ +2 · − ⇒ +3 · x ⇒ +5 · ÷ ⇒ +4 (seviye başına).
            </>
          }
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-0.5 mb-1 flex items-center gap-1 cursor-help">
            İşlem Seviyeleri
            <span className="w-3 h-3 rounded-full border border-slate-500 text-slate-500 text-[8px] leading-2.5 text-center">i</span>
          </div>
        </InfoTooltip>
        <div className="grid grid-cols-4 gap-1 text-xs font-mono text-center">
          <div className="flex flex-col">
            <span className="font-bold text-emerald-400 leading-none">+</span>
            <span className="font-pixel text-amber-400 text-sm mt-0.5">L.{operatorLevels.ADD ?? 1}</span>
          </div>
          <div className="flex flex-col border-l border-slate-900/60">
            <span className="font-bold text-rose-400 leading-none">-</span>
            <span className="font-pixel text-amber-400 text-sm mt-0.5">L.{operatorLevels.SUBTRACT ?? 1}</span>
          </div>
          <div className="flex flex-col border-l border-slate-900/60">
            <span className="font-bold text-amber-400 leading-none">x</span>
            <span className="font-pixel text-amber-400 text-sm mt-0.5">L.{operatorLevels.MULTIPLY ?? 1}</span>
          </div>
          <div className="flex flex-col border-l border-slate-900/60">
            <span className="font-bold text-cyan-400 leading-none">÷</span>
            <span className="font-pixel text-amber-400 text-sm mt-0.5">L.{operatorLevels.DIVIDE ?? 1}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-slate-850 shrink-0">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || !formulaComplete}
          title={!formulaComplete ? 'Formül tamamlanmadı: bekleyen bir operatör var.' : undefined}
          className={[
            'w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-sm font-bold text-white shadow border-b-2 border-emerald-800 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none disabled:animate-none uppercase',
            formulaReady && canSubmit && formulaComplete
              ? 'animate-pulse shadow-[0_0_16px_4px_rgba(16,185,129,0.65)] ring-2 ring-emerald-300'
              : '',
          ].join(' ')}
        >
          HESAPLA / GÖNDER
        </button>

        <button
          type="button"
          onClick={onDiscard}
          disabled={!canRecover || discardsLeft <= 0}
          className="w-full py-1.5 rounded-lg bg-fuchsia-700 hover:bg-fuchsia-600 active:translate-y-0.5 text-[11px] font-bold text-white shadow border-b-2 border-fuchsia-900 transition disabled:opacity-30 disabled:cursor-not-allowed uppercase"
        >
          ELİ ISKARTA ET
        </button>

        <button
          type="button"
          onClick={onUndo}
          disabled={!canRecover || !canUndo}
          className="w-full py-1.5 rounded-lg bg-slate-700 hover:bg-slate-650 active:translate-y-0.5 text-[11px] font-bold text-slate-200 border-b-2 border-slate-900 transition disabled:opacity-30 disabled:cursor-not-allowed uppercase"
        >
          GERİ AL
        </button>

        <button
          type="button"
          onClick={onSkip}
          disabled={!canRecover}
          className="w-full py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/30 active:translate-y-0.5 text-[11px] font-bold text-rose-400 border border-rose-500/20 transition disabled:opacity-30 disabled:cursor-not-allowed uppercase"
        >
          TURU ATLA
        </button>
      </div>
    </aside>
  );
}
