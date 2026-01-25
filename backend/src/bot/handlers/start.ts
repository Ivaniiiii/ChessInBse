import { Context } from 'grammy';
import { userService } from '../../services/user-service.js';
import { getMainMenuKeyboard } from '../keyboards.js';

export async function handleStart(ctx: Context) {
  const userId = BigInt(ctx.from!.id);
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;
  const lastName = ctx.from.last_name;

  // Register or update user
  await userService.getOrCreateUser(userId, username, firstName, lastName);

  await ctx.reply(
    `👋 Добро пожаловать в Chess Multiplayer!\n\n` +
    `🎮 Создавайте игры и играйте на ставки\n` +
    `💰 Пополняйте баланс разными способами\n` +
    `🏆 Выигрывайте и зарабатывайте\n\n` +
    `Выберите действие:`,
    {
      reply_markup: getMainMenuKeyboard(),
    }
  );
}

