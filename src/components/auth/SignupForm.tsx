import { useState, FormEvent, ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/modules/auth';
import { Loader2 } from 'lucide-react';

export const SignupForm = (): ReactElement => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { signUp, signInGoogle, error, clearError } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    await signUp(email, password);
    setIsLoading(false);
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    setIsLoading(true);
    clearError();
    await signInGoogle();
    setIsLoading(false);
  };

  const displayError = validationError ?? error;

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='signup-email'>Email</Label>
        <Input
          id='signup-email'
          type='email'
          placeholder='name@example.com'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='signup-password'>Password</Label>
        <Input
          id='signup-password'
          type='password'
          placeholder='Create a password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='confirm-password'>Confirm Password</Label>
        <Input
          id='confirm-password'
          type='password'
          placeholder='Confirm your password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      {displayError && (
        <div className='text-sm text-destructive bg-destructive/10 p-3 rounded-md'>
          {displayError}
        </div>
      )}
      <Button type='submit' className='w-full' disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className='animate-spin' />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>
      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-card px-2 text-muted-foreground'>Or continue with</span>
        </div>
      </div>
      <Button
        type='button'
        variant='outline'
        className='w-full'
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
          <path
            d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
            fill='#4285F4'
          />
          <path
            d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
            fill='#34A853'
          />
          <path
            d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
            fill='#FBBC05'
          />
          <path
            d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
            fill='#EA4335'
          />
        </svg>
        Google
      </Button>
    </form>
  );
};
