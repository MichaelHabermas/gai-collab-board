/**
 * Shared AI proxy config: provider/key resolution and base URL.
 * Used by the Render proxy server.
 */

export const GROQ_BASE = 'https://api.groq.com/openai';

export interface IProxyConfig {
  apiKey: string;
}

/** Resolves Groq API key from env. */
export function getProviderAndKey(env: NodeJS.ProcessEnv = process.env): IProxyConfig | null {
  const groqKey = (env.GROQ_API_KEY ?? env.VITE_GROQ_API_KEY ?? '').trim();
  if (groqKey) {
    return { apiKey: groqKey };
  }
  return null;
}
