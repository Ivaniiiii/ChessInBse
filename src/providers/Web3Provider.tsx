import React from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';

// Contract address - will be set after deployment
export const CHESS_ESCROW_ADDRESS = (import.meta.env.VITE_CHESS_ESCROW_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Wagmi config with Farcaster Frame connector
const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org'),
  },
  connectors: [
    farcasterFrame(),
  ],
});

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
    },
  },
});

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export { config };
export default Web3Provider;
