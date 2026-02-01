/**
 * Translation completeness checker.
 * Run: npx tsx scripts/check-translations.ts
 *
 * Diffs EN keys vs FR keys and reports any mismatches.
 */

import en from '../src/locales/en.json';
import fr from '../src/locales/fr.json';

const enKeys = new Set(Object.keys(en));
const frKeys = new Set(Object.keys(fr));

const missingInFr = [...enKeys].filter((k) => !frKeys.has(k));
const missingInEn = [...frKeys].filter((k) => !enKeys.has(k));

let exitCode = 0;

if (missingInFr.length > 0) {
  console.error(`\nKeys in EN but missing in FR (${missingInFr.length}):`);
  missingInFr.forEach((k) => console.error(`  - ${k}`));
  exitCode = 1;
}

if (missingInEn.length > 0) {
  console.error(`\nKeys in FR but missing in EN (${missingInEn.length}):`);
  missingInEn.forEach((k) => console.error(`  - ${k}`));
  exitCode = 1;
}

if (exitCode === 0) {
  console.log(`All ${enKeys.size} keys match between EN and FR.`);
} else {
  console.error(`\nTotal: EN=${enKeys.size}, FR=${frKeys.size}`);
}

process.exit(exitCode);
