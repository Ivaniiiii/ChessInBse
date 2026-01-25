import { GoogleGenAI, LiveConnectConfig } from '@google/genai';
import { prisma } from '../db/client.js';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set');
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface PiecePersonality {
  name: string;
  description: string;
  voice: string;
  voicePrompt: string;
}

interface ConversationMessage {
  role: 'user' | 'model';
  text: string;
}

class VoiceAIService {
  /**
   * Get or initialize piece personality
   */
  async getPiecePersonality(gameId: string, pieceId: string): Promise<PiecePersonality | null> {
    const session = await prisma.gameSession.findUnique({
      where: {
        gameId_pieceId: {
          gameId,
          pieceId,
        },
      },
    });

    if (session && session.conversationHistory) {
      const history = session.conversationHistory as any;
      // Extract personality from stored data if available
      return null; // Placeholder - would need to store personality data
    }

    // Default personalities (can be loaded from config)
    return this.getDefaultPersonality(pieceId);
  }

  /**
   * Save conversation history
   */
  async saveConversation(
    gameId: string,
    pieceId: string,
    messages: ConversationMessage[]
  ): Promise<void> {
    await prisma.gameSession.upsert({
      where: {
        gameId_pieceId: {
          gameId,
          pieceId,
        },
      },
      create: {
        gameId,
        pieceId,
        conversationHistory: messages as any,
      },
      update: {
        conversationHistory: messages as any,
      },
    });
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(gameId: string, pieceId: string): Promise<ConversationMessage[]> {
    const session = await prisma.gameSession.findUnique({
      where: {
        gameId_pieceId: {
          gameId,
          pieceId,
        },
      },
    });

    if (session && session.conversationHistory) {
      return session.conversationHistory as ConversationMessage[];
    }

    return [];
  }

  /**
   * Create Live API connection config for a piece
   */
  async createLiveConfig(
    gameId: string,
    pieceId: string,
    gameFen: string,
    boardDescription: string
  ): Promise<LiveConnectConfig> {
    const personality = await this.getPiecePersonality(gameId, pieceId);
    const history = await this.getConversationHistory(gameId, pieceId);

    const systemInstruction = this.buildSystemInstruction(personality, gameFen, boardDescription);

    return {
      systemInstruction,
      generationConfig: {
        responseModalities: ['audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: personality?.voice || 'Kore',
            },
          },
        },
      },
    };
  }

  private buildSystemInstruction(
    personality: PiecePersonality | null,
    fen: string,
    boardDescription: string
  ): string {
    const baseInstruction = `You are a chess piece in an ongoing game. 
Current board state (FEN): ${fen}

${boardDescription}

You can discuss strategy, make suggestions, or just chat about the game. 
Keep responses brief and chess-focused.`;

    if (personality) {
      return `${personality.voicePrompt || ''}

${personality.description || ''}

${baseInstruction}

Your name is ${personality.name}.`;
    }

    return baseInstruction;
  }

  private getDefaultPersonality(pieceId: string): PiecePersonality | null {
    // Map piece IDs to default personalities
    const pieceType = pieceId.split('_')[1]; // Extract piece type from ID
    
    const personalities: Record<string, PiecePersonality> = {
      p: {
        name: 'Pawn',
        description: 'I am a humble pawn, but I dream of promotion and victory.',
        voice: 'Kore',
        voicePrompt: 'Speak with determination and hope.',
      },
      n: {
        name: 'Knight',
        description: 'I move in mysterious ways, always ready for an unexpected attack.',
        voice: 'Fenrir',
        voicePrompt: 'Speak with energy and unpredictability.',
      },
      b: {
        name: 'Bishop',
        description: 'I see the board from a unique angle, planning long-term strategies.',
        voice: 'Charon',
        voicePrompt: 'Speak with wisdom and foresight.',
      },
      r: {
        name: 'Rook',
        description: 'I am a tower of strength, controlling files and ranks with authority.',
        voice: 'Orus',
        voicePrompt: 'Speak with power and confidence.',
      },
      q: {
        name: 'Queen',
        description: 'I am the most powerful piece, commanding respect and fear.',
        voice: 'Kore',
        voicePrompt: 'Speak with regal authority.',
      },
      k: {
        name: 'King',
        description: 'I must be protected, but I am the ultimate goal of this game.',
        voice: 'Orus',
        voicePrompt: 'Speak with royal dignity.',
      },
    };

    return personalities[pieceType] || null;
  }
}

export const voiceAIService = new VoiceAIService();

