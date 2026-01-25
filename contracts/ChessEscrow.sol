// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChessEscrow
 * @dev Escrow contract for ETH chess betting on Base
 */
contract ChessEscrow is ReentrancyGuard, Ownable {
    
    enum GameState {
        WaitingForPlayer,
        InProgress,
        Finished,
        Cancelled
    }

    struct Game {
        bytes32 gameId;
        address player1;
        address player2;
        uint256 betAmount;
        GameState state;
        address winner;
        uint256 createdAt;
    }

    // Platform commission in basis points (100 = 1%)
    uint256 public commissionBps = 500; // 5%
    
    // Minimum and maximum bet amounts
    uint256 public minBetAmount = 0.0001 ether;
    uint256 public maxBetAmount = 10 ether;
    
    // Oracle address that can declare winners
    address public oracle;
    
    // Timeout for games waiting for second player (24 hours)
    uint256 public joinTimeout = 24 hours;
    
    // Game timeout for inactive games (7 days)
    uint256 public gameTimeout = 7 days;

    // Mapping from gameId to Game
    mapping(bytes32 => Game) public games;
    
    // Array of active game IDs for listing
    bytes32[] public activeGameIds;
    
    // Mapping to track index in activeGameIds array
    mapping(bytes32 => uint256) private gameIdIndex;
    
    // Accumulated platform fees
    uint256 public accumulatedFees;

    // Events
    event GameCreated(bytes32 indexed gameId, address indexed player1, uint256 betAmount);
    event PlayerJoined(bytes32 indexed gameId, address indexed player2);
    event GameStarted(bytes32 indexed gameId, address player1, address player2, uint256 totalPot);
    event GameFinished(bytes32 indexed gameId, address indexed winner, uint256 winnings);
    event GameCancelled(bytes32 indexed gameId, address indexed player, uint256 refundAmount);
    event GameDraw(bytes32 indexed gameId, uint256 refundAmount);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event CommissionUpdated(uint256 oldCommission, uint256 newCommission);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // Modifiers
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can call this function");
        _;
    }

    modifier gameExists(bytes32 gameId) {
        require(games[gameId].player1 != address(0), "Game does not exist");
        _;
    }

    constructor(address _oracle) Ownable(msg.sender) {
        require(_oracle != address(0), "Oracle cannot be zero address");
        oracle = _oracle;
    }

    /**
     * @dev Create a new game with a bet
     * @param gameId Unique identifier for the game (generated off-chain)
     */
    function createGame(bytes32 gameId) external payable nonReentrant {
        require(games[gameId].player1 == address(0), "Game already exists");
        require(msg.value >= minBetAmount, "Bet amount too low");
        require(msg.value <= maxBetAmount, "Bet amount too high");

        games[gameId] = Game({
            gameId: gameId,
            player1: msg.sender,
            player2: address(0),
            betAmount: msg.value,
            state: GameState.WaitingForPlayer,
            winner: address(0),
            createdAt: block.timestamp
        });

        // Add to active games list
        gameIdIndex[gameId] = activeGameIds.length;
        activeGameIds.push(gameId);

        emit GameCreated(gameId, msg.sender, msg.value);
    }

    /**
     * @dev Join an existing game
     * @param gameId The game to join
     */
    function joinGame(bytes32 gameId) external payable nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.WaitingForPlayer, "Game not available for joining");
        require(game.player1 != msg.sender, "Cannot join your own game");
        require(msg.value == game.betAmount, "Must match the bet amount");
        require(block.timestamp <= game.createdAt + joinTimeout, "Game has expired");

        game.player2 = msg.sender;
        game.state = GameState.InProgress;

        emit PlayerJoined(gameId, msg.sender);
        emit GameStarted(gameId, game.player1, game.player2, game.betAmount * 2);
    }

    /**
     * @dev Declare the winner of a game (only callable by oracle)
     * @param gameId The game ID
     * @param winner The winner's address (address(0) for draw)
     */
    function declareWinner(bytes32 gameId, address winner) external onlyOracle nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.InProgress, "Game not in progress");
        require(
            winner == address(0) || winner == game.player1 || winner == game.player2,
            "Invalid winner address"
        );

        game.state = GameState.Finished;
        game.winner = winner;

        uint256 totalPot = game.betAmount * 2;

        if (winner == address(0)) {
            // Draw - refund both players
            uint256 refundAmount = game.betAmount;
            
            (bool success1, ) = game.player1.call{value: refundAmount}("");
            require(success1, "Refund to player1 failed");
            
            (bool success2, ) = game.player2.call{value: refundAmount}("");
            require(success2, "Refund to player2 failed");

            emit GameDraw(gameId, refundAmount);
        } else {
            // Winner takes pot minus commission
            uint256 commission = (totalPot * commissionBps) / 10000;
            uint256 winnings = totalPot - commission;
            
            accumulatedFees += commission;

            (bool success, ) = winner.call{value: winnings}("");
            require(success, "Transfer to winner failed");

            emit GameFinished(gameId, winner, winnings);
        }

        // Remove from active games
        _removeFromActiveGames(gameId);
    }

    /**
     * @dev Cancel a game that's waiting for a player
     * @param gameId The game to cancel
     */
    function cancelGame(bytes32 gameId) external nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.WaitingForPlayer, "Can only cancel waiting games");
        require(
            msg.sender == game.player1 || 
            (block.timestamp > game.createdAt + joinTimeout),
            "Only creator can cancel before timeout"
        );

        game.state = GameState.Cancelled;
        uint256 refundAmount = game.betAmount;

        (bool success, ) = game.player1.call{value: refundAmount}("");
        require(success, "Refund failed");

        // Remove from active games
        _removeFromActiveGames(gameId);

        emit GameCancelled(gameId, game.player1, refundAmount);
    }

    /**
     * @dev Force finish a timed-out game (refunds both players)
     * @param gameId The game to force finish
     */
    function forceFinishTimedOutGame(bytes32 gameId) external nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(game.state == GameState.InProgress, "Game not in progress");
        require(block.timestamp > game.createdAt + gameTimeout, "Game not timed out yet");

        game.state = GameState.Cancelled;
        uint256 refundAmount = game.betAmount;

        (bool success1, ) = game.player1.call{value: refundAmount}("");
        require(success1, "Refund to player1 failed");
        
        (bool success2, ) = game.player2.call{value: refundAmount}("");
        require(success2, "Refund to player2 failed");

        // Remove from active games
        _removeFromActiveGames(gameId);

        emit GameCancelled(gameId, address(0), refundAmount);
    }

    // ============ View Functions ============

    /**
     * @dev Get game details
     */
    function getGame(bytes32 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    /**
     * @dev Get all active game IDs
     */
    function getActiveGameIds() external view returns (bytes32[] memory) {
        return activeGameIds;
    }

    /**
     * @dev Get number of active games
     */
    function getActiveGamesCount() external view returns (uint256) {
        return activeGameIds.length;
    }

    /**
     * @dev Get games available to join (waiting for player, not expired)
     */
    function getAvailableGames() external view returns (Game[] memory) {
        uint256 count = 0;
        
        // First pass: count available games
        for (uint256 i = 0; i < activeGameIds.length; i++) {
            Game storage game = games[activeGameIds[i]];
            if (game.state == GameState.WaitingForPlayer && 
                block.timestamp <= game.createdAt + joinTimeout) {
                count++;
            }
        }
        
        // Second pass: collect available games
        Game[] memory availableGames = new Game[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeGameIds.length; i++) {
            Game storage game = games[activeGameIds[i]];
            if (game.state == GameState.WaitingForPlayer && 
                block.timestamp <= game.createdAt + joinTimeout) {
                availableGames[index] = game;
                index++;
            }
        }
        
        return availableGames;
    }

    // ============ Admin Functions ============

    /**
     * @dev Update the oracle address
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Oracle cannot be zero address");
        address oldOracle = oracle;
        oracle = _oracle;
        emit OracleUpdated(oldOracle, _oracle);
    }

    /**
     * @dev Update commission rate
     */
    function setCommission(uint256 _commissionBps) external onlyOwner {
        require(_commissionBps <= 1000, "Commission cannot exceed 10%");
        uint256 oldCommission = commissionBps;
        commissionBps = _commissionBps;
        emit CommissionUpdated(oldCommission, _commissionBps);
    }

    /**
     * @dev Update bet limits
     */
    function setBetLimits(uint256 _minBet, uint256 _maxBet) external onlyOwner {
        require(_minBet < _maxBet, "Min must be less than max");
        minBetAmount = _minBet;
        maxBetAmount = _maxBet;
    }

    /**
     * @dev Update timeouts
     */
    function setTimeouts(uint256 _joinTimeout, uint256 _gameTimeout) external onlyOwner {
        joinTimeout = _joinTimeout;
        gameTimeout = _gameTimeout;
    }

    /**
     * @dev Withdraw accumulated platform fees
     */
    function withdrawFees(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Cannot withdraw to zero address");
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        
        accumulatedFees = 0;
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit FeesWithdrawn(to, amount);
    }

    // ============ Internal Functions ============

    /**
     * @dev Remove a game from the active games array
     */
    function _removeFromActiveGames(bytes32 gameId) internal {
        uint256 index = gameIdIndex[gameId];
        uint256 lastIndex = activeGameIds.length - 1;
        
        if (index != lastIndex) {
            bytes32 lastGameId = activeGameIds[lastIndex];
            activeGameIds[index] = lastGameId;
            gameIdIndex[lastGameId] = index;
        }
        
        activeGameIds.pop();
        delete gameIdIndex[gameId];
    }
}
