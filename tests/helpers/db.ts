import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
// Import models so they are registered (and their indexes built) before tests run
import "../../src/models/Author.model.ts";
import "../../src/models/Book.model.ts";
import "../../src/models/User.model.ts";

let mongod: MongoMemoryServer | undefined;

export const connectTestDB = async (): Promise<void> => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: "bookstore_test" });
  // Make sure unique indexes (User.email) exist before the first test
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
};

export const clearTestDB = async (): Promise<void> => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
};

export const disconnectTestDB = async (): Promise<void> => {
  await mongoose.disconnect();
  await mongod?.stop();
  mongod = undefined;
};
