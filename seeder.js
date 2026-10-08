import connectToDB from "./config/connectToDB.js";
import { books } from "./data.js";
import { Book } from "./models/book/Book.model.js";
import dotenv from "dotenv";

dotenv.config();

connectToDB();

const importBooks = async () => {
  try {
    await Book.insertMany(books);
    console.log("books added");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

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
}
