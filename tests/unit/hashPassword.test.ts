import { describe, expect, it } from "vitest";
import {
  comparePassword,
  hashPassword,
} from "../../src/middleware/hashPassword.ts";

describe("hashPassword / comparePassword", () => {
  it("produces a bcrypt hash that differs from the plain password", async () => {
    const hash = await hashPassword("Str0ng!Pass");
    expect(hash).not.toBe("Str0ng!Pass");
    expect(hash).toMatch(/^\$2[aby]\$11\$/); // cost factor 11
  });

  it("uses a fresh salt every time", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same"),
      hashPassword("same"),
    ]);
    expect(a).not.toBe(b);
  });

  it("compares correctly", async () => {
    const hash = await hashPassword("Str0ng!Pass");
    expect(await comparePassword("Str0ng!Pass", hash)).toBe(true);
    expect(await comparePassword("wrong", hash)).toBe(false);
  });
});
