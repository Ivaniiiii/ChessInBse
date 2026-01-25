/**
 * Ethereum Service for interacting with ChessEscrow contract on Base
 */

import { createPublicClient, createWalletClient, http, parseAbiItem, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Contract ABI (minimal for backend operations)
const CHESS_ESCROW_ABI = [
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
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "gameId", type: "bytes32" },
      { name: "winner", type: "address" },
    ],
    name: "declareWinner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Event signatures
const GameCreatedEvent = parseAbiItem('event GameCreated(bytes32 indexed gameId, address indexed player1, uint256 betAmount)');
const PlayerJoinedEvent = parseAbiItem('event PlayerJoined(bytes32 indexed gameId, address indexed player2)');
const GameFinishedEvent = parseAbiItem('event GameFinished(bytes32 indexed gameId, address indexed winner, uint256 winnings)');
const GameCancelledEvent = parseAbiItem('event GameCancelled(bytes32 indexed gameId, address indexed player, uint256 refundAmount)');

export interface ContractGame {
  gameId: `0x${string}`;
  player1: `0x${string}`;
  player2: `0x${string}`;
  betAmount: bigint;
  state: number;
  winner: `0x${string}`;
  createdAt: bigint;
}

export enum ContractGameState {
  WaitingForPlayer = 0,
  InProgress = 1,
  Finished = 2,
  Cancelled = 3,
}

class EthereumService {
  private publicClient;
  private walletClient;
  private contractAddress: `0x${string}`;
  private oracleAccount;

  constructor() {
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    this.contractAddress = (process.env.CHESS_ESCROW_CONTRACT_ADDRESS || '0x0') as `0x${string}`;
    
    // Public client for reading
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    // Wallet client for oracle operations
    const oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY;
    if (oraclePrivateKey) {
      this.oracleAccount = privateKeyToAccount(oraclePrivateKey as `0x${string}`);
      this.walletClient = createWalletClient({
        account: this.oracleAccount,
        chain: base,
        transport: http(rpcUrl),
      });
    }
  }

  /**
   * Get game data from contract
   */
  async getGame(gameId: `0x${string}`): Promise<ContractGame | null> {
    try {
      const game = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CHESS_ESCROW_ABI,
        functionName: 'getGame',
        args: [gameId],
      });

      return game as ContractGame;
    } catch (error) {
      console.error('Failed to get game from contract:', error);
      return null;
    }
  }

  /**
   * Verify a transaction exists and is confirmed
   */
  async verifyTransaction(txHash: `0x${string}`): Promise<{
    confirmed: boolean;
    blockNumber?: bigint;
    status?: 'success' | 'reverted';
  }> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash });
      
      return {
        confirmed: true,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      };
    } catch (error) {
      return { confirmed: false };
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: `0x${string}`, confirmations: number = 1): Promise<boolean> {
    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations,
      });
      
      return receipt.status === 'success';
    } catch (error) {
      console.error('Failed to wait for transaction:', error);
      return false;
    }
  }

  /**
   * Parse GameCreated event from transaction logs
   */
  async parseGameCreatedEvent(txHash: `0x${string}`): Promise<{
    gameId: `0x${string}`;
    player1: `0x${string}`;
    betAmount: bigint;
  } | null> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash });
      
      for (const log of receipt.logs) {
        try {
          // Check if this is a GameCreated event by topic
          if (log.topics[0] === '0x...') { // Would need actual event signature
            const gameId = log.topics[1] as `0x${string}`;
            const player1 = `0x${log.topics[2]?.slice(26)}` as `0x${string}`;
            const betAmount = BigInt(log.data);
            
            return { gameId, player1, betAmount };
          }
        } catch {
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse GameCreated event:', error);
      return null;
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }

  /**
   * Check if contract is deployed and accessible
   */
  async isContractReady(): Promise<boolean> {
    try {
      const code = await this.publicClient.getBytecode({ address: this.contractAddress });
      return code !== undefined && code !== '0x';
    } catch {
      return false;
    }
  }

  /**
   * Format ETH amount for display
   */
  formatEth(amount: bigint): string {
    return formatEther(amount);
  }

  /**
   * Get contract address
   */
  getContractAddress(): `0x${string}` {
    return this.contractAddress;
  }
}

export const ethereumService = new EthereumService();
export default ethereumService;
