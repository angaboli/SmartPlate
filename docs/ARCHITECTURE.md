# SmartPlate — Architecture

> **Version**: 3.0
> **Last updated**: 2026-07-15

---

## System Architecture

```
                          ┌─────────────────────────────────────┐
                          │            CLIENTS                  │
                          │                                     │
                          │  ┌───────────┐   ┌──────────────┐  │
                          │  │ Web       │   │ Mobile (RN)  │  │
                          │  │ Next.js   │   │ (future)     │  │
                          │  │ SSR + CSR │   │              │  │
                          │  └─────┬─────┘   └──────┬───────┘  │
                          └───────┼─────────────────┼──────────┘
                                  │                 │
                                  └────────┬────────┘
                                           │ HTTPS
                                           │ REST JSON + JWT
                                           v
┌──────────────────────────────────────────────────────────────────────┐
│                     Next.js Application                              │
│                                                                      │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐    │
│  │   App Router (Pages)    │    │   API Route Handlers         │    │
│  │                         │    │   /api/v1/*                  │    │
│  │   / (SSR)               │    │                              │    │
│  │   /recipes (SSR)        │    │   auth/    → register, login │    │
│  │   /recipes/:id (SSR)    │    │   me/      → profile         │    │
│  │   /dashboard (CSR)      │    │   admin/   → user management │    │
│  │   /profile (CSR)        │    │   recipes/ → CRUD + RBAC     │    │
│  │   /login (CSR)          │    │   cook-later/ → CRUD         │    │
│  │   /register (CSR)       │    │   imports/ → extract + save  │    │
│  └─────────────────────────┘    │   meal-logs/ → log + analyze │    │
│                                  │   planner/ → weeks + items   │    │
│                                  └──────────────┬───────────────┘    │
│                                                 │                    │
│  ┌──────────────────────────────────────────────┴───────────────┐   │
│  │                    Service Layer                              │   │
│  │                    (plain TypeScript functions)               │   │
│  │                                                              │   │
│  │  auth.service.ts    recipes.service.ts    import.service.ts  │   │
│  │  user.service.ts    meal-log.service.ts   planner.service.ts │   │
│  │  cook-later.service.ts    ai.service.ts (OpenAI, synchronous)│   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │                                                        │
│  ┌──────────v──────────┐                                            │
│  │  Prisma Client      │                                            │
│  │  (DB access)        │                                            │
│  └──────────┬──────────┘                                            │
└─────────────┼──────────────────────────────────────────────────────┘
              │
     ┌────────v──────┐
     │  PostgreSQL   │
     │  (Neon)       │
     │               │
     │  See DATA_MODEL.md for the full schema
     └───────────────┘
```

