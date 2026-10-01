import express from "express";

const app = express();

const PORT = 5000;

const books = [
  {
    id: 1,
    name: "book 1",
  },
  {
    id: 2,
    name: "book 2",
  },
  {
    id: 3,
    name: "book 3",
  },
  {
    id: 4,
    name: "book 4",
  },
];

app.get("/", (req, res) => {
  res.status(200).json({ message: "Server under construction" });
});

app.get("/api/books", (req, res) => {
  res.status(200).json({ allBooks: books });
});

app.get("/api/books/:id", (req, res) => {
  const book = books.find((b) => b.id === parseInt(req.params.id));
  if (book) {
    res.status(200).json({ wantedBook: book });
  } else {
    res.status(404).json({ message: "Book not found" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
