/**
 * Shared AI proxy request handler: forwards requests to the configured AI provider.
 * Used by the Render proxy server.
 */

import { getProviderAndKey } from './ai-proxy-config.js';
import { recordRuntimeProxyUsage, extractUsageFromResponseBody } from './ai-usage-tracker.js';
import { getLangfuse } from './langfuse.js';

export interface IProxyResult {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

const FORWARD_HEADERS = ['content-type'];

const NO_PROVIDER_MESSAGE =
  'No AI provider configured. Set AI_API_KEY or VITE_AI_API_KEY (or provider-specific GEMINI_API_KEY / GROQ_API_KEY) on the server.';

/**
 * Handles a proxy request: resolves provider key and base URL, forwards request, returns response.
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
        error: { message: NO_PROVIDER_MESSAGE },
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  let path = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`;
  if (config.baseURL.includes('generativelanguage.googleapis.com')) {
    path = path.replace(/^\/v1/, '') || '/';
  }
  const url = `${config.baseURL}${path}`;

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
    if (res.status === 429 || res.status >= 400) {
      process.stderr.write(
        `[AI proxy] upstream ${res.status} ${res.statusText}: ${responseBody.slice(0, 500)}${responseBody.length > 500 ? '...' : ''}\n`
      );
    }
    const requestModel = parseModelFromRequestBody(body);
    try {
      await recordRuntimeProxyUsage({
        response_body: responseBody,
        status_code: res.status,
        path_suffix: pathSuffix,
        provider_base_url: config.baseURL,
        model: requestModel,
      });
    } catch {
      // Never fail proxy requests due to tracking failures.
    }

    try {
      recordLangfuseGeneration(body, responseBody, requestModel, pathSuffix, res.status);
    } catch {
      // Langfuse failures must never break the proxy.
    }

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

/** Record a Langfuse generation span for the AI proxy call. Fire-and-forget. */
function recordLangfuseGeneration(
  requestBody: string | undefined,
  responseBody: string,
  model: string | undefined,
  pathSuffix: string,
  statusCode: number
): void {
  const langfuse = getLangfuse();
  if (!langfuse) {
    return;
  }

  const usage = extractUsageFromResponseBody(responseBody);

  let parsedInput: unknown;
  try {
    parsedInput = requestBody ? JSON.parse(requestBody) : undefined;
  } catch {
    parsedInput = requestBody;
  }

  let parsedOutput: unknown;
  try {
    parsedOutput = JSON.parse(responseBody);
  } catch {
    parsedOutput = responseBody;
  }

  const trace = langfuse.trace({
    name: 'ai-board-command',
    metadata: { pathSuffix, statusCode },
    tags: ['collabboard', 'proxy'],
  });

  trace.generation({
    name: model ?? 'unknown',
    model: model ?? undefined,
    input: parsedInput,
    output: parsedOutput,
    usage: usage
      ? {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.total_tokens,
        }
      : undefined,
    level: statusCode >= 400 ? 'ERROR' : 'DEFAULT',
    statusMessage: statusCode >= 400 ? `HTTP ${statusCode}` : undefined,
  });
}

function parseModelFromRequestBody(body: string | undefined): string | undefined {
  if (!body) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(body);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'model' in parsed &&
      typeof parsed.model === 'string' &&
      parsed.model.trim() !== ''
    ) {
      return parsed.model;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
