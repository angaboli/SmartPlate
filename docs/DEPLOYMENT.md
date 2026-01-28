# SmartPlate — Deployment Guide

> **Version**: 2.0
> **Last updated**: 2026-01-28

---

## Deployment Architecture

```
              ┌────────────────────────┐
              │   CDN / Edge           │
              │   (Vercel Edge)        │
              └───────────┬────────────┘
                          │
              ┌───────────v────────────┐
              │   Next.js App          │
              │   (Vercel)             │
              │                        │
              │   - Pages (SSR/CSR)    │
              │   - API Routes         │
              │   - Middleware          │
              └───────────┬────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
 ┌────────v────────┐ ┌───v──────────┐ ┌──v────────────┐
 │  PostgreSQL     │ │  Redis       │ │  Workers       │
 │  (Neon)         │ │  (Upstash)   │ │  (Railway/     │
 │                 │ │              │ │   Render)       │
 └─────────────────┘ └──────────────┘ └────────────────┘
```

### Single Deployment

The main application (pages + API routes) deploys as a single unit to Vercel. Workers deploy separately as long-running Node.js processes.

---

## Hosting Recommendations

### Next.js App → Vercel (recommended)

| Feature | Details |
|---|---|
| Native Next.js support | Zero-config deployment |
| Preview deployments | Every PR gets a preview URL |
| Edge middleware | Auth + rate limiting at the edge |
| Serverless functions | API routes auto-scale |
| SSL | Automatic |

### Workers → Railway or Render

Workers need long-running processes (not serverless). They run continuously, consuming BullMQ jobs.

```bash
# Railway: deploy workers directory
# Start command per worker:
node --loader tsx workers/import.worker.ts
node --loader tsx workers/ai-analysis.worker.ts
node --loader tsx workers/ai-planner.worker.ts
```

### Database → Neon (already configured)

Serverless PostgreSQL with connection pooling. Point-in-time recovery included.

### Redis → Upstash (recommended)

Serverless Redis, pay-per-request. Global replication available.

---

## Environment Configuration

### Production Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=<random-64-chars>
JWT_REFRESH_SECRET=<random-64-chars>

# Redis
REDIS_URL=redis://...

# AI
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://smartplate.ai

# Optional
SENTRY_DSN=https://...
```

---

## Build & Deploy Commands

```bash
# Build
pnpm build

# Start production server
pnpm start

# Database migrations (run before deploy)
pnpm prisma migrate deploy
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

Vercel auto-deploys from `main` branch. Workers auto-deploy from Railway/Render connected to the same repo.

---

## Database Migrations in Production

1. Run `pnpm prisma migrate deploy` as part of the deploy process
2. Migrations are non-destructive (add columns/tables first)
3. Test migrations on staging before production
4. Neon provides point-in-time recovery as a safety net

---

## Domain & SSL

```
smartplate.ai → Vercel (CNAME)
```

SSL is automatic via Vercel. No manual certificate management.

---

## Monitoring

| Concern | Tool |
|---|---|
| Uptime | UptimeRobot / Better Stack |
| Errors | Sentry |
| Logs | Vercel logs (app) + Railway logs (workers) |
| Database | Neon dashboard |
| API health | `GET /api/v1/health` |

---

## Scaling

| Trigger | Action |
|---|---|
| High API traffic | Vercel auto-scales serverless functions |
| Slow workers | Scale worker instances on Railway |
| DB connection limits | Neon connection pooling (already enabled) |
| Image storage needed | Add S3-compatible storage (Cloudflare R2) |
