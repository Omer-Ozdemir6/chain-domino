import { useState } from 'react';
import { getSfxSettings, setSfxMuted, setSfxVolume, playSound } from './SoundSynth.js';

interface SettingsButtonProps {
  /** Portrait/HUD placements sit inside a tighter row than the main menu's corner badge. */
  compact?: boolean;
}

/** A self-contained gear icon + popover: toggles SFX mute and volume, persisted directly by
 *  SoundSynth.ts (chain-domino-sfx-v1). Drop-in anywhere — StartScreen's corner and the in-game
 *  HUD each mount their own instance rather than sharing lifted state, since the underlying
 *  settings themselves are the single source of truth (module-level in SoundSynth.ts). */
export default function SettingsButton({ compact = false }: SettingsButtonProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(getSfxSettings);

  function toggleMute() {
    const next = !settings.muted;
    setSfxMuted(next);
    setSettings((s) => ({ ...s, muted: next }));
    if (!next) playSound('chime');
  }

  function changeVolume(volume: number) {
    setSfxVolume(volume);
    setSettings((s) => ({ ...s, volume }));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ses Ayarları"
        className={`flex items-center justify-center rounded-full border border-stone-700 bg-stone-950/60 text-stone-400 hover:text-amber-300 hover:border-amber-600/50 transition cursor-pointer select-none ${
          compact ? 'w-7 h-7 text-sm' : 'w-9 h-9 text-base'
        }`}
      >
        {settings.muted ? '🔇' : '⚙️'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-stone-900 border-2 border-stone-800 rounded-xl p-3 shadow-2xl animate-fade-in">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Ses Ayarları</span>

            <button
              type="button"
              onClick={toggleMute}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[12px] font-bold transition cursor-pointer ${
                settings.muted
                  ? 'border-rose-800 bg-rose-950/30 text-rose-400'
                  : 'border-emerald-800 bg-emerald-950/20 text-emerald-400'
              }`}
            >
              <span>{settings.muted ? 'Sessiz' : 'Sesler Açık'}</span>
              <span>{settings.muted ? '🔇' : '🔊'}</span>
            </button>

            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-stone-500 mb-1">
                <span>Ses Düzeyi</span>
                <span>{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.volume * 100)}
                onChange={(e) => changeVolume(Number(e.target.value) / 100)}
                disabled={settings.muted}
                className="w-full accent-amber-500 disabled:opacity-30 cursor-pointer"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
