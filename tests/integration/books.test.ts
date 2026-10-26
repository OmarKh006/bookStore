import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Book } from "../../src/models/Book.model.ts";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.ts";
import {
  buildApp,
  createAdmin,
  createAuthor,
  createBook,
  createUser,
  fakeObjectId,
  setCreatedAt,
} from "../helpers/factories.ts";

const app = buildApp();
let adminToken: string;
let userToken: string;

beforeAll(connectTestDB);
afterAll(disconnectTestDB);
beforeEach(async () => {
  await clearTestDB();
  adminToken = (await createAdmin()).token;
  userToken = (await createUser()).token;
});

const bookBody = (author: string, extra: Record<string, unknown> = {}) => ({
  title: "The Alchemist",
  author,
  description: "A shepherd follows his dreams",
  price: 11,
  cover: "hard cover",
  ...extra,
});

describe("GET /api/books", () => {
  it("returns an empty page when there are no books", async () => {
    const res = await request(app).get("/api/books");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ books: [], total: 0, pages: 0, pageNumber: 1, limit: 12 });
  });

  it("populates only _id, firstName and lastName of the author", async () => {
    const author = await createAuthor({ firstName: "Paulo", lastName: "Coelho", nationality: "Brazil" });
    await createBook({ author: author._id });

    const res = await request(app).get("/api/books");
    expect(res.status).toBe(200);
    const populated = res.body.books[0].author;
    expect(populated).toEqual({ _id: author._id.toString(), firstName: "Paulo", lastName: "Coelho" });
    expect(populated).not.toHaveProperty("nationality");
  });

  it("paginates", async () => {
    const author = await createAuthor();
    for (let i = 0; i < 5; i++) await createBook({ author: author._id });
    const res = await request(app).get("/api/books?pageNumber=3&limit=2");
    expect(res.body).toMatchObject({ total: 5, pages: 3, pageNumber: 3, limit: 2 });
    expect(res.body.books).toHaveLength(1);
  });

  it("sorts newest first", async () => {
    const author = await createAuthor();
    const a = await createBook({ author: author._id, title: "Older book" });
    const b = await createBook({ author: author._id, title: "Newer book" });
    await setCreatedAt(Book, a._id, new Date("2020-01-01"));
    await setCreatedAt(Book, b._id, new Date("2024-01-01"));
    const res = await request(app).get("/api/books");
    expect(res.body.books.map((x: { title: string }) => x.title)).toEqual(["Newer book", "Older book"]);
  });

  describe("price filters", () => {
    beforeEach(async () => {
      const author = await createAuthor();
      for (const price of [5, 10, 15, 20, 25]) await createBook({ author: author._id, price });
    });

    const prices = (res: request.Response) =>
      res.body.books.map((b: { price: number }) => b.price).sort((x: number, y: number) => x - y);

    it("minPrice only", async () => {
      const res = await request(app).get("/api/books?minPrice=15");
      expect(prices(res)).toEqual([15, 20, 25]);
      expect(res.body.total).toBe(3);
    });

    it("maxPrice only", async () => {
      const res = await request(app).get("/api/books?maxPrice=10");
      expect(prices(res)).toEqual([5, 10]);
    });

    it("min and max are inclusive", async () => {
      const res = await request(app).get("/api/books?minPrice=10&maxPrice=20");
      expect(prices(res)).toEqual([10, 15, 20]);
      expect(res.body.total).toBe(3);
    });

    it("total/pages reflect the filter, not the whole collection", async () => {
      const res = await request(app).get("/api/books?minPrice=10&maxPrice=20&limit=2");
      expect(res.body).toMatchObject({ total: 3, pages: 2 });
    });

    it("400 when maxPrice < minPrice", async () => {
      const res = await request(app).get("/api/books?minPrice=20&maxPrice=10");
      expect(res.status).toBe(400);
    });

    it.each(["minPrice=-1", "maxPrice=-1", "minPrice=abc", "limit=51", "pageNumber=0", "unknown=1"])(
      "400 for %s",
      async (qs) => {
        expect((await request(app).get(`/api/books?${qs}`)).status).toBe(400);
      },
    );
  });
});

