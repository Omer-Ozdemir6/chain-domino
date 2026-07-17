export type TileModifier = 'NORMAL' | 'OBSIDIAN' | 'AMBER' | 'IVORY';

export interface DominoStone {
  id: string;
  leftVal: number;
  rightVal: number;
  isGolden?: boolean;
  modifier?: TileModifier;
  tags?: string[];
  /** How many pips the "Geliştirme Parşömeni" (consumable_upgrade) permanently added to this
   *  side's face value (capped at 6) — purely a glow/tracking marker; the boost itself already
   *  lives in leftVal/rightVal, so scoring needs no separate math for it. */
  leftUpgrade?: number;
  rightUpgrade?: number;
}

export type DominoTile = DominoStone;

export type HandType = 'STRAIGHT' | 'BRANCHED' | 'LOOP';
