# SmartPlate — Implementation Roadmap

> **Version**: 2.0
> **Last updated**: 2026-01-28

---

## Milestone Overview

```
M0  Repo cleanup + tooling + Next.js migration
 │
 v
M1  Prisma + DB + health endpoint
 │
 v
M2  Auth (JWT) + Login/Register UI
 │
 ├─────────────────────────────┐
 v                             v
M3  Recipes read-only         M6  AI Coach (LLM)
 │                             │
 v                             v
M4  Cook Later (saved)        M7  Planner + groceries
 │                             │
 v                             │
M5  Import feature (async)    │
 │                             │
 └─────────────┬───────────────┘
               v
M8  i18n EN/FR (complete)
 │
 v
M9  Hardening (security, tests, monitoring)
```

---

## M0: Repository Cleanup, Tooling & Next.js Migration

### Goal
Transform the Figma-exported Vite project into a Next.js app with proper tooling.

### Tasks (ordered)

1. **Initialize git**
   - `git init`, create `.gitignore`
   - Initial commit with current state

2. **Fix package.json**
   - Rename from `@figma/my-make-file` to `smartplate`
   - Move `react`, `react-dom` from `peerDependencies` to `dependencies`
   - Remove unused MUI dependencies (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`) — verify unused first
   - Remove Vite dependencies (`vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`)

3. **Install Next.js**
   - `pnpm add next@latest`
   - `pnpm add -D @types/node`
   - Configure Tailwind CSS v4 for Next.js (postcss plugin or native)

4. **Create Next.js config**
   - `next.config.ts` with TypeScript path alias `@/`
   - `tsconfig.json` for Next.js

5. **Create App Router structure**
   - `app/layout.tsx` — move providers, header, nav, footer from `App.tsx`
   - `app/page.tsx` — Home page
   - `app/dashboard/page.tsx` — AI Coach (wrap existing `DashboardPage`)
   - `app/recipes/page.tsx` — Recipes (wrap existing `RecipesPage`)
   - `app/profile/page.tsx` — Profile (wrap existing `ProfilePage`)

6. **Move components**
   - Move `src/app/components/` → `src/components/`
   - Move `src/app/pages/` content into App Router pages
   - Keep `src/contexts/`, `src/styles/` in place
   - Update all import paths

7. **Remove Vite artifacts**
   - Delete `vite.config.ts`, `postcss.config.mjs`
   - Delete `main.tsx` (replaced by `app/layout.tsx`)
   - Delete `src/app/App.tsx` (replaced by `app/layout.tsx`)
   - Update `index.html` → not needed (Next.js handles this)

8. **Add ESLint**
   - `pnpm add -D eslint @eslint/eslintrc`
   - Next.js ESLint config

9. **Create `.env.example`**
   - Document all env vars without secrets

10. **Verify everything works**
    - `pnpm dev` starts Next.js
    - All 4 pages render at their URL routes
    - Navigation, theme toggle, language switcher work
    - Mobile responsive layout works

### Code Areas
`package.json`, `next.config.ts`, `tsconfig.json`, `app/`, `src/components/`, `.gitignore`, `.env.example`

### Acceptance Criteria
- [ ] Git initialized with `.gitignore`
- [ ] `pnpm dev` starts Next.js on `http://localhost:3000`
- [ ] Home page at `/`
- [ ] Dashboard at `/dashboard`
- [ ] Recipes at `/recipes`
- [ ] Profile at `/profile`
- [ ] Sticky header + navigation works (desktop + mobile)
- [ ] Dark/light theme toggle works
- [ ] Language switcher (EN/FR) works
- [ ] Import Recipe dialog opens
- [ ] Cook Later tab shows in Profile
- [ ] No console errors

### Tests
None (tooling milestone).

---

## M1: Prisma + Database + Health Endpoint

### Goal
Connect to PostgreSQL via Prisma. First API Route Handler responds.

### Tasks (ordered)

1. **Install Prisma**
   - `pnpm add prisma @prisma/client`
   - `pnpm prisma init` (creates `prisma/schema.prisma`)
   - Configure `DATABASE_URL` from existing `.env`

2. **Create initial schema**
   - `User`, `UserSettings`, `RefreshToken` models only
   - Run `pnpm prisma migrate dev --name init`

3. **Create Prisma client singleton**
   - `src/lib/db.ts` — singleton pattern for Next.js dev mode (avoids connection exhaustion)

4. **Create health endpoint**
   - `app/api/v1/health/route.ts`
   - Returns `{ status: "ok", timestamp, version }`
   - Tests database connectivity

5. **Verify**
   - `GET http://localhost:3000/api/v1/health` returns 200
   - Tables exist in Neon PostgreSQL
   - Prisma Studio shows the tables: `pnpm prisma studio`

### Acceptance Criteria
- [ ] Prisma connects to Neon PostgreSQL
- [ ] `users`, `user_settings`, `refresh_tokens` tables exist
- [ ] Health endpoint returns 200
- [ ] Prisma Studio works

### Tests
- Health endpoint test (fetch + assert 200)

---

## M2: Auth (JWT + Login/Register)

### Goal
Working auth flow with JWT tokens, login/register pages, protected routes.

### Tasks (ordered)

1. **Install auth dependencies**
   - `pnpm add bcrypt jsonwebtoken`
   - `pnpm add -D @types/bcrypt @types/jsonwebtoken`
   - Add `JWT_SECRET`, `JWT_REFRESH_SECRET` to `.env`

2. **Create auth service**
   - `src/services/auth.service.ts`
   - Functions: `register()`, `login()`, `refresh()`, `logout()`
   - Password hashing with bcrypt (cost 12)
   - JWT signing: access (15min), refresh (7d)

3. **Create auth Route Handlers**
   - `app/api/v1/auth/register/route.ts` — POST
   - `app/api/v1/auth/login/route.ts` — POST
   - `app/api/v1/auth/refresh/route.ts` — POST
   - `app/api/v1/auth/logout/route.ts` — POST

4. **Create Zod validation schemas**
   - `src/lib/validations/auth.ts` — registerSchema, loginSchema

5. **Create auth middleware**
   - `middleware.ts` — validate JWT for protected routes
   - `src/lib/auth.ts` — helpers: `verifyToken()`, `getCurrentUser()`, `requireAuth()`

6. **Create auth UI**
   - `app/login/page.tsx` — login form
   - `app/register/page.tsx` — registration form
   - `src/contexts/AuthContext.tsx` — `useAuth()` hook

7. **Protect routes**
   - `/dashboard` and `/profile` redirect to `/login` if unauthenticated
   - `/` and `/recipes` remain public

8. **Update Header**
   - Show user name when logged in
   - Show Login button when not logged in

### Acceptance Criteria
- [ ] Register with email + password works
- [ ] Login works, name shows in header
- [ ] Page refresh maintains session
- [ ] Invalid credentials show error
- [ ] `/dashboard` redirects to `/login` when unauthenticated
- [ ] `/recipes` accessible without login

### Tests
- Auth service unit tests (register, login, refresh, invalid password)
- Auth Route Handler integration tests

---

## M3: Recipes Read-Only

### Goal
Recipes page powered by database data instead of hardcoded arrays.

### Tasks (ordered)

1. **Add Recipe models to Prisma** — `Recipe`, `RecipeIngredient`, `RecipeStep` + migration
2. **Create seed script** — `prisma/seed.ts` with 8 existing mock recipes
3. **Create recipes service** — `src/services/recipes.service.ts` (list, getById, filters)
4. **Create Recipe Route Handlers** — GET `/api/v1/recipes`, GET `/api/v1/recipes/:id`
5. **Install TanStack Query** — set up QueryClient provider
6. **Create `useRecipes()` hook** — fetch from API with caching
7. **Replace mock data in RecipesPage** with API data
8. **SSR recipe listing** — server-side fetch in `app/recipes/page.tsx` for SEO
9. **Add loading/error states**

### Acceptance Criteria
- [ ] Recipes load from database
- [ ] Filters work (search, goal, SafariTaste, AI Recommended)
- [ ] UI looks identical to mock data version
- [ ] Loading state shows during fetch

### Tests
- Recipes service unit tests
- Recipe Route Handler integration tests
- Seed script verification

---

## M4: Cook Later (Saved Recipes)

### Goal
Saved recipes persist in the database.

### Tasks (ordered)

1. **Add SavedRecipe model** to Prisma + migration
2. **Create saved-recipes service** — CRUD functions
3. **Create Saved Recipe Route Handlers** — GET, POST, PATCH, DELETE
4. **Create `useSavedRecipes()` hook**
5. **Migrate CookLaterContext** to use API calls
6. **Add save/unsave action** to RecipeCard
7. **Update CookLaterList** to fetch from API

### Acceptance Criteria
- [ ] Save/unsave persists across refresh
- [ ] Cook Later list in Profile loads from DB
- [ ] Mark as cooked, remove work
- [ ] Duplicate save prevented (409)

### Tests
- SavedRecipes service tests
- Route Handler integration tests

---

## M5: Import Feature (Async Jobs)

### Goal
Social media link import with async processing via BullMQ workers.

### Tasks (ordered)

1. **Set up Redis + BullMQ**
   - `pnpm add bullmq ioredis`
   - Add `REDIS_URL` to `.env`
   - Create `src/lib/queue.ts` — queue connection

2. **Add Import model** to Prisma + migration
3. **Create imports service** — create, getById, save
4. **Create Import Route Handlers** — POST, GET, save
5. **Create import worker** — `workers/import.worker.ts`
   - URL validation, provider detection
   - Open Graph / JSON-LD extraction
   - Error handling (private/invalid/timeout)
6. **Connect ImportRecipeDialog** to API (replace mock setTimeout)
7. **Add polling** for status updates
8. **Add rate limiting** — 10/hour per user

### Acceptance Criteria
- [ ] Pasting URL creates import job
- [ ] Worker processes and extracts data
- [ ] Partial/failed states handled
- [ ] Save creates recipe + saved recipe
- [ ] Rate limit returns 429

### Tests
- Import service tests
- Worker unit tests (URL validation, provider detection)
- Rate limiting test

---

## M6: AI Coach Integration

### Goal
Meal analysis powered by actual LLM calls.

### Tasks (ordered)

1. **Configure LLM** — add `OPENAI_API_KEY` to `.env`
2. **Create AI service** — `src/services/ai.service.ts` (prompt management)
3. **Create prompt templates** — meal analysis, suggestions
4. **Create MealLog service + Route Handlers**
5. **Create AI analysis worker** — `workers/ai-analysis.worker.ts`
6. **Implement Zod validation** for LLM output
7. **Connect DashboardPage** to API
8. **Add safety guardrails** — validate, sanitize, fallback

### Acceptance Criteria
- [ ] Real AI analysis for meals
- [ ] Suggestions are contextual
- [ ] Loading/error states
- [ ] Analysis saved in DB

### Tests
- AI service tests (mocked LLM)
- Prompt template tests
- MealLog service tests

---

## M7: Planner + Grocery List

### Goal
AI-generated weekly planner with grocery list.

### Tasks (ordered)

1. **Add PlannerWeek + PlannerItem** to Prisma + migration
2. **Create planner service + Route Handlers**
3. **Create AI planner worker** — `workers/ai-planner.worker.ts`
4. **Connect WeeklyPlanner** to API
5. **Wire drag-and-drop** with API persistence
6. **Implement grocery list** aggregation endpoint
7. **Connect GroceryListDialog** to API

### Acceptance Criteria
- [ ] AI generates 7-day plan
- [ ] Drag-and-drop persists
- [ ] Grocery list aggregates ingredients
- [ ] Plan persists across sessions

### Tests
- Planner service tests
- Grocery list aggregation tests

---

## M8: Internationalization EN/FR

### Goal
Complete i18n coverage with persistent language selection.

### Tasks (ordered)

1. **Extract translations** to `src/locales/en.json`, `fr.json`
2. **Audit all components** for hardcoded strings
3. **Add localStorage persistence** for language
4. **Add missing FR translations** for M2-M7 features
5. **Sync language** with user settings API
6. **Ensure date-fns locale** formatting
7. **Test both languages** end-to-end

### Acceptance Criteria
- [ ] Every visible string has EN + FR
- [ ] Language persists across refresh
- [ ] Dates formatted per locale
- [ ] No broken layout in FR

### Tests
- Translation completeness test (en keys === fr keys)

---

## M9: Hardening

### Goal
Production readiness.

### Tasks (ordered)

1. **Zod validation** on all Route Handlers
2. **Rate limiting** — global + per-endpoint (via middleware)
3. **Security headers** — via `next.config.ts` headers
4. **CORS** — restrict to production domain
5. **XSS sanitization** — user-generated content
6. **Structured logging** — pino
7. **Error tracking** — Sentry (optional)
8. **Test coverage** — target 80% services, 70% routes
9. **CI pipeline** — GitHub Actions: lint → typecheck → test → build

### Acceptance Criteria
- [ ] All endpoints validated
- [ ] Rate limiting active
- [ ] Security headers present
- [ ] CI pipeline passes
- [ ] No critical vulnerabilities in `pnpm audit`

### Tests
- Rate limiting tests
- Input validation edge cases
- Full endpoint coverage
