import { Server as SocketIOServer } from 'socket.io';
import { gameService } from '../services/game-service.js';
import { GameState } from '../types/index.js';
import { setupVoiceHandlers } from './voice-handler.js';

// #region agent log
const DEBUG_LOG = (msg: string, data: Record<string, unknown>) => {
  fetch('http://127.0.0.1:7250/ingest/60b382e0-c378-4f86-9118-f08f54dd81e2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'websocket/server.ts', message: msg, data: { ...data, timestamp: Date.now(), sessionId: 'debug-session' } }) }).catch(() => {});
};
// #endregion

export function setupWebSocket(io: SocketIOServer) {
  // Setup voice/AI handlers
  setupVoiceHandlers(io);
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join game room
    socket.on('join_game', async (data: { gameId: string; userId: bigint }) => {
      const { gameId, userId } = data;
      const room = `game:${gameId}`;
      socket.join(room);
      const game = await gameService.getGameById(gameId);
      DEBUG_LOG('join_game', { hypothesisId: 'D', gameId, userId: String(userId), gameFound: !!game });
      if (game) {
        socket.emit('game_state', game);
      }
    });

    // Leave game room
    socket.on('leave_game', (data: { gameId: string }) => {
      const room = `game:${data.gameId}`;
      socket.leave(room);
    });

    // Make move
    socket.on('make_move', async (data: { gameId: string; userId: bigint; move: any }) => {
      try {
        const { gameId, userId, move } = data;
        const result = await gameService.makeMove(gameId, BigInt(userId), move);
        DEBUG_LOG('make_move success', { hypothesisId: 'C', gameId, userId: String(userId) });
        const room = `game:${gameId}`;
        io.to(room).emit('move_made', result);
        io.to(room).emit('game_state', result.game);
        socket.emit('move_success', result);
      } catch (error: any) {
        DEBUG_LOG('make_move error', { hypothesisId: 'C', gameId: data.gameId, userId: String(data.userId), error: error.message });
        socket.emit('move_error', { error: error.message });
      }
    });

    // Get game moves history
    socket.on('get_moves', async (data: { gameId: string }) => {
      try {
        const moves = await gameService.getGameMoves(data.gameId);
        socket.emit('moves_history', moves);
      } catch (error: any) {
        socket.emit('error', { error: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log('WebSocket server initialized');
}

