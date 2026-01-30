import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { day: 'Mon', calories: 1850, target: 2000 },
  { day: 'Tue', calories: 1920, target: 2000 },
  { day: 'Wed', calories: 2100, target: 2000 },
  { day: 'Thu', calories: 1780, target: 2000 },
  { day: 'Fri', calories: 1950, target: 2000 },
  { day: 'Sat', calories: 2200, target: 2000 },
  { day: 'Sun', calories: 1890, target: 2000 },
];

export function WeeklyProgressChart() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-semibold">Weekly Calorie Tracking</h3>
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
          <Bar dataKey="calories" fill="#2F7F6D" name="Actual" radius={[8, 8, 0, 0]} />
          <Bar dataKey="target" fill="#E8F4F1" name="Target" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
