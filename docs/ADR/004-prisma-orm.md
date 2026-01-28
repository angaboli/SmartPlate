# ADR-004: Prisma as ORM

> **Status**: Accepted
> **Date**: 2026-01-28
> **Deciders**: Architecture team

---

## Context

The project uses PostgreSQL (Neon) and needs an ORM/query builder for the NestJS backend.

## Decision

Use Prisma as the ORM for database access and migrations.

## Rationale

### Why Prisma

1. **Type-safe queries** — Prisma Client generates TypeScript types from the schema. Every query is type-checked at compile time.

2. **Migration system** — `prisma migrate dev` handles schema changes with auto-generated SQL migrations that are version-controlled.

3. **Schema as documentation** — `schema.prisma` is a single, readable file that defines the entire database structure.

4. **Neon PostgreSQL support** — Prisma has first-class support for Neon, including connection pooling with pgBouncer.

5. **NestJS integration** — Well-established patterns for using Prisma in NestJS (PrismaModule as global provider).

6. **Developer experience** — Prisma Studio for visual database browsing, auto-completion in IDE, clear error messages.

### Alternatives Considered

| Alternative | Reason to Skip |
|---|---|
| TypeORM | Decorator-based, looser types, migration issues in production |
| Drizzle | Newer, less mature ecosystem, though gaining popularity |
| Knex | Query builder only, no schema management |
| Raw SQL | No type safety, migration management burden |
| MikroORM | Smaller community, less NestJS adoption |

## Schema Location

Prisma schema lives at `prisma/schema.prisma` in the repository root (not inside a package) because:
- Both the API and seeding scripts need access
- Prisma CLI expects it at the root by default
- Migrations are project-wide, not package-specific

## Consequences

### Positive
- Type-safe database queries
- Easy migration management
- Great developer experience
- Strong PostgreSQL + Neon support

### Negative
- Prisma Client adds a generation step (`prisma generate`)
- Some complex queries require `$queryRaw`
- Prisma Client size can impact Lambda cold starts (not relevant for NestJS server)

### Neutral
- JSON columns (`Json?`) used for semi-structured data (AI analysis, nutrients)
- `cuid()` used for primary keys (collision-resistant, URL-safe)
