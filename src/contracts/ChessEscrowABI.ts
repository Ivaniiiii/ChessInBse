export const CHESS_ESCROW_ABI = [
  // Read functions
  {
    inputs: [{ name: "gameId", type: "bytes32" }],
    name: "getGame",
    outputs: [
      {
        components: [
          { name: "gameId", type: "bytes32" },
          { name: "player1", type: "address" },
          { name: "player2", type: "address" },
          { name: "betAmount", type: "uint256" },
          { name: "state", type: "uint8" },
          { name: "winner", type: "address" },
          { name: "createdAt", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAvailableGames",
    outputs: [
      {
        components: [
          { name: "gameId", type: "bytes32" },
          { name: "player1", type: "address" },
          { name: "player2", type: "address" },
          { name: "betAmount", type: "uint256" },
          { name: "state", type: "uint8" },
          { name: "winner", type: "address" },
          { name: "createdAt", type: "uint256" },
        ],
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getActiveGamesCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minBetAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxBetAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "commissionBps",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  // Write functions
  {
    inputs: [{ name: "gameId", type: "bytes32" }],
    name: "createGame",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "gameId", type: "bytes32" }],
    name: "joinGame",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "gameId", type: "bytes32" }],
    name: "cancelGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "gameId", type: "bytes32" },
      { indexed: true, name: "player1", type: "address" },
      { indexed: false, name: "betAmount", type: "uint256" },
    ],
    name: "GameCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "gameId", type: "bytes32" },
      { indexed: true, name: "player2", type: "address" },
    ],
    name: "PlayerJoined",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "gameId", type: "bytes32" },
      { indexed: false, name: "player1", type: "address" },
      { indexed: false, name: "player2", type: "address" },
      { indexed: false, name: "totalPot", type: "uint256" },
    ],
    name: "GameStarted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "gameId", type: "bytes32" },
      { indexed: true, name: "winner", type: "address" },
      { indexed: false, name: "winnings", type: "uint256" },
    ],
    name: "GameFinished",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "gameId", type: "bytes32" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "refundAmount", type: "uint256" },
    ],
    name: "GameCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "gameId", type: "bytes32" },
      { indexed: false, name: "refundAmount", type: "uint256" },
    ],
    name: "GameDraw",
    type: "event",
  },
] as const;

// Game state enum matching the contract
export enum GameState {
  WaitingForPlayer = 0,
  InProgress = 1,
  Finished = 2,
  Cancelled = 3,
}

// Game type for frontend
export interface ContractGame {
  gameId: `0x${string}`;
  player1: `0x${string}`;
  player2: `0x${string}`;
  betAmount: bigint;
  state: GameState;
  winner: `0x${string}`;
  createdAt: bigint;
}
