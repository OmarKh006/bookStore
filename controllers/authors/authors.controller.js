import expressAsyncHandler from "express-async-handler";
import { Author } from "../../models/author/Author.model.js";
import {
  validateAuthor,
  validatePageQuery,
  validateUpdateAuthor,
} from "./utils/validateAuthor.js";
import { Book } from "../../models/book/Book.model.js";

/**
 * @description  Get All Authors
 * @route        /api/authors
 * @method       GET
 * @access       public
 */

export const getAllAuthors = expressAsyncHandler(async (req, res) => {
  const { error, value } = validatePageQuery(req.query);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const { pageNumber, limit } = value;

  const [authorsList, total] = await Promise.all([
    Author.find()
      .sort({ createdAt: -1, _id: 1 })
      .skip((pageNumber - 1) * limit)
      .limit(limit),
    Author.countDocuments(),
  ]);

  const pages = Math.ceil(total / limit);

  res.status(200).json({ authorsList, total, pages, pageNumber, limit });
});

/**
 * @description  Get author by id
 * @route        /api/authors/:id
 * @method       GET
 * @access       public
 */

export const getAuthorsById = expressAsyncHandler(async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (author) {
    res.status(200).json({ author });
  } else {
    res.status(404).json({ message: "Author not found" });
  }
});

/**
 * @description  Add a new author
 * @route        /api/authors
 * @method       POST
 * @access       private (only admin)
 */

export const addNewAuthor = expressAsyncHandler(async (req, res) => {
  const { error } = validateAuthor(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const author = new Author({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    nationality: req.body.nationality,
    image: req.body.image,
  });
  const result = await author.save();
  res.status(201).json({ message: "author added successfully", data: result });
});

/**
 * @description  Update author using id
 * @route        /api/authors/:id
 * @method       PUT
 * @access       private (only admin)
 */

export const updateAuthor = expressAsyncHandler(async (req, res) => {
  const { error } = validateUpdateAuthor(req.body);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const author = await Author.findById(req.params.id);

  if (!author) {
    return res.status(404).json({ message: "Author not found" });
  }

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
});

/**
 * @description  Delete an author using id
 * @route        /api/authors/:id
 * @method       DELETE
 * @access       private (only admin)
 */

export const deleteAuthor = expressAsyncHandler(async (req, res) => {
  const author = await Author.findById(req.params.id);

  if (!author) return res.status(404).json({ message: "Author not found" });

  await Book.deleteMany({ author: author._id });

  await Author.findByIdAndDelete(req.params.id);

  res
    .status(200)
    .json({ message: "Author and his books have been deleted successfully" });
});
