'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setLanguage as setLanguageAction,
  selectLanguage,
  translate,
  type Language,
} from '@/store/slices/languageSlice';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

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
      // Sync cookie with localStorage value
      document.cookie = `${STORAGE_KEY}=${stored}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
    } else {
      const detected = navigator.language.startsWith('fr') ? 'fr' : 'en';
      localStorage.setItem(STORAGE_KEY, detected);
      document.cookie = `${STORAGE_KEY}=${detected}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
      dispatch(setLanguageAction(detected));
    }
  }, [dispatch]);

  const setLanguage = (lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.cookie = `${STORAGE_KEY}=${lang}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
    dispatch(setLanguageAction(lang));

    // Fire-and-forget API sync for authenticated users
    const auth = localStorage.getItem('auth');
    if (auth) {
      fetchWithAuth('/api/v1/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      }).catch(() => {});
    }
  };

  const t = (key: string): string => {
    return translate(language, key);
  };

  return { language, setLanguage, t };
}
