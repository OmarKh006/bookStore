import express from "express";
import { verifyTokenAndAdmin } from "../../middleware/verifyToken.js";
import {
  addNewAuthor,
  deleteAuthor,
  getAllAuthors,
  getAuthorsById,
  updateAuthor,
} from "../../controllers/authors/authors.controller.js";

const router = express.Router();

router.get("/", getAllAuthors);

router.get("/:id", getAuthorsById);

router.post("/", verifyTokenAndAdmin, addNewAuthor);

router.put("/:id", verifyTokenAndAdmin, updateAuthor);

router.delete("/:id", verifyTokenAndAdmin, deleteAuthor);

export default router;
