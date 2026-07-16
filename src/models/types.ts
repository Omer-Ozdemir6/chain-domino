export type OperatorType = 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE';

export type TileModifier = 'NORMAL' | 'OBSIDIAN' | 'AMBER' | 'MERCURY' | 'IVORY';

export interface DominoStone {
  id: string;
  leftVal: number;
  rightVal: number;
  isGolden?: boolean;
  modifier?: TileModifier;
  tags?: string[];
}

export type DominoTile = DominoStone;

export interface OperatorCard {
  id: string;
  type: OperatorType;
  symbol: string;
}

export type ChainElement =
  | { type: 'STONE'; data: DominoStone }
  | { type: 'OPERATOR'; data: OperatorCard };
