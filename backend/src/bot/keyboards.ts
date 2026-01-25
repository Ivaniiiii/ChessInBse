import { Keyboard, InlineKeyboard } from 'grammy';
import { CurrencyType } from '../types/index.js';

export function getMainMenuKeyboard() {
  return new Keyboard()
    .text('🎮 Создать игру')
    .text('💰 Баланс')
    .row()
    .text('📊 История игр')
    .text('⚙️ Настройки')
    .row()
    .text('💳 Пополнить')
    .resized();
}

export function getCurrencyKeyboard() {
  return new InlineKeyboard()
    .text('🪙 Внутренние токены', 'currency_INTERNAL_TOKENS')
    .row()
    .text('⭐ Telegram Stars', 'currency_TELEGRAM_STARS')
    .row()
    .text('💎 USDT', 'currency_CRYPTO_USDT')
    .row()
    .text('💎 TON', 'currency_CRYPTO_TON')
    .row()
    .text('💵 Рубли', 'currency_FIAT_RUB');
}

export function getBetAmountKeyboard() {
  return new InlineKeyboard()
    .text('10', 'bet_10')
    .text('50', 'bet_50')
    .text('100', 'bet_100')
    .row()
    .text('500', 'bet_500')
    .text('1000', 'bet_1000')
    .text('5000', 'bet_5000')
    .row()
    .text('↩️ Назад', 'back_to_currency');
}

export function getGameKeyboard(gameId: string, isMyTurn: boolean) {
  const keyboard = new InlineKeyboard();
  
  if (isMyTurn) {
    keyboard.text('🎯 Сделать ход', `game_move_${gameId}`);
  }
  
  keyboard
    .text('📋 История ходов', `game_history_${gameId}`)
    .row()
    .text('🔙 В главное меню', 'main_menu');
  
  return keyboard;
}

export function getJoinGameKeyboard(gameId: string) {
  return new InlineKeyboard()
    .text('✅ Присоединиться', `join_game_${gameId}`)
    .text('❌ Отмена', 'cancel_game');
}

export function getCancelKeyboard() {
  return new InlineKeyboard()
    .text('❌ Отмена', 'cancel');
}