describe("GET /api/books/:id", () => {
  it("returns the book with the full author populated", async () => {
    const author = await createAuthor({ nationality: "Brazil" });
    const book = await createBook({ author: author._id, title: "Brida" });
    const res = await request(app).get(`/api/books/${book._id}`);
    expect(res.status).toBe(200);
    expect(res.body.book.title).toBe("Brida");
    expect(res.body.book.author).toMatchObject({ _id: author._id.toString(), nationality: "Brazil" });
  });

  it("404 when not found", async () => {
    const res = await request(app).get(`/api/books/${fakeObjectId()}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Book not found" });
  });

  it("400 for a malformed id", async () => {
    const res = await request(app).get("/api/books/not-an-id");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid id" });
  });
});

describe("POST /api/books", () => {
  it("admin creates a book", async () => {
    const author = await createAuthor();
    const res = await request(app)
      .post("/api/books")
      .set("token", adminToken)
      .send(bookBody(author._id.toString()));
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("book added successfully");
    expect(res.body.data).toMatchObject({ title: "The Alchemist", price: 11, cover: "hard cover" });
    expect(await Book.countDocuments()).toBe(1);
  });

  it("auth: 401 without token, 401 bad token, 403 non-admin", async () => {
    const author = await createAuthor();
    const body = bookBody(author._id.toString());
    expect((await request(app).post("/api/books").send(body)).status).toBe(401);
    expect((await request(app).post("/api/books").set("token", "bad").send(body)).status).toBe(401);
    expect((await request(app).post("/api/books").set("token", userToken).send(body)).status).toBe(403);
    expect(await Book.countDocuments()).toBe(0);
  });

  it("404 'author not found' for a valid but unknown author id", async () => {
    const res = await request(app).post("/api/books").set("token", adminToken).send(bookBody(fakeObjectId()));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "author not found" });
  });

  it("400 for a malformed author id (Joi hex/length)", async () => {
    const res = await request(app).post("/api/books").set("token", adminToken).send(bookBody("123"));
    expect(res.status).toBe(400);
  });

  it.each([
    ["missing title", { title: undefined }],
    ["short title", { title: "ab" }],
    ["negative price", { price: -1 }],
    ["bad cover", { cover: "paperback" }],
    ["short description", { description: "abcd" }],
  ])("400 for %s", async (_label, override) => {
    const author = await createAuthor();
    const res = await request(app)
      .post("/api/books")
      .set("token", adminToken)
      .send(bookBody(author._id.toString(), override));
    expect(res.status).toBe(400);
    expect(await Book.countDocuments()).toBe(0);
  });

  it("accepts price 0", async () => {
    const author = await createAuthor();
    const res = await request(app)
      .post("/api/books")
      .set("token", adminToken)
      .send(bookBody(author._id.toString(), { price: 0 }));
    expect(res.status).toBe(201);
  });
});

describe("PUT /api/books/:id", () => {
  it("admin updates only provided fields", async () => {
    const book = await createBook({ title: "Old title", price: 10 });
    const res = await request(app)
      .put(`/api/books/${book._id}`)
      .set("token", adminToken)
      .send({ price: 99 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Book updated successfully");
    expect(res.body.data).toMatchObject({ title: "Old title", price: 99 });
  });

  it("can move a book to another existing author", async () => {
    const book = await createBook();
    const newAuthor = await createAuthor();
    const res = await request(app)
      .put(`/api/books/${book._id}`)
      .set("token", adminToken)
      .send({ author: newAuthor._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.data.author).toBe(newAuthor._id.toString());
  });

  it("404 'author not found' when moving to an unknown author", async () => {
    const book = await createBook();
    const res = await request(app)
      .put(`/api/books/${book._id}`)
      .set("token", adminToken)
      .send({ author: fakeObjectId() });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "author not found" });
  });

  it("404 when the book does not exist", async () => {
    const res = await request(app)
      .put(`/api/books/${fakeObjectId()}`)
      .set("token", adminToken)
      .send({ price: 1 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Book not found" });
  });

  it("400 for invalid data / malformed id", async () => {
    const book = await createBook();
    expect(
      (await request(app).put(`/api/books/${book._id}`).set("token", adminToken).send({ price: -5 })).status,
    ).toBe(400);
    expect((await request(app).put("/api/books/abc").set("token", adminToken).send({})).status).toBe(400);
  });

  it("401/403 for unauthenticated and non-admin users", async () => {
    const book = await createBook();
    expect((await request(app).put(`/api/books/${book._id}`).send({ price: 1 })).status).toBe(401);
    expect(
      (await request(app).put(`/api/books/${book._id}`).set("token", userToken).send({ price: 1 })).status,
    ).toBe(403);
  });
});

describe("DELETE /api/books/:id", () => {
  it("admin deletes a book", async () => {
    const book = await createBook();
    const res = await request(app).delete(`/api/books/${book._id}`).set("token", adminToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Book has been deleted successfully" });
    expect(await Book.findById(book._id)).toBeNull();
  });

  it("404 when not found", async () => {
    const res = await request(app).delete(`/api/books/${fakeObjectId()}`).set("token", adminToken);
    expect(res.status).toBe(404);
  });

  it("400 for a malformed id", async () => {
    expect((await request(app).delete("/api/books/zzz").set("token", adminToken)).status).toBe(400);
  });

  it("401/403 for unauthenticated and non-admin users", async () => {
    const book = await createBook();
    expect((await request(app).delete(`/api/books/${book._id}`)).status).toBe(401);
    expect((await request(app).delete(`/api/books/${book._id}`).set("token", userToken)).status).toBe(403);
    expect(await Book.countDocuments()).toBe(1);
  });
});
