import { ReactElement } from 'react';
import { useAuth } from '@/modules/auth';
import { AuthPage } from '@/components/auth/AuthPage';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

const Dashboard = (): ReactElement => {
  const { user, signOut } = useAuth();

  return (
    <div className='min-h-screen bg-slate-900'>
      <header className='border-b border-slate-700 bg-slate-800/50 backdrop-blur'>
        <div className='container mx-auto px-4 py-3 flex items-center justify-between'>
          <h1 className='text-xl font-bold text-white'>CollabBoard</h1>
          <div className='flex items-center gap-4'>
            <span className='text-sm text-slate-400'>{user?.email}</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={signOut}
              className='text-slate-300 hover:text-white hover:bg-slate-700'
            >
              <LogOut className='h-4 w-4 mr-2' />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className='container mx-auto px-4 py-8'>
        <div className='text-center'>
          <h2 className='text-3xl font-bold text-white mb-4'>Welcome to CollabBoard</h2>
          <p className='text-slate-400 mb-8'>Your real-time collaborative whiteboard is ready.</p>
          <div className='bg-slate-800/50 border border-slate-700 rounded-lg p-8'>
            <p className='text-slate-300'>Board canvas will be implemented in Epic 3.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export const App = (): ReactElement => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-900'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin text-primary mx-auto mb-4' />
          <p className='text-slate-400'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard />;
};
