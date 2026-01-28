# ADR-003: REST API over tRPC

> **Status**: Accepted
> **Date**: 2026-01-28
> **Deciders**: Architecture team

---

## Context

The application needs an API layer that serves both the web frontend and future mobile clients (React Native). We need to choose between REST, tRPC, and GraphQL.

## Decision

Use REST with OpenAPI specification, implemented in NestJS with `@nestjs/swagger`.

## Rationale

### Why REST

1. **Mobile portability** — REST is the universal API standard. Any mobile framework (React Native, Flutter, Swift, Kotlin) can consume REST endpoints without special tooling.

2. **NestJS alignment** — NestJS is designed for REST APIs. Controllers, decorators, and swagger generation are first-class features.

3. **OpenAPI generation** — `@nestjs/swagger` auto-generates API documentation and can produce typed client SDKs for any language.

4. **Caching** — HTTP caching (ETags, Cache-Control) works natively with REST. CDN caching for recipe listings is straightforward.

5. **Familiarity** — REST is widely understood. New team members can contribute immediately.

### Why Not tRPC

| tRPC Advantage | REST Alternative |
|---|---|
| End-to-end type safety | Shared Zod schemas in `packages/shared` |
| No API boilerplate | NestJS generators + decorators |
| Auto-completion in IDE | Generated OpenAPI client types |

tRPC drawbacks:
- Tightly couples frontend and backend transport
- Mobile clients cannot use tRPC (TypeScript-only)
- Websocket-like protocol not standard for mobile
- Less ecosystem support outside Next.js full-stack

### Why Not GraphQL

GraphQL is powerful but adds complexity:
- Schema duplication (Prisma schema + GraphQL schema)
- N+1 query problems require DataLoader
- Over-fetching is not a real problem with well-designed REST endpoints
- Mobile clients need code generation for typed queries
- Overkill for the current data model complexity

## Consequences

### Positive
- Any client can consume the API
- Standard HTTP semantics (status codes, caching, headers)
- Auto-generated documentation
- Easy to test with curl/Postman

### Negative
- More boilerplate than tRPC for TypeScript-only scenarios
- No automatic end-to-end types (mitigated by shared Zod schemas)

### Neutral
- Type safety maintained through `packages/shared` Zod schemas used in both frontend and backend validation
