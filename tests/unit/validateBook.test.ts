import { describe, expect, it } from "vitest";
import {
  validateBook,
  validateFilterBooksQuery,
  validateUpdateBook,
} from "../../src/controllers/books/utils/validateBook.ts";

const authorId = "507f1f77bcf86cd799439011";
const valid = {
  title: "The Alchemist",
  author: authorId,
  description: "A shepherd follows his dream",
  price: 11,
  cover: "hard cover",
};

describe("validateBook", () => {
  it("accepts a valid book", () => {
    expect(validateBook(valid).error).toBeUndefined();
  });

  it("accepts price 0", () => {
    expect(validateBook({ ...valid, price: 0 }).error).toBeUndefined();
  });

  it.each(["title", "author", "description", "price", "cover"])("requires %s", (field) => {
    const body: Record<string, unknown> = { ...valid };
    delete body[field];
    expect(validateBook(body).error?.message).toContain(`"${field}" is required`);
  });

  it("rejects short title and description", () => {
    expect(validateBook({ ...valid, title: "ab" }).error).toBeDefined();
    expect(validateBook({ ...valid, description: "abcd" }).error).toBeDefined();
  });

  it("rejects title longer than 250 chars", () => {
    expect(validateBook({ ...valid, title: "x".repeat(251) }).error).toBeDefined();
  });

  it("rejects negative price", () => {
    expect(validateBook({ ...valid, price: -1 }).error).toBeDefined();
  });

  it("rejects an invalid cover", () => {
    expect(validateBook({ ...valid, cover: "paperback" }).error).toBeDefined();
  });

  it.each(["not-hex", "507f1f77bcf86cd79943901", "zzzzzzzzzzzzzzzzzzzzzzzz"])(
    "rejects invalid author id %s",
    (author) => {
      expect(validateBook({ ...valid, author }).error).toBeDefined();
    },
  );
});

describe("validateUpdateBook", () => {
  it("accepts empty and partial bodies", () => {
    expect(validateUpdateBook({}).error).toBeUndefined();
    expect(validateUpdateBook({ price: 5 }).error).toBeUndefined();
  });

  it("enforces field rules", () => {
    expect(validateUpdateBook({ price: -5 }).error).toBeDefined();
    expect(validateUpdateBook({ cover: "nope" }).error).toBeDefined();
    expect(validateUpdateBook({ author: "123" }).error).toBeDefined();
  });
});

describe("validateFilterBooksQuery", () => {
  it("defaults page and limit, leaves prices undefined", () => {
    const { error, value } = validateFilterBooksQuery({});
    expect(error).toBeUndefined();
    expect(value).toEqual({ pageNumber: 1, limit: 12 });
  });

  it("parses price range", () => {
    const { value } = validateFilterBooksQuery({ minPrice: "8", maxPrice: "20" });
    expect(value).toMatchObject({ minPrice: 8, maxPrice: 20 });
  });

  it("allows minPrice == maxPrice", () => {
    expect(validateFilterBooksQuery({ minPrice: "10", maxPrice: "10" }).error).toBeUndefined();
  });

  it("rejects maxPrice lower than minPrice", () => {
    expect(validateFilterBooksQuery({ minPrice: "20", maxPrice: "10" }).error).toBeDefined();
  });

  it("rejects negative prices and bad paging", () => {
    expect(validateFilterBooksQuery({ minPrice: "-1" }).error).toBeDefined();
    expect(validateFilterBooksQuery({ maxPrice: "-1" }).error).toBeDefined();
    expect(validateFilterBooksQuery({ limit: "51" }).error).toBeDefined();
    expect(validateFilterBooksQuery({ pageNumber: "0" }).error).toBeDefined();
  });
});
