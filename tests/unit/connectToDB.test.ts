import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import connectToDB from "../../src/config/connectToDB.ts";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("connectToDB", () => {
  it("connects with MONGO_URI", async () => {
    vi.stubEnv("MONGO_URI", "mongodb://example/db");
    const connect = vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose);
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    await connectToDB();

    expect(connect).toHaveBeenCalledWith("mongodb://example/db");
    expect(exit).not.toHaveBeenCalled();
  });

  it("exits with code 1 when the connection fails", async () => {
    vi.spyOn(mongoose, "connect").mockRejectedValue(new Error("ECONNREFUSED"));
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    await connectToDB();

    expect(exit).toHaveBeenCalledWith(1);
  });
});
