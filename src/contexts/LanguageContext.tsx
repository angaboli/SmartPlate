'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setLanguage as setLanguageAction,
  selectLanguage,
  translate,
  type Language,
} from '@/store/slices/languageSlice';

export type { Language };

const STORAGE_KEY = 'smartplate-language';

export function useLanguage() {
  const dispatch = useAppDispatch();
  const language = useAppSelector(selectLanguage);

  // Hydrate language from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'fr') {
      dispatch(setLanguageAction(stored));
    } else {
      const detected = navigator.language.startsWith('fr') ? 'fr' : 'en';
      localStorage.setItem(STORAGE_KEY, detected);
      dispatch(setLanguageAction(detected));
    }
  }, [dispatch]);

  const setLanguage = (lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang);
    dispatch(setLanguageAction(lang));

    // Fire-and-forget API sync for authenticated users
    const auth = localStorage.getItem('auth');
    if (auth) {
      try {
        const { accessToken } = JSON.parse(auth);
        if (accessToken) {
          fetch('/api/v1/me', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ language: lang }),
          }).catch(() => {});
        }
      } catch {
        // ignore parse errors
      }
    }
  };

  const t = (key: string): string => {
    return translate(language, key);
  };

  return { language, setLanguage, t };
}
