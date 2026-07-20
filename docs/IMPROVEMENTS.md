# SmartPlate — Plan Technique d'Amélioration

> **Version** : 3.0 (remplace l'audit pré-migration Next.js)
> **Dernière mise à jour** : 2026-07-15
> **Méthode** : audit du code réel (`src/`, `prisma/`, `.github/`, `package.json`) confronté aux documents `docs/*.md` existants.

Ce document liste les écarts concrets constatés entre le code tel qu'il existe aujourd'hui et ce que promettent les autres documents du repo, puis propose un plan d'action priorisé. Chaque point référence un fichier réel — pas de suggestion générique.

---

## Résumé de l'état actuel

- **26 routes API** sous `src/app/api/v1/**` (auth, admin, recipes, cook-later, imports, meal-logs, planner, health, cron).
- **RBAC** (user/editor/admin) + workflow de publication de recettes déjà en place (`src/lib/rbac.ts`).
- **IA** : appels OpenAI (GPT-4o-mini) **synchrones**, directement dans les services (`src/services/ai.service.ts`, `meal-log.service.ts`, `planner.service.ts`) — aucune file d'attente, aucun worker ; timeout client de 25s avec erreur 503 propre en cas de dépassement.
- **i18n** : 480 clés EN/FR strictement synchronisées (`scripts/check-translations.ts`).
- **Tests** : 15 fichiers, uniquement unitaires sur `src/lib/**` et `src/services/**` (`vitest.config.ts` ne mesure la couverture que sur ces deux dossiers).
- **CI** (`\.github/workflows/ci.yml`) : install → **audit (`--prod --audit-level=high`)** → lint → typecheck → test → build.

---

## P0 — Cohérence & fiabilité immédiate

### 1. ~~La documentation d'architecture décrit un système qui n'existe pas~~ — ✅ Résolu (2026-07-15)
`docs/ARCHITECTURE.md`, `docs/PLAN.md`, `docs/SETUP.md` et `docs/DEPLOYMENT.md` décrivaient un pipeline **Redis + BullMQ + `workers/`** (import, ai-analysis, ai-planner) avec polling frontend toutes les 2s, qui n'a jamais existé (`docs/ROADMAP.md` confirme pour M5 : *"Import Feature (DB-backed, No Redis)"*).

Les 5 documents (`ARCHITECTURE.md`, `PLAN.md`, `SETUP.md`, `DEPLOYMENT.md`, `USER_GUIDE.md`) ont été réécrits pour refléter l'implémentation réelle : appels IA/import synchrones (avec le garde-fou de timeout du point 3 ci-dessous), `src/proxy.ts` (convention Next.js 16) au lieu de `middleware.ts`, inventaire de routes réel (`/api/v1/me`, `/api/v1/cook-later`, etc.), Node 22+, et statut M7/M8 marqués "Done" (ils l'étaient déjà en pratique). `USER_GUIDE.md` ne décrit plus un Cook Later "en session" ni un mode hors-ligne inexistant.

### 2. ~~`"next": "latest"` dans `package.json`~~ — ✅ Résolu (2026-07-15)
`"next"` est maintenant épinglé en dur à `16.2.10` (voir aussi le point 4 : ce bump corrige au passage 7 CVE high sur `next`, dont plusieurs bypass de Middleware/Proxy — pertinent puisque `src/proxy.ts` gère la protection des routes). `engines.node` (`>=22`) et `packageManager` (`pnpm@11.11.0`) ajoutés à `package.json`.

