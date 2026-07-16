interface UnlockPopupProps {
  onContinue: () => void;
}

export default function UnlockPopup({ onContinue }: UnlockPopupProps) {
  return (
    <div className="w-full max-w-sm my-auto rounded-3xl bg-slate-900 border-4 border-slate-950 p-6 shadow-2xl text-white crt text-center select-none animate-[fade-in_0.5s_ease-out]">
      <h2 className="text-xl font-black font-pixel tracking-widest text-teal-400 uppercase">
        TILSIM AÇILDI!
      </h2>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
        Joker Unlocked!
      </p>

      {/* Card Visual Artwork */}
      <div className="my-6 flex justify-center">
        <div className="w-36 h-56 rounded-2xl border-4 border-dashed border-teal-500 bg-teal-950/20 shadow-[0_0_20px_rgba(45,157,150,0.5)] flex flex-col justify-between p-4 relative overflow-hidden animate-bounce">
          {/* Card Title */}
          <div>
            <span className="text-[8px] uppercase tracking-wider text-teal-400 font-extrabold">EFSANEVİ</span>
            <h4 className="text-xs font-bold leading-tight mt-1 text-slate-200">
              Süper Domino Ustası
            </h4>
          </div>

          {/* SVG Artwork: Crack Lock Icon */}
          <div className="flex items-center justify-center">
            <svg className="w-16 h-16 text-teal-400 animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <rect x="25" y="45" width="50" height="40" rx="5" />
              <path d="M35 45V30a15 15 0 0 1 30 0v15" />
              <path d="M50 60v10" strokeWidth="5" />
              <circle cx="50" cy="60" r="3" fill="currentColor" />
              {/* Crack Sparkle */}
              <path d="M20 20 L25 25 M80 20 L75 25 M50 5 L50 12" stroke="#FBBF24" strokeWidth="2" />
            </svg>
          </div>

          {/* Card description */}
          <p className="text-[8px] text-slate-300 leading-normal">
            Tüm turlarda çarpma (x) operatörünün puanını ikiye katlar!
          </p>
        </div>
      </div>

      <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 text-xs text-slate-350 leading-relaxed font-outfit mb-6">
        🎉 <strong>Tebrikler!</strong> Oyunu tamamlayarak efsanevi <span className="text-teal-400 font-bold">Süper Domino Ustası</span> kartının kilidini kalıcı olarak açtınız.
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 text-xs font-pixel font-bold text-slate-950 shadow-lg shadow-amber-950/40 border-b-4 border-amber-700 transition"
      >
        DEVAM ET (CONTINUE)
      </button>
    </div>
  );
}
