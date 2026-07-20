// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { FeaturedRecipesCarousel } from '../FeaturedRecipesCarousel';

vi.mock('@/hooks/useRecipes', () => ({
  useRecipes: vi.fn(),
}));
vi.mock('@/contexts/CookLaterContext', () => ({
  useCookLater: vi.fn(),
}));

import { useRecipes } from '@/hooks/useRecipes';
import { useCookLater } from '@/contexts/CookLaterContext';

const featuredRecipe = {
  id: 'r1',
  title: 'Tabbouleh',
  titleFr: null,
  imageUrl: 'https://example.com/pic.jpg',
  prepTimeMin: 20,
  servings: 4,
  category: 'Regular',
};

function mockUseRecipes(overrides: Partial<ReturnType<typeof useRecipes>> = {}) {
  vi.mocked(useRecipes).mockReturnValue({
    data: { data: [featuredRecipe], meta: { page: 1, limit: 8, total: 1, totalPages: 1 } },
    isLoading: false,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRecipes();
  vi.mocked(useCookLater).mockReturnValue({
    isRecipeSaved: () => false,
    saveRecipe: vi.fn(),
    unsaveRecipe: vi.fn(),
    isSaving: false,
    savedRecipes: [],
    isLoading: false,
    markAsCooked: vi.fn(),
  } as never);
});

describe('FeaturedRecipesCarousel', () => {
  it('fetches only featured recipes', () => {
    renderWithProviders(<FeaturedRecipesCarousel />);
    expect(useRecipes).toHaveBeenCalledWith({ featured: true }, 1, 8);
  });

  it('renders a card for each featured recipe', () => {
    renderWithProviders(<FeaturedRecipesCarousel />);
    expect(screen.getByText('Tabbouleh')).toBeInTheDocument();
  });

  it('renders nothing while loading', () => {
    mockUseRecipes({ data: undefined, isLoading: true });
    const { container } = renderWithProviders(<FeaturedRecipesCarousel />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no featured recipes', () => {
    mockUseRecipes({ data: { data: [], meta: { page: 1, limit: 8, total: 0, totalPages: 1 } } });
    const { container } = renderWithProviders(<FeaturedRecipesCarousel />);
    expect(container).toBeEmptyDOMElement();
  });
});
