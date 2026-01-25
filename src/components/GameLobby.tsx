import React, { useState, useCallback } from 'react';
import { formatEther } from 'viem';
import { useCreateGame, useJoinGame, useContractData, generateGameId } from '../hooks/useChessContract';
import { ContractGame, GameState } from '../contracts/ChessEscrowABI';
import './GameLobby.css';

interface GameLobbyProps {
  userAddress: `0x${string}` | undefined;
  availableGames: ContractGame[];
  onGameCreated: (contractGameId: `0x${string}`, backendId: string) => void;
  onGameJoined: (contractGameId: `0x${string}`, backendId: string) => void;
  onRefresh: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  userAddress,
  availableGames,
  onGameCreated,
  onGameJoined,
  onRefresh,
}) => {
  const [betAmount, setBetAmount] = useState('0.01');
  const [isCreating, setIsCreating] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState<`0x${string}` | null>(null);
  
  const { minBet, maxBet, commissionPercent } = useContractData();
  const { 
    createGame, 
    isPending: isCreatePending, 
    isConfirming: isCreateConfirming,
    isConfirmed: isCreateConfirmed,
    hash: createHash,
    error: createError,
    reset: resetCreate,
  } = useCreateGame();
  
  const {
    joinGame,
    isPending: isJoinPending,
    isConfirming: isJoinConfirming,
    isConfirmed: isJoinConfirmed,
    hash: joinHash,
    error: joinError,
    reset: resetJoin,
  } = useJoinGame();

  // Handle game creation
  const handleCreateGame = useCallback(async () => {
    if (!userAddress) return;
    
    setIsCreating(true);
    
    // Generate unique game ID
    const seed = `${userAddress}-${Date.now()}-${Math.random()}`;
    const gameId = generateGameId(seed);
    
    try {
      createGame(gameId, betAmount);
      
      // Note: In production, we'd wait for confirmation and then register with backend
      // For now, we'll use the contract gameId as backend ID temporarily
      // The actual backend integration would happen after tx confirmation
      
    } catch (err) {
      console.error('Failed to create game:', err);
      setIsCreating(false);
    }
  }, [userAddress, betAmount, createGame]);

  // Watch for create confirmation
  React.useEffect(() => {
    if (isCreateConfirmed && createHash && isCreating) {
      // Game created successfully - navigate to game
      // In production, we'd call backend API here to register the game
      const seed = `${userAddress}-${Date.now()}`;
      const gameId = generateGameId(seed);
      onGameCreated(gameId, createHash);
      setIsCreating(false);
      resetCreate();
    }
  }, [isCreateConfirmed, createHash, isCreating, userAddress, onGameCreated, resetCreate]);

  // Handle joining a game
  const handleJoinGame = useCallback(async (game: ContractGame) => {
    if (!userAddress) return;
    
    setJoiningGameId(game.gameId);
    
    try {
      joinGame(game.gameId, game.betAmount);
    } catch (err) {
      console.error('Failed to join game:', err);
      setJoiningGameId(null);
    }
  }, [userAddress, joinGame]);

  // Watch for join confirmation
  React.useEffect(() => {
    if (isJoinConfirmed && joinHash && joiningGameId) {
      // Game joined successfully - navigate to game
      onGameJoined(joiningGameId, joinHash);
      setJoiningGameId(null);
      resetJoin();
    }
  }, [isJoinConfirmed, joinHash, joiningGameId, onGameJoined, resetJoin]);

  const isLoading = isCreatePending || isCreateConfirming || isJoinPending || isJoinConfirming;

  // Filter out user's own games and expired games
  const joinableGames = availableGames.filter(game => 
    game.player1.toLowerCase() !== userAddress?.toLowerCase() &&
    game.state === GameState.WaitingForPlayer
  );

  return (
    <div className="game-lobby">
      <section className="create-game-section">
        <h2>Create New Game</h2>
        
        <div className="bet-input-group">
          <label htmlFor="betAmount">Bet Amount (ETH)</label>
          <input
            id="betAmount"
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min={minBet}
            max={maxBet}
            step="0.001"
            disabled={isLoading}
          />
          <span className="bet-range">Min: {minBet} ETH | Max: {maxBet} ETH</span>
        </div>

        <div className="pot-preview">
          <span>Total Pot: {(parseFloat(betAmount) * 2).toFixed(4)} ETH</span>
          <span className="commission">Platform fee: {commissionPercent}%</span>
          <span className="winnings">
            Winner receives: {(parseFloat(betAmount) * 2 * (1 - commissionPercent / 100)).toFixed(4)} ETH
          </span>
        </div>

        <button
          className="create-game-btn"
          onClick={handleCreateGame}
          disabled={!userAddress || isLoading || parseFloat(betAmount) <= 0}
        >
          {isCreatePending ? 'Confirm in Wallet...' : 
           isCreateConfirming ? 'Creating Game...' : 
           'Create Game'}
        </button>

        {createError && (
          <p className="error-message">{createError.message}</p>
        )}
      </section>

      <section className="available-games-section">
        <div className="section-header">
          <h2>Available Games</h2>
          <button className="refresh-btn" onClick={onRefresh} disabled={isLoading}>
            Refresh
          </button>
        </div>

        {joinableGames.length === 0 ? (
          <div className="no-games">
            <p>No games available. Create one to start playing!</p>
          </div>
        ) : (
          <div className="games-list">
            {joinableGames.map((game) => (
              <div key={game.gameId} className="game-card">
                <div className="game-info">
                  <span className="player">
                    Creator: {game.player1.slice(0, 6)}...{game.player1.slice(-4)}
                  </span>
                  <span className="bet">
                    Bet: {formatEther(game.betAmount)} ETH
                  </span>
                  <span className="pot">
                    Pot: {formatEther(game.betAmount * BigInt(2))} ETH
                  </span>
                </div>
                <button
                  className="join-btn"
                  onClick={() => handleJoinGame(game)}
                  disabled={isLoading || joiningGameId === game.gameId}
                >
                  {joiningGameId === game.gameId ? (
                    isJoinPending ? 'Confirm...' : 'Joining...'
                  ) : (
                    `Join (${formatEther(game.betAmount)} ETH)`
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {joinError && (
          <p className="error-message">{joinError.message}</p>
        )}
      </section>
    </div>
  );
};

export default GameLobby;
