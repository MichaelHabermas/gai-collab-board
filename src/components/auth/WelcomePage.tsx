import { memo, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Zap, Layers, ArrowRight } from 'lucide-react';

interface IFeatureCard {
  icon: ReactElement;
  title: string;
  description: string;
}

interface IHowItWorksStep {
  step: string;
  title: string;
  description: string;
}

const FEATURE_CARDS: IFeatureCard[] = [
  {
    icon: <Users className='h-5 w-5' />,
    title: 'Real-time Collaboration',
    description:
      "Work alongside your team on the same canvas simultaneously, seeing each other's cursors live.",
  },
  {
    icon: <Layers className='h-5 w-5' />,
    title: 'Infinite Canvas',
    description:
      'Sketch, diagram, and plan on an infinite whiteboard with sticky notes, shapes, and more.',
  },
  {
    icon: <Zap className='h-5 w-5' />,
    title: 'AI-Powered',
    description:
      'Let AI help you brainstorm and organize your board content with natural language commands.',
  },
];

const HOW_IT_WORKS_STEPS: IHowItWorksStep[] = [
  {
    step: '01',
    title: 'Create a board',
    description: 'Sign up for free and spin up your first collaborative whiteboard in seconds.',
  },
  {
    step: '02',
    title: 'Invite your team',
    description:
      'Share a link with anyone. They join instantly as a viewer or editor — no install needed.',
  },
  {
    step: '03',
    title: 'Build together',
    description:
      'Place stickies, draw shapes, connect ideas, and chat with AI — all in sync, in real time.',
  },
];

export const WelcomePage = memo((): ReactElement => {
  return (
    <div
      className='h-full overflow-y-auto flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white'
      data-testid='welcome-page'
    >
      {/* Nav */}
      <nav className='shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-700/50'>
        <h1 className='text-xl font-bold tracking-tight'>CollabBoard</h1>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            asChild
            className='text-slate-300 hover:text-white hover:bg-slate-700/50'
            data-testid='welcome-nav-login'
          >
            <Link to='/login'>Log In</Link>
          </Button>
          <Button
            asChild
            className='bg-indigo-600 hover:bg-indigo-500 text-white border-0'
            data-testid='welcome-nav-signup'
          >
            <Link to='/login?tab=signup'>Sign Up Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className='flex-1 flex flex-col items-center justify-center text-center px-4 py-20 sm:py-28'>
        <div className='max-w-3xl mx-auto'>
          <h2 className='text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6'>
            Think together,{' '}
            <span className='bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent'>
              build together
            </span>
          </h2>
          <p className='text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10'>
            CollabBoard is the real-time collaborative whiteboard that turns scattered ideas into
            structured thinking — powered by AI, built for teams.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button
              size='lg'
              asChild
              className='bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-12 px-8 text-base font-semibold'
              data-testid='welcome-signup-cta'
            >
              <Link to='/login?tab=signup'>
                Get started free
                <ArrowRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
            <Button
              size='lg'
              variant='outline'
              asChild
              className='border-slate-600 text-slate-200 hover:bg-slate-700/50 hover:text-white h-12 px-8 text-base'
              data-testid='welcome-login-cta'
            >
              <Link to='/login'>Log in to your account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className='px-4 py-16 sm:py-20 border-t border-slate-700/50'>
        <div className='max-w-5xl mx-auto'>
          <h2 className='text-2xl sm:text-3xl font-bold text-center mb-4'>
            Everything your team needs
          </h2>
          <p className='text-slate-400 text-center mb-12 max-w-xl mx-auto'>
            One canvas. Infinite possibilities.
          </p>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-6'>
            {FEATURE_CARDS.map(({ icon, title, description }) => (
              <div
                key={title}
                className='rounded-xl border border-slate-700/60 bg-slate-800/40 p-6 flex flex-col gap-3 hover:border-indigo-500/40 transition-colors'
              >
                <div className='flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-600/20 text-indigo-400'>
                  {icon}
                </div>
                <h3 className='font-semibold text-white'>{title}</h3>
                <p className='text-sm text-slate-400 leading-relaxed'>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className='px-4 py-16 sm:py-20 border-t border-slate-700/50'>
        <div className='max-w-4xl mx-auto'>
          <h2 className='text-2xl sm:text-3xl font-bold text-center mb-4'>
            Up and running in minutes
          </h2>
          <p className='text-slate-400 text-center mb-12 max-w-xl mx-auto'>
            No complex setup. No downloads required.
          </p>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-8'>
            {HOW_IT_WORKS_STEPS.map(({ step, title, description }) => (
              <div key={step} className='flex flex-col items-center text-center gap-4'>
                <span className='text-4xl font-black text-indigo-500/40 leading-none'>{step}</span>
                <div>
                  <h3 className='font-semibold text-white mb-2'>{title}</h3>
                  <p className='text-sm text-slate-400 leading-relaxed'>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='shrink-0 border-t border-slate-700/50 px-6 py-6'>
        <div className='max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500'>
          <span>© {new Date().getFullYear()} CollabBoard. All rights reserved.</span>
          <div className='flex items-center gap-4'>
            <Link
              to='/login'
              className='hover:text-slate-300 transition-colors'
              data-testid='welcome-footer-login'
            >
              Log In
            </Link>
            <Link
              to='/login?tab=signup'
              className='hover:text-slate-300 transition-colors'
              data-testid='welcome-footer-signup'
            >
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
});
