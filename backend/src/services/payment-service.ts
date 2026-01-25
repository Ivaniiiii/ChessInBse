import { prisma } from '../db/client.js';
import { CurrencyType, TransactionType, TransactionStatus } from '../types/index.js';
import { bettingService } from './betting-service.js';

interface DepositParams {
  userId: bigint;
  amount: number;
  currency: CurrencyType;
  externalId?: string;
}

interface WithdrawParams {
  userId: bigint;
  amount: number;
  currency: CurrencyType;
}

class PaymentService {
  async deposit(params: DepositParams) {
    const { userId, amount, currency, externalId } = params;

    // Check if transaction with this externalId already exists
    if (externalId) {
      const existing = await prisma.transaction.findUnique({
        where: { externalId },
      });
      if (existing) {
        throw new Error('Transaction already processed');
      }
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.DEPOSIT,
        amount,
        currency,
        status: TransactionStatus.COMPLETED,
        externalId,
        description: `Deposit: ${amount} ${currency}`,
        completedAt: new Date(),
      },
    });

    // Update balance
    await this.updateBalance(userId, amount, currency);

    return transaction;
  }

  async withdraw(params: WithdrawParams) {
    const { userId, amount, currency } = params;

    // Check balance
    const hasBalance = await bettingService.checkBalance(userId, amount, currency);
    if (!hasBalance) {
      throw new Error('Insufficient balance');
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.WITHDRAW,
        amount: -amount,
        currency,
        status: TransactionStatus.PENDING,
        description: `Withdrawal: ${amount} ${currency}`,
      },
    });

    // Update balance (lock funds)
    await this.updateBalance(userId, -amount, currency);

    // In production, here you would integrate with payment gateway
    // For now, we'll mark it as completed immediately
    const completedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return completedTransaction;
  }

  async getTransactionHistory(userId: bigint, limit: number = 20, offset: number = 0) {
    return prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        game: {
          select: { id: true },
        },
      },
    });
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
      case 'CRYPTO_ETH':
        return 'cryptoEth';
      case 'FIAT_RUB':
        return 'fiatRub';
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  }
}

export const paymentService = new PaymentService();

