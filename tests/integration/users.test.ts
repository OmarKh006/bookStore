import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { User } from "../../src/models/User.model.ts";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.ts";
import {
  buildApp,
  createAdmin,
  createUser,
  fakeObjectId,
  setCreatedAt,
} from "../helpers/factories.ts";

const app = buildApp();

beforeAll(connectTestDB);
afterAll(disconnectTestDB);
beforeEach(clearTestDB);

describe("GET /api/users (admin only)", () => {
  it("admin gets a paginated list without passwords", async () => {
    const admin = await createAdmin();
    await createUser();
    await createUser();

    const res = await request(app)
      .get("/api/users?limit=2")
      .set("token", admin.token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      total: 3,
      pages: 2,
      pageNumber: 1,
      limit: 2,
    });
    expect(res.body.data).toHaveLength(2);
    for (const u of res.body.data) expect(u).not.toHaveProperty("password");
  });

  it("sorts newest first", async () => {
    const admin = await createAdmin({ username: "adminuser" });
    const old = await createUser({ username: "olduser" });
    await setCreatedAt(User, old.user._id, new Date("2020-01-01"));
    await setCreatedAt(User, admin.user._id, new Date("2024-01-01"));

    const res = await request(app).get("/api/users").set("token", admin.token);
    expect(res.body.data.map((u: { username: string }) => u.username)).toEqual([
      "adminuser",
      "olduser",
    ]);
  });

  it("403 for a regular user, 401 without token", async () => {
    const user = await createUser();
    expect(
      (await request(app).get("/api/users").set("token", user.token)).status,
    ).toBe(403);
    expect((await request(app).get("/api/users")).status).toBe(401);
  });

  it("400 for an invalid page query", async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .get("/api/users?limit=100")
      .set("token", admin.token);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/users/:id", () => {
  it("owner can read their own profile (no password)", async () => {
    const { user, token } = await createUser({ username: "me" });
    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .set("token", token);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      _id: user._id.toString(),
      username: "me",
    });
    expect(res.body.data).not.toHaveProperty("password");
  });

  it("admin can read anyone", async () => {
    const admin = await createAdmin();
    const { user } = await createUser();
    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .set("token", admin.token);
    expect(res.status).toBe(200);
  });

  it("403 when reading someone else's profile", async () => {
    const a = await createUser();
    const b = await createUser();
    const res = await request(app)
      .get(`/api/users/${b.user._id}`)
      .set("token", a.token);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "You're not allowed to this action" });
  });

  it("401 without token / invalid token", async () => {
    const { user } = await createUser();
    expect((await request(app).get(`/api/users/${user._id}`)).status).toBe(401);
    expect(
      (await request(app).get(`/api/users/${user._id}`).set("token", "bad"))
        .status,
    ).toBe(401);
  });

  it("404 when an admin asks for a missing user", async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .get(`/api/users/${fakeObjectId()}`)
      .set("token", admin.token);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "User not found" });
  });

  it("400 for a malformed id (admin)", async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .get("/api/users/123")
      .set("token", admin.token);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid id" });
  });

  it("a non-admin using a malformed id is stopped at 403 before id validation", async () => {
    const { token } = await createUser();
    expect(
      (await request(app).get("/api/users/123").set("token", token)).status,
    ).toBe(403);
  });
});

