import { Context } from 'grammy';
import { gameService } from '../../services/game-service.js';
import { getCurrencyKeyboard, getBetAmountKeyboard, getJoinGameKeyboard } from '../keyboards.js';

// Store temporary game creation state
const gameCreationState = new Map<bigint, { currency?: string; amount?: number }>();

export async function handlePlay(ctx: Context) {
  await ctx.reply(
    '🎮 Выберите валюту для ставки:',
    {
      reply_markup: getCurrencyKeyboard(),
    }
  );
}

export async function handleCurrencySelection(ctx: Context, currency: string) {
  const userId = BigInt(ctx.from!.id);
  
  gameCreationState.set(userId, { currency });
  
  await ctx.editMessageText(
    '💰 Выберите сумму ставки:',
    {
      reply_markup: getBetAmountKeyboard(),
    }
  );
}

export async function handleBetAmount(ctx: Context, amount: number) {
  const userId = BigInt(ctx.from!.id);
  const state = gameCreationState.get(userId);
  
  if (!state || !state.currency) {
    await ctx.answerCallbackQuery('❌ Ошибка. Начните заново: /play');
    return;
  }

  try {
    const game = await gameService.createGame({
      playerId: userId,
      betAmount: amount,
      betCurrency: state.currency as any,
    });

    gameCreationState.delete(userId);

    await ctx.editMessageText(
      `✅ Игра создана!\n\n` +
      `🎮 ID игры: ${game.id}\n` +
      `💰 Ставка: ${amount} ${state.currency}\n` +
      `⏳ Ожидание соперника...\n\n` +
      `Поделитесь этой ссылкой с другом или дождитесь присоединения:`,
      {
        reply_markup: getJoinGameKeyboard(game.id),
      }
    );
  } catch (error: any) {
    await ctx.answerCallbackQuery(`❌ ${error.message}`);
  }
}

export async function handleJoinGame(ctx: Context, gameId: string) {
  const userId = BigInt(ctx.from!.id);
  
  try {
    const game = await gameService.joinGame(gameId, userId);
    
    await ctx.editMessageText(
      `🎮 Игра началась!\n\n` +
      `Игрок 1: ${game.player1Id}\n` +
      `Игрок 2: ${game.player2Id}\n` +
      `💰 Ставка: ${game.betAmount} ${game.betCurrency}\n\n` +
      `Откройте Web App для игры:`,
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🎯 Открыть игру',
              web_app: { url: `${process.env.WEB_APP_URL}/game/${gameId}` },
            },
          ]],
        },
      }
    );
  } catch (error: any) {
    await ctx.answerCallbackQuery(`❌ ${error.message}`);
  }
}

