# ADR-002: Unified Next.js (No Separate Backend)

> **Status**: Accepted
> **Date**: 2026-01-28
> **Deciders**: Architecture team
> **Supersedes**: ADR-002 (monorepo with pnpm) — no longer applicable

---

## Context

SmartPlate needs an API layer that serves both the web frontend and future mobile clients. The initial plan proposed NestJS as a separate backend in a pnpm monorepo. This ADR reconsiders that decision.

## Decision

Use Next.js for both frontend and API. No separate backend framework. No monorepo.

- **Pages**: Next.js App Router (SSR for public, CSR for protected)
- **API**: Next.js Route Handlers at `/api/v1/*` (standard REST)
- **Business logic**: Plain TypeScript functions in `src/services/`
- **Workers**: Standalone BullMQ processes in `workers/` (share `src/` code)

## Rationale

### The API is small

SmartPlate has ~20 API endpoints across 7 resource groups. This is not complex enough to justify NestJS's module system, dependency injection, guards, and interceptors.

### Route Handlers ARE REST endpoints

Next.js Route Handlers respond to standard HTTP requests with JSON. A mobile app calling `GET /api/v1/recipes` cannot distinguish whether the server is NestJS, Express, or Next.js. It's just HTTP.

```typescript
// app/api/v1/recipes/route.ts
export async function GET(request: NextRequest) {
  const recipes = await listRecipes(filters);
  return NextResponse.json({ data: recipes });
}
```

### Complexity reduction

| Metric | NestJS + Next.js | Next.js Only |
|---|---|---|
| Frameworks | 2 | 1 |
| Deployments | 2 | 1 |
| Package.json files | 4 (root + web + api + shared) | 1 |
| Files for 20 endpoints | ~80 (modules, controllers, services, DTOs) | ~25 (routes + services) |
| Config files | ~12 (tsconfigs, nest-cli, etc.) | ~4 |
| Learning curve | NestJS patterns + Next.js | Next.js only |

### Service layer is portable

Business logic lives in `src/services/` as plain functions. If a standalone API is ever needed (at 100+ endpoints, or for microservices), these functions can be moved to any framework without rewriting:

```typescript
// src/services/recipes.service.ts — works in Next.js, NestJS, Express, or anywhere
export async function listRecipes(filters: RecipeFilters) {
  return prisma.recipe.findMany({ ... });
}
```

### Background jobs don't need a framework

BullMQ workers are standalone Node.js processes. They import from `src/services/` and `src/lib/`, but don't need a web framework:

```typescript
// workers/import.worker.ts
import { Worker } from 'bullmq';
import { processImport } from '../src/services/imports.service';

new Worker('import', async (job) => {
  await processImport(job.data.importId);
});
```

## Consequences

### Positive
- Faster development (one codebase, one server)
- Simpler deployment (one Vercel project)
- Lower hosting cost
- Less code to maintain
- No monorepo complexity

### Negative
- No NestJS dependency injection (not needed at ~20 endpoints)
- No auto-generated Swagger from decorators (can use `next-swagger-doc` if needed)
- Route Handlers have less middleware control than NestJS (mitigated by Next.js middleware)

### When to Reconsider
- If the API grows beyond 50+ endpoints
- If a team of 5+ backend engineers needs strict architectural patterns
- If microservice decomposition is required
- If the mobile app needs API features that Next.js can't support (unlikely)

## Alternatives Rejected

### NestJS as separate backend
- Adds ~60 files, a second deployment, and monorepo complexity
- Not justified for ~20 endpoints
- Original ADR-002 (pnpm monorepo) is superseded

### tRPC
- Tight coupling between frontend and API transport
- Mobile clients can't use tRPC
- REST is more portable
