import { Server as SocketIOServer } from 'socket.io';
import { voiceAIService } from '../services/voice-ai-service.js';
import { gameService } from '../services/game-service.js';

/**
 * Handle voice/AI interactions for chess pieces
 */
export function setupVoiceHandlers(io: SocketIOServer) {
  io.on('connection', (socket) => {
    // Join voice session for a piece
    socket.on('join_voice_session', async (data: {
      gameId: string;
      pieceId: string;
      userId: bigint;
    }) => {
      const { gameId, pieceId, userId } = data;
      const room = `voice:${gameId}:${pieceId}`;
      socket.join(room);

      try {
        const game = await gameService.getGameById(gameId);
        if (!game) {
          socket.emit('voice_error', { error: 'Game not found' });
          return;
        }

        // Get board description
        const { Chess } = await import('chess.js');
        const gameInstance = new Chess(game.fen);
        const boardDescription = generateBoardDescription(gameInstance, game.currentTurn as 'w' | 'b');

        // Create Live API config
        const config = await voiceAIService.createLiveConfig(
          gameId,
          pieceId,
          game.fen,
          boardDescription
        );

        socket.emit('voice_session_ready', { config });
      } catch (error: any) {
        socket.emit('voice_error', { error: error.message });
      }
    });

    // Send audio input to AI
    socket.on('voice_input', async (data: {
      gameId: string;
      pieceId: string;
      audioData: string; // Base64 encoded audio
    }) => {
      // TODO: Process audio through Gemini Live API
      // For now, emit placeholder response
      socket.emit('voice_output', {
        audioData: '', // Would contain AI response audio
        text: 'Voice feature coming soon',
      });
    });

    // Leave voice session
    socket.on('leave_voice_session', (data: { gameId: string; pieceId: string }) => {
      const room = `voice:${data.gameId}:${data.pieceId}`;
      socket.leave(room);
    });
  });
}

function generateBoardDescription(chess: any, currentTurn: 'w' | 'b'): string {
  // Generate a text description of the board state
  const fen = chess.fen();
  const turn = currentTurn === 'w' ? 'White' : 'Black';
  const isCheck = chess.inCheck();
  const isCheckmate = chess.isCheckmate();
  const isDraw = chess.isDraw();

  let description = `Current position: ${fen}\n`;
  description += `It is ${turn}'s turn.\n`;
  
  if (isCheckmate) {
    description += `${turn} is in checkmate.\n`;
  } else if (isCheck) {
    description += `${turn} is in check.\n`;
  } else if (isDraw) {
    description += `The game is a draw.\n`;
  }

  return description;
}

