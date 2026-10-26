import { describe, expect, it } from "vitest";
import {
  validateAuthor,
  validatePageQuery,
  validateUpdateAuthor,
} from "../../src/controllers/authors/utils/validateAuthor.ts";

const valid = { firstName: "Paulo", lastName: "Coelho", nationality: "Brazil" };

describe("validateAuthor", () => {
  it("accepts a valid author and trims strings", () => {
    const { error, value } = validateAuthor({
      ...valid,
      firstName: "  Paulo  ",
    });
    expect(error).toBeUndefined();
    expect(value.firstName).toBe("Paulo");
  });

  it("accepts an optional image", () => {
    expect(
      validateAuthor({ ...valid, image: "paulo.png" }).error,
    ).toBeUndefined();
  });

  it.each(["firstName", "lastName", "nationality"])("requires %s", (field) => {
    const body: Record<string, string> = { ...valid };
    delete body[field];
    expect(validateAuthor(body).error?.message).toContain(
      `"${field}" is required`,
    );
  });

  it("rejects names shorter than 3 / longer than 15 chars", () => {
    expect(validateAuthor({ ...valid, firstName: "Al" }).error).toBeDefined();
    expect(
      validateAuthor({ ...valid, lastName: "x".repeat(16) }).error,
    ).toBeDefined();
  });

  it("rejects nationality longer than 25 chars", () => {
    expect(
      validateAuthor({ ...valid, nationality: "x".repeat(26) }).error,
    ).toBeDefined();
  });

  it("rejects too-short / too-long image names", () => {
    expect(validateAuthor({ ...valid, image: "a.p" }).error).toBeDefined();
    expect(
      validateAuthor({ ...valid, image: "x".repeat(101) }).error,
    ).toBeDefined();
  });

  it("rejects unknown keys", () => {
    expect(
      validateAuthor({ ...valid, role: "admin" }).error?.message,
    ).toContain('"role" is not allowed');
  });
});

describe("validateUpdateAuthor", () => {
  it("accepts an empty object and partial updates", () => {
    expect(validateUpdateAuthor({}).error).toBeUndefined();
    expect(validateUpdateAuthor({ firstName: "Paulo" }).error).toBeUndefined();
  });

  it("still enforces the field rules", () => {
    expect(validateUpdateAuthor({ firstName: "Al" }).error).toBeDefined();
    expect(
      validateUpdateAuthor({ nationality: "x".repeat(26) }).error,
    ).toBeDefined();
  });
});

describe("validatePageQuery (authors)", () => {
  it("applies defaults pageNumber=1, limit=12", () => {
    expect(validatePageQuery({}).value).toEqual({ pageNumber: 1, limit: 12 });
  });

  it("converts numeric strings", () => {
    expect(validatePageQuery({ pageNumber: "2", limit: "5" }).value).toEqual({
      pageNumber: 2,
      limit: 5,
    });
  });

  it.each([
    [{ pageNumber: "0" }],
    [{ pageNumber: "1.5" }],
    [{ limit: "0" }],
    [{ limit: "51" }],
    [{ limit: "abc" }],
  ])("rejects %j", (query) => {
    expect(validatePageQuery(query).error).toBeDefined();
  });
});
