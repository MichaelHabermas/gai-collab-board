import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { getActiveAIProviderConfig } from '../src/modules/ai/providerConfig';

const DEFAULT_TIMEOUT_MS = 20_000;

const loadEnv = (): void => {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

const normalizeUrl = (url: string): string => {
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const resolveProxyChatUrl = (): string => {
  const explicitUrl = (process.env.AI_PROXY_SMOKE_URL ?? '').trim();
  if (explicitUrl !== '') {
    return explicitUrl;
  }

  const proxyUrl = (process.env.VITE_AI_PROXY_URL ?? '').trim();
  const proxyPath = (process.env.VITE_AI_PROXY_PATH ?? '/api/ai/v1').trim();
  const normalizedPath = proxyPath.startsWith('/') ? proxyPath : `/${proxyPath}`;
  const pathWithEndpoint = normalizedPath.endsWith('/chat/completions')
    ? normalizedPath
    : `${normalizedPath}/chat/completions`;

  if (proxyUrl !== '') {
    return `${normalizeUrl(proxyUrl)}${pathWithEndpoint}`;
  }

  return `http://127.0.0.1:5173${pathWithEndpoint}`;
};

const getTimeoutMs = (): number => {
  const parsed = Number(process.env.AI_PROXY_SMOKE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
};

const run = async (): Promise<void> => {
  loadEnv();

  const env = process.env as Record<string, string | undefined>;
  const defaultModel = getActiveAIProviderConfig(env).model;
  const url = resolveProxyChatUrl();
  const model = (process.env.AI_PROXY_SMOKE_MODEL ?? defaultModel).trim();
  const timeoutMs = getTimeoutMs();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        max_tokens: 16,
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    clearTimeout(timeoutId);

    if (!response.ok) {
      process.stderr.write(`AI proxy smoke failed (${response.status}): ${responseText.slice(0, 400)}\n`);
      process.exit(1);
    }

    let parsedResponse:
      | {
          choices?: Array<{ message?: { content?: string } }>;
        }
      | null = null;
    try {
      parsedResponse = JSON.parse(responseText) as typeof parsedResponse;
    } catch {
      process.stderr.write(`AI proxy smoke failed: response is not valid JSON.\n`);
      process.exit(1);
    }

    const choices = parsedResponse?.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      process.stderr.write(
        'AI proxy smoke failed: unexpected response shape (missing or empty choices array).\n'
      );
      process.exit(1);
    }

    process.stdout.write('AI proxy smoke passed.\n');
  } catch (error) {
    clearTimeout(timeoutId);
    const isAbort = error instanceof Error && error.name === 'AbortError';
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`AI proxy smoke failed: ${isAbort ? 'request timeout' : message}\n`);
    process.exit(1);
  }
};

void run();
