/**
 * Single source of truth for AI provider: IDs, base URLs, default models, and env key resolution.
 * Consumed by frontend (src/lib/ai.ts), Vite dev proxy (vite.config.ts), server proxy (server/ai-proxy-config.ts), and scripts.
 * All functions accept an env object so they work in browser (import.meta.env) and Node (process.env).
 */

export const AI_PROVIDER_GEMINI = 'gemini';
export const AI_PROVIDER_GROQ = 'groq';

/** Default model IDs per provider. Change here to switch models. */
export const AI_MODEL_GEMINI = 'gemini-2.5-flash';
export const AI_MODEL_GROQ = 'llama-3.3-70b-versatile';

export type AIProviderId = typeof AI_PROVIDER_GEMINI | typeof AI_PROVIDER_GROQ;

export const AI_PROVIDER_DEFAULTS: Record<
  AIProviderId,
  { baseURL: string; model: string; envKeyNames: readonly string[] }
> = {
  [AI_PROVIDER_GEMINI]: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: AI_MODEL_GEMINI,
    envKeyNames: ['GEMINI_API_KEY', 'VITE_GEMINI_API_KEY'],
  },
  [AI_PROVIDER_GROQ]: {
    baseURL: 'https://api.groq.com/openai',
    model: AI_MODEL_GROQ,
    envKeyNames: ['GROQ_API_KEY', 'VITE_GROQ_API_KEY'],
  },
};

const DEFAULT_PROVIDER: AIProviderId = AI_PROVIDER_GEMINI;

/** Resolve provider from env. Prefer VITE_AI_PROVIDER; then AI_PROVIDER (e.g. Render); else default. */
export function getProviderFromEnv(env: Record<string, string | undefined>): AIProviderId {
  const raw = (env.VITE_AI_PROVIDER ?? env.AI_PROVIDER ?? '').trim().toLowerCase();
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

/** Agnostic env key names checked first for any provider (one-stop replacement). */
const AI_AGNOSTIC_KEY_NAMES: readonly string[] = ['AI_API_KEY', 'VITE_AI_API_KEY'];

/** Resolve API key for the given provider from env. Checks agnostic keys first, then provider-specific. */
export function getApiKeyForProvider(
  env: Record<string, string | undefined>,
  provider: AIProviderId
): string {
  for (const key of AI_AGNOSTIC_KEY_NAMES) {
    const value = (env[key] ?? '').trim();
    if (value) {
      return value;
    }
  }
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
