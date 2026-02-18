import OpenAI from 'openai';

/** Proxy base paths to avoid CORS and keep API key server-side. */
const DEV_PROXY_PATH = '/api/ai/v1';
/** Default production path (Render-friendly); Netlify users can set VITE_AI_PROXY_PATH. */
const DEFAULT_PROD_PROXY_PATH = '/api/ai/v1';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const SECONDARY_MODEL = 'moonshotai/kimi-k2.5';

export type AIProvider = 'groq' | 'nvidia';

function resolveProvider(): AIProvider {
  const configured = (import.meta.env.VITE_AI_PROVIDER ?? '').toLowerCase();
  if (configured === 'nvidia' && import.meta.env.VITE_NVIDIA_API_KEY) {
    return 'nvidia';
  }

  if (configured === 'groq' || import.meta.env.VITE_GROQ_API_KEY) {
    return 'groq';
  }

  if (import.meta.env.VITE_NVIDIA_API_KEY) {
    return 'nvidia';
  }

  return 'groq';
}

export interface IAIProxyEnv {
  DEV?: boolean;
  VITE_AI_PROXY_URL?: string;
  VITE_AI_PROXY_PATH?: string;
}

/** Resolves AI proxy base URL from env (testable). */
export function getProxyBaseURLFromEnv(env: IAIProxyEnv, origin?: string): string {
  const proxyUrl = (env.VITE_AI_PROXY_URL ?? '').trim();
  if (proxyUrl) {
    return proxyUrl;
  }

  const path = env.DEV
    ? DEV_PROXY_PATH
    : (env.VITE_AI_PROXY_PATH ?? '').trim() || DEFAULT_PROD_PROXY_PATH;

  if (origin) {
    return origin + path;
  }

  return path;
}

function getProxyBaseURL(): string {
  const env: IAIProxyEnv = {
    DEV: import.meta.env.DEV,
    VITE_AI_PROXY_URL: import.meta.env.VITE_AI_PROXY_URL,
    VITE_AI_PROXY_PATH: import.meta.env.VITE_AI_PROXY_PATH,
  };
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined;
  return getProxyBaseURLFromEnv(env, origin);
}

export const createAIClient = (): OpenAI => {
  const baseURL = getProxyBaseURL();
  const apiKey = 'proxy'; /* Proxy injects the real key; client does not send it */

  return new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });
};

export const aiClient = createAIClient();

const provider = resolveProvider();

export const AI_CONFIG = {
  provider,
  model: provider === 'groq' ? GROQ_MODEL : SECONDARY_MODEL,
  maxTokens: 4096,
  temperature: 0.3,
  topP: 0.9,
} as const;
