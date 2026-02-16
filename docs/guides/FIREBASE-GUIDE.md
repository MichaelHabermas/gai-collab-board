# Firebase Guide for CollabBoard

## Overview

Firebase provides the backend infrastructure for CollabBoard, handling authentication, real-time data synchronization, and persistence. This guide covers the key Firebase services used in the project.

**Official Documentation**: [Firebase Docs](https://firebase.google.com/docs)

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [Firebase Authentication](#firebase-authentication)
3. [Firestore Database](#firestore-database)
4. [Realtime Database](#realtime-database)
5. [Presence System](#presence-system)
6. [Security Rules](#security-rules)
7. [Offline Support](#offline-support)
8. [Performance Optimization](#performance-optimization)

---

## Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the wizard
3. Enable Google Analytics (optional but recommended)

### 2. Register Web App

1. In Project Settings, click the web icon (`</>`)
2. Register your app with a nickname
3. Copy the configuration object

### 3. Install Firebase SDK

```bash
bun add firebase
```

### 4. Initialize Firebase

Create `src/lib/firebase.ts`:

```typescript
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
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

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize services
export const auth: Auth = getAuth(app);
export const firestore: Firestore = getFirestore(app);
export const realtimeDb: Database = getDatabase(app);

export { app };
```

### 5. Environment Variables

Create `.env` in project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
```

---

## Firebase Authentication

### Enable Auth Providers

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable Email/Password
3. Enable Google (for OAuth)

### Auth Service Module

Create `src/modules/auth/authService.ts`:

```typescript
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// Types
export interface IAuthResult {
  user: User | null;
  error: string | null;
}

// Email/Password Sign Up
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<IAuthResult> => {
  try {
    const credential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: credential.user, error: null };
  } catch (error) {
    return { user: null, error: (error as Error).message };
  }
};

// Email/Password Sign In
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<IAuthResult> => {
  try {
    const credential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: credential.user, error: null };
  } catch (error) {
    return { user: null, error: (error as Error).message };
  }
};

// Google Sign In
export const signInWithGoogle = async (): Promise<IAuthResult> => {
  try {
    const provider = new GoogleAuthProvider();
    const credential: UserCredential = await signInWithPopup(auth, provider);
    return { user: credential.user, error: null };
  } catch (error) {
    return { user: null, error: (error as Error).message };
  }
};

// Sign Out
export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

// Auth State Observer
export const subscribeToAuthChanges = (
  callback: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get Current User
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};
```

### Auth Context Hook

Create `src/modules/auth/useAuth.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import {
  subscribeToAuthChanges,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  logOut,
  IAuthResult,
} from "./authService";

interface IUseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<IAuthResult>;
  signIn: (email: string, password: string) => Promise<IAuthResult>;
  signInGoogle: () => Promise<IAuthResult>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = (): IUseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthAction = useCallback(
    async (action: () => Promise<IAuthResult>): Promise<IAuthResult> => {
      setError(null);
      const result = await action();
      if (result.error) {
        setError(result.error);
      }
      return result;
    },
    []
  );

  const signUp = useCallback(
    (email: string, password: string) =>
      handleAuthAction(() => signUpWithEmail(email, password)),
    [handleAuthAction]
  );

  const signIn = useCallback(
    (email: string, password: string) =>
      handleAuthAction(() => signInWithEmail(email, password)),
    [handleAuthAction]
  );

  const signInGoogle = useCallback(
    () => handleAuthAction(signInWithGoogle),
    [handleAuthAction]
  );

  const signOut = useCallback(async () => {
    await logOut();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signInGoogle,
    signOut,
    clearError,
  };
};
```

---

## Firestore Database

Firestore is used for **persistent board data** (objects, boards, user profiles).

### Data Schema

```
/boards/{boardId}
  - name: string
  - ownerId: string
  - createdAt: timestamp
  - updatedAt: timestamp
  - members: { [userId]: 'owner' | 'editor' | 'viewer' }

/boards/{boardId}/objects/{objectId}
  - type: 'sticky' | 'rectangle' | 'circle' | 'line' | 'text' | 'frame' | 'connector'
  - x: number
  - y: number
  - width: number
  - height: number
  - rotation: number
  - fill: string
  - text?: string
  - createdBy: string
  - createdAt: timestamp
  - updatedAt: timestamp

/users/{userId}
  - email: string
  - displayName: string
  - photoURL?: string
  - createdAt: timestamp
```

### Firestore Service

Create `src/modules/sync/firestoreService.ts`:

```typescript
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentReference,
  QuerySnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";

// Types
export interface IBoardObject {
  id: string;
  type: "sticky" | "rectangle" | "circle" | "line" | "text" | "frame" | "connector";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  text?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface IBoard {
  id: string;
  name: string;
  ownerId: string;
  members: Record<string, "owner" | "editor" | "viewer">;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Board Operations
export const createBoard = async (
  boardId: string,
  name: string,
  ownerId: string
): Promise<void> => {
  const boardRef = doc(firestore, "boards", boardId);
  await setDoc(boardRef, {
    name,
    ownerId,
    members: { [ownerId]: "owner" },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getBoard = async (boardId: string): Promise<IBoard | null> => {
  const boardRef = doc(firestore, "boards", boardId);
  const snapshot = await getDoc(boardRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as IBoard;
  }
  return null;
};

// Object Operations
export const createObject = async (
  boardId: string,
  objectId: string,
  data: Omit<IBoardObject, "id" | "createdAt" | "updatedAt">
): Promise<void> => {
  const objectRef = doc(firestore, "boards", boardId, "objects", objectId);
  await setDoc(objectRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateObject = async (
  boardId: string,
  objectId: string,
  data: Partial<IBoardObject>
): Promise<void> => {
  const objectRef = doc(firestore, "boards", boardId, "objects", objectId);
  await updateDoc(objectRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteObject = async (
  boardId: string,
  objectId: string
): Promise<void> => {
  const objectRef = doc(firestore, "boards", boardId, "objects", objectId);
  await deleteDoc(objectRef);
};

// Real-time Listener for Objects
export const subscribeToObjects = (
  boardId: string,
  callback: (objects: IBoardObject[]) => void
): Unsubscribe => {
  const objectsRef = collection(firestore, "boards", boardId, "objects");
  const objectsQuery = query(objectsRef, orderBy("createdAt", "asc"));

  return onSnapshot(objectsQuery, (snapshot: QuerySnapshot) => {
    const objects: IBoardObject[] = [];
    snapshot.forEach((doc) => {
      objects.push({ id: doc.id, ...doc.data() } as IBoardObject);
    });
    callback(objects);
  });
};
```

---

## Realtime Database

Realtime Database is used for **ephemeral/fast-changing data** (cursors, presence).

### Database Data Schema

```bash
/boards/{boardId}/cursors/{odId}
  - odId: string
  - x: number
  - y: number
  - displayName: string
  - color: string
  - lastUpdated: number (timestamp)

/boards/{boardId}/presence/{odId}
  - odId: string
  - displayName: string
  - online: boolean
  - lastSeen: number (timestamp)

/status/{odId}
  - state: 'online' | 'offline'
  - last_changed: number (timestamp)
```

### Realtime Database Service

Create `src/modules/sync/realtimeService.ts`:

```typescript
import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  DatabaseReference,
  Unsubscribe,
  DataSnapshot,
  remove,
} from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

// Types
export interface ICursorData {
  odId: string;
  x: number;
  y: number;
  displayName: string;
  color: string;
  lastUpdated: number;
}

export interface IPresenceData {
  odId: string;
  displayName: string;
  online: boolean;
  lastSeen: number;
}

// Cursor Operations
export const updateCursor = async (
  boardId: string,
  odId: string,
  x: number,
  y: number,
  displayName: string,
  color: string
): Promise<void> => {
  const cursorRef = ref(realtimeDb, `boards/${boardId}/cursors/${odId}`);
  await set(cursorRef, {
    odId,
    x,
    y,
    displayName,
    color,
    lastUpdated: Date.now(),
  });
};

export const subscribeToCursors = (
  boardId: string,
  callback: (cursors: Record<string, ICursorData>) => void
): Unsubscribe => {
  const cursorsRef = ref(realtimeDb, `boards/${boardId}/cursors`);
  return onValue(cursorsRef, (snapshot: DataSnapshot) => {
    const cursors = snapshot.val() || {};
    callback(cursors);
  });
};

export const removeCursor = async (
  boardId: string,
  odId: string
): Promise<void> => {
  const cursorRef = ref(realtimeDb, `boards/${boardId}/cursors/${odId}`);
  await remove(cursorRef);
};

// Presence Operations
export const setPresence = async (
  boardId: string,
  odId: string,
  displayName: string
): Promise<void> => {
  const presenceRef = ref(realtimeDb, `boards/${boardId}/presence/${odId}`);
  const cursorRef = ref(realtimeDb, `boards/${boardId}/cursors/${odId}`);

  // Set current presence
  await set(presenceRef, {
    odId,
    displayName,
    online: true,
    lastSeen: Date.now(),
  });

  // Setup disconnect handlers
  onDisconnect(presenceRef).set({
    odId,
    displayName,
    online: false,
    lastSeen: serverTimestamp(),
  });

  // Remove cursor on disconnect
  onDisconnect(cursorRef).remove();
};

export const subscribeToPresence = (
  boardId: string,
  callback: (presence: Record<string, IPresenceData>) => void
): Unsubscribe => {
  const presenceRef = ref(realtimeDb, `boards/${boardId}/presence`);
  return onValue(presenceRef, (snapshot: DataSnapshot) => {
    const presence = snapshot.val() || {};
    callback(presence);
  });
};
```

---

## Presence System

The presence system tracks which users are online and their cursor positions.

### Complete Presence Hook

Create `src/modules/sync/usePresence.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { ref, onValue, onDisconnect, set, serverTimestamp } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

interface IPresenceUser {
  odId: string;
  displayName: string;
  online: boolean;
  lastSeen: number;
}

interface IUsePresenceReturn {
  onlineUsers: IPresenceUser[];
  setOnline: () => Promise<void>;
  setOffline: () => Promise<void>;
}

export const usePresence = (
  boardId: string,
  odId: string,
  displayName: string
): IUsePresenceReturn => {
  const [onlineUsers, setOnlineUsers] = useState<IPresenceUser[]>([]);
  const presenceRef = useRef<ReturnType<typeof ref> | null>(null);

  useEffect(() => {
    if (!boardId || !odId) return;

    // Subscribe to presence changes
    const presenceListRef = ref(realtimeDb, `boards/${boardId}/presence`);
    const unsubscribe = onValue(presenceListRef, (snapshot) => {
      const data = snapshot.val() || {};
      const users = Object.values(data) as IPresenceUser[];
      setOnlineUsers(users.filter((u) => u.online));
    });

    // Set up own presence
    presenceRef.current = ref(realtimeDb, `boards/${boardId}/presence/${odId}`);
    
    // Monitor connection state
    const connectedRef = ref(realtimeDb, ".info/connected");
    const connectedUnsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true && presenceRef.current) {
        // We're connected (or reconnected)
        onDisconnect(presenceRef.current).set({
          odId,
          displayName,
          online: false,
          lastSeen: serverTimestamp(),
        });

        set(presenceRef.current, {
          odId,
          displayName,
          online: true,
          lastSeen: Date.now(),
        });
      }
    });

    return () => {
      unsubscribe();
      connectedUnsubscribe();
    };
  }, [boardId, odId, displayName]);

  const setOnline = useCallback(async () => {
    if (presenceRef.current) {
      await set(presenceRef.current, {
        odId,
        displayName,
        online: true,
        lastSeen: Date.now(),
      });
    }
  }, [odId, displayName]);

  const setOffline = useCallback(async () => {
    if (presenceRef.current) {
      await set(presenceRef.current, {
        odId,
        displayName,
        online: false,
        lastSeen: Date.now(),
      });
    }
  }, [odId, displayName]);

  return { onlineUsers, setOnline, setOffline };
};
```

---

## Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check board membership
    function isBoardMember(boardId) {
      let board = get(/databases/$(database)/documents/boards/$(boardId));
      return board != null && request.auth.uid in board.data.members;
    }
    
    // Helper function to check edit permission
    function canEdit(boardId) {
      let board = get(/databases/$(database)/documents/boards/$(boardId));
      let role = board.data.members[request.auth.uid];
      return role == 'owner' || role == 'editor';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if request.auth.uid == userId;
    }
    
    // Boards collection
    match /boards/{boardId} {
      allow read: if isAuthenticated() && isBoardMember(boardId);
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && canEdit(boardId);
      
      // Objects subcollection
      match /objects/{objectId} {
        allow read: if isAuthenticated() && isBoardMember(boardId);
        allow write: if isAuthenticated() && canEdit(boardId);
      }
    }
  }
}
```

### Realtime Database Rules

```json
{
  "rules": {
    "boards": {
      "$boardId": {
        "cursors": {
          ".read": "auth != null",
          ".write": "auth != null",
          "$odId": {
            ".validate": "newData.hasChildren(['x', 'y', 'displayName'])"
          }
        },
        "presence": {
          ".read": "auth != null",
          ".write": "auth != null",
          "$odId": {
            ".validate": "newData.hasChildren(['odId', 'displayName', 'online'])"
          }
        }
      }
    },
    "status": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

---

## Offline Support

### Enable Firestore Persistence

```typescript
import { enableIndexedDbPersistence, Firestore } from "firebase/firestore";

export const enableOfflineSupport = async (db: Firestore): Promise<void> => {
  try {
    await enableIndexedDbPersistence(db);
  } catch (err) {
    if ((err as { code: string }).code === "failed-precondition") {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn("Offline persistence unavailable: multiple tabs open");
    } else if ((err as { code: string }).code === "unimplemented") {
      // Current browser doesn't support persistence
      console.warn("Offline persistence unavailable: browser not supported");
    }
  }
};
```

### Optimistic Updates Pattern

```typescript
import { useState, useCallback } from "react";
import { updateObject } from "@/modules/firestore/firestoreService";

interface IOptimisticUpdate<T> {
  localState: T;
  updateLocally: (update: Partial<T>) => void;
  syncToServer: (boardId: string, objectId: string) => Promise<void>;
  rollback: () => void;
}

export const useOptimisticUpdate = <T extends object>(
  initialState: T
): IOptimisticUpdate<T> => {
  const [localState, setLocalState] = useState<T>(initialState);
  const [previousState, setPreviousState] = useState<T>(initialState);

  const updateLocally = useCallback((update: Partial<T>) => {
    setPreviousState(localState);
    setLocalState((prev) => ({ ...prev, ...update }));
  }, [localState]);

  const syncToServer = useCallback(
    async (boardId: string, objectId: string) => {
      try {
        await updateObject(boardId, objectId, localState as Partial<IBoardObject>);
      } catch (error) {
        // Rollback on failure
        setLocalState(previousState);
        throw error;
      }
    },
    [localState, previousState]
  );

  const rollback = useCallback(() => {
    setLocalState(previousState);
  }, [previousState]);

  return { localState, updateLocally, syncToServer, rollback };
};
```

---

## Performance Optimization

### Debounce Cursor Updates

```typescript
import { useCallback, useRef } from "react";

export const useDebouncedCursorUpdate = (
  updateFn: (x: number, y: number) => void,
  delay: number = 16 // ~60fps
): ((x: number, y: number) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<{ x: number; y: number } | null>(null);

  const debouncedUpdate = useCallback(
    (x: number, y: number) => {
      lastUpdateRef.current = { x, y };

      if (timeoutRef.current) {
        return; // Update already scheduled
      }

      timeoutRef.current = setTimeout(() => {
        if (lastUpdateRef.current) {
          updateFn(lastUpdateRef.current.x, lastUpdateRef.current.y);
        }
        timeoutRef.current = null;
      }, delay);
    },
    [updateFn, delay]
  );

  return debouncedUpdate;
};
```

### Batch Firestore Writes

```typescript
import { writeBatch, doc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export const batchUpdateObjects = async (
  boardId: string,
  updates: Array<{ objectId: string; data: Partial<IBoardObject> }>
): Promise<void> => {
  const batch = writeBatch(firestore);

  updates.forEach(({ objectId, data }) => {
    const objectRef = doc(firestore, "boards", boardId, "objects", objectId);
    batch.update(objectRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
};
```

---

## Common Patterns

### Last-Write-Wins Conflict Resolution

CollabBoard uses a **last-write-wins** strategy for conflict resolution:

1. All updates include a timestamp
2. When processing updates, the most recent timestamp wins
3. Optimistic UI shows local changes immediately
4. Server reconciliation applies remote changes

```typescript
// Example: Handling concurrent updates
export const mergeObjectUpdates = (
  local: IBoardObject,
  remote: IBoardObject
): IBoardObject => {
  // Compare timestamps - most recent wins
  const localTime = local.updatedAt?.toMillis() || 0;
  const remoteTime = remote.updatedAt?.toMillis() || 0;

  return remoteTime > localTime ? remote : local;
};
```

---

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Check security rules
   - Verify user is authenticated
   - Ensure user has proper role

2. **Real-time updates not working**
   - Check network connection
   - Verify listener is properly subscribed
   - Check Realtime Database rules

3. **Offline data not syncing**
   - Ensure persistence is enabled
   - Check for multiple tabs issue
   - Verify browser supports IndexedDB

4. **High latency**
   - Use appropriate database (Realtime for cursors, Firestore for objects)
   - Implement debouncing for frequent updates
   - Consider regional database deployment
