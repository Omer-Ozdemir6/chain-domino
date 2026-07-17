import { useState } from 'react';

interface IntroScreenProps {
  /** Called once the zoom-out exit animation has finished playing. */
  onEnter: () => void;
}

/** "Müzenin Kapıları Aralanıyor" — a one-time, dark title-card moment shown before the main
 *  menu: the logo catches a faint gas-lamp glow out of the darkness, dust motes drift past it,
 *  and pressing through zooms the camera past the logo toward the table underneath. */
export default function IntroScreen({ onEnter }: IntroScreenProps) {
  const [exiting, setExiting] = useState(false);

  function handleEnter() {
    if (exiting) return;
    setExiting(true);
    setTimeout(onEnter, 900);
  }

  return (
    <div
      className={`absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden select-none cursor-pointer ${exiting ? 'animate-intro-zoom-out' : ''}`}
      onClick={handleEnter}
    >
      {/* Faint gas-lamp glow bleeding from behind the logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[26rem] h-[26rem] md:w-[36rem] md:h-[36rem] rounded-full bg-amber-500/10 blur-[90px] animate-intro-lamp-flicker" />
      </div>

      {/* Dust motes drifting in the dark before the table even appears */}
      {Array.from({ length: 12 }, (_, i) => (
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

      <h1 className="relative font-pixel text-5xl md:text-7xl lg:text-8xl tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 drop-shadow-[0_0_45px_rgba(217,158,74,0.5)] animate-intro-logo-in text-center px-4">
        CHAIN DOMINO
      </h1>
      <p
        className="relative mt-3 text-amber-200/50 text-[11px] md:text-sm tracking-[0.4em] uppercase font-sans animate-intro-logo-in"
        style={{ animationDelay: '300ms' }}
      >
        Garabetler Kabinesi
      </p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleEnter();
        }}
        className="relative mt-14 md:mt-16 px-8 py-3 rounded-xl border-2 border-amber-600/60 text-amber-300 font-pixel text-sm tracking-widest uppercase bg-black/40 hover:bg-amber-950/30 hover:border-amber-400 transition animate-intro-prompt-in"
        style={{ animationDelay: '1300ms' }}
      >
        Oyuna Başla
      </button>
    </div>
  );
}
