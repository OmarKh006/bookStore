import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/controllers/users/services/sendEmail.service.js", () => ({
  sendEmail: sendEmailMock,
  verifyTransporter: vi.fn(),
}));

import { User } from "../../src/models/User.model.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.ts";
import { buildApp, createUser, fakeObjectId, STRONG_PASSWORD } from "../helpers/factories.ts";

const app = buildApp();

beforeAll(connectTestDB);
afterAll(disconnectTestDB);
beforeEach(async () => {
  await clearTestDB();
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue({});
});

const registerBody = { email: "omar@example.com", username: "omar", password: STRONG_PASSWORD };

describe("POST /api/auth/register", () => {
  it("creates a user, returns a token and never returns the password", async () => {
    const res = await request(app).post("/api/auth/register").send(registerBody);
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User added successfully");
    expect(res.body.data).toMatchObject({ email: "omar@example.com", username: "omar", isAdmin: false });
    expect(res.body.data).not.toHaveProperty("password");
    expect(res.body.data.token).toBeTypeOf("string");

    const payload = jwt.verify(res.body.data.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    expect(payload.id).toBe(res.body.data._id);
    expect(payload.isAdmin).toBe(false);
  });

  it("stores a bcrypt hash, not the plain password", async () => {
    await request(app).post("/api/auth/register").send(registerBody);
    const stored = await User.findOne({ email: "omar@example.com" }).select("+password");
    expect(stored!.password).not.toBe(STRONG_PASSWORD);
    expect(stored!.password).toMatch(/^\$2[aby]\$/);
  });

  it("lowercases the email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...registerBody, email: "Omar@EXAMPLE.com" });
    expect(res.body.data.email).toBe("omar@example.com");
  });

  it("ignores an attempt to self-assign isAdmin", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...registerBody, isAdmin: true });
    expect(res.status).toBe(201);
    expect(res.body.data.isAdmin).toBe(false);
  });

  it("400 'User already exists' for a duplicate email", async () => {
    await request(app).post("/api/auth/register").send(registerBody);
    const res = await request(app).post("/api/auth/register").send(registerBody);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "User already exists" });
    expect(await User.countDocuments()).toBe(1);
  });

  it("400 with every validation message for an empty body", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Email is required");
    expect(res.body.message).toContain("Password is required");
  });

  it("400 for a weak password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...registerBody, password: "weakpass" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("uppercase");
  });

  it("400 for an invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...registerBody, email: "nope" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("valid email");
  });
});

describe("POST /api/auth/login", () => {
  it("logs in and returns a working token", async () => {
    const { user, password } = await createUser({ email: "login@example.com" });
    const res = await request(app).post("/api/auth/login").send({ email: "login@example.com", password });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("User logged in successfully");
    expect(res.body.data._id).toBe(user._id.toString());
    expect(res.body.data).not.toHaveProperty("password");

    // the token authenticates against a protected route
    const me = await request(app)
      .get(`/api/users/${user._id}`)
      .set("token", res.body.data.token);
    expect(me.status).toBe(200);
  });

  it("is case-insensitive on the email", async () => {
    const { password } = await createUser({ email: "case@example.com" });
    const res = await request(app).post("/api/auth/login").send({ email: "CASE@example.com", password });
    expect(res.status).toBe(200);
  });

  it("admin login yields an admin token", async () => {
    const { password } = await createUser({ email: "boss@example.com", isAdmin: true });
    const res = await request(app).post("/api/auth/login").send({ email: "boss@example.com", password });
    const payload = jwt.verify(res.body.data.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    expect(payload.isAdmin).toBe(true);
  });

  it("same generic message for unknown email and wrong password", async () => {
    await createUser({ email: "real@example.com" });
    const wrongPass = await request(app)
      .post("/api/auth/login")
      .send({ email: "real@example.com", password: "Wr0ng!Pass" });
    const unknown = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "Wr0ng!Pass" });
    expect(wrongPass.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(wrongPass.body).toEqual({ message: "Invalid email or password" });
    expect(unknown.body).toEqual(wrongPass.body);
  });

  it("400 for missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Email is required");
  });
});

