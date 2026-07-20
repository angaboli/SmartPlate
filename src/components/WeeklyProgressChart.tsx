'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface WeeklyDataPoint {
  day: string;
  calories: number;
  target: number;
}

interface WeeklyProgressChartProps {
  data: WeeklyDataPoint[];
  onLogMealClick?: () => void;
}

export function WeeklyProgressChart({ data, onLogMealClick }: WeeklyProgressChartProps) {
  const { t } = useLanguage();

  const hasData = data.some((d) => d.calories > 0);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-semibold">{t('chart.title')}</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" className="text-sm" />
            <YAxis className="text-sm" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Bar dataKey="calories" fill="#2F7F6D" name={t('chart.actual')} radius={[8, 8, 0, 0]} />
            <Bar dataKey="target" fill="#E8F4F1" name={t('chart.target')} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold">{t('dashboard.chartEmptyTitle')}</h4>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t('dashboard.chartEmptyDesc')}
            </p>
          </div>
          {onLogMealClick && (
            <Button size="sm" onClick={onLogMealClick} className="mt-1">
              {t('dashboard.chartEmptyCta')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
