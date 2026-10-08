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

/**
 * @description  Get All Authors
 * @route        /api/authors
 * @method       GET
 * @access       public
 */

router.get("/", getAllAuthors);

/**
 * @description  Get author by id
 * @route        /api/author/:id
 * @method       GET
 * @access       public
 */

router.get("/:id", getAuthorsById);

/**
 * @description  Add a new author
 * @route        /api/author
 * @method       POST
 * @access       private (only admin)
 */

router.post("/", verifyTokenAndAdmin, addNewAuthor);

/**
 * @description  Update author using id
 * @route        /api/author/:id
 * @method       PUT
 * @access       private (only admin)
 */

router.put("/:id", verifyTokenAndAdmin, updateAuthor);

/**
 * @description  Delete an author using id
 * @route        /api/author/:id
 * @method       DELETE
 * @access       private (only admin)
 */

router.delete("/:id", verifyTokenAndAdmin, deleteAuthor);

export default router;
