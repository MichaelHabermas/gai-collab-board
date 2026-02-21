import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';

interface IFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseURL: string;
}

function validateFirebaseEnv(): IFirebaseConfig {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
  ] as const;

  const missing = required.filter((key) => !import.meta.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill in your Firebase config.'
    );
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  };
}

const firebaseConfig: IFirebaseConfig = validateFirebaseEnv();

const app: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);

/**
 * Initialize Firestore with persistent local cache.
 * This enables offline support and multi-tab synchronization.
 */
export const firestore: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

let _realtimeDb: Database | null = null;
export const getRealtimeDb = (): Database => {
  if (!_realtimeDb) _realtimeDb = getDatabase(app);

  return _realtimeDb;
};

export { app };
