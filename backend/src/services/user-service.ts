import { prisma } from '../db/client.js';
import { UserBalance } from '../types/index.js';

class UserService {
  async getOrCreateUser(telegramId: bigint, username?: string, firstName?: string, lastName?: string) {
    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          username,
          firstName,
          lastName,
        },
      });
    } else if (username || firstName || lastName) {
      // Update user info if provided
      user = await prisma.user.update({
        where: { telegramId },
        data: {
          username: username || user.username,
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
        },
      });
    }

    return user;
  }

  async getUserBalance(telegramId: bigint): Promise<UserBalance | null> {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        internalTokens: true,
        telegramStars: true,
        cryptoUsdt: true,
        cryptoTon: true,
        cryptoEth: true,
        fiatRub: true,
      },
    });

    if (!user) return null;

    return {
      internalTokens: Number(user.internalTokens),
      telegramStars: Number(user.telegramStars),
      cryptoUsdt: Number(user.cryptoUsdt),
      cryptoTon: Number(user.cryptoTon),
      cryptoEth: Number(user.cryptoEth),
      fiatRub: Number(user.fiatRub),
    };
  }

  async getUserGames(telegramId: bigint, limit: number = 10, offset: number = 0) {
    return prisma.game.findMany({
      where: {
        OR: [
          { player1Id: telegramId },
          { player2Id: telegramId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        player1: {
          select: { telegramId: true, username: true, firstName: true },
        },
        player2: {
          select: { telegramId: true, username: true, firstName: true },
        },
      },
    });
  }
}

export const userService = new UserService();

