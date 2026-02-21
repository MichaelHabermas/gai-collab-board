/**
 * Ensures the global guest board document exists in Firestore.
 * Safe to run multiple times (creates only if missing).
 *
 * Usage: bun run seed-guest-board
 * Requires .env with VITE_FIREBASE_* set.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { GUEST_BOARD_ID } from '../src/lib/constants';

const BOARDS_COLLECTION = 'boards';

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

const apiKey = process.env.VITE_FIREBASE_API_KEY;
const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.VITE_FIREBASE_APP_ID;
const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL;

if (
  !apiKey ||
  !authDomain ||
  !projectId ||
  !storageBucket ||
  !messagingSenderId ||
  !appId ||
  !databaseURL
) {
  console.error(
    'Missing Firebase config. Set VITE_FIREBASE_* in .env (see .env.example).'
  );
  process.exit(1);
}

const app = initializeApp({
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  databaseURL,
});

const firestore = getFirestore(app);

async function seedGuestBoard(): Promise<void> {
  const boardRef = doc(firestore, BOARDS_COLLECTION, GUEST_BOARD_ID);
  const snap = await getDoc(boardRef);
  if (snap.exists()) {
    console.log(`Guest board ${GUEST_BOARD_ID} already exists.`);
    return;
  }
  const now = Timestamp.now();
  await setDoc(boardRef, {
    id: GUEST_BOARD_ID,
    name: 'Guest Board',
    ownerId: 'system',
    members: {},
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Created guest board ${GUEST_BOARD_ID}.`);
}

seedGuestBoard().catch((err) => {
  console.error(err);
  process.exit(1);
});
