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

interface ImportRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportRecipeDialog({ open, onOpenChange }: ImportRecipeDialogProps) {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchedRecipe, setFetchedRecipe] = useState<any>(null);
  const [error, setError] = useState('');
  const [isPartial, setIsPartial] = useState(false);
  
  // Editable fields
  const [editableTitle, setEditableTitle] = useState('');
  const [editableAuthor, setEditableAuthor] = useState('');
  const [editablePrepTime, setEditablePrepTime] = useState('');
  const [editableIngredients, setEditableIngredients] = useState('');
  const [editableSteps, setEditableSteps] = useState('');
  const [selectedTag, setSelectedTag] = useState<RecipeTag | undefined>(undefined);

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

  const fetchRecipe = async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    setError('');
    setFetchedRecipe(null);
    
    // Simulate API call to extract recipe data
    setTimeout(() => {
      const source = detectSource(url);
      
      // Mock extracted data (in a real app, this would be from an API)
      const mockRecipe = {
        title: 'Spicy Thai Basil Chicken',
        author: '@foodlover_chef',
        prepTime: '25 min',
        image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&h=400&fit=crop',
        ingredients: [
          '500g chicken breast, sliced',
          '2 cups Thai basil leaves',
          '3 Thai chilies, chopped',
          '4 cloves garlic, minced',
          '2 tbsp soy sauce',
          '1 tbsp oyster sauce',
          '1 tsp sugar',
        ],
        steps: [
          'Heat oil in a wok over high heat',
          'Add garlic and chilies, stir-fry for 30 seconds',
          'Add chicken and cook until no longer pink',
          'Add soy sauce, oyster sauce, and sugar',
          'Stir in Thai basil and cook until wilted',
          'Serve hot with jasmine rice',
        ],
        source,
      };
      
      // Randomly simulate partial detection
      const isPartialDetection = Math.random() > 0.7;
      
      if (isPartialDetection) {
        mockRecipe.ingredients = [];
        mockRecipe.steps = [];
        setIsPartial(true);
      } else {
        setIsPartial(false);
      }
      
      setFetchedRecipe(mockRecipe);
      setEditableTitle(mockRecipe.title);
      setEditableAuthor(mockRecipe.author);
      setEditablePrepTime(mockRecipe.prepTime);
      setEditableIngredients(mockRecipe.ingredients.join('\n'));
      setEditableSteps(mockRecipe.steps.join('\n'));
      setLoading(false);
    }, 1500);
  };

  const handleSave = () => {
    if (!fetchedRecipe || !editableTitle.trim()) return;

    // TODO (M5): real import — create Recipe via API, then save to cook-later
    toast.success(t('import.saved'));
    handleClose();
  };

  const handleClose = () => {
    setUrl('');
    setFetchedRecipe(null);
    setError('');
    setIsPartial(false);
    setEditableTitle('');
    setEditableAuthor('');
    setEditablePrepTime('');
    setEditableIngredients('');
    setEditableSteps('');
    setSelectedTag(undefined);
    onOpenChange(false);
  };

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
                disabled={loading || !!fetchedRecipe}
              />
              {!fetchedRecipe && (
                <Button onClick={fetchRecipe} disabled={loading || !url.trim()}>
                  {loading ? (
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
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
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
                  {getSourceIcon(fetchedRecipe.source)}
                  {fetchedRecipe.source}
                </Badge>
              </div>

              {/* Preview Image */}
              {fetchedRecipe.image && (
                <div className="relative aspect-video overflow-hidden rounded-lg border">
                  <img
                    src={fetchedRecipe.image}
                    alt={editableTitle}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
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
                  <Label>Meal Type (Optional)</Label>
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
                  disabled={!editableTitle.trim()}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('import.addToCookLater')}
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
