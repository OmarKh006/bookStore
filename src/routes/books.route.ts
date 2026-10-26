import express from "express";
import { verifyTokenAndAdmin } from "../middleware/verifyToken.ts";
import {
  addNewBook,
  deleteBook,
  getAllBooks,
  getBookById,
  updateBook,
} from "../controllers/books/books.controller.ts";
import { validateObjectId } from "../middleware/validateObjectId.ts";

const router = express.Router();

router.get("/", getAllBooks);
router.get("/:id", validateObjectId, getBookById);
router.post("/", verifyTokenAndAdmin, addNewBook);
router.put("/:id", verifyTokenAndAdmin, validateObjectId, updateBook);
router.delete("/:id", verifyTokenAndAdmin, validateObjectId, deleteBook);

export default router;
