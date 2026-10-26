import { describe, expect, it } from "vitest";
import { validateObjectId } from "../../src/middleware/validateObjectId.ts";
import { mockNext, mockReq, mockRes } from "../helpers/mockHttp.ts";

describe("validateObjectId", () => {
  it("calls next for a valid 24-hex id", () => {
    const next = mockNext();
    validateObjectId(
      mockReq({ params: { id: "507f1f77bcf86cd799439011" } }),
      mockRes(),
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it.each(["123", "not-an-id", "zzzzzzzzzzzzzzzzzzzzzzzz", ""])(
    "400 'Invalid id' for %j",
    (id) => {
      const res = mockRes();
      const next = mockNext();
      validateObjectId(mockReq({ params: { id } }), res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid id" });
      expect(next).not.toHaveBeenCalled();
    },
  );
});
