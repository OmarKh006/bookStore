import express from "express";
import { verifyTokenAndAdmin } from "../../middleware/verifyToken.js";
import {
  addNewBook,
  deleteBook,
  getAllBooks,
  getBookById,
  updateBook,
} from "../../controllers/books/books.controller.js";
import { validateObjectId } from "../../middleware/validateObjectId.js";

const router = express.Router();

router.get("/", getAllBooks);

router.get("/:id", validateObjectId, getBookById);

router.post("/", verifyTokenAndAdmin, addNewBook);

router.put("/:id", verifyTokenAndAdmin, validateObjectId, updateBook);

router.delete("/:id", verifyTokenAndAdmin, validateObjectId, deleteBook);

export default router;
