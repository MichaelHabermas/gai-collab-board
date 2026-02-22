/**
 * One-time script to clear all boards from Firestore (and their objects subcollections).
 * Optionally clears recentBoardIds and favoriteBoardIds in all users' preferences.
 *
 * Usage: bun run scripts/clear-boards.ts
 * Requires .env with VITE_FIREBASE_* set. Asks for confirmation before deleting.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  setDoc,
} from 'firebase/firestore';

const BOARDS_COLLECTION = 'boards';
const OBJECTS_SUBCOLLECTION = 'objects';
const USERS_COLLECTION = 'users';
const BATCH_SIZE = 500;

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
  console.error('Missing Firebase config. Set VITE_FIREBASE_* in .env (see .env.example).');
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

function askConfirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function deleteSubcollectionDocs(
  collectionPath: string[],
  batchSize: number
): Promise<number> {
  const ref =
    collectionPath.length === 2
      ? collection(firestore, collectionPath[0]!, collectionPath[1]!)
      : collection(firestore, collectionPath[0]!, collectionPath[1]!, collectionPath[2]!);
  const snapshot = await getDocs(ref);
  let count = 0;
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = writeBatch(firestore);
    const chunk = docs.slice(i, i + batchSize);
    for (const d of chunk) {
      batch.delete(d.ref);
      count += 1;
    }
    await batch.commit();
  }
  return count;
}

async function clearBoards(): Promise<void> {
  const boardsRef = collection(firestore, BOARDS_COLLECTION);
  const snapshot = await getDocs(boardsRef);
  const boardIds = snapshot.docs.map((d) => d.id);
  console.log(`Found ${boardIds.length} board(s).`);

  for (const boardId of boardIds) {
    const objectCount = await deleteSubcollectionDocs(
      [BOARDS_COLLECTION, boardId, OBJECTS_SUBCOLLECTION],
      BATCH_SIZE
    );
    if (objectCount > 0) {
      console.log(`  Deleted ${objectCount} object(s) from board ${boardId}`);
    }
    const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
    await deleteDoc(boardRef);
    console.log(`  Deleted board ${boardId}`);
  }
  console.log('Boards cleared.');
}

async function clearUserPreferences(): Promise<void> {
  const usersRef = collection(firestore, USERS_COLLECTION);
  const snapshot = await getDocs(usersRef);
  console.log(`Found ${snapshot.docs.length} user doc(s).`);

  for (const d of snapshot.docs) {
    const userId = d.id;
    const data = d.data();
    const prefs = data?.preferences;
    if (prefs && typeof prefs === 'object') {
      await setDoc(
        doc(firestore, USERS_COLLECTION, userId),
        {
          preferences: {
            ...prefs,
            recentBoardIds: [],
            favoriteBoardIds: [],
          },
        },
        { merge: true }
      );
      console.log(`  Cleared preferences for user ${userId}`);
    }
  }
  console.log('User preferences cleared.');
}

async function main(): Promise<void> {
  console.log('This script will:');
  console.log(
    '  1. Delete all documents in the "boards" collection (and each board\'s "objects" subcollection).'
  );
  console.log('  2. Optionally clear recentBoardIds and favoriteBoardIds for all users.');
  console.log('');
  const ok = await askConfirm('Proceed with clearing all boards?');
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  await clearBoards();

  const clearPrefs = await askConfirm('Also clear recent/favorite board IDs for all users?');
  if (clearPrefs) {
    await clearUserPreferences();
  } else {
    console.log('Skipped clearing user preferences.');
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
