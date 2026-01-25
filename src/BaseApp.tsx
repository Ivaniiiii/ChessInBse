import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useMiniApp } from './hooks/useMiniApp';
import { useChessContract, generateGameId } from './hooks/useChessContract';
import { useWebSocket } from './hooks/useWebSocket';
import { GameLobby } from './components/GameLobby';
import { BaseGame } from './components/BaseGame';
import { Web3Provider } from './providers/Web3Provider';
import { ContractGame, GameState } from './contracts/ChessEscrowABI';
import './components/TelegramGame.css';

type AppScreen = 'lobby' | 'game';

interface BaseAppContentProps {}

const BaseAppContent: React.FC<BaseAppContentProps> = () => {
  const { context, isReady, error: miniAppError } = useMiniApp();
  const { 
    address, 
    isConnected, 
    connectWallet,
    balance,
    availableGames,
    refetchGames,
  } = useChessContract();
  
  const [screen, setScreen] = useState<AppScreen>('lobby');
  const [currentGameId, setCurrentGameId] = useState<`0x${string}` | null>(null);
  const [backendGameId, setBackendGameId] = useState<string | null>(null);

  // Auto-connect wallet when in frame
  useEffect(() => {
    if (isReady && !isConnected) {
      connectWallet();
    }
  }, [isReady, isConnected, connectWallet]);

  // Refresh games periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refetchGames();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [refetchGames]);

  const handleGameCreated = (contractGameId: `0x${string}`, backendId: string) => {
    setCurrentGameId(contractGameId);
    setBackendGameId(backendId);
    setScreen('game');
  };

  const handleGameJoined = (contractGameId: `0x${string}`, backendId: string) => {
    setCurrentGameId(contractGameId);
    setBackendGameId(backendId);
    setScreen('game');
  };

  const handleBackToLobby = () => {
    setScreen('lobby');
    setCurrentGameId(null);
    setBackendGameId(null);
    refetchGames();
  };

  if (!isReady) {
    return (
      <div className="base-app loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading Chess Battle...</p>
      </div>
    );
  }

  if (miniAppError) {
    return (
      <div className="base-app error-screen">
        <h2>Error</h2>
        <p>{miniAppError}</p>
      </div>
    );
  }

  return (
    <div className="base-app">
      <header className="app-header">
        <h1>Chess Battle</h1>
        {isConnected && address && (
          <div className="wallet-info">
            <span className="address">{address.slice(0, 6)}...{address.slice(-4)}</span>
            <span className="balance">{parseFloat(balance).toFixed(4)} ETH</span>
          </div>
        )}
      </header>

      <main className="app-main">
        {screen === 'lobby' && (
          <GameLobby
            userAddress={address}
            availableGames={availableGames}
            onGameCreated={handleGameCreated}
            onGameJoined={handleGameJoined}
            onRefresh={refetchGames}
          />
        )}

        {screen === 'game' && currentGameId && backendGameId && (
          <BaseGame
            contractGameId={currentGameId}
            backendGameId={backendGameId}
            userAddress={address}
            onBack={handleBackToLobby}
          />
        )}
      </main>

      {context?.user && (
        <footer className="app-footer">
          <span>Playing as {context.user.displayName || context.user.username || `FID: ${context.user.fid}`}</span>
        </footer>
      )}
    </div>
  );
};

// Main app with providers
const BaseApp: React.FC = () => {
  return (
    <Web3Provider>
      <BaseAppContent />
    </Web3Provider>
  );
};

export default BaseApp;
