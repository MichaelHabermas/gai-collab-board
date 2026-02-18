import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAllowOrigin,
  getCorsHeaders,
  resetCorsCache,
} from '../../server/cors';

describe('proxy CORS', () => {
  const originalEnv = process.env.CORS_ALLOWED_ORIGINS;

  beforeEach(() => {
    resetCorsCache();
  });

  afterEach(() => {
    resetCorsCache();
    if (originalEnv !== undefined) {
      process.env.CORS_ALLOWED_ORIGINS = originalEnv;
    } else {
      delete process.env.CORS_ALLOWED_ORIGINS;
    }
  });

  describe('getAllowOrigin', () => {
    it('returns * when CORS_ALLOWED_ORIGINS is unset', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;
      expect(getAllowOrigin(undefined)).toBe('*');
      expect(getAllowOrigin('https://gai-collab-board.onrender.com')).toBe('*');
    });

    it('returns request origin when it is in CORS_ALLOWED_ORIGINS', () => {
      process.env.CORS_ALLOWED_ORIGINS =
        'https://gai-collab-board.onrender.com,https://other.example.com';
      expect(getAllowOrigin('https://gai-collab-board.onrender.com')).toBe(
        'https://gai-collab-board.onrender.com'
      );
      expect(getAllowOrigin('https://other.example.com')).toBe(
        'https://other.example.com'
      );
    });

    it('returns empty string when origin is not in allowlist', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://gai-collab-board.onrender.com';
      expect(getAllowOrigin('https://evil.example.com')).toBe('');
      expect(getAllowOrigin(undefined)).toBe('');
    });
  });

  describe('getCorsHeaders', () => {
    it('echoes Access-Control-Request-Headers so x-stainless-* is allowed', () => {
      const requested =
        'content-type, authorization, x-stainless-os, x-stainless-lang';
      const headers = getCorsHeaders(
        'https://gai-collab-board.onrender.com',
        requested
      );
      expect(headers['Access-Control-Allow-Headers']).toBe(requested);
    });

    it('uses default Allow-Headers when request does not send preflight headers', () => {
      const headers = getCorsHeaders('https://app.example.com', undefined);
      expect(headers['Access-Control-Allow-Headers']).toBe(
        'Content-Type, Authorization'
      );
    });

    it('includes Vary header', () => {
      const headers = getCorsHeaders(undefined, undefined);
      expect(headers['Vary']).toBe(
        'Origin, Access-Control-Request-Headers, Access-Control-Request-Method'
      );
    });

    it('includes Allow-Origin when CORS_ALLOWED_ORIGINS is unset', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;
      const headers = getCorsHeaders('https://any.example.com', undefined);
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('includes Allow-Origin when origin is in allowlist', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://gai-collab-board.onrender.com';
      const headers = getCorsHeaders(
        'https://gai-collab-board.onrender.com',
        'x-stainless-os'
      );
      expect(headers['Access-Control-Allow-Origin']).toBe(
        'https://gai-collab-board.onrender.com'
      );
      expect(headers['Access-Control-Allow-Headers']).toBe('x-stainless-os');
    });

    it('omits Allow-Origin when origin is not in allowlist', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://gai-collab-board.onrender.com';
      const headers = getCorsHeaders('https://other.example.com', undefined);
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });
});
