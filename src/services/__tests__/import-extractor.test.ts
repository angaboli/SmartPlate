import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/storage', () => ({
  uploadObject: vi.fn().mockResolvedValue(undefined),
  getPublicUrl: vi.fn((key: string) => `https://pub-xxx.r2.dev/${key}`),
}));

import { extractRecipeFromUrl } from '../import-extractor';
import { uploadObject } from '@/lib/storage';

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
