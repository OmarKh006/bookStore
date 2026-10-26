import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/helpers/setupEnv.ts"],
    // Spinning up mongodb-memory-server can be slow the first time (binary download)
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // One in-memory Mongo per test file, files run in parallel workers
    pool: "forks",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/types/**"],
      reporter: ["text", "html"],
    },
  },
});
