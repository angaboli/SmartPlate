# SmartPlate — Implementation Roadmap

> **Version**: 2.2
> **Last updated**: 2026-02-01

---

## Milestone Overview

```
M0  Repo cleanup + tooling + Next.js migration   ✅
 │
 v
M1  Prisma + DB + health endpoint                ✅
 │
 v
M2  Auth (JWT) + Login/Register UI               ✅
 │
 ├─────────────────────────────┐
 v                             v
M3  Recipes read-only         M6  AI Coach (LLM)  ✅
 │                             │
 v                             v
M4  Cook Later (saved)  ✅    M7  Planner + groceries
 │                             │
 v                             │
M4.5 RBAC + Publication  ✅   │
 │                             │
 v                             │
M5  Import feature (DB)  ✅    │
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

## M4.5: RBAC + Recipe Publication Workflow

### Goal
Add role-based access control (user/editor/admin) and a recipe publication workflow (draft → pending_review → published / rejected).

### Tasks (completed)

1. **Prisma schema** — `Role` enum (user/editor/admin), `RecipeStatus` enum (draft/pending_review/published/rejected), `role` on User, `status`/`publishedAt`/`reviewNote` on Recipe + migration
2. **Standardized API errors** — `AppError` hierarchy (`AuthError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`) + `handleApiError` helper. Refactored all route handlers.
3. **JWT role claim** — `role` included in access/refresh tokens. Backward-compatible: missing role defaults to `user`.
4. **RBAC utilities** — `requireRole()`, `canEditRecipe()`, `canManagePublicationStatus()`, `canManageUsers()` pure functions in `src/lib/rbac.ts`.
5. **Recipe service** — `listRecipes` filters by status/role, `createRecipe`, `updateRecipe`, `submitForReview`, `reviewRecipe`, `deleteRecipe` with full RBAC checks.
6. **Recipe API routes** — POST/PUT/DELETE on `/recipes`, POST `/recipes/[id]/submit`, POST `/recipes/[id]/review` with role guards.
7. **Admin endpoints** — `GET /admin/users` (list), `PATCH /admin/users/[id]/role` (change role, cannot self-demote).
8. **`withAuth` wrapper** — `src/lib/withAuth.ts` HOF for DRY route-level auth + role guards.
9. **Frontend** — `role` in auth store, role-aware Navigation (My Recipes for editor+, Admin for admin), status badges on RecipeCard, admin user management page, recipe management page with review actions.
10. **Seed** — `admin@smartplate.app` (Admin123!), `editor@smartplate.app` (Editor123!), all existing recipes set to `published`, 2 test recipes (draft + pending_review).
11. **OpenAPI spec** — All new endpoints, `Role`/`RecipeStatus` schemas documented.
12. **Cook Later guard** — `saveRecipe` rejects non-published recipes with 404.

### New Files
- `src/lib/errors.ts` — Centralized error hierarchy
- `src/lib/rbac.ts` — RBAC pure functions
- `src/lib/withAuth.ts` — Auth wrapper HOF
- `src/services/user.service.ts` — User management service
- `src/app/api/v1/recipes/[id]/submit/route.ts`
- `src/app/api/v1/recipes/[id]/review/route.ts`
- `src/app/api/v1/admin/users/route.ts`
- `src/app/api/v1/admin/users/[id]/role/route.ts`
- `src/app/dashboard/admin/page.tsx`
- `src/app/dashboard/recipes/manage/page.tsx`

### Acceptance Criteria
- [x] Roles stored in DB, included in JWT
- [x] Public users only see published recipes
- [x] Editors/admins can create, review, manage recipes
- [x] Admin can change user roles
- [x] Cook Later rejects unpublished recipes
- [x] All existing endpoints remain backward-compatible

---

## M5: Import Feature (DB-backed, No Redis)

### Goal
Social media/recipe link import with synchronous processing. Users paste a URL, the backend extracts recipe data via cheerio + JSON-LD/OG, and the user edits then saves as a personal imported recipe in Cook Later.

### Tasks (completed)

1. **Install cheerio** — `pnpm add cheerio` for HTML parsing
2. **Add Import model** to Prisma + migration (`imports` table with ImportStatus enum)
3. **Create URL extraction service** — `src/services/import-extractor.ts`
   - Fetches HTML, parses JSON-LD `@type: "Recipe"` (name, description, image, prepTime, cookTime, recipeYield, ingredients, instructions)
   - Open Graph fallback (og:title, og:description, og:image)
   - Provider detection (instagram, tiktok, youtube, website)
   - ISO 8601 duration parsing
4. **Create import service** — `src/services/import.service.ts`
   - `extractFromUrl()`, `saveImport()` (transaction: Recipe + Import + SavedRecipe), `checkRateLimit()`, `listImports()`
5. **Create API routes**
   - `POST /api/v1/imports/extract` — extract recipe data (no DB write)
   - `POST /api/v1/imports` — save imported recipe
   - `GET /api/v1/imports` — list import history
6. **Create useImport hook** — `src/hooks/useImport.ts` (TanStack Query mutations)
7. **Connect ImportRecipeDialog** to real API (replaced mock setTimeout)
8. **Rate limiting** — 10 imports/hour per user via DB count, 429 on exceed
9. **Updated OpenAPI spec** — new endpoints + schemas

### New Files
- `src/services/import-extractor.ts` — URL fetch + HTML parse + extraction
- `src/services/import.service.ts` — Business logic + rate limiting
- `src/app/api/v1/imports/extract/route.ts` — POST extract endpoint
- `src/app/api/v1/imports/route.ts` — POST save + GET list endpoints
- `src/hooks/useImport.ts` — TanStack Query mutations
- `prisma/migrations/..._add_imports/` — Import table migration

### Acceptance Criteria
- [x] Pasting URL extracts recipe data via JSON-LD or OG tags
- [x] Partial detection shown for social media URLs (no ingredients/steps)
- [x] Save creates Recipe (published, isImported) + Import audit + SavedRecipe in transaction
- [x] Imported recipes appear in Cook Later list
- [x] Rate limit returns 429 after 10 imports/hour
- [x] OpenAPI spec updated with new endpoints

### Tests
- Import extractor unit tests (URL validation, provider detection, JSON-LD parsing)
- Import service tests
- Rate limiting test

---

## M6: AI Coach Integration (Meal Analysis)

### Goal
Meal analysis powered by actual LLM calls (GPT-4o-mini).

### Tasks (completed)

1. **Install OpenAI SDK** — `pnpm add openai`, added `OPENAI_API_KEY` to `.env.example`
2. **Prisma schema** — `MealType` enum (breakfast/lunch/dinner/snack), `MealLog` model with JSON analysis field, `mealLogs` relation on User + migration
3. **AI service** — `src/services/ai.service.ts` with OpenAI client (gpt-4o-mini, temperature 0.3, JSON mode), system prompt built from `UserNutritionContext` (calorie target, protein target, dietary restrictions), Zod schemas matching existing component interfaces (`AnalysisDataSchema`, `SuggestionSchema`, `MealAnalysisResultSchema`)
4. **Meal log service** — `src/services/meal-log.service.ts` with `checkAnalysisRateLimit()` (20/day via DB count), `validateMealInput()` (trim, max 2000 chars, normalize 'snacks' → 'snack'), `createMealLog()` (fetch settings → call AI → save), `listMealLogs()` (optional date filter), `getDailySummary()` (today's calories/count/target, weekDaysLogged, weekly chart data)
5. **API routes** — `POST /api/v1/meal-logs` (analyze + persist), `GET /api/v1/meal-logs` (list with date filter), `GET /api/v1/meal-logs/summary` (daily + weekly stats)
6. **Frontend hook** — `src/hooks/useMealLog.ts` with TanStack Query: `useAnalyzeMeal()` mutation, `useMealLogs()` query, `useDailySummary()` query (5-min refetch)
7. **Updated MealInput** — added `loading` prop, disabled state, spinner on button
8. **Updated Dashboard** — replaced all mock data: stats cards show live calories/target, weekly progress from API, meal analysis calls real AI, error toasts on failure
9. **Updated WeeklyProgressChart** — accepts optional `data` prop, falls back to mock
10. **Updated OpenAPI spec** — new `MealType`, `AnalysisData`, `Suggestion`, `MealLog`, `DailySummary` schemas and 3 endpoint paths

### New Files
- `src/services/ai.service.ts` — OpenAI + Zod validation
- `src/services/meal-log.service.ts` — CRUD + rate limit + summary
- `src/app/api/v1/meal-logs/route.ts` — POST + GET
- `src/app/api/v1/meal-logs/summary/route.ts` — GET summary
- `src/hooks/useMealLog.ts` — TanStack Query hooks
- `prisma/migrations/..._add_meal_logs/` — MealLog table migration

### Acceptance Criteria
- [x] Real AI analysis for meals (GPT-4o-mini)
- [x] Suggestions are contextual to user's dietary settings
- [x] Loading/error states with toast notifications
- [x] Analysis saved in DB (MealLog table)
- [x] Stats cards show live today's calories and weekly progress
- [x] Rate limiting: 20 analyses/day per user
- [x] Zod validation of LLM output
- [x] Weekly Planner tab still works (mock data unchanged)

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
