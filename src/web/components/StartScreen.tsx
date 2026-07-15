import { useState } from 'react';
import Tile from './Tile.js';

interface StartScreenProps {
  onStart: (deck: 'RED' | 'BLUE' | 'YELLOW', stake: 'WHITE' | 'RED') => void;
}

type TabState = 'MAIN' | 'DECK_SELECT' | 'STAKE_SELECT' | 'CHALLENGES' | 'SETUP';

export default function StartScreen({ onStart }: StartScreenProps) {
  const [deck, setDeck] = useState<'RED' | 'BLUE' | 'YELLOW'>('RED');
  const [stake, setStake] = useState<'WHITE' | 'RED'>('WHITE');
  const [tab, setTab] = useState<TabState>('MAIN');

  // Decks helper details
  const DECK_NAMES = {
    RED: 'Kırmızı Deste',
    BLUE: 'Mavi Deste',
    YELLOW: 'Sarı Deste',
  };

  const STAKE_NAMES = {
    WHITE: 'Beyaz Pul (White Stake)',
    RED: 'Kırmızı Pul (Red Stake)',
  };

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-6 select-none overflow-hidden swirl-red-blue-bg">

      {/* Top watermark info */}
      <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-widest opacity-60">
        <span>Google DeepMind Antigravity Edition</span>
        <span>v1.2.0-FULL</span>
      </div>

      {/* Main Centered Balatro-Style Logo */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 my-auto">
        <div className="relative flex flex-col items-center select-none transform hover:scale-105 transition duration-300">

          {/* Neon Ring Behind the Logo */}
          <div className="absolute w-64 h-64 rounded-full border-4 border-dashed border-cyan-500/30 animate-spin [animation-duration:20s] z-0" />
          <div className="absolute w-56 h-56 rounded-full border-2 border-emerald-500/25 animate-pulse z-0" />

          {/* CHAIN Text (Upper Title) */}
          <h1 className="text-8xl font-black tracking-widest text-white font-pixel drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] z-10 leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-500 to-amber-600">
              CHAIN
            </span>
          </h1>

          {/* Spinning / Glowing Golden Domino in the middle */}
          <div className="my-4 z-10 transform rotate-12 scale-125 shadow-2xl relative">
            <div className="absolute inset-0 bg-amber-400/25 rounded-xl blur-md animate-pulse" />
            <Tile left={1} right={6} vertical={false} isGolden={true} />
          </div>

          {/* DOMINO Text (Lower Title) */}
          <h1 className="text-8xl font-black tracking-widest text-white font-pixel drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] z-10 leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 via-sky-500 to-indigo-600">
              DOMINO
            </span>
          </h1>
        </div>
      </div>

      {/* Bottom Horizontal Balatro Menu Buttons */}
      <div className="w-full max-w-3xl mx-auto flex flex-wrap gap-3 justify-center items-center pb-4 z-10">
        
        {/* PLAY Button */}
        <button
          type="button"
          onClick={() => setTab('SETUP')}
          className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 hover:scale-105 active:translate-y-0.5 text-sm font-bold text-white shadow-lg border-b-4 border-emerald-800 transition cursor-pointer select-none font-pixel tracking-wider"
        >
          🎮 BAŞLAT (PLAY)
        </button>

        {/* DECKS Button */}
        <button
          type="button"
          onClick={() => setTab('DECK_SELECT')}
          className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 hover:scale-105 active:translate-y-0.5 text-sm font-bold text-slate-100 shadow border-b-4 border-slate-950 transition cursor-pointer select-none"
        >
          🃏 DESTE: <span className="text-amber-400 font-semibold">{DECK_NAMES[deck]}</span>
        </button>

        {/* STAKES Button */}
        <button
          type="button"
          onClick={() => setTab('STAKE_SELECT')}
          className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 hover:scale-105 active:translate-y-0.5 text-sm font-bold text-slate-100 shadow border-b-4 border-slate-950 transition cursor-pointer select-none"
        >
          🏆 ZORLUK: <span className="text-red-400 font-semibold">{stake === 'WHITE' ? 'Beyaz Pul' : 'Kırmızı Pul'}</span>
        </button>

        {/* CHALLENGES Button */}
        <button
          type="button"
          onClick={() => setTab('CHALLENGES')}
          className="px-6 py-3 rounded-xl bg-slate-850 hover:bg-slate-800 hover:scale-105 active:translate-y-0.5 text-sm font-bold text-slate-400 border-b-4 border-slate-950 transition cursor-pointer select-none"
        >
          🔒 MÜCADELELER
        </button>
      </div>

      {/* OVERLAY DIALOGS (Centered modally on top of the menu with pointer z-index protection) */}
      
      {/* DECK SELECT TAB */}
      {tab === 'DECK_SELECT' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-xl bg-slate-900 border-4 border-slate-950 rounded-3xl p-6 shadow-2xl text-white crt flex flex-col">
            <h2 className="text-center text-xl font-bold font-pixel tracking-widest text-amber-400 uppercase border-b border-slate-800 pb-2">
              DESTE SEÇİMİ (CHOOSE DECK)
            </h2>
            
            <div className="grid grid-cols-3 gap-3 mt-4">
              <button
                onClick={() => setDeck('RED')}
                className={`flex flex-col justify-between p-3 rounded-xl border-2 text-center h-36 transition cursor-pointer select-none ${deck === 'RED' ? 'border-red-500 bg-red-950/30 shadow-[0_0_12px_rgba(239,68,68,0.35)]' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
              >
                <span className="text-xs font-bold text-red-400 leading-none">Kırmızı Deste</span>
                <div className="w-7 h-9 bg-red-600 rounded border border-red-500/50 mx-auto shadow flex items-center justify-center font-bold text-[11px] text-white">RED</div>
                <span className="text-[11px] text-slate-300 leading-tight">Her tur fazladan +1 Iskarta hakkı verir.</span>
              </button>

              <button
                onClick={() => setDeck('BLUE')}
                className={`flex flex-col justify-between p-3 rounded-xl border-2 text-center h-36 transition cursor-pointer select-none ${deck === 'BLUE' ? 'border-sky-500 bg-sky-950/30 shadow-[0_0_12px_rgba(56,189,248,0.35)]' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
              >
                <span className="text-xs font-bold text-sky-400 leading-none">Mavi Deste</span>
                <div className="w-7 h-9 bg-sky-600 rounded border border-sky-500/50 mx-auto shadow flex items-center justify-center font-bold text-[11px] text-white">BLUE</div>
                <span className="text-[11px] text-slate-300 leading-tight">Her tur fazladan +1 Hamle (Turn) hakkı verir.</span>
              </button>

              <button
                onClick={() => setDeck('YELLOW')}
                className={`flex flex-col justify-between p-3 rounded-xl border-2 text-center h-36 transition cursor-pointer select-none ${deck === 'YELLOW' ? 'border-amber-500 bg-amber-950/30 shadow-[0_0_12px_rgba(245,158,11,0.35)]' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
              >
                <span className="text-xs font-bold text-amber-400 leading-none">Sarı Deste</span>
                <div className="w-7 h-9 bg-amber-500 rounded border border-amber-400/50 mx-auto shadow flex items-center justify-center font-bold text-[11px] text-white">GOLD</div>
                <span className="text-[11px] text-slate-300 leading-tight">Oyuna fazladan +$4 bakiye ile başlar.</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setTab('MAIN')}
              className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl border border-slate-950 text-xs transition cursor-pointer select-none"
            >
              TAMAM (CLOSE)
            </button>
          </div>
        </div>
      )}

      {/* STAKE SELECT TAB */}
      {tab === 'STAKE_SELECT' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-950 rounded-3xl p-6 shadow-2xl text-white crt flex flex-col">
            <h2 className="text-center text-xl font-bold font-pixel tracking-widest text-red-400 uppercase border-b border-slate-800 pb-2">
              ZORLUK SEÇİMİ (STAKES)
            </h2>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setStake('WHITE')}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition cursor-pointer select-none ${stake === 'WHITE' ? 'border-slate-300 bg-slate-950/40 shadow-[0_0_8px_rgba(255,255,255,0.15)]' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
              >
                <div className="w-8 h-8 rounded-full border-4 border-slate-400 bg-white flex items-center justify-center text-slate-800 font-pixel text-xs font-black shadow shrink-0">W</div>
                <div>
                  <span className="text-xs font-bold block text-slate-100">Beyaz Pul (White Stake)</span>
                  <span className="text-[11px] text-slate-450 leading-none">Standart hedefler ve temel zorluk derecesi.</span>
                </div>
              </button>

              <button
                onClick={() => setStake('RED')}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition cursor-pointer select-none ${stake === 'RED' ? 'border-red-500 bg-slate-950/40 shadow-[0_0_10px_rgba(239,68,68,0.25)]' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
              >
                <div className="w-8 h-8 rounded-full border-4 border-red-700 bg-red-500 flex items-center justify-center text-white font-pixel text-xs font-black shadow shrink-0 animate-pulse">R</div>
                <div>
                  <span className="text-xs font-bold block text-red-400">Kırmızı Pul (Red Stake)</span>
                  <span className="text-[11px] text-slate-450 leading-none">Hedef skorlar %25 daha yüksektir.</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setTab('MAIN')}
              className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl border border-slate-950 text-xs transition cursor-pointer select-none"
            >
              TAMAM (CLOSE)
            </button>
          </div>
        </div>
      )}

      {/* CHALLENGES TAB */}
      {tab === 'CHALLENGES' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-md bg-slate-900 border-4 border-slate-950 rounded-3xl p-5 shadow-2xl text-white crt flex flex-col">
            <h2 className="text-center text-xl font-bold font-pixel tracking-widest text-slate-400 uppercase border-b border-slate-800 pb-2">
              MÜCADELELER (CHALLENGES)
            </h2>

            <div className="flex flex-col gap-2.5 mt-4 opacity-50 select-none">
              <div className="border border-dashed border-slate-800 bg-slate-950/20 p-3 rounded-lg flex items-center gap-2">
                <span className="text-slate-500 font-pixel text-xs">🔒</span>
                <span className="text-xs text-slate-400 font-mono">1. Mücadele: ??? (Kilitli)</span>
              </div>
              <div className="border border-dashed border-slate-800 bg-slate-950/20 p-3 rounded-lg flex items-center gap-2">
                <span className="text-slate-500 font-pixel text-xs">🔒</span>
                <span className="text-xs text-slate-400 font-mono">2. Mücadele: ??? (Kilitli)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTab('MAIN')}
              className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl border border-slate-950 text-xs transition cursor-pointer select-none"
            >
              KAPAT (CLOSE)
            </button>
          </div>
        </div>
      )}

      {/* SETUP & START CONFIRM TAB */}
      {tab === 'SETUP' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-chain-place">
          <div className="w-full max-w-sm bg-slate-900 border-4 border-slate-950 rounded-3xl p-5 shadow-2xl text-white crt flex flex-col">
            <h2 className="text-center text-xl font-bold font-pixel tracking-widest text-emerald-400 uppercase border-b border-slate-800 pb-2">
              SEFER KURULUMU
            </h2>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                <span className="text-xs text-slate-400 font-medium">Seçili Deste:</span>
                <span className="text-xs font-bold text-amber-400">{DECK_NAMES[deck]}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                <span className="text-xs text-slate-400 font-medium">Zorluk Seviyesi:</span>
                <span className="text-xs font-bold text-red-400">{stake === 'WHITE' ? 'Beyaz Pul' : 'Kırmızı Pul'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStart(deck, stake)}
              className="mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:translate-y-0.5 text-xs font-bold text-white shadow border-b-4 border-red-800 transition cursor-pointer select-none uppercase font-pixel tracking-widest"
            >
              🚀 Macerayı Başlat (START RUN)
            </button>

            <button
              type="button"
              onClick={() => setTab('MAIN')}
              className="mt-3.5 w-full py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl border border-slate-950 text-xs transition cursor-pointer select-none"
            >
              GERİ DÖN (BACK)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
