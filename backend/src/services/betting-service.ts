import { prisma } from '../db/client.js';
import { CurrencyType, TransactionType, TransactionStatus } from '../types/index.js';
import { userService } from './user-service.js';

class BettingService {
  async checkBalance(userId: bigint, amount: number, currency: CurrencyType): Promise<boolean> {
    const balance = await userService.getUserBalance(userId);
    if (!balance) return false;

    switch (currency) {
      case 'INTERNAL_TOKENS':
        return balance.internalTokens >= amount;
      case 'TELEGRAM_STARS':
        return balance.telegramStars >= amount;
      case 'CRYPTO_USDT':
        return balance.cryptoUsdt >= amount;
      case 'CRYPTO_TON':
        return balance.cryptoTon >= amount;
      case 'FIAT_RUB':
        return balance.fiatRub >= amount;
      default:
        return false;
    }
  }

  async lockBet(userId: bigint, amount: number, currency: CurrencyType, gameId?: string) {
    // Create transaction to lock the bet
    await prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.BET_LOCKED,
        amount: -amount,
        currency,
        status: TransactionStatus.COMPLETED,
        gameId,
        description: `Bet locked for game ${gameId || 'pending'}`,
      },
    });

    // Update user balance
    await this.updateBalance(userId, -amount, currency);
  }

  async releaseAndDistribute(
    gameId: string,
    player1Id: bigint,
    player2Id: bigint,
    winnerId: bigint,
    betAmount: number,
    winnerAmount: number,
    commission: number,
    currency: CurrencyType
  ) {
    // Release both players' bets
    await prisma.transaction.createMany({
      data: [
        {
          userId: player1Id,
          type: TransactionType.BET_RELEASED,
          amount: betAmount,
          currency,
          status: TransactionStatus.COMPLETED,
          gameId,
          description: 'Bet released',
        },
        {
          userId: player2Id,
          type: TransactionType.BET_RELEASED,
          amount: betAmount,
          currency,
          status: TransactionStatus.COMPLETED,
          gameId,
          description: 'Bet released',
        },
      ],
    });

    // Distribute winnings to winner
    await prisma.transaction.create({
      data: {
        userId: winnerId,
        type: TransactionType.WIN,
        amount: winnerAmount,
        currency,
        status: TransactionStatus.COMPLETED,
        gameId,
        description: `Game win: ${winnerAmount} ${currency}`,
      },
    });

    // Record commission (to platform account or separate tracking)
    // For now, we'll just record it
    await prisma.transaction.create({
      data: {
        userId: player1Id, // Placeholder - in production, use platform account
        type: TransactionType.COMMISSION,
        amount: commission,
        currency,
        status: TransactionStatus.COMPLETED,
        gameId,
        description: `Platform commission`,
      },
    });

    // Update balances
    await this.updateBalance(player1Id, betAmount, currency);
    await this.updateBalance(player2Id, betAmount, currency);
    await this.updateBalance(winnerId, winnerAmount, currency);
  }

  private async updateBalance(userId: bigint, amount: number, currency: CurrencyType) {
    const updateField = this.getBalanceField(currency);
    await prisma.user.update({
      where: { telegramId: userId },
      data: {
        [updateField]: {
          increment: amount,
        },
      },
    });
  }

  private getBalanceField(currency: CurrencyType): string {
    switch (currency) {
      case 'INTERNAL_TOKENS':
        return 'internalTokens';
      case 'TELEGRAM_STARS':
        return 'telegramStars';
      case 'CRYPTO_USDT':
        return 'cryptoUsdt';
      case 'CRYPTO_TON':
        return 'cryptoTon';
      case 'FIAT_RUB':
        return 'fiatRub';
    }
  }
}

export const bettingService = new BettingService();

