# SmartPlate — Deployment Guide

> **Version**: 3.0
> **Last updated**: 2026-07-15

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
              │   - proxy.ts (auth)    │
              └───────────┬────────────┘
                          │
                 ┌────────v────────┐
                 │  PostgreSQL     │
                 │  (Neon)         │
                 └─────────────────┘
```

### Single Deployment

The entire application (pages + API routes) deploys as a **single unit** to Vercel. There are no separate worker processes to deploy — recipe import extraction and AI (OpenAI) calls run synchronously inside the API route handlers. See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for the timeout tradeoffs of this choice on serverless functions.

---

## Hosting Recommendations

### Next.js App → Vercel (recommended)

| Feature | Details |
|---|---|
| Native Next.js support | Zero-config deployment |
| Preview deployments | Every PR gets a preview URL |
| Edge middleware (`proxy.ts`) | Auth redirects at the edge |
| Serverless functions | API routes auto-scale |
| Cron | `vercel.json` schedules daily rate-limit cleanup |
| SSL | Automatic |

### Database → Neon (already configured)

Serverless PostgreSQL with connection pooling. Point-in-time recovery included.

---

## Environment Configuration

### Production Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=<random-64-chars>
JWT_REFRESH_SECRET=<random-64-chars>

# AI (model is hardcoded to gpt-4o-mini in src/services/ai.service.ts)
OPENAI_API_KEY=sk-...

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://smartplate.ai

# Optional (not yet wired in code — see IMPROVEMENTS.md)
SENTRY_DSN=https://...

# Stripe (subscriptions) — secret keys are server-only, never NEXT_PUBLIC_
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`STRIPE_WEBHOOK_SECRET` in production is the signing secret shown when
creating the webhook endpoint in the Stripe Dashboard (pointed at
`https://<domain>/api/v1/webhooks/stripe`), not the `stripe listen`
value used for local development.

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

The actual pipeline lives in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): checkout → pnpm install (frozen lockfile) → lint → typecheck → test → build (Node 22). It does not yet run `pnpm audit` — see [IMPROVEMENTS.md](./IMPROVEMENTS.md).

Vercel auto-deploys from the `main` branch on every push (and generates a preview deployment for every pull request).

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

| Concern | Tool | Status |
|---|---|---|
| Uptime | UptimeRobot / Better Stack | Not configured |
| Errors | Sentry | Not wired in code yet — recommended, see [IMPROVEMENTS.md](./IMPROVEMENTS.md) |
| Logs | Vercel logs (pino, structured JSON) | Active |
| Database | Neon dashboard | Active |
| API health | `GET /api/v1/health` | Active |

---

## Scaling

| Trigger | Action |
|---|---|
| High API traffic | Vercel auto-scales serverless functions |
| Slow AI (OpenAI) responses | Risk of serverless function timeout since calls are synchronous — see [IMPROVEMENTS.md](./IMPROVEMENTS.md) |
| DB connection limits | Neon connection pooling (already enabled) |
| Recipe catalog growth | `GET /api/v1/recipes` has no pagination yet — add before the catalog grows significantly |
| Image storage needed | Add S3-compatible storage (Cloudflare R2) |
