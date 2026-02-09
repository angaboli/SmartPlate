import OpenAI from 'openai';
import { z } from 'zod';

// ─── OpenAI client ──────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Zod schemas for LLM output validation ─────────

const NutrientSchema = z.object({
  name: z.string(),
  value: z.number(),
  target: z.number(),
  unit: z.string(),
});

const AnalysisDataSchema = z.object({
  balance: z.enum(['excellent', 'good', 'needs-improvement']),
  nutrients: z.array(NutrientSchema).min(1),
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

  const response = await openai.chat.completions.create({
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

  return `You are a professional nutritionist AI assistant for SmartPlate, a nutrition tracking app.

Analyze the user's meal and return a JSON object with the following structure:
{
  "analysisData": {
    "balance": "excellent" | "good" | "needs-improvement",
    "nutrients": [
      { "name": "Protein", "value": <estimated grams>, "target": ${ctx.proteinTargetG}, "unit": "g" },
      { "name": "Carbohydrates", "value": <estimated grams>, "target": <reasonable target>, "unit": "g" },
      { "name": "Fats", "value": <estimated grams>, "target": <reasonable target>, "unit": "g" },
      { "name": "Fiber", "value": <estimated grams>, "target": 25, "unit": "g" }
    ],
    "missing": ["<nutrient or food group that should be added>"],
    "overconsumption": ["<nutrient or food that is excessive>"]
  },
  "suggestions": [
    { "type": "improve" | "swap" | "add", "title": "<short title>", "description": "<actionable suggestion>" }
  ],
  "totalCalories": <estimated total calories as integer>
}

User's daily calorie target: ${ctx.calorieTarget} kcal.
User's protein target: ${ctx.proteinTargetG}g.
User's goal: ${ctx.goal}.
${restrictionsText}

Rules:
- Estimate nutrients as accurately as possible based on common food databases.
- Provide at least 2-4 suggestions that are actionable and specific.
- The "missing" array should list things the meal lacks.
- The "overconsumption" array should list things that are excessive (can be empty).
- Set carb and fat targets proportionally based on the calorie target.
- Return ONLY the JSON object, no markdown formatting, no code blocks.`;
}

// ─── Main analysis function ─────────────────────────

export async function analyzeMeal(
  mealText: string,
  mealType: string,
  userContext: UserNutritionContext,
): Promise<MealAnalysisResult> {
  const systemPrompt = buildSystemPrompt(userContext);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Meal type: ${mealType}\nMeal: ${mealText}` },
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

  const response = await openai.chat.completions.create({
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

  const systemPrompt = `You are a professional nutritionist AI for SmartPlate.
Given a list of meal names for a weekly meal plan, generate an aggregated grocery shopping list.

${restrictionsText}

Rules:
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

  const response = await openai.chat.completions.create({
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
