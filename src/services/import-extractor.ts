import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import { uploadObject, getPublicUrl } from '@/lib/storage';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MIME_EXTENSIONS,
} from '@/lib/validations/upload';
import { structureRecipeCaption, proposeMissingRecipeFields } from '@/services/ai.service';

export interface ExtractedRecipe {
  title: string;
  description: string | null;
  imageUrl: string | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  servings: number | null;
  calories: number | null;
  ingredients: string[];
  steps: string[];
  provider: 'instagram' | 'tiktok' | 'youtube' | 'website';
  isPartial: boolean;
}

/**
 * Extracts the full, untruncated video description from a YouTube watch
 * page's raw HTML. YouTube's og:description meta tag is always truncated
 * to ~200 characters — nowhere near enough to reach a recipe video's
 * ingredients/steps section, which is usually further down. The complete
 * description is embedded as a JSON string field ("shortDescription")
 * inside a large inline script blob (ytInitialPlayerResponse) that every
 * watch page ships — the same field tools like yt-dlp read. No YouTube
 * API key needed, but it depends on an undocumented internal field that
 * YouTube could change without notice; best-effort only, with the
 * caller falling back to the (truncated) og:description on any failure.
 */
function extractYouTubeFullDescription(html: string): string | null {
  const match = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
  if (!match) return null;
  try {
    // The captured text is the raw (escaped) body of a JSON string —
    // wrapping it back in quotes and parsing it is the simplest correct
    // way to undo those escapes (\n, \", unicode, etc.).
    const decoded = JSON.parse(`"${match[1]}"`);
    return typeof decoded === 'string' ? decoded.trim() || null : null;
  } catch {
    return null;
  }
}

// YouTube shows this exact boilerplate (translated per viewer locale) as
// og:description whenever a video genuinely has no description set —
// common for Shorts, whose creators rarely write one. It isn't truncated
// real content the way a normal og:description is; it's a fixed, useless
// site-wide placeholder. Matching on it lets us treat "no description"
// as no description, instead of feeding this text to the AI (wasted
// call — there's nothing to structure) or showing it to the user as if
// it said something about the video.
const YOUTUBE_GENERIC_DESCRIPTION_MARKERS = [
  'Enjoy the videos and music',
  'Profitez des vidéos et de la musique',
];

function isGenericYouTubeDescription(text: string): boolean {
  return YOUTUBE_GENERIC_DESCRIPTION_MARKERS.some((marker) => text.includes(marker));
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
 * Parse calories from schema.org NutritionInformation (e.g. "250 calories",
 * "250 kcal", or a bare number).
 */
function parseCalories(nutrition: unknown): number | null {
  if (!nutrition || typeof nutrition !== 'object') return null;
  const raw = (nutrition as Record<string, unknown>).calories;
  if (raw == null) return null;
  if (typeof raw === 'number') return Math.round(raw);
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
  const calories = parseCalories(recipe.nutrition);

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
    calories,
    ingredients,
    steps,
    provider,
    isPartial,
  };
}

/**
 * Extract recipe data from Open Graph meta tags as fallback (typically
 * Instagram/TikTok, whose caption — og:description — often has a title,
 * ingredients, and steps all run together in one block of free text).
 *
 * Asks the AI to split that caption into a clean title/ingredients/steps
 * (src/services/ai.service.ts's structureRecipeCaption) rather than
 * dumping the whole caption into the title as before. Best-effort: any
 * failure (timeout, rate limit, malformed JSON) falls back to the raw
 * og:title with empty ingredients/steps — the exact behavior this had
 * before the AI step existed — so this never turns a previously-working
 * import into a failed one.
 *
 * @param fullDescription For YouTube, og:description is truncated by
 * YouTube itself (~200 chars) and routinely cuts off before reaching a
 * video's ingredients/steps section. When available (see
 * extractYouTubeFullDescription below), the untruncated description is
 * passed in here and preferred over the OG tag.
 */
