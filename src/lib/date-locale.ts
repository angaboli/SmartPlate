import { format } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import type { Language } from '@/store/slices/languageSlice';

const locales = { en: enUS, fr } as const;

export function formatDate(
  date: Date | number | string,
  pattern: string,
  language: Language,
): string {
  return format(new Date(date), pattern, { locale: locales[language] });
}
