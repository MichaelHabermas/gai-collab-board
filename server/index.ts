/**
 * Minimal AI proxy server for Render (or any Node host).
 * Serves POST /api/ai/v1/* by forwarding to Groq or NVIDIA with server-side API key.
 *
 * Run: PORT=3001 bun run server/index.ts
 * Or:  set PORT=3001 && bun run server/index.ts (Windows)
 *
 * Env: GROQ_API_KEY or NVIDIA_API_KEY, optionally AI_PROVIDER=groq|nvidia
 */

import { createServer } from 'http';
import { handleProxyRequest } from './ai-proxy-handler.js';

const PORT = Number(process.env.PORT ?? 3001);
const PREFIX = '/api/ai/v1';

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  if (!url.startsWith(PREFIX) || method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
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

  res.writeHead(result.statusCode, result.headers);
  res.end(result.body);
});

server.listen(PORT, () => {
  process.stdout.write(`AI proxy listening on port ${PORT} (path ${PREFIX})\n`);
});
