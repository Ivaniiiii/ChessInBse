import { Chess } from 'chess.js';
import { prisma } from '../db/client.js';
import { GameStatus, CurrencyType } from '../types/index.js';
import { MoveData, GameState } from '../types/index.js';
import { bettingService } from './betting-service.js';
import { paymentService } from './payment-service.js';
import { oracleService } from './oracle-service.js';
import { ethereumService } from './ethereum-service.js';

class GameService {
  /**
   * Create an ETH game (registered after on-chain transaction)
   */
  async createEthGame(data: {
    contractGameId: string;
    player1Wallet: string;
    betAmount: string;
    createTxHash: string;
    farcasterFid?: number;
  }) {
    const { contractGameId, player1Wallet, betAmount, createTxHash, farcasterFid } = data;

    // Find or create user by wallet address
    let user = await prisma.user.findFirst({
      where: { walletAddress: player1Wallet.toLowerCase() },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: BigInt(Date.now()), // Placeholder for non-Telegram users
          walletAddress: player1Wallet.toLowerCase(),
          farcasterFid: farcasterFid,
        },
      });
    }

    // Create game
    const game = await prisma.game.create({
      data: {
        player1Id: user.telegramId,
        betAmount: parseFloat(betAmount),
        betCurrency: CurrencyType.CRYPTO_ETH,
        status: GameStatus.WAITING_PLAYER,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        contractGameId,
        createTxHash,
        player1Wallet: player1Wallet.toLowerCase(),
      },
      include: {
        player1: {
          select: { telegramId: true, username: true, firstName: true, walletAddress: true },
        },
      },
    });

    return this.formatGameState(game);
  }

  /**
   * Join an ETH game (registered after on-chain transaction)
   */
  async joinEthGame(data: {
    gameId: string;
    player2Wallet: string;
    joinTxHash: string;
    farcasterFid?: number;
  }) {
    const { gameId, player2Wallet, joinTxHash, farcasterFid } = data;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== GameStatus.WAITING_PLAYER) {
      throw new Error('Game is not available for joining');
    }

    // Find or create user by wallet address
    let user = await prisma.user.findFirst({
      where: { walletAddress: player2Wallet.toLowerCase() },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: BigInt(Date.now()),
          walletAddress: player2Wallet.toLowerCase(),
          farcasterFid: farcasterFid,
        },
      });
    }

    // Update game
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        player2Id: user.telegramId,
        status: GameStatus.IN_PROGRESS,
        joinTxHash,
        player2Wallet: player2Wallet.toLowerCase(),
      },
      include: {
        player1: {
          select: { telegramId: true, username: true, firstName: true, walletAddress: true },
        },
        player2: {
          select: { telegramId: true, username: true, firstName: true, walletAddress: true },
        },
      },
    });

    return this.formatGameState(updatedGame);
  }

  /**
   * Get game by contract game ID
   */
  async getGameByContractId(contractGameId: string) {
    const game = await prisma.game.findUnique({
      where: { contractGameId },
      include: {
        player1: {
          select: { telegramId: true, username: true, firstName: true, walletAddress: true },
        },
        player2: {
          select: { telegramId: true, username: true, firstName: true, walletAddress: true },
        },
      },
    });

    if (!game) return null;

    return this.formatGameState(game);
  }

  /**
   * Handle ETH game completion - calls oracle to declare winner
   */
  private async handleEthGameCompletion(
    gameId: string,
    winnerId: bigint | null,
    contractGameId: string,
    player1Wallet: string,
    player2Wallet: string
  ) {
    // Determine winner wallet
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { player1: true, player2: true },
    });

    if (!game) return;

    let winnerWallet: `0x${string}` | null = null;
    
    if (winnerId) {
      if (winnerId === game.player1Id) {
        winnerWallet = player1Wallet as `0x${string}`;
      } else if (winnerId === game.player2Id) {
        winnerWallet = player2Wallet as `0x${string}`;
      }
    }

    // Call oracle to declare winner on-chain
    const result = await oracleService.declareWinner(
      gameId,
      contractGameId as `0x${string}`,
      winnerWallet
    );

    if (!result.success) {
      console.error(`Failed to declare winner for game ${gameId}: ${result.error}`);
      // Queue for retry
      if (winnerWallet) {
        oracleService.queueDeclaration(
          gameId,
          contractGameId as `0x${string}`,
          winnerWallet
        );
      }
    }
  }

  async createGame(data: { playerId: bigint; betAmount: number; betCurrency: CurrencyType }) {
    const { playerId, betAmount, betCurrency } = data;

    // Check balance
    const hasBalance = await bettingService.checkBalance(playerId, betAmount, betCurrency);
    if (!hasBalance) {
      throw new Error('Insufficient balance');
    }

    // Lock bet
    await bettingService.lockBet(playerId, betAmount, betCurrency);

    // Create game
    const game = await prisma.game.create({
      data: {
        player1Id: playerId,
        betAmount,
        betCurrency,
        status: GameStatus.WAITING_PLAYER,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      },
      include: {
        player1: {
          select: { telegramId: true, username: true, firstName: true },
        },
      },
    });

    return this.formatGameState(game);
  }

  async joinGame(gameId: string, playerId: bigint) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        player1: true,
        player2: true,
      },
    });

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== GameStatus.WAITING_PLAYER) {
      throw new Error('Game is not available for joining');
    }

    if (game.player1Id === playerId) {
      throw new Error('Cannot join your own game');
    }

    // Check balance
    const hasBalance = await bettingService.checkBalance(playerId, Number(game.betAmount), game.betCurrency);
    if (!hasBalance) {
      throw new Error('Insufficient balance');
    }

    // Lock bet
    await bettingService.lockBet(playerId, Number(game.betAmount), game.betCurrency);

    // Update game
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        player2Id: playerId,
        status: GameStatus.IN_PROGRESS,
      },
      include: {
        player1: {
          select: { telegramId: true, username: true, firstName: true },
        },
        player2: {
          select: { telegramId: true, username: true, firstName: true },
        },
      },
    });

    return this.formatGameState(updatedGame);
  }

  async getGameById(gameId: string) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        player1: {
          select: { telegramId: true, username: true, firstName: true },
        },
        player2: {
          select: { telegramId: true, username: true, firstName: true },
        },
      },
    });

    if (!game) return null;

    return this.formatGameState(game);
  }

  async makeMove(gameId: string, playerId: bigint, move: MoveData) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        moves: {
          orderBy: { moveNumber: 'asc' },
        },
      },
    });

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new Error('Game is not in progress');
    }

    // Determine which player's turn it is
    const chess = new Chess(game.fen);
    const isWhiteTurn = chess.turn() === 'w';
    const expectedPlayerId = isWhiteTurn ? game.player1Id : game.player2Id;

    if (expectedPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    // Validate and make move
    try {
      const moveResult = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });

      if (!moveResult) {
        throw new Error('Invalid move');
      }

      // Save move to database
      const moveNumber = game.moves.length + 1;
      await prisma.move.create({
        data: {
          gameId,
          moveNumber,
          moveSan: moveResult.san,
          moveFrom: move.from,
          moveTo: move.to,
          playerId,
        },
      });

      // Update game state
      const isGameOver = chess.isGameOver();
      const winnerId = isGameOver ? this.determineWinner(chess, game.player1Id, game.player2Id!) : null;

      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          fen: chess.fen(),
          status: isGameOver ? GameStatus.FINISHED : GameStatus.IN_PROGRESS,
          winnerId,
          finishedAt: isGameOver ? new Date() : undefined,
        },
      });

      // Handle game completion
      if (isGameOver) {
        if (game.betCurrency === CurrencyType.CRYPTO_ETH && game.contractGameId) {
          // ETH game - call oracle to declare winner on-chain
          await this.handleEthGameCompletion(
            gameId,
            winnerId,
            game.contractGameId,
            game.player1Wallet!,
            game.player2Wallet!
          );
        } else if (winnerId) {
          // Non-ETH game - handle through betting service
          await this.handleGameCompletion(gameId, game.player1Id, game.player2Id!, winnerId, Number(game.betAmount), game.betCurrency);
        }
      }

      return {
        game: this.formatGameState(updatedGame),
        move: moveResult.san,
        isGameOver,
        winnerId: winnerId?.toString(),
      };
    } catch (error: any) {
      throw new Error(`Invalid move: ${error.message}`);
    }
  }

  async getGameMoves(gameId: string) {
    return prisma.move.findMany({
      where: { gameId },
      orderBy: { moveNumber: 'asc' },
      include: {
        player: {
          select: { telegramId: true, username: true, firstName: true },
        },
      },
    });
  }

  private formatGameState(game: any): GameState {
    const chess = new Chess(game.fen);
    const moves = game.moves?.map((m: any) => m.moveSan) || [];

    return {
      id: game.id,
      player1Id: game.player1Id,
      player2Id: game.player2Id,
      status: game.status,
      betAmount: Number(game.betAmount),
      betCurrency: game.betCurrency,
      fen: game.fen,
      winnerId: game.winnerId,
      currentTurn: chess.turn(),
      isGameOver: chess.isGameOver(),
      moveHistory: moves,
    };
  }

  private determineWinner(chess: Chess, player1Id: bigint, player2Id: bigint): bigint | null {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? player2Id : player1Id;
    }
    if (chess.isDraw() || chess.isStalemate()) {
      return null; // Draw
    }
    return null;
  }

  private async handleGameCompletion(
    gameId: string,
    player1Id: bigint,
    player2Id: bigint,
    winnerId: bigint,
    betAmount: number,
    currency: CurrencyType
  ) {
    const totalPot = betAmount * 2;
    const commission = totalPot * (parseFloat(process.env.PLATFORM_COMMISSION || '5') / 100);
    const winnerAmount = totalPot - commission;

    // Release bets and distribute winnings
    await bettingService.releaseAndDistribute(
      gameId,
      player1Id,
      player2Id,
      winnerId,
      betAmount,
      winnerAmount,
      commission,
      currency
    );
  }
}

export const gameService = new GameService();

