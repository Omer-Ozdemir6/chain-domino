import type { GameStatus } from '../../game/GameState.js';
import type { HandType } from '../../models/types.js';
import { BOSS_BLINDS } from '../../game/RunState.js';

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
  handType?: HandType | null;
  discardsLeft?: number;
  handLevels?: Record<HandType, number>;

  scoring?: boolean;

  // Controls
  canSubmit: boolean;
  formulaReady?: boolean;
  canRecover: boolean;
  canUndo: boolean;
  onSubmit: () => void;
  onUndo: () => void;
  onSkip: () => void;
  onDiscard: () => void;
  message: string | null;
  activeBossId?: string | null;
  activeBlind?: 'SMALL' | 'BIG' | 'BOSS' | null;
  previewScore?: { chips: number; mult: number } | null;
  layout?: 'sidebar' | 'topbar';
}

const BLIND_BADGE: Record<'SMALL' | 'BIG' | 'BOSS', { label: string; className: string }> = {
  SMALL: { label: 'KÜÇÜK BLIND', className: 'bg-sky-700 border-2 border-sky-900 border-b-4 shadow-[0_3px_0_rgba(0,0,0,0.3)]' },
  BIG: { label: 'BÜYÜK BLIND', className: 'bg-amber-600 border-2 border-amber-800 border-b-4 shadow-[0_3px_0_rgba(0,0,0,0.3)]' },
  BOSS: { label: 'BOSS BLIND', className: 'bg-red-750 border-2 border-red-950 border-b-4 shadow-[0_3px_0_rgba(0,0,0,0.3)]' },
};

const STATUS_LABEL: Record<GameStatus, string> = {
  PLAYING: 'OYNANIYOR',
  WON: 'KAZANILDI',
  LOST: 'KAYBEDİLDİ',
};

