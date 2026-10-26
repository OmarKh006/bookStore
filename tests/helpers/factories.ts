import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { createApp } from "../../src/app.ts";
import { Author } from "../../src/models/Author.model.ts";
import { Book } from "../../src/models/Book.model.ts";
import { User } from "../../src/models/User.model.ts";

export const STRONG_PASSWORD = "Str0ng!Pass";

let counter = 0;
const next = () => ++counter;

/** App with a high rate-limit so unrelated tests never trip it. */
export const buildApp = () => createApp({ rateLimitMax: 10_000 });

export const createUser = async (
  overrides: Partial<{
    email: string;
    username: string;
    password: string;
    isAdmin: boolean;
  }> = {},
) => {
  const n = next();
  const password = overrides.password ?? STRONG_PASSWORD;
  const user = await User.create({
    email: overrides.email ?? `user${n}@example.com`,
    username: overrides.username ?? `user${n}`,
    // low cost factor keeps the suite fast; bcrypt.compare works with any cost
    password: bcrypt.hashSync(password, 4),
    isAdmin: overrides.isAdmin ?? false,
  });
  return { user, password, token: user.generateToken() };
};

export const createAdmin = (overrides: Parameters<typeof createUser>[0] = {}) =>
  createUser({ ...overrides, isAdmin: true });

export const createAuthor = (
  overrides: Partial<{
    firstName: string;
    lastName: string;
    nationality: string;
    image: string;
  }> = {},
) => {
  const n = next();
  return Author.create({
    firstName: `First${n}`,
    lastName: `Last${n}`,
    nationality: "Egyptian",
    ...overrides,
  });
};

export const createBook = async (
  overrides: Partial<{
    title: string;
    author: mongoose.Types.ObjectId | string;
    description: string;
    price: number;
    cover: "soft cover" | "hard cover";
  }> = {},
) => {
  const author = overrides.author ?? (await createAuthor())._id;
  const n = next();
  return Book.create({
    title: `Book number ${n}`,
    description: "A perfectly fine description",
    price: 10,
    cover: "soft cover",
    ...overrides,
    author,
  });
};

/** Force a createdAt value (timestamps can collide within the same millisecond). */
export const setCreatedAt = async (
  model: mongoose.Model<any>,
  id: unknown,
  date: Date,
) => {
  await model.collection.updateOne(
    { _id: id as never },
    { $set: { createdAt: date } },
  );
};

export const fakeObjectId = () => new mongoose.Types.ObjectId().toString();
