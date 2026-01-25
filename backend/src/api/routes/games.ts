import { Router } from 'express';
import { gameService } from '../../services/game-service.js';
import { CreateGameRequest, JoinGameRequest, MakeMoveRequest } from '../../types/index.js';

export const gameRoutes = Router();

// Create a new game
gameRoutes.post('/', async (req, res) => {
  try {
    const { playerId, betAmount, betCurrency } = req.body as CreateGameRequest & { playerId: bigint };
    
    if (!playerId || !betAmount || !betCurrency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const game = await gameService.createGame({
      playerId: BigInt(playerId),
      betAmount,
      betCurrency,
    });

    res.json(game);
  } catch (error: any) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: error.message || 'Failed to create game' });
  }
});

// Get game by ID
gameRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const game = await gameService.getGameById(id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (error: any) {
    console.error('Error getting game:', error);
    res.status(500).json({ error: error.message || 'Failed to get game' });
  }
});

// Join a game
gameRoutes.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { playerId } = req.body as { playerId: bigint };
    
    if (!playerId) {
      return res.status(400).json({ error: 'Missing playerId' });
    }

    const game = await gameService.joinGame(id, BigInt(playerId));
    res.json(game);
  } catch (error: any) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: error.message || 'Failed to join game' });
  }
});

// Make a move
gameRoutes.post('/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { playerId, move } = req.body as MakeMoveRequest & { playerId: bigint };
    
    if (!playerId || !move) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await gameService.makeMove(id, BigInt(playerId), move);
    res.json(result);
  } catch (error: any) {
    console.error('Error making move:', error);
    res.status(500).json({ error: error.message || 'Failed to make move' });
  }
});

// Get game moves history
gameRoutes.get('/:id/moves', async (req, res) => {
  try {
    const { id } = req.params;
    const moves = await gameService.getGameMoves(id);
    res.json(moves);
  } catch (error: any) {
    console.error('Error getting moves:', error);
    res.status(500).json({ error: error.message || 'Failed to get moves' });
  }
});

// ============ ETH Game Routes ============

// Create an ETH game (after on-chain transaction)
gameRoutes.post('/eth/create', async (req, res) => {
  try {
    const { contractGameId, player1Wallet, betAmount, createTxHash, farcasterFid } = req.body;
    
    if (!contractGameId || !player1Wallet || !betAmount || !createTxHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const game = await gameService.createEthGame({
      contractGameId,
      player1Wallet,
      betAmount,
      createTxHash,
      farcasterFid,
    });

    res.json(game);
  } catch (error: any) {
    console.error('Error creating ETH game:', error);
    res.status(500).json({ error: error.message || 'Failed to create ETH game' });
  }
});

// Join an ETH game (after on-chain transaction)
gameRoutes.post('/eth/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { player2Wallet, joinTxHash, farcasterFid } = req.body;
    
    if (!player2Wallet || !joinTxHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const game = await gameService.joinEthGame({
      gameId: id,
      player2Wallet,
      joinTxHash,
      farcasterFid,
    });

    res.json(game);
  } catch (error: any) {
    console.error('Error joining ETH game:', error);
    res.status(500).json({ error: error.message || 'Failed to join ETH game' });
  }
});

// Get game by contract ID
gameRoutes.get('/eth/contract/:contractGameId', async (req, res) => {
  try {
    const { contractGameId } = req.params;
    const game = await gameService.getGameByContractId(contractGameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (error: any) {
    console.error('Error getting game by contract ID:', error);
    res.status(500).json({ error: error.message || 'Failed to get game' });
  }
});

