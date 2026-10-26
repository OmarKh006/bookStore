import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  verify: vi.fn(),
  createTransport: vi.fn(),
  getTestMessageUrl: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mocks.createTransport,
    getTestMessageUrl: mocks.getTestMessageUrl,
  },
}));

import {
  resetTransporter,
  sendEmail,
  verifyTransporter,
} from "../../src/controllers/users/services/sendEmail.service.js";

beforeEach(() => {
  vi.clearAllMocks();
  resetTransporter();
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail, verify: mocks.verify });
  mocks.sendMail.mockResolvedValue({ response: "250 OK" });
  mocks.getTestMessageUrl.mockReturnValue(false);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("sendEmail", () => {
  it("sends a 'Reset Password' mail containing the link", async () => {
    const link = "http://localhost:5000/api/auth/reset-password/1/abc";
    await sendEmail({ to: "user@example.com", link });

    const options = mocks.sendMail.mock.calls[0]![0];
    expect(options.to).toBe("user@example.com");
    expect(options.subject).toBe("Reset Password");
    expect(options.html).toContain(`href="${link}"`);
  });

  it("uses SMTP_FROM when set, otherwise SMTP_USER", async () => {
    await sendEmail({ to: "a@b.co", link: "l" });
    expect(mocks.sendMail.mock.calls[0]![0].from).toBe("mailer@test.dev");

    vi.stubEnv("SMTP_FROM", "BookStore <no-reply@bookstore.dev>");
    await sendEmail({ to: "a@b.co", link: "l" });
    expect(mocks.sendMail.mock.calls[1]![0].from).toBe("BookStore <no-reply@bookstore.dev>");
  });

  it("builds the transport from the SMTP_* env vars", async () => {
    vi.stubEnv("SMTP_SECURE", "true");
    vi.stubEnv("SMTP_PORT", "465");
    await sendEmail({ to: "a@b.co", link: "l" });

    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: "smtp.test",
      port: 465,
      secure: true,
      auth: { user: "mailer@test.dev", pass: "smtp-pass" },
    });
  });

  it("creates the transporter lazily and only once", async () => {
    expect(mocks.createTransport).not.toHaveBeenCalled();
    await sendEmail({ to: "a@b.co", link: "l" });
    await sendEmail({ to: "a@b.co", link: "l" });
    expect(mocks.createTransport).toHaveBeenCalledTimes(1);
  });

  it("returns the nodemailer info object", async () => {
    await expect(sendEmail({ to: "a@b.co", link: "l" })).resolves.toEqual({ response: "250 OK" });
  });

  it("logs the preview URL when one exists (Ethereal)", async () => {
    mocks.getTestMessageUrl.mockReturnValue("https://ethereal.email/message/xyz");
    await sendEmail({ to: "a@b.co", link: "l" });
    expect(console.log).toHaveBeenCalledWith("Preview URL:", "https://ethereal.email/message/xyz");
  });

  it("logs and re-throws when sending fails", async () => {
    mocks.sendMail.mockRejectedValue(new Error("SMTP down"));
    await expect(sendEmail({ to: "a@b.co", link: "l" })).rejects.toThrow("SMTP down");
    expect(console.error).toHaveBeenCalled();
  });
});

describe("verifyTransporter", () => {
  it("logs success", async () => {
    mocks.verify.mockResolvedValue(true);
    await verifyTransporter();
    expect(console.log).toHaveBeenCalledWith("Server is ready to take our messages");
  });

  it("swallows verification errors", async () => {
    mocks.verify.mockRejectedValue(new Error("bad creds"));
    await expect(verifyTransporter()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
