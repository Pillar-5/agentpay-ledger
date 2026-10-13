import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: [
      "packages/*/tests/**/*.test.ts",
      "apps/api/tests/**/*.test.ts",
      "tests/**/*.test.ts"
    ],
    alias: {
      "@agentpay/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@agentpay/moove": new URL("./packages/moove/src/index.ts", import.meta.url).pathname,
      "@agentpay/sdk": new URL("./packages/sdk/src/index.ts", import.meta.url).pathname
    },
    coverage: {
      enabled: false
    },
    testTimeout: 15000,
    hookTimeout: 15000
  }
});
