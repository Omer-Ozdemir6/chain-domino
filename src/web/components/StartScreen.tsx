import { useEffect, useState } from 'react';
import Tile from './Tile.js';
import { STARTING_CHESTS } from '../../game/RunState.js';
import type { ChestId } from '../../game/RunState.js';
import { playSound } from './SoundSynth.js';
import CollectionScreen from './CollectionScreen.js';

// The domino-tile pip-lighting boot moment that used to be its own full-screen intro page now
// plays right here on the main menu itself: a 6|3 tile's 9 pips ignite one at a time out of the
// dark, then the hero title/tagline fly in from top/bottom, then the menu cards appear.
const BOOT_PIP_POSITIONS: Array<[number, number]> = [
  // Left half (value 6) — 2 columns x 3 rows.
  [20, 20], [38, 20],
  [20, 50], [38, 50],
  [20, 80], [38, 80],
  // Right half (value 3) — classic diagonal.
  [68, 20], [79, 50], [90, 80],
];
// A slow, deliberate ceremony — closer to a game's own splash sequence than a quick transition.
const BOOT_PIP_START_DELAY_MS = 600;
const BOOT_PIP_STEP_MS = 550;
const BOOT_PIPS_DONE_MS = BOOT_PIP_START_DELAY_MS + (BOOT_PIP_POSITIONS.length - 1) * BOOT_PIP_STEP_MS + 700;
const BOOT_FRAME_MS = 1100;
const BOOT_BACKGROUND_MS = 1200;

interface StartScreenProps {
  onStart: (deck: 'RED' | 'BLUE' | 'YELLOW', stake: 'WHITE' | 'RED', chestId: ChestId | null, challengeId?: string | null) => void;
}

type TabState = 'MAIN' | 'DECK_SELECT' | 'STAKE_SELECT' | 'CHALLENGES' | 'SETUP' | 'COLLECTION';

// ── Floating domino background particles ──────────────────────
const FLOATING_DOMINOES = [
  { emoji: '🁣', x: '8%',  dur: '22s', delay: '0s',   size: '2.2rem' },
  { emoji: '🁫', x: '18%', dur: '26s', delay: '4s',   size: '1.8rem' },
  { emoji: '🁳', x: '32%', dur: '20s', delay: '2s',   size: '2.5rem' },
  { emoji: '🁤', x: '50%', dur: '28s', delay: '7s',   size: '2rem' },
  { emoji: '🁩', x: '65%', dur: '24s', delay: '1s',   size: '2.3rem' },
  { emoji: '🁶', x: '78%', dur: '19s', delay: '5s',   size: '1.9rem' },
  { emoji: '🁡', x: '90%', dur: '25s', delay: '3s',   size: '2.1rem' },
  { emoji: '🁮', x: '42%', dur: '30s', delay: '9s',   size: '1.7rem' },
];

// ── Challenge definitions ─────────────────────────────────────
interface ChallengeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  rule: string;
  difficulty: 'Kolay' | 'Orta' | 'Zor' | 'Efsanevi';
  diffColor: string;
  unlocked: boolean;
}

const CHALLENGES: ChallengeDef[] = [
  {
    id: 'ch_no_charms',
    name: 'Tılsımsız Sefer',
    icon: '🚫',
    description: 'Hiçbir tılsım olmadan seferi tamamla. Saf strateji ve zincir becerisi.',
    rule: 'Tılsım slotları devre dışı bırakılır.',
    difficulty: 'Orta',
    diffColor: 'text-amber-400',
    unlocked: true,
  },
  {
    id: 'ch_doubles_only',
    name: 'Çiftler Festivali',
    icon: '🎭',
    description: 'Sadece çift (double/spinner) taşlarla oyna. Dallanma ustası ol!',
    rule: 'Elde sadece çift taşlar gelir.',
    difficulty: 'Zor',
    diffColor: 'text-red-400',
    unlocked: true,
  },
  {
    id: 'ch_golden_rush',
    name: 'Altın Ateş',
    icon: '🔥',
    description: 'Tüm taşlar altın başlar ama hedef puanlar 2 katına çıkar!',
    rule: 'Tüm taşlar golden, hedefler x2.',
    difficulty: 'Zor',
    diffColor: 'text-red-400',
    unlocked: true,
  },
  {
    id: 'ch_speed_chain',
    name: 'Tek Zincir',
    icon: '⛓️',
    description: 'Dallanma yapılamaz — yalnızca düz bir zincir kurabilirsin.',
    rule: 'Sadece düz zincir, dallanma yok.',
    difficulty: 'Efsanevi',
    diffColor: 'text-fuchsia-400',
    unlocked: true,
  },
];

