# SmartPlate — Plan Technique d'Amélioration

> **Version** : 3.0 (remplace l'audit pré-migration Next.js)
> **Dernière mise à jour** : 2026-07-15
> **Méthode** : audit du code réel (`src/`, `prisma/`, `.github/`, `package.json`) confronté aux documents `docs/*.md` existants.

Ce document liste les écarts concrets constatés entre le code tel qu'il existe aujourd'hui et ce que promettent les autres documents du repo, puis propose un plan d'action priorisé. Chaque point référence un fichier réel — pas de suggestion générique.

---

## Résumé de l'état actuel

- **26 routes API** sous `src/app/api/v1/**` (auth, admin, recipes, cook-later, imports, meal-logs, planner, health, cron).
- **RBAC** (user/editor/admin) + workflow de publication de recettes déjà en place (`src/lib/rbac.ts`).
- **IA** : appels OpenAI (GPT-4o-mini) **synchrones**, directement dans les services (`src/services/ai.service.ts`, `meal-log.service.ts`, `planner.service.ts`) — aucune file d'attente, aucun worker.
- **i18n** : 480 clés EN/FR strictement synchronisées (`scripts/check-translations.ts`).
- **Tests** : 15 fichiers, uniquement unitaires sur `src/lib/**` et `src/services/**` (`vitest.config.ts` ne mesure la couverture que sur ces deux dossiers).
- **CI** (`\.github/workflows/ci.yml`) : lint → typecheck → test → build. Pas d'étape `pnpm audit`.

---

## P0 — Cohérence & fiabilité immédiate

### 1. La documentation d'architecture décrit un système qui n'existe pas
`docs/ARCHITECTURE.md`, `docs/PLAN.md`, `docs/SETUP.md` et `docs/DEPLOYMENT.md` décrivent un pipeline **Redis + BullMQ + `workers/`** (import, ai-analysis, ai-planner) avec polling frontend toutes les 2s.

Réalité : aucune dépendance `bullmq`/`redis` dans `package.json`, aucun dossier `workers/`. Le ROADMAP.md le confirme lui-même pour M5 : *"Import Feature (DB-backed, No Redis)"*. Les appels IA sont `await`és directement dans le handler de route (voir `src/app/api/v1/meal-logs/route.ts:16`).

Autres divergences dans les mêmes docs :
- `middleware.ts` documenté vs fichier réel `src/proxy.ts` (convention **Next.js 16**, qui a renommé middleware → proxy — donc le code est à jour, c'est le doc qui est en retard).
- Routes documentées `/users/me`, `/saved-recipes` vs routes réelles `/api/v1/me`, `/api/v1/cook-later`.
- Node 20 LTS documenté (`SETUP.md`) vs Node 22 en CI et Node 24 en local.

**Risque** : un nouveau contributeur (ou un agent IA) qui suit ces docs va installer Redis inutilement, chercher des fichiers qui n'existent pas, et faire de mauvais choix d'architecture.

**Action** : passe de nettoyage documentaire — retirer/rectifier les sections Redis/BullMQ/workers dans `ARCHITECTURE.md`, `PLAN.md`, `SETUP.md`, `DEPLOYMENT.md` ; corriger l'inventaire de routes ; aligner la version Node. `USER_GUIDE.md` a le même problème (décrit un Cook Later "en session uniquement", alors qu'il est persistant en DB depuis M4).
**Effort** : M (documentation uniquement, pas de code).

### 2. `"next": "latest"` dans `package.json`
Aucune version épinglée → un build peut changer de comportement sans qu'aucun commit ne le déclenche (déjà sur Next.js 16, une version très récente). Pas de champ `engines` ni `packageManager`, alors que le projet dépend strictement de pnpm (`pnpm-workspace.yaml`, `pnpm.onlyBuiltDependencies`).

**Action** :
- Remplacer `"next": "latest"` par la version exacte actuellement installée (`16.1.6`).
- Ajouter `"engines": { "node": ">=22" }` et `"packageManager": "pnpm@9.x"`.
**Effort** : S.

### 3. Appels OpenAI synchrones sans garde-fou de timeout
`createMealLog`, `generateWeeklyPlan`/`adjustWeeklyPlan`, `import extract` appellent l'API OpenAI en bloquant la réponse HTTP. Sur Vercel, les fonctions serverless ont une limite d'exécution (10s en Hobby, configurable en Pro) — si OpenAI répond lentement, la requête échoue sans retry ni statut de job consultable, contrairement à ce que `ARCHITECTURE.md` promet encore ("Frontend polls... every 2 seconds").

**Action** : au minimum, documenter le choix "synchrone, acceptable à l'échelle actuelle" avec un timeout explicite côté `ai.service.ts` + message d'erreur clair au frontend. Si la latence devient un problème réel en prod, envisager une file légère serverless-friendly (Vercel Queues, Inngest, QStash) plutôt que de réintroduire Redis.
**Effort** : S (doc) → M (si file d'attente ajoutée).

### 4. CI sans audit de dépendances
`docs/SECURITY.md` impose `pnpm audit` en politique obligatoire ("No critical or high vulnerabilities allowed in production"), mais `.github/workflows/ci.yml` ne l'exécute jamais.

**Action** : ajouter une étape `pnpm audit --audit-level=high` (ou équivalent) au CI, avec échec du job si violation.
**Effort** : S.

---

## P1 — Sécurité & qualité

### 5. `docs/SECURITY.md` décrit des protections absentes du code
- CORS restreint en prod (`https://smartplate.ai` uniquement) : aucune config CORS trouvée dans `next.config.ts` ni dans les route handlers.
- Rate limiting via `@nestjs/throttler` : le projet n'est pas NestJS. Le rate limiting réel est fait via `src/lib/rate-limit.ts` + table Postgres `RateLimitAttempt` — ça fonctionne, mais le doc référence la mauvaise techno.
- Sanitisation DOMPurify des contenus utilisateur : **aucune dépendance `dompurify`/`sanitize-html`** dans `package.json`.

**Constat nuancé sur la sanitisation** : recherche de `dangerouslySetInnerHTML` sur tout `src/` → un seul usage, dans `src/components/ui/chart.tsx`, pour injecter des variables CSS de thème (pas du contenu utilisateur, risque nul). Le contenu de recettes importées (titres/descriptions scrapées via cheerio) est rendu comme texte React classique, donc auto-échappé — la promesse DOMPurify est donc moins urgente qu'annoncée, mais le doc ne doit pas prétendre qu'elle existe.

**Action** : corriger `SECURITY.md` pour refléter l'implémentation réelle (rate limiting DB-based, pas de CORS actif car un seul client web), et si un client mobile ou un domaine séparé est prévu, implémenter réellement une politique CORS dans `next.config.ts` ou les route handlers.
**Effort** : S (doc) → M (si CORS réel nécessaire).

### 6. Couverture de tests concentrée sur un tiers du code
15 fichiers de tests, tous en unitaire sur `src/lib/**` et `src/services/**`. `vitest.config.ts` limite explicitement `coverage.include` à ces deux dossiers :
- **0 test d'intégration** sur les 26 routes API (`src/app/api/v1/**/route.ts`) — alors que `docs/TESTING.md` en documente le pattern.
- **0 test de composant** React (`src/components/**`, 60+ fichiers).
- **0 test E2E** — Playwright est documenté dans `TESTING.md` comme stack cible mais n'est jamais installé (absent de `devDependencies`).

**Action, par ordre de priorité** :
1. Étendre `coverage.include` à `src/app/api/v1/**` pour au moins mesurer ce qui existe.
2. Ajouter des tests d'intégration sur la surface la plus sensible : auth (login/refresh/logout), RBAC (`submit`/`review`/`admin/users`), rate limiting.
3. Si budget dispo : installer Playwright pour 2-3 parcours critiques (login, log meal + analyse IA, import de recette).
**Effort** : M à L selon l'ambition.

### 7. Aucun suivi d'erreurs en production
`SENTRY_DSN` est mentionné comme variable optionnelle (`docs/SETUP.md`, `docs/DEPLOYMENT.md`) mais jamais câblé dans le code (pas de dépendance Sentry). Avec des appels LLM et du scraping HTML tiers en prod, les échecs silencieux (quota OpenAI dépassé, parsing cassé) ne remontent qu'aux logs pino de Vercel, difficiles à surveiller activement.

**Action** : intégrer Sentry (ou équivalent) au minimum sur les endpoints IA (`meal-logs`, `planner/generate`, `planner/adjust`) et imports.
**Effort** : S-M.

---

## P2 — Dette technique / hygiène

### 8. Dépendances installées mais inutilisées
`react-dnd` + `react-dnd-html5-backend` sont dans `package.json` mais `docs/ROADMAP.md` confirme explicitement (M7) : *"Drag-and-drop reordering is not implemented (react-dnd installed but unused)"*. Poids mort (~bundle size) sans bénéfice.

**Action** : soit implémenter le drag-and-drop dans `WeeklyPlanner.tsx` (fonctionnalité produit initialement prévue), soit retirer la dépendance si elle n'est plus dans la roadmap.
**Effort** : S (retrait) / M (implémentation réelle).

### 9. Pas de pagination sur `GET /api/v1/recipes`
`src/services/recipes.service.ts` ne contient aucun `skip`/`take`/paramètre de page — toutes les recettes sont chargées en une requête. Fonctionne à faible volume, mais ne passera pas à l'échelle dès que le catalogue de recettes grossira (surtout avec les imports utilisateurs qui créent des `Recipe` en continu).

**Action** : ajouter une pagination cursor-based ou offset-based avant que le volume de recettes ne devienne un problème (seuil suggéré : avant la mise en prod publique, pas après).
**Effort** : S.

### 10. Domaines d'images non whitelistés pour les recettes importées
`next.config.ts` n'autorise que `images.unsplash.com` dans `images.remotePatterns`. Les recettes importées depuis Instagram/TikTok/YouTube stockent une `imageUrl` scrapée (Open Graph), mais `next/image` refusera de charger ces domaines tant qu'ils ne sont pas explicitement whitelistés — risque concret de recettes importées affichées sans image en prod.

**Action** : soit whitelister dynamiquement les domaines des providers supportés, soit passer par un proxy d'images (ex: reencodage server-side), soit désactiver l'optimisation Next Image pour ces cas précis (`unoptimized`).
**Effort** : S.

### 11. Documents produit obsolètes en plus des docs techniques
`USER_GUIDE.md` décrit encore un Cook Later "en session" et un import "simulé" — obsolète depuis M4/M5. À traiter dans la même passe que le point P0-1.

**Effort** : S.

---

## P3 — Amélioration produit / scaling (non bloquant)

| Sujet | Constat | Action suggérée |
|---|---|---|
| Stockage d'images custom | `docs/DEPLOYMENT.md` liste S3/Cloudflare R2 comme "à ajouter si besoin" — aucune intégration actuelle. | À faire seulement si l'upload d'images de recettes custom devient une fonctionnalité demandée. |
| Pluralisation i18n | 480 clés statiques EN/FR, pas de moteur ICU (pluriels, genre). | Pas urgent à 2 langues ; à revisiter si une 3e langue ou des formats pluriels complexes arrivent. |
| Monitoring uptime | `docs/DEPLOYMENT.md` recommande UptimeRobot/Better Stack — non configuré. | Simple à ajouter, faible effort, bon rapport valeur/coût avant un lancement public. |

---

## Plan d'exécution suggéré

1. **Sprint doc-cleanup** (P0-1, P1-5, P2-11) — aucun risque de régression, gros gain de clarté pour la suite. Peut être fait par un agent en une passe.
2. **Sprint hardening CI/deps** (P0-2, P0-4) — petits changements à fort effet de sécurité/reproductibilité.
3. **Sprint tests critiques** (P1-6, priorité 1-2 seulement) — sécuriser auth/RBAC/rate-limit avant d'ajouter de nouvelles features.
4. **Sprint observabilité** (P1-7) — activer Sentry sur les chemins IA/imports.
5. Le reste (P2-8, P2-9, P2-10, P3) peut être traité au fil de l'eau selon la charge produit réelle.

---

## Historique

Ce fichier remplace un précédent audit rédigé avant la migration vers Next.js (contexte Figma Make, Vite, contextes React en mémoire). Pour l'historique détaillé des fonctionnalités livrées milestone par milestone, voir [`ROADMAP.md`](./ROADMAP.md).
