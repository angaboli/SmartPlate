import { CheckCircle2, AlertCircle, TrendingUp, Droplets } from 'lucide-react';
import { Progress } from '@/app/components/ui/progress';

interface NutrientData {
  name: string;
  value: number;
  target: number;
  unit: string;
}

interface AnalysisData {
  balance: 'excellent' | 'good' | 'needs-improvement';
  nutrients: NutrientData[];
  missing: string[];
  overconsumption: string[];
}

interface AIAnalysisCardProps {
  data: AnalysisData;
}

export function AIAnalysisCard({ data }: AIAnalysisCardProps) {
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

  const BalanceIcon = getBalanceIcon(data.balance);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Overall Balance */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Meal Balance</p>
            <div className="flex items-center gap-2">
              <BalanceIcon className={`h-5 w-5 ${getBalanceColor(data.balance)}`} />
              <span className="text-lg font-semibold capitalize">{data.balance}</span>
            </div>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Your meal composition looks {data.balance}. Keep up the good work!
        </p>
      </div>

      {/* Hydration */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Hydration</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">1.5L / 2.5L</span>
            </div>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <Droplets className="h-5 w-5 text-primary" />
          </div>
        </div>
        <Progress value={60} className="mt-3" />
        <p className="mt-2 text-sm text-muted-foreground">
          Drink 1 more liter to reach your goal
        </p>
      </div>

      {/* Macronutrients */}
      <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2">
        <h3 className="mb-4 font-semibold">Macronutrients</h3>
        <div className="space-y-4">
          {data.nutrients.map((nutrient) => (
            <div key={nutrient.name}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{nutrient.name}</span>
                <span className="font-medium">
                  {nutrient.value}g / {nutrient.target}g
                </span>
              </div>
              <Progress value={(nutrient.value / nutrient.target) * 100} />
            </div>
          ))}
        </div>
      </div>

      {/* Missing Nutrients */}
      {data.missing.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#F4A261]">Add More</h3>
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
          <h3 className="mb-3 font-semibold text-destructive">Reduce</h3>
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