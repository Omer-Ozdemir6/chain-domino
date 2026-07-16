import type { OperatorCard } from '../../models/types.js';
import OperatorTile from './OperatorTile.js';

interface OperatorHandProps {
  operators: OperatorCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  deckRemaining: number;
  onDrawCycle: () => void;
  cycles: number;
  maxCycles: number;
}

export default function OperatorHand({
  operators,
  selectedId,
  onSelect,
  deckRemaining,
  onDrawCycle,
  cycles,
  maxCycles,
}: OperatorHandProps) {
  const activeOp = operators[0] || null;
  const disabled = deckRemaining === 0 && cycles >= maxCycles;

  return (
    <div className="flex flex-col gap-1 select-none">
      <h2 className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider text-center">
        Operatörler
      </h2>

      <div className="flex items-center gap-3 justify-center">
        {/* Draw Pile (Solitaire Face-Down Deck) — fixed order, never reshuffles mid-round */}
        <button
          type="button"
          onClick={disabled ? undefined : onDrawCycle}
          disabled={disabled}
          title={disabled ? "Tüm devir haklarınız bitti!" : "Aktif operatörü değiştir (sıradaki kartı çeker, deste sırası değişmez)"}
          className={[
            "w-18 h-24 rounded-lg flex flex-col items-center justify-between p-2 transition relative select-none",
            disabled
              ? "bg-slate-900/60 border-2 border-slate-800 opacity-40 cursor-not-allowed pointer-events-none shadow-none"
              : "bg-linear-to-br from-amber-700 to-amber-900 border-2 border-amber-600/70 shadow-[0_3px_5px_rgba(0,0,0,0.55)] hover:border-amber-400 cursor-pointer active:scale-95 group"
          ].join(' ')}
        >
          <div className="text-[10px] font-bold text-amber-200/50 uppercase leading-none mt-0.5">Deste</div>
          <span className="text-2xl group-hover:scale-110 transition leading-none my-auto">🎴</span>
          <div className="text-[11px] font-mono text-amber-300 font-bold leading-none mb-0.5">
            {deckRemaining}
          </div>
          {/* Cycle counter badge */}
          <div className="absolute -top-1.5 -right-1.5 bg-slate-950 border border-amber-600/60 rounded-full px-1 py-0.5 text-[7px] font-pixel text-amber-400 font-bold leading-none whitespace-nowrap shadow z-10">
            Devir: {maxCycles - cycles}
          </div>
        </button>

        {/* Active Slot (Face-Up Card or Empty Box) */}
        {activeOp ? (
          <div className="transform transition hover:scale-105">
            <OperatorTile
              symbol={activeOp.symbol}
              selected={selectedId === activeOp.id}
              onClick={() => onSelect(activeOp.id)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={disabled ? undefined : onDrawCycle}
            disabled={disabled}
            className={[
              "w-18 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition",
              disabled
                ? "border-slate-800 bg-slate-950/20 text-slate-700 cursor-not-allowed opacity-40 pointer-events-none"
                : "border-slate-700 bg-slate-950/40 text-slate-500 hover:border-slate-650 hover:text-slate-400 cursor-pointer"
            ].join(' ')}
          >
            <span className="text-sm">➕</span>
            <span>ÇEK</span>
          </button>
        )}
      </div>
    </div>
  );
}
