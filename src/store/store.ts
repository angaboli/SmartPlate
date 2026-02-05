import { configureStore } from '@reduxjs/toolkit';
import languageReducer from './slices/languageSlice';
import authReducer from './slices/authSlice';
import type { Language } from './slices/languageSlice';

export function makeStore(initialLanguage: Language = 'en') {
  return configureStore({
    reducer: {
      language: languageReducer,
      auth: authReducer,
    },
    preloadedState: {
      language: { language: initialLanguage },
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
