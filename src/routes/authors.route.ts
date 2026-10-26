import express from "express";
import { verifyTokenAndAdmin } from "../middleware/verifyToken.ts";
import {
  addNewAuthor,
  deleteAuthor,
  getAllAuthors,
  getAuthorsById,
  updateAuthor,
} from "../controllers/authors/authors.controller.ts";
import { validateObjectId } from "../middleware/validateObjectId.ts";

const router = express.Router();

router.get("/", getAllAuthors);
router.get("/:id", validateObjectId, getAuthorsById);
router.post("/", verifyTokenAndAdmin, addNewAuthor);
router.put("/:id", verifyTokenAndAdmin, validateObjectId, updateAuthor);
router.delete("/:id", verifyTokenAndAdmin, validateObjectId, deleteAuthor);

export default router;
