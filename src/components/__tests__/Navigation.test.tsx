// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { Navigation } from '../Navigation';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

function mockAuth(role: 'user' | 'editor' | 'admin' = 'user') {
  vi.mocked(useAuth).mockReturnValue({
    user: { role },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePathname).mockReturnValue('/');
  mockAuth('user');
});

describe('Navigation', () => {
  it('shows the core links but hides Manage/Admin for a regular user', () => {
    renderWithProviders(<Navigation />);

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /recipes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ai coach/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /my recipes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('shows Manage but hides Admin for an editor', () => {
    mockAuth('editor');
    renderWithProviders(<Navigation />);

    expect(screen.getByRole('link', { name: /my recipes/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('shows Manage and Admin for an admin', () => {
    mockAuth('admin');
    renderWithProviders(<Navigation />);

    expect(screen.getByRole('link', { name: /my recipes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
  });

  it('links to the correct href for each item', () => {
    renderWithProviders(<Navigation />);

    expect(screen.getByRole('link', { name: /recipes/i })).toHaveAttribute('href', '/recipes');
    expect(screen.getByRole('link', { name: /ai coach/i })).toHaveAttribute('href', '/dashboard');
  });

  it('calls onClose when a link is clicked on mobile', async () => {
    const onClose = vi.fn();
    renderWithProviders(<Navigation isMobile onClose={onClose} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: /recipes/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when not on mobile', async () => {
    const onClose = vi.fn();
    renderWithProviders(<Navigation onClose={onClose} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: /recipes/i }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
