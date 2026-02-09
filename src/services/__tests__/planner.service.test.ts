import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));
vi.mock('../ai.service', () => ({
  generateWeeklyPlan: vi.fn(),
  adjustWeeklyPlan: vi.fn(),
  generateGroceryList: vi.fn(),
}));

import { db } from '../../lib/__mocks__/db';
import {
  checkPlannerRateLimit,
  getWeekStartDate,
  formatPlanForClient,
  getPlan,
} from '../planner.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkPlannerRateLimit', () => {
  it('does not throw when under limit', async () => {
    db.mealPlan.count.mockResolvedValue(2);
    await expect(checkPlannerRateLimit('u1')).resolves.toBeUndefined();
  });

  it('throws 429 when at limit', async () => {
    db.mealPlan.count.mockResolvedValue(5);
    await expect(checkPlannerRateLimit('u1')).rejects.toThrow('Daily plan generation limit');
  });
});

describe('getWeekStartDate', () => {
  it('returns a Monday', () => {
    const result = getWeekStartDate(new Date('2024-01-17')); // Wednesday
    expect(result.getDay()).toBe(1); // Monday
  });

  it('returns same date if already Monday', () => {
    const result = getWeekStartDate(new Date('2024-01-15')); // Monday
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(15);
  });

  it('handles Sunday correctly', () => {
    const result = getWeekStartDate(new Date('2024-01-21')); // Sunday
    expect(result.getDay()).toBe(1); // Previous Monday
    expect(result.getDate()).toBe(15);
  });
});

describe('formatPlanForClient', () => {
  it('formats plan with 7 days', () => {
    const plan = {
      id: 'p1',
      weekStart: new Date('2024-01-15'),
      items: [
        { id: 'i1', dayIndex: 0, mealType: 'breakfast', name: 'Oatmeal', calories: 300, sortOrder: 0 },
        { id: 'i2', dayIndex: 0, mealType: 'lunch', name: 'Salad', calories: 400, sortOrder: 1 },
      ],
    };

    const result = formatPlanForClient(plan);
    expect(result.id).toBe('p1');
    expect(result.weekData).toHaveLength(7);
    expect(result.weekData[0].day).toBe('Monday');
    expect(result.weekData[0].meals).toHaveLength(2);
  });

  it('handles empty items array', () => {
    const plan = {
      id: 'p1',
      weekStart: new Date('2024-01-15'),
      items: [],
    };

    const result = formatPlanForClient(plan);
    expect(result.weekData).toHaveLength(7);
    result.weekData.forEach((day) => {
      expect(day.meals).toHaveLength(0);
    });
  });
});

describe('getPlan', () => {
  it('returns null when no plan exists', async () => {
    db.mealPlan.findUnique.mockResolvedValue(null);
    const result = await getPlan('u1');
    expect(result).toBeNull();
  });

  it('returns formatted plan when it exists', async () => {
    db.mealPlan.findUnique.mockResolvedValue({
      id: 'p1',
      weekStart: new Date('2024-01-15'),
      items: [],
    });

    const result = await getPlan('u1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('p1');
  });
});
