// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RecipeCard, type Recipe } from '../RecipeCard';

vi.mock('@/contexts/CookLaterContext', () => ({
  useCookLater: vi.fn(),
}));

import { useCookLater } from '@/contexts/CookLaterContext';

const baseRecipe: Recipe = {
  id: 'r1',
  title: 'Tabbouleh',
  titleFr: 'Taboulé',
  imageUrl: 'https://example.com/pic.jpg',
  prepTimeMin: 20,
  servings: 4,
  category: 'Regular',
};

function mockCookLater(overrides: Partial<ReturnType<typeof useCookLater>> = {}) {
  vi.mocked(useCookLater).mockReturnValue({
    isRecipeSaved: () => false,
    saveRecipe: vi.fn(),
    unsaveRecipe: vi.fn(),
    isSaving: false,
    savedRecipes: [],
    isLoading: false,
    markAsCooked: vi.fn(),
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCookLater();
});

describe('RecipeCard', () => {
  it('renders the title, prep time, servings, and a link to the recipe', () => {
    renderWithProviders(<RecipeCard recipe={baseRecipe} />);

    expect(screen.getByText('Tabbouleh')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('4 servings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view recipe/i })).toHaveAttribute(
      'href',
      '/recipes/r1',
    );
  });

  it('saves the recipe when the bookmark is toggled while unsaved', async () => {
    const saveRecipe = vi.fn();
    mockCookLater({ saveRecipe });
    renderWithProviders(<RecipeCard recipe={baseRecipe} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(saveRecipe).toHaveBeenCalledWith('r1');
  });

  it('unsaves the recipe when the bookmark is toggled while already saved', async () => {
    const unsaveRecipe = vi.fn();
    mockCookLater({ isRecipeSaved: () => true, unsaveRecipe });
    renderWithProviders(<RecipeCard recipe={baseRecipe} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(unsaveRecipe).toHaveBeenCalledWith('r1');
  });

  it('shows the AI Recommended badge only when aiRecommended is true', () => {
    const { rerender } = renderWithProviders(<RecipeCard recipe={baseRecipe} />);
    expect(screen.queryByText(/ai recommended/i)).not.toBeInTheDocument();

    rerender(<RecipeCard recipe={{ ...baseRecipe, aiRecommended: true }} />);
    expect(screen.getByText(/ai recommended/i)).toBeInTheDocument();
  });

  it('shows a non-published status badge but hides it for published recipes', () => {
    const { rerender } = renderWithProviders(
      <RecipeCard recipe={{ ...baseRecipe, status: 'draft' }} />,
    );
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<RecipeCard recipe={{ ...baseRecipe, status: 'published' }} />);
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Published')).not.toBeInTheDocument();
  });
});
