import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Runs before every test file (see vitest.config.ts -> setupFiles).
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.BASE_URL = "http://localhost:5000";
process.env.CORS_ORIGINS = "http://localhost:3000,http://allowed.test";
process.env.SMTP_HOST = "smtp.test";
process.env.SMTP_PORT = "587";
process.env.SMTP_SECURE = "false";
process.env.SMTP_USER = "mailer@test.dev";
process.env.SMTP_PASS = "smtp-pass";
delete process.env.SMTP_FROM;

// Uploaded images go to a throwaway folder, never into the project's images/ dir
process.env.UPLOAD_DIR = fs.mkdtempSync(
  path.join(os.tmpdir(), "bookstore-uploads-"),
);
