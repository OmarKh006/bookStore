import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Author } from "../../src/models/Author.model.ts";
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

const validBody = { firstName: "Paulo", lastName: "Coelho", nationality: "Brazil" };

describe("GET /api/authors", () => {
  it("returns an empty page when there are no authors", async () => {
    const res = await request(app).get("/api/authors");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ authorsList: [], total: 0, pages: 0, pageNumber: 1, limit: 12 });
  });

  it("is public and paginates", async () => {
    for (let i = 0; i < 5; i++) await createAuthor();
    const res = await request(app).get("/api/authors?pageNumber=2&limit=2");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 5, pages: 3, pageNumber: 2, limit: 2 });
    expect(res.body.authorsList).toHaveLength(2);
  });

  it("returns the last, partial page", async () => {
    for (let i = 0; i < 5; i++) await createAuthor();
    const res = await request(app).get("/api/authors?pageNumber=3&limit=2");
    expect(res.body.authorsList).toHaveLength(1);
  });

  it("returns an empty list beyond the last page", async () => {
    await createAuthor();
    const res = await request(app).get("/api/authors?pageNumber=9");
    expect(res.body.authorsList).toEqual([]);
    expect(res.body.total).toBe(1);
  });

  it("sorts newest first", async () => {
    const old = await createAuthor({ firstName: "Older" });
    const recent = await createAuthor({ firstName: "Newer" });
    await setCreatedAt(Author, old._id, new Date("2020-01-01"));
    await setCreatedAt(Author, recent._id, new Date("2024-01-01"));

    const res = await request(app).get("/api/authors");
    expect(res.body.authorsList.map((a: { firstName: string }) => a.firstName)).toEqual(["Newer", "Older"]);
  });

  it.each(["pageNumber=0", "limit=0", "limit=51", "limit=abc", "pageNumber=1.5"])(
    "400 for invalid query %s",
    async (qs) => {
      const res = await request(app).get(`/api/authors?${qs}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBeTypeOf("string");
    },
  );
});

describe("GET /api/authors/:id", () => {
  it("returns the author", async () => {
    const author = await createAuthor({ firstName: "Leo", lastName: "Tolstoy" });
    const res = await request(app).get(`/api/authors/${author._id}`);
    expect(res.status).toBe(200);
    expect(res.body.author).toMatchObject({ firstName: "Leo", lastName: "Tolstoy", image: "default.png" });
  });

  it("404 when not found", async () => {
    const res = await request(app).get(`/api/authors/${fakeObjectId()}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Author not found" });
  });

  it("400 for a malformed id", async () => {
    const res = await request(app).get("/api/authors/123");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid id" });
  });
});

describe("POST /api/authors", () => {
  it("admin creates an author (default image applied)", async () => {
    const res = await request(app).post("/api/authors").set("token", adminToken).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("author added successfully");
    expect(res.body.data).toMatchObject({ ...validBody, image: "default.png" });
    expect(await Author.countDocuments()).toBe(1);
  });

  it("accepts a custom image", async () => {
    const res = await request(app)
      .post("/api/authors")
      .set("token", adminToken)
      .send({ ...validBody, image: "paulo.png" });
    expect(res.body.data.image).toBe("paulo.png");
  });

  it("401 without a token", async () => {
    const res = await request(app).post("/api/authors").send(validBody);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Unauthorized action" });
  });

  it("401 with an invalid token", async () => {
    const res = await request(app).post("/api/authors").set("token", "bad").send(validBody);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Not authenticated" });
  });

  it("403 for a non-admin", async () => {
    const res = await request(app).post("/api/authors").set("token", userToken).send(validBody);
    expect(res.status).toBe(403);
    expect(await Author.countDocuments()).toBe(0);
  });

  it("400 for a missing field", async () => {
    const res = await request(app)
      .post("/api/authors")
      .set("token", adminToken)
      .send({ firstName: "Paulo" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("is required");
  });

  it("400 for a too-short name", async () => {
    const res = await request(app)
      .post("/api/authors")
      .set("token", adminToken)
      .send({ ...validBody, firstName: "Al" });
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/authors/:id", () => {
  it("admin updates only the provided fields", async () => {
    const author = await createAuthor({ firstName: "Original", nationality: "Egypt" });
    const res = await request(app)
      .put(`/api/authors/${author._id}`)
      .set("token", adminToken)
      .send({ nationality: "Brazil" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Author updated successfully");
    expect(res.body.data).toMatchObject({ firstName: "Original", nationality: "Brazil" });
  });

  it("403 for a non-admin, 401 without token", async () => {
    const author = await createAuthor();
    const id = author._id.toString();
    expect((await request(app).put(`/api/authors/${id}`).set("token", userToken).send({})).status).toBe(403);
    expect((await request(app).put(`/api/authors/${id}`).send({})).status).toBe(401);
  });

  it("404 when the author does not exist", async () => {
    const res = await request(app)
      .put(`/api/authors/${fakeObjectId()}`)
      .set("token", adminToken)
      .send({ firstName: "Whoever" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Author not found" });
  });

  it("400 for a malformed id", async () => {
    const res = await request(app).put("/api/authors/abc").set("token", adminToken).send({});
    expect(res.status).toBe(400);
  });

  it("400 for invalid data", async () => {
    const author = await createAuthor();
    const res = await request(app)
      .put(`/api/authors/${author._id}`)
      .set("token", adminToken)
      .send({ firstName: "Al" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/authors/:id", () => {
  it("admin deletes the author and cascades to their books", async () => {
    const author = await createAuthor();
    const other = await createAuthor();
    await createBook({ author: author._id });
    await createBook({ author: author._id });
    await createBook({ author: other._id });

    const res = await request(app).delete(`/api/authors/${author._id}`).set("token", adminToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Author and his books have been deleted successfully" });
    expect(await Author.findById(author._id)).toBeNull();
    expect(await Book.countDocuments({ author: author._id })).toBe(0);
    expect(await Book.countDocuments({ author: other._id })).toBe(1);
  });

  it("403 for a non-admin and the author is kept", async () => {
    const author = await createAuthor();
    const res = await request(app).delete(`/api/authors/${author._id}`).set("token", userToken);
    expect(res.status).toBe(403);
    expect(await Author.countDocuments()).toBe(1);
  });

  it("404 when not found", async () => {
    const res = await request(app).delete(`/api/authors/${fakeObjectId()}`).set("token", adminToken);
    expect(res.status).toBe(404);
  });

  it("400 for a malformed id", async () => {
    const res = await request(app).delete("/api/authors/xyz").set("token", adminToken);
    expect(res.status).toBe(400);
  });
});
