import express from "express";
import {
  validateAuthor,
  validateUpdateAuthor,
} from "./utils/validateAuthor.js";
import { Author } from "../../models/author/Author.model.js";

const router = express.Router();

/**
 * @description  Get All Authors
 * @route        /api/authors
 * @method       GET
 * @access       public
 */

router.get("/", async (req, res) => {
  try {
    const authorsList = await Author.find();
    res.status(200).json({ authorsList });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "internal server error", error });
  }
});

/**
 * @description  Get author by id
 * @route        /api/author/:id
 * @method       GET
 * @access       public
 */

router.get("/:id", async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (author) {
      res.status(200).json({ author });
    } else {
      res.status(404).json({ message: "Author not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error", error });
  }
});

/**
 * @description  Add a new author
 * @route        /api/author
 * @method       POST
 * @access       public
 */

router.post("/", async (req, res) => {
  const { error } = validateAuthor(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  try {
    const author = new Author({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      nationality: req.body.nationality,
      image: req.body.image,
    });
    const result = await author.save();
    res
      .status(201)
      .json({ message: "author added successfully", data: result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error", error });
  }
});

/**
 * @description  Update author using id
 * @route        /api/author/:id
 * @method       PUT
 * @access       public
 */

router.put("/:id", async (req, res) => {
  const { error } = validateUpdateAuthor(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  try {
    const result = await Author.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          nationality: req.body.nationality,
          image: req.body.image,
        },
      },
      { new: true },
    );
    res
      .status(200)
      .json({ message: "Author updated successfully", data: result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error", error });
  }
});

/**
 * @description  Delete an author using id
 * @route        /api/author/:id
 * @method       DELETE
 * @access       public
 */

router.delete("/:id", async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);

    if (!author) return res.status(404).json({ message: "Author not found" });

    await Author.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Author has been deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "internal server error", error });
  }
});

export default router;
