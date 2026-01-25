import React, { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import Chessboard from './Chessboard';
import { BettingPanel } from './BettingPanel';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { useWebSocket } from '../hooks/useWebSocket';
import { useChessGame } from '../hooks/useChessGame';
import { usePieceCustomization } from '../hooks/usePieceCustomization';
import { PieceInstance } from '../types';
import './TelegramGame.css';

interface TelegramGameProps {
  gameId: string;
}

export const TelegramGame: React.FC<TelegramGameProps> = ({ gameId }) => {
  const { webApp, user, isReady } = useTelegramWebApp();
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  
  const userId = user ? BigInt(user.id) : null;
  const { gameState, connected, makeMove, on: wsOn } = useWebSocket(gameId, userId);
  
  const customization = usePieceCustomization();
  
  // Initialize chess game from FEN
  const chessGame = useChessGame({
    setImagePromptTemplate: customization.setImagePromptTemplate,
    setPieceImageUrls: customization.setPieceImageUrls,
  });

  // Update local game state when WebSocket receives updates
  useEffect(() => {
    if (gameState && gameState.fen) {
      const chess = new Chess(gameState.fen);
      // Update piece instances based on current board state
      // This is a simplified version - in production, you'd want to sync piece instances properly
    }
  }, [gameState]);

  // Handle move events
  useEffect(() => {
    if (!wsOn) return;

    const unsubscribeMoveMade = wsOn('move_made', (data) => {
      if (webApp?.HapticFeedback) {
        webApp.HapticFeedback.impactOccurred('light');
      }
    });

    const unsubscribeMoveError = wsOn('move_error', (error) => {
      if (webApp) {
        webApp.showAlert(error.error);
      }
    });

    return () => {
      unsubscribeMoveMade();
      unsubscribeMoveError();
    };
  }, [wsOn, webApp]);

  const handleSquareClick = (square: string) => {
    if (!gameState || !userId) return;

    const chess = new Chess(gameState.fen);
    const isMyTurn = (gameState.currentTurn === 'w' && gameState.player1Id === userId) ||
                     (gameState.currentTurn === 'b' && gameState.player2Id === userId);

    if (!isMyTurn) {
      if (webApp) {
        webApp.showAlert('Не ваш ход!');
      }
      return;
    }

    if (!selectedSquare) {
      // First click - select piece
      const piece = chess.get(square as any);
      if (piece && ((piece.color === 'w' && gameState.player1Id === userId) ||
                    (piece.color === 'b' && gameState.player2Id === userId))) {
        setSelectedSquare(square);
        const moves = chess.moves({ square: square as any, verbose: true });
        setValidMoves(moves.map(m => m.to));
      }
    } else {
      // Second click - make move
      if (square === selectedSquare) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }

      const chess = new Chess(gameState.fen);
      const move = chess.move({
        from: selectedSquare as any,
        to: square as any,
      });

      if (move) {
        makeMove({
          from: selectedSquare,
          to: square,
          promotion: move.promotion as any,
        });
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        if (webApp) {
          webApp.showAlert('Недопустимый ход!');
        }
      }
    }
  };

  if (!isReady) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!gameState) {
    return <div className="loading">Ожидание данных игры...</div>;
  }

  const isMyTurn = (gameState.currentTurn === 'w' && gameState.player1Id === userId) ||
                   (gameState.currentTurn === 'b' && gameState.player2Id === userId);

  const chess = new Chess(gameState.fen);
  const pieceInstances: Record<string, PieceInstance | null> = {};
  
  // Build piece instances from chess board
  chess.board().forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (piece) {
        const square = String.fromCharCode(97 + colIndex) + (8 - rowIndex);
        const id = `${piece.color}_${piece.type}_${square}`;
        pieceInstances[square] = {
          id,
          name: piece.type.toUpperCase(),
          type: piece.type as any,
          color: piece.color as 'w' | 'b',
          square: square as any,
          personality: {
            names: [piece.type.toUpperCase()],
            description: '',
            voice: 'Kore',
            voicePrompt: '',
          },
        };
      }
    });
  });

  return (
    <div className="telegram-game">
      {!connected && (
        <div className="connection-status">Подключение...</div>
      )}
      
      <BettingPanel
        betAmount={gameState.betAmount}
        betCurrency={gameState.betCurrency}
        isMyTurn={isMyTurn}
      />

      <div className="game-info">
        {gameState.isGameOver && gameState.winnerId && (
          <div className="game-result">
            {gameState.winnerId === userId ? '🎉 Вы выиграли!' : '😔 Вы проиграли'}
          </div>
        )}
        {gameState.isGameOver && !gameState.winnerId && (
          <div className="game-result">🤝 Ничья</div>
        )}
        {!gameState.isGameOver && (
          <div className="turn-indicator">
            {isMyTurn ? '✅ Ваш ход' : '⏳ Ход соперника'}
          </div>
        )}
      </div>

      <Chessboard
        game={chess}
        pieceInstances={pieceInstances}
        selectedSquare={selectedSquare as any}
        onSquareClick={handleSquareClick}
        onSquareHover={() => {}}
        chattingWith={null}
        isRecording={false}
        talkingVolume={0}
        userVolume={0}
        orbPosition={null}
      />
    </div>
  );
};

