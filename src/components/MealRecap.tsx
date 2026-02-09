import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, AlertCircle, Lightbulb, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AnalysisDataDTO, SuggestionDTO } from '@/hooks/useMealLog';

interface MealRecapProps {
  mealText: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  totalCalories: number;
  analysisData: AnalysisDataDTO;
  suggestions: SuggestionDTO[];
}

export function MealRecap({ mealText, mealType, totalCalories, analysisData, suggestions }: MealRecapProps) {
  const { t } = useLanguage();

  const mealTypeKey = mealType === 'snack' ? 'tag.snack' : `tag.${mealType}`;

  const getBalanceLabel = (balance: string) => {
    switch (balance) {
      case 'excellent':
        return t('analysis.balanceExcellent');
      case 'good':
        return t('analysis.balanceGood');
      default:
        return t('analysis.balanceNeedsImprovement');
    }
  };

  const getNutrientStatus = (value: number, target: number) => {
    const ratio = value / target;
    if (ratio >= 0.8 && ratio <= 1.2)
      return { icon: CheckCircle2, color: 'text-primary' };
    if (ratio < 0.5 || ratio > 1.5)
      return { icon: AlertCircle, color: 'text-destructive' };
    return { icon: AlertTriangle, color: 'text-[#E9C46A]' };
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'improve':
        return TrendingUp;
      case 'swap':
        return ArrowRightLeft;
      default:
        return Lightbulb;
    }
  };

  const getSuggestionBadgeStyle = (type: string) => {
    switch (type) {
      case 'improve':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'swap':
        return 'bg-[#E9C46A]/10 text-[#8A6A4F] border-[#E9C46A]/20';
      default:
        return 'bg-[#F4A261]/10 text-[#F4A261] border-[#F4A261]/20';
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-semibold">{t('recap.title')}</h2>

      {/* Section 1 — Your Meal */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('recap.yourMeal')}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">{t(mealTypeKey)}</Badge>
          <span className="text-sm font-medium">
            {t('recap.estimatedCalories')}: {totalCalories} kcal
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{mealText}</p>
      </div>

      <hr className="border-border" />

      {/* Section 2 — AI Analysis */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('recap.aiAnalysis')}
        </h3>
        <p className="text-sm">
          <span className="font-medium">{t('analysis.mealBalance')}:</span>{' '}
          {getBalanceLabel(analysisData.balance)}
        </p>
        {analysisData.balanceExplanation && (
          <p className="text-sm text-muted-foreground">{analysisData.balanceExplanation}</p>
        )}

        {/* Nutrient table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">{t('recap.nutrient')}</th>
                <th className="pb-2 pr-4 font-medium">{t('recap.value')}</th>
                <th className="pb-2 pr-4 font-medium">{t('recap.target')}</th>
                <th className="pb-2 font-medium">{t('recap.status')}</th>
              </tr>
            </thead>
            <tbody>
              {analysisData.nutrients.map((nutrient) => {
                const status = getNutrientStatus(nutrient.value, nutrient.target);
                const StatusIcon = status.icon;
                return (
                  <tr key={nutrient.name} className="border-b last:border-0">
                    <td className="py-2 pr-4">{nutrient.name}</td>
                    <td className="py-2 pr-4">{nutrient.value}{nutrient.unit}</td>
                    <td className="py-2 pr-4">{nutrient.target}{nutrient.unit}</td>
                    <td className="py-2">
                      <StatusIcon className={`h-4 w-4 ${status.color}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <hr className="border-border" />

      {/* Section 3 — AI Recommendations */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('recap.aiRecommendations')}
        </h3>

        {/* Missing nutrients */}
        {analysisData.missing.length > 0 && (
          <div>
            <p className="text-sm font-medium text-[#F4A261] mb-1">{t('recap.missingNutrients')}</p>
            <ul className="space-y-1">
              {analysisData.missing.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-[#F4A261] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Overconsumption */}
        {analysisData.overconsumption.length > 0 && (
          <div>
            <p className="text-sm font-medium text-destructive mb-1">{t('recap.overconsumption')}</p>
            <ul className="space-y-1">
              {analysisData.overconsumption.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-destructive shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">{t('recap.suggestions')}</p>
            <ol className="space-y-2">
              {suggestions.map((suggestion, i) => {
                const Icon = getSuggestionIcon(suggestion.type);
                return (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium">{suggestion.title}</span>
                        <Badge className={`text-xs ${getSuggestionBadgeStyle(suggestion.type)}`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {suggestion.type}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{suggestion.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
