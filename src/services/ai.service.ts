import OpenAI from 'openai';
import { z } from 'zod';
import { AppError } from '@/lib/errors';

// ─── OpenAI client ──────────────────────────────────

// AI calls run synchronously inside the API route handler (no queue/worker
// — see docs/ARCHITECTURE.md). A 25s client timeout keeps failures within
// typical serverless function limits and lets us return a clean error
// instead of the platform killing the request with an opaque timeout.
const AI_TIMEOUT_MS = 25_000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Overridable so Playwright E2E can point the server at a local mock —
  // browser-level network mocking can't reach calls this app makes
  // server-side. Unset in every real environment, so this is a no-op there.
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  timeout: AI_TIMEOUT_MS,
});

async function createChatCompletion(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
) {
  try {
    return await openai.chat.completions.create(params);
  } catch (error) {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      throw new AppError('The AI is taking too long to respond. Please try again.', 503);
    }
    throw error;
  }
}

// ─── Zod schemas for LLM output validation ─────────

const NutrientSchema = z.object({
  name: z.string(),
  value: z.number(),
  target: z.number(),
  unit: z.string(),
});

const AnalysisDataSchema = z.object({
  balance: z.enum(['excellent', 'good', 'needs-improvement']),
  balanceExplanation: z.string(),
  nutrients: z.array(NutrientSchema).min(4),
  missing: z.array(z.string()),
  overconsumption: z.array(z.string()),
});

const SuggestionSchema = z.object({
  type: z.enum(['improve', 'swap', 'add']),
  title: z.string(),
  description: z.string(),
});

export const MealAnalysisResultSchema = z.object({
  analysisData: AnalysisDataSchema,
  suggestions: z.array(SuggestionSchema).min(1),
  totalCalories: z.number().int().min(0),
});

export type MealAnalysisResult = z.infer<typeof MealAnalysisResultSchema>;

// ─── Weekly plan schemas ────────────────────────

const WeeklyMealSchema = z.object({
  type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  name: z.string(),
  calories: z.number().int().min(0),
});

const WeeklyDaySchema = z.object({
  meals: z.array(WeeklyMealSchema).length(4),
});

const WeeklyPlanResultSchema = z.object({
  days: z.array(WeeklyDaySchema).length(7),
});

export type WeeklyPlanResult = z.infer<typeof WeeklyPlanResultSchema>;

// ─── Adjust weekly plan (AI optimize existing plan) ──

