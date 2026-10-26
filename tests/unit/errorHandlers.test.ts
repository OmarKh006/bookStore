import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../../src/middleware/errorHandlers.ts";
import { HttpError } from "../../src/types/index.ts";
import { mockNext, mockReq, mockRes } from "../helpers/mockHttp.ts";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const run = (err: unknown, res = mockRes()) => {
  const next = mockNext();
  errorHandler(err, mockReq(), res, next);
  return { res, next };
};

describe("notFound", () => {
  it("forwards a 404 error that includes the URL", () => {
    const next = mockNext();
    notFound(mockReq({ originalUrl: "/api/nope" }), mockRes(), next);
    const err = next.mock.calls[0]![0] as HttpError;
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found /api/nope");
  });
});

describe("errorHandler", () => {
  it("delegates to next when headers were already sent", () => {
    const res = mockRes();
    res.headersSent = true;
    const err = new Error("late");
    const { next } = run(err, res);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("uses err.status", () => {
    const { res } = run(new HttpError("teapot", 418));
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({ message: "teapot" });
  });

  it("uses err.statusCode", () => {
    const { res } = run(Object.assign(new Error("bad"), { statusCode: 422 }));
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("falls back to a non-200 res.statusCode, otherwise 500", () => {
    const r1 = mockRes();
    r1.statusCode = 403;
    run(new Error("x"), r1);
    expect(r1.status).toHaveBeenCalledWith(403);

    const { res } = run(new Error("x"));
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("maps CastError -> 400 'Invalid <path>'", () => {
    const { res } = run(
      Object.assign(new Error("cast"), { name: "CastError", path: "_id" }),
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid _id" });
  });

  it("maps ValidationError -> 400 with joined messages", () => {
    const err = Object.assign(new Error("v"), {
      name: "ValidationError",
      errors: { a: { message: "A bad" }, b: { message: "B bad" } },
    });
    const { res } = run(err);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "A bad. B bad" });
  });

  it("maps duplicate key (11000) -> 409 with field name", () => {
    const { res } = run(
      Object.assign(new Error("dup"), {
        code: 11000,
        keyValue: { email: "a@b.co" },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "email already exists" });
  });

  it("duplicate key without keyValue -> 'Duplicate value'", () => {
    const { res } = run(Object.assign(new Error("dup"), { code: 11000 }));
    expect(res.json).toHaveBeenCalledWith({ message: "Duplicate value" });
  });

  it("exposes 5xx messages outside production and logs them", () => {
    const { res } = run(new Error("db exploded"));
    expect(res.json).toHaveBeenCalledWith({ message: "db exploded" });
    expect(console.error).toHaveBeenCalled();
  });

  it("hides 5xx messages in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { res } = run(new Error("db exploded"));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
  });

  it("keeps 4xx messages in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { res } = run(new HttpError("Not found /x", 404));
    expect(res.json).toHaveBeenCalledWith({ message: "Not found /x" });
  });
});
