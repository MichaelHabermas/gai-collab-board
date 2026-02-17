import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const NVIDIA_ORIGIN = 'https://integrate.api.nvidia.com';
const FUNCTION_PATH_PREFIX = '/.netlify/functions/nvidia-chat';

/** Proxies chat completion requests to NVIDIA API so the key stays server-side and CORS is avoided. */
export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
) => {
  const apiKey =
    process.env.NVIDIA_API_KEY ?? process.env.VITE_NVIDIA_API_KEY ?? '';

  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        error: { message: 'NVIDIA API key not configured on server.' },
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const pathSuffix = event.path.startsWith(FUNCTION_PATH_PREFIX)
    ? event.path.slice(FUNCTION_PATH_PREFIX.length) || '/v1'
    : '/v1';
  const url = `${NVIDIA_ORIGIN}${pathSuffix}`;
  const method = event.httpMethod;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const forwardHeaders = ['content-type'];
  for (const name of forwardHeaders) {
    const value = event.headers[name] ?? event.headers[name.toLowerCase()];
    if (value) {
      headers[name] = value;
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: event.body ?? undefined,
    });
    const body = await res.text();
    return {
      statusCode: res.status,
      body,
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
};
