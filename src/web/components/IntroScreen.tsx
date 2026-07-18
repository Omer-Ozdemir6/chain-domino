import { useEffect, useState } from 'react';
import { playSound } from './SoundSynth.js';

interface IntroScreenProps {
  /** Called once the zoom-out exit animation has finished playing. */
  onEnter: () => void;
}

// A double-six domino half: 6 pips in a 2x3 grid, positioned as percentages of the tile.
const PIP_POSITIONS: Array<[number, number]> = [
  [28, 18], [72, 18],
  [28, 50], [72, 50],
  [28, 82], [72, 82],
];
const PIP_START_DELAY_MS = 350;
const PIP_STEP_MS = 220;

type Stage = 'black' | 'pips' | 'reveal' | 'ready';

/** "Müzenin Kapıları Aralanıyor" — a one-time, dark title-card moment shown before the main
 *  menu. The screen opens on pure black; a single domino tile catches light pip by pip out of
 *  the darkness; once fully lit, two black curtain panels part to reveal the glowing logo
 *  underneath. Pressing through then zooms the camera past the logo toward the table. */
export default function IntroScreen({ onEnter }: IntroScreenProps) {
  const [stage, setStage] = useState<Stage>('black');
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStage('pips'), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (stage !== 'pips') return;
    const tickTimers = PIP_POSITIONS.map((_, i) =>
      setTimeout(() => playSound('pulse', i * 2), PIP_START_DELAY_MS + i * PIP_STEP_MS)
    );
    const revealTimer = setTimeout(() => {
      playSound('chime');
      setStage('reveal');
    }, PIP_START_DELAY_MS + PIP_POSITIONS.length * PIP_STEP_MS + 550);
    return () => {
      tickTimers.forEach(clearTimeout);
      clearTimeout(revealTimer);
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== 'reveal') return;
    const t = setTimeout(() => setStage('ready'), 900);
    return () => clearTimeout(t);
  }, [stage]);

  function handleEnter() {
    if (exiting || stage !== 'ready') return;
    setExiting(true);
    setTimeout(onEnter, 900);
  }

  const curtainsOpen = stage === 'reveal' || stage === 'ready';

  return (
    <div
      className={`absolute inset-0 z-[9999] bg-black overflow-hidden select-none ${stage === 'ready' ? 'cursor-pointer' : ''} ${exiting ? 'animate-intro-zoom-out' : ''}`}
      onClick={handleEnter}
    >
      {/* Layer 0: the revealed scene — glow, dust, logo, prompt — sits beneath the curtains the
          whole time, only actually visible once they part. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {curtainsOpen && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[26rem] h-[26rem] md:w-[36rem] md:h-[36rem] rounded-full bg-amber-500/10 blur-[90px] animate-intro-lamp-flicker" />
          </div>
        )}

        {stage === 'ready' &&
          Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-amber-200/40 pointer-events-none animate-intro-dust"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53 + 10) % 100}%`,
                width: `${1 + (i % 3)}px`,
                height: `${1 + (i % 3)}px`,
                animationDelay: `${(i * 0.55).toFixed(2)}s`,
                animationDuration: `${6 + (i % 4)}s`,
              }}
            />
          ))}

        {curtainsOpen && (
          <>
            <h1 className="relative font-pixel text-5xl md:text-7xl lg:text-8xl tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 drop-shadow-[0_0_45px_rgba(217,158,74,0.5)] animate-intro-logo-in text-center px-4">
              CHAIN DOMINO
            </h1>
            <p
              className="relative mt-3 text-amber-200/50 text-[11px] md:text-sm tracking-[0.4em] uppercase font-sans animate-intro-logo-in"
              style={{ animationDelay: '300ms' }}
            >
              Garabetler Kabinesi
            </p>
          </>
        )}

        {stage === 'ready' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEnter();
            }}
            className="relative mt-14 md:mt-16 px-8 py-3 rounded-xl border-2 border-amber-600/60 text-amber-300 font-pixel text-sm tracking-widest uppercase bg-black/40 hover:bg-amber-950/30 hover:border-amber-400 transition animate-intro-prompt-in"
            style={{ animationDelay: '700ms' }}
          >
            Oyuna Başla
          </button>
        )}
      </div>

      {/* Layer 1: the domino tile lighting up pip by pip, floating on top of the still-closed
          curtains — fades out the instant the curtains start to part. */}
      {(stage === 'pips' || stage === 'reveal') && (
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-500 ${stage === 'reveal' ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="relative w-36 h-52 md:w-48 md:h-64 rounded-2xl border-2 border-amber-900/60 bg-stone-950/50 animate-intro-tile-in">
            {PIP_POSITIONS.map(([x, y], i) => (
              <span
                key={i}
                className="absolute w-4 h-4 md:w-5 md:h-5 rounded-full bg-amber-300 shadow-[0_0_18px_6px_rgba(251,191,36,0.7)] opacity-0 animate-pip-ignite"
                style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${PIP_START_DELAY_MS + i * PIP_STEP_MS}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Layer 2: solid black curtain panels — flush together (a fully black screen) until the
          reveal stage, then slide apart off-screen. */}
      <div
        className={`absolute inset-y-0 left-0 w-1/2 z-10 bg-black pointer-events-none ${curtainsOpen ? 'animate-curtain-open-left' : ''}`}
      />
      <div
        className={`absolute inset-y-0 right-0 w-1/2 z-10 bg-black pointer-events-none ${curtainsOpen ? 'animate-curtain-open-right' : ''}`}
      />
    </div>
  );
}
