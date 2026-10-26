import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it } from "vitest";
import {
  verifyToken,
  verifyTokenAndAdmin,
  verifyTokenAndAuthorization,
} from "../../src/middleware/verifyToken.js";
import { mockNext, mockReq, mockRes } from "../helpers/mockHttp.ts";

const sign = (
  payload: object,
  secret = process.env.JWT_SECRET as string,
  opts: jwt.SignOptions = {},
) => jwt.sign(payload, secret, opts);

let res: ReturnType<typeof mockRes>;
let next: ReturnType<typeof mockNext>;

beforeEach(() => {
  res = mockRes();
  next = mockNext();
});

describe("verifyToken", () => {
  it("401 'Unauthorized action' when no token header", () => {
    verifyToken(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized action" });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 'Not authenticated' for a garbage token", () => {
    verifyToken(mockReq({ headers: { token: "garbage" } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 for a token signed with another secret", () => {
    const token = sign({ id: "1", isAdmin: true }, "other-secret");
    verifyToken(mockReq({ headers: { token } }), res, next);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
  });

  it("401 for an expired token", () => {
    const token = sign({ id: "1", isAdmin: false }, undefined, {
      expiresIn: -10,
    });
    verifyToken(mockReq({ headers: { token } }), res, next);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
  });

  it("sets req.user and calls next for a valid token", () => {
    const req = mockReq({
      headers: { token: sign({ id: "abc", isAdmin: false }) },
    });
    verifyToken(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toMatchObject({ id: "abc", isAdmin: false });
  });

  it("uses the first value if the header is an array", () => {
    const req = mockReq({
      headers: { token: [sign({ id: "abc", isAdmin: false }), "x"] },
    });
    verifyToken(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("verifyTokenAndAuthorization", () => {
  it("allows the owner", () => {
    const req = mockReq({
      headers: { token: sign({ id: "u1", isAdmin: false }) },
      params: { id: "u1" },
    });
    verifyTokenAndAuthorization(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows an admin for someone else's id", () => {
    const req = mockReq({
      headers: { token: sign({ id: "admin", isAdmin: true }) },
      params: { id: "u1" },
    });
    verifyTokenAndAuthorization(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("403 for a different non-admin user", () => {
    const req = mockReq({
      headers: { token: sign({ id: "u2", isAdmin: false }) },
      params: { id: "u1" },
    });
    verifyTokenAndAuthorization(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "You're not allowed to this action",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 without a token (does not reach the 403 branch)", () => {
    verifyTokenAndAuthorization(mockReq({ params: { id: "u1" } }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("verifyTokenAndAdmin", () => {
  it("allows admins", () => {
    verifyTokenAndAdmin(
      mockReq({ headers: { token: sign({ id: "a", isAdmin: true }) } }),
      res,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it("403 for regular users", () => {
    verifyTokenAndAdmin(
      mockReq({ headers: { token: sign({ id: "a", isAdmin: false }) } }),
      res,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 without a token", () => {
    verifyTokenAndAdmin(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
