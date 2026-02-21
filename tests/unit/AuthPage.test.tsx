import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';

const mockSignIn = vi.fn();
const mockSignInGoogle = vi.fn();
const mockSignUp = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/modules/auth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: '',
    signIn: mockSignIn,
    signInGoogle: mockSignInGoogle,
    signUp: mockSignUp,
    signOut: vi.fn(),
    clearError: mockClearError,
  }),
}));

function renderAuthPage(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path='/login' element={<AuthPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthPage', () => {
  it('renders CollabBoard title and login tab by default', () => {
    renderAuthPage();
    expect(screen.getByText('CollabBoard')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sign Up' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('defaults to signup tab when tab=signup in query', () => {
    renderAuthPage('/login?tab=signup');
    expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('renders login form when default tab is login', () => {
    renderAuthPage('/login');
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('renders with returnUrl in query without error', () => {
    renderAuthPage('/login?returnUrl=/board/abc');
    expect(screen.getByText('CollabBoard')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
  });
});
