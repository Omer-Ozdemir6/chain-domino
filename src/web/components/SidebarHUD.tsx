import { useEffect, useRef, useState } from 'react';
import type { GameStatus } from '../../game/GameState.js';
import type { HandType } from '../../models/types.js';
import { BOSS_BLINDS } from '../../game/RunState.js';
import SettingsButton from './SettingsButton.js';

/** True for a brief window right after `value` drops — drives a floating "-1" callout beside a
 *  countdown badge (turns left, discards left) so the player actually sees it tick down, instead
 *  of the number just silently being different next render. */
function useDecrementFlash(value: number): boolean {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (value < prevRef.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 950);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
  }, [value]);
  return flash;
}

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
  onDiscard: () => void;
  /** "TAŞI DEĞİŞTİR" is armed (hand stones are now tappable to mark for discard) — changes the
   *  button into a "confirm N" state and reveals a cancel affordance beside it. */
  isDiscardMode?: boolean;
  discardTargetCount?: number;
  onCancelDiscard?: () => void;
  message: string | null;
  activeBossId?: string | null;
  activeBlind?: 'SMALL' | 'BIG' | 'BOSS' | null;
  previewScore?: { chips: number; mult: number } | null;
  /** The current hand's running score (chips×mult) while it's actively being calculated —
   *  null/0 outside that window, in which case this counter renders nothing at all (not even
   *  "0"). Once the hand resolves this value flies up into `score` and the counter hides again. */
  handScore?: number | null;
  /** True for the ~480ms window the hand-score accumulator is flying up into `score` — swaps its
   *  pop animation for a translate-and-fade-out so the transfer reads as one continuous motion. */
  handScoreFlyUp?: boolean;
  /** A separate, finer-grained counter than `round`/`totalRounds` (which is the Ante number and
   *  only advances once per Boss Blind clear) — this ticks up by one on every single blind. */
  overallRound?: number;
  maxOverallRounds?: number;
  layout?: 'sidebar' | 'topbar';
}

