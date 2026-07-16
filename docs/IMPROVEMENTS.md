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

### 6. Couverture de tests concentrée sur un tiers du code — 🟡 Partiellement résolu (2026-07-16)
15 fichiers de tests, tous en unitaire sur `src/lib/**` et `src/services/**`. `vitest.config.ts` limitait explicitement `coverage.include` à ces deux dossiers, avec **0 test** sur `src/lib/rbac.ts`, `src/services/user.service.ts`, et les 26 routes API — alors que RBAC/admin est la surface la plus sensible du projet.

**Fait** :
- `coverage.include` étendu à `src/app/api/v1/**`.
- `src/lib/__tests__/rbac.test.ts` (nouveau, 10 tests, 100% de couverture sur `rbac.ts`, précédemment 0%) — couvre `requireRole`, `canEditRecipe`, `canManagePublicationStatus`, `canManageUsers`.
- `src/services/__tests__/user.service.test.ts` (nouveau, 7 tests, précédemment 0% de couverture) — couvre `changeUserRole` (auto-démotion bloquée, rôle invalide rejeté, utilisateur introuvable) et `getProfile`/`listUsers`.
- Tests d'intégration au niveau route (mock du service + `getCurrentUser`, appel direct du handler exporté avec un `NextRequest` construit) pour `auth/login`, `auth/refresh`, `auth/logout` (succès, 401, 400, 429 rate-limit) et `admin/users/[id]/role` (401 non-authentifié, 403 non-admin, 200 admin, 400 rôle invalide) — 15 tests au total sur 4 routes.
- Suite complète : 163 → **195 tests**, tous verts (`tsc --noEmit`, `eslint`, `vitest run` vérifiés).

**Reste à faire** :
- Tests d'intégration sur le reste des 26 routes (recipes CRUD, cook-later, imports, meal-logs, planner) — seules les 4 routes auth/RBAC les plus sensibles ont été couvertes dans cette passe.
- **0 test de composant** React (`src/components/**`, 60+ fichiers) — toujours pas traité.
- **0 test E2E** — Playwright toujours documenté dans `TESTING.md` comme stack cible mais jamais installé. Si budget dispo : 2-3 parcours critiques (login, log meal + analyse IA, import de recette).
**Effort** : M à L selon l'ambition.

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

---

## P3 — Amélioration produit / scaling (non bloquant)

| Sujet | Constat | Action suggérée |
|---|---|---|
| Stockage d'images custom | Décidé — voir [Backlog: Stockage d'objets (Cloudflare R2)](#backlog--stockage-dobjets-cloudflare-r2) ci-dessous. | Credentials déjà provisionnés dans `.env`/`.env.example`, implémentation à planifier. |
| Pluralisation i18n | 480 clés statiques EN/FR, pas de moteur ICU (pluriels, genre). | Pas urgent à 2 langues ; à revisiter si une 3e langue ou des formats pluriels complexes arrivent. |
| Monitoring uptime | `docs/DEPLOYMENT.md` recommande UptimeRobot/Better Stack — non configuré. | Simple à ajouter, faible effort, bon rapport valeur/coût avant un lancement public. |

---

## Backlog — Stockage d'objets (Cloudflare R2)

> **Statut** : 🟡 v1 implémentée (2026-07-16) — upload d'images de recettes fonctionnel. Reste : avatar UI, migration import, nettoyage objets orphelins (voir détail ci-dessous).

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
   - Type MIME whitelisté (`image/jpeg`, `image/png`, `image/webp`) pour les images ; whitelist distincte si documents génériques un jour.
   - Taille max (ex: 5MB images) — à valider côté client ET revalider une fois l'objet uploadé (ex: `HEAD` sur l'objet R2 après upload, rejeter/supprimer si hors limite).
   - Auth + RBAC : seul le propriétaire de la recette (ou editor/admin, cf. `src/lib/rbac.ts`) peut obtenir une URL d'upload pour cette recette.
   - Rate limiting réutilisant `src/lib/rate-limit.ts` (même mécanisme DB-based que imports/AI), ex. 20 uploads/heure/utilisateur.
