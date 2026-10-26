import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../types/index.ts";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(`Not found ${req.originalUrl}`, 404));
};

/** Shape of the errors we inspect (Mongoose / MongoDB / http-errors / generic). */
interface InspectableError extends Error {
  status?: number;
  statusCode?: number;
  path?: string;
  errors?: Record<string, { message: string }>;
  code?: number;
  keyValue?: Record<string, unknown>;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const error = err as InspectableError;

  let status: number =
    error.status ??
    error.statusCode ??
    (res.statusCode !== 200 ? res.statusCode : 500);
  let message = error.message;

  if (error.name === "CastError") {
    status = 400;
    message = `Invalid ${error.path}`;
  } else if (error.name === "ValidationError" && error.errors) {
    status = 400;
    message = Object.values(error.errors)
      .map((e) => e.message)
      .join(". ");
  } else if (error.code === 11000) {
    status = 409;
    const field = Object.keys(error.keyValue ?? {})[0];
    message = field ? `${field} already exists` : "Duplicate value";
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === "production") {
      message = "Internal server error";
    }
  }

  res.status(status).json({ message });
};
