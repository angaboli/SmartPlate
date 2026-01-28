# SmartPlate — Data Model

> **Version**: 1.0
> **Last updated**: 2026-01-28
> **ORM**: Prisma
> **Database**: PostgreSQL (Neon)

---

## Entity Relationship Overview

```
User ──────┬── UserSettings      (1:1)
           ├── RefreshToken      (1:N)
           ├── Recipe            (1:N, as author)
           ├── SavedRecipe       (1:N, join to Recipe)
           ├── Import            (1:N)
           ├── MealLog           (1:N)
           └── PlannerWeek       (1:N)
                   └── PlannerItem   (1:N)

Recipe ────┬── RecipeIngredient   (1:N)
           ├── RecipeStep         (1:N)
           └── SavedRecipe        (1:N)
```

---

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── USERS ───────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  settings      UserSettings?
  refreshTokens RefreshToken[]
  recipes       Recipe[]
  savedRecipes  SavedRecipe[]
  mealLogs      MealLog[]
  plannerWeeks  PlannerWeek[]
  imports       Import[]
}

model UserSettings {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  language        String   @default("en")
  goal            String   @default("maintain")
  age             Int?
  weightKg        Float?
  heightCm        Float?
  activityLevel   String?
  calorieTarget   Int      @default(2000)
  proteinTargetG  Int      @default(60)

  vegetarian      Boolean  @default(false)
  vegan           Boolean  @default(false)
  glutenFree      Boolean  @default(false)
  dairyFree       Boolean  @default(false)
  allergies       String[] @default([])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

// ─── RECIPES ─────────────────────────────────────────

model Recipe {
  id             String   @id @default(cuid())
  authorId       String?
  author         User?    @relation(fields: [authorId], references: [id], onDelete: SetNull)

  title          String
  description    String?
  imageUrl       String?
  prepTimeMin    Int?
  cookTimeMin    Int?
  servings       Int?
  calories       Int?
  category       String   @default("Regular")
  goal           String?
  aiRecommended  Boolean  @default(false)
  isImported     Boolean  @default(false)
  sourceUrl      String?
  sourceProvider String?

  ingredients    RecipeIngredient[]
  steps          RecipeStep[]
  savedBy        SavedRecipe[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([category])
  @@index([goal])
}

model RecipeIngredient {
  id        String @id @default(cuid())
  recipeId  String
  recipe    Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  text      String
  sortOrder Int    @default(0)

  @@index([recipeId])
}

model RecipeStep {
  id        String @id @default(cuid())
  recipeId  String
  recipe    Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  text      String
  sortOrder Int    @default(0)

  @@index([recipeId])
}

// ─── SAVED RECIPES / COOK LATER ──────────────────────

model SavedRecipe {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipeId  String
  recipe    Recipe    @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  tag       String?
  isCooked  Boolean   @default(false)
  cookedAt  DateTime?
  createdAt DateTime  @default(now())

  @@unique([userId, recipeId])
  @@index([userId])
}

// ─── IMPORTS ─────────────────────────────────────────

model Import {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  url            String
  provider       String?
  status         String   @default("pending")
  rawData        Json?
  extractedData  Json?
  errorMessage   String?
  recipeId       String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

// ─── MEAL LOGS ───────────────────────────────────────

model MealLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date        DateTime @default(now())
  mealType    String
  description String
  calories    Int?
  nutrients   Json?
  aiAnalysis  Json?
  createdAt   DateTime @default(now())

  @@index([userId, date])
}

// ─── PLANNER ─────────────────────────────────────────

model PlannerWeek {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  weekStart   DateTime
  aiGenerated Boolean       @default(false)
  items       PlannerItem[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@unique([userId, weekStart])
  @@index([userId])
}

model PlannerItem {
  id         String      @id @default(cuid())
  weekId     String
  week       PlannerWeek @relation(fields: [weekId], references: [id], onDelete: Cascade)
  date       DateTime
  mealType   String
  title      String
  calories   Int?
  recipeId   String?
  sortOrder  Int         @default(0)

  @@index([weekId])
}
```

---

## Field Conventions

| Convention | Example |
|---|---|
| Primary keys | `cuid()` — collision-resistant, URL-safe |
| Timestamps | `createdAt` (auto), `updatedAt` (auto via `@updatedAt`) |
| Soft deletes | Not used — hard deletes with `onDelete: Cascade` |
| Enums | Stored as `String` (not Prisma enum) for flexibility |
| JSON columns | `Json?` for semi-structured data (AI analysis, nutrients) |
| Indexes | On foreign keys and frequently queried fields |
| Unique constraints | `@@unique([userId, recipeId])` prevents duplicate saves |

---

## Migration Strategy

1. Migrations are created with `pnpm prisma migrate dev --name <description>`
2. Each milestone adds only the tables it needs (incremental)
3. Migration files are committed to git in `prisma/migrations/`
4. Production migrations run with `pnpm prisma migrate deploy`

### Migration Schedule by Milestone

| Milestone | Tables Added |
|---|---|
| M1 | `User`, `UserSettings`, `RefreshToken` |
| M3 | `Recipe`, `RecipeIngredient`, `RecipeStep` |
| M4 | `SavedRecipe` |
| M5 | `Import` |
| M6 | `MealLog` |
| M7 | `PlannerWeek`, `PlannerItem` |

---

## JSON Column Schemas

### MealLog.nutrients

```json
{
  "protein": 45,
  "carbs": 180,
  "fats": 50,
  "fiber": 18,
  "sugar": 25,
  "sodium": 1800
}
```

### MealLog.aiAnalysis

```json
{
  "balance": "good",
  "score": 78,
  "nutrients": [
    { "name": "Protein", "value": 45, "target": 60, "unit": "g", "status": "low" }
  ],
  "missing": ["More vegetables for fiber", "Omega-3 from fish/seeds"],
  "overconsumption": ["Refined carbohydrates", "Sodium slightly elevated"],
  "suggestions": [
    { "type": "swap", "title": "Swap refined carbs", "description": "Replace white rice with quinoa" },
    { "type": "add", "title": "Add healthy fats", "description": "Include avocado or nuts" }
  ]
}
```

### Import.extractedData

```json
{
  "title": "Spicy Thai Basil Chicken",
  "author": "@foodlover_chef",
  "prepTime": "25 min",
  "image": "https://...",
  "ingredients": ["500g chicken breast, sliced", "2 cups Thai basil"],
  "steps": ["Heat oil in a wok", "Add garlic and chilies"]
}
```
