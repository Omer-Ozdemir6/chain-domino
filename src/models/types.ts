export type OperatorType = 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE';

export interface DominoStone {
  id: string;
  leftVal: number;
  rightVal: number;
}

export interface OperatorCard {
  id: string;
  type: OperatorType;
  symbol: string;
}

export type ChainElement =
  | { type: 'STONE'; data: DominoStone }
  | { type: 'OPERATOR'; data: OperatorCard };
