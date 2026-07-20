// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DeleteRecipeDialog } from '../DeleteRecipeDialog';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/hooks/useRecipes', () => ({
  useDeleteRecipe: vi.fn(),
}));

import { toast } from 'sonner';
import { useDeleteRecipe } from '@/hooks/useRecipes';

function mockDelete(overrides: Partial<ReturnType<typeof useDeleteRecipe>> = {}) {
  vi.mocked(useDeleteRecipe).mockReturnValue({
    mutate: vi.fn((_id, opts) => opts?.onSuccess?.(undefined)),
    isPending: false,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDelete();
});

describe('DeleteRecipeDialog', () => {
  it('opens the confirmation dialog with the recipe title interpolated', async () => {
    renderWithProviders(<DeleteRecipeDialog recipeId="r1" recipeTitle="Tabbouleh" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      screen.getByText(/are you sure you want to delete "Tabbouleh"/i),
    ).toBeInTheDocument();
  });

  it('deletes the recipe and redirects to the default path on success', async () => {
    const mutate = vi.fn((_id, opts) => opts?.onSuccess?.(undefined));
    mockDelete({ mutate });
    renderWithProviders(<DeleteRecipeDialog recipeId="r1" recipeTitle="Tabbouleh" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(mutate).toHaveBeenCalledWith('r1', expect.any(Object));
    expect(toast.success).toHaveBeenCalledWith('Recipe deleted');
    expect(pushMock).toHaveBeenCalledWith('/recipes');
  });

  it('redirects to a custom path when redirectTo is provided', async () => {
    const mutate = vi.fn((_id, opts) => opts?.onSuccess?.(undefined));
    mockDelete({ mutate });
    renderWithProviders(
      <DeleteRecipeDialog recipeId="r1" recipeTitle="Tabbouleh" redirectTo="/admin/recipes" />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(pushMock).toHaveBeenCalledWith('/admin/recipes');
  });

  it('shows a toast error and does not redirect when deletion fails', async () => {
    const mutate = vi.fn((_id, opts) => opts?.onError?.(new Error('Failed to delete recipe')));
    mockDelete({ mutate });
    renderWithProviders(<DeleteRecipeDialog recipeId="r1" recipeTitle="Tabbouleh" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(toast.error).toHaveBeenCalledWith('Failed to delete recipe');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('disables the confirm button and shows a deleting label while pending', async () => {
    mockDelete({ isPending: true });
    renderWithProviders(<DeleteRecipeDialog recipeId="r1" recipeTitle="Tabbouleh" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog');

    expect(within(dialog).getByRole('button', { name: /deleting/i })).toBeDisabled();
  });
});
