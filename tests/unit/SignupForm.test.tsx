import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { SignupForm } from '@/components/auth/SignupForm';

const mockNavigate = vi.fn();
const mockSignUp = vi.fn();
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

function renderSignupForm(returnUrl = '/') {
  return render(
    <MemoryRouter>
      <SignupForm returnUrl={returnUrl} />
    </MemoryRouter>
  );
}

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      signUp: mockSignUp,
      signInGoogle: mockSignInGoogle,
      error: '',
      clearError: mockClearError,
      signOut: vi.fn(),
      signIn: vi.fn(),
      user: null,
      loading: false,
    });
    mockSignUp.mockResolvedValue({ error: null });
    mockSignInGoogle.mockResolvedValue({ error: null });
  });

  it('renders email, password, confirm password and submit button', () => {
    renderSignupForm();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument();
  });

  it('shows validation error when passwords do not match', async () => {
    renderSignupForm();
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password'), {
      target: { value: 'password1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'password2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows validation error when password is shorter than 6 characters', async () => {
    renderSignupForm();
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password'), {
      target: { value: '12345' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp and navigate on successful submit', async () => {
    renderSignupForm('/board/123');
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('user@example.com', 'password123');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/board/123', { replace: true });
    });
  });

  it('does not navigate when signUp returns error', async () => {
    mockSignUp.mockResolvedValueOnce({ error: 'Email already in use' });
    renderSignupForm('/');
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});