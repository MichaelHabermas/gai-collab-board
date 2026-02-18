/**
 * CORS helpers for the AI proxy. Parses CORS_ALLOWED_ORIGINS (comma-separated);
 * if set, only matching origins are allowed; if unset, Allow-Origin is *.
 */

/** Default when request does not send Access-Control-Request-Headers (e.g. simple request). */
const DEFAULT_ALLOW_HEADERS = 'Content-Type, Authorization';

function parseAllowedOrigins(): Set<string> {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? '';
  if (!raw.trim()) {
    return new Set();
  }
  const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  return new Set(origins);
}

let cachedOrigins: Set<string> | null = null;

function getAllowedOrigins(): Set<string> {
  if (cachedOrigins === null) {
    cachedOrigins = parseAllowedOrigins();
  }
  return cachedOrigins;
}

/** Reset cached origins (for tests when changing CORS_ALLOWED_ORIGINS). */
export function resetCorsCache(): void {
  cachedOrigins = null;
}

/**
 * Resolve Access-Control-Allow-Origin for the given request origin.
 * If CORS_ALLOWED_ORIGINS is set, only return origin when it is in the list; otherwise return *.
 */
export function getAllowOrigin(requestOrigin: string | undefined): string {
  const origins = getAllowedOrigins();
  if (origins.size === 0) {
    return '*';
  }
  if (requestOrigin && origins.has(requestOrigin)) {
    return requestOrigin;
  }
  return '';
}

/**
 * Build CORS headers for preflight (OPTIONS) or actual response.
 * For preflight, pass the request's Access-Control-Request-Headers so it is echoed back
 * and the browser allows x-stainless-* and other client headers.
 */
export function getCorsHeaders(
  requestOrigin: string | undefined,
  requestAllowHeaders: string | undefined
): Record<string, string> {
  const allowOrigin = getAllowOrigin(requestOrigin);
  const allowHeaders = requestAllowHeaders?.trim() || DEFAULT_ALLOW_HEADERS;

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
  };

  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
  }

  return headers;
}
