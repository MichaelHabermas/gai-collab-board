import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const GROQ_BASE = 'https://api.groq.com/openai';
const NVIDIA_BASE = 'https://integrate.api.nvidia.com';
const FUNCTION_PATH_PREFIX = '/.netlify/functions/ai-chat';

type AIProvider = 'groq' | 'nvidia';

function getProviderAndKey(): { provider: AIProvider; apiKey: string } | null {
  const configured =
    (process.env.AI_PROVIDER ?? '').toLowerCase() as AIProvider | '';
  const groqKey = process.env.GROQ_API_KEY ?? process.env.VITE_GROQ_API_KEY ?? '';
  const nvidiaKey =
    process.env.NVIDIA_API_KEY ?? process.env.VITE_NVIDIA_API_KEY ?? '';

  if (configured === 'nvidia' && nvidiaKey) {
    return { provider: 'nvidia', apiKey: nvidiaKey };
  }
  if (configured === 'groq' && groqKey) {
    return { provider: 'groq', apiKey: groqKey };
  }
  if (groqKey) {
    return { provider: 'groq', apiKey: groqKey };
  }
  if (nvidiaKey) {
    return { provider: 'nvidia', apiKey: nvidiaKey };
  }
  return null;
}

/** Proxies chat completion requests to Groq or NVIDIA so the key stays server-side and CORS is avoided. */
export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
) => {
  const config = getProviderAndKey();

  if (!config) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        error: {
          message:
            'No AI provider configured. Set GROQ_API_KEY or NVIDIA_API_KEY (and optionally AI_PROVIDER) in Netlify.',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const pathSuffix = event.path.startsWith(FUNCTION_PATH_PREFIX)
    ? event.path.slice(FUNCTION_PATH_PREFIX.length) || '/v1'
    : '/v1';

  const base = config.provider === 'groq' ? GROQ_BASE : NVIDIA_BASE;
  const url = pathSuffix.startsWith('/')
    ? `${base}${pathSuffix}`
    : `${base}/${pathSuffix}`;

  const method = event.httpMethod;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
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
