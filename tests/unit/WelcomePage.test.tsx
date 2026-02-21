import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WelcomePage } from '@/components/auth/WelcomePage';
import { GUEST_BOARD_ID } from '@/lib/constants';

function renderWelcomePage() {
  return render(
    <MemoryRouter>
      <WelcomePage />
    </MemoryRouter>
  );
}

describe('WelcomePage', () => {
  it('renders with welcome-page test id', () => {
    renderWelcomePage();
    expect(screen.getByTestId('welcome-page')).toBeInTheDocument();
  });

  it('renders CollabBoard title in nav', () => {
    renderWelcomePage();
    expect(screen.getByText('CollabBoard')).toBeInTheDocument();
  });

  it('renders hero heading', () => {
    renderWelcomePage();
    expect(screen.getByText(/Think together,/)).toBeInTheDocument();
    expect(screen.getByText(/build together/)).toBeInTheDocument();
  });

  it('renders nav login link to /login', () => {
    renderWelcomePage();
    const loginLink = screen.getByTestId('welcome-nav-login');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.getAttribute('href')).toBe('/login');
  });

  it('renders nav signup link to /login?tab=signup', () => {
    renderWelcomePage();
    const signupLink = screen.getByTestId('welcome-nav-signup');
    expect(signupLink).toBeInTheDocument();
    expect(signupLink.getAttribute('href')).toBe('/login?tab=signup');
  });

  it('renders guest board CTA linking to guest board', () => {
    renderWelcomePage();
    const guestCta = screen.getByTestId('guest-board-cta');
    expect(guestCta).toBeInTheDocument();
    expect(guestCta.getAttribute('href')).toBe(`/board/${GUEST_BOARD_ID}`);
  });

  it('renders welcome signup CTA linking to /login?tab=signup', () => {
    renderWelcomePage();
    const signupCta = screen.getByTestId('welcome-signup-cta');
    expect(signupCta).toBeInTheDocument();
    expect(signupCta.getAttribute('href')).toBe('/login?tab=signup');
  });

  it('renders welcome login CTA linking to /login', () => {
    renderWelcomePage();
    const loginCta = screen.getByTestId('welcome-login-cta');
    expect(loginCta).toBeInTheDocument();
    expect(loginCta.getAttribute('href')).toBe('/login');
  });

  it('renders feature cards', () => {
    renderWelcomePage();
    expect(screen.getByText('Real-time Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Infinite Canvas')).toBeInTheDocument();
    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
  });

  it('renders how it works steps', () => {
    renderWelcomePage();
    expect(screen.getByText('Create a board')).toBeInTheDocument();
    expect(screen.getByText('Invite your team')).toBeInTheDocument();
    expect(screen.getByText('Build together')).toBeInTheDocument();
  });

  it('renders footer login and signup links', () => {
    renderWelcomePage();
    expect(screen.getByTestId('welcome-footer-login').getAttribute('href')).toBe('/login');
    expect(screen.getByTestId('welcome-footer-signup').getAttribute('href')).toBe(
      '/login?tab=signup'
    );
  });
});