export async function adjustWeeklyPlan(
  existingMeals: { dayIndex: number; type: string; name: string; calories: number }[],
  ctx: UserNutritionContext,
): Promise<WeeklyPlanResult> {
  const restrictions: string[] = [];
  if (ctx.vegetarian) restrictions.push('vegetarian');
  if (ctx.vegan) restrictions.push('vegan');
  if (ctx.glutenFree) restrictions.push('gluten-free');
  if (ctx.dairyFree) restrictions.push('dairy-free');
  if (ctx.allergies.length > 0) restrictions.push(`allergies: ${ctx.allergies.join(', ')}`);

  const restrictionsText = restrictions.length > 0
    ? `Dietary restrictions: ${restrictions.join(', ')}.`
    : 'No specific dietary restrictions.';

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentPlanText = dayNames.map((dayName, idx) => {
    const dayMeals = existingMeals.filter((m) => m.dayIndex === idx);
    if (dayMeals.length === 0) return `${dayName}: (empty)`;
    return `${dayName}:\n${dayMeals.map((m) => `  - ${m.type}: ${m.name} (${m.calories} kcal)`).join('\n')}`;
  }).join('\n');

  const langInstruction = ctx.language === 'fr'
    ? 'IMPORTANT: All meal names MUST be written in French.'
    : 'All meal names must be written in English.';

  const systemPrompt = `You are a professional nutritionist AI for SmartPlate.
You are given the user's current weekly meal plan. Optimize and adjust it to better meet their nutrition goals while preserving their general preferences and meal structure.

Daily calorie target: ${ctx.calorieTarget} kcal.
Protein target: ${ctx.proteinTargetG}g per day.
Goal: ${ctx.goal}.
${restrictionsText}

Rules:
- ${langInstruction}
- Keep meals the user likely enjoys but adjust portions/ingredients for better nutrition.
- Fill in any empty days with appropriate meals.
- Ensure each day has exactly 4 meals: breakfast, lunch, dinner, snack.
- Ensure variety — avoid repeating the same meal across days.
- Meal names should be specific and descriptive.
- Calorie estimates should be realistic.
- Return ONLY the JSON object, no markdown formatting, no code blocks.

Return a JSON object with this exact structure:
{
  "days": [
    {
      "meals": [
        { "type": "breakfast", "name": "...", "calories": 350 },
        { "type": "lunch", "name": "...", "calories": 500 },
        { "type": "dinner", "name": "...", "calories": 550 },
        { "type": "snack", "name": "...", "calories": 150 }
      ]
    }
  ]
}`;

  const response = await createChatCompletion({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is my current meal plan:\n\n${currentPlanText}\n\nPlease optimize it.` },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned an empty response');
  }

  const parsed = JSON.parse(content);
  return WeeklyPlanResultSchema.parse(parsed);
}

// ─── Grocery list schemas ───────────────────────

const GroceryItemSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  category: z.enum([
    'Protein',
    'Vegetables',
    'Fruits',
    'Grains',
    'Dairy',
    'Pantry',
    'Spices',
    'Other',
  ]),
});

const GroceryListResultSchema = z.object({
  items: z.array(GroceryItemSchema).min(1),
});

export type GroceryListResult = z.infer<typeof GroceryListResultSchema>;

// ─── User context for prompts ───────────────────────

export interface UserNutritionContext {
  calorieTarget: number;
  proteinTargetG: number;
  goal: string;
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  allergies: string[];
  language?: string;
}

// ─── System prompt builder ──────────────────────────

function buildSystemPrompt(ctx: UserNutritionContext): string {
  const restrictions: string[] = [];
  if (ctx.vegetarian) restrictions.push('vegetarian');
  if (ctx.vegan) restrictions.push('vegan');
  if (ctx.glutenFree) restrictions.push('gluten-free');
  if (ctx.dairyFree) restrictions.push('dairy-free');
  if (ctx.allergies.length > 0) restrictions.push(`allergies: ${ctx.allergies.join(', ')}`);

  const restrictionsText = restrictions.length > 0
    ? `The user has these dietary restrictions: ${restrictions.join(', ')}.`
    : 'The user has no specific dietary restrictions.';

  const langInstruction = ctx.language === 'fr'
    ? 'IMPORTANT: ALL text values in the JSON (balanceExplanation, nutrient names, suggestion titles, descriptions, missing items, overconsumption items) MUST be written in French.'
    : 'All text values in the JSON must be written in English.';

  // Compute macro targets from calorie target
  const carbTargetG = Math.round((ctx.calorieTarget * 0.45) / 4); // 45% of calories
  const fatTargetG = Math.round((ctx.calorieTarget * 0.30) / 9);  // 30% of calories

  return `You are a professional nutritionist AI. Analyze the user's SPECIFIC meal in detail.

Your analysis must be UNIQUE to the exact foods described. Identify each ingredient, estimate its portion size, and calculate nutrients accordingly. Do NOT give generic advice — reference the actual foods in the meal.

Return a JSON object:
{
  "analysisData": {
    "balance": "excellent" | "good" | "needs-improvement",
    "balanceExplanation": "<1-2 sentences explaining WHY this meal has this balance rating, referencing the specific foods>",
    "nutrients": [
      { "name": "Protein", "value": <g>, "target": ${ctx.proteinTargetG}, "unit": "g" },
      { "name": "Carbohydrates", "value": <g>, "target": ${carbTargetG}, "unit": "g" },
      { "name": "Fats", "value": <g>, "target": ${fatTargetG}, "unit": "g" },
      { "name": "Fiber", "value": <g>, "target": 25, "unit": "g" },
      <add 2-4 MORE nutrients relevant to THIS specific meal, e.g. Iron, Calcium, Vitamin C, Sodium, Sugar, Omega-3, Vitamin A, Vitamin D, Potassium, Zinc — pick whichever are most notable for the foods described>
    ],
    "missing": ["<specific nutrient or food group this meal lacks — be precise, e.g. 'Vitamin C from fresh fruits or vegetables' not just 'vitamins'>"],
    "overconsumption": ["<specific nutrient or food that is excessive in this meal — be precise, e.g. 'Saturated fat from cheese and butter' not just 'fat'>"]
  },
  "suggestions": [
    { "type": "improve" | "swap" | "add", "title": "<short title>", "description": "<actionable suggestion referencing specific foods in the meal>" }
  ],
  "totalCalories": <estimated total calories as integer>
}

User profile:
- Daily calorie target: ${ctx.calorieTarget} kcal
- Protein target: ${ctx.proteinTargetG}g/day
- Goal: ${ctx.goal}
- ${restrictionsText}

Rules:
- ${langInstruction}
- Estimate nutrients based on standard portion sizes and USDA/common food databases.
- The "nutrients" array MUST have at least 6 entries: the 4 macros (Protein, Carbohydrates, Fats, Fiber) PLUS 2-4 micronutrients that are particularly relevant to the specific foods in this meal.
- For micronutrient targets, use standard daily recommended values (e.g. Iron: 18mg, Calcium: 1000mg, Vitamin C: 90mg, Sodium: 2300mg).
- Provide 3-6 suggestions. Each MUST reference specific foods from the meal. Use a mix of "improve", "swap", and "add" types.
- "missing" should list 1-4 specific deficiencies. Be precise about what food or nutrient is lacking.
- "overconsumption" should list items that are excessive (can be empty if the meal is well-balanced).
- Return ONLY the JSON object, no markdown, no code blocks.`;
}

// ─── Main analysis function ─────────────────────────

export async function analyzeMeal(
  mealText: string,
  mealType: string,
  userContext: UserNutritionContext,
): Promise<MealAnalysisResult> {
  const systemPrompt = buildSystemPrompt(userContext);

  const response = await createChatCompletion({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Meal type: ${mealType}\nMeal description: ${mealText}\n\nAnalyze this specific meal in detail. Identify each ingredient and its nutritional contribution.` },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('AI returned an empty response');
  }

  const parsed = JSON.parse(content);
  const validated = MealAnalysisResultSchema.parse(parsed);

  return validated;
}

