/**
 * Single source of truth for AI provider: IDs, base URLs, default models, and env key resolution.
 * Consumed by frontend (src/lib/ai.ts), Vite dev proxy (vite.config.ts), server proxy (server/ai-proxy-config.ts), and scripts.
 * All functions accept an env object so they work in browser (import.meta.env) and Node (process.env).
 */

export const AI_PROVIDER_GEMINI = 'gemini';
export const AI_PROVIDER_GROQ = 'groq';

export type AIProviderId = typeof AI_PROVIDER_GEMINI | typeof AI_PROVIDER_GROQ;

export const AI_PROVIDER_DEFAULTS: Record<
  AIProviderId,
  { baseURL: string; model: string; envKeyNames: readonly string[] }
> = {
  [AI_PROVIDER_GEMINI]: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    envKeyNames: ['GEMINI_API_KEY', 'VITE_GEMINI_API_KEY', 'VITE_GROQ_API_KEY'],
  },
  [AI_PROVIDER_GROQ]: {
    baseURL: 'https://api.groq.com/openai',
    model: 'llama-3.3-70b-versatile',
    envKeyNames: ['GROQ_API_KEY', 'VITE_GROQ_API_KEY'],
  },
};

const DEFAULT_PROVIDER: AIProviderId = AI_PROVIDER_GEMINI;

/** Resolve provider from env. Prefer VITE_AI_PROVIDER; fallback to default. */
export function getProviderFromEnv(env: Record<string, string | undefined>): AIProviderId {
  const raw = (env.VITE_AI_PROVIDER ?? '').trim().toLowerCase();
  if (raw === AI_PROVIDER_GROQ) {
    return AI_PROVIDER_GROQ;
  }

  if (raw === AI_PROVIDER_GEMINI) {
    return AI_PROVIDER_GEMINI;
  }

  return DEFAULT_PROVIDER;
}

/** Base URL for the given provider (upstream API). */
export function getBaseURLForProvider(provider: AIProviderId): string {
  return AI_PROVIDER_DEFAULTS[provider].baseURL;
}

/** Default model for the given provider. */
export function getModelForProvider(provider: AIProviderId): string {
  return AI_PROVIDER_DEFAULTS[provider].model;
}

/** Resolve API key for the given provider from env (order: envKeyNames). */
export function getApiKeyForProvider(
  env: Record<string, string | undefined>,
  provider: AIProviderId
): string {
  const keys = AI_PROVIDER_DEFAULTS[provider].envKeyNames;
  for (const key of keys) {
    const value = (env[key] ?? '').trim();
    if (value) {
      return value;
    }
  }
  return '';
}

/** Get active provider, base URL, model, and API key from env. Key may be empty if not set. */
export function getActiveAIProviderConfig(env: Record<string, string | undefined>): {
  provider: AIProviderId;
  baseURL: string;
  model: string;
  apiKey: string;
} {
  const provider = getProviderFromEnv(env);
  const apiKey = getApiKeyForProvider(env, provider);
  return {
    provider,
    baseURL: getBaseURLForProvider(provider),
    model: getModelForProvider(provider),
    apiKey,
  };
}
