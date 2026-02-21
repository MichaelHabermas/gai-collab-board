/**
 * Tests for main.tsx entry point: bootstrap calls createFirestoreBoardRepo,
 * initRepository, initWriteQueue, and createRoot.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { createFirestoreBoardRepo } from '@/modules/sync/firestoreBoardRepo';
import { createRealtimeSyncRepo } from '@/modules/sync/realtimeSyncRepo';
import { initRepository } from '@/lib/repositoryProvider';
import { initWriteQueue } from '@/lib/writeQueue';

const mockRender = vi.fn();

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: mockRender })),
}));

vi.mock('@/modules/sync/firestoreBoardRepo', () => ({
  createFirestoreBoardRepo: vi.fn(() => ({})),
}));

vi.mock('@/modules/sync/realtimeSyncRepo', () => ({
  createRealtimeSyncRepo: vi.fn(() => ({})),
}));

vi.mock('@/lib/repositoryProvider', () => ({
  initRepository: vi.fn(),
}));

vi.mock('@/lib/writeQueue', () => ({
  initWriteQueue: vi.fn(),
}));

vi.mock('@/index.css', () => ({}));

describe('main entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const rootEl = document.createElement('div');
    rootEl.id = 'root';
    vi.spyOn(document, 'getElementById').mockReturnValue(rootEl);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls createFirestoreBoardRepo, initRepository, initWriteQueue and createRoot when root exists', async () => {
    await import('@/main');

    expect(createFirestoreBoardRepo).toHaveBeenCalledTimes(1);
    expect(createRealtimeSyncRepo).toHaveBeenCalledTimes(1);
    expect(initRepository).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything()
    );
    expect(initWriteQueue).toHaveBeenCalledWith(expect.anything());
    expect(createRoot).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledTimes(1);
  });
});