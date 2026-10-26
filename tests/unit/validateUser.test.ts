import { describe, expect, it } from "vitest";
import {
  validateForgotPassword,
  validatePageQuery,
  validateResetPassword,
  validateUserLogin,
  validateUserRegister,
  validateUserUpdate,
} from "../../src/controllers/users/utils/validateUser.ts";

const valid = {
  email: "Omar@Example.com",
  username: "omar",
  password: "Str0ng!Pass",
};

describe("validateUserRegister", () => {
  it("accepts valid data, trims and lowercases the email", () => {
    const { error, value } = validateUserRegister({
      ...valid,
      email: "  Omar@Example.com ",
    });
    expect(error).toBeUndefined();
    expect(value.email).toBe("omar@example.com");
  });

  it("strips unknown fields (e.g. isAdmin) instead of failing", () => {
    const { error, value } = validateUserRegister({ ...valid, isAdmin: true });
    expect(error).toBeUndefined();
    expect(value).not.toHaveProperty("isAdmin");
  });

  it("reports every problem at once (abortEarly: false)", () => {
    const { error } = validateUserRegister({});
    expect(error?.details.map((d) => d.message)).toEqual(
      expect.arrayContaining([
        "Email is required",
        "Password is required",
        '"username" is required',
      ]),
    );
  });

  it("rejects an invalid email", () => {
    expect(
      validateUserRegister({ ...valid, email: "not-an-email" }).error?.message,
    ).toContain("Please enter a valid email address");
  });

  it.each([
    ["Sh0rt!", "Password must be at least 8 characters"],
    [
      "alllowercase1!",
      "Password must contain at least one uppercase character",
    ],
    [
      "ALLUPPERCASE1!",
      "Password must contain at least one lowercase character",
    ],
    ["NoNumbers!!", "Password must contain at least one number character"],
    ["NoSpecial123", "Password must contain at least one special character"],
    ["A1!" + "a".repeat(70), "Password must be at most 72 characters"],
  ])("rejects weak password %s", (password, message) => {
    expect(
      validateUserRegister({ ...valid, password }).error?.message,
    ).toContain(message);
  });

  it("rejects a 1-char username", () => {
    expect(
      validateUserRegister({ ...valid, username: "o" }).error,
    ).toBeDefined();
  });
});

describe("validateUserLogin", () => {
  it("accepts any non-empty password (no strength check on login)", () => {
    expect(
      validateUserLogin({ email: "a@b.co", password: "weak" }).error,
    ).toBeUndefined();
  });

  it("requires email and password", () => {
    const { error } = validateUserLogin({});
    expect(error?.details.map((d) => d.message)).toEqual(
      expect.arrayContaining(["Email is required", "Password is required"]),
    );
  });

  it("rejects empty password with a friendly message", () => {
    expect(
      validateUserLogin({ email: "a@b.co", password: "" }).error?.message,
    ).toBe("Password is required");
  });
});

describe("validateUserUpdate", () => {
  it("requires at least one field", () => {
    expect(validateUserUpdate({}).error).toBeDefined();
  });

  it("accepts a single field", () => {
    expect(validateUserUpdate({ username: "newname" }).error).toBeUndefined();
  });

  it("applies the strong-password rule", () => {
    expect(validateUserUpdate({ password: "weak" }).error).toBeDefined();
    expect(
      validateUserUpdate({ password: "Str0ng!Pass" }).error,
    ).toBeUndefined();
  });

  it("a body with only unknown fields is stripped to empty and fails min(1)", () => {
    expect(validateUserUpdate({ isAdmin: true }).error).toBeDefined();
  });
});

describe("validateForgotPassword / validateResetPassword", () => {
  it("forgot-password needs a valid email", () => {
    expect(validateForgotPassword({ email: "a@b.co" }).error).toBeUndefined();
    expect(validateForgotPassword({}).error).toBeDefined();
    expect(validateForgotPassword({ email: "nope" }).error).toBeDefined();
  });

  it("reset-password needs a strong password", () => {
    expect(
      validateResetPassword({ password: "Str0ng!Pass" }).error,
    ).toBeUndefined();
    expect(validateResetPassword({ password: "weak" }).error).toBeDefined();
    expect(validateResetPassword({}).error?.message).toBe(
      "Password is required",
    );
  });
});

describe("validatePageQuery (users)", () => {
  it("applies defaults and limits", () => {
    expect(validatePageQuery({}).value).toEqual({ pageNumber: 1, limit: 12 });
    expect(validatePageQuery({ limit: "50" }).error).toBeUndefined();
    expect(validatePageQuery({ limit: "51" }).error).toBeDefined();
  });
});
