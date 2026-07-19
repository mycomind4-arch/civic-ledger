import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "test/**/*.test.ts",
      "apps/**/test/**/*.test.ts",
      "packages/**/test/**/*.test.ts",
      "services/**/test/**/*.test.ts",
      "tests/**/*.test.ts"
    ],
    environment: "node"
  }
});
