import type { OperatorCard } from '../../models/types.js';
import OperatorTile from './OperatorTile.js';

interface OperatorHandProps {
  operators: OperatorCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  deckRemaining: number;
  onDrawCycle: () => void;
}

export default function OperatorHand({
  operators,
  selectedId,
  onSelect,
  deckRemaining,
  onDrawCycle,
}: OperatorHandProps) {
  const activeOp = operators[0] || null;

  return (
    <div className="flex flex-col gap-1 select-none">
      <h2 className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider text-center">
        Operatörler
      </h2>

      <div className="flex items-center gap-3 justify-center">
        {/* Draw Pile (Solitaire Face-Down Deck) — fixed order, never reshuffles mid-round */}
        <button
          type="button"
          onClick={onDrawCycle}
          title="Aktif operatörü değiştir (sıradaki kartı çeker, deste sırası değişmez)"
          className="w-18 h-24 rounded-lg bg-linear-to-br from-amber-700 to-amber-900 border-2 border-amber-600/70 shadow-[0_3px_5px_rgba(0,0,0,0.55)] hover:border-amber-400 flex flex-col items-center justify-between p-2 transition active:scale-95 group relative select-none cursor-pointer"
        >
          <div className="text-[10px] font-bold text-amber-200/50 uppercase leading-none mt-0.5">Deste</div>
          <span className="text-2xl group-hover:scale-110 transition leading-none my-auto">🎴</span>
          <div className="text-[11px] font-mono text-amber-300 font-bold leading-none mb-0.5">
            {deckRemaining}
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
            onClick={onDrawCycle}
            className="w-18 h-24 rounded-lg border-2 border-dashed border-slate-700 bg-slate-950/40 flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-500 hover:border-slate-650 hover:text-slate-400 cursor-pointer"
          >
            <span className="text-sm">➕</span>
            <span>ÇEK</span>
          </button>
        )}
      </div>
    </div>
  );
}
