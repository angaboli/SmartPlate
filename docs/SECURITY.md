# SmartPlate — Security Baseline

> **Version**: 1.0
> **Last updated**: 2026-01-28

---

## Threat Model Overview

| Threat | Risk Level | Mitigation |
|---|---|---|
| Credential stuffing | High | Rate limiting on auth endpoints (5/min) |
| SQL injection | High | Prisma ORM (parameterized queries) |
| XSS (stored) | High | Sanitize user-generated content (recipe imports) |
| JWT token theft | Medium | Short-lived access tokens (15min), httpOnly cookies |
| Social link abuse | Medium | Rate limiting on imports (10/hour), URL validation |
| LLM prompt injection | Medium | Input sanitization, output validation, no system prompt leakage |
| CSRF | Low | SameSite cookies, token-based auth |
| Denial of service | Medium | Global rate limiting, queue backpressure |

---

## Authentication Security

### Password Policy
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- Hashed with bcrypt (cost factor 12)
- Never stored in plaintext
- Never returned in API responses

### JWT Configuration
- **Access token**: 15 minutes expiry, signed with `JWT_SECRET`
- **Refresh token**: 7 days expiry, signed with `JWT_REFRESH_SECRET`
- Refresh tokens stored in database (revocable)
- Logout invalidates refresh token
- Token rotation on refresh (old token invalidated)

### Session Security
- Access tokens sent as httpOnly cookies (web) or Authorization header (mobile)
- SameSite=Strict for cookies
- Secure flag in production (HTTPS only)
- Auto-refresh flow prevents token exposure in URLs

---

## Input Validation

### API Layer
- All endpoints validated with Zod schemas
- Validation runs before any business logic
- Failed validation returns 422 with field-level errors
- No raw SQL queries (Prisma handles parameterization)

### Import URL Validation
- Must be valid HTTP/HTTPS URL
- Maximum URL length: 2048 characters
- Blocked protocols: `javascript:`, `data:`, `file:`
- Provider detection via URL pattern matching
- Fetch timeout: 10 seconds
- Maximum response body: 5MB
- Follow redirects: maximum 3 hops

### User-Generated Content
- Recipe titles: max 200 characters, strip HTML
- Recipe descriptions: max 2000 characters, strip HTML
- Ingredient/step text: max 500 characters, strip HTML
- Meal descriptions: max 1000 characters, strip HTML
- Sanitization library: DOMPurify (server-side)

---

## Rate Limiting

| Endpoint Group | Limit | Window | Scope |
|---|---|---|---|
| Auth (login/register) | 5 requests | 1 minute | Per IP |
| Auth (refresh) | 10 requests | 1 minute | Per IP |
| Import (POST) | 10 requests | 1 hour | Per user |
| AI endpoints | 20 requests | 1 hour | Per user |
| General API | 100 requests | 1 minute | Per user |
| Health check | Unlimited | — | — |

Implementation: `@nestjs/throttler` with Redis-backed store.

---

## HTTP Security Headers

Applied via `helmet` middleware:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0 (rely on CSP instead)
Strict-Transport-Security: max-age=63072000; includeSubDomains
Content-Security-Policy: default-src 'self'; img-src 'self' https:; ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## CORS Policy

### Development
```
Allowed origins: http://localhost:3001
Allowed methods: GET, POST, PATCH, DELETE
Allowed headers: Content-Type, Authorization, Accept-Language
Credentials: true
```

### Production
```
Allowed origins: https://smartplate.ai (exact domain)
Same methods and headers
Credentials: true
```

---

## AI/LLM Security

### Prompt Injection Prevention
- User input is always placed in a clearly delimited data section
- System prompts are not exposed to users
- LLM output is validated against Zod schemas before use
- Fallback responses if validation fails
- No user-facing raw LLM output (always structured/parsed)

### Output Safety
- Nutritional advice includes disclaimer text
- AI-generated meal plans are recommendations, not medical advice
- Calorie/nutrient values are estimates

---

## Data Protection

### Sensitive Data
- Passwords: bcrypt hashed, never logged
- JWT secrets: environment variables only
- Database credentials: environment variables only
- API keys: environment variables only
- User emails: stored encrypted at rest (Neon handles this)

### Environment Variables
- `.env` is git-ignored
- `.env.example` contains variable names without values
- Production secrets managed via deployment platform (not in code)

### Logging
- Structured JSON logs (pino)
- Never log: passwords, tokens, API keys, full request bodies
- Log: request method, path, status code, duration, user ID (if authenticated)
- Error logs include stack traces but sanitize user data

---

## Dependency Security

### Audit
```bash
pnpm audit                    # Check for known vulnerabilities
pnpm audit --fix              # Auto-fix where possible
```

### Policy
- Run `pnpm audit` in CI pipeline
- No `critical` or `high` vulnerabilities allowed in production
- Review `moderate` vulnerabilities case-by-case
- Keep dependencies updated monthly

---

## Checklist by Milestone

### M2 (Auth)
- [ ] Password hashing with bcrypt
- [ ] JWT access + refresh token flow
- [ ] Rate limiting on auth endpoints
- [ ] Input validation on registration

### M5 (Imports)
- [ ] URL validation and sanitization
- [ ] Rate limiting on import endpoint
- [ ] Fetch timeout and size limits
- [ ] Content sanitization of extracted data

### M6 (AI)
- [ ] Prompt injection prevention
- [ ] LLM output validation
- [ ] No system prompt exposure

### M9 (Hardening)
- [ ] All security headers active
- [ ] CORS locked to production domain
- [ ] Full rate limiting coverage
- [ ] Structured logging (no sensitive data)
- [ ] Dependency audit clean
- [ ] OpenAPI docs protected or rate-limited
