import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import { uploadObject, getPublicUrl } from '@/lib/storage';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MIME_EXTENSIONS,
} from '@/lib/validations/upload';

export interface ExtractedRecipe {
  title: string;
  description: string | null;
  imageUrl: string | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  servings: number | null;
  ingredients: string[];
  steps: string[];
  provider: 'instagram' | 'tiktok' | 'youtube' | 'website';
  isPartial: boolean;
}

/**
 * Detect provider from URL hostname.
 */
function detectProvider(url: string): ExtractedRecipe['provider'] {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be'))
      return 'youtube';
    return 'website';
  } catch {
    return 'website';
  }
}

/**
 * Parse ISO 8601 duration (e.g. "PT30M", "PT1H15M") to minutes.
 */
function parseDuration(iso: string | undefined | null): number | null {
  if (!iso || typeof iso !== 'string') return null;
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return null;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  const total = hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
  return total > 0 ? total : null;
}

/**
 * Parse servings from recipeYield (e.g. "4 servings", "4", ["4 servings"]).
 */
function parseServings(
  recipeYield: string | string[] | number | undefined | null,
): number | null {
  if (recipeYield == null) return null;
  const raw = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
  if (typeof raw === 'number') return raw;
  const match = String(raw).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Normalize recipeInstructions from JSON-LD (can be strings, HowToStep objects, or HowToSection arrays).
 */
function normalizeInstructions(
  instructions: unknown,
): string[] {
  if (!instructions) return [];

  if (typeof instructions === 'string') {
    return instructions
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (Array.isArray(instructions)) {
    const result: string[] = [];
    for (const item of instructions) {
      if (typeof item === 'string') {
        result.push(item.trim());
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        // HowToStep
        if (obj.text && typeof obj.text === 'string') {
          result.push(obj.text.trim());
        } else if (obj.name && typeof obj.name === 'string') {
          result.push(obj.name.trim());
        }
        // HowToSection — recurse into itemListElement
        if (Array.isArray(obj.itemListElement)) {
          result.push(...normalizeInstructions(obj.itemListElement));
        }
      }
    }
    return result.filter(Boolean);
  }

  return [];
}

/**
 * Extract recipe data from a JSON-LD Recipe object.
 */
function extractFromJsonLd(
  recipe: Record<string, unknown>,
  provider: ExtractedRecipe['provider'],
): ExtractedRecipe {
  const title = String(recipe.name || '').trim();
  const description =
    typeof recipe.description === 'string'
      ? recipe.description.trim() || null
      : null;

  let imageUrl: string | null = null;
  if (typeof recipe.image === 'string') {
    imageUrl = recipe.image;
  } else if (Array.isArray(recipe.image) && recipe.image.length > 0) {
    const first = recipe.image[0];
    imageUrl =
      typeof first === 'string'
        ? first
        : typeof first === 'object' && first && 'url' in first
          ? String((first as Record<string, unknown>).url)
          : null;
  } else if (
    recipe.image &&
    typeof recipe.image === 'object' &&
    'url' in recipe.image
  ) {
    imageUrl = String((recipe.image as Record<string, unknown>).url);
  }

  const prepTimeMin = parseDuration(recipe.prepTime as string);
  const cookTimeMin = parseDuration(recipe.cookTime as string);
  const servings = parseServings(
    recipe.recipeYield as string | string[] | number,
  );

  const ingredients: string[] = Array.isArray(recipe.recipeIngredient)
    ? recipe.recipeIngredient
        .map((i: unknown) => (typeof i === 'string' ? i.trim() : ''))
        .filter(Boolean)
    : [];

  const steps = normalizeInstructions(recipe.recipeInstructions);

  const isPartial = ingredients.length === 0 && steps.length === 0;

  return {
    title,
    description,
    imageUrl,
    prepTimeMin,
    cookTimeMin,
    servings,
    ingredients,
    steps,
    provider,
    isPartial,
  };
}

/**
 * Extract recipe data from Open Graph meta tags as fallback.
 */
function extractFromOpenGraph(
  $: cheerio.CheerioAPI,
  provider: ExtractedRecipe['provider'],
): ExtractedRecipe {
  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').text().trim() ||
    '';
  const description =
    $('meta[property="og:description"]').attr('content')?.trim() || null;
  const imageUrl =
    $('meta[property="og:image"]').attr('content')?.trim() || null;

  return {
    title,
    description,
    imageUrl,
    prepTimeMin: null,
    cookTimeMin: null,
    servings: null,
    ingredients: [],
    steps: [],
    provider,
    isPartial: true,
  };
}

/**
 * Download a scraped image and re-host it on R2, instead of keeping a
 * direct hotlink to the source (Instagram/TikTok/YouTube CDNs frequently
 * block hotlinking, rotate URLs, or 403 for non-browser requests, which
 * silently breaks the recipe's image later). Best-effort: any failure
 * falls back to the original URL rather than blocking the import — the
 * page's <img> already degrades gracefully via ImageWithFallback.
 */
async function rehostImage(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SmartPlateBot/1.0; +https://smartplate.app)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type')?.split(';')[0].trim();
    if (
      !contentType ||
      !(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(contentType)
    ) {
      return null;
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_UPLOAD_SIZE_BYTES) {
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_UPLOAD_SIZE_BYTES) return null;

    const ext = MIME_EXTENSIONS[contentType as keyof typeof MIME_EXTENSIONS];
    const key = `recipes/imports/${randomUUID()}.${ext}`;
    await uploadObject(key, bytes, contentType);
    return getPublicUrl(key);
  } catch {
    return null;
  }
}

/**
 * Main extraction function: fetches a URL and extracts recipe data.
 *
 * Strategy:
 * 1. Fetch HTML
 * 2. Look for JSON-LD with @type: "Recipe"
 * 3. Fall back to Open Graph meta tags
 */
export async function extractRecipeFromUrl(
  url: string,
): Promise<ExtractedRecipe> {
  const provider = detectProvider(url);

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; SmartPlateBot/1.0; +https://smartplate.app)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  let extracted: ExtractedRecipe | null = null;

  // Strategy 1: JSON-LD
  const jsonLdScripts = $('script[type="application/ld+json"]');
  outer: for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const raw = $(jsonLdScripts[i]).html();
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      // Could be a single object or an array
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const candidate of candidates) {
        // Direct Recipe type
        if (
          candidate['@type'] === 'Recipe' ||
          (Array.isArray(candidate['@type']) &&
            candidate['@type'].includes('Recipe'))
        ) {
          extracted = extractFromJsonLd(candidate, provider);
          break outer;
        }

        // Inside @graph array
        if (Array.isArray(candidate['@graph'])) {
          for (const node of candidate['@graph']) {
            if (
              node['@type'] === 'Recipe' ||
              (Array.isArray(node['@type']) &&
                node['@type'].includes('Recipe'))
            ) {
              extracted = extractFromJsonLd(node, provider);
              break outer;
            }
          }
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  // Strategy 2: Open Graph fallback
  if (!extracted) {
    extracted = extractFromOpenGraph($, provider);
  }

  if (extracted.imageUrl) {
    const rehosted = await rehostImage(extracted.imageUrl);
    if (rehosted) extracted.imageUrl = rehosted;
  }

  return extracted;
}
