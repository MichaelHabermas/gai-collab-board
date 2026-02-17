/**
 * Quick connection test for the AI proxy (Groq or secondary provider).
 * Usage:
 *   bun run test:ai-connection           — POST to dev proxy (dev server must be running at 5173)
 *   bun run test:ai-connection -- --direct — POST to Groq or secondary provider directly (uses env key)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SECONDARY_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const SECONDARY_MODEL = 'moonshotai/kimi-k2.5';
const SCRIPT_TIMEOUT_MS = 20_000;

function parseArgs(): { direct: boolean } {
  const args = process.argv.slice(2);
  return { direct: args.includes('--direct') };
}

function getDirectConfig(): {
  url: string;
  model: string;
  apiKey: string;
  bodyExtra: Record<string, unknown>;
} | null {
  const groqKey = (process.env.GROQ_API_KEY ?? process.env.VITE_GROQ_API_KEY ?? '').trim();
  const secondaryKey = (process.env.NVIDIA_API_KEY ?? process.env.VITE_NVIDIA_API_KEY ?? '').trim();
  const provider = (process.env.AI_PROVIDER ?? process.env.VITE_AI_PROVIDER ?? '').toLowerCase();

  if (provider === 'nvidia' && secondaryKey !== '') {
    return {
      url: SECONDARY_URL,
      model: SECONDARY_MODEL,
      apiKey: secondaryKey,
      bodyExtra: { thinking: { type: 'disabled' as const } },
    };
  }
  if (groqKey !== '') {
    return {
      url: GROQ_URL,
      model: GROQ_MODEL,
      apiKey: groqKey,
      bodyExtra: {},
    };
  }
  if (secondaryKey !== '') {
    return {
      url: SECONDARY_URL,
      model: SECONDARY_MODEL,
      apiKey: secondaryKey,
      bodyExtra: { thinking: { type: 'disabled' as const } },
    };
  }
  return null;
}

async function run(): Promise<void> {
  const { direct } = parseArgs();

  if (direct) {
    const config = getDirectConfig();
    if (!config) {
      process.stderr.write(
        'Error: --direct requires GROQ_API_KEY/VITE_GROQ_API_KEY or NVIDIA_API_KEY/VITE_NVIDIA_API_KEY (secondary provider) in env.\n'
      );
      process.exit(1);
    }
    const body = {
      model: config.model,
      messages: [{ role: 'user' as const, content: 'Say OK' }],
      max_tokens: 10,
      ...config.bodyExtra,
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
    model: GROQ_MODEL,
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
