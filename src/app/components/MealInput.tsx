import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Sparkles, Plus } from 'lucide-react';

interface MealInputProps {
  onAnalyze: (meal: string, mealType: string) => void;
}

export function MealInput({ onAnalyze }: MealInputProps) {
  const [mealText, setMealText] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('lunch');

  const mealTypes = [
    { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { id: 'lunch', label: 'Lunch', icon: '☀️' },
    { id: 'dinner', label: 'Dinner', icon: '🌙' },
    { id: 'snacks', label: 'Snacks', icon: '🍎' },
  ];

  const quickAddItems = [
    'Chicken breast',
    'Brown rice',
    'Broccoli',
    'Salmon',
    'Quinoa',
    'Avocado',
    'Sweet potato',
    'Spinach',
  ];

  const handleAnalyze = () => {
    if (mealText.trim()) {
      onAnalyze(mealText, selectedMealType);
    }
  };

  const handleQuickAdd = (item: string) => {
    setMealText((prev) => (prev ? `${prev}, ${item}` : item));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Meal Type</label>
          <div className="flex flex-wrap gap-2">
            {mealTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedMealType === type.id ? 'default' : 'outline'}
                onClick={() => setSelectedMealType(type.id)}
                className={selectedMealType === type.id ? 'bg-primary' : ''}
              >
                <span className="mr-2">{type.icon}</span>
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">What did you eat today?</label>
          <Textarea
            placeholder="E.g., Grilled chicken with quinoa, steamed broccoli, and olive oil..."
            value={mealText}
            onChange={(e) => setMealText(e.target.value)}
            className="min-h-[120px] resize-none bg-input-background"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Add</label>
          <div className="flex flex-wrap gap-2">
            {quickAddItems.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className="cursor-pointer hover:bg-secondary transition-colors"
                onClick={() => handleQuickAdd(item)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          onClick={handleAnalyze}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90"
          disabled={!mealText.trim()}
        >
          <Sparkles className="h-5 w-5 mr-2" />
          Analyze with AI
        </Button>
      </div>
    </div>
  );
}