describe("forgot / reset password flow", () => {
  const linkParts = (link: string) => {
    const [, userId, token] = /reset-password\/([^/]+)\/(.+)$/.exec(link)!;
    return { userId: userId!, token: token! };
  };

  it("GET /forgot-password renders the form", async () => {
    const res = await request(app).get("/api/auth/forgot-password");
    expect(res.status).toBe(200);
    expect(res.type).toBe("text/html");
    expect(res.text).toContain("Forgot password");
    expect(res.text).toContain('name="email"');
  });

  it("POST /forgot-password emails a reset link for an existing user", async () => {
    const { user } = await createUser({ email: "forgot@example.com" });
    const res = await request(app).post("/api/auth/forgot-password").type("form").send({ email: "forgot@example.com" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("If an account exists for that email");
    expect(sendEmailMock).toHaveBeenCalledOnce();

    const { to, link } = sendEmailMock.mock.calls[0]![0];
    expect(to).toBe("forgot@example.com");
    expect(link).toMatch(new RegExp(`^http://localhost:5000/api/auth/reset-password/${user._id}/`));
  });

  it("gives the same response when the account does not exist (no email sent)", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "ghost@example.com" });
    expect(res.status).toBe(200);
    expect(res.text).toContain("If an account exists for that email");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("still responds 200 when the mail transport fails", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    sendEmailMock.mockRejectedValue(new Error("SMTP down"));
    await createUser({ email: "smtp@example.com" });
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "smtp@example.com" });
    expect(res.status).toBe(200);
    vi.restoreAllMocks();
  });

  it("400 for an invalid email", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "nope" });
    expect(res.status).toBe(400);
  });

  it("full flow: request link -> open page -> set new password -> login", async () => {
    const { user, password } = await createUser({ email: "flow@example.com" });
    await request(app).post("/api/auth/forgot-password").send({ email: "flow@example.com" });
    const { userId, token } = linkParts(sendEmailMock.mock.calls[0]![0].link);
    const path = `/api/auth/reset-password/${userId}/${token}`;

    const view = await request(app).get(path);
    expect(view.status).toBe(200);
    expect(view.text).toContain("flow@example.com");

    const newPassword = "N3w!Password";
    const reset = await request(app).post(path).send({ password: newPassword });
    expect(reset.status).toBe(200);
    expect(reset.text).toContain("You successfully changed your password");

    const oldLogin = await request(app).post("/api/auth/login").send({ email: "flow@example.com", password });
    expect(oldLogin.status).toBe(400);
    const newLogin = await request(app).post("/api/auth/login").send({ email: "flow@example.com", password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.data._id).toBe(user._id.toString());

    // the link is single-use: the token is bound to the old password hash
    const replay = await request(app).post(path).send({ password: "An0ther!Pass" });
    expect(replay.status).toBe(400);
    expect(replay.body).toEqual({ message: "Invalid or expired reset link" });
    const replayView = await request(app).get(path);
    expect(replayView.status).toBe(400);
  });

  it("rejects a tampered token, malformed user id and unknown user", async () => {
    const { user } = await createUser();
    const bad = { message: "Invalid or expired reset link" };

    const tampered = await request(app).get(`/api/auth/reset-password/${user._id}/not.a.token`);
    expect(tampered.status).toBe(400);
    expect(tampered.body).toEqual(bad);

    const badId = await request(app).get("/api/auth/reset-password/123/abc");
    expect(badId.status).toBe(400);
    expect(badId.body).toEqual(bad);

    const unknown = await request(app).get(`/api/auth/reset-password/${fakeObjectId()}/abc`);
    expect(unknown.status).toBe(400);
    expect(unknown.body).toEqual(bad);

    const post = await request(app)
      .post(`/api/auth/reset-password/${user._id}/abc`)
      .send({ password: "N3w!Password" });
    expect(post.status).toBe(400);
    expect(post.body).toEqual(bad);
  });

  it("rejects a normal login JWT used as a reset token", async () => {
    const { user, token } = await createUser();
    const res = await request(app).get(`/api/auth/reset-password/${user._id}/${token}`);
    expect(res.status).toBe(400);
  });

  it("rejects an expired reset token", async () => {
    const { user } = await createUser();
    const stored = await User.findById(user._id).select("+password");
    const expired = jwt.sign({ id: user.id }, process.env.JWT_SECRET! + stored!.password, { expiresIn: -10 });
    const res = await request(app).get(`/api/auth/reset-password/${user._id}/${expired}`);
    expect(res.status).toBe(400);
  });

  it("POST reset with a weak password is a 400 and keeps the old password", async () => {
    const { user, password } = await createUser({ email: "weak@example.com" });
    const stored = await User.findById(user._id).select("+password");
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET! + stored!.password, { expiresIn: "15m" });

    const res = await request(app)
      .post(`/api/auth/reset-password/${user._id}/${token}`)
      .send({ password: "weak" });
    expect(res.status).toBe(400);

    const login = await request(app).post("/api/auth/login").send({ email: "weak@example.com", password });
    expect(login.status).toBe(200);
  });
});
