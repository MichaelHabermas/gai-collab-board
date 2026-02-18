import { describe, it, expect } from 'vitest';
import { getBoardShareLink } from '@/lib/shareLink';

describe('getBoardShareLink', () => {
  it('returns origin and path /board/{boardId}', () => {
    expect(getBoardShareLink('https://app.example.com', 'board-123')).toBe(
      'https://app.example.com/board/board-123'
    );
  });

  it('strips trailing slash from origin', () => {
    expect(getBoardShareLink('https://app.example.com/', 'abc')).toBe(
      'https://app.example.com/board/abc'
    );
  });

  it('works with localhost', () => {
    expect(getBoardShareLink('http://localhost:5173', 'abc-123')).toBe(
      'http://localhost:5173/board/abc-123'
    );
  });
});
