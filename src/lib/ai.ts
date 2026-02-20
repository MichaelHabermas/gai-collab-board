import { getProviderFromEnv, getModelForProvider } from '@/modules/ai/providerConfig';

/** Proxy base paths to avoid CORS and keep API key server-side. */
const DEV_PROXY_PATH = '/api/ai/v1';
/** Default production path (Render). Set VITE_AI_PROXY_PATH to override. */
const DEFAULT_PROD_PROXY_PATH = '/api/ai/v1';

export interface IAIProxyEnv {
  DEV?: boolean;
  VITE_AI_PROXY_URL?: string;
  VITE_AI_PROXY_PATH?: string;
  VITE_AI_PROVIDER?: string;
}

/** Resolves AI proxy base URL from env (testable). In dev, always use same-origin proxy to avoid CORS. */
export function getProxyBaseURLFromEnv(env: IAIProxyEnv, origin?: string): string {
  if (env.DEV) {
    const path = DEV_PROXY_PATH;
    if (origin) {
      return origin + path;
    }

    return path;
  }

  const proxyUrl = (env.VITE_AI_PROXY_URL ?? '').trim();
  if (proxyUrl) {
    return proxyUrl;
  }

  const path = (env.VITE_AI_PROXY_PATH ?? '').trim() || DEFAULT_PROD_PROXY_PATH;
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

function getAIModel(): string {
  const env: Record<string, string | undefined> = {
    VITE_AI_PROVIDER: import.meta.env.VITE_AI_PROVIDER,
  };
  const provider = getProviderFromEnv(env);
  return getModelForProvider(provider);
}

/** Lazily-loaded OpenAI client singleton. The `openai` module (102KB) is
 *  dynamically imported on first call so it never blocks the initial bundle. */
let _aiClient: InstanceType<typeof import('openai').default> | null = null;

export const getAIClient = async (): Promise<InstanceType<typeof import('openai').default>> => {
  if (!_aiClient) {
    const { default: OpenAI } = await import('openai');
    const baseURL = getProxyBaseURL();

    _aiClient = new OpenAI({
      apiKey: 'proxy', /* Proxy injects the real key; client does not send it */
      baseURL,
      dangerouslyAllowBrowser: true,
      maxRetries: 0,
    });
  }

  return _aiClient;
};

export const AI_CONFIG = {
  model: getAIModel(),
  maxTokens: 4096,
  temperature: 0.3,
  topP: 0.9,
} as const;
