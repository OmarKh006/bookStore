import type { NextFunction, Request, Response } from "express";
import { vi } from "vitest";

export const mockRes = () => {
  const res = {
    statusCode: 200,
    headersSent: false,
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as typeof res & Response;
};

export const mockReq = (partial: Record<string, unknown> = {}) =>
  ({ headers: {}, params: {}, body: {}, ...partial }) as unknown as Request;

export const mockNext = () => vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
