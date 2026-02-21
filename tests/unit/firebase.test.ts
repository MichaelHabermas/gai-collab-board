import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('firebase initialization', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws an error if required environment variables are missing', async () => {
    // Clear all required env vars to trigger the error
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', '');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');
    
    // Dynamic import to evaluate module in current stubbed environment
    await expect(import('@/lib/firebase')).rejects.toThrow(
      'Missing required Firebase environment variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID'
    );
  });

  it('initializes successfully when required environment variables are present', async () => {
    // Provide valid mock env vars
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test-auth-domain');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project-id');
    
    // Should successfully initialize without throwing
    const firebaseModule = await import('@/lib/firebase');
    
    expect(firebaseModule.app).toBeDefined();
    expect(firebaseModule.auth).toBeDefined();
    expect(firebaseModule.firestore).toBeDefined();

    const db1 = firebaseModule.getRealtimeDb();
    const db2 = firebaseModule.getRealtimeDb();
    expect(db1).toBe(db2);
  });
});