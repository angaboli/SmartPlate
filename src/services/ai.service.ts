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
