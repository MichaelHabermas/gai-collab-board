export class AIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'AIError';
    Object.setPrototypeOf(this, AIError.prototype);
  }
}

/** 429 is not retried: rate limit means "slow down"; retrying soon worsens it. Only 5xx are retried. */
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof AIError && error.status != null) {
    return error.status >= 500 && error.status < 600;
  }

  if (error instanceof Error && 'status' in error) {
    const { status } = error as Error & { status?: number };
    return status != null && status >= 500 && status < 600;
  }

  return false;
};

const QUOTA_GUIDANCE =
  'Check Google AI Studio (aistudio.google.com) for quotas and usage, or try again later.';
const AUTH_GUIDANCE =
  'Set the correct API key in .env for local dev, or on the server in production.';
const NETWORK_GUIDANCE = 'Check your network and that the AI proxy is reachable.';
const UNAVAILABLE_GUIDANCE = 'Retry in a few moments.';
const PROXY_404_GUIDANCE =
  'For local dev, set VITE_AI_API_KEY in .env and restart the dev server (bun run dev).';

/** Classify error and return a user-facing message with optional remediation hint. */
export function normalizeAIErrorMessage(error: unknown): string {
  const status =
    error != null && typeof error === 'object' && 'status' in error
      ? (error as { status?: number }).status
      : undefined;
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  if (status === 404) {
    return `AI proxy returned 404 (not found). ${PROXY_404_GUIDANCE}`;
  }

  if (status === 429 || /quota|rate limit|too many requests/i.test(rawMessage)) {
    return `Rate limit or quota exceeded. ${QUOTA_GUIDANCE}`;
  }

  if (
    status === 401 ||
    status === 403 ||
    /invalid.*api key|unauthorized|forbidden/i.test(rawMessage)
  ) {
    return `API key invalid or not configured. ${AUTH_GUIDANCE}`;
  }

  if (status != null && status >= 500 && status < 600) {
    return `AI service temporarily unavailable. ${UNAVAILABLE_GUIDANCE}`;
  }

  if (
    /timeout|timed out|network|fetch failed|connection refused/i.test(rawMessage) ||
    (error instanceof Error && error.name === 'AbortError')
  ) {
    return `Request timed out or connection failed. ${NETWORK_GUIDANCE}`;
  }

  if (/unexpected response|proxy.*configured|no.*choices/i.test(rawMessage)) {
    return `Unexpected response from AI. Ensure the proxy and model are configured correctly.`;
  }

  if (rawMessage) {
    return rawMessage;
  }

  return 'AI request failed. Check the AI proxy and API key configuration.';
}
