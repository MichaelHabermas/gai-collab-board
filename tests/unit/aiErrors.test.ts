import { describe, it, expect } from 'vitest';
import { normalizeAIErrorMessage, AIError } from '@/modules/ai/errors';

describe('normalizeAIErrorMessage', () => {
  it('returns quota guidance for 429 status', () => {
    const err = new AIError('Too Many Requests', undefined, 429);
    const msg = normalizeAIErrorMessage(err);
    expect(msg).toMatch(/rate limit|quota/);
    expect(msg).toMatch(/provider plan|try again|VITE_AI_PROVIDER/);
  });

  it('returns quota guidance when message contains quota exceeded', () => {
    const msg = normalizeAIErrorMessage(new Error('You exceeded your current quota'));
    expect(msg).toMatch(/quota|rate limit/);
  });

  it('returns proxy 404 guidance for 404 status', () => {
    const err = new AIError('Not Found', undefined, 404);
    const msg = normalizeAIErrorMessage(err);
    expect(msg).toMatch(/404|not found/);
    expect(msg).toMatch(/VITE_AI_API_KEY|restart|dev server/);
  });

  it('returns auth guidance for 401 status', () => {
    const err = new AIError('Unauthorized', undefined, 401);
    const msg = normalizeAIErrorMessage(err);
    expect(msg).toMatch(/API key|invalid|configured/);
    expect(msg).toMatch(/\.env|server/);
  });

  it('returns auth guidance for 403 status', () => {
    const err = new AIError('Forbidden', undefined, 403);
    const msg = normalizeAIErrorMessage(err);
    expect(msg).toMatch(/API key|invalid|configured/);
  });

  it('returns unavailable guidance for 5xx status', () => {
    const err = new AIError('Internal Server Error', undefined, 500);
    const msg = normalizeAIErrorMessage(err);
    expect(msg).toMatch(/temporarily unavailable|Retry/);
  });

  it('returns network guidance for timeout-like message', () => {
    const msg = normalizeAIErrorMessage(new Error('Request timed out'));
    expect(msg).toMatch(/timed out|connection|network|proxy/);
  });

  it('returns network guidance for AbortError', () => {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    const msg = normalizeAIErrorMessage(err);
    expect(msg).toMatch(/timed out|connection|network/);
  });

  it('returns raw message when no classification matches', () => {
    const msg = normalizeAIErrorMessage(new Error('Custom error'));
    expect(msg).toBe('Custom error');
  });

  it('returns generic fallback for empty message', () => {
    const msg = normalizeAIErrorMessage(new Error(''));
    expect(msg).toMatch(/AI request failed|proxy|API key/);
  });

  it('returns generic fallback for non-Error value', () => {
    const msg = normalizeAIErrorMessage(null);
    expect(msg).toMatch(/AI request failed|proxy|API key/);
  });
});
