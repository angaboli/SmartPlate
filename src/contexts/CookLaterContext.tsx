import { createContext, useContext, useState, ReactNode } from 'react';

export type RecipeSource = 'Instagram' | 'TikTok' | 'YouTube' | 'Other';
export type RecipeTag = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface SavedRecipe {
  id: string;
  title: string;
  image?: string;
  source: RecipeSource;
  sourceUrl: string;
  author?: string;
  prepTime?: string;
  ingredients?: string[];
  steps?: string[];
  dateAdded: Date;
  tag?: RecipeTag;
  isCooked?: boolean;
}

interface CookLaterContextType {
  savedRecipes: SavedRecipe[];
  addRecipe: (recipe: Omit<SavedRecipe, 'id' | 'dateAdded'>) => void;
  removeRecipe: (id: string) => void;
  updateRecipe: (id: string, updates: Partial<SavedRecipe>) => void;
  markAsCooked: (id: string, cooked: boolean) => void;
}

const CookLaterContext = createContext<CookLaterContextType | undefined>(undefined);

export function CookLaterProvider({ children }: { children: ReactNode }) {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);

  const addRecipe = (recipe: Omit<SavedRecipe, 'id' | 'dateAdded'>) => {
    const newRecipe: SavedRecipe = {
      ...recipe,
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dateAdded: new Date(),
    };
    setSavedRecipes((prev) => [newRecipe, ...prev]);
  };

  const removeRecipe = (id: string) => {
    setSavedRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
  };

  const updateRecipe = (id: string, updates: Partial<SavedRecipe>) => {
    setSavedRecipes((prev) =>
      prev.map((recipe) => (recipe.id === id ? { ...recipe, ...updates } : recipe))
    );
  };

  const markAsCooked = (id: string, cooked: boolean) => {
    updateRecipe(id, { isCooked: cooked });
  };

  return (
    <CookLaterContext.Provider
      value={{
        savedRecipes,
        addRecipe,
        removeRecipe,
        updateRecipe,
        markAsCooked,
      }}
    >
      {children}
    </CookLaterContext.Provider>
  );
}

export function useCookLater() {
  const context = useContext(CookLaterContext);
  if (context === undefined) {
    throw new Error('useCookLater must be used within a CookLaterProvider');
  }
  return context;
}
