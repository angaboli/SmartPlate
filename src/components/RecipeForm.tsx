'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUploadImage } from '@/hooks/useUpload';
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
  userRole?: 'user' | 'editor' | 'admin';
  onStatusChange?: (status: string) => void;
}

const statuses = ['draft', 'pending_review', 'published', 'rejected'];

const statusLabelKeys: Record<string, string> = {
  draft: 'recipes.status.draft',
  pending_review: 'recipes.status.pendingReview',
  published: 'recipes.status.published',
  rejected: 'recipes.status.rejected',
};

export function RecipeForm({
  initialData,
  onSubmit,
  isPending,
  submitLabel,
  userRole,
  onStatusChange,
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
  const [status, setStatus] = useState(initialData?.status ?? 'draft');

  const [titleError, setTitleError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadImage();

  const isAdmin = userRole === 'admin';

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    uploadImage.mutate(
      { file, purpose: 'recipe-image', recipeId: initialData?.id },
      {
        onSuccess: (publicUrl) => setImageUrl(publicUrl),
        onError: (error) => toast.error(error.message || t('recipeForm.imageUploadFailed')),
      },
    );
  }

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
      {/* Shared: Image upload */}
      <div className="space-y-2">
        <Label htmlFor="imageUpload">{t('recipeForm.imageUrl')}</Label>
        <input
          ref={fileInputRef}
          id="imageUpload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelected}
        />
        <div className="flex items-center gap-3">
          {imageUrl && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border">
              <ImageWithFallback
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={uploadImage.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadImage.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {imageUrl ? t('recipeForm.imageReplace') : t('recipeForm.imageUpload')}
          </Button>
        </div>
      </div>

      {/* Shared: Category + Goal */}
      <div className={`grid gap-4 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
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
        {isAdmin && (
          <div className="space-y-2">
            <Label htmlFor="status">{t('recipeForm.status')}</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                onStatusChange?.(e.target.value);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {t(statusLabelKeys[s] || '')}
                </option>
              ))}
            </select>
          </div>
        )}
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
