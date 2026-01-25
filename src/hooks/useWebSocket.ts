import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, MoveData } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export interface WebSocketEvents {
  game_state: (game: GameState) => void;
  move_made: (data: { game: GameState; move: string; isGameOver: boolean }) => void;
  move_success: (data: any) => void;
  move_error: (error: { error: string }) => void;
  moves_history: (moves: any[]) => void;
  error: (error: { error: string }) => void;
}

export function useWebSocket(gameId: string | null, userId: bigint | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const eventHandlers = useRef<Map<string, Set<Function>>>(new Map());

  useEffect(() => {
    if (!gameId || !userId) return;

    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      
      // Join game room
      newSocket.emit('join_game', { gameId, userId: userId.toString() });
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('game_state', (game: GameState) => {
      setGameState(game);
      emitEvent('game_state', game);
    });

    newSocket.on('move_made', (data) => {
      setGameState(data.game);
      emitEvent('move_made', data);
    });

    newSocket.on('move_error', (error) => {
      emitEvent('move_error', error);
    });

    newSocket.on('moves_history', (moves) => {
      emitEvent('moves_history', moves);
    });

    setSocket(newSocket);

    return () => {
      if (gameId) {
        newSocket.emit('leave_game', { gameId });
      }
      newSocket.close();
    };
  }, [gameId, userId]);

  const makeMove = (move: MoveData) => {
    if (!socket || !gameId || !userId) return;
    socket.emit('make_move', { gameId, userId: userId.toString(), move });
  };

  const getMovesHistory = () => {
    if (!socket || !gameId) return;
    socket.emit('get_moves', { gameId });
  };

  const on = <K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)!.add(handler);

    return () => {
      eventHandlers.current.get(event)?.delete(handler);
    };
  };

  const emitEvent = (event: string, data: any) => {
    eventHandlers.current.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  };

  return {
    socket,
    connected,
    gameState,
    makeMove,
    getMovesHistory,
    on,
  };
}

