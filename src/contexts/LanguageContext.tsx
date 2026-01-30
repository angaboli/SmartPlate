'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setLanguage as setLanguageAction,
  selectLanguage,
  translate,
  type Language,
} from '@/store/slices/languageSlice';

export type { Language };

export function useLanguage() {
  const dispatch = useAppDispatch();
  const language = useAppSelector(selectLanguage);

  const setLanguage = (lang: Language) => {
    dispatch(setLanguageAction(lang));
  };

  const t = (key: string): string => {
    return translate(language, key);
  };

  return { language, setLanguage, t };
}