There are no background workers and no message queue (Redis/BullMQ). Recipe import extraction (`cheerio` scraping) and AI calls (OpenAI) run **synchronously** inside the API route handler that receives the request — see [Why No Queue?](#why-no-queue-redisbullmq) below.

---

## Layer Descriptions

### 1. Pages (App Router)

Next.js App Router with file-based routing. Pages are either server-rendered (SSR) for SEO or client-rendered (CSR) for authenticated content.

| Route | Rendering | Auth | SEO |
|---|---|---|---|
| `/` | SSR | Public | Yes — landing page |
| `/recipes` | SSR | Public | Yes — recipe listing |
| `/recipes/[id]` | SSR | Public | Yes — recipe detail with JSON-LD |
| `/login`, `/register` | CSR | Public | No |
| `/about`, `/contact`, `/privacy`, `/terms` | SSR | Public | Yes |
| `/dashboard` | CSR | Protected | No — authenticated content |
| `/dashboard/admin` | CSR | Protected (admin) | No |
| `/dashboard/recipes/manage`, `/create`, `/[id]/edit` | CSR | Protected (editor/admin) | No |
| `/profile` | CSR | Protected | No — authenticated content |

### 2. API Route Handlers (`/api/v1/*`)

Standard REST endpoints implemented as Next.js Route Handlers under `src/app/api/v1/`. Each handler exports HTTP method functions (`GET`, `POST`, `PATCH`, `DELETE`).

These are regular HTTP endpoints — callable from any client (web, mobile, curl, Postman). See [API_CONTRACT.md](./API_CONTRACT.md) for the full endpoint list (26 routes across auth, admin, recipes, cook-later, imports, meal-logs, planner, health, cron).

```typescript
// src/app/api/v1/recipes/route.ts
export async function GET(request: NextRequest) {
  // Parse query params, call service, return JSON
}

export async function POST(request: NextRequest) {
  // Validate body, check auth, call service, return JSON
}
```

### 3. Service Layer (`src/services/`)

Plain TypeScript functions containing all business logic. No framework dependency — just functions that take inputs and return outputs.

```typescript
// src/services/recipes.service.ts
export async function listRecipes(filters: RecipeFilters): Promise<Recipe[]> {
  return prisma.recipe.findMany({ ... });
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  return prisma.recipe.findUnique({ where: { id }, include: { ingredients: true, steps: true } });
}
```

**Why plain functions instead of classes?**
- Simpler — no dependency injection needed at this scale
- Testable — just import and call with mocked dependencies
- Portable — if you ever extract to a separate API, the logic moves unchanged

### 4. Proxy (`src/proxy.ts`)

Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (same edge runtime, runs before every matched request). `src/proxy.ts` handles:
- JWT access-token validation (via `jose`) for protected routes (`/dashboard/*`, `/profile/*`)
- Redirecting unauthenticated users to `/login` (and authenticated users away from `/login`/`/register`)

Rate limiting is not done at the edge — it's implemented per-endpoint in the service layer via `src/lib/rate-limit.ts` (DB-backed, see below), not in the proxy.

---

## Data Flow Examples

### Recipe Import Flow

```
User pastes URL in ImportRecipeDialog
  │
  v
POST /api/v1/imports/extract { url }
  │
  v
Route Handler → import.service.ts extractFromUrl()
  - Validates URL, checks rate limit (10/hour/user, src/lib/rate-limit.ts)
  - Fetches HTML via cheerio (timeout, size cap)
  - Parses JSON-LD "Recipe" schema, falls back to Open Graph tags
  - Detects provider (Instagram/TikTok/YouTube/Other)
  - Returns extracted data (no DB write yet) — synchronously, same request
  │
  v
Frontend shows extracted data in an editable form
User edits/confirms → POST /api/v1/imports { ...editedData }
  │
  v
Route Handler → import.service.ts saveImport()
  - Transaction: creates Recipe (isImported: true) + Import audit row + SavedRecipe
  - Returns 201
```

### AI Meal Analysis Flow

```
User types meal description → submits
  │
  v
POST /api/v1/meal-logs { mealText, mealType }
  │
  v
Route Handler → meal-log.service.ts createMealLog()
  - Checks rate limit (20 analyses/day/user)
  - Loads user settings (goals, preferences, allergies) from DB
  - Constructs prompt with meal + user context
  - Calls OpenAI (gpt-4o-mini, JSON mode) synchronously — same request,
    25s client timeout (src/services/ai.service.ts)
  - Validates response with Zod, throws a clean 503 if the AI call times out
  - Persists MealLog with the analysis
  - Returns 201 with the full analysis — no polling
  │
  v
Frontend displays nutrients, balance, suggestions immediately
```

### Authentication Flow

```
Register/Login → POST /api/v1/auth/login
  │
  v
Route Handler → auth.service.ts login()
  - Verify credentials (bcrypt)
  - Sign JWT access token (15min)
  - Create refresh token (7d, stored in DB)
  - Return { accessToken, refreshToken } (access token also set as httpOnly cookie)
  │
  v
Every subsequent request to a protected route:
  - src/proxy.ts validates the JWT from the cookie
  - On invalid/expired token → redirect to /login
  - Frontend calls /api/v1/auth/refresh when the access token expires
```

---

## Why Not a Separate Backend (NestJS)?

See [ADR-002](./ADR/002-unified-nextjs.md) for the full decision record.

Summary: SmartPlate has ~26 API endpoints. Next.js Route Handlers provide standard REST endpoints callable from any client (web or mobile). A second framework (NestJS) would add a large surface area, a second deployment, and a monorepo — complexity not justified at this scale.

The service layer (`src/services/`) is framework-agnostic. If a standalone API is ever needed, these functions can be extracted into any framework without rewriting business logic.

---

## Infrastructure Decisions

### Why PostgreSQL (Neon)?

1. Already configured in `.env`
2. Relational model fits the data (users, recipes, ingredients, planner items)
3. Prisma has first-class Neon support with connection pooling
4. JSON columns for flexible AI analysis storage
5. Neon provides serverless scaling + point-in-time recovery

### Why No Queue (Redis/BullMQ)?

An earlier version of this document planned a Redis + BullMQ + standalone-workers pipeline for recipe import parsing and AI calls, with the frontend polling job status every 2 seconds. That was never built — see [ADR](./ADR/) history and `docs/ROADMAP.md` M5 ("Import Feature (DB-backed, No Redis)"). Both import extraction and AI calls run synchronously inside the request/response cycle instead:

- **Simpler**: one deployment, no extra infrastructure (Redis), no separate worker process to run/monitor/deploy.
- **Good enough at current scale**: cheerio scraping and gpt-4o-mini JSON completions typically complete in a few seconds.
- **The real risk**: a slow OpenAI response or a slow-to-load import source can hold a serverless function open for the request's whole duration. `ai.service.ts` sets an explicit 25s client-side timeout precisely to fail cleanly (503) well before a typical Vercel function execution limit is hit, rather than letting the platform kill the request with no useful error.

If AI or import latency becomes a real production problem, the recommended next step is a serverless-friendly queue (Vercel Queues, Inngest, QStash) rather than reintroducing Redis — see [docs/IMPROVEMENTS.md](./IMPROVEMENTS.md) for the tracked backlog item.
