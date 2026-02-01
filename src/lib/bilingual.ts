/**
 * Return the localised string for a bilingual field pair.
 * If the preferred language text is empty, falls back to the other language.
 */
export function bi(
  en: string | null | undefined,
  fr: string | null | undefined,
  language: string,
): string {
  if (language === 'fr') {
    return fr?.trim() ? fr : (en ?? '');
  }
  return en?.trim() ? en : (fr ?? '');
}
