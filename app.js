import express from "express";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import booksRouter from "./routes/books/books.route.js";
import authorRouter from "./routes/authors/authors.route.js";
import authRouter from "./routes/users/auth.route.js";
import usersRouter from "./routes/users/users.route.js";
import uploadsRouter from "./routes/uploads/uploads.route.js";
import { errorHandler, notFound } from "./middleware/errorHandlers.js";
import connectToDB from "./config/connectToDB.js";
import mongoose from "mongoose";

dotenv.config();

const REQUIRED_VARS = ["MONGO_URI", "BASE_URL", "JWT_SECRET"];
const missing = [];

for (let i = 0; i < REQUIRED_VARS.length; i++) {
  if (!process.env[REQUIRED_VARS[i]]) {
    missing.push(REQUIRED_VARS[i]);
  }
}

if (missing.length > 0) {
  console.error("missing variables : ", missing.join(", "));
  process.exit(1);
}

connectToDB();

const app = express();

app.set("trust proxy", 1);

const __dirname = import.meta.dirname;
const PORT = process.env.PORT || 5000;

// Security, cross-cutting middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
const ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000").split(
  ",",
);
app.use(
  cors({
    origin: ORIGINS,
  }),
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static files
app.use(express.static(path.join(__dirname, "images")));

app.set("view engine", "ejs");

// Routes
app.use("/api/books", booksRouter);
app.use("/api/authors", authorRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/uploads", uploadsRouter);

app.get("/healthcheck", (_req, res) => {
  if (mongoose.connection.readyState === 1)
    return res.status(200).json({ status: "ok" });
  res.status(503).json({ status: "error" });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || "development"} mode at http://localhost:${PORT}`,
  );
});
