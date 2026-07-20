// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RecipeForm } from '../RecipeForm';
import type { RecipeDTO } from '@/hooks/useRecipes';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/hooks/useUpload', () => ({
  useUploadImage: vi.fn(),
}));

import { toast } from 'sonner';
import { useUploadImage } from '@/hooks/useUpload';

function mockUpload(overrides: Partial<ReturnType<typeof useUploadImage>> = {}) {
  vi.mocked(useUploadImage).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpload();
});

describe('RecipeForm', () => {
  it('shows a validation error and does not submit when both titles are empty', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <RecipeForm onSubmit={onSubmit} isPending={false} submitLabel="Save" />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText(/at least one title/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with the default category and empty meal types when nothing is touched', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <RecipeForm onSubmit={onSubmit} isPending={false} submitLabel="Save" />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/title \(en\)/i), 'Tabbouleh');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tabbouleh', category: 'Regular', mealTypes: [] }),
    );
  });

  it('submits with multiple selected meal types', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <RecipeForm onSubmit={onSubmit} isPending={false} submitLabel="Save" />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/title \(en\)/i), 'Tabbouleh');
    await user.click(screen.getByText('Lunch'));
    await user.click(screen.getByText('Dinner'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ mealTypes: ['lunch', 'dinner'] }),
    );
  });

  it('parses ingredients/steps textareas into trimmed, non-empty line arrays', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <RecipeForm onSubmit={onSubmit} isPending={false} submitLabel="Save" />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/title \(en\)/i), 'Tabbouleh');
    await user.type(
      screen.getByLabelText(/ingredients/i),
      '  Bulgur  {enter}{enter}Parsley{enter}',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ ingredients: ['Bulgur', 'Parsley'] }),
    );
  });

  it('shows the Status field only for admins and reports status changes', async () => {
    const onStatusChange = vi.fn();
    const { rerender } = renderWithProviders(
      <RecipeForm onSubmit={vi.fn()} isPending={false} submitLabel="Save" userRole="user" />,
    );
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument();

    rerender(
      <RecipeForm
        onSubmit={vi.fn()}
        isPending={false}
        submitLabel="Save"
        userRole="admin"
        onStatusChange={onStatusChange}
      />,
    );
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/status/i), 'published');

    expect(onStatusChange).toHaveBeenCalledWith('published');
  });

  it('prefills fields from initialData, including selected meal types', () => {
    const initialData = {
      id: 'r1',
      title: 'Tabbouleh',
      titleFr: null,
      description: null,
      descriptionFr: null,
      imageUrl: 'https://example.com/pic.jpg',
      prepTimeMin: 20,
      cookTimeMin: null,
      servings: 4,
      calories: 300,
      category: 'Dessert',
      mealTypes: ['lunch', 'dinner'],
      goal: 'balanced',
      status: 'draft',
      ingredients: [],
      steps: [],
    } as unknown as RecipeDTO;

    renderWithProviders(
      <RecipeForm onSubmit={vi.fn()} isPending={false} submitLabel="Save" initialData={initialData} />,
    );

    expect(screen.getByLabelText(/title \(en\)/i)).toHaveValue('Tabbouleh');
    expect(screen.getByLabelText(/category/i)).toHaveValue('Dessert');
    expect(screen.getByText('Lunch').className).toContain('bg-primary');
    expect(screen.getByText('Dinner').className).toContain('bg-primary');
    // 'Breakfast' also appears as a <option> in the category <select>, so
    // scope the query to the meal-type badge specifically.
    const mealTypeGroup = screen.getByText('Meal Type').parentElement as HTMLElement;
    expect(within(mealTypeGroup).getByText('Breakfast').className).not.toContain('bg-primary');
  });

  it('uploads an image and shows the preview on success', async () => {
    const mutate = vi.fn((_data, opts) => opts?.onSuccess?.('https://r2.example/pic.jpg'));
    mockUpload({ mutate });
    renderWithProviders(
      <RecipeForm onSubmit={vi.fn()} isPending={false} submitLabel="Save" />,
    );

    const file = new File([new Uint8Array(10)], 'pic.jpg', { type: 'image/jpeg' });
    const input = document.getElementById('imageUpload') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ file, purpose: 'recipe-image' }),
      expect.any(Object),
    );
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://r2.example/pic.jpg');
  });

  it('shows a toast error when the image upload fails', async () => {
    const mutate = vi.fn((_data, opts) => opts?.onError?.(new Error('Upload failed')));
    mockUpload({ mutate });
    renderWithProviders(
      <RecipeForm onSubmit={vi.fn()} isPending={false} submitLabel="Save" />,
    );

    const file = new File([new Uint8Array(10)], 'pic.jpg', { type: 'image/jpeg' });
    const input = document.getElementById('imageUpload') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    expect(toast.error).toHaveBeenCalledWith('Upload failed');
  });
});
