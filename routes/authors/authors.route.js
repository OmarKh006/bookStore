import express from "express";
import {
  validateAuthor,
  validateUpdateAuthor,
} from "./utils/validateAuthor.js";
import { Author } from "../../models/author/Author.model.js";

const router = express.Router();

const authors = [
  {
    id: 1,
    firstName: "fname 1",
    lastName: "lname 1",
    nationality: "nationality 1",
    image: "image1.png",
  },
  {
    id: 2,
    firstName: "fname 2",
    lastName: "lname 2",
    nationality: "nationality 2",
    image: "image2.png",
  },
  {
    id: 3,
    firstName: "fname 3",
    lastName: "lname 3",
    nationality: "nationality 3",
    image: "image3.png",
  },
];

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

router.put("/:id", (req, res) => {
  const { error } = validateUpdateAuthor(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const updatedAuthor = authors.find((a) => a.id === parseInt(req.params.id));

  if (!updatedAuthor)
    return res.status(404).json({ message: "Author not found" });

  res.status(200).json({ message: "Author has been updated successfully" });
});

/**
 * @description  Delete an author using id
 * @route        /api/author/:id
 * @method       DELETE
 * @access       public
 */

router.delete("/:id", (req, res) => {
  const author = authors.find((a) => a.id === parseInt(req.params.id));

  if (!author) return res.status(404).json({ message: "Author not found" });

  res.status(200).json({ message: "Author has been deleted successfully" });
});

export default router;
