import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));
vi.mock('../ai.service', () => ({
  analyzeMeal: vi.fn().mockResolvedValue({
    analysisData: { balance: 'good', nutrients: [] },
    suggestions: ['Add more vegetables'],
    totalCalories: 500,
  }),
}));

import { db } from '../../lib/__mocks__/db';
import {
  checkAnalysisRateLimit,
  validateMealInput,
  createMealLog,
  listMealLogs,
} from '../meal-log.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkAnalysisRateLimit', () => {
  it('does not throw when under limit', async () => {
    db.mealLog.count.mockResolvedValue(5);
    await expect(checkAnalysisRateLimit('u1')).resolves.toBeUndefined();
  });

  it('throws 429 when at limit', async () => {
    db.mealLog.count.mockResolvedValue(20);
    await expect(checkAnalysisRateLimit('u1')).rejects.toThrow('Daily analysis limit');
  });
});

describe('validateMealInput', () => {
  it('returns trimmed text and valid type', () => {
    const result = validateMealInput('  Pasta  ', 'lunch');
    expect(result.text).toBe('Pasta');
    expect(result.type).toBe('lunch');
  });

  it('normalizes snacks to snack', () => {
    const result = validateMealInput('food', 'snacks');
    expect(result.type).toBe('snack');
  });

  it('throws on empty meal text', () => {
    expect(() => validateMealInput('', 'lunch')).toThrow();
  });

  it('throws on invalid meal type', () => {
    expect(() => validateMealInput('food', 'brunch')).toThrow();
  });

  it('throws on text exceeding 2000 chars', () => {
    expect(() => validateMealInput('a'.repeat(2001), 'lunch')).toThrow();
  });
});

describe('createMealLog', () => {
  it('creates a meal log with AI analysis', async () => {
    db.userSettings.findUnique.mockResolvedValue({ calorieTarget: 2000, proteinTargetG: 60 });
    db.mealLog.create.mockResolvedValue({
      id: 'ml1',
      mealText: 'Pasta',
      mealType: 'lunch',
      totalCalories: 500,
    });

    const result = await createMealLog('u1', { mealText: 'Pasta', mealType: 'lunch' });
    expect(result.id).toBe('ml1');
    expect(db.mealLog.create).toHaveBeenCalled();
  });
});

describe('listMealLogs', () => {
  it('returns all logs when no date filter', async () => {
    db.mealLog.findMany.mockResolvedValue([{ id: 'ml1' }]);
    const result = await listMealLogs('u1');
    expect(result).toHaveLength(1);
  });

  it('filters by date when provided', async () => {
    db.mealLog.findMany.mockResolvedValue([]);
    await listMealLogs('u1', { date: '2024-01-15' });

    const callArgs = db.mealLog.findMany.mock.calls[0][0];
    expect(callArgs.where.createdAt).toBeDefined();
  });

  it('throws on invalid date format', async () => {
    await expect(listMealLogs('u1', { date: 'not-a-date' })).rejects.toThrow('Invalid date');
  });
});
