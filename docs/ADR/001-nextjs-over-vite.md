# ADR-001: Migrate from Vite SPA to Next.js

> **Status**: Accepted
> **Date**: 2026-01-28
> **Deciders**: Architecture team

---

## Context

The current frontend is a Vite + React Single Page Application exported from Figma. The product is a FoodTech/recipe app where recipe content is a core feature and SEO is critical for organic user acquisition.

## Decision

Migrate the frontend from Vite SPA to Next.js (App Router) at milestone M0, before adding any routing or API integration.

## Rationale

### Why SEO Matters for SmartPlate

1. **Recipe rich results** — Google shows special recipe cards in search results (with image, prep time, rating). These require JSON-LD structured data in the **initial HTML response**. An SPA renders an empty `<html>` to crawlers.

2. **Social media previews** — When users share recipe links on WhatsApp, Telegram, Facebook, or Twitter, the preview card (title, image, description) is generated from Open Graph meta tags. SPAs serve empty `<head>` to social media crawlers.

3. **Core Web Vitals** — Google uses LCP (Largest Contentful Paint) and FCP (First Contentful Paint) as ranking signals. SSR provides significantly better scores because content is in the initial HTML.

4. **Indexing speed** — Google processes JavaScript-rendered content with delays (second-wave indexing). SSR pages are indexed immediately.

5. **Competitive landscape** — Recipe content is one of the most SEO-competitive categories on the web. Competitors using SSR (Next.js, Nuxt, WordPress) will outrank an SPA.

### Why Now (M0) Instead of Later

1. **No router yet** — The current app uses `useState` for routing. We need to add a router anyway. Next.js App Router replaces the need for React Router.

2. **Migration cost is lowest now** — The app has 4 pages, no API integration, no auth. Every milestone adds complexity that makes migration harder.

3. **No breaking changes** — All existing components, contexts, and styles are framework-agnostic React. They work identically in Next.js.

4. **Build tool replacement** — Next.js replaces Vite. We don't lose anything (Tailwind, HMR, TypeScript all work the same).

### What Stays the Same

- All React components (Header, Navigation, RecipeCard, etc.)
- All React contexts (LanguageContext, CookLaterContext)
- All styles (Tailwind CSS v4, theme.css, CSS variables)
- All Radix UI primitives
- All third-party libraries (recharts, lucide, date-fns, etc.)
- Dark/light theme via next-themes (already compatible)

### What Changes

| Before (Vite) | After (Next.js) |
|---|---|
| `main.tsx` with `createRoot` | `app/layout.tsx` with providers |
| `useState('home')` routing | File-based App Router |
| `vite.config.ts` | `next.config.ts` |
| No URL paths | `/`, `/dashboard`, `/recipes`, `/profile` |
| No SSR | SSR for public pages, CSR for protected pages |
| No meta tags | Dynamic meta tags per page |
| `@vitejs/plugin-react` | Built into Next.js |
| `@tailwindcss/vite` | `@tailwindcss/postcss` (or v4 native) |

## Consequences

### Positive
- Recipe pages are indexable by search engines
- Social sharing generates proper preview cards
- Better Core Web Vitals scores
- URL-based routing enables deep linking and browser history
- Foundation for future SEO features (sitemap, robots.txt, structured data)

### Negative
- Learning curve for developers unfamiliar with App Router
- Slightly more complex deployment (SSR requires a Node.js server, not just static files)
- Build times may be slightly longer than Vite

### Neutral
- NestJS remains the API backend (Next.js is frontend only)
- Development experience (HMR, TypeScript) is comparable to Vite

## Alternatives Considered

### Stay with Vite + add prerendering
Could use `vite-plugin-ssr` or `vite-plugin-ssg` for static pages. Rejected because:
- Limited SSR capabilities
- More manual work for meta tags
- Not suited for dynamic recipe pages
- Smaller ecosystem and community

### Vite + separate prerender service
A headless Chrome service to prerender pages for crawlers. Rejected because:
- Overcomplicated architecture
- Latency for first-time crawls
- Maintenance burden

### Use Next.js API routes instead of NestJS
Could use Next.js for both frontend and API. Rejected because:
- Mobile clients need a standalone API server
- Background jobs need a long-running process
- NestJS provides better API patterns (DI, guards, interceptors)
- Separation of concerns
