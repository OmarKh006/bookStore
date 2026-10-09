# BookStore API (v2.2)

REST backend for a book store, built with Node.js, Express and MongoDB. It offers a public book and author catalog, user accounts, JWT authentication and admin-only catalog management.

> 🚧 **Work in progress.** I'm still building this project, so a few rough edges remain and are being fixed step by step. See [In Progress](#in-progress).

## What's New in v2.2

- **Controller layer**: route handlers moved out of `routes/` into `controllers/`, so routes only declare paths and middleware (MVC structure). Joi validators now live next to their controllers.
- **Pagination**: `pageNumber` query parameter on books, authors and users (2 items per page for now).
- **Price filtering**: `minPrice` and `maxPrice` query parameters on `GET /api/books`.
- **Cascade delete**: deleting an author also deletes all of their books.
- **Author checks on book creation**: the author id must be valid and the author must exist.
- **Database seeding**: `seeder.js` and `data.js` for importing and removing sample data.
- **DB config**: connection logic extracted to `config/connectToDB.js`.
- **Async errors**: controllers wrapped with `express-async-handler`.

### Previously in v2.1

- `PUT` on a non-existent id returns **404** for books, authors and users.
- Email uniqueness is enforced by the database (`unique` index on `User.email`).

## Features

- **Books and authors**: full CRUD, with the author populated in book responses.
- **User accounts**: register, login, and profile management.
- **JWT authentication**: tokens expire after 1 day.
- **Role-based access**: public reads, admin-only writes, and owner-or-admin access to user records.
- **Pagination and filtering**: page through lists and filter books by price range.
- **Security basics**: bcrypt password hashing, and passwords never returned in responses.
- **Validation**: Joi on requests plus Mongoose schema constraints.
- **Centralized error handling**: a 404 handler and a single error middleware.
- **Seeder**: quickly fill the database with sample authors and books.

## Tech Stack

Node.js (ES Modules) · Express 5 · MongoDB · Mongoose 9 · Joi · JSON Web Tokens · bcryptjs · express-async-handler · dotenv · nodemon

## Project Structure

```
bookStore/
├── app.js
├── seeder.js, data.js   sample data and import/delete script
├── config/              connectToDB
├── controllers/         authors, books, users (auth + users), each with Joi validators in utils/
├── middleware/          errorHandlers, hashPassword, verifyToken
├── models/              Author, Book, User
└── routes/              authors, books, users (auth + users)
```

## Getting Started

```bash
git clone https://github.com/OmarKh006/bookStore.git
cd bookStore
npm install
```

Create a `.env` file in the project root:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/bookStoreDB
JWT_SECRET=replace-with-a-long-random-string
```

Start the server:

```bash
npm start
```

**First admin:** registration always creates a regular user. Register one, then promote it in MongoDB:

```bash
mongosh bookStoreDB --eval 'db.users.updateOne({ email: "admin@example.com" }, { $set: { isAdmin: true } })'
```

Log in again afterwards to get a token that carries admin rights.

### Seeding sample data (optional)

```bash
node seeder -import-authors   # add sample authors
node seeder -import           # add sample books
node seeder -delete           # remove all books
```

The books in `data.js` reference fixed author ids, so they only link to real authors if those ids exist in your database (see [In Progress](#in-progress)). The script doesn't exit on its own yet; press `Ctrl+C` after the success message.

## Authentication

Send the JWT in a custom `token` header (returned by register and login under `data.token`):

```
token: <JWT>
```

| Access         | Who                                                         |
| -------------- | ----------------------------------------------------------- |
| Public         | Register, login, `GET` books and authors                    |
| Owner or admin | `GET`, `PUT`, `DELETE /api/users/:id`                       |
| Admin only     | `POST`, `PUT`, `DELETE` books and authors, `GET /api/users` |

## API Endpoints

Base URL: `http://localhost:5000`

| Resource | Endpoints                                           | Access         |
| -------- | --------------------------------------------------- | -------------- |
| Auth     | `POST /api/auth/register`, `POST /api/auth/login`   | public         |
| Users    | `GET /api/users`                                    | admin          |
|          | `GET`, `PUT`, `DELETE /api/users/:id`               | owner or admin |
| Books    | `GET /api/books`, `GET /api/books/:id`              | public         |
|          | `POST /api/books`, `PUT`, `DELETE /api/books/:id`   | admin          |
| Authors  | `GET /api/author`, `GET /api/author/:id`            | public         |
|          | `POST /api/author`, `PUT`, `DELETE /api/author/:id` | admin          |

### Query parameters

| Endpoint          | Parameter              | Description                                            |
| ----------------- | ---------------------- | ------------------------------------------------------ |
| `GET /api/books`  | `pageNumber`           | Page number, 2 books per page (optional; omit for all) |
|                   | `minPrice`, `maxPrice` | Filter by price range (optional)                       |
| `GET /api/author` | `pageNumber`           | Page number, 2 authors per page                        |
| `GET /api/users`  | `pageNumber`           | Page number, 2 users per page                          |

Example: `GET /api/books?minPrice=8&maxPrice=12&pageNumber=1`

> `pageNumber` should be sent on authors and users for now; handling a missing or invalid value is on the to-do list.

## Data Models

- **Author**: `firstName`, `lastName`, `nationality`, `image`
- **Book**: `title`, `author` (reference to Author), `description`, `price`, `cover` (`soft cover` or `hard cover`)
- **User**: `email` (unique), `username`, `password` (hashed), `isAdmin`

All models include `createdAt` and `updatedAt` timestamps.

Deleting an author also removes that author's books.

## In Progress

Known items I'm actively working on:

- Input checks for malformed ids (they currently return 500) and author validation when updating a book
- Fix the author check on book creation for malformed author ids
- Default and validated pagination values, plus sorting and search
- Smarter error handling (map Mongoose cast and duplicate-key errors to 400/409) and cleaner server-side logging
- Password reset (forgot and reset flow) and requiring the current password to change it
- Security hardening (`helmet`, CORS, rate limiting, `Bearer` tokens)
- Seeder: link sample books to the authors actually in the database, and exit when done
- `npm start` should run with `node` (nodemon is a dev dependency), with a separate `dev` script
- Automated tests and a `.env.example`
- Small code clean-ups

## Roadmap

1. Foundation hardening (the items above)
2. Catalog quality: pagination, sorting, filtering, search
3. Security and API documentation (OpenAPI)
4. Cart and orders, inventory, image uploads

## Author

Built by **Omar Khairy** · [github.com/OmarKh006/bookStore](https://github.com/OmarKh006/bookStore)

Licensed under the ISC License.
