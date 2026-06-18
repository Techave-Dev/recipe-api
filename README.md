# Recipe API

A REST API for recipes, users, ingredients, and tags. Built test-first — **60 e2e tests are RED by design**. The intern's job: make them green.

## Stack

- **Runtime:** Node.js 20+, TypeScript (strict)
- **Web:** Express 5
- **DB:** PostgreSQL + `pg` (raw queries, **no ORM**)
- **Auth:** JWT (`jsonwebtoken`) + bcrypt
- **Test:** Vitest + supertest
- **Migrations:** golang-migrate (CLI)
- **Format:** Biome

## Prerequisites

- Node.js 20+
- PostgreSQL (any recent version) running locally
- Two databases: `app_dev` and `app_test`
- `golang-migrate` CLI

### Create databases

```bash
createdb app_dev
createdb app_test
```

## Setup

```bash
npm install
cp .env.example .env
cp .env.example .env.test
# Edit both files: set DATABASE_URL to point to the right DB
# .env       → app_dev
# .env.test  → app_test
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm test` | Apply migrations to test DB, then run all tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run build` | `tsc` to `dist/` |
| `npm run migrate:up` | Apply pending migrations |
| `npm run migrate:down:1` | Roll back one migration |
| `npm run migrate:status` | Show current migration version |
| `npm run migrate:create <name>` | Create new migration pair (`up` + `down`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Biome format (write) |
| `npm run format:check` | Biome format (check only) |

## Project structure

```
.
├── .env.example
├── .env.test                  # used by tests via dotenv-cli
├── .gitignore
├── biome.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── db/
│   └── migrations/
│       ├── 001_init.up.sql    # ← write your schema here
│       └── 001_init.down.sql  # ← write the rollback
├── src/
│   └── app.ts                 # Express factory (currently stub)
└── tests/
    └── e2e/
        ├── helpers.ts         # API-based seeders (no direct DB)
        ├── auth.test.ts       # 8 tests
        ├── users.test.ts      # 8 tests
        ├── recipes.test.ts    # 22 tests (CRUD + filters)
        ├── ingredients.test.ts # 9 tests
        └── tags.test.ts       # 13 tests
```

There is no `db/schema.sql` — the schema lives entirely in migration files.

## TDD workflow

1. Run `npm test` — all 60 tests fail (routes don't exist yet).
2. Pick the simplest test, e.g. `auth.test.ts` → "POST /auth/register returns 201".
3. Write the schema in `001_init.up.sql` (users table first).
4. Add the matching `001_init.down.sql` rollback.
5. Run `npm run migrate:up` to apply.
6. Build the route:
   - validator (your choice — no Zod required, but allowed in later phases)
   - service (calls `pg` directly, hashes password with bcrypt, signs JWT)
   - controller (formats JSON response)
   - mount in `src/app.ts`
7. Run `npm test` — that test green, others still red.
8. Repeat.

Implement modules however you like (single file per resource, or split into controller/service/repo). The only requirement is that **tests stay API-based** — `tests/e2e/helpers.ts` must not be modified to query the DB directly.

## API spec

All requests/responses are JSON. Auth uses `Authorization: Bearer <token>` (JWT).

### Error envelope

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "path": "email", "message": "Invalid email" }] } }
```

| Code | HTTP |
|------|------|
| `VALIDATION_ERROR` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `INTERNAL` | 500 |

### Endpoints

| Method | Path | Auth | Body | Success |
|--------|------|------|------|---------|
| POST | `/auth/register` | – | `{ email, password, name }` | 201 `{ user, token }` |
| POST | `/auth/login` | – | `{ email, password }` | 200 `{ user, token }` |
| GET | `/auth/me` | ✓ | – | 200 `{ user }` |
| GET | `/users/:id` | – | – | 200 `{ user }` |
| PATCH | `/users/:id` | ✓ self | `{ name?, email?, password?, currentPassword? }` | 200 `{ user }` |
| POST | `/recipes` | ✓ | `{ title, description?, cookingTime, difficulty }` | 201 `{ recipe }` |
| GET | `/recipes` | – | query params (see Filters) | 200 `{ data, page, limit, total }` |
| GET | `/recipes/:id` | – | – | 200 `{ recipe, ingredients, tags }` |
| PATCH | `/recipes/:id` | ✓ author | partial | 200 `{ recipe }` |
| DELETE | `/recipes/:id` | ✓ author | – | 204 |
| POST | `/recipes/:recipeId/ingredients` | ✓ author | `{ name, quantity }` | 201 `{ ingredient }` |
| GET | `/recipes/:recipeId/ingredients` | – | – | 200 `{ data }` |
| PATCH | `/ingredients/:id` | ✓ author | partial | 200 `{ ingredient }` |
| DELETE | `/ingredients/:id` | ✓ author | – | 204 |
| POST | `/tags` | ✓ | `{ name, slug }` | 201 `{ tag }` |
| GET | `/tags` | – | – | 200 `{ data }` |
| POST | `/recipes/:recipeId/tags` | ✓ author | `{ tagId }` or `{ slug }` | 201 `{ tag }` |
| DELETE | `/recipes/:recipeId/tags/:tagId` | ✓ author | – | 204 |
| GET | `/tags/:slug/recipes` | – | query params | 200 `{ tag, data, page, limit, total }` |

### Enums

- `difficulty`: `easy | medium | hard`
- `sort`: `createdAt` or `cookingTime`, direction `asc | desc` (e.g. `sort=cookingTime:asc`)

### Filters (on `GET /recipes` and `GET /tags/:slug/recipes`)

| Param | Meaning |
|-------|---------|
| `difficulty` | exact match |
| `cookingTimeMax` | upper bound (inclusive) |
| `authorId` | filter by author |
| `tag` | repeatable; recipes must have **all** listed tag slugs (AND) |
| `search` | case-insensitive substring on title |
| `sort` | `createdAt:desc` (default), `cookingTime:asc`, etc. |
| `page` | 1-based, default 1 |
| `limit` | default 20, max 100, min 1 |

### Domain shapes

```ts
User:       { id, email, name, createdAt }
Recipe:     { id, title, description, cookingTime, difficulty, authorId, createdAt }
Ingredient: { id, recipeId, name, quantity }
Tag:        { id, name, slug }
```

Passwords are never returned in responses. DB columns are `snake_case` (`cooking_time`, `author_id`, `created_at`); API responses are `camelCase`. Map in your repository layer.

### Validation rules

- `email`: valid email format
- `password`: minimum 8 characters
- `cookingTime`: integer ≥ 1
- `slug`: lowercase, `[a-z0-9-]+`
- `difficulty`: enum
- Password change: must include `currentPassword`, which must match the stored hash

## Conventions

- **No ORM.** Use the `pg` driver directly. Map `snake_case` columns to `camelCase` responses in your repository/service layer.
- **Passwords:** hashed with bcrypt before storage. Never returned in responses.
- **Migrations:** always use `npm run migrate:create <name>`. Edit both the `.up.sql` and `.down.sql` files. Never edit applied migrations.
- **Error handling:** throw or return a structured error. The response must follow the error envelope above.
- **JWT:** sign with the secret from `JWT_SECRET`. Payload includes `sub` (user id) and `email`.

