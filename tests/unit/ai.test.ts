import { describe, it, expect } from 'vitest';
import { getProxyBaseURLFromEnv } from '@/lib/ai';

describe('getProxyBaseURLFromEnv', () => {
  it('uses VITE_AI_PROXY_URL when set (full URL)', () => {
    expect(
      getProxyBaseURLFromEnv(
        { DEV: false, VITE_AI_PROXY_URL: 'https://my-proxy.example.com/v1' },
        'https://app.example.com'
      )
    ).toBe('https://my-proxy.example.com/v1');
  });

  it('ignores origin when VITE_AI_PROXY_URL is set', () => {
    expect(
      getProxyBaseURLFromEnv(
        { DEV: false, VITE_AI_PROXY_URL: 'https://proxy.render.com/ai/v1' },
        undefined
      )
    ).toBe('https://proxy.render.com/ai/v1');
  });

  it('uses origin + VITE_AI_PROXY_PATH in production when path is set', () => {
    expect(
      getProxyBaseURLFromEnv(
        { DEV: false, VITE_AI_PROXY_PATH: '/.netlify/functions/ai-chat/v1' },
        'https://app.onrender.com'
      )
    ).toBe('https://app.onrender.com/.netlify/functions/ai-chat/v1');
  });

  it('uses origin + default prod path when no URL/path env in production', () => {
    expect(
      getProxyBaseURLFromEnv({ DEV: false }, 'https://app.onrender.com')
    ).toBe('https://app.onrender.com/api/ai/v1');
  });

  it('uses dev path when DEV is true', () => {
    expect(
      getProxyBaseURLFromEnv({ DEV: true }, 'http://localhost:5173')
    ).toBe('http://localhost:5173/api/ai/v1');
  });

  it('returns path only when no origin (e.g. SSR)', () => {
    expect(getProxyBaseURLFromEnv({ DEV: false })).toBe('/api/ai/v1');
    expect(getProxyBaseURLFromEnv({ DEV: true })).toBe('/api/ai/v1');
  });

  it('trims whitespace from VITE_AI_PROXY_URL and VITE_AI_PROXY_PATH', () => {
    expect(
      getProxyBaseURLFromEnv(
        { DEV: false, VITE_AI_PROXY_URL: '  https://proxy.com/v1  ' },
        'https://app.com'
      )
    ).toBe('https://proxy.com/v1');
    expect(
      getProxyBaseURLFromEnv(
        { DEV: false, VITE_AI_PROXY_PATH: '  /custom/path  ' },
        'https://app.com'
      )
    ).toBe('https://app.com/custom/path');
  });
});
