import express from "express";
import { validateBook, validateUpdateBook } from "./utils/validateBook.js";

const router = express.Router();

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

/**
 * @description  Get All Books
 * @route        /api/books
 * @method       GET
 * @access       public
 */

router.get("/", (req, res) => {
  res.status(200).json({ allBooks: books });
});

/**
 * @description  Get book by id
 * @route        /api/books/:id
 * @method       GET
 * @access       public
 */

router.get("/:id", (req, res) => {
  const book = books.find((b) => b.id === parseInt(req.params.id));
  if (book) {
    res.status(200).json({ wantedBook: book });
  } else {
    res.status(404).json({ message: "Book not found" });
  }
});

/**
 * @description  Create new book
 * @route        /api/books
 * @method       POST
 * @access       public
 */

router.post("/", (req, res) => {
  const { error } = validateBook(req.body);

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

/**
 * @description  Update a book using id
 * @route        /api/books/:id
 * @method       PUT
 * @access       public
 */

router.put("/:id", (req, res) => {
  const { error } = validateUpdateBook(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const updatedBook = books.find((b) => b.id === parseInt(req.params.id));

  if (!updatedBook) return res.status(404).json({ message: "Book not found" });

  res.status(200).json({ message: "Book has been updated successfully" });
});

/**
 * @description  Delete a book using id
 * @route        /api/books/:id
 * @method       DELETE
 * @access       public
 */

router.delete("/:id", (req, res) => {
  const book = books.find((b) => b.id === parseInt(req.params.id));

  if (!book) return res.status(404).json({ message: "Book not found" });

  res.status(200).json({ message: "Book has been deleted successfully" });
});

export default router;
