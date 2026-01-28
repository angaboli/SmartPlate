# SmartPlate — API Contract

> **Version**: 1.0
> **Last updated**: 2026-01-28
> **Base URL**: `/api/v1`
> **Format**: JSON
> **Auth**: Bearer JWT in `Authorization` header

---

## Common Response Patterns

### Success

```json
// Single resource
{ "id": "clx...", "email": "user@example.com", "name": "Alex" }

// Collection (paginated)
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

### Error

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Standard Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async job queued) |
| 400 | Bad request (malformed input) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 409 | Conflict (duplicate resource) |
| 422 | Validation error |
| 429 | Rate limited |
| 500 | Internal server error |

---

## 1. Health Check

### `GET /health`

No auth required.

**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-01-28T12:00:00.000Z", "version": "1.0.0" }
```

---

## 2. Auth

### `POST /auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Str0ng!Pass123",
  "name": "Alex Johnson"
}
```

**Validation:**
- `email`: valid email, required
- `password`: min 8 chars, 1 uppercase, 1 number, required
- `name`: optional, max 100 chars

**Response 201:**
```json
{
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "name": "Alex Johnson",
    "createdAt": "2026-01-28T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "rt_abc123def456..."
}
```

**Errors:** 409 if email already exists.

---

### `POST /auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Str0ng!Pass123"
}
```

**Response 200:** Same shape as register response.

**Errors:** 401 if credentials invalid.

---

### `POST /auth/refresh`

**Request:**
```json
{ "refreshToken": "rt_abc123def456..." }
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "rt_newtoken789..."
}
```

**Errors:** 401 if refresh token expired/invalid.

---

### `POST /auth/logout`

**Auth required.**

**Request:**
```json
{ "refreshToken": "rt_abc123def456..." }
```

**Response 200:**
```json
{ "message": "Logged out successfully" }
```

---

## 3. Users

### `GET /users/me`

**Auth required.**

**Response 200:**
```json
{
  "id": "clx123abc",
  "email": "user@example.com",
  "name": "Alex Johnson",
  "avatarUrl": null,
  "createdAt": "2026-01-28T12:00:00.000Z"
}
```

---

### `PATCH /users/me`

**Auth required.**

**Request (partial):**
```json
{
  "name": "Alex J.",
  "avatarUrl": "https://..."
}
```

**Response 200:** Updated user object.

---

### `GET /users/me/settings`

**Auth required.**

**Response 200:**
```json
{
  "id": "clx456def",
  "language": "en",
  "goal": "maintain",
  "age": 28,
  "weightKg": 72,
  "heightCm": 175,
  "activityLevel": "moderate",
  "calorieTarget": 2000,
  "proteinTargetG": 60,
  "vegetarian": false,
  "vegan": false,
  "glutenFree": false,
  "dairyFree": false,
  "allergies": ["Nuts"]
}
```

---

### `PATCH /users/me/settings`

**Auth required.**

**Request (partial):**
```json
{
  "language": "fr",
  "goal": "weight-loss",
  "calorieTarget": 1800,
  "allergies": ["Nuts", "Shellfish"],
  "vegetarian": true
}
```

**Response 200:** Updated settings object.

---

## 4. Recipes

### `GET /recipes`

**Auth optional** (public for SEO; returns more data if authenticated).

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 50) |
| `search` | string | — | Full-text search on title |
| `category` | string | — | Filter: "SafariTaste" or "Regular" |
| `goal` | string | — | Filter: balanced, high-protein, light, energy-boost |
| `aiRecommended` | boolean | — | Filter AI-recommended only |

**Response 200:**
```json
{
  "data": [
    {
      "id": "clx789ghi",
      "title": "Grilled Chicken Quinoa Bowl",
      "imageUrl": "https://images.unsplash.com/...",
      "prepTimeMin": 25,
      "servings": 2,
      "category": "SafariTaste",
      "goal": "balanced",
      "aiRecommended": true,
      "calories": 520,
      "createdAt": "2026-01-28T12:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

---

### `GET /recipes/:id`

**Auth optional.**

**Response 200:**
```json
{
  "id": "clx789ghi",
  "title": "Grilled Chicken Quinoa Bowl",
  "description": "A healthy and filling bowl...",
  "imageUrl": "https://...",
  "prepTimeMin": 25,
  "cookTimeMin": 15,
  "servings": 2,
  "calories": 520,
  "category": "SafariTaste",
  "goal": "balanced",
  "aiRecommended": true,
  "isImported": false,
  "ingredients": [
    { "id": "clx...", "text": "200g quinoa", "sortOrder": 0 },
    { "id": "clx...", "text": "300g chicken breast", "sortOrder": 1 }
  ],
  "steps": [
    { "id": "clx...", "text": "Cook quinoa according to package", "sortOrder": 0 },
    { "id": "clx...", "text": "Grill chicken until done", "sortOrder": 1 }
  ],
  "createdAt": "2026-01-28T12:00:00.000Z"
}
```

---

### `POST /recipes`

**Auth required.** Used internally for imported recipes.

**Request:**
```json
{
  "title": "Spicy Thai Basil Chicken",
  "imageUrl": "https://...",
  "prepTimeMin": 25,
  "servings": 2,
  "calories": 480,
  "category": "Regular",
  "isImported": true,
  "sourceUrl": "https://instagram.com/...",
  "sourceProvider": "Instagram",
  "ingredients": [
    { "text": "500g chicken breast, sliced", "sortOrder": 0 }
  ],
  "steps": [
    { "text": "Heat oil in a wok over high heat", "sortOrder": 0 }
  ]
}
```

**Response 201:** Created recipe object.

---

## 5. Saved Recipes (Cook Later)

### `GET /saved-recipes`

**Auth required.**

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `tag` | string | — | Filter: breakfast, lunch, dinner, snack |
| `isCooked` | boolean | — | Filter cooked/uncooked |

**Response 200:**
```json
{
  "data": [
    {
      "id": "clxSR001",
      "recipeId": "clx789ghi",
      "tag": "dinner",
      "isCooked": false,
      "createdAt": "2026-01-28T12:00:00.000Z",
      "recipe": {
        "id": "clx789ghi",
        "title": "Grilled Chicken Quinoa Bowl",
        "imageUrl": "https://...",
        "prepTimeMin": 25,
        "calories": 520,
        "sourceProvider": null
      }
    }
  ]
}
```

---

### `POST /saved-recipes`

**Auth required.**

**Request:**
```json
{
  "recipeId": "clx789ghi",
  "tag": "dinner"
}
```

**Response 201:** Created saved recipe.

**Errors:** 409 if already saved.

---

### `PATCH /saved-recipes/:id`

**Auth required.**

**Request:**
```json
{ "tag": "lunch", "isCooked": true }
```

**Response 200:** Updated saved recipe.

---

### `DELETE /saved-recipes/:id`

**Auth required.**

**Response 200:**
```json
{ "message": "Removed from saved recipes" }
```

---

## 6. Imports

### `POST /imports`

**Auth required. Rate limited: 10/hour per user.**

**Request:**
```json
{ "url": "https://www.instagram.com/reel/abc123/" }
```

**Validation:**
- `url`: valid URL, required, must be http/https

**Response 202:**
```json
{
  "id": "clxIMP001",
  "url": "https://www.instagram.com/reel/abc123/",
  "provider": "Instagram",
  "status": "pending",
  "createdAt": "2026-01-28T12:00:00.000Z"
}
```

---

### `GET /imports/:id`

**Auth required.** Poll this endpoint for status updates.

**Response 200 (pending/processing):**
```json
{
  "id": "clxIMP001",
  "status": "processing",
  "provider": "Instagram",
  "url": "https://...",
  "extractedData": null,
  "errorMessage": null
}
```

**Response 200 (completed):**
```json
{
  "id": "clxIMP001",
  "status": "completed",
  "provider": "Instagram",
  "url": "https://...",
  "extractedData": {
    "title": "Spicy Thai Basil Chicken",
    "author": "@foodlover_chef",
    "prepTime": "25 min",
    "image": "https://...",
    "ingredients": ["500g chicken breast, sliced", "2 cups Thai basil leaves"],
    "steps": ["Heat oil in a wok", "Add garlic and chilies"]
  },
  "errorMessage": null
}
```

**Response 200 (partial):**
```json
{
  "id": "clxIMP001",
  "status": "partial",
  "provider": "Instagram",
  "extractedData": {
    "title": "Spicy Thai Basil Chicken",
    "author": "@foodlover_chef",
    "image": "https://...",
    "ingredients": [],
    "steps": []
  },
  "errorMessage": "Could not extract full recipe details. Manual entry recommended."
}
```

**Response 200 (failed):**
```json
{
  "id": "clxIMP001",
  "status": "failed",
  "provider": "Instagram",
  "extractedData": null,
  "errorMessage": "Content is private or not accessible"
}
```

---

### `POST /imports/:id/save`

**Auth required.** Saves extracted + user-edited recipe to Cook Later.

**Request:**
```json
{
  "title": "Spicy Thai Basil Chicken",
  "author": "@foodlover_chef",
  "prepTime": "25 min",
  "tag": "dinner",
  "ingredients": ["500g chicken breast, sliced"],
  "steps": ["Heat oil in a wok over high heat"]
}
```

**Response 201:**
```json
{
  "recipe": { "id": "clxRCP001", "title": "Spicy Thai Basil Chicken" },
  "savedRecipe": { "id": "clxSR002", "recipeId": "clxRCP001", "tag": "dinner" }
}
```

---

## 7. Meal Logs

### `GET /meal-logs`

**Auth required.**

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `date` | string (ISO) | today | Filter by date |
| `from` | string (ISO) | — | Range start |
| `to` | string (ISO) | — | Range end |
| `mealType` | string | — | breakfast, lunch, dinner, snack |

**Response 200:**
```json
{
  "data": [
    {
      "id": "clxML001",
      "date": "2026-01-28T12:00:00.000Z",
      "mealType": "lunch",
      "description": "Grilled chicken with rice and broccoli",
      "calories": 520,
      "nutrients": { "protein": 45, "carbs": 60, "fats": 15, "fiber": 8 },
      "aiAnalysis": {
        "balance": "good",
        "score": 78,
        "suggestions": [ ... ]
      }
    }
  ]
}
```

---

### `POST /meal-logs`

**Auth required.** Creates log and triggers AI analysis (async).

**Request:**
```json
{
  "description": "Grilled chicken with rice and broccoli",
  "mealType": "lunch",
  "date": "2026-01-28"
}
```

**Response 202:**
```json
{
  "id": "clxML001",
  "status": "analyzing",
  "description": "Grilled chicken with rice and broccoli",
  "mealType": "lunch"
}
```

---

### `GET /meal-logs/:id`

**Auth required.** Poll for AI analysis completion.

**Response 200:** Full meal log with `aiAnalysis` populated when ready.

---

### `DELETE /meal-logs/:id`

**Auth required.**

**Response 200:**
```json
{ "message": "Meal log deleted" }
```

---

## 8. Planner

### `GET /planner/weeks`

**Auth required.**

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `weekStart` | string (ISO date) | current week | Monday of the target week |

**Response 200:**
```json
{
  "id": "clxPW001",
  "weekStart": "2026-01-26T00:00:00.000Z",
  "aiGenerated": true,
  "items": [
    {
      "id": "clxPI001",
      "date": "2026-01-26T00:00:00.000Z",
      "mealType": "breakfast",
      "title": "Oatmeal with berries and almonds",
      "calories": 350,
      "recipeId": null,
      "sortOrder": 0
    },
    {
      "id": "clxPI002",
      "date": "2026-01-26T00:00:00.000Z",
      "mealType": "lunch",
      "title": "Grilled chicken quinoa bowl",
      "calories": 520,
      "recipeId": "clx789ghi",
      "sortOrder": 0
    }
  ]
}
```

**Response 404:** If no planner exists for that week.

---

### `POST /planner/weeks/generate`

**Auth required.** AI-generates a full week plan.

**Request:**
```json
{
  "weekStart": "2026-01-26"
}
```

**Response 202:**
```json
{
  "id": "clxPW001",
  "status": "generating",
  "weekStart": "2026-01-26T00:00:00.000Z"
}
```

---

### `PATCH /planner/weeks/:weekId/items/:itemId`

**Auth required.** Update a planner item (move, rename, change meal type).

**Request:**
```json
{
  "date": "2026-01-27",
  "mealType": "dinner",
  "title": "Salmon with vegetables",
  "sortOrder": 1
}
```

**Response 200:** Updated planner item.

---

### `DELETE /planner/weeks/:weekId/items/:itemId`

**Auth required.**

**Response 200:**
```json
{ "message": "Planner item removed" }
```

---

### `GET /planner/weeks/:weekId/grocery-list`

**Auth required.** Aggregates ingredients from all items in the week.

**Response 200:**
```json
{
  "categories": [
    {
      "name": "Proteins",
      "items": [
        { "name": "Chicken breast", "quantity": "800g" },
        { "name": "Salmon fillet", "quantity": "400g" }
      ]
    },
    {
      "name": "Grains",
      "items": [
        { "name": "Quinoa", "quantity": "400g" },
        { "name": "Brown rice", "quantity": "300g" }
      ]
    },
    {
      "name": "Vegetables",
      "items": [
        { "name": "Broccoli", "quantity": "2 heads" },
        { "name": "Sweet potato", "quantity": "4 medium" }
      ]
    }
  ]
}
```

---

## Rate Limiting Summary

| Endpoint Group | Limit |
|---|---|
| Auth (login/register) | 5 requests/minute per IP |
| Imports (POST) | 10 requests/hour per user |
| AI endpoints (meal log, planner generate) | 20 requests/hour per user |
| General API | 100 requests/minute per user |
| Health check | Unlimited |
