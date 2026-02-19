/**
 * Shared AI proxy config: provider/key resolution and base URLs.
 * Used by the Render proxy server.
 */

export const GROQ_BASE = 'https://api.groq.com/openai';
export const SECONDARY_API_BASE = 'https://integrate.api.nvidia.com';

export type AIProvider = 'groq' | 'nvidia';

export interface IProxyConfig {
  provider: AIProvider;
  apiKey: string;
}

/** Resolves AI provider and API key from env. */
export function getProviderAndKey(env: NodeJS.ProcessEnv = process.env): IProxyConfig | null {
  const configured = (env.AI_PROVIDER ?? '').toLowerCase() as AIProvider | '';
  const groqKey = (env.GROQ_API_KEY ?? env.VITE_GROQ_API_KEY ?? '').trim();
  const secondaryKey = (env.NVIDIA_API_KEY ?? env.VITE_NVIDIA_API_KEY ?? '').trim();

  if (configured === 'nvidia' && secondaryKey) {
    return { provider: 'nvidia', apiKey: secondaryKey };
  }
  if (configured === 'groq' && groqKey) {
    return { provider: 'groq', apiKey: groqKey };
  }
  if (groqKey) {
    return { provider: 'groq', apiKey: groqKey };
  }
  if (secondaryKey) {
    return { provider: 'nvidia', apiKey: secondaryKey };
  }
  return null;
}
