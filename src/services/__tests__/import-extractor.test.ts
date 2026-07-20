import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/storage', () => ({
  uploadObject: vi.fn().mockResolvedValue(undefined),
  getPublicUrl: vi.fn((key: string) => `https://pub-xxx.r2.dev/${key}`),
}));
vi.mock('../ai.service', () => ({
  structureRecipeCaption: vi.fn(),
}));

import { extractRecipeFromUrl } from '../import-extractor';
import { uploadObject } from '@/lib/storage';
import { structureRecipeCaption } from '../ai.service';

const JSON_LD_HTML = (imageUrl: string) => `
<html><head>
<script type="application/ld+json">
${JSON.stringify({
  '@type': 'Recipe',
  name: 'Test Recipe',
  image: imageUrl,
  recipeIngredient: ['1 egg'],
  recipeInstructions: ['Cook it'],
})}
</script>
</head><body></body></html>
`;

function mockFetchSequence(responses: Array<Partial<Response> & { body?: ArrayBuffer }>) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      statusText: r.statusText ?? 'OK',
      headers: r.headers ?? new Headers(),
      text: r.text ?? (async () => ''),
      arrayBuffer: r.arrayBuffer ?? (async () => new ArrayBuffer(0)),
    } as Response);
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('extractRecipeFromUrl — image re-hosting', () => {
  it('re-hosts the scraped image to R2 when it is a small, allowed MIME type', async () => {
    mockFetchSequence([
      {
        text: async () => JSON_LD_HTML('https://scraped.example/pic.jpg'),
      },
      {
        headers: new Headers({ 'content-type': 'image/jpeg', 'content-length': '1000' }),
        arrayBuffer: async () => new ArrayBuffer(1000),
      },
    ]);

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(result.imageUrl).toMatch(/^https:\/\/pub-xxx\.r2\.dev\/recipes\/imports\//);
    expect(uploadObject).toHaveBeenCalledTimes(1);
  });

  it('falls back to the original URL when the image content-type is not allowed', async () => {
    mockFetchSequence([
      { text: async () => JSON_LD_HTML('https://scraped.example/pic.gif') },
      { headers: new Headers({ 'content-type': 'image/gif' }) },
    ]);

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(result.imageUrl).toBe('https://scraped.example/pic.gif');
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it('falls back to the original URL when the declared content-length exceeds 2MB', async () => {
    mockFetchSequence([
      { text: async () => JSON_LD_HTML('https://scraped.example/big.jpg') },
      {
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': String(3 * 1024 * 1024),
        }),
      },
    ]);

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(result.imageUrl).toBe('https://scraped.example/big.jpg');
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it('falls back to the original URL when fetching the image fails', async () => {
    mockFetchSequence([
      { text: async () => JSON_LD_HTML('https://scraped.example/pic.jpg') },
      { ok: false, status: 403, statusText: 'Forbidden' },
    ]);

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(result.imageUrl).toBe('https://scraped.example/pic.jpg');
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it('does not attempt to re-host when no image was extracted', async () => {
    mockFetchSequence([{ text: async () => '<html><head></head><body></body></html>' }]);

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(result.imageUrl).toBeNull();
    expect(uploadObject).not.toHaveBeenCalled();
  });
});

const OG_ONLY_HTML = (description: string) => `
<html><head>
<meta property="og:title" content="Check out this dish 😍 #recipe #foodie" />
<meta property="og:description" content="${description}" />
</head><body></body></html>
`;

describe('extractRecipeFromUrl — caption structuring (Open Graph fallback)', () => {
  it('structures the caption into a clean title/ingredients/steps and clears isPartial', async () => {
    vi.mocked(structureRecipeCaption).mockResolvedValue({
      title: 'Creamy Chicken Pasta',
      ingredients: ['200g pasta', '2 chicken breasts'],
      steps: ['Cook the pasta', 'Grill the chicken'],
    });
    mockFetchSequence([{ text: async () => OG_ONLY_HTML('Creamy chicken pasta! Ingredients: 200g pasta, 2 chicken breasts. Steps: cook pasta, grill chicken. #recipe') }]);

    const result = await extractRecipeFromUrl('https://instagram.com/p/abc');

    expect(structureRecipeCaption).toHaveBeenCalledWith(
      expect.stringContaining('Ingredients: 200g pasta'),
    );
    expect(result.title).toBe('Creamy Chicken Pasta');
    expect(result.ingredients).toEqual(['200g pasta', '2 chicken breasts']);
    expect(result.steps).toEqual(['Cook the pasta', 'Grill the chicken']);
    expect(result.isPartial).toBe(false);
  });

  it('falls back to the raw og:title and empty ingredients/steps when the AI call fails', async () => {
    vi.mocked(structureRecipeCaption).mockRejectedValue(new Error('AI returned an empty response'));
    mockFetchSequence([{ text: async () => OG_ONLY_HTML('Some caption text') }]);

    const result = await extractRecipeFromUrl('https://instagram.com/p/abc');

    expect(result.title).toBe('Check out this dish 😍 #recipe #foodie');
    expect(result.ingredients).toEqual([]);
    expect(result.steps).toEqual([]);
    expect(result.isPartial).toBe(true);
  });

  it('keeps the raw og:title when the AI resolves but finds no real ingredients/steps', async () => {
    // Regression: many real captions are unstructured prose the AI can't
    // split into ingredients/steps at all. Overwriting the (often
    // full-caption) og:title with the AI's empty-handed "clean" title in
    // that case would silently throw away the only place left for the
    // user to see and manually copy the recipe text — strictly worse than
    // pre-AI behavior, not an improvement.
    vi.mocked(structureRecipeCaption).mockResolvedValue({
      title: 'A Nice Dish',
      ingredients: [],
      steps: [],
    });
    mockFetchSequence([{ text: async () => OG_ONLY_HTML('Just a nice dish, no clear recipe format here') }]);

    const result = await extractRecipeFromUrl('https://instagram.com/p/abc');

    expect(result.title).toBe('Check out this dish 😍 #recipe #foodie');
    expect(result.ingredients).toEqual([]);
    expect(result.steps).toEqual([]);
    expect(result.isPartial).toBe(true);
  });

  it('does not call the AI when JSON-LD extraction already succeeded', async () => {
    mockFetchSequence([{ text: async () => JSON_LD_HTML('https://scraped.example/pic.jpg') }, { ok: false, status: 403 }]);

    await extractRecipeFromUrl('https://example.com/recipe');

    expect(structureRecipeCaption).not.toHaveBeenCalled();
  });

  it('does not call the AI when there is no og:description to structure', async () => {
    mockFetchSequence([
      {
        text: async () =>
          '<html><head><meta property="og:title" content="A Recipe" /></head><body></body></html>',
      },
    ]);

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(structureRecipeCaption).not.toHaveBeenCalled();
    expect(result.title).toBe('A Recipe');
    expect(result.isPartial).toBe(true);
  });
});
