import { Author } from "../../models/author/Author.model.js";
import { Book } from "../../models/book/Book.model.js";
import {
  validateBook,
  validateFilterBooksQuery,
  validateUpdateBook,
} from "./utils/validateBook.js";
import mongoose from "mongoose";
import expressAsyncHandler from "express-async-handler";

/**
 * @description  Get All Books
 * @route        /api/books
 * @method       GET
 * @access       public
 */

export const getAllBooks = expressAsyncHandler(async (req, res) => {
  const { error, value } = validateFilterBooksQuery(req.query);
  if (error) return res.status(400).json({ message: error.message });

  const { minPrice, maxPrice, pageNumber } = value;
  const filter = {};
  const booksPerPage = 2;

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  let query = Book.find(filter).populate("author", [
    "_id",
    "firstName",
    "lastName",
  ]);

  if (pageNumber) {
    query = query.skip((pageNumber - 1) * booksPerPage).limit(booksPerPage);
  }

  const books = await query;

  res.status(200).json({ books });
});

/**
 * @description  Get book by id
 * @route        /api/books/:id
 * @method       GET
 * @access       public
 */

export const getBookById = expressAsyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).populate("author");
  if (book) {
    res.status(200).json({ book });
  } else {
    res.status(404).json({ message: "Book not found" });
  }
});

/**
 * @description  Create new book
 * @route        /api/books
 * @method       POST
 * @access       private (only admin)
 */

export const addNewBook = expressAsyncHandler(async (req, res) => {
  const { error } = validateBook(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  if (!mongoose.isObjectIdOrHexString(req.body.author))
    return res.status(400).json({ message: "invalid author id" });

  const author = await Author.findById(req.body.author);
  if (!author) return res.status(404).json({ message: "author not found" });

  const book = new Book({
    title: req.body.title,
    author: req.body.author,
    description: req.body.description,
    price: req.body.price,
    cover: req.body.cover,
  });

  const result = await book.save();
  res.status(201).json({ message: "book added successfully", data: result });
});

/**
 * @description  Update a book using id
 * @route        /api/books/:id
 * @method       PUT
 * @access       private (only admin)
 */

export const updateBook = expressAsyncHandler(async (req, res) => {
  const { error } = validateUpdateBook(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  if (req.body.author) {
    const author = await Author.findById(req.body.author);
    if (!author) return res.status(404).json({ message: "author not found" });
  }

  const book = await Book.findById(req.params.id);

  if (!book) return res.status(404).json({ message: "Book not found" });

  const result = await Book.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        title: req.body.title,
        author: req.body.author,
        description: req.body.description,
        price: req.body.price,
        cover: req.body.cover,
      },
    },
    { new: true },
  );

  res.status(200).json({ message: "Book updated successfully", data: result });
});

/**
 * @description  Delete a book using id
 * @route        /api/books/:id
 * @method       DELETE
 * @access       private (only admin)
 */

export const deleteBook = expressAsyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);

  if (!book) return res.status(404).json({ message: "Book not found" });

  await Book.findByIdAndDelete(req.params.id);

  res.status(200).json({ message: "Book has been deleted successfully" });
});
