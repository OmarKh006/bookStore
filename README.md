# BookStore API (v2.1)

REST backend for a book store, built with Node.js, Express and MongoDB. It offers a public book and author catalog, user accounts, JWT authentication and admin-only catalog management.

> 🚧 **Work in progress.** I'm still building this project, so a few rough edges remain and are being fixed step by step. See [In Progress](#in-progress).

## What's New in v2.1

- `PUT` on a non-existent id now returns **404** for books, authors and users.
- Email uniqueness is now enforced by the database (`unique` index on `User.email`).
- Refined and trimmed documentation.

## Features

- **Books and authors**: full CRUD, with the author populated in book responses.
- **User accounts**: register, login, and profile management.
- **JWT authentication**: tokens expire after 1 day.
- **Role-based access**: public reads, admin-only writes, and owner-or-admin access to user records.
- **Security basics**: bcrypt password hashing, and passwords never returned in responses.
- **Validation**: Joi on requests plus Mongoose schema constraints.
- **Centralized error handling**: a 404 handler and a single error middleware.

## Tech Stack

Node.js (ES Modules) · Express 5 · MongoDB · Mongoose 9 · Joi · JSON Web Tokens · bcryptjs · dotenv · nodemon

## Project Structure

```
bookStore/
├── app.js
├── middleware/     errorHandlers, hashPassword, verifyToken
├── models/         Author, Book, User
└── routes/         authors, books, users (auth + users), each with Joi validators
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

## Authentication

Send the JWT in a custom `token` header (returned by register and login under `data.token`):

```
token: <JWT>
```

| Access          | Who                                           |
| --------------- | --------------------------------------------- |
| Public          | Register, login, `GET` books and authors      |
| Owner or admin  | `GET`, `PUT`, `DELETE /api/users/:id`         |
| Admin only      | `POST`, `PUT`, `DELETE` books and authors, `GET /api/users` |

## API Endpoints

Base URL: `http://localhost:5000`

| Resource | Endpoints                                                                 | Access                |
| -------- | ------------------------------------------------------------------------- | --------------------- |
| Auth     | `POST /api/auth/register`, `POST /api/auth/login`                         | public                |
| Users    | `GET /api/users`                                                          | admin                 |
|          | `GET`, `PUT`, `DELETE /api/users/:id`                                     | owner or admin        |
| Books    | `GET /api/books`, `GET /api/books/:id`                                    | public                |
|          | `POST /api/books`, `PUT`, `DELETE /api/books/:id`                         | admin                 |
| Authors  | `GET /api/author`, `GET /api/author/:id`                                  | public                |
|          | `POST /api/author`, `PUT`, `DELETE /api/author/:id`                       | admin                 |

## Data Models

- **Author**: `firstName`, `lastName`, `nationality`, `image`
- **Book**: `title`, `author` (reference to Author), `description`, `price`, `cover` (`soft cover` or `hard cover`)
- **User**: `email` (unique), `username`, `password` (hashed), `isAdmin`

All models include `createdAt` and `updatedAt` timestamps.

## In Progress

Known items I'm actively working on:

- Input checks for malformed ids and for referenced authors
- Smarter error handling and cleaner server-side logging
- Pagination, filtering and search
- Security hardening (`helmet`, CORS, rate limiting, `Bearer` tokens)
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