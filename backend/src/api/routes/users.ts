import { Router } from 'express';
import { userService } from '../../services/user-service.js';

export const userRoutes = Router();

// Get user balance
userRoutes.get('/:id/balance', async (req, res) => {
  try {
    const { id } = req.params;
    const balance = await userService.getUserBalance(BigInt(id));
    
    if (!balance) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(balance);
  } catch (error: any) {
    console.error('Error getting balance:', error);
    res.status(500).json({ error: error.message || 'Failed to get balance' });
  }
});

// Get user games history
userRoutes.get('/:id/games', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const games = await userService.getUserGames(
      BigInt(id),
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json(games);
  } catch (error: any) {
    console.error('Error getting user games:', error);
    res.status(500).json({ error: error.message || 'Failed to get games' });
  }
});

