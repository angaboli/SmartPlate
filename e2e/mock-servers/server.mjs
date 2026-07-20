// Tiny dependency-free HTTP server used only during Playwright E2E runs.
// It stands in for two external services the app calls server-side (so
// Playwright's browser-level network mocking can't reach them):
//   - OpenAI (src/services/ai.service.ts, pointed here via OPENAI_BASE_URL)
//   - The scraped recipe page for the import flow (GET /recipe-fixture)
import http from 'node:http';

const PORT = Number(process.env.MOCK_SERVER_PORT || 4010);

const RECIPE_FIXTURE_HTML = `<!doctype html>
<html>
<head>
<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org/',
  '@type': 'Recipe',
  name: 'E2E Mock Tabbouleh',
  description: 'A fixture recipe served locally for Playwright E2E tests.',
  prepTime: 'PT20M',
  recipeYield: '4 servings',
  recipeIngredient: ['1 cup bulgur', '1 bunch parsley', '2 tomatoes', '2 tbsp olive oil'],
  recipeInstructions: [
    'Soak the bulgur in hot water for 15 minutes.',
    'Chop the parsley and tomatoes finely.',
    'Mix everything together with olive oil and lemon juice.',
  ],
})}
</script>
</head>
<body></body>
</html>`;

function mockChatCompletionContent(requestBody) {
  const systemPrompt = requestBody?.messages?.[0]?.content ?? '';

  if (systemPrompt.includes('weekly meal plan')) {
    const meals = [
      { type: 'breakfast', name: 'Mock oatmeal', calories: 350 },
      { type: 'lunch', name: 'Mock grain bowl', calories: 500 },
      { type: 'dinner', name: 'Mock grilled salmon', calories: 550 },
      { type: 'snack', name: 'Mock fruit', calories: 150 },
    ];
    return JSON.stringify({ days: Array.from({ length: 7 }, () => ({ meals })) });
  }

  if (systemPrompt.includes('grocery')) {
    return JSON.stringify({
      items: [{ name: 'Mock bulgur', quantity: '200g', category: 'Grains' }],
    });
  }

  // Default: meal analysis (text or photo) — matches MealAnalysisResultSchema
  // in src/services/ai.service.ts.
  return JSON.stringify({
    analysisData: {
      balance: 'good',
      balanceExplanation: 'Mocked balance explanation for the E2E run.',
      nutrients: [
        { name: 'Protein', value: 30, target: 50, unit: 'g' },
        { name: 'Carbohydrates', value: 60, target: 200, unit: 'g' },
        { name: 'Fats', value: 20, target: 65, unit: 'g' },
        { name: 'Fiber', value: 10, target: 25, unit: 'g' },
      ],
      missing: ['Vitamin C'],
      overconsumption: [],
    },
    suggestions: [
      {
        type: 'add',
        title: 'Add a side salad',
        description: 'A fresh side salad would round out this meal nicely.',
      },
    ],
    totalCalories: 550,
  });
}

function chatCompletionResponse(content) {
  return JSON.stringify({
    id: 'chatcmpl-e2e-mock',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4o-mini',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/recipe-fixture') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(RECIPE_FIXTURE_HTML);
    return;
  }

  if (req.method === 'POST' && req.url?.endsWith('/chat/completions')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(chatCompletionResponse(mockChatCompletionContent(body)));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[e2e-mock-server] listening on http://127.0.0.1:${PORT}`);
});
