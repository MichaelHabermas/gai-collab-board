import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const REQUIRED_FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_DATABASE_URL',
] as const;

const OPTIONAL_PROXY_PATH_KEY = 'VITE_AI_PROXY_PATH';
const OPTIONAL_PROXY_URL_KEY = 'VITE_AI_PROXY_URL';
const FIREBASE_DEPLOY_PROJECT_KEYS = ['FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID'] as const;
const AI_KEY_KEYS = [
  'AI_API_KEY',
  'VITE_AI_API_KEY',
  'GEMINI_API_KEY',
  'VITE_GEMINI_API_KEY',
  'GROQ_API_KEY',
  'VITE_GROQ_API_KEY',
] as const;

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

const getMissingFirebaseKeys = (): string[] => {
  return REQUIRED_FIREBASE_ENV_KEYS.filter((key) => {
    return (process.env[key] ?? '').trim() === '';
  });
};

const hasAnyValue = (keys: readonly string[]): boolean => {
  return keys.some((key) => (process.env[key] ?? '').trim() !== '');
};

const run = (): void => {
  loadEnv();

  const missing: string[] = [];
  const missingFirebaseKeys = getMissingFirebaseKeys();
  missing.push(...missingFirebaseKeys);

  if (!hasAnyValue([OPTIONAL_PROXY_PATH_KEY, OPTIONAL_PROXY_URL_KEY])) {
    missing.push(`${OPTIONAL_PROXY_PATH_KEY} or ${OPTIONAL_PROXY_URL_KEY}`);
  }

  if (!hasAnyValue(FIREBASE_DEPLOY_PROJECT_KEYS)) {
    missing.push('FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID');
  }

  if (!hasAnyValue(AI_KEY_KEYS)) {
    missing.push(
      'One of: AI_API_KEY, VITE_AI_API_KEY, GEMINI_API_KEY, VITE_GEMINI_API_KEY, GROQ_API_KEY, VITE_GROQ_API_KEY'
    );
  }

  if (missing.length > 0) {
    process.stderr.write('Release preflight failed. Missing required configuration:\n');
    for (const key of missing) {
      process.stderr.write(`- ${key}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('Release preflight passed.\n');
};

run();
