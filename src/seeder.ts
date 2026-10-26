import dotenv from "dotenv";
import mongoose from "mongoose";
import connectToDB from "./config/connectToDB.ts";
import { authors, books, type SeedAuthor, type SeedBook } from "./data.ts";
import { Author } from "./models/Author.model.ts";
import { Book } from "./models/Book.model.ts";

/** Wipes books + authors, inserts the authors, then books linked by author name. */
export const importData = async (
  authorData: SeedAuthor[] = authors,
  bookData: SeedBook[] = books,
): Promise<{ authors: number; books: number }> => {
  await Book.deleteMany({});
  await Author.deleteMany({});

  const createdAuthors = await Author.insertMany(authorData);

  const phoneBook = new Map<string, mongoose.Types.ObjectId>();
  for (const a of createdAuthors) {
    phoneBook.set(`${a.firstName} ${a.lastName}`, a._id);
  }

  const booksWithAuthors = bookData.map((book) => {
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
  return { authors: createdAuthors.length, books: booksWithAuthors.length };
};

export const deleteData = async (): Promise<void> => {
  await Book.deleteMany({});
  await Author.deleteMany({});
};

/** Command-line entry: `tsx src/seeder.ts -import | -delete` */
export const runSeeder = async (arg: string | undefined): Promise<void> => {
  await connectToDB();

  if (mongoose.connection.name !== process.env.SEED_DB_NAME) {
    console.log(
      `Refusing to run: connected to "${mongoose.connection.name}", expected "${process.env.SEED_DB_NAME}"`,
    );
    process.exit(1);
    return;
  }

  if (arg === "-import") {
    try {
      const result = await importData();
      console.log(`${result.authors} authors, ${result.books} books`);
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
    return;
  } else if (arg === "-delete") {
    try {
      await deleteData();
      console.log("all deleted");
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
    return;
  } else {
    console.log("Usage: tsx src/seeder.ts -import | -delete");
    process.exit(1);
  }
};

// Only run when executed directly (not when imported by tests)
if (process.argv[1] && import.meta.filename === process.argv[1]) {
  dotenv.config();
  await runSeeder(process.argv[2]);
}
