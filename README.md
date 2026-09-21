# News Portal — Backend

Node.js + Express + MongoDB backend for **प्रतिध्वनि (Pratidhwani)**, a Nepali-language news portal. This README describes the API as it actually behaves today. For the wider project picture (frontend, domain model, known issues, and remediation history), see `docs/vision.md`, `docs/news-portal-findings.md`, and `docs/remediation-plan.md` one directory up.

## Tech stack

- Node.js + Express 5, TypeScript (compiled with `tsc` to `dist/`)
- MongoDB + Mongoose
- JWT auth (access + refresh token pair), cookie-based (`cookie-parser`)
- `helmet`, `express-rate-limit`, and a custom Mongo-operator sanitizer (see [Security](#security))
- `zod` for request validation (partial coverage — see [Validation](#validation))
- Multer (memory storage) → Cloudinary for image hosting
- `pino`/`pino-http` for structured logging
- `vitest` for unit tests, `eslint` + `typescript-eslint` for linting

## Setup

```bash
npm install
```

### Environment variables

Create a `.env` at the project root. `validateEnv()` (`src/config/env.ts`) checks these at startup and exits with a clear error if any are missing:

| Variable | Required | Purpose |
|---|---|---|
| `JWT_SECRET` | Yes | Signs/verifies access & refresh JWTs |
| `MONGODB_URI_PROD` | Yes | MongoDB connection string (used regardless of `NODE_ENV` — see note below) |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary account |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary account |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary account |
| `PORT` | No (default `5000`) | HTTP port |
| `CLIENT_URL` | No | Extra allowed CORS origin (in addition to `localhost:3000`/`127.0.0.1:3000`, which are always allowed) |
| `mode` | No | If set to `"production"`, changes a log message; **does not** change which DB is connected to — both branches in `src/config/db.ts` currently connect to `MONGODB_URI_PROD` |
| `SuperAdminEmail` / `SuperAdminPassword` | For the seed script only | Used by `superAdmin.ts` (run directly, e.g. `npx tsx superAdmin.ts` — no `npm run` script defined for it) to create the first superadmin account if one doesn't already exist |

### Run

```bash
npm run dev      # tsx watch server.ts — hot reload
npm run build    # tsc → dist/
npm start        # node dist/server.js (run build first)
```

### Seed site content

```bash
npm run seed:site -- --dry-run   # show what would be created; writes nothing
npm run seed:site                # create whatever is missing
```

Seeds the initial data behind the planned CMS-driven frontend (`docs/dynamic-frontend-plan.md`, Phase 0): one `SiteSettings` document, the 8 `HomepageSection`s that match today's homepage, and 5 starter `Page`s (`about`, `contact`, `privacy`, `terms`, `advertise`). It is **insert-only and idempotent** — existing documents are never modified, so re-running cannot overwrite admin edits. It connects to `MONGODB_URI_PROD` (the same DB the dev server uses) and prints the database name before doing anything; use `--dry-run` first. `SiteSettings` is served by `/api/settings` (Phase 2) and `HomepageSection` by `/api/homepage` (Phase 3); `Page` has no endpoint yet (Phase 4), so that collection is only data with a schema for now. Seed data lives in `src/seeds/siteContent.data.ts`.

### Quality checks

```bash
npm run lint     # eslint .
npm test         # vitest run
npx tsc --noEmit # type-check only
```

CI (`.github/workflows/ci.yml`) runs all of the above plus `npm run build` on every push/PR to `main`/`develop`. Test coverage is intentionally scoped to pure units (validators, sanitizer, env check) — no MongoDB/Cloudinary integration tests exist yet, so CI needs no service containers or secrets.

## Domain model

| Model | Key fields |
|---|---|
| `User` | `name`, `email` (unique, lowercased), `password` (hashed, `select: false`), `role` (`user`\|`editor`\|`admin`\|`superadmin`), `isActive`, `refreshTokenHash`/`refreshTokenExpiresAt` |
| `Reporter` | `name`, `email?`, `phone?`, `isActive` — a field reporter who can author news without a login account |
| `Category` | `name.{np,en}`, `slug`, `parent` (self-reference — categories can be one level of subcategory) |
| `News` | `slug`, `category`, `subCategory?`, `editor` (ref User), `reporter?` (ref Reporter), `authorType` (`"editor"`\|`"reporter"`), `content.{np,en}.{title,summary,body}`, `media.{type,images,video}`, `status` (`draft`\|`pending`\|`approved`\|`rejected`), `province?`, `views`, `publishedAt?` |
| `Comment` | `newsId` (ref News), `userId` (ref User), `commentText`, `status` (`pending`\|`approved`\|`rejected`) |
| `Advertisement` | `title`, `image.{url,key}`, `redirectUrl`, `placement`, `startDate`/`endDate`, `isActive` |
| `SiteSettings` | Singleton (`key: "site"`): `siteName`/`tagline`/`about` `{np,en}`, `logo?`, `contact`, `social`, `seo`, `footerLinks`, `copyright`, `footerNote` — see `/api/settings` |
| `HomepageSection` | One document per homepage section: unique `key`, `type` (`hero`\|`latest`\|`category`\|`province`\|`banner-ad`), `enabled`, `order`, `title.{np,en}`, `config` — see `/api/homepage` |
| `Page` | Seeded by `npm run seed:site` but **not served by any endpoint yet** (`docs/dynamic-frontend-plan.md` Phase 4) |
| `AuditLog` | Written by site-settings changes only (`settings.update`, `settings.logo.*`); not yet wired into any other controller |

Provinces are **not** a Mongo collection — `/api/provinces` returns a static list from `src/constants/provinces.ts`.

## API routes

All routes are mounted under `/api` in `server.ts`. `authMiddleware` requires a valid JWT cookie; `role` allows admin/superadmin; `isSuperAdmin` restricts to superadmin only; `staffOnly` allows any logged-in editor/admin/superadmin.

### Auth / Users (`/api`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/login` | — | Rate-limited (10 req/15min); validated |
| POST | `/register` | — | Public self-registration (always creates a `user`-role account) |
| POST | `/refresh` | — | Refreshes the access token from the refresh cookie |
| POST | `/logout` | — | |
| GET | `/me` | any logged-in user | |
| POST | `/create-user` | superadmin | Creates a staff account (editor/admin/superadmin) |
| GET | `/users` | superadmin | Paginated, filterable staff list |
| PATCH | `/users/:id` | superadmin | Update role/password/active status |

### News (`/api/news`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | Published news, paginated/searchable |
| GET | `/latest-by-category` | — | One latest article per category |
| GET | `/most-viewed` | — | |
| GET | `/:slug` | — | Single article + comments |
| GET | `/manage` | staff | All articles regardless of status |
| POST | `/` | staff | `multipart/form-data`, up to 5 images |
| PUT | `/:id` | staff | Update; can replace/append images |
| PATCH | `/:id/status` | staff | Approve/reject/etc. |
| DELETE | `/:id` | staff | |

### Categories (`/api/categories`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | `?parent=<id>` for one category's subcategories, `?parent=all` for everything nested |
| GET | `/search` | — | `?search=&page=&limit=` |
| GET | `/:slug/subcategories` | — | |
| GET | `/:slug` | — | |
| POST | `/` | admin | Validated (zod) |
| PUT | `/:id` | admin | Validated (zod) |
| DELETE | `/:id` | admin | Refuses if the category has subcategories or referenced news |

### Comments (`/api/comments`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | any logged-in user | Validated (zod); comment starts `pending` |
| GET | `/` | admin | All comments, paginated |
| PUT | `/:id` | admin | Edit comment text |
| PATCH | `/:id/status` | admin | Approve/reject |
| DELETE | `/:id` | admin | |

### Reporters (`/api/reporters`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | staff | |
| POST | `/` | admin | Validated (zod) |
| PATCH | `/:id` | admin | Validated (zod) |

### Advertisements (`/api/advertisements`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/active` | — | |
| GET | `/` | logged-in | |
| GET | `/:id` | logged-in | |
| POST | `/` | logged-in | `multipart/form-data`, 1 image |
| PATCH | `/:id` | logged-in | |
| DELETE | `/:id` | superadmin | |

### Provinces (`/api/provinces`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | Static list, `{ success, data }` |

### Site settings (`/api/settings`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | `{ success, data }`. Returns the stored settings, or the built-in defaults if none are saved yet |
| PUT | `/` | superadmin | Replaces every editable field at once; strict zod validation (unknown keys rejected, link targets must be http(s) or a `/` path). Writes an `AuditLog` entry listing which top-level fields changed |
| PUT | `/logo` | superadmin | `multipart/form-data`, field `logo` (image, max 5 MB); replaces and deletes the previous logo |
| DELETE | `/logo` | superadmin | Removes the logo |

### Homepage layout (`/api/homepage`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | `{ success, data }`: enabled sections only, in display order. Returns the seeded default layout until a layout has been saved |
| GET | `/manage` | admin | All sections including disabled ones, plus `isDefault` |
| PUT | `/` | admin | Body `{ sections: [...] }` replaces the whole ordered list (array position = display order). Strict per-type validation; at most one hero/latest/province section; 1–20 sections. Upserts first, deletes removed sections last |

Response envelopes are **not fully standardized** across all of the above yet — most return `{ success, message?, data }`, but some category/advertisement endpoints still use resource-specific keys (`categories`, `parent`/`subcategories`). Check the actual controller before writing a frontend consumer; see `docs/news-portal-findings.md`, B4, for the full list of what's been standardized vs. what's still pending.

## Security

- **Rate limiting** (`src/middleware/rateLimit.middleware.ts`): 300 req/15min on all `/api/*`, plus a stricter 10 req/15min on `POST /login`.
- **`helmet`**: standard security headers, with `crossOriginResourcePolicy: "cross-origin"` (this is a JSON API; images are served from Cloudinary, not this origin).
- **Input sanitization** (`src/middleware/sanitize.middleware.ts`): strips `$`-prefixed and dotted keys from `req.body`/`req.params`/`req.query` to block NoSQL-operator injection. Implemented as a custom middleware rather than `express-mongo-sanitize`, because that package reassigns `req.query`, which throws on Express 5 (`req.query` has no setter there) — this one mutates in place instead.
- **CORS**: explicit origin allow-list (`localhost:3000`, `127.0.0.1:3000`, plus `CLIENT_URL`), credentials enabled.
- **Boot-time env validation**: see [Environment variables](#environment-variables) above.

## Validation

Request validation (`src/middleware/validate.middleware.ts` + `zod` schemas in `src/validation/`) is wired into: user auth/management, category create/update, reporter create/update, and comments (all four comment mutation routes). **Not yet covered:** `news` and `advertisement` routes — both are `multipart/form-data` with large, already-extensively-validated controllers; retrofitting zod there is tracked as follow-up work (`docs/news-portal-findings.md`, B3).

## Logging

Structured logging via `pino` (`src/config/logger.ts`): colorized pretty-printed output in development, JSON in production. `pino-http` logs every request/response. The error handler (`src/middleware/errorhandling.ts`) logs expected 4xx errors at `warn` (brief) and unexpected 5xx errors at `error` (with stack/cause).

## Known gaps

See `docs/news-portal-findings.md` for the full, maintained list. Backend-relevant open items as of this writing:

- Response envelope standardization is partial (B4) — see [API routes](#api-routes) above.
- `news`/`advertisement` routes have no request validation yet (B3).
- `src/config/db.ts`'s connection-failure path only logs the error; the server keeps running without a DB connection rather than exiting.
- `.env` secrets exist in the working tree (never committed — verified via git history) but should still be handled carefully (not zipped/shared) — see H1.
