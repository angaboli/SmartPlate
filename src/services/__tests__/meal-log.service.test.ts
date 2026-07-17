import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => import('../../lib/__mocks__/db'));
vi.mock('../ai.service', () => ({
  analyzeMeal: vi.fn().mockResolvedValue({
    analysisData: { balance: 'good', nutrients: [] },
    suggestions: ['Add more vegetables'],
    totalCalories: 500,
  }),
  analyzeMealPhoto: vi.fn().mockResolvedValue({
    mealDescription: 'Grilled chicken with rice',
    analysisData: { balance: 'good', nutrients: [] },
    suggestions: ['Add more vegetables'],
    totalCalories: 600,
  }),
}));

import { db } from '../../lib/__mocks__/db';
import {
  checkAnalysisRateLimit,
  validateMealInput,
  createMealLog,
  createMealLogFromPhoto,
  listMealLogs,
} from '../meal-log.service';
import { analyzeMealPhoto } from '../ai.service';

const JPEG_1PX_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

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

describe('createMealLogFromPhoto', () => {
  const validDataUrl = `data:image/jpeg;base64,${JPEG_1PX_BASE64}`;

  it('creates a meal log with AI vision analysis, using the AI-generated description as mealText', async () => {
    db.userSettings.findUnique.mockResolvedValue({ calorieTarget: 2000, proteinTargetG: 60 });
    db.mealLog.create.mockResolvedValue({
      id: 'ml2',
      mealText: 'Grilled chicken with rice',
      mealType: 'lunch',
      totalCalories: 600,
    });

    const result = await createMealLogFromPhoto('u1', {
      imageDataUrl: validDataUrl,
      mealType: 'lunch',
    });

    expect(result.id).toBe('ml2');
    expect(analyzeMealPhoto).toHaveBeenCalledWith(validDataUrl, 'lunch', expect.any(Object));
    expect(db.mealLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mealText: 'Grilled chicken with rice',
          mealType: 'lunch',
          totalCalories: 600,
        }),
      }),
    );
  });

  it('rejects a malformed data URL', async () => {
    await expect(
      createMealLogFromPhoto('u1', { imageDataUrl: 'not-a-data-url', mealType: 'lunch' }),
    ).rejects.toThrow('Invalid image data');
    expect(analyzeMealPhoto).not.toHaveBeenCalled();
  });

  it('rejects a disallowed MIME type (e.g. GIF)', async () => {
    await expect(
      createMealLogFromPhoto('u1', {
        imageDataUrl: `data:image/gif;base64,${JPEG_1PX_BASE64}`,
        mealType: 'lunch',
      }),
    ).rejects.toThrow('Only JPEG, PNG, and WebP images are allowed');
    expect(analyzeMealPhoto).not.toHaveBeenCalled();
  });

  it('rejects an image exceeding 2MB', async () => {
    const oversizedBase64 = Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64');
    await expect(
      createMealLogFromPhoto('u1', {
        imageDataUrl: `data:image/jpeg;base64,${oversizedBase64}`,
        mealType: 'lunch',
      }),
    ).rejects.toThrow('smaller than 2MB');
    expect(analyzeMealPhoto).not.toHaveBeenCalled();
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
