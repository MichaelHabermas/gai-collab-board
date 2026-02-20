/**
 * Shared AI proxy config: provider/key resolution and base URL.
 * Used by the Render proxy server. Single source of truth: @/modules/ai/providerConfig.
 */

import { getActiveAIProviderConfig } from '../src/modules/ai/providerConfig';

export interface IProxyConfig {
  apiKey: string;
  baseURL: string;
}

/** Resolves AI provider, base URL, and API key from env. */
export function getProviderAndKey(env: NodeJS.ProcessEnv = process.env): IProxyConfig | null {
  const envRecord: Record<string, string | undefined> = env;
  const { baseURL, apiKey } = getActiveAIProviderConfig(envRecord);
  if (apiKey) {
    return { apiKey, baseURL };
  }
  return null;
}
