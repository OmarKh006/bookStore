import path from "node:path";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { errorHandler, notFound } from "./middleware/errorHandlers.ts";
import { createLimiter } from "./middleware/rateLimiter.ts";
import authorRouter from "./routes/authors.route.ts";
import { createAuthRouter } from "./routes/auth.route.ts";
import booksRouter from "./routes/books.route.ts";
import uploadsRouter from "./routes/uploads.route.ts";
import usersRouter from "./routes/users.route.ts";

export interface CreateAppOptions {
  /** Max requests per IP per 15 min on auth routes (default 10). */
  rateLimitMax?: number;
}

const PROJECT_ROOT = path.join(import.meta.dirname, "..");

/**
 * Builds the Express app without connecting to the DB or listening on a port,
 * so it can be imported directly by Supertest.
 */
export const createApp = (options: CreateAppOptions = {}): Express => {
  const app = express();

  app.set("trust proxy", 1);

  // Security, cross-cutting middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  const origins = (process.env.CORS_ORIGINS || "http://localhost:3000").split(",");
  app.use(cors({ origin: origins }));

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Express 5 leaves req.body undefined when nothing was parsed; normalise it
  // so controllers get a proper validation error (400) instead of a TypeError (500).
  app.use((req, _res, next) => {
    req.body ??= {};
    next();
  });

  // Static files
  app.use(express.static(path.join(PROJECT_ROOT, "images")));

  app.set("views", path.join(PROJECT_ROOT, "views"));
  app.set("view engine", "ejs");

  // Routes
  app.use("/api/books", booksRouter);
  app.use("/api/authors", authorRouter);
  app.use("/api/auth", createAuthRouter(createLimiter(options.rateLimitMax)));
  app.use("/api/users", usersRouter);
  app.use("/api/uploads", uploadsRouter);

  app.get("/healthcheck", (_req, res) => {
    if (mongoose.connection.readyState === 1) {
      res.status(200).json({ status: "ok" });
      return;
    }
    res.status(503).json({ status: "error" });
  });

  // Error handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
