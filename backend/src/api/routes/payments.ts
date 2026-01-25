import { Router } from 'express';
import { paymentService } from '../../services/payment-service.js';
import { CurrencyType } from '../../types/index.js';

export const paymentRoutes = Router();

// Deposit funds
paymentRoutes.post('/deposit', async (req, res) => {
  try {
    const { userId, amount, currency, externalId } = req.body as {
      userId: bigint;
      amount: number;
      currency: CurrencyType;
      externalId?: string;
    };
    
    if (!userId || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transaction = await paymentService.deposit({
      userId: BigInt(userId),
      amount,
      currency,
      externalId,
    });

    res.json(transaction);
  } catch (error: any) {
    console.error('Error depositing:', error);
    res.status(500).json({ error: error.message || 'Failed to deposit' });
  }
});

// Withdraw funds
paymentRoutes.post('/withdraw', async (req, res) => {
  try {
    const { userId, amount, currency } = req.body as {
      userId: bigint;
      amount: number;
      currency: CurrencyType;
    };
    
    if (!userId || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transaction = await paymentService.withdraw({
      userId: BigInt(userId),
      amount,
      currency,
    });

    res.json(transaction);
  } catch (error: any) {
    console.error('Error withdrawing:', error);
    res.status(500).json({ error: error.message || 'Failed to withdraw' });
  }
});

// Get transaction history
paymentRoutes.get('/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const transactions = await paymentService.getTransactionHistory(
      BigInt(userId),
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json(transactions);
  } catch (error: any) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: error.message || 'Failed to get transactions' });
  }
});

