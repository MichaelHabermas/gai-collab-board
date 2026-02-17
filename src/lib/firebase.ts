import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";

interface IFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseURL: string;
}

const firebaseConfig: IFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const firestore: Firestore = getFirestore(app);
export const realtimeDb: Database = getDatabase(app);

/**
 * Enable offline persistence for Firestore.
 * This allows the app to work offline and sync changes when back online.
 */
export const enableOfflineSupport = async (): Promise<void> => {
  try {
    await enableIndexedDbPersistence(firestore);
  } catch (err) {
    const error = err as { code?: string };
    if (error.code === "failed-precondition") {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      // This is expected behavior, not an error
    } else if (error.code === "unimplemented") {
      // The current browser doesn't support offline persistence
      // This is expected in some browsers, not an error
    }
    // Re-throw other errors
    else {
      throw err;
    }
  }
};

// Initialize offline support
enableOfflineSupport();

export { app };
