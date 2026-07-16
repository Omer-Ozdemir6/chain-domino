import type { OperatorCard } from '../../models/types.js';
import OperatorTile from './OperatorTile.js';

interface OperatorHandProps {
  operators: OperatorCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  deckRemaining: number;
}

/**
 * A fixed set of always-full operator slots (like a small hand of cards) instead of a single
 * "active card, click to cycle" solitaire slot — playing one immediately refills it from the
 * deck (see GameState.refillOperatorHand), so the player always sees every option at once.
 */
export default function OperatorHand({ operators, selectedId, onSelect, deckRemaining }: OperatorHandProps) {
  return (
    <div className="flex flex-col gap-1 select-none">
      <h2 className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider text-center">
        Operatörler
      </h2>

      <div className="flex items-center gap-2 justify-center">
        {operators.map((op) => (
          <div key={op.id} className="transform transition hover:scale-105 shrink-0">
            <OperatorTile symbol={op.symbol} selected={selectedId === op.id} onClick={() => onSelect(op.id)} />
          </div>
        ))}

        {/* Draw pile indicator only — fixed order, never reshuffles mid-round, no manual draw needed. */}
        <div
          title="Operatör destesinde kalan kart sayısı"
          className="w-14 h-24 rounded-lg flex flex-col items-center justify-between p-1.5 bg-linear-to-br from-amber-700 to-amber-900 border-2 border-amber-600/70 shadow-[0_3px_5px_rgba(0,0,0,0.55)] shrink-0"
        >
          <div className="text-[9px] font-bold text-amber-200/50 uppercase leading-none mt-0.5">Deste</div>
          <span className="text-xl leading-none my-auto">🎴</span>
          <div className="text-[11px] font-mono text-amber-300 font-bold leading-none mb-0.5">{deckRemaining}</div>
        </div>
      </div>
    </div>
  );
}
