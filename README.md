<div align="center">

# 🥗 SmartPlate

**Coach nutritionnel IA, découverte de recettes et planification de repas — en un seul monolithe Next.js.**

[![CI](https://github.com/angaboli/SmartPlate/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/angaboli/SmartPlate/actions/workflows/ci.yml)
![Statut](https://img.shields.io/badge/statut-priv%C3%A9-lightgrey)
![License](https://img.shields.io/badge/license-propri%C3%A9taire-lightgrey)

</div>

---

## Stack technique

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?logo=tailwindcss&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-primitives-161618?logo=radixui&logoColor=white)

![Prisma](https://img.shields.io/badge/Prisma-7.3-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.90-FF4154?logo=reactquery&logoColor=white)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2.11-764ABC?logo=redux&logoColor=white)

![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT_(jose)-000000?logo=jsonwebtokens&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-9-4B32C3?logo=eslint&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm&logoColor=white)

![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)
![i18n](https://img.shields.io/badge/i18n-EN%20%2F%20FR-blueviolet)

</div>

---

## Sommaire

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Scripts disponibles](#scripts-disponibles)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Documentation](#documentation)

---

## Aperçu

SmartPlate est une application FoodTech/Nutrition IA bilingue (EN/FR) construite comme **un seul projet Next.js** — pages (SSR/CSR) et API REST (`/api/v1/*`) dans la même application, avec une couche de services TypeScript pure entre les deux. Pas de backend séparé, pas de file de jobs externe : tout tourne dans le runtime Next.js, y compris les appels au LLM.

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🧠 **AI Food Coach** | Analyse de repas (texte libre → nutriments, équilibre, suggestions) via GPT-4o-mini |
| 🍽️ **Recettes** | Catalogue avec filtres, badges "AI Recommended", recherche bilingue EN/FR |
| 📥 **Import de recettes** | Import depuis un lien (Instagram/TikTok/YouTube/web) via extraction JSON-LD / Open Graph |
| 📅 **Planificateur hebdomadaire** | Génération de plan de repas par IA, édition manuelle, liste de courses agrégée par catégorie |
| 🔖 **Cook Later** | Sauvegarde de recettes persistante par utilisateur |
| 🛡️ **RBAC + publication** | Rôles `user` / `editor` / `admin`, workflow `draft → pending_review → published` |
| 🌐 **i18n EN/FR** | 480 clés synchronisées, détection navigateur, persistance localStorage |
| 🌓 **Thème clair/sombre** | Basé sur la préférence système par défaut |

## Architecture

```
Client (Next.js App Router, SSR + CSR)
        │  HTTPS / REST JSON + JWT
        v
┌────────────────────────────────────────┐
│         Application Next.js             │
│                                          │
│  Pages (SSR/CSR)   API Routes /api/v1/* │
│         │                  │            │
│         └────────┬─────────┘            │
│           Service layer (src/services)  │
│                   │                     │
│              Prisma Client              │
└───────────────────┼──────────────────────┘
                     v
              PostgreSQL (Neon)
```

- Les routes API sont des **Next.js Route Handlers** standards, appelables par n'importe quel client (web, mobile, curl).
- La couche `src/services/` contient toute la logique métier en fonctions TypeScript pures, sans dépendance framework — testable isolément et portable si un backend séparé devient nécessaire un jour.
- Les appels au LLM (OpenAI) sont **synchrones**, exécutés directement dans les services au moment de la requête — il n'y a pas de file d'attente (Redis/BullMQ) ni de workers séparés dans le code actuel.
- L'authentification/protection de routes se fait via `src/proxy.ts` (convention Next.js 16, qui remplace `middleware.ts`).

Détails complets : [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) (à lire avec [`docs/IMPROVEMENTS.md`](./docs/IMPROVEMENTS.md), qui liste les écarts entre ce document et le code réel).

## Démarrage rapide

### Prérequis

| Outil | Version |
|---|---|
| Node.js | 22+ |
| pnpm | 9+ |
| PostgreSQL | Neon (cloud) ou instance locale 15+ |
| Clé API OpenAI | requise pour l'AI Coach / Planner |

### Installation

```bash
git clone git@github.com:angaboli/SmartPlate.git
cd SmartPlate
pnpm install
cp .env.example .env   # renseigner DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, OPENAI_API_KEY
pnpm prisma migrate dev
pnpm db:seed
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Vérifier l'API : `GET /api/v1/health`.

### Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `JWT_SECRET` | Secret de signature du token d'accès (32+ caractères) |
| `JWT_REFRESH_SECRET` | Secret de signature du refresh token (32+ caractères) |
| `OPENAI_API_KEY` | Clé API OpenAI (analyse de repas, planner) |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app |

## Scripts disponibles

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build de production |
| `pnpm start` | Démarrer le build de production |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `pnpm test` | Tests unitaires (Vitest) |
| `pnpm test:watch` | Tests en mode watch |
| `pnpm test:coverage` | Rapport de couverture |
| `pnpm db:seed` | Peupler la base avec les données de démo |
| `pnpm db:migrate` | Créer/appliquer une migration Prisma |
| `pnpm db:studio` | Prisma Studio (explorateur de DB) |

## Structure du projet

```
src/
├── app/                    # Next.js App Router (pages + API /api/v1/*)
├── components/             # Composants React (ui/ = primitives Radix/shadcn)
├── contexts/                # Contextes React (langue, cook later)
├── hooks/                  # Hooks de data-fetching (TanStack Query)
├── lib/                    # DB, auth, RBAC, erreurs, rate-limit, validations Zod
├── services/               # Logique métier (fonctions TypeScript pures)
├── store/                  # Redux Toolkit (auth, langue, cook later)
├── locales/                # Traductions en.json / fr.json
├── styles/                 # Tailwind, thème, fonts
└── proxy.ts                # Middleware Next.js 16 (auth, redirections)
prisma/
├── schema.prisma           # Modèle de données (11 modèles)
└── seed.ts
```

## Tests

```bash
pnpm test              # Vitest — tests unitaires (src/lib/**, src/services/**)
pnpm test:coverage     # Couverture (v8)
```

La couverture actuelle porte uniquement sur `src/lib/` et `src/services/` — voir [`docs/IMPROVEMENTS.md`](./docs/IMPROVEMENTS.md#6-couverture-de-tests-concentrée-sur-un-tiers-du-code) pour l'état des tests d'intégration API et E2E.

## Déploiement

Application déployée comme **un seul déploiement Vercel** (pages + API routes). Un cron Vercel (`vercel.json`) nettoie quotidiennement la table de rate-limiting (`/api/v1/cron/cleanup-rate-limits`).

```bash
pnpm build
pnpm prisma migrate deploy   # avant chaque déploiement
```

Détails : [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Documentation

| Document | Contenu |
|---|---|
| [`docs/IMPROVEMENTS.md`](./docs/IMPROVEMENTS.md) | Plan technique d'amélioration — écarts code/doc, priorités, actions |
| [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) | Guide utilisateur des fonctionnalités |
| [`docs/ATTRIBUTIONS.md`](./docs/ATTRIBUTIONS.md) | Crédits et licences des ressources tierces |
| [`docs/PLAN.md`](./docs/PLAN.md) | Plan produit et décisions clés |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Architecture système et flux de données |
| [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) | Schéma de données Prisma |
| [`docs/API_CONTRACT.md`](./docs/API_CONTRACT.md) | Spécification des endpoints REST |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | Modèle de menace et politique de sécurité |
| [`docs/TESTING.md`](./docs/TESTING.md) | Stratégie de tests |
| [`docs/I18N.md`](./docs/I18N.md) | Internationalisation |
| [`docs/CODING_STANDARDS.md`](./docs/CODING_STANDARDS.md) | Conventions de code |
| [`docs/SETUP.md`](./docs/SETUP.md) | Guide d'installation détaillé |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Guide de déploiement |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Historique des milestones (M0 → M9) |
| [`docs/ADR/`](./docs/ADR/) | Décisions d'architecture (Next.js vs Vite, REST vs tRPC, Prisma, monolithe unifié) |
