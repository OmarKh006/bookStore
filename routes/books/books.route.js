import express from "express";
import expressAsyncHandler from "express-async-handler";
import { validateBook, validateUpdateBook } from "./utils/validateBook.js";
import { Book } from "../../models/book/Book.model.js";
import { verifyTokenAndAdmin } from "../../middleware/verifyToken.js";
import mongoose from "mongoose";
import { Author } from "../../models/author/Author.model.js";

const router = express.Router();

/**
 * @description  Get All Books
 * @route        /api/books
 * @method       GET
 * @access       public
 */

router.get(
  "/",
  expressAsyncHandler(async (req, res) => {
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
  }),
);

/**
 * @description  Get book by id
 * @route        /api/books/:id
 * @method       GET
 * @access       public
 */

router.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id).populate("author");
    if (book) {
      res.status(200).json({ book });
    } else {
      res.status(404).json({ message: "Book not found" });
    }
  }),
);

/**
 * @description  Create new book
 * @route        /api/books
 * @method       POST
 * @access       private (only admin)
 */

router.post(
  "/",
  verifyTokenAndAdmin,
  expressAsyncHandler(async (req, res) => {
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
  }),
);

/**
 * @description  Update a book using id
 * @route        /api/books/:id
 * @method       PUT
 * @access       private (only admin)
 */

router.put(
  "/:id",
  verifyTokenAndAdmin,
  expressAsyncHandler(async (req, res) => {
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

    res
      .status(200)
      .json({ message: "Book updated successfully", data: result });
  }),
);

/**
 * @description  Delete a book using id
 * @route        /api/books/:id
 * @method       DELETE
 * @access       private (only admin)
 */

router.delete(
  "/:id",
  verifyTokenAndAdmin,
  expressAsyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id);

    if (!book) return res.status(404).json({ message: "Book not found" });

    await Book.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Book has been deleted successfully" });
  }),
);

export default router;
