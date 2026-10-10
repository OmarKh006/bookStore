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

router.get("/", getAllBooks);

router.get("/:id", getBookById);

router.post("/", verifyTokenAndAdmin, addNewBook);

router.put("/:id", verifyTokenAndAdmin, updateBook);

router.delete("/:id", verifyTokenAndAdmin, deleteBook);

export default router;
