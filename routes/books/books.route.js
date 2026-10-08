import express from "express";
import { verifyTokenAndAdmin } from "../../middleware/verifyToken.js";
import {
  addNewBook,
  deleteBook,
  getAllBooks,
  getBookById,
  updateBook,
} from "../../controllers/books/books.controller.js";

const router = express.Router();

/**
 * @description  Get All Books
 * @route        /api/books
 * @method       GET
 * @access       public
 */

router.get("/", getAllBooks);

/**
 * @description  Get book by id
 * @route        /api/books/:id
 * @method       GET
 * @access       public
 */

router.get("/:id", getBookById);

/**
 * @description  Create new book
 * @route        /api/books
 * @method       POST
 * @access       private (only admin)
 */

router.post("/", verifyTokenAndAdmin, addNewBook);

/**
 * @description  Update a book using id
 * @route        /api/books/:id
 * @method       PUT
 * @access       private (only admin)
 */

router.put("/:id", verifyTokenAndAdmin, updateBook);

/**
 * @description  Delete a book using id
 * @route        /api/books/:id
 * @method       DELETE
 * @access       private (only admin)
 */

router.delete("/:id", verifyTokenAndAdmin, deleteBook);

export default router;
