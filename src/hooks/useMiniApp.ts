import { useEffect, useState, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';

export interface MiniAppContext {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  client?: {
    clientFid: number;
    added: boolean;
  };
}

export interface UseMiniAppReturn {
  context: MiniAppContext | null;
  isReady: boolean;
  isInFrame: boolean;
  error: string | null;
  close: () => void;
  openUrl: (url: string) => void;
}

export function useMiniApp(): UseMiniAppReturn {
  const [context, setContext] = useState<MiniAppContext | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInFrame, setIsInFrame] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initMiniApp = async () => {
      try {
        // Check if we're in a Farcaster frame
        const inFrame = typeof window !== 'undefined' && window.parent !== window;
        setIsInFrame(inFrame);

        if (inFrame) {
          // Get context from SDK
          const frameContext = await sdk.context;
          
          if (frameContext) {
            setContext({
              user: frameContext.user ? {
                fid: frameContext.user.fid,
                username: frameContext.user.username,
                displayName: frameContext.user.displayName,
                pfpUrl: frameContext.user.pfpUrl,
              } : undefined,
              client: frameContext.client ? {
                clientFid: frameContext.client.clientFid,
                added: frameContext.client.added,
              } : undefined,
            });
          }

          // Signal that the app is ready
          sdk.actions.ready();
        } else {
          // Development mode - create mock context
          console.warn('Not in Farcaster frame, using mock context');
          setContext({
            user: {
              fid: 1,
              username: 'dev_user',
              displayName: 'Developer',
            },
          });
        }

        setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize Mini App:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsReady(true); // Still set ready so app can show error state
      }
    };

    initMiniApp();
  }, []);

  const close = useCallback(() => {
    if (isInFrame) {
      sdk.actions.close();
    }
  }, [isInFrame]);

  const openUrl = useCallback((url: string) => {
    if (isInFrame) {
      sdk.actions.openUrl(url);
    } else {
      window.open(url, '_blank');
    }
  }, [isInFrame]);

  return {
    context,
    isReady,
    isInFrame,
    error,
    close,
    openUrl,
  };
}

export default useMiniApp;
