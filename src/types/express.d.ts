import type { AuthPayload } from "./index.ts";

declare global {
  namespace Express {
    interface Request {
      /** Set by verifyToken after a valid JWT is supplied. */
      user?: AuthPayload;
    }
  }
}

export {};
