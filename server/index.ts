/**
 * Minimal AI proxy server for Render (or any Node host).
 * Serves POST /api/ai/v1/* by forwarding to Groq with server-side API key.
 *
 * Run: PORT=3001 bun run server/index.ts
 * Or:  set PORT=3001 && bun run server/index.ts (Windows)
 *
 * Env: GROQ_API_KEY
 *      CORS_ALLOWED_ORIGINS (optional, comma-separated) for strict origin allowlist.
 */

import { createServer } from 'http';
import { handleProxyRequest } from './ai-proxy-handler.js';
import { getCorsHeaders } from './cors.js';
import { shutdownLangfuse } from './langfuse.js';

const PORT = Number(process.env.PORT ?? 3001);
const PREFIX = '/api/ai/v1';

function getRequestOrigin(req: { headers: NodeJS.Dict<string | string[]> }): string | undefined {
  const origin = req.headers.origin ?? req.headers.Origin;
  return typeof origin === 'string' ? origin : Array.isArray(origin) ? origin[0] : undefined;
}

function getRequestedHeaders(req: { headers: NodeJS.Dict<string | string[]> }): string | undefined {
  const h = req.headers['access-control-request-headers'] ?? req.headers['Access-Control-Request-Headers'];
  return typeof h === 'string' ? h : Array.isArray(h) ? h[0] : undefined;
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';
  const origin = getRequestOrigin(req);
  const requestedHeaders = getRequestedHeaders(req);
  const cors = getCorsHeaders(origin, requestedHeaders);

  if (!url.startsWith(PREFIX)) {
    res.writeHead(404, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ error: { message: 'Not found' } }));
    return;
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      ...cors,
      'Content-Length': '0',
    });
    res.end();
    return;
  }

  if (method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ error: { message: 'Not found' } }));
    return;
  }

  const afterPrefix = url.slice(PREFIX.length) || '/';
  const pathSuffix = afterPrefix.startsWith('/') ? `/v1${afterPrefix}` : `/v1/${afterPrefix}`;
  const requestHeaders: Record<string, string> = {};
  req.headers['content-type'] && (requestHeaders['content-type'] = String(req.headers['content-type']));

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  const result = await handleProxyRequest(method, pathSuffix, body || undefined, requestHeaders);

  res.writeHead(result.statusCode, { ...result.headers, ...cors });
  res.end(result.body);
});

server.listen(PORT, () => {
  process.stdout.write(`AI proxy listening on port ${PORT} (path ${PREFIX})\n`);
});

/** Flush Langfuse events before exit so no traces are lost. */
async function gracefulShutdown(signal: string): Promise<void> {
  process.stdout.write(`[proxy] ${signal} received — flushing Langfuse...\n`);
  await shutdownLangfuse();
  process.exit(0);
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
