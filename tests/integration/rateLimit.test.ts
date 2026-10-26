import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.ts";
import { connectTestDB, disconnectTestDB } from "../helpers/db.ts";

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

describe("auth rate limiting", () => {
  it("allows 10 requests then answers 429 on the 11th (limit is shared across auth routes)", async () => {
    const app = createApp(); // default limit = 10
    const body = { email: "nobody@example.com", password: "whatever" };

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post("/api/auth/login").send(body);
      expect(res.status).toBe(400); // invalid credentials, but not limited
    }
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post("/api/auth/register").send({});
      expect(res.status).toBe(400);
    }

    const limited = await request(app).post("/api/auth/login").send(body);
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({
      message: "Too many requests from this IP, please try again after 15 minutes",
    });
    expect(limited.headers["ratelimit-limit"] ?? limited.headers["ratelimit"]).toBeDefined();
    expect(limited.headers["x-ratelimit-limit"]).toBeUndefined(); // legacy headers off
  });

  it("also limits forgot-password and reset-password POSTs", async () => {
    const app = createApp({ rateLimitMax: 2 });
    await request(app).post("/api/auth/forgot-password").send({});
    await request(app).post("/api/auth/reset-password/507f1f77bcf86cd799439011/x").send({});
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(429);
  });

  it("does not limit the GET views or the public catalog", async () => {
    const app = createApp({ rateLimitMax: 1 });
    for (let i = 0; i < 4; i++) {
      expect((await request(app).get("/api/auth/forgot-password")).status).toBe(200);
      expect((await request(app).get("/api/books")).status).toBe(200);
    }
  });

  it("each app instance has independent counters", async () => {
    const a = createApp({ rateLimitMax: 1 });
    const b = createApp({ rateLimitMax: 1 });
    await request(a).post("/api/auth/login").send({});
    expect((await request(a).post("/api/auth/login").send({})).status).toBe(429);
    expect((await request(b).post("/api/auth/login").send({})).status).toBe(400);
  });
});
