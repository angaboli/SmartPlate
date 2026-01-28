# SmartPlate — Development Setup Guide

> **Version**: 2.0
> **Last updated**: 2026-01-28

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS+ | Runtime |
| pnpm | 9+ | Package manager (mandatory) |
| PostgreSQL | 15+ | Database (Neon cloud — already configured) |
| Redis | 7+ | Job queue (from M5 onward) |
| Git | 2.40+ | Version control |

### Install pnpm (if not installed)

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

## Environment Variables

Copy `.env.example` to `.env` at the project root:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example | From |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` | M1 |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `random-64-character-string` | M2 |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) | `another-random-64-char-string` | M2 |

### Required from M5+

| Variable | Description | Example |
|---|---|---|
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |

### Required from M6+

| Variable | Description | Example |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `AI_MODEL` | LLM model name | `gpt-4o` |

### Optional

| Variable | Description | Default |
|---|---|---|
| `PORT` | Next.js server port | `3000` |
| `SENTRY_DSN` | Error tracking | — |

---

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd SmartPlateApp
pnpm install
```

### 2. Set Up Database

```bash
# Apply schema to PostgreSQL (Neon)
pnpm prisma migrate dev

# Seed with sample data (after M3)
pnpm prisma db seed
```

### 3. Start Development

```bash
pnpm dev
```

Open http://localhost:3000

### 4. Verify

- Web: http://localhost:3000
- API health: http://localhost:3000/api/v1/health (after M1)
- Prisma Studio: `pnpm prisma studio`

---

## Project Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `pnpm dev` | Start Next.js dev server |
| `build` | `pnpm build` | Production build |
| `start` | `pnpm start` | Start production server |
| `lint` | `pnpm lint` | Run ESLint |
| `typecheck` | `pnpm typecheck` | TypeScript type checking |
| `test` | `pnpm test` | Run all tests |

### Prisma Commands

| Command | Description |
|---|---|
| `pnpm prisma migrate dev --name <name>` | Create + apply migration |
| `pnpm prisma migrate deploy` | Apply migrations (production) |
| `pnpm prisma generate` | Regenerate Prisma client |
| `pnpm prisma studio` | Visual database browser |
| `pnpm prisma db seed` | Run seed script |
| `pnpm prisma migrate reset` | Reset database (caution!) |

### Worker Commands (M5+)

```bash
# Run import worker
pnpm worker:import

# Run AI analysis worker
pnpm worker:ai-analysis

# Run AI planner worker
pnpm worker:ai-planner
```

---

## Directory Structure

```
SmartPlateApp/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── dashboard/page.tsx
│   ├── recipes/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── profile/page.tsx
│   └── api/v1/                       # REST API Route Handlers
│       ├── health/route.ts
│       ├── auth/
│       │   ├── register/route.ts
│       │   ├── login/route.ts
│       │   ├── refresh/route.ts
│       │   └── logout/route.ts
│       ├── users/me/
│       │   ├── route.ts
│       │   └── settings/route.ts
│       ├── recipes/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── saved-recipes/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── imports/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── save/route.ts
│       ├── meal-logs/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       └── planner/
│           └── weeks/
│               ├── route.ts
│               ├── generate/route.ts
│               └── [weekId]/
│                   ├── items/[itemId]/route.ts
│                   └── grocery-list/route.ts
│
├── src/
│   ├── components/                   # React components
│   │   ├── ui/                       # Radix/shadcn primitives
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   ├── RecipeCard.tsx
│   │   ├── ImportRecipeDialog.tsx
│   │   └── ...
│   ├── contexts/                     # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── LanguageContext.tsx
│   │   └── CookLaterContext.tsx
│   ├── hooks/                        # Custom hooks
│   │   ├── useRecipes.ts
│   │   ├── useSavedRecipes.ts
│   │   └── ...
│   ├── lib/                          # Utilities
│   │   ├── db.ts                     # Prisma singleton
│   │   ├── auth.ts                   # JWT helpers
│   │   ├── queue.ts                  # BullMQ connection
│   │   ├── ai.ts                     # LLM client
│   │   └── validations/              # Zod schemas
│   ├── services/                     # Business logic
│   │   ├── auth.service.ts
│   │   ├── users.service.ts
│   │   ├── recipes.service.ts
│   │   ├── imports.service.ts
│   │   ├── meal-logs.service.ts
│   │   └── planner.service.ts
│   ├── locales/                      # i18n
│   │   ├── en.json
│   │   └── fr.json
│   └── styles/
│       ├── tailwind.css
│       ├── theme.css
│       └── fonts.css
│
├── workers/                          # BullMQ workers
│   ├── import.worker.ts
│   ├── ai-analysis.worker.ts
│   └── ai-planner.worker.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── middleware.ts                      # Next.js middleware
├── next.config.ts
├── tsconfig.json
├── package.json
├── .env                              # Git-ignored
├── .env.example
└── .gitignore
```

---

## Troubleshooting

### "Cannot find module" errors after Prisma changes
```bash
pnpm prisma generate
```

### Database connection issues
1. Verify `DATABASE_URL` in `.env`
2. Check Neon dashboard for connection limits
3. Test: `pnpm prisma db pull`

### Redis connection issues (M5+)
1. Verify Redis is running: `redis-cli ping`
2. Check `REDIS_URL` in `.env`
3. Windows: use WSL2 or Docker for Redis

### Port conflicts
Set `PORT=3001` in `.env` to change the default port.

### Prisma client out of sync
```bash
pnpm prisma generate
pnpm prisma migrate dev
```
