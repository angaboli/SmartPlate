// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ImportRecipeDialog } from '../ImportRecipeDialog';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/hooks/useImport', () => ({
  useExtractRecipe: vi.fn(),
  useSaveImport: vi.fn(),
}));

import { toast } from 'sonner';
import { useExtractRecipe, useSaveImport } from '@/hooks/useImport';

const extractedRecipe = {
  title: 'Tabbouleh',
  description: 'A fresh salad',
  imageUrl: null,
  prepTimeMin: 20,
  cookTimeMin: 10,
  servings: 4,
  calories: 320,
  ingredients: ['Bulgur', 'Parsley'],
  steps: ['Chop', 'Mix'],
  provider: 'website' as const,
  isPartial: false,
};

function mockExtract(overrides: Partial<ReturnType<typeof useExtractRecipe>> = {}) {
  vi.mocked(useExtractRecipe).mockReturnValue({
    mutate: vi.fn((_url, opts) => opts?.onSuccess?.(extractedRecipe)),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  } as never);
}

function mockSave(overrides: Partial<ReturnType<typeof useSaveImport>> = {}) {
  vi.mocked(useSaveImport).mockReturnValue({
    mutate: vi.fn((_data, opts) => opts?.onSuccess?.(undefined)),
    reset: vi.fn(),
    isPending: false,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockExtract();
  mockSave();
});

describe('ImportRecipeDialog', () => {
  it('fetches the recipe and populates editable fields on success', async () => {
    renderWithProviders(<ImportRecipeDialog open onOpenChange={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/source/i), 'https://example.com/recipe');
    await user.click(screen.getByRole('button', { name: /fetch recipe/i }));

    expect(screen.getByDisplayValue('Tabbouleh')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A fresh salad')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20 min')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10 min')).toBeInTheDocument();
    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    expect(screen.getByDisplayValue('320')).toBeInTheDocument();
    expect(screen.getByLabelText(/ingredients/i)).toHaveValue('Bulgur\nParsley');
  });

  it('saves the description, cook time, servings, and calories as edited', async () => {
    renderWithProviders(<ImportRecipeDialog open onOpenChange={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/source/i), 'https://example.com/recipe');
    await user.click(screen.getByRole('button', { name: /fetch recipe/i }));

    await user.clear(screen.getByLabelText(/description/i));
    await user.type(screen.getByLabelText(/description/i), 'An even fresher salad');
    await user.clear(screen.getByLabelText(/^cook time$/i));
    await user.type(screen.getByLabelText(/^cook time$/i), '15 min');
    await user.clear(screen.getByLabelText(/servings/i));
    await user.type(screen.getByLabelText(/servings/i), '6');
    await user.clear(screen.getByLabelText(/calories/i));
    await user.type(screen.getByLabelText(/calories/i), '400');
    await user.click(screen.getByRole('button', { name: /add to cook later/i }));

    const saveMutate = vi.mocked(useSaveImport).mock.results[0].value.mutate;
    expect(saveMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'An even fresher salad',
        cookTimeMin: 15,
        servings: 6,
        calories: 400,
      }),
      expect.any(Object),
    );
  });

  it('saves with every selected meal tag', async () => {
    renderWithProviders(<ImportRecipeDialog open onOpenChange={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/source/i), 'https://example.com/recipe');
    await user.click(screen.getByRole('button', { name: /fetch recipe/i }));

    await user.click(screen.getByText('Lunch'));
    await user.click(screen.getByText('Dinner'));
    await user.click(screen.getByRole('button', { name: /add to cook later/i }));

    const saveMutate = vi.mocked(useSaveImport).mock.results[0].value.mutate;
    expect(saveMutate).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['lunch', 'dinner'] }),
      expect.any(Object),
    );
  });

  it('deselecting a tag removes it from the saved list', async () => {
    renderWithProviders(<ImportRecipeDialog open onOpenChange={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/source/i), 'https://example.com/recipe');
    await user.click(screen.getByRole('button', { name: /fetch recipe/i }));

    const lunch = screen.getByText('Lunch');
    await user.click(lunch);
    await user.click(screen.getByText('Dinner'));
    await user.click(lunch); // deselect

    await user.click(screen.getByRole('button', { name: /add to cook later/i }));

    const saveMutate = vi.mocked(useSaveImport).mock.results[0].value.mutate;
    expect(saveMutate).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['dinner'] }),
      expect.any(Object),
    );
  });

  it('saves with an empty tags array when no meal tag is selected', async () => {
    renderWithProviders(<ImportRecipeDialog open onOpenChange={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/source/i), 'https://example.com/recipe');
    await user.click(screen.getByRole('button', { name: /fetch recipe/i }));
    await user.click(screen.getByRole('button', { name: /add to cook later/i }));

    const saveMutate = vi.mocked(useSaveImport).mock.results[0].value.mutate;
    expect(saveMutate).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [] }),
      expect.any(Object),
    );
  });

  it('shows the partial-detection warning when the extraction is incomplete', async () => {
    mockExtract({
      mutate: vi.fn((_url, opts) =>
        opts?.onSuccess?.({ ...extractedRecipe, isPartial: true, ingredients: [], steps: [] }),
      ),
    });
    renderWithProviders(<ImportRecipeDialog open onOpenChange={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/source/i), 'https://example.com/recipe');
    await user.click(screen.getByRole('button', { name: /fetch recipe/i }));

    expect(
      screen.getByText(/some details couldn.t be detected/i),
    ).toBeInTheDocument();
  });

  it('shows an error message when extraction fails', async () => {
    mockExtract({
      mutate: vi.fn((_url, opts) => opts?.onError?.(new Error('Failed to fetch recipe'))),
      isError: true,
      error: new Error('Failed to fetch recipe'),
    });
    renderWithProviders(<ImportRecipeDialog open onOpenChange={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/source/i), 'https://example.com/recipe');
    await user.click(screen.getByRole('button', { name: /fetch recipe/i }));

    expect(screen.getByText('Failed to fetch recipe')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Failed to fetch recipe');
  });
});
