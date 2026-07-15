import type { DominoStone } from '../../models/types.js';
import Tile from './Tile.js';

interface StoneHandProps {
  stones: DominoStone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function StoneHand({ stones, selectedId, onSelect }: StoneHandProps) {
  return (
    <div>
      <h2 className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Taşlar</h2>
      <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1 scrollbar-none">
        {stones.length === 0 && <span className="text-[10px] text-slate-450 italic">(yok)</span>}
        {stones.map((s, index) => (
          <div
            key={s.id}
            className="animate-card-deal shrink-0"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <Tile
              left={s.leftVal}
              right={s.rightVal}
              selected={selectedId === s.id}
              onClick={() => onSelect(s.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
