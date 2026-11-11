import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // "server-only" throws outside the React server runtime; it's a no-op in unit tests.
      "server-only": path.resolve(__dirname, "tests/unit/server-only-stub.ts"),
    },
  },
});
