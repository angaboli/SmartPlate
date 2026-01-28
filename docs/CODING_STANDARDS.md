# SmartPlate — Coding Standards

> **Version**: 2.0
> **Last updated**: 2026-01-28

---

## General Principles

1. **Keep it simple** — avoid premature abstraction
2. **Consistency over cleverness** — follow existing patterns
3. **Type everything** — no `any` unless absolutely necessary
4. **Small functions** — each function does one thing
5. **Descriptive names** — code should read like prose

---

## TypeScript

### Strictness
- `strict: true` in tsconfig
- No `// @ts-ignore` without an explaining comment
- Prefer `unknown` over `any`
- Prefer explicit return types on exported functions

### Naming

| Element | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `RecipeCard.tsx` |
| Files (utilities) | camelCase | `parseUrl.ts` |
| Files (services) | kebab-case with suffix | `auth.service.ts` |
| Interfaces/Types | PascalCase | `RecipeIngredient` |
| Functions | camelCase | `getRecipeById` |
| Constants | SCREAMING_SNAKE | `MAX_IMPORT_RATE` |
| Boolean variables | is/has/should prefix | `isLoading`, `hasError` |
| Event handlers | handle prefix | `handleSubmit` |
| Hooks | use prefix | `useRecipes` |

### Imports
```typescript
// 1. External
import { useState } from 'react';
import { z } from 'zod';

// 2. Internal (path alias)
import { RecipeCard } from '@/components/RecipeCard';
import { useRecipes } from '@/hooks/useRecipes';
import { listRecipes } from '@/services/recipes.service';
```

---

## React Components

```typescript
// 1. Types
interface RecipeCardProps {
  recipe: Recipe;
  onSave?: (id: string) => void;
}

// 2. Component (function declaration, named export)
export function RecipeCard({ recipe, onSave }: RecipeCardProps) {
  const { t } = useLanguage();
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    onSave?.(recipe.id);
  };

  return (
    <div>
      <h3>{recipe.title}</h3>
      <Button onClick={handleSave}>{t('common.save')}</Button>
    </div>
  );
}
```

Rules:
- Function declarations for components (not arrow functions)
- One component per file
- Props interface above the component
- Use `t()` for all visible strings
- No inline styles — Tailwind classes only

---

## API Route Handlers

```typescript
// app/api/v1/recipes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listRecipes } from '@/services/recipes.service';
import { recipeFilterSchema } from '@/lib/validations/recipe';

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filters = recipeFilterSchema.parse(params);
  const result = await listRecipes(filters);
  return NextResponse.json(result);
}
```

Rules:
- Route Handlers handle HTTP concerns only (parsing, status codes)
- Business logic goes in `src/services/`
- Validate input with Zod before calling services
- Return consistent response shapes

---

## Service Layer

```typescript
// src/services/recipes.service.ts
import { prisma } from '@/lib/db';

export async function listRecipes(filters: RecipeFilters) {
  return prisma.recipe.findMany({
    where: { ... },
    take: filters.limit,
    skip: (filters.page - 1) * filters.limit,
  });
}
```

Rules:
- Plain functions (no classes needed at this scale)
- Import Prisma client from `@/lib/db`
- Throw descriptive errors for business rule violations
- Keep functions small and focused

---

## Git Conventions

### Branch Naming
```
feature/m2-auth-login
fix/recipe-filter-crash
chore/update-dependencies
```

### Commit Messages (Conventional Commits)
```
feat(auth): add JWT login and registration
fix(recipes): correct pagination offset calculation
chore(deps): update prisma to 6.x
docs(api): add import endpoint documentation
test(auth): add integration tests for refresh flow
```

### Scopes
`auth`, `users`, `recipes`, `imports`, `planner`, `ai`, `meal-logs`, `i18n`, `ui`, `deps`, `ci`, `docs`

---

## Tailwind CSS

### Class order
1. Layout: `flex`, `grid`, `block`
2. Positioning: `relative`, `absolute`, `sticky`
3. Sizing: `w-`, `h-`, `max-w-`
4. Spacing: `p-`, `m-`, `gap-`
5. Typography: `text-`, `font-`
6. Visual: `bg-`, `border-`, `rounded-`, `shadow-`
7. States: `hover:`, `focus:`
8. Responsive: `sm:`, `md:`, `lg:`

### Use design tokens
```css
/* Do */
className="text-primary bg-secondary"

/* Don't */
className="text-[#2F7F6D] bg-[#E8F4F1]"
```

---

## Environment Variables

- All vars documented in `.env.example`
- Server-only: `process.env.VARIABLE`
- Client-accessible: `NEXT_PUBLIC_` prefix
- Never commit `.env`
- Validate required vars at startup
