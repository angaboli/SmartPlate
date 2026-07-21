import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/storage', () => ({
  uploadObject: vi.fn().mockResolvedValue(undefined),
  getPublicUrl: vi.fn((key: string) => `https://pub-xxx.r2.dev/${key}`),
}));
vi.mock('../ai.service', () => ({
  structureRecipeCaption: vi.fn(),
  proposeMissingRecipeFields: vi.fn(),
}));

import { extractRecipeFromUrl } from '../import-extractor';
import { uploadObject } from '@/lib/storage';
import { structureRecipeCaption, proposeMissingRecipeFields } from '../ai.service';

function mockStructuredCaption(
  overrides: Partial<Awaited<ReturnType<typeof structureRecipeCaption>>>,
) {
  vi.mocked(structureRecipeCaption).mockResolvedValue({
    title: '',
    description: null,
    prepTimeMin: null,
    cookTimeMin: null,
    servings: null,
    ingredients: [],
    steps: [],
    ...overrides,
  });
}

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
    mockStructuredCaption({
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
    mockStructuredCaption({
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

const JSON_LD_HTML_WITH_NUTRITION = (nutrition: unknown) => `
<html><head>
<script type="application/ld+json">
${JSON.stringify({
  '@type': 'Recipe',
  name: 'Test Recipe',
  recipeIngredient: ['1 egg'],
  recipeInstructions: ['Cook it'],
  nutrition,
})}
</script>
</head><body></body></html>
`;

describe('extractRecipeFromUrl — calories from JSON-LD nutrition info', () => {
  it('parses a "N calories" string', async () => {
    mockFetchSequence([
      { text: async () => JSON_LD_HTML_WITH_NUTRITION({ '@type': 'NutritionInformation', calories: '250 calories' }) },
    ]);

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(result.calories).toBe(250);
  });

  it('parses a bare number', async () => {
    mockFetchSequence([
      { text: async () => JSON_LD_HTML_WITH_NUTRITION({ '@type': 'NutritionInformation', calories: 480 }) },
    ]);

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(result.calories).toBe(480);
  });

  it('is null when there is no nutrition info', async () => {
    mockFetchSequence([{ text: async () => JSON_LD_HTML_WITH_NUTRITION(undefined) }]);

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(result.calories).toBeNull();
  });
});

const YOUTUBE_HTML = (fullDescription: string) => `
<html><head>
<meta property="og:title" content="Best Tabbouleh Recipe" />
<meta property="og:description" content="Best Tabbouleh Recipe! Watch how I make this fresh salad in under 20 minutes..." />
</head><body>
<script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":${JSON.stringify(fullDescription)}}};</script>
</body></html>
`;

describe('extractRecipeFromUrl — AI-proposed description/timing/servings (Open Graph fallback)', () => {
  it('uses the AI-proposed fields when real structure was found', async () => {
    mockStructuredCaption({
      title: 'Creamy Chicken Pasta',
      description: 'A quick, creamy weeknight pasta with grilled chicken.',
      prepTimeMin: 10,
      cookTimeMin: 20,
      servings: 4,
      ingredients: ['200g pasta', '2 chicken breasts'],
      steps: ['Cook the pasta', 'Grill the chicken'],
    });
    mockFetchSequence([{ text: async () => OG_ONLY_HTML('Creamy chicken pasta caption') }]);

    const result = await extractRecipeFromUrl('https://instagram.com/p/abc');

    expect(result.description).toBe('A quick, creamy weeknight pasta with grilled chicken.');
    expect(result.prepTimeMin).toBe(10);
    expect(result.cookTimeMin).toBe(20);
    expect(result.servings).toBe(4);
  });

  it('keeps the raw description and leaves timing/servings null when no structure was found', async () => {
    mockStructuredCaption({
      title: '',
      description: 'Should be ignored',
      prepTimeMin: 10,
      ingredients: [],
      steps: [],
    });
    mockFetchSequence([{ text: async () => OG_ONLY_HTML('Just a nice dish, no clear format') }]);

    const result = await extractRecipeFromUrl('https://instagram.com/p/abc');

    expect(result.description).toBe('Just a nice dish, no clear format');
    expect(result.prepTimeMin).toBeNull();
  });
});

const JSON_LD_HTML_PARTIAL = () => `
<html><head>
<script type="application/ld+json">
${JSON.stringify({
  '@type': 'Recipe',
  name: 'Test Recipe',
  prepTime: 'PT10M',
  recipeIngredient: ['1 egg', '1 cup flour'],
  recipeInstructions: ['Mix', 'Bake'],
})}
</script>
</head><body></body></html>
`;

describe('extractRecipeFromUrl — proposing missing fields for JSON-LD recipes', () => {
  it('fills only the gaps, leaving fields the source already provided untouched', async () => {
    vi.mocked(proposeMissingRecipeFields).mockResolvedValue({
      description: 'A simple baked egg and flour dish.',
      prepTimeMin: 999, // should be ignored — prepTime was already provided
      cookTimeMin: 25,
      servings: 2,
    });
    mockFetchSequence([{ text: async () => JSON_LD_HTML_PARTIAL() }]);

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(proposeMissingRecipeFields).toHaveBeenCalledWith({
      title: 'Test Recipe',
      ingredients: ['1 egg', '1 cup flour'],
      steps: ['Mix', 'Bake'],
    });
    expect(result.prepTimeMin).toBe(10); // from JSON-LD, untouched
    expect(result.description).toBe('A simple baked egg and flour dish.');
    expect(result.cookTimeMin).toBe(25);
    expect(result.servings).toBe(2);
  });

  it('does not call the AI when the source already provides every field', async () => {
    mockFetchSequence([{
      text: async () => `<html><head><script type="application/ld+json">${JSON.stringify({
        '@type': 'Recipe',
        name: 'Complete Recipe',
        description: 'Already has one.',
        prepTime: 'PT10M',
        cookTime: 'PT20M',
        recipeYield: '4 servings',
        recipeIngredient: ['1 egg'],
        recipeInstructions: ['Cook it'],
      })}</script></head><body></body></html>`,
    }]);

    await extractRecipeFromUrl('https://example.com/recipe');

    expect(proposeMissingRecipeFields).not.toHaveBeenCalled();
  });

  it('does not call the AI when there are no ingredients/steps to reason from', async () => {
    mockFetchSequence([{
      text: async () => `<html><head><script type="application/ld+json">${JSON.stringify({
        '@type': 'Recipe',
        name: 'Empty Recipe',
      })}</script></head><body></body></html>`,
    }]);

    await extractRecipeFromUrl('https://example.com/recipe');

    expect(proposeMissingRecipeFields).not.toHaveBeenCalled();
  });

  it('does not call the AI for the Open Graph fallback path (already covered by structureRecipeCaption)', async () => {
    mockStructuredCaption({
      title: 'A Dish',
      ingredients: ['1 egg'],
      steps: ['Cook it'],
    });
    mockFetchSequence([{ text: async () => OG_ONLY_HTML('A caption') }]);

    await extractRecipeFromUrl('https://instagram.com/p/abc');

    expect(proposeMissingRecipeFields).not.toHaveBeenCalled();
  });
});

describe('extractRecipeFromUrl — YouTube full description (og:description is truncated)', () => {
  it('structures the caption from the full embedded description, not the truncated og:description', async () => {
    const fullDescription =
      'Best Tabbouleh Recipe! Watch how I make this fresh salad in under 20 minutes.\n\n' +
      'Ingredients:\n- 1 cup bulgur\n- 1 bunch parsley\n- 2 tomatoes\n\n' +
      'Steps:\n1. Soak the bulgur\n2. Chop everything\n3. Mix and serve';
    mockStructuredCaption({
      title: 'Tabbouleh',
      ingredients: ['1 cup bulgur', '1 bunch parsley', '2 tomatoes'],
      steps: ['Soak the bulgur', 'Chop everything', 'Mix and serve'],
    });
    mockFetchSequence([{ text: async () => YOUTUBE_HTML(fullDescription) }]);

    const result = await extractRecipeFromUrl('https://www.youtube.com/watch?v=abc123');

    expect(structureRecipeCaption).toHaveBeenCalledWith(
      expect.stringContaining('1 cup bulgur'),
    );
    expect(result.ingredients).toEqual(['1 cup bulgur', '1 bunch parsley', '2 tomatoes']);
    expect(result.isPartial).toBe(false);
  });

  it('treats YouTube\'s generic "no description" boilerplate as no description at all', async () => {
    // Real-world case: a YouTube Short with no description set at all —
    // shortDescription is empty, so og:description is YouTube's own
    // fixed placeholder text ("Profitez des vidéos..." / "Enjoy the
    // videos..."), not truncated real content. Showing that text to the
    // user as "the description" is actively misleading, and there's
    // nothing in it to structure, so the AI should not even be called.
    mockFetchSequence([{
      text: async () =>
        '<html><head>' +
        '<meta property="og:title" content="+1000 calories repas perte de poids de sportif! (recette Poulet coco curry)" />' +
        '<meta property="og:description" content="Profitez des vidéos et de la musique que vous aimez, mettez en ligne des contenus originaux, et partagez-les avec vos amis, vos proches et le monde entier." />' +
        '<script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":""}};</script>' +
        '</head><body></body></html>',
    }]);

    const result = await extractRecipeFromUrl('https://www.youtube.com/shorts/a-ITrZm9xm8');

    expect(structureRecipeCaption).not.toHaveBeenCalled();
    expect(result.title).toBe('+1000 calories repas perte de poids de sportif! (recette Poulet coco curry)');
    expect(result.description).toBeNull();
    expect(result.isPartial).toBe(true);
  });

  it('falls back to the truncated og:description when shortDescription is absent', async () => {
    mockStructuredCaption({
      title: '',
      ingredients: [],
      steps: [],
    });
    mockFetchSequence([{
      text: async () =>
        '<html><head><meta property="og:title" content="A Video" /><meta property="og:description" content="Truncated..." /></head><body></body></html>',
    }]);

    await extractRecipeFromUrl('https://www.youtube.com/watch?v=abc123');

    expect(structureRecipeCaption).toHaveBeenCalledWith('Truncated...');
  });

  it('does not apply the YouTube full-description logic to non-YouTube URLs', async () => {
    mockStructuredCaption({
      title: '',
      ingredients: [],
      steps: [],
    });
    // Even if the page happened to contain a shortDescription-shaped field,
    // it should be ignored for a non-YouTube provider.
    mockFetchSequence([{ text: async () => YOUTUBE_HTML('This full description should be ignored here') }]);

    await extractRecipeFromUrl('https://example.com/recipe');

    expect(structureRecipeCaption).toHaveBeenCalledWith(
      'Best Tabbouleh Recipe! Watch how I make this fresh salad in under 20 minutes...',
    );
  });
});
