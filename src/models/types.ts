export type TileModifier = 'NORMAL' | 'OBSIDIAN' | 'AMBER' | 'IVORY';

export interface DominoStone {
  id: string;
  leftVal: number;
  rightVal: number;
  isGolden?: boolean;
  modifier?: TileModifier;
  tags?: string[];
}

export type DominoTile = DominoStone;

export type HandType = 'STRAIGHT' | 'BRANCHED' | 'LOOP';