// ── Deck and Stake metadata ───────────────────────────────────
const DECK_INFO: Record<'RED' | 'BLUE' | 'YELLOW', { name: string; color: string; borderActive: string; desc: string; icon: string }> = {
  RED: {
    name: 'Kırmızı Deste',
    color: 'text-red-400',
    borderActive: 'border-red-500 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    desc: 'Her tur fazladan +1 Iskarta hakkı verir.',
    icon: '♦',
  },
  BLUE: {
    name: 'Mavi Deste',
    color: 'text-teal-400',
    borderActive: 'border-teal-500 bg-teal-950/30 shadow-[0_0_15px_rgba(45,157,150,0.3)]',
    desc: 'Her tur fazladan +1 Hamle hakkı verir.',
    icon: '♠',
  },
  YELLOW: {
    name: 'Sarı Deste',
    color: 'text-amber-400',
    borderActive: 'border-amber-500 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    desc: 'Oyuna fazladan +$4 bakiye ile başlar.',
    icon: '♣',
  },
};

const STAKE_INFO: Record<'WHITE' | 'RED', { name: string; desc: string; color: string; borderActive: string }> = {
  WHITE: {
    name: 'Beyaz Pul',
    desc: 'Standart hedefler ve temel zorluk.',
    color: 'text-stone-200',
    borderActive: 'border-stone-300 bg-stone-900/40 shadow-[0_0_10px_rgba(255,255,255,0.1)]',
  },
  RED: {
    name: 'Kırmızı Pul',
    desc: 'Hedef skorlar %25 daha yüksek.',
    color: 'text-red-400',
    borderActive: 'border-red-500 bg-red-950/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]',
  },
};

