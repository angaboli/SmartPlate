import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';

export type Language = 'en' | 'fr';

const translations: Record<Language, Record<string, string>> = { en, fr };

interface LanguageState {
  language: Language;
}

const initialState: LanguageState = {
  language: 'en',
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<Language>) {
      state.language = action.payload;
    },
  },
});

export const { setLanguage } = languageSlice.actions;

export const selectLanguage = (state: { language: LanguageState }) => state.language.language;
export const selectTranslations = (state: { language: LanguageState }) =>
  translations[state.language.language];

export function translate(language: Language, key: string): string {
  return translations[language][key] || key;
}

export default languageSlice.reducer;
