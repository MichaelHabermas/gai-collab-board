import OpenAI from 'openai';

/** Proxy base paths to avoid CORS and keep API key server-side. */
const DEV_PROXY_PATH = '/api/ai/v1';
const PROD_PROXY_PATH = '/.netlify/functions/ai-chat/v1';

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

function getProxyBaseURL(): string {
  const path = import.meta.env.DEV ? DEV_PROXY_PATH : PROD_PROXY_PATH;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin + path;
  }
  return path;
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
