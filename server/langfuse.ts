/**
 * Langfuse observability client for the AI proxy server.
 *
 * Lazy-initialized: returns `null` when env vars are missing (graceful degradation).
 * The proxy continues to work — Langfuse is purely additive observability.
 *
 * Required env vars:
 *   LANGFUSE_SECRET_KEY   — from https://cloud.langfuse.com
 *   LANGFUSE_PUBLIC_KEY   — from https://cloud.langfuse.com
 *   LANGFUSE_BASE_URL     — defaults to https://cloud.langfuse.com
 */

import { Langfuse } from 'langfuse';

let _instance: Langfuse | null | undefined;

/** Returns the Langfuse client, or `null` if keys are not configured. */
export function getLangfuse(): Langfuse | null {
  if (_instance !== undefined) {
    return _instance;
  }

  const secretKey = (process.env.LANGFUSE_SECRET_KEY ?? '').trim();
  const publicKey = (process.env.LANGFUSE_PUBLIC_KEY ?? '').trim();

  if (!secretKey || !publicKey) {
    _instance = null;

    return null;
  }

  _instance = new Langfuse({
    secretKey,
    publicKey,
    baseUrl: (process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com').trim(),
  });

  process.stdout.write('[langfuse] Initialized — traces will be sent to Langfuse cloud.\n');

  return _instance;
}

/** Flush all pending events and shut down. Call on process exit. */
export async function shutdownLangfuse(): Promise<void> {
  if (_instance) {
    await _instance.shutdownAsync();
    _instance = null;
  }
}
