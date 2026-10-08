import { Author } from "../../models/author/Author.model.js";
import { Book } from "../../models/book/Book.model.js";
import { validateBook, validateUpdateBook } from "./utils/validateBook.js";
import mongoose from "mongoose";
import expressAsyncHandler from "express-async-handler";

export const getAllBooks = expressAsyncHandler(async (req, res) => {
  const { minPrice, maxPrice } = req.query;
  let books;

  if (minPrice && maxPrice) {
    books = await Book.find({
      price: { $gte: minPrice, $lte: maxPrice },
    }).populate("author", ["_id", "firstName", "lastName"]);
  } else {
    books = await Book.find().populate("author", [
      "_id",
      "firstName",
      "lastName",
    ]);
  }

  res.status(200).json({ books });
});

export const getBookById = expressAsyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).populate("author");
  if (book) {
    res.status(200).json({ book });
  } else {
    res.status(404).json({ message: "Book not found" });
  }
});

export const addNewBook = expressAsyncHandler(async (req, res) => {
  const { error } = validateBook(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const book = new Book({
    title: req.body.title,
    author: req.body.author,
    description: req.body.description,
    price: req.body.price,
    cover: req.body.cover,
  });

  if (!mongoose.isValidObjectId(book.author._id))
    return res.status(400).json({ message: "invalid author id" });

  const author = await Author.findById(book.author._id);

  if (!author) return res.status(404).json({ message: "author not found" });

  const result = await book.save();
  res.status(201).json({ message: "book added successfully", data: result });
});

export const updateBook = expressAsyncHandler(async (req, res) => {
  const { error } = validateUpdateBook(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
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

export const deleteBook = expressAsyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);

  if (!book) return res.status(404).json({ message: "Book not found" });

  await Book.findByIdAndDelete(req.params.id);

  res.status(200).json({ message: "Book has been deleted successfully" });
});
