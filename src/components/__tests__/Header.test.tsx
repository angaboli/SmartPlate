// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { Header } from '../Header';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));
vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';

const setTheme = vi.fn();
const logout = vi.fn();

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isAuthenticated: false,
    logout,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePathname).mockReturnValue('/');
  vi.mocked(useTheme).mockReturnValue({ theme: 'light', setTheme } as never);
  mockAuth();
  document.cookie = '';
});

describe('Header', () => {
  it('shows a Sign In link to the root login when on the home page', () => {
    renderWithProviders(<Header />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('shows a Sign In link with a "from" redirect when on another page', () => {
    vi.mocked(usePathname).mockReturnValue('/recipes');
    renderWithProviders(<Header />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login?from=%2Frecipes',
    );
  });

  it('shows the user name and dropdown when authenticated', async () => {
    mockAuth({
      isAuthenticated: true,
      user: { name: 'Amina', email: 'amina@example.com' } as never,
    });
    renderWithProviders(<Header />);

    expect(screen.getByText('Amina')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Amina' }));

    expect(screen.getByText('amina@example.com')).toBeInTheDocument();
  });

  it('toggles the theme when the theme button is clicked', async () => {
    renderWithProviders(<Header />);

    const buttons = screen.getAllByRole('button');
    const themeButton = buttons.find((b) => b.querySelector('svg.lucide-moon'));
    expect(themeButton).toBeDefined();

    const user = userEvent.setup();
    await user.click(themeButton!);

    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('logs out and clears the access token cookie', async () => {
    mockAuth({
      isAuthenticated: true,
      user: { name: 'Amina', email: 'amina@example.com' } as never,
    });
    document.cookie = 'accessToken=abc123; path=/';
    renderWithProviders(<Header />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Amina' }));
    await user.click(screen.getByText('Sign Out'));

    expect(logout).toHaveBeenCalled();
    expect(document.cookie).not.toContain('accessToken=abc123');
  });

  it('calls onMenuClick when the mobile menu button is clicked', async () => {
    const onMenuClick = vi.fn();
    renderWithProviders(<Header onMenuClick={onMenuClick} />);

    const buttons = screen.getAllByRole('button');
    const menuButton = buttons.find((b) => b.querySelector('svg.lucide-menu'));
    expect(menuButton).toBeDefined();

    const user = userEvent.setup();
    await user.click(menuButton!);

    expect(onMenuClick).toHaveBeenCalled();
  });
});
