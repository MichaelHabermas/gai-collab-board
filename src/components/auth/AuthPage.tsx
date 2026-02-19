import { ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

const resolveSafeReturnUrl = (raw: string | null): string => {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }

  return '/';
};

export const AuthPage = (): ReactElement => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const returnUrl = resolveSafeReturnUrl(searchParams.get('returnUrl'));

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-white mb-2'>CollabBoard</h1>
          <p className='text-slate-400'>Real-time collaborative whiteboard</p>
        </div>
        <Card className='border-slate-700 bg-slate-800/50 backdrop-blur'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-2xl text-white'>Welcome</CardTitle>
            <CardDescription className='text-slate-400'>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className='w-full'>
              <TabsList className='grid w-full grid-cols-2 bg-slate-700/50'>
                <TabsTrigger
                  value='login'
                  className='data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-300'
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value='signup'
                  className='data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-300'
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              <TabsContent value='login' className='mt-4'>
                <LoginForm returnUrl={returnUrl} />
              </TabsContent>
              <TabsContent value='signup' className='mt-4'>
                <SignupForm returnUrl={returnUrl} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
