import { Bot, Context } from 'grammy';
import { handleStart } from './handlers/start.js';
import { handleBalance } from './handlers/balance.js';
import { handlePlay, handleCurrencySelection, handleBetAmount, handleJoinGame } from './handlers/play.js';
import { getMainMenuKeyboard } from './keyboards.js';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set');
}

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Start command
bot.command('start', handleStart);

// Balance command
bot.command('balance', handleBalance);
bot.hears('💰 Баланс', handleBalance);

// Play command
bot.command('play', handlePlay);
bot.hears('🎮 Создать игру', handlePlay);

// Deposit command
bot.command('deposit', async (ctx) => {
  await ctx.reply('💳 Выберите способ пополнения:\n\nВ разработке...');
});

// History command
bot.command('history', async (ctx) => {
  await ctx.reply('📊 История игр:\n\nВ разработке...');
});

// Settings command
bot.command('settings', async (ctx) => {
  await ctx.reply('⚙️ Настройки:\n\nВ разработке...');
});

// Callback handlers
bot.callbackQuery(/^currency_(.+)$/, async (ctx) => {
  const currency = ctx.match[1];
  await handleCurrencySelection(ctx, currency);
});

bot.callbackQuery(/^bet_(\d+)$/, async (ctx) => {
  const amount = parseInt(ctx.match[1]);
  await handleBetAmount(ctx, amount);
});

bot.callbackQuery(/^join_game_(.+)$/, async (ctx) => {
  const gameId = ctx.match[1];
  await handleJoinGame(ctx, gameId);
});

bot.callbackQuery('main_menu', async (ctx) => {
  await ctx.editMessageText('Главное меню:', {
    reply_markup: getMainMenuKeyboard(),
  });
});

bot.callbackQuery('cancel', async (ctx) => {
  await ctx.answerCallbackQuery('Отменено');
  await ctx.deleteMessage();
});

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Start bot
bot.start().catch(console.error);

