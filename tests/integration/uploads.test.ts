import fs from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.ts";
import { buildApp, createAdmin, createUser } from "../helpers/factories.ts";
import { GIF, JPEG, PNG, WEBP } from "../helpers/images.ts";

const app = buildApp();
const uploadDir = () => process.env.UPLOAD_DIR!;

let adminToken: string;
let userToken: string;

beforeAll(connectTestDB);
afterAll(async () => {
  await disconnectTestDB();
  await fs.rm(uploadDir(), { recursive: true, force: true });
});
beforeEach(async () => {
  await clearTestDB();
  adminToken = (await createAdmin()).token;
  userToken = (await createUser()).token;
  await fs.rm(uploadDir(), { recursive: true, force: true });
});

const upload = (
  token: string | undefined,
  file: Buffer,
  filename: string,
  contentType: string,
  field = "image",
) => {
  const req = request(app).post("/api/uploads");
  if (token) req.set("token", token);
  return req.attach(field, file, { filename, contentType });
};

describe("POST /api/uploads", () => {
  it("admin uploads a PNG: stored under a random uuid filename", async () => {
    const res = await upload(adminToken, PNG, "cover.png", "image/png");
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("image uploaded successfully");
    expect(res.body.filename).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(res.body.filename).not.toContain("cover");
    expect(res.body.size).toBe(PNG.length);
    expect(res.body.mimetype).toBe("image/png");

    const saved = await fs.readFile(path.join(uploadDir(), res.body.filename));
    expect(saved.equals(PNG)).toBe(true);
  });

  it("admin uploads a JPEG (.jpeg extension -> stored as .jpg)", async () => {
    const res = await upload(adminToken, JPEG, "photo.jpeg", "image/jpeg");
    expect(res.status).toBe(201);
    expect(res.body.filename).toMatch(/\.jpg$/);
    expect(res.body.mimetype).toBe("image/jpeg");
  });

  it("accepts GIF and WebP too", async () => {
    const gif = await upload(adminToken, GIF, "anim.gif", "image/gif");
    expect(gif.status).toBe(201);
    expect(gif.body.filename).toMatch(/\.gif$/);
    const webp = await upload(adminToken, WEBP, "pic.webp", "image/webp");
    expect(webp.status).toBe(201);
    expect(webp.body.filename).toMatch(/\.webp$/);
  });

  it("two uploads never collide", async () => {
    const a = await upload(adminToken, PNG, "a.png", "image/png");
    const b = await upload(adminToken, PNG, "a.png", "image/png");
    expect(a.body.filename).not.toBe(b.body.filename);
    expect(await fs.readdir(uploadDir())).toHaveLength(2);
  });

  it("uses the REAL content type: a .png/image/png file that is really text is rejected (415)", async () => {
    const res = await upload(
      adminToken,
      Buffer.from("<?php echo 'pwned'; ?>"),
      "evil.png",
      "image/png",
    );
    expect(res.status).toBe(415);
    expect(res.body).toEqual({
      error: "File content is not a valid supported image",
    });
    await expect(fs.readdir(uploadDir())).rejects.toThrow(); // nothing ever touched disk
  });

  it("rejects a disallowed MIME type (415)", async () => {
    const res = await upload(
      adminToken,
      Buffer.from("hello"),
      "note.png",
      "text/plain",
    );
    expect(res.status).toBe(415);
    expect(res.body).toEqual({
      error: "Only JPEG, PNG, WebP and GIF images are allowed",
    });
  });

  it("rejects a disallowed extension even with an image MIME type (415)", async () => {
    const res = await upload(adminToken, PNG, "shell.php", "image/png");
    expect(res.status).toBe(415);
    expect(res.body.error).toContain("Only JPEG, PNG, WebP and GIF");
  });

  it("413 when the file is larger than 5 MB", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await upload(adminToken, big, "big.png", "image/png");
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "File too large (max 5 MB)" });
  });

  it("400 when the multipart field is not called 'image'", async () => {
    const res = await upload(adminToken, PNG, "a.png", "image/png", "file");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("400 when no file is sent", async () => {
    const res = await request(app)
      .post("/api/uploads")
      .set("token", adminToken)
      .field("note", "hi");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'No file uploaded (field name must be "image")',
    });
  });

  it("400 when more than one file is sent", async () => {
    const res = await request(app)
      .post("/api/uploads")
      .set("token", adminToken)
      .attach("image", PNG, { filename: "1.png", contentType: "image/png" })
      .attach("image", PNG, { filename: "2.png", contentType: "image/png" });
    expect(res.status).toBe(400);
  });

  it("401 without a token (nothing saved), 401 with a bad token", async () => {
    const none = await upload(undefined, PNG, "a.png", "image/png");
    expect(none.status).toBe(401);
    const bad = await upload("bad", PNG, "a.png", "image/png");
    expect(bad.status).toBe(401);
    await expect(fs.readdir(uploadDir())).rejects.toThrow();
  });

  it("403 for a non-admin", async () => {
    const res = await upload(userToken, PNG, "a.png", "image/png");
    expect(res.status).toBe(403);
    await expect(fs.readdir(uploadDir())).rejects.toThrow();
  });
});
