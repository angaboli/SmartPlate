'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { RecipeInput, RecipeDTO } from '@/hooks/useRecipes';

const categories = ['Regular', 'SafariTaste', 'Dessert', 'Breakfast', 'Snack'];
const goals = ['balanced', 'high-protein', 'light', 'energy-boost'];

interface RecipeFormProps {
  initialData?: RecipeDTO;
  onSubmit: (data: RecipeInput) => void;
  isPending: boolean;
  submitLabel: string;
}

export function RecipeForm({
  initialData,
  onSubmit,
  isPending,
  submitLabel,
}: RecipeFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? '');
  const [prepTimeMin, setPrepTimeMin] = useState(
    initialData?.prepTimeMin?.toString() ?? '',
  );
  const [cookTimeMin, setCookTimeMin] = useState(
    initialData?.cookTimeMin?.toString() ?? '',
  );
  const [servings, setServings] = useState(
    initialData?.servings?.toString() ?? '',
  );
  const [calories, setCalories] = useState(
    initialData?.calories?.toString() ?? '',
  );
  const [category, setCategory] = useState(initialData?.category ?? 'Regular');
  const [goal, setGoal] = useState(initialData?.goal ?? '');
  const [ingredientsText, setIngredientsText] = useState(
    initialData?.ingredients?.map((i) => i.text).join('\n') ?? '',
  );
  const [stepsText, setStepsText] = useState(
    initialData?.steps?.map((s) => s.text).join('\n') ?? '',
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: RecipeInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      prepTimeMin: prepTimeMin ? parseInt(prepTimeMin, 10) : undefined,
      cookTimeMin: cookTimeMin ? parseInt(cookTimeMin, 10) : undefined,
      servings: servings ? parseInt(servings, 10) : undefined,
      calories: calories ? parseInt(calories, 10) : undefined,
      category,
      goal: goal || undefined,
      ingredients: ingredientsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      steps: stepsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    };
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Recipe title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the recipe"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Goal</Label>
          <select
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">None</option>
            {goals.map((g) => (
              <option key={g} value={g}>
                {g.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="prepTimeMin">Prep (min)</Label>
          <Input
            id="prepTimeMin"
            type="number"
            value={prepTimeMin}
            onChange={(e) => setPrepTimeMin(e.target.value)}
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cookTimeMin">Cook (min)</Label>
          <Input
            id="cookTimeMin"
            type="number"
            value={cookTimeMin}
            onChange={(e) => setCookTimeMin(e.target.value)}
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="servings">Servings</Label>
          <Input
            id="servings"
            type="number"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            min={1}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="calories">Calories</Label>
          <Input
            id="calories"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            min={0}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ingredients">Ingredients (one per line)</Label>
        <Textarea
          id="ingredients"
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          placeholder={"2 cups flour\n1 tsp salt\n200ml water"}
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="steps">Steps (one per line)</Label>
        <Textarea
          id="steps"
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          placeholder={"Preheat oven to 180C\nMix dry ingredients\nBake for 25 minutes"}
          rows={6}
        />
      </div>

      <Button type="submit" className="w-full bg-primary" disabled={isPending}>
        {isPending ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