**Attention pnpm 9 vs 11** : `pnpm-workspace.yaml` utilise `allowBuilds`, une fonctionnalité pnpm 10/11 — pnpm 9 (utilisé jusqu'ici en CI) plante dessus (`ERROR packages field missing or empty`). `.github/workflows/ci.yml` a été corrigé pour laisser `pnpm/action-setup@v4` lire la version depuis `packageManager` au lieu de forcer `version: 9`, pour rester synchronisé automatiquement avec ce champ à l'avenir.

### 3. ~~Appels OpenAI synchrones sans garde-fou de timeout~~ — ✅ Résolu (2026-07-15)
`createMealLog`, `generateWeeklyPlan`/`adjustWeeklyPlan` appelaient l'API OpenAI en bloquant la réponse HTTP sans timeout explicite (le SDK OpenAI défaut à 10 minutes) — sur Vercel, la plateforme aurait tué la fonction serverless en premier, avec une erreur opaque plutôt qu'un message clair.

`src/services/ai.service.ts` a maintenant un timeout client explicite de 25s (`AI_TIMEOUT_MS`) sur les 4 appels `openai.chat.completions.create()` (via un wrapper `createChatCompletion()`), qui convertit un timeout OpenAI (`APIConnectionTimeoutError`) en `AppError` 503 avec un message clair ("The AI is taking too long to respond. Please try again."), remonté proprement au frontend par `handleApiError`. L'architecture reste synchrone (documenté dans `ARCHITECTURE.md`) ; si la latence devient un problème réel en prod, envisager une file légère serverless-friendly (Vercel Queues, Inngest, QStash) plutôt que de réintroduire Redis.

### 4. ~~CI sans audit de dépendances~~ — ✅ Résolu (2026-07-15)
`docs/SECURITY.md` impose `pnpm audit` en politique obligatoire ("No critical or high vulnerabilities allowed in production"), mais `.github/workflows/ci.yml` ne l'exécutait jamais.

Ajouté : étape `pnpm audit --prod --audit-level=high` (scope `--prod` volontaire — la politique SECURITY.md porte sur la production, pas sur l'outillage dev comme vite/vitest qui a ses propres findings non-bloquants sans impact runtime).

**Avant d'activer le gate**, un premier run a révélé **116 vulnérabilités** dont **22 high + 1 critical côté production** :
- `jspdf` (1 critical + 4 high : injection HTML/PDF, DoS) → corrigé, `4.1.0` → `4.2.1`.
- `next` (7 high, dont plusieurs **bypass Middleware/Proxy**, directement pertinent pour `src/proxy.ts`) → corrigé, `16.1.6` → `16.2.10`.
- `undici` (transitif via `cheerio`, 4 high liés à WebSocket) → corrigé via `pnpm-workspace.yaml` `overrides: { undici: '>=7.28.0' }` (cheerio@1.2.0, déjà en dernière version, résout encore un undici plus ancien en interne).
- `lodash` (transitif via `recharts`, 1 high, injection de code via `_.template`) → corrigé via le même mécanisme `overrides: { lodash: '>=4.17.24' }` (recharts 2.x est en fin de vie, pas de nouvelle release prévue).
- Reste : 19 vulnérabilités moderate/low en prod (ex. `dompurify` bundlé par `jspdf`, `patched: >=3.4.8` — pas encore résolu, sous le seuil `--audit-level=high`, à surveiller).

Vérifié après upgrade : `tsc --noEmit`, `eslint .`, `vitest run` (163 tests), et `next build` tous verts ; `pnpm audit --prod --audit-level=high` exit 0.
**Effort** : S (gate CI) + M (résolution des CVE trouvées, fait dans la foulée).

---

## P1 — Sécurité & qualité

### 5. ~~`docs/SECURITY.md` décrit des protections absentes du code~~ — ✅ Résolu (2026-07-16)
En vérifiant chaque affirmation du doc contre le code réel, bien plus d'écarts que prévu sont apparus :
- CORS "restreint en prod" : aucune config CORS nulle part → corrigé (documenté comme non implémenté, acceptable tant qu'il n'y a qu'un client web same-origin).
- Rate limiting via `@nestjs/throttler` : le projet n'est pas NestJS ; le vrai mécanisme est DB-backed (`src/lib/rate-limit.ts` + compteurs par table) → corrigé, **et les valeurs elles-mêmes étaient fausses** : login réel = 10/15min/IP (doc disait 5/min), register = 5/heure/IP, refresh = 30/heure/IP, analyse IA = 20/**jour** (doc disait /heure), génération planner = 5/jour (absent du doc), et le "General API: 100/min" global n'existe pas du tout.
- Sanitisation DOMPurify : aucune dépendance installée → corrigé (le contenu est rendu comme texte React auto-échappé, pas de sanitisation HTML active — risque réel faible mais le doc ne doit pas prétendre l'inverse).
- **JWT access token** : documenté à 15min, en réalité **24h** (`src/lib/auth.ts`).
- **Politique de mot de passe** : documentée avec majuscule+chiffre obligatoires, en réalité seule la longueur (8-72 car.) est vérifiée (`src/lib/validations/auth.ts`).
- **Timeout fetch import** : documenté à 10s, en réalité 15s ; les limites "5MB max" et "3 hops max redirect" documentées n'existent pas dans `import-extractor.ts` (gap réel, pas juste une erreur de doc — ajouté à la checklist M9 de `SECURITY.md`).
- **Headers HTTP** : documentés via `helmet`, en réalité via `next.config.ts` `headers()` (pas de dépendance helmet).

`SECURITY.md` a été entièrement réécrit pour être exact, avec une checklist M9 qui distingue clairement ce qui est fait de ce qui ne l'est pas (CORS, complexité mot de passe, caps taille/redirect import, Sentry).

### 6. Couverture de tests concentrée sur un tiers du code — 🟢 Résolu : API, composants, et E2E (2026-07-20)
15 fichiers de tests, tous en unitaire sur `src/lib/**` et `src/services/**`. `vitest.config.ts` limitait explicitement `coverage.include` à ces deux dossiers, avec **0 test** sur `src/lib/rbac.ts`, `src/services/user.service.ts`, et les 28 routes API — alors que RBAC/admin est la surface la plus sensible du projet.

**Fait (2026-07-16)** :
- `coverage.include` étendu à `src/app/api/v1/**`.
- `src/lib/__tests__/rbac.test.ts` (10 tests, 100% de couverture sur `rbac.ts`, précédemment 0%).
- `src/services/__tests__/user.service.test.ts` (7 tests, précédemment 0%) — `changeUserRole`, `getProfile`/`listUsers`.
- Tests d'intégration sur 4 routes auth/RBAC (`auth/login`, `auth/refresh`, `auth/logout`, `admin/users/[id]/role`) — 15 tests.

**Fait (2026-07-17)** : toutes les routes API restantes couvertes, même pattern d'intégration (mock du/des service(s) + `getCurrentUser`/`requireAuth`, appel direct du handler exporté avec un `NextRequest`/`params` construits) — recipes CRUD + submit/review/status (5 routes, 30 tests), cook-later + imports (4 routes, 20 tests), meal-logs + scan + summary (3 routes, 14 tests), planner + generate/adjust/meals/groceries (6 routes, 24 tests), admin/users + auth/register + me (3 routes, 13 tests), et health + les 2 crons (3 routes, 8 tests, y compris le cas `CRON_SECRET` absent/incorrect). **Les 28 routes API ont maintenant au moins un test.** Suite complète : 195 → **347 tests**, tous verts (`tsc --noEmit`, `eslint`, `vitest run`, build de prod vérifiés).

**Fait (2026-07-20)** : infrastructure de test de composants installée (React Testing Library + jsdom + `@testing-library/user-event`), puis les 13 composants portant une vraie logique métier/état ont été couverts — 108 tests sur 13 fichiers :
- Formulaires/dialogues avec validation et mutations : `RecipeForm` (8), `MealInput` (9), `ImportRecipeDialog` (6), `AddEditMealDialog` (7), `DeleteRecipeDialog` (5), `GroceryListDialog` (7).
- Rendu piloté par hooks/contexte : `RecipeCard` (5), `CookLaterList` (6).
- Layout/nav avec logique de rôle et d'état : `Header` (6), `Navigation` (6), `LanguageSelector` (1).
- Présentation avec branches conditionnelles notables : `AIAnalysisCard` (6), `SmartSuggestions` (2).

Choix d'infra notables (détails dans les commits `test(components): ...`) : environnement jsdom activé par fichier via `// @vitest-environment jsdom` (le reste de la suite reste en `node`) ; `renderWithProviders()` utilise l'option `wrapper` de RTL (pas un pré-wrap de l'élément) pour que `rerender()` conserve le Provider Redux/TanStack Query ; polyfills `hasPointerCapture`/`scrollIntoView`/`ResizeObserver` ajoutés à `vitest.setup.ts` (gardés derrière un check `typeof Element !== 'undefined'` pour ne pas casser les tests en environnement `node`) pour les composants Radix Select/Dropdown.

**Fait (2026-07-20)** : Playwright installé et **3 parcours critiques vérifiés en conditions réelles dans un vrai navigateur** (pas seulement écrits — voir "Piège évité" ci-dessous) : `e2e/auth.spec.ts` (register → logout → login via la vraie UI), `e2e/meal-log.spec.ts` (saisie texte → analyse IA → `AIAnalysisCard`/`SmartSuggestions`), `e2e/import.spec.ts` (import d'une URL → édition → sauvegarde dans Cook Later). Détail complet de l'infra dans `docs/TESTING.md` (nouvelle section "E2E (Playwright)"). Points clés :
- **Local uniquement, pas dans la CI** — la CI n'a ni vraie DB (son `DATABASE_URL` est un placeholder juste pour que `next build` passe) ni les libs système de Chromium. Les tests tournent contre la même DB Neon de dev que `pnpm dev`, avec nettoyage automatique (voir plus bas).
- **Appels externes côté serveur mockés** — `src/services/ai.service.ts` a gagné un `OPENAI_BASE_URL` surchargeable (no-op partout ailleurs), pointé vers `e2e/mock-servers/server.mjs` (serveur Node sans dépendance) ; le mocking réseau de Playwright ne peut pas intercepter des appels que l'app fait elle-même côté serveur. Le flux d'import pointe simplement vers `GET /recipe-fixture` de ce même mock plutôt qu'un vrai site.
- **Une seule session partagée** — `e2e/global-setup.ts` enregistre un utilisateur une fois et sauvegarde la session (`storageState`), réutilisée par tous les specs sauf `auth.spec.ts`. Nécessaire car l'inscription est limitée à 5/heure par IP (`src/app/api/v1/auth/register/route.ts`), une vraie protection de prod qu'il n'était pas question d'affaiblir pour les tests.
- **Nettoyage automatique** — `e2e/global-teardown.ts` supprime les users `@e2e.smartplate.test`, les recettes importées depuis `/recipe-fixture`, et les lignes de rate-limit `register` créées localement (`127.0.0.1`/`::1`/`::ffff:127.0.0.1` uniquement — jamais les IP réelles de prod). Suite entièrement rejouable sans intervention manuelle, vérifié par 2 runs consécutifs.

**Piège évité** : `next dev` refuse une 2e instance dans le même dossier même sur un port différent — la config utilise `next build && next start` pour l'app testée, ce qui évite le conflit avec un `pnpm dev` du développeur déjà lancé. Autre piège : Chromium ne se lance pas dans un sandbox/VM fraîchement provisionné sans les libs système (`libnspr4` etc.) — nécessite `sudo npx playwright install-deps chromium` (ou `sudo env "PATH=$PATH" npx ...` si Node vient de nvm/volta/fnm, sudo ne voyant pas ce PATH par défaut) avant de pouvoir exécuter quoi que ce soit.

**Explicitement hors périmètre (décision assumée, pas un oubli)** :
- Les ~46 primitives `src/components/ui/**` (shadcn/Radix) et les composants purement présentationnels sans branche logique (`EmptyState`, `LoadingState`, `Logo`, `skeletons.tsx`) — tester du HTML statique sans état n'apporte pas de valeur de non-régression proportionnée à l'effort.
- `WeeklyPlanner.tsx` (drag-and-drop `react-dnd`) — pas couvert par le premier passage E2E ; candidat naturel pour un futur 4e parcours si besoin.

**Effort restant** : aucun jugé nécessaire dans l'immédiat — le sujet peut être considéré clos.

### 7. ~~Aucun suivi d'erreurs en production~~ — ✅ Résolu (2026-07-16)
`SENTRY_DSN` était mentionné comme variable optionnelle mais jamais câblé (pas de dépendance Sentry) — les échecs silencieux (quota OpenAI, parsing cassé) ne remontaient qu'aux logs pino de Vercel.

`@sentry/nextjs` installé et câblé app-wide (pas seulement IA/imports) : `src/instrumentation.ts` (server + edge), `src/instrumentation-client.ts` (client + navigation), `src/app/global-error.tsx` (erreurs React racine), `next.config.ts` wrappé via `withSentryConfig`. Le wizard interactif (`npx @sentry/wizard`) n'a pas pu aboutir dans cet environnement (login navigateur non détecté) — configuration faite manuellement contre l'org/projet Sentry créés par l'utilisateur (`mizi-0j` / `javascript-nextjs`). **Piège évité** : la CSP `connect-src 'self'` de `next.config.ts` aurait silencieusement bloqué tous les événements Sentry — ajout du host d'ingestion à `connect-src`. Vérifié de bout en bout : un événement de test réel envoyé et confirmé livré (`Sentry.flush()` → `true`), build et 195 tests toujours verts.

---

## P2 — Dette technique / hygiène

### 8. ~~Dépendances installées mais inutilisées~~ — ✅ Résolu (2026-07-16)
`react-dnd` + `react-dnd-html5-backend` étaient dans `package.json` depuis M7 mais jamais utilisées.

Drag-and-drop implémenté dans `WeeklyPlanner.tsx` (déplacer un repas d'un jour à l'autre) : `MealCard` (`useDrag`) et `DayMealsGrid` (`useDrop`) extraits en composants dédiés (nécessaire — les hooks ne peuvent pas être appelés dans un callback `.map()`), branché sur la mutation `useUpdateMeal` déjà existante côté `dashboard/page.tsx` (aucun changement backend nécessaire, `PATCH /api/v1/planner/meals/:itemId` acceptait déjà `dayIndex`).

### 9. ~~Pas de pagination sur `GET /api/v1/recipes`~~ — ✅ Résolu (2026-07-16)
`src/services/recipes.service.ts` ne contenait aucun `skip`/`take`/paramètre de page.

`listRecipes()` accepte maintenant `{ page, limit }` (défaut 20, max 100), retourne `{ data, meta: { page, limit, total, totalPages } }` ; la route valide/borne `page`/`limit` ; `useRecipes()` et `RecipesPage` (avec composant `Pagination` shadcn) mis à jour en conséquence. **Régression détectée et corrigée dans la foulée** : `src/app/dashboard/recipes/manage/page.tsx` appelait cette route directement (hors du hook) et attendait l'ancienne forme tableau — plantait en prod (`recipes.map is not a function`), corrigé avec `limit=100` explicite (pas de pagination UI sur cette page admin).

### 10. ~~Domaines d'images non whitelistés pour les recettes importées~~ — ❌ Faux positif, corrigé (2026-07-16)
Le constat initial ("`next/image` refusera de charger les domaines Instagram/TikTok/YouTube non whitelistés") supposait que les images de recettes passaient par `next/image`. En vérifiant le rendu réel : **aucun** des 4 endroits qui affichent `recipe.imageUrl` (`RecipeCard.tsx`, `CookLaterList.tsx`, `src/app/page.tsx`, `src/app/recipes/[id]/page.tsx`) n'utilise `next/image` — tous passent par `ImageWithFallback`, qui rend une balise `<img>` brute (confirmé par les warnings ESLint `@next/next/no-img-element` sur ce fichier). La restriction `images.remotePatterns` de `next.config.ts` ne s'applique donc jamais à ces images — pas de bug ici.

**Effet de bord réel** (différent du problème initialement documenté) : en utilisant `<img>` au lieu de `next/image`, ces images n'ont aucune optimisation (pas de redimensionnement responsive, pas de conversion WebP/AVIF automatique, pas de lazy-loading géré par Next). C'est un compromis délibéré de `ImageWithFallback` (gérer un `onError` de fallback simplement), pas un bug — à revisiter seulement si la performance des images devient un problème mesuré.

### 11. ~~Documents produit obsolètes en plus des docs techniques~~ — ✅ Résolu (2026-07-15)
`USER_GUIDE.md` décrivait encore un Cook Later "en session" (persistance locale) et un mode hors-ligne inexistant — corrigé pour refléter la persistance DB (M4) et la synchronisation multi-appareil.

### 12. ~~`prisma generate` uniquement en `postinstall` — build Vercel cassé après une migration de schéma~~ — ✅ Résolu (2026-07-17)
Après le changement de schéma `Recipe.mealTypes`/`SavedRecipe.tags` (commit `790f09c`), le build de production Vercel a échoué avec `Type error: Object literal may only specify known properties, but 'tags' does not exist ... Did you mean to write 'tag'?` — alors que le code et `prisma/schema.prisma` étaient corrects (vérifié : build local propre après `prisma generate` + `next build`). Cause : `package.json` ne lançait `prisma generate` que via `"postinstall"` ; le cache de dépendances de Vercel (restauré quand le lockfile n'a pas changé) peut sauter la ré-exécution de `postinstall`, laissant un `@prisma/client` généré **avant** la migration de schéma — le build type-check alors contre des types obsolètes. Corrigé en ajoutant `prisma generate` directement dans le script `"build"` (`"build": "prisma generate && next build"`), qui s'exécute toujours, indépendamment du cache d'install. **Leçon retenue** : sur Vercel + pnpm + Prisma, ne jamais compter uniquement sur `postinstall` pour la génération du client après une migration de schéma — l'ajouter explicitement au script `build`.

---

## P3 — Amélioration produit / scaling (non bloquant)

| Sujet | Constat | Action suggérée |
|---|---|---|
| Stockage d'images custom | Décidé — voir [Backlog: Stockage d'objets (Cloudflare R2)](#backlog--stockage-dobjets-cloudflare-r2) ci-dessous. | Credentials déjà provisionnés dans `.env`/`.env.example`, implémentation à planifier. |
| Pluralisation i18n | 480 clés statiques EN/FR, pas de moteur ICU (pluriels, genre). | Pas urgent à 2 langues ; à revisiter si une 3e langue ou des formats pluriels complexes arrivent. |
| Monitoring uptime | `docs/DEPLOYMENT.md` recommande UptimeRobot/Better Stack — non configuré. | Simple à ajouter, faible effort, bon rapport valeur/coût avant un lancement public. |

---

## Backlog — Stockage d'objets (Cloudflare R2)

> **Statut** : ✅ v1 complète (2026-07-17) — upload d'images de recettes/avatars, re-hébergement des imports, et nettoyage des objets orphelins, tous opérationnels de bout en bout (dev + prod). Reste seulement le nettoyage des anciens domaines externes whitelistés (point 5 ci-dessous, non bloquant).

**Fin du fil de debug déploiement (2026-07-16→17)** : après les correctifs 9/10/11/12 ci-dessous, un dernier blocage n'avait rien à voir avec le code — une panne GitHub ("Degraded REST API Availability", commencée le 16/07 à 22:51 UTC) empêchait le webhook GitHub→Vercel de déclencher de nouveaux déploiements silencieusement (aucune tentative visible, pas même en échec). Résolu une fois l'incident GitHub terminé côté GitHub, sans action supplémentaire nécessaire. À garder en tête : si un déploiement Vercel git-triggered ne se déclenche plus du tout (pas d'entrée dans Deployments, même pas "failed"), vérifier https://www.githubstatus.com avant de chercher un bug côté projet.

### Objectif

Remplacer/compléter le stockage d'images actuel (URLs externes brutes dans `Recipe.imageUrl`, `User.avatarUrl` — de simples champs `String`, aucun upload réel) par un stockage d'objets géré (Cloudflare R2, compatible API S3) pour :
1. **Images de recettes** — upload manuel par l'utilisateur/editor lors de la création/édition d'une recette, et ré-hébergement des images scrapées lors d'un import (au lieu de hotlink direct vers Instagram/TikTok/YouTube).
2. **Autres documents de l'app** — avatars utilisateurs, exports PDF partageables (aujourd'hui `src/lib/generatePDF.ts` génère le PDF côté client à la volée, sans persistance — R2 permettrait un lien de partage si ce besoin apparaît).

### Pourquoi maintenant est le bon moment de le planifier (mais pas forcément de l'implémenter)

Ce chantier résout aussi le [point P2-10](#10-domaines-dimages-non-whitelistés-pour-les-recettes-importées) de ce document : au lieu de whitelister des domaines externes fragiles (Instagram/TikTok/YouTube peuvent changer leurs CDN, bloquer le hotlinking, ou renvoyer 403), l'import re-téléverserait l'image extraite vers R2 une fois, avec une URL stable et un seul domaine à whitelister dans `next.config.ts` (celui de R2/du CDN custom).

### Approche technique proposée

1. **Client S3-compatible** — `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2 est compatible API S3, `R2_ENDPOINT` sert d'endpoint custom). Nouveau `src/lib/storage.ts` : client singleton (même pattern que `src/lib/db.ts`), fonctions `getUploadUrl()`, `getPublicUrl()`, `deleteObject()`.
2. **Flux d'upload recommandé : presigned URL, pas de proxy binaire par la route Next.js** — le client demande une URL de upload signée (`POST /api/v1/uploads/presign`, body `{ contentType, purpose: 'recipe-image' | 'avatar' }`), reçoit une URL PUT signée à durée de vie courte (~5 min), upload directement vers R2 depuis le navigateur, puis confirme l'URL finale au backend (`PATCH /api/v1/recipes/:id` avec la nouvelle `imageUrl`, ou `PATCH /api/v1/me` pour l'avatar). Évite de faire transiter des fichiers binaires par les fonctions serverless Vercel (limites de taille de payload/temps d'exécution).
3. **Structure des clés objet** — `recipes/{recipeId}/{uuid}.{ext}`, `avatars/{userId}/{uuid}.{ext}` — préfixes par domaine pour faciliter le nettoyage/les règles de lifecycle R2 plus tard.
4. **Validation côté API avant de signer l'upload** :
   - Type MIME whitelisté (`image/jpeg`, `image/avif`, `image/webp` — décision produit du 2026-07-17, PNG retiré/AVIF ajouté) pour les images ; whitelist distincte si documents génériques un jour.
   - Taille max (2MB images, décision produit du 2026-07-17, anciennement 5MB) — validée côté client ET verrouillée côté serveur via `ContentLength` sur la commande S3 présignée (voir point 2 ci-dessous).
   - Auth + RBAC : seul le propriétaire de la recette (ou editor/admin, cf. `src/lib/rbac.ts`) peut obtenir une URL d'upload pour cette recette.
   - Rate limiting réutilisant `src/lib/rate-limit.ts` (même mécanisme DB-based que imports/AI), ex. 20 uploads/heure/utilisateur.
5. **Accès public vs privé** — bucket en lecture publique (ou domaine custom Cloudflare) pour les images de recettes (déjà du contenu public une fois la recette publiée) ; si des documents privés arrivent un jour (ex. export PDF partagé avec expiration), utiliser des URLs signées en lecture (GET presigned) plutôt qu'un bucket public.
6. **`next.config.ts`** — ajouter le domaine R2 public (ou domaine custom) à `images.remotePatterns` une fois le bucket configuré.
7. **Schéma Prisma** — pas de migration obligatoire pour la v1 (les champs `imageUrl`/`avatarUrl` existants acceptent déjà n'importe quelle URL). À envisager plus tard si le nettoyage des objets orphelins (recette supprimée mais image jamais effacée de R2) devient un problème : soit un job de nettoyage périodique (cron Vercel, comme `cleanup-rate-limits`), soit une table `Asset` dédiée trackant chaque objet et son propriétaire.

### Découpage — état d'avancement

1. ~~`src/lib/storage.ts` (client R2 + presign)~~ — ✅ Fait.
2. ~~`POST /api/v1/uploads/presign` + validations + rate limiting~~ — ✅ Fait (whitelist MIME `image/jpeg`/`image/avif`/`image/webp`, RBAC via `canEditRecipe`/`requireRole`, 30 uploads/heure/utilisateur). Taille max **2MB** (décision produit 2026-07-17, anciennement 5MB/PNG) — désormais validée côté client (`useUpload.ts`) ET verrouillée côté serveur : le presign accepte un `fileSize` déclaré, rejeté par le schéma Zod s'il dépasse 2MB, et passé comme `ContentLength` à la commande S3 présignée pour que R2 refuse tout PUT dont le `Content-Length` réel ne correspond pas. Constantes centralisées dans `src/lib/validations/upload.ts` (`ALLOWED_UPLOAD_MIME_TYPES`, `MAX_UPLOAD_SIZE_BYTES`, `MIME_EXTENSIONS`) pour éviter la duplication front/back.
3. ~~UI d'upload sur `RecipeForm.tsx`~~ — ✅ Fait (bouton upload + preview + remplacer/retirer). ~~UI d'avatar sur la page profil~~ — ✅ Fait (2026-07-17) : avatar cliquable réutilisant `useUploadImage()`/`purpose: 'avatar'`, preview via `ImageWithFallback` avec overlay caméra au survol, persisté sur le bouton "Save Changes" de l'onglet comme le champ `name` (pas d'écriture immédiate à l'upload). `avatarUrl` ajouté à `ProfileDTO`/`UpdateProfileInput`/`updateProfileSchema`, combiné dans le même `db.user.update` que `name`.
4. ~~Migration progressive de l'extraction d'import (`src/services/import-extractor.ts`) pour re-héberger l'image scrapée vers R2 au lieu de stocker l'URL source telle quelle~~ — ✅ Fait (2026-07-17). `extractRecipeFromUrl()` télécharge l'image scrapée côté serveur (10s timeout) après extraction JSON-LD/Open Graph, valide MIME (whitelist) + taille (2MB, via `Content-Length` puis re-vérifié sur les octets réels reçus — un hébergeur externe peut mentir sur l'en-tête), et la re-uploade vers R2 sous `recipes/imports/{uuid}.{ext}` via le nouveau `uploadObject()` server-side (PUT direct, pas de presign — le serveur a déjà les octets). **Best-effort avec repli gracieux** : toute erreur (fetch échoué, type non supporté, trop lourd) fait retomber sur l'URL source d'origine plutôt que de faire échouer l'import — `ImageWithFallback` gère déjà l'affichage cassé le cas échéant. 5 tests dédiés dans `src/services/__tests__/import-extractor.test.ts` (jusqu'ici ce module n'avait aucun test).
5. ~~`next.config.ts` whitelist~~ — ✅ Fait (domaine `pub-53d4a03402a24c5b8c1a6db7c1d0b56b.r2.dev`, le domaine r2.dev par défaut — le domaine du projet est géré par Hostinger, pas Cloudflare, donc pas de domaine custom pour l'instant). Nettoyage des anciens domaines externes whitelistés — **pas fait**, à évaluer maintenant que la migration import (point 4) est en place : `ImageWithFallback` utilise un `<img>` brut donc `images.remotePatterns` ne bloque rien à l'affichage, seule l'implémentation actuelle du re-hosting réduit la dépendance aux domaines externes en pratique (pas une garantie stricte tant que le fallback best-effort existe).
6. **UX** : `RecipeCard.tsx`, `CookLaterList.tsx`, `src/app/page.tsx` et `src/app/recipes/[id]/page.tsx` affichent toujours `ImageWithFallback` même quand `recipe.imageUrl` est `null` — **pas encore corrigé**.
7. ~~Pas de job de nettoyage pour les objets orphelins~~ — ✅ Fait (2026-07-17). Plutôt qu'une table `Asset` dédiée, un cron périodique compare directement les objets R2 aux références actuelles en base : `cleanupOrphanedUploads()` (`src/services/storage-cleanup.service.ts`) liste tous les objets sous les préfixes `recipes/` et `avatars/` (`listObjects()`, nouveau dans `src/lib/storage.ts`, paginé via `ListObjectsV2Command`), construit l'ensemble des clés actuellement référencées par `Recipe.imageUrl`/`User.avatarUrl` (`extractKeyFromPublicUrl()`, l'inverse de `getPublicUrl()` — ignore silencieusement les URLs externes/collées à la main, qui ne sont pas des objets R2), et supprime tout objet non référencé **vieux de plus de 24h** (garde-fou pour ne pas supprimer un upload en cours, ex: brouillon de recette pas encore soumis). Cette approche générique couvre à la fois les objets jamais attachés (`recipes/pending/*`, `recipes/imports/*`) **et** les images remplacées et jamais nettoyées (`recipes/{id}/*` après un nouvel upload sur une recette existante, `avatars/{userId}/*` après un changement d'avatar) — un gap qui n'avait pas été identifié initialement mais que cette conception attrape gratuitement, puisqu'elle ne raisonne que sur "cette clé est-elle référencée quelque part" et pas sur l'origine de l'objet. Exposé via `GET /api/v1/cron/cleanup-orphaned-uploads` (même pattern d'auth `CRON_SECRET` que `cleanup-rate-limits`), programmé quotidiennement dans `vercel.json` (00h30 UTC, décalé de 30 min par rapport à l'autre cron). 6 tests dans `src/services/__tests__/storage-cleanup.service.test.ts`.
8. **Prérequis manuel obligatoire, découvert en testant en local (2026-07-16)** : le bucket R2 doit avoir une **policy CORS** configurée côté Cloudflare (Dashboard → R2 → bucket → Settings → CORS Policy) pour autoriser le `PUT` direct navigateur→R2 — sans ça, le preflight échoue (`No 'Access-Control-Allow-Origin' header`) et l'upload est bloqué, quel que soit le code. Exemple de policy :
   ```json
   [{ "AllowedOrigins": ["http://localhost:3000", "https://<domaine-prod>"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
   ```
   Ce n'est pas quelque chose que le code peut résoudre — c'est une config Cloudflare à faire une fois par environnement (localhost + domaine de prod).
9. ~~**Bug de compatibilité AWS SDK v3 / R2**~~ — ✅ Résolu (2026-07-16). Les versions récentes de `@aws-sdk/client-s3` activent par défaut `requestChecksumCalculation: 'WHEN_SUPPORTED'`, qui ajoute `x-amz-checksum-crc32`/`x-amz-sdk-checksum-algorithm` à chaque requête (y compris les URLs présignées) — R2 ne supporte pas ces extensions et rejette la requête. Corrigé dans `src/lib/storage.ts` en passant `requestChecksumCalculation: 'WHEN_REQUIRED'` au `S3Client`.
10. ~~**403 Forbidden persistant même après CORS + fix checksum**~~ — ✅ Résolu (2026-07-16). **Cause racine réelle** : le token API R2 initial avait des permissions insuffisantes (probablement "Read only" au lieu de "Object Read & Write"). Le 403 sans header CORS sur la réponse d'erreur faisait *ressembler* le problème à du CORS (R2 n'ajoute pas toujours les headers CORS sur les réponses d'erreur), ce qui a fait perdre du temps de debug. **Leçon retenue** : si un PUT présigné échoue en 403 malgré une CORS policy et un signing corrects, vérifier en priorité les permissions du token R2 (Cloudflare Dashboard → R2 → Manage API Tokens → le token doit être "Object Read & Write", scopé sur le bon bucket, sans restriction IP puisque l'upload réel part du navigateur de l'utilisateur final, pas du serveur).

**Configuration requise en production** : `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `NEXT_PUBLIC_R2_PUBLIC_URL` doivent être ajoutées aux variables d'environnement Vercel (vérifié que le build réussit avec ou sans ces variables — rien n'y accède au chargement du module, seulement à l'intérieur des handlers de route — mais l'upload échouera silencieusement en prod tant qu'elles n'y sont pas).

11. ~~**CORS origine `www.` manquante**~~ — ✅ Résolu (2026-07-16). La policy CORS du bucket listait `https://smartplate.fr` mais le site sert depuis `https://www.smartplate.fr` — deux origines distinctes pour CORS (correspondance exacte). Ajouté les deux variantes à `AllowedOrigins`.
12. ~~**CI cassée par `@sentry/nextjs` → build Vercel bloqué en silence**~~ — ✅ Résolu (2026-07-16). L'ajout de `@sentry/nextjs` a introduit `picomatch` vulnérable (ReDoS, via son plugin Rollup de sourcemaps) qui a fait échouer le gate `pnpm audit --prod --audit-level=high` en CI — et donc **skippé** lint/typecheck/test/build sur tous les commits suivants. Symptôme trompeur en prod : le bouton "Redeploy" du dashboard Vercel moulinait ~5 min puis échouait en 502, sans lien évident avec la CI. Corrigé via un override `picomatch: '>=4.0.4'` dans `pnpm-workspace.yaml` (même mécanisme que `undici`/`lodash`). **Leçon retenue** : si un déploiement Vercel refuse de démarrer/échoue sans log clair, vérifier en premier le statut du dernier run CI GitHub Actions sur `main` — un audit de sécurité rouge bloque silencieusement toute la chaîne.

---

## Backlog — Refonte de la page Coach IA (`/dashboard`)

> **Statut** : ✅ Implémentée (2026-07-20), vérifiée dans un vrai navigateur (voir "Ce qui a été fait" ci-dessous).

### Problème constaté

Sur `src/app/dashboard/page.tsx`, la page mélange trois usages différents dans un seul scroll vertical : (1) les stats/graphiques de suivi (cartes stats lignes ~202-256, `WeeklyProgressChart` ligne 259), (2) l'entrée de repas + analyse IA (`MealInput`/`AIAnalysisCard`, section ~288-316), (3) le planificateur hebdomadaire (`WeeklyPlanner`, section ~319-409). Deux problèmes remontés par l'utilisateur :
1. **Les graphiques en tête de page ne sont pas clairs quand il n'y a pas encore de données** (nouvel utilisateur, ou juste un jour sans log) — `WeeklyProgressChart` avec un `data` vide/plat ne communique pas "voici ce que tu peux faire ici", ce qui tue l'envie d'aller plus loin dès le premier écran.
2. **L'objectif principal de la page (planifier + suivre ses repas) n'est pas visible en premier** — il faut scroller après des graphiques peu engageants pour atteindre les outils réellement actionnables (`MealInput`, `WeeklyPlanner`).

### Suggestion de l'utilisateur (point de départ, affinée depuis)

Première suggestion (2026-07-17) : couper la page en deux, une page "vue d'ensemble" (graphiques/stats) et une page combinée "planifier & suivre" (`MealInput`/`AIAnalysisCard` + `WeeklyPlanner`).

**Correction apportée par l'utilisateur (2026-07-17, même jour)** : suivre son repas (`MealInput`/`AIAnalysisCard`, y compris le scan photo ajouté depuis) et planifier ses repas à venir (`WeeklyPlanner`) sont deux usages distincts qui n'ont pas de raison d'être combinés sur une même page — "ça n'a pas de sens de le mettre dans planner et même pas d'intérêt". Le découpage à concevoir est donc plutôt en **trois** concepts séparés, pas deux :
- **Vue d'ensemble** — graphiques/stats (résumé), avec un état vide explicite/pédagogique.
- **Suivre** — logger ce qu'on a mangé (`MealInput`, saisie texte + scan photo, `AIAnalysisCard`).
- **Planifier** — le planificateur hebdomadaire (`WeeklyPlanner`) et tout ce qui s'y rattache (génération IA, liste de courses).

Objectif recherché : des outils séparés avec un rôle clair chacun, plutôt qu'une seule page qui essaie de tout faire et dilue l'action derrière des graphiques peu engageants pour un nouvel utilisateur — et sans réintroduire le même problème en fusionnant deux usages qui n'ont pas de lien direct entre eux.

### Ce qui a été fait

**Décisions prises avec l'utilisateur avant implémentation** : navigation par **onglets sur une seule route `/dashboard`** (pas de routes séparées) — même pattern que `src/app/profile/page.tsx` (`Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`) ; la destination par défaut après connexion reste `/dashboard` (onglet "Overview" ouvert par défaut), aucun lien existant à changer.

1. **`src/app/dashboard/page.tsx`** — tout le contenu existant réparti tel quel dans 3 `TabsContent` contrôlés par un état `activeTab` : `overview` (cartes stats + `WeeklyProgressChart` + bannière d'accueil), `track` (`MealInput`/`AIAnalysisCard`/`SmartSuggestions`, inchangé), `plan` (nav de semaine + `WeeklyPlanner` + `GroceryListDialog`/`AddEditMealDialog`, déplacés depuis le bas de page). Aucun changement aux hooks/mutations existants — seul l'endroit où leur JSX est rendu a bougé. Les clés de cache TanStack Query (`['meal-summary']`, `['meal-plan', weekOffset]`, etc.) ne sont scopées à aucune route/onglet, donc le split n'a aucun impact sur le cache.
2. **`DashboardStatsSkeleton`/`ChartSkeleton`** (`src/components/skeletons.tsx`) — importés depuis longtemps mais **jamais rendus** (code mort découvert pendant l'exploration) ; maintenant réellement câblés (`!summary ? <Skeleton /> : <contenu réel />`), donc les cartes stats et le graphique ont enfin un état de chargement au lieu de s'afficher immédiatement avec des valeurs par défaut.
3. **`src/components/WeeklyProgressChart.tsx`** — root cause du problème "graphiques pas clairs" : le composant faisait `data ?? mockData`, donc affichait silencieusement **7 jours de fausses calories fabriquées** dès que `data` était `undefined`, et un graphique vide sans aucun message quand `data` était un vrai tableau à zéro. Le fallback `mockData` a été supprimé ; `data` est maintenant un prop requis, et un vrai état vide (icône + titre + description + bouton "Log a meal") s'affiche quand `data.every(d => d.calories === 0)`, avec un `onLogMealClick` qui bascule vers l'onglet Track.
4. **Bannière d'accueil rendue actionnable** — les 3 pastilles "1 Log meals / 2 Get AI insights / 3 Plan your week" (jusqu'ici décoratives) sont devenues de vrais boutons qui basculent vers l'onglet Track ou Plan — c'est ce qui rend "l'objectif visible en premier lieu" concret plutôt que décoratif.
5. **i18n** — ajout de `dashboard.tabOverview`/`tabTrack`/`tabPlan`/`chartEmptyTitle`/`chartEmptyDesc`/`chartEmptyCta` ; suppression des clés mortes `dashboard.tabAnalyze`/`tabPlanner` (jamais utilisées ailleurs — restes d'une itération de design par onglets jamais câblée) et `noAnalysis`/`noAnalysisDesc`/`loadingPlan` (jamais référencées dans `page.tsx`). Parité EN/FR vérifiée (`npx tsx scripts/check-translations.ts`, 460 clés).
6. **Vérifié dans un vrai navigateur** (pas seulement `tsc`/`eslint`/`vitest`, tous verts par ailleurs) : inscription → atterrissage sur l'onglet Overview avec le vrai état vide (0/2000 kcal, "No data yet" + CTA), clic sur chaque pastille de la bannière et sur le CTA du graphique → bascule vers le bon onglet à chaque fois, aucune erreur console.

---

## Backlog — Qualité d'extraction des imports (scraping)

> **Statut** : ✅ Implémentée (2026-07-20) pour Instagram/TikTok, approche IA choisie par l'utilisateur entre les deux pistes proposées. **Confirmée par des appels réels à l'API OpenAI**. Une régression signalée par l'utilisateur le jour même a été corrigée (voir ci-dessous). Gap distinct découvert pour YouTube — voir "Reste à faire" plus bas.

### Régression corrigée le jour même — `extractFromOpenGraph()` perdait le texte brut de la légende

**Signalé par l'utilisateur (2026-07-20)** : l'import était devenu strictement pire qu'avant l'ajout de l'IA — avant, toute la légende brute atterrissait dans le titre (moche mais récupérable, l'utilisateur voyait tout et pouvait trier à la main) ; après l'ajout de l'IA, certains imports (y compris sur Instagram) ne montraient plus rien d'exploitable du tout, avec le même message "Some details couldn't be detected".

**Cause** : `extractFromOpenGraph()` adoptait le titre renvoyé par l'IA dès qu'il était non vide, **même quand l'IA ne trouvait aucun ingrédient ni étape** (légendes en prose libre, sans format de liste clair). Le titre "propre" mais généré à vide remplaçait alors silencieusement le `og:title` brut — qui, pour Instagram/TikTok, contient souvent la légende complète et était le seul endroit où l'utilisateur pouvait encore voir/copier le texte de la recette.

**Correctif** : le titre structuré par l'IA n'est adopté que si elle a aussi trouvé au moins un ingrédient ou une étape. Si l'IA ne trouve aucune structure, le comportement retombe exactement sur l'ancien (titre brut conservé) — le pire cas n'est donc jamais pire qu'avant l'ajout de l'IA, seulement le cas "l'IA a réussi mais n'a rien trouvé" manquait cette même garantie que le cas "l'IA a échoué" avait déjà. 1 test de non-régression ajouté, plus un nouveau script de fumée contre l'API réelle avec une légende en prose libre confirmant que l'IA structure quand même correctement les cas réalistes.

### Reste à faire — le fetch YouTube reste incomplet (`og:description` tronqué)

**Signalé par l'utilisateur (2026-07-20)**, le jour même de l'implémentation ci-dessus : pour une URL YouTube, `extractFromOpenGraph()` utilise la balise `og:description` de la page — mais YouTube n'y met qu'un extrait tronqué de la description de la vidéo (les premières lignes), pas la description complète. Beaucoup de vidéos de recettes ont une intro avant la vraie section "INGRÉDIENTS"/"PRÉPARATION", qui se retrouve donc coupée avant même d'atteindre `structureRecipeCaption()` — l'IA reçoit un texte tronqué et ne peut structurer que ce qu'elle reçoit, elle n'y peut rien.

**Pistes à explorer** (aucune tranchée) :
- Scraper le JSON embarqué dans la page (`ytInitialData`, dans une balise `<script>`) pour en extraire la description complète — pas d'API key nécessaire, mais dépend d'un format interne non documenté par YouTube qui peut changer sans préavis (fragile, même risque que le scraping HTML classique mais moins stable dans le temps).
- Utiliser l'API officielle YouTube Data API v3 (`videos.list`, champ `snippet.description`) — beaucoup plus robuste et stable, mais nécessite une clé API Google Cloud à provisionner (nouvelle dépendance externe, quota à surveiller même si le quota gratuit est généreux).
- Dans tous les cas, une fois la description complète récupérée, elle doit passer par `structureRecipeCaption()` (déjà en place) exactement comme pour Instagram/TikTok — pas de nouveau prompt à écrire, juste une source de texte plus complète en entrée.

### Problème constaté

`extractFromOpenGraph()` dans `src/services/import-extractor.ts` (déclenché quand la page importée n'a pas de JSON-LD `@type: "Recipe"` — typiquement les posts Instagram/TikTok, dont la légende contient souvent titre + ingrédients + préparation dans un seul bloc de texte) mettait tout le contenu brut dans `title`/`description`, avec `ingredients: []` et `steps: []` (`isPartial: true`). Résultat pour l'utilisateur : un import où le titre contenait la recette entière au lieu d'un vrai titre, et les champs ingrédients/étapes vides à remplir à la main.

### Ce qui a été fait

1. **`structureRecipeCaption()`** (`src/services/ai.service.ts`) — nouvelle fonction, même pattern que `analyzeMeal`/`generateGroceryList` (appel `gpt-4o-mini`, `response_format: json_object`, schéma Zod `CaptionStructureResultSchema`). Prompt dédié qui demande d'ignorer hashtags/emojis décoratifs/appels à l'action ("follow for more"), de ne jamais inventer d'ingrédient/étape absent du texte, et de renvoyer des tableaux vides plutôt que de deviner quand la légende ne contient pas clairement de recette. Texte d'entrée tronqué à 2000 caractères (coût/latence bornés quel que soit le contenu du `og:description` scrapé).
2. **`extractFromOpenGraph()`** (`src/services/import-extractor.ts`) — devenue asynchrone ; appelle `structureRecipeCaption()` avec le `og:description` brut quand il existe, et n'utilise le titre structuré que s'il est non vide (sinon garde le `og:title` brut). **Dégradation gracieuse totale** : tout échec de l'appel IA (timeout, erreur réseau, JSON malformé) retombe exactement sur le comportement d'avant (titre = `og:title` brut, ingrédients/étapes vides, `isPartial: true`) — aucun import qui fonctionnait avant ne peut se mettre à échouer à cause de ce changement. N'est jamais appelée quand le JSON-LD `@type: "Recipe"` a déjà réussi (sites avec vraies données structurées) ni quand il n'y a pas de `og:description` à structurer.
3. **Pas de rate limit dédié ajouté** — le rate limit d'import existant (`checkRateLimit` dans `import.service.ts`, 10/heure par utilisateur, déjà appliqué sur l'endpoint d'extraction/preview) borne déjà mécaniquement le nombre de nouveaux appels IA par utilisateur, puisque chaque tentative d'extraction passe par ce garde-fou avant même d'atteindre `extractRecipeFromUrl()`.
4. **Tests** : 4 nouveaux tests dans `import-extractor.test.ts` (structuration réussie avec `isPartial: false`, repli gracieux si l'IA échoue, pas d'appel IA si le JSON-LD a déjà réussi, pas d'appel IA si pas de `og:description`) — mock de `@/services/ai.service` comme dans `meal-log.service.test.ts`/`planner.service.test.ts`. `structureRecipeCaption()` elle-même reste non testée unitairement (comme le reste d'`ai.service.ts`, appels OpenAI réels), validée à la place par le script de fumée.

---

## Backlog — Les imports doivent toujours passer par une revue (même pour un admin)

> **Statut** : ✅ Implémentée (2026-07-20), vérifiée dans un vrai navigateur.

### Problème constaté

`saveImport()` dans `src/services/import.service.ts` créait la recette importée directement avec `status: 'published'` et `publishedAt: new Date()` — aucune revue n'avait jamais lieu pour un import, quel que soit le rôle de l'utilisateur qui importe. Deuxième gap découvert en creusant : `reviewRecipe()` ne vérifiait que `canManagePublicationStatus(user)` (editor/admin), sans jamais vérifier que le reviewer diffère de l'auteur — un admin qui importe aurait donc pu s'auto-approuver même après avoir corrigé le premier point.

### Ce qui a été fait

1. **`saveImport()`** (`src/services/import.service.ts`) — `status: 'published'`/`publishedAt: new Date()` → `status: 'pending_review'`/`publishedAt: null`. Le `SavedRecipe` (ajout automatique à Cook Later) continue de fonctionner sans changement : `getRecipeById()` autorisait déjà l'auteur à voir sa propre recette non publiée, donc l'import reste visible dans le Cook Later de l'importeur en attendant la revue ; `listRecipes()` filtrait déjà `status: 'published'` pour les utilisateurs non-editor/admin, donc l'import n'apparaît plus sur `/recipes` tant qu'il n'est pas approuvé — aucun changement nécessaire à ces deux fonctions.
2. **`reviewRecipe()`** (`src/services/recipes.service.ts`) — ajout de `recipe.authorId === user.sub → ForbiddenError`. **Portée choisie par l'utilisateur : s'applique à toute recette, pas seulement aux imports** (cohérence — un editor qui crée une recette à la main ne peut pas non plus s'auto-publier). La vérification vit au point de revue (une seule ligne), pas au point de création, donc elle s'applique automatiquement peu importe comment la recette a été créée. Vérifié aujourd'hui même que ce n'est pas un problème pratique immédiat : 2 admins + 5 editors existent, la revue croisée est possible sans blocage — le cas limite "un seul reviewer" reste documenté comme limitation acceptée, pas traité par un garde-fou spécial.
3. **UX** — nouveau badge de statut sur `CookLaterList.tsx` (réutilise le même style que `RecipeCard.tsx`, extrait dans `src/lib/recipe-status.ts` pour éviter la duplication) : un import en attente de revue affiche maintenant "Pending Review" directement dans la liste Cook Later. Le toast de succès de `ImportRecipeDialog.tsx` (clé `import.saved`) indique maintenant explicitement l'attente de revue plutôt que de laisser croire à une publication immédiate.
4. **Tests** : 2 nouveaux tests sur `reviewRecipe()` (auto-révision refusée pour un editor, et pour un admin sur son propre import), 1 nouveau test sur `saveImport()` (statut `pending_review` par défaut), 2 nouveaux tests sur `CookLaterList` (badge affiché/masqué). **Vérifié dans un vrai navigateur** : import → toast "en attente de revue" → badge "Pending Review" visible dans Cook Later → recette absente de la liste publique `/recipes`, tsc/eslint/vitest (434 tests)/build de prod tous verts.

---

## Backlog — Scan photo d'un repas (AI Coach)

> **Statut** : ✅ v1 implémentée (2026-07-17), **confirmée par un appel réel à l'API OpenAI** (script de fumée exécutant `analyzeMealPhoto()` avec une vraie clé API — réponse JSON valide reçue et conforme au schéma Zod). Éphémère par choix explicite de l'utilisateur : la photo n'est jamais persistée (ni R2 ni DB), seule l'analyse textuelle l'est.

### Ce qui a été fait

1. **`analyzeMealPhoto()`** (`src/services/ai.service.ts`) — appelle `gpt-4o-mini` avec un message multi-part (`{ type: 'text' }` + `{ type: 'image_url', image_url: { url: <data URL base64> } }`), prompt dédié (`buildPhotoSystemPrompt`) qui demande explicitement d'identifier les aliments visibles et d'estimer les portions à partir de l'image. Le schéma de sortie `MealPhotoAnalysisResultSchema` étend `MealAnalysisResultSchema` avec un champ `mealDescription` (résumé en une phrase généré par l'IA à partir de la photo) — utilisé comme `MealLog.mealText` puisque l'utilisateur n'a rien tapé.
2. **Éphémère, pas de dépendance R2** — l'image est encodée en base64 côté client (`FileReader.readAsDataURL`) et envoyée directement dans le corps JSON de la requête ; jamais écrite sur disque ni uploadée nulle part. Option v2 (persister via R2 + `MealLog.photoUrl`) laissée de côté par choix explicite de l'utilisateur, pas un blocage technique.
3. **Validation MIME/taille — whitelist différente de celle des uploads R2** : `image/jpeg`, `image/png`, `image/webp`, 2MB max. **Important** : ce n'est PAS la même whitelist que `src/lib/validations/upload.ts` (jpeg/avif/webp) — OpenAI Vision n'accepte pas l'AVIF, donc réutiliser la whitelist R2 aurait cassé le scan pour toute photo AVIF. Validée côté client (`useMealLog.ts`) et re-validée côté serveur après décodage base64 (`parseImageDataUrl()` dans `meal-log.service.ts` — vérifie le MIME déclaré dans le data URL et la taille réelle des octets décodés, pas seulement la taille de la chaîne base64, avant de dépenser un appel OpenAI).
4. **Rate limiting** : réutilise `checkAnalysisRateLimit` (20/jour, partagé avec l'analyse texte) — pas de quota séparé pour l'instant, à revisiter si le coût par requête vision s'avère significativement plus élevé en pratique.
5. **Timeout** : réutilise `createChatCompletion()` et son timeout de 25s, sans changement — pas de lenteur particulière constatée lors du test de fumée.
6. **UI** : bouton "Scanner une photo" dans `MealInput.tsx` à côté du bouton "Analyser avec l'IA", `<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment">` pour l'accès caméra mobile natif. Validation MIME/taille immédiate côté composant (toast d'erreur) avant même d'appeler le hook.
7. **API** : nouvel endpoint dédié `POST /api/v1/meal-logs/scan` (plutôt qu'étendre `POST /api/v1/meal-logs`) — évite un corps de requête polymorphe (texte vs photo) avec des champs conditionnellement requis sur la même route.
8. **Tests** : `createMealLogFromPhoto` (4 tests : succès, data URL malformée, MIME refusé, taille dépassée) dans `meal-log.service.test.ts` ; `scanMealPhotoSchema` (5 tests) dans `validations/__tests__/meal-log.test.ts`. `ai.service.ts` reste non testé unitairement (comme le reste du fichier, appels OpenAI réels) — validé à la place par le script de fumée en conditions réelles.

### Reste à faire — le scan photo n'alimente pas le bloc texte "Qu'avez-vous mangé aujourd'hui ?"

**Demandé par l'utilisateur (2026-07-20)** : après un scan photo, la description générée par l'IA (`mealDescription`, déjà stockée comme `MealLog.mealText` — voir point 1 ci-dessus) n'est actuellement affichée que dans `AIAnalysisCard`/`SmartSuggestions`, jamais réinjectée dans le textarea de `MealInput.tsx` (`mealText`/`t('mealInput.whatDidYouEat')`). Résultat : ce bloc ne reflète pas ce qui a été mangé quand l'entrée se fait par photo, alors qu'il fonctionne comme un journal en texte libre pour la saisie manuelle.

**Comportement voulu** : que ce soit une saisie texte ou un scan photo, le contenu doit finir par apparaître dans le bloc texte — après un scan réussi, ajouter la description reconnue (`mealDescription`) à la suite du texte déjà présent dans le textarea (pas un remplacement, pour permettre plusieurs scans/saisies dans la même session), de la même manière que le "Quick Add" (`MealInput.tsx`) ajoute déjà un élément au texte existant plutôt que de l'écraser.

**Piste technique** : dans `src/app/dashboard/page.tsx`, `handleScanPhoto`'s `onSuccess` reçoit déjà `data` (le `MealLogDTO` complet, avec `data.mealText`) — il suffit de faire remonter ce texte à `MealInput` (ex: nouveau prop `onPhotoDescriptionAdded?: (text: string) => void` appelé après un scan réussi, que `MealInput` utilise pour faire `setMealText((prev) => prev ? \`${prev}, ${text}\` : text)`, même logique que `handleQuickAdd`).

---

## Backlog — Carrousel de recettes mises en avant sous le hero (page d'accueil)

> **Statut** : ✅ Implémentée (2026-07-20), vérifiée dans un vrai navigateur après correction d'un bug de câblage découvert pendant la vérification.

### Ce qui a été fait

1. **Schéma** — `Recipe.featured Boolean @default(false)` + `Recipe.featuredOrder Int?` (migration `20260720184601_recipe_featured`, appliquée via `prisma migrate deploy`), exactement le champ proposé à l'origine.
2. **`setRecipeFeatured()`** (`src/services/recipes.service.ts`) — réservé editor/admin (`canManagePublicationStatus`), plafond de 8 recettes en vedette simultanément (`MAX_FEATURED_RECIPES`), ordre attribué automatiquement en fin de liste à la mise en vedette (pas de réordonnancement manuel dans cette v1 — retirer puis remettre en vedette pour déplacer un élément en fin de liste). Nouvelle route `PATCH /api/v1/recipes/[id]/featured`, même pattern que `/status`.
3. **`listRecipes()`** — nouveau filtre `featured?: boolean` (même pattern que `aiRecommended`), tri par `featuredOrder: 'asc'` quand `featured: true` est demandé (au lieu de `createdAt: 'desc'`) pour respecter l'ordre éditorial choisi.
4. **UI admin** — toggle `Switch` dans `src/app/dashboard/recipes/manage/page.tsx` (nouvelle colonne "Featured" dans le tableau).
5. **Carrousel** — `src/components/FeaturedRecipesCarousel.tsx`, sous la section Hero de `src/app/page.tsx`. Utilise `src/components/ui/carousel.tsx` (primitive shadcn/embla-carousel-react déjà présente dans les dépendances mais jamais utilisée jusqu'ici) et réutilise `RecipeCard` tel quel pour chaque slide. Ne rend rien pendant le chargement ni s'il n'y a aucune recette en vedette (pas de section vide/cassée sur la page d'accueil).
6. **Bug trouvé et corrigé pendant la vérification manuelle** : la route `GET /api/v1/recipes/route.ts` ne lisait jamais le paramètre `?featured=` de la query string — le filtre était bien implémenté dans `listRecipes()` et le hook client, mais jamais réellement transmis depuis la route elle-même. Résultat en test manuel : le carrousel affichait les mêmes recettes par défaut (les plus anciennes) peu importe ce qui était réellement marqué "en vedette" en base. Diagnostic initial erroné (redémarrage du serveur dev demandé en pensant à un client Prisma périmé, comme l'incident `mealTypes` du 17/07) — le vrai correctif était de faire lire `searchParams.get('featured')` dans la route, exactement comme `aiRecommended`. 1 test dédié ajouté sur cette route pour éviter que ce trou de câblage se reproduise silencieusement.
7. **Tests** : 8 tests `setRecipeFeatured`/filtre `listRecipes`, 5 tests route `/featured`, 1 test route `/recipes` (paramètre `featured`), 4 tests composant `FeaturedRecipesCarousel`. Polyfills `matchMedia`/`IntersectionObserver` ajoutés à `vitest.setup.ts` (embla-carousel-react en a besoin, absents de jsdom). **Vérifié dans un vrai navigateur** : 3 recettes marquées en vedette directement en base apparaissent dans le bon ordre sur la page d'accueil, avec flèches précédent/suivant fonctionnelles ; suite complète (453 tests)/tsc/eslint/build de prod tous verts.

### Objectif d'origine (pour référence)

Sur `src/app/page.tsx`, juste sous la section Hero, ajouter un slider/carrousel affichant quelques éléments (recettes) choisis manuellement par un admin — pas une sélection automatique (ex: `aiRecommended`, plus récent, plus populaire), mais une mise en avant éditoriale contrôlée.

---

## Backlog — Paiement (Stripe)

> **Statut** : idée produit, non planifiée en détail, pas commencée. Demandée par l'utilisateur (2026-07-20) — **explicitement positionnée après tous les autres points de ce backlog**, à traiter en dernier.

### Objectif

Ajouter un moyen de paiement via Stripe. Aucune notion de plan payant/premium/abonnement n'existe aujourd'hui dans le produit (`prisma/schema.prisma` n'a ni `stripeCustomerId`, ni statut d'abonnement, ni distinction de fonctionnalités par palier) — ce point part donc de zéro, contrairement aux autres backlogs ci-dessus qui étendent de l'existant.

### À décider avant tout travail technique

1. **Quel est le modèle payant ?** — Abonnement récurrent (mensuel/annuel) type SaaS, achat unique, ou quota consommable (ex: au-delà de N analyses IA/imports gratuits par mois) ? Détermine complètement l'architecture Stripe à utiliser (Billing/Subscriptions vs Checkout ponctuel).
2. **Qu'est-ce qui devient payant ?** — Candidats visibles dans le code actuel : le quota de 20 analyses IA/jour (`checkAnalysisRateLimit`), le nombre d'imports de recettes, l'accès à SafariTaste, ou une fonctionnalité pas encore prévue.
3. **Impact RBAC** — un rôle/statut "payant" s'ajoute-t-il à `user`/`editor`/`admin` (`src/lib/rbac.ts`), ou reste-t-il orthogonal (ex: `User.subscriptionStatus` indépendant du rôle) ?

### Approche technique à explorer (une fois les décisions ci-dessus prises)

1. **Schéma** — a minima `User.stripeCustomerId String? @unique`, plus soit `User.subscriptionStatus`/`currentPeriodEnd` (abonnement), soit une table `Purchase`/`Entitlement` séparée (achat unique/quota) — migration Prisma classique, même mécanique que `Recipe.mealTypes` (2026-07-17).
2. **Webhooks Stripe** — nouvel endpoint `POST /api/v1/webhooks/stripe`, vérification de signature (`stripe.webhooks.constructEvent`), à exclure de l'auth JWT standard (comme les crons avec `CRON_SECRET`, mais avec le secret de signature Stripe à la place).
3. **Checkout/Billing Portal** — Stripe Checkout hébergé (pas de formulaire carte custom à construire/sécuriser soi-même) ; Billing Portal pour la gestion self-service (annulation, changement de moyen de paiement).
4. **Variables d'environnement** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` à ajouter à `.env.example`/`docs/DEPLOYMENT.md`, dans le même esprit que les credentials R2/OpenAI déjà documentés.
5. **Sécurité** — ne jamais faire confiance au client pour l'état d'abonnement (toujours revalider côté serveur via `stripeCustomerId` → statut réel avant de gater une fonctionnalité), et la CSP (`connect-src` dans `next.config.ts`) devra probablement s'ouvrir à Stripe.js si un élément Stripe custom (pas juste une redirection Checkout) est utilisé côté client — piège similaire à celui rencontré avec Sentry (2026-07-16).

---

## Plan d'exécution suggéré

1. ~~**Sprint doc-cleanup** (P0-1, P1-5, P2-11)~~ — ✅ Fait (2026-07-15/16) : les 6 docs (`ARCHITECTURE.md`, `PLAN.md`, `SETUP.md`, `DEPLOYMENT.md`, `USER_GUIDE.md`, `SECURITY.md`) corrigés.
2. ~~**Sprint hardening CI/deps** (P0-2, P0-4)~~ — ✅ Fait (2026-07-15) : Next/jspdf/prisma épinglés et mis à jour (CVE corrigées), `engines`/`packageManager` ajoutés, gate `pnpm audit --prod --audit-level=high` actif en CI.
3. ~~**P0-3** (timeout OpenAI)~~ — ✅ Fait (2026-07-15).
4. ~~**Sprint tests critiques** (P1-6, toutes priorités)~~ — ✅ Fait (2026-07-16 → 2026-07-20) : RBAC/auth, les 28 routes API, les composants React à logique métier, et 3 parcours E2E Playwright critiques. Voir section 6 ci-dessus pour le détail complet.
5. ~~**Sprint observabilité** (P1-7)~~ — ✅ Fait (2026-07-16) : Sentry installé app-wide.
6. Le reste (P2-8, P2-9, P3, + les gaps réels découverts en P1-5 : complexité mot de passe, caps taille/redirect import) peut être traité au fil de l'eau selon la charge produit réelle.
7. **Stockage R2** (voir backlog dédié ci-dessus) — à prioriser quand le besoin d'upload d'images se confirme ; résout aussi P2-10 en même temps.

---

## Historique

Ce fichier remplace un précédent audit rédigé avant la migration vers Next.js (contexte Figma Make, Vite, contextes React en mémoire). Pour l'historique détaillé des fonctionnalités livrées milestone par milestone, voir [`ROADMAP.md`](./ROADMAP.md).
