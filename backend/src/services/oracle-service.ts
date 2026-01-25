/**
 * Oracle Service for declaring winners in ChessEscrow contract
 * 
 * This service is responsible for:
 * - Listening to game completion events from the backend
 * - Submitting winner declarations to the smart contract
 * - Handling retries and error recovery
 */

import { createWalletClient, http, createPublicClient, parseEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { prisma } from '../db/client.js';

// Contract ABI for oracle functions
const ORACLE_ABI = [
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
] as const;

// Pending winner declaration queue
interface PendingDeclaration {
  gameId: string;
  contractGameId: `0x${string}`;
  winnerWallet: `0x${string}`;
  attempts: number;
  lastAttempt?: Date;
}

class OracleService {
  private walletClient;
  private publicClient;
  private oracleAccount;
  private contractAddress: `0x${string}`;
  private pendingDeclarations: Map<string, PendingDeclaration> = new Map();
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor() {
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    this.contractAddress = (process.env.CHESS_ESCROW_CONTRACT_ADDRESS || '0x0') as `0x${string}`;
    
    const oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY;
    
    if (!oraclePrivateKey) {
      console.warn('ORACLE_PRIVATE_KEY not set - oracle service will not be able to declare winners');
      return;
    }

    this.oracleAccount = privateKeyToAccount(oraclePrivateKey as `0x${string}`);
    
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.oracleAccount,
      chain: base,
      transport: http(rpcUrl),
    });

    console.log(`Oracle service initialized with address: ${this.oracleAccount.address}`);
  }

  /**
   * Declare a winner for a game
   * This adds the declaration to a queue and processes it
   */
  async declareWinner(
    gameId: string,
    contractGameId: `0x${string}`,
    winnerWallet: `0x${string}` | null // null for draw
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.walletClient || !this.oracleAccount) {
      return { success: false, error: 'Oracle not configured' };
    }

    // For draws, winner address is zero
    const winner = winnerWallet || '0x0000000000000000000000000000000000000000' as `0x${string}`;

    // Check if game exists in contract and is in progress
    try {
      const game = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: ORACLE_ABI,
        functionName: 'getGame',
        args: [contractGameId],
      });

      if (!game) {
        return { success: false, error: 'Game not found in contract' };
      }

      // State 1 = InProgress
      if (game.state !== 1) {
        return { success: false, error: `Game is not in progress (state: ${game.state})` };
      }

      // Validate winner address
      if (winner !== '0x0000000000000000000000000000000000000000') {
        if (winner.toLowerCase() !== game.player1.toLowerCase() && 
            winner.toLowerCase() !== game.player2.toLowerCase()) {
          return { success: false, error: 'Winner is not a player in this game' };
        }
      }
    } catch (error) {
      console.error('Failed to verify game in contract:', error);
      return { success: false, error: 'Failed to verify game in contract' };
    }

    // Submit transaction
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ORACLE_ABI,
        functionName: 'declareWinner',
        args: [contractGameId, winner],
      });

      console.log(`Winner declaration submitted: ${hash}`);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (!receipt) {
        return { success: false, error: 'Transaction receipt not received' };
      }

      if (receipt.status === 'success') {
        // Update database
        await prisma.game.update({
          where: { id: gameId },
          data: {
            finishTxHash: hash,
            winnerWallet: winner,
          },
        });

        console.log(`Winner declared successfully for game ${gameId}`);
        return { success: true, txHash: hash };
      } else {
        return { success: false, error: 'Transaction reverted' };
      }
    } catch (error: any) {
      console.error('Failed to declare winner:', error);
      return { success: false, error: error.message || 'Transaction failed' };
    }
  }

  /**
   * Queue a winner declaration for retry
   */
  queueDeclaration(
    gameId: string,
    contractGameId: `0x${string}`,
    winnerWallet: `0x${string}`
  ) {
    this.pendingDeclarations.set(gameId, {
      gameId,
      contractGameId,
      winnerWallet,
      attempts: 0,
    });

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process pending declarations
   */
  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.pendingDeclarations.size > 0) {
      for (const [gameId, declaration] of this.pendingDeclarations) {
        // Skip if recently attempted
        if (declaration.lastAttempt) {
          const timeSinceLastAttempt = Date.now() - declaration.lastAttempt.getTime();
          if (timeSinceLastAttempt < this.retryDelay) {
            continue;
          }
        }

        // Try to declare winner
        declaration.attempts++;
        declaration.lastAttempt = new Date();

        const result = await this.declareWinner(
          declaration.gameId,
          declaration.contractGameId,
          declaration.winnerWallet
        );

        if (result.success) {
          this.pendingDeclarations.delete(gameId);
          console.log(`Successfully declared winner for ${gameId} after ${declaration.attempts} attempts`);
        } else if (declaration.attempts >= this.maxRetries) {
          this.pendingDeclarations.delete(gameId);
          console.error(`Failed to declare winner for ${gameId} after ${this.maxRetries} attempts: ${result.error}`);
          
          // Mark game as failed in database
          await prisma.game.update({
            where: { id: gameId },
            data: {
              // Could add a field for oracle failure status
            },
          });
        }
      }

      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
  }

  /**
   * Get oracle wallet address
   */
  getOracleAddress(): string | null {
    return this.oracleAccount?.address || null;
  }

  /**
   * Check oracle balance
   */
  async getOracleBalance(): Promise<string> {
    if (!this.oracleAccount) return '0';
    
    const balance = await this.publicClient.getBalance({
      address: this.oracleAccount.address,
    });
    
    return balance?.toString() || '0';
  }

  /**
   * Check if oracle is properly configured and funded
   */
  async isReady(): Promise<{ ready: boolean; error?: string }> {
    if (!this.oracleAccount) {
      return { ready: false, error: 'Oracle private key not configured' };
    }

    try {
      const balance = await this.publicClient.getBalance({
        address: this.oracleAccount.address,
      });

      if (!balance) {
        return { ready: false, error: 'Failed to get balance' };
      }

      // Need at least 0.001 ETH for gas
      if (balance < parseEther('0.001')) {
        return { ready: false, error: 'Oracle wallet has insufficient balance for gas' };
      }

      return { ready: true };
    } catch (error) {
      return { ready: false, error: 'Failed to check oracle balance' };
    }
  }
}

export const oracleService = new OracleService();
export default oracleService;
