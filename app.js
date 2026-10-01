import express from "express";
import booksRouter from "./routes/books/books.route.js";
import authorRouter from "./routes/authors/authors.route.js";

const app = express();
app.use(express.json());

const PORT = 5000;

app.use("/api/books", booksRouter);
app.use("/api/author", authorRouter);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Server under construction" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
