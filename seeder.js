import connectToDB from "./config/connectToDB.js";
import { authors, books } from "./data.js";
import { Author } from "./models/author/Author.model.js";
import { Book } from "./models/book/Book.model.js";
import dotenv from "dotenv";

dotenv.config();

connectToDB();

//Import books to DB
const importBooks = async () => {
  try {
    await Book.insertMany(books);
    console.log("books added");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

//Add authors to DB
const importAuthors = async () => {
  try {
    await Author.insertMany(authors);
    console.log("authors added");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

//Delete books from DB
const deleteBooks = async () => {
  try {
    await Book.deleteMany();
    console.log("books deleted");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

if (process.argv[2] === "-import") {
  importBooks();
} else if (process.argv[2] === "-delete") {
  deleteBooks();
} else if (process.argv[2] === "-import-authors") {
  importAuthors();
}
