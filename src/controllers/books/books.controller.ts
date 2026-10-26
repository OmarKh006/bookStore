import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Author } from "../../models/Author.model.ts";
import { Book } from "../../models/Book.model.ts";
import {
  validateBook,
  validateFilterBooksQuery,
  validateUpdateBook,
} from "./utils/validateBook.js";

/**
 * @description  Get All Books
 * @route        /api/books
 * @method       GET
 * @access       public
 */
export const getAllBooks = expressAsyncHandler(async (req, res) => {
  const { error, value } = validateFilterBooksQuery(req.query);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const { minPrice, maxPrice, pageNumber, limit } = value;
  const filter: { price?: { $gte?: number; $lte?: number } } = {};

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  const [books, total] = await Promise.all([
    Book.find(filter)
      .populate("author", "_id firstName lastName")
      .sort({ createdAt: -1, _id: 1 })
      .skip((pageNumber - 1) * limit)
      .limit(limit),
    Book.countDocuments(filter),
  ]);

  const pages = Math.ceil(total / limit);

  res.status(200).json({ books, total, pages, pageNumber, limit });
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
    res.status(400).json({ message: error.message });
    return;
  }

  if (!mongoose.isObjectIdOrHexString(req.body.author)) {
    res.status(400).json({ message: "invalid author id" });
    return;
  }

  const author = await Author.findById(req.body.author);
  if (!author) {
    res.status(404).json({ message: "author not found" });
    return;
  }

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
    res.status(400).json({ message: error.message });
    return;
  }

  if (req.body.author) {
    const author = await Author.findById(req.body.author);
    if (!author) {
      res.status(404).json({ message: "author not found" });
      return;
    }
  }

  const book = await Book.findById(req.params.id);

  if (!book) {
    res.status(404).json({ message: "Book not found" });
    return;
  }

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

  if (!book) {
    res.status(404).json({ message: "Book not found" });
    return;
  }

  await Book.findByIdAndDelete(req.params.id);

  res.status(200).json({ message: "Book has been deleted successfully" });
});
