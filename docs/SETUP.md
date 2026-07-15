# SmartPlate — Development Setup Guide

> **Version**: 3.0
> **Last updated**: 2026-07-15

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22+ | Runtime |
| pnpm | 9+ | Package manager (mandatory) |
| PostgreSQL | 15+ | Database (Neon cloud — already configured) |
| Git | 2.40+ | Version control |

No Redis or job queue is required. AI calls (OpenAI) and recipe imports (cheerio-based extraction) run synchronously inside the Next.js request/response cycle — see [ARCHITECTURE.md](./ARCHITECTURE.md) and [IMPROVEMENTS.md](./IMPROVEMENTS.md) for the tradeoffs of this choice.

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

### Required from M6+

| Variable | Description | Example |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |

The LLM model (`gpt-4o-mini`) is hardcoded in `src/services/ai.service.ts` — there is no `AI_MODEL` environment variable.

### Optional

| Variable | Description | Default |
|---|---|---|
| `PORT` | Next.js server port | `3000` |
| `SENTRY_DSN` | Error tracking | — |

---

## Getting Started

### 1. Clone & Install

```bash
git clone git@github.com:angaboli/SmartPlate.git
cd SmartPlate
pnpm install
```

### 2. Set Up Database

```bash
# Apply schema to PostgreSQL (Neon)
pnpm prisma migrate dev

# Seed with sample data (users, recipes, RBAC roles)
pnpm db:seed
```

### 3. Start Development

```bash
pnpm dev
```

Open http://localhost:3000

### 4. Verify

- Web: http://localhost:3000
- API health: http://localhost:3000/api/v1/health
- Prisma Studio: `pnpm db:studio`

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
| `test:watch` | `pnpm test:watch` | Run tests in watch mode |
| `test:coverage` | `pnpm test:coverage` | Run tests with coverage report |
| `db:seed` | `pnpm db:seed` | Run seed script |
| `db:migrate` | `pnpm db:migrate` | Create + apply migration (`prisma migrate dev`) |
| `db:studio` | `pnpm db:studio` | Visual database browser |

### Additional Prisma Commands

| Command | Description |
|---|---|
| `pnpm prisma migrate deploy` | Apply migrations (production) |
| `pnpm prisma generate` | Regenerate Prisma client (also runs automatically via `postinstall`) |
| `pnpm prisma migrate reset` | Reset database (caution!) |

There are no worker processes to run — recipe import extraction and AI analysis/planning execute synchronously inside the API route handlers (no Redis, no BullMQ, no `workers/` directory).

---

## Directory Structure

```
SmartPlate/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # AI Coach (protected)
│   │   │   ├── admin/page.tsx        # Admin (protected, admin role)
│   │   │   └── recipes/manage/page.tsx  # Editor/admin recipe review
│   │   ├── recipes/
│   │   │   ├── page.tsx              # Listing (SSR)
│   │   │   └── [id]/page.tsx        # Detail (SSR)
│   │   ├── profile/page.tsx          # Protected
│   │   └── api/v1/                   # REST API Route Handlers
│   │       ├── health/route.ts
│   │       ├── auth/{register,login,refresh,logout}/route.ts
│   │       ├── me/route.ts
│   │       ├── admin/users/route.ts
│   │       ├── admin/users/[id]/role/route.ts
│   │       ├── recipes/route.ts
│   │       ├── recipes/[id]/{route,submit,review,status}.ts
│   │       ├── cook-later/route.ts
│   │       ├── cook-later/[id]/route.ts
│   │       ├── imports/route.ts
│   │       ├── imports/extract/route.ts
│   │       ├── meal-logs/route.ts
│   │       ├── meal-logs/summary/route.ts
│   │       ├── planner/route.ts
│   │       ├── planner/generate/route.ts
│   │       ├── planner/adjust/route.ts
│   │       ├── planner/meals/route.ts
│   │       ├── planner/meals/[itemId]/route.ts
│   │       ├── planner/[id]/groceries/route.ts
│   │       └── cron/cleanup-rate-limits/route.ts
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # Radix/shadcn primitives
│   │   ├── layout/AppShell.tsx
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   ├── RecipeCard.tsx
│   │   ├── ImportRecipeDialog.tsx
│   │   └── ...
│   ├── contexts/                     # React contexts (language, cook later)
│   ├── hooks/                        # TanStack Query hooks (useRecipes, useAuth, ...)
│   ├── lib/                          # db, auth, rbac, errors, rate-limit, validations/
│   ├── services/                     # Business logic (plain TS functions)
│   ├── store/                        # Redux Toolkit (auth, language, cook later)
│   ├── locales/                      # i18n — en.json, fr.json
│   ├── styles/                       # tailwind.css, theme.css, fonts.css
│   └── proxy.ts                      # Next.js 16 middleware (auth, redirects)
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── next.config.ts
├── tsconfig.json
├── package.json
├── .env                              # Git-ignored
├── .env.example
└── .gitignore
```

There is no `workers/` directory and no `middleware.ts` — see the note above about the synchronous architecture and `src/proxy.ts`.

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

### Port conflicts
Set `PORT=3001` in `.env` to change the default port.

### Prisma client out of sync
```bash
pnpm prisma generate
pnpm prisma migrate dev
```
