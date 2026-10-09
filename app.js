import express from "express";
import booksRouter from "./routes/books/books.route.js";
import authorRouter from "./routes/authors/authors.route.js";
import authRouter from "./routes/users/auth.route.js";
import usersRouter from "./routes/users/users.route.js";
import dotenv from "dotenv";
import { errorHandler, notFound } from "./middleware/errorHandlers.js";
import connectToDB from "./config/connectToDB.js";

dotenv.config();

connectToDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 5000;

app.set("view engine", "ejs");

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
