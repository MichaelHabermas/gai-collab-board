/**
 * Quick connection test for the AI proxy.
 * Usage:
 *   bun run test:ai-connection           — POST to dev proxy (dev server must be running at 5173)
 *   bun run test:ai-connection -- --direct — POST to provider directly (uses env key)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { getActiveAIProviderConfig } from '../src/modules/ai/providerConfig';
import { recordScriptUsage } from '../server/ai-usage-tracker';

function loadEnv(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
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
}

loadEnv();

const PROXY_URL = 'http://127.0.0.1:5173/api/ai/v1/chat/completions';
const SCRIPT_TIMEOUT_MS = 20_000;

function parseArgs(): { direct: boolean } {
  const args = process.argv.slice(2);
  return { direct: args.includes('--direct') };
}

function getDirectConfig(): {
  url: string;
  model: string;
  apiKey: string;
} | null {
  const env = process.env as Record<string, string | undefined>;
  const { baseURL, model, apiKey } = getActiveAIProviderConfig(env);
  if (apiKey) {
    const url = baseURL.endsWith('/') ? `${baseURL}chat/completions` : `${baseURL}/chat/completions`;
    return { url, model, apiKey };
  }
  return null;
}

function getModelFromEnv(): string {
  const env = process.env as Record<string, string | undefined>;
  return getActiveAIProviderConfig(env).model;
}

async function run(): Promise<void> {
  const { direct } = parseArgs();

  if (direct) {
    const config = getDirectConfig();
    if (!config) {
      process.stderr.write(
        'Error: --direct requires an AI API key (GEMINI_API_KEY, VITE_GEMINI_API_KEY, GROQ_API_KEY, or VITE_GROQ_API_KEY).\n'
      );
      process.exit(1);
    }
    const body = {
      model: config.model,
      messages: [{ role: 'user' as const, content: 'Say OK' }],
      max_tokens: 10,
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCRIPT_TIMEOUT_MS);
    const start = Date.now();
    try {
      const res = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const elapsed = Date.now() - start;
      const text = await res.text();
      if (!res.ok) {
        process.stderr.write(`Error: ${res.status} ${res.statusText}\n${text.slice(0, 500)}\n`);
        process.exit(1);
      }
      const parsed = JSON.parse(text) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = parsed?.choices?.[0]?.message?.content ?? '(no content)';
      try {
        recordScriptUsage({
          script_name: 'test-ai-connection',
          mode: 'direct',
          response_body: text,
          target_url: config.url,
          model: config.model,
        });
      } catch {
        // Usage tracking must not fail connectivity checks.
      }
      process.stdout.write(`OK (${elapsed}ms) — ${content}\n`);
      process.exit(0);
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : String(err);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      process.stderr.write(`Error: ${isAbort ? 'timeout' : message}\n`);
      process.exit(1);
    }
  }

  const body = {
    model: getModelFromEnv(),
    messages: [{ role: 'user' as const, content: 'Say OK' }],
    max_tokens: 10,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRIPT_TIMEOUT_MS);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const start = Date.now();
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const elapsed = Date.now() - start;
    const text = await res.text();

    if (!res.ok) {
      process.stderr.write(`Error: ${res.status} ${res.statusText}\n${text.slice(0, 500)}\n`);
      process.exit(1);
    }

    let parsed: { choices?: Array<{ message?: { content?: string } }> };
    try {
      parsed = JSON.parse(text) as typeof body & {
        choices?: Array<{ message?: { content?: string } }>;
      };
    } catch {
      process.stderr.write(`Error: invalid JSON response\n${text.slice(0, 300)}\n`);
      process.exit(1);
    }

    const content = parsed?.choices?.[0]?.message?.content ?? '(no content)';
    try {
      recordScriptUsage({
        script_name: 'test-ai-connection',
        mode: 'proxy',
        response_body: text,
        target_url: PROXY_URL,
        model: getModelFromEnv(),
      });
    } catch {
      // Usage tracking must not fail connectivity checks.
    }
    process.stdout.write(`OK (${elapsed}ms) — ${content}\n`);
    process.exit(0);
  } catch (err) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    process.stderr.write(`Error after ${elapsed}ms: ${isAbort ? 'timeout' : message}\n`);
    process.exit(1);
  }
}

run();
