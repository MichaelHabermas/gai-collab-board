/**
 * Tests for App.tsx auth-based routing: loading state, unauthenticated routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { useAuth } from '@/modules/auth';

vi.mock('@/modules/auth', () => ({
  useAuth: vi.fn(),
}));

describe('App auth routing', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      error: '',
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInGoogle: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn(),
    });
  });

  it('shows loading spinner when loading is true', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      error: '',
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInGoogle: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn(),
    });
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders WelcomePage at / when user is null', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('welcome-page')).toBeInTheDocument();
  });

  it('renders AuthPage at /login when user is null', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('CollabBoard')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
  });
});
