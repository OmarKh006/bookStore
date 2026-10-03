# BookStore API

REST backend for a book store, built with Node.js, Express and MongoDB. This repository contains **Phase 2**: on top of the Phase 1 catalog (books and authors), it adds user accounts, JWT authentication, role-based authorization, environment-based configuration and centralized error handling.

## Table of Contents

1. [Scope of Phase 2](#scope-of-phase-2)
2. [Changes Since Phase 1](#changes-since-phase-1)
3. [Tech Stack](#tech-stack)
4. [Architecture Overview](#architecture-overview)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
7. [Authentication and Authorization](#authentication-and-authorization)
8. [Data Models](#data-models)
9. [API Reference](#api-reference)
10. [Validation Rules](#validation-rules)
11. [Error Handling](#error-handling)
12. [Known Limitations](#known-limitations)
13. [Roadmap](#roadmap)
14. [Author and License](#author-and-license)

---

## Scope of Phase 2

Phase 2 turns the open catalog service into a secured API. Everything below is implemented and working today.

- **User accounts**: registration, login and profile management.
- **Password security**: passwords are hashed with bcrypt and never returned in responses.
- **JWT authentication**: login and registration return a signed token that expires after one day.
- **Role-based authorization**: two roles, regular user and administrator. Catalog reads stay public; catalog writes are restricted to administrators.
- **Owner-or-admin access** on user records: a user can read, update and delete their own account, and an administrator can do so for any account.
- **Environment-based configuration** through `dotenv` (port, database URI, JWT secret).
- **Centralized error handling**: a 404 handler for unknown routes and a single error-handling middleware.
- **Author data in book responses**: books now populate their `author` reference.

Everything from Phase 1 (CRUD for books and authors, Joi plus Mongoose validation, timestamps, consistent JSON envelopes) is unchanged unless noted in [Changes Since Phase 1](#changes-since-phase-1).

Out of scope for this phase: pagination, filtering and search, file uploads, orders and cart, refresh tokens, password reset, security headers, CORS and rate limiting, and automated tests. These are tracked in the [Roadmap](#roadmap).

## Changes Since Phase 1

### What is new

| Area           | Change                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Users          | New `User` model, `/api/auth` and `/api/users` routers, and Joi schemas for register, login and update.                             |
| Authentication | JWT issuance on register and login, and a token verification middleware.                                                            |
| Authorization  | `POST`, `PUT` and `DELETE` on `/api/books` and `/api/author` now require an administrator token.                                    |
| Configuration  | Port, MongoDB URI and JWT secret are read from environment variables.                                                               |
| Errors         | `notFound` and `errorHandler` middleware registered after all routers.                                                              |
| Books          | `GET /api/books` populates the author's `_id`, `firstName` and `lastName`; `GET /api/books/:id` populates the full author document. |

### Phase 1 limitations: status

| #   | Phase 1 limitation                             | Status                                                                                                          |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | `PUT` on a missing id returns 200              | Still open                                                                                                      |
| 2   | Malformed ids surface as 500                   | Still open                                                                                                      |
| 3   | Updates skip schema validators                 | Still open                                                                                                      |
| 4   | Book `author` is not verified                  | Still open                                                                                                      |
| 5   | Deleting an author does not affect their books | Still open                                                                                                      |
| 6   | Responses do not populate the author           | **Resolved**                                                                                                    |
| 7   | Hard-coded configuration                       | **Resolved** (`dotenv`)                                                                                         |
| 8   | No pagination, filtering or sorting            | Still open                                                                                                      |
| 9   | No security middleware                         | **Partly resolved**: authentication and authorization added; `helmet`, CORS and rate limiting are still missing |
| 10  | No tests, no centralized error or 404 handler  | **Partly resolved**: error and 404 handlers added; still no tests                                               |
| 11  | Minor inconsistencies                          | Still open                                                                                                      |

## Tech Stack

| Concern            | Choice                | Version  |
| ------------------ | --------------------- | -------- |
| Runtime            | Node.js (ES Modules)  | 20 LTS+  |
| HTTP framework     | Express               | ^5.2.1   |
| Database           | MongoDB               | any 6.x+ |
| ODM                | Mongoose              | ^9.10.3  |
| Request validation | Joi                   | ^18.2.9  |
| Async error bridge | express-async-handler | ^1.2.0   |
| Authentication     | jsonwebtoken          | ^9.0.3   |
| Password hashing   | bcryptjs              | ^3.0.3   |
| Configuration      | dotenv                | ^18.0.5  |
| Dev tooling        | nodemon               | ^3.1.14  |

The project uses native ES Modules (`"type": "module"` in `package.json`), so all imports use the `import` syntax and local imports must include the `.js` extension.

## Architecture Overview

The service keeps the resource-oriented layout from Phase 1 and adds a middleware layer for authentication, authorization and error handling.

```
Client
  |
  v
Express app (app.js)          JSON body parsing, router mounting
  |
  v
Resource router               routes/<resource>/<resource>.route.js
  |        |
  |        +--> Auth guard         middleware/verifyToken.js        (protected routes only)
  |        +--> Joi validator      routes/<resource>/utils/validate<Resource>.js
  v
Mongoose model                models/<resource>/<Resource>.model.js
  |
  v
MongoDB

Unmatched routes  --> notFound  --> errorHandler  --> JSON error response
Thrown errors     ---------------> errorHandler  --> JSON error response
```

Request lifecycle for a protected write operation:

1. `express.json()` parses the request body.
2. The auth guard reads the JWT from the `token` header and verifies it. A missing or invalid token short-circuits with `401`; a valid token without sufficient privileges short-circuits with `403`.
3. The route handler runs the payload through the relevant Joi schema. A failure short-circuits with `400`.
4. The handler calls the Mongoose model. Schema-level constraints act as a second line of defense.
5. The result is serialized into a JSON envelope and returned with the appropriate status code.

Every handler is wrapped in `express-async-handler`, so rejected promises are forwarded to the `errorHandler` middleware instead of becoming unhandled rejections.

Routers are mounted in `app.js` in this order, followed by `notFound` and `errorHandler`:

| Base path     | Router                            |
| ------------- | --------------------------------- |
| `/api/books`  | `routes/books/books.route.js`     |
| `/api/author` | `routes/authors/authors.route.js` |
| `/api/auth`   | `routes/users/auth.route.js`      |
| `/api/users`  | `routes/users/users.route.js`     |

## Project Structure

```
bookStore/
├── app.js                              Application entry point
├── package.json
├── package-lock.json
├── .gitignore
├── .env                                Local configuration (you create it; ignored by git)
├── middleware/
│   ├── errorHandlers.js                notFound and errorHandler
│   ├── hashPassword.js                 bcrypt hash and compare helpers
│   └── verifyToken.js                  JWT authentication and authorization guards
├── models/
│   ├── author/
│   │   └── Author.model.js             Author schema and model
│   ├── book/
│   │   └── Book.model.js               Book schema and model
│   └── user/
│       └── User.model.js               User schema and model
└── routes/
    ├── authors/
    │   ├── authors.route.js            Author endpoints
    │   └── utils/
    │       └── validateAuthor.js       Joi schemas for create and update
    ├── books/
    │   ├── books.route.js              Book endpoints
    │   └── utils/
    │       └── validateBook.js         Joi schemas for create and update
    └── users/
        ├── auth.route.js               Register and login endpoints
        ├── users.route.js              User management endpoints
        └── utils/
            └── validateUser.js         Joi schemas for register, login and update
```

## Getting Started

### Prerequisites

- Node.js 20 LTS or later
- A running MongoDB instance (local or hosted)

### Installation

```bash
git clone https://github.com/OmarKh006/bookStore.git
cd bookStore
npm install
```

### Environment variables

Create a `.env` file in the project root. It is excluded from version control by `.gitignore`.

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/bookStoreDB
JWT_SECRET=replace-with-a-long-random-string
```

| Variable     | Required | Default | Purpose                                                          |
| ------------ | -------- | ------- | ---------------------------------------------------------------- |
| `MONGO_URI`  | yes      | none    | MongoDB connection string, including the database name.          |
| `JWT_SECRET` | yes      | none    | Secret used to sign and verify tokens. Use a long, random value. |
| `PORT`       | no       | `5000`  | HTTP port.                                                       |
| `NODE_ENV`   | no       | none    | Currently only shown in the startup log message.                 |

### Running the server

```bash
npm start
```

The `start` script runs the app through `nodemon`, which restarts the server on file changes. Because `nodemon` is a dev dependency, install with dev dependencies enabled (the default for `npm install`).

On a successful boot you should see:

```
Server running in development mode at http://localhost:5000
Connected succuessfully to db
```

(The spelling in the second line is the literal message currently in `app.js`.)

### Creating the first administrator

Registration always creates a regular user, and the API rejects any attempt to send `isAdmin`. There is no endpoint that promotes a user, so the first administrator is created directly in the database:

1. Register a user through `POST /api/auth/register`.
2. Promote the user in MongoDB (adjust the database name to match your `MONGO_URI`):

   ```bash
   mongosh bookStoreDB --eval 'db.users.updateOne({ email: "admin@example.com" }, { $set: { isAdmin: true } })'
   ```

3. Log in again through `POST /api/auth/login`. The role is embedded in the token at sign time, so tokens issued before the promotion do not carry admin rights.

## Authentication and Authorization

### How it works

- **Registration and login** return a JWT in the response body, under `data.token`.
- **Token contents**: `{ id, isAdmin }`, signed with `JWT_SECRET`, expiring after **1 day**.
- **Sending the token**: the API reads it from a custom request header named `token`, not from `Authorization: Bearer`.

  ```
  token: <JWT>
  ```

- **Passwords** are hashed with `bcryptjs` using 11 salt rounds. The hash is stripped from register and login responses, and excluded from every user read.
- **Login failures** return the same message (`Invalid email or password`) whether the email or the password was wrong.

### Guards

The guards live in `middleware/verifyToken.js`:

| Guard                         | Allows                                                   |
| ----------------------------- | -------------------------------------------------------- |
| `verifyToken`                 | Any request with a valid, unexpired token.               |
| `verifyTokenAndAuthorization` | The account owner (token `id` equals `:id`) or an admin. |
| `verifyTokenAndAdmin`         | Administrators only.                                     |

### Access matrix

| Endpoint                                  | Anonymous | Authenticated user | Administrator |
| ----------------------------------------- | --------- | ------------------ | ------------- |
| `POST /api/auth/register`, `/login`       | yes       | yes                | yes           |
| `GET` books and authors                   | yes       | yes                | yes           |
| `POST`, `PUT`, `DELETE` books and authors | 401       | 403                | yes           |
| `GET /api/users`                          | 401       | 403                | yes           |
| `GET`, `PUT`, `DELETE /api/users/:id`     | 401       | own account only   | any account   |

Authorization is checked before the record is looked up, so a regular user requesting another user's id receives `403` whether or not that user exists.

## Data Models

Mongoose pluralizes model names, so the data is stored in the `books`, `authors` and `users` collections of the database named in `MONGO_URI`.

### Author

| Field         | Type   | Required | Constraints                 |
| ------------- | ------ | -------- | --------------------------- |
| `firstName`   | String | yes      | trimmed, 3 to 15 characters |
| `lastName`    | String | yes      | trimmed, 3 to 15 characters |
| `nationality` | String | yes      | trimmed, 3 to 25 characters |
| `image`       | String | no       | defaults to `default.png`   |
| `createdAt`   | Date   | auto     | managed by Mongoose         |
| `updatedAt`   | Date   | auto     | managed by Mongoose         |

### Book

| Field         | Type     | Required | Constraints                          |
| ------------- | -------- | -------- | ------------------------------------ |
| `title`       | String   | yes      | trimmed, 3 to 250 characters         |
| `author`      | ObjectId | yes      | reference to the `Author` collection |
| `description` | String   | yes      | trimmed, minimum 5 characters        |
| `price`       | Number   | yes      | minimum 0                            |
| `cover`       | String   | yes      | enum: `soft cover`, `hard cover`     |
| `createdAt`   | Date     | auto     | managed by Mongoose                  |
| `updatedAt`   | Date     | auto     | managed by Mongoose                  |

### User

| Field       | Type    | Required | Constraints                                                                                       |
| ----------- | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| `email`     | String  | yes      | trimmed, 5 to 100 characters; intended to be unique (see [Known Limitations](#known-limitations)) |
| `username`  | String  | yes      | trimmed, 2 to 200 characters                                                                      |
| `password`  | String  | yes      | stored as a bcrypt hash; the 6-character minimum is enforced by Joi on the plain text             |
| `isAdmin`   | Boolean | no       | defaults to `false`; cannot be set through the API                                                |
| `createdAt` | Date    | auto     | managed by Mongoose                                                                               |
| `updatedAt` | Date    | auto     | managed by Mongoose                                                                               |

## API Reference

Base URL: `http://localhost:5000`

All request and response bodies are JSON. The **Access** column shows who may call each endpoint. Protected endpoints require the `token` header described in [Authentication and Authorization](#authentication-and-authorization).

### Auth

Base path: `/api/auth`

| Method | Endpoint             | Description                         | Access | Success | Failure |
| ------ | -------------------- | ----------------------------------- | ------ | ------- | ------- |
| POST   | `/api/auth/register` | Register a user and receive a token | public | 201     | 400     |
| POST   | `/api/auth/login`    | Log in and receive a token          | public | 200     | 400     |

Register body: `email`, `username`, `password` (all required). Login body: `email`, `password` (both required). A `400` is returned for validation errors, for an already registered email, and for invalid credentials.

### Users

Base path: `/api/users`

| Method | Endpoint         | Description      | Access         | Success | Failure       |
| ------ | ---------------- | ---------------- | -------------- | ------- | ------------- |
| GET    | `/api/users`     | List all users   | admin          | 200     | 401, 403      |
| GET    | `/api/users/:id` | Get a user by id | owner or admin | 200     | 401, 403, 404 |
| PUT    | `/api/users/:id` | Update a user    | owner or admin | 200     | 400, 401, 403 |
| DELETE | `/api/users/:id` | Delete a user    | owner or admin | 200     | 401, 403, 404 |

`PUT` accepts any of `email`, `username` and `password`. A new password is hashed before it is stored.

### Books

Base path: `/api/books`

| Method | Endpoint         | Description      | Access | Success | Failure       |
| ------ | ---------------- | ---------------- | ------ | ------- | ------------- |
| GET    | `/api/books`     | List all books   | public | 200     | none expected |
| GET    | `/api/books/:id` | Get a book by id | public | 200     | 404           |
| POST   | `/api/books`     | Create a book    | admin  | 201     | 400, 401, 403 |
| PUT    | `/api/books/:id` | Update a book    | admin  | 200     | 400, 401, 403 |
| DELETE | `/api/books/:id` | Delete a book    | admin  | 200     | 401, 403, 404 |

### Authors

Base path: `/api/author` (singular, as mounted in `app.js`)

| Method | Endpoint          | Description         | Access | Success | Failure       |
| ------ | ----------------- | ------------------- | ------ | ------- | ------------- |
| GET    | `/api/author`     | List all authors    | public | 200     | none expected |
| GET    | `/api/author/:id` | Get an author by id | public | 200     | 404           |
| POST   | `/api/author`     | Create an author    | admin  | 201     | 400, 401, 403 |
| PUT    | `/api/author/:id` | Update an author    | admin  | 200     | 400, 401, 403 |
| DELETE | `/api/author/:id` | Delete an author    | admin  | 200     | 401, 403, 404 |

### Response shapes

Register and login return the user (without the password hash) plus the token:

```json
{
  "message": "User logged in successfully",
  "data": {
    "_id": "...",
    "email": "reader@example.com",
    "username": "reader",
    "isAdmin": false,
    "createdAt": "...",
    "updatedAt": "...",
    "token": "<JWT>"
  }
}
```

User reads return the document under `data`:

```json
{ "data": [{ "_id": "...", "email": "..." }] }
```

```json
{ "data": { "_id": "...", "email": "..." } }
```

User updates and deletes return a message only:

```json
{ "message": "User updated successfully" }
```

Book list endpoints return the collection under a named key, with each book's `author` populated with `_id`, `firstName` and `lastName`:

```json
{
  "booksList": [
    {
      "_id": "...",
      "title": "...",
      "author": { "_id": "...", "firstName": "...", "lastName": "..." }
    }
  ]
}
```

A single book returns the full author document:

```json
{
  "book": {
    "_id": "...",
    "title": "...",
    "author": { "_id": "...", "firstName": "..." }
  }
}
```

```json
{ "authorsList": [{ "_id": "...", "firstName": "..." }] }
```

Create and update operations on books and authors return a message and the resulting document:

```json
{ "message": "book added successfully", "data": { "_id": "..." } }
```

Deletes and failures return a message only:

```json
{ "message": "Book has been deleted successfully" }
```

### Usage examples

Register a user and capture the token from `data.token`:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "password": "secret123"
  }'
```

After promoting the user to administrator (see [Creating the first administrator](#creating-the-first-administrator)), log in to get an admin token:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@example.com", "password": "secret123" }'
```

Create an author (admin token required):

```bash
curl -X POST http://localhost:5000/api/author \
  -H "Content-Type: application/json" \
  -H "token: <ADMIN_TOKEN>" \
  -d '{
    "firstName": "George",
    "lastName": "Orwell",
    "nationality": "British"
  }'
```

Create a book using the `_id` returned above:

```bash
curl -X POST http://localhost:5000/api/books \
  -H "Content-Type: application/json" \
  -H "token: <ADMIN_TOKEN>" \
  -d '{
    "title": "Nineteen Eighty-Four",
    "author": "<AUTHOR_ID>",
    "description": "A dystopian novel set in a totalitarian state.",
    "price": 14.99,
    "cover": "soft cover"
  }'
```

Partially update a book:

```bash
curl -X PUT http://localhost:5000/api/books/<BOOK_ID> \
  -H "Content-Type: application/json" \
  -H "token: <ADMIN_TOKEN>" \
  -d '{ "price": 12.50 }'
```

Delete a book:

```bash
curl -X DELETE http://localhost:5000/api/books/<BOOK_ID> \
  -H "token: <ADMIN_TOKEN>"
```

Read your own profile (any authenticated user, with their own id):

```bash
curl http://localhost:5000/api/users/<USER_ID> \
  -H "token: <USER_TOKEN>"
```

Public catalog reads need no token:

```bash
curl http://localhost:5000/api/books
```

## Validation Rules

Validation is enforced twice: Joi rejects bad input before it reaches the database layer, and the Mongoose schema guarantees the stored shape regardless of how a document is written.

Each resource exposes Joi schemas for its write operations:

- **Create schemas** (`validateBook`, `validateAuthor`, `validateUserRegister`): required fields are enforced.
- **Update schemas** (`validateUpdateBook`, `validateUpdateAuthor`, `validateUserUpdate`): every field is optional, which makes `PUT` behave as a partial update.
- **Login schema** (`validateUserLogin`): `email` and `password` are required.

All schemas use Joi's default behavior of rejecting unknown keys, so a payload containing fields outside the schema receives a `400`. This is also what prevents clients from sending `isAdmin`.

| Resource | Field         | Rule                                                        |
| -------- | ------------- | ----------------------------------------------------------- |
| Author   | `firstName`   | string, trimmed, 3 to 15 chars                              |
| Author   | `lastName`    | string, trimmed, 3 to 15 chars                              |
| Author   | `nationality` | string, trimmed, 3 to 25 chars                              |
| Author   | `image`       | string, trimmed, 5 to 100 chars                             |
| Book     | `title`       | string, trimmed, 3 to 250 chars                             |
| Book     | `author`      | string                                                      |
| Book     | `description` | string, trimmed, minimum 5 chars                            |
| Book     | `price`       | number, minimum 0                                           |
| Book     | `cover`       | one of `soft cover`, `hard cover`                           |
| User     | `email`       | valid email (TLD list not checked), trimmed, 5 to 100 chars |
| User     | `username`    | string, trimmed, 2 to 200 chars                             |
| User     | `password`    | string, trimmed, minimum 6 chars                            |

## Error Handling

Errors are handled in two middleware functions in `middleware/errorHandlers.js`, registered after all routers in `app.js`:

- **`notFound`** turns any unmatched route into a `404` with the message `Not found <url>`.
- **`errorHandler`** returns `{ "message": ... }` using the error's message. It keeps the status code already set on the response, and falls back to `500` when the status is still `200`.

Validation failures return `400` with the Joi message:

```json
{ "message": "\"title\" length must be at least 3 characters long" }
```

Missing resources return `404` on `GET /:id` and `DELETE /:id`:

```json
{ "message": "Book not found" }
```

Unknown routes return `404`:

```json
{ "message": "Not found /api/unknown" }
```

Authentication and authorization failures are returned directly by the guards:

| Status | Message                             | Cause                                                        |
| ------ | ----------------------------------- | ------------------------------------------------------------ |
| 401    | `Unauthorized action`               | No `token` header was sent.                                  |
| 401    | `Not authenticated`                 | The token is invalid or expired.                             |
| 403    | `You're not allowed to this action` | The token is valid but lacks the required role or ownership. |

Unexpected errors, such as a database failure, reach `errorHandler` through `express-async-handler` and are returned as `500`.

## Known Limitations

These are deliberate trade-offs for this phase, documented here so they are addressed explicitly rather than discovered later.

### Carried over from Phase 1

1. **Updates on a missing id return 200.** `PUT /:id` on books and authors calls `findByIdAndUpdate` without checking the result, so a non-matching id returns `200` with `"data": null`. `PUT /api/users/:id` has the same gap and returns `User updated successfully` even if no user matched. The `DELETE` handlers already guard against this.
2. **Malformed ids are not handled gracefully.** An `:id` that is not a valid ObjectId raises a Mongoose `CastError`, which `errorHandler` returns as a `500`. It should be validated up front and answered with `400`.
3. **Update operations skip schema validators.** `findByIdAndUpdate` does not run Mongoose validators unless `runValidators: true` is passed. Joi covers the gap today.
4. **Book `author` is not verified.** Joi only checks that the value is a string. The API does not confirm it is a valid ObjectId or that the referenced author exists.
5. **Deleting an author does not affect their books.** There is no cascade or restriction, so books can end up referencing an author that no longer exists (the populated `author` is then `null`).
6. **No pagination, filtering or sorting.** List endpoints, including `GET /api/users`, return the full collection.
7. **No automated tests.**

### Introduced or identified in Phase 2

8. **Email uniqueness is not enforced by the database.** `models/user/User.model.js` declares `umique: true` (a typo for `unique`), so no unique index is created. Registration relies on an application-level `findOne` check, which can be bypassed by two simultaneous requests. Emails are also case-sensitive, so `A@x.com` and `a@x.com` are different accounts.
9. **No supported way to create an administrator.** Admins must be promoted manually in the database (see [Creating the first administrator](#creating-the-first-administrator)).
10. **Token handling is minimal.**
    - The token is read from a custom `token` header instead of the standard `Authorization: Bearer` header.
    - Tokens are stateless, with no refresh and no revocation. The role is embedded in the token, so a demotion or a deleted account only takes effect once the token expires (up to one day).
    - Changing an email or password requires only a valid token, not the current password.
11. **Missing hardening middleware.** There is no `helmet`, CORS policy or rate limiting, so login is not protected against brute-force attempts.
12. **`errorHandler` exposes raw error messages.** Internal error messages, including Mongoose and driver messages, are returned to the client for `500` responses, and nothing is logged server-side. It does not yet map Mongoose, Joi or JWT errors to specific status codes.
13. **Fragile startup configuration.**
    - If the database connection fails, the error is logged but the server keeps running.
    - A missing `JWT_SECRET` is only discovered when a token is signed (`500` on register and login) or verified (`401`).
    - The startup log prints `undefined` when `NODE_ENV` is not set.
    - `.gitignore` allows a `.env.example`, but the repository does not include one yet.
14. **Minor inconsistencies.**
    - The authors router is mounted at `/api/author`, while its inline comment for the list endpoint refers to `/api/authors`.
    - The database connection log message contains a typo (`succuessfully`).
    - `DELETE /api/users/:id` runs `findByIdAndDelete` twice; the second call is redundant.
    - Failed logins return `400` rather than `401`.
    - `middleware/hashPassword.js` contains password helpers rather than Express middleware, and would sit better in a `utils/` or `services/` folder.

## Roadmap

Proposed priorities for the next phase, in rough order:

1. **Foundation hardening**
   - Fix the `unique` typo on `User.email` (clean up any duplicates first), and normalize emails to lower case.
   - Fix the `PUT` 404 behavior on all resources, add ObjectId validation for `:id` parameters, and set `runValidators` on updates.
   - Verify author existence on book creation and update, and define delete behavior for authors with books.
   - Make `errorHandler` aware of Mongoose, Joi and JWT errors, hide internal details in production, and log errors.
   - Fail fast on missing `MONGO_URI` or `JWT_SECRET`, and commit a `.env.example`.
2. **Catalog quality**
   - Pagination, sorting and filtering (by author, price range, cover type).
   - Text search on title and description.
3. **Security**
   - `helmet`, a CORS policy, and rate limiting on the auth routes.
   - Move to `Authorization: Bearer` tokens, and consider refresh tokens and revocation.
   - Require the current password to change a password or email.
   - A seed script or admin-promotion endpoint for the first administrator.
4. **Engineering practices**
   - Integration tests for all endpoints, including authorization cases.
   - Request logging.
   - API documentation via OpenAPI.
   - Separation of controllers and services from route files as business logic grows.
5. **Commerce features**
   - Cart and order management tied to user accounts.
   - Inventory tracking.
   - Image upload for author photos and book covers.

## Author and License

Maintained by Omar Khairy.

Repository: https://github.com/OmarKh006/bookStore

Licensed under the ISC License.