// ─── Photo-based meal analysis ──────────────────────

export const MealPhotoAnalysisResultSchema = MealAnalysisResultSchema.extend({
  mealDescription: z.string().min(1).max(300),
});

export type MealPhotoAnalysisResult = z.infer<typeof MealPhotoAnalysisResultSchema>;

function buildPhotoSystemPrompt(ctx: UserNutritionContext): string {
  const restrictions: string[] = [];
  if (ctx.vegetarian) restrictions.push('vegetarian');
  if (ctx.vegan) restrictions.push('vegan');
  if (ctx.glutenFree) restrictions.push('gluten-free');
  if (ctx.dairyFree) restrictions.push('dairy-free');
  if (ctx.allergies.length > 0) restrictions.push(`allergies: ${ctx.allergies.join(', ')}`);

  const restrictionsText = restrictions.length > 0
    ? `The user has these dietary restrictions: ${restrictions.join(', ')}.`
    : 'The user has no specific dietary restrictions.';

  const langInstruction = ctx.language === 'fr'
    ? 'IMPORTANT: ALL text values in the JSON (mealDescription, balanceExplanation, nutrient names, suggestion titles, descriptions, missing items, overconsumption items) MUST be written in French.'
    : 'All text values in the JSON must be written in English.';

  const carbTargetG = Math.round((ctx.calorieTarget * 0.45) / 4);
  const fatTargetG = Math.round((ctx.calorieTarget * 0.30) / 9);

  return `You are a professional nutritionist AI. You are given a PHOTO of a meal. Identify every food visible, estimate portion sizes from the image, and analyze it in detail.

Your analysis must be UNIQUE to what you actually see in the photo. Do NOT give generic advice — reference the specific foods you identified.

Return a JSON object:
{
  "mealDescription": "<short 1-sentence description of the meal you see, e.g. 'Grilled chicken breast with steamed broccoli and brown rice'>",
  "analysisData": {
    "balance": "excellent" | "good" | "needs-improvement",
    "balanceExplanation": "<1-2 sentences explaining WHY this meal has this balance rating, referencing the specific foods you see>",
    "nutrients": [
      { "name": "Protein", "value": <g>, "target": ${ctx.proteinTargetG}, "unit": "g" },
      { "name": "Carbohydrates", "value": <g>, "target": ${carbTargetG}, "unit": "g" },
      { "name": "Fats", "value": <g>, "target": ${fatTargetG}, "unit": "g" },
      { "name": "Fiber", "value": <g>, "target": 25, "unit": "g" },
      <add 2-4 MORE nutrients relevant to THIS specific meal, e.g. Iron, Calcium, Vitamin C, Sodium, Sugar, Omega-3, Vitamin A, Vitamin D, Potassium, Zinc — pick whichever are most notable for the foods you see>
    ],
    "missing": ["<specific nutrient or food group this meal lacks — be precise>"],
    "overconsumption": ["<specific nutrient or food that is excessive in this meal — be precise>"]
  },
  "suggestions": [
    { "type": "improve" | "swap" | "add", "title": "<short title>", "description": "<actionable suggestion referencing specific foods you see>" }
  ],
  "totalCalories": <estimated total calories as integer, based on visible portion sizes>
}

User profile:
- Daily calorie target: ${ctx.calorieTarget} kcal
- Protein target: ${ctx.proteinTargetG}g/day
- Goal: ${ctx.goal}
- ${restrictionsText}

Rules:
- ${langInstruction}
- If the image does not clearly show a meal/food, still return your best-effort guess and mention the ambiguity briefly in mealDescription.
- Estimate portions visually (plate/container size, typical serving sizes) and nutrients based on standard USDA/common food databases.
- The "nutrients" array MUST have at least 6 entries: the 4 macros (Protein, Carbohydrates, Fats, Fiber) PLUS 2-4 micronutrients that are particularly relevant to the specific foods you see.
- For micronutrient targets, use standard daily recommended values (e.g. Iron: 18mg, Calcium: 1000mg, Vitamin C: 90mg, Sodium: 2300mg).
- Provide 3-6 suggestions. Each MUST reference specific foods from the photo. Use a mix of "improve", "swap", and "add" types.
- "missing" should list 1-4 specific deficiencies. Be precise about what food or nutrient is lacking.
- "overconsumption" should list items that are excessive (can be empty if the meal is well-balanced).
- Return ONLY the JSON object, no markdown, no code blocks.`;
}

