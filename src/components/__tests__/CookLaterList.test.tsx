// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { CookLaterList } from '../CookLaterList';
import type { SavedRecipeDTO } from '@/hooks/useCookLater';

vi.mock('@/contexts/CookLaterContext', () => ({
  useCookLater: vi.fn(),
}));

import { useCookLater } from '@/contexts/CookLaterContext';

const savedRecipe: SavedRecipeDTO = {
  id: 's1',
  userId: 'u1',
  recipeId: 'r1',
  tags: ['lunch', 'dinner'],
  isCooked: false,
  createdAt: '2026-01-15T00:00:00.000Z',
  recipe: {
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
    category: 'Regular',
    goal: null,
    aiRecommended: false,
    isImported: false,
    sourceUrl: null,
    sourceProvider: null,
    ingredients: [
      { id: 'i1', text: 'Bulgur', textFr: null, sortOrder: 0 },
      { id: 'i2', text: 'Parsley', textFr: null, sortOrder: 1 },
    ],
    steps: [],
  },
};

function mockCookLater(overrides: Partial<ReturnType<typeof useCookLater>> = {}) {
  vi.mocked(useCookLater).mockReturnValue({
    savedRecipes: [savedRecipe],
    isLoading: false,
    unsaveRecipe: vi.fn(),
    markAsCooked: vi.fn(),
    saveRecipe: vi.fn(),
    isRecipeSaved: () => true,
    isSaving: false,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCookLater();
});

describe('CookLaterList', () => {
  it('shows a loading spinner while fetching', () => {
    mockCookLater({ savedRecipes: [], isLoading: true });
    const { container } = renderWithProviders(<CookLaterList />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows the empty state when there are no saved recipes', () => {
    mockCookLater({ savedRecipes: [] });
    renderWithProviders(<CookLaterList />);

    expect(screen.getByText('No recipes saved yet')).toBeInTheDocument();
  });

  it('renders recipe details, tags, and a preview of the ingredients', () => {
    renderWithProviders(<CookLaterList />);

    expect(screen.getByText('Tabbouleh')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('4 servings')).toBeInTheDocument();
    expect(screen.getByText('300 cal')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('Bulgur, Parsley')).toBeInTheDocument();
  });

  it('marks a recipe as cooked and toggles the button label', async () => {
    const markAsCooked = vi.fn();
    mockCookLater({ markAsCooked });
    renderWithProviders(<CookLaterList />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /mark as cooked/i }));

    expect(markAsCooked).toHaveBeenCalledWith('s1', true);
  });

  it('shows a "Cooked" label and dims the card when already cooked', () => {
    mockCookLater({ savedRecipes: [{ ...savedRecipe, isCooked: true }] });
    renderWithProviders(<CookLaterList />);

    expect(screen.getByRole('button', { name: /^cooked$/i })).toBeInTheDocument();
  });

  it('removes a saved recipe', async () => {
    const unsaveRecipe = vi.fn();
    mockCookLater({ unsaveRecipe });
    renderWithProviders(<CookLaterList />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /remove/i }));

    expect(unsaveRecipe).toHaveBeenCalledWith('r1');
  });
});
