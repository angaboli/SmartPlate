'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RecipeInput, RecipeDTO } from '@/hooks/useRecipes';

const categories = ['Regular', 'SafariTaste', 'Dessert', 'Breakfast', 'Snack'];
const goals = ['balanced', 'high-protein', 'light', 'energy-boost'];

const goalLabelKeys: Record<string, string> = {
  balanced: 'recipes.goal.balanced',
  'high-protein': 'recipes.goal.highProtein',
  light: 'recipes.goal.light',
  'energy-boost': 'recipes.goal.energyBoost',
};

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
  const { t } = useLanguage();

  // EN fields
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [ingredientsText, setIngredientsText] = useState(
    initialData?.ingredients?.map((i) => i.text).join('\n') ?? '',
  );
  const [stepsText, setStepsText] = useState(
    initialData?.steps?.map((s) => s.text).join('\n') ?? '',
  );

  // FR fields
  const [titleFr, setTitleFr] = useState(initialData?.titleFr ?? '');
  const [descriptionFr, setDescriptionFr] = useState(initialData?.descriptionFr ?? '');
  const [ingredientsFrText, setIngredientsFrText] = useState(
    initialData?.ingredients?.map((i) => i.textFr || '').join('\n').replace(/^\n+$/, '') ?? '',
  );
  const [stepsFrText, setStepsFrText] = useState(
    initialData?.steps?.map((s) => s.textFr || '').join('\n').replace(/^\n+$/, '') ?? '',
  );

  // Shared fields
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

  const [titleError, setTitleError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedTitleFr = titleFr.trim();

    if (!trimmedTitle && !trimmedTitleFr) {
      setTitleError(t('recipeForm.titleRequired'));
      return;
    }
    setTitleError('');

    const enIngredients = ingredientsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const frIngredients = ingredientsFrText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const enSteps = stepsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const frSteps = stepsFrText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const data: RecipeInput = {
      title: trimmedTitle,
      titleFr: trimmedTitleFr || undefined,
      description: description.trim() || undefined,
      descriptionFr: descriptionFr.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      prepTimeMin: prepTimeMin ? parseInt(prepTimeMin, 10) : undefined,
      cookTimeMin: cookTimeMin ? parseInt(cookTimeMin, 10) : undefined,
      servings: servings ? parseInt(servings, 10) : undefined,
      calories: calories ? parseInt(calories, 10) : undefined,
      category,
      goal: goal || undefined,
      ingredients: enIngredients.length ? enIngredients : undefined,
      ingredientsFr: frIngredients.length ? frIngredients : undefined,
      steps: enSteps.length ? enSteps : undefined,
      stepsFr: frSteps.length ? frSteps : undefined,
    };
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shared: Image URL */}
      <div className="space-y-2">
        <Label htmlFor="imageUrl">{t('recipeForm.imageUrl')}</Label>
        <Input
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Shared: Category + Goal */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">{t('recipeForm.category')}</Label>
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
          <Label htmlFor="goal">{t('recipeForm.goal')}</Label>
          <select
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('recipeForm.goalNone')}</option>
            {goals.map((g) => (
              <option key={g} value={g}>
                {t(goalLabelKeys[g] || '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shared: Prep, Cook, Servings, Calories */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="prepTimeMin">{t('recipeForm.prepMin')}</Label>
          <Input
            id="prepTimeMin"
            type="number"
            value={prepTimeMin}
            onChange={(e) => setPrepTimeMin(e.target.value)}
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cookTimeMin">{t('recipeForm.cookMin')}</Label>
          <Input
            id="cookTimeMin"
            type="number"
            value={cookTimeMin}
            onChange={(e) => setCookTimeMin(e.target.value)}
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="servings">{t('recipeForm.servings')}</Label>
          <Input
            id="servings"
            type="number"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            min={1}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="calories">{t('recipeForm.calories')}</Label>
          <Input
            id="calories"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            min={0}
          />
        </div>
      </div>

      {/* EN / FR tabs for text fields */}
      {titleError && (
        <p className="text-sm text-destructive">{titleError}</p>
      )}

      <Tabs defaultValue="en">
        <TabsList>
          <TabsTrigger value="en">{t('recipeForm.langTabEn')}</TabsTrigger>
          <TabsTrigger value="fr">{t('recipeForm.langTabFr')}</TabsTrigger>
        </TabsList>

        {/* EN tab */}
        <TabsContent value="en" className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">{t('recipeForm.titleEn')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('recipeForm.titlePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('recipeForm.descriptionEn')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('recipeForm.descPlaceholder')}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ingredients">{t('recipeForm.ingredientsEn')}</Label>
            <Textarea
              id="ingredients"
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder={t('recipeForm.ingredientsPlaceholder')}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="steps">{t('recipeForm.stepsEn')}</Label>
            <Textarea
              id="steps"
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder={t('recipeForm.stepsPlaceholder')}
              rows={6}
            />
          </div>
        </TabsContent>

        {/* FR tab */}
        <TabsContent value="fr" className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="titleFr">{t('recipeForm.titleFr')}</Label>
            <Input
              id="titleFr"
              value={titleFr}
              onChange={(e) => setTitleFr(e.target.value)}
              placeholder={t('recipeForm.titleFrPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descriptionFr">{t('recipeForm.descriptionFr')}</Label>
            <Textarea
              id="descriptionFr"
              value={descriptionFr}
              onChange={(e) => setDescriptionFr(e.target.value)}
              placeholder={t('recipeForm.descFrPlaceholder')}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ingredientsFr">{t('recipeForm.ingredientsFr')}</Label>
            <Textarea
              id="ingredientsFr"
              value={ingredientsFrText}
              onChange={(e) => setIngredientsFrText(e.target.value)}
              placeholder={t('recipeForm.ingredientsFrPlaceholder')}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stepsFr">{t('recipeForm.stepsFr')}</Label>
            <Textarea
              id="stepsFr"
              value={stepsFrText}
              onChange={(e) => setStepsFrText(e.target.value)}
              placeholder={t('recipeForm.stepsFrPlaceholder')}
              rows={6}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Button type="submit" className="w-full bg-primary" disabled={isPending}>
        {isPending ? t('common.saving') : submitLabel}
      </Button>
    </form>
  );
}
