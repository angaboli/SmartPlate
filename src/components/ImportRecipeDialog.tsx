'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Link as LinkIcon,
  Instagram,
  Youtube,
  Video,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  User,
  ChefHat
} from 'lucide-react';
type RecipeSource = 'Instagram' | 'TikTok' | 'YouTube' | 'Other';
type RecipeTag = 'breakfast' | 'lunch' | 'dinner' | 'snack';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { useExtractRecipe, useSaveImport, type ExtractedRecipeDTO } from '@/hooks/useImport';

interface ImportRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportRecipeDialog({ open, onOpenChange }: ImportRecipeDialogProps) {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [fetchedRecipe, setFetchedRecipe] = useState<ExtractedRecipeDTO | null>(null);
  const [isPartial, setIsPartial] = useState(false);

  // Editable fields
  const [editableTitle, setEditableTitle] = useState('');
  const [editableAuthor, setEditableAuthor] = useState('');
  const [editablePrepTime, setEditablePrepTime] = useState('');
  const [editableIngredients, setEditableIngredients] = useState('');
  const [editableSteps, setEditableSteps] = useState('');
  const [selectedTag, setSelectedTag] = useState<RecipeTag | undefined>(undefined);

  const extractMutation = useExtractRecipe();
  const saveMutation = useSaveImport();

  const detectSource = (url: string): RecipeSource => {
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('tiktok.com')) return 'TikTok';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    return 'Other';
  };

  const getSourceIcon = (source: RecipeSource) => {
    switch (source) {
      case 'Instagram':
        return <Instagram className="h-4 w-4" />;
      case 'TikTok':
        return <Video className="h-4 w-4" />;
      case 'YouTube':
        return <Youtube className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  const providerToSource = (provider: string): RecipeSource => {
    switch (provider) {
      case 'instagram': return 'Instagram';
      case 'tiktok': return 'TikTok';
      case 'youtube': return 'YouTube';
      default: return 'Other';
    }
  };

  const fetchRecipe = async () => {
    if (!url.trim()) return;

    extractMutation.mutate(url.trim(), {
      onSuccess: (data) => {
        setFetchedRecipe(data);
        setIsPartial(data.isPartial);
        setEditableTitle(data.title);
        setEditableAuthor('');
        setEditablePrepTime(data.prepTimeMin ? `${data.prepTimeMin} min` : '');
        setEditableIngredients(data.ingredients.join('\n'));
        setEditableSteps(data.steps.join('\n'));
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const handleSave = () => {
    if (!fetchedRecipe || !editableTitle.trim()) return;

    const ingredients = editableIngredients
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const steps = editableSteps
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    // Parse prep time from the editable field
    const prepMatch = editablePrepTime.match(/(\d+)/);
    const prepTimeMin = prepMatch ? parseInt(prepMatch[1], 10) : null;

    saveMutation.mutate(
      {
        url: url.trim(),
        title: editableTitle.trim(),
        description: fetchedRecipe.description,
        imageUrl: fetchedRecipe.imageUrl,
        prepTimeMin,
        cookTimeMin: fetchedRecipe.cookTimeMin,
        servings: fetchedRecipe.servings,
        ingredients,
        steps,
        tag: selectedTag || null,
      },
      {
        onSuccess: () => {
          toast.success(t('import.saved'));
          handleClose();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  const handleClose = () => {
    setUrl('');
    setFetchedRecipe(null);
    setIsPartial(false);
    setEditableTitle('');
    setEditableAuthor('');
    setEditablePrepTime('');
    setEditableIngredients('');
    setEditableSteps('');
    setSelectedTag(undefined);
    extractMutation.reset();
    saveMutation.reset();
    onOpenChange(false);
  };

  const source = fetchedRecipe
    ? providerToSource(fetchedRecipe.provider)
    : detectSource(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            {t('import.title')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('import.subtitle')}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="recipe-url">{t('import.source')}</Label>
            <div className="flex gap-2">
              <Input
                id="recipe-url"
                placeholder={t('import.placeholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
                disabled={extractMutation.isPending || !!fetchedRecipe}
              />
              {!fetchedRecipe && (
                <Button onClick={fetchRecipe} disabled={extractMutation.isPending || !url.trim()}>
                  {extractMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('import.fetching')}
                    </>
                  ) : (
                    t('import.fetch')
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Error State */}
          {extractMutation.isError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{extractMutation.error.message}</p>
            </div>
          )}

          {/* Partial Detection Warning */}
          {isPartial && fetchedRecipe && (
            <div className="flex items-center gap-2 rounded-lg border border-[#F4A261]/50 bg-[#F4A261]/10 p-4">
              <AlertCircle className="h-5 w-5 text-[#F4A261]" />
              <p className="text-sm text-[#F4A261]">{t('import.partialDetection')}</p>
            </div>
          )}

          {/* Fetched Recipe */}
          {fetchedRecipe && (
            <div className="space-y-4">
              {/* Source Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1.5">
                  {getSourceIcon(source)}
                  {source}
                </Badge>
              </div>

              {/* Preview Image */}
              {fetchedRecipe.imageUrl && (
                <div className="relative aspect-video overflow-hidden rounded-lg border">
                  <img
                    src={fetchedRecipe.imageUrl}
                    alt={editableTitle}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">{t('recipeForm.title')}</Label>
                  <Input
                    id="edit-title"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-author" className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {t('import.author')}
                    </Label>
                    <Input
                      id="edit-author"
                      value={editableAuthor}
                      onChange={(e) => setEditableAuthor(e.target.value)}
                      placeholder="@username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-preptime" className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {t('import.prepTime')}
                    </Label>
                    <Input
                      id="edit-preptime"
                      value={editablePrepTime}
                      onChange={(e) => setEditablePrepTime(e.target.value)}
                      placeholder="25 min"
                    />
                  </div>
                </div>

                {/* Meal Tag Selection */}
                <div className="space-y-2">
                  <Label>{t('import.mealTypeOptional')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as RecipeTag[]).map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTag === tag ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedTag(selectedTag === tag ? undefined : tag)}
                      >
                        {t(`tag.${tag}`)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-ingredients">{t('import.ingredients')}</Label>
                  <Textarea
                    id="edit-ingredients"
                    value={editableIngredients}
                    onChange={(e) => setEditableIngredients(e.target.value)}
                    placeholder="One ingredient per line..."
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-steps">{t('import.steps')}</Label>
                  <Textarea
                    id="edit-steps"
                    value={editableSteps}
                    onChange={(e) => setEditableSteps(e.target.value)}
                    placeholder="One step per line..."
                    rows={6}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-primary"
                  disabled={!editableTitle.trim() || saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('import.addToCookLater')}
                    </>
                  )}
                </Button>
                <Button onClick={handleClose} variant="outline">
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
