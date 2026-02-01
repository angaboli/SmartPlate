import { vi } from 'vitest';

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };
}

export const db = {
  user: createModelMock(),
  userSettings: createModelMock(),
  refreshToken: createModelMock(),
  recipe: createModelMock(),
  recipeIngredient: createModelMock(),
  recipeStep: createModelMock(),
  savedRecipe: createModelMock(),
  import: createModelMock(),
  mealLog: createModelMock(),
  mealPlan: createModelMock(),
  mealPlanItem: createModelMock(),
  rateLimitAttempt: createModelMock(),
  $transaction: vi.fn((fn: (tx: any) => any) => fn(db)),
};
