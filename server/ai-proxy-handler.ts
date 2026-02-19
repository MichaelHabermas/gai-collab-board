/**
 * Shared AI proxy request handler: forwards requests to Groq or NVIDIA.
 * Used by the Render proxy server.
 */

import {
  getProviderAndKey,
  GROQ_BASE,
  SECONDARY_API_BASE,
} from './ai-proxy-config.js';

export interface IProxyResult {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

const FORWARD_HEADERS = ['content-type'];

/**
 * Handles a proxy request: resolves provider, builds upstream URL, forwards request, returns response.
 */
export async function handleProxyRequest(
  method: string,
  pathSuffix: string,
  body: string | undefined,
  requestHeaders: Record<string, string | undefined>
): Promise<IProxyResult> {
  const config = getProviderAndKey();

  if (!config) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        error: {
          message:
            'No AI provider configured. Set GROQ_API_KEY or NVIDIA_API_KEY (and optionally AI_PROVIDER) on the server.',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const path = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`;
  const base = config.provider === 'groq' ? GROQ_BASE : SECONDARY_API_BASE;
  const url = `${base}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };

  for (const name of FORWARD_HEADERS) {
    const value = requestHeaders[name] ?? requestHeaders[name.toLowerCase()];
    if (value) {
      headers[name] = value;
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ?? undefined,
    });
    const responseBody = await res.text();
    return {
      statusCode: res.status,
      body: responseBody,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: { message: `Proxy error: ${message}` } }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
}
