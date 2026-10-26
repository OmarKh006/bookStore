import type { JwtPayload } from "jsonwebtoken";

/** Payload stored inside every login/register JWT. */
export interface AuthPayload extends JwtPayload {
  id: string;
  isAdmin: boolean;
}

/** Error that carries an HTTP status code. */
export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export type CoverType = "soft cover" | "hard cover";
