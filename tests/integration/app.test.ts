import mongoose from "mongoose";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Author } from "../../src/models/Author.model.ts";
import { buildApp } from "../helpers/factories.ts";
import { connectTestDB, disconnectTestDB } from "../helpers/db.ts";

const app = buildApp();

beforeAll(connectTestDB);
afterAll(disconnectTestDB);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /healthcheck", () => {
  it("200 ok while the DB is connected", async () => {
    const res = await request(app).get("/healthcheck");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("503 when the DB is not connected", async () => {
    vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(0);
    const res = await request(app).get("/healthcheck");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "error" });
  });
});

describe("404 handling", () => {
  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Not found /api/does-not-exist" });
  });

  it("404 for an unsupported method on a known path", async () => {
    const res = await request(app).patch("/api/books");
    expect(res.status).toBe(404);
  });
});

describe("500 handling", () => {
  it("returns the error message outside production", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(Author, "countDocuments").mockImplementationOnce(() => {
      throw new Error("db exploded");
    });
    const res = await request(app).get("/api/authors");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "db exploded" });
  });

  it("hides internals in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(Author, "countDocuments").mockImplementationOnce(() => {
      throw new Error("db exploded");
    });
    const res = await request(app).get("/api/authors");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Internal server error" });
  });
});

describe("request body handling", () => {
  it("malformed JSON returns 400 (not a crash)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
  });

  it("a POST with no body gets a validation error, not a 500", async () => {
    const res = await request(app).post("/api/auth/login");
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("required");
  });
});

describe("security middleware", () => {
  it("sets helmet headers and allows cross-origin resource loading", async () => {
    const res = await request(app).get("/healthcheck");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("CORS: allowed origin is echoed back", async () => {
    const res = await request(app)
      .get("/healthcheck")
      .set("Origin", "http://allowed.test");
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://allowed.test",
    );
  });

  it("CORS: unknown origin gets no allow-origin header", async () => {
    const res = await request(app)
      .get("/healthcheck")
      .set("Origin", "http://evil.test");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("CORS preflight succeeds for an allowed origin", async () => {
    const res = await request(app)
      .options("/api/books")
      .set("Origin", "http://allowed.test")
      .set("Access-Control-Request-Method", "GET");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://allowed.test",
    );
  });
});

describe("static files", () => {
  it("serves images/default.png", async () => {
    const res = await request(app).get("/default.png");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  });

  it("404 for a missing image", async () => {
    const res = await request(app).get("/missing.png");
    expect(res.status).toBe(404);
  });
});
