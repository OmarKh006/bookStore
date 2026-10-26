# Testing guide

Stack: **Vitest** (runner) + **Supertest** (HTTP assertions) + **mongodb-memory-server** (a real, throw-away MongoDB per test file — no Docker, no Atlas, nothing to configure).

## 1. One-time setup

```bash
npm install
```

> The first run of the integration tests downloads a MongoDB binary (~100 MB) into `~/.cache/mongodb-binaries`. After that it is cached and tests start in about a second. You need internet access for that first download only.

No `.env` file is needed for tests — `tests/helpers/setupEnv.ts` sets `JWT_SECRET`, `BASE_URL`, SMTP values, etc. and points uploads at a temp folder, so your real `images/` directory is never touched.

## 2. Commands

| Command                    | What it does                                              |
| -------------------------- | --------------------------------------------------------- |
| `npm test`                 | Run the whole suite once                                  |
| `npm run test:watch`       | Re-run affected tests on every save                       |
| `npm run test:unit`        | Only `tests/unit` (fast, no database)                     |
| `npm run test:integration` | Only `tests/integration` (Supertest + in-memory MongoDB)  |
| `npm run test:coverage`    | Run everything and print/write a coverage report          |
| `npm run typecheck`        | `tsc --noEmit` over `src` and `tests`                     |

Run a single file or a single test:

```bash
npx vitest run tests/integration/books.test.ts
npx vitest run -t "paginates"                 # by test name
npx vitest run tests/unit --reporter=verbose  # list every test
```

Coverage output goes to the terminal and to `coverage/index.html`.

## 3. What is covered

**Unit (`tests/unit`)** – pure logic, no DB, no network

| File                       | Covers                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `validateAuthor.test.ts`   | Joi schemas for create/update author and page query                                |
| `validateBook.test.ts`     | Joi schemas for create/update book and the price/page filter query                 |
| `validateUser.test.ts`     | Register/login/update/forgot/reset schemas, password strength rules and messages   |
| `hashPassword.test.ts`     | bcrypt hash + compare                                                              |
| `verifyToken.test.ts`      | `verifyToken`, `verifyTokenAndAuthorization`, `verifyTokenAndAdmin` (401/403 paths)|
| `validateObjectId.test.ts` | Malformed `:id` rejection                                                          |
| `errorHandlers.test.ts`    | `notFound`, and `errorHandler` mapping (Cast/Validation/duplicate-key/5xx/production) |
| `env.test.ts`              | Required-env-var check                                                             |
| `connectToDB.test.ts`      | Success and failure (exit code 1) paths                                            |
| `sendEmail.test.ts`        | Nodemailer service with the transport mocked                                       |
| `data.test.ts`             | Seed data integrity (every book maps to an author, etc.)                           |

**Integration (`tests/integration`)** – the real Express app via Supertest, real Mongoose models, in-memory MongoDB

| File                | Covers                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `authors.test.ts`   | CRUD, pagination, sort order, admin-only writes, cascade delete of an author's books                     |
| `books.test.ts`     | CRUD, populated author, min/max price filters, pagination, author existence checks, admin-only writes    |
| `auth.test.ts`      | Register, login, forgot/reset password end-to-end (email captured by a mock), single-use reset links     |
| `users.test.ts`     | Admin list, owner-or-admin read/update/delete, password hashing, privilege-escalation attempt, 409 on duplicate email |
| `uploads.test.ts`   | Admin-only upload, PNG/JPEG/GIF/WebP, fake-content rejection, size limit, wrong field, random filenames |
| `rateLimit.test.ts` | 10-requests-per-window limit shared across auth routes, 429 payload, isolation between app instances     |
| `app.test.ts`       | `/healthcheck` (200/503), JSON 404, 500 handling in dev vs production, malformed JSON, helmet, CORS, static files |
| `models.test.ts`    | Schema validation, defaults, trimming/lowercasing, unique email index, `generateToken()`                 |
| `seeder.test.ts`    | Import/delete logic, idempotence, and the `SEED_DB_NAME` safety guard                                    |

## 4. How the tests are wired

- `createApp()` in `src/app.ts` builds the Express app **without** connecting to a DB or listening on a port. `src/server.ts` is the only file that does I/O at startup. Supertest imports `createApp()` directly.
- `createApp({ rateLimitMax })` lets tests pick the rate-limit ceiling; the default (10) matches production and is what `rateLimit.test.ts` asserts.
- Each integration file starts its own `MongoMemoryServer` (`tests/helpers/db.ts`) and clears collections before every test, so files can run in parallel and tests never leak data to each other.
- `tests/helpers/factories.ts` has `createUser`, `createAdmin`, `createAuthor`, `createBook`. They return ready-to-use JWTs: `.set("token", token)`.
- Email is never sent: `sendEmail` is mocked in `auth.test.ts` (and nodemailer itself in `sendEmail.test.ts`).

## 5. Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `Failed to download MongoDB binary` / timeout on first run | Needs internet once. Behind a proxy, set `HTTPS_PROXY`. To use a local mongod instead, set `MONGOMS_SYSTEM_BINARY=/path/to/mongod`. |
| `Hook timed out` in `beforeAll` | First-run download is slow; re-run, or raise `hookTimeout` in `vitest.config.ts`. |
| Tests are slow on a small machine | Limit parallel files: `npx vitest run --pool=forks --poolOptions.forks.maxForks=2`. |
| `ECONNRESET` in upload tests | Make sure nothing else is bound to the test run's ephemeral ports; re-run. |
