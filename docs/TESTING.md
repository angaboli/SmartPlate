# SmartPlate — Testing Strategy

> **Version**: 2.1
> **Last updated**: 2026-07-20

---

## Testing Stack

| Layer | Tool | Purpose |
|---|---|---|
| Unit tests | Vitest | Services, utilities, Zod schemas |
| API integration | Vitest + fetch | Route Handlers |
| Frontend components | Vitest + Testing Library | Component behavior |
| E2E | Playwright | Full browser flows (`pnpm test:e2e`, local only — see below) |
| Coverage | Vitest (c8/istanbul) | Code coverage reports |

---

## E2E (Playwright)

`pnpm test:e2e` runs 3 critical-path specs under `e2e/`: register/login/logout
(`auth.spec.ts`), log a meal + AI analysis (`meal-log.spec.ts`), and import a
recipe from a URL (`import.spec.ts`). `pnpm test:e2e:ui` opens Playwright's UI
mode for debugging.

**Local only, not wired into CI.** Two things CI doesn't have that these
tests need:
- A real database — CI's build step uses a placeholder `DATABASE_URL` just
  to satisfy `next build`; there's no live Postgres to register a user
  against. These tests run against the same Neon dev DB as `pnpm dev`.
- Chromium's system libraries — not installed on the CI image or in a fresh
  dev environment. Run `sudo npx playwright install-deps chromium` once
  (`sudo env "PATH=$PATH" npx ...` if Node comes from nvm/volta/fnm, since
  `sudo` won't see it on `PATH` otherwise), plus `npx playwright install
  chromium` for the browser binary itself.

**How the two server-side external calls are handled**, since Playwright's
browser-level network mocking can't reach requests this app makes
server-side (not from the browser):
- **OpenAI** (`src/services/ai.service.ts`) — its client takes an optional
  `OPENAI_BASE_URL` override (no-op everywhere else). `playwright.config.ts`
  points it at `e2e/mock-servers/server.mjs`, a dependency-free Node server
  that returns a canned, schema-valid completion.
- **The scraped recipe page** (import flow) — no override needed; the test
  just imports from `e2e/mock-servers/server.mjs`'s `GET /recipe-fixture`
  (a static page with JSON-LD `Recipe` data) instead of a real site.

**Auth and rate limits**: `e2e/global-setup.ts` registers one user through
the real UI and saves the session via Playwright's `storageState`, shared by
every spec except `auth.spec.ts` (which needs to start logged out to test
register/login/logout itself). This keeps the suite to 2 registrations per
run — registration is rate-limited to 5/hour per IP
(`src/app/api/v1/auth/register/route.ts`), a real production guard, not
something to weaken for tests. `e2e/global-teardown.ts` deletes every
`@e2e.smartplate.test` user (and any recipe imported from
`/recipe-fixture`), plus the local (`127.0.0.1`/`::1`/`::ffff:127.0.0.1`)
`register` rate-limit rows those runs created — so repeated local runs never
lock themselves out and never touch real dev data or real users' quota.

---

## Test Directory Structure

```
SmartPlateApp/
├── src/
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── auth.service.test.ts
│   │   ├── recipes.service.ts
│   │   ├── recipes.service.test.ts
│   │   └── ...
│   ├── lib/
│   │   └── validations/
│   │       ├── auth.ts
│   │       └── auth.test.ts
│   ├── components/
│   │   ├── RecipeCard.tsx
│   │   ├── RecipeCard.test.tsx
│   │   └── ...
│   ├── contexts/
│   │   ├── LanguageContext.tsx
│   │   └── LanguageContext.test.tsx
│   └── hooks/
│       ├── useRecipes.ts
│       └── useRecipes.test.ts
│
├── app/
│   └── api/v1/
│       ├── auth/
│       │   └── __tests__/
│       │       └── auth.integration.test.ts
│       └── recipes/
│           └── __tests__/
│               └── recipes.integration.test.ts
│
└── vitest.config.ts
```

Co-locate unit tests with source files. Integration tests for API routes go in `__tests__/` folders.

---

## Testing Patterns

### Service Unit Tests

```typescript
// src/services/auth.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { register, login } from './auth.service';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    },
  },
}));

describe('auth.service', () => {
  describe('register', () => {
    it('should create user with hashed password', async () => { ... });
    it('should throw for duplicate email', async () => { ... });
    it('should return access and refresh tokens', async () => { ... });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => { ... });
    it('should throw for wrong password', async () => { ... });
  });
});
```

### Route Handler Integration Tests

```typescript
// app/api/v1/auth/__tests__/auth.integration.test.ts
import { describe, it, expect } from 'vitest';

describe('Auth API', () => {
  it('POST /api/v1/auth/register creates user', async () => {
    const res = await fetch('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'Test123!!' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.email).toBe('test@example.com');
    expect(body.accessToken).toBeDefined();
  });
});
```

### Zod Schema Tests

```typescript
// src/lib/validations/auth.test.ts
import { describe, it, expect } from 'vitest';
import { registerSchema } from './auth';

describe('registerSchema', () => {
  it('accepts valid input', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Test123!!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'Test123!!',
    });
    expect(result.success).toBe(false);
  });
});
```

### Component Tests

```typescript
// src/components/RecipeCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeCard } from './RecipeCard';

describe('RecipeCard', () => {
  const recipe = { id: '1', title: 'Test Recipe', calories: 500 };

  it('renders recipe title', () => {
    render(<RecipeCard recipe={recipe} />);
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });

  it('calls onViewRecipe when clicked', () => {
    const onView = vi.fn();
    render(<RecipeCard recipe={recipe} onViewRecipe={onView} />);
    fireEvent.click(screen.getByText('Test Recipe'));
    expect(onView).toHaveBeenCalledWith(recipe);
  });
});
```

---

## Coverage Targets

| Area | Target |
|---|---|
| `src/services/` | 80% |
| `src/lib/validations/` | 95% |
| `src/hooks/` | 70% |
| `src/components/` (critical) | 60% |
| `app/api/v1/` (integration) | 70% |

---

## Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage report
pnpm test -- --coverage

# Specific file
pnpm test src/services/auth.service.test.ts
```

---

## CI Integration

```yaml
jobs:
  test:
    steps:
      - pnpm install
      - pnpm lint
      - pnpm typecheck
      - pnpm test -- --coverage
      - pnpm build
```

---

## Test Schedule by Milestone

| Milestone | Tests Added |
|---|---|
| M1 | Health endpoint test |
| M2 | Auth service, auth routes, Zod schema tests |
| M3 | Recipes service, recipes routes, seed verification |
| M4 | SavedRecipes service, routes |
| M5 | Import service, worker, rate limiting |
| M6 | AI service (mocked LLM), prompt validation |
| M7 | Planner service, grocery list aggregation |
| M8 | i18n completeness test |
| M9 | Full coverage pass, security tests |
