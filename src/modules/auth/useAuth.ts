import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  subscribeToAuthChanges,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  logOut,
  IAuthResult,
} from './authService';

interface IUseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string;
  signUp: (email: string, password: string) => Promise<IAuthResult>;
  signIn: (email: string, password: string) => Promise<IAuthResult>;
  signInGoogle: () => Promise<IAuthResult>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = (): IUseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignUp = useCallback(
    async (email: string, password: string): Promise<IAuthResult> => {
      setError('');
      const result = await signUpWithEmail(email, password);
      if (result.error) {
        setError(result.error);
      }
      return result;
    },
    []
  );

  const handleSignIn = useCallback(
    async (email: string, password: string): Promise<IAuthResult> => {
      setError('');
      const result = await signInWithEmail(email, password);
      if (result.error) {
        setError(result.error);
      }
      return result;
    },
    []
  );

  const handleSignInGoogle = useCallback(async (): Promise<IAuthResult> => {
    setError('');
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
    }
    return result;
  }, []);

  const handleSignOut = useCallback(async (): Promise<void> => {
    setError('');
    await logOut();
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    user,
    loading,
    error,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInGoogle: handleSignInGoogle,
    signOut: handleSignOut,
    clearError,
  };
};
