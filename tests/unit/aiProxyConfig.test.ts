import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getProviderAndKey } from '../../server/ai-proxy-config';

describe('server ai-proxy-config getProviderAndKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null when no AI API key is set', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.VITE_GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.VITE_GROQ_API_KEY;
    expect(getProviderAndKey()).toBeNull();
  });

  it('returns config with Gemini base URL when VITE_GEMINI_API_KEY is set', () => {
    process.env.VITE_AI_PROVIDER = 'gemini';
    process.env.VITE_GEMINI_API_KEY = 'gemini-key';
    const config = getProviderAndKey();
    expect(config).not.toBeNull();
    expect(config?.apiKey).toBe('gemini-key');
    expect(config?.baseURL).toContain('generativelanguage.googleapis.com');
  });

  it('returns config with Groq base URL when GROQ_API_KEY is set and provider is groq', () => {
    process.env.VITE_AI_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'groq-key';
    const config = getProviderAndKey();
    expect(config).not.toBeNull();
    expect(config?.apiKey).toBe('groq-key');
    expect(config?.baseURL).toContain('api.groq.com');
  });

  it('returns config when VITE_GROQ_API_KEY is set (default provider uses Gemini keys first)', () => {
    process.env.VITE_GROQ_API_KEY = 'fallback-key';
    const config = getProviderAndKey();
    expect(config).not.toBeNull();
    expect(config?.apiKey).toBe('fallback-key');
  });
});
