import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { formatEther } from 'viem';
import Chessboard from './Chessboard';
import { useGame, useCancelGame } from '../hooks/useChessContract';
import { useWebSocket } from '../hooks/useWebSocket';
import { GameState, ContractGame } from '../contracts/ChessEscrowABI';
import { PieceInstance } from '../types';
import './BaseGame.css';

interface BaseGameProps {
  contractGameId: `0x${string}`;
  backendGameId: string;
  userAddress: `0x${string}` | undefined;
  onBack: () => void;
}

export const BaseGame: React.FC<BaseGameProps> = ({
  contractGameId,
  backendGameId,
  userAddress,
  onBack,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [chess, setChess] = useState(() => new Chess());
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [winner, setWinner] = useState<string | null>(null);
  
  const { game: contractGame, refetch: refetchGame } = useGame(contractGameId);
  const { cancelGame, isPending: isCanceling } = useCancelGame();
  
  // WebSocket connection for real-time moves
  const userId = userAddress ? BigInt(parseInt(userAddress.slice(2, 10), 16)) : null;
  // #region agent log
  React.useEffect(() => {
    if (userAddress && userId !== null) {
      fetch('http://127.0.0.1:7250/ingest/60b382e0-c378-4f86-9118-f08f54dd81e2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'BaseGame.tsx', message: 'userId derived', data: { hypothesisId: 'C', userAddress, userId: userId.toString(), backendGameId, timestamp: Date.now(), sessionId: 'debug-session' } }) }).catch(() => {});
    }
  }, [userAddress, userId, backendGameId]);
  // #endregion
  const { gameState, connected, makeMove, on: wsOn } = useWebSocket(backendGameId, userId);

  // Sync with contract state
  useEffect(() => {
    if (contractGame) {
      if (contractGame.state === GameState.WaitingForPlayer) {
        setGameStatus('waiting');
      } else if (contractGame.state === GameState.InProgress) {
        setGameStatus('playing');
      } else if (contractGame.state === GameState.Finished) {
        setGameStatus('finished');
        if (contractGame.winner !== '0x0000000000000000000000000000000000000000') {
          setWinner(contractGame.winner);
        }
      }
    }
  }, [contractGame]);

  // Sync chess state from WebSocket
  useEffect(() => {
    if (gameState?.fen) {
      const newChess = new Chess(gameState.fen);
      setChess(newChess);
    }
  }, [gameState?.fen]);

  // Handle WebSocket events
  useEffect(() => {
    if (!wsOn) return;

    const unsubscribeMove = wsOn('move_made', (data: any) => {
      // Update local chess state
      if (data.game?.fen) {
        const newChess = new Chess(data.game.fen);
        setChess(newChess);
      }
      
      // Check for game over
      if (data.isGameOver) {
        setGameStatus('finished');
        if (data.winnerId) {
          setWinner(data.winnerId);
        }
        refetchGame(); // Refresh contract state
      }
    });

    const unsubscribeError = wsOn('move_error', (error: any) => {
      alert(error.error || 'Invalid move');
    });

    return () => {
      unsubscribeMove();
      unsubscribeError();
    };
  }, [wsOn, refetchGame]);

  // Determine player color and turn
  const isPlayer1 = userAddress && contractGame?.player1.toLowerCase() === userAddress.toLowerCase();
  const isPlayer2 = userAddress && contractGame?.player2.toLowerCase() === userAddress.toLowerCase();
  const myColor = isPlayer1 ? 'w' : isPlayer2 ? 'b' : null;
  const isMyTurn = myColor === chess.turn();

  const handleSquareClick = (square: string) => {
    if (gameStatus !== 'playing' || !isMyTurn || !myColor) return;

    if (!selectedSquare) {
      // First click - select piece
      const piece = chess.get(square as any);
      if (piece && piece.color === myColor) {
        setSelectedSquare(square);
        const moves = chess.moves({ square: square as any, verbose: true });
        setValidMoves(moves.map(m => m.to));
      }
    } else {
      // Second click - make move or deselect
      if (square === selectedSquare) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }

      // Try to make move locally first
      const tempChess = new Chess(chess.fen());
      const move = tempChess.move({
        from: selectedSquare as any,
        to: square as any,
        promotion: 'q', // Auto-promote to queen for simplicity
      });

      if (move) {
        // Send move to backend
        makeMove({
          from: selectedSquare,
          to: square,
          promotion: move.promotion as any,
        });
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        // Try selecting a new piece instead
        const piece = chess.get(square as any);
        if (piece && piece.color === myColor) {
          setSelectedSquare(square);
          const moves = chess.moves({ square: square as any, verbose: true });
          setValidMoves(moves.map(m => m.to));
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    }
  };

  const handleCancel = () => {
    if (contractGameId && gameStatus === 'waiting') {
      cancelGame(contractGameId);
    }
  };

  // Build piece instances for the board
  const pieceInstances: Record<string, PieceInstance | null> = {};
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

  const betAmount = contractGame ? formatEther(contractGame.betAmount) : '0';
  const potAmount = contractGame ? formatEther(contractGame.betAmount * BigInt(2)) : '0';

  return (
    <div className="base-game">
      {/* Game Info Header */}
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        
        <div className="game-pot">
          <span className="pot-label">Pot</span>
          <span className="pot-amount">{potAmount} ETH</span>
        </div>
      </div>

      {/* Connection Status */}
      {!connected && (
        <div className="connection-status">Connecting to game server...</div>
      )}

      {/* Game Status */}
      <div className="game-status">
        {gameStatus === 'waiting' && (
          <div className="waiting-status">
            <p>Waiting for opponent...</p>
            <p className="bet-info">Bet: {betAmount} ETH</p>
            {isPlayer1 && (
              <button 
                className="cancel-btn" 
                onClick={handleCancel}
                disabled={isCanceling}
              >
                {isCanceling ? 'Canceling...' : 'Cancel Game'}
              </button>
            )}
          </div>
        )}

        {gameStatus === 'playing' && (
          <div className="turn-indicator">
            {isMyTurn ? (
              <span className="your-turn">Your Turn ({myColor === 'w' ? 'White' : 'Black'})</span>
            ) : (
              <span className="opponent-turn">Opponent's Turn</span>
            )}
          </div>
        )}

        {gameStatus === 'finished' && (
          <div className="game-result">
            {winner ? (
              winner.toLowerCase() === userAddress?.toLowerCase() ? (
                <span className="winner">You Won! 🎉</span>
              ) : (
                <span className="loser">You Lost</span>
              )
            ) : (
              <span className="draw">Draw</span>
            )}
            <p className="pot-result">
              {winner?.toLowerCase() === userAddress?.toLowerCase() 
                ? `Won ${potAmount} ETH (minus fees)`
                : `Bet returned: ${betAmount} ETH`}
            </p>
          </div>
        )}
      </div>

      {/* Chess Board */}
      <div className="board-container">
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

      {/* Players Info */}
      <div className="players-info">
        <div className={`player ${isPlayer1 ? 'me' : ''}`}>
          <span className="color-dot white"></span>
          <span className="address">
            {contractGame?.player1.slice(0, 6)}...{contractGame?.player1.slice(-4)}
          </span>
          {isPlayer1 && <span className="you-badge">You</span>}
        </div>
        
        <span className="vs">VS</span>
        
        <div className={`player ${isPlayer2 ? 'me' : ''}`}>
          <span className="color-dot black"></span>
          {contractGame?.player2 && contractGame.player2 !== '0x0000000000000000000000000000000000000000' ? (
            <>
              <span className="address">
                {contractGame.player2.slice(0, 6)}...{contractGame.player2.slice(-4)}
              </span>
              {isPlayer2 && <span className="you-badge">You</span>}
            </>
          ) : (
            <span className="waiting">Waiting...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BaseGame;