const HAND_TYPE_LABEL: Record<HandType, string> = {
  STRAIGHT: 'DÜZ ZİNCİR',
  BRANCHED: 'ÇATALLI ZİNCİR',
  LOOP: 'SONSUZ DÖNGÜ',
};

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
  handType = null,
  discardsLeft = 2,
  handLevels = { STRAIGHT: 1, BRANCHED: 1, LOOP: 1 },
  canSubmit,
  formulaReady = false,
  canRecover,
  canUndo,
  onSubmit,
  onUndo,
  onSkip,
  onDiscard,
  layout = 'sidebar',
  activeBossId = null,
  activeBlind = null,
  previewScore = null,
}: SidebarHUDProps) {
  const activeBoss = activeBossId ? BOSS_BLINDS.find((b) => b.id === activeBossId) ?? null : null;
  const bossWarning = activeBoss ? activeBoss.ruleLabel : null;
  const bossTierColor = activeBoss?.tier === 'LETHAL'
    ? 'text-fuchsia-400 bg-fuchsia-950/30 border-fuchsia-700/50'
    : activeBoss?.tier === 'DANGEROUS'
      ? 'text-red-400 bg-red-950/30 border-red-700/50'
      : 'text-orange-400 bg-orange-950/30 border-orange-700/50';

  const handTypeStrip = handType ? (
    <div className="flex items-center gap-1.5 text-[10px] font-pixel font-bold text-amber-300 uppercase tracking-wide">
      {HAND_TYPE_LABEL[handType]} (Lvl {handLevels[handType] ?? 1})
    </div>
  ) : null;

  if (layout === 'topbar') {
    return (
      <div className="w-full bg-[#0d261e] border-b-4 border-[#071712] px-2 py-1 md:px-3 md:py-2 flex items-center justify-between gap-3 text-white select-none shrink-0 shadow-lg">
        {/* Left: Score readout */}
        <div className="flex flex-col leading-tight shrink-0">
          <span className="font-pixel text-xl md:text-2xl text-white skor-lcd-glow leading-none">{score}</span>
          <span className="text-[9px] text-rose-400 font-bold uppercase font-pixel mt-0.5">Hedef: {targetScore}</span>
        </div>

        {/* Center: Live preview chips/mult badges */}
        <div className="flex items-center gap-1 select-none scale-90">
          <div className="balatro-badge-blue px-2 py-0.5 flex flex-col items-center">
            <span className="text-[8px] text-white font-pixel font-black">{previewScore ? previewScore.chips : 0}</span>
          </div>
          <span className="text-slate-400 font-pixel text-xs">X</span>
          <div className="balatro-badge-red px-2 py-0.5 flex flex-col items-center">
            <span className="text-[8px] text-white font-pixel font-black">{previewScore ? previewScore.mult : 1}</span>
          </div>
        </div>

        {/* Right: Round details */}
        <div className="flex gap-1.5 text-center shrink-0">
          <div className="border border-slate-800 rounded bg-slate-900/40 px-2 py-0.5">
            <span className="block text-[7px] text-slate-500 uppercase font-bold leading-none">Ante</span>
            <span className="font-pixel text-xs text-slate-200">{round}/{totalRounds}</span>
          </div>
          <div className="border border-slate-800 rounded bg-slate-900/40 px-2 py-0.5">
            <span className="block text-[7px] text-slate-500 uppercase font-bold leading-none">Tur</span>
            <span className="font-pixel text-xs text-amber-400">{turn}/{maxTurns}</span>
          </div>
          <div className="border border-slate-800 rounded bg-slate-900/40 px-2 py-0.5">
            <span className="block text-[7px] text-slate-500 uppercase font-bold leading-none">Cüzdan</span>
            <span className="font-pixel text-xs text-emerald-450">${money}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-48 lg:w-56 xl:w-72 bg-slate-900 border-r-4 border-slate-950 p-2 lg:p-3 xl:p-4 flex flex-col gap-2 lg:gap-3 text-white shrink-0 select-none h-full shadow-[5px_0_15px_rgba(0,0,0,0.5)] z-20 balatro-panel">
      {/* 1. Ante & Blind Row */}
      <div className="flex gap-2 items-center justify-between shrink-0">
        <div className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 text-center shadow-inner">
          <span className="block text-[10px] text-sky-400 font-bold uppercase tracking-widest font-pixel leading-none mb-0.5">Safha</span>
          <span className="font-pixel text-lg text-sky-200 font-black">{round} / {totalRounds}</span>
        </div>
        {activeBlind && (
          <div className={`flex-1 rounded-xl border py-1.5 text-center font-pixel text-[11px] font-black uppercase tracking-wider text-white ${BLIND_BADGE[activeBlind].className}`}>
            {BLIND_BADGE[activeBlind].label}
          </div>
        )}
      </div>

      {/* 2. Neon LCD Score Monitor */}
      <div
        className={[
          'lcd-panel p-3 text-center flex flex-col gap-1.5 shrink-0 transition relative overflow-hidden',
          scoring ? 'animate-score-pulse ring-2 ring-emerald-500/50' : '',
        ].join(' ')}
      >
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-widest font-pixel border-b border-slate-800/40 pb-1.5">
          <span>El Skoru</span>
          <span className="text-rose-450 font-black font-pixel text-[13px] drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">HEDEF: {targetScore}</span>
        </div>

        <div className="font-pixel text-3xl lg:text-4xl xl:text-5xl text-white skor-lcd-glow leading-none my-2.5 tracking-widest font-black">
          {score}
        </div>

        {/* Live chips × mult box */}
        <div className="flex items-center justify-center gap-1.5 mt-1 select-none">
          <div className="balatro-badge-blue px-3 py-1 flex flex-col items-center justify-center min-w-16">
            <span className="text-[9px] text-sky-200 font-pixel leading-none">CHIPS</span>
            <span className="text-sm text-white font-pixel font-black leading-none mt-0.5">
              {previewScore ? previewScore.chips : 0}
            </span>
          </div>
          <span className="text-slate-400 font-pixel text-sm font-black mx-1">X</span>
          <div className="balatro-badge-red px-3 py-1 flex flex-col items-center justify-center min-w-16">
            <span className="text-[9px] text-rose-200 font-pixel leading-none">MULT</span>
            <span className="text-sm text-white font-pixel font-black leading-none mt-0.5">
              {previewScore ? previewScore.mult : 1}
            </span>
          </div>
        </div>

        {bossWarning && activeBoss && (
          <div className={`border text-[10px] font-bold uppercase py-1.5 px-2.5 rounded-lg inline-flex items-center gap-1.5 mx-auto mt-1.5 animate-pulse ${bossTierColor}`}>
            <span>{activeBoss.icon}</span>
            <span>{bossWarning}</span>
          </div>
        )}
      </div>

      {/* 3. Counters (Turns, Discards, Coins) */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 rounded-2xl py-2 shadow-inner">
          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider font-pixel mb-1">TUR</span>
          <div className="w-11 h-11 rounded-full border-2 border-amber-500/80 flex items-center justify-center bg-amber-950/15 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            <span className="font-pixel text-base text-amber-400 font-black">{turn}/{maxTurns}</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 rounded-2xl py-2 shadow-inner">
          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider font-pixel mb-1">ISKARTA</span>
          <div className="w-11 h-11 rounded-full border-2 border-rose-500/80 flex items-center justify-center bg-rose-950/15 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
            <span className="font-pixel text-base text-rose-500 font-black">{discardsLeft}</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 rounded-2xl py-2 shadow-inner">
          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider font-pixel mb-1">CÜZDAN</span>
          <div className="w-11 h-11 rounded-full border-2 border-emerald-500/80 flex items-center justify-center bg-emerald-950/15 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <span className="font-pixel text-base text-emerald-450 font-black">${money}</span>
          </div>
        </div>
      </div>

      {/* 4. Active Hand Level / Upgrades Panel */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-2.5 shrink-0 text-center">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-1.5 font-pixel">
          El Türü Seviyeleri
        </div>
        <div className="font-pixel text-amber-300 uppercase tracking-wide">
          {handType ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] text-slate-500">Aktif El Türü:</span>
              <span className="text-sm font-black text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]">
                {HAND_TYPE_LABEL[handType]}
              </span>
              <span className="text-xs text-slate-350 font-pixel">Seviye {handLevels[handType] ?? 1}</span>
            </div>
          ) : (
            <div className="text-[10px] flex justify-around gap-1.5 font-bold">
              <div className="bg-slate-950/70 px-2 py-1 rounded border border-slate-800 flex-1">
                <span className="block text-slate-500 mb-0.5">Düz</span>
                <span className="text-amber-400 text-xs">L{handLevels['STRAIGHT'] ?? 1}</span>
              </div>
              <div className="bg-slate-950/70 px-2 py-1 rounded border border-slate-800 flex-1">
                <span className="block text-slate-500 mb-0.5">Çatal</span>
                <span className="text-amber-400 text-xs">L{handLevels['BRANCHED'] ?? 1}</span>
              </div>
              <div className="bg-slate-950/70 px-2 py-1 rounded border border-slate-800 flex-1">
                <span className="block text-slate-500 mb-0.5">Döngü</span>
                <span className="text-amber-400 text-xs">L{handLevels['LOOP'] ?? 1}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. 3D action controls at the bottom */}
      <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-slate-800 shrink-0">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={[
            'btn-arcade btn-arcade-green w-full py-4 rounded-xl text-sm font-black text-white transition disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none disabled:animate-none uppercase font-pixel',
            formulaReady && canSubmit
              ? 'animate-pulse ring-2 ring-emerald-300/50'
              : '',
          ].join(' ')}
        >
          ZİNCİRİ GÖNDER
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={!canRecover || discardsLeft <= 0}
            className="btn-arcade btn-arcade-red py-2.5 rounded-xl text-[11px] font-black text-white uppercase font-pixel"
          >
            ISKARTA ET
          </button>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canRecover || !canUndo}
            className="btn-arcade btn-arcade-slate py-2.5 rounded-xl text-[11px] font-black text-slate-100 uppercase font-pixel"
          >
            GERİ AL
          </button>
        </div>

        <button
          type="button"
          onClick={onSkip}
          disabled={!canRecover}
          className="btn-arcade btn-arcade-slate w-full py-2 rounded-xl text-[10px] font-black text-rose-355 uppercase font-pixel"
        >
          TURU ATLA
        </button>
      </div>
    </aside>
  );
}
