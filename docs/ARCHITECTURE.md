# SmartPlate — Architecture

> **Version**: 2.0
> **Last updated**: 2026-01-28

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
│  │   /recipes (SSR)        │    │   auth/   → register, login  │    │
│  │   /recipes/:id (SSR)    │    │   users/  → profile, settings│    │
│  │   /dashboard (CSR)      │    │   recipes/→ CRUD + filters   │    │
│  │   /profile (CSR)        │    │   imports/→ async job create │    │
│  │   /login (CSR)          │    │   meal-logs/ → log + analyze │    │
│  │   /register (CSR)       │    │   planner/→ weeks + items    │    │
│  └─────────────────────────┘    │   saved-recipes/ → CRUD     │    │
│                                  └──────────────┬───────────────┘    │
│                                                 │                    │
│  ┌──────────────────────────────────────────────┴───────────────┐   │
│  │                    Service Layer                              │   │
│  │                    (plain TypeScript functions)               │   │
│  │                                                              │   │
│  │  auth.service.ts   recipes.service.ts   imports.service.ts   │   │
│  │  users.service.ts  meal-logs.service.ts planner.service.ts   │   │
│  │  ai.service.ts                                               │   │
│  └──────────┬──────────────────────────────────┬────────────────┘   │
│             │                                  │                     │
│  ┌──────────v──────────┐            ┌──────────v──────────┐        │
│  │  Prisma Client      │            │  BullMQ Queues      │        │
│  │  (DB access)        │            │  (enqueue jobs)     │        │
│  └──────────┬──────────┘            └──────────┬──────────┘        │
└─────────────┼──────────────────────────────────┼────────────────────┘
              │                                  │
     ┌────────v──────┐                  ┌────────v──────────┐
     │  PostgreSQL   │                  │  Redis            │
     │  (Neon)       │                  │                   │
     │               │                  │  ┌──────────────┐ │
     │  11 tables    │                  │  │ Workers      │ │
     │  (see DATA    │                  │  │ (standalone) │ │
     │   MODEL)      │                  │  │              │ │
     └───────────────┘                  │  │ import.ts    │ │
                                        │  │ ai-analyze.ts│ │
                                        │  │ ai-plan.ts   │ │
                                        │  └──────────────┘ │
                                        └───────────────────┘