describe("PUT /api/users/:id", () => {
  it("owner updates username and email", async () => {
    const { user, token } = await createUser();
    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set("token", token)
      .send({ username: "renamed", email: "Renamed@Example.com" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "User updated successfully" });

    const stored = await User.findById(user._id);
    expect(stored).toMatchObject({
      username: "renamed",
      email: "renamed@example.com",
    });
  });

  it("owner changes password: it is hashed and works for login", async () => {
    const { user, token } = await createUser({ email: "pw@example.com" });
    const newPassword = "N3w!Password";
    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set("token", token)
      .send({ password: newPassword });
    expect(res.status).toBe(200);

    const stored = await User.findById(user._id).select("+password");
    expect(stored!.password).not.toBe(newPassword);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "pw@example.com", password: newPassword });
    expect(login.status).toBe(200);
  });

  it("leaves untouched fields alone", async () => {
    const { user, token } = await createUser({
      username: "keepme",
      email: "keep@example.com",
    });
    await request(app)
      .put(`/api/users/${user._id}`)
      .set("token", token)
      .send({ username: "other" });
    const stored = await User.findById(user._id);
    expect(stored!.email).toBe("keep@example.com");
  });

  it("cannot escalate privileges through the body", async () => {
    const { user, token } = await createUser();
    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set("token", token)
      .send({ username: "sneaky", isAdmin: true });
    expect(res.status).toBe(200);
    expect((await User.findById(user._id))!.isAdmin).toBe(false);
  });

  it("admin can update another user", async () => {
    const admin = await createAdmin();
    const { user } = await createUser();
    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set("token", admin.token)
      .send({ username: "byadmin" });
    expect(res.status).toBe(200);
    expect((await User.findById(user._id))!.username).toBe("byadmin");
  });

  it("403 when updating someone else", async () => {
    const a = await createUser();
    const b = await createUser({ username: "untouched" });
    const res = await request(app)
      .put(`/api/users/${b.user._id}`)
      .set("token", a.token)
      .send({ username: "hacked" });
    expect(res.status).toBe(403);
    expect((await User.findById(b.user._id))!.username).toBe("untouched");
  });

  it("400 for an empty body, weak password or invalid email", async () => {
    const { user, token } = await createUser();
    const put = (body: object) =>
      request(app).put(`/api/users/${user._id}`).set("token", token).send(body);
    expect((await put({})).status).toBe(400);
    expect((await put({ password: "weak" })).status).toBe(400);
    expect((await put({ email: "nope" })).status).toBe(400);
  });

  it("404 when an admin updates a missing user", async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .put(`/api/users/${fakeObjectId()}`)
      .set("token", admin.token)
      .send({ username: "ghost" });
    expect(res.status).toBe(404);
  });

  it("409 'email already exists' when taking another user's email (unique index)", async () => {
    const a = await createUser({ email: "taken@example.com" });
    const b = await createUser();
    const res = await request(app)
      .put(`/api/users/${b.user._id}`)
      .set("token", b.token)
      .send({ email: "taken@example.com" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "email already exists" });
    expect(a.user.email).toBe("taken@example.com");
  });
});

describe("DELETE /api/users/:id", () => {
  it("owner deletes their own account", async () => {
    const { user, token } = await createUser();
    const res = await request(app)
      .delete(`/api/users/${user._id}`)
      .set("token", token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "User deleted successfully" });
    expect(await User.findById(user._id)).toBeNull();
  });

  it("admin deletes another user", async () => {
    const admin = await createAdmin();
    const { user } = await createUser();
    const res = await request(app)
      .delete(`/api/users/${user._id}`)
      .set("token", admin.token);
    expect(res.status).toBe(200);
    expect(await User.countDocuments()).toBe(1);
  });

  it("403 when deleting someone else; user is kept", async () => {
    const a = await createUser();
    const b = await createUser();
    const res = await request(app)
      .delete(`/api/users/${b.user._id}`)
      .set("token", a.token);
    expect(res.status).toBe(403);
    expect(await User.findById(b.user._id)).not.toBeNull();
  });

  it("404 for a missing user (admin) and 400 for a malformed id", async () => {
    const admin = await createAdmin();
    expect(
      (
        await request(app)
          .delete(`/api/users/${fakeObjectId()}`)
          .set("token", admin.token)
      ).status,
    ).toBe(404);
    expect(
      (await request(app).delete("/api/users/xyz").set("token", admin.token))
        .status,
    ).toBe(400);
  });

  it("401 without a token", async () => {
    const { user } = await createUser();
    expect((await request(app).delete(`/api/users/${user._id}`)).status).toBe(
      401,
    );
  });
});
