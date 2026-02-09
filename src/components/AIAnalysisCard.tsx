import { CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

interface NutrientData {
  name: string;
  value: number;
  target: number;
  unit: string;
}

interface AnalysisData {
  balance: 'excellent' | 'good' | 'needs-improvement';
  balanceExplanation?: string;
  nutrients: NutrientData[];
  missing: string[];
  overconsumption: string[];
}

interface AIAnalysisCardProps {
  data: AnalysisData;
}

export function AIAnalysisCard({ data }: AIAnalysisCardProps) {
  const { t } = useLanguage();

  const getBalanceColor = (balance: string) => {
    switch (balance) {
      case 'excellent':
        return 'text-primary';
      case 'good':
        return 'text-[#E9C46A]';
      default:
        return 'text-[#F4A261]';
    }
  };

  const getBalanceIcon = (balance: string) => {
    return balance === 'excellent' ? CheckCircle2 : AlertCircle;
  };

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

  const getNutrientColor = (value: number, target: number) => {
    const ratio = value / target;
    if (ratio >= 0.8 && ratio <= 1.2) return 'text-primary';
    if (ratio < 0.5 || ratio > 1.5) return 'text-destructive';
    return 'text-[#E9C46A]';
  };

  const BalanceIcon = getBalanceIcon(data.balance);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Overall Balance */}
      <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('analysis.mealBalance')}</p>
            <div className="flex items-center gap-2">
              <BalanceIcon className={`h-5 w-5 ${getBalanceColor(data.balance)}`} />
              <span className={`text-lg font-semibold ${getBalanceColor(data.balance)}`}>
                {getBalanceLabel(data.balance)}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </div>
        {data.balanceExplanation && (
          <p className="mt-3 text-sm text-muted-foreground">
            {data.balanceExplanation}
          </p>
        )}
      </div>

      {/* Macronutrients */}
      <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2">
        <h3 className="mb-4 font-semibold">{t('analysis.macronutrients')}</h3>
        <div className="space-y-4">
          {data.nutrients.map((nutrient) => {
            const percentage = Math.min((nutrient.value / nutrient.target) * 100, 100);
            return (
              <div key={nutrient.name}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{nutrient.name}</span>
                  <span className={`font-medium ${getNutrientColor(nutrient.value, nutrient.target)}`}>
                    {nutrient.value}{nutrient.unit} / {nutrient.target}{nutrient.unit}
                  </span>
                </div>
                <Progress value={percentage} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Missing Nutrients */}
      {data.missing.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#F4A261]">{t('analysis.addMore')}</h3>
          <ul className="space-y-2">
            {data.missing.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-1 text-[#F4A261]">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overconsumption */}
      {data.overconsumption.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-3 font-semibold text-destructive">{t('analysis.reduce')}</h3>
          <ul className="space-y-2">
            {data.overconsumption.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-1 text-destructive">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
