import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import { TelegramGame } from './components/TelegramGame';

function TelegramApp() {
  const { webApp, user, isReady } = useTelegramWebApp();
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !webApp) return;

    // Get gameId from URL or Telegram initData
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('gameId');
    
    if (idFromUrl) {
      setGameId(idFromUrl);
    } else {
      // Try to get from Telegram Web App data
      const pathParts = window.location.pathname.split('/');
      const gameIdFromPath = pathParts[pathParts.length - 1];
      if (gameIdFromPath && gameIdFromPath !== 'index.html') {
        setGameId(gameIdFromPath);
      }
    }
  }, [isReady, webApp]);

  if (!isReady) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка...</div>;
  }

  if (!gameId) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Игра не найдена</h2>
        <p>Пожалуйста, откройте игру через Telegram бота</p>
      </div>
    );
  }

  return <TelegramGame gameId={gameId} />;
}

export default TelegramApp;

