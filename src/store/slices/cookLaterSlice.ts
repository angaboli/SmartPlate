import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  dateAdded: string; // ISO string for Redux serialization
  tag?: RecipeTag;
  isCooked?: boolean;
}

interface CookLaterState {
  savedRecipes: SavedRecipe[];
}

const initialState: CookLaterState = {
  savedRecipes: [],
};

const cookLaterSlice = createSlice({
  name: 'cookLater',
  initialState,
  reducers: {
    addRecipe(state, action: PayloadAction<Omit<SavedRecipe, 'id' | 'dateAdded'>>) {
      const newRecipe: SavedRecipe = {
        ...action.payload,
        id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        dateAdded: new Date().toISOString(),
      };
      state.savedRecipes.unshift(newRecipe);
    },
    removeRecipe(state, action: PayloadAction<string>) {
      state.savedRecipes = state.savedRecipes.filter((r) => r.id !== action.payload);
    },
    updateRecipe(
      state,
      action: PayloadAction<{ id: string; updates: Partial<SavedRecipe> }>
    ) {
      const index = state.savedRecipes.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.savedRecipes[index] = {
          ...state.savedRecipes[index],
          ...action.payload.updates,
        };
      }
    },
    markAsCooked(state, action: PayloadAction<{ id: string; cooked: boolean }>) {
      const index = state.savedRecipes.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.savedRecipes[index].isCooked = action.payload.cooked;
      }
    },
  },
});

export const { addRecipe, removeRecipe, updateRecipe, markAsCooked } = cookLaterSlice.actions;

export const selectSavedRecipes = (state: { cookLater: CookLaterState }) =>
  state.cookLater.savedRecipes;

export default cookLaterSlice.reducer;
