import React from 'react';
import './BettingPanel.css';

interface BettingPanelProps {
  betAmount: number;
  betCurrency: string;
  player1Balance?: number;
  player2Balance?: number;
  isMyTurn: boolean;
  onMakeMove?: () => void;
}

export const BettingPanel: React.FC<BettingPanelProps> = ({
  betAmount,
  betCurrency,
  player1Balance,
  player2Balance,
  isMyTurn,
  onMakeMove,
}) => {
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'INTERNAL_TOKENS':
        return '🪙';
      case 'TELEGRAM_STARS':
        return '⭐';
      case 'CRYPTO_USDT':
        return '💎';
      case 'CRYPTO_TON':
        return '💎';
      case 'FIAT_RUB':
        return '💵';
      default:
        return '💰';
    }
  };

  const getCurrencyName = (currency: string) => {
    switch (currency) {
      case 'INTERNAL_TOKENS':
        return 'Токены';
      case 'TELEGRAM_STARS':
        return 'Stars';
      case 'CRYPTO_USDT':
        return 'USDT';
      case 'CRYPTO_TON':
        return 'TON';
      case 'FIAT_RUB':
        return '₽';
      default:
        return currency;
    }
  };

  return (
    <div className="betting-panel">
      <div className="betting-info">
        <div className="bet-amount">
          <span className="bet-label">Ставка:</span>
          <span className="bet-value">
            {getCurrencySymbol(betCurrency)} {betAmount} {getCurrencyName(betCurrency)}
          </span>
        </div>
        <div className="pot-info">
          <span className="pot-label">Призовой фонд:</span>
          <span className="pot-value">
            {getCurrencySymbol(betCurrency)} {betAmount * 2} {getCurrencyName(betCurrency)}
          </span>
        </div>
      </div>
      {isMyTurn && (
        <button className="make-move-btn" onClick={onMakeMove}>
          🎯 Сделать ход
        </button>
      )}
    </div>
  );
};

