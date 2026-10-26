# BookStore API

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.9-3178C6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D20.11-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-5-000000?logo=express)
![MongoDB](https://img.shields.io/badge/mongodb-mongoose%209-47A248?logo=mongodb&logoColor=white)
![Tests](https://img.shields.io/badge/tests-vitest%20%2B%20supertest-6E9F18?logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-lightgrey)

REST API for an online book store, written in **TypeScript**. It serves a public catalog of books and authors, handles user accounts with JWT authentication and email-based password reset, accepts verified image uploads, and restricts catalog management to administrators.

**Status:** deployed on Render with MongoDB Atlas. Authentication, validation, pagination, rate limiting, restricted CORS, startup configuration checks, a health endpoint and an automated unit and integration test suite are in place. CI, graceful shutdown, request logging and persistent upload storage are still open; see the [Production Readiness Checklist](#production-readiness-checklist).

## Live Deployment

| Resource     | URL                                             |
| ------------ | ----------------------------------------------- |
| Base URL     | `https://YOUR-SERVICE.onrender.com`             |
| Health check | `https://YOUR-SERVICE.onrender.com/healthcheck` |
| Sample call  | `https://YOUR-SERVICE.onrender.com/api/books`   |

> The service runs on a free tier. Free instances typically go to sleep after a period without traffic, so the first request after a pause can take about a minute. Check the hosting provider's current terms for details.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Authentication & Authorization](#authentication--authorization)
- [API Reference](#api-reference)
- [Pagination](#pagination)
- [Data Models](#data-models)
- [Validation Rules](#validation-rules)
- [Image Uploads](#image-uploads)
- [Password Reset Flow](#password-reset-flow)
- [Rate Limiting](#rate-limiting)
- [CORS](#cors)
- [Health Check](#health-check)
- [Error Handling](#error-handling)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Production Readiness Checklist](#production-readiness-checklist)
- [Troubleshooting](#troubleshooting)
- [Development Guide](#development-guide)
- [Roadmap](#roadmap)
- [Changelog](#changelog)
- [Author & License](#author--license)

## Features

- **Catalog:** full CRUD for books and authors, with the author embedded in book responses.
- **Accounts:** registration, login, and profile management with owner-or-admin access.
- **Authentication:** stateless JWT (1-day expiry) and bcrypt password hashing.
- **Password reset:** emailed, 15-minute links bound to the current password; the response never reveals whether an account exists.
- **Uploads:** admin-only image upload verified by size, extension, declared MIME type and real file content.
- **Pagination:** every list endpoint is paginated with a configurable `limit`, a stable sort and totals in the response.
- **Filtering:** price-range filtering on books.
- **Validation:** Joi on request bodies and query strings, ObjectId checks on every `:id` route, Mongoose constraints as a second layer.
- **Abuse protection:** per-IP rate limiting on registration, login and password-reset endpoints.
- **Error handling:** one central handler that maps Mongoose and body-parser errors to the right HTTP status and hides internals in production.
- **Security headers and CORS:** `helmet` and an allow-list based `cors` configuration.
- **Type safety:** strict TypeScript (`strict`, `noUncheckedIndexedAccess`), checked on every build and by `npm run typecheck`.
- **Tested:** unit tests for pure logic and integration tests that exercise the real Express app against a throw-away in-memory MongoDB.
- **Operations:** fail-fast environment validation at startup, a database-aware health endpoint, and an idempotent, guarded database seeder.

## Architecture

### System overview

```mermaid
flowchart LR
  C[Client / Frontend] -->|HTTPS| R["Render<br/>Express API"]
  M["Uptime monitor"] -->|GET /healthcheck| R
  R -->|Mongoose| A[("MongoDB Atlas")]
  R -->|SMTP| S["Email provider"]
  R --- D[("Local disk<br/>images/")]
```

The API is a single stateless Node process. State lives in MongoDB, except uploaded images, which are written to the local disk (see [Deployment](#deployment) for what that means on hosted platforms).

### Request pipeline

```mermaid
flowchart LR
  A[Client] --> B["helmet · cors · body parsers"]
  B --> C[Router]
  C --> L["rateLimiter<br/>(auth POST routes)"]
  C --> D["Auth middleware<br/>verifyToken*"]
  L --> F
  D --> E["validateObjectId<br/>(/:id routes)"]
  E --> F["Controller<br/>(Joi validation + logic)"]
  F --> G[Mongoose models]
  G --> H[(MongoDB)]
  F -. thrown errors .-> I[errorHandler]
  C -. no route matches .-> J[notFound] --> I
```

Routes only declare paths and middleware. Controllers hold the logic and each resource keeps its Joi schemas next to its controller. Controllers are wrapped in `express-async-handler`, so any thrown or rejected error ends up in `errorHandler`.

`createApp()` in `src/app.ts` builds the Express app **without** connecting to a database or listening on a port. `src/server.ts` is the only file that does I/O at startup (env check, DB connection, `listen`). That split is what lets the tests import the app directly.

### Project structure

```
bookStore/
├── src/
│   ├── server.ts                   Entry point: env check, DB connection, listen
│   ├── app.ts                      createApp(): middleware, routes, health route, error handlers
│   ├── seeder.ts, data.ts          Guarded database seeder and its sample data
│   ├── config/
│   │   ├── connectToDB.ts          MongoDB connection (exits the process on failure)
│   │   └── env.ts                  Required-variable check
│   ├── controllers/
│   │   ├── authors/                authors.controller.ts, utils/validateAuthor.ts
│   │   ├── books/                  books.controller.ts, utils/validateBook.ts
│   │   └── users/
│   │       ├── auth.controller.ts  Register, login, forgot/reset password
│   │       ├── users.controller.ts List, get, update and delete users
│   │       ├── services/sendEmail.service.ts   Nodemailer transport and reset email
│   │       └── utils/validateUser.ts
│   ├── middleware/
│   │   ├── errorHandlers.ts        notFound and the central errorHandler
│   │   ├── hashPassword.ts         bcrypt hash and compare helpers
│   │   ├── rateLimiter.ts          Per-IP rate limiter factory for auth routes
│   │   ├── validateObjectId.ts     Rejects malformed :id params with 400
│   │   └── verifyToken.ts          JWT checks: any user, owner-or-admin, admin only
│   ├── models/                     Author, Book and User Mongoose models
│   ├── routes/                     auth, authors, books, users and uploads routers
│   └── types/                      Shared types and the Express Request augmentation
├── tests/
│   ├── unit/                       Pure logic, no database
│   ├── integration/                Supertest against the real app + in-memory MongoDB
│   └── helpers/                    DB bootstrap, factories, env setup, fixtures
├── views/                          EJS pages for the password reset flow
├── images/                         Uploaded images (git-ignored except default.png)
├── dist/                           Compiled output of `npm run build` (git-ignored)
├── tsconfig.json                   Editor and type-check config (src + tests)
├── tsconfig.build.json             Build config (src only, emits dist/ with source maps)
├── vitest.config.ts                Test and coverage configuration
├── TESTING.md                      Detailed testing guide
└── .env.example                    Template for environment variables
```

## Tech Stack

| Area            | Packages                                                           |
| --------------- | ------------------------------------------------------------------ |
| Language        | TypeScript 5.9 (`strict`), compiled with `tsc`, run in dev with `tsx` |
| Runtime         | Node.js **20.11+** (ES Modules, `import.meta.dirname`)             |
| Web framework   | Express 5, `express-async-handler`                                 |
| Database        | MongoDB (Atlas in production), Mongoose 9                          |
| Auth & security | `jsonwebtoken`, `bcryptjs`, `helmet`, `cors`, `express-rate-limit` |
| Validation      | Joi 18                                                             |
| Uploads         | `multer` (memory storage), `file-type`                             |
| Email & views   | `nodemailer`, `ejs`                                                |
| Testing         | Vitest, Supertest, `mongodb-memory-server`, `@vitest/coverage-v8`  |
| Config          | `dotenv`                                                           |

## Getting Started

### Prerequisites

- Node.js 20.11 or newer
- A MongoDB instance: local, Docker, or MongoDB Atlas
- An SMTP account if you want password-reset emails (a free [Ethereal](https://ethereal.email) account works for development)

### Install and run

```bash
git clone https://github.com/OmarKh006/bookStore.git
cd bookStore
npm install
cp .env.example .env        # then fill in the values, see Configuration

# development: runs the TypeScript sources directly and restarts on changes
npm run dev

# production-style: compile to dist/ and run the compiled output
npm run build
npm start
```

The API listens on `http://localhost:5000` unless `PORT` is set. The process **exits immediately** if a required environment variable is missing or if it can't connect to MongoDB.

> There is no root route. A `404` JSON response from `GET /` is expected. Use `GET /healthcheck` to verify the server.

### Seed sample data

```bash
npm run seed:import    # wipe books and authors, then insert 6 authors and 16 books
npm run seed:delete    # wipe books and authors
```

The seeder is safe to run repeatedly and links every book to the correct author by name. It is guarded: it refuses to run unless the connected database name equals `SEED_DB_NAME`, so a wrong `MONGO_URI` can't wipe another database. It never touches users. See [Seeding the database](#seeding-the-database) for details.

### Create the first admin

Registration always creates a regular user, so the first admin is promoted in the database:

```bash
# 1. register a user through the API (see Quick tour below), then:
mongosh "$MONGO_URI" --eval 'db.users.updateOne({ email: "admin@example.com" }, { $set: { isAdmin: true } })'
```

On Atlas you can do the same from **Browse Collections**: open the `users` collection, edit the document and set `isAdmin` to `true`. Log in again afterwards. Admin rights are read from the token, so an old token keeps the old role.

### Quick tour

```bash
BASE=http://localhost:5000          # or your deployed base URL

# Register (returns data.token)
curl -X POST $BASE/api/auth/register -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","username":"admin","password":"Str0ng!Pass"}'

# Log in as the promoted admin and copy data.token
curl -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Str0ng!Pass"}'

# Create an author, then a book that references the author's _id
curl -X POST $BASE/api/authors -H "Content-Type: application/json" -H "token: <JWT>" \
  -d '{"firstName":"Nassim","lastName":"Taleb","nationality":"Lebanon"}'

curl -X POST $BASE/api/books -H "Content-Type: application/json" -H "token: <JWT>" \
  -d '{"title":"Antifragile","author":"<AUTHOR_ID>","description":"Things that gain from disorder","price":11,"cover":"soft cover"}'

# Public reads: page 2 of books priced 8 to 20, five per page
curl "$BASE/api/books?minPrice=8&maxPrice=20&pageNumber=2&limit=5"
```

## Configuration

All settings are environment variables, loaded from `.env` by `dotenv`. Copy `.env.example` as a starting point and never commit `.env`. The test suite sets its own values and needs no `.env`.

| Variable       | Required                     | Description                                                                                                 |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `MONGO_URI`    | **yes** (checked at startup) | MongoDB connection string, including the database name, e.g. `mongodb://localhost:27017/bookStoreDB`.       |
| `JWT_SECRET`   | **yes** (checked at startup) | Secret used to sign login tokens and as part of the password-reset token secret. Use 32+ random bytes.      |
| `BASE_URL`     | **yes** (checked at startup) | Public base URL of this API, used to build reset links, e.g. `https://api.example.com` (no trailing slash). |
| `PORT`         | no                           | Port to listen on. Default `5000`. Hosting platforms usually inject this.                                   |
| `NODE_ENV`     | recommended                  | Set to `production` in production. It hides internal error messages on 5xx responses.                      |
| `CORS_ORIGINS` | recommended                  | Comma-separated list of allowed browser origins, no trailing slashes. Default `http://localhost:3000`.      |
| `UPLOAD_DIR`   | no                           | Directory where uploaded images are written. Default `./images`. See the note under [Image Uploads](#image-uploads). |
| `SEED_DB_NAME` | for the seeder only          | The only database name the seeder is allowed to modify. Not needed in production.                           |
| `SMTP_HOST`    | for reset emails             | SMTP server host.                                                                                           |
| `SMTP_PORT`    | for reset emails             | SMTP server port (`587`, `465`, ...).                                                                       |
| `SMTP_SECURE`  | for reset emails             | `true` for implicit TLS (port 465), otherwise `false`.                                                      |
| `SMTP_USER`    | for reset emails             | SMTP username.                                                                                              |
| `SMTP_PASS`    | for reset emails             | SMTP password or app password.                                                                              |
| `SMTP_FROM`    | no                           | Sender address. Falls back to `SMTP_USER`.                                                                  |

Generate a strong secret with:

```bash
openssl rand -base64 48
```

At startup the app checks that `MONGO_URI`, `JWT_SECRET` and `BASE_URL` are set. If any are missing it prints **all** the missing names and exits with code 1, so a misconfigured deployment fails immediately instead of at the first login. The remaining variables are not validated.

Example `CORS_ORIGINS` value with two origins:

```
CORS_ORIGINS=http://localhost:3000,https://my-frontend.vercel.app
```

For local email testing with Ethereal, the server logs a preview URL for every sent message, so you can read the reset email without a real inbox.

## Authentication & Authorization

Send the JWT in a custom **`token`** header. Register and login return it as `data.token`.

```
token: <JWT>
```

The token payload is `{ id, isAdmin }` and it expires after **1 day**. There is no refresh token and no server-side revocation: a token stays valid until it expires, even if the user is deleted or demoted in the meantime.

### Access matrix

| Resource                                  | Public | Owner | Admin |
| ----------------------------------------- | :----: | :---: | :---: |
| Register, login, password reset pages     |   ✅   |       |       |
| `GET /healthcheck`                        |   ✅   |       |       |
| `GET` books and authors                   |   ✅   |       |       |
| `POST`, `PUT`, `DELETE` books and authors |        |       |  ✅   |
| `GET /api/users`                          |        |       |  ✅   |
| `GET`, `PUT`, `DELETE /api/users/:id`     |        |  ✅   |  ✅   |
| `POST /api/uploads`                       |        |       |  ✅   |

"Owner" means the token's `id` equals the `:id` in the URL.

### Authentication errors

| Status | Message                             | When                                |
| ------ | ----------------------------------- | ----------------------------------- |
| 401    | `Unauthorized action`               | No `token` header was sent          |
| 401    | `Not authenticated`                 | Token is invalid or expired         |
| 403    | `You're not allowed to this action` | Valid token, but not owner or admin |

## API Reference

Base URL: `http://localhost:5000` locally, or your deployed URL. Requests and responses are JSON unless noted (uploads are `multipart/form-data`; the password reset pages are HTML).

**Conventions**

- Errors are `{ "message": "..." }`, except upload errors, which use `{ "error": "..." }`.
- Every `/:id` route answers `400 { "message": "Invalid id" }` for a malformed ObjectId before any database query runs. A well-formed id that doesn't exist gives `404`.
- Request bodies for books and authors **reject unknown fields** (`400`). User bodies silently drop unknown fields.
- Every list endpoint is paginated; see [Pagination](#pagination).

### Endpoint summary

| Method | Endpoint                                  | Access               | Description                              |
| ------ | ----------------------------------------- | -------------------- | ---------------------------------------- |
| GET    | `/healthcheck`                            | public               | Liveness and database connectivity       |
| POST   | `/api/auth/register`                      | public, rate-limited | Create a user and return a token         |
| POST   | `/api/auth/login`                         | public, rate-limited | Log in and return a token                |
| GET    | `/api/auth/forgot-password`               | public               | HTML form asking for the account email   |
| POST   | `/api/auth/forgot-password`               | public, rate-limited | Email a reset link                       |
| GET    | `/api/auth/reset-password/:userId/:token` | public               | HTML form to choose a new password       |
| POST   | `/api/auth/reset-password/:userId/:token` | public, rate-limited | Save the new password                    |
| GET    | `/api/users`                              | admin                | List users (paginated)                   |
| GET    | `/api/users/:id`                          | owner or admin       | Get one user                             |
| PUT    | `/api/users/:id`                          | owner or admin       | Update email, username and/or password   |
| DELETE | `/api/users/:id`                          | owner or admin       | Delete a user                            |
| GET    | `/api/books`                              | public               | List books (filter and paginate)         |
| GET    | `/api/books/:id`                          | public               | Get one book                             |
| POST   | `/api/books`                              | admin                | Create a book                            |
| PUT    | `/api/books/:id`                          | admin                | Update a book                            |
| DELETE | `/api/books/:id`                          | admin                | Delete a book                            |
| GET    | `/api/authors`                            | public               | List authors (paginated)                 |
| GET    | `/api/authors/:id`                        | public               | Get one author                           |
| POST   | `/api/authors`                            | admin                | Create an author                         |
| PUT    | `/api/authors/:id`                        | admin                | Update an author                         |
| DELETE | `/api/authors/:id`                        | admin                | Delete an author **and all their books** |
| POST   | `/api/uploads`                            | admin                | Upload one image                         |

### Query parameters

| Endpoint           | Parameter              | Description                                                                       |
| ------------------ | ---------------------- | --------------------------------------------------------------------------------- |
| `GET /api/books`   | `pageNumber`           | Integer `>= 1`. Default `1`.                                                      |
|                    | `limit`                | Integer from `1` to `50`. Default `12`.                                           |
|                    | `minPrice`, `maxPrice` | Numbers `>= 0`, inclusive range. Both optional; `maxPrice` must be `>= minPrice`. |
| `GET /api/authors` | `pageNumber`, `limit`  | Same rules as above.                                                              |
| `GET /api/users`   | `pageNumber`, `limit`  | Same rules as above.                                                              |

Invalid values and unknown query parameters return `400` with a message such as `"limit" must be less than or equal to 50`.

### Auth

**`POST /api/auth/register`**

```json
{ "email": "admin@example.com", "username": "admin", "password": "Str0ng!Pass" }
```

`201`

```json
{
  "message": "User added successfully",
  "data": {
    "_id": "64b7f0f5e1b2c3d4e5f60718",
    "email": "admin@example.com",
    "username": "admin",
    "isAdmin": false,
    "createdAt": "2026-10-10T08:00:00.000Z",
    "updatedAt": "2026-10-10T08:00:00.000Z",
    "__v": 0,
    "token": "<JWT>"
  }
}
```

Errors: `400` validation (all problems are reported together) or `User already exists`, and `429` when rate-limited.

**`POST /api/auth/login`**: body `{ "email", "password" }` → `200` `{ "message": "User logged in successfully", "data": { ...user, "token" } }`. A wrong email or password returns `400 Invalid email or password` (identical message for both, on purpose).

**`POST /api/auth/forgot-password`**: JSON or form body `{ "email" }`. Always renders the "link sent" page (`200`) for a valid email, whether or not an account exists. A non-string or malformed email returns `400`.

**`GET` and `POST /api/auth/reset-password/:userId/:token`**: see [Password Reset Flow](#password-reset-flow).

### Users

All user endpoints need the `token` header.

| Endpoint                | Success                                                                  | Errors                                                          |
| ----------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `GET /api/users`        | `200` `{ "data": [user, ...], "total", "pages", "pageNumber", "limit" }` | `401`, `403`, `400` (bad query)                                 |
| `GET /api/users/:id`    | `200` `{ "data": user }`                                                 | `400` invalid id, `401`, `403`, `404`                           |
| `PUT /api/users/:id`    | `200` `{ "message": "User updated successfully" }`                       | `400` validation or invalid id, `404`, `409` email already used |
| `DELETE /api/users/:id` | `200` `{ "message": "User deleted successfully" }`                       | `400` invalid id, `401`, `403`, `404`                           |

- User objects never include the password.
- `PUT` needs at least one of `email`, `username`, `password`. `isAdmin` and other fields are ignored, so a user can't promote themselves.

### Books

**`GET /api/books`** → `200`

```json
{
  "books": [
    {
      "_id": "64b7f1a2e1b2c3d4e5f60720",
      "title": "Antifragile",
      "author": {
        "_id": "64b7f19ae1b2c3d4e5f6071f",
        "firstName": "Nassim",
        "lastName": "Taleb"
      },
      "description": "Things that gain from disorder",
      "price": 11,
      "cover": "soft cover",
      "createdAt": "2026-10-10T08:05:00.000Z",
      "updatedAt": "2026-10-10T08:05:00.000Z"
    }
  ],
  "total": 16,
  "pages": 2,
  "pageNumber": 1,
  "limit": 12
}
```

`total` counts the books that match the price filter, not the whole collection.

**`GET /api/books/:id`** → `200` `{ "book": { ... } }` with the **full** author document. `404 Book not found`.

**`POST /api/books`** (admin) → `201` `{ "message": "book added successfully", "data": book }`

| Field         | Rules                                                   |
| ------------- | ------------------------------------------------------- |
| `title`       | required, 3–250 characters                              |
| `author`      | required, 24-character hex id of an **existing** author |
| `description` | required, at least 5 characters                         |
| `price`       | required, number `>= 0`                                 |
| `cover`       | required, `soft cover` or `hard cover`                  |

Errors: `400` validation, `404 author not found`.

**`PUT /api/books/:id`** (admin): any subset of the fields above. `200` `{ "message": "Book updated successfully", "data": book }`. Errors: `400`, `404 Book not found`, `404 author not found` (when `author` is sent).

**`DELETE /api/books/:id`** (admin) → `200` `{ "message": "Book has been deleted successfully" }`.

### Authors

**`GET /api/authors`** → `200` `{ "authorsList": [ ... ], "total", "pages", "pageNumber", "limit" }`. **`GET /api/authors/:id`** → `200` `{ "author": { ... } }`, `404 Author not found`.

**`POST /api/authors`** (admin) → `201` `{ "message": "author added successfully", "data": author }`

| Field         | Rules                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `firstName`   | required, 3–15 characters                                                                           |
| `lastName`    | required, 3–15 characters                                                                           |
| `nationality` | required, 3–25 characters                                                                           |
| `image`       | optional, 5–100 characters; usually the `filename` returned by an upload. Defaults to `default.png` |

The server does not check that the image file exists.

**`PUT /api/authors/:id`** (admin): any subset of the fields above → `200` `{ "message": "Author updated successfully", "data": author }`.

**`DELETE /api/authors/:id`** (admin) → `200` `{ "message": "Author and his books have been deleted successfully" }`. The author's books are deleted first and then the author. These are two separate operations, not a transaction.

### Uploads

**`POST /api/uploads`** (admin): see [Image Uploads](#image-uploads).

## Pagination

All three list endpoints (`/api/books`, `/api/authors`, `/api/users`) behave the same way:

- `pageNumber` defaults to `1` and `limit` defaults to `12` (maximum `50`). Omitting both can never return the whole collection.
- Results are sorted by `createdAt` descending with `_id` as a tie-breaker, so pages are stable and never overlap.
- Each response keeps its existing list key (`books`, `authorsList` or `data`) and adds `total`, `pages`, `pageNumber` and `limit`.
- A page past the end returns an empty list with the correct `pages` value, not an error.

| Field        | Meaning                                              |
| ------------ | ---------------------------------------------------- |
| `total`      | Number of items matching the request (after filters) |
| `pages`      | `ceil(total / limit)`                                |
| `pageNumber` | The page that was returned                           |
| `limit`      | The page size that was applied                       |

Pagination uses `skip` and `limit`, which is simple and fine at catalog scale. For very large collections, cursor-based pagination avoids the cost of skipping.

## Data Models

```mermaid
erDiagram
  AUTHOR ||--o{ BOOK : writes
  AUTHOR {
    ObjectId _id
    string firstName
    string lastName
    string nationality
    string image
  }
  BOOK {
    ObjectId _id
    string title
    ObjectId author
    string description
    number price
    string cover
  }
  USER {
    ObjectId _id
    string email
    string username
    string password
    boolean isAdmin
  }
```

All models also carry `createdAt` and `updatedAt` timestamps.

| Model  | Field         | Rules                                                             |
| ------ | ------------- | ----------------------------------------------------------------- |
| Author | `firstName`   | required, trimmed, 3–15 characters                                |
|        | `lastName`    | required, trimmed, 3–15 characters                                |
|        | `nationality` | required, trimmed, 3–25 characters                                |
|        | `image`       | string, default `default.png`                                     |
| Book   | `title`       | required, trimmed, 3–250 characters                               |
|        | `author`      | required, ObjectId reference to Author, **indexed**               |
|        | `description` | required, trimmed, at least 5 characters                          |
|        | `price`       | required, `>= 0`, **indexed**                                     |
|        | `cover`       | required, `soft cover` or `hard cover`                            |
| User   | `email`       | required, **unique index**, trimmed, lowercased, 5–254 characters |
|        | `username`    | required, trimmed, 2–200 characters                               |
|        | `password`    | required, bcrypt hash (cost 11), **`select: false`**              |
|        | `isAdmin`     | boolean, default `false`                                          |

`password` is excluded from query results by default. Any query that needs the hash (login, password reset) must opt in with `.select("+password")`.

### Indexes

| Collection | Index            | Purpose                                                                   |
| ---------- | ---------------- | ------------------------------------------------------------------------- |
| all        | `_id`            | Automatic. Serves lookups by id and the author `populate`.                |
| `users`    | `email` (unique) | Fast login lookups and duplicate-account protection.                      |
| `books`    | `author`         | Cascade delete of an author's books and future "books by author" queries. |
| `books`    | `price`          | Price-range filter on `GET /api/books`.                                   |

Mongoose builds missing indexes when the app connects. The book list sorts by `createdAt` and `_id`, so a price-filtered page still sorts its matches in memory; a compound index matching both filter and sort would be the next step if the catalog grows large. Verify index usage with `explain("executionStats")` in `mongosh` and look for `IXSCAN`.

## Validation Rules

Requests are validated with Joi before the database is touched; Mongoose schemas act as a second layer.

- **Email:** valid format, 5–254 characters, trimmed and lowercased.
- **Username:** 2–200 characters.
- **Password** (register, update, reset): 8–72 characters with at least one lowercase letter, one uppercase letter, one digit and one special character. 72 is bcrypt's input limit.
- **Login password:** required, at most 72 characters (no strength check, so existing accounts can always log in).
- **Ids:** `:id` params must be valid ObjectIds. A book's `author` must be a 24-character hex string.
- **Query strings:** `pageNumber`, `limit`, `minPrice` and `maxPrice` are validated; unknown parameters are rejected.
- **Bodies:** user endpoints report every problem at once and drop unknown fields; book and author endpoints reject unknown fields.

## Image Uploads

`POST /api/uploads` is **admin only** and expects `multipart/form-data` with one file in the field **`image`**.

```bash
curl -X POST http://localhost:5000/api/uploads \
  -H "token: <JWT>" -F "image=@cover.jpg"
```

Checks, in order:

1. At most one file, up to **5 MB** (`413` otherwise).
2. The extension and the declared MIME type must be JPEG, PNG, WebP or GIF (`415` otherwise).
3. The real file content is inspected (magic bytes) and must be one of those image types (`415` otherwise).
4. The file is written to the upload directory under a random UUID name. The client's filename is never used.

Invalid files never touch the disk because the upload is held in memory until it is verified.

`201`

```json
{
  "message": "image uploaded successfully",
  "filename": "e93f2f9f-5a9b-4373-b1d7-e7fe08048274.png",
  "size": 69,
  "mimetype": "image/png"
}
```

Upload errors use `{ "error": "..." }`: `400` no file or wrong field name, `413` too large, `415` unsupported type.

Files in `images/` are served statically at the **root** of the server, for example `http://localhost:5000/e93f2f9f-5a9b-4373-b1d7-e7fe08048274.png`, and are public. Send the returned `filename` as an author's `image` to attach it. `helmet` is configured with `Cross-Origin-Resource-Policy: cross-origin`, so a separate front-end origin can display these images.

> **`UPLOAD_DIR` caveat:** uploads are written to `UPLOAD_DIR` (default `./images`), but the static file server only serves the project's `images/` folder. If you set `UPLOAD_DIR` to another location, uploaded files are saved but not served by this API. The tests use this setting to keep your real `images/` untouched.

> **Production note:** images are stored on the local disk. On platforms with an ephemeral filesystem, uploads are lost on every redeploy or restart. Mount a persistent volume at `images/` or move to object storage before relying on uploads in production.

## Password Reset Flow

1. The user opens `GET /api/auth/forgot-password` and submits their email.
2. The email is validated. For a registered account the server signs a token that lasts **15 minutes**, using `JWT_SECRET` combined with the user's current password hash. The token therefore stops working as soon as the password changes (so a link is effectively single-use), and a login token can't be used as a reset token.
3. A link `<BASE_URL>/api/auth/reset-password/<userId>/<token>` is emailed through the configured SMTP server. If sending fails, the error is logged and the user still sees the same page.
4. The user opens the link and submits a new password that meets the [password rules](#validation-rules).
5. The password is hashed and saved, and a success page asks the user to log in again.

The page shown after step 1 is the same whether or not the account exists, so the form can't be used to discover which emails are registered.

On both the `GET` and `POST` reset links, a malformed user id, an unknown user and an invalid or expired token all return the same answer: `400 { "message": "Invalid or expired reset link" }`. A password that fails the rules returns `400` with the rule that failed (as JSON, not on the form).

The pages in `views/` (`forgot-password`, `link-sent`, `reset-password`, `success-reset-password`) are EJS templates styled with Bootstrap from a CDN.

## Rate Limiting

The following routes are limited per client IP:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:userId/:token`

| Setting      | Value                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| Window       | 15 minutes                                                                               |
| Limit        | 10 requests per IP, **shared across the four routes above**                              |
| On exceeding | `429 { "message": "Too many requests from this IP, please try again after 15 minutes" }` |
| Headers      | Standard `RateLimit` headers are sent; legacy `X-RateLimit-*` are off                    |

Details worth knowing:

- Every request counts toward the limit, successful or not. Because the counter is shared, repeated login attempts also use up the budget for requesting a password reset.
- Counters are kept **in memory** in the Node process, so they reset on restart or redeploy and are not shared between instances. Running several instances would require a shared store such as Redis.
- `trust proxy` is set to `1`, so the real client IP is read from the platform's proxy. If you deploy behind a different number of proxies, adjust this value in `src/app.ts`, otherwise all users may share one counter.
- `createApp({ rateLimitMax })` lets tests (or other callers) override the limit; the default of 10 is what production uses.
- Public catalog reads are not rate limited.

## CORS

Browsers may call the API only from origins listed in `CORS_ORIGINS` (comma-separated, no trailing slashes). The default is `http://localhost:3000`. Requests without an `Origin` header (curl, Postman, server-to-server) are not affected, because CORS is enforced by browsers, not by the server. Credentials (cookies) are not enabled, since authentication uses the `token` header.

To verify the configuration:

```bash
# Allowed origin: the response includes Access-Control-Allow-Origin
curl -i -H "Origin: http://localhost:3000" $BASE/healthcheck

# Other origin: the Access-Control-Allow-Origin header is absent
curl -i -H "Origin: http://evil.example" $BASE/healthcheck
```

## Health Check

`GET /healthcheck` is public, has no authentication or rate limiting, and reports whether Mongoose currently has an open database connection.

| Response                    | Meaning                                            |
| --------------------------- | -------------------------------------------------- |
| `200 { "status": "ok" }`    | The server is up and connected                     |
| `503 { "status": "error" }` | The server is up but the database is not connected |

Use it for the hosting platform's health check and for an external uptime monitor. It checks the connection state only; it does not run a query.

## Error Handling

Unknown routes return `404 { "message": "Not found <url>" }`. Everything thrown or rejected reaches the central `errorHandler`, which maps known error types:

| Error                               | Status    | Response message                                                                     |
| ----------------------------------- | --------- | ------------------------------------------------------------------------------------ |
| Malformed JSON body, oversized body | 400 / 413 | The parser's own message                                                             |
| Mongoose `CastError`                | 400       | `Invalid <field>`                                                                    |
| Mongoose `ValidationError`          | 400       | The failing field messages, joined                                                   |
| Duplicate key (`11000`)             | 409       | `<field> already exists`                                                             |
| Any other error                     | 500       | The error message in development; `Internal server error` when `NODE_ENV=production` |

Errors with a status of 500 or above are always logged with `console.error`. Expected failures (validation, auth, not found) are answered directly by the controllers and middleware.

| Status    | Meaning                                     |
| --------- | ------------------------------------------- |
| 200 / 201 | Success / created                           |
| 400       | Validation error, bad input or invalid id   |
| 401       | Missing, invalid or expired token           |
| 403       | Authenticated but not allowed               |
| 404       | Resource or route not found                 |
| 409       | Duplicate value (for example, email in use) |
| 413 / 415 | Upload too large / unsupported file type    |
| 429       | Rate limit exceeded                         |
| 500       | Unexpected server error                     |
| 503       | Health check: database not connected        |

## Security

**In place**

- Passwords are hashed with bcrypt (cost 11), never returned by the API, and required to meet a strength policy.
- Login failures use one message for both wrong email and wrong password.
- JWTs expire after 1 day; role and ownership checks run in middleware before controllers.
- Users can't change `isAdmin` through any endpoint.
- Every request body, query string and id is validated before reaching the database. Non-string values for email fields are rejected, which blocks MongoDB operator injection.
- Password reset: short-lived tokens bound to the current password hash, identical responses for known and unknown accounts, no account enumeration.
- Uploads: admin only, size-limited, verified by content, stored under random names, never executed.
- Rate limiting on registration, login and the password-reset endpoints.
- CORS restricted to an explicit allow-list of origins.
- `helmet` sets security headers (CSP, HSTS, `nosniff`, and others). HSTS only takes effect over HTTPS, which hosting platforms provide.
- Secrets and credentials are read from environment variables only, and `.env` is git-ignored.
- The seeder refuses to run against any database other than `SEED_DB_NAME`.
- The app refuses to start without `MONGO_URI`, `JWT_SECRET` and `BASE_URL`.
- Privilege-escalation, injection-style and fake-upload cases are covered by automated tests (see [Testing](#testing)).

**Not yet in place** (tracked in the [checklist](#production-readiness-checklist))

- A shared rate-limit store for multi-instance deployments.
- Token revocation and refresh tokens.
- Requiring the current password to change a password.
- Automated dependency and vulnerability scanning in CI.

## Testing

The suite uses **Vitest** as the runner, **Supertest** for HTTP assertions and **mongodb-memory-server** for a real, throw-away MongoDB per test file. No Docker, no Atlas and no `.env` file are needed; `tests/helpers/setupEnv.ts` provides the environment and points uploads at a temporary folder so your real `images/` directory is never touched.

```bash
npm test                    # whole suite, once
npm run test:unit           # tests/unit: fast, no database
npm run test:integration    # tests/integration: Supertest + in-memory MongoDB
npm run test:watch          # re-run on save
npm run test:coverage       # coverage to the terminal and coverage/index.html
npm run typecheck           # tsc --noEmit over src and tests
```

> The first integration run downloads a MongoDB binary (about 100 MB) into `~/.cache/mongodb-binaries`, so it needs internet access once. Later runs start in about a second.

| Layer       | What it covers                                                                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Joi schemas, password hashing, token and role middleware, `validateObjectId`, the central error handler, env checks, DB connection paths, the email service (transport mocked), seed-data integrity |
| Integration | CRUD and pagination for books, authors and users; register, login and the full forgot/reset flow; uploads (types, fake content, size, naming); rate limiting; health check, 404/500 handling, helmet, CORS; model rules and indexes; the seeder and its database-name guard |

Tests run in parallel worker processes and each integration file owns its database, so tests never leak data into each other. Email is never sent: `sendEmail` is mocked in the auth tests. See [TESTING.md](TESTING.md) for the file-by-file breakdown, how the app is wired for testing, and troubleshooting.

Before opening a pull request, run:

```bash
npm run typecheck && npm test
```

## Deployment

The reference deployment is **Render** (web service) with **MongoDB Atlas** (database). Any platform that runs Node 20.11+ and can set environment variables works the same way.

```mermaid
flowchart LR
  G[GitHub repo] -->|deploy on push| R["Render web service<br/>build: tsc → dist/"]
  R --> A[(MongoDB Atlas)]
  U[Uptime monitor] -->|/healthcheck| R
```

The service runs the **compiled** output (`node dist/server.js`), not the TypeScript sources.

### MongoDB Atlas

1. Create a cluster (the free shared tier is enough for a demo).
2. Create a database user with a strong password. Avoid special characters in it, or URL-encode them.
3. Under **Network Access**, allow the hosting platform to connect. Free hosts use changing IP addresses, so this is usually `0.0.0.0/0`; the database user's password then becomes your main protection, so keep it strong.
4. Copy the connection string and put the database name before the `?`, for example `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/bookStoreDB?retryWrites=true&w=majority`.

### Render web service

1. Create a **Web Service** from the GitHub repository.
2. **Build command:** `npm ci --include=dev && npm run build` **Start command:** `npm start`.

   > The TypeScript compiler is a dev dependency. Render sets `NODE_ENV=production`, which makes a plain `npm ci` skip dev dependencies and the build fail. `--include=dev` installs them for the build step.

3. Set the environment variables:

   | Variable       | Production value                                           |
   | -------------- | ---------------------------------------------------------- |
   | `NODE_ENV`     | `production`                                               |
   | `MONGO_URI`    | The Atlas connection string, including the database name   |
   | `JWT_SECRET`   | A freshly generated secret (`openssl rand -base64 48`)     |
   | `BASE_URL`     | The public service URL, with `https` and no trailing slash |
   | `CORS_ORIGINS` | The front-end origin(s) allowed to call the API            |
   | `SMTP_*`       | Real SMTP credentials if password-reset emails are needed  |

4. `BASE_URL` is only known after the first deploy: deploy once, copy the service URL, set `BASE_URL`, and redeploy.
5. Set the platform health check path to `/healthcheck`.
6. Do not set `PORT`; the platform provides it.

### First release checklist

1. Run `npm run typecheck && npm test` locally and confirm they pass.
2. Seed the database once (see [Seeding the database](#seeding-the-database)), running the command locally with `MONGO_URI` and `SEED_DB_NAME` pointing at Atlas for that run only.
3. Register a user through the live API and promote it to admin in Atlas (see [Create the first admin](#create-the-first-admin)). Log in again to get a fresh token.
4. Run the smoke test below.
5. Add an external uptime monitor on `/healthcheck`.

### Smoke test

```bash
BASE=https://YOUR-SERVICE.onrender.com

curl -i $BASE/healthcheck                          # 200 {"status":"ok"}
curl "$BASE/api/books"                             # 12 books with total, pages, pageNumber, limit
curl "$BASE/api/books?limit=100"                   # 400, limit above 50
curl "$BASE/api/books?minPrice=10&maxPrice=15"     # total matches the filter
curl -i -H "Origin: http://evil.example" $BASE/healthcheck   # no Access-Control-Allow-Origin header
# Log in as admin, then create an author and a book with the token header
# Send 11 quick login requests: the 11th returns 429
```

### Seeding the database

`src/seeder.ts` populates a demo catalog from `src/data.ts`: **6 authors and 16 books**. It runs through `tsx`, a dev dependency, so run it from a development checkout rather than from the deployed service.

| Command               | Effect                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run seed:import` | Deletes all books and authors, inserts the authors, then inserts the books linked to the right author by name |
| `npm run seed:delete` | Deletes all books and authors                                                                                 |
| any other argument    | Prints usage and exits with code 1                                                                            |

Safety and behavior:

- The seeder **only runs when the connected database name equals `SEED_DB_NAME`**. Otherwise it prints both names and exits without changing anything.
- Each book in `src/data.ts` carries an `authorName`; the seeder resolves it to the real `_id` and stops with a clear error naming the book if an author is missing.
- It is idempotent: running it twice leaves the same data.
- Users are never modified.
- It exits by itself with code `0` on success and `1` on failure.
- It is a development and demo tool. Don't run it against a database holding real catalog data.

### Operations notes

- **Logging:** the app writes to stdout and stderr via `console`; there is no request logging or log levels yet. Collect output with the platform's log viewer.
- **Health checks:** point the platform and an uptime monitor at `GET /healthcheck`. Free instances may still sleep depending on the provider's policy.
- **Shutdown:** there is no graceful shutdown handler. Redeploys may drop in-flight requests.
- **Proxy awareness:** `trust proxy` is set to `1`, matching a single reverse proxy in front of the app.
- **Uploads:** stored on the local disk. Use a persistent volume or object storage if uploads must survive redeploys.
- **Rate limiter:** in-memory, so it resets on each restart or deploy.
- **Indexes:** built automatically on startup. On very large collections, consider creating indexes through a controlled migration instead.
- **Source maps:** the build emits source maps next to the compiled files. Run Node with `--enable-source-maps` if you want stack traces that point at the `.ts` lines.

## Production Readiness Checklist

| Area                                    | Status | Notes                                                                           |
| --------------------------------------- | :----: | ------------------------------------------------------------------------------- |
| Strict TypeScript and build             |   ✅   | `strict` and `noUncheckedIndexedAccess`; `npm run build` emits `dist/`           |
| Automated tests                         |   ✅   | Vitest unit and integration suites against an in-memory MongoDB                |
| Input validation (bodies, queries, ids) |   ✅   | Joi plus `validateObjectId`                                                     |
| Authentication and role checks          |   ✅   | JWT, owner-or-admin, admin-only                                                 |
| Password storage and reset              |   ✅   | bcrypt, expiring tokens bound to the password hash                              |
| Central error handling                  |   ✅   | Maps cast, validation and duplicate-key errors; hides 5xx details in production |
| Security headers                        |   ✅   | `helmet`                                                                        |
| Secure uploads                          |   ✅   | Admin only, content-verified, random names                                      |
| Secrets in environment                  |   ✅   | `.env` git-ignored, `.env.example` provided                                     |
| Rate limiting                           |   ✅   | 10 requests per 15 minutes per IP on auth routes (in-memory store)              |
| Restricted CORS                         |   ✅   | Allow-list from `CORS_ORIGINS`                                                  |
| Startup environment validation          |   ✅   | Fails fast when `MONGO_URI`, `JWT_SECRET` or `BASE_URL` is missing              |
| Health endpoint                         |   ✅   | `GET /healthcheck`, database-aware                                              |
| Pagination safety and stable ordering   |   ✅   | Default page and limit, max 50, sorted by `createdAt` and `_id`                 |
| Database indexes                        |   ✅   | `Book.author`, `Book.price`, `User.email`                                       |
| Reproducible demo data                  |   ✅   | Guarded, idempotent seeder                                                      |
| Continuous integration                  |   ⬜   | No CI workflow yet; tests and typecheck run locally                             |
| Graceful shutdown                       |   ⬜   | Needed for zero-downtime deploys                                                |
| Request logging and monitoring          |   ⬜   | Structured logs, error tracking                                                 |
| Persistent upload storage               |   ⚠️   | Local disk; use a volume or move to object storage                              |
| Shared rate-limit store                 |   ⚠️   | In-memory counters reset on restart and are per instance                        |
| Token revocation                        |   ⚠️   | Tokens live 1 day; deleted or demoted users keep access until expiry            |
| Atomic cascade delete                   |   ⚠️   | Author and books are removed in two steps                                       |

✅ done · ⚠️ works with a known limitation · ⬜ not done

### Known limitations

- The reset-password page shows a weak-password error as raw JSON.
- The password-reset views load Bootstrap `6.0.0-alpha.1` from a CDN with a pinned integrity hash. If that version or hash doesn't match a published file, the browser blocks the stylesheet and the pages render unstyled. Pin a stable Bootstrap release and its matching SRI hash.
- `UPLOAD_DIR` changes where uploads are written but not where static files are served from (see [Image Uploads](#image-uploads)).
- The seeder needs dev dependencies (`tsx`), so it is run from a development checkout.
- Duplicate registration is guarded by a lookup and by the unique index; under a race the loser receives `409`.
- Pagination uses `skip`, which gets slower on very deep pages of very large collections.

## Troubleshooting

| Symptom                                                 | Likely cause and fix                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Server exits right after start with `missing variables` | One or more of `MONGO_URI`, `JWT_SECRET`, `BASE_URL` is not set. The message lists every missing name.               |
| Server exits after `Failed to connect to db`            | Check `MONGO_URI`, credentials, the database user's password encoding and Atlas network access.                      |
| `npm start` fails with `Cannot find module .../dist/server.js` | The project hasn't been compiled. Run `npm run build` first.                                                  |
| Render build fails with `tsc: not found`                | Dev dependencies were skipped. Use the build command `npm ci --include=dev && npm run build`.                        |
| `npm run typecheck` reports errors after pulling        | Run `npm install` so the type packages match `package-lock.json`, then re-run.                                       |
| First request after a while is very slow                | A free instance was asleep. It wakes on the first request.                                                           |
| Seeder prints `Refusing to run`                         | The database in `MONGO_URI` differs from `SEED_DB_NAME`. Make them match, or you are pointing at the wrong database. |
| Login returns 500 with a JWT error                      | `JWT_SECRET` is missing from the environment.                                                                        |
| `429 Too many requests`                                 | More than 10 requests to the auth routes from one IP in 15 minutes. Wait for the window to pass.                     |
| Everyone gets `429` at the same time in production      | `trust proxy` doesn't match the proxy setup, so all users share one IP. Adjust the value in `src/app.ts`.            |
| Reset email never arrives                               | Check the `SMTP_*` values and the server log. Send failures are logged but hidden from the user.                     |
| Reset link starts with `undefined/`                     | `BASE_URL` is missing.                                                                                               |
| Reset link says "Invalid or expired reset link"         | The link is older than 15 minutes, the password already changed, or the URL was altered. Request a new link.         |
| Reset or forgot-password page looks unstyled            | The Bootstrap CDN link or its integrity hash is wrong; see Known limitations.                                        |
| `400 Invalid id`                                        | The `:id` isn't a 24-character hex ObjectId.                                                                         |
| `400 "<name>" is not allowed`                           | The request has a field or query parameter that endpoint doesn't accept.                                             |
| `400 "limit" must be less than or equal to 50`          | The maximum page size is 50.                                                                                         |
| Admin actions return 403 after promoting a user         | The old token still says `isAdmin: false`. Log in again.                                                             |
| `GET /api/author` returns 404                           | The route is `/api/authors` (plural).                                                                                |
| Uploaded images disappear after a redeploy              | The host's disk is ephemeral. Mount a persistent volume at `images/`.                                                |
| Browser blocks calls from your front end                | Add the front end's exact origin (scheme, host and port, no trailing slash) to `CORS_ORIGINS` and redeploy.          |
| Tests hang or time out on the first run                 | The MongoDB binary is downloading. Re-run, or see [TESTING.md](TESTING.md) for proxy and offline options.            |

## Development Guide

### Scripts

| Command                    | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `npm run dev`              | Run `src/server.ts` with `tsx watch` (auto-restart on changes)      |
| `npm run build`            | Compile `src/` to `dist/` with `tsc -p tsconfig.build.json`         |
| `npm start`                | Run the compiled app: `node dist/server.js`                         |
| `npm run typecheck`        | Type-check `src` and `tests` without emitting files                 |
| `npm test`                 | Run the whole test suite once                                       |
| `npm run test:unit`        | Unit tests only                                                     |
| `npm run test:integration` | Integration tests only                                              |
| `npm run test:watch`       | Re-run tests on save                                                |
| `npm run test:coverage`    | Tests with a V8 coverage report                                     |
| `npm run seed:import`      | Reset and seed demo data (guarded by `SEED_DB_NAME`)                |
| `npm run seed:delete`      | Remove all books and authors                                        |

### Conventions

- TypeScript with `strict` and `noUncheckedIndexedAccess`; no `any` without a reason. ES Modules everywhere (`"type": "module"`).
- Relative imports use the **`.ts`** extension (for example `./app.ts`), consistently across `src` and `tests`.
- Routes declare paths and middleware only; logic lives in controllers.
- Each controller handler is wrapped in `expressAsyncHandler` and documented with a JSDoc block (`@description`, `@route`, `@method`, `@access`).
- Validate the body or query with Joi **first**, then touch the database. Read values from the validated `value` object so defaults apply. Return `400 { message }` for validation errors and `404 { message }` for missing resources.
- List endpoints follow the pagination contract: validated `pageNumber` and `limit`, stable sort, list and count in parallel with the same filter, and the five response fields.
- Routes with an `:id` param place `validateObjectId` after the auth middleware.
- Never return `password`. Queries that need it must use `.select("+password")` explicitly.
- Add a rate limiter to any new public route that sends email or checks credentials.
- Keep `createApp()` free of side effects (no DB connection, no `listen`) so it stays testable.
- Every behavior change ships with a test, and `npm run typecheck && npm test` must pass.

### Adding a new resource

1. Create the Mongoose model in `src/models/<Name>.model.ts`, adding indexes for fields you filter or join on.
2. Add the Joi schemas in `src/controllers/<name>/utils/`.
3. Write the controller with JSDoc and `expressAsyncHandler`.
4. Add the router in `src/routes/<name>.route.ts`, choosing the right `verifyToken*` middleware and adding `validateObjectId` for `:id` routes.
5. Mount the router in `src/app.ts` under `/api/<name>`.
6. Add unit tests for the validators and integration tests for the endpoints.
7. Document the endpoints in this README and add a changelog entry.

## Roadmap

1. **Quality:** CI pipeline (typecheck, tests, coverage threshold, dependency audit).
2. **Operations:** graceful shutdown, request logging, error monitoring, Docker and docker-compose.
3. **Scaling:** Redis for caching the catalog and for a shared rate-limit store; object-storage uploads.
4. **Catalog:** search, sorting options, cursor-based pagination, compound indexes for filtered and sorted lists.
5. **Security:** `Authorization: Bearer` tokens, refresh tokens or token revocation, current password required to change a password.
6. **API:** versioned routes (`/api/v1`), OpenAPI specification, consistent response shapes.
7. **Features:** cart and orders with transactions, inventory.

## Changelog

### v3.0.0

TypeScript release: the whole project was migrated from JavaScript to TypeScript and an automated test suite was added. **The HTTP API is unchanged**: endpoints, validation rules, status codes and JSON shapes are the same as v2.4.0, so existing clients keep working.

**Changes that affect how you build, run and deploy**

- The code now lives in `src/`. `app.js` is replaced by `src/app.ts` (the app factory) and `src/server.ts` (the entry point).
- Production runs compiled output: `npm run build` then `npm start` (`node dist/server.js`). Render's build command must be `npm ci --include=dev && npm run build`.
- Development uses `npm run dev` (`tsx watch`) instead of nodemon.
- The seeder is now `npm run seed:import` and `npm run seed:delete` (previously `node seeder -import` and `-delete`).
- `nodemon` is removed; `typescript`, `tsx` and the `@types/*` packages are new dev dependencies.

**Added**

- **TypeScript:** strict mode with `noUncheckedIndexedAccess`; typed models, middleware and controllers; an Express `Request` augmentation for the authenticated user; separate `tsconfig.json` (src and tests) and `tsconfig.build.json` (src only, with source maps).
- **Tests:** Vitest unit and integration suites with Supertest and `mongodb-memory-server`, covering validators, auth middleware, error handling, all resources, the password-reset flow, uploads, rate limiting, the health check, model rules and the seeder. Scripts for unit, integration, watch and coverage runs, plus `npm run typecheck`.
- **Testability refactor:** `createApp()` builds the app without I/O, `createLimiter(limit)` and `createApp({ rateLimitMax })` make the rate limit injectable, and `UPLOAD_DIR` lets uploads be redirected.
- **Docs:** [TESTING.md](TESTING.md), plus Testing and TypeScript sections in this README.
- `images/default.png` is now committed (the rest of `images/` stays git-ignored).

### v2.4.0

Deployment release: the API is now configured to run on Render with MongoDB Atlas.

**Behavior changes to be aware of**

- `GET /api/books` without `pageNumber` now returns the first page (12 books) instead of the whole catalog.
- The default and maximum page sizes changed: the fixed size of 2 is replaced by `limit` (default 12, max 50) on books, authors and users.
- CORS is no longer open to every origin. Set `CORS_ORIGINS` to the origins that need browser access.
- The app now exits at startup when `MONGO_URI`, `JWT_SECRET` or `BASE_URL` is missing.

**Added**

- **Pagination:** `limit` parameter, stable sort (`createdAt` descending, `_id` tie-breaker), and `total`, `pages`, `pageNumber`, `limit` in every list response. Book totals respect the price filter.
- **Rate limiting:** 10 requests per 15 minutes per IP on register, login, forgot-password and reset-password POST routes, with JSON `429` responses and standard headers. `trust proxy` is set for hosted deployments.
- **Health check:** `GET /healthcheck` returns `200` or `503` based on the database connection.
- **Indexes:** `Book.author` and `Book.price`.
- **Seeder rewrite:** one idempotent `-import` command that creates 6 authors and 16 books linked by author name, a `-delete` command, and a guard that only runs on the database named in `SEED_DB_NAME`.
- **Configuration:** new `CORS_ORIGINS` and `SEED_DB_NAME` variables in `.env.example`.
- **Documentation:** deployment, rate limiting, CORS, health check and seeding sections, and an updated readiness checklist.

### v2.3.1

**Breaking:** the authors resource moved from `/api/author` to **`/api/authors`**. Update any client that uses the old path.

- **Fixed login and password reset:** the hashed password is `select: false`, so the auth queries now opt in with `.select("+password")`. Reset tokens are now really bound to the current password.
- **Forgot-password hardening:** the email is validated with Joi (blocks query-operator injection) and the response no longer reveals whether an account exists. Reset links use the new `BASE_URL` variable.
- **Reset links:** malformed ids, unknown users and invalid or expired tokens return `400 Invalid or expired reset link`.
- **Invalid ids:** new `validateObjectId` middleware on every `/:id` route. A book's `author` is validated as a 24-character hex id and must exist, on both create and update.
- **Query validation:** `pageNumber`, `minPrice` and `maxPrice` are validated; authors and users default to page 1; invalid values return 400 instead of 500.
- **Central error handler:** maps `CastError` and `ValidationError` to 400 and duplicate keys to 409, honors the status carried by body-parser errors (a broken JSON body is now 400, not 500), logs 5xx errors, and hides internal messages when `NODE_ENV=production`.
- **Uploads are now admin only.**
- **Scripts:** `npm start` runs plain `node app.js`; `npm run dev` runs nodemon. The package declares `engines.node >= 20.11`.
- **Startup:** the server exits when it can't connect to MongoDB.
- **Housekeeping:** `images/` is git-ignored and `deleteUser` no longer deletes twice.

### v2.3

- **Password reset by email:** forgot and reset flow with EJS views, 15-minute tokens and Nodemailer.
- **Image uploads:** `POST /api/uploads` with size, extension, MIME and magic-byte checks; files served statically.
- **Security headers and CORS:** `helmet` and `cors` enabled.
- **Stricter user validation:** strong passwords, normalized emails, unknown fields stripped.
- **`.env.example`** added.

### v2.2

- **Controller layer:** route handlers moved from `routes/` into `controllers/`, so routes only declare paths and middleware. Joi validators live next to their controllers.
- **Pagination:** `pageNumber` query parameter on books, authors and users.
- **Price filtering:** `minPrice` and `maxPrice` on `GET /api/books`.
- **Cascade delete:** deleting an author also deletes their books.
- **Author checks on book creation.**
- **Database seeding:** `seeder.js` and `data.js`.
- **DB config:** connection logic extracted to `config/connectToDB.js`.
- **Async errors:** controllers wrapped with `express-async-handler`.

### v2.1

- `PUT` on a non-existent id returns **404** for books, authors and users.
- Email uniqueness enforced by a `unique` index on `User.email`.

## Author & License

Built by **Omar Khairy** · [github.com/OmarKh006/bookStore](https://github.com/OmarKh006/bookStore)

Licensed under the ISC License.