async function extractFromOpenGraph(
  $: cheerio.CheerioAPI,
  provider: ExtractedRecipe['provider'],
  fullDescription?: string | null,
): Promise<ExtractedRecipe> {
  const ogTitle =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').text().trim() ||
    '';
  const rawOgDescription =
    $('meta[property="og:description"]').attr('content')?.trim() || null;
  const ogDescription =
    provider === 'youtube' && rawOgDescription && isGenericYouTubeDescription(rawOgDescription)
      ? null
      : rawOgDescription;
  const rawDescription = fullDescription || ogDescription;
  const imageUrl =
    $('meta[property="og:image"]').attr('content')?.trim() || null;

  let title = ogTitle;
  let description = rawDescription;
  let prepTimeMin: number | null = null;
  let cookTimeMin: number | null = null;
  let servings: number | null = null;
  let ingredients: string[] = [];
  let steps: string[] = [];

  if (rawDescription) {
    try {
      const structured = await structureRecipeCaption(rawDescription);
      const foundStructure = structured.ingredients.length > 0 || structured.steps.length > 0;
      // Only trust the AI's fields when it also found real ingredients/
      // steps. Many real captions are unstructured prose the AI can't
      // split at all — in that case the raw og:title (which, for
      // Instagram/TikTok, is often the full caption) is the only place
      // left for the user to see and manually copy the recipe text.
      // Overwriting it with "clean" but empty-handed fields would
      // silently throw that text away, turning an already-imperfect
      // import into a strictly worse one.
      if (foundStructure) {
        if (structured.title) title = structured.title;
        ingredients = structured.ingredients;
        steps = structured.steps;
        // Same reasoning for description: prefer the AI's short, clean
        // one, but only once we know it actually engaged with real
        // recipe content — otherwise keep the raw caption/description
        // as the fallback the user can still read.
        if (structured.description) description = structured.description;
        prepTimeMin = structured.prepTimeMin;
        cookTimeMin = structured.cookTimeMin;
        servings = structured.servings;
      }
    } catch {
      // Fall through with the raw og:title/description and empty
      // ingredients/steps/timing/servings.
    }
  }

  return {
    title,
    description,
    imageUrl,
    prepTimeMin,
    cookTimeMin,
    servings,
    calories: null,
    ingredients,
    steps,
    provider,
    isPartial: ingredients.length === 0 && steps.length === 0,
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

  const fromJsonLd = extracted !== null;

  // Strategy 2: Open Graph fallback
  if (!extracted) {
    const fullDescription =
      provider === 'youtube' ? extractYouTubeFullDescription(html) : null;
    extracted = await extractFromOpenGraph($, provider, fullDescription);
  }

  // JSON-LD recipe sites usually already provide everything, but some omit
  // a description, cook time, or servings. The Open Graph fallback path
  // above already asks the AI to propose these in the same call as the
  // title/ingredients/steps structuring (structureRecipeCaption), so this
  // only runs for the JSON-LD path — avoids a second, redundant AI call on
  // the same import for fields that call already tried to fill.
  if (fromJsonLd && extracted.ingredients.length > 0) {
    const missingDescription = !extracted.description;
    const missingTiming =
      extracted.prepTimeMin == null || extracted.cookTimeMin == null || extracted.servings == null;
    if (missingDescription || missingTiming) {
      try {
        const proposed = await proposeMissingRecipeFields({
          title: extracted.title,
          ingredients: extracted.ingredients,
          steps: extracted.steps,
        });
        if (missingDescription && proposed.description) {
          extracted.description = proposed.description;
        }
        if (extracted.prepTimeMin == null && proposed.prepTimeMin != null) {
          extracted.prepTimeMin = proposed.prepTimeMin;
        }
        if (extracted.cookTimeMin == null && proposed.cookTimeMin != null) {
          extracted.cookTimeMin = proposed.cookTimeMin;
        }
        if (extracted.servings == null && proposed.servings != null) {
          extracted.servings = proposed.servings;
        }
      } catch {
        // Best-effort — leave the gaps as extracted (possibly still null).
      }
    }
  }

  if (extracted.imageUrl) {
    const rehosted = await rehostImage(extracted.imageUrl);
    if (rehosted) extracted.imageUrl = rehosted;
  }

  return extracted;
}
