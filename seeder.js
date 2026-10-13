import mongoose from "mongoose";
import connectToDB from "./config/connectToDB.js";
import { authors, books } from "./data.js";
import { Author } from "./models/author/Author.model.js";
import { Book } from "./models/book/Book.model.js";
import dotenv from "dotenv";

dotenv.config();

await connectToDB();

if (mongoose.connection.name !== process.env.SEED_DB_NAME) {
  console.log(
    `Refusing to run: connected to "${mongoose.connection.name}", expected "${process.env.SEED_DB_NAME}"`,
  );
  process.exit(1);
}

const importAll = async () => {
  try {
    await Book.deleteMany({});
    await Author.deleteMany({});

    const createdAuthors = await Author.insertMany(authors);

    const phoneBook = new Map();
    for (let i = 0; i < createdAuthors.length; i++) {
      phoneBook.set(
        `${createdAuthors[i].firstName} ${createdAuthors[i].lastName}`,
        createdAuthors[i]._id,
      );
    }

    const booksWithAuthors = books.map((book) => {
      const { authorName, ...rest } = book;
      const authorId = phoneBook.get(authorName);
      if (!authorId) {
        throw new Error(
          `Author "${authorName}" not found for book "${book.title}"`,
        );
      }
      return { ...rest, author: authorId };
    });

    await Book.insertMany(booksWithAuthors);
    console.log(
      `${createdAuthors.length} authors, ${booksWithAuthors.length} books`,
    );
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const deleteAll = async () => {
  try {
    await Book.deleteMany({});
    await Author.deleteMany({});
    console.log("all deleted");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

if (process.argv[2] === "-import") {
  importAll();
} else if (process.argv[2] === "-delete") {
  deleteAll();
} else {
  console.log("Usage: node seeder -import | -delete");
  process.exit(1);
}
