import { useCookLater, SavedRecipe } from '@/contexts/CookLaterContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  ExternalLink, 
  CalendarPlus, 
  Trash2, 
  CheckCircle2,
  Instagram,
  Youtube,
  Video,
  Link as LinkIcon,
  ChefHat
} from 'lucide-react';
import { format } from 'date-fns';

export function CookLaterList() {
  const { savedRecipes, removeRecipe, markAsCooked } = useCookLater();
  const { t } = useLanguage();

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Instagram':
        return <Instagram className="h-3.5 w-3.5" />;
      case 'TikTok':
        return <Video className="h-3.5 w-3.5" />;
      case 'YouTube':
        return <Youtube className="h-3.5 w-3.5" />;
      default:
        return <LinkIcon className="h-3.5 w-3.5" />;
    }
  };

  if (savedRecipes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-secondary/30 p-12 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold">{t('cookLater.empty')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('cookLater.emptyDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {savedRecipes.map((recipe) => (
        <div
          key={recipe.id}
          className={`group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md ${
            recipe.isCooked ? 'opacity-60' : ''
          }`}
        >
          <div className="flex flex-col gap-4 p-4 sm:flex-row">
            {/* Thumbnail */}
            {recipe.image && (
              <div className="relative h-48 w-full flex-shrink-0 overflow-hidden rounded-lg sm:h-32 sm:w-48">
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  className="h-full w-full object-cover"
                />
                {recipe.isCooked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex flex-1 flex-col gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg">{recipe.title}</h3>
                  <Badge variant="outline" className="flex items-center gap-1.5">
                    {getSourceIcon(recipe.source)}
                    {recipe.source}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {recipe.author && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {recipe.author}
                    </div>
                  )}
                  {recipe.prepTime && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {recipe.prepTime}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {t('cookLater.addedOn')} {format(new Date(recipe.dateAdded), 'MMM dd, yyyy')}
                  </div>
                </div>

                {recipe.tag && (
                  <Badge variant="secondary" className="w-fit">
                    {t(`tag.${recipe.tag}`)}
                  </Badge>
                )}

                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {recipe.ingredients.slice(0, 3).join(', ')}
                    {recipe.ingredients.length > 3 && '...'}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(recipe.sourceUrl, '_blank')}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  {t('cookLater.open')}
                </Button>
                <Button variant="outline" size="sm">
                  <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                  {t('cookLater.addToPlanner')}
                </Button>
                <Button
                  variant={recipe.isCooked ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => markAsCooked(recipe.id, !recipe.isCooked)}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  {recipe.isCooked ? 'Cooked' : t('cookLater.markCooked')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRecipe(recipe.id)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('cookLater.remove')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