export async function analyzeMealPhoto(
  imageDataUrl: string,
  mealType: string,
  userContext: UserNutritionContext,
): Promise<MealPhotoAnalysisResult> {
  const systemPrompt = buildPhotoSystemPrompt(userContext);

  const response = await createChatCompletion({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Meal type: ${mealType}\n\nAnalyze this meal from the photo.` },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('AI returned an empty response');
  }

  const parsed = JSON.parse(content);
  return MealPhotoAnalysisResultSchema.parse(parsed);
}

// ─── Weekly plan generation ─────────────────────

export async function generateWeeklyPlan(
  ctx: UserNutritionContext,
): Promise<WeeklyPlanResult> {
  const restrictions: string[] = [];
  if (ctx.vegetarian) restrictions.push('vegetarian');
  if (ctx.vegan) restrictions.push('vegan');
  if (ctx.glutenFree) restrictions.push('gluten-free');
  if (ctx.dairyFree) restrictions.push('dairy-free');
  if (ctx.allergies.length > 0) restrictions.push(`allergies: ${ctx.allergies.join(', ')}`);

  const restrictionsText = restrictions.length > 0
    ? `Dietary restrictions: ${restrictions.join(', ')}.`
    : 'No specific dietary restrictions.';

  const langInstruction = ctx.language === 'fr'
    ? 'IMPORTANT: All meal names MUST be written in French.'
    : 'All meal names must be written in English.';

  const systemPrompt = `You are a professional nutritionist AI for SmartPlate.
Generate a 7-day meal plan (Monday to Sunday) with exactly 4 meals per day: breakfast, lunch, dinner, snack.

Each meal must include a descriptive name and estimated calorie count.
Daily total should be close to ${ctx.calorieTarget} kcal.
Protein target: ${ctx.proteinTargetG}g per day.
Goal: ${ctx.goal}.
${restrictionsText}

Rules:
- ${langInstruction}
- Ensure variety across the week — avoid repeating the same meal.
- Each day must have exactly 4 meals in this order: breakfast, lunch, dinner, snack.
- Meal names should be specific (e.g., "Grilled chicken with quinoa and steamed broccoli" not just "Chicken").
- Calorie estimates should be realistic for the described meal.
- Return ONLY the JSON object, no markdown formatting, no code blocks.

Return a JSON object with this exact structure:
{
  "days": [
    {
      "meals": [
        { "type": "breakfast", "name": "...", "calories": 350 },
        { "type": "lunch", "name": "...", "calories": 500 },
        { "type": "dinner", "name": "...", "calories": 550 },
        { "type": "snack", "name": "...", "calories": 150 }
      ]
    }
  ]
}`;

  const response = await createChatCompletion({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate a weekly meal plan.' },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned an empty response');
  }

  const parsed = JSON.parse(content);
  return WeeklyPlanResultSchema.parse(parsed);
}

// ─── Grocery list generation ────────────────────

export async function generateGroceryList(
  mealNames: string[],
  ctx: UserNutritionContext,
): Promise<GroceryListResult> {
  const restrictions: string[] = [];
  if (ctx.vegetarian) restrictions.push('vegetarian');
  if (ctx.vegan) restrictions.push('vegan');
  if (ctx.glutenFree) restrictions.push('gluten-free');
  if (ctx.dairyFree) restrictions.push('dairy-free');
  if (ctx.allergies.length > 0) restrictions.push(`allergies: ${ctx.allergies.join(', ')}`);

  const restrictionsText = restrictions.length > 0
    ? `Dietary restrictions: ${restrictions.join(', ')}.`
    : 'No specific dietary restrictions.';

  const langInstruction = ctx.language === 'fr'
    ? 'IMPORTANT: All ingredient names MUST be written in French.'
    : 'All ingredient names must be written in English.';

  const systemPrompt = `You are a professional nutritionist AI for SmartPlate.
Given a list of meal names for a weekly meal plan, generate an aggregated grocery shopping list.

${restrictionsText}

Rules:
- ${langInstruction}
- Combine duplicate ingredients and provide practical quantities for the whole week.
- Use realistic grocery store quantities (e.g., "500g", "1 bunch", "2 cans", "1 dozen").
- Categorize each item into exactly one of: Protein, Vegetables, Fruits, Grains, Dairy, Pantry, Spices, Other.
- Include all ingredients needed for these meals.
- Return ONLY the JSON object, no markdown formatting, no code blocks.

Return a JSON object:
{
  "items": [
    { "name": "Chicken breast", "quantity": "1kg", "category": "Protein" }
  ]
}`;

  const response = await createChatCompletion({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Meals for the week:\n${mealNames.map((m, i) => `${i + 1}. ${m}`).join('\n')}` },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned an empty response');
  }

  const parsed = JSON.parse(content);
  return GroceryListResultSchema.parse(parsed);
}

