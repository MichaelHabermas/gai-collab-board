import { describe, it, expect } from 'vitest';
import {
  getProviderFromEnv,
  getBaseURLForProvider,
  getModelForProvider,
  getApiKeyForProvider,
  getActiveAIProviderConfig,
  AI_PROVIDER_GEMINI,
  AI_PROVIDER_GROQ,
  AI_MODEL_GEMINI,
} from '@/modules/ai/providerConfig';

describe('providerConfig', () => {
  describe('getProviderFromEnv', () => {
    it('returns gemini when VITE_AI_PROVIDER is gemini', () => {
      expect(getProviderFromEnv({ VITE_AI_PROVIDER: 'gemini' })).toBe(AI_PROVIDER_GEMINI);
      expect(getProviderFromEnv({ VITE_AI_PROVIDER: 'GEMINI' })).toBe(AI_PROVIDER_GEMINI);
    });

    it('returns groq when VITE_AI_PROVIDER is groq', () => {
      expect(getProviderFromEnv({ VITE_AI_PROVIDER: 'groq' })).toBe(AI_PROVIDER_GROQ);
    });

    it('returns groq when AI_PROVIDER is groq (server/Render fallback)', () => {
      expect(getProviderFromEnv({ AI_PROVIDER: 'groq' })).toBe(AI_PROVIDER_GROQ);
      expect(getProviderFromEnv({ AI_PROVIDER: 'GROQ' })).toBe(AI_PROVIDER_GROQ);
    });

    it('prefers VITE_AI_PROVIDER over AI_PROVIDER', () => {
      expect(
        getProviderFromEnv({ VITE_AI_PROVIDER: 'gemini', AI_PROVIDER: 'groq' })
      ).toBe(AI_PROVIDER_GEMINI);
    });

    it('returns default (gemini) when VITE_AI_PROVIDER is empty or unknown', () => {
      expect(getProviderFromEnv({})).toBe(AI_PROVIDER_GEMINI);
      expect(getProviderFromEnv({ VITE_AI_PROVIDER: '' })).toBe(AI_PROVIDER_GEMINI);
      expect(getProviderFromEnv({ VITE_AI_PROVIDER: 'other' })).toBe(AI_PROVIDER_GEMINI);
    });
  });

  describe('getBaseURLForProvider', () => {
    it('returns Gemini base URL for gemini', () => {
      expect(getBaseURLForProvider(AI_PROVIDER_GEMINI)).toContain('generativelanguage.googleapis.com');
    });

    it('returns Groq base URL for groq', () => {
      expect(getBaseURLForProvider(AI_PROVIDER_GROQ)).toContain('api.groq.com');
    });
  });

  describe('getModelForProvider', () => {
    it('returns gemini-2.0-flash for gemini', () => {
      expect(getModelForProvider(AI_PROVIDER_GEMINI)).toBe(AI_MODEL_GEMINI);
    });

    it('returns llama model for groq', () => {
      expect(getModelForProvider(AI_PROVIDER_GROQ)).toMatch(/llama/);
    });
  });

  describe('getApiKeyForProvider', () => {
    it('returns agnostic key first for any provider (VITE_AI_API_KEY or AI_API_KEY)', () => {
      expect(
        getApiKeyForProvider({ VITE_AI_API_KEY: 'agnostic' }, AI_PROVIDER_GEMINI)
      ).toBe('agnostic');
      expect(
        getApiKeyForProvider({ VITE_AI_API_KEY: 'agnostic' }, AI_PROVIDER_GROQ)
      ).toBe('agnostic');
      expect(getApiKeyForProvider({ AI_API_KEY: 'server-key' }, AI_PROVIDER_GEMINI)).toBe(
        'server-key'
      );
      expect(
        getApiKeyForProvider(
          { AI_API_KEY: 'a', VITE_AI_API_KEY: 'b', GEMINI_API_KEY: 'c' },
          AI_PROVIDER_GEMINI
        )
      ).toBe('a');
    });

    it('falls back to provider-specific keys when agnostic unset', () => {
      expect(getApiKeyForProvider({ GEMINI_API_KEY: 'key1' }, AI_PROVIDER_GEMINI)).toBe('key1');
      expect(getApiKeyForProvider({ VITE_GEMINI_API_KEY: 'key2' }, AI_PROVIDER_GEMINI)).toBe('key2');
      expect(
        getApiKeyForProvider(
          { GEMINI_API_KEY: 'a', VITE_GEMINI_API_KEY: 'b' },
          AI_PROVIDER_GEMINI
        )
      ).toBe('a');
      expect(getApiKeyForProvider({ GROQ_API_KEY: 'gkey' }, AI_PROVIDER_GROQ)).toBe('gkey');
    });

    it('returns empty string when no key set', () => {
      expect(getApiKeyForProvider({}, AI_PROVIDER_GEMINI)).toBe('');
      expect(getApiKeyForProvider({}, AI_PROVIDER_GROQ)).toBe('');
    });
  });

  describe('getActiveAIProviderConfig', () => {
    it('returns provider, baseURL, model, and apiKey from env', () => {
      const env = {
        VITE_AI_PROVIDER: 'gemini',
        VITE_GEMINI_API_KEY: 'test-key',
      };
      const config = getActiveAIProviderConfig(env);
      expect(config.provider).toBe(AI_PROVIDER_GEMINI);
      expect(config.baseURL).toContain('generativelanguage.googleapis.com');
      expect(config.model).toBe(AI_MODEL_GEMINI);
      expect(config.apiKey).toBe('test-key');
    });

    it('returns groq config when provider is groq and key set', () => {
      const env = { VITE_AI_PROVIDER: 'groq', GROQ_API_KEY: 'gkey' };
      const config = getActiveAIProviderConfig(env);
      expect(config.provider).toBe(AI_PROVIDER_GROQ);
      expect(config.baseURL).toContain('groq.com');
      expect(config.apiKey).toBe('gkey');
    });

    it('returns empty apiKey when no key in env', () => {
      const config = getActiveAIProviderConfig({ VITE_AI_PROVIDER: 'gemini' });
      expect(config.apiKey).toBe('');
    });
  });
});
