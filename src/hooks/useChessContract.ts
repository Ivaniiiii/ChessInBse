import { useCallback, useMemo } from 'react';
import { 
  useWriteContract, 
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
  useBalance,
  useConnect,
} from 'wagmi';
import { parseEther, formatEther, keccak256, toHex } from 'viem';
import { base } from 'wagmi/chains';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
import { CHESS_ESCROW_ABI, ContractGame, GameState } from '../contracts/ChessEscrowABI';
import { CHESS_ESCROW_ADDRESS } from '../providers/Web3Provider';

// Generate a unique game ID from a string
export function generateGameId(seed: string): `0x${string}` {
  return keccak256(toHex(seed));
}

// Hook for wallet connection
export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { data: balance } = useBalance({
    address,
    chainId: base.id,
  });

  const connectWallet = useCallback(() => {
    const farcasterConnector = connectors.find(c => c.id === 'farcasterFrame');
    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  }, [connect, connectors]);

  return {
    address,
    isConnected,
    isConnecting,
    balance: balance ? formatEther(balance.value) : '0',
    balanceRaw: balance?.value ?? BigInt(0),
    connectWallet,
  };
}

// Hook for reading contract data
export function useContractData() {
  const { data: minBet } = useReadContract({
    address: CHESS_ESCROW_ADDRESS,
    abi: CHESS_ESCROW_ABI,
    functionName: 'minBetAmount',
    chainId: base.id,
  });

  const { data: maxBet } = useReadContract({
    address: CHESS_ESCROW_ADDRESS,
    abi: CHESS_ESCROW_ABI,
    functionName: 'maxBetAmount',
    chainId: base.id,
  });

  const { data: commission } = useReadContract({
    address: CHESS_ESCROW_ADDRESS,
    abi: CHESS_ESCROW_ABI,
    functionName: 'commissionBps',
    chainId: base.id,
  });

  const { data: availableGames, refetch: refetchGames } = useReadContract({
    address: CHESS_ESCROW_ADDRESS,
    abi: CHESS_ESCROW_ABI,
    functionName: 'getAvailableGames',
    chainId: base.id,
  });

  return {
    minBet: minBet ? formatEther(minBet) : '0.0001',
    maxBet: maxBet ? formatEther(maxBet) : '10',
    commissionPercent: commission ? Number(commission) / 100 : 5,
    availableGames: (availableGames as ContractGame[] | undefined) ?? [],
    refetchGames,
  };
}

// Hook for getting a specific game
export function useGame(gameId: `0x${string}` | undefined) {
  const { data: game, refetch } = useReadContract({
    address: CHESS_ESCROW_ADDRESS,
    abi: CHESS_ESCROW_ABI,
    functionName: 'getGame',
    args: gameId ? [gameId] : undefined,
    chainId: base.id,
    query: {
      enabled: !!gameId,
    },
  });

  return {
    game: game as ContractGame | undefined,
    refetch,
  };
}

// Hook for creating a game
export function useCreateGame() {
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error,
    reset,
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

  const createGame = useCallback((gameId: `0x${string}`, betAmountEth: string) => {
    writeContract({
      address: CHESS_ESCROW_ADDRESS,
      abi: CHESS_ESCROW_ABI,
      functionName: 'createGame',
      args: [gameId],
      value: parseEther(betAmountEth),
      chainId: base.id,
    });
  }, [writeContract]);

  return {
    createGame,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    receipt,
    error,
    reset,
  };
}

// Hook for joining a game
export function useJoinGame() {
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error,
    reset,
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

  const joinGame = useCallback((gameId: `0x${string}`, betAmountWei: bigint) => {
    writeContract({
      address: CHESS_ESCROW_ADDRESS,
      abi: CHESS_ESCROW_ABI,
      functionName: 'joinGame',
      args: [gameId],
      value: betAmountWei,
      chainId: base.id,
    });
  }, [writeContract]);

  return {
    joinGame,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    receipt,
    error,
    reset,
  };
}

// Hook for canceling a game
export function useCancelGame() {
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error,
    reset,
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash });

  const cancelGame = useCallback((gameId: `0x${string}`) => {
    writeContract({
      address: CHESS_ESCROW_ADDRESS,
      abi: CHESS_ESCROW_ABI,
      functionName: 'cancelGame',
      args: [gameId],
      chainId: base.id,
    });
  }, [writeContract]);

  return {
    cancelGame,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}

// Combined hook for all chess contract interactions
export function useChessContract() {
  const wallet = useWallet();
  const contractData = useContractData();
  const createGameHook = useCreateGame();
  const joinGameHook = useJoinGame();
  const cancelGameHook = useCancelGame();

  return {
    // Wallet
    ...wallet,
    
    // Contract data
    ...contractData,
    
    // Actions
    createGame: createGameHook,
    joinGame: joinGameHook,
    cancelGame: cancelGameHook,
    
    // Helpers
    generateGameId,
    GameState,
  };
}

export default useChessContract;
