import { useState, useEffect } from 'react';
import { subscribeToConnectionStatus } from '@/modules/sync/realtimeService';

interface IUseConnectionStatusReturn {
  isOnline: boolean;
  wasOffline: boolean;
  clearOfflineFlag: () => void;
}

/**
 * Hook for monitoring the connection status to Firebase.
 * Provides current online status and tracks if the user was recently offline.
 */
export const useConnectionStatus = (): IUseConnectionStatusReturn => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToConnectionStatus((connected) => {
      setIsOnline(connected);

      // Track if user was offline (for showing reconnection message)
      if (!connected) {
        setWasOffline(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const clearOfflineFlag = () => setWasOffline(false);

  return {
    isOnline,
    wasOffline,
    clearOfflineFlag,
  };
};
