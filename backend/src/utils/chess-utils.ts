import { Chess } from 'chess.js';

/**
 * Generate a human-readable board description
 */
export function generateBoardDescription(chess: Chess, currentTurn: 'w' | 'b'): string {
  const board = chess.board();
  const turn = currentTurn === 'w' ? 'White' : 'Black';
  const isCheck = chess.inCheck();
  const isCheckmate = chess.isCheckmate();
  const isDraw = chess.isDraw();
  const isStalemate = chess.isStalemate();

  let description = `Current position (FEN): ${chess.fen()}\n\n`;
  description += `It is ${turn}'s turn.\n\n`;

  if (isCheckmate) {
    description += `⚠️ ${turn} is in CHECKMATE!\n\n`;
  } else if (isCheck) {
    description += `⚠️ ${turn} is in CHECK!\n\n`;
  } else if (isStalemate) {
    description += `🤝 STALEMATE - The game is a draw.\n\n`;
  } else if (isDraw) {
    description += `🤝 The game is a DRAW.\n\n`;
  }

  // Count pieces
  const whitePieces: Record<string, number> = {};
  const blackPieces: Record<string, number> = {};

  board.forEach((row) => {
    row.forEach((piece) => {
      if (piece) {
        const pieceName = getPieceName(piece.type);
        if (piece.color === 'w') {
          whitePieces[pieceName] = (whitePieces[pieceName] || 0) + 1;
        } else {
          blackPieces[pieceName] = (blackPieces[pieceName] || 0) + 1;
        }
      }
    });
  });

  description += `White pieces: ${formatPieceCount(whitePieces)}\n`;
  description += `Black pieces: ${formatPieceCount(blackPieces)}\n`;

  // Legal moves count
  const legalMoves = chess.moves().length;
  description += `\nLegal moves available: ${legalMoves}\n`;

  return description;
}

function getPieceName(type: string): string {
  const names: Record<string, string> = {
    p: 'Pawns',
    n: 'Knights',
    b: 'Bishops',
    r: 'Rooks',
    q: 'Queens',
    k: 'Kings',
  };
  return names[type] || type;
}

function formatPieceCount(pieces: Record<string, number>): string {
  return Object.entries(pieces)
    .map(([name, count]) => `${count} ${name}`)
    .join(', ') || 'None';
}