// ─── Recipe caption structuring (import scraping fallback) ──

// Capping input keeps token cost/latency bounded regardless of what a
// scraped caption/description happens to contain. Sized for a full
// (untruncated) YouTube video description — see extractYouTubeFullDescription
// in import-extractor.ts — since Instagram/TikTok captions are shorter.
const MAX_CAPTION_INPUT_CHARS = 4000;

const CaptionStructureResultSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  prepTimeMin: z.number().int().positive().nullable(),
  cookTimeMin: z.number().int().positive().nullable(),
  servings: z.number().int().positive().nullable(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

export type CaptionStructureResult = z.infer<typeof CaptionStructureResultSchema>;

const CAPTION_STRUCTURE_SYSTEM_PROMPT = `You are a recipe caption parser for SmartPlate. You will be given a raw social media caption (e.g. from an Instagram, TikTok, or YouTube post) that may describe a recipe.

Extract a clean, short recipe title, split any ingredients from any preparation steps, and propose any of description/prepTimeMin/cookTimeMin/servings that are missing from the caption but can be reasonably estimated from the ingredients and steps you found.

Rules:
- Ignore hashtags, emojis used purely as decoration, calls-to-action ("follow for more", "link in bio"), and unrelated commentary.
- "title" must be a short, clean recipe name — never the full caption.
- If the caption doesn't clearly contain ingredients and/or steps, return an empty array for that field rather than guessing.
- Do not invent ingredients or steps that are not present in the text.
- "description" — if the caption already contains an appetizing 1-2 sentence description of the dish, use it (cleaned up); otherwise write a short original one yourself based on the ingredients/steps. Null only if you found no real ingredients/steps to describe.
- "prepTimeMin"/"cookTimeMin"/"servings" — if the caption states them, use those values; otherwise propose a realistic estimate based on standard cooking practice for the specific ingredients/quantities/steps found (cookTimeMin should be null, not 0, for a dish with no cooking step, e.g. a raw salad). Null for any of these you cannot reasonably estimate — never guess wildly.
- Preserve the original language of the caption in your output.
- Return ONLY the JSON object, no markdown formatting, no code blocks.

Return a JSON object with this exact structure:
{
  "title": "...",
  "description": "..." | null,
  "prepTimeMin": <integer minutes> | null,
  "cookTimeMin": <integer minutes> | null,
  "servings": <integer> | null,
  "ingredients": ["..."],
  "steps": ["..."]
}`;

/**
 * Structures a raw social-media caption into a clean title/description/
 * ingredients/steps/timing/servings shape, proposing values for anything
 * missing from the caption when it can be reasonably estimated from the
 * ingredients/steps found. Used by the import-extraction Open Graph
 * fallback (src/services/import-extractor.ts), which today only has an
 * unstructured caption to work with — real JSON-LD recipe sites already
 * provide structured data and never call this (see
 * proposeMissingRecipeFields below for backfilling gaps in that path
 * instead).
 */
export async function structureRecipeCaption(
  rawText: string,
): Promise<CaptionStructureResult> {
  const response = await createChatCompletion({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CAPTION_STRUCTURE_SYSTEM_PROMPT },
      { role: 'user', content: rawText.slice(0, MAX_CAPTION_INPUT_CHARS) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned an empty response');
  }

  const parsed = JSON.parse(content);
  return CaptionStructureResultSchema.parse(parsed);
}

// ─── Propose missing recipe fields (JSON-LD gap-filling) ─────

const ProposedRecipeFieldsSchema = z.object({
  description: z.string().nullable(),
  prepTimeMin: z.number().int().positive().nullable(),
  cookTimeMin: z.number().int().positive().nullable(),
  servings: z.number().int().positive().nullable(),
});

export type ProposedRecipeFields = z.infer<typeof ProposedRecipeFieldsSchema>;

const PROPOSE_MISSING_FIELDS_SYSTEM_PROMPT = `You are a professional recipe assistant for SmartPlate. You will be given a recipe's title, ingredients, and steps (already extracted from a real source), where some metadata is missing.

Propose realistic values for description/prepTimeMin/cookTimeMin/servings based on standard cooking practice for the specific ingredients, quantities, and steps given.

Rules:
- "description" — a short, appetizing 1-2 sentence description of the dish.
- "prepTimeMin"/"cookTimeMin" — realistic estimates in minutes. cookTimeMin should be null (not 0) if the steps involve no cooking (e.g. a raw salad or no-bake dish).
- "servings" — a realistic estimate from the ingredient quantities given.
- Null for any field you cannot reasonably estimate from what's given — never guess wildly.
- Match the language of the provided title/ingredients/steps.
- Return ONLY the JSON object, no markdown formatting, no code blocks.

Return a JSON object with this exact structure:
{
  "description": "..." | null,
  "prepTimeMin": <integer minutes> | null,
  "cookTimeMin": <integer minutes> | null,
  "servings": <integer> | null
}`;

/**
 * Proposes values for description/prepTimeMin/cookTimeMin/servings when a
 * JSON-LD-sourced recipe (real recipe sites, which usually already provide
 * most fields deterministically) is missing some of them. Only called by
 * import-extractor.ts when there's an actual gap to fill and real
 * ingredients/steps exist to reason from — most JSON-LD imports never hit
 * this, since the source page already provides everything.
 */
export async function proposeMissingRecipeFields(input: {
  title: string;
  ingredients: string[];
  steps: string[];
}): Promise<ProposedRecipeFields> {
  const response = await createChatCompletion({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PROPOSE_MISSING_FIELDS_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Title: ${input.title}\n\nIngredients:\n${input.ingredients.join('\n')}\n\nSteps:\n${input.steps.join('\n')}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned an empty response');
  }

  const parsed = JSON.parse(content);
  return ProposedRecipeFieldsSchema.parse(parsed);
}

// ─── Recipe translation (import bilingual backfill) ───

const RecipeTranslationSchema = z.object({
  sourceLanguage: z.enum(['en', 'fr']),
  titleEn: z.string(),
  titleFr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionFr: z.string().nullable(),
  ingredientsEn: z.array(z.string()),
  ingredientsFr: z.array(z.string()),
  stepsEn: z.array(z.string()),
  stepsFr: z.array(z.string()),
});

export type RecipeTranslationResult = z.infer<typeof RecipeTranslationSchema>;

const RECIPE_TRANSLATION_SYSTEM_PROMPT = `You are a professional bilingual (English/French) recipe translator for SmartPlate. You will be given a recipe's title, optional description, ingredients list, and steps list, all written in a single source language (English or French).

Tasks:
1. Identify whether the source language is English or French.
2. Produce the exact same content in BOTH languages.

Rules:
- For the field matching the source language, copy the input verbatim — do not rephrase, clean up, or "improve" it.
- For the other language, produce a natural, accurate, professional translation (correct culinary vocabulary, keep quantities/units unchanged — never convert units).
- ingredientsEn/ingredientsFr and stepsEn/stepsFr must each have exactly the same number of items, in the same order, as the input ingredients/steps — translate line by line, never merge, split, or reorder.
- If description is null/empty, return null for both descriptionEn and descriptionFr.
- Return ONLY the JSON object, no markdown formatting, no code blocks.

Return a JSON object with this exact structure:
{
  "sourceLanguage": "en" | "fr",
  "titleEn": "...",
  "titleFr": "...",
  "descriptionEn": "..." | null,
  "descriptionFr": "..." | null,
  "ingredientsEn": ["..."],
  "ingredientsFr": ["..."],
  "stepsEn": ["..."],
  "stepsFr": ["..."]
}`;

/**
 * Detects the source language of an imported recipe and backfills the
 * other language (title/titleFr, description/descriptionFr, per-item
 * text/textFr) so imported recipes display correctly for both EN and FR
 * users via bi() (src/lib/bilingual.ts), matching manually-authored
 * recipes which always have both fields filled in by the admin form.
 */
export async function translateRecipeContent(input: {
  title: string;
  description?: string | null;
  ingredients: string[];
  steps: string[];
}): Promise<RecipeTranslationResult> {
  const response = await createChatCompletion({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: RECIPE_TRANSLATION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Title: ${input.title}\n\nDescription: ${input.description || '(none)'}\n\nIngredients:\n${input.ingredients.join('\n')}\n\nSteps:\n${input.steps.join('\n')}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned an empty response');
  }

  const parsed = JSON.parse(content);
  return RecipeTranslationSchema.parse(parsed);
}
