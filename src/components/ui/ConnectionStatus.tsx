import { memo, useEffect, type ReactElement } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

interface IConnectionStatusProps {
  showOnlineIndicator?: boolean;
}

/**
 * ConnectionStatus displays the current connection state.
 * Shows an offline indicator when disconnected and optionally
 * shows a reconnection toast when coming back online.
 */
export const ConnectionStatus = memo(
  ({ showOnlineIndicator = false }: IConnectionStatusProps): ReactElement | null => {
    const { isOnline, wasOffline, clearOfflineFlag } = useConnectionStatus();

    // Clear the offline flag after showing reconnection message
    useEffect(() => {
      if (isOnline && wasOffline) {
        const timer = setTimeout(() => {
          clearOfflineFlag();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [isOnline, wasOffline, clearOfflineFlag]);

    // Show reconnection message
    if (isOnline && wasOffline) {
      return (
        <div className='fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg animate-in slide-in-from-bottom-2'>
          <Wifi className='h-4 w-4' />
          <span className='text-sm font-medium'>Back online</span>
        </div>
      );
    }

    // Show offline indicator
    if (!isOnline) {
      return (
        <div className='fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg shadow-lg animate-in slide-in-from-bottom-2'>
          <WifiOff className='h-4 w-4' />
          <span className='text-sm font-medium'>Offline - Changes will sync when reconnected</span>
        </div>
      );
    }

    // Optionally show online indicator
    if (showOnlineIndicator) {
      return (
        <div className='flex items-center gap-1.5 text-green-500'>
          <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
          <span className='text-xs font-medium'>Online</span>
        </div>
      );
    }

    return null;
  }
);

ConnectionStatus.displayName = 'ConnectionStatus';
