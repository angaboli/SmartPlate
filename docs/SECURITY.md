# SmartPlate — Security Baseline

> **Version**: 2.0
> **Last updated**: 2026-07-16

---

## Threat Model Overview

| Threat | Risk Level | Mitigation |
|---|---|---|
| Credential stuffing | High | Rate limiting on auth endpoints (DB-backed, see below) |
| SQL injection | High | Prisma ORM (parameterized queries) |
| XSS (stored) | High | React auto-escapes all rendered text (no `dangerouslySetInnerHTML` on user content) + length limits via Zod; no active HTML-sanitization library is installed — see [Input Validation](#input-validation) |
| JWT token theft | Medium | 24h access token, httpOnly cookie, revocable 7-day refresh token stored in DB |
| Social link abuse | Medium | Rate limiting on imports (10/hour/user), Zod URL validation |
| LLM prompt injection | Medium | Input placed in a delimited data section, output validated against Zod schemas |
| CSRF | Low | SameSite cookies, token-based auth |
| Denial of service | Medium | Per-endpoint DB-backed rate limiting; no global/IP-wide limiter |

---

## Authentication Security

### Password Policy
- Minimum 8 characters, maximum 72 (bcrypt's own limit) — enforced by `registerSchema` in `src/lib/validations/auth.ts`
- Hashed with bcrypt
- Never stored in plaintext, never returned in API responses
- **Note**: there is currently no uppercase/number/symbol complexity requirement enforced — only length.

### JWT Configuration
- **Access token**: 24 hours expiry, signed with `JWT_SECRET` (see `src/lib/auth.ts`)
- **Refresh token**: 7 days expiry, signed with `JWT_REFRESH_SECRET`
- Refresh tokens stored in database (revocable)
- Logout invalidates the refresh token
- JWT payload includes the user's `role`, used for RBAC checks (`src/lib/rbac.ts`)

### Session Security
- Access token sent as an httpOnly cookie, validated by `src/proxy.ts` (Next.js 16 middleware convention) on protected routes
- `src/proxy.ts` redirects unauthenticated users away from `/dashboard/*` and `/profile/*`, and authenticated users away from `/login`/`/register`

---

## Input Validation

### API Layer
- All endpoints validated with Zod schemas (`src/lib/validations/`)
- Validation runs before any business logic
- Failed validation returns 400 with field-level errors (via `ValidationError` / `handleApiError`, see `src/lib/errors.ts`)
- No raw SQL queries (Prisma handles parameterization)

### Import URL Validation (`src/services/import-extractor.ts`, `src/lib/validations/import.ts`)
- Must pass Zod's `.url()` check (syntactically valid URL) — this does **not** restrict to `http(s)://` specifically; `fetch()` itself will simply fail on unsupported schemes (`javascript:`, `data:`) rather than an explicit allowlist
- Maximum URL length: 2048 characters
- Fetch timeout: 15 seconds (`AbortSignal.timeout(15_000)`)
- Provider detection via URL pattern matching (Instagram/TikTok/YouTube/Other)
- **Gap**: no maximum response body size cap and no explicit redirect-hop limit are currently enforced — tracked in [IMPROVEMENTS.md](./IMPROVEMENTS.md)

### User-Generated Content Length Limits (Zod, not HTML sanitization)
- Recipe title: max 200 characters
- Recipe description: max 2000 characters
- Ingredient text: max 500 characters (max 100 per recipe)
- Step text: max 2000 characters (max 50 per recipe)
- Meal log description (`mealText`): max 2000 characters
- These are length limits only — there is no DOMPurify/sanitize-html step. Safety currently relies on React escaping all of this content as plain text when rendered (verified: the only `dangerouslySetInnerHTML` usage in the codebase is `src/components/ui/chart.tsx`, which injects CSS custom properties, not user content).

---

## Rate Limiting

All rate limiting is DB-backed (`src/lib/rate-limit.ts` + the `rate_limit_attempts` table, or a dedicated counter query against the relevant table), not a dedicated library or Redis. There is no global/IP-wide rate limiter — each limit below is per-endpoint.

| Endpoint | Limit | Window | Scope |
|---|---|---|---|
| `POST /auth/login` | 10 attempts | 15 minutes | Per IP |
| `POST /auth/register` | 5 attempts | 1 hour | Per IP |
| `POST /auth/refresh` | 30 attempts | 1 hour | Per IP |
| `POST /imports/extract`, `POST /imports` | 10 requests | 1 hour | Per user |
| `POST /meal-logs` (AI analysis) | 20 requests | 1 day | Per user |
| `POST /planner/generate` | 5 requests | 1 day | Per user |
| Health check | Unlimited | — | — |

A daily cron (`GET /api/v1/cron/cleanup-rate-limits`, configured in `vercel.json`) purges old rate-limit records.

---

## HTTP Security Headers

Applied via `next.config.ts`'s `headers()` function (no `helmet` dependency — this is a Next.js project, not Express):

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-DNS-Prefetch-Control: on
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https://images.unsplash.com data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

---

## CORS Policy

**No CORS configuration currently exists** in `next.config.ts` or the route handlers. This is acceptable today because the only client is the same-origin Next.js web app itself (no separate frontend domain, no mobile app calling the API directly yet). If a mobile app or a separately-hosted frontend is added, a real CORS policy will need to be implemented at that point — see [IMPROVEMENTS.md](./IMPROVEMENTS.md).

---

## AI/LLM Security

### Prompt Injection Prevention
- User input is always placed in a clearly delimited data section of the prompt
- System prompts are not exposed to users
- LLM output is validated against Zod schemas before use (`src/services/ai.service.ts`)
- No user-facing raw LLM output — always structured/parsed JSON
- 25-second client-side timeout on all OpenAI calls, converted to a clean `503` on timeout instead of an opaque platform-level failure (see `docs/ARCHITECTURE.md` § Why No Queue)

### Output Safety
- AI-generated meal plans and nutrition analysis are recommendations, not medical advice
- Calorie/nutrient values are estimates

---

## Data Protection

### Sensitive Data
- Passwords: bcrypt hashed, never logged
- JWT secrets, database credentials, `OPENAI_API_KEY`: environment variables only, never in code

### Environment Variables
- `.env` is git-ignored
- `.env.example` documents variable names without real values
- Production secrets managed via the deployment platform (Vercel), not committed

### Logging
- Structured JSON logs (pino, `src/lib/logger.ts`)
- Errors are logged with `logger.error({ err: error }, ...)` — request bodies are not logged by default

---

## Dependency Security

### Audit
```bash
pnpm audit --prod --audit-level=high   # What CI runs — production deps only
pnpm audit                              # Full tree, including dev tooling
```

### Policy
- `pnpm audit --prod --audit-level=high` runs in CI (`.github/workflows/ci.yml`) and fails the build on any high/critical finding in **production** dependencies — dev-tooling-only findings (e.g. inside `vite`/`vitest`) do not block the pipeline
- Moderate/low findings in production deps are reviewed case-by-case, not auto-blocking
- See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for the CVE remediation history (next, jspdf, undici, lodash)

---

## Checklist by Milestone

### M2 (Auth) — Done
- [x] Password hashing with bcrypt
- [x] JWT access + refresh token flow
- [x] Rate limiting on auth endpoints
- [x] Input validation on registration

### M5 (Imports) — Done
- [x] URL validation (Zod) and length limits
- [x] Rate limiting on import endpoints
- [x] Fetch timeout (15s)
- [ ] Response body size cap and redirect-hop limit — not implemented, see [IMPROVEMENTS.md](./IMPROVEMENTS.md)

### M6 (AI) — Done
- [x] Prompt injection prevention (delimited input, no system prompt leakage)
- [x] LLM output validation (Zod)
- [x] Explicit timeout + clean error on AI call failure

### M9 (Hardening) — In progress
- [x] Security headers active (`next.config.ts`)
- [x] Dependency audit gate in CI
- [ ] CORS policy (not needed yet — single-origin client; revisit if a mobile/separate client is added)
- [ ] Password complexity requirements beyond length
- [ ] Import response size/redirect caps
- [x] Error tracking (Sentry) — `@sentry/nextjs`, see `src/instrumentation.ts` / `src/instrumentation-client.ts`
