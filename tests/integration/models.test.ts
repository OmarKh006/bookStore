import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Author } from "../../src/models/Author.model.ts";
import { Book } from "../../src/models/Book.model.ts";
import { User } from "../../src/models/User.model.ts";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.ts";

beforeAll(connectTestDB);
afterAll(disconnectTestDB);
beforeEach(clearTestDB);

const oid = () => new mongoose.Types.ObjectId();

describe("Author model", () => {
  const valid = {
    firstName: "Paulo",
    lastName: "Coelho",
    nationality: "Brazil",
  };

  it("applies the default image and timestamps", async () => {
    const author = await Author.create(valid);
    expect(author.image).toBe("default.png");
    expect(author.createdAt).toBeInstanceOf(Date);
    expect(author.updatedAt).toBeInstanceOf(Date);
  });

  it("trims string fields", async () => {
    const author = await Author.create({ ...valid, firstName: "  Paulo  " });
    expect(author.firstName).toBe("Paulo");
  });

  it.each(["firstName", "lastName", "nationality"] as const)(
    "requires %s",
    async (field) => {
      const doc = new Author({ ...valid, [field]: undefined });
      await expect(doc.validate()).rejects.toThrow(/required/);
    },
  );

  it("enforces min/max lengths", async () => {
    await expect(
      new Author({ ...valid, firstName: "Al" }).validate(),
    ).rejects.toThrow();
    await expect(
      new Author({ ...valid, lastName: "x".repeat(16) }).validate(),
    ).rejects.toThrow();
    await expect(
      new Author({ ...valid, nationality: "x".repeat(26) }).validate(),
    ).rejects.toThrow();
  });
});

describe("Book model", () => {
  const valid = () => ({
    title: "The Alchemist",
    author: oid(),
    description: "A shepherd follows his dreams",
    price: 11,
    cover: "hard cover" as const,
  });

  it("saves a valid book with timestamps", async () => {
    const book = await Book.create(valid());
    expect(book.createdAt).toBeInstanceOf(Date);
  });

  it.each(["title", "author", "description", "price", "cover"] as const)(
    "requires %s",
    async (field) => {
      await expect(
        new Book({ ...valid(), [field]: undefined }).validate(),
      ).rejects.toThrow(/required/);
    },
  );

  it("only allows 'soft cover' | 'hard cover'", async () => {
    await expect(
      new Book({ ...valid(), cover: "paperback" }).validate(),
    ).rejects.toThrow();
    await expect(
      new Book({ ...valid(), cover: "soft cover" }).validate(),
    ).resolves.toBeUndefined();
  });

  it("rejects a negative price but allows 0", async () => {
    await expect(
      new Book({ ...valid(), price: -1 }).validate(),
    ).rejects.toThrow();
    await expect(
      new Book({ ...valid(), price: 0 }).validate(),
    ).resolves.toBeUndefined();
  });

  it("enforces title (3–250) and description (>=5) lengths", async () => {
    await expect(
      new Book({ ...valid(), title: "ab" }).validate(),
    ).rejects.toThrow();
    await expect(
      new Book({ ...valid(), title: "x".repeat(251) }).validate(),
    ).rejects.toThrow();
    await expect(
      new Book({ ...valid(), description: "abcd" }).validate(),
    ).rejects.toThrow();
  });

  it("indexes author and price", async () => {
    const indexes = await Book.collection.indexes();
    const keys = indexes.map((i) => Object.keys(i.key)[0]);
    expect(keys).toEqual(expect.arrayContaining(["author", "price"]));
  });

  it("populates the referenced author", async () => {
    const author = await Author.create({
      firstName: "Leo",
      lastName: "Tolstoy",
      nationality: "Russian",
    });
    const book = await Book.create({ ...valid(), author: author._id });
    const found = await Book.findById(book._id).populate<{
      author: { firstName: string };
    }>("author");
    expect(found!.author.firstName).toBe("Leo");
  });
});

describe("User model", () => {
  const valid = {
    email: "omar@example.com",
    username: "omar",
    password: "hashed",
  };

  it("defaults isAdmin to false and lowercases + trims email", async () => {
    const user = await User.create({ ...valid, email: "  OMAR@Example.com " });
    expect(user.isAdmin).toBe(false);
    expect(user.email).toBe("omar@example.com");
  });

  it("does not select the password unless asked", async () => {
    await User.create(valid);
    expect(
      (await User.findOne({ email: valid.email }))!.password,
    ).toBeUndefined();
    expect(
      (await User.findOne({ email: valid.email }).select("+password"))!
        .password,
    ).toBe("hashed");
  });

  it("has a unique index on email (duplicate -> code 11000)", async () => {
    await User.create(valid);
    await expect(
      User.create({ ...valid, username: "other" }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("requires email, username and password with friendly messages", async () => {
    const err = await new User({}).validate().catch((e) => e);
    expect(err.errors.email.message).toBe("Email is required");
    expect(err.errors.username.message).toBe("Username is required");
    expect(err.errors.password.message).toBe("Password is required");
  });

  it("enforces email (5–254) and username (2–200) lengths", async () => {
    await expect(
      new User({ ...valid, email: "a@b" }).validate(),
    ).rejects.toThrow();
    await expect(
      new User({ ...valid, username: "o" }).validate(),
    ).rejects.toThrow();
  });

  describe("generateToken()", () => {
    it("signs { id, isAdmin } with JWT_SECRET and a 1-day expiry", async () => {
      const user = await User.create({ ...valid, isAdmin: true });
      const decoded = jwt.verify(
        user.generateToken(),
        process.env.JWT_SECRET!,
      ) as jwt.JwtPayload;

      expect(decoded.id).toBe(user._id.toString());
      expect(decoded.isAdmin).toBe(true);
      expect(decoded.exp! - decoded.iat!).toBe(24 * 60 * 60);
    });

    it("cannot be verified with a different secret", async () => {
      const user = await User.create(valid);
      expect(() => jwt.verify(user.generateToken(), "wrong-secret")).toThrow();
    });
  });
});
