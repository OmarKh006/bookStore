import express from "express";
import Joi from "joi";

const app = express();
app.use(express.json());

const PORT = 5000;

const books = [
  {
    id: 1,
    title: "book 1",
    author: "auth 1",
    description: "desc. 1",
    price: 1,
    cover: "cover 1",
  },
  {
    id: 2,
    title: "book 2",
    author: "auth 2",
    description: "desc. 2",
    price: 2,
    cover: "cover 2",
  },
  {
    id: 3,
    title: "book 3",
    author: "auth 3",
    description: "desc. 3",
    price: 3,
    cover: "cover 3",
  },
  {
    id: 4,
    title: "book 4",
    author: "auth 4",
    description: "desc. 4",
    price: 4,
    cover: "cover 4",
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

app.post("/api/books", (req, res) => {
  const schema = Joi.object({
    title: Joi.string().trim().min(3).max(30).required(),
    author: Joi.string().trim().min(3).max(30).required(),
    description: Joi.string().trim().min(3).max(500).required(),
    price: Joi.number().min(0).required(),
    cover: Joi.string().trim().min(0).max(100).required(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const book = {
    id: books.length + 1,
    title: req.body.title,
    author: req.body.author,
    description: req.body.description,
    price: req.body.price,
    cover: req.body.cover,
  };
  books.push(book);
  res.status(201).json({ message: "book added successfully", data: book });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