export default function StartScreen({ onStart }: StartScreenProps) {
  const [deck, setDeck] = useState<'RED' | 'BLUE' | 'YELLOW'>('RED');
  const [stake, setStake] = useState<'WHITE' | 'RED'>('WHITE');
  const [tab, setTab] = useState<TabState>('MAIN');
  const [selectedChest, setSelectedChest] = useState<ChestId | null>(null);

  // Boot sequence played once per mount, each beat its own deliberate moment instead of a quick
  // transition: 'pips' (dark, tile igniting one pip at a time) -> 'frame' (the tile's border
  // materializes around them) -> 'background' (the black curtain fades back to the table's own
  // color WHILE the hero title/tile/tagline fly in at the same time, so nothing sits on a dead
  // blank screen waiting its turn) -> 'buttons' (menu cards appear, screen fully interactive).
  const [bootStage, setBootStage] = useState<'pips' | 'frame' | 'background' | 'buttons'>('pips');

  useEffect(() => {
    const tickTimers = BOOT_PIP_POSITIONS.map((_, i) =>
      setTimeout(() => playSound('pulse', i * 2), BOOT_PIP_START_DELAY_MS + i * BOOT_PIP_STEP_MS)
    );
    let t = BOOT_PIPS_DONE_MS;
    const frameTimer = setTimeout(() => {
      playSound('chime');
      setBootStage('frame');
    }, t);
    t += BOOT_FRAME_MS;
    const backgroundTimer = setTimeout(() => setBootStage('background'), t);
    t += BOOT_BACKGROUND_MS + 900;
    const buttonsTimer = setTimeout(() => setBootStage('buttons'), t);
    return () => {
      tickTimers.forEach(clearTimeout);
      clearTimeout(frameTimer);
      clearTimeout(backgroundTimer);
      clearTimeout(buttonsTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The chosen starting chest grows and cracks open, then a light/dust vortex bursts out and
  // fills the screen — `onStart` only actually fires once the vortex flash is fully opaque, so
  // the instant screen swap underneath (Sefer Kurulumu -> Kabine Eşikleri) is masked by it.
  const [launchStage, setLaunchStage] = useState<'idle' | 'growing' | 'vortex'>('idle');
  function handleLaunch() {
    if (launchStage !== 'idle') return;
    setLaunchStage('growing');
    setTimeout(() => setLaunchStage('vortex'), 400);
    setTimeout(() => onStart(deck, stake, selectedChest), 780);
  }
  const chestIcon = selectedChest ? STARTING_CHESTS.find((c) => c.id === selectedChest)?.icon ?? '📦' : '📦';

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-6 md:p-10 select-none overflow-hidden swirl-amber-bg">

      {/* ── Animated felt texture overlay ── */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.15) 100%), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
        backgroundSize: '100% 100%, 4px 4px',
      }} />

      {/* ── Floating Domino Particles ── */}
      {FLOATING_DOMINOES.map((d, i) => (
        <span
          key={i}
          className="floating-domino"
          style={{
            '--x': d.x,
            '--dur': d.dur,
            '--delay': d.delay,
            '--size': d.size,
          } as React.CSSProperties}
        >
          {d.emoji}
        </span>
      ))}

      {/* ── Top watermark — each corner drops in from its own edge, once the curtain opens ── */}
      {(bootStage === 'background' || bootStage === 'buttons') && (
        <div className="flex justify-between items-center text-[12px] text-emerald-700/50 font-bold uppercase tracking-[0.25em] z-10">
          <span className="animate-hero-fly-left">Chain Domino</span>
          <span className="animate-hero-fly-right">v1.2.0</span>
        </div>
      )}

      {/* ══════════════════════════════════════
           MAIN LOGO — Centered hero section
         ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 my-auto z-10">
        <div className="relative flex flex-col items-center select-none">

          {(bootStage === 'background' || bootStage === 'buttons') && (
            <>
              {/* Ambient glow rings */}
              <div className="absolute w-72 h-72 rounded-full border border-emerald-500/10 animate-pulse z-0" />
              <div className="absolute w-80 h-80 rounded-full border border-dashed border-amber-600/15 animate-spin [animation-duration:30s] z-0" />
              <div className="absolute w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl z-0" />

              {/* CHAIN — drops in from above */}
              <h1 className="text-7xl md:text-9xl font-black tracking-[0.15em] font-pixel z-10 leading-none animate-hero-fly-top" style={{ animationDelay: '0ms' }}>
                <span
                  className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-300 via-emerald-500 to-teal-700"
                  style={{ textShadow: '0 0 40px rgba(16,185,129,0.4)' }}
                >
                  CHAIN
                </span>
              </h1>

              {/* Golden Domino centerpiece — the same 6|3 tile that was just igniting, now fully lit */}
              <div className="my-3 z-10 relative animate-hero-drop-in" style={{ animationDelay: '150ms' }}>
                <div className="absolute -inset-3 bg-amber-400/20 rounded-2xl blur-xl animate-pulse" />
                <div className="absolute -inset-1 bg-gradient-to-br from-amber-400/30 to-transparent rounded-xl" />
                <Tile left={6} right={3} vertical={false} isGolden={true} />
              </div>

              {/* DOMINO — rises in from below */}
              <h1 className="text-7xl md:text-9xl font-black tracking-[0.15em] font-pixel z-10 leading-none animate-hero-fly-bottom" style={{ animationDelay: '250ms' }}>
                <span
                  className="text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-500 to-orange-700"
                  style={{ textShadow: '0 0 40px rgba(245,158,11,0.4)' }}
                >
                  DOMINO
                </span>
              </h1>

              {/* Tagline — rises up from below */}
              <p className="mt-4 text-[13px] md:text-sm text-emerald-500/60 font-medium tracking-[0.3em] uppercase font-pixel animate-hero-fly-up" style={{ animationDelay: '600ms' }}>
                Zincirini Kur · Puanını Yükselt
              </p>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
           MENU CARDS — Bottom row, only once the boot sequence has fully settled
         ══════════════════════════════════════ */}
      {bootStage === 'buttons' && (
      <div className="w-full max-w-4xl mx-auto flex flex-wrap gap-4 justify-center items-stretch pb-2 z-10">

        {/* BAŞLAT Card */}
        <button
          type="button"
          onClick={() => setTab('SETUP')}
          className="menu-card animate-card-deal flex flex-col items-center gap-2.5 w-36 md:w-40 p-4 rounded-2xl border-2 border-emerald-600/60 bg-gradient-to-b from-emerald-900/50 to-emerald-950/80 cursor-pointer select-none"
          style={{ animationDelay: '0ms', '--glow': 'rgba(16,185,129,0.4)' } as React.CSSProperties}
        >
          <span className="text-4xl">🎮</span>
          <span className="font-pixel text-base font-black text-emerald-300 tracking-wider">BAŞLAT</span>
          <span className="text-[11px] text-emerald-500/70 leading-tight text-center">Yeni bir maceraya başla</span>
        </button>

        {/* DESTE Card */}
        <button
          type="button"
          onClick={() => setTab('DECK_SELECT')}
          className="menu-card animate-card-deal flex flex-col items-center gap-2.5 w-36 md:w-40 p-4 rounded-2xl border-2 border-sky-700/50 bg-gradient-to-b from-sky-950/50 to-stone-950/80 cursor-pointer select-none"
          style={{ animationDelay: '80ms', '--glow': 'rgba(14,165,233,0.3)' } as React.CSSProperties}
        >
          <span className="text-4xl">🃏</span>
          <span className="font-pixel text-base font-black text-sky-300 tracking-wider">DESTE</span>
          <span className={`text-[11px] ${DECK_INFO[deck].color} font-bold leading-tight text-center`}>{DECK_INFO[deck].name}</span>
        </button>

        {/* ZORLUK Card */}
        <button
          type="button"
          onClick={() => setTab('STAKE_SELECT')}
          className="menu-card animate-card-deal flex flex-col items-center gap-2.5 w-36 md:w-40 p-4 rounded-2xl border-2 border-rose-700/50 bg-gradient-to-b from-rose-950/50 to-stone-950/80 cursor-pointer select-none"
          style={{ animationDelay: '160ms', '--glow': 'rgba(244,63,94,0.3)' } as React.CSSProperties}
        >
          <span className="text-4xl">🏆</span>
          <span className="font-pixel text-base font-black text-rose-300 tracking-wider">ZORLUK</span>
          <span className={`text-[11px] ${STAKE_INFO[stake].color} font-bold leading-tight text-center`}>{STAKE_INFO[stake].name}</span>
        </button>

        {/* MÜCADELE Card */}
        <button
          type="button"
          onClick={() => setTab('CHALLENGES')}
          className="menu-card animate-card-deal flex flex-col items-center gap-2.5 w-36 md:w-40 p-4 rounded-2xl border-2 border-fuchsia-700/50 bg-gradient-to-b from-fuchsia-950/50 to-stone-950/80 cursor-pointer select-none"
          style={{ animationDelay: '240ms', '--glow': 'rgba(192,38,211,0.3)' } as React.CSSProperties}
        >
          <span className="text-4xl">⚔️</span>
          <span className="font-pixel text-base font-black text-fuchsia-300 tracking-wider">MÜCADELE</span>
          <span className="text-[11px] text-fuchsia-500/70 font-bold leading-tight text-center">4 Mücadele Aktif</span>
        </button>

        {/* KOLEKSİYON Card */}
        <button
          type="button"
          onClick={() => setTab('COLLECTION')}
          className="menu-card animate-card-deal flex flex-col items-center gap-2.5 w-36 md:w-40 p-4 rounded-2xl border-2 border-amber-700/50 bg-gradient-to-b from-amber-950/50 to-stone-950/80 cursor-pointer select-none"
          style={{ animationDelay: '320ms', '--glow': 'rgba(217,119,6,0.3)' } as React.CSSProperties}
        >
          <span className="text-4xl">📖</span>
          <span className="font-pixel text-base font-black text-amber-300 tracking-wider">KOLEKSİYON</span>
          <span className="text-[11px] text-amber-500/70 font-bold leading-tight text-center">Keşfedilenler</span>
        </button>
      </div>
      )}

      {/* ══════════════════════════════════════
           BOOT SEQUENCE — a 6|3 domino tile ignites pip by pip in the dark; once every pip is
           lit, its frame materializes around them; only then does the black curtain fade back to
           the table's own color underneath (see the 'texts'/'buttons' branches for the rest).
         ══════════════════════════════════════ */}
      <div
        className={`absolute inset-0 z-30 bg-black pointer-events-none transition-opacity ease-in-out ${bootStage === 'background' || bootStage === 'buttons' ? 'opacity-0 duration-1000' : 'opacity-100 duration-0'}`}
      />
      {(bootStage === 'pips' || bootStage === 'frame') && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-32 md:w-80 md:h-40">
            {/* No frame at all while the pips are still igniting — it fades and grows into place
                only once every pip is already lit, a distinct beat rather than something that was
                quietly there the whole time. */}
            <div
              className="absolute inset-0 rounded-2xl border-2 border-amber-900/60 bg-stone-950/50 transition-all ease-out"
              style={{
                opacity: bootStage === 'frame' ? 1 : 0,
                transform: bootStage === 'frame' ? 'scale(1)' : 'scale(0.85)',
                transitionDuration: `${BOOT_FRAME_MS}ms`,
              }}
            />
            <div
              className="absolute inset-y-2 left-1/2 w-px bg-amber-900/50 -translate-x-1/2 transition-opacity"
              style={{ opacity: bootStage === 'frame' ? 1 : 0, transitionDuration: `${BOOT_FRAME_MS}ms`, transitionDelay: bootStage === 'frame' ? '200ms' : '0ms' }}
            />
            {BOOT_PIP_POSITIONS.map(([x, y], i) => (
              <span
                key={i}
                className="absolute w-4 h-4 md:w-5 md:h-5 rounded-full bg-amber-300 shadow-[0_0_18px_6px_rgba(251,191,36,0.7)] opacity-0 animate-pip-ignite"
                style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${BOOT_PIP_START_DELAY_MS + i * BOOT_PIP_STEP_MS}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
           OVERLAY DIALOGS
         ══════════════════════════════════════ */}

      {/* ── DECK SELECT ── */}
      {tab === 'DECK_SELECT' && (
        <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="w-full max-w-xl bg-stone-900 border-4 border-stone-950 rounded-3xl p-6 shadow-2xl text-white flex flex-col">
            <h2 className="text-center text-2xl font-bold font-pixel tracking-widest text-amber-400 uppercase border-b border-stone-800 pb-2">
              DESTE SEÇİMİ
            </h2>
            
            <div className="grid grid-cols-3 gap-3 mt-4">
              {(['RED', 'BLUE', 'YELLOW'] as const).map((d) => {
                const info = DECK_INFO[d];
                const isActive = deck === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDeck(d)}
                    className={`menu-card flex flex-col justify-between p-3 rounded-xl border-2 text-center h-40 cursor-pointer select-none ${isActive ? info.borderActive : 'border-stone-800 bg-stone-950/40 hover:border-stone-700'}`}
                    style={{ '--glow': 'transparent' } as React.CSSProperties}
                  >
                    <span className={`text-4xl font-bold ${info.color}`}>{info.icon}</span>
                    <span className={`text-sm font-bold ${info.color} leading-none`}>{info.name}</span>
                    <span className="text-[12px] text-stone-300 leading-tight">{info.desc}</span>
                    {isActive && <span className="text-[11px] font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">✓ SEÇİLİ</span>}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setTab('MAIN')}
              className="mt-5 w-full py-2.5 bg-stone-800 hover:bg-stone-700 font-bold rounded-xl border border-stone-950 text-sm transition cursor-pointer select-none"
            >
              TAMAM
            </button>
          </div>
        </div>
      )}

      {/* ── STAKE SELECT ── */}
      {tab === 'STAKE_SELECT' && (
        <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="w-full max-w-lg bg-stone-900 border-4 border-stone-950 rounded-3xl p-6 shadow-2xl text-white flex flex-col">
            <h2 className="text-center text-2xl font-bold font-pixel tracking-widest text-red-400 uppercase border-b border-stone-800 pb-2">
              ZORLUK SEÇİMİ
            </h2>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {(['WHITE', 'RED'] as const).map((s) => {
                const info = STAKE_INFO[s];
                const isActive = stake === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStake(s)}
                    className={`menu-card flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition cursor-pointer select-none ${isActive ? info.borderActive : 'border-stone-800 bg-stone-950/40 hover:border-stone-700'}`}
                    style={{ '--glow': 'transparent' } as React.CSSProperties}
                  >
                    <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center font-pixel text-base font-black shadow ${
                      s === 'WHITE' ? 'border-stone-400 bg-white text-stone-800' : 'border-red-700 bg-red-500 text-white animate-pulse'
                    }`}>
                      {s === 'WHITE' ? 'W' : 'R'}
                    </div>
                    <span className={`text-sm font-bold ${info.color}`}>{info.name}</span>
                    <span className="text-[12px] text-stone-400 leading-tight">{info.desc}</span>
                    {isActive && <span className="text-[11px] font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">✓ SEÇİLİ</span>}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setTab('MAIN')}
              className="mt-5 w-full py-2.5 bg-stone-800 hover:bg-stone-700 font-bold rounded-xl border border-stone-950 text-sm transition cursor-pointer select-none"
            >
              TAMAM
            </button>
          </div>
        </div>
      )}

      {/* ── CHALLENGES ── */}
      {tab === 'CHALLENGES' && (
        <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="w-full max-w-2xl bg-stone-900 border-4 border-stone-950 rounded-3xl p-6 shadow-2xl text-white flex flex-col max-h-[90vh] overflow-y-auto">
            <h2 className="text-center text-2xl font-bold font-pixel tracking-widest text-fuchsia-400 uppercase border-b border-stone-800 pb-2">
              MÜCADELELER
            </h2>
            <p className="text-center text-[12px] text-stone-500 mt-1.5 mb-4">
              Özel kurallarla oyna, becerinle sınırlarını zorla!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CHALLENGES.map((ch) => (
                <div
                  key={ch.id}
                  className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 transition select-none ${
                    ch.unlocked
                      ? 'border-stone-700 bg-stone-950/50 hover:border-fuchsia-700/50 hover:bg-fuchsia-950/10 cursor-pointer'
                      : 'border-stone-800 bg-stone-950/20 opacity-40 cursor-not-allowed'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{ch.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-sm font-black text-stone-100 truncate">{ch.name}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${ch.diffColor} border-current/30 bg-current/5`}>
                          {ch.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[12px] text-stone-400 leading-relaxed">{ch.description}</p>

                  {/* Rule badge */}
                  <div className="flex items-center gap-1.5 bg-stone-950/60 border border-stone-800 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px] text-amber-500 font-bold">KURAL:</span>
                    <span className="text-[11px] text-stone-300">{ch.rule}</span>
                  </div>

                  {/* Play button */}
                  {ch.unlocked && (
                    <button
                      type="button"
                      onClick={() => onStart(deck, stake, selectedChest, ch.id)}
                      className="w-full py-2 rounded-lg bg-fuchsia-700 hover:bg-fuchsia-600 text-[12px] font-bold font-pixel text-white uppercase tracking-wider shadow border-b-2 border-fuchsia-900 transition cursor-pointer"
                    >
                      MÜCADELEYE BAŞLA
                    </button>
                  )}

                  {!ch.unlocked && (
                    <div className="text-center text-[12px] text-stone-600 font-pixel">🔒 Kilitli</div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setTab('MAIN')}
              className="mt-5 w-full py-2.5 bg-stone-800 hover:bg-stone-700 font-bold rounded-xl border border-stone-950 text-sm transition cursor-pointer select-none"
            >
              KAPAT
            </button>
          </div>
        </div>
      )}

      {/* ── COLLECTION ── */}
      {tab === 'COLLECTION' && <CollectionScreen onBack={() => setTab('MAIN')} />}

      {/* ── SETUP & START CONFIRM ── */}
      {tab === 'SETUP' && (
        <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-chain-place">
          <div className="w-full max-w-lg bg-stone-900 border-4 border-stone-950 rounded-3xl p-5 shadow-2xl text-white flex flex-col max-h-full overflow-y-auto">
            <h2 className="text-center text-2xl font-bold font-pixel tracking-widest text-emerald-400 uppercase border-b border-stone-800 pb-2">
              SEFER KURULUMU
            </h2>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex justify-between items-center bg-stone-950/40 p-2.5 rounded-lg border border-stone-850">
                <span className="text-sm text-stone-400 font-medium">Seçili Deste:</span>
                <span className={`text-sm font-bold ${DECK_INFO[deck].color}`}>{DECK_INFO[deck].name}</span>
              </div>
              <div className="flex justify-between items-center bg-stone-950/40 p-2.5 rounded-lg border border-stone-850">
                <span className="text-sm text-stone-400 font-medium">Zorluk Seviyesi:</span>
                <span className={`text-sm font-bold ${STAKE_INFO[stake].color}`}>{STAKE_INFO[stake].name}</span>
              </div>
            </div>

            {/* Chest Selection */}
            <div className="mt-4">
              <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-2">🏴 Başlangıç Sandığı Seç</p>
              <div className="grid grid-cols-2 gap-2">
                {STARTING_CHESTS.map((chest) => {
                  const isSelected = selectedChest === chest.id;
                  return (
                    <button
                      key={chest.id}
                      type="button"
                      onClick={() => setSelectedChest(isSelected ? null : chest.id)}
                      className={[
                        'menu-card flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition text-left cursor-pointer',
                        isSelected
                          ? 'border-amber-400 bg-amber-950/20 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                          : 'border-stone-700 bg-stone-950/30 hover:border-stone-500',
                      ].join(' ')}
                      style={{ '--glow': 'rgba(251,191,36,0.3)' } as React.CSSProperties}
                    >
                      <span className="text-4xl">{chest.icon}</span>
                      <span className={`text-[13px] font-pixel font-bold text-center leading-tight ${isSelected ? 'text-amber-300' : 'text-stone-200'}`}>
                        {chest.name}
                      </span>
                      <span className="text-[11px] text-stone-400 text-center leading-tight">
                        {chest.description}
                      </span>
                      {isSelected && (
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">✓ SEÇİLDİ</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-500 mt-2 text-center">Sandık seçimi opsiyoneldir.</p>
            </div>

            <button
              type="button"
              onClick={handleLaunch}
              disabled={launchStage !== 'idle'}
              className="mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:translate-y-0.5 text-sm font-bold text-white shadow border-b-4 border-emerald-800 transition cursor-pointer select-none uppercase font-pixel tracking-widest disabled:opacity-60 disabled:pointer-events-none"
            >
              🚀 Macerayı Başlat
            </button>

            <button
              type="button"
              onClick={() => setTab('MAIN')}
              className="mt-3.5 w-full py-2 bg-stone-800 hover:bg-stone-700 font-bold rounded-xl border border-stone-950 text-sm transition cursor-pointer select-none"
            >
              GERİ DÖN
            </button>
          </div>
        </div>
      )}

      {/* Chest-opening vortex transition into Kabine Eşikleri — the chosen chest grows and
          glows, then a burst of spinning light rings and dust fills the whole screen; onStart()
          only actually fires once that flash is fully opaque, masking the instant screen swap
          underneath it. */}
      {launchStage !== 'idle' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-950 overflow-hidden pointer-events-none">
          {launchStage === 'growing' && (
            <span className="text-8xl animate-chest-grow">{chestIcon}</span>
          )}
          {launchStage === 'vortex' && (
            <>
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-40 h-40 rounded-full border-4 border-amber-300/70 animate-vortex-ring"
                  style={{ animationDelay: `${i * 90}ms` }}
                />
              ))}
              <div className="absolute inset-0 bg-amber-200 animate-vortex-flash" />
            </>
          )}
        </div>
      )}
    </div>
  );
}
