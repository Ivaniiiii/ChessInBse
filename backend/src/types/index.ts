import { CurrencyType, GameStatus, TransactionType, TransactionStatus } from '@prisma/client';

// Re-export as values, not just types
export { CurrencyType, GameStatus, TransactionType, TransactionStatus };

export interface GameState {
  id: string;
  player1Id: bigint;
  player2Id: bigint | null;
  status: GameStatus;
  betAmount: number;
  betCurrency: CurrencyType;
  fen: string;
  winnerId: bigint | null;
  currentTurn: 'w' | 'b';
  isGameOver: boolean;
  moveHistory: string[];
}

export interface MoveData {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface BettingInfo {
  amount: number;
  currency: CurrencyType;
}

export interface UserBalance {
  internalTokens: number;
  telegramStars: number;
  cryptoUsdt: number;
  cryptoTon: number;
  cryptoEth: number;
  fiatRub: number;
}

export interface EthGameState extends GameState {
  contractGameId: string | null;
  player1Wallet: string | null;
  player2Wallet: string | null;
  winnerWallet: string | null;
  createTxHash: string | null;
  joinTxHash: string | null;
  finishTxHash: string | null;
}

export interface CreateGameRequest {
  betAmount: number;
  betCurrency: CurrencyType;
}

export interface JoinGameRequest {
  gameId: string;
}

export interface MakeMoveRequest {
  gameId: string;
  move: MoveData;
}

