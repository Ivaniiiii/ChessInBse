import { Context } from 'grammy';
import { userService } from '../../services/user-service.js';
import { getMainMenuKeyboard } from '../keyboards.js';

export async function handleBalance(ctx: Context) {
  const userId = BigInt(ctx.from!.id);
  const balance = await userService.getUserBalance(userId);

  if (!balance) {
    await ctx.reply('❌ Пользователь не найден');
    return;
  }

  const balanceText = 
    `💰 Ваш баланс:\n\n` +
    `🪙 Внутренние токены: ${balance.internalTokens.toFixed(2)}\n` +
    `⭐ Telegram Stars: ${balance.telegramStars.toFixed(2)}\n` +
    `💎 USDT: ${balance.cryptoUsdt.toFixed(8)}\n` +
    `💎 TON: ${balance.cryptoTon.toFixed(8)}\n` +
    `💵 Рубли: ${balance.fiatRub.toFixed(2)}\n\n` +
    `💳 Пополнить баланс: /deposit`;

  await ctx.reply(balanceText, {
    reply_markup: getMainMenuKeyboard(),
  });
}

