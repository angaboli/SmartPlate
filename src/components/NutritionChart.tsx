import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface NutritionChartProps {
  protein: number;
  carbs: number;
  fats: number;
}

export function NutritionChart({ protein, carbs, fats }: NutritionChartProps) {
  const data = [
    { name: 'Protein', value: protein, color: '#2F7F6D' },
    { name: 'Carbs', value: carbs, color: '#F4A261' },
    { name: 'Fats', value: fats, color: '#E9C46A' },
  ];

  const total = protein + carbs + fats;

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="grid grid-cols-3 gap-4">
        {data.map((item) => (
          <div key={item.name} className="space-y-1 text-center">
            <div
              className="mx-auto h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.value}g</p>
          </div>
        ))}
      </div>
    </div>
  );
}
