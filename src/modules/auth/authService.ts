import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export interface IAuthResult {
  user: User | null;
  error: string | null;
}

export const signUpWithEmail = async (email: string, password: string): Promise<IAuthResult> => {
  try {
    const credential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: credential.user, error: null };
  } catch (error) {
    return { user: null, error: (error as Error).message };
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<IAuthResult> => {
  try {
    const credential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: credential.user, error: null };
  } catch (error) {
    return { user: null, error: (error as Error).message };
  }
};

export const signInWithGoogle = async (): Promise<IAuthResult> => {
  try {
    const provider = new GoogleAuthProvider();
    const credential: UserCredential = await signInWithPopup(auth, provider);
    return { user: credential.user, error: null };
  } catch (error) {
    return { user: null, error: (error as Error).message };
  }
};

export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};
