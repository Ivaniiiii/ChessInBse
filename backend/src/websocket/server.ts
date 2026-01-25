import { Server as SocketIOServer } from 'socket.io';
import { gameService } from '../services/game-service.js';
import { GameState } from '../types/index.js';
import { setupVoiceHandlers } from './voice-handler.js';

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
      
      // Send current game state
      const game = await gameService.getGameById(gameId);
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
        
        // Broadcast to all players in the game room
        const room = `game:${gameId}`;
        io.to(room).emit('move_made', result);
        io.to(room).emit('game_state', result.game);
        
        socket.emit('move_success', result);
      } catch (error: any) {
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

