# SmartPlate — Master Project Plan

> **Version**: 2.2
> **Last updated**: 2026-02-01
> **Status**: In progress — M6 (AI Coach - Meal Analysis) completed

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Current Codebase Summary](#2-current-codebase-summary)
3. [Target Architecture](#3-target-architecture)
4. [Key Decisions](#4-key-decisions)
5. [Data Model](#5-data-model)
6. [API Contract](#6-api-contract)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Agent Responsibilities](#8-agent-responsibilities)
9. [Tooling & Accelerators](#9-tooling--accelerators)
10. [Related Documents](#10-related-documents)

---

## 1. Product Overview

**Product name**: SmartPlate
**Category**: SafariTaste (recipe discovery inside SmartPlate)
**Positioning**: Global FoodTech + AI Nutrition app (EN/FR), premium, forest-inspired natural color palette.

### Core Features

| Feature | Description |
|---|---|
| **AI Food Coach** | Users log meals, AI analyzes balance/nutrients/suggestions, generates weekly plans |
| **Recipes (SafariTaste)** | Recipe browsing, AI-recommended badges, save to collection |
| **Import from Social Link** | Paste Instagram/TikTok/YouTube link, extract recipe, save to Cook Later |
| **Meal Planner** | AI-generated weekly calendar, drag-and-drop editing, grocery list |
| **Internationalization** | Full EN/FR support with persistent language selection |

### Main Navigation (immutable)

```
Home | AI Coach | Recipes | Profile
```

Sticky on scroll, desktop + mobile. Must not be removed or restructured.

---

## 2. Current Codebase Summary

### Repository Structure

```
SmartPlateApp/
src/
  main.tsx                       # Entry: createRoot
  app/
    App.tsx                      # Root component, state-based routing
    components/
      ui/                        # ~51 Radix/shadcn UI primitives
      Header.tsx                 # Sticky header (logo, lang, theme)
      Navigation.tsx             # 4-item nav bar
      LanguageSelector.tsx       # EN/FR switcher
      MealInput.tsx              # Free-text meal entry
      AIAnalysisCard.tsx         # Nutrition analysis display
      SmartSuggestions.tsx       # AI swap/add/reduce cards
      WeeklyPlanner.tsx          # Drag-and-drop calendar
      WeeklyProgressChart.tsx    # Recharts chart
      GroceryListDialog.tsx      # Grocery list modal
      RecipeCard.tsx             # Recipe display card
      ImportRecipeDialog.tsx     # Social link import (mock)
      CookLaterList.tsx          # Saved recipes list
      NutritionChart.tsx
      EmptyState.tsx
      LoadingState.tsx
    pages/
      HomePage.tsx               # Landing/hero
      DashboardPage.tsx          # AI Coach (analysis + planner)
      RecipesPage.tsx            # Recipe discovery + filters
      ProfilePage.tsx            # Profile/Goals/Preferences/CookLater
  contexts/
    LanguageContext.tsx           # Custom i18n (en/fr, ~80 keys)
    CookLaterContext.tsx          # In-memory saved recipes
  styles/
    index.css, tailwind.css, theme.css, fonts.css
```

### Identified Gaps & Risks

| Issue | Impact |
|---|---|
| No `tsconfig.json` in project root | No project-level type checking |
| React is `peerDependency` | Unusual for an app; needs to be `dependency` |
| No routing library | No URL paths, no deep linking, no browser back/forward |
| All mock data | Every component uses hardcoded data arrays |
| No auth | No login, sessions, or protected routes |
| No API layer | Zero backend code; DATABASE_URL unused |
| No tests | No test runner or test files |
| No error boundaries | No global error handling |
| MUI installed but unused | Dead weight (~2MB); @mui/material, @emotion/* |
| Language resets on refresh | No localStorage persistence |
| CookLater is ephemeral | useState only — data lost on refresh |
| Package name | `@figma/my-make-file` — needs renaming |

---

## 3. Target Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

### Unified Next.js Architecture

```
                     CLIENTS
  ┌────────────┐  ┌────────────┐
  │ Web        │  │ Mobile(RN) │
  │ (SSR+CSR)  │  │ (future)   │
  └─────┬──────┘  └─────┬──────┘
        │                │
        └───────┬────────┘
                │ HTTPS / REST JSON
                v
  ┌───────────────────────────────────┐
  │       Next.js Application         │
  │                                   │
  │  ┌───────────┐  ┌──────────────┐ │
  │  │ App Router │  │ API Routes   │ │
  │  │ (SSR/CSR) │  │ /api/v1/*    │ │
  │  └───────────┘  └──────────────┘ │
  │                                   │
  │  ┌───────────────────────────┐   │
  │  │ Service Layer             │   │
  │  │ (plain TS functions)      │   │
  │  └─────────┬─────────────────┘   │
  └────────────┼─────────────────────┘
               │
      ┌────────┴──────┐    ┌────────────────┐
      │  PostgreSQL   │    │  Redis + BullMQ │
      │  (Neon)       │    │  (workers run   │
      │  via Prisma   │    │   separately)   │
      └───────────────┘    └────────────────┘
```

### Project Structure (Target)

```
SmartPlateApp/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (providers, header, nav, footer)
│   ├── page.tsx                      # Home (SSR)
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── dashboard/page.tsx            # AI Coach (protected)
│   ├── recipes/
│   │   ├── page.tsx                  # Listing (SSR for SEO)
│   │   └── [id]/page.tsx            # Detail (SSR for SEO)
│   ├── profile/page.tsx             # Protected
│   └── api/v1/                      # REST API (Route Handlers)
│       ├── health/route.ts
│       ├── auth/...
│       ├── recipes/...
│       ├── saved-recipes/...
│       ├── imports/...
│       ├── meal-logs/...
│       └── planner/...
├── src/
│   ├── components/                   # All existing components
│   ├── contexts/                     # React contexts
│   ├── hooks/                        # Data fetching hooks
│   ├── lib/                          # Utilities (db, auth, ai, validation)
│   ├── services/                     # Business logic (plain functions)
│   ├── locales/                      # i18n JSON files
│   └── styles/                       # CSS files
├── workers/                          # Standalone BullMQ workers
├── prisma/                           # Schema + migrations
├── middleware.ts                      # Auth, rate limiting
├── next.config.ts
├── package.json                      # Single package
└── .env
```

---

## 4. Key Decisions

See [ADR/](./ADR/) folder for Architecture Decision Records.

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js (unified frontend + API) | SSR for SEO, API Routes for mobile, single deployment |
| Separate backend? | No (Next.js only) | ~20 endpoints don't justify a second framework; API Routes are standard REST |
| API style | REST via Route Handlers | Portable for mobile clients; standard HTTP |
| ORM | Prisma | Type-safe, great migrations, PostgreSQL-native |
| Validation | Zod | Runtime validation for API + forms |
| Auth | JWT + refresh tokens via middleware | Mobile-friendly, stateless |
| Job queue | Redis + BullMQ (separate workers) | Async import parsing and AI calls |
| i18n | Custom LanguageContext + JSON files | Already integrated; simple for 2 languages |
| Data fetching | TanStack Query | Caching, mutations, loading/error states |
| Testing | Vitest + Testing Library | Fast, compatible with Next.js |

---

## 5. Data Model

See [DATA_MODEL.md](./DATA_MODEL.md) for the full Prisma schema.

### Entity Overview

```
User ──┬── UserSettings (1:1)
       ├── RefreshToken (1:N)
       ├── Recipe (1:N, authored)
       ├── SavedRecipe (N:M via join)
       ├── Import (1:N)
       ├── MealLog (1:N)
       └── PlannerWeek (1:N)
                └── PlannerItem (1:N)
```

---

## 6. API Contract

See [API_CONTRACT.md](./API_CONTRACT.md) for full endpoint specifications.

### Endpoint Groups

| Group | Base Path | Auth Required |
|---|---|---|
| Auth | `/api/v1/auth/*` | No (except logout) |
| Admin | `/api/v1/admin/*` | Yes (admin only) |
| Recipes | `/api/v1/recipes/*` | Yes (write), No (read published) |
| Cook Later | `/api/v1/cook-later/*` | Yes |
| Imports | `/api/v1/imports/*` | Yes |
| Meal Logs | `/api/v1/meal-logs/*` | Yes |
| Planner | `/api/v1/planner/*` | Yes |
| Health | `/api/v1/health` | No |

---

## 7. Implementation Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed milestones and tasks.

| Milestone | Goal | Status |
|---|---|---|
| **M0** | Repo cleanup, tooling, Next.js migration | Done |
| **M1** | Prisma + DB connection + health endpoint | Done |
| **M2** | Auth (JWT) + login/register UI | Done |
| **M3** | Recipes read-only from DB | Done |
| **M4** | Cook Later (saved recipes) | Done |
| **M4.5** | RBAC + Recipe publication workflow | Done |
| **M5** | Import from social link (DB-backed, no Redis) | Done |
| **M6** | AI Coach (LLM meal analysis + suggestions) | Done |
| **M7** | Planner + grocery list | |
| **M8** | i18n EN/FR complete | |
| **M9** | Security, rate limits, monitoring, tests | |

---

## 8. Agent Responsibilities

Conceptual roles to ensure complete coverage across milestones:

| Agent | Scope |
|---|---|
| **Architect** | System boundaries, tradeoffs, migration path |
| **Frontend** | Routing, API hooks, state, i18n, sticky nav, SSR |
| **Backend** | Route Handlers, services, Prisma, auth, middleware |
| **Data/AI** | LLM prompts, recipe parsing, validation, safety |
| **QA/Security** | Tests, rate limits, input validation, threat model |

---

## 9. Tooling & Accelerators

### Adopted

| Tool | Purpose |
|---|---|
| Prisma | ORM + migrations |
| Zod | Runtime validation |
| TanStack Query | Frontend data fetching |
| BullMQ + Redis | Async job processing (separate workers) |
| Vitest | Testing |
| Conventional Commits | Commit discipline |

### Deferred

| Tool | Reason |
|---|---|
| NestJS | Overkill for ~20 endpoints; Next.js API Routes sufficient |
| Monorepo (pnpm workspaces) | Single app, no need to split packages |
| Turborepo | Single package, no workspace orchestration needed |
| tRPC | REST preferred for mobile portability |
| Docker | Not needed for local dev yet |

---

## 10. Related Documents

| Document | Path |
|---|---|
| Architecture | [docs/ARCHITECTURE.md](./ARCHITECTURE.md) |
| Data Model | [docs/DATA_MODEL.md](./DATA_MODEL.md) |
| API Contract | [docs/API_CONTRACT.md](./API_CONTRACT.md) |
| Roadmap | [docs/ROADMAP.md](./ROADMAP.md) |
| Setup Guide | [docs/SETUP.md](./SETUP.md) |
| Security | [docs/SECURITY.md](./SECURITY.md) |
| Internationalization | [docs/I18N.md](./I18N.md) |
| Testing Strategy | [docs/TESTING.md](./TESTING.md) |
| Coding Standards | [docs/CODING_STANDARDS.md](./CODING_STANDARDS.md) |
| Deployment | [docs/DEPLOYMENT.md](./DEPLOYMENT.md) |
| ADR: Next.js over Vite | [docs/ADR/001-nextjs-over-vite.md](./ADR/001-nextjs-over-vite.md) |
| ADR: Unified Next.js | [docs/ADR/002-unified-nextjs.md](./ADR/002-unified-nextjs.md) |
| ADR: REST API | [docs/ADR/003-rest-over-trpc.md](./ADR/003-rest-over-trpc.md) |
| ADR: Prisma ORM | [docs/ADR/004-prisma-orm.md](./ADR/004-prisma-orm.md) |