const BLIND_BADGE: Record<'SMALL' | 'BIG' | 'BOSS', { label: string; className: string }> = {
  SMALL: { label: 'KÜÇÜK BLIND', className: 'bg-orange-800 border-2 border-orange-950 border-b-4 shadow-[0_3px_0_rgba(0,0,0,0.3)]' },
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
  onDiscard,
  isDiscardMode = false,
  discardTargetCount = 0,
  onCancelDiscard,
  layout = 'sidebar',
  activeBossId = null,
  activeBlind = null,
  previewScore = null,
  handScore = null,
  handScoreFlyUp = false,
  overallRound = 0,
  maxOverallRounds = 0,
}: SidebarHUDProps) {
  // Counts DOWN from maxTurns instead of the raw (1-indexed, and briefly maxTurns+1 the instant
  // the final turn is spent) `turn` counter — "6 hamle kaldı, sonra 5..." reads far more clearly
  // than "1/6" ticking up, and never flashes a confusing "7/6" right as the round ends.
  const turnsLeft = Math.max(0, maxTurns - turn + 1);
  const turnFlash = useDecrementFlash(turnsLeft);
  const discardFlash = useDecrementFlash(discardsLeft);
  const activeBoss = activeBossId ? BOSS_BLINDS.find((b) => b.id === activeBossId) ?? null : null;
  const bossWarning = activeBoss ? activeBoss.ruleLabel : null;
  const bossTierColor = activeBoss?.tier === 'LETHAL'
    ? 'text-fuchsia-400 bg-fuchsia-950/30 border-fuchsia-700/50'
    : activeBoss?.tier === 'DANGEROUS'
      ? 'text-red-400 bg-red-950/30 border-red-700/50'
      : 'text-orange-400 bg-orange-950/30 border-orange-700/50';

  const handTypeStrip = handType ? (
    <div className="flex items-center gap-1.5 text-[12px] font-pixel font-bold text-amber-300 uppercase tracking-wide">
      {HAND_TYPE_LABEL[handType]} (Lvl {handLevels[handType] ?? 1})
    </div>
  ) : null;

  if (layout === 'topbar') {
    return (
      <div className="w-full bg-[#0d261e] border-b-4 border-[#071712] px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 text-white select-none shrink-0 shadow-lg">
        {/* Left: Score readout + hidden hand-score accumulator (only exists while a hand resolves) */}
        <div className="flex flex-col leading-tight shrink-0">
          <span className="font-pixel text-3xl sm:text-4xl text-white skor-lcd-glow leading-none">{score}</span>
          <span className="text-sm text-rose-400 font-bold uppercase font-pixel mt-0.5">Hedef: {targetScore}</span>
          {Boolean(handScore) && (
            <span key={handScore} className={`font-pixel text-lg text-emerald-350 hand-score-glow leading-none mt-0.5 ${handScoreFlyUp ? 'animate-hand-score-flyup' : 'animate-number-pop'}`}>
              +{handScore}
            </span>
          )}
        </div>

        {/* Center: Live preview chips/mult badges */}
        <div className="flex items-center gap-1.5 select-none">
          <div key={`tc-${previewScore?.chips ?? 0}`} className={`balatro-badge-blue flex flex-col items-center animate-number-pop ${scoring ? 'px-4 py-2.5' : 'px-3 py-1.5'}`}>
            <span className={`text-white font-pixel font-black ${scoring ? 'text-xl' : 'text-base'}`}>{previewScore ? Math.round(previewScore.chips) : 0}</span>
          </div>
          <span className="text-stone-400 font-pixel text-base">X</span>
          <div data-mult-badge key={`tm-${previewScore?.mult ?? 1}`} className={`balatro-badge-red flex flex-col items-center animate-number-pop ${scoring ? 'px-4 py-2.5' : 'px-3 py-1.5'}`}>
            <span className={`text-white font-pixel font-black ${scoring ? 'text-xl' : 'text-base'}`}>{previewScore ? Math.round(previewScore.mult) : 1}</span>
          </div>
        </div>

        {/* Right: Round details */}
        <div className="flex gap-1.5 text-center shrink-0">
          <div className="border border-stone-800 rounded bg-stone-900/40 px-2 py-1">
            <span className="block text-[12px] text-stone-500 uppercase font-bold leading-none">Ante</span>
            <span className="font-pixel text-base text-stone-200">{round}/{totalRounds}</span>
          </div>
          <div className="border border-stone-800 rounded bg-stone-900/40 px-2 py-1">
            <span className="block text-[12px] text-stone-500 uppercase font-bold leading-none">Raunt</span>
            <span className="font-pixel text-base text-orange-300">{overallRound}/{maxOverallRounds}</span>
          </div>
          <div className={`border border-stone-800 rounded bg-stone-900/40 px-2 py-1 relative ${turnFlash ? 'animate-turn-ring-pulse' : ''}`}>
            <span className="block text-[12px] text-stone-500 uppercase font-bold leading-none">Tur</span>
            <span key={turnsLeft} className="font-pixel text-base text-amber-400 inline-block animate-number-pop">{turnsLeft}</span>
            {turnFlash && (
              <span className="absolute -top-2 right-0 font-pixel text-xs text-rose-400 font-black animate-turn-lost-fall pointer-events-none">-1</span>
            )}
          </div>
          <div className="border border-stone-800 rounded bg-stone-900/40 px-2 py-1">
            <span className="block text-[12px] text-stone-500 uppercase font-bold leading-none">Cüzdan</span>
            <span className="font-pixel text-base text-emerald-400">${money}</span>
          </div>
          <SettingsButton compact />
        </div>
      </div>
    );
  }

  return (
    <aside className="w-56 lg:w-64 xl:w-80 bg-stone-900 border-r-4 border-stone-950 p-3 lg:p-4 xl:p-5 flex flex-col gap-3 lg:gap-4 text-white shrink-0 select-none h-full shadow-[5px_0_15px_rgba(0,0,0,0.5)] z-20 balatro-panel">
      <div className="flex justify-end shrink-0 -mb-1">
        <SettingsButton compact />
      </div>
      {/* 1. Ante & Raunt Row */}
      <div className="flex gap-2.5 items-center justify-between shrink-0">
        <div className="flex-1 bg-stone-950/70 border border-stone-800 rounded-xl px-3 py-2 text-center shadow-inner">
          <span className="block text-sm lg:text-base text-amber-500 font-bold uppercase tracking-widest font-pixel leading-none mb-1">Safha</span>
          <span className="font-pixel text-2xl lg:text-3xl text-amber-200 font-black">{round} / {totalRounds}</span>
        </div>
        <div className="flex-1 bg-stone-950/70 border border-stone-800 rounded-xl px-3 py-2 text-center shadow-inner">
          <span className="block text-sm lg:text-base text-orange-400 font-bold uppercase tracking-widest font-pixel leading-none mb-1">Raunt</span>
          <span className="font-pixel text-2xl lg:text-3xl text-orange-200 font-black">{overallRound} / {maxOverallRounds}</span>
        </div>
      </div>

      {activeBlind && (
        <div className={`rounded-xl border py-2 text-center font-pixel text-sm lg:text-base font-black uppercase tracking-wider text-white shrink-0 ${BLIND_BADGE[activeBlind].className}`}>
          {BLIND_BADGE[activeBlind].label}
        </div>
      )}

      {/* 2. LCD Score Monitor */}
      <div
        className={[
          'lcd-panel p-4 text-center flex flex-col gap-2 shrink-0 transition relative overflow-hidden',
          scoring ? 'animate-score-pulse ring-2 ring-emerald-500/50' : '',
        ].join(' ')}
      >
        <div className="flex justify-between items-center text-sm lg:text-base text-stone-400 font-bold uppercase tracking-widest font-pixel border-b border-stone-800/40 pb-2">
          <span>El Skoru</span>
          <span className="text-rose-455 font-black font-pixel text-base lg:text-lg drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">HEDEF: {targetScore}</span>
        </div>

        <div className="font-pixel text-5xl lg:text-6xl xl:text-6xl text-white skor-lcd-glow leading-none my-3 tracking-widest font-black">
          {score}
        </div>

        {/* Hidden hand-score accumulator: nothing renders (not even "0") until a hand is
            actively being calculated — then it holds the running total until it flies up into
            the score above and disappears again for the next hand. */}
        {Boolean(handScore) && (
          <div key={handScore} className={`flex items-center justify-center gap-2 ${handScoreFlyUp ? 'animate-hand-score-flyup' : 'animate-number-pop'}`}>
            <span className="font-pixel text-2xl lg:text-3xl text-emerald-350 hand-score-glow font-black tracking-wide">
              +{handScore}
            </span>
          </div>
        )}

        {bossWarning && activeBoss && (
          <div className={`border text-sm font-bold uppercase py-2 px-3 rounded-lg inline-flex items-center gap-2 mx-auto mt-2 animate-pulse ${bossTierColor}`}>
            <span>{activeBoss.icon}</span>
            <span>{bossWarning}</span>
          </div>
        )}
      </div>

      {/* 3. Counters (Turns, Discards, Coins) */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div className="flex flex-col items-center justify-center bg-stone-950/70 border border-stone-800 rounded-2xl py-2.5 shadow-inner relative">
          <span className="text-sm lg:text-base text-stone-500 uppercase font-extrabold tracking-wider font-pixel mb-1.5">TUR</span>
          <div className={`w-13 h-13 rounded-full border-2 border-amber-500/80 flex items-center justify-center bg-amber-950/15 shadow-[0_0_8px_rgba(245,158,11,0.2)] relative ${turnFlash ? 'animate-turn-ring-pulse' : ''}`}>
            <span key={turnsLeft} className="font-pixel text-xl text-amber-400 font-black inline-block animate-number-pop">{turnsLeft}</span>
            {turnFlash && (
              <span className="absolute -top-3 -right-1 font-pixel text-sm text-rose-400 font-black animate-turn-lost-fall pointer-events-none">-1</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-stone-950/70 border border-stone-800 rounded-2xl py-2.5 shadow-inner">
          <span className="text-sm lg:text-base text-stone-500 uppercase font-extrabold tracking-wider font-pixel mb-1.5">ISKARTA</span>
          <div className="w-13 h-13 rounded-full border-2 border-rose-500/80 flex items-center justify-center bg-rose-950/15 shadow-[0_0_8px_rgba(239,68,68,0.2)] relative">
            <span key={discardsLeft} className="font-pixel text-xl text-rose-500 font-black inline-block animate-number-pop">{discardsLeft}</span>
            {discardFlash && (
              <span className="absolute -top-3 -right-1 font-pixel text-sm text-rose-400 font-black animate-tile-chip-pop pointer-events-none">-1</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-stone-950/70 border border-stone-800 rounded-2xl py-2.5 shadow-inner">
          <span className="text-sm lg:text-base text-stone-500 uppercase font-extrabold tracking-wider font-pixel mb-1.5">CÜZDAN</span>
          <div className="w-13 h-13 rounded-full border-2 border-emerald-500/80 flex items-center justify-center bg-emerald-950/15 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <span className="font-pixel text-xl text-emerald-400 font-black">${money}</span>
          </div>
        </div>
      </div>

      {/* 4. Balatro-style "El Kartı": hand-type name + level as title, live Chips×Mult badges as
          body — this is the SAME data `previewScore` always carried, just relocated out of the
          LCD panel into its own card, matching the reference screenshot's "Full House lvl.1"
          layout. Feeds from idle board preview while placing stones AND from the hand-preview
          buildup while a submission resolves — App.tsx switches the source, this card doesn't care. */}
      <div className="bg-stone-950/60 border-2 border-stone-800 rounded-2xl p-3.5 shrink-0 text-center">
        <div className="font-pixel text-amber-300 uppercase tracking-wide text-sm lg:text-base font-black mb-2 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]">
          {handType ? `${HAND_TYPE_LABEL[handType]} Lvl.${handLevels[handType] ?? 1}` : 'Masa Boş'}
        </div>
        <div className="flex items-center justify-center gap-2.5 select-none">
          <div key={`c-${previewScore?.chips ?? 0}`} className={`balatro-badge-blue flex items-center justify-center min-w-20 animate-number-pop transition-[padding] ${scoring ? 'px-5 py-4' : 'px-4 py-2.5'}`}>
            <span className={`text-white font-pixel font-black leading-none transition-[font-size] ${scoring ? 'text-3xl lg:text-4xl' : 'text-xl lg:text-2xl'}`}>
              {previewScore ? Math.round(previewScore.chips) : 0}
            </span>
          </div>
          <span className="text-stone-400 font-pixel text-lg font-black">X</span>
          <div data-mult-badge key={`m-${previewScore?.mult ?? 1}`} className={`balatro-badge-red flex items-center justify-center min-w-20 animate-number-pop transition-[padding] ${scoring ? 'px-5 py-4' : 'px-4 py-2.5'}`}>
            <span className={`text-white font-pixel font-black leading-none transition-[font-size] ${scoring ? 'text-3xl lg:text-4xl' : 'text-xl lg:text-2xl'}`}>
              {previewScore ? Math.round(previewScore.mult) : 1}
            </span>
          </div>
        </div>
      </div>

      {/* 5. 3D action controls at the bottom */}
      <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-stone-800 shrink-0">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={[
            'btn-arcade btn-arcade-green w-full py-4 rounded-xl text-base font-black text-white transition disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none disabled:animate-none uppercase font-pixel',
            formulaReady && canSubmit
              ? 'animate-pulse ring-2 ring-emerald-300/50'
              : '',
          ].join(' ')}
        >
          ZİNCİRİ GÖNDER
        </button>

        {isDiscardMode && (
          <p className="text-[11px] text-center text-rose-300 font-bold font-sans -mb-0.5 animate-pulse">
            Değiştirmek istediğiniz taşları seçin ({discardTargetCount})
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isDiscardMode ? discardTargetCount === 0 : (!canRecover || discardsLeft <= 0)}
            className="btn-arcade btn-arcade-red py-2.5 rounded-xl text-[13px] font-black text-white uppercase font-pixel disabled:opacity-30"
          >
            {isDiscardMode ? `ONAYLA (${discardTargetCount})` : 'TAŞI DEĞİŞTİR'}
          </button>

          {isDiscardMode ? (
            <button
              type="button"
              onClick={onCancelDiscard}
              className="btn-arcade btn-arcade-slate py-2.5 rounded-xl text-[13px] font-black text-stone-100 uppercase font-pixel"
            >
              İPTAL
            </button>
          ) : (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canRecover || !canUndo}
              className="btn-arcade btn-arcade-slate py-2.5 rounded-xl text-[13px] font-black text-stone-100 uppercase font-pixel"
            >
              GERİ AL
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