5. **Accès public vs privé** — bucket en lecture publique (ou domaine custom Cloudflare) pour les images de recettes (déjà du contenu public une fois la recette publiée) ; si des documents privés arrivent un jour (ex. export PDF partagé avec expiration), utiliser des URLs signées en lecture (GET presigned) plutôt qu'un bucket public.
6. **`next.config.ts`** — ajouter le domaine R2 public (ou domaine custom) à `images.remotePatterns` une fois le bucket configuré.
7. **Schéma Prisma** — pas de migration obligatoire pour la v1 (les champs `imageUrl`/`avatarUrl` existants acceptent déjà n'importe quelle URL). À envisager plus tard si le nettoyage des objets orphelins (recette supprimée mais image jamais effacée de R2) devient un problème : soit un job de nettoyage périodique (cron Vercel, comme `cleanup-rate-limits`), soit une table `Asset` dédiée trackant chaque objet et son propriétaire.

### Découpage — état d'avancement

1. ~~`src/lib/storage.ts` (client R2 + presign)~~ — ✅ Fait.
2. ~~`POST /api/v1/uploads/presign` + validations + rate limiting~~ — ✅ Fait (whitelist MIME, RBAC via `canEditRecipe`/`requireRole`, 30 uploads/heure/utilisateur, 9 tests). Taille max (5MB) validée côté client uniquement pour l'instant (pas de revalidation serveur après upload — voir point 4 ci-dessous).
3. ~~UI d'upload sur `RecipeForm.tsx`~~ — ✅ Fait (bouton upload + preview + remplacer/retirer). **Reste** : UI d'avatar sur la page profil — le backend/hook (`purpose: 'avatar'`) le supporte déjà, mais `RecipeForm.tsx` est le seul consommateur pour l'instant.
4. Migration progressive de l'extraction d'import (`src/services/import-extractor.ts`) pour re-héberger l'image scrapée vers R2 au lieu de stocker l'URL source telle quelle — **pas fait**.
5. ~~`next.config.ts` whitelist~~ — ✅ Fait (domaine `pub-53d4a03402a24c5b8c1a6db7c1d0b56b.r2.dev`, le domaine r2.dev par défaut — le domaine du projet est géré par Hostinger, pas Cloudflare, donc pas de domaine custom pour l'instant). Nettoyage des anciens domaines externes une fois la migration import faite (point 4) — **pas fait**.
6. **UX** : `RecipeCard.tsx`, `CookLaterList.tsx`, `src/app/page.tsx` et `src/app/recipes/[id]/page.tsx` affichent toujours `ImageWithFallback` même quand `recipe.imageUrl` est `null` — **pas encore corrigé**, à faire avec la migration import (point 4).
7. **Nouveau, découvert à l'implémentation** : pas de job de nettoyage pour `recipes/pending/{userId}-{uuid}.ext` — si un utilisateur uploade une image puis abandonne la création de la recette (ne soumet jamais le formulaire), l'objet reste orphelin dans R2 indéfiniment. À traiter avec le nettoyage d'objets orphelins déjà noté au point "Schéma Prisma" ci-dessus (cron périodique ou table `Asset`).
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

## Backlog — Scan photo d'un repas (AI Coach)

> **Statut** : idée produit, non planifiée en détail, pas commencée. Demandée par l'utilisateur (2026-07-16).

### Objectif

Permettre de logger un repas en prenant/uploadant une photo au lieu de (ou en plus de) taper une description texte dans `MealInput.tsx`. L'IA identifie les aliments visibles sur la photo et produit la même analyse structurée (nutriments, équilibre, suggestions) que le flux texte actuel.

### Approche technique proposée

1. **Pas de nouveau modèle IA nécessaire** — `gpt-4o-mini` (déjà utilisé dans `src/services/ai.service.ts`) accepte des entrées image via le content-block `image_url` de l'API Chat Completions d'OpenAI. Nouvelle fonction `analyzeMealPhoto(imageBase64, mealType, ctx)` réutilisant `MealAnalysisResultSchema` (même schéma Zod de sortie que `analyzeMeal`), avec un prompt adapté ("identifie les aliments visibles, estime les portions...").
2. **v1 sans dépendance à R2** — envoyer l'image en base64 directement dans la requête à OpenAI, sans la persister nulle part (l'analyse textuelle résultante est sauvegardée dans `MealLog` comme aujourd'hui, pas la photo elle-même). Évite de bloquer cette fonctionnalité sur le chantier R2.
   - **v2 (après R2)** : uploader la photo vers R2 (réutiliser le flux presigned upload du backlog R2 ci-dessus) et stocker son URL sur `MealLog` pour que l'utilisateur puisse revoir la photo de son repas dans son historique — nécessiterait une migration Prisma (`MealLog.photoUrl`).
3. **Validation** : type MIME image whitelisté (`image/jpeg`, `image/png`, `image/webp`), taille max (ex: 5MB) avant envoi à OpenAI — les modèles vision ont aussi des limites de taille/résolution côté API à respecter.
4. **Rate limiting** : les appels vision sont généralement plus lents/coûteux que le texte seul — réutiliser `checkAnalysisRateLimit` (20/jour) ou évaluer un quota séparé si le coût par requête s'avère significativement plus élevé.
5. **Timeout** : réutiliser le wrapper `createChatCompletion()` (`src/services/ai.service.ts`) et son timeout de 25s — à revalider empiriquement, les appels vision peuvent être plus lents que les complétions texte pures et nécessiter un timeout dédié plus généreux.
6. **UI** : bouton "Scanner une photo" dans `MealInput.tsx` à côté du textarea, `<input type="file" accept="image/*" capture="environment">` pour l'accès caméra mobile natif.
7. **API** : soit étendre `POST /api/v1/meal-logs` pour accepter un champ image optionnel (JSON base64 ou multipart), soit un nouvel endpoint dédié `POST /api/v1/meal-logs/scan` — à trancher à l'implémentation selon la complexité de validation souhaitée.

---

## Plan d'exécution suggéré

1. ~~**Sprint doc-cleanup** (P0-1, P1-5, P2-11)~~ — ✅ Fait (2026-07-15/16) : les 6 docs (`ARCHITECTURE.md`, `PLAN.md`, `SETUP.md`, `DEPLOYMENT.md`, `USER_GUIDE.md`, `SECURITY.md`) corrigés.
2. ~~**Sprint hardening CI/deps** (P0-2, P0-4)~~ — ✅ Fait (2026-07-15) : Next/jspdf/prisma épinglés et mis à jour (CVE corrigées), `engines`/`packageManager` ajoutés, gate `pnpm audit --prod --audit-level=high` actif en CI.
3. ~~**P0-3** (timeout OpenAI)~~ — ✅ Fait (2026-07-15).
4. ~~**Sprint tests critiques** (P1-6, priorité 1-2)~~ — 🟡 Fait pour le cœur RBAC/auth (2026-07-16) : `rbac.ts` et `user.service.ts` testés (0% → 100%/65-100%), 4 routes auth/RBAC couvertes. Reste les autres routes (recipes/imports/planner/meal-logs) et Playwright (priorité 3).
5. ~~**Sprint observabilité** (P1-7)~~ — ✅ Fait (2026-07-16) : Sentry installé app-wide.
6. Le reste (P2-8, P2-9, P3, + les gaps réels découverts en P1-5 : complexité mot de passe, caps taille/redirect import) peut être traité au fil de l'eau selon la charge produit réelle.
7. **Stockage R2** (voir backlog dédié ci-dessus) — à prioriser quand le besoin d'upload d'images se confirme ; résout aussi P2-10 en même temps.

---

## Historique

Ce fichier remplace un précédent audit rédigé avant la migration vers Next.js (contexte Figma Make, Vite, contextes React en mémoire). Pour l'historique détaillé des fonctionnalités livrées milestone par milestone, voir [`ROADMAP.md`](./ROADMAP.md).
