import { describe, expect, it } from "vitest";
import { getMissingEnvVars, REQUIRED_VARS } from "../../src/config/env.ts";

describe("getMissingEnvVars", () => {
  it("requires MONGO_URI, BASE_URL and JWT_SECRET", () => {
    expect([...REQUIRED_VARS]).toEqual(["MONGO_URI", "BASE_URL", "JWT_SECRET"]);
  });

  it("returns all names when nothing is set", () => {
    expect(getMissingEnvVars({})).toEqual([
      "MONGO_URI",
      "BASE_URL",
      "JWT_SECRET",
    ]);
  });

  it("returns only the missing ones (empty strings count as missing)", () => {
    expect(
      getMissingEnvVars({ MONGO_URI: "mongodb://x", BASE_URL: "" }),
    ).toEqual(["BASE_URL", "JWT_SECRET"]);
  });

  it("returns an empty list when everything is set", () => {
    expect(
      getMissingEnvVars({ MONGO_URI: "a", BASE_URL: "b", JWT_SECRET: "c" }),
    ).toEqual([]);
  });
});
