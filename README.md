# BookStore API

REST backend for a book store, built with Node.js, Express and MongoDB. This repository contains **Phase 1**: the catalog foundation, covering books and authors with full CRUD, schema-level and request-level validation, and a layout designed to scale as new domains are added.

## Table of Contents

1. [Scope of Phase 1](#scope-of-phase-1)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Data Models](#data-models)
7. [API Reference](#api-reference)
8. [Validation Rules](#validation-rules)
9. [Error Handling](#error-handling)
10. [Known Limitations](#known-limitations)
11. [Roadmap](#roadmap)
12. [Author and License](#author-and-license)

---

## Scope of Phase 1

Phase 1 delivers the core catalog service. Everything below is implemented and working today.

- CRUD operations for **books**.
- CRUD operations for **authors**.
- A relationship between the two: every book references an author by ObjectId.
- Two layers of validation: Joi at the HTTP boundary, Mongoose schema constraints at the persistence boundary.
- Automatic `createdAt` / `updatedAt` timestamps on every document.
- Consistent JSON response shapes across resources.

Out of scope for this phase: authentication and authorization, pagination and search, file uploads, orders, and any form of user management. These are tracked in the [Roadmap](#roadmap).

## Tech Stack

| Concern            | Choice                | Version  |
| ------------------ | --------------------- | -------- |
| Runtime            | Node.js (ES Modules)  | 20 LTS+  |
| HTTP framework     | Express               | ^5.2.1   |
| Database           | MongoDB               | any 6.x+ |
| ODM                | Mongoose              | ^9.10.3  |
| Request validation | Joi                   | ^18.2.9  |
| Async error bridge | express-async-handler | ^1.2.0   |
| Dev tooling        | nodemon               | ^3.1.14  |

The project uses native ES Modules (`"type": "module"` in `package.json`), so all imports use the `import` syntax and local imports must include the `.js` extension.

## Architecture Overview

The service follows a straightforward layered layout, organized by resource rather than by technical role.

```
Client
  |
  v
Express app (app.js)          JSON body parsing, router mounting
  |
  v
Resource router               routes/<resource>/<resource>.route.js
  |        |
  |        +--> Joi validator        routes/<resource>/utils/validate<Resource>.js
  v
Mongoose model                models/<resource>/<Resource>.model.js
  |
  v
MongoDB
```

Request lifecycle for a write operation:

1. `express.json()` parses the request body.
2. The route handler runs the payload through the relevant Joi schema. A failure short-circuits with `400`.
3. The handler calls the Mongoose model. Schema-level constraints act as a second line of defense.
4. The result is serialized into a JSON envelope and returned with the appropriate status code.

Every handler is wrapped in `express-async-handler`, so rejected promises are forwarded to Express' error pipeline instead of becoming unhandled rejections.

Each resource keeps its model, router and validators in its own folder. Adding a new domain (for example, `orders`) means adding one folder under `models/` and one under `routes/`, then mounting the router in `app.js`.

## Project Structure

```
bookStore/
├── app.js                              Application entry point
├── package.json
├── package-lock.json
├── .gitignore
├── models/
│   ├── author/
│   │   └── Author.model.js             Author schema and model
│   └── book/
│       └── Book.model.js               Book schema and model
└── routes/
    ├── authors/
    │   ├── authors.route.js            Author endpoints
    │   └── utils/
    │       └── validateAuthor.js       Joi schemas for create and update
    └── books/
        ├── books.route.js              Book endpoints
        └── utils/
            └── validateBook.js         Joi schemas for create and update
```

## Getting Started

### Prerequisites

- Node.js 20 LTS or later
- A running MongoDB instance reachable at `mongodb://localhost` (default port 27017)

### Installation

```bash
git clone https://github.com/OmarKh006/bookStore.git
cd bookStore
npm install
```

### Running the server

```bash
npm start
```

The `start` script runs the app through `nodemon`, which restarts the server on file changes. Because `nodemon` is a dev dependency, install with dev dependencies enabled (the default for `npm install`).

On a successful boot you should see:

```
Server running at http://localhost:5000
Connected succuessfully to db
```

### Runtime configuration

In Phase 1 the configuration is defined directly in `app.js`:

| Setting           | Value                             |
| ----------------- | --------------------------------- |
| Server port       | `5000`                            |
| MongoDB URI       | `mongodb://localhost/bookStoreDB` |
| Books base path   | `/api/books`                      |
| Authors base path | `/api/author`                     |

Moving these into environment variables is the first item on the [Roadmap](#roadmap).

## Data Models

Mongoose pluralizes model names, so the data is stored in the `books` and `authors` collections of the `bookStoreDB` database.

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

## API Reference

Base URL: `http://localhost:5000`

All request and response bodies are JSON. All endpoints are currently public.

### Books

Base path: `/api/books`

| Method | Endpoint         | Description      | Success | Failure       |
| ------ | ---------------- | ---------------- | ------- | ------------- |
| GET    | `/api/books`     | List all books   | 200     | none expected |
| GET    | `/api/books/:id` | Get a book by id | 200     | 404           |
| POST   | `/api/books`     | Create a book    | 201     | 400           |
| PUT    | `/api/books/:id` | Update a book    | 200     | 400           |
| DELETE | `/api/books/:id` | Delete a book    | 200     | 404           |

### Authors

Base path: `/api/author` (singular, as mounted in `app.js`)

| Method | Endpoint          | Description         | Success | Failure       |
| ------ | ----------------- | ------------------- | ------- | ------------- |
| GET    | `/api/author`     | List all authors    | 200     | none expected |
| GET    | `/api/author/:id` | Get an author by id | 200     | 404           |
| POST   | `/api/author`     | Create an author    | 201     | 400           |
| PUT    | `/api/author/:id` | Update an author    | 200     | 400           |
| DELETE | `/api/author/:id` | Delete an author    | 200     | 404           |

### Response shapes

List endpoints return the collection under a named key:

```json
{ "booksList": [{ "_id": "...", "title": "..." }] }
```

```json
{ "authorsList": [{ "_id": "...", "firstName": "..." }] }
```

Single-resource reads return the document under a named key:

```json
{ "book": { "_id": "...", "title": "..." } }
```

Create and update operations return a message and the resulting document:

```json
{ "message": "book added successfully", "data": { "_id": "..." } }
```

Deletes and failures return a message only:

```json
{ "message": "Book has been deleted successfully" }
```

### Usage examples

Create an author:

```bash
curl -X POST http://localhost:5000/api/author \
  -H "Content-Type: application/json" \
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
  -d '{ "price": 12.50 }'
```

Delete a book:

```bash
curl -X DELETE http://localhost:5000/api/books/<BOOK_ID>
```

## Validation Rules

Validation is enforced twice: Joi rejects bad input before it reaches the database layer, and the Mongoose schema guarantees the stored shape regardless of how a document is written.

Each resource exposes two Joi schemas:

- **Create schema** (`validateBook`, `validateAuthor`): required fields are enforced.
- **Update schema** (`validateUpdateBook`, `validateUpdateAuthor`): every field is optional, which makes `PUT` behave as a partial update.

Both schemas use Joi's default behavior of rejecting unknown keys, so a payload containing fields outside the schema receives a `400`.

| Resource | Field         | Rule                              |
| -------- | ------------- | --------------------------------- |
| Author   | `firstName`   | string, trimmed, 3 to 15 chars    |
| Author   | `lastName`    | string, trimmed, 3 to 15 chars    |
| Author   | `nationality` | string, trimmed, 3 to 25 chars    |
| Author   | `image`       | string, trimmed, 5 to 100 chars   |
| Book     | `title`       | string, trimmed, 3 to 250 chars   |
| Book     | `author`      | string                            |
| Book     | `description` | string, trimmed, minimum 5 chars  |
| Book     | `price`       | number, minimum 0                 |
| Book     | `cover`       | one of `soft cover`, `hard cover` |

## Error Handling

Validation failures return `400` with the Joi message:

```json
{ "message": "\"title\" length must be at least 3 characters long" }
```

Missing resources return `404` on `GET /:id` and `DELETE /:id`:

```json
{ "message": "Book not found" }
```

Unexpected errors, such as a database failure, are forwarded to Express' default error handler through `express-async-handler`. A dedicated error-handling middleware is planned for the next phase.

## Known Limitations

These are deliberate Phase 1 trade-offs and documented here so they are addressed explicitly rather than discovered later.

1. **Updates on a missing id return 200.** `PUT /:id` on both resources calls `findByIdAndUpdate` without checking the result. If no document matches, the response is `200` with `"data": null` instead of `404`. The `DELETE` handlers already guard against this; the `PUT` handlers should follow the same pattern.
2. **Malformed ids are not handled gracefully.** An `:id` that is not a valid ObjectId raises a Mongoose `CastError`, which currently surfaces as a generic `500`. It should be validated up front and answered with `400`.
3. **Update operations skip schema validators.** `findByIdAndUpdate` does not run Mongoose validators unless `runValidators: true` is passed. Joi covers the gap today, but the model-level guarantees are not applied to updates.
4. **Book `author` is not verified.** Joi only checks that the value is a string. The API does not confirm it is a valid ObjectId or that the referenced author exists.
5. **Deleting an author does not affect their books.** There is no cascade or restriction, so books can end up referencing an author that no longer exists.
6. **Responses do not populate the author.** Book payloads return the raw author id rather than the author document.
7. **Hard-coded configuration.** Port and database URI live in source. There is no `.env` support.
8. **No pagination, filtering or sorting.** List endpoints return the full collection.
9. **No security middleware.** There is no authentication, CORS configuration, rate limiting or security headers.
10. **No automated tests and no centralized error or 404 handler.**
11. **Minor inconsistencies.** The authors router is mounted at `/api/author` while its inline documentation comments refer to `/api/authors`, and the database connection log message contains a typo (`succuessfully`).

## Roadmap

Proposed priorities for the next phase, in rough order:

1. **Foundation hardening**
   - Environment-based configuration (`dotenv`) for port and database URI.
   - Centralized error-handling and not-found middleware.
   - Fix the `PUT` 404 behavior, ObjectId validation, and `runValidators` on updates.
   - Verify author existence on book creation and update, and define delete behavior for authors with books.
2. **Catalog quality**
   - Populate author data in book responses.
   - Pagination, sorting and filtering (by author, price range, cover type).
   - Text search on title and description.
3. **Security and access control**
   - User model with registration and login.
   - JWT authentication and role-based authorization, restricting write operations to administrators.
   - `helmet`, CORS policy and rate limiting.
4. **Engineering practices**
   - Integration tests for all endpoints.
   - Request logging.
   - API documentation via OpenAPI.
   - Separation of controllers and services from route files as business logic grows.
5. **Commerce features**
   - Cart and order management.
   - Inventory tracking.
   - Image upload for author photos and book covers.

## Author and License

Maintained by Omar Khairy.

Repository: https://github.com/OmarKh006/bookStore

Licensed under the ISC License.
