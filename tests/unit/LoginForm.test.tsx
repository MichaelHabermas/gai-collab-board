import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { LoginForm } from '@/components/auth/LoginForm';

const mockNavigate = vi.fn();
const mockSignIn = vi.fn();
const mockSignInGoogle = vi.fn();
const mockClearError = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/modules/auth', () => ({
  useAuth: vi.fn(),
}));

function renderLoginForm(returnUrl = '/') {
  return render(
    <MemoryRouter>
      <LoginForm returnUrl={returnUrl} />
    </MemoryRouter>
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      signIn: mockSignIn,
      signInGoogle: mockSignInGoogle,
      error: '',
      clearError: mockClearError,
      signOut: vi.fn(),
      signUp: vi.fn(),
      user: null,
      loading: false,
    });
    mockSignIn.mockResolvedValue({ error: null });
    mockSignInGoogle.mockResolvedValue({ error: null });
  });

  it('renders email and password inputs and submit button', () => {
    renderLoginForm();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument();
  });

  it('updates email and password on input', () => {
    renderLoginForm();
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'secret123' },
    });
    expect((screen.getByPlaceholderText('name@example.com') as HTMLInputElement).value).toBe(
      'user@example.com'
    );
    expect((screen.getByPlaceholderText('Enter your password') as HTMLInputElement).value).toBe(
      'secret123'
    );
  });

  it('calls signIn and navigate on successful submit', async () => {
    renderLoginForm('/board/123');
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'password');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/board/123', { replace: true });
    });
  });

  it('does not navigate when signIn returns error', async () => {
    mockSignIn.mockResolvedValueOnce({ error: 'Invalid credentials' });
    renderLoginForm('/');
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows error message when error is set', () => {
    vi.mocked(useAuth).mockReturnValue({
      signIn: mockSignIn,
      signInGoogle: mockSignInGoogle,
      error: 'Invalid credentials',
      clearError: mockClearError,
      signOut: vi.fn(),
      signUp: vi.fn(),
      user: null,
      loading: false,
    });
    renderLoginForm();
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});