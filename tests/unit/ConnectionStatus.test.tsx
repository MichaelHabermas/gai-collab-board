import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';

const mockClearOfflineFlag = vi.fn();

vi.mock('@/hooks/useConnectionStatus', () => ({
  useConnectionStatus: vi.fn(),
}));

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.mocked(useConnectionStatus).mockReturnValue({
      isOnline: true,
      wasOffline: false,
      clearOfflineFlag: mockClearOfflineFlag,
    });
    mockClearOfflineFlag.mockClear();
  });

  it('returns null when online, not wasOffline, and showOnlineIndicator is false', () => {
    const { container } = render(<ConnectionStatus />);
    expect(container.firstChild).toBeNull();
  });

  it('shows offline indicator when isOnline is false', () => {
    vi.mocked(useConnectionStatus).mockReturnValue({
      isOnline: false,
      wasOffline: false,
      clearOfflineFlag: mockClearOfflineFlag,
    });
    render(<ConnectionStatus />);
    expect(screen.getByText(/Offline - Changes will sync when reconnected/)).toBeInTheDocument();
  });

  it('shows "Back online" when isOnline and wasOffline are true', () => {
    vi.mocked(useConnectionStatus).mockReturnValue({
      isOnline: true,
      wasOffline: true,
      clearOfflineFlag: mockClearOfflineFlag,
    });
    render(<ConnectionStatus />);
    expect(screen.getByText('Back online')).toBeInTheDocument();
  });

  it('shows small Online indicator when showOnlineIndicator is true and online', () => {
    vi.mocked(useConnectionStatus).mockReturnValue({
      isOnline: true,
      wasOffline: false,
      clearOfflineFlag: mockClearOfflineFlag,
    });
    render(<ConnectionStatus showOnlineIndicator />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('prefers reconnection message over online indicator when wasOffline and showOnlineIndicator', () => {
    vi.mocked(useConnectionStatus).mockReturnValue({
      isOnline: true,
      wasOffline: true,
      clearOfflineFlag: mockClearOfflineFlag,
    });
    render(<ConnectionStatus showOnlineIndicator />);
    expect(screen.getByText('Back online')).toBeInTheDocument();
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });
});
