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

dotenv.config();

connectToDB();

const app = express();

const __dirname = import.meta.dirname;
const PORT = process.env.PORT || 5000;

// Security, cross-cutting middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static files
app.use(express.static(path.join(__dirname, "images")));

app.set("view engine", "ejs");

// Routes
app.use("/api/books", booksRouter);
app.use("/api/author", authorRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/uploads", uploadsRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode at http://localhost:${PORT}`,
  );
});
