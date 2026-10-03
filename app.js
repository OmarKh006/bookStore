import express from "express";
import booksRouter from "./routes/books/books.route.js";
import authorRouter from "./routes/authors/authors.route.js";
import authRouter from "./routes/users/auth.route.js";
import usersRouter from "./routes/users/users.route.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { errorHandler, notFound } from "./middleware/errorHandlers.js";

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected succuessfully to db"))
  .catch((err) => console.log("Failed to connect to db", err));

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.use("/api/books", booksRouter);
app.use("/api/author", authorRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

app.use(notFound);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode at http://localhost:${PORT}`,
  );
});
