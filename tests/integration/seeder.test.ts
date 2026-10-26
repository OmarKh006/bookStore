import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { authors, books } from "../../src/data.ts";
import { Author } from "../../src/models/Author.model.ts";
import { Book } from "../../src/models/Book.model.ts";
import { deleteData, importData, runSeeder } from "../../src/seeder.ts";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.ts";
import { createAuthor, createBook } from "../helpers/factories.ts";

beforeAll(connectTestDB);
afterAll(disconnectTestDB);
beforeEach(clearTestDB);

describe("importData", () => {
  it("imports every author and book from data.ts", async () => {
    const result = await importData();
    expect(result).toEqual({ authors: authors.length, books: books.length });
    expect(await Author.countDocuments()).toBe(authors.length);
    expect(await Book.countDocuments()).toBe(books.length);
  });

  it("links each book to the right author by full name", async () => {
    await importData();
    const sample = books[0]!;
    const book = await Book.findOne({ title: sample.title }).populate<{
      author: { firstName: string; lastName: string };
    }>("author");
    expect(`${book!.author.firstName} ${book!.author.lastName}`).toBe(sample.authorName);
  });

  it("is idempotent: running twice does not duplicate data", async () => {
    await importData();
    await importData();
    expect(await Author.countDocuments()).toBe(authors.length);
    expect(await Book.countDocuments()).toBe(books.length);
  });

  it("wipes existing books and authors first", async () => {
    await createBook();
    await importData();
    expect(await Book.findOne({ title: /^Book number/ })).toBeNull();
  });

  it("throws when a book references an unknown author", async () => {
    await expect(
      importData(
        [{ firstName: "Real", lastName: "Author", nationality: "Egypt" }],
        [{ title: "Orphan book", authorName: "Ghost Writer", description: "no author here", price: 1, cover: "soft cover" }],
      ),
    ).rejects.toThrow('Author "Ghost Writer" not found for book "Orphan book"');
  });
});

describe("deleteData", () => {
  it("removes all books and authors", async () => {
    await createBook();
    await createAuthor();
    await deleteData();
    expect(await Book.countDocuments()).toBe(0);
    expect(await Author.countDocuments()).toBe(0);
  });
});

describe("runSeeder (CLI wrapper)", () => {
  const stubProcess = () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    // Real DB connection is already open; make connectToDB a no-op connect.
    vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose);
    return vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("refuses to run against a database that is not SEED_DB_NAME", async () => {
    vi.stubEnv("SEED_DB_NAME", "some_other_db");
    const exit = stubProcess();
    await createBook();

    await runSeeder("-import");

    expect(exit).toHaveBeenCalledWith(1);
    expect(await Book.countDocuments()).toBe(1); // untouched
  });

  it("-import seeds when the DB name matches", async () => {
    vi.stubEnv("SEED_DB_NAME", mongoose.connection.name);
    const exit = stubProcess();

    await runSeeder("-import");

    expect(exit).toHaveBeenCalledWith(0);
    expect(await Book.countDocuments()).toBe(books.length);
  });

  it("-delete clears the collections when the DB name matches", async () => {
    vi.stubEnv("SEED_DB_NAME", mongoose.connection.name);
    await importData();
    const exit = stubProcess();

    await runSeeder("-delete");

    expect(exit).toHaveBeenCalledWith(0);
    expect(await Book.countDocuments()).toBe(0);
  });

  it("prints usage and exits 1 for an unknown flag", async () => {
    vi.stubEnv("SEED_DB_NAME", mongoose.connection.name);
    const exit = stubProcess();

    await runSeeder("--nope");

    expect(exit).toHaveBeenCalledWith(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Usage"));
  });
});