```

---

## Layer Descriptions

### 1. Pages (App Router)

Next.js App Router with file-based routing. Pages are either server-rendered (SSR) for SEO or client-rendered (CSR) for authenticated content.

| Route | Rendering | Auth | SEO |
|---|---|---|---|
| `/` | SSR | Public | Yes — landing page |
| `/recipes` | SSR | Public | Yes — recipe listing |
| `/recipes/[id]` | SSR | Public | Yes — recipe detail with JSON-LD |
| `/login` | CSR | Public | No |
| `/register` | CSR | Public | No |
| `/dashboard` | CSR | Protected | No — authenticated content |
| `/profile` | CSR | Protected | No — authenticated content |

### 2. API Route Handlers (`/api/v1/*`)

Standard REST endpoints implemented as Next.js Route Handlers. Each handler exports HTTP method functions (`GET`, `POST`, `PATCH`, `DELETE`).

These are regular HTTP endpoints — callable from any client (web, mobile, curl, Postman).

```typescript
// app/api/v1/recipes/route.ts
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
export async function listRecipes(filters: RecipeFilters): Promise<PaginatedResult<Recipe>> {
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

### 4. Middleware (`middleware.ts`)

Next.js middleware runs at the edge before every request. Handles:
- JWT token validation for protected routes
- Redirect unauthenticated users to `/login`
- Rate limiting headers
- CORS for API routes

### 5. Workers (`workers/`)

Standalone Node.js processes that consume BullMQ jobs. Not part of the Next.js server — they run separately.

```
workers/
├── import.worker.ts        # Recipe import from social links
├── ai-analysis.worker.ts   # Meal analysis via LLM
└── ai-planner.worker.ts    # Weekly plan generation via LLM
```

Workers share the same `src/services/` and `src/lib/` code as the main app.

---

## Data Flow Examples

### Recipe Import Flow

```
User pastes URL in ImportRecipeDialog
  │
  v
POST /api/v1/imports { url }
  │
  v
Route Handler → importsService.create()
  - Validates URL
  - Detects provider (Instagram/TikTok/YouTube/Other)
  - Creates Import record (status: pending)
  - Enqueues "import:parse" job to BullMQ
  - Returns 202 { id, status: "pending" }
  │
  v
Frontend polls GET /api/v1/imports/:id every 2 seconds
  │
  v
import.worker.ts picks up job:
  - Fetches URL content (timeout 10s)
  - Extracts: title, author, image (Open Graph / JSON-LD)
  - Attempts recipe parsing
  - Updates Import record (status: completed | partial | failed)
  │
  v
Frontend receives completed status:
  - Shows extracted data in editable form
  - User edits/confirms
  - POST /api/v1/imports/:id/save
  │
  v
Route Handler → importsService.save()
  - Creates Recipe record
  - Creates SavedRecipe record
  - Returns 201
```

### AI Meal Analysis Flow

```
User types meal description → submits
  │
  v
POST /api/v1/meal-logs { description, mealType }
  │
  v
Route Handler → mealLogsService.create()
  - Creates MealLog record
  - Enqueues "ai:analyze" job
  - Returns 202 { id, status: "analyzing" }
  │
  v
ai-analysis.worker.ts picks up job:
  - Loads user settings (goals, preferences, allergies)
  - Constructs prompt with meal + user context
  - Calls LLM API
  - Parses structured response (Zod validation)
  - Updates MealLog with analysis
  │
  v
Frontend polls GET /api/v1/meal-logs/:id
  - Displays nutrients, balance, suggestions
```

### Authentication Flow

```
Register/Login → POST /api/v1/auth/login
  │
  v
Route Handler → authService.login()
  - Verify credentials (bcrypt)
  - Sign JWT access token (15min)
  - Create refresh token (7d, stored in DB)
  - Return { accessToken, refreshToken }
  │
  v
Frontend stores tokens (httpOnly cookie or secure storage)
  │
  v
Every API request:
  - middleware.ts validates JWT from cookie/header
  - On 401 → frontend auto-refreshes via /api/v1/auth/refresh
  - On refresh failure → redirect to /login
```

---

## Why Not a Separate Backend (NestJS)?

See [ADR-002](./ADR/002-unified-nextjs.md) for the full decision record.

Summary: SmartPlate has ~20 API endpoints. Next.js Route Handlers provide standard REST endpoints callable from any client (web or mobile). A second framework (NestJS) would add ~60 extra files, a second deployment, and a monorepo — complexity not justified at this scale.

The service layer (`src/services/`) is framework-agnostic. If a standalone API is ever needed, these functions can be extracted into any framework without rewriting business logic.

---

## Infrastructure Decisions

### Why PostgreSQL (Neon)?

1. Already configured in `.env`
2. Relational model fits the data (users, recipes, ingredients, planner items)
3. Prisma has first-class Neon support with connection pooling
4. JSON columns for flexible AI analysis storage
5. Neon provides serverless scaling + point-in-time recovery

### Why Redis + BullMQ for Workers?

Background jobs (recipe import, AI analysis, plan generation) are long-running (5-30 seconds). They cannot block the API response. BullMQ provides:
- Reliable job processing with retries
- Dead letter queue for failed jobs
- Concurrency control
- Job status tracking (polled by frontend)

Workers run as standalone Node.js processes, sharing code from `src/`.

### Why Not Serverless Functions for Workers?

- Import processing may take 10-30 seconds (exceeds typical serverless timeout)
- AI calls may stream responses
- BullMQ requires a persistent connection to Redis
- Worker processes are simpler to debug locally
