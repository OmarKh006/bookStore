import { describe, expect, it } from "vitest";
import { authors, books } from "../../src/data.ts";

describe("seed data integrity", () => {
  it("has authors and books", () => {
    expect(authors.length).toBeGreaterThan(0);
    expect(books.length).toBeGreaterThan(0);
  });

  it("every book references an existing author by 'First Last'", () => {
    const names = new Set(authors.map((a) => `${a.firstName} ${a.lastName}`));
    for (const book of books) {
      expect(
        names.has(book.authorName),
        `${book.title} -> ${book.authorName}`,
      ).toBe(true);
    }
  });

  it("author names are unique (the seeder maps by full name)", () => {
    const names = authors.map((a) => `${a.firstName} ${a.lastName}`);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every book uses a valid cover and non-negative price", () => {
    for (const book of books) {
      expect(["soft cover", "hard cover"]).toContain(book.cover);
      expect(book.price).toBeGreaterThanOrEqual(0);
    }
  });
});